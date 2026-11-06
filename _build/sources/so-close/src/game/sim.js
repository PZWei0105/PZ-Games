// 機台物理＋爪子邏輯（不含畫面）。遊戲與 Node 調校工具共用。
// 座標：公尺。x 向右、y 向上、z 朝玩家（機台正面玻璃在 +z）。
import { D2R, qAxis, qMul, qRot, add, clamp, lerp } from './qmath.js';

export const CLAW = {
  prongs: 3, rho0: 0.03, L1: 0.078, L2: 0.054, bend: 40 * D2R, rp: 0.0065,
  open: 42 * D2R, closed: -14 * D2R, rest: 4 * D2R,
  headR: 0.042, headH: 0.07,
  descend: 0.26, ascend: 0.2, move: 0.23, accel: 0.9,
  closeSpd: 115 * D2R, openSpd: 170 * D2R, relaxSpd: 55 * D2R, sink: 0.004,
};

export const LAYOUTS = {
  // 扭蛋堆：左前角出口
  pile: { W: 0.84, D: 0.72, topY: 0.80, minY: 0.075, chute: { x0: -0.42, x1: -0.165, z0: 0.105, z1: 0.36 }, guardH: 0.07, home: { x: -0.29, z: 0.232 }, binY: -0.42 },
  // 推落台：後方高台，前緣掉落
  shelf: { W: 0.84, D: 0.72, topY: 0.84, minY: 0.27, shelfY: 0.24, edgeZ: 0.035, home: { x: -0.28, z: 0.22 }, binY: -0.30 },
};

const G = 9.81;

export class Sim {
  constructor(R, kind, opts = {}) {
    this.R = R;
    this.kind = kind;
    this.L = LAYOUTS[kind];
    this.C = { ...CLAW, ...(opts.claw || {}) };
    this.events = [];
    this.world = new R.World({ x: 0, y: -G, z: 0 });
    this.world.timestep = 1 / 120;
    const ip = this.world.integrationParameters;
    ip.numSolverIterations = 8;
    ip.allowedLinearError = 0.0005;
    ip.predictionDistance = 0.002;
    this.eq = new R.EventQueue(true);
    this.prizes = [];
    this.byCol = new Map();
    this.byId = new Map();
    this.acc = 0;
    this.time = 0;
    this.buildStatic();
    this.buildClaw();
    this.power = { g: 1, l: 0.7, c: 0.35 };
    this.resetClaw();
  }

  emit(type, data = {}) { this.events.push({ type, t: this.time, ...data }); }

  // ---------------- 靜態機台 ----------------
  buildStatic() {
    const R = this.R, L = this.L, W = L.W, D = L.D;
    const body = this.world.createRigidBody(R.RigidBodyDesc.fixed());
    const box = (cx, cy, cz, hx, hy, hz, fr = 0.6, tag = 'wall') => {
      const c = this.world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setFriction(fr).setRestitution(0.15), body);
      c.__tag = tag;
      return c;
    };
    const H = 0.7, t = 0.02;
    box(-W / 2 - t / 2, H / 2 - 0.2, 0, t / 2, H / 2 + 0.25, D / 2 + t, 0.3);
    box(W / 2 + t / 2, H / 2 - 0.2, 0, t / 2, H / 2 + 0.25, D / 2 + t, 0.3);
    box(0, H / 2 - 0.2, -D / 2 - t / 2, W / 2 + t, H / 2 + 0.25, t / 2, 0.3);
    box(0, H / 2 - 0.2, D / 2 + t / 2, W / 2 + t, H / 2 + 0.25, t / 2, 0.2, 'glass');
    if (this.kind === 'pile') {
      const c = L.chute, ft = 0.04;
      // 地板（挖掉出口）
      box((c.x1 + W / 2) / 2, -ft / 2, 0, (W / 2 - c.x1) / 2, ft / 2, D / 2, 0.75, 'floor');
      box((-W / 2 + c.x1) / 2, -ft / 2, (-D / 2 + c.z0) / 2, (c.x1 + W / 2) / 2, ft / 2, (c.z0 + D / 2) / 2, 0.75, 'floor');
      // 出口擋板（壓克力），一路延伸到出口底部
      const gt = 0.003, top = L.guardH, bot = L.binY;
      box(c.x1 + gt, (top + bot) / 2, (c.z0 + c.z1) / 2, gt, (top - bot) / 2, (c.z1 - c.z0) / 2 + gt, 0.3, 'guard');
      box((c.x0 + c.x1) / 2, (top + bot) / 2, c.z0 - gt, (c.x1 - c.x0) / 2 + gt * 2, (top - bot) / 2, gt, 0.3, 'guard');
      box((c.x0 + c.x1) / 2, L.binY - 0.02, (c.z0 + c.z1) / 2, (c.x1 - c.x0) / 2, 0.02, (c.z1 - c.z0) / 2, 0.8, 'bin');
    } else {
      const sy = L.shelfY, ez = L.edgeZ;
      box(0, sy - 0.15, (-D / 2 + ez) / 2, W / 2, 0.15, (ez + D / 2) / 2, 0.62, 'shelf');
      box(0, L.binY - 0.02, (ez + D / 2) / 2, W / 2, 0.02, (D / 2 - ez) / 2, 0.8, 'bin');
    }
  }

  groundY(x, z) {
    const L = this.L;
    if (this.kind === 'pile') {
      const c = L.chute;
      if (x < c.x1 && z > c.z0) return L.binY;
      return 0;
    }
    return z < L.edgeZ ? L.shelfY : L.binY;
  }

  inDrop(x, y, z) {
    const L = this.L;
    if (this.kind === 'pile') { const c = L.chute; return x < c.x1 && z > c.z0 && y < -0.05; }
    return z > L.edgeZ && y < L.shelfY - 0.12;
  }

  // ---------------- 爪子 ----------------
  buildClaw() {
    const R = this.R, C = this.C;
    const kin = () => this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    this.head = kin();
    const hc = this.world.createCollider(R.ColliderDesc.cylinder(C.headH / 2, C.headR).setTranslation(0, C.headH / 2 + 0.004, 0).setFriction(0.5), this.head);
    hc.__tag = 'claw';
    this.headCol = hc;
    this.prongs = [];
    for (let i = 0; i < C.prongs; i++) {
      const phi = (i / C.prongs) * Math.PI * 2 + (C.prongs === 3 ? Math.PI / 2 : 0);
      const b = kin();
      const c1 = this.world.createCollider(R.ColliderDesc.capsule(C.L1 / 2, C.rp).setTranslation(0, -C.L1 / 2, 0).setFriction(0.9).setRestitution(0), b);
      const tq = qAxis(0, 0, 1, -C.bend);
      const tc = { x: -Math.sin(C.bend) * C.L2 / 2, y: -C.L1 - Math.cos(C.bend) * C.L2 / 2, z: 0 };
      const c2 = this.world.createCollider(R.ColliderDesc.capsule(C.L2 / 2, C.rp * 1.15).setTranslation(tc.x, tc.y, tc.z).setRotation(tq).setFriction(1.1).setRestitution(0), b);
      c1.__tag = c2.__tag = 'claw';
      this.prongs.push({ i, phi, body: b, cols: [c1, c2], a: C.rest, target: C.rest, stop: false, hold: C.rest, touch: new Set() });
    }
  }

  resetClaw() {
    const L = this.L, C = this.C;
    this.car = { x: L.home.x, z: L.home.z, vx: 0, vz: 0 };
    this.hy = L.topY;
    this.sw = { ax: 0, az: 0, vx: 0, vz: 0 };
    for (const p of this.prongs) { p.a = p.target = C.rest; p.stop = false; }
    this.state = 'idle';
    this.st = 0;
    this.input = { x: 0, z: 0 };
    this.gripped = [];
    this.applyClaw(true);
  }

  headQuat() {
    // 鐘擺傾斜：爪子下端往 (ax, az) 方向偏
    return qMul(qAxis(0, 0, 1, this.sw.ax), qAxis(1, 0, 0, -this.sw.az));
  }
  headPos() {
    const cable = Math.max(0.12, this.L.topY + 0.1 - this.hy);
    return { x: this.car.x + Math.sin(this.sw.ax) * cable, y: this.hy + (1 - Math.cos(this.sw.ax)) * 0 , z: this.car.z + Math.sin(this.sw.az) * cable };
  }
  prongTransform(p, hp, hq) {
    const C = this.C;
    const pivot = { x: Math.cos(p.phi) * C.rho0, y: 0, z: Math.sin(p.phi) * C.rho0 };
    const pos = add(hp, qRot(hq, pivot));
    const q = qMul(hq, qMul(qAxis(0, 1, 0, -p.phi), qAxis(0, 0, 1, p.a)));
    return { pos, q };
  }
  tipWorld(p, hp, hq) {
    const C = this.C, a = p.a;
    const r1 = C.rho0 + Math.sin(a) * C.L1, y1 = -Math.cos(a) * C.L1;
    const r2 = r1 + Math.sin(a - C.bend) * C.L2, y2 = y1 - Math.cos(a - C.bend) * C.L2;
    const local = { x: Math.cos(p.phi) * r2, y: y2, z: Math.sin(p.phi) * r2 };
    return add(hp, qRot(hq, local));
  }
  applyClaw(teleport = false) {
    const hp = this.headPos(), hq = this.headQuat();
    this._hp = hp; this._hq = hq;
    if (teleport) { this.head.setTranslation(hp, true); this.head.setRotation(hq, true); }
    else { this.head.setNextKinematicTranslation(hp); this.head.setNextKinematicRotation(hq); }
    for (const p of this.prongs) {
      const t = this.prongTransform(p, hp, hq);
      p._pos = t.pos; p._q = t.q;
      if (teleport) { p.body.setTranslation(t.pos, true); p.body.setRotation(t.q, true); }
      else { p.body.setNextKinematicTranslation(t.pos); p.body.setNextKinematicRotation(t.q); }
    }
  }

  // ---------------- 獎品 ----------------
  addPrize(info, pos, rot) {
    const R = this.R;
    const desc = R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinearDamping(0.12).setAngularDamping(info.kind === 'box' ? 0.4 : 0.9).setCcdEnabled(true);
    if (rot) desc.setRotation(rot);
    const body = this.world.createRigidBody(desc);
    let cd;
    if (info.kind === 'box') cd = R.ColliderDesc.roundCuboid(info.sx / 2 - 0.004, info.sy / 2 - 0.004, info.sz / 2 - 0.004, 0.004).setFriction(info.fr ?? 0.55).setRestitution(0.05);
    else cd = R.ColliderDesc.ball(info.r).setFriction(info.fr ?? 0.42).setRestitution(0.22);
    cd.setMass(info.mass);
    cd.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(info.mass * 14);
    const col = this.world.createCollider(cd, body);
    col.__tag = 'prize';
    const pr = { ...info, body, col, state: 'pile', lifted: false, startY: pos.y, slipT: 0 };
    col.__prize = pr;
    this.byCol.set(col.handle, pr);
    this.byId.set(pr.id, pr);
    this.prizes.push(pr);
    return pr;
  }
  removePrize(pr) {
    this.byCol.delete(pr.col.handle);
    this.byId.delete(pr.id);
    this.world.removeRigidBody(pr.body);
    pr.state = 'gone';
    this.prizes = this.prizes.filter((q) => q !== pr);
  }
  poses() {
    return this.prizes.filter((p) => p.state === 'pile').map((p) => {
      const t = p.body.translation(), r = p.body.rotation();
      return { id: p.id, p: [t.x, t.y, t.z].map((v) => +v.toFixed(4)), q: [r.x, r.y, r.z, r.w].map((v) => +v.toFixed(4)) };
    });
  }
  settled() {
    for (const p of this.prizes) {
      if (p.state !== 'pile') continue;
      if (p.body.isSleeping()) continue;
      const v = p.body.linvel(), w = p.body.angvel();
      if (Math.hypot(v.x, v.y, v.z) > 0.01 || Math.hypot(w.x, w.y, w.z) > 0.15) return false;
    }
    return true;
  }

  // ---------------- 操作 ----------------
  start(power) {
    if (this.state !== 'idle') return false;
    this.power = power;
    this.state = 'aim';
    this.st = 0;
    this.moved = { x: this.car.x, z: this.car.z };
    this.turnStart = new Map(this.prizes.map((p) => [p, p.body.translation()]));
    return true;
  }
  drop() {
    if (this.state !== 'aim') return false;
    this.state = 'drop';
    this.st = 0;
    this.input = { x: 0, z: 0 };
    this.landT = -1;
    this.firstPress = null;
    this.emit('drop');
    return true;
  }

  limits() {
    const L = this.L, m = 0.07;
    return { x0: -L.W / 2 + m, x1: L.W / 2 - m, z0: -L.D / 2 + m, z1: L.D / 2 - m };
  }

  nearPrizes(radius) {
    const hp = this._hp || this.headPos();
    const out = [];
    for (const p of this.prizes) {
      if (p.state !== 'pile') continue;
      const t = p.body.translation();
      if (Math.abs(t.x - hp.x) < radius && Math.abs(t.z - hp.z) < radius && t.y > hp.y - 0.35 && t.y < hp.y + 0.12) out.push(p);
    }
    return out;
  }

  contacts(prongIdx, list, eps = 0.0018) {
    const p = this.prongs[prongIdx], hits = [];
    for (const pr of list) {
      for (const c of p.cols) {
        const k = c.contactCollider(pr.col, eps);
        if (k && k.distance < eps) { hits.push({ pr, n: k.normal1, d: k.distance }); break; }
      }
    }
    return hits;
  }

  relax(P, load) {
    if (load <= 0) return 0;
    const k = clamp(load / 0.11, 0.6, 3.2);
    return 24 * D2R * Math.pow(1 - clamp(P, 0, 1), 1.35) * k;
  }

  // 每一小步（固定 1/120 秒）
  sub(dt) {
    const C = this.C, L = this.L;
    this.st += dt;
    const lim = this.limits();
    let ax = 0, az = 0; // 台車加速度（給鐘擺用）
    const moveCar = (tx, tz, maxV) => {
      // 往目標點移動（加減速）
      const dx = tx - this.car.x, dz = tz - this.car.z, d = Math.hypot(dx, dz);
      const v = Math.hypot(this.car.vx, this.car.vz);
      const stopD = (v * v) / (2 * C.accel) + 0.002;
      let want = d < 0.0015 ? 0 : d <= stopD ? Math.max(0, Math.sqrt(2 * C.accel * d) * 0.9) : maxV;
      const ux = d > 1e-6 ? dx / d : 0, uz = d > 1e-6 ? dz / d : 0;
      const nvx = ux * want, nvz = uz * want;
      const dvx = clamp(nvx - this.car.vx, -C.accel * dt, C.accel * dt), dvz = clamp(nvz - this.car.vz, -C.accel * dt, C.accel * dt);
      this.car.vx += dvx; this.car.vz += dvz;
      ax = dvx / dt; az = dvz / dt;
      this.car.x += this.car.vx * dt; this.car.z += this.car.vz * dt;
      if (d < 0.0015 && v < 0.01) { this.car.x = tx; this.car.z = tz; this.car.vx = this.car.vz = 0; return true; }
      return false;
    };
    const steerProngs = (spd) => {
      for (const p of this.prongs) {
        const d = p.target - p.a;
        p.a += clamp(d, -spd * dt, spd * dt);
      }
    };

    switch (this.state) {
      case 'idle': break;
      case 'aim': {
        const ix = this.input.x, iz = this.input.z;
        const tvx = ix * C.move, tvz = iz * C.move;
        const a = C.accel * 2.2;
        const dvx = clamp(tvx - this.car.vx, -a * dt, a * dt), dvz = clamp(tvz - this.car.vz, -a * dt, a * dt);
        this.car.vx += dvx; this.car.vz += dvz;
        ax = dvx / dt; az = dvz / dt;
        this.car.x += this.car.vx * dt; this.car.z += this.car.vz * dt;
        if (this.car.x < lim.x0) { this.car.x = lim.x0; this.car.vx = 0; }
        if (this.car.x > lim.x1) { this.car.x = lim.x1; this.car.vx = 0; }
        if (this.car.z < lim.z0) { this.car.z = lim.z0; this.car.vz = 0; }
        if (this.car.z > lim.z1) { this.car.z = lim.z1; this.car.vz = 0; }
        break;
      }
      case 'drop': {
        // 停穩台車
        const v = Math.hypot(this.car.vx, this.car.vz);
        if (v > 0) { const k = Math.max(0, v - C.accel * 2 * dt) / v; ax = (this.car.vx * k - this.car.vx) / dt; az = (this.car.vz * k - this.car.vz) / dt; this.car.vx *= k; this.car.vz *= k; this.car.x += this.car.vx * dt; this.car.z += this.car.vz * dt; }
        for (const p of this.prongs) p.target = C.open;
        steerProngs(C.openSpd);
        if (this.st < 0.25) break; // 先張爪
        if (this.landT >= 0) {
          if (this.st - this.landT > 0.14) {
            this.state = 'close'; this.st = 0;
            const near = this.nearPrizes(0.22);
            this.prongs.forEach((p, i) => { p.stop = false; p.touch.clear(); p.pen0 = new Map(this.contacts(i, near).map((h) => [h.pr, Math.max(0, -h.d)])); });
            this.emit('close');
          }
          break;
        }
        this.hy -= C.descend * dt;
        const hp = this.headPos(), hq = this.headQuat();
        // 碰到地板／高台
        let landed = false;
        for (const p of this.prongs) {
          const tip = this.tipWorld(p, hp, hq);
          if (tip.y - C.rp * 1.15 <= this.groundY(tip.x, tip.z) + 0.001) landed = true;
        }
        if (this.hy <= L.minY) { this.hy = L.minY; landed = true; }
        // 壓到獎品：爪子自身的重量會把鬆動的扭蛋擠開，擠不動才停
        const near = this.nearPrizes(0.22);
        for (const pr of near) {
          const k = this.headCol.contactCollider(pr.col, 0.002);
          if (k && k.distance < 0.001) { landed = true; break; }
        }
        if (!landed) {
          let pen = 0;
          for (let i = 0; i < this.prongs.length; i++) for (const h of this.contacts(i, near)) if (h.n.y < -0.3) pen = Math.max(pen, -h.d);
          if (pen > this.C.sink) { landed = true; this.hy += pen + 0.0015; }
        }
        if (landed) { this.landT = this.st; this.emit('land', { y: this.hy }); }
        break;
      }
      case 'close': {
        const near = this.nearPrizes(0.22);
        const touch = this.prongs.map((p, i) => (p.stop ? null : this.contacts(i, near)));
        // 誰同時被兩支以上的爪碰到
        const count = new Map();
        this.prongs.forEach((p, i) => {
          const list = p.stop ? [...p.touch] : touch[i].map((h) => h.pr);
          p.touch = new Set(list);
          for (const pr of p.touch) count.set(pr, (count.get(pr) || 0) + 1);
        });
        // 馬達夾到推不動（卡住、吃進去）就停下來；推得動的話會一路把獎品往上擠
        const stall = 0.0009 + 0.0026 * this.power.g;
        let all = true;
        this.prongs.forEach((p, i) => {
          if (p.stop) return;
          let jam = false;
          for (const h of touch[i]) if (-h.d > stall + (p.pen0?.get(h.pr) || 0)) jam = true;
          if (jam || p.a <= C.closed) { p.stop = true; p.hold = Math.max(p.a + (jam ? 1.2 * D2R : 0), C.closed); p.target = p.hold; return; }
          all = false;
          p.a -= C.closeSpd * dt * (0.55 + 0.45 * this.power.g);
          p.target = p.a;
        });
        this.liftForTips();
        if (all || this.st > 1.3) {
          for (const p of this.prongs) { if (!p.stop) { p.stop = true; p.hold = p.a; } p.target = p.hold; }
          // 被夾住的獎品
          this.gripped = [...count.entries()].filter(([, n]) => n >= 2).map(([pr]) => pr);
          for (const pr of this.gripped) { pr.gripY = pr.body.translation().y; pr.lifted = false; }
          this.state = 'grip'; this.st = 0;
        }
        break;
      }
      case 'grip': {
        if (this.st > 0.22) {
          this.state = 'lift'; this.st = 0;
          const load = this.gripped.reduce((s, p) => s + p.mass, 0);
          for (const p of this.prongs) p.target = p.hold + this.relax(this.power.l, load) * (0.85 + 0.3 * Math.random());
          this.emit('lift');
        }
        break;
      }
      case 'lift': {
        steerProngs(C.relaxSpd);
        this.hy = Math.min(L.topY, this.hy + C.ascend * dt * Math.min(1, this.st * 3 + 0.2));
        if (this.hy >= L.topY) {
          this.state = 'top'; this.st = 0;
          const load = this.heldLoad();
          for (const p of this.prongs) p.target = p.hold + this.relax(this.power.c, load) * (0.85 + 0.3 * Math.random());
          this.emit('power', { held: load > 0 });
        }
        break;
      }
      case 'top': {
        steerProngs(C.relaxSpd);
        if (this.st > 0.45) { this.state = 'return'; this.st = 0; this.emit('return'); }
        break;
      }
      case 'return': {
        steerProngs(C.relaxSpd);
        if (moveCar(L.home.x, L.home.z, C.move * 0.9) && this.st > 0.2) { this.state = 'release'; this.st = 0; for (const p of this.prongs) p.target = C.open; this.emit('release'); }
        break;
      }
      case 'release': {
        steerProngs(C.openSpd);
        if (this.st > 0.8) { this.state = 'reset'; this.st = 0; for (const p of this.prongs) p.target = C.rest; }
        break;
      }
      case 'reset': {
        steerProngs(C.closeSpd);
        if ((this.st > 0.8 && this.settled()) || this.st > 3.2) {
          this.state = 'idle'; this.st = 0;
          this.emit('done', this.turnReport());
        }
        break;
      }
    }

    // 鐘擺（爪子會晃）
    if (this.state !== 'drop' || this.landT < 0) {
      const cable = Math.max(0.12, L.topY + 0.1 - this.hy);
      const w2 = G / cable, damp = this.state === 'close' || this.state === 'grip' ? 9 : 2.2;
      this.sw.vx += (-w2 * this.sw.ax - damp * this.sw.vx - ax / cable) * dt;
      this.sw.vz += (-w2 * this.sw.az - damp * this.sw.vz - az / cable) * dt;
      this.sw.ax = clamp(this.sw.ax + this.sw.vx * dt, -0.35, 0.35);
      this.sw.az = clamp(this.sw.az + this.sw.vz * dt, -0.35, 0.35);
    } else {
      this.sw.vx *= 0.8; this.sw.vz *= 0.8; this.sw.ax *= 0.97; this.sw.az *= 0.97;
    }
    this.applyClaw();
    this.world.step(this.eq);
    this.time += dt;
    this.eq.drainContactForceEvents((e) => {
      const a = this.byCol.get(e.collider1()), b = this.byCol.get(e.collider2());
      const f = e.totalForceMagnitude();
      const pr = a || b;
      if (pr) this.emit('hit', { f: f / (pr.mass * G), id: pr.id, other: a && b ? 'prize' : 'static' });
    });
    this.watchPrizes(dt);
  }

  // 爪尖刮到地板時，整支爪子被頂起來（真實機台也是這樣）
  liftForTips() {
    const C = this.C, hq = this._hq || this.headQuat();
    let need = -Infinity;
    for (const p of this.prongs) {
      const a = p.a;
      const r1 = C.rho0 + Math.sin(a) * C.L1, y1 = -Math.cos(a) * C.L1;
      const r2 = r1 + Math.sin(a - C.bend) * C.L2, y2 = y1 - Math.cos(a - C.bend) * C.L2;
      const lowest = Math.min(y1, y2) - C.rp * 1.15;
      const hp = this._hp || this.headPos();
      const tx = hp.x + Math.cos(p.phi) * r2, tz = hp.z + Math.sin(p.phi) * r2;
      need = Math.max(need, this.groundY(tx, tz) + 0.0005 - lowest);
    }
    if (need > this.hy) this.hy = Math.min(this.L.topY, need);
  }

  heldLoad() {
    // 現在還掛在爪上的重量
    const hp = this._hp;
    let m = 0;
    for (const pr of this.gripped) {
      if (pr.state !== 'pile') continue;
      const t = pr.body.translation();
      if (Math.hypot(t.x - hp.x, t.z - hp.z) < 0.09 && t.y > hp.y - 0.2 && t.y < hp.y + 0.02) m += pr.mass;
    }
    return m;
  }

  watchPrizes(dt) {
    const hp = this._hp;
    for (const pr of this.prizes) {
      if (pr.state !== 'pile') continue;
      const t = pr.body.translation();
      if (this.gripped.includes(pr)) {
        const attached = Math.hypot(t.x - hp.x, t.z - hp.z) < 0.1 && t.y > hp.y - 0.22 && t.y < hp.y + 0.03;
        if (!pr.lifted && attached && t.y > pr.gripY + 0.03) { pr.lifted = true; this.emit('grab', { id: pr.id }); }
        if (pr.lifted && !attached && !pr.slipped) { pr.slipped = true; this.emit('slip', { id: pr.id, phase: this.state, y: t.y }); }
      }
      if (this.inDrop(t.x, t.y, t.z)) {
        pr.state = 'won';
        this.emit('win', { id: pr.id, multi: false });
      }
    }
    // 掉進出口的獎品過一會兒移除
    for (const pr of [...this.prizes]) if (pr.state === 'won' && pr.body.translation().y < this.L.binY + 0.25) { pr.wonT = (pr.wonT || 0) + dt; if (pr.wonT > 1.2) this.removePrize(pr); }
  }

  // 一局結束：誰變近了、差一點
  turnReport() {
    const L = this.L, near = [];
    for (const pr of this.prizes) {
      if (pr.state !== 'pile') continue;
      const s = this.turnStart?.get(pr);
      const t = pr.body.translation();
      const d0 = s ? this.dropDist(s) : 1, d1 = this.dropDist(t);
      if (s && Math.hypot(t.x - s.x, t.y - s.y, t.z - s.z) > 0.012) near.push({ id: pr.id, before: d0, after: d1, closer: d1 < d0 - 0.008 });
    }
    for (const pr of this.gripped) { pr.slipped = false; pr.lifted = false; }
    this.gripped = [];
    return { moved: near };
  }
  // 獎品離出口多遠（公尺）
  dropDist(t) {
    const L = this.L;
    if (this.kind === 'pile') {
      const c = L.chute;
      const dx = Math.max(0, t.x - c.x1), dz = Math.max(0, c.z0 - t.z);
      return Math.hypot(dx, dz);
    }
    return Math.max(0, L.edgeZ - t.z);
  }

  update(dt) {
    this.acc += Math.max(0, Math.min(dt, 0.06));
    const h = this.world.timestep;
    let n = 0;
    while (this.acc >= h && n < 8) { this.sub(h); this.acc -= h; n++; }
    if (n === 8) this.acc = 0;
  }
}
