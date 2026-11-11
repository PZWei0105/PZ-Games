// ===== 世界：地形、風、火、冰、猛獁、投擲（純規則，不碰畫面） =====
const SEG = 16;
const GRASS0 = 440, GRASS_N = 69;            // 草原 440～1544
const LAKE0 = 1560, LAKE_N = 38;             // 冰湖 1560～2168
const LAKE1 = LAKE0 + LAKE_N * SEG;
const HUNTER_X = 210;
const GRAV = 900;
const TURN_TIME = 2.4;                        // 世界回合長度（秒）
const MAM = { walk: 40, trot: 150, run: 300, charge: 230, windup: 0.85, fear: 250, panic: 175, runDist: 480, acc: 560 };
const TOOL = {
  spear: { vmin: 380, vmax: 1320, wind: 42 },
  fire: { vmin: 320, vmax: 1160, wind: 66 },
};
const DMG = { vital: 34, body: 18, head: 10, leg: 12, trunk: 14, tusk: 0 };
const ZONE_TXT = { vital: '要害', body: '扎進肉裡', head: '頭骨太硬', leg: '扎在腿上', trunk: '扎在鼻子', tusk: '被象牙彈開' };
const AIM_TXT = { vital: '要害', body: '身體', head: '頭（骨硬）', leg: '腿', trunk: '鼻子', tusk: '象牙（會彈開）' };
// 猛獁的局部座標（面向右、y 朝上、原點在兩腳之間的地面）
const TUSK_PTS = [];
const TRUNK_PTS = [];
(function () {
  const bz = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };
  for (let i = 0; i <= 10; i++) TUSK_PTS.push(bz([138, 158], [178, 116], [238, 116], [240, 178], i / 10));
  for (let i = 0; i <= 8; i++) TRUNK_PTS.push(bz([164, 178], [180, 116], [158, 62], [184, 30], i / 8));
})();

function newMammoth(x, face) {
  return {
    x, y: 0, face, fv: face, vx: 0, hp: 100, alive: true, state: 'graze', st: 0, rage: 0, goal: x, pause: 0.6,
    dir: face, runLeft: 0, legPh: Math.random(), flinch: 0, rear: 0, head: 0, trunk: 0, trumpT: 0, breath: Math.random() * 9,
    spears: [], wounds: [], burnT: 0, burnTick: 0, sinkT: 0, deadT: 0, how: '', dL: 1e9, dR: 1e9, inFire: false, tilt: 0,
    iceRun: false,
  };
}

class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    const R = (this.R = mulberry32(this.seed));
    this.p = [R() * 10, R() * 10, R() * 10];
    this.GX0 = -600;
    const n = Math.ceil((3000 - this.GX0) / 4) + 2;
    this.gy = new Float32Array(n);
    for (let i = 0; i < n; i++) this.gy[i] = this.baseGround(this.GX0 + i * 4);
    this.grass = [];
    for (let i = 0; i < GRASS_N; i++) {
      const cx = GRASS0 + (i + 0.5) * SEG;
      this.grass.push({ i, cx, fuel: 0.76 + 0.24 * R(), st: 0, t: 0, heat: 0, I: 0 });
    }
    const shift = (R() - 0.5) * 70;
    const t0 = 1690 + shift, t1 = 2030 + shift;
    this.thin = [t0, t1];
    this.ice = [];
    for (let i = 0; i < LAKE_N; i++) {
      const cx = LAKE0 + (i + 0.5) * SEG;
      const k = smooth(ilerp(t0 - 50, t0, cx)) * smooth(ilerp(t1 + 50, t1, cx));
      const th = 1 - 0.58 * k;
      this.ice.push({ i, cx, th, th0: th, strain: 0, broken: false, fail: false, bt: 0, wet: 0 });
    }
    const w0 = [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)];
    this.wind = { now: w0, next: 0 };
    this.wind.next = this.evolveWind(w0);
    this.hunter = { x: HUNTER_X, y: this.groundAt(HUNTER_X), alive: true, throwT: 9, deadT: 0, tool: 'spear' };
    const mx = 700 + R() * 420;
    this.mam = newMammoth(mx, R() < 0.5 ? 1 : -1);
    this.mam.y = this.groundAt(mx);
    this.mam.goal = mx;
    this.tools = { spear: 3, fire: 2 };
    this.proj = null;
    this.stuck = [];
    this.brands = [];
    this.flames = [];
    this.ev = [];
    this.over = null;
    this.stats = { turns: 1, spears: 0, torches: 0, hits: 0, vitals: 0, spearDmg: 0, burnDmg: 0, bleed: 0, fled: 0, rage: 0, iceWeak: 0 };
    this.t = 0;
    this.updateFlames();
  }

  // ---------- 地形 ----------
  baseGround(x) {
    const [p1, p2, p3] = this.p;
    const steppe = 598 + 15 * Math.sin(x / 165 + p1) + 7 * Math.sin(x / 61 + p2) + 2.5 * Math.sin(x / 23 + p3);
    const ledge = 455 + 4 * Math.sin(x * 0.045 + p2) + 2 * Math.sin(x * 0.17);
    if (x < 30) return lerp(250, ledge, smooth(ilerp(-170, 30, x)));
    if (x < 290) return ledge;
    if (x < 440) return lerp(ledge, steppe, smooth(ilerp(290, 440, x)));
    if (x < 1530) return steppe;
    if (x < 1560) return lerp(steppe, 612, smooth(ilerp(1530, 1560, x)));
    if (x < LAKE1) return 612;
    const shore = 560 + 9 * Math.sin(x / 40 + p3) + 5 * Math.sin(x / 13);
    if (x < 2320) return lerp(612, shore, smooth(ilerp(LAKE1, 2320, x)));
    return lerp(shore, 330, smooth(ilerp(2420, 2640, x)));
  }
  groundAt(x) {
    const f = (x - this.GX0) / 4;
    const i = clamp(Math.floor(f), 0, this.gy.length - 2);
    const t = clamp(f - i, 0, 1);
    return this.gy[i] + (this.gy[i + 1] - this.gy[i]) * t;
  }
  grassIdx(x) { const i = Math.floor((x - GRASS0) / SEG); return i >= 0 && i < GRASS_N ? i : -1; }
  iceIdx(x) { const i = Math.floor((x - LAKE0) / SEG); return i >= 0 && i < LAKE_N ? i : -1; }
  kindAt(x) {
    if (x < 440) return 'rock';
    if (x < GRASS0 + GRASS_N * SEG) return 'grass';
    if (x < LAKE0) return 'bank';
    if (x < LAKE1) { const k = this.iceIdx(x); return this.ice[k].broken ? 'water' : 'ice'; }
    return 'rock';
  }

  // ---------- 風 ----------
  evolveWind(w) {
    const r = this.R();
    let n;
    if (r < 0.14) n = -(sgn(w) || 1) * (1 + Math.floor(this.R() * 2));
    else if (r < 0.40) n = w - 1;
    else if (r < 0.66) n = w + 1;
    else n = w;
    return clamp(n, -3, 3);
  }
  nextTurn() {
    this.stats.turns++;
    const old = this.wind.now;
    this.wind.now = this.wind.next;
    this.wind.next = this.evolveWind(this.wind.now);
    this.emit({ e: 'wind', from: old, to: this.wind.now });
    const m = this.mam;
    if (m.alive && m.state !== 'sink' && !this.over) {
      const tools = this.tools.spear + this.tools.fire;
      const fire = this.grass.some((s) => s.st === 1) || this.brands.length > 0;
      if (!tools && !fire) {
        // 身上還扎著矛、血也快流乾：牠走不遠了
        if (m.spears.length && m.hp <= 26) this.killMammoth('bleed');
        else { this.over = { win: false, why: 'escape' }; this.emit({ e: 'escape' }); }
      }
    }
  }

  emit(e) { this.ev.push(e); }

  // ---------- 投擲 ----------
  handPos() { return { x: this.hunter.x + 12, y: this.hunter.y - 134 }; }
  makeProj(tool, ang, power) {
    const T = TOOL[tool], v = lerp(T.vmin, T.vmax, power), o = this.handPos();
    return { kind: tool, x: o.x, y: o.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, ang, spin: 11, t: 0, trail: [] };
  }
  throwProj(tool, ang, power) {
    if (this.tools[tool] <= 0) return false;
    this.proj = this.makeProj(tool, ang, power);
    this.tools[tool]--;
    if (tool === 'spear') this.stats.spears++; else this.stats.torches++;
    this.hunter.throwT = 0;
    this.emit({ e: 'throw', tool, power });
    return true;
  }
  projStep(p, dt) {
    const T = TOOL[p.kind];
    p.vy += GRAV * dt;
    p.vx += this.wind.now * T.wind * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
    if (p.kind === 'spear') p.ang = Math.atan2(p.vy, p.vx); else p.ang += p.spin * dt;
    const tx = p.kind === 'spear' ? p.x + Math.cos(p.ang) * 56 : p.x;
    const ty = p.kind === 'spear' ? p.y + Math.sin(p.ang) * 56 : p.y;
    const m = this.mam;
    if (m.alive && m.state !== 'sink') {
      const z = this.hitZone(tx, ty);
      if (z) return { type: 'mam', zone: z, x: tx, y: ty };
    }
    const g = this.groundAt(tx);
    if (ty >= g) return { type: 'ground', kind: this.kindAt(tx), x: tx, y: g };
    if (tx < -400 || tx > 2800 || ty > 1300) return { type: 'out', x: tx, y: ty };
    return null;
  }
  predict(tool, ang, power) {
    const p = this.makeProj(tool, ang, power);
    const pts = [];
    let res = null;
    for (let i = 0; i < 2400 && !res; i++) {
      res = this.projStep(p, 1 / 240);
      if (i % 5 === 0) pts.push(p.x, p.y);
    }
    if (res) pts.push(res.x, res.y);
    return { pts, res };
  }
  toLocal(x, y) { const m = this.mam; return { lx: (x - m.x) * m.face, ly: m.y - y }; }
  hitZone(x, y) {
    const m = this.mam;
    const lx = (x - m.x) * m.face, ly = m.y - y;
    if (lx < -175 || lx > 262 || ly < -6 || ly > 292) return null;
    for (const [tx, ty] of TUSK_PTS) if (hyp(lx - tx, ly - ty) < 11) return 'tusk';
    if (hyp(lx - 124, ly - 214) < 48) return 'head';
    if (hyp(lx - 52, ly - 140) < 30) return 'vital';
    const ex = (lx + 22) / 150, ey = (ly - 160) / 90;
    if (ex * ex + ey * ey < 1) return 'body';
    for (const [tx, ty] of TRUNK_PTS) if (hyp(lx - tx, ly - ty) < 15) return 'trunk';
    if (ly < 92 && ((lx > 54 && lx < 104) || (lx > -134 && lx < -86))) return 'leg';
    return null;
  }
  // 每格呼叫；回傳 true 表示落地了
  flightStep(dt) {
    const p = this.proj;
    if (!p) return true;
    const sub = Math.max(1, Math.ceil(dt * 240));
    for (let i = 0; i < sub; i++) {
      const r = this.projStep(p, dt / sub);
      if (r) { this.impact(p, r); return true; }
    }
    p.trail.push(p.x, p.y);
    if (p.trail.length > 40) p.trail.splice(0, 2);
    return false;
  }
  impact(p, r) {
    this.proj = null;
    const m = this.mam;
    if (p.kind === 'spear') {
      if (r.type === 'mam') {
        const z = r.zone, dmg = DMG[z];
        const L = this.toLocal(r.x, r.y);
        if (z === 'tusk') {
          this.emit({ e: 'bounce', x: r.x, y: r.y });
          const gy = this.groundAt(r.x - 30 * m.face);
          this.stuck.push({ x: r.x - 30 * m.face, y: gy, ang: Math.PI * (m.face > 0 ? 0.97 : 0.03), flat: true, kind: 'spear' });
        } else {
          m.hp -= dmg;
          this.stats.hits++; this.stats.spearDmg += dmg;
          if (z === 'vital') this.stats.vitals++;
          const la = Math.atan2(-Math.sin(p.ang), Math.cos(p.ang) * m.face);
          m.spears.push({ lx: L.lx, ly: L.ly, la, z });
          m.wounds.push({ lx: L.lx, ly: L.ly, t: 0 });
          m.flinch = 1;
          this.emit({ e: 'hit', zone: z, dmg, x: r.x, y: r.y });
          if (m.hp <= 0) { this.killMammoth('spear'); return; }
        }
        m.rage = 1; this.stats.rage++;
        if (m.state !== 'flee' && m.state !== 'trapped') {
          m.state = 'charge'; m.st = 0; m.trumpT = 1.2;
          this.emit({ e: 'trumpet', k: 'rage', x: m.x });
          this.emit({ e: 'rage' });
        }
      } else if (r.type === 'ground') {
        const k = r.kind;
        if (k === 'water') this.emit({ e: 'splash', x: r.x, y: r.y, small: true });
        else {
          if (k === 'ice') { this.weakenIce(r.x, 18, 0.05); this.stuck.push({ x: r.x, y: r.y, ang: p.ang, kind: 'spear', ice: true }); }
          else if (k === 'rock') this.stuck.push({ x: r.x, y: r.y, ang: p.vx > 0 ? -0.06 : Math.PI + 0.06, flat: true, kind: 'spear' });
          else this.stuck.push({ x: r.x, y: r.y, ang: p.ang, kind: 'spear' });
          this.emit({ e: 'land', kind: k, tool: 'spear', x: r.x, y: r.y });
        }
        if (m.alive && (m.state === 'graze' || m.state === 'alert' || m.state === 'trot') && Math.abs(r.x - m.x) < 240) {
          m.state = 'trot'; m.st = 0; m.dir = sgn(m.x - r.x) || m.face; m.runLeft = 230; m.trumpT = 0.5;
          this.emit({ e: 'startle', x: m.x });
        }
      } else this.emit({ e: 'lost' });
    } else {
      let x = r.x, k = r.kind;
      if (r.type === 'mam') {
        m.hp -= 6; this.stats.burnDmg += 6; m.flinch = 1;
        this.emit({ e: 'torchHit', x: r.x, y: r.y });
        k = this.kindAt(x);
        if (m.hp <= 0) { this.killMammoth('fire'); return; }
        this.startFlee(sgn(m.x - r.x) || -m.face);
      }
      if (r.type === 'out') { this.emit({ e: 'lost' }); return; }
      const y = this.groundAt(x);
      if (k === 'grass') { this.ignite(x, 22); this.brands.push({ x, y, t: 0, life: 1.4 }); this.emit({ e: 'ignite', x, y }); }
      else if (k === 'ice') { this.weakenIce(x, 46, 0.3); this.stats.iceWeak++; this.emit({ e: 'hiss', x, y, ice: true }); }
      else if (k === 'water') this.emit({ e: 'hiss', x, y });
      else { this.brands.push({ x, y, t: 0, life: 3.2 }); this.emit({ e: 'land', kind: k, tool: 'fire', x, y }); }
      this.updateFlames();
    }
  }

  // ---------- 火 ----------
  ignite(x, r) {
    for (const s of this.grass) if (s.st === 0 && Math.abs(s.cx - x) <= r) { s.st = 1; s.t = 0; s.I = 0.2; }
  }
  updateFire(dt) {
    const w = this.wind.now, aw = Math.abs(w);
    const vDown = 70 + 50 * aw, vUp = aw === 0 ? 40 : aw === 1 ? 12 : 0;
    const vR = w > 0 ? vDown : w < 0 ? vUp : 40;
    const vL = w < 0 ? vDown : w > 0 ? vUp : 40;
    const G = this.grass;
    for (const s of G) {
      if (s.st === 1) {
        s.t += dt;
        const dur = 1.5 + 0.9 * s.fuel;
        s.I = Math.min(1, 0.2 + s.t / 0.3) * (s.t > dur - 0.5 ? Math.max(0, (dur - s.t) / 0.5) : 1);
        const k = 0.45 + 0.55 * s.I;
        const r = G[s.i + 1], l = G[s.i - 1];
        if (r && r.st === 0) r.heat += (dt * vR * k) / SEG;
        if (l && l.st === 0) l.heat += (dt * vL * k) / SEG;
        if (s.t >= dur) { s.st = 2; s.t = 0; s.I = 0; }
      } else if (s.st === 2) {
        s.t += dt;
        if (s.t > 3.5) s.st = 3;
      }
    }
    for (const s of G) if (s.st === 0 && s.heat >= 1) { s.st = 1; s.t = 0; s.I = 0.2; s.heat = 0; }
  }
  updateBrands(dt) {
    for (const b of this.brands) b.t += dt;
    this.brands = this.brands.filter((b) => b.t < b.life);
  }
  updateFlames() {
    const f = (this.flames = []);
    for (const s of this.grass) if (s.st === 1 && s.I > 0.15) f.push(s.cx);
    for (const b of this.brands) f.push(b.x);
  }
  fireLevel() {
    let t = 0;
    for (const s of this.grass) if (s.st === 1) t += s.I;
    return t + this.brands.length * 0.4;
  }

  // ---------- 冰 ----------
  weakenIce(x, r, amt) {
    for (const s of this.ice) {
      const d = Math.abs(s.cx - x);
      if (d <= r && !s.broken) { s.th = Math.max(0.12, s.th - amt * (1 - (d / r) * 0.6)); s.wet = 1; }
    }
  }
  breakIce(k, span = 2) {
    let any = false;
    for (let j = k - span; j <= k + span; j++) {
      const s = this.ice[j];
      if (s && !s.broken) { s.broken = true; s.bt = 0; any = true; }
    }
    if (any) this.emit({ e: 'break', x: this.ice[k].cx, y: 612 });
  }
  // 冰的承重：薄冰撐不住猛獁的體重，一踩上去就開始碎，零點四秒後裂開
  loadIce(dt) {
    const m = this.mam;
    const speed = Math.abs(m.vx);
    const load = speed > 200 ? 0.75 : speed > 100 ? 0.65 : 0.55;
    let fall = false;
    for (const lx of [74, 90, -110, -96]) {
      const fx = m.x + lx * m.face;
      const k = this.iceIdx(fx);
      if (k < 0) continue;
      const s = this.ice[k];
      if (s.broken) { fall = true; continue; }
      if (load > s.th) {
        if (!s.fail) { s.fail = true; this.emit({ e: 'crack', x: s.cx, y: 612, lvl: 2 }); }
      } else {
        // 厚冰：只會留下細紋
        const before = s.strain;
        s.strain = Math.min(0.55, s.strain + load * dt * 0.22);
        if (Math.floor(before * 6) !== Math.floor(s.strain * 6)) this.emit({ e: 'crack', x: s.cx, y: 612, lvl: 0 });
      }
    }
    if (fall) this.plunge();
  }
  updateIce(dt) {
    for (const s of this.ice) {
      if (s.broken) { s.bt += dt; continue; }
      if (s.fail) {
        const before = s.strain;
        s.strain = Math.max(s.strain, 0.15) + dt * 2.3;
        if (Math.floor(before * 3) !== Math.floor(s.strain * 3)) this.emit({ e: 'crack', x: s.cx, y: 612, lvl: 1 });
        if (s.strain >= 1) this.breakIce(s.i, 1);
      }
    }
  }
  plunge() {
    const m = this.mam;
    if (m.state === 'sink') return;
    m.state = 'sink'; m.st = 0; m.sinkT = 0; m.vx *= 0.35; m.trumpT = 2;
    // 整個身體滑進冰洞裡（不會半邊陷在岸上）
    m.sinkX = clamp(m.x, LAKE0 + 165, LAKE1 - 165); m.y = 612;
    for (let x = m.sinkX - 150; x <= m.sinkX + 150; x += SEG) { const k = this.iceIdx(x); if (k >= 0) this.breakIce(k, 0); }
    this.emit({ e: 'plunge', x: m.x, y: 612 });
  }

  // ---------- 猛獁 ----------
  setState(s) { const m = this.mam; m.state = s; m.st = 0; }
  perceive() {
    const m = this.mam;
    let dL = 1e9, dR = 1e9, inF = false;
    for (const fx of this.flames) {
      const d = fx - m.x;
      if (Math.abs(d) < 105) inF = true;
      if (d < 0) dL = Math.min(dL, -d - 105); else dR = Math.min(dR, d - 105);
    }
    m.dL = Math.max(0, dL); m.dR = Math.max(0, dR); m.inFire = inF;
  }
  startFlee(dir) {
    const m = this.mam;
    const was = m.state;
    m.state = 'flee'; m.st = 0; m.dir = dir; m.runLeft = MAM.runDist; m.iceRun = false;
    if (was !== 'flee') { this.stats.fled++; m.trumpT = 1.3; this.emit({ e: 'trumpet', k: 'fear', x: m.x }); this.emit({ e: 'flee', dir }); }
  }
  fear(nL, nR) {
    if (nL && nR) { this.trapped(); return true; }
    if (nL) { this.startFlee(1); return true; }
    if (nR) { this.startFlee(-1); return true; }
    return false;
  }
  trapped() {
    const m = this.mam;
    if (m.state !== 'trapped') { m.trumpT = 1.4; this.emit({ e: 'trumpet', k: 'fear', x: m.x }); this.emit({ e: 'trapped' }); }
    m.state = 'trapped'; m.st = 0;
  }
  charge() {
    const m = this.mam;
    m.state = 'charge'; m.st = 0; m.trumpT = 1.1;
    this.emit({ e: 'trumpet', k: 'rage', x: m.x });
  }
  balk() {
    const m = this.mam;
    m.state = 'balk'; m.st = 0; m.rear = 1; m.trumpT = 1.2;
    this.emit({ e: 'trumpet', k: 'balk', x: m.x });
    this.emit({ e: 'balk' });
  }
  killMammoth(how) {
    const m = this.mam;
    if (!m.alive) return;
    m.alive = false; m.how = how; m.deadT = 0; m.vx = 0;
    if (how !== 'ice') m.state = 'dead';
    this.emit({ e: 'die', how, x: m.x, y: m.y });
    if (!this.over) this.over = { win: true, how };
  }
  trample() {
    const h = this.hunter;
    if (!h.alive) return;
    h.alive = false; h.deadT = 0;
    const m = this.mam;
    m.rage = 0; m.state = 'alert'; m.st = 0; m.trumpT = 1.4;
    this.emit({ e: 'trample', x: h.x, y: h.y });
    if (!this.over) this.over = { win: false, why: 'trample' };
  }
  updateMammoth(dt) {
    const m = this.mam;
    if (!m.alive) {
      if (m.how === 'ice') m.sinkT += dt;
      m.vx *= Math.max(0, 1 - 4 * dt);
      return;
    }
    if (m.state === 'sink') {
      m.sinkT += dt;
      m.vx *= Math.max(0, 1 - 3 * dt);
      m.sinkX += m.vx * dt;
      m.sinkX = clamp(m.sinkX, LAKE0 + 165, LAKE1 - 165);
      m.x += (m.sinkX - m.x) * Math.min(1, dt * 7);
      m.hp -= 22 * dt;
      if (m.sinkT > 3.4) this.killMammoth('ice');
      return;
    }
    this.perceive();
    if (m.inFire) {
      const d = 13 * dt;
      m.hp -= d; this.stats.burnDmg += d; m.burnT += dt; m.burnTick -= dt;
      if (m.burnTick <= 0) { m.burnTick = 0.4; this.emit({ e: 'burn', x: m.x, y: m.y - 130 }); }
      if (m.hp <= 0) { this.killMammoth('fire'); return; }
    }
    // 矛還扎在身上：一跑就流血
    if (m.spears.length) {
      const sp = Math.abs(m.vx);
      const rate = sp > 200 ? 3.0 : sp > 100 ? 1.6 : 0.5;
      let k = 0;
      for (const q of m.spears) k += q.z === 'vital' ? 2 : 1;
      const d = rate * k * dt;
      m.hp -= d; this.stats.bleed += d;
      if (m.hp <= 0) { this.killMammoth('spear'); return; }
    }
    if (m.rage > 0 && m.state !== 'charge' && m.state !== 'balk') m.rage = Math.max(0, m.rage - 0.11 * dt);
    const nL = m.dL < MAM.fear, nR = m.dR < MAM.fear;
    m.st += dt;
    let target = 0;
    switch (m.state) {
      case 'graze': {
        if (this.fear(nL, nR)) break;
        if (m.rage > 0.2) { this.charge(); break; }
        if (m.pause > 0) { m.pause -= dt; break; }
        const d = m.goal - m.x;
        if (Math.abs(d) < 10) {
          m.pause = 1.4 + this.R() * 2.4;
          m.goal = clamp(m.x + (this.R() - 0.5) * 560, 560, 1480);
        } else target = sgn(d) * MAM.walk;
        break;
      }
      case 'alert': {
        if (this.fear(nL, nR)) break;
        if (m.rage > 0.2) { this.charge(); break; }
        if (m.st > 1.6) { this.setState('graze'); m.pause = 0.8; }
        break;
      }
      case 'trot': {
        if (this.fear(nL, nR)) break;
        target = m.dir * MAM.trot;
        const nx = m.x + m.vx * dt;
        if ((nx < 480 && m.dir < 0) || (nx > 1528 && m.dir > 0)) { this.setState('alert'); target = 0; break; }
        m.runLeft -= Math.abs(m.vx * dt);
        if (m.runLeft <= 0) this.setState('alert');
        break;
      }
      case 'flee': {
        const ahead = m.dir > 0 ? m.dR : m.dL, behind = m.dir > 0 ? m.dL : m.dR;
        if (ahead < MAM.panic * 0.7) {
          if (behind < MAM.fear) { this.trapped(); break; }
          m.dir = -m.dir; m.runLeft = MAM.runDist * 0.6; m.trumpT = 1;
          this.emit({ e: 'trumpet', k: 'fear', x: m.x });
        }
        target = m.dir * MAM.run;
        m.runLeft -= Math.abs(m.vx * dt);
        if (m.runLeft <= 0) {
          if (behind < MAM.fear * 1.1) m.runLeft = 260;
          else this.setState(m.rage > 0.2 ? 'charge' : 'alert');
        }
        break;
      }
      case 'trapped': {
        if (!(nL && nR)) { if (!this.fear(nL, nR)) this.setState(m.rage > 0.2 ? 'charge' : 'alert'); break; }
        const dir = m.dL > m.dR ? -1 : 1, room = Math.max(m.dL, m.dR);
        target = room > 50 ? dir * MAM.trot * 0.7 : 0;
        if (m.inFire && m.st > 1.1) {
          // 被火困太久：朝火比較薄的那邊硬衝出去
          m.state = 'flee'; m.st = 0; m.dir = dir; m.runLeft = MAM.runDist * 0.8; m.trumpT = 1.2;
          this.emit({ e: 'trumpet', k: 'fear', x: m.x });
        }
        break;
      }
      case 'shore': {
        // 被逼到湖邊：火不夠近，牠不肯上冰；火一逼近就不顧一切衝上去
        const behind = m.dL;
        if (behind < MAM.panic || m.inFire) { this.startFlee(1); m.iceRun = true; m.trumpT = 1.3; this.emit({ e: 'trumpet', k: 'fear', x: m.x }); break; }
        if (!nL && !nR && m.st > 0.8) this.setState(m.rage > 0.2 ? 'charge' : 'alert');
        else if (nR && !nL) this.startFlee(-1);
        break;
      }
      case 'cornered': {
        // 被逼到石壁下：火燒到身上撐一下就硬衝回去
        if (m.inFire && m.st > 1.0) { this.startFlee(1); m.runLeft = MAM.runDist * 0.8; break; }
        if (!nL && !nR && m.st > 0.6) this.setState(m.rage > 0.2 ? 'charge' : 'alert');
        break;
      }
      case 'charge': {
        const dir = sgn(this.hunter.x - m.x) || -1;
        m.dir = dir;
        const ahead = dir > 0 ? m.dR : m.dL;
        if (ahead < MAM.panic) { this.balk(); break; }
        // 先刨地、甩頭，再衝
        if (m.st < MAM.windup) { m.face = dir; break; }
        target = dir * MAM.charge;
        break;
      }
      case 'balk': {
        if (m.st > 0.75) {
          const ahead = m.dir > 0 ? m.dR : m.dL, behind = m.dir > 0 ? m.dL : m.dR;
          if (ahead < MAM.fear && behind < MAM.fear) this.trapped();
          else if (ahead < MAM.fear) this.startFlee(-m.dir);
          else if (m.rage > 0.2) this.charge();
          else this.setState('alert');
        }
        break;
      }
    }
    const fast = m.state === 'flee' || m.state === 'charge';
    const acc = (fast ? MAM.acc : MAM.acc * 0.6) * (m.state === 'balk' ? 2.4 : 1);
    m.vx += clamp(target - m.vx, -acc * dt, acc * dt);
    let nx = m.x + m.vx * dt;
    if (nx > 2330) { nx = 2330; m.vx = 0; if (m.state === 'flee') this.setState('alert'); }
    // 逃命時跑到湖邊：火在身後夠近才會衝上冰
    if (m.state === 'flee' && m.dir > 0 && nx > 1526 && m.x <= 1526 && !m.iceRun && m.dL > MAM.panic) {
      nx = 1526; m.vx = 0; m.state = 'shore'; m.st = 0; m.trumpT = 1.1;
      this.emit({ e: 'trumpet', k: 'fear', x: m.x }); this.emit({ e: 'shore' });
    }
    // 只有發狂衝鋒才會爬上石坡；逃命的猛獁跑到坡底就被逼住
    const minX = m.state === 'charge' ? 300 : 470;
    if (nx < minX) {
      nx = minX; m.vx = 0;
      if (m.state === 'flee' || m.state === 'trot' || m.state === 'trapped') {
        m.state = 'cornered'; m.st = 0; m.trumpT = 1.2;
        this.emit({ e: 'trumpet', k: 'fear', x: m.x });
      }
    }
    m.x = nx;
    m.y = this.groundAt(m.x);
    if (Math.abs(m.vx) > 8) m.face = sgn(m.vx);
    const stride = Math.abs(m.vx) > 200 ? 215 : 165;
    const prev = m.legPh;
    m.legPh += (Math.abs(m.vx) * dt) / stride;
    if (Math.floor(prev * 2) !== Math.floor(m.legPh * 2) && Math.abs(m.vx) > 110) this.emit({ e: 'step', x: m.x, y: m.y, heavy: Math.abs(m.vx) / 300 });
    if (this.hunter.alive && m.state === 'charge' && m.x - 168 <= this.hunter.x + 26) this.trample();
    this.loadIce(dt);
  }

  // ---------- 收穫：怎麼獵到的，決定部落拿回多少 ----------
  harvest() {
    const m = this.mam, s = this.stats;
    if (!this.over || !this.over.win) return { meat: 0, hide: 0, ivory: 0, score: 0 };
    let r;
    if (m.how === 'ice') r = { meat: 1, hide: 0, ivory: 0 };
    else {
      const burn = s.burnDmg;
      r = {
        meat: clamp(6 - Math.floor(burn / 30), 2, 6),
        hide: clamp(4 - Math.floor(burn / 14) - (s.hits >= 3 ? 1 : 0), 0, 4),
        ivory: 2,
      };
    }
    r.score = r.meat + r.hide * 1.5 + r.ivory;
    return r;
  }

  // ---------- 一步 ----------
  step(dt) {
    this.t += dt;
    this.updateFire(dt);
    this.updateBrands(dt);
    this.updateFlames();
    this.updateMammoth(dt);
    this.updateIce(dt);
  }
  // 只影響畫面的動畫（回合暫停時也會跑）
  anim(dt) {
    const m = this.mam, h = this.hunter;
    m.fv += (m.face - m.fv) * Math.min(1, dt * 12);
    m.flinch = Math.max(0, m.flinch - dt * 2.2);
    m.rear = Math.max(0, m.rear - dt * 1.2);
    m.trumpT = Math.max(0, m.trumpT - dt);
    m.breath += dt;
    for (const w of m.wounds) w.t += dt;
    if (!m.alive) m.deadT += dt;
    const moving = Math.abs(m.vx) > 12;
    let hd = 0, tr = 0;
    switch (m.state) {
      case 'graze': hd = moving ? -0.08 : -0.3; tr = moving ? 0.1 : 1; break;
      case 'alert': hd = 0.14; tr = -0.35; break;
      case 'trot': hd = 0.06; tr = -0.25; break;
      case 'flee': hd = 0.04; tr = -0.55; break;
      case 'charge': hd = -0.16; tr = -0.15; break;
      case 'balk': hd = 0.3; tr = -1; break;
      case 'trapped': case 'cornered': case 'shore': hd = 0.22; tr = -0.9; break;
      case 'sink': hd = 0.32; tr = -1; break;
      default: hd = 0; tr = 0;
    }
    if (!m.alive && m.how !== 'ice') { hd = -0.34; tr = 0.55; }
    if (m.trumpT > 0.2 && m.alive) { tr = -1; hd = Math.max(hd, 0.18); }
    m.head += (hd - m.head) * Math.min(1, dt * 5);
    m.trunk += (tr - m.trunk) * Math.min(1, dt * 4);
    const a = this.groundAt(m.x + 70), b = this.groundAt(m.x - 70);
    m.tilt += (Math.atan2(a - b, 140) * 0.8 - m.tilt) * Math.min(1, dt * 6);
    h.throwT += dt;
    if (!h.alive) h.deadT += dt;
  }
}
