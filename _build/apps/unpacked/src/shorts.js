/* 解包 — 短影音：專題、推坑的預告，直式一支一支往上滑（自己看的預告牆）
   ・一次只播一支：整面牆共用一個 <video>，滑到哪一張就搬到哪一張。iPhone 只要點過一次，之後換片也能直接有聲播放。
   ・只畫目前這張的前後幾張，其他留空殼，滑幾百支也不吃記憶體。
   ・不用模糊濾鏡：底圖是縮成很小的 canvas 再放大，看起來像毛玻璃，幾乎不佔記憶體。 */
const SH = {
  f: 'all', list: [], els: [], i: -1, key: null, vi: {}, tok: 0, filled: new Set(),
  io: null, hls: null, yt: null, ytSt: -1, raf: 0, seenT: 0, idleT: 0, hintT: 0,
  snd: null, resume: false, lock: 0, drag: null, inited: false,
};
let SV = null;
let HLSLIB = null;
const FORCE_HLSJS = /[?&]hlsjs=1/.test(location.search);   // 測試用：強制走 hls.js
/* 完整版 hls.js：Steam 預告的聲音是另一條音軌（輕量版 hls.light 會變成沒聲音） */
function hlsLib() {
  if (!HLSLIB) HLSLIB = import('./vendor/hls.min.mjs').then((m) => m.default).catch((e) => { HLSLIB = null; throw e; });
  return HLSLIB;
}
const shKeyOf = (it) => it._k + ':' + it.id;
const shOn = () => document.body.classList.contains('sh-on');
function shSoundOn() { return SH.snd != null ? SH.snd : (S.settings.shSound !== false && !S.muted); }
function tfmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* ---- 牆上有哪些：專題、推坑依日期由新到舊，同一天交錯排 ---- */
function shAll() {
  const fs = (S.index ? S.index.items : []).map((x) => Object.assign({ _k: 'f' }, x));
  const ps = ((S.picks && S.picks.items) || []).map((x) => Object.assign({ _k: 'p' }, x));
  const days = [...new Set([...fs, ...ps].map((x) => x.date))].sort().reverse();
  const out = [];
  for (const d of days) {
    const a = fs.filter((x) => x.date === d).sort((x, y) => x.rank - y.rank);
    const b = ps.filter((x) => x.date === d).sort((x, y) => x.rank - y.rank);
    for (let k = 0; k < Math.max(a.length, b.length); k++) { if (a[k]) out.push(a[k]); if (b[k]) out.push(b[k]); }
  }
  return out;
}
function shItems(f = SH.f) {
  return shAll().filter((it) => {
    const lv = liveOf(it.steam);
    if (f === 'f') return it._k === 'f';
    if (f === 'p') return it._k === 'p';
    if (f === 'sale') return !!(lv && lv.price && lv.price.disc > 0);
    if (f === 'want') return S.marks[it.id] === 'want';
    if (f === 'new') return !S.seen['v:' + shKeyOf(it)];
    return true;
  });
}
/* 分頁上的小紅點：最新一批還沒在短影音看過的 */
function shNewCount() {
  const fi = S.index ? S.index.items : []; const pi = (S.picks && S.picks.items) || [];
  const fl = fi[0] && fi[0].date, pl = pi[0] && pi[0].date;
  return fi.filter((x) => x.date === fl && !S.seen['v:f:' + x.id]).length + pi.filter((x) => x.date === pl && !S.seen['v:p:' + x.id]).length;
}
/* 一款有哪些預告可以播：Steam 官方預告（可以完全控制）→ 專題附的 YouTube → 動態縮圖 */
function shVids(it) {
  const lv = liveOf(it.steam); const out = [];
  for (const t of (lv && lv.trailers) || []) {
    const src = t.hls || t.mp4 || t.webm;
    if (src) out.push({ k: 'v', src, poster: t.poster, t: t.name || '官方預告', from: 'Steam' });
  }
  const yts = it.yts && it.yts.length ? it.yts : (it.yt ? [{ id: it.yt, t: '' }] : []);
  for (const y of yts.slice(0, 4)) out.push({ k: 'yt', id: y.id, poster: ytThumb(y.id), t: y.t || '官方預告', from: 'YouTube' });
  if (!out.length) {
    const mc = (lv && lv.micro) || {};
    if (mc.mp4 || mc.webm) out.push({ k: 'v', mp4: mc.mp4, webm: mc.webm, poster: heroOf(it, lv), t: '動態預告', from: 'Steam', loop: true });
  }
  return out;
}

/* ---- 共用的 <video> ---- */
function svBox() { const p = SV && SV.parentNode; return p && p.classList && p.classList.contains('sv-vid') ? p : null; }
function svEl() {
  if (SV) return SV;
  const v = SV = document.createElement('video');
  v.className = 'shv'; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  v.addEventListener('playing', () => { const b = svBox(); if (!b) return; b.classList.add('on'); b.classList.remove('wait', 'paused', 'blocked'); shTickGo(); shWake(); });
  v.addEventListener('waiting', () => { const b = svBox(); if (b) b.classList.add('wait'); });
  v.addEventListener('play', () => { const b = svBox(); if (b) b.classList.remove('paused'); });
  v.addEventListener('pause', () => { const b = svBox(); if (b && !v.ended && v.readyState >= 2) b.classList.add('paused'); shWake(); });
  v.addEventListener('ended', () => { if (svBox() && S.settings.shAuto) shGo(SH.i + 1); });
  v.addEventListener('error', () => { if (svBox() && !SH.hls) shFail(); });
  v.addEventListener('webkitendfullscreen', () => { if (svBox()) v.play().catch(() => {}); });
  return v;
}
/* 在使用者點擊的當下呼叫一次：iPhone 只認「點擊時 play() 過」的 video，之後換片才能直接有聲播放 */
function svUnlock() {
  const v = svEl(); if (v.dataset.ok) return; v.dataset.ok = '1';
  try { const p = v.play(); if (p && p.catch) p.catch(() => {}); v.pause(); } catch (e) { /* 沒影片來源，會失敗，沒關係 */ }
}
document.addEventListener('click', svUnlock, true);
document.addEventListener('keydown', svUnlock, true);

/* ---- 進出 ---- */
function shInit() {
  if (SH.inited) return; SH.inited = true;
  const root = $('#shorts');
  root.addEventListener('click', shClick);
  addEventListener('resize', () => {
    if (!shOn()) return;
    const feed = $('#shfeed'); if (!feed || SH.i < 0) return;
    SH.lock = performance.now() + 450;          // 轉向時版面在變，先不要換片
    feed.scrollTop = SH.i * feed.clientHeight;
  });
  addEventListener('orientationchange', () => { SH.lock = performance.now() + 900; });
}
function renderShorts(arg) {
  shInit();
  document.body.classList.add('sh-on');
  bgmDuck(true);
  let list = shItems(); let start = 0;
  const want = arg || SH.key;
  if (want) {
    let k = list.findIndex((it) => shKeyOf(it) === want);
    if (k < 0 && arg && SH.f !== 'all') { SH.f = 'all'; list = shItems(); k = list.findIndex((it) => shKeyOf(it) === want); }
    if (k >= 0) start = k;
  }
  SH.list = list;
  shBuild(start);
  shHint();
}
function shBuild(start = 0) {
  const root = $('#shorts'); if (!root) return;
  shStop(); SH.i = -1; SH.filled.clear();
  if (SH.io) { SH.io.disconnect(); SH.io = null; }
  root.innerHTML = shFrame();
  const feed = $('#shfeed', root); SH.els = $$('.sv', feed);
  const fls = $('.sh-fls', root), on = $('.sh-fls .fl.on', root);
  if (fls && on) fls.scrollLeft = on.offsetLeft - (fls.clientWidth - on.offsetWidth) / 2;   // 選中的篩選捲到看得到
  shBind(feed);
  start = Math.max(0, Math.min(SH.els.length - 1, start));
  feed.scrollTop = start * feed.clientHeight;
  shActivate(start);
  SH.io = new IntersectionObserver((es) => {
    if (performance.now() < SH.lock) return;
    for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.6) shActivate(+e.target.dataset.i);
  }, { root: feed, threshold: [0.6] });
  SH.els.forEach((s) => SH.io.observe(s));
}
function shExit() {
  if (!shOn()) return;
  shStop();
  if (SH.io) { SH.io.disconnect(); SH.io = null; }
  clearTimeout(SH.seenT); clearTimeout(SH.idleT); clearTimeout(SH.hintT);
  document.body.classList.remove('sh-on', 'sh-idle');
  const root = $('#shorts'); if (root) root.innerHTML = '';
  SH.els = []; SH.filled.clear(); SH.i = -1; SH.drag = null;
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* */ }
}

/* ---- 畫面 ---- */
function shFrame() {
  const fl = (v, l) => `<button class="fl ${SH.f === v ? 'on' : ''}" data-act="sh-f" data-v="${v}">${l}</button>`;
  return `<div class="sh-top"><button class="sh-x" data-act="sh-exit" aria-label="離開短影音">${ICON.x}</button>
      <div class="sh-fls">${fl('all', '全部')}${fl('f', '專題')}${fl('p', '推坑')}${fl('sale', '特價中')}${fl('new', '沒看過')}${fl('want', '我想玩')}</div>
      <button class="sh-auto ${S.settings.shAuto ? 'on' : ''}" data-act="sh-auto" aria-label="連播"><i></i>連播</button><span class="sh-n"></span>
      <div class="sh-nav"><button data-act="sh-prev" aria-label="上一款">▲</button><button data-act="sh-next" aria-label="下一款">▼</button></div></div>
    <div class="sh-feed" id="shfeed">${SH.list.map((it, i) => `<section class="sv" data-i="${i}"></section>`).join('')}<section class="sv sv-end" data-i="${SH.list.length}">${shEndHtml()}</section></div>`;
}
function shEndHtml() {
  if (!SH.list.length) {
    const msg = {
      want: '還沒有想玩的。看到喜歡的預告，點兩下影片或按 ♥，就會收進這裡。',
      sale: '這面牆上的遊戲目前都沒有特價。Steam 價格每小時更新，一打折就會出現在這裡。',
      new: '全部都看過了！每天清晨會解包新遊戲、中午加推坑。',
    }[SH.f] || '還沒有可以看的預告，晚點再來。';
    return `<div class="sv-endb"><div class="sv-endt">空空的</div><p>${msg}</p><div class="btnrow"><button class="btn y" data-act="sh-f" data-v="all">${ICON.shorts}<span>看全部</span></button></div></div>`;
  }
  return `<div class="sv-endb"><div class="sv-endt">到底啦！</div><p>這面牆 ${SH.list.length} 款的預告都滑完了。每天清晨會解包新遊戲、中午加推坑，一上架就會先出現在最上面。</p>
    <div class="btnrow"><button class="btn y" data-act="sh-top">${ICON.shorts}<span>從頭再看</span></button><button class="btn p" data-go="picks">${ICON.gem}<span>去推坑牆</span></button><button class="btn k" data-go="lib">${ICON.box}<span>翻庫存</span></button></div></div>`;
}
function shChips(it, lv) {
  const out = []; const pr = lv && lv.price;
  if (lv && lv.free) out.push('<span class="chip y">免費</span>');
  else if (pr && pr.final != null) out.push(`<span class="chip y">${esc(fmtNT(pr.final))}${pr.disc > 0 ? ` <b class="dsc">-${pr.disc}%</b>` : ''}</span>`);
  else { const t = priceLabel(it, lv); if (t) out.push(`<span class="chip y">${esc(t.length > 12 ? t.slice(0, 12) + '…' : t)}</span>`); }
  const z = liveZh(lv, it.zhs);
  out.push(`<span class="chip ${z === 'tc' ? '' : 'n'}">${z === 'tc' ? '繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '中文未知'}</span>`);
  const dd = it.release && /^\d{4}-\d{2}-\d{2}$/.test(it.release) ? dayDiff(todayTW(), it.release) : null;
  if (dd != null && dd > 0) out.push(`<span class="chip p">${esc(mdDay(it.release))} 上市・倒數 ${dd} 天</span>`);
  else if (dd === 0) out.push('<span class="chip p">今天上市</span>');
  if (lv && lv.rv && lv.rv.pct != null) out.push(`<span class="chip">Steam ${lv.rv.pct}%</span>`);
  if (lv && lv.players && lv.players.n) out.push(`<span class="chip">同上<b>${esc(fmtN(lv.players.n))}</b></span>`);
  if (it.hours) out.push(`<span class="chip n">${esc(it.hours)}</span>`);
  if (it.tw === false) out.push('<span class="chip p">台灣未開放</span>');
  return out.join('');
}
function shSlideHtml(it, i) {
  const lv = liveOf(it.steam); const pk = it._k === 'p'; const key = shKeyOf(it);
  const vids = shVids(it); const v0 = vids[SH.vi[key] || 0] || vids[0];
  const poster = (v0 && v0.poster) || heroOf(it, lv);
  const latest = pk ? ((S.picks.items[0] || {}).date) : ((S.index.items[0] || {}).date);
  const isNew = it.date === latest && !S.seen['v:' + key];
  const want = S.marks[it.id] === 'want';
  const seal = pk ? `<div class="sv-seal sp ${PICK_CLS[it.stamp] || ''}">${esc(it.stamp)}</div>` : `<div class="sv-seal ${STAMP_CLS[it.stamp] || ''}">${esc(it.stamp)}${it.stamp === '推薦' ? '!!' : ''}</div>`;
  const tags = (it.genres || []).slice(0, 4).map((g) => `<span>#${esc(String(g).replace(/\s+/g, ''))}</span>`).join('');
  const snd = shSoundOn();
  return `<canvas class="sv-bg" width="24" height="42"></canvas><div class="sv-shade"></div>
    <div class="sv-wrap">
      <header class="sv-head">
        <div class="sv-tags1"><span class="sv-kind ${pk ? 'sp' : ''}">${esc(pk ? '推坑・' + (it.label || it.stamp) : (it.kind_label || '解包'))}</span><span class="sv-date">${esc((it.date || '').slice(5).replace('-', '.'))}</span>${isNew ? '<span class="sv-new">NEW</span>' : ''}</div>
        <h2 class="sv-title">${esc(it.zh)}</h2>${it.en && it.en !== it.zh ? `<div class="sv-en">${esc(it.en)}</div>` : ''}
        ${seal}
      </header>
      <div class="sv-stage">
        <div class="sv-vid">
          <img class="sv-poster" src="${esc(poster)}" alt="" decoding="async" onerror="shImgFail(this)" onload="if(this.naturalWidth<=120)shImgFail(this)">
          <div class="sv-ui">
            <div class="sv-load"><b>LOADING</b><i></i><i></i><i></i></div>
            <button class="sv-big" data-act="sh-play" aria-label="播放">${ICON.play}</button>
            <div class="sv-x2">2× <b>▶▶</b></div>
            <button class="sv-tap" data-act="sh-unmute">${ICON.mute}<span>點一下開聲音</span></button>
            <div class="sv-ythint">YouTube 預告：點影片上的喇叭開聲音</div>
            <button class="sv-fs" data-act="sh-fs" aria-label="全螢幕">${ICON.full}</button>
            <div class="sv-prog"><i></i><b class="sv-time"></b></div>
          </div>
        </div>
        <div class="sv-tr"><span class="sv-tn"></span><span class="sv-dots"></span></div>
      </div>
      <div class="sv-foot">
        <div class="sv-info">
          <p class="sv-cap" data-act="sh-cap">${esc(pk ? it.pitch : it.headline)}</p>
          <button class="sv-mt" data-act="sh-cap" aria-label="展開說明"></button>
          <div class="sv-more"></div>
          <div class="chips">${shChips(it, lv)}</div>
          ${tags ? `<div class="sv-hash">${tags}</div>` : ''}
          <div class="sv-cta"><button class="btn y sm" data-go="${pk ? 'p' : 'f'}/${esc(it.id)}">${ICON.page}<span>${pk ? '看推坑全文' : '看完整專題'}</span></button>${it.steam ? `<a class="btn sm" href="https://store.steampowered.com/app/${esc(it.steam)}/" target="_blank" rel="noopener noreferrer">${ICON.cart}<span>Steam</span></a>` : ''}</div>
        </div>
        <nav class="sv-rail">
          <button class="${want ? 'on' : ''}" data-act="sh-want">${ICON.heart}<span>想玩</span></button>
          <button class="${snd ? '' : 'off'}" data-act="sh-snd">${snd ? ICON.vol : ICON.mute}<span>${snd ? '聲音' : '靜音'}</span></button>
          ${vids.length > 1 ? `<button data-act="sh-vn">${ICON.film}<span class="sv-vn">預告 1/${vids.length}</span></button>` : ''}
          <button data-act="sh-share">${ICON.share}<span>分享</span></button>
        </nav>
      </div>
    </div>`;
}
function shImgFail(img) {
  const low = ytLow(img.getAttribute('src'));
  if (low) { img.src = low; return; }
  img.style.opacity = 0;
}
/* 只畫目前這張、上一張、下兩張；離太遠的清掉 */
/* 這一款的 Steam 預告清單到了沒（在 live/<appid>.json，滑到附近才載） */
function shReady(it) { return !it || !it.steam || liveReady(it.steam); }
function shFill(i, force = -1) {
  for (const k of [...SH.filled]) {
    if (k < i - 2 || k > i + 3) { const s = SH.els[k]; if (s) { s.innerHTML = ''; s.classList.remove('filled'); } SH.filled.delete(k); }
  }
  for (let k = Math.max(0, i - 1); k <= Math.min(SH.list.length - 1, i + 2); k++) {
    if (SH.filled.has(k)) continue;
    const s = SH.els[k]; const it = SH.list[k]; if (!s || !it) continue;
    if (k !== force && !shReady(it)) continue;      // 預告清單還沒到：先不畫，到了再補（不然封面會先錯一張再換）
    s.innerHTML = shSlideHtml(it, k); s.classList.add('filled'); SH.filled.add(k);
    const vids = shVids(it); shTrUI(s, vids, Math.min(SH.vi[shKeyOf(it)] || 0, Math.max(0, vids.length - 1)));
    shBg(s, headerOf(it, liveOf(it.steam)) || (vids[0] && vids[0].poster));   // 用小張的橫幅圖就夠糊了，不解碼大圖
  }
}
/* 假毛玻璃：把圖縮成 24 格寬再放大，瀏覽器的平滑放大就是模糊 */
function shBg(sl, url) {
  const cv = $('.sv-bg', sl); if (!cv || !url) return;
  const W = 24, H = Math.max(14, Math.round(24 * (sl.clientHeight || 16) / (sl.clientWidth || 9)));
  const im = new Image(); im.decoding = 'async';
  im.onload = () => {
    if (!cv.isConnected || im.naturalWidth <= 120) return;
    try {
      cv.width = W; cv.height = H;
      const ar = W / H, iw = im.naturalWidth, ih = im.naturalHeight; let sw = iw, sh = ih, sx = 0, sy = 0;
      if (iw / ih > ar) { sw = ih * ar; sx = (iw - sw) / 2; } else { sh = iw / ar; sy = (ih - sh) / 2; }
      const t = document.createElement('canvas'); t.width = W * 4; t.height = H * 4;
      const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(im, sx, sy, sw, sh, 0, 0, t.width, t.height);
      const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(t, 0, 0, W, H);
      cv.classList.add('on');
    } catch (e) { /* 圖讀不到就維持黑底 */ }
  };
  im.src = url;
}
function shTrUI(sl, vids, vi) {
  const v = vids[vi];
  const tn = $('.sv-tn', sl); if (tn) tn.innerHTML = v ? `<b>${esc(v.from)}</b>${esc(v.t)}` : '<b>截圖</b>這款還沒有預告，先看精彩畫面';
  const dots = $('.sv-dots', sl); if (dots) dots.innerHTML = vids.length > 1 ? vids.map((_, k) => `<i class="${k === vi ? 'on' : ''}"></i>`).join('') : '';
  const vn = $('.sv-vn', sl); if (vn) vn.textContent = `預告 ${vi + 1}/${vids.length}`;
  const box = $('.sv-vid', sl); if (box) box.classList.toggle('yt', !!(v && v.k === 'yt'));
}

/* ---- 切換 ---- */
function shActivate(i) {
  if (i === SH.i || !SH.els[i]) return;
  shStop();
  SH.i = i;
  const near = [];
  for (let k = Math.max(0, i - 2); k <= Math.min(SH.list.length - 1, i + 4); k++) { const x = SH.list[k]; if (x && x.steam && !liveReady(x.steam)) near.push(x.steam); }
  if (near.length) liveLoad(near).then(() => { if (SH.i === i && shOn()) shFill(i); });
  shFill(i);
  SH.els.forEach((s, k) => s.classList.toggle('act', k === i));
  const n = $('#shorts .sh-n'); if (n) n.textContent = i < SH.list.length ? `${i + 1}/${SH.list.length}` : '';
  clearTimeout(SH.seenT);
  const it = SH.list[i];
  if (!it) { if (location.hash !== '#shorts') history.replaceState(null, '', '#shorts'); ROUTE = 'shorts'; shWake(); return; }
  const key = shKeyOf(it); SH.key = key;
  if (decodeURIComponent(location.hash) !== '#shorts/' + key) history.replaceState(null, '', '#shorts/' + key);
  ROUTE = 'shorts/' + key;
  SH.seenT = setTimeout(() => {
    if (SH.list[SH.i] !== it) return;
    S.seen['v:' + key] = 1; save('seen'); setTabs('shorts');
    const nw = $('.sv-new', SH.els[SH.i]); if (nw) nw.classList.add('gone');
  }, 1500);
  shWake();
  if (shReady(it)) { shPlay(SH.els[i], it, SH.vi[key] || 0); return; }
  const tok = SH.tok;
  liveLoad([it.steam], 3000).then(() => {       // 這一款的預告清單到了（或等太久）再開始播
    if (SH.i !== i || SH.tok !== tok || !shOn()) return;
    shFill(i, i); shPlay(SH.els[i], it, SH.vi[key] || 0);
  });
}
function shStop() {
  SH.tok++;
  if (SH.raf) { cancelAnimationFrame(SH.raf); SH.raf = 0; }
  if (SH.hls) { try { SH.hls.destroy(); } catch (e) { /* */ } SH.hls = null; }
  if (SV) {
    try { SV.pause(); } catch (e) { /* */ }
    SV.playbackRate = 1;
    if (SV.parentNode) SV.remove();
    SV.removeAttribute('src'); SV.textContent = '';
    try { SV.load(); } catch (e) { /* */ }
  }
  if (SH.yt) { SH.yt.remove(); SH.yt = null; }
  SH.ytSt = -1;
  const sl = SH.els[SH.i]; const b = sl && $('.sv-vid', sl);
  if (b) { b.classList.remove('on', 'wait', 'paused', 'blocked', 'x2', 'need', 'kbm', 'zap'); const kb = $('.kb', b); if (kb) { kbStop(kb); kb.remove(); } }
}
async function shPlay(sl, it, vi = 0, tries = 0) {
  const tok = ++SH.tok;
  const box = sl && $('.sv-vid', sl); if (!box) return;
  const vids = shVids(it);
  if (!vids.length) { shTrUI(sl, vids, 0); shKB(box, it); return; }
  vi = ((vi % vids.length) + vids.length) % vids.length; SH.vi[shKeyOf(it)] = vi;
  shTrUI(sl, vids, vi);
  const v = vids[vi];
  box.classList.add('wait'); box.classList.remove('on', 'paused', 'blocked', 'need');
  if (fxOn()) { void box.offsetWidth; box.classList.add('zap'); }
  const pimg = $('.sv-poster', box);
  if (pimg && v.poster && pimg.getAttribute('src') !== v.poster) { pimg.style.opacity = ''; pimg.src = v.poster; }
  while (S.introPending) { await sleep(250); if (tok !== SH.tok) return; }   // 開場動畫還在跑：等它跑完再出聲
  if (v.k === 'yt') { shYT(box, v, tok); return; }
  const vid = svEl();
  vid.loop = !!v.loop || !S.settings.shAuto;
  box.insertBefore(vid, $('.sv-ui', box));
  const src = v.src || '';
  const isHls = /\.m3u8(\?|$)/.test(src);
  try {
    if (!src) vidSources(vid, v.mp4, v.webm);
    else if (!isHls || (!FORCE_HLSJS && vid.canPlayType('application/vnd.apple.mpegurl'))) vid.src = src;
    else {
      const Hls = await hlsLib(); if (tok !== SH.tok) return;
      if (!Hls.isSupported()) throw new Error('這台裝置不支援串流');
      const h = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 16, maxMaxBufferLength: 30, backBufferLength: 8 });
      SH.hls = h;
      h.on(Hls.Events.ERROR, (_, d) => { if (d.fatal && tok === SH.tok) shFail(sl, it, vi, tries); });
      h.loadSource(src); h.attachMedia(vid);
    }
  } catch (e) { if (tok === SH.tok) shFail(sl, it, vi, tries); return; }
  svStart(vid, box, tok);
  // 保險：15 秒連一點資料都沒拿到，就換下一支
  setTimeout(() => { if (tok === SH.tok && vid.readyState === 0 && !box.classList.contains('blocked')) shFail(sl, it, vi, tries); }, 15000);
}
async function svStart(vid, box, tok) {
  vid.muted = !shSoundOn();
  try { await vid.play(); if (tok === SH.tok && vid.muted && shSoundOn()) box.classList.add('need'); return; } catch (e) {
    if (tok !== SH.tok || !e || e.name !== 'NotAllowedError') return;
  }
  if (!vid.muted) {   // 有聲自動播放被擋：先靜音播，跳出「點一下開聲音」
    vid.muted = true;
    try { await vid.play(); if (tok === SH.tok) box.classList.add('need'); return; } catch (e) { if (tok !== SH.tok) return; }
  }
  box.classList.remove('wait'); box.classList.add('blocked');   // 連靜音自動播都不行（例如省電模式）：大播放鍵，點一下就播
}
function shFail(sl, it, vi, tries = 0) {
  sl = sl || SH.els[SH.i]; it = it || SH.list[SH.i]; if (!sl || !it || sl !== SH.els[SH.i]) return;
  const vids = shVids(it); if (vi == null) vi = SH.vi[shKeyOf(it)] || 0;
  shStop();
  if (tries + 1 < vids.length) { shPlay(sl, it, vi + 1, tries + 1); return; }
  const box = $('.sv-vid', sl); shKB(box, it);
  const tn = $('.sv-tn', sl); if (tn) tn.innerHTML = '<b>截圖</b>預告暫時讀不到，先看精彩畫面';
}
/* 沒有預告：精彩畫面輪播 */
function shKB(box, it) {
  if (!box) return;
  const lv = liveOf(it.steam); const first = heroOf(it, lv);
  box.classList.remove('wait', 'yt'); box.classList.add('on', 'kbm');
  if (!first) return;
  const kb = document.createElement('div'); kb.className = 'kb';
  kb.innerHTML = `<img class="kbi on" alt="" src="${esc(first)}" onerror="imgFail(this)" onload="ytCheck(this)"><img class="kbi" alt="" decoding="async">`;
  box.insertBefore(kb, $('.sv-ui', box));
  if (fxOn()) kbStart(kb, posterList(it, lv, first), 4200);
}
/* YouTube：只能用 iframe；靠 postMessage 聽「播完了」好自動下一支 */
function shYT(box, v, tok) {
  const mute = IOS || !shSoundOn();   // iPhone 在 iframe 裡不給有聲自動播放
  const loop = !S.settings.shAuto;
  const f = document.createElement('iframe');
  f.className = 'shyt'; f.title = v.t;
  f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); f.setAttribute('allowfullscreen', '');
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&mute=${mute ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${loop ? '&loop=1&playlist=' + encodeURIComponent(v.id) : ''}`;
  const hello = () => { try { if (f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'unpacked', channel: 'widget' }), '*'); } catch (e) { /* */ } };
  f.addEventListener('load', () => { if (tok !== SH.tok) return; box.classList.remove('wait'); box.classList.add('on'); hello(); setTimeout(hello, 700); setTimeout(hello, 2000); });
  box.insertBefore(f, $('.sv-ui', box)); SH.yt = f; SH.ytSt = -1; shWake();
  if (IOS && shSoundOn()) { box.classList.add('ythint'); setTimeout(() => box.classList.remove('ythint'), 4200); }
}
function ytCmd(func, args = []) { try { if (SH.yt && SH.yt.contentWindow) SH.yt.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) { /* */ } }
addEventListener('message', (e) => {
  if (!SH.yt || e.source !== SH.yt.contentWindow) return;
  let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
  if (!d || typeof d !== 'object') return;
  if (d.event === 'onError') { shFail(); return; }
  let st = null;
  if (d.event === 'onStateChange') st = d.info;
  else if (d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') st = d.info.playerState;
  if (typeof st !== 'number' || st === SH.ytSt) return;
  SH.ytSt = st;
  if (st === 0 && S.settings.shAuto) shGo(SH.i + 1);
});

/* ---- 進度條 ---- */
function shTickGo() { if (!SH.raf) SH.raf = requestAnimationFrame(shTick); }
function shTick() {
  SH.raf = 0;
  const b = svBox(); if (!b || SV.paused) return;
  const bar = $('.sv-prog i', b);
  if (bar && !SH.drag && SV.duration > 0 && isFinite(SV.duration)) bar.style.transform = `scaleX(${Math.min(1, SV.currentTime / SV.duration).toFixed(4)})`;
  SH.raf = requestAnimationFrame(shTick);
}

/* ---- 操作 ---- */
function shGo(i) {
  const feed = $('#shfeed'); if (!feed || !SH.els.length) return;
  i = Math.max(0, Math.min(SH.els.length - 1, i));
  const far = Math.abs(i - SH.i) > 1;
  if (far) SH.lock = performance.now() + 400;   // 一次跳很多張：中間經過的不要播
  feed.scrollTo({ top: i * feed.clientHeight, behavior: far || REDUCED ? 'auto' : 'smooth' });
  if (far) shActivate(i);
}
function shToggle() {
  const b = svBox();
  if (b && b === $('.sv-vid', SH.els[SH.i])) {
    if (SV.paused) { b.classList.remove('paused', 'blocked'); SV.play().catch(() => {}); }
    else { SV.pause(); b.classList.add('paused'); }
    return;
  }
  if (SH.yt) ytCmd(SH.ytSt === 1 ? 'pauseVideo' : 'playVideo');
}
function shSnd(on) {
  SH.snd = on; S.settings.shSound = on; save('settings');
  if (svBox()) { SV.muted = !on; if (on && SV.paused && svBox().classList.contains('blocked')) SV.play().catch(() => {}); }
  if (SH.yt) { ytCmd(on ? 'unMute' : 'mute'); if (on) ytCmd('setVolume', [100]); }
  $$('#shorts [data-act="sh-snd"]').forEach((b) => { b.innerHTML = (on ? ICON.vol : ICON.mute) + `<span>${on ? '聲音' : '靜音'}</span>`; b.classList.toggle('off', !on); });
  $$('#shorts .sv-vid.need').forEach((b) => b.classList.remove('need'));
}
function shWant(i, on, at) {
  const it = SH.list[i]; if (!it) return;
  const was = S.marks[it.id] === 'want';
  if (on == null) on = !was;
  if (on) S.marks[it.id] = 'want'; else if (was) delete S.marks[it.id];
  save('marks');
  const btn = SH.els[i] && $('[data-act="sh-want"]', SH.els[i]);
  if (btn) { btn.classList.toggle('on', on); if (on) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); } }
  if (on) {
    sfx.pop(); haptic(14);
    if (at && at.x != null) burst(at.x, at.y, [PINK, YEL, '#fff'], 18, 9); else burstAt(btn, [PINK, YEL, '#fff'], 14, 8);
    if (!was && !LS.get('shWantTip', 0)) { LS.set('shWantTip', 1); toast('收進「我想玩」：上面切到「我想玩」就只看這些'); }
  } else sfx.click();
}
function shHeart(x, y) {
  const sl = SH.els[SH.i]; if (!sl || !SH.list[SH.i]) return;
  const r = sl.getBoundingClientRect();
  const h = document.createElement('i'); h.className = 'sv-hrt';
  h.style.left = (x - r.left) + 'px'; h.style.top = (y - r.top) + 'px'; h.style.setProperty('--r', ((Math.random() * 2 - 1) * 18).toFixed(0) + 'deg');
  h.innerHTML = ICON.heart + ICON.heart; sl.appendChild(h);
  h.addEventListener('animationend', () => h.remove(), { once: true }); setTimeout(() => h.remove(), 1400);
  shWant(SH.i, true, { x, y });
}
function shVN(d = 1) {
  const sl = SH.els[SH.i], it = SH.list[SH.i]; if (!sl || !it) return;
  const vids = shVids(it); if (vids.length < 2) { toast('這款目前只有一支預告'); return; }
  const box = $('.sv-vid', sl);
  shStop();
  if (box && fxOn()) { box.classList.remove('swl', 'swr'); void box.offsetWidth; box.classList.add(d > 0 ? 'swl' : 'swr'); }
  sfx.click(); haptic(8);
  shPlay(sl, it, (SH.vi[shKeyOf(it)] || 0) + d);
}
async function shShare(i) {
  const it = SH.list[i]; if (!it) return;
  const url = location.origin + location.pathname + '#shorts/' + shKeyOf(it);
  const text = `${it.zh}｜${it._k === 'p' ? it.pitch : it.headline}`;
  if (navigator.share) { try { await navigator.share({ title: '解包 UNPACKED', text, url }); sfx.ding(); } catch (e) { /* 取消 */ } return; }
  if (await copyText(text + '\n' + url)) { sfx.stamp(); toast('連結已複製'); } else toast('複製失敗', 'warn');
}
function shFull() {
  const box = $('.sv-vid', SH.els[SH.i]); if (!box) return;
  if (SH.yt) { toast('YouTube 預告請按影片右下角的全螢幕'); return; }
  if (svBox() !== box) return;
  if (IOS && SV.webkitEnterFullscreen) { try { SV.webkitEnterFullscreen(); } catch (e) { /* */ } return; }
  const req = box.requestFullscreen || box.webkitRequestFullscreen; if (!req) return;
  try { Promise.resolve(req.call(box)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ } }).catch(() => {}); } catch (e) { /* */ }
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { try { screen.orientation.unlock(); } catch (e) { /* */ } } });
async function shCap(i) {
  const sl = SH.els[i]; const info = sl && $('.sv-info', sl); if (!info) return;
  const open = !info.classList.contains('open'); info.classList.toggle('open', open); sfx.click();
  if (!open || info.dataset.more) return;
  info.dataset.more = '1';
  const it = SH.list[i]; const box = $('.sv-more', info);
  try {
    const f = it._k === 'p' ? await loadPick(it.id) : await loadFeature(it.id);
    const t = it._k === 'p' ? f.why : f.hook;
    if (t && box) box.innerHTML = `<p>${nl2br(t)}</p>`;
  } catch (e) { /* 讀不到就只顯示標題 */ }
}
function shClick(ev) {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act; if (!a.startsWith('sh-')) return;
  ev.stopPropagation(); ev.preventDefault(); shWake();
  const sl = b.closest('.sv'); const i = sl ? +sl.dataset.i : SH.i;
  if (a === 'sh-f') { if (SH.f === b.dataset.v && SH.list.length) return; SH.f = b.dataset.v; SH.key = null; SH.list = shItems(); shBuild(0); sfx.click(); return; }
  if (a === 'sh-auto') {
    S.settings.shAuto = !S.settings.shAuto; save('settings'); b.classList.toggle('on', S.settings.shAuto);
    if (SV) SV.loop = !S.settings.shAuto; sfx.click();
    toast(S.settings.shAuto ? '連播：開（播完自動下一款）' : '連播：關（同一支重複播）'); return;
  }
  if (a === 'sh-want') { shWant(i); return; }
  if (a === 'sh-snd') { shSnd(!shSoundOn()); return; }
  if (a === 'sh-unmute') { shSnd(true); return; }
  if (a === 'sh-play') { shToggle(); return; }
  if (a === 'sh-vn') { if (i === SH.i) shVN(1); return; }
  if (a === 'sh-share') { shShare(i); return; }
  if (a === 'sh-fs') { shFull(); return; }
  if (a === 'sh-cap') { shCap(i); return; }
  if (a === 'sh-top') { shGo(0); sfx.whoosh(); return; }
  if (a === 'sh-prev' || a === 'sh-next') { shGo(SH.i + (a === 'sh-next' ? 1 : -1)); return; }
  if (a === 'sh-exit') { sfx.scratch(); if (NAVN > 0) { NAVN--; history.back(); } else location.hash = 'home'; }
}
/* 點一下暫停、點兩下想玩、長按兩倍速、左右滑換預告、拖進度條 */
function shBind(feed) {
  let p0 = null, lpT = 0, held = false, last = null, tapT = 0, seekT = 0, seekK = 0;
  const skip = (t) => t.closest('button, a, .sv-cap, .sv-more, iframe, .sv-end');
  const seekShow = (e) => {
    const pr = SH.drag; const r = pr.getBoundingClientRect();
    seekK = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    $('i', pr).style.transform = `scaleX(${seekK})`;
    $('.sv-time', pr).textContent = `${tfmt(seekK * SV.duration)} / ${tfmt(SV.duration)}`;
    const now = performance.now(); if (now - seekT > 220) { seekT = now; try { SV.currentTime = seekK * SV.duration; } catch (x) { /* */ } }
  };
  feed.addEventListener('pointerdown', (e) => {
    shWake();
    const pr = e.target.closest('.sv-prog');
    if (pr) {
      if (!svBox() || !(SV.duration > 0) || !pr.closest('.sv-vid').contains(SV)) return;
      e.preventDefault(); SH.drag = pr; pr.classList.add('drag'); try { pr.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      seekT = 0; seekShow(e); return;
    }
    if (e.button > 0 || skip(e.target)) { p0 = null; return; }
    p0 = { x: e.clientX, y: e.clientY, t: performance.now() }; held = false; clearTimeout(lpT);
    const box = e.target.closest('.sv-vid');
    if (box && svBox() === box && !SV.paused) lpT = setTimeout(() => { held = true; SV.playbackRate = 2; box.classList.add('x2'); haptic(10); }, 450);
  });
  feed.addEventListener('pointermove', (e) => { if (SH.drag) seekShow(e); else if (e.pointerType === 'mouse') shWake(); });
  const release = () => { clearTimeout(lpT); if (!held) return false; held = false; if (SV) SV.playbackRate = 1; $$('#shorts .sv-vid.x2').forEach((b) => b.classList.remove('x2')); return true; };
  const endDrag = () => { if (!SH.drag) return false; try { SV.currentTime = seekK * SV.duration; } catch (x) { /* */ } SH.drag.classList.remove('drag'); SH.drag = null; return true; };
  feed.addEventListener('pointercancel', () => { endDrag(); release(); p0 = null; });
  feed.addEventListener('pointerup', (e) => {
    if (endDrag()) return;
    const wasHeld = release(); const q = p0; p0 = null;
    if (wasHeld || !q) return;
    const dx = e.clientX - q.x, dy = e.clientY - q.y, dt = performance.now() - q.t;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 800) { shVN(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12 || dt > 500) return;
    const now = performance.now();
    if (last && now - last.t < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 60) { clearTimeout(tapT); last = null; shHeart(e.clientX, e.clientY); return; }
    last = { t: now, x: e.clientX, y: e.clientY };
    const box = e.target.closest('.sv-vid');
    if (box && box.classList.contains('blocked')) { clearTimeout(tapT); last = null; shToggle(); return; }   // 要在點擊當下播，iPhone 才會放行
    clearTimeout(tapT); tapT = setTimeout(() => { last = null; shToggle(); }, 280);
  });
}
/* 橫拿手機時，字幕和按鈕放著不動會自己淡掉，碰一下再出來 */
function shWake() {
  document.body.classList.remove('sh-idle'); clearTimeout(SH.idleT);
  SH.idleT = setTimeout(shIdle, 2800);
}
function shIdle() { if (shOn() && !SH.drag && ((svBox() && !SV.paused) || SH.yt)) document.body.classList.add('sh-idle'); }
function shKeys(e) {
  if (!shOn() || $('#sheet.on')) return false;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  const k = e.key; shWake();
  if (k === 'ArrowDown' || k === 'PageDown' || k === 'j' || k === 'J') shGo(SH.i + 1);
  else if (k === 'ArrowUp' || k === 'PageUp' || k === 'k' || k === 'K') shGo(SH.i - 1);
  else if (k === ' ' || k === 'Spacebar') shToggle();
  else if (k === 'm' || k === 'M') shSnd(!shSoundOn());
  else if (k === 'l' || k === 'L') shWant(SH.i);
  else if (k === 'ArrowRight' || k === 'ArrowLeft') { if (svBox() && SV.duration > 0) SV.currentTime = Math.max(0, Math.min(SV.duration - 0.2, SV.currentTime + (k === 'ArrowRight' ? 5 : -5))); }
  else if (k === 'n' || k === 'N' || k === '.') shVN(1);
  else if (k === 'p' || k === 'P' || k === ',') shVN(-1);
  else if (k === 'f' || k === 'F') shFull();
  else if (k === 'Home') shGo(0);
  else if (k === 'Enter') { const it = SH.list[SH.i]; if (!it) return false; NAVN++; location.hash = (it._k === 'p' ? 'p/' : 'f/') + it.id; }
  else return false;
  e.preventDefault(); return true;
}
/* 第一次來：教一下怎麼滑 */
function shHint() {
  if (LS.get('shHint', 0) || !SH.list.length) return;
  const root = $('#shorts'); const h = document.createElement('div'); h.className = 'sh-hint';
  const pc = matchMedia('(hover:hover) and (pointer:fine)').matches;
  h.innerHTML = pc
    ? `<div class="hh-t">短影音怎麼看</div><div class="hh"><b>↓</b>滾輪或 ↑↓ 鍵：換一款</div><div class="hh"><b>N</b>N／P：同一款的其他預告</div><div class="hh"><b>♥</b>點兩下或 L：收進「我想玩」</div><div class="hh"><b>Ⅱ</b>空白鍵暫停・M 靜音・←→ 快轉</div><div class="hh-ok">知道了</div>`
    : `<div class="hh-t">短影音怎麼滑</div><div class="hh"><b>↑</b>往上滑：下一款</div><div class="hh"><b>⇆</b>左右滑：同一款的其他預告</div><div class="hh"><b>♥</b>點兩下：收進「我想玩」</div><div class="hh"><b>Ⅱ</b>點一下暫停・按住 2 倍速</div><div class="hh-ok">知道了</div>`;
  root.appendChild(h);
  const done = () => { if (!h.isConnected) return; LS.set('shHint', 1); h.classList.add('out'); setTimeout(() => h.remove(), 400); };
  h.addEventListener('click', (e) => { e.stopPropagation(); done(); });
  SH.hintT = setTimeout(done, 6500);
  const feed = $('#shfeed'); if (feed) feed.addEventListener('scroll', done, { once: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (!shOn()) return;
  if (document.hidden) { if (svBox() && !SV.paused) { SH.resume = true; SV.pause(); } if (SH.yt) ytCmd('pauseVideo'); }
  else if (SH.resume) { SH.resume = false; if (svBox()) SV.play().catch(() => {}); }
});
