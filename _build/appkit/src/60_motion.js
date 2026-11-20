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
