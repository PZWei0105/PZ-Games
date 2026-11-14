/* ==========================================================================
   18 設定與存檔
   設定（PZ.settings）：音量、畫面震動、閃光、觸覺、傷害數字、畫質、鎖幀…
     每款遊戲各自記；新遊戲會沿用你上次在別款遊戲調好的偏好。
     PZ.settings.get('sfx')、PZ.settings.set('shake', 0.5)、PZ.on('setting', (k, v) => …)
   存檔（PZ.save.open）：
     const save = PZ.save.open('last-order', { version: 2, defaults: () => ({ chapter: 1, gold: 0 }), migrate(d, from) { … return d; } });
     save.data.gold += 10; save.write();        // 寫入（太頻繁會自動合併）
     save.code() → 存檔碼字串；save.load(code) → 讀存檔碼（換手機、Claude 版↔網頁版）
   保護：
     - 寫入失敗（空間滿、被擋）會退回記憶體，save.persistent 變 false（UI 可以提醒）
     - 每兩分鐘留一份備份；主存檔壞掉時自動用備份
     - 頁面被收起來（切 App、鎖螢幕）時自動寫一次
     - 版本號變了會跑 migrate，舊存檔不會壞
   ========================================================================== */
const SET_DEFAULTS = { master: 1, music: 0.7, sfx: 0.9, mute: false, shake: 1, flash: true, haptics: true, numbers: true, quality: 'auto', fpsCap: 0, mixOthers: false, textSpeed: 1, touchSize: 1 };
const SHARED_KEYS = ['master', 'music', 'sfx', 'shake', 'flash', 'haptics', 'numbers', 'mixOthers', 'textSpeed', 'touchSize'];
const Settings = PZ.settings = {
  values: Object.assign({}, SET_DEFAULTS), defaults: Object.assign({}, SET_DEFAULTS), id: 'game',
  get(k) { const v = this.values[k]; return v === undefined ? this.defaults[k] : v; },
  /** o.local：只改這款，不沿用到別款（例如把舊版的「音效：關」搬過來） */
  set(k, v, o) {
    if (this.values[k] === v) return;
    this.values[k] = v; this.apply(k);
    Store.setJSON(`pz.${this.id}.settings`, this.values);
    if (SHARED_KEYS.includes(k) && !(o && o.local)) { const g = Store.getJSON('pz.settings.last', {}); g[k] = v; Store.setJSON('pz.settings.last', g); }
    PZ.emit('setting', k, v);
  },
  /** 閃光倍率：關掉「閃光」時剩兩成五 */
  flashScale() { return this.get('flash') ? 1 : 0.25; },
  load(id, extra) {
    this.id = id || 'game';
    if (extra) Object.assign(this.defaults, extra);
    const shared = Store.getJSON('pz.settings.last', {}), mine = Store.getJSON(`pz.${this.id}.settings`, null);
    this.values = Object.assign({}, this.defaults, mine ? {} : pick(shared, SHARED_KEYS), mine || {});
    for (const k in this.values) this.apply(k);
  },
  reset() { this.values = Object.assign({}, this.defaults); Store.setJSON(`pz.${this.id}.settings`, this.values); for (const k in this.values) this.apply(k); PZ.emit('setting', '*'); },
  apply(k) {
    const v = this.get(k);
    if (k === 'music' || k === 'sfx' || k === 'master' || k === 'mute') Aud.applyVolumes();
    else if (k === 'quality') { if (v === 'auto') Quality.auto = true; else { Quality.auto = false; Quality.set(v === 'high' ? Quality.tiers.length - 1 : v === 'low' ? 0 : v === 'mid' ? 1 : +v || Quality.tier, 'setting'); } }
    else if (k === 'fpsCap') Loop.fpsCap = +v || 0;
    else if (k === 'mixOthers') setSession();
    else if (k === 'touchSize' && Screen.root) Screen.root.style.setProperty('--pz-touch-scale', String(v));
  },
};
function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }

/* ---------- 存檔 ---------- */
function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ''; } }
function b64dec(s) { return decodeURIComponent(escape(atob(s))); }
function hash8(s) { return (hashStr(s) >>> 0).toString(36).padStart(7, '0').slice(-7); }
const clone = (o) => JSON.parse(JSON.stringify(o));

class SaveStore {
  constructor(id, o) {
    this.id = id; this.o = o; this.version = o.version || 1; this.slot = o.slot || 'main';
    this.prefix = (o.code || id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'PZ') + this.version;
    this.data = null; this.persistent = Store.available; this.dirty = false; this._t = 0; this._bakAt = 0; this.loadedFrom = 'new';
    this.cloud = null; this.ready = Promise.resolve();
  }
  key(slot = this.slot) { return `pz.${this.id}.save.${slot}`; }
  fresh() { const d = typeof this.o.defaults === 'function' ? this.o.defaults() : clone(this.o.defaults || {}); d._v = this.version; d._ts = 0; return d; }
  /** 把讀到的資料整理成現在版本：補上新欄位、跑 migrate */
  normalize(d) {
    if (!d || typeof d !== 'object') return null;
    let v = d._v || 1;
    if (v < this.version && this.o.migrate) { try { d = this.o.migrate(d, v) || d; } catch (e) { reportError(e, 'save.migrate'); return null; } }
    if (v > this.version) warnOnce('savever', '存檔是比較新的版本做的');
    const base = this.fresh();
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    d._v = this.version;
    return d;
  }
  read(slot = this.slot) {
    for (const k of [this.key(slot), this.key(slot) + '.bak']) {
      const s = Store.get(k); if (!s) continue;
      try { const d = this.normalize(JSON.parse(s)); if (d) { this.loadedFrom = k.endsWith('.bak') ? 'backup' : 'local'; if (this.loadedFrom === 'backup') warnOnce('bak', '主存檔讀不出來，已改用備份'); return d; } } catch (e) { /* 壞掉：試下一份 */ }
    }
    return null;
  }
  /** 讀檔（沒有就用預設值）；回傳 data */
  open() { const d = this.read(); this.data = d || this.fresh(); if (!d) this.loadedFrom = 'new'; return this.data; }
  get exists() { return !!(Store.get(this.key()) || Store.get(this.key() + '.bak')); }
  /** 寫入；預設會合併 0.4 秒內的多次呼叫，now=true 立刻寫 */
  write(now) {
    this.dirty = true;
    if (now) return this.flush();
    if (!this._t) this._t = setTimeout(() => this.flush(), 400);
    return true;
  }
  flush() {
    clearTimeout(this._t); this._t = 0;
    if (!this.dirty || !this.data) return true;
    this.dirty = false;
    if (this.o.canSave && !safeCall(this.o.canSave, null, this.data)) { this.dirty = true; this._t = setTimeout(() => this.flush(), 1000); return false; } // 劇情演到一半等不能存的時候：一秒後再試
    this.data._ts = Date.now(); this.data._v = this.version;
    let s; try { s = JSON.stringify(this.data); } catch (e) { reportError(e, 'save.stringify'); return false; }
    const k = this.key(), prev = Store.get(k);
    if (prev && Date.now() - this._bakAt > 120000) { Store.set(k + '.bak', prev); this._bakAt = Date.now(); }
    const ok = Store.set(k, s);
    this.persistent = ok;
    if (!ok) warnOnce('savefail', '存檔寫不進瀏覽器（空間滿了或被擋），這次先記在記憶體裡');
    PZ.emit('save', this, ok);
    if (this.cloud) this.cloud.push();
    return ok;
  }
  /** 從頭開始（舊的留一份備份） */
  reset() { const k = this.key(), prev = Store.get(k); if (prev) Store.set(k + '.bak', prev); this.data = this.fresh(); this.loadedFrom = 'new'; this.write(true); return this.data; }
  /** 存檔碼 */
  code() { const s = JSON.stringify(Object.assign({}, this.data, { _ts: this.data._ts || Date.now() })); return `${this.prefix}.${b64enc(s)}.${hash8(s)}`; }
  decode(code) {
    try {
      code = String(code).trim().replace(/\s+/g, '');
      const parts = code.split('.'); if (parts.length < 3) return null;
      const s = b64dec(parts[1]); if (hash8(s) !== parts[2]) return null;
      return this.normalize(JSON.parse(s));
    } catch (e) { return null; }
  }
  /** 讀存檔碼：成功回傳 true（會立刻寫入這台裝置） */
  load(code) { const d = this.decode(code); if (!d) return false; this.data = d; this.loadedFrom = 'code'; this.write(true); PZ.emit('saveload', this); return true; }
  /** 多存檔欄：列出、切換、刪除 */
  slots() { return Store.keys(`pz.${this.id}.save.`).filter((k) => !k.endsWith('.bak')).map((k) => { const slot = k.slice(`pz.${this.id}.save.`.length); const d = Store.getJSON(k, null); return { slot, ts: d && d._ts, data: d }; }); }
  use(slot) { this.flush(); this.slot = slot; return this.open(); }
  remove(slot = this.slot) { Store.remove(this.key(slot)); Store.remove(this.key(slot) + '.bak'); if (slot === this.slot) this.data = this.fresh(); }
}
const Saves = [];
PZ.save = {
  open(id, o = {}) {
    const s = new SaveStore(id, o); s.open(); Saves.push(s);
    if (o.cloud !== false && Env.claude) s.cloud = Cloud.attach(s, o);
    return s;
  },
};
// 頁面要被收起來：所有存檔立刻寫
PZ.on('hidden', () => { for (const s of Saves) { s.flush(); if (s.cloud) s.cloud.now(); } });
// 加到主畫面的 App：請瀏覽器不要清掉資料
if (HAS_DOM && Env.standalone && navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) { /* ignore */ } }
