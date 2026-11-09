// ============ 存檔 ============
const SAVE_KEY = 'stowaway.v1';
function defaultG() {
  return { v: 1, voyages: 0, wins: 0, money: 0, owned: [], equip: [], lore: [], newLore: [], endings: {}, runs: [], tut: {}, hard: false,
    set: { music: .8, sfx: 1, slowmo: true, haptic: true, flash: true, shake: true, hints: true }, ckpt: null };
}
function loadG() {
  let g = null;
  try { const s = store.get(SAVE_KEY); if (s) g = JSON.parse(s); } catch (e) { g = null; }
  const d = defaultG();
  if (!g || typeof g !== 'object') g = d;
  for (const k in d) if (g[k] == null) g[k] = d[k];
  for (const k in d.set) if (g.set[k] == null) g.set[k] = d.set[k];
  G = g; S.set = G.set;
  return G;
}
function saveG() { try { store.set(SAVE_KEY, JSON.stringify(G)); } catch (e) { } }
// 幕間存檔：選完方針／計畫、進入下一幕之前
function saveCkpt(nextAct) {
  if (!W) return;
  const c = {
    seed: W.seed, voyage: W.voyage, t: W.t, act: nextAct, parts: W.parts, stance: W.stance, plan: W.plan, mods: W.mods,
    power: W.power, sys: W.sys, learn: W.learn, chron: W.chron, logs: W.logs, stats: W.stats, flags: W.flags, confessed: W.confessed, agentDone: W.agentDone,
    lights: W.lights, items: W.items, traps: W.traps.filter(t => t.type === 'sentry' || t.type === 'fuel' || t.type === 'ln2'),
    crew: W.crew.map(m => ({ hp: m.hp, dead: m.dead, why: m.why, deathT: m.deathT, inv: m.inv, virtue: m.virtue, bpm: m.bpm, stance: m.stance, x: m.x, y: m.y, cocoon: m.cocoon, left: m.left, aboard: m.aboard })),
    doors: SHIP.doors.map(d => [d.state, d.welded, d.broken, d.jam]),
    vents: SHIP.vn.map(n => n.sealed ? 1 : 0), dampers: Object.keys(SHIP.dampers).map(k => SHIP.dampers[k].closed ? 1 : 0),
    boxes: SHIP.boxes.map(b => [b.searched ? 1 : 0, b.loot2]), bot: { x: W.bot.x, y: W.bot.y, dead: W.bot.dead },
  };
  G.ckpt = c; saveG();
}
function resumeCkpt() {
  const c = G.ckpt; if (!c) return false;
  newRun({ seed: c.seed });
  Object.assign(W, { voyage: c.voyage, t: c.t, parts: c.parts, stance: c.stance, plan: c.plan, mods: c.mods, power: c.power, sys: c.sys, learn: c.learn, chron: c.chron, logs: c.logs, stats: c.stats, flags: c.flags, confessed: c.confessed, agentDone: c.agentDone, lights: c.lights, items: c.items, traps: c.traps });
  c.crew.forEach((s, i) => { const m = W.crew[i]; Object.assign(m, s); refreshHeld(m); });
  SHIP.doors.forEach((d, i) => { const [st, w, b, j] = c.doors[i]; d.state = st; d.welded = w; d.broken = b; d.jam = j; d.open = (st === 'open' || b) ? 1 : 0; });
  SHIP.vn.forEach((n, i) => n.sealed = !!c.vents[i]);
  Object.keys(SHIP.dampers).forEach((k, i) => SHIP.dampers[k].closed = !!c.dampers[i]);
  SHIP.boxes.forEach((b, i) => { b.searched = !!c.boxes[i][0]; b.loot2 = c.boxes[i][1]; });
  Object.assign(W.bot, c.bot);
  recomputeRoomCosts();
  W.act = c.act - 1;
  W.beast.state = 'lurk'; W.beast.inVent = true; W.beast.vnode = 0; W.beast.x = SHIP.vn[0].x; W.beast.y = SHIP.vn[0].y;
  if (c.act >= 2) W.beast.stage = 1;
  startAct(c.act);
  return true;
}
