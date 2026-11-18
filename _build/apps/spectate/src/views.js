'use strict';
/* 觀戰 SPECTATE — 畫面 */

const CTX = new Map();          // 每一排的影片清單（開導播台時，PVW 就照這排接下去）
function ctxOf(name, items) { CTX.set(name, items.map((x) => x.i)); return name; }

/* ------------------------------------------------------------ 元件 */
function avatar(c, size = 28) {
  const ch = chOf(c);
  const s = 'width:' + size + 'px;height:' + size + 'px';
  if (ch.a) return `<span class="av" style="${s}"><img loading="lazy" src="${esc(ch.a)}" alt="" referrerpolicy="no-referrer"></span>`;
  const n = (ch.n || '?').trim().charAt(0).toUpperCase();
  const hue = hash32(c || n) % 360;
  return `<span class="av av-t" style="${s};--h:${hue};font-size:${Math.round(size * 0.46)}px">${esc(n)}</span>`;
}
function laneTag(l) { const ln = LANES[l] || LANES.play; return `<i class="lane" style="--lc:${ln.c}">${ln.zh}</i>`; }
function secHead(zh, en, more, extra = '') {
  return `<div class="sh"><h2><b>${esc(zh)}</b><i>${esc(en)}</i></h2>${extra}${more ? `<a class="sh-more" href="${more}">全部<span>›</span></a>` : ''}</div>`;
}
function card(it, ctx, opt = {}) {
  const ch = chOf(it.c), ln = LANES[it.l] || LANES.play, h = histOf(it.i);
  const prog = h && !h[3] && h[2] ? clamp(h[1] / h[2], 0.03, 1) : 0;
  const meta = [];
  if (it.lv === 'live') meta.push(`<b class="red">${it.cv ? num(it.cv) + ' 人觀戰' : '直播中'}</b>`);
  else if (it.lv === 'upcoming') meta.push(`<b class="gold">${esc(until(it.st))}</b>`);
  else if (it.p) meta.push(esc(ago(it.p)));
  if (it.v && it.lv !== 'live') meta.push(num(it.v));
  const isNew = it.p && it.p * 1000 > (store.get('visit', 0) || 0) && !h;
  return `<a class="vc${opt.big ? ' big' : ''}${h && h[3] ? ' seen' : ''}" href="#watch/${it.i}" data-v="${it.i}" data-ctx="${ctx || ''}" style="--lc:${ln.c}">
    <span class="vc-th"><img loading="lazy" src="${thumb(it.i)}" alt="">
      <i class="vc-lane">${it.lv === 'live' ? '<b class="dotlive"></b>LIVE' : ln.zh}</i>
      ${it.dh ? `<i class="vc-dh">黑馬 ×${it.dh >= 100 ? '99+' : it.dh}</i>` : ''}
      ${it.d && it.lv !== 'live' ? `<i class="vc-d">${dur(it.d)}</i>` : ''}
      ${h && h[3] ? '<i class="vc-rp">REPLAY</i>' : ''}
      ${isNew ? '<i class="vc-new">NEW</i>' : ''}
      ${prog ? `<i class="vc-pg" style="--p:${(prog * 100).toFixed(0)}%"></i>` : ''}
    </span>
    <span class="vc-t">${esc(titleOf(it))}</span>
    <span class="vc-m">${it.c ? avatar(it.c, 18) : ''}<b>${esc(ch.n || '')}</b>${meta.length ? '<span>' + meta.join(' · ') + '</span>' : ''}${zf(it) ? '' : `<em class="vc-lg">${LANGS[it.z] || ''}</em>`}</span>
  </a>`;
}
function row(name, items, opt = {}) {
  if (!items.length) return '';
  const ctx = ctxOf(name, items);
  const shown = items.slice(0, opt.max || 16);
  return `<section class="sec">${secHead(opt.zh, opt.en, opt.more, opt.extra)}
    <div class="row${opt.big ? ' big' : ''}">${shown.map((it) => card(it, ctx, opt)).join('')}${opt.more && items.length > shown.length ? `<a class="vc more" href="${opt.more}"><span>看全部<b>${items.length}</b></span></a>` : ''}</div></section>`;
}
function grid(name, items, opt = {}) {
  const ctx = ctxOf(name, items);
  const n = opt.limit || 48;
  return `<div class="grid">${items.slice(0, n).map((it) => card(it, ctx)).join('')}</div>${items.length > n ? `<button class="btn wide" data-act="more" data-n="${n + 48}">再載入 ${Math.min(48, items.length - n)} 支</button>` : ''}`;
}
function empty(msg, sub = '', act = '') {
  return `<div class="empty"><div class="empty-ic"><i></i><i></i><i></i></div><b>${msg}</b>${sub ? `<p>${sub}</p>` : ''}${act}</div>`;
}
function gameTile(g, i) {
  const yt = g.cover ? thumb(g.cover, 'mqdefault') : '';
  const cover = g.img || yt;
  const lanes = Object.entries(g.lanes || {}).sort((a, b) => b[1] - a[1]);
  const tot = lanes.reduce((s, x) => s + x[1], 0) || 1;
  return `<a class="gt" href="#g/${encodeURIComponent(g.k)}">
    <span class="gt-img">${cover ? `<img loading="lazy" src="${esc(cover)}" ${g.img && yt ? `data-fb="${yt}"` : ''} alt="">` : ''}<i class="gt-rank">${String(i + 1).padStart(2, '0')}</i></span>
    <span class="gt-name">${esc(gameName(g))}</span>
    ${g.zh && g.en && g.zh !== g.en ? `<span class="gt-en">${esc(g.en)}</span>` : ''}
    <span class="gt-stat"><b>${g.chs || 0}</b> 台在聊 · <b>${g.n || 0}</b> 支新片</span>
    <span class="gt-bar">${lanes.map(([l, n]) => `<i style="--lc:${(LANES[l] || LANES.play).c};flex:${n / tot}"></i>`).join('')}</span>
  </a>`;
}
function chanChip(c, src) {
  const ch = chOf(c), on = !!VIEW.subs[c];
  return `<div class="cc${on ? ' on' : ''}" data-c="${c}">
    <a class="cc-l" href="#ch/${c}">${avatar(c, 40)}<span class="cc-n"><b>${esc(ch.n || c)}</b><span>${esc(KINDS[ch.k] || '')}${ch.l ? ' · ' + (LANGS[ch.l] || ch.l) : ''}${ch.subs ? ' · ' + num(ch.subs) : ''}</span></span></a>
    <button class="sub-btn sm ${on ? 'on' : ''}" data-act="${on ? 'unsub' : 'sub'}" data-c="${c}" data-src="${src || 'app'}">${on ? '已訂閱' : '＋ 訂閱'}</button>
  </div>`;
}
function pageHead(zh, en, sub = '', right = '') {
  return `<header class="ph"><div class="ph-t"><h1><b>${esc(zh)}</b><i>${esc(en)}</i></h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</header>`;
}
function backBar(label) {
  return `<div class="backbar"><button class="back" data-act="back"><span>‹</span>${esc(label || '返回')}</button></div>`;
}
function statusLine() {
  const st = D.status;
  if (!D.feed) return '';
  const age = D.feed.at ? Math.round((Date.now() - Date.parse(D.feed.at)) / 60000) : null;
  return `<div class="foot">轉播資料 ${age == null ? '' : age < 2 ? '剛剛' : age + ' 分鐘前'}更新 · ${Object.keys(IDX.ch).length} 個頻道 · ${IDX.items.length} 支影片${st && !st.key ? ' · <a href="#key">開啟直播雷達</a>' : ''}</div>`;
}
function keyCard(what) {
  return `<a class="keycard" href="#key"><span class="kc-ic">KEY</span><span><b>${esc(what)}要先接上 YouTube 金鑰</b><span>免費，五分鐘設定一次。點我看步驟 ›</span></span></a>`;
}

/* ------------------------------------------------------------ 轉播台（首頁） */
let heroTimer = 0, heroIdx = 0;
function vHome() {
  if (!D.feed) return loadingView();
  const hero = L.hero();
  const subs = subsOn();
  const main = L.main();
  const live = L.live();
  const ws = weekStats();
  let h = '';
  h += heroHtml(hero);
  if (!subs) {
    h += `<a class="cta" href="#pick"><span class="cta-tag">STEP 1</span><span class="cta-t"><b>先選台：挑你要追的頻道</b><span>現在先播精選名單的內容；選好之後，轉播台就只排你的頻道。</span></span><span class="cta-go">選台 ›</span></a>`;
  } else if (ws.total > 40 * 60e3 && ws.top3 > 0.75) {
    const names = ws.rows.slice(0, 3).map(([c]) => chOf(c).n).join('、');
    h += `<a class="cta warn" href="#rookies"><span class="cta-tag">破圈</span><span class="cta-t"><b>這週 ${Math.round(ws.top3 * 100)}% 的時間都在看 ${esc(names)}</b><span>去新秀區看看別的台？</span></span><span class="cta-go">新秀 ›</span></a>`;
  }
  h += questStripHtml();
  if (live.length) {
    const ctx = ctxOf('live', live);
    h += `<section class="sec live-sec">${secHead('直播中', 'ON AIR', '#live')}<div class="row big">${live.slice(0, 8).map((it) => card(it, ctx, { big: 1 })).join('')}</div></section>`;
  }
  h += row('main', main.filter((it) => nowS() - it.p < 10 * 86400), { zh: subs ? '你的頻道・新片' : '精選頻道・新片', en: subs ? 'MY FEED' : 'FEATURED', more: subs ? '#list/subs' : '#list/pool', max: 14 });
  h += row('trailer', L.lane('trailer'), { zh: '新預告', en: 'TRAILERS', more: '#list/trailer' });
  const dark = L.dark();
  h += row('dark', dark, { zh: '黑馬', en: 'DARK HORSE', more: '#list/dark', extra: '<span class="sh-note">比平常多好幾倍人看</span>' });
  const games = gamesList().slice(0, 8);
  if (games.length) h += `<section class="sec">${secHead('熱門遊戲', 'HOT GAMES', '#games')}<div class="row games">${games.map((g, i) => gameTile(g, i)).join('')}</div></section>`;
  const rk = rookies().slice(0, 3);
  if (rk.length) {
    h += `<section class="sec">${secHead('新秀試吃', 'ROOKIES', '#rookies', '<span class="sh-note">名單外的新頻道</span>')}<div class="row rk">${rk.map((r) => `
      <a class="rk-mini" href="#rookies">${avatar(r.c, 52)}<b>${esc(r.n || '')}</b><span>${esc((r.why || [])[0] || '')}</span></a>`).join('')}</div></section>`;
  }
  h += row('cont', L.cont(), { zh: '繼續觀看', en: 'CONTINUE', more: '#list/cont' });
  h += row('later', L.later().filter((x) => !x.ghost), { zh: '稍後觀看', en: 'QUEUE', more: '#list/later' });
  h += row('review', L.lane('review'), { zh: '評測', en: 'REVIEWS', more: '#list/review' });
  h += row('deep', L.lane('deep'), { zh: '深度與幕後', en: 'DEEP DIVE', more: '#list/deep' });
  h += row('guide', L.lane('guide'), { zh: '攻略', en: 'GUIDES', more: '#list/guide' });
  h += row('play', L.lane('play'), { zh: '實況', en: 'LET\'S PLAY', more: '#list/play' });
  h += row('news', L.lane('news'), { zh: '新聞與節目', en: 'NEWS & SHOWS', more: '#list/news' });
  h += statusLine();
  return h;
}
function heroHtml(items) {
  if (!items.length) return '';
  const ctx = ctxOf('hero', items);
  return `<section class="hero" id="hero" data-n="${items.length}">
    <div class="hero-slides">${items.map((it, i) => {
      const ch = chOf(it.c), ln = LANES[it.l] || LANES.play, g = gameOf(it.g);
      return `<a class="hs${i === 0 ? ' on' : ''}" href="#watch/${it.i}" data-v="${it.i}" data-ctx="${ctx}" style="--lc:${ln.c}">
        <img class="hs-img" ${i === 0 ? '' : 'loading="lazy"'} src="${thumb(it.i, 'maxresdefault')}" data-fb="${thumb(it.i, 'hqdefault')}" alt="">
        <span class="hs-shade"></span>
        <span class="hs-txt">
          <span class="hs-kick">${it.lv === 'live' ? '<i class="bug-live"><b class="dotlive"></b>LIVE</i>' : `<i class="lane" style="--lc:${ln.c}">${ln.zh}</i>`}<em>焦點 FEATURED ${String(i + 1).padStart(2, '0')}</em>${g ? `<em class="hs-g">${esc(gameName(g))}</em>` : ''}</span>
          <span class="hs-title">${esc(titleOf(it))}</span>
          <span class="hs-l3"><span class="l3a">${avatar(it.c, 26)}<b>${esc(ch.n)}</b></span><span class="l3b">${it.lv === 'live' ? (it.cv ? num(it.cv) + ' 人觀戰' : '直播中') : esc(ago(it.p)) + (it.v ? ' · ' + num(it.v) + ' 次觀看' : '')}</span></span>
        </span></a>`;
    }).join('')}</div>
    <div class="hero-ctl">
      <button class="go-btn" data-act="hero-play"><b>▶</b>開始觀戰</button>
      <button class="ic-sq" data-act="hero-later" aria-label="稍後觀看">＋</button>
      <div class="hero-dots">${items.map((_, i) => `<i class="${i === 0 ? 'on' : ''}" data-act="hero-go" data-i="${i}"><b></b></i>`).join('')}</div>
    </div>
  </section>`;
}
function heroStart() {
  clearInterval(heroTimer);
  heroIdx = 0;
  const hero = $('#hero');
  if (!hero) return;
  const n = +hero.dataset.n;
  if (n < 2) return;
  heroTimer = setInterval(() => { if (!document.hidden && !Player.isOpen() && location.hash.replace('#', '') in { '': 1, home: 1 }) heroGo(heroIdx + 1, true); }, 7000);
  let sx = 0, sy = 0, moved = false;
  hero.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false; }, { passive: true });
  hero.addEventListener('touchmove', (e) => { if (Math.abs(e.touches[0].clientX - sx) > 12 && Math.abs(e.touches[0].clientX - sx) > Math.abs(e.touches[0].clientY - sy)) moved = true; }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (!moved) return;
    const dx = e.changedTouches[0].clientX - sx;
    heroGo(heroIdx + (dx < 0 ? 1 : -1));
    clearInterval(heroTimer); heroTimer = setInterval(() => { if (!document.hidden && !Player.isOpen()) heroGo(heroIdx + 1, true); }, 9000);
  });
  hero.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}
function heroGo(i, auto) {
  const hero = $('#hero');
  if (!hero) { clearInterval(heroTimer); return; }
  const slides = $$('.hs', hero), dots = $$('.hero-dots i', hero);
  const n = slides.length;
  i = ((i % n) + n) % n;
  if (i === heroIdx) return;
  slides[heroIdx].classList.remove('on'); slides[heroIdx].classList.add('off');
  const old = slides[heroIdx];
  setTimeout(() => old.classList.remove('off'), 700);
  slides[i].classList.add('on');
  dots.forEach((d, k) => d.classList.toggle('on', k === i));
  heroIdx = i;
  if (!auto) Snd.play('swipe'); else if (!Fx.lite()) Snd.play('tick');
}
const heroCur = () => { const s = $$('#hero .hs')[heroIdx]; return s ? s.dataset.v : null; };

function loadingView() {
  if (D.err) return empty('轉播訊號還沒進來', esc(D.err) + '<br>第一次打開要等資料管線跑完（最多 20 分鐘）；確定有網路的話，稍後再按重新整理。', '<button class="btn red" data-act="reload">重新整理</button>');
  return `<div class="loading"><div class="bars"><i></i><i></i><i></i><i></i><i></i></div><b>接收轉播訊號…</b></div>`;
}

/* ------------------------------------------------------------ 直播 */
function vLive() {
  if (!D.feed) return loadingView();
  const live = L.live(), up = L.upcoming(), rp = L.replays();
  let h = pageHead('直播', 'ON AIR', live.length ? `現在有 <b class="red">${live.length}</b> 場在播` : '名單裡的頻道一開播，這裡就亮紅燈');
  if (!D.feed.key) h += keyCard('直播雷達');
  if (live.length) {
    const ctx = ctxOf('live', live);
    h += `<div class="live-grid">${live.map((it) => card(it, ctx, { big: 1 })).join('')}</div>`;
  } else if (D.feed.key) {
    h += empty('現在沒有人在播', '名單裡的頻道開播時會出現在這裡。');
  }
  const shows = memo('shows', () => baseList().filter((it) => !it.lv && nowS() - it.p < 10 * 86400 && /直播|生放送|LIVE|Live\b|Direct|State of Play|Showcase|Game Awards|發表會|发布会|直面會|直面会|Stream/.test(titleOf(it))).sort((a, b) => b.p - a.p));
  if (up.length) {
    const ctx = ctxOf('up', up);
    h += `<section class="sec">${secHead('賽程表', 'SCHEDULE')}<div class="sched">${up.map((it) => {
      const d = new Date(it.st * 1000);
      return `<a class="sc" href="#watch/${it.i}" data-v="${it.i}" data-ctx="${ctx}">
        <span class="sc-time"><b>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</b><span>${d.getMonth() + 1}/${d.getDate()}</span></span>
        <span class="sc-th"><img loading="lazy" src="${thumb(it.i)}" alt=""></span>
        <span class="sc-t"><b>${esc(titleOf(it))}</b><span>${esc(chOf(it.c).n)} · <em class="gold">${esc(until(it.st))}</em></span></span></a>`;
    }).join('')}</div></section>`;
  }
  h += row('replay', rp, { zh: '剛結束・重播', en: 'REPLAYS' });
  h += row('shows', shows.filter((it) => !rp.includes(it)), { zh: '直播重播與發表會', en: 'SHOWS & VODS' });
  h += statusLine();
  return h;
}

/* ------------------------------------------------------------ 遊戲 */
let gameFilter = '';
function vGames() {
  if (!D.feed) return loadingView();
  const all = gamesList();
  const q = gameFilter.trim().toLowerCase();
  const list = q ? all.filter((g) => (g.zh || '').toLowerCase().includes(q) || (g.en || '').toLowerCase().includes(q)) : all;
  let h = pageHead('遊戲', 'GAMES', '同一款遊戲的預告、評測、實況，全部收在一頁');
  h += `<div class="searchbox"><input id="gameQ" type="search" placeholder="找遊戲：例如 魔物獵人、GTA" value="${esc(gameFilter)}" autocomplete="off"></div>`;
  h += list.length ? `<div class="gt-grid">${list.map((g, i) => gameTile(g, i)).join('')}</div>` : empty(q ? '找不到這款' : '還在整理遊戲', q ? '換個關鍵字，或到右上角搜尋影片標題。' : '新片進來後會自動歸到各款遊戲。');
  h += statusLine();
  return h;
}
let UNP = null;
function loadUnpacked() {
  if (UNP) return UNP;
  UNP = fetch('../unpacked/data/index.json?t=' + Math.floor(Date.now() / 3600e3)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return UNP;
}
function vGame(k) {
  const g = gameOf(k);
  if (!D.feed) return loadingView();
  if (!g) return backBar('遊戲') + empty('這款遊戲最近沒有新片', '', '<a class="btn" href="#games">看其他遊戲</a>');
  const vids = L.game(k);
  const chans = {};
  vids.forEach((it) => { chans[it.c] = (chans[it.c] || 0) + 1; });
  const order = Object.entries(chans).sort((a, b) => (!!VIEW.subs[b[0]] - !!VIEW.subs[a[0]]) || b[1] - a[1]);
  const cover = g.img || (g.cover ? thumb(g.cover, 'maxresdefault') : (vids[0] ? thumb(vids[0].i, 'maxresdefault') : ''));
  const coverFb = g.cover ? thumb(g.cover, 'hqdefault') : (vids[0] ? thumb(vids[0].i, 'hqdefault') : '');
  let h = backBar('遊戲');
  h += `<section class="gh">
    <div class="gh-img">${cover ? `<img src="${esc(cover)}" data-fb="${coverFb}" alt="">` : ''}<span class="gh-shade"></span></div>
    <div class="gh-txt"><span class="gh-kick">GAME FILE</span><h1>${esc(gameName(g))}</h1>${g.zh && g.en && g.zh !== g.en ? `<div class="gh-en">${esc(g.en)}</div>` : ''}
      <div class="gh-stats"><span><b>${vids.length}</b>支影片</span><span><b>${order.length}</b>個頻道</span>${vids.filter((x) => x.l === 'trailer').length ? `<span><b>${vids.filter((x) => x.l === 'trailer').length}</b>支預告</span>` : ''}</div>
      <div class="gh-acts" id="ghActs">${vids.length ? `<button class="go-btn sm" data-act="play-list" data-ctx="${ctxOf('g:' + k, vids)}"><b>▶</b>連播這款</button>` : ''}${g.id ? `<a class="chip" href="https://store.steampowered.com/app/${g.id}/" target="_blank" rel="noopener">Steam 頁面</a>` : ''}</div>
    </div></section>`;
  if (order.length) {
    h += `<section class="sec">${secHead('誰在聊這款', 'WHO\'S COVERING', '', '<span class="sh-note">從遊戲找到新頻道</span>')}<div class="cc-list">${order.slice(0, 12).map(([c]) => chanChip(c, 'game')).join('')}</div></section>`;
  }
  const groups = [['trailer', '預告', 'TRAILERS'], ['review', '評測', 'REVIEWS'], ['guide', '攻略', 'GUIDES'], ['play', '實況', 'LET\'S PLAY'], ['news', '新聞', 'NEWS'], ['deep', '深度', 'DEEP DIVE'], ['live', '直播', 'LIVE']];
  for (const [l, zh, en] of groups) h += row('g:' + k + ':' + l, vids.filter((x) => x.l === l), { zh, en, max: 20 });
  setTimeout(() => {
    if (!g.id) return;
    loadUnpacked().then((idx) => {
      const hit = idx && (idx.items || []).find((x) => x.steam === g.id);
      const acts = $('#ghActs');
      if (hit && acts && !$('.unp', acts)) acts.insertAdjacentHTML('beforeend', `<a class="chip unp" href="../unpacked/#f/${encodeURIComponent(hit.id)}">在《解包》看專題 ›</a>`);
    });
  }, 0);
  return h;
}

/* ------------------------------------------------------------ 新秀（選秀會） */
function vRookies() {
  if (!D.feed) return loadingView();
  const rk = rookies();
  const scout = D.disc && D.disc.key;
  let h = pageHead('新秀', 'ROOKIE DRAFT', '每天推你名單外的頻道。選進來，它就會出現在你的轉播台。');
  if (rk.length) {
    h += `<div class="deck" id="deck">${rk.slice(0, 6).reverse().map((r, k, arr) => draftCard(r, arr.length - 1 - k)).join('')}</div>
      <div class="deck-acts"><button class="dk pass" data-act="draft-pass"><b>✕</b>跳過</button><button class="dk peek" data-act="draft-peek"><b>▶</b>先看看</button><button class="dk take" data-act="draft-sub"><b>✓</b>選進來</button></div>
      <div class="deck-hint">往右滑選進來、往左滑跳過${scout ? '' : '・今天先從精選名單裡挑'}</div>`;
  } else {
    h += empty('今天的新秀都看完了', '明天會再來一批。也可以直接在下面的精選名單挑。');
  }
  if (!D.feed.key) h += keyCard('全網找新頻道');
  h += `<section class="sec">${secHead('精選名單', 'ROSTER', '#pick')}<p class="note">我們先挑好的遊戲頻道，中文為主。訂閱的會排進你的轉播台。</p>${rosterGroups(true)}</section>`;
  const passed = Object.keys(VIEW.passes).filter((c) => IDX.ch[c]);
  if (passed.length) h += `<section class="sec">${secHead('跳過的', 'PASSED')}<div class="cc-list">${passed.map((c) => `<div class="cc"><a class="cc-l" href="#ch/${c}">${avatar(c, 40)}<span class="cc-n"><b>${esc(chOf(c).n)}</b></span></a><button class="sub-btn sm" data-act="unpass" data-c="${c}">放回新秀</button></div>`).join('')}</div></section>`;
  return h;
}
function draftCard(r, k) {
  const s = r.sample;
  return `<div class="draft" data-c="${r.c}" style="--k:${k}">
    <div class="dr-top"><span class="dr-no">#${String(k + 1).padStart(2, '0')}</span><span class="dr-src">${r.scout ? '全網探勘 SCOUTED' : '精選名單 ROSTER'}</span>${r.day ? `<span class="dr-day">${esc(r.day.slice(5).replace('-', '/'))}</span>` : ''}</div>
    <div class="dr-id">${avatar(r.c, 76)}<div><b class="dr-n">${esc(r.n || '')}</b>
      <div class="dr-st">${r.subs ? `<span><b>${num(r.subs)}</b>訂閱</span>` : ''}${r.vids ? `<span><b>${num(r.vids)}</b>支影片</span>` : ''}</div>
      <span class="dr-chip">${esc({ zh: '中文頻道', en: '英文頻道', ja: '日文頻道', ko: '韓文頻道' }[chOf(r.c).l] || '頻道')}${KINDS[chOf(r.c).k] && chOf(r.c).k !== 'creator' ? ' · ' + KINDS[chOf(r.c).k] : ''}</span></div></div>
    <ul class="dr-why">${(r.why || []).slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
    ${r.ds ? `<p class="dr-ds">${esc(r.ds)}</p>` : ''}
    ${s ? `<a class="dr-sample" href="#watch/${s.i}" data-v="${s.i}" data-ctx="${ctxOf('rk:' + r.c, IDX.items.filter((x) => x.c === r.c && !x.s).slice(0, 20))}">
      <span class="dr-th"><img loading="lazy" src="${thumb(s.i)}" alt=""><i class="dr-play">▶ 代表作</i>${s.d ? `<i class="vc-d">${dur(s.d)}</i>` : ''}</span>
      <span class="dr-st2"><b>${esc(s.t || '')}</b><span>${s.v ? num(s.v) + ' 次觀看 · ' : ''}${esc(ago(s.p))}</span></span></a>` : ''}
    <div class="dr-stamp"></div>
  </div>`;
}
function rosterGroups(compact) {
  // 精選名單裡最近沒片的台先不列（管線的 status.json 會列出來給維護的人換掉）
  const active = memo('activeCh', () => new Set(IDX.items.filter((it) => nowS() - it.p < 60 * 86400).map((it) => it.c)));
  const ids = Object.keys(IDX.ch).filter((c) => IDX.ch[c].seed && (active.has(c) || VIEW.subs[c]));
  const groups = [
    ['中文創作者', (ch) => ch.l === 'zh' && ch.k !== 'official' && ch.k !== 'media'],
    ['中文官方與媒體', (ch) => ch.l === 'zh' && (ch.k === 'official' || ch.k === 'media')],
    ['外語官方', (ch) => ch.l !== 'zh' && ch.k === 'official'],
    ['外語媒體與創作者', (ch) => ch.l !== 'zh' && ch.k !== 'official'],
  ];
  return groups.map(([name, f]) => {
    const cs = ids.filter((c) => f(IDX.ch[c])).sort((a, b) => (!!VIEW.subs[b] - !!VIEW.subs[a]) || (IDX.ch[a].n || '').localeCompare(IDX.ch[b].n || ''));
    if (!cs.length) return '';
    const on = cs.filter((c) => VIEW.subs[c]).length;
    return `<div class="rg"><div class="rg-h"><b>${esc(name)}</b><span>${on}/${cs.length}</span>${on < cs.length ? `<button class="mini" data-act="sub-group" data-ids="${cs.join(',')}">全部訂閱</button>` : ''}</div>
      <div class="cc-list">${cs.map((c) => chanChip(c, 'pool')).join('')}</div></div>`;
  }).join('');
}

/* ------------------------------------------------------------ 選台（第一次） */
function vPick() {
  if (!D.feed) return loadingView();
  const n = Object.keys(VIEW.subs).length;
  return backBar('轉播台') + pageHead('選台', 'PICK YOUR CHANNELS', '看到喜歡的就按訂閱。之後在「新秀」和「我的」都還能改。') + rosterGroups(false) +
    `<div class="pick-bar"><span>已訂閱 <b>${n}</b> 台</span><button class="go-btn sm" data-act="pick-done"><b>✓</b>完成</button></div>`;
}

/* ------------------------------------------------------------ 頻道 */
function vChannel(c) {
  if (!D.feed) return loadingView();
  const ch = chOf(c), vids = L.channel(c), on = !!VIEW.subs[c], blocked = !!VIEW.blocks[c];
  let h = backBar('返回');
  h += `<section class="chh">${avatar(c, 92)}<div class="chh-t"><span class="gh-kick">CHANNEL</span><h1>${esc(ch.n || '頻道')}</h1>
    <div class="chh-m">${esc(KINDS[ch.k] || '')}${ch.l ? ' · ' + (LANGS[ch.l] || ch.l) : ''}${ch.subs ? ' · ' + num(ch.subs) + ' 訂閱' : ''}${ch.h ? ' · ' + esc(ch.h) : ''}</div>
    ${ch.ds ? `<p class="chh-ds">${esc(ch.ds)}</p>` : ''}
    <div class="chh-acts"><button class="sub-btn ${on ? 'on' : ''}" data-act="${on ? 'unsub' : 'sub'}" data-c="${c}">${on ? '已訂閱' : '＋ 訂閱'}</button>
      <a class="chip" href="${chUrl(c)}" target="_blank" rel="noopener">在 YouTube 開</a>
      <button class="chip ${blocked ? 'on' : ''}" data-act="${blocked ? 'unblock' : 'block'}" data-c="${c}">${blocked ? '解除封鎖' : '封鎖'}</button></div></div></section>`;
  h += vids.length ? grid('ch:' + c, vids) : empty('這個頻道最近沒有新片', on ? '訂閱了，有新片就會出現。' : '');
  return h;
}

/* ------------------------------------------------------------ 看全部 */
const LIST_META = {
  subs: ['你的頻道', 'MY FEED', () => L.subs()], pool: ['精選頻道', 'FEATURED', () => L.pool()], all: ['全部', 'ALL', () => L.all()],
  trailer: ['新預告', 'TRAILERS', () => L.lane('trailer')], review: ['評測', 'REVIEWS', () => L.lane('review')], guide: ['攻略', 'GUIDES', () => L.lane('guide')],
  play: ['實況', 'LET\'S PLAY', () => L.lane('play')], news: ['新聞與節目', 'NEWS & SHOWS', () => L.lane('news')], deep: ['深度與幕後', 'DEEP DIVE', () => L.lane('deep')],
  dark: ['黑馬', 'DARK HORSE', () => L.dark()], later: ['稍後觀看', 'QUEUE', () => L.later()], cont: ['繼續觀看', 'CONTINUE', () => L.cont()],
  hist: ['觀戰紀錄', 'HISTORY', () => L.history()], main: ['新片', 'FEED', () => L.main()],
};
const LF = { lane: '', lang: '', limit: 48 };
function vList(kind) {
  if (!D.feed) return loadingView();
  const m = LIST_META[kind] || LIST_META.all;
  let items = m[2]();
  const showLane = ['subs', 'pool', 'all', 'main', 'later', 'hist', 'cont', 'dark'].includes(kind);
  if (showLane && LF.lane) items = items.filter((x) => x.l === LF.lane);
  if (LF.lang === 'zh') items = items.filter(zf);
  else if (LF.lang === 'x') items = items.filter((x) => !zf(x));
  const chips = (showLane ? `<div class="chips">${[['', '全部']].concat(Object.entries(LANES).map(([k, v]) => [k, v.zh])).map(([k, t]) => `<button class="${LF.lane === k ? 'on' : ''}" data-act="lf-lane" data-k="${k}">${t}</button>`).join('')}</div>` : '') +
    `<div class="chips sm">${[['', '全部語言'], ['zh', '中文'], ['x', '外語']].map(([k, t]) => `<button class="${LF.lang === k ? 'on' : ''}" data-act="lf-lang" data-k="${k}">${t}</button>`).join('')}</div>`;
  let h = backBar('轉播台') + pageHead(m[0], m[1], items.length + ' 支') + chips;
  if (kind === 'hist' && items.length) h += `<div class="right"><button class="mini" data-act="clear-hist">清除這台裝置的觀戰紀錄</button></div>`;
  h += items.length ? grid('list:' + kind, items, { limit: LF.limit }) : empty(kind === 'later' ? '還沒有稍後觀看的影片' : '這裡還沒有影片', kind === 'later' ? '在導播台按「＋ 稍後觀看」就會收進來，手機和電腦都看得到。' : '');
  return h;
}

/* ------------------------------------------------------------ 我的 */
function vMe() {
  const ws = weekStats();
  const subs = Object.keys(VIEW.subs);
  const hours = (ws.total / 3600e3);
  const adds = (VIEW.adds || []).slice(-6).reverse();
  let h = `<section class="me-card">
    <div class="me-id"><span class="me-badge">觀戰者</span><b>${esc(NAME)}</b><span class="me-sub">SPECTATOR · ${new Date().toLocaleDateString('zh-TW')}</span></div>
    <div class="me-stats">
      <div><b data-count="${Math.round(hours * 10) / 10}">${hours.toFixed(1)}</b><span>這週觀戰小時</span></div>
      <div><b data-count="${ws.chans}">${ws.chans}</b><span>看了幾個頻道</span></div>
      <div><b data-count="${subs.length}">${subs.length}</b><span>訂閱中</span></div>
    </div>
    <div class="me-dial"><svg viewBox="0 0 120 70"><path d="M10 64a50 50 0 0 1 100 0" class="dl-bg"/><path d="M10 64a50 50 0 0 1 100 0" class="dl-fg" style="--v:${ws.explore}"/></svg>
      <div class="dl-t"><b>${ws.total ? ws.explore + '%' : '--'}</b><span>破圈度</span></div>
      <p>${!ws.total ? '開始看片之後，這裡會算你這週的時間分給了多少個頻道。' : ws.explore >= 50 ? '分得很開，沒有被同幾台綁住。' : ws.explore >= 25 ? '有點集中在固定幾台，可以去新秀區逛逛。' : '這週幾乎都在看同幾台，去新秀區破個圈吧。'}${ws.fresh ? ` 其中 ${ws.fresh} 台是最近一個月才選進來的。` : ''}</p></div>
  </section>`;
  h += questPanelHtml();
  h += `<section class="sec">${secHead('我的頻道', 'MY CHANNELS', '', `<a class="sh-more" href="#pick">選台<span>›</span></a>`)}
    ${subs.length ? `<div class="cc-list">${subs.sort((a, b) => (chOf(a).n || '').localeCompare(chOf(b).n || '')).map((c) => chanChip(c)).join('')}</div>` : empty('還沒訂閱任何頻道', '先到選台挑幾個。', '<a class="btn red" href="#pick">選台</a>')}
    <div class="addch"><input id="addQ" type="text" placeholder="貼上 YouTube 頻道網址、@代號或影片網址" autocomplete="off"><button class="btn red" data-act="add-ch">加入</button></div>
    <p class="note">在電視或手機上看到不錯的頻道，把網址貼進來，下一次轉播更新（20 分鐘內）就會加入。</p>
    ${adds.length ? `<div class="adds">${adds.map((a) => `<div class="add-row ${a.st}"><span>${esc(a.n || a.q)}</span><b>${{ send: '送出中', wait: '排隊中', ok: '已加入', fail: '找不到' }[a.st] || ''}</b></div>`).join('')}</div>` : ''}
  </section>`;
  h += row('me-later', L.later().filter((x) => !x.ghost), { zh: '稍後觀看', en: 'QUEUE', more: '#list/later' });
  h += row('me-cont', L.cont(), { zh: '繼續觀看', en: 'CONTINUE', more: '#list/cont' });
  h += row('me-hist', L.history().filter((x) => !x.ghost), { zh: '觀戰紀錄', en: 'HISTORY', more: '#list/hist' });
  const blocked = Object.keys(VIEW.blocks);
  if (blocked.length) h += `<section class="sec">${secHead('封鎖的頻道', 'BLOCKED')}<div class="cc-list">${blocked.map((c) => `<div class="cc"><a class="cc-l" href="#ch/${c}">${avatar(c, 40)}<span class="cc-n"><b>${esc(chOf(c).n || c)}</b></span></a><button class="sub-btn sm" data-act="unblock" data-c="${c}">解除</button></div>`).join('')}</div></section>`;
  h += `<section class="sec">${secHead('設定', 'SETTINGS')}${settingsHtml()}</section>`;
  h += `<section class="sec">${secHead('轉播狀態', 'SYSTEM')}${systemHtml()}</section>`;
  return h;
}
function tg(k, label, sub) {
  return `<label class="tg"><span><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</span><input type="checkbox" data-set="${k}" ${SET[k] ? 'checked' : ''}><i></i></label>`;
}
function settingsHtml() {
  return `<div class="set">
    ${tg('bgm', '背景音樂', '賽前配樂；開始播影片會自動停')}
    ${tg('sfx', '音效', '轉場、倒數、訂閱、選秀的聲音')}
    <label class="rg2"><span><b>音量</b></span><input type="range" min="0" max="1" step="0.05" value="${SET.vol}" data-set="vol"></label>
    <div class="seg"><b>開場倒數</b><div>${[['daily', '每天第一次'], ['every', '每次'], ['off', '關閉']].map(([k, t]) => `<button class="${SET.intro === k ? 'on' : ''}" data-act="set-intro" data-k="${k}">${t}</button>`).join('')}</div></div>
    <div class="seg"><b>特效</b><div>${[['full', '全開'], ['lite', '精簡（省電）']].map(([k, t]) => `<button class="${SET.fx === k ? 'on' : ''}" data-act="set-fx" data-k="${k}">${t}</button>`).join('')}</div></div>
    ${tg('zhFirst', '中文優先', '中文片排前面；同一支預告有中文版就收掉外文版')}
    ${tg('zhSubs', '外語片自動開中文字幕', '影片有中文字幕時自動打開')}
    ${tg('auto', '連播（AUTO）', '播完倒數 5 秒接下一支')}
    ${tg('shorts', '顯示 Shorts 短片', '預設收起來')}
    ${tg('gacha', '顯示抽卡手遊', '原神、崩壞這類預設收起來')}
    ${tg('filtered', '顯示被濾掉的影片', '搬運、兌換碼、非遊戲類')}
    <div class="seg"><b>點影片時</b><div>${[['app', '在導播台播'], ['yt', '交給 YouTube App']].map(([k, t]) => `<button class="${SET.play === k ? 'on' : ''}" data-act="set-play" data-k="${k}">${t}</button>`).join('')}</div></div>
    <p class="note">${IS_IOS ? 'iPhone 的瀏覽器會擋 YouTube 的登入狀態，導播台播的影片可能會有廣告；想用 Premium 免廣告，就選「交給 YouTube App」。' : '用登入 Premium 的瀏覽器打開，導播台播的影片就不會有廣告。'}</p>
  </div>`;
}
function systemHtml() {
  const st = D.status || {};
  const age = D.feed && D.feed.at ? Math.round((Date.now() - Date.parse(D.feed.at)) / 60000) : null;
  const ss = syncState();
  return `<div class="sys">
    <div class="sys-r"><i class="lamp ${D.feed ? (age < 70 ? 'ok' : 'wait') : 'bad'}"></i><b>轉播資料</b><span>${D.feed ? (age < 2 ? '剛剛更新' : age + ' 分鐘前更新') + ' · ' + IDX.items.length + ' 支' : '還沒收到'}</span></div>
    <div class="sys-r"><i class="lamp ${st.key ? 'ok' : 'wait'}"></i><b>YouTube 金鑰</b><span>${st.key ? '已接上：直播雷達、片長、全網新秀都開著' : '還沒接：只用官方 RSS（新片、觀看數）'}</span>${st.key ? '' : '<a class="mini" href="#key">設定</a>'}</div>
    <div class="sys-r"><i class="lamp ${ss}"></i><b>訂閱同步</b><span>${ss === 'ok' ? '手機、電腦都同步了' : ss === 'wait' ? SYNC.out.length + ' 個動作等轉播管線收件（20 分鐘內）' : '送不出去，連上網路後會自動重送'}</span></div>
    <div class="sys-r"><i class="lamp ok"></i><b>版本</b><span>觀戰 ${VERSION}${STANDALONE ? ' · 主畫面 App' : ''}</span><button class="mini" data-act="reload">重新整理</button></div>
  </div>`;
}

/* ------------------------------------------------------------ 金鑰設定教學 */
function vKey() {
  const st = D.status || {};
  return backBar('返回') + pageHead('接上 YouTube 金鑰', 'API KEY', st.key ? '<b class="green">已經接上了</b>：直播雷達、片長、中文標題、全網新秀都在運作。' : '免費、只要設定一次。接上之後多出：直播中／即將直播、片長、官方的中文標題、每天全網找新頻道。') +
    `<ol class="steps">
      <li><b>開一個 Google Cloud 專案</b><span>用你的 Google 帳號打開下面的連結，專案名稱隨便填（例如 spectate），按「建立」。</span><a class="btn" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">建立專案 ›</a></li>
      <li><b>啟用 YouTube Data API v3</b><span>確認上方選的是剛建的專案，按「啟用」。</span><a class="btn" href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener">啟用 API ›</a></li>
      <li><b>建立 API 金鑰</b><span>按「建立憑證」→「API 金鑰」，複製那一串字。建議再按「編輯 API 金鑰」→「API 限制」選「限制金鑰」，只勾 YouTube Data API v3。</span><a class="btn" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">憑證頁 ›</a></li>
      <li><b>存進 GitHub</b><span>打開下面的連結（要登入 GitHub），Name 填 <code>YT_KEY</code>，Secret 貼上金鑰，按「Add secret」。金鑰只存在 GitHub，不會出現在網頁或程式裡。</span><a class="btn red" href="https://github.com/PZWei0105/PZ-Games/settings/secrets/actions/new" target="_blank" rel="noopener">新增 YT_KEY ›</a></li>
      <li><b>等下一次轉播更新</b><span>20 分鐘內，「我的 → 轉播狀態」的金鑰燈會變綠。每天免費 1 萬點額度，觀戰一天大約用 2,000～3,000 點，不會收費。</span></li>
    </ol>`;
}

/* ------------------------------------------------------------ 搜尋 */
function openSearch() {
  const sh = $('#sheet');
  sh.hidden = false;
  sh.innerHTML = `<div class="sheet-in search"><div class="sr-bar"><input id="srQ" type="search" placeholder="搜尋遊戲、頻道、影片標題" autocomplete="off"><button class="ico-btn" data-act="sheet-close" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div><div id="srR" class="sr-r">${searchTips()}</div></div>`;
  requestAnimationFrame(() => sh.classList.add('in'));
  const q = $('#srQ');
  q.focus();
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => renderSearch(q.value), 160); });
  Snd.play('select');
}
function searchTips() {
  const hot = gamesList().slice(0, 8);
  return hot.length ? `<div class="sr-tips"><b>熱門</b>${hot.map((g) => `<a class="chip" href="#g/${encodeURIComponent(g.k)}" data-act="sheet-close-nav">${esc(gameName(g))}</a>`).join('')}</div>` : '';
}
function renderSearch(q) {
  const r = search(q), box = $('#srR');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = searchTips(); return; }
  let h = '';
  if (r.games.length) h += `<div class="sr-sec"><b>遊戲</b><div class="sr-games">${r.games.map((g) => `<a class="sr-g" href="#g/${encodeURIComponent(g.k)}" data-act="sheet-close-nav">${g.img || g.cover ? `<img src="${esc(g.img || thumb(g.cover))}" ${g.img && g.cover ? `data-fb="${thumb(g.cover)}"` : ''} alt="">` : ''}<span>${esc(gameName(g))}</span></a>`).join('')}</div></div>`;
  if (r.chans.length) h += `<div class="sr-sec"><b>頻道</b><div class="cc-list">${r.chans.map((c) => chanChip(c.c)).join('')}</div></div>`;
  if (r.vids.length) h += `<div class="sr-sec"><b>影片 ${r.vids.length}</b>${grid('search', r.vids, { limit: 30 })}</div>`;
  box.innerHTML = h || empty('找不到「' + esc(q) + '」', '只搜得到精選名單和你訂閱的頻道最近 30 天的片。');
}
function closeSheet() {
  const sh = $('#sheet');
  sh.classList.remove('in');
  setTimeout(() => { sh.hidden = true; sh.innerHTML = ''; }, 220);
}

/* ------------------------------------------------------------ 跑馬燈 */
function renderTicker() {
  const el = $('#tickerIn');
  if (!el || !D.feed) return;
  const live = L.live().length, newN = L.newCount(), rk = rookies().length, top = gamesList()[0];
  const parts = [];
  parts.push(`<span class="tk-lbl">${esc(greet())}，${esc(NAME)}</span>`);
  if (live) parts.push(`<span class="tk-red">● ON AIR ${live} 場</span>`);
  parts.push(`<span>新片 <b>${newN}</b>${subsOn() ? '（你的頻道）' : ''}</span>`);
  if (top) parts.push(`<span>本週最熱《${esc(gameName(top))}》${top.chs} 台在聊</span>`);
  if (rk) parts.push(`<span class="tk-lime">新秀 ${rk} 位等你選</span>`);
  const dark = L.dark()[0];
  if (dark) parts.push(`<span>黑馬：${esc(chOf(dark.c).n)}「${esc(titleOf(dark).slice(0, 26))}」×${dark.dh}</span>`);
  const age = D.feed.at ? Math.round((Date.now() - Date.parse(D.feed.at)) / 60000) : 0;
  parts.push(`<span class="tk-dim">轉播資料 ${age < 2 ? '剛剛' : age + ' 分鐘前'}更新</span>`);
  const one = parts.join('<i class="tk-sep">◆</i>');
  el.innerHTML = `<div class="tk-run">${one}<i class="tk-sep">◆</i>${one}<i class="tk-sep">◆</i></div>`;
  const run = $('.tk-run', el);
  requestAnimationFrame(() => { const w = run.scrollWidth / 2; run.style.setProperty('--tk', (w / 38).toFixed(1) + 's'); });
  $('#onair').hidden = !live;
  $('#onairN').textContent = live;
  $('#tabLiveDot').hidden = !live;
  $('#tabRookDot').hidden = !rk;
}
