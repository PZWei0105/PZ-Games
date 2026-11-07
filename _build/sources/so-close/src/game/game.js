// 主控：店內、機台切換、投幣、夾取流程、經濟、存檔
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Renderer } from '../engine/render.js';
import { makeEnv } from '../engine/env.js';
import { Sound } from '../engine/audio.js';
import { Sim } from './sim.js';
import { MachineView, PrizeLayer, FLOOR_Y } from './cabinet.js';
import { buildRoom } from './room.js';
import { MACHINES, PRIZES, PRIZE, RARITY, SERIES, ECON, RANKS, rankOf, hiddenOf, seriesPrizes, CAP_R, CAP_M, MISSIONS } from './data.js';
import { store } from './store.js';
import { UI } from './ui.js';
import { RevealStage } from './reveal.js';
import { Showcase } from './showcase.js';
import { rng } from './qmath.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const BOX_SIZE = { R: { sx: 0.185, sy: 0.14, sz: 0.12, mass: 0.32 }, SR: { sx: 0.2, sy: 0.15, sz: 0.128, mass: 0.38 }, SSR: { sx: 0.22, sy: 0.165, sz: 0.138, mass: 0.48 } };
const AIM_TIME = 25;

export class Game {
  constructor() {
    this.app = document.getElementById('app');
    this.snd = new Sound();
    this.ui = new UI(this);
    this.ready = false;
    this.mode = 'shop'; // shop | reveal | collection
    this.timeScale = 1;
    this.shake = 0;
    this.cam = { yaw: 0, pitch: 0.36, zoom: 1, tyaw: 0, tpitch: 0.36, tzoom: 1, x: 0, follow: 0 };
    this.sims = {};
    this.layers = [];
    this.turn = null;
    this.queue = [];
    this.pourQ = [];
    this.lastSave = 0;
    const q = new URLSearchParams(location.search);
    this.fast = +(q.get('fast') || 0); this.skip = +(q.get('skip') || 0); this.frameN = 0; this.revealSpeed = +(q.get('rs') || 1);
    this.init().catch((e) => { console.error(e); this.ui.fatal('啟動時發生錯誤：' + (e && e.message ? e.message : e)); });
  }

  async init() {
    try { await RAPIER.init(); }
    catch (e) {
      this.ui.fatal(typeof __CLOUD__ !== 'undefined' && __CLOUD__ ? '這個環境沒辦法啟動物理引擎。<br>請改用獨立網頁版：<br><a style="color:#3fe0ff" href="https://pzwei0105.github.io/PZ-Games/games/so-close/index.html">pzwei0105.github.io/PZ-Games</a>' : '這個瀏覽器沒辦法啟動物理引擎。<br>請換用最新版的 Safari 或 Chrome。');
      return;
    }
    this.loadProfile();
    const R = new Renderer(this.app);
    this.R = R;
    this.scene = new THREE.Scene();
    this.scene.environment = makeEnv(R.r);
    this.scene.environmentIntensity = 0.6;
    this.scene.background = new THREE.Color('#05060b');
    this.scene.fog = new THREE.Fog('#05060b', 4.5, 9);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 30);
    this.scene.add(new THREE.HemisphereLight('#aab8ff', '#1a1410', 0.55));
    const key = new THREE.DirectionalLight('#fff4e6', 1.7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = -0.5; sc.right = 0.5; sc.top = 0.45; sc.bottom = -0.45; sc.near = 0.1; sc.far = 3;
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.01; key.shadow.radius = 3;
    this.scene.add(key, key.target);
    this.key = key;
    const front = new THREE.DirectionalLight('#c8d8ff', 0.45); front.position.set(0, 2.2, 3); this.scene.add(front);
    this.room = buildRoom(this.scene, MACHINES.length);
    this.views = MACHINES.map((def, i) => { const v = new MachineView(def, i); this.scene.add(v.group); return v; });
    this.layers = this.views.map((v) => new PrizeLayer(v));
    this.reveal = new RevealStage(this);
    this.showcase = new Showcase(this);
    this.active = Math.max(0, MACHINES.findIndex((m) => m.id === this.P.last));
    if (!this.unlocked(this.active)) this.active = 0;
    this.cam.x = this.views[this.active].group.position.x;
    this.applyDailyAndRegen(true);
    for (let i = 0; i < MACHINES.length; i++) this.loadMachine(i);
    this.ensureSim(this.active);
    this.ui.bind();
    this.onResize();
    addEventListener('resize', () => this.onResize());
    this.ui.refreshAll();
    this.ready = true;
    this.clock = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    this.ui.ready();
    setInterval(() => { this.applyDailyAndRegen(false); }, 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveAll(); });
  }

  // ---------------- 存檔 ----------------
  loadProfile() {
    let p = null;
    try { p = JSON.parse(store.get('profile') || 'null'); } catch (e) { p = null; }
    if (!p || p.v !== 1) p = { v: 1, tokens: ECON.start, xp: 0, regenAt: Date.now(), day: '', col: {}, stats: { plays: 0, wins: 0, near: 0, multi: 0, hidden: 0, ssr: 0 }, flags: { opening: 1 }, last: 'm1', uid: 1, meter: { m1: ECON.openingMeter }, series: {}, rank: 0, settings: { sfx: true, music: true, quality: 'auto' } };
    p.settings = { sfx: true, music: true, quality: 'auto', ...(p.settings || {}) };
    this.P = p;
    this.snd.on = p.settings.sfx; this.snd.musicOn = p.settings.music;
  }
  saveProfile() { store.set('profile', JSON.stringify(this.P)); }
  saveMachine(i) {
    const def = MACHINES[i], st = this.mstate[i];
    const sim = this.sims[def.id];
    if (sim) {
      const poses = new Map(sim.poses().map((q) => [q.id, q]));
      const before = st.items.length;
      st.items = st.items.filter((it) => poses.has(it.uid)).map((it) => { const q = poses.get(it.uid); return { ...it, p: q.p, q: q.q }; });
      if (st.items.length !== before || this.layers[i].items !== st.items) this.layers[i].set(st.items);
    }
    store.set('mach.' + def.id, JSON.stringify(st));
  }
  saveAll() { if (!this.ready) return; this.saveProfile(); for (let i = 0; i < MACHINES.length; i++) if (this.sims[MACHINES[i].id]) this.saveMachine(i); }
  onCloud(changed) {
    if (!changed || !this.ready) return;
    // 雲端存檔比較新：重新載入（不在夾取中才做）
    if (this.turn || this.mode !== 'shop') { this.cloudPending = true; return; }
    this.reloadFromStore();
  }
  reloadFromStore() {
    this.cloudPending = false;
    this.loadProfile();
    for (const id of Object.keys(this.sims)) { this.sims[id].world.free?.(); delete this.sims[id]; }
    for (let i = 0; i < MACHINES.length; i++) this.loadMachine(i);
    this.ensureSim(this.active);
    this.ui.refreshAll();
  }

  applyDailyAndRegen(boot) {
    const P = this.P, now = Date.now();
    const d = today();
    if (P.day !== d) {
      const first = !P.day;
      P.day = d;
      this.rollMissions();
      if (!first) { P.tokens += ECON.daily; this.ui?.toast?.(`每日回饋 ＋${ECON.daily} 代幣`, 'gold'); }
      P.regenAt = now;
      if (!boot) for (let i = 0; i < MACHINES.length; i++) this.restockCheck(i, true);
      this.saveProfile();
    }
    if (P.tokens >= ECON.regenCap) { P.regenAt = now; }
    else {
      const k = Math.floor((now - P.regenAt) / (ECON.regenEvery * 1000));
      if (k > 0) { P.tokens = Math.min(ECON.regenCap, P.tokens + k); P.regenAt += k * ECON.regenEvery * 1000; if (P.tokens >= ECON.regenCap) P.regenAt = now; this.saveProfile(); }
    }
    this.ui?.setTokens?.();
  }
  regenLeft() { if (this.P.tokens >= ECON.regenCap) return -1; return Math.max(0, ECON.regenEvery - Math.floor((Date.now() - this.P.regenAt) / 1000)); }

  unlocked(i) { return rankOf(this.P.xp) >= MACHINES[i].unlock; }

  // ---------------- 機台內容 ----------------
  loadMachine(i) {
    const def = MACHINES[i];
    let st = null;
    try { st = JSON.parse(store.get('mach.' + def.id) || 'null'); } catch (e) { st = null; }
    if (!st || !Array.isArray(st.items)) st = { items: [], day: '', fresh: true };
    this.mstate = this.mstate || [];
    this.mstate[i] = st;
    this.layers[i].set(st.items);
  }
  rollItem(def, rarity, R) {
    const uid = this.P.uid++;
    if (rarity === 'BLK') return { uid, prize: null, rarity: 'BLK', black: true, series: def.series === 'X' ? 'ABC'[Math.floor(R() * 3)] : def.series, kind: 'cap', r: CAP_R.BLK, mass: CAP_M.BLK };
    const pool = (def.series === 'X' ? PRIZES : seriesPrizes(def.series)).filter((p) => p.rarity === rarity);
    const pz = pool[Math.floor(R() * pool.length)];
    if (def.kind === 'shelf') { const s = BOX_SIZE[rarity]; return { uid, prize: pz.id, rarity, kind: 'box', size: { sx: s.sx, sy: s.sy, sz: s.sz }, mass: s.mass }; }
    return { uid, prize: pz.id, rarity, kind: 'cap', r: CAP_R[rarity], mass: CAP_M[rarity] * (0.95 + R() * 0.1) };
  }
  pickRarity(mix, R) {
    const e = Object.entries(mix); let s = e.reduce((a, [, v]) => a + v, 0), x = R() * s;
    for (const [k, v] of e) { if ((x -= v) <= 0) return k; }
    return e[0][0];
  }
  // 補貨清單
  stockList(i, fill) {
    const def = MACHINES[i], st = this.mstate[i], R = rng((Date.now() ^ (i * 7919)) >>> 0);
    const out = [];
    if (def.kind === 'shelf') {
      const have = st.items.length;
      for (let k = have; k < def.boxes; k++) out.push(this.rollItem(def, this.pickRarity(def.mix, R), R));
      return out;
    }
    const have = st.items.length, target = def.stock;
    const n = fill ? target - have : 0;
    if (n <= 0) return out;
    const hasSSR = st.items.filter((it) => it.rarity === 'SSR').length;
    const wantSSR = Math.max(0, (def.ssr || 0) - hasSSR);
    for (let k = 0; k < Math.min(wantSSR, n); k++) out.push(this.rollItem(def, 'SSR', R));
    const blk = st.items.filter((it) => it.black).length;
    const wantBlk = Math.max(0, (def.black || 0) - blk) + (def.blackChance && blk === 0 && R() < def.blackChance ? 1 : 0);
    for (let k = 0; k < wantBlk && out.length < n; k++) out.push(this.rollItem(def, 'BLK', R));
    while (out.length < n) out.push(this.rollItem(def, this.pickRarity(def.mix, R), R));
    return out;
  }
  ensureSim(i) {
    const def = MACHINES[i];
    if (this.sims[def.id]) return this.sims[def.id];
    const sim = new Sim(RAPIER, def.kind);
    this.sims[def.id] = sim;
    const st = this.mstate[i];
    this.byUid = this.byUid || {};
    for (const it of st.items) {
      if (!it.p) continue;
      sim.addPrize(this.simInfo(it), { x: it.p[0], y: it.p[1], z: it.p[2] }, { x: it.q[0], y: it.q[1], z: it.q[2], w: it.q[3] });
    }
    st.items = st.items.filter((it) => it.p);
    // 讓存檔的姿勢先穩定
    for (let k = 0; k < 30; k++) sim.sub(1 / 120);
    for (const p of sim.prizes) p.body.sleep();
    sim.events.length = 0;
    this.layers[i].set(st.items);
    this.restockCheck(i, st.fresh || st.items.length === 0);
    return sim;
  }
  simInfo(it) { return it.kind === 'box' ? { id: it.uid, kind: 'box', sx: it.size.sx, sy: it.size.sy, sz: it.size.sz, mass: it.mass } : { id: it.uid, kind: 'cap', r: it.r, mass: it.mass }; }
  restockCheck(i, force) {
    const def = MACHINES[i], st = this.mstate[i];
    const sim = this.sims[def.id];
    if (!sim) { if (force) st.fresh = true; return; }
    let list = [];
    if (def.kind === 'shelf') list = this.stockList(i, true);
    else if (force || st.items.length < def.stock * 0.62) list = this.stockList(i, true);
    st.fresh = false;
    st.day = today();
    if (!list.length) return;
    this.pour(i, list, !this.ready || st.items.length === 0);
  }
  // 補貨：從上方倒進去（扭蛋）或放到台上（盒子）
  pour(i, list, firstFill) {
    const def = MACHINES[i], st = this.mstate[i], sim = this.sims[def.id];
    const R = rng((Date.now() * 13 + i) >>> 0);
    const L = sim.L;
    if (def.kind === 'shelf') {
      for (const it of list) {
        const used = st.items.map((o) => ({ x: o.p ? o.p[0] : 0, z: o.p ? o.p[2] : 0 }));
        let x = 0, z = -0.17;
        const zc = it.rarity === 'SSR' ? -0.15 : it.rarity === 'SR' ? -0.1 : -0.06;
        for (let t = 0; t < 40; t++) { x = -0.22 + R() * 0.44; z = zc + (R() - 0.5) * 0.04; if (used.every((u) => Math.abs(u.x - x) > 0.25)) break; }
        const y = L.shelfY + it.size.sy / 2 + 0.003;
        it.p = [x, y, z]; it.q = [0, Math.sin((R() - 0.5) * 0.4), 0, 1];
        const n = Math.hypot(it.q[1], it.q[3]); it.q[1] /= n; it.q[3] /= n;
        sim.addPrize(this.simInfo(it), { x, y, z }, { x: 0, y: it.q[1], z: 0, w: it.q[3] });
        st.items.push(it);
      }
      this.layers[i].set(st.items);
      if (this.ready) { this.ui.toast('店員補了一盒新的獎品', 'info'); }
      return;
    }
    if (this.ready && list.some((it) => it.black) && MACHINES[i].id !== 'm4') setTimeout(() => { this.ui.toast(`黑金蛋出現在「${MACHINES[i].name}」！`, 'gold'); this.snd.power(); }, 1200);
    // 先放 SSR（壓在比較難夾的位置），其餘依序灑下
    const ssr = list.filter((it) => it.rarity === 'SSR' || it.black), rest = list.filter((it) => !(it.rarity === 'SSR' || it.black));
    const ordered = [...ssr, ...rest];
    for (const [k, it] of ordered.entries()) {
      let x, z;
      for (let t = 0; t < 80; t++) {
        if (k < ssr.length) { x = 0.05 + R() * 0.3; z = -0.3 + R() * 0.2; }
        else { const a = R() * 6.283, rr = Math.sqrt(R()) * 0.32; x = 0.06 + Math.cos(a) * rr * 1.2; z = -0.06 + Math.sin(a) * rr; }
        if (Math.abs(x) < L.W / 2 - 0.07 && Math.abs(z) < L.D / 2 - 0.07 && !(x < L.chute.x1 + 0.08 && z > L.chute.z0 - 0.08)) break;
      }
      this.pourQ.push({ i, it, x, z, delay: firstFill ? k * 0.045 : 0.3 + k * 0.08 });
    }
    if (!this.ready) {
      // 開機：直接在背景模擬好
      for (const q of this.pourQ.splice(0)) { sim.addPrize(this.simInfo(q.it), { x: q.x, y: 0.45 + Math.random() * 0.4, z: q.z }); st.items.push(q.it); }
      for (let k = 0; k < 420; k++) sim.sub(1 / 120);
      for (const p of sim.prizes) p.body.sleep();
      sim.events.length = 0;
      this.layers[i].set(st.items);
      this.saveMachine(i);
    } else {
      this.ui.toast(firstFill ? '店員正在補貨…' : '店員補貨中：新的扭蛋倒進去了', 'info');
      this.pourT = 0;
    }
  }
  stepPour(dt) {
    if (!this.pourQ.some((q) => q.i === this.active)) return;
    this.pourT = (this.pourT || 0) + dt;
    let added = false;
    const next = [];
    for (const q of this.pourQ) {
      if (q.i === this.active && this.pourT >= q.delay) {
        const def = MACHINES[q.i], sim = this.sims[def.id], st = this.mstate[q.i];
        sim.addPrize(this.simInfo(q.it), { x: q.x, y: 0.7 + Math.random() * 0.1, z: q.z }, null);
        st.items.push(q.it);
        this.layers[q.i].set(st.items);
        if (Math.random() < 0.5) this.snd.tap(3);
        added = true;
      } else next.push(q);
    }
    this.pourQ = next;
    if (added && !next.some((q) => q.i === this.active)) { const i = this.active; setTimeout(() => this.saveMachine(i), 2500); }
  }

  // ---------------- 切換機台 ----------------
  go(dir) {
    if (this.turn || this.mode !== 'shop') return;
    const n = this.active + dir;
    if (n < 0 || n >= MACHINES.length) return;
    this.snd.click();
    this.saveMachine(this.active);
    this.active = n;
    this.P.last = MACHINES[n].id;
    this.ensureSim(n);
    if (this.pourQ.some((q) => q.i === n)) { const t0 = Math.min(...this.pourQ.filter((q) => q.i === n).map((q) => q.delay)); for (const q of this.pourQ) if (q.i === n) q.delay -= t0 - 0.2; this.pourT = 0; }
    this.cam.tyaw = 0; this.cam.tpitch = 0.36; this.cam.tzoom = 1;
    this.ui.refreshMachine();
    this.saveProfile();
  }

  // ---------------- 一局 ----------------
  meterOf(def) { return this.P.meter[def.id] || 0; }
  isPower(def) { return def.meter > 0 && this.meterOf(def) >= def.meter; }
  insertCoin() {
    if (this.turn || this.mode !== 'shop' || this.pourQ.some((q) => q.i === this.active)) return;
    const def = MACHINES[this.active];
    if (!this.unlocked(this.active)) { this.snd.deny(); this.ui.toast(`升到「${RANKS[def.unlock].name}」才能玩這台`, 'warn'); return; }
    if (this.P.tokens < def.cost) { this.snd.deny(); this.ui.noTokens(); return; }
    const sim = this.ensureSim(this.active);
    const power = this.isPower(def);
    this.P.tokens -= def.cost;
    this.P.stats.plays++;
    this.mission('play'); this.mission('play:' + def.id);
    this.addXp(ECON.playXp);
    this.snd.coin();
    if (power) setTimeout(() => this.snd.power(), 250);
    sim.start(power ? def.strong : def.power);
    this.turn = { def, sim, power, t: 0, aimLeft: AIM_TIME, wins: [], slips: 0, grabbed: false, lastTick: AIM_TIME, near: false };
    this.ui.onTurnStart(power);
    this.saveProfile();
  }
  dropClaw() {
    const T = this.turn;
    if (!T || T.sim.state !== 'aim') return;
    T.sim.drop();
    this.snd.drop();
    this.ui.onDrop();
  }
  onSimEvent(e) {
    const T = this.turn, s = this.snd;
    if (e.type === 'hit') {
      if (e.f > 2.2 && Math.random() < 0.6) { if (e.other === 'static') s.thump(e.f * 0.6); else s.tap(e.f); }
      return;
    }
    if (!T) return;
    switch (e.type) {
      case 'land': s.land(); break;
      case 'close': s.servo(); break;
      case 'lift': break;
      case 'grab': T.grabbed = true; s.grab(); this.ui.status('夾起來了！', 'hot'); s.duck(0.35); break;
      case 'power': s.clunk(); this.shake = Math.max(this.shake, 0.004); if (e.held) this.ui.status('到頂了……撐住！', 'hot'); break;
      case 'return': if (T.sim.heldLoad() > 0) this.ui.status('往出口移動中……', 'hot'); break;
      case 'slip': {
        if (e.phase === 'release') break;
        T.slips++;
        const pr = T.sim.byId.get(e.id);
        let dist = 1, lifted = 0;
        if (pr) { const t = pr.body.translation(); dist = T.sim.dropDist(t); lifted = e.y - (pr.gripY ?? e.y); }
        const close = dist < 0.15 || e.phase === 'return';
        const high = lifted > 0.08;
        if (close || high) {
          s.slip(true);
          if (close) { this.timeScale = 0.3; this.slowT = 0.9; }
          this.ui.big('差一點！', 'near');
          if (!T.near) { T.near = true; this.P.stats.near++; this.mission('near'); }
        } else { s.slip(false); this.ui.status('滑掉了……', 'cold'); }
        s.duck(1);
        break;
      }
      case 'win': {
        const it = this.mstate[this.active].items.find((x) => x.uid === e.id);
        if (it && !T.wins.some((w) => w.uid === it.uid)) { T.wins.push(it); s.win(); this.shake = Math.max(this.shake, 0.01); this.ui.big(T.wins.length > 1 ? `一夾${'二三四五'[T.wins.length - 2] || '多'}！` : '進洞了！', 'win'); this.ui.flash(RARITY[it.black ? 'SSR' : it.rarity].color); }
        break;
      }
      case 'done': this.endTurn(e); break;
    }
  }
  endTurn(rep) {
    const T = this.turn;
    if (!T) return;
    const def = T.def, i = this.active, st = this.mstate[i];
    const won = T.wins;
    const wonIds = new Set(won.map((w) => w.uid));
    st.items = st.items.filter((it) => !wonIds.has(it.uid));
    this.layers[i].set(st.items);
    if (T.power || won.length) this.P.meter[def.id] = 0;
    else if (def.meter) this.P.meter[def.id] = Math.min(def.meter, this.meterOf(def) + 1);
    if (won.length) {
      this.P.stats.wins += won.length;
      if (won.length > 1) { this.P.stats.multi++; this.mission('multi'); }
      for (const w of won) { this.mission('win'); if (w.kind === 'box') this.mission('box'); if (w.black || RARITY[w.rarity].order >= 1) this.mission('rare'); if (w.black || RARITY[w.rarity].order >= 2) this.mission('sr'); }
      if (T.power) this.mission('powerwin');
    }
    // 差一點：這局把哪顆推到出口邊上
    if (!won.length && !T.near) {
      const close = rep.moved.filter((m) => m.closer && m.after < 0.035);
      if (close.length) { this.ui.big(close[0].after < 0.012 ? '就差一點點……' : '更近了', 'near-soft'); if (close[0].after < 0.012) { this.P.stats.near++; this.mission('near'); } }
    }
    this.snd.duck(1);
    this.turn = null;
    this.saveMachine(i);
    this.saveProfile();
    this.ui.onTurnEnd(won.length > 0);
    if (won.length) setTimeout(() => this.startReveals(won.slice()), 650);
    else this.afterTurn();
  }
  afterTurn() {
    this.restockCheck(this.active, false);
    if (this.cloudPending) this.reloadFromStore();
    this.ui.coachAfterTurn();
  }

  // ---------------- 開獎 ----------------
  startReveals(list) {
    this.revealList = list;
    this.mode = 'reveal';
    this.nextReveal();
  }
  nextReveal() {
    const it = this.revealList.shift();
    if (!it) { this.mode = 'shop'; this.ui.closeReveal(); this.afterTurn(); return; }
    // 決定開出什麼
    let pid = it.prize, hidden = false, upgraded = false;
    const R = Math.random;
    if (it.black) {
      if (R() < ECON.blackHidden) { pid = hiddenOf(it.series).id; hidden = true; }
      else { const ss = PRIZES.filter((p) => p.series === it.series && p.rarity === 'SSR'); pid = ss[Math.floor(R() * ss.length)].id; }
    } else if (this.forceHidden || R() < ECON.hiddenChance) { pid = hiddenOf(PRIZE[it.prize].series).id; hidden = true; upgraded = true; }
    const pz = PRIZE[pid], rar = RARITY[pz.rarity];
    const serial = rar.ed ? 1 + Math.floor(R() * rar.ed) : 0;
    const col = this.P.col[pid] || { n: 0, first: Date.now(), serials: [] };
    const isNew = col.n === 0;
    col.n++; if (serial) col.serials.push(serial); if (col.serials.length > 30) col.serials = col.serials.slice(-30);
    this.P.col[pid] = col;
    this.addXp(rar.xp);
    if (pz.rarity === 'SSR') this.P.stats.ssr++;
    if (pz.rarity === 'HID') this.P.stats.hidden++;
    // 系列收齊
    let complete = null;
    const s = pz.series;
    if (!this.P.series[s] && seriesPrizes(s).filter((p) => p.rarity !== 'HID').every((p) => this.P.col[p.id]?.n)) { this.P.series[s] = Date.now(); this.P.tokens += ECON.seriesReward; complete = s; }
    this.saveProfile();
    this.reveal.play({ item: it, pid, hidden, upgraded, serial, isNew, complete, dupes: col.n - 1 });
  }
  // ---------------- 每日任務 ----------------
  rollMissions() {
    const d = today();
    const seed = d.split('-').reduce((a, x) => a * 131 + +x, 7);
    const R = rng(seed >>> 0);
    const pool = MISSIONS.filter((m) => !m.need || this.unlocked(MACHINES.findIndex((x) => x.id === m.need)));
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    this.P.missions = { day: d, list: pick.map((m) => ({ id: m.id, n: 0 })) };
  }
  mission(ev) {
    const M = this.P.missions;
    if (!M || M.day !== today()) this.rollMissions();
    for (const m of this.P.missions.list) {
      const def = MISSIONS.find((x) => x.id === m.id);
      if (!def || def.ev !== ev || m.n >= def.goal) continue;
      m.n++;
      if (m.n >= def.goal) { this.ui.toast(`任務完成：${def.text}（到任務板領 ${def.reward} 代幣）`, 'gold'); }
    }
    this.ui.updateMissionDot?.();
  }
  claimMission(id) {
    const m = this.P.missions?.list.find((x) => x.id === id);
    const def = MISSIONS.find((x) => x.id === id);
    if (!m || !def || m.n < def.goal || m.claimed) return 0;
    m.claimed = true;
    this.P.tokens += def.reward;
    this.saveProfile();
    this.snd.coin();
    this.ui.setTokens();
    this.ui.updateMissionDot?.();
    return def.reward;
  }

  recycle(pid) {
    const col = this.P.col[pid];
    if (!col || col.n <= 1) return false;
    const r = RARITY[PRIZE[pid].rarity];
    col.n--; col.serials.pop();
    this.P.tokens += r.recycle;
    this.saveProfile();
    this.snd.coin();
    this.ui.setTokens();
    return r.recycle;
  }
  addXp(n) {
    const before = rankOf(this.P.xp);
    this.P.xp += n;
    const after = rankOf(this.P.xp);
    if (after > before) {
      const reward = ECON.rankReward(after);
      this.P.tokens += reward;
      setTimeout(() => { this.snd.rank(); this.ui.rankUp(after, reward); }, 900);
    }
    this.ui.setRank?.();
  }

  // ---------------- 每一幀 ----------------
  onResize() {
    this.R.resize();
    this.camera.aspect = this.R.w / this.R.h;
    this.camera.updateProjectionMatrix();
    this.ui.layout?.();
  }
  updateCamera(dt) {
    const C = this.cam, v = this.views[this.active], R = this.R;
    const k = 1 - Math.exp(-dt * 5);
    C.yaw += (C.tyaw - C.yaw) * k; C.pitch += (C.tpitch - C.pitch) * k; C.zoom += (C.tzoom - C.zoom) * k;
    C.x += (v.group.position.x - C.x) * (1 - Math.exp(-dt * 4));
    // 夾取時鏡頭跟著爪子靠近
    const T = this.turn;
    const want = T && ['drop', 'close', 'grip', 'lift'].includes(T.sim.state) ? 1 : T && ['top', 'return'].includes(T.sim.state) ? 0.55 : 0;
    C.follow += (want - C.follow) * (1 - Math.exp(-dt * 2.2));
    const sim = this.sims[MACHINES[this.active].id];
    const hp = sim?._hp || { x: 0, y: 0.5, z: 0 };
    const base = new THREE.Vector3(C.x, FLOOR_Y + 0.32, 0.02);
    const claw = new THREE.Vector3(C.x + hp.x * 0.75, FLOOR_Y + Math.max(0.12, hp.y - 0.05), hp.z * 0.6);
    const tgt = base.lerp(claw, 0.38 * C.follow);
    // 依螢幕比例決定距離（機台寬度塞滿畫面）
    const vfov = (this.camera.fov * Math.PI) / 180;
    const top = this.ui.hudTop || 0, bot = this.ui.hudBottom || 0;
    const visFrac = Math.max(0.35, (R.h - top - bot) / R.h);
    const tanV = Math.tan(vfov / 2), tanH = tanV * this.camera.aspect;
    const fitW = 1.0 / 2 / tanH, fitH = 1.2 / 2 / (tanV * visFrac);
    const dist = Math.max(fitW, fitH) * C.zoom * (1 - 0.22 * C.follow);
    const cp = Math.cos(C.pitch);
    this.camera.position.set(tgt.x + Math.sin(C.yaw) * cp * dist, tgt.y + Math.sin(C.pitch) * dist, tgt.z + Math.cos(C.yaw) * cp * dist);
    if (this.shake > 0) { this.camera.position.x += (Math.random() - 0.5) * this.shake * 2; this.camera.position.y += (Math.random() - 0.5) * this.shake * 2; this.shake = Math.max(0, this.shake - dt * 0.03); }
    this.camera.lookAt(tgt);
    this.camera.setViewOffset(R.w, R.h, 0, (bot - top) / 2, R.w, R.h);
    // 主光跟著目前機台
    this.key.position.set(C.x + 0.05, FLOOR_Y + 2.2, 0.05);
    this.key.target.position.set(C.x, FLOOR_Y, 0);
  }
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = Math.max(0, Math.min(0.05, (now - this.clock) / 1000));
    this.clock = now;
    const t = now / 1000;
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.timeScale = 1; }
    else this.timeScale += (1 - this.timeScale) * Math.min(1, dt * 3);
    if (this.mode === 'reveal') { this.reveal.update(dt, t); return; }
    if (this.mode === 'collection' && this.showcase.active) { this.showcase.update(dt, t); return; }
    const def = MACHINES[this.active], sim = this.sims[def.id];
    if (sim) {
      const T = this.turn;
      if (T && sim.state === 'aim') {
        const iv = this.ui.stickVec();
        // 搖桿方向轉成機台座標（依鏡頭角度）
        const yaw = this.cam.yaw;
        const x = iv.x * Math.cos(yaw) + iv.y * Math.sin(yaw);
        const z = -iv.x * Math.sin(yaw) + iv.y * Math.cos(yaw);
        sim.input.x = x; sim.input.z = z;
        this.views[this.active].setStick(x, z);
        T.aimLeft -= dt;
        const sec = Math.ceil(T.aimLeft);
        if (sec < T.lastTick && sec <= 5 && sec >= 1) { this.snd.tick(true); T.lastTick = sec; }
        if (T.aimLeft <= 0) this.dropClaw();
        this.ui.setTimer(T.aimLeft / AIM_TIME);
        const sp = Math.hypot(sim.car.vx, sim.car.vz);
        this.snd.motor(Math.min(1, sp / 0.15), 1);
      } else if (T) {
        const st = sim.state;
        const lv = st === 'drop' && sim.landT < 0 && sim.st > 0.25 ? 0.8 : st === 'lift' ? 1 : st === 'return' ? 0.7 : 0;
        this.snd.motor(lv, st === 'lift' ? 1.25 : st === 'drop' ? 0.85 : 1);
        this.views[this.active].setStick(0, 0);
      } else this.snd.motor(0);
      if (this.fast) { for (let k = 0; k < this.fast; k++) sim.sub(1 / 120); } else sim.update(dt * this.timeScale);
      for (const e of sim.events.splice(0)) this.onSimEvent(e);
      this.stepPour(dt);
    }
    // 畫面同步
    for (let i = 0; i < MACHINES.length; i++) {
      const v = this.views[i], s = this.sims[MACHINES[i].id];
      const side = Math.abs(this.cam.yaw) > 0.35 && i !== this.active;
      const visible = !side && Math.abs(v.group.position.x - this.cam.x) < 2.2;
      v.group.visible = visible;
      if (!visible) continue;
      if (s) { v.syncClaw(s); this.layers[i].update((c) => { const pr = s.byId.get(c.uid); if (!pr || pr.state === 'gone') return null; return { p: pr.body.translation(), q: pr.body.rotation() }; }, t); }
      else this.layers[i].update((c) => (c.p ? { p: { x: c.p[0], y: c.p[1], z: c.p[2] }, q: { x: c.q[0], y: c.q[1], z: c.q[2], w: c.q[3] } } : null), t);
      v.setMeter(this.meterOf(MACHINES[i]), MACHINES[i].meter, this.isPower(MACHINES[i]), t);
    }
    this.room.tick(t);
    this.updateCamera(dt);
    this.ui.frame(dt, t);
    if (!this.skip || ++this.frameN % this.skip === 0) this.R.render(this.scene, this.camera, t);
    this.perf(dt);
  }
  // 自動畫質
  perf(dt) {
    if (this.P.settings.quality !== 'auto') return;
    this.fps = this.fps || { t: 0, n: 0, slow: 0 };
    const f = this.fps;
    f.t += dt; f.n++;
    if (f.t > 3) {
      const avg = f.t / f.n;
      if (avg > 1 / 40 && this.R.quality !== 'low') { f.slow++; if (f.slow >= 2) { this.R.setQuality(this.R.quality === 'high' ? 'mid' : 'low'); f.slow = 0; } }
      else f.slow = 0;
      f.t = 0; f.n = 0;
    }
  }
}
