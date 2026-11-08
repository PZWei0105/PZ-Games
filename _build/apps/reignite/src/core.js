/* ═══════════════ core.js — 日期、存檔、規則（趨勢線、船體、章節、降級路線、事件、魔王）、音效 ═══════════════ */
const VERSION = '1.0.0';
const IS_WEB = !!window.RG_WEB;
const DEMO = IS_WEB && /[?&]demo=1/.test(location.search);
const KEY = DEMO ? 'pzreignite.demo' : 'pzreignite.v1';

/* ───────── 日期（一律用手機的當地時間） ───────── */
let clockOffset = 0;                       // 只給檢查程式用：模擬「過了幾天」
const now = () => new Date(Date.now() + clockOffset);
const pad = (n) => (n < 10 ? '0' : '') + n;
const dk = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dk(now());
const parseK = (k) => { const a = k.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2], 12); };
const addD = (k, n) => { const d = parseK(k); d.setDate(d.getDate() + n); return dk(d); };
const diffD = (a, b) => Math.round((parseK(b) - parseK(a)) / 86400000);
const weekStart = (k) => { const d = parseK(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dk(d); };
const fmtMD = (k) => { const d = parseK(k); return (d.getMonth() + 1) + '/' + d.getDate(); };
const fmtYMD = (k) => { const d = parseK(k); return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(); };
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const r1 = (x) => Math.round(x * 10) / 10;
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ───────── 存檔 ───────── */
const fresh = () => ({
  v: 1, created: Date.now(), upd: 0, intro: false,
  p: { name: '痞子葳', w0: null, goal: null, start: null, age: null, rb0: 2, sw0: 2 },
  safe: { spo2: 94, hr: null, doc: false },
  days: {},
  sp: 0, spLife: 0,
  sys: { fuel: 0, o2: 0, engine: 0 },
  paint: 'stock', paints: ['stock'],
  cargo: {},
  ch: {}, read: {},
  rest: 2, restN: 0,
  eng: { tier: 1, good: 0 },
  lad: { rb: { i: 0, at: null }, sw: { i: 0, at: null } },
  labs: [], tgt: { tc: 200, ldl: 130, hdl: 40, tg: 150 },
  wk: null,
  spo2: [],
  lastOpen: null, goalAt: null, lit: false, bestHull: 0,
  set: { sound: true, install: false },
  backup: 0
});
let mem = null;
function load() {
  if (DEMO) { const s = seedDemo(); return s; }
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return migrate(Object.assign(fresh(), s)); } catch (e) { /* 沒有存檔或讀不到 */ }
  return mem || fresh();
}
function migrate(s) {
  const f = fresh();
  for (const k of ['p', 'safe', 'sys', 'eng', 'tgt', 'set']) s[k] = Object.assign({}, f[k], s[k] || {});
  s.lad = Object.assign({}, f.lad, s.lad || {});
  return s;
}
let S = null;                               // 在檔案最後載入（示範資料要用到後面定義的規則）
let storageOK = true;
function save() {
  S.upd = Date.now();
  if (!DEMO) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { mem = S; storageOK = false; }
  }
  Cloud.soon();
}
let saveT = 0;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 250); };
window.addEventListener('pagehide', () => { if (saveT) { clearTimeout(saveT); save(); } });

/* Claude 版：紀錄跟著 Claude 帳號同步（每個人自己的私人資料夾） */
const Cloud = {
  on: false, ref: null, busy: false, again: false, t: 0, last: '', state: IS_WEB ? 'web' : 'off',
  soon() { if (!this.on) return; clearTimeout(this.t); this.t = setTimeout(() => this.push(), 1500); },
  async push() {
    if (!this.on) return;
    if (this.busy) { this.again = true; return; }
    const body = JSON.stringify(S);
    if (body === this.last) return;
    if (body.length > 900000) { this.state = 'big'; return; }
    this.busy = true;
    try { await this.ref.set({ s: body, upd: S.upd || Date.now() }); this.last = body; this.state = 'ok'; }
    catch (e) { if (e && e.code === 'unavailable') setTimeout(() => this.soon(), 4000 + Math.random() * 3000); else { this.on = false; this.state = 'off'; } }
    this.busy = false;
    if (this.again) { this.again = false; this.soon(); }
  },
  async init(onRemote) {
    if (IS_WEB || !window.claude || typeof window.claude.use !== 'function') return;
    this.state = 'connecting';
    let db = null, user = null, id = null, ref = null, snap = null;
    try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { db = null; }
    if (db && user) { try { id = await user.id(); } catch (e) { id = null; } }
    if (id) { try { ref = db.doc('data/users/' + id + '/progress'); } catch (e) { ref = null; } }
    if (ref) { try { snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 10000))]); } catch (e) { snap = null; } }
    if (!snap) { this.state = 'off'; return; }
    this.ref = ref; this.on = true; this.state = 'ok';
    const d = snap.exists ? snap.data() : null;
    let remote = null; try { remote = d && typeof d.s === 'string' ? JSON.parse(d.s) : null; } catch (e) { remote = null; }
    const lx = S.spLife || 0, rx = remote && remote.v === 1 ? (remote.spLife || 0) : -1;
    if (rx >= 0 && (rx > lx || (rx === lx && (remote.upd || 0) > (S.upd || 0)))) {
      S = migrate(Object.assign(fresh(), remote)); this.last = d.s;
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { mem = S; }
      if (onRemote) onRemote();
    } else if (S.upd) this.push();
  }
};

/* ───────── 每天的紀錄 ───────── */
const day = (k) => S.days[k] || (S.days[k] = {});
const dayOf = (k) => S.days[k] || null;
const doneW = (d) => !!d && d.w != null;
const doneF = (d) => !!d && !!(d.m && d.m.length);
const doneE = (d) => !!d && !!(d.walk && d.walk.length);
const dayDone = (d) => doneW(d) || doneF(d) || doneE(d);
const dayFull = (d) => doneW(d) && doneF(d) && doneE(d);
const counted = (d) => dayDone(d) || !!(d && d.rest);
function totalDays() { let n = 0; for (const k in S.days) if (dayDone(S.days[k])) n++; return n; }
function streak() {
  let k = today(); if (!counted(S.days[k])) k = addD(k, -1);
  let n = 0; while (counted(S.days[k]) && n < 5000) { n++; k = addD(k, -1); }
  return n;
}
function voyageDay() { return S.p.start ? diffD(S.p.start, today()) + 1 : 1; }

/* ───────── 星火 ───────── */
const gains = [];
function gain(n, why) { n = Math.round(n); if (!n) return 0; S.sp += n; S.spLife += n; gains.push({ n, why }); return n; }
const RANKS = [[0, '見習艦長'], [300, '代理艦長'], [1000, '艦長'], [2500, '資深艦長'], [5000, '守燈艦長'], [9000, '傳奇守燈人']];
function rank() { let r = RANKS[0], nx = null; for (let i = 0; i < RANKS.length; i++) if (S.spLife >= RANKS[i][0]) { r = RANKS[i]; nx = RANKS[i + 1] || null; } return { name: r[1], next: nx }; }

/* 每天第一個任務完成時：累積休整日 */
function firstOfDay(k) {
  const d = day(k); if (d.first) return null;
  d.first = 1; S.restN = (S.restN || 0) + 1;
  if (S.restN % 7 === 0 && S.rest < 3) { S.rest++; return 'rest'; }
  return null;
}

/* ───────── 體重：7 日平均、趨勢、船體 ───────── */
function weights() {
  const a = [];
  for (const k of Object.keys(S.days).sort()) { const w = S.days[k].w; if (w != null) a.push({ k, w }); }
  return a;
}
function m7(k, a) {
  const lo = addD(k, -6); let s = 0, n = 0;
  for (let i = a.length - 1; i >= 0; i--) { const e = a[i]; if (e.k > k) continue; if (e.k < lo) break; s += e.w; n++; }
  return n ? s / n : null;
}
function slopeWeek(a, endK, span) {
  const lo = addD(endK, -(span || 28));
  const pts = a.filter((e) => e.k >= lo && e.k <= endK).map((e) => [diffD(lo, e.k), m7(e.k, a)]);
  if (pts.length < 6 || pts[pts.length - 1][0] - pts[0][0] < 10) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = pts.length;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const den = n * sxx - sx * sx; if (!den) return null;
  return ((n * sxy - sx * sy) / den) * 7;
}
function trend() {
  const a = weights(); const out = { a, n: a.length };
  if (!a.length) return out;
  const last = a[a.length - 1];
  out.last = last; out.t = m7(last.k, a);
  out.prev = a.length > 1 ? a[a.length - 2] : null;
  out.wk = (() => { const p = m7(addD(last.k, -7), a); return p == null ? null : out.t - p; })();
  out.slope = slopeWeek(a, last.k, 28);
  out.first = a[0];
  out.age = diffD(a[0].k, last.k);
  const p14 = m7(addD(last.k, -14), a);
  out.d14 = p14 == null ? null : out.t - p14;
  if (out.d14 != null && Math.abs(out.d14) < 0.25) {
    let k = addD(last.k, -14), n = 14;
    while (n < 120) { const v = m7(addD(k, -1), a); if (v == null || Math.abs(out.t - v) >= 0.25) break; k = addD(k, -1); n++; }
    out.plateau = n;
  }
  if (S.p.goal != null && out.slope != null && out.slope < -0.05 && out.t > S.p.goal) {
    const days = (out.t - S.p.goal) / (-out.slope / 7);
    out.etaDays = Math.round(days);
    const d = parseK(today()); d.setDate(d.getDate() + Math.round(days)); out.eta = d;
  }
  return out;
}
function hullOf(t) {
  if (t == null || S.p.w0 == null || S.p.goal == null) return 0;
  const tot = S.p.w0 - S.p.goal; if (tot <= 0) return 0;
  return clamp((S.p.w0 - t) / tot, 0, 1);
}
function hull() { return hullOf(trend().t); }
function beaconParts() { const h = S.bestHull; return D.systems.beacon.req.filter((r) => h >= r - 1e-9).length; }
function memoryPct() { const n = S.sys.fuel + S.sys.o2 + S.sys.engine + beaconParts(); return n / 30; }

/* 數據教練：照規則說真話（不罵人，也不灌迷湯） */
function coach() {
  const T = trend(); const out = { head: '', lines: [], tone: 'calm' };
  const todayK = today(); const g = S.p.goal;
  if (!T.n) { out.head = '還沒有船體數據。'; out.lines.push('起床、上完廁所、吃東西之前量一次。每天同一個時間，數字才比得起來。'); return out; }
  const tdy = T.last.k === todayK;
  if (T.n < 4 || T.age < 6) {
    out.head = '數據還在累積。'; out.lines.push('至少量滿 7 天，7 日均線才會開始說真話。現在的每一個數字都還會跳來跳去，不用理它。');
    if (tdy && T.prev) out.lines.push(dayJump(T));
    return out;
  }
  const wk = T.wk;
  const jl = tdy && T.prev && diffD(T.prev.k, T.last.k) <= 2 ? dayJump(T) : '';
  if (wk != null && wk <= -Math.max(1.0, T.t * 0.01) && T.age >= 14) {
    out.head = '掉得比建議的速度快。'; out.tone = 'warn';
    out.lines.unshift('7 日均線這週下降 ' + f1(-wk) + ' 公斤。燃料不夠，船會出狀況：每一餐都要有蛋白質和青菜，不要刻意少吃。如果覺得頭暈、沒力，先跟醫生聊聊。');
  } else if (wk != null && wk <= -0.6 && T.age < 14) {
    out.head = '前兩週掉得快，很正常。';
    out.lines.unshift('一開始掉的大多是水分和肝醣，不全是脂肪。真正的燃燒速度，第三週以後看得比較清楚。');
  } else if (T.plateau) {
    out.head = '平台期第 ' + T.plateau + ' 天。';
    out.lines.unshift('7 日均線兩週以上幾乎沒動。這幾乎每個人都會遇到，不用砍燃料，照現在的節奏走，通常過一陣子會再往下。可以檢查一下：飲料和宵夜有沒有偷偷變多？');
  } else if (wk != null && wk >= 0.3) {
    out.head = '這週有點偏航。'; out.tone = 'soft';
    out.lines.unshift('7 日均線上升 ' + f1(wk) + ' 公斤。沒關係，船偶爾會偏航。先挑一個最容易換的燃料，例如晚餐那杯飲料，從那裡開始就好。');
  } else if (wk != null && wk < -0.1) {
    out.head = '穩定燃燒中。'; out.tone = 'good';
    out.lines.unshift('7 日均線這週下降 ' + f1(-wk) + ' 公斤，這個速度剛好，不傷身也撐得久。');
  } else {
    out.head = '持平。';
    out.lines.unshift('7 日均線這週幾乎沒變（' + (wk == null ? '數據不夠比' : (wk > 0 ? '+' : '') + f1(wk || 0) + ' 公斤') + '）。持平也是一種穩，下一週再看方向。');
  }
  if (jl) out.lines.unshift(jl);
  if (g != null && T.t <= g) out.lines.push('7 日均線已經到達目標。守燈人的工作開始了：維持在目標上下 2 公斤以內。');
  else if (T.eta) {
    const months = T.etaDays / 30.4;
    out.lines.push('照最近四週的速度，預估 ' + T.eta.getFullYear() + ' 年 ' + (T.eta.getMonth() + 1) + ' 月抵達目標（還要 ' + (months < 1.5 ? T.etaDays + ' 天' : Math.round(months) + ' 個月左右') + '）。這是推估，速度變了它就會變。');
  }
  return out;
}
function dayJump(T) {
  const dj = T.last.w - T.prev.w;
  if (dj >= 0.6) return '今天比上一次量多了 ' + f1(dj) + ' 公斤。這是水分、鹽分，或昨晚的食物還在身體裡，不是脂肪。看均線就好：' + f1(T.t) + '。';
  if (dj <= -0.6) return '今天比上一次少了 ' + f1(-dj) + ' 公斤。先別太興奮，多半也是水分。均線比較準：' + f1(T.t) + '。';
  return '';
}

/* ───────── 章節解鎖 ───────── */
function maxCh() { let m = 1; for (const k in S.ch) if (+k > m) m = +k; return m; }
function chReady(c) {
  const u = c.unlock || {};
  if (u.after) { if (!S.goalAt) return false; const T = trend(); return diffD(S.goalAt, today()) >= u.after && T.t != null && T.t <= S.p.goal + 2; }
  if (!u.days && !u.hull) return true;
  if (u.days && totalDays() >= u.days) return true;
  if (u.hull && S.bestHull >= u.hull - 1e-9) return true;
  return false;
}
function chNeed(c) {
  const u = c.unlock || {}; const parts = [];
  if (u.days) { const n = totalDays(); parts.push('累計航行 ' + u.days + ' 天' + (n < u.days ? '（還差 ' + (u.days - n) + ' 天）' : '')); }
  if (u.hull) parts.push(u.hull >= 1 ? '船體完整度 100%（抵達目標體重）' : '船體完整度 ' + Math.round(u.hull * 100) + '%（目前 ' + Math.round(S.bestHull * 100) + '%）');
  if (u.after) parts.push('抵達目標後，維持 ' + u.after + ' 天');
  return parts.join('，或');
}
/* 更新最高船體、抵達日，回傳新解鎖的章節 */
function refresh() {
  const h = hull(); if (h > S.bestHull) S.bestHull = h;
  if (S.bestHull >= 1 - 1e-9 && !S.goalAt) S.goalAt = today();
  const got = [];
  for (const c of D.chapters) {
    if (S.ch[c.id]) continue;
    if (c.id > 1 && !S.ch[c.id - 1]) break;          // 章節照順序解鎖，故事才接得起來
    if (!chReady(c)) break;
    S.ch[c.id] = Date.now(); got.push(c);
    if (c.reward && !S.cargo[c.reward]) S.cargo[c.reward] = 1;
  }
  return got;
}

/* ───────── 物品掉落 ───────── */
function roll(rare) {
  const ch = maxCh();
  const pool = (r) => D.items.filter((i) => i.r === r && (!i.ch || i.ch <= ch) && !S.cargo[i.id]);
  const want = Math.random() < (rare || 0) ? 2 : 1;
  let p = pool(want); if (!p.length) p = pool(want === 2 ? 1 : 2);
  if (!p.length) return null;
  const it = pick(p); S.cargo[it.id] = 1; return it;
}

/* ───────── 降級路線（紅牛、甜食） ───────── */
function rungs(kind) {
  const L = D.ladders[kind]; const b = kind === 'rb' ? +S.p.rb0 || 0 : +S.p.sw0 || 0; const u = L.unit, it = L.item;
  const R = [{ name: '先看清楚', goal: '記錄 5 天的' + it + '數量（多少都照實記）', need: 5, ok: (n) => n != null }];
  if (b >= 3) R.push({ name: '少一' + u, goal: '累積 5 天，每天 ' + (b - 1) + ' ' + u + '以內', need: 5, ok: (n) => n != null && n <= b - 1 });
  if (b >= 2) R.push({ name: '一天一' + u, goal: '累積 7 天，每天 1 ' + u + '以內', need: 7, ok: (n) => n != null && n <= 1 });
  if (kind === 'rb') {
    R.push({ name: '隔天喝', goal: '累積 7 天零罐', need: 7, ok: (n) => n === 0 });
    R.push({ name: '偶爾才喝', goal: '累積 14 天零罐', need: 14, ok: (n) => n === 0 });
    R.push({ name: '斷電成功', goal: '連續 14 天零罐', need: 14, consec: true, ok: (n) => n === 0 });
  } else {
    R.push({ name: '有幾天不吃', goal: '累積 7 天零份', need: 7, ok: (n) => n === 0 });
    R.push({ name: '甜食馴服', goal: '連續 7 天，每天 1 份以內', need: 7, consec: true, ok: (n) => n != null && n <= 1 });
  }
  return R;
}
function ladderCount(kind, r, st, upto) {
  let n = 0;
  if (r.consec) { let k = upto; while (k >= st.at && n < 400) { const d = S.days[k]; if (d && r.ok(d[kind])) { n++; k = addD(k, -1); } else break; } }
  else { for (let k = st.at; k <= upto; k = addD(k, 1)) { const d = S.days[k]; if (d && r.ok(d[kind])) n++; } }
  return n;
}
/* 只算已經過完的日子（今天的數量還可能變） */
function ladderEval(kind) {
  const st = S.lad[kind]; if (!st.at) st.at = S.p.start || today();
  const R = rungs(kind); const ups = []; const yest = addD(today(), -1);
  let guard = 0;
  while (st.i < R.length && guard++ < 8) {
    if (st.at > yest) break;
    const r = R[st.i]; const n = ladderCount(kind, r, st, yest);
    if (n >= r.need) { ups.push(r); st.i++; st.at = today(); } else break;
  }
  return ups;
}
function ladderView(kind) {
  const st = S.lad[kind]; const R = rungs(kind); const i = Math.min(st.i, R.length);
  if (i >= R.length) return { R, i, done: true };
  const r = R[i]; const yest = addD(today(), -1);
  let n = st.at && st.at <= yest ? ladderCount(kind, r, st, yest) : 0;
  const td = S.days[today()]; const todayOK = td && r.ok(td[kind]);
  return { R, i, r, n, todayOK, done: false };
}

/* ───────── 每週航道事件 ───────── */
const EV_ORDER = ['wind', 'meteor', 'depot', 'sos', 'fog', 'green', 'drift', 'quiet'];
function weekRoll() {
  const ws = weekStart(today()); if (S.wk && S.wk.ws === ws) return false;
  const base = S.p.start ? weekStart(S.p.start) : ws; const i = Math.max(0, Math.round(diffD(base, ws) / 7));
  const id = i < EV_ORDER.length ? EV_ORDER[i] : EV_ORDER[(i * 5 + 3) % EV_ORDER.length];
  S.wk = { ws, id, claimed: false }; return true;
}
function weekStats(ws) {
  const o = { weighDays: 0, rbLowDays: 0, swaps: 0, walkMin: 0, dinnerDays: 0, vegMeals: 0, craves: 0, fullDays: 0, meals: 0, rb: 0, sw: 0, clean: 0, walkN: 0 };
  for (let i = 0; i < 7; i++) {
    const d = S.days[addD(ws, i)]; if (!d) continue;
    if (d.w != null) o.weighDays++;
    if (d.rb != null) { o.rb += d.rb; if (d.rb === 0 || d.rb < (+S.p.rb0 || 0)) o.rbLowDays++; }
    if (d.sw != null) o.sw += d.sw;
    for (const m of d.m || []) { o.meals++; o.swaps += (m.x || []).length; if ((m.tg || []).includes('veg')) o.vegMeals++; if (m.clean) o.clean++; }
    if ((d.m || []).some((m) => m.s === 'd')) o.dinnerDays++;
    for (const w of d.walk || []) { o.walkMin += w.min || 0; o.walkN++; }
    o.craves += (d.cr || []).length;
    if (dayFull(d)) o.fullDays++;
  }
  return o;
}
function weekEvent() {
  if (!S.wk) return null;
  const ev = D.events.find((e) => e.id === S.wk.id); if (!ev) return null;
  const st = weekStats(S.wk.ws); const v = Math.min(st[ev.metric], ev.need);
  return { ev, v, done: st[ev.metric] >= ev.need, claimed: S.wk.claimed };
}

/* ───────── 回診：血脂濁流 ───────── */
function bossHP() {
  if (!S.labs.length) return null;
  const L = S.labs.slice().sort((a, b) => (a.k < b.k ? -1 : 1)); const first = L[0], last = L[L.length - 1]; const T = S.tgt; const fr = [];
  for (const m of ['tc', 'ldl', 'tg']) {
    const b = last[m]; if (b == null || T[m] == null) continue;
    if (b <= T[m]) { fr.push(0); continue; }
    const a = first[m]; const base = a != null && a > T[m] ? Math.max(a, b) : b;
    fr.push(clamp((b - T[m]) / (base - T[m]), 0, 1));
  }
  if (last.hdl != null && T.hdl != null) {
    const b = last.hdl;
    if (b >= T.hdl) fr.push(0);
    else { const a = first.hdl; const base = a != null && a < T.hdl ? Math.min(a, b) : b; fr.push(clamp((T.hdl - b) / (T.hdl - base), 0, 1)); }
  }
  if (!fr.length) return null;
  return fr.reduce((s, x) => s + x, 0) / fr.length;
}
const LABS = [
  { id: 'tc', name: '總膽固醇', low: true }, { id: 'ldl', name: '低密度膽固醇 LDL', low: true },
  { id: 'hdl', name: '高密度膽固醇 HDL', low: false }, { id: 'tg', name: '三酸甘油酯', low: true }
];

/* ───────── 每天第一次打開：休整日、補給艙、事件、降級路線 ───────── */
function dailyCheck() {
  const t = today(); if (S.lastOpen === t) return null;
  const res = { ups: [] };
  if (S.lastOpen && S.p.start) {
    let k = addD(t, -1); const missed = [];
    while (k >= S.p.start && !counted(S.days[k]) && missed.length < 800) { missed.push(k); k = addD(k, -1); }
    const hadStreak = k >= S.p.start && counted(S.days[k]);
    if (missed.length && hadStreak) {
      if (missed.length <= S.rest) { for (const m of missed) day(m).rest = 2; S.rest -= missed.length; res.saved = missed.length; }
      else res.welcome = missed.length;
    } else if (missed.length >= 3) res.welcome = missed.length;
  }
  S.lastOpen = t;
  weekRoll();
  for (const kind of ['rb', 'sw']) for (const r of ladderEval(kind)) res.ups.push({ kind, r });
  return res;
}

/* ───────── 示範資料（網頁版 ?demo=1，不會存到真的紀錄） ───────── */
function seedDemo() {
  const s = fresh(); let seed = 20261108;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const N = 52; const t = dk(new Date()); const start = addD(t, -(N - 1));
  s.intro = true; s.p = { name: '痞子葳', w0: 94.2, goal: 76, start, age: null, rb0: 3, sw0: 2 };
  const types = ['bento', 'noodle', 'breakfast', 'cvs', 'rice', 'buffet', 'hotpot'];
  for (let i = 0; i < N; i++) {
    const k = addD(start, i); const d = s.days[k] = {}; const last = i === N - 1;
    if (rnd() < 0.86 || i < 3) d.w = r1(94.2 - i * 0.068 + (rnd() - 0.5) * 1.0 + (i % 7 === 5 ? 0.4 : 0));
    if (last) d.w = 90.6;
    const nm = last ? 1 : 1 + Math.floor(rnd() * 3);
    d.m = [];
    for (let j = 0; j < nm; j++) {
      const ty = pick(types); const tg = []; if (rnd() < 0.6) tg.push('veg'); if (rnd() < 0.7) tg.push('pro'); if (rnd() < 0.25) tg.push('fried'); if (rnd() < 0.15) tg.push('sugar');
      const x = rnd() < 0.5 ? [D.swaps[ty][0]] : [];
      d.m.push({ id: uid(), s: ['b', 'l', 'd'][j] || 'a', ty, tg, x, clean: !tg.includes('fried') && !tg.includes('sugar'), sp: 8, t: parseK(k).getTime() });
    }
    d.rb = i < 8 ? 3 : i < 20 ? 2 : i < 40 ? (rnd() < 0.5 ? 1 : 2) : (rnd() < 0.4 ? 0 : 1);
    d.sw = i < 15 ? 2 : (rnd() < 0.5 ? 1 : 2);
    if (rnd() < 0.78 && !last) d.walk = [{ min: i < 24 ? 10 + Math.floor(rnd() * 3) : 15 + Math.floor(rnd() * 4), tier: i < 24 ? 1 : 2, st: rnd() < 0.08 ? 'stop' : 'ok', feel: 'ok', sp: 20, t: parseK(k).getTime() }];
    if (i % 9 === 4) d.cr = [{ what: 'rb', res: rnd() < 0.6 ? 'resist' : 'swap', t: parseK(k).getTime() }];
    d.first = 1;
    if (i % 3 === 0) s.spo2.push({ k, v: 93 + Math.floor(rnd() * 4), src: 'watch' });
  }
  s.sp = 520; s.spLife = 3260; s.sys = { fuel: 3, o2: 2, engine: 2 }; s.restN = 50; s.rest = 2;
  s.eng = { tier: 2, good: 3 };
  s.lad = { rb: { i: 2, at: addD(t, -6) }, sw: { i: 1, at: addD(t, -10) } };
  s.labs = [{ k: addD(t, -48), tc: 238, ldl: 162, hdl: 35, tg: 214 }, { k: addD(t, -4), tc: 219, ldl: 145, hdl: 38, tg: 176 }];
  for (const id of ['c02', 'c05', 'c07', 'c12', 'r01', 'r02', 'c09']) s.cargo[id] = 1;
  s.lastOpen = addD(t, -1); s.read = { 1: 1, 2: 1, 3: 1, 4: 1 };
  const keep = S; S = s; weekRoll(); refresh(); S = keep;
  s.read[5] = 0;
  return s;
}

/* ───────── 音效（全部即時合成，不用音檔） ───────── */
const Sound = {
  ctx: null, out: null,
  ensure() {
    if (!S.set.sound) return null;
    if (!this.ctx) {
      try { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination); }
      catch (e) { this.ctx = null; return null; }
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* 瀏覽器拒絕 */ } }
    return this.ctx;
  },
  tone(f, d, type, g, t0, f2, att) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (t0 || 0);
    const o = c.createOscillator(), v = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g || 0.2, t + (att || 0.006)); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(v); v.connect(this.out); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, g, t0, freq, q, type, f2) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (t0 || 0);
    if (!this.nb) { const len = c.sampleRate * 1.5; this.nb = c.createBuffer(1, len, c.sampleRate); const ch = this.nb.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; }
    const s = c.createBufferSource(); s.buffer = this.nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(freq || 1200, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q || 1;
    const v = c.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g || 0.2, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(v); v.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  },
  play(name) {
    if (!S.set.sound || !this.ctx) return;
    try { (this.fx[name] || this.fx.tap).call(this); } catch (e) { /* 音效失敗不影響操作 */ }
  },
  fx: {
    tap() { this.tone(1320, 0.05, 'sine', 0.07); },
    soft() { this.tone(740, 0.07, 'triangle', 0.06); },
    ok() { this.tone(660, 0.12, 'triangle', 0.14); this.tone(990, 0.2, 'triangle', 0.12, 0.08); },
    spark() { [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.06, i * 0.045)); },
    gain() { this.tone(880, 0.1, 'sine', 0.08); this.tone(1320, 0.18, 'sine', 0.08, 0.06); this.tone(1760, 0.22, 'sine', 0.05, 0.12); },
    repair() { this.noise(0.12, 0.25, 0, 2400, 3); this.tone(120, 0.25, 'square', 0.08, 0.02, 60); this.noise(0.08, 0.18, 0.16, 3200, 4); this.tone(440, 0.5, 'sawtooth', 0.05, 0.25, 880); this.tone(1320, 0.4, 'sine', 0.08, 0.55); },
    full() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, i * 0.09)); this.tone(1568, 0.8, 'sine', 0.06, 0.4); },
    alarm() { for (let i = 0; i < 4; i++) { this.tone(880, 0.16, 'square', 0.05, i * 0.32); this.tone(660, 0.16, 'square', 0.05, i * 0.32 + 0.16); } },
    boom() { this.noise(0.35, 0.3, 0, 900, 0.7, 'lowpass', 120); this.tone(90, 0.3, 'sine', 0.15, 0, 40); },
    pop() { this.noise(0.12, 0.2, 0, 1800, 1.2, 'bandpass', 500); this.tone(520 + Math.random() * 300, 0.08, 'triangle', 0.08, 0, 180); },
    gold() { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.07, i * 0.05)); },
    unlock() { [220, 277, 330, 440].forEach((f, i) => { this.tone(f, 2.2, 'sawtooth', 0.025, i * 0.12, null, 0.5); this.tone(f * 2, 1.8, 'sine', 0.04, 0.2 + i * 0.12, null, 0.4); }); this.tone(1760, 1.2, 'sine', 0.04, 1.0); },
    ignite() { this.noise(1.6, 0.22, 0, 200, 0.8, 'lowpass', 4000); this.tone(55, 1.8, 'sawtooth', 0.08, 0, 220, 0.3); this.tone(440, 1.2, 'sine', 0.06, 1.2, 1760); },
    stop() { this.tone(660, 0.18, 'triangle', 0.1); this.tone(440, 0.3, 'triangle', 0.1, 0.14); },
    breathIn() { this.noise(3.6, 0.05, 0, 400, 0.6, 'lowpass', 1400); this.tone(196, 3.8, 'sine', 0.035, 0, 294, 1.5); },
    breathOut() { this.noise(5.6, 0.05, 0, 1400, 0.6, 'lowpass', 300); this.tone(294, 5.8, 'sine', 0.035, 0, 196, 1.5); },
    open() { this.noise(0.5, 0.16, 0, 300, 1, 'bandpass', 2400); this.tone(330, 0.3, 'triangle', 0.08, 0.2, 660); this.fx.spark.call(this); }
  }
};
document.addEventListener('pointerdown', () => { Sound.ensure(); }, { capture: true, passive: true });
const haptic = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* 不支援 */ } };

/* 所有規則都定義好之後，才載入存檔 */
S = fresh();
S = load();
