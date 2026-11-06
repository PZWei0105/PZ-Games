// 機台外觀、爪子、機台裡的獎品（扭蛋 instancing／展示盒）
import * as THREE from 'three';
import { tex, signTex } from '../engine/tex.js';
import { M, flattenPrize, capsuleGeos, capMats, buildBox, CAPSULE_COLORS, N_COLORS } from './models.js';
import { CLAW, LAYOUTS } from './sim.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const rbox = (w, h, d, r, mat) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, mat);
};

export const FLOOR_Y = 0.92; // 機台內地板離店內地面的高度

export class MachineView {
  constructor(def, index) {
    this.def = def;
    this.L = LAYOUTS[def.kind];
    const g = new THREE.Group();
    g.position.set(index * 1.28, FLOOR_Y, 0);
    this.group = g;
    this.index = index;
    const th = def.theme;
    const paint = new THREE.MeshPhysicalMaterial({ color: th.body, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 });
    const dark = new THREE.MeshStandardMaterial({ color: '#0a0b10', metalness: 0.4, roughness: 0.45 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#dfe6ef', metalness: 1, roughness: 0.14 });
    const trimCol = new THREE.Color(th.trim);
    const neon = new THREE.MeshBasicMaterial({ color: trimCol.clone().multiplyScalar(1.7) });
    const neonSoft = new THREE.MeshBasicMaterial({ color: trimCol.clone().multiplyScalar(1.2) });
    this.neon = neon;
    const W = 0.84, D = 0.72, H = 0.96;
    // 柱子
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = box(0.05, 2.24, 0.05, paint, x * 0.455, 0.2, z * 0.395); g.add(p);
      if (z > 0) g.add(box(0.008, H, 0.008, neon, x * 0.432, H / 2, 0.418));
    }
    // 下櫃
    const lower = rbox(0.98, 0.9, 0.84, 0.03, paint); lower.position.set(0, -0.47, 0); g.add(lower);
    for (const [w, d, x, z] of [[0.99, 0.06, 0, 0.395], [0.99, 0.06, 0, -0.395], [0.06, 0.85, 0.465, 0], [0.06, 0.85, -0.465, 0]]) g.add(box(w, 0.014, d, chrome, x, -0.004, z));
    // 出貨口
    const door = box(0.26, 0.2, 0.02, dark, -0.27, -0.44, 0.43); g.add(door);
    const flap = box(0.24, 0.17, 0.006, M.glass('#9fb8d8', 0.35), -0.27, -0.44, 0.443); g.add(flap);
    g.add(box(0.27, 0.006, 0.01, neon, -0.27, -0.333, 0.446));
    g.add(box(0.27, 0.006, 0.01, neon, -0.27, -0.547, 0.446));
    const doorTag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: signTex('PRIZE ▼', { color: th.accent, font: '900 150px "Bungee", "Noto Sans TC", sans-serif', w: 1024, h: 256 }), transparent: true, depthWrite: false })); doorTag.position.set(-0.27, -0.3, 0.447); g.add(doorTag);
    // 投幣面板
    const coin = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.09), new THREE.MeshBasicMaterial({ map: signTex('INSERT COIN', { color: '#ff3b5c', glow: '#ff2a50', font: '900 120px "Bungee", "Noto Sans TC", sans-serif', w: 1024, h: 256 }), transparent: true, depthWrite: false }));
    coin.position.set(0.25, -0.33, 0.447); g.add(coin);
    this.coinSign = coin;
    g.add(box(0.06, 0.09, 0.012, dark, 0.25, -0.45, 0.44));
    g.add(box(0.008, 0.05, 0.004, M.glow('#ff9a3a', 1.6), 0.25, -0.45, 0.447));
    // 操作台
    const desk = rbox(0.94, 0.08, 0.2, 0.02, paint); desk.position.set(0, -0.11, 0.52); desk.rotation.x = 0.12; g.add(desk);
    const deskTop = box(0.9, 0.006, 0.17, dark, 0, -0.066, 0.52); deskTop.rotation.x = 0.12; g.add(deskTop);
    const stick = new THREE.Group(); stick.position.set(-0.22, -0.06, 0.52); g.add(stick);
    stick.add(box(0.06, 0.008, 0.06, chrome, 0, 0.004, 0));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 10), chrome); shaft.position.y = 0.035; stick.add(shaft);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#ff2e4f', roughness: 0.18, clearcoat: 1 })); ball.position.y = 0.075; stick.add(ball);
    this.stick = stick;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.044, 0.02, 32), new THREE.MeshStandardMaterial({ color: '#ff2a3f', emissive: '#ff1530', emissiveIntensity: 0.9, roughness: 0.3 })); btn.position.set(0.2, -0.05, 0.52); btn.rotation.x = 0.12; g.add(btn);
    this.btn = btn;
    // 玻璃
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff2ff', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.05, clearcoat: 0.5, envMapIntensity: 0.6, depthWrite: false, side: THREE.DoubleSide });
    const gF = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, H), glass); gF.position.set(0, H / 2, 0.372); g.add(gF);
    for (const s of [-1, 1]) { const gs = new THREE.Mesh(new THREE.PlaneGeometry(D + 0.02, H), glass); gs.rotation.y = Math.PI / 2; gs.position.set(s * 0.432, H / 2, 0); g.add(gs); }
    this.glassF = gF;
    // 背板
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, H + 0.02), new THREE.MeshStandardMaterial({ map: tex.backdrop(th.back[0], th.back[1], th.accent, index + 1), emissive: '#ffffff', emissiveMap: tex.backdrop(th.back[0], th.back[1], th.accent, index + 1), emissiveIntensity: 0.55, roughness: 0.6 }));
    back.position.set(0, H / 2, -0.37); g.add(back);
    // 地板
    const felt = new THREE.MeshStandardMaterial({ map: tex.felt(th.floor, th.accent), roughness: 0.92, metalness: 0 });
    if (def.kind === 'pile') {
      const c = this.L.chute;
      const f1 = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - c.x1, D), felt); f1.rotation.x = -Math.PI / 2; f1.position.set((c.x1 + W / 2) / 2, 0, 0); f1.receiveShadow = true; g.add(f1);
      const f2 = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 + W / 2, c.z0 + D / 2), felt); f2.rotation.x = -Math.PI / 2; f2.position.set((-W / 2 + c.x1) / 2, 0, (-D / 2 + c.z0) / 2); f2.receiveShadow = true; g.add(f2);
      // 出口：黑洞＋壓克力擋板＋霓虹邊
      const pit = box(c.x1 - c.x0, 0.004, c.z1 - c.z0, new THREE.MeshBasicMaterial({ color: '#000000' }), (c.x0 + c.x1) / 2, -0.3, (c.z0 + c.z1) / 2); g.add(pit);
      const pitWall = new THREE.MeshStandardMaterial({ color: '#05060a', roughness: 0.6, side: THREE.DoubleSide });
      const pw1 = new THREE.Mesh(new THREE.PlaneGeometry(c.z1 - c.z0, 0.3), pitWall); pw1.rotation.y = Math.PI / 2; pw1.position.set(c.x1, -0.15, (c.z0 + c.z1) / 2); g.add(pw1);
      const pw2 = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0, 0.3), pitWall); pw2.position.set((c.x0 + c.x1) / 2, -0.15, c.z0); g.add(pw2);
      const gh = this.L.guardH;
      const acr = new THREE.MeshPhysicalMaterial({ color: th.accent, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
      const a1 = new THREE.Mesh(new THREE.PlaneGeometry(c.z1 - c.z0, gh), acr); a1.rotation.y = Math.PI / 2; a1.position.set(c.x1, gh / 2, (c.z0 + c.z1) / 2); g.add(a1);
      const a2 = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0, gh), acr); a2.position.set((c.x0 + c.x1) / 2, gh / 2, c.z0); g.add(a2);
      g.add(box(0.006, 0.006, c.z1 - c.z0, neon, c.x1, gh, (c.z0 + c.z1) / 2));
      g.add(box(c.x1 - c.x0, 0.006, 0.006, neon, (c.x0 + c.x1) / 2, gh, c.z0));
      g.add(box(0.006, gh, 0.006, neon, c.x1, gh / 2, c.z0));
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: signTex('GOAL', { color: th.accent, font: '900 150px "Bungee", sans-serif', w: 512, h: 160 }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      lbl.rotation.x = -Math.PI / 2; lbl.position.set((c.x0 + c.x1) / 2, -0.06, (c.z0 + c.z1) / 2); g.add(lbl);
      this.goal = lbl;
    } else {
      const sy = this.L.shelfY, ez = this.L.edgeZ;
      const shelf = box(W, sy, ez + D / 2, new THREE.MeshPhysicalMaterial({ color: th.body, metalness: 0.5, roughness: 0.3, clearcoat: 1 }), 0, sy / 2, (-D / 2 + ez) / 2); shelf.receiveShadow = true; g.add(shelf);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(W, ez + D / 2), new THREE.MeshStandardMaterial({ map: tex.felt('#1a0a18', th.accent), roughness: 0.95 })); top.rotation.x = -Math.PI / 2; top.position.set(0, sy + 0.001, (-D / 2 + ez) / 2); top.receiveShadow = true; g.add(top);
      g.add(box(W, 0.008, 0.008, neon, 0, sy + 0.002, ez));
      // 邊緣警示條紋
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.03), new THREE.MeshBasicMaterial({ map: signTex('▼ DROP ▼ DROP ▼ DROP ▼', { color: th.accent, font: '900 110px "Bungee", sans-serif', w: 2048, h: 128 }), transparent: true, depthWrite: false }));
      stripe.position.set(0, sy - 0.02, ez + 0.001); g.add(stripe);
      const pit = box(W, 0.004, D / 2 - ez, new THREE.MeshBasicMaterial({ color: '#000000' }), 0, -0.25, (ez + D / 2) / 2); g.add(pit);
      const ramp = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.4), new THREE.MeshStandardMaterial({ color: '#06070b', roughness: 0.7, side: THREE.DoubleSide })); ramp.position.set(0, -0.05, ez); g.add(ramp);
      this.goal = stripe;
    }
    // 頂箱與招牌
    const head = rbox(0.98, 0.36, 0.84, 0.03, paint); head.position.set(0, H + 0.19, 0); g.add(head);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.17), new THREE.MeshBasicMaterial({ map: signTex(def.name, { color: '#ffffff', glow: th.trim, blur: 30, w: 1024, h: 200 }), transparent: true, depthWrite: false }));
    sign.position.set(0, H + 0.25, 0.432); g.add(sign);
    const en = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ map: signTex(def.en, { color: th.accent, font: '900 120px "Bungee", sans-serif', w: 1024, h: 160 }), transparent: true, depthWrite: false }));
    en.position.set(0, H + 0.145, 0.433); g.add(en); this.enSign = en;
    g.add(box(0.9, 0.008, 0.008, neon, 0, H + 0.36, 0.43));
    g.add(box(0.9, 0.008, 0.008, neon, 0, H + 0.02, 0.43));
    // 頂燈（照亮機台內）
    const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, D - 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(1.6) }));
    lightPanel.rotation.x = Math.PI / 2; lightPanel.position.set(0, H - 0.004, 0); g.add(lightPanel);
    // 保夾燈
    this.bulbs = [];
    const n = def.meter || 0;
    if (n) {
      const bw = Math.min(0.045, 0.8 / n);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.32, 12, 8), new THREE.MeshBasicMaterial({ color: '#2a2a33' }));
        b.position.set(-((n - 1) * bw) / 2 + i * bw, H + 0.075, 0.44); g.add(b); this.bulbs.push(b);
      }
      const pw = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.045), new THREE.MeshBasicMaterial({ map: signTex('POWER', { color: '#ffffff', glow: '#ff3060', font: '900 150px "Bungee", sans-serif', w: 512, h: 128 }), transparent: true, opacity: 0, depthWrite: false }));
      pw.position.set(0, H + 0.145, 0.434); g.add(pw); this.powerSign = pw;
    }
    // 天車
    const rail = chrome;
    for (const s of [-1, 1]) g.add(box(0.018, 0.018, D, rail, s * 0.405, 0.93, 0));
    this.bar = box(W - 0.02, 0.018, 0.03, rail, 0, 0.912, 0); g.add(this.bar);
    this.carriage = new THREE.Group(); g.add(this.carriage);
    const cb = box(0.08, 0.045, 0.07, paint); cb.position.y = 0.89; this.carriage.add(cb);
    this.carriage.add(box(0.084, 0.006, 0.074, neon, 0, 0.866, 0));
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6), new THREE.MeshStandardMaterial({ color: '#c8ccd4', metalness: 1, roughness: 0.4 }));
    g.add(this.cable);
    this.buildClaw(chrome);
    // 店內地面的光暈
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ map: tex.dot(), color: trimCol.clone().multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, -FLOOR_Y + 0.002, 0.45); g.add(pool);
    g.traverse((o) => { if (o.isMesh && o.material !== glass && !o.material.transparent) { o.receiveShadow = true; } });
    this.prizes = null;
  }

  buildClaw(chrome) {
    const C = CLAW;
    const claw = new THREE.Group();
    this.group.add(claw);
    this.claw = claw;
    const head = new THREE.Group(); claw.add(head);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(C.headR, C.headR * 1.08, C.headH, 28), chrome); body.position.y = C.headH / 2 + 0.004; head.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(C.headR, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome); cap.position.y = C.headH + 0.004; head.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(C.headR * 1.02, 0.004, 8, 32), this.neon); band.rotation.x = Math.PI / 2; band.position.y = C.headH * 0.55; head.add(band);
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(C.rho0 + 0.01, C.rho0 + 0.012, 0.012, 24), new THREE.MeshStandardMaterial({ color: '#2a2e38', metalness: 0.8, roughness: 0.3 })));
    this.headBand = band;
    this.head = head;
    this.prongs = [];
    const rub = M.rubber();
    for (let i = 0; i < C.prongs; i++) {
      const p = new THREE.Group(); claw.add(p);
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(C.rp * 0.95, C.L1, 4, 10), chrome); up.position.y = -C.L1 / 2; p.add(up);
      const tip = new THREE.Group(); tip.position.y = -C.L1; tip.rotation.z = -C.bend; p.add(tip);
      const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(C.rp * 1.05, C.L2 * 0.7, 4, 10), chrome); t1.position.y = -C.L2 * 0.35; tip.add(t1);
      const pad = new THREE.Mesh(new THREE.CapsuleGeometry(C.rp * 1.2, C.L2 * 0.28, 4, 10), rub); pad.position.y = -C.L2 * 0.82; tip.add(pad);
      const hinge = new THREE.Mesh(new THREE.SphereGeometry(C.rp * 1.4, 12, 8), new THREE.MeshStandardMaterial({ color: '#2a2e38', metalness: 0.8, roughness: 0.3 })); p.add(hinge);
      this.prongs.push(p);
    }
    claw.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  // 依物理更新爪子與天車
  syncClaw(sim) {
    const hp = sim._hp, hq = sim._hq;
    this.head.position.set(hp.x, hp.y, hp.z);
    this.head.quaternion.set(hq.x, hq.y, hq.z, hq.w);
    sim.prongs.forEach((p, i) => {
      const o = this.prongs[i];
      o.position.set(p._pos.x, p._pos.y, p._pos.z);
      o.quaternion.set(p._q.x, p._q.y, p._q.z, p._q.w);
    });
    this.carriage.position.set(sim.car.x, 0, sim.car.z);
    this.bar.position.z = sim.car.z;
    const top = 0.866, bot = hp.y + CLAW.headH + 0.004 + 0.02;
    this.cable.position.set((sim.car.x + hp.x) / 2, (top + bot) / 2, (sim.car.z + hp.z) / 2);
    this.cable.scale.y = Math.max(0.001, top - bot);
    const dx = hp.x - sim.car.x, dz = hp.z - sim.car.z, dy = top - bot;
    this.cable.rotation.set(Math.atan2(dz, dy), 0, -Math.atan2(dx, dy));
  }

  setStick(x, z) { this.stick.rotation.set(z * 0.35, 0, -x * 0.35); }

  setMeter(n, max, power, t) {
    const lit = new THREE.Color(this.def.theme.trim).multiplyScalar(2.4), off = new THREE.Color('#25252e'), pw = new THREE.Color('#ff3060').multiplyScalar(2.6);
    this.bulbs.forEach((b, i) => {
      if (power) b.material.color.copy(Math.sin(t * 10 + i * 0.7) > 0 ? pw : lit);
      else b.material.color.copy(i < n ? lit : off);
    });
    if (this.powerSign) { this.powerSign.material.opacity = power ? 0.6 + 0.4 * Math.sin(t * 8) : 0; this.enSign.visible = !power; }
    this.headBand.material = power ? this.powerMat || (this.powerMat = new THREE.MeshBasicMaterial({ color: pw })) : this.neon;
  }
}

// ---------------- 機台裡的獎品 ----------------
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const WHITE = new THREE.Color('#ffffff');
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _mini = new THREE.Matrix4();
const COLORS = Object.fromEntries(Object.entries(CAPSULE_COLORS).map(([k, v]) => [k, new THREE.Color(v)]));
const NCOL = N_COLORS.map((c) => new THREE.Color(c));
export const capColor = (c) => (c.rarity === 'N' ? NCOL[c.uid % NCOL.length] : COLORS[c.rarity] || NCOL[0]);

export class PrizeLayer {
  constructor(view) {
    this.view = view;
    this.group = new THREE.Group();
    view.group.add(this.group);
    this.items = []; // { uid, prize, rarity, black, r, pose:{p,q}, kind }
    this.dirty = true;
    this.inst = null;
    this.miniCache = new Map();
    this.boxes = new Map();
    this.tickers = [];
  }
  set(items) { this.items = items; this.dirty = true; }
  rebuild() {
    this.dirty = false;
    // 清掉舊的
    if (this.inst) for (const m of this.inst.all) { this.group.remove(m); m.dispose(); }
    for (const [, b] of this.boxes) this.group.remove(b.g);
    this.boxes.clear();
    this.tickers = [];
    const caps = this.items.filter((i) => i.kind === 'cap');
    const geos = this.capGeos || (this.capGeos = capsuleGeos());
    const normal = caps.filter((c) => !c.black), black = caps.filter((c) => c.black);
    const all = [];
    const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.group.add(m); all.push(m); return m; };
    const top = mk(geos.top, capMats.top(), normal.length), bot = mk(geos.bot, capMats.bot(), normal.length), seam = mk(geos.seam, capMats.seam(), normal.length);
    top.castShadow = false;
    const tint = new THREE.Color();
    normal.forEach((c, i) => { const col = capColor(c); bot.setColorAt(i, col); top.setColorAt(i, tint.copy(col).lerp(WHITE, 0.35)); });
    if (bot.instanceColor) bot.instanceColor.needsUpdate = true;
    if (top.instanceColor) top.instanceColor.needsUpdate = true;
    const btop = mk(geos.top, capMats.blackTop(), black.length), bbot = mk(geos.bot, capMats.blackBot(), black.length), bseam = mk(geos.seam, capMats.blackSeam(), black.length);
    // 小模型（依獎品種類）
    const byPrize = new Map();
    for (const c of normal) { if (!byPrize.has(c.prize)) byPrize.set(c.prize, []); byPrize.get(c.prize).push(c); }
    const minis = [];
    for (const [pid, list] of byPrize) {
      if (!this.miniCache.has(pid)) this.miniCache.set(pid, flattenPrize(pid));
      const parts = this.miniCache.get(pid).map((pt) => { const m = mk(pt.geo, pt.mat, list.length); m.castShadow = false; return m; });
      minis.push({ list, parts });
    }
    this.inst = { all, top, bot, seam, btop, bbot, bseam, normal, black, minis };
    // 展示盒
    for (const it of this.items.filter((i) => i.kind === 'box')) {
      const b = buildBox(it.prize, it.rarity, it.size);
      this.group.add(b.g); this.boxes.set(it.uid, b);
      if (b.prize.tick) this.tickers.push(b.prize.tick);
    }
  }
  // poseOf(uid) → { p:{x,y,z}, q:{x,y,z,w} }
  update(poseOf, t) {
    if (this.dirty) this.rebuild();
    const I = this.inst;
    const put = (list, meshes) => {
      list.forEach((c, i) => {
        const P = poseOf(c);
        if (!P) { for (const m of meshes) m.setMatrixAt(i, ZERO); return; }
        _p.set(P.p.x, P.p.y, P.p.z); _q.set(P.q.x, P.q.y, P.q.z, P.q.w); _s.setScalar(c.r);
        _m.compose(_p, _q, _s);
        for (const m of meshes) m.setMatrixAt(i, _m);
      });
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    };
    put(I.normal, [I.top, I.bot, I.seam]);
    put(I.black, [I.btop, I.bbot, I.bseam]);
    // 小模型：放在扭蛋中心略偏上，縮小到裝得下
    for (const { list, parts } of I.minis) {
      list.forEach((c, i) => {
        const P = poseOf(c);
        if (!P) { for (const m of parts) m.setMatrixAt(i, ZERO); return; }
        const ms = (c.r * 1.45) / 0.13;
        _mini.makeScale(ms, ms, ms); _mini.setPosition(0, -0.062 * ms + c.r * 0.12, 0);
        _p.set(P.p.x, P.p.y, P.p.z); _q.set(P.q.x, P.q.y, P.q.z, P.q.w); _s.setScalar(1);
        _m.compose(_p, _q, _s).multiply(_mini);
        for (const m of parts) m.setMatrixAt(i, _m);
      });
      for (const m of parts) m.instanceMatrix.needsUpdate = true;
    }
    for (const [uid, b] of this.boxes) {
      const P = poseOf({ uid });
      if (!P) { b.g.visible = false; continue; }
      b.g.visible = true;
      b.g.position.set(P.p.x, P.p.y, P.p.z); b.g.quaternion.set(P.q.x, P.q.y, P.q.z, P.q.w);
    }
    for (const tk of this.tickers) tk(t);
  }
}
