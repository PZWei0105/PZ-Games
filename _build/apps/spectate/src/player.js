'use strict';
/* 觀戰 SPECTATE — 導播台：YouTube 官方播放器（PGM）＋預覽排（PVW）＋ TAKE 切換＋ AUTO 連播 */

const Player = (() => {
  let yt = null, apiP = null, ready = false, cur = null, ctxIds = [], ctxLabel = '', mode = 'next';
  let tickT = 0, acc = 0, nTick = 0, nextT = 0, startedFor = null, ccFor = null, open_ = false, wantId = null;

  function loadAPI() {
    if (apiP) return apiP;
    apiP = new Promise((res, rej) => {
      if (window.YT && window.YT.Player) { res(); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { /* */ } res(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiP = null; rej(new Error('連不上 YouTube')); };
      document.head.appendChild(s);
      setTimeout(() => rej(new Error('YouTube 播放器載入逾時')), 15000);
    });
    return apiP;
  }

  function startPos(it) {
    const h = histOf(it.i);
    if (!h || h[3] || it.lv === 'live') return 0;
    if (h[1] > 20 && (!h[2] || h[1] < h[2] - 20)) return h[1];
    return 0;
  }

  async function open(id, list, label) {
    const it = IDX.byId.get(id) || { i: id, c: '', t: 'YouTube 影片', p: 0, l: 'play', ghost: 1 };
    cur = it;
    ctxIds = (list && list.length ? list : [id]).slice(0, 80);
    if (!ctxIds.includes(id)) ctxIds.unshift(id);
    ctxLabel = label || '';
    mode = 'next';
    const box = $('#pgm');
    if (!open_) {
      open_ = true;
      box.hidden = false;
      document.documentElement.classList.add('watching');
      requestAnimationFrame(() => box.classList.add('in'));
      Snd.duck(true);
      Land.watch(true);
    }
    hideMsg();
    hideNext();
    renderInfo();
    renderPvw();
    try {
      await loadAPI();
    } catch (e) {
      showMsg('播放器打不開', e.message + '。可以直接到 YouTube 看。', true);
      return;
    }
    playId(it);
  }

  function playId(it) {
    wantId = it.i;
    if (it.ne) {
      try { if (yt && ready) yt.stopVideo(); } catch (e) { /* */ }
      showMsg('這支要到 YouTube 看', (NE_WHY[it.ne] || '頻道不開放在其他 App 播') + '。到 YouTube 看，有 Premium 一樣沒有廣告。', true);
      return;
    }
    const start = startPos(it);
    const zhSub = SET.zhSubs && !zf(it);
    ccFor = zhSub ? it.i : null;
    if (!yt) {
      ready = false;
      yt = new YT.Player('ytp', {
        videoId: it.i,
        width: '100%', height: '100%',
        playerVars: {
          autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, fs: TOUCH ? 0 : 1, enablejsapi: 1,
          origin: location.origin, hl: 'zh-TW', cc_lang_pref: 'zh-Hant', cc_load_policy: zhSub ? 1 : 0, start: Math.floor(start) || undefined,
        },
        events: {
          onReady: () => { ready = true; try { yt.playVideo(); } catch (e) { /* */ } },
          onStateChange: onState,
          onError: onErr,
          onApiChange: onApi,
        },
      });
    } else if (ready) {
      try { yt.loadVideoById({ videoId: it.i, startSeconds: Math.floor(start) || 0 }); } catch (e) { /* */ }
    } else {
      setTimeout(() => { if (wantId === it.i) playId(it); }, 400);
    }
  }

  function onState(e) {
    const st = e.data;
    if (st === 1) {
      hideMsg();
      Snd.duck(true);
      if (startedFor !== cur.i) { startedFor = cur.i; nTick = 0; }
      startTick();
      if (ccFor === cur.i) tryCaptions();
    } else if (st === 2) {
      stopTick(true);
    } else if (st === 0) {
      stopTick(true);
      try { noteWatch(cur, yt.getDuration(), yt.getDuration(), 0); } catch (err) { /* */ }
      renderPvw();
      if (SET.auto) countdownNext();
    }
  }
  function onErr(e) {
    const code = e.data;
    if ((code === 101 || code === 150) && cur) { markNoEmbed(cur.i); renderPvw(); }
    const why = code === 101 || code === 150 ? '這支影片的頻道不允許在其他 App 播放（常見於有年齡限制或音樂版權的預告）。'
      : code === 100 ? '這支影片已經被刪除或設成私人。' : '播放器出了點問題。';
    Snd.play('err');
    showMsg('這支要到 YouTube 看', why, true);
  }
  function onApi() {
    if (ccFor === (cur && cur.i)) tryCaptions();
  }
  function tryCaptions() {
    try {
      yt.loadModule('captions');
      const list = yt.getOption('captions', 'tracklist') || [];
      if (!list.length) return;
      const pick = list.find((t) => /^zh-(Hant|TW|HK)/i.test(t.languageCode)) || list.find((t) => /^zh/i.test(t.languageCode));
      if (pick) { yt.setOption('captions', 'track', { languageCode: pick.languageCode }); ccFor = null; }
    } catch (e) { /* 字幕模組不一定在 */ }
  }

  function startTick() {
    clearInterval(tickT);
    tickT = setInterval(() => {
      if (!yt || !cur) return;
      let st = -1;
      try { st = yt.getPlayerState(); } catch (e) { /* */ }
      if (st !== 1) return;
      acc += 1000; nTick++;
      if (nTick % 5 === 0) flushTick();
    }, 1000);
  }
  function stopTick(flush) { clearInterval(tickT); tickT = 0; if (flush) flushTick(); }
  function flushTick() {
    if (!cur || cur.ghost && !cur.c) { acc = 0; return; }
    try { noteWatch(cur, yt.getCurrentTime(), yt.getDuration(), acc); } catch (e) { /* */ }
    acc = 0;
  }

  function close() {
    if (!open_) return;
    Land.exit(true);
    Land.watch(false);
    open_ = false;
    stopTick(true);
    hideNext();
    try { yt && yt.stopVideo(); } catch (e) { /* */ }
    const box = $('#pgm');
    box.classList.remove('in');
    document.documentElement.classList.remove('watching');
    setTimeout(() => { if (!open_) box.hidden = true; }, 320);
    Snd.duck(false);
    Snd.play('back');
    if (typeof onPlayerClosed === 'function') onPlayerClosed();
  }
  const isOpen = () => open_;

  /* PVW：接下來／同遊戲／同頻道 */
  function pvwList() {
    if (!cur) return [];
    if (mode === 'game' && cur.g) return L.game(cur.g).filter((x) => x.i !== cur.i && !x.ne).slice(0, 24);
    if (mode === 'ch' && cur.c) return L.channel(cur.c).filter((x) => x.i !== cur.i && !x.s && !x.ne).slice(0, 24);
    const k = ctxIds.indexOf(cur.i);
    const after = ctxIds.slice(k + 1).concat(ctxIds.slice(0, Math.max(0, k)));
    return after.map((v) => IDX.byId.get(v)).filter(Boolean).filter((x) => x.lv !== 'upcoming' && !x.ne).slice(0, 24);
  }
  function nextItem() { return pvwList()[0] || null; }

  function take(id) {
    const it = IDX.byId.get(id);
    if (!it) return;
    hideNext();
    stopTick(true);
    Snd.play('take');
    wipe();
    if (mode !== 'next' && !ctxIds.includes(id)) {
      // 從同遊戲／同頻道切過去：之後的 PVW 改用那份清單
      ctxIds = pvwList().map((x) => x.i);
      ctxIds.unshift(cur.i);
      ctxLabel = mode === 'game' ? gameName(gameOf(cur.g)) : chOf(cur.c).n;
    }
    setTimeout(() => {
      cur = it;
      mode = 'next';
      renderInfo();
      renderPvw();
      playId(it);
      if (typeof onPlayerTake === 'function') onPlayerTake(it);
    }, Fx.lite() ? 0 : 260);
  }

  function countdownNext() {
    const nx = nextItem();
    if (!nx) return;
    const box = $('#pgmNext');
    let left = 5;
    box.hidden = false;
    const draw = () => {
      box.innerHTML = `<div class="nx-in"><span class="nx-tag">NEXT</span><img src="${thumb(nx.i)}" alt=""><div class="nx-t"><b>${esc(titleOf(nx))}</b><span>${esc(chOf(nx.c).n)}</span></div>
        <div class="nx-n">${left}</div><button class="nx-go" data-act="take" data-v="${nx.i}">TAKE ▶</button><button class="nx-x" data-act="nx-cancel">先不要</button></div>`;
    };
    draw();
    clearInterval(nextT);
    nextT = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(nextT); take(nx.i); return; }
      Snd.play('count');
      draw();
    }, 1000);
  }
  function hideNext() { clearInterval(nextT); const b = $('#pgmNext'); if (b) { b.hidden = true; b.innerHTML = ''; } }

  function showMsg(title, why, ytBtn) {
    const m = $('#pgmMsg');
    m.hidden = false;
    m.innerHTML = `<div class="msg-in"><b>${esc(title)}</b><p>${esc(why)}</p><div class="msg-acts">
      ${ytBtn && cur ? `<a class="btn red" href="${ytUrl(cur.i)}" target="_blank" rel="noopener">到 YouTube 看</a>` : ''}
      ${nextItem() ? `<button class="btn" data-act="take" data-v="${nextItem().i}">下一支</button>` : ''}</div></div>`;
  }
  function hideMsg() { const m = $('#pgmMsg'); m.hidden = true; m.innerHTML = ''; }

  function renderInfo() {
    const it = cur;
    if (!it) return;
    const ch = chOf(it.c), ln = LANES[it.l] || LANES.play, g = gameOf(it.g);
    const subbed = !!VIEW.subs[it.c], later = !!VIEW.later[it.i];
    $('#pgmTtl').textContent = (ch.n || '') + '｜' + titleOf(it);
    $('#pgmLive').hidden = it.lv !== 'live';
    const meta = [];
    if (it.lv === 'live') meta.push(`<b class="red">● 直播中${it.cv ? ' · ' + num(it.cv) + ' 人觀戰' : ''}</b>`);
    else if (it.lv === 'upcoming') meta.push('<b class="gold">' + esc(until(it.st)) + ' 開播</b>');
    else meta.push(esc(ago(it.p)));
    if (it.v) meta.push(num(it.v) + ' 次觀看');
    if (it.d) meta.push(dur(it.d));
    if (it.dh) meta.push(`<b class="lime">黑馬 ×${it.dh}</b>`);
    const tz = it.tz ? `<div class="pi-orig">原標題：${esc(it.t)}</div>` : (it.t0 && it.t0 !== it.t ? `<div class="pi-orig">原標題：${esc(it.t0)}</div>` : '');
    $('#pgmInfo').innerHTML = `
      <div class="pi-lane" style="--lc:${ln.c}"><i>${ln.zh}</i><b>${ln.en}</b></div>
      <h2 class="pi-title">${esc(titleOf(it))}</h2>${tz}
      <div class="pi-meta">${meta.join('<span class="dot"></span>')}</div>
      ${it.c ? `<div class="pi-ch">
        <a class="pi-av" href="#ch/${it.c}" data-close="1">${avatar(it.c, 44)}</a>
        <a class="pi-cn" href="#ch/${it.c}" data-close="1"><b>${esc(ch.n)}</b><span>${esc(KINDS[ch.k] || '')}${ch.l ? ' · ' + (LANGS[ch.l] || ch.l) : ''}${ch.subs ? ' · ' + num(ch.subs) + ' 訂閱' : ''}</span></a>
        <button class="sub-btn ${subbed ? 'on' : ''}" data-act="${subbed ? 'unsub' : 'sub'}" data-c="${it.c}">${subbed ? '已訂閱' : '＋ 訂閱'}</button>
      </div>` : ''}
      <div class="pi-acts">
        <button class="chip ${later ? 'on' : ''}" data-act="later" data-v="${it.i}">${later ? '✓ 稍後觀看' : '＋ 稍後觀看'}</button>
        ${g ? `<a class="chip" href="#g/${encodeURIComponent(g.k)}" data-close="1">🎮 ${esc(gameName(g))}</a>` : ''}
        <a class="chip" href="${ytUrl(it.i)}" target="_blank" rel="noopener">在 YouTube 開</a>
        <button class="chip" data-act="copy" data-v="${it.i}">複製連結</button>
      </div>`;
  }
  function renderPvw() {
    const list = pvwList();
    const g = cur && gameOf(cur.g);
    const tabs = [['next', '接下來' + (ctxLabel ? '・' + ctxLabel : '')]];
    if (g) tabs.push(['game', '同遊戲']);
    if (cur && cur.c) tabs.push(['ch', '同頻道']);
    $('#pgmPvw').innerHTML = `
      <div class="pvw-head"><span class="pvw-tag">PVW</span>
        <div class="pvw-tabs">${tabs.map(([k, t]) => `<button class="${mode === k ? 'on' : ''}" data-act="pvw" data-k="${k}">${esc(t)}</button>`).join('')}</div>
        <button class="auto ${SET.auto ? 'on' : ''}" data-act="auto" title="播完自動接下一支">AUTO</button></div>
      <div class="pvw-row">${list.length ? list.map((x, i) => `
        <button class="mon" data-act="take" data-v="${x.i}">
          <span class="mon-scr"><img loading="lazy" src="${thumb(x.i)}" alt=""><i class="mon-n">${String(i + 1).padStart(2, '0')}</i>${x.lv === 'live' ? '<i class="bug-live">LIVE</i>' : ''}${histOf(x.i) && histOf(x.i)[3] ? '<i class="mon-rp">REPLAY</i>' : ''}${x.d ? `<i class="mon-d">${dur(x.d)}</i>` : ''}</span>
          <span class="mon-t">${esc(titleOf(x))}</span><span class="mon-c">${esc(chOf(x.c).n)}</span>
        </button>`).join('') : '<div class="pvw-empty">這一排看完了</div>'}</div>
      ${list.length ? `<button class="take-btn" data-act="take" data-v="${list[0].i}"><b>TAKE</b><span>切到下一支</span></button>` : ''}`;
  }
  function setMode(k) { mode = k; renderPvw(); Snd.play('tick'); }
  function refresh() { if (open_) { renderInfo(); renderPvw(); } }
  function relink(list) {   // 開的時候還沒有資料（從別的 App 直接點進來）：資料到了再補
    if (!open_ || !cur) return;
    const it = IDX.byId.get(cur.i);
    if (it) cur = it;
    if (list && list.length > 1 && ctxIds.length <= 1) { ctxIds = list.slice(0, 80); if (!ctxIds.includes(cur.i)) ctxIds.unshift(cur.i); }
    refresh();
  }
  function toggle() {
    if (!yt || !ready) return;
    try { if (yt.getPlayerState() === 1) yt.pauseVideo(); else yt.playVideo(); } catch (e) { /* */ }
  }
  function next() { const n = nextItem(); if (n) take(n.i); }
  function prev() {
    const k = ctxIds.indexOf(cur && cur.i);
    if (k > 0) take(ctxIds[k - 1]);
  }
  function cancelNext() { hideNext(); }
  // 切換的斜帶：播完就收回（不然紅色斜帶會停在畫面右邊）
  let wipeT = 0;
  function wipe() {
    const w = $('#pgmWipe');
    if (!w || Fx.lite()) return;
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
    clearTimeout(wipeT);
    wipeT = setTimeout(() => w.classList.remove('go'), 950);
  }
  function fullscreen() {
    if (TOUCH) { Land.toggle(); return; }   // 手機：橫放全螢幕（下面的 Land）
    const f = $('#pgmFrame');
    const req = f.requestFullscreen || f.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (req) req.call(f).catch(() => toast('這台裝置不支援全螢幕：請用播放器右下角的全螢幕鍵'));
    else toast('請用播放器右下角的全螢幕鍵');
  }
  return { open, close, isOpen, take, next, prev, toggle, setMode, refresh, relink, cancelNext, fullscreen, wipe, hasNext: () => !!nextItem(), get cur() { return cur; } };
})();

/* ------------------------------------------------------------ 橫放全螢幕
   手機鎖了直向，影片照樣能橫著看。
   - iPhone：網頁不能自己轉螢幕、也不能整頁全螢幕，所以把播放器整個轉 90 度鋪滿，手機轉橫看就是滿版。
   - Android：整個導播台真的全螢幕（藏掉瀏覽器和系統列），再請系統轉橫；系統不給轉，就一樣把播放器轉 90 度。
   - 電腦：照舊（Player.fullscreen 的舊做法）。
   「轉手機自動橫放」看陀螺儀：手機從直的「很快地」轉成橫的就自動進來，再很快轉回直的就退出（怎麼進來就怎麼出去：
   按鍵進來的只用 ✕ 退出，跟 YouTube App 鎖直向時一樣）。躺著側看手機、或慢慢躺下這種身體在動的，
   轉的過程超過 1.5 秒，不會誤觸。 */
const Land = (() => {
  const CAN_FS = !IS_IPHONE && !!(Element.prototype.requestFullscreen || Element.prototype.webkitRequestFullscreen);
  let mode = '';          // ''、rot（轉 90 度）、fill（畫面本來就是橫的，鋪滿）
  let real = false;       // 有沒有開真的全螢幕（Android）
  let dir = SET.landDir === -90 ? -90 : 90;   // 90：手機頂端朝左；-90：頂端朝右
  let why = '';           // tilt（轉手機進來的）、btn（按鍵進來的）
  let uprightAt = 0, landAt = 0, cand = null, candT = 0, gotTilt = 0;
  const QUICK = 1500;     // 從直的到橫的（或反過來）在這麼短的時間內完成，才算「轉手機」
  let watching = false, sensing = false, asked = false, dimT = 0, tipT = 0, probe = null;
  const frame = () => $('#pgmFrame');
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  function safe() {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(probe);
    }
    const cs = getComputedStyle(probe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  /* 算位置：影片保持 16:9、避開瀏海和底部橫條；右邊一定留一條放按鈕（不蓋到 YouTube 播放器自己的字幕、設定鍵） */
  function layout() {
    if (!mode) return;
    const port = innerHeight > innerWidth;
    if (mode === 'rot' && !port) mode = 'fill';            // 解開直向鎖定、手機真的轉橫了：不用再轉
    else if (mode === 'fill' && port) { exit(); return; }  // 沒鎖直向、手機轉回直的：退出
    const rot = mode === 'rot' ? dir : 0;
    const W = rot ? innerHeight : innerWidth, H = rot ? innerWidth : innerHeight;
    const s = safe();   // 瀏海、底部橫條（真的全螢幕時也算，避開挖孔鏡頭）
    // 轉 90 度時，畫面的左邊是手機的上緣（瀏海），右邊是手機的下緣（底部橫條）
    const [L, R, T, B] = rot === 90 ? [s.t, s.b, s.r, s.l] : rot === -90 ? [s.b, s.t, s.l, s.r] : [s.l, s.r, s.t, s.b];
    const RAIL = 56;
    const aw = Math.max(160, W - L - R), ah = Math.max(80, H - T - B);
    const vw = Math.min(aw - RAIL, ah * 16 / 9), vh = vw * 9 / 16;
    const spare = aw - vw, bar = Math.max(RAIL, spare / 2);   // 黑邊夠寬就置中，不夠就把影片往左推、右邊留一條
    const vl = L + spare - bar, vt = T + (ah - vh) / 2;
    const f = frame(), set = (k, v) => f.style.setProperty(k, Math.round(v * 10) / 10 + (k === '--fx-rot' ? 'deg' : 'px'));
    set('--fx-w', W); set('--fx-h', H); set('--fx-rot', rot);
    set('--fx-vl', vl); set('--fx-vt', vt); set('--fx-vw', vw); set('--fx-vh', vh);
    set('--fx-rr', R + (bar - 52) / 2);
    set('--fx-rt', Math.max(T, vt) + 6); set('--fx-rb', Math.max(B, H - vt - vh) + 6);
    $('#pgm').classList.toggle('fsx-rot', !!rot);
  }
  const VARS = ['--fx-w', '--fx-h', '--fx-rot', '--fx-vl', '--fx-vt', '--fx-vw', '--fx-vh', '--fx-rr', '--fx-rt', '--fx-rb'];

  function on(src) {
    $('#pgm').classList.add('fsx');
    document.documentElement.classList.add('fsx');
    layout();
    wake();
    tip(src);
    Snd.play('whoosh');
    Player.wipe();
  }
  function enter(src, d) {
    if (mode || !Player.isOpen()) return;
    if (d) dir = d;
    mode = innerHeight > innerWidth ? 'rot' : 'fill';
    why = src;
    on(src);
  }
  async function enterReal() {
    const box = $('#pgm'), req = box.requestFullscreen || box.webkitRequestFullscreen;
    try { await req.call(box); } catch (e) { /* 不給全螢幕：照樣轉 90 度 */ }
    real = isFs();
    if (real) { try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* 系統不給轉：下面就轉 90 度 */ } }
    enter('btn');
  }
  function exit(silent) {
    if (!mode) return;
    mode = ''; why = ''; cand = null;
    clearTimeout(dimT); clearTimeout(tipT);
    if (real) {
      real = false;
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* */ }
      if (isFs()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* */ } }
    }
    $('#pgm').classList.remove('fsx', 'fsx-rot');
    document.documentElement.classList.remove('fsx');
    const f = frame();
    VARS.forEach((k) => f.style.removeProperty(k));
    const t = $('#pgmTip'); if (t) t.classList.remove('on');
    if (!silent) Snd.play('back');
  }
  function toggle() {
    if (mode) { exit(); return; }
    if (CAN_FS) enterReal(); else enter('btn');
  }

  /* 右邊黑邊的按鈕：進來 3.5 秒後變淡；變淡時第一下只是叫醒（橫拿時拇指常常碰到邊邊） */
  function wake() {
    const r = $('#pgmRail');
    if (!r) return;
    r.classList.remove('dim');
    const nx = $('#fxNext'); if (nx) nx.hidden = !Player.hasNext();
    clearTimeout(dimT);
    dimT = setTimeout(() => r.classList.add('dim'), 3500);
  }
  function tip(src) {
    const n = +store.get('landTips', 0) || 0;
    if (n >= 4) return;
    store.set('landTips', n + 1);
    say(src === 'tilt' ? '橫放全螢幕｜手機轉回直的就退出' : '橫放全螢幕｜按右邊的 ✕ 退出');
  }
  /* 全螢幕時的提示：寫在播放器裡，跟著轉 */
  function say(msg) {
    const t = $('#pgmTip');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(tipT);
    tipT = setTimeout(() => t.classList.remove('on'), 2800);
  }

  /* 陀螺儀 */
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    gotTilt = Date.now();
    if (!watching || !SET.autoLand || !Player.isOpen()) return;
    const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    // 「上方」在手機座標裡的方向：x 朝手機右緣、y 朝手機頂端、z 朝螢幕外
    const ux = -Math.cos(b) * Math.sin(g), uy = Math.sin(b), uz = Math.cos(b) * Math.cos(g);
    let st = null;   // 0：直立；90：頂端朝左；-90：頂端朝右；null：平放或斜的，不算
    if (Math.abs(uz) < 0.62) { if (ux > 0.78) st = 90; else if (ux < -0.78) st = -90; else if (uy > 0.78) st = 0; }
    const now = Date.now();
    if (st === null) { cand = null; return; }
    if (st !== cand) { cand = st; candT = now; }
    const held = now - candT;
    if (st === 0) {
      // 轉手機進來的：很快轉回直的、停 0.65 秒 → 退出
      if (mode && why === 'tilt' && held > 650 && candT - landAt < QUICK) exit();
      uprightAt = now;
      return;
    }
    if (held < 400) { if (mode) landAt = now; return; }
    if (!mode) {
      if (candT - uprightAt < QUICK) enter('tilt', st);
      landAt = now;
      return;
    }
    landAt = now;
    if (mode === 'rot' && st !== dir) { dir = st; layout(); }   // 翻到另一邊：跟著轉
  }
  function sense() {
    if (sensing || !TOUCH || !SET.autoLand || !window.DeviceOrientationEvent) return;
    if (IS_IOS && typeof DeviceOrientationEvent.requestPermission === 'function' && store.get('motion') !== 'granted') return;   // iPhone：要先在點擊裡問過
    sensing = true;
    addEventListener('deviceorientation', onTilt);
  }
  function unsense() { sensing = false; removeEventListener('deviceorientation', onTilt); }
  // iPhone 要在點擊裡問「動作與方向」權限：點影片、按全螢幕的那一下順便問（同一次打開 App 只問一次）
  function ask() {
    if (!TOUCH || !SET.autoLand || asked || !window.DeviceOrientationEvent) return;
    if (!IS_IOS || typeof DeviceOrientationEvent.requestPermission !== 'function') { sense(); return; }   // Android 不用問
    if (store.get('motion') === 'denied') return;
    asked = true;
    try {
      DeviceOrientationEvent.requestPermission().then((r) => { store.set('motion', r); if (r === 'granted') sense(); }).catch(() => {});
    } catch (e) { /* */ }
  }
  function watch(v) {
    watching = v;
    cand = null; uprightAt = 0; landAt = 0;
    if (v) sense();
  }
  function onSetting() {
    if (SET.autoLand) { asked = false; if (store.get('motion') === 'denied') store.del('motion'); ask(); sense(); }
    else { unsense(); }
  }

  function init() {
    if (!TOUCH) return;
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('a[href^="#watch/"], [data-act="hero-play"], [data-act="play-list"], [data-act="take"], #pgmFull')) ask();
    }, true);
    const r = $('#pgmRail');
    if (r) r.addEventListener('click', (e) => {
      e.stopPropagation();
      if (r.classList.contains('dim')) { wake(); return; }
      const bt = e.target.closest('button');
      if (!bt) { wake(); return; }
      if (bt.id === 'fxExit') exit();
      else if (bt.id === 'fxFlip') { dir = -dir; SET.landDir = dir; saveSet(); layout(); Snd.play('tick'); wake(); }
      else if (bt.id === 'fxNext') { Player.next(); wake(); }
    });
    const re = () => { if (mode) layout(); };
    addEventListener('resize', re);
    addEventListener('orientationchange', () => setTimeout(re, 250));
    if (window.visualViewport) visualViewport.addEventListener('resize', re);
    const fsc = () => { if (real && !isFs()) exit(true); };
    document.addEventListener('fullscreenchange', fsc);
    document.addEventListener('webkitfullscreenchange', fsc);
  }
  return { init, toggle, enter, exit, watch, ask, onSetting, say, get mode() { return mode; }, get dir() { return dir; } };
})();
