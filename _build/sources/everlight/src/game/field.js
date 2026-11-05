// 場景（大地圖）：移動、跟隨、NPC、明雷敵人、互動、觸發、燈塔光束
import * as THREE from 'three';
import { World } from '../engine/world.js';
import { LightPool, Actor } from '../engine/sprite3d.js';
import { FX } from '../engine/fx.js';
import { MAPS } from './maps.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class Field {
  constructor(game, mapId, at, dir = 'down') {
    this.g = game; this.id = mapId;
    const base = MAPS[mapId];
    const def = typeof base === 'function' ? base(game.state.flags) : base;
    this.def = def;
    const S = game.state;
    this.scene = new THREE.Scene();
    this.pool = new LightPool(this.scene);
    this.applyEnv(def.env);
    this.world = new World(def, this.pool);
    this.scene.add(this.world.group);
    this.fx = new FX(this.scene, 500);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 160);
    this.zoom = S.zoom ?? 1;
    // 主角與隊友
    this.player = this.makeActor('wei');
    const [px, pz] = at || def.spawn || [def.rows[0].length / 2, def.rows.length / 2];
    this.player.position.set(px, this.world.groundY(px, pz), pz);
    this.player.dir = dir;
    this.scene.add(this.player.group);
    this.followers = [];
    this.trail = [];
    for (let i = 0; i < 40; i++) this.trail.push(V3());
    this.resetTrail();
    for (const m of S.party) if (m.id !== 'wei' && !S.flags['hide_' + m.id]) {
      const a = this.makeActor(m.id); const k = this.followers.length;
      a.position.copy(this.trail[Math.max(0, this.trail.length - 1 - (k + 1) * 7)]); a.position.y = this.world.groundY(a.position.x, a.position.z);
      a.dir = dir; this.scene.add(a.group); this.followers.push(a); a.memberId = m.id;
    }
    // NPC
    this.npcs = [];
    for (const n of def.npcs || []) this.addNpc(n);
    // 明雷敵人
    this.enemies = [];
    const dead = S.defeated[mapId] || [];
    for (const e of def.enemies || []) {
      if (dead.includes(e.id) || (e.cond && !e.cond(S.flags))) continue;
      this.addEnemy(e);
    }
    // 寶箱狀態
    for (const [id, c] of Object.entries(this.world.chests || {})) if (S.chests[id]) { c.open = true; c.lid.rotation.x = -1.2; c.lid.position.z -= 0.18; c.lid.position.y += 0.1; }
    // 燈塔光束
    if (def.lighthouse) this.buildBeam(def.lighthouse);
    if (def.phaseToggle) { const ph = S.fieldPhase?.[mapId] || def.phase || 'D'; this.world.setPhase(ph, true); this.applyFieldPhaseLight(ph); }
    if (def.phase === 'L' && !def.phaseToggle) for (const s of this.world.lightSources) s.mul = s.dayMul ?? def.lampDay ?? 0.42;
    this.pool.setSources(this.world.lightSources.concat(this.extraLights || []));
    this.busy = false; this.path = null; this.t = 0; this.lastSafe = this.player.position.clone();
    this.enterGrace = 1.2;
    this.camT = this.player.position.clone(); this.camOverride = null;
    this.firedTriggers = new Set();
    this.g.renderer.r.shadowMap.needsUpdate = true;
    this.setupShadow();
    if (def.onBuild) def.onBuild(this, S.flags);
  }
  applyEnv(env = {}) {
    const sc = this.scene;
    sc.background = new THREE.Color(env.bg || '#070b14');
    sc.fog = new THREE.Fog(env.fog?.[0] || env.bg || '#070b14', env.fog?.[1] ?? 20, env.fog?.[2] ?? 48);
    this.hemi = new THREE.HemisphereLight(env.hemi?.[0] || '#3a5a8a', env.hemi?.[1] || '#1a1a24', env.hemi?.[2] ?? 0.9);
    sc.add(this.hemi);
    const d = env.dir || {};
    this.sun = new THREE.DirectionalLight(d.color || '#9ab4ff', d.i ?? 1.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.02;
    this.sunOff = V3(...(d.pos || [-8, 14, 6]));
    sc.add(this.sun); sc.add(this.sun.target);
    this.pool.ambient.set(env.ambient || '#525c85');
    this.post = Object.assign({ bloom: 0.55, threshold: 0.85, vignette: 0.45, sat: 1, tilt: 0.35, lift: [0.012, 0.012, 0.03], gain: [1, 1, 1], focusRange: 3.6 }, env.post || {});
  }
  setupShadow() {
    // 地圖不大：陰影相機涵蓋整張地圖，只算一次
    const w = this.world.w, h = this.world.h;
    const c = this.sun.shadow.camera;
    const R = Math.max(w, h) * 0.75;
    c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = 120; c.updateProjectionMatrix();
    const center = V3(w / 2, 0, h / 2);
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).add(this.sunOff.clone().normalize().multiplyScalar(50));
    this.g.renderer.r.shadowMap.needsUpdate = true;
  }
  makeActor(id) {
    const sheet = this.g.sheet(id);
    return new Actor(sheet, this.pool, { scale: id === 'kid' ? 0.85 : 1 });
  }
  addNpc(n) {
    if (n.cond && !n.cond(this.g.state.flags)) return null;
    const a = this.makeActor(n.cast || n.id);
    a.position.set(n.x + 0.5, this.world.groundY(n.x + 0.5, n.z + 0.5), n.z + 0.5);
    a.dir = n.dir || 'down';
    a.npc = n; a.home = a.position.clone();
    if (n.scale) a.mesh.scale.multiplyScalar(n.scale);
    this.scene.add(a.group);
    this.npcs.push(a);
    this.world.colliders.push(a.col = { x: a.position.x, z: a.position.z, r: 0.42 });
    return a;
  }
  addEnemy(e) {
    const sheet = this.g.monsterSheet(e.art);
    const a = new Actor(sheet, this.pool, { scale: (e.scale || 0.58), baseline: 2, shadowSize: 1.2 });
    a.mat.uniforms.emissive.value = 1;
    a.position.set(e.x + 0.5, this.world.groundY(e.x + 0.5, e.z + 0.5), e.z + 0.5);
    a.enemy = e; a.home = a.position.clone(); a.state = 'idle'; a.timer = Math.random() * 2; a.wdir = new THREE.Vector2();
    a.flip = true; a.isHuman = sheet.human;
    this.scene.add(a.group);
    this.enemies.push(a);
    return a;
  }
  buildBeam(L) {
    const g = new THREE.Group();
    const mk = (len, rad, op) => {
      const geo = new THREE.CylinderGeometry(rad * 0.08, rad, len, 24, 1, true);
      geo.translate(0, len / 2, 0); geo.rotateX(Math.PI / 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: { op: { value: op }, len: { value: len } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
        fragmentShader: 'uniform float op; uniform float len; varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ float t = clamp(vP.z/len,0.0,1.0); float f = pow(abs(dot(vN,vV)),1.6); float a = (1.0-t)*(1.0-t)*f*op; gl_FragColor = vec4(vec3(1.0,0.86,0.58)*a, a); }',
      });
      return new THREE.Mesh(geo, mat);
    };
    const b1 = mk(L.len || 46, L.rad || 5.5, 0.55), b2 = mk(L.len || 46, L.rad || 5.5, 0.55);
    b2.rotation.y = Math.PI;
    g.add(b1); g.add(b2);
    g.position.set(L.x, L.y, L.z);
    this.scene.add(g);
    this.beam = { g, L, ang: L.ang ?? 0, speed: L.speed ?? 0.32, on: L.on ?? true, flicker: 0, b2, b1, pillar: !!L.pillar };
    // 光束照到地面的聚光燈
    const sp = new THREE.SpotLight('#ffe2a8', 0, 70, 0.17, 0.6, 1.2);
    sp.position.set(L.x, L.y, L.z); this.scene.add(sp); this.scene.add(sp.target);
    this.beam.spot = sp;
    // 燈室的光
    this.extraLights = [{ pos: V3(L.x, L.y, L.z), color: new THREE.Color('#ffd890'), intensity: 40, range: 14, flicker: false, priority: 60, on: this.beam.on || this.beam.pillar }];
    this.beam.lampLight = this.extraLights[0];
    if (this.beam.pillar) this.beamPillar(true);
  }
  lampFlicker(off) {
    const B = this.beam; if (!B) return;
    if (off) { B.flicker = 1.3; B.on = false; }
    else { B.on = true; B.flicker = 0.5; }
    B.lampLight.on = !off;
    const gl = this.world.lighthouseGlass; if (gl) gl.material.emissiveIntensity = off ? 0.12 : 2.4;
  }
  beamPillar(instant) {
    const B = this.beam; if (!B) return;
    B.pillar = true; B.on = true; B.flicker = 0;
    B.g.rotation.set(-Math.PI / 2, 0, 0);
    B.b2.visible = false;
    B.b1.scale.set(0.55, 0.55, 2.2);
    B.b1.material.uniforms.op.value = 0.9;
    B.lampLight.on = true; B.lampLight.intensity = 70; B.lampLight.range = 22;
    const gl = this.world.lighthouseGlass; if (gl) gl.material.emissiveIntensity = 3.6;
    if (!instant) this.fx.emit({ pos: V3(B.L.x, B.L.y, B.L.z), n: 120, colors: ['#ffffff', '#fff2c0', '#ffd27a'], speed: 6, life: 1.6, size: 0.18, jitter: 1 });
  }
  addFollower(id, pos) {
    if (this.followers.find((f) => f.memberId === id)) return;
    const a = this.makeActor(id);
    a.position.copy(pos || this.player.position); a.position.y = this.world.groundY(a.position.x, a.position.z);
    a.dir = this.player.dir; a.memberId = id;
    this.scene.add(a.group); this.followers.push(a);
  }
  resetTrail() {
    const p = this.player.position, d = DIRV[this.player.dir] || [0, 1], n = this.trail.length;
    this.trail.forEach((t, i) => t.set(p.x - d[0] * (n - 1 - i) * 0.11, p.y, p.z - d[1] * (n - 1 - i) * 0.11));
  }
  // ------------------------------------------------------------
  update(dt) {
    this.t += dt;
    const S = this.g.state, inp = this.g.input;
    const busy = this.busy || this.g.ui.dialogOpen || this.g.ui.menuEl || this.g.modal;
    if (this.enterGrace > 0) this.enterGrace -= dt;
    // ---- 移動 ----
    let moving = false;
    if (!busy && !this.frozen) {
      const mv = inp.move();
      if (inp.zoomDelta) { this.zoom = Math.max(0.7, Math.min(1.45, this.zoom + inp.zoomDelta * 0.08)); S.zoom = this.zoom; inp.zoomDelta = 0; }
      for (const tp of inp.takeTaps()) this.onTap(tp);
      if (inp.took('Space') || inp.took('Enter') || inp.took('KeyZ') || inp.took('KeyE')) this.actions[0]?.fn();
      if (inp.took('KeyQ') && this.def.phaseToggle) this.togglePhase();
      if (inp.took('Escape') || inp.took('KeyX')) this.g.openMenu();
      let vx = mv.x, vz = mv.y;
      if (mv.mag > 0.05) this.path = null;
      else if (this.path) {
        const wp = this.path[0];
        const dx = wp[0] - this.player.position.x, dz = wp[1] - this.player.position.z, L = Math.hypot(dx, dz);
        if (L < 0.18) { this.path.shift(); if (!this.path.length) { this.path = null; if (this.pathDone) { const f = this.pathDone; this.pathDone = null; f(); } } }
        else { vx = dx / L; vz = dz / L; }
      }
      const sp = 4.1 * (this.path ? 1 : Math.max(0.45, mv.mag || 1));
      if (Math.abs(vx) + Math.abs(vz) > 0.05) {
        moving = true;
        this.walk(this.player, vx * sp * dt, vz * sp * dt);
      }
    } else inp.takeTaps();
    this.player.moving = moving || this.player.scripted;
    if (moving) { const p = this.player.position; const last = this.trail[this.trail.length - 1]; if (p.distanceTo(last) > 0.11) { this.trail.push(p.clone()); if (this.trail.length > 60) this.trail.shift(); } }
    // ---- 隊友跟隨 ----
    this.idleT = moving ? 0 : (this.idleT || 0) + dt;
    const PP = this.player.position, pd = DIRV[this.player.dir] || [0, 1];
    this.followers.forEach((f, i) => {
      if (f.scripted) { f.updateField(dt); return; }
      let tgt = this.trail[Math.max(0, this.trail.length - 1 - (i + 1) * 9)];
      // 停下來時散開站，不要疊在主角身上
      if (this.idleT > 0.45 && !this.player.scripted) {
        const side = i % 2 ? 1 : -1, back = 0.7 + Math.floor(i / 2) * 0.7;
        const ix = PP.x - pd[0] * back + (pd[1] !== 0 ? side * 0.95 : 0), iz = PP.z - pd[1] * back + (pd[0] !== 0 ? side * 0.6 : 0);
        if (this.world.walkable(ix, iz, null)) tgt = V3(ix, PP.y, iz);
      }
      const d = tgt.clone().sub(f.position); d.y = 0;
      const L = d.length();
      f.moving = L > 0.08;
      if (f.moving) {
        const step = Math.min(L, 4.6 * dt * (L > 1.2 ? 1.6 : 1));
        f.position.addScaledVector(d.normalize(), step);
        f.dir = Math.abs(d.x) > Math.abs(d.z) ? (d.x > 0 ? 'right' : 'left') : (d.z > 0 ? 'down' : 'up');
      } else if (this.idleT > 0.9) f.dir = this.player.dir;
      f.position.y += (this.world.groundY(f.position.x, f.position.z) - f.position.y) * Math.min(1, dt * 12);
      f.updateField(dt);
    });
    this.player.updateField(dt);
    // ---- NPC ----
    for (const n of this.npcs) {
      if (n.scripted) { n.updateField(dt); continue; }
      const d = this.player.position.distanceTo(n.position);
      if (d < 1.8 && !n.npc.fixedDir) { const dx = this.player.position.x - n.position.x, dz = this.player.position.z - n.position.z; n.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up'); }
      else if (n.npc.wander && !busy) {
        n.wt = (n.wt || 0) - dt;
        if (n.wt <= 0) { n.wt = 2 + Math.random() * 3; n.wgo = Math.random() < 0.5 ? null : [n.home.x + (Math.random() - 0.5) * n.npc.wander * 2, n.home.z + (Math.random() - 0.5) * n.npc.wander * 2]; }
        if (n.wgo) {
          const dx = n.wgo[0] - n.position.x, dz = n.wgo[1] - n.position.z, L = Math.hypot(dx, dz);
          if (L > 0.1) { const okx = this.world.walkable(n.position.x + dx / L * 0.3, n.position.z, null) || true; n.position.x += dx / L * 1.2 * dt; n.position.z += dz / L * 1.2 * dt; n.moving = true; n.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up'); n.col.x = n.position.x; n.col.z = n.position.z; }
          else { n.wgo = null; n.moving = false; }
        } else n.moving = false;
      }
      n.updateField(dt);
    }
    // ---- 敵人 ----
    if (!busy) this.updateEnemies(dt);
    for (const e of this.enemies) {
      const f = e.sheet.index;
      const fr = e.state === 'stun' ? (Math.floor(this.t * 8) % 2 ? 'hurt' : 'idle0') : `idle${Math.floor((this.t + e.timer) * 2.5) % 2}`;
      e.setFrame(fr);
      e.mesh.rotation.y = 0;
      e.mesh.position.y = (e.enemy.fly || 0) * 0.4 + Math.sin(this.t * 3 + e.timer) * (e.enemy.fly ? 0.12 : 0.02);
      e.flip = e.isHuman ? !!e.faceRight : !!e.faceLeft;
    }
    // ---- 互動提示 ----
    if (!busy) this.updateActions();
    // ---- 觸發 ----
    if (!busy && this.enterGrace <= 0) this.checkTriggers();
    // ---- 鏡頭 ----
    this.updateCamera(dt);
    // ---- 光束 ----
    if (this.beam) this.updateBeam(dt);
    this.world.update(dt, this.t);
    this.pool.update(this.camT, this.t);
    this.fx.update(dt, this.camera);
    if (this.world.embers && Math.random() < dt * 6) for (const p of this.world.embers) if (p.distanceTo(this.player.position) < 14) this.fx.emit({ pos: p.clone().add(V3(0, -0.2, 0)), n: 1, colors: ['#ffb050', '#ffe08a'], speed: 0.4, up: 2.4, gravity: -0.6, life: 1.6, size: 0.06, shape: 0, jitter: 0.3 });
    if (this.def.motes && Math.random() < dt * 10) { const p = this.player.position; this.fx.emit({ pos: V3(p.x + (Math.random() - 0.5) * 16, p.y + 0.3 + Math.random() * 2.5, p.z + (Math.random() - 0.5) * 12), n: 1, colors: this.def.motes, speed: 0.15, life: 3, size: 0.05, shape: 1, gravity: -0.05, drag: 0.2 }); }
    this.updateLabels();
  }
  walk(a, dx, dz) {
    const W = this.world, p = a.position, r = 0.26;
    const h0 = W.cell(Math.floor(p.x), Math.floor(p.z))?.h ?? 0;
    const ok = (x, z) => W.walkable(x - r, z - r * 0.6, h0) && W.walkable(x + r, z - r * 0.6, h0) && W.walkable(x - r, z + r * 0.6, h0) && W.walkable(x + r, z + r * 0.6, h0) && !this.blockedByNpc(x, z, a);
    if (ok(p.x + dx, p.z)) p.x += dx;
    if (ok(p.x, p.z + dz)) p.z += dz;
    const gy = W.groundY(p.x, p.z);
    p.y += (gy - p.y) * 0.35;
    if (Math.abs(dx) > Math.abs(dz) * 1.1) a.dir = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dz) > 0.0001) a.dir = dz > 0 ? 'down' : 'up';
  }
  blockedByNpc(x, z, self) {
    for (const n of this.npcs) if (n !== self && !n.npc.ghost && (n.position.x - x) ** 2 + (n.position.z - z) ** 2 < 0.36) return true;
    return false;
  }
  updateEnemies(dt) {
    const P = this.player.position;
    for (const e of this.enemies) {
      e.timer += dt;
      const d = Math.hypot(P.x - e.position.x, P.z - e.position.z);
      if (e.state === 'stun') { e.stun -= dt; if (e.stun <= 0) e.state = 'idle'; continue; }
      let vx = 0, vz = 0, sp = 0;
      if (d < (e.enemy.sight || 3.4) && this.enterGrace <= 0 && !this.g.state.flags.noEncounter) { e.state = 'chase'; vx = (P.x - e.position.x) / d; vz = (P.z - e.position.z) / d; sp = e.enemy.speed || 2.5; }
      else {
        if (e.state === 'chase') e.state = 'idle';
        if (e.timer > 2.5) { e.timer = 0; const a = Math.random() * Math.PI * 2; e.wdir.set(Math.cos(a), Math.sin(a)); if (e.position.distanceTo(e.home) > (e.enemy.wander || 2)) { const h = e.home.clone().sub(e.position); e.wdir.set(h.x, h.z).normalize(); } }
        if (e.timer < 1.2) { vx = e.wdir.x; vz = e.wdir.y; sp = 0.9; }
      }
      if (sp) {
        const nx = e.position.x + vx * sp * dt, nz = e.position.z + vz * sp * dt;
        if (this.world.walkable(nx, nz, null)) { e.position.x = nx; e.position.z = nz; }
        e.faceLeft = vx < 0; e.faceRight = vx > 0;
        e.position.y += (this.world.groundY(e.position.x, e.position.z) - e.position.y) * 0.3;
      }
      if (d < 0.85 && !this.busy) { this.encounter(e, false); return; }
    }
  }
  async encounter(e, preempt) {
    if (this.busy) return;
    this.busy = true; this.path = null;
    const res = await this.g.battle(e.enemy.enc, { preempt, fieldEnemy: e.enemy.id });
    if (res === 'win') {
      this.removeEnemy(e);
      const S = this.g.state; (S.defeated[this.id] = S.defeated[this.id] || []).push(e.enemy.id);
    } else if (res === 'flee') { e.state = 'stun'; e.stun = 3; }
    this.busy = false;
    this.enterGrace = 0.8;
  }
  removeEnemy(e) {
    this.scene.remove(e.group);
    this.enemies = this.enemies.filter((x) => x !== e);
  }
  // ---- 互動 ----
  interactables() {
    const out = [];
    for (const n of this.npcs) if (!n.npc.silent) out.push({ kind: 'npc', a: n, x: n.position.x, z: n.position.z, r: 1.35 });
    for (const it of this.world.interact) if (!(it.kind === 'chest' && it.open)) out.push({ kind: it.kind, it, x: it.x, z: it.z, r: it.r });
    for (const s of this.def.spots || []) if (!s.cond || s.cond(this.g.state.flags)) out.push({ kind: s.kind || 'examine', it: s, x: s.x + 0.5, z: s.z + 0.5, r: s.r || 1.3 });
    return out;
  }
  updateActions() {
    const P = this.player.position;
    let best = null, bd = 1e9;
    for (const o of this.interactables()) { const d = Math.hypot(P.x - o.x, P.z - o.z); if (d < o.r && d < bd) { bd = d; best = o; } }
    const acts = [];
    const near = this.enemies.find((e) => e.state !== 'stun' && Math.hypot(P.x - e.position.x, P.z - e.position.z) < 1.9);
    if (near) acts.push({ label: '揮燈先制', fn: () => this.strike(near) });
    if (best) {
      if (best.kind === 'npc') {
        acts.push({ label: '對話', fn: () => this.talk(best.a) });
        if (best.a.npc.shadow && !this.g.state.flags.noLamp) acts.push({ label: '照影', sec: true, fn: () => this.shine(best.a) });
      } else {
        const lbl = { chest: '打開', sign: '查看', door: best.it.label || '進入', camp: '營火', fish: '釣魚', examine: best.it.label || '調查' }[best.kind] || '調查';
        acts.push({ label: lbl, fn: () => this.use(best) });
      }
    }
    if (this.def.phaseToggle && !this.g.state.flags.noLamp) acts.push({ label: '轉燈', sec: true, fn: () => this.togglePhase() });
    this.actions = acts;
    this.g.ui.setActions(acts);
  }
  async strike(e) {
    this.g.sound.sfx('slash');
    this.player.dir = e.position.x < this.player.position.x ? 'left' : 'right';
    this.fx.hitFx('slash', e.position.clone().add(V3(0, 0.8, 0)));
    await new Promise((r) => setTimeout(r, 120));
    this.encounter(e, true);
  }
  async talk(a) {
    const n = a.npc;
    const dx = this.player.position.x - a.position.x, dz = this.player.position.z - a.position.z;
    if (!n.fixedDir) a.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
    this.player.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'left' : 'right') : (dz > 0 ? 'up' : 'down');
    await this.g.runScript(async (S) => {
      if (typeof n.talk === 'function') await n.talk(S, this.g.state.flags);
      else if (n.lines) {
        const k = 'talk_' + n.id; const i = this.g.state.flags[k] || 0;
        const L = Array.isArray(n.lines[0]) ? n.lines[Math.min(i, n.lines.length - 1)] : n.lines;
        for (const l of L) await S.say(n.name, l);
        this.g.state.flags[k] = i + 1;
      }
    });
  }
  async shine(a) {
    const n = a.npc;
    this.g.sound.sfx('shine');
    this.fx.emit({ pos: a.position.clone().add(V3(0, 1, 0)), n: 24, colors: ['#ffe8a0', '#fff6d8'], speed: 1, life: 1, size: 0.12, up: 0.5, jitter: 0.8 });
    const s = this.screen(a.position.clone().add(V3(0, 2.1, 0)));
    const text = typeof n.shadow === 'function' ? n.shadow(this.g.state.flags) : n.shadow;
    this.g.ui.shadowTalk(s.x, s.y, `<span style="color:#9a8ad8;font-size:11px;letter-spacing:.2em">影子在想</span><br>${text}`);
    const k = 'shine_' + n.id;
    if (!this.g.state.flags[k]) {
      this.g.state.flags[k] = 1;
      if (n.onShine) await this.g.runScript(async (S) => n.onShine(S, this.g.state.flags));
    }
  }
  async use(o) {
    const S = this.g.state;
    if (o.kind === 'chest') {
      const c = o.it; if (c.open) return;
      c.open = true; S.chests[c.id] = true;
      this.g.sound.sfx('chest');
      const lid = c.lid; const t0 = performance.now();
      const anim = () => { const k = Math.min(1, (performance.now() - t0) / 300); lid.rotation.x = -1.2 * k; if (k < 1) requestAnimationFrame(anim); };
      anim();
      this.fx.emit({ pos: V3(c.x, this.player.position.y + 0.6, c.z), n: 30, colors: ['#ffe08a', '#ffffff'], speed: 2, up: 1.5, life: 0.9, size: 0.1, shape: 0 });
      this.g.give(c.item, c.n, c.gold);
      return;
    }
    if (o.kind === 'sign') { await this.g.runScript(async (Sx) => { await Sx.say(null, o.it.text); }); return; }
    if (o.kind === 'camp') { await this.g.camp(o.it); return; }
    if (o.kind === 'door' && typeof o.it.on === 'function') { this.g.sound.sfx('door'); await this.g.runScript(async (Sx) => o.it.on(Sx, S.flags)); return; }
    if (o.kind === 'fish') { await this.g.fishing(this, o.it); return; }
    if (o.it?.run) { await this.g.runScript(async (Sx) => o.it.run(Sx, S.flags, this)); return; }
  }
  togglePhase() {
    const ph = this.world.phase === 'L' ? 'D' : 'L';
    this.world.setPhase(ph);
    (this.g.state.fieldPhase = this.g.state.fieldPhase || {})[this.id] = ph;
    this.g.sound.sfx('lamp');
    this.g.ui.setLocation(this.def.name, ph);
    this.fx.billboard(this.fx.tex.ring, this.player.position.clone().add(V3(0, 0.1, 0)), { w: 1, life: 0.7, grow: 14, color: ph === 'L' ? '#ffd27a' : '#9a8aff', flat: true });
    this.fx.emit({ pos: this.player.position.clone().add(V3(0, 1.2, 0)), n: 30, colors: ph === 'L' ? ['#fff2c0', '#ffd27a'] : ['#c8b8ff', '#7a5aff'], speed: 3, life: 0.8, size: 0.12, jitter: 0.5 });
    this.g.ui.flash(ph === 'L' ? '#ffe0a0' : '#5a4aa0', 400, 0.35);
    // 若主角腳下的格子消失了，退回安全位置
    if (!this.world.walkable(this.player.position.x, this.player.position.z, null)) this.player.position.copy(this.lastSafe);
    this.applyFieldPhaseLight(ph);
    this.def.onPhase?.(this, ph);
  }
  applyFieldPhaseLight(ph) {
    const e = this.def.env;
    if (!e.phaseL) return;
    const src = ph === 'L' ? e.phaseL : e;
    this.hemi.color.set(src.hemi?.[0] || e.hemi[0]); this.hemi.groundColor.set(src.hemi?.[1] || e.hemi[1]); this.hemi.intensity = src.hemi?.[2] ?? e.hemi[2];
    this.pool.ambient.set(src.ambient || e.ambient);
    this.sun.color.set(src.dir?.color || e.dir.color); this.sun.intensity = src.dir?.i ?? e.dir.i;
  }
  // ---- 觸發 ----
  checkTriggers() {
    const P = this.player.position, S = this.g.state;
    const c = this.world.cell(Math.floor(P.x), Math.floor(P.z));
    if (c && !c.water) this.lastSafe.copy(P);
    for (const t of this.def.triggers || []) {
      if (t.flag && S.flags[t.flag]) continue;
      if (t.cond && !t.cond(S.flags)) continue;
      if (P.x >= t.x && P.x <= t.x + (t.w || 1) && P.z >= t.z && P.z <= t.z + (t.d || 1)) {
        if (this.firedTriggers.has(t) && !t.repeat) continue;
        this.firedTriggers.add(t);
        if (t.flag) S.flags[t.flag] = 1;
        this.path = null;
        this.g.runScript(async (Sx) => t.run(Sx, S.flags, this));
        return;
      }
    }
    for (const x of this.def.exits || []) {
      if (P.x >= x.x && P.x <= x.x + (x.w || 1) && P.z >= x.z && P.z <= x.z + (x.d || 1)) {
        if (x.cond && !x.cond(S.flags)) { if (x.block) { this.player.position.copy(this.lastSafe); this.g.runScript(async (Sx) => x.block(Sx, S.flags)); } continue; }
        this.g.goto(x.to, x.at, x.dir);
        return;
      }
    }
  }
  // ---- 點擊 ----
  onTap(tp) {
    let best = null, bd = 50;
    const cand = [];
    for (const n of this.npcs) cand.push({ p: n.position, h: 1.0, fn: () => this.goNear(n.position, 1.1, () => this.talk(n)) });
    for (const e of this.enemies) cand.push({ p: e.position, h: 0.7, fn: () => this.goNear(e.position, 0.6) });
    for (const it of this.world.interact) if (!(it.kind === 'chest' && it.open)) cand.push({ p: V3(it.x, this.world.groundY(it.x, it.z), it.z), h: 0.5, fn: () => this.goNear(V3(it.x, 0, it.z), Math.min(0.9, it.r * 0.7), () => this.use({ kind: it.kind, it })) });
    for (const s of this.def.spots || []) if (!s.cond || s.cond(this.g.state.flags)) cand.push({ p: V3(s.x + 0.5, this.world.groundY(s.x + 0.5, s.z + 0.5), s.z + 0.5), h: 0.5, fn: () => this.goNear(V3(s.x + 0.5, 0, s.z + 0.5), (s.r || 1.3) * 0.6, () => this.use({ kind: s.kind || 'examine', it: s })) });
    for (const c of cand) {
      const s = this.screen(c.p.clone().add(V3(0, c.h, 0)));
      const d = Math.hypot(s.x - tp.x, s.y - tp.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) { best.fn(); return; }
    // 地面
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2((tp.x / this.g.renderer.w) * 2 - 1, -(tp.y / this.g.renderer.h) * 2 + 1);
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObject(this.world.terrain, false);
    if (hits.length) { const p = hits[0].point; this.pathTo(p.x, p.z); this.fx.billboard(this.fx.tex.ring, V3(p.x, p.y + 0.05, p.z), { w: 0.5, life: 0.4, grow: 2, color: '#ffe8b0', flat: true }); }
  }
  goNear(pos, dist, then) {
    const P = this.player.position;
    if (Math.hypot(P.x - pos.x, P.z - pos.z) <= dist + 0.35) { then?.(); return; }
    const ok = this.pathTo(pos.x, pos.z, dist);
    if (ok) this.pathDone = then || null;
  }
  pathTo(tx, tz, stopDist = 0) {
    const W = this.world, P = this.player.position;
    const sx = Math.floor(P.x), sz = Math.floor(P.z);
    let gx = Math.floor(tx), gz = Math.floor(tz);
    const key = (x, z) => z * W.w + x;
    const okc = (x, z, fromH) => { const c = W.cell(x, z); return c && !c.water && !c.block && !c.solid && (!c.phase || c.phase === W.phase) && (fromH == null || Math.abs(c.h - fromH) <= 0.55); };
    // 目標格不能走：找附近能走的格
    if (!okc(gx, gz)) {
      let found = null, fd = 1e9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (okc(gx + dx, gz + dz)) { const d = Math.hypot(gx + dx + 0.5 - P.x, gz + dz + 0.5 - P.z) + Math.hypot(dx, dz) * 2; if (d < fd) { fd = d; found = [gx + dx, gz + dz]; } } }
      if (!found) return false; [gx, gz] = found;
    }
    const open = [[sx, sz]], came = new Map(), gs = new Map([[key(sx, sz), 0]]);
    const hf = (x, z) => Math.hypot(x - gx, z - gz);
    let iter = 0, done = null;
    const closed = new Set();
    while (open.length && iter++ < 2400) {
      open.sort((a, b) => (gs.get(key(...a)) + hf(...a)) - (gs.get(key(...b)) + hf(...b)));
      const cur = open.shift(); const ck = key(...cur);
      if (closed.has(ck)) continue; closed.add(ck);
      if ((cur[0] === gx && cur[1] === gz) || (stopDist && Math.hypot(cur[0] + 0.5 - tx, cur[1] + 0.5 - tz) <= stopDist)) { done = cur; break; }
      const ch = W.cell(...cur).h;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cur[0] + dx, nz = cur[1] + dz;
        if (!okc(nx, nz, ch)) continue;
        if (dx && dz && (!okc(cur[0] + dx, cur[1], ch) || !okc(cur[0], cur[1] + dz, ch))) continue;
        const ng = gs.get(ck) + (dx && dz ? 1.414 : 1);
        const nk = key(nx, nz);
        if (ng < (gs.get(nk) ?? 1e9)) { gs.set(nk, ng); came.set(nk, cur); open.push([nx, nz]); }
      }
    }
    if (!done) return false;
    const path = []; let c = done;
    while (c && !(c[0] === sx && c[1] === sz)) { path.unshift([c[0] + 0.5, c[1] + 0.5]); c = came.get(key(...c)); }
    if (!stopDist && path.length) path[path.length - 1] = [tx, tz];
    this.path = path.length ? path : null;
    return true;
  }
  // ---- 鏡頭 ----
  camParams() {
    const R = this.g.renderer, portrait = R.w < R.h;
    const z = this.zoom * (this.camOverride?.zoom || 1);
    return { dist: (portrait ? 15.8 : 15.0) * z, pitch: (portrait ? 46 : 38) * Math.PI / 180, fov: portrait ? 40 : 30 };
  }
  updateCamera(dt) {
    const R = this.g.renderer;
    if (this.camCustom) {
      const c = this.camera; c.aspect = R.w / R.h;
      const d = this.camCustom(c, dt, R, this.camT);
      c.updateProjectionMatrix();
      const P = R.post;
      P.focusDist = d; P.focusRange = 9; P.bloom = this.post.bloom * 1.15; P.threshold = this.post.threshold; P.vignette = 0.55; P.sat = this.post.sat; P.tilt = 0.2;
      P.lift.set(...this.post.lift); P.gain.set(...this.post.gain);
      this.fx.setScale(R.H, c.fov);
      return;
    }
    const { dist, pitch, fov } = this.camParams();
    const tgt = this.camOverride?.pos || this.player.position;
    this.camT.lerp(V3(tgt.x, tgt.y, tgt.z), Math.min(1, dt * (this.camOverride ? 2.2 : 5)));
    // 地圖邊界：鏡頭不要看太多空白
    const c = this.camera;
    c.fov = fov; c.aspect = R.w / R.h; c.updateProjectionMatrix();
    const shake = this.g.shake.t > 0 ? this.g.shake.a : 0;
    c.position.set(this.camT.x + (Math.random() - 0.5) * shake, this.camT.y + Math.sin(pitch) * dist + (Math.random() - 0.5) * shake, this.camT.z + Math.cos(pitch) * dist);
    c.lookAt(this.camT.x, this.camT.y + 0.6, this.camT.z);
    const P = this.g.renderer.post;
    P.focusDist = dist; P.focusRange = this.post.focusRange; P.bloom = this.post.bloom; P.threshold = this.post.threshold; P.vignette = this.post.vignette; P.sat = this.post.sat; P.tilt = this.post.tilt;
    P.lift.set(...this.post.lift); P.gain.set(...this.post.gain);
    this.fx.setScale(R.H, c.fov);
  }
  updateBeam(dt) {
    const B = this.beam;
    if (B.pillar) {
      B.g.visible = true;
      B.b1.material.uniforms.op.value = 0.82 + Math.sin(this.t * 2.2) * 0.08;
      B.spot.intensity = 0;
      if (this.world.water) this.world.water.material.uniforms.beamA.value = 0;
      if (Math.random() < dt * 14) this.fx.emit({ pos: V3(B.L.x + (Math.random() - 0.5) * 1.6, B.L.y + Math.random() * 6, B.L.z + (Math.random() - 0.5) * 1.6), n: 1, colors: ['#fff6d8', '#ffd890'], speed: 0.3, up: 3, gravity: -0.4, life: 2.2, size: 0.09, shape: 1 });
      return;
    }
    B.ang += dt * B.speed * (B.on ? 1 : 0);
    let k = B.on ? 1 : 0;
    if (B.flicker > 0) { B.flicker -= dt; k = Math.random() < 0.5 ? 0 : 1; }
    B.g.rotation.y = B.ang;
    B.g.visible = k > 0;
    const dir = V3(Math.sin(B.ang), -0.32, Math.cos(B.ang)).normalize();
    B.spot.target.position.copy(B.g.position).addScaledVector(dir, 30);
    B.spot.intensity = 900 * k;
    if (this.world.water) {
      const u = this.world.water.material.uniforms;
      u.beamA.value = k; u.beamDir.value.set(Math.sin(B.ang), Math.cos(B.ang)); u.beamOrigin.value.set(B.g.position.x, B.g.position.z);
    }
  }
  screen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.g.renderer.w, y: (-p.y * 0.5 + 0.5) * this.g.renderer.h };
  }
  updateLabels() { }
  actorById(id) {
    if (id === 'wei') return this.player;
    const f = this.followers.find((x) => x.memberId === id); if (f) return f;
    return this.npcs.find((n) => n.npc.id === id);
  }
  render() { this.g.renderer.render(this.scene, this.camera, this.t); }
  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
