#!/usr/bin/env node
// 印出一場戰鬥的逐手紀錄：node tests/trace.js <遭遇> [seed] [lv]
const path = require('path');
const { load, LOGIC } = require('./load.js');
function loadout(id, learned, lv) { const want = id === 'wei' ? ['w_lift', 'w_slam', 'w_dash', lv >= 6 ? 'w_time' : 'w_rip'] : id === 'yuan' ? ['y_mark', 'y_hoist', 'y_yank', 'y_hook'] : ['l_oath', 'l_slam', 'l_mend', 'l_ram']; const a = want.filter(x => learned.includes(x)); for (const x of learned) if (a.length < 4 && !a.includes(x)) a.push(x); return a.slice(0, 4); }
const X = load(LOGIC.concat([path.join(__dirname, 'bot.js')]), ['ENC', 'FOE', 'HERO', 'SK', 'genItem', 'calcHero', 'heroSkillsAt', 'battleNew', 'bNext', 'bAct', 'foeAct', 'botChoose', 'itemName', 'affText', 'getB', 'intentInfo'], 'function getB(){return B;}');
const { ENC, HERO, SK, FOE } = X;
const id = process.argv[2] || 's1', seed = +(process.argv[3] || 1), enc = ENC[id], lv = +(process.argv[4] || enc.lv);
const ids = enc.zone === 'vault' ? (id === 'z0a' ? ['wei'] : ['wei', 'yuan']) : (enc.zone === 'slope' ? ['wei', 'yuan'] : ['wei', 'yuan', 'luo']);
const items = {}, heroes = [];
for (const h of ids) {
  const eq = {}; const add = (slot, o) => { const it = X.genItem(o); items[it.uid] = it; eq[slot] = it.uid; };
  const r = lv >= 7 ? 2 : lv >= 3 ? 1 : 0;
  add('weapon', { il: lv, rar: Math.min(3, r + (lv >= 5 ? 1 : 0)), base: h === 'wei' ? 'sword' : h === 'yuan' ? 'bow' : 'shield' });
  add('armor', { il: lv, rar: r, base: h === 'yuan' ? 'armor_l' : h === 'luo' ? 'armor_h' : 'armor_m' });
  if (lv >= 2) add('trinket', { il: lv, rar: Math.max(1, r), base: 'trinket' });
  if (lv >= 5) add('relic', { il: lv, rar: 2, base: 'relic' });
  const tal = {}; for (const t of HERO[h].talents) if (lv >= t[0]) tal[t[1].id] = 1;
  const st = X.calcHero(h, { lv, eq, tal, wounds: 0 }, items);
  console.log(HERO[h].n, 'hp', st.hpMax, 'atk', st.atk.toFixed(1), 'arm', st.arm, 'spd', st.spd, 'crit', st.crit, '|', Object.values(eq).map(u => X.itemName(items[u])).join('、'));
  heroes.push({ id: h, stats: st, skills: loadout(h, X.heroSkillsAt(h, lv), lv), ultOk: h === 'wei' ? lv >= 4 : lv >= 7 });
}
X.battleNew({ heroes, foes: enc.foes, zl: enc.zl, scene: enc.scene || [], seed, items: { potion: 3, fire: lv >= 4 ? 2 : 0, float: lv >= 4 ? 2 : 0 }, boss: enc.boss });
let B = X.getB();
const nm = u => (u.side === 'hero' ? u.name : u.name + '#' + u.id);
console.log('敵：', B.units.filter(u => u.side === 'foe').map(u => `${nm(u)} hp${u.hp} atk${u.atk.toFixed(0)} arm${u.arm}`).join(' / '));
let n = 0;
while (!B.over && n++ < 200) {
  const r = X.bNext(); if (!r.u) continue; if (B.over) break;
  const u = r.u; let evs, head;
  if (u.side === 'hero') { const a = X.botChoose(u); head = `${nm(u)} → ${SK[a.sk].n}${typeof a.tgt === 'number' ? ' @' + nm(B.units[a.tgt]) : a.tgt && a.tgt.scene != null ? ' @地利' + B.scene[a.tgt.scene].k : ''}`; evs = X.bAct(u.id, a.sk, a.tgt); }
  else { const it = X.intentInfo(u); head = `${nm(u)} ▷ ${it ? it.mv.n : '?'}${u.charging ? '（發動）' : it && it.willCharge ? '（開始蓄力）' : ''}`; evs = X.foeAct(u); }
  const parts = [];
  for (const e of r.ev.concat(evs)) {
    if (e.t === 'hit') parts.push(`${nm(B.units[e.tgt])} -${e.dmg}${e.crit ? '!' : ''}${e.kind && e.kind !== 'skill' && e.kind !== 'foe' ? '(' + e.kind + ')' : ''}→${e.hp}`);
    else if (['launch', 'slam', 'interrupt', 'death', 'down', 'cover', 'evade', 'counter', 'unison', 'hangdrop', 'ledge', 'summon'].includes(e.t)) parts.push(e.t);
    else if (e.t === 'act' && e.link) parts.push(e.perfect ? '完美連攜' : '連攜');
    else if (e.t === 'text') parts.push('「' + e.s + '」');
  }
  console.log(`t${B.time.toFixed(0).padStart(4)} ${head}  ${parts.join(' ')}`);
  if (B.parley && !B.parleyDone) { B.parleyDone = true; B.parley = false; console.log('—— 認出 ——'); }
}
console.log('結果', B.over, '時間', B.time.toFixed(0), '英雄', B.units.filter(u => u.side === 'hero').map(u => `${u.name} ${u.hp}/${u.hpMax}`).join(' '));
