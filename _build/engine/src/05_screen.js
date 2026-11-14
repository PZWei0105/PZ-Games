/* ==========================================================================
   05 螢幕
   建立 #pz-root（整個遊戲）、#pz-canvas（畫布）、#pz-ui（介面層，放 DOM 介面），
   處理大小、裝置像素比（DPR）、iPhone 瀏海安全區、直橫、全螢幕、螢幕常亮。
   畫布解析度 = min(DPR, 2) × 畫質倍率，並限制總像素（手機 320 萬、電腦 840 萬），
   避免 iPhone 的畫布記憶體上限與發燙。
   ========================================================================== */
const Screen = PZ.screen = {
  w: 0, h: 0, dpr: 1, res: 1, pw: 0, ph: 0,
  portrait: true, landscape: false, short: 0, long: 0,
  safe: { t: 0, r: 0, b: 0, l: 0 },
  root: null, canvas: null, ui: null, touch: null,
  resCap: 2, pixelCap: Env.mobile ? 3.2e6 : 8.4e6, resScale: 1,
  orientation: 'any', bg: '#000',
  _probe: null, _dirty: true, _rotating: false,
};

/** 取得或建立 DOM 結構 */
Screen.init = (cfg = {}) => {
  if (!HAS_DOM) return;
  Screen.orientation = cfg.orientation || 'any';
  if (cfg.background) Screen.bg = cfg.background;
  let root = document.getElementById('pz-root');
  if (!root) { root = el('div'); root.id = 'pz-root'; document.body.appendChild(root); }
  Screen.root = root;
  let cv = document.getElementById('pz-canvas');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'pz-canvas'; root.insertBefore(cv, root.firstChild); }
  Screen.canvas = cv;
  let touch = document.getElementById('pz-touch');
  if (!touch) { touch = el('div'); touch.id = 'pz-touch'; root.appendChild(touch); }
  Screen.touch = touch;
  let ui = document.getElementById('pz-ui');
  if (!ui) { ui = el('div'); ui.id = 'pz-ui'; root.appendChild(ui); }
  else root.appendChild(ui); // 確保介面層在觸控層上面
  Screen.ui = ui;
  root.style.background = Screen.bg;
  document.documentElement.style.background = Screen.bg;
  // 安全區探針
  const p = el('div'); p.id = 'pz-safe-probe';
  p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(p); Screen._probe = p;
  const mark = () => { Screen._dirty = true; };
  window.addEventListener('resize', mark);
  window.addEventListener('orientationchange', () => { mark(); setTimeout(mark, 250); setTimeout(mark, 700); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', mark);
  if (typeof ResizeObserver === 'function') new ResizeObserver(mark).observe(root);
  PZ.on('quality', () => { Screen._dirty = true; });
  // DPR 變了（視窗拖到另一個螢幕）
  const watchDpr = () => {
    if (!window.matchMedia) return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const on = () => { mark(); watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', on, { once: true });
  };
  watchDpr();
  Screen.measure(true);
};

/** 量大小；有變動才發 resize */
Screen.measure = (force) => {
  if (!HAS_DOM || !Screen.root) return false;
  if (!Screen._dirty && !force) return false;
  Screen._dirty = false;
  const r = Screen.root.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cs = getComputedStyle(Screen._probe);
  const safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  let res = Math.min(dpr, Screen.resCap) * Quality.cur.res * Screen.resScale;
  res = Math.max(0.5, res);
  if (w * h * res * res > Screen.pixelCap) res = Math.sqrt(Screen.pixelCap / (w * h));
  const pw = Math.max(1, Math.round(w * res)), ph = Math.max(1, Math.round(h * res));
  const changed = w !== Screen.w || h !== Screen.h || pw !== Screen.pw || ph !== Screen.ph || dpr !== Screen.dpr;
  Object.assign(Screen, { w, h, dpr, res: pw / w, pw, ph, safe, portrait: h >= w, landscape: w > h, short: Math.min(w, h), long: Math.max(w, h) });
  if (Screen.canvas && (Screen.canvas.width !== pw || Screen.canvas.height !== ph)) { Screen.canvas.width = pw; Screen.canvas.height = ph; }
  const st = Screen.root.style;
  st.setProperty('--pz-safe-t', safe.t + 'px'); st.setProperty('--pz-safe-r', safe.r + 'px'); st.setProperty('--pz-safe-b', safe.b + 'px'); st.setProperty('--pz-safe-l', safe.l + 'px');
  Screen.root.classList.toggle('pz-portrait', Screen.portrait);
  Screen.root.classList.toggle('pz-landscape', Screen.landscape);
  Screen.root.classList.toggle('pz-mobile', Env.mobile);
  Screen.checkRotate();
  if (changed) PZ.emit('resize', w, h);
  return changed;
};

/* 收藏庫的 PZ 圓鈕選單打開時：引擎暫停（原因 'hub'）、放開所有輸入，並發出 PZ.on('hub', open)。
   遊戲想在這時候叫出自己的暫停選單，就聽 'hub'。 */
if (HAS_DOM) window.addEventListener('pzhub', (e) => {
  const open = !!(e && e.detail && e.detail.open);
  if (open) { PZ.pause('hub'); if (PZ.input && PZ.input.releaseAll) PZ.input.releaseAll(); } else PZ.resume('hub');
  PZ.emit('hub', open);
});
/** 收藏庫的 PZ 圓鈕位置（遊戲在 PZ 遊戲收藏裡開時才有）；HUD 不要放在這裡 */
Screen.hub = () => {
  if (!HAS_DOM || !document.querySelector('script[data-game][src*="hub.js"]') || Env.inFrame) return null;
  const p = Store.getJSON('pzgc.v1.handle', null), W = Screen.w, H = Screen.h;
  let x = p ? clamp(p.x * W, 6, W - 50) : W - 52;
  const y = p ? clamp(p.y * H, 50, H - 104) : H * 0.42;
  x = x + 22 < W / 2 ? 6 : W - 50;
  return { x, y, w: 44, h: 44, side: x < W / 2 ? 'left' : 'right' };
};

/* ---------- 直橫限制：手機拿錯方向時蓋一層提示並暫停 ---------- */
Screen.checkRotate = () => {
  if (!Env.mobile || Screen.orientation === 'any') return;
  const wrong = (Screen.orientation === 'portrait' && Screen.landscape) || (Screen.orientation === 'landscape' && Screen.portrait);
  if (wrong === Screen._rotating) return;
  Screen._rotating = wrong;
  let ov = document.getElementById('pz-rotate');
  if (wrong) {
    if (!ov) {
      ov = el('div', 'pz-rotate', `<div class="pz-rotate-icon"></div><div>${Screen.orientation === 'portrait' ? '請把手機轉成直的' : '請把手機轉成橫的'}</div>`);
      ov.id = 'pz-rotate'; Screen.root.appendChild(ov);
    }
    ov.classList.add('on'); PZ.pause('rotate');
  } else {
    if (ov) ov.classList.remove('on');
    PZ.resume('rotate');
  }
};

/* ---------- 全螢幕（iPhone 不支援，會回傳 false）---------- */
Screen.canFullscreen = () => HAS_DOM && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
Screen.isFullscreen = () => HAS_DOM && !!(document.fullscreenElement || document.webkitFullscreenElement);
Screen.fullscreen = async (on = !Screen.isFullscreen()) => {
  if (!Screen.canFullscreen()) return false;
  try {
    if (on) {
      const d = document.documentElement;
      await (d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen());
      if (Screen.orientation !== 'any' && screen.orientation && screen.orientation.lock) { try { await screen.orientation.lock(Screen.orientation); } catch (e) { /* 不支援 */ } }
    } else await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    return true;
  } catch (e) { return false; }
};

/* ---------- 螢幕常亮（玩的時候不要自己暗掉）---------- */
const Wake = { want: false, lock: null };
Screen.keepAwake = async (on = true) => {
  Wake.want = on;
  if (!HAS_DOM || !('wakeLock' in navigator)) return false;
  try {
    if (on && !Wake.lock) { Wake.lock = await navigator.wakeLock.request('screen'); Wake.lock.addEventListener('release', () => { Wake.lock = null; }); }
    else if (!on && Wake.lock) { await Wake.lock.release(); Wake.lock = null; }
    return true;
  } catch (e) { return false; }
};
PZ.on('visible', () => { if (Wake.want) Screen.keepAwake(true); });

addSystem({ name: 'screen', order: -100, frame() { Screen.measure(); } });
