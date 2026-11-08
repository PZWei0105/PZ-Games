/* ============ 11 輸入、主迴圈、開機 ============ */
const S = { mode: 'title', last: 0, acc: 0 };
const KEYS = {};
const JOY = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
function blocked() { return UI.modalOpen || UI.storyOn; }
function setupInput() {
  const app = $('#app'), joy = $('#joy'), knob = joy.querySelector('.knob');
  const R0 = 52;
  const upd = () => {
    const dx = JOY.x - JOY.x0, dy = JOY.y - JOY.y0, m = Math.hypot(dx, dy), k = m > R0 ? R0 / m : 1;
    INPUT.jx = dx * k / R0; INPUT.jy = dy * k / R0;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  };
  app.addEventListener('pointerdown', e => {
    if (S.mode !== 'dive' || blocked() || !W) return;
    if (e.target.closest('button') || e.target.id === 'minimap') return;
    if (JOY.id != null) return;
    if (e.clientX > R.w * .62 && e.clientY > R.h * .55) return;
    JOY.id = e.pointerId; JOY.x0 = JOY.x = e.clientX; JOY.y0 = JOY.y = e.clientY;
    joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.classList.add('on');
    $('#joyhint').classList.add('hidden');
    upd();
  });
  window.addEventListener('pointermove', e => { if (e.pointerId !== JOY.id) return; JOY.x = e.clientX; JOY.y = e.clientY; upd(); });
  const end = e => { if (e.pointerId !== JOY.id) return; JOY.id = null; INPUT.jx = 0; INPUT.jy = 0; joy.classList.remove('on'); knob.style.transform = ''; };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  const btn = (id, fn) => { const b = $(id); b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (S.mode === 'dive' && W && !blocked()) fn(); }); };
  btn('#btn-stance', () => toggleStance());
  btn('#btn-ctx', () => doInteract());
  btn('#btn-med', () => useMed());
  btn('#btn-decoy', () => throwDecoy());
  btn('#btn-pause', () => UI.pause());
  $('#minimap').addEventListener('pointerdown', e => { e.stopPropagation(); if (S.mode === 'dive' && W && !blocked()) UI.pause(); });
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    KEYS[e.code] = true;
    if (S.mode !== 'dive' || !W) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (UI.modalOpen && W.state === 'play' && !W.lvQ && !W.cacheQ) { UI.closeModal(); } else UI.pause(); return; }
    if (blocked()) return;
    if (e.code === 'Space') { e.preventDefault(); toggleStance(); }
    if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') doInteract();
    if (e.code === 'KeyQ') throwDecoy();
    if (e.code === 'KeyR') useMed();
    if (e.code === 'KeyM') UI.pause();
  });
  window.addEventListener('keyup', e => { KEYS[e.code] = false; });
  window.addEventListener('resize', () => { resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'dive' && W && W.state === 'play' && !blocked()) UI.pause(); if (AU.ctx) { if (document.hidden) AU.ctx.suspend(); else AU.ctx.resume(); } });
}
function keyAxes() {
  if (JOY.id != null) return;
  const l = KEYS.KeyA || KEYS.ArrowLeft, r = KEYS.KeyD || KEYS.ArrowRight, u = KEYS.KeyW || KEYS.ArrowUp, d = KEYS.KeyS || KEYS.ArrowDown;
  if (l || r || u || d) { INPUT.jx = (r ? 1 : 0) - (l ? 1 : 0); INPUT.jy = (d ? 1 : 0) - (u ? 1 : 0); S.keyHeld = true; }
  else if (S.keyHeld) { INPUT.jx = 0; INPUT.jy = 0; S.keyHeld = false; }
}
function frame(ts) {
  requestAnimationFrame(frame);
  const t = ts / 1000, dt = Math.min(.05, Math.max(0, t - (S.last || t)));
  S.last = t;
  if (S.mode === 'dive' && W) {
    keyAxes();
    if (!blocked() && (W.state === 'play' || W.state === 'dying')) {
      const sp = S.speed || 1, cap = 4 * sp;
      S.acc += dt * sp;
      let n = 0;
      while (S.acc >= 1 / 60 && n < cap) { updateWorld(1 / 60); S.acc -= 1 / 60; n++; if (blocked() || (W.state !== 'play' && W.state !== 'dying')) break; }
      if (n >= cap) S.acc = 0;
      if (W.state === 'play' && !blocked()) {
        if (W.cacheQ > 0) UI.levelUp(true);
        else if (W.lvQ > 0) UI.levelUp(false);
      }
    } else S.acc = 0;
    UI.updateHud(dt);
  }
  render(dt);
  // 自動降解析度：老手機連續卡頓就把畫布像素降一級
  if (S.mode === 'dive' && !S.noAdapt && dt > 0) {
    R.ema = R.ema * .95 + dt * .05;
    R.slowT = R.ema > 1 / 36 ? R.slowT + dt : Math.max(0, R.slowT - dt);
    if (R.slowT > 4 && R.dprCap > 1 && (window.devicePixelRatio || 1) > 1.05) { R.dprCap = R.dprCap > 1.5 ? 1.5 : 1; R.slowT = 0; R.ema = 1 / 60; resize(); }
  }
}
function boot() {
  // 手機瀏覽器有時會把音訊暫停：任何一次觸控都順手喚醒（只在已經建立過音訊之後）
  document.addEventListener('pointerdown', () => { if (AU.ctx && AU.ctx.state === 'suspended') { try { AU.ctx.resume(); } catch (e) { } } }, { passive: true });
  loadGame();
  initRender();
  setupInput();
  UI.title();
  requestAnimationFrame(frame);
}
/* 測試用掛鉤 */
window.__ut = {
  get W() { return W; }, get G() { return G; }, S, UI, R,
  start(si, wpn) { if (wpn) G.lastWeapon = wpn; UI.startDive(si); },
  god() { if (W) W.god = true; },
  give(id) { if (W && !W.P.weapons.some(w => w.id === id)) W.P.weapons.push(newWeapon(id)); },
  lv(id, l) { const w = W.P.weapons.find(q => q.id === id); if (w) w.lv = l; },
  hunterNow() { const h = W.hunter; h.awayT = 0; h.heardAt = { x: W.P.x + 300, y: W.P.y }; },
  tp(x, y) { W.P.x = x; W.P.y = y; W.P.climb = null; },
  roomInfo() { return W.rooms.map(r => ({ i: r.i, c: r.c, f: r.f, th: r.theme, sp: r.special, col: r.collapsed, lu: !!r.ladUp, ld: !!r.ladDown, surv: r.survivor ? r.survivor.name : null })); },
};
boot();
