// 《PZ App 引擎》單元測試：node tests/unit/kit.test.mjs（先 python3 tools/build_appkit.py）
import assert from 'node:assert/strict';
import { loadPZA } from './_load.mjs';

let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };
// 引擎在另一個 vm 裡跑，陣列、物件的原型不一樣：比內容前先變成這邊的
const plain = (x) => JSON.parse(JSON.stringify(x));
const mem = new Map();
const localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const PZA = loadPZA({ localStorage });

// pzcrypt.make_keyring(new_master(), '冷眼 測試用的密語', 'ABCDEFGH12345678')（跟書房一樣 600000 次）
const RING = { v: 1, kdf: { alg: 'PBKDF2-SHA256', iter: 600000, salt: 'XLMhdoz-gweJyJGWcyr3zw' }, wraps: [
  { id: 'pass', n: 'aX5tPFGemPbQJv5m', c: 'ASTO4EYKCJKuo-SNGIAju_b53khUZk44BPdMy0EPbJCPqdJ7byF6_I3fBs6xn82L' },
  { id: 'code', n: 'wtvvEEVFXFAsqi3q', c: 'E-lwobAsmL-jLudINtwHBAuuC3oy6SWc2EYNXiuZ1w1rmdJ7PI1chhRLJ0iQUXZ3' }] };

await t('版本號有填進去、只公開 PZA', () => { assert.match(PZA.version, /^\d+\.\d+\.\d+$/); assert.ok(PZA.lockCore && PZA.lock && PZA.sync && PZA.fresh && PZA.sound && PZA.store); });

// ---------------- 儲存
await t('儲存：前綴規矩、已經有主人的前綴不准用', () => {
  assert.throws(() => PZA.store('Bad Prefix'));
  assert.throws(() => PZA.store('coldeye.'), /主人/);
  assert.throws(() => PZA.store('unpacked.v1.'), /主人/);
  const s = PZA.store('mytest.v1.');
  assert.equal(s.get('x', 5), 5);
  assert.equal(s.set('x', { a: 1 }), true);
  assert.deepEqual(plain(s.get('x')), { a: 1 });
  assert.equal(mem.get('mytest.v1.x'), '{"a":1}');
  mem.set('coldeye.pf', '{"secret":1}');
  assert.deepEqual(plain(s.names()), ['x'], '只列自己的鍵，看不到冷眼的');
  assert.equal(s.update('n', (v) => (v || 0) + 1, 0), 1);
  s.del('x'); assert.equal(s.get('x', null), null);
  assert.equal(mem.get('coldeye.pf'), '{"secret":1}', '別人的鍵一個都沒動');
});
await t('備份資料逐欄重建：不認得的、型別不對的、太長的都丟掉', () => {
  const C = PZA.clean;
  assert.equal(C.id('0050'), '0050');
  assert.equal(C.id('<img onerror=1>'), null);
  assert.equal(C.num(5, 0, 10), 5); assert.equal(C.num(NaN), null); assert.equal(C.num('5'), null);
  assert.equal(C.str('a'.repeat(300), 200), null);
  assert.equal(C.oneOf('x', ['a', 'b'], 'a'), 'a');
  assert.deepEqual(plain(C.arr([1, 'x', 2], (v) => C.num(v))), [1, 2]);
});

// ---------------- 門鎖
const L = PZA.lockCore;
await t('門鎖：書房同一套格式（密語、備用碼打得開，錯的打不開）', async () => {
  assert.equal(await L.check(RING, '冷眼測試用的密語'), 'pass');
  assert.equal(await L.check(RING, ' 冷眼 測試用的 密語 '), 'pass');
  assert.equal(await L.check(RING, 'abcd-efgh-1234-5678'), 'code');
  assert.equal(await L.check(RING, '錯的'), null);
  assert.equal(await L.check(null, '冷眼測試用的密語'), null);
});
await t('門鎖：三種政策（記住／離開 5 分鐘／每次離開）與手動上鎖', () => {
  const t0 = Date.parse('2026-11-21T00:00:00Z');
  const r = L.trust(null, RING, t0);
  assert.equal(L.needAtLaunch(null, RING, t0), true);
  assert.equal(L.needAtLaunch(r, RING, t0 + 9e9), false);
  assert.equal(L.needAtLaunch(L.lockRec(r), RING, t0), true);
  const away = L.markHidden(L.setPolicy(r, 'away'), t0);
  assert.equal(L.needAtLaunch(away, RING, t0 + 60e3), false);
  assert.equal(L.needAtLaunch(away, RING, t0 + 6 * 60e3), true);
  assert.equal(L.needOnReturn(L.setPolicy(r, 'every'), RING, t0, t0 + 11e3), true);
  assert.equal(L.needOnReturn(L.setPolicy(r, 'every'), RING, t0, t0 + 5e3), false);
  assert.equal(L.coverOnHide(r), false);
  assert.equal(L.coverOnHide(L.setPolicy(r, 'away')), true);
  assert.equal(L.needAtLaunch(Object.assign({}, r, { ring: 'other.ring' }), RING, t0), true, '鑰匙圈換了要重新輸入');
});

// ---------------- 資料同步
await t('同步：只重抓時間戳變了的那一份，照 order 的先後', async () => {
  let ver = { files: { live: 'L2', summary: 'S1', news: 'N1' } };
  const have = { summary: 'S1', live: 'L1', news: 'N0' };
  const got = [];
  const fetch = async (url) => ({ ok: true, json: async () => (url.startsWith('data/version.json') ? ver : {}) });
  const sync = PZA.sync({ url: 'data/version.json', fetch, order: ['news', 'live'], have: (k) => have[k], pull: async (k, s) => { got.push(k + '@' + s); have[k] = s; } });
  assert.deepEqual(plain(await sync.tick()), ['news', 'live']);
  assert.deepEqual(got, ['news@N1', 'live@L2']);
  assert.deepEqual(plain(await sync.tick()), [], '都一樣就什麼都不抓');
});
await t('同步：抓過還是舊的（網站快取）2 分鐘內不重抓；連不上記失敗次數', async () => {
  let clock = 1e12, fail = false;
  const pulls = [];
  const fetch = async () => { if (fail) throw new Error('offline'); return { ok: true, json: async () => ({ files: { live: 'L9' } }) }; };
  const states = [];
  const sync = PZA.sync({ url: 'v.json', fetch, now: () => clock, have: () => 'L1', pull: async (k) => { pulls.push(k); }, state: (s) => states.push(s.fail) });
  await sync.tick(); await sync.tick();
  assert.equal(pulls.length, 1, '同一個時間戳第二次不抓');
  clock += 121e3; await sync.tick();
  assert.equal(pulls.length, 2, '2 分鐘後再試');
  fail = true; await sync.tick(); await sync.tick();
  assert.equal(sync.state().fail, 2);
  fail = false; await sync.tick();
  assert.equal(sync.state().fail, 0);
});
await t('網址：知道版本帶 v=，不然每分鐘換一次', () => {
  assert.equal(PZA.dataUrl('data/live.json', { v: '2026-11-21T10:00' }), 'data/live.json?v=2026-11-21T10%3A00');
  assert.equal(PZA.dataUrl('data/a.json?x=1', { now: 120e3 }), 'data/a.json?x=1&t=2');
});

// ---------------- 換新版、時間
await t('換新版的保險：30 秒內不自動、30 分鐘內最多 3 次', () => {
  const f = PZA.fresh({ current: '1' });
  const t0 = 1e12;
  assert.equal(f._allowed([], t0), true);
  assert.equal(f._allowed([t0 - 10e3], t0), false);
  assert.equal(f._allowed([t0 - 40 * 60e3, t0 - 20 * 60e3, t0 - 10 * 60e3], t0), true);
  assert.equal(f._allowed([t0 - 25 * 60e3, t0 - 20 * 60e3, t0 - 10 * 60e3], t0), false);
});
await t('台灣時間：跨日用 UTC+8，不看手機時區', () => {
  const x = PZA.tw(Date.parse('2026-11-20T16:30:00Z'));
  assert.equal(x.date, '2026-11-21'); assert.equal(x.hm, '00:30'); assert.equal(x.md, '11/21');
  const s = PZA.store('mytest2.v1.');
  assert.equal(PZA.oncePerDay(s, 'intro', Date.parse('2026-11-20T16:30:00Z')), true);
  assert.equal(PZA.oncePerDay(s, 'intro', Date.parse('2026-11-21T15:59:00Z')), false);
  assert.equal(PZA.oncePerDay(s, 'intro', Date.parse('2026-11-21T16:01:00Z')), true);
});
console.log(`\n${n} 個測試通過`);
