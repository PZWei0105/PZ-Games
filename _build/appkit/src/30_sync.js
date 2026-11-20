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
