/* 觀戰 — 2026/11/18 超級大更新：開場「今晚節目單」、每日「破圈任務」
   - 今晚節目單：ON AIR 之後、斜帶轉場之前，像賽前節目的對戰卡：今晚新片、你的頻道新片、新預告（真實數字），加上三款焦點遊戲。
   - 破圈任務：痞子葳做這個 App 的起因就是不想被演算法綁在同幾台（資訊繭房）。每天三個小任務，全部在鼓勵「看沒看過的」：
     新頻道、沒看過的遊戲、深度內容……完成拿經驗、升轉播員等級、連續天數。
     只看這台裝置上的觀看紀錄（HIST、WT），不上傳、不拿來推片（觀戰本來就不照觀看紀錄推片）。 */

/* ---------- 今晚節目單（開場） ---------- */
function matchCard() {
  if (!D.feed) return null;
  const day = 86400;
  const fresh = baseList().filter((it) => nowS() - it.p < day && it.lv !== 'upcoming');
  const zh = fresh.filter(zf).length;
  const mine = subsOn() ? L.subs().filter((it) => nowS() - it.p < day).length : null;
  const trailers = fresh.filter((it) => it.l === 'trailer').length;
  const games = gamesList().slice(0, 3);
  if (!fresh.length && !games.length) return null;
  return { n: fresh.length, zh, mine, trailers, games };
}
function matchCardHtml(mc) {
  const d = new Date();
  const stat = (n, t, cls = '') => `<div class="mc-s ${cls}"><b data-to="${n}">0</b><span>${esc(t)}</span></div>`;
  return `<div class="mc">
    <div class="mc-top"><span class="mc-tag">MATCH DAY</span><b>今晚節目單</b><span class="mc-date">${d.getMonth() + 1}/${d.getDate()}・${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}</span></div>
    <div class="mc-stats">${stat(mc.n, '24 小時新片')}${stat(mc.zh, '其中中文', 'zh')}${mc.mine != null ? stat(mc.mine, '你的頻道新片', 'me') : stat(mc.trailers, '新預告')}</div>
    ${mc.games.length ? `<div class="mc-vs-h">焦點對戰・今晚最多台在聊</div><div class="mc-teams n${mc.games.length}">${mc.games.map((g, i) => {
      const yt = g.cover ? thumb(g.cover, 'mqdefault') : ''; const img = g.img || yt;
      return `<div class="mc-team" style="--i:${i}"><span class="mc-img">${img ? `<img src="${esc(img)}" alt="" ${g.img && yt ? `onerror="this.onerror=null;this.src='${yt}'"` : 'onerror="this.remove()"'}>` : ''}<i>${String(i + 1).padStart(2, '0')}</i></span><b>${esc(gameName(g))}</b><span>${g.chs || 0} 台在聊 · ${g.n || 0} 支</span></div>`;
    }).join('')}</div>` : ''}
  </div>`;
}
/** ON AIR 之後播節目單（約 2.6 秒），回傳 Promise；沒有資料就直接過 */
function playMatchCard(gate) {
  const mc = matchCard();
  if (!mc) return Promise.resolve();
  return new Promise((res) => {
    const box = document.createElement('div');
    box.className = 'mc-wrap';
    box.innerHTML = matchCardHtml(mc);
    gate.appendChild(box);
    gate.classList.add('carded');
    requestAnimationFrame(() => box.classList.add('in'));
    Snd.play('impact');
    $$('.mc-s b', box).forEach((b, i) => setTimeout(() => { Fx.count(b, +b.dataset.to, 700); Snd.play('stat'); }, 260 + i * 140));
    $$('.mc-team', box).forEach((t, i) => setTimeout(() => { t.classList.add('in'); Snd.play('take'); }, 820 + i * 260));
    const skip = () => { gate.removeEventListener('click', skip); clearTimeout(tm); res(); };
    const tm = setTimeout(skip, 1500 + mc.games.length * 260 + 500);
    gate.addEventListener('click', skip);
  });
}

/* ---------- 破圈任務 ---------- */
const Q_POOL = {
  rookie: { t: '新秀試鏡', d: '看一個你還沒訂閱的頻道滿 2 分鐘', g: 'break' },
  newgame: { t: '沒看過的遊戲', d: '看一支你以前沒看過的遊戲的片滿 2 分鐘', g: 'break' },
  variety: { t: '換台三連', d: '今天看 3 個不同的頻道（每台至少 1 分鐘）', g: 'break' },
  deep: { t: '深度時間', d: '看一支深度或評測滿 3 分鐘', g: 'depth' },
  finish: { t: '看到最後', d: '完整看完一支影片（看到 9 成以上）', g: 'depth' },
  trailer: { t: '預告巡禮', d: '看 3 支不同的預告（每支至少 30 秒）', g: 'fun' },
  news: { t: '情報員', d: '看 2 支新聞或節目（每支至少 1 分鐘）', g: 'fun' },
};
const Q_XP = 100, Q_BONUS = 100;
const Q_TITLES = [[0, '見習觀眾'], [300, '場邊觀眾'], [900, '轉播助理'], [1800, '現場導播'], [3000, '主播'], [4500, '總導播'], [6300, '傳奇評論席']];
const QST = store.get('quest', { xp: 0, days: {} });   // days: { 'YYYY-MM-DD': [完成的任務 id] }
function saveQ() { store.set('quest', QST); }
/** 今天的三個任務：每組各挑一個，照日期決定（同一天打開幾次都一樣） */
function questsOf(dk = dayKey()) {
  const rnd = seeded(hash32('q' + dk));
  const pick = (g) => { const ids = Object.keys(Q_POOL).filter((k) => Q_POOL[k].g === g); return ids[Math.floor(rnd() * ids.length)]; };
  return [pick('break'), pick('depth'), pick('fun')];
}
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 每個任務現在的進度 { id, t, d, now, need, done } —— 只用這台裝置的觀看紀錄 */
function questProgress(dk = dayKey()) {
  const t0 = dayStart();
  const wt = WT[dk] || {};
  const today = Object.entries(HIST).filter(([, h]) => h[0] >= t0).map(([v, h]) => ({ v, h, it: IDX.byId.get(v) }));
  const before = new Set(Object.entries(HIST).filter(([, h]) => h[0] < t0).map(([v]) => (IDX.byId.get(v) || {}).g).filter(Boolean));
  const ms = (x) => x.h[4] || 0;
  const cnt = {
    rookie: () => [Object.entries(wt).some(([c, m]) => !VIEW.subs[c] && m >= 120e3) ? 1 : 0, 1],
    newgame: () => [today.some((x) => x.it && x.it.g && !before.has(x.it.g) && ms(x) >= 120e3) ? 1 : 0, 1],
    variety: () => [Math.min(3, Object.values(wt).filter((m) => m >= 60e3).length), 3],
    deep: () => [today.some((x) => x.it && (x.it.l === 'deep' || x.it.l === 'review') && ms(x) >= 180e3) ? 1 : 0, 1],
    finish: () => [today.some((x) => x.h[3]) ? 1 : 0, 1],
    trailer: () => [Math.min(3, today.filter((x) => x.it && x.it.l === 'trailer' && ms(x) >= 30e3).length), 3],
    news: () => [Math.min(2, today.filter((x) => x.it && x.it.l === 'news' && ms(x) >= 60e3).length), 2],
  };
  return questsOf(dk).map((id) => { const [now, need] = cnt[id](); return { id, ...Q_POOL[id], now, need, done: now >= need }; });
}
function levelOf(xp) {
  let i = 0; while (i + 1 < Q_TITLES.length && xp >= Q_TITLES[i + 1][0]) i++;
  const [base, title] = Q_TITLES[i], next = Q_TITLES[i + 1];
  return { lv: i + 1, title, base, next: next ? next[0] : null, pct: next ? (xp - base) / (next[0] - base) : 1 };
}
function streakOf() {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const k = dayKey(Date.now() - i * 86400e3); const d = QST.days[k] || [];
    if (d.length >= 3) n++; else if (i === 0) continue; else break;   // 今天還沒做完不算斷
  }
  return n;
}
/** 看完片回來時檢查：新完成的任務發經驗、跳字卡 */
function questCheck(quiet = false) {
  const dk = dayKey();
  const got = QST.days[dk] || [];
  const ps = questProgress(dk);
  const fresh = ps.filter((q) => q.done && !got.includes(q.id));
  if (!fresh.length) return;
  QST.days[dk] = got.concat(fresh.map((q) => q.id));
  let add = fresh.length * Q_XP;
  const all = QST.days[dk].length >= 3;
  if (all) add += Q_BONUS;
  const lv0 = levelOf(QST.xp).lv;
  QST.xp += add;
  const ks = Object.keys(QST.days).sort(); ks.slice(0, Math.max(0, ks.length - 60)).forEach((k) => delete QST.days[k]);
  saveQ();
  if (quiet) return;
  const up = levelOf(QST.xp);
  setTimeout(() => {
    Snd.play('sub');
    Fx.lowerThird(all ? '今日破圈任務全部完成！' : `任務完成：${fresh.map((q) => q.t).join('、')}`, `+${add} XP${up.lv > lv0 ? `・升級「${up.title}」` : ''}${all ? `・連續 ${streakOf()} 天` : ''}`, 4200);
    if (!Fx.lite()) Fx.burst(innerWidth / 2, innerHeight * 0.72, ['#ff2d55', '#ffc229', '#22e3a0', '#ffffff']);
  }, 400);
}
const Q_ICON = { break: '◎', depth: '◆', fun: '▶' };
/** 首頁的一條：今天三個任務的進度 */
function questStripHtml() {
  const ps = questProgress();
  const done = ps.filter((q) => q.done).length;
  const lv = levelOf(QST.xp);
  return `<a class="qs" href="#me" data-qs="1"><span class="qs-tag">破圈任務</span><span class="qs-list">${ps.map((q) => `<i class="qs-q ${q.done ? 'ok' : ''}" title="${esc(q.d)}"><em>${Q_ICON[q.g]}</em>${esc(q.t)}<b>${q.done ? '✓' : `${q.now}/${q.need}`}</b></i>`).join('')}</span><span class="qs-lv">Lv.${lv.lv}<small>${done}/3</small></span></a>`;
}
/** 我的：完整的任務卡 */
function questPanelHtml() {
  const ps = questProgress();
  const lv = levelOf(QST.xp);
  const st = streakOf();
  const week = Array.from({ length: 7 }, (_, i) => { const k = dayKey(Date.now() - (6 - i) * 86400e3); const n = (QST.days[k] || []).length; return `<i class="qw-d n${Math.min(3, n)}" title="${k}：${n}/3"><b>${k.slice(5).replace('-', '/')}</b></i>`; }).join('');
  return `<section class="sec qp" id="quests">${secHead('破圈任務', 'DAILY MISSIONS')}
    <div class="qp-card">
      <div class="qp-lv"><span class="qp-badge"><b>${lv.lv}</b><small>LV</small></span><span class="qp-t"><b>${esc(lv.title)}</b><span>${QST.xp} XP${lv.next ? `・再 ${lv.next - QST.xp} 升級` : '・最高等級'}</span><i class="qp-bar"><i style="--p:${Math.round(lv.pct * 100)}%"></i></i></span><span class="qp-st"><b>${st}</b><small>連續天數</small></span></div>
      <div class="qp-list">${ps.map((q, i) => `<div class="qp-q ${q.done ? 'ok' : ''}" style="--i:${i}"><span class="qp-ic">${Q_ICON[q.g]}</span><span class="qp-qt"><b>${esc(q.t)}</b><span>${esc(q.d)}</span><i class="qp-pb"><i style="--p:${Math.round(100 * q.now / q.need)}%"></i></i></span><span class="qp-qs">${q.done ? '<b class="qp-ok">完成</b>' : `<b>${q.now}/${q.need}</b>`}<small>+${Q_XP} XP</small></span></div>`).join('')}</div>
      <div class="qp-week">${week}</div>
      <p class="note">三個都完成再加 ${Q_BONUS} XP。任務每天換一組，全部在鼓勵「看沒看過的」：新頻道、沒看過的遊戲、深度內容。只看這台裝置的觀看紀錄，不會上傳，也不會拿來推片。</p>
    </div></section>`;
}
