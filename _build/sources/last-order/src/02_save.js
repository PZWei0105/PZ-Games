/* ===== 存檔（PZ 引擎：自動備份、存檔碼；Claude 版另外有雲端存檔） ===== */
const SAVE_KEY = 'lastorder.v1'; // 引擎版之前的存檔：第一次開新版時自動搬過來
const Save = {
  d: null, store: null,
  def() { return { unlocked: 1, cleared: {}, best: {}, ach: {}, st: { kills: 0, bat: 0, fire: 0, deaths: 0, combo: 0 }, endless: 0, endlessOpen: false, sound: true, ending: null, tut: false }; },
  load() {
    this.store = PZ.save.open('last-order', {
      version: 1, defaults: () => this.def(), code: 'LO',
      describe: (d) => `已解鎖到第 ${Math.min(5, d.unlocked || 1)} 章・擊倒 ${(d.st && d.st.kills) || 0}`,
    });
    if (this.store.loadedFrom === 'new') {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
      if (raw && typeof raw === 'object') { Object.assign(this.store.data, raw); this.store.write(true); }
    }
    this.fix();
  },
  /** 補齊巢狀欄位（舊存檔、存檔碼、雲端讀進來的都走這裡） */
  fix() {
    const d = this.store.data, base = this.def();
    d.st = Object.assign(base.st, d.st || {}); d.cleared = d.cleared || {}; d.best = d.best || {}; d.ach = d.ach || {};
    // 舊版的「音效：關」改成引擎設定裡的音量
    if (d.sound === false) { PZ.settings.set('sfx', 0, { local: true }); PZ.settings.set('music', 0, { local: true }); d.sound = true; this.store.write(); }
    this.d = d;
  },
  save() { this.store.data = this.d; this.store.write(); }
};
PZ.on('saveload', (s) => { if (Save.store === s) { Save.fix(); if (App.screen === 'title') Title.render(); } });
