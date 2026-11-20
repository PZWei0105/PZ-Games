/* ---------- 上鎖（2026-11-21，痞子葳：「設定一個跟電子書一樣的密碼，讓冷眼跟解包，同樣有輸入密碼開啟的功能」）----------
   打開解包先停在開門畫面的「鎖」：輸入《下回分解》書房的密語（或書房的備用碼）才開；這台裝置之後就記得（跟書房一樣）。
   - 密語跟書房同一組：書房的 keyring（apps/next-chapter/books/keyring.json，公開檔）複製一份放在 UNP_RING，
     打得開裡面包著的總鑰匙＝密語對；開出來的鑰匙馬上抹掉、不存。執行時不去讀書房的檔案（書房改版、離線都不影響解包）。
   - 解包的內容（專題、推坑、Steam 資料）本來就放在公開的網站上：這是「門鎖」，擋的是隨手打開，不是加密。
   - 這台裝置的紀錄存在 unpacked.v1.lock：{ v, ring: 鑰匙圈指紋, at, pol, hid, lk }。設定「現在上鎖」＝lk:true、重新打開就要輸入。
   - 純邏輯 LockCore 複製自《PZ App 引擎》門鎖 1.0.0（_build/appkit/src/20_lock.js）；解包之後搬到引擎時改用引擎那一份。
   - 書房換了密語（keyring.json 換新）：照新的 keyring 改 UNP_RING，記住的裝置因為指紋不同會自動要求重新輸入。
   - 自動測試、截圖（tools/shoot.py、perf.py、check）要先放一筆「記住」的紀錄：tools/lockrec.py 的 trust_js()。 */
const UNP_RING = { v: 1, kdf: { alg: 'PBKDF2-SHA256', iter: 600000, salt: 'KN6A6kSOKxLAPzO0GiUQSw' }, wraps: [
  { id: 'pass', n: 'jcpz43kdW7CNOUAE', c: 'j_19qO5BGgetDWfV_9dIJezHPt1pzGPUoR9ClMkL0nF_FHarSdh2r5FP8gdx2VCO' },
  { id: 'code', n: 'pvWHhVpbimPzKB6n', c: 'efEElW9FxlAbhohojk6vFCe59lyFjHr-8G8Iwwr0WocMAsCkfysetLX6Boj6BDBl' },
] };

const LockCore = (() => {
  const AWAY_MS = 5 * 60e3;
  const EVERY_MS = 10e3;
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
  const normPass = (s) => String(s || '').normalize('NFC').replace(/\s+/g, '');
  const normCode = (s) => String(s || '').toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
  const looksCode = (s) => /^[\s0-9A-Za-z-]+$/.test(String(s || '')) && normCode(s).length === 16;
  function validRing(ring) {
    return !!(ring && ring.kdf && typeof ring.kdf.salt === 'string' && ring.kdf.iter > 0 && Array.isArray(ring.wraps) && ring.wraps.length);
  }
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
      k.fill(0);
      return true;
    } catch (e) { return false; }
  }
  async function check(ring, input) {
    if (!validRing(ring)) return null;
    if (!cryptoOK()) { const e = new Error('這個瀏覽器不能解鎖（需要 https 與 WebCrypto）'); e.code = 'nocrypto'; throw e; }
    if (looksCode(input) && await unwrap(ring, 'code', normCode(input))) return 'code';
    const p = normPass(input);
    if (p && await unwrap(ring, 'pass', p)) return 'pass';
    return null;
  }
  const pol = (rec) => (rec && POLICIES.includes(rec.pol) ? rec.pol : 'trust');
  const iso = (ms) => new Date(ms).toISOString();
  function valid(rec, ring) { return !!(rec && rec.v === 1 && rec.ring && rec.ring === ringId(ring)); }
  const trusted = (rec, ring) => valid(rec, ring) && !rec.lk;
  function trust(rec, ring, now) { return { v: 1, ring: ringId(ring), at: iso(now), pol: pol(rec), hid: 0, lk: false }; }
  function lockRec(rec) { return rec ? Object.assign({}, rec, { lk: true, hid: 0 }) : rec; }
  function setPolicy(rec, p) { return rec ? Object.assign({}, rec, { pol: POLICIES.includes(p) ? p : 'trust', hid: 0 }) : rec; }
  function markHidden(rec, now) { return rec && pol(rec) !== 'trust' && !rec.lk ? Object.assign({}, rec, { hid: now }) : rec; }
  function markShown(rec) { return rec && rec.hid ? Object.assign({}, rec, { hid: 0 }) : rec; }
  function needAtLaunch(rec, ring, now) {
    if (!trusted(rec, ring)) return true;
    const p = pol(rec);
    if (p === 'every') return true;
    if (p === 'away') return !(rec.hid > 0) || rec.hid > now + 60e3 || now - rec.hid >= AWAY_MS;
    return false;
  }
  function needOnReturn(rec, ring, hidAt, now) {
    if (!trusted(rec, ring)) return true;
    const gone = hidAt > 0 ? now - hidAt : 0;
    const p = pol(rec);
    if (p === 'every') return gone < 0 || gone >= EVERY_MS;
    if (p === 'away') return gone < 0 || gone >= AWAY_MS;
    return false;
  }
  const coverOnHide = (rec) => !!rec && pol(rec) !== 'trust';
  return { AWAY_MS, EVERY_MS, POLICIES, normPass, normCode, looksCode, cryptoOK, validRing, ringId, check,
    policy: pol, trusted, trust, lockRec, setPolicy, markHidden, markShown, needAtLaunch, needOnReturn, coverOnHide };
})();

/* ---------- 開門畫面上的鎖（噴漆塗鴉牆上一把掛鎖、一條鐵鍊） ---------- */
const ULock = {
  rec: () => LS.get('lock', null),
  /** 這一次打開要不要鎖 */
  need() { return LockCore.needAtLaunch(ULock.rec(), UNP_RING, Date.now()); },
  /** 把開門畫面（#gate）換成鎖；密語對了 resolve('pass'|'code')。gesture()：按下開鎖的當下（同步）要做的事（手機要在點擊當下喚醒聲音） */
  gate(gate, gesture) {
    let masked = false, busy = false, done = null;
    const EYE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>';
    const EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 4l18 16M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.4 7.6C3.6 9.4 2 12 2 12s3.6 6 10 6c1.6 0 3-.3 4.2-.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    const link = (x, y, r) => `<rect class="ul-link" x="${x}" y="${y}" width="30" height="16" rx="8" transform="rotate(${r} ${x + 15} ${y + 8})"/>`;
    gate.classList.add('locked');
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-label', '解包上鎖了');
    gate.innerHTML = `<div class="gl">解包</div><div class="ge">UNPACKED</div>
      <div class="ul-art" aria-hidden="true"><svg viewBox="0 0 300 130">
        <g class="ul-cl">${link(-6, 52, -6)}${link(22, 50, 4)}${link(50, 53, -5)}${link(78, 51, 5)}${link(104, 54, -4)}</g>
        <g class="ul-cr">${link(166, 54, 4)}${link(192, 51, -5)}${link(220, 53, 5)}${link(248, 50, -4)}${link(276, 52, 6)}</g>
        <g class="ul-pad"><path class="ul-shk" d="M128 62V42a22 22 0 0 1 44 0v20"/><rect class="ul-body" x="114" y="58" width="72" height="62" rx="8"/>
          <circle class="ul-hole" cx="150" cy="83" r="8"/><path class="ul-hole" d="M146 86h8l3 20h-14z"/><text class="ul-tag" x="150" y="76" text-anchor="middle">PZ</text></g>
      </svg><b class="ul-open">OPEN!</b></div>
      <div class="ul-t">上鎖了・輸入密語開鎖</div>
      <form class="ul-f" autocomplete="off" novalidate>
        <label class="ul-field"><input class="ul-in" type="text" placeholder="密語（跟書房同一組）" aria-label="密語" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"><button type="button" class="ul-eye" data-ul="eye" aria-label="遮住或顯示密語" aria-pressed="false">${EYE}</button></label>
        <button class="go" type="submit">▶ 開鎖・聲光全開</button>
      </form>
      <p class="ul-m" role="alert" aria-live="assertive"></p>
      <p class="ul-n">忘了密語：用書房的備用碼（16 碼英文數字）也能開；兩個都忘了，跟 Claude 說「重設解包的密語」。</p>`;
    const inp = $('.ul-in', gate), msg = (t, bad) => { const m = $('.ul-m', gate); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
    gate.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target.closest('[data-ul="eye"]'); if (!t) return;
      masked = !masked; inp.classList.toggle('masked', masked); t.innerHTML = masked ? EYE_OFF : EYE; t.setAttribute('aria-pressed', String(masked)); inp.focus();
    });
    gate.addEventListener('input', () => { if ($('.ul-m.bad', gate)) msg(''); });
    gate.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (busy || !done) return;
      try { if (gesture) gesture(); } catch (x) { /* 聲音叫不醒也照樣開鎖 */ }   // 一定要在第一個 await 之前
      if (!LockCore.normPass(inp.value)) { msg('先輸入密語', true); inp.focus(); return; }
      busy = true; gate.classList.add('busy'); msg('對密語中……'); const go = $('.go', gate); go.disabled = true;
      await sleep(30);   // 先讓「對密語中」畫出來（六十萬次 PBKDF2，手機約 0.3～1 秒）
      let how = null, why = '';
      try { how = await LockCore.check(UNP_RING, inp.value); } catch (x) { why = x && x.code === 'nocrypto' ? '這個瀏覽器開不了鎖（要用 https 的網址打開）' : String((x && x.message) || x); }
      busy = false; gate.classList.remove('busy'); go.disabled = false;
      if (!how) {
        msg(why || '密語不對，再想想', true); haptic(30); try { sfx.scratch(); } catch (x) { /* */ }
        const a = $('.ul-art', gate); if (a && a.animate && !REDUCED) a.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px) rotate(-2deg)' }, { transform: 'translateX(9px) rotate(2deg)' }, { transform: 'translateX(-5px)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
        inp.select(); return;
      }
      LS.set('lock', LockCore.trust(ULock.rec(), UNP_RING, Date.now()));
      inp.value = ''; inp.blur(); msg(how === 'code' ? '用備用碼開了！' : '開了！');
      try { sfx.rattle(); setTimeout(() => sfx.stamp(), 260); } catch (x) { /* */ }
      gate.classList.add('opening');
      if (!REDUCED && typeof burstAt === 'function') { try { burstAt($('.ul-art', gate), ['#FF2E88', '#FFE600', '#111'], 30, 14); } catch (x) { /* */ } }
      await sleep(REDUCED ? 0 : 720);
      const r = done; done = null; r(how);
    });
    if (!IOS) setTimeout(() => { if (done && document.activeElement !== inp) inp.focus({ preventScroll: true }); }, 400);
    return new Promise((r) => { done = r; });
  },
  /** 設定頁「現在上鎖」：記下來、重新打開（回到開門畫面的鎖） */
  now() { LS.set('lock', LockCore.lockRec(ULock.rec())); location.reload(); },
  when() {
    const t = Date.parse((ULock.rec() || {}).at || '');
    if (!isFinite(t)) return '';
    const d = new Date(t + 8 * 3600e3), p = (n) => String(n).padStart(2, '0');
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  },
};
