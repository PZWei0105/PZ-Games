/* ═══════════════ ui2.js — 航跡（數據教練）、船塢、航誌、醫療艙、設定與備份、Apple Watch 同步、第一次啟動、操作分派 ═══════════════ */

/* ───────── 航跡 ───────── */
function viewLog() {
  const T = trend(); const c = coach();
  const lost = T.t != null && S.p.w0 != null ? S.p.w0 - T.t : null;
  const wk = T.wk;
  const tiles =
    '<div class="tiles">' +
    '<div class="tile"><small>7 日均線</small><b>' + (T.t != null ? f1(T.t) : '—') + '<i>kg</i></b><span>' + (wk == null ? '數據累積中' : '本週 ' + (wk > 0 ? '+' : wk < 0 ? '−' : '') + f1(Math.abs(wk))) + '</span></div>' +
    '<div class="tile"><small>已經減了</small><b>' + (lost == null ? '—' : (lost >= 0 ? '' : '+') + f1(Math.abs(lost))) + '<i>kg</i></b><span>' + (S.p.w0 ? '從 ' + f1(S.p.w0) + ' 起算' : '') + '</span></div>' +
    '<div class="tile"><small>預估抵達</small><b class="sm">' + (S.goalAt ? '已抵達' : T.eta ? T.eta.getFullYear() + '/' + (T.eta.getMonth() + 1) : '—') + '</b><span>' + (S.goalAt ? '守燈中' : T.eta ? '依最近 4 週速度' : '速度還看不出來') + '</span></div></div>';
  const st = weekStats(weekStart(today()));
  const last7 = []; for (let i = 6; i >= 0; i--) { const k = addD(today(), -i); last7.push({ k, d: dayOf(k) }); }
  const bars = (kind, color) => {
    const mx = Math.max(1, ...last7.map((x) => (x.d && x.d[kind]) || 0));
    return '<div class="minibars" role="img" aria-label="最近 7 天' + (kind === 'rb' ? '紅牛' : '甜食') + '">' + last7.map((x) => {
      const v = x.d ? x.d[kind] : null; const h = v == null ? 0 : Math.max(6, v / mx * 100);
      return '<div class="mb"><div class="trk"><i style="height:' + h + '%;background:' + (v == null ? 'transparent' : color) + '" class="' + (v == null ? 'nil' : v === 0 ? 'zero' : '') + '"></i></div><b>' + (v == null ? '·' : v) + '</b><small>' + WD[parseK(x.k).getDay()] + '</small></div>';
    }).join('') + '</div>';
  };
  const recent = weights().slice(-10).reverse();
  return '<section class="log">' + tiles +
    '<div class="card chart-card"><div class="card-h"><h2>船體航跡</h2><div class="seg sm">' + [[30, '30 天'], [90, '90 天'], [0, '全部']].map((r) => '<button class="seg-b' + (chartRange === r[0] ? ' on' : '') + '" data-act="range" data-v="' + r[0] + '">' + r[1] + '</button>').join('') + '</div></div>' +
    '<div id="wChart" class="chart"></div>' +
    '<div class="legend"><span><i class="lg-dot"></i>每天量的</span><span><i class="lg-line"></i>7 日均線</span>' + (S.p.goal ? '<span><i class="lg-dash"></i>目標 ' + f1(S.p.goal) + '</span>' : '') + '</div></div>' +
    '<div class="card coach ' + c.tone + '"><div class="card-h"><h2>螢的判讀</h2></div><b class="ch-head">' + esc(c.head) + '</b>' + c.lines.filter(Boolean).map((l) => '<p>' + esc(l) + '</p>').join('') + '</div>' +
    '<div class="card"><div class="card-h"><h2>最近的體重</h2><button class="link" data-act="w-past">補登過去的體重</button></div>' +
    (recent.length ? '<ul class="wlist">' + recent.map((e, i) => { const nx = recent[i + 1]; const dlt = nx ? e.w - nx.w : null; return '<li><span>' + fmtMD(e.k) + '（' + WD[parseK(e.k).getDay()] + '）</span><b>' + f1(e.w) + '</b><em class="' + (dlt > 0 ? 'up' : dlt < 0 ? 'dn' : '') + '">' + (dlt == null ? '' : (dlt > 0 ? '+' : dlt < 0 ? '−' : '±') + f1(Math.abs(dlt))) + '</em><button class="icon-btn" data-act="w-edit" data-k="' + e.k + '" aria-label="修改 ' + fmtMD(e.k) + ' 的體重">' + ic('pen') + '</button></li>'; }).join('') + '</ul><p class="hint">單日的上下跳動是水分，參考均線就好。</p>' : '<p class="empty">還沒有紀錄。</p>') + '</div>' +
    '<div class="card"><div class="card-h"><h2>燃料帳本　本週</h2></div><div class="ledger">' +
    '<div><b>' + st.meals + '</b><small>記了幾餐</small></div><div><b>' + st.vegMeals + '</b><small>有青菜</small></div><div><b>' + st.swaps + '</b><small>換法</small></div><div><b>' + st.clean + '</b><small>清爽燃料</small></div></div>' +
    '<div class="two"><div><h3>' + ic('can') + '紅牛　最近 7 天</h3>' + bars('rb', '#ff5a7a') + '</div><div><h3>' + ic('cookie') + '甜食　最近 7 天</h3>' + bars('sw', '#ff9bd2') + '</div></div>' +
    '<p class="hint">清爽燃料：沒有炸的、加工肉、含糖飲料的一餐。「·」是那天沒記。</p></div>' +
    ladderCard('rb') + ladderCard('sw') +
    '<div class="card"><div class="card-h"><h2>引擎紀錄　本週</h2></div><div class="ledger three"><div><b>' + st.walkN + '</b><small>次試車</small></div><div><b>' + st.walkMin + '</b><small>分鐘</small></div><div><b>' + S.eng.tier + '</b><small>目前階段</small></div></div>' +
    '<p class="hint">階段和解除封印的條件在「醫療艙」。</p></div>' +
    '</section>';
}
function ladderCard(kind) {
  const L = D.ladders[kind]; const V = ladderView(kind);
  return '<div class="card ladder" style="--c:' + L.color + '"><div class="card-h"><h2>' + L.name + '</h2><span class="pill">' + (V.done ? '完成' : '第 ' + (V.i + 1) + ' 階') + '</span></div>' +
    '<p class="hint">' + L.note + '</p><ol class="rungs">' + V.R.map((r, i) => {
      const cls = i < V.i ? 'past' : i === V.i ? 'now' : '';
      return '<li class="' + cls + '"><span class="rg-dot">' + (i < V.i ? ic('check') : i + 1) + '</span><div><b>' + esc(r.name) + '</b><small>' + esc(r.goal) + '</small>' + (i === V.i && !V.done ? '<div class="bar"><i style="width:' + Math.round(V.n / r.need * 100) + '%"></i></div><small>' + V.n + ' / ' + r.need + ' 天' + (V.todayOK ? '　今天目前達標（明天才算進去）' : '') + '</small>' : '') + '</div></li>';
    }).join('') + '</ol>' +
    '<details class="more"><summary>想' + (kind === 'rb' ? '喝' : '吃') + '的時候，可以換成</summary><ul>' + L.subs.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' + (L.caution ? '<p class="caution">' + esc(L.caution) + '</p>' : '') + '</details></div>';
}

/* 體重圖：點、7 日均線、目標線，可以按住看數字 */
function drawCharts() {
  const box = $('#wChart'); if (!box) return;
  const a = weights();
  if (a.length < 2) { box.innerHTML = '<p class="empty">量兩天以上，這裡就會畫出你的航跡。</p>'; return; }
  const W = Math.max(280, box.clientWidth || 340), H = 230, pl = 6, pr = 46, pt = 16, pb = 26;
  const endK = a[a.length - 1].k > today() ? a[a.length - 1].k : today();
  let x0 = chartRange ? addD(endK, -(chartRange - 1)) : a[0].k; if (x0 < a[0].k && !chartRange) x0 = a[0].k;
  let pts = a.filter((e) => e.k >= x0);
  if (pts.length < 2) { pts = a.slice(-2); x0 = pts[0].k; }
  const span = Math.max(1, diffD(x0, endK));
  const X = (k) => pl + (W - pl - pr) * diffD(x0, k) / span;
  const tr = pts.map((e) => ({ k: e.k, w: e.w, t: m7(e.k, a) }));
  let lo = Math.min(...tr.map((e) => Math.min(e.w, e.t))), hi = Math.max(...tr.map((e) => Math.max(e.w, e.t)));
  const g = S.p.goal; let goalIn = false;
  if (g != null && g >= lo - 3) { lo = Math.min(lo, g); hi = Math.max(hi, g); goalIn = true; }
  lo -= 0.6; hi += 0.6;
  const rg = hi - lo; const step = rg < 3 ? 0.5 : rg < 8 ? 1 : rg < 20 ? 2 : 5;
  const Y = (v) => pt + (H - pt - pb) * (hi - v) / rg;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="體重和 7 日均線"><defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".28"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient></defs>';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const y = Y(v); svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (W - pr + 6) + '" y="' + (y + 4) + '" class="ax">' + (step < 1 ? v.toFixed(1) : v) + '</text>'; }
  const nT = 4; for (let i = 0; i <= nT; i++) { const k = addD(x0, Math.round(span * i / nT)); svg += '<text x="' + X(k) + '" y="' + (H - 6) + '" class="ax" text-anchor="' + (i === 0 ? 'start' : i === nT ? 'end' : 'middle') + '">' + fmtMD(k) + '</text>'; }
  if (goalIn) svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" class="goal"/><text x="' + (W - pr - 4) + '" y="' + (Y(g) - 6) + '" class="ax goal-t" text-anchor="end">目標 ' + f1(g) + '</text>';
  const line = tr.map((e, i) => (i ? 'L' : 'M') + X(e.k).toFixed(1) + ',' + Y(e.t).toFixed(1)).join(' ');
  svg += '<path d="' + line + ' L' + X(tr[tr.length - 1].k).toFixed(1) + ',' + (H - pb) + ' L' + X(tr[0].k).toFixed(1) + ',' + (H - pb) + ' Z" fill="url(#gArea)"/>';
  svg += tr.map((e) => '<circle cx="' + X(e.k).toFixed(1) + '" cy="' + Y(e.w).toFixed(1) + '" r="2.6" class="pt"/>').join('');
  svg += '<path d="' + line + '" class="trend"/>';
  const L = tr[tr.length - 1];
  svg += '<circle cx="' + X(L.k) + '" cy="' + Y(L.t) + '" r="5" class="end"/><text x="' + (X(L.k) - 8) + '" y="' + (Y(L.t) - 10) + '" class="end-t" text-anchor="end">' + f1(L.t) + '</text>';
  if (!goalIn && g != null) svg += '<text x="' + (W - pr - 4) + '" y="' + (H - pb - 6) + '" class="ax goal-t" text-anchor="end">目標 ' + f1(g) + '（在更下面）</text>';
  svg += '<line id="xh" class="xh" x1="0" x2="0" y1="' + pt + '" y2="' + (H - pb) + '" style="opacity:0"/><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent" id="chartHit"/></svg><div class="tip" id="tip"></div>';
  box.innerHTML = svg;
  const hit = $('#chartHit'), xh = $('#xh'), tip = $('#tip');
  const show = (ev) => {
    const r = box.getBoundingClientRect(); const x = (ev.clientX - r.left) * (W / r.width);
    let best = tr[0], bd = 1e9; for (const e of tr) { const d = Math.abs(X(e.k) - x); if (d < bd) { bd = d; best = e; } }
    const px = X(best.k); xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.style.opacity = 1;
    tip.innerHTML = '<b>' + fmtMD(best.k) + '（' + WD[parseK(best.k).getDay()] + '）</b><span>當天 ' + f1(best.w) + ' kg</span><span class="t">均線 ' + f1(best.t) + ' kg</span>';
    tip.style.left = Math.min(Math.max(0, px * r.width / W - 60), r.width - 128) + 'px'; tip.classList.add('on');
  };
  const hide = () => { xh.style.opacity = 0; tip.classList.remove('on'); };
  hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show); hit.addEventListener('pointerleave', hide); hit.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(hide, 1600); });
}

/* ───────── 船塢 ───────── */
function viewDock() {
  const r = rank(); const h = hull(); const bp = beaconParts();
  const nextP = r.next ? clamp((S.spLife - RANKS.find((x) => x[1] === r.name)[0]) / (r.next[0] - RANKS.find((x) => x[1] === r.name)[0]), 0, 1) : 1;
  const mem = memoryPct();
  const sysCard = (k) => {
    const s = D.systems[k]; const lv = S.sys[k]; const cost = D.cost[lv];
    return '<div class="sys" id="sys-' + k + '" style="--c:' + s.color + '"><div class="sys-h"><span class="sys-dot"></span><div><b>' + s.name + '</b><small>對應：' + s.body + '</small></div><span class="lv">' + lv + '<i>/8</i></span></div>' +
      '<div class="pips">' + s.mods.map((m, i) => '<i class="' + (i < lv ? 'on' : '') + '" title="' + esc(m) + '"></i>').join('') + '</div>' +
      (lv < 8 ? '<div class="sys-next"><div><small>下一個模組</small><b>' + esc(s.mods[lv]) + '</b></div><button class="' + (S.sp >= cost ? 'primary' : 'ghost') + '" data-act="repair" data-k="' + k + '"' + (S.sp >= cost ? '' : ' disabled') + '>' + ic('wrench') + '修復　' + cost + '</button></div>' + (S.sp < cost ? '<p class="hint">還差 ' + (cost - S.sp) + ' 星火</p>' : '') : '<p class="ok-line">' + ic('check') + '這個系統全部修好了</p>') +
      '<p class="hint">' + s.note + '</p></div>';
  };
  const crew = D.crew.map((c) => { const awake = !!S.ch[c.ch]; return '<li class="' + (awake ? 'on' : '') + '" style="--c:' + c.color + '"><span class="av">' + (awake ? c.glyph : '?') + '</span><div><b>' + (awake ? c.name : '冷凍艙') + '</b><small>' + (awake ? c.role : '還在沉睡') + '</small>' + (awake ? '<p>' + esc(c.bio) + '</p>' : '') + '</div></li>'; }).join('');
  const found = D.items.filter((i) => S.cargo[i.id]).length;
  const cargo = D.items.map((i) => { const has = !!S.cargo[i.id]; const R = D.rarity[i.r]; return '<button class="slot' + (has ? ' has' : '') + '" style="--c:' + R.color + '"' + (has ? ' data-act="item" data-id="' + i.id + '"' : ' disabled') + ' aria-label="' + (has ? esc(i.name) : '還沒找到') + '"><span>' + (has ? esc(i.name) : '？') + '</span></button>'; }).join('');
  return '<section class="dock">' +
    '<div class="bank"><div class="bank-n">' + ic('ember') + '<b>' + S.sp + '</b><small>星火</small></div><div class="bank-r"><b>' + r.name + '</b><div class="bar"><i style="width:' + Math.round(nextP * 100) + '%"></i></div><small>' + (r.next ? '累計 ' + S.spLife + '　下一階「' + r.next[1] + '」' + r.next[0] : '最高階') + '</small></div></div>' +
    (S.ch[8] ? '<div class="memory"><div class="mring" style="--p:' + mem + '"><b>' + Math.round(mem * 100) + '%</b></div><div><b>螢的記憶　修復中</b><p>每修好一個模組、每裝回一件燈塔零件，就分一點電給她。</p></div></div>' : '<div class="memory quiet"><div><b>船載系統自我檢查</b><p>螢：「正常。宇宙輻射造成少量壞軌，不影響運作。」</p></div></div>') +
    '<div class="sec-h"><h2>維修</h2><span class="hint">星火從每天的任務來</span></div>' +
    sysCard('fuel') + sysCard('o2') + sysCard('engine') +
    '<div class="sys" style="--c:' + D.systems.hull.color + '"><div class="sys-h"><span class="sys-dot"></span><div><b>船體</b><small>對應：體重的 7 日均線</small></div><span class="lv">' + Math.round(h * 100) + '<i>%</i></span></div><div class="bar hull"><i style="width:' + Math.round(h * 100) + '%"></i></div><p class="hint">' + D.systems.hull.note + (S.bestHull > h + 0.005 ? ' 最高紀錄 ' + Math.round(S.bestHull * 100) + '%，已經修好的東西不會壞回去。' : '') + '</p></div>' +
    '<div class="sys beacon" style="--c:' + D.systems.beacon.color + '"><div class="sys-h"><span class="sys-dot"></span><div><b>燈塔</b><small>跟著船體完整度裝回去</small></div><span class="lv">' + (S.lit ? '亮' : bp + '<i>/6</i>') + '</span></div><ol class="parts">' + D.systems.beacon.mods.map((m, i) => { const req = D.systems.beacon.req[i]; const ok = S.bestHull >= req - 1e-9; return '<li class="' + (ok ? 'on' : '') + '"><span>' + (ok ? ic('check') : ic('lock')) + '</span><b>' + m + '</b><small>船體 ' + Math.round(req * 100) + '%</small></li>'; }).join('') + '</ol></div>' +
    '<div class="card"><div class="card-h"><h2>船身塗裝</h2></div><div class="paints">' + D.paints.map((p) => { const own = S.paints.includes(p.id); const on = S.paint === p.id; return '<button class="paint' + (on ? ' on' : '') + '" data-act="paint" data-id="' + p.id + '"' + (!own && S.sp < p.cost ? ' disabled' : '') + ' style="--a:' + p.hull + ';--b:' + p.hi + '"><i></i><b>' + p.name + '</b><small>' + (on ? '使用中' : own ? '換上' : p.cost + ' 星火') + '</small></button>'; }).join('') + '</div></div>' +
    '<div class="card"><div class="card-h"><h2>船員</h2></div><ul class="crew">' + crew + '</ul></div>' +
    '<div class="card"><div class="card-h"><h2>貨艙</h2><span class="pill">' + found + ' / ' + D.items.length + '</span></div><p class="hint">完成任務、開補給艙、領每週事件時會撿到東西。稀有和傳說的貨物，藏著燈塔熄滅那一年的事。</p><div class="cargo">' + cargo + '</div></div>' +
    '</section>';
}

/* ───────── 航誌 ───────── */
function viewStory() {
  const n = D.chapters.filter((c) => S.ch[c.id]).length; let shownNext = false;
  return '<section class="story"><div class="story-h"><h2>餘燼號航誌</h2><p>累計航行的天數和船體完整度，會一章一章解鎖。已解鎖 ' + n + ' / ' + D.chapters.length + ' 章。</p></div><ol class="chapters">' +
    D.chapters.map((c) => {
      const open = !!S.ch[c.id];
      if (open) return '<li><button class="chap on' + (S.read[c.id] ? '' : ' new') + '" data-act="read" data-id="' + c.id + '"><span class="no">' + c.id + '</span><span class="ct"><b>' + c.title + '</b><small>' + (S.read[c.id] ? '已讀' : '還沒讀') + '</small></span>' + ic('chev') + '</button></li>';
      const first = !shownNext; shownNext = true;
      return '<li><div class="chap lock"><span class="no">' + c.id + '</span><span class="ct"><b>' + (first ? '下一章' : '？？？') + '</b><small>' + (first ? esc(chNeed(c)) : '解鎖前一章後顯示') + '</small></span>' + ic('lock') + '</div></li>';
    }).join('') + '</ol></section>';
}
function openReader(id) {
  const c = D.chapters.find((x) => x.id === id); if (!c || !S.ch[id]) return;
  S.read[id] = 1; saveSoon();
  const nx = D.chapters.find((x) => x.id === id + 1);
  const paras = c.text.split(/\n\s*\n/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
  openModal('<article class="reader"><header><button class="icon-btn" data-act="modal-close" aria-label="關閉">' + ic('x') + '</button><span>航誌　第 ' + c.id + ' 章</span></header><h2>' + c.title + '</h2><div class="rd-body">' + paras + '</div>' +
    (c.reward && S.cargo[c.reward] ? '<div class="rd-reward"><small>你得到了一件傳說貨物</small><b>' + esc(D.items.find((i) => i.id === c.reward).name) + '</b></div>' : '') +
    '<footer>' + (nx ? (S.ch[nx.id] ? '<button class="primary wide" data-act="read" data-id="' + nx.id + '">下一章：' + nx.title + '</button>' : '<p>下一章解鎖條件：' + esc(chNeed(nx)) + '</p>') : '<p>航誌到這裡結束。燈，每天都要擦。</p>') + '<button class="ghost wide" data-act="modal-close">回到艦橋</button></footer></article>', 'reader');
  render();
}
function showUnlock(c) {
  Sound.play('unlock');
  if (c.id === 12 && !S.lit) { showIgnite(); return; }
  openModal('<div class="unlock"><div class="ul-glow" aria-hidden="true"></div><small>新的航誌解鎖</small><span class="ul-no">第 ' + c.id + ' 章</span><h2>' + c.title + '</h2><button class="primary wide" data-act="read" data-id="' + c.id + '">現在閱讀</button><button class="ghost wide" data-act="modal-close">稍後再看</button></div>', 'unlock');
}
function showWelcome(n) {
  openModal('<div class="unlock welcome"><small>歡迎歸隊</small><h2>你離開了 ' + n + ' 天</h2><p>' + esc(pick(D.lines.welcome)) + '</p><p class="muted">累計航行天數、修好的模組、解鎖的航誌都還在。連續航行從今天重新算。</p><button class="primary wide" data-act="modal-close">回到艦橋</button></div>', 'unlock');
}
function showIgnite() {
  openModal('<div class="unlock ignite"><div class="ul-glow" aria-hidden="true"></div><small>船體完整度 100%</small><h2>燈芯修好了</h2><p>按住點火鈕，把燈塔點起來。</p><button class="hold" id="holdBtn" data-hold="lit"><span class="hold-fill"></span><b>按住點火</b></button></div>', 'unlock');
}
function doLight() {
  S.lit = true; save(); Sound.play('ignite'); haptic(60);
  const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 2600);
  setComm('燈亮了，艦長。整片灰燼星雲都看得見了。'); closeModal(); go('bridge');
  setTimeout(() => openReader(12), 1800);
}

/* ───────── 醫療艙 ───────── */
function viewMed() {
  const hp = bossHP(); const L = S.labs.slice().sort((a, b) => (a.k < b.k ? -1 : 1)); const last = L[L.length - 1], prev = L[L.length - 2];
  const o2 = S.spo2.slice(-1)[0];
  const T = D.tiers[S.eng.tier - 1]; const nx = D.tiers[S.eng.tier];
  const boss = !L.length ?
    '<div class="boss empty"><div class="boss-art" aria-hidden="true">' + bossSVG(1) + '</div><div><h2>血脂濁流</h2><p>回診抽血的報告可以記在這裡。總膽固醇、LDL、HDL、三酸甘油酯，記得越多，濁流的血條越準。每次回診，看它掉了多少。</p><button class="primary" data-act="lab-add">' + ic('plus') + '新增抽血報告</button></div></div>' :
    '<div class="boss"><div class="boss-top"><div class="boss-art' + (hp === 0 ? ' gone' : '') + '" aria-hidden="true">' + bossSVG(hp == null ? 1 : hp) + '</div><div class="boss-hp"><h2>血脂濁流</h2><div class="hpbar"><i style="width:' + Math.round((hp || 0) * 100) + '%"></i></div><small>' + (hp === 0 ? '濁流被擊退了。下一次回診，確認它沒有回來。' : '血條 ' + Math.round((hp || 0) * 100) + '%　' + (L.length > 1 ? '比第一次報告' + (hp < 1 ? '少了 ' + Math.round((1 - hp) * 100) + '%' : '沒有變少') : '這是第一份報告，下次回診再比') ) + '</small></div></div>' +
    '<table class="labs"><thead><tr><th>項目</th><th>這次</th><th>目標</th><th>比上次</th></tr></thead><tbody>' + LABS.map((m) => {
      const v = last[m.id]; if (v == null) return ''; const t = S.tgt[m.id]; const pv = prev ? prev[m.id] : null; const ok = m.low ? v <= t : v >= t;
      const d = pv != null ? v - pv : null; const better = d == null ? null : (m.low ? d < 0 : d > 0);
      return '<tr><td>' + m.name + '</td><td class="' + (ok ? 'ok' : 'hi') + '">' + v + '</td><td>' + (m.low ? '< ' : '≥ ') + t + '</td><td class="' + (better == null ? '' : better ? 'ok' : 'hi') + '">' + (d == null ? '—' : (d > 0 ? '+' : '') + d) + '</td></tr>';
    }).join('') + '</tbody></table><p class="hint">單位 mg/dL。目標是一般參考值，你的目標請以醫生說的為準（可以在設定裡改）。</p>' +
    '<div class="row"><button class="primary" data-act="lab-add">' + ic('plus') + '新增抽血報告</button><button class="ghost" data-act="lab-tgt">改目標</button></div>' +
    '<details class="more"><summary>全部報告（' + L.length + '）</summary><ul class="labhist">' + L.slice().reverse().map((x) => '<li><b>' + fmtYMD(x.k) + '</b><span>' + LABS.filter((m) => x[m.id] != null).map((m) => m.name.replace(/ .*/, '') + ' ' + x[m.id]).join('、') + '</span><button class="icon-btn" data-act="lab-del" data-k="' + x.k + '" aria-label="刪除這份報告">' + ic('trash') + '</button></li>').join('') + '</ul></details></div>';
  return '<section class="med">' + boss +
    '<div class="card"><div class="card-h"><h2>血氧</h2><span class="pill">門檻 ' + S.safe.spo2 + '%</span></div>' +
    (o2 ? '<p class="o2-now"><b>' + o2.v + '<i>%</i></b><span>' + fmtMD(o2.k) + ' 的紀錄' + (o2.v < S.safe.spo2 ? '，低於門檻' : '') + '</span></p>' : '<p class="hint">還沒有血氧紀錄。可以用 Apple Watch 量，再記在這裡。</p>') +
    '<div id="o2Chart" class="chart sm"></div>' +
    '<div class="row"><button class="primary" data-act="o2-add">' + ic('plus') + '記錄血氧</button><button class="ghost" data-act="sync">' + ic('watch') + 'Apple Watch 同步</button></div>' +
    '<p class="hint">Apple Watch 量的血氧是參考值，不是醫療等級。這裡只拿來當安全警示：低於門檻就不試車。</p></div>' +
    '<div class="card"><div class="card-h"><h2>引擎階段</h2><span class="pill">' + T.name + '</span></div><ol class="tiers">' + D.tiers.map((x) => {
      const cls = x.n < S.eng.tier ? 'past' : x.n === S.eng.tier ? 'now' : '';
      return '<li class="' + cls + '"><span class="rg-dot">' + (x.n < S.eng.tier ? ic('check') : x.n) + '</span><div><b>' + x.name + (x.doc ? '<em>要醫生同意</em>' : '') + '</b><small>' + x.desc + '</small>' + (x.n === S.eng.tier && x.need ? '<div class="bar"><i style="width:' + Math.round(Math.min(1, (S.eng.good || 0) / x.need) * 100) + '%"></i></div><small>順利完成 ' + Math.min(S.eng.good || 0, x.need) + ' / ' + x.need + ' 次（走滿目標、感覺輕鬆或還能講話）</small>' : '') + '</div></li>';
    }).join('') + '</ol>' +
    (tierReady() ? '<button class="primary wide" data-act="tier-up">' + ic('up') + '解除封印：' + nx.name + '</button>' : nx && nx.doc && !S.safe.doc && (S.eng.good || 0) >= T.need ? '<p class="notecard">下一階要先問過醫生。醫生同意後，把下面的開關打開。</p>' : '') +
    (S.eng.tier > 1 ? '<button class="ghost wide" data-act="tier-down">退回上一階（不會扣任何東西）</button>' : '') +
    '<label class="switch"><input type="checkbox" id="docOK"' + (S.safe.doc ? ' checked' : '') + ' data-act="doc"><span></span><b>醫生已經同意我做快走以上的運動</b></label></div>' +
    '<div class="card"><div class="card-h"><h2>安全設定</h2></div>' +
    '<label class="field"><span>運動血氧門檻（低於這個數字就不試車）</span><span class="inl"><input id="sSpo2" type="number" inputmode="numeric" min="80" max="99" value="' + S.safe.spo2 + '"><em>%</em></span></label>' +
    '<p class="hint">先用比較保守的 94%。回診時請醫生給你一個數字，再改成那個數字。</p>' +
    '<label class="field"><span>運動時心率上限（選填，醫生有說再填）</span><span class="inl"><input id="sHr" type="number" inputmode="numeric" min="80" max="200" placeholder="例如 120" value="' + (S.safe.hr || '') + '"><em>下／分</em></span></label>' +
    '<button class="primary" data-act="safe-save">儲存安全設定</button>' + emergencyHTML() +
    '<p class="hint">重新點火不是醫療器材。數字只是幫你看趨勢，身體的判斷以醫生為準。</p></div>' +
    '</section>';
}
function bossSVG(hp) {
  const s = 0.55 + 0.45 * clamp(hp, 0, 1);
  return '<svg viewBox="0 0 120 120"><defs><radialGradient id="gB" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#7a5a8a"/><stop offset=".6" stop-color="#3b2547"/><stop offset="1" stop-color="#1a1022" stop-opacity="0"/></radialGradient></defs>' +
    '<g transform="translate(60 62) scale(' + s.toFixed(2) + ')"><path class="blob" d="M-44,-6 C-50,-34 -20,-52 6,-46 C30,-50 52,-30 46,-2 C56,22 30,48 2,44 C-26,50 -54,28 -44,-6 Z" fill="url(#gB)"/>' +
    '<path d="M-30,24 q-6,14 -2,26 M-8,34 q-2,12 2,22 M18,32 q4,12 0,24" stroke="#4a3157" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>' +
    '<ellipse cx="-14" cy="-8" rx="7" ry="5" fill="#ffd27a"/><ellipse cx="14" cy="-10" rx="6" ry="4.5" fill="#ffd27a"/><circle cx="-13" cy="-8" r="2.4" fill="#1a1022"/><circle cx="15" cy="-10" r="2.2" fill="#1a1022"/>' +
    '<path d="M-10,12 q10,6 20,0" stroke="#ffd27a" stroke-width="2" fill="none" opacity=".7"/></g></svg>';
}
function drawO2() {
  const box = $('#o2Chart'); if (!box) return;
  const a = S.spo2.slice(-40); if (a.length < 2) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  const W = Math.max(260, box.clientWidth || 320), H = 120, pl = 6, pr = 34, pt = 10, pb = 20;
  const lo = Math.min(88, ...a.map((x) => x.v)) - 1, hi = 100;
  const Y = (v) => pt + (H - pt - pb) * (hi - v) / (hi - lo); const X = (i) => pl + (W - pl - pr) * i / Math.max(1, a.length - 1);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="血氧紀錄">';
  for (const v of [90, 95, 100]) if (v >= lo) svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grid"/><text x="' + (W - pr + 5) + '" y="' + (Y(v) + 4) + '" class="ax">' + v + '</text>';
  svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(S.safe.spo2) + '" y2="' + Y(S.safe.spo2) + '" class="goal o2"/>';
  svg += '<path d="' + a.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(x.v).toFixed(1)).join(' ') + '" class="trend o2"/>';
  svg += a.map((x, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(x.v).toFixed(1) + '" r="3" class="' + (x.v < S.safe.spo2 ? 'pt low' : 'pt o2') + '"/>').join('');
  svg += '<text x="' + pl + '" y="' + (H - 4) + '" class="ax">' + fmtMD(a[0].k) + '</text><text x="' + (W - pr) + '" y="' + (H - 4) + '" class="ax" text-anchor="end">' + fmtMD(a[a.length - 1].k) + '</text></svg>';
  box.innerHTML = svg;
}
function sheetLab() {
  const t = today();
  return '<div class="sh-h" style="--c:#b49cff">' + ic('med') + '<div><h3>新增抽血報告</h3><p>照報告上的數字填，沒驗的項目空著就好。單位 mg/dL。</p></div></div>' +
    '<label class="field"><span>抽血日期</span><input type="date" id="lDate" value="' + t + '" max="' + t + '"></label>' +
    LABS.map((m) => '<label class="field"><span>' + m.name + '</span><span class="inl"><input id="l_' + m.id + '" type="number" inputmode="numeric" min="10" max="2000" placeholder="—"><em>mg/dL</em></span></label>').join('') +
    '<button class="primary wide" data-act="lab-save">記錄報告　星火 +30</button>';
}
function sheetTargets() {
  return '<div class="sh-h" style="--c:#b49cff">' + ic('med') + '<div><h3>血脂目標</h3><p>預設是一般參考值。醫生給你的目標不一樣，就改成醫生說的。</p></div></div>' +
    LABS.map((m) => '<label class="field"><span>' + m.name + (m.low ? '（低於）' : '（高於）') + '</span><span class="inl"><input id="t_' + m.id + '" type="number" inputmode="numeric" value="' + S.tgt[m.id] + '"><em>mg/dL</em></span></label>').join('') +
    '<button class="primary wide" data-act="tgt-save">儲存目標</button>';
}
function sheetO2() {
  return '<div class="sh-h" style="--c:#57E3D9">' + ic('drop') + '<div><h3>記錄血氧</h3><p>休息時量的數字。Apple Watch：打開「血氧」App，手臂平放、不要動。</p></div></div>' +
    '<label class="field"><span>血氧</span><span class="inl"><input id="o2In" type="number" inputmode="numeric" min="70" max="100" placeholder="例如 96"><em>%</em></span></label>' +
    '<button class="primary wide" data-act="o2-save">記錄</button>';
}

/* ───────── Apple Watch 同步（iPhone 捷徑 → 剪貼簿 → 這裡） ───────── */
function sheetSync() {
  return '<div class="sh-h" style="--c:#57E3D9">' + ic('watch') + '<div><h3>Apple Watch 同步</h3><p>用 iPhone 的「捷徑」把體重、血氧、步數複製起來，回到這裡按一下就填好。</p></div></div>' +
    '<button class="primary wide" data-act="sync-paste">' + ic('copy') + '貼上剛剛複製的數據</button>' +
    '<label class="field"><span>或是長按下面的框，選「貼上」</span><textarea id="syncTxt" rows="2" placeholder="REIGNITE w=90.6 o=96 s=5230"></textarea></label>' +
    '<button class="ghost wide" data-act="sync-apply">套用框裡的數據</button>' +
    '<details class="more" open><summary>第一次用：做一個「點火同步」捷徑（大約 3 分鐘）</summary><ol class="guide">' +
    '<li>打開 iPhone 的「捷徑」App，按右上角「＋」，把捷徑命名為「點火同步」。</li>' +
    '<li>加入動作「尋找健康樣本」（搜尋框打「健康」就找得到）：類型選「體重」，排序選「開始日期」、「最新的優先」，限制打開、數量 1。</li>' +
    '<li>再加一個「尋找健康樣本」：類型選「血氧飽和度」，一樣最新的優先、數量 1。</li>' +
    '<li>（選做）再加一個：類型選「步數」，條件選「開始日期」是「今天」；後面接「計算統計數據」，選「總和」。</li>' +
    '<li>加入動作「文字」，打入：<code>REIGNITE w=</code>，接著插入第一個結果；空一格打 <code>o=</code>，插入第二個結果；有做步數就再空一格打 <code>s=</code>，插入總和。</li>' +
    '<li>最後加入動作「拷貝到剪貼板」。第一次執行時，iPhone 會問能不能讀健康資料，選允許。</li>' +
    '<li>之後每天：執行「點火同步」→ 打開重新點火 → 按「貼上剛剛複製的數據」。</li></ol>' +
    '<p class="hint">動作名稱在不同 iOS 版本可能差一兩個字，用搜尋找最快。不要用「打開網址」的方式傳：從主畫面打開的 App 跟 Safari 的資料是分開存的。</p></details>';
}
function parseSync(txt) {
  const g = (re) => { const m = txt.match(re); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };
  let w = g(/(?:^|[\s,;])w\s*[=:：]\s*([\d.]+)/i); if (w == null) w = g(/體重\s*[=:：]?\s*([\d.]+)/);
  let s = g(/(?:^|[\s,;])s\s*[=:：]\s*([\d,]+)/i); if (s == null) s = g(/步數\s*[=:：]?\s*([\d,]+)/);
  let o = g(/(?:^|[\s,;])o\s*[=:：]\s*([\d.]+)/i); if (o == null) o = g(/血氧\s*[=:：]?\s*([\d.]+)/);
  if (o != null && o <= 1) o = Math.round(o * 100);
  if (w != null && !(w >= 30 && w <= 250)) w = null;
  if (s != null && !(s >= 0 && s <= 200000)) s = null;
  if (o != null && !(o >= 70 && o <= 100)) o = null;
  return { w, s, o };
}
function applySync(txt) {
  const r = parseSync(txt || '');
  if (r.w == null && r.s == null && r.o == null) { toast('沒有讀到數據。確認捷徑複製的文字裡有 w=、o= 或 s=。', 'warn'); return; }
  const k = today(); const d = day(k); const msg = [];
  if (r.w != null) { const first = d.w == null; d.w = r1(r.w); d.wt = Date.now(); if (first) gain(10, '晨間校準'); msg.push('體重 ' + f1(r.w)); }
  if (r.o != null) { const firstO = !S.spo2.some((x) => x.k === k); S.spo2.push({ k, v: Math.round(r.o), src: 'watch' }); if (firstO) gain(3 + S.sys.o2, '血氧紀錄'); msg.push('血氧 ' + Math.round(r.o) + '%'); }
  if (r.s != null) { const prev = d.steps || 0; d.steps = Math.round(r.s); const add = Math.min(8, Math.floor(d.steps / 1000)) - Math.min(8, Math.floor(prev / 1000)); if (add > 0) gain(add, '步數'); msg.push('步數 ' + d.steps); }
  closeSheet();
  let line = '同步完成：' + msg.join('、') + '。';
  if (r.o != null && r.o < S.safe.spo2) line += '血氧低於你設定的門檻，今天的引擎試車先休息。';
  afterAction({ line, sys: r.w != null ? 'hull' : 'o2' });
}

/* ───────── 設定與備份 ───────── */
function sheetSettings() {
  const p = S.p; const bk = S.backup ? fmtYMD(dk(new Date(S.backup))) : '還沒備份過';
  return '<div class="sh-h" style="--c:#8EA8FF">' + ic('gear') + '<div><h3>設定與備份</h3><p>' + (IS_WEB ? '紀錄存在這支手機的瀏覽器裡，不會上傳到任何地方。換手機前記得備份。' : 'Claude 版的紀錄' + (Cloud.state === 'ok' ? '會跟著你的 Claude 帳號同步。' : '目前只存在這個畫面裡。')) + '</p></div></div>' +
    '<h4>艦長資料</h4>' +
    '<label class="field"><span>名字</span><input id="pName" type="text" maxlength="12" value="' + esc(p.name) + '"></label>' +
    '<div class="two-f"><label class="field"><span>起始體重</span><span class="inl"><input id="pW0" type="number" inputmode="decimal" step="0.1" value="' + (p.w0 != null ? f1(p.w0) : '') + '"><em>kg</em></span></label>' +
    '<label class="field"><span>目標體重</span><span class="inl"><input id="pGoal" type="number" inputmode="decimal" step="0.1" value="' + (p.goal != null ? f1(p.goal) : '') + '"><em>kg</em></span></label></div>' +
    '<p class="hint">船體完整度＝從起始體重走到目標體重的進度。目標可以分段設，到了再往下調。</p>' +
    '<div class="two-f"><label class="field"><span>紅牛平常一天</span><span class="inl"><input id="pRb" type="number" inputmode="numeric" min="0" max="10" value="' + p.rb0 + '"><em>罐</em></span></label>' +
    '<label class="field"><span>甜食平常一天</span><span class="inl"><input id="pSw" type="number" inputmode="numeric" min="0" max="10" value="' + p.sw0 + '"><em>份</em></span></label></div>' +
    '<button class="primary wide" data-act="set-save">儲存</button>' +
    '<h4>備份</h4><p class="hint">上次備份：' + bk + '</p>' +
    '<div class="row"><button class="ghost" data-act="bk-copy">' + ic('copy') + '複製備份碼</button><button class="ghost" data-act="bk-file">' + ic('down') + '下載備份檔</button></div>' +
    '<label class="field"><span>還原：貼上備份碼，或選備份檔</span><textarea id="rsTxt" rows="2" placeholder="REIGNITE1:…"></textarea></label>' +
    '<div class="row"><button class="ghost" data-act="rs-apply">用備份碼還原</button><label class="ghost filebtn">選備份檔<input type="file" id="rsFile" accept=".json,.txt,application/json,text/plain"></label></div>' +
    '<h4>其他</h4>' +
    '<button class="ghost wide" data-act="sync">' + ic('watch') + 'Apple Watch 同步說明</button>' +
    '<button class="ghost wide" data-act="replay">重看開場</button>' +
    '<button class="danger-ghost wide" data-act="reset">清除所有紀錄，從頭開始</button>' +
    '<p class="about">重新點火 REIGNITE　版本 ' + VERSION + '<br>痞子葳專屬的減重 App。不是醫療器材，數字只供參考。</p>';
}
function backupCode() { const j = JSON.stringify(S); return 'REIGNITE1:' + btoa(unescape(encodeURIComponent(j))); }
function readBackup(txt) {
  txt = (txt || '').trim(); if (!txt) return null;
  try { const j = txt.startsWith('REIGNITE1:') ? decodeURIComponent(escape(atob(txt.slice(10)))) : txt; const s = JSON.parse(j); if (s && s.v === 1 && s.days) return s; } catch (e) { /* 格式不對 */ }
  return null;
}
async function restoreFrom(txt) {
  const s = readBackup(txt); if (!s) { toast('讀不懂這個備份。請確認是重新點火的備份碼或備份檔。', 'warn'); return; }
  const n = Object.keys(s.days).length;
  const ok = await ask({ title: '用這份備份還原？', body: '<p>備份裡有 ' + n + ' 天的紀錄。現在這支手機上的紀錄會被換掉。</p>', ok: '還原', danger: true });
  if (!ok) return;
  S = migrate(Object.assign(fresh(), s)); save(); closeSheet(); updateShip(); render(); toast('還原完成。歡迎回來，艦長。');
}
async function downloadBackup() {
  const name = 'reignite-backup-' + today() + '.json'; const data = JSON.stringify(S);
  if (IS_WEB) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    S.backup = Date.now(); save(); reSheet(); return;
  }
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (!dl) { toast('這裡不能下載檔案，請改用「複製備份碼」。', 'warn'); return; }
  try { await dl.save({ filename: name, data }); S.backup = Date.now(); save(); reSheet(); } catch (e) { toast('沒有下載。可以改用「複製備份碼」。', 'warn'); }
}

/* ───────── 第一次啟動：甦醒 → 艦長資料 → 燃料習慣 → 安全 → 點火 ───────── */
const Intro = { w: '', goal: '', name: '痞子葳', rb: 2, sw: 2, spo2: 94, ack: false };
function showIntro() { openModal('<div class="intro" id="intro"></div>', 'intro'); introStep(0); }
function introStep(n) {
  const r = $('#intro'); if (!r) return; Intro.step = n;
  const dots = '<div class="in-dots">' + [0, 1, 2, 3, 4].map((i) => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</div>';
  if (n === 0) {
    const L = ['……維生系統偵測到生命跡象。', '早安，艦長' + esc(Intro.name) + '。', '我是螢，餘燼號的船載系統。', '你睡了三百七十一天。燈塔熄了，船也壞了一大半。', '沒關係。我們一天修一點。'];
    r.innerHTML = '<div class="wake">' + L.map((l, i) => '<p style="--d:' + (0.4 + i * 1.1) + 's">' + l + '</p>').join('') + '<button class="primary" data-act="in-next" style="--d:' + (0.6 + L.length * 1.1) + 's">起來</button></div>';
    return;
  }
  if (n === 1) {
    const sug = parseFloat(Intro.w) > 40 ? f1(Math.round(parseFloat(Intro.w) * 0.9)) : '';
    r.innerHTML = dots + '<h2>艦長資料</h2><p class="in-p">螢需要知道我們從哪裡開始。這些之後都能在設定裡改。</p>' +
      '<label class="field"><span>名字</span><input id="iName" type="text" maxlength="12" value="' + esc(Intro.name) + '"></label>' +
      '<label class="field"><span>現在的體重</span><span class="inl"><input id="iW" type="number" inputmode="decimal" step="0.1" placeholder="例如 92.5" value="' + esc(Intro.w) + '"><em>kg</em></span></label>' +
      '<label class="field"><span>目標體重</span><span class="inl"><input id="iGoal" type="number" inputmode="decimal" step="0.1" placeholder="' + (sug || '例如 83') + '" value="' + esc(Intro.goal) + '"><em>kg</em></span></label>' +
      '<p class="hint">建議先設一段：減 10% 左右（' + (sug ? sug + ' 公斤' : '例如 92 → 83') + '）。減掉 5～10% 的體重，血脂通常就會開始改善；到了再往下調。</p>' +
      '<button class="primary wide" data-act="in-next">下一步</button>';
    return;
  }
  if (n === 2) {
    const st = (k, label, unit) => '<div class="in-step"><b>' + label + '</b><div class="wpick sm"><button class="rnd" data-act="in-cnt" data-k="' + k + '" data-d="-1" aria-label="少一">' + ic('minus') + '</button><div class="wval"><b>' + Intro[k] + '</b><span>' + unit + '</span></div><button class="rnd" data-act="in-cnt" data-k="' + k + '" data-d="1" aria-label="多一">' + ic('plus') + '</button></div></div>';
    r.innerHTML = dots + '<h2>燃料習慣</h2><p class="in-p">老鍋之後會用這個數字幫你排降級路線。照平常的樣子填，不用美化。</p>' +
      st('rb', '紅牛，平常一天大約', '罐') + st('sw', '甜食、餅乾，平常一天大約', '份') +
      '<button class="primary wide" data-act="in-next">下一步</button>';
    return;
  }
  if (n === 3) {
    r.innerHTML = dots + '<h2>安全第一</h2><p class="in-p">引擎試車（散步）會從平地慢走 10 分鐘開始，一階一階解鎖。出門前會先做安全檢查。</p>' +
      '<label class="field"><span>運動血氧門檻</span><span class="inl"><input id="iSpo2" type="number" inputmode="numeric" min="80" max="99" value="' + Intro.spo2 + '"><em>%</em></span></label>' +
      '<p class="hint">低於這個數字就不試車。先用保守的 94%，回診時請醫生給你一個數字再改。</p>' + emergencyHTML() +
      '<label class="check"><input type="checkbox" id="iAck"' + (Intro.ack ? ' checked' : '') + '><span>我知道：不舒服就停下來，停下來也算完成。</span></label>' +
      '<button class="primary wide" data-act="in-next">下一步</button>';
    return;
  }
  r.innerHTML = dots + '<div class="in-ign"><h2>準備點火</h2><p class="in-p">按住下面的按鈕，把餘燼號的系統重新點起來。</p><button class="hold" id="holdBtn" data-hold="boot"><span class="hold-fill"></span><b>按住點火</b></button></div>';
}
function introNext() {
  const n = Intro.step;
  if (n === 1) {
    Intro.name = ($('#iName').value || '').trim() || '痞子葳';
    Intro.w = $('#iW').value; Intro.goal = $('#iGoal').value;
    const w = parseFloat(Intro.w), g = parseFloat(Intro.goal);
    if (!(w >= 30 && w <= 250)) { toast('請填現在的體重（30 到 250 公斤）。', 'warn'); return; }
    if (!(g >= 30 && g < w - 0.9)) { toast('目標體重要比現在的體重輕至少 1 公斤。', 'warn'); return; }
  }
  if (n === 3) {
    const v = parseInt($('#iSpo2').value, 10); Intro.spo2 = v >= 80 && v <= 99 ? v : 94;
    Intro.ack = $('#iAck').checked; if (!Intro.ack) { toast('請先勾選「不舒服就停下來」。', 'warn'); return; }
  }
  Sound.play('ok'); introStep(n + 1);
}
function doBoot() {
  const k = today(); const w = r1(parseFloat(Intro.w)); const g = r1(parseFloat(Intro.goal));
  S.p.name = Intro.name; S.p.w0 = w; S.p.goal = g; S.p.rb0 = Intro.rb; S.p.sw0 = Intro.sw; S.p.start = k;
  S.safe.spo2 = Intro.spo2; S.intro = true; S.lastOpen = k; S.ch[1] = Date.now();
  S.lad.rb.at = k; S.lad.sw.at = k; weekRoll();
  const d = day(k); d.w = w; d.wt = Date.now(); gain(10, '晨間校準');
  Sound.play('ignite'); haptic(60);
  const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 2600);
  closeModal(); go('bridge');
  afterAction({ line: '系統重新上線。第一天的任務已經完成一項：你量了自己。航誌第一章在「航誌」分頁。', sys: 'hull', drop: false });
  setTimeout(() => openReader(1), 2200);
}
/* 按住按鈕：開場點火、燈塔點火共用 */
let holdT = 0, holdStart = 0;
function holdBegin(btn) {
  holdStart = performance.now(); btn.classList.add('holding'); Sound.play('soft');
  const fill = btn.querySelector('.hold-fill');
  const step = (t) => {
    const p = Math.min(1, (t - holdStart) / 1300); if (fill) fill.style.transform = 'scaleX(' + p + ')';
    if (p >= 1) { holdT = 0; btn.classList.remove('holding'); const kind = btn.dataset.hold; if (kind === 'boot') doBoot(); else doLight(); return; }
    holdT = requestAnimationFrame(step);
  };
  holdT = requestAnimationFrame(step);
}
function holdEnd(btn) { if (!holdT) return; cancelAnimationFrame(holdT); holdT = 0; btn.classList.remove('holding'); const fill = btn.querySelector('.hold-fill'); if (fill) fill.style.transform = 'scaleX(0)'; }

/* ───────── 操作分派 ───────── */
let stepT = 0;
function wStep(dir) {
  const inp = $('#wIn'); if (!inp) return; let v = parseFloat(inp.value); if (!(v > 0)) v = W.v || 80;
  v = r1(v + dir * 0.1); inp.value = f1(v); W.v = v; Sound.play('tap');
}
document.addEventListener('pointerdown', (e) => {
  const st = e.target.closest('[data-act="w-step"]');
  if (st) { e.preventDefault(); const dir = +st.dataset.d; wStep(dir); let delay = 420; const rep = () => { wStep(dir); delay = Math.max(50, delay * 0.8); stepT = setTimeout(rep, delay); }; stepT = setTimeout(rep, delay); return; }
  const hb = e.target.closest('.hold'); if (hb) { e.preventDefault(); holdBegin(hb); }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => document.addEventListener(ev, (e) => {
  clearTimeout(stepT); stepT = 0;
  const hb = document.querySelector('.hold.holding'); if (hb && (ev !== 'pointerleave' || e.target === hb)) holdEnd(hb);
}, true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if ($('#dialog').classList.contains('on')) return; if ($('#sheet').classList.contains('on')) closeSheet(); else if ($('#modal').classList.contains('on') && modalKind !== 'intro' && modalKind !== 'crave') closeModal(); }
  const hb = e.target.closest && e.target.closest('.hold'); if (hb && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (hb.dataset.hold === 'boot') doBoot(); else doLight(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'docOK') { S.safe.doc = t.checked; save(); render(); toast(t.checked ? '已記錄：醫生同意。快走以上的階段可以解除封印了。' : '已取消醫生同意。'); }
  if (t.id === 'wDate') { W.k = t.value || today(); const d = dayOf(W.k); if (d && d.w != null) W.v = d.w; reSheet(); }
  if (t.id === 'rsFile' && t.files && t.files[0]) { const fr = new FileReader(); fr.onload = () => restoreFrom(String(fr.result)); fr.readAsText(t.files[0]); }
});
document.addEventListener('click', async (e) => {
  const hs = e.target.closest('.hot rect[data-sys]');
  if (hs) { const k = hs.dataset.sys; Sound.play('tap'); go('dock'); setTimeout(() => { const el = $('#sys-' + k) || $('.sys.beacon'); if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' }); }, 60); return; }
  const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
  const act = a.dataset.act, v = a.dataset.v;
  if (act === 'w-step') { if (e.detail === 0) wStep(+a.dataset.d); return; }
  if (act === 'doc') return;
  if (act !== 'tab') Sound.play('tap');
  switch (act) {
    case 'tab': Sound.play('soft'); go(v); break;
    case 'sound': S.set.sound = !S.set.sound; save(); if (S.set.sound) { Sound.ensure(); Sound.play('ok'); } renderHUD(); break;
    case 'settings': openSheet(sheetSettings); break;
    case 'sheet-close': closeSheet(); break;
    case 'modal-close': closeModal(); render(); break;
    case 'install-x': S.set.install = true; save(); render(); break;
    /* 量體重 */
    case 'open-w': W.v = null; W.k = null; openSheet(sheetWeigh); setTimeout(() => { const i = $('#wIn'); if (i && !('ontouchstart' in window)) i.select(); }, 80); break;
    case 'w-past': W.v = null; W.k = addD(today(), -1); openSheet(sheetWeigh); break;
    case 'w-edit': W.v = null; W.k = a.dataset.k; openSheet(sheetWeigh); break;
    case 'w-save': saveWeigh(); break;
    case 'w-del': { const k = ($('#wDate') && $('#wDate').value) || today(); const ok = await ask({ title: '刪除 ' + fmtYMD(k) + ' 的體重？', ok: '刪除', danger: true }); if (ok) { const d = dayOf(k); if (d) delete d.w; closeSheet(); save(); render(); } break; }
    /* 燃料 */
    case 'open-f': F.s = null; F.ty = null; F.tg = []; F.x = []; openSheet(sheetFuel); break;
    case 'f-slot': F.s = v; reSheet(); break;
    case 'f-type': F.ty = F.ty === v ? null : v; F.x = []; reSheet(); break;
    case 'f-tag': F.tg = F.tg.includes(v) ? F.tg.filter((x) => x !== v) : F.tg.concat(v); reSheet(); break;
    case 'f-swap': { const s = D.swaps[F.ty][+a.dataset.i]; F.x = F.x.includes(s) ? F.x.filter((x) => x !== s) : F.x.concat(s); reSheet(); break; }
    case 'f-repeat': { const m = recentMeals()[+a.dataset.i]; if (m) { F.ty = m.ty; F.tg = (m.tg || []).slice(); F.x = (m.x || []).filter((x) => D.swaps[m.ty].includes(x)); reSheet(); } break; }
    case 'f-save': saveMeal(); break;
    case 'f-del': { const d = dayOf(today()); if (!d || !d.m) break; const m = d.m.find((x) => x.id === a.dataset.id); if (!m) break; d.m = d.m.filter((x) => x !== m); if (m.sp) { S.sp = Math.max(0, S.sp - m.sp); S.spLife = Math.max(0, S.spLife - m.sp); } save(); reSheet(); render(); break; }
    case 'cnt': bump(a.dataset.k, +a.dataset.d, a); break;
    case 'cnt-zero': { const k = a.dataset.k; const d = day(today()); if (d[k] == null) { d[k] = 0; gain(2, '誠實記帳'); } afterAction({ line: k === 'rb' ? '今天零罐，記下來了。' + (S.ch[3] ? '老鍋偷偷比了個讚。' : '') : '今天沒吃甜食，記下來了。', from: a, drop: false }); break; }
    /* 引擎 */
    case 'open-e': walkReset(); openSheet(sheetWalk); break;
    case 'e-q': { const pre = $('#ePre'); if (pre) Walk.pre = pre.value; Walk[a.dataset.k] = v; reSheet(); break; }
    case 'e-start': { const pre = $('#ePre'); if (pre) Walk.pre = pre.value; const pv = parseFloat(Walk.pre); if (pv > 0 && pv < S.safe.spo2) { reSheet(); break; } Walk.half = Walk.q2 === 'some'; Walk.step = 'run'; Walk.t0 = Date.now(); Walk.reached = false; reSheet(); Sound.play('ignite'); Walk.tm = setInterval(walkTick, 500); break; }
    case 'e-manual': { const pre = $('#ePre'); if (pre) Walk.pre = pre.value; Walk.step = 'manual'; reSheet(); break; }
    case 'e-min': Walk.manual = clamp(Walk.manual + (+a.dataset.d), 1, 120); { const el = $('#eMin'); if (el) el.textContent = Walk.manual; } break;
    case 'e-stop': clearInterval(Walk.tm); Walk.tm = 0; Walk.el = Math.floor((Date.now() - Walk.t0) / 1000); Walk.stopped = true; Walk.step = 'stop'; Sound.play('stop'); reSheet(); break;
    case 'e-done': clearInterval(Walk.tm); Walk.tm = 0; Walk.el = Math.floor((Date.now() - Walk.t0) / 1000); Walk.step = 'post'; reSheet(); break;
    case 'e-feel': { const p = $('#ePost'); if (p) Walk.post = p.value; Walk.feel = v; reSheet(); break; }
    case 'e-save': { const p = $('#ePost'); if (p) Walk.post = p.value; saveWalk(); break; }
    case 'e-skip': { const pre = $('#ePre'); if (pre) Walk.pre = pre.value; saveWalk('skip'); break; }
    /* 嘴饞警報 */
    case 'crave': Crave.open(); break;
    case 'cr-what': Crave.what = v; Crave.step2(); break;
    case 'cr-mode': Crave.start(v); break;
    case 'cr-result': Crave.result(false); break;
    case 'cr-done': Crave.done(v, +(a.dataset.s || 0)); break;
    case 'cr-close': closeModal(); break;
    /* 休整日、補給艙、事件 */
    case 'rest': {
      if (S.rest <= 0) { toast('休整日用完了。每累計 7 天會送一張。'); break; }
      const ok = await ask({ title: '今天用一張休整日？', body: '<p>今天不用做任務，連續航行不會斷。剩 ' + S.rest + ' 張，用掉後剩 ' + (S.rest - 1) + ' 張。</p><p class="muted">聚餐、出遠門、身體不舒服的日子都可以用。不用找理由。</p>', ok: '用一張' });
      if (ok) { day(today()).rest = 1; S.rest--; save(); setComm('今天是休整日。好好休息，明天見。'); render(); }
      break;
    }
    case 'supply': {
      const d = day(today()); if (d.drop) break; d.drop = 1; Sound.play('open');
      const n = 8 + Math.floor(Math.random() * 18); gain(n, '補給艙'); const it = Math.random() < 0.3 ? roll(0.2) : null;
      FX.burst(a.getBoundingClientRect().left + 40, a.getBoundingClientRect().top + 30, '#ffd27a', 30, 1.4);
      afterAction({ line: it ? '補給艙裡有星火 ' + n + '，還有一件「' + it.name + '」。' : '補給艙裡有星火 ' + n + '。', item: it, from: a, drop: false });
      break;
    }
    case 'ev-claim': { if (!S.wk || S.wk.claimed) break; S.wk.claimed = true; gain(80, '航道事件'); const it = roll(0.5); afterAction({ line: '航道事件完成。夜行在星圖上畫了一個小小的勾。', item: it, from: a, drop: false }); break; }
    /* 船塢 */
    case 'repair': {
      const k = a.dataset.k; const lv = S.sys[k]; const cost = D.cost[lv]; if (lv >= 8 || S.sp < cost) break;
      S.sp -= cost; S.sys[k]++; Sound.play('repair'); haptic(25);
      const r = a.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, D.systems[k].color, 36, 1.3);
      const mod = D.systems[k].mods[lv]; const ups = refresh(); save(); render();
      toast('<b>修好了：' + esc(mod) + '</b><br>' + D.systems[k].name + ' ' + S.sys[k] + '/8' + (S.ch[8] ? '　螢的記憶 ' + Math.round(memoryPct() * 100) + '%' : ''));
      setComm(D.systems[k].name + '的「' + mod + '」修好了。' + (S.sys[k] === 8 ? '整個系統都回來了。' : ''));
      for (const c of ups) queue.push({ type: 'chapter', c }); setTimeout(nextQueued, 600);
      break;
    }
    case 'paint': {
      const p = D.paints.find((x) => x.id === a.dataset.id); if (!p) break;
      if (!S.paints.includes(p.id)) { if (S.sp < p.cost) break; S.sp -= p.cost; S.paints.push(p.id); Sound.play('repair'); }
      S.paint = p.id; applyPaint(); save(); render(); toast('換上塗裝：' + p.name); break;
    }
    case 'item': { const it = D.items.find((x) => x.id === a.dataset.id); if (!it) break; const R = D.rarity[it.r]; ask({ title: esc(it.name), body: '<p class="it-r" style="color:' + R.color + '">' + R.name + '貨物</p><p>' + esc(it.text) + '</p>', ok: '收好', cancel: false }); break; }
    /* 航誌 */
    case 'read': openReader(+a.dataset.id); break;
    /* 醫療艙 */
    case 'lab-add': openSheet(sheetLab); break;
    case 'lab-tgt': openSheet(sheetTargets); break;
    case 'lab-save': {
      const k = $('#lDate').value || today(); const rec = { k };
      let any = false; for (const m of LABS) { const x = parseFloat($('#l_' + m.id).value); if (x > 0) { rec[m.id] = Math.round(x); any = true; } }
      if (!any) { toast('至少填一個數字。', 'warn'); break; }
      const before = bossHP(); S.labs = S.labs.filter((x) => x.k !== k); S.labs.push(rec); gain(30, '回診紀錄');
      const after = bossHP(); closeSheet();
      afterAction({ line: before != null && after != null && after < before - 0.005 ? '濁流的血條掉了 ' + Math.round((before - after) * 100) + '%。這是你每天記帳、換燃料換來的。' : before == null ? '第一份報告記下來了。下次回診，就能看濁流掉了多少血。' : '報告記下來了。數字有起伏很正常，抽血前有沒有空腹也會影響，跟醫生討論最準。', drop: false });
      if (tab !== 'med') go('med');
      break;
    }
    case 'lab-del': { const ok = await ask({ title: '刪除 ' + fmtYMD(a.dataset.k) + ' 的報告？', ok: '刪除', danger: true }); if (ok) { S.labs = S.labs.filter((x) => x.k !== a.dataset.k); save(); render(); } break; }
    case 'tgt-save': { for (const m of LABS) { const x = parseFloat($('#t_' + m.id).value); if (x > 0) S.tgt[m.id] = Math.round(x); } save(); closeSheet(); render(); toast('目標已更新。'); break; }
    case 'o2-add': openSheet(sheetO2); break;
    case 'o2-save': {
      const x = parseInt($('#o2In').value, 10); if (!(x >= 70 && x <= 100)) { toast('血氧要在 70 到 100 之間。', 'warn'); break; }
      const k = today(); const first = !S.spo2.some((y) => y.k === k); S.spo2.push({ k, v: x, src: 'manual' }); if (first) gain(3 + S.sys.o2, '血氧紀錄');
      closeSheet(); afterAction({ line: x < S.safe.spo2 ? '血氧 ' + x + '%，低於你設定的門檻。今天的引擎試車先休息；如果覺得喘、不舒服，請聯絡醫生。' : '血氧 ' + x + '% 記下來了。' + (S.ch[5] ? pick(D.lines.sprout) : ''), sys: 'o2', drop: false });
      break;
    }
    case 'sync': openSheet(sheetSync); break;
    case 'sync-paste': {
      let txt = ''; try { txt = navigator.clipboard && navigator.clipboard.readText ? await navigator.clipboard.readText() : ''; } catch (err) { txt = ''; }
      if (!txt) { toast('讀不到剪貼簿。請長按下面的框，選「貼上」，再按「套用框裡的數據」。', 'warn'); const t = $('#syncTxt'); if (t) t.focus(); break; }
      applySync(txt); break;
    }
    case 'sync-apply': applySync(($('#syncTxt') || {}).value); break;
    case 'tier-up': { if (!tierReady()) break; S.eng.tier++; S.eng.good = 0; gain(40, '解除封印'); Sound.play('unlock'); afterAction({ line: '封印解除：' + D.tiers[S.eng.tier - 1].name + '。' + (S.ch[6] ? '阿索說：「慢慢踩，別一次踩到底。」' : '一樣，不舒服就停。'), sys: 'engine', drop: false }); break; }
    case 'tier-down': { const ok = await ask({ title: '退回「' + D.tiers[S.eng.tier - 2].name + '」？', body: '<p>不會扣任何東西。身體需要慢一點的時候，退一階是對的。</p>', ok: '退回' }); if (ok) { S.eng.tier--; S.eng.good = 0; save(); render(); } break; }
    case 'safe-save': {
      const s = parseInt($('#sSpo2').value, 10); const h = parseInt($('#sHr').value, 10);
      if (!(s >= 80 && s <= 99)) { toast('血氧門檻要在 80 到 99 之間。', 'warn'); break; }
      S.safe.spo2 = s; S.safe.hr = h >= 80 && h <= 200 ? h : null; save(); render(); toast('安全設定已儲存。'); break;
    }
    /* 設定 */
    case 'set-save': {
      const w0 = parseFloat($('#pW0').value), g = parseFloat($('#pGoal').value);
      if (!(w0 >= 30 && w0 <= 250) || !(g >= 30 && g < w0 - 0.9)) { toast('目標體重要比起始體重輕至少 1 公斤。', 'warn'); break; }
      S.p.name = ($('#pName').value || '').trim() || '痞子葳'; S.p.w0 = r1(w0); S.p.goal = r1(g);
      const rb = parseInt($('#pRb').value, 10), sw = parseInt($('#pSw').value, 10); if (rb >= 0 && rb <= 10) S.p.rb0 = rb; if (sw >= 0 && sw <= 10) S.p.sw0 = sw;
      const ups = refresh(); save(); closeSheet(); updateShip(); render(); toast('設定已儲存。');
      for (const c of ups) queue.push({ type: 'chapter', c }); setTimeout(nextQueued, 500); break;
    }
    case 'bk-copy': { const code = backupCode(); try { await navigator.clipboard.writeText(code); S.backup = Date.now(); save(); reSheet(); toast('備份碼已複製。貼到記事本或傳給自己存起來。'); } catch (err) { const t = $('#rsTxt'); if (t) { t.value = code; t.select(); } toast('沒辦法自動複製，備份碼放在下面的框裡了，請手動複製。', 'warn'); } break; }
    case 'bk-file': downloadBackup(); break;
    case 'rs-apply': restoreFrom(($('#rsTxt') || {}).value); break;
    case 'replay': closeSheet(); openModal('<div class="intro" id="intro"></div>', 'intro-replay'); introStep(0); $('#intro').querySelector('[data-act="in-next"]').dataset.act = 'modal-close'; break;
    case 'reset': {
      const ok = await ask({ title: '清除所有紀錄？', body: '<p>體重、燃料、試車、修好的船、航誌進度都會刪掉，沒辦法復原。建議先複製一份備份碼。</p>', ok: '全部清除', danger: true });
      if (!ok) break; const ok2 = await ask({ title: '真的要從頭開始？', body: '<p>這是最後一次確認。</p>', ok: '確定清除', danger: true }); if (!ok2) break;
      try { localStorage.removeItem(KEY); } catch (err) { /* 沒有存檔 */ }
      S = fresh(); save(); closeSheet(); Object.assign(Intro, { w: '', goal: '', name: '痞子葳', rb: 2, sw: 2, spo2: 94, ack: false }); updateShip(); render(); showIntro(); break;
    }
    /* 第一次啟動 */
    case 'in-next': introNext(); break;
    case 'in-cnt': { const k = a.dataset.k; Intro[k] = clamp(Intro[k] + (+a.dataset.d), 0, 10); introStep(2); break; }
    case 'range': chartRange = +v; render(); break;
  }
});

/* ───────── 啟動 ───────── */
function boot() {
  try { localStorage.setItem('pzreignite.t', '1'); localStorage.removeItem('pzreignite.t'); } catch (e) { storageOK = false; }
  Stars.init($('#stars')); FX.init($('#fx'));
  applyPaint(); Ship.build();
  const h = location.hash.slice(1); if (TABS.some((t) => t.id === h)) tab = h;
  $('#sheet').addEventListener('click', (e) => { if (e.target.classList.contains('sheet-bg')) closeSheet(); });
  window.addEventListener('hashchange', () => { const x = location.hash.slice(1); if (TABS.some((t) => t.id === x) && x !== tab) { tab = x; render(); } });
  if (!S.intro) { render(); showIntro(); }
  else { onOpen(); render(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.intro && S.lastOpen !== today()) { onOpen(); render(); } });
  Cloud.init(() => { updateShip(); render(); toast('已載入你在其他裝置的紀錄。'); });
  if (IS_WEB && !DEMO && 'serviceWorker' in navigator && ((location.protocol === 'https:' && /github\.io$/.test(location.hostname)) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) navigator.serviceWorker.register('sw.js').catch(() => {});
}
function onOpen() {
  const res = dailyCheck(); const ups = refresh();
  if (res) {
    if (res.saved) setTimeout(() => toast('<b>你離開了 ' + res.saved + ' 天</b><br>已經用 ' + res.saved + ' 張休整日保住連續航行。', 'long'), 900);
    if (res.welcome) queue.push({ type: 'welcome', n: res.welcome });
    for (const u of res.ups) { gain(40, '降級路線'); queue.push({ type: 'ladder', kind: u.kind, r: u.r }); }
    gains.length = 0;
  }
  for (const c of ups) queue.push({ type: 'chapter', c });
  save(); setTimeout(nextQueued, 900);
}
window.RG = { get S() { return S; }, set S(x) { S = x; }, D, trend, coach, hull, bossHP, ladderView, ladderEval, rungs, weekEvent, weekStats, dailyCheck, refresh, parseSync, streak, totalDays, render, go, setClock: (days) => { clockOffset = days * 86400000; }, today, save, readBackup, backupCode, ui: { showIgnite, openReader, showUnlock } };
boot();
