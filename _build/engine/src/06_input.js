/* ==========================================================================
   06 輸入：鍵盤、滑鼠／觸控、手把、手勢、虛擬搖桿與按鈕
   遊戲裡只要問「動作」：
     PZ.input.bind({ fire: ['Space', 'KeyJ', 'PadA', 'PadRT'], dash: ['ShiftLeft', 'PadB'] });
     if (PZ.input.pressed('fire')) …    // 這一格剛按下
     if (PZ.input.down('fire')) …       // 按住中
     const m = PZ.input.move;           // 移動向量 {x, y, mag}：WASD／方向鍵／左類比／虛擬搖桿合併
   手機：PZ.input.stick({ target: 'move' }) 浮動搖桿；PZ.input.button({ action: 'fire', label: '開火' }) 按鈕。
   手勢：PZ.input.gesture（雙指縮放旋轉、拖曳、滾輪）＋ PZ.input.tap（點一下）。
   視窗失焦、切到背景時會自動放開所有按鍵，不會「卡住一直走」。
   ========================================================================== */
const PAD_BTN = ['PadA', 'PadB', 'PadX', 'PadY', 'PadLB', 'PadRB', 'PadLT', 'PadRT', 'PadBack', 'PadStart', 'PadLS', 'PadRS', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadHome'];
const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp', 'PadUp'], down: ['KeyS', 'ArrowDown', 'PadDown'], left: ['KeyA', 'ArrowLeft', 'PadLeft'], right: ['KeyD', 'ArrowRight', 'PadRight'],
  confirm: ['Enter', 'Space', 'PadA'], cancel: ['Escape', 'Backspace', 'PadB'], pause: ['Escape', 'KeyP', 'PadStart'],
};
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

class Action {
  constructor(name) { this.name = name; this.binds = []; this.down = false; this.pressed = false; this.released = false; this._lp = false; this._lr = false; this._prev = false; this.time = 0; }
}

const Input = PZ.input = {
  enabled: true, device: Env.mobile ? 'touch' : 'mouse',
  keys: new Set(), mouse: new Set(), padDown: new Set(), virtDown: new Map(),
  actions: new Map(),
  move: { x: 0, y: 0, mag: 0 }, aim: { x: 0, y: 0, mag: 0, active: false },
  pointers: new Map(),
  pointer: { id: -1, x: 0, y: 0, down: false, pressed: false, released: false, type: 'mouse', sx: 0, sy: 0, t0: 0, moved: false, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } },
  gesture: { active: false, panX: 0, panY: 0, zoom: 1, rotate: 0, cx: 0, cy: 0, fingers: 0 },
  wheel: 0, tap: null, doubleTap: null, longPress: null,
  pad: null, padId: -1, deadzone: 0.2,
  virt: { move: { x: 0, y: 0, on: false }, aim: { x: 0, y: 0, on: false } },
  _updated: false, _edgeAge: 0, _lastTap: null, _handlers: new Map(),
};

/** 綁定動作：bind('fire', 'Space', 'PadA') 或 bind({ fire: [...], jump: [...] }) */
Input.bind = (name, ...codes) => {
  if (typeof name === 'object') { for (const k in name) Input.bind(k, ...[].concat(name[k])); return; }
  let a = Input.actions.get(name); if (!a) { a = new Action(name); Input.actions.set(name, a); }
  a.binds = codes.flat();
  return a;
};
Input.unbind = (name) => Input.actions.delete(name);
for (const k in DEFAULT_BINDS) Input.bind(k, DEFAULT_BINDS[k]);
const _act = (n) => Input.actions.get(n);
Input.down = (n) => { const a = _act(n); return !!(a && a.down); };
Input.pressed = (n) => { const a = _act(n); return !!(a && a.pressed); };
Input.released = (n) => { const a = _act(n); return !!(a && a.released); };
/** 按住多久了（秒） */
Input.held = (n) => { const a = _act(n); return a && a.down ? Time.real - a.time : 0; };
/** 立即回呼（暫停中也會觸發，適合「暫停」「開選單」）：onPress('pause', fn) */
Input.onPress = (n, fn) => { let arr = Input._handlers.get(n); if (!arr) Input._handlers.set(n, (arr = [])); arr.push(fn); return () => { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }; };
function firePress(code) {
  for (const a of Input.actions.values()) if (a.binds.includes(code)) { a._lp = true; const hs = Input._handlers.get(a.name); if (hs) for (const f of hs.slice()) safeCall(f, null, a.name); }
}
function fireRelease(code) { for (const a of Input.actions.values()) if (a.binds.includes(code)) a._lr = true; }
function setDevice(d) { if (Input.device !== d) { Input.device = d; if (Screen.root) Screen.root.dataset.input = d; PZ.emit('device', d); } }

/** 放開所有輸入（失焦、切背景、開選單時） */
Input.releaseAll = () => {
  for (const c of Input.keys) fireRelease(c);
  Input.keys.clear(); Input.mouse.clear(); Input.padDown.clear(); Input.virtDown.clear();
  for (const p of Input.pointers.values()) p.dead = true;
  Input.pointers.clear();
  Input.pointer.down = false;
  Input.virt.move.x = Input.virt.move.y = 0; Input.virt.move.on = false;
  Input.virt.aim.x = Input.virt.aim.y = 0; Input.virt.aim.on = false;
  for (const s of Sticks) s.reset();
  for (const b of TButtons) b._up();
  Input.gesture.active = false; Input.gesture.fingers = 0;
};

/* ---------- 鍵盤 ---------- */
const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
function onKeyDown(e) {
  if (!Input.enabled || typing(e.target)) return;
  setDevice('keyboard');
  if (GAME_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey) e.preventDefault();
  if (e.repeat) return;
  Input.keys.add(e.code); firePress(e.code);
}
function onKeyUp(e) { if (Input.keys.delete(e.code)) fireRelease(e.code); }

/* ---------- 指標（滑鼠、觸控、筆）---------- */
const UI_SEL = 'button,a,input,select,textarea,label,[data-ui],.pz-block,.pz-tbtn,.pz-stick-zone';
function isUiTarget(t) { return t && t.closest && t !== Screen.canvas && !!t.closest(UI_SEL); }
function ptrInfo(e) { return { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, t0: Time.real, type: e.pointerType || 'mouse', button: e.button, moved: false, long: false }; }
function onPointerDown(e) {
  if (!Input.enabled) return;
  const wasTouch = Input.device === 'touch';
  setDevice(e.pointerType === 'touch' ? 'touch' : 'mouse');
  if (isUiTarget(e.target)) return;
  // 剛從鍵盤／滑鼠／手把換回手指：觸控層原本是藏著的，這一下落在畫布上——交給底下那支搖桿，不要吃掉
  if (e.pointerType === 'touch' && !wasTouch && Screen.touch && !Screen.touch.classList.contains('pz-ui-open')) {
    for (const st of Sticks) if (st.contains(e.clientX, e.clientY) && st.begin(e)) return;
  }
  const p = ptrInfo(e);
  Input.pointers.set(e.pointerId, p);
  try { Screen.root.setPointerCapture(e.pointerId); } catch (er) { /* 合成事件 */ }
  if (e.pointerType === 'mouse') { const code = 'Mouse' + e.button; Input.mouse.add(code); firePress(code); }
  const P = Input.pointer;
  if (!P.down || e.isPrimary) { Object.assign(P, { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t0: p.t0, type: p.type, down: true, pressed: true, moved: false }); }
  gestureStart();
}
function onPointerMove(e) {
  if (e.pointerType === 'mouse' && !Input.pointers.size) { Input.pointer.x = e.clientX; Input.pointer.y = e.clientY; return; }
  const p = Input.pointers.get(e.pointerId); if (!p) return;
  p.px = p.x; p.py = p.y; p.x = e.clientX; p.y = e.clientY;
  if (!p.moved && Math.hypot(p.x - p.sx, p.y - p.sy) > (p.type === 'touch' ? 10 : 5)) p.moved = true;
  if (e.pointerId === Input.pointer.id) { Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.moved = p.moved; }
  gestureMove();
}
function onPointerUp(e) {
  if (e.pointerType === 'mouse') { const code = 'Mouse' + e.button; if (Input.mouse.delete(code)) fireRelease(code); }
  const p = Input.pointers.get(e.pointerId); if (!p) return;
  Input.pointers.delete(e.pointerId);
  const dur = Time.real - p.t0;
  if (e.type === 'pointerup' && !p.moved && dur < 0.35 && !p.long && Input.gesture.fingers <= 1) {
    const tap = { x: p.x, y: p.y, type: p.type, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } };
    Input.tap = tap;
    const lt = Input._lastTap;
    if (lt && Time.real - lt.t < 0.3 && Math.hypot(lt.x - p.x, lt.y - p.y) < 30) { Input.doubleTap = tap; Input._lastTap = null; } else Input._lastTap = { x: p.x, y: p.y, t: Time.real };
    PZ.emit('tap', tap);
  }
  if (e.pointerId === Input.pointer.id) {
    Input.pointer.down = false; Input.pointer.released = true; Input.pointer.x = p.x; Input.pointer.y = p.y;
    // 換另一根手指當主要指標
    for (const q of Input.pointers.values()) { Object.assign(Input.pointer, { id: q.id, x: q.x, y: q.y, down: true }); break; }
  }
  gestureStart();
}
function onWheel(e) {
  if (!Input.enabled || isUiTarget(e.target)) return;
  e.preventDefault();
  let d = e.deltaY; if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= 400;
  Input.wheel += d;
  Input.gesture.zoom *= Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0015)); // 觸控板雙指縮放會帶 ctrlKey
  Input.gesture.cx = e.clientX; Input.gesture.cy = e.clientY;
}

/* ---------- 手勢：雙指縮放／旋轉／平移 ---------- */
const G0 = { d: 0, a: 0, cx: 0, cy: 0 };
function twoFingers() { const arr = [...Input.pointers.values()]; return arr.length >= 2 ? [arr[0], arr[1]] : null; }
function gestureStart() {
  const g = Input.gesture; g.fingers = Input.pointers.size;
  const tf = twoFingers();
  if (tf) { const [a, b] = tf; G0.d = Math.hypot(b.x - a.x, b.y - a.y) || 1; G0.a = Math.atan2(b.y - a.y, b.x - a.x); G0.cx = (a.x + b.x) / 2; G0.cy = (a.y + b.y) / 2; g.active = true; }
  else if (Input.pointers.size === 1) { const p = Input.pointers.values().next().value; G0.cx = p.x; G0.cy = p.y; g.active = false; }
  else g.active = false;
}
function gestureMove() {
  const g = Input.gesture, tf = twoFingers();
  if (tf) {
    const [a, b] = tf, d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    g.zoom *= d / G0.d; g.rotate += wrapAngle(ang - G0.a); g.panX += cx - G0.cx; g.panY += cy - G0.cy; g.cx = cx; g.cy = cy;
    G0.d = d; G0.a = ang; G0.cx = cx; G0.cy = cy; g.active = true;
  } else if (Input.pointers.size === 1) {
    const p = Input.pointers.values().next().value;
    if (p.moved) { g.panX += p.x - G0.cx; g.panY += p.y - G0.cy; }
    G0.cx = p.x; G0.cy = p.y; g.cx = p.x; g.cy = p.y;
  }
}

/* ---------- 手把 ---------- */
function pollPads() {
  if (!HAS_DOM || !navigator.getGamepads) return;
  let pads; try { pads = navigator.getGamepads(); } catch (e) { return; }
  let best = null;
  for (const gp of pads) { if (!gp || !gp.connected) continue; if (!best || gp.timestamp > best.timestamp) best = gp; }
  Input.pad = best;
  const was = new Set(Input.padDown);
  Input.padDown.clear();
  if (!best) { for (const c of was) fireRelease(c); return; }
  const std = best.mapping === 'standard' || best.buttons.length >= 16;
  let any = false;
  if (std) {
    for (let i = 0; i < PAD_BTN.length && i < best.buttons.length; i++) {
      const b = best.buttons[i], on = b.pressed || b.value > (i === 6 || i === 7 ? 0.35 : 0.5);
      if (on) { Input.padDown.add(PAD_BTN[i]); any = true; if (!was.has(PAD_BTN[i])) firePress(PAD_BTN[i]); }
    }
  }
  for (const c of was) if (!Input.padDown.has(c)) fireRelease(c);
  const dz = (x, y) => { const m = Math.hypot(x, y); if (m < Input.deadzone) return [0, 0, 0]; const k = Math.min(1, (m - Input.deadzone) / (1 - Input.deadzone)) / m; return [x * k, y * k, Math.min(1, m)]; };
  const ax = best.axes || [];
  const L = dz(ax[0] || 0, ax[1] || 0), R = dz(ax[2] || 0, ax[3] || 0);
  Input._padL = L; Input._padR = R;
  if (any || L[2] > 0 || R[2] > 0) setDevice('gamepad');
}
/** 手把震動（Chrome、Edge 支援；不支援就安靜跳過） */
Input.rumble = (strong = 0.6, weak = 0.4, ms = 120) => {
  const p = Input.pad; if (!p || !p.vibrationActuator || !Settings.get('haptics')) return;
  try { p.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp01(strong), weakMagnitude: clamp01(weak) }); } catch (e) { /* ignore */ }
};

/* ---------- 每格計算動作與搖桿 ---------- */
function codeDown(c) {
  if (c.startsWith('Pad')) return Input.padDown.has(c);
  if (c.startsWith('Mouse')) return Input.mouse.has(c);
  return Input.keys.has(c);
}
function computeActions() {
  for (const a of Input.actions.values()) {
    let d = Input.virtDown.get(a.name) > 0;
    if (!d) for (const c of a.binds) if (codeDown(c)) { d = true; break; }
    if (d && !a._prev) { a._lp = true; a.time = Time.real; }
    if (!d && a._prev) a._lr = true;
    a.down = d; a._prev = d;
    a.pressed = a._lp; a.released = a._lr;
  }
}
function computeAxes() {
  const kx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0), ky = (Input.down('down') ? 1 : 0) - (Input.down('up') ? 1 : 0);
  const cands = [];
  if (kx || ky) { const m = Math.hypot(kx, ky); cands.push([kx / m, ky / m, 1]); }
  if (Input._padL && Input._padL[2] > 0) cands.push(Input._padL);
  const vm = Input.virt.move; if (vm.on) { const m = Math.min(1, Math.hypot(vm.x, vm.y)); cands.push([vm.x, vm.y, m]); }
  let best = null; for (const c of cands) if (!best || c[2] > best[2]) best = c;
  const M = Input.move; if (best) { M.x = best[0]; M.y = best[1]; M.mag = best[2]; } else { M.x = M.y = M.mag = 0; }
  const A = Input.aim, va = Input.virt.aim;
  if (va.on) { A.x = va.x; A.y = va.y; A.mag = Math.min(1, Math.hypot(va.x, va.y)); A.active = A.mag > 0.15; }
  else if (Input._padR && Input._padR[2] > 0) { A.x = Input._padR[0]; A.y = Input._padR[1]; A.mag = Input._padR[2]; A.active = A.mag > 0.3; }
  else { A.x = A.y = A.mag = 0; A.active = false; }
}
function checkLongPress() {
  for (const p of Input.pointers.values()) if (!p.long && !p.moved && Time.real - p.t0 > 0.5 && Input.pointers.size === 1) {
    p.long = true; const lp = { x: p.x, y: p.y, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } };
    Input.longPress = lp; PZ.emit('longpress', lp);
  }
}
function consumeEdges() {
  for (const a of Input.actions.values()) { a._lp = a._lr = false; a.pressed = a.released = false; }
  Input.pointer.pressed = Input.pointer.released = false;
  Input._edgeAge = 0;
}
addSystem({
  name: 'input', order: -90,
  frame(rdt) { pollPads(); computeActions(); computeAxes(); checkLongPress(); Input._updated = false; Input._edgeAge += rdt; },
  update(dt, first) { /* 動作的「剛按下」只在這格第一次更新看得到 */ },
});
addSystem({ name: 'input-consume', order: 1000, update(dt, first) { if (first) { Input._updated = true; } } });
addSystem({
  name: 'input-end', order: 1000,
  render() {
    // 更新過、或暫停中、或停頓太久（超過 0.2 秒就不再緩衝）→ 清掉這格的「剛按下」
    if (Input._updated || Time.paused || Input._edgeAge > 0.2) consumeEdges();
    Input.tap = Input.doubleTap = Input.longPress = null;
    const g = Input.gesture; g.panX = g.panY = 0; g.zoom = 1; g.rotate = 0; Input.wheel = 0;
  },
});

/* ---------- 虛擬搖桿（DOM，畫在 #pz-touch）---------- */
const Sticks = [];
/**
 * PZ.input.stick({ target: 'move'|'aim', zone: {l,t,r,b}（0～1，畫面比例）, radius: 56, fixed: false, x, y, cls, keep })
 * 在場景裡建的搖桿，離開那個場景時自動拿掉；在 load 裡建、或 keep: true 的會一直留著。
 * 浮動式：手指在區域裡按下的地方出現搖桿；固定式（fixed:true）：永遠在 x,y（距左／下的 px）。
 */
Input.stick = (o = {}) => {
  const s = { target: o.target || 'move', zone: Object.assign({ l: 0, t: 0.3, r: 0.55, b: 1 }, o.zone || {}), radius: o.radius || 56, fixed: !!o.fixed, x: o.x || 96, y: o.y || 120, id: null, ox: 0, oy: 0, visible: true };
  const zoneEl = el('div', 'pz-stick-zone'), base = el('div', 'pz-stick' + (s.fixed ? ' fixed' : '')), knob = el('div', 'pz-stick-knob');
  base.appendChild(knob); zoneEl.appendChild(base);
  if (o.cls) base.classList.add(o.cls);
  s.el = zoneEl; s.base = base; s.knob = knob;
  const V = () => Input.virt[s.target];
  const layout = () => {
    const z = s.zone; Object.assign(zoneEl.style, { left: z.l * 100 + '%', top: z.t * 100 + '%', width: (z.r - z.l) * 100 + '%', height: (z.b - z.t) * 100 + '%' });
    base.style.width = base.style.height = s.radius * 2 + 'px';
    if (s.fixed) { base.style.left = s.x + 'px'; base.style.bottom = s.y + 'px'; base.style.top = 'auto'; }
  };
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px,${dy}px)`; };
  s.reset = () => { s.id = null; const v = V(); v.x = v.y = 0; v.on = false; base.classList.remove('on'); setKnob(0, 0); };
  /** 開始拖：一般由區域自己的 pointerdown 呼叫；剛從鍵盤／滑鼠換回觸控的第一下由 onPointerDown 轉過來 */
  s.begin = (e) => {
    if (!Input.enabled || s.id !== null) return false;
    e.preventDefault(); setDevice('touch');
    s.id = e.pointerId; try { zoneEl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const r = zoneEl.getBoundingClientRect();
    if (s.fixed) { const br = base.getBoundingClientRect(); s.ox = br.left + br.width / 2; s.oy = br.top + br.height / 2; }
    else { s.ox = e.clientX; s.oy = e.clientY; base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; }
    base.classList.add('on'); move(e);
    return true;
  };
  zoneEl.addEventListener('pointerdown', s.begin);
  s.contains = (x, y) => { if (!s.visible || zoneEl.style.display === 'none') return false; const r = zoneEl.getBoundingClientRect(); return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const move = (e) => {
    if (e.pointerId !== s.id) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy), R = s.radius;
    // 浮動式：拉超過半徑時底座跟著手指走（不會「拉不動」）
    if (!s.fixed && m > R * 1.35) { const k = (m - R * 1.35) / m; s.ox += dx * k; s.oy += dy * k; const r = zoneEl.getBoundingClientRect(); base.style.left = (s.ox - r.left) + 'px'; base.style.top = (s.oy - r.top) + 'px'; dx = e.clientX - s.ox; dy = e.clientY - s.oy; }
    const mm = Math.hypot(dx, dy), k = mm > R ? R / mm : 1;
    setKnob(dx * k, dy * k);
    const v = V(), dzr = 0.12, nm = Math.min(1, mm / R);
    if (nm < dzr) { v.x = v.y = 0; } else { const sc = (nm - dzr) / (1 - dzr) / (mm || 1); v.x = dx * sc; v.y = dy * sc; }
    v.on = true;
  };
  zoneEl.addEventListener('pointermove', move);
  const up = (e) => { if (e.pointerId === s.id) s.reset(); };
  zoneEl.addEventListener('pointerup', up); zoneEl.addEventListener('pointercancel', up); zoneEl.addEventListener('lostpointercapture', up);
  s.show = (on) => { s.visible = on; zoneEl.style.display = on ? '' : 'none'; if (!on) s.reset(); };
  s.remove = () => { s.reset(); zoneEl.remove(); const i = Sticks.indexOf(s); if (i >= 0) Sticks.splice(i, 1); };
  s.layout = layout;
  layout();
  if (Screen.touch) Screen.touch.appendChild(zoneEl);
  s.scene = o.keep ? null : (typeof Scenes !== 'undefined' && Scenes.name) || null; // 在場景裡建的：離開場景時自動拿掉（o.keep 不拿）
  Sticks.push(s);
  return s;
};

/* ---------- 觸控按鈕 ---------- */
const TButtons = [];
/**
 * PZ.input.button({ action: 'fire', label: '開火', icon: '<svg…>', right: 24, bottom: 110, size: 76, cls, keep })（跟搖桿一樣：場景裡建的離開場景自動拿掉）
 * 按住就是 down(action)；b.cooldown(0～1) 顯示冷卻圈、b.badge(n) 顯示數量、b.disable(true)。
 */
Input.button = (o = {}) => {
  const b = { action: o.action || 'fire', ids: new Set(), disabled: false };
  const e = el('button', 'pz-tbtn' + (o.cls ? ' ' + o.cls : ''), (o.icon || '') + (o.label ? `<span class="pz-tbtn-label">${o.label}</span>` : ''));
  e.type = 'button'; e.setAttribute('aria-label', o.label || o.action);
  const size = o.size || 72; e.style.width = e.style.height = size + 'px';
  for (const k of ['left', 'right', 'top', 'bottom']) if (o[k] != null) e.style[k] = typeof o[k] === 'number' ? `calc(${o[k]}px + var(--pz-safe-${k[0]}, 0px))` : o[k];
  b.el = e;
  const down = (ev) => {
    ev.preventDefault(); ev.stopPropagation(); setDevice('touch');
    if (b.disabled || !Input.enabled) return;
    b.ids.add(ev.pointerId); try { e.setPointerCapture(ev.pointerId); } catch (er) { /* ignore */ }
    Input.virtDown.set(b.action, (Input.virtDown.get(b.action) || 0) + 1);
    e.classList.add('on');
    const hs = Input._handlers.get(b.action); if (hs) for (const f of hs.slice()) safeCall(f, null, b.action);
    if (o.haptic !== false) Haptics.tap('light');
  };
  const up = (ev) => { if (!b.ids.delete(ev.pointerId)) return; Input.virtDown.set(b.action, Math.max(0, (Input.virtDown.get(b.action) || 1) - 1)); if (!b.ids.size) e.classList.remove('on'); };
  b._up = () => { if (b.ids.size) Input.virtDown.set(b.action, Math.max(0, (Input.virtDown.get(b.action) || 0) - b.ids.size)); b.ids.clear(); e.classList.remove('on'); };
  e.addEventListener('pointerdown', down);
  e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); e.addEventListener('lostpointercapture', up);
  e.addEventListener('contextmenu', (ev) => ev.preventDefault());
  b.cooldown = (f) => { e.style.setProperty('--pz-cd', clamp01(f).toFixed(3)); e.classList.toggle('cd', f > 0.001); };
  b.badge = (n) => { e.dataset.badge = n == null || n === '' ? '' : String(n); };
  b.disable = (on) => { b.disabled = on; e.classList.toggle('off', on); if (on) b._up(); };
  b.label = (t) => { const s = e.querySelector('.pz-tbtn-label'); if (s) s.textContent = t; };
  b.show = (on) => { e.style.display = on ? '' : 'none'; if (!on) b._up(); };
  b.remove = () => { b._up(); e.remove(); const i = TButtons.indexOf(b); if (i >= 0) TButtons.splice(i, 1); };
  if (Screen.touch) Screen.touch.appendChild(e);
  b.scene = o.keep ? null : (typeof Scenes !== 'undefined' && Scenes.name) || null;
  TButtons.push(b);
  return b;
};
/** 虛擬按鈕／搖桿要不要顯示：'auto'（觸控時才出現）、true、false */
Input.touchMode = 'auto';
PZ.on('device', (d) => { if (Screen.touch && Input.touchMode === 'auto') Screen.touch.classList.toggle('pz-hide', d !== 'touch'); });
Input.showTouch = (mode) => { Input.touchMode = mode; if (!Screen.touch) return; Screen.touch.classList.toggle('pz-hide', mode === false || (mode === 'auto' && Input.device !== 'touch')); };
Input.clearTouch = () => { for (const s of Sticks.slice()) s.remove(); for (const b of TButtons.slice()) b.remove(); };

/* ---------- 觸覺回饋：Android 用震動；iPhone（iOS 18+）用 switch 開關的系統觸感 ---------- */
const Haptics = PZ.haptic = (() => {
  let lbl = null, inp = null, last = 0;
  const ios = () => {
    if (!HAS_DOM) return;
    if (!lbl) { lbl = el('label'); lbl.setAttribute('aria-hidden', 'true'); lbl.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1; lbl.appendChild(inp); document.body.appendChild(lbl); }
    try { lbl.click(); } catch (e) { /* ignore */ }
  };
  const PAT = { light: [8], medium: [16], heavy: [30], success: [12, 60, 18], error: [24, 50, 24, 50, 24], tick: [5] };
  const h = {
    tap(kind = 'light') {
      if (!HAS_DOM || !Settings.get('haptics')) return;
      const t = nowMs(); if (t - last < 30) return; last = t;
      const pat = PAT[kind] || PAT.light;
      const act = navigator.userActivation; if (act && !act.hasBeenActive) return; // 使用者還沒碰過畫面：瀏覽器不准震
      if (navigator.vibrate) { try { navigator.vibrate(pat); } catch (e) { /* ignore */ } return; }
      if (Env.ios) { ios(); if (pat.length > 1) for (let i = 2; i < pat.length; i += 2) setTimeout(ios, pat.slice(0, i).reduce((a, b) => a + b, 0)); }
    },
  };
  return h;
})();

/* ---------- 安裝事件 ---------- */
Input.init = () => {
  if (!HAS_DOM) return;
  const R = Screen.root;
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  R.addEventListener('pointerdown', onPointerDown);
  R.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !Input.pointers.size) { Input.pointer.x = e.clientX; Input.pointer.y = e.clientY; } });
  R.addEventListener('pointerup', onPointerUp); R.addEventListener('pointercancel', onPointerUp);
  R.addEventListener('lostpointercapture', (e) => { if (Input.pointers.has(e.pointerId)) onPointerUp(e); });
  R.addEventListener('wheel', onWheel, { passive: false });
  R.addEventListener('contextmenu', (e) => { if (!typing(e.target)) e.preventDefault(); });
  // iPhone Safari：擋掉整頁雙指縮放、雙擊放大
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => { if (!typing(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  window.addEventListener('blur', Input.releaseAll);
  PZ.on('hidden', Input.releaseAll);
  window.addEventListener('gamepadconnected', () => { setDevice('gamepad'); PZ.emit('pad', true); });
  window.addEventListener('gamepaddisconnected', () => PZ.emit('pad', false));
  // 在 Claude 的頁面框裡，要先點一下畫面鍵盤才收得到：點畫面時把焦點拿回來
  R.tabIndex = -1; R.style.outline = 'none';
  R.addEventListener('pointerdown', () => { if (document.activeElement === document.body || !document.activeElement) { try { R.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } });
  R.dataset.input = Input.device;
  Screen.touch.classList.toggle('pz-hide', Input.device !== 'touch');
};
