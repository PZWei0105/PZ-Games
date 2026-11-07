'use strict';
/* ====== 啟動、主迴圈、輸入 ====== */
const BUILD_ID = '2026.11.07';
let lastFrame = performance.now();
let lastSave = performance.now();
let savedDay = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  RT += dt;
  if (G) {
    if (!G.paused && G.speed > 0) simAdvance(dt * G.speed * K.MIN_PER_SEC * (G.demo ? 0.6 : 1));
    stepFX(dt);
    // 鏡頭
    CAM.z = lerp(CAM.z, CAM.tz, 1 - Math.pow(0.0005, dt));
    if (INP.vx || INP.vy) { CAM.x += INP.vx * dt; CAM.y += INP.vy * dt; INP.vx *= Math.pow(0.02, dt); INP.vy *= Math.pow(0.02, dt); if (Math.abs(INP.vx) + Math.abs(INP.vy) < 0.05) INP.vx = INP.vy = 0; }
    if (UI.follow) { const c = UI.follow; if (c.dead || c.away) UI.follow = null; else { CAM.x = lerp(CAM.x, c.x, 1 - Math.pow(0.02, dt)); CAM.y = lerp(CAM.y, c.y, 1 - Math.pow(0.02, dt)); } }
    if (G.demo) { const a = RT * 0.05; const hh = hull(); CAM.x = hh.x + 2.5 + Math.cos(a) * 3; CAM.y = hh.y + 1.5 + Math.sin(a) * 3; }
    clampCam();
    render();
    if (!UI.titleOn) {
      UI.updateHUD();
      if (G.day !== savedDay && hourOf(G.t) > 6) { savedDay = G.day; saveGame(); }
      if (now - lastSave > 150000) { lastSave = now; saveGame(); }
    }
    SFX.musicTick(dt, { dark: darkness(), tide: G.tide.phase === 'active', storm: !!(G.weather && G.weather.type === 'storm') });
  }
  requestAnimationFrame(frame);
}

/* ---------- 輸入 ---------- */
const INP = { ptrs: new Map(), moved: false, start: null, pinch: null, vx: 0, vy: 0, lastMove: 0 };
function setupInput() {
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    INP.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    INP.vx = INP.vy = 0;
    if (INP.ptrs.size === 1) { INP.moved = false; INP.start = { x: e.clientX, y: e.clientY, t: performance.now() }; }
    if (INP.ptrs.size === 2) { const [a, b] = [...INP.ptrs.values()]; INP.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: CAM.tz, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; INP.moved = true; }
  });
  cv.addEventListener('pointermove', e => {
    const p = INP.ptrs.get(e.pointerId);
    if (!p) return;
    const px = p.x, py = p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (INP.ptrs.size === 1) {
      if (!INP.moved && Math.hypot(p.x - p.x0, p.y - p.y0) > 9) { INP.moved = true; UI.follow = null; }
      if (INP.moved) {
        const w0 = s2w(px, py), w1 = s2w(p.x, p.y);
        const dx = w0[0] - w1[0], dy = w0[1] - w1[1];
        CAM.x += dx; CAM.y += dy;
        const t = performance.now(), dtm = Math.max(8, t - INP.lastMove) / 1000; INP.lastMove = t;
        INP.fvx = dx / dtm; INP.fvy = dy / dtm;
      }
    } else if (INP.ptrs.size === 2 && INP.pinch) {
      const [a, b] = [...INP.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const before = s2w(mx, my);
      CAM.z = CAM.tz = clamp(INP.pinch.z * d / INP.pinch.d, 0.45, 2.4);
      const after = s2w(mx, my);
      CAM.x += before[0] - after[0]; CAM.y += before[1] - after[1];
      const w0 = s2w(INP.pinch.mx, INP.pinch.my), w1 = s2w(mx, my);
      CAM.x += w0[0] - w1[0]; CAM.y += w0[1] - w1[1];
      INP.pinch.mx = mx; INP.pinch.my = my;
    }
  });
  const up = e => {
    const p = INP.ptrs.get(e.pointerId);
    INP.ptrs.delete(e.pointerId);
    if (INP.ptrs.size < 2) INP.pinch = null;
    if (!p) return;
    if (INP.ptrs.size === 0) {
      if (!INP.moved && e.type === 'pointerup') { if (!UI.titleOn && G && !G.demo) UI.onTap(e.clientX, e.clientY); }
      else if (INP.moved && performance.now() - INP.lastMove < 60 && INP.fvx != null) { INP.vx = clamp(INP.fvx, -40, 40) * 0.9; INP.vy = clamp(INP.fvy, -40, 40) * 0.9; }
      INP.fvx = INP.fvy = 0;
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const before = s2w(e.clientX, e.clientY);
    const k = Math.exp(-e.deltaY * 0.0016);
    CAM.z = CAM.tz = clamp(CAM.tz * k, 0.45, 2.4);
    const after = s2w(e.clientX, e.clientY);
    CAM.x += before[0] - after[0]; CAM.y += before[1] - after[1];
  }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!G || G.demo || UI.titleOn) return;
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
    if (UI.modal) { if (e.key === ' ' || e.key === 'Enter') { UI.modal.onTap && UI.modal.onTap(e); e.preventDefault(); } return; }
    const k = e.key.toLowerCase();
    if (k === ' ') { setSpeed(G.speed ? 0 : (UI.prevSpeed || 1)); e.preventDefault(); }
    else if (k === '1' || k === '2' || k === '3') setSpeed(+k);
    else if (k === 'q') rotate(-1); else if (k === 'e') rotate(1);
    else if (k === 'b') UI.toggleSheet('build');
    else if (k === 'escape') { if (UI.build) UI.endBuild(); else if (UI.mode) UI.endMode(); else UI.closeSheet(); }
    else if (k === 'w' || k === 'arrowup') panKey(0, -1); else if (k === 's' || k === 'arrowdown') panKey(0, 1);
    else if (k === 'a' || k === 'arrowleft') panKey(-1, 0); else if (k === 'd' || k === 'arrowright') panKey(1, 0);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.demo) saveGame(); });
  window.addEventListener('pagehide', () => { if (G && !G.demo) saveGame(); });
  // 第一次觸控啟動音效
  const unlock = () => { SFX.init(); };
  window.addEventListener('pointerdown', unlock, { capture: true });
}
function panKey(dx, dy) {
  const w0 = s2w(CAM.W / 2, CAM.H / 2), w1 = s2w(CAM.W / 2 + dx * 120, CAM.H / 2 + dy * 120);
  CAM.x += w1[0] - w0[0]; CAM.y += w1[1] - w0[1];
}

/* ---------- 場景切換 ---------- */
function showGameUI(on) {
  for (const id of ['hud', 'dock', 'side']) el(id).classList.toggle('hidden', !on);
  if (!on) { el('obj').classList.add('hidden'); el('buildbar').classList.add('hidden'); el('modebar').classList.add('hidden'); UI.closeSheet(); }
}
function makeDemo() {
  const g = newGame((Math.random() * 1e9) >>> 0);
  g.demo = true;
  g.t = 20.5 * 60;
  revealAll();
  const h_ = hull();
  const place = (type, x, y) => { if (!canPlace(type, x, y)) { const b = placeBuilding(type, x, y, true); return b; } return null; };
  place('solar', h_.x + 6, h_.y - 1); place('dorm', h_.x - 3, h_.y + 4); place('mess', h_.x + 2, h_.y + 5); place('lamp', h_.x + 5, h_.y + 4); place('research', h_.x + 6, h_.y + 2); place('lamp', h_.x - 2, h_.y - 2);
  g.res.food = 999; g.power.stored = 300;
  for (let i = 0; i < 6; i++) { const p = g.pods.find(p => p.status === 'sleep' && !p.dmg); g.power.stored = 300; const c = wakePod(p); if (c) { c.sick = 0; c.rest = 90; c.food = 90; } }
  for (let i = 0; i < 5; i++) { const s = edgeSpot(10); spawnBeast('bug', s[0], s[1], 'roam'); }
  CAM.tz = CAM.z = 1.05; CAM.rot = 0;
  buildTerrainColors();
  return g;
}
function showTitle() {
  UI.titleOn = true;
  showGameUI(false);
  UI.q = []; UI.modal = null; el('modal').classList.remove('on');
  G = makeDemo();
  UI.renderTitle(bestSave());
  el('title').classList.remove('hidden');
}
function hideTitle() { UI.titleOn = false; el('title').classList.add('hidden'); }
function startNew(skipIntro) {
  hideTitle();
  const seed = (Math.random() * 1e9) >>> 0;
  G = newGame(seed);
  buildTerrainColors();
  savedDay = 1;
  UI.porCache.clear();
  const h_ = hull();
  CAM.rot = 0; CAM.x = h_.x + 2.5; CAM.y = h_.y + 3; CAM.z = CAM.tz = window.innerWidth > 900 ? 1.25 : 1.4;
  G.paused = true;
  const go = () => {
    showGameUI(true);
    G.paused = false;
    playScene('prologue', null, () => { UI.updateObj(); setTimeout(() => { const hb = $('#obj .hintb'); if (hb) hb.classList.add('pulse'); UI.toast('單指拖曳移動畫面、雙指縮放。點人、建築或資源，可以看詳細資料。'); }, 400); });
    saveGame();
  };
  if (skipIntro) go(); else playIntro(go);
}
function startFromSave(o) {
  hideTitle();
  try { deserialize(o); } catch (e) { console.error(e); UI.toast('存檔損毀，無法讀取。', 'bad'); showTitle(); return; }
  savedDay = G.day;
  UI.porCache.clear();
  const L = leader();
  CAM.rot = 0; CAM.x = L && !L.away ? L.x : hull().x + 2.5; CAM.y = L && !L.away ? L.y : hull().y + 2; CAM.z = CAM.tz = 1.3;
  showGameUI(true);
  G.paused = false;
  UI.updateObj();
  UI.toast(`歡迎回來。第 ${G.day} 日，${clockStr(G.t)}。`, 'good');
}

/* ---------- 啟動 ---------- */
function boot() {
  initRender(el('cv'));
  UI.init();
  setupInput();
  showTitle();
  requestAnimationFrame(frame);
  // Claude 雲端存檔
  cloudInit().then(r => { if (r && UI.titleOn) UI.renderTitle(bestSave()); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { for (const k in THUMBS) delete THUMBS[k]; });
}
window.addEventListener('error', e => { try { console.error('ERR', e.message, e.filename, e.lineno); } catch (x) {} });
boot();
