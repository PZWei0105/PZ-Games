/* ───────────── 主迴圈、畫布、橫向／旋轉處理 ───────────── */
const cv = $('#cv');
const ctx = cv.getContext('2d', { alpha: false });
const CAM = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, shake: 0, sx: 0, sy: 0, follow: true };

function layout() {
  const iw = innerWidth, ih = innerHeight, app = $('#app');
  VIEW.rot = ih > iw * 1.08;              // 直拿：整個畫面轉 90 度，橫著拿就能玩
  const W = VIEW.rot ? ih : iw, H = VIEW.rot ? iw : ih;
  VIEW.w = W; VIEW.h = H;
  app.style.width = W + 'px'; app.style.height = H + 'px';
  app.style.transform = VIEW.rot ? `translateX(${iw}px) rotate(90deg)` : 'none';
  VIEW.dpr = Math.min(2, window.devicePixelRatio || 1) * VIEW.quality;
  cv.width = Math.round(W * VIEW.dpr); cv.height = Math.round(H * VIEW.dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  document.documentElement.classList.toggle('rot', VIEW.rot);
  if (typeof onLayout === 'function') onLayout();
}
/* 螢幕座標 → 畫面（橫向）座標 */
function toLocal(cx, cy) { return VIEW.rot ? [cy, innerWidth - cx] : [cx, cy]; }
function worldToScreen(wx, wy) { return [(wx - CAM.x) * CAM.z + VIEW.w / 2, (wy - CAM.y) * CAM.z + VIEW.h / 2]; }
function screenToWorld(sx, sy) { return [(sx - VIEW.w / 2) / CAM.z + CAM.x, (sy - VIEW.h / 2) / CAM.z + CAM.y]; }
function applyCam(c) {
  const z = CAM.z * VIEW.dpr;
  c.setTransform(z, 0, 0, z, (VIEW.w / 2 - (CAM.x + CAM.sx) * CAM.z) * VIEW.dpr, (VIEW.h / 2 - (CAM.y + CAM.sy) * CAM.z) * VIEW.dpr);
}

let lastT = 0, fpsAcc = 0, fpsN = 0, frameMs = 16;
function frame(now) {
  requestAnimationFrame(frame);
  if (G.freeze) return;
  if (!lastT) lastT = now;
  let rdt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  G.rt += rdt;
  // 慢動作與停格
  G.timeScale = damp(G.timeScale, G.slowTarget, 10, rdt);
  if (G.hitStop > 0) { G.hitStop -= rdt; rdt *= 0.08; }
  const dt = rdt * G.timeScale * (G.speed || 1);
  G.dt = dt; G.t += dt;
  const t0 = performance.now();
  if (SCENES[G.scene] && SCENES[G.scene].update) SCENES[G.scene].update(dt, rdt);
  if (SCENES[G.scene] && SCENES[G.scene].render) SCENES[G.scene].render(ctx);
  frameMs = lerp(frameMs, performance.now() - t0, 0.05);
  autoQuality(rdt);
}
/* 太卡就降解析度，順就慢慢升回來（看真正的畫面間隔，GPU 慢也算得到） */
let qT = 0, qAcc = 0, qN = 0, qGood = 0;
function autoQuality(rdt) {
  if (G.freeze || G.scene === 'brief' || document.hidden) return;
  qT += rdt; qAcc += rdt; qN++;
  if (qT < 2) return;
  const avg = qAcc / qN; qT = 0; qAcc = 0; qN = 0;
  if (avg > 0.026 && VIEW.quality > 0.55) { VIEW.quality = Math.max(0.55, VIEW.quality - 0.15); qGood = 0; layout(); }
  else if (avg < 0.0185 && VIEW.quality < 1) { qGood++; if (qGood >= 3) { qGood = 0; VIEW.quality = Math.min(1, VIEW.quality + 0.1); layout(); } }
}

function boot() {
  buildFxSprites();
  buildWeaponSprites();
  for (const id of Object.keys(PAL)) buildBodySprites(id);
  if (typeof buildVehicleSprites === 'function') buildVehicleSprites();
  layout();
  addEventListener('resize', layout);
  if (typeof initInput === 'function') initInput();
  if (typeof initUI === 'function') initUI();
  const h = location.hash;
  if (h.startsWith('#show') && SCENES.show) { G.scene = 'show'; SCENES.show.enter(h.slice(5)); }
  else if (h.startsWith('#test-')) { const rv = h.slice(6) || 'kaz'; SCENES.battle.enter({ rival: rv, deck: ['rifle', 'mg', 'at', 'tank', 'heli', 'aa', 'mortar', 'airstrike'], autoUs: true, theme: 'snow', seed: 11 }); }
  else if (typeof startGame === 'function') startGame();
  requestAnimationFrame(frame);
}
addEventListener('load', boot);

/* 測試用：凍結即時迴圈，手動快轉 */
window.__ei = {
  step(sec, fps) { G.freeze = true; const k = Math.ceil(sec * (fps || 30)), dt = sec / k; for (let i = 0; i < k; i++) { G.rt += dt; G.t += dt; G.dt = dt; SCENES[G.scene].update(dt, dt); } SCENES[G.scene].render(ctx); return B ? { t: B.t.toFixed(1), units: B.units.filter((u) => u.alive).length, sup: B.supply.map((v) => v.toFixed(1)), flags: B.flags.map((f) => f.owner).join(''), hq: B.hq.map((h) => Math.round(h.hp)), parts: PT.count, over: B.over, res: B.result } : null; },
  cam(x, y, z) { G.freeze = true; if (x !== undefined) CAM.x = x; if (y !== undefined) CAM.y = y; if (z !== undefined) CAM.z = z; CAM.follow = false; CAM.userT = 999; SCENES[G.scene].render(ctx); },
  perf(n) { const t0 = performance.now(); for (let i = 0; i < (n || 30); i++) SCENES[G.scene].render(ctx); return ((performance.now() - t0) / (n || 30)).toFixed(2) + 'ms/frame render'; },
};
