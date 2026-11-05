// 遊戲主控：場景切換、腳本、戰鬥、存檔、標題、營火、釣魚
import * as THREE from 'three';
import { Renderer } from '../engine/render.js';
import { Sound } from '../engine/audio.js';
import { Input } from '../engine/input.js';
import { Sheet, Actor } from '../engine/sprite3d.js';
import { characterFrames } from '../engine/chars.js';
import { monsterFrames } from '../engine/monsters.js';
import { UI, h } from './ui.js';
import { Field } from './field.js';
import { BattleScene } from './battleScene.js';
import { STORY } from './story.js';
import { CAST } from './cast.js';
import { CHARS, ITEMS, WEAPONS, ACCESSORIES, ENGRAVES, statsAt, FISH } from './data.js';
import { store } from './store.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ABORT = { abort: true };

const DEFAULT_WEAPON = { wei: 'hook1', lise: 'sword1', noct: 'dagger1', owen: 'staff1' };
const nameOf = (k) => (ITEMS[k] || WEAPONS[k] || ACCESSORIES[k] || ENGRAVES[k])?.name || k;

export class Game {
  constructor() {
    this.app = document.getElementById('app');
    const coarse = window.matchMedia?.('(pointer:coarse)').matches;
    let saved = {};
    try { saved = JSON.parse(store.get('settings') || '{}'); } catch (e) { saved = {}; }
    this.settings = Object.assign({ quality: coarse ? 'mid' : 'high', fx: 1, music: 0.55, sfx: 0.8, text: 1, bspeed: 1, shake: 1 }, saved);
    this.renderer = new Renderer(this.app);
    this.sound = new Sound();
    this.ui = new UI(this);
    this.input = new Input(this.app, this.ui);
    this.shake = { t: 0, a: 0 };
    this.sheets = {}; this.msheets = {};
    this.state = this.newState();
    this.active = null; this.field = null;
    this.scriptDepth = 0; this.gen = 0; this.moves = [];
    this.overlay = null; this.titleMode = false;
    this.applySettings(true);
    window.addEventListener('resize', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => { const c = this.sound.ctx; if (!c) return; if (document.hidden) c.suspend(); else c.resume(); });
    this.last = performance.now();
    this.errShown = false;
    requestAnimationFrame((t) => this.loop(t));
    this.toTitle(true);
  }
  get modal() { return this.scriptDepth > 0 || !!this.overlay; }
  newState() {
    return {
      ver: 1, party: [{ id: 'wei', lv: 1, exp: 0, hp: statsAt('wei', 1).hp, weapon: 'hook1', acc: null, engr: [], ult: 0 }],
      inv: { potion: 3 }, weapons: { hook1: { star: 1 } }, accs: {}, engr: {}, gold: 60,
      flags: {}, map: 'cape', pos: [13.1, 8.0], dir: 'right', objective: '', log: [], bestiary: {}, meal: null,
      defeated: {}, chests: {}, tut: {}, fieldPhase: {}, zoom: 1, time: 0,
    };
  }
  // ---------------- 主迴圈 ----------------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    try {
      if (this.shake.t > 0) this.shake.t -= dt;
      this.updateMoves(dt);
      if (!this.titleMode && this.field) this.state.time += dt;
      const s = this.active;
      if (s) { s.update(dt); s.render(); }
    } catch (e) {
      if (!this.errShown) { this.errShown = true; console.error(e); }
    }
  }
  sheet(id) {
    if (!this.sheets[id]) { const cf = characterFrames(CAST[id] || CAST.villager); this.sheets[id] = new Sheet(cf.frames, cf.index, 8); }
    return this.sheets[id];
  }
  monsterSheet(art) {
    if (!this.msheets[art]) { const mf = monsterFrames(art); const s = new Sheet(mf.frames, mf.index, mf.frames.length > 5 ? 6 : 5); s.human = !!mf.human; this.msheets[art] = s; }
    return this.msheets[art];
  }
  // ---------------- 設定 ----------------
  applySettings(first) {
    const S = this.settings;
    if (this.renderer.quality !== S.quality || first) this.renderer.setQuality(S.quality);
    this.renderer.fxScale = S.fx;
    this.sound.setVol(S.music, S.sfx);
    if (!first) store.set('settings', JSON.stringify(S));
  }
  // ---------------- 數值 ----------------
  maxHp(m) { return statsAt(m.id, m.lv).hp + (ACCESSORIES[m.acc]?.mod?.hp || 0); }
  clampHp() { for (const m of this.state.party) m.hp = Math.max(1, Math.min(m.hp, this.maxHp(m))); }
  restAll() { for (const m of this.state.party) m.hp = this.maxHp(m); }
  addItem(k, n = 1) {
    const S = this.state;
    if (ITEMS[k]) S.inv[k] = (S.inv[k] || 0) + n;
    else if (WEAPONS[k]) { if (!S.weapons[k]) { S.weapons[k] = { star: 1 }; this.autoEquip(k); } }
    else if (ACCESSORIES[k]) S.accs[k] = (S.accs[k] || 0) + n;
    else if (ENGRAVES[k]) S.engr[k] = (S.engr[k] || 0) + n;
  }
  autoEquip(k) {
    const w = WEAPONS[k], m = this.state.party.find((p) => p.id === w.who);
    if (!m) return;
    const cur = WEAPONS[m.weapon] || {};
    if ((w.atk || 0) + (w.mag || 0) > (cur.atk || 0) + (cur.mag || 0)) {
      m.weapon = k;
      const slots = (w.slots || 0) + ((this.state.weapons[k]?.star || 1) >= 3 ? 1 : 0);
      m.engr = (m.engr || []).slice(0, slots);
      setTimeout(() => this.ui.toast(`${CHARS[m.id].name}換上了「${w.name}」`), 900);
    }
  }
  give(k, n = 1, gold = 0) {
    const out = [];
    if (gold) { this.state.gold += gold; out.push(`${gold} 銀貝`); }
    if (k) { this.addItem(k, n); out.push(`${nameOf(k)}${n > 1 ? ' ×' + n : ''}`); }
    if (out.length) { this.ui.toast(`得到了　<b style="color:var(--gold2)">${out.join('、')}</b>`); this.sound.sfx('coin'); }
  }
  useFieldItem(k, m) {
    const S = this.state, it = ITEMS[k];
    if (!it?.use || !(S.inv[k] > 0)) return false;
    if (it.use.heal) {
      const mx = this.maxHp(m);
      if (m.hp >= mx) { this.ui.toast('體力已經是滿的'); return false; }
      m.hp = Math.min(mx, m.hp + it.use.heal);
    } else { this.ui.toast('現在用不到'); return false; }
    S.inv[k]--; this.sound.sfx('heal'); this.ui.toast(`${CHARS[m.id].name}回復了體力`);
    return true;
  }
  // ---------------- 選單 ----------------
  openMenu() {
    if (this.titleMode || this.modal || this.active !== this.field || this.ui.menuEl) return;
    this.sound.sfx('ok');
    this.ui.openMenu();
  }
  onMenuClosed() { this.clampHp(); this.input.clear(); }
  // ---------------- 場景切換 ----------------
  async goto(mapId, at, dir = 'down', opts = {}) {
    const gen = this.gen;
    this.input.clear();
    this.ui.setActions([]);
    if (!this.ui.fadeEl.classList.contains('on')) await this.ui.fade(true, 380);
    if (gen !== this.gen) return;
    this.disposeField();
    this.state.map = mapId; this.state.pos = at; this.state.dir = dir;
    const f = new Field(this, mapId, at, dir);
    this.field = f; this.active = f;
    const def = f.def;
    this.ui.setLocation(def.name, f.world.phase && def.phaseToggle ? f.world.phase : def.phase);
    this.ui.setObjective(this.state.objective);
    if (def.bgm) this.sound.play(def.bgm); else if (def.bgm === null) this.sound.stopMusic(1.5);
    this.sound.amb(def.amb || null);
    f.update(0.016);
    if (def.enter) await this.runScript((S) => def.enter(S, this.state.flags, opts), true);
    if (gen !== this.gen) return;
    if (this.ui.fadeEl.classList.contains('on')) await this.ui.fade(false, 450);
    const seen = 'seen_' + mapId;
    if (!this.state.flags[seen]) { this.state.flags[seen] = 1; if (def.banner) this.ui.showBanner(def.name, def.en, 2600); }
    if (this.scriptDepth === 0 && this.active === this.field) { this.ui.showHud(true); this.autosave(); }
  }
  disposeField() {
    if (this.field) { this.field.dispose(); this.field = null; }
    this.moves = [];
  }
  // ---------------- 腳本 ----------------
  async runScript(fn, keepFade) {
    const gen = this.gen;
    this.scriptDepth++;
    this.ui.showHud(false); this.ui.setActions([]);
    const S = this.scriptApi(gen);
    try { await fn(S); }
    catch (e) { if (!(e && e.abort)) console.error(e); }
    finally {
      this.scriptDepth = Math.max(0, this.scriptDepth - 1);
      if (gen === this.gen && this.scriptDepth === 0) {
        if (this.field) { if (!this.field.keepCam) this.field.camOverride = null; this.field.enterGrace = Math.max(this.field.enterGrace, 0.5); }
        if (!keepFade && this.ui.fadeEl.classList.contains('on') && !this.overlay) await this.ui.fade(false, 400);
        if (this.active === this.field && !this.titleMode && !this.overlay) this.ui.showHud(true);
        this.input.clear();
        if (!this.titleMode) this.autosave();
      }
    }
  }
  scriptApi(gen) {
    const G = this;
    const chk = () => { if (gen !== G.gen) throw ABORT; };
    const F = () => G.field;
    const faded = () => G.ui.fadeEl.classList.contains('on');
    const actor = (id) => F()?.actorById(id);
    const S = {
      flag(k, v = 1) { chk(); G.state.flags[k] = v; },
      async card(a, b, c, ms) { chk(); await G.ui.card(a, b, c, ms); chk(); },
      bgm(n) { if (n) G.sound.play(n); else G.sound.stopMusic(1.6); },
      amb(k) { G.sound.amb(k); },
      sfx(n) { G.sound.sfx(n); },
      cam(x, z, zoom = 1) { const f = F(); if (!f) return; f.camOverride = { pos: V3(x, f.world.groundY(x, z), z), zoom }; if (faded()) f.camT.copy(f.camOverride.pos); },
      camFollow() { const f = F(); if (f) f.camOverride = null; },
      async fade(on, ms) { chk(); await G.ui.fade(on, ms); chk(); },
      async wait(ms) { chk(); await sleep(ms); chk(); },
      async say(name, text) { chk(); await G.ui.say(name, text); chk(); },
      async narr(text) {
        chk();
        const over = faded();
        if (over) G.ui.root.style.zIndex = 31;
        try { await G.ui.say(null, text); } finally { if (over) G.ui.root.style.zIndex = ''; }
        chk();
      },
      emote(id, t) {
        const a = actor(id); if (!a || !F()) return;
        const s = F().screen(a.position.clone().add(V3(0, (a.sheet.fh / 32) * a.mesh.scale.y + 0.25, 0)));
        G.ui.emote(s.x, s.y, t, 1300); G.sound.sfx(t === '！' ? 'weak' : 'tick');
      },
      shake(a = 0.2, t = 0.5) { if (G.settings.shake) G.shake = { a, t }; },
      flash(c = '#fff', ms = 300, a = 0.8) { G.ui.flash(c, ms, a); },
      spawn(o) { chk(); return G.spawnActor(o); },
      despawn(id) { G.despawnActor(id); },
      hide(id) { const a = actor(id); if (a) { a.group.visible = false; if (a.col) a.col.on = false; } },
      show(id, x, z) { const a = actor(id); if (!a) return; a.group.visible = true; if (x != null) a.position.set(x, F().world.groundY(x, z), z); if (a.col) { a.col.on = true; a.col.x = a.position.x; a.col.z = a.position.z; } },
      face(id, d) { const a = actor(id); if (a) a.dir = d; },
      move(id, x, z, sp = 2) { chk(); return G.moveActor(actor(id), x, z, sp); },
      async battle(enc, opts) { chk(); const r = await G.battle(enc, opts || {}); chk(); return r; },
      async goto(map, at, dir, opts) { chk(); await G.goto(map, at, dir, opts || {}); chk(); },
      join(id, lv) { chk(); G.join(id, lv); },
      objective(t) { G.state.objective = t; G.ui.setObjective(t); },
      log(t, d) { G.state.log.push({ t, d }); },
      toast(t) { G.ui.toast(t); },
      async choice(opts, prompt) { chk(); const i = await G.ui.choice(opts, prompt); chk(); return i; },
      async banner(a, b) { chk(); await G.ui.showBanner(a, b, 2400); chk(); },
      async tutorial(html) { chk(); await G.ui.tutorial(html); chk(); },
      px() { return F().player.position.x; },
      pz() { return F().player.position.z; },
      give(k, n = 1, gold = 0) { G.give(k, n, gold); },
      has(k) { return (G.state.inv[k] || 0) > 0; },
      take(k, n = 1) { G.state.inv[k] = Math.max(0, (G.state.inv[k] || 0) - n); },
      gold() { return G.state.gold; },
      addGold(n) { G.state.gold = Math.max(0, G.state.gold + n); },
      rest() { G.restAll(); },
      save() { G.save('auto'); },
      async shop(id) { chk(); await G.ui.shop(id); chk(); },
      flicker(on) { G.field?.lampFlicker(on); },
      beamPillar() { G.field?.beamPillar(); },
      async ending() { chk(); await G.ending(); },
    };
    return S;
  }
  spawnActor(o) {
    const f = this.field; if (!f) return null;
    let a;
    if (o.monster || o.art) {
      const sh = this.monsterSheet(o.art);
      a = new Actor(sh, f.pool, { scale: o.scale || (sh.human ? 1 : 0.62), baseline: sh.human ? 3 : 2, shadowSize: sh.human ? 0.9 : 1.2 });
      a.mat.uniforms.emissive.value = 1;
      a.isHuman = !!sh.human; a.fly = o.fly || 0;
      a.updateField = function (dt) {
        this.t += dt;
        this.setFrame(`idle${Math.floor(this.t * 2.5) % 2}`);
        this.flip = this.isHuman ? this.dir === 'right' : this.dir === 'left';
        this.mesh.position.y = this.fly ? 0.4 * this.fly + Math.sin(this.t * 3) * 0.12 : 0;
      };
    } else a = new Actor(this.sheet(o.cast), f.pool, { scale: o.scale || 1 });
    a.position.set(o.x, f.world.groundY(o.x, o.z), o.z);
    a.dir = o.dir || 'down';
    a.npc = { id: o.id, silent: true, ghost: true, fixedDir: true };
    a.scripted = true; a.home = a.position.clone();
    f.scene.add(a.group); f.npcs.push(a);
    a.updateField(0);
    return a;
  }
  despawnActor(id) {
    const f = this.field; if (!f) return;
    const a = f.npcs.find((n) => n.npc.id === id);
    if (!a) return;
    this.lastDespawn = a.position.clone();
    f.scene.remove(a.group);
    f.npcs = f.npcs.filter((n) => n !== a);
    if (a.col) a.col.on = false;
    this.moves = this.moves.filter((m) => { if (m.a === a) { m.res(); return false; } return true; });
  }
  moveActor(a, x, z, sp) {
    return new Promise((res) => {
      if (!a) { res(); return; }
      this.moves = this.moves.filter((m) => { if (m.a === a) { m.res(); return false; } return true; });
      a.scripted = true;
      this.moves.push({ a, x, z, sp, res });
    });
  }
  updateMoves(dt) {
    if (!this.moves.length || !this.field) return;
    const W = this.field.world;
    this.moves = this.moves.filter((m) => {
      const a = m.a, p = a.position;
      const dx = m.x - p.x, dz = m.z - p.z, L = Math.hypot(dx, dz), step = m.sp * dt;
      if (L <= step || L < 0.01) {
        p.x = m.x; p.z = m.z; p.y = W.groundY(p.x, p.z);
        a.moving = false;
        if (a === this.field.player || this.field.followers.includes(a) || !a.npc?.ghost) a.scripted = false;
        if (a.col) { a.col.x = p.x; a.col.z = p.z; }
        if (a.home) a.home.copy(p);
        if (a === this.field.player) this.field.resetTrail();
        m.res();
        return false;
      }
      p.x += (dx / L) * step; p.z += (dz / L) * step;
      p.y += (W.groundY(p.x, p.z) - p.y) * Math.min(1, dt * 12);
      a.moving = true;
      a.dir = Math.abs(dx) > Math.abs(dz) * 0.9 ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
      return true;
    });
  }
  join(id, lv) {
    const S = this.state;
    if (S.party.find((m) => m.id === id)) return;
    const L = Math.max(lv, S.party[0].lv);
    const w = DEFAULT_WEAPON[id];
    if (!S.weapons[w]) S.weapons[w] = { star: 1 };
    S.party.push({ id, lv: L, exp: 0, hp: statsAt(id, L).hp, weapon: w, acc: null, engr: [], ult: 0 });
    this.field?.addFollower(id, this.lastDespawn);
    this.sound.sfx('levelup');
  }
  // ---------------- 戰鬥 ----------------
  async battle(encId, opts = {}) {
    const gen = this.gen;
    const S = this.state;
    const snap = JSON.stringify({ party: S.party, inv: S.inv, meal: S.meal, gold: S.gold });
    this.input.clear(); this.ui.setActions([]); this.ui.showHud(false);
    const f = this.field;
    const o = { ...opts };
    if (f && !o.phase) o.phase = f.def.phaseToggle ? f.world.phase : f.def.phase;
    this.ui.flash('#ffffff', 260, 0.85);
    await sleep(160);
    await this.ui.fade(true, 260);
    if (gen !== this.gen) return 'load';
    let res;
    for (;;) {
      let bs = null;
      try {
        bs = new BattleScene(this, encId, o);
        this.active = bs;
        bs.update(0.016);
        await this.ui.fade(false, 320);
        res = await bs.run();
      } catch (e) {
        console.error(e);
        res = 'win';
      }
      await this.ui.fade(true, 420);
      try { bs?.dispose(); } catch (e) { /* 忽略 */ }
      this.ui.root.querySelectorAll('#bui').forEach((x) => x.remove());
      if (gen !== this.gen) return 'load';
      if (res === 'retry') { Object.assign(S, JSON.parse(snap)); this.restAll(); continue; }
      break;
    }
    if (res === 'load') { this.active = this.field; this.continueGame(); return 'load'; }
    this.active = this.field;
    this.renderer.r.shadowMap.needsUpdate = true;
    if (this.field) {
      const def = this.field.def;
      if (def.bgm) this.sound.play(def.bgm); else this.sound.stopMusic(1);
      this.field.enterGrace = 1.0;
      this.ui.setLocation(def.name, def.phaseToggle ? this.field.world.phase : def.phase);
    }
    await this.ui.fade(false, 420);
    if (this.scriptDepth === 0 && !this.overlay) { this.ui.showHud(true); this.autosave(); }
    return res;
  }
  // ---------------- 營火 ----------------
  async camp(it) {
    await this.runScript(async (S) => {
      const F = this.state.flags;
      S.sfx('heal');
      this.restAll();
      this.state.defeated[this.field.id] = [];
      await STORY.campTalk(S, F, it.id);
      for (;;) {
        const i = await S.choice(['料理', '記錄進度', '離開'], '營火很暖。大家的體力都恢復了。');
        if (i === 0) await this.ui.cook();
        else if (i === 1) { this.save('auto'); S.toast('已記錄在「自動存檔」'); }
        else break;
      }
    });
  }
  // ---------------- 釣魚 ----------------
  async fishing(f, spot) {
    await this.runScript(async (S) => {
      const ph = f.def.phaseToggle ? f.world.phase : f.def.phase || 'D';
      const table = (FISH[spot.pool] || FISH.cape)[ph] || FISH.cape.D;
      const P = f.player.position;
      S.sfx('splash');
      f.fx.billboard(f.fx.tex.ring, V3(P.x, f.world.sea + 0.06, P.z - 1.6), { w: 0.4, life: 0.8, grow: 3, color: '#cfe8ff', flat: true });
      await S.wait(900 + Math.random() * 1800);
      S.sfx('bite'); S.emote('wei', '！');
      let tot = 0; for (const [, w] of table) tot += w;
      let r = Math.random() * tot, fish = table[0][0];
      for (const [k, w] of table) { r -= w; if (r <= 0) { fish = k; break; } }
      const it = ITEMS[fish];
      const zone = it.rare ? 0.11 : it.sell >= 25 ? 0.17 : 0.25;
      const speed = it.rare ? 1.9 : it.sell >= 25 ? 1.45 : 1.1;
      const ok = await this.fishMeter(zone, speed);
      if (ok) {
        S.sfx('reel'); this.addItem(fish, 1);
        f.fx.emit({ pos: V3(P.x, P.y + 1.2, P.z), n: 20, colors: ['#cfe8ff', '#ffffff'], speed: 2, up: 1.5, life: 0.8, size: 0.08 });
        await S.say(null, `釣到了「${it.name}」！${it.rare ? '\n……傳說中的魚，居然真的有。' : ''}`);
      } else { S.sfx('miss'); await S.say(null, '……魚跑掉了。'); }
    });
  }
  fishMeter(zoneW, speed) {
    return new Promise((res) => {
      const box = h('div'); box.id = 'fish';
      box.innerHTML = '<div class="msg">上鉤了！看準時機按下</div><div class="meter"><div class="zone"></div><div class="needle"></div></div><button class="btn gold" style="min-width:150px;height:52px;font-size:17px">收竿</button>';
      const zone = box.querySelector('.zone'), needle = box.querySelector('.needle');
      const z0 = 0.15 + Math.random() * (0.7 - zoneW);
      zone.style.left = z0 * 100 + '%'; zone.style.width = zoneW * 100 + '%';
      this.ui.root.appendChild(box);
      let t = Math.random() * 3, done = false, raf;
      const t0 = performance.now();
      const pos = () => 0.5 + 0.5 * Math.sin(t * speed * 2.4);
      const step = () => {
        if (done) return;
        t += 1 / 60; needle.style.left = `calc(${pos() * 100}% - 2px)`;
        if (performance.now() - t0 > 6000) finish(false);
        else raf = requestAnimationFrame(step);
      };
      const finish = (ok) => { if (done) return; done = true; cancelAnimationFrame(raf); box.remove(); res(ok); };
      const hit = (e) => { e?.preventDefault?.(); const p = pos(); finish(p >= z0 && p <= z0 + zoneW); };
      box.querySelector('button').onclick = hit;
      step();
    });
  }
  // ---------------- 存檔 ----------------
  canSave() { return !this.titleMode && this.scriptDepth === 0 && this.active === this.field && !!this.field; }
  snapshot() {
    const S = this.state;
    if (this.field) {
      const p = this.field.player.position;
      S.pos = [Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100]; S.dir = this.field.player.dir; S.map = this.field.id; S.zoom = this.field.zoom;
    }
    return JSON.stringify(S);
  }
  save(slot = 'auto') {
    if (!this.field || this.titleMode) return false;
    const data = this.snapshot();
    store.set('slot.' + slot, data);
    store.set('meta.' + slot, JSON.stringify({ t: Date.now(), map: this.field.def.name, lv: this.state.party[0].lv, time: this.state.time, obj: this.state.objective }));
    store.set('last', slot);
    return true;
  }
  autosave() { if (this.canSave()) this.save('auto'); }
  slotInfo(slot) {
    let m = null; try { m = JSON.parse(store.get('meta.' + slot) || 'null'); } catch (e) { m = null; }
    if (!m) return null;
    const d = new Date(m.t), pad = (n) => String(n).padStart(2, '0');
    const hrs = Math.floor((m.time || 0) / 3600), mins = Math.floor(((m.time || 0) % 3600) / 60);
    return `${m.map}　Lv ${m.lv}　遊玩 ${hrs}:${pad(mins)}　${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  hasSave() { return !!store.get('slot.auto') || ['1', '2', '3'].some((s) => store.get('slot.' + s)); }
  async load(slot) {
    const raw = store.get('slot.' + slot);
    if (!raw) { this.ui.toast('這個欄位是空的'); return false; }
    return this.loadRaw(raw);
  }
  async loadRaw(raw) {
    let st;
    try { st = JSON.parse(raw); } catch (e) { return false; }
    if (!st || !st.party || !st.flags) return false;
    this.gen++;
    this.scriptDepth = 0; this.moves = [];
    this.closeOverlays();
    this.state = Object.assign(this.newState(), st);
    this.titleMode = false; this.removeTitle();
    await this.ui.fade(true, 500);
    await this.goto(this.state.map, this.state.pos, this.state.dir);
    return true;
  }
  continueGame() {
    const last = store.get('last');
    const slot = last && store.get('slot.' + last) ? last : store.get('slot.auto') ? 'auto' : ['1', '2', '3'].find((s) => store.get('slot.' + s));
    if (slot) this.load(slot); else this.toTitle();
  }
  exportCode() { return 'EVL1:' + btoa(unescape(encodeURIComponent(this.snapshot()))); }
  importCode(code) {
    try {
      const raw = decodeURIComponent(escape(atob(code.replace(/^EVL1:/, '').trim())));
      JSON.parse(raw);
      this.loadRaw(raw);
      return true;
    } catch (e) { return false; }
  }
  closeOverlays() {
    if (this.ui.menuEl) { this.ui.menuEl.remove(); this.ui.menuEl = null; }
    this.ui.root.querySelectorAll('#dialog, #choices, .overlay, .tut, #fish, #bui, #ending').forEach((e) => e.remove());
    this.ui.root.querySelectorAll('.pe').forEach((e) => { if (e.style.zIndex === '7') e.remove(); });
    this.ui.dialogOpen = false;
    this.ui.root.style.zIndex = '';
    this.overlay = null;
  }
  // ---------------- 標題 ----------------
  async toTitle(first) {
    this.gen++;
    this.scriptDepth = 0; this.moves = [];
    if (!first) await this.ui.fade(true, 600);
    this.closeOverlays();
    this.ui.showHud(false);
    this.titleMode = true;
    this.state = this.newState();
    this.disposeField();
    const f = new Field(this, 'cape', [13.5, 9], 'down');
    this.field = f; this.active = f;
    f.player.group.visible = false; for (const x of f.followers) x.group.visible = false;
    for (const n of f.npcs) n.group.visible = false;
    f.frozen = true;
    let ang = 0.35;
    f.camCustom = (cam, dt, R, focus) => {
      ang += dt * 0.025;
      const port = R.w < R.h;
      const a = Math.sin(ang) * 0.36 - 0.1;
      const tgt = V3(LHX, 0, LHZ + 1.2);
      const r = port ? 26 : 21;
      cam.fov = port ? 46 : 34;
      cam.position.set(tgt.x + Math.sin(a) * r, (port ? 4.0 : 4.6) + Math.sin(ang * 0.7) * 0.35, tgt.z + Math.cos(a) * r);
      // 橫拿：燈塔放右邊，左邊留給標題
      const side = port ? 0 : 5.2;
      cam.lookAt(tgt.x - Math.cos(a) * side, port ? 11.6 : 8.6, tgt.z + Math.sin(a) * side);
      focus.set(tgt.x, 3, tgt.z + 3);
      return r;
    };
    this.buildTitle();
    this.ui.root.style.zIndex = 21;
    this.ui.setActions([]);
    await sleep(60);
    await this.ui.fade(false, first ? 1400 : 900);
  }
  buildTitle() {
    this.removeTitle();
    const t = h('div'); t.id = 'title';
    t.innerHTML = `<div class="logo"><div class="zh">長明</div><div class="en">EVERLIGHT</div><div class="sub">守燈的人，站在晝與夜的交界</div></div>
      <div class="tap">輕觸畫面</div><div class="menu hide"></div><div class="ver">第一章　霧港與沉鐘</div>`;
    document.body.appendChild(t);
    this.titleEl = t;
    const menu = t.querySelector('.menu'), tap = t.querySelector('.tap');
    const open = () => {
      this.sound.init(); this.sound.setVol(this.settings.music, this.settings.sfx);
      if (this.sound.curName !== 'title') this.sound.play('title');
      this.sound.amb('waves');
      tap.classList.add('hide'); menu.classList.remove('hide');
      menu.innerHTML = '';
      const btn = (label, fn, gold) => { const b = h('button', 'btn' + (gold ? ' gold' : ''), label); b.onclick = (e) => { e.stopPropagation(); this.sound.sfx('ok'); fn(); }; menu.appendChild(b); return b; };
      if (this.hasSave()) btn('繼續旅程', () => { this.continueGame(); }, true);
      btn('新的旅程', async () => {
        if (this.hasSave()) { const i = await this.ui.choice(['開始新的旅程', '取消'], '自動存檔會被新的進度覆蓋（手動存的欄位不會）。'); if (i !== 0) return; }
        this.newGame();
      }, !this.hasSave());
      btn('匯入存檔碼', () => this.importDialog());
      btn('設定', () => this.titleSettings());
    };
    t.addEventListener('pointerup', () => { if (menu.classList.contains('hide')) open(); });
  }
  onCloud(changed) {
    if (changed && this.titleMode && this.titleEl) { const opened = !this.titleEl.querySelector('.menu').classList.contains('hide'); this.buildTitle(); if (opened) this.titleEl.querySelector('.tap')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
    this.cloudOn = true;
  }
  removeTitle() { if (this.titleEl) { this.titleEl.remove(); this.titleEl = null; } this.ui.root.style.zIndex = ''; }
  importDialog() {
    const ov = h('div', 'overlay pe'); const box = h('div', 'box panel orn');
    box.innerHTML = '<div class="head"><h3>匯入存檔碼</h3></div>';
    const ta = h('textarea'); ta.style.cssText = 'width:100%;height:110px;background:#0b0f18;color:#ddd;border:1px solid var(--line);border-radius:4px;font-size:12px;padding:6px';
    ta.placeholder = '把存檔碼貼在這裡';
    box.appendChild(ta);
    const row = h('div'); row.style.cssText = 'display:flex;gap:8px;margin-top:10px';
    const ok = h('button', 'btn gold', '匯入'); const no = h('button', 'btn', '取消');
    ok.onclick = () => { if (this.importCode(ta.value.trim())) { ov.remove(); } else this.ui.toast('存檔碼不正確'); };
    no.onclick = () => ov.remove();
    row.appendChild(ok); row.appendChild(no); box.appendChild(row);
    ov.appendChild(box); ov.style.zIndex = 25; document.body.appendChild(ov);
  }
  titleSettings() {
    const ov = h('div', 'overlay pe'); ov.style.zIndex = 25;
    const box = h('div', 'box panel orn'); box.style.maxHeight = '86vh'; box.style.overflow = 'auto';
    const render = () => { box.innerHTML = '<div class="head"><h3>設定</h3></div>'; this.ui.tab_settings(box); const c = h('button', 'btn gold', '完成'); c.style.cssText = 'width:100%;margin-top:12px'; c.onclick = () => { ov.remove(); delete this.ui.menuTab; }; box.appendChild(c); };
    this.ui.menuTab = () => render();
    render();
    ov.appendChild(box); document.body.appendChild(ov);
  }
  async newGame() {
    this.gen++;
    this.removeTitle();
    this.titleMode = false;
    this.state = this.newState();
    this.sound.stopMusic(2);
    await this.ui.fade(true, 1200);
    await this.goto('cape', this.state.pos, this.state.dir);
  }
  // ---------------- 結尾 ----------------
  async ending() {
    const S = this.state;
    S.objective = '第二章「夜邦」製作中——可以繼續探索、釣魚、挑戰魔物';
    S.map = 'cape'; S.pos = [12.5, 12.6]; S.dir = 'down';
    store.set('slot.auto', JSON.stringify(S));
    store.set('meta.auto', JSON.stringify({ t: Date.now(), map: '孤燈岬', lv: S.party[0].lv, time: S.time, obj: S.objective }));
    store.set('last', 'auto');
    this.sound.play('title');
    const hrs = Math.floor(S.time / 3600), mins = Math.floor((S.time % 3600) / 60);
    const fish = Object.keys(S.inv).filter((k) => ITEMS[k]?.fish).length;
    const ov = h('div', 'pe'); ov.id = 'ending';
    ov.innerHTML = `<div class="e1">長明　EVERLIGHT</div><div class="e2">第一章　霧港與沉鐘　完</div>
      <div class="e3">遊玩時間 ${hrs}:${String(mins).padStart(2, '0')}　·　魏子葳 Lv ${S.party[0].lv}　·　圖鑑 ${Object.keys(S.bestiary).length} 種${fish ? `　·　魚 ${fish} 種` : ''}</div>
      <div class="e4">光柱直指天頂，不再旋轉。<br>七天之後，黑帆艦隊會回來。<br>而夜邦的盡頭，有第一位燈守的墓。</div>
      <div class="e5">第二章「夜邦」製作中　·　感謝遊玩</div>
      <div class="eb"><button class="btn gold">繼續探索</button><button class="btn">回到標題</button></div>`;
    document.body.appendChild(ov);
    this.overlay = ov;
    this.ui.showHud(false);
    await this.ui.fade(false, 900);
    const choice = await new Promise((res) => { const [a, b] = ov.querySelectorAll('button'); a.onclick = () => res(0); b.onclick = () => res(1); });
    this.sound.sfx('ok');
    await this.ui.fade(true, 700);
    ov.remove(); this.overlay = null;
    if (choice === 1) { this.toTitle(); throw ABORT; }
    this.gen++;
    this.scriptDepth = 0;
    this.loadRaw(JSON.stringify(S));
    throw ABORT;
  }
}
const LHX = 13.5, LHZ = 4.3;
