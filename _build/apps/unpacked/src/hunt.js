/* 解包 — 獵價：Steam 願望單＋App 裡標「想玩」的遊戲，特價、史低、上市倒數一眼看完。
   資料：data/wish.json（GitHub Actions 每小時同步願望單與 Steam 台灣區價格）＋ live.json（專題、推坑的即時資料）。
   「史低」是我們自己追蹤以來的最低價：追蹤滿 14 天才敢叫史低，之前只說「追蹤以來最低」。 */
const HUNT = { f: 'all', sort: 'smart', raf: 0, prevA: 0, t0: 0, lastPing: 0, blips: [] };
const HUNT_LOW_DAYS = 14;

/* appid → 已經寫過的專題／推坑（點了可以直接看） */
function steamRefs() {
  // 同一款有好幾篇時用最新那篇（目錄是新的在前）；買不買用最新一篇有寫的
  const m = {}, f = {};
  for (const it of (S.picks && S.picks.items) || []) if (it.steam && !m[String(it.steam)]) m[String(it.steam)] = { route: 'p/' + it.id, it };
  for (const it of (S.index && S.index.items) || []) {
    if (!it.steam) continue; const k = String(it.steam);
    if (!f[k]) f[k] = { route: 'f/' + it.id, it: Object.assign({}, it) };
    if (!f[k].it.buy && it.buy) f[k].it.buy = it.buy;
  }
  return Object.assign(m, f);
}
function routeOfId(id) { return (S.index && S.index.items.some((x) => x.id === id)) ? 'f/' + id : 'p/' + id; }

function huntTargets() {
  const map = new Map(); const refs = steamRefs();
  for (const w of (S.wish && S.wish.items) || []) {
    if (w.adult) continue;
    const a = String(w.appid); const ref = refs[a]; const p = w.p || [];
    map.set(a, {
      key: a, appid: w.appid, name: ref ? ref.it.zh : w.name, en: w.name, img: w.img, cap: w.cap || w.img,
      free: !!w.free, final: p[0], orig: p[1], disc: p[2] || 0, low: w.low ? w.low[0] : null, lowAt: w.low && w.low[1], since: w.low && w.low[2],
      sale: w.sale || null, rv: w.rv ? w.rv[0] : null, rvn: w.rv ? w.rv[1] : 0, rvl: w.rv ? w.rv[2] : '', rel: w.rel || {}, zh: w.zh,
      tags: w.tags || [], dev: w.dev, short: w.short, micro: w.micro, added: w.added, deck: w.deck,
      wish: true, want: false, ref: ref && ref.route, buy: ref && ref.it.buy,
    });
  }
  for (const [id, m] of Object.entries(S.marks)) {
    if (m !== 'want') continue;
    const it = findItem(id); if (!it) continue;
    const route = routeOfId(id);
    const k = it.steam ? String(it.steam) : 'id:' + id;
    if (map.has(k)) { const t = map.get(k); t.want = true; t.wantId = id; t.ref = t.ref || route; t.name = it.zh; t.buy = t.buy || it.buy; continue; }
    const lv = liveOf(it.steam); const pr = (lv && lv.price) || {};
    map.set(k, {
      key: k, appid: it.steam || null, name: it.zh, en: it.en, img: headerOf(it, lv), cap: (lv && lv.img && (lv.img.wide || lv.img.header)) || headerOf(it, lv),
      free: !!(lv && lv.free), final: pr.final ?? null, orig: pr.orig ?? null, disc: pr.disc || 0,
      low: pr.low ? pr.low.v : null, lowAt: pr.low && pr.low.at.slice(0, 10), since: pr.low && pr.low.since && pr.low.since.slice(0, 10),
      sale: pr.disc > 0 ? { from: null, end: pr.end || null } : null,
      rv: lv && lv.rv ? lv.rv.pct : null, rvn: lv && lv.rv ? lv.rv.n : 0, rvl: lv && lv.rv ? lv.rv.label : '',
      rel: lv && lv.rel ? lv.rel : { date: it.release, soon: !!(it.release && it.release > todayTW()) },
      zh: liveZh(lv, it.zhs), tags: (lv && lv.tags) || it.genres || [], dev: lv && lv.dev, short: lv && lv.short, micro: lv && lv.micro,
      wish: false, want: true, wantId: id, ref: route, priceText: it.price_text, noSteam: !it.steam, buy: it.buy,
    });
  }
  const q = wishQueue();
  return [...map.values()].map((t) => { t.queue = t.ref ? 0 : q.get(String(t.appid)) || 0; return huntStatus(t); });
}
/* 願望單上還沒寫解包的：照加入時間由新到舊排隊，每天的「願望單解包」排程最多寫 WISH_PER_DAY 款 */
const WISH_PER_DAY = 2;
function wishQueue() {
  const refs = steamRefs(); const skip = S.wishSkip || {};
  const q = ((S.wish && S.wish.items) || []).filter((w) => !w.adult && !refs[String(w.appid)] && !skip[String(w.appid)])
    .sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));
  return new Map(q.map((w, i) => [String(w.appid), i + 1]));
}
function huntStatus(t) {
  const today = todayTW();
  t.onSale = t.disc > 0 && !t.free;
  t.giveaway = t.disc >= 100 || (t.final === 0 && t.orig > 0);
  t.trackDays = t.since ? dayDiff(t.since, today) : 0;
  t.lowState = null;
  if (t.onSale && t.low != null && t.final <= t.low) t.lowState = t.trackDays >= HUNT_LOW_DAYS ? 'low' : 'new';
  else if (t.onSale && t.low != null && t.trackDays >= HUNT_LOW_DAYS && t.final <= t.low * 1.08) t.lowState = 'near';
  t.endMs = t.sale && t.sale.end ? Date.parse(t.sale.end) - Date.now() : null;
  if (t.endMs != null && t.endMs <= 0) t.endMs = null;
  t.soon = !!(t.rel && t.rel.soon);
  t.relDays = t.soon && t.rel.date ? dayDiff(today, t.rel.date) : null;
  t.saved = t.onSale && t.orig ? t.orig - t.final : 0;
  t.newSale = t.onSale && !S.huntSeen[t.key + ':' + t.final];
  t.hit = !!(t.buy && t.buy.target != null && t.final != null && t.final <= t.buy.target && t.buy.call !== '別買');
  t.newHit = t.hit && !S.huntSeen['hit:' + t.key + ':' + t.final];
  t.score = t.giveaway ? 2000 : t.hit ? 1500 + t.disc : t.onSale ? 300 + t.disc + (t.lowState === 'low' ? 400 : t.lowState === 'near' ? 150 : 0) + (t.endMs != null && t.endMs < 48 * 36e5 ? 120 : 0) + (t.newSale ? 60 : 0)
    : t.soon ? 100 - Math.min(99, t.relDays == null ? 99 : t.relDays) : (t.rv || 0) / 10;
  return t;
}
function huntSaleCount() { try { return huntTargets().filter((t) => t.newSale || t.newHit).length + freeNewCount(); } catch (e) { return 0; } }

/* ---- 文字 ---- */
function leftTxt(ms) {
  if (ms == null) return '';
  const h = ms / 36e5;
  if (h < 1) return `剩 ${Math.max(1, Math.round(ms / 6e4))} 分鐘`;
  if (h < 48) return `剩 ${Math.floor(h)} 小時`;
  return `剩 ${Math.floor(h / 24)} 天`;
}
function endDate(iso) { const d = new Date(Date.parse(iso) + 8 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
function lowTxt(t) {
  if (t.lowState === 'low') return '史低';
  if (t.lowState === 'near') return '接近史低';
  if (t.lowState === 'new') return `追蹤 ${Math.max(1, t.trackDays)} 天內最低`;
  return '';
}
function priceTxt(t) {
  if (t.noSteam) return esc((t.priceText || '非 Steam').split(/[／（(]/)[0]);
  if (t.free && !t.giveaway) return '免費';
  if (t.final == null) return t.soon ? '還沒開賣' : '—';
  return fmtNT(t.final);
}
/* 價格血條：滿格＝原價，剩下的血＝現在的價格；黃線＝追蹤以來最低 */
function hpBar(t, big) {
  if (!t.orig || t.final == null) return '';
  const cur = Math.max(2, Math.min(100, t.final / t.orig * 100));
  const lo = t.low != null && t.trackDays >= 1 ? Math.max(0, Math.min(100, t.low / t.orig * 100)) : null;
  const cls = t.lowState === 'low' ? 'crit' : cur <= 50 ? 'low' : cur < 100 ? 'mid' : '';
  return `<div class="hp ${big ? 'big' : ''} ${cls}" style="--cur:${cur.toFixed(1)}%"><i class="hpf"></i>${lo != null && lo < 99.5 ? `<i class="hpl" style="left:${lo.toFixed(1)}%"></i>` : ''}</div>
    ${big ? `<div class="hpk"><span>價格血條 ${Math.round(cur)}%</span>${lo != null && lo < 99.5 ? `<span class="lw">▲ ${t.trackDays >= HUNT_LOW_DAYS ? '史低線' : '追蹤最低'} ${fmtNT(t.low)}</span>` : `<span>${t.trackDays < 1 ? '剛開始追蹤' : '追蹤以來沒降過價'}</span>`}</div>` : ''}`;
}
function huntChips(t) {
  const out = [];
  if (t.zh === 'tc') out.push('<span class="chip">繁中</span>'); else if (t.zh === 'sc') out.push('<span class="chip n">只有簡中</span>'); else if (t.zh === 'none' || (t.wish && !t.zh)) out.push('<span class="chip n">無中文</span>');
  if (t.rv != null) out.push(`<span class="chip">Steam ${t.rv}%</span>`);
  if (t.deck) out.push('<span class="chip n">Deck 可玩</span>');
  if (t.wish) out.push(`<span class="chip n">願望單${t.added ? '・' + esc(t.added.slice(0, 7).replace('-', '/')) : ''}</span>`);
  if (t.want) out.push('<span class="chip p">我想玩</span>');
  if (t.buy) out.push(`<span class="chip cl ${t.hit ? 'hit' : ''}">Claude：${t.hit ? '到價' : esc(t.buy.call)}${t.buy.target != null && !t.hit ? ' ≤' + esc(fmtNT(t.buy.target)) : ''}</span>`);
  else if (t.ref) out.push(`<span class="chip y">${t.ref[0] === 'f' ? '已解包' : '推坑過'}</span>`);
  if (t.queue) out.push(`<span class="chip q">解包排隊 #${t.queue}</span>`);
  return out.join('');
}

/* ---- 畫面 ---- */
function huntItems(all) {
  return all.filter((t) => {
    const f = HUNT.f;
    if (f === 'sale') return t.onSale || t.giveaway || t.hit;
    if (f === 'hit') return t.hit;
    if (f === 'low') return t.lowState === 'low' || t.lowState === 'near' || t.lowState === 'new';
    if (f === 'soon') return t.soon;
    if (f === 'tc') return t.zh === 'tc';
    if (f === 'want') return t.want;
    if (f === 'cheap') return t.final != null && t.final <= 30000;
    return true;
  }).sort((a, b) => {
    if (HUNT.sort === 'disc') return (b.disc - a.disc) || (a.final - b.final);
    if (HUNT.sort === 'price') return (a.final ?? 1e12) - (b.final ?? 1e12);
    if (HUNT.sort === 'new') return String(b.added || '').localeCompare(String(a.added || ''));
    if (HUNT.sort === 'rv') return (b.rv || 0) - (a.rv || 0);
    return b.score - a.score;
  });
}
function wishState() {
  const w = S.wish;
  if (!w || w.state === 'unset' || (!w.ok && !(w.items || []).length && w.state !== 'empty' && w.state !== 'badid')) return 'unset';
  return w.state || (w.ok ? 'ok' : 'unset');
}
function connectHtml(st) {
  const msg = st === 'empty' ? '讀到 0 款：願望單是空的，或 Steam「遊戲詳細資料」還沒設成公開。'
    : st === 'badid' ? 'Steam 代號認不出來：請再確認一次個人檔案網址。'
      : '還沒連結 Steam 願望單。連好之後，願望單上的遊戲每小時自動對一次台灣區價格，特價、史低、快結束都會出現在這裡，每天早上的推播也會提醒你。';
  return `<div class="hconn"><div class="hc-h">${ICON.target}<b>${st === 'unset' ? '連結 Steam 願望單' : '願望單讀不到'}</b></div><p>${esc(msg)}</p>
    <ol><li>Steam →「編輯個人檔案」→「隱私設定」，把<b>遊戲詳細資料</b>改成<b>公開</b>（願望單跟著這個設定）。<a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer">打開 Steam 隱私設定</a></li>
    <li>把你的 Steam 個人檔案網址（像 steamcommunity.com/id/○○○）傳給 Claude，Claude 幫你接上。</li></ol>
    <p class="sub-note" style="margin:6px 0 0">現在先顯示你在 App 裡標「想玩」的遊戲。</p></div>`;
}
function renderHunt() {
  const all = huntTargets();
  const st = wishState();
  const sale = all.filter((t) => t.onSale || t.giveaway);
  const hits = all.filter((t) => t.hit);
  const lows = all.filter((t) => t.lowState === 'low');
  const saved = sale.reduce((a, t) => a + (t.saved || 0), 0);
  const list = huntItems(all);
  const isHot = (t) => t.onSale || t.giveaway || t.hit;
  const hot = list.filter(isHot);
  const soon = list.filter((t) => !isHot(t) && t.soon);
  const rest = list.filter((t) => !isHot(t) && !t.soon);
  const fl = (v, label) => `<button class="fl ${HUNT.f === v ? 'on' : ''}" data-act="hf" data-v="${v}">${label}</button>`;
  const so = (v, label) => `<button class="fl ${HUNT.sort === v ? 'on' : ''}" data-act="hs" data-v="${v}">${label}</button>`;
  const w = S.wish || {};
  const sync = w.ok ? `願望單 ${w.n || 0} 款・同步於 ${esc(ago(w.at))}` : '';
  return `<div class="sec-h"><h2 class="spray-h y">獵價</h2><span class="date-stk">PRICE HUNT</span><button class="btn sm k hcal" data-go="cal">${ICON.cal}<span>出擊日曆</span></button></div>
    <p class="sub-note">Steam 願望單＋你在 App 裡標「想玩」的遊戲，每小時對一次台灣區價格。${sync ? `<b class="hsync">${sync}</b>` : ''}${w.state === 'stale' ? '<span class="hwarn">（這一輪沒讀到，先顯示上一次）</span>' : ''}</p>
    ${saleHtml()}
    <section class="radarw">
      <div class="radar" id="radar"><div class="rd-grid"></div><div class="rd-sweep" id="rdsweep"></div>${radarBlips(all)}
        <span class="rd-tl">TARGETS<b>${all.length}</b></span><span class="rd-br">${sale.length ? 'LOCK ON' : 'SCANNING'}<i>…</i></span></div>
      <div class="hstats">
        <div class="hs p"><span>特價中</span><b class="cu" data-n="${sale.length}" data-f="i">${sale.length}</b><small>款</small></div>
        <div class="hs y"><span>史低</span><b class="cu" data-n="${lows.length}" data-f="i">${lows.length}</b><small>款</small></div>
        <div class="hs"><span>${hits.length ? '到價' : '獵物'}</span><b class="cu" data-n="${hits.length || all.length}" data-f="i">${hits.length || all.length}</b><small>款</small></div>
        ${saved ? `<div class="hs w"><span>這波特價一共便宜</span><b>NT$<span class="cu" data-n="${Math.round(saved / 100)}">${fmtN(Math.round(saved / 100))}</span></b></div>` : '<div class="hs w"><span>目前沒有獵物在特價，雷達持續掃描中</span></div>'}
        <div class="hlegend"><i class="lg-low"></i>史低<i class="lg-sale"></i>特價（越靠中心折越多）<i class="lg-soon"></i>未上市<i class="lg-n"></i>等降價</div>
      </div>
    </section>
    ${freeHtml()}
    ${st !== 'ok' && st !== 'stale' ? connectHtml(st) : ''}
    ${huntQueueNote(all)}
    <div class="filters hf">${fl('all', '全部')}${fl('sale', '特價中')}${hits.length ? fl('hit', '到價') : ''}${fl('low', '史低')}${fl('soon', '未上市')}${fl('tc', '有繁中')}${fl('cheap', 'NT$300 內')}${fl('want', '我想玩')}</div>
    <div class="sortrow">排序 ${so('smart', '先看該出手的')}${so('disc', '折扣')}${so('price', '便宜')}${so('rv', '好評')}${so('new', '新加入')}</div>
    ${!all.length ? `<div class="empty">還沒有獵物。${st === 'ok' ? '' : '在任何專題、推坑或短影音按「想玩」（短影音點兩下），那款就會進來；連好 Steam 願望單後，願望單上的遊戲也會自動進來。'}</div>` : ''}
    ${hot.length ? `<h3 class="tape-h p">鎖定！正在特價 <small>${hot.length} 款</small></h3><div class="bounties">${hot.map(bountyHtml).join('')}</div>` : (all.length && (HUNT.f === 'all' || HUNT.f === 'sale') ? '<div class="hquiet"><b>目前沒有獵物在特價</b><span>雷達持續掃描中，一開打折就會跳出來。</span></div>' : '')}
    ${soon.length ? `<h3 class="tape-h">即將上市 <small>${soon.length} 款</small></h3><div class="trows">${soon.map(rowHtml).join('')}</div>` : ''}
    ${rest.length ? `<h3 class="tape-h">等降價 <small>${rest.length} 款</small></h3><div class="trows">${rest.map(rowHtml).join('')}</div>` : ''}
    ${all.length && !list.length ? '<div class="empty">沒有符合的獵物，換個篩選試試。</div>' : ''}
    <p class="sub-note" style="margin-top:18px">「史低」是這個 App 開始追蹤以來的最低價（追蹤滿 ${HUNT_LOW_DAYS} 天才算），不是 Steam 有史以來的最低價。特價結束時間來自 Steam 商店。</p>`;
}
function huntQueueNote(all) {
  const q = all.filter((t) => t.queue).length; const done = all.filter((t) => t.wish && t.buy).length;
  if (!q && !done) return '';
  return `<div class="hqueue"><b>${ICON.page}Claude 願望單解包</b><span>${done ? `已經寫好 <em>${done}</em> 款的買不買判定` : ''}${done && q ? '・' : ''}${q ? `<em>${q}</em> 款排隊中，每天寫 ${WISH_PER_DAY} 款，大約 ${Math.ceil(q / WISH_PER_DAY)} 天寫完` : '全部寫完了'}</span></div>`;
}
function radarBlips(all) {
  HUNT.blips = [];
  return all.slice(0, 160).map((t) => {
    const ang = hashStr(t.key) % 360;
    let r, cls;
    if (t.giveaway || t.hit) { r = 0.1; cls = 'b-low'; }
    else if (t.onSale) { r = 0.16 + 0.66 * (1 - Math.min(95, t.disc) / 100); cls = t.lowState === 'low' ? 'b-low' : 'b-sale'; }
    else if (t.soon) { r = 0.72 + (hashStr(t.key + 's') % 10) / 100; cls = 'b-soon'; }
    else { r = 0.84 + (hashStr(t.key + 'r') % 12) / 100; cls = 'b-n'; }
    const x = 50 + r * 47 * Math.sin(ang * Math.PI / 180), y = 50 - r * 47 * Math.cos(ang * Math.PI / 180);
    if (t.onSale || t.giveaway || t.hit) HUNT.blips.push({ ang, key: t.key, low: cls === 'b-low' });
    return `<button class="blip ${cls}" data-act="hinfo" data-k="${esc(t.key)}" data-a="${ang}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" aria-label="${esc(t.name)}"><i></i></button>`;
  }).join('');
}
function bountyHtml(t, i) {
  const lt = lowTxt(t); const img = t.cap || t.img;
  return `<article class="bounty ${t.lowState === 'low' || t.giveaway ? 'gold' : ''}" data-act="hinfo" data-k="${esc(t.key)}" style="--rot:${rot(t.key, i, 1.4)}deg;--i:${i}">
    <div class="bh"><span class="bw">WANTED</span><span class="bn">${t.giveaway ? '限時免費' : t.hit && !t.onSale ? '到價' : '懸賞 -' + t.disc + '%'}</span></div>
    <div class="bimg">${img ? `<img src="${esc(img)}" alt="" loading="${i > 2 ? 'lazy' : 'eager'}" decoding="async" onerror="imgFail(this)">` : ''}<div class="ph" style="${img ? 'display:none' : ''}">TARGET</div>
      ${t.newSale || t.newHit ? '<span class="bnew">NEW</span>' : ''}${lt ? `<span class="blow ${t.lowState}">${esc(lt)}</span>` : ''}${t.endMs != null ? `<span class="bend ${t.endMs < 24 * 36e5 ? 'hot' : ''}">⏱ ${esc(leftTxt(t.endMs))}</span>` : ''}</div>
    <div class="bb"><h3>${esc(t.name)}</h3>${t.en && t.en !== t.name ? `<div class="ben">${esc(t.en)}</div>` : ''}
      ${t.hit ? `<div class="bhit">到價了！Claude 的目標價 ${fmtNT(t.buy.target)}，現在 ${fmtNT(t.final)}</div>` : ''}
      <div class="bprice">${t.onSale ? `<s>${fmtNT(t.orig)}</s>` : ''}<b>${t.giveaway ? '免費領' : fmtNT(t.final)}</b>${t.saved ? `<em>省 ${fmtNT(t.saved).replace('NT$', '')}</em>` : ''}</div>
      ${hpBar(t, true)}<div class="chips">${huntChips(t)}</div></div>
    <div class="bstamp">${t.giveaway ? '快領' : t.hit ? '到價' : t.lowState === 'low' ? '出手' : t.endMs != null && t.endMs < 48 * 36e5 ? '快收' : '鎖定'}</div><i class="tp tp1"></i></article>`;
}
function rowHtml(t, i) {
  const img = t.img || t.cap;
  const right = t.soon ? (t.relDays != null ? `<b class="tr-cd">${t.relDays <= 0 ? '今天' : t.relDays}<small>${t.relDays <= 0 ? '' : '天'}</small></b><span>${t.rel.date ? esc(mdDay(t.rel.date)) + ' 上市' : esc(t.rel.text || '日期未定')}</span>` : `<span>${esc(t.rel.text || '日期未定')}</span>`)
    : `<b class="tr-p">${priceTxt(t)}</b>${t.buy && t.buy.target != null ? `<span class="tr-tg">目標 ${fmtNT(t.buy.target)}</span>` : t.low != null && t.trackDays >= HUNT_LOW_DAYS && t.final > t.low ? `<span>史低 ${fmtNT(t.low)}</span>` : ''}`;
  return `<div class="trow" data-act="hinfo" data-k="${esc(t.key)}"><div class="tri">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)">` : ''}<div class="ph" style="${img ? 'display:none' : ''}">?</div></div>
    <div class="trb"><h4>${esc(t.name)}</h4><div class="trc">${huntChips(t)}</div>${t.soon ? '' : hpBar(t, false)}</div><div class="trr">${right}</div></div>`;
}
/* 情報卡：價格血條、價格紀錄、上市、評價、介紹；寫過專題或推坑的可以直接打開 */
async function huntInfo(key) {
  let t = huntTargets().find((x) => x.key === key); if (!t) return;
  if (t.appid && !t.wish && !liveReady(t.appid)) { await liveLoad([t.appid], 2000); t = huntTargets().find((x) => x.key === key) || t; }   // 介紹、開發商、寬版封面
  const mc = t.micro || {};
  const steamUrl = t.appid ? `https://store.steampowered.com/app/${t.appid}/` : '';
  openSheet(`<div class="hinfo"><div class="hi-img">${t.cap || t.img ? `<img src="${esc(t.cap || t.img)}" alt="" onerror="imgFail(this)">` : ''}${(mc.mp4 || mc.webm) && fxOn() ? `<video class="hi-v" muted loop playsinline autoplay preload="auto"${mc.mp4 ? ` src="${esc(mc.mp4)}"` : ''}></video>` : ''}
      ${t.onSale ? `<span class="bn">-${t.disc}%</span>` : ''}</div>
    <h3>${esc(t.name)}</h3>${t.en && t.en !== t.name ? `<div class="ben">${esc(t.en)}</div>` : ''}
    <div class="chips" style="padding:0;margin-top:8px">${huntChips(t)}${(t.tags || []).slice(0, 4).map((g) => `<span class="chip n">${esc(g)}</span>`).join('')}</div>
    <div class="hi-price"><div><span>現在</span><b>${t.giveaway ? '免費領' : priceTxt(t)}</b>${t.onSale ? `<s>${fmtNT(t.orig)}</s>` : ''}</div>
      ${t.endMs != null ? `<div><span>特價到</span><b class="sm">${esc(endDate(t.sale.end))}</b><em>${esc(leftTxt(t.endMs))}</em></div>` : ''}
      ${t.low != null ? `<div><span>${t.trackDays >= HUNT_LOW_DAYS ? '史低' : '追蹤以來最低'}</span><b class="sm">${fmtNT(t.low)}</b><em>${esc(mdDay(t.lowAt))}</em></div>` : ''}
      ${t.soon ? `<div><span>上市</span><b class="sm">${t.rel.date ? esc(mdDay(t.rel.date)) : '未定'}</b><em>${t.relDays != null ? (t.relDays <= 0 ? '今天' : '倒數 ' + t.relDays + ' 天') : esc(t.rel.text || '')}</em></div>` : ''}</div>
    ${t.buy ? `<div class="hi-buy ${BUY_CLS[t.buy.call] || ''} ${t.hit ? 'hit' : ''}"><span>Claude 判定</span><b>${esc(t.hit ? '到價，可以買' : t.buy.call)}</b>${t.buy.target != null ? `<em>目標價 ${fmtNT(t.buy.target)}${t.final != null && !t.hit ? `・還差 ${fmtNT(t.final - t.buy.target)}` : ''}</em>` : ''}</div>`
      : t.queue ? `<div class="hi-buy q"><span>Claude 願望單解包</span><b>排隊第 ${t.queue} 位</b><em>大約 ${Math.ceil(t.queue / WISH_PER_DAY)} 天內寫好：完整分析、買不買判定和目標價</em></div>` : ''}
    ${hpBar(t, true)}<div class="hi-chart" id="hichart">${t.appid ? '<span class="sub-note">價格紀錄讀取中…</span>' : ''}</div>
    ${t.short ? `<p class="hi-p">${esc(t.short)}</p>` : ''}${t.dev ? `<p class="sub-note">開發：${esc(t.dev)}${t.rv != null ? `・Steam 評價 ${t.rv}%（${esc(t.rvl || '')}，${fmtN(t.rvn)} 則）` : ''}</p>` : ''}
    <div class="btnrow">${t.ref ? `<button class="btn y" data-go="${esc(t.ref)}">${t.ref[0] === 'f' ? ICON.page : ICON.gem}<span>${t.ref[0] === 'f' ? (t.buy ? '看完整解包' : '看完整專題') : '看推坑全文'}</span></button>` : ''}${steamUrl ? `<a class="btn" href="${esc(steamUrl)}" target="_blank" rel="noopener noreferrer">${ICON.cart}<span>Steam 商店頁</span></a>` : ''}${t.want ? `<button class="btn sm" data-act="hunwant" data-id="${esc(t.wantId)}">不想玩了</button>` : ''}</div>
    ${t.want && !t.wish && t.appid && wishState() === 'ok' ? '<p class="sub-note" style="margin-top:10px">這款只在 App 裡標了想玩：加進 Steam 願望單，特價時每天早上的推播才會提醒你。</p>' : ''}</div>`, 'hsheet');
  sfx.lock();
  const v = $('.hi-v'); if (v) { v.addEventListener('playing', () => v.classList.add('on'), { once: true }); v.play().catch(() => {}); }
  if (!t.appid) return;
  const h = await loadHist(t.appid);
  const box = $('#hichart'); if (!box) return;
  box.innerHTML = priceChart(h && h.pr, t) || '<span class="sub-note">價格紀錄還不夠畫線（每小時記一次，有變價才記）。</span>';
}
/* 價格紀錄：階梯線（價格一變就跳），紅點是追蹤以來最低 */
function priceChart(pr, t) {
  if (!pr || !pr.length || !t.orig) return '';
  const now = Math.floor(Date.now() / 60000);
  const pts = pr.concat([[now, pr[pr.length - 1][1]]]);
  const t0 = pts[0][0], t1 = Math.max(t0 + 1, now);
  if (t1 - t0 < 60 * 24) return '';
  const hi = Math.max(t.orig, ...pts.map((p) => p[1])), lo = 0;
  const X = (m) => ((m - t0) / (t1 - t0) * 100).toFixed(2), Y = (v) => (4 + (1 - (v - lo) / (hi - lo)) * 52).toFixed(2);
  let d = `M${X(pts[0][0])},${Y(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `H${X(pts[i][0])}V${Y(pts[i][1])}`;
  const mn = Math.min(...pr.map((p) => p[1])); const at = pr.find((p) => p[1] === mn);
  return `<svg class="pchart" viewBox="0 0 100 60" preserveAspectRatio="none"><path class="pa" d="${d}V60H0Z"/><path class="pl" d="${d}" pathLength="100"/><circle cx="${X(at[0])}" cy="${Y(mn)}" r="1.6"/></svg>
    <div class="pc-k"><span>${esc(mdDay(new Date(t0 * 60000 + 8 * 3600e3).toISOString().slice(0, 10)))} 開始追蹤</span><span>今天</span></div>`;
}

/* ---- 雷達：掃描線轉一圈 4 秒，掃到特價的光點會亮一下、嗶一聲 ---- */
function huntFx() {
  huntStop();
  const sw = $('#rdsweep'); if (!sw) return;
  countUp($('.hstats'));
  dealsFx();
  // 第一次進來：懸賞單一張張拍上牆
  const bs = $$('.bounty');
  if (fxOn()) dropIn(bs, 'hunt');
  if (!fxOn()) { sw.style.transform = 'rotate(300deg)'; return; }
  HUNT.t0 = performance.now(); HUNT.prevA = 0;
  const loop = (now) => {
    if (!sw.isConnected) { HUNT.raf = 0; return; }
    if (!document.hidden) {
      const a = ((now - HUNT.t0) / 4000 * 360) % 360;
      sw.style.transform = `rotate(${a.toFixed(1)}deg)`;
      const p = HUNT.prevA;
      for (const b of HUNT.blips) {
        const hit = p <= a ? (b.ang > p && b.ang <= a) : (b.ang > p || b.ang <= a);
        if (!hit) continue;
        const el = $(`.blip[data-k="${CSS.escape(b.key)}"]`); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
        if (now - HUNT.lastPing > 260) { HUNT.lastPing = now; sfx.ping(b.low ? 2100 : 1500); }
      }
      HUNT.prevA = a;
    }
    HUNT.raf = requestAnimationFrame(loop);
  };
  HUNT.raf = requestAnimationFrame(loop);
  // 看過這一波特價：分頁上的數字歸零（卡片上的 NEW 這次還留著）
  setTimeout(() => {
    if (!ROUTE.startsWith('hunt')) return;
    for (const t of huntTargets()) { if (t.onSale) S.huntSeen[t.key + ':' + t.final] = 1; if (t.hit) S.huntSeen['hit:' + t.key + ':' + t.final] = 1; }
    LS.set('huntSeen', S.huntSeen); freeSeenAll(); setTabs('hunt');
  }, 1500);
}
function huntStop() { if (HUNT.raf) cancelAnimationFrame(HUNT.raf); HUNT.raf = 0; }

/* ---- 獵物出現：進 App 時，願望單有新的特價就跳出來（一天最多一次） ---- */
function huntAlert() {
  if (!S.settings.huntAlert || ROUTE.startsWith('hunt')) return;
  const today = todayTW(); if (LS.get('huntAlertDay', '') === today) return;
  const fresh = huntTargets().filter((t) => (t.newSale || t.newHit) && (t.wish || t.want)).sort((a, b) => b.score - a.score);
  const nh = fresh.filter((t) => t.newHit).length;
  if (!fresh.length) return;
  LS.set('huntAlertDay', today);
  const el = document.createElement('div'); el.id = 'halert';
  el.innerHTML = `<div class="ha-bg"></div><div class="ha-st t"></div><div class="ha-st b"></div><div class="ha-box"><div class="ha-k">⚠ WARNING ⚠</div><div class="ha-t">獵物出現</div>
    <div class="ha-s">${nh ? `<b>${nh}</b> 款到了 Claude 的目標價` : ''}${fresh.length - nh ? `${nh ? '，' : '你的獵物有 '}<b>${fresh.length - nh}</b> 款${nh ? '新特價' : '正在特價'}${!nh && fresh.some((t) => t.lowState === 'low') ? '，還有史低' : ''}` : ''}</div>
    <div class="ha-list">${fresh.slice(0, 3).map((t, i) => `<div class="ha-it" style="--i:${i}"><div class="ha-im">${t.img ? `<img src="${esc(t.img)}" alt="" onerror="imgFail(this)">` : ''}</div><b>${esc(t.name)}</b><span>${t.giveaway ? '免費' : t.hit ? '到價' : '-' + t.disc + '%'}</span></div>`).join('')}</div>
    <div class="btnrow" style="justify-content:center"><button class="btn y" data-act="ha-go">${ICON.target}<span>去獵價</span></button><button class="btn" data-act="ha-x">晚點</button></div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  sfx.siren();
  setTimeout(() => { if (!el.isConnected) return; sfx.drop(); haptic(30); const t = $('.ha-t', el); burstAt(t, [YEL, PINK, BLK], 30, 14); if (fxOn()) { shake(10, 300, $('.ha-box', el)); flash(BLK, 0.5); } }, 380);
  $$('.ha-it', el).forEach((it, i) => setTimeout(() => { if (el.isConnected) { sfx.stamp(); it.classList.add('in'); } }, 700 + i * 180));
}
function huntAlertClose(go) {
  const el = $('#halert'); if (!el) return;
  el.classList.remove('on'); setTimeout(() => el.remove(), 260); sfx.whoosh();
  if (go) { NAVN++; location.hash = 'hunt'; }
}
