'use strict';
/* ====== 模擬核心：狀態、人物、電力、冬眠艙、建築 API ====== */
function newGame(seed) {
  seed = seed >>> 0;
  R = RNG(seed ^ 0x51ed);
  uid.n = 0;
  G = {
    ver: 1, seed, t: 6 * 60 + 20, speed: 1, day: 1,
    res: { food: K.START_FOOD, metal: 34, fiber: 10, comp: 8, med: 2, data: 0 },
    power: { stored: K.HULL_START, cap: K.HULL_CAP, gen: 0, use: 0, ok: true, zeroFor: 0 },
    buildings: [], colonists: [], beasts: [], pods: [], scan: [], scanDay: 0,
    rel: {}, flags: {}, buffs: {}, rifles: 3, rifleQ: 0, compOn: true,
    tech: { done: {}, cur: null, prog: {} },
    story: { stage: 0, obj: [], side: [], seen: {}, done: {}, evLast: -9999, evCount: {}, evAt: {}, act: 1, sub: {} },
    tide: { day: 0, phase: 'none', blackout: false, lost: 0, waves: 0, boss: 0, n: 0 },
    exp: { phase: 'idle', team: [] },
    stats: { built: 0, killed: 0, lost: 0, woken: 0, harvested: {} },
    logs: [], weather: null, fogDirty: true, dirtyPath: true,
  };
  genWorld(seed);
  indexNodes();
  initPods();
  // 艦長
  const L = makeColonist(Object.assign({ key: 'weizw' }, CAST.weizw));
  const h = hull();
  L.x = h.x + 2.5; L.y = h.y + h.h + 0.5;
  L.food = 70; L.rest = 75;
  G.colonists.push(L);
  G.leaderId = L.id;
  return G;
}

/* ---------- 查詢 ---------- */
const hull = () => G.buildings.find(b => b.type === 'hull');
const leader = () => G.colonists.find(c => c.leader);
const byId = id => G.colonists.find(c => c.id === id);
const awake = () => G.colonists.filter(c => !c.dead && !c.away);
const awakeAll = () => G.colonists.filter(c => !c.dead);
const awakeCount = () => G.colonists.filter(c => !c.dead && !c.leader).length;
function C(key) { const c = G.colonists.find(x => x.key === key && !x.dead && !x.away); return c || null; }
function CA(key) { return G.colonists.find(x => x.key === key && !x.dead) || null; }
const hasB = type => G.buildings.some(b => b.type === type && b.done);
const countB = type => G.buildings.filter(b => b.type === type && b.done).length;
function nearB(type) { const b = G.buildings.find(x => x.type === type && x.done); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; }
function isNight(t = G.t) { const hh = hourOf(t); return hh >= K.SUNSET + 0.3 || hh < K.SUNRISE - 0.2; }
function sunFactor(t = G.t) {
  const hh = hourOf(t);
  if (hh <= K.SUNRISE || hh >= K.SUNSET) return 0;
  const p = (hh - K.SUNRISE) / (K.SUNSET - K.SUNRISE);
  return Math.pow(Math.sin(p * Math.PI), 0.8);
}
function darkness(t = G.t) {
  const hh = hourOf(t);
  // 0 = 白天, 1 = 深夜
  if (hh >= K.SUNRISE + 1 && hh <= K.SUNSET - 1) return 0;
  if (hh > K.SUNSET - 1 && hh < K.SUNSET + 1.2) return smooth((hh - (K.SUNSET - 1)) / 2.2);
  if (hh >= K.SUNSET + 1.2 || hh < K.SUNRISE - 1) return 1;
  return 1 - smooth((hh - (K.SUNRISE - 1)) / 2);
}

/* ---------- 紀錄 ---------- */
function log(text, type = 'info') {
  G.logs.push({ t: G.t, text, type });
  if (G.logs.length > 160) G.logs.shift();
  if (typeof UI !== 'undefined' && UI.toast && type !== 'quiet') UI.toast(text, type);
}

/* ---------- 人物 ---------- */
function makeColonist(def) {
  const g = def.g || 'm';
  const traits = [...(def.traits || [])];
  let hpMax = 100;
  if (traits.includes('體弱')) hpMax = 70;
  if (traits.includes('強壯')) hpMax = 125;
  const c = {
    id: uid(), key: def.key || null, name: def.name, g, he: g === 'f' ? '她' : '他', age: def.age, role: def.role,
    suit: def.suit || 'colon', hue: def.hue || '#7fe3ff', look: JSON.parse(JSON.stringify(def.look || { skin: 1, hair: 1, hc: '#222', acc: [] })),
    bio: def.bio || '', first: def.first || '', sk: Object.assign({}, def.sk), xp: {}, traits, job: def.job || 'build',
    leader: !!def.leader, minor: !!def.minor, seed: def.seed || 0,
    x: 0, y: 0, path: null, pi: 0, task: null, face: 1, walk: 0, moving: false,
    food: 80, rest: 80, hp: hpMax, hpMax, mood: 55, moodMods: [], mems: [], trust: def.trust != null ? def.trust : 15,
    bed: 0, sick: 0, sickLabel: '', downed: false, carriedBy: 0, carry: null, weapon: false,
    thought: '', thoughtAt: -999, bubble: null, partner: 0, apart: 0, offUntil: 0, away: false, hidden: false,
    brk: null, lowFor: 0, talkedAt: -99999, wokeAt: G ? G.t : 0, cmd: null, thinkAt: 0, fightT: 0, eatAt: 0,
  };
  for (const k of SKILL_KEYS) { if (c.sk[k] == null) c.sk[k] = 1; c.xp[k] = 0; }
  return c;
}
function makeGeneric(seed) {
  const r = RNG(seed);
  const g = r() < 0.5 ? 'f' : 'm';
  let name;
  if (r() < 0.2) name = (g === 'f' ? r.pick(NAME_POOL.ff) : r.pick(NAME_POOL.fm)) + '．' + r.pick(NAME_POOL.fl);
  else name = r.pick(NAME_POOL.sur) + r.pick(g === 'f' ? NAME_POOL.f : NAME_POOL.m);
  const role = r.pick(ROLES);
  const sk = {};
  for (const k of SKILL_KEYS) sk[k] = r.int(1, 4);
  for (const k in role.s) sk[k] = clamp(role.s[k] + r.int(-1, 1), 1, 9);
  const traits = [];
  const bad = [['樂天', '悲觀'], ['勤勞', '懶散'], ['話多', '寡言'], ['強壯', '體弱']];
  const nt = r() < 0.55 ? 2 : 1;
  for (let tries = 0; traits.length < nt && tries < 20; tries++) {
    const t = r.pick(GEN_TRAITS);
    if (traits.includes(t)) continue;
    if (bad.some(([a, b]) => (t === a && traits.includes(b)) || (t === b && traits.includes(a)))) continue;
    traits.push(t);
  }
  const he = g === 'f' ? '她' : '他';
  const hairM = [0, 1, 7, 8, 9, 11, 12], hairF = [2, 3, 4, 5, 6, 10, 12];
  const hcs = ['#1a1512', '#2b1d14', '#3b2a1a', '#5a3a22', '#8a6440', '#c9a46a', '#a33e27', '#d9d4cc', '#101010'];
  const acc = [];
  if (r() < 0.16) acc.push('glasses');
  if (g === 'm' && r() < 0.28) acc.push(r() < 0.5 ? 'beard' : 'stubble');
  if (r() < 0.12) acc.push('earring');
  if (r() < 0.08) acc.push('headband');
  if (r() < 0.07) acc.push('scar');
  if (r() < 0.06) acc.push('freckles');
  const age = r.int(19, 62);
  const hc = age > 55 && r() < 0.6 ? '#cfcac2' : r.pick(hcs);
  return {
    seed, name, g, age, role: role.n, suit: 'colon', job: role.j, sk, traits,
    hue: r.pick(HUES), trust: r.int(8, 26),
    look: { skin: r.int(0, 4), hair: r.pick(g === 'f' ? hairF : hairM), hc, acc, beard: hc },
    bio: role.n + '。' + r.pick(BACKSTORY).replace(/\{he\}/g, he).replace(/\{r\}/g, role.n),
    first: r.pick(FIRST_WORDS),
  };
}

/* ---------- 冬眠艙 ---------- */
function initPods() {
  const r = RNG(G.seed + 7);
  const keys = Object.keys(CAST).filter(k => k !== 'weizw' && !CAST[k].bridge);
  const pods = [];
  let n = 0;
  const label = () => { const s = 'ABCDEFG'[Math.floor(n / 16)]; const num = (n % 16) + 1; n++; return s + '-' + String(num).padStart(2, '0'); };
  const total = 112;
  const castSlots = new Set();
  while (castSlots.size < keys.length) castSlots.add(r.int(0, total - 1));
  const slots = [...castSlots];
  let ki = 0;
  for (let i = 0; i < total; i++) {
    const p = { id: uid(), label: label(), status: 'sleep', dmg: false, left: 0, repairQ: false, repair: 0 };
    if (castSlots.has(i)) p.key = keys[ki++];
    else p.seed = (G.seed * 31 + i * 977) >>> 0;
    // 部分資料毀損
    const rr = r();
    p.mask = { name: r() < 0.6, role: r() < 0.72, trait: r() < 0.5, corrupt: rr < 0.12 };
    pods.push(p);
  }
  // 角色專屬遮罩
  const set = (k, m) => { const p = pods.find(x => x.key === k); if (p) p.mask = Object.assign({ name: false, role: false, trait: false, corrupt: false }, m); };
  set('anna', { role: true, trait: true });
  set('qin', { name: true, role: false, trait: true });
  set('ye', { role: true });
  set('sophia', { role: true, name: false });
  set('tang', { corrupt: true });
  set('xu', { name: true, role: true });
  set('shen', { role: true, trait: false });
  set('xiaoman', { name: true });
  // 受損艙：白朗＋八具
  const bai = pods.find(p => p.key === 'bai');
  bai.dmg = true; bai.left = 7.5 * DAY;
  const gens = shuffle(pods.filter(p => !p.key), r).slice(0, 8);
  for (const p of gens) { p.dmg = true; p.left = (4 + r() * 9) * DAY; }
  G.pods = pods;
  G.scan = ['anna', 'qin', 'ye'].map(k => pods.find(p => p.key === k).id);
  G.scanDay = 1;
}
function podOf(key) { return G.pods.find(p => p.key === key && p.status === 'sleep') || null; }
function podById(id) { return G.pods.find(p => p.id === id); }
function podPerson(p) { return p.key ? Object.assign({ key: p.key }, CAST[p.key]) : makeGeneric(p.seed); }
function wakeCost() { return (G.tech.done.cryo ? K.WAKE_COST_CRYO : K.WAKE_COST) + (G.flags.aiLimited ? 10 : 0); }
function rescan(paid) {
  if (paid) { if (G.power.stored < 5) return false; G.power.stored -= 5; }
  const pool = G.pods.filter(p => p.status === 'sleep' && !p.dmg && !p.bridge);
  if (!pool.length) { G.scan = []; return true; }
  const castLeft = pool.filter(p => p.key).length;
  const pick = [];
  const woken = G.stats.woken;
  // 保證：第三次喚醒前出現導航員
  const soph = pool.find(p => p.key === 'sophia');
  if (soph && woken >= 1) pick.push(soph);
  while (pick.length < Math.min(3, pool.length)) {
    const p = weighted(pool.filter(x => !pick.includes(x)), x => x.key ? (woken < 10 ? 3.2 : 1.4) : (castLeft > 0 && woken < 10 ? 0.55 : 1));
    pick.push(p);
  }
  G.scan = shuffle(pick).map(p => p.id);
  G.scanDay = G.day;
  return true;
}
function wakePod(p, force) {
  const cost = wakeCost();
  if (G.power.stored < cost) return null;
  G.power.stored -= cost;
  p.status = 'awake';
  const def = podPerson(p);
  const c = makeColonist(def);
  const h = hull();
  const spots = accessTiles(h);
  const s = spots.length ? R.pick(spots) : [h.x, h.y + h.h];
  c.x = s[0] + 0.5; c.y = s[1] + 0.5;
  c.food = 55 + R() * 20; c.rest = 60 + R() * 20;
  const severe = p.dmg;
  const hrs = severe ? 18 + R() * 12 : (G.tech.done.cryo ? 1 + R() * 1.5 : 4 + R() * 4);
  sick(c, hrs * 60, severe ? '嚴重冬眠失調' : '冬眠失調');
  c.pod = p.id;
  if (severe) { c.hp = Math.round(c.hpMax * 0.6); }
  G.colonists.push(c);
  initRelations(c);
  mem(c, 'woke', 4, DAY, '從冬眠中醒來，還活著');
  for (const o of awake()) if (o !== c) mem(o, 'newmate', 2, DAY / 2, '有新的同伴醒來');
  // 夥伴連線
  if (c.key === 'bai' && CA('ye')) { CA('ye').partner = c.id; c.partner = CA('ye').id; }
  if (c.key === 'ye' && CA('bai')) { CA('bai').partner = c.id; c.partner = CA('bai').id; }
  G.stats.woken++;
  assignBeds();
  if (G.scan.includes(p.id)) { G.scan = G.scan.filter(id => id !== p.id); if (!G.scan.length) rescan(false); }
  log(`${c.name} 從冬眠中醒來了。`, 'quiet');
  if (typeof onWake === 'function') onWake(c);
  return c;
}
function initRelations(c) {
  for (const o of G.colonists) {
    if (o === c) continue;
    if (relGet(c, o) === undefined) relSet(c, o, Math.round((R() - 0.5) * 10));
    if (relGet(o, c) === undefined) relSet(o, c, Math.round((R() - 0.5) * 10));
    if (o.leader) relSet(c, o, c.trust * 0.5);
    for (const [a, b, v] of PRE_REL) {
      if (c.key === a && o.key === b) relSet(c, o, v);
      if (o.key === a && c.key === b) relSet(o, c, v);
    }
    if (o.traits.includes('慈祥')) relSet(c, o, Math.max(relGet(c, o), 12));
  }
}
const relKey = (a, b) => a.id + '>' + b.id;
function relGet(a, b) { return G.rel[relKey(a, b)]; }
function relSet(a, b, v) { G.rel[relKey(a, b)] = clamp(Math.round(v * 10) / 10, -100, 100); }
function opinion(a, b) { return (a && b && G.rel[relKey(a, b)]) || 0; }
function opin(a, b, d) { if (!a || !b) return; relSet(a, b, opinion(a, b) + d); }
function relLabel(v) {
  if (v >= 70) return ['摯友', 'good']; if (v >= 35) return ['朋友', 'good']; if (v > -35) return ['點頭之交', ''];
  if (v > -70) return ['不合', 'bad']; return ['仇敵', 'bad'];
}
function preTag(a, b) {
  for (const [x, y, , tag] of PRE_REL) if (a.key === x && b.key === y && tag) return tag;
  if (a.partner === b.id) return '伴侶';
  return '';
}

/* ---------- 心情、信任 ---------- */
function mem(c, id, v, dur, label) {
  if (!c) return;
  const m = c.mems.find(x => x.id === id);
  if (m) { m.v = v; m.until = G.t + dur; m.label = label; }
  else c.mems.push({ id, v, until: G.t + dur, label });
}
function memAll(id, v, dur, label, f) { for (const c of awake()) if (!f || f(c)) mem(c, id, v, dur, label); }
function trust(c, d) {
  if (!c || c.leader) return;
  let k = 1;
  if (c.traits.includes('固執')) k *= 0.5;
  if (d < 0 && c.traits.includes('忠誠')) k *= 0.5;
  c.trust = clamp(c.trust + d * k, -100, 100);
}
function trustAll(d, f) { for (const c of awake()) if (!c.leader && (!f || f(c))) trust(c, d); }
function avgTrust() { const l = awake().filter(c => !c.leader); return l.length ? l.reduce((s, c) => s + c.trust, 0) / l.length : 0; }

function calcMood(c) {
  const mods = [];
  const add = (v, label) => { if (v) mods.push({ v: Math.round(v), label }); };
  if (c.traits.includes('樂天')) add(6, '樂天');
  if (c.traits.includes('悲觀')) add(-6, '悲觀');
  if (c.food < 15) add(-14, '餓壞了'); else if (c.food < 30) add(-6, '肚子餓');
  if (c.rest < 15) add(-12, '累垮了'); else if (c.rest < 30) add(-5, '疲倦');
  if (c.hp < c.hpMax * 0.5) add(-8, '受傷');
  if (c.sick) add(-6, c.sickLabel || '生病');
  if (!c.leader) {
    if (c.trust >= 50) add(5, '信任艦長'); else if (c.trust <= -40) add(-8, '不信任艦長'); else if (c.trust <= -15) add(-3, '懷疑艦長');
  }
  if (c.bed) add(3, '有自己的床'); else if (G.day > 1) add(-6, '沒有床可以睡');
  if (c.traits.includes('怕黑') && isNight() && !nearLight(c.x, c.y)) add(-5, '怕黑');
  if (!c.traits.includes('慈祥')) { const o = awake().find(o => o !== c && o.traits.includes('慈祥') && dist(o.x, o.y, c.x, c.y) < 6); if (o) add(3, o.name + '在身邊'); }
  if (G.weather && G.weather.type === 'storm' && !G.weather.indoor && !c.hidden) add(-5, '頂著沙暴');
  if (c.partner && byId(c.partner) && !byId(c.partner).dead) add(4, '伴侶在身邊');
  if (c.traits.includes('工作狂')) { if (c.task && c.task.work) add(4, '工作中'); else if (!c.task || c.task.kind === 'leisure' || c.task.kind === 'wander') add(-3, '閒得發慌'); }
  const top = topSkill(c);
  if (c.job === top && !c.leader) add(3, '做著拿手的事');
  for (const m of c.mems) add(m.v, m.label);
  let mood = 52 + mods.reduce((s, m) => s + m.v, 0);
  c.mood = clamp(mood, 0, 100);
  mods.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  c.moodMods = mods;
  return c.mood;
}
function topSkill(c) { let b = 'build', v = -1; for (const k of SKILL_KEYS) if (k !== 'social' && c.sk[k] > v) { v = c.sk[k]; b = k; } return b === 'combat' ? 'guard' : b; }
function moodWord(m) { return m >= 80 ? '愉快' : m >= 60 ? '不錯' : m >= 40 ? '還行' : m >= 25 ? '低落' : '崩潰邊緣'; }

/* ---------- 傷病 ---------- */
function sick(c, dur, label) { if (!c) return; c.sick = Math.max(c.sick || 0, G.t + dur); c.sickLabel = label; }
function hurt(c, d, why) {
  if (!c || c.dead) return;
  c.hp -= d;
  c._dmgAcc = (c._dmgAcc || 0) + d;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
  if (typeof fxText === 'function' && (!c._dmgAt || nowMs - c._dmgAt > 450)) { fxText(c.x, c.y, '-' + Math.round(c._dmgAcc), '#ff6b6b'); c._dmgAt = nowMs; c._dmgAcc = 0; }
  if (c.hp <= 15 && !c.downed) {
    c.downed = true; c.task = null; c.path = null; c.carry = null;
    log(`${c.name} 倒下了${why ? '（' + why + '）' : ''}！`, 'bad');
    memAll('downed' + c.id, -6, DAY, c.name + '倒下了', o => o !== c && opinion(o, c) > 20);
  }
  if (c.hp <= 0) {
    if (c.leader) { c.hp = 1; return; }
    die(c, why);
  }
}
function die(c, why) {
  c.dead = true; c.downed = false; c.task = null;
  G.stats.lost++;
  log(`${c.name} 死了。`, 'bad');
  for (const o of awake()) {
    const op = opinion(o, c);
    if (o.partner === c.id || preTag(o, c) === '夫妻' || preTag(o, c) === '母女') mem(o, 'grief' + c.id, -30, 6 * DAY, '失去了' + c.name);
    else if (op > 35) mem(o, 'grief' + c.id, -14, 3 * DAY, '失去了朋友' + c.name);
    else mem(o, 'death' + c.id, -6, 2 * DAY, c.name + '死了');
  }
  trustAll(-4);
  if (c.bed) c.bed = 0;
  assignBeds();
}

/* ---------- 床位 ---------- */
function assignBeds() {
  const dorms = G.buildings.filter(b => b.type === 'dorm' && b.done);
  const cap = new Map(dorms.map(d => [d.id, BUILD.dorm.beds]));
  const ppl = awakeAll().filter(c => !c.away);
  for (const c of ppl) { if (c.bed && cap.has(c.bed) && cap.get(c.bed) > 0) cap.set(c.bed, cap.get(c.bed) - 1); else c.bed = 0; }
  for (const c of ppl) {
    if (c.bed) continue;
    // 伴侶優先同房
    const p = c.partner && byId(c.partner);
    if (p && p.bed && cap.get(p.bed) > 0) { c.bed = p.bed; cap.set(p.bed, cap.get(p.bed) - 1); continue; }
    for (const d of dorms) if (cap.get(d.id) > 0) { c.bed = d.id; cap.set(d.id, cap.get(d.id) - 1); break; }
  }
}
function bedCount() { return countB('dorm') * BUILD.dorm.beds; }

/* ---------- 電力 ---------- */
function powerStep(dt) {
  const P = G.power;
  let cap = K.HULL_CAP, gen = 0, use = G.tide.blackout ? 0.6 : K.CRYO_DRAIN;
  const sun = sunFactor() * (G.weather && G.weather.type === 'storm' ? 0.2 : 1) * (G.tech.done.solar2 ? 1.25 : 1);
  for (const b of G.buildings) {
    if (!b.done) continue;
    const d = BUILD[b.type];
    if (d.cap) cap += d.cap;
    if (d.solar) { b.out = d.gen * sun; gen += b.out; }
    else if (b.type === 'biogen') {
      if (b.active && (b.fuel > 0 || G.res.fiber >= 1)) {
        b.fuel = (b.fuel || 0) - dt;
        if (b.fuel <= 0) { if (G.res.fiber >= 1) { G.res.fiber -= 1; b.fuel += 120; } }
        b.out = b.fuel > 0 ? d.gen : 0; gen += b.out;
      } else b.out = 0;
    }
    if (d.use && b.active) {
      let u = d.use;
      if (['research', 'workshop', 'medbay'].includes(b.type)) u *= b.busy ? 1 : 0.15;
      if (b.type === 'greenhouse' && (G.flags.ghDark > G.t)) u *= 0.3;
      if (G.tide.blackout && b.type !== 'turret') u *= 0.1;
      if (b.type === 'lamp' && !isNight()) u *= 0.1;
      if (b.type === 'turret') u *= b.firing ? 6 : 1;
      use += u;
    }
  }
  P.cap = cap; P.gen = gen; P.use = use;
  P.stored = clamp(P.stored + (gen - use) * dt / 60, 0, cap);
  const was = P.ok;
  P.ok = P.stored > 0.5 || gen >= use;
  if (!P.ok) { P.zeroFor += dt; } else P.zeroFor = 0;
  if (was && !P.ok) log('電力耗盡！冬眠艙維生系統正在降級。', 'bad');
  if (!was && P.ok) log('電力恢復。', 'good');
  // 長時間斷電：冬眠艙開始失效
  if (P.zeroFor > 240 && R() < dt / 520) podFail('電力耗盡');
  if (P.zeroFor > 0 && P.zeroFor - dt <= 0 && typeof SFX !== 'undefined') SFX.alert();
}
function podFail(why, target) {
  const list = G.pods.filter(p => p.status === 'sleep' && !p.bridge);
  if (!list.length) return;
  // 先挑受損艙與一般人
  const gen = list.filter(p => !p.key);
  const pick = target || list.find(p => p.dmg && !p.key) || gen[Math.floor(R() * gen.length)] || list[0];
  pick.status = 'lost';
  G.stats.lost++;
  const who = pick.key ? CAST[pick.key].name : makeGeneric(pick.seed).name;
  log(`冬眠艙 ${pick.label} 停止運作。${who} 再也醒不過來了。（${why}）`, 'bad');
  memAll('podlost', -5, DAY, '有冬眠艙停止運作了');
  if (pick.key === 'bai' && CA('ye')) mem(CA('ye'), 'griefbai', -35, 8 * DAY, '白朗沒能醒來');
  trustAll(-2);
}
function podStep(dt) {
  for (const p of G.pods) {
    if (p.status !== 'sleep' || !p.dmg) continue;
    p.left -= dt;
    if (p.left <= 0) { p.left = 0; if (p.repairQ) { p.left = 60; continue; } podFail('維生系統失效', p); }
  }
}
function nearLight(x, y) {
  for (const b of G.buildings) {
    if (!b.done) continue;
    if (b.type === 'lamp' && b.active && G.power.ok && !G.tide.blackout && dist(b.x + .5, b.y + .5, x, y) < BUILD.lamp.light) return true;
    if (b.type === 'hull' && dist(b.x + 2.5, b.y + 1.5, x, y) < 5) return true;
    if (b.type === 'mess' && dist(b.x + 1, b.y + 1, x, y) < 3.5) return true;
  }
  return false;
}

/* ---------- 建築 API（給介面用） ---------- */
function isUnlocked(type) {
  const d = BUILD[type];
  if (!d.req) return true;
  if (d.req === '@antenna') return !!G.flags.antenna;
  return !!G.tech.done[d.req];
}
function canAfford(cost) { for (const k in cost) if ((G.res[k] || 0) < cost[k]) return false; return true; }
function orderBuild(type, x, y) {
  const d = BUILD[type];
  if (!isUnlocked(type)) return '尚未解鎖';
  if (!canAfford(d.cost)) return '材料不足';
  const why = canPlace(type, x, y);
  if (why) return why;
  for (const k in d.cost) G.res[k] -= d.cost[k];
  const b = placeBuilding(type, x, y, false);
  // 站在工地上的人讓開
  for (const c of G.colonists) if (!c.away && bAt(Math.floor(c.x), Math.floor(c.y)) === b) nudgeOut(c);
  return b;
}
function nudgeOut(c) {
  const fx = Math.floor(c.x), fy = Math.floor(c.y);
  for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (passable(fx + dx, fy + dy)) { c.x = fx + dx + .5; c.y = fy + dy + .5; c.path = null; c.task = null; return; }
  }
}
function cancelBuild(b) {
  const d = BUILD[b.type];
  if (b.type === 'hull') return;
  const k = b.done ? 0.5 : 1;
  for (const r in d.cost) G.res[r] += Math.floor(d.cost[r] * k);
  for (const c of G.colonists) {
    if (c.task && c.task.bid === b.id) { c.task = null; c.path = null; }
    if (c.bed === b.id) c.bed = 0;
  }
  removeBuilding(b);
  assignBeds();
}
function completeBuilding(b) {
  b.done = true; b.prog = 1; b.hp = b.hpMax;
  G.stats.built++;
  if (b.type === 'dorm') assignBeds();
  if (b.type === 'antenna') G.flags.antennaBuilt = 1;
  if (typeof fxBurst === 'function') fxBurst(b.x + b.w / 2, b.y + b.h / 2, '#bff7ff', 22, 1.2);
  if (typeof SFX !== 'undefined') SFX.done();
  log(`${BUILD[b.type].name}完工了。` + (b.type === 'antenna' ? '現在可以研究「信號解析」了。' : ''), 'good');
  if (typeof onBuilt === 'function') onBuilt(b);
}
function setJob(c, job) {
  if (c.job === job) return;
  // 警戒才拿槍
  if (c.weapon && job !== 'guard') { c.weapon = false; G.rifles++; }
  c.job = job; c.task = null; c.path = null; c.cmd = null;
  if (job === 'guard' && !c.weapon && G.rifles > 0) { c.weapon = true; G.rifles--; }
}
function markNode(n, v) { n.marked = v; }
function markNear(n, rad = 8) { let k = 0; for (const m of G.world.nodes) if (m.type === n.type && dist(m.x, m.y, n.x, n.y) <= rad && explored(m.x, m.y)) { m.marked = true; k++; } return k; }
function repairPod(p) {
  if (!p.dmg || p.repairQ) return false;
  if (G.res.comp < 6) return false;
  G.res.comp -= 6; p.repairQ = true; p.repair = 0;
  return true;
}
