/* ==========================================================================
   23 除錯
   - 遊戲出錯時畫面下方跳出紅色面板（不會整個當掉）：錯誤訊息、出錯位置、裝置資訊，
     可以「複製錯誤」貼給 Claude、「繼續玩」或「重新載入」。
   - 效能面板：網址加 ?debug、按 F3 或 `、或三指同時點一下：幀數、每格時間、繪圖次數、粒子、畫質。
   - 測試掛鉤 window.__pz：step(n)、pause()、resume()、seed(n)、state()、errors（Playwright 用）。
   ========================================================================== */
const Debug = PZ.debug = { errors: [], shown: new Set(), statsOn: false, statsEl: null, cfg: {}, quiet: false };
const BENIGN = [/ResizeObserver loop/i, /^Script error\.?$/i, /AbortError/i, /play\(\) request was interrupted/i, /The play\(\) request/i];
reportError = (err, where) => {
  const msg = (err && (err.message || err.reason)) || String(err);
  if (BENIGN.some((r) => r.test(msg))) return;
  const stack = (err && err.stack) || '';
  Debug.errors.push({ msg, where, stack, t: Date.now() });
  if (Debug.errors.length > 50) Debug.errors.shift();
  if (typeof console !== 'undefined') console.error('[PZ]' + (where ? ' ' + where + '：' : ''), err);
  if (HAS_DOM && !Debug.quiet) showError(msg, where, stack);
  PZ.emit('error', err, where);
};
function deviceLine() {
  return `${PZ.cfg && PZ.cfg.title ? PZ.cfg.title + ' ' + (PZ.cfg.version || '') + '｜' : ''}PZ ${PZ.version}｜${Gfx.kind || '—'}｜${Screen.w}×${Screen.h}@${(Screen.dpr || 1).toFixed(2)}｜${Env.ios ? 'iOS' : Env.android ? 'Android' : 'Desktop'}${Env.standalone ? '・主畫面' : ''}${Env.inFrame ? '・框內' : ''}｜${HAS_DOM ? navigator.userAgent.replace(/\s*\(KHTML.*$/, '').slice(0, 90) : ''}`;
}
function showError(msg, where, stack) {
  const key = msg + '|' + where; if (Debug.shown.has(key)) return; Debug.shown.add(key);
  let p = document.getElementById('pz-err');
  const top = String(stack).split('\n').slice(0, 6).join('\n');
  const text = `${msg}\n位置：${where || '—'}\n${top}\n${deviceLine()}`;
  if (!p) { p = el('div', 'pz-err'); p.id = 'pz-err'; document.body.appendChild(p); }
  p.innerHTML = `<b>遊戲出了點問題</b>可以先按「繼續玩」；如果一直出現，按「複製錯誤」貼給 Claude。<pre></pre><div class="pz-err-b"><button data-a="copy">複製錯誤</button><button data-a="go">繼續玩</button><button data-a="reload">重新載入</button></div>`;
  p.querySelector('pre').textContent = text;
  p.onclick = async (e) => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === 'copy') { try { await navigator.clipboard.writeText(text); e.target.textContent = '已複製'; } catch (er) { const r = document.createRange(); r.selectNodeContents(p.querySelector('pre')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); e.target.textContent = '已選取，請按複製'; } }
    else if (a === 'go') { p.remove(); }
    else if (a === 'reload') { location.reload(); }
  };
}
Debug.stats = (on = !Debug.statsOn) => {
  Debug.statsOn = on;
  if (on && !Debug.statsEl) { Debug.statsEl = el('div', 'pz-stats'); document.body.appendChild(Debug.statsEl); }
  if (Debug.statsEl) Debug.statsEl.style.display = on ? '' : 'none';
};
addSystem({
  name: 'debug', order: 2000,
  render() {
    if (!Debug.statsOn || !Debug.statsEl || Time.frame % 10) return;
    const r = Gfx.r, st = r ? r.stats : {};
    Debug.statsEl.textContent = `${Time.fps.toFixed(0)} fps  ${(Time.rdt * 1000).toFixed(1)} ms  (${Time.refresh}Hz)\n更新 ${Perf.upd.toFixed(2)} ms  繪圖 ${Perf.ren.toFixed(2)} ms\n${Gfx.kind}  批次 ${st.draws || 0}  方塊 ${st.quads || 0}\n粒子 ${Particles.n}  畫質 ${Quality.cur.name}${Quality.auto ? '(自動)' : ''}  ${Screen.pw}×${Screen.ph}\n音訊 ${Aud.ctx ? Aud.ctx.state : '未啟動'}  聲部 ${Sfx.voices.length}${Debug.errors.length ? '  錯誤 ' + Debug.errors.length : ''}`;
  },
});
Debug.init = (cfg) => {
  Debug.cfg = cfg || {};
  if (!HAS_DOM) return;
  window.addEventListener('error', (e) => reportError(e.error || e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason || 'Promise 失敗', 'promise'));
  if (/[?&#]debug\b/.test(location.href) || cfg.debug) Debug.stats(true);
  window.addEventListener('keydown', (e) => { if (e.code === 'F3' || e.code === 'Backquote') { e.preventDefault(); Debug.stats(); } });
  let three = 0; window.addEventListener('touchstart', (e) => { if (e.touches.length === 3) { three++; setTimeout(() => (three = 0), 400); if (three === 1) Debug.stats(); } }, { passive: true });
};
if (HAS_DOM) {
  window.__pz = {
    get PZ() { return PZ; },
    step: (n = 1, dt = 1 / 60) => Loop.step(n, dt),
    pause: () => { Loop.stop(); }, resume: () => { Loop.start(); },
    seed: (n) => PZ.seed(n),
    get errors() { return Debug.errors.map((e) => e.msg + ' @' + e.where); },
    state: () => ({ scene: Scenes.name, fps: Math.round(Time.fps), renderer: Gfx.kind, tier: Quality.tier, particles: Particles.n, quads: Gfx.r ? Gfx.r.stats.quads : 0, draws: Gfx.r ? Gfx.r.stats.draws : 0, w: Screen.w, h: Screen.h, res: Screen.res, audio: Aud.ctx ? Aud.ctx.state : 'none', errors: Debug.errors.length }),
  };
}
