'use strict';
/* ====== 存檔：本機＋Claude 雲端＋存檔碼 ====== */
const SAVE_KEY = 'zhuixing.save.v1';
const CLOUD = { ref: null, ready: false, busy: false, pending: null, lastUp: 0 };

function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(str) { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function serialize() {
  const W = G.world;
  const o = {
    v: 1, at: Date.now(), seed: G.seed, t: G.t, day: G.day, speed: 1, uid: uid.n, rng: R.state(),
    res: G.res, power: G.power, flags: G.flags, buffs: G.buffs, rifles: G.rifles, rifleQ: G.rifleQ, compOn: G.compOn,
    tech: G.tech, story: G.story, tide: G.tide, exp: G.exp, stats: G.stats, logs: G.logs.slice(-60), weather: G.weather, rel: Object.fromEntries(Object.entries(G.rel).filter(([, v]) => Math.abs(v) >= 2).map(([k, v]) => [k, Math.round(v)])),
    scan: G.scan, scanDay: G.scanDay, freeScan: G.freeScan, leaderId: G.leaderId, pet: G.pet,
    world: { ter: b64(W.ter), fog: b64(W.fog), deco: b64(W.deco), nodes: W.nodes.map(n => [n.id, n.type, n.x, n.y, n.amt, n.max, n.var, n.marked ? 1 : 0, n.regrowAt || 0]) },
    buildings: G.buildings.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, hp: b.hp, hpMax: b.hpMax, done: b.done, prog: b.prog, work: b.work, active: b.active, grow: b.grow, fuel: b.fuel || 0 })),
    colonists: G.colonists.map(c => {
      const x = Object.assign({}, c);
      delete x.path; delete x.task; delete x.bubble; delete x._sx; delete x._sy; delete x.moodMods; delete x.skip; delete x.repath; delete x._dmgAt; delete x._dmgAcc;
      x.mems = c.mems.filter(m => m.until > G.t && m.v);
      if (c.key || c.seed) for (const k of ['bio', 'first', 'look', 'name', 'role', 'suit', 'hue', 'g', 'he', 'age', 'traits', 'minor']) delete x[k];
      for (const k of ['food', 'rest', 'hp', 'mood', 'trust', 'x', 'y', 'walk']) if (typeof x[k] === 'number') x[k] = Math.round(x[k] * 100) / 100;
      for (const k in x.xp) x.xp[k] = Math.round(x.xp[k]);
      if (c.def && c.seed) delete x.def;
      return x;
    }),
    beasts: G.beasts.filter(b => !b.dead).map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, hp: b.hp, hpMax: b.hpMax, mode: b.mode, hostile: b.hostile, home: b.home, leaving: b.leaving })),
    pods: G.pods.map(p => { const x = Object.assign({}, p); if (p.status !== 'sleep') delete x.mask; if (!x.dmg) { delete x.left; delete x.repair; delete x.repairQ; } return x; }),
  };
  return o;
}
function deserialize(o) {
  newGame(o.seed);   // 先建立骨架（地形雜訊等）
  G.t = o.t; G.day = o.day; G.speed = 1; uid.n = o.uid; R.setState(o.rng);
  Object.assign(G.res, o.res); Object.assign(G.power, o.power);
  G.flags = o.flags || {}; G.buffs = o.buffs || {}; G.rifles = o.rifles; G.rifleQ = o.rifleQ || 0; G.compOn = o.compOn !== false;
  G.tech = o.tech; G.story = o.story; G.tide = o.tide; G.exp = o.exp; G.stats = o.stats; G.logs = o.logs || []; G.weather = o.weather; G.rel = o.rel || {};
  G.scan = o.scan || []; G.scanDay = o.scanDay || 1; G.freeScan = o.freeScan; G.leaderId = o.leaderId; G.pet = o.pet || null;
  const W = G.world;
  W.ter = unb64(o.world.ter); W.fog = unb64(o.world.fog); W.deco = unb64(o.world.deco);
  W.nodes = o.world.nodes.map(a => ({ id: a[0], type: a[1], x: a[2], y: a[3], amt: a[4], max: a[5], var: a[6], marked: !!a[7], regrowAt: a[8], by: 0 }));
  W.nmap = new Int32Array(N * N); for (const n of W.nodes) W.nmap[idx(n.x, n.y)] = n.id;
  G.buildings = [];
  W.bmap = new Int32Array(N * N);
  for (const s of o.buildings) {
    const d = BUILD[s.type];
    const b = Object.assign({ w: d.w, h: d.h, slots: d.slots || 0, store: { food: 0 } }, s);
    G.buildings.push(b);
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) W.bmap[idx(xx, yy)] = b.id;
  }
  G.colonists = o.colonists.map(c => {
    if (!c.name && (c.key || c.seed)) {
      const d = c.key ? CAST[c.key] : makeGeneric(c.seed);
      const g = d.g || 'm';
      Object.assign(c, { name: d.name, g, he: g === 'f' ? '她' : '他', age: d.age, role: d.role, suit: d.suit || 'colon', hue: d.hue || '#7fe3ff', look: JSON.parse(JSON.stringify(d.look)), bio: d.bio || '', first: d.first || '', traits: [...(d.traits || [])], minor: !!d.minor });
    }
    return Object.assign(c, { path: null, task: null, bubble: null, moodMods: [], thinkAt: 0 });
  });
  for (const p of G.pods) { if (p.dmg == null) p.dmg = false; if (p.left == null) p.left = 0; if (p.repair == null) p.repair = 0; if (!p.mask) p.mask = { name: true, role: true, trait: true, corrupt: false }; }
  for (const a of G.colonists) for (const b of G.colonists) if (a !== b && G.rel[relKey(a, b)] === undefined) G.rel[relKey(a, b)] = 0;
  for (const c of G.colonists) { if (c.inside && !bById(c.inside)) { c.inside = 0; c.hidden = false; } if (!c.away && !c.lie) { c.hidden = false; c.inside = 0; } if (c.carriedBy) c.carriedBy = 0; }
  G.beasts = (o.beasts || []).map(b => Object.assign({ atk: 0, path: null, pi: 0, thinkAt: 0, dx: 1, dy: 0, walk: 0, hit: 0 }, b));
  G.pods = o.pods;
  indexNodes();
  G.dirtyPath = true; G.fogDirty = true;
  for (const c of G.colonists) calcMood(c);
  buildTerrainColors();
  return G;
}
function saveLocal(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }
function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearLocal() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function saveGame(manual) {
  if (!G || G.demo) return false;
  const data = serialize();
  const ok = saveLocal(data);
  cloudSave(data);
  if (manual && typeof UI !== 'undefined') UI.toast(ok || CLOUD.ready ? '已存檔。' : '存檔失敗：這個瀏覽器不允許儲存。', ok || CLOUD.ready ? 'good' : 'bad');
  return ok;
}
/* Claude 雲端（只在 Claude 版本裡有效） */
async function cloudInit() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    const db = await window.claude.use('db');
    const user = await window.claude.use('user');
    if (!db || !user) return null;
    const id = await user.id();
    if (!id) return null;
    CLOUD.ref = db.doc('data/users/' + id + '/save');
    CLOUD.ready = true;
    const snap = await Promise.race([CLOUD.ref.get(), new Promise((_, rej) => setTimeout(() => rej('timeout'), 10000))]);
    if (snap && snap.exists) {
      const d = snap.data();
      if (d && d.json) { CLOUD.remote = JSON.parse(d.json); return CLOUD.remote; }
    }
  } catch (e) { CLOUD.ready = !!CLOUD.ref; }
  return null;
}
async function cloudSave(data) {
  if (!CLOUD.ready || !CLOUD.ref) return;
  const json = JSON.stringify(data);
  if (json.length > 240000) return;
  if (CLOUD.busy) { CLOUD.pending = json; return; }
  CLOUD.busy = true;
  try { await CLOUD.ref.set({ json, at: data.at }); CLOUD.lastUp = Date.now(); }
  catch (e) { if (e && e.code === 'invalid_argument') CLOUD.ready = false; }
  CLOUD.busy = false;
  if (CLOUD.pending) { const p = CLOUD.pending; CLOUD.pending = null; cloudSave(JSON.parse(p)); }
}
function bestSave() {
  const l = loadLocal(), r = CLOUD.remote;
  if (l && r) return (r.at || 0) > (l.at || 0) ? r : l;
  return l || r || null;
}
/* 存檔碼 */
function exportCode() {
  const json = JSON.stringify(serialize());
  return 'ZX1:' + b64(new TextEncoder().encode(json));
}
function importCode(code) {
  code = (code || '').trim();
  if (!code.startsWith('ZX1:')) throw new Error('格式不對');
  const json = new TextDecoder().decode(unb64(code.slice(4)));
  return JSON.parse(json);
}
