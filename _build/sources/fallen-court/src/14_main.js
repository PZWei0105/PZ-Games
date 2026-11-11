// ============ 主程式：開機、片頭、輸入、主迴圈 ============
const IN = { ptrs: new Map(), hold: false, holdT: 0, moved: false, pinch: 0, zoom0: 1, keys: {} };
const TITLE = { c: null, key: '' };

function boot() {
  loadSettings(); initCanvas(); uiInit(); bindInput(); showTitle(); cloudBoot();
  let last = performance.now();
  const frame = now => { const raw = now - last, dt = Math.min(.05, Math.max(0, raw / 1000)); last = now; S.t += dt; S.dt = dt; try { tick(dt); } catch (e) { console.error(e); } perfWatch(raw); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  // 站著沒事的時候每 20 秒存一次。
  // 保險：「這一段先別存」（S.hold）不該在站著沒事的時候還掛著；真的卡了一分鐘就放掉它，不能讓遊戲從此不存檔。
  let stale = 0;
  setInterval(() => {
    if (!G || S.mode !== 'explore' || S.cut || S.dialog || S.panel) { stale = 0; return; }
    if (S.hold) { if (!UI.modal.classList.contains('hide') || ++stale < 3) return; S.hold = 0; }
    stale = 0; saveGame();
  }, 20000);
  // 頁面被收起來（切到別的 App、鎖螢幕、關分頁）：把能存的存下來，等著上雲端的那一筆也馬上送。
  // 手機上切走之後頁面常常直接被系統收掉，等不到下一次自動存檔。劇情或戰鬥中途不會存到一半（見 saveGame）。
  const onHide = () => { if (!G || S.mode === 'title') return; saveGame(); if (typeof cloudNow === 'function') cloudNow(); };
  addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); });
}
// 「自動」畫質：連續好幾秒每秒不到 24 格，才把解析度降一級（不會自己升回去，免得忽高忽低）
const PERF = { acc: 0, n: 0, bad: 0 };
function perfWatch(raw) {
  if (S.set.gfx !== 'auto' || S.mode === 'title' || raw > 400 || document.hidden) return;
  PERF.acc += raw; if (++PERF.n < 100) return;
  const avg = PERF.acc / PERF.n; PERF.acc = PERF.n = 0;
  if (avg <= 42) { PERF.bad = 0; return; }
  if (++PERF.bad < 3) return;
  PERF.bad = 0; if (Gfx.cap > 1.2) { Gfx.cap = Gfx.cap > 1.6 ? 1.5 : 1.15; resize(); }
}
function tick(dt) {
  if (S.mode === 'title' || !Z) { drawTitle(S.t); return; }
  inputUpdate(); worldUpdate(dt); camUpdate(dt);
  if (S.mode === 'battle' && BV) { bvUpdate(dt); bvCollect(S.t); }
  partsUpdate(dt); ambientParts(dt); worldCollect(S.t);
  Gfx.overlay = S.mode === 'battle' && BV ? [bvOverlay] : [];
  renderWorld(S.t);
}
function onResize() { TITLE.key = ''; if (S.mode === 'battle' && BV && B) { fitFormation(true); battleCam(); uiBattleSide(); } else if (Z && S.mode === 'explore' && !S.cut) Cam.tzoom = baseZoom(); }

// ---------- 片頭 ----------
function drawTitle(t) {
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const bg = cx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#0b0e1e'); bg.addColorStop(.55, '#070810'); bg.addColorStop(1, '#04050a'); cx.fillStyle = bg; cx.fillRect(0, 0, VW, VH);
  const land = VW > VH * 1.15, R = land ? VH * .36 : Math.min(VW * .41, VH * .21), cyR = land ? VH * .5 : VH * .535, cxR = VW / 2;
  // 頭頂落下來的一道光
  const sh = cx.createLinearGradient(0, 0, 0, VH * .9); sh.addColorStop(0, 'rgba(190,225,255,.20)'); sh.addColorStop(1, 'rgba(190,225,255,0)'); cx.fillStyle = sh; cx.beginPath(); cx.moveTo(cxR - R * .16, 0); cx.lineTo(cxR + R * .16, 0); cx.lineTo(cxR + R * 1.25, VH * .9); cx.lineTo(cxR - R * 1.25, VH * .9); cx.closePath(); cx.fill();
  const key = Math.round(R) + ':' + (TITLE.lit || []).join(); if (TITLE.key !== key) { TITLE.key = key; const s = Math.ceil(R * 2.2 * DPR); TITLE.c = mkCanvas(s, s); const g = TITLE.c.getContext('2d'); g.scale(DPR, DPR); drawRose(g, R * 1.1, R * 1.1, R, TITLE.lit, 0); }
  const bob = Math.sin(t * .5) * 3; cx.globalAlpha = land ? .6 : .92; cx.drawImage(TITLE.c, cxR - R * 1.1, cyR - R * 1.1 + bob, R * 2.2, R * 2.2); cx.globalAlpha = 1;
  const gl = cx.createRadialGradient(cxR, cyR, R * .2, cxR, cyR, R * 1.7); gl.addColorStop(0, 'rgba(255,200,120,.10)'); gl.addColorStop(1, 'rgba(255,200,120,0)'); cx.fillStyle = gl; cx.fillRect(0, 0, VW, VH);
  // 往上飄的浮石屑、往下掉的碎片
  for (let i = 0; i < 44; i++) { const h = Math.sin(i * 127.1) * 43758.5453, x = (h - Math.floor(h)) * VW + Math.sin(t * .4 + i) * 9, sp = 9 + (i % 7) * 4, y = VH + 20 - ((t * sp + i * 71) % (VH + 40)); cx.fillStyle = `rgba(191,232,255,${.22 + .18 * Math.sin(t * 1.3 + i)})`; cx.beginPath(); cx.arc(x, y, 1 + (i % 3) * .55, 0, TAU); cx.fill(); }
  for (let i = 0; i < 6; i++) { const h = Math.sin(i * 311.7) * 43758.5453, x = cxR + ((h - Math.floor(h)) - .5) * R * 2.2, y = cyR + R * .4 + ((t * (16 + i * 5) + i * 190) % (VH * .55)), a = 1 - ((t * (16 + i * 5) + i * 190) % (VH * .55)) / (VH * .55); cx.save(); cx.translate(x, y); cx.rotate(t * (.4 + i * .13) + i); cx.globalAlpha = a * .8; cx.fillStyle = GLASS[i % 5]; cx.beginPath(); cx.moveTo(-5, 3); cx.lineTo(0, -8); cx.lineTo(6, 4); cx.closePath(); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = .8; cx.stroke(); cx.restore(); }
  cx.globalAlpha = 1;
  const vg = cx.createRadialGradient(VW / 2, VH * .5, Math.min(VW, VH) * .3, VW / 2, VH * .5, Math.max(VW, VH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,3,8,.72)'); cx.fillStyle = vg; cx.fillRect(0, 0, VW, VH);
}
function showTitle() {
  S.mode = 'title'; S.panel = false; S.dialog = false; S.cut = 0; S.hold = 0; S.savePend = false; hudMode('none'); UI.dlg.classList.add('hide'); UI.panel.classList.add('hide'); modalClose(); UI.scene.classList.remove('on');
  const save = loadGame(); TITLE.lit = save && save.shards && save.shards.length ? save.shards.slice() : [2, 3, 6, 7, 10, 11]; TITLE.key = '';
  let t = $('#title'); if (t) t.remove();
  t = el('div', '', `<div class="lg"><b>墜庭</b><span>FALLEN COURT</span><em>所有人都盯著那個光點</em></div><div class="tb">${save ? '<button class="bt gold" data-k="cont">繼續</button>' : ''}<button class="bt ${save ? '' : 'gold'}" data-k="new">${save ? '重新開始' : '醒來'}</button><button class="bt" data-k="code">用存檔碼接續</button></div><div class="ver">第一卷　壓艙層</div>`);
  t.id = 'title'; $('#ui').appendChild(t);
  if (AU.ctx) { AU.mode = 'deep'; AU.battle = 0; audioMode(); }
  const start = async fresh => { await fadeTo(1); t.remove(); if (!fresh) { resumeWorld(); return; } newGame(); enterZone('vault'); hudMode('explore'); await fadeTo(0); runScript('intro'); };
  $$('#title .bt').forEach(b => b.onclick = async () => {
    audioInit(); sfx('confirm'); const k = b.dataset.k;
    // Claude 版：雲端的進度還沒回來就先等一下（最多 5 秒），免得開一個新遊戲把另一台裝置的進度蓋掉
    if (CLOUD.state === 'wait') { toast('正在找你上次的進度……'); await Promise.race([CLOUD.ready, wait(5000)]); if (!t.isConnected) return; }
    if (CLOUD.ask) { cloudAsk(); return; }
    if (k === 'cont') { G = save; start(false); }
    else if (k === 'new') { if (save && !(await confirmBox('重新開始？', '現在的進度會被蓋掉。<br>想留著的話，先到「設定」裡複製存檔碼。', '重新開始'))) return; start(true); }
    else { modalShow('<div class="mb cut"><h3>存檔碼</h3><div class="seam"></div><div class="ms"><div class="hint">把之前在「設定」裡複製的存檔碼貼進來。</div><textarea class="code" id="tcode" style="height:120px"></textarea></div><div class="mf"><button class="bt" data-k="0">算了</button><button class="bt gold" data-k="1">接續</button></div></div>');
      $$('#modal .mf .bt').forEach(m => m.onclick = () => { if (m.dataset.k === '1') { if (!importSave($('#tcode').value)) { toast('這串存檔碼讀不出來。'); sfx('deny'); return; } modalClose(); start(false); } else modalClose(); }); }
  });
}

// ---------- 輸入 ----------
function bindInput() {
  const pt = e => ({ x: e.clientX, y: e.clientY });
  cv.addEventListener('pointerdown', e => {
    audioInit(); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = pt(e); IN.ptrs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now() });
    if (IN.ptrs.size === 1) { IN.moved = false; IN.hold = false; IN.holdT = performance.now(); }
    if (IN.ptrs.size === 2) { const a = [...IN.ptrs.values()]; IN.pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); IN.zoom0 = S.zoomK || 1; IN.hold = false; IN.moved = true; if (Z) Z.joy.x = Z.joy.y = 0; }
  });
  cv.addEventListener('pointermove', e => {
    const q = IN.ptrs.get(e.pointerId); if (!q) return; const p = pt(e); q.x = p.x; q.y = p.y;
    if (IN.ptrs.size === 2) { const a = [...IN.ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (IN.pinch > 10 && S.mode === 'explore' && !S.cut) { S.zoomK = clamp(IN.zoom0 * d / IN.pinch, .7, 1.5); Cam.tzoom = baseZoom(); } return; }
    if (Math.hypot(q.x - q.x0, q.y - q.y0) > 14) { IN.moved = true; if (S.mode === 'explore') IN.hold = true; }
  });
  const up = e => {
    const q = IN.ptrs.get(e.pointerId); if (!q) return; IN.ptrs.delete(e.pointerId);
    if (IN.ptrs.size === 0) { const wasHold = IN.hold; IN.hold = false; if (Z) Z.joy.x = Z.joy.y = 0; if (!IN.moved && !wasHold && e.type === 'pointerup') tap(q.x, q.y); }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { if (S.mode !== 'explore' || S.cut) return; S.zoomK = clamp((S.zoomK || 1) * (e.deltaY < 0 ? 1.08 : .93), .7, 1.5); Cam.tzoom = baseZoom(); e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
    audioInit(); IN.keys[e.key.toLowerCase()] = 1;
    if (e.key === 'Enter' || e.key === ' ') { if (Dlg.adv) { Dlg.adv(); e.preventDefault(); } else if (BI && BI.pick != null) { confirmAct(); e.preventDefault(); } }
    else if (e.key === 'Escape') { if (!UI.modal.classList.contains('hide') && !S.dialog) { /* 彈窗要自己選 */ } else if (S.panel) panelClose(); }
    else if (e.key.toLowerCase() === 'm' && S.mode === 'explore' && !S.panel) openMenu('party');
  });
  addEventListener('keyup', e => { IN.keys[e.key.toLowerCase()] = 0; });
  addEventListener('blur', () => { IN.keys = {}; IN.ptrs.clear(); IN.hold = false; if (Z) Z.joy.x = Z.joy.y = 0; });
}
function tap(x, y) { if (S.mode === 'battle') battleTap(x, y); else if (S.mode === 'explore') tapWorld(x, y); }
function inputUpdate() {
  if (!Z || S.mode !== 'explore') return;
  const K = IN.keys; let jx = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0), jy = (K.s || K.arrowdown ? 1 : 0) - (K.w || K.arrowup ? 1 : 0);
  if (IN.ptrs.size === 1 && !S.cut && !S.dialog && !S.panel) {
    const q = [...IN.ptrs.values()][0]; if (!IN.hold && !IN.moved && performance.now() - IN.holdT > 260) IN.hold = true;
    if (IN.hold) { const L = Z.leader, [lx, ly] = w2s(L.x, L.y, L.z + .6), dx = q.x - lx, dy = q.y - ly, d = Math.hypot(dx, dy); if (d > 22) { const n = Math.hypot(dx, dy * 2); jx = dx / n; jy = dy * 2 / n; } else { jx = 0; jy = 0; } }
  }
  Z.joy.x = jx; Z.joy.y = jy;
}
window.addEventListener('load', boot);
