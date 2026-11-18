'use strict';
/* 補番 BINGE — 畫面：放送（首頁）、AI 動畫、番劇、片單、作品頁、頻道頁、看全部、搜尋 */

const CTX = new Map();      // 每一排的影片清單（開放映機時，「接下來」就照這排）
function ctxOf(name, items) { CTX.set(name, items.map((x) => x.i)); return name; }

/* ------------------------------------------------------------ 元件 */
function avatar(c, size = 28) {
  const ch = chOf(c);
  const s = 'width:' + size + 'px;height:' + size + 'px';
  if (ch.a) return `<span class="av" style="${s}"><img loading="lazy" src="${esc(ch.a)}" alt="" referrerpolicy="no-referrer"></span>`;
  const n = (ch.n || '?').trim().charAt(0).toUpperCase();
  return `<span class="av av-t" style="${s};--h:${hash32(c || n) % 360};font-size:${Math.round(size * 0.46)}px">${esc(n)}</span>`;
}
function kchip(kind) { const k = KINDS[kind] || KINDS.jp; return `<i class="kc" style="--kc:${k.c}">${esc(k.zh)}</i>`; }
function secHead(zh, en, more, opt = {}) {
  return `<div class="sh" style="--sc:${opt.c || 'var(--sun)'}"><h2><b class="d">${esc(zh)}</b><i>${esc(en)}</i></h2>${opt.note ? `<span class="sh-note">${opt.note}</span>` : ''}${more ? `<a class="sh-more" href="${more}">全部<span>›</span></a>` : ''}</div>`;
}
function progOf(v) { const h = histOf(v.i); return h && !h[3] && h[2] ? clamp(h[1] / h[2], 0.02, 1) : 0; }
function isNew(v) { return v.p && v.p * 1000 > (store.get('visit', 0) || 0) && nowS() - v.p < 4 * 86400 && !histOf(v.i); }

/* 影片卡 */
function vcard(v, ctx, opt = {}) {
  const k = KINDS[kindOf(v)] || KINDS.jp, h = histOf(v.i), pg = progOf(v), ch = chOf(v.c);
  const ep = epLabel(v);
  const meta = [];
  if (v.live) meta.push(`<b class="red">${v.cv ? num(v.cv) + ' 人在看' : '直播中'}</b>`);
  else if (v.up) meta.push('<b class="gold">即將播出</b>');
  else if (v.p) meta.push(esc(ago(v.p)));
  if (v.v && !v.live) meta.push(num(v.v));
  return `<a class="vc${opt.big ? ' big' : ''}${h && h[3] ? ' seen' : ''}" href="#watch/${v.i}" data-v="${v.i}" data-ctx="${ctx || ''}" style="--kc:${k.c}">
    <span class="vc-th"><img loading="lazy" src="${thumb(v.i)}" alt="">
      <i class="vc-k">${v.live ? '<b class="dotlive"></b>LIVE' : esc(opt.kind === false ? (FMTS[v.f] || FMTS.e).zh : k.short)}</i>
      ${v.ai && kindOf(v) !== 'ai' ? '<i class="vc-ai">AI</i>' : ''}
      ${v.d && !v.live ? `<i class="vc-d">${clock(v.d)}</i>` : ''}
      ${ep && !opt.noep ? `<i class="vc-ep">${esc(ep)}</i>` : ''}
      ${h && h[3] ? '<i class="vc-done d">完食</i>' : isNew(v) ? '<i class="vc-new d">NEW!</i>' : ''}
      ${v.ne ? '<i class="vc-ne">到 YouTube 看 ↗</i>' : ''}
      ${pg ? `<i class="vc-pg" style="--p:${(pg * 100).toFixed(0)}%"></i>` : ''}
    </span>
    <span class="vc-t">${vtitle(v)}</span>
    <span class="vc-m">${opt.noch ? '' : avatar(v.c, 18) + `<b>${esc(ch.n || '')}</b>`}${v.ext ? '<em class="vc-x">名單外</em>' : ''}${meta.length ? '<span>' + meta.join(' · ') + '</span>' : ''}</span>
  </a>`;
}
/* 標題：作品的單集 → 作品名＋這一集；長片合輯 → 《》裡的名字放大 */
function vtitle(v) {
  const s = showOf(v);
  if (s) return `<b>${esc(s.n)}</b>${v.t && v.t !== s.n ? `<small>${esc(v.t)}</small>` : ''}`;
  const tp = titleParts(v.t);
  if (tp.name) return `<b>${esc(tp.name)}</b>${tp.rest ? `<small>${esc(tp.rest)}</small>` : ''}`;
  return esc(v.t);
}
/* 長片合輯卡：大大的片長＋集數範圍 */
function mcard(v, ctx, opt = {}) {
  const k = KINDS[kindOf(v)] || KINDS.jp, h = histOf(v.i), pg = progOf(v), ch = chOf(v.c);
  const ap = h && !h[3] ? approxEp(v, h[1]) : null;
  const gs = genreOf(v.t).slice(0, 2);
  return `<a class="mc${opt.wide ? ' wide' : ''}${h && h[3] ? ' seen' : ''}" href="#watch/${v.i}" data-v="${v.i}" data-ctx="${ctx || ''}" style="--kc:${k.c}">
    <span class="mc-th"><img loading="lazy" src="${thumb(v.i, opt.wide ? 'hqdefault' : 'mqdefault')}" alt="">
      <i class="mc-len d"><b>${hm(v.d)}</b></i>
      ${v.r ? `<i class="mc-rg">${v.r[0]}–${v.r[1]} 集</i>` : ''}
      ${h && h[3] ? '<i class="vc-done d">完食</i>' : isNew(v) ? '<i class="vc-new d">NEW!</i>' : ''}
      ${v.ne ? '<i class="vc-ne">到 YouTube 看 ↗</i>' : ''}
      ${pg ? `<i class="vc-pg" style="--p:${(pg * 100).toFixed(0)}%"></i>` : ''}
    </span>
    <span class="mc-t">${vtitle(v)}</span>
    <span class="mc-m">${avatar(v.c, 18)}<b>${esc(ch.n || '')}</b>${v.ext ? '<em class="vc-x">名單外</em>' : ''}${ap ? `<em>${esc(ap.label)}</em>` : pg ? `<em>剩 ${span((1 - pg) * v.d)}</em>` : gs.length ? gs.map((g) => `<u>${esc(g)}</u>`).join('') : `<span>${v.v ? num(v.v) + ' 次' : ''}</span>`}</span>
  </a>`;
}
/* 作品卡 */
function scard(s, opt = {}) {
  const k = KINDS[s.kind] || KINDS.jp;
  const cover = IDX.vids[s.cv] || s.eps[0];
  const pr = showProgress(s);
  const fol = following(s.id);
  const news = SL.news().find((x) => x.s === s);
  const unit = s.kind === 'jp' ? '話' : '集';
  return `<a class="sc${pr.done ? ' seen' : ''}" href="#show/${encodeURIComponent(s.id)}" style="--kc:${k.c}">
    <span class="sc-th"><img loading="lazy" src="${thumb(cover.i, 'mqdefault')}" alt="">
      <i class="sc-n d">${s.n_eps}<small>${unit}</small></i>
      ${fol ? '<i class="sc-fol">★</i>' : ''}
      ${news ? `<i class="vc-new d">+${news.n}</i>` : pr.done ? '<i class="vc-done d">完食</i>' : ''}
      ${pr.watched ? `<i class="sc-pg" style="--p:${(pr.watched / s.n_eps * 100).toFixed(0)}%"></i>` : ''}
      <b class="sc-name">${esc(s.n)}</b>
    </span>
    <span class="sc-m">${opt.noch ? '' : `<b>${esc(chOf(s.c).n)}</b>`}<span>${pr.watched ? '看到第 ' + (pr.last + 1) + ' ' + unit : s.dur > 3600 ? span(s.dur) : s.t ? ago(s.t) : ''}</span></span>
  </a>`;
}
function row(name, items, opt = {}, fn = vcard) {
  if (!items.length) return '';
  const ctx = ctxOf(name, items);
  const shown = items.slice(0, opt.max || 16);
  return `<section class="sec ${opt.cls || ''}">${secHead(opt.zh, opt.en, opt.more, opt)}
    <div class="row${opt.big ? ' big' : ''}">${shown.map((v) => fn(v, ctx, opt)).join('')}${opt.more && items.length > shown.length ? `<a class="more-card" href="${opt.more}"><b class="d">${items.length}</b><span>看全部</span></a>` : ''}</div></section>`;
}
function showRow(items, opt = {}) {
  if (!items.length) return '';
  const shown = items.slice(0, opt.max || 14);
  return `<section class="sec">${secHead(opt.zh, opt.en, opt.more, opt)}<div class="row">${shown.map((s) => scard(s, opt)).join('')}${opt.more && items.length > shown.length ? `<a class="more-card" href="${opt.more}"><b class="d">${items.length}</b><span>看全部</span></a>` : ''}</div></section>`;
}
function grid(name, items, fn = vcard, opt = {}) {
  const ctx = ctxOf(name, items);
  const n = opt.limit || LF.limit;
  return `<div class="grid ${opt.cls || ''}">${items.slice(0, n).map((v) => fn(v, ctx, opt)).join('')}</div>${items.length > n ? `<button class="btn wide" data-act="more" data-n="${n + 48}">再載入 ${Math.min(48, items.length - n)} 支</button>` : ''}`;
}
function empty(msg, sub = '', act = '') {
  return `<div class="empty"><div class="empty-ic"><i class="d">?</i></div><b>${msg}</b>${sub ? `<p>${sub}</p>` : ''}${act}</div>`;
}
function pageHead(zh, en, sub = '', right = '', c = 'var(--sakura)') {
  return `<header class="ph" style="--sc:${c}"><div class="ph-t"><h1><b class="d">${esc(zh)}</b><i>${esc(en)}</i></h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</header>`;
}
function backBar(label) { return `<div class="backbar"><button class="back" data-act="back"><span>‹</span>${esc(label || '返回')}</button></div>`; }
function chips(items, cur, act) {
  return `<div class="chips">${items.map(([k, t]) => `<button class="chip ${cur === k ? 'on' : ''}" data-act="${act}" data-k="${esc(k)}">${esc(t)}</button>`).join('')}</div>`;
}
function statusLine() {
  if (!D.cat) return '';
  const age = D.cat.at ? Math.round((Date.now() - Date.parse(D.cat.at)) / 60000) : null;
  return `<div class="foot"><span class="d">補番 BINGE</span> 片庫 ${age == null ? '' : age < 2 ? '剛剛' : age < 120 ? age + ' 分鐘前' : Math.round(age / 60) + ' 小時前'}更新 · ${IDX.chs.length} 個頻道 · ${IDX.shows.length} 部作品 · ${IDX.vids.length} 支影片${!D.cat.key ? ' · <a href="#key">接上金鑰更完整</a>' : ''}</div>`;
}
function loadingView() {
  if (D.err) return empty('片庫還沒送到', esc(D.err) + '<br>第一次打開要等資料管線跑完（最多 30 分鐘）；確定有網路的話，稍後再按重新整理。', '<button class="btn yel" data-act="reload">重新整理</button>');
  return `<div class="loading"><div class="ld-film"><i></i><i></i><i></i><i></i></div><b class="d">放映室準備中…</b></div>`;
}

/* ------------------------------------------------------------ 放送（首頁） */
let heroTimer = 0, heroIdx = 0;
function heroPicks() {
  return memo('hero', () => {
    const out = [], seen = new Set();
    const add = (v, why) => { if (!v || seen.has(v.i) || out.length >= 6) return; const s = showOf(v); if (s && seen.has('s' + s.k)) return; seen.add(v.i); if (s) seen.add('s' + s.k); out.push({ v, why }); };
    const n = SL.news()[0]; if (n) add(n.v, '追番更新');
    const live = L.live().find((v) => v.live); if (live) add(live, '直播馬拉松');
    L.comps('ai').slice(0, 2).forEach((v) => add(v, '一口氣看完'));
    add(L.eps('jp')[0], '日本動畫新集');
    add(L.eps('cn')[0] || L.comps('ani')[0], '國漫');
    add(L.movies()[0], '劇場版');
    L.comps('').slice(2, 6).forEach((v) => add(v, '熱門合輯'));
    return out;
  });
}
function vHome() {
  if (!D.cat) return loadingView();
  let h = heroHtml(heroPicks());
  const cont = L.cont();
  if (cont.length) h += row('cont', cont, { zh: '繼續補番', en: 'CONTINUE', more: '#list/cont', c: 'var(--sora)', note: '從上次停的地方接著看' }, contCard);
  const news = SL.news();
  if (news.length) h += newsRow(news);
  const live = L.live();
  if (live.length) h += row('live', live, { zh: '直播馬拉松', en: 'ON AIR', more: '#list/live', c: 'var(--fire)', note: '官方一口氣連播' });
  const xlive = L.xlive();
  if (xlive.length) h += row('xlive', xlive, { zh: '全天放送', en: '24H ON AIR', more: '#list/xlive', c: 'var(--fire)', note: '全網正在連播的動畫' });
  h += row('comps', L.comps('ai'), { zh: '一口氣看完', en: 'MARATHON', more: '#list/comps:ai', c: 'var(--k-ai)', note: 'AI 漫劇・沙雕・動態漫' }, mcard);
  h += gachaBlock();
  h += row('jp', L.eps('jp'), { zh: '日本動畫・新集', en: 'NEW EPISODES', more: '#list/eps:jp', c: 'var(--k-jp)' });
  h += row('cn', L.eps('cn'), { zh: '國漫・新集', en: 'DONGHUA', more: '#list/eps:cn', c: 'var(--k-cn)' });
  h += row('anicomp', L.comps('ani'), { zh: '番劇合輯', en: 'BINGE PACK', more: '#list/comps:ani', c: 'var(--k-cn)', note: '官方整季、全系列合集' }, mcard);
  h += row('xcomp', L.xcomps(), { zh: '全網熱補', en: 'FOUND ONLINE', more: '#list/xcomp', c: 'var(--sora)', note: '名單外最近很多人補的長合輯' }, mcard);
  h += showRow(SL.all('ani', '').slice(0, 20), { zh: '熱門作品', en: 'TOP SHOWS', more: '#ani', c: 'var(--k-jp)' });
  h += row('movies', L.movies(), { zh: '劇場版・動畫電影', en: 'MOVIES', more: '#list/movies', c: 'var(--sora)' });
  h += row('toon', L.kind('toon'), { zh: '卡通', en: 'CARTOON', more: '#list/kind:toon', c: 'var(--k-toon)' });
  const later = L.later();
  if (later.length) h += row('later', later, { zh: '片單', en: 'MY LIST', more: '#list/later', c: 'var(--leaf)' });
  h += statusLine();
  return h;
}
function contCard(v, ctx) {
  const h = histOf(v.i), k = KINDS[kindOf(v)] || KINDS.jp, s = showOf(v);
  const ap = approxEp(v, h[1]);
  const pg = progOf(v);
  return `<a class="cc" href="#watch/${v.i}" data-v="${v.i}" data-ctx="${ctx}" style="--kc:${k.c}">
    <span class="cc-th"><img loading="lazy" src="${thumb(v.i)}" alt=""><i class="cc-play d">▶</i><i class="vc-pg" style="--p:${(pg * 100).toFixed(0)}%"></i>${REMOTE[v.i] ? '<i class="cc-dev">另一台</i>' : ''}</span>
    <span class="cc-t">${esc(s ? s.n : v.t)}</span>
    <span class="cc-m"><b>${clock(h[1])}</b>${ap ? ' · ' + esc(ap.label) : epLabel(v) ? ' · ' + esc(epLabel(v)) : ''}<span>剩 ${span(Math.max(0, (h[2] || v.d) - h[1]))}</span></span>
  </a>`;
}
function newsRow(news) {
  const items = news.map((x) => x.v);
  const ctx = ctxOf('news', items);
  return `<section class="sec">${secHead('追番更新', 'NEW FOR YOU', '#mine', { c: 'var(--sakura)', note: '你追的作品出新集了' })}<div class="row">${news.slice(0, 14).map((x) => {
    const k = KINDS[x.s.kind] || KINDS.jp;
    return `<a class="vc nw" href="#watch/${x.v.i}" data-v="${x.v.i}" data-ctx="${ctx}" style="--kc:${k.c}"><span class="vc-th"><img loading="lazy" src="${thumb(x.v.i)}" alt=""><i class="vc-new d">+${x.n}</i>${epLabel(x.v) ? `<i class="vc-ep">${esc(epLabel(x.v))}</i>` : ''}${x.v.d ? `<i class="vc-d">${clock(x.v.d)}</i>` : ''}</span>
      <span class="vc-t">${esc(x.s.n)}</span><span class="vc-m"><b>${esc(x.v.t)}</b></span></a>`;
  }).join('')}</div></section>`;
}
function heroHtml(items) {
  if (!items.length) return '';
  const ctx = ctxOf('hero', items.map((x) => x.v));
  return `<section class="hero" id="hero" data-n="${items.length}">
    <div class="hero-slides">${items.map(({ v, why }, i) => {
      const k = KINDS[kindOf(v)] || KINDS.jp, s = showOf(v), ch = chOf(v.c);
      return `<a class="hs${i === 0 ? ' on' : ''}" href="#watch/${v.i}" data-v="${v.i}" data-ctx="${ctx}" style="--kc:${k.c}">
        <span class="hs-frame"><img class="hs-img" ${i === 0 ? '' : 'loading="lazy"'} src="${thumb(v.i, 'maxresdefault')}" data-fb="${thumb(v.i, 'hqdefault')}" alt=""><i class="hs-lines"></i></span>
        <span class="hs-card">
          <span class="hs-kick"><i class="kc" style="--kc:${k.c}">${esc(k.zh)}</i><em class="d">${esc(why)}</em><u class="d">${String(i + 1).padStart(2, '0')}</u></span>
          <span class="hs-title">${esc(s ? s.n : titleParts(v.t).name || v.t)}</span>
          <span class="hs-sub">${s ? esc(epLabel(v) || v.t) + ' · ' : titleParts(v.t).name && titleParts(v.t).rest ? esc(titleParts(v.t).rest) + ' · ' : ''}${v.live ? '直播中' : v.d ? span(v.d) : ''}${v.r ? ' · ' + v.r[0] + '–' + v.r[1] + ' 集' : ''} · ${esc(ch.n || '')}</span>
        </span></a>`;
    }).join('')}</div>
    <div class="hero-ctl">
      <button class="go-btn d" data-act="hero-play"><b>▶</b>開播</button>
      <button class="ic-sq" data-act="hero-later" aria-label="加進片單">＋</button>
      <div class="hero-dots">${items.map((_, i) => `<i class="${i === 0 ? 'on' : ''}" data-act="hero-go" data-i="${i}"><b></b></i>`).join('')}</div>
    </div>
  </section>`;
}
function heroStart() {
  clearInterval(heroTimer);
  heroIdx = 0;
  const hero = $('#hero');
  if (!hero || +hero.dataset.n < 2) return;
  heroTimer = setInterval(() => { if (!document.hidden && !Player.isOpen() && !Swipe.isOpen() && (ROUTE === 'home')) heroGo(heroIdx + 1, true); }, 8000);
  let sx = 0, sy = 0, moved = false;
  hero.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false; }, { passive: true });
  hero.addEventListener('touchmove', (e) => { const dx = e.touches[0].clientX - sx; if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.touches[0].clientY - sy)) moved = true; }, { passive: true });
  hero.addEventListener('touchend', (e) => { if (!moved) return; heroGo(heroIdx + (e.changedTouches[0].clientX - sx < 0 ? 1 : -1)); clearInterval(heroTimer); });
  hero.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}
function heroGo(i, auto) {
  const hero = $('#hero');
  if (!hero) { clearInterval(heroTimer); return; }
  const slides = $$('.hs', hero), dots = $$('.hero-dots i', hero), n = slides.length;
  i = ((i % n) + n) % n;
  if (i === heroIdx) return;
  slides[heroIdx].classList.remove('on'); slides[heroIdx].classList.add('off');
  const old = slides[heroIdx];
  setTimeout(() => old.classList.remove('off'), 650);
  slides[i].classList.add('on');
  dots.forEach((d, k) => d.classList.toggle('on', k === i));
  heroIdx = i;
  Snd.play(auto ? 'tick' : 'swipe');
}
const heroCur = () => { const s = $$('#hero .hs')[heroIdx]; return s ? s.dataset.v : null; };

/* 抽一部：扭蛋機 */
let GACHA = null;
function gachaBlock(tab) {
  return `<section class="sec gacha-sec">${secHead('抽一部', 'GACHA', '', { c: 'var(--sun)', note: '不知道看什麼？交給扭蛋' })}
    <div class="gacha" id="gacha" data-tab="${tab || ''}">
      <div class="g-machine" data-act="gacha">
        <i class="gm-dome"><i class="cap c1"></i><i class="cap c2"></i><i class="cap c3"></i><i class="cap c4"></i><i class="cap c5"></i><i class="cap c6"></i></i>
        <i class="gm-body"><i class="gm-crank"><i></i></i><i class="gm-slot"></i><b class="d">補番</b></i>
        <i class="gm-ball"></i>
      </div>
      <div class="g-out" id="gachaOut">${GACHA ? gachaResult(GACHA) : `<div class="g-hint"><b class="d">試試手氣！</b><span>從片庫裡夠好看的作品和合輯抽一部。</span><button class="btn yel d" data-act="gacha">轉一下</button></div>`}</div>
    </div></section>`;
}
function gachaResult(g) {
  if (g.s) {
    const s = g.s, pr = showProgress(s), k = KINDS[s.kind] || KINDS.jp;
    return `<div class="g-res" style="--kc:${k.c}"><span class="g-tag d">抽中！</span><a class="g-card" href="#show/${encodeURIComponent(s.id)}"><img src="${thumb((IDX.vids[s.cv] || s.eps[0]).i, 'hqdefault')}" alt=""><b>${esc(s.n)}</b><span>${kchip(s.kind)} 共 ${s.n_eps} ${s.kind === 'jp' ? '話' : '集'}${s.dur > 3600 ? ' · ' + span(s.dur) : ''}</span></a>
      <div class="g-acts"><button class="btn yel" data-act="gacha-play" data-v="${(pr.next || s.eps[0]).i}">▶ 開播</button><button class="btn" data-act="gacha">再抽一次</button></div></div>`;
  }
  const v = g.v, k = KINDS[kindOf(v)] || KINDS.jp;
  return `<div class="g-res" style="--kc:${k.c}"><span class="g-tag d">抽中！</span><a class="g-card" href="#watch/${v.i}" data-v="${v.i}"><img src="${thumb(v.i, 'hqdefault')}" alt=""><b>${esc(v.t)}</b><span>${kchip(kindOf(v))} ${span(v.d)}${v.r ? ' · ' + v.r[0] + '–' + v.r[1] + ' 集' : ''}</span></a>
    <div class="g-acts"><button class="btn yel" data-act="gacha-play" data-v="${v.i}">▶ 開播</button><button class="btn" data-act="gacha">再抽一次</button></div></div>`;
}
function spinGacha(el) {
  const box = el.closest('.gacha');
  if (!box || box.classList.contains('spin')) return;
  const tab = box.dataset.tab;
  const pool = gachaPool();
  const comps = pool.comps.filter((v) => !tab || inTab(v, tab)), shows = pool.shows.filter((s) => !tab || (KINDS[s.kind] || KINDS.jp).tab === tab);
  const all = comps.map((v) => ({ v })).concat(shows.map((s) => ({ s })));
  if (!all.length) { toast('片庫還沒有東西可以抽'); return; }
  const pick = all[Math.floor(Math.random() * Math.min(all.length, 160))];
  box.classList.add('spin');
  Snd.play('gacha');
  hap();
  setTimeout(() => {
    GACHA = pick;
    box.classList.remove('spin');
    box.classList.add('pop');
    $('.g-out', box).innerHTML = gachaResult(pick);
    Snd.play('pop');
    const r = $('.g-res', box).getBoundingClientRect();
    Fx.sparkle(r.left + r.width / 2, r.top + 40);
    setTimeout(() => box.classList.remove('pop'), 700);
  }, 820);
}

/* ------------------------------------------------------------ AI 動畫 */
let AIF = 'all';
function aiList(fn) { return fn().filter((v) => AIF === 'all' || kindOf(v) === AIF); }
function vAI() {
  if (!D.cat) return loadingView();
  const subs = [['all', '全部'], ['ai', 'AI 漫劇'], ['sd', '沙雕動畫'], ['mc', '動態漫畫']];
  let h = pageHead('AI 動畫', 'AI ANIMATION', 'AI 漫劇、沙雕動畫、動態漫畫：最常見的是好幾集剪成一支的長片合輯，一口氣補完。', '', 'var(--k-ai)');
  h += chips(subs, AIF, 'aif');
  const shorts = L.shorts().filter((v) => AIF === 'all' || kindOf(v) === AIF);
  if (shorts.length) {
    const ctx = ctxOf('shorts', shorts);
    h += `<section class="sec"><button class="swipe-entry" data-act="swipe-open" data-ctx="${ctx}">
      <span class="se-fan">${shorts.slice(0, 3).map((v, i) => `<i class="f${i}"><img src="${thumb(v.i, 'hqdefault')}" alt=""></i>`).join('')}</span>
      <span class="se-t"><b class="d">直式短劇</b><span>一滑一集，像紅果那樣刷下去。${shorts.length} 支</span><em class="d">▶ 開始滑</em></span></button></section>`;
  }
  const comps = aiList(() => L.comps('ai'));
  h += `<section class="sec">${secHead('一口氣看完', 'MARATHON', '#list/comps:ai', { c: 'var(--k-ai)', note: comps.length + ' 支長片合輯' })}
    <div class="grid mgrid">${comps.slice(0, 8).map((v, i) => mcard(v, ctxOf('aicomps', comps), { wide: i < 2 })).join('')}</div></section>`;
  h += `<section class="sec">${secHead('想看什麼題材', 'GENRE', '', { c: 'var(--sun)' })}<div class="genres">${GENRES.map(([g]) => {
    const n = L.genre(g, 'ai').filter((v) => AIF === 'all' || kindOf(v) === AIF).length;
    return n ? `<a class="genre" href="#list/genre:${encodeURIComponent(g)}"><b class="d">${esc(g)}</b><span>${n}</span></a>` : '';
  }).join('')}</div></section>`;
  h += `<section class="sec">${secHead('片長', 'LENGTH', '', { c: 'var(--sora)' })}<div class="lens">${[['1', '1 小時以下', 'var(--leaf)'], ['3', '1～3 小時', 'var(--sora)'], ['8', '3～8 小時', 'var(--violet)'], ['99', '8 小時以上', 'var(--fire)']].map(([k, t, c]) => {
    const n = lenList(k).length;
    return n ? `<a class="len" href="#list/len:${k}" style="--lc:${c}"><b class="d">${esc(t)}</b><span>${n} 支</span></a>` : '';
  }).join('')}</div></section>`;
  h += row('aifresh', aiList(() => L.fresh('ai')), { zh: '新上架', en: 'JUST IN', more: '#list/fresh:ai', c: 'var(--leaf)' });
  h += gachaBlock('ai');
  h += showRow(SL.all('ai', AIF === 'all' ? '' : AIF), { zh: '系列作品', en: 'SERIES', more: '#list/shows:ai', c: 'var(--k-sd)', note: '同一部的好幾季、好幾集' });
  h += chanRow('ai');
  h += statusLine();
  return h;
}
function lenList(k) {
  return memo('len:' + k + ':' + AIF, () => {
    const lo = { 1: 0, 3: 3600, 8: 3 * 3600, 99: 8 * 3600 }[k], hi = { 1: 3600, 3: 3 * 3600, 8: 8 * 3600, 99: 1e9 }[k];
    return aiList(() => L.comps('ai')).filter((v) => v.d >= lo && v.d < hi);
  });
}
function chanRow(tab) {
  const chs = Object.values(IDX.ch).filter((c) => (KINDS[c.k] || KINDS.jp).tab === tab && (!c.kids || SET.kids) && (c.l !== 'en' || SET.west));
  if (!chs.length) return '';
  return `<section class="sec">${secHead('頻道', 'CHANNELS', '', { c: 'var(--sora)', note: chs.length + ' 台' })}<div class="row chans">${chs.map((c) => `
    <a class="chc${VIEW.blocks[c.id] ? ' off' : ''}" href="#ch/${c.id}">${avatar(c.id, 52)}<b>${esc(c.n)}</b><span>${esc((KINDS[c.k] || KINDS.jp).zh)}${c.official ? ' · 官方' : ''}</span></a>`).join('')}</div></section>`;
}

/* ------------------------------------------------------------ 番劇 */
let ANIF = 'all', ANIS = 'hot';
function vAni() {
  if (!D.cat) return loadingView();
  const segs = [['all', '全部'], ['jp', '日本動畫'], ['cn', '國漫'], ['toon', '卡通']];
  const kind = ANIF === 'all' ? '' : ANIF;
  let h = pageHead('番劇', 'ANIME & DONGHUA', '官方頻道的正版動畫：日本動畫、國漫、卡通。照作品整理好，一集一集追，或整季合輯一次看。', '', 'var(--k-jp)');
  h += chips(segs, ANIF, 'anif');
  const live = L.live().filter((v) => !kind || kindOf(v) === kind);
  if (live.length) h += row('alive', live, { zh: '直播馬拉松', en: 'ON AIR', more: '#list/live', c: 'var(--fire)' });
  const eps = kind ? L.eps(kind) : spread(newest(['jp', 'cn', 'toon'].flatMap((k) => L.eps(k))));
  h += row('aeps', eps, { zh: '新集數', en: 'NEW EPISODES', more: kind ? '#list/eps:' + kind : '', c: 'var(--sakura)' });
  const shows = SL.all('ani', kind);
  const sorted = ANIS === 'new' ? shows.slice().sort((a, b) => (b.t || 0) - (a.t || 0)) : ANIS === 'long' ? shows.slice().sort((a, b) => b.n_eps - a.n_eps) : shows;
  h += `<section class="sec">${secHead('作品', 'SHOWS', '', { c: 'var(--k-jp)', note: shows.length + ' 部' })}${chips([['hot', '熱門'], ['new', '最近更新'], ['long', '集數多']], ANIS, 'anis')}
    <div class="grid sgrid">${sorted.slice(0, LF.limit).map((s) => scard(s)).join('')}</div>${sorted.length > LF.limit ? `<button class="btn wide" data-act="more" data-n="${LF.limit + 48}">再載入 ${Math.min(48, sorted.length - LF.limit)} 部</button>` : ''}</section>`;
  const comps = L.comps('ani').filter((v) => !kind || kindOf(v) === kind);
  h += row('acomps', comps, { zh: '整季合輯', en: 'BINGE PACK', more: '#list/comps:ani', c: 'var(--k-cn)' }, mcard);
  h += row('amovies', L.movies().filter((v) => !kind || kindOf(v) === kind), { zh: '劇場版', en: 'MOVIES', more: '#list/movies', c: 'var(--sora)' });
  h += chanRow('ani');
  h += statusLine();
  return h;
}

/* ------------------------------------------------------------ 片單（我的） */
function vMine() {
  if (!D.cat) return loadingView();
  const ws = weekStats();
  const hrs = ws.total / 3600e3;
  const title = ws.night > ws.total * 0.35 && ws.total > 3600e3 ? '深夜補番王' : hrs >= 20 ? '補番狂戰士' : hrs >= 8 ? '一口氣達人' : hrs >= 2 ? '追番中' : '新手放映員';
  const kinds = Object.entries(ws.kinds).sort((a, b) => b[1] - a[1]);
  let h = pageHead('片單', 'MY LIST', '', '', 'var(--leaf)');
  h += `<section class="stats">
    <div class="st-main"><span class="st-title d">${esc(title)}</span><b class="d"><i data-count="${Math.floor(hrs)}">${Math.floor(hrs)}</i><small>小時</small><i>${String(Math.round((hrs % 1) * 60)).padStart(2, '0')}</i><small>分</small></b><span>這週補了這麼久</span></div>
    <div class="st-bar">${kinds.map(([k, ms]) => `<i style="flex:${ms};--kc:${(KINDS[k] || KINDS.jp).c}" title="${esc((KINDS[k] || KINDS.jp).zh)}"></i>`).join('') || '<i style="flex:1;--kc:var(--sub)"></i>'}</div>
    <div class="st-leg">${kinds.filter(([, ms]) => ms >= 60000).slice(0, 4).map(([k, ms]) => `<span style="--kc:${(KINDS[k] || KINDS.jp).c}"><i></i>${esc((KINDS[k] || KINDS.jp).zh)} ${span(ms / 1000)}</span>`).join('')}</div>
    <div class="st-cells">
      <div><b class="d" data-count="${ws.streak}">${ws.streak}</b><span>連續天數</span></div>
      <div><b class="d" data-count="${ws.done}">${ws.done}</b><span>完食</span></div>
      <div><b class="d" data-count="${Math.round(ws.all / 3600e3)}">${Math.round(ws.all / 3600e3)}</b><span>累積小時</span></div>
      <div><b class="d">${ws.total ? Math.round(ws.night / ws.total * 100) : 0}<small>%</small></b><span>深夜時段</span></div>
    </div>
    <div class="st-hours">${ws.hours.map((ms, i) => `<i style="--h:${ws.total ? clamp(ms / Math.max(...ws.hours), 0, 1) : 0}" title="${i} 點"></i>`).join('')}<span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
  </section>`;
  const fol = SL.followed();
  h += fol.length ? `<section class="sec">${secHead('追番中', 'FOLLOWING', '', { c: 'var(--sakura)', note: fol.length + ' 部' })}<div class="grid sgrid">${fol.map((s) => scard(s)).join('')}</div></section>`
    : `<section class="sec">${secHead('追番中', 'FOLLOWING', '', { c: 'var(--sakura)' })}${empty('還沒有追番', '在作品頁按「☆ 追番」，出新集會出現在放送頁最上面；手機和電腦的片單會同步。')}</section>`;
  h += row('mcont', L.cont(), { zh: '繼續補番', en: 'CONTINUE', more: '#list/cont', c: 'var(--sora)' }, contCard);
  h += row('mlater', L.later(), { zh: '片單', en: 'SAVED', more: '#list/later', c: 'var(--leaf)', note: '按「＋ 片單」收進來的' });
  const hist = L.history();
  h += row('mhist', hist, { zh: '看過的', en: 'HISTORY', more: '#list/history', c: 'var(--violet)' });
  h += sourcesHtml();
  h += settingsHtml();
  h += systemHtml();
  return h;
}
function sourcesHtml() {
  const blocked = Object.keys(VIEW.blocks), hidden = Object.keys(VIEW.hides);
  const adds = (VIEW.adds || []).slice(-6).reverse();
  return `<section class="sec set">${secHead('片源', 'SOURCES', '', { c: 'var(--sora)' })}
    <div class="set-card">
      <p class="set-p">片庫來自 ${Object.keys(IDX.ch).length} 個 YouTube 頻道：官方動畫頻道、AI 漫劇與沙雕動畫的原創頻道。想加別的頻道，貼上頻道網址或 @代號：</p>
      <div class="add-row"><input id="addQ" type="text" placeholder="https://www.youtube.com/@… 或 @代號" autocomplete="off"><button class="btn yel" data-act="add-ch">加入</button></div>
      ${adds.length ? `<div class="adds">${adds.map((a) => `<span class="add ${a.st}">${esc(a.n || a.q)}<i>${{ send: '送出中', wait: '等下一次更新', ok: '加好了', fail: '找不到' }[a.st] || ''}</i></span>`).join('')}</div>` : ''}
      ${blocked.length ? `<div class="set-sub">封鎖的頻道</div><div class="adds">${blocked.map((c) => `<button class="add" data-act="unblock" data-c="${c}">${esc(chOf(c).n || c)}<i>解除</i></button>`).join('')}</div>` : ''}
      ${hidden.length ? `<div class="set-sub">不感興趣的作品</div><div class="adds">${hidden.map((s) => `<button class="add" data-act="unhide" data-s="${esc(s)}">${esc((IDX.showById.get(s) || {}).n || s)}<i>恢復</i></button>`).join('')}</div>` : ''}
    </div></section>`;
}
function tg(k, label, sub) {
  return `<label class="tg"><span><b>${esc(label)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}</span><input type="checkbox" data-set="${k}" ${SET[k] ? 'checked' : ''}><i></i></label>`;
}
function seg(k, label, opts) {
  return `<div class="segset"><b>${esc(label)}</b><div class="segs">${opts.map(([v, t]) => `<button class="${String(SET[k]) === String(v) ? 'on' : ''}" data-act="set-seg" data-k="${k}" data-v="${v}">${esc(t)}</button>`).join('')}</div></div>`;
}
function settingsHtml() {
  return `<section class="sec set">${secHead('設定', 'SETTINGS', '', { c: 'var(--sun)' })}<div class="set-card">
    ${seg('play', '點影片時', [['app', '在補番裡播'], ['yt', '交給 YouTube App']])}
    ${seg('sky', '天空', [['auto', '跟著時間'], ['day', '白天'], ['dusk', '黃昏'], ['night', '夜晚']])}
    ${seg('intro', '開場動畫', [['daily', '每天第一次'], ['every', '每次'], ['off', '不要']])}
    ${seg('skipOp', '跳過片頭', [['85', '85 秒'], ['90', '90 秒'], ['120', '2 分鐘']])}
    ${tg('auto', '連播', '一集看完自動接下一集（次回預告倒數）')}
    ${tg('zhFirst', '中文優先', '排序時中文標題的影片排前面')}
    ${tg('zhSubs', '外語片自動開中文字幕', '有中文字幕的才會開')}
    ${tg('west', '歐美卡通', '英文的官方卡通頻道')}
    ${tg('kids', '兒童卡通', '佩佩豬、汪汪隊這類幼兒卡通')}
    ${tg('bgm', '背景音樂', 'Lo-fi 動畫咖啡廳；看片時自動停')}
    ${tg('sfx', '音效', '')}
    <label class="rng"><b>音量</b><input type="range" min="0" max="1" step="0.05" value="${SET.vol}" data-set="vol"></label>
    ${seg('fx', '特效', [['full', '全開'], ['lite', '精簡（省電）']])}
  </div></section>`;
}
function systemHtml() {
  const st = D.cat || {};
  return `<section class="sec set">${secHead('放映室狀態', 'SYSTEM', '', { c: 'var(--violet)' })}<div class="set-card sys">
    <div class="sys-row"><span>片庫</span><b>${st.at ? new Date(st.at).toLocaleString('zh-TW', { hour12: false }) : '還沒送到'}</b></div>
    <div class="sys-row"><span>內容</span><b>${IDX.chs.length} 頻道 · ${IDX.shows.length} 作品 · ${IDX.vids.length} 影片</b></div>
    <div class="sys-row"><span>YouTube 金鑰</span><b>${st.key ? '<i class="ok">已接上</i>' : '<a href="#key">還沒接（點我看好處）</a>'}</b></div>
    <div class="sys-row"><span>片單同步</span><b class="sync-txt">${{ ok: '<i class="ok">都同步了</i>', wait: '等資料管線收件（30 分鐘內）', bad: '<i class="bad">送不出去，連上網路後重送</i>' }[syncState()]}</b></div>
    <div class="sys-row"><span>版本</span><b>補番 BINGE ${VERSION}</b></div>
    <div class="sys-acts"><button class="btn" data-act="reload">重新整理片庫</button><button class="btn" data-act="replay-op">重播開場</button><button class="btn ink" data-act="clear-hist">清除觀看紀錄</button></div>
  </div></section>`;
}

/* ------------------------------------------------------------ 作品頁 */
let EPR = 0;
function vShow(id) {
  const s = IDX.showById.get(id);
  if (!D.cat) return loadingView();
  if (!s) return backBar('返回') + empty('找不到這部作品', '可能已經下架，或片庫還沒更新。');
  SHOWSEEN[s.id] = Math.floor(nowS());
  store.set('showseen', SHOWSEEN);
  MEMO.delete('news');
  const k = KINDS[s.kind] || KINDS.jp, pr = showProgress(s), fol = following(s.id), ch = chOf(s.c);
  const cover = IDX.vids[s.cv] || s.eps[0];
  const unit = s.kind === 'jp' ? '話' : '集';
  const nx = pr.next;
  const ctx = ctxOf('show:' + s.id, s.eps);
  const cta = pr.done ? `<a class="go-btn d" href="#watch/${s.eps[0].i}" data-v="${s.eps[0].i}" data-ctx="${ctx}"><b>▶</b>完食！再看一次</a>`
    : nx ? `<a class="go-btn d" href="#watch/${nx.i}" data-v="${nx.i}" data-ctx="${ctx}"><b>▶</b>${pr.resume ? '接著看' : pr.watched ? '下一' + unit : (s.eps[0].e > 1 ? '從第 ' + s.eps[0].e + ' ' + unit + '看起' : '從第 1 ' + unit + '開始')}${pr.watched || pr.resume ? `<small>${esc(epLabel(nx))}</small>` : ''}</a>` : '';
  const RANGE = 50;
  const ranges = s.eps.length > RANGE ? Array.from({ length: Math.ceil(s.eps.length / RANGE) }, (_, i) => [i, (i * RANGE + 1) + '–' + Math.min(s.eps.length, (i + 1) * RANGE)]) : null;
  const r0 = ranges ? clamp(EPR, 0, ranges.length - 1) : 0;
  const shown = ranges ? s.eps.slice(r0 * RANGE, (r0 + 1) * RANGE) : s.eps;
  const same = SL.all('', s.kind).filter((x) => x.c === s.c && x !== s).slice(0, 12);
  return `<div class="show" style="--kc:${k.c}">
    ${backBar('返回')}
    <section class="kv"><span class="kv-img"><img src="${thumb(cover.i, 'maxresdefault')}" data-fb="${thumb(cover.i, 'hqdefault')}" alt=""><i class="kv-lines"></i></span>
      <div class="kv-card">
        <div class="kv-kick">${kchip(s.kind)}${fol ? '<i class="kc fol">★ 追番中</i>' : ''}${pr.done ? '<i class="kc done d">完食</i>' : ''}</div>
        <h1 class="kv-title">${esc(s.n)}</h1>
        <div class="kv-meta"><a href="#ch/${s.c}">${avatar(s.c, 22)}<b>${esc(ch.n)}</b></a><span>共 ${s.n_eps} ${unit}</span>${s.dur > 600 ? `<span>${span(s.dur)}</span>` : ''}${s.t ? `<span>${ago(s.t)}更新</span>` : ''}</div>
        ${pr.watched ? `<div class="kv-prog"><i style="--p:${(pr.watched / s.n_eps * 100).toFixed(1)}%"></i><span>看過 ${pr.watched} / ${s.n_eps} ${unit}</span></div>` : ''}
        <div class="kv-acts">${cta}
          <button class="chip fol ${fol ? 'on' : ''}" data-act="${fol ? 'unfollow' : 'follow'}" data-s="${esc(s.id)}">${fol ? '★ 追番中' : '☆ 追番'}</button>
          ${s.pl ? `<a class="chip" href="${plUrl(s.pl)}" target="_blank" rel="noopener">YouTube 清單</a>` : ''}
          <button class="chip" data-act="hide" data-s="${esc(s.id)}">不感興趣</button></div>
      </div></section>
    <section class="sec">${secHead('集數', 'EPISODES', '', { c: k.c, note: s.n_eps + ' ' + unit })}
      ${ranges ? chips(ranges.map(([i, t]) => [String(i), t]), String(r0), 'epr') : ''}
      <div class="eps">${shown.map((v, j) => epItem(v, ctx, (ranges ? r0 * RANGE : 0) + j, unit, v === nx)).join('')}</div></section>
    ${showRow(same, { zh: '同頻道的其他作品', en: 'MORE', c: 'var(--sora)', noch: true })}
  </div>`;
}
function epItem(v, ctx, idx, unit, isNext) {
  const h = histOf(v.i), pg = progOf(v);
  const lab = v.r ? v.r[0] + '–' + v.r[1] + ' 集' : v.e ? '第 ' + v.e + ' ' + unit : '第 ' + (idx + 1) + ' ' + unit;
  return `<a class="ep2${h && h[3] ? ' seen' : ''}${isNext ? ' next' : ''}" href="#watch/${v.i}" data-v="${v.i}" data-ctx="${ctx}">
    <span class="ep2-th"><img loading="lazy" src="${thumb(v.i)}" alt="">${v.d ? `<i>${clock(v.d)}</i>` : ''}${pg ? `<u style="--p:${(pg * 100).toFixed(0)}%"></u>` : ''}${h && h[3] ? '<b class="d">✓</b>' : isNext ? '<b class="d nx">NEXT</b>' : ''}</span>
    <span class="ep2-t"><em class="d">${esc(lab)}</em><span>${esc(v.t)}</span></span></a>`;
}

/* ------------------------------------------------------------ 頻道頁 */
function vChannel(c) {
  const ch = IDX.ch[c];
  if (!ch) return backBar('返回') + empty('找不到這個頻道');
  const k = KINDS[ch.k] || KINDS.jp;
  const shows = IDX.shows.filter((s) => s.c === c && showVisible(s));
  const vids = L.channel(c);
  const blocked = !!VIEW.blocks[c];
  return backBar('返回') + `<section class="chead" style="--kc:${k.c}">${avatar(c, 84)}<div><h1>${esc(ch.n)}</h1><p>${kchip(ch.k)}${ch.official ? '<i class="kc" style="--kc:var(--leaf)">官方</i>' : ''}${ch.geo ? '<i class="kc" style="--kc:var(--sora)">台灣限定</i>' : ''}</p>
    <div class="ch-acts"><a class="chip" href="${chUrl(c)}" target="_blank" rel="noopener">YouTube 頻道</a><button class="chip" data-act="${blocked ? 'unblock' : 'block'}" data-c="${c}">${blocked ? '解除封鎖' : '封鎖這台'}</button></div></div></section>` +
    (shows.length ? `<section class="sec">${secHead('作品', 'SHOWS', '', { c: k.c, note: shows.length + ' 部' })}<div class="grid sgrid">${shows.map((s) => scard(s, { noch: true })).join('')}</div></section>` : '') +
    `<section class="sec">${secHead('影片', 'VIDEOS', '', { c: 'var(--sun)', note: vids.length + ' 支' })}${grid('ch:' + c, vids, (v, ctx) => (v.f === 'c' || v.f === 'm' ? mcard(v, ctx) : vcard(v, ctx, { noch: true })))}</section>`;
}

/* ------------------------------------------------------------ 看全部 */
const LF = { limit: 48 };
function listOf(kind) {
  const [a, b] = kind.split(':');
  switch (a) {
    case 'comps': return { t: b === 'ai' ? '一口氣看完' : '番劇合輯', en: 'MARATHON', items: b === 'ai' ? aiList(() => L.comps('ai')) : L.comps(b || ''), card: mcard };
    case 'fresh': return { t: '新上架', en: 'JUST IN', items: b === 'ai' ? aiList(() => L.fresh('ai')) : L.fresh(b || '') };
    case 'eps': return { t: (KINDS[b] || KINDS.jp).zh + '・新集', en: 'NEW EPISODES', items: L.eps(b) };
    case 'kind': return { t: (KINDS[b] || KINDS.jp).zh, en: (KINDS[b] || KINDS.jp).en, items: L.kind(b) };
    case 'movies': return { t: '劇場版・動畫電影', en: 'MOVIES', items: L.movies() };
    case 'live': return { t: '直播馬拉松', en: 'ON AIR', items: L.live() };
    case 'xlive': return { t: '全天放送', en: '24H ON AIR', items: L.xlive() };
    case 'xcomp': return { t: '全網熱補', en: 'FOUND ONLINE', items: L.xcomps(), card: mcard };
    case 'genre': { const g = decodeURIComponent(b || ''); return { t: g, en: 'GENRE', items: L.genre(g, 'ai').filter((v) => AIF === 'all' || kindOf(v) === AIF), card: (v, ctx) => (v.f === 'c' || v.f === 'm' ? mcard(v, ctx) : vcard(v, ctx)) }; }
    case 'len': return { t: { 1: '1 小時以下', 3: '1～3 小時', 8: '3～8 小時', 99: '8 小時以上' }[b] || '片長', en: 'LENGTH', items: lenList(b), card: mcard };
    case 'later': return { t: '片單', en: 'SAVED', items: L.later() };
    case 'cont': return { t: '繼續補番', en: 'CONTINUE', items: L.cont(), card: contCard };
    case 'history': return { t: '看過的', en: 'HISTORY', items: L.history() };
    case 'shows': return { t: '系列作品', en: 'SERIES', shows: SL.all(b || '', '') };
    default: return { t: '全部', en: 'ALL', items: L.all('') };
  }
}
function vList(kind) {
  if (!D.cat) return loadingView();
  const m = listOf(kind);
  let h = backBar('返回') + pageHead(m.t, m.en, m.items ? m.items.length + ' 支' : m.shows.length + ' 部');
  if (m.shows) return h + `<div class="grid sgrid">${m.shows.slice(0, LF.limit).map((s) => scard(s)).join('')}</div>${m.shows.length > LF.limit ? `<button class="btn wide" data-act="more" data-n="${LF.limit + 48}">再載入</button>` : ''}`;
  if (!m.items.length) return h + empty('這裡還是空的', kind === 'later' ? '在影片上按「＋ 片單」就會收進來。' : '');
  return h + grid('list:' + kind, m.items, m.card || vcard, { cls: m.card === mcard ? 'mgrid' : '' });
}

/* ------------------------------------------------------------ 金鑰說明 */
function vKey() {
  const on = D.cat && D.cat.key;
  return backBar('返回') + pageHead('接上 YouTube 金鑰', 'API KEY', on ? '<b class="ok">已經接上了</b>：台灣限定頻道（木棉花、Ani-One 中文）的整季清單、片長、直播狀態都會比較完整。' : '不接也能用。接上之後：木棉花、Ani-One 中文這些台灣限定頻道的整季清單會完整、片長與直播狀態更準。跟《觀戰》用同一把，設定一次兩個 App 都受惠。') +
    `<ol class="steps">
      <li><b>開一個 Google Cloud 專案</b><span>用 Google 帳號打開下面的連結，專案名稱隨便填，按「建立」。</span><a class="btn" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">建立專案 ›</a></li>
      <li><b>啟用 YouTube Data API v3</b><span>確認上方選的是剛建的專案，按「啟用」。</span><a class="btn" href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener">啟用 API ›</a></li>
      <li><b>建立 API 金鑰</b><span>按「建立憑證」→「API 金鑰」，複製那一串字。建議再按「編輯 API 金鑰」→「API 限制」只勾 YouTube Data API v3。</span><a class="btn" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">憑證頁 ›</a></li>
      <li><b>存進 GitHub</b><span>打開下面的連結（要登入 GitHub），Name 填 <code>YT_KEY</code>，Secret 貼上金鑰，按「Add secret」。金鑰只存在 GitHub，不會出現在網頁或程式裡。</span><a class="btn yel" href="https://github.com/PZWei0105/PZ-Games/settings/secrets/actions/new" target="_blank" rel="noopener">新增 YT_KEY ›</a></li>
      <li><b>等下一次片庫更新</b><span>30 分鐘內，「片單 → 放映室狀態」會顯示已接上。每天免費 1 萬點，補番一天最多用 4,000 點，不會收費。</span></li>
    </ol>`;
}

/* ------------------------------------------------------------ 搜尋 */
function openSearch() {
  openSheet(`<div class="search"><div class="sq"><input id="sq" type="search" placeholder="作品、頻道、影片…" autocomplete="off"><button class="btn" data-act="sheet-close">關閉</button></div><div id="sres">${searchTips()}</div></div>`);
  const q = $('#sq');
  q.focus();
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => renderSearch(q.value), 160); });
}
function searchTips() {
  const tips = ['修仙', '末世', '重生', '穿越', '轉生', '鬥破', '斗羅', '熊出沒', '史萊姆', '鋼彈'];
  return `<div class="stips">${tips.map((x) => `<button class="chip" data-act="stip" data-k="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
}
function renderSearch(q) {
  const r = search(q);
  const box = $('#sres');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = searchTips(); return; }
  if (!r.shows.length && !r.chans.length && !r.vids.length) { box.innerHTML = empty('找不到「' + esc(q) + '」', '換個關鍵字，或用簡體字試試。'); return; }
  const ctx = ctxOf('search', r.vids);
  box.innerHTML = (r.shows.length ? `<h3 class="sr-h d">作品</h3><div class="grid sgrid">${r.shows.map((s) => scard(s)).join('')}</div>` : '') +
    (r.chans.length ? `<h3 class="sr-h d">頻道</h3><div class="row chans">${r.chans.map((c) => `<a class="chc" href="#ch/${c.id}">${avatar(c.id, 44)}<b>${esc(c.n)}</b></a>`).join('')}</div>` : '') +
    (r.vids.length ? `<h3 class="sr-h d">影片</h3><div class="grid">${r.vids.map((v) => (v.f === 'c' || v.f === 'm' ? mcard(v, ctx) : vcard(v, ctx))).join('')}</div>` : '');
}
function openSheet(html) {
  const s = $('#sheet');
  s.hidden = false;
  s.innerHTML = `<div class="sheet-bg" data-act="sheet-close"></div><div class="sheet-in">${html}</div>`;
  requestAnimationFrame(() => s.classList.add('in'));
}
function closeSheet() {
  const s = $('#sheet');
  if (s.hidden) return;
  s.classList.remove('in');
  setTimeout(() => { s.hidden = true; s.innerHTML = ''; }, 260);
}
