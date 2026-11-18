'use strict';
/* 補番 BINGE — 放映機（YouTube 官方播放器＋自己的操作台）與直式滑看（Shorts 一滑一集）
   長片合輯的重點：接著看（這台或另一台看到的地方）、章節／約第幾集、跳到下一集、倍速、跳片頭、睡前定時、次回預告連播。 */

let YTAPI = null;
function loadYT() {
  if (YTAPI) return YTAPI;
  YTAPI = new Promise((res, rej) => {
    if (window.YT && window.YT.Player) { res(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { /* */ } res(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { YTAPI = null; rej(new Error('連不上 YouTube')); };
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('YouTube 播放器載入逾時')), 15000);
  });
  return YTAPI;
}
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

const Player = (() => {
  let yt = null, ready = false, cur = null, ctxIds = [], ctxLabel = '', open_ = false, wantId = null;
  let tickT = 0, acc = 0, nTick = 0, nextT = 0, startedFor = null, ccFor = null, ecOff = null, lastPush = 0;
  let sleepAt = 0, sleepMode = '', fading = false, resumeHint = null;

  function startPos(v) {
    const h = histOf(v.i);
    if (!h || h[3] || v.live) return 0;
    const len = h[2] || v.d || 0;
    if (h[1] > 20 && (!len || h[1] < len - 25)) return h[1];
    return 0;
  }

  async function open(id, list, label) {
    const v = IDX.byId.get(id) || { i: id, c: '', t: 'YouTube 影片', d: 0, f: 'e', ghost: 1 };
    if (Swipe.isOpen()) Swipe.close(true);
    cur = v;
    ctxIds = (list && list.length ? list : [id]).slice(0, 300);
    if (!ctxIds.includes(id)) ctxIds.unshift(id);
    ctxLabel = label || '';
    const box = $('#theater');
    if (!open_) {
      open_ = true;
      box.hidden = false;
      document.documentElement.classList.add('watching');
      requestAnimationFrame(() => box.classList.add('in'));
      Snd.duck(true);
      Land.watch(true);
    }
    hideMsg(); hideNext();
    render();
    showEyecatch(v);
    try { await loadYT(); } catch (e) { showMsg('放映機打不開', e.message + '。可以直接到 YouTube 看。', true); return; }
    playId(v);
  }

  function showEyecatch(v) {
    if (ecOff) ecOff();
    const s = showOf(v);
    const k = KINDS[kindOf(v)] || KINDS.jp;
    ecOff = Fx.eyecatch($('#thFrame'), s ? s.n : v.t, epLabel(v) || FMTS[v.f] && FMTS[v.f].zh || '', k.c);
  }

  function playId(v) {
    wantId = v.i;
    if (v.ne) {
      try { if (yt && ready) yt.stopVideo(); } catch (e) { /* */ }
      if (ecOff) { ecOff(); ecOff = null; }
      showMsg('這支要到 YouTube 看', '頻道不開放在其他 App 播，或有年齡、地區限制。到 YouTube 看，有 Premium 一樣沒有廣告。', true);
      return;
    }
    const start = startPos(v);
    resumeHint = start > 60 ? start : null;
    const zhSub = SET.zhSubs && !v.zh;
    ccFor = zhSub ? v.i : null;
    if (!yt) {
      ready = false;
      yt = new YT.Player('ytp', {
        videoId: v.i, width: '100%', height: '100%',
        playerVars: {
          autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, fs: TOUCH ? 0 : 1, enablejsapi: 1,
          origin: location.origin, hl: 'zh-TW', cc_lang_pref: 'zh-Hant', cc_load_policy: zhSub ? 1 : 0, start: Math.floor(start) || undefined,
        },
        events: {
          onReady: () => { ready = true; try { yt.playVideo(); } catch (e) { /* */ } },
          onStateChange: onState, onError: onErr, onApiChange: () => { if (ccFor === (cur && cur.i)) tryCaptions(); },
        },
      });
    } else if (ready) {
      try { yt.loadVideoById({ videoId: v.i, startSeconds: Math.floor(start) || 0 }); } catch (e) { /* */ }
    } else {
      setTimeout(() => { if (wantId === v.i) playId(v); }, 400);
    }
  }

  function onState(e) {
    const st = e.data;
    if (st === 1) {
      hideMsg();
      Snd.duck(true);
      if (ecOff) { ecOff(); ecOff = null; }
      if (startedFor !== cur.i) {
        startedFor = cur.i; nTick = 0;
        try { if (SET.rate !== 1) yt.setPlaybackRate(SET.rate); } catch (err) { /* */ }
        if (resumeHint) showResume(resumeHint);
      }
      startTick();
      if (ccFor === cur.i) tryCaptions();
    } else if (st === 2) {
      stopTick(true);
      push(true);
    } else if (st === 0) {
      stopTick(true);
      try { noteWatch(cur, yt.getDuration(), yt.getDuration(), 0); } catch (err) { /* */ }
      push(true);
      renderList();
      if (sleepMode === 'end') { goodnight(); return; }
      if (SET.auto) countdownNext();
    }
  }
  function onErr(e) {
    const code = e.data;
    if ((code === 101 || code === 150) && cur) markNoEmbed(cur.i);
    const why = code === 101 || code === 150 ? '這支影片的頻道不允許在其他 App 播放，或只在特定地區能看。'
      : code === 100 ? '這支影片已經被刪除或設成私人。' : '播放器出了點問題。';
    if (ecOff) { ecOff(); ecOff = null; }
    Snd.play('err');
    showMsg('這支要到 YouTube 看', why, true);
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

  /* ---- 每秒：時間軸、約第幾集、觀看紀錄、睡前定時 */
  function startTick() {
    clearInterval(tickT);
    tickT = setInterval(() => {
      if (!yt || !cur) return;
      let st = -1;
      try { st = yt.getPlayerState(); } catch (e) { /* */ }
      updateTime();
      if (sleepAt && !fading && Date.now() >= sleepAt) fadeOut();
      if (st !== 1) return;
      acc += 1000; nTick++;
      if (nTick % 5 === 0) flushTick();
      if (nTick % 300 === 0) push(false);
    }, 1000);
  }
  function stopTick(flush) { clearInterval(tickT); tickT = 0; if (flush) flushTick(); }
  function flushTick() {
    if (!cur || (cur.ghost && !cur.c)) { acc = 0; return; }
    try { noteWatch(cur, yt.getCurrentTime(), yt.getDuration(), acc); } catch (e) { /* */ }
    acc = 0;
  }
  function push(force) {
    if (!cur || !yt) return;
    if (!force && Date.now() - lastPush < 120e3) return;
    lastPush = Date.now();
    try { pushProgress(cur, yt.getCurrentTime(), yt.getDuration()); } catch (e) { /* */ }
  }
  function times() {
    let pos = 0, len = cur ? cur.d : 0;
    try { pos = yt.getCurrentTime() || 0; len = yt.getDuration() || len; } catch (e) { /* */ }
    return { pos, len };
  }
  function updateTime() {
    const el = $('#thTime');
    if (!el || !cur) return;
    const { pos, len } = times();
    const fill = $('.tl-fill', el), cap = $('.tl-cap', el);
    if (fill && len) fill.style.transform = 'scaleX(' + clamp(pos / len, 0, 1).toFixed(4) + ')';
    if (cap) {
      const ap = approxEp(cur, pos);
      const parts = [`<b>${clock(pos)}</b> / ${clock(len)}`];
      if (ap) parts.push(`<em>${esc(ap.label)}${ap.n ? ' / ' + ap.n + ' 集' : ''}</em>`);
      if (len - pos > 60) parts.push('剩 ' + span(len - pos));
      if (sleepAt) parts.push(`<i class="moon">☾ ${new Date(sleepAt).toTimeString().slice(0, 5)} 停</i>`);
      else if (sleepMode === 'end') parts.push('<i class="moon">☾ 這支看完就停</i>');
      cap.innerHTML = parts.join('<span class="dot"></span>');
    }
    const skip = $('#thSkip');
    if (skip) skip.hidden = !(cur.f === 'e' && pos < 240 && len > 600);
  }

  /* ---- 操作 */
  function seekBy(s) {
    if (!yt || !ready) return;
    try { const { pos, len } = times(); yt.seekTo(clamp(pos + s, 0, Math.max(0, len - 2)), true); Snd.play('seek'); updateTime(); } catch (e) { /* */ }
  }
  function seekTo(s) { if (!yt || !ready) return; try { yt.seekTo(Math.max(0, s), true); Snd.play('seek'); updateTime(); } catch (e) { /* */ } }
  /* 合輯裡跳到下一集：有章節照章節，沒有就照集數平均長度估 */
  function nextInComp() {
    const { pos, len } = times();
    if (cur.chap && cur.chap.length) {
      const nx = cur.chap.find((c) => c[0] > pos + 3);
      if (nx) { seekTo(nx[0]); toast('跳到：' + (nx[1] || '下一段')); return true; }
      return false;
    }
    if (cur.r && len) {
      const n = cur.r[1] - cur.r[0] + 1;
      const per = len / n;
      const k = Math.floor(pos / per) + 1;
      if (k < n) { seekTo(k * per + 1); toast('跳到約第 ' + (cur.r[0] + k) + ' 集'); return true; }
    }
    return false;
  }
  function skipOp() { seekBy(SET.skipOp || 85); toast('跳過片頭 ' + (SET.skipOp || 85) + ' 秒'); }
  function cycleRate() {
    const k = RATES.indexOf(SET.rate);
    SET.rate = RATES[(k + 1) % RATES.length];
    saveSet();
    try { yt.setPlaybackRate(SET.rate); } catch (e) { /* */ }
    Snd.play('select');
    toast('倍速 ' + SET.rate + 'x');
    renderDeck();
  }
  function setSleep(mode) {
    sleepMode = mode;
    sleepAt = mode && mode !== 'end' ? Date.now() + (+mode) * 60e3 : 0;
    fading = false;
    Snd.play(mode ? 'sleep' : 'back');
    toast(!mode ? '取消睡前定時' : mode === 'end' ? '這支看完就停' : (+mode) + ' 分鐘後慢慢停下來');
    renderDeck();
    updateTime();
  }
  function fadeOut() {
    if (!yt || fading) return;
    fading = true;
    let vol = 100;
    try { vol = yt.getVolume(); } catch (e) { /* */ }
    const v0 = vol, t0 = Date.now();
    const step = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 8000);
      try { yt.setVolume(Math.round(v0 * (1 - k))); } catch (e) { /* */ }
      if (k >= 1) {
        clearInterval(step);
        try { yt.pauseVideo(); yt.setVolume(v0); } catch (e) { /* */ }
        goodnight();
      }
    }, 250);
  }
  function goodnight() {
    sleepAt = 0; sleepMode = ''; fading = false;
    push(true);
    const { pos } = times();
    const box = $('#thSleep');
    box.hidden = false;
    box.innerHTML = `<div class="sl-in"><i class="sl-moon"></i><b class="d">晚安，${esc(NAME)}</b>
      <p>看到 ${clock(pos)}${approxEp(cur, pos) ? '（' + esc(approxEp(cur, pos).label) + '）' : ''}，明天打開就從這裡接著補。</p>
      <div class="sl-acts"><button class="btn" data-act="sleep-more">再看 15 分鐘</button><button class="btn ink" data-act="th-close">收工</button></div></div>`;
    Snd.play('sleep');
    renderDeck();
  }
  function showResume(pos) {
    const host = $('#thFrame');
    const el = document.createElement('div');
    el.className = 'resume';
    const r = REMOTE[cur.i];
    el.innerHTML = `<span>${r ? '另一台裝置' : '上次'}看到 <b>${clock(pos)}</b>，接著看</span><button data-act="from-start">從頭看</button>`;
    host.appendChild(el);
    setTimeout(() => el.classList.add('out'), 6500);
    setTimeout(() => el.remove(), 7000);
  }

  function close(silent) {
    if (!open_) return;
    Land.exit(true);
    Land.watch(false);
    open_ = false;
    stopTick(true);
    push(true);
    hideNext();
    if (ecOff) { ecOff(); ecOff = null; }
    try { yt && yt.stopVideo(); } catch (e) { /* */ }
    sleepAt = 0; sleepMode = '';
    $('#thSleep').hidden = true;
    const box = $('#theater');
    box.classList.remove('in');
    document.documentElement.classList.remove('watching');
    setTimeout(() => { if (!open_) box.hidden = true; }, 320);
    Snd.duck(false);
    if (!silent) Snd.play('back');
    if (typeof onPlayerClosed === 'function') onPlayerClosed();
  }
  const isOpen = () => open_;

  /* ---- 接下來（同一部作品的下一集，或這一排的下一支） */
  function upList() {
    if (!cur) return [];
    const k = ctxIds.indexOf(cur.i);
    const after = ctxIds.slice(k + 1).concat(ctxIds.slice(0, Math.max(0, k)));
    return after.map((v) => IDX.byId.get(v)).filter((x) => x && !x.up && !x.ne).slice(0, 60);
  }
  function nextItem() { return upList()[0] || null; }
  function take(id) {
    const v = IDX.byId.get(id);
    if (!v) return;
    hideNext();
    stopTick(true);
    push(true);
    Snd.play('iris');
    cur = v;
    startedFor = null;
    render();
    showEyecatch(v);
    playId(v);
    if (typeof onPlayerTake === 'function') onPlayerTake(v);
  }
  function countdownNext() {
    const nx = nextItem();
    if (!nx) return;
    const box = $('#thNext');
    let left = 6;
    box.hidden = false;
    Snd.play('nextep');
    const s = showOf(nx);
    box.innerHTML = `<div class="nx-in"><span class="nx-tag d">次回預告</span>
        <div class="nx-card"><img src="${thumb(nx.i)}" alt=""><div class="nx-t"><em class="d">${esc(epLabel(nx) || '下一支')}</em><b>${s ? esc(nx.t) : vtitle(nx)}</b>${s && s.id !== (showOf(cur) || {}).id ? `<span>${esc(s.n)}</span>` : ''}</div></div>
        <div class="nx-row"><span class="nx-n d" id="nxN">${left}</span><button class="btn yel" data-act="take" data-v="${nx.i}">▶ 立刻看</button><button class="btn" data-act="nx-cancel">先不要</button></div></div>`;
    const draw = () => { const n = $('#nxN'); if (n) n.textContent = left; };
    clearInterval(nextT);
    nextT = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(nextT); take(nx.i); return; }
      Snd.play('count');
      draw();
    }, 1000);
  }
  function hideNext() { clearInterval(nextT); const b = $('#thNext'); if (b) { b.hidden = true; b.innerHTML = ''; } }

  function showMsg(title, why, ytBtn) {
    const m = $('#thMsg');
    m.hidden = false;
    m.innerHTML = `<div class="msg-in"><b class="d">${esc(title)}</b><p>${esc(why)}</p><div class="msg-acts">
      ${ytBtn && cur ? `<a class="btn yel" href="${ytUrl(cur.i)}" target="_blank" rel="noopener">到 YouTube 看</a>` : ''}
      ${nextItem() ? `<button class="btn" data-act="take" data-v="${nextItem().i}">下一支</button>` : ''}</div></div>`;
  }
  function hideMsg() { const m = $('#thMsg'); m.hidden = true; m.innerHTML = ''; }

  /* ---- 畫面 */
  function render() { renderBar(); renderDeck(); renderTimeline(); renderInfo(); renderList(); }
  function renderBar() {
    const k = KINDS[kindOf(cur)] || KINDS.jp, s = showOf(cur);
    $('#thKind').textContent = k.zh;
    $('#thKind').style.setProperty('--kc', k.c);
    $('#thTtl').textContent = (s ? s.n + '｜' : '') + (epLabel(cur) || titleParts(cur.t).name || cur.t);
    $('#theater').style.setProperty('--kc', k.c);
  }
  function renderDeck() {
    const long = (cur.d || 0) >= 20 * 60;
    const compNext = (cur.chap && cur.chap.length) || cur.r;
    $('#thDeck').innerHTML = `
      <button class="dk" data-act="prev" aria-label="上一支"><svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg></button>
      <button class="dk" data-act="back10" aria-label="倒退 10 秒"><span class="d">-10</span></button>
      <button class="dk big" data-act="toggle" aria-label="播放／暫停"><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/><path class="pz" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button>
      <button class="dk" data-act="fwd10" aria-label="前進 10 秒"><span class="d">+10</span></button>
      <button class="dk" data-act="next" aria-label="下一支"><svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg></button>
      <span class="dk-sp"></span>
      <button class="chip" id="thSkip" data-act="skipop" hidden>⏭ 跳過片頭</button>
      ${compNext ? '<button class="chip" data-act="comp-next">⏭ 下一集</button>' : ''}
      <button class="chip" data-act="rate">${SET.rate}x</button>
      <button class="chip ${sleepMode ? 'on' : ''}" data-act="sleep-menu">☾ ${sleepMode ? (sleepMode === 'end' ? '看完停' : sleepMode + ' 分') : '定時'}</button>
      ${long && cur.chap && cur.chap.length ? '<button class="chip" data-act="chap-menu">☰ 章節</button>' : ''}`;
  }
  function renderTimeline() {
    const el = $('#thTime');
    const len = cur.d || 0;
    if (len < 20 * 60) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const ticks = (cur.chap || []).slice(1).map((c) => `<i style="left:${(c[0] / len * 100).toFixed(2)}%"></i>`).join('');
    const rTicks = !cur.chap && cur.r ? Array.from({ length: Math.min(cur.r[1] - cur.r[0], 120) }, (_, i) => `<i class="r" style="left:${((i + 1) / (cur.r[1] - cur.r[0] + 1) * 100).toFixed(2)}%"></i>`).join('') : '';
    const h = histOf(cur.i);
    el.innerHTML = `<div class="tl" data-act="tl-seek"><span class="tl-fill"></span>${ticks}${rTicks}${h && h[1] > 30 && !h[3] ? `<b class="tl-mark" style="left:${(h[1] / len * 100).toFixed(2)}%"></b>` : ''}</div><div class="tl-cap"></div>`;
    updateTime();
  }
  function renderInfo() {
    const v = cur, ch = chOf(v.c), s = showOf(v), k = KINDS[kindOf(v)] || KINDS.jp;
    const later = !!VIEW.later[v.i];
    const meta = [];
    if (v.live) meta.push('<b class="red">● 直播中</b>');
    else if (v.p) meta.push(esc(ago(v.p)));
    if (v.v) meta.push(num(v.v) + ' 次觀看');
    if (v.d && !v.live) meta.push(span(v.d));
    if (v.r) meta.push(v.r[0] + '–' + v.r[1] + ' 集');
    if (v.ai) meta.push('<b class="ai">AI</b>');
    $('#thInfo').innerHTML = `
      <div class="pi-k" style="--kc:${k.c}"><i>${esc(k.zh)}</i>${epLabel(v) ? `<b class="d">${esc(epLabel(v))}</b>` : ''}</div>
      <h2 class="pi-title">${titleParts(v.t).name && !s ? `${esc(titleParts(v.t).name)}${titleParts(v.t).rest ? `<small>${esc(titleParts(v.t).rest)}</small>` : ''}` : esc(v.t)}</h2>
      <div class="pi-meta">${meta.join('<span class="dot"></span>')}</div>
      ${s ? `<a class="pi-show" href="#show/${encodeURIComponent(s.id)}" data-close="1"><img src="${thumb(s.eps[0] ? (IDX.vids[s.cv] || s.eps[0]).i : v.i)}" alt=""><span><b>${esc(s.n)}</b><em>共 ${s.n_eps} ${s.kind === 'jp' ? '話' : '集'}${s.dur > 3600 ? ' · ' + span(s.dur) : ''}</em></span><i>作品頁 ›</i></a>` : ''}
      <div class="pi-acts">
        ${s ? `<button class="chip fol ${following(s.id) ? 'on' : ''}" data-act="${following(s.id) ? 'unfollow' : 'follow'}" data-s="${esc(s.id)}">${following(s.id) ? '★ 追番中' : '☆ 追番'}</button>` : ''}
        <button class="chip ${later ? 'on' : ''}" data-act="later" data-v="${v.i}">${later ? '✓ 片單' : '＋ 片單'}</button>
        <a class="chip" href="${ytUrl(v.i, times().pos)}" target="_blank" rel="noopener">到 YouTube</a>
        <button class="chip" data-act="copy" data-v="${v.i}">複製連結</button>
      </div>
      ${v.c ? `<a class="pi-ch" href="#ch/${v.c}" data-close="1">${avatar(v.c, 30)}<b>${esc(ch.n)}</b><span>${esc(KINDS[ch.k] ? KINDS[ch.k].zh : '')}${ch.official ? ' · 官方' : ''}</span></a>` : ''}`;
  }
  function renderList() {
    const s = showOf(cur);
    const ids = ctxIds;
    const items = ids.map((x) => IDX.byId.get(x)).filter(Boolean);
    const k = items.indexOf(cur);
    const label = ctxLabel || (s ? s.n : '接下來');
    $('#thList').innerHTML = `<div class="tl-head"><b class="d">${s && ids.length > 1 ? '集數' : '接下來'}</b>${label !== '接下來' ? `<span>${esc(label)}</span>` : ''}
      <button class="auto ${SET.auto ? 'on' : ''}" data-act="auto">連播 ${SET.auto ? 'ON' : 'OFF'}</button></div>
      <div class="ep-strip">${items.slice(Math.max(0, k - 2), k + 40).map((x) => {
        const h = histOf(x.i), on = x === cur;
        const pg = h && !h[3] && h[2] ? clamp(h[1] / h[2], 0.03, 1) : 0;
        return `<button class="ep${on ? ' on' : ''}${h && h[3] ? ' seen' : ''}" data-act="take" data-v="${x.i}">
          <span class="ep-th"><img loading="lazy" src="${thumb(x.i)}" alt="">${x.d ? `<i>${clock(x.d)}</i>` : ''}${on ? '<b class="ep-now d">放映中</b>' : ''}${pg ? `<u style="--p:${(pg * 100).toFixed(0)}%"></u>` : ''}</span>
          <span class="ep-t">${epLabel(x) ? `<em>${esc(epLabel(x))}</em>` : ''}${showOf(x) && showOf(x) === showOf(cur) ? esc(x.t) : vtitle(x)}</span></button>`;
      }).join('') || '<div class="empty-s">這一排看完了</div>'}</div>`;
    // 只捲這一條（scrollIntoView 會連放映機一起捲，畫面被推上去）
    const on = $('#thList .ep.on'), strip = $('#thList .ep-strip');
    if (on && strip) {
      if (strip.scrollWidth > strip.clientWidth + 4) strip.scrollLeft = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
      else {
        const side = on.closest('.th-side');
        if (side && side.scrollHeight > side.clientHeight) side.scrollTop += on.getBoundingClientRect().top - side.getBoundingClientRect().top - 140;
      }
    }
  }
  function refresh() { if (open_) { renderInfo(); renderDeck(); } }
  function toggle() {
    if (!yt || !ready) return;
    try { if (yt.getPlayerState() === 1) yt.pauseVideo(); else yt.playVideo(); } catch (e) { /* */ }
  }
  function next() { const n = nextItem(); if (n) take(n.i); else toast('後面沒有了'); }
  function prev() { const k = ctxIds.indexOf(cur && cur.i); if (k > 0) take(ctxIds[k - 1]); else toast('這是第一支'); }
  function cancelNext() { hideNext(); }
  function fromStart() { seekTo(0); $$('.resume').forEach((x) => x.remove()); }
  function sleepMore() { $('#thSleep').hidden = true; setSleep('15'); try { yt.playVideo(); } catch (e) { /* */ } }
  function tlSeek(ev, el) {
    const r = el.getBoundingClientRect();
    const { len } = times();
    if (!len) return;
    seekTo(clamp((ev.clientX - r.left) / r.width, 0, 1) * len);
  }
  function fullscreen() {
    if (TOUCH) { Land.toggle(); return; }   // 手機：橫放全螢幕（下面的 Land）
    const f = $('#thFrame');
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const req = f.requestFullscreen || f.webkitRequestFullscreen;
    if (req) req.call(f).catch(() => toast('這台裝置不支援：請用播放器右下角的全螢幕鍵'));
    else toast('請用播放器右下角的全螢幕鍵');
  }
  function chapterSheet() {
    if (!cur || !cur.chap) return;
    const { pos } = times();
    const ap = approxEp(cur, pos);
    openSheet(`<div class="sheet-h"><b class="d">章節</b><span>${esc(cur.t)}</span></div><div class="chap-list">${cur.chap.map((c, i) => `
      <button class="chap${ap && ap.k === i ? ' on' : ''}" data-act="chap-go" data-s="${c[0]}"><i>${clock(c[0])}</i><span>${esc(c[1] || '第 ' + (i + 1) + ' 段')}</span></button>`).join('')}</div>`);
  }
  function sleepSheet() {
    openSheet(`<div class="sheet-h"><b class="d">睡前定時</b><span>時間到會慢慢把聲音轉小、停下來，記住看到哪。</span></div>
      <div class="sleep-opts">${['15', '30', '45', '60', '90'].map((m) => `<button class="btn${sleepMode === m ? ' yel' : ''}" data-act="sleep-set" data-k="${m}">${m} 分鐘</button>`).join('')}
      <button class="btn${sleepMode === 'end' ? ' yel' : ''}" data-act="sleep-set" data-k="end">這支看完</button>
      ${sleepMode ? '<button class="btn ink" data-act="sleep-set" data-k="">取消定時</button>' : ''}</div>`);
  }
  return {
    open, close, isOpen, take, next, prev, toggle, refresh, cancelNext, fullscreen, seekBy, seekTo, skipOp, cycleRate, nextInComp,
    setSleep, sleepMore, fromStart, tlSeek, chapterSheet, sleepSheet, hasNext: () => !!nextItem(), get cur() { return cur; },
  };
})();

/* ================================================================ 橫放全螢幕
   手機鎖了直向，放映機照樣能橫著看。
   - iPhone：網頁不能自己轉螢幕、也不能整頁全螢幕，所以把播放器整個轉 90 度鋪滿，手機轉橫看就是滿版。
   - Android：整個放映機真的全螢幕（藏掉瀏覽器和系統列），再請系統轉橫；系統不給轉，就一樣把播放器轉 90 度。
   - 電腦：照舊（Player.fullscreen 的舊做法）。直式短劇（Swipe）本來就是直的，不管它。
   「轉手機自動橫放」看陀螺儀：手機從直的「很快地」轉成橫的就自動進來，再很快轉回直的就退出（怎麼進來就怎麼出去：
   按鍵進來的只用 ✕ 退出，跟 YouTube App 鎖直向時一樣）。躺著側看手機、或慢慢躺下這種身體在動的，
   轉的過程超過 1.5 秒，不會誤觸。 */
const Land = (() => {
  const CAN_FS = !IS_IPHONE && !!(Element.prototype.requestFullscreen || Element.prototype.webkitRequestFullscreen);
  const QUICK = 1500;     // 從直的到橫的（或反過來）在這麼短的時間內完成，才算「轉手機」
  let mode = '';          // ''、rot（轉 90 度）、fill（畫面本來就是橫的，鋪滿）
  let real = false;       // 有沒有開真的全螢幕（Android）
  let why = '';           // tilt（轉手機進來的）、btn（按鍵進來的）
  let dir = SET.landDir === -90 ? -90 : 90;   // 90：手機頂端朝左；-90：頂端朝右
  let uprightAt = 0, landAt = 0, cand = null, candT = 0;
  let watching = false, sensing = false, asked = false, dimT = 0, tipT = 0, probe = null;
  const frame = () => $('#thFrame');
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const VARS = ['--fx-w', '--fx-h', '--fx-rot', '--fx-vl', '--fx-vt', '--fx-vw', '--fx-vh', '--fx-rr', '--fx-rt', '--fx-rb'];

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
    const s = safe();
    // 轉 90 度時，畫面的左邊是手機的上緣（瀏海），右邊是手機的下緣（底部橫條）
    const [L, R, T, B] = rot === 90 ? [s.t, s.b, s.r, s.l] : rot === -90 ? [s.b, s.t, s.l, s.r] : [s.l, s.r, s.t, s.b];
    const RAIL = 58;
    const aw = Math.max(160, W - L - R), ah = Math.max(80, H - T - B);
    const vw = Math.min(aw - RAIL, ah * 16 / 9), vh = vw * 9 / 16;
    const spare = aw - vw, bar = Math.max(RAIL, spare / 2);   // 黑邊夠寬就置中，不夠就把影片往左推、右邊留一條
    const vl = L + spare - bar, vt = T + (ah - vh) / 2;
    const f = frame(), set = (k, v) => f.style.setProperty(k, Math.round(v * 10) / 10 + (k === '--fx-rot' ? 'deg' : 'px'));
    set('--fx-w', W); set('--fx-h', H); set('--fx-rot', rot);
    set('--fx-vl', vl); set('--fx-vt', vt); set('--fx-vw', vw); set('--fx-vh', vh);
    set('--fx-rr', R + (bar - 52) / 2);
    set('--fx-rt', Math.max(T, vt) + 6); set('--fx-rb', Math.max(B, H - vt - vh) + 6);
    $('#theater').classList.toggle('fsx-rot', !!rot);
  }

  function on(src) {
    $('#theater').classList.add('fsx');
    document.documentElement.classList.add('fsx');
    layout();
    wake();
    if (+store.get('landTips', 0) < 4) { store.set('landTips', (+store.get('landTips', 0) || 0) + 1); say(src === 'tilt' ? '橫放全螢幕｜手機轉回直的就退出' : '橫放全螢幕｜按右邊的 ✕ 退出'); }
    Snd.play('iris');
  }
  function enter(src, d) {
    if (mode || !Player.isOpen()) return;
    if (d) dir = d;
    mode = innerHeight > innerWidth ? 'rot' : 'fill';
    why = src;
    on(src);
  }
  async function enterReal() {
    const box = $('#theater'), req = box.requestFullscreen || box.webkitRequestFullscreen;
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
    $('#theater').classList.remove('fsx', 'fsx-rot');
    document.documentElement.classList.remove('fsx');
    const f = frame();
    VARS.forEach((k) => f.style.removeProperty(k));
    const t = $('#thTip'); if (t) t.classList.remove('on');
    if (!silent) Snd.play('back');
  }
  function toggle() {
    if (mode) { exit(); return; }
    if (CAN_FS) enterReal(); else enter('btn');
  }
  /* 全螢幕時的提示（跳到第幾集、跳過片頭⋯）：寫在播放器裡，跟著轉 */
  function say(msg) {
    const t = $('#thTip');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(tipT);
    tipT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  /* 右邊的按鈕：進來 3.5 秒後變淡；變淡時第一下只是叫醒（橫拿時拇指常常碰到邊邊） */
  function wake() {
    const r = $('#thRail');
    if (!r) return;
    r.classList.remove('dim');
    const v = Player.cur;
    const comp = !!(v && ((v.chap && v.chap.length) || v.r));
    const sk = $('#thSkip');
    $('#fxSkip').hidden = !(sk && !sk.hidden);
    $('#fxComp').hidden = !comp;
    $('#fxNext').hidden = comp || !Player.hasNext();
    clearTimeout(dimT);
    dimT = setTimeout(() => r.classList.add('dim'), 3500);
  }

  /* 陀螺儀 */
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
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
      if (e.target.closest && e.target.closest('a[href^="#watch/"], [data-act="hero-play"], [data-act="gacha-play"], [data-act="sw-full"], [data-act="next"], [data-act="prev"], #thFull')) ask();
    }, true);
    const r = $('#thRail');
    if (r) r.addEventListener('click', (e) => {
      e.stopPropagation();
      if (r.classList.contains('dim')) { wake(); return; }
      const bt = e.target.closest('button');
      if (!bt) { wake(); return; }
      if (bt.id === 'fxExit') { exit(); return; }
      if (bt.id === 'fxFlip') { dir = -dir; SET.landDir = dir; saveSet(); layout(); Snd.play('tick'); }
      else if (bt.id === 'fxSkip') Player.skipOp();
      else if (bt.id === 'fxComp') { if (!Player.nextInComp()) Player.next(); }
      else if (bt.id === 'fxNext') Player.next();
      wake();
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

/* ================================================================ 直式滑看：AI 漫劇的 Shorts，一滑一集（紅果那種） */
const Swipe = (() => {
  let yt = null, ready = false, list = [], k = 0, open_ = false, sy = 0, dy = 0, drag = false, t0 = 0, watchMs = 0, tickT = 0;

  async function open(ids, start) {
    if (Player.isOpen()) Player.close(true);
    list = ids.map((x) => IDX.byId.get(x)).filter(Boolean);
    if (!list.length) { toast('現在沒有直式短劇'); return; }
    k = Math.max(0, list.findIndex((v) => v.i === start));
    const box = $('#swipe');
    open_ = true;
    box.hidden = false;
    document.documentElement.classList.add('watching');
    requestAnimationFrame(() => box.classList.add('in'));
    Snd.duck(true);
    render();
    try { await loadYT(); } catch (e) { toast('連不上 YouTube'); return; }
    play();
  }
  function play() {
    const v = list[k];
    if (!v) return;
    if (!yt) {
      yt = new YT.Player('swp', {
        videoId: v.i, width: '100%', height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, controls: 0, fs: 0, enablejsapi: 1, origin: location.origin, hl: 'zh-TW', loop: 0 },
        events: {
          onReady: () => { ready = true; try { yt.playVideo(); } catch (e) { /* */ } },
          onStateChange: (e) => {
            $('#swipe').classList.toggle('paused', e.data === 2);
            if (e.data === 1) { $('#swipe').classList.add('playing'); startTick(); }
            if (e.data === 0) { note(); go(1, true); }
          },
          onError: () => { toast('這支不能在這裡播，換下一支'); setTimeout(() => go(1, true), 600); },
        },
      });
    } else if (ready) {
      try { yt.loadVideoById(v.i); } catch (e) { /* */ }
    } else setTimeout(play, 300);
  }
  function startTick() {
    clearInterval(tickT);
    tickT = setInterval(() => {
      if (!yt || !open_) return;
      try { if (yt.getPlayerState() === 1) watchMs += 1000; const p = yt.getCurrentTime(), l = yt.getDuration(); const bar = $('#swBar'); if (bar && l) bar.style.transform = 'scaleX(' + clamp(p / l, 0, 1) + ')'; } catch (e) { /* */ }
    }, 1000);
  }
  function note() {
    const v = list[k];
    if (!v || !yt) return;
    try { noteWatch(v, yt.getCurrentTime(), yt.getDuration(), watchMs); } catch (e) { /* */ }
    watchMs = 0;
  }
  function render() {
    const v = list[k], nx = list[k + 1], pv = list[k - 1];
    const s = showOf(v);
    const full = fullFor(v);
    const later = !!VIEW.later[v.i];
    const img = (el, x) => { el.innerHTML = x ? `<img src="${thumb(x.i, 'hqdefault')}" alt="">` : ''; };
    img($('#swPrev'), pv); img($('#swCurPoster'), v); img($('#swNext'), nx);
    $('#swInfo').innerHTML = `
      <div class="sw-ch">${avatar(v.c, 34)}<b>${esc(chOf(v.c).n)}</b>${v.ai ? '<i class="ai">AI</i>' : ''}</div>
      <div class="sw-t">${esc(v.t)}</div>
      ${full ? `<button class="sw-full" data-act="sw-full" data-v="${full.i}"><b class="d">看完整版</b><span>${esc(full.r ? full.r[0] + '–' + full.r[1] + ' 集 · ' : '')}${span(full.d)}</span></button>` : ''}
      <div class="sw-bar"><i id="swBar"></i></div>`;
    $('#swRail').innerHTML = `
      <button class="sr ${later ? 'on' : ''}" data-act="sw-later" data-v="${v.i}"><i>${later ? '♥' : '♡'}</i><span>${later ? '已收' : '收藏'}</span></button>
      ${s ? `<button class="sr ${following(s.id) ? 'on' : ''}" data-act="${following(s.id) ? 'unfollow' : 'follow'}" data-s="${esc(s.id)}"><i>${following(s.id) ? '★' : '☆'}</i><span>追番</span></button>` : ''}
      <a class="sr" href="${ytUrl(v.i)}" target="_blank" rel="noopener"><i>↗</i><span>YouTube</span></a>
      <span class="sr-n d">${k + 1}<small>/${list.length}</small></span>`;
    $('#swipe').classList.remove('playing', 'paused');
  }
  /* 這支短劇有沒有完整版合輯（同一部作品的長片） */
  function fullFor(v) {
    const s = showOf(v);
    if (s) { const c = s.eps.find((x) => x.f === 'c' || x.d > 30 * 60); if (c) return c; }
    const name = (v.t.match(/《([^》]{2,30})》/) || [])[1];
    if (!name) return null;
    return L.comps('ai').find((x) => x.t.includes(name)) || null;
  }
  function go(d, auto) {
    const nk = k + d;
    if (nk < 0) { bounce(); return; }
    if (nk >= list.length) { toast('滑到底了：這批短劇看完了'); bounce(); return; }
    note();
    k = nk;
    Snd.play('swipe');
    const st = $('#swTrack');
    $('#swipe').classList.remove('playing');
    if (Fx.lite()) { render(); play(); return; }
    st.style.transition = 'transform .26s cubic-bezier(.3,.7,.2,1)';
    st.style.transform = `translate3d(0,${d > 0 ? -100 : 100}%,0)`;
    setTimeout(() => { st.style.transition = 'none'; st.style.transform = ''; render(); play(); }, 270);
  }
  function bounce() { const st = $('#swTrack'); st.style.transition = ''; st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); }
  function close(silent) {
    if (!open_) return;
    note();
    open_ = false;
    clearInterval(tickT);
    try { yt && yt.stopVideo(); } catch (e) { /* */ }
    const box = $('#swipe');
    box.classList.remove('in', 'playing');
    document.documentElement.classList.remove('watching');
    setTimeout(() => { if (!open_) box.hidden = true; }, 320);
    Snd.duck(false);
    if (!silent) Snd.play('back');
    if (typeof onPlayerClosed === 'function') onPlayerClosed();
  }
  function toggle() { if (!yt || !ready) return; try { if (yt.getPlayerState() === 1) yt.pauseVideo(); else yt.playVideo(); } catch (e) { /* */ } }
  function bind() {
    const st = $('#swTrack'), pad = $('#swPad');
    pad.addEventListener('pointerdown', (e) => { drag = true; sy = e.clientY; dy = 0; t0 = Date.now(); st.style.transition = 'none'; });
    pad.addEventListener('pointermove', (e) => { if (!drag) return; dy = e.clientY - sy; st.style.transform = `translate3d(0,${dy * 0.9}px,0)`; });
    const end = () => {
      if (!drag) return;
      drag = false;
      if (Math.abs(dy) > 70) { go(dy < 0 ? 1 : -1); return; }
      st.style.transition = 'transform .2s ease-out';
      st.style.transform = '';
      if (Math.abs(dy) < 8 && Date.now() - t0 < 300) toggle();
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    let wheelAt = 0;
    $('#swipe').addEventListener('wheel', (e) => { e.preventDefault(); const t = Date.now(); if (t - wheelAt < 600 || Math.abs(e.deltaY) < 30) return; wheelAt = t; go(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  }
  return { open, close, go, toggle, bind, isOpen: () => open_, render, get cur() { return list[k]; } };
})();
