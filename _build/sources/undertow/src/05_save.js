/* ============ 05 存檔 ============ */
const SAVE_KEY = 'undertow.v1';
let G = null;
const MEM_STORE = {};
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return MEM_STORE[k] || null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { MEM_STORE[k] = v; } }
function newG() {
  return {
    v: 1, credits: 0, meta: {}, weapons: ['rivet', 'arc'], survivors: {}, logs: {}, read: {}, relics: {},
    sectors: SECTORS.map((s, i) => ({ unlocked: i === 0, cleared: false, stars: [false, false, false], best: 0, runs: 0 })),
    endless: { unlocked: false, best: 0 }, endings: {}, tips: {}, seenPrologue: false, lastWeapon: 'rivet',
    stats: { dives: 0, kills: 0, deaths: 0, extracts: 0, hunterKills: 0, credits: 0 },
    settings: { music: .7, sfx: .9, shake: true, vib: true, nums: true, voice: true, flash: true, grain: true },
    newStuff: {},
  };
}
function loadGame() {
  let d = null;
  try { d = JSON.parse(lsGet(SAVE_KEY) || 'null'); } catch (e) { d = null; }
  const g = newG();
  if (d && d.v === 1) {
    Object.assign(g, d);
    g.settings = Object.assign(newG().settings, d.settings || {});
    g.stats = Object.assign(newG().stats, d.stats || {});
    const base = newG().sectors;
    g.sectors = base.map((s, i) => Object.assign(s, (d.sectors || [])[i] || {}));
    g.endless = Object.assign({ unlocked: false, best: 0 }, d.endless || {});
  }
  G = g;
  return g;
}
function saveGame() { try { lsSet(SAVE_KEY, JSON.stringify(G)); } catch (e) { } }
function metaLv(id) { return G.meta[id] || 0; }
function relicBonus(k) {
  let s = 0;
  for (const r of RELICS) { const st = G.relics[r.id] || 0; if (st && r.k === k) s += r.v * st; }
  return s;
}
function survPerk(k) { for (const id in G.survivors) if (G.survivors[id] && SURV[id] && SURV[id].perk === k) return true; return false; }
function survCount() { return SURV_ORDER.filter(id => G.survivors[id]).length; }
/* 存檔碼：換手機時可以帶走進度 */
function exportCode() { try { return 'UT1:' + btoa(unescape(encodeURIComponent(JSON.stringify(G)))); } catch (e) { return ''; } }
function importCode(s) {
  try {
    s = (s || '').trim(); if (!s.startsWith('UT1:')) return false;
    const d = JSON.parse(decodeURIComponent(escape(atob(s.slice(4))))); if (!d || d.v !== 1) return false;
    lsSet(SAVE_KEY, JSON.stringify(d)); loadGame(); return true;
  } catch (e) { return false; }
}
