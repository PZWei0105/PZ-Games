/* PZ 遊戲收藏 — the in-game button.
   Every game page gets this script: a small floating button that opens a menu with
   回到收藏庫 / 怎麼玩 / 重新載入 / 全螢幕, and it records play time for the collection.
   Everything lives in its own shadow root so it can't clash with the game's own styles,
   and taps on it don't reach the game. */
(() => {
  'use strict';
  if (window.__pzHub) return;
  window.__pzHub = true;
  let inFrame = false;
  try { inFrame = window.top !== window; } catch (e) { inFrame = true; }
  if (inFrame) return; // opened inside something else: that page has its own way out

  const me = document.currentScript;
  const GID = (me && me.dataset.game) || '';
  const BID = (me && me.dataset.build) || GID;
  if (!GID) return;
  const ROOT = new URL('./', me.src).href; // hub.js sits next to the collection's index.html
  const HOME = ROOT + '#game-' + encodeURIComponent(GID);
  const K = 'pzgc.v1.';
  const get = (n, d) => { try { const v = localStorage.getItem(K + n); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (n, v) => { try { localStorage.setItem(K + n, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

  /* ── play time ── */
  const stat = (fn) => { const all = get('stats', {}); const s = all[GID] || { plays: 0, ms: 0, last: 0 }; fn(s); all[GID] = s; set('stats', all); };
  if (ss.get('pzgc.hub.' + BID) !== '1') { ss.set('pzgc.hub.' + BID, '1'); stat((s) => { s.plays = (s.plays || 0) + 1; s.last = Date.now(); }); }
  let acc = 0, t0 = document.hidden ? 0 : Date.now(), played = 0;
  function flush() {
    const now = Date.now();
    if (t0) { acc += now - t0; t0 = document.hidden ? 0 : now; }
    if (acc < 1000) return;
    const add = Math.min(acc, 6 * 36e5); acc = 0; played += add;
    stat((s) => { s.ms = (s.ms || 0) + add; s.last = now; });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else t0 = Date.now(); });
  addEventListener('pagehide', flush);
  setInterval(flush, 30000);

  /* ── catalog (title, colour, how to play) ── */
  let game = null, catP = null;
  const loadCat = () => catP || (catP = fetch(ROOT + 'catalog.json').then((r) => r.json()).then((c) => {
    game = (c.games || []).find((g) => g.id === GID) || null;
    return game;
  }).catch(() => null));

  /* ── look ── */
  const ic = {
    home: '<path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ic[k]}</svg>`;
  const MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="pzhg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="16" fill="rgba(10,13,26,.85)" stroke="url(#pzhg)" stroke-width="2.4"/><path d="M25 18.5 46 32 25 45.5z" fill="none" stroke="url(#pzhg)" stroke-width="4.6" stroke-linejoin="round"/></svg>';
  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.hb { position: fixed; z-index: 3; width: 44px; height: 44px; padding: 0; border-radius: 50%; display: grid; place-items: center;
  background: rgba(14, 16, 26, .6); border: 1px solid rgba(255, 255, 255, .3); box-shadow: 0 6px 20px rgba(0, 0, 0, .5), 0 0 0 4px rgba(255, 255, 255, .05);
  opacity: .42; touch-action: none; cursor: pointer; transition: opacity .35s, transform .2s; outline: none; }
.hb.awake, .hb:hover { opacity: 1; }
.hb.drag { transform: scale(1.12); transition: opacity .35s; }
.hb.hide { opacity: 0; pointer-events: none; }
.hb svg { width: 24px; height: 24px; display: block; }
.tip { position: fixed; z-index: 4; max-width: min(260px, calc(100vw - 90px)); padding: 9px 13px; border-radius: 14px; background: rgba(14, 16, 28, .96);
  border: 1px solid rgba(255, 255, 255, .16); color: #eef0f6; font: 600 13px/1.5 -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .5); opacity: 0; transform: translateY(6px); transition: opacity .3s, transform .3s; pointer-events: none; }
.tip.on { opacity: 1; transform: none; }
.scrim { position: fixed; inset: 0; z-index: 1; background: rgba(0, 0, 0, .5); opacity: 0; pointer-events: none; transition: opacity .3s; }
.scrim.on { opacity: 1; pointer-events: auto; }
.sheet { position: fixed; z-index: 2; left: 50%; bottom: 0; width: min(520px, 100vw); max-height: 86vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 10px 18px calc(20px + env(safe-area-inset-bottom, 0px)); border-radius: 24px 24px 0 0; background: rgba(14, 16, 28, .97);
  border: 1px solid rgba(255, 255, 255, .12); border-bottom: 0; box-shadow: 0 -20px 60px rgba(0, 0, 0, .6); color: #eef0f6;
  font: 400 15px/1.6 -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif; letter-spacing: .01em;
  transform: translate(-50%, 105%); transition: transform .42s cubic-bezier(.2, .9, .25, 1); visibility: hidden; }
.sheet.on { transform: translate(-50%, 0); visibility: visible; }
.grab { width: 40px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, .22); margin: 2px auto 14px; }
.hd { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.hd .cv { width: 46px; height: 46px; border-radius: 12px; background: #222 center/cover; flex: none; box-shadow: 0 0 0 1px rgba(255, 255, 255, .14); }
.hd b { display: block; font-size: 18px; font-weight: 900; line-height: 1.3; }
.hd small { display: block; color: #9aa0b4; font-size: 12.5px; margin-top: 2px; }
.row { display: grid; gap: 8px; }
.bt { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 10px 14px; border-radius: 15px; border: 1px solid rgba(255, 255, 255, .1);
  background: rgba(255, 255, 255, .06); color: inherit; font: inherit; font-weight: 700; text-align: left; cursor: pointer; }
.bt:active { transform: scale(.985); background: rgba(255, 255, 255, .1); }
.bt svg { width: 20px; height: 20px; flex: none; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.bt .tx { flex: 1; }
.bt .tx small { display: block; font-weight: 500; font-size: 12px; color: #9aa0b4; margin-top: 1px; }
.bt.main { background: linear-gradient(180deg, var(--a2, #ffe7a3), var(--a, #ffb547)); color: #120d04; border-color: transparent; }
.bt.main small { color: rgba(18, 13, 4, .7); }
.bt.warn { border-color: rgba(255, 150, 120, .5); background: rgba(255, 120, 90, .14); }
.bt.ghost { justify-content: center; background: transparent; }
.bt.play svg { fill: currentColor; stroke: none; }
.how { margin-top: 14px; padding: 14px; border-radius: 16px; background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .08); }
.how[hidden] { display: none; }
.how h4 { margin: 0 0 6px; font-size: 13px; letter-spacing: .12em; color: var(--a, #ffb547); }
.how h4 + p { margin-top: 0; }
.how p { margin: 0 0 12px; color: #d9dcea; font-size: 14.5px; }
.how ul { margin: 0 0 12px; padding: 0; list-style: none; display: grid; gap: 7px; }
.how li { font-size: 14px; color: #d9dcea; padding-left: 14px; position: relative; }
.how li::before { content: ""; position: absolute; left: 0; top: .62em; width: 5px; height: 5px; border-radius: 50%; background: var(--a, #ffb547); }
.how li b { color: #fff; }
.how .note { font-size: 13px; color: #c8ccdc; background: rgba(255, 255, 255, .05); border-radius: 12px; padding: 9px 11px; }
.ft { margin-top: 12px; text-align: center; color: #7d8296; font-size: 12px; }
@media (prefers-reduced-motion: reduce) { .sheet, .hb, .tip, .scrim { transition: none; } }`;

  /* ── build it ── */
  let host, root, hb, sheet, scrim, tipEl;
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const canFull = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !/iPhone|iPod/.test(navigator.userAgent);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('pz-hub');
    host.setAttribute('style', 'all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;');
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><div class="scrim"></div><div class="sheet" role="dialog" aria-label="遊戲收藏選單"></div><div class="tip"></div><button class="hb" aria-label="遊戲收藏選單">${MARK}</button>`;
    hb = root.querySelector('.hb'); sheet = root.querySelector('.sheet'); scrim = root.querySelector('.scrim'); tipEl = root.querySelector('.tip');
    // taps on the button or the menu belong to us, not to the game underneath
    for (const t of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'touchmove', 'wheel', 'contextmenu', 'dblclick']) {
      host.addEventListener(t, (e) => { e.stopPropagation(); }, { passive: true });
    }
    (document.documentElement || document.body).appendChild(host);
    bindDrag();
    // Menu taps are read from the pointer itself (press and release on the same spot), not from
    // "click": some games cancel clicks page-wide, and on a busy game the click of the tap that
    // opened the menu can arrive late and land on the backdrop or a button.
    let downEl = null, px = 0, py = 0;
    const pick = (t) => (t && t.closest ? t.closest('[data-a], .scrim') : null);
    root.addEventListener('pointerdown', (e) => { downEl = isOpen ? pick(e.target) : null; px = e.clientX; py = e.clientY; }, true);
    root.addEventListener('pointercancel', () => { downEl = null; }, true);
    root.addEventListener('pointerup', (e) => {
      const d = downEl; downEl = null;
      if (!isOpen || !d || pick(e.target) !== d || Math.hypot(e.clientX - px, e.clientY - py) > 14) return;
      lastTap = Date.now();
      if (d === scrim) close(); else act(d.dataset.a, d);
    }, true);
    place();
  }
  // games that rebuild the whole page would take the button with them: put it back
  setInterval(() => { if (!host || !host.isConnected) mount(); }, 3000);

  /* ── the button: drag anywhere, it sticks to the nearest side ── */
  const pos = { x: 0, y: 0 };
  function place() {
    const p = get('handle', null), W = innerWidth, H = innerHeight;
    pos.x = p ? clamp(p.x * W, 6, W - 50) : W - 52;
    pos.y = p ? clamp(p.y * H, 50, H - 104) : H * 0.42;
    if (pos.x + 22 < W / 2) pos.x = 6; else pos.x = W - 50;
    hb.style.left = pos.x + 'px'; hb.style.top = pos.y + 'px';
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  addEventListener('resize', () => { if (hb) place(); });
  let sleepT = 0;
  function wake(ms = 2600) { hb.classList.add('awake'); clearTimeout(sleepT); sleepT = setTimeout(() => hb.classList.remove('awake'), ms); }
  function bindDrag() {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, down = false;
    hb.addEventListener('pointerdown', (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; ox = pos.x; oy = pos.y; try { hb.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ } wake(); });
    hb.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; hb.classList.add('drag'); }
      if (moved) { pos.x = clamp(ox + dx, 4, innerWidth - 48); pos.y = clamp(oy + dy, 4, innerHeight - 48); hb.style.left = pos.x + 'px'; hb.style.top = pos.y + 'px'; }
    });
    const up = () => {
      if (!down) return; down = false; hb.classList.remove('drag');
      if (moved) {
        pos.x = pos.x + 22 < innerWidth / 2 ? 6 : innerWidth - 50; hb.style.left = pos.x + 'px';
        set('handle', { x: pos.x / innerWidth, y: pos.y / innerHeight });
      } else open();
    };
    hb.addEventListener('pointerup', up);
    hb.addEventListener('pointercancel', () => { down = false; hb.classList.remove('drag'); });
    hb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }
  function tip(text, ms = 4200) {
    tipEl.textContent = text;
    const r = hb.getBoundingClientRect(), left = r.left < innerWidth / 2;
    tipEl.style.top = Math.max(8, r.top + 2) + 'px';
    tipEl.style.left = left ? (r.right + 10) + 'px' : 'auto';
    tipEl.style.right = left ? 'auto' : (innerWidth - r.left + 10) + 'px';
    tipEl.classList.add('on'); wake(ms);
    setTimeout(() => tipEl.classList.remove('on'), ms);
  }

  /* ── the menu ── */
  let isOpen = false, armT = 0, lastTap = 0;
  const fmt = (ms) => { const m = Math.round(ms / 60000); return m < 1 ? '不到 1 分鐘' : m < 60 ? m + ' 分鐘' : Math.floor(m / 60) + ' 小時' + (m % 60 ? ' ' + (m % 60) + ' 分' : ''); };
  function howHTML(g) {
    const h = (g && g.how) || {};
    const ctl = (h.controls || []).filter((c) => (isTouch ? c.input !== '滑鼠' && c.input !== '鍵盤' : c.input !== '觸控')).slice(0, 7);
    const ctl2 = ctl.length ? ctl : (h.controls || []).slice(0, 7);
    let s = '';
    if (h.goal) s += `<h4>目標</h4><p>${esc(h.goal)}</p>`;
    if (ctl2.length) s += `<h4>操作</h4><ul>${ctl2.map((c) => `<li><b>${esc(c.action)}</b>：${esc(c.effect)}</li>`).join('')}</ul>`;
    if ((h.tips || []).length) s += `<h4>小技巧</h4><ul>${h.tips.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    if (h.save) s += `<h4>存檔</h4><p>${esc(h.save)}</p>`;
    if (h.note) s += `<p class="note">${esc(h.note)}</p>`;
    return s || '<p>這款沒有附說明，直接玩玩看吧。</p>';
  }
  function render() {
    const g = game;
    const title = g ? g.title : document.title || '遊戲';
    const acc0 = g && g.accent ? g.accent : '#ffb547';
    sheet.style.setProperty('--a', acc0);
    sheet.style.setProperty('--a2', '#fff3cf');
    const cover = g && g.media && g.media.cover ? ROOT + g.media.cover : '';
    const full = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const save = (g && g.how && g.how.save) || '';
    const noSave = /不存進度|不記錄進度/.test(save);
    const saveLine = noSave ? '這款不存進度，回去後這一場會重來' : save ? save.split(/[；。]/)[0].slice(0, 30) : '回到這款遊戲的介紹頁';
    sheet.innerHTML = `<div class="grab"></div>
      <div class="hd">${cover ? `<div class="cv" style="background-image:url('${esc(cover)}')"></div>` : ''}<div><b>${esc(title)}</b><small>PZ 遊戲收藏・這次玩了 ${fmt(played + acc + (t0 ? Date.now() - t0 : 0))}</small></div></div>
      <div class="row">
        <button class="bt main" data-a="home">${svg('home')}<span class="tx">回到收藏庫<small>${esc(saveLine)}</small></span></button>
        <button class="bt" data-a="how">${svg('bulb')}<span class="tx">怎麼玩<small>目標、操作和小技巧</small></span>${svg('chev')}</button>
        <div class="how" hidden></div>
        <button class="bt" data-a="reload">${svg('refresh')}<span class="tx">重新載入<small>畫面卡住或沒有聲音時用</small></span></button>
        ${canFull ? `<button class="bt" data-a="full">${svg(full ? 'shrink' : 'expand')}<span class="tx">${full ? '離開全螢幕' : '全螢幕'}</span></button>` : ''}
        <button class="bt ghost play" data-a="close">${svg('play')}<span>繼續玩</span></button>
      </div>
      <div class="ft">圓鈕可以拖到不擋畫面的地方</div>`;
    // keyboard (Enter / Space) still works through click; pointer taps are handled above
    sheet.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', (e) => { if (e.detail === 0 && Date.now() - lastTap > 700) act(b.dataset.a, b); }));
  }
  function open() {
    if (isOpen) return;
    isOpen = true; flush();
    render();
    loadCat().then(() => { if (isOpen) { const howOpen = !sheet.querySelector('.how').hidden; render(); if (howOpen) act('how'); } });
    scrim.classList.add('on'); sheet.classList.add('on'); hb.classList.add('hide'); tipEl.classList.remove('on');
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; clearTimeout(armT);
    scrim.classList.remove('on'); sheet.classList.remove('on'); hb.classList.remove('hide'); wake();
  }
  let backT = 0;
  function goHome() {
    flush();
    const came = ss.get('pzgc.from') === BID && history.length > 1;
    if (came) {
      const here = location.href;
      history.back();
      backT = setTimeout(() => { if (location.href === here) location.replace(HOME); }, 900);
    } else location.replace(HOME);
  }
  addEventListener('pagehide', () => clearTimeout(backT));
  // don't let the browser park this game in its page cache after leaving it: back in the collection,
  // the game's memory should be free again
  addEventListener('unload', () => {});
  addEventListener('pageshow', (e) => { if (e.persisted) { close(); t0 = document.hidden ? 0 : Date.now(); } });
  function act(a, b) {
    if (a === 'home') return goHome();
    if (a === 'close') return close();
    if (a === 'how') {
      const box = sheet.querySelector('.how'); if (!box) return;
      if (b && !box.hidden) { box.hidden = true; return; }
      box.innerHTML = howHTML(game); box.hidden = false;
      if (!game) loadCat().then(() => { if (!box.hidden) box.innerHTML = howHTML(game); });
      return;
    }
    if (a === 'reload') {
      if (!b.classList.contains('warn')) {
        b.classList.add('warn'); b.querySelector('.tx').innerHTML = '再按一次確定重新載入<small>還沒存到的進度可能會不見</small>';
        clearTimeout(armT); armT = setTimeout(() => { if (isOpen) render(); }, 3500);
        return;
      }
      flush(); location.reload(); return;
    }
    if (a === 'full') {
      const d = document, el = d.documentElement;
      const isFull = d.fullscreenElement || d.webkitFullscreenElement;
      try {
        if (isFull) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      } catch (e) { /* not allowed here */ }
      close();
    }
  }
  addEventListener('keydown', (e) => { if (isOpen && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);

  /* ── go ── */
  function start() {
    mount();
    wake(3200);
    if (!get('hubTip', false)) { setTimeout(() => tip('想回收藏庫或看玩法，點這顆圓鈕'), 1400); set('hubTip', true); }
    setTimeout(loadCat, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
