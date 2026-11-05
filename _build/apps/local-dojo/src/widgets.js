/* 本機道場 — 互動元件與工具
   每個元件：W.name(el, api)，api = { done, get, set, full, sfx, go, toast, copy } */
(function () {
  'use strict';
  const D = window.DOJO;
  const W = D.W = {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n, d = 1) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  D.util = { esc, clamp, fmt, rng };

  /* ───────── 硬體與估算模型 ───────── */
  const HW = D.HW = { vram: 24, usable: 22.5, over: 0.9, bwV: 896, bwR: 85, ramFree: 50, spark: { usable: 110, bw: 273 } };
  const QUANTS = D.QUANTS = [
    { k: 'FP16', b: 16, q: '原汁原味', s: 5 },
    { k: 'FP8', b: 8, q: '幾乎無損', s: 5 },
    { k: 'Q8_0', b: 8.5, q: '幾乎無損', s: 5 },
    { k: 'Q6_K', b: 6.56, q: '幾乎無損', s: 5 },
    { k: 'Q5_K_M', b: 5.69, q: '很好', s: 4 },
    { k: 'Q4_K_M', b: 4.85, q: '甜蜜點', s: 4 },
    { k: 'NVFP4', b: 4.5, q: '甜蜜點（新卡原生）', s: 4 },
    { k: 'MXFP4', b: 4.25, q: '甜蜜點（gpt-oss 原生）', s: 4 },
    { k: 'IQ4_XS', b: 4.25, q: '甜蜜點（更省）', s: 4 },
    { k: 'Q3_K_M', b: 3.91, q: '開始變笨', s: 2 },
    { k: 'Q2_K', b: 2.96, q: '明顯變笨', s: 1 }
  ];
  const Q = (k) => QUANTS.find((x) => x.k === k) || QUANTS[5];
  const KVP = D.KVP = [{ t: '很省（新架構）· 每 token 48KB', v: 48 }, { t: '省 · 64KB', v: 64 }, { t: '中 · 96KB', v: 96 }, { t: '一般 · 128KB', v: 128 }, { t: '重（舊架構）· 256KB', v: 256 }, { t: '很重 · 320KB', v: 320 }];
  /* 2026-11 的常見模型（大小為估算；以實際檔案為準） */
  const PRESETS = D.PRESETS = [
    { id: 'q38', t: 'Qwen3.8-27B', total: 27.8, active: 27.8, q: 'Q4_K_M', kv: 64, w: 18 },
    { id: 'q36moe', t: 'Qwen3.6-35B-A3B（MoE）', total: 36, active: 3, q: 'Q4_K_M', kv: 48, moe: 1, w: 20.4 },
    { id: 'g4moe', t: 'Gemma 4 26B-A4B（MoE）', total: 25.8, active: 3.8, q: 'Q4_K_M', kv: 64, moe: 1 },
    { id: 'g431', t: 'Gemma 4 31B', total: 31.3, active: 31.3, q: 'Q4_K_M', kv: 96 },
    { id: 'oss20', t: 'gpt-oss-20b（MoE）', total: 21, active: 3.6, q: 'MXFP4', kv: 48, moe: 1, w: 13.5 },
    { id: 'oss120', t: 'gpt-oss-120b（MoE）', total: 117, active: 5.1, q: 'MXFP4', kv: 48, moe: 1, w: 65 },
    { id: 'q3_8', t: 'Qwen3 8B', total: 8.2, active: 8.2, q: 'Q4_K_M', kv: 128 },
    { id: 'l70', t: 'Llama 3.3 70B', total: 70.6, active: 70.6, q: 'Q4_K_M', kv: 320 }
  ];
  function est(o) {
    const bpw = o.bpw || Q(o.q).b;
    const w = o.w || o.total * bpw / 8;
    const act = w * ((o.active || o.total) / o.total);
    const kv = (o.ctx || 8192) * (o.kv || 128) / 1048576;
    const moe = !!o.moe || (o.active && o.active < o.total * 0.6);
    const need = w + kv + HW.over;
    const availW = HW.usable - kv - HW.over;
    const fracV = availW >= w ? 1 : clamp(availW / w, 0, 1);
    const inRam = w * (1 - fracV);
    const ramOk = inRam <= HW.ramFree;
    const t = (act * fracV) / HW.bwV + (act * (1 - fracV)) / HW.bwR + kv / HW.bwV;
    const ceil = 1 / t;
    let eff = moe ? 0.42 : 0.7;
    if (fracV < 1) eff *= 0.85;
    const real = ramOk ? ceil * eff : 0;
    const sparkFits = need <= HW.spark.usable;
    const sCeil = HW.spark.bw / (act + kv);
    const sReal = sparkFits ? sCeil * (moe ? 0.4 : 0.68) : 0;
    return { w, act, kv, need, fracV, inRam, ramOk, ceil, real, sparkFits, sCeil, sReal, moe };
  }
  D.est = est;
  const verdictOf = (r) => {
    if (r.fracV >= 1) return { c: 'ok', t: '整個放進顯存', d: '全速，' + (r.real >= 20 ? '比你閱讀還快' : '可以用') };
    if (!r.ramOk) return { c: 'no', t: '跑不動', d: '連系統記憶體都不夠放' };
    if (r.fracV > 0.8) return { c: 'mid', t: '小幅溢出', d: '能跑，但會明顯變慢' };
    return { c: 'no', t: '大量溢出', d: '能跑，但慢到難以使用' };
  };
  D.verdictOf = verdictOf;

  /* ───────── 小工具 ───────── */
  function seg(opts, cur, cls = 'opts2') {
    return '<div class="' + cls + '">' + opts.map((o) => '<button data-v="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>').join('') + '</div>';
  }
  function lane(parts, total, caps) {
    let x = 0;
    const segs = parts.map((p) => { const w = clamp(p.v / total * 100, 0, 100 - x); const s = '<i style="left:' + x + '%;width:' + w + '%;background:' + p.c + '"></i>'; x += w; return s; }).join('');
    const cp = (caps || []).map((c) => '<b class="cap" style="left:' + clamp(c / total * 100, 0, 100) + '%"></b>').join('');
    return segs + cp;
  }

  /* ───────── 1-1 猜下一個字 ───────── */
  W.nextword = (el, api) => {
    const L1 = [['看見', 38], ['聞到', 24], ['聽見', 21], ['發現', 12], ['摸到', 5]];
    const L2 = {
      看見: [['一屋子的刀客', 36], ['滿地的碎瓷', 27], ['一盞將熄的燈', 22], ['師父的背影', 15]],
      聞到: [['濃重的血腥味', 44], ['剛溫好的酒香', 31], ['一絲熟悉的檀香', 17], ['雨水的土味', 8]],
      聽見: [['有人在磨刀', 39], ['一聲壓低的咳嗽', 28], ['樓上傳來琴聲', 21], ['自己的心跳', 12]],
      發現: [['掌櫃早已斷氣', 41], ['桌上留著一封信', 33], ['地上有一串濕腳印', 26]],
      摸到: [['門框上的刀痕', 55], ['一隻冰冷的手', 45]]
    };
    const L3 = [['。', 46], ['，握刀的手緊了緊。', 31], ['，卻笑了出來。', 23]];
    const pre = '魏子葳推開客棧的門，';
    let picks = [];
    const level = () => (picks.length === 0 ? L1 : picks.length === 1 ? L2[picks[0]] : picks.length === 2 ? L3 : null);
    function draw() {
      const opts = level();
      const sent = pre + picks.map((p, i) => (i === picks.length - 1 ? '<span class="nw">' + esc(p) + '</span>' : esc(p))).join('');
      el.innerHTML = '<div class="wt"><b>猜下一個詞塊</b>這是 AI 寫作的全部祕密</div>' +
        '<div class="sent">' + sent + (opts ? '<span class="cur" style="display:inline-block;width:8px;height:18px;background:var(--acc);vertical-align:-3px;animation:blink 1s steps(1) infinite"></span>' : '') + '</div>' +
        (opts ? '<div class="probs">' + opts.map((o) => '<button class="prob" data-w="' + esc(o[0]) + '"><i style="width:' + o[1] + '%"></i><span><b>' + esc(o[0]) + '</b><em>' + o[1] + '%</em></span></button>').join('') + '</div>' +
          '<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-a="auto">讓 AI 自己抽一個</button><span class="small">機率越高，越常被選中</span></div>'
          : '<div class="res"><b class="big">一句話寫完了</b>AI 寫小說就是這樣：每次只算「下一塊」的機率表，挑一個，接上去，再算下一塊。寫一整章，就是重複幾千次。</div><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-a="again">再寫一次</button></div>');
    }
    function pick(w) { picks.push(w); api.sfx('tick'); draw(); if (!level()) api.done(); }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.w) pick(b.dataset.w);
      else if (b.dataset.a === 'auto') { const o = level(); let r = Math.random() * 100, s = 0; for (const x of o) { s += x[1]; if (r <= s) { pick(x[0]); return; } } pick(o[0][0]); }
      else if (b.dataset.a === 'again') { picks = []; draw(); }
    });
    draw();
  };

  /* ───────── 1-2 工作檯 ───────── */
  W.workbench = (el, api) => {
    const M = [
      { n: '8B', t: 'Qwen3 8B', w: 5.2 }, { n: '14B', t: '14B 級', w: 9 }, { n: '27B', t: 'Qwen3.8-27B', w: 18 },
      { n: '35B-A3B', t: 'Qwen3.6 MoE', w: 20.4 }, { n: '70B', t: 'Llama 3.3 70B', w: 42.5 }, { n: '120B', t: 'gpt-oss-120b', w: 65 }
    ];
    let cur = 2;
    function draw() {
      const m = M[cur]; const need = m.w + 1.5;
      const inV = Math.min(need, HW.usable); const over = Math.max(0, need - HW.usable);
      const fits = over === 0; const sparkFits = need <= HW.spark.usable;
      el.innerHTML = '<div class="wt"><b>把模型搬上工作檯</b>（都以 Q4 量化、加 1.5GB 上下文與開銷計算）</div>' +
        seg(M.map((x, i) => [i, x.n]), cur) +
        '<div style="margin-top:14px" class="meter"><div class="small" style="margin-bottom:4px">你的顯存 24GB（工作檯）</div><div class="lane">' + lane([{ v: inV, c: fits ? 'var(--good)' : 'var(--acc)' }, { v: 24 - HW.usable, c: 'rgba(255,255,255,.18)' }], 24, [HW.usable]) + '<span>' + fmt(inV, 1) + ' GB</span></div><div class="legend"><span>灰色：Windows 和畫面自己用掉的</span><span>虛線：AI 可用上限</span></div></div>' +
        '<div class="meter" style="margin-top:8px"><div class="small" style="margin-bottom:4px">系統記憶體 64GB（備料區，慢 10 倍）</div><div class="lane">' + lane([{ v: 12, c: 'rgba(255,255,255,.18)' }, { v: over, c: 'var(--bad)' }], 64, []) + '<span>' + (over ? '溢出 ' + fmt(over, 1) + ' GB' : '沒用到') + '</span></div></div>' +
        '<div class="meter" style="margin-top:8px"><div class="small" style="margin-bottom:4px">對照：DGX Spark 128GB（統一記憶體）</div><div class="lane">' + lane([{ v: need, c: sparkFits ? 'var(--info)' : 'var(--bad)' }], 128, [HW.spark.usable]) + '<span>' + fmt(need, 1) + ' GB</span></div></div>' +
        '<div class="verdict ' + (fits ? 'ok' : over < 30 ? 'mid' : 'no') + '"><div class="tx"><b>' + esc(m.t) + '：' + (fits ? '整個放上工作檯，全速' : '有 ' + fmt(over, 1) + 'GB 要放到備料區') + '</b><span>' + (fits ? '廚師一路切到底，不用跑。' : '能跑，但廚師要一直跑去拿菜，會慢很多。') + (sparkFits ? ' DGX Spark 放得下。' : '') + '</span></div></div>';
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; cur = +b.dataset.v; api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 共用：程序生成的山水夜景 ───────── */
  function scene(w, h, seed) {
    const r = rng(seed * 7919 + 13);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const hues = [[16, 22, 52, 70, 40, 110], [28, 14, 50, 120, 40, 90], [8, 30, 44, 40, 90, 110], [34, 12, 30, 140, 60, 70]];
    const hu = hues[Math.floor(r() * hues.length)];
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, 'rgb(' + hu[0] + ',' + hu[1] + ',' + hu[2] + ')');
    sky.addColorStop(1, 'rgb(' + hu[3] + ',' + hu[4] + ',' + hu[5] + ')');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const mx = w * (0.15 + r() * 0.7), my = h * (0.16 + r() * 0.2), mr = h * (0.08 + r() * 0.05);
    const glow = g.createRadialGradient(mx, my, 0, mx, my, mr * 4);
    glow.addColorStop(0, 'rgba(255,240,200,.55)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
    for (let L = 0; L < 3; L++) {
      const base = h * (0.5 + L * 0.13), amp = h * (0.16 - L * 0.04), f1 = 1 + r() * 3, f2 = 3 + r() * 5, ph = r() * 7;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) { const y = base - amp * (0.6 * Math.sin(x / w * f1 * Math.PI + ph) + 0.4 * Math.sin(x / w * f2 * Math.PI + ph * 2)) * 0.5 - amp * 0.4; g.lineTo(x, y); }
      g.lineTo(w, h); g.closePath();
      const sh = 30 + L * 18; g.fillStyle = 'rgb(' + (hu[0] * 0.6 + sh * 0.3 | 0) + ',' + (hu[1] * 0.6 + sh * 0.35 | 0) + ',' + (hu[2] * 0.7 + sh * 0.5 | 0) + ')';
      g.globalAlpha = 0.65 + L * 0.15; g.fill(); g.globalAlpha = 1;
    }
    const ix = w * (0.2 + r() * 0.6), iy = h * 0.83, iw = w * 0.16, ih = h * 0.15;
    g.fillStyle = '#07080d';
    g.fillRect(ix - iw / 2, iy - ih, iw, ih);
    g.beginPath(); g.moveTo(ix - iw * 0.7, iy - ih); g.lineTo(ix, iy - ih * 1.7); g.lineTo(ix + iw * 0.7, iy - ih); g.closePath(); g.fill();
    for (const lx of [ix - iw * 0.32, ix + iw * 0.32]) {
      const lg = g.createRadialGradient(lx, iy - ih * 0.55, 0, lx, iy - ih * 0.55, h * 0.12);
      lg.addColorStop(0, 'rgba(255,150,60,.95)'); lg.addColorStop(0.25, 'rgba(255,110,40,.45)'); lg.addColorStop(1, 'rgba(255,110,40,0)');
      g.fillStyle = lg; g.fillRect(lx - h * 0.12, iy - ih * 0.55 - h * 0.12, h * 0.24, h * 0.24);
    }
    g.fillStyle = 'rgba(10,12,20,.9)'; g.fillRect(0, h * 0.86, w, h * 0.14);
    g.strokeStyle = 'rgba(190,210,255,.18)'; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 9); g.stroke(); }
    return g.getImageData(0, 0, w, h);
  }
  D.scene = scene;

  /* ───────── 1-3 量化壓縮器 ───────── */
  W.quant = (el, api) => {
    const P = [8, 14, 27, 32, 70];
    const QS = ['FP16', 'Q8_0', 'Q6_K', 'Q5_K_M', 'Q4_K_M', 'IQ4_XS', 'Q3_K_M', 'Q2_K'];
    const LV = { FP16: 256, Q8_0: 64, Q6_K: 28, Q5_K_M: 18, Q4_K_M: 12, IQ4_XS: 10, Q3_K_M: 6, Q2_K: 3 };
    let p = 2, qi = 4;
    const W0 = 320, H0 = 180; let base = null;
    el.innerHTML = '<div class="wt"><b>量化壓縮器</b>左右拖，看檔案大小和「畫質」怎麼變</div>' +
      '<canvas width="' + W0 + '" height="' + H0 + '"></canvas><div class="small" style="margin:6px 0 12px">示意圖：位元越少，能表達的層次越少，最後出現色塊。</div>' +
      '<div class="fld"><label>模型大小</label><div data-k="p"></div></div>' +
      '<div class="fld"><label>量化等級 <b data-o="qn"></b></label><input type="range" min="0" max="' + (QS.length - 1) + '" step="1" value="' + qi + '"></div>' +
      '<div data-o="out"></div>';
    const cv = $('canvas', el), g = cv.getContext('2d');
    base = scene(W0, H0, 7);
    const pz = $('[data-k=p]', el);
    function paint() {
      const L = LV[QS[qi]]; const src = base.data; const img = g.createImageData(W0, H0); const d = img.data;
      for (let i = 0; i < src.length; i += 4) {
        for (let c = 0; c < 3; c++) { const v = src[i + c]; d[i + c] = L >= 256 ? v : Math.round(Math.round(v / 255 * (L - 1)) / (L - 1) * 255); }
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    function draw() {
      pz.innerHTML = seg(P.map((x, i) => [i, x + 'B']), p);
      const q = Q(QS[qi]); const size = P[p] * q.b / 8; const need = size + 1.5; const fits = need <= HW.usable;
      $('[data-o=qn]', el).textContent = q.k + '（約 ' + q.b + ' 位元）';
      $('[data-o=out]', el).innerHTML = '<div class="kv"><div><small>檔案大小</small><b>' + fmt(size, 1) + ' GB</b></div><div><small>品質</small><b style="font-size:15px">' + '★★★★★'.slice(0, q.s) + '<span style="opacity:.25">' + '★★★★★'.slice(q.s) + '</span> ' + esc(q.q) + '</b></div></div>' +
        '<div class="verdict ' + (fits ? 'ok' : 'no') + '"><div class="tx"><b>' + P[p] + 'B × ' + q.b + ' ÷ 8 ≈ ' + fmt(size, 1) + ' GB</b><span>' + (fits ? '加上下文約 ' + fmt(need, 1) + 'GB，塞得進你的 22.5GB。' : '加上下文約 ' + fmt(need, 1) + 'GB，超過 22.5GB，會溢出。') + '</span></div></div>';
      paint();
    }
    el.addEventListener('input', (e) => { if (e.target.type === 'range') { qi = +e.target.value; draw(); api.done(); } });
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; p = +b.dataset.v; api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 1-4 速度體感 ───────── */
  const STORY = '魏子葳推開客棧的門，雨水順著斗笠的邊緣滴落。掌櫃抬頭看了他一眼，又低下頭去撥算盤，像是什麼也沒看見。角落裡坐著三個刀客，桌上的酒已經涼了，卻沒有人去碰。他在靠窗的位子坐下，要了一壺熱茶。窗外的燈籠被風吹得左右搖晃，光影在地上來回拉扯。他知道，今夜這間客棧裡，至少有一個人是衝著他來的。';
  W.speed = (el, api) => {
    const presets = [
      { t: '5090 筆電 · 27B', f: () => est({ total: 27.8, q: 'Q4_K_M', kv: 64, w: 18 }).real },
      { t: 'DGX Spark · 27B', f: () => est({ total: 27.8, q: 'Q4_K_M', kv: 64, w: 18 }).sReal },
      { t: '5090 筆電 · 35B-A3B', f: () => est({ total: 36, active: 3, q: 'Q4_K_M', kv: 48, moe: 1, w: 20.4 }).real },
      { t: '5090 筆電 · 70B（溢出）', f: () => est({ total: 70.6, q: 'Q4_K_M', kv: 320 }).real }
    ];
    let tps = presets[0].f(), raf = 0, on = -1;
    el.innerHTML = '<div class="wt"><b>速度體感</b>點一個，看它實際吐字的速度</div>' +
      '<div class="opts2" data-k="ps">' + presets.map((p, i) => '<button data-i="' + i + '">' + esc(p.t) + '</button>').join('') + '</div>' +
      (api.full ? '<div class="fld" style="margin-top:12px"><label>自訂速度 <b data-o="tv"></b></label><input type="range" min="1" max="150" step="1" value="35"></div>' : '') +
      '<div class="kv" style="margin:12px 0"><div><small>速度</small><b data-o="t">—</b></div><div><small>寫完這段要</small><b data-o="s">—</b></div></div>' +
      '<div class="stream" data-o="st"><span class="dim">按上面的按鈕開始</span></div>';
    const st = $('[data-o=st]', el);
    function play(v) {
      cancelAnimationFrame(raf); tps = v;
      const cps = v * 1.3; const total = STORY.length; const t0 = performance.now();
      $('[data-o=t]', el).textContent = fmt(v, 0) + ' tok/s';
      $('[data-o=s]', el).textContent = fmt(total / cps, 1) + ' 秒';
      const tick = (now) => {
        const n = Math.min(total, Math.floor((now - t0) / 1000 * cps));
        st.innerHTML = esc(STORY.slice(0, n)) + (n < total ? '<span class="cur"></span>' : '');
        if (n < total && el.isConnected) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      api.done();
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      on = +b.dataset.i; $$('[data-k=ps] button', el).forEach((x, i) => x.classList.toggle('on', i === on));
      api.sfx('tick'); play(presets[on].f());
    });
    el.addEventListener('input', (e) => { if (e.target.type === 'range') { const v = +e.target.value; $('[data-o=tv]', el).textContent = v + ' tok/s'; $$('[data-k=ps] button', el).forEach((x) => x.classList.remove('on')); play(v); } });
    if (api.full) $('[data-o=tv]', el).textContent = '35 tok/s';
  };

  /* ───────── 2-1 引擎配對 ───────── */
  W.engine = (el, api) => {
    const E = ['LM Studio', 'Ollama', 'vLLM', 'llama.cpp'];
    const S = [
      ['我想像逛串流平台一樣，瀏覽、下載、比較各種模型', 0, '有圖形介面、內建模型搜尋與下載，最適合逛和比較。'],
      ['我想讓 Claude Code 寫的小程式，在背景呼叫本機 AI', 1, 'Ollama 常駐背景，程式打 localhost:11434 就能用。'],
      ['公司 200 人要同時用同一台 AI 伺服器', 2, 'vLLM 擅長同時處理大量請求，是伺服器等級的引擎。'],
      ['我想直接下指令、調最底層的參數、搶先用最新功能', 3, 'llama.cpp 是 Ollama 和 LM Studio 的底層核心。']
    ];
    const ans = {};
    function draw() {
      el.innerHTML = '<div class="wt"><b>情境配對</b>每個情境該用哪個引擎？</div>' + S.map((s, i) => {
        const a = ans[i];
        return '<div class="li" style="margin-bottom:8px"><div class="q" style="margin-bottom:8px">' + esc(s[0]) + '</div><div class="opts2">' +
          E.map((e, j) => '<button data-s="' + i + '" data-e="' + j + '"' + (a != null ? ' disabled' : '') + ' style="' + (a != null && j === s[1] ? 'border-color:var(--good);color:var(--good)' : a === j && j !== s[1] ? 'border-color:var(--bad);color:var(--bad)' : '') + '">' + e + '</button>').join('') +
          '</div>' + (a != null ? '<div class="small" style="margin-top:8px">' + (a === s[1] ? '✓ ' : '✗ 答案是 ' + E[s[1]] + '。') + esc(s[2]) + '</div>' : '') + '</div>';
      }).join('');
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-s]'); if (!b) return;
      const i = +b.dataset.s; if (ans[i] != null) return; ans[i] = +b.dataset.e;
      api.sfx(ans[i] === S[i][1] ? 'good' : 'bad'); draw();
      if (Object.keys(ans).length === S.length) api.done();
    });
    draw();
  };

  /* ───────── 2-2 熱門模型塞不塞得下 ───────── */
  W.fitlist = (el, api) => {
    const CT = [4096, 8192, 16384, 32768, 65536, 131072];
    let ci = 1;
    const list = PRESETS.filter((p) => ['q38', 'q36moe', 'g4moe', 'g431', 'oss20', 'q3_8'].includes(p.id));
    function draw() {
      const ctx = CT[ci];
      el.innerHTML = '<div class="wt"><b>2026-11 熱門模型，塞不塞得下？</b>（大小為估算）</div>' +
        '<div class="fld"><label>上下文長度 <b>' + (ctx / 1024) + 'K tokens</b></label><input type="range" min="0" max="' + (CT.length - 1) + '" value="' + ci + '"></div>' +
        list.map((m) => {
          const r = est(Object.assign({ ctx }, m)); const v = verdictOf(r);
          return '<div class="meter" style="margin-bottom:10px"><div class="row" style="justify-content:space-between;font-size:13.5px;margin-bottom:4px"><b>' + esc(m.t) + '</b><span class="mono" style="color:' + (v.c === 'ok' ? 'var(--good)' : v.c === 'mid' ? '#ffaa3c' : 'var(--bad)') + '">' + esc(v.t) + (r.real ? ' · 約 ' + fmt(r.real, 0) + ' tok/s' : '') + '</span></div><div class="lane">' +
            lane([{ v: r.w, c: 'var(--acc)' }, { v: r.kv, c: 'var(--violet)' }, { v: HW.over, c: 'rgba(255,255,255,.25)' }], 32, [HW.usable]) + '<span>' + fmt(r.w, 1) + ' + ' + fmt(r.kv, 1) + ' GB</span></div></div>';
        }).join('') + '<div class="legend small" style="display:flex;gap:14px;flex-wrap:wrap"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--acc)"></i> 模型</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--violet)"></i> 上下文（KV 快取）</span><span>虛線：你可用的 22.5GB</span></div>';
    }
    el.addEventListener('input', (e) => { if (e.target.type === 'range') { ci = +e.target.value; draw(); api.done(); } });
    draw();
  };

  /* ───────── 2-3 溫度 ───────── */
  W.temp = (el, api) => {
    const pre = '那一夜，魏子葳終於明白，';
    const LG = [['他', 2.4], ['自己', 2.0], ['師父', 1.5], ['這座城', 1.0], ['所謂江湖', 0.8], ['月亮', 0.0], ['豆花', -0.8], ['微積分', -1.6]];
    let T = 0.8, tally = null;
    const probs = () => { const ex = LG.map((x) => Math.exp(x[1] / T)); const s = ex.reduce((a, b) => a + b, 0); return ex.map((v) => v / s); };
    function draw() {
      const p = probs();
      el.innerHTML = '<div class="wt"><b>溫度實驗室</b>同一張機率表，溫度一變就換了個性</div>' +
        '<div class="sent">' + esc(pre) + '<span class="nw">＿＿</span></div>' +
        '<div class="fld"><label>溫度 <b>' + fmt(T, 1) + '</b></label><input type="range" min="0.1" max="2" step="0.1" value="' + T + '"></div>' +
        '<div class="probs">' + LG.map((x, i) => '<div class="prob"><i style="width:' + (p[i] * 100) + '%"></i><span><b>' + esc(x[0]) + '</b><em>' + fmt(p[i] * 100, 1) + '%</em></span></div>').join('') + '</div>' +
        '<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-a="s">抽 10 次</button><span class="small">' + (T < 0.4 ? '低溫：幾乎只會挑「他」' : T > 1.4 ? '高溫：連「微積分」都可能被抽到' : '中溫：有主見，也有變化') + '</span></div>' +
        (tally ? '<div class="res"><b class="big">抽出來的結果</b>' + tally.map((w) => '<span class="chip" style="margin:2px">' + esc(w) + '</span>').join('') + '</div>' : '');
    }
    el.addEventListener('input', (e) => { if (e.target.type === 'range') { T = +e.target.value; tally = null; draw(); } });
    el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-a=s]')) return;
      const p = probs(); tally = [];
      for (let k = 0; k < 10; k++) { let r = Math.random(), s = 0; for (let i = 0; i < p.length; i++) { s += p[i]; if (r <= s) { tally.push(LG[i][0]); break; } } }
      api.sfx('tick'); draw(); api.done();
    });
    draw();
  };

  /* ───────── 2-4 Modelfile 產生器 ───────── */
  W.modelfile = (el, api) => {
    const d = Object.assign({ base: 'qwen3.8:27b', name: 'wei-editor', temp: 0.7, ctx: 16384, sys: '你是嚴格但公正的小說編輯。一律用繁體中文與台灣用語回覆。先指出最嚴重的三個問題，再給一段改寫示範。不要客套稱讚，除非真的寫得好。' }, api.get('mf', {}));
    const out = () => 'FROM ' + d.base + '\nPARAMETER temperature ' + d.temp + '\nPARAMETER num_ctx ' + d.ctx + '\nSYSTEM """' + d.sys.replace(/"""/g, '”””') + '"""';
    el.innerHTML = '<div class="wt"><b>角色卡產生器</b>填好，就會產生 Modelfile 和指令</div>' +
      '<div class="grid2"><div class="fld"><label>底模名稱（ollama list 看到的）</label><input class="inp" data-f="base"></div><div class="fld"><label>角色名稱（英文小寫）</label><input class="inp" data-f="name"></div></div>' +
      '<div class="grid2"><div class="fld"><label>溫度 <b data-o="tv"></b></label><input type="range" min="0" max="1.5" step="0.1" data-f="temp"></div><div class="fld"><label>上下文長度</label><select class="inp" data-f="ctx"><option value="8192">8K</option><option value="16384">16K</option><option value="32768">32K</option></select></div></div>' +
      '<div class="fld"><label>系統提示（角色與規則）</label><textarea class="note" data-f="sys"></textarea></div>' +
      '<div class="prompt"><div class="ph"><span class="grow">Modelfile</span><button class="btn sm" data-a="cp">複製</button></div><pre data-o="mf"></pre></div>' +
      '<div class="prompt" style="margin-top:10px"><div class="ph"><span class="grow">建立與使用的指令</span></div><pre data-o="cmd"></pre></div>' +
      '<div class="small" style="margin-top:8px">這張卡會自動帶進下方「實作」的指令裡。</div>';
    $$('[data-f]', el).forEach((f) => { f.value = d[f.dataset.f]; });
    function draw() {
      $('[data-o=tv]', el).textContent = fmt(+d.temp, 1);
      $('[data-o=mf]', el).textContent = out();
      $('[data-o=cmd]', el).textContent = 'ollama create ' + d.name + ' -f Modelfile\nollama run ' + d.name;
      api.set('mf', d); api.set('modelfile', out() + '\n\n（建立指令：ollama create ' + d.name + ' -f Modelfile）');
    }
    el.addEventListener('input', (e) => { const f = e.target.dataset.f; if (!f) return; d[f] = f === 'temp' || f === 'ctx' ? +e.target.value : e.target.value.trim() || d[f]; draw(); api.done(); });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-a=cp]')) { api.copy(out()); api.done(); } });
    draw();
  };

  /* ───────── 3-1 雜訊雕刻 ───────── */
  W.denoise = (el, api) => {
    const W0 = 320, H0 = 200;
    let seed = 42, steps = 0, cfg = 7, lock = false, raf = 0;
    const cache = {};
    el.innerHTML = '<div class="wt"><b>雜訊雕刻機</b>擦掉雜訊，圖就浮現</div><canvas width="' + W0 + '" height="' + H0 + '"></canvas>' +
      '<div class="row" style="margin:10px 0"><button class="btn sm" data-a="play">▶ 從雜訊開始擦</button><button class="btn ghost sm" data-a="seed">換一個 seed</button><button class="btn ghost sm" data-a="lock">🔓 鎖定 seed</button><span class="mono small" data-o="sd"></span></div>' +
      '<div class="fld"><label>Steps（擦幾次）<b data-o="st"></b></label><input type="range" min="0" max="30" step="1" data-k="steps"></div>' +
      '<div class="fld"><label>CFG（多聽提示詞的話）<b data-o="cf"></b></label><input type="range" min="1" max="15" step="0.5" data-k="cfg"></div>' +
      '<div class="res" data-o="ex" style="margin-top:4px"></div>';
    const cv = $('canvas', el), g = cv.getContext('2d');
    const bstep = (img, b) => { const w = img.width, h = img.height, s = img.data, o = new Uint8ClampedArray(s.length); for (let y = 0; y < h; y += b) for (let x = 0; x < w; x += b) { let r = 0, gg = 0, bb = 0, n = 0; for (let yy = y; yy < Math.min(h, y + b); yy++) for (let xx = x; xx < Math.min(w, x + b); xx++) { const i = (yy * w + xx) * 4; r += s[i]; gg += s[i + 1]; bb += s[i + 2]; n++; } r /= n; gg /= n; bb /= n; for (let yy = y; yy < Math.min(h, y + b); yy++) for (let xx = x; xx < Math.min(w, x + b); xx++) { const i = (yy * w + xx) * 4; o[i] = r; o[i + 1] = gg; o[i + 2] = bb; o[i + 3] = 255; } } return o; };
    function get(sd) {
      if (cache[sd]) return cache[sd];
      const full = scene(W0, H0, sd); const r = rng(sd * 31 + 7); const nz = new Uint8ClampedArray(full.data.length);
      for (let i = 0; i < nz.length; i += 4) { const v = r() * 255; nz[i] = v * (0.7 + r() * 0.6); nz[i + 1] = v * (0.7 + r() * 0.6); nz[i + 2] = v * (0.7 + r() * 0.6); nz[i + 3] = 255; }
      return (cache[sd] = { full: full.data, b16: bstep(full, 20), b6: bstep(full, 7), nz });
    }
    function render() {
      const c = get(seed), p = steps / 30, img = g.createImageData(W0, H0), d = img.data;
      const e = 1 - Math.pow(1 - p, 2.2);
      const sA = p < 0.45 ? c.b16 : p < 0.8 ? c.b6 : c.full, sB = p < 0.45 ? c.b6 : c.full;
      const k = p < 0.45 ? p / 0.45 : p < 0.8 ? (p - 0.45) / 0.35 : 1;
      const con = cfg < 4 ? 0.45 + cfg * 0.13 : 1 + Math.max(0, cfg - 8) * 0.16;
      const sat = cfg < 4 ? 0.35 + cfg * 0.15 : 1 + Math.max(0, cfg - 8) * 0.22;
      for (let i = 0; i < d.length; i += 4) {
        let r = sA[i] + (sB[i] - sA[i]) * k, gg = sA[i + 1] + (sB[i + 1] - sA[i + 1]) * k, b = sA[i + 2] + (sB[i + 2] - sA[i + 2]) * k;
        const l = (r + gg + b) / 3; r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
        r = (r - 110) * con + 110; gg = (gg - 110) * con + 110; b = (b - 110) * con + 110;
        d[i] = c.nz[i] * (1 - e) + r * e; d[i + 1] = c.nz[i + 1] * (1 - e) + gg * e; d[i + 2] = c.nz[i + 2] * (1 - e) + b * e; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      $('[data-o=st]', el).textContent = steps; $('[data-o=cf]', el).textContent = cfg; $('[data-o=sd]', el).textContent = 'seed ' + seed;
      $('[data-k=steps]', el).value = steps; $('[data-k=cfg]', el).value = cfg;
      const ex = steps < 5 ? '還是一片雜訊：AI 才剛開始猜「這裡大概是天空、那裡大概是山」。' : steps < 14 ? '大輪廓出來了：先決定構圖和色塊，細節還沒有。' : steps < 24 ? '細節慢慢浮現：每一步都把「不像提示詞」的雜點擦掉。' : '完成。再擦下去差別不大，只是浪費時間。';
      const ec = cfg > 11 ? '<br><b>CFG 太高</b>：太聽話了，顏色過飽和、對比爆掉，像燒焦。' : cfg < 3.5 ? '<br><b>CFG 太低</b>：不太聽提示詞，畫面灰灰的、沒有主見。' : '';
      $('[data-o=ex]', el).innerHTML = ex + ec;
    }
    function play() {
      cancelAnimationFrame(raf); steps = 0; const t0 = performance.now();
      const tick = (now) => { steps = Math.min(30, Math.floor((now - t0) / 70)); render(); if (steps < 30 && el.isConnected) raf = requestAnimationFrame(tick); else api.done(); };
      raf = requestAnimationFrame(tick);
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; api.sfx('tick');
      if (b.dataset.a === 'play') play();
      if (b.dataset.a === 'seed') { if (lock) { api.toast('seed 已鎖定，構圖不會變。先解鎖再換。'); return; } seed = 1 + Math.floor(Math.random() * 9999); steps = 30; render(); api.done(); }
      if (b.dataset.a === 'lock') { lock = !lock; b.textContent = lock ? '🔒 已鎖定' : '🔓 鎖定 seed'; b.classList.toggle('on', lock); }
    });
    el.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; cancelAnimationFrame(raf); if (k === 'steps') steps = +e.target.value; else cfg = +e.target.value; render(); api.done(); });
    render();
  };

  /* ───────── 3-2 組裝產線 ───────── */
  W.nodes = (el, api) => {
    const N = [
      { id: 'model', t: '載入模型', s: 'Load Checkpoint', d: [] },
      { id: 'pos', t: '正向提示詞', s: 'CLIP Text Encode', d: ['model'] },
      { id: 'neg', t: '反向提示詞', s: 'CLIP Text Encode', d: ['model'] },
      { id: 'latent', t: '空白潛空間', s: 'Empty Latent Image', d: [] },
      { id: 'ks', t: 'KSampler 取樣器', s: 'KSampler', d: ['model', 'pos', 'neg', 'latent'] },
      { id: 'vae', t: 'VAE 解碼', s: 'VAE Decode', d: ['ks'] },
      { id: 'save', t: '儲存圖片', s: 'Save Image', d: ['vae'] }
    ];
    const by = Object.fromEntries(N.map((n) => [n.id, n]));
    let order = [], shuf = N.slice().sort(() => Math.random() - 0.5);
    function draw() {
      const done = order.length === N.length;
      el.innerHTML = '<div class="wt"><b>組一條出圖產線</b>依照資料流動的順序點積木（有些積木順序可以互換）</div>' +
        '<div class="nodesgrid">' + shuf.map((n) => '<button class="nd' + (order.includes(n.id) ? ' used' : '') + '" data-n="' + n.id + '"><small>' + esc(n.s) + '</small>' + esc(n.t) + '</button>').join('') + '</div>' +
        '<div class="chain">' + (order.length ? order.map((id, i) => (i ? '<span class="ar">→</span>' : '') + '<span class="cn">' + esc(by[id].t) + '</span>').join('') : '<span class="hint">點上面的積木，開始組裝……</span>') + '</div>' +
        (done ? '<div class="res"><b class="big">產線完成！</b>模型＋提示詞＋空白潛空間 → KSampler 一步步擦雜訊 → VAE 解碼成圖片 → 存檔。ComfyUI 的每一張圖，都是這樣流出來的。<canvas width="320" height="180" style="margin-top:10px"></canvas></div><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-a="re">再組一次</button></div>' : '');
      if (done) { const c = $('.res canvas', el); c.getContext('2d').putImageData(scene(320, 180, 1 + Math.floor(Math.random() * 999)), 0, 0); }
    }
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-a=re]')) { order = []; shuf = N.slice().sort(() => Math.random() - 0.5); draw(); return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      const n = by[b.dataset.n]; const miss = n.d.filter((x) => !order.includes(x));
      if (miss.length) { api.sfx('bad'); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); api.toast('「' + n.t + '」還需要：' + miss.map((x) => by[x].t).join('、')); return; }
      order.push(n.id); api.sfx(order.length === N.length ? 'win' : 'tick'); draw(); if (order.length === N.length) api.done();
    });
    draw();
  };

  /* ───────── 3-3 提示詞產生器 ───────── */
  W.prompt = (el, api) => {
    const C = [
      ['主體', [['一名黑衣劍客', 'a swordsman in black robes'], ['一位紅衣女俠', 'a heroine in a flowing red robe'], ['年輕將軍魏子葳', 'Wei Ziwei, a young general in worn armor'], ['一隻機械白狐', 'a mechanical white fox']]],
      ['動作', [['站在門口回頭', 'standing at the doorway, glancing back'], ['拔劍出鞘', 'drawing his sword'], ['在雨中奔跑', 'running through the rain'], ['坐在屋頂喝酒', 'sitting on a rooftop drinking wine']]],
      ['場景', [['雨夜的客棧', 'outside an old inn on a rainy night'], ['邊關城牆上', 'on a frontier fortress wall'], ['霓虹巷弄裡', 'in a neon-lit alley'], ['竹林深處', 'deep in a bamboo forest']]],
      ['光線', [['燈籠暖光', 'warm lantern light'], ['冷色月光', 'cold moonlight'], ['逆光剪影', 'backlit silhouette'], ['電影感打光', 'cinematic lighting']]],
      ['鏡頭', [['低角度仰拍', 'low-angle shot'], ['臉部特寫', 'close-up portrait'], ['全身遠景', 'full-body wide shot'], ['俯拍', 'high-angle shot']]],
      ['風格', [['寫實攝影', 'photorealistic'], ['水墨畫', 'Chinese ink painting'], ['日式動畫', 'anime style'], ['美漫賽璐璐', 'American comic cel-shaded'], ['像素風', 'pixel art']]]
    ];
    const sel = Object.assign({}, api.get('psel', { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }));
    const zh = () => { const v = C.map((c, i) => c[1][sel[i]][0]); return v[0] + v[1] + '，' + v[2] + '，' + v[3] + '，' + v[4] + '，' + v[5]; };
    const en = () => C.map((c, i) => c[1][sel[i]][1]).join(', ');
    function draw() {
      el.innerHTML = '<div class="wt"><b>提示詞產生器</b>主體＋動作＋場景＋光線＋鏡頭＋風格</div>' +
        C.map((c, i) => '<div class="fld"><label>' + c[0] + '</label><div class="opts2">' + c[1].map((o, j) => '<button data-c="' + i + '" data-o="' + j + '"' + (sel[i] === j ? ' class="on"' : '') + '>' + esc(o[0]) + '</button>').join('') + '</div></div>').join('') +
        '<div class="prompt"><div class="ph"><span class="grow">中文提示詞（Z-Image、Qwen-Image 都看得懂）</span><button class="btn sm" data-a="zh">複製</button></div><pre>' + esc(zh()) + '</pre></div>' +
        '<div class="prompt" style="margin-top:8px"><div class="ph"><span class="grow">英文版（給只吃英文的模型）</span><button class="btn ghost sm" data-a="en">複製</button></div><pre>' + esc(en()) + '</pre></div>';
      api.set('psel', sel); api.set('prompt', zh());
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.c != null) { sel[b.dataset.c] = +b.dataset.o; api.sfx('tick'); draw(); api.done(); }
      if (b.dataset.a === 'zh') { api.copy(zh()); api.done(); }
      if (b.dataset.a === 'en') { api.copy(en()); api.done(); }
    });
    draw();
  };

  /* ───────── 3-4 影片預算 ───────── */
  W.videobudget = (el, api) => {
    const M = [
      { k: 'wan5', t: 'Wan 2.2 · 5B', b: [4, 9] },
      { k: 'wan14', t: 'Wan 2.2 · 14B（FP8）', b: [10, 25] },
      { k: 'hun', t: 'HunyuanVideo 1.5', b: [6, 15] },
      { k: 'ltx', t: 'LTX-2', b: [2, 6] }
    ];
    let mi = 0, sec = 5, res = '720';
    function draw() {
      const cal = api.get('vcal', {}); const m = M[mi]; const f = (sec / 5) * (res === '720' ? 1 : 0.4);
      const mine = cal[m.k];
      const lo = mine ? mine * 0.85 * f : m.b[0] * f, hi = mine ? mine * 1.15 * f : m.b[1] * f;
      const n1 = Math.floor(480 / hi), n2 = Math.floor(480 / lo);
      el.innerHTML = '<div class="wt"><b>影片預算計算機</b>' + (mine ? '已用你的實測校正' : '粗估：以 24GB 顯示卡的常見回報為準') + '</div>' +
        '<div class="fld" data-g="m"><label>模型</label>' + seg(M.map((x, i) => [i, x.t]), mi) + '</div>' +
        '<div class="grid2"><div class="fld"><label>長度 <b>' + sec + ' 秒（' + (sec * 24 + 1) + ' 格）</b></label><input type="range" min="2" max="10" value="' + sec + '" data-k="sec"></div><div class="fld" data-g="r"><label>解析度</label>' + seg([['480', '480p'], ['720', '720p']], res) + '</div></div>' +
        '<div class="kv"><div><small>一段大約要</small><b>' + fmt(lo, 0) + '～' + fmt(hi, 0) + ' 分</b></div><div><small>一晚 8 小時能跑</small><b>' + n1 + '～' + n2 + ' 段</b></div></div>' +
        '<div class="fld" style="margin-top:14px"><label>校正：我用這個模型跑 720p、5 秒，實際花了幾分鐘？</label><div class="row"><input class="inp grow" type="number" min="0.5" step="0.5" placeholder="例如 7" data-k="cal" value="' + (mine || '') + '" style="max-width:160px"><button class="btn ghost sm" data-a="cal">存下來</button></div></div>';
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.v != null) { const grp = b.closest('[data-g]'); if (grp && grp.dataset.g === 'm') mi = +b.dataset.v; else res = b.dataset.v; api.sfx('tick'); draw(); api.done(); }
      if (b.dataset.a === 'cal') { const v = parseFloat($('[data-k=cal]', el).value); if (v > 0) { const c = api.get('vcal', {}); c[M[mi].k] = v; api.set('vcal', c); api.toast('已用你的實測校正 ' + M[mi].t); draw(); api.done(); } }
    });
    el.addEventListener('input', (e) => { if (e.target.dataset.k === 'sec') { sec = +e.target.value; draw(); api.done(); } });
    draw();
  };

  /* ───────── 4-1 開書考試 ───────── */
  const BOOK = [
    '魏子葳十二歲拜入青崖山，師父是隱居的老劍客沈孤舟，只教他一招「斷水」。',
    '黑水城三年前因為瘟疫謠言被朝廷封城，城門至今只在每月初一開啟一個時辰。',
    '魏子葳最怕的不是死，而是聽見鈴鐺聲，那是他母親被帶走那一夜的聲音。',
    '沈孤舟早年是禁軍教頭，因為拒絕對百姓拔刀而被貶，從此隱居山中。',
    '黑水城的城主姓霍，表面仁厚，暗中卻與北方馬賊做私鹽生意。',
    '「斷水」講究先退半步，誘敵出手，再反手斬出，魏子葳整整練了六年。',
    '客棧「半盞燈」是城裡唯一徹夜營業的地方，掌櫃是個啞巴。',
    '魏子葳左手腕有一道舊疤，是十五歲那年替師父擋下的一刀。'
  ];
  const STOP = new Set(['什麼', '為什', '是誰', '的是', '是什', '哪裡', '怎麼', '嗎？', '麼？', '誰？', '呢？']);
  const bg = (s) => { const t = s.replace(/[，。「」？！、：\s]/g, ''); const o = new Set(); for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); if (!STOP.has(b)) o.add(b); } return o; };
  W.rag = (el, api) => {
    const QS = [
      ['魏子葳的師父是誰？', '魏子葳的師父是隱居的老劍客沈孤舟（出自第 1 段）。'],
      ['黑水城為什麼被封城？', '因為三年前的瘟疫謠言，被朝廷封城（出自第 2 段）。'],
      ['魏子葳最怕什麼？', '他最怕聽見鈴鐺聲，那是母親被帶走那一夜的聲音（出自第 3 段）。'],
      ['魏子葳喜歡吃什麼？', '資料裡沒有提到魏子葳喜歡吃什麼，所以我不知道。（陷阱題：雖然找到了跟他有關的段落，但裡面沒有答案。好的系統要老實說不知道，而不是亂編。）']
    ];
    let q = null, ans = '';
    const B = BOOK.map(bg);
    function run(text, preset) {
      const qb = bg(text); const sc = B.map((b, i) => { let n = 0; qb.forEach((x) => { if (b.has(x)) n++; }); return { i, s: qb.size ? n / qb.size : 0 }; });
      const top = sc.slice().sort((a, b) => b.s - a.s).slice(0, 2).filter((x) => x.s > 0);
      q = { text, sc, top: top.map((x) => x.i) };
      ans = preset || (top.length ? '（示意）AI 只會根據這 ' + top.length + ' 段回答。如果這幾段裡沒有答案，好的系統會說「不知道」。' : '一段都沒找到。好的系統會回答：「資料裡沒有相關內容。」');
      api.sfx('tick'); draw(); api.done();
    }
    function draw() {
      el.innerHTML = '<div class="wt"><b>開書考試模擬器</b>一本 8 段的小設定集，看 AI 怎麼翻書</div>' +
        '<div class="opts2">' + QS.map((x, i) => '<button data-q="' + i + '">' + esc(x[0]) + '</button>').join('') + '</div>' +
        '<div class="row" style="margin-top:8px"><input class="inp grow" data-k="cq" placeholder="或自己問一題"><button class="btn sm" data-a="go">檢索</button></div>' +
        '<div class="list" style="margin-top:12px">' + BOOK.map((t, i) => {
          const s = q ? q.sc[i].s : 0, hit = q && q.top.includes(i);
          return '<div class="li" style="padding:10px 12px;' + (hit ? 'border-color:var(--acc);background:color-mix(in srgb,var(--acc) 9%,transparent)' : q ? 'opacity:.5' : '') + '"><div class="h"><span class="mono">第 ' + (i + 1) + ' 段</span>' + (q ? '<span class="grow"></span><span class="mono">相似度 ' + fmt(s * 100, 0) + '%</span>' + (hit ? '<span class="chip acc">選中</span>' : '') : '') + '</div><div style="font-size:14px">' + esc(t) + '</div></div>';
        }).join('') + '</div>' +
        (q ? '<details class="stuck" style="margin-top:10px"><summary>看看實際交給 AI 的提示詞</summary><div class="it"><pre style="white-space:pre-wrap;font:13px/1.7 var(--mono);margin:0">【系統】只根據下面的資料回答；資料裡沒有就說不知道。\n【資料】\n' + esc(q.top.map((i) => '（第 ' + (i + 1) + ' 段）' + BOOK[i]).join('\n') || '（沒有找到相關段落）') + '\n【問題】' + esc(q.text) + '</pre></div></details>' +
          '<div class="res"><b class="big">AI 的回答</b>' + esc(ans) + '</div>' : '');
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.q != null) run(QS[+b.dataset.q][0], QS[+b.dataset.q][1]);
      if (b.dataset.a === 'go') { const v = $('[data-k=cq]', el).value.trim(); if (v) run(v); }
    });
    draw();
  };
  D.bg = bg;

  /* ───────── 4-2 意思地圖 ───────── */
  W.semmap = (el, api) => {
    const P = [
      ['魏子葳拔劍', 20, 25, 0], ['他抽出了長劍', 25, 31, 0], ['刀光劈開雨幕', 13, 36, 0], ['兩人過了三十招', 30, 20, 0], ['一拳打碎門板', 14, 16, 0],
      ['她偷偷看了他一眼', 62, 22, 1], ['他把傘留給了她', 68, 30, 1], ['心跳漏了一拍', 57, 33, 1], ['那封沒寄出的信', 65, 13, 1],
      ['黑水城每月初一開城', 24, 72, 2], ['霍城主暗中販私鹽', 35, 82, 2], ['青崖山在城北三百里', 15, 88, 2],
      ['今天股市大漲', 74, 75, 3], ['晚餐吃拉麵', 68, 88, 3], ['明天會下雨', 80, 66, 3]
    ];
    const CL = ['#ff6b6b', '#ff8ad8', '#4aa8ff', '#8a90a6'], CN = ['打鬥城', '感情城', '設定城', '無關的話'];
    const QY = [
      ['他揮刀砍向敵人', 18, 29, '「他揮刀砍向敵人」和「魏子葳拔劍」幾乎沒有相同的字，但意思相近，所以被找出來了。'],
      ['她其實喜歡他', 62, 27, '問題裡沒有「傘」「信」「心跳」，但嵌入模型知道它們都在講感情。'],
      ['黑水城的地理與歷史', 25, 80, '「地理與歷史」這種概括的問法，也能找到具體的設定段落。'],
      ['輝達股價', 76, 79, '「輝達股價」跟你的小說毫無關係，它最近的鄰居是無關的閒聊。如果知識庫沒有設門檻，AI 可能會拿這些不相干的段落硬湊答案。']
    ];
    const Y = 0.82; let qi = -1;
    function draw() {
      let near = [];
      if (qi >= 0) { const q = QY[qi]; near = P.map((p, i) => ({ i, d: Math.hypot(p[1] - q[1], p[2] - q[2]) })).sort((a, b) => a.d - b.d).slice(0, 3); }
      const svg = '<svg viewBox="0 0 100 ' + (100 * Y) + '" class="scatter">' +
        [0, 1, 2, 3].map((c) => { const pts = P.filter((p) => p[3] === c); const cx = pts.reduce((a, p) => a + p[1], 0) / pts.length, cy = pts.reduce((a, p) => a + p[2], 0) / pts.length * Y; return '<circle cx="' + (cx + 4) + '" cy="' + cy + '" r="15" fill="' + CL[c] + '" opacity=".07"/><text x="' + (cx + 4) + '" y="' + (cy - 12) + '" font-size="3.3" fill="' + CL[c] + '" text-anchor="middle" opacity=".9">' + CN[c] + '</text>'; }).join('') +
        (qi >= 0 ? near.map((n) => '<line x1="' + QY[qi][1] + '" y1="' + QY[qi][2] * Y + '" x2="' + P[n.i][1] + '" y2="' + P[n.i][2] * Y + '" stroke="#ffd23f" stroke-width=".5" stroke-dasharray="1.2 .8"/>').join('') : '') +
        P.map((p, i) => '<circle cx="' + p[1] + '" cy="' + p[2] * Y + '" r="' + (near.some((n) => n.i === i) ? 1.7 : 1.15) + '" fill="' + CL[p[3]] + '"/><text x="' + (p[1] + 2) + '" y="' + (p[2] * Y + 0.9) + '" font-size="2.5" fill="' + (near.some((n) => n.i === i) ? '#fff' : '#b8bdd0') + '">' + esc(p[0]) + '</text>').join('') +
        (qi >= 0 ? '<path transform="translate(' + QY[qi][1] + ' ' + QY[qi][2] * Y + ') scale(.18)" d="M0 -12 L3.5 -3.5 L12 -3.5 L5 2 L7.5 11 L0 5.5 L-7.5 11 L-5 2 L-12 -3.5 L-3.5 -3.5 Z" fill="#ffd23f" stroke="#000" stroke-width="1"/>' : '') + '</svg>';
      el.innerHTML = '<div class="wt"><b>意思地圖</b>示意圖：每句話都被釘在「意思」的座標上</div>' +
        '<div class="opts2" style="margin-bottom:10px">' + QY.map((q, i) => '<button data-q="' + i + '"' + (qi === i ? ' class="on"' : '') + '>問：' + esc(q[0]) + '</button>').join('') + '</div>' + svg +
        (qi >= 0 ? '<div class="res"><b class="big">★「' + esc(QY[qi][0]) + '」最近的三個鄰居</b>' + near.map((n) => '・' + esc(P[n.i][0])).join('<br>') + '<br><br>' + esc(QY[qi][3]) + '</div>' : '<div class="small" style="margin-top:8px">點上面的問題，看它會被釘在哪裡（★）、找到哪些鄰居。</div>');
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (!b) return; qi = +b.dataset.q; api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 4-3 三題驗收卡 ───────── */
  W.verify3 = (el, api) => {
    const T = [['事實題', '資料裡明寫的事', '例：魏子葳的師父是誰？'], ['綜合題', '要結合兩段以上', '例：魏子葳手上的疤，跟他師父有什麼關係？'], ['陷阱題', '資料裡根本沒有', '例：魏子葳喜歡吃什麼？（應該回答不知道）']];
    const v = api.get('v3', [{}, {}, {}]);
    function draw() {
      const all = v.every((x) => x.r);
      const ok = v.filter((x) => x.r === 'ok').length;
      el.innerHTML = '<div class="wt"><b>三題驗收卡</b>寫下你要問知識庫的三題，做完把結果記在這裡</div>' +
        T.map((t, i) => '<div class="li" style="margin-bottom:8px"><div class="h"><span class="chip acc">' + t[0] + '</span><span>' + t[1] + '</span></div><textarea class="note" style="min-height:64px" data-i="' + i + '" placeholder="' + esc(t[2]) + '">' + esc(v[i].q || '') + '</textarea><div class="opts2" style="margin-top:8px">' +
          [['ok', '✓ 答對'], ['part', '△ 部分對'], ['bad', '✗ 答錯／亂編']].map((o) => '<button data-r="' + i + '" data-v="' + o[0] + '"' + (v[i].r === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>').join('') + '</div></div>').join('') +
        (all ? '<div class="res"><b class="big">可靠度：' + (ok === 3 ? '可以信任' : v[2].r === 'bad' ? '會亂編，要修' : '還要調整') + '</b>' + (v[2].r === 'bad' ? '陷阱題亂編，代表它不會說不知道。到工作區的系統提示加上「資料裡沒有就說不知道」，並把溫度調低。' : ok === 3 ? '三種題目都過關，這個知識庫可以開始日常使用了。' : '找出答錯的那題：先看它引用的段落對不對（檢索問題），再看段落對了卻答錯（模型問題）。') + '</div>' : '');
    }
    el.addEventListener('input', (e) => { const i = e.target.dataset.i; if (i == null) return; v[i].q = e.target.value; api.set('v3', v); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; v[+b.dataset.r].r = b.dataset.v; api.set('v3', v); api.sfx('tick'); draw(); if (v.every((x) => x.r)) api.done(); });
    draw();
  };

  /* ───────── 4-4 選路 ───────── */
  W.route = (el, api) => {
    const QS = [['你的資料量？', [['short', '很短（幾萬字內）'], ['long', '很多（幾十萬字以上）']]], ['你想要的是？', [['know', '讓它知道內容（事實、設定）'], ['style', '讓它換一種說話方式（文風、格式）'], ['both', '兩者都要']]], ['資料多久更新一次？', [['still', '幾乎不變'], ['often', '常常更新']]]];
    const a = {};
    function result() {
      if (a[1] === 'style') return ['微調', '要改的是「習慣」，屬於微調。不過先試試：寫好系統提示＋給 3～5 個範例，常常就夠了；真的不夠再練。'];
      if (a[1] === 'both') return ['RAG ＋ 微調', 'RAG 管事實（設定、劇情），微調管文風。兩者可以疊在一起用。'];
      if (a[0] === 'short') return ['直接放進上下文', '資料短，整份貼進去最準也最省事。' + (a[2] === 'often' ? '常更新也沒關係，每次貼最新版就好。' : '')];
      return ['RAG 知識庫', '資料多' + (a[2] === 'often' ? '、又常更新' : '') + '，用 RAG：改了檔案重新匯入就好，還能附上出處。'];
    }
    function draw() {
      const all = QS.every((_, i) => a[i]);
      el.innerHTML = '<div class="wt"><b>選路器</b>回答三題，告訴你該走哪條路</div>' +
        QS.map((q, i) => '<div class="fld"><label>' + (i + 1) + '. ' + q[0] + '</label><div class="opts2">' + q[1].map((o) => '<button data-i="' + i + '" data-v="' + o[0] + '"' + (a[i] === o[0] ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>').join('') + '</div></div>').join('') +
        (all ? (() => { const r = result(); return '<div class="res"><b class="big">建議：' + r[0] + '</b>' + esc(r[1]) + '</div>'; })() : '');
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; a[b.dataset.i] = b.dataset.v; api.sfx('tick'); draw(); if (QS.every((_, i) => a[i])) api.done(); });
    draw();
  };

  /* ───────── 5-1 過擬合曲線 ───────── */
  W.overfit = (el, api) => {
    let s = 1500;
    const like = (x) => 1 - Math.exp(-x / 900);
    const flex = (x) => (x < 2200 ? 0.95 - 0.05 * (x / 2200) : 0.9 * Math.exp(-(x - 2200) / 1500));
    el.innerHTML = '<div class="wt"><b>訓練步數模擬</b>拖動滑桿，找到甜蜜點</div><canvas width="640" height="260"></canvas>' +
      '<div class="fld" style="margin-top:10px"><label>訓練步數 <b data-o="s"></b></label><input type="range" min="0" max="5000" step="50" value="' + s + '"></div><div data-o="o"></div>';
    const cv = $('canvas', el), g = cv.getContext('2d');
    function draw() {
      const W0 = 640, H0 = 260, px = (x) => 40 + x / 5000 * 580, py = (y) => 230 - y * 200;
      g.fillStyle = '#04050a'; g.fillRect(0, 0, W0, H0);
      g.fillStyle = 'rgba(62,224,143,.07)'; g.fillRect(px(1200), 20, px(2800) - px(1200), 210);
      g.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(40, py(i / 4)); g.lineTo(620, py(i / 4)); g.stroke(); }
      const line = (f, c) => { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= 5000; x += 50) { const X = px(x), Y = py(f(x)); x ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); };
      line(like, '#ffd23f'); line(flex, '#4aa8ff'); line((x) => like(x) * flex(x), '#3ee08f');
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(px(s), 20); g.lineTo(px(s), 230); g.stroke(); g.setLineDash([]);
      g.font = '600 13px sans-serif'; g.fillStyle = '#ffd23f'; g.fillText('像不像', 46, 36); g.fillStyle = '#4aa8ff'; g.fillText('靈活度', 110, 36); g.fillStyle = '#3ee08f'; g.fillText('綜合', 174, 36);
      g.fillStyle = '#9aa0b6'; g.fillText('甜蜜點', px(1720), 250);
      const L = like(s), F = flex(s);
      const st = s < 1200 ? ['太早', '還不太像魏子葳，五官會飄。', ['正面', 1], ['側面', 0], ['奔跑', 1], ['雪地', 1]] : s <= 2800 ? ['甜蜜點', '像，而且換姿勢、換場景都還行。這就是你要挑的存檔點。', ['正面', 1], ['側面', 1], ['奔跑', 1], ['雪地', 1]] : ['過擬合', '很像，但不管寫什麼都生出差不多的姿勢和背景。', ['正面', 1], ['側面', 0], ['奔跑', 0], ['雪地', 0]];
      $('[data-o=s]', el).textContent = s + ' 步';
      $('[data-o=o]', el).innerHTML = '<div class="kv"><div><small>像不像</small><b>' + fmt(L * 100, 0) + '%</b></div><div><small>靈活度</small><b>' + fmt(F * 100, 0) + '%</b></div></div>' +
        '<div class="verdict ' + (st[0] === '甜蜜點' ? 'ok' : st[0] === '太早' ? 'mid' : 'no') + '"><div class="tx"><b>' + st[0] + '</b><span>' + st[1] + '</span></div></div>' +
        '<div class="small" style="margin-top:8px">試著下這些提示詞：' + st.slice(2).map((x) => '<span class="chip ' + (x[1] ? 'ok' : '') + '" style="margin:2px">' + x[0] + (x[1] ? ' ✓' : ' ✗') + '</span>').join('') + '</div>';
    }
    el.addEventListener('input', (e) => { if (e.target.type === 'range') { s = +e.target.value; draw(); api.done(); } });
    draw();
  };

  /* ───────── 5-2 資料集健康度 ───────── */
  W.dataset = (el, api) => {
    const A = [['front', '正面特寫'], ['side', '側面'], ['back', '背面／回頭'], ['half', '半身'], ['full', '全身']];
    const V = [['expr', '表情種類'], ['bgs', '背景種類'], ['cloth', '服裝種類']];
    const c = Object.assign({ front: 0, side: 0, back: 0, half: 0, full: 0, expr: 0, bgs: 0, cloth: 0 }, api.get('ds', {}));
    function score() {
      const tot = A.reduce((a, x) => a + c[x[0]], 0); const tips = []; let s = 0;
      if (tot >= 20 && tot <= 40) s += 30; else if (tot >= 12) { s += 15; tips.push(tot < 20 ? '總數再補到 20 張以上。' : '超過 40 張不一定更好，先確保每張都夠像。'); } else tips.push('總數太少，至少 20 張。');
      if (c.front >= 4) s += 15; else tips.push('正面特寫至少 4 張，臉要清楚。');
      if (c.side >= 3) s += 10; else tips.push('補幾張側面，不然 AI 不知道他側臉長怎樣。');
      if (c.half + c.full >= 8) s += 10; else tips.push('半身＋全身加起來至少 8 張，才學得到身形和服裝。');
      if (c.back >= 1) s += 5; else tips.push('來一兩張背面或回頭，動作會更自然。');
      if (c.expr >= 3) s += 10; else tips.push('表情至少 3 種（笑、怒、冷）。');
      if (c.bgs >= 4) s += 10; else tips.push('背景至少 4 種，否則背景會被一起學進去。');
      if (c.cloth >= 2) s += 10; else tips.push('服裝至少 2 套，臉才不會跟某件衣服綁死。');
      return { tot, s, tips };
    }
    function draw() {
      const r = score();
      el.innerHTML = '<div class="wt"><b>資料集健康檢查</b>挑完圖後，數一數每一類有幾張</div>' +
        '<div class="small" style="margin-bottom:6px">張數（依角度）</div><div class="cks2">' + A.map((x) => '<div class="cnt2"><span class="grow">' + x[1] + '</span><button data-k="' + x[0] + '" data-d="-1">−</button><b>' + c[x[0]] + '</b><button data-k="' + x[0] + '" data-d="1">＋</button></div>').join('') + '</div>' +
        '<div class="small" style="margin:12px 0 6px">多樣性（有幾種）</div><div class="cks2">' + V.map((x) => '<div class="cnt2"><span class="grow">' + x[1] + '</span><button data-k="' + x[0] + '" data-d="-1">−</button><b>' + c[x[0]] + '</b><button data-k="' + x[0] + '" data-d="1">＋</button></div>').join('') + '</div>' +
        '<div class="meter" style="margin-top:14px"><div class="row" style="justify-content:space-between;font-size:13.5px;margin-bottom:4px"><b>健康度</b><span class="mono">' + r.s + ' / 100 · 共 ' + r.tot + ' 張</span></div><div class="bar"><i style="width:' + r.s + '%;--c:' + (r.s >= 80 ? 'var(--good)' : r.s >= 50 ? '#ffaa3c' : 'var(--bad)') + '"></i></div></div>' +
        (r.tips.length ? '<div class="res" style="margin-top:12px"><b class="big">' + (r.s >= 80 ? '幾乎完美' : '還可以更好') + '</b>' + r.tips.map((t) => '・' + esc(t)).join('<br>') + '</div>' : '<div class="res"><b class="big">資料集很健康！</b>可以開始訓練了。</div>');
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; c[b.dataset.k] = Math.max(0, c[b.dataset.k] + (+b.dataset.d)); api.set('ds', c); api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 5-3 訓練資料格式 ───────── */
  W.jsonl = (el, api) => {
    const d = Object.assign({ instruction: '把這段描寫改寫成寫實、殘酷、有臨場感的小說文字。', input: '兩軍交戰，很多人死了，魏子葳很難過。', output: '箭雨落下的那一刻，魏子葳身旁的少年兵還在笑。下一瞬，那張臉被釘在泥裡，嘴還張著。魏子葳沒有回頭，他只是握緊了刀，指節白得發青。' }, api.get('jl', {}));
    const set = api.get('jlset', []);
    const line = () => JSON.stringify({ instruction: d.instruction, input: d.input, output: d.output });
    function warn() { const w = []; if (!d.instruction.trim()) w.push('指令是空的'); if (!d.output.trim()) w.push('輸出是空的'); if (d.output.trim().length < 30) w.push('輸出太短，模型學不到東西'); if (d.input.trim() && d.input.trim() === d.output.trim()) w.push('輸入和輸出一樣，等於沒教'); return w; }
    el.innerHTML = '<div class="wt"><b>示範題工坊</b>寫一筆示範，看它變成訓練資料和「模型眼中的樣子」</div>' +
      '<div class="fld"><label>指令 instruction</label><input class="inp" data-f="instruction"></div>' +
      '<div class="fld"><label>輸入 input（平淡的原文）</label><textarea class="note" style="min-height:64px" data-f="input"></textarea></div>' +
      '<div class="fld"><label>輸出 output（你滿意的版本）</label><textarea class="note" data-f="output"></textarea></div>' +
      '<div data-o="w"></div>' +
      '<div class="prompt"><div class="ph"><span class="grow">JSONL 的一行（一筆示範）</span></div><pre data-o="j" style="font-family:var(--mono);font-size:12.5px"></pre></div>' +
      '<details class="stuck"><summary>模型實際看到的樣子（Qwen 類模型的對話格式）</summary><div class="it"><pre data-o="t" style="white-space:pre-wrap;font:12.5px/1.7 var(--mono);margin:0"></pre><div class="small" style="margin-top:6px">不同模型的格式不一樣，Unsloth 會自動幫你轉。你只要專心寫好示範。</div></div></details>' +
      '<div class="row" style="margin-top:12px"><button class="btn sm" data-a="add">加入我的示範集</button><button class="btn ghost sm" data-a="cp">複製全部 JSONL</button><span class="small" data-o="n"></span></div>';
    $$('[data-f]', el).forEach((f) => { f.value = d[f.dataset.f]; });
    function draw() {
      const w = warn();
      $('[data-o=w]', el).innerHTML = w.length ? '<div class="verdict mid" style="margin:0 0 10px"><div class="tx"><b>注意</b><span>' + w.map(esc).join('；') + '</span></div></div>' : '';
      $('[data-o=j]', el).textContent = line();
      $('[data-o=t]', el).textContent = '<|im_start|>system\n你是小說寫作助手。<|im_end|>\n<|im_start|>user\n' + d.instruction + '\n\n' + d.input + '<|im_end|>\n<|im_start|>assistant\n' + d.output + '<|im_end|>';
      $('[data-o=n]', el).textContent = '已收集 ' + set.length + ' 筆' + (set.length >= 100 ? '，可以訓練了！' : '，目標 100 筆');
      api.set('jl', d);
    }
    el.addEventListener('input', (e) => { const f = e.target.dataset.f; if (!f) return; d[f] = e.target.value; draw(); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'add') { if (warn().length) { api.sfx('bad'); api.toast('先修正上面的提醒再加入'); return; } set.push({ instruction: d.instruction, input: d.input, output: d.output }); api.set('jlset', set); api.sfx('good'); api.toast('加入第 ' + set.length + ' 筆示範'); draw(); api.done(); }
      if (b.dataset.a === 'cp') { if (!set.length) { api.toast('示範集還是空的'); return; } api.copy(set.map((x) => JSON.stringify(x)).join('\n')); }
    });
    draw();
  };

  /* ───────── 5-4 值不值得練 ───────── */
  W.worth = (el, api) => {
    const S = [['這件事一年會重複幾十到上百次', 2], ['需要固定的外觀、格式或口吻', 2], ['寫好提示詞＋範例，還是做不到', 2], ['我有夠多品質好的素材（20 張圖或 100 筆示範以上）', 1], ['我其實只是想讓 AI「知道」某些資料', -3], ['需求還在一直變', -2]];
    const on = api.get('worth', {});
    function draw() {
      const sc = S.reduce((a, s, i) => a + (on[i] ? s[1] : 0), 0);
      const r = sc >= 4 ? ['值得練', '重複、固定、提示詞做不到，而且有素材，正是微調的主場。'] : sc >= 1 ? ['先試提示詞＋範例', '還不急著練。先把提示詞寫好、給 3～5 個範例，不夠再升級成 LoRA。'] : ['不值得練', on[4] ? '你要的是「知識」，用 RAG 或直接貼上就好。' : '需求還沒穩定，或用提示詞就能解決，先不要花時間訓練。'];
      el.innerHTML = '<div class="wt"><b>值不值得練？</b>勾選符合你需求的描述</div>' +
        S.map((s, i) => '<button class="ck' + (on[i] ? ' on' : '') + '" data-i="' + i + '" style="margin-bottom:8px"><span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12l5 5 9-10"/></svg></span><span>' + esc(s[0]) + '</span></button>').join('') +
        '<div class="res"><b class="big">' + r[0] + '</b>' + esc(r[1]) + '</div>';
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; on[b.dataset.i] = !on[b.dataset.i]; api.set('worth', on); api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 6-1 Agent 循環 ───────── */
  W.agentloop = (el, api) => {
    const L = [
      ['th', '想：我得先知道資料夾裡有什麼檔案。'], ['dd', '做：呼叫工具 list_files("C:\\AI\\projects\\art")'], ['ss', '看到：40 個檔案，38 張 PNG、2 個 .txt。'],
      ['th', '想：只處理圖片，跳過文字檔。先確認有沒有縮圖用的套件。'], ['dd', '做：呼叫工具 run("python -c \'import PIL\'")'], ['ss', '看到：錯誤，找不到 PIL 模組。'],
      ['th', '想：要裝 Pillow，這是很小的套件，可以直接裝。'], ['dd', '做：呼叫工具 run("pip install pillow")'], ['ss', '看到：安裝成功。'],
      ['th', '想：寫一個小腳本批次縮圖，輸出到 small 資料夾。'], ['dd', '做：write_file("resize.py") → run("python resize.py")'], ['ss', '看到：38 張完成，0 張失敗。'],
      ['fin', '完成：38 張圖已縮成 512 寬，存在 small 資料夾；2 個文字檔略過。']
    ];
    let n = 0, t = 0;
    function draw() {
      el.innerHTML = '<div class="wt"><b>Agent 的腦內實況</b>任務：「把 art 資料夾的圖縮成 512 寬」</div>' +
        '<div class="term">' + L.slice(0, n).map((x) => '<span class="ln ' + x[0] + '">' + esc(x[1]) + '</span>').join('') + (n < L.length ? '<span class="cur" style="display:inline-block;width:8px;height:15px;background:var(--acc);animation:blink 1s steps(1) infinite"></span>' : '') + '</div>' +
        '<div class="row" style="margin-top:10px">' + (n < L.length ? '<button class="btn sm" data-a="n">下一步</button><button class="btn ghost sm" data-a="auto">自動播放</button>' : '<button class="btn ghost sm" data-a="re">重來</button>') + '<span class="small">紫色＝想、藍色＝做（工具呼叫）、綠色＝看到結果</span></div>' +
        (n >= L.length ? '<div class="res"><b class="big">注意它遇到錯誤時</b>它沒有停下來，而是「看到錯誤 → 想辦法 → 再試」。這就是 Agent 跟一般聊天 AI 最大的差別。</div>' : '');
    }
    function step() { if (n < L.length) { n++; api.sfx('tick'); draw(); const tm = $('.term', el); if (tm) tm.scrollTop = tm.scrollHeight; if (n === L.length) { clearInterval(t); api.done(); } } }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'n') step();
      if (b.dataset.a === 'auto') { clearInterval(t); t = setInterval(() => { if (!el.isConnected) return clearInterval(t); step(); }, 650); }
      if (b.dataset.a === 're') { clearInterval(t); n = 0; draw(); }
    });
    draw();
  };

  /* ───────── 6-2 插座算術 ───────── */
  W.mcp = (el, api) => {
    let A = 3, T = 4, on = true;
    const AI = ['Claude Code', 'LM Studio', 'AnythingLLM', 'Cursor', '自製工具', 'Open WebUI'], TL = ['檔案', '瀏覽器', 'GitHub', 'ComfyUI', '資料庫', 'Slack', '行事曆', 'Blender', 'Figma', '搜尋'];
    function draw() {
      const H = Math.max(A, T) * 9 + 16, ys = (n, i) => 8 + (H - 16) * (n === 1 ? 0.5 : i / (n - 1)), XL = 28, XR = 72;
      let lines = '';
      if (on) { for (let i = 0; i < A; i++) lines += '<line x1="' + XL + '" y1="' + ys(A, i) + '" x2="50" y2="' + H / 2 + '" stroke="#3ee08f" stroke-width=".6"/>'; for (let j = 0; j < T; j++) lines += '<line x1="50" y1="' + H / 2 + '" x2="' + XR + '" y2="' + ys(T, j) + '" stroke="#3ee08f" stroke-width=".6"/>'; }
      else for (let i = 0; i < A; i++) for (let j = 0; j < T; j++) lines += '<line x1="' + XL + '" y1="' + ys(A, i) + '" x2="' + XR + '" y2="' + ys(T, j) + '" stroke="#ff5468" stroke-width=".4" opacity=".8"/>';
      const svg = '<svg viewBox="0 0 100 ' + H + '" class="scatter">' + lines +
        Array.from({ length: A }, (_, i) => '<circle cx="' + XL + '" cy="' + ys(A, i) + '" r="2.2" fill="#b27cff"/><text x="' + (XL - 3.5) + '" y="' + (ys(A, i) + 1.1) + '" font-size="3" fill="#d9c3ff" text-anchor="end">' + AI[i] + '</text>').join('') +
        Array.from({ length: T }, (_, j) => '<circle cx="' + XR + '" cy="' + ys(T, j) + '" r="2.2" fill="#4aa8ff"/><text x="' + (XR + 3.5) + '" y="' + (ys(T, j) + 1.1) + '" font-size="3" fill="#bfe0ff">' + TL[j] + '</text>').join('') +
        (on ? '<rect x="43" y="' + (H / 2 - 5) + '" width="14" height="10" rx="2.5" fill="#3ee08f"/><text x="50" y="' + (H / 2 + 1.3) + '" font-size="3.6" text-anchor="middle" fill="#0b0b0b" font-weight="800">MCP</text>' : '') + '</svg>';
      el.innerHTML = '<div class="wt"><b>插座算術</b>有沒有統一標準，差多少？</div>' +
        '<div class="grid2"><div class="fld"><label>AI 數量 <b>' + A + '</b></label><input type="range" min="1" max="6" value="' + A + '" data-k="A"></div><div class="fld"><label>工具數量 <b>' + T + '</b></label><input type="range" min="1" max="10" value="' + T + '" data-k="T"></div></div>' +
        seg([['1', '有 MCP'], ['0', '沒有 MCP']], on ? '1' : '0') + '<div style="margin-top:10px">' + svg + '</div>' +
        '<div class="kv"><div><small>沒有 MCP：要寫的轉接</small><b style="color:var(--bad)">' + A * T + ' 套</b></div><div><small>有 MCP：要做的介面</small><b style="color:var(--good)">' + (A + T) + ' 個</b></div></div>';
    }
    el.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; if (k === 'A') A = +e.target.value; else T = +e.target.value; draw(); api.done(); });
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; on = b.dataset.v === '1'; api.sfx('tick'); draw(); api.done(); });
    draw();
  };

  /* ───────── 6-3 顯存排程 ───────── */
  W.pipeline = (el, api) => {
    let mode = 'seq';
    function draw() {
      const llm = 18, img = 13, sim = mode === 'sim';
      const peak = sim ? llm + img : Math.max(llm, img);
      const over = Math.max(0, peak - HW.usable);
      const bars = sim
        ? [['寫提示詞', 0, 10, llm + img], ['出 12 張圖', 10, 100, llm + img]]
        : [['寫提示詞', 0, 10, llm], ['卸載', 10, 12, 0.5], ['出 12 張圖', 12, 100, img]];
      el.innerHTML = '<div class="wt"><b>顯存排程模擬</b>語言模型 ' + llm + 'GB ＋ 出圖模型 ' + img + 'GB</div>' + seg([['seq', '依序（用完就卸載）'], ['sim', '兩個同時開著']], mode) +
        '<div class="tl" style="margin-top:14px">' + bars.map((b) => '<div class="tr"><span class="small">' + b[0] + '</span><div class="tk"><i style="left:' + b[1] + '%;width:' + (b[2] - b[1]) + '%;background:' + (b[3] > HW.usable ? 'var(--bad)' : b[3] < 1 ? 'rgba(255,255,255,.3)' : 'var(--good)') + '">' + (b[3] < 1 ? '' : fmt(b[3], 0) + 'GB') + '</i></div></div>').join('') + '</div>' +
        '<div class="verdict ' + (over ? 'no' : 'ok') + '"><div class="tx"><b>' + (over ? '爆了：同時需要 ' + peak + 'GB，超出 ' + fmt(over, 1) + 'GB' : '順利：最高只用 ' + peak + 'GB') + '</b><span>' + (over ? '超出的部分溢到系統記憶體，出圖可能慢上好幾倍，甚至直接報錯 out of memory。' : '語言模型寫完提示詞就卸載（keep_alive 設 0），把整塊顯存讓給出圖模型。') + '</span></div></div>';
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; mode = b.dataset.v; api.sfx(mode === 'sim' ? 'bad' : 'good'); draw(); api.done(); });
    draw();
  };

  /* ───────── 6-4 畢業專題 ───────── */
  W.grad = (el, api) => {
    const G = [['A', 'A｜遊戲美術工作室', 'wzw_hero LoRA ＋ 素材流水線，替一款遊戲量產立繪和道具，再交給 Claude Code 放進遊戲。'], ['B', 'B｜小說工作室', '設定集知識庫 ＋ wei-editor 審稿 ＋ wei-writer 文風，寫一章並自動檢查設定矛盾。'], ['C', 'C｜影片工作室', '本機模型寫分鏡 → 出圖 → 圖生影片 → 剪成 30 秒預告。']];
    const s = api.get('gradsel', { k: '', custom: '' });
    const text = () => (s.k === 'X' ? s.custom : (G.find((g) => g[0] === s.k) || [])[1] + '：' + ((G.find((g) => g[0] === s.k) || [])[2] || ''));
    function draw() {
      el.innerHTML = '<div class="wt"><b>選你的畢業專題</b>選好會自動帶進實作指令</div><div class="pick">' +
        G.map((g) => '<button data-k="' + g[0] + '"' + (s.k === g[0] ? ' class="on"' : '') + '><b>' + g[1] + '</b>' + esc(g[2]) + '</button>').join('') +
        '<button data-k="X"' + (s.k === 'X' ? ' class="on"' : '') + '><b>自己出題</b>寫下你想做的本機 AI 專題</button></div>' +
        (s.k === 'X' ? '<textarea class="note" style="margin-top:8px" data-f="c" placeholder="例如：把我的 YouTube 腳本自動做成分鏡圖">' + esc(s.custom) + '</textarea>' : '');
      if (s.k) api.set('grad', text());
    }
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; s.k = b.dataset.k; api.set('gradsel', s); api.sfx('tick'); draw(); api.done(); });
    el.addEventListener('input', (e) => { if (e.target.dataset.f === 'c') { s.custom = e.target.value; api.set('gradsel', s); api.set('grad', s.custom); } });
    draw();
  };

  /* ═════════ 工具頁 ═════════ */
  W.vramTool = (el, api) => {
    const pre = api.get('calcIn', null);
    const st = Object.assign({ p: 'q38', total: 27.8, active: 27.8, moe: false, q: 'Q4_K_M', ctx: 8192, kv: 64, w: 18 }, pre || {});
    if (pre) api.set('calcIn', null);
    const CT = [2048, 4096, 8192, 16384, 32768, 65536, 131072];
    el.innerHTML = '<div class="fld"><label>選一個模型（2026-11 常見款，或自訂）</label><select class="inp" data-f="p">' + PRESETS.map((p) => '<option value="' + p.id + '">' + esc(p.t) + '</option>').join('') + '<option value="custom">自訂</option></select></div>' +
      '<div class="grid2"><div class="fld"><label>總參數（B）</label><input class="inp" type="number" min="0.5" step="0.1" data-f="total"></div><div class="fld"><label>每次啟用（B）<span class="small">MoE 才不同</span></label><input class="inp" type="number" min="0.5" step="0.1" data-f="active"></div></div>' +
      '<div class="fld"><label>量化</label><select class="inp" data-f="q">' + QUANTS.map((q) => '<option value="' + q.k + '">' + q.k + '（' + q.b + ' 位元 · ' + q.q + '）</option>').join('') + '</select></div>' +
      '<div class="grid2"><div class="fld"><label>上下文 <b data-o="ctx"></b></label><input type="range" min="0" max="' + (CT.length - 1) + '" data-f="ctxi"></div><div class="fld"><label>上下文佔用</label><select class="inp" data-f="kv">' + KVP.map((k) => '<option value="' + k.v + '">' + k.t + '</option>').join('') + '</select></div></div>' +
      '<div data-o="out"></div>';
    const f = (k) => $('[data-f=' + k + ']', el);
    function sync() { f('p').value = st.p; f('total').value = st.total; f('active').value = st.active; f('q').value = st.q; f('ctxi').value = Math.max(0, CT.indexOf(st.ctx)); f('kv').value = String(st.kv); }
    function draw() {
      const r = est({ total: st.total, active: st.active, q: st.q, ctx: st.ctx, kv: st.kv, w: st.w });
      const v = verdictOf(r);
      $('[data-o=ctx]', el).textContent = (st.ctx / 1024) + 'K';
      $('[data-o=out]', el).innerHTML =
        '<div class="meter" style="margin-top:6px"><div class="small" style="margin-bottom:4px">你的顯存（24GB，虛線＝實際可用 22.5GB）</div><div class="lane">' + lane([{ v: Math.min(r.w * r.fracV, 24), c: 'var(--acc)' }, { v: r.kv, c: 'var(--violet)' }, { v: HW.over, c: 'rgba(255,255,255,.25)' }], 24, [HW.usable]) + '<span>' + fmt(r.need, 1) + ' GB 需求</span></div>' +
        '<div class="legend"><span>黃＝模型、紫＝上下文、灰＝開銷</span><span>' + (r.inRam > 0 ? '溢出 ' + fmt(r.inRam, 1) + 'GB 到記憶體' : '沒有溢出') + '</span></div></div>' +
        '<div class="verdict ' + v.c + '"><div class="big">' + (r.real ? fmt(r.real, 0) : '✗') + '</div><div class="tx"><b>' + v.t + (r.real ? '：約 ' + fmt(r.real, 0) + ' tok/s' : '') + '</b><span>' + v.d + '</span></div></div>' +
        '<div class="kv"><div><small>模型檔案大小</small><b>' + fmt(r.w, 1) + ' GB</b></div><div><small>上下文佔用</small><b>' + fmt(r.kv, 1) + ' GB</b></div>' +
        '<div><small>5090 筆電速度上限</small><b>' + fmt(r.ceil, 0) + ' tok/s</b></div><div><small>DGX Spark（對照）</small><b>' + (r.sparkFits ? '約 ' + fmt(r.sReal, 0) + ' tok/s' : '放不下') + '</b></div></div>' +
        '<details class="stuck"><summary>看算式</summary><div class="it small" style="line-height:1.9">' + (st.w ? '這個模型的實際檔案約 <b>' + st.w + 'GB</b>（公式估算是 ' + st.total + 'B × ' + Q(st.q).b + ' ÷ 8 ≈ ' + fmt(st.total * Q(st.q).b / 8, 1) + 'GB，實際檔案常會多出一些沒量化的部分）' : '檔案大小 ＝ ' + st.total + 'B × ' + Q(st.q).b + ' 位元 ÷ 8 ≈ <b>' + fmt(r.w, 1) + 'GB</b>') + '<br>每吐一個 token 要讀 ≈ 啟用的 ' + st.active + 'B 那部分 ≈ <b>' + fmt(r.act, 1) + 'GB</b><br>' +
        (r.fracV < 1 ? '其中 ' + fmt((1 - r.fracV) * 100, 0) + '% 在系統記憶體（約 85 GB/s），其餘在顯存（896 GB/s）<br>' : '全部在顯存：896 GB/s ÷ ' + fmt(r.act + r.kv, 1) + 'GB ≈ ' + fmt(r.ceil, 0) + ' tok/s（上限）<br>') +
        '實際約打 ' + (r.moe ? '4' : '7') + ' 折（' + (r.moe ? 'MoE 有額外開銷' : '軟體與其他損耗') + '），筆電功耗、驅動版本也會影響。</div></details>';
    }
    sync(); draw();
    el.addEventListener('change', (e) => {
      const k = e.target.dataset.f; if (!k) return;
      if (k === 'p') { const p = PRESETS.find((x) => x.id === e.target.value); st.p = e.target.value; if (p) Object.assign(st, { total: p.total, active: p.active, q: p.q, kv: p.kv, w: p.w }); sync(); }
      if (k === 'q') { st.q = e.target.value; st.w = undefined; }
      if (k === 'kv') st.kv = +e.target.value;
      draw(); api.done();
    });
    el.addEventListener('input', (e) => {
      const k = e.target.dataset.f; if (!k) return;
      if (k === 'total' || k === 'active') { const v = parseFloat(e.target.value); if (v > 0) { st[k] = v; st.w = undefined; if (k === 'total' && st.active > v) { st.active = v; f('active').value = v; } st.p = 'custom'; f('p').value = 'custom'; } }
      if (k === 'ctxi') st.ctx = CT[+e.target.value];
      draw(); api.done();
    });
  };

  W.decoder = (el, api) => {
    const FAM = [[/qwen/i, 'Qwen', '阿里巴巴出品，中文最強的開源家族之一'], [/gemma/i, 'Gemma', 'Google 出品'], [/llama/i, 'Llama', 'Meta 出品'], [/gpt-oss/i, 'gpt-oss', 'OpenAI 的開源模型'], [/glm/i, 'GLM', '智譜 Z.ai 出品，中文不錯'], [/deepseek/i, 'DeepSeek', '深度求索出品'], [/mistral|devstral|codestral/i, 'Mistral', '法國 Mistral AI 出品'], [/phi/i, 'Phi', '微軟的小模型'], [/z[_-]?image/i, 'Z-Image', '阿里通義的出圖模型（6B）'], [/flux/i, 'FLUX', 'Black Forest Labs 的出圖模型'], [/wan/i, 'Wan', '阿里的影片模型'], [/hunyuan/i, 'Hunyuan', '騰訊混元'], [/sdxl|stable/i, 'Stable Diffusion', 'Stability AI 的出圖模型'], [/bge|embed/i, '嵌入模型', '給 RAG 用的，不能拿來聊天']];
    const TAG = [[/instruct|[-_]it\b|chat/i, '指令版', '已經教會聊天、聽指令，平常用的就是這種'], [/[-_]base\b/i, '基礎版', '還沒教會聊天，通常是拿來微調的底模'], [/coder|code/i, '寫程式特化', '專門練過寫程式'], [/vl\b|vision|omni/i, '看得懂圖', '可以丟圖片給它'], [/thinking|reason|r1\b/i, '思考型', '會先想一輪再回答，比較準但比較慢'], [/distill/i, '蒸餾版', '大模型教小模型做出來的'], [/turbo|lightning|schnell/i, '加速版', '少步數就能出圖，CFG 通常設 1'], [/abliterated|uncensored/i, '移除拒答版', '社群改過，品質與安全都沒有保證'], [/embed/i, '嵌入模型', '把文字變座標用，不能聊天']];
    const QR = /(UD-)?(IQ\d_[A-Z]+|Q\d_K_[SMLX]{1,2}|Q\d_K|Q\d_[01]|MXFP4|NVFP4|FP8|FP16|BF16|F16|INT8|INT4|AWQ|GPTQ|EXL2)/i;
    const EX = ['Qwen3.8-27B-Instruct-Q4_K_M.gguf', 'Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf', 'gemma-4-26b-a4b-it-Q4_0.gguf', 'gpt-oss-20b-MXFP4.gguf', 'Llama-3.3-70B-Instruct-IQ3_XS.gguf', 'z_image_turbo_bf16.safetensors'];
    let txt = api.get('dec', EX[1]);
    el.innerHTML = '<div class="fld"><label>貼上模型檔名或名稱</label><input class="inp" data-f="t" spellcheck="false" autocapitalize="off"></div><div class="opts2">' + EX.map((x) => '<button data-x="' + esc(x) + '">' + esc(x.replace(/\.(gguf|safetensors)$/, '')) + '</button>').join('') + '</div><div data-o="o"></div>';
    $('[data-f=t]', el).value = txt;
    function parse(s) {
      const P = []; let total = 0, active = 0, qk = '';
      const fam = FAM.find((f) => f[0].test(s)); if (fam) { const v = s.match(new RegExp(fam[1].replace(/[-\s]/g, '.?') + '[-_ ]?(\\d+(?:\\.\\d+)?)(?![\\d.]*[bB])', 'i')); P.push([fam[1] + (v ? ' ' + v[1] : ''), '家族', fam[2] + (v ? '，第 ' + v[1] + ' 代' : '')]); }
      const oss = /gpt-oss-20b/i.test(s) ? [21, 3.6] : /gpt-oss-120b/i.test(s) ? [117, 5.1] : null;
      const sz = s.match(/(\d+(?:\.\d+)?)\s*[bB](?![a-zA-Z])/);
      if (oss) { total = oss[0]; active = oss[1]; P.push([oss[0] + 'B（每次 ' + oss[1] + 'B）', '大小', 'gpt-oss 是 MoE：總參數約 ' + oss[0] + 'B，每個字只啟用約 ' + oss[1] + 'B']); }
      else if (sz) { total = parseFloat(sz[1]); P.push([sz[1] + 'B', '大小', '總共 ' + sz[1] + 'B（' + fmt(total * 10, 0) + ' 億）個參數']); }
      const ac = !oss && s.match(/[-_]a(\d+(?:\.\d+)?)b/i); if (ac) { active = parseFloat(ac[1]); P.push(['A' + ac[1] + 'B', 'MoE', '混合專家：每個字只啟用 ' + ac[1] + 'B，所以速度像小模型']); }
      TAG.forEach((t) => { const m = s.match(t[0]); if (m && !P.some((p) => p[1] === t[1] || p[0] === t[1])) P.push([m[0].replace(/^[-_]/, ''), t[1], t[2]]); });
      const qmap = (k) => QUANTS.find((x) => x.k === k) || (k === 'BF16' ? QUANTS[0] : /^Q8/.test(k) ? QUANTS[2] : /^Q6/.test(k) ? QUANTS[3] : /^Q5/.test(k) ? QUANTS[4] : /^IQ4/.test(k) ? QUANTS[8] : /^Q4/.test(k) ? QUANTS[5] : /^I?Q3/.test(k) ? QUANTS[9] : /^I?Q2/.test(k) ? QUANTS[10] : /^INT8/.test(k) ? QUANTS[2] : /^(INT4|AWQ|GPTQ)/.test(k) ? QUANTS[5] : null);
      const q = s.match(QR); if (q) { qk = q[2].toUpperCase().replace(/^F16$/, 'FP16'); const known = qmap(qk); P.push([q[0], '量化', (q[1] ? 'Unsloth 的動態量化（重要的層保留較高精度）；' : '') + (known ? '約 ' + known.b + ' 位元：' + known.q : '一種量化格式')]); qk = known ? known.k : ''; }
      if (/\.gguf$/i.test(s)) P.push(['.gguf', '格式', '給 Ollama、LM Studio、llama.cpp 用']);
      if (/\.safetensors$/i.test(s)) P.push(['.safetensors', '格式', '原始權重格式，ComfyUI、訓練工具用']);
      return { P, total, active: active || total, qk };
    }
    function draw() {
      const r = parse(txt); api.set('dec', txt);
      let sum = '';
      if (r.total && r.qk) {
        const e = est({ total: r.total, active: r.active, q: r.qk, ctx: 8192, kv: 96 }); const v = verdictOf(e);
        sum = '<div class="verdict ' + v.c + '"><div class="big">' + (e.real ? fmt(e.real, 0) : '✗') + '</div><div class="tx"><b>約 ' + fmt(e.w, 1) + 'GB · ' + v.t + (e.real ? ' · 約 ' + fmt(e.real, 0) + ' tok/s' : '') + '</b><span>以 8K 上下文估算</span></div></div><button class="btn ghost sm" data-a="calc" style="margin-top:10px">用計算機細算 →</button>';
        el._calc = { p: 'custom', total: r.total, active: r.active, q: r.qk, ctx: 8192, kv: 96 };
      } else if (r.total) sum = '<div class="small" style="margin-top:10px">沒看到量化等級：如果是原版（FP16），檔案約 ' + fmt(r.total * 2, 1) + 'GB。</div>';
      $('[data-o=o]', el).innerHTML = (r.P.length ? '<div class="decode">' + r.P.map((p) => '<div class="part"><small>' + esc(p[1]) + '</small><code>' + esc(p[0]) + '</code><p>' + esc(p[2]) + '</p></div>').join('') + '</div>' : '<div class="small" style="margin-top:10px">認不出來。試試貼完整的檔名，例如 Qwen3.8-27B-Q4_K_M.gguf</div>') + sum;
    }
    el.addEventListener('input', (e) => { if (e.target.dataset.f === 't') { txt = e.target.value; draw(); api.done(); } });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.x) { txt = b.dataset.x; $('[data-f=t]', el).value = txt; api.sfx('tick'); draw(); api.done(); }
      if (b.dataset.a === 'calc' && el._calc) { api.set('calcIn', el._calc); api.go('#tool-vram'); }
    });
    draw();
  };
})();
