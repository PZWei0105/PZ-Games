// ============ 世界：存檔、區域、自由走動、互動、遭遇、戰鬥銜接 ============
const SAVE_KEY = 'fallencourt.v1';
function newGame() {
  G = { v: 1, uid: 100, zone: 'vault', pos: null, roster: ['wei', 'yuan', 'luo'], party: {}, lv: 1, xp: 0, items: {}, bag: [], coin: 0, scrap: 0, dust: 0, lacquer: 0,
    cons: { potion: 2, fire: 0, float: 0 }, beltMax: 3, flags: {}, rep: { ji: 0, bang: 0, shou: 0 }, aff: { yuan: 0, luo: 0 }, deeds: [], zones: {}, shards: [], seenFoe: {}, lore: {}, pity: 0, disc: { vault: 1 }, tut: {}, pieces: 0,
    stat: { battles: 0, sec: 0, slams: 0, links: 0 }, shop: null, t0: Date.now() };
  for (const id of G.roster) G.party[id] = { lv: 1, eq: {}, tal: {}, skills: heroSkillsAt(id, 1).slice(0, 4), wounds: 0, hp: 1, active: id === 'wei', ultOk: false };
  const sw = { uid: newUid(), base: 'sword', il: 1, rar: 0, affs: [], up: 0, bn: '殘刃', keep: true }; G.items[sw.uid] = sw; G.party.wei.eq.weapon = sw.uid;
  const bw = { uid: newUid(), base: 'bow', il: 1, rar: 1, affs: [{ id: 'S5', t: 0 }], up: 0 }; G.items[bw.uid] = bw; G.party.yuan.eq.weapon = bw.uid;
  const ar = { uid: newUid(), base: 'armor_l', il: 1, rar: 0, affs: [], up: 0 }; G.items[ar.uid] = ar; G.party.yuan.eq.armor = ar.uid;
  const sh = { uid: newUid(), base: 'shield', il: 3, rar: 1, affs: [{ id: 'S3', t: 0 }], up: 0 }; G.items[sh.uid] = sh; G.party.luo.eq.weapon = sh.uid;
  const la = { uid: newUid(), base: 'armor_h', il: 3, rar: 1, affs: [{ id: 'O2', t: 0 }], up: 0 }; G.items[la.uid] = la; G.party.luo.eq.armor = la.uid;
  for (const id of G.roster) G.party[id].hp = heroNow(id).hpMax;
  return G;
}
function saveGame() { if (!G) return; if (Z && Z.leader && S.mode !== 'battle') { G.zone = Z.id; G.pos = { x: Z.leader.x, y: Z.leader.y }; } G.ts = Date.now(); try { store.set(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* ignore */ } if (typeof cloudPush === 'function') cloudPush(); }
function loadGame() { try { const s = store.get(SAVE_KEY); if (!s) return null; const g = JSON.parse(s); if (!g || g.v !== 1 || !g.party || !ZONES[g.zone]) return null; return g; } catch (e) { return null; } }
function exportSave() { try { return 'FC1.' + btoa(unescape(encodeURIComponent(JSON.stringify(G)))); } catch (e) { return ''; } }
function importSave(code) { const g = decodeSave(code); if (!g) return false; G = g; try { store.set(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* ignore */ } return true; }
const zs = id => (G.zones[id] = G.zones[id] || { enc: {}, got: {}, trig: {}, fire: 0 });
const activeIds = () => G.roster.filter(id => G.party[id].active);
const heroNow = id => calcHero(id, G.party[id], G.items);
function flag(k, v) { G.flags[k] = v === undefined ? 1 : v; }
function evalCond(c) {
  if (!c) return true;
  return c.split('&').every(p => { let neg = false; if (p[0] === '!') { neg = true; p = p.slice(1); } const [k, v] = p.split(':'); let r = false;
    if (k === 'flag') r = !!G.flags[v]; else if (k === 'has') r = !!(G.party[v] && G.party[v].active); else if (k === 'enc') r = !!Object.values(G.zones).some(z => z.enc[v]); else if (k === 'rep') { const [f, n] = v.split('>'); r = G.rep[f] >= +n; }
    return neg ? !r : r; });
}
function addRep(f, n) { G.rep[f] = clamp(G.rep[f] + n, -3, 3); }
function addAff(w, n) { G.aff[w] = clamp(G.aff[w] + n, 0, 10); if (typeof toastAff === 'function') toastAff(w, n); }
function deed(text) { G.deeds.push({ t: text, z: Z ? Z.id : '' }); }
function giveItem(it, quiet) { G.items[it.uid] = it; G.bag.push(it.uid); if (it.leg) G.lore[it.leg] = 1; return it; }
function gainXp(n) { const ups = []; G.xp += n; while (G.lv < LEVEL_CAP && G.xp >= xpNeed(G.lv)) { G.xp -= xpNeed(G.lv); G.lv++; ups.push(G.lv); } if (G.lv >= LEVEL_CAP) G.xp = Math.min(G.xp, xpNeed(G.lv) - 1);
  if (ups.length) for (const id of G.roster) { const p = G.party[id], before = heroSkillsAt(id, p.lv); p.lv = G.lv; const learned = heroSkillsAt(id, p.lv).filter(s => !before.includes(s)); for (const s of learned) if (p.skills.length < 4) p.skills.push(s); p.newSkills = (p.newSkills || []).concat(learned); p.hp = Math.min(heroNow(id).hpMax, p.hp + 30); }
  return ups; }
function pendingTalents() { const out = []; for (const id of activeIds()) for (const t of HERO[id].talents) if (G.lv >= t[0] && !G.party[id].tal[t[1].id] && !G.party[id].tal[t[2].id]) out.push({ id, t }); return out; }
function healParty(pct) { for (const id of G.roster) { const p = G.party[id], mx = heroNow(id).hpMax; p.hp = Math.min(mx, Math.max(1, Math.round(p.hp + mx * pct))); } }
function restFull() { for (const id of G.roster) { const p = G.party[id]; p.wounds = 0; p.hp = heroNow(id).hpMax; } for (const k in G.zones) G.zones[k].fire = 0; }

// ---------- 載入區域 ----------
function enterZone(id, spawnId, pos) {
  const Zd = ZONES[id], m = buildZone(id);
  gfxLoadZone(m, Zd); G.disc[id] = 1;
  Z = { id, def: Zd, m, ents: [], groups: [], leader: null, followers: [], trail: [], path: null, goal: null, t: 0, blocked: new Set(), auto: null, joy: { x: 0, y: 0 } };
  const st = zs(id);
  for (const e0 of m.ents) {
    const e = Object.assign({}, e0); e.z = tileH(e.x, e.y);
    if (e.k === 'spawn' || e.k === 'shaft') { Z.ents.push(e); continue; }
    if (e.k === 'enc') { if (st.enc[e.id]) continue; Z.groups.push(mkGroup(e)); continue; }
    if (e.k === 'chest' || e.k === 'shard') e.done = !!st.got[e.id];
    if (e.k === 'trigger') e.done = !!st.trig[e.id];
    Z.ents.push(e);
  }
  const sp = pos || Z.ents.find(e => e.k === 'spawn' && e.id === (spawnId || 'start')) || { x: 2, y: 2 };
  Z.leader = { x: sp.x, y: sp.y, z: tileH(sp.x, sp.y), flip: true, moving: false, id: activeIds()[0] };
  refreshFollowers(); refreshBlocked(); refreshZoneLights();
  Cam.tx = sp.x; Cam.ty = sp.y; Cam.tz = Z.leader.z; Cam.tzoom = baseZoom(); Cam.tcy = .52; camSnap();
  S.mode = 'explore';
  if (typeof audioZone === 'function') audioZone(Zd);
  if (typeof hudZone === 'function') hudZone();
}
const baseZoom = () => (VW > VH * 1.15 ? clamp(VH / 620, 1.05, 1.7) : clamp(VW / 330, 1.05, 1.6)) * (S.zoomK || 1);
// 同伴一開始站在帶頭的人左手邊排開；那個位置站不了（虛空、有東西、不同高）就先站在同一格，走起來自然會散開
function refreshFollowers() {
  const ids = activeIds(), L = Z.leader; L.id = ids[0];
  Z.followers = ids.slice(1).map((id, i) => { let x = L.x - .5 * (i + 1), y = L.y + .5 * (i + 1); if (!passable(Math.round(x), Math.round(y)) || tileH(x, y) !== tileH(L.x, L.y)) { x = L.x; y = L.y; } return { id, x, y, z: tileH(x, y), flip: L.flip, moving: false }; });
  Z.trail = [];
}
function refreshZoneLights() { // 聚落的燈會跟著抉擇亮或滅
  if (Z.id === 'market') { const dark = !G.flags.oil_ji && !G.flags.oil_bang && !G.flags.oil_split; let i = 0; for (const l of Gfx.lights) if (l.lamp) { i++; l.off = dark && G.flags.market_seen && i % 3 !== 0 ? true : (G.flags.oil_split && i % 2 === 0); l.r = G.flags.oil_ji ? 5 : 4.2; } }
  for (const l of Gfx.lights) if (l.flame) l.off = !!G.flags.flame_out;
}
function entVisible(e) { if (e.done && (e.k === 'shard' || e.k === 'trigger')) return false; if (e.cond && !evalCond(e.cond)) return false; if (e.need && !evalCond(e.need)) return false; return true; }
function refreshBlocked() {
  Z.blocked = new Set();
  for (const e of Z.ents) { if (!entVisible(e)) continue; if (['npc', 'chest', 'fire', 'station', 'flame', 'hook'].includes(e.k) || (e.k === 'note' && e.obj)) { if (e.k === 'station' && e.need && !G.flags[e.need]) continue; Z.blocked.add(Math.round(e.x) + ',' + Math.round(e.y)); } }
  for (const g of Z.groups) if (groupActive(g)) for (const u of g.units) Z.blocked.add(Math.round(u.x) + ',' + Math.round(u.y));
}
function passable(x, y) { const m = Z.m; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; if (m.floor[y][x] === ' ') return false; if (BLOCKING.includes(m.obj[y][x])) return false; return !Z.blocked.has(x + ',' + y); }
function stepOk(x0, y0, x1, y1) { return passable(x1, y1) && Math.abs(Z.m.ht[y1][x1] - Z.m.ht[y0][x0]) <= 1; }

// ---------- 敵群 ----------
function mkGroup(e) {
  const E = ENC[e.id], fr = [], bk = [], ar = [], list = typeof encFoes === 'function' ? encFoes(E) : E.foes;
  for (const t of list) { const r = FOE[t].row; (r === 'front' ? fr : r === 'back' ? bk : ar).push(t); }
  const F = formation(3, fr.length, bk.length, ar.length), units = [];
  const put = (list, slots, row) => list.forEach((t, i) => units.push({ type: t, row, x: e.x + slots[i].x, y: e.y + slots[i].y, z: tileH(e.x, e.y), ph: Math.random() * 6 }));
  put(fr, F.front, 'front'); put(bk, F.back, 'back'); put(ar, F.air, 'air');
  return { e, id: e.id, units, alert: 0, face: e.face };
}
function groupActive(g) { return !g.e.cond || evalCond(g.e.cond); }
const FACE8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
function groupSees(g, x, y) { // 視錐：朝向 face，110 度，5 格
  const f = FACE8[g.face] || FACE8[5], dx = x - g.e.x, dy = y - g.e.y, d = Math.hypot(dx, dy); if (d > 5.6) return false; if (d < 1.2) return true;
  const fl = Math.hypot(f[0], f[1]); return (dx * f[0] + dy * f[1]) / (d * fl) > .57;
}

// ---------- 尋路 ----------
function findPath(sx, sy, tx, ty) {
  const m = Z.m, W = m.w, key = (x, y) => y * W + x; sx = Math.round(sx); sy = Math.round(sy); tx = Math.round(tx); ty = Math.round(ty);
  if (!passable(tx, ty)) { let best = null, bd = 99; for (let r = 1; r <= 3 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (passable(x, y)) { const d = Math.hypot(dx, dy) + Math.hypot(x - sx, y - sy) * .01; if (d < bd) { bd = d; best = [x, y]; } } } if (!best) return null; tx = best[0]; ty = best[1]; }
  const open = [[sx, sy, 0, 0]], came = new Map(), gs = new Map(); gs.set(key(sx, sy), 0); let it = 0;
  while (open.length && it++ < 6000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][3] < open[bi][3]) bi = i;
    const [x, y, g0] = open.splice(bi, 1)[0];
    if (x === tx && y === ty) { const out = [[x, y]]; let k = key(x, y); while (came.has(k)) { const p = came.get(k); out.push(p); k = key(p[0], p[1]); } return out.reverse(); }
    for (const [dx, dy] of DIR8) { const nx = x + dx, ny = y + dy; if (!stepOk(x, y, nx, ny)) continue; if (dx && dy && (!stepOk(x, y, x + dx, y) || !stepOk(x, y, x, y + dy))) continue; const ng = g0 + (dx && dy ? 1.414 : 1), k = key(nx, ny); if (gs.has(k) && gs.get(k) <= ng) continue; gs.set(k, ng); came.set(k, [x, y]); open.push([nx, ny, ng, ng + Math.hypot(tx - nx, ty - ny)]); }
  }
  return null;
}
function walkTo(tx, ty, goal) { const p = findPath(Z.leader.x, Z.leader.y, tx, ty); Z.goal = goal || null; if (!p) { Z.path = null; return false; } Z.path = p.slice(1).map(a => ({ x: a[0], y: a[1] })); if (!goal && Z.path.length) { const l = Z.path[Z.path.length - 1]; if (Math.abs(l.x - tx) < .6 && Math.abs(l.y - ty) < .6 && passable(Math.round(tx), Math.round(ty))) { l.x = clamp(tx, l.x - .35, l.x + .35); l.y = clamp(ty, l.y - .35, l.y + .35); } } return true; }

// ---------- 每格更新 ----------
function worldUpdate(dt) {
  if (!Z) return; Z.t += dt; G.stat.sec += dt;
  if (S.mode !== 'explore' || ((S.cut || S.dialog || S.panel) && !Z.auto)) { Z.leader.moving = false; for (const f of Z.followers) f.moving = false; return; }
  const L = Z.leader, sp = 4.3; let mvx = 0, mvy = 0;
  const jx = Z.auto ? 0 : Z.joy.x, jy = Z.auto ? 0 : Z.joy.y;
  if (jx || jy) { Z.path = null; Z.goal = null; const wx = jx + jy, wy = -jx + jy, n = Math.hypot(wx, wy) || 1; mvx = wx / n * sp * dt * Math.min(1, Math.hypot(jx, jy)); mvy = wy / n * sp * dt * Math.min(1, Math.hypot(jx, jy)); }
  else if (Z.path && Z.path.length) { const w = Z.path[0], dx = w.x - L.x, dy = w.y - L.y, d = Math.hypot(dx, dy), st = sp * dt; if (d <= st) { L.x = w.x; L.y = w.y; Z.path.shift(); } else { mvx = dx / d * st; mvy = dy / d * st; } }
  if (mvx || mvy) {
    const cxm = Math.round(L.x), cym = Math.round(L.y), nx = L.x + mvx, ny = L.y + mvy;
    const ok = (x, y) => { const tx = Math.round(x), ty = Math.round(y); return (tx === cxm && ty === cym) || stepOk(cxm, cym, tx, ty); };
    if (Z.path || ok(nx, ny)) { L.x = nx; L.y = ny; } else if (ok(nx, L.y)) L.x = nx; else if (ok(L.x, ny)) L.y = ny;
    const sdx = (mvx - mvy); if (Math.abs(sdx) > .0008) L.flip = sdx < 0; L.moving = true; L.back = (mvx + mvy) < -.01 && Math.abs(sdx) < Math.abs(mvx + mvy) * .6;
    const last = Z.trail[0]; if (!last || Math.hypot(last.x - L.x, last.y - L.y) > .25) { Z.trail.unshift({ x: L.x, y: L.y }); if (Z.trail.length > 40) Z.trail.pop(); }
  } else L.moving = false;
  L.z += (tileH(L.x, L.y) - L.z) * Math.min(1, dt * 14);
  // 跟班沿著腳印走
  Z.followers.forEach((f, i) => { const tgt = Z.trail[Math.min(Z.trail.length - 1, (i + 1) * 7)] || { x: L.x, y: L.y }; const dx = tgt.x - f.x, dy = tgt.y - f.y, d = Math.hypot(dx, dy); if (d > .12 && (L.moving || d > .9)) { const st = Math.min(d, sp * 1.02 * dt); f.x += dx / d * st; f.y += dy / d * st; const sdx = dx - dy; if (Math.abs(sdx) > .01) f.flip = sdx < 0; f.moving = true; } else f.moving = false; f.z += (tileH(f.x, f.y) - f.z) * Math.min(1, dt * 14); });
  Cam.tx = L.x; Cam.ty = L.y; Cam.tz = L.z;
  if (Z.auto) { if (!Z.path || !Z.path.length) { const r = Z.auto; Z.auto = null; L.moving = false; r(); } return; }
  // 走到目標
  if (Z.goal && (!Z.path || !Z.path.length)) { const gl = Z.goal; Z.goal = null; if (Math.hypot(gl.x - L.x, gl.y - L.y) < 2.2) { L.flip = (gl.x - L.x) - (gl.y - L.y) < 0; interact(gl); return; } }
  // 觸發、出口、遭遇
  for (const e of Z.ents) {
    if (!entVisible(e)) continue;
    if (e.k === 'trigger' && !e.done && Math.hypot(e.x - L.x, e.y - L.y) < e.r) { e.done = true; zs(Z.id).trig[e.id] = 1; Z.path = null; runScript(e.script); return; }
    if (e.k === 'shard' && !e.done && Math.hypot(e.x - L.x, e.y - L.y) < 1.15) { Z.path = null; collectShard(e); return; }
    if (e.k === 'exit' && Math.hypot(e.x - L.x, e.y - L.y) < .8 && !Z.exitLock) { Z.exitLock = 1; Z.path = null; useExit(e); return; }
  }
  if (Z.exitLock && !Z.ents.some(e => e.k === 'exit' && Math.hypot(e.x - L.x, e.y - L.y) < 1.4)) Z.exitLock = 0;
  for (const g of Z.groups) {
    if (!groupActive(g) || g.cool > Z.t) continue;
    const near = g.units.some(u => Math.hypot(u.x - L.x, u.y - L.y) < 1.7), sees = !g.e.noAuto && groupSees(g, L.x, L.y);
    if (sees || near) { Z.path = null; engage(g, near && !sees ? 1 : 0); return; }
  }
}
function useExit(e) { if (e.script) { runScript(e.script); return; } if (e.to === 'map') openLayerMap(); else travel(e.to); }
async function travel(id, spawn) { saveGame(); await fadeTo(1); enterZone(id, spawn); saveGame(); await fadeTo(0); if (!zs(id).seen) { zs(id).seen = 1; if (typeof zoneTitle === 'function') zoneTitle(ZONES[id]); } const arr = 'arrive_' + id; if (SCRIPTS[arr]) await runScript(arr); }

// ---------- 互動 ----------
function entAt(sx, sy) { // 螢幕點附近可互動的東西
  let best = null, bd = 46;
  for (const e of Z.ents) { if (!entVisible(e) || ['spawn', 'shaft', 'trigger'].includes(e.k)) continue; if (e.k === 'chest' && e.done && !e.script) continue; const [x, y] = w2s(e.x, e.y, e.z + .8), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = e; } }
  for (const g of Z.groups) if (groupActive(g)) for (const u of g.units) { const [x, y] = w2s(u.x, u.y, u.z + 1), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = { k: 'enc', g, x: u.x, y: u.y }; } }
  return best;
}
function tapWorld(sx, sy) {
  if (S.mode !== 'explore' || S.cut || S.dialog || S.panel) return;
  const e = entAt(sx, sy);
  if (e) { if (e.k === 'enc') { walkTo(e.x, e.y); return; } if (e.k === 'exit' || e.k === 'shard') { walkTo(e.x, e.y); return; } walkTo(e.x, e.y, e); markTap(e.x, e.y, true); return; }
  // 找點到的那塊地（由高往低試）
  let hit = null; for (let h = 6; h >= 0 && !hit; h--) { const [wx, wy] = s2w(sx, sy, h), tx = Math.round(wx), ty = Math.round(wy); if (tx >= 0 && ty >= 0 && tx < Z.m.w && ty < Z.m.h && Z.m.floor[ty][tx] !== ' ' && Z.m.ht[ty][tx] === h) hit = [wx, wy]; }
  if (!hit) { const [wx, wy] = s2w(sx, sy, Z.leader.z); hit = [wx, wy]; }
  if (walkTo(hit[0], hit[1])) markTap(hit[0], hit[1]);
}
function markTap(x, y, strong) { Z.tapMark = { x, y, z: tileH(x, y), t: Z.t, strong }; }
function interact(e) {
  if (e.k === 'npc' || e.k === 'note') { if (e.script) runScript(e.script, e); return; }
  if (e.k === 'chest') { openChest(e); return; }
  if (e.k === 'fire') { runScript('sys_fire', e); return; }
  if (e.k === 'station') { openStation(e.id); return; }
  if (e.k === 'hook') { runScript('sys_hook', e); return; }
  if (e.k === 'flame') { runScript('n_flame', e); return; }
}
async function openChest(e) {
  if (e.done) return; if (e.script && !G.flags['seen_' + e.id]) { flag('seen_' + e.id); const ok = await runScript(e.script, e); if (ok === false) return; }
  if (e.kind === 'lock' && !G.party.yuan.active) { toast('鎖住了。得找個會開鎖的。'); return; }
  e.done = true; zs(Z.id).got[e.id] = 1; sfx('chest'); const zl = Z.def.zl, items = [];
  if (e.leg) items.push(giveItem(genLegend(e.leg)));
  else { items.push(giveItem(rollDrop(e.kind === 'lock' ? 'lock' : 'chest', zl + (e.kind === 'lock' ? 1 : 0)))); }
  const coin = e.leg ? 0 : R.i(8, 16) * zl, mats = {}; G.coin += coin; if (e.kind === 'lock') { mats.dust = 1; G.dust++; if (R.chance(.5)) { mats.lacquer = 1; G.lacquer++; } } else if (R.chance(.6)) { mats.scrap = R.i(1, 3); G.scrap += mats.scrap; }
  if (e.kind === 'gold') { mats.lacquer = 1; G.lacquer++; }
  for (let i = 0; i < 14; i++) part({ x: e.x, y: e.y, z: e.z + .6, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, vz: 1.5 + Math.random() * 2, grav: 4, life: .9, size: 2, col: e.leg ? '#ffcf5a' : '#bfe8ff', k: 'glow' });
  saveGame(); await showLoot({ items, coin, mats, title: e.kind === 'gold' ? '金繼箱' : e.kind === 'court' ? '庭造密匣' : e.kind === 'lock' ? '鎖箱' : '箱子' });
}
function collectShard(e) { if (e.done) return; e.done = true; zs(Z.id).got[e.id] = 1; if (!G.shards.includes(e.id)) G.shards.push(e.id); sfx('shard'); for (let i = 0; i < 18; i++) part({ x: e.x, y: e.y, z: e.z + 1, vx: (Math.random() - .5) * 2.4, vy: (Math.random() - .5) * 2.4, vz: 1 + Math.random() * 2.4, life: 1.2, size: 3, col: GLASS[i % 5], k: 'shard', spin: 6, add: false }); saveGame(); runScript('sys_shard', e); }

// ---------- 遭遇與戰鬥 ----------
async function engage(g, ambush, opts) {
  if (S.mode !== 'explore') return; const E = ENC[g.id];
  const pre = g.e.pre || (SCRIPTS['pre_' + g.id] ? 'pre_' + g.id : null);
  if (pre && !G.flags['pre_' + g.id]) { const r = await runScript(pre, g); if (r === false) { g.cool = Z.t + 3; return; } flag('pre_' + g.id); }
  if (typeof encAmbush === 'function') ambush = encAmbush(g, ambush);
  { const fresh = mkGroup(g.e); if (fresh.units.length !== g.units.length) g.units = fresh.units; } // 隊伍人數變了，敵群跟著重排
  const res = await doBattle(g, Object.assign({ ambush }, opts || {}));
  if (res.over === 'win') { zs(Z.id).enc[g.id] = 1; Z.groups = Z.groups.filter(x => x !== g); refreshBlocked(); await afterWin(g, res); const post = g.e.post || (SCRIPTS['post_' + g.id] ? 'post_' + g.id : null); if (post) await runScript(post, g, res); refreshBlocked(); if (typeof hudZone === 'function') hudZone(); saveGame(); }
  else if (res.over === 'flee') { g.cool = Z.t + 4; const L = Z.leader, a = Math.atan2(L.y - g.e.y, L.x - g.e.x); const p = findPath(L.x, L.y, g.e.x + Math.cos(a) * 7, g.e.y + Math.sin(a) * 7); if (p && p.length) { const q = p[Math.min(p.length - 1, 6)]; L.x = q[0]; L.y = q[1]; refreshFollowers(); } }
  return res;
}
// 進入戰鬥畫面並打完一場；回傳 { over, result }
async function doBattle(g, opts) {
  const E = ENC[g.id], ids = activeIds(), F = formation(ids.length, 4, 3, 2), c = g.e;
  // 隊伍人數比這一區預期的少（有人離隊）：敵人的生命跟著減
  const want = E.zone === 'vault' ? (E.id === 'z0a' ? 1 : 2) : E.zone === 'slope' ? 2 : 3, short = Math.max(0, want - ids.length), hpK = [1, .6, .34][short], atkK = [1, .64, .33][short] * (E.atkK || 1);
  const snap = JSON.stringify({ party: G.party, cons: G.cons });
  for (;;) {
    const heroes = ids.map(id => { const p = G.party[id], st = heroNow(id); return { id, stats: st, hp: Math.max(1, Math.min(p.hp, st.hpMax)), skills: p.skills.slice(0, 4), ultOk: p.ultOk, mom: 0 }; });
    battleNew({ heroes, foes: g.units.map(u => ({ type: u.type, row: u.row })), zl: E.zl, scene: E.scene || [], seed: (Math.random() * 1e9) | 0, items: Object.assign({}, G.cons), boss: E.boss, noFlee: E.noFlee, ambush: opts.ambush || 0,
      resoFam: partyResonance(ids, G.party, G.items), flags: { noLinkYL: !!G.flags.no_link_yl, reforged: !!G.flags.reforged }, easy: S.set.easy, parleyDone: !!opts.parleyDone, hpK, atkK });
    for (const u of g.units) G.seenFoe[u.type] = 1;
    let over; try { over = await battlePlay(g, F, opts); } catch (err) { console.error('battle', err); over = 'flee'; BI = null; if (BV) BV.sel = null; toast('這一場出了差錯，先退了出來。'); }
    const r = battleResult(); r.over = over;
    G.stat.battles++; G.stat.slams += r.stat.slams; G.stat.links += r.stat.links;
    if (over === 'lose') { const pick = await defeatMenu(E); const s0 = JSON.parse(snap); G.party = s0.party; G.cons = s0.cons; if (pick === 'retry') { continue; } await fadeTo(1); battleCleanup(); restFull(); G.cons.potion = Math.max(G.cons.potion, 2); enterZone('camp'); saveGame(); await fadeTo(0); toast('被拖回了覆舟營。'); return r; }
    if (over === 'flee') { const s0 = JSON.parse(snap); G.party = s0.party; G.cons = s0.cons; battleCleanup(); return r; }
    // 勝利：把戰鬥結果寫回
    G.cons = r.items;
    for (const id of ids) { const h = r.heroes[id], p = G.party[id]; if (h.wounds) p.wounds = Math.min(RULE.woundMax, (p.wounds || 0) + h.wounds); const mx = heroNow(id).hpMax; p.hp = Math.max(1, Math.min(mx, Math.round((h.down ? 1 : h.hp) + mx * RULE.postHeal))); }
    battleCleanup(); return r;
  }
}
async function afterWin(g, r) {
  const E = ENC[g.id], zl = E.zl, items = [], mats = {};
  G.coin += r.coin;
  for (const t of r.kills) { const F = FOE[t]; if (F.minor) continue; const ch = F.elite || F.boss ? 1 : .34; if (Math.random() < ch) items.push(giveItem(rollDrop(F.elite || F.boss ? 'elite' : 'mob', zl))); if (F.elite || F.boss) { mats.dust = (mats.dust || 0) + 1; G.dust++; } if (Math.random() < .5) { const n = R.i(1, 2); mats.scrap = (mats.scrap || 0) + n; G.scrap += n; } }
  if (!items.some(i => i.rar >= 2)) G.pity = (G.pity || 0) + 1; else G.pity = 0;
  if (E.drop && !G.flags['drop_' + E.drop]) { flag('drop_' + E.drop); items.unshift(giveItem(genLegend(E.drop))); }
  if (E.elite) { mats.lacquer = (mats.lacquer || 0) + 1; G.lacquer++; }
  if (Math.random() < .3 && G.cons.potion < G.beltMax) { G.cons.potion++; mats.potion = 1; }
  const ups = gainXp(r.xp);
  await showLoot({ items, coin: r.coin, mats, xp: r.xp, ups, title: E.boss ? '層主' : E.elite ? '精英' : '戰利品' });
  for (const t of pendingTalents()) await chooseTalent(t);
}
function battleCleanup() { S.mode = 'explore'; B = null; Gfx.dynLights = null; Cam.tzoom = baseZoom(); Cam.tcy = .52; if (typeof hudMode === 'function') hudMode('explore'); refreshFollowers(); refreshBlocked(); if (typeof audioBattle === 'function') audioBattle(0); }

// ---------- 畫在場景裡的東西 ----------
function drawEnt(g, e, sx, sy, k, t) {
  const s = k * .9; g.save(); g.translate(sx, sy); g.scale(s, s); g.lineJoin = 'round';
  if (e.k === 'chest') {
    const gold = e.kind === 'gold', lock = e.kind === 'lock', court = e.kind === 'court', c1 = gold ? '#7a1e22' : court ? '#cfc9bb' : lock ? '#4a4650' : '#7a5f42', c2 = shade(c1, -.3), tr = gold || court ? '#ffcf5a' : '#8f8a94';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 2, 24, 9, 0, 0, TAU); g.fill();
    uFill(g, [-20, -18, 0, -8, 0, 8, -20, -2], c2); uFill(g, [20, -18, 0, -8, 0, 8, 20, -2], c1);
    if (e.done) { uFill(g, [-20, -18, 0, -28, 20, -18, 0, -8], '#15131c'); uFill(g, [-20, -18, 0, -28, 4, -44, -16, -34], c2); uFill(g, [0, -28, 20, -18, 24, -34, 4, -44], c1); }
    else { uFill(g, [-20, -18, 0, -8, 0, -18, -20, -28], shade(c2, .1)); uFill(g, [20, -18, 0, -8, 0, -18, 20, -28], shade(c1, .1)); uFill(g, [-20, -28, 0, -38, 20, -28, 0, -18], shade(c1, .25)); g.strokeStyle = tr; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -13); g.lineTo(-10, 3); g.moveTo(10, -13); g.lineTo(10, 3); g.stroke(); uFill(g, [-3, -12, 3, -9, 3, -3, -3, -6], tr, 1.4);
      if (gold) { g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -30); g.lineTo(-4, -26); g.lineTo(-8, -20); g.moveTo(-4, -26); g.lineTo(10, -30); g.stroke(); } }
  } else if (e.k === 'fire' || (e.k === 'station' && e.id === 'rest') || e.k === 'flame') {
    const big = e.k === 'flame', used = e.k === 'fire' && zs(Z.id).fire >= 1 && !big;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 2, 22, 8, 0, 0, TAU); g.fill();
    if (big) { uFill(g, [-22, 0, -16, -30, 16, -30, 22, 0, 0, 8], '#cfc9bb'); uFill(g, [-22, 0, -16, -30, 0, -30, 0, 8], '#8e897f', 0); uEll(g, 0, -30, 16, 6, 0, '#3a3740'); }
    else { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; uEll(g, Math.cos(a) * 14, Math.sin(a) * 6 - 2, 5, 3.4, 0, '#6a6672', 1.6); } uLimb(g, -9, -3, 9, -8, 3.4, '#4a3a30'); uLimb(g, 9, -3, -8, -9, 3.4, '#3a2e24'); }
    if (!used && !(big && G.flags.flame_out)) { const y0 = big ? -32 : -8, h = (big ? 46 : 26) + Math.sin(t * 11) * 3, w = big ? 12 : 8; for (const [col, kk] of [['#ff7030', 1], ['#ffb050', .68], ['#fff0c0', .36]]) { g.beginPath(); g.moveTo(-w * kk, y0); g.quadraticCurveTo(-w * kk * 1.2 + Math.sin(t * 9) * 2, y0 - h * kk * .5, Math.sin(t * 7 + kk) * 3, y0 - h * kk); g.quadraticCurveTo(w * kk * 1.2 + Math.cos(t * 8) * 2, y0 - h * kk * .5, w * kk, y0); g.closePath(); g.fillStyle = col; g.fill(); } }
  } else if (e.k === 'shard') {
    const b = Math.sin(t * 2.2 + e.id) * 4; g.translate(0, -34 + b); g.rotate(Math.sin(t * 1.3 + e.id) * .25);
    const col = GLASS[e.id % 5]; uFill(g, [-7, 4, -3, -14, 6, -8, 9, 6, 0, 12], col, 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(-3, -14); g.lineTo(2, -8); g.lineTo(-2, 2); g.closePath(); g.fill(); g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-5, 0); g.lineTo(7, -2); g.stroke();
  } else if (e.k === 'exit') {
    for (let i = 0; i < 3; i++) { const a = .25 + .5 * ((t * .9 + i * .33) % 1); g.strokeStyle = `rgba(255,220,150,${1 - a})`; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 6 - a * 26); g.lineTo(0, -2 - a * 26); g.lineTo(14, 6 - a * 26); g.stroke(); }
  } else if (e.k === 'hook') {
    uLimb(g, 0, 0, 0, -38, 4, '#4a3a30'); g.strokeStyle = U_INK; g.lineWidth = 5; g.beginPath(); g.arc(0, -44, 7, 0, TAU); g.stroke(); g.strokeStyle = '#cfd8e8'; g.lineWidth = 2.4; g.stroke(); g.strokeStyle = '#d0a860'; g.lineWidth = 1.6; g.setLineDash([3, 3]); const [tx, ty] = w2s(e.tx, e.ty, tileH(e.tx, e.ty)); g.beginPath(); g.moveTo(0, -44); g.lineTo((tx - sx) / s, (ty - sy) / s - 10); g.stroke(); g.setLineDash([]);
  } else if (e.k === 'note' && !e.obj) {
    uFill(g, [-8, -4, 6, -8, 9, 2, -5, 6], '#e8e2d0', 1.8); g.strokeStyle = 'rgba(20,18,28,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-4, -2); g.lineTo(5, -4.4); g.moveTo(-3, 1); g.lineTo(6, -1.4); g.stroke();
  }
  g.restore();
}
function drawMarker(g, sx, sy, k, t, kind) { // 可互動的東西頭上的小標記
  const y = sy - 8 * k + Math.sin(t * 3) * 3 * k, s = 7 * k; g.save(); g.translate(sx, y); g.rotate(Math.PI / 4); g.fillStyle = kind === 'story' ? '#ffcf5a' : '#e8e2d0'; g.strokeStyle = U_INK; g.lineWidth = 2 * k; g.beginPath(); g.rect(-s / 2, -s / 2, s, s); g.fill(); g.stroke(); g.restore();
}
const STATION_PROP = { forge: 'Q', engrave: 'E', herb: 'h', board: 'k', window: 'z' };
// 探索時每格把要畫的東西交給渲染器
function worldCollect(t) {
  const units = [], decals = [], glow = [];
  if (!Z) return;
  const L = Z.leader, inB = S.mode === 'battle';
  if (!inB) {
    const hero = (h, lead) => { const pose = { t: t + (lead ? 0 : 1.3), a: h.moving ? 'walk' : 'idle', back: !!h.back, reforged: !!G.flags.reforged }; units.push({ x: h.x, y: h.y, z: h.z, xray: lead && occluded(h.x, h.y, h.z), draw(g, sx, sy, k, xr) { if (!xr) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx, sy, 17 * k, 6.5 * k, 0, 0, TAU); g.fill(); } drawUnitAt(g, h.id, sx, sy, k, { flip: h.flip, P: pose }); } }); };
    if (Z.id !== 'camp') for (let i = Z.followers.length - 1; i >= 0; i--) hero(Z.followers[i], false);
    hero(L, true);
    for (const gp of Z.groups) {
      if (!groupActive(gp)) continue;
      for (const u of gp.units) { const F = FOE[u.type], sc = F.scale || 1, air = u.row === 'air' ? 1.5 : 0; units.push({ x: u.x, y: u.y, z: u.z, draw(g, sx, sy, k) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx, sy, 18 * k * sc, 7 * k * sc, 0, 0, TAU); g.fill(); drawUnitAt(g, F.look, sx, sy - air * LH * 2 * k, k, { flip: true, scale: sc, P: { t: t + u.ph, a: 'idle' }, tint: F.tint, tintA: .3 }); } }); }
      if (!gp.e.noAuto) { const f = FACE8[gp.face] || FACE8[5], a0 = Math.atan2(f[1], f[0]); decals.push({ x: gp.e.x, y: gp.e.y, z: tileH(gp.e.x, gp.e.y), draw(g, sx, sy, k) { g.save(); g.beginPath(); g.moveTo(sx, sy); for (let i = 0; i <= 10; i++) { const a = a0 - .96 + i / 10 * 1.92, wx = gp.e.x + Math.cos(a) * 5, wy = gp.e.y + Math.sin(a) * 5; const p = w2s(wx, wy, tileH(gp.e.x, gp.e.y)); g.lineTo(p[0], p[1]); } g.closePath(); g.fillStyle = `rgba(255,90,70,${.11 + .04 * Math.sin(t * 3)})`; g.fill(); g.strokeStyle = 'rgba(255,120,90,.42)'; g.lineWidth = 1.2 * k; g.setLineDash([6 * k, 6 * k]); g.stroke(); g.restore(); } }); }
    }
  }
  for (const e of Z.ents) {
    if (!entVisible(e) || ['spawn', 'trigger', 'shaft'].includes(e.k)) continue;
    if (e.k === 'npc') { if (inB && !e.stay && Z.battleCenter && Math.hypot(e.x - Z.battleCenter.x, e.y - Z.battleCenter.y) < 6) continue; const flip = e.pose === 'down' ? false : !inB && (L.x - e.x) - (L.y - e.y) < 0, up = (e.lift || 0) * LH * 2; units.push({ x: e.x, y: e.y, z: e.z, draw(g, sx, sy, k) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx, sy, 17 * k, 6.5 * k, 0, 0, TAU); g.fill(); drawUnitAt(g, e.look, sx, sy - up * k, k, { flip, P: { t: t + e.x, a: e.pose || 'idle' } }); if (!inB && e.script && Math.hypot(e.x - L.x, e.y - L.y) < 6 && !S.dialog && !S.cut) drawMarker(g, sx, sy - (unitH(e.look) * (e.pose === 'down' ? .4 : .82) + up) * k, k, t, 'story'); } }); continue; }
    if (e.k === 'station') { if (e.need && !G.flags[e.need]) continue; if (e.id !== 'rest') { const sp = propSprite(STATION_PROP[e.id], 0); units.push({ x: e.x, y: e.y, z: e.z, draw(g, sx, sy, k) { g.drawImage(sp, sx - PAX * k, sy - PAY * k, PW * k, PH * k); if (e.id === 'window') drawWindowFill(g, sx, sy, k); if (!inB && Math.hypot(e.x - L.x, e.y - L.y) < 6 && !S.dialog) drawMarker(g, sx, sy - (e.id === 'window' ? 150 : 80) * k, k, t); } }); continue; } }
    units.push({ x: e.x, y: e.y, z: e.z, bias: e.k === 'exit' ? -.4 : 0, draw(g, sx, sy, k) { drawEnt(g, e, sx, sy, k, t); if (!inB && !e.done && ['chest', 'fire', 'hook', 'note', 'flame'].includes(e.k) && Math.hypot(e.x - L.x, e.y - L.y) < 5 && !S.dialog) drawMarker(g, sx, sy - (e.k === 'flame' ? 84 : e.obj ? 120 : 50) * k, k, t, e.kind === 'gold' || e.kind === 'court' ? 'story' : ''); } });
    if (e.k === 'shard' && !e.done) glow.push((g, k) => { const [sx, sy] = w2s(e.x, e.y, e.z + 1.6); const r = 26 * k; g.globalAlpha = .5 + .2 * Math.sin(t * 3 + e.id); g.drawImage(glowSprite(GLASS[e.id % 5]), sx - r, sy - r, r * 2, r * 2); g.globalAlpha = 1; });
  }
  // 天光
  for (const e of Z.ents) if (e.k === 'shaft') glow.push((g, k) => { const [sx, sy] = w2s(e.x, e.y, e.z); const w = 70 * k, gr = g.createLinearGradient(sx - w, 0, sx + w, 0); gr.addColorStop(0, 'rgba(160,210,255,0)'); gr.addColorStop(.5, `rgba(170,215,255,${.16 + .03 * Math.sin(t * .8)})`); gr.addColorStop(1, 'rgba(160,210,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(sx - w * .5, -10); g.lineTo(sx + w * .5, -10); g.lineTo(sx + w, sy); g.lineTo(sx - w, sy); g.closePath(); g.fill(); });
  // 點地的標記
  if (!inB && Z.tapMark && Z.t - Z.tapMark.t < .6) { const m = Z.tapMark, a = (Z.t - m.t) / .6; decals.push({ x: m.x, y: m.y, z: m.z, draw(g, sx, sy, k) { g.strokeStyle = `rgba(${m.strong ? '255,207,90' : '232,226,208'},${1 - a})`; g.lineWidth = 2 * k; g.beginPath(); g.ellipse(sx, sy, (8 + a * 14) * k, (4 + a * 7) * k, 0, 0, TAU); g.stroke(); } }); }
  if (!inB && !S.dialog) Gfx.dynLights = [{ x: L.x, y: L.y, c: '#ffe6c0', r: 5.2, z: 1.2, noGlow: true, i: .7 }];
  Gfx.units = inB ? units.concat(Gfx.bunits || []) : units; Gfx.decals = inB ? decals.concat(Gfx.bdecals || []) : decals; Gfx.glow = inB ? glow.concat(Gfx.bglow || []) : glow;
  // 物件擋住主角時淡出
  for (const tt of Gfx.tiles) if (tt.prop) { const dx = tt.x - L.x, dy = tt.y - L.y; const inFront = dx + dy > .3 && dx + dy < 3.2 && Math.abs(dx - dy) < 1.6 && 'PWJRTMZzNUS'.includes(tt.ch); const tg = inFront && !inB ? .35 : 1; tt.fadeA = tt.fadeA == null ? 1 : tt.fadeA + (tg - tt.fadeA) * .2; }
}
function drawWindowFill(g, sx, sy, k) { // 營地的殘窗：撿到幾片就亮幾瓣
  const n = G.shards.length; if (!n) return; const cxw = sx, cyw = sy - 84 * k;
  for (let i = 0; i < 12; i++) { if (!G.shards.includes(i + 1)) continue; const a0 = i / 12 * TAU - Math.PI / 2, a1 = a0 + TAU / 12; g.beginPath(); g.moveTo(cxw + Math.cos(a0) * 16 * k, cyw + Math.sin(a0) * 22 * k); g.lineTo(cxw + Math.cos(a0) * 43 * k, cyw + Math.sin(a0) * 59 * k); g.lineTo(cxw + Math.cos(a1) * 43 * k, cyw + Math.sin(a1) * 59 * k); g.lineTo(cxw + Math.cos(a1) * 16 * k, cyw + Math.sin(a1) * 22 * k); g.closePath(); g.fillStyle = GLASS[i % 5]; g.globalAlpha = .9; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#15131c'; g.lineWidth = 1.4 * k; g.stroke(); }
}
