/* ==========================================================================
   21 門鎖畫面＋自動上鎖（用 20 的純邏輯）
   用法（App 開機時）：
     const lock = PZA.lock({
       ring: KEYRING,                       // 書房的 keyring（複製一份進 App，不要執行時去抓：App 要能離線打開）
       store: PZA.store('myapp.v1.'), key: 'lock',
       text: { kick: '痞子葳的', title: 'MyApp 上鎖了', sub: '輸入密語打開', button: '開門', note: '…' },
       art: () => '<svg>…</svg>',           // 門上的圖（每個 App 自己的樣子）
       gesture: () => audioInit(),          // 按下「開門」的當下（同步）要做的事：手機要在點擊當下喚醒聲音
       opened: (how) => {},                 // 打開了（'pass' 密語／'code' 備用碼／'skip' 本來就不用鎖）
       sfx: (name) => {},                   // 'bad'、'open'
     });
     await lock.gate();                      // 不用鎖就馬上回來（畫面一點都不會多）；要鎖就等打開
     lock.watch();                           // 依政策：離開時蓋住、回來時要不要再輸入
   設定頁：lock.status() 給文字、lock.setPolicy(p)、lock.lockNow()。
   樣子用 CSS 變數換：--pza-bg、--pza-fg、--pza-dim、--pza-accent、--pza-warn、--pza-field、--pza-font、--pza-title-font。
   ========================================================================== */
function makeLock(o) {
  const core = LockCore;
  const store = o.store, KEY = o.key || 'lock';
  const T = Object.assign({ kick: '痞子葳的 App', title: '上鎖了', sub: '輸入密語打開，這台裝置之後就記得你。', button: '開門',
    busy: '開鎖中……', bad: '密語不對，再想想', empty: '先輸入密語', field: '密語',
    note: '密語跟書房同一組；忘了的話，用備用碼（16 碼英文數字）也能開。兩個都忘了，跟 Claude 說「重設這個 App 的密語」。',
    nocrypto: '這個瀏覽器開不了鎖（要用 https 打開）', cover: '' }, o.text || {});
  const fire = (fn, ...a) => { try { if (typeof fn === 'function') return fn(...a); } catch (e) { if (typeof console !== 'undefined') console.error(e); } return undefined; };
  const rec = () => store.get(KEY, null);
  const save = (r) => store.set(KEY, r);
  let el = null, mode = '', busy = false, waiters = [], hidAt = 0, watching = false, masked = false;

  function inertOthers(on) {
    if (!HAS_DOM) return;
    for (const c of Array.from(document.body.children)) {
      if (c === el || c.tagName === 'SCRIPT') continue;
      if (on) { if (!c.hasAttribute('inert')) { c.setAttribute('inert', ''); c.dataset.pzaInert = '1'; } }
      else if (c.dataset.pzaInert) { c.removeAttribute('inert'); delete c.dataset.pzaInert; }
    }
  }
  function mount() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'pza-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', T.title);
    document.body.appendChild(el);
    el.addEventListener('submit', (e) => { e.preventDefault(); tryOpen(); });
    el.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-pza]');
      if (t && t.dataset.pza === 'eye') { masked = !masked; const i = el.querySelector('input'); if (i) { i.classList.toggle('masked', masked); i.focus(); } t.setAttribute('aria-pressed', String(masked)); }
    });
    el.addEventListener('input', () => { const m = el.querySelector('.pza-msg'); if (m && m.classList.contains('bad')) { m.textContent = ''; m.classList.remove('bad'); } });
    // Esc 不准把門關掉、也不准傳到底下的 App
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } });
    return el;
  }
  function paint(kind) {
    mount();
    mode = kind;
    if (el.getAnimations) el.getAnimations().forEach((a) => a.cancel());
    el.classList.toggle('cover', kind === 'cover');
    el.classList.remove('opening', 'busy');
    el.innerHTML = '<div class="pza-in">'
      + '<div class="pza-art" aria-hidden="true">' + (fire(o.art) || '') + '</div>'
      + (kind === 'cover' ? (T.cover ? '<p class="pza-sub">' + esc(T.cover) + '</p>' : '')
        : '<p class="pza-kick">' + esc(T.kick) + '</p><h1 class="pza-title">' + esc(T.title) + '</h1>'
        + '<p class="pza-sub">' + esc(T.sub) + '</p>'
        + '<form class="pza-form" autocomplete="off" novalidate><label class="pza-field">'
        // type="text"：iPhone 的密碼欄位不給中文輸入法（密語是中文）。要遮住用 -webkit-text-security（眼睛按鈕）
        + '<input type="text" placeholder="' + esc(T.field) + '" aria-label="' + esc(T.field) + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"' + (masked ? ' class="masked"' : '') + '>'
        + '<button type="button" class="pza-eye" data-pza="eye" aria-label="遮住或顯示" aria-pressed="' + masked + '">●</button></label>'
        + '<button type="submit" class="pza-go">' + esc(T.button) + '</button></form>'
        + '<p class="pza-msg" role="alert" aria-live="assertive"></p>'
        + '<p class="pza-note">' + esc(T.note) + '</p>')
      + '</div>';
    el.hidden = false;
    document.documentElement.classList.add('pza-locked');
    inertOthers(true);
  }
  function msg(t, bad) { const m = el && el.querySelector('.pza-msg'); if (m) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); } }
  function shake() {
    const a = el && el.querySelector('.pza-art');
    if (a && a.animate && !Env.reduced) a.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
    try { if (navigator.vibrate) navigator.vibrate([18, 40, 18]); } catch (e) { /* iPhone 沒有 */ }
  }
  async function unmount(animated) {
    if (!el) return;
    if (animated && el.animate && !Env.reduced) {
      el.classList.add('opening');
      try { await el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.03)' }], { duration: 420, delay: 360, easing: 'ease', fill: 'forwards' }).finished; } catch (e) { /* */ }
    }
    el.hidden = true; el.innerHTML = ''; mode = '';
    document.documentElement.classList.remove('pza-locked');
    inertOthers(false);
  }
  async function tryOpen() {
    if (busy || mode !== 'lock') return;
    const inp = el.querySelector('input'), v = inp ? inp.value : '';
    fire(o.gesture);   // 一定要在第一個 await 之前：手機只在點擊的當下准許出聲
    if (!core.normPass(v)) { msg(T.empty, true); if (inp) inp.focus(); return; }
    busy = true; el.classList.add('busy'); msg(T.busy);
    const go = el.querySelector('.pza-go'); if (go) go.disabled = true;
    await sleep(30);   // 先讓「開鎖中」畫出來（PBKDF2 六十萬次，手機約 0.3～1 秒）
    let how = null, why = '';
    try { how = await core.check(o.ring, v); } catch (e) { why = e && e.code === 'nocrypto' ? T.nocrypto : String(e && e.message || e); }
    busy = false; el.classList.remove('busy'); if (go) go.disabled = false;
    if (!how) { msg(why || T.bad, true); fire(o.sfx, 'bad'); shake(); if (inp) inp.select(); return; }
    save(core.trust(rec(), o.ring, Date.now()));
    if (inp) inp.blur();
    msg('');
    fire(o.sfx, 'open');
    await unmount(true);
    fire(o.opened, how);
    const ws = waiters; waiters = []; ws.forEach((r) => r(how));
  }
  function waitOpen() { return new Promise((r) => waiters.push(r)); }

  /** 開機時：不用鎖就馬上回來（什麼都不畫）；要鎖就顯示門、等打開 */
  async function gate() {
    if (!core.needAtLaunch(rec(), o.ring, Date.now())) { const r = rec(); if (r && r.hid) save(core.markShown(r)); fire(o.opened, 'skip'); return 'skip'; }
    paint('lock');
    return waitOpen();
  }
  /** 依政策處理離開、回來 */
  function watch() {
    if (watching || !HAS_DOM) return;
    watching = true;
    const hide = () => {
      hidAt = Date.now();
      const r = rec();
      if (r) save(core.markHidden(r, hidAt));
      if (core.coverOnHide(r) && !mode) paint('cover');
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { hide(); return; }
      const r = rec();
      if (core.needOnReturn(r, o.ring, hidAt, Date.now())) { if (mode !== 'lock') { paint('lock'); fire(o.locked); } }
      else { if (r && r.hid) save(core.markShown(r)); if (mode === 'cover') unmount(false); }
      hidAt = 0;
    });
    addEventListener('pagehide', () => { const r = rec(); if (r) save(core.markHidden(r, Date.now())); });
  }
  function lockNow() { save(core.lockRec(rec())); if (mode !== 'lock') { paint('lock'); fire(o.locked); } return waitOpen(); }
  function setPolicy(p) { const r = rec(); if (r) save(core.setPolicy(r, p)); }
  function status() { const r = rec(); return { trusted: core.trusted(r, o.ring), at: r && r.at, policy: core.policy(r), locked: mode === 'lock' }; }
  return { gate, watch, lockNow, setPolicy, status, get shown() { return !!mode; } };
}
PZA.lock = makeLock;
