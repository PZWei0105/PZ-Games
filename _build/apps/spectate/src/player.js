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
          autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, fs: 1, enablejsapi: 1,
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
    const wipeEl = $('#pgmWipe');
    Snd.play('take');
    if (!Fx.lite()) { wipeEl.classList.remove('go'); void wipeEl.offsetWidth; wipeEl.classList.add('go'); }
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
  function fullscreen() {
    const f = $('#pgmFrame');
    const req = f.requestFullscreen || f.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (req) req.call(f).catch(() => toast('這台裝置不支援全螢幕：請用播放器右下角的全螢幕鍵'));
    else toast('請用播放器右下角的全螢幕鍵');
  }
  return { open, close, isOpen, take, next, prev, toggle, setMode, refresh, cancelNext, fullscreen, get cur() { return cur; } };
})();
