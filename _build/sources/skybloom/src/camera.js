// 鏡頭：拖曳旋轉、兩指縮放／平移、滑鼠滾輪；點一下＝放煙火、按住＝連發；電影運鏡
import * as THREE from 'three';
import { clamp, lerp, smooth } from './util.js';

export const HOME = { target: new THREE.Vector3(0, 44, -82), yaw: 0.16, pitch: 0.12, dist: 190 };

// 電影運鏡：每一鏡 [起點, 看向, 終點, 看向, 秒數]
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = [
  [V(0, 7, 168), V(0, 22, 40), V(0, 10, 82), V(0, 40, -80), 11],
  [V(-18, 20, 6), V(-62, 30, -22), V(-100, 34, 6), V(-58, 28, -26), 11],
  [V(46, 3.2, -54), V(0, 70, -180), V(-46, 3.2, -56), V(0, 78, -180), 11],
  [V(40, 34, 110), V(105, 14, 20), V(165, 46, 40), V(100, 10, -10), 10],
  [V(150, 120, 180), V(0, 25, -30), V(-130, 110, 170), V(0, 25, -30), 13],
  [V(-6, 4.5, 66), V(-26, 5, 48), V(-44, 8, 70), V(-26, 5, 48), 9],
  [V(9, 2.4, 36), V(0, 45, -150), V(-9, 3.2, 32), V(0, 55, -160), 10],
  [V(-60, 14, -70), V(0, 50, -156), V(60, 14, -70), V(0, 50, -156), 12],
  [V(-150, 26, -60), V(-108, 40, 8), V(-140, 70, 50), V(-108, 30, 8), 10],
];

export class Rig {
  constructor(cam, dom) {
    this.cam = cam; this.dom = dom;
    this.target = HOME.target.clone(); this.yaw = HOME.yaw; this.pitch = HOME.pitch; this.dist = HOME.dist;
    this.vYaw = 0; this.vPitch = 0;
    this.ptr = new Map();
    this.enabled = true; this.mode = 'orbit'; // orbit | ride
    this.look = { yaw: 0, pitch: 0, spring: true };
    this.onTap = null; this.onHold = null; this.onHoldMove = null; this.onHoldEnd = null; this.onInput = null;
    this.idle = 0;
    this.goal = null;
    this.cinema = null;
    const el = dom;
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', (e) => this.up(e, true));
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.input(); if (this.mode === 'orbit') { this.cinema = null; this.goal = null; this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.0012), 18, 420); } }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  input() { this.idle = 0; this.onInput && this.onInput(); }
  down(e) {
    this.dom.setPointerCapture && this.dom.setPointerCapture(e.pointerId);
    this.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), btn: e.button, moved: false });
    this.input();
    if (this.ptr.size === 1) {
      const p = this.ptr.get(e.pointerId);
      clearTimeout(this.holdT);
      this.holding = false;
      this.holdT = setTimeout(() => { if (!p.moved && this.ptr.size === 1) { this.holding = true; this.onHold && this.onHold(p.x, p.y); } }, 380);
    } else { this.multi = true; clearTimeout(this.holdT); if (this.holding) { this.holding = false; this.onHoldEnd && this.onHoldEnd(); } }
    this.pinch = null;
  }
  move(e) {
    const p = this.ptr.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 9) p.moved = true;
    if (this.holding) { this.onHoldMove && this.onHoldMove(p.x, p.y); return; }
    if (!p.moved) return;
    clearTimeout(this.holdT);
    this.input();
    const H = this.dom.clientHeight || innerHeight;
    if (this.ptr.size === 1) {
      if (this.mode === 'ride') { this.look.yaw -= (dx / H) * 2.4; this.look.pitch = clamp(this.look.pitch - (dy / H) * 2.0, -1.2, 1.2); return; }
      this.cinema = null; this.goal = null;
      if (p.btn === 2 || e.shiftKey) this.pan(dx, dy);
      else { this.vYaw = (-dx / H) * 3.2; this.vPitch = (dy / H) * 2.4; this.minPitch = Math.min(this.minPitch ?? 0.02, this.pitch); this.yaw += this.vYaw; this.pitch = clamp(this.pitch + this.vPitch, Math.max(-0.3, Math.min(0.02, this.minPitch)), 1.35); if (this.pitch > 0.02) this.minPitch = 0.02; }
    } else if (this.ptr.size === 2 && this.mode === 'orbit') {
      this.cinema = null; this.goal = null;
      const [a, b] = [...this.ptr.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (this.pinch) { this.dist = clamp(this.dist * (this.pinch.d / Math.max(d, 1)), 18, 420); this.pan(cx - this.pinch.cx, cy - this.pinch.cy); }
      this.pinch = { d, cx, cy };
    }
  }
  pan(dx, dy) {
    const H = this.dom.clientHeight || innerHeight, k = (this.dist / H) * 1.1;
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)), f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.target.addScaledVector(r, -dx * k).addScaledVector(f, -dy * k);
    this.target.x = clamp(this.target.x, -220, 220); this.target.z = clamp(this.target.z, -240, 220);
  }
  up(e, cancel) {
    const p = this.ptr.get(e.pointerId); if (!p) return;
    this.ptr.delete(e.pointerId);
    clearTimeout(this.holdT);
    if (this.holding) { this.holding = false; this.onHoldEnd && this.onHoldEnd(); return; }
    if (!cancel && !p.moved && performance.now() - p.t0 < 380 && this.ptr.size === 0 && !this.multi) this.onTap && this.onTap(p.x, p.y);
    if (this.ptr.size === 0) { this.pinch = null; this.multi = false; }
  }
  // 平滑移到某個視角
  flyTo(target, yaw, pitch, dist) { this.goal = { target: target.clone(), yaw, pitch, dist }; this.cinema = null; }
  home() { this.flyTo(HOME.target, HOME.yaw, HOME.pitch, HOME.dist * this.aspectK()); }
  aspectK() { const a = (this.dom.clientWidth || innerWidth) / (this.dom.clientHeight || innerHeight); return a < 1 ? 1.25 : a > 1.9 ? 0.92 : 1; }
  startCinema(i) { this.cinema = { i: i ?? Math.floor(Math.random() * SHOTS.length), t: 0 }; this.goal = null; }
  // 運鏡換鏡頭時要淡出淡入：回傳 0~1 的黑幕
  update(dt) {
    this.idle += dt;
    const cam = this.cam;
    if (this.mode !== 'orbit') return 0;
    if (this.cinema) {
      const c = this.cinema, s = SHOTS[c.i];
      c.t += dt;
      if (c.t > s[4]) { c.i = (c.i + 1) % SHOTS.length; c.t = 0; }
      const S = SHOTS[c.i], k = smooth(0, 1, c.t / S[4]) * 0.85 + (c.t / S[4]) * 0.15;
      cam.position.lerpVectors(S[0], S[2], k);
      const look = new THREE.Vector3().lerpVectors(S[1], S[3], k);
      cam.lookAt(look);
      const fade = Math.max(1 - c.t / 0.45, 1 - (S[4] - c.t) / 0.45, 0);
      return clamp(fade, 0, 1);
    }
    if (this.goal) {
      const g = this.goal, k = 1 - Math.exp(-dt * 2.4);
      this.target.lerp(g.target, k);
      let dy = g.yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * k; this.pitch = lerp(this.pitch, g.pitch, k); this.minPitch = Math.min(0.02, g.pitch); this.dist = lerp(this.dist, g.dist, k);
      if (Math.abs(dy) < 0.002 && Math.abs(this.dist - g.dist) < 0.5 && this.target.distanceTo(g.target) < 0.3) this.goal = null;
    } else if (this.ptr.size === 0) {
      // 慣性
      this.yaw += this.vYaw; this.pitch = clamp(this.pitch + this.vPitch, this.minPitch ?? 0.02, 1.35);
      this.vYaw *= Math.pow(0.02, dt); this.vPitch *= Math.pow(0.02, dt);
      if (this.idle > 25 && !this.noDrift) this.yaw += dt * 0.025; // 放著不動會慢慢繞
    }
    const cp = Math.cos(this.pitch);
    cam.position.set(this.target.x + Math.sin(this.yaw) * cp * this.dist, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z + Math.cos(this.yaw) * cp * this.dist);
    if (cam.position.y < 1.5) cam.position.y = 1.5;
    cam.lookAt(this.target);
    return 0;
  }
}
