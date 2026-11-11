// ============ 雲端存檔（只有 Claude 版會動）============
// Claude 版的頁面可以把每個人自己的資料存在頁面外面（db 的 data/users/<自己>/save）：換裝置、清掉瀏覽器資料都還在。
// 網頁版沒有 window.claude，CLOUD.state 一直是 'off'，下面每個函式都直接返回——兩個版本跑的是同一份程式。
//
// 規則：
// - 這台裝置的存檔照舊立刻寫進 localStorage；雲端是另一份，內容真的變了才寫、隔幾秒寫一次、一次只寫一筆。
// - 開機時兩邊比「最後存檔時間」(G.ts)。雲端比較新、而且這台的進度已經同步過 → 直接接上雲端那份。
//   這台有還沒同步的進度、或是已經開始玩了雲端才回話 → 不自己決定，問玩家要哪一份。
// - 雲端還沒回話之前，片頭的按鈕會先等它（最多 5 秒），免得一個新遊戲把雲端的舊進度蓋掉。
// - 頁面被收起來（切到別的 App、鎖螢幕）的時候，等著寫的那一筆馬上送出去，不等那幾秒。
// - 寫失敗：暫時的狀況會自己再試（先隔幾秒、再不行每半分鐘一次）；沒有權限、被收回這一類就當「這次沒有雲端」。
// - 任何一步失敗都只影響雲端那一份：遊戲照常用這台裝置的存檔。
const SYNC_KEY = 'fallencourt.sync';
const CLOUD = { state: 'off', doc: null, ready: null, remote: null, busy: false, dirty: false, timer: 0, failAt: 0, wait: 0, fails: 0, okAt: 0, sig: '', ask: null, asking: false };
// 寫不進去、而且再試也沒用的狀況（沒有寫入的權限、被收回、資料太大、額度滿了、這個畫面不給用）。其餘的——包含不認得的——都當成暫時的
const CLOUD_END = { invalid_argument: 1, quota_exceeded: 1, revoked: 1, not_granted: 1, capability_disabled: 1, capability_removed: 1, transform_error: 1 };
const cloudOn = () => CLOUD.state === 'on';
function decodeSave(code) { try { code = String(code).trim(); if (!code.startsWith('FC1.')) return null; const g = JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))); return g && g.v === 1 && g.party && ZONES[g.zone] ? g : null; } catch (e) { return null; } }
// 存檔裡「會不會一直變但不重要」的欄位（位置、時鐘）拿掉之後的內容：只有這個變了才值得寫上雲端
function saveSig(g) { try { return JSON.stringify(Object.assign({}, g, { pos: 0, ts: 0, stat: Object.assign({}, g.stat, { sec: 0 }) })); } catch (e) { return String(Math.random()); } }
function cloudBoot() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  CLOUD.state = 'wait';
  CLOUD.ready = (async () => {
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) throw new Error('none');
      const id = await user.id(); if (!id) throw new Error('no id');
      CLOUD.doc = db.doc('data/users/' + id + '/save');
      const snap = await Promise.race([CLOUD.doc.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000))]);
      const d = snap && snap.exists ? snap.data() : null, g = d && typeof d.code === 'string' ? decodeSave(d.code) : null;
      CLOUD.remote = g ? { code: d.code, g, ts: g.ts || +d.ts || 0 } : null;
      CLOUD.state = 'on';
    } catch (e) { CLOUD.state = 'off'; }
    try { cloudSettle(); } catch (e) { console.error(e); }
  })();
  setInterval(() => { if (CLOUD.ask && !CLOUD.asking) cloudAsk(); }, 1200);
}
// 雲端回話了：決定用哪一份
function cloudSettle() {
  if (!cloudOn()) return;
  const R = CLOUD.remote, local = loadGame(), synced = +(store.get(SYNC_KEY) || 0), playing = S.mode !== 'title';
  if (R) CLOUD.sig = saveSig(R.g);
  if (!R) { if (local) cloudPush(true); return; }
  const lts = local ? (local.ts || 0) : -1;
  if (lts === R.ts) { store.set(SYNC_KEY, String(R.ts)); return; }
  if (local && lts > R.ts && !(playing && G && G.t0 > R.ts && R.g.stat.sec > G.stat.sec + 120)) { cloudPush(true); return; } // 這台比較新
  // 雲端比較新（或這台沒有存檔；或這台是剛開的新遊戲，雲端那份其實走得更遠）
  if (!playing && (!local || lts === synced)) { cloudAdopt(R); showTitle(); toast('接上了你上次的進度。'); return; }
  CLOUD.ask = R; // 這台有沒同步過的進度、或已經在玩了：問玩家
}
function cloudAdopt(R) { store.set(SAVE_KEY, JSON.stringify(R.g)); store.set(SYNC_KEY, String(R.ts)); CLOUD.sig = saveSig(R.g); }
const saveLine = g => `第 ${g.lv} 級・${ZONES[g.zone].n}・走了 ${Math.floor((g.stat.sec || 0) / 60)} 分鐘`;
async function cloudAsk() {
  const R = CLOUD.ask; if (!R || CLOUD.asking) return;
  const title = S.mode === 'title';
  if (!title && (S.mode !== 'explore' || S.cut || S.hold || S.dialog || S.panel)) return; // 等到站著沒事的時候再問
  if (!UI.modal.classList.contains('hide')) return;
  CLOUD.asking = true;
  const local = title ? loadGame() : G;
  const yes = await confirmBox('有兩份進度', `<div style="text-align:left;line-height:1.9">這台裝置：${local ? saveLine(local) : '（沒有）'}<br>另一台裝置留下的：${saveLine(R.g)}</div><div class="hint" style="margin-top:8px">只能留一份。沒選的那一份會被蓋掉。</div>`, '接另一台的', '留這台的');
  CLOUD.ask = null; CLOUD.asking = false;
  if (yes) {
    cloudAdopt(R);
    if (title) { showTitle(); toast('接上了另一台的進度。'); }
    else await switchSave(JSON.parse(JSON.stringify(R.g)), '接上了另一台的進度。');
  } else cloudPush(true);
}
// 存檔之後呼叫：過幾秒把這台的存檔寫上雲端
function cloudPush(now) {
  if (!cloudOn() || CLOUD.ask) return; CLOUD.dirty = true;
  if (CLOUD.busy || CLOUD.timer || Date.now() - CLOUD.failAt < CLOUD.wait) return;
  CLOUD.timer = setTimeout(cloudFlush, now ? 50 : 4000);
}
// 頁面要被收起來了：等著寫的那一筆現在就送，不等那幾秒
function cloudNow() { if (!cloudOn() || !CLOUD.dirty || CLOUD.busy || CLOUD.ask || Date.now() - CLOUD.failAt < CLOUD.wait) return; clearTimeout(CLOUD.timer); CLOUD.timer = 0; cloudFlush(); }
async function cloudFlush() {
  CLOUD.timer = 0; if (!cloudOn() || CLOUD.busy || !CLOUD.dirty || CLOUD.ask) return;
  const s = store.get(SAVE_KEY); let g = null; try { g = JSON.parse(s); } catch (e) { /* ignore */ } if (!g) { CLOUD.dirty = false; return; }
  const sig = saveSig(g); CLOUD.dirty = false;
  if (sig === CLOUD.sig) return; // 只是位置和時鐘在動：不寫
  CLOUD.busy = true;
  try {
    await CLOUD.doc.set({ v: 1, code: 'FC1.' + btoa(unescape(encodeURIComponent(s))), ts: g.ts || 0, lv: g.lv, zone: g.zone, sec: Math.round(g.stat.sec || 0) });
    CLOUD.sig = sig; CLOUD.okAt = Date.now(); CLOUD.fails = 0; CLOUD.wait = 0; store.set(SYNC_KEY, String(g.ts || 0));
  } catch (e) {
    const c = e && e.code;
    if (CLOUD_END[c]) CLOUD.state = 'off'; // 這次就不用雲端了：遊戲照常存在這台裝置
    else { // 暫時的：頭一次隔幾秒自己再試一次；還是不行（或是被嫌太頻繁）就半分鐘後再說
      CLOUD.dirty = true; CLOUD.failAt = Date.now(); CLOUD.wait = c === 'resource_exhausted' || CLOUD.fails++ ? 30000 : 2000 + Math.random() * 3000;
      setTimeout(() => cloudPush(true), CLOUD.wait + 80);
    }
  }
  CLOUD.busy = false; if (CLOUD.dirty) cloudPush();
}
// 設定頁裡的一行說明（網頁版回傳空字串）
function cloudNote() {
  if (!window.claude || typeof window.claude.use !== 'function') return '';
  if (CLOUD.state === 'wait') return '正在連上你的帳號……';
  if (!cloudOn()) return '這次沒連上你的帳號：進度先只存在這台裝置。';
  const m = CLOUD.okAt ? Math.floor((Date.now() - CLOUD.okAt) / 60000) : -1;
  return '進度也跟著你的 Claude 帳號走：換一台裝置打開，會自己接上。' + (m >= 0 ? `（${m < 1 ? '剛剛' : m + ' 分鐘前'}同步過）` : '');
}
