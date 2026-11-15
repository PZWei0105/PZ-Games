// 火樹銀花 SKYBLOOM：主程式
import * as THREE from 'three';
import { Renderer } from './render.js';
import { U } from './glow.js';
import { Sky, Snow, MOODS } from './sky.js';
import { Park, L } from './park.js';
import { Wheel } from './wheel.js';
import { Coaster } from './coaster.js';
import { Carousel, Swing, Tower } from './rides.js';
import { Castle } from './castle.js';
import { Fireworks, SHELLS, COLORS } from './fireworks.js';
import { Sound } from './audio.js';
import { ShowPlayer, Recorder, grandShow, BAR, SHOW_BARS } from './show.js';
import { Rig } from './camera.js';
import { isMobile, store, rnd, pick, clamp, hsv, lerp, TAU } from './util.js';

// ───────── 畫質 ─────────
const TIERS = {
  low: { tier: 'low', render: 'low', fw: { max: 7000, k: 0.5, trail: 0.45, smoke: 130 }, snow: 900 },
  mid: { tier: 'mid', render: 'mid', fw: { max: 17000, k: 0.75, trail: 0.7, smoke: 280 }, snow: 1800 },
  high: { tier: 'high', render: 'high', fw: { max: 40000, k: 1, trail: 1, smoke: 520 }, snow: 3200 },
};
const settings = { quality: store.get('quality', 'auto'), music: store.get('music', true), sfx: store.get('sfx', true), vol: store.get('vol', 0.85), auto: store.get('auto', true), fps: store.get('fps', false), mood: store.get('mood', 'night'), shell: store.get('shell', 'chrys'), color: store.get('color', 'random'), text: store.get('text', '火樹銀花') };
const mobile = isMobile();
const autoTier = mobile ? 'mid' : 'high';
const q = { ...TIERS[settings.quality === 'auto' ? autoTier : settings.quality] };
q.fw = { ...q.fw };

// ───────── 場景 ─────────
const $ = (s) => document.querySelector(s);
const app = $('#app');
let R;
try { R = new Renderer(app); } catch (e) {
  $('#title').innerHTML = '<div class="tt-main" style="font-size:44px">火樹銀花</div><div class="tt-sub" style="letter-spacing:.1em;line-height:1.8">這台裝置的瀏覽器不支援 3D 畫面（WebGL2）。<br>請改用最新版的 Chrome 或 Safari 開啟。</div>';
  throw e;
}
R.setQuality(q.render);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
scene.fog = new THREE.FogExp2(0x0a1022, 0.0016);
const hemi = new THREE.HemisphereLight(0x3a4f8a, 0x0b0d14, 0.55);
const moon = new THREE.DirectionalLight(0xaabbff, 0.55);
moon.position.set(180, 170, -300);
scene.add(hemi, moon);

const sound = new Sound();
sound.vol = settings.vol; sound.sfxOn = settings.sfx; sound.musicOn = settings.music;
const sky = new Sky(scene);
const snow = new Snow(scene, q.snow);
const park = new Park(scene, q);
const wheel = new Wheel(scene, L.wheel, q);
const coaster = new Coaster(scene, L.coaster, q, U);
const carousel = new Carousel(scene, L.carousel, q);
const swing = new Swing(scene, L.swing, q);
const tower = new Tower(scene, L.tower, q, U);
const castle = new Castle(scene, L.castle, q);
const fw = new Fireworks(scene, q, sound);
fw.text = settings.text;
const player = new ShowPlayer(fw);
const rec = new Recorder();
const rig = new Rig(camera, R.r.domElement);

// ───────── 場景氣氛（夜晚／黃昏／雪夜／極光）─────────
let moodFrom = MOODS[settings.mood] || MOODS.night, moodTo = moodFrom, moodK = 1;
function applyMood(a, b, k) {
  sky.blend(a, b, k);
  const c = new THREE.Color(), c2 = new THREE.Color();
  const mixC = (key, target) => { c.set(a[key]); c2.set(b[key]); target.copy(c).lerp(c2, k); };
  mixC('fog', scene.fog.color); scene.fog.density = lerp(a.fogD, b.fogD, k);
  mixC('hemiSky', hemi.color); mixC('hemiGround', hemi.groundColor); hemi.intensity = lerp(a.hemi, b.hemi, k);
  moon.intensity = lerp(a.moonLight, b.moonLight, k);
  mixC('lake', park.waterMat.color);
  U.uSnow.value = lerp(a.snow, b.snow, k);
  park.mountains.material.color.copy(scene.fog.color).multiplyScalar(0.55);
  const sd = new THREE.Vector3(...b.sunDir);
  if (b.sunSize > 0) { moon.position.copy(sd).multiplyScalar(300); moon.color.set('#ffb380'); } else { moon.position.copy(sky.u.uMoonDir.value).multiplyScalar(300); moon.color.set('#aabbff'); }
}
function setMood(key, instant) {
  const m = MOODS[key]; if (!m) return;
  moodFrom = instant ? m : currentMoodSnapshot(); moodTo = m; moodK = instant ? 1 : 0;
  settings.mood = key; store.set('mood', key);
  sound.setWeather && sound.ctx && sound.setWeather(m.snow > 0);
  updateMoodBtn();
}
function currentMoodSnapshot() {
  // 過渡中途換：用目前的顏色當起點
  if (moodK >= 1) return moodTo;
  const s = {}; const c = new THREE.Color();
  for (const k of Object.keys(moodTo)) {
    const a = moodFrom[k], b = moodTo[k];
    if (typeof a === 'string' && a.startsWith('#')) s[k] = '#' + c.set(a).lerp(new THREE.Color(b), moodK).getHexString();
    else if (typeof a === 'number') s[k] = lerp(a, b, moodK);
    else if (Array.isArray(a)) s[k] = a.map((v, i) => lerp(v, b[i], moodK));
    else s[k] = b;
  }
  return s;
}
applyMood(moodFrom, moodTo, 1);

// ───────── 尺寸 ─────────
function resize() {
  const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 62 : 52;
  camera.updateProjectionMatrix();
  R.resize();
  U.uScale.value = R.H / (2 * Math.tan((camera.fov * Math.PI) / 360));
  U.uMax.value = Math.max(64, R.H * 0.12);
}
addEventListener('resize', resize);
resize();
rig.dist *= rig.aspectK();

// ───────── 放煙火：點到的方向 → 天上的一個點 ─────────
const ray = new THREE.Raycaster();
function skyPoint(x, y) {
  const rect = R.r.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  // 距離：跟「煙火區」（湖的北邊上空）差不多遠，但不要太近
  const stage = new THREE.Vector3(0, 95, L.stage.z);
  let dist = clamp(o.distanceTo(stage), 90, 260);
  if (ride) dist = clamp(dist, 110, 230);
  const p = o.clone().addScaledVector(d, dist);
  if (p.y < 40) {
    if (d.y > 0.04) p.copy(o).addScaledVector(d, (45 - o.y) / d.y);
    if (p.y < 40 || o.distanceTo(p) > 340) { const hd = new THREE.Vector3(d.x, 0, d.z).normalize(); p.copy(o).addScaledVector(hd, dist); p.y = Math.max(45, o.y + 25); }
  }
  p.y = clamp(p.y, 40, 165);
  p.x = clamp(p.x, -330, 330); p.z = clamp(p.z, -340, 300);
  return p;
}
function nowT() { return performance.now() / 1000; }
function fire(x, y, jitter = 0) {
  const p = skyPoint(x, y);
  if (jitter) { p.x += rnd(-jitter, jitter); p.y += rnd(-jitter * 0.5, jitter * 0.5); p.z += rnd(-jitter, jitter); }
  const type = settings.shell === 'mix' ? pick(['chrys', 'peony', 'willow', 'ring', 'palm', 'crackle']) : settings.shell;
  fw.launch(type, settings.color, p, { text: settings.text });
  if (rec.on) rec.add(nowT(), type, settings.color, p, type === 'text' ? settings.text : undefined);
  lastUser = 0;
  hideHint();
}
let holdTimer = null, holdPos = null, lastUser = 99;
rig.onTap = (x, y) => { if (!started) return; fire(x, y); };
rig.onHold = (x, y) => {
  if (!started) return;
  holdPos = { x, y };
  haptic();
  const shoot = () => { fire(holdPos.x, holdPos.y, 26); holdTimer = setTimeout(shoot, { low: 260, mid: 170, high: 120 }[q.tier] * rnd(0.8, 1.2)); };
  shoot();
};
rig.onHoldMove = (x, y) => { holdPos = { x, y }; };
rig.onHoldEnd = () => { clearTimeout(holdTimer); holdTimer = null; };
function haptic() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* */ } }

// ───────── 自動放煙火 ─────────
let autoT = 3;
const AUTO_TYPES = ['chrys', 'chrys', 'peony', 'peony', 'willow', 'kamuro', 'palm', 'ring', 'crossette', 'crackle', 'strobe', 'heart', 'multi', 'saturn', 'star'];
function autoFire(dt) {
  if (!settings.auto || player.active || rec.on || !started) return;
  autoT -= dt;
  if (autoT > 0) return;
  const cine = !!rig.cinema;
  autoT = (cine ? rnd(1.2, 3.2) : rnd(2.6, 6.5)) * (lastUser < 8 ? 2.2 : 1);
  const salvo = Math.random() < 0.22 ? 3 : Math.random() < 0.3 ? 2 : 1;
  const type = pick(AUTO_TYPES);
  const cx = rnd(-75, 75);
  for (let i = 0; i < salvo; i++) {
    const p = { x: cx + (i - (salvo - 1) / 2) * 34 + rnd(-6, 6), y: rnd(75, 130), z: L.stage.z + rnd(-20, 20) };
    setTimeout(() => fw.launch(salvo > 1 ? type : pick(AUTO_TYPES), 'random', p), i * 140);
  }
}

// ───────── 遊樂設施：乘坐 ─────────
let ride = null, rideView = 0, lastTowerPhase = '';
const RIDES = {
  coaster: { name: '流星號 雲霄飛車', short: '雲霄飛車', en: 'METEOR COASTER', desc: '真實重力・垂直迴圈', bg: 'linear-gradient(135deg,#ff2d6f,#7a1fff)' },
  wheel: { name: '星環 摩天輪', short: '摩天輪', en: 'STAR RING', desc: '最好的煙火觀賞位', bg: 'linear-gradient(135deg,#ff7ad9,#3a6bff)' },
  tower: { name: '墜星塔 自由落體', short: '自由落體', en: 'STARFALL', desc: '57 公尺・三秒墜落', bg: 'linear-gradient(135deg,#ffb23a,#ff3a5c)' },
};
const saved = { target: new THREE.Vector3(), yaw: 0, pitch: 0, dist: 0 };
let fadeT = 0, fadeDir = 0, fadeCb = null;
function fadeThen(cb) { fadeDir = 1; fadeCb = cb; }
function startRide(kind) {
  if (ride === kind) return;
  sound.ui('open');
  fadeThen(() => {
    closeTray();
    if (!ride) { saved.target.copy(rig.target); saved.yaw = rig.yaw; saved.pitch = rig.pitch; saved.dist = rig.dist; }
    ride = kind; rideView = 0;
    rig.mode = 'ride'; rig.cinema = null; setCine(false);
    rig.look.yaw = 0; rig.look.pitch = kind === 'wheel' ? 0.15 : 0;
    if (kind === 'coaster' && coaster.state === 'dwell') coaster.timer = Math.min(coaster.timer, 3.2);
    $('#hud').classList.add('ghost'); setTimeout(() => $('#hud').classList.add('hide'), 300);
    $('#rideHud').classList.remove('hide');
    $('#rideName').textContent = RIDES[kind].name;
    $('#viewBtn').classList.toggle('hide', kind !== 'coaster');
    $('#lookTip').style.opacity = 1; setTimeout(() => { $('#lookTip').style.opacity = 0; }, 4500);
    rideStatHtml(kind);
    coaster.firstPerson(kind === 'coaster'); wheel.hide = kind === 'wheel' ? wheel.bestCab() : -1;
  });
}
function exitRide() {
  if (!ride) return;
  sound.ui('close');
  fadeThen(() => {
    ride = null; rig.mode = 'orbit'; coaster.firstPerson(false); wheel.hide = -1;
    rig.target.copy(saved.target); rig.yaw = saved.yaw; rig.pitch = saved.pitch; rig.dist = saved.dist;
    $('#rideHud').classList.add('hide');
    $('#hud').classList.remove('hide'); requestAnimationFrame(() => $('#hud').classList.remove('ghost'));
    sound.rideUpdate(0, 0, false, null);
  });
}
function rideStatHtml(kind) {
  const cells = kind === 'coaster' ? [['spd', '時速 km'], ['alt', '高度 m'], ['g', 'G 力']] : kind === 'tower' ? [['alt', '高度 m'], ['spd', '時速 km'], ['g', 'G 力']] : [['alt', '高度 m'], ['lap', '一圈']];
  $('#rideStat').innerHTML = cells.map(([id, l]) => `<div><b id="rs-${id}">0</b><small>${l}</small></div>`).join('');
}
const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
const chase = new THREE.Vector3(), chaseL = new THREE.Vector3();
let gSm = 1;
function rideCamera(dt) {
  const look = rig.look;
  if (!rig.ptr.size && ride === 'coaster') { look.yaw *= Math.pow(0.15, dt); look.pitch *= Math.pow(0.15, dt); }
  if (ride === 'coaster') {
    const s = coaster.s + 0.45; // 第一排座位
    coaster.frame(s, tmpP, tmpT, tmpN);
    if (rideView === 0) {
      const eye = tmpP.clone().addScaledVector(tmpN, 1.5);
      coaster.frame(s + 7, tmpA);
      const ahead = tmpA.clone().addScaledVector(tmpN, 1.2);
      const dir = ahead.sub(eye).normalize().lerp(tmpT, 0.35).normalize();
      // 速度越快鏡頭越抖
      const shake = Math.min(1, coaster.v / 30) * 0.035;
      eye.x += (Math.random() - 0.5) * shake; eye.y += (Math.random() - 0.5) * shake;
      tmpM.lookAt(eye, eye.clone().add(dir), tmpN);
      camera.position.copy(eye);
      camera.quaternion.setFromRotationMatrix(tmpM);
    } else {
      coaster.frame(s - 25, tmpA);
      const want = tmpA.clone().add(new THREE.Vector3(0, 13, 0)).addScaledVector(tmpT, -4);
      if (chase.lengthSq() === 0) chase.copy(want);
      chase.lerp(want, 1 - Math.exp(-dt * 2.5));
      chaseL.lerp(tmpP, 1 - Math.exp(-dt * 6));
      camera.position.copy(chase); camera.lookAt(chaseL);
    }
    const kmh = coaster.v * 3.6, g = coaster.gforce();
    gSm += (g - gSm) * Math.min(1, dt * 6);
    setStat('spd', kmh.toFixed(0)); setStat('alt', tmpP.y.toFixed(0)); setStat('g', gSm.toFixed(1));
    const ge = $('#rs-g'); if (ge) ge.style.color = gSm > 3 ? '#ff6a8a' : gSm < 0.3 ? '#7fe8ff' : '';
    sound.rideUpdate(dt, coaster.v, coaster.inLift(coaster.s), 'coaster');
  } else if (ride === 'wheel') {
    wheel.cabPos(Math.max(0, wheel.hide), tmpP); tmpP.z -= 3.6; tmpP.y -= 1.05; wheel.grp.localToWorld(tmpP); // 坐在輪子北側外面：看湖、星辰宮與煙火不會被輻條擋住
    camera.position.copy(tmpP);
    const base = Math.atan2(-(10 - tmpP.x), -(L.stage.z - tmpP.z));
    const e = new THREE.Euler(look.pitch, base + look.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(e);
    setStat('alt', tmpP.y.toFixed(0));
    const lap = ((-wheel.angle) / TAU) % 1; setStat('lap', Math.round(lap * 100) + '%');
    sound.rideUpdate(dt, 0, false, 'wheel');
  } else if (ride === 'tower') {
    const a = tower.seatAng;
    tmpP.set(L.tower.x + Math.cos(a) * 4.35, tower.y + 0.55, L.tower.z + Math.sin(a) * 4.35);
    const shake = Math.min(1, Math.abs(tower.vy) / 30) * 0.05;
    tmpP.x += (Math.random() - 0.5) * shake; tmpP.y += (Math.random() - 0.5) * shake;
    camera.position.copy(tmpP);
    const e = new THREE.Euler(-0.12 + look.pitch + (tower.vy < -5 ? -0.25 : 0), Math.atan2(-Math.cos(a), -Math.sin(a)) + look.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(e);
    const g = 1 + (tower.vy - (tower.prevVy || 0)) / Math.max(dt, 1e-3) / 9.81;
    tower.prevVy = tower.vy;
    gSm += (clamp(g, -0.2, 4.5) - gSm) * Math.min(1, dt * 5);
    setStat('alt', tower.y.toFixed(0)); setStat('spd', (Math.abs(tower.vy) * 3.6).toFixed(0)); setStat('g', gSm.toFixed(1));
    const phase = tower.t < 24 ? 'up' : 'drop';
    if (phase === 'drop' && lastTowerPhase === 'up') { sound.clunk(); haptic(); }
    lastTowerPhase = phase;
    sound.rideUpdate(dt, Math.abs(tower.vy), tower.t > 6 && tower.t < 20, 'tower');
  }
}
function setStat(id, v) { const e = document.getElementById('rs-' + id); if (e && e.textContent !== String(v)) e.textContent = v; }

// ───────── 煙火秀 ─────────
let show = null; // { kind: 'grand'|'mine', t0, len, name }
function showNow() { return show ? (show.audio && sound.ctx ? sound.ctx.currentTime - show.t0 : clockT() - show.t0) : 0; }
function clockT() { return window.__simClock ? t : nowT(); }
function startGrand() {
  stopShow(true);
  closeTray();
  const ev = grandShow(q.fw.k);
  let t0;
  if (sound.ctx && sound.ctx.state === 'running' && settings.music && !window.__simClock) { t0 = sound.startShow(); show = { kind: 'grand', t0, audio: true }; }
  else { show = { kind: 'grand', t0: clockT() + 0.2, audio: false }; }
  show.len = (SHOW_BARS + 1) * BAR + 4;
  show.name = '大會煙火秀';
  player.play(ev, { timing: 'burst', length: show.len });
  if (!ride && !rig.cinema) rig.flyTo(new THREE.Vector3(0, 96, -172), 0.03, -0.17, 205 * rig.aspectK());
  banner();
  toast('🎆 大會煙火秀開始');
}
function playMine(s) {
  stopShow(true); closeTray();
  show = { kind: 'mine', t0: clockT() + 0.3, audio: false, len: s.len + 6, name: s.name };
  player.play(s.ev, { timing: 'launch', length: s.len + 6 });
  banner();
}
function stopShow(silent) {
  if (!show) return;
  player.stop();
  if (show.kind === 'grand' && sound.mode === 'show') sound.setMode('park');
  show = null; banner();
  if (!silent) toast('煙火秀已停止');
}
function startRec() {
  stopShow(true); closeTray();
  let n = 3;
  const cnt = $('#count');
  const tick = () => {
    if (n === 0) { rec.start(nowT()); banner(); sound.ui('rec'); return; }
    cnt.textContent = n; cnt.classList.remove('go'); void cnt.offsetWidth; cnt.classList.add('go'); sound.ui('tap'); n--; setTimeout(tick, 800);
  };
  tick();
}
function stopRec() {
  const r = rec.stop(nowT());
  banner();
  if (!r.ev.length) { toast('沒有放任何煙火，沒有存下來'); return; }
  const s = Recorder.save(r);
  toast(`已存成「${s.name}」`);
  sound.ui('start');
  if (tab === 'show') renderTray();
}
function banner() {
  const b = $('#banner');
  if (rec.on) { b.innerHTML = `<span class="dot"></span><span>錄製中 <b id="recT">0:00</b></span><button id="recStop">停止並儲存</button>`; b.classList.remove('hide'); $('#recStop').onclick = stopRec; }
  else if (show) { b.innerHTML = `<span>${show.name}</span><span class="bar"><i id="showBar"></i></span><button id="showStop">停止</button>`; b.classList.remove('hide'); $('#showStop').onclick = () => stopShow(); }
  else b.classList.add('hide');
}

// ───────── 介面 ─────────
let tab = 'fire', trayOpen = false, started = false;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
function hideHint() { $('#hint').classList.add('out'); }
function closeTray() { trayOpen = false; $('#tray').classList.add('closed'); }
function openTray(t) {
  tab = t; trayOpen = true;
  document.querySelectorAll('#dock button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  renderTray();
  $('#tray').classList.remove('closed');
}
document.querySelectorAll('#dock button').forEach((b) => b.addEventListener('click', () => {
  sound.ui('tap');
  if (tab === b.dataset.tab && trayOpen) { closeTray(); return; }
  openTray(b.dataset.tab);
}));
const COLOR_BG = { random: 'conic-gradient(#ff4a5c,#ffc85a,#5fe6ff,#b06bff,#ff4a5c)', rainbow: 'linear-gradient(90deg,#ff3a3a,#ffb43a,#ffe95a,#5aff7a,#5ae6ff,#7a6bff,#e05aff)' };
function colorCss(c) { if (COLOR_BG[c.id]) return COLOR_BG[c.id]; const [r, g, b] = c.c.map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)); return `rgb(${r},${g},${b})`; }
function renderTray() {
  const tr = $('#tray');
  if (tab === 'fire') {
    tr.innerHTML = `<div class="pane"><div class="row" id="shells">${SHELLS.map((s) => `<button class="shell${settings.shell === s.id ? ' on' : ''}" data-s="${s.id}"><canvas width="88" height="88"></canvas><span>${s.name}</span></button>`).join('')}</div>
      <div class="colors">${COLORS.map((c) => `<button class="col${settings.color === c.id ? ' on' : ''}" data-c="${c.id}" style="background:${colorCss(c)}">${c.id === 'random' || c.id === 'rainbow' ? c.name : ''}</button>`).join('')}</div>
      ${settings.shell === 'text' ? `<div class="txt"><input id="txtIn" maxlength="10" value="${settings.text.replace(/"/g, '&quot;')}" placeholder="想在天上寫什麼？"><small>最多 10 個字</small></div>` : ''}</div>`;
    tr.querySelectorAll('.shell').forEach((b) => {
      drawIcon(b.querySelector('canvas'), b.dataset.s);
      b.onclick = () => { settings.shell = b.dataset.s; store.set('shell', settings.shell); sound.ui('pick'); renderTray(); if (b.dataset.s === 'text') setTimeout(() => $('#txtIn') && $('#txtIn').focus(), 50); };
    });
    tr.querySelectorAll('.col').forEach((b) => { b.onclick = () => { settings.color = b.dataset.c; store.set('color', settings.color); sound.ui('pick'); tr.querySelectorAll('.col').forEach((x) => x.classList.toggle('on', x === b)); }; });
    const ti = $('#txtIn');
    if (ti) {
      ti.addEventListener('input', () => { settings.text = ti.value.trim() || '火樹銀花'; fw.text = settings.text; store.set('text', settings.text); });
      ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') ti.blur(); e.stopPropagation(); });
      ti.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    const on = tr.querySelector('.shell.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  } else if (tab === 'rides') {
    tr.innerHTML = `<div class="pane"><div class="rides">${Object.entries(RIDES).map(([k, r]) => `<button class="ride" data-r="${k}" style="--bg:${r.bg}"><em>${r.en}</em><b>${r.short}</b><small>${r.desc}</small></button>`).join('')}</div></div>`;
    tr.querySelectorAll('.ride').forEach((b) => { b.onclick = () => { closeTray(); startRide(b.dataset.r); }; });
  } else {
    const mine = Recorder.list();
    tr.innerHTML = `<div class="pane"><button class="big" id="grand"><span class="ic"><svg class="i" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span><b>大會煙火秀</b><small>七十多秒 · 配樂對拍 · 終章一整片天空</small></span></button>
      <button class="big rec" id="recBtn"><span class="ic"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#ff4a5c" stroke="none"/></svg></span><span><b>錄製我的煙火秀</b><small>倒數後開始，你點的每一發都會記下來</small></span></button>
      <div class="mine">${mine.length ? mine.map((s) => `<div class="it"><b>${s.name}<small>${s.date} · ${s.len} 秒 · ${s.ev.length} 發</small></b><button class="go" data-p="${s.id}">播放</button><button data-d="${s.id}">✕</button></div>`).join('') : '<div class="empty">還沒有錄過自己的煙火秀</div>'}</div></div>`;
    $('#grand').onclick = () => { sound.ui('start'); startGrand(); };
    $('#recBtn').onclick = () => startRec();
    tr.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { const s = Recorder.list().find((x) => x.id === +b.dataset.p); if (s) { sound.ui('start'); playMine(s); } }; });
    tr.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (b.dataset.sure) { Recorder.remove(+b.dataset.d); renderTray(); } else { b.dataset.sure = 1; b.textContent = '刪除？'; } }; });
  }
}
// 每種煙火的小圖示
function drawIcon(cv, id) {
  const g = cv.getContext('2d'), W = cv.width, c = W / 2;
  g.clearRect(0, 0, W, W);
  g.globalCompositeOperation = 'lighter';
  const dot = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, TAU); g.fill(); };
  const hc = (h, a = 1) => { const [r, gg, b] = hsv(h, 0.75, 1).map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)); return `rgba(${r},${gg},${b},${a})`; };
  const ring = (n, R, col, sz = 2.2) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU; dot(c + Math.cos(a) * R, c + Math.sin(a) * R, sz, typeof col === 'function' ? col(i) : col); } };
  const shapePts = (pts, R, col) => pts.forEach(([u, v]) => dot(c + u * R, c - v * R, 2, col));
  switch (id) {
    case 'chrys': for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; for (let k = 1; k <= 5; k++) dot(c + Math.cos(a) * k * 6, c + Math.sin(a) * k * 6, 1.2 + k * 0.2, `rgba(255,${150 + k * 15},80,${0.25 + k * 0.12})`); } break;
    case 'peony': ring(22, 30, (i) => hc(i / 22)); ring(12, 16, 'rgba(255,255,255,.8)'); break;
    case 'willow': for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; for (let k = 0; k < 10; k++) { const t = k / 10; dot(c + Math.cos(a) * 24 * t, c - 8 + Math.sin(a) * 18 * t + t * t * 26, 1.3, 'rgba(255,170,60,.6)'); } } break;
    case 'kamuro': for (let i = 0; i < 70; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 32; dot(c + Math.cos(a) * r, c + Math.sin(a) * r * 0.8 + r * 0.25, 1.4, 'rgba(255,215,140,.7)'); } break;
    case 'palm': for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; for (let k = 0; k < 12; k++) { const t = k / 12; dot(c + Math.cos(a) * 30 * t, c + 6 + Math.sin(a) * 28 * t + t * t * 14, 2 - t, 'rgba(255,190,90,.7)'); } } for (let k = 0; k < 8; k++) dot(c, c + 8 + k * 4, 1.5, 'rgba(255,190,90,.6)'); break;
    case 'ring': for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU; dot(c + Math.cos(a) * 30, c + Math.sin(a) * 12, 2, hc(0.55)); } dot(c, c, 4, '#fff'); break;
    case 'heart': { const p = []; for (let i = 0; i < 34; i++) { const t = (i / 34) * TAU; p.push([(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); } shapePts(p, 30, 'rgba(255,80,160,.9)'); break; }
    case 'star': { const V = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.42 : 1; V.push([Math.cos(a) * r, Math.sin(a) * r]); } const p = []; for (let i = 0; i < 40; i++) { const f = (i / 40) * 10, e = Math.floor(f), t = f - e, A = V[e], B = V[(e + 1) % 10]; p.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } shapePts(p, 32, 'rgba(120,230,255,.9)'); break; }
    case 'saturn': ring(14, 12, 'rgba(255,200,120,.9)', 2); for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU; dot(c + Math.cos(a) * 32, c + Math.sin(a) * 9 - Math.cos(a) * 6, 1.8, 'rgba(160,140,255,.9)'); } break;
    case 'smile': ring(26, 30, 'rgba(255,220,90,.9)', 1.8); dot(c - 10, c - 8, 3, '#ffd85a'); dot(c + 10, c - 8, 3, '#ffd85a'); for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + (i / 8) * 0.7); dot(c + Math.cos(a) * 17, c + Math.sin(a) * 17, 1.6, '#ffd85a'); } break;
    case 'crossette': for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, x = c + Math.cos(a) * 20, y = c + Math.sin(a) * 20; for (let k = 0; k < 4; k++) dot(c + Math.cos(a) * k * 5, c + Math.sin(a) * k * 5, 1.2, 'rgba(255,200,100,.5)'); for (let j = 0; j < 4; j++) { const b = a + Math.PI / 4 + (j / 4) * TAU; dot(x + Math.cos(b) * 9, y + Math.sin(b) * 9, 1.6, 'rgba(255,230,160,.9)'); } } break;
    case 'crackle': for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, r = 10 + Math.random() * 24; dot(c + Math.cos(a) * r, c + Math.sin(a) * r, Math.random() < 0.3 ? 2.6 : 1.2, Math.random() < 0.3 ? '#fff' : 'rgba(255,190,90,.8)'); } break;
    case 'strobe': for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, r = Math.random() * 32; if (Math.random() < 0.5) dot(c + Math.cos(a) * r, c + Math.sin(a) * r, 2.4, 'rgba(230,240,255,.95)'); } break;
    case 'multi': for (const [x, y, h] of [[-16, -12, 0], [14, -14, 0.3], [-4, 10, 0.6], [18, 12, 0.8], [-20, 14, 0.15]]) for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; dot(c + x + Math.cos(a) * 9, c + y + Math.sin(a) * 9, 1.4, hc(h)); } break;
    case 'text': g.globalCompositeOperation = 'source-over'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff9ad6'; g.shadowBlur = 10; g.fillStyle = '#ffe6f4'; g.fillText('字', c, c + 2); break;
  }
}

// 場景選單
const MOOD_BG = { night: 'linear-gradient(180deg,#03050f,#1d2c55)', dusk: 'linear-gradient(180deg,#14204a,#5a3a7a 50%,#ff8a4c)', snow: 'linear-gradient(180deg,#0b1020,#3c4866 70%,#c8d2e8)', aurora: 'radial-gradient(80% 60% at 50% 60%,rgba(40,255,140,.6),transparent 70%),linear-gradient(180deg,#01030a,#0e2a40)' };
const MOOD_EN = { night: 'NIGHT', dusk: 'DUSK', snow: 'SNOW', aurora: 'AURORA' };
function updateMoodBtn() { const b = $('#moodBtn'); b.querySelector('.sw').style.background = MOOD_BG[settings.mood]; b.querySelector('.nm').textContent = MOODS[settings.mood].name; renderMoodPop(); }
function renderMoodPop() {
  $('#moodPop').innerHTML = Object.keys(MOODS).map((k) => `<button class="mood${settings.mood === k ? ' on' : ''}" data-m="${k}" style="--bg:${MOOD_BG[k]}"><small>${MOOD_EN[k]}</small><b>${MOODS[k].name}</b></button>`).join('');
  $('#moodPop').querySelectorAll('.mood').forEach((b) => { b.onclick = () => { sound.ui('pick'); setMood(b.dataset.m); $('#moodPop').classList.add('closed'); }; });
}
$('#moodBtn').onclick = () => { sound.ui('tap'); $('#moodPop').classList.toggle('closed'); };
updateMoodBtn();

// 運鏡
function setCine(on) {
  $('#cineBtn').classList.toggle('on', on);
  if (on) { rig.startCinema(); toast('電影運鏡：碰一下畫面就回到自己操作'); autoT = Math.min(autoT, 1); }
  else if (rig.cinema) rig.cinema = null;
}
$('#cineBtn').onclick = () => { sound.ui('tap'); setCine(!rig.cinema); };

// 拍照
let wantShot = false;
$('#shotBtn').onclick = () => { wantShot = true; };
function takeShot() {
  const url = R.r.domElement.toDataURL('image/jpeg', 0.92);
  const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  sound.shutter();
  const d = new Date(), name = `火樹銀花_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.jpg`;
  const ph = $('#photo');
  const framed = (() => { try { return window.top !== window; } catch (e) { return true; } })();
  ph.innerHTML = `<img src="${url}" alt="照片"><p>${framed ? '長按照片（電腦按右鍵）就能存下來' : '手機：長按照片可以存到相簿'}</p><div class="r">${framed ? '' : `<a href="${url}" download="${name}">下載</a>`}<button id="phClose">繼續逛</button></div>`;
  ph.classList.remove('hide');
  $('#phClose').onclick = () => ph.classList.add('hide');
}

// 設定
const QN = { auto: '自動', low: '流暢', mid: '標準', high: '極致' };
function openSettings() {
  sound.ui('open');
  const c = $('#card');
  const seg = (key, opts, cur) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const tog = (key) => `<button class="tog${settings[key] ? ' on' : ''}" data-t="${key}"></button>`;
  c.innerHTML = `<h3>設定</h3><div class="sub">目前畫質：${QN[q.tier]}${settings.quality === 'auto' ? '（自動判斷）' : ''}</div>
    <div class="set stack"><span>畫質<small>流暢：手機省電 · 極致：筆電全特效</small></span>${seg('quality', Object.entries(QN), settings.quality)}</div>
    <div class="set"><span>配樂</span>${tog('music')}</div>
    <div class="set"><span>音效</span>${tog('sfx')}</div>
    <div class="set"><span>音量</span><input type="range" min="0" max="1" step="0.05" value="${settings.vol}" id="volIn"></div>
    <div class="set"><span>自動放煙火<small>沒在點的時候，天空也不會空著</small></span>${tog('auto')}</div>
    <div class="set"><span>顯示幀數</span>${tog('fps')}</div>
    <div class="how"><b>點天空</b>放一發，<b>按住</b>連發（手指可以移動）。下面「煙火」選花形與顏色，「文字」可以把字寫在天上。<b>設施</b>可以坐雲霄飛車、摩天輪、自由落體；<b>煙火秀</b>有大會煙火秀，也能錄下自己放的再播一次。拖曳轉視角，兩指縮放、平移；右上角可以拍照、開電影運鏡。</div>
    <button class="ok" id="okBtn">好</button>`;
  c.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => {
    const k = b.parentElement.dataset.k, v = b.dataset.v;
    if (k === 'quality') { settings.quality = v; store.set('quality', v); const t = v === 'auto' ? autoTier : v; setTier(t, true); toast(`畫質：${QN[v]}（樹木、人數等重新整理後生效）`); }
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  }; });
  c.querySelectorAll('.tog').forEach((b) => { b.onclick = () => {
    const k = b.dataset.t; settings[k] = !settings[k]; store.set(k, settings[k]); b.classList.toggle('on', settings[k]);
    if (k === 'music') sound.setMusic(settings.music);
    if (k === 'sfx') sound.setSfx(settings.sfx);
    if (k === 'fps') $('#fps').classList.toggle('hide', !settings.fps);
  }; });
  $('#volIn').oninput = (e) => { settings.vol = +e.target.value; store.set('vol', settings.vol); sound.setVol(settings.vol); };
  $('#okBtn').onclick = closeSettings;
  $('#sheet').classList.remove('closed');
}
function closeSettings() { sound.ui('close'); $('#sheet').classList.add('closed'); }
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSettings(); });
$('#setBtn').onclick = openSettings;
$('#exitBtn').onclick = exitRide;
$('#viewBtn').onclick = () => { rideView = 1 - rideView; chase.set(0, 0, 0); coaster.firstPerson(rideView === 0); sound.ui('tap'); };
$('#fps').classList.toggle('hide', !settings.fps);
function setTier(t, manual) {
  const T = TIERS[t];
  q.tier = t; q.render = T.render; q.fw = { ...T.fw };
  R.setQuality(T.render); resize();
  if (manual) autoDown = false;
}

// 鍵盤（電腦）
addEventListener('keydown', (e) => {
  if (!started || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); fire(innerWidth / 2 + rnd(-200, 200), innerHeight * 0.3 + rnd(-60, 60)); }
  else if (k === 'escape') { if (ride) exitRide(); else closeTray(); }
  else if (k === 'p') wantShot = true;
  else if (k === 'c') setCine(!rig.cinema);
  else if (k === 'h') rig.home();
  else if (/^[1-9]$/.test(k)) { settings.shell = SHELLS[+k - 1].id; store.set('shell', settings.shell); if (tab === 'fire' && trayOpen) renderTray(); toast('煙火：' + SHELLS[+k - 1].name); }
});
document.addEventListener('visibilitychange', () => sound.suspend(document.hidden));

// 片頭 → 入園
$('#title').addEventListener('click', () => {
  if (started) return;
  sound.unlock();
  sound.ui('start');
  started = true;
  $('#title').classList.add('out');
  setTimeout(() => $('#title').classList.add('hide'), 900);
  $('#hud').classList.remove('hide');
  openTray('fire');
  rig.cinema = null; rig.home();
  if (sound.ctx) sound.setWeather(MOODS[settings.mood].snow > 0);
  // 開園的三發
  setTimeout(() => { fw.launch('kamuro', 'gold', { x: 0, y: 122, z: L.stage.z }, { scale: 1.2 }); }, 500);
  setTimeout(() => { fw.launch('peony', 'pink', { x: -60, y: 100, z: L.stage.z + 8 }); fw.launch('peony', 'cyan', { x: 60, y: 100, z: L.stage.z + 8 }); }, 1100);
  setTimeout(() => sound.cheer(0.8), 3300);
  setTimeout(() => $('#hint').classList.remove('out'), 2600);
  setTimeout(hideHint, 12000);
  autoT = 7;
});

// ───────── 主迴圈 ─────────
let last = performance.now(), t = 0, fpsAcc = 0, fpsN = 0, fpsWin = 0, autoDown = settings.quality === 'auto', slow = 0;
rig.startCinema(4); // 片頭畫面：電影運鏡＋自動煙火
let titleFireT = 1;
function simulate(dt) {
  t += dt; U.uTime.value = t;
  lastUser += dt;
  if (moodK < 1) { moodK = Math.min(1, moodK + dt / 2.2); applyMood(moodFrom, moodTo, moodK * moodK * (3 - 2 * moodK)); }
  park.update(t, dt); wheel.update(t, dt); coaster.update(dt); carousel.update(t, dt); swing.update(t, dt); tower.update(t, dt); castle.update(t);
  if (!started) { titleFireT -= dt; if (titleFireT <= 0) { titleFireT = rnd(1.1, 2.6); fw.launch(pick(AUTO_TYPES.filter((x) => x !== 'heart')), 'random', { x: rnd(-70, 70), y: rnd(80, 125), z: L.stage.z }); } }
  autoFire(dt);
  rig.noDrift = !!show;
  if (show) {
    const st = showNow();
    player.update(st);
    const bar = document.getElementById('showBar'); if (bar) bar.style.width = clamp((st / show.len) * 100, 0, 100) + '%';
    if (player.done || !player.active) {
      const wasGrand = show.kind === 'grand';
      show = null; banner();
      if (wasGrand) { sound.applause(1); toast('謝謝觀賞 🎆'); } else toast('播放完畢');
    }
  }
  if (rec.on) { const e = document.getElementById('recT'); if (e) { const s = Math.floor(nowT() - rec.t0); e.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; } if (nowT() - rec.t0 > 180) stopRec(); }
  let cineFade = 0;
  if (ride) rideCamera(dt); else cineFade = rig.update(dt);
  camera.updateMatrixWorld();
  fw.camP.copy(camera.position);
  fw.camR.setFromMatrixColumn(camera.matrixWorld, 0); fw.camU.setFromMatrixColumn(camera.matrixWorld, 1); fw.camF.setFromMatrixColumn(camera.matrixWorld, 2).negate();
  fw.update(dt);
  const glow = fw.skyFlash(sky, camera);
  sky.follow(camera);
  snow.update(camera, U.uSnow.value);
  park.waterMat.emissive.setRGB(glow * 0.004, glow * 0.003, glow * 0.004);
  if (fadeDir) {
    fadeT = clamp(fadeT + dt * fadeDir * 3.2, 0, 1);
    if (fadeT >= 1 && fadeDir > 0) { fadeDir = -1; fadeCb && fadeCb(); fadeCb = null; }
    if (fadeT <= 0 && fadeDir < 0) fadeDir = 0;
  }
  R.post.fade = 1 - Math.max(fadeT, cineFade);
  R.post.bloom = q.tier === 'low' ? 0.75 : 0.9;
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) return;
  simulate(dt);
  R.render(scene, camera, t);
  if (wantShot) { wantShot = false; takeShot(); }
  fpsAcc += dt; fpsN++; fpsWin += dt;
  if (fpsWin > 1) {
    const fps = fpsN / fpsAcc;
    $('#cineBtn').classList.toggle('on', !!rig.cinema && started);
    if (settings.fps) $('#fps').textContent = `${fps.toFixed(0)} fps · ${QN[q.tier]} · ${fw.n} 火花`;
    if (autoDown && t > 6 && !document.hidden && !window.__noAuto) {
      slow = fps < 34 ? slow + 1 : Math.max(0, slow - 1);
      if (slow >= 3 && q.tier !== 'low') { setTier(q.tier === 'high' ? 'mid' : 'low'); autoDown = true; slow = 0; toast('已自動調整畫質，保持流暢'); }
    }
    fpsAcc = 0; fpsN = 0; fpsWin = 0;
  }
}
requestAnimationFrame(frame);
window.__sky = { advance(sec) { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) simulate(1 / 30); }, fw, rig, coaster, wheel, tower, startRide, exitRide, startGrand, setMood, setTier, q, camera, renderer: R, park, get started() { return started; } };
