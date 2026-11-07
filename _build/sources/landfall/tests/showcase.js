/* 收藏庫截圖用：在固定地圖上擺一個漂亮的殖民地 */
window.__showcase = function () {
  hideTitle(); UI.q = []; UI.modal = null;
  G = newGame(20261107);
  buildTerrainColors();
  showGameUI(true);
  G.paused = false; G.speed = 0;
  G.story.seen.prologue = 1; G.story.seen.dusk1 = 1;
  G.story.done = { power: 1, wake1: 1, night1: 1, team: 1, study: 1 };
  G.flags.courseKnown = 1; G.flags.sophiaScene = 1; G.flags.antenna = 1;
  G.res = { food: 186, metal: 142, fiber: 96, comp: 48, med: 9, data: 12 };
  for (const k of ['agro', 'lights', 'biofuel', 'medic', 'turret', 'struct']) G.tech.done[k] = true;
  G.tech.cur = null; G.flags.crystalSample = 1;
  const h = hull(), hx = h.x, hy = h.y;
  const put = (type, dx, dy) => {
    const x = hx + dx, y = hy + dy, d = BUILD[type];
    for (let yy = y - (d.wall ? 0 : 1); yy < y + d.h + (d.wall ? 0 : 1); yy++) for (let xx = x - (d.wall ? 0 : 1); xx < x + d.w + (d.wall ? 0 : 1); xx++) { const n = nodeAt(xx, yy); if (n && n.type !== 'crystal') removeNode(n); }
    if (canPlace(type, x, y)) return null;
    return placeBuilding(type, x, y, true);
  };
  put('solar', 7, -3); put('solar', 7, 0); put('battery', 9, 3); put('battery', 10, 3);
  put('dorm', -4, 4); put('dorm', -1, 5); put('mess', 2, 5); put('research', 5, 4);
  put('workshop', -4, -1); put('greenhouse', -5, -5); put('medbay', 1, -4); put('storage', 4, -4);
  put('lamp', 4, 3); put('lamp', -2, 3); put('lamp', 6, -1); put('turret', 9, 6); put('turret', -6, 7);
  for (let i = -6; i <= 10; i++) put('fence', i, 9);
  G.buildings.find(b => b.type === 'greenhouse').grow = 70;
  // 一棟還在蓋
  const site = (() => { const x = hx + 10, y = hy - 4; for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) { const n = nodeAt(xx, yy); if (n) removeNode(n); } return canPlace('antenna', x, y) ? null : placeBuilding('antenna', x, y, false); })();
  if (site) { site.work = BUILD.antenna.work * 0.3; site.prog = 0.3; }
  assignBeds();
  revealAround(hx + 2.5, hy + 1.5, 17);
  // 喚醒手寫角色
  for (const k of ['anna', 'qin', 'ye', 'sophia', 'ramon', 'rani', 'deng', 'meng', 'shen', 'zhou', 'xiaoman', 'ouyang']) {
    const p = G.pods.find(p => p.key === k && p.status === 'sleep');
    if (!p) continue;
    G.power.stored = 999; const c = wakePod(p);
    if (c) { c.sick = 0; c.sickLabel = ''; c.food = 70 + R() * 20; c.rest = 60 + R() * 30; }
  }
  setJob(C('qin'), 'guard'); setJob(C('deng'), 'gather'); setJob(C('rani'), 'research'); setJob(C('meng'), 'farm');
  UI.q = []; UI.modal = null; G._afterWake = G._afterWake2 = null;
  G.power.stored = 380;
  G.t = 5 * DAY + 17.6 * 60; G.day = 6; G.scanDay = 6;
  G.story.evLast = G.t + 9999; G.story.nextRaid = 99;
  for (let i = 0; i < 70; i++) { simAdvance(1); UI.q = []; }
  G.speed = 1;
  CAM.rot = 0; centerOn(hx + 2.8, hy + 2.6); CAM.z = CAM.tz = 1.0;
  UI.updateObj(); UI.updateHUD(true);
  el('obj').classList.add('min'); el('toasts').replaceChildren(); UI.q = []; if (UI.modal) UI.modal.done();
  return awake().length;
};
window.__tideShow = function () {
  scheduleTide(G.day); G.tide.n = 0;
  G.t = (G.day - 1) * DAY + 18.45 * 60;
  for (let i = 0; i < 6; i++) { simAdvance(1); }
  UI.q = []; if (UI.modal) UI.modal.done();
  for (let i = 0; i < 40; i++) { simAdvance(1); UI.q = []; }
  const tur = G.buildings.filter(b => b.type === 'turret').sort((a, b) => b.x - a.x)[0];
  for (let i = 0; i < 26; i++) { const a = R() * TAU, d = 3.5 + R() * 3.5; const x = clamp(Math.floor(tur.x + Math.cos(a) * d), 0, N - 1), y = clamp(Math.floor(tur.y + 1 + Math.abs(Math.sin(a)) * d), 0, N - 1); if (walkCost(x, y, true) > 0 && !bAt(x, y)) spawnBeast('bug', x, y, 'tide'); }
  for (const [dx, dy] of [[5, 6], [6, 5], [4, 7], [7, 4]]) { const x = tur.x + dx, y = tur.y + dy; if (inMap(x, y) && walkCost(x, y, true) > 0 && !bAt(x, y)) { const m = spawnBeast('mother', x, y, 'tide'); m.hp = m.hpMax * 0.8; G.tide.boss = 1; break; } }
  for (let i = 0; i < 4; i++) { simAdvance(1); UI.q = []; }
  centerOn(tur.x + 2.2, tur.y + 2.4); CAM.z = CAM.tz = 0.95;
  el('toasts').replaceChildren(); el('obj').classList.add('min');
  return G.beasts.length;
};
