/* Inference Kitchen — the math.
   Pure functions only; every number on the page comes from here, and the
   acceptance tests call these directly. Units: GB = 1e9 bytes, TB/s = 1e12 B/s,
   TFLOPS = 1e12 FLOP/s. */
(function () {
  "use strict";

  var GB = 1e9;

  /* NVLink bandwidth per GPU (GB/s, one direction) — from each part's
     interconnect line in the Hyperscale Ledger (900 GB/s total on H100 ≈ 450/dir). */
  var NVLINK_GBs = { "a100-80gb-sxm": 300, "h100-sxm": 450, "h200-sxm": 450, "b200-sxm": 900 };
  var IB_GBs = 50; // one 400 Gb/s InfiniBand NIC ≈ 50 GB/s (Kiely ch.5)

  /* Model shapes. KV bytes/token/layer = 2 (K,V) × kvHeads × headDim, or for
     DeepSeek's MLA a compressed latent of 576 values (512 + 64 rope) per layer. */
  var MODELS = [
    { id: "8b", name: "8B dense (Llama-3-8B shape)", paramsB: 8, activeB: 8, layers: 32,
      kvHeads: 8, headDim: 128, attnDim: 4096, moe: null },
    { id: "70b", name: "70B dense (Llama-3-70B shape)", paramsB: 70, activeB: 70, layers: 80,
      kvHeads: 8, headDim: 128, attnDim: 8192, moe: null },
    { id: "qwen235", name: "235B MoE, 22B active (Qwen3-235B shape)", paramsB: 235, activeB: 22, layers: 94,
      kvHeads: 4, headDim: 128, attnDim: 8192,
      moe: { experts: 128, topK: 8, routedB: 227.2, denseB: 7.8 } },
    { id: "dsv3", name: "671B MoE, 37B active (DeepSeek-V3 shape)", paramsB: 671, activeB: 37, layers: 61,
      mlaLatent: 576, attnDim: 16384,
      moe: { experts: 256, topK: 8, routedB: 654.5, denseB: 16.5 } }
  ];

  var PREC = { bf16: 2, fp8: 1, fp4: 0.5 };

  function gpu(id) { return window.IK_GPUS.filter(function (g) { return g.id === id; })[0]; }
  function model(id) { return MODELS.filter(function (m) { return m.id === id; })[0]; }

  /* ---------- 1. Memory: the counter ---------- */
  function weightsGB(m, wPrec) { return m.paramsB * PREC[wPrec]; }

  function kvBytesPerToken(m, kvPrec) {
    var perLayer = m.mlaLatent ? m.mlaLatent : 2 * m.kvHeads * m.headDim;
    return perLayer * m.layers * PREC[kvPrec];
  }

  /* opts: {gpu, n, model, wPrec, kvPrec, ctx, reserve (0..1)} */
  function memory(o) {
    var g = gpu(o.gpu), m = model(o.model);
    var capGB = g.hbmGB * o.n;
    var usableGB = capGB * (1 - (o.reserve || 0));
    var wGB = weightsGB(m, o.wPrec);
    var kvTok = kvBytesPerToken(m, o.kvPrec);
    var perUserGB = kvTok * o.ctx / GB;
    var freeGB = usableGB - wGB;
    var users = freeGB > 0 ? Math.floor(freeGB / perUserGB + 1e-9) : 0;
    return {
      capGB: capGB, usableGB: usableGB, weightsGB: wGB, kvBytesPerToken: kvTok,
      perUserGB: perUserGB, freeGB: freeGB, users: users, oom: freeGB <= 0,
      headroomOK: freeGB >= 0.5 * wGB   // Kiely ch.3: ≥50% headroom over weights for KV
    };
  }

  /* ---------- 2. MoE: experts touched per step ---------- */
  function expertsTouchedFrac(E, k, tokens) { return 1 - Math.pow(1 - k / E, tokens); }

  /* Bytes of weights read in one decode step with `batch` tokens in flight. */
  function weightsReadGB(m, wPrec, batch) {
    if (!m.moe) return m.paramsB * PREC[wPrec];
    var f = expertsTouchedFrac(m.moe.experts, m.moe.topK, batch);
    return (m.moe.denseB + m.moe.routedB * f) * PREC[wPrec];
  }

  /* ---------- 3. Decode speed: the batch dial ----------
     step time = max(bytes ÷ usable bandwidth, FLOPs ÷ usable compute).
     o: {gpu, n, model, wPrec, kvPrec, batch, ctx, mbu, mfu} */
  function peakTF(g, wPrec) {
    if (wPrec === "fp4" && g.fp4TF) return g.fp4TF;
    if ((wPrec === "fp8" || wPrec === "fp4") && g.fp8TF) return g.fp8TF;
    return g.bf16TF;
  }

  function decode(o) {
    var g = gpu(o.gpu), m = model(o.model);
    var mbu = o.mbu == null ? 0.7 : o.mbu, mfu = o.mfu == null ? 0.7 : o.mfu;
    var wBytes = weightsReadGB(m, o.wPrec, o.batch) * GB;
    var kvBytes = o.batch * o.ctx * kvBytesPerToken(m, o.kvPrec);
    var bytes = wBytes + kvBytes;
    var flopsPerTok = 2 * m.activeB * 1e9 + 4 * m.layers * o.ctx * m.attnDim;
    var flops = flopsPerTok * o.batch;
    var bw = o.n * g.bwTBs * 1e12 * mbu;
    var comp = o.n * peakTF(g, o.wPrec) * 1e12 * mfu;
    var tMem = bytes / bw, tComp = flops / comp;
    var step = Math.max(tMem, tComp);
    return {
      stepMs: step * 1e3, tMemMs: tMem * 1e3, tCompMs: tComp * 1e3,
      bound: tMem >= tComp ? "memory" : "compute",
      perUserTps: 1 / step, totalTps: o.batch / step,
      weightsReadGB: wBytes / GB, kvReadGB: kvBytes / GB
    };
  }

  /* Batch where decode flips to compute-bound, weights only (no KV traffic):
     2·active·B / (peak·mfu) = W / (bw·mbu). For dense W = active × bytes/param. */
  function crossoverBatch(o) {
    var g = gpu(o.gpu), m = model(o.model);
    var mbu = o.mbu == null ? 0.7 : o.mbu, mfu = o.mfu == null ? 0.7 : o.mfu;
    var W = m.paramsB * 1e9 * PREC[o.wPrec];
    return W * peakTF(g, o.wPrec) * 1e12 * mfu / (2 * m.activeB * 1e9 * g.bwTBs * 1e12 * mbu);
  }

  /* ---------- Speculative decoding (Leviathan et al. 2023) ---------- */
  function specDecode(alpha, k, draftCost) {
    var expected = alpha >= 1 ? k + 1 : (1 - Math.pow(alpha, k + 1)) / (1 - alpha);
    return { tokensPerPass: expected, speedup: expected / (1 + k * draftCost) };
  }

  /* ---------- 5. Money ---------- */
  function selfHostCostPerM(gpuHr, nGpu, tps, util) {
    return (gpuHr * nGpu) / (tps * 3600 * util) * 1e6;
  }
  function breakevenUtil(gpuHr, nGpu, tps, apiPerM) {
    return selfHostCostPerM(gpuHr, nGpu, tps, 1) / apiPerM;
  }

  /* Traffic shapes: 24 hourly demand levels (fraction of that shape's peak). */
  var SHAPES = {
    flat: [.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9,.9],
    business: [.05,.04,.04,.04,.05,.08,.2,.45,.8,.95,1,.97,.9,.95,1,.96,.85,.6,.35,.2,.12,.09,.07,.06],
    spiky: [.1,.1,.1,.1,.1,.1,.15,.2,.25,1,.3,.25,.2,.9,.25,.2,.2,.3,1,.3,.2,.15,.1,.1]
  };
  function shapeUtil(name) {
    var s = SHAPES[name], sum = 0, pk = 0;
    for (var i = 0; i < 24; i++) { sum += s[i]; pk = Math.max(pk, s[i]); }
    return Math.min(0.9, (sum / 24) / pk); // nobody runs a fleet at 100% — headroom for bursts
  }
  /* Pool `n` customers of the same shape spread across time zones (offsets
     0..23 in a fixed stride). Provision for the pooled peak. */
  function pooledUtil(name, n) {
    var s = SHAPES[name], tot = new Array(24), i, j, sum = 0, pk = 0;
    for (i = 0; i < 24; i++) tot[i] = 0;
    for (j = 0; j < n; j++) {
      var off = (j * 7) % 24;
      for (i = 0; i < 24; i++) tot[i] += s[(i + off) % 24];
    }
    for (i = 0; i < 24; i++) { sum += tot[i]; pk = Math.max(pk, tot[i]); }
    return Math.min(0.9, (sum / 24) / pk);
  }

  /* Tryon (Class 10, "Own the Weights"): fixed people cost, owned marginal
     cost per million labels, API tier price per million labels. */
  var TRYON = { frontier: 890, standard: 356, budget: 35.6, owned: 19.23, halfEng: 90000, fullEng: 180000 };
  function tryonBreakevenPerDay(tierPerM, peopleYr) {
    var saving = (tierPerM - TRYON.owned) / 1e6;
    return saving > 0 ? peopleYr / 365 / saving : Infinity;
  }
  function tryonAnnual(perDay, tierPerM, peopleYr) {
    return {
      api: perDay * 365 * tierPerM / 1e6,
      owned: perDay * 365 * TRYON.owned / 1e6 + peopleYr
    };
  }

  /* ---------- Production ---------- */
  function hoursBetweenFailures(nGpu) { return 50000 / nGpu; }

  window.IK = {
    GB: GB, MODELS: MODELS, PREC: PREC, NVLINK_GBs: NVLINK_GBs, IB_GBs: IB_GBs,
    SHAPES: SHAPES, TRYON: TRYON,
    gpu: gpu, model: model, weightsGB: weightsGB, kvBytesPerToken: kvBytesPerToken,
    memory: memory, expertsTouchedFrac: expertsTouchedFrac, weightsReadGB: weightsReadGB,
    peakTF: peakTF, decode: decode, crossoverBatch: crossoverBatch, specDecode: specDecode,
    selfHostCostPerM: selfHostCostPerM, breakevenUtil: breakevenUtil,
    shapeUtil: shapeUtil, pooledUtil: pooledUtil,
    tryonBreakevenPerDay: tryonBreakevenPerDay, tryonAnnual: tryonAnnual,
    hoursBetweenFailures: hoursBetweenFailures
  };
})();
