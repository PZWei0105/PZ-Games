// 戰鬥畫面：3D 舞台、角色動作、特效、戰鬥介面
import * as THREE from 'three';
import { Battle } from './battle.js';
import { ENCOUNTERS, ENEMIES, SKILLS, ULTS, TYPES, ITEMS, CHARS, MOVES, expToNext, statsAt, WEAPONS, ACCESSORIES } from './data.js';
import { World } from '../engine/world.js';
import { LightPool, Actor } from '../engine/sprite3d.js';
import { FX } from '../engine/fx.js';
import { STAGES } from './maps.js';
import { h, chipT } from './ui.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const FXOF = { blade: 'slash', pierce: 'pierce', blunt: 'blunt', fire: 'fire', tide: 'tide', light: 'light', shadow: 'shadow' };
const SFXOF = { slash: 'slash', pierce: 'pierce', blunt: 'blunt', bite: 'blunt', fire: 'fire', tide: 'tide', light: 'light', shadow: 'shadow' };

// 站位與鏡頭（直拿：敵人在左上、我方在右下的斜線陣形）
const BL = {
  portrait: { ps: 0.9, es: 0.85, px: 1.15, pdx: 0.22, pz: 0.6, pdz: 1.7, ex: -1.7, edx: 0.0, edz: 2.2, ez: -1.9, ezig: 1.2, bx: -1.1, bz: -2.2, sbx: [-0.9, 1.5], sbz: [2.6, 1.2],
    cam: [0.2, 10.8, 13.4], look: [-0.05, 0.7, 0.9], fov: 46, maxH: 4.6 },
  land: { ps: 1, es: 1, px: 3.0, pdx: 0.55, pz: -1.9, pdz: 1.05, ex: -2.6, edx: 0.9, edz: 1.4, ez: -0.6, ezig: 0, bx: -3.0, bz: -1.2, sbx: [1.9, 1.5], sbz: [-1.2, 1.4],
    cam: [0.2, 5.0, 11.8], look: [0.1, 1.9, -0.6], fov: 32, maxH: 5.2 },
};

export class BattleScene {
  constructor(game, encId, opts = {}) {
    this.g = game; this.encId = encId; this.enc = ENCOUNTERS[encId]; this.opts = opts;
    const S = game.state;
    this.scene = new THREE.Scene();
    this.pool = new LightPool(this.scene);
    const st = STAGES[this.enc.stage] || STAGES.cape;
    this.stage = st;
    this.scene.background = new THREE.Color('#05070c');
    this.scene.fog = new THREE.Fog('#05070c', 16, 40);
    this.hemi = new THREE.HemisphereLight('#334', '#111', 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff', 1); this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.world = new World(st, this.pool);
    this.scene.add(this.world.group);
    this.fx = new FX(this.scene, 900);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 120);
    this.center = V3(st.center[0], st.center[1], st.center[2]);
    // 燈塔光束的掃光板
    this.sweep = new THREE.Mesh(new THREE.PlaneGeometry(4, 18), new THREE.MeshBasicMaterial({ map: this.fx.tex.pillar, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color('#ffe2a0'), opacity: 0, side: THREE.DoubleSide }));
    this.sweep.renderOrder = 7; this.scene.add(this.sweep);
    // 戰鬥資料
    const meal = S.meal ? { ...S.meal } : null;
    const party = S.party.map((m) => ({ id: m.id, lv: m.lv, hp: m.hp, weapon: m.weapon, star: S.weapons[m.weapon]?.star || 1, acc: m.acc, engr: (m.engr || []).filter(Boolean), ult: m.ult || 0 }));
    if (opts.guest) party.push({ id: opts.guest, lv: 12, weapon: 'staff1' });
    this.b = new Battle({ party, enemies: this.enc.enemies, phase: this.enc.phase || opts.phase || 'D', seed: (Date.now() & 0xffff) ^ 0x5a5a, noEscape: this.enc.noEscape, boss: this.enc.boss, meal, preempt: opts.preempt });
    this.actors = new Map();
    this.t = 0; this.camShake = 0; this.timeScale = 1;
    this.camBase = { pos: V3(), look: V3() }; this.camCur = { pos: V3(), look: V3() }; this.camFocus = null;
    for (const u of this.b.units) this.makeActor(u);
    this.layout(true);
    this.phaseLight(this.b.phase, true);
    this.auto = false;
    this.buildUI();
    // 舞台主光：讓角色在暗處也看得清楚
    const C0 = this.center;
    this.keyLights = [
      { pos: V3(C0.x + 2.2, C0.y + 3.2, C0.z + 3.6), color: new THREE.Color('#ffe4c4'), intensity: 11, range: 10, flicker: false, priority: 45, spriteBoost: 1.25 },
      { pos: V3(C0.x - 2.4, C0.y + 3.0, C0.z + 1.2), color: new THREE.Color('#cad8ff'), intensity: 9, range: 9, flicker: false, priority: 45, spriteBoost: 1.2 },
    ];
    this.pool.setSources(this.world.lightSources.concat(this.keyLights));
    this.setupShadow();
  }
  setupShadow() {
    const c = this.sun.shadow.camera; c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 80; c.updateProjectionMatrix();
    this.sun.target.position.copy(this.center);
    this.g.renderer.r.shadowMap.needsUpdate = true;
  }
  makeActor(u) {
    let a;
    if (u.side === 'party') {
      a = new Actor(this.g.sheet(u.id), this.pool, { scale: 1.25, shadowSize: 1.1 });
      a.setFrame('b_b_idle');
    } else {
      const E = ENEMIES[u.id];
      const sheet = this.g.monsterSheet(E.art);
      const sc = (E.size || 1) * (sheet.human ? 1.25 : 1);
      a = new Actor(sheet, this.pool, { scale: sc, baseline: sheet.human ? 3 : 2, shadowSize: E.big ? 3.4 : 1.5 * sc });
      a.isHuman = !!sheet.human; a.flip = a.isHuman;
      a.mat.uniforms.emissive.value = 1;
      a.big = !!E.big; a.fly = E.fly || 0;
      a.setFrame('idle0');
    }
    a.u = u; a.mesh.rotation.y = 0;
    a.baseScale = a.mesh.scale.x; a.baseShadow = a.shadow ? a.shadow.scale.x : 1;
    this.scene.add(a.group);
    this.actors.set(u.uid, a);
    return a;
  }
  layout(instant) {
    const R = this.g.renderer, portrait = R.w < R.h;
    const C = this.center;
    const T = Object.assign({}, portrait ? BL.portrait : BL.land, (typeof window !== 'undefined' && window.__bl) || {});
    const party = this.b.party, enemies = this.b.enemies.filter((e) => !e.ko || this.actors.get(e.uid)?.group.visible);
    const n = party.length;
    for (const a of this.actors.values()) {
      let k = a.u.side === 'party' ? T.ps : T.es;
      const hgt = (a.sheet.fh / 32) * a.baseScale * a.scaleY;
      if (a.u.side !== 'party' && hgt * k > T.maxH) k = T.maxH / hgt;
      a.mesh.scale.set(a.baseScale * k, a.baseScale * k * a.scaleY, 1);
      if (a.shadow) a.shadow.scale.set(a.baseShadow * k, a.baseShadow * k * 0.55, 1);
    }
    party.forEach((u, i) => {
      const a = this.actors.get(u.uid);
      const k = n > 3 ? 0.82 : 1;
      const p = V3(C.x + T.px + i * T.pdx * k, C.y, C.z + T.pz + i * T.pdz * k);
      a.home = p; if (instant) { a.position.copy(p); a.target = null; }
    });
    const big = enemies.find((e) => ENEMIES[e.id].big);
    const smalls = enemies.filter((e) => !ENEMIES[e.id].big);
    if (big) {
      const a = this.actors.get(big.uid);
      const p = V3(C.x + T.bx, C.y, C.z + T.bz);
      a.home = p; if (instant) { a.position.copy(p); a.target = null; }
    }
    smalls.forEach((u, i) => {
      const a = this.actors.get(u.uid);
      const m = smalls.length;
      let p;
      if (big) p = V3(C.x + T.bx + T.sbx[i % 2] + Math.floor(i / 2) * 0.6, C.y, C.z + T.bz + T.sbz[i % 2] + Math.floor(i / 2) * 1.2);
      else {
        const off = (i - (m - 1) / 2);
        p = V3(C.x + T.ex + off * T.edx + (i % 2) * T.ezig, C.y, C.z + T.ez + off * T.edz * (m > 3 ? 0.8 : 1));
      }
      a.home = p; if (instant) { a.position.copy(p); a.target = null; }
    });
    // 鏡頭
    this.camBase.pos.set(C.x + T.cam[0], C.y + T.cam[1], C.z + T.cam[2]);
    this.camBase.look.set(C.x + T.look[0], C.y + T.look[1], C.z + T.look[2]);
    this.fov = T.fov;
    if (instant) { this.camCur.pos.copy(this.camBase.pos); this.camCur.look.copy(this.camBase.look); }
  }
  // ---------- 光 ----------
  phaseLight(ph, instant) {
    const E = this.stage.env[ph];
    const tgt = {
      hemiSky: new THREE.Color(E.hemi[0]), hemiGr: new THREE.Color(E.hemi[1]), hemiI: E.hemi[2], dirC: new THREE.Color(E.dir.color), dirI: E.dir.i,
      amb: new THREE.Color(E.ambient), bg: new THREE.Color(E.bg), fog: new THREE.Color(E.fog?.[0] || E.bg),
      bloom: E.post?.bloom ?? 0.6, sat: E.post?.sat ?? 1, gain: E.post?.gain || [1, 1, 1], lift: E.post?.lift || [0.01, 0.01, 0.03],
    };
    this.sun.position.copy(this.center).add(V3(...E.dir.pos));
    if (instant) { this.lightCur = JSON.parse(JSON.stringify({ ...tgt, hemiSky: tgt.hemiSky.toArray(), hemiGr: tgt.hemiGr.toArray(), dirC: tgt.dirC.toArray(), amb: tgt.amb.toArray(), bg: tgt.bg.toArray(), fog: tgt.fog.toArray() })); }
    this.lightTgt = { ...tgt, hemiSky: tgt.hemiSky.toArray(), hemiGr: tgt.hemiGr.toArray(), dirC: tgt.dirC.toArray(), amb: tgt.amb.toArray(), bg: tgt.bg.toArray(), fog: tgt.fog.toArray() };
    if (instant) this.applyLight(1);
    // 場景的燈：明時燈籠暗一點
    for (const s of this.world.lightSources) s.mul = ph === 'L' ? (s.dayMul ?? 0.45) : 1;
    if (this.world.phaseMeshes) this.world.setPhase(ph);
  }
  applyLight(k) {
    const C = this.lightCur, T = this.lightTgt;
    const lerpA = (a, b) => a.map((v, i) => v + (b[i] - v) * k);
    for (const key of ['hemiSky', 'hemiGr', 'dirC', 'amb', 'bg', 'fog', 'gain', 'lift']) C[key] = lerpA(C[key], T[key]);
    for (const key of ['hemiI', 'dirI', 'bloom', 'sat']) C[key] += (T[key] - C[key]) * k;
    this.hemi.color.fromArray(C.hemiSky); this.hemi.groundColor.fromArray(C.hemiGr); this.hemi.intensity = C.hemiI;
    this.sun.color.fromArray(C.dirC); this.sun.intensity = C.dirI;
    this.pool.ambient.fromArray(C.amb);
    this.scene.background.fromArray(C.bg); this.scene.fog.color.fromArray(C.fog);
  }
  // ---------- 介面 ----------
  buildUI() {
    const R = this.g.ui.root;
    const B = h('div'); B.id = 'bui'; R.appendChild(B); this.ui = B;
    const top = h('div', 'topbar');
    this.dial = h('div', 'phasedial', '<div class="pz"></div><div class="pc"></div>');
    top.appendChild(this.dial);
    this.tl = h('div', 'timeline panel', '<div class="row cur"><span class="lbl">本輪</span></div><div class="row next"><span class="lbl">下輪</span></div>');
    top.appendChild(this.tl);
    B.appendChild(top);
    this.labels = new Map();
    for (const u of this.b.enemies) this.makeLabel(u);
    const party = h('div', 'party'); B.appendChild(party); this.partyEl = party;
    this.cards = new Map();
    for (const u of this.b.party) {
      const c = h('div', 'pcard panel');
      c.innerHTML = `<div class="h"><span class="nm">${u.name}</span><span class="lvl">Lv${u.lv}</span><span class="ag aglow"></span><span class="hpn"></span></div><div class="bars"><div class="bar hpbar"><i></i></div><div style="display:flex;align-items:center;gap:6px"><div class="pips"></div><div class="bar ultbar" style="flex:1;height:4px"><i></i></div></div></div>`;
      party.appendChild(c); this.cards.set(u.uid, c);
    }
    this.msg = h('div'); this.msg.id = 'bmsg'; B.appendChild(this.msg);
    this.bb = h('div'); this.bb.id = 'bbanner'; B.appendChild(this.bb);
    this.cutin = h('div', '', '<div class="strip"></div><canvas></canvas><div class="who"></div><div class="nm"></div>'); this.cutin.id = 'cutin'; B.appendChild(this.cutin);
    this.dmgLayer = h('div'); this.dmgLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none'; B.appendChild(this.dmgLayer);
    this.refresh();
  }
  makeLabel(u) {
    const L = h('div', 'elabel');
    L.innerHTML = `<div class="nm"></div><div class="row r1"></div><div class="row r2" style="opacity:.6;transform:scale(.85)"></div><div class="bar hpbar hp"><i></i></div><div class="row r3"></div>`;
    L.onclick = (e) => { e.stopPropagation(); if (this.pickTarget) this.pickTarget(u.uid); };
    this.ui.insertBefore(L, this.partyEl);
    this.labels.set(u.uid, L);
  }
  refresh() {
    const b = this.b;
    // 相位
    this.dial.className = 'phasedial ' + b.phase;
    this.dial.querySelector('.pz').textContent = b.phase === 'L' ? '明' : '暗';
    this.dial.querySelector('.pc').innerHTML = Array.from({ length: b.phaseLen }, (_, i) => `<i class="${i < b.counter ? 'on' : ''}"></i>`).join('');
    // 順序
    const icon = (uid) => { const u = b.byId(uid); if (!u || u.ko) return ''; return `<div class="tl ${u.side === 'party' ? 'p' : 'e'} ${u.broken >= b.round ? 'br' : ''}" data-uid="${uid}"></div>`; };
    const cur = this.tl.querySelector('.cur'), nx = this.tl.querySelector('.next');
    cur.innerHTML = '<span class="lbl">本輪</span>' + [this.curUid, ...b.order].filter((x) => x != null).map(icon).join('');
    nx.innerHTML = '<span class="lbl">下輪</span>' + b.nextOrder.map(icon).join('');
    this.tl.querySelectorAll('.tl').forEach((el) => { const a = this.actors.get(+el.dataset.uid); if (a) el.appendChild(this.iconOf(a)); });
    const first = cur.querySelector('.tl'); if (first && this.curUid != null) first.classList.add('cur');
    // 隊伍
    for (const u of b.party) {
      const c = this.cards.get(u.uid);
      c.classList.toggle('ko', u.ko); c.classList.toggle('cur', this.curUid === u.uid);
      c.querySelector('.hpn').textContent = `${u.hp}`;
      const hb = c.querySelector('.hpbar'); hb.querySelector('i').style.width = (u.hp / u.maxHp) * 100 + '%'; hb.classList.toggle('low', u.hp < u.maxHp * 0.3);
      c.querySelector('.pips').className = 'pips' + (b.phase === 'D' ? ' night' : '');
      c.querySelector('.pips').innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < u.lumen ? 'on' : ''}"></i>`).join('');
      c.querySelector('.ultbar i').style.width = u.ult + '%';
      c.querySelector('.ag').textContent = u.afterglow ? `餘暉+${Math.round(u.afterglow * 100)}%` : '';
    }
    // 敵人
    for (const u of b.enemies) {
      let L = this.labels.get(u.uid); if (!L) { this.makeLabel(u); L = this.labels.get(u.uid); }
      L.classList.toggle('dead', u.ko);
      L.querySelector('.nm').textContent = u.name;
      const r1 = L.querySelector('.r1');
      const ph = b.phase, other = ph === 'L' ? 'D' : 'L';
      const wk = (k) => u.weak[k].length ? u.weak[k].map((t) => u.revealed[k].has(t) ? chipT(t, 'wk') : '<span class="chip wk unk">？</span>').join('') : '<span class="chip wk none">無弱點</span>';
      r1.innerHTML = `<div class="shield ${u.broken >= b.round ? 'broken' : ''}">${u.broken >= b.round ? '✕' : u.guard}</div>${wk(ph)}`;
      const r2 = L.querySelector('.r2');
      const known = [...u.revealed[other]];
      r2.innerHTML = `<span class="chip" style="font-size:10px;color:${other === 'L' ? '#ffd27a' : '#b8c4ff'}">${other === 'L' ? '明' : '暗'}</span>` + (u.weak[other].length ? u.weak[other].map((t) => known.includes(t) ? chipT(t, 'wk') : '<span class="chip wk unk">？</span>').join('') : '<span class="chip wk none">無</span>');
      L.querySelector('.hp i').style.width = (u.hp / u.maxHp) * 100 + '%';
      const r3 = L.querySelector('.r3');
      r3.innerHTML = (u.broken >= b.round ? '<span class="st brk">失衡</span>' : '') + (u.charge ? `<span class="st chg">蓄力 ${MOVES[u.charge.move].name}・${u.charge.turns}</span>` : '');
    }
  }
  iconOf(a) {
    const key = a.u.side + a.u.id;
    this.icons = this.icons || {};
    if (!this.icons[key]) {
      const s = a.sheet, fr = s.index[a.u.side === 'party' ? 'side_idle0' : 'idle0'] ?? 0;
      const [u, v, du, dv] = s.frameRect(fr);
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 30;
      const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
      const sx = u * s.canvas.width, sy = (1 - v - dv) * s.canvas.height, sw = du * s.canvas.width, sh = dv * s.canvas.height;
      if (a.u.side === 'party' || a.isHuman) cx.drawImage(s.canvas, sx + sw * 0.22, sy + sh * 0.08, sw * 0.56, sh * 0.42, 0, 0, 30, 30);
      else { const m = Math.max(sw, sh); cx.drawImage(s.canvas, sx, sy, sw, sh, (30 - sw / m * 30) / 2, (30 - sh / m * 30) / 2, sw / m * 30, sh / m * 30); }
      this.icons[key] = cv;
    }
    const c = document.createElement('canvas'); c.width = 30; c.height = 30; c.getContext('2d').drawImage(this.icons[key], 0, 0);
    if (a.isHuman) { c.style.transform = 'scaleX(-1)'; }
    return c;
  }
  // ---------- 主流程 ----------
  wait(ms) { return new Promise((r) => setTimeout(r, ms / (this.g.settings.bspeed || 1) / (this.fast ? 1.6 : 1))); }
  async run() {
    const G = this.g;
    G.sound.sfx('encounter');
    G.sound.play(this.enc.bgm || 'battle');
    // 開場鏡頭
    this.camCur.pos.copy(this.camBase.pos).add(V3(0, 3, 6)); this.camCur.look.copy(this.camBase.look);
    await this.wait(700);
    for (const e of this.b.start()) await this.play(e);
    this.refresh();
    if (this.enc.tutorial === 1 && !G.state.tut.t1) { G.state.tut.t1 = 1; await G.ui.tutorial('這是<b>明暗</b>戰鬥。現在是<b style="color:#b8c4ff">暗</b>。<br>敵人頭上的盾牌數字是<b>架勢</b>。用牠怕的屬性打，就能削掉一格；削到 0，牠會<b>失衡</b>：下一次行動直接跳過，受到的傷害也大幅增加。<br>礁蟹在暗裡怕<b>刺</b>——試試魏子葳的「鉤連」。'); }
    if (this.enc.tutorial === 2 && !G.state.tut.t2) { G.state.tut.t2 = 1; await G.ui.tutorial('潮鬼在<b style="color:#b8c4ff">暗</b>裡<b>沒有弱點</b>。<br>用<b>轉燈</b>（花 2 點光）把戰場翻到<b style="color:#ffd27a">明</b>，再用光屬性的「照見」打牠。<br>翻轉的瞬間，身上每存 1 點光，下一擊就強 20%——這叫<b>餘暉</b>。'); }
    while (!this.b.over) {
      const { unit, ev } = this.b.next();
      this.curUid = unit?.uid;
      for (const e of ev) await this.play(e);
      this.refresh();
      if (!unit || this.b.over) break;
      await this.turnStartFx(unit);
      let cmd;
      if (unit.side === 'party') {
        if (this.b.counter === 1 && !G.state.tut.t3 && this.enc.tutorial) { G.state.tut.t3 = 1; await G.ui.tutorial('左上的<b>燈輪</b>只剩一格了。這一輪結束，光束會掃過戰場，<b style="color:#ffd27a">明</b>、<b style="color:#b8c4ff">暗</b>互換——敵人的弱點也會換一面。<br>想讓翻轉後的第一擊更痛，就把光存著。'); }
        if (unit.ult >= 100 && !G.state.tut.t4) { G.state.tut.t4 = 1; await G.ui.tutorial(`${unit.name}的<b>絕技</b>準備好了！打弱點、讓敵人失衡、受傷都會累積絕技槽。`); }
        cmd = this.auto ? this.b.autoCommand(unit) : await this.askCommand(unit);
      } else {
        await this.wait(260);
        cmd = this.b.enemyCommand(unit);
      }
      const ev2 = this.b.act(unit, cmd);
      for (const e of ev2) await this.play(e);
      await this.returnHome();
      this.refresh();
    }
    this.curUid = null; this.refresh();
    return await this.finish(this.b.over);
  }
  async turnStartFx(u) {
    const a = this.actors.get(u.uid);
    if (u.side === 'party') {
      a.target = a.home.clone().add(V3(-0.45, 0, 0));
      this.g.sound.sfx('tick');
    }
  }
  async returnHome() {
    for (const a of this.actors.values()) { a.target = a.home.clone(); a.pose = null; }
    await this.wait(140);
  }
  // ---------- 指令 ----------
  askCommand(u) {
    return new Promise((resolve) => {
      const b = this.b, a = this.actors.get(u.uid);
      const box = h('div', 'panel orn'); box.id = 'cmd';
      this.ui.appendChild(box);
      const done = (cmd) => { box.remove(); this.pickTarget = null; this.clearSel(); this.g.sound.sfx('ok'); resolve(cmd); };
      const hint = (t) => { box.querySelector('.hint').textContent = t || ''; };
      const main = () => {
        this.pickTarget = null; this.clearSel();
        box.innerHTML = `<div class="who">${u.name}<span class="hint"></span></div><div class="grid"></div>`;
        const g = box.querySelector('.grid');
        const btn = (label, fn, cls = '', off = false) => { const x = h('button', 'btn ' + cls, label); if (off) x.classList.add('off'); x.onclick = () => { this.g.sound.sfx('tick'); fn(); }; g.appendChild(x); return x; };
        const basic = u.skills.find((k) => SKILLS[k].basic);
        btn('攻擊', () => target(basic));
        btn('技能', skills);
        btn('守備', () => done({ type: 'defend' }));
        btn('道具', items);
        if (CHARS[u.id].lamp) btn('轉燈', () => done({ type: 'lamp' }), 'lamp', b.lampUsed || u.lumen < 2);
        if (u.ult >= 100) btn('絕技', () => { const U = ULTS[u.id]; if (U.target === 'enemies' || U.target === 'random' || U.target === 'allies') done({ type: 'ult' }); }, 'ult');
        btn(this.auto ? '手動' : '自動', () => { this.auto = !this.auto; if (this.auto) done(b.autoCommand(u)); else main(); });
        if (!b.noEscape) btn('逃跑', () => done({ type: 'flee' }));
        const tip = CHARS[u.id].lamp && !b.lampUsed && u.lumen >= 2 ? (b.enemies.some((e) => !e.ko && !e.weak[b.phase].length) ? '有敵人在這一面沒有弱點——轉燈翻面' : '') : '';
        hint(tip || (u.afterglow ? `餘暉 +${Math.round(u.afterglow * 100)}%：下一擊加成` : ''));
      };
      const skills = () => {
        box.innerHTML = `<div class="who">${u.name}・技能<span class="hint">光 ${u.lumen}／5</span></div><div class="list"></div>`;
        const L = box.querySelector('.list');
        const alive = b.alive('enemy');
        for (const k of u.skills) {
          const s = SKILLS[k]; if (s.basic) continue;
          const okPh = s.phase === 'A' || s.phase === b.phase, okCost = u.lumen >= s.cost;
          const ph = s.phase === 'L' ? '<span class="ph chip" style="color:#ffd27a">明</span>' : s.phase === 'D' ? '<span class="ph chip" style="color:#b8c4ff">暗</span>' : '';
          const wk = s.type && alive.some((e) => e.revealed[b.phase].has(s.type)) ? '<span class="wkhit">弱點</span>' : '';
          const x = h('button', 'btn skill' + (okPh && okCost ? '' : ' locked'), `${ph}${s.type ? chipT(s.type) : ''}<span class="nm">${s.name}</span>${wk}<span class="ds">${!okPh ? `要在「${s.phase === 'L' ? '明' : '暗'}」才能用` : s.desc || ''}</span><span class="cost">${'<i></i>'.repeat(s.cost)}</span>`);
          x.onclick = () => { if (!okPh || !okCost) { this.g.sound.sfx('back'); return; } this.g.sound.sfx('tick'); target(k); };
          L.appendChild(x);
        }
        const bk = h('button', 'btn', '返回'); bk.onclick = () => { this.g.sound.sfx('back'); main(); }; L.appendChild(bk);
      };
      const items = () => {
        box.innerHTML = `<div class="who">道具<span class="hint"></span></div><div class="list"></div>`;
        const L = box.querySelector('.list'), inv = this.g.state.inv;
        const keys = Object.keys(inv).filter((k) => inv[k] > 0 && ITEMS[k]?.battle);
        if (!keys.length) L.appendChild(h('div', 'tag', '沒有能在戰鬥中用的道具。'));
        for (const k of keys) {
          const it = ITEMS[k];
          const x = h('button', 'btn skill', `<span class="nm">${it.name}</span><span class="ds">${it.desc}</span><span class="tag">×${inv[k]}</span>`);
          x.onclick = () => { this.g.sound.sfx('tick'); pickAlly((uid) => done({ type: 'item', id: k, targets: [uid] }), !!it.use.revive); };
          L.appendChild(x);
        }
        const bk = h('button', 'btn', '返回'); bk.onclick = () => { this.g.sound.sfx('back'); main(); }; L.appendChild(bk);
      };
      const pickAlly = (fn, ko) => {
        box.innerHTML = `<div class="who">對誰使用？<span class="hint"></span></div><div class="list"></div>`;
        const L = box.querySelector('.list');
        for (const p of b.party) {
          if (!ko && p.ko) continue;
          const x = h('button', 'btn', `${p.name}　<span class="tag">${p.hp}/${p.maxHp}${p.ko ? '（倒下）' : ''}</span>`);
          x.onclick = () => fn(p.uid); L.appendChild(x);
        }
        const bk = h('button', 'btn', '返回'); bk.onclick = () => { this.g.sound.sfx('back'); main(); }; L.appendChild(bk);
      };
      const target = (k) => {
        const s = SKILLS[k];
        if (s.target !== 'enemy') { if (s.target === 'ally') { pickAlly((uid) => done({ type: 'skill', id: k, targets: [uid] })); return; } done({ type: 'skill', id: k }); return; }
        const alive = b.alive('enemy');
        if (alive.length === 1) { done({ type: 'skill', id: k, targets: [alive[0].uid] }); return; }
        box.innerHTML = `<div class="who">${s.basic ? '攻擊' : s.name}<span class="hint">點敵人或下面的名字</span></div><div class="list"></div>`;
        const L = box.querySelector('.list');
        for (const e of alive) {
          const weak = s.type && e.revealed[b.phase].has(s.type);
          const x = h('button', 'btn skill', `<span class="nm">${e.name}</span>${weak ? '<span class="wkhit">弱點</span>' : ''}<span class="ds">${e.broken >= b.round ? '失衡中' : '架勢 ' + e.guard}</span>`);
          x.onclick = () => done({ type: 'skill', id: k, targets: [e.uid] });
          L.appendChild(x);
          this.labels.get(e.uid)?.classList.add('sel');
        }
        this.pickTarget = (uid) => { const e = b.byId(uid); if (e && !e.ko && e.side === 'enemy') done({ type: 'skill', id: k, targets: [uid] }); };
        const bk = h('button', 'btn', '返回'); bk.onclick = () => { this.g.sound.sfx('back'); main(); }; L.appendChild(bk);
      };
      main();
    });
  }
  clearSel() { for (const L of this.labels.values()) L.classList.remove('sel'); }
  // ---------- 事件演出 ----------
  posOf(uid, dy = 0.9) { const a = this.actors.get(uid); const big = a.big ? 2.2 : a.u.side === 'enemy' ? 0.8 : 0; return a.position.clone().add(V3(0, dy + big + (a.fly || 0) * 0.5, 0.05)); }
  screen(v) { const p = v.clone().project(this.camera); return { x: (p.x * 0.5 + 0.5) * this.g.renderer.w, y: (-p.y * 0.5 + 0.5) * this.g.renderer.h }; }
  dmg(uid, text, cls = '', lbl = '') {
    const s = this.screen(this.posOf(uid, 1.3));
    const d = h('div', 'dmg ' + cls, (lbl ? `<span class="lbl">${lbl}</span>` : '') + text);
    d.style.left = s.x + (Math.random() - 0.5) * 30 + 'px'; d.style.top = s.y + 'px';
    this.dmgLayer.appendChild(d);
    const t0 = performance.now();
    const an = () => { const k = (performance.now() - t0) / 900; if (k >= 1) { d.remove(); return; } d.style.transform = `translate(-50%,${-50 - k * 70}%) scale(${k < 0.12 ? 0.6 + k * 4 : 1})`; d.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1; requestAnimationFrame(an); };
    an();
  }
  say(text, ms = 1100) {
    this.msg.innerHTML = `<span>${text}</span>`;
    clearTimeout(this.msgT); this.msgT = setTimeout(() => (this.msg.innerHTML = ''), ms);
  }
  async banner(text, color = '#ffe8b0', ms = 900) {
    this.bb.innerHTML = `<span class="bb" style="color:${color}">${text}</span>`;
    await this.wait(ms);
    this.bb.innerHTML = '';
  }
  shake(a = 0.25, t = 0.25) { if (!this.g.settings.shake) return; this.camShake = Math.max(this.camShake, a); this.shakeT = t; }
  async play(e) {
    const b = this.b, G = this.g;
    switch (e.t) {
      case 'round': this.refresh(); break;
      case 'act': {
        const a = this.actors.get(e.who); if (!a) break;
        const party = a.u.side === 'party';
        if (e.name && !(e.skill && SKILLS[e.skill]?.basic)) this.say(`${a.u.name}：${e.name}`);
        const melee = ['slash', 'pierce', 'blunt', 'bite'].includes(e.fx) && e.targets?.length === 1 && e.kind !== 'mag';
        if (party) {
          if (melee) {
            const t = this.actors.get(e.targets[0]);
            a.target = t.position.clone().lerp(a.home, 0.35).setZ(t.position.z + 0.15);
            a.pose = 'atk1'; await this.wait(170); a.pose = 'atk2';
          } else if (e.fx === 'lamp') {
            a.pose = 'cast'; G.sound.sfx('lamp'); await this.wait(250);
          } else { a.pose = 'cast'; this.fx.emit({ pos: a.position.clone().add(V3(0, 1, 0)), n: 18, colors: ['#ffffff', '#ffe8a0'], speed: 1.4, life: 0.5, size: 0.1, toward: a.position.clone().add(V3(0, 1, 0)), jitter: 1.4 }); await this.wait(260); }
        } else {
          if (melee || e.fx === 'slash' || e.fx === 'blunt') { a.target = a.home.clone().add(V3(a.big ? 0.8 : 1.6, 0, 0)); a.pose = 'atk'; await this.wait(150); }
          else { a.pose = 'cast'; await this.wait(260); }
          if (e.big) { this.shake(0.5, 0.5); G.ui.flash('#fff2c0', 300, 0.5); G.sound.sfx('boom'); }
        }
        if (e.fx && !['slash', 'pierce', 'blunt', 'bite', 'lamp'].includes(e.fx) && e.targets?.length && !party && ['heal', 'buff', 'guard', 'smoke'].includes(e.fx)) {
          for (const t of e.targets) this.fx.hitFx(e.fx, this.posOf(t, 0.8));
        }
        if (party && ['heal', 'buff', 'guard', 'smoke', 'item'].includes(e.fx)) { for (const t of e.targets || []) this.fx.hitFx(e.fx, this.posOf(t, 0.8)); G.sound.sfx(e.fx === 'heal' ? 'heal' : e.fx === 'item' ? 'heal' : 'buff'); await this.wait(300); }
        this.lastFx = e.fx; this.lastWho = e.who;
        break;
      }
      case 'hit': {
        const t = this.actors.get(e.target), a = this.actors.get(e.who);
        const kind = e.type ? FXOF[e.type] : this.lastFx || 'slash';
        const fxk = ['heal', 'buff', 'guard', 'smoke', 'item', 'lamp'].includes(kind) ? 'slash' : kind;
        this.fx.hitFx(fxk, this.posOf(e.target, 0.75), e.ult || e.weak);
        G.sound.sfx(SFXOF[fxk] || 'slash');
        if (e.weak) G.sound.sfx('weak');
        t.flashT = 0.12; t.pose = 'hurt'; t.kick = 0.25 * (t.u.side === 'party' ? 1 : -1);
        this.dmg(e.target, e.dmg, e.weak ? 'weak' : e.crit ? 'crit' : '', e.weak ? '弱點' : e.crit ? '會心' : '');
        if (e.weak || e.crit || e.ult) this.shake(e.ult ? 0.3 : 0.16, 0.15);
        if (t.u.side === 'party') { G.sound.sfx('hurt'); this.shake(0.12, 0.12); }
        this.refreshSoon();
        await this.wait(e.ult ? 190 : 230);
        if (t.pose === 'hurt') t.pose = null;
        break;
      }
      case 'miss': this.dmg(e.target, '閃開', 'small'); G.sound.sfx('miss'); await this.wait(250); break;
      case 'resist': break;
      case 'guard': { const L = this.labels.get(e.target); const sh = L?.querySelector('.shield'); if (sh) { sh.textContent = e.guard; sh.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 250 }); } break; }
      case 'break': {
        const t = this.actors.get(e.target);
        this.timeScale = 0.25;
        this.camFocus = { pos: t.position.clone(), k: 0.35 };
        this.fx.hitFx('break', this.posOf(e.target, 0.9));
        G.sound.sfx('break'); this.shake(0.45, 0.35);
        G.ui.flash('#ffffff', 200, 0.55);
        t.broken = true;
        await this.banner('破　勢', '#ffd27a', 700);
        this.timeScale = 1; this.camFocus = null;
        this.refresh();
        break;
      }
      case 'recover': { const t = this.actors.get(e.who); if (t) t.broken = false; this.say(`${t.u.name}重新站穩了架勢`); this.refresh(); await this.wait(350); break; }
      case 'cancel': { await this.banner('打斷！', '#9fe0ff', 650); G.sound.sfx('weak'); this.refresh(); break; }
      case 'reveal': { this.refresh(); G.sound.sfx('shine'); const L = this.labels.get(e.target); L?.animate([{ filter: 'brightness(2.4)' }, { filter: 'none' }], { duration: 500 }); this.rememberWeak(e.target, e.type, e.phase); await this.wait(180); break; }
      case 'heal': { if (!e.quiet) { this.fx.hitFx('heal', this.posOf(e.target, 0.8)); G.sound.sfx('heal'); } this.dmg(e.target, '+' + e.amt, 'heal'); this.refreshSoon(); await this.wait(e.quiet ? 60 : 220); break; }
      case 'buff': { const txt = Object.entries(e.buff).filter(([k]) => k !== 'turns').map(([k, v]) => ({ atk: '攻擊', def: '防禦', spd: '速度', eva: '閃避', mag: '術力', res: '術防' }[k] || k) + (v > 0 ? '↑' : '↓')).join(' '); this.dmg(e.target, txt, 'small heal'); this.fx.hitFx('buff', this.posOf(e.target, 0.6)); await this.wait(200); break; }
      case 'debuff': { const txt = Object.entries(e.buff).filter(([k]) => k !== 'turns').map(([k]) => ({ atk: '攻擊', def: '防禦', spd: '速度' }[k] || k) + '↓').join(' '); this.dmg(e.target, txt, 'small'); G.sound.sfx('debuff'); await this.wait(200); break; }
      case 'lumen': { this.refreshSoon(); if (e.drain) { const c = this.cards.get(e.who); c?.animate([{ filter: 'hue-rotate(200deg) brightness(.6)' }, { filter: 'none' }], { duration: 500 }); } break; }
      case 'ult': this.refreshSoon(); break;
      case 'afterglow': { const a = this.actors.get(e.who); this.fx.emit({ pos: a.position.clone().add(V3(0, 0.3, 0)), n: 20, colors: this.b.phase === 'L' ? ['#ffe08a', '#fff6d0'] : ['#c8b8ff', '#8a7aff'], speed: 0.6, up: 2, gravity: -1.5, life: 1, size: 0.12, jitter: 0.7 }); this.dmg(e.who, `餘暉 +${Math.round(e.v * 100)}%`, 'small'); break; }
      case 'phase': await this.phaseFx(e); break;
      case 'charge': { const a = this.actors.get(e.who); a.pose = 'cast'; a.charging = true; G.sound.sfx('charge'); this.shake(0.15, 0.6); if (e.text) this.say(e.text, 2400); await this.banner(`蓄力：${e.name}`, '#ffcc66', 900); this.refresh(); break; }
      case 'charging': { const a = this.actors.get(e.who); a.charging = true; this.say(`${a.u.name}還在蓄力……再 ${e.turns} 次行動就會放出來`, 1500); this.refresh(); await this.wait(500); break; }
      case 'unleash': { const a = this.actors.get(e.who); a.charging = false; G.ui.flash('#fff6d0', 300, 0.7); G.sound.sfx('boom'); this.shake(0.6, 0.5); await this.banner(MOVES[e.move].name, '#ff9a6a', 700); break; }
      case 'ko': {
        const t = this.actors.get(e.target);
        if (t.u.side === 'enemy') { this.fx.hitFx('ko', this.posOf(e.target, 0.8)); G.sound.sfx('ko'); t.dying = 0.001; this.labels.get(e.target)?.classList.add('dead'); }
        else { t.down = true; G.sound.sfx('ko'); this.say(`${t.u.name}倒下了！`, 1400); }
        this.refreshSoon(); await this.wait(350); break;
      }
      case 'revive': { const t = this.actors.get(e.target); t.down = false; this.fx.hitFx('heal', this.posOf(e.target, 0.8)); this.say(`${t.u.name}醒過來了`); break; }
      case 'skip': { const a = this.actors.get(e.who); this.say(`${a.u.name}失衡中，無法行動`, 900); await this.wait(420); break; }
      case 'summon': { const u = this.b.byId(e.unit); const a = this.makeActor(u); this.makeLabel(u); this.layout(false); a.position.copy(a.home).add(V3(0, 3, 0)); a.target = a.home.clone(); this.fx.hitFx('light', a.home.clone().add(V3(0, 1, 0))); await this.wait(500); this.refresh(); break; }
      case 'steal': { G.sound.sfx('steal'); const it = ITEMS[e.item] || ACCESSORIES[e.item] || WEAPONS[e.item]; this.dmg(e.target, `偷到 ${it?.name || e.item}`, 'small heal'); await this.wait(400); break; }
      case 'ultStart': await this.ultFx(e); break;
      case 'defend': { const a = this.actors.get(e.who); a.pose = 'guard'; this.fx.hitFx('guard', this.posOf(e.who, 0.8)); G.sound.sfx('buff'); await this.wait(300); break; }
      case 'useItem': { const inv = G.state.inv; if (inv[e.id] > 0) inv[e.id]--; break; }
      case 'text': this.say(e.text, 1600); await this.wait(500); break;
      case 'flee': if (e.ok) { G.sound.sfx('miss'); this.say('逃走了！'); await this.wait(600); } else { this.say(e.text || '沒逃掉'); await this.wait(600); } break;
      case 'end': break;
    }
  }
  refreshSoon() { clearTimeout(this.rft); this.rft = setTimeout(() => this.refresh(), 30); }
  rememberWeak(uid, type, phase) {
    const u = this.b.byId(uid), S = this.g.state;
    const r = (S.bestiary[u.id] = S.bestiary[u.id] || { L: [], D: [], n: 0 });
    if (!r[phase].includes(type)) r[phase].push(type);
  }
  async phaseFx(e) {
    const G = this.g, to = e.to;
    G.sound.sfx('phase');
    // 光束掃過舞台
    const C = this.center;
    const from = V3(C.x + 9, C.y + 4, C.z), toP = V3(C.x - 9, C.y + 4, C.z);
    this.sweep.material.opacity = 0.0;
    this.sweep.material.color.set(to === 'L' ? '#ffe2a0' : '#9a8aff');
    this.sweep.rotation.set(0, 0, 0.35);
    const t0 = performance.now(), dur = 900 / (G.settings.bspeed || 1);
    await new Promise((res) => {
      const an = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        this.sweep.position.lerpVectors(from, toP, k);
        this.sweep.material.opacity = Math.sin(k * Math.PI) * 0.85;
        this.sweep.quaternion.copy(this.camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), 0.35));
        if (k > 0.45 && !this.flipped) { this.flipped = true; this.phaseLight(to); G.ui.flash(to === 'L' ? '#fff0c0' : '#6a5ab0', 380, 0.45); }
        if (k < 1) requestAnimationFrame(an); else res();
      };
      this.flipped = false; an();
    });
    this.sweep.material.opacity = 0;
    const by = { lamp: '魏子葳轉動了燈', cycle: '燈塔的光掃過戰場', enemy: '', ult: '' }[e.by] || '';
    if (by) this.say(by, 1400);
    this.refresh();
    await this.banner(to === 'L' ? '明' : '暗', to === 'L' ? '#ffd27a' : '#b8c4ff', 700);
  }
  async ultFx(e) {
    const G = this.g, a = this.actors.get(e.who);
    G.sound.sfx('ult');
    const cv = this.cutin.querySelector('canvas');
    const s = a.sheet, fr = s.index['b_cast'] ?? s.index['b_b_idle'];
    const [u, v, du, dv] = s.frameRect(fr);
    cv.width = s.fw * 4; cv.height = s.fh * 4;
    const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
    cx.drawImage(s.canvas, u * s.canvas.width, (1 - v - dv) * s.canvas.height, s.fw, s.fh, 0, 0, cv.width, cv.height);
    this.cutin.querySelector('.nm').textContent = e.name;
    this.cutin.querySelector('.who').textContent = a.u.name;
    this.cutin.classList.add('on');
    this.cutin.animate([{ transform: 'translateX(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    this.camFocus = { pos: a.position.clone(), k: 0.5 };
    this.dim = 0.55;
    a.pose = 'cast';
    this.fx.emit({ pos: a.position.clone().add(V3(0, 1, 0)), n: 60, colors: ['#ffffff', '#ffd27a', '#ffb040'], speed: 3, life: 0.9, size: 0.14, toward: a.position.clone().add(V3(0, 1, 0)), jitter: 3 });
    await this.wait(1100);
    this.cutin.classList.remove('on');
    this.camFocus = null; this.dim = 0;
    G.ui.flash('#ffffff', 300, 0.7);
    this.shake(0.4, 0.4);
  }
  // ---------- 結束 ----------
  async finish(result) {
    const G = this.g, S = G.state;
    if (result === 'win') {
      G.sound.play('victory');
      for (const u of this.b.party) if (!u.ko) this.actors.get(u.uid).pose = 'win';
      await this.wait(700);
      // 寫回
      for (const r of this.b.results()) { const m = S.party.find((p) => p.id === r.id); if (m) { m.hp = Math.max(1, r.hp); m.ult = r.ult; } }
      for (const e of this.b.enemies) { const rec = (S.bestiary[e.id] = S.bestiary[e.id] || { L: [], D: [], n: 0 }); if (e.ko) rec.n = (rec.n || 0) + 1; if (!e.weak.L.length) rec.seenL = 1; if (!e.weak.D.length) rec.seenD = 1; }
      const loot = this.b.loot;
      const exp = loot.exp;
      const lvUps = [];
      for (const m of S.party) {
        const before = m.lv;
        m.exp += exp;
        while (m.exp >= expToNext(m.lv) && m.lv < 40) { m.exp -= expToNext(m.lv); m.lv++; }
        if (m.lv > before) {
          const s0 = statsAt(m.id, before), s1 = statsAt(m.id, m.lv);
          m.hp = Math.min(G.maxHp(m), m.hp + (s1.hp - s0.hp));
          const learned = CHARS[m.id].skills.filter(([k, l]) => l > before && l <= m.lv).map(([k]) => SKILLS[k].name);
          lvUps.push({ m, before, s0, s1, learned });
        }
      }
      S.gold += loot.gold;
      const items = [...loot.items, ...this.b.stolen];
      for (const it of items) G.addItem(it, 1, true);
      if (S.meal) { S.meal.n--; if (S.meal.n <= 0) S.meal = null; }
      await this.resultBox(exp, loot.gold, items, lvUps);
      return 'win';
    }
    if (result === 'flee') {
      for (const r of this.b.results()) { const m = S.party.find((p) => p.id === r.id); if (m) { m.hp = Math.max(1, r.hp); m.ult = r.ult; } }
      return 'flee';
    }
    // 輸了
    G.sound.play('gameover');
    const i = await this.loseBox();
    return i === 0 ? 'retry' : 'load';
  }
  resultBox(exp, gold, items, lvUps) {
    return new Promise((res) => {
      const G = this.g;
      const box = h('div'); box.id = 'result';
      const names = items.map((k) => (ITEMS[k] || WEAPONS[k] || ACCESSORIES[k])?.name || k);
      let html = `<div class="box panel orn"><h2>勝　利</h2><div class="mrow"><div class="grow">經驗</div><span class="gold">+${exp}</span></div><div class="mrow"><div class="grow">銀貝</div><span class="gold">+${gold}</span></div>`;
      if (names.length) html += `<div class="mrow"><div class="grow">得到</div><span style="text-align:right">${names.join('、')}</span></div>`;
      for (const L of lvUps) html += `<div class="mrow" style="flex-direction:column;align-items:stretch"><div><b style="color:var(--gold2)">${CHARS[L.m.id].name}</b> 升到 Lv ${L.m.lv}！</div><div class="t2" style="font-size:12px;color:var(--muted);margin-top:4px">體力 ${L.s0.hp}→${L.s1.hp}　攻擊 ${L.s0.atk}→${L.s1.atk}　術力 ${L.s0.mag}→${L.s1.mag}</div>${L.learned.length ? `<div style="margin-top:4px;color:#9fe4b0">學會了：${L.learned.join('、')}</div>` : ''}</div>`;
      html += `<button class="btn gold" style="width:100%;margin-top:12px">繼續</button></div>`;
      box.innerHTML = html;
      if (lvUps.length) setTimeout(() => G.sound.sfx('levelup'), 400);
      box.querySelector('button').onclick = () => { G.sound.sfx('ok'); box.remove(); res(); };
      this.ui.appendChild(box);
    });
  }
  loseBox() {
    return new Promise((res) => {
      const box = h('div'); box.id = 'result';
      box.innerHTML = `<div class="box panel orn"><h2 style="color:#ff9a8a">全軍覆沒</h2><div class="tag" style="text-align:center;line-height:1.8">燈火熄了……但還不是結局。</div><button class="btn gold" style="width:100%;margin-top:14px">再戰一次（體力回滿）</button><button class="btn" style="width:100%;margin-top:8px">讀取存檔</button></div>`;
      const [b1, b2] = box.querySelectorAll('button');
      b1.onclick = () => { box.remove(); res(0); }; b2.onclick = () => { box.remove(); res(1); };
      this.ui.appendChild(box);
    });
  }
  // ---------- 每格 ----------
  update(dt) {
    const sdt = dt * this.timeScale;
    this.t += sdt;
    if (this.lightTgt) this.applyLight(Math.min(1, dt * 2.6));
    for (const a of this.actors.values()) {
      const u = a.u;
      if (a.target) a.position.lerp(a.target, Math.min(1, dt * 12));
      a.mesh.rotation.y = 0;
      // 影格
      let f;
      if (u.side === 'party') {
        const P = { atk1: 'b_atk1', atk2: 'b_atk2', cast: 'b_cast', hurt: 'b_hurt', guard: 'b_guard', win: 'b_win' };
        f = a.pose ? P[a.pose] : (u.hp < u.maxHp * 0.25 ? 'b_hurt' : (Math.floor(this.t * 2) % 2 ? 'b_b_idle1' : 'b_b_idle'));
        a.flip = false;
      } else {
        const P = { atk1: a.isHuman ? 'atk1' : 'idle0', atk2: 'atk', atk: 'atk', cast: 'cast', hurt: 'hurt' };
        f = a.pose ? P[a.pose] : a.charging ? (Math.floor(this.t * 6) % 2 ? 'cast' : 'idle0') : `idle${Math.floor(this.t * 2.2 + u.uid) % 2}`;
        a.flip = a.isHuman;
      }
      a.setFrame(f);
      // 受擊閃白、晃動
      const U = a.mat.uniforms;
      if (a.flashT > 0) { a.flashT -= dt; U.flash.value.set(1, 1, 1, Math.min(1, a.flashT * 9)); } else U.flash.value.w = 0;
      if (a.kick) { a.mesh.position.x = a.kick * Math.sin(this.t * 60) ; a.kick *= Math.pow(0.002, dt); if (Math.abs(a.kick) < 0.01) { a.kick = 0; a.mesh.position.x = 0; } }
      a.mesh.position.y = (a.fly || 0) * 0.5 + (a.fly ? Math.sin(this.t * 2.4 + u.uid) * 0.12 : 0);
      if (a.broken && u.side === 'enemy' && !u.ko) { a.mesh.rotation.z = -0.18; U.tint.value.setRGB(0.75, 0.7, 0.85); } else { a.mesh.rotation.z = 0; U.tint.value.setRGB(1, 1, 1); }
      if (a.down) { a.mesh.rotation.z = Math.PI / 2 * 0.92; a.mesh.position.y = 0.25; U.tint.value.setRGB(0.6, 0.6, 0.7); }
      if (a.dying != null) { a.dying += dt * 1.6; U.opacity.value = Math.max(0, 1 - a.dying); a.mat.transparent = true; U.flash.value.set(1, 0.9, 0.8, Math.min(0.8, a.dying)); if (a.dying >= 1) { a.group.visible = false; } }
      if (this.dim && a.u.uid !== this.lastWho) U.tint.value.multiplyScalar(0.55);
    }
    // 鏡頭
    const R = this.g.renderer;
    this.layoutCheck();
    let tp = this.camBase.pos.clone(), tl = this.camBase.look.clone();
    if (this.camFocus) { tp.lerp(this.camFocus.pos.clone().add(V3(0, 3, 6)), this.camFocus.k); tl.lerp(this.camFocus.pos.clone().add(V3(0, 1, 0)), this.camFocus.k); }
    this.camCur.pos.lerp(tp, Math.min(1, dt * 3.2)); this.camCur.look.lerp(tl, Math.min(1, dt * 3.2));
    const c = this.camera; c.fov = this.fov; c.aspect = R.w / R.h; c.updateProjectionMatrix();
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; sx = (Math.random() - 0.5) * this.camShake; sy = (Math.random() - 0.5) * this.camShake; } else this.camShake = 0;
    c.position.copy(this.camCur.pos).add(V3(sx, sy, 0));
    c.lookAt(this.camCur.look);
    const P = R.post;
    P.focusDist = this.camCur.pos.distanceTo(this.camCur.look); P.focusRange = 4.5; P.bloom = this.lightCur?.bloom ?? 0.6; P.threshold = 0.82; P.vignette = 0.5 + (this.dim || 0) * 0.5; P.sat = this.lightCur?.sat ?? 1; P.tilt = 0.25;
    if (this.lightCur) { P.gain.set(...this.lightCur.gain); P.lift.set(...this.lightCur.lift); }
    this.world.update(dt, this.t);
    this.pool.update(this.center, this.t);
    this.fx.setScale(R.H, this.camera.fov);
    this.fx.update(sdt, c);
    // 敵人標籤位置
    for (const [uid, L] of this.labels) {
      const a = this.actors.get(uid); if (!a || !a.group.visible) continue;
      const top = a.position.clone().add(V3(0, (a.sheet.fh / 32) * a.mesh.scale.y * 0.86 + (a.fly || 0) * 0.5, 0));
      const s = this.screen(top);
      L.style.left = s.x + 'px'; L.style.top = Math.max(R.w < R.h ? 96 : 64, s.y) + 'px';
    }
  }
  layoutCheck() {
    const R = this.g.renderer, p = R.w < R.h;
    if (p !== this.wasPortrait) { this.wasPortrait = p; this.layout(false); for (const a of this.actors.values()) a.target = a.home.clone(); }
  }
  render() { this.g.renderer.render(this.scene, this.camera, this.t); }
  dispose() { this.ui.remove(); }
}
