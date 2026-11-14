/* ==========================================================================
   19 雲端存檔（只有 Claude 版會動）
   Claude 版的頁面可以把每個人自己的存檔放在頁面外面（db 的 data/users/<自己>/<存檔欄>）：
   換裝置、清掉瀏覽器資料都接得回來。網頁版沒有 window.claude，這段完全不動——兩個版本同一份程式。
   ※ 發布到 Claude 之後要宣告能力 { db: {}, user: {} } 才會動（見說明書「發布」）。
   規則（沿用《墜庭》驗證過的做法）：
   - 本機存檔照舊立刻寫；雲端內容真的變了才寫、隔幾秒寫一次、一次一筆。
   - 開機比兩邊的時間：雲端比較新而且這台同步過 → 直接接上；這台有沒同步的進度 → 問玩家要哪份。
   - save.ready：雲端回話前（最多 5 秒）讓標題畫面的「開始」先等一下，免得新遊戲蓋掉另一台的進度。
   - 頁面收起來時，等著寫的那一筆馬上送。
   - 暫時的錯誤自己重試（先隔幾秒、再不行每半分鐘）；沒權限、被收回這類就當「這次沒有雲端」。
   ========================================================================== */
const CLOUD_END = { invalid_argument: 1, quota_exceeded: 1, revoked: 1, not_granted: 1, capability_disabled: 1, capability_removed: 1, transform_error: 1, permission_denied: 1 };
const Cloud = PZ.cloud = {
  attach(save, o) {
    const c = { state: 'wait', doc: null, remote: null, busy: false, dirty: false, timer: 0, failAt: 0, wait: 0, fails: 0, okAt: 0, sig: '', asked: false };
    const syncKey = `pz.${save.id}.sync.${save.slot}`;
    const sigOf = (d) => { try { const x = Object.assign({}, d); delete x._ts; if (o.volatile) for (const k of o.volatile) delete x[k]; return JSON.stringify(x); } catch (e) { return String(Math.random()); } };
    const describe = (d) => (o.describe ? safeCall(o.describe, null, d) : '') || new Date(d._ts || 0).toLocaleString('zh-TW');
    c.push = (now) => {
      if (c.state !== 'on' || c.asking) return; c.dirty = true;
      if (c.busy || c.timer || Date.now() - c.failAt < c.wait) return;
      c.timer = setTimeout(flush, now ? 50 : 4000);
    };
    c.now = () => { if (c.state !== 'on' || !c.dirty || c.busy || Date.now() - c.failAt < c.wait) return; clearTimeout(c.timer); c.timer = 0; flush(); };
    async function flush() {
      c.timer = 0; if (c.state !== 'on' || c.busy || !c.dirty) return;
      const d = save.data; if (!d) return;
      const sig = sigOf(d); c.dirty = false;
      if (sig === c.sig) return;
      c.busy = true;
      try {
        await c.doc.set({ v: 1, code: save.code(), ts: d._ts || Date.now(), note: String(describe(d)).slice(0, 120) });
        c.sig = sig; c.okAt = Date.now(); c.fails = 0; c.wait = 0; Store.set(syncKey, String(d._ts || 0));
        PZ.emit('cloud', 'saved', save);
      } catch (e) {
        const code = e && e.code;
        if (CLOUD_END[code]) { c.state = 'off'; PZ.emit('cloud', 'off', save); }
        else { c.dirty = true; c.failAt = Date.now(); c.wait = code === 'resource_exhausted' || c.fails++ ? 30000 : 2000 + Math.random() * 3000; setTimeout(() => c.push(true), c.wait + 80); }
      }
      c.busy = false; if (c.dirty) c.push();
    }
    c.adopt = (d) => { save.data = d; save.loadedFrom = 'cloud'; Store.set(save.key(), JSON.stringify(d)); Store.set(syncKey, String(d._ts || 0)); c.sig = sigOf(d); PZ.emit('saveload', save); };
    async function settle() {
      const R = c.remote, local = save.read(), synced = +(Store.get(syncKey) || 0);
      if (R) c.sig = sigOf(R.d);
      if (!R) { if (local) c.push(true); return; }
      const lts = local ? local._ts || 0 : -1;
      if (lts === R.ts) { Store.set(syncKey, String(R.ts)); return; }
      if (local && lts > R.ts && lts !== synced) { c.push(true); return; }            // 這台比較新
      if (!local || lts === synced) { c.adopt(R.d); return; }                          // 雲端比較新、這台沒有別的進度
      // 兩邊都有沒同步過的進度：問玩家
      c.asking = true;
      const yes = await UI.confirm({ title: '有兩份進度', body: `<div class="pz-two">這台裝置：${describe(local)}<br>另一台裝置：${describe(R.d)}</div><div class="pz-hint">只能留一份，沒選的那份會被蓋掉。</div>`, ok: '接另一台的', cancel: '留這台的' });
      c.asking = false;
      if (yes) c.adopt(R.d); else c.push(true);
    }
    save.ready = (async () => {
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) throw new Error('none');
        const uid = await user.id(); if (!uid) throw new Error('no id');
        c.doc = db.doc(`data/users/${uid}/${save.slot === 'main' ? 'save' : 'save-' + save.slot}`);
        const snap = await Promise.race([c.doc.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000))]);
        const x = snap && snap.exists ? snap.data() : null, d = x && typeof x.code === 'string' ? save.decode(x.code) : null;
        c.remote = d ? { d, ts: d._ts || +x.ts || 0 } : null;
        c.state = 'on';
      } catch (e) { c.state = 'off'; }
      try { if (c.state === 'on') await settle(); } catch (e) { reportError(e, 'cloud.settle'); }
      PZ.emit('cloud', c.state, save);
    })();
    // 最多等 5 秒
    const raw = save.ready; save.ready = Promise.race([raw, new Promise((r) => setTimeout(r, 5000))]);
    /** 設定頁的一行說明 */
    c.note = () => {
      if (c.state === 'wait') return '正在連上你的帳號……';
      if (c.state !== 'on') return '這次沒連上你的帳號：進度先只存在這台裝置。';
      const m = c.okAt ? Math.floor((Date.now() - c.okAt) / 60000) : -1;
      return '進度也跟著你的 Claude 帳號走：換一台裝置打開會自己接上。' + (m >= 0 ? `（${m < 1 ? '剛剛' : m + ' 分鐘前'}同步過）` : '');
    };
    return c;
  },
};
