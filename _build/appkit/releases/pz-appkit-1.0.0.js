/*! PZ App Kit v1.0.0 (2026-11-21.8f5cf5cc) — 痞子葳 × Claude 的 App 引擎（門鎖、資料同步、換新版、聲音、動態、本機儲存）。
    說明書：PZ-Games repo 的 _build/appkit/HANDBOOK.md。冷眼不用這一份（冷眼永遠獨立）。 */
(function (global) {
'use strict';
/* ---- 00_head.js ---- */
/* ==========================================================================
   00 開頭：命名空間、環境、小工具
   整個 App 引擎包在一個 IIFE 裡，只對外公開 window.PZA（PZ App）。
   模組之間共用這個閉包裡的變數，不必互相 import；Node 測試時沒有 DOM，畫面相關的函式不要在載入時就碰 document。
   ========================================================================== */
const PZA = { version: '1.0.0', build: '2026-11-21.8f5cf5cc' };
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const noop = () => { };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 裝置與環境（Node 測試時都是 false） */
const Env = PZA.env = (() => {
  const e = { ios: false, android: false, mobile: false, touch: false, standalone: false, reduced: false };
  if (!HAS_DOM) return e;
  const ua = navigator.userAgent || '';
  const mt = navigator.maxTouchPoints || 0;
  e.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && mt > 1);   // iPadOS 會假裝成 Mac
  e.android = /Android/.test(ua);
  e.touch = mt > 0 || 'ontouchstart' in window;
  e.mobile = e.ios || e.android;
  try { e.standalone = !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches); } catch (er) { /* 舊瀏覽器 */ }
  try { e.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (er) { /* 舊瀏覽器 */ }
  return e;
})();
PZA.util = { esc, sleep, noop };

/* ---- 10_store.js ---- */
/* ==========================================================================
   10 本機儲存
   同一個網域（pzwei0105.github.io）底下的 App、遊戲全部共用瀏覽器的儲存空間：
   每個 App 一定要用自己的前綴，永遠不准 localStorage.clear()、不准列舉別人的鍵。
   （冷眼在 coldeye-etf，跟收藏庫同一個網域；冷眼的鍵是 coldeye. 開頭，誰都不准碰。）
   ========================================================================== */
// 已經有主人的前綴（新 App 不准用；2026-11-21 收藏庫裡每個 App 實際用的）。新 App 上線後把它的前綴加進來（要發新版）。
const RESERVED = ['coldeye.', 'coldeye-', 'pznc.', 'pzsb.', 'pz-keyring', 'pzgc.', 'unpacked.', 'omni.', 'binge.', 'onemore.',
  'spectate.', 'turnaround.', 'pzdojo.', 'pzreignite.', 'reignite-', 'skybloom.', 'rs-'];

function makeStore(prefix, opts) {
  opts = opts || {};
  if (!/^[a-z][a-z0-9-]*(\.v\d+)?\.$/.test(prefix || '')) throw new Error('儲存前綴要長得像 "myapp.v1."（小寫英數、句點結尾）');
  if (!opts.owner && RESERVED.some((r) => prefix.startsWith(r))) throw new Error('前綴 ' + prefix + ' 已經有主人了，換一個');
  const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
  const key = (n) => prefix + n;
  const st = {
    prefix, key,
    get(n, d) { const s = ls(); if (!s) return d; try { const v = s.getItem(key(n)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    /** 存不了（空間滿、無痕模式）回傳 false，畫面要照實說，不要假裝存好了 */
    set(n, v) { const s = ls(); if (!s) return false; try { s.setItem(key(n), JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(n) { const s = ls(); if (s) { try { s.removeItem(key(n)); } catch (e) { /* 存取不了就算了 */ } } },
    /** 只列自己前綴底下的名字 */
    names() { const s = ls(); const out = []; if (!s) return out; try { for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length)); } } catch (e) { /* */ } return out; },
    /** 先讀最新的、改、再存：好幾個分頁同時開著時，不會用記憶體裡的舊副本蓋掉別的分頁剛存的（冷眼 savePlans 的做法） */
    update(n, fn, d) { const cur = st.get(n, d); const nx = fn(cur); st.set(n, nx); return nx; },
    /** 另一個分頁改了這個鍵（storage 事件只在「別的」分頁觸發） */
    onChange(n, cb) { if (!HAS_DOM) return noop; const h = (e) => { if (e.key === key(n)) cb(st.get(n)); }; addEventListener('storage', h); return () => removeEventListener('storage', h); },
  };
  return st;
}

/* 備份碼、匯入的資料可能被動過手腳（冷眼 readBackup 的教訓）：只收認得的欄位、逐欄重建，不要整包 Object.assign 進來 */
const Clean = {
  str: (v, max, re) => (typeof v === 'string' && v.length <= (max || 200) && (!re || re.test(v)) ? v : null),
  num: (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= (lo == null ? -Infinity : lo) && v <= (hi == null ? Infinity : hi) ? v : null),
  bool: (v) => (typeof v === 'boolean' ? v : null),
  oneOf: (v, list, d) => (list.includes(v) ? v : d),
  /** 安全字元的代號（股票代號、id）：英數、底線、連字號、點 */
  id: (v, max) => (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(v) && v.length <= (max || 64) ? v : null),
  arr: (v, fn, max) => (Array.isArray(v) ? v.slice(0, max || 5000).map(fn).filter((x) => x != null) : []),
};

PZA.store = makeStore;
PZA.clean = Clean;

/* ---- 20_lock.js ---- */
/* ==========================================================================
   20 門鎖（純邏輯，不碰畫面）
   跟《下回分解》書房同一套密語格式，所以「同一組密語」開得了每一個上鎖的 App。

   keyring 長這樣（書房的 apps/next-chapter/books/keyring.json，公開也沒關係）：
     { v: 1, kdf: { alg: 'PBKDF2-SHA256', iter: 600000, salt }, wraps: [{ id: 'pass' | 'code', n, c }] }
   每一份 wrap ＝ 用 PBKDF2(密語) 導出的鑰匙、以 AES-GCM（AAD = 'pz-keyring:' + id）包起來的總鑰匙。
   打得開 ＝ 密語對。這裡只拿來「驗密語」：開出來的總鑰匙用完就丟，不存、不外傳。

   這台裝置的紀錄（存在 App 自己的儲存空間）：
     { v: 1, ring: 鑰匙圈指紋, at: 打開的時間, pol: 'trust' | 'away' | 'every', hid: 藏到背景的時間, lk: 手動上鎖 }
   自動上鎖的三種政策：
     trust ＝ 記住這台（跟書房一樣：開過一次就不再問，設定裡可以「現在上鎖」）
     away  ＝ 離開 5 分鐘以上回來就鎖（離開時先蓋住畫面，多工切換看不到內容）
     every ＝ 每次離開都鎖（10 秒內回來不算）
   密語、備用碼的正規化跟書房一字不差（tools/pzcrypt.py、src/crypt.js），改了三邊都要改。
   ========================================================================== */
const LockCore = (() => {
  const AWAY_MS = 5 * 60e3;      // away：離開這麼久回來要再輸入
  const EVERY_MS = 10e3;         // every：離開不到 10 秒（拉一下通知、切一下就回來）不算
  const POLICIES = ['trust', 'away', 'every'];
  const te = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const subtle = () => (typeof crypto !== 'undefined' && crypto && crypto.subtle) || null;
  const cryptoOK = () => !!(te && subtle() && (typeof isSecureContext === 'undefined' || isSecureContext !== false));

  function unb64u(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  /* 密語：Unicode NFC、拿掉所有空白；備用碼：大寫、I/L→1、O→0、只留英數（跟書房一樣） */
  const normPass = (s) => String(s || '').normalize('NFC').replace(/\s+/g, '');
  const normCode = (s) => String(s || '').toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
  const looksCode = (s) => /^[\s0-9A-Za-z-]+$/.test(String(s || '')) && normCode(s).length === 16;

  function validRing(ring) {
    return !!(ring && ring.kdf && typeof ring.kdf.salt === 'string' && ring.kdf.iter > 0 && Array.isArray(ring.wraps) && ring.wraps.length);
  }
  /** 鑰匙圈指紋：書房換了密語（鑰匙圈換新）時，記住的裝置自動失效、要重新輸入 */
  function ringId(ring) {
    if (!validRing(ring)) return '';
    const w = ring.wraps.find((x) => x && x.id === 'pass') || ring.wraps[0] || {};
    return String(ring.kdf.salt).slice(0, 10) + '.' + String(w.n || '').slice(0, 8);
  }
  async function unwrap(ring, id, secret) {
    const w = (ring.wraps || []).find((x) => x && x.id === id);
    if (!w || !secret) return false;
    const s = subtle();
    const base = await s.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
    const kek = await s.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(ring.kdf.salt), iterations: ring.kdf.iter },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try {
      const k = new Uint8Array(await s.decrypt({ name: 'AES-GCM', iv: unb64u(w.n), additionalData: te.encode('pz-keyring:' + id) }, kek, unb64u(w.c)));
      k.fill(0);   // 只要「打得開」這件事，鑰匙本身馬上抹掉
      return true;
    } catch (e) { return false; }
  }
  /** 拿輸入的字試開：密語對回傳 'pass'、備用碼對回傳 'code'、都不對回傳 null；這個瀏覽器不能解密時丟出 code='nocrypto' */
  async function check(ring, input) {
    if (!validRing(ring)) return null;
    if (!cryptoOK()) { const e = new Error('這個瀏覽器不能解鎖（需要 https 與 WebCrypto）'); e.code = 'nocrypto'; throw e; }
    if (looksCode(input) && await unwrap(ring, 'code', normCode(input))) return 'code';
    const p = normPass(input);
    if (p && await unwrap(ring, 'pass', p)) return 'pass';
    return null;
  }

  /* ---- 這台裝置的紀錄（純函式：傳入舊的、回傳新的） ---- */
  const pol = (rec) => (rec && POLICIES.includes(rec.pol) ? rec.pol : 'trust');
  const iso = (ms) => new Date(ms).toISOString();
  function valid(rec, ring) { return !!(rec && rec.v === 1 && rec.ring && rec.ring === ringId(ring)); }
  /** 這台裝置記得、而且沒有手動上鎖 */
  const trusted = (rec, ring) => valid(rec, ring) && !rec.lk;
  /** 密語對了：記住這台（政策沿用之前選的） */
  function trust(rec, ring, now) { return { v: 1, ring: ringId(ring), at: iso(now), pol: pol(rec), hid: 0, lk: false }; }
  /** 現在上鎖：下次打開要輸入 */
  function lockRec(rec) { return rec ? Object.assign({}, rec, { lk: true, hid: 0 }) : rec; }
  function setPolicy(rec, p) { return rec ? Object.assign({}, rec, { pol: POLICIES.includes(p) ? p : 'trust', hid: 0 }) : rec; }
  /** 藏到背景：away／every 記下時間（App 被關掉、下次重新打開時看它） */
  function markHidden(rec, now) { return rec && pol(rec) !== 'trust' && !rec.lk ? Object.assign({}, rec, { hid: now }) : rec; }
  /** 回到前景：清掉時間；萬一 App 在前景時被系統關掉，下次打開沒有時間可看 → 保守起見要輸入 */
  function markShown(rec) { return rec && rec.hid ? Object.assign({}, rec, { hid: 0 }) : rec; }

  /** 打開 App 時要不要鎖 */
  function needAtLaunch(rec, ring, now) {
    if (!trusted(rec, ring)) return true;
    const p = pol(rec);
    if (p === 'every') return true;
    if (p === 'away') return !(rec.hid > 0) || rec.hid > now + 60e3 || now - rec.hid >= AWAY_MS;
    return false;
  }
  /** 從背景回來時要不要鎖（hidAt：這一次藏起來的時間） */
  function needOnReturn(rec, ring, hidAt, now) {
    if (!trusted(rec, ring)) return true;
    const gone = hidAt > 0 ? now - hidAt : 0;
    const p = pol(rec);
    if (p === 'every') return gone < 0 || gone >= EVERY_MS;
    if (p === 'away') return gone < 0 || gone >= AWAY_MS;
    return false;
  }
  /** 藏到背景時要不要先把畫面蓋住（多工切換的縮圖看不到內容） */
  const coverOnHide = (rec) => !!rec && pol(rec) !== 'trust';

  return { AWAY_MS, EVERY_MS, POLICIES, normPass, normCode, looksCode, cryptoOK, validRing, ringId, check,
    policy: pol, trusted, trust, lockRec, setPolicy, markHidden, markShown, needAtLaunch, needOnReturn, coverOnHide };
})();
PZA.lockCore = LockCore;

/* ---- 21_gate.js ---- */
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

/* ---- 30_sync.js ---- */
/* ==========================================================================
   30 資料同步（冷眼「幾分鐘內一定要校正」的做法，抽出來給每個資料型 App 用）
   後台每一輪寫一個小小的 version.json：{ built, files: { 名字: 那一份自己的時間戳 } }。
   App 開著的時候每分鐘抓一次這個小檔，**哪一份的時間戳變了就只重抓那一份**（大檔不用每分鐘抓）。
     const sync = PZA.sync({
       url: 'data/version.json',
       have: (name) => 手上那一份的時間戳（沒有就回傳 null）,
       pull: async (name, stamp) => { 重抓那一份：fetch(PZA.dataUrl('data/' + name + '.json', { v: stamp })) … },
       order: ['summary', 'live', 'news'],      // 先後（重要的先）；沒列的照 version.json 的順序
       state: (s) => 頂端狀態列（s.fail 連續失敗幾次、s.at 上次成功）,
     });
     sync.start();                               // 每分鐘（畫面開著時）、回到 App、網路恢復時各看一次
   保險：同一個時間戳抓過了卻還是舊的（網站快取還沒換）→ 2 分鐘後才再試；上一次卡住超過 90 秒（iPhone 鎖螢幕時正好在抓）
   → 不等它、重新開始（舊的那次回來也不會把狀態弄亂）；連續 2 次抓不到 version.json → state 告訴 App「連不上」，畫面要照實寫。
   ========================================================================== */
/** 抓資料的網址：知道要哪一版就帶 ?v=時間戳（保證網站快取給那一版），不然每分鐘換一次 */
function dataUrl(path, o) {
  o = o || {};
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  return path + sep + (o.v ? 'v=' + encodeURIComponent(o.v) : 't=' + Math.floor((o.now || Date.now()) / 60000));
}
async function fetchJSON(url, o) {
  o = o || {};
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), o.timeout || 30e3) : null;
  try {
    const r = await (o.fetch || fetch)(url, Object.assign({ cache: 'no-store' }, ctl ? { signal: ctl.signal } : {}));
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return await r.json();
  } finally { if (timer) clearTimeout(timer); }
}

function makeSync(o) {
  const every = o.every || 60e3, stuckMs = o.stuck || 90e3, retryMs = o.retry || 120e3;
  const now = o.now || (() => Date.now());
  const tried = {};
  let busy = false, at = 0, gen = 0, timer = null, fail = 0, okAt = 0;
  const st = () => ({ fail, at: okAt, busy });
  const report = () => { try { if (o.state) o.state(st()); } catch (e) { /* 狀態列出錯不影響同步 */ } };
  /** 同一個時間戳抓過了卻還是舊的：retry 之後才再試 */
  function tryStamp(k, stamp) {
    const t = tried[k];
    if (t && t.s === stamp && now() - t.at < retryMs) return false;
    tried[k] = { s: stamp, at: now() };
    return true;
  }
  async function tick() {
    if (busy && now() - at < stuckMs) return 'busy';
    busy = true; at = now();
    const my = ++gen;
    try {
      let v = null;
      try { v = await fetchJSON(dataUrl(o.url, { now: now() }), { fetch: o.fetch, timeout: o.timeout }); }
      catch (e) { if (my === gen) { fail++; report(); } return 'fail'; }
      if (my !== gen) return 'stale';            // 已經有比較新的一次在跑（這一次卡太久被跳過）
      fail = 0; okAt = now();
      const files = v && v.files && typeof v.files === 'object' ? v.files : {};
      const names = (o.order || []).filter((k) => k in files).concat(Object.keys(files).filter((k) => !(o.order || []).includes(k)));
      const pulled = [];
      for (const k of names) {
        const stamp = files[k];
        if (!stamp || o.have(k) === stamp || !tryStamp(k, stamp)) continue;
        try { await o.pull(k, stamp); pulled.push(k); } catch (e) { /* 這一份這次抓不到：下一輪再試 */ }
        if (my !== gen) return 'stale';
      }
      report();
      return pulled;
    } finally { if (my === gen) busy = false; }
  }
  function start() {
    if (timer || !HAS_DOM) return;
    const go = () => { if (document.visibilityState === 'visible') tick(); };
    timer = setInterval(go, every);
    document.addEventListener('visibilitychange', go);
    addEventListener('online', go);
    addEventListener('focus', go);
    addEventListener('pageshow', (e) => { if (e.persisted) go(); });   // iPhone 主畫面的 App 從背景回來有時只有 pageshow
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  return { tick, start, stop, state: st, tryStamp };
}
PZA.dataUrl = dataUrl;
PZA.fetchJSON = fetchJSON;
PZA.sync = makeSync;

/* ---- 40_fresh.js ---- */
/* ==========================================================================
   40 換新版（冷眼 swApply、解包 Fresh 的做法）
   加到主畫面的 App 從背景切回來**不會**重新載入，瀏覽器也不會自己去問有沒有新版 → 痞子葳會一直看到舊畫面。
   做法：組建時寫一個 ver.json（{ v: 版本 }），App 開著時看它（回到 App 時馬上看、每 10 分鐘看一次，最多每分鐘一次）：
   - 版本不一樣、而且現在「安全」（剛打開或剛切回來 45 秒內、沒在打字、App 說沒在忙）→ 直接重新載入。
   - 不安全 → 交給 App 顯示「有新版本・點一下更新」（chip(true)），等下次離開 App（畫面藏起來）時再換，回來就是新版。
   - 自動重新載入有保險：跟上一次隔 30 秒以上、30 分鐘內最多 3 次（萬一出錯也不會一直重新載入）。點「更新」的不限。
     const fresh = PZA.fresh({ url: 'ver.json', current: VERSION, busy: () => 疊層開著或在看影片, chip: (on) => … });
     fresh.start();   // 「更新」按鈕：fresh.apply()
   有 service worker 的 App：sw.js 的快取名字要跟著版本換，裝新版時用 cache: 'no-cache' 抓（GitHub Pages 讓瀏覽器快取 10 分鐘）。
   ========================================================================== */
function makeFresh(o) {
  const gap = o.gap || 60e3, freshMs = o.freshMs || 45e3, every = o.every || 10 * 60e3;
  const KEY = o.key || 'pza-fresh';
  let lastAt = 0, busy = false, pending = false, shownAt = Date.now(), gone = false;
  const typing = () => { if (!HAS_DOM) return false; const a = document.activeElement; return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  const safe = () => (HAS_DOM && document.visibilityState === 'hidden') || (Date.now() - shownAt < freshMs && !typing() && !(o.busy && o.busy()));
  /** 自動重新載入的保險：30 秒內不再自動、30 分鐘內最多 3 次 */
  function allowed(stamps, t) {
    const ts = (stamps || []).filter((x) => t - x < 30 * 60e3);
    return !(ts.length >= 3 || ts.some((x) => t - x < 30e3));
  }
  function reload(auto) {
    if (gone) return true;
    if (auto) {
      let ts = [];
      try { ts = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { ts = []; }
      if (!allowed(ts, Date.now())) return false;
      try { sessionStorage.setItem(KEY, JSON.stringify(ts.filter((x) => Date.now() - x < 30 * 60e3).concat(Date.now()))); } catch (e) { /* 無痕模式 */ }
    }
    gone = true;
    location.reload();
    return true;
  }
  async function check(force) {
    if (!HAS_DOM || busy || location.protocol === 'file:' || navigator.onLine === false) return null;
    if (!force && Date.now() - lastAt < gap) return null;
    lastAt = Date.now(); busy = true;
    try {
      const j = await fetchJSON(dataUrl(o.url || 'ver.json'), { timeout: 15e3 });
      if (!j || !j.v || String(j.v) === String(o.current)) return false;
      pending = true;
      if (safe() && reload(true)) return true;
      if (o.chip) o.chip(true);
      return true;
    } catch (e) { return null; } finally { busy = false; }
  }
  function start() {
    if (!HAS_DOM) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { shownAt = Date.now(); check(); }
      else if (pending) reload(true);        // 離開 App 的時候換，回來就是新版
    });
    addEventListener('pageshow', (e) => { if (e.persisted) { shownAt = Date.now(); check(); } });
    setInterval(() => { if (document.visibilityState === 'visible') check(); }, every);
    setTimeout(() => check(true), 4000);
  }
  return { start, check, apply: () => reload(false), get pending() { return pending; }, _allowed: allowed };
}
PZA.fresh = makeFresh;

/* ---- 50_sound.js ---- */
/* ==========================================================================
   50 聲音：Web Audio 即時合成（不放音檔）——冷眼 fx.js、解包 audio.js 的做法
   手機的規矩（違反就沒聲音、甚至卡住）：
   - AudioContext 一定要在**點擊的當下（同步）**建立或 resume；放在 await 後面，iPhone 會擋（畫面還可能卡住）。
     所以 App 在整個頁面掛「任何一次點擊、按鍵都順便 unlock()」（capture），開門、啟動按鈕的 handler 第一行也呼叫。
   - iPhone 從背景回來是 interrupted（不是 suspended），一樣要在點擊當下叫醒。
   - iPhone 側邊靜音開關：audioSession.type = 'ambient' 才會跟著靜音（冷眼這樣）；要蓋過靜音（看預告、說書）用 'playback'。
   - App 到背景就停配樂（visibilitychange），回來再接。
   合成器（makeSynth，配方跟冷眼機甲 HUD 一樣、參數一樣）：tone 振盪器＋包絡＋滑音＋顫音、noise 濾波白噪音、
   pluck 撥弦（Karplus–Strong）、fm 電鋼琴、bell 鐘磬。時間一律是「從現在起幾秒後」。
   音色組：{ 名字: (A) => { A.tone(…); A.noise(…) } }；每一組用 trim（dB）校正到跟原本那一組一樣大聲（OfflineAudioContext 量 RMS）。
     const snd = PZA.sound({ session: 'ambient', bank: MY_SOUNDS, vol: () => 設定的音量(0～1.5) });
     document.addEventListener('pointerdown', () => snd.unlock(), { capture: true });
     snd.play('stamp');
   ========================================================================== */
function makeNoise(c, sec, seed0) {
  const len = Math.floor(c.sampleRate * (sec || 1.2));
  const b = c.createBuffer(1, len, c.sampleRate);
  const ch = b.getChannelData(0);
  let seed = seed0 || 7;   // 固定種子：每次聽起來都一樣
  for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; ch[i] = (seed / 2147483647) * 2 - 1; }
  return b;
}

function makeSynth(c, out, wetIn, nb) {
  const T = (at) => c.currentTime + at;
  const route = (node, o) => {
    let n = node;
    if (o.pan) { try { const p = c.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; } catch (e) { /* 舊瀏覽器 */ } }
    n.connect(o.out || out);
    if (o.wet && (o.wetTo || wetIn)) { const w = c.createGain(); w.gain.value = o.wet; n.connect(w); w.connect(o.wetTo || wetIn); }
  };
  const env = (g, t0, dur, peak, a, o) => {
    if (o.rel) {
      const r = Math.min(o.rel, dur * 0.95);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.setValueAtTime(peak, Math.max(t0 + a, t0 + dur - r));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    } else {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
  };
  function tone(f, at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.det) osc.detune.setValueAtTime(o.det, t0);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t0 + (o.glideT || dur));
    if (o.vib) {
      const lfo = c.createOscillator(); lfo.frequency.value = o.vib.rate || 5.5;
      const d = c.createGain(); d.gain.setValueAtTime(0, t0); d.gain.linearRampToValueAtTime(o.vib.depth || 12, t0 + (o.vib.delay || 0.15));
      lfo.connect(d).connect(osc.detune); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.1 : o.gain, o.attack == null ? 0.004 : o.attack, o);
    let node = osc;
    if (o.lp) {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t0);
      if (o.q) fl.Q.value = o.q;
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(Math.max(40, o.lpTo), t0 + (o.lpT || dur));
      osc.connect(fl); node = fl;
    }
    node.connect(g);
    route(g, o);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const src = c.createBufferSource(); src.buffer = nb;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.glide) fl.frequency.exponentialRampToValueAtTime(o.glide, t0 + dur);
    fl.Q.value = o.q == null ? 1 : o.q;
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.08 : o.gain, o.attack == null ? 0.01 : o.attack, o);
    src.connect(fl).connect(g);
    route(g, o);
    src.start(t0, o.off == null ? Math.random() * 0.2 : o.off); src.stop(t0 + dur + 0.05);
  }
  const plucks = new Map();
  function pluckBuf(f, damp, soft, len) {
    const key = Math.round(f * 10) + '|' + damp + '|' + soft + '|' + len + '|' + c.sampleRate;
    let b = plucks.get(key);
    if (b) return b;
    const sr = c.sampleRate, N = Math.max(2, Math.round(sr / f)), L = Math.floor(sr * len);
    b = c.createBuffer(1, L, sr);
    const y = b.getChannelData(0), ring = new Float32Array(N);
    let seed = 1234 + N;
    for (let i = 0; i < N; i++) { seed = (seed * 16807) % 2147483647; ring[i] = (seed / 2147483647) * 2 - 1; }
    for (let k = 0; k < soft; k++) for (let i = 0; i < N; i++) ring[i] = 0.5 * (ring[i] + ring[(i + 1) % N]);
    let mx = 0;
    for (let i = 0; i < N; i++) mx = Math.max(mx, Math.abs(ring[i]));
    const sc = mx > 0 ? 1 / mx : 1;
    let idx = 0;
    for (let i = 0; i < L; i++) { const cur = ring[idx], nxt = ring[(idx + 1) % N]; y[i] = cur * sc; ring[idx] = damp * 0.5 * (cur + nxt); idx = (idx + 1) % N; }
    if (plucks.size > 80) plucks.delete(plucks.keys().next().value);
    plucks.set(key, b);
    return b;
  }
  function pluck(f, at, o) {
    o = o || {};
    const t0 = T(at), len = o.len || 2.2;
    const src = c.createBufferSource(); src.buffer = pluckBuf(f, o.damp == null ? 0.996 : o.damp, o.soft == null ? 1 : o.soft, len);
    const g = c.createGain(), peak = o.gain == null ? 0.12 : o.gain;
    g.gain.setValueAtTime(peak, t0);
    if (o.dur) { g.gain.setValueAtTime(peak, t0 + Math.max(0.01, o.dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur); }
    let node = src;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; src.connect(fl); node = fl; }
    node.connect(g);
    route(g, o);
    src.start(t0); src.stop(t0 + (o.dur || len) + 0.05);
  }
  function fm(f, at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const car = c.createOscillator(); car.frequency.setValueAtTime(f, t0);
    const mod = c.createOscillator(); mod.frequency.setValueAtTime(f * (o.ratio || 1), t0);
    const mg = c.createGain(), idx = (o.idx == null ? 2.2 : o.idx) * f;
    mg.gain.setValueAtTime(idx, t0);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * (o.idxEnd == null ? 0.12 : o.idxEnd)), t0 + Math.min(dur, o.idxT || 0.7));
    mod.connect(mg).connect(car.frequency);
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.08 : o.gain, o.attack == null ? 0.003 : o.attack, o);
    car.connect(g);
    route(g, o);
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  }
  function bell(f, at, dur, o) {
    o = o || {};
    const parts = o.parts || [[1, 1], [2.0, 0.42], [2.76, 0.3], [5.4, 0.14], [8.93, 0.06]];
    const peak = o.gain == null ? 0.06 : o.gain;
    for (const [r, a] of parts) {
      const fr = f * r;
      if (fr > 16000) continue;
      tone(fr, at, dur * (1.1 - Math.min(0.75, r * 0.07)), { gain: peak * a, attack: o.attack == null ? 0.002 : o.attack, out: o.out, wet: o.wet, wetTo: o.wetTo, pan: o.pan });
    }
  }
  return { c, tone, noise, pluck, fm, bell, now: () => c.currentTime };
}

/** 給一個音色組的聲音：dB 轉倍數（trim） */
const dbGain = (db) => Math.pow(10, (db || 0) / 20);

function makeSound(o) {
  o = o || {};
  let ctx = null, master = null, A = null, unlocked = false;
  const subs = new Set();
  function ensure() {
    if (ctx) return ctx;
    const AC = HAS_DOM && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = o.session || 'ambient'; } catch (e) { /* 舊版 Safari */ }
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = o.vol ? o.vol() : 0.85;
    master.connect(comp).connect(ctx.destination);
    const dly = ctx.createDelay(0.5); dly.delayTime.value = 0.13;   // 一點點迴音，讓重要的聲音有尾巴
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const wet = ctx.createGain();
    wet.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(master);
    A = makeSynth(ctx, master, wet, makeNoise(ctx));
    return ctx;
  }
  /** 在點擊、按鍵的當下（同步）呼叫 */
  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state !== 'running') c.resume().then(() => subs.forEach((fn) => { try { fn(); } catch (e) { /* */ } })).catch(() => {});
    if (!unlocked) {
      try { const b = c.createBuffer(1, 1, c.sampleRate); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* */ }
      unlocked = true;
    }
  }
  const ready = () => !!(ctx && ctx.state === 'running');
  function play(name) {
    if (!ready() || (o.on && !o.on())) return false;
    const fn = (o.bank || {})[name];
    if (!fn) return false;
    master.gain.value = (o.vol ? o.vol() : 0.85) * dbGain((o.trim || {})[name]);
    try { fn(A); return true; } catch (e) { return false; }
  }
  if (HAS_DOM) document.addEventListener('visibilitychange', () => { if (ctx && document.visibilityState === 'hidden' && o.pauseHidden !== false) ctx.suspend().catch(() => {}); });
  return { unlock, ready, play, onUnlock: (fn) => { subs.add(fn); return () => subs.delete(fn); }, ctx: () => ensure(), synth: () => (ensure() ? A : null) };
}

/** 量一個聲音有多大聲（OfflineAudioContext）：0.3 秒一窗的 RMS 取最大，回傳 dB。音色組之間對音量用 */
async function measure(fn, sec) {
  const OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null;
  if (!OAC) return null;
  const sr = 48000, c = new OAC(2, Math.floor(sr * (sec || 1.5)), sr);
  const out = c.createGain(); out.connect(c.destination);
  const wet = c.createGain(); wet.connect(out);
  fn(makeSynth(c, out, wet, makeNoise(c)));
  const buf = await c.startRendering();
  const d = buf.getChannelData(0), win = Math.floor(sr * 0.3);
  let best = 0, nan = 0;
  for (let i = 0; i + win <= d.length; i += Math.floor(win / 2)) {
    let ss = 0;
    for (let k = i; k < i + win; k++) { const v = d[k]; if (!isFinite(v)) { nan++; continue; } ss += v * v; }
    best = Math.max(best, Math.sqrt(ss / win));
  }
  return { db: 20 * Math.log10(best + 1e-12), nan };
}
PZA.sound = makeSound;
PZA.synth = makeSynth;
PZA.measureSound = measure;

/* ---- 60_motion.js ---- */
/* ==========================================================================
   60 動態與台灣時間
   - 動態只放在有意義的時刻（開機、揭曉、蓋章、數字變了），而且全部跟著 App 的「特效」設定和手機的「減少動態效果」。
   - 數字跳上來（countUp）：最後一定停在真正的數字（動畫只是過程，不產生數字）。
   - 台灣時間：資料、排程、「今天」全部用台灣時間（UTC+8、沒有日光節約），不要用手機的時區猜。
   ========================================================================== */
const Motion = {
  /** 這一次可不可以動：fxOn＝App 的特效設定（沒給當作打開） */
  ok(fxOn) {
    if (fxOn === false) return false;
    try { return !(HAS_DOM && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; }
  },
  /** 數字從 from 跳到 to（fmt 把數字變成字），ms 毫秒；不能動時直接寫最後的數字 */
  countUp(el, to, fmt, ms, fxOn, from) {
    if (!el) return;
    fmt = fmt || ((v) => String(Math.round(v)));
    if (!Motion.ok(fxOn) || !isFinite(to)) { el.textContent = fmt(to); return; }
    const a = isFinite(from) ? from : 0, t0 = performance.now(), d = ms || 900;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(k >= 1 ? to : a + (to - a) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
};
/** 台灣時間的各個欄位（ms 預設現在） */
function tw(ms) {
  const d = new Date((ms == null ? Date.now() : ms) + 8 * 3600e3);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate(), hh = d.getUTCHours(), mi = d.getUTCMinutes();
  const p = (n) => String(n).padStart(2, '0');
  return { y, m, d: dd, hh, mi, wd: d.getUTCDay(), ymd: y * 10000 + m * 100 + dd, date: y + '-' + p(m) + '-' + p(dd), hm: p(hh) + ':' + p(mi), md: m + '/' + dd };
}
/** 同一件事一天只做一次（開場完整版、警報…）：今天還沒做過回傳 true 並記下 */
function oncePerDay(store, key, ms) {
  const today = tw(ms).date;
  if (store.get(key, '') === today) return false;
  store.set(key, today);
  return true;
}
PZA.motion = Motion;
PZA.tw = tw;
PZA.oncePerDay = oncePerDay;

PZA.css = ".pza-gate{--pza-bg:#0b0d12;--pza-fg:#f2f4f8;--pza-dim:#9aa3b2;--pza-accent:#4ee0ff;--pza-warn:#ffb02e;--pza-field:#151a24;--pza-font:system-ui,-apple-system,'PingFang TC','Noto Sans TC',sans-serif;--pza-title-font:var(--pza-font);position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom));background:var(--pza-bg);color:var(--pza-fg);font:15px/1.5 var(--pza-font);overflow-y:auto;-webkit-tap-highlight-color:transparent}.pza-gate[hidden]{display:none}html.pza-locked,html.pza-locked body{overflow:hidden}.pza-in{width:min(400px,100%);display:grid;gap:12px;justify-items:center;text-align:center}.pza-art{width:120px;height:120px;display:grid;place-items:center}.pza-art>svg{width:100%;height:100%}.pza-kick{margin:4px 0 0;font-size:12px;letter-spacing:.3em;color:var(--pza-dim)}.pza-title{margin:0;font:900 26px/1.2 var(--pza-title-font);letter-spacing:.08em}.pza-sub{margin:0;color:var(--pza-dim)}.pza-form{width:100%;display:grid;gap:10px;margin-top:6px}.pza-field{position:relative;display:block}.pza-field input{width:100%;box-sizing:border-box;height:50px;padding:0 48px 0 16px;border:1px solid color-mix(in srgb,var(--pza-accent) 45%,transparent);border-radius:10px;background:var(--pza-field);color:var(--pza-fg);font:600 18px/1 var(--pza-font);letter-spacing:.06em;outline:none}.pza-field input:focus{border-color:var(--pza-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--pza-accent) 25%,transparent)}.pza-field input.masked{-webkit-text-security:disc}.pza-eye{position:absolute;right:4px;top:4px;width:42px;height:42px;border:0;background:none;color:var(--pza-dim);font-size:14px}.pza-eye[aria-pressed=\"true\"]{color:var(--pza-accent)}.pza-go{height:50px;border:0;border-radius:10px;background:var(--pza-accent);color:#021a24;font:800 17px/1 var(--pza-font);letter-spacing:.2em}.pza-go:disabled{opacity:.6}.pza-msg{min-height:1.5em;margin:0;font-weight:700;color:var(--pza-accent)}.pza-msg.bad{color:var(--pza-warn)}.pza-note{margin:4px 0 0;font-size:12.5px;color:var(--pza-dim)}.pza-gate.cover .pza-art{opacity:.8}.pza-gate.busy .pza-art{animation:pzaBusy 1s ease-in-out infinite}@keyframes pzaBusy{50%{opacity:.45}}@media (prefers-reduced-motion:reduce){.pza-gate.busy .pza-art{animation:none}}";
global.PZA = PZA;
})(typeof window !== 'undefined' ? window : globalThis);
