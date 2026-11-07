'use strict';
/* ====== 啟動、操作、主迴圈 ====== */
const IN = { joy: { on: false }, joyR: 58, keys: {} };

function bindInput() {
  const app = $('#app');
  app.addEventListener('pointerdown', e => {
    if (S.mode !== 'dive' || S.paused || !W || W.out) return;
    if (e.target !== R.cv) return;
    if (IN.joy.on) return;
    IN.joy = { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, kx: e.clientX, ky: e.clientY };
    AU.init();
  });
  addEventListener('pointermove', e => {
    const j = IN.joy; if (!j.on || e.pointerId !== j.id) return;
    j.x = e.clientX; j.y = e.clientY;
    let dx = j.x - j.ox, dy = j.y - j.oy, l = Math.hypot(dx, dy);
    if (l > IN.joyR * 1.25) { const k = (l - IN.joyR * 1.25) / l; j.ox += dx * k; j.oy += dy * k; dx = j.x - j.ox; dy = j.y - j.oy; l = Math.hypot(dx, dy); }
    const m = Math.min(l, IN.joyR); j.kx = j.ox + (l ? dx / l * m : 0); j.ky = j.oy + (l ? dy / l * m : 0);
  }, { passive: true });
  const up = e => { if (IN.joy.on && e.pointerId === IN.joy.id) IN.joy = { on: false }; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  const btn = (sel, fn) => { const b = $(sel); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (S.mode !== 'dive' || !W || W.out) return; if (S.paused && sel !== '#pauseBtn') return; AU.init(); fn(W.players[0]); }); };
  btn('#bDash', p => playerDash(p));
  btn('#bTool', p => useTool(p));
  btn('#bCandy', p => useCandy(p));
  btn('#bAct', p => doAct(p));
  btn('#pauseBtn', () => { if (!S.paused) UI.pause(); });
  btn('#bag', () => UI.bag());
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    IN.keys[k] = true;
    if (S.mode !== 'dive' || !W || W.out) return;
    if (k === 'escape') { if (S.paused) { const s = $('#ui .screen:last-child'); if (s && s.id === 'pause') { s.remove(); S.paused = false; } else if (s && s.id === 'bagS') { s.remove(); S.paused = false; } } else UI.pause(); return; }
    if (S.paused) return;
    const p = W.players[0];
    if (k === ' ') { e.preventDefault(); playerDash(p); }
    else if (k === 'e') useTool(p);
    else if (k === 'q') useCandy(p);
    else if (k === 'f' || k === 'enter') doAct(p);
    else if (k === 'b' || k === 'tab') { e.preventDefault(); UI.bag(); }
  });
  addEventListener('keyup', e => { IN.keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { IN.keys = {}; IN.joy = { on: false }; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (S.mode === 'dive' && W && !W.out && !S.paused) UI.pause(); if (G) saveGame(); }
  });
}
function readInput() {
  const p = W.players[0]; const inp = p.input;
  let mx = 0, my = 0, mag = 0;
  const K = IN.keys;
  const kx = (K['d'] || K['arrowright'] ? 1 : 0) - (K['a'] || K['arrowleft'] ? 1 : 0), ky = (K['s'] || K['arrowdown'] ? 1 : 0) - (K['w'] || K['arrowup'] ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; mag = K['shift'] ? .5 : 1; }
  else if (IN.joy.on) {
    const dx = IN.joy.x - IN.joy.ox, dy = IN.joy.y - IN.joy.oy, l = Math.hypot(dx, dy);
    if (l > IN.joyR * .1) { mx = dx / l; my = dy / l; mag = Math.min(1, l / IN.joyR); }
  }
  inp.mx = mx; inp.my = my; inp.mag = mag;
}

let _last = performance.now();
function frame(ts) {
  const dt = Math.min(.05, Math.max(0, (ts - _last) / 1000)); _last = ts;
  try {
    const c = R.ctx;
    if (S.mode === 'title' || S.mode === 'boot') { c.setTransform(1, 0, 0, 1, 0, 0); drawTitleBG(c, ts / 1000); }
    else if (S.mode === 'hub') { c.setTransform(1, 0, 0, 1, 0, 0); drawHubBG(c, ts / 1000); }
    else if ((S.mode === 'dive' || S.mode === 'result') && W) {
      if (S.mode === 'dive') readInput();
      if (!S.paused && S.mode === 'dive') stepWorld(dt);
      renderDive(S.paused || S.mode !== 'dive' ? 0 : dt);
      if (S.mode === 'dive') { UI.hud(dt); updateRadio(S.paused ? 0 : dt); }
    }
  } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

function boot() {
  initRender(); initBG(); bindInput();
  G = fixG(bestSave() || newG()); refreshPerks();
  UI.title();
  const tryCloud = n => {
    if (window.claude && typeof window.claude.use === 'function') cloudInit().then(r => { if (r && S.mode === 'title') { const l = loadLocal(); if (!l || (r.at || 0) > (l.at || 0)) { G = fixG(r); refreshPerks(); UI.title(); } } });
    else if (n < 24) setTimeout(() => tryCloud(n + 1), 250);
  };
  tryCloud(0);
  requestAnimationFrame(frame);
}

/* 測試用（不會出現在畫面上） */
window.__dt = {
  get W() { return W; }, get G() { return G; }, get S() { return S; },
  money(n) { G.money += n; saveGame(); },
  unlockAll() { G.chapters.forEach(c => c.unlocked = true); saveGame(); },
  start(chi) { G = G || newG(); S.mode = 'hub'; UI.startDive(chi || 0); },
  wake(v) { W.wake = v; },
  god() { const p = W.players[0]; p.hpMax = 99999; p.hp = 99999; },
  tp(x, y) { const p = W.players[0]; p.x = x; p.y = y; R.snap = true; },
  toBoss() { const b = W.boss; if (!b) return; const p = W.players[0]; p.x = b.room.cx; p.y = (b.room.y + b.room.h - 1.5) * T; R.snap = true; },
  depth(d) { W.depth = d - 1; descend(); },
  lvl(n) { const p = W.players[0]; for (let i = 0; i < n; i++) { const k = rnd.pick(UP_IDS); if ((p.ups[k] || 0) < 5) p.ups[k] = (p.ups[k] || 0) + 1; } calcStats(p); },
};
window.addEventListener('load', boot);
