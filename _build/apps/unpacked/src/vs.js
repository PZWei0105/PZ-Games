/* 解包 — 2026/11/18 超級大更新：開場「今日頭條」連拍、VS 擂台（兩款遊戲正面對決＋粉專二選一圖卡）
   全部只用 App 手上的真實資料：目錄（index.json、picks.json）、Steam 即時資料（live.json）、獵價（願望單、到價）、免費補給站。
   VS 擂台只比「看得到的數字」，每一列寫清楚誰贏、為什麼；不替你決定哪一款比較好玩。 */

/* ---------- 開場：噴完「解包」之後，今天的頭條一張張拍上牆 ---------- */
function introHeadline(box, at) {
  const it = (S.index && S.index.items) || []; const last = it[0] && it[0].date;
  const all = it.filter((x) => x.date === last);
  const today = all.slice(0, 3);
  if (!today.length) return 0;
  let hits = 0, sale = 0, free = 0;
  try { const ts = huntTargets(); hits = ts.filter((t) => t.hit).length; sale = ts.filter((t) => t.onSale).length; } catch (e) { /* 沒有願望單 */ }
  try { free = freeNow().length; } catch (e) { /* */ }
  const pi = (S.picks && S.picks.items) || []; const pl = pi[0] && pi[0].date; const npk = pi.filter((x) => x.date === pl).length;
  const chips = [
    [all.length, last === todayTW() ? '款今日解包' : `款 ${mdDay(last)} 解包`, 'y'],
    npk ? [npk, pl === todayTW() ? '款今日推坑' : '款最新推坑', 'p'] : null,
    hits ? [hits, '款到了目標價', 'g'] : sale ? [sale, '款獵物特價中', 'g'] : null,
    free ? [free, '款限時免費', 'w'] : null,
  ].filter(Boolean);
  const wrap = document.createElement('div'); wrap.className = 'iheads';
  wrap.innerHTML = `<div class="ih-h"><span>${last === todayTW() ? 'TODAY' : 'LATEST'}</span>頭條拍上牆</div>
    <div class="ih-row n${today.length}">${today.map((x, i) => `<div class="ih-p" style="--rt:${rot(x.id, i, 6)}deg;--i:${i}"><div class="ih-img"><img src="${esc(headerOf(x))}" alt="" onerror="this.remove()"></div><b>${esc(x.zh)}</b><small>${esc(x.label || x.kind_label || '')}</small>${i === 2 && all.length > 3 ? `<em class="ih-more">＋${all.length - 3} 款</em>` : ''}<i class="ih-st ${x.stamp === '推薦' ? 'ok' : x.stamp === '觀望' ? 'mid' : 'no'}">${esc(x.stamp || '')}</i></div>`).join('')}</div>
    <div class="ih-chips">${chips.map(([n, t, c], i) => `<span class="ih-c ${c}" style="--i:${i}"><b>${n}</b>${esc(t)}</span>`).join('')}</div>`;
  box.appendChild(wrap);
  at(3250, () => { box.classList.add('heads'); sfx.whoosh(); });
  today.forEach((x, i) => at(3500 + i * 420, () => { const p = $$('.ih-p', wrap)[i]; if (!p) return; p.classList.add('go'); sfx.slap(); haptic(16); burstAt(p, [YEL, PINK, '#fff'], 16, 9); }));
  today.forEach((x, i) => at(3760 + i * 420, () => { const p = $$('.ih-p', wrap)[i]; if (!p) return; p.classList.add('st'); sfx.stamp(); }));
  const tc = 3760 + today.length * 420 + 120;
  at(tc, () => { wrap.classList.add('chips'); sfx.ding(); });
  return tc + 1500;
}

/* ---------- VS 擂台 ---------- */
const VS = { a: null, b: null, raf: 0, timers: [], full: {} };
/** 上擂台前先把兩款的完整稿載進來（遊玩時間在完整稿裡）；最多等 2.5 秒，拿不到就用目錄的資料 */
async function vsPrep(arg) {
  const refs = String(arg || '').split(',').filter(Boolean);
  await Promise.race([Promise.all(refs.map(async (r) => {
    if (VS.full[r]) return;
    const [k, id] = r.split(':');
    try { VS.full[r] = k === 'p' ? await loadPick(id) : await loadFeature(id); } catch (e) { /* 用目錄 */ }
  })), sleep(2500)]);
}
/** 一款遊戲：f:<專題 id> 或 p:<推坑 id> */
function vsGame(ref) {
  if (!ref) return null;
  const [k, id] = String(ref).split(':');
  const it = k === 'p' ? ((S.picks && S.picks.items) || []).find((x) => x.id === id) : ((S.index && S.index.items) || []).find((x) => x.id === id);
  if (!it) return null;
  const lv = liveOf(it.steam);
  return { ref: `${k}:${id}`, kind: k, id, it, lv, full: VS.full[`${k}:${id}`] || null, name: it.zh, en: it.en, img: headerOf(it, lv), hero: heroOf(it, lv) };
}
function vsAll() {
  const out = [];
  for (const it of (S.index && S.index.items) || []) out.push({ ref: 'f:' + it.id, it, k: '專題' });
  for (const it of (S.picks && S.picks.items) || []) out.push({ ref: 'p:' + it.id, it, k: '推坑' });
  return out;
}
const hoursNum = (t) => { const m = /(\d+(?:\.\d+)?)/.exec(t || ''); return m ? +m[1] : null; };
const ZHN = { tc: 2, sc: 1, none: 0 };
/** 對決的每一局：n＝拿來比的數字（null＝這一款沒有資料，這局不算）、better：high／low；沒有 better 的只並列、不分勝負 */
const VS_ROWS = [
  { k: 'stamp', t: 'Claude 的章', show: (g) => g.it.stamp || '—', note: '專題（推薦／觀望／不推薦）和推坑（必玩、閉眼入…）是兩套章，只並列不比' },
  { k: 'price', t: '現在價格', n: (g) => (g.lv && g.lv.free ? 0 : g.lv && g.lv.price && g.lv.price.final != null ? g.lv.price.final : null), better: 'low',
    show: (g) => { const p = g.lv && g.lv.price; return g.lv && g.lv.free ? '免費' : p && p.final != null ? fmtNT(p.final) + (p.disc > 0 ? `<em>-${p.disc}%</em>` : '') : esc(priceLabel(g.it, g.lv) || '—'); } },
  { k: 'rv', t: 'Steam 好評率', n: (g) => (g.lv && g.lv.rv && g.lv.rv.n >= 50 && g.lv.rv.pct != null ? g.lv.rv.pct : null), better: 'high',
    show: (g) => (g.lv && g.lv.rv && g.lv.rv.pct != null ? `${g.lv.rv.pct}%<em>${esc(g.lv.rv.label || '')}・${fmtN(g.lv.rv.n || 0)} 則</em>` : '—') },
  { k: 'recent', t: '近期好評率', n: (g) => { const r = g.lv && g.lv.rv && g.lv.rv.recent; return r && r.n >= 20 && r.pct != null ? r.pct : null; }, better: 'high',
    show: (g) => { const r = g.lv && g.lv.rv && g.lv.rv.recent; return r && r.pct != null ? `${r.pct}%<em>近 ${r.days || 30} 天 ${fmtN(r.n || 0)} 則</em>` : '—'; } },
  { k: 'players', t: '現在同上', n: (g) => (g.lv && g.lv.players && g.lv.players.n != null ? g.lv.players.n : null), better: 'high',
    show: (g) => (g.lv && g.lv.players && g.lv.players.n != null ? `${fmtN(g.lv.players.n)}<em>人</em>` : '—') },
  { k: 'zh', t: '中文', n: (g) => { const z = liveZh(g.lv, g.it.zhs); return z in ZHN ? ZHN[z] : null; }, better: 'high',
    show: (g) => { const z = liveZh(g.lv, g.it.zhs); return z === 'tc' ? '有繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '未知'; } },
  { k: 'money', t: '課金', n: (g) => (g.it.money != null ? g.it.money : null), better: 'low', show: (g) => esc(moneyLabel(g.it.money)) },
  { k: 'time', t: '遊玩時間', show: (g) => esc(g.it.hours || (g.full && g.full.time && g.full.time.text) || (g.full && g.full.game && g.full.game.hours) || '—'), note: '長短看你要什麼，不分勝負' },
  { k: 'rel', t: '上市', show: (g) => esc(g.it.release ? g.it.release.slice(0, 7).replace('-', '/') : (g.it.year ? String(g.it.year) : '—')) },
];
function vsScore(A, B) {
  return VS_ROWS.map((r) => {
    if (!r.better) return { r, w: 0 };
    const a = r.n(A), b = r.n(B);
    if (a == null || b == null || a === b) return { r, w: 0, na: a == null || b == null };
    return { r, w: (r.better === 'high' ? a > b : a < b) ? -1 : 1 };   // -1＝左邊贏、1＝右邊贏
  });
}

function renderVS(arg) {
  vsStop();
  const [ra, rb] = String(arg || '').split(',');
  VS.a = vsGame(ra) ? ra : VS.a; VS.b = vsGame(rb) ? rb : VS.b;
  const A = vsGame(VS.a), B = vsGame(VS.b);
  if (!A || !B) return vsLobby(A, B);
  const sc = vsScore(A, B);
  const wa = sc.filter((x) => x.w === -1).length, wb = sc.filter((x) => x.w === 1).length;
  const side = (g, s) => `<div class="vs-side ${s}" style="--rt:${s === 'l' ? -2.2 : 2.2}deg"><div class="vs-art"><img src="${esc(g.hero || g.img)}" alt="" onerror="this.remove()"></div>
      <div class="vs-name"><b>${esc(g.name)}</b>${g.en && g.en !== g.name ? `<small>${esc(g.en)}</small>` : ''}</div>
      <div class="vs-tags">${(g.it.genres || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      <button class="btn sm ${s === 'l' ? 'p' : 'y'}" data-go="${g.kind === 'p' ? 'p' : 'f'}/${esc(g.id)}">${g.kind === 'p' ? '看推坑' : '看專題'}</button></div>`;
  return `<div class="vs-wrap">
    <div class="vs-top"><button class="back" data-act="back">← 回牆上</button><h2 class="vs-title">VS 擂台</h2><button class="btn sm" data-act="vsswap">左右交換</button></div>
    <div class="vs-stage" id="vsstage">${side(A, 'l')}<div class="vs-mid"><div class="vs-burst"></div><b class="vs-vs">VS</b></div>${side(B, 'r')}</div>
    <div class="vs-score" id="vsscore"><span class="l"><b data-n="${wa}">0</b>局</span><span class="t">數據對決</span><span class="r"><b data-n="${wb}">0</b>局</span></div>
    <div class="vs-rows">${sc.map(({ r, w, na }, i) => `<div class="vs-row ${w === -1 ? 'wl' : w === 1 ? 'wr' : 'tie'}" style="--i:${i}">
        <div class="vs-v l">${r.show(A)}${w === -1 ? '<i class="vs-win">WIN</i>' : ''}</div>
        <div class="vs-k">${esc(r.t)}${!r.better ? '<small>並列</small>' : na ? '<small>資料不足</small>' : w === 0 ? '<small>平手</small>' : ''}</div>
        <div class="vs-v r">${r.show(B)}${w === 1 ? '<i class="vs-win">WIN</i>' : ''}</div></div>`).join('')}</div>
    <div class="vs-verdict" id="vsverdict">${wa === wb ? '<b>平分秋色</b>' : `<b>${esc(wa > wb ? A.name : B.name)}</b> 數據上拿下 ${Math.max(wa, wb)} 局`}<small>只比看得到的數字（價格、評價、同上、中文、課金），不代表哪一款比較好玩；好不好玩看專題、看你的口味。</small></div>
    <div class="vs-card"><h3 class="tape-h p">出成粉專「二選一」</h3>
      <p class="sub-note">一張 4:5 的對決圖卡＋貼文，讓粉絲留言選邊站（只用「遊戲狂想曲」，不放你的名字）。</p>
      <div class="vs-cv"><canvas id="vscv" width="1080" height="1350"></canvas><div class="vs-busy" id="vsbusy">畫圖卡中…</div></div>
      <div class="btnrow"><button class="btn y sm" data-act="vssave">${ICON.dl}<span>存圖卡</span></button><button class="btn sm" data-act="vsshare">${ICON.share}<span>分享</span></button><button class="btn p sm" data-act="vscopy">${ICON.copy}<span>複製貼文</span></button></div>
      <textarea class="hide" id="vspost">${esc(vsPost(A, B))}</textarea></div>
    <div class="btnrow vs-more"><button class="btn sm" data-act="vspick" data-r="${esc(A.ref)}" data-side="r">換掉右邊</button><button class="btn sm" data-act="vspick" data-r="${esc(B.ref)}" data-side="l">換掉左邊</button></div>
  </div>`;
}
function vsLobby(A, B) {
  const slot = (g, s) => g ? `<button class="vs-slot on ${s}" data-act="vspick" data-side="${s}" data-r="${esc((s === 'l' ? B : A) ? (s === 'l' ? B : A).ref : '')}"><div class="vs-art"><img src="${esc(g.img)}" alt="" onerror="this.remove()"></div><b>${esc(g.name)}</b><small>點一下換一款</small></button>`
    : `<button class="vs-slot ${s}" data-act="vspick" data-side="${s}" data-r="${esc((s === 'l' ? B : A) ? (s === 'l' ? B : A).ref : '')}"><b class="vs-q">?</b><small>${s === 'l' ? '選第一款' : '選對手'}</small></button>`;
  return `<div class="vs-wrap lobby">
    <div class="vs-top"><button class="back" data-act="back">← 回牆上</button><h2 class="vs-title">VS 擂台</h2><span></span></div>
    <p class="sub-note">挑兩款解包過或推坑過的遊戲上擂台：價格、評價、同上人數、中文、課金一局一局比，最後還能出成粉專的「二選一」圖卡。</p>
    <div class="vs-stage lobby">${slot(A, 'l')}<div class="vs-mid"><b class="vs-vs">VS</b></div>${slot(B, 'r')}</div>
  </div>`;
}
/** 選對手：列出全部專題與推坑（可以搜尋），點了就上擂台 */
function vsPickSheet(other, side) {
  const all = vsAll().filter((x) => x.ref !== other);
  openSheet(`<h3>選一款上擂台</h3><input class="vs-find" id="vsfind" type="search" placeholder="搜尋遊戲名稱" autocomplete="off">
    <div class="vs-list" id="vslist">${all.map((x) => { const lv = liveOf(x.it.steam); return `<button class="vs-li" data-act="vsset" data-r="${esc(x.ref)}" data-o="${esc(other || '')}" data-side="${side}" data-q="${esc((x.it.zh + ' ' + (x.it.en || '')).toLowerCase())}"><img src="${esc(headerOf(x.it, lv))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span><b>${esc(x.it.zh)}</b><small>${x.k}・${esc(x.it.stamp || '')}${x.it.date ? '・' + esc(mdDay(x.it.date)) : ''}</small></span></button>`; }).join('')}</div>`, 'wide');
  const f = $('#vsfind'); if (f) f.addEventListener('input', () => { const q = f.value.trim().toLowerCase(); $$('#vslist .vs-li').forEach((b) => { b.style.display = !q || b.dataset.q.includes(q) ? '' : 'none'; }); });
}
function vsSet(ref, other, side) {
  closeSheet();
  const pair = side === 'l' ? [ref, other] : [other, ref];
  VS.a = pair[0] || null; VS.b = pair[1] || null;
  sfx.slap();
  const to = 'vs/' + [VS.a || '', VS.b || ''].join(',');
  if (location.hash.replace('#', '') === to) route(); else location.hash = to;
}

function vsFx() {
  const st = $('#vsstage'); if (!st) return;
  const A = vsGame(VS.a), B = vsGame(VS.b);
  if (!A || !B) { $$('.vs-slot', st).forEach((s, i) => { s.style.animationDelay = (i * 0.12) + 's'; s.classList.add('in'); }); return; }
  const T = (ms, fn) => VS.timers.push(setTimeout(fn, ms));
  const rows = $$('.vs-row');
  const calm = !fxOn();
  st.classList.add('go');
  if (!calm) { sfx.riser(); T(380, () => { sfx.drop(); sfx.slap(); shake(18, 420); flash(PINK, 0.55); burstAt($('.vs-vs', st), [YEL, PINK, '#fff'], 46, 18); haptic(40); }); }
  else T(0, () => st.classList.add('done'));
  const t0 = calm ? 0 : 900;
  rows.forEach((r, i) => T(t0 + i * (calm ? 0 : 230), () => { r.classList.add('in'); if (!calm) { if (r.classList.contains('tie')) sfx.tick(); else { sfx.stamp(); const w = $('.vs-win', r); if (w) burstAt(w, [YEL, PINK], 8, 6); } } }));
  const tEnd = t0 + rows.length * (calm ? 0 : 230) + 200;
  T(tEnd, () => {
    $$('#vsscore b').forEach((b) => { const n = +b.dataset.n; if (calm) { b.textContent = n; return; } let k = 0; const step = () => { b.textContent = k; if (k++ < n) VS.timers.push(setTimeout(step, 90)); }; step(); });
    $('#vsscore').classList.add('in'); $('#vsverdict').classList.add('in');
    if (!calm) { sfx.fanfare(); const wa = +$('#vsscore .l b').dataset.n, wb = +$('#vsscore .r b').dataset.n; const win = wa === wb ? null : $(`.vs-side.${wa > wb ? 'l' : 'r'}`, st); if (win) { win.classList.add('crown'); burstAt(win, [YEL, '#fff'], 30, 14); } }
  });
  vsCardRender(A, B);
}
function vsStop() { VS.timers.forEach(clearTimeout); VS.timers = []; }

/* ---------- 粉專二選一圖卡（1080×1350） ---------- */
function vsPost(A, B) {
  const line = (g) => { const p = g.lv && g.lv.price; const bits = [];
    bits.push(g.lv && g.lv.free ? '免費' : p && p.final != null ? fmtNT(p.final) + (p.disc > 0 ? `（-${p.disc}%）` : '') : '');
    if (g.lv && g.lv.rv && g.lv.rv.pct != null) bits.push(`Steam 好評 ${g.lv.rv.pct}%`);
    const z = liveZh(g.lv, g.it.zhs); bits.push(z === 'tc' ? '有繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '');
    return `${g.name}：${bits.filter(Boolean).join('｜')}`; };
  return `【二選一】${A.name} VS ${B.name}\n\n只能留一款在硬碟裡，你留哪一款？\n\n🔴 ${line(A)}\n🟡 ${line(B)}\n\n留言告訴我們 👇 選 🔴 還是 🟡？\n\n#遊戲狂想曲 #二選一 #${String(A.name).replace(/\s+/g, '')} #${String(B.name).replace(/\s+/g, '')}`;
}
async function vsCardRender(A, B) {
  const cv = $('#vscv'); if (!cv) return;
  const busy = $('#vsbusy'); if (busy) busy.style.display = 'grid';
  try {
    const c = cv.getContext('2d'); const W = 1080, H = 1350; const R = rnd(hashStr(A.ref + B.ref));
    c.fillStyle = '#111'; c.fillRect(0, 0, W, H);
    const [ia, ib] = await Promise.all([loadImgCors(A.hero || A.img), loadImgCors(B.hero || B.img)]);
    if (!$('#vscv')) return;
    // 斜切成上下兩半：上紅（左邊那款）、下黃（右邊那款）
    const half = (im, top, col) => {
      c.save(); c.beginPath();
      if (top) { c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.42); c.lineTo(0, H * 0.58); }
      else { c.moveTo(0, H * 0.58); c.lineTo(W, H * 0.42); c.lineTo(W, H); c.lineTo(0, H); }
      c.closePath(); c.clip();
      if (im) { coverDraw(c, im, 0, top ? 0 : H * 0.42, W, H * 0.58); c.fillStyle = 'rgba(17,17,17,.38)'; c.fillRect(0, 0, W, H); }
      else { c.fillStyle = col; c.fillRect(0, 0, W, H); halftone(c, W, H, 'rgba(0,0,0,.18)'); }
      c.fillStyle = top ? 'rgba(255,46,136,.32)' : 'rgba(255,230,0,.26)'; c.fillRect(0, 0, W, H);
      c.restore();
    };
    half(ia, true, '#FF2E88'); half(ib, false, '#FFE600');
    // 中間的斜線與 VS 爆炸
    c.save(); c.strokeStyle = '#111'; c.lineWidth = 26; c.beginPath(); c.moveTo(-20, H * 0.58 + 3); c.lineTo(W + 20, H * 0.42 + 3); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.moveTo(-20, H * 0.58); c.lineTo(W + 20, H * 0.42); c.stroke(); c.restore();
    const cx = W / 2, cy = H / 2;
    c.save(); c.translate(cx, cy); c.rotate(-0.12); c.fillStyle = '#FFE600'; c.beginPath();
    for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2, r = k % 2 ? 150 : 250 + R() * 40; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.82); }
    c.closePath(); c.fill(); c.lineWidth = 10; c.strokeStyle = '#111'; c.stroke(); c.restore();
    c.save(); c.textAlign = 'left'; const vsS = 190; c.font = `900 ${vsS}px ${CFONT}`; const vw = c.measureText('VS').width; stepText(c, 'VS', cx - vw / 2, cy - vsS * 0.56, vsS, '#fff', '#111', '#FF2E88', '#111'); c.restore();
    // 兩款的名字與三個數字
    const block = (g, top) => {
      const maxW = W - 120;
      c.font = `900 84px ${CFONT}`; let lines = wrapText(c, g.name, maxW).slice(0, 2);
      const size = fitSize(c, lines, maxW, 92, 52);
      c.font = `900 ${size}px ${CFONT}`; lines = wrapText(c, g.name, maxW).slice(0, 2);
      const y0 = top ? 96 : H - 96 - lines.length * size * 1.12 - 70;
      lines.forEach((l, i) => stepText(c, l, 60, y0 + i * size * 1.12, size, '#fff', '#111', top ? '#FF2E88' : '#FFE600', '#111'));
      const p = g.lv && g.lv.price; const z = liveZh(g.lv, g.it.zhs);
      const facts = [g.lv && g.lv.free ? '免費' : p && p.final != null ? fmtNT(p.final) + (p.disc > 0 ? ` -${p.disc}%` : '') : null,
        g.lv && g.lv.rv && g.lv.rv.pct != null ? `好評 ${g.lv.rv.pct}%` : null, z === 'tc' ? '有繁中' : z === 'sc' ? '簡中' : z === 'none' ? '無中文' : null].filter(Boolean);
      let x = 60; const fy = y0 + lines.length * size * 1.12 + 18;
      facts.forEach((t, i) => { x += sticker(c, t, x, fy, top ? '#FF2E88' : '#FFE600', top ? '#fff' : '#111', (i % 2 ? 1 : -1) * 0.04, 34) + 18; });
    };
    block(A, true); block(B, false);
    // 角落：留言選邊
    sticker(c, '你留哪一款？👇 留言選 🔴 or 🟡', 60, H * 0.58 + 40, '#fff', '#111', -0.03, 36);
    brandSticker(c, W - 200, H * 0.42 - 120, 0.06);
  } catch (e) { console.warn(e); toast('圖卡畫不出來：' + e.message, 'warn'); }
  if (busy) busy.style.display = 'none';
}
function vsBlob() { const cv = $('#vscv'); return new Promise((res) => { try { cv.toBlob((b) => res(b), 'image/png'); } catch (e) { res(null); } }); }
async function vsAct(a, act) {
  if (a === 'vspick') { vsPickSheet(act.dataset.r || '', act.dataset.side || 'r'); sfx.click(); return true; }
  if (a === 'vsset') { vsSet(act.dataset.r, act.dataset.o || '', act.dataset.side || 'r'); return true; }
  if (a === 'vsswap') { const to = 'vs/' + [VS.b, VS.a].join(','); [VS.a, VS.b] = [VS.b, VS.a]; sfx.scratch(); location.hash = to; return true; }
  if (a === 'vscopy') { const t = $('#vspost'); if (t && await copyText(t.value)) { sfx.stamp(); toast('貼文已複製'); } return true; }
  if (a === 'vssave' || a === 'vsshare') {
    const b = await vsBlob(); if (!b) { toast('圖卡還沒畫好（遊戲圖片可能被擋），等一下再試', 'warn'); return true; }
    const A = vsGame(VS.a), B = vsGame(VS.b); const name = `二選一-${A ? A.name : 'A'}-vs-${B ? B.name : 'B'}.png`.replace(/[\\/:*?"<>|\s]+/g, '_');
    const file = new File([b], name, { type: 'image/png' });
    if (a === 'vsshare' && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: ($('#vspost') || {}).value || '' }); sfx.stamp(); } catch (e) { /* 取消 */ } return true; }
    const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    sfx.stamp(); toast('圖卡存好了'); return true;
  }
  return false;
}
