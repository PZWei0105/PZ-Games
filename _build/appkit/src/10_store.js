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
