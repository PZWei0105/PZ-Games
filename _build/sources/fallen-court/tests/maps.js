#!/usr/bin/env node
// 地圖檢查：node tests/maps.js [區域|all] [print]
const { load, LOGIC } = require('./load.js');
const X = load(LOGIC.concat(['05_maps.js']), ['ZONES', 'buildZone', 'BLOCKING', 'formation', 'ENC', 'SCENE']);
const { ZONES, buildZone, BLOCKING, formation, ENC } = X;
const which = process.argv[2] || 'all', pr = process.argv.includes('print');
let bad = 0;
for (const id of Object.keys(ZONES)) {
  if (which !== 'all' && which !== id) continue;
  const m = buildZone(id), w = m.w, h = m.h;
  const pass = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m.floor[y][x] !== ' ' && !BLOCKING.includes(m.obj[y][x]);
  const sp = m.ents.find(e => e.k === 'spawn' && e.id === 'start'); if (!sp) { console.log(id, 'BAD 沒有 spawn'); bad++; continue; }
  const seen = new Set(), q = [[Math.round(sp.x), Math.round(sp.y)]]; seen.add(q[0].join());
  if (!pass(q[0][0], q[0][1])) { console.log(id, 'BAD spawn 不能站', q[0]); bad++; }
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !pass(nx, ny)) continue; if (Math.abs(m.ht[ny][nx] - m.ht[y][x]) > 1) continue; seen.add(k); q.push([nx, ny]); } }
  const near = (x, y) => { x = Math.round(x); y = Math.round(y); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (seen.has((x + dx) + ',' + (y + dy))) return true; return false; };
  const hookT = new Set(m.ents.filter(e => e.k === 'hook').map(e => e.tx + ',' + e.ty));
  for (const e of m.ents) {
    if (e.x == null || e.k === 'shaft' || e.k === 'flame') continue;
    const isl = !near(e.x, e.y) && m.ents.some(hk => hk.k === 'hook' && hk !== e && Math.hypot(hk.tx - e.x, hk.ty - e.y) < 3.5) && (e.k === 'chest' || e.k === 'hook');
    if (isl && e.k === 'hook' && !seen.has(e.tx + ',' + e.ty)) { console.log(id, 'BAD 回程鉤索的落點走不到', e.id); bad++; }
    if (isl) { if (m.floor[Math.round(e.y)][Math.round(e.x)] === ' ') { console.log(id, 'BAD 鉤索平台上的東西懸空', e.id); bad++; } continue; }
    if (!near(e.x, e.y)) { console.log(id, 'BAD 走不到', e.k, e.id, e.x, e.y); bad++; }
    if ((e.k === 'shard' || e.k === 'exit' || e.k === 'trigger' || e.k === 'spawn') && !seen.has(Math.round(e.x) + ',' + Math.round(e.y))) { console.log(id, 'BAD 要站得上去的點被擋住', e.k, e.id, e.x, e.y); bad++; }
    if (e.k === 'enc') {
      const E = ENC[e.id], F = formation(3, 4, 3, 2), hh = m.ht[e.y][e.x];
      for (const p of [].concat(F.hero, F.front, F.back)) { const x = Math.round(e.x + p.x), y = Math.round(e.y + p.y); if (!pass(x, y) || m.ht[y][x] !== hh) { console.log(id, 'BAD 遭遇站位不平或被擋', e.id, x, y, m.floor[y] && m.floor[y][x], m.obj[y] && m.obj[y][x]); bad++; } if (!seen.has(x + ',' + y)) { console.log(id, 'BAD 站位走不到', e.id, x, y); bad++; } }
    }
    if (e.k === 'hook') { if (m.floor[e.ty][e.tx] === ' ') { console.log(id, 'BAD 鉤索落點懸空', e.id); bad++; } }
  }
  let tiles = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m.floor[y][x] !== ' ') tiles++;
  console.log(`${id.padEnd(8)} ${w}x${h}  地 ${tiles}  可達 ${seen.size}  物件 ${m.ents.length}  燈 ${m.lights.length}`);
  if (pr) {
    const mark = {}; for (const e of m.ents) if (e.x != null) mark[Math.round(e.x) + ',' + Math.round(e.y)] = { enc: '@', npc: '&', chest: '$', exit: '>', spawn: '<', fire: '*', shard: '%', note: '?', trigger: '!', hook: '^', station: '#' }[e.k] || '';
    for (let y = 0; y < h; y++) { let row = ''; for (let x = 0; x < w; x++) { const k = x + ',' + y; row += mark[k] ? mark[k] : m.obj[y][x] !== ' ' ? m.obj[y][x] : m.floor[y][x] === ' ' ? ' ' : (seen.has(k) ? String(m.ht[y][x]) : 'x'); } console.log(row.replace(/\s+$/, '')); }
  }
}
console.log(bad ? `有 ${bad} 個問題` : '全部通過');
process.exit(bad ? 1 : 0);
