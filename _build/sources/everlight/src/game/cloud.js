// Claude 作品版：把存檔同步到玩家自己的私人雲端空間（換裝置也能接著玩）
import { store } from './store.js';

const KEYS = ['slot.auto', 'slot.1', 'slot.2', 'slot.3', 'meta.auto', 'meta.1', 'meta.2', 'meta.3', 'last'];
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export function startCloud(onReady) {
  let col = null;
  const pending = new Map(), busy = new Set(), timers = new Map();
  const schedule = (k, ms = 2500) => { clearTimeout(timers.get(k)); timers.set(k, setTimeout(() => write(k), ms)); };
  const write = async (k) => {
    if (!col || busy.has(k) || !pending.has(k)) return;
    const { v, t } = pending.get(k); pending.delete(k); busy.add(k);
    try { await col.doc(k).set({ v, t }); }
    catch (e) {
      const code = e && e.code;
      if (code === 'unavailable' && !pending.has(k)) { pending.set(k, { v, t }); setTimeout(() => schedule(k, 0), 1500 + Math.random() * 1500); }
      if (code === 'revoked' || code === 'not_granted' || code === 'capability_disabled' || code === 'invalid_argument') col = null;
    } finally { busy.delete(k); if (pending.has(k)) schedule(k); }
  };
  store.onSet = (k, v, t) => { if (!KEYS.includes(k)) return; pending.set(k, { v, t }); if (col) schedule(k); };
  const tryStart = async () => {
    const C = window.claude;
    if (!C || typeof C.use !== 'function') return false;
    let db = null, user = null;
    try { [db, user] = await Promise.all([C.use('db'), C.use('user')]); } catch (e) { return true; }
    if (!db || !user) return true;
    let id = null;
    try { id = await user.id(); } catch (e) { id = null; }
    if (!id) return true;
    const c = db.collection('data/users/' + id);
    let changed = false;
    try {
      await timeout(Promise.all(KEYS.map(async (k) => {
        const s = await c.doc(k).get();
        const local = store.get(k), lt = store.time(k);
        const d = s.exists ? s.data() : null;
        if (d && typeof d.v === 'string' && (local == null || lt == null || (d.t || 0) > lt)) { store.setLocal(k, d.v, d.t || Date.now()); changed = true; }
        else if (local != null && (!d || (lt || 0) > (d.t || 0))) pending.set(k, { v: local, t: lt || Date.now() });
      })), 10000);
    } catch (e) { /* 連不上：先用本機存檔 */ }
    col = c;
    for (const k of pending.keys()) schedule(k, 800);
    onReady?.(changed);
    return true;
  };
  // window.claude 可能稍後才出現
  let tries = 0;
  const tick = async () => { if (await tryStart()) return; if (++tries < 6) setTimeout(tick, 800); };
  setTimeout(tick, 0);
}
