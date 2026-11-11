#!/usr/bin/env node
// 把定案的數值從程式裡倒出來（Markdown），用來核對與更新 DESIGN.md：node tests/dump.js [foes|enc|leg|hero|all]
const { load, LOGIC } = require('./load.js');
const X = load(LOGIC, ['FOE', 'ENC', 'LEG', 'HERO', 'SK', 'BASE', 'xpNeed', 'foeHp', 'foeAtk', 'RULE', 'STATUS', 'AFFIX', 'FAMILY']);
const { FOE, ENC, LEG, HERO, SK, BASE } = X, what = process.argv[2] || 'all', out = [];
const ROW = { front: '前', back: '後', air: '空' };
const mv = m => { let s = m.n; const p = []; if (m.mult) p.push(Math.round(m.mult * 100) + '%' + (m.hits > 1 ? '×' + m.hits : '')); if (m.tgt === 'all') p.push('全隊'); if (m.delay) p.push('延遲 ' + m.delay); if (m.charge) p.push('蓄 ' + m.charge.pips + (m.charge.t >= 120 ? '・長' : '')); if (m.cd) p.push('冷卻 ' + m.cd); return s + (p.length ? '（' + p.join('、') + '）' : ''); };
if (what === 'foes' || what === 'all') {
  out.push('| 敵人 | 排 | 生命/攻/甲/速 | 重量 | 特性 | 招式 |', '|---|---|---|---|---|---|');
  for (const k in FOE) { const f = FOE[k]; out.push(`| ${f.elite ? '【精英】' : f.boss ? '【層主】' : ''}${f.n} \`${k}\` | ${ROW[f.row] || f.row} | ${f.hp}/${f.atk}/${f.arm}/${f.spd} | ${f.w} | ${(f.traits || []).map(t => `**${t.n}**：${t.d}`).join('<br>') || '—'} | ${(f.moves || []).map(mv).join('；')} |`); }
  out.push('');
}
if (what === 'enc' || what === 'all') {
  out.push('| 遭遇 | 區域 | 區域等級 | 建議等級 | 敵人 | 地利 | 備註 |', '|---|---|---|---|---|---|---|');
  for (const k in ENC) { const e = ENC[k]; out.push(`| ${k} | ${e.zone} | ${e.zl} | ${e.lv} | ${e.foes.map(f => FOE[f] ? FOE[f].n : f).join('、')} | ${(e.scene || []).join('、') || '—'} | ${[e.atkK ? '敵攻 ×' + e.atkK : '', e.elite ? '精英' : '', e.boss ? '層主' : '', e.opt ? '可選' : ''].filter(Boolean).join('、')} |`); }
  out.push('');
}
if (what === 'leg' || what === 'all') {
  out.push('| 名稱 | 底材 | 系 | 規則 |', '|---|---|---|---|');
  for (const k in LEG) { const l = LEG[k]; out.push(`| ${l.n} \`${k}\` | ${BASE[l.base] ? BASE[l.base].n : l.base} | ${l.fam || '—'} | ${l.rule} |`); }
  out.push('');
}
if (what === 'hero' || what === 'all') {
  for (const k in HERO) { const h = HERO[k]; out.push(`- ${h.n} \`${k}\`：` + JSON.stringify({ hp: h.hp, atk: h.atk, arm: h.arm, spd: h.spd, crit: h.crit, w: h.w, g: h.grow || h.g })); }
  out.push('', '升級門檻：' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => `${l}→${l + 1}：${X.xpNeed(l)}`).join('、'), '');
}
console.log(out.join('\n'));
