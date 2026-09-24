/* Inference Kitchen — UI. Every number shown is computed by window.IK (core.js)
   or window.IKSim (sim.js); this file only wires controls to them and draws. */
(function () {
  "use strict";
  var IK = window.IK, SIM = window.IKSim, GL = window.IK_GLOSSARY;
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function fgb(n) { return n >= 1000 ? fmt(n / 1000, 2) + " TB" : fmt(n, n < 10 ? 2 : n < 100 ? 1 : 0) + " GB"; }
  function ftps(n) { return n >= 10000 ? fmt(n / 1000, 1) + "K" : fmt(n, n < 10 ? 1 : 0); }
  function fms(n) { return n >= 1000 ? fmt(n / 1000, 2) + " s" : fmt(n, n < 10 ? 1 : 0) + " ms"; }
  function fusd(n, d) { return "$" + fmt(n, d == null ? 2 : d); }
  function fbig(n) { return n >= 1e6 ? fmt(n / 1e6, 2) + "M" : n >= 1e3 ? fmt(n / 1e3, 0) + "K" : fmt(n); }
  function fk(tokens) { return tokens >= 1024 ? (tokens / 1024) + "K" : String(tokens); }
  function fdur(h) {
    if (h < 1) return fmt(h * 60, 0) + " min";
    if (h < 48) return fmt(h, 1) + " h";
    if (h < 24 * 60) return fmt(h / 24, 0) + " days";
    return fmt(h / 24 / 365, 1) + " yrs";
  }

  /* ---------------- persistence (never required) ---------------- */
  var KEY = "inference-kitchen-v1";
  var store = { predicts: {}, touched: {}, said: {}, briefs: {}, ft: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) store = Object.assign(store, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------------- nav ---------------- */
  var ICONS = {
    kitchen: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M2 10l10-7 10 7" fill="#C8452F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="10" y="14" width="4" height="7" fill="#B8793F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="15" y="4" width="3" height="4" fill="#C8452F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    counter: '<svg viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="4" fill="#B8793F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="4" y="15" width="16" height="6" fill="#B9BDC2" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="5" y="5" width="4" height="6" fill="#5FA03C" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="10" y="7" width="4" height="4" fill="#9CCBEA" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    books: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="5" height="15" fill="#C8452F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="8" y="3" width="5" height="17" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="13" y="6" width="5" height="14" fill="#5FA03C" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" transform="rotate(8 15 13)"/><path d="M2 21h20" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M6 3h12v16l-2-2-2 2-2-2-2 2-2-2-2 2z" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 8h6M9 11h6M9 14h4" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    chef: '<svg viewBox="0 0 24 24"><path d="M7 13c-4 0-5-6-1-7 0-4 6-5 7-2 2-3 7-2 7 2 4 1 3 7-1 7z" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="7" y="13" width="10" height="7" rx="1" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    plates: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="15" rx="10" ry="5" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="12" cy="14" rx="5" ry="2.5" fill="#9CCBEA" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 5v6M5 5v6M4 11v8M20 5c-2 0-2 6 0 6v8" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" fill="none"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M5 16a7 7 0 0 1 14 0z" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="3" y="16" width="18" height="3" rx="1" fill="#B8793F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="12" cy="8" r="1.6" fill="#4A2E1E"/></svg>',
    dial: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M12 13l4-5" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M6 13h1M12 7v1M17 13h1" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="12" cy="13" r="1.4" fill="#C8452F"/></svg>',
    buildings: '<svg viewBox="0 0 24 24"><rect x="2" y="8" width="9" height="13" fill="#C8452F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="13" y="5" width="9" height="16" fill="#9CCBEA" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M5 12h3M5 16h3M16 9h3M16 13h3M16 17h3" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    shop: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="11" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M2 10l2-6h16l2 6z" fill="#5FA03C" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="9" y="14" width="6" height="7" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="#F4C430" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="13" height="18" rx="1" fill="#FFFDF6" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M7 8l2 2 4-4M7 14l2 2 4-4" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" fill="none"/><path d="M15 20l6-12 1 1-6 12z" fill="#C8452F" stroke="#4A2E1E" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>'
  };
  var NAV_ICON = { s0: "bell", s1: "counter", s2: "dial", s3: "chef", s4: "buildings", s5: "shop", s6: "star", s7: "pencil" };
  var sections = qa("section");
  function buildNav() {
    var nav = $("nav"); nav.innerHTML = "";
    sections.forEach(function (s) {
      var b = document.createElement("button");
      b.innerHTML = '<span class="ic" aria-hidden="true">' + ICONS[NAV_ICON[s.id]] + '</span><span class="n">' + s.dataset.n + "</span>" + s.dataset.title + (store.said[s.id] ? '<span class="chk">✓</span>' : "");
      b.onclick = function () { show(s.id); };
      b.dataset.for = s.id;
      nav.appendChild(b);
    });
  }
  function show(id) {
    sections.forEach(function (s) { s.classList.toggle("on", s.id === id); });
    qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === id); });
    var active = document.querySelector("#nav button.on"), nav = $("nav");
    if (active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    window.scrollTo(0, 0);
    redrawAll();
  }

  /* ---------------- engagement: predict + say ---------------- */
  function touch(sec) {
    store.touched[sec] = (store.touched[sec] || 0) + 1;
    checkSay(sec);
  }
  function checkSay(sec) {
    var s = $(sec); if (!s) return;
    var preds = qa(".predict", s);
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var sayEl = s.querySelector(".say");
    if (!sayEl) return;
    var open = allAnswered && (store.touched[sec] || 0) >= 3;
    if (open && !sayEl.classList.contains("open")) {
      sayEl.classList.add("open");
      if (!store.said[sec]) { store.said[sec] = true; save(); buildNav(); markNav(); }
    }
    if (!open) sayEl.querySelector(".tag").textContent = "Say it out loud · unlocks after you answer the prediction" + (preds.length > 1 ? "s" : "") + " and play with the controls";
    else sayEl.querySelector(".tag").textContent = "Say it out loud";
  }
  function markNav() { var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0]; if (cur) qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === cur.id); }); }

  function initPredicts() {
    qa(".predict").forEach(function (p) {
      var key = p.dataset.p, sec = p.closest("section").id;
      var btns = qa(".opts button", p);
      function reveal(idx) {
        btns.forEach(function (b, i) {
          b.disabled = true;
          if (b.hasAttribute("data-right")) b.classList.add("right");
          else if (i === idx) b.classList.add("wrong");
        });
        p.classList.add("done");
      }
      btns.forEach(function (b, i) {
        b.onclick = function () { store.predicts[key] = i; save(); reveal(i); checkSay(sec); };
      });
      if (store.predicts[key] != null) reveal(store.predicts[key]);
    });
  }

  /* ---------------- glossary tooltip ---------------- */
  function initTips() {
    var tip = $("tip");
    function place(el) {
      var g = GL[el.dataset.g]; if (!g) return;
      tip.innerHTML = "<b>" + g[0] + "</b><br>" + g[1] + '<span class="kt">In the kitchen: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      var x = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      var y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = r.top - h - 8;
      tip.style.left = x + "px"; tip.style.top = Math.max(8, y) + "px";
    }
    qa(".g").forEach(function (el) {
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.addEventListener("mouseenter", function () { place(el); });
      el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
      el.addEventListener("focus", function () { place(el); });
      el.addEventListener("blur", function () { tip.style.display = "none"; });
      el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tip.style.display === "block") tip.style.display = "none"; else place(el); });
    });
    document.addEventListener("click", function () { tip.style.display = "none"; });
    window.addEventListener("scroll", function () { tip.style.display = "none"; }, { passive: true });
  }

  /* ---------------- controls ---------------- */
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val };
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = o.label; b.dataset.v = o.v;
      if (String(o.v) === String(val)) b.classList.add("on");
      b.onclick = function () {
        if (b.disabled) return;
        state.value = o.v;
        qa("button", el).forEach(function (x) { x.classList.toggle("on", x === b); });
        onChange(o.v);
      };
      el.appendChild(b);
    });
    state.set = function (v) { state.value = v; qa("button", el).forEach(function (x) { x.classList.toggle("on", String(x.dataset.v) === String(v)); }); };
    state.disable = function (fn) { qa("button", el).forEach(function (x) { x.disabled = !!fn(x.dataset.v); }); };
    return state;
  }
  var GPU_OPTS = window.IK_GPUS.map(function (g) { return { v: g.id, label: g.name.replace(" SXM", "").replace(" 80GB", "") }; });
  var MODEL_OPTS = IK.MODELS.map(function (m) { return { v: m.id, label: m.name }; });
  var MODEL_SHORT = { "8b": "8B dense", "70b": "70B dense", "qwen235": "235B MoE", "dsv3": "671B MoE" };
  function kvPrecFor(w) { return w === "bf16" ? "bf16" : "fp8"; }

  /* ---------------- canvas ---------------- */
  var drawers = {};
  function ctxFor(id) {
    var c = $(id), dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth || c.parentNode.clientWidth || 600, h = +c.getAttribute("height");
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + "px";
    var x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    x.font = "14px 'Patrick Hand', sans-serif"; x.textBaseline = "middle";
    return { x: x, w: w, h: h };
  }
  function redrawAll() { Object.keys(drawers).forEach(function (k) { var s = $(k).closest("section"); if (s && s.classList.contains("on")) drawers[k](); }); }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(redrawAll, 120); });
  var C = { gold: "#C98A0B", acc: "#246A9C", grn: "#3B7422", red: "#C8452F", dim: "#6E5040", line: "#E7DCC4", txt: "#3A2418", well: "#FFFDF6", wait: "#CDBFA6" };
  function logX(v, lo, hi, x0, x1) { return x0 + (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (x1 - x0); }

  /* ================= STEP 0 ================= */
  var s0 = { model: "70b", gpu: "h100-sxm", timer: null };
  function s0calc() {
    var m = IK.model(s0.model), g = IK.gpu(s0.gpu);
    var wGB = IK.weightsGB(m, "fp8");
    var need = Math.max(1, Math.ceil(wGB / (g.hbmGB * 0.9)));
    var n = [1, 2, 4, 8, 16].filter(function (k) { return k >= need; })[0] || 16;   // real groups are powers of two
    var readGB = IK.weightsReadGB(m, "fp8", 1);
    // per layer: ~15 µs of kernel overhead, plus two GPU-to-GPU hops when split (NVLink ~10 µs, InfiniBand ~25 µs)
    var hopUs = n === 1 ? 0 : 2 * (n > 8 ? 25 : 10);
    var overheadMs = m.layers * (15 + hopUs) / 1000;
    var tokMs = readGB * 1e9 / (n * g.bwTBs * 1e12 * 0.7) * 1e3 + overheadMs;
    return { m: m, g: g, n: n, wGB: wGB, readGB: readGB, tokMs: tokMs, overheadMs: overheadMs, tps: 1000 / tokMs };
  }
  function s0render() {
    var r = s0calc();
    $("s0size").textContent = fgb(r.wGB);
    $("s0bw").textContent = fmt(r.n * r.g.bwTBs, 2) + " TB/s";
    $("s0tps").textContent = fmt(r.tps, 0);
    var note = "Each word: read " + fgb(r.readGB) + " ÷ " + fmt(r.n * r.g.bwTBs * 0.7, 2) + " TB/s usable, plus ~" + fms(r.overheadMs) + " of per-layer overhead ≈ <b>" + fms(r.tokMs) + " per word</b>, so at most ~" + fmt(r.tps) + " words/sec for one user, however fast the stove is.";
    if (r.n > 1) note += " This model needs <b>" + r.n + " GPUs</b>" + (r.n > 8 ? " (two machines)" : "") + " just to hold its weights; they split each layer, read in parallel, and pass results between them every layer (tensor parallelism, step 4).";
    if (r.m.moe) note += " <b>MoE:</b> one user only wakes " + r.m.moe.topK + " of " + r.m.moe.experts + " experts, so only ~" + fgb(r.readGB) + " is read per word. <b>Treat this as a ceiling:</b> real single-user speed for big MoE is usually tens to low hundreds of tok/s, because expert routing and GPU-to-GPU traffic add up. Step 4 shows what happens when many users arrive.";
    $("s0note").innerHTML = note;
  }
  function tokenize(s) { return (s.match(/[A-Za-z]+|[0-9]+|[^\sA-Za-z0-9]/g) || []).slice(0, 40); }
  function s0run() {
    clearTimeout(s0.timer);
    var r = s0calc();
    var prompt = $("s0prompt").value.trim() || "Hello";
    var ins = tokenize(prompt);
    var ans = /sky|blue/i.test(prompt)
      ? "Sunlight scatters off air molecules , and short blue wavelengths scatter the most , so blue reaches your eyes from every direction ."
      : "Here is a short answer , written one token at a time so you can watch decode happen , one trip to the recipe books per word .";
    var outs = ans.split(" ");
    var inEl = $("s0in"), outEl = $("s0out");
    inEl.innerHTML = ins.map(function (t) { return '<span class="tok">' + t.replace(/</g, "&lt;") + "</span>"; }).join("");
    outEl.innerHTML = "";
    var gb = 0, kv = 0, ms = 0;
    var prefillMs = 2 * r.m.activeB * 1e9 * ins.length / (r.n * IK.peakTF(r.g, "fp8") * 1e12 * 0.7) * 1e3 + r.tokMs;
    function set(phase, cls, cpu, mem) {
      $("s0phase").textContent = phase; $("s0phase").className = "phase " + cls;
      $("s0cb").style.transform = "scaleX(" + cpu / 100 + ")"; $("s0cv").textContent = cpu + "%";
      $("s0mb").style.transform = "scaleX(" + mem / 100 + ")"; $("s0mv").textContent = mem + "%";
      $("s0gb").textContent = fmt(gb, 0); $("s0kv").textContent = kv; $("s0ms").textContent = fms(ms);
    }
    set("prefill · reading the whole order in one pass", "p", 0, 0);
    setTimeout(function () {
      qa(".tok", inEl).forEach(function (t) { t.classList.add("lit"); });
      gb += r.readGB; kv += ins.length; ms += prefillMs;
      set("prefill · one parallel pass", "p", 88, 35);
      $("s0clock").textContent = "prefill took ~" + fms(prefillMs) + " for " + ins.length + " tokens";
      var i = 0;
      function step() {
        if (i >= outs.length) {
          set("done · " + outs.length + " trips to the recipe books for " + outs.length + " words", "d", 0, 0);
          $("s0clock").textContent = "prefill " + fms(prefillMs) + " for " + ins.length + " tokens · decode " + fms(outs.length * r.tokMs) + " for " + outs.length + " tokens";
          return;
        }
        var t = document.createElement("span"); t.className = "tok out"; t.textContent = outs[i];
        outEl.appendChild(t);
        gb += r.readGB; kv += 1; ms += r.tokMs;
        var d = IK.decode({ gpu: r.g.id, n: r.n, model: r.m.id, wPrec: "fp8", kvPrec: "fp8", batch: 1, ctx: kv });
        set("decode · word " + (i + 1) + " of " + outs.length, "d", Math.max(1, Math.round(d.tCompMs / d.stepMs * 100)), 96);
        i++; s0.timer = setTimeout(step, 170);
      }
      s0.timer = setTimeout(step, 700);
    }, 450);
    touch("s0");
  }
  function initS0() {
    seg($("s0model"), IK.MODELS.map(function (m) { return { v: m.id, label: MODEL_SHORT[m.id] }; }), s0.model, function (v) { s0.model = v; s0render(); touch("s0"); });
    seg($("s0gpu"), GPU_OPTS, s0.gpu, function (v) { s0.gpu = v; s0render(); touch("s0"); });
    $("s0go").onclick = s0run;
    $("s0prompt").addEventListener("keydown", function (e) { if (e.key === "Enter") s0run(); });
    s0render();
  }

  /* ================= STEP 1 ================= */
  var CTX = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
  var s1 = { gpu: "h200-sxm", n: 1, model: "70b", wp: "fp8", kp: "fp8" };
  function s1render(fromUsers) {
    var ctx = CTX[+$("s1ctx").value];
    var o = { gpu: s1.gpu, n: s1.n, model: s1.model, wPrec: s1.wp, kvPrec: s1.kp, ctx: ctx, reserve: $("s1res").checked ? 0.1 : 0 };
    var r = IK.memory(o);
    var slider = $("s1u");
    var mx = Math.max(40, Math.ceil(r.users * 1.6));
    if (+slider.max !== mx && !fromUsers) { slider.max = mx; }
    var users = Math.min(+slider.value, +slider.max);
    $("s1ctxv").textContent = fk(ctx) + " tokens";
    $("s1uv").textContent = users;
    var used = r.weightsGB + users * r.perUserGB;
    var total = Math.max(r.usableGB, used);
    var wPct = Math.min(r.weightsGB, r.usableGB) / total * 100;
    var kvFit = Math.max(0, Math.min(users * r.perUserGB, r.usableGB - r.weightsGB));
    var over = Math.max(0, used - r.usableGB);
    var bar = $("s1bar");
    bar.innerHTML = '<div class="w" style="width:' + wPct + '%">' + (wPct > 12 ? "books " + fgb(Math.min(r.weightsGB, r.usableGB)) : "") + "</div>" +
      '<div class="kv" style="width:' + (kvFit / total * 100) + '%">' + (kvFit / total > .12 ? "tickets " + fgb(kvFit) : "") + "</div>" +
      '<div class="free" style="width:' + (Math.max(0, r.usableGB - r.weightsGB - kvFit) / total * 100) + '%">' + ((r.usableGB - r.weightsGB - kvFit) / total > .12 ? "free " + fgb(r.usableGB - r.weightsGB - kvFit) : "") + "</div>" +
      '<div class="over" style="width:' + (over / total * 100) + '%">' + (over / total > .1 ? "OVERFLOW " + fgb(over) : "") + "</div>";
    $("s1w").textContent = fgb(r.weightsGB);
    $("s1pu").textContent = r.perUserGB < 1 ? fmt(r.perUserGB * 1000, 0) + " MB" : fgb(r.perUserGB);
    $("s1cap").textContent = fgb(r.capGB);
    var fitEl = $("s1fit");
    fitEl.textContent = r.oom ? "0 · OOM" : fmt(r.users);
    fitEl.className = "v " + (r.oom ? "bad" : users > r.users ? "warn" : "good");
    // tickets
    var shown = Math.min(users, 140), html = "";
    for (var i = 0; i < shown; i++) html += '<span class="' + (r.oom || i >= r.users ? "x" : "") + '"></span>';
    if (users > shown) html += '<span class="more">+' + fmt(users - shown) + " more</span>";
    $("s1tix").innerHTML = html;
    // notes
    var m = IK.model(s1.model), g = IK.gpu(s1.gpu), notes = [];
    if (r.oom) notes.push(["r", "<b>Out of memory before a single diner sits down.</b> The recipe books alone (" + fgb(r.weightsGB) + ") are bigger than the counter (" + fgb(r.usableGB) + "). Add GPUs or shrink the precision."]);
    else if (users > r.users) notes.push(["r", "<b>" + fmt(users - r.users) + " diners have no room for their ticket.</b> The engine queues them (or evicts someone). This is what \"we're capacity-constrained\" means."]);
    else if (!r.headroomOK) notes.push(["w", "It fits, but with little headroom. Kiely's rule of thumb: leave <b>at least 50% extra memory over the weights</b> for KV cache, more for long context or big batches."]);
    if (m.moe) notes.push(["i", "<b>MoE:</b> only " + m.activeB + "B parameters work on each token, but <b>all " + m.paramsB + "B sit on the counter</b>. MoE saves compute, not memory."]);
    if (m.mlaLatent) notes.push(["g", "<b>Tiny tickets:</b> DeepSeek's <span class='g' data-g='mla'>MLA</span> stores a compressed " + m.mlaLatent + "-number summary per layer instead of full keys and values: " + fmt(IK.kvBytesPerToken(m, s1.kp) / 1024, 0) + " KB per token vs " + fmt(IK.kvBytesPerToken(IK.model("70b"), s1.kp) / 1024, 0) + " KB for the 70B dense model. That's why a huge model can seat thousands of diners."]);
    if (s1.wp === "fp4" && !g.fp4TF) notes.push(["w", "<b>" + g.name + " has no native FP4 math.</b> Weights can be <i>stored</i> in 4-bit to save memory, but get unpacked to FP8/BF16 to compute. FP4 is a Blackwell (B200) feature."]);
    if (s1.wp !== "bf16" && !g.fp8TF) notes.push(["w", "<b>The A100 predates FP8 tensor cores.</b> Low-bit weights still save memory, but the math runs in BF16."]);
    $("s1notes").innerHTML = notes.map(function (n) { return '<div class="callout co-' + n[0] + '">' + n[1] + "</div>"; }).join("");
    rebindTips($("s1notes"));
  }
  function initS1() {
    seg($("s1gpu"), GPU_OPTS, s1.gpu, function (v) { s1.gpu = v; s1render(); touch("s1"); });
    seg($("s1n"), [1, 2, 4, 8].map(function (n) { return { v: n, label: n + "×" }; }), s1.n, function (v) { s1.n = +v; s1render(); touch("s1"); });
    seg($("s1model"), MODEL_OPTS, s1.model, function (v) { s1.model = v; s1render(); touch("s1"); });
    seg($("s1wp"), [{ v: "bf16", label: "BF16 · 2 bytes" }, { v: "fp8", label: "FP8 · 1 byte" }, { v: "fp4", label: "FP4 · ½ byte" }], s1.wp, function (v) { s1.wp = v; s1render(); touch("s1"); });
    seg($("s1kp"), [{ v: "bf16", label: "BF16" }, { v: "fp8", label: "FP8" }], s1.kp, function (v) { s1.kp = v; s1render(); touch("s1"); });
    $("s1ctx").oninput = function () { s1render(); touch("s1"); };
    $("s1u").oninput = function () { s1render(true); touch("s1"); };
    $("s1res").onchange = function () { s1render(); touch("s1"); };
    s1render();
  }

  /* ================= STEP 2 ================= */
  var BATCH = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  var CTX2 = [1024, 2048, 4096, 8192, 16384, 32768];
  var s2 = { gpu: "h100-sxm", n: 2, model: "70b", p: "fp8" };
  function s2opts(b) {
    return { gpu: s2.gpu, n: s2.n, model: s2.model, wPrec: s2.p, kvPrec: kvPrecFor(s2.p), batch: b, ctx: CTX2[+$("s2ctx").value] };
  }
  function s2state() {
    var b = BATCH[+$("s2b").value], o = s2opts(b);
    var d = IK.decode(o);
    var mem = IK.memory({ gpu: s2.gpu, n: s2.n, model: s2.model, wPrec: s2.p, kvPrec: kvPrecFor(s2.p), ctx: o.ctx });
    var rent = +$("s2r").value;
    return { b: b, o: o, d: d, mem: mem, rent: rent, costPerM: rent * s2.n / (d.totalTps * 3600) * 1e6, cross: IK.crossoverBatch(o) };
  }
  function s2render() {
    var S = s2state();
    $("s2ctxv").textContent = fk(S.o.ctx) + " tokens"; $("s2bv").textContent = S.b; $("s2rv").textContent = fusd(S.rent) + "/GPU-hr";
    $("s2you").textContent = ftps(S.d.perUserTps); $("s2tot").textContent = ftps(S.d.totalTps);
    $("s2cost").textContent = fusd(S.costPerM, S.costPerM < 1 ? 3 : 2);  // at full load
    var be = $("s2bound"); be.textContent = S.d.bound === "memory" ? "hauling books" : "the stove"; be.className = "v " + (S.d.bound === "memory" ? "acc" : "gold");
    var notes = [];
    if (S.mem.oom) notes.push(["r", "<b>The model doesn't fit on " + S.o.n + "× " + IK.gpu(s2.gpu).name + ".</b> The numbers below are hypothetical; add GPUs."]);
    else if (S.b > S.mem.users) notes.push(["r", "<b>Only " + fmt(S.mem.users) + " tickets of " + fk(S.o.ctx) + " fit on the counter.</b> A batch of " + S.b + " can't actually be seated. This is where memory, not compute, caps your throughput."]);
    var share = S.d.tMemMs / (S.d.tMemMs + S.d.tCompMs) * 100;
    notes.push(["i", "Each step: hauling <b>" + fgb(S.d.weightsReadGB) + "</b> of books" + (S.d.kvReadGB > 0.05 ? " + <b>" + fgb(S.d.kvReadGB) + "</b> of tickets" : "") + " takes " + fms(S.d.tMemMs) + "; the math takes " + fms(S.d.tCompMs) + ". " +
      (S.d.bound === "memory" ? "The stove is idle " + fmt(share, 0) + "% of the step." : "Now the stove is the bottleneck: more diners per trip no longer come free.") +
      " Decode turns <span class='g' data-g='computebound'>compute-bound</span> from a batch of about <b class='num'>" + fmt(S.cross, 0) + "</b> (weights only; real KV traffic pushes it higher)."]);
    if (IK.model(s2.model).moe) notes.push(["w", "<b>MoE under batching:</b> as the batch grows, more experts wake up, so the books you haul grow too (" + fgb(S.d.weightsReadGB) + " now). Step 4 has the full story."]);
    $("s2notes").innerHTML = notes.map(function (n) { return '<div class="callout co-' + n[0] + '">' + n[1] + "</div>"; }).join("");
    rebindTips($("s2notes"));
    s2draw();
  }
  function s2draw() {
    var S = s2state(), c = ctxFor("s2chart"), x = c.x, W = c.w, H = c.h;
    var L = 52, R = W - 56, T = 14, B = H - 36;
    var pts = BATCH.map(function (b) { var d = IK.decode(s2opts(b)); return { b: b, u: d.perUserTps, t: d.totalTps }; });
    var uMax = Math.max.apply(null, pts.map(function (p) { return p.u; })) * 1.15;
    var tMax = Math.max.apply(null, pts.map(function (p) { return p.t; })) * 1.15;
    // red zone
    if (S.mem.users < 512) {
      var zx = S.mem.users < 1 ? L : logX(Math.max(1, S.mem.users), 1, 512, L, R);
      x.fillStyle = "rgba(200,69,47,.13)"; x.fillRect(zx, T, R - zx, B - T);
    }
    x.strokeStyle = C.line; x.lineWidth = 1;
    BATCH.forEach(function (b) { var px = logX(b, 1, 512, L, R); x.beginPath(); x.moveTo(px, T); x.lineTo(px, B); x.stroke(); x.fillStyle = C.dim; x.textAlign = "center"; x.fillText(b, px, B + 12); });
    x.textAlign = "left"; x.fillStyle = C.acc; x.fillText(ftps(uMax), 4, T + 4); x.fillText("0", 4, B);
    x.textAlign = "right"; x.fillStyle = C.grn; x.fillText(ftps(tMax), W - 4, T + 4);
    // crossover
    if (S.cross > 1 && S.cross < 512) {
      var cx = logX(S.cross, 1, 512, L, R); x.strokeStyle = C.gold; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(cx, T); x.lineTo(cx, B); x.stroke(); x.setLineDash([]);
      x.fillStyle = "#8A5A12"; x.textAlign = "center"; x.fillText("compute-bound →", Math.min(cx + 50, R - 50), T + 8);
    }
    function line(key, max, col) {
      x.strokeStyle = col; x.lineWidth = 2.2; x.beginPath();
      pts.forEach(function (p, i) { var px = logX(p.b, 1, 512, L, R), py = B - p[key] / max * (B - T); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
      x.stroke();
    }
    line("u", uMax, C.acc); line("t", tMax, C.grn);
    var mx = logX(S.b, 1, 512, L, R);
    [[S.d.perUserTps, uMax, C.acc], [S.d.totalTps, tMax, C.grn]].forEach(function (a) { x.fillStyle = a[2]; x.beginPath(); x.arc(mx, B - a[0] / a[1] * (B - T), 5, 0, 7); x.fill(); });
    x.fillStyle = C.dim; x.textAlign = "center"; x.fillText("batch: diners per trip (log scale)", (L + R) / 2, H - 7);
  }
  drawers.s2chart = s2draw;

  var spRng = 1;
  function spRender(roll) {
    var a = +$("spa").value, k = +$("spk").value, c = +$("spc").value;
    $("spav").textContent = fmt(a * 100) + "%"; $("spkv").textContent = k; $("spcv").textContent = fmt(c * 100) + "%";
    var r = IK.specDecode(a, k, c);
    $("sptok").textContent = fmt(r.tokensPerPass, 2); $("spx").textContent = fmt(r.speedup, 2) + "×";
    $("spx").className = "v " + (r.speedup >= 1.5 ? "good" : r.speedup >= 1 ? "warn" : "bad");
    if (roll) spRng = (spRng * 16807) % 2147483647;
    var seed = spRng, html = "", missed = false;
    for (var i = 0; i < k; i++) {
      seed = (seed * 16807) % 2147483647;
      var ok = !missed && (seed / 2147483647) < a;
      if (!ok && !missed) { missed = true; html += '<span class="tok" style="background:rgba(229,105,94,.2);color:var(--brick)">✗ guess ' + (i + 1) + "</span>"; }
      else if (missed) html += '<span class="tok" style="opacity:.35">guess ' + (i + 1) + "</span>";
      else html += '<span class="tok out">✓ guess ' + (i + 1) + "</span>";
    }
    html += '<span class="tok lit">+1 head chef</span>';
    $("sprow").innerHTML = html;
  }
  function initS2() {
    seg($("s2gpu"), GPU_OPTS, s2.gpu, function (v) { s2.gpu = v; s2render(); touch("s2"); });
    seg($("s2n"), [1, 2, 4, 8].map(function (n) { return { v: n, label: n + "×" }; }), s2.n, function (v) { s2.n = +v; s2render(); touch("s2"); });
    seg($("s2model"), MODEL_OPTS, s2.model, function (v) { s2.model = v; s2render(); touch("s2"); });
    seg($("s2p"), [{ v: "bf16", label: "BF16" }, { v: "fp8", label: "FP8" }, { v: "fp4", label: "FP4" }], s2.p, function (v) { s2.p = v; s2render(); touch("s2"); });
    ["s2ctx", "s2b", "s2r"].forEach(function (id) { $(id).oninput = function () { s2render(); touch("s2"); }; });
    ["spa", "spk", "spc"].forEach(function (id) { $(id).oninput = function () { spRender(false); touch("s2"); }; });
    $("sproll").onclick = function () { spRender(true); touch("s2"); };
    s2render(); spRender(false);
  }

  /* ================= STEP 3 ================= */
  var CHUNKS = [512, 1024, 2048, 4096, 8192];
  var s3 = { mode: "continuous", result: null };
  var PRESETS = [
    { label: "Naive (2023)", s: { rate: 6, mode: "static", paged: false, giant: false, chunk: false, shared: false, prefix: false, dis: false } },
    { label: "vLLM-style", s: { rate: 6, mode: "continuous", paged: true, giant: false, chunk: false, shared: false, prefix: false, dis: false } },
    { label: "Giant-prompt chaos", s: { rate: 6, mode: "continuous", paged: true, giant: true, chunk: false, shared: false, prefix: false, dis: false } },
    { label: "Tamed with chunking", s: { rate: 6, mode: "continuous", paged: true, giant: true, chunk: true, shared: false, prefix: false, dis: false } },
    { label: "Separate prep kitchen", s: { rate: 6, mode: "continuous", paged: true, giant: true, chunk: false, shared: false, prefix: false, dis: true } },
    { label: "Overload", s: { rate: 15, mode: "continuous", paged: true, giant: false, chunk: false, shared: false, prefix: false, dis: false } }
  ];
  var s3modeSeg;
  function s3params() {
    return {
      rate: +$("s3rate").value, mode: s3.mode, paged: $("s3paged").checked, giant: $("s3giant").checked,
      chunked: $("s3chunk").checked, chunkBudget: CHUNKS[+$("s3chunksz").value], shared: $("s3shared").checked,
      prefixCache: $("s3prefix").checked && $("s3shared").checked, disagg: $("s3dis").checked
    };
  }
  function s3render() {
    var p = s3params();
    $("s3ratev").textContent = p.rate + " / sec";
    $("s3chunkv").textContent = fk(p.chunkBudget) + " tokens";
    $("s3chunkrow").style.display = p.chunked && !p.disagg ? "" : "none";
    $("s3prefix").closest("label").style.opacity = p.shared ? 1 : .45;
    $("s3prefix").disabled = !p.shared;
    s3modeSeg.disable(function () { return p.disagg; });
    $("s3chunk").disabled = p.disagg; $("s3chunk").closest("label").style.opacity = p.disagg ? .45 : 1;
    var r = SIM.run(p); s3.result = r;
    function cls(v, lim) { return v <= lim ? "good" : v <= lim * 3 ? "warn" : "bad"; }
    $("s3ttft").innerHTML = '<span class="' + cls(r.ttftP50, 2000) + '">' + fms(r.ttftP50) + '</span> / <span class="' + cls(r.ttftP99, 2000) + '">' + fms(r.ttftP99) + "</span>";
    $("s3itl").innerHTML = '<span class="' + cls(r.itlP50, 100) + '">' + fms(r.itlP50) + '</span> / <span class="' + cls(r.itlP99, 100) + '">' + fms(r.itlP99) + "</span>";
    ["s3ttft", "s3itl"].forEach(function (id) { qa("span", $(id)).forEach(function (s) { s.className = "v " + s.className; s.style.fontSize = "inherit"; }); });
    $("s3thr").textContent = ftps(r.throughput);
    var g = $("s3good"); g.textContent = ftps(r.goodput) + " · " + fmt(r.sloRate * 100) + "%"; g.className = "v " + (r.sloRate >= .9 ? "good" : r.sloRate >= .5 ? "warn" : "bad");
    var notes = [];
    if (p.mode === "static" && !p.disagg) notes.push(["r", "<b>Static batching:</b> the chef seats a table of up to 16 (fewer if their tickets don't fit), cooks until the <i>slowest</i> diner finishes, then seats the next table. Everyone who arrives meanwhile waits. Look at the long grey bars."]);
    if (!p.paged) notes.push(["r", "<b>No pages:</b> every diner pre-reserves a ticket for 64K tokens even if they'll use 1K, so only ~" + r.maxConcurrent + " fit at once. PagedAttention (vLLM's founding idea) fixed exactly this."]);
    if (p.giant && !p.chunked && !p.disagg) notes.push(["r", "<b>Each spike in the lower chart is a giant prefill</b> running inside one scheduler step (~2.4 s). Every other diner's next word waits for it. Try chunked prefill, then disaggregation."]);
    if (p.giant && p.chunked && !p.disagg) notes.push(["w", "<b>Chunked:</b> the giant is read " + fk(p.chunkBudget) + " tokens at a time between everyone's words. Stalls shrink, but every step now carries a chunk, so the median gap rises. Drag the chunk size: bigger means faster giants and choppier streams. It's a real tuning knob."]);
    if (p.disagg) notes.push(["g", "<b>Disaggregated:</b> prompts are read in a separate prep kitchen and the ticket is shipped over. The decode kitchen never stalls, but you're paying for a second GPU pool, which only pays off at big scale (Kiely: 100M+ tokens/day, 100B+ models, long prompts)."]);
    if (p.shared && !p.prefixCache) notes.push(["w", "<b>Every request re-reads the same 3K-token system prompt.</b> That's 3,000 × " + p.rate + " = " + fmt(3000 * p.rate) + " extra prefill tokens every second. Turn on prefix caching."]);
    if (p.shared && p.prefixCache) notes.push(["g", "<b>Prefix cached:</b> the shared 3K header is computed once and reused. That's why APIs sell \"cached input\" tokens at a steep discount."]);
    if (r.completed < r.submitted) notes.push(["r", "<b>Only " + r.completed + " of " + r.submitted + " diners were served</b> before closing time. The rest count as SLO misses."]);
    if (p.rate >= 12 && !p.disagg) notes.push(["w", "<b>Overloaded:</b> throughput is high, but look at goodput. Most diners get their food cold. Raw tokens/sec can rise while the service fails."]);
    $("s3notes").innerHTML = notes.map(function (n) { return '<div class="callout co-' + n[0] + '">' + n[1] + "</div>"; }).join("");
    s3draw(); s3drawItl();
  }
  function s3sync(st) {
    $("s3rate").value = st.rate; s3.mode = st.mode; s3modeSeg.set(st.mode);
    $("s3paged").checked = st.paged; $("s3giant").checked = st.giant; $("s3chunk").checked = st.chunk;
    $("s3shared").checked = st.shared; $("s3prefix").checked = st.prefix; $("s3dis").checked = st.dis;
  }
  function s3draw() {
    var r = s3.result; if (!r) return;
    var c = ctxFor("s3gantt"), x = c.x, W = c.w, H = c.h;
    var win = 12000, span = 22000, L = 16, R = W - 22, T = 6, B = H - 20;
    var rows = r.requests.filter(function (q) { return q.arrival <= win; });
    var rh = Math.max(1.5, Math.min(8, (B - T) / Math.max(1, rows.length)));
    function X(t) { return L + t / span * (R - L); }
    x.fillStyle = C.dim; x.textAlign = "center";
    for (var s = 0; s <= 20; s += 4) { var px = X(s * 1000); x.strokeStyle = C.line; x.beginPath(); x.moveTo(px, T); x.lineTo(px, B); x.stroke(); x.fillText(s + "s", px, H - 7); }
    rows.forEach(function (q, i) {
      var y = T + i * rh, h = Math.max(1, rh - 0.6);
      var admit = q.admit != null ? q.admit : (q.tokenTimes[0] || q.arrival);
      var first = q.tokenTimes[0], fin = q.finish;
      function bar(a, b, col) { var w = Math.max(1.5, X(Math.min(b, span)) - X(a)); x.fillStyle = col; x.fillRect(X(a), y, w, h); if (h >= 3) { x.strokeStyle = "rgba(74,46,30,.55)"; x.lineWidth = .6; x.strokeRect(X(a), y, w, h); } }
      bar(q.arrival, admit, "#DDBB8A");
      if (first != null) {
        bar(admit, first, "#F4C430");
        if (fin != null) bar(first, fin, "#9CCBEA");
      } else bar(q.arrival, span, "#DDBB8A");
      if (q.giant) { x.strokeStyle = C.red; x.lineWidth = 2.2; x.strokeRect(X(q.arrival), y, Math.max(3, X(Math.min(fin || span, span)) - X(q.arrival)), h); }
    });
  }
  function s3drawItl() {
    var r = s3.result; if (!r) return;
    var c = ctxFor("s3itlc"), x = c.x, W = c.w, H = c.h, L = 58, R = W - 24, T = 8, B = H - 18;
    var tMax = 70000, yMax = 400;
    function Y(v) { return B - Math.min(v, yMax) / yMax * (B - T); }
    x.strokeStyle = C.line; [100, 200, 300, 400].forEach(function (v) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(R, Y(v)); x.stroke(); x.fillStyle = C.dim; x.textAlign = "right"; x.fillText(v + "ms", L - 4, Y(v)); });
    x.strokeStyle = C.gold; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(L, Y(100)); x.lineTo(R, Y(100)); x.stroke(); x.setLineDash([]);
    x.lineWidth = 1;
    r.iterLog.forEach(function (it) {
      if (it.t > tMax) return;
      var px = L + it.t / tMax * (R - L);
      x.strokeStyle = it.dur > 100 ? C.red : C.acc;
      x.beginPath(); x.moveTo(px, B); x.lineTo(px, Y(it.dur)); x.stroke();
    });
    r.iterLog.forEach(function (it) { if (it.dur > yMax && it.t <= tMax) { x.fillStyle = C.red; x.beginPath(); x.arc(L + it.t / tMax * (R - L), T + 3, 3, 0, 7); x.fill(); } });
    x.fillStyle = C.dim; x.textAlign = "center"; for (var s = 0; s <= 60; s += 10) x.fillText(s + "s", L + s * 1000 / tMax * (R - L), H - 5);
  }
  drawers.s3gantt = s3draw; drawers.s3itlc = s3drawItl;
  var ENGINE = [
    { v: "any", label: "Any open model, this week, maybe on AMD", out: "<b>vLLM.</b> The default: the largest install base, day-zero support for new models, the broadest hardware (NVIDIA, AMD, Intel, TPU). Easy: <code>vllm serve model</code>. Invented PagedAttention." },
    { v: "moe", label: "A giant MoE (DeepSeek, Kimi) at high volume", out: "<b>SGLang.</b> From LMSYS; xAI's engine. The best out-of-the-box throughput on big MoE, heavy investment in wide expert parallelism, and Chinese labs ship optimized SGLang code on release day. Invented RadixAttention (prefix sharing)." },
    { v: "max", label: "Squeeze the last 20–40% on Hopper/Blackwell", out: "<b>TensorRT-LLM.</b> NVIDIA's own engine with hand-fused kernels: the best raw performance, native FP4, but the steepest learning curve and NVIDIA-only. Baseten leans on it most (Kiely ch.4). Check whether a team means the v0 or v1 line." },
    { v: "scale", label: "Frontier-size model, cluster-scale traffic", out: "<b>NVIDIA Dynamo on top of any of them.</b> Not an engine but an orchestration toolkit: KV-aware routing, disaggregation with a live prefill/decode ratio, KV offload to CPU and SSD. Kiely: for most deployments it's \"unnecessary work and excess overhead.\"" }
  ];
  function initS3() {
    s3modeSeg = seg($("s3mode"), [{ v: "static", label: "Static batches" }, { v: "continuous", label: "Continuous batching" }], s3.mode, function (v) { s3.mode = v; s3render(); touch("s3"); });
    ["s3rate", "s3chunksz"].forEach(function (id) { $(id).oninput = function () { s3render(); touch("s3"); }; });
    ["s3paged", "s3giant", "s3chunk", "s3shared", "s3prefix", "s3dis"].forEach(function (id) { $(id).onchange = function () { s3render(); touch("s3"); }; });
    var pr = $("s3presets");
    PRESETS.forEach(function (p) { var b = document.createElement("button"); b.className = "ghost"; b.textContent = p.label; b.onclick = function () { s3sync(p.s); s3render(); touch("s3"); }; pr.appendChild(b); });
    seg($("s3pick"), ENGINE.map(function (e) { return { v: e.v, label: e.label }; }), "", function (v) { $("s3pickout").innerHTML = ENGINE.filter(function (e) { return e.v === v; })[0].out; $("s3pickout").style.display = ""; touch("s3"); });
    $("s3pickout").style.display = "none";
    s3render();
  }

  /* ================= STEP 4 ================= */
  var S4B = [1, 4, 16, 32, 64, 128, 256, 512, 1024];
  var HIDDEN = { "70b": 8192, "qwen235": 4096, "dsv3": 7168 };
  var MOE_LAYERS = { "qwen235": 94, "dsv3": 58 };
  var s4 = { model: "dsv3", gpu: "h200-sxm", n: 8, strat: "tpep" };
  var s4stratSeg;
  function s4calc(nOverride) {
    var m = IK.model(s4.model), g = IK.gpu(s4.gpu), n = nOverride || s4.n, B = S4B[+$("s4b").value];
    var hdim = HIDDEN[m.id], ctx = 4096, bytesAct = 2;
    var W = m.paramsB, strat = s4.strat;
    if (!m.moe && (strat === "ep" || strat === "tpep")) strat = "tp";
    var perGpu;
    if (strat === "tp" || strat === "pp") perGpu = W / n;
    else if (strat === "ep") perGpu = m.moe.denseB + m.moe.routedB / n;
    else perGpu = m.moe.denseB / Math.min(8, n) + m.moe.routedB / n;
    var fits = perGpu <= g.hbmGB * 0.85;
    var nv = IK.NVLINK_GBs[g.id] * 1e9, ib = IK.IB_GBs * 1e9, twoNodes = n > 8;
    var kvTok = IK.kvBytesPerToken(m, "fp8");
    var commBytes = 0, commS = 0, stepS, perUser, total, lat = { nv: 8e-6, ib: 25e-6 };
    var bwGpu = g.bwTBs * 1e12 * 0.7, peak = IK.peakTF(g, "fp8") * 1e12 * 0.7;
    var flops = (2 * m.activeB * 1e9 + 4 * m.layers * ctx * m.attnDim) * B;
    if (strat === "pp") {
      var stageRead = IK.weightsReadGB(m, "fp8", B) * 1e9 / n + B * ctx * kvTok / n;
      var stageS = Math.max(stageRead / bwGpu, flops / n / peak);
      var hops = n - 1, crossHops = twoNodes ? 1 : 0;
      commBytes = hops * B * hdim * bytesAct;
      commS = (hops - crossHops) * (lat.nv + B * hdim * bytesAct / nv) + crossHops * (lat.ib + B * hdim * bytesAct / ib);
      stepS = n * stageS + commS;
      perUser = 1 / stepS; total = B / stepS;
    } else {
      var wRead = IK.weightsReadGB(m, "fp8", B) * 1e9, readBytes;
      if (strat === "tp") readBytes = wRead / n + B * ctx * kvTok / n;
      else {
        // EP: every GPU holds (and reads) its own copy of the dense/attention weights; only the experts are split
        var denseRead = m.moe.denseB * 1e9, routedRead = wRead - denseRead;
        readBytes = (strat === "ep" ? denseRead : denseRead / Math.min(8, n)) + routedRead / n + B * ctx * kvTok / n;
      }
      var compS = Math.max(readBytes / bwGpu, flops / n / peak);
      if (strat === "tp") {
        var ar = 2 * (n - 1) / n * B * hdim * bytesAct, link = twoNodes ? ib : nv, l = twoNodes ? lat.ib : lat.nv;
        commBytes = 2 * m.layers * ar; commS = 2 * m.layers * (l + ar / link);
      } else {
        var e = n, a2a = 2 * B * m.moe.topK * hdim * bytesAct / e * (e - 1) / e;
        var linkE = twoNodes ? ib : nv, lE = twoNodes ? lat.ib : lat.nv;
        commBytes = MOE_LAYERS[m.id] * a2a; commS = MOE_LAYERS[m.id] * (lE + a2a / linkE);
        if (strat === "tpep") { var t = Math.min(8, n), ar2 = 2 * (t - 1) / t * B * hdim * bytesAct; commBytes += 2 * m.layers * ar2; commS += 2 * m.layers * (lat.nv + ar2 / nv); }
      }
      stepS = compS + commS; perUser = 1 / stepS; total = B / stepS;
    }
    return { m: m, g: g, n: n, B: B, strat: strat, perGpu: perGpu, fits: fits, commBytes: commBytes, commS: commS, stepS: stepS, perUser: perUser, total: total, twoNodes: twoNodes };
  }
  function s4render() {
    var r = s4calc();
    $("s4bv").textContent = r.B;
    s4stratSeg.disable(function (v) { return !r.m.moe && (v === "ep" || v === "tpep"); });
    if (!r.m.moe && (s4.strat === "ep" || s4.strat === "tpep")) s4stratSeg.set("tp");
    var html = "";
    for (var node = 0; node < (r.twoNodes ? 2 : 1); node++) {
      html += '<div class="node"><div class="nl">Machine ' + (node + 1) + (r.twoNodes ? " · InfiniBand to the other machine" : " · NVLink inside") + '</div><div class="gpus">';
      for (var i = 0; i < 8; i++) {
        var gi = node * 8 + i, what;
        if (r.strat === "tp") what = "1/" + r.n + " of every layer";
        else if (r.strat === "pp") { var per = Math.ceil(r.m.layers / r.n); what = "layers " + (gi * per + 1) + "–" + Math.min(r.m.layers, (gi + 1) * per); }
        else if (r.strat === "ep") { var pe = r.m.moe.experts / r.n; what = "experts " + (gi * pe) + "–" + ((gi + 1) * pe - 1) + " + attention copy"; }
        else { var pe2 = r.m.moe.experts / r.n; what = "1/8 attention + experts " + (gi * pe2) + "–" + ((gi + 1) * pe2 - 1); }
        var pct = Math.min(100, r.perGpu / r.g.hbmGB * 100);
        html += '<div class="gpucell' + (r.fits ? "" : " bad") + '"><div>GPU ' + (gi + 1) + '</div><div class="fill"><i style="width:' + pct + '%;background:' + (r.fits ? "var(--yellow)" : "var(--brick)") + '"></i></div><div class="what">' + what + "</div></div>";
      }
      html += "</div></div>";
    }
    $("s4nodes").innerHTML = html;
    $("s4per").textContent = fgb(r.perGpu);
    $("s4per").className = "v " + (r.fits ? "gold" : "bad");
    var cm = $("s4comm"); cm.textContent = fms(r.commS * 1e3); cm.className = "v " + (r.commS / r.stepS > .5 ? "bad" : r.commS / r.stepS > .2 ? "warn" : "good");
    $("s4lat").textContent = r.fits ? ftps(r.perUser) : "—"; $("s4thr").textContent = r.fits ? ftps(r.total) : "—";
    var notes = [];
    if (!r.fits) notes.push(["r", "<b>Doesn't fit:</b> " + fgb(r.perGpu) + " of weights per GPU on a " + r.g.hbmGB + " GB card, with no room for tickets. Add GPUs, or cut the model a different way."]);
    if (r.strat === "tp" && r.twoNodes) { var one = s4calc(8); notes.push(["r", "<b>Tensor parallelism across two machines:</b> every layer ends in an all-reduce, " + (2 * r.m.layers) + " of them per step, and that traffic now crosses InfiniBand, ~" + Math.round(IK.NVLINK_GBs[r.g.id] / IK.IB_GBs) + "× slower than NVLink. Shouting is <b>" + fmt(r.commS / r.stepS * 100) + "% of every step</b>, vs " + fmt(one.commS / one.stepS * 100) + "% inside one machine, so the second machine's bandwidth mostly goes to waiting. Kiely: TP within a node; cross machines with PP or EP."]); }
    if (r.strat === "tp" && !r.twoNodes) notes.push(["g", "<b>Tensor parallelism inside one machine</b> is the default: each GPU holds a slice of every layer, they all read at once (" + r.n + "× the bandwidth, so faster per user), and the per-layer all-reduces ride fast NVLink."]);
    if (r.strat === "pp") notes.push(["w", "<b>Pipeline parallelism:</b> each GPU holds a block of layers, and a token walks through them in order. It makes the model <i>fit</i> but gives one diner <b>no speedup</b>: " + ftps(r.perUser) + " tok/s, the same as one GPU reading everything. It's best used <i>between</i> machines, passing one small message per boundary, which is why Kiely's dense-model layout is TP inside each machine and PP across them (\"TP8PP2\"). Pure PP is shown here to isolate the effect."]);
    if (r.strat === "ep") notes.push(["g", "<b>Expert parallelism:</b> whole experts live on different GPUs; tokens are shipped to their experts and back (all-to-all). Each GPU keeps its own copy of the attention weights, so <b>one user doesn't get faster</b> (Kiely: each token \"takes just as long\"). EP moves only routed tokens, not whole layer outputs, so its payoff is <b>scaling across machines</b>: inside one machine it's roughly even with TP, but on 16 GPUs at a big batch it serves far more total tokens (try it)." + (r.twoNodes ? " This is the \"wide EP\" pattern SGLang runs DeepSeek and Kimi with." : "")]);
    if (r.strat === "tpep") notes.push(["g", "<b>The standard MoE layout:</b> attention split with TP inside the machine; experts spread with EP across everything. Kiely ch.5 shows exactly this split."]);
    $("s4notes").innerHTML = notes.map(function (n) { return '<div class="callout co-' + n[0] + '">' + n[1] + "</div>"; }).join("");
  }
  var s4moe = "dsv3";
  var S4MB = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  function s4moeRender() {
    var m = IK.model(s4moe), t = S4MB[+$("s4mb").value];
    var f = IK.expertsTouchedFrac(m.moe.experts, m.moe.topK, t);
    $("s4mbv").textContent = t; $("s4mfrac").textContent = fmt(f * 100, f < .1 ? 1 : 0) + "%";
    $("s4mgb").textContent = fgb(IK.weightsReadGB(m, "fp8", t)) + " of " + fgb(m.paramsB);
    s4moeDraw();
  }
  function s4moeDraw() {
    var m = IK.model(s4moe), t = S4MB[+$("s4mb").value], c = ctxFor("s4mchart"), x = c.x, W = c.w, H = c.h;
    var L = 38, R = W - 10, T = 10, B = H - 20;
    x.strokeStyle = C.line; [0, .25, .5, .75, 1].forEach(function (v) { var y = B - v * (B - T); x.beginPath(); x.moveTo(L, y); x.lineTo(R, y); x.stroke(); x.fillStyle = C.dim; x.textAlign = "right"; x.fillText(v * 100 + "%", L - 4, y); });
    x.strokeStyle = C.gold; x.lineWidth = 2.2; x.beginPath();
    for (var i = 0; i <= 100; i++) { var b = Math.pow(512, i / 100), px = logX(b, 1, 512, L, R), py = B - IK.expertsTouchedFrac(m.moe.experts, m.moe.topK, b) * (B - T); if (i) x.lineTo(px, py); else x.moveTo(px, py); }
    x.stroke();
    var mx = logX(t, 1, 512, L, R), my = B - IK.expertsTouchedFrac(m.moe.experts, m.moe.topK, t) * (B - T);
    x.fillStyle = C.txt; x.beginPath(); x.arc(mx, my, 5, 0, 7); x.fill();
    x.fillStyle = C.dim; x.textAlign = "center"; S4MB.forEach(function (b) { x.fillText(b, logX(b, 1, 512, L, R), H - 6); });
  }
  drawers.s4mchart = s4moeDraw;
  function initS4() {
    seg($("s4model"), IK.MODELS.filter(function (m) { return m.id !== "8b"; }).map(function (m) { return { v: m.id, label: m.name }; }), s4.model, function (v) { s4.model = v; s4render(); touch("s4"); });
    seg($("s4gpu"), GPU_OPTS.filter(function (o) { return o.v !== "a100-80gb-sxm"; }), s4.gpu, function (v) { s4.gpu = v; s4render(); touch("s4"); });
    seg($("s4n"), [{ v: 8, label: "8 GPUs · 1 machine" }, { v: 16, label: "16 GPUs · 2 machines" }], s4.n, function (v) { s4.n = +v; s4render(); touch("s4"); });
    s4stratSeg = seg($("s4strat"), [{ v: "tp", label: "Tensor (TP)" }, { v: "pp", label: "Pipeline (PP)" }, { v: "ep", label: "Expert (EP)" }, { v: "tpep", label: "TP + EP" }], s4.strat, function (v) { s4.strat = v; s4render(); touch("s4"); });
    $("s4b").oninput = function () { s4render(); touch("s4"); };
    seg($("s4moe"), [{ v: "dsv3", label: "671B · 256 experts" }, { v: "qwen235", label: "235B · 128 experts" }], s4moe, function (v) { s4moe = v; s4moeRender(); touch("s4"); });
    $("s4mb").oninput = function () { s4moeRender(); touch("s4"); };
    s4render(); s4moeRender();
  }

  /* ================= STEP 5 ================= */
  var s5 = { shape: "business" };
  function s5util() { return $("s5pool").checked ? IK.pooledUtil(s5.shape, +$("s5pn").value) : IK.shapeUtil(s5.shape); }
  function s5render() {
    var rent = +$("s5r").value, n = +$("s5n").value, tps = +$("s5t").value, api = +$("s5a").value;
    $("s5rv").textContent = fusd(rent); $("s5nv").textContent = n; $("s5tv").textContent = fmt(tps) + " tok/s"; $("s5av").textContent = fusd(api) + "/M";
    $("s5pnv").textContent = $("s5pn").value; $("s5poolrow").style.display = $("s5pool").checked ? "" : "none";
    var u = s5util(), full = IK.selfHostCostPerM(rent, n, tps, 1), you = full / u, be = IK.breakevenUtil(rent, n, tps, api);
    var ue = $("s5util"); ue.textContent = fmt(u * 100) + "%"; ue.className = "v " + (u >= be ? "good" : "warn");
    var ye = $("s5you"); ye.textContent = fusd(you, you < 1 ? 3 : 2); ye.className = "v " + (you <= api ? "good" : "bad");
    $("s5be").textContent = be > 1 ? "never" : fmt(be * 100, 1) + "%";
    var v = $("s5verdict"); v.textContent = you <= api ? "self-host" : "use the API"; v.className = "v " + (you <= api ? "good" : "acc");
    s5draw(); s5dayDraw();
  }
  function s5draw() {
    var rent = +$("s5r").value, n = +$("s5n").value, tps = +$("s5t").value, api = +$("s5a").value;
    var u = s5util(), full = IK.selfHostCostPerM(rent, n, tps, 1), be = IK.breakevenUtil(rent, n, tps, api);
    var c = ctxFor("s5chart"), x = c.x, W = c.w, H = c.h, L = 54, R = W - 10, T = 10, B = H - 22;
    var yMax = Math.max(api * 3, full * 1.6);
    function X(v) { return L + v * (R - L); } function Y(v) { return B - Math.min(v, yMax) / yMax * (B - T); }
    x.strokeStyle = C.line; x.fillStyle = C.dim;
    [0, .25, .5, .75, 1].forEach(function (v) { x.beginPath(); x.moveTo(X(v), T); x.lineTo(X(v), B); x.stroke(); x.textAlign = "center"; x.fillText(v * 100 + "%", X(v), H - 7); });
    [0, .5, 1].forEach(function (f) { x.textAlign = "right"; x.fillText(fusd(yMax * f), L - 4, Y(yMax * f)); });
    x.strokeStyle = C.acc; x.lineWidth = 2; x.beginPath(); x.moveTo(L, Y(api)); x.lineTo(R, Y(api)); x.stroke();
    x.fillStyle = C.acc; x.textAlign = "left"; x.fillText("API " + fusd(api) + "/M", L + 4, Y(api) - 9);
    x.strokeStyle = C.gold; x.lineWidth = 2.4; x.beginPath();
    var started = false;
    for (var i = 2; i <= 100; i++) { var uu = i / 100, cost = full / uu; if (cost > yMax) continue; var px = X(uu), py = Y(cost); if (started) x.lineTo(px, py); else { x.moveTo(px, py); started = true; } }
    x.stroke();
    if (be <= 1) { x.strokeStyle = C.gold; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(X(be), T); x.lineTo(X(be), B); x.stroke(); x.setLineDash([]); x.fillStyle = C.gold; x.textAlign = "center"; x.fillText("break-even " + fmt(be * 100, 1) + "%", Math.min(X(be), R - 60), T + 6); }
    x.fillStyle = C.txt; x.beginPath(); x.arc(X(u), Y(full / u), 6, 0, 7); x.fill();
  }
  function s5profile() {
    var s = IK.SHAPES[s5.shape];
    if (!$("s5pool").checked) return s;
    var n = +$("s5pn").value, tot = [];
    for (var i = 0; i < 24; i++) { var sum = 0; for (var j = 0; j < n; j++) sum += s[(i + (j * 7) % 24) % 24]; tot.push(sum / n); }
    return tot;
  }
  function s5dayDraw() {
    var p = s5profile(), c = ctxFor("s5day"), x = c.x, W = c.w, H = c.h, L = 8, R = W - 8, T = 8, B = H - 14;
    var pk = Math.max.apply(null, p), bw = (R - L) / 24;
    x.strokeStyle = C.red; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(L, T); x.lineTo(R, T); x.stroke(); x.setLineDash([]);
    x.fillStyle = C.red; x.textAlign = "right"; x.fillText("you pay for this peak, 24 hours a day", R, T + 8);
    p.forEach(function (v, i) { var h = v / pk * (B - T); x.fillStyle = C.gold; x.fillRect(L + i * bw + 1, B - h, bw - 2, h); });
    x.fillStyle = C.dim; x.textAlign = "center"; [0, 6, 12, 18].forEach(function (hh) { x.fillText(hh + ":00", L + hh * bw + bw / 2, H - 4); });
  }
  drawers.s5chart = s5draw; drawers.s5day = s5dayDraw; drawers.cschart = csDraw;

  var ty = { tier: "frontier", ppl: IK.TRYON.halfEng };
  function tyVolume() { var s = +$("tyv").value; return Math.round(Math.pow(10, 4 + s / 100 * (Math.log10(2e7) - 4))); }
  function tyRender() {
    var v = tyVolume(), price = IK.TRYON[ty.tier], a = IK.tryonAnnual(v, price, ty.ppl), be = IK.tryonBreakevenPerDay(price, ty.ppl);
    $("tyvv").textContent = fbig(v) + "/day";
    $("tyapi").textContent = fusd(a.api, 0); $("tyown").textContent = fusd(a.owned, 0);
    $("tybe").textContent = isFinite(be) ? fbig(be) : "never";
    var own = a.owned < a.api, out = $("tyout");
    out.className = "callout " + (own ? "co-g" : "co-i");
    out.innerHTML = (own ? "<b>Own the weights.</b> " : "<b>Rent the API.</b> ") +
      "At " + fbig(v) + " labels a day against the " + ty.tier + " tier, owning costs " + fusd(a.owned, 0) + "/yr vs " + fusd(a.api, 0) + "/yr to rent. " +
      (ty.tier === "budget" ? "Against the budget tier you'd need " + fbig(be) + " labels/day before owning pays. <b>That's your class finding:</b> owning only wins against the tier nobody retested since 2024." :
        "Break-even is " + fbig(be) + "/day. At Tryon's actual 900K/day the tier choice matters far more than the hardware.") +
      ' <span class="muted">Owned compute is priced per label ($19.23/M) as in Exhibit 4, and people are the fixed cost, which reproduces your 283K / 732K / 15.1M break-evens. Your class table\'s $18,952/yr assumes one card rented around the clock; it gives the same verdict at 900K/day.</span>';
  }

  function fcRender() {
    var s = +$("fcn").value, n = Math.round(8 * Math.pow(10, s / 100 * Math.log10(12500)));
    var h = IK.hoursBetweenFailures(n);
    $("fcnv").textContent = fmt(n) + " GPUs"; $("fcev").textContent = fdur(h); $("fcwk").textContent = fmt(168 / h, 168 / h < 10 ? 1 : 0);
  }

  function csParts() {
    var warm = $("cswarm").checked, slim = $("csslim").checked, near = $("csnear").checked, fp8 = $("csfp8").checked, cache = $("cscache").checked;
    return [
      ["get a GPU", warm ? 0 : 120, C.red],
      ["pull image", (slim ? 2 : 15) / 0.25, C.dim],
      ["load weights", (fp8 ? 70 : 140) / (near ? 5 : 0.5), C.gold],
      ["compile engine", cache ? 20 : 300, C.acc]
    ];
  }
  function csDraw() {
    var parts = csParts(), tot = parts.reduce(function (s, p) { return s + p[1]; }, 0);
    var c = ctxFor("cschart"), x = c.x, W = c.w, H = c.h, L = 4, R = W - 4, y = 22, h = 30, maxT = 720;
    var px = L;
    parts.forEach(function (p) { var w = p[1] / maxT * (R - L); x.fillStyle = p[2]; x.fillRect(px, y, Math.max(0, w - 1), h); px += w; });
    px = L; x.textAlign = "left";
    parts.forEach(function (p, i) { x.fillStyle = p[2]; x.fillRect(L + i * ((R - L) / 4), 78, 10, 10); x.fillStyle = C.dim; x.fillText(p[0] + " " + fmt(p[1]) + "s", L + i * ((R - L) / 4) + 14, 83); });
    x.fillStyle = C.dim; x.fillText("0", L, 12); x.textAlign = "right"; x.fillText("12 min", R, 12);
    $("cstot").textContent = tot >= 60 ? fmt(tot / 60, 1) + " min" : fmt(tot) + " s";
  }

  var WS = [
    { v: "raw", label: "Rent raw H100s for my own vLLM", hot: ["neo"], out: "<b>Neocloud.</b> You get GPU-hours and bring the whole engine yourself: vLLM/SGLang, autoscaling, on-call. Cheapest per GPU; most work." },
    { v: "ft", label: "Serve my fine-tuned Llama with no infra team", hot: ["plat", "neo"], out: "<b>Inference platform</b> (a dedicated deployment), which itself rents from neoclouds and hyperscalers underneath. You pay for their tuned stack, autoscaling, multi-cloud capacity and forward-deployed engineers." },
    { v: "bill", label: "Claude + DeepSeek on one bill", hot: ["router", "lab", "plat"], out: "<b>Router.</b> OpenRouter owns no GPUs. It forwards Claude requests to Anthropic (a lab) and DeepSeek requests to whichever platform hosts it, with one key and one invoice." },
    { v: "aws", label: "Claude inside my AWS commitment", hot: ["lab"], out: "<b>Lab via a cloud partner:</b> Claude on Amazon Bedrock. Closed models are only served by their lab or its cloud partners; no neocloud or platform can host them." },
    { v: "cheap", label: "Cheapest tokens for an open model", hot: ["plat", "router"], out: "<b>Inference platforms compete on price for open models.</b> DeepInfra is usually the floor; OpenRouter shows every host's price and speed side by side for the same model." }
  ];
  function initS5() {
    ["s5r", "s5n", "s5t", "s5a", "s5pn"].forEach(function (id) { $(id).oninput = function () { s5render(); touch("s5"); }; });
    $("s5pool").onchange = function () { s5render(); touch("s5"); };
    seg($("s5shape"), [{ v: "flat", label: "Flat, around the clock" }, { v: "business", label: "Business hours" }, { v: "spiky", label: "Spiky" }], s5.shape, function (v) { s5.shape = v; s5render(); touch("s5"); });
    $("s5guide").onclick = function () { $("s5r").value = 2.5; $("s5n").value = 2; $("s5t").value = 2500; $("s5a").value = 0.9; s5render(); touch("s5"); };
    $("s5frombd").onclick = function () {
      var S = s2state();
      $("s5r").value = S.rent; $("s5n").value = Math.min(16, S.o.n); $("s5t").value = Math.max(500, Math.min(20000, Math.round(S.d.totalTps / 100) * 100));
      s5render(); touch("s5");
    };
    seg($("tytier"), [{ v: "frontier", label: "Frontier $890/M" }, { v: "standard", label: "Standard $356/M" }, { v: "budget", label: "Budget $35.60/M" }], ty.tier, function (v) { ty.tier = v; tyRender(); touch("s5"); });
    seg($("typpl"), [{ v: IK.TRYON.halfEng, label: "½ engineer · $90K" }, { v: IK.TRYON.fullEng, label: "1 engineer · $180K" }], ty.ppl, function (v) { ty.ppl = +v; tyRender(); touch("s5"); });
    $("tyv").oninput = function () { tyRender(); touch("s5"); };
    $("fcn").oninput = function () { fcRender(); touch("s5"); };
    ["cswarm", "csslim", "csnear", "csfp8", "cscache"].forEach(function (id) { $(id).onchange = function () { csDraw(); touch("s5"); }; });
    seg($("wsw"), WS.map(function (w) { return { v: w.v, label: w.label }; }), "", function (v) {
      var w = WS.filter(function (x) { return x.v === v; })[0];
      qa(".fbox", $("wsflow")).forEach(function (b) { var hot = w.hot.indexOf(b.dataset.k) >= 0; b.classList.toggle("hot", hot); b.classList.toggle("cold", !hot); });
      $("wsout").innerHTML = w.out; touch("s5");
    });
    s5render(); tyRender(); fcRender(); csDraw();
  }

  /* ================= CAPSTONE ================= */
  var RENT = { "a100-80gb-sxm": 1.6, "h100-sxm": 2.5, "h200-sxm": 3.5, "b200-sxm": 6.0 };
  var BRIEFS = {
    code: {
      label: "A · Code assistant",
      text: "<b>Client:</b> a code-editor company. <b>2,000 developers; at peak 400 are mid-request.</b> Every prompt starts with the same <b>~22K-token index of the company codebase</b> (identical for everyone), plus ~2K tokens of the developer's own context. Quality bar: the <b>70B</b> model. SLO: first token in <b>under 1.5 s</b>, streaming at <b>≥ 25 tok/s</b>. Budget: <b>$90/hour</b>. A classic long-prompt workload.",
      users: 400, ctx: 24576, sharedTok: 22528, reqPerSec: 40, minTps: 25, ttft: 1500, budget: 90, longPrompts: true, needs70: true
    },
    chat: {
      label: "B · Support chatbot",
      text: "<b>Client:</b> a retailer's support bot. <b>300 conversations at once</b> at peak, ~<b>4K tokens</b> each, of which <b>3K is the same system prompt</b>; one new message per conversation every ~20 s. Model: <b>70B</b>. SLO: first token <b>under 1 s</b>, <b>≥ 20 tok/s</b>. Budget: <b>$12/hour</b>.",
      users: 300, ctx: 4096, sharedTok: 3072, reqPerSec: 15, minTps: 20, ttft: 1000, budget: 12, longPrompts: false, needs70: true
    },
    voice: {
      label: "C · Voice agent",
      text: "<b>Client:</b> a phone-support agent. <b>60 calls at once</b>, ~2K tokens of context. A caller hears silence until the first word is spoken, so the LLM's first token must land <b>within 150 ms</b>, counting the hops from speech-to-text → LLM → text-to-speech. It must stream <b>≥ 60 tok/s</b> so the voice never starves. An <b>8B</b> model is good enough. Budget: <b>$6/hour</b>.",
      users: 60, ctx: 2048, sharedTok: 0, reqPerSec: 6, minTps: 60, ttft: 150, budget: 6, longPrompts: false, needs70: false, voice: true
    }
  };
  var cp = { brief: "code", gpu: "h100-sxm", gpr: 2, model: "70b", prec: "fp8" };
  function f1(n) { return fmt(Math.floor(n * 10) / 10, 1); }
  /* A plan = `replicas` identical copies of the model, each spread over `gpr` GPUs inside one machine.
     Users are split evenly across replicas. Disaggregation adds a prefill pool of 25% more GPUs. */
  function cpEvaluate(o) {
    var b = BRIEFS[o.brief], g = IK.gpu(o.gpu), m = IK.model(o.model), kvp = kvPrecFor(o.prec), checks = [];
    var perRep = Math.ceil(b.users / o.replicas);
    var kvTok = IK.kvBytesPerToken(m, kvp);
    var shared = o.prefix ? b.sharedTok : 0;               // with prefix caching, the shared header is stored once per replica
    var usable = g.hbmGB * o.gpr, wGB = IK.weightsGB(m, o.prec);
    var perUserGB = (b.ctx - shared) * kvTok / 1e9, sharedGB = shared * kvTok / 1e9;
    var free = usable - wGB - sharedGB;
    var fit = free > 0 ? Math.floor(free / perUserGB) : 0;
    checks.push({ ok: free > 0 && fit >= perRep, t: "Fits on the counter",
      why: free <= 0 ? "Out of memory: " + fgb(wGB) + " of weights" + (sharedGB > 0.05 ? " + the shared header" : "") + " exceed one replica's " + fgb(usable) + "." :
        fmt(fit) + " diners fit per replica; each replica must seat " + perRep + " (" + b.users + " users ÷ " + o.replicas + " replica" + (o.replicas > 1 ? "s" : "") + ")." + (shared ? " Prefix caching stores the shared " + fk(shared) + " header once." : "") });
    var qOK = b.needs70 ? o.model === "70b" : true;
    checks.push({ ok: qOK, t: "Meets the quality bar", why: b.needs70 ? (qOK ? "70B, as required." : "The client requires the 70B model.") : (o.model === "8b" ? "8B is enough here, and smaller is faster and cheaper." : "70B works, but you're paying for quality the client didn't ask for.") });
    // decode: every user still attends over their full context, so reads use the full ctx even with a shared prefix
    var d = IK.decode({ gpu: o.gpu, n: o.gpr, model: o.model, wPrec: o.prec, kvPrec: kvp, batch: perRep, ctx: b.ctx });
    var specOK = o.spec && perRep * 5 < IK.crossoverBatch({ gpu: o.gpu, model: o.model, wPrec: o.prec });
    var spd = d.perUserTps * (specOK ? IK.specDecode(0.8, 4, 0.05).speedup : 1);
    checks.push({ ok: free > 0 && spd >= b.minTps, t: "Streams fast enough (≥ " + b.minTps + " tok/s)",
      why: f1(spd) + " tok/s per user at a batch of " + perRep + " per replica" + (specOK ? " (speculative decoding ×" + fmt(IK.specDecode(0.8, 4, 0.05).speedup, 1) + ")" : o.spec ? ". Speculative decoding is off: " + perRep + " users × 5 checked tokens already saturates the stove, so guesses aren't free" : "") + (shared ? ". Note: prefix caching saves memory and prefill, not decode; every user still reads the whole " + fk(b.ctx) + " context each step." : ".") });
    var prefillTok = o.prefix ? b.ctx - b.sharedTok : b.ctx;
    var repPrefillCap = o.gpr * IK.peakTF(g, o.prec) * 1e12 * 0.7 / (2 * m.activeB * 1e9);   // tokens/s one replica can read
    var poolCap = repPrefillCap * o.replicas * (o.dis ? 1.25 : 1);
    var demand = b.reqPerSec * prefillTok;
    var oneMs = prefillTok / repPrefillCap * 1000;
    var hops = b.voice ? (o.same ? 30 : 150) : 0;
    var ttftMs = oneMs + hops;
    var loadOK = demand * 1.25 <= poolCap;
    var ttftOK = loadOK && ttftMs <= b.ttft && o.cont;
    checks.push({ ok: ttftOK, t: "First token within " + fms(b.ttft), why: !o.cont ? "Static batching makes new requests wait for the whole table. Turn on continuous batching." :
      !loadOK ? "Prompt reading needs " + fbig(demand) + " tok/s but the fleet reads only " + fbig(poolCap) + " tok/s: the queue grows forever." + (b.sharedTok && !o.prefix ? " Most of every prompt is the same shared header. Prefix caching would cut demand to " + fbig(b.reqPerSec * (b.ctx - b.sharedTok)) + " tok/s." : "") :
      "~" + fms(oneMs) + " to read a prompt" + (b.voice ? " + " + hops + " ms of hops between speech models (" + (o.same ? "same cluster, ~10 ms a hop" : "cross-cluster, ~50 ms a hop") + ")" : "") + " = " + fms(ttftMs) + "." });
    if (b.longPrompts) checks.push({ ok: o.chunk || o.dis, t: "Long prompts don't freeze everyone", why: o.chunk || o.dis ? (o.dis ? "Disaggregated: prompts are read in a separate pool. It works, but it's a lot of machinery for a 70B model; Kiely reserves it for 100B+ models at huge volume." : "Chunked prefill spreads long prompts between everyone's words.") : "Multi-thousand-token prefills inside a decode step stall every other stream. You need chunked prefill (or disaggregation)." });
    var gpus = o.gpr * o.replicas, extra = o.dis ? Math.ceil(gpus * 0.25) : 0;
    var cost = (gpus + extra) * RENT[o.gpu];
    checks.push({ ok: cost <= b.budget, t: "Within budget (" + fusd(b.budget, 0) + "/hr)", why: o.replicas + " replica" + (o.replicas > 1 ? "s" : "") + " × " + o.gpr + " " + g.name + (extra ? " + " + extra + " for the prefill pool" : "") + " at " + fusd(RENT[o.gpu]) + " = " + fusd(cost) + "/hr." });
    var passed = checks.filter(function (c) { return c.ok; }).length;
    return { checks: checks, passed: passed, total: checks.length };
  }
  function cpState() {
    return { brief: cp.brief, gpu: cp.gpu, gpr: cp.gpr, replicas: +$("cpn").value, model: cp.model, prec: cp.prec, cont: $("cpcont").checked, chunk: $("cpchunk").checked,
      dis: $("cpdis").checked, prefix: $("cpprefix").checked, spec: $("cpspec").checked, same: $("cpsame").checked };
  }
  function cpRenderBrief() {
    $("cpbrieftxt").innerHTML = BRIEFS[cp.brief].text;
    $("cpsame").closest("label").style.display = BRIEFS[cp.brief].voice ? "" : "none";
    var best = store.briefs[cp.brief];
    $("cpchecks").innerHTML = '<div class="idle">' + ICONS.chef.replace("<svg ", '<svg aria-hidden="true" ') + '<b>The pass is empty</b>Set up the kitchen on the left, then submit. The head chef grades your plan on three questions: does it fit, is it fast, is it affordable?' + (best != null ? "<br>Your best so far on this brief: " + best + "." : "") + "</div>";
    $("cpstars").textContent = "☆☆☆☆☆"; $("cpscore").textContent = "";
  }
  function cpSubmit() {
    var r = cpEvaluate(cpState());
    $("cpchecks").innerHTML = r.checks.map(function (c) { return '<div class="check ' + (c.ok ? "ok" : "no") + '"><span class="ic">' + (c.ok ? "✓" : "✗") + "</span><div>" + c.t + '<div class="why">' + c.why + "</div></div></div>"; }).join("") +
      (r.passed === r.total ? '<div class="callout co-g"><b>Ship it.</b> Every check passes. The client gets a kitchen that fits, streams, answers fast and stays in budget.</div>' : "");
    var stars = Math.round(r.passed / r.total * 5);
    $("cpstars").textContent = "★★★★★".slice(0, stars) + "☆☆☆☆☆".slice(0, 5 - stars);
    $("cpscore").textContent = r.passed + " of " + r.total + " checks";
    var cur = store.briefs[cp.brief]; var tag = r.passed + "/" + r.total;
    if (cur == null || +cur.split("/")[0] < r.passed) { store.briefs[cp.brief] = tag; save(); }
    if (Object.keys(store.briefs).length === 3) { store.said.s6 = true; save(); buildNav(); markNav(); }
  }
  function initCap() {
    seg($("cpbrief"), Object.keys(BRIEFS).map(function (k) { return { v: k, label: BRIEFS[k].label }; }), cp.brief, function (v) { cp.brief = v; cpRenderBrief(); });
    seg($("cpgpu"), GPU_OPTS, cp.gpu, function (v) { cp.gpu = v; });
    seg($("cpgpr"), [1, 2, 4, 8].map(function (n) { return { v: n, label: n + " GPU" + (n > 1 ? "s" : "") }; }), cp.gpr, function (v) { cp.gpr = +v; });
    $("cpn").oninput = function () { $("cpnv").textContent = $("cpn").value; };
    $("cpnv").textContent = $("cpn").value;
    seg($("cpmodel"), [{ v: "8b", label: "8B" }, { v: "70b", label: "70B" }], cp.model, function (v) { cp.model = v; });
    seg($("cpprec"), [{ v: "bf16", label: "BF16" }, { v: "fp8", label: "FP8" }, { v: "fp4", label: "FP4" }], cp.prec, function (v) { cp.prec = v; });
    $("cpgo").onclick = cpSubmit;
    cpRenderBrief();
  }

  /* ================= FIELD TEST ================= */
  var FT = [
    { ph: "e.g. 12", q: "Step 1: a 70B model, FP8 weights and FP8 tickets, 8K context, on <b>one H100</b>, with the 10% reserve <b>off</b>. How many diners fit?", a: function () { return IK.memory({ gpu: "h100-sxm", n: 1, model: "70b", wPrec: "fp8", kvPrec: "fp8", ctx: 8192 }).users; }, tol: 0 },
    { ph: "e.g. 40", q: "Step 1: the same setup (reserve off) on <b>one B200</b>. How many diners fit?", a: function () { return IK.memory({ gpu: "b200-sxm", n: 1, model: "70b", wPrec: "fp8", kvPrec: "fp8", ctx: 8192 }).users; }, tol: 0 },
    { ph: "e.g. 1500", q: "Step 1: the 671B DeepSeek-shaped MoE, FP8/FP8, 8K context, reserve off, on <b>8×B200</b>. How many diners fit? (within 2%)", a: function () { return IK.memory({ gpu: "b200-sxm", n: 8, model: "dsv3", wPrec: "fp8", kvPrec: "fp8", ctx: 8192 }).users; }, tol: 0.02 },
    { ph: "e.g. 120", q: "Step 2: 70B at FP8 on H100. At roughly what batch size does decode turn compute-bound? (within 10%)", a: function () { return IK.crossoverBatch({ gpu: "h100-sxm", model: "70b", wPrec: "fp8" }); }, tol: 0.1 },
    { ph: "e.g. 1.85", q: "Step 2: speculative decoding with α = 70%, k = 3, sous-chef cost 5%. What's the speedup? (e.g. 1.85)", a: function () { return IK.specDecode(0.7, 3, 0.05).speedup; }, tol: 0.025 },
    { ph: "% e.g. 48", q: "Step 5a: 4 GPUs at $3.00/hr, 5,000 tok/s when busy, API at $1.20/M. Break-even utilization, in %?", a: function () { return IK.breakevenUtil(3, 4, 5000, 1.2) * 100; }, tol: 0.02 },
    { ph: "e.g. 900K", q: "Step 5b: Tryon vs the <b>standard</b> tier with a <b>full</b> engineer. Break-even labels per day? (within 2%)", a: function () { return IK.tryonBreakevenPerDay(IK.TRYON.standard, IK.TRYON.fullEng); }, tol: 0.02 },
    { q: "Step 3: start from continuous batching with giant prompts on. Which single switch gives the highest <b>goodput</b>?", choice: ["Static batches", "Chunked prefill", "Disaggregation", "Prefix caching"], right: 2 }
  ];
  function initFT() {
    $("ftq").innerHTML = FT.map(function (f, i) {
      var input = f.choice ? '<select id="ft' + i + '"><option value="">choose…</option>' + f.choice.map(function (c, j) { return '<option value="' + j + '">' + c + "</option>"; }).join("") + "</select>"
        : '<input type="text" inputmode="decimal" id="ft' + i + '" aria-label="Answer ' + (i + 1) + '" placeholder="' + (f.ph || "") + '">';
      return '<div class="fq"><div class="fqt"><span class="num">' + (i + 1) + ".</span> " + f.q + "</div>" + input + '<span class="res" id="ftr' + i + '"></span></div>';
    }).join("");
    FT.forEach(function (f, i) { if (store.ft[i] != null) $("ft" + i).value = store.ft[i]; });
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) {
        var v = $("ft" + i).value, ok, truth;
        store.ft[i] = v;
        if (f.choice) { ok = v !== "" && +v === f.right; truth = f.choice[f.right]; }
        else { truth = f.a(); var sv = String(v).replace(/[,%$\s]/g, "").toUpperCase(), mult = /M$/.test(sv) ? 1e6 : /K$/.test(sv) ? 1e3 : 1; var n = parseFloat(sv) * mult; ok = !isNaN(n) && (f.tol === 0 ? n === truth : Math.abs(n - truth) <= Math.abs(truth) * f.tol); truth = fmt(truth, truth < 10 ? 2 : truth < 100 ? 1 : 0); }
        if (ok) score++;
        $("ftr" + i).innerHTML = v === "" ? '<span class="muted">skipped</span>' : ok ? '<span class="ok">✓ right</span>' : '<span class="bad">✗</span> <span class="muted">answer: ' + truth + "</span>";
      });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can serve a model." : "");
      if (score >= 6) { store.said.s7 = true; save(); buildNav(); markNav(); }
    };
    $("reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.hash = ""; location.reload(); };
  }

  function rebindTips(root) {
    qa(".g", root).forEach(function (el) {
      if (el.dataset.bound) return; el.dataset.bound = "1";
      el.tabIndex = 0;
      var tip = $("tip");
      function place() {
        var g = GL[el.dataset.g]; if (!g) return;
        tip.innerHTML = "<b>" + g[0] + "</b><br>" + g[1] + '<span class="kt">In the kitchen: ' + g[2] + "</span>"; tip.style.display = "block";
        var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8) + "px";
        var y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = r.top - h - 8; tip.style.top = Math.max(8, y) + "px";
      }
      el.addEventListener("mouseenter", place); el.addEventListener("focus", place);
      el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
      el.addEventListener("blur", function () { tip.style.display = "none"; });
      el.addEventListener("click", function (e) { e.stopPropagation(); place(); });
    });
  }

  function renderArt() {
    var A = window.IK_ART || {};
    qa(".scene[data-art]").forEach(function (el) { var svg = A[el.dataset.art]; if (svg && !el.firstChild) el.innerHTML = svg; });
  }

  /* ---------------- boot ---------------- */
  renderArt();
  qa(".kmap .k[data-i]").forEach(function (el) { el.innerHTML = ICONS[el.dataset.i] || ""; });
  buildNav();
  initTips();
  qa(".g").forEach(function (el) { el.dataset.bound = "1"; });
  initPredicts();
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5(); initCap(); initFT();
  sections.forEach(function (s) { checkSay(s.id); });
  var start = (location.hash || "").replace("#", "");
  show($(start) && $(start).tagName === "SECTION" ? start : "s0");
  window.IKApp = { cpEvaluate: cpEvaluate, s3params: s3params, show: show };
})();
