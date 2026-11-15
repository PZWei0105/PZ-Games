/* ───────── 門：書房的鎖、單行本的連結 ─────────
   書房：第一次打開要輸入密語（或備用碼），這台裝置之後就記得。
   單行本：網址 #k= 帶著這一本的鑰匙；少了、錯了、被收回，都在這裡跟讀者說清楚。 */
const Gate = (() => {
  const box = $('#gate');
  let done = null, busy = false, masked = false;
  const STUDY = { id: 'pz-study', title: '下回分解', cover: { cloth: '#1d2f4a', seal: '回', motif: 'moon' } };
  const LOCK_SVG = '<svg class="gt-clasp" viewBox="0 0 120 300" aria-hidden="true">'
    + '<defs><linearGradient id="gtBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d9a0"/><stop offset=".45" stop-color="#c9a45c"/><stop offset="1" stop-color="#7a5a26"/></linearGradient>'
    + '<linearGradient id="gtStrap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a1f17"/><stop offset=".5" stop-color="#5a3122"/><stop offset="1" stop-color="#2a150f"/></linearGradient></defs>'
    + '<g class="gt-strap"><rect x="0" y="128" width="120" height="44" rx="3" fill="url(#gtStrap)"/><path d="M4 134h112M4 166h112" stroke="#c9a45c" stroke-width="1" stroke-dasharray="4 4" opacity=".55"/></g>'
    + '<g class="gt-lock"><path class="gt-shackle" d="M44 128v-16a16 16 0 0 1 32 0v16" fill="none" stroke="url(#gtBrass)" stroke-width="7" stroke-linecap="round"/>'
    + '<rect x="30" y="122" width="60" height="58" rx="9" fill="url(#gtBrass)"/><rect x="30" y="122" width="60" height="58" rx="9" fill="none" stroke="#5c4319" stroke-width="1.5"/>'
    + '<circle cx="60" cy="146" r="6.5" fill="#3b2a10"/><path d="M57.5 149h5l1.5 14h-8z" fill="#3b2a10"/></g></svg>';

  function show(html, cls) {
    // 上一次開門／淡出的動畫（fill: forwards）會一直留著透明度 0：先取消，不然門擋著卻看不見
    if (box.getAnimations) box.getAnimations().forEach((a) => a.cancel());
    box.className = 'gate ' + cls; box.innerHTML = html; box.hidden = false; document.body.classList.add('gated');
  }
  function hide() { box.hidden = true; box.innerHTML = ''; box.className = 'gate'; document.body.classList.remove('gated'); }
  const msg = (t, bad) => { const m = $('.gt-msg', box); if (m) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); } };
  function shake() { const b = $('.gt-book, .gt-cv', box); if (b && b.animate && !REDUCED) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); if (navigator.vibrate) { try { navigator.vibrate([18, 40, 18]); } catch (e) {} } }
  function field(ph, label) {
    return '<form class="gt-form" autocomplete="off" novalidate><label class="gt-field"><input id="gtIn" type="text" placeholder="' + ph + '" aria-label="' + label + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">'
      + '<button type="button" class="gt-eye" data-gt="eye" aria-label="遮住或顯示">' + ICON.eye + '</button></label><button type="submit" class="btn gilt gt-go">' + (ED ? '打開' : '開門') + '</button></form>';
  }

  /* ── 書房的鎖 ── */
  async function ring() {
    for (const opt of [{ cache: 'no-store' }, {}]) {
      try { const r = await fetch('books/keyring.json' + (opt.cache ? '?t=' + Date.now() : ''), opt); if (r.ok) return await r.json(); } catch (e) {}
    }
    return null;
  }
  function lock(note) {
    masked = false;
    show('<div class="gt-in">'
      + '<div class="gt-book" aria-hidden="true"><div class="gt-glow"></div><div class="gt-cover">' + Cover.svg(STUDY, { k: 'gate' }) + '</div>' + LOCK_SVG + '</div>'
      + '<p class="gt-kick">痞子葳的書房</p><h1>上了鎖</h1>'
      + '<p class="gt-sub">' + esc(note || '輸入密語開門，這台裝置之後就記得你。') + '</p>'
      + field('密語', '密語') + '<p class="gt-msg" role="alert" aria-live="assertive"></p>'
      + '<p class="gt-note">忘了密語，用備用碼（16 碼英文數字）也能開；兩個都忘了，跟 Claude 說「重設書房的密語」。</p></div>', 'lockg');
    setTimeout(() => { const i = $('#gtIn'); if (i && !IS_IOS) i.focus(); }, 380);
    return new Promise((res) => { done = res; });
  }
  async function tryOpen() {
    const inp = $('#gtIn'), v = inp ? inp.value : '';
    if (busy) return;
    if (!Crypt.normPass(v)) { msg('先輸入密語', true); if (inp) inp.focus(); return; }
    busy = true; box.classList.add('busy'); msg('開鎖中……'); const go = $('.gt-go', box); if (go) go.disabled = true;
    await sleep(30);
    let km = null, why = '';
    const rg = await ring();
    if (!rg) why = navigator.onLine === false ? '現在沒有網路，連上之後再試一次' : '找不到書房的鎖，等一下再試';
    else { try { km = await Crypt.unlock(rg, v); } catch (e) { why = '這個瀏覽器開不了鎖：' + (e && e.message ? e.message : e); } }
    busy = false; box.classList.remove('busy'); if (go) go.disabled = false;
    if (!km) { msg(why || '密語不對，再想想', true); shake(); if (inp) { inp.select(); } return; }
    Vault.set(km); msg('開了，正在把書搬出來……');
    if (inp) inp.blur();
    box.classList.add('opened');
    Sound.unlock();
    const r = done; done = null; if (r) r();
  }
  /* 鎖打開：扣環鬆開、封面翻開，再把門拿掉（書房在底下已經排好了） */
  async function open() {
    if (box.hidden) return;
    box.classList.add('opening');
    const cv = $('.gt-cover', box), lk = $('.gt-lock', box), st = $('.gt-strap', box);
    try {
      if (!REDUCED && cv && cv.animate && lk && st) {
        Sound.open();
        lk.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(10px, 40px) rotate(24deg)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
        await st.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(60px)', opacity: 0 }], { duration: 380, delay: 140, easing: 'ease-in', fill: 'forwards' }).finished;
        await cv.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(116deg)' }], { duration: 560, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' }).finished;
        await box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
      }
    } catch (e) {}
    hide();
  }
  async function fade() {
    if (box.hidden) return;
    try { if (!REDUCED && box.animate) await box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished; } catch (e) {}
    hide();
  }

  /* ── 單行本的連結 ── */
  const LINK_MSG = {
    missing: '這個連結少了最後一段，所以打不開。請把對方傳給你的<b>完整連結</b>貼在下面。',
    bad: '這個連結打不開了：可能是作者換了新的連結。請向分享給你的人要一個新的，貼在下面。',
    gone: '這本書換了新的連結，舊的已經收起來了。請向分享給你的人要新的連結，貼在下面。',
    offline: '第一次打開要連上網路，把書下載下來；之後沒網路也能讀。',
    load: '正在翻開這本書……',
  };
  function edition(kind) {
    const b = { id: ED.ed, title: ED.title, cover: ED.cover };
    const input = kind !== 'load' && kind !== 'offline';
    show('<div class="gt-in">'
      + '<div class="gt-cv' + (kind === 'load' ? ' breathe' : '') + '" aria-hidden="true">' + Cover.svg(b, { k: 'gate' }) + '</div>'
      + '<h1 class="gt-t">' + esc(ED.title) + '</h1>' + (ED.author ? '<p class="gt-by">' + esc(ED.author) + '</p>' : '')
      + '<p class="gt-sub">' + LINK_MSG[kind] + '</p>'
      + (input ? field('貼上完整的連結', '完整的連結') + (navigator.clipboard && navigator.clipboard.readText ? '<button type="button" class="btn quiet gt-paste" data-gt="paste">' + ICON.copy + '從剪貼簿貼上</button>' : '') : '')
      + (kind === 'offline' ? '<button type="button" class="btn gilt gt-retry" data-gt="retry">再試一次</button>' : '')
      + '<p class="gt-msg" role="alert" aria-live="assertive"></p></div>', 'edg ' + kind);
    box.style.setProperty('--cloth', (ED.cover && ED.cover.cloth) || '#1d2f4a');
    if (input) { const eye = $('.gt-eye', box); if (eye) eye.remove(); }
  }
  /* 從貼上的文字找出 #k=（也接受只貼鑰匙） */
  function useLink(text) {
    text = String(text || '').trim();
    const m = text.match(/#k=([A-Za-z0-9_-]{22})/) || text.match(/^([A-Za-z0-9_-]{22})$/);
    if (!m || !Crypt.validKey(m[1])) { msg('這不是這本書的連結。連結最後面要有「#k=」和一串英文數字。', true); shake(); return; }
    const u = text.match(/https?:\/\/[^\s#]+/);
    if (u) {
      let to; try { to = new URL(u[0]); } catch (e) { to = null; }
      if (to && (to.origin !== location.origin || to.pathname.replace(/index\.html$/, '') !== location.pathname.replace(/index\.html$/, ''))) {
        msg('這是另一本書的連結，幫你打開……'); location.href = to.origin + to.pathname + '#k=' + m[1]; return;
      }
    }
    Store.set('k', m[1]);
    location.replace(location.pathname + location.search + '#k=' + m[1]);
    location.reload();
  }

  function init() {
    box.addEventListener('submit', (e) => { e.preventDefault(); const v = ($('#gtIn') || {}).value || ''; if (ED) useLink(v); else tryOpen(); });
    box.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-gt]'); if (!t) return;
      const a = t.dataset.gt;
      if (a === 'eye') { masked = !masked; const i = $('#gtIn'); if (i) i.classList.toggle('masked', masked); t.innerHTML = masked ? ICON.eyeOff : ICON.eye; if (i) i.focus(); }
      else if (a === 'paste') navigator.clipboard.readText().then((tx) => { const i = $('#gtIn'); if (i) i.value = tx; useLink(tx); }, () => msg('沒辦法讀剪貼簿，請在上面的格子裡長按、貼上', true));
      else if (a === 'retry') location.reload();
    });
    box.addEventListener('input', () => { const m = $('.gt-msg', box); if (m && m.classList.contains('bad')) msg(''); });
  }
  return { init, lock, open, fade, edition, hide, get shown() { return !box.hidden; } };
})();
