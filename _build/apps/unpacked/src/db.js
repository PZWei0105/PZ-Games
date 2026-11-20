/* 解包 — 資料庫＋萬用搜尋（2026-11-20）
   App 裡出現過的每一款遊戲都在 data/db.json（live.py 每小時整理）：專題、推坑、願望單、行情板百大、限免、TGA 入圍、週報下週出擊，
   還有痞子葳自己「加進資料庫」的。一起搜、一起篩（類型、繁中、價格、評價、Mod）。搜不到就按「加進資料庫」：
   走點播台的轉發站送 {type:'add', q}，下一輪（每小時第 41 分）live.py 去 Steam 找到就補上情報卡。
   「解包專題」分頁是原本的庫存（結論、平台、課金、我的標記篩選、加入比較）。 */
const DB = { mode: 'all', q: '', src: '', tag: '', zh: false, sale: false, free: false, mod: false, rv: 0, max: 0, soon: false, sort: 'rel', n: 40, focus: false, list: null };
const DB_SRC = [['', '全部'], ['f', '專題'], ['p', '推坑'], ['w', '願望單'], ['b', '百大熱玩'], ['x', '限免'], ['t', 'TGA 入圍'], ['k', '週報'], ['q', '我加的']];
const DB_BADGE = { f: ['專題', 'y'], p: ['推坑', 'p'], w: ['願望單', 'w'], b: ['百大', 'b'], x: ['限免', 'x'], t: ['TGA', 't'], k: ['週報', 'k'], q: ['我加的', 'q'] };
S.adds = LS.get('adds', []);   // 自己按過「加進資料庫」的：[{q, at}]

async function dbLoad(force) {
  if (S.db && !force && Date.now() - (S.dbAt || 0) < 20 * 60e3) return S.db;
  try {
    const [d, ad] = await Promise.all([getJSON('db.json'), getJSON('adds.json').catch(() => null)]);
    if (d && d.items) { S.db = d; S.dbAt = Date.now(); d.items.forEach((r) => { r._k = dbKey(r); }); }
    if (ad && ad.items) S.addsSt = ad.items;
  } catch (e) { /* 讀不到就用手上的 */ }
  return S.db;
}
function dbKey(r) { return [nameKey(r.n || ''), nameKey(r.e || ''), (r.z || '').toLowerCase(), (r.t || []).join(' ').toLowerCase()].join(' | '); }
const dbHas = (r, c) => r.s.some((s) => s === c || s.startsWith(c + ':'));
function dbScore(r, q, qk) {
  if (!q) return 1;
  const n = nameKey(r.n || ''), e = nameKey(r.e || ''), z = (r.z || '').toLowerCase();
  if (n === qk || e === qk || z === q) return 100;
  if (n.startsWith(qk) || e.startsWith(qk) || z.startsWith(q)) return 70;
  if (` ${n} `.includes(` ${qk}`) || ` ${e} `.includes(` ${qk}`)) return 55;
  if (n.includes(qk) || e.includes(qk) || z.includes(q)) return 45;
  const toks = qk.split(' ').filter(Boolean);
  if (toks.length > 1 && toks.every((w) => r._k.includes(w))) return 30;
  if ((r.t || []).some((t) => t.toLowerCase().includes(q))) return 15;
  return 0;
}
function dbItems() {
  const d = S.db; if (!d) return [];
  const q = DB.q.trim().toLowerCase(), qk = nameKey(DB.q);
  let L = d.items.map((r) => [r, dbScore(r, q, qk)]).filter(([r, sc]) => {
    if (q && !sc) return false;
    if (DB.src && !dbHas(r, DB.src)) return false;
    if (DB.tag && !(r.t || []).includes(DB.tag)) return false;
    if (DB.zh && r.c !== 'tc') return false;
    if (DB.sale && !(r.d > 0)) return false;
    if (DB.free && !(r.fr || r.p === 0)) return false;
    if (DB.mod && !r.m) return false;
    if (DB.rv && !((r.r || 0) >= DB.rv && (r.rn || 0) >= 50)) return false;
    if (DB.max && !(r.p != null && r.p <= DB.max * 100)) return false;
    if (DB.soon && !r.soon) return false;
    if (r.ad && !q) return false;   // 成人向的只有指名搜尋才出現
    return true;
  });
  const by = {
    rel: (a, b) => b[1] - a[1] || (b[0].s.length - a[0].s.length) || ((b[0].pl || 0) - (a[0].pl || 0)),
    hot: (a, b) => (b[0].pl || 0) - (a[0].pl || 0),
    rv: (a, b) => ((b[0].rn || 0) >= 50 ? b[0].r || 0 : 0) - ((a[0].rn || 0) >= 50 ? a[0].r || 0 : 0) || (b[0].rn || 0) - (a[0].rn || 0),
    cheap: (a, b) => (a[0].p == null ? 1e12 : a[0].p) - (b[0].p == null ? 1e12 : b[0].p),
    disc: (a, b) => (b[0].d || 0) - (a[0].d || 0),
    new: (a, b) => String(b[0].y || '').localeCompare(String(a[0].y || '')),
  }[DB.sort] || ((a, b) => b[1] - a[1]);
  L.sort(by);
  return L.map((x) => x[0]);
}
function dbTags() {
  const c = {}; ((S.db && S.db.items) || []).forEach((r) => (r.t || []).slice(0, 3).forEach((t) => { c[t] = (c[t] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 18).map((x) => x[0]);
}

async function renderLibAll() {
  await dbLoad();
  if (!S.db) { DB.mode = 'feat'; return renderLib(); }
  const nF = S.index.items.length;
  const tg = (k, on, label) => `<button class="fl ${on ? 'on' : ''}" data-act="dbf" data-k="${k}">${label}</button>`;
  const src = DB_SRC.map(([k, l]) => `<button class="fl ${DB.src === k ? 'on' : ''}" data-act="dbf" data-k="src" data-v="${k}">${l}</button>`).join('');
  const tags = [`<button class="fl ${!DB.tag ? 'on' : ''}" data-act="dbf" data-k="tag" data-v="">全部類型</button>`, ...dbTags().map((t) => `<button class="fl ${DB.tag === t ? 'on' : ''}" data-act="dbf" data-k="tag" data-v="${esc(t)}">${esc(t)}</button>`)].join('');
  const sorts = [['rel', DB.q ? '最相關' : '推薦'], ['hot', '熱玩人數'], ['rv', '好評'], ['cheap', '便宜'], ['disc', '折扣'], ['new', '新上市']].map(([k, l]) => `<button class="fl ${DB.sort === k ? 'on' : ''}" data-act="dbf" data-k="sort" data-v="${k}">${l}</button>`).join('');
  return `<div class="sec-h"><h2 class="spray-h y">資料庫</h2><span class="date-stk">${S.db.n} 款</span></div>
    <div class="db-seg"><button class="${DB.mode === 'all' ? 'on' : ''}" data-act="dbmode" data-v="all">全部遊戲 <b>${S.db.n}</b></button><button class="${DB.mode === 'feat' ? 'on' : ''}" data-act="dbmode" data-v="feat">解包專題 <b>${nF}</b></button></div>
    <label class="search db-search">${ICON.search}<input id="dbq" type="search" placeholder="遊戲名（中英文都行）、類型…" value="${esc(DB.q)}" autocomplete="off" enterkeyhint="search"></label>
    ${dbAddsHtml()}
    <div class="db-rows"><div class="db-row">${src}</div>
      <div class="db-row">${tg('zh', DB.zh, '有繁中')}${tg('sale', DB.sale, '特價中')}${tg('free', DB.free, '免費')}${tg('mod', DB.mod, '可裝 Mod')}${tg('rv', DB.rv === 90, '好評 90%↑')}${tg('max', DB.max === 300, 'NT$300 內')}${tg('soon', DB.soon, '即將推出')}</div>
      <div class="db-row">${tags}</div>
      <div class="db-row db-sort"><span>排序</span>${sorts}</div></div>
    <div id="dbres">${dbResHtml()}</div>`;
}
function dbResHtml() {
  const L = dbItems(); DB.list = L;
  const n = Math.min(L.length, DB.n);
  const q = DB.q.trim(); const qk = nameKey(q);
  const exact = q.length >= 2 && (S.db.items || []).some((r) => nameKey(r.n || '') === qk || nameKey(r.e || '') === qk || (r.z || '').toLowerCase() === q.toLowerCase());
  const asked = q && S.adds.some((x) => nameKey(x.q) === qk);
  const add = q.length >= 2 && !exact ? `<div class="db-add"><div><b>${L.length ? '沒看到你要的那款？' : `資料庫裡還沒有「${esc(q)}」`}</b><span>${asked ? '已經送出了，等下一班處理。' : '加進資料庫：下一班（每小時 41 分）去 Steam 找，找到就補上完整情報卡。'}</span></div>${asked ? '' : `<button class="btn y sm" data-act="dbadd" data-q="${esc(q)}">＋ 加進資料庫</button>`}</div>` : '';
  return `<div class="db-cnt">${q ? `「${esc(q)}」` : ''}找到 <b>${L.length}</b> 款${DB.src || DB.tag || DB.zh || DB.sale || DB.free || DB.mod || DB.rv || DB.max || DB.soon ? `<button class="db-clr" data-act="dbclr">清除篩選</button>` : ''}</div>
    ${L.length ? '' : add}<div class="db-list">${L.slice(0, n).map((r, i) => dbRow(r, i)).join('')}</div>
    ${n < L.length ? `<button class="btn k db-more" data-act="dbmore">再看 ${Math.min(40, L.length - n)} 款（還有 ${L.length - n} 款）</button>` : ''}${L.length ? add : ''}`;
}
function dbPrice(r) {
  if (r.fr || r.p === 0) return '<em class="dbp free">免費</em>';
  if (r.p == null) return r.soon ? '<em class="dbp soon">未上市</em>' : '<em class="dbp na">—</em>';
  return `<em class="dbp${r.d ? ' sale' : ''}">${r.d ? `<i>-${r.d}%</i>` : ''}${fmtNT(r.p)}</em>`;
}
function dbRow(r, i) {
  const name = r.z || r.n || r.e; const sub = [r.z && r.n !== r.z ? r.n : '', r.e && r.e !== r.n ? r.e : ''].filter(Boolean)[0] || '';
  const badges = [...new Set(r.s.map((s) => s.split(':')[0]))].map((k) => DB_BADGE[k] ? `<i class="dbb ${DB_BADGE[k][1]}">${DB_BADGE[k][0]}</i>` : '').join('');
  const chips = [r.c === 'tc' ? '<i class="dbc tc">繁中</i>' : r.c === 'sc' ? '<i class="dbc sc">簡中</i>' : '', r.m ? '<i class="dbc mod">MOD</i>' : '', ...(r.t || []).slice(0, 2).map((t) => `<i class="dbc">${esc(t)}</i>`)].join('');
  const rv = r.r != null && (r.rn || 0) >= 10 ? `<span class="dbrv ${r.r >= 80 ? 'g' : r.r >= 60 ? 'm' : 'b'}">${r.r}%</span>` : '';
  const img = r.i ? `<img src="${esc(r.i)}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<button class="dbr" data-act="dbopen" data-i="${i}" style="--i:${Math.min(i, 12)}"><span class="dbr-i">${img}<b>${esc((name || '?').slice(0, 1))}</b></span>
    <span class="dbr-b"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}<span class="dbr-c">${chips}</span></span>
    <span class="dbr-r">${dbPrice(r)}${rv}${r.pl ? `<span class="dbpl">${fmtN(r.pl)} 人在玩</span>` : ''}</span><span class="dbr-s">${badges}</span></button>`;
}
function dbOpen(i) {
  const r = (DB.list || [])[i]; if (!r) return;
  const f = r.s.find((s) => s.startsWith('f:')), p = r.s.find((s) => s.startsWith('p:')), x = r.s.find((s) => s.startsWith('x:'));
  if (f) { NAVN++; location.hash = 'f/' + f.slice(2); return; }
  if (p) { NAVN++; location.hash = 'p/' + p.slice(2); return; }
  if (r.a) { gameOpen('a:' + r.a); return; }
  if (x) { gameOpen('free:' + x.slice(2)); return; }
  gameOpen(`cmp:|${r.n || r.z}`);
}

/* ---- 加進資料庫 ---- */
function dbAddsHtml() {
  const st = S.addsSt || {};
  // 找到的放 3 天就收起來（之後在資料庫裡搜得到）；排隊中、找不到的一直留著
  const L = S.adds.filter((x) => { const s = st[nameKey(x.q)]; return !s || s.st !== 'ok' || Date.now() - Date.parse(s.at || x.at || 0) < 3 * 864e5; }).slice(0, 8); if (!L.length) return '';
  const nx = new Date(Date.now() + 8 * 3600e3); const m = nx.getUTCMinutes(); const hh = (nx.getUTCHours() + (m >= 41 ? 1 : 0)) % 24;
  return `<div class="db-adds"><div class="dba-h">你加的</div>${L.map((x) => {
    const s = st[nameKey(x.q)];
    if (!s) return `<span class="dba wait">⏳ ${esc(x.q)}<small>排隊中・約 ${String(hh).padStart(2, '0')}:50 前好</small></span>`;
    if (s.st === 'ok') return `<button class="dba ok" data-act="dbaopen" data-a="${s.a}">✓ ${esc(s.n || x.q)}<small>已加入・看情報卡</small></button>`;
    return `<span class="dba miss">✗ ${esc(x.q)}<small>Steam 上找不到${(s.sug || []).length ? '，是不是：' : ''}</small>${(s.sug || []).map(([a, n]) => `<button data-act="dbaadd" data-q="${esc(n)}">${esc(n)}</button>`).join('')}<button class="dbx" data-act="dbadel" data-q="${esc(x.q)}">移除</button></span>`;
  }).join('')}</div>`;
}
function dbAdd(q) {
  q = String(q || '').trim().slice(0, 80); if (q.length < 2) return;
  if (!S.adds.some((x) => nameKey(x.q) === nameKey(q))) { S.adds.unshift({ q, at: new Date().toISOString() }); S.adds = S.adds.slice(0, 30); LS.set('adds', S.adds); }
  askEmit('add', { q });
  toast(`送出了！下一班（整點 41 分）去 Steam 找「${q}」`);
}
function dbRefresh(keepFocus) {
  const box = $('#dbres'); if (!box) return;
  box.innerHTML = dbResHtml();
  if (keepFocus) { const i = $('#dbq'); if (i && document.activeElement !== i) i.focus(); }
}
function dbAct(a, act) {
  if (a === 'dbmode') { DB.mode = act.dataset.v; sfx.click(); route(); return true; }
  if (a === 'dbf') {
    const k = act.dataset.k;
    if (k === 'src' || k === 'tag' || k === 'sort') DB[k] = act.dataset.v;
    else if (k === 'rv') DB.rv = DB.rv ? 0 : 90; else if (k === 'max') DB.max = DB.max ? 0 : 300; else DB[k] = !DB[k];
    DB.n = 40; sfx.click(); const y = scrollY; renderLibAll().then((h) => { VIEW().innerHTML = h; scrollTo(0, y); }); return true;
  }
  if (a === 'dbclr') { Object.assign(DB, { src: '', tag: '', zh: false, sale: false, free: false, mod: false, rv: 0, max: 0, soon: false, n: 40 }); sfx.scratch(); route(); return true; }
  if (a === 'dbmore') { DB.n += 40; sfx.click(); const y = scrollY; dbRefresh(); scrollTo(0, y); return true; }
  if (a === 'dbopen') { sfx.click(); dbOpen(+act.dataset.i); return true; }
  if (a === 'dbadd' || a === 'dbaadd') { dbAdd(act.dataset.q); sfx.radio(); burstAt(act, [PINK, YEL], 14, 8); if (ROUTE === 'lib') route(); return true; }
  if (a === 'dbaopen') { sfx.click(); gameOpen('a:' + act.dataset.a); return true; }
  if (a === 'dbadel') { S.adds = S.adds.filter((x) => x.q !== act.dataset.q); LS.set('adds', S.adds); sfx.scratch(); route(); return true; }
  return false;
}
let DBT = 0;
function dbInput(t) {
  DB.q = t.value; DB.n = 40;
  clearTimeout(DBT); DBT = setTimeout(() => dbRefresh(true), 110);
}
