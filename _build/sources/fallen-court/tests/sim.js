#!/usr/bin/env node
// 平衡模擬：node tests/sim.js [遭遇 id|all] [次數]
const path = require('path');
const { load, LOGIC } = require('./load.js');
function loadout(id, learned, lv) { const want = id === 'wei' ? ['w_lift', 'w_slam', 'w_dash', lv >= 6 ? 'w_time' : 'w_rip'] : id === 'yuan' ? ['y_mark', 'y_hoist', 'y_yank', 'y_hook'] : ['l_oath', 'l_slam', 'l_mend', 'l_ram']; const a = want.filter(x => learned.includes(x)); for (const x of learned) if (a.length < 4 && !a.includes(x)) a.push(x); return a.slice(0, 4); }
const X = load(LOGIC.concat([path.join(__dirname, 'bot.js')]), ['ENC', 'FOE', 'HERO', 'SK', 'genItem', 'calcHero', 'botBattle', 'battleResult', 'heroSkillsAt', 'xpNeed', 'foeXp', 'partyResonance', 'R']);
const { ENC, HERO, genItem, calcHero, botBattle, heroSkillsAt } = X;
function mkParty(lv, ids, seed) {
  const items = {}, party = {};
  for (const id of ids) {
    const eq = {}; const wb = id === 'wei' ? 'sword' : id === 'yuan' ? 'bow' : 'shield';
    const add = (slot, o) => { const it = genItem(o); items[it.uid] = it; eq[slot] = it.uid; };
    const r = lv >= 7 ? 2 : lv >= 3 ? 1 : 0;
    add('weapon', { il: lv, rar: Math.min(3, r + (lv >= 5 ? 1 : 0)), base: wb });
    add('armor', { il: lv, rar: r, base: id === 'yuan' ? 'armor_l' : id === 'luo' ? 'armor_h' : 'armor_m' });
    if (lv >= 2) add('trinket', { il: lv, rar: Math.max(1, r), base: 'trinket' });
    if (lv >= 5) add('relic', { il: lv, rar: 2, base: 'relic' });
    const tal = {}; for (const t of HERO[id].talents) if (lv >= t[0]) tal[t[1].id] = 1;
    party[id] = { lv, eq, tal, wounds: 0 };
  }
  return { party, items };
}
function cfgFor(enc, seed, opt) {
  const lv = (opt && opt.lv) || enc.lv, ids = enc.zone === 'vault' ? (enc.id === 'z0a' ? ['wei'] : ['wei', 'yuan']) : (enc.zone === 'slope' ? ['wei', 'yuan'] : ['wei', 'yuan', 'luo']);
  const P = mkParty(lv, (opt && opt.ids) || ids, seed);
  const heroes = ((opt && opt.ids) || ids).map(id => {
    const st = calcHero(id, P.party[id], P.items); const learned = heroSkillsAt(id, lv);
    return { id, stats: st, hp: Math.round(st.hpMax * ((opt && opt.hpPct) || 1)), skills: loadout(id, learned, lv), ultOk: id === 'wei' ? (lv >= 4 && enc.id !== 's6') : lv >= 7 }; // 魏子葳的奧義是打完三顎、開了庭造密匣才有的
  });
  return { heroes, foes: enc.foes, zl: enc.zl, scene: enc.scene || [], seed, items: { potion: 3, fire: 0, float: 0 }, boss: enc.boss, resoFam: null, atkK: (enc.atkK || 1) * ((opt && opt.atkK) || 1), hpK: (opt && opt.hpK) || 1 };
}
function run(id, n, opt) {
  const enc = ENC[id]; let win = 0, rounds = 0, loss = 0, downs = 0, pots = 0, tmo = 0, links = 0, perfect = 0, slams = 0, ints = 0, xp = 0;
  for (let i = 0; i < n; i++) {
    const cfg = cfgFor(enc, 1000 + i * 7919, opt);
    const hp0 = cfg.heroes.reduce((a, h) => a + h.hp, 0);
    const b = botBattle(cfg);
    if (b.over === 'win') win++; if (b.over === 'timeout') tmo++;
    rounds += b.time / 100;
    const hp1 = b.units.filter(u => u.side === 'hero').reduce((a, h) => a + h.hp, 0);
    loss += (hp0 - hp1) / hp0; downs += b.stat.downs; pots += 3 - b.items.potion; links += b.stat.links; perfect += b.stat.perfect; slams += b.stat.slams; ints += b.stat.interrupts; xp = b.xp;
  }
  const f = v => (v / n).toFixed(1);
  console.log(`${id.padEnd(5)} zl${enc.zl} lv${(opt && opt.lv) || enc.lv}  勝 ${(win / n * 100).toFixed(0).padStart(3)}%  輪 ${f(rounds).padStart(5)}  失血 ${(loss / n * 100).toFixed(0).padStart(3)}%  倒 ${f(downs)}  藥 ${f(pots)}  連攜 ${f(links)}/${f(perfect)}  墜 ${f(slams)}  斷 ${f(ints)}  xp ${xp}${tmo ? '  逾時 ' + tmo : ''}   ${enc.foes.join(',')}`);
}
const which = process.argv[2] || 'all', n = +(process.argv[3] || 40);
const ids = which === 'all' ? Object.keys(ENC) : which.split(',');
for (const id of ids) run(id, n, process.argv[4] ? { lv: +process.argv[4] } : null);
if (which === 'all') { let tot = 0, lv = 1, need = X.xpNeed(1); const log = []; for (const id of Object.keys(ENC)) { if (ENC[id].bounty) continue; let x = 0; for (const t of ENC[id].foes) x += X.foeXp(X.FOE[t], ENC[id].zl); tot += x; let acc = tot, L = 1; while (L < 10 && acc >= X.xpNeed(L)) { acc -= X.xpNeed(L); L++; } log.push(`${id}:${L}`); } console.log('打完各場後的等級（不含懸賞）', log.join(' ')); }
