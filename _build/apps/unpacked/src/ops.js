/* 解包 — 粉專作戰台（遊戲狂想曲）：Threads 優先、IG 與 FB 粉專分階段加開的發文排程、每次上架都附上架教學、導流成效追蹤、影片三連發。
   你的發文紀錄、排程、成效數字只存在這台裝置（localStorage「unpacked.v1.ops」），成效頁可以匯出備份碼換手機。
   平台規則（字數、hashtag、連結額度、營利門檻）讀 data/platforms.json（每週懶人包排程每週查一次），讀不到就用內建的。
   這一檔：狀態、各平台版本、排程、今日任務、上架流程、排程週曆、出稿台的平台區塊。成效在 opsstats.js、教學與影片三連發在 opslearn.js、
   Threads 優先的每日三件事、限免快訊、推坑稿與平台階段在 opsth.js。 */
const OPS_PF = ['th', 'ig', 'fb'];
const PFI = {
  th: { n: 'Threads', s: '脆', full: 'Threads（脆）', c: '#C96A10', app: 'https://www.threads.com/' },
  ig: { n: 'Instagram', s: 'IG', full: 'Instagram', c: '#EE2A80', app: 'https://www.instagram.com/' },
  fb: { n: 'Facebook', s: 'FB', full: 'Facebook 粉專', c: '#3A82F0', app: 'https://www.facebook.com/' },
};
const pfBadge = (pf, cls = '') => `<span class="pfb ${pf} ${cls}">${PFI[pf].s}</span>`;
const BRAND_TAG = '#遊戲狂想曲';
/* 內建的平台規則（platforms.json 讀不到時用；數字跟 2026-11-18 查證的一樣） */
const PLAT0 = {
  checked: '2026-11-18',
  th: { chars: 500, attach: 10000, topics: 1, links: 5, notes: [], src: [] },
  ig: { caption: 2200, hashtags: 5, bio_links: 5, notes: [], src: [] },
  fb: { link_free: 2, notes: [], src: [] },
  yt: { fan: { subs: 500, hours: 3000, shorts: 3000000, uploads90: 3 }, ads: { subs: 1000, hours: 4000, shorts: 10000000 }, ads_new: { from: '2027-02-01', subs: 1000, hours: 8000, shorts: 20000000 }, notes: [], src: [] },
  times: { th: { note: '', src: [] }, other: '' },
};
function plat() {
  const p = S.plat; if (!p || !p.th) return PLAT0;
  const out = {}; for (const k of Object.keys(PLAT0)) out[k] = Object.assign({}, PLAT0[k], p[k] || {});
  out.yt = Object.assign({}, PLAT0.yt, p.yt || {}); out.checked = p.checked || PLAT0.checked; return out;
}

/* ---- 狀態（只存在這台裝置） ---- */
const OPS0 = { v: 1, mode: null, cad: null, pin: {}, log: [], wk: {}, vids: [], setup: {}, prof: { yt: '', th: '', ig: '', fb: '' }, fbLimit: 'unknown', guide: 'full', ed: {}, vchk: {}, dq: {} };
S.ops = Object.assign({}, OPS0, LS.get('ops', {}));
S.ops.prof = Object.assign({}, OPS0.prof, S.ops.prof || {});
S.ops.dq = S.ops.dq || {};
const opsSave = () => LS.set('ops', S.ops);
if (!S.ops.since) { S.ops.since = todayTW(); opsSave(); }   // 從哪一天開始用（之前的日子不算沒發）
/* 平台階段（2026-11-19 起 Threads 優先）：th＝只顧 Threads（第一階段）、thig＝加開 IG（第二階段）、all＝三平台（第三階段）。
   還沒在 IG、FB 發過文的從 Threads 開始；之前就在 IG、FB 發過的維持三平台，不打亂原本的節奏。 */
const OPS_MODES = { th: ['th'], thig: ['th', 'ig'], all: ['th', 'ig', 'fb'] };
if (!OPS_MODES[S.ops.mode]) { S.ops.mode = S.ops.log.some((l) => l.pf !== 'th') ? 'all' : 'th'; opsSave(); }
const opsPfs = () => OPS_MODES[S.ops.mode] || OPS_PF;
const thOnly = () => S.ops.mode === 'th';
const OPS = { wk: 0, cdT: 0, steps: new Set(), tab: {}, card: { layout: 'A', ratio: '45', seed: 1, wk: 'cover' }, cur: null, edit: false };

/* ---- 時間 ---- */
const addD = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const wdNum = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
const twNow = () => new Date(Date.now() + 8 * 3600e3);
const nowHM = () => { const t = twNow(); return String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0'); };
const slotTs = (d, at) => Date.parse(d + 'T' + at + ':00+08:00');
const monOf = (d) => addD(d, -((wdNum(d) + 6) % 7));
const dayLab = (d) => `${mdDay(d)}（${WK[wdNum(d)]}）`;
const rid = () => (Math.random().toString(36).slice(2) + '000000').slice(0, 7);
function hms(ms) { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0'); }

/* ---- 發文節奏：每個平台一週七天（日～六）的時段，null＝那天不發 ----
   Threads 照台灣 2025 全年數據：週間晚上 8～10 點最熱、週四最高、週一中午、週末偏冷（data/platforms.json 的 times）。
   FB、IG 沒有可靠的台灣時段數據：先用晚上 8 點，成效頁累積你自己的成績後會告訴你哪個時段最好。 */
const CAD_PRESET = {
  std: { name: '標準', note: '脆每天、FB 一週 4 篇、IG 一週 3 篇，每天坐下來一次發完', noteTh: '每天一篇：週間晚上 8～9 點、週一中午 12 點、週日晚上放週報（台灣 Threads 最熱的時段）', noteIg: '脆每天、IG 一週 3 篇', th: ['21:00', '12:00', '21:00', '20:00', '20:00', '20:30', '20:30'], fb: ['21:00', null, '20:00', null, '20:00', null, '20:30'], ig: ['21:00', null, null, '20:00', null, '20:00', null] },
  lite: { name: '起步', note: '一週 4 天：脆 4 篇、FB 2 篇、IG 2 篇，先養成習慣', noteTh: '一週 4 篇：週三、四、六晚上＋週日週報，先養成習慣', noteIg: '一週 4 天：脆 4 篇、IG 2 篇', th: ['21:00', null, null, '20:00', '20:00', null, '20:30'], fb: ['21:00', null, null, null, '20:00', null, null], ig: ['21:00', null, null, '20:00', null, null, null] },
  rush: { name: '衝刺', note: '脆每天、FB 一週 5 篇、IG 一週 4 篇', noteIg: '脆每天、IG 一週 4 篇', th: ['21:00', '12:00', '21:00', '20:00', '20:00', '20:30', '20:30'], fb: ['21:00', null, '20:00', '20:00', '20:00', null, '20:30'], ig: ['21:00', null, '21:00', '20:00', null, '20:00', '20:30'] },
};
const cad = () => S.ops.cad || CAD_PRESET.std;
/* 這個階段看得到的節奏（只顧 Threads 時「衝刺」跟「標準」一樣，不列） */
const cadPresets = () => Object.entries(CAD_PRESET).filter(([k]) => !(thOnly() && k === 'rush'));
const cadNote = (p) => (thOnly() ? p.noteTh : S.ops.mode === 'thig' ? p.noteIg : null) || p.note;
/* 數據上的熱門時段（只有 Threads 有台灣數據） */
function hotOf(pf, d, at) {
  if (pf !== 'th') return '';
  const wd = wdNum(d);
  if (wd === 4 && (at === '20:00' || at === '21:00')) return '全週最熱';
  if (wd === 3 && at === '20:00') return '第三熱';
  if (wd === 1 && at === '12:00') return '週一最佳';
  return '';
}

/* ---- 內容 ----
   代號：f:<專題>、p:<推坑>、w:<週報>、v:<影片>:<pre|up|talk>、x:<限免快訊，free.json 的 id> */
const splitRef = (ref) => { const i = String(ref).indexOf(':'); return [ref.slice(0, i), ref.slice(i + 1)]; };
const opsFeats = () => (S.index && S.index.items) || [];
const opsPicks = () => (S.picks && S.picks.items) || [];
const vidOf = (id) => (S.ops.vids || []).find((v) => v.id === id) || null;
const VK = { pre: { n: '預告', off: -1, at: '20:00', pfs: ['th', 'fb', 'ig'] }, up: { n: '上片', off: 0, at: null, pfs: ['th', 'fb', 'ig'] }, talk: { n: '討論', off: 1, at: '20:30', pfs: ['th', 'fb'] } };
const KIND_L = { f: '專題', p: '推坑', w: '週報', v: '影片', x: '限免' };
const kindChip = (k) => (KIND_L[k] ? `<span class="kchip k-${k}">${KIND_L[k]}</span>` : '');
const ytIdOf = (u) => { const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(u || ''); return m ? m[1] : ''; };
function refMeta(ref) {
  const [k, id] = splitRef(ref);
  if (k === 'f') { const x = opsFeats().find((i) => i.id === id); return x ? { ref, k, title: x.zh, sub: x.headline, img: headerOf(x), date: x.date, stamp: x.stamp } : { ref, k, title: id, sub: '', img: '', date: '' }; }
  if (k === 'p') { const x = opsPicks().find((i) => i.id === id); return x ? { ref, k, title: x.zh, sub: x.pitch || x.label || '', img: headerOf(x), date: x.date, stamp: x.stamp } : { ref, k, title: id, sub: '', img: '', date: '' }; }
  if (k === 'x') { const x = freeOf(id); return x ? { ref, k, title: `限免｜${x.title}`, sub: `${STORE_N[x.store] || x.store} 免費領・${x.end ? '領到 ' + freeEndTW(x) : '期限看商店頁'}`, img: x.img || '', date: todayTW() } : { ref, k, title: '限免快訊', sub: '這個限免已經結束', img: '', date: '' }; }
  if (k === 'w') { const w = ((S.weekly && S.weekly.items) || []).find((i) => i.id === id); const m = w && w.mvp && wkRef(w.mvp); return { ref, k, title: `WEEK ${wkNo(id)} 懶人包`, sub: w ? w.title : '', img: m ? headerOf(m.it) : '', date: w ? w.date : '', wk: true }; }
  if (k === 'v') { const [vid, vk] = id.split(':'); const v = vidOf(vid); const yt = v && ytIdOf(v.url); return { ref, k, title: `${(VK[vk] || {}).n || ''}｜${v ? v.t : '影片'}`, sub: v ? `上片 ${dayLab(v.at.slice(0, 10))} ${v.at.slice(11, 16)}` : '', img: yt ? ytThumb(yt, 'hqdefault') : '', date: v ? v.at.slice(0, 10) : '', vid: true }; }
  return { ref, k, title: ref, sub: '', img: '', date: '' };
}

/* ---- 排程：每天有哪些時段、配哪一篇 ---- */
function vidSlots(d) {
  const out = []; const on = opsPfs();
  for (const v of S.ops.vids || []) {
    if (!v.at) continue; const up = v.at.slice(0, 10);
    for (const [k, c] of Object.entries(VK)) if (addD(up, c.off) === d) for (const pf of c.pfs) if (on.includes(pf)) out.push({ pf, at: c.at || v.at.slice(11, 16), ref: `v:${v.id}:${k}` });
  }
  return out;
}
function opsSlotsFor(d) {
  const wd = wdNum(d); const C = cad(); const P = (S.ops.pin || {})[d] || {}; const out = [];
  const vs = vidSlots(d);
  for (const pf of opsPfs()) {
    const vv = vs.filter((x) => x.pf === pf);
    if (vv.length) vv.forEach((x, i) => out.push({ k: d + '.' + pf + (i ? '~' + i : ''), d, pf, at: x.at, vref: x.ref, src: 'vid' }));
    else if (C[pf] && C[pf][wd]) out.push({ k: d + '.' + pf, d, pf, at: C[pf][wd], src: 'auto' });
    else if (P[pf] && P[pf].add) out.push({ k: d + '.' + pf, d, pf, at: P[pf].at || '20:00', src: 'add' });
  }
  for (const s of out) { const p = P[s.pf]; if (p && !s.k.includes('~')) { if (p.at) s.at = p.at; if (p.r) s.pin = p.r; } }
  return out.sort((a, b) => a.at.localeCompare(b.at) || OPS_PF.indexOf(a.pf) - OPS_PF.indexOf(b.pf));
}
function autoPick(d, pf, used, dayPick, s) {
  const ok = (r) => r && !used[pf].has(r);
  if (wdNum(d) === 0) {   // 週日晚上：週報優先（19:43 出爐）
    const wk = ((S.weekly && S.weekly.items) || []).find((w) => w.to === d);
    if (wk && ok('w:' + wk.id)) return 'w:' + wk.id;
    if (!wk && s.at >= '20:00' && nowHM() < '21:00') { s.wkWait = true; return null; }
  }
  if (pf !== 'th' && ok(dayPick) && !dayPick.startsWith('v:')) return dayPick;   // FB、IG 跟脆同一篇：一次坐下來發完
  const newest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.rank || 9) - (b.rank || 9));
  const feats = opsFeats().filter((x) => x.date <= d && x.date >= addD(d, -3)).sort(newest).map((x) => 'f:' + x.id);
  // 推坑是已經上市的好遊戲，放兩週內都不過時；「特價入」講的是當時的特價，只在推出隔天內排
  const picks = opsPicks().filter((x) => x.date <= d && x.date >= addD(d, x.stamp === '特價入' ? -1 : -14)).sort(newest).map((x) => 'p:' + x.id);
  // 週二、四、六輪推坑（私房好遊戲，收藏、轉傳率高），其他天輪專題（新作、新聞性）；哪一邊發完了就換另一邊
  const order = [2, 4, 6].includes(wdNum(d)) ? [...picks, ...feats] : [...feats, ...picks];
  for (const r of order) if (ok(r)) return r;
  return null;
}
/* 還沒排內容的日子預定排哪一類（跟 autoPick 同一套：週二、四、六推坑，其他天專題） */
const planKind = (d) => ([2, 4, 6].includes(wdNum(d)) ? 'p' : 'f');
/* 今天以前看發文紀錄；今天自動配內容；明天以後只有釘選和影片三連發（新的解包每天 05:23 才出來） */
function opsPlan(from, to) {
  const today = todayTW(); const now = Date.now();
  const used = { th: new Set(), ig: new Set(), fb: new Set() }; const byK = new Map();
  for (const l of S.ops.log) { if (used[l.pf]) used[l.pf].add(l.ref); if (l.k) byK.set(l.k, l); }
  const days = []; const since = S.ops.since || today;
  for (let d = from; d <= to; d = addD(d, 1)) {
    if (d < since) { days.push({ d, slots: [], before: true }); continue; }   // 開始用作戰台之前的日子不算「沒發」
    const slots = opsSlotsFor(d); let dayPick = null;
    for (const pf of ['th', 'fb', 'ig']) for (const s of slots.filter((x) => x.pf === pf)) {
      s.hot = hotOf(pf, d, s.at);
      const lg = byK.get(s.k);
      if (lg) { s.ref = lg.ref; s.st = 'done'; s.log = lg; if (pf === 'th' && !dayPick) dayPick = lg.ref; continue; }
      if (s.pin === '-') { s.st = 'skip'; continue; }
      if (d < today) { s.ref = s.pin || s.vref || null; s.st = 'miss'; continue; }
      let ref = s.pin || s.vref || null;
      if (!ref && d === today) ref = autoPick(d, pf, used, dayPick, s);
      if (!ref && d > today && wdNum(d) === 0 && s.at >= '20:00') s.wkWait = true;   // 週日晚上排週報
      s.ref = ref;
      if (ref && pf === 'th' && !dayPick) dayPick = ref;
      const t = slotTs(d, s.at);
      s.st = !ref ? (d > today || s.wkWait ? 'wait' : 'empty') : d > today ? 'plan' : now > t + 3 * 3600e3 ? 'late' : now >= t - 45 * 6e4 ? 'now' : 'todo';
    }
    days.push({ d, slots });
  }
  return days;
}
const opsDay = (d) => opsPlan(d, d)[0].slots;
function opsSlot(k) { const d = k.slice(0, 10); return opsDay(d).find((s) => s.k === k) || null; }
function opsBadge() { if (!S.index) return 0; try { return opsDay(todayTW()).filter((s) => s.st === 'todo' || s.st === 'now' || s.st === 'late').length; } catch (e) { return 0; } }
function opsStreak() { const ds = new Set(S.ops.log.map((l) => l.d)); let d = todayTW(); if (!ds.has(d)) d = addD(d, -1); let n = 0; while (ds.has(d)) { n++; d = addD(d, -1); } return n; }
const pubOf = (ref) => { const o = {}; for (const l of S.ops.log) if (l.ref === ref) o[l.pf] = o[l.pf] || l.at; return o; };
/* FB 本月用掉幾個連結額度（帶外部連結的貼文或留言；每月 1 號重算） */
const fbLinksUsed = () => { const m = todayTW().slice(0, 7); return S.ops.log.filter((l) => l.pf === 'fb' && l.link && l.d.slice(0, 7) === m).length; };

/* ---- 發文紀錄 ---- */
function opsLog(ref, pf, k, link) {
  if (S.ops.log.some((l) => l.ref === ref && l.pf === pf && (!k || l.k === k))) return false;
  S.ops.log.push({ id: rid(), ref, pf, d: todayTW(), k: k || null, at: new Date().toISOString(), link: !!link });
  const [kk, id] = splitRef(ref);
  if (kk === 'f' && !S.posted[id]) { S.posted[id] = todayTW(); save('posted'); }
  if (kk === 'w' && !S.posted['w:' + id]) { S.posted['w:' + id] = todayTW(); save('posted'); }
  opsSave(); return true;
}
function opsUnlog(ref, pf) {
  for (let i = S.ops.log.length - 1; i >= 0; i--) if (S.ops.log[i].ref === ref && S.ops.log[i].pf === pf) { S.ops.log.splice(i, 1); break; }
  opsSave();
}
/* 同一篇今天在幾個平台發了（COMBO） */
const comboN = (ref) => new Set(S.ops.log.filter((l) => l.ref === ref && l.d === todayTW()).map((l) => l.pf)).size;
function opsCombo(n, el) {
  sfx.ding(); haptic(30);
  if (el) impact(el, [RED, YEL, BLK], n >= 3);
  if (n < 2) return;
  setTimeout(() => sfx.fanfare(), 180);
  const c = document.createElement('div'); c.id = 'combo';
  c.innerHTML = `<div class="cb">COMBO<b>×${n}</b><small>${n >= 3 ? '三平台全發！' : '兩個平台都發了'}</small></div>`;
  document.body.appendChild(c); if (fxOn()) { burst(innerWidth / 2, innerHeight / 2, [PINK, YEL, BLK], 60, 18); shake(10, 300); }
  setTimeout(() => c.remove(), 1900);
}

/* ---- 草稿：一篇內容（專題／週報／影片三連發）整理成三個平台各自的版本 ---- */
async function opsDraft(ref) {
  const [k, id] = splitRef(ref);
  if (k === 'f') {
    const f = await loadFeature(id); const fp = f.fanpage || {};
    return { ref, k, id, title: f.game.zh, sub: f.headline, base: S.edits[id] != null ? S.edits[id] : fp.post || '', tags: fp.tags || [], titles: fp.titles || [], th: fp.threads || null, credit: fp.credit || '', src: f, date: f.date };
  }
  if (k === 'w') {
    const wk = await loadWeek(id); const fp = wk.fanpage || {}; const key = 'w:' + id;
    return { ref, k, id, title: `WEEK ${wkNo(id)} 懶人包`, sub: wk.title, base: S.edits[key] != null ? S.edits[key] : fp.post || '', tags: fp.tags || [], titles: fp.titles || [], th: fp.threads || null, credit: fp.credit || '', src: wk, date: wk.date };
  }
  if (k === 'v') {
    const [vid, vk] = id.split(':'); const v = vidOf(vid); if (!v) throw new Error('找不到這支影片的三連發（可能被刪掉了）');
    const cl = await vidClaude(v); const p = cl && cl.posts && cl.posts[vk];
    const tpl = vidTpl(v, vk);
    return { ref, k, id, vid: v, vk, title: `${VK[vk].n}｜${v.t}`, sub: `上片 ${dayLab(v.at.slice(0, 10))} ${v.at.slice(11, 16)}`, base: p ? p.post : tpl.post, th: { post: p ? p.threads || p.post : tpl.threads, topic: (p && p.topic) || '遊戲' }, tags: (p && p.tags) || tpl.tags, titles: [], credit: '遊戲狂想曲 YouTube', claude: !!p, card: (p && p.card) || null, date: v.at.slice(0, 10) };
  }
  if (k === 'p') {   // 推坑：推坑排程寫的 fanpage（Threads 版＋串文延伸）；舊推坑沒有就照推坑內容自動整理
    const p = await loadPick(id); const fp = p.fanpage || {}; const key = 'p:' + id;
    const th = fp.threads || pickThreadsAuto(p);
    const base = S.edits[key] != null ? S.edits[key] : fp.post || [th.post, ...(th.more || [])].join('\n\n');
    return { ref, k, id, title: p.game.zh, sub: p.pitch, base, tags: fp.tags || pickTagsAuto(p), titles: fp.titles || [], th, credit: fp.credit || `圖片／影片來源：${p.game.zh} 官方商店頁與預告`, src: p, date: p.date, auto: !fp.threads };
  }
  if (k === 'x') {   // 限免快訊：free.json 的即時資料直接排成貼文（數字都是 GitHub Actions 每小時抓的）
    const x = freeOf(id); if (!x) throw new Error('這個限免已經結束或下架了');
    const t = freeTpl(x);
    return { ref, k, id, title: `限免快訊｜${x.title}`, sub: refMeta(ref).sub, base: t.post, th: { post: t.threads, topic: t.topic }, tags: t.tags, titles: [], credit: `圖片來源：${STORE_N[x.store] || x.store} 商店頁`, src: x, date: todayTW(), auto: true };
  }
  throw new Error('不認得的內容：' + ref);
}
/* Threads 串文：單獨一行「---」分開每一則（推坑、專題的 threads.more 會自動接成這樣）；一則超過上限才照段落拆 */
const THSEP = '\n\n---\n\n';
function thParts(text, max) {
  const segs = String(text || '').split(/\n[ \t]*-{3,}[ \t]*\n/).map((s) => s.trim()).filter(Boolean);
  const parts = []; let split = false;
  for (const s of segs) { if (s.length <= max) parts.push(s); else { split = true; parts.push(...splitParts(s, max)); } }
  return { parts: parts.length ? parts : [''], split };
}
/* Threads 網頁意圖連結：手機上有裝 Threads 會直接打開 App 的發文畫面，文字和主題標籤都帶好（Meta 官方 Web Intents） */
const thIntent = (text, topic) => 'https://www.threads.com/intent/post?text=' + encodeURIComponent(text) + (topic ? '&tag=' + encodeURIComponent(topic) : '');
/* 太長就照段落拆成幾則（Threads 一則上限 500 字） */
function splitParts(text, max) {
  if (text.length <= max) return [text];
  const out = []; let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (const para of text.split(/\n{2,}/)) {
    const add = (cur ? cur + '\n\n' : '') + para;
    if (add.length <= max) { cur = add; continue; }
    push();
    if (para.length <= max) { cur = para; continue; }
    let buf = '';
    for (const sen of para.split(/(?<=[。！？!?])/)) { if ((buf + sen).length > max) { if (buf) out.push(buf.trim()); buf = sen.length > max ? '' : sen; if (sen.length > max) for (let i = 0; i < sen.length; i += max) out.push(sen.slice(i, i + max)); } else buf += sen; }
    cur = buf;
  }
  push(); return out;
}
function pickTags(tags, n) {
  const t = (tags || []).filter((x) => x && x !== BRAND_TAG);
  return [...t.slice(0, Math.max(0, n - 1)), BRAND_TAG];
}
const YT_SEARCH = '▶ YouTube 搜尋「遊戲狂想曲」，每週新片';
/* 一個平台的版本：文字、拆段、hashtag、連結怎麼處理、要注意的事 */
function pfCompose(dr, pf) {
  const P = plat(); const key = dr.ref + '|' + pf; const warn = [];
  const v = dr.vid; const url = v && v.url && ytIdOf(v.url) ? v.url.trim() : '';
  let link = 'none', text = '', tags = [], topic = '', parts = null;
  if (pf === 'th') {
    const th = dr.th || {};
    let body = th.post || dr.base;
    if (v) { if (dr.vk === 'up' || dr.vk === 'talk') { if (url) { body += '\n\n▶ 完整影片：' + url; link = 'inline'; } else warn.push('還沒填影片網址：到影片三連發頁填上，連結會自動加在最後一行'); } }
    const more = (th.more || []).filter((x) => x && String(x).trim());
    text = S.ops.ed[key] != null ? S.ops.ed[key] : [body, ...more].join(THSEP);
    topic = th.topic || '遊戲';
    const tp = thParts(text, P.th.chars); parts = tp.parts;
    if (tp.split) warn.push(`有一則超過 ${P.th.chars} 字，已經照段落拆開；也可以改用「文字附件」一次發（最多 1 萬字）`);
  } else if (pf === 'ig') {
    tags = pickTags(dr.tags, P.ig.hashtags);
    const cta = v ? (dr.vk === 'pre' ? '▶ 明天上片，先追蹤不錯過' : '▶ 完整影片：點個人檔案的連結') : '▶ 遊戲狂想曲 YouTube：連結在個人檔案';
    if (v && dr.vk === 'up') { link = 'bio'; }
    text = S.ops.ed[key] != null ? S.ops.ed[key] : [dr.base, cta, tags.join(' ')].join('\n\n');
    if ((text.match(/#[^\s#]+/g) || []).length > P.ig.hashtags) warn.push(`hashtag 超過 ${P.ig.hashtags} 個：IG 會擋，刪到 ${P.ig.hashtags} 個以內`);
    if (/https?:\/\//.test(text)) warn.push('IG 說明文字裡的網址不能點：改成「連結在個人檔案」');
    if (text.length > P.ig.caption) warn.push(`超過 IG 上限 ${P.ig.caption} 字`);
  } else {
    tags = dr.tags || [];
    let cta = YT_SEARCH;
    if (v && dr.vk === 'up') { if (url) { cta = '▶ 完整影片：' + url; link = 'budget'; } else warn.push('還沒填影片網址：到影片三連發頁填上'); }
    text = S.ops.ed[key] != null ? S.ops.ed[key] : [dr.base, cta, tags.join(' ')].join('\n\n');
    if (link !== 'budget' && /https?:\/\//.test(text)) link = 'budget';
  }
  if (/＿{2,}/.test(text)) warn.push('還有「＿＿＿」沒填：發文前改成你看到的內容');
  if (/痞子葳/.test(text)) warn.push('出現了你本人的名字：粉專只用「遊戲狂想曲」');
  if (pf !== 'th' && /\n[ \t]*-{3,}[ \t]*\n/.test(text)) warn.push('裡面有 Threads 串文的分隔線「---」：這個平台是一整篇，發之前刪掉那幾行');
  return { pf, text, parts, tags, topic, link, warn, n: pf === 'th' ? parts[0].length : text.length, max: pf === 'th' ? P.th.chars : pf === 'ig' ? P.ig.caption : 0, edited: S.ops.ed[key] != null, auto: !!dr.auto };
}

/* ---- 上架教學：每次上架都附上（照平台、照這一篇的狀況生成步驟） ---- */
function pfSteps(pf, c, ctx) {
  const P = plat(); const at = ctx.at || ''; const sch = at && ctx.d ? `${dayLab(ctx.d)} ${at}` : '想要的時間';
  const wk = ctx.k === 'w';
  const B = (label, act, data = '', cls = 'y') => `<button class="btn sm ${cls}" data-act="${act}" ${data}>${label}</button>`;
  const ref = esc(ctx.ref);
  const S1 = [];
  if (pf === 'th') {
    const n = c.parts.length; const tp = esc(c.topic);
    S1.push({ h: '（建議）先存圖卡', p: '有圖的串文在動態上比純文字顯眼。先存起來，等一下在 Threads 裡選它。', b: B(`${ICON.dl}<span>存圖卡</span>`, 'opcdl', `data-ref="${ref}" data-pf="th"`, ''), opt: true });
    S1.push({ h: n > 1 ? `帶到 Threads：第 1／${n} 則` : '一鍵帶到 Threads', p: `按「帶到 Threads」會直接打開 Threads 的發文畫面，${n > 1 ? '第 1 則的' : ''}文字和主題標籤「${tp}」都幫你填好。沒有跳到 App（或想自己貼）：按「複製」，打開 Threads 點最下面中間的「＋」，長按輸入框 →「貼上」。`, b: `<a class="btn sm y thgo" href="${esc(thIntent(c.parts[0], c.topic))}" target="_blank" rel="noopener" data-ref="${ref}">${ICON.mega}<span>帶到 Threads</span></a>${B(`${ICON.copy}<span>${n > 1 ? '複製第 1 則' : '複製'}</span>`, 'opcopy', `data-ref="${ref}" data-pf="th" data-part="0"`, '')}` });
    S1.push({ h: '放上圖卡', p: '點輸入框下面像相片的「圖片」圖示，選剛剛存的圖卡（一則最多 10 張圖）。', opt: true });
    S1.push({ h: `確認主題標籤：${tp}`, p: `輸入框裡應該已經有藍色的「${tp}」。沒有的話打「#」再打「${tp}」，從跳出來的選項點一個。每篇只能 ${P.th.topics} 個主題，發出去不會顯示 # 號。跳出來的選項旁邊有「⋯」的是社群，選它的話貼文會一起出現在那個社群裡。` });
    if (n > 1) S1.push({ h: `接上第 ${n > 2 ? '2～' + n : 2} 則串文`, p: '點輸入框下面的「新增到串文」，回 App 按「複製第 2 則」再貼上；全部接好再一次發。第 1 則負責讓人停下來，後面幾則才是深入的內容。', b: c.parts.slice(1).map((_, i) => B(`${ICON.copy}<span>複製第 ${i + 2} 則</span>`, 'opcopy', `data-ref="${ref}" data-pf="th" data-part="${i + 1}"`, '')).join('') });
    if (c.link === 'inline') S1.push({ h: '影片連結不用另外處理', p: '最後一行的網址發出去就是可以點的連結，還會自動長出預覽卡。' });
    S1.push({ h: ctx.at && ctx.d ? `發佈，或排到 ${esc(sch)}` : '發佈，或排程', p: `現在發：按右下角「發佈」。想排程：點右上角「⋯」→「排程」選時間 →「完成」。發出去 15 分鐘內還能改字（串文右上「⋯」→「編輯」），超過就只能刪掉重發。` });
    S1.push({ h: '發完的第一個小時：回留言', p: '有人留言就回，回得像朋友聊遊戲（多問一句「你玩到哪了？」）。串文底下聊得越熱，Threads 越會推給更多人；新帳號最該花力氣的就是這一小時。' });
  } else if (pf === 'ig') {
    S1.push({ h: wk ? '存三張圖卡' : '存圖卡', p: wk ? '封面、Tier 表、下週出擊三張依序存好，等一下一次選。' : 'IG 一定要有圖：4:5 直式最適合（App 預設就是 4:5）。', b: B(`${ICON.dl}<span>${wk ? '三張一起存' : '存圖卡'}</span>`, wk ? 'opcdl3' : 'opcdl', `data-ref="${ref}" data-pf="ig"`) });
    S1.push({ h: '複製 IG 版', p: `hashtag 已經挑好 ${c.tags.length} 個（IG 每篇上限 ${P.ig.hashtags} 個），網址改成「連結在個人檔案」（IG 說明裡的網址不能點）。`, b: B(`${ICON.copy}<span>複製 IG 版</span>`, 'opcopy', `data-ref="${ref}" data-pf="ig"`) });
    S1.push({ h: '打開 Instagram，新增貼文', p: '點下面的「＋」→ 選「貼文」。', b: `<a class="btn sm" href="${PFI.ig.app}" target="_blank" rel="noopener">打開 Instagram</a>` });
    S1.push({ h: '選圖卡', p: wk ? '點「選擇多張」，照封面 → Tier 表 → 下週出擊的順序選三張 →「下一步」（濾鏡不用）→「下一步」。' : '選剛剛存的圖卡 →「下一步」（濾鏡不用）→「下一步」。' });
    S1.push({ h: '貼上說明文字', p: '點「撰寫說明文字⋯」，長按 →「貼上」。' });
    if (c.link === 'bio') S1.push({ h: '把個人檔案的連結換成這支影片', p: '個人檔案 →「編輯個人檔案」→「連結」，把第一個連結換成這支影片的網址（IG 個人檔案最多 5 個連結）。' });
    S1.push({ h: '分享，或排程', p: `現在發：按「分享」。想排到 ${esc(sch)}：同一頁往下點「進階設定」→ 打開「排定貼文發布時間」選時間 →「排定發布」（要專業帳號）。` });
  } else {
    const used = fbLinksUsed(); const lim = S.ops.fbLimit;
    S1.push({ h: wk ? '存三張圖卡' : '存圖卡', p: wk ? 'FB 一則可以放多張圖：三張依序存好。' : '帶圖的貼文比純文字顯眼。', b: B(`${ICON.dl}<span>${wk ? '三張一起存' : '存圖卡'}</span>`, wk ? 'opcdl3' : 'opcdl', `data-ref="${ref}" data-pf="fb"`) });
    S1.push({ h: '複製 FB 版', p: 'FB 版放完整的 hashtag。', b: B(`${ICON.copy}<span>複製 FB 版</span>`, 'opcopy', `data-ref="${ref}" data-pf="fb"`) });
    S1.push({ h: '打開 Facebook，切成粉專身分', p: '點右上角的大頭貼（或「☰」選單）→ 選「遊戲狂想曲」粉專，確定現在是用粉專在發。', b: `<a class="btn sm" href="${PFI.fb.app}" target="_blank" rel="noopener">打開 Facebook</a>` });
    S1.push({ h: '貼上、加圖', p: '點「在想些什麼？」→ 長按貼上 → 點「相片／影片」選圖卡。' });
    S1.push(c.link === 'budget'
      ? { h: `這篇帶影片連結（本月第 ${used + 1}／${P.fb.link_free} 個額度）`, p: `${lim === 'no' ? '你的粉專沒有連結限制，放心發。' : '部分粉專每月只能發 ' + P.fb.link_free + ' 則帶外部連結的貼文或留言（留言也算），這個額度留給上片文最划算。'}之後想補充，在「這一篇」底下留言再放連結不算額度。` }
      : { h: '這篇不放網址', p: lim === 'no' ? '你的粉專沒有連結限制，但一般解包文不用放：YouTube 搜尋那一行就夠了。' : `部分粉專每月只能發 ${P.fb.link_free} 則帶外部連結的貼文或留言（連留言裡的也算），額度留給上片文。` });
    S1.push({ h: '發佈，或排程', p: `現在發：按「發佈」。想一次把 FB 和 IG 排好：用「Meta Business Suite」App →「建立貼文」→ 兩個都勾 →「排程」選 ${esc(sch)}。` });
  }
  return S1;
}
function stepsHtml(pf, c, ctx) {
  const lite = S.ops.guide === 'lite';
  const steps = pfSteps(pf, c, ctx);
  return `<div class="stepwrap ${lite ? 'lite' : ''}"><div class="sw-h"><b>${pfBadge(pf)} 上架教學</b><span>${steps.length} 步・照著做就對了</span><button class="sw-mode" data-act="opguide">${lite ? '完整說明' : '精簡'}</button></div>
    <ol class="steps">${steps.map((s, i) => { const key = ctx.ref + '|' + pf + '|' + i; return `<li class="step ${OPS.steps.has(key) ? 'ok' : ''} ${s.opt ? 'opt' : ''}"><button class="stk" data-act="opstep" data-key="${esc(key)}" aria-label="這一步完成"><i>${i + 1}</i></button><div class="sb"><b>${s.h}</b>${s.p ? `<p>${s.p}</p>` : ''}${s.b ? `<div class="btnrow">${s.b}</div>` : ''}</div></li>`; }).join('')}
      <li class="step last"><button class="stk" data-act="opstep" data-key="${esc(ctx.ref + '|' + pf + '|done')}" aria-label="完成"><i>✓</i></button><div class="sb"><b>發完回來蓋章</b><p>按下面的「${PFI[pf].s} 發好了」，App 會記下來，明天提醒你回填這篇的成績。</p></div></li></ol>
    <p class="sw-foot">畫面跟教學不一樣？平台常改版：找「＋」「…」或「更多選項」通常就在裡面。還是找不到就 <button class="lnk" data-act="askq" data-q="${esc(`我在 ${PFI[pf].full} 發文時找不到`)}" data-ref="" data-ctx="粉專上架">問 Claude</button>。</p></div>`;
}
/* 一個平台的版本：預覽＋字數＋提醒 */
function pfTextHtml(pf, c, ref) {
  const multi = c.parts && c.parts.length > 1;
  const lim = multi ? `<span class="cnt">串文 ${c.parts.length} 則</span>` : c.max ? `<span class="cnt ${c.n > c.max ? 'over' : ''}">${c.n}／${c.max} 字</span>` : `<span class="cnt">${c.n} 字</span>`;
  const body = multi ? c.parts.map((p, i) => `<div class="pt-part ${i ? '' : 'first'}"><em>${i ? `第 ${i + 1} 則・串文延伸` : '第 1 則・讓人停下來的那一則'}<span class="${p.length > c.max ? 'over' : ''}">${p.length}／${c.max} 字</span></em>${nl2br(p)}</div>`).join('') : nl2br(c.text);
  const edit = OPS.edit === ref + '|' + pf;
  return `<div class="pfbox ${pf}"><h4>${pfBadge(pf)} ${PFI[pf].n} 版 ${lim}</h4>
    ${edit ? `<textarea class="pfed" data-act="opedtxt" data-ref="${esc(ref)}" data-pf="${pf}">${esc(c.text)}</textarea>${pf === 'th' ? '<p class="pf-hint">每一則串文之間用單獨一行「---」隔開；第 1 則最多 500 字。</p>' : ''}` : `<div class="pftxt">${body}</div>`}
    ${pf === 'th' ? `<div class="pf-meta"><span>主題：<b>${esc(c.topic)}</b></span>${c.auto ? '<span class="auto">這篇是 App 照內容自動整理的，發之前看一眼</span>' : ''}</div>` : pf === 'ig' ? `<div class="pf-meta"><span>hashtag ${c.tags.length}／${plat().ig.hashtags}</span></div>` : ''}
    ${c.warn.length ? `<ul class="pf-warn">${c.warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    <div class="btnrow"><button class="btn sm" data-act="opedit" data-ref="${esc(ref)}" data-pf="${pf}">${edit ? '改好了' : '改這個平台的字'}</button>${c.edited ? `<button class="btn sm" data-act="opedreset" data-ref="${esc(ref)}" data-pf="${pf}">還原</button>` : ''}</div></div>`;
}

/* ---- 子分頁 ---- */
function opsNav(cur) {
  const n = opsBadge();
  return `<nav class="ops-nav">${[['', 'today', '今日'], ['~plan', 'plan', '排程'], ['~drafts', 'drafts', '出稿'], ['~stats', 'stats', '成效'], ['~learn', 'learn', '教學']].map(([r, k, l]) => `<button class="${cur === k ? 'on' : ''}" data-go="fan${r ? '/' + r : ''}">${l}${k === 'today' && n ? `<i>${n}</i>` : ''}</button>`).join('')}</nav>`;
}
function opsHead(t, sub) { return `<div class="brandbar ops-bb"><h2 class="spray-h">${t}</h2><div class="brandstk"><b>遊戲狂想曲</b><i>GAME RHAPSODY</i></div></div>${sub ? `<p class="sub-note">${sub}</p>` : ''}`; }
const ST_LAB = { done: '已發', todo: '待發', now: '現在發', late: '晚了也能發', skip: '跳過', miss: '沒發', wait: '自動填上', plan: '已排', empty: '沒有新內容' };

/* ---- 今日任務 ---- */
function slotCard(s) {
  const m = s.ref ? refMeta(s.ref) : null; const lg = s.log;
  const when = lg ? `已發 ${new Date(Date.parse(lg.at) + 8 * 3600e3).toISOString().slice(11, 16)}` : ST_LAB[s.st];
  const go = s.ref ? `fan/~go:${s.k}` : '';
  return `<article class="msn st-${s.st}" style="--rot:${rot(s.k, 1, 0.8)}deg">
    <div class="m-pf">${pfBadge(s.pf)}<b>${esc(s.at)}</b>${s.hot ? `<em class="hot">HOT・${esc(s.hot)}</em>` : ''}${s.src === 'vid' ? '<em class="vidt">影片三連發</em>' : ''}<span class="m-st">${esc(when)}</span></div>
    ${m ? `<div class="m-c" ${go ? `data-go="${go}"` : ''}><div class="m-img" ${m.img ? `style="background-image:url('${esc(m.img)}')"` : ''}>${m.k === 'w' ? `<span class="wk-no sm"><b>${wkNo(splitRef(s.ref)[1])}</b></span>` : ''}</div><div class="m-t">${kindChip(m.k)}<h4>${esc(m.title)}</h4><p>${esc(m.sub)}</p></div></div>`
      : `<div class="m-empty">${s.wkWait ? '週報 19:43 出爐後自動填上' : s.st === 'wait' ? '每天 05:23 解包後自動填上' : '最近的解包和推坑都發過了：可以按「換一篇」挑一篇，或今天跳過'}</div>`}
    <div class="m-b">${s.st === 'done' ? `<button class="btn sm" data-go="${go}">看這篇／回填成績</button>` : s.ref && s.st !== 'skip' ? `<button class="btn p" data-go="${go}">${ICON.mega}<span>開始上架</span></button>` : ''}${s.st !== 'done' ? `<button class="btn sm" data-act="opswap" data-k="${esc(s.k)}">換一篇</button><button class="btn sm" data-act="opskip" data-k="${esc(s.k)}">${s.st === 'skip' ? '不跳過了' : '今天跳過'}</button>` : ''}</div></article>`;
}
function renderOpsToday() {
  const today = todayTW(); const slots = opsDay(today); const now = Date.now();
  const next = slots.find((s) => ['todo', 'now', 'late'].includes(s.st));
  const left = slots.filter((s) => ['todo', 'now', 'late'].includes(s.st)).length;
  const mon = monOf(today); const wkDays = opsPlan(mon, addD(mon, 6));
  const planned = wkDays.reduce((a, x) => a + x.slots.filter((s) => s.st !== 'skip').length, 0);
  const doneWk = S.ops.log.filter((l) => l.d >= mon && l.d <= addD(mon, 6)).length;
  const streak = opsStreak();
  let hero;
  if (next) {
    const grp = slots.filter((s) => s.at === next.at && ['todo', 'now', 'late'].includes(s.st));
    const t = slotTs(today, next.at);
    hero = `<div class="oh-k">${next.st === 'late' ? 'LATE' : t - now < 45 * 6e4 ? 'NOW' : next.at < '17:00' ? 'TODAY' : 'TONIGHT'}</div>
      <div class="oh-t"><b>${esc(next.at)}</b><span>${grp.map((s) => pfBadge(s.pf)).join('')}${next.hot ? `<em class="hot">HOT・${esc(next.hot)}</em>` : ''}</span></div>
      <div class="oh-cd" id="opcd" data-t="${t}">${next.st === 'late' ? '時段過了，現在補發也算數' : t > now ? '還有 ' + hms(t - now) : '就是現在！'}</div>`;
  } else if (slots.length && slots.every((s) => ['done', 'skip'].includes(s.st))) hero = `<div class="oh-k">DONE</div><div class="oh-done">今天收工！<small>${slots.filter((s) => s.st === 'done').length} 篇都發了</small></div>`;
  else if (!slots.length) hero = `<div class="oh-k">REST</div><div class="oh-done">今天沒排<small>想發也可以到「出稿」挑一篇</small></div>`;
  else hero = `<div class="oh-k">WAIT</div><div class="oh-done">內容還在路上<small>每天 05:23 解包後自動填上</small></div>`;
  const tom = opsDay(addD(today, 1));
  return `<div class="ops">${opsNav('today')}${opsHead('作戰台', thOnly() ? '現在只顧 Threads：每天一篇、回完留言、海巡十分鐘。每一篇都附上架教學，發完蓋章，App 幫你記成績。' : `每天坐下來一次，照順序發完${S.ops.mode === 'thig' ? ' Threads 和 IG' : '三個平台'}。每一篇都附上架教學；發完蓋章，App 幫你記成績。`)}
    <section class="op-hero ${next && next.hot ? 'is-hot' : ''}">${hero}
      <div class="oh-st"><div class="streak ${streak ? 'on' : ''}"><b>${streak}</b><span>連發天數</span></div><div class="wkp"><b>${doneWk}<small>／${planned}</small></b><span>本週任務</span><i style="--p:${planned ? Math.min(1, doneWk / planned) : 0}"></i></div><div class="wkp"><b>${left}</b><span>今天還有</span></div></div></section>
    ${dqHtml()}${opsSetupBanner()}
    <h3 class="tape-h">今日任務 <small>${esc(dayLab(today))}</small></h3>
    <div class="msns">${slots.map(slotCard).join('') || '<div class="empty">今天的節奏沒有排發文。到「排程」可以加時段，或到「出稿」挑一篇直接發。</div>'}</div>
    ${extraHtml()}${opsRefillHtml()}${opsCheckinBanner()}
    ${tom.length ? `<h3 class="tape-h y">明天 <small>${esc(dayLab(addD(today, 1)))}</small></h3><div class="tmr">${tom.map((s) => `<div>${pfBadge(s.pf)}<b>${esc(s.at)}</b><span class="tt">${s.ref ? esc(refMeta(s.ref).title) : s.src === 'vid' ? '影片三連發' : wdNum(s.d) === 0 && s.at >= '20:00' ? '週報（19:43 出爐）' : planKind(s.d) === 'p' ? '推坑（自動排一款還沒發過的）' : '專題（05:23 解包後自動填上）'}</span>${s.hot ? '<em class="hot">HOT</em>' : ''}</div>`).join('')}</div>` : ''}
    <div class="endcta"><button class="btn y" data-go="fan/~plan">${ICON.cal}<span>看整週排程</span></button><button class="btn" data-go="fan/~drafts">${ICON.page}<span>翻出稿台</span></button></div></div>`;
}

/* ---- 上架流程（每一個時段） ---- */
async function renderOpsGo(k) {
  const s = opsSlot(k); if (!s) return `<div class="ops">${opsNav('today')}<div class="empty">這個時段不見了（可能改了發文節奏）。<br><button class="btn y" data-go="fan" style="margin-top:12px">回今日任務</button></div></div>`;
  if (!s.ref) return `<div class="ops">${opsNav('today')}<div class="empty">這個時段還沒有內容。<br><button class="btn y" data-act="opswap" data-k="${esc(k)}" style="margin-top:12px">挑一篇</button></div></div>`;
  const dr = await opsDraft(s.ref); OPS.cur = { dr, s };
  return goHtml(dr, s.pf, { k: s.k, d: s.d, at: s.at, st: s.st, hot: s.hot });
}
function goHtml(dr, pf, ctx) {
  const c = pfCompose(dr, pf); const pub = pubOf(dr.ref); const done = !!pub[pf];
  const lg = S.ops.log.find((l) => l.ref === dr.ref && l.pf === pf);
  const sib = opsPfs().filter((p) => p !== pf);
  const wk = dr.k === 'w';
  return `<div class="ops go">${opsNav('today')}
    <div class="btnrow" style="margin-top:12px"><button class="btn sm k" data-go="fan">← 今日任務</button>${dr.k === 'f' ? `<button class="btn sm" data-go="f/${esc(dr.id)}">看完整專題</button>` : dr.k === 'p' ? `<button class="btn sm" data-go="p/${esc(dr.id)}">看推坑全文</button>` : dr.k === 'w' ? `<button class="btn sm" data-go="week/${esc(dr.id)}">看週報</button>` : dr.k === 'x' ? `<button class="btn sm" data-go="hunt">去免費補給站</button>` : `<button class="btn sm" data-go="fan/~vid:${esc(dr.vid.id)}">回影片三連發</button>`}</div>
    <div class="go-head ${pf}">${pfBadge(pf, 'big')}<div><h2>${esc(PFI[pf].full)} 上架</h2><p>${ctx.d ? esc(dayLab(ctx.d) + ' ' + ctx.at) : '不在排程裡，隨時都能發'}${ctx.hot ? `・<em class="hot">HOT・${esc(ctx.hot)}</em>` : ''}</p></div><span class="go-st ${done ? 'ok' : ''}">${done ? '✓ 已發' : '待發'}</span></div>
    <div class="go-what"><div class="gw-i" ${refMeta(dr.ref).img ? `style="background-image:url('${esc(refMeta(dr.ref).img)}')"` : ''}></div><div><b>${esc(dr.title)}</b><span>${esc(dr.sub || '')}</span>${dr.k === 'v' ? `<em>${dr.claude ? 'Claude 寫好的版本' : '範本（請 Claude 寫之前先用這個）'}</em>` : ''}</div>${ctx.k && !done ? `<button class="btn sm" data-act="opswap" data-k="${esc(ctx.k)}">換一篇</button>` : ''}</div>
    <div class="fan-detail"><div class="cardwrap"><canvas id="cardcv" width="1080" height="1350"></canvas><div class="cardbusy" id="cardbusy">噴漆中…</div></div>
      <div class="btnrow" style="justify-content:center">${wk ? [['cover', '封面'], ['tier', 'Tier 表'], ['next', '下週出擊']].map(([kk, l]) => `<button class="btn sm ${OPS.card.wk === kk ? 'y' : ''}" data-act="opwkk" data-v="${kk}">${l}</button>`).join('') : `<button class="btn sm ${OPS.card.layout === 'A' ? 'y' : ''}" data-act="opcl" data-v="A">黃牆</button><button class="btn sm ${OPS.card.layout === 'B' ? 'y' : ''}" data-act="opcl" data-v="B">黑牆</button>`}<button class="btn sm ${OPS.card.ratio === '45' ? 'y' : ''}" data-act="opcr" data-v="45">4:5</button><button class="btn sm ${OPS.card.ratio === '11' ? 'y' : ''}" data-act="opcr" data-v="11">1:1</button><button class="btn sm p" data-act="oprespray">${ICON.can}<span>重噴</span></button></div></div>
    ${pfTextHtml(pf, c, dr.ref)}
    ${stepsHtml(pf, c, { ref: dr.ref, d: ctx.d, at: ctx.at, k: dr.k })}
    <div class="endcta go-done"><button class="btn ${done ? '' : 'p'} big" data-act="opdone" data-ref="${esc(dr.ref)}" data-pf="${pf}" data-k="${esc(ctx.k || '')}">${done ? `✓ ${PFI[pf].s} 已發（點一下取消）` : `✓ ${PFI[pf].s} 發好了`}</button></div>
    ${done && lg ? opsStatRow(lg, true) : ''}
    ${sib.length ? `<div class="go-sib"><b>同一篇其他平台</b>${sib.map((p) => `<button class="sibb ${pub[p] ? 'ok' : ''}" data-act="opgoto" data-ref="${esc(dr.ref)}" data-pf="${p}">${pfBadge(p)}<span>${pub[p] ? '已發' : '去發'}</span></button>`).join('')}</div>` : `<p class="sub-note go-one">現在只顧 Threads。等 Threads 穩定了，到「教學」開第二階段，同一篇就能一鍵做成 IG 版。</p>`}</div>`;
}
/* 從出稿台或別的平台跳過來：找這一篇在今天的哪個時段，沒有就不掛時段 */
function opsGoto(ref, pf) {
  const s = opsDay(todayTW()).find((x) => x.pf === pf && x.ref === ref);
  if (s) { location.hash = 'fan/~go:' + s.k; return; }
  location.hash = 'fan/~do:' + encodeURIComponent(ref) + '|' + pf;
}
async function renderOpsDo(arg) {
  const [ref, pf] = decodeURIComponent(arg).split('|'); if (!OPS_PF.includes(pf)) throw new Error('不認得的平台');
  const dr = await opsDraft(ref); OPS.cur = { dr, s: null, pf };
  return goHtml(dr, pf, {});
}
async function opsCardRender() {
  const cv = $('#cardcv'); const cur = OPS.cur; if (!cv || !cur) return;
  const busy = $('#cardbusy'); if (busy) busy.style.display = 'grid';
  try {
    const dr = cur.dr;
    if (dr.k === 'f') { await liveLoad([dr.src.game.steam], 3000); await drawCard(cv, dr.src, liveOf(dr.src.game.steam), OPS.card); }
    else if (dr.k === 'w') { S.curWeek = dr.src; await drawWeekCard(cv, dr.src, { kind: OPS.card.wk, ratio: OPS.card.ratio, seed: OPS.card.seed }); }
    else if (dr.k === 'p') { await liveLoad([dr.src.game.steam], 3000); await drawCard(cv, pickCardF(dr.src), liveOf(dr.src.game.steam), OPS.card); }
    else if (dr.k === 'x') { await drawCard(cv, freeCardF(dr.src), dr.src.appid ? liveOf(dr.src.appid) : null, OPS.card); }
    else await drawCard(cv, vidCardF(dr), null, OPS.card);
  } catch (e) { console.warn(e); toast('圖卡畫不出來：' + e.message, 'warn'); }
  if (busy) busy.style.display = 'none';
}
async function opsSaveCards(names, kinds) {
  const files = [];
  for (let i = 0; i < kinds.length; i++) {
    let b;
    if (kinds[i] === null) b = await cardBlob();
    else { const C = OPS.cur.detail ? WEEK.card : OPS.card; const off = document.createElement('canvas'); await drawWeekCard(off, OPS.cur.dr.src, { kind: kinds[i], ratio: C.ratio, seed: C.seed }); b = await new Promise((res) => { try { off.toBlob(res, 'image/png'); } catch (e) { res(null); } }); }
    if (!b) { toast('這張圖卡含有外部圖片，裝置不讓存。按「重噴」再試，或直接截圖。', 'warn'); return false; }
    files.push(new File([b], names[i], { type: 'image/png' }));
  }
  if (navigator.canShare && navigator.canShare({ files }) && IOS) { try { await navigator.share({ files, title: '遊戲狂想曲' }); sfx.ding(); return true; } catch (e) { return false; } }
  for (const f of files) { const u = URL.createObjectURL(f); const l = document.createElement('a'); l.href = u; l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); await sleep(300); }
  sfx.stamp(); toast(files.length > 1 ? `${files.length} 張圖卡存好了` : '圖卡存好了'); return true;
}

/* ---- 排程週曆 ---- */
function renderOpsPlan() {
  const today = todayTW(); const mon = addD(monOf(today), OPS.wk * 7); const days = opsPlan(mon, addD(mon, 6));
  const PF = opsPfs(); const one = PF.length === 1;
  const cnt = { th: 0, ig: 0, fb: 0 }; let done = 0;
  days.forEach((x) => x.slots.forEach((s) => { if (s.st !== 'skip') cnt[s.pf]++; if (s.st === 'done') done++; }));
  const total = PF.reduce((a, p) => a + cnt[p], 0); const P = plat();
  const cell = (s) => {
    if (!s) return '<span class="pl-c none"></span>';
    const m = s.ref ? refMeta(s.ref) : null;
    const pk = s.wkWait ? 'w' : planKind(s.d);   // 還沒排內容的日子：預定排哪一類
    const t = m ? esc(m.title) : s.wkWait ? '週報' : s.st === 'wait' ? (one ? `預定排${KIND_L[pk]}` : '等解包') : s.st === 'skip' ? '跳過' : '—';
    const sub = m ? m.sub : s.st === 'wait' ? (s.wkWait ? '週報 19:43 出爐後自動排上' : pk === 'p' ? '當天自動排一款還沒發過的推坑' : '當天 05:23 解包後自動排上') : '';
    return `<button class="pl-c st-${s.st} ${m && m.img ? '' : 'noimg'}" data-act="opslot" data-k="${esc(s.k)}"><em>${esc(s.at)}${s.hot ? `<i class="hot">${one ? 'HOT・' + esc(s.hot) : 'HOT'}</i>` : ''}</em>${m && m.img ? `<span class="pc-i" style="background-image:url('${esc(m.img)}')"></span>` : ''}<b>${one ? kindChip(m ? m.k : s.st === 'wait' ? pk : '') : ''}${t}</b>${one && sub ? `<span class="pc-s">${esc(sub)}</span>` : ''}${one && s.st === 'wait' ? '' : `<small>${esc(s.st === 'wait' ? (s.wkWait ? '19:43 出爐' : '05:23 自動填') : ST_LAB[s.st] || '')}</small>`}</button>`;
  };
  const vids = (S.ops.vids || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  return `<div class="ops">${opsNav('plan')}${opsHead('排程', one ? 'Threads 一週發幾篇、幾點發。內容每天 05:23 解包、11:43 推坑後自動填上（週一三五排專題、二四六排推坑、週日放週報）；想指定哪一篇、改時間、跳過，點那一格。' : '每個平台一週發幾篇、幾點發。內容每天 05:23 解包後自動填上；想指定哪一篇、改時間、跳過，點那一格。')}
    <div class="pl-top"><button class="ib" data-act="opwk" data-d="-1" aria-label="上一週">‹</button><div><b>${esc(dotDay(mon))} – ${esc(dotDay(addD(mon, 6)))}</b><span>${OPS.wk === 0 ? '這週' : OPS.wk > 0 ? OPS.wk + ' 週後' : -OPS.wk + ' 週前'}</span></div><button class="ib" data-act="opwk" data-d="1" aria-label="下一週">›</button></div>
    <div class="pl-sum"><span>${total} 篇</span>${PF.map((p) => `<span>${pfBadge(p)} ${cnt[p]}</span>`).join('')}<span class="ok">已發 ${done}</span></div>
    <div class="btnrow"><button class="btn sm" data-act="opcad">${ICON.gear}<span>發文節奏</span></button><button class="btn sm y" data-act="opics">${ICON.cal}<span>時段加進手機行事曆</span></button><button class="btn sm p" data-act="opvidnew">${ICON.film}<span>＋上片三連發</span></button></div>
    <div class="pl-grid n${PF.length}"><div class="pl-h"><span></span>${PF.map((p) => `<span>${pfBadge(p)}${one ? ' <small>Threads（脆）</small>' : ''}</span>`).join('')}</div>
      ${days.map((x) => `<div class="pl-row ${x.d === today ? 'today' : ''} ${x.d < today ? 'past' : ''}"><div class="pl-d"><b>${WK[wdNum(x.d)]}</b><span>${esc(mdDay(x.d))}</span>${x.d === today ? '<i>今天</i>' : ''}</div>${PF.map((p) => cell(x.slots.find((s) => s.pf === p))).join('')}</div>`).join('')}</div>
    ${opsModeNote()}
    <details class="pl-why"><summary>這些時段怎麼來的？</summary><p>${esc((P.times.th && P.times.th.note) || '')}</p>${one ? '' : `<p>${esc(P.times.other || '')}</p>`}${((P.times.th && P.times.th.src) || []).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('')}</details>
    <h3 class="tape-h p">影片三連發 <small>${vids.length} 支</small></h3>
    <p class="sub-note">上新片時：前一天預告、當天上片文、隔天開討論，${one ? '自動排進 Threads' : '各平台自動排進週曆'}。</p>
    <div class="vids">${vids.map(vidRow).join('') || `<div class="empty">還沒有。下次上片前按「＋上片三連發」，填標題和上片時間就好。</div>`}</div></div>`;
}
function vidRow(v) {
  const yt = ytIdOf(v.url); const ok = vidClaudeReady(v);
  return `<div class="vrow" data-go="fan/~vid:${esc(v.id)}"><div class="vr-i" ${yt ? `style="background-image:url('${esc(ytThumb(yt, 'hqdefault'))}')"` : ''}>${yt ? '' : ICON.film}</div><div><b>${esc(v.t)}</b><span>上片 ${esc(dayLab(v.at.slice(0, 10)))} ${esc(v.at.slice(11, 16))}</span><em class="${ok ? 'ok' : ''}">${ok ? 'Claude 寫好了' : v.ev ? '已請 Claude 寫' : '範本'}</em></div></div>`;
}
function slotSheet(k) {
  const s = opsSlot(k); if (!s) return;
  const m = s.ref ? refMeta(s.ref) : null; const today = todayTW();
  openSheet(`<h3>${pfBadge(s.pf)} ${esc(dayLab(s.d))} ${esc(s.at)}</h3>
    <p class="sub-note">${m ? `排的是：<b>${esc(m.title)}</b>` : s.wkWait ? '週日晚上放週報（19:43 出爐）' : '還沒有內容（每天 05:23 解包後自動填上）'}${s.st === 'done' ? '・已經發了' : ''}</p>
    <div class="btnrow">${s.ref && s.d <= today ? `<button class="btn p" data-go="fan/~go:${esc(k)}">${ICON.mega}<span>${s.st === 'done' ? '看這篇' : '開始上架'}</span></button>` : ''}${s.st !== 'done' ? `<button class="btn y" data-act="opswap" data-k="${esc(k)}">${s.ref ? '換一篇' : '指定一篇'}</button>` : ''}</div>
    ${s.st !== 'done' ? `<label class="op-lab">改時間<input type="time" id="optime" value="${esc(s.at)}" min="06:00" max="23:59"></label>
    <div class="btnrow"><button class="btn sm y" data-act="optimeset" data-k="${esc(k)}">改成這個時間</button><button class="btn sm" data-act="opskip" data-k="${esc(k)}">${s.st === 'skip' ? '不跳過了' : '這次跳過'}</button>${(S.ops.pin[s.d] || {})[s.pf] ? `<button class="btn sm" data-act="opreset" data-k="${esc(k)}">恢復自動</button>` : ''}</div>` : ''}
    <p class="sub-note" style="margin-top:12px">只改這一次。每週固定的時段在「發文節奏」改。</p>`, 'hsheet');
}
/* 換一篇：最近的解包、週報、影片三連發 */
function swapSheet(k) {
  const s = opsSlot(k); if (!s) return;
  const used = new Set(S.ops.log.filter((l) => l.pf === s.pf).map((l) => l.ref));
  const feats = opsFeats().filter((x) => x.date <= s.d).slice(0, 14).map((x) => 'f:' + x.id);
  const picks = opsPicks().filter((x) => x.date <= s.d && x.stamp !== '特價入').slice(0, 12).map((x) => 'p:' + x.id);
  const weeks = ((S.weekly && S.weekly.items) || []).slice(0, 2).map((w) => 'w:' + w.id);
  const frees = s.d === todayTW() ? freeNow().map((x) => 'x:' + x.id) : [];
  const vids = [];
  for (const v of S.ops.vids || []) for (const kk of Object.keys(VK)) vids.push(`v:${v.id}:${kk}`);
  const grp = [['限時免費（今天就能發）', frees], ['影片三連發', vids.slice(0, 6)], ['每週懶人包', weeks], ['每日專題（新作、新聞）', feats], ['推坑（已上市的私房好遊戲）', picks]].filter(([, L]) => L.length);
  const row = (r) => { const m = refMeta(r); return `<button class="pkl ${used.has(r) ? 'used' : ''} ${s.ref === r ? 'on' : ''}" data-act="oppick" data-k="${esc(k)}" data-ref="${esc(r)}"><span class="pkl-i" ${m.img ? `style="background-image:url('${esc(m.img)}')"` : ''}></span><span class="pkl-t"><b>${esc(m.title)}</b><small>${esc(m.date && m.k !== 'x' ? mdDay(m.date) : '')} ${esc(m.sub || '')}</small></span>${used.has(r) ? '<em>發過</em>' : ''}</button>`; };
  openSheet(`<h3>${pfBadge(s.pf)} ${esc(dayLab(s.d))} ${esc(s.at)}・換一篇</h3><p class="sub-note">灰色的是這個平台已經發過的。</p>
    ${opsPfs().length > 1 ? '<label class="op-chk"><input type="checkbox" id="opswapall" checked> 同一天的其他平台也換成這篇</label>' : ''}
    ${grp.map(([t, L]) => `<h4 class="pkl-g">${esc(t)}</h4><div class="picks-l">${L.map(row).join('')}</div>`).join('')}`, 'hsheet');
}
function pinSet(d, pf, patch) {
  const P = S.ops.pin[d] = S.ops.pin[d] || {}; P[pf] = Object.assign({}, P[pf] || {}, patch);
  for (const k of Object.keys(P[pf])) if (P[pf][k] == null) delete P[pf][k];
  if (!Object.keys(P[pf]).length) delete P[pf];
  if (!Object.keys(P).length) delete S.ops.pin[d];
  // 只留最近的釘選（兩個月內）
  const lim = addD(todayTW(), -60); for (const k of Object.keys(S.ops.pin)) if (k < lim) delete S.ops.pin[k];
  opsSave();
}
/* 發文節奏 */
function cadSheet() {
  const C = cad(); const PF = opsPfs(); const same = (p) => PF.every((pf) => JSON.stringify(p[pf]) === JSON.stringify(C[pf]));
  const pre = cadPresets(); const cur = (pre.find(([, p]) => same(p)) || ['custom'])[0];
  openSheet(`<h3>${ICON.gear} 發文節奏</h3><p class="sub-note">${PF.length === 1 ? '先選一個起手式，之後星期幾、幾點都能改。累積兩三週成績後，「成效」的黃金時段會告訴你哪個時段最好。' : '先選一個起手式，之後每個平台的星期幾、幾點都能改。累積兩三週成績後，「成效」會告訴你哪個平台、哪個時段最划算。'}</p>
    <div class="cad-pre n${pre.length}">${pre.map(([k, p]) => `<button class="${cur === k ? 'on' : ''}" data-act="opcadp" data-v="${k}"><b>${p.name}${k === 'std' && PF.length === 1 ? '（建議）' : ''}</b><span>${esc(cadNote(p))}</span></button>`).join('')}</div>
    ${PF.map((pf) => `<div class="cad-row"><div class="cad-h">${pfBadge(pf)}<b>${PFI[pf].n}</b><span class="cn">一週 ${C[pf].filter(Boolean).length} 篇</span></div>
      <div class="cad-days">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<button class="${C[pf][wd] ? 'on' : ''}" data-act="opcadday" data-pf="${pf}" data-wd="${wd}"><b>${WK[wd]}</b><small>${C[pf][wd] || '—'}</small></button>`).join('')}</div>
      <label class="op-lab sm">${PFI[pf].s} 全部改成<input type="time" data-act="opcadtm" data-pf="${pf}" value="${esc(C[pf].find(Boolean) || '20:00')}"></label></div>`).join('')}
    <p class="sub-note">改完記得到排程頁重新「加進手機行事曆」（舊的提醒要自己刪）。</p>`, 'hsheet');
}

/* ---- 手機行事曆：每個平台的固定時段做成每週重複的提醒 ---- */
function opsIcs() {
  const C = cad(); const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PZ//unpacked-ops//ZH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Taipei', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800', 'TZNAME:CST', 'END:STANDARD', 'END:VTIMEZONE'];
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']; const today = todayTW(); let n = 0;
  const url = 'https://pzwei0105.github.io/PZ-Games/apps/unpacked/#fan';
  for (const pf of opsPfs()) {
    const byTime = {};
    C[pf].forEach((t, wd) => { if (t) (byTime[t] = byTime[t] || []).push(wd); });
    for (const [t, wds] of Object.entries(byTime)) {
      let d = today; while (!wds.includes(wdNum(d))) d = addD(d, 1);
      const st = d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
      const end = new Date(slotTs(d, t) + 15 * 6e4 + 8 * 3600e3).toISOString().slice(0, 16).replace(/[-:]/g, '') + '00';
      L.push('BEGIN:VEVENT', `UID:gr-ops-${pf}-${t.replace(':', '')}-${wds.join('')}@pzwei0105.github.io`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;TZID=Asia/Taipei:${st}`, `DTEND;TZID=Asia/Taipei:${end}`, `RRULE:FREQ=WEEKLY;BYDAY=${wds.map((w) => BY[w]).join(',')}`,
        icsFold(`SUMMARY:${icsEsc(`遊戲狂想曲｜${PFI[pf].full} 發文時間`)}`), icsFold(`DESCRIPTION:${icsEsc(`打開《解包》→ 粉專 → 今日任務，照上架教學發這一篇：${url}`)}`), `URL:${url}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT5M', icsFold(`DESCRIPTION:${icsEsc(PFI[pf].full + ' 發文時間到了')}`), 'END:VALARM', 'END:VEVENT');
      n++;
    }
  }
  L.push('END:VCALENDAR');
  return { text: L.join('\r\n') + '\r\n', n };
}
function opsIcsSave() {
  const { text, n } = opsIcs(); const blob = new Blob([text], { type: 'text/calendar' }); const u = URL.createObjectURL(blob);
  if (IOS) { location.href = u; setTimeout(() => URL.revokeObjectURL(u), 60e3); } else { const a = document.createElement('a'); a.href = u; a.download = 'gamerhapsody-posting.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  S.ops.setup.cal = todayTW(); opsSave(); sfx.stamp(); toast(`${n} 組每週提醒：iPhone 會直接打開「加入行事曆」`);
}

/* ---- 出稿台：每篇的三平台狀態，和詳細頁的「三平台版本」 ---- */
function pfChips(ref, legacy) {
  const pub = pubOf(ref); const any = Object.keys(pub).length;
  if (!any && legacy) return `<span class="pfchips"><span class="old">已發（舊紀錄）</span></span>`;
  const PF = [...new Set([...opsPfs(), ...Object.keys(pub)])];   // 之前在別的平台發過的也照樣標出來
  return `<span class="pfchips">${PF.map((p) => `<span class="pfc ${p} ${pub[p] ? 'ok' : ''}">${PFI[p].s}${pub[p] ? '✓' : ''}</span>`).join('')}</span>`;
}
async function opsPfSection(ref) {
  const dr = await opsDraft(ref); OPS.cur = { dr, s: null, detail: true };
  const PF = opsPfs(); const tab = PF.includes(OPS.tab[ref]) ? OPS.tab[ref] : 'th'; const pub = pubOf(ref);
  const c = pfCompose(dr, tab);
  const todays = opsDay(todayTW()).filter((s) => s.ref === ref);
  return `<section class="pfsec" id="pfsec"><h3 class="tape-h p">${PF.length === 1 ? 'Threads 版本 <small>照 Threads 的規則整理好了</small>' : `${PF.length === 2 ? '兩個平台' : '三平台'}版本 <small>每個平台照它的規則改好了</small>`}</h3>
    ${PF.length > 1 ? `<div class="pftabs n${PF.length}">${PF.map((p) => `<button class="${tab === p ? 'on' : ''} ${p}" data-act="optab" data-ref="${esc(ref)}" data-pf="${p}">${pfBadge(p)}<span>${PFI[p].n}</span>${pub[p] ? '<i>✓</i>' : ''}</button>`).join('')}</div>` : ''}
    ${pfTextHtml(tab, c, ref)}
    ${stepsHtml(tab, c, { ref, d: '', at: '', k: dr.k })}
    <div class="endcta"><button class="btn ${pub[tab] ? '' : 'p'}" data-act="opdone" data-ref="${esc(ref)}" data-pf="${tab}" data-k="${esc((todays.find((s) => s.pf === tab) || {}).k || '')}">${pub[tab] ? `✓ ${PFI[tab].s} 已發（點一下取消）` : `✓ ${PFI[tab].s} 發好了`}</button></div></section>`;
}
async function opsPfRefresh(ref) {
  const box = $('#pfsec'); if (!box) return;
  box.outerHTML = await opsPfSection(ref);
}

/* ---- 點擊 ---- */
async function opsAct(a, act) {
  if (!a.startsWith('op')) return false;
  const k = act.dataset.k; const ref = act.dataset.ref; const pf = act.dataset.pf;
  const rerender = () => { const y = scrollY; route().then(() => scrollTo(0, y)); };
  if (a === 'opcopy') {
    const dr = await opsDraft(ref); const c = pfCompose(dr, pf);   // 每次重算：原稿剛改過也拿得到最新的
    const text = pf === 'th' ? c.parts[Math.min(c.parts.length - 1, +(act.dataset.part || 0))] : c.text;   // Threads 一次複製一則串文
    if (/＿{2,}/.test(text)) toast('提醒：裡面還有「＿＿＿」要填', 'warn');
    if (await copyText(text)) { sfx.stamp(); haptic(); burstAt(act, [YEL, PINK, BLK], 14, 8); if (!/＿{2,}/.test(text)) toast(pf === 'th' && c.parts.length > 1 ? `第 ${+(act.dataset.part || 0) + 1} 則已複製：到 Threads 長按貼上` : `${PFI[pf].s} 版已複製：到 ${PFI[pf].n} 長按貼上`); } else toast('複製失敗，請長按文字自己複製', 'warn');
    return true;
  }
  if (a === 'opstep') { const key = act.dataset.key; if (OPS.steps.has(key)) OPS.steps.delete(key); else { OPS.steps.add(key); sfx.pop(); haptic(8); } act.closest('.step').classList.toggle('ok', OPS.steps.has(key)); return true; }
  if (a === 'opguide') { S.ops.guide = S.ops.guide === 'lite' ? 'full' : 'lite'; opsSave(); sfx.click(); $$('.stepwrap').forEach((w) => w.classList.toggle('lite', S.ops.guide === 'lite')); $$('.sw-mode').forEach((b) => { b.textContent = S.ops.guide === 'lite' ? '完整說明' : '精簡'; }); return true; }
  if (a === 'opdone') {
    const on = !pubOf(ref)[pf];
    if (on) {
      const c = pfCompose(await opsDraft(ref), pf);
      opsLog(ref, pf, k || (opsDay(todayTW()).find((s) => s.pf === pf && s.ref === ref) || {}).k, pf === 'fb' && c.link === 'budget');
      opsCombo(comboN(ref), act); toast(`蓋章！${PFI[pf].full} 已發，明天記得回填成績`);
    } else { opsUnlog(ref, pf); sfx.scratch(); }
    setTabs('fan');
    if (ROUTE.startsWith('fan/~')) rerender(); else await opsPfRefresh(ref);
    return true;
  }
  if (a === 'opgoto') { opsGoto(ref, pf); return true; }
  if (a === 'optab') { OPS.tab[ref] = pf; sfx.click(); await opsPfRefresh(ref); return true; }
  if (a === 'opedit') {
    if (OPS.edit === ref + '|' + pf) OPS.edit = false; else OPS.edit = ref + '|' + pf;
    sfx.click(); if (ROUTE.startsWith('fan/~')) rerender(); else await opsPfRefresh(ref); return true;
  }
  if (a === 'opedreset') { delete S.ops.ed[ref + '|' + pf]; opsSave(); OPS.edit = false; sfx.scratch(); if (ROUTE.startsWith('fan/~')) rerender(); else await opsPfRefresh(ref); return true; }
  if (a === 'opcl' || a === 'opcr' || a === 'oprespray' || a === 'opwkk') {
    if (a === 'opcl') OPS.card.layout = act.dataset.v; if (a === 'opcr') OPS.card.ratio = act.dataset.v; if (a === 'opwkk') OPS.card.wk = act.dataset.v;
    if (a === 'oprespray') { OPS.card.seed++; sfx.rattle(); setTimeout(() => sfx.hiss(0.6), 200); } else sfx.click();
    $$('[data-act="opcl"]').forEach((b) => b.classList.toggle('y', b.dataset.v === OPS.card.layout)); $$('[data-act="opcr"]').forEach((b) => b.classList.toggle('y', b.dataset.v === OPS.card.ratio)); $$('[data-act="opwkk"]').forEach((b) => b.classList.toggle('y', b.dataset.v === OPS.card.wk));
    await opsCardRender(); if (a === 'oprespray') burstAt($('#cardcv'), [PINK, YEL, BLK], 26, 12); return true;
  }
  if (a === 'opcdl' || a === 'opcdl3') {
    const dr = OPS.cur && OPS.cur.dr; if (!dr) return true;
    const slug = dr.k === 'v' ? 'video-' + dr.vk : dr.k === 'x' ? 'free-' + (dr.src.appid || hashStr(dr.id)) : dr.k === 'p' ? 'pick-' + dr.id : dr.id;
    if (a === 'opcdl3' && dr.k === 'w') await opsSaveCards(['cover', 'tier', 'next'].map((x, i) => `gamerhapsody-${slug}-${i + 1}-${x}.png`), ['cover', 'tier', 'next']);
    else if (await opsSaveCards([`gamerhapsody-${slug}-${pf || 'card'}.png`], [null])) impact($('#cardcv'), [PINK, YEL], false);
    return true;
  }
  if (a === 'opswap') { closeSheet(); swapSheet(k); return true; }
  if (a === 'oppick') {
    const s = opsSlot(k); if (!s) return true;
    pinSet(s.d, s.pf, { r: ref });
    if ($('#opswapall') && $('#opswapall').checked) for (const o of opsDay(s.d)) if (o.pf !== s.pf && o.st !== 'done') pinSet(s.d, o.pf, { r: ref });
    closeSheet(); sfx.slap(); toast('換好了'); if (ROUTE.startsWith('fan/~go:')) location.hash = 'fan/~go:' + k; else rerender(); return true;
  }
  if (a === 'opskip') { const s = opsSlot(k); if (!s) return true; pinSet(s.d, s.pf, { r: s.st === 'skip' ? null : '-' }); closeSheet(); sfx.scratch(); rerender(); setTabs('fan'); return true; }
  if (a === 'opslot') { slotSheet(k); return true; }
  if (a === 'optimeset') { const s = opsSlot(k); const t = ($('#optime') || {}).value; if (s && /^\d\d:\d\d$/.test(t || '')) { pinSet(s.d, s.pf, { at: t }); closeSheet(); sfx.stamp(); toast(`改成 ${t}`); rerender(); } return true; }
  if (a === 'opreset') { const s = opsSlot(k); if (s) { delete (S.ops.pin[s.d] || {})[s.pf]; if (S.ops.pin[s.d] && !Object.keys(S.ops.pin[s.d]).length) delete S.ops.pin[s.d]; opsSave(); } closeSheet(); sfx.scratch(); rerender(); return true; }
  if (a === 'opwk') { OPS.wk = Math.max(-8, Math.min(4, OPS.wk + (+act.dataset.d))); sfx.click(); rerender(); return true; }
  if (a === 'opcad') { cadSheet(); return true; }
  if (a === 'opcadp') { const p = CAD_PRESET[act.dataset.v]; S.ops.cad = act.dataset.v === 'std' ? null : { th: p.th.slice(), ig: p.ig.slice(), fb: p.fb.slice() }; opsSave(); sfx.stamp(); cadSheet(); if (ROUTE.startsWith('fan')) rerender(); return true; }
  if (a === 'opcadday') {
    const C = S.ops.cad || JSON.parse(JSON.stringify({ th: CAD_PRESET.std.th, ig: CAD_PRESET.std.ig, fb: CAD_PRESET.std.fb }));
    const wd = +act.dataset.wd; C[pf][wd] = C[pf][wd] ? null : (C[pf].find(Boolean) || '20:00'); S.ops.cad = C; opsSave(); sfx.click(); cadSheet(); if (ROUTE.startsWith('fan')) rerender(); return true;
  }
  if (a === 'opics') { opsIcsSave(); return true; }
  if (opsStatAct && await opsStatAct(a, act)) return true;
  if (opsLearnAct && await opsLearnAct(a, act)) return true;
  if (opsThAct && await opsThAct(a, act)) return true;
  return false;
}
function opsInput(t) {
  const a = t.dataset && t.dataset.act; if (!a || !a.startsWith('op')) return false;
  if (a === 'opedtxt') { S.ops.ed[t.dataset.ref + '|' + t.dataset.pf] = t.value; opsSave(); return true; }
  if (a === 'opcadtm') {
    if (!/^\d\d:\d\d$/.test(t.value)) return true;
    const C = S.ops.cad || JSON.parse(JSON.stringify({ th: CAD_PRESET.std.th, ig: CAD_PRESET.std.ig, fb: CAD_PRESET.std.fb }));
    C[t.dataset.pf] = C[t.dataset.pf].map((x) => (x ? t.value : x)); S.ops.cad = C; opsSave(); return true;
  }
  return opsInput2 ? opsInput2(t) : false;
}

/* ---- 換頁時 ---- */
function opsStop() { clearInterval(OPS.cdT); OPS.cdT = 0; }
function opsFx(sub) {
  opsStop();
  if (sub === 'today') {
    const el = $('#opcd'); if (el && el.dataset.t) {
      const t = +el.dataset.t;
      OPS.cdT = setInterval(() => { if (!el.isConnected) { opsStop(); return; } const ms = t - Date.now(); el.textContent = ms > 0 ? '還有 ' + hms(ms) : '就是現在！'; if (ms <= 0) { opsStop(); sfx.bell(); } }, 1000);
    }
    if (fxOn()) dropIn($$('.msn'), 'ops-' + todayTW());
  }
  if (sub === 'go' || sub === 'do') { opsCardRender(); if (fxOn()) $$('.step').forEach((s, i) => s.style.setProperty('--i', i)); }
  if (sub === 'stats' && typeof opsStatsFx === 'function') opsStatsFx();
  if (sub === 'vid' && typeof opsVidFx === 'function') opsVidFx();
}
async function renderOps(sub) {
  const [name, ...rest] = (sub || 'today').split(':'); const arg = rest.join(':');
  OPS.steps = OPS.steps.size > 200 ? new Set() : OPS.steps;
  if (name === 'today' || !name) return renderOpsToday();
  if (name === 'plan') return renderOpsPlan();
  if (name === 'drafts') return renderOpsDrafts();
  if (name === 'go') return renderOpsGo(arg);
  if (name === 'do') return renderOpsDo(arg);
  if (name === 'stats') return renderOpsStats();
  if (name === 'learn') return renderOpsLearn();
  if (name === 'vid') return renderOpsVid(arg);
  return renderOpsToday();
}
function renderOpsDrafts() {
  return `<div class="ops">${opsNav('drafts')}${renderFanList()}</div>`;
}
