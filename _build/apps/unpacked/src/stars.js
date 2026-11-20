/* 解包 — 遊戲星圖（2026-11-20）
   寫過的每一款（專題＋推坑）是一顆星，排成一座旋臂星系：同一類玩法是同一條旋臂（星座），越舊越靠核心、越新越外圈，
   哪條旋臂最長就是寫最多的類型。星的大小＝熱度（追蹤到的同上最高，沒有就看評論數），顏色＝結論。
   沒看過的星會閃，看過的就靜靜亮著——「探索度」就是看過幾篇。拖曳移動、雙指／滾輪／點兩下縮放，點星星看小卡，
   🎲 直接飛去一顆還沒看過的。四套換裝各畫各的：塗鴉＝噴漆貼紙星、像素＝方塊星、霓虹＝光暈星、紙本＝星圖冊的墨點。
   畫布放在 #view 外面（#view 進場動畫有 transform，會把 fixed 的東西帶著跑）。 */
const STAR_FAM = [
  { id: 'rog', zh: '肉鴿座', en: 'ROGUELIKE', re: /rogue|類 ?rogue|肉鴿|牌組|卡牌|背包|自動戰鬥|地城/i },
  { id: 'rpg', zh: '角色扮演座', en: 'RPG', re: /角色扮演|rpg|類魂|魂系/i },
  { id: 'str', zh: '策略座', en: 'STRATEGY', re: /策略|戰棋|戰略|戰術|塔防|4x|兵棋/i },
  { id: 'sim', zh: '經營座', en: 'SIM', re: /模擬|經營|營造|殖民|自動化|工廠|建造|基地|生活|商店|農/ },
  { id: 'adv', zh: '解謎座', en: 'MYSTERY', re: /解謎|推理|互動|驚悚|恐怖|敘事|視覺小說|^冒險$|點擊/ },
  { id: 'opn', zh: '開放世界座', en: 'OPEN WORLD', re: /開放世界|沙盒/ },
  { id: 'net', zh: '連線座', en: 'ONLINE', re: /多人|合作|線上|mmo|對戰|賽季|派對/i },
  { id: 'act', zh: '動作座', en: 'ACTION', re: /動作|射擊|清版|第一人稱|倖存者|割草|格鬥|平台|跑酷|彈幕/ },
  { id: 'cozy', zh: '療癒座', en: 'COZY', re: /療癒|休閒|益智|拉霸|放置/ },
];
const STAR_ETC = { id: 'etc', zh: '未知星域', en: 'UNCHARTED' };
const STAR_GOOD = /推薦|必玩|閉眼入|冷門神作/, STAR_BAD = /不推薦/;
const STAR = { el: null, cv: null, c: null, W: 0, H: 0, dpr: 1, cam: { x: 0, y: 0, s: 1 }, fit: 1, ext: 400, stars: [], arms: [], dust: [], sel: null,
  filt: 'all', raf: 0, ptr: new Map(), pinch: null, tap: null, lastTap: 0, fly: null, shoot: null, nextShoot: 0, sty: null, dirty: true, fH: '', fN: '', spr: {} };

function starFam(genres) {
  for (const t of genres || []) { const f = STAR_FAM.find((x) => x.re.test(t)); if (f) return f; }
  return STAR_ETC;
}
function starHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function starRnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function starAll() {
  const out = [];
  const add = (k, x) => {
    const lv = liveOf(x.steam); const p = lv && lv.players;
    const heat = (p && p.peak && p.peak.n) || (p && p.n) || (lv && lv.rv && lv.rv.n ? lv.rv.n / 8 : 0);
    out.push({ k, id: x.id, zh: x.zh, en: x.en, steam: x.steam, date: x.date || '', stamp: x.stamp || '', fam: starFam(x.genres), it: x,
      h: Math.max(0, Math.min(1, Math.log10(Math.max(1, heat)) / 5.2)), seen: !!S.seen[k === 'f' ? x.id : 'p:' + x.id], ph: (starHash(x.id) % 628) / 100 });
  };
  ((S.index && S.index.items) || []).forEach((x) => add('f', x));
  ((S.picks && S.picks.items) || []).forEach((x) => add('p', x));
  return out;
}
function starBuild() {
  const all = starAll();
  const L = STAR.filt === 'all' ? all : all.filter((s) => s.k === STAR.filt);
  const by = {}; L.forEach((s) => (by[s.fam.id] = by[s.fam.id] || []).push(s));
  const fams = [...STAR_FAM, STAR_ETC].filter((f) => by[f.id]);
  const F = fams.length || 1; const R0 = 140, D = 78, TW = 0.0042;
  // 沿著螺旋線「等弧長」排星：星再多（一年上千顆）間距也不變，旋臂只是越繞越多圈，各臂是同一條螺旋轉個角度、永遠不會交叉
  const nMax = Math.max(1, ...fams.map((f) => by[f.id].length)); const RS = [R0];
  for (let r = R0, s = 0, nx = D; RS.length < nMax;) { s += 1.5 * Math.sqrt(1 + (TW * r) * (TW * r)); r += 1.5; if (s >= nx) { RS.push(r); nx += D; } }
  let mx = R0;
  STAR.arms = fams.map((f, j) => {
    const list = by[f.id].sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
    const th = -Math.PI / 2 + (j * 2 * Math.PI) / F;
    list.forEach((s, i) => {
      const r = RS[i]; const jit = ((starHash(s.id + 'j') % 1000) / 1000 - 0.5) * 30; const ph = th + TW * r;
      s.x = Math.cos(ph) * r - Math.sin(ph) * jit; s.y = Math.sin(ph) * r + Math.cos(ph) * jit; s.arm = j;
      mx = Math.max(mx, r);
    });
    return { f, list, th, rL: RS[list.length - 1] };
  });
  const RL = mx + 130;   // 星座名排在星系外圈（像黃道十二宮），旋臂用虛線一路指過去：看得出哪條最長，也知道還會往外長
  STAR.arms.forEach((a) => {
    const pa = a.th + TW * RL; a.lx = Math.cos(pa) * RL; a.ly = Math.sin(pa) * RL; a.guide = [];
    for (let r = a.rL + 26; r <= RL - 34; r += 16) { const p = a.th + TW * r; a.guide.push([Math.cos(p) * r, Math.sin(p) * r]); }
  });
  STAR.stars = STAR.arms.flatMap((a) => a.list);
  STAR.all = all; STAR.ext = RL + 70; STAR.TW = TW; STAR.F = F; STAR.D = D;
  const rnd = starRnd(20261120); STAR.dust = [];
  for (let i = 0, nd = Math.min(1600, 420 + STAR.stars.length); i < nd; i++) {   // 星塵沿著旋臂撒，星少的時候也看得出星系的樣子
    const j = Math.floor(rnd() * F); const r = Math.pow(rnd(), 0.62) * STAR.ext * 1.06; const g = (rnd() + rnd() + rnd() - 1.5) * 0.42;
    const ph = -Math.PI / 2 + (j * 2 * Math.PI) / F + TW * r + g * (1.1 - r / (STAR.ext * 1.2));
    STAR.dust.push([Math.cos(ph) * r, Math.sin(ph) * r, rnd(), rnd() < 0.08]);
  }
  STAR.sel = STAR.sel && STAR.stars.find((s) => s.k === STAR.sel.k && s.id === STAR.sel.id) || null;
}

/* ---------- 各套的畫法 ---------- */
function starSty() {
  const id = skinId();
  const S0 = {
    graffiti: { good: '#FFE600', mid: '#ffffff', bad: '#FF2E88', line: 'rgba(255,255,255,.22)', dash: [5, 7], lab: '#FFE600', lab2: '#ffffff', edge: '#111', core: '#FFE600', core2: '#FF2E88', dust: '255,255,255', glow: 0.32, name: '#fff', ring: '#FF2E88' },
    pixel: { good: '#ffec27', mid: '#c2c3c7', bad: '#ff004d', line: 'rgba(41,173,255,.45)', dash: [3, 6], lab: '#ffec27', lab2: '#29adff', edge: '#05061a', core: '#29adff', core2: '#ffec27', dust: '194,195,199', glow: 0, name: '#fff', ring: '#ffec27', px: true },
    neon: { good: '#00f0ff', mid: '#efe6ff', bad: '#ff2bd6', line: 'rgba(0,240,255,.3)', dash: [], lab: '#ff2bd6', lab2: '#00f0ff', edge: '#07030f', core: '#ff2bd6', core2: '#00f0ff', dust: '200,180,255', glow: 0.75, name: '#efe6ff', ring: '#00f0ff' },
    paper: { good: '#c4161c', mid: '#1b1813', bad: '#1f5fa8', line: 'rgba(27,24,19,.32)', dash: [2, 4], lab: '#1b1813', lab2: '#c4161c', edge: '#f3eee2', core: '#c4161c', core2: '#1b1813', dust: '27,24,19', glow: 0, name: '#1b1813', ring: '#c4161c', ink: true },
  }[id] || {};
  return Object.assign({ id }, S0);
}
function starSprite(col, a) {   // 光暈：預先畫好的放射漸層（不用 shadowBlur、不用混色模式）
  const k = col + a; if (STAR.spr[k]) return STAR.spr[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, 64, 64); STAR.spr[k] = cv; return cv;
}
const starCol = (s, y) => (STAR_BAD.test(s.stamp) ? y.bad : STAR_GOOD.test(s.stamp) ? y.good : y.mid);
function starSpark(c, x, y, r) {   // 四角星
  c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath();
}

/* ---------- 畫 ---------- */
const starTo = (wx, wy) => [(wx - STAR.cam.x) * STAR.cam.s + STAR.W / 2, (wy - STAR.cam.y) * STAR.cam.s + STAR.H / 2];
function starDraw(now) {
  const { c, W, H, cam } = STAR; const y = STAR.sty; if (!c) return;
  c.setTransform(STAR.dpr, 0, 0, STAR.dpr, 0, 0); c.clearRect(0, 0, W, H);
  const live = fxOn(); const tt = now / 1000;
  const zs = Math.max(0.75, Math.min(1.7, Math.sqrt(cam.s / STAR.fit)));   // 星星放大但不跟著等比例變大
  if (y.ink) {   // 紙本：星圖冊的同心圓與經線
    const [ox, oy] = starTo(0, 0); c.strokeStyle = 'rgba(27,24,19,.1)'; c.lineWidth = 1;
    for (let r = 160; r < STAR.ext * 1.3; r += 160) { c.beginPath(); c.arc(ox, oy, r * cam.s, 0, 6.2832); c.stroke(); }
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * STAR.ext * 1.3 * cam.s, oy + Math.sin(a) * STAR.ext * 1.3 * cam.s); c.stroke(); }
  }
  // 星塵
  for (const d of STAR.dust) {
    const [x, yy] = starTo(d[0], d[1]); if (x < -4 || yy < -4 || x > W + 4 || yy > H + 4) continue;
    const a = (0.12 + d[2] * 0.4) * (d[3] && live ? 0.6 + 0.4 * Math.sin(tt * 2 + d[2] * 9) : 1);
    c.fillStyle = `rgba(${y.dust},${a.toFixed(3)})`;
    if (y.px) { const z = d[3] ? 3 : 2; c.fillRect(Math.round(x), Math.round(yy), z, z); } else { c.fillRect(x, yy, d[3] ? 2 : 1.3, d[3] ? 2 : 1.3); }
  }
  // 核心
  { const [x, yy] = starTo(0, 0); const r = Math.max(26, 70 * cam.s);
    if (y.px) { c.fillStyle = y.core; for (let k = 3; k >= 1; k--) { c.globalAlpha = 0.18 * (4 - k); const z = Math.round(r * k / 3 / 3) * 3; c.fillRect(Math.round(x - z / 2), Math.round(yy - z / 2), z, z); } c.globalAlpha = 1; }
    else if (y.ink) { c.strokeStyle = y.core; c.lineWidth = 1.5; c.beginPath(); c.arc(x, yy, r * 0.42, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(x, yy, r * 0.28, 0, 6.2832); c.stroke(); c.fillStyle = y.core; c.beginPath(); c.arc(x, yy, 4, 0, 6.2832); c.fill(); }
    else { const sp = starSprite(y.core, 0.55); c.drawImage(sp, x - r, yy - r, r * 2, r * 2); const s2 = starSprite(y.core2, 0.5); c.drawImage(s2, x - r * 0.45, yy - r * 0.45, r * 0.9, r * 0.9); }
  }
  // 旋臂連線＋往星座名的導引點
  c.save(); c.strokeStyle = y.line; c.lineWidth = y.px ? 3 : 1.4; c.setLineDash(y.dash || []);
  for (const a of STAR.arms) {
    if (a.list.length < 2) continue;
    c.beginPath(); a.list.forEach((s, i) => { const [x, yy] = starTo(s.x, s.y); if (i) c.lineTo(x, yy); else c.moveTo(x, yy); }); c.stroke();
  }
  c.restore();
  c.fillStyle = y.line; const gz = y.px ? 3 : 2;
  for (const a of STAR.arms) for (const g of a.guide) { const [x, yy] = starTo(g[0], g[1]); if (x > -4 && yy > -4 && x < W + 4 && yy < H + 4) c.fillRect(Math.round(x - gz / 2), Math.round(yy - gz / 2), gz, gz); }
  // 星（畫面上超過 350 顆就不閃、超過 600 顆就不畫光暈，一年後上千顆也順）
  const vis = []; for (const s of STAR.stars) { const p = starTo(s.x, s.y); if (p[0] > -30 && p[1] > -30 && p[0] < W + 30 && p[1] < H + 30) vis.push([s, p[0], p[1]]); }
  STAR.heavy = vis.length > 350; const lite = vis.length > 600; const tw = live && !STAR.heavy;
  const rCap = Math.max(1.2, STAR.D * cam.s * 0.3);   // 星比間距大就會糊成一團：最大不超過間距的三成
  for (const [s, x, yy] of vis) {
    const col = starCol(s, y); let r = Math.min(rCap, (4.2 + s.h * 6.2) * zs * (lite ? 0.7 : 1)); let al = 1;
    if (lite) { c.globalAlpha = s.seen ? 0.7 : 1; c.fillStyle = col; if (y.px) c.fillRect(Math.round(x - r / 2), Math.round(yy - r / 2), Math.max(2, Math.round(r)), Math.max(2, Math.round(r))); else { c.beginPath(); c.arc(x, yy, Math.max(1.4, r * 0.6), 0, 6.2832); c.fill(); } continue; }
    if (!s.seen) { const w = tw ? 0.5 + 0.5 * Math.sin(tt * 3.1 + s.ph) : 1; al = 0.45 + 0.55 * w; r *= 0.92 + 0.16 * w; }
    else if (!y.ink) al = 0.82;
    c.globalAlpha = al;
    if (y.px) {
      const u = Math.max(2, Math.round(r / 2.4)); const X = Math.round(x), Y = Math.round(yy);
      c.fillStyle = y.edge; c.fillRect(X - u * 1.5 - 1, Y - u / 2 - 1, u * 3 + 2, u + 2); c.fillRect(X - u / 2 - 1, Y - u * 1.5 - 1, u + 2, u * 3 + 2);
      c.fillStyle = col; if (s.k === 'f') { c.fillRect(X - u * 1.5, Y - u / 2, u * 3, u); c.fillRect(X - u / 2, Y - u * 1.5, u, u * 3); } else { c.fillRect(X - u, Y - u, u * 2, u * 2); }
      if (!s.seen && tw && Math.sin(tt * 3.1 + s.ph) > 0.6) { c.fillStyle = '#fff'; c.fillRect(X - u / 2, Y - u / 2, u, u); }
    } else if (y.ink) {
      c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.4;
      if (s.k === 'f') { c.beginPath(); c.arc(x, yy, r * 0.62, 0, 6.2832); c.fill(); c.beginPath(); c.arc(x, yy, r * 0.62 + 3.2, 0, 6.2832); c.stroke(); }
      else { c.beginPath(); c.arc(x, yy, r * 0.7, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(x, yy, 1.8, 0, 6.2832); c.fill(); }
    } else {
      if (y.glow) { const sp = starSprite(col, y.glow); const g = r * (y.id === 'neon' ? 4.2 : 3.2); c.drawImage(sp, x - g, yy - g, g * 2, g * 2); }
      c.fillStyle = col; c.strokeStyle = y.edge; c.lineWidth = y.id === 'neon' ? 0 : 2;
      if (s.k === 'f') { starSpark(c, x, yy, r * 1.35); if (c.lineWidth) c.stroke(); c.fill(); }
      else { c.beginPath(); c.arc(x, yy, r * 0.78, 0, 6.2832); if (c.lineWidth) c.stroke(); c.fill(); if (y.id === 'graffiti') { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * 0.25, yy - r * 0.25, r * 0.22, 0, 6.2832); c.fill(); } }
      if (y.id === 'neon') { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, yy, Math.max(1.4, r * 0.3), 0, 6.2832); c.fill(); }
    }
  }
  c.globalAlpha = 1;
  // 星座名
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const a of STAR.arms) {
    let [x, yy] = starTo(a.lx, a.ly); if (x < -80 || yy < -40 || x > W + 80 || yy > H + 40) continue;
    const fs = Math.round(Math.max(13, Math.min(22, 15 * zs)));
    c.font = `900 ${fs}px ${STAR.fH}`; const t1 = a.f.zh; const t2 = `${a.f.en}・${a.list.length}`;
    c.lineJoin = 'round';
    const hw = c.measureText(t1).width / 2 + 6;   // 半出畫面的星座名推回來（整個在畫面外的就不管）
    if (x < hw && x > -hw) x = hw; else if (x > W - hw && x < W + hw) x = W - hw;
    if (!y.ink) { c.lineWidth = 4; c.strokeStyle = y.edge; c.strokeText(t1, x, yy); }
    c.fillStyle = y.lab; c.fillText(t1, x, yy);
    c.font = `700 ${Math.round(fs * 0.62)}px ${STAR.fN}`;
    if (!y.ink) { c.lineWidth = 3; c.strokeText(t2, x, yy + fs * 0.92); }
    c.fillStyle = y.lab2; c.fillText(t2, x, yy + fs * 0.92);
  }
  // 星名：放大到看得清楚才寫，互相壓到的就不寫（選到的、沒看過的、熱的先寫）
  const names = cam.s * STAR.D >= 58 && vis.length < 160;
  c.font = `800 12px ${STAR.fH}`; c.textAlign = 'left';
  const L = names ? vis.slice().sort((a, b) => (b[0] === STAR.sel) - (a[0] === STAR.sel) || a[0].seen - b[0].seen || b[0].h - a[0].h) : STAR.sel ? vis.filter((v) => v[0] === STAR.sel) : [];
  const box = [];
  for (const [s, x, yy] of L) {
    let nm = s.zh; if (nm.length > 12) nm = nm.slice(0, 11) + '…';
    const ox = x + Math.min(rCap, 10 * zs) + 6, oy = yy + 1; const w = c.measureText(nm).width;
    const b = [ox - 2, oy - 9, ox + w + 2, oy + 9];
    if (s !== STAR.sel && box.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) continue;
    box.push(b);
    if (!y.ink) { c.lineWidth = 3.4; c.strokeStyle = y.edge; c.strokeText(nm, ox, oy); }
    c.fillStyle = y.name; c.fillText(nm, ox, oy);
  }
  // 選到的星：準星
  if (STAR.sel) {
    const [x, yy] = starTo(STAR.sel.x, STAR.sel.y); const r = 20 * zs; const rot = live ? tt * 0.9 : 0.4;
    c.save(); c.translate(x, yy); c.rotate(rot); c.strokeStyle = y.ring; c.lineWidth = y.px ? 3 : 2.2;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(0, 0, r, k * 1.5708 + 0.25, k * 1.5708 + 1.32); c.stroke(); }
    c.restore();
  }
  // 流星
  const sh = STAR.shoot;
  if (sh) {
    const p = (now - sh.t0) / sh.d; if (p >= 1) STAR.shoot = null;
    else {
      const x = sh.x + sh.vx * p, yy = sh.y + sh.vy * p; const tl = 0.22;
      const g = c.createLinearGradient(x - sh.vx * tl, yy - sh.vy * tl, x, yy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, y.ink ? y.core : '#fff');
      c.strokeStyle = g; c.lineWidth = y.px ? 3 : 2; c.globalAlpha = 1 - p * 0.6; c.beginPath(); c.moveTo(x - sh.vx * tl, yy - sh.vy * tl); c.lineTo(x, yy); c.stroke(); c.globalAlpha = 1;
    }
  }
}

/* ---------- 迴圈、鏡頭 ---------- */
function starLoop(now) {
  STAR.raf = 0; if (!STAR.el || document.hidden) return;
  const live = fxOn() && !STAR.heavy;
  if (live && !STAR.dirty && !STAR.fly && !STAR.pinch && now - (STAR.lastDraw || 0) < 31) { STAR.raf = requestAnimationFrame(starLoop); return; }   // 閃爍只要 30 格就夠
  STAR.lastDraw = now;
  if (STAR.fly) {
    const f = STAR.fly; const p = Math.min(1, (now - f.t0) / f.d); const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const ls = Math.log(f.a.s) + (Math.log(f.b.s) - Math.log(f.a.s)) * e;
    STAR.cam = { x: f.a.x + (f.b.x - f.a.x) * e, y: f.a.y + (f.b.y - f.a.y) * e, s: Math.exp(ls) }; STAR.dirty = true;
    if (p >= 1) STAR.fly = null;
  }
  if (live && !STAR.shoot && now > STAR.nextShoot) {
    if (STAR.nextShoot) { const a = Math.random() * 6.28; const sp = Math.max(STAR.W, STAR.H) * 0.55; STAR.shoot = { t0: now, d: 900, x: Math.random() * STAR.W, y: Math.random() * STAR.H * 0.6, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp * 0.6 + 40 }; }
    STAR.nextShoot = now + 5000 + Math.random() * 7000;
  }
  if (live || STAR.dirty || STAR.fly || STAR.shoot) { starDraw(now); STAR.dirty = false; }
  if (live || STAR.fly || STAR.shoot) STAR.raf = requestAnimationFrame(starLoop);
}
function starKick() { STAR.dirty = true; if (!STAR.raf && STAR.el) STAR.raf = requestAnimationFrame(starLoop); }
function starClamp() {
  const k = STAR.cam; k.s = Math.max(STAR.fit * 0.6, Math.min(2.8, k.s));
  const lim = STAR.ext; k.x = Math.max(-lim, Math.min(lim, k.x)); k.y = Math.max(-lim, Math.min(lim, k.y));
}
function starFlyTo(x, y, s, d) { STAR.fly = { t0: performance.now(), d: d || 700, a: Object.assign({}, STAR.cam), b: { x, y, s: Math.max(STAR.fit * 0.6, Math.min(2.8, s)) } }; starKick(); }
function starFitCam(anim) {
  STAR.fit = starFitS();
  if (anim) starFlyTo(0, 0, STAR.fit, 600); else { STAR.cam = { x: 0, y: STAR.H > STAR.W ? 0 : 0, s: STAR.fit }; starKick(); }
}
const starWide = () => STAR.W > STAR.H * 1.3;   // 橫拿、電腦：標題圖例在左、按鈕在右，星系吃滿高度
const starFitS = () => Math.max(120, starWide() ? Math.min(STAR.W - 460, STAR.H - 24) : Math.min(STAR.W - 40, STAR.H - (STAR.H > 520 ? 250 : 150))) / (2 * (STAR.ext - 40));
function starSize() {
  const cv = STAR.cv; if (!cv) return;
  const r = cv.getBoundingClientRect(); STAR.W = r.width; STAR.H = r.height; STAR.dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * STAR.dpr); cv.height = Math.round(r.height * STAR.dpr);
  STAR.c = cv.getContext('2d'); STAR.c.imageSmoothingEnabled = !STAR.sty.px;
}

/* ---------- 畫面（HTML 外框） ---------- */
function starHud() {
  const all = STAR.all || []; const n = all.length; const seen = all.filter((s) => s.seen).length; const pct = n ? Math.round((seen / n) * 100) : 0;
  const y = STAR.sty;
  return `<div class="st-top"><div class="st-ttl"><h2 class="spray-h">遊戲星圖</h2><small>GALAXY・${n} 顆星・${STAR.arms.length} 個星座</small></div>
      <div class="seg st-seg">${[['all', '全部'], ['f', '專題'], ['p', '推坑']].map(([k, t]) => `<button class="${STAR.filt === k ? 'on' : ''}" data-act="stfilt" data-v="${k}">${t}</button>`).join('')}</div></div>
    <div class="st-exp"><b>探索度 <span class="num">${pct}%</span></b><i><em style="transform:scaleX(${(pct / 100).toFixed(3)})"></em></i><small>看過 ${seen}／${n} 篇・沒看過的星會閃，按 🎲 飛過去</small></div>
    <div class="st-leg"><span><i style="background:${y.good}"></i>推薦／必玩</span><span><i style="background:${y.mid}"></i>觀望／特價入</span><span><i style="background:${y.bad}"></i>不推薦</span><span class="st-lk">✦ 專題　● 推坑・越外圈越新</span></div>
    <div class="st-btns"><button class="btn y st-b st-dice" data-act="stdice" aria-label="${seen < n ? '飛去一顆沒看過的' : '隨便挑一顆'}" title="${seen < n ? '飛去一顆沒看過的' : '隨便挑一顆'}">🎲</button><button class="btn st-b" data-act="stzin" aria-label="放大">＋</button><button class="btn st-b" data-act="stzout" aria-label="縮小">－</button><button class="btn st-b" data-act="stfit" aria-label="看全部">⤢</button></div>
    <div class="st-card" id="stcard"></div>`;
}
function starCardHtml(s) {
  if (!s) return '';
  const lv = liveOf(s.steam); const img = headerOf(s.it, lv);
  const sub = s.k === 'f' ? (s.it.headline || s.it.label || '') : (s.it.pitch || s.it.label || '');
  const st = STAR_BAD.test(s.stamp) ? 'bad' : STAR_GOOD.test(s.stamp) ? 'good' : 'mid';
  return `<div class="st-cd in"><button class="st-x" data-act="stclose" aria-label="關閉">✕</button>
    <div class="st-cim">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="st-stp ${st}">${esc(s.stamp || '—')}</span></div>
    <div class="st-cb"><div class="st-ck">${s.k === 'f' ? '專題' : '推坑'}・${esc(s.fam.zh)}・${esc(mdDay(s.date))}${s.seen ? '・看過了' : '・<em>還沒看</em>'}</div><b>${esc(s.zh)}</b><p>${esc(sub)}</p>
      <div class="btnrow"><button class="btn y sm" data-go="${s.k}/${esc(s.id)}">打開${s.k === 'f' ? '專題' : '推坑'}</button><button class="btn sm" data-act="stdice">🎲 下一顆</button></div></div></div>`;
}
function renderStars() {
  STAR.sty = starSty(); starBuild();
  return '<div class="st-ph"></div>';
}
function starsFx() {
  starsStop(true);
  const el = document.createElement('div'); el.id = 'stage'; el.className = 'st sk-' + STAR.sty.id;
  el.innerHTML = `<canvas id="stcv" aria-label="遊戲星圖：拖曳移動、雙指縮放，點星星看小卡"></canvas>${starHud()}`;
  document.body.appendChild(el); document.body.classList.add('st-on');
  STAR.el = el; STAR.cv = el.querySelector('#stcv');
  const cs = getComputedStyle(el.querySelector('.st-ttl h2')); STAR.fH = cs.fontFamily || 'sans-serif';
  STAR.fN = getComputedStyle(el.querySelector('.st-exp .num')).fontFamily || STAR.fH;
  starSize(); starFitCam(false);
  if (STAR.sel) { const s1 = Math.max(STAR.fit * 2.2, 0.9); const w = starWide(); STAR.cam = { x: STAR.sel.x + (w ? (STAR.W * 0.2) / s1 : 0), y: STAR.sel.y + (w ? 0 : (STAR.H * 0.18) / s1), s: s1 }; starClamp(); starCard(STAR.sel); }
  const cv = STAR.cv;
  cv.addEventListener('pointerdown', starDown); cv.addEventListener('pointermove', starMove); cv.addEventListener('pointerup', starUp); cv.addEventListener('pointercancel', starUp);
  cv.addEventListener('wheel', starWheel, { passive: false });
  window.addEventListener('resize', starResize); document.addEventListener('visibilitychange', starKick);
  document.fonts && document.fonts.ready.then(() => starKick());
  // 進場：從核心拉遠
  const s1 = STAR.cam.s; STAR.cam.s = s1 * 2.6; starFlyTo(STAR.cam.x, STAR.cam.y, s1, 900);
  STAR.nextShoot = 0; sfx.whoosh();
}
function starsStop(keepSel) {
  if (STAR.raf) cancelAnimationFrame(STAR.raf); STAR.raf = 0; STAR.fly = null; STAR.shoot = null; STAR.ptr.clear(); STAR.pinch = null;
  window.removeEventListener('resize', starResize); document.removeEventListener('visibilitychange', starKick);
  if (STAR.el) { STAR.el.remove(); STAR.el = null; STAR.cv = null; STAR.c = null; }
  document.body.classList.remove('st-on');
  if (!keepSel) STAR.sel = null;
}
let starRT = 0;
function starResize() { clearTimeout(starRT); starRT = setTimeout(() => { if (!STAR.el) return; const k = STAR.cam.s / STAR.fit; starSize(); STAR.fit = starFitS(); STAR.cam.s = STAR.fit * k; starClamp(); starKick(); }, 120); }

/* ---------- 手勢 ---------- */
function starDown(e) {
  STAR.cv.setPointerCapture && STAR.cv.setPointerCapture(e.pointerId);
  STAR.ptr.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); STAR.fly = null;
  if (STAR.ptr.size === 1) STAR.tap = { x: e.offsetX, y: e.offsetY, t: performance.now(), cx: STAR.cam.x, cy: STAR.cam.y, moved: false };
  if (STAR.ptr.size === 2) {
    const [a, b] = [...STAR.ptr.values()]; STAR.tap = null;
    STAR.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: STAR.cam.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: STAR.cam.x, cy: STAR.cam.y };
  }
}
function starMove(e) {
  if (!STAR.ptr.has(e.pointerId)) return;
  STAR.ptr.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (STAR.pinch && STAR.ptr.size >= 2) {
    const [a, b] = [...STAR.ptr.values()]; const P = STAR.pinch;
    const s = Math.max(STAR.fit * 0.6, Math.min(2.8, P.s * (Math.hypot(a.x - b.x, a.y - b.y) / P.d)));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const wx = P.cx + (P.mx - STAR.W / 2) / P.s, wy = P.cy + (P.my - STAR.H / 2) / P.s;   // 兩指中間那一點固定不動
    STAR.cam = { x: wx - (mx - STAR.W / 2) / s, y: wy - (my - STAR.H / 2) / s, s }; starClamp(); starKick(); return;
  }
  const T = STAR.tap; if (!T) return;
  const dx = e.offsetX - T.x, dy = e.offsetY - T.y;
  if (!T.moved && Math.hypot(dx, dy) > 7) T.moved = true;
  if (T.moved) { STAR.cam.x = T.cx - dx / STAR.cam.s; STAR.cam.y = T.cy - dy / STAR.cam.s; starClamp(); starKick(); }
}
function starUp(e) {
  STAR.ptr.delete(e.pointerId);
  if (STAR.ptr.size < 2) STAR.pinch = null;
  const T = STAR.tap; STAR.tap = null;
  if (!T || T.moved || e.type === 'pointercancel' || performance.now() - T.t > 450) return;
  const now = performance.now();
  if (now - STAR.lastTap < 300 && !starHit(T.x, T.y)) { STAR.lastTap = 0; starZoomAt(T.x, T.y, 2); return; }   // 點兩下放大
  STAR.lastTap = now; starTapAt(T.x, T.y);
}
function starWheel(e) { e.preventDefault(); starZoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0016)); }
function starZoomAt(px, py, k) {
  const s0 = STAR.cam.s; const s = Math.max(STAR.fit * 0.6, Math.min(2.8, s0 * k));
  const wx = STAR.cam.x + (px - STAR.W / 2) / s0, wy = STAR.cam.y + (py - STAR.H / 2) / s0;
  if (k > 1.5 || k < 0.67) starFlyTo(wx - (px - STAR.W / 2) / s, wy - (py - STAR.H / 2) / s, s, 380);
  else { STAR.cam = { x: wx - (px - STAR.W / 2) / s, y: wy - (py - STAR.H / 2) / s, s }; starClamp(); starKick(); }
}
function starHit(px, py) {
  let best = null, bd = 26;
  for (const s of STAR.stars) { const [x, y] = starTo(s.x, s.y); const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = s; } }
  return best;
}
function starTapAt(px, py) {
  const s = starHit(px, py);
  if (s) { starPick(s, false); return; }
  for (const a of STAR.arms) {   // 點星座名：飛過去看整條旋臂
    const [x, y] = starTo(a.lx, a.ly);
    if (Math.abs(px - x) < 56 && Math.abs(py - y) < 22) { const m = a.list[Math.floor(a.list.length / 2)]; sfx.whoosh(); starFlyTo((m.x + a.lx) / 2, (m.y + a.ly) / 2, Math.max(STAR.cam.s, 0.85)); return; }
  }
  if (STAR.sel) { STAR.sel = null; starCard(null); starKick(); }
}
function starPick(s, fly) {
  STAR.sel = s; sfx.ping(); haptic(8);
  starCard(s);
  const s1 = Math.max(STAR.cam.s, fly ? 0.95 : STAR.cam.s);
  const w = starWide(); const off = w ? (STAR.W * 0.2) / s1 : (STAR.H * 0.18) / s1;   // 小卡在下面（直拿）或右邊（橫拿），星星讓開
  if (fly) starFlyTo(w ? s.x + off : s.x, w ? s.y : s.y + off, s1, 900); else starKick();
}
function starCard(s) {
  const card = $('#stcard'); if (card) card.innerHTML = starCardHtml(s);
  if (STAR.el) STAR.el.classList.toggle('cardon', !!s);
}
function starDice() {
  const pool = STAR.stars.filter((s) => !s.seen && s !== STAR.sel); const L = pool.length ? pool : STAR.stars.filter((s) => s !== STAR.sel);
  if (!L.length) return;
  const s = L[Math.floor(Math.random() * L.length)]; sfx.whoosh(); starPick(s, true);
}
function starAct(a, el) {
  if (a === 'stfilt') { STAR.filt = el.dataset.v; sfx.click(); STAR.sel = null; starBuild(); STAR.el.querySelectorAll('.st-top,.st-exp,.st-leg,.st-btns,.st-card').forEach((x) => x.remove()); STAR.el.insertAdjacentHTML('beforeend', starHud()); STAR.el.classList.remove('cardon'); starFitCam(true); return true; }
  if (a === 'stdice') { starDice(); return true; }
  if (a === 'stzin') { sfx.click(); starZoomAt(STAR.W / 2, STAR.H / 2, 1.8); return true; }
  if (a === 'stzout') { sfx.click(); starZoomAt(STAR.W / 2, STAR.H / 2, 1 / 1.8); return true; }
  if (a === 'stfit') { sfx.whoosh(); starFitCam(true); return true; }
  if (a === 'stclose') { STAR.sel = null; starCard(null); sfx.click(); starKick(); return true; }
  return false;
}
/* 全部功能用 */
function starHubLine() {
  const all = starAll(); const n = all.length; const seen = all.filter((s) => s.seen).length;
  return n ? `探索度 ${Math.round((seen / n) * 100)}%・${n - seen} 顆沒看過` : '寫過的遊戲排成星系';
}
