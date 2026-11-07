'use strict';
/* ====== 存檔：本機＋Claude 雲端＋存檔碼 ====== */
const SAVE_KEY = 'dreamthief.save.v1';
const CLOUD = { ref: null, ready: false, busy: false, pending: null, remote: null };
let G = null;

function newG() {
  return {
    v: 1, at: 0, money: 300, archive: [], pending: [], sold: [],
    chapters: CH.map((c, i) => ({ unlocked: i === 0, core: false, dives: 0, best: -1 })),
    meta: { bag: 0, pocket: 0, hp: 0, lantern: 0, dash: 0, candy: 0, start: 0 },
    weapons: { revolver: { owned: true, lvl: 1 }, crossbow: { owned: false, lvl: 1 }, shotgun: { owned: false, lvl: 1 }, needle: { owned: false, lvl: 1 } },
    tools: { decoy: true, incense: false, mirror: false, stun: false },
    loadout: { weapon: 'revolver', tool: 'decoy', candies: 2 }, candyStock: 3,
    side: {}, flags: {}, perks: {}, endings: [], sel: 0, lastResult: null,
    stats: { dives: 0, extracts: 0, lost: 0, kills: 0, assassins: 0, earned: 0, time: 0 },
    settings: { sfx: true, music: true, shake: true },
  };
}
function fixG(g) {
  const d = newG();
  for (const k in d) if (g[k] === undefined) g[k] = d[k];
  for (const k in d.meta) if (g.meta[k] === undefined) g.meta[k] = 0;
  for (const k in d.weapons) if (!g.weapons[k]) g.weapons[k] = d.weapons[k];
  for (const k in d.tools) if (g.tools[k] === undefined) g.tools[k] = false;
  while (g.chapters.length < CH.length) g.chapters.push({ unlocked: false, core: false, dives: 0, best: -1 });
  for (const k in d.settings) if (g.settings[k] === undefined) g.settings[k] = d.settings[k];
  return g;
}
function saveGame() {
  if (!G) return false;
  G.at = Date.now();
  const ok = LS.set(SAVE_KEY, G);
  cloudSave(G);
  return ok;
}
function loadLocal() { const g = LS.get(SAVE_KEY, null); return g && g.v ? g : null; }
function bestSave() {
  const l = loadLocal(), r = CLOUD.remote;
  if (l && r) return (r.at || 0) > (l.at || 0) ? r : l;
  return l || r || null;
}
async function cloudInit() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    const db = await window.claude.use('db'), user = await window.claude.use('user');
    if (!db || !user) return null;
    const id = await user.id(); if (!id) return null;
    CLOUD.ref = db.doc('data/users/' + id + '/save'); CLOUD.ready = true;
    const snap = await Promise.race([CLOUD.ref.get(), new Promise((_, rej) => setTimeout(() => rej('timeout'), 8000))]);
    if (snap && snap.exists) { const d = snap.data(); if (d && d.json) { CLOUD.remote = JSON.parse(d.json); return CLOUD.remote; } }
  } catch (e) { CLOUD.ready = !!CLOUD.ref; }
  return null;
}
async function cloudSave(data) {
  if (!CLOUD.ready || !CLOUD.ref) return;
  const json = JSON.stringify(data);
  if (json.length > 240000) return;
  if (CLOUD.busy) { CLOUD.pending = json; return; }
  CLOUD.busy = true;
  try { await CLOUD.ref.set({ json, at: data.at }); } catch (e) { if (e && e.code === 'invalid_argument') CLOUD.ready = false; }
  CLOUD.busy = false;
  if (CLOUD.pending) { const p = CLOUD.pending; CLOUD.pending = null; cloudSave(JSON.parse(p)); }
}
function b64e(s) { const u = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < u.length; i += 0x8000) o += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(o); }
function b64d(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); }
function exportCode() { return 'DT1:' + b64e(JSON.stringify(G)); }
function importCode(code) {
  code = (code || '').trim();
  if (!code.startsWith('DT1:')) throw new Error('格式不對');
  const g = JSON.parse(b64d(code.slice(4)));
  if (!g || !g.v) throw new Error('讀不出來');
  return fixG(g);
}

/* 記憶匣相關 */
const qingKept = () => QING_KEYS.filter(k => G.archive.some(i => i.key === k)).length;
function refreshPerks() {
  G.perks = {};
  CH.forEach(c => { if (!c.life) return; const all = c.life.items.every((x, i) => G.archive.some(it => it.key === c.id + '_life' + i)); if (all) G.perks[c.id] = true; });
}
function sideFor(chi) {
  if (!G.side[chi] || G.side[chi].length < 2) { const pool = SIDE.slice(); const a = pool.splice((Math.random() * pool.length) | 0, 1)[0]; const b = pool[(Math.random() * pool.length) | 0]; G.side[chi] = [a.id, b.id]; }
  return G.side[chi];
}
