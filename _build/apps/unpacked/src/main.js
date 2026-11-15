/* 解包 — 啟動、路由、互動 */
const VIEW = () => $('#view');
let ROUTE = '';
let NAVN = 0;   // App 裡往前走了幾步（「回牆上」才知道能不能用上一頁）

function setTabs(name) {
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.go === name));
  const wait = S.index ? S.index.items.filter((x) => !S.posted[x.id]).length : 0;
  const dot = $('.tab[data-go="fan"] .dot'); if (dot) { dot.textContent = wait; dot.classList.toggle('hide', !wait); }
}
function tapeText() {
  const it = S.index ? S.index.items : []; const last = it[0] && it[0].date;
  const today = it.filter((x) => x.date === last);
  const names = today.map((x) => `<b>${esc(x.zh)}</b>`).join(' ★ ');
  const one = `痞子葳，${last === todayTW() ? '今天' : mdDay(last || todayTW())}解包 ${today.length} 款 ★ ${names} ★ 好遊戲不錯過，雷遊戲不踩過 ★ GAME RHAPSODY ★ `;
  $('#tape').innerHTML = `<span class="in">${one}${one}</span>`;
}

async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'home';
  const [name, arg] = h.split('/');
  const prev = ROUTE; ROUTE = h;
  if (prev && !prev.startsWith('f/')) S.scroll[prev] = scrollY;
  stopVideo(); stopSpeak();
  const v = VIEW();
  try {
    if (name === 'f' && arg) {
      setTabs('');
      if (prev !== h) await unpackAnim(arg);
      v.innerHTML = await renderFeature(arg);
      S.seen[arg] = 1; save('seen');
      afterFeature();
      scrollTo(0, 0);
    } else if (name === 'lib') { setTabs('lib'); v.innerHTML = renderLib(); trayUpdate(); restoreScroll(h); }
    else if (name === 'fan' && arg) { setTabs('fan'); v.innerHTML = await renderFanDetail(arg); scrollTo(0, 0); cardRender(await loadFeature(arg)); }
    else if (name === 'fan') { setTabs('fan'); v.innerHTML = renderFanList(); restoreScroll(h); }
    else { setTabs('home'); v.innerHTML = renderHome(); restoreScroll('home'); }
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="empty">這頁打不開：${esc(e.message)}<br><button class="btn y" style="margin-top:12px" onclick="location.hash='home'">回牆上</button></div>`;
  }
  if (!h.startsWith('lib')) $('#tray').classList.remove('on');
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
}
function restoreScroll(k) { const y = S.scroll[k] || 0; requestAnimationFrame(() => scrollTo(0, y)); }

/* ---- 「解包中」轉場 ---- */
async function unpackAnim(id) {
  const it = (S.index.items.find((x) => x.id === id) || {});
  if (!fxOn()) return;
  const el = document.createElement('div'); el.id = 'unpack';
  const lines = ['/資訊', '/影像', '/玩法', '/幕後', '/風向', '/討論'];
  el.innerHTML = `<div class="box"><div class="nm">${esc(it.zh || id)}</div><div class="ln">&gt; UNPACKING ${esc(id)}.pak</div>${lines.map((l) => `<div class="ln" style="opacity:0">  ${l.padEnd(8, ' ')}.......... <span class="ok">OK</span></div>`).join('')}<div class="bar"><i></i></div></div>`;
  document.body.appendChild(el); sfx.rattle();
  const lns = $$('.ln', el).slice(1); const bar = $('.bar i', el);
  for (let i = 0; i < lns.length; i++) { await sleep(70); lns[i].style.opacity = 1; sfx.type(); bar.style.transform = `scaleX(${(i + 1) / lns.length})`; }
  await sleep(90); sfx.stamp();
  el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.06)' }], { duration: 200, easing: 'ease-in' }).onfinish = () => el.remove();
  await sleep(120);
}

function afterFeature() {
  const seal = $('.verdict .seal');
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
function stopVideo() {
  const tv = $('#tvbox iframe, #tvbox video');
  if (tv) { try { if (tv.tagName === 'VIDEO') tv.pause(); } catch (e) { /* */ } tv.remove(); }
  if (HLS) { try { HLS.destroy(); } catch (e) { /* */ } HLS = null; }
  bgmDuck(false);
}
async function playVideo(i) {
  const v = S.curMedia && S.curMedia.vids[i]; if (!v) return;
  const box = $('#tvbox .tv'); if (!box) return;
  sfx.click(); bgmDuck(true); box.removeAttribute('data-act');
  if (v.kind === 'yt') {
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title)}"></iframe>`;
    return;
  }
  const vid = document.createElement('video'); vid.controls = true; vid.playsInline = true; vid.autoplay = true; if (v.poster) vid.poster = v.poster;
  box.innerHTML = ''; box.appendChild(vid);
  const isHls = /\.m3u8(\?|$)/.test(v.src);
  if (!isHls || vid.canPlayType('application/vnd.apple.mpegurl')) { vid.src = v.src; vid.play().catch(() => {}); return; }
  try {
    const { default: Hls } = await import('./vendor/hls.light.min.mjs');
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
  const f = await loadFeature(S.curId);
  const parts = [f.game.zh, f.headline, f.hook, '結論：' + f.verdict.stamp + '，' + f.verdict.summary, ...f.sections.gameplay.body, '玩家怎麼說：誇的是，' + f.sections.voices.pros.join('；') + '。罵的是，' + f.sections.voices.cons.join('；')];
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
  const shots = (S.curMedia && S.curMedia.shots) || []; if (!shots.length) return;
  LBI = (i + shots.length) % shots.length;
  const s = $('#sheet'); s.innerHTML = `<div class="sbg" data-act="close"></div><div class="lb" data-act="close"><img src="${esc(shots[LBI])}" alt=""><button class="lbp" data-act="lbn" data-d="-1">‹</button><button class="lbx" data-act="lbn" data-d="1">›</button><div class="lbn">${LBI + 1} / ${shots.length}</div></div>`;
  s.classList.add('on');
  let x0 = null; const lb = $('.lb', s);
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { openLightbox(LBI + (dx < 0 ? 1 : -1)); sfx.click(); } x0 = null; });
}
function trayUpdate() { const t = $('#tray'); t.innerHTML = trayHtml(); t.classList.toggle('on', S.cmp.length > 0 && ROUTE.startsWith('lib')); }

/* ---- 點擊總機 ---- */
document.addEventListener('click', async (ev) => {
  const go = ev.target.closest('[data-go]'); const act = ev.target.closest('[data-act]');
  if (act && (!go || go.contains(act))) {
    const a = act.dataset.act;
    if (a === 'close') { if (ev.target.closest('.lb button')) return; closeSheet(); return; }
    ev.preventDefault();
    if (a === 'back') { sfx.scratch(); if (NAVN > 0) { NAVN--; history.back(); } else location.hash = 'home'; return; }
    if (a === 'jump') { const el = document.getElementById(act.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); sfx.click(); return; }
    if (a === 'fact') { act.classList.toggle('open'); sfx.click(); return; }
    if (a === 'play') { playVideo(+act.dataset.i); return; }
    if (a === 'vt') { stopVideo(); $$('.vtab').forEach((t) => t.classList.toggle('on', t === act)); $('#tvbox').innerHTML = trailerBox(S.curMedia.vids[+act.dataset.i], +act.dataset.i); sfx.click(); return; }
    if (a === 'lb') { openLightbox(+act.dataset.i); sfx.pop(); return; }
    if (a === 'lbn') { ev.stopPropagation(); openLightbox(LBI + (+act.dataset.d)); sfx.click(); return; }
    if (a === 'spoil') { act.closest('.spoil').classList.add('open'); sfx.rip(); haptic(20); burstAt(act, ['#FFE600', '#111'], 16, 8); return; }
    if (a === 'mark') {
      const k = act.dataset.k; const id = S.curId; S.marks[id] = S.marks[id] === k ? undefined : k; if (!S.marks[id]) delete S.marks[id]; save('marks');
      $$('.mkb').forEach((b) => b.classList.toggle('on', b.dataset.k === S.marks[id])); sfx.slap(); haptic(); burstAt(act, ['#FFE600', '#FF2E88'], 14, 8); return;
    }
    if (a === 'speak') { speakFeature(); sfx.click(); return; }
    if (a === 'lf') {
      LIBF[act.dataset.k] = act.dataset.v; sfx.click();
      const y = scrollY; VIEW().innerHTML = renderLib(); scrollTo(0, y); trayUpdate(); return;
    }
    if (a === 'cmp') {
      ev.stopPropagation(); const id = act.dataset.id; const i = S.cmp.indexOf(id);
      if (i >= 0) S.cmp.splice(i, 1); else { if (S.cmp.length >= 3) { toast('最多比較 3 款', 'warn'); return; } S.cmp.push(id); }
      save('cmp'); act.classList.toggle('on', S.cmp.includes(id)); act.textContent = S.cmp.includes(id) ? '✓' : '+'; sfx.pop(); trayUpdate(); return;
    }
    if (a === 'cmpgo') { if (S.cmp.length < 2) return; openSheet(await compareHtml(), 'wide'); return; }
    if (a === 'cmpclear') { S.cmp = []; save('cmp'); trayUpdate(); $$('.cmpbtn').forEach((b) => { b.classList.remove('on'); b.textContent = '+'; }); sfx.scratch(); return; }
    if (a === 'settings') { openSheet(settingsHtml()); return; }
    if (a === 'set') {
      let v = act.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false;
      S.settings[act.dataset.k] = v; save('settings');
      if (act.dataset.k === 'sfx' || act.dataset.k === 'bgm') { audioInit(); audioApply(); }
      document.body.classList.toggle('calm', S.settings.fx !== 'full');
      $('.sbox').innerHTML = `<button class="ib sclose" data-act="close" aria-label="關閉">${ICON.x}</button>` + settingsHtml(); sfx.click(); topIcons(); return;
    }
    if (a === 'wipe') {
      if (!act.dataset.sure) { act.dataset.sure = 1; act.textContent = '再按一次確認'; return; }
      ['marks', 'notes', 'thoughts', 'posted', 'edits', 'cmp'].forEach((k) => { S[k] = Array.isArray(S[k]) ? [] : {}; save(k); });
      toast('已清除'); closeSheet(); route(); return;
    }
    if (a === 'sfx') { audioInit(); S.settings.sfx = !S.settings.sfx; if (S.settings.sfx) S.muted = false; save('settings'); topIcons(); sfx.stamp(); toast(S.settings.sfx ? '音效：開' : '音效：關'); return; }
    if (a === 'bgm') { audioInit(); S.settings.bgm = !S.settings.bgm; if (S.settings.bgm) S.muted = false; save('settings'); audioApply(); topIcons(); sfx.scratch(); toast(S.settings.bgm ? '背景鼓組：開' : '背景鼓組：關'); return; }
    // 粉專
    const fid = ROUTE.startsWith('fan/') ? ROUTE.split('/')[1] : null;
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
    sfx.slap(); haptic();
    NAVN++; location.hash = to;
  }
});
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'libq') { LIBF.q = t.value; const g = $('#libgrid'); if (g) g.innerHTML = libItems().map((x, i) => miniHtml(x, i, true)).join('') || '<div class="empty">沒有符合的遊戲。</div>'; return; }
  const a = t.dataset && t.dataset.act;
  if (a === 'thought') { S.thoughts[t.dataset.k] = t.value; save('thoughts'); return; }
  if (a === 'note') { S.notes[S.curId] = t.value; save('notes'); return; }
  if (a === 'postedit') { const fid = ROUTE.split('/')[1]; S.edits[fid] = t.value; save('edits'); const c = $('#postcnt'); if (c) c.textContent = t.value.length + ' 字'; return; }
  if (a === 'vol') { S.settings[t.dataset.k] = +t.value; save('settings'); audioApply(); if (t.dataset.k === 'vol') sfx.blip(1200); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); if ($('#sheet.on .lb')) { if (e.key === 'ArrowRight') openLightbox(LBI + 1); if (e.key === 'ArrowLeft') openLightbox(LBI - 1); } });

function topIcons() {
  const a = $('[data-act="sfx"]'), b = $('[data-act="bgm"]');
  if (a) { a.innerHTML = S.settings.sfx && !S.muted ? ICON.can : ICON.canoff; a.classList.toggle('on', S.settings.sfx && !S.muted); a.classList.toggle('off', !(S.settings.sfx && !S.muted)); }
  if (b) { b.innerHTML = ICON.boom; b.classList.toggle('on', S.settings.bgm && !S.muted); b.classList.toggle('off', !(S.settings.bgm && !S.muted)); }
}

/* ---- 啟動 ---- */
async function boot() {
  fxInit();
  document.body.classList.toggle('calm', S.settings.fx !== 'full');
  $('#top').innerHTML = `<div class="logo" data-go="home"><b>解包</b><i>UNPACKED</i></div><span class="sp"></span>
    <button class="ib" data-act="sfx" aria-label="音效"></button><button class="ib" data-act="bgm" aria-label="背景鼓組"></button><button class="ib" data-act="settings" aria-label="設定">${ICON.gear}</button>`;
  $('#tabs').innerHTML = `<button class="tab" data-go="home">${ICON.home}<span>今日</span></button><button class="tab" data-go="lib">${ICON.box}<span>庫存</span></button><button class="tab" data-go="fan">${ICON.mega}<span>粉專</span><i class="dot hide"></i></button>`;
  topIcons();
  let ok = true;
  try { await loadIndex(); } catch (e) { ok = false; console.error(e); }
  if (!ok) { S.index = { items: [], n: 0 }; S.live = { apps: {} }; }
  tapeText();
  const gate = $('#gate');
  const enter = async (muted) => {
    audioInit(); S.muted = !!muted; topIcons();
    gate.remove();
    const today = todayTW(); const mode = S.settings.intro;
    const want = mode === 'off' ? null : mode === 'always' ? 'full' : mode === 'short' ? 'short' : (LS.get('introDay', '') === today ? 'short' : 'full');
    LS.set('introDay', today);
    const nToday = S.index.items.filter((x) => x.date === (S.index.items[0] || {}).date).length;
    route();
    if (want) { try { await Promise.race([document.fonts.load('900 120px "Noto Sans TC"', '解包'), sleep(700)]); } catch (e) { /* */ } await runIntro(want, nToday); }
    bgmStart();
    if (!ok) toast('資料讀不到，檢查一下網路', 'warn');
  };
  gate.addEventListener('click', (e) => { e.stopPropagation(); enter(!!e.target.closest('.gm')); }, { once: true });
  addEventListener('hashchange', route);
  if ('serviceWorker' in navigator && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
  // 每 20 分鐘看一次有沒有新資料（App 開著的時候）
  setInterval(async () => { try { const old = S.index && S.index.at; await loadIndex(); if (S.index.at !== old) { tapeText(); if (ROUTE === 'home' || ROUTE === '') route(); toast('有新的解包！'); } } catch (e) { /* */ } }, 20 * 60e3);
  // 自動測試用：?enter=1 直接進
  if (/[?&]enter=1/.test(location.search)) gate.click();
}
boot();
