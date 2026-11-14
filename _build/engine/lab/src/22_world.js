/* 樣品館：世界與地圖（程序生成的地牢／洞窟／島嶼、2.5D 牆、怪物潮用流場繞牆追人、點地圖自動尋路、戰爭迷霧、小地圖） */
const WD = { size: 32 };
WD.art = () => {
  if (PZ.art.has('wd.tree')) return;
  const A = PZ.art;
  A.make('wd.tree', 60, 82, (c, w, h) => {
    const tr = c.createLinearGradient(w / 2 - 5, 0, w / 2 + 5, 0); tr.addColorStop(0, '#6b4a2c'); tr.addColorStop(1, '#3a2716');
    c.fillStyle = tr; c.beginPath(); c.moveTo(w / 2 - 5, h - 2); c.lineTo(w / 2 - 3, h - 30); c.lineTo(w / 2 + 3, h - 30); c.lineTo(w / 2 + 6, h - 2); c.closePath(); c.fill();
    const blob = (x, y, r, c1, c2) => { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.45, 1, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    blob(w / 2 - 11, h - 38, 15, '#5fae4a', '#2a6630'); blob(w / 2 + 12, h - 40, 14, '#5fae4a', '#2a6630'); blob(w / 2 - 2, h - 52, 19, '#7fcf5c', '#337a36'); blob(w / 2 + 6, h - 62, 12, '#93dc6c', '#3f8a3c');
    c.fillStyle = 'rgba(255,255,220,.2)'; c.beginPath(); c.arc(w / 2 - 7, h - 62, 6, 0, Math.PI * 2); c.fill();
  }, { anchor: [0.5, 0.95], outline: 1.2, outlineColor: '#173518' });
  A.make('wd.rock', 44, 32, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c4bcae'); g.addColorStop(1, '#6a635a'); c.fillStyle = g;
    c.beginPath(); c.moveTo(3, h - 2); c.lineTo(8, 10); c.lineTo(20, 2); c.lineTo(33, 6); c.lineTo(41, h - 3); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(22, h - 2); c.lineTo(26, 12); c.lineTo(33, 6); c.lineTo(41, h - 3); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(8, 10); c.lineTo(20, 2); c.lineTo(33, 6); c.stroke();
  }, { anchor: [0.5, 0.92], outline: 1, outlineColor: '#2c2a26' });
  A.make('wd.crystal', 28, 42, (c, w, h) => {
    const sh = (x, y, s, hue) => { const g = c.createLinearGradient(x - s, y, x + s, y); g.addColorStop(0, `hsl(${hue},90%,82%)`); g.addColorStop(0.5, `hsl(${hue},85%,62%)`); g.addColorStop(1, `hsl(${hue},80%,40%)`); c.fillStyle = g; c.beginPath(); c.moveTo(x, y - s * 2.7); c.lineTo(x + s, y - s); c.lineTo(x + s * 0.6, y); c.lineTo(x - s * 0.6, y); c.lineTo(x - s, y - s); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(x, y - s * 2.7); c.lineTo(x - s, y - s); c.lineTo(x - s * 0.2, y - s * 1.1); c.closePath(); c.fill(); };
    sh(9, h - 2, 5, 200); sh(19, h - 1, 6.5, 190); sh(14, h - 3, 4.2, 280);
  }, { anchor: [0.5, 0.95] });
  A.make('wd.chest', 32, 26, (c, w, h) => {
    c.fillStyle = '#5a3a1e'; c.fillRect(2, 9, w - 4, h - 11);
    const lid = c.createLinearGradient(0, 2, 0, 12); lid.addColorStop(0, '#9a6a3a'); lid.addColorStop(1, '#6e4a26'); c.fillStyle = lid; c.beginPath(); c.roundRect(2, 2, w - 4, 11, [5, 5, 1, 1]); c.fill();
    c.fillStyle = '#d9a94a'; c.fillRect(2, 11, w - 4, 2.5); c.fillRect(7, 2, 2.5, h - 4); c.fillRect(w - 9.5, 2, 2.5, h - 4); c.fillRect(w / 2 - 3, 10, 6, 8);
    c.fillStyle = '#3a2410'; c.fillRect(w / 2 - 1, 13, 2, 3); c.fillStyle = 'rgba(255,240,200,.35)'; c.fillRect(4, 3.5, w - 8, 1.2);
  }, { anchor: [0.5, 0.9], outline: 1, outlineColor: '#1e1208' });
};
const WD_KINDS = [['地牢', 'dungeon'], ['洞窟', 'cave'], ['島嶼', 'island']];
const WD_LOOK = { dungeon: { grade: 'cinema', amount: 0.55, song: 'dread' }, cave: { grade: 'cold', amount: 0.35, song: 'dread' }, island: { grade: 'warm', amount: 0.45, song: 'drive' } };

PZ.scene('world', {
  bg: '#05060a',
  ui: () => `${Lab.bar('世界與地圖', '點地圖：自動找路走過去')}<div class="lab-stat"></div>
    <div class="lab-panel" data-ui>
      <div class="lab-row">${WD_KINDS.map(([n, k], i) => `<button class="lab-chip cyan${i ? '' : ' on'}" data-kind="${k}">${n}</button>`).join('')}<button class="lab-chip" data-act="regen">↻ 新地圖</button></div>
      <div class="lab-row"><button class="lab-chip" data-chip="horde">怪物潮</button><button class="lab-chip" data-chip="fog">戰爭迷霧</button><button class="lab-chip" data-chip="light">光影</button><button class="lab-chip" data-chip="flow">流場</button></div>
    </div>`,
  enter() {
    WD.art(); LT.art(); AN.art();
    const box = PZ.scenes.uiEl; Lab.bindBack(box); this.stat = box.querySelector('.lab-stat');
    this.st = { horde: true, fog: true, light: true, flow: false };
    Lab.chips(box, this.st, (k) => { if (k === 'light') this.setupLight(); if (k === 'fog') this.updateFov(true); });
    box.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('on', x === b)); this.kind = b.dataset.kind; this.build(); PZ.uiSound('confirm'); }));
    box.querySelector('[data-act=regen]').addEventListener('click', () => { this.seed++; this.build(); PZ.uiSound('confirm'); });
    this.kind = 'dungeon'; this.seed = 7;
    this.H = { x: 0, y: 0, w: 16, h: 10, vx: 0, vy: 0, walk: 0, face: 1, path: null, pi: 0 };
    this.stick = PZ.input.stick({ target: 'move', zone: { l: 0, t: 0.35, r: 0.55, b: 0.8 } });
    this.offTap = PZ.on('tap', (t) => { if (t.y > PZ.screen.h - 140 && !Lab.side()) return; this.goTo(t.wx, t.wy); });
    this.lay = () => { PZ.cam.fit(PZ.screen.portrait ? 500 : 540); PZ.cam.offX = Lab.shift(); }; this.lay(); this.offR = PZ.on('resize', this.lay);
    this.base = { grade: PZ.post.gradeName }; this.song = null;
    this.build();
  },
  exit() { this.offTap(); this.offR(); PZ.input.clearTouch(); PZ.post.grade(this.base.grade, { time: 0 }); },
  build() {
    const k = this.kind, S = WD.size; let map, spawn;
    if (k === 'dungeon') {
      const D = PZ.gen.dungeon(64, 52, { rooms: 15, seed: this.seed });
      map = PZ.tilemap({ w: D.w, h: D.h, size: S }); map.fromGrid(D.grid);
      // 出生在夠大的房間（第一眼就有東西看）
      const score = (r) => r.w * r.h - Math.hypot(r.cx - D.w / 2, r.cy - D.h / 2) * 4;   // 大、又靠近中間（四周都有路可以探索）
      const big = D.rooms.reduce((a, r) => (score(r) > score(a) ? r : a), D.rooms[0]); spawn = [big.cx, big.cy]; this.rooms = D.rooms; this.startRoom = big;
      this.style = PZ.tiles.dungeon({ floor: '#3b3f4a', brick: '#6a5248' });
    } else if (k === 'cave') {
      const D = PZ.gen.caves(76, 58, { seed: this.seed, fill: 0.5 });
      map = PZ.tilemap({ w: D.w, h: D.h, size: S }); map.fromGrid(D.grid);
      // 出生點：最空曠的洞室（離岩壁最遠），同樣空曠就選靠中間的
      const dist = PZ.gen.distance(D.grid, D.w, D.h, 0); let best = 0, bs = -1e9;
      for (let i = 0; i < dist.length; i++) { if (D.grid[i]) continue; const x = i % D.w, y = (i / D.w) | 0, sc = Math.min(dist[i], 6) - Math.hypot(x - D.w / 2, y - D.h / 2) * 0.08; if (sc > bs) { bs = sc; best = i; } }
      this.caveDist = dist;
      spawn = [best % D.w, (best / D.w) | 0];
      this.style = PZ.tiles.cave(map);
    } else {
      const W = 72, Hh = 56, hgt = PZ.gen.island(W, Hh, { seed: this.seed });
      map = PZ.tilemap({ w: W, h: Hh, size: S }); for (let i = 0; i < hgt.length; i++) map.layers.main[i] = hgt[i] < 0.42 ? 1 : 0;
      this.style = PZ.tiles.island(map, hgt);
      let best = 0; for (let i = 0; i < hgt.length; i++) if (hgt[i] > hgt[best] && hgt[i] < 0.66) best = i; spawn = [best % W, (best / W) | 0];
      // 樹、石頭：散布在陸地上，佔一格（會擋路）
      this.props = PZ.gen.scatter(0, 0, W * S, Hh * S, 76, { seed: this.seed, test: (x, y) => { const h = hgt[map.idx(map.cellX(x), map.cellY(y))]; return h > 0.48 && h < 0.86; } }).map((p) => {
        const cx = map.cellX(p.x), cy = map.cellY(p.y), h = hgt[map.idx(cx, cy)], rock = h > 0.77;
        if (Math.abs(cx - spawn[0]) + Math.abs(cy - spawn[1]) < 4) return null;
        map.set(cx, cy, 2); return { x: map.cx(cx), y: map.cy(cy) + S * 0.3, f: rock ? 'wd.rock' : 'wd.tree', s: rock ? PZ.rand.range(0.85, 1.1) : PZ.rand.range(0.9, 1.2), sway: PZ.rand.angle() };
      }).filter(Boolean);
    }
    if (k !== 'island') this.props = [];
    this.map = map; const H = this.H; H.x = map.cx(spawn[0]); H.y = map.cy(spawn[1]); H.path = null; H.vx = H.vy = 0;
    PZ.cam.bounds = { x: -S * 2, y: -S * 3, w: map.width + S * 4, h: map.height + S * 5 }; PZ.cam.follow(H, { lerp: 7, lead: 0.12 }); PZ.cam.snap();
    this.flow = PZ.path.flow(map, { max: 60 }); this.flow.update(H.x, H.y, true);
    // 戰爭迷霧與小地圖：每格一個像素的小畫布放大畫（線性內插 → 邊緣柔和）
    const W = map.w, Hh = map.h;
    this.seen = new Uint8Array(W * Hh); this.vis = new Uint8Array(W * Hh);
    this.fogCv = this.fogCv || document.createElement('canvas'); this.fogCv.width = W; this.fogCv.height = Hh; this.fogImg = this.fogCv.getContext('2d').createImageData(W, Hh);
    this.fogF = PZ.art.live('wd.fog', this.fogCv);
    this.miniCv = this.miniCv || document.createElement('canvas'); this.miniCv.width = W; this.miniCv.height = Hh; this.miniImg = this.miniCv.getContext('2d').createImageData(W, Hh);
    this.miniF = PZ.art.live('wd.mini', this.miniCv, { pixel: true });
    this.fovCell = -1; this.updateFov(true);
    // 怪物：在離主角遠的地方生
    this.mobs = []; const R = PZ.rng(this.seed + 3), free = [];
    map.forEach((x, y, v) => { if (!map.solidFn(v) && Math.abs(x - spawn[0]) + Math.abs(y - spawn[1]) > 16) free.push([x, y]); });
    // 地牢、洞窟是空殼；島上是史萊姆（一跳一跳）
    for (let i = 0; i < 110 && free.length; i++) { const [x, y] = R.pick(free); this.mobs.push({ x: map.cx(x) + R.spread(8), y: map.cy(y) + R.spread(8), w: 14, h: 9, vx: 0, vy: 0, f: k === 'island' ? 'cr.slime' : R.chance(0.15) ? 'husk2' : 'husk', ph: R.angle(), sp: R.range(55, 85), r: 9, va: 0, hue: R.pick([0, 0, 0, 1]) }); }
    this.grid = new PZ.Grid(48);
    // 寶箱（地牢放在房間角落；洞窟散在地上）
    this.chests = k === 'island' ? [] : k === 'dungeon'
      ? this.rooms.filter((r, i) => i % 3 === 1 || r === this.startRoom).map((r) => ({ x: map.cx(r.x + 1), y: map.cy(r.y + 1) + 6, chest: true }))
      : PZ.gen.scatter(0, 0, map.width, map.height, 420, { seed: this.seed, test: (x, y) => !map.solidAt(x, y) && !map.solidAt(x, y + 24) && !map.solidAt(x, y - 24) }).slice(0, 8).map((p) => ({ x: p.x, y: p.y, chest: true }));
    const look = WD_LOOK[k]; PZ.post.grade(look.grade, { time: 0.6, amount: look.amount });
    if (this.song !== look.song) { this.song = look.song; PZ.music.play(look.song, { intensity: 0.45, fade: 1.5 }); }
    this.setupLight();
  },
  setupLight() {
    const map = this.map, k = this.kind, L = PZ.light, S = WD.size, R = PZ.rng(this.seed + 11);
    L.reset(); this.torches = []; this.crystals = [];
    // 擺設（火把、水晶）不管光影開不開都在
    if (k === 'dungeon') {
      // 火把：掛在朝南、底下是地板、左右都是牆的牆面上，彼此隔開
      const spots = []; map.forEach((x, y, v) => { if (map.solidFn(v) && !map.isSolid(x, y + 1) && map.isSolid(x - 1, y) && map.isSolid(x + 1, y)) spots.push([x, y]); });
      R.shuffle(spots); const used = [];
      for (const [x, y] of spots) { if (used.length >= 28) break; if (used.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 7)) continue; used.push([x, y]); }
      this.torches = used.map(([x, y]) => ({ x: map.cx(x), y: map.oy + (y + 1) * S - 1, fy: map.oy + (y + 1) * S - S * 0.62 }));
    } else if (k === 'cave') {
      // 水晶：長在岩壁腳下（北邊是岩石、南邊是空地的格子），彼此至少隔 5 格
      const spots = []; map.forEach((x, y, v) => { if (!map.solidFn(v) && map.isSolid(x, y - 1) && !map.isSolid(x, y + 1)) spots.push([x, y]); });
      R.shuffle(spots); const used = [];
      for (const [x, y] of spots) { if (used.length >= 40) break; if (used.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 9)) continue; used.push([x, y]); }
      this.crystals = used.map(([x, y]) => ({ x: map.cx(x) + R.spread(6), y: map.oy + (y + 0.35) * S, c: R.pick(['#46d4ff', '#a86bff', '#5dffb0', '#46d4ff']), crystal: true }));
    }
    if (!this.st.light || k === 'island') return;
    L.on({ ambient: k === 'dungeon' ? '#1c2234' : '#45415f', soak: k === 'dungeon' ? 30 : 22 });   // soak 大一點：光滲進牆頂，房間的輪廓才看得出來
    if (k === 'dungeon') map.lightBoxes({ lift: this.style.lift(map) }); else L.occluders(this.style.occlude);
    this.heroL = L.add({ follow: this.H, oy: -18, r: k === 'cave' ? 360 : 300, color: '#ffe2b0', intensity: 1.05, size: 6, flicker: 0.05 });
    for (const t of this.torches) t.L = L.add({ x: t.x, y: t.y + 10, r: 270, color: '#ff9a3c', intensity: 1.3, flicker: 0.22, flickerSpeed: 10, size: 9 });
    for (const c of this.crystals) c.L = L.add({ x: c.x, y: c.y - 10, r: 250, color: c.c, intensity: 1.0, flicker: 0.12, flickerSpeed: 2, size: 8, haze: 0.03 });
  },
  goTo(wx, wy) {
    const m = this.map, H = this.H, tgt = m.nearestOpen(m.cellX(wx), m.cellY(wy), 4);
    const cells = tgt && PZ.path.find(m, m.cellX(H.x), m.cellY(H.y), tgt[0], tgt[1]);
    if (!cells) { PZ.uiSound('error'); this.mark = { x: wx, y: wy, t: 0, bad: true }; return; }
    H.path = PZ.path.smooth(m, cells); H.pi = 1; PZ.uiSound('click');
    this.mark = { x: m.cx(tgt[0]), y: m.cy(tgt[1]), t: 0 };
  },
  updateFov(force) {
    const m = this.map, H = this.H, c = m.idx(m.cellX(H.x), m.cellY(H.y));
    if (c === this.fovCell && !force) return; this.fovCell = c;
    const W = m.w, Hh = m.h, vis = this.vis, seen = this.seen, L = m.layers.main, fogOn = this.st.fog, island = this.kind === 'island';
    vis.fill(0); m.fov(m.cellX(H.x), m.cellY(H.y), island ? 15 : 12, vis, island ? () => false : undefined);   // 島上：海和樹不擋視線
    const d = this.fogImg.data, md = this.miniImg.data;
    for (let i = 0; i < W * Hh; i++) {
      if (vis[i]) seen[i] = 1;
      // 牆頂往上畫（2.5D），所以看得到的牆，它北邊那格也要亮（不然牆頂會被迷霧吃掉）
      const up = !vis[i] && i + W < W * Hh && vis[i + W] && m.solidFn(L[i + W]);
      d[i * 4 + 3] = !fogOn ? 0 : vis[i] || (up && m.solidFn(L[i])) ? 0 : up ? 60 : seen[i] ? 115 : 255;
      const v = L[i], sn = seen[i] || !fogOn, j = i * 4;
      const col = !sn ? 0x0a0c12 : island ? (v === 1 ? 0x2a6f95 : v === 2 ? 0x3e7a3a : 0x9ac476) : m.solidFn(v) ? 0x3c4050 : 0xa89e88;
      md[j] = col >> 16; md[j + 1] = (col >> 8) & 255; md[j + 2] = col & 255; md[j + 3] = sn ? 255 : 170;
    }
    this.fogCv.getContext('2d').putImageData(this.fogImg, 0, 0); this.fogF.refresh();
    this.miniCv.getContext('2d').putImageData(this.miniImg, 0, 0); this.miniF.refresh();
  },
  update(dt) {
    const H = this.H, m = this.map, M = PZ.input.move;
    let mx = M.mag > 0.12 ? M.x : 0, my = M.mag > 0.12 ? M.y : 0;
    if (mx || my) H.path = null;
    else if (H.path) {
      const p = H.path[H.pi];
      if (!p) H.path = null;
      else { const dx = p.x - H.x, dy = p.y - H.y, d = Math.hypot(dx, dy); if (d < 8) { H.pi++; if (H.pi >= H.path.length) H.path = null; } else { const k = H.pi === H.path.length - 1 ? Math.min(1, d / 40) : 1; mx = (dx / d) * k; my = (dy / d) * k; } }
    }
    const sp = 175; H.vx = PZ.damp(H.vx, mx * sp, 14, dt); H.vy = PZ.damp(H.vy, my * sp, 14, dt);
    m.move(H, H.vx * dt, H.vy * dt); H.walk += Math.hypot(H.vx, H.vy) * dt;
    if (Math.abs(H.vx) > 12) H.face = Math.sign(H.vx);
    this.updateFov();
    this.flow.update(H.x, H.y);
    if (this.mark) this.mark.t += dt;
    // 怪物潮：跟著流場走（繞牆）、彼此推開、撞牆會滑；看不到的時候慢慢淡出
    const G = this.grid; G.clear(); for (const e of this.mobs) G.insert(e, e.r);
    const near = this._near || (this._near = []), fogOn = this.st.fog;
    for (const e of this.mobs) {
      e.ph += dt * 6;
      const i = m.idx(m.cellX(e.x), m.cellY(e.y)); e.va = PZ.damp(e.va, !fogOn || (i >= 0 && this.vis[i]) ? 1 : 0, 8, dt);
      let ax = 0, ay = 0;
      if (this.st.horde) {
        const dist = this.flow.distAt(e.x, e.y);
        if (dist < 26) { const d = this.flow.dirAt(e.x, e.y); ax = d.x * e.sp; ay = d.y * e.sp; }
        G.query(e.x, e.y, 22, near);
        for (const o of near) { if (o === e) continue; const dx = e.x - o.x, dy = e.y - o.y, l = Math.hypot(dx, dy) || 1; if (l < 20) { ax += (dx / l) * (20 - l) * 9; ay += (dy / l) * (20 - l) * 9; } }
        const hd = Math.hypot(H.x - e.x, H.y - e.y); if (hd < 26 && hd > 0.01) { ax -= ((H.x - e.x) / hd) * 300; ay -= ((H.y - e.y) / hd) * 300; }
      }
      e.vx = PZ.damp(e.vx, ax, 5, dt); e.vy = PZ.damp(e.vy, ay, 5, dt);
      m.move(e, e.vx * dt, e.vy * dt);
    }
    this.statT = (this.statT || 0) - dt;
    if (this.statT <= 0) { this.statT = 0.25; const lit = this.st.light && this.kind !== 'island' ? `　燈 ${PZ.gfx.r.stats.lights}` : ''; this.stat.textContent = `${m.w}×${m.h} 格　怪物 ${this.mobs.length}${lit}\n畫質 ${PZ.quality.cur.name}`; }
  },
  render(g) {
    const m = this.map, H = this.H, S = WD.size, t = PZ.time.t, wallH = (this.style.height || 0) * S;
    const actors = this._actors || (this._actors = []); actors.length = 0;
    actors.push(H);
    for (const e of this.mobs) if (e.va > 0.02 && g.visible(e.x, e.y, 60)) actors.push(e);
    for (const p of this.props) if (g.visible(p.x, p.y, 100)) actors.push(p);
    for (const c of this.chests) if (g.visible(c.x, c.y, 40)) actors.push(c);
    for (const c of this.crystals) if (g.visible(c.x, c.y, 60)) actors.push(c);
    for (const tc of this.torches) if (g.visible(tc.x, tc.y, 60)) actors.push(tc);
    m.draw(g, this.style, { actors, drawActor: (gg, a) => {
      if (a === H) { const sw = Math.sin(H.walk * 0.075); gg.ellipse(H.x, H.y, 13, 5, 'rgba(0,0,0,.42)'); gg.spr('hero', H.x, H.y - Math.abs(sw) * 2.4, sw * 0.05, 0.95 * H.face, 0.95); return; }
      if (a.f === 'cr.slime') { const sp = Math.hypot(a.vx, a.vy), hop = sp > 15 ? Math.abs(Math.sin(a.ph * 0.7)) : 0, sq = 1 + (hop < 0.25 && sp > 15 ? (0.25 - hop) * 0.6 : 0) + Math.sin(a.ph * 0.5) * 0.03; gg.ellipse(a.x, a.y, 12 * (1 - hop * 0.3), 4, 'rgba(0,0,0,.3)', { a: a.va }); gg.spr(a.f, a.x, a.y - hop * 9, 0, (a.vx < 0 ? -0.75 : 0.75) * sq, 0.75 / sq, a.va, a.hue ? '#b8d8ff' : null); return; }
      if (a.f === 'husk' || a.f === 'husk2') { const sp = Math.hypot(a.vx, a.vy), bob = Math.abs(Math.sin(a.ph)) * (sp > 20 ? 2 : 0.5); gg.ellipse(a.x, a.y, 11, 4, 'rgba(0,0,0,.35)', { a: a.va }); gg.spr(a.f, a.x, a.y - bob, Math.sin(a.ph) * 0.06, a.vx < 0 ? -0.8 : 0.8, 0.8, a.va); return; }
      if (a.f) { gg.ellipse(a.x, a.y - 1, 17 * a.s, 6 * a.s, 'rgba(0,0,0,.28)'); gg.spr(a.f, a.x, a.y, a.f === 'wd.tree' ? Math.sin(t * 1.2 + a.sway) * 0.025 : 0, a.s, a.s); return; }
      if (a.crystal) { gg.ellipse(a.x, a.y - 1, 12, 4, 'rgba(0,0,0,.3)'); gg.spr('wd.crystal', a.x, a.y); return; }
      if (a.fy) { gg.spr('lt.torch', a.x, a.fy + 4, 0, 0.75, 0.75); return; }
      gg.ellipse(a.x, a.y - 1, 16, 5, 'rgba(0,0,0,.35)'); gg.spr('wd.chest', a.x, a.y);
    } });
    // 要走的路線：流動的光點＋終點的圈
    if (H.path) for (let i = H.pi; i < H.path.length; i++) { const a = i === H.pi ? H : H.path[i - 1], b = H.path[i], d = Math.hypot(b.x - a.x, b.y - a.y); for (let s = (t * 60) % 14; s < d; s += 14) g.circle(a.x + ((b.x - a.x) * s) / d, a.y + ((b.y - a.y) * s) / d, 2.1, '#7fe8ff', { a: 0.75 }); }
    if (this.mark && this.mark.t < (this.mark.bad ? 0.5 : 9) && (H.path || this.mark.bad)) { const k = Math.min(1, this.mark.t * 6), c = this.mark.bad ? '#ff5a5a' : '#7fe8ff'; g.ring(this.mark.x, this.mark.y, (1.6 - k * 0.6) * (10 + Math.sin(t * 6) * 1.5), 2, c, { a: 0.9 * (this.mark.bad ? 1 - this.mark.t * 2 : 1) }); }
    if (this.st.flow) {
      const [x0, y0, x1, y1] = m.view(0), F = this.flow;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const i = m.idx(cx, cy); if (i < 0 || F.dist[i] === Infinity) continue; const x = m.cx(cx), y = m.cy(cy), vx = F.vx[i], vy = F.vy[i], k = Math.max(0.15, 1 - F.dist[i] / 30); g.line(x - vx * 7, y - vy * 7, x + vx * 5, y + vy * 5, 1.8, '#ffb547', { a: 0.75 * k }); g.circle(x + vx * 7, y + vy * 7, 2.4, '#ffd27a', { a: k }); }
    }
    g.lighting();
    // 會發光的東西（不受明暗影響）：火焰、水晶、怪物的眼睛——被前面的牆擋住就不畫
    for (const tc of this.torches) { if (!g.visible(tc.x, tc.y, 40)) continue; const k = tc.L ? tc.L._fi * tc.L._k : 1, fy = tc.fy + 1; g.glow(tc.x, fy, 14 * k, '#ffb050', { a: 0.9, core: 0.8 }); g.glow(tc.x, fy - 1, 6 * k, '#fff2c8', { core: 1 }); }
    for (const c of this.crystals) if (g.visible(c.x, c.y, 40) && !m.behindWall(c.x, c.y, 14, wallH)) g.glow(c.x, c.y - 14, 18, c.c, { a: 0.4 + 0.18 * Math.sin(t * 2 + c.x), core: 0.5 });
    if (this.style.emissive) this.style.emissive(g, m);
    for (const e of this.mobs) {
      if (e.f === 'cr.slime' || e.va < 0.05 || !g.visible(e.x, e.y, 40) || m.behindWall(e.x, e.y, 26, wallH)) continue;
      const dir = e.vx < 0 ? -0.8 : 0.8; for (const ex of [-5, 5]) g.glow(e.x + ex * dir, e.y - 26, 3.4, e.f === 'husk2' ? '#ffd04f' : '#ff4fd8', { a: 0.85 * e.va, core: 1 });
    }
    // 戰爭迷霧：一格一像素的小圖放大蓋上去（邊緣自動柔和）
    if (this.st.fog) g.spr(this.fogF, m.ox, m.oy, 0, m.width / this.fogF.w, m.height / this.fogF.h);
    g.hud();
    // 小地圖：右上角（手機橫拿時右邊是面板 → 改放左上角標題下面）
    const side = Lab.side(), mw = Math.min(side ? 112 : 150, PZ.screen.w * 0.3), k = mw / m.w, mh = m.h * k;
    const mx = side ? 16 + PZ.screen.safe.l : PZ.screen.w - mw - 14 - PZ.screen.safe.r, my = (side ? 62 : 58) + PZ.screen.safe.t;
    g.rect(mx - 5, my - 5, mw + 10, mh + 10, 'rgba(6,8,14,.78)'); g.rect(mx - 5, my - 5, mw + 10, 1.2, 'rgba(255,255,255,.22)');
    g.spr(this.miniF, mx, my, 0, k, k, 0.95);
    for (const e of this.mobs) if (e.va > 0.5) g.rect(mx + (e.x / S) * k - 1.2, my + (e.y / S) * k - 1.2, 2.4, 2.4, '#ff4fd8');
    if (this.mark && H.path) g.circle(mx + (this.mark.x / S) * k, my + (this.mark.y / S) * k, 2.2, '#7fe8ff', { a: 0.8 });
    g.circle(mx + (H.x / S) * k, my + (H.y / S) * k, 3.2, '#ffffff'); g.circle(mx + (H.x / S) * k, my + (H.y / S) * k, 2.2, '#46d4ff');
  },
});
