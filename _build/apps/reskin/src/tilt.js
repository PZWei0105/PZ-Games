/* ===================== depth: tilt the phone and the skin moves in layers =====================
   R.tilt.x / R.tilt.y run from -1 to 1 (right / down). On a phone they come from the gyroscope, measured from how the
   phone is being held (a slowly moving rest position, so any comfortable angle reads as level). On a computer the mouse
   leans the scene a little. With neither, the scene drifts by itself, very gently.
   CSS reads them as --tx / --ty; skins mark their layers with def.depth ([selector, depth]) and their hero picture with
   def.hero (it tilts in 3D and catches a moving highlight). 3D skins read R.tilt directly for their cameras. */
R.tilt = (() => {
  const { settings, bus } = R;
  const T = { x: 0, y: 0, mag: 0, live: false, src: 'idle' };
  const raw = { x: 0, y: 0 }, base = { b: null, g: null };
  let lastOri = 0, lastPtr = 0, listening = false, t = 0, wrote = { x: 9, y: 9 };
  const need = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  const hasOri = typeof DeviceOrientationEvent !== 'undefined' && (R.isTouch || R.isIOS || R.isAndroid);

  function angle() { const o = screen.orientation; return o && typeof o.angle === 'number' ? o.angle : (typeof window.orientation === 'number' ? window.orientation : 0); }
  function onOri(e) {
    if (e.beta == null || e.gamma == null) return;
    // map the phone's axes onto the screen's, whichever way it is held
    let b = e.beta, g = e.gamma;
    const a = ((angle() % 360) + 360) % 360;
    let sx, sy;
    if (a === 90) { sx = b; sy = -g; } else if (a === 270) { sx = -b; sy = g; } else if (a === 180) { sx = -g; sy = -b; } else { sx = g; sy = b; }
    const now = performance.now();
    if (base.b == null || now - lastOri > 1500) { base.g = sx; base.b = sy; }
    lastOri = now;
    // the rest position follows slowly, so holding the phone at any angle is "level"
    base.g += (sx - base.g) * 0.006; base.b += (sy - base.b) * 0.006;
    raw.x = Math.max(-1, Math.min(1, (sx - base.g) / 16));
    raw.y = Math.max(-1, Math.min(1, (sy - base.b) / 16));
    T.src = 'gyro';
  }
  function listen() {
    if (listening || !hasOri) return;
    listening = true;
    window.addEventListener('deviceorientation', onOri);
  }
  function stop() { if (!listening) return; listening = false; window.removeEventListener('deviceorientation', onOri); T.src = 'idle'; }
  // iPhone asks first, and only from a tap
  async function enable() {
    if (!hasOri) { settings.set('tilt', true); return 'none'; }
    if (need) {
      let r = 'denied';
      try { r = await DeviceOrientationEvent.requestPermission(); } catch (e) { r = 'denied'; }
      if (r !== 'granted') { settings.set('tilt', false); return 'denied'; }
    }
    settings.set('tilt', true); settings.set('tiltOk', true);
    listen();
    return 'granted';
  }
  function disable() { settings.set('tilt', false); stop(); }
  // a granted permission stays granted for the session; on iPhone it has to be asked again after a reload
  function resume() {
    if (settings.get('tilt') === false || !hasOri) return;
    if (!need) { listen(); return; }
    // already granted in an earlier visit: iOS remembers the answer for this site, but the call still needs a tap
    const once = () => {
      window.removeEventListener('touchend', once, true); window.removeEventListener('click', once, true);
      if (settings.get('tilt') === false || !settings.get('tiltOk')) return;
      DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') listen(); }).catch(() => {});
    };
    window.addEventListener('touchend', once, true); window.addEventListener('click', once, true);
  }

  // computer: the mouse leans the scene a little
  if (!R.isTouch) window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastPtr = performance.now();
    raw.x = Math.max(-1, Math.min(1, (e.clientX / innerWidth - 0.5) * 1.3));
    raw.y = Math.max(-1, Math.min(1, (e.clientY / innerHeight - 0.5) * 1.3));
    T.src = 'mouse';
  }, { passive: true });

  const root = document.documentElement.style;
  function update(dt) {
    t += dt;
    const now = performance.now();
    const gyro = listening && now - lastOri < 1200, mouse = now - lastPtr < 4000;
    let x = 0, y = 0, k = 7;
    if (gyro) { x = raw.x; y = raw.y; k = 9; }
    else if (mouse) { x = raw.x * 0.7; y = raw.y * 0.7; k = 5; }
    // nobody moving it: a slow drift so the layers still read as layers
    const idle = R.reduced || settings.get('tilt') === false ? 0 : gyro ? 0.04 : mouse ? 0.05 : 0.22;
    x += Math.sin(t * 0.31) * idle; y += Math.sin(t * 0.23 + 1.3) * idle * 0.7;
    if (R.reduced) { x *= 0.3; y *= 0.3; }
    const f = 1 - Math.exp(-dt * k);
    T.x += (x - T.x) * f; T.y += (y - T.y) * f;
    T.mag = Math.min(1, Math.hypot(T.x, T.y));
    T.live = gyro || mouse;
    if (Math.abs(T.x - wrote.x) > 0.002 || Math.abs(T.y - wrote.y) > 0.002) {
      wrote.x = T.x; wrote.y = T.y;
      root.setProperty('--tx', T.x.toFixed(3)); root.setProperty('--ty', T.y.toFixed(3));
      // the hero tilts about the axis perpendicular to the lean
      let ax = -T.y, ay = T.x; if (Math.hypot(ax, ay) < 0.002) { ax = 0; ay = 1; }
      root.setProperty('--hx', ax.toFixed(3)); root.setProperty('--hy', ay.toFixed(3));
      root.setProperty('--ha', (T.mag * 11).toFixed(2) + 'deg');
    }
  }

  // wire a freshly mounted skin's layers: background layers drift against the lean, foreground with it
  function wire(def, rootEl) {
    for (const [sel, z] of def.depth || []) {
      for (const el of rootEl.querySelectorAll(sel)) {
        el.style.setProperty('--dz', z);
        el.classList.add('rs-depth');
      }
    }
    if (def.hero) {
      for (const el of rootEl.querySelectorAll(def.hero)) {
        el.classList.add('rs-hero');
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        if (el.parentElement) el.parentElement.classList.add('rs-persp');
        if (def.glare !== false && !/^(IMG|CANVAS)$/.test(el.tagName)) { const g = document.createElement('i'); g.className = 'rs-glare'; g.setAttribute('aria-hidden', 'true'); el.appendChild(g); }
      }
    }
  }
  bus.on('setting', (k, v) => { if (k === 'tilt') { if (v === false) stop(); } });
  return Object.assign(T, { update, enable, disable, resume, wire, needsAsk: () => need, available: () => hasOri, on: () => listening });
})();
