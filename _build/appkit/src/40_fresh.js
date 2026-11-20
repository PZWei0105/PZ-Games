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
