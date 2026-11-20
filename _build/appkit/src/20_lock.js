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
