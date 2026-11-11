// ============ 區域地圖 ============
// 地圖用程式蓋：格子只是美術與碰撞的單位，人物是連續座標自由走動，畫面上沒有格線。
// 地形 floor：s 石板｜r 鏽鐵板｜d 渣土｜w 木棧｜m 苔｜o 油｜g 彩窗地｜c 鏈格柵｜空白＝虛空
// 高度 0～6（每階可直接跨一階；差兩階以上是斷崖）
// 物件：P 殘柱｜p 斷柱｜W 殘牆｜X 木箱｜D 瓦礫｜J 廢料堆｜L 燈柱｜F 浮石簇｜R 船肋｜U 斷像｜N 殘旗｜Y 垂鏈｜T 帳篷｜S 攤子｜O 油桶堆｜M 墜碑｜A 錨樁｜V 靜滯棺｜Z 斷鏈
const BLOCKING = 'PpWXDJLFRUNYTSOMAVZQEhkzGgB';
// 戰鬥站位（以遭遇點為中心）：我方在畫面左、敵方在畫面右
// 以畫面方向描述的位移換成格座標：r＝往畫面右、d＝往畫面下（單位：一格對角線長）
function scr2grid(r, d) { return { x: (r + d) * .7071, y: (-r + d) * .7071 }; }
// kx：左右收攏的倍率（戰鬥時直拿畫面窄，把隊形往中間收，人就能畫大一點；地圖與探索一律用 1）
function formation(nHero, front, back, air, kx) {
  kx = kx || 1;
  const col = (n, r, sp, off) => { const a = []; for (let i = 0; i < n; i++) a.push(scr2grid((r + (i % 2 ? .8 : 0)) * kx, (i - (n - 1) / 2) * sp + (off || 0))); return a; };
  const hero = []; for (let i = 0; i < nHero; i++) hero.push(scr2grid((-2.5 - (i === 1 ? .95 : 0)) * kx, (i - (nHero - 1) / 2) * 2.7));
  return { hero, front: col(front, 1.05, front > 3 ? 2.1 : 2.5), back: col(back, 3.25, 2.5, front ? 1.1 : 0), air: col(air, 2.3, 2.5, -.4) };
}
const SCENE_SLOT = [scr2grid(.2, -4.2), scr2grid(2.0, -4.4), scr2grid(-1.6, -4.0)];

function ZoneBuilder(w, h, seed) {
  const m = { w, h, floor: [], ht: [], obj: [], res: [], ents: [], lights: [], rng: mulberry32(seed) };
  for (let y = 0; y < h; y++) { m.floor.push(new Array(w).fill(' ')); m.ht.push(new Array(w).fill(0)); m.obj.push(new Array(w).fill(' ')); m.res.push(new Array(w).fill(0)); }
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const noise = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233 + seed * .37) * 43758.5453; return s - Math.floor(s); };
  m.set = (x, y, f, hh) => { if (!inb(x, y)) return; if (f != null) m.floor[y][x] = f; if (hh != null) m.ht[y][x] = hh; };
  m.rect = (x0, y0, x1, y1, f, hh) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y, f, hh); };
  m.blob = (cx, cy, rx, ry, f, hh, rough) => {
    rough = rough == null ? .22 : rough;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy, e = 1 + (noise(x, y) - .5) * 2 * rough;
      if (d <= e) m.set(x, y, f, hh);
    }
  };
  // 一條路：寬 wd，高度從 ha 漸變到 hb（自動變成階）
  m.path = (x0, y0, x1, y1, wd, f, ha, hb) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1; hb = hb == null ? ha : hb;
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, hh = Math.round(ha + (hb - ha) * t), r = (wd - 1) / 2;
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { if (!inb(xx, yy)) continue; if (m.floor[yy][xx] === ' ' || f === 'c' || f === 'w') m.set(xx, yy, f, hh); else if (ha !== hb) m.ht[yy][xx] = hh; m.res[yy][xx] = 1; } }
  };
  m.reserve = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inb(x, y)) m.res[y][x] = 1; };
  m.o = (ch, x, y) => { if (inb(x, y) && m.floor[y][x] !== ' ') { m.obj[y][x] = ch; m.res[y][x] = 1; } };
  m.os = (ch, list) => { for (const p of list) m.o(ch, p[0], p[1]); };
  m.scatter = (chs, cx, cy, r, n) => { let tries = 0, done = 0; while (done < n && tries++ < n * 30) { const x = Math.round(cx + (m.rng() * 2 - 1) * r), y = Math.round(cy + (m.rng() * 2 - 1) * r); if (!inb(x, y) || m.floor[y][x] === ' ' || m.res[y][x] || m.obj[y][x] !== ' ' || 'oc'.includes(m.floor[y][x])) continue; m.obj[y][x] = chs[Math.floor(m.rng() * chs.length)]; done++; } };
  m.ent = e => { m.ents.push(e); if (e.x != null) m.reserve(e.x, e.y, e.k === 'enc' ? 0 : 1); return e; };
  m.light = (x, y, c, r, z, fl) => m.lights.push({ x, y, c, r, z: z || 1.5, fl: fl == null ? .08 : fl });
  // 遭遇點：把站位附近整平、保留空地，並擺上地利的物件
  m.enc = (id, cx, cy, o) => {
    const E = ENC[id], hh = m.ht[cy][cx]; o = o || {};
    const F = formation(3, 4, 3, 2), pts = [].concat(F.hero, F.front, F.back);
    for (const p of pts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = Math.round(cx + p.x) + dx, y = Math.round(cy + p.y) + dy; if (!inb(x, y)) continue; if (m.floor[y][x] === ' ') m.floor[y][x] = o.fill || m.floor[cy][cx]; m.ht[y][x] = hh; m.obj[y][x] = ' '; m.res[y][x] = 1; }
    m.reserve(cx, cy, 2);
    const sc = (E.scene || []).filter(k => !SCENE[k].passive), props = [];
    sc.forEach((k, i) => { const s = SCENE_SLOT[i % 3], x = Math.round(cx + s.x), y = Math.round(cy + s.y); if (k !== 'hang') { if (inb(x, y)) { if (m.floor[y][x] === ' ') m.floor[y][x] = m.floor[cy][cx]; m.ht[y][x] = hh; m.obj[y][x] = k === 'barrel' ? 'B' : 'F'; m.res[y][x] = 1; } props.push({ k, x, y }); } else { const hp = o.hang && o.hang[i] ? scr2grid(o.hang[i][0], o.hang[i][1]) : scr2grid(1.2 + i * .9, -1.0 + i * 1.2); props.push({ k, x: cx + hp.x, y: cy + hp.y }); } });
    if ((E.scene || []).includes('oil')) for (const p of F.front.concat(F.back)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = Math.round(cx + p.x) + dx, y = Math.round(cy + p.y) + dy; if (inb(x, y) && m.floor[y][x] !== ' ') m.floor[y][x] = 'o'; }
    return m.ent(Object.assign({ k: 'enc', id, x: cx, y: cy, face: o.face == null ? 5 : o.face, props }, o));
  };
  return m;
}

const ZONES = {
  // ───────── 序：靜滯窖 ─────────
  vault: {
    n: '靜滯窖', sub: '壓艙層・最深處', zl: 1, w: 30, h: 30, seed: 11, amb: '#4d5680', music: 'deep',
    build(m) {
      m.blob(22, 22, 5.2, 5.2, 's', 0);            // 棺室
      m.blob(22, 22, 2.6, 2.6, 'g', 0, .1);
      m.path(18, 20, 15, 16, 3, 'r', 0);
      m.blob(13, 14, 6, 6, 'r', 0);                // 第一戰
      m.blob(16, 9, 2.6, 2.6, 'd', 0);             // 側龕（箱）
      m.path(10, 12, 8, 9, 3, 's', 0, 1);
      m.blob(7, 7, 6, 6, 's', 1);                  // 第二戰（高一階）
      m.path(4, 4, 2, 2, 3, 'w', 1);
      m.o('V', 23, 23); m.os('F', [[25, 20], [19, 24], [24, 25]]); m.os('P', [[20, 19], [25, 23]]); m.os('p', [[19, 22], [22, 26]]);
      m.os('U', [[26, 21]]); m.os('D', [[24, 18], [18, 23]]);
      m.enc('z0a', 13, 14, { face: 3 }); m.enc('z0b', 7, 7, { face: 3 });
      m.scatter('DpX', 13, 14, 6, 7); m.scatter('DpPJ', 7, 7, 6, 7); m.o('L', 3, 5);
      m.ent({ k: 'spawn', id: 'start', x: 23.7, y: 24.3 });
      m.ent({ k: 'chest', id: 'v_c1', x: 16, y: 8, kind: 'chest' });
      m.ent({ k: 'shard', id: 1, x: 25, y: 25 });
      m.ent({ k: 'note', id: 'v_pod', x: 23, y: 23, script: 'n_pod', obj: true });
      m.ent({ k: 'exit', id: 'v_out', x: 2, y: 2, to: 'camp', script: 'x_vault_out' });
      m.ent({ k: 'shaft', x: 22, y: 22 });
      m.light(22, 22, '#9fd8ff', 6.5, 3, .03); m.light(3, 5, '#ffb86b', 4.5);
    },
  },
  // ───────── 覆舟營 ─────────
  camp: {
    n: '覆舟營', sub: '倒扣的渡空舟底下', zl: 1, w: 24, h: 24, seed: 23, amb: '#5c5a78', music: 'camp', safe: true,
    build(m) {
      m.blob(12, 12, 8.6, 8.6, 'd', 0, .16);
      m.blob(12, 11, 4.2, 4.2, 'w', 0, .08);
      m.path(12, 19, 12, 22, 3, 'w', 0);
      m.os('R', [[7, 7], [9, 5], [15, 5], [17, 7], [6, 11], [18, 11]]);      // 船肋
      m.os('L', [[8, 15], [16, 15]]); m.os('X', [[6, 14], [18, 14], [17, 9]]); m.o('T', 8, 9);
      m.ent({ k: 'station', id: 'rest', x: 12, y: 12 });
      m.ent({ k: 'station', id: 'forge', x: 16, y: 8, need: 'r_hammer' });
      m.ent({ k: 'station', id: 'engrave', x: 7, y: 12, need: 'r_blind' });
      m.ent({ k: 'station', id: 'herb', x: 15, y: 15, need: 'r_zhu' });
      m.ent({ k: 'station', id: 'board', x: 9, y: 16, need: 'r_ear' });
      m.ent({ k: 'station', id: 'window', x: 12, y: 6 });
      m.ent({ k: 'npc', id: 'yuan', x: 10.4, y: 12.6, look: 'yuan', script: 't_yuan', cond: 'has:yuan' });
      m.ent({ k: 'npc', id: 'luo', x: 13.8, y: 12.8, look: 'luo', script: 't_luo', cond: 'has:luo' });
      m.ent({ k: 'npc', id: 'hammer', x: 16.6, y: 9.2, look: 'hammer', script: 't_hammer', cond: 'flag:r_hammer' });
      m.ent({ k: 'npc', id: 'blind', x: 7.6, y: 13.2, look: 'blind', script: 't_blind', cond: 'flag:r_blind' });
      m.ent({ k: 'npc', id: 'zhu', x: 15.6, y: 16.2, look: 'zhu', script: 't_zhu', cond: 'flag:r_zhu' });
      m.ent({ k: 'npc', id: 'ear', x: 9.8, y: 17, look: 'ear', script: 't_ear', cond: 'flag:r_ear' });
      m.ent({ k: 'spawn', id: 'start', x: 11.1, y: 15.2 });
      m.ent({ k: 'exit', id: 'c_out', x: 12, y: 22, to: 'map' });
      m.light(12, 12, '#ffa860', 7.5, 1, .12); m.light(8, 15, '#ffb86b', 4); m.light(16, 15, '#ffb86b', 4); m.light(12, 6, '#9fd8ff', 4, 2.5, .03);
    },
  },
  // ───────── 骸骨坡 ─────────
  slope: {
    n: '骸骨坡', sub: '壓艙層・墜落物堆成的坡', zl: 2, w: 44, h: 44, seed: 37, amb: '#525878', music: 'explore',
    build(m) {
      m.blob(37, 37, 4.5, 4.5, 'd', 0);              // 入口
      m.path(34, 35, 31, 31, 3, 'd', 0);
      m.blob(29, 29, 6.2, 6.2, 'd', 0);              // s1
      m.path(24, 29, 21, 29, 3, 'w', 0);
      m.blob(17, 29, 6.2, 6.2, 'r', 0);              // s2（老鎚）
      m.path(29, 24, 30, 20, 3, 'd', 0, 1);
      m.blob(30, 16, 6.4, 6.4, 's', 1);              // s3
      m.blob(23, 22, 3, 3, 'd', 0);                  // 殘火
      m.path(25, 15, 22, 14, 3, 's', 1);
      m.blob(18, 13, 6.4, 6.4, 's', 1);              // s4（第一具鏽衛）
      m.path(13, 26, 11, 23, 3, 'd', 0, 1);
      m.blob(8, 21, 6.2, 6.2, 'd', 1);               // s5（算盤）
      m.path(14, 10, 12, 9, 3, 's', 1, 2);
      m.blob(8, 7, 6.6, 6.6, 'w', 2);                // s6（三顎：稅舟殘骸）
      m.blob(36, 9, 6, 6, 'r', 1);                   // 懸賞：零七
      m.path(34, 13, 35, 12, 3, 'r', 1);
      m.blob(38, 24, 3, 3, 'd', 0);                  // 金繼箱小台（要鉤索）
      m.rect(36, 23, 40, 26, 'r', 2);
      m.os('R', [[4, 3], [6, 2], [10, 2], [12, 3], [3, 6]]); m.os('J', [[5, 4], [11, 4]]);
      m.enc('s1', 29, 29, { face: 5 }); m.enc('s2', 17, 29, { face: 5 }); m.enc('s3', 30, 16, { face: 5 }); m.enc('s4', 18, 13, { face: 5 });
      m.enc('s5', 8, 21, { face: 5, cond: '!flag:c1_done', pre: 'e_ledger' }); m.enc('s6', 8, 7, { face: 5, post: 'e_threejaw' });
      m.enc('sb', 36, 9, { face: 5, cond: 'flag:b07_on' });
      m.scatter('DJpXD', 29, 29, 7, 9); m.scatter('DJXp', 17, 29, 7, 9); m.scatter('PpDU', 30, 16, 7, 9); m.scatter('PpDW', 18, 13, 7, 9); m.scatter('DJX', 8, 21, 7, 9); m.scatter('XDJ', 8, 7, 7, 8); m.scatter('DJ', 36, 9, 6, 7); m.scatter('DpJ', 37, 37, 4, 4);
      m.os('L', [[33, 34], [22, 21], [27, 21], [12, 12]]);
      m.ent({ k: 'spawn', id: 'start', x: 37.5, y: 38 });
      m.ent({ k: 'exit', id: 's_out', x: 40, y: 40, to: 'map' });
      m.ent({ k: 'fire', id: 's_fire', x: 23, y: 22 });
      m.ent({ k: 'chest', id: 's_c1', x: 33, y: 26, kind: 'chest' });
      m.ent({ k: 'chest', id: 's_c2', x: 13, y: 33, kind: 'chest' });
      m.ent({ k: 'chest', id: 's_c3', x: 24, y: 9, kind: 'lock' });
      m.ent({ k: 'chest', id: 's_gold', x: 38, y: 24, kind: 'gold', leg: 'patchrobe' });
      m.ent({ k: 'hook', id: 's_hook', x: 34, y: 27, tx: 37, ty: 25 }); m.ent({ k: 'hook', id: 's_hook_b', x: 40, y: 26, tx: 34, ty: 29 });
      m.ent({ k: 'npc', id: 'ledger_man', x: 10.5, y: 17.5, look: 'rigger', pose: 'down', stay: true, cond: '!flag:c1_done' });
      m.ent({ k: 'chest', id: 's_seat', x: 4, y: 5, kind: 'court', leg: 'chair', cond: 'flag:threejaw_dead', script: 'n_courtbox' });
      m.ent({ k: 'shard', id: 2, x: 20, y: 33 }); m.ent({ k: 'shard', id: 3, x: 34, y: 14 });
      m.ent({ k: 'npc', id: 'hammer_trapped', x: 13.5, y: 27, look: 'hammer', script: 't_hammer_rescue', cond: '!flag:r_hammer', need: 'enc:s2' });
      m.ent({ k: 'trigger', id: 'tr_warden', x: 22, y: 14, r: 2.2, script: 'tr_first_warden', once: true });
      m.light(33, 34, '#ffb86b', 4.5); m.light(22, 21, '#ffb86b', 4.5); m.light(27, 21, '#ffb86b', 4.5); m.light(12, 12, '#ffb86b', 4.5); m.light(23, 22, '#ff9050', 5, 1, .14); m.light(8, 7, '#9fd8ff', 5, 2, .03);
    },
  },
  // ───────── 鏽錨集 ─────────
  market: {
    n: '鏽錨集', sub: '壓艙層・唯一的聚落', zl: 3, w: 32, h: 30, seed: 41, amb: '#5e5a76', music: 'town', safe: true,
    build(m) {
      m.blob(16, 16, 10.5, 9.5, 'd', 0, .14);
      m.blob(16, 15, 5.2, 4.6, 's', 0, .1);         // 秤場
      m.path(16, 25, 16, 28, 3, 'w', 0);            // 南口
      m.path(8, 9, 5, 5, 3, 'r', 0, 1);             // 往繩幫的關
      m.blob(5, 5, 3.4, 3.4, 'r', 1);
      m.path(26, 14, 29, 12, 3, 'w', 0);            // 東門
      m.os('S', [[13, 12], [19, 12], [12, 18], [20, 18]]); m.os('T', [[9, 14], [10, 19], [22, 20], [23, 13], [21, 9], [12, 9]]);
      m.os('L', [[14, 14], [18, 14], [14, 18], [18, 18], [9, 11], [23, 17], [16, 23], [7, 7]]);
      m.os('X', [[11, 16], [21, 15], [15, 20], [8, 17]]); m.os('O', [[20, 11]]); m.os('N', [[4, 3], [7, 4]]); m.os('Y', [[3, 6]]);
      m.ent({ k: 'spawn', id: 'start', x: 16, y: 26 });
      m.ent({ k: 'exit', id: 'm_out', x: 16, y: 28, to: 'map' });
      m.ent({ k: 'npc', id: 'scale', x: 16, y: 13.4, look: 'scale', script: 't_scale' });
      m.ent({ k: 'npc', id: 'luo_gate', x: 26.4, y: 14.6, look: 'luo', script: 't_luo_gate', cond: '!has:luo&!flag:luo_gone' });
      m.ent({ k: 'npc', id: 'ear_m', x: 13.2, y: 19.4, look: 'ear', script: 't_ear_market', cond: '!flag:r_ear' });
      m.ent({ k: 'npc', id: 'toll', x: 6.2, y: 6.4, look: 'bruiser', script: 't_toll' });
      m.ent({ k: 'npc', id: 'vill1', x: 19.6, y: 17.2, look: 'vill_a', script: 't_vill1' });
      m.ent({ k: 'npc', id: 'vill2', x: 11.4, y: 13.2, look: 'vill_b', script: 't_vill2' });
      m.ent({ k: 'npc', id: 'vill3', x: 22.4, y: 12.2, look: 'vill_c', script: 't_vill3' });
      m.ent({ k: 'shard', id: 4, x: 24, y: 21 });
      m.ent({ k: 'trigger', id: 'tr_market', x: 16, y: 22, r: 2.5, script: 'tr_market_arrive', once: true });
      for (const p of [[14, 14], [18, 14], [14, 18], [18, 18], [9, 11], [23, 17], [16, 23]]) m.lights.push({ x: p[0], y: p[1], c: '#ffb86b', r: 4.2, z: 1.5, fl: .08, lamp: true });
      m.light(7, 7, '#ff5a4a', 4.5);
    },
  },
  // ───────── 沉油渠 ─────────
  sump: {
    n: '沉油渠', sub: '壓艙層・舊油渠與墜碑', zl: 4, w: 46, h: 44, seed: 53, amb: '#465c70', music: 'explore',
    build(m) {
      m.blob(39, 38, 4.2, 4.2, 'r', 0);             // 入口
      m.path(40, 39, 42, 41, 3, 'r', 0);
      m.path(36, 36, 33, 33, 3, 'r', 0);
      m.blob(31, 31, 6.2, 6.2, 'r', 0);             // o1
      m.path(26, 31, 23, 31, 3, 'c', 0);
      m.rect(22, 34, 27, 36, 'o', 0); m.rect(24, 26, 26, 28, 'o', 0);
      m.blob(19, 31, 6.4, 6.4, 'd', 0);             // o2（油面）
      m.blob(12, 36, 3, 3, 'd', 0);                 // 金繼箱
      m.path(15, 34, 13, 35, 3, 'm', 0);
      m.path(31, 26, 31, 22, 3, 'r', 0, 1);
      m.blob(31, 18, 6.4, 6.4, 's', 1);             // o3（水閘）
      m.blob(25, 22, 3, 3, 'r', 0);                 // 殘火
      m.path(26, 17, 23, 17, 3, 's', 1);
      m.blob(19, 17, 6.4, 6.4, 'm', 1);             // o4（苔與浮石）
      m.path(15, 13, 13, 11, 3, 's', 1, 2);
      m.blob(9, 8, 7, 7, 's', 2);                   // 墜碑（陸沉、陸安）
      m.blob(9, 8, 2.4, 2.4, 'g', 2, .05);
      m.blob(38, 10, 6.2, 6.2, 'd', 1);             // 懸賞：負城者
      m.path(35, 14, 36, 13, 3, 'd', 1);
      m.rect(4, 14, 8, 16, 'o', 2);
      m.enc('o1', 31, 31); m.enc('o2', 19, 31); m.enc('o3', 31, 18); m.enc('o4', 19, 17, { fill: 'm' }); m.enc('o5', 9, 8, { cond: 'flag:elder_fight', noAuto: true }); m.enc('ob', 38, 10, { cond: 'flag:bcity_on' });
      m.o('M', 6, 3);
      m.scatter('DJpO', 31, 31, 7, 9); m.scatter('DJO', 19, 31, 7, 8); m.scatter('PpWD', 31, 18, 7, 9); m.scatter('pDF', 19, 17, 7, 7); m.scatter('PpU', 9, 8, 7, 8); m.scatter('DJ', 38, 10, 6, 7);
      m.os('L', [[35, 35], [24, 21], [28, 23], [13, 12]]);
      m.ent({ k: 'spawn', id: 'start', x: 39.5, y: 39 });
      m.ent({ k: 'exit', id: 'o_out', x: 42, y: 41, to: 'map' });
      m.ent({ k: 'fire', id: 'o_fire', x: 25, y: 22 });
      m.ent({ k: 'chest', id: 'o_c1', x: 35, y: 27, kind: 'chest' });
      m.ent({ k: 'chest', id: 'o_c2', x: 24, y: 13, kind: 'lock' });
      m.ent({ k: 'chest', id: 'o_gold', x: 11, y: 37, kind: 'gold', leg: 'brazier' });
      m.ent({ k: 'shard', id: 5, x: 28, y: 35 }); m.ent({ k: 'shard', id: 6, x: 15, y: 20 }); m.ent({ k: 'shard', id: 7, x: 5, y: 11 });
      m.ent({ k: 'npc', id: 'zhu_trapped', x: 22, y: 19.4, look: 'zhu', script: 't_zhu_rescue', cond: '!flag:r_zhu', need: 'enc:o4' });
      m.ent({ k: 'npc', id: 'luchen', x: 5.4, y: 5.6, look: 'luchen', script: 't_luchen', cond: '!flag:keepers_left' });
      m.ent({ k: 'npc', id: 'elder_tether', x: 8, y: 4, look: 'elder', lift: 1.1, script: 'n_elder', cond: '!flag:elder_fight&!flag:elder_dead&!flag:keepers_left' });
      m.ent({ k: 'note', id: 'stele', x: 6, y: 3, script: 'n_stele', obj: true });
      m.ent({ k: 'note', id: 'sluice', x: 6, y: 13.4, script: 'n_sluice' });
      m.ent({ k: 'flame', x: 4, y: 7, cond: '!flag:flame_out' });
      m.ent({ k: 'trigger', id: 'tr_stele', x: 11, y: 10, r: 2.4, script: 'tr_memorial', once: true });
      m.light(35, 35, '#ffb86b', 4.5); m.light(24, 21, '#ff9050', 5, 1, .14); m.light(28, 23, '#ffb86b', 4.5); m.light(13, 12, '#ffb86b', 4.5); m.lights.push({ x: 4, y: 7, c: '#ffd070', r: 8, z: 1.5, fl: .1, flame: true }); m.light(19, 17, '#7ff0d0', 6, 1, .04);
    },
  },
  // ───────── 懸骸廊 ─────────
  gallery: {
    n: '懸骸廊', sub: '壓艙層・繩幫的地盤', zl: 6, w: 46, h: 44, seed: 67, amb: '#5a4e6e', music: 'explore',
    build(m) {
      m.blob(39, 38, 4.2, 4.2, 'r', 0);             // 入口與關口
      m.path(40, 39, 42, 41, 3, 'r', 0);
      m.path(36, 35, 34, 32, 3, 'c', 0);
      m.blob(31, 30, 6.4, 6.4, 'r', 0);             // h1
      m.path(26, 30, 23, 30, 3, 'c', 0, 1);
      m.blob(19, 30, 6.4, 6.4, 'w', 1);             // h2（崖邊）
      m.blob(25, 24, 2.8, 2.8, 'r', 1);             // 殘火
      m.path(19, 25, 19, 22, 3, 'w', 1, 2);
      m.blob(19, 17, 6.6, 6.6, 'r', 2);             // h3（把頭：圍欄）
      m.path(24, 16, 27, 15, 3, 'c', 2);
      m.blob(32, 14, 6.4, 6.4, 's', 2);             // h4（收來的庭衛）
      m.path(14, 14, 12, 12, 3, 'r', 2, 3);
      m.blob(8, 16, 3.4, 3.4, 'w', 3);              // 帳房
      m.path(10, 13, 9, 14, 3, 'w', 3);
      m.blob(9, 7, 6.8, 6.8, 's', 3);               // h5（卓九斤的廳）
      m.rect(37, 4, 41, 7, 's', 4);                 // 崖頂（羽）
      m.enc('h1', 31, 30, { cond: '!flag:guild_pass' }); m.enc('h2', 19, 30, { cond: '!flag:guild_pass' }); m.enc('h3', 19, 17); m.enc('h4', 32, 14); m.enc('h5', 9, 7, { cond: 'flag:zhuo_fight', noAuto: true });
      m.scatter('XJDO', 31, 30, 7, 9); m.scatter('XJD', 19, 30, 7, 8); m.scatter('XJWT', 19, 17, 7, 9); m.scatter('PpD', 32, 14, 7, 8); m.scatter('XSN', 9, 7, 7, 7); m.os('Y', [[35, 27], [15, 26], [23, 13], [5, 4], [13, 4]]); m.os('N', [[37, 35], [40, 36]]);
      m.os('L', [[36, 36], [25, 23], [22, 20], [28, 17], [11, 14], [6, 9], [12, 9]]);
      m.ent({ k: 'spawn', id: 'start', x: 39.5, y: 39 });
      m.ent({ k: 'exit', id: 'g_out', x: 42, y: 41, to: 'map' });
      m.ent({ k: 'fire', id: 'g_fire', x: 25, y: 24 });
      m.ent({ k: 'npc', id: 'gate', x: 36.4, y: 35.6, look: 'bruiser', script: 't_gate', cond: '!flag:gate_done' });
      m.ent({ k: 'chest', id: 'g_c1', x: 35, y: 26, kind: 'chest' });
      m.ent({ k: 'chest', id: 'g_c2', x: 15, y: 34, kind: 'lock' });
      m.ent({ k: 'chest', id: 'g_c3', x: 36, y: 10, kind: 'chest' });
      m.ent({ k: 'chest', id: 'g_feather', x: 39, y: 5, kind: 'gold', leg: 'feather' });
      m.ent({ k: 'hook', id: 'g_hook', x: 36, y: 9, tx: 38, ty: 6 }); m.ent({ k: 'hook', id: 'g_hook_b', x: 41, y: 7, tx: 35, ty: 11 });
      m.ent({ k: 'shard', id: 8, x: 27, y: 34 }); m.ent({ k: 'shard', id: 9, x: 23, y: 12 }); m.ent({ k: 'shard', id: 10, x: 6, y: 18 });
      m.ent({ k: 'npc', id: 'blind_pen', x: 16, y: 13.6, look: 'blind', script: 't_blind_rescue', cond: '!flag:r_blind', need: 'enc:h3' });
      m.ent({ k: 'note', id: 'ledger', x: 8, y: 16, script: 'n_tribute', cond: '!flag:c3_done' });
      m.ent({ k: 'npc', id: 'zhuo', x: 10.6, y: 5.4, look: 'zhuo', script: 't_zhuo', cond: '!flag:c4_done&!flag:zhuo_fight' });
      m.ent({ k: 'npc', id: 'zhuo_hung', x: 10.6, y: 5.4, look: 'zhuo', pose: 'aloft', lift: .9, script: 't_zhuo_hung', cond: 'flag:zhuo_hung&!flag:zhuo_gone' });
      m.light(36, 36, '#ff5a4a', 4.5); m.light(25, 23, '#ff9050', 5, 1, .14); m.light(22, 20, '#ff5a4a', 4.5); m.light(28, 17, '#ffb86b', 4.5); m.light(11, 14, '#ffb86b', 4.5); m.light(6, 9, '#ff5a4a', 4.5); m.light(12, 9, '#ff5a4a', 4.5);
    },
  },
  // ───────── 錨鏈根 ─────────
  root: {
    n: '錨鏈根', sub: '壓艙層・天錨鏈的斷口', zl: 8, w: 44, h: 44, seed: 79, amb: '#485078', music: 'deep',
    build(m) {
      m.blob(38, 38, 4.2, 4.2, 's', 0);
      m.path(39, 39, 41, 41, 3, 's', 0);
      m.path(35, 36, 33, 33, 3, 's', 0);
      m.blob(31, 31, 6.4, 6.4, 's', 0);             // r1
      m.path(26, 31, 24, 30, 3, 'c', 0, 1);
      m.blob(20, 29, 6.4, 6.4, 'r', 1);             // r2（崖邊）
      m.blob(27, 24, 2.8, 2.8, 's', 1);             // 殘火
      m.path(20, 24, 20, 22, 3, 's', 1, 2);
      m.blob(20, 18, 6.4, 6.4, 's', 2);             // r3（階）
      m.blob(33, 17, 3.2, 3.2, 'r', 2);             // 金繼箱（斷秤）
      m.path(25, 18, 30, 17, 3, 'c', 2);
      m.path(16, 14, 14, 12, 3, 's', 2, 3);
      m.blob(9, 9, 8.2, 8.2, 's', 3, .1);           // 層主平台
      m.blob(9, 9, 3.4, 3.4, 'g', 3, .05);
      m.enc('r1', 31, 31); m.enc('r2', 20, 29); m.enc('r3', 20, 18); m.enc('boss', 9, 9, { face: 1, pre: 'e_boss', cond: '!flag:boss_done', hang: [[2.6, -2.2], [2.5, .2], [2.2, 2.6]] });
      m.os('A', [[4, 6], [6, 4], [13, 3], [15, 6]]); m.o('Z', 5, 3);
      m.scatter('PpUD', 31, 31, 7, 9); m.scatter('DJp', 20, 29, 7, 8); m.scatter('PpWU', 20, 18, 7, 9); m.os('Y', [[34, 28], [16, 24], [24, 14], [3, 9], [11, 2]]);
      m.os('L', [[36, 36], [27, 23], [23, 21], [15, 13]]);
      m.ent({ k: 'spawn', id: 'start', x: 38.5, y: 39 });
      m.ent({ k: 'exit', id: 'r_out', x: 41, y: 41, to: 'map' });
      m.ent({ k: 'fire', id: 'r_fire', x: 27, y: 24 });
      m.ent({ k: 'chest', id: 'r_c1', x: 35, y: 27, kind: 'lock' });
      m.ent({ k: 'chest', id: 'r_gold', x: 33, y: 17, kind: 'gold', leg: 'brokenscale' });
      m.ent({ k: 'shard', id: 11, x: 16, y: 32 }); m.ent({ k: 'shard', id: 12, x: 24, y: 14 });
      m.ent({ k: 'trigger', id: 'tr_boss', x: 13, y: 12, r: 2.4, script: 'tr_boss_approach', once: true, cond: '!flag:boss_done' });
      m.ent({ k: 'note', id: 'cutlink', x: 5, y: 3, script: 'n_cutlink', obj: true, cond: 'flag:boss_done' });
      m.ent({ k: 'shaft', x: 8, y: 7 });
      m.light(36, 36, '#ffb86b', 4.5); m.light(27, 23, '#ff9050', 5, 1, .14); m.light(23, 21, '#ffb86b', 4.5); m.light(15, 13, '#bfe8ff', 4.5); m.light(9, 9, '#bfe8ff', 9, 3, .03);
    },
  },
};
for (const k in ZONES) ZONES[k].id = k;
const LAYER_ORDER = ['vault', 'camp', 'slope', 'market', 'sump', 'gallery', 'root'];
const _zoneCache = {};
function buildZone(id) {
  if (_zoneCache[id]) return _zoneCache[id];
  const Zd = ZONES[id], m = ZoneBuilder(Zd.w, Zd.h, Zd.seed);
  Zd.build(m);
  // 物件只能在地上
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.floor[y][x] === ' ') m.obj[y][x] = ' ';
  // 可以互動的東西腳下不能壓著雜物（殘窗尤其：要走得上去才撿得到）
  for (const e of m.ents) { if (e.x == null || e.k === 'enc' || e.k === 'shaft' || (e.k === 'note' && e.obj)) continue; const x = Math.round(e.x), y = Math.round(e.y); if (m.obj[y] && m.obj[y][x] && m.obj[y][x] !== ' ') m.obj[y][x] = ' '; }
  return (_zoneCache[id] = m);
}
