// 存檔儲存：本機 localStorage（可能無法使用）＋記憶體備援；Claude 作品版另外同步到雲端
const PREFIX = 'everlight.v1.';
const mem = {};
let times = null;
function lsGet(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(PREFIX + k, v); return true; } catch (e) { return false; } }
function loadTimes() {
  if (times) return times;
  try { times = JSON.parse(lsGet('times') || mem.times || '{}') || {}; } catch (e) { times = {}; }
  return times;
}
export const store = {
  onSet: null,
  get(k) { const v = lsGet(k); return v != null ? v : mem[k] ?? null; },
  // 一般寫入：記下時間，交給雲端同步
  set(k, v) { const t = Date.now(); this.setLocal(k, v, t); if (this.onSet) this.onSet(k, v, t); return true; },
  // 只寫本機（雲端下載回來時用）
  setLocal(k, v, t = Date.now()) {
    mem[k] = v; lsSet(k, v);
    const T = loadTimes(); T[k] = t;
    const s = JSON.stringify(T); mem.times = s; lsSet('times', s);
  },
  time(k) { return loadTimes()[k] ?? null; },
};
