/* ==========================================================================
   20 場景
     PZ.scene('play', {
       enter(params) { … },          // 進場（可以是 async：載入中會蓋著轉場）
       exit() { … },
       update(dt) { … },             // 遊戲邏輯（暫停、停頓時不會被呼叫）
       render(g) { … },              // 畫圖：一開始是世界座標；g.hud() 之後畫 HUD
       bg: '#101418',                // 底色
       ui: () => '<div class="hud">…</div>',   // 這個場景的 DOM 介面（進場放進 #pz-ui，離場拿掉）
       keepCamera: false,            // 換場景時要不要保留相機
     });
     await PZ.go('play', { stage: 2 }, { type: 'fade', time: 0.35, color: '#000' });   // 轉場：fade｜iris｜wipe｜diamond｜blinds｜shutter｜slide｜pixel｜none
   換場景時會清掉：遊戲時間的計時器與補間、粒子、跳字、震動、按住的按鍵。
   ========================================================================== */
const Scenes = PZ.scenes = { defs: {}, cur: null, name: '', trans: null, busy: false, uiEl: null };
PZ.scene = (name, def) => { def.name = name; Scenes.defs[name] = def; return def; };
PZ.go = async (name, params, o = {}) => {
  const def = Scenes.defs[name]; if (!def) throw new Error('沒有這個場景：' + name);
  if (Scenes.busy) { Scenes._queued = [name, params, o]; return; }
  Scenes.busy = true;
  const type = o.type || (Scenes.cur ? 'fade' : 'none'), time = o.time != null ? o.time : 0.35;
  const T = { type, t: 0, time, phase: 'out', color: toColor(o.color || '#000'), cx: o.cx, cy: o.cy };
  if (type !== 'none' && Scenes.cur) { Scenes.trans = T; await waitPhase(T); }
  // 離開舊場景
  const old = Scenes.cur;
  if (old) {
    if (old.exit) safeCall(old.exit, old);
    for (const sp of Springs) if (sp.scene === Scenes.name) sp.dead = true;
    // 這個場景建的虛擬搖桿、按鈕一起拿掉（在 load 裡、或加了 keep:true 建的會留著）
    for (const s of Sticks.slice()) if (s.scene && s.scene === Scenes.name) s.remove();
    for (const b of TButtons.slice()) if (b.scene && b.scene === Scenes.name) b.remove();
  }
  if (Scenes.uiEl) { Scenes.uiEl.remove(); Scenes.uiEl = null; }
  PZ.clearTimers(); Tweens.clear(); Particles.clear(); Fx.nums.length = 0; Input.releaseAll();
  Cam.trauma = 0; if (!def.keepCamera) Cam.reset();
  Post.waves.length = 0; Fx._waves.length = 0; Post.flash[3] = 0; PZ.resume('*');
  if (!def.keepLights) Light.reset();
  if (!def.keepWeather) Weather.reset();
  Cinema.reset();
  Scenes.cur = def; Scenes.name = name;
  if (def.ui) {
    const u = typeof def.ui === 'function' ? def.ui(params) : def.ui;
    const box = el('div', 'pz-scene-ui pz-scene-' + name);
    if (typeof u === 'string') box.innerHTML = u; else if (u) box.appendChild(u);
    Screen.ui.appendChild(box); Scenes.uiEl = box; UI.enhance(box);
  }
  if (def.enter) { try { await def.enter(params); } catch (e) { reportError(e, name + '.enter'); } }
  PZ.emit('scene', name, params);
  if (type !== 'none') { T.phase = 'in'; T.t = 0; if (!Scenes.trans) Scenes.trans = T; await waitPhase(T); }
  Scenes.trans = null; Scenes.busy = false;
  if (Scenes._queued) { const q = Scenes._queued; Scenes._queued = null; PZ.go(q[0], q[1], q[2]); }
};
function waitPhase(T) { return new Promise((res) => { T.done = res; }); }
PZ.restartScene = (params, o) => PZ.go(Scenes.name, params, o);

function drawTransition(g) {
  const T = Scenes.trans; if (!T) return;
  T.t += Time.rdt;
  let k = clamp01(T.t / Math.max(0.001, T.time));
  const cover = T.phase === 'out' ? Ease.inOutQuad(k) : 1 - Ease.inOutQuad(k);
  const W = Screen.w, H = Screen.h, col = T.color;
  if (T.type === 'iris') {
    const cx = T.cx != null ? T.cx : W / 2, cy = T.cy != null ? T.cy : H / 2, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4, r = R * (1 - cover);
    if (cover > 0.001) g.ring(cx, cy, R + 2, R + 2 - r, col);
  } else if (T.type === 'wipe') {
    const w = (W + H * 0.6) * cover;
    g.save(); g.translate(-H * 0.3, 0); g.poly([0, 0, w, 0, w - H * 0.3, H, -H * 0.3, H], col); g.restore();
  } else if (T.type === 'diamond') {   // 菱形一格一格長出來，從左上掃到右下（回來時也從左上先亮）
    const sz = Math.max(W, H) / 9, cols = Math.ceil(W / sz) + 1, rows = Math.ceil(H / sz) + 1, spread = 0.7;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cx = i * sz, cy = j * sz, off = ((cx / W) * 0.65 + (cy / H) * 0.35) * spread, o2 = T.phase === 'in' ? spread - off : off;
      const s = Ease.inOutQuad(clamp01(cover * (1 + spread) - o2)) * sz * 1.03;
      if (s > 0.5) g.poly([cx, cy - s, cx + s, cy, cx, cy + s, cx - s, cy], col);
    }
  } else if (T.type === 'blinds') {   // 百葉窗
    const n = 9, sh = H / n, spread = 0.5;
    for (let i = 0; i < n; i++) { const c = Ease.inOutQuad(clamp01(cover * (1 + spread) - (i / n) * spread)); if (c > 0.001) g.rect(0, i * sh, W, sh * c + 0.5, col); }
  } else if (T.type === 'shutter') {   // 上下兩片快門闔起來，接縫有一道光
    const hh = (H / 2) * cover; if (hh > 0.5) { g.rect(0, 0, W, hh, col); g.rect(0, H - hh, W, hh, col); const e = Math.max(0, 1 - Math.abs(cover - 0.92) * 8); if (e > 0) { g.rect(0, hh - 2, W, 2, '#ffffff', { a: e * 0.6, add: 1 }); g.rect(0, H - hh, W, 2, '#ffffff', { a: e * 0.6, add: 1 }); } }
  } else if (T.type === 'slide') {   // 一片從右邊推進來
    const x0 = W * (1 - cover); if (cover > 0.001) { g.rect(x0, 0, W - x0 + 1, H, col); g.rect(x0, 0, 3, H, '#ffffff', { a: 0.25 * (1 - Math.abs(cover - 0.5) * 2), add: 1 }); }
  } else if (T.type === 'pixel') {   // 方塊亂序蓋上
    const sz = Math.max(W, H) / 14, cols = Math.ceil(W / sz), rows = Math.ceil(H / sz);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); const th = ((h ^ (h >>> 16)) >>> 0) / 4294967296 * 0.85; if (cover > th) g.rect(i * sz, j * sz, sz + 0.5, sz + 0.5, col); }
  } else if (cover > 0.001) g.rect(0, 0, W, H, col, { a: cover });
  if (k >= 1 && T.done) { const d = T.done; T.done = null; d(); }
}

addSystem({
  name: 'scene', order: 0,
  update(dt) { const s = Scenes.cur; if (s && s.update && !Scenes.busy) { try { s.update(dt); } catch (e) { reportError(e, Scenes.name + '.update'); } } else if (s && s.update && Scenes.trans && Scenes.trans.phase === 'in') { try { s.update(dt); } catch (e) { reportError(e, Scenes.name + '.update'); } } },
});
addSystem({
  name: 'draw', order: 100,
  render() {
    const r = Gfx.r; if (!r) return;
    const s = Scenes.cur;
    r.begin(s && s.bg != null ? s.bg : Screen.bg);
    G._hudDone = false; G._litDone = false; G.world();
    if (s && s.render) { try { s.render(G); } catch (e) { reportError(e, Scenes.name + '.render'); } }
    if (!G._hudDone) G.hud();
    drawTransition(G);
    r.end();
  },
});
