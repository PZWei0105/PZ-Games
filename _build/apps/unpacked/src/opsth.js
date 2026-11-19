/* 解包 — 粉專作戰台・Threads 優先（2026-11-19）
   痞子葳從零開始經營粉專：先只顧 Threads（台灣聊遊戲最熱的地方），IG、FB 等 Threads 穩定再開（教學頁的第二、三階段）。
   這一檔：每日三件事（發文、回留言、海巡）、加碼的限免快訊（free.json 的即時資料直接排成貼文）、推坑的 Threads 稿與圖卡、
   平台階段切換。上架流程、排程在 ops.js，教學在 opslearn.js，成效在 opsstats.js。 */
const STORE_N = { epic: 'Epic', steam: 'Steam', gog: 'GOG' };

/* ---- 限免快訊 ---- */
const freeOf = (id) => ((S.free && S.free.items) || []).find((x) => x.id === id) || null;
/* 現在就能領的（已經開始、至少還有 30 分鐘才結束；不含下週預告、神秘遊戲、DLC） */
function freeNow() {
  const now = Date.now();
  return ((S.free && S.free.items) || []).filter((x) => x.title && !x.up && !x.mystery && !x.dlc && (!x.start || Date.parse(x.start) <= now) && (!x.end || Date.parse(x.end) > now + 30 * 6e4))
    .sort((a, b) => (Date.parse(a.end || '2999-01-01') - Date.parse(b.end || '2999-01-01')));
}
/* 結束時間換成台灣時間：11/20（四）00:00 */
function freeEndTW(x) {
  if (!x.end) return '';
  const t = new Date(Date.parse(x.end) + 8 * 3600e3);
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WK[t.getUTCDay()]}）${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}
const freeOrig = (x) => x.orig_t || (x.orig ? fmtNT(x.orig) : '');
const freeZh = (z) => (z === 'tc' ? '有繁體中文' : z === 'sc' ? '只有簡體中文' : z === 'none' ? '沒有中文' : '');
/* 貼文：數字全部來自 free.json（GitHub Actions 每小時抓 Epic、Steam、GOG），沒有的那一行就不寫 */
function freeTpl(x) {
  const st = STORE_N[x.store] || x.store; const end = freeEndTW(x); const orig = freeOrig(x); const zh = freeZh(x.zh);
  const facts = [
    x.rv && x.rv[0] != null ? `・Steam 評價：${x.rv[0]}% 好評（${Number(x.rv[1] || 0).toLocaleString('zh-TW')} 則）` : '',
    zh ? `・中文：${zh}` : '',
    (x.tags || []).length ? `・類型：${x.tags.slice(0, 3).join('、')}` : '',
  ].filter(Boolean);
  const head = `${st} 限時免費：《${x.title}》${orig ? `原價 ${orig}，` : ''}現在免費領`;
  const when = end ? `領取期限：${end} 前（台灣時間），領了就永久留在帳號裡` : '領了就永久留在帳號裡（期限以商店頁為準）';
  const ask = '領了沒？你會馬上開來玩，還是先收進庫存？';
  const threads = [head, when, facts.join('\n'), ask].filter(Boolean).join('\n\n');
  const post = [head, when, facts.join('\n'), `到 ${st} 商店頁搜尋遊戲名稱就能領；領之前記得先登入帳號。`, ask].filter(Boolean).join('\n\n');
  const tags = ['#限時免費', '#免費遊戲', '#' + st, ...(x.store === 'epic' ? ['#Epic喜加一'] : []), BRAND_TAG];
  return { threads, post, topic: '免費遊戲', tags: [...new Set(tags)] };
}
/* 圖卡：限免專用（黃牆撕紙框＋限免章） */
function freeCardF(x) {
  const st = STORE_N[x.store] || x.store; const zh = freeZh(x.zh);
  const pts = [
    x.end ? { h: '領取期限', t: freeEndTW(x) + ' 前' } : null,
    x.rv && x.rv[0] != null ? { h: 'Steam 評價', t: `${x.rv[0]}% 好評（${Number(x.rv[1] || 0).toLocaleString('zh-TW')} 則）` } : null,
    zh ? { h: '中文', t: zh } : null,
  ].filter(Boolean);
  return {
    id: 'x-' + hashStr(x.id), game: { zh: x.title, en: (st + ' FREE').toUpperCase(), steam: x.appid || null },
    verdict: { stamp: '限免', label: '領了就是你的' }, media: { yt: [], images: x.img ? [x.img] : [] },
    fanpage: { credit: `圖片來源：${st} 商店頁`, card: { kicker: `${st} 限時免費`, title: titleLines(x.title), sub: freeOrig(x) ? `原價 ${freeOrig(x)}・現在 0 元` : '現在 0 元領', tags: (x.tags || []).slice(0, 3).map((t) => t.slice(0, 6)), points: pts, image: x.img || '' } },
  };
}

/* ---- 推坑 ---- */
/* 推坑排程沒寫 fanpage 時（2026-11-19 以前的推坑）：照推坑內容排成 Threads 稿＋一則串文延伸 */
function pickThreadsAuto(p) {
  const g = p.game || {}; const rs = (p.reasons || []).slice(0, 3);
  const zh = p.zh && (p.zh.ui || p.zh.sub) ? '有繁體中文' : '';
  const hook = `${p.stamp ? `【${p.stamp}】` : ''}《${g.zh}》${p.label ? `：${p.label}` : ''}`;
  const facts = [g.year ? `・${g.year} 年上市，${(g.genres || []).slice(0, 2).join('、')}` : '', p.time && p.time.text ? `・遊玩時間：${p.time.text}` : '', zh ? `・中文：${zh}` : ''].filter(Boolean);
  const ask = (p.talk && p.talk[0] && p.talk[0].q) || '玩過的說說：你卡最久的是哪裡？';
  const post = [hook, p.pitch, facts.join('\n'), ask].filter(Boolean).join('\n\n');
  const more = rs.length ? [`為什麼推它：\n${rs.map((r) => `・${r.h}：${r.t}`).join('\n')}`] : [];
  return { post, topic: '遊戲推薦', more };
}
function pickTagsAuto(p) {
  const g = p.game || {}; const name = '#' + String(g.zh || g.en || '').replace(/[\s#：:・,，、!！?？'’.。-]/g, '');
  const gen = (g.genres || []).slice(0, 2).map((x) => '#' + String(x).replace(/[\s#／/]/g, ''));
  return [...new Set([name, ...gen, '#遊戲推薦', BRAND_TAG])].filter((t) => t.length > 1);
}
/* 圖卡：推坑寫了 fanpage.card 就用，沒有就照推坑理由排三張紙條 */
function pickCardF(p) {
  const g = p.game || {}; const fp = p.fanpage || {}; const cd = fp.card || {};
  return {
    id: 'p-' + p.id, game: { zh: g.zh, en: g.en || g.zh, steam: g.steam || null }, media: p.media || { yt: [], images: [] },
    verdict: { stamp: p.stamp || '推坑', label: (p.label || '').length <= 9 ? p.label || '' : '' },
    fanpage: {
      credit: fp.credit || `圖片來源：${g.zh} 官方商店頁與預告`,
      card: {
        kicker: cd.kicker || `私房推坑｜${g.year || ''} 年作品`.replace('｜ 年作品', ''),
        title: cd.title || titleLines(g.zh),
        sub: cd.sub || (p.label || p.pitch || '').slice(0, 18),
        tags: cd.tags || (g.genres || []).slice(0, 3).map((t) => String(t).slice(0, 6)),
        points: cd.points || (p.reasons || []).slice(0, 3).map((r) => ({ h: String(r.h).slice(0, 8), t: r.t })),
        image: cd.image || '',
      },
    },
  };
}

/* ---- 每日三件事（只顧 Threads 時，今日任務最上面） ---- */
const DQ = [
  { k: 'post', t: '發今天這一篇', s: '照今日任務發；按「發好了」會自動打勾' },
  { k: 'reply', t: '回完每一則留言', s: '發文後一小時內最重要' },
  { k: 'patrol', t: '海巡 10 分鐘', s: '到 3～5 篇別人的遊戲串文留有內容的留言' },
];
const dqPosted = (d) => S.ops.log.some((l) => l.d === d && l.pf === 'th');
const dqOn = (d, k) => (k === 'post' && dqPosted(d)) || !!((S.ops.dq[d] || {})[k]);
const dqAll = (d) => DQ.every((q) => dqOn(d, q.k));
function dqStreak() { let d = todayTW(); if (!dqAll(d)) d = addD(d, -1); let n = 0; while (dqAll(d) && n < 400) { n++; d = addD(d, -1); } return n; }
function dqHtml() {
  if (!thOnly()) return '';
  const d = todayTW(); const n = DQ.filter((q) => dqOn(d, q.k)).length; const st = dqStreak();
  return `<section class="dq ${n === DQ.length ? 'all' : ''}"><div class="dq-h"><b>每日三件事</b><span>${n === DQ.length ? '今天全勤！' : `${n}／${DQ.length}`}</span>${st ? `<em>全勤 ${st} 天</em>` : ''}</div>
    <div class="dq-l">${DQ.map((q, i) => `<button class="dq-i ${dqOn(d, q.k) ? 'on' : ''}" data-act="opdq" data-k="${q.k}" style="--i:${i}"><i>${dqOn(d, q.k) ? '✓' : i + 1}</i><b>${esc(q.t)}</b><small>${esc(q.s)}</small></button>`).join('')}</div></section>`;
}

/* ---- 加碼：限免快訊（今天就能發，不佔固定時段） ---- */
function extraHtml() {
  const posted = new Set(S.ops.log.map((l) => l.ref));
  const L = freeNow().filter((x) => !posted.has('x:' + x.id)).slice(0, 3);
  if (!L.length) return '';
  const pf = opsPfs()[0];
  const card = (x) => {
    const ms = x.end ? Date.parse(x.end) - Date.now() : null; const h = ms != null ? Math.floor(ms / 3600e3) : null;
    const left = h == null ? '' : h < 24 ? `剩 ${Math.max(1, h)} 小時` : `剩 ${Math.floor(h / 24)} 天`;
    const go = 'fan/~do:' + encodeURIComponent('x:' + x.id) + '|' + pf;
    return `<article class="msn xtra" style="--rot:${rot(x.id, 2, 0.8)}deg"><div class="m-pf"><span class="kchip k-x">限免</span><b class="xs">${esc(STORE_N[x.store] || x.store)}</b>${h != null && h < 24 ? '<em class="hot">快結束</em>' : ''}<span class="m-st">${esc(left)}</span></div>
      <div class="m-c" data-go="${go}"><div class="m-img" ${x.img ? `style="background-image:url('${esc(x.img)}')"` : ''}></div><div class="m-t"><h4>${esc(x.title)}</h4><p>${esc(x.end ? `領到 ${freeEndTW(x)}・` : '')}${esc(freeOrig(x) ? '原價 ' + freeOrig(x) : '免費領')}</p></div></div>
      <div class="m-b"><button class="btn p" data-go="${go}">${ICON.mega}<span>發限免快訊</span></button></div></article>`;
  };
  return `<h3 class="tape-h p">加碼・限免快訊 <small>領完就沒了，越早發越好</small></h3><p class="sub-note">不佔今天的時段：大家最愛收藏、轉傳的就是這種「現在就能拿」的情報。文字照 App 每小時抓的商店資料排好，發之前看一眼。</p><div class="msns">${L.map(card).join('')}</div>`;
}

/* ---- 平台階段 ---- */
function opsModeNote() {
  if (S.ops.mode === 'all') return '';
  return `<div class="mnote" data-go="fan/~learn"><b>${thOnly() ? '現在只排 Threads' : '現在排 Threads 和 IG'}</b><span>${thOnly() ? 'IG、FB 等 Threads 穩定再開：到「教學」開第二、三階段，排程會自動加上去。' : 'FB 粉專等 IG 也穩定再開：到「教學」開第三階段。'}</span><em>教學 ›</em></div>`;
}
async function opsThAct(a, act) {
  if (a === 'opdq') {
    const d = todayTW(); const k = act.dataset.k; const o = S.ops.dq[d] = Object.assign({}, S.ops.dq[d]);
    if (k === 'post' && dqPosted(d)) { toast('今天已經發過了，這一格會自己打勾'); return true; }
    if (o[k]) delete o[k]; else { o[k] = 1; sfx.stamp(); haptic(20); burstAt(act, [YEL, PINK, BLK], 14, 8); }
    const lim = addD(d, -60); for (const x of Object.keys(S.ops.dq)) if (x < lim) delete S.ops.dq[x];
    opsSave();
    if (dqAll(d) && o[k]) setTimeout(() => { sfx.fanfare(); toast(`今天三件事都做到了！全勤 ${dqStreak()} 天`); if (fxOn()) burst(innerWidth / 2, innerHeight / 3, [PINK, YEL, BLK], 40, 14); }, 180);
    const box = act.closest('.dq'); if (box) box.outerHTML = dqHtml();
    return true;
  }
  if (a === 'opmode') {
    const v = act.dataset.v; if (!OPS_MODES[v] || v === S.ops.mode) return true;
    S.ops.mode = v; opsSave(); sfx.slap(); haptic(20);
    toast(v === 'th' ? '改成只顧 Threads：今日任務、排程、成效只算 Threads' : v === 'thig' ? '第二階段開啟：之後 IG 會跟 Threads 排在一起' : '第三階段開啟：三個平台一起排');
    setTabs('fan'); const y = scrollY; await route(); scrollTo(0, y); return true;
  }
  return false;
}
/* 「帶到 Threads」是一般連結（讓手機用 App 打開），點下去只補音效、把那一步打勾 */
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a.thgo'); if (!a) return;
  sfx.ding(); haptic(15);
  const st = a.closest('.step'); if (st && !st.classList.contains('ok')) { const b = st.querySelector('[data-act="opstep"]'); if (b) { OPS.steps.add(b.dataset.key); st.classList.add('ok'); } }
});
