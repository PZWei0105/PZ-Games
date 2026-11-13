/* 全知 OMNISCIENT — 資料：只讀冷眼公開的資料檔，不自己另外抓、不補、不猜 */

// 冷眼的資料都在同一個網域（pzwei0105.github.io/coldeye-etf/data/）；本機測試可用 ?data= 指到別的地方
const DATA_BASE = (() => {
  const q = QS.get('data');
  if (q && !IS_PROD) return q.endsWith('/') ? q : q + '/';
  if (IS_PROD) return '/coldeye-etf/data/';
  return 'https://' + PROD_HOST + '/coldeye-etf/data/';
})();
const COLDEYE_URL = 'https://' + PROD_HOST + '/coldeye-etf/';

/** 每一份資料自己帶的時間戳（和冷眼的 version.json 用同一個欄位） */
const STAMP = { summary: 'generated', live: 'at', news: 'generated', global: 'at', spark: 'at' };
const FILE_NAMES = {
  summary: '收盤計算批次', live: '盤中行情', news: '官方公告與新聞', global: '全球市場與溫度', spark: '今日走勢', cal: '開休市日曆', track: '規則戰績', version: '版本檔',
};

const D = {
  version: null, summary: null, live: null, news: null, global: null, spark: null, cal: null, track: null,
  etf: {},          // 單檔分析（跟著收盤批次）
  got: {},          // 這一份最後一次「從網路」拿到的時間
  saved: {},        // 離線時用的那一份，是什麼時候存的
  offline: {},      // 這一份現在是不是離線備份
  fail: {},         // 最後一次失敗的時間
  link: 'init',     // init / ok / slow / down
  failStreak: 0,
  lastPoll: 0,
  polls: 0,
  map: {},          // 代號 → summary 那一列
};
const CACHE_NAME = 'omni-data-v1';

async function cachePut(path, txt) {
  try {
    if (!('caches' in window)) return;
    const c = await caches.open(CACHE_NAME);
    await c.put(new Request(DATA_BASE + path), new Response(txt, { headers: { 'content-type': 'application/json', 'x-omni-saved': String(Date.now()) } }));
  } catch { /* 存不了不影響顯示 */ }
}
async function cacheGet(path) {
  try {
    if (!('caches' in window)) return null;
    const c = await caches.open(CACHE_NAME);
    const r = await c.match(new Request(DATA_BASE + path));
    if (!r) return null;
    return { txt: await r.text(), saved: Number(r.headers.get('x-omni-saved')) || null };
  } catch { return null; }
}

const minuteKey = () => 't=' + Math.floor(Date.now() / 60000);

/** 抓一份資料；網路失敗就用上次存下的那一份，並且照實標「離線」 */
async function fetchJSON(path, key, { allowCache = true } = {}) {
  const url = DATA_BASE + path + '?' + (key || minuteKey());
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 30000) : null;
  try {
    const r = await fetch(url, { cache: 'no-store', ...(ctl ? { signal: ctl.signal } : {}) });
    if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
    const txt = await r.text();
    const js = JSON.parse(txt);
    cachePut(path, txt);
    return { js, offline: false };
  } catch (err) {
    if (allowCache) {
      const c = await cacheGet(path);
      if (c) { try { return { js: JSON.parse(c.txt), offline: true, saved: c.saved, err }; } catch { /* 壞掉的備份 */ } }
    }
    throw err;
  } finally { if (timer) clearTimeout(timer); }
}

function stampOf(name) { const o = D[name]; const k = STAMP[name]; return o && k ? o[k] || null : null; }

async function loadFile(name, key) {
  try {
    const r = await fetchJSON(name + '.json', key);
    const prev = D[name];
    D[name] = r.js;
    D.offline[name] = r.offline;
    if (r.offline) { D.saved[name] = r.saved; D.fail[name] = Date.now(); } else { D.got[name] = Date.now(); delete D.saved[name]; }
    if (name === 'summary') indexSummary();
    return { ok: true, offline: r.offline, prev };
  } catch (err) {
    D.fail[name] = Date.now();
    return { ok: false, err };
  }
}

function indexSummary() {
  D.map = {};
  for (const e of (D.summary && D.summary.etfs) || []) D.map[e.c] = e;
}

async function loadEtf(code) {
  if (!D.summary || !D.map[code]) return null;
  const batch = D.summary.generated;
  const have = D.etf[code];
  if (have && have._batch === batch) return have;
  try {
    const r = await fetchJSON('etf/' + code + '.json', 'b=' + encodeURIComponent(batch || ''));
    r.js._batch = r.offline ? (r.js._batch || null) : batch;
    r.js._offline = r.offline;
    D.etf[code] = r.js;
    return r.js;
  } catch { return have || null; }
}

/** 開機：先版本檔，再其他（任何一份失敗都照實回報，不擋住其他份） */
async function initialLoad(report) {
  const v = await loadFile('version');
  report('version', v);
  D.link = v.ok && !v.offline ? 'ok' : 'down';
  const key = (n) => (D.version && D.version.files && D.version.files[n] ? 'v=' + encodeURIComponent(D.version.files[n]) : undefined);
  const names = ['summary', 'live', 'news', 'global', 'spark', 'cal', 'track'];
  const res = await Promise.all(names.map((n) => loadFile(n, key(n)).then((r) => { report(n, r); return r; })));
  D.lastPoll = Date.now();
  return res;
}

/** 每分鐘看一次版本檔：哪一份的時間戳變了，就只重抓那一份（和冷眼同一套做法） */
async function poll() {
  D.lastPoll = Date.now();
  D.polls++;
  const changed = [];
  let v;
  try {
    v = await fetchJSON('version.json', minuteKey(), { allowCache: false });
    D.version = v.js; D.got.version = Date.now(); D.offline.version = false;
    D.failStreak = 0; D.link = 'ok';
  } catch {
    D.failStreak++;
    D.link = D.failStreak >= 2 ? 'down' : 'slow';
    bus.emit('poll', { ok: false, changed });
    return changed;
  }
  const files = (D.version && D.version.files) || {};
  for (const name of Object.keys(STAMP)) {
    const want = files[name];
    if (!want || (want === stampOf(name) && !D.offline[name])) continue;
    const prevStamp = stampOf(name);
    const r = await loadFile(name, 'v=' + encodeURIComponent(want));
    if (r.ok) changed.push({ name, prevStamp, stamp: stampOf(name), prev: r.prev });
  }
  // 日曆與戰績跟著收盤批次走
  if (changed.some((c) => c.name === 'summary')) { await loadFile('cal'); await loadFile('track'); }
  bus.emit('poll', { ok: true, changed });
  return changed;
}

// ================================================================ 日曆與時段
function isTradingDay(ymd) {
  const wd = weekday(ymd);
  if (wd === 0 || wd === 6) return false;
  const c = D.cal || {};
  if (Array.isArray(c.holidays) && c.holidays.includes(ymd)) return false;
  if (Array.isArray(c.closed) && c.closed.includes(ymd)) return false;
  return true;
}
function prevTradingDay(ymd, inclusive = false) { let d = inclusive ? ymd : addDays(ymd, -1); for (let i = 0; i < 30 && !isTradingDay(d); i++) d = addDays(d, -1); return d; }
function nextTradingDay(ymd, inclusive = false) { let d = inclusive ? ymd : addDays(ymd, 1); for (let i = 0; i < 30 && !isTradingDay(d); i++) d = addDays(d, 1); return d; }

/** 現在的市場時段：pre 開盤前／open 盤中／post 收盤後／closed 休市日 */
function marketPhase() {
  const t = tw();
  const trading = isTradingDay(t.ymd);
  let phase = 'closed';
  if (trading) phase = t.hm < 900 ? 'pre' : t.hm < 1335 ? 'open' : 'post';
  const nextDay = trading && t.hm < 900 ? t.ymd : nextTradingDay(t.ymd);
  return { trading, phase, today: t.ymd, next: nextDay, nextMs: ymdToMs(nextDay, 9, 0), lastDay: trading && t.hm >= 900 ? t.ymd : prevTradingDay(t.ymd) };
}

// ================================================================ 報價
function watchCodes() {
  let list = settings.watchMode === 'coldeye' ? (coldeyeWatch() || settings.watch) : settings.watch;
  list = (list || []).filter((c) => D.map[c]);
  if (list.length < 1) list = DEFAULTS.watch.filter((c) => D.map[c]);
  return Array.from(new Set(list)).slice(0, 6);
}
function etfName(c) { const e = D.map[c]; return e ? e.n : c; }

/** 一檔的報價：盤中用冷眼的盤中行情，否則用官方收盤；漲跌一律對「前一個交易日的官方收盤」 */
function quote(code) {
  const e = D.map[code];
  const L = D.live && D.live.etfs && D.live.etfs[code];
  if (!e && !L) return null;
  let px = null, date = null, time = null, src = 'close', nav = null, prem = null;
  if (L && isNum(L[0]) && L[5] && (!e || L[5] >= e.d)) { px = L[0]; date = L[5]; time = L[3]; src = 'live'; nav = L[1]; prem = L[2]; }
  else if (e) { px = e.p; date = e.d; }
  const ref = refClose(code, date);
  const chg = isNum(px) && isNum(ref) ? px - ref : null;
  return { code, px, date, time, src, ref, chg, pct: isNum(chg) && ref ? chg / ref * 100 : null, nav, prem };
}
/** 只看官方收盤（收盤批次那一天） */
function quoteClose(code) {
  const e = D.map[code];
  if (!e) return null;
  const ref = isNum(e.ch) ? e.p - e.ch : null;
  return { code, px: e.p, date: e.d, src: 'close', ref, chg: e.ch, pct: e.pc };
}
/** 某一天的「前一個交易日收盤」：那一天比收盤批次新→批次的收盤就是昨收；同一天→收盤減漲跌 */
function refClose(code, day) {
  const e = D.map[code];
  if (!e || !isNum(e.p)) return null;
  if (!day || day > e.d) return e.p;
  if (day === e.d && isNum(e.ch)) return +(e.p - e.ch).toFixed(4);
  return null;
}
/** 今天（spark.d 那天）的走勢點：[[分鐘, 價], …] */
function sparkOf(code) {
  const s = D.spark && D.spark.s && D.spark.s[code];
  if (!s) return [];
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push([s[i], s[i + 1]]);
  return out;
}
/** 回放用：某一分鐘那時候的價格（只用那一分鐘以前已經發生的成交） */
function quoteAt(code, minute) {
  const pts = sparkOf(code);
  let px = null, m = null;
  for (const [mm, p] of pts) { if (mm <= minute) { px = p; m = mm; } else break; }
  const ref = refClose(code, D.spark && D.spark.d);
  const chg = isNum(px) && isNum(ref) ? px - ref : null;
  return { code, px, m, ref, chg, pct: isNum(chg) && ref ? chg / ref * 100 : null, src: 'replay' };
}

/** 加權指數：盤中用冷眼盤中行情裡的指數，否則官方收盤 */
function taiex() {
  const M = D.summary && D.summary.market;
  const L = D.live;
  if (L && L.taiex && isNum(L.taiex.z) && isNum(L.taiex.y) && L.date && (!M || L.date > M.d)) {
    const chg = L.taiex.z - L.taiex.y;
    return { v: L.taiex.z, chg, pct: chg / L.taiex.y * 100, date: L.date, time: L.taiex.t, src: 'live' };
  }
  if (M) return { v: M.close, chg: M.chg, pct: M.pct, date: M.d, src: 'close', val: M.val };
  return null;
}

// ================================================================ 新聞（冷眼後台已經分好類；這裡只照它的分類顯示，並標出是哪個字讓它被當成「觀點」）
const OPINION_WORDS = ['預估', '預期', '看好', '看旺', '樂觀', '悲觀', '有望', '可望', '恐將', '恐怕', '專家', '分析師',
  '法人看', '建議', '布局', '存股', '怎麼', '如何', '必買', '推薦', '目標價', '喊', '飆', '暴漲',
  '暴跌', '狂', '懶人包', '一次看', '攻略', '？', '?', '揭密', '秘訣', '首選', '抱緊', '押寶', '搶進',
  '機會來', '別錯過', '大師', '老師'];
const NEWS_SRC = { cna: '中央社', twse_news: '證交所', fsc: '金管會', cbc: '中央銀行', tpex_news: '櫃買中心' };
const KIND_INFO = {
  official: { tag: '官方公告', short: '官方', cls: 'k-off' },
  fact: { tag: '事實報導', short: '事實', cls: 'k-fact' },
  opinion: { tag: '含預測／看法', short: '觀點', cls: 'k-op' },
};
function newsAll() {
  const items = (D.news && D.news.items) || [];
  return items.map((x, i) => {
    let ms = parseTs(x.ts);
    const timed = isFinite(ms);
    if (!timed) ms = x.d ? ymdToMs(x.d, 8, 0) : NaN;
    const trig = x.kind === 'opinion' ? OPINION_WORDS.find((w) => x.t.includes(w)) || null : null;
    return { ...x, i, ms, timed, trig, srcName: NEWS_SRC[x.src] || x.src, day: x.d || (isFinite(ms) ? ymdOf(ms) : null) };
  }).filter((x) => isFinite(x.ms)).sort((a, b) => b.ms - a.ms);
}
function newsOn(ymd) { return newsAll().filter((x) => x.day === ymd); }
function kindCounts(list) { const c = { official: 0, fact: 0, opinion: 0 }; for (const x of list) if (c[x.kind] != null) c[x.kind]++; return c; }

// ================================================================ 官方來源
const SOURCE_SHORT = {
  twse_daily: ['證交所', '每日收盤行情'], tpex_daily: ['櫃買中心', '上櫃收盤行情'], twse_flows: ['證交所', '三大法人買賣超'],
  tpex_flows: ['櫃買中心', '三大法人明細'], twse_margin: ['證交所', '融資融券'], tpex_margin: ['櫃買中心', '融資融券'],
  mis_etf: ['證交所', 'ETF 盤中預估淨值'], twse_div: ['證交所', '除權除息結果'], twse_div_pre: ['證交所', '除權除息預告'],
  tpex_div: ['櫃買中心', '除權除息結果'], twse_market: ['證交所', '市場成交資訊'], twse_mflows: ['證交所', '三大法人金額'],
  twse_risk: ['證交所', '注意／處置股'], tpex_risk: ['櫃買中心', '注意／處置股'], tdcc: ['集保結算所', '受益人數'],
  sitca: ['投信投顧公會', '投信公告淨值'], stocks: ['證交所', '成分股資料'], ust: ['美國財政部', '美債殖利率'],
  twse_news: ['證交所', '最新消息'], cna: ['中央社', '財經新聞'], fsc: ['金管會', '新聞稿'], cbc: ['中央銀行', '新聞稿'],
};
// 看板上排出來的順序：盤中最常動的放上面
const SOURCE_ORDER = ['mis_etf', 'twse_daily', 'tpex_daily', 'twse_flows', 'twse_mflows', 'sitca', 'twse_margin', 'tdcc', 'twse_news', 'cna', 'fsc', 'cbc', 'ust',
  'tpex_flows', 'tpex_margin', 'twse_div', 'tpex_div', 'twse_risk', 'tpex_risk', 'stocks', 'twse_market', 'twse_div_pre'];
function sourcesList() {
  const S = (D.summary && D.summary.sources) || {};
  const out = [];
  for (const key of SOURCE_ORDER.concat(Object.keys(S).filter((k) => !SOURCE_ORDER.includes(k)))) {
    const s = S[key];
    if (!s) continue;
    const ok = parseTs(s.ok_at), er = parseTs(s.err_at);
    let st = 'idle';
    if (isFinite(ok)) st = (now() - ok) < 4 * 86400e3 ? 'ok' : 'old';
    if (isFinite(er) && (!isFinite(ok) || er > ok)) st = 'err';
    const sh = SOURCE_SHORT[key] || [s.name, ''];
    out.push({ key, org: sh[0], what: sh[1], name: s.name, url: s.url, ok, er, st });
  }
  return out;
}
function sourceHealth() {
  const L = sourcesList();
  const active = L.filter((s) => s.st !== 'idle');
  return { ok: active.filter((s) => s.st === 'ok').length, total: active.length, err: active.filter((s) => s.st === 'err').length, list: L };
}

// ================================================================ 新鮮度（每一份資料一個燈號）
function freshness(name) {
  const o = D[name];
  if (!o) return { level: 'bad', label: D.fail[name] ? '斷線' : '尚未取得', ms: NaN };
  const ph = marketPhase();
  let ms = parseTs(stampOf(name) || (name === 'cal' ? o.generated : null));
  let level = 'ok', label = '';
  const age = now() - ms;
  if (name === 'live') {
    if (ph.phase === 'open') level = age <= 12 * 60e3 ? 'ok' : age <= 30 * 60e3 ? 'warn' : 'bad';
    else level = (o.date || 0) >= ph.lastDay || age < 18 * 3600e3 ? 'ok' : 'warn';
  } else if (name === 'spark') {
    level = (o.d || 0) >= ph.lastDay ? 'ok' : ph.phase === 'pre' || ph.phase === 'closed' ? 'ok' : 'warn';
    if (ph.phase === 'open' && age > 30 * 60e3) level = 'warn';
  } else if (name === 'summary') {
    const t = tw();
    const expect = ph.trading && t.hm >= 1600 ? ph.today : prevTradingDay(ph.today);
    const asof = o.asof || 0;
    level = asof >= expect ? 'ok' : asof >= prevTradingDay(expect) ? 'warn' : 'bad';
    if (level !== 'ok') label = '收盤批次還沒更新';
  } else if (name === 'news') {
    level = age <= 6 * 3600e3 ? 'ok' : age <= 36 * 3600e3 ? 'warn' : 'bad';
  } else if (name === 'global') {
    level = age <= 30 * 3600e3 ? 'ok' : age <= 80 * 3600e3 ? 'warn' : 'bad';
  }
  if (!isFinite(age) || age > 2 * 86400e3 && name !== 'summary' && name !== 'spark' && !(ph.phase === 'closed' && age < 4 * 86400e3)) level = level === 'ok' ? 'warn' : level;
  if (D.offline[name]) { level = 'warn'; label = '離線：上次的資料'; }
  return { level, label, ms };
}

// ================================================================ 交叉核對（全部用看板手上的真資料當場算）
function verifyChecks() {
  const out = [];
  const codes = watchCodes();
  const sp = D.spark, L = D.live, S = D.summary;
  // 1. 盤中價：冷眼的兩條行情線（證交所 ETF 即時淨值檔、證交所整股行情）各自的最新價互相比對
  {
    let n = 0, okN = 0, worst = 0, worstC = null;
    if (L && L.etfs && sp && sp.s) {
      for (const c of codes) {
        const a = L.etfs[c], pts = sparkOf(c);
        if (!a || !isNum(a[0]) || !pts.length || a[5] !== sp.d) continue;
        const b = pts[pts.length - 1][1];
        const diff = Math.abs(a[0] - b) / b * 100;
        n++; if (diff <= 0.5) okN++;
        if (diff > worst) { worst = diff; worstC = c; }
      }
    }
    out.push({ id: 'dual', title: '盤中價雙來源', org: '證交所 ETF 淨值檔 × 整股行情',
      st: n === 0 ? 'wait' : okN === n ? 'pass' : 'warn',
      big: n ? `${okN}/${n}` : '—',
      detail: n === 0 ? '今天還沒有兩邊都有的盤中價' : okN === n ? `自選 ${n} 檔兩邊價格一致（差距 ≤ 0.5%）` : `${worstC} 兩邊差 ${worst.toFixed(2)}%（兩邊抓取時間不同），以官方收盤為準`,
    });
  }
  // 2. 收盤價對帳：證交所官方收盤 vs 當天整股行情最後一筆
  {
    let n = 0, okN = 0, bad = null;
    const same = S && sp && sp.d === S.asof;
    if (same) {
      for (const c of codes) {
        const e = D.map[c], pts = sparkOf(c);
        if (!e || !pts.length) continue;
        const last = pts[pts.length - 1][1];
        n++; if (Math.abs(last - e.p) < 0.0051) okN++; else bad = `${c} 收盤 ${fmtPx(e.p)}／最後一筆 ${fmtPx(last)}`;
      }
    }
    out.push({ id: 'close', title: '收盤價對帳', org: '證交所每日收盤行情',
      st: !same ? 'wait' : n === 0 ? 'wait' : okN === n ? 'pass' : 'warn',
      big: same && n ? `${okN}/${n}` : '等待',
      detail: !same ? `官方收盤批次是 ${dateText(S && S.asof)}，今天的收盤出來後（約 14:30 以後）自動對帳` : okN === n ? `自選 ${n} 檔官方收盤＝當天最後一筆成交` : bad,
    });
  }
  // 3. 折溢價重算：拿市價與投信預估淨值自己算一次，和冷眼給的數字比
  {
    let n = 0, okN = 0;
    if (L && L.etfs) {
      for (const c of codes) {
        const a = L.etfs[c];
        if (!a || !isNum(a[0]) || !isNum(a[1]) || !isNum(a[2]) || !a[1]) continue;
        const mine = (a[0] - a[1]) / a[1] * 100;
        n++; if (Math.abs(mine - a[2]) <= 0.03) okN++;
      }
    }
    out.push({ id: 'prem', title: '折溢價重算', org: '投信預估淨值',
      st: n === 0 ? 'wait' : okN === n ? 'pass' : 'warn', big: n ? `${okN}/${n}` : '—',
      detail: n === 0 ? '還沒有盤中預估淨值' : okN === n ? `自選 ${n} 檔重算結果與冷眼一致` : `有 ${n - okN} 檔重算結果對不上，以投信公告為準`,
    });
  }
  // 4. 加權指數：收盤批次的指數 vs 全球市場檔裡的指數（兩條管線各自讀證交所）
  {
    const m = S && S.market, g = D.global && D.global.tw && D.global.tw.taiex;
    let st = 'wait', detail = '兩份資料的日期還不一樣，等同一天再比', big = '等待';
    if (m && g && m.d === g.d) {
      const ok = Math.abs(m.close - g.c) < 0.5;
      st = ok ? 'pass' : 'warn'; big = ok ? '一致' : '不一致';
      detail = ok ? `${dateText(m.d)} 收 ${fmtPx(m.close)}，兩邊相同` : `收盤批次 ${fmtPx(m.close)}／市場溫度 ${fmtPx(g.c)}`;
    }
    out.push({ id: 'taiex', title: '加權指數核對', org: '證交所加權指數', st, big, detail });
  }
  // 5. 官方來源健康
  {
    const h = sourceHealth();
    out.push({ id: 'src', title: '官方來源健康', org: '冷眼後台抓取紀錄',
      st: h.total === 0 ? 'wait' : h.err ? 'warn' : h.ok === h.total ? 'pass' : 'warn', big: h.total ? `${h.ok}/${h.total}` : '—',
      detail: h.err ? `${h.err} 個來源最近一次抓取失敗，其餘正常` : h.ok === h.total ? '每個官方來源最近都抓取成功' : `${h.total - h.ok} 個來源超過 4 天沒有新資料（可能是那份資料本來就不常更新）`,
    });
  }
  // 6. 版本同步：版本檔說的時間戳 = 看板手上那一份
  {
    const f = (D.version && D.version.files) || {};
    const names = Object.keys(STAMP).filter((n) => f[n]);
    const same = names.filter((n) => f[n] === stampOf(n));
    const down = D.link === 'down';
    out.push({ id: 'ver', title: '資料版本同步', org: '冷眼版本檔',
      st: down ? 'fail' : !names.length ? 'wait' : same.length === names.length ? 'pass' : 'warn',
      big: down ? '斷線' : names.length ? `${same.length}/${names.length}` : '—',
      detail: D.link === 'down' ? '連不上冷眼，顯示的是上次的資料' : same.length === names.length ? '看板手上的每一份都是最新版' : '有新版本，正在下載',
    });
  }
  return out;
}

/** 全市場規則觀點分布 */
function breadth() {
  const c = { bull: 0, neutral: 0, bear: 0, n: 0 };
  for (const e of (D.summary && D.summary.etfs) || []) {
    if (e.young || !isNum(e.st)) continue;
    c.n++; if (e.st > 0) c.bull++; else if (e.st < 0) c.bear++; else c.neutral++;
  }
  return c;
}
const STANCE = { 1: { t: '偏多', cls: 'bull' }, 0: { t: '中性', cls: 'neu' }, '-1': { t: '偏空', cls: 'bear' } };
const POS_NAMES = { add: '可加碼', wait: '漲多分批', hold: '續抱', caution: '先不加碼', trim: '減碼' };
const CAT_NAMES = () => (D.summary && D.summary.cats) || {};
