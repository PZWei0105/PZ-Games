// 夥伴：坐在機台操作台上的一隻公仔。夾到會歡呼、差一點會垂頭喪氣、可以點牠。只改氣氛，不影響爪力與機率。
import * as THREE from 'three';
import { buildFigure, disposeFigure } from './figures.js';
import { CHAR, parseKey, buddyLines, starOf } from './data.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DESK = [0.305, -0.064, 0.53];

// 店裡的畫面比較重：把果凍、玻璃的「穿透」換成便宜的做法（看起來差不多）
export function cheapen(fig) {
  fig.g.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!(m.transmission > 0)) continue;
      const glassy = m.transmission >= 0.9;
      m.transmission = 0;
      if (glassy) { m.transparent = true; m.opacity = 0.28; m.depthWrite = false; }
      else { m.roughness = Math.max(m.roughness, 0.14); m.emissiveIntensity *= 1.4; }
      m.needsUpdate = true;
    }
  });
}

export class Buddy {
  constructor(game) {
    this.g = game;
    this.holder = new THREE.Group();
    this.pose = new THREE.Group(); this.holder.add(this.pose);
    this.fig = null; this.key = null; this.cid = null;
    this.mood = null; this.moodT = 0;
    this.idleT = 40 + Math.random() * 30;
    this.yaw = 0;
    this.v = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    // 陰影圓
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2 + 0.12; sh.position.y = 0.004; this.holder.add(sh); this.shadow = sh;
  }
  set(key) {
    if (this.fig) { this.pose.remove(this.fig.g); disposeFigure(this.fig); this.fig = null; }
    const k = key && parseKey(key);
    this.key = k ? key : null; this.cid = k ? k.cid : null;
    this.holder.visible = !!k;
    if (!k) { this.hideBubble(); return; }
    this.fig = buildFigure(k.cid, k.v);
    cheapen(this.fig);
    this.fig.g.scale.setScalar(1.55);
    this.pose.add(this.fig.g);
  }
  attach(view) {
    view.group.add(this.holder);
    this.holder.position.set(...DESK);
    this.view = view;
  }
  star() { return starOf(this.g.P.ch[this.cid]?.got || 0); }
  react(kind, force) {
    if (!this.fig) return;
    if (!force && this.mood === 'win' && kind !== 'win') return;
    this.mood = kind; this.moodT = 0;
    const L = buddyLines(CHAR[this.cid]);
    this.say(pick(L[kind === 'hello' ? 'tap' : kind] || L.tap));
    const s = this.g.snd;
    if (kind === 'win') setTimeout(() => s.cheer(), 120);
    else if (kind === 'near') setTimeout(() => s.aww(), 250);
    else if (kind === 'tap') s.squeak();
  }
  // ---------------- 台詞泡泡 ----------------
  bubbleEl() {
    if (this.el) return this.el;
    const el = document.createElement('div'); el.className = 'bub hide'; el.innerHTML = '<span></span>';
    document.getElementById('ui').appendChild(el);
    this.el = el; return el;
  }
  say(text, ms = 2400) {
    const el = this.bubbleEl();
    el.querySelector('span').textContent = text;
    el.classList.remove('hide', 'pop'); void el.offsetWidth; el.classList.add('pop');
    this.bubbleUntil = performance.now() + ms;
  }
  hideBubble() { if (this.el) this.el.classList.add('hide'); this.bubbleUntil = 0; }
  placeBubble() {
    if (!this.el || !this.bubbleUntil) return;
    if (performance.now() > this.bubbleUntil || this.g.mode !== 'shop' || !this.view?.group.visible) { this.hideBubble(); return; }
    this.holder.updateWorldMatrix(true, false);
    this.v.set(0, 0.2, 0).applyMatrix4(this.holder.matrixWorld).project(this.g.camera);
    const R = this.g.R, x = ((this.v.x + 1) / 2) * R.w, y = ((1 - this.v.y) / 2) * R.h;
    const w = this.el.offsetWidth || 120;
    this.el.style.transform = `translate(${Math.max(8, Math.min(R.w - w - 8, x - w * 0.72))}px, ${Math.max(60, y - 52)}px)`;
  }
  // 點到夥伴了嗎（螢幕座標）
  hit(x, y) {
    if (!this.fig || !this.holder.visible || !this.view?.group.visible) return false;
    const R = this.g.R;
    this.ray.setFromCamera({ x: (x / R.w) * 2 - 1, y: -(y / R.h) * 2 + 1 }, this.g.camera);
    return this.ray.intersectObject(this.fig.g, true).length > 0;
  }
  update(dt, t) {
    if (!this.fig) return;
    this.moodT += dt;
    const k = this.moodT, m = this.mood;
    let y = 0, rx = 0, ry = 0, rz = 0, sq = 1, act = false;
    if (m === 'win') {
      if (k < 2.6) { const f = Math.max(0, 1 - k / 2.6); y = Math.abs(Math.sin(k * 7.5)) * 0.028 * f; ry = k < 0.7 ? (k / 0.7) * Math.PI * 2 : 0; act = true; } else this.mood = null;
    } else if (m === 'near') {
      if (k < 2.3) { const e = Math.min(1, k / 0.25) * (k > 1.9 ? (2.3 - k) / 0.4 : 1); rx = 0.48 * e; rz = Math.sin(k * 24) * 0.07 * e; sq = 1 - 0.07 * e; } else this.mood = null;
    } else if (m === 'power') {
      if (k < 1.5) { y = Math.abs(Math.sin(k * 9)) * 0.014; act = true; } else this.mood = null;
    } else if (m === 'tap' || m === 'hello') {
      if (k < 0.9) { const b = Math.sin(Math.min(1, k / 0.45) * Math.PI); y = b * 0.022; sq = 1 + b * 0.06; } else this.mood = null;
    }
    // 夾取中：身體轉向爪子
    const T = this.g.turn;
    const want = T && T.sim._hp ? Math.max(-0.7, Math.min(0.7, (T.sim._hp.x - DESK[0]) * 1.4)) : 0;
    this.yaw += (want - this.yaw) * Math.min(1, dt * 3);
    this.pose.position.y = y;
    this.pose.rotation.set(rx, ry + this.yaw, rz);
    this.pose.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    if (act && this.star() >= 2 && this.fig.act) this.fig.act(t); else this.fig.tick?.(t);
    this.placeBubble();
    // 沒事做的時候偶爾說句話
    if (!T && this.g.mode === 'shop') {
      this.idleT -= dt;
      if (this.idleT <= 0) { this.idleT = 45 + Math.random() * 40; if (!this.mood) { this.mood = 'hello'; this.moodT = 0; this.say(pick(buddyLines(CHAR[this.cid]).tap)); } }
    }
  }
}
