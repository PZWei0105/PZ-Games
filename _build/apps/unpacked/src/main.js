/* 解包 — 啟動、路由、互動 */
const VIEW = () => $('#view');
let ROUTE = '';
const INTRO_REV = 2;   // 2026/11/18 開場加了「頭條拍上牆」
let NAVN = 0;   // App 裡往前走了幾步（「回牆上」才知道能不能用上一頁）

function setTabs(name) {
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.go === name));
  const wait = opsBadge();   // 粉專：今天還沒發的任務
  const dot = $('.tab[data-go="fan"] .dot'); if (dot) { dot.textContent = wait; dot.classList.toggle('hide', !wait); }
  const pi = (S.picks && S.picks.items) || []; const pl = pi[0] && pi[0].date;
  const pnew = pi.filter((x) => x.date === pl && !S.seen['p:' + x.id]).length;
  const pd = $('.tab[data-go="picks"] .dot'); if (pd) { pd.textContent = pnew; pd.classList.toggle('hide', !pnew); }
  const sn = shNewCount(); const sd = $('.tab[data-go="shorts"] .dot'); if (sd) { sd.textContent = sn; sd.classList.toggle('hide', !sn); }
  const hn = huntSaleCount(); const hd = $('.tab[data-go="hunt"] .dot'); if (hd) { hd.textContent = hn; hd.classList.toggle('hide', !hn); }
  askLamp();
}
function tapeText() {
  const it = S.index ? S.index.items : []; const last = it[0] && it[0].date;
  const today = it.filter((x) => x.date === last);
  const names = today.map((x) => `<b>${esc(x.zh)}</b>`).join(' ★ ');
  const pi = (S.picks && S.picks.items) || []; const pl = pi[0] && pi[0].date;
  const pk = pi.filter((x) => x.date === pl).map((x) => `<b>${esc(x.zh)}</b>`).join('、');
  const one = `痞子葳，${last === todayTW() ? '今天' : mdDay(last || todayTW())}解包 ${today.length} 款 ★ ${names} ★ ${pk ? `${pl === todayTW() ? '今日' : '最新'}推坑：${pk} ★ ` : ''}好遊戲不錯過，雷遊戲不踩過 ★ GAME RHAPSODY ★ `;
  $('#tape').innerHTML = `<span class="in">${one}${one}</span>`;
}

async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';
  const [name, arg] = h.split('/');
  const prev = ROUTE; ROUTE = h;
  if (prev && !prev.startsWith('f/')) S.scroll[prev] = scrollY;
  stopVideo(name === 'shorts'); stopSpeak(); motionStop(); huntStop(); weekStop(); tgaStop(); dealsStop(); askStop(); moreStop(); opsStop(); vsStop();
  if (name !== 'shorts') shExit();
  const v = VIEW();
  try {
    if (name === 'f' && arg) {
      setTabs('');
      const pr = renderFeature(arg); pr.catch(() => {});     // 解包動畫播的同時就去載
      if (prev !== h) await unpackAnim(arg);
      v.innerHTML = await pr; S.curKind = 'feature';
      S.seen[arg] = 1; save('seen');
      afterFeature();
      scrollTo(0, 0);
    } else if (name === 'p' && arg) {
      setTabs('picks');
      const pr = renderPick(arg); pr.catch(() => {});
      if (prev !== h) await unpackAnim(arg, 'pick');
      v.innerHTML = await pr;
      S.seen['p:' + arg] = 1; save('seen'); setTabs('picks');
      afterFeature();
      scrollTo(0, 0);
    } else if (name === 'hunt') { setTabs('hunt'); await liveLoad(wantSteams(), 1500); v.innerHTML = renderHunt(); if (S.jump) { const j = $(S.jump); S.jump = ''; if (j) requestAnimationFrame(() => j.scrollIntoView({ block: 'start' })); else restoreScroll(h); } else restoreScroll(h); huntFx(); }
    else if (name === 'board') { setTabs('home'); if (!S.board || Date.now() - Date.parse(S.board.at) > 15 * 6e4) { try { const b = await getJSON('board.json'); if (b && b.rows) S.board = b; } catch (e) { /* 用手上的 */ } } v.innerHTML = renderBoard(); restoreScroll(h); boardFx(); }
    else if (name === 'tga') { setTabs('home'); if (!S.tgaD || tgaPhase() === 'live') { try { const t = await getJSON('tga.json'); if (t && t.cats) S.tgaD = t; } catch (e) { /* 用手上的 */ } } v.innerHTML = renderTga(); if (prev && prev.startsWith('tga') && prev === h) restoreScroll(h); else scrollTo(0, 0); tgaFx(); }
    else if (name === 'vs') { setTabs('home'); await vsPrep(arg); v.innerHTML = renderVS(arg); scrollTo(0, 0); vsFx(); }
    else if (name === 'ask') { setTabs('home'); await loadAsk(); v.innerHTML = renderAsk(); scrollTo(0, 0); askFx(); askFlush(); }
    else if (name === 'cal') { setTabs('hunt'); v.innerHTML = await renderCal(); scrollTo(0, 0); calFx(); }
    else if (name === 'week') { setTabs(''); v.innerHTML = await renderWeek(arg); scrollTo(0, 0); weekFx(); }
    else if (name === 'shorts') { setTabs('shorts'); v.innerHTML = ''; renderShorts(arg); } else if (name === 'picks') { setTabs('picks'); v.innerHTML = renderPicks(); restoreScroll(h); homeFx('.pks .pk', 'pk'); moreFx(); } else if (name === 'lib') {
      setTabs('lib');
      if (DB.mode === 'all') { v.innerHTML = await renderLibAll(); }
      if (DB.mode !== 'all') { v.innerHTML = renderLib(); trayUpdate(); moreFx(); }
      if (DB.focus) { DB.focus = false; scrollTo(0, 0); const i = $('#dbq'); if (i) setTimeout(() => i.focus(), 60); } else restoreScroll(h);
    }
    else if (name === 'fan' && arg && arg.startsWith('w:')) { setTabs('fan'); v.innerHTML = await renderWeekFan(arg.slice(2)); scrollTo(0, 0); weekCardRender(); }
    else if (name === 'fan' && arg && arg[0] === '~') {   // 粉專作戰台：排程、出稿、成效、教學、上架流程、影片三連發
      const sub = arg.slice(1); const sn = sub.split(':')[0]; setTabs('fan'); v.innerHTML = await renderOps(sub);
      if (sn === 'plan' || sn === 'drafts' || sn === 'stats' || sn === 'learn') restoreScroll(h); else scrollTo(0, 0);
      if (sn === 'drafts') moreFx(); opsFx(sn);
    }
    else if (name === 'fan' && arg) { setTabs('fan'); v.innerHTML = await renderFanDetail(arg); scrollTo(0, 0); cardRender(await loadFeature(arg)); }
    else if (name === 'fan') { setTabs('fan'); v.innerHTML = await renderOps('today'); restoreScroll(h); opsFx('today'); }
    else { setTabs('home'); v.innerHTML = renderHome(); restoreScroll('home'); homeFx(); }
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="empty">這頁打不開：${esc(e.message)}<br><button class="btn y" style="margin-top:12px" onclick="location.hash='home'">回牆上</button></div>`;
  }
  if (!h.startsWith('lib')) $('#tray').classList.remove('on');
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
}
function restoreScroll(k) { const y = S.scroll[k] || 0; requestAnimationFrame(() => scrollTo(0, y)); }

/* ---- 動態畫面：主視覺輪播（Ken Burns）、海報與主視覺的動態預告、段落噴字、數字跳動 ---- */
const KB = new Map();          // 輪播容器 → { list, i, t, ms }
const FIO = [];                // 這一頁的觀察器，換頁時收掉
let HVIO = null, PIO = null, PV = null, PACT = null;
function kbAnim(img) {
  const r = Math.random;
  img.style.setProperty('--kx', ((r() * 2 - 1) * 4).toFixed(1) + '%');
  img.style.setProperty('--ky', ((r() * 2 - 1) * 3).toFixed(1) + '%');
  img.style.setProperty('--kz', (1.1 + r() * 0.08).toFixed(3));
  img.classList.remove('kbgo'); void img.offsetWidth; img.classList.add('kbgo');
}
function kbStart(box, list, ms = 5200) {
  kbStop(box); if (!box) return;
  const st = { list: list.slice(), i: 0, t: 0, ms }; KB.set(box, st);
  const first = $('.kbi.on', box); if (first) kbAnim(first);
  if (st.list.length > 1) st.t = setTimeout(() => kbNext(box), ms);
}
function kbStop(box) { const st = KB.get(box); if (st) { clearTimeout(st.t); KB.delete(box); } }
function kbNext(box) {
  const st = KB.get(box); if (!st) return; st.t = 0;
  if (!box.isConnected) { KB.delete(box); return; }
  const again = (ms) => { if (KB.get(box) === st) st.t = setTimeout(() => kbNext(box), ms); };
  if (document.hidden || box.classList.contains('vidon')) { again(st.ms); return; }
  const imgs = $$('.kbi', box); if (imgs.length < 2 || st.list.length < 2) return;
  const cur = imgs[0].classList.contains('on') ? imgs[0] : imgs[1]; const nxt = cur === imgs[0] ? imgs[1] : imgs[0];
  let tries = 0;
  const step = () => {
    if (st.list.length < 2) return;
    st.i = (st.i + 1) % st.list.length; const u = st.list[st.i];
    const pre = new Image(); pre.decoding = 'async';
    const fail = () => { st.list.splice(st.i, 1); st.i -= 1; if (++tries < 5) step(); else again(st.ms); };
    pre.onload = () => {
      if (pre.naturalWidth <= 120) { fail(); return; }
      if (KB.get(box) !== st) return;
      nxt.src = u; kbAnim(nxt); nxt.classList.add('on'); cur.classList.remove('on'); again(st.ms);
    };
    pre.onerror = fail; pre.src = u;
  };
  step();
}
/* 主視覺第一張圖壞掉：YouTube 高畫質沒有就換一般畫質，不然直接跳下一張 */
function heroFail(img) {
  const low = ytLow(img.getAttribute('src')); if (low) { img.src = low; return; }
  const bad = img.getAttribute('src'); const box = img.closest('#fhero');
  const L = (S.curHero || []).filter((u) => u !== bad); S.curHero = L;
  if (box && L.length) {
    const st = KB.get(box);
    if (st) { st.list = L; st.i = -1; clearTimeout(st.t); img.classList.remove('on'); kbNext(box); return; }
    img.src = L[0]; return;
  }
  imgFail(img);
}
/* 動態預告：iPhone 吃 mp4，沒有 H.264 的瀏覽器會自己改用 webm */
function vidSources(v, mp4, webm) {
  v.textContent = '';
  for (const [u, t] of [[mp4, 'video/mp4'], [webm, 'video/webm']]) if (u) { const s = document.createElement('source'); s.src = u; s.type = t; v.appendChild(s); }
  v.load();
}
function heroFx() {
  const box = $('#fhero'); if (!box || !fxOn()) return;
  kbStart(box, S.curHero || [], 5200);
  const v = $('.hv', box); if (!v) return;
  vidSources(v, v.dataset.mp4, v.dataset.webm);
  v.addEventListener('playing', () => { v.classList.add('on'); box.classList.add('vidon'); }, { once: true });
  const lastSrc = v.querySelector('source:last-child'); if (lastSrc) lastSrc.addEventListener('error', () => { v.remove(); box.classList.remove('vidon'); }, { once: true });
  HVIO = new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.2 });
  HVIO.observe(box);
}
/* 首頁：海報拍上牆；捲到哪張，哪張就動起來（Steam 動態預告，沒有就輪播精彩畫面） */
function homeFx(sel = '.posters .poster', key = 'home') {
  const ps = $$(sel); if (!ps.length || !fxOn()) return;
  if (key === 'home') { if (!S.introPending) homeDrop(); } else dropIn(ps, key);
  const ratio = new Map();
  PIO = new IntersectionObserver((es) => {
    es.forEach((e) => ratio.set(e.target, e.intersectionRatio));
    let best = null, br = 0.5; ratio.forEach((r, el) => { if (r > br) { best = el; br = r; } });
    posterActive(best);
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  ps.forEach((p) => PIO.observe(p));
}
function homeDrop() { dropIn($$('.posters .poster'), 'home'); }
function dropIn(ps, key) {
  S.dropped = S.dropped || {};
  if (S.dropped[key] || !fxOn()) return; S.dropped[key] = 1;
  ps.forEach((p, i) => {
    p.style.setProperty('--i', i); p.classList.add('drop');
    p.addEventListener('animationend', () => p.classList.remove('drop'), { once: true });
    setTimeout(() => { (key === 'pk' ? sfx.stamp : sfx.slap)(); haptic(8); if (i === 0) burstAt(p, key === 'pk' ? [YEL, PINK, BLK] : [PINK, YEL, BLK], 18, 10); }, 120 + i * 140);
  });
}
function posterActive(p) {
  if (p === PACT) return;
  if (PACT) { const b = $('.pimg', PACT); kbStop(b); b.classList.remove('vidon'); PACT.classList.remove('act'); }
  if (PV) { try { PV.pause(); } catch (e) { /* */ } PV.remove(); PV = null; }
  PACT = p; if (!p) return;
  p.classList.add('act');
  const b = $('.pimg', p);
  if (p.dataset.mp4 || p.dataset.webm) {
    const v = document.createElement('video'); v.className = 'pv'; v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.preload = 'auto';
    b.insertBefore(v, $('.ht', b)); vidSources(v, p.dataset.mp4, p.dataset.webm);
    v.addEventListener('playing', () => { v.classList.add('on'); b.classList.add('vidon'); }, { once: true });
    const ls = v.querySelector('source:last-child'); if (ls) ls.addEventListener('error', () => { v.remove(); b.classList.remove('vidon'); if (PV === v) PV = null; }, { once: true });
    v.play().catch(() => {}); PV = v;
  }
  const it = findItem(p.dataset.id);
  const first = $('.kbi.on', b);
  if (it && first) liveLoad([it.steam], 2500).then(() => { if (PACT === p) kbStart(b, posterList(it, liveOf(it.steam), first.getAttribute('src')), 4600); });
}
/* 長清單分批畫：捲到離底 1600px 內就接著畫下一批 */
let MOREIO = null;
function moreStop() { if (MOREIO) { MOREIO.disconnect(); MOREIO = null; } }
function moreFx() {
  moreStop();
  const ss = $$('.more-s'); if (!ss.length) return;
  MOREIO = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) moreLoad(e.target.dataset.more); }, { rootMargin: '0px 0px 1600px 0px' });
  ss.forEach((s) => MOREIO.observe(s));
}
function moreLoad(key) {
  const grew = key === 'lib' ? libMore() : key === 'pk' ? pkMore() : key === 'fan' ? fanMore() : false;
  if (!grew) return;
  requestAnimationFrame(() => { const s = $(`.more-s[data-more="${key}"]`); if (s && s.getBoundingClientRect().top < innerHeight + 1600) moreLoad(key); });
}
/* 我標「想玩」的遊戲（獵價頁要用寬版封面） */
function wantSteams() { return Object.keys(S.marks || {}).filter((id) => S.marks[id] === 'want').map((id) => { const it = findItem(id); return it && it.steam; }).filter(Boolean); }
/* 開完 App、閒下來時先把最可能點開的幾款載好：今天的專題和推坑、我想玩的、短影音最前面幾支 */
function livePrefetch() {
  const ids = new Set(); const fi = (S.index && S.index.items) || [], pi = (S.picks && S.picks.items) || [];
  const fl = fi[0] && fi[0].date, pl = pi[0] && pi[0].date;
  fi.filter((x) => x.date === fl).forEach((x) => x.steam && ids.add(x.steam));
  pi.filter((x) => x.date === pl).forEach((x) => x.steam && ids.add(x.steam));
  wantSteams().forEach((s) => ids.add(s));
  try { shItems().slice(0, 4).forEach((x) => x.steam && ids.add(x.steam)); } catch (e) { /* 短影音還沒準備好也沒關係 */ }
  const go = () => liveLoad([...ids]);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
}
function motionStop() {
  KB.forEach((st) => clearTimeout(st.t)); KB.clear();
  FIO.forEach((o) => o.disconnect()); FIO.length = 0;
  if (HVIO) { HVIO.disconnect(); HVIO = null; }
  const hv = $('#fhero .hv'); if (hv) { try { hv.pause(); hv.removeAttribute('src'); hv.load(); } catch (e) { /* */ } }
  if (PIO) { PIO.disconnect(); PIO = null; }
  if (PV) { try { PV.pause(); } catch (e) { /* */ } PV.remove(); PV = null; }
  PACT = null;
}
document.addEventListener('visibilitychange', () => {
  const hv = $('#fhero .hv.on');
  if (document.hidden) { if (hv) hv.pause(); if (PV) PV.pause(); return; }
  if (hv && hv.getBoundingClientRect().bottom > 0) hv.play().catch(() => {});
  if (PV) PV.play().catch(() => {});
});
/* 即時數據：數字從 0 跳上來、折線畫出來 */
function countUp(root) {
  const els = $$('.cu', root); root.classList.add('counting'); if (!els.length) return;
  const t0 = performance.now(), D = 950; let lastTick = 0, ticks = 0;
  const fmt = (el, v) => (el.dataset.f === 'i' ? String(Math.round(v)) : fmtN(Math.round(v)));
  const step = (now) => {
    const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
    els.forEach((el) => { el.textContent = fmt(el, +el.dataset.n * e); });
    if (k < 1) { if (now - lastTick > 90 && ticks < 9) { lastTick = now; ticks++; sfx.tick(); } requestAnimationFrame(step); }
    else { els.forEach((el) => { el.textContent = fmt(el, +el.dataset.n); }); sfx.pop(); }
  };
  setTimeout(() => root.classList.remove('counting'), 1600);   // 折線畫完就拿掉虛線設定，免得線斷掉
  requestAnimationFrame(step);
}
/* 相簿：YouTube 高畫質畫面沒有就換一般畫質，再不行就拿掉 */
function shotFail(img) {
  const box = img.parentElement; if (!box) return; const i = +box.dataset.i;
  const low = ytLow(img.getAttribute('src'));
  if (low) { img.src = low; if (S.curMedia) S.curMedia.shots[i] = low; return; }
  if (S.curMedia) S.curMedia.shots[i] = null;
  box.remove();
  const n = $('.shot-n'); if (n && S.curMedia) n.textContent = `${S.curMedia.shots.filter(Boolean).length} 張・點開可以左右滑`;
}

/* ---- 「解包中」轉場 ---- */
async function unpackAnim(id, kind = 'feature') {
  const it = findItem(id) || {};
  if (!fxOn()) return;
  const el = document.createElement('div'); el.id = 'unpack'; if (kind === 'pick') el.className = 'dig';
  const lines = kind === 'pick' ? ['/推坑理由', '/評價', '/怎麼玩', '/影像', '/哪裡買'] : ['/資訊', '/影像', '/玩法', '/幕後', '/風向', '/討論'];
  const head = kind === 'pick' ? `&gt; DIGGING ${esc(id)} … 挖到寶了` : `&gt; UNPACKING ${esc(id)}.pak`;
  el.innerHTML = `<div class="box"><div class="nm">${esc(it.zh || id)}</div><div class="ln">${head}</div>${lines.map((l) => `<div class="ln" style="opacity:0">  ${l.padEnd(8, ' ')}.......... <span class="ok">${kind === 'pick' ? 'GEM' : 'OK'}</span></div>`).join('')}<div class="bar"><i></i></div></div>`;
  document.body.appendChild(el); sfx.rattle();
  const lns = $$('.ln', el).slice(1); const bar = $('.bar i', el);
  for (let i = 0; i < lns.length; i++) { await sleep(70); lns[i].style.opacity = 1; sfx.type(); bar.style.transform = `scaleX(${(i + 1) / lns.length})`; }
  await sleep(90); sfx.stamp();
  el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.06)' }], { duration: 200, easing: 'ease-in' }).onfinish = () => el.remove();
  await sleep(120);
}

function afterFeature() {
  heroFx();
  if (fxOn()) {
    $$('.glance .gl-t').forEach((t, i) => setTimeout(() => sfx.blip(520 + i * 130), 260 + i * 70));
    const hs = $$('.fsec>h2'); let last = 0;
    hs.forEach((h) => h.classList.add('rv'));
    const io3 = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io3.unobserve(e.target); e.target.classList.add('in');
      const now = performance.now();
      if (now - last > 600) { last = now; sfx.spray(); const pth = $('.path', e.target); setTimeout(() => burstAt(pth, [PINK, YEL], 9, 6), 110); }
    }), { threshold: 0.5 });
    hs.forEach((h) => io3.observe(h)); FIO.push(io3);
    const live = $('.live');
    if (live) { const io4 = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io4.disconnect(); countUp(live); }, { threshold: 0.35 }); io4.observe(live); FIO.push(io4); }
  }
  const seal = $('.verdict .seal') || $('.letter .seal');
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return; io.disconnect();
      seal.classList.remove('wait'); seal.classList.add('go');
      setTimeout(() => { sfx.stamp(); impact(seal, ['#e3001b', '#111', '#FF2E88'], false); }, 250);
    });
  }, { threshold: 0.6 });
  if (seal) io.observe(seal);
  // 分頁籤跟著捲動
  const secs = $$('.fsec'); const tabs = $$('.ftab');
  const io2 = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) tabs.forEach((t) => t.classList.toggle('on', t.dataset.to === e.target.id)); });
  }, { rootMargin: '-35% 0px -60% 0px' });
  secs.forEach((s) => io2.observe(s));
}

/* ---- 影片 ---- */
let HLS = null;
function stopVideo(keepDuck = false) {
  const tv = $('#tvbox iframe, #tvbox video');
  if (tv) { try { if (tv.tagName === 'VIDEO') tv.pause(); } catch (e) { /* */ } tv.remove(); }
  if (HLS) { try { HLS.destroy(); } catch (e) { /* */ } HLS = null; }
  if (!keepDuck) bgmDuck(false);
}
async function playVideo(i) {
  const v = S.curMedia && S.curMedia.vids[i]; if (!v) return;
  const box = $('#tvbox .tv'); if (!box) return;
  sfx.click(); bgmDuck(true); box.removeAttribute('data-act');
  if (fxOn()) { sfx.riser(); burstAt($('.playb', box) || box, [PINK, YEL, BLK], 20, 10); }
  if (v.kind === 'yt') {
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title)}"></iframe>`;
    return;
  }
  const vid = document.createElement('video'); vid.controls = true; vid.playsInline = true; vid.autoplay = true; if (v.poster) vid.poster = v.poster;
  box.innerHTML = ''; box.appendChild(vid);
  const isHls = /\.m3u8(\?|$)/.test(v.src);
  if (!isHls || vid.canPlayType('application/vnd.apple.mpegurl')) { vid.src = v.src; vid.play().catch(() => {}); return; }
  try {
    const Hls = await hlsLib();
    if (!Hls.isSupported()) throw new Error('這台裝置不支援串流');
    HLS = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20 });
    HLS.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) toast('預告播不了，可以到 Steam 商店頁看', 'warn'); });
    HLS.loadSource(v.src); HLS.attachMedia(vid); vid.play().catch(() => {});
  } catch (e) { toast('預告播不了：' + e.message, 'warn'); }
}

/* ---- 語音導讀 ---- */
let SPEAK = false;
function stopSpeak() { if (SPEAK && window.speechSynthesis) { speechSynthesis.cancel(); } SPEAK = false; const b = $('[data-act="speak"] span'); if (b) b.textContent = '語音導讀'; }
async function speakFeature() {
  if (!window.speechSynthesis) { toast('這台裝置不支援語音', 'warn'); return; }
  if (SPEAK) { stopSpeak(); bgmDuck(false); return; }
  let parts;
  if (S.curKind === 'pick') {
    const f = await loadPick(S.curId);
    const Sx = f.sections || {};
    parts = [f.game.zh, f.pitch, f.why, ...f.reasons.map((r, i) => `理由${i + 1}，${r.h}：${r.t}`), ...((Sx.gameplay || {}).body || []),
      ...(Sx.voices ? ['玩家怎麼說：誇的是，' + Sx.voices.pros.join('；') + '。罵的是，' + Sx.voices.cons.join('；')] : []),
      '怎麼玩最好玩：' + f.howto.join('；'), ...(f.multi ? ['跟朋友玩：' + f.multi.text] : []), '怎麼買：' + f.deals];
  } else {
    const f = await loadFeature(S.curId);
    parts = [f.game.zh, f.headline, f.hook, '結論：' + f.verdict.stamp + '，' + f.verdict.summary, ...f.sections.gameplay.body, '玩家怎麼說：誇的是，' + f.sections.voices.pros.join('；') + '。罵的是，' + f.sections.voices.cons.join('；')];
  }
  const voices = speechSynthesis.getVoices(); const zh = voices.find((x) => /zh[-_]TW/i.test(x.lang)) || voices.find((x) => /^zh/i.test(x.lang));
  speechSynthesis.cancel(); SPEAK = true; bgmDuck(true);
  const b = $('[data-act="speak"] span'); if (b) b.textContent = '停止導讀';
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p); u.lang = 'zh-TW'; if (zh) u.voice = zh; u.rate = 1.05;
    if (i === parts.length - 1) u.onend = () => { SPEAK = false; bgmDuck(false); const bb = $('[data-act="speak"] span'); if (bb) bb.textContent = '語音導讀'; };
    speechSynthesis.speak(u);
  });
}

/* ---- 疊層 ---- */
function openSheet(html, cls = '') {
  const s = $('#sheet'); s.innerHTML = `<div class="sbg" data-act="close"></div><div class="sbox ${cls}"><button class="ib sclose" data-act="close" aria-label="關閉">${ICON.x}</button>${html}</div>`;
  s.classList.add('on'); sfx.whoosh();
}
function closeSheet() { const s = $('#sheet'); s.classList.remove('on'); s.innerHTML = ''; }
let LBI = 0;
function openLightbox(i) {
  const shots = (S.curMedia && S.curMedia.shots) || []; const n = shots.length; if (!shots.some(Boolean)) return;
  const dir = i < LBI ? -1 : 1; let k = ((i % n) + n) % n, g = 0;
  while (!shots[k] && g++ < n) k = (((k + dir) % n) + n) % n;
  LBI = k; const pos = shots.slice(0, k + 1).filter(Boolean).length, tot = shots.filter(Boolean).length;
  const s = $('#sheet'); s.innerHTML = `<div class="sbg" data-act="close"></div><div class="lb" data-act="close"><img src="${esc(shots[LBI])}" alt="" onerror="lbFail(this)" onload="if(this.naturalWidth<=120)lbFail(this)"><button class="lbp" data-act="lbn" data-d="-1">‹</button><button class="lbx" data-act="lbn" data-d="1">›</button><div class="lbn">${pos} / ${tot}</div></div>`;
  s.classList.add('on');
  let x0 = null; const lb = $('.lb', s);
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { openLightbox(LBI + (dx < 0 ? 1 : -1)); sfx.click(); } x0 = null; });
}
function lbFail(img) {
  const low = ytLow(img.getAttribute('src')); if (low) { img.src = low; if (S.curMedia) S.curMedia.shots[LBI] = low; return; }
  if (S.curMedia) S.curMedia.shots[LBI] = null; openLightbox(LBI + 1);
}
function trayUpdate() { const t = $('#tray'); t.innerHTML = trayHtml(); t.classList.toggle('on', S.cmp.length > 0 && ROUTE.startsWith('lib')); }

/* ---- 點擊總機 ---- */
document.addEventListener('click', async (ev) => {
  const go = ev.target.closest('[data-go]'); const act = ev.target.closest('[data-act]');
  if (act && (!go || go.contains(act))) {
    const a = act.dataset.act;
    if (a === 'close') { if (ev.target.closest('.lb button')) return; closeSheet(); return; }
    ev.preventDefault();
    if (a === 'back') { sfx.scratch(); if (NAVN > 0) { NAVN--; history.back(); } else location.hash = ROUTE.startsWith('p/') ? 'picks' : 'home'; return; }
    if (a.startsWith('op') && await opsAct(a, act)) return;   // 粉專作戰台
    if (a.startsWith('vs') && await vsAct(a, act)) return;   // VS 擂台
    if (a === 'pf') { PICKF.f = act.dataset.v; sfx.click(); motionStop(); MORE_N.pk = MORE_STEP.pk; const y = scrollY; VIEW().innerHTML = renderPicks(); scrollTo(0, y); homeFx('.pks .pk', 'pk'); moreFx(); return; }
    if (a === 'hf' || a === 'hs') { if (a === 'hf') HUNT.f = act.dataset.v; else HUNT.sort = act.dataset.v; sfx.click(); const y = scrollY; huntStop(); VIEW().innerHTML = renderHunt(); scrollTo(0, y); huntFx(); return; }
    if (a === 'cday') { const g = document.getElementById('cd-' + act.dataset.d); if (g) { g.scrollIntoView({ behavior: 'smooth', block: 'center' }); g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash'); } sfx.click(); return; }
    if (a === 'caladd') { ev.stopPropagation(); const e = (S.calEv || [])[+act.dataset.i]; if (e) { calSave([e], `unpacked-${e.d}.ics`); sfx.stamp(); burstAt(act, [YEL, PINK], 12, 7); } return; }
    if (a === 'calall') { const L = S.calEv || []; if (L.length) { calSave(L, 'unpacked-calendar.ics'); sfx.stamp(); toast(`${L.length} 筆一次加入`); } return; }
    if (a === 'calcopy') { if (await copyText(CAL_URL)) { sfx.stamp(); toast('訂閱網址已複製'); } return; }
    if (a === 'hinfo') { ev.stopPropagation(); huntInfo(act.dataset.k); return; }
    if (a === 'gameinfo') { ev.stopPropagation(); sfx.click(); gameOpen(act.dataset.k); return; }   // 遊戲情報卡
    // 行情板
    if (a === 'mkf' || a === 'mks' || a === 'mktag') { if (a === 'mkf') MK.f = act.dataset.v; else if (a === 'mks') MK.sort = act.dataset.v; else MK.tag = MK.tag === act.dataset.v ? '' : act.dataset.v; sfx.click(); const y = scrollY; VIEW().innerHTML = renderBoard(); scrollTo(0, y); if (a === 'mktag' && MK.tag) { const l = $('.mk-tagon'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if (a === 'mkinfo') { mkInfo(act.dataset.a); return; }
    // TGA 預測戰
    if (a.startsWith('tga') && tgaAct(a, act)) return;
    // 點播台
    if (a === 'askmode') { const pre = ASK.pre; ASK.mode = act.dataset.v; ASK.pre = pre && pre.mode === ASK.mode ? pre : null; sfx.click(); VIEW().innerHTML = renderAsk(); askFx(); return; }
    if (a === 'askchip') { const ta = $('#askq'); if (ta) { const q = QUICK[+act.dataset.i]; ta.value = ta.value.trim() ? ta.value.trim() + ' ' + q : q; ta.focus(); } sfx.pop(); return; }
    if (a === 'asksend') { askSend(); return; }
    if (a === 'askq') { closeSheet(); ASK.pre = { mode: 'ask', q: act.dataset.q || '', ref: act.dataset.ref || '', ctx: act.dataset.ctx || '' }; ASK.mode = 'ask'; NAVN++; if (ROUTE === 'ask') route(); else location.hash = 'ask'; return; }
    if (a === 'askreq') { closeSheet(); ASK.pre = { mode: 'req', game: act.dataset.g || '', appid: act.dataset.a || '' }; ASK.mode = 'req'; NAVN++; if (ROUTE === 'ask') route(); else location.hash = 'ask'; return; }
    if (a === 'askthis') { askSheet(act.dataset.k, S.curId); return; }
    if (a === 'asksheet') { const q = ($('#askq') || {}).value || ''; if (q.trim().length < 4) { toast('問題寫長一點點', 'warn'); return; } askEmit('ask', { q: q.trim().slice(0, 600), ref: act.dataset.ref, ctx: (act.dataset.ctx || '').slice(0, 120) }); sfx.radio(); burstAt(act, [PINK, YEL, BLK], 18, 9); closeSheet(); const nx = nextShift('ask'); toast(`送出了！下一班 ${nx.at} ${nx.name}會回答`); const box = $('.qa-box'); const html = askBoxFor(act.dataset.ref); if (box) box.outerHTML = html; else { const br = $('.askthis'); if (br) br.closest('.btnrow').insertAdjacentHTML('afterend', html); } setTabs(ROUTE.startsWith('p/') ? 'picks' : ''); return; }
    if (a === 'askpack') { askPack(act.dataset.k, act.dataset.id); return; }
    if (a === 'askchat') { askChat(act.dataset.id); return; }
    // 免費補給站
    if (a === 'frgo') { ev.stopPropagation(); S.freeSeen[act.dataset.id] = 1; LS.set('freeSeen', S.freeSeen); sfx.coin(); window.open(act.getAttribute('href'), '_blank', 'noopener'); return; }
    if (a === 'frgot') {
      const id = act.dataset.id; if (S.freeGot[id]) delete S.freeGot[id]; else { S.freeGot[id] = todayTW(); sfx.coin(); burstAt(act, [YEL, PINK], 16, 9); } LS.set('freeGot', S.freeGot);
      if (act.closest('#sheet')) { const got = !!S.freeGot[id]; act.classList.toggle('k', got); act.textContent = got ? '✓ 領過了' : '標記領過'; }   // 情報卡裡按的：卡片上的字跟著改
      if (ROUTE.startsWith('hunt')) { const y = scrollY; huntStop(); VIEW().innerHTML = renderHunt(); scrollTo(0, y); huntFx(); setTabs('hunt'); }
      return;
    }
    if (a === 'hunwant') { delete S.marks[act.dataset.id]; save('marks'); closeSheet(); sfx.scratch(); toast('已經從獵物移除'); if (ROUTE.startsWith('hunt')) route(); return; }
    if (a === 'ha-go' || a === 'ha-x') { huntAlertClose(a === 'ha-go'); return; }
    if (a === 'jump') { const el = document.getElementById(act.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); sfx.click(); return; }
    if (a === 'fact') { act.classList.toggle('open'); sfx.click(); return; }
    if (a === 'play') { playVideo(+act.dataset.i); return; }
    if (a === 'vt') { stopVideo(); $$('.vtab').forEach((t) => t.classList.toggle('on', t === act)); $('#tvbox').innerHTML = trailerBox(S.curMedia.vids[+act.dataset.i], +act.dataset.i); sfx.click(); return; }
    if (a === 'lb') { openLightbox(+act.dataset.i); sfx.pop(); return; }
    if (a === 'lbn') { ev.stopPropagation(); openLightbox(LBI + (+act.dataset.d)); sfx.click(); return; }
    if (a === 'spoil') { act.closest('.spoil').classList.add('open'); sfx.rip(); haptic(20); burstAt(act, ['#FFE600', '#111'], 16, 8); return; }
    if (a === 'mark') {
      const k = act.dataset.k; const id = S.curId; S.marks[id] = S.marks[id] === k ? undefined : k; if (!S.marks[id]) delete S.marks[id]; save('marks');
      $$('.mkb').forEach((b) => b.classList.toggle('on', b.dataset.k === S.marks[id])); sfx.slap(); haptic(); burstAt(act, ['#FFE600', '#FF2E88'], 14, 8);
      if (S.marks[id] === 'want') { const it = findItem(id); const inWish = it && it.steam && ((S.wish && S.wish.items) || []).some((w) => w.appid === it.steam); toast(inWish ? '收進獵價（它也在你的 Steam 願望單上）' : '收進獵價：一特價就會跳出來'); }
      setTabs(ROUTE.startsWith('p/') ? 'picks' : ''); return;
    }
    if (a === 'speak') { speakFeature(); sfx.click(); return; }
    if (a === 'lf') {
      LIBF[act.dataset.k] = act.dataset.v; sfx.click(); MORE_N.lib = MORE_STEP.lib;
      const y = scrollY; VIEW().innerHTML = renderLib(); scrollTo(0, y); trayUpdate(); moreFx(); return;
    }
    if (a === 'cmp') {
      ev.stopPropagation(); const id = act.dataset.id; const i = S.cmp.indexOf(id);
      if (i >= 0) S.cmp.splice(i, 1); else { if (S.cmp.length >= 3) { toast('最多比較 3 款', 'warn'); return; } S.cmp.push(id); }
      save('cmp'); act.classList.toggle('on', S.cmp.includes(id)); act.textContent = S.cmp.includes(id) ? '✓' : '+'; sfx.pop(); trayUpdate(); return;
    }
    if (a === 'cmpgo') { if (S.cmp.length < 2) return; if (S.cmp.length === 2) { NAVN++; location.hash = 'vs/' + S.cmp.map((id) => 'f:' + id).join(','); return; } openSheet(await compareHtml(), 'wide'); return; }
    if (a === 'cmpclear') { S.cmp = []; save('cmp'); trayUpdate(); $$('.cmpbtn').forEach((b) => { b.classList.remove('on'); b.textContent = '+'; }); sfx.scratch(); return; }
    if (a === 'settings') { openSheet(settingsHtml()); return; }
    if (a === 'skinsheet') { audioInit(); openSkinSheet(); return; }   // 換裝選單
    if (a.startsWith('db') && dbAct(a, act)) return;   // 資料庫
    if (a === 'search') { DB.mode = 'all'; DB.focus = true; sfx.click(); closeSheet(); if (ROUTE === 'lib') route(); else { NAVN++; location.hash = 'lib'; } return; }
    if (a === 'hub') { audioInit(); openHub(); return; }
    if (a === 'hubfx') { S.settings.fx = S.settings.fx === 'full' ? 'calm' : 'full'; save('settings'); document.body.classList.toggle('calm', S.settings.fx !== 'full'); sfx.click(); hubSync(); return; }
    if (a === 'hubfree') { closeSheet(); S.jump = '.dl-free'; sfx.click(); if (ROUTE === 'hunt') route(); else { NAVN++; location.hash = 'hunt'; } return; }
    if (a === 'tour') { closeSheet(); setTimeout(() => tourStart(true), 250); return; }
    if (a === 'skin') { audioInit(); skinSwitch(act.dataset.k); return; }
    if (a === 'set') {
      let v = act.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false;
      S.settings[act.dataset.k] = v; save('settings');
      if (act.dataset.k === 'shSound') SH.snd = null;
      if (act.dataset.k === 'shAuto' && SV) SV.loop = !v;
      if (act.dataset.k === 'sfx' || act.dataset.k === 'bgm') { audioInit(); audioApply(); }
      document.body.classList.toggle('calm', S.settings.fx !== 'full');
      $('.sbox').innerHTML = `<button class="ib sclose" data-act="close" aria-label="關閉">${ICON.x}</button>` + settingsHtml(); sfx.click(); topIcons(); return;
    }
    if (a === 'wipe') {
      if (!act.dataset.sure) { act.dataset.sure = 1; act.textContent = '再按一次確認'; return; }
      ['marks', 'notes', 'thoughts', 'posted', 'edits', 'cmp'].forEach((k) => { S[k] = Array.isArray(S[k]) ? [] : {}; save(k); });
      toast('已清除'); closeSheet(); route(); return;
    }
    if (a === 'sfx') { audioInit(); S.settings.sfx = !S.settings.sfx; if (S.settings.sfx) S.muted = false; save('settings'); topIcons(); sfx.stamp(); hubSync(); toast(S.settings.sfx ? '音效：開' : '音效：關'); return; }
    if (a === 'bgm') { audioInit(); S.settings.bgm = !S.settings.bgm; if (S.settings.bgm) S.muted = false; save('settings'); audioApply(); topIcons(); sfx.scratch(); hubSync(); toast(S.settings.bgm ? '配樂：開' : '配樂：關'); return; }
    // 粉專
    const fid = ROUTE.startsWith('fan/') ? ROUTE.split('/')[1] : null;
    if (fid && fid.startsWith('w:') && await weekFanAct(a, act, fid.slice(2))) return;
    if (a === 'cl' || a === 'cr' || a === 'respray') {
      if (a === 'cl') CARD.layout = act.dataset.v; if (a === 'cr') CARD.ratio = act.dataset.v; if (a === 'respray') { CARD.seed++; sfx.rattle(); setTimeout(() => sfx.hiss(0.6), 200); } else sfx.click();
      $$('[data-act="cl"]').forEach((b) => b.classList.toggle('y', b.dataset.v === CARD.layout)); $$('[data-act="cr"]').forEach((b) => b.classList.toggle('y', b.dataset.v === CARD.ratio));
      await cardRender(await loadFeature(fid)); if (a === 'respray') burstAt($('#cardcv'), ['#FF2E88', '#FFE600', '#111'], 26, 12); return;
    }
    if (a === 'cdl' || a === 'cshare') {
      const b = await cardBlob();
      if (!b) { toast('這張圖卡含有外部圖片，裝置不讓存。換「重噴一張」再試，或直接截圖。', 'warn'); return; }
      const name = `unpacked-${fid}-${CARD.layout}${CARD.ratio}.png`;
      if (a === 'cshare') {
        const file = new File([b], name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return; }
      }
      const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      sfx.stamp(); impact($('#cardcv'), ['#FF2E88', '#FFE600'], false); toast('圖卡已下載'); return;
    }
    if (a === 'copy') {
      const f = await loadFeature(fid); const fp = f.fanpage; const post = $('#posttxt') ? $('#posttxt').value : fp.post;
      const w = act.dataset.what;
      const text = w === 'post' ? post : w === 'full' ? post + '\n\n' + fp.tags.join(' ') : w === 'title' ? fp.titles[+act.dataset.i] : w === 'tags' ? fp.tags.join(' ') : fp.script;
      if (await copyText(text)) { sfx.stamp(); haptic(); burstAt(act, ['#FFE600', '#FF2E88', '#111'], 14, 8); toast('已複製'); } else toast('複製失敗，請長按文字自己複製', 'warn');
      return;
    }
    if (a === 'postreset') { delete S.edits[fid]; save('edits'); route(); return; }
    if (a === 'posted') {
      if (S.posted[fid]) delete S.posted[fid]; else S.posted[fid] = todayTW(); save('posted');
      act.textContent = S.posted[fid] ? '已發佈（點一下取消）' : '標記為已發佈'; act.classList.toggle('p', !S.posted[fid]);
      if (S.posted[fid]) { sfx.ding(); impact(act, ['#e3001b', '#FFE600', '#111'], true); toast('蓋章！已發佈'); } else sfx.scratch();
      setTabs('fan'); return;
    }
    return;
  }
  if (go) {
    ev.preventDefault(); const to = go.dataset.go;
    if (to === location.hash.replace('#', '')) return;
    if (to === 'shorts' && ROUTE.startsWith('shorts')) { shGo(0); sfx.whoosh(); return; }   // 已經在短影音：回到最上面
    sfx.slap(); haptic();
    NAVN++; location.hash = to;
  }
});
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'dbq') { dbInput(t); return; }
  if (t.id === 'libq') {
    LIBF.q = t.value; const g = $('#libgrid'); if (!g) return;
    const old = $('.more-s[data-more="lib"]'); if (old) old.remove();
    g.outerHTML = libGridHtml(true); moreFx(); return;
  }
  const a = t.dataset && t.dataset.act;
  if (a && a.startsWith('op') && opsInput(t)) return;
  if (a === 'thought') { S.thoughts[t.dataset.k] = t.value; save('thoughts'); return; }
  if (a === 'note') { S.notes[S.curId] = t.value; save('notes'); return; }
  if (a === 'postedit') {
    const fid = ROUTE.split('/')[1]; S.edits[fid] = t.value; save('edits'); const c = $('#postcnt'); if (c) c.textContent = t.value.length + ' 字';
    clearTimeout(OPS.pt); OPS.pt = setTimeout(() => opsPfRefresh(fid.startsWith('w:') ? fid : 'f:' + fid), 700);   // 三平台版本跟著原稿更新
    return;
  }
  if (a === 'vol') { S.settings[t.dataset.k] = +t.value; save('settings'); audioApply(); if (t.dataset.k === 'vol') sfx.blip(1200); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); if (shKeys(e)) return; if ($('#sheet.on .lb')) { if (e.key === 'ArrowRight') openLightbox(LBI + 1); if (e.key === 'ArrowLeft') openLightbox(LBI - 1); } });

function topIcons() {
  const a = $('[data-act="sfx"]'), b = $('[data-act="bgm"]');
  if (a) { a.innerHTML = S.settings.sfx && !S.muted ? ICON.can : ICON.canoff; a.classList.toggle('on', S.settings.sfx && !S.muted); a.classList.toggle('off', !(S.settings.sfx && !S.muted)); }
  if (b) { b.innerHTML = ICON.boom; b.classList.toggle('on', S.settings.bgm && !S.muted); b.classList.toggle('off', !(S.settings.bgm && !S.muted)); }
}

/* ---- 啟動 ---- */
async function boot() {
  skinApply(skinId()).then((ok) => { if (!ok) { S.settings.skin = 'graffiti'; save('settings'); } });   // 開頭的小程式已經把 CSS 接上了，這裡只補齊其他設定
  fxInit();
  document.body.classList.toggle('calm', S.settings.fx !== 'full');
  $('#top').innerHTML = topBarHtml();
  $('#tabs').innerHTML = `<button class="tab" data-go="home">${ICON.home}<span>今日</span></button><button class="tab" data-go="picks">${ICON.gem}<span>推坑</span><i class="dot hide"></i></button><button class="tab" data-go="shorts">${ICON.shorts}<span>短影音</span><i class="dot hide"></i></button><button class="tab" data-go="hunt">${ICON.target}<span>獵價</span><i class="dot hide"></i></button><button class="tab" data-go="lib">${ICON.box}<span>資料庫</span></button><button class="tab" data-go="fan">${ICON.mega}<span>粉專</span><i class="dot hide"></i></button>`;
  topIcons();
  let ok = true;
  try { await loadIndex(); } catch (e) { ok = false; console.error(e); }
  if (!ok) { S.index = { items: [], n: 0 }; S.live = { apps: {} }; }
  tapeText();
  if (ok) livePrefetch();
  const gate = $('#gate');
  const enter = async (muted) => {
    audioInit(); S.muted = !!muted; topIcons();
    gate.remove();
    const today = todayTW(); const mode = S.settings.intro;
    let want = mode === 'off' ? null : mode === 'always' ? 'full' : mode === 'short' ? 'short' : (LS.get('introDay', '') === today ? 'short' : 'full');
    // 開場有新段落時（INTRO_REV），更新後第一次打開照樣播完整版，不用等到明天
    if (want === 'short' && mode !== 'short' && (+LS.get('introRev', 0) || 0) < INTRO_REV) want = 'full';
    LS.set('introDay', today); LS.set('introRev', INTRO_REV);
    const nToday = S.index.items.filter((x) => x.date === (S.index.items[0] || {}).date).length;
    S.introPending = !!want;
    route();
    if (want) { try { await Promise.race([document.fonts.load('900 120px "Noto Sans TC"', '解包'), sleep(700)]); } catch (e) { /* */ } await runIntro(want, nToday); }
    S.introPending = false; if (ROUTE === 'home' || ROUTE === '') homeDrop();
    bgmStart();
    setTimeout(huntAlert, 500);
    // 第一次導覽（改版後第一次也會）：等獵物警報、疊層都關了再開始
    if ((+LS.get('tourDone', 0) || 0) < TOUR_REV) { let n = 0; const tk = setInterval(() => { if (++n > 40) { clearInterval(tk); return; } if (!$('#halert.on') && !$('#sheet.on') && !S.introPending && !$('#intro')) { clearInterval(tk); setTimeout(() => tourStart(), 900); } }, 700); }
    setTimeout(() => dbLoad(), 4000);   // 閒下來先把資料庫載好（全部功能的數字、搜尋馬上能用）
    if (!ok) toast('資料讀不到，檢查一下網路', 'warn');
  };
  gate.addEventListener('click', (e) => { e.stopPropagation(); enter(!!e.target.closest('.gm')); }, { once: true });
  addEventListener('hashchange', route);
  addEventListener('online', () => askFlush());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) askFlush(); });
  setTimeout(() => askFlush(), 2500);
  if ('serviceWorker' in navigator && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
  // 每 20 分鐘看一次有沒有新資料（App 開著的時候）
  setInterval(async () => { try { const old = S.index && S.index.at; const unread = askUnread(); await loadIndex(); if (S.index.at !== old) { tapeText(); if (ROUTE === 'home' || ROUTE === '') route(); toast('有新的解包！'); } else if (askUnread() > unread) toast('點播台有新的回覆！'); setTabs(ROUTE.split('/')[0]); } catch (e) { /* */ } }, 20 * 60e3);
  // 自動測試用：?enter=1 直接進
  if (/[?&]enter=1/.test(location.search)) gate.click();
}
boot();

/* ---------- 換新版（2026/11/18）----------
   加到主畫面的 App 切回來不會重新載入，所以回到 App 時看一下網站上的 ver.json：已經是新版就重新載入
   （剛切回來、沒在打字、沒開著東西才自動換；不然頂端出一顆「有新版本・點一下更新」）。一分鐘最多看一次；
   自動重新載入之後 60 秒內不再自動換（網站快取還沒換完時不會一直重整）。 */
const Fresh = {
  at: 0, busy: false, shown: false, hid: 0,
  async check(back) {
    if (location.protocol === 'file:' || this.busy || !navigator.onLine) return;
    const now = Date.now(); if (now - this.at < 60e3) return; this.at = now; this.busy = true;
    try {
      const r = await fetch('ver.json?t=' + now, { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); if (!j || !j.v || j.v === VERSION) return;
      let last = 0; try { last = +sessionStorage.getItem('freshAt') || 0; } catch (e) { /* 無痕模式 */ }
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (back && !typing && (!$('#sheet.on') && !S.introPending && !ROUTE.startsWith('shorts')) && now - last > 60e3) { this.reload(); return; }
      this.chip();
    } catch (e) { /* 連不上就下次再看 */ } finally { this.busy = false; }
  },
  reload() { try { sessionStorage.setItem('freshAt', String(Date.now())); } catch (e) { /* 無痕模式 */ } location.reload(); },
  chip() {
    if (this.shown) return; this.shown = true;
    const b = document.createElement('button'); b.className = 'fresh-chip'; b.type = 'button'; b.textContent = '有新版本・點一下更新';
    b.addEventListener('click', (ev) => { ev.stopPropagation(); this.reload(); });
    document.body.appendChild(b);
  },
};
document.addEventListener('visibilitychange', () => { if (document.hidden) Fresh.hid = Date.now(); else Fresh.check(Fresh.hid > 0 && Date.now() - Fresh.hid > 2000); });
addEventListener('pageshow', (e) => { if (e.persisted) { Fresh.at = 0; Fresh.check(true); } });
setTimeout(() => Fresh.check(false), 6000);
setInterval(() => { if (!document.hidden) Fresh.check(false); }, 10 * 60e3);

/* 換裝：各套的音色、配樂在 skins/<名字>.js（換上那一套才載入）。先載到的排在 __skinQ，這裡一次接上；之後載到的直接接上 */
(window.__skinQ || []).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
window.__skinQ = { push: (f) => { try { f(); } catch (e) { console.error(e); } } };
