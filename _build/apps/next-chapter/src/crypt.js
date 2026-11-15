/* ───────── 加密：書房上鎖、單行本（跟 tools/pzcrypt.py 同一套格式，改一邊要改另一邊） ─────────
   .pzx = 'PZX1' | flags（bit0：內容先 raw-deflate）| nonce 12 byte | AES-GCM 密文；AAD = 前 5 byte。
   書房：keyring.json 用密語（或備用碼）包著總鑰匙 → 總鑰匙解 library.pzx → 裡面有每本書的鑰匙。
   單行本：網址 #k= 就是那一本書的鑰匙，只解得開那一本。 */
const Crypt = (() => {
  const te = new TextEncoder(), td = new TextDecoder('utf-8');
  const ok = () => !!(window.crypto && crypto.subtle && window.isSecureContext !== false);
  function b64u(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  const keys = new Map();
  function key(raw) {
    if (!keys.has(raw)) keys.set(raw, crypto.subtle.importKey('raw', unb64u(raw), 'AES-GCM', false, ['decrypt']));
    return keys.get(raw);
  }
  async function open(raw, buf) {
    const u = new Uint8Array(buf);
    if (u.length < 33 || u[0] !== 80 || u[1] !== 90 || u[2] !== 88 || u[3] !== 49) { const e = new Error('檔案格式不對'); e.code = 'format'; throw e; }
    let pt;
    try { pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(5, 17), additionalData: u.subarray(0, 5) }, await key(raw), u.subarray(17))); }
    catch (x) { const e = new Error('鑰匙不對，解不開'); e.code = 'key'; throw e; }
    return u[4] & 1 ? fflate.inflateSync(pt) : pt;
  }
  const text = async (raw, buf) => td.decode(await open(raw, buf));
  const json = async (raw, buf) => JSON.parse(await text(raw, buf));

  /* 密語：NFC、拿掉空白；備用碼：大寫、I/L→1、O→0、只留英數 */
  const normPass = (s) => String(s || '').normalize('NFC').replace(/\s+/g, '');
  const normCode = (s) => String(s || '').toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
  const looksCode = (s) => /^[\s0-9A-Za-z-]+$/.test(s) && normCode(s).length === 16;
  async function unwrap(ring, id, secret) {
    const w = (ring.wraps || []).find((x) => x.id === id);
    if (!w || !secret) return null;
    const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
    const kek = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(ring.kdf.salt), iterations: ring.kdf.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    try { return b64u(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(w.n), additionalData: te.encode('pz-keyring:' + id) }, kek, unb64u(w.c)))); }
    catch (e) { return null; }
  }
  /* 拿密語或備用碼試開，開得了回傳總鑰匙 */
  async function unlock(ring, input) {
    if (looksCode(input)) { const k = await unwrap(ring, 'code', normCode(input)); if (k) return k; }
    return unwrap(ring, 'pass', normPass(input));
  }
  const validKey = (s) => /^[A-Za-z0-9_-]{22}$/.test(s || '') && unb64u(s).length === 16;
  return { ok, open, text, json, unlock, normPass, b64u, unb64u, validKey };
})();

/* 書房的總鑰匙：輸入一次密語，這台裝置就記住 */
const Vault = {
  km: () => Store.get('km', null),
  set: (k) => Store.set('km', k),
  clear() { Store.del('km'); Store.del('lib'); },
};
