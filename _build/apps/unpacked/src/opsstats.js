/* 解包 — 粉專作戰台・導流成效：每週回填一次三平台粉絲數和 YouTube 的外部流量，每篇貼文發完隔天回填成績。
   全部只存在這台裝置；數字由你從各平台後台抄過來（App 不連任何人的帳號）。
   圖表照解包的配色：平台顏色固定（脆＝橘、IG＝粉、FB＝藍，暗底下驗過色盲可分辨），單一數列用黃色，字一律用文字色。 */
const CK_F = [
  ['th', 'Threads 粉絲', 'Threads 個人檔案上的「粉絲」人數'],
  ['ig', 'IG 粉絲', 'Instagram 個人檔案上的「粉絲」人數'],
  ['fb', 'FB 追蹤者', '粉專首頁的「追蹤者」人數'],
  ['yt', 'YouTube 訂閱', 'YouTube 工作室 → 資訊主頁的「目前訂閱人數」'],
  ['ytv', '近 7 天 YouTube 觀看', 'YouTube 工作室 → 數據分析 → 總覽，期間選「過去 7 天」，看「觀看次數」'],
  ['rth', '從 Threads 來的觀看', 'YouTube 工作室 → 數據分析 →「內容」（或「觸及率」）→「流量來源類型」點「外部」，期間選過去 7 天，找 Threads 那一列'],
  ['rig', '從 IG 來的觀看', '同上，找 Instagram 那一列（沒有就填 0）'],
  ['rfb', '從 FB 來的觀看', '同上，找 Facebook 那一列（沒有就填 0）'],
  ['yth', '公開觀看時數（近一年）', 'YouTube 工作室 →「營利」（賺取收益）頁的資格進度：公開觀看時數。選填'],
];
/* 這個階段要回填的欄位：只顧 Threads 時不用填 IG、FB 的 */
const ckFields = () => { const on = opsPfs(); return CK_F.filter(([k]) => !['th', 'ig', 'fb'].includes(k.replace(/^r/, '')) || on.includes(k.replace(/^r/, ''))); };
/* 回填的是哪一週：週日晚上、週一、週二回填剛結束（或快結束）的那一週 */
function ckWeekId() { const t = todayTW(); const wd = wdNum(t); return isoWeekOf(wd === 1 || wd === 2 ? addD(t, -3) : t).id; }
const wkList = () => Object.keys(S.ops.wk || {}).sort();
const fmtI = (n) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('zh-TW'));
const wan = (n) => (n >= 1e4 ? (n / 1e4).toLocaleString('zh-TW') + ' 萬' : fmtI(n));

/* ---- 今日任務頁會用到的小區塊 ---- */
function opsCheckinBanner() {
  const t = todayTW(); const wd = wdNum(t); const id = ckWeekId();
  if (S.ops.wk[id] || !S.ops.log.length) return '';
  if (!((wd === 0 && nowHM() >= '20:00') || wd === 1 || wd === 2)) return '';
  return `<div class="ck-ban" data-go="fan/~stats"><b>WEEK ${wkNo(id)} 週結算</b><span>${thOnly() ? '花 1 分鐘回填 Threads 粉絲和 YouTube 外部流量，看 Threads 帶了多少人去看影片' : '花 1 分鐘回填各平台粉絲和 YouTube 外部流量，看哪個平台真的帶來觀看'}</span><em>去回填 ›</em></div>`;
}
function opsNeedStats() {
  const now = Date.now(); const lim = addD(todayTW(), -7);
  return S.ops.log.filter((l) => !l.s && l.d >= lim && now - Date.parse(l.at) >= 20 * 3600e3).slice(-6).reverse();
}
const STAT_HOW = {
  th: '那則串文下方的瀏覽次數（點進去看得到從粉絲、非粉絲來的各多少）；整個帳號看個人檔案右上的「洞察報告」',
  ig: '那篇貼文下方「查看洞察報告」：觸及帳號、互動',
  fb: '那篇貼文下方「查看洞察報告」：觸及人數、互動',
};
function opsStatRow(l, inline) {
  const m = refMeta(l.ref); const s = l.s || {};
  return `<div class="srow ${inline ? 'inl' : ''}" data-id="${esc(l.id)}"><div class="sr-h">${pfBadge(l.pf)}<b>${esc(m.title)}</b><span class="sd">${esc(mdDay(l.d))} 發</span>${l.s ? '<em>已回填</em>' : ''}</div>
    <div class="sr-in"><label>觀看<input type="number" inputmode="numeric" min="0" data-f="v" value="${s.v ?? ''}" placeholder="0"></label><label>互動<input type="number" inputmode="numeric" min="0" data-f="e" value="${s.e ?? ''}" placeholder="讚＋留言＋分享"></label><label>新粉絲<input type="number" inputmode="numeric" min="0" data-f="f" value="${s.f ?? ''}" placeholder="選填"></label><button class="btn sm y" data-act="opstatsave" data-id="${esc(l.id)}">存</button></div>
    <small class="sr-how">在哪看：${esc(STAT_HOW[l.pf])}。發文後 24 小時左右回填最準。</small></div>`;
}
function opsRefillHtml() {
  const L = opsNeedStats(); if (!L.length) return '';
  return `<h3 class="tape-h y">回填成績 <small>${L.length} 篇・每篇 10 秒</small></h3><p class="sub-note">填了這些，「成效」才算得出哪個平台、哪個時段最好。不想填也可以跳過。</p><div class="srows">${L.map((l) => opsStatRow(l)).join('')}</div>`;
}

/* ---- 成效頁 ---- */
function renderOpsStats() {
  const ids = wkList(); const last = ids.length ? S.ops.wk[ids[ids.length - 1]] : null;
  const id = ckWeekId(); const cur = S.ops.wk[id] || {};
  const prevId = ids.filter((x) => x < id).pop(); const prev = prevId ? S.ops.wk[prevId] : null;
  const P = plat();
  const F = ckFields();
  return `<div class="ops stats">${opsNav('stats')}${opsHead('成效', thOnly() ? '粉專是幫 YouTube 帶人的：這裡算給你看，Threads 帶了多少人去看你的影片。' : '粉專是幫 YouTube 帶人的：這裡算給你看，哪個平台真的把人帶到頻道。')}
    ${funnelHtml(last, ids.length > 1 ? S.ops.wk[ids[ids.length - 2]] : null)}
    <section class="ck ${S.ops.wk[id] ? 'done' : ''}"><div class="ck-h"><span class="wk-no sm">WEEK<b>${wkNo(id)}</b></span><div><b>週結算回填</b><small>${S.ops.wk[id] ? '這週填過了，數字可以再改' : `每週日晚上或週一，從後台抄 ${F.length} 個數字（大約 1 分鐘）`}</small></div></div>
      <div class="ck-grid">${F.map(([k, l, how]) => `<label class="ck-f ${k.startsWith('r') ? 'ref' : ''}"><span>${k.length === 2 && OPS_PF.includes(k) ? pfBadge(k) : k.startsWith('r') ? pfBadge(k.slice(1)) : ''}${esc(l)}</span><input type="number" inputmode="numeric" min="0" step="any" data-ck="${k}" value="${cur[k] ?? ''}" placeholder="${prev && prev[k] != null ? '上次 ' + prev[k] : ''}"><details><summary>在哪看？</summary><p>${esc(how)}</p></details></label>`).join('')}</div>
      <div class="btnrow"><button class="btn p" data-act="opck" data-w="${esc(id)}">${ICON.trophy}<span>結算這一週</span></button></div></section>
    ${ids.length ? `<h3 class="tape-h">${thOnly() ? 'Threads 帶了多少人去 YouTube' : '誰帶人去 YouTube'}</h3>${refBars(ids)}` : ''}
    ${ids.length > 1 ? `<h3 class="tape-h">粉絲成長</h3><div class="lcs">${lineChart(ids, opsPfs().map((p) => ({ k: p, name: PFI[p].n, c: PFI[p].c })), thOnly() ? 'Threads 粉絲' : '各平台粉絲')}${lineChart(ids, [{ k: 'yt', name: 'YouTube 訂閱', c: '#FFE600' }], 'YouTube 訂閱')}</div>` : ''}
    <h3 class="tape-h y">營利門檻進度</h3>${yppHtml(last)}
    <h3 class="tape-h">黃金時段 <small>照你自己的成績算</small></h3>${heatHtml()}
    <h3 class="tape-h p">教練建議</h3><ul class="coach">${opsCoach().map((x) => `<li class="${x[0]}"><b>${esc(x[1])}</b>${esc(x[2])}</li>`).join('')}</ul>
    <h3 class="tape-h">發文紀錄 <small>${S.ops.log.length} 篇</small></h3>
    ${opsPfs().includes('fb') ? `<div class="fbq"><span>${pfBadge('fb')} 本月帶連結 <b>${fbLinksUsed()}</b>／${P.fb.link_free}</span><span class="seg">${[['unknown', '不知道有沒有限制'], ['yes', '我的粉專有限制'], ['no', '沒有限制']].map(([v, l]) => `<button class="${S.ops.fbLimit === v ? 'on' : ''}" data-act="opfbl" data-v="${v}">${l}</button>`).join('')}</span></div>` : ''}
    <div class="srows">${S.ops.log.slice(-20).reverse().map((l) => opsStatRow(l)).join('') || '<div class="empty">還沒有發文紀錄：到「今日」照任務發第一篇吧。</div>'}</div>
    <h3 class="tape-h">備份 <small>換手機、清快取前先備份</small></h3>
    <p class="sub-note">發文紀錄、排程、成效數字只存在這台裝置。備份碼可以貼回任何一台的《解包》。</p>
    <div class="btnrow"><button class="btn y" data-act="opexp">${ICON.copy}<span>複製備份碼</span></button><button class="btn" data-act="opexpf">${ICON.dl}<span>存成檔案</span></button><button class="btn" data-act="opimp">貼上備份碼還原</button></div></div>`;
}
function wkDelta(a, b, k) { return a && b && a[k] != null && b[k] != null ? a[k] - b[k] : null; }
function funnelHtml(last, prev) {
  const PF = opsPfs(); const fl = thOnly() ? 'Threads 粉絲' : PF.length === 2 ? 'Threads＋IG 粉絲' : '三平台粉絲';
  if (!last) return `<section class="fun empty-f"><div class="fun-t">導流漏斗</div><p>回填第一週之後，這裡會變成：${fl} → 帶到 YouTube 的觀看 → 新訂閱。</p></section>`;
  const fans = PF.reduce((a, p) => a + (+last[p] || 0), 0); const ref = PF.reduce((a, p) => a + (+last['r' + p] || 0), 0);
  const d = wkDelta(last, prev, 'yt'); const df = prev ? fans - PF.reduce((a, p) => a + (+prev[p] || 0), 0) : null;
  const sg = (x) => (x == null ? '' : `<em class="${x >= 0 ? 'up' : 'dn'}">${x >= 0 ? '+' : ''}${fmtI(x)}</em>`);
  return `<section class="fun"><div class="fun-t">導流漏斗 <small>${esc(wkList().slice(-1)[0] || '')}</small></div>
    <div class="fun-s s1"><span>${fl}</span><b class="cu" data-n="${fans}" data-f="i">${fmtI(fans)}</b>${sg(df)}</div><i class="fun-a">▼</i>
    <div class="fun-s s2"><span>帶到 YouTube 的觀看（近 7 天）</span><b class="cu" data-n="${ref}" data-f="i">${fmtI(ref)}</b></div><i class="fun-a">▼</i>
    <div class="fun-s s3"><span>YouTube 訂閱</span><b class="cu" data-n="${+last.yt || 0}" data-f="i">${fmtI(last.yt)}</b>${sg(d)}</div></section>`;
}
/* 從各平台來的觀看：最新一週＋近四週合計（橫條，直接標名字和數字） */
function refBars(ids) {
  const lastId = ids[ids.length - 1]; const L = S.ops.wk[lastId]; const four = ids.slice(-4);
  const tot = (p) => four.reduce((a, w) => a + (+S.ops.wk[w]['r' + p] || 0), 0);
  const posts = (p) => S.ops.log.filter((l) => l.pf === p && four.some((w) => isoWeekOf(l.d).id === w)).length;
  const rows = opsPfs().map((p) => ({ p, v: +L['r' + p] || 0, t: tot(p), n: posts(p) }));
  const mx = Math.max(1, ...rows.map((r) => r.t));
  return `<div class="bars" role="table" aria-label="從各平台來的 YouTube 觀看">${rows.map((r) => `<div class="bar-r" role="row" data-tip="${esc(`${PFI[r.p].n}：最近一週 ${fmtI(r.v)}、近 ${four.length} 週 ${fmtI(r.t)} 次觀看；同期間發了 ${r.n} 篇${r.n ? `，平均每篇帶 ${(r.t / r.n).toFixed(1)} 次` : ''}`)}">
      <span class="bar-l">${pfBadge(r.p)}</span><span class="bar-t"><i style="--w:${(r.t / mx).toFixed(3)};--c:${PFI[r.p].c}"></i></span><span class="bar-v"><b>${fmtI(r.t)}</b><small>${r.n ? (r.t / r.n).toFixed(1) + '／篇' : '—'}</small></span></div>`).join('')}
    <p class="bar-n">近 ${four.length} 週合計。點一列看細節。</p></div>`;
}
/* 折線：週為單位；點圖看那一週的數字 */
function lineChart(ids, series, title) {
  const W = 340, H = 150, L = 34, R = 64, T = 12, B = 22; const n = ids.length;
  const vals = series.flatMap((s) => ids.map((w) => S.ops.wk[w][s.k]).filter((v) => v != null && v !== ''));
  if (!vals.length) return '';
  let mx = Math.max(...vals.map(Number)), mn = Math.min(0, ...vals.map(Number)); if (mx === mn) mx = mn + 1;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1)); const y = (v) => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
  const grid = [0, 0.5, 1].map((f) => { const v = mn + f * (mx - mn); return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${fmtN(Math.round(v))}</text>`; }).join('');
  const ends = [];
  const lines = series.map((s) => {
    const pts = ids.map((w, i) => { const v = S.ops.wk[w][s.k]; return v == null || v === '' ? null : [x(i), y(+v)]; }).filter(Boolean);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const lastP = pts[pts.length - 1]; const lastV = [...ids].reverse().map((w) => S.ops.wk[w][s.k]).find((v) => v != null && v !== '');
    if (lastP) ends.push({ x: lastP[0] + 8, y: lastP[1] + 4, t: `${series.length > 1 ? (PFI[s.k] ? PFI[s.k].s : s.name) : ''} ${fmtN(+lastV)}`.trim() });
    return `<path d="${path}" class="ln" style="stroke:${s.c}"/>${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" class="dt" style="fill:${s.c}"/>`).join('')}`;
  }).join('');
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  const labs = ends.map((e) => `<text x="${e.x}" y="${e.y.toFixed(1)}" class="lab">${esc(e.t)}</text>`).join('');
  const xl = ids.map((w, i) => (i === 0 || i === n - 1 || n <= 6 ? `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">W${wkNo(w)}</text>` : '')).join('');
  const data = esc(JSON.stringify({ ids, series: series.map((s) => ({ k: s.k, name: s.name })), xs: ids.map((_, i) => x(i)) }));
  return `<figure class="lc"><figcaption>${esc(title)}${series.length > 1 ? `<span class="lg">${series.map((s) => `<i style="background:${s.c}"></i>${esc(s.name)}`).join('')}</span>` : ''}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" data-lc="${data}" role="img" aria-label="${esc(title)}的每週變化">${grid}${lines}${labs}${xl}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}"/></svg><div class="lc-tip"></div></figure>`;
}
function yppHtml(last) {
  const Y = plat().yt; const subs = last ? +last.yt || 0 : 0; const hrs = last && last.yth != null && last.yth !== '' ? +last.yth : null;
  const bar = (v, max, lab) => `<div class="yp-b"><span>${lab}</span><div class="yp-t"><i style="--p:${Math.min(1, (v || 0) / max).toFixed(3)}"></i></div><b>${v == null ? '？' : fmtI(v)}<small>／${fmtI(max)}</small></b></div>`;
  const days = Math.max(0, dayDiff(todayTW(), Y.ads_new.from));
  return `<div class="ypp"><div class="yp"><div class="yp-h"><b>粉絲贊助</b><span>頻道會員、超級感謝、超級留言</span></div>${bar(subs, Y.fan.subs, '訂閱')}${bar(hrs, Y.fan.hours, '公開觀看時數')}<p>另外要 90 天內有 ${Y.fan.uploads90} 支公開影片（或 90 天 ${wan(Y.fan.shorts)} 次 Shorts 觀看取代時數）。</p></div>
    <div class="yp"><div class="yp-h"><b>廣告分潤</b><span>影片廣告分潤</span></div>${bar(subs, Y.ads.subs, '訂閱')}${bar(hrs, days > 0 ? Y.ads.hours : Y.ads_new.hours, '公開觀看時數')}
      <p>${days > 0 ? `再 ${days} 天（${esc(Y.ads_new.from)}）起，新申請要 ${fmtI(Y.ads_new.hours)} 小時（或 90 天 ${wan(Y.ads_new.shorts)} 次 Shorts 觀看）；已經加入的不受影響。` : `現在新申請要 ${fmtI(Y.ads_new.hours)} 小時。`}</p></div>
    ${hrs == null ? '<p class="sub-note">公開觀看時數在 YouTube 工作室的「營利」頁，回填時順手抄就好（選填）。</p>' : ''}${yppEta()}</div>`;
}
function yppEta() {
  const ids = wkList().filter((w) => S.ops.wk[w].yt != null && S.ops.wk[w].yt !== ''); if (ids.length < 3) return '<p class="sub-note">回填滿三週，這裡會估算照現在的速度大約幾週到門檻。</p>';
  const a = S.ops.wk[ids[0]], b = S.ops.wk[ids[ids.length - 1]]; const wks = ids.length - 1; const rate = (b.yt - a.yt) / wks;
  if (rate <= 0) return '<p class="sub-note">最近訂閱沒有成長：先顧好上片頻率和三連發，粉專導流才有東西可以導。</p>';
  const eta = (goal) => (b.yt >= goal ? '已達成' : `約 ${Math.ceil((goal - b.yt) / rate)} 週`);
  return `<p class="sub-note">照最近 ${wks} 週平均每週 +${rate.toFixed(1)} 訂閱：500 訂閱 ${eta(500)}、1,000 訂閱 ${eta(1000)}（只是照目前速度推算，上片頻率一變就會變）。</p>`;
}
/* 黃金時段：星期 × 時段，格子越亮代表平均觀看越高（只算有回填成績的） */
const HB = [['早', 6, 11], ['午', 11, 14], ['下午', 14, 18], ['傍晚', 18, 20], ['晚上', 20, 22], ['深夜', 22, 30]];
function heatData() {
  const cells = {};
  for (const l of S.ops.log) {
    if (!l.s || l.s.v == null || l.s.v === '') continue;
    const t = new Date(Date.parse(l.at) + 8 * 3600e3); let h = t.getUTCHours(); if (h < 6) h += 24;
    const b = HB.findIndex(([, a, z]) => h >= a && h < z); if (b < 0) continue;
    const key = t.getUTCDay() + '-' + b; const c = cells[key] = cells[key] || { n: 0, v: 0 }; c.n++; c.v += +l.s.v;
  }
  return cells;
}
function heatHtml() {
  const cells = heatData(); const n = Object.values(cells).reduce((a, c) => a + c.n, 0);
  const mx = Math.max(1, ...Object.values(cells).map((c) => c.v / c.n));
  const rows = [1, 2, 3, 4, 5, 6, 0];
  return `<div class="heat ${n < 8 ? 'few' : ''}"><div class="hm"><span></span>${HB.map(([l]) => `<span class="hx">${l}</span>`).join('')}
    ${rows.map((wd) => `<span class="hy">${WK[wd]}</span>${HB.map((_, b) => { const c = cells[wd + '-' + b]; const v = c ? c.v / c.n : 0; return `<span class="hc ${c ? '' : 'none'}" style="--a:${c ? (0.18 + 0.82 * v / mx).toFixed(2) : 0}" data-tip="${esc(c ? `週${WK[wd]}${HB[b][0]}：${c.n} 篇，平均 ${Math.round(v)} 次觀看` : `週${WK[wd]}${HB[b][0]}：還沒有資料`)}">${c ? c.n : ''}</span>`; }).join('')}`).join('')}</div>
    ${n < 8 ? `<div class="hm-few">還需要 ${8 - n} 篇有回填成績的貼文，才看得出黃金時段</div>` : '<p class="bar-n">格子越亮＝平均觀看越高，數字是篇數。點格子看細節。</p>'}</div>`;
}
function opsCoach() {
  const out = []; const ids = wkList(); const P = plat(); const PF = opsPfs();
  const last = ids.length ? S.ops.wk[ids[ids.length - 1]] : null;
  if (!S.ops.log.length) out.push(['go', '先發第一篇', thOnly() ? '到「今日」照任務發。第一週先求每天都有發、每則留言都回，不求完美。' : '到「今日」照任務發。第一週先求每天發，不求完美。']);
  if (!ids.length) out.push(['info', '每週回填一次', '週日晚上或週一花 1 分鐘回填，第二週開始就能比較成長和導流。']);
  const four = ids.slice(-4);
  if (four.length) {
    const tot = PF.map((p) => [p, four.reduce((a, w) => a + (+S.ops.wk[w]['r' + p] || 0), 0)]); const R = tot.reduce((a, x) => a + x[1], 0);
    if (!R) out.push(['info', '還看不到社群導流', '剛起步很正常：先把 Threads 的人養熟，再搭上片三連發把人帶過去。上片那天一定要發。']);
    else if (PF.length > 1) {
      tot.sort((a, b) => b[1] - a[1]); const [tp, tv] = tot[0];
      out.push(['good', `${PFI[tp].n} 帶來 ${Math.round((tv / R) * 100)}% 的社群導流`, `近 ${four.length} 週從社群來的 YouTube 觀看大多來自這裡，維持它的發文頻率。`]);
      for (const [p, v] of tot.slice(1)) {
        const posts = S.ops.log.filter((l) => l.pf === p && four.some((w) => isoWeekOf(l.d).id === w)).length;
        if (posts >= 6 && v === 0) out.push(['warn', `${PFI[p].n} 發了 ${posts} 篇還沒帶來觀看`, `可以降成一週 2 篇，把時間挪給 ${PFI[tp].n}；上片三連發照發。`]);
      }
    } else out.push(['good', `Threads 近 ${four.length} 週帶了 ${fmtI(R)} 次 YouTube 觀看`, '這就是粉專存在的意義：上片那幾天的三連發通常帶最多，記得每支新片都排。']);
  }
  if (ids.length >= 2) {
    const a = S.ops.wk[ids[ids.length - 2]], b = S.ops.wk[ids[ids.length - 1]];
    const g = PF.map((p) => [p, (+b[p] || 0) - (+a[p] || 0)]).sort((x, y) => y[1] - x[1]);
    if (g[0][1] > 0) out.push(['good', `這週 ${PFI[g[0][0]].n} 粉絲 +${g[0][1]}`, '回頭看看這週發了什麼、哪一篇留言最多，下週多發同類型的。']);
  }
  const best = Object.entries(heatData()).filter(([, c]) => c.n >= 2).map(([k, c]) => [k, c.v / c.n]).sort((x, y) => y[1] - x[1])[0];
  if (best) { const [wd, b] = best[0].split('-').map(Number); out.push(['good', `你的黃金時段：週${WK[wd]}${HB[b][0]}`, `平均 ${Math.round(best[1])} 次觀看。可以在「排程 → 發文節奏」把重要的貼文挪過去。`]); }
  const st = opsStreak(); if (st >= 3) out.push(['good', `已經連發 ${st} 天`, '小帳號要長大，穩定比爆一篇重要。']);
  if (thOnly()) {
    const fans = last && last.th != null && last.th !== '' ? +last.th : null;
    if (fans != null && fans < 100) out.push(['info', `Threads 還差 ${100 - fans} 位粉絲到 100`, '滿 100 位粉絲之後，洞察報告會多出粉絲輪廓這類數據；在那之前先看每篇的瀏覽數和留言數就好。']);
    if (st >= 14 || (fans != null && fans >= 100)) out.push(['go', '可以開第二階段：Instagram', 'Threads 已經穩定了。到「教學」開第二階段，同一篇的 IG 圖文版 App 會幫你做好。']);
    const dq = dqStreak(); if (dq >= 3) out.push(['good', `每日三件事全勤 ${dq} 天`, '發文、回留言、海巡都做到的帳號，長得最快。']);
  }
  if (PF.includes('fb') && S.ops.fbLimit !== 'no' && fbLinksUsed() >= P.fb.link_free) out.push(['warn', 'FB 本月的連結額度用完了', '這個月 FB 的貼文先別放外部連結（留言也算），導流交給 Threads 和 IG 個人檔案。']);
  const need = opsNeedStats().length; if (need >= 3) out.push(['info', `${need} 篇等你回填成績`, '回填了才算得出黃金時段和每篇帶來多少觀看。']);
  return out;
}

/* ---- 點擊與輸入 ---- */
async function opsStatAct(a, act) {
  if (a === 'opstatsave') {
    const row = act.closest('.srow'); const l = S.ops.log.find((x) => x.id === act.dataset.id); if (!row || !l) return true;
    const s = {}; for (const i of $$('input[data-f]', row)) if (i.value !== '') s[i.dataset.f] = Math.max(0, +i.value);
    if (!Object.keys(s).length) { toast('至少填一個數字', 'warn'); return true; }
    l.s = s; opsSave(); sfx.coin(); burstAt(act, [YEL, PINK], 12, 7); toast('成績存好了');
    const em = $('.sr-h em', row); if (!em) $('.sr-h', row).insertAdjacentHTML('beforeend', '<em>已回填</em>');
    if (ROUTE === 'fan' || ROUTE === '') { row.classList.add('gone'); setTimeout(() => { row.remove(); }, 400); }
    return true;
  }
  if (a === 'opck') {
    const w = act.dataset.w; const o = Object.assign({}, S.ops.wk[w] || {});
    let n = 0; for (const i of $$('input[data-ck]')) { if (i.value === '') delete o[i.dataset.ck]; else { o[i.dataset.ck] = Math.max(0, +i.value); n++; } }
    if (!n) { toast('先填幾個數字', 'warn'); return true; }
    o.at = new Date().toISOString(); S.ops.wk[w] = o; opsSave();
    sfx.drop(); setTimeout(() => sfx.fanfare(), 200); impact(act, [PINK, YEL, BLK], true); toast(`WEEK ${wkNo(w)} 結算完成`);
    const y = scrollY; await route(); scrollTo(0, y); return true;
  }
  if (a === 'opfbl') { S.ops.fbLimit = act.dataset.v; opsSave(); sfx.click(); $$('[data-act="opfbl"]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.ops.fbLimit)); return true; }
  if (a === 'opexp' || a === 'opexpf') {
    const json = JSON.stringify({ app: 'unpacked-ops', v: 1, at: new Date().toISOString(), ops: S.ops, posted: S.posted });
    if (a === 'opexpf') { const u = URL.createObjectURL(new Blob([json], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = `gamerhapsody-ops-${todayTW()}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); sfx.stamp(); toast('備份檔存好了'); return true; }
    const code = 'GR1:' + btoa(String.fromCharCode(...new TextEncoder().encode(json)));
    if (await copyText(code)) { sfx.stamp(); toast(`備份碼已複製（${Math.round(code.length / 1024)} KB），貼到記事本保存`); } else toast('複製失敗，改用「存成檔案」', 'warn');
    return true;
  }
  if (a === 'opimp') {
    openSheet(`<h3>貼上備份碼還原</h3><p class="sub-note">會用備份裡的發文紀錄、排程、成效數字<b>取代</b>這台裝置現在的。</p><textarea id="opimpt" class="op-ta" placeholder="GR1:… 或備份檔的內容"></textarea><div class="btnrow"><button class="btn p" data-act="opimpgo">還原</button></div>`, 'hsheet');
    return true;
  }
  if (a === 'opimpgo') {
    const raw = (($('#opimpt') || {}).value || '').trim();
    try {
      let j = raw; if (j.startsWith('GR1:')) j = new TextDecoder().decode(Uint8Array.from(atob(j.slice(4)), (ch) => ch.charCodeAt(0)));
      const o = JSON.parse(j); if (o.app !== 'unpacked-ops' || !o.ops || !Array.isArray(o.ops.log)) throw new Error('不是解包的備份');
      if (!act.dataset.sure) { act.dataset.sure = 1; act.textContent = `確定取代（備份裡有 ${o.ops.log.length} 篇紀錄）`; return true; }
      S.ops = Object.assign({}, OPS0, o.ops); S.ops.prof = Object.assign({}, OPS0.prof, S.ops.prof || {}); opsSave();
      if (o.posted) { S.posted = Object.assign({}, S.posted, o.posted); save('posted'); }
      closeSheet(); sfx.fanfare(); toast('還原好了'); route();
    } catch (e) { toast('備份碼讀不懂：' + e.message, 'warn'); }
    return true;
  }
  return false;
}
function opsInput2(t) { return opsLearnInput ? opsLearnInput(t) : false; }
/* 成效頁：數字跳上來、橫條長出來、點圖看細節 */
function opsStatsFx() {
  const f = $('.fun'); if (f && fxOn()) countUp(f);
  $$('.bar-t i').forEach((i, k) => setTimeout(() => i.classList.add('on'), 120 + k * 90));
  const tip = (el, txt) => { let t = $('#optip'); if (!t) { t = document.createElement('div'); t.id = 'optip'; document.body.appendChild(t); } t.textContent = txt; const r = el.getBoundingClientRect(); t.style.left = Math.max(8, Math.min(innerWidth - 248, r.left + r.width / 2 - 120)) + 'px'; t.style.top = (r.top + scrollY - 10) + 'px'; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600); };
  $$('[data-tip]').forEach((el) => el.addEventListener('click', () => { tip(el, el.dataset.tip); sfx.blip(900); }));
  $$('svg[data-lc]').forEach((svg) => {
    const D = JSON.parse(svg.dataset.lc); const box = svg.parentElement; const tp = $('.lc-tip', box); const xh = $('.xh', svg);
    const pick = (ev) => {
      const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * 340;
      let bi = 0; D.xs.forEach((x, i) => { if (Math.abs(x - px) < Math.abs(D.xs[bi] - px)) bi = i; });
      const w = D.ids[bi]; xh.setAttribute('x1', D.xs[bi]); xh.setAttribute('x2', D.xs[bi]); xh.classList.add('on');
      tp.innerHTML = `<b>WEEK ${wkNo(w)}</b>${D.series.map((s) => `<span>${esc(s.name)}：${fmtI(S.ops.wk[w][s.k])}</span>`).join('')}`; tp.classList.add('on');
    };
    svg.addEventListener('pointermove', pick); svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointerleave', () => { xh.classList.remove('on'); tp.classList.remove('on'); });
  });
}
