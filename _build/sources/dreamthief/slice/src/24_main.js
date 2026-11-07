'use strict';
/* ====== 試玩關：操作與主迴圈 ====== */
const IN = { sid: null, sx: 0, sy: 0, mx: 0, my: 0, keys: new Set(), R: 54 };

function stickShow(x, y) { const s = $('#stick'); s.style.left = x + 'px'; s.style.top = y + 'px'; s.classList.remove('hidden'); $('#stick i').style.transform = 'translate(-50%,-50%)'; }
function stickHide() { $('#stick').classList.add('hidden'); }
function initInput() {
  const cv = $('#cv');
  cv.addEventListener('pointerdown', e => {
    if (S.mode !== 'play' || S.paused || IN.sid != null) return;
    e.preventDefault();
    IN.sid = e.pointerId; IN.sx = e.clientX; IN.sy = e.clientY; IN.mx = IN.my = 0;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    stickShow(IN.sx, IN.sy);
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.sid) return;
    let dx = e.clientX - IN.sx, dy = e.clientY - IN.sy;
    const d = Math.hypot(dx, dy), R0 = IN.R;
    // 拖太遠：底座跟著手指走
    if (d > R0 * 1.35) { const k = (d - R0 * 1.35) / d; IN.sx += dx * k; IN.sy += dy * k; dx = e.clientX - IN.sx; dy = e.clientY - IN.sy; const s = $('#stick'); s.style.left = IN.sx + 'px'; s.style.top = IN.sy + 'px'; }
    const dd = Math.hypot(dx, dy), kk = dd > R0 ? R0 / dd : 1;
    IN.mx = clamp(dx / R0, -1, 1); IN.my = clamp(dy / R0, -1, 1);
    $('#stick i').style.transform = `translate(calc(-50% + ${dx * kk}px),calc(-50% + ${dy * kk}px))`;
  });
  const end = e => { if (e.pointerId !== IN.sid) return; IN.sid = null; IN.mx = IN.my = 0; stickHide(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);

  const btn = (id, fn) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (S.mode !== 'play' || S.paused || !W || W.out) return; fn(); }); };
  btn('#bDash', () => svDash(W.players[0]));
  btn('#bCandy', () => { if (!W.candies) { toast('沒有醒神糖了', 'bad'); return; } if (W.players[0].hp >= W.players[0].hpMax) { toast('生命是滿的'); return; } svCandy(W.players[0]); });
  btn('#bAct', () => { const p = W.players[0]; if (p.act && p.act.k === 'bell') svRingBell(); else if (p.act && p.act.k === 'sealed') toast('先打倒值班台，鐘才敲得響', 'bad'); });
  btn('#bUp', () => svClimb(W.players[0], true));
  btn('#bDown', () => svClimb(W.players[0], false));
  btn('#bWake', () => svWakeNow());
  $('#pauseBtn').addEventListener('click', () => { AU.sfx('ui'); UI.pause(); });
  $('#bag').addEventListener('click', () => { AU.sfx('ui'); UI.bag(); });

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { IN.keys.add(k); return; }
    IN.keys.add(k);
    if (S.mode === 'title' && (k === 'enter' || k === ' ')) { const g = $('#title [data-go]'); if (g) g.click(); else $('#title').dispatchEvent(new PointerEvent('pointerdown')); return; }
    if (S.mode !== 'play' || !W) return;
    if (k === 'escape' || k === 'p') { if (S.paused) { if (!UI.chOpen) { $$('#ui .screen').forEach(s => { if (s.id !== 'lvup') s.remove(); }); S.paused = false; } } else UI.pause(); return; }
    if (S.paused || W.out) return;
    const p = W.players[0];
    if (k === ' ' || k === 'shift') svDash(p);
    else if (k === 'q') svCandy(p);
    else if (k === 'e' || k === 'f' || k === 'enter') { if (p.act && p.act.k === 'bell') svRingBell(); else if (W.parts >= 6) svWakeNow(); }
    else if (k === 'b' || k === 'tab') { e.preventDefault(); UI.bag(); }
  });
  addEventListener('keyup', e => IN.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { IN.keys.clear(); });
}
function applyInput() {
  if (!W) return;
  const p = W.players[0], K = IN.keys;
  if (IN.sid != null) { p.input.mx = IN.mx; p.input.my = IN.my; return; }
  const kx = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0);
  const ky = (K.has('s') || K.has('arrowdown') ? 1 : 0) - (K.has('w') || K.has('arrowup') ? 1 : 0);
  p.input.mx = kx; p.input.my = ky;
}

/* ---------- 主迴圈 ---------- */
let _last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, Math.max(0, (now - (_last || now)) / 1000)); _last = now;
  if (S.mode === 'title' || S.mode === 'boot') {
    R.t += dt;
    const c = R.ctx; c.setTransform(1, 0, 0, 1, 0, 0); drawTitleBG(c, R.t);
    return;
  }
  if (!W) return;
  applyInput();
  const run = S.mode === 'play' && !S.paused;
  if (run) {
    const n = window.__speed || 1;
    for (let i = 0; i < n && !S.paused && S.mode === 'play'; i++) {
      svStep(dt);
      if (W.choiceQ.length && !UI.chOpen && !W.out && W.players[0].state === 'alive') {
        UI.chWait = (UI.chWait == null ? .4 : UI.chWait) - dt;
        if (UI.chWait <= 0) { UI.chWait = null; UI.choose(W.choiceQ.shift()); }
      }
    }
  }
  svRender(run || S.mode === 'result' ? dt : 0);
  if (S.mode === 'play') UI.hud(dt);
  updateRadio(run ? dt : 0);
}

/* ---------- 開機 ---------- */
function boot() {
  svInitRender(); initBG(); initInput();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { R.rc.clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play' && W && !W.out && !S.paused) UI.pause(); });
  UI.title();
  requestAnimationFrame(frame);
}
/* 自動測試用 */
window.__sv = {
  get W() { return W; }, get S() { return S; }, R, UI,
  start() { AU.init(); UI.start(); },
  step(sec, inp, pick) { const p = W.players[0]; for (let t = 0; t < sec && !W.out; t += 1 / 60) { if (inp) Object.assign(p.input, inp); svStep(1 / 60); while (W.choiceQ.length) { const cs = svChoices(W.choiceQ.shift()); if (cs.length) svApplyChoice(pick ? pick(cs) : cs[0]); } } },
  tp(f, x) { const p = W.players[0]; p.f = f; p.y = FY(f); p.x = x; p.climb = null; R.snap = true; },
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
