/* 解包 — 出擊日曆：上市日（專題、願望單）、特價截止（願望單、解包過的）、下週出擊（週報）排成日程。
   每一筆都能加進手機行事曆（.ics）；也能訂閱 data/calendar.ics（GitHub Actions 每小時重算），之後自動更新。 */
const CAL_URL = 'https://pzwei0105.github.io/PZ-Games/apps/unpacked/data/calendar.ics';
const CAL_TYPE = { rel: ['上市', 'y'], end: ['特價截止', 'p'], next: ['下週出擊', 'w'], sale: ['大特賣', 's'], fest: ['活動', 'c'], show: ['頒獎典禮', 'g'], vote: ['投票截止', 'g'], free: ['免費截止', 'f'] };

const CAL_END_CAP = 6;
function twDate(ms) { return new Date(ms + 8 * 3600e3).toISOString().slice(0, 10); }
function calEvents() {
  const today = todayTW(); const out = []; const seen = new Set(); const refs = steamRefs();
  const add = (e) => { const k = e.type + ':' + (e.appid || e.key2 || e.name) + ':' + e.d; if (seen.has(k)) return; seen.add(k); out.push(e); };
  for (const it of (S.index && S.index.items) || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.release || '') || it.release < today) continue;
    add({ type: 'rel', d: it.release, name: it.zh, appid: it.steam, img: headerOf(it), route: 'f/' + it.id, sub: (it.platforms || []).map(PLAT_SHORT).slice(0, 3).join('／') });
  }
  for (const w of (S.wish && S.wish.items) || []) {
    if (w.adult) continue;
    const r = refs[String(w.appid)]; const name = r ? r.it.zh : w.name;
    if (w.rel && w.rel.soon && /^\d{4}-\d{2}-\d{2}$/.test(w.rel.date || '') && w.rel.date >= today) add({ type: 'rel', d: w.rel.date, name, appid: w.appid, img: w.img, route: r && r.route, key: String(w.appid), sub: '你的願望單' });
    if (w.sale && w.sale.end && Date.parse(w.sale.end) > Date.now()) add({ type: 'end', d: twDate(Date.parse(w.sale.end)), at: w.sale.end, name, appid: w.appid, img: w.img, key: String(w.appid), sub: `${w.p[2] >= 100 ? '限時免費' : `-${w.p[2]}%・${fmtNT(w.p[0])}`}・最後到 ${endDate(w.sale.end).split(' ')[1]}` });
  }
  // 解包過的特價截止：同一天最多 CAL_END_CAP 款（我想玩的一定列、再來折扣大的），其他併成一筆——大特賣時才不會洗版
  const ends = {};
  for (const [a, lv] of Object.entries((S.live && S.live.apps) || {})) {
    const pr = lv.price; const r = refs[a];
    if (!r || !pr || !(pr.disc > 0) || !pr.end || Date.parse(pr.end) <= Date.now()) continue;
    const d = twDate(Date.parse(pr.end));
    if (seen.has('end:' + a + ':' + d)) continue;
    (ends[d] = ends[d] || []).push({ a, lv, pr, r, want: S.marks[r.it.id] === 'want' });
  }
  for (const [d, rows] of Object.entries(ends)) {
    rows.sort((x, y) => (y.want - x.want) || (y.pr.disc - x.pr.disc));
    const keep = rows.filter((x, i) => x.want || i < CAL_END_CAP);
    for (const { a, lv, pr, r } of keep) add({ type: 'end', d, at: pr.end, name: r.it.zh, appid: +a, img: headerOf(r.it, lv), route: r.route, sub: `-${pr.disc}%・${fmtNT(pr.final)}・最後到 ${endDate(pr.end).split(' ')[1]}` });
    const more = rows.filter((x) => !keep.includes(x));
    if (more.length) add({ type: 'end', d, at: more[0].pr.end, name: `還有 ${more.length} 款解包過的遊戲`, key2: 'more' + d, sub: more.slice(0, 6).map((x) => x.r.it.zh).join('、') + (more.length > 6 ? '…' : '') });
  }
  // 大特賣、新品節、TGA（官方日期）；免費補給站的截止（最後一晚＝結束前 3 小時那天）
  const lastDay = (iso) => twDate(Date.parse(iso) - 3 * 36e5);
  for (const e of evList()) {
    if (!e.start) continue;
    if (e.kind === 'sale') {
      if (twDate(Date.parse(e.start)) >= today) add({ type: 'sale', d: twDate(Date.parse(e.start)), name: e.name + ' 開打', route: 'hunt', key2: e.id + 's', sub: `${twWhen(e.start)} 開始${e.end ? `・到 ${twWhen(e.end)}` : ''}` });
      if (e.end && lastDay(e.end) >= today) add({ type: 'sale', d: lastDay(e.end), name: e.name + ' 最後一晚', route: 'hunt', key2: e.id + 'e', sub: `${twWhen(e.end)} 結束` });
    } else if (e.kind === 'fest' && e.big && twDate(Date.parse(e.start)) >= today) add({ type: 'fest', d: twDate(Date.parse(e.start)), name: e.name, route: 'hunt', key2: e.id, sub: `${e.note ? e.note + '・' : ''}${twWhen(e.start)} 開始` });
    else if ((e.kind === 'show' || e.kind === 'vote') && twDate(Date.parse(e.start)) >= today) add({ type: e.kind, d: twDate(Date.parse(e.start)), name: e.name, route: e.route || 'tga', key2: e.id, sub: `台灣時間 ${twWhen(e.start)}${e.kind === 'vote' ? ' 截止' : ' 開播'}${e.note ? '・' + e.note : ''}` });
  }
  for (const x of freeNow()) if (x.end && !x.mystery && lastDay(x.end) >= today) add({ type: 'free', d: lastDay(x.end), name: x.title, img: x.img, route: 'hunt', key2: x.id, sub: `${(STORE[x.store] || [''])[0]} 限時免費・${twWhen(x.end)} 截止` });
  const wk = latestWeek(); const wf = wk && S.weekF && S.weekF[wk.id];
  for (const n of (wf && wf.next) || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.d) || n.d < today) continue;
    const r = n.ref && wkRef(n.ref);
    if (r && out.some((e) => e.type === 'rel' && e.route === r.route)) continue;
    add({ type: 'next', d: n.d, name: n.name, img: r ? headerOf(r.it) : '', route: r && r.route, sub: n.t });
  }
  return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.type === 'end' ? -1 : 1));
}
const wdOf = (d) => WK[new Date(d + 'T00:00:00Z').getUTCDay()];
function dLabel(d) { const n = dayDiff(todayTW(), d); return n === 0 ? '今天' : n === 1 ? '明天' : 'D-' + n; }

async function renderCal() {
  const wk = latestWeek(); if (wk) { try { await loadWeek(wk.id); } catch (e) { /* 沒有週報也行 */ } }
  const ev = calEvents(); S.calEv = ev;
  const today = todayTW();
  const next = ev.find((e) => e.type === 'rel') || ev[0];
  // 近五週的日程格（從這週一開始）
  const t = new Date(today + 'T00:00:00Z'); const mon = new Date(+t - ((t.getUTCDay() + 6) % 7) * 864e5);
  const days = [...Array(35)].map((_, i) => new Date(+mon + i * 864e5).toISOString().slice(0, 10));
  const byDay = {}; ev.forEach((e, i) => { (byDay[e.d] = byDay[e.d] || []).push(i); });
  const grid = `<div class="cgrid">${['一', '二', '三', '四', '五', '六', '日'].map((w) => `<b class="cw">${w}</b>`).join('')}${days.map((d) => {
    const es = byDay[d] || []; const past = d < today;
    return `<button class="cd ${d === today ? 'today' : ''} ${past ? 'past' : ''} ${es.length ? 'has' : ''}" ${es.length ? `data-act="cday" data-d="${d}"` : ''}><span>${+d.slice(8)}</span>${es.slice(0, 3).map((i) => `<i class="c-${CAL_TYPE[ev[i].type][1]}"></i>`).join('')}</button>`;
  }).join('')}</div>`;
  const groups = []; ev.forEach((e, i) => { const g = groups[groups.length - 1]; if (g && g.d === e.d) g.i.push(i); else groups.push({ d: e.d, i: [i] }); });
  return `<div class="sec-h"><h2 class="spray-h y">出擊日曆</h2><span class="date-stk">LAUNCH CAL</span></div>
    <p class="sub-note">解包過的上市日、你願望單的上市日和特價截止、Steam 大特賣、免費遊戲截止、TGA、週報的下週出擊，全部排在一起。資料每小時更新。</p>
    ${next ? `<section class="cnext" ${next.route ? `data-go="${esc(next.route)}"` : next.key ? `data-act="hinfo" data-k="${esc(next.key)}"` : ''}><div class="cn-img">${next.img ? `<img src="${esc(next.img)}" alt="" onerror="imgFail(this)">` : ''}<div class="ht"></div></div>
      <div class="cn-d"><b>${esc(dLabel(next.d))}</b><span>${esc(mdDay(next.d))}（${wdOf(next.d)}）</span></div><div class="cn-b"><span class="cn-k">下一個${CAL_TYPE[next.type][0]}</span><h3>${esc(next.name)}</h3><p>${esc(next.sub || '')}</p></div></section>` : ''}
    <div class="csub"><div><b>${ICON.cal}訂閱到手機行事曆</b><span>訂閱一次，上市日和特價截止會自動出現在 iPhone 行事曆，之後每小時跟著更新。</span></div>
      <div class="btnrow"><a class="btn y sm" href="${CAL_URL.replace('https://', 'webcal://')}">${ICON.cal}<span>訂閱</span></a><button class="btn sm" data-act="calcopy">${ICON.copy}<span>複製訂閱網址</span></button>${ev.length ? `<button class="btn sm" data-act="calall">${ICON.dl}<span>全部加入一次</span></button>` : ''}</div></div>
    ${grid}
    <div class="clegend"><i class="c-y"></i>上市<i class="c-p"></i>特價截止<i class="c-s"></i>大特賣<i class="c-f"></i>免費截止<i class="c-g"></i>TGA<i class="c-c"></i>新品節<i class="c-w"></i>下週出擊</div>
    ${groups.length ? `<div class="clist">${groups.map((g) => `<div class="cg" id="cd-${g.d}"><div class="cg-d ${g.d === today ? 'today' : ''}"><b>${esc(mdDay(g.d))}</b><span>週${wdOf(g.d)}</span><em>${esc(dLabel(g.d))}</em></div><div class="cg-l">${g.i.map((i) => { const e = ev[i]; return `<div class="ce" ${e.route ? `data-go="${esc(e.route)}"` : e.key ? `data-act="hinfo" data-k="${esc(e.key)}"` : ''}><span class="ce-t c-${CAL_TYPE[e.type][1]}">${CAL_TYPE[e.type][0]}</span><div class="ce-b"><h4>${esc(e.name)}</h4>${e.sub ? `<p>${esc(e.sub)}</p>` : ''}</div><button class="ce-add" data-act="caladd" data-i="${i}" aria-label="加入行事曆">${ICON.cal}</button></div>`; }).join('')}</div></div>`).join('')}</div>`
      : '<div class="empty">接下來沒有排定的上市或特價截止。專題、願望單、週報有新的日期就會自動出現。</div>'}`;
}
function calFx() {
  const n = $('.cnext'); if (n && fxOn()) { setTimeout(() => { sfx.stamp(); burstAt($('.cn-d b', n), [YEL, PINK, BLK], 18, 9); }, 300); }
  $$('.cd.has').forEach((c, i) => { c.style.setProperty('--i', i); });
}

/* ---- .ics：一筆或全部（全天事件；特價截止放在當天） ---- */
function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n'); }
function icsFold(line) {
  const enc = new TextEncoder(); const out = []; let cur = '', n = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (n + b > 73) { out.push(cur); cur = ' '; n = 1; } cur += ch; n += b; }
  out.push(cur); return out.join('\r\n');
}
function icsOf(list) {
  const d8 = (d) => d.replace(/-/g, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UNPACKED//Launch Calendar//ZH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of list) {
    const nx = new Date(Date.parse(e.d + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
    L.push('BEGIN:VEVENT', `UID:unpacked-${e.type}-${e.appid || (e.key2 ? String(e.key2).replace(/[^A-Za-z0-9]+/g, '') : hashStr(e.name))}-${d8(e.d)}@pzwei0105.github.io`, `DTSTAMP:${d8(e.d)}T000000Z`,
      `DTSTART;VALUE=DATE:${d8(e.d)}`, `DTEND;VALUE=DATE:${d8(nx)}`, icsFold(`SUMMARY:${icsEsc(CAL_TYPE[e.type][0] + '｜' + e.name)}`),
      icsFold(`DESCRIPTION:${icsEsc((e.sub || '') + '\n解包 UNPACKED')}`), `URL:https://pzwei0105.github.io/PZ-Games/apps/unpacked/${e.route ? '#' + e.route : '#hunt'}`, 'END:VEVENT');
  }
  L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
}
async function calSave(list, name) {
  const blob = new Blob([icsOf(list)], { type: 'text/calendar' }); const u = URL.createObjectURL(blob);
  if (IOS) { location.href = u; setTimeout(() => URL.revokeObjectURL(u), 60e3); return; }   // iPhone 直接開成「加入行事曆」畫面
  const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
