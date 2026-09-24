/* Inference Kitchen — the scheduler sandbox.
   A deterministic, iteration-level simulation of one serving replica.
   It is a TEACHING MODEL: the costs are round numbers chosen so the effects
   are visible (prefill ≈ 25k tokens/s, a decode step ≈ 12 ms + a little per
   sequence). The directions it shows are the real ones; the exact milliseconds
   are not a benchmark. */
(function () {
  "use strict";

  function rng(seed) {             // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var DEFAULTS = {
    seed: 7, seconds: 60, rate: 6,                 // requests / second
    promptMedian: 800, outMin: 100, outMax: 300,
    giant: false, giantProb: 0.02, giantTokens: 60000,
    shared: false, sharedTokens: 3000,             // system prompt every request carries
    mode: "continuous",                            // "static" | "continuous"
    paged: true, chunked: false, chunkBudget: 1024,
    prefixCache: false, disagg: false,
    kvCapTokens: 420000,                           // ≈ H200 serving a 70B FP8 model
    maxCtx: 65536,                                 // what a non-paged engine pre-reserves
    staticBatch: 16, maxBatch: 256,
    decodeBaseMs: 12, decodePerSeqMs: 0.12, prefillMsPerTok: 0.04,
    transferMsPerTok: 0.0005,
    sloTtftMs: 2000, sloItlMs: 100
  };

  function makeRequests(p) {
    var r = rng(p.seed), reqs = [], t = 0, id = 0;
    while (true) {
      t += -Math.log(1 - r()) / p.rate * 1000;
      if (t > p.seconds * 1000) break;
      var z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
      var own = Math.max(50, Math.round(p.promptMedian * Math.exp(0.6 * z)));
      var giantDraw = r();
      if (p.giant && giantDraw < p.giantProb) own = p.giantTokens;
      var out = p.outMin + Math.floor(r() * (p.outMax - p.outMin + 1));
      reqs.push({ id: id++, arrival: t, own: own, prompt: own + (p.shared ? p.sharedTokens : 0),
        out: out, giant: own >= p.giantTokens, gen: 0, tokenTimes: [] });
    }
    return reqs;
  }

  function reserveFor(req, p) {
    if (!p.paged) return Math.max(p.maxCtx, req.prompt + req.out);
    return req.prompt + req.gen + 16;   // pages track what is actually used
  }

  function prefillCost(req, p, state) {
    var toks = req.prompt;
    if (p.shared && p.prefixCache && state.prefixWarm) toks -= p.sharedTokens;
    return toks;
  }

  function run(opts) {
    var p = Object.assign({}, DEFAULTS, opts || {});
    var reqs = makeRequests(p);
    var waiting = [], decoding = [], prefilling = [], done = [];
    var clock = 0, next = 0, iterLog = [], maxConc = 0;
    var state = { prefixWarm: false };
    var horizon = p.seconds * 1000 + 60000;
    // disaggregated prefill pool
    var pfQueue = [], pfBusyUntil = 0, pfCurrent = null, readyToDecode = [];

    function kvUsed() {
      var s = 0, i;
      for (i = 0; i < decoding.length; i++) s += reserveFor(decoding[i], p);
      for (i = 0; i < prefilling.length; i++) s += reserveFor(prefilling[i], p);
      return s;
    }
    function arrive(upTo) {
      while (next < reqs.length && reqs[next].arrival <= upTo) {
        var q = reqs[next++];
        (p.disagg ? pfQueue : waiting).push(q);
      }
    }
    function emit(req, at) {
      req.tokenTimes.push(at);
      req.gen++;
      if (req.gen >= req.out) { req.finish = at; done.push(req); return true; }
      return false;
    }

    var guard = 0;
    while (clock < horizon && guard++ < 400000) {
      arrive(clock);

      /* ---- disaggregated prefill pool runs on its own hardware ---- */
      if (p.disagg) {
        while (true) {
          if (pfCurrent && pfBusyUntil <= clock) {
            pfCurrent.readyAt = pfBusyUntil + pfCurrent.prompt * p.transferMsPerTok + 5;
            readyToDecode.push(pfCurrent); pfCurrent = null;
          }
          if (!pfCurrent && pfQueue.length && pfQueue[0].arrival <= Math.max(clock, pfBusyUntil)) {
            pfCurrent = pfQueue.shift();
            var start = Math.max(pfBusyUntil, pfCurrent.arrival);
            pfCurrent.admit = start;
            pfBusyUntil = start + prefillCost(pfCurrent, p, state) * p.prefillMsPerTok;
            if (p.shared) state.prefixWarm = true;
            if (pfBusyUntil <= clock) continue;
          }
          break;
        }
        for (var ri = 0; ri < readyToDecode.length; ) {       // oldest first
          var rq = readyToDecode[ri];
          if (rq.readyAt <= clock && kvUsed() + reserveFor(rq, p) <= p.kvCapTokens && decoding.length < p.maxBatch) {
            readyToDecode.splice(ri, 1);
            decoding.push(rq);
            emit(rq, Math.max(clock, rq.readyAt));           // first token produced by prefill
          } else ri++;
        }
        if (!decoding.length) {
          var nxt = Math.min(next < reqs.length ? reqs[next].arrival : Infinity,
            pfCurrent ? pfBusyUntil : Infinity,
            readyToDecode.length ? Math.min.apply(null, readyToDecode.map(function (x) { return x.readyAt; })) : Infinity);
          if (nxt === Infinity) break;
          clock = Math.max(clock + 0.01, nxt); continue;
        }
        var dt = p.decodeBaseMs + p.decodePerSeqMs * decoding.length;
        clock += dt;
        iterLog.push({ t: clock, dur: dt, batch: decoding.length, prefill: 0 });
        maxConc = Math.max(maxConc, decoding.length);
        decoding = decoding.filter(function (q) { return !emit(q, clock); });
        continue;
      }

      /* ---- static batching: fill a batch, finish it, then take the next ---- */
      if (p.mode === "static") {
        if (!decoding.length) {
          if (!waiting.length) {
            if (next >= reqs.length) break;
            clock = Math.max(clock, reqs[next].arrival); continue;
          }
          var batch = [], used = 0;
          while (waiting.length && batch.length < p.staticBatch &&
                 used + reserveFor(waiting[0], p) <= p.kvCapTokens) {
            var w = waiting.shift(); used += reserveFor(w, p); batch.push(w);
          }
          if (!batch.length) { batch.push(waiting.shift()); }
          var ptoks = 0;
          batch.forEach(function (b) { b.admit = clock; ptoks += prefillCost(b, p, state); if (p.shared) state.prefixWarm = true; });
          clock += ptoks * p.prefillMsPerTok;
          iterLog.push({ t: clock, dur: ptoks * p.prefillMsPerTok, batch: batch.length, prefill: ptoks });
          batch.forEach(function (b) { emit(b, clock); });
          decoding = batch.filter(function (b) { return b.gen < b.out; });
          maxConc = Math.max(maxConc, batch.length);
          continue;
        }
        var dts = p.decodeBaseMs + p.decodePerSeqMs * decoding.length;
        clock += dts;
        iterLog.push({ t: clock, dur: dts, batch: decoding.length, prefill: 0 });
        decoding = decoding.filter(function (q) { return !emit(q, clock); });
        continue;
      }

      /* ---- continuous batching: admit into every iteration ---- */
      while (waiting.length && decoding.length + prefilling.length < p.maxBatch &&
             kvUsed() + reserveFor(waiting[0], p) <= p.kvCapTokens) {
        var a = waiting.shift();
        a.admit = clock; a.left = prefillCost(a, p, state);
        if (p.shared) state.prefixWarm = true;
        prefilling.push(a);
      }
      if (!decoding.length && !prefilling.length) {
        if (next >= reqs.length && !waiting.length) break;
        clock = next < reqs.length ? Math.max(clock + 0.01, reqs[next].arrival) : clock + 1;
        continue;
      }
      var budget = p.chunked ? p.chunkBudget : Infinity, spent = 0, finishedPf = [];
      for (var k = 0; k < prefilling.length && spent < budget; k++) {
        var pr = prefilling[k], take = Math.min(pr.left, budget - spent);
        pr.left -= take; spent += take;
        if (pr.left <= 0) finishedPf.push(pr);
      }
      var dtc = (decoding.length ? p.decodeBaseMs + p.decodePerSeqMs * decoding.length : 0) +
                spent * p.prefillMsPerTok;
      if (!decoding.length && spent) dtc += p.decodeBaseMs;
      clock += dtc;
      iterLog.push({ t: clock, dur: dtc, batch: decoding.length, prefill: spent });
      maxConc = Math.max(maxConc, decoding.length + prefilling.length);
      decoding = decoding.filter(function (q) { return !emit(q, clock); });
      finishedPf.forEach(function (f) {
        prefilling.splice(prefilling.indexOf(f), 1);
        if (!emit(f, clock)) decoding.push(f);
      });
    }

    return summarize(p, reqs, done, iterLog, maxConc);
  }

  function pct(a, q) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
  }

  function summarize(p, reqs, done, iterLog, maxConc) {
    var ttft = [], itl = [], good = 0, goodTok = 0, tok = 0, lastFinish = 0;
    done.forEach(function (r) {
      var first = r.tokenTimes[0];
      r.ttft = first - r.arrival;
      ttft.push(r.ttft);
      var gaps = [];
      for (var i = 1; i < r.tokenTimes.length; i++) gaps.push(r.tokenTimes[i] - r.tokenTimes[i - 1]);
      itl.push.apply(itl, gaps);
      r.itlP99 = pct(gaps, 0.99);
      r.meetsSlo = r.ttft <= p.sloTtftMs && r.itlP99 <= p.sloItlMs;
      tok += r.out;
      if (r.meetsSlo) { good++; goodTok += r.out; }
      lastFinish = Math.max(lastFinish, r.finish);
    });
    var span = Math.max(1, lastFinish) / 1000;
    return {
      params: p, requests: reqs, done: done, iterLog: iterLog,
      completed: done.length, submitted: reqs.length,
      ttftP50: pct(ttft, 0.5), ttftP99: pct(ttft, 0.99),
      itlP50: pct(itl, 0.5), itlP99: pct(itl, 0.99),
      throughput: tok / span, goodput: goodTok / span,
      sloRate: reqs.length ? good / reqs.length : 0,        // unfinished requests count as misses
      maxConcurrent: maxConc
    };
  }

  window.IKSim = { run: run, DEFAULTS: DEFAULTS, pct: pct };
})();
