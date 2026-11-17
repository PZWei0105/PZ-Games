/* 畫面：出發（翻牌看板）、登機證、機庫（檢修報告＋機隊）、手冊、機長室 */
const D = { index: null, days: {}, fleet: null, fleetBy: {}, manual: null, ruleBy: {}, view: null, inboxAt: '' };

const STATUS = {
  boarding: ['登機中', 'BOARDING'], ontime: ['準時', 'ON TIME'], board: ['已登機', 'BOARDED'], delay: ['延誤', 'DELAYED'], cancel: ['取消', 'CANCELLED'],
  service: ['待簽派', 'PENDING'], working: ['檢修中', 'IN SERVICE'], done: ['已簽派', 'DISPATCHED'],
};
function stHtml(k) { const s = STATUS[k]; return '<span class="st ' + k + '">' + s[0] + ' <i>' + s[1] + '</i></span>'; }
function flightState(f, date) { const v = S.votes[f.id]; if (v) return v.v; return date === D.index.latest ? 'boarding' : 'ontime'; }
function hangarState(ins) {
  if (!ins) return 'service';
  if (S.dispatched[ins.id]) return 'done';
  const it = S.items[ins.id]; return it && Object.keys(it).length ? 'working' : 'service';
}
function latestInspection() {
  for (const d of D.index.days) if (d.hangar) return d;
  return null;
}
function findFlight(id) {
  for (const k in D.days) { const f = (D.days[k].flights || []).find((x) => x.id === id); if (f) return { f, day: D.days[k] }; }
  if (S.flights[id]) return { f: S.flights[id], day: { date: S.flights[id]._date || id.slice(0, 10) } };
  return null;
}
function ruleOf(id) { return D.ruleBy[id] || null; }
function lanes(f) { return 'lane-' + f.lane; }

/* ---------- 出發 ---------- */
function renderDep(date) {
  const el = $('#v-dep');
  const latest = D.index.latest;
  const want = date || latest;
  const meta = D.index.days.find((d) => d.date === want) || D.index.days[0];
  if (!meta) { el.innerHTML = '<div class="empty" style="margin-top:20px">航廈還沒開張：第一班航班還在路上。</div>'; return; }
  const day = D.days[meta.date];
  if (!day) { el.innerHTML = '<div class="empty" style="margin-top:20px">讀取航班中…</div>'; App.loadDay(meta.date).then(() => renderDep(want)); return; }
  D.view = meta.date;
  const isToday = meta.date === latest;
  const fl = day.flights;
  const voted = fl.filter((f) => S.votes[f.id]).length;
  const ins = day.inspection;
  const disp = ins && S.dispatched[ins.id] ? 1 : 0;
  const w = ins ? D.fleetBy[ins.work] : null;
  let h = '';
  h += '<div class="sign">' + ICON.plane + '<span class="s-zh">' + (isToday ? '出發' : '到站') + '</span><span class="s-en">' + (isToday ? 'Departures' : 'Arrivals') + '</span><span class="s-r">DAY ' + String(meta.no).padStart(3, '0') + '</span><i class="arrow-sweep"></i></div>';
  if (!isToday) h += '<button class="chip-btn y" data-go="#dep" style="margin-bottom:12px">' + ICON.back + '回到今天的航班</button>';
  h += '<div class="tower"><div class="t-ico">' + ICON.mic + '</div><div><div class="t-h">TOWER · 塔台的話</div><p>' + esc(day.tower) + '</p>' +
    (Voice.can() ? '<button class="t-play" id="t-play">' + ICON.play + '<span>收聽塔台廣播</span></button>' : '') + '</div></div>';
  h += '<div class="progress"><div class="pg"><i>表態 BOARDING</i><b>' + voted + '<em>/' + fl.length + '</em></b><div class="bar"><u style="transform:scaleX(' + (voted / fl.length) + ')"></u></div></div>' +
    '<div class="pg"><i>簽派 DISPATCH</i><b>' + disp + '<em>/' + (ins ? 1 : 0) + '</em></b><div class="bar"><u style="transform:scaleX(' + disp + ')"></u></div></div>' +
    '<div class="pg"><i>塔台 TOWER</i><b>' + (S.out.length ? S.out.length + '<em> 待送</em>' : '<em style="color:var(--go)">已收到</em>') + '</b><div class="bar"><u style="transform:scaleX(' + (S.out.length ? 0.4 : 1) + ')"></u></div></div></div>';
  h += '<div class="h2"><b>' + (isToday ? '今日航班' : '那天的航班') + '</b><i>FLIGHTS</i><span class="r">' + dayLabel(meta.date) + '</span></div>';
  h += '<div class="board" id="board"><div class="b-head"><span>TIME · FLIGHT · DESTINATION</span><span>STATUS</span></div>';
  fl.forEach((f) => {
    h += '<button class="b-row ' + lanes(f) + '" data-f="' + esc(f.id) + '">' +
      '<div class="b-l1">' + Flap.html(f.time, 'sm amber') + Flap.html(f.no, 'sm') + stHtml(flightState(f, meta.date)) + '</div>' +
      '<div class="b-l2">' + Flap.html(f.zh, 'zh') + '<span class="b-gate">' + esc(f.gate) + '</span></div>' +
      '<div class="b-hook">' + esc(f.hook) + '</div>' +
      '<div class="b-lane" style="margin-top:8px"><i></i>' + LANE[f.lane].zh + '航班 · ' + esc(f.kind) + '</div></button>';
  });
  if (ins && w) {
    h += '<button class="b-row lane-hangar" data-i="' + esc(ins.id) + '">' +
      '<div class="b-l1"><span class="b-lane"><i></i>機庫 HANGAR</span>' + Flap.html(w.reg, 'sm sign') + stHtml(hangarState(ins)) + '</div>' +
      '<div class="b-l2">' + Flap.html(w.zh, 'zh') + '<span class="b-gate">' + esc(ins.check) + '</span></div>' +
      '<div class="b-hook">' + esc(ins.summary) + '</div></button>';
  }
  h += '</div>';
  // 到站紀錄（之前的日子）
  const past = D.index.days.filter((d) => d.date !== meta.date);
  h += '<div class="h2"><b>到站紀錄</b><i>ARRIVALS</i><span class="r">' + D.index.days.length + ' 天</span></div>';
  if (!past.length) h += '<div class="empty">這是轉機航廈的第一天。<br>明天起，每天的航班都會停在這裡，隨時可以回來翻。</div>';
  else {
    h += '<div class="arrivals">';
    past.forEach((d) => {
      h += '<button class="arr" data-day="' + d.date + '"><span class="d">' + fmtDate(d.date) + '</span><span class="ds">' +
        d.flights.map((f) => '<b>' + esc(f.zh) + '</b>' + (S.votes[f.id] ? ' ' + STATUS[S.votes[f.id].v][0] : '')).join('　') +
        (d.hangar ? '<br>機庫：' + esc(d.hangar.zh) + '（' + VERDICT[d.hangar.verdict].zh + '）' : '') + '</span><svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6z"/></svg></button>';
    });
    h += '</div>';
  }
  el.innerHTML = h;
  Flap.run(el);
  const tp = $('#t-play');
  if (tp) tp.onclick = () => { Snd.init(); if (Voice.speaking) { Voice.stop(); return; } announce(day); };
  setPlayBtn();
}
function setPlayBtn() {
  const tp = $('#t-play'); if (!tp) return;
  tp.classList.toggle('on', Voice.speaking);
  tp.innerHTML = Voice.speaking ? '<span class="eq"><i></i><i></i><i></i></span><span>廣播中・點一下停止</span>' : ICON.play + '<span>收聽塔台廣播</span>';
}
async function announce(day) {
  Snd.chime(); await sleep(1350);
  Voice.say(day.announce || day.tower);
}
Voice.onState = () => setPlayBtn();

/* ---------- 登機證 ---------- */
function passHtml(f, date) {
  const v = S.votes[f.id];
  const ln = LANE[f.lane];
  let h = '<div class="pass ' + lanes(f) + '" id="pass">' +
    '<div class="pass-band"><b>TURNAROUND AIR</b><span>' + ln.zh + '航班 · ' + ln.en + '</span></div>' +
    '<div class="pass-route"><div class="ap"><b>IDEA</b><i>點子</i></div><div class="fly">' + ICON.fly + '</div><div class="ap to"><b>' + esc(f.dest) + '</b><i>' + esc(f.zh) + '</i></div></div>' +
    '<div class="pass-title"><b>' + esc(f.zh) + '</b><i>' + esc(f.en) + '</i></div><div class="pass-kind">' + esc(f.kind) + '</div>' +
    '<div class="pass-grid"><div><i>PASSENGER</i><b class="zh">痞子葳</b></div><div><i>FLIGHT</i><b>' + esc(f.no) + '</b></div><div><i>GATE</i><b>' + esc(f.gate) + '</b></div>' +
    '<div><i>BOARDING</i><b>' + esc(f.time) + '</b></div><div><i>DATE</i><b>' + fmtDate(date) + '</b></div><div><i>CLASS</i><b class="zh">' + ln.zh + '</b></div></div>' +
    '<div class="perf"><i class="n2"></i></div>' +
    '<div class="pass-hook">' + esc(f.hook) + '</div>' +
    '<div class="pass-bc">' + barcode(f.id) + '<div class="seq">SEQ ' + String(hash32(f.id) % 900 + 100) + '<br>' + esc(f.dest) + ' / ' + esc(f.gate) + '</div></div>';
  if (v) h += stampHtml(v.v);
  return h + '</div>';
}
function stampHtml(v, hit) {
  const t = { board: ['登機', 'BOARDED'], delay: ['延誤', 'DELAYED'], cancel: ['取消', 'CANCELLED'] }[v];
  return '<div class="stamp ' + v + (hit ? ' hit' : '') + '">' + t[0] + '<i>' + t[1] + '</i></div>';
}
function flightPage(id) {
  const r = findFlight(id);
  if (!r) { toast('找不到這班航班'); return null; }
  const { f, day } = r;
  const date = day.date;
  const isToday = date === D.index.latest;
  const sel = S.routes[f.id];
  let h = '<div class="pg-top"><button class="pg-x" data-close>' + ICON.x + '</button><div class="pg-t"><i>BOARDING PASS · ' + esc(f.no) + '</i><b>' + esc(f.zh) + '</b></div>' +
    '<div class="pg-a"><button class="chip-btn y" data-talk>' + ICON.chat + (IS_WEB || !Tower.ok() ? '拿去聊' : '塔台連線') + '</button></div></div>';
  h += '<div class="pg-body ' + lanes(f) + '">' + passHtml(f, date);
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.fly + '</span><b>航程簡介</b><i>THE TRIP</i></div><p>' + esc(f.pitch) + '</p></div>';
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.star + '</span><b>機上亮點</b><i>WHY IT HITS</i></div><ul class="fun">' + (f.fun || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
  h += '<div class="sect turb"><div class="sect-h"><span class="ico">' + ICON.warn + '</span><b>亂流警告</b><i>TURBULENCE</i></div><p>' + esc(f.fail) + '</p></div>';
  const x = f.xray || {};
  const xv = { clear: '放行・可以登機', open: '需開箱檢查', deny: '禁止登機' }[x.verdict] || '需開箱檢查';
  h += '<div class="xray" id="xray"><i class="scan"></i><div class="sect-h"><span class="ico">' + ICON.shield + '</span><b>安檢 X 光</b><i>RED TEAM</i></div>' +
    '<div class="reveal"><div class="xr-v ' + esc(x.verdict) + '">' + xv + '</div><div class="xr-box"><p>' + esc(x.threat) + '</p></div>' +
    '<div class="xr-fix"><i>處置 HOW TO CLEAR</i><p>' + esc(x.fix) + '</p></div></div></div>';
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.list + '</span><b>起飛前檢查表</b><i>PRE-FLIGHT</i></div><ul class="chk" id="chk">' +
    (f.checks || []).map((g) => {
      const r = g.rule ? ruleOf(g.rule) : null;
      const title = r ? r.title : (g.text || '');
      const mark = { pass: '✓', warn: '!', fail: '✕' }[g.ok] || '?';
      return '<li><span class="box ' + esc(g.ok) + '">' + mark + '</span><span class="tx"><b>' + esc(title) + (g.rule ? '<span class="rid">' + esc(g.rule) + '</span>' : '') + '</b><span>' + esc(g.note || '') + '</span></span></li>';
    }).join('') + '</ul></div>';
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.route + '</span><b>轉機航線</b><i>PICK A ROUTE</i></div><p class="muted" style="font-size:13px;margin-bottom:10px">想往哪個方向發展？點一條，塔台會記下來。</p><div class="routes">' +
    (f.routes || []).map((r, i) => '<button class="route' + (sel === r.id ? ' on' : '') + '" data-route="' + esc(r.id) + '"><span class="rk">' + String.fromCharCode(65 + i) + '</span>' +
      '<svg class="arc" viewBox="0 0 60 26"><path d="M2 24 Q30 ' + (i * 9 - 6) + ' 58 24"/></svg><b>' + esc(r.name) + '</b><p>' + esc(r.line) + '</p><em>取捨：' + esc(r.trade) + '</em></button>').join('') + '</div></div>';
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.plane + '</span><b>同航線・預計航程</b><i>SIMILAR · SCOPE</i></div><div class="tags">' + (f.like || []).map((x) => '<span class="tag">' + esc(x) + '</span>').join('') + '</div>' +
    '<p style="margin-top:12px">' + esc(f.scope) + '</p></div>';
  if (!IS_WEB && Tower.ok()) h += '<div class="sect" id="tower-chat"><div class="sect-h"><span class="ico">' + ICON.chat + '</span><b>塔台連線</b><i>LIVE</i></div><div class="chat"></div><div class="chat-in"><textarea placeholder="問塔台：這個點子還能怎麼改？"></textarea><button>' + '送出</button></div></div>';
  if (S.votes[f.id]) h += '<button class="undo" data-undo>改變主意：撤回表態</button>';
  h += '</div>';
  h += '<div class="actbar"><div class="in">' +
    '<button class="act cancel' + (S.votes[f.id] && S.votes[f.id].v === 'cancel' ? ' sel' : '') + '" data-vote="cancel">取消<i>CANCEL</i></button>' +
    '<button class="act delay' + (S.votes[f.id] && S.votes[f.id].v === 'delay' ? ' sel' : '') + '" data-vote="delay">延誤<i>THINK MORE</i></button>' +
    '<button class="act board' + (S.votes[f.id] && S.votes[f.id].v === 'board' ? ' sel' : '') + '" data-vote="board">登機・想做<i>BOARD</i></button></div></div>';
  const pg = openPage(h, 'pg-f');
  if (!isToday && !S.votes[f.id]) toast('這是 ' + fmtDate(date) + ' 的航班，一樣可以表態');
  // 安檢掃描、檢查表打勾：捲到時才演
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.id === 'xray') { e.target.classList.add('go'); Snd.scan(); setTimeout(() => { e.target.classList.add('done'); Snd.beep(x.verdict === 'clear'); }, reduced() ? 0 : 1300); }
      if (e.target.id === 'chk') { $$('li', e.target).forEach((li, i) => setTimeout(() => { li.classList.add('go'); Snd.tick(); }, reduced() ? 0 : 160 + i * 170)); }
    });
  }, { root: pg, threshold: 0.35 });
  ['#xray', '#chk'].forEach((s) => { const n = $(s, pg); if (n) io.observe(n); });
  pg.addEventListener('click', (ev) => {
    const t = ev.target.closest('button'); if (!t) return;
    if (t.dataset.vote) { vote(f, date, t.dataset.vote, pg); return; }
    if (t.dataset.route) { pickRoute(f, t.dataset.route, pg); return; }
    if (t.hasAttribute('data-talk')) { talkFlight(f, date, pg); return; }
    if (t.hasAttribute('data-undo')) { undoVote(f, pg); return; }
  });
  if (!IS_WEB && Tower.ok()) Tower.bind($('#tower-chat', pg), 'f:' + f.id, () => flightContext(f, date));
  return pg;
}
function snapFlight(f, date) { const c = Object.assign({}, f); c._date = date; S.flights[f.id] = c; }
function vote(f, date, v, pg) {
  Snd.init();
  if (v === 'cancel') { reasonSheet(f, date, pg); return; }
  applyVote(f, date, { v, t: now() }, pg);
}
function applyVote(f, date, rec, pg) {
  const prev = S.votes[f.id];
  S.votes[f.id] = rec; snapFlight(f, date);
  emit('vote', { card: f.id, v: rec.v, reasons: rec.reasons || [], note: rec.note || '', lane: f.lane, zh: f.zh, prev: prev ? prev.v : null });
  // 蓋章
  const pass = $('#pass', pg); const old = $('.stamp', pass); if (old) old.remove();
  pass.insertAdjacentHTML('beforeend', stampHtml(rec.v, true));
  Snd.stamp(); haptic(rec.v === 'board' ? 30 : 18);
  $$('.act', pg).forEach((b) => b.classList.toggle('sel', b.dataset.vote === rec.v));
  if (rec.v === 'board') { setTimeout(() => { Snd.whoosh(); FX.takeoff($('.act.board', pg)); }, 260); toast('已登機！收進「機長」的登機證夾'); }
  else if (rec.v === 'delay') toast('延誤：先放著，想好再回來');
  else toast('已取消。塔台記下原因了，明天的航班會避開');
  if (!$('[data-undo]', pg)) $('.pg-body', pg).insertAdjacentHTML('beforeend', '<button class="undo" data-undo>改變主意：撤回表態</button>');
  App.refresh(true);
}
function undoVote(f, pg) {
  delete S.votes[f.id];
  emit('vote', { card: f.id, v: 'none', lane: f.lane, zh: f.zh });
  const st = $('.stamp', pg); if (st) st.remove();
  $$('.act', pg).forEach((b) => b.classList.remove('sel'));
  const u = $('[data-undo]', pg); if (u) u.remove();
  Snd.tear(); toast('已撤回，重新選一次'); App.refresh(true);
}
function reasonSheet(f, date, pg) {
  const pick = new Set((S.votes[f.id] && S.votes[f.id].reasons) || []);
  const sh = openSheet('<h3>為什麼取消這班？</h3><p class="sub">點一個或幾個原因。塔台會照你的原因調整明天出的題。</p>' +
    '<div class="chips">' + REASONS.map((r) => '<button class="chip red' + (pick.has(r) ? ' on' : '') + '" data-r="' + r + '">' + r + '</button>').join('') + '</div>' +
    '<textarea id="rs-note" rows="2" placeholder="想多說一句也可以（選填）"></textarea>' +
    '<div class="row2"><button class="btn ghost" data-close>先不要</button><button class="btn red" id="rs-ok">確認取消</button></div>');
  sh.addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (c) { c.classList.toggle('on'); c.classList.contains('on') ? pick.add(c.dataset.r) : pick.delete(c.dataset.r); Snd.tick(); haptic(8); }
  });
  $('#rs-ok', sh).onclick = () => {
    closeSheet();
    applyVote(f, date, { v: 'cancel', reasons: Array.from(pick), note: ($('#rs-note', sh).value || '').trim().slice(0, 300), t: now() }, pg);
  };
}
function pickRoute(f, rid, pg) {
  Snd.init(); const same = S.routes[f.id] === rid;
  if (same) delete S.routes[f.id]; else S.routes[f.id] = rid;
  snapFlight(f, f._date || f.id.slice(0, 10));
  $$('.route', pg).forEach((b) => b.classList.toggle('on', !same && b.dataset.route === rid));
  emit('route', { card: f.id, route: same ? null : rid, zh: f.zh });
  Snd.beep(true); haptic(10);
  if (!same) { const r = f.routes.find((x) => x.id === rid); toast('航線記下了：' + esc(r.name)); }
}
function flightContext(f, date) {
  const v = S.votes[f.id]; const r = S.routes[f.id] ? f.routes.find((x) => x.id === S.routes[f.id]) : null;
  const vs = v ? STATUS[v.v][0] + (v.reasons && v.reasons.length ? '（原因：' + v.reasons.join('、') + (v.note ? '；' + v.note : '') + '）' : '') : '還沒決定';
  return '我在《轉機》看到 ' + fmtDate(date) + ' 的' + LANE[f.lane].zh + '航班《' + f.zh + '》（' + f.en + '），想跟你聊聊。\n' +
    '我的表態：' + vs + '；想走的航線：' + (r ? r.name : '還沒選') + '。\n\n' +
    '【鉤子】' + f.hook + '\n【航程】' + f.pitch + '\n【亮點】\n' + (f.fun || []).map((x) => '・' + x).join('\n') +
    '\n【亂流】' + f.fail + '\n【安檢】' + (f.xray ? f.xray.threat + ' → 處置：' + f.xray.fix : '') +
    '\n【航線】\n' + (f.routes || []).map((x, i) => String.fromCharCode(65 + i) + '「' + x.name + '」' + x.line + '（取捨：' + x.trade + '）').join('\n') +
    '\n【同航線】' + (f.like || []).join('、') + '\n【規模】' + f.scope + (f.seed ? '\n【補充】' + f.seed : '');
}
function talkFlight(f, date, pg) {
  Snd.init();
  if (!IS_WEB && Tower.ok()) { const c = $('#tower-chat', pg); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const text = flightContext(f, date) + '\n\n請照我們的飛行手冊（創作守則）來聊；先只討論，等我說「開工」再動手。';
  copyText(text).then((ok) => { haptic(12); Snd.beep(true); toast(ok !== false ? '已複製航班資料，貼給 Claude 就能接著聊<br><a href="https://claude.ai/new" target="_blank" rel="noopener">打開 Claude</a>' : '複製失敗，請長按文字自己複製', 5200); });
  emit('talk', { card: f.id });
}

/* ---------- 機庫 ---------- */
function renderHangar() {
  const el = $('#v-hangar');
  const meta = latestInspection();
  let h = '<div class="sign hazard"><span class="s-plate">' + ICON.wrench + '<span class="s-zh">機庫</span><span class="s-en">Hangar</span></span></div>';
  if (meta) {
    const day = D.days[meta.date];
    if (!day) { el.innerHTML = h + '<div class="empty">讀取檢修報告中…</div>'; App.loadDay(meta.date).then(renderHangar); return; }
    h += '<div class="h2"><b>今日進廠</b><i>TODAY IN HANGAR</i><span class="r">' + dayLabel(meta.date) + '</span></div>';
    h += inspHtml(day.inspection, day.date, true);
  } else h += '<div class="empty">機庫還是空的：第一架還沒進廠。</div>';
  // 機隊
  const works = D.fleet.works;
  const okN = works.filter((w) => !w.skip).length, doneN = works.filter((w) => !w.skip && (w.inspections || []).length).length;
  h += '<div class="h2"><b>機隊</b><i>FLEET</i><span class="r">已檢 ' + doneN + ' / ' + okN + ' 架</span></div>';
  h += '<div class="filters" id="fl-f">' + [['all', '全部'], ['game', '遊戲'], ['app', 'App'], ['todo', '還沒檢'], ['done', '檢過'], ['q', '排隊中']].map(([k, n], i) => '<button class="chip' + (i === 0 ? ' on' : '') + '" data-ff="' + k + '">' + n + '</button>').join('') + '</div>';
  h += '<div class="fleet" id="fleet"></div>';
  h += '<div class="legend"><span><i style="background:var(--go)"></i>適航</span><span><i style="background:var(--amber)"></i>需檢修</span><span><i style="background:var(--red)"></i>建議退役</span><span><i style="background:var(--dim2)"></i>還沒檢</span><span>半透明＝不在機庫範圍</span></div>';
  // 檢修紀錄
  const logs = D.index.days.filter((d) => d.hangar && (!meta || d.date !== meta.date));
  h += '<div class="h2"><b>檢修紀錄</b><i>LOG</i></div>';
  h += logs.length ? '<div class="arrivals">' + logs.map((d) => '<button class="arr" data-insp="' + esc(d.hangar.id) + '" data-date="' + d.date + '"><span class="d">' + fmtDate(d.date) + '</span><span class="ds"><b>' + esc(d.hangar.zh) + '</b> ' + esc(d.hangar.reg) + '・' + VERDICT[d.hangar.verdict].zh + '<br>' + esc(d.hangar.summary) + '</span></button>').join('') + '</div>'
    : '<div class="empty">之後每一架的檢修報告都會留在這裡。</div>';
  el.innerHTML = h;
  renderFleet('all');
  if (meta) bindInsp(el, D.days[meta.date].inspection, meta.date);
  $('#fl-f', el).onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; $$('.chip', e.currentTarget).forEach((x) => x.classList.toggle('on', x === c)); Snd.tick(); renderFleet(c.dataset.ff); };
}
function lastVerdict(w) { const a = w.inspections || []; return a.length ? a[a.length - 1].verdict : ''; }
function renderFleet(f) {
  const box = $('#fleet'); if (!box) return;
  const q = new Set(S.queue.map((x) => x.work));
  let ws = D.fleet.works.slice();
  if (f === 'game') ws = ws.filter((w) => w.type === 'game');
  if (f === 'app') ws = ws.filter((w) => w.type === 'app');
  if (f === 'todo') ws = ws.filter((w) => !w.skip && !(w.inspections || []).length);
  if (f === 'done') ws = ws.filter((w) => (w.inspections || []).length);
  if (f === 'q') ws = ws.filter((w) => q.has(w.id));
  ws.sort((a, b) => (!!a.skip - !!b.skip) || (b.created || '').localeCompare(a.created || ''));
  box.innerHTML = ws.length ? ws.map((w) => '<button class="fl' + (w.skip ? ' skip' : '') + (q.has(w.id) ? ' q' : '') + '" data-w="' + esc(w.id) + '"><div class="im" style="' + coverStyle(w) + '">' + (coverUrl(w) ? '' : '<span class="gl">' + esc(w.glyph || w.zh.slice(0, 1)) + '</span>') + '</div><span class="dot ' + lastVerdict(w) + '"></span><div class="tx"><b>' + esc(w.zh) + '</b><i>' + esc(w.reg) + '</i></div></button>').join('')
    : '<div class="empty" style="grid-column:1/-1">這裡還沒有作品。</div>';
}
function coverUrl(w) { if (!IS_WEB) return (window.TA_DATA && TA_DATA.covers && TA_DATA.covers[w.id]) || null; return w.cover || null; }
function workUrl(w) {
  if (!w.url) return '';
  if (!IS_WEB && w.url.indexOf('../../') === 0) return 'https://pzwei0105.github.io/PZ-Games/' + w.url.slice(6);
  return w.url;
}
function heroStyle(w) {
  if (IS_WEB && w.wide) return 'background-image:url(' + w.wide + ')';
  return coverStyle(w);
}
function coverStyle(w) {
  const u = coverUrl(w); const p = w.palette || ['#888', '#111', '#ffd21a'];
  return u ? 'background-image:url(' + u + ')' : 'background:linear-gradient(140deg,' + p[0] + ',' + p[1] + ')';
}
function inspHtml(ins, date, today) {
  const w = D.fleetBy[ins.work] || { zh: ins.work, en: '', reg: '?', genre_zh: '', palette: ['#888', '#111', '#ffd21a'] };
  const vd = VERDICT[ins.verdict];
  const st = hangarState(ins);
  const its = S.items[ins.id] || {};
  let h = '<div class="ac"><div class="ac-img" style="' + heroStyle(w) + '"><i class="lamp"></i>' + (coverUrl(w) ? '' : '<span class="tail">' + esc(w.glyph || w.zh.slice(0, 1)) + '</span>') + '</div>' +
    '<div class="ac-stamp v-' + ins.verdict + '">' + vd.zh + '<i>' + vd.en + '</i></div>' +
    '<div class="ac-meta"><span class="plate">' + esc(w.reg) + '</span><h2>' + esc(w.zh) + '<i>' + esc(w.en) + '</i></h2><div class="ty">' + esc(w.genre_zh || '') + '・' + esc(ins.check) + (ins.check_note ? '（' + esc(ins.check_note) + '）' : '') + '</div></div></div>';
  h += '<div class="card" style="margin-top:-6px;border-radius:0 0 18px 18px;border-top:0;padding:0"><div class="ac-sum">' + esc(ins.summary) + '</div><div class="ac-act">' +
    (w.url ? '<a class="chip-btn" href="' + esc(workUrl(w)) + '" target="_blank" rel="noopener">' + ICON.open + '打開這架</a>' : '') +
    '<button class="chip-btn y" data-italk>' + ICON.chat + (IS_WEB || !Tower.ok() ? '拿去聊' : '塔台連線') + '</button></div></div>';
  h += '<div class="log"><div class="log-h"><b>檢修單 WORK CARD</b><span>' + fmtDate(date) + '</span></div><div class="log-g">' +
    '<div><i>REGISTRATION</i><b>' + esc(w.reg) + '</b></div><div><i>TYPE</i><b>' + esc(w.genre_zh || '') + '</b></div>' +
    '<div><i>CHECK</i><b>' + esc(ins.check) + '</b></div><div><i>MECHANIC</i><b>Claude</b></div></div>' +
    '<ol>' + (ins.method || []).map((m) => '<li>' + esc(m) + '</li>').join('') + '</ol></div>';
  h += '<div class="h2"><b>體檢儀表</b><i>VITALS</i></div><div class="gauges">' + (ins.vitals || []).map((v) => gaugeHtml(v)).join('') + '</div>';
  h += '<div class="tagline red">' + ICON.warn + '<div><b>最大的問題</b>' + esc(ins.worst) + '</div></div>';
  h += '<div class="tagline amber">' + ICON.info + '<div><b>你為什麼可能沒再打開它</b>' + esc(ins.why_not) + '</div></div>';
  h += '<div class="sect"><div class="sect-h"><span class="ico">' + ICON.wrench + '</span><b>技師的判斷</b><i>CORE</i></div><p>' + esc(ins.core) + '</p></div>';
  if ((ins.shots || []).length) {
    h += '<div class="h2"><b>證據照片</b><i>EVIDENCE</i></div><div class="shots">' + ins.shots.map((s, i) => '<button class="shot" data-shot="' + i + '"><img loading="lazy" alt="" src="' + esc(shotSrc(s.src)) + '"><span>' + esc(s.cap) + '</span></button>').join('') + '</div>';
  }
  h += '<div class="h2"><b>工單</b><i>WORK ORDERS</i><span class="r">核准的才會進開工指令</span></div>';
  ['fix', 'polish', 'cut', 'add'].forEach((k) => {
    const list = (ins.items || []).filter((x) => x.kind === k);
    if (!list.length) return;
    h += '<div class="wo-g"><div class="wo-gh"><span class="k k-' + k + '">' + KIND[k].zh + '</span><b>' + KIND[k].name + '</b><i>' + KIND[k].en + '</i></div>';
    list.forEach((it) => {
      const d = its[it.id];
      h += '<div class="wo ' + (d || '') + '" data-item="' + esc(it.id) + '">' + (d === 'approve' ? '<span class="ok-stamp">核准</span>' : '') +
        '<div class="wo-t"><b>' + esc(it.title) + '</b></div><p>' + esc(it.detail) + '</p>' +
        '<div class="wo-m"><span class="w-' + it.worth + '">' + WORTH[it.worth] + '</span><span>' + EFFORT[it.effort] + '</span>' + (it.evidence && it.evidence !== '—' ? '<span>依據：' + esc(it.evidence) + '</span>' : '') + '</div>' +
        '<div class="wo-b"><button class="rj' + (d === 'reject' ? ' on' : '') + '" data-iv="reject">駁回</button><button class="ap' + (d === 'approve' ? ' on' : '') + '" data-iv="approve">核准 ✓</button></div></div>';
    });
    h += '</div>';
  });
  const nAp = (ins.items || []).filter((x) => its[x.id] === 'approve').length;
  const nRj = (ins.items || []).filter((x) => its[x.id] === 'reject').length;
  h += '<div class="dispatch' + (S.dispatched[ins.id] ? ' done' : '') + '" id="dispatch"><h3>簽派放行<i>DISPATCH</i></h3><p>把核准的工單變成一份開工指令，貼給 Claude 就能直接動工。' + (S.dispatched[ins.id] ? '<br>已經簽派過一次；改了核准項目可以再簽一次。' : '') + '</p>' +
    '<div class="cnt"><div>' + nAp + '<i>核准</i></div><div>' + nRj + '<i>駁回</i></div><div>' + ((ins.items || []).length - nAp - nRj) + '<i>還沒看</i></div></div>' +
    '<button class="btn" data-dispatch ' + (nAp ? '' : 'disabled') + '>' + ICON.send + (nAp ? '產生開工指令・簽派' : '先核准至少一張工單') + '</button>' +
    (ins.verdict === 'airworthy' && !(ins.items || []).length ? '' : '') + '</div>';
  if ((ins.notams || []).length) {
    h += '<div class="h2"><b>這次學到的</b><i>NOTAM</i><span class="r">核准後寫進飛行手冊</span></div>';
    h += ins.notams.map((n) => notamHtml(Object.assign({}, n, D.ruleBy[n.id] || {}))).join('');
  }
  const prs = S.pireps.filter((p) => p.work === ins.work);
  h += '<div class="h2"><b>機長報告</b><i>PILOT REPORT</i></div><div class="card pirep"><p class="muted" style="margin:0 0 10px;font-size:13.5px;line-height:1.6">玩過《' + esc(w.zh) + '》之後的感想寫在這裡。下次檢修會把你的話當最重要的依據。</p>' +
    '<div class="chips" id="pr-chips">' + PIREP_CHIPS.map((c) => '<button class="chip" data-c="' + c + '">' + c + '</button>').join('') + '</div>' +
    '<textarea id="pr-text" rows="3" placeholder="例如：手感很好，但第三章的 Boss 打太久"></textarea><button class="btn" data-pirep>' + ICON.send + '送出機長報告</button>' +
    '<div class="pireps">' + prs.slice().reverse().map((p) => '<div class="pr"><i>' + p.t.slice(0, 10) + (p.chips && p.chips.length ? '・' + esc(p.chips.join('、')) : '') + '</i>' + esc(p.text) + '</div>').join('') + '</div></div>';
  if (!IS_WEB && Tower.ok()) h += '<div class="sect" id="tower-chat-i"><div class="sect-h"><span class="ico">' + ICON.chat + '</span><b>塔台連線</b><i>LIVE</i></div><div class="chat"></div><div class="chat-in"><textarea placeholder="問技師：這份報告哪一項最該先做？"></textarea><button>送出</button></div></div>';
  return h;
}
function shotSrc(src) { if (!IS_WEB && window.TA_DATA && TA_DATA.shots && TA_DATA.shots[src]) return TA_DATA.shots[src]; return 'data/' + src; }
function gaugeHtml(v) {
  const words = ['', '很弱', '偏弱', '普通', '很好', '頂級'];
  const ang = -90 + (v.v - 1) * 45;
  return '<div class="gauge v' + v.v + '"><svg viewBox="0 0 120 72"><path d="M12 60a48 48 0 0 1 96 0" fill="none" stroke="#232a33" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M12 60a48 48 0 0 1 96 0" fill="none" stroke="url(#gg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="151" stroke-dashoffset="' + (151 - 151 * (v.v / 5)) + '" opacity=".95"/>' +
    '<defs><linearGradient id="gg"><stop offset="0" stop-color="#ff4b3e"/><stop offset=".5" stop-color="#ffb21e"/><stop offset="1" stop-color="#2fe07f"/></linearGradient></defs>' +
    '<g class="needle" data-a="' + ang + '"><path d="M60 60 L58 22 L60 16 L62 22 Z" fill="#f4f1e8"/></g><circle cx="60" cy="60" r="6" fill="#f4f1e8"/><circle cx="60" cy="60" r="2.5" fill="#111"/></svg>' +
    '<b>' + esc(v.k) + '</b><span>' + words[v.v] + '</span>' + (v.note ? '<p>' + esc(v.note) + '</p>' : '') + '</div>';
}
function bindInsp(root, ins, date) {
  // 指針：進畫面時才轉上去
  const g = $$('.needle', root);
  const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); const a = e.target.dataset.a; requestAnimationFrame(() => { e.target.style.transform = 'rotate(' + a + 'deg)'; }); Snd.tick(); } }); }, { threshold: 0.4 });
  g.forEach((n) => io.observe(n));
  const pick = new Set();
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('button,[data-shot]'); if (!b) return;
    if (b.dataset.iv) { const card = b.closest('.wo'); itemDecide(ins, card.dataset.item, b.dataset.iv, root, date); return; }
    if (b.hasAttribute('data-dispatch')) { dispatch(ins, date, root); return; }
    if (b.hasAttribute('data-italk')) { talkInsp(ins, date, root); return; }
    if (b.dataset.shot != null && b.classList.contains('shot')) { const s = ins.shots[+b.dataset.shot]; lightbox(shotSrc(s.src), s.cap); return; }
    if (b.dataset.n) { notamDecide(b.dataset.n, b.dataset.nv, b.closest('.notam')); return; }
    if (b.dataset.c && b.closest('#pr-chips')) { b.classList.toggle('on'); b.classList.contains('on') ? pick.add(b.dataset.c) : pick.delete(b.dataset.c); Snd.tick(); haptic(6); return; }
    if (b.hasAttribute('data-pirep')) {
      const ta = $('#pr-text', root); const text = (ta.value || '').trim();
      if (!text && !pick.size) { toast('寫一句感想，或點一個標籤'); Snd.beep(false); return; }
      const p = { id: S.dev + '-p' + (S.seq + 1), work: ins.work, text: text.slice(0, 600), chips: Array.from(pick), t: now() };
      S.pireps.push(p); emit('pirep', { work: ins.work, text: p.text, chips: p.chips });
      ta.value = ''; pick.clear(); $$('#pr-chips .chip', root).forEach((c) => c.classList.remove('on'));
      $('.pireps', root).insertAdjacentHTML('afterbegin', '<div class="pr"><i>' + p.t.slice(0, 10) + (p.chips.length ? '・' + esc(p.chips.join('、')) : '') + '</i>' + esc(p.text) + '</div>');
      Snd.tele(8); haptic(14); toast('機長報告已送出，下次檢修會先看它');
    }
  });
  if (!IS_WEB && Tower.ok()) Tower.bind($('#tower-chat-i', root), 'i:' + ins.id, () => inspContext(ins, date));
}
function itemDecide(ins, itemId, v, root, date) {
  Snd.init();
  const m = S.items[ins.id] || (S.items[ins.id] = {});
  if (m[itemId] === v) delete m[itemId]; else m[itemId] = v;
  emit('item', { insp: ins.id, work: ins.work, item: itemId, v: m[itemId] || 'none' });
  if (m[itemId] === 'approve') { Snd.stamp(); haptic(20); } else { Snd.tick(); haptic(8); }
  const sy = root.scrollTop; const y = window.scrollY;
  rerenderInsp(ins, date, root);
  if (root.classList.contains('page')) root.scrollTop = sy; else window.scrollTo(0, y);
  App.refresh(true);
}
function rerenderInsp(ins, date, root) {
  if (root.id === 'v-hangar') { renderHangar(); return; }
  const body = $('.pg-body', root); body.innerHTML = inspHtml(ins, date, false);
}
function orderText(ins, date) {
  const w = D.fleetBy[ins.work] || {};
  const its = S.items[ins.id] || {};
  const ap = (ins.items || []).filter((x) => its[x.id] === 'approve');
  const rj = (ins.items || []).filter((x) => its[x.id] === 'reject');
  const prs = S.pireps.filter((p) => p.work === ins.work);
  let t = ins.order + '\n\n【核准的工單】\n' + ap.map((x, i) => (i + 1) + '. [' + KIND[x.kind].zh + '] ' + x.title + '——' + x.detail).join('\n');
  if (rj.length) t += '\n\n【駁回（不要做）】\n' + rj.map((x) => '・' + x.title).join('\n');
  if (prs.length) t += '\n\n【機長報告（我的玩後感）】\n' + prs.map((p) => '・' + p.t.slice(0, 10) + '：' + (p.chips && p.chips.length ? '［' + p.chips.join('、') + '］' : '') + p.text).join('\n');
  t += '\n\n（沒核准的工單先不做。這是《' + (w.zh || ins.work) + '》' + fmtDate(date) + ' 的檢修。）';
  return t;
}
function dispatch(ins, date, root) {
  Snd.init();
  const text = orderText(ins, date);
  copyText(text).then((ok) => {
    S.dispatched[ins.id] = now();
    emit('dispatch', { insp: ins.id, work: ins.work, items: Object.keys(S.items[ins.id] || {}).filter((k) => S.items[ins.id][k] === 'approve') });
    Snd.stamp(); setTimeout(() => { Snd.whoosh(); FX.takeoff($('[data-dispatch]', root)); }, 200); haptic(30);
    toast((ok !== false ? '開工指令已複製！貼給 Claude 就開工' : '複製失敗，請到「機長」頁複製') + '<br><a href="https://claude.ai/new" target="_blank" rel="noopener">打開 Claude</a>', 6000);
    rerenderInsp(ins, date, root); App.refresh(true);
  });
}
function inspContext(ins, date) {
  const w = D.fleetBy[ins.work] || {};
  const its = S.items[ins.id] || {};
  return '我在《轉機》機庫看《' + (w.zh || ins.work) + '》（' + (w.reg || '') + '）' + fmtDate(date) + ' 的檢修報告，想跟你討論。\n\n【總評】' + ins.summary + '\n【判斷】' + ins.core + '\n【最大問題】' + ins.worst + '\n【為什麼沒再打開】' + ins.why_not +
    '\n【工單】\n' + (ins.items || []).map((x) => '・[' + KIND[x.kind].zh + '] ' + x.title + '（' + WORTH[x.worth] + '、' + EFFORT[x.effort] + '）' + (its[x.id] ? '→ 我' + (its[x.id] === 'approve' ? '核准' : '駁回') : '') + '：' + x.detail).join('\n') +
    '\n【結論】' + VERDICT[ins.verdict].zh + '：' + ins.verdict_note;
}
function talkInsp(ins, date, root) {
  Snd.init();
  if (!IS_WEB && Tower.ok()) { const c = $('#tower-chat-i', root); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  copyText(inspContext(ins, date) + '\n\n先只討論；要動工時我會按「簽派」給你開工指令。').then((ok) => { Snd.beep(true); haptic(12); toast(ok !== false ? '已複製檢修報告，貼給 Claude 就能接著聊<br><a href="https://claude.ai/new" target="_blank" rel="noopener">打開 Claude</a>' : '複製失敗', 5200); });
}
function inspPage(id, date) {
  const day = D.days[date];
  if (!day) { App.loadDay(date).then(() => inspPage(id, date)); return; }
  const ins = day.inspection;
  const w = D.fleetBy[ins.work] || {};
  const pg = openPage('<div class="pg-top"><button class="pg-x" data-close>' + ICON.x + '</button><div class="pg-t"><i>WORK CARD · ' + esc(w.reg || '') + '</i><b>' + esc(w.zh || ins.work) + ' 的檢修報告</b></div></div><div class="pg-body">' + inspHtml(ins, date, false) + '</div>', 'pg-i');
  bindInsp(pg, ins, date);
}
function workSheet(id) {
  const w = D.fleetBy[id]; if (!w) return;
  const ins = (w.inspections || []);
  const q = S.queue.some((x) => x.work === id);
  const sh = openSheet('<div style="display:flex;gap:12px;align-items:center"><div style="width:64px;height:64px;border-radius:14px;flex:none;' + coverStyle(w) + ';background-size:cover;background-position:center;display:grid;place-items:center;font-size:28px;font-weight:900">' + (coverUrl(w) ? '' : esc(w.glyph || w.zh.slice(0, 1))) + '</div><div><span class="plate" style="font-size:12px">' + esc(w.reg) + '</span><h3 style="margin-top:6px">' + esc(w.zh) + ' <span class="muted en" style="font-size:13px">' + esc(w.en) + '</span></h3><p class="sub" style="margin:0">' + esc(w.genre_zh) + (w.created ? '・' + w.created + ' 上架' : '') + '</p></div></div>' +
    '<p style="font-size:14.5px;line-height:1.7;color:#cfd6df">' + esc(w.tagline || '') + '</p>' +
    (w.skip ? '<div class="tagline amber">' + ICON.info + '<div><b>不在機庫範圍</b>' + esc(w.skip) + '</div></div>' : '') +
    (ins.length ? '<div class="h2" style="margin-top:14px"><b>檢修紀錄</b></div>' + ins.slice().reverse().map((x) => '<button class="arr" data-insp="' + esc(x.id) + '" data-date="' + x.date + '"><span class="d">' + fmtDate(x.date) + '</span><span class="ds">' + esc(x.check) + '・' + VERDICT[x.verdict].zh + '・' + x.n + ' 張工單</span></button>').join('') : '<p class="muted" style="font-size:13px">還沒檢修過。</p>') +
    (w.skip ? '' : '<button class="btn' + (q ? ' ghost' : '') + '" id="ws-q">' + (q ? '已排進下一班（點一下取消）' : '排進下一班進廠') + '</button>') +
    (w.url ? '<a class="btn ghost" href="' + esc(workUrl(w)) + '" target="_blank" rel="noopener">' + ICON.open + '打開《' + esc(w.zh) + '》</a>' : ''));
  const qb = $('#ws-q', sh);
  if (qb) qb.onclick = () => {
    Snd.init();
    if (S.queue.some((x) => x.work === id)) { S.queue = S.queue.filter((x) => x.work !== id); emit('queue', { work: id, v: 'off' }); toast('取消排隊'); }
    else { S.queue.push({ work: id, t: now() }); emit('queue', { work: id, v: 'on' }); Snd.beep(true); haptic(14); toast('排好了：明天起優先進廠'); }
    closeSheet(); renderFleet(($('#fl-f .chip.on') || {}).dataset ? $('#fl-f .chip.on').dataset.ff : 'all');
  };
  sh.addEventListener('click', (e) => { const a = e.target.closest('[data-insp]'); if (a) { closeSheet(); go('#i/' + a.dataset.date + '/' + a.dataset.insp); } });
}

/* ---------- 手冊 ---------- */
function notamHtml(n) {
  const d = S.notams[n.id];
  return '<div class="notam"><div class="nh"><span>NOTAM ' + esc(n.id.toUpperCase()) + '</span><span>' + (n.scope === 'novel' ? '小說' : n.scope === 'game' ? '遊戲' : n.scope === 'app' ? 'App' : '通用') + '・' + (n.kind === 'law' ? '鐵律' : '個案') + '</span></div>' +
    '<b>' + esc(n.title) + '</b><p>' + esc(n.rule) + '</p><div class="fr">來源：' + esc(n.from || '') + (n.applies ? '<br>適用：' + esc(n.applies) : '') + '</div>' +
    '<div class="nb"><button class="dg' + (d === 'disagree' ? ' on' : '') + '" data-n="' + esc(n.id) + '" data-nv="disagree">不認同</button><button class="ag' + (d === 'agree' ? ' on' : '') + '" data-n="' + esc(n.id) + '" data-nv="agree">認同，寫進手冊</button></div></div>';
}
function notamDecide(id, v, card) {
  Snd.init();
  if (S.notams[id] === v) delete S.notams[id]; else S.notams[id] = v;
  emit('notam', { rule: id, v: S.notams[id] || 'none' });
  if (card) $$('.nb button', card).forEach((b) => b.classList.toggle('on', S.notams[id] === b.dataset.nv));
  if (S.notams[id] === 'agree') { Snd.stamp(); haptic(18); toast('認同：明天的排程會把它寫進飛行手冊'); } else { Snd.tele(6); }
  App.refresh(true);
}
let manualTab = 'all';
function renderManual() {
  const el = $('#v-manual');
  const rules = D.manual.rules;
  const off = rules.filter((r) => r.status === 'official');
  const prop = rules.filter((r) => r.status === 'proposed');
  let h = '<div class="sign dark">' + '<svg viewBox="0 0 24 24"><path d="M5 3h11.5A2.5 2.5 0 0 1 19 5.5V21H6.5A2.5 2.5 0 0 1 4 18.5V4a1 1 0 0 1 1-1zm1.5 15a.5.5 0 0 0 0 1H17v-1zM8 7v2h8V7zm0 4v2h6v-2z"/></svg><span class="s-zh">飛行手冊</span><span class="s-en">Flight Manual</span><span class="s-r" style="border-color:var(--sign);color:var(--sign)">' + off.length + ' 條</span></div>';
  h += '<p class="muted" style="font-size:14px;line-height:1.7;margin:0 2px 14px">你一路定下的創作守則。每天出題前先對過一遍；每次檢修學到的新教訓，你核准後就會寫進來。</p>';
  h += '<div class="mstats"><div><b>' + off.filter((r) => r.kind === 'law').length + '</b><i>鐵律</i></div><div><b>' + off.filter((r) => r.kind === 'case').length + '</b><i>個案經驗</i></div><div><b>' + prop.length + '</b><i>待核准</i></div></div>';
  if (prop.length) h += '<div class="h2"><b>新守則待核准</b><i>NOTAM</i></div>' + prop.map((n) => notamHtml(n)).join('');
  h += '<div class="h2"><b>守則</b><i>CHECKLIST</i></div><div class="qrh"><div class="qrh-tabs" id="qrh-t">' + [['all', '全部'], ['all-only', '通用'], ['novel', '小說'], ['game', '遊戲'], ['app', 'App']].map(([k, n]) => '<button class="' + (manualTab === k ? 'on' : '') + '" data-mt="' + k + '">' + n + '</button>').join('') + '</div><div id="qrh-l"></div></div>';
  h += '<p class="muted" style="font-size:12.5px;line-height:1.7;margin:12px 2px 0">鐵律＝每一款都適用；個案經驗＝只在寫著的類型參考，不以偏概全。</p>';
  el.innerHTML = h;
  renderRules();
  $('#qrh-t', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; manualTab = b.dataset.mt; $$('#qrh-t button').forEach((x) => x.classList.toggle('on', x === b)); Snd.tick(); renderRules(); };
  el.onclick = (e) => {
    const n = e.target.closest('[data-n]'); if (n) { notamDecide(n.dataset.n, n.dataset.nv, n.closest('.notam')); return; }
    const r = e.target.closest('.rule'); if (r) { r.classList.toggle('open'); Snd.tick(); }
  };
}
function renderRules() {
  const box = $('#qrh-l'); if (!box) return;
  let rs = D.manual.rules.filter((r) => r.status === 'official');
  if (manualTab === 'all-only') rs = rs.filter((r) => r.scope === 'all');
  else if (manualTab !== 'all') rs = rs.filter((r) => r.scope === manualTab);
  box.innerHTML = rs.map((r) => '<button class="rule"><div class="rl"><span class="id">' + esc(r.id) + '</span><b>' + esc(r.title) + '</b><span class="kd ' + r.kind + '">' + (r.kind === 'law' ? '鐵律' : '個案') + '</span></div>' +
    '<div class="rx">' + esc(r.rule) + '<em>' + (r.applies ? '適用：' + esc(r.applies) + '<br>' : '') + '來源：' + esc(r.from || '') + (r.date ? '（' + esc(r.date) + '）' : '') + '</em></div></button>').join('') || '<div class="empty" style="margin:12px">這一類還沒有守則。</div>';
}

/* ---------- 機長室 ---------- */
let mergeSel = [];
function renderMe() {
  const el = $('#v-me');
  const vs = Object.values(S.votes);
  const cnt = (k) => vs.filter((v) => v.v === k).length;
  const reasons = {};
  vs.filter((v) => v.v === 'cancel').forEach((v) => (v.reasons || []).forEach((r) => { reasons[r] = (reasons[r] || 0) + 1; }));
  const rk = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  const maxR = rk.length ? rk[0][1] : 1;
  const boarded = Object.keys(S.votes).filter((k) => S.votes[k].v === 'board' && S.flights[k]).map((k) => S.flights[k]).sort((a, b) => (b._date || '').localeCompare(a._date || ''));
  const delayed = Object.keys(S.votes).filter((k) => S.votes[k].v === 'delay' && S.flights[k]).map((k) => S.flights[k]);
  mergeSel = mergeSel.filter((id) => boarded.some((f) => f.id === id));
  let h = '<div class="passport" style="margin-top:16px"><div class="pp-h">CAPTAIN · 機長</div><h2>痞子葳</h2><div class="pp-s">轉機航廈第 ' + D.index.counts.days + ' 天・航班 ' + D.index.counts.flights + ' 班・檢修 ' + D.index.counts.inspections + ' 架</div>' +
    '<div class="stats"><div><b>' + vs.length + '</b><i>表態</i></div><div><b>' + cnt('board') + '</b><i>登機</i></div><div><b>' + cnt('delay') + '</b><i>延誤</i></div><div><b>' + cnt('cancel') + '</b><i>取消</i></div>' +
    '<div><b>' + Object.keys(S.dispatched).length + '</b><i>簽派</i></div><div><b>' + S.pireps.length + '</b><i>機長報告</i></div><div><b>' + S.ideas.length + '</b><i>托運</i></div><div><b>' + S.merges.length + '</b><i>聯程</i></div></div></div>';
  h += '<div class="h2"><b>你的口味</b><i>TASTE</i><span class="r">取消的原因</span></div><div class="card bars">' +
    (rk.length ? rk.map(([r, n]) => '<div class="br"><span>' + esc(r) + '</span><u><i style="transform:scaleX(' + (n / maxR) + ')"></i></u><b>' + n + '</b></div>').join('') : '<p class="muted" style="margin:0;font-size:14px;line-height:1.7">還沒有取消過的航班。你取消時點的原因會累積在這裡，塔台出題就是照這張表在避坑。</p>') + '</div>';
  h += '<div class="h2"><b>登機證夾</b><i>WALLET</i><span class="r">' + boarded.length + ' 張</span></div>';
  if (boarded.length) {
    h += '<p class="muted" style="font-size:13px;margin:0 2px 10px">點一張打開；按住（或點左上角）選兩張可以申請「聯程」：把兩個點子合體。</p><div class="wallet" id="wallet">' + boarded.map((f) => '<button class="wl ' + lanes(f) + (mergeSel.includes(f.id) ? ' sel' : '') + '" data-wf="' + esc(f.id) + '"><span class="ck">✓</span><div class="wt"><b>' + esc(f.zh) + '</b><span class="muted" style="font-size:12px">' + LANE[f.lane].zh + '</span><span class="cd">' + esc(f.dest) + '</span></div><div class="wm">' + esc(f.no) + '・' + fmtDate(f._date || '') + (S.routes[f.id] ? '・航線 ' + esc((f.routes.find((r) => r.id === S.routes[f.id]) || {}).name || '') : '') + '</div></button>').join('') + '</div>' +
      '<button class="btn ghost" id="merge" ' + (mergeSel.length === 2 ? '' : 'disabled') + '>' + ICON.merge + (mergeSel.length === 2 ? '申請聯程：合體這兩個點子' : '選兩張登機證來聯程（已選 ' + mergeSel.length + '）') + '</button>';
  } else h += '<div class="empty">還沒有登機的航班。看到想做的點子，按「登機」就會收進來。</div>';
  if (delayed.length) h += '<div class="h2"><b>延誤中</b><i>DELAYED</i></div><div class="arrivals">' + delayed.map((f) => '<button class="arr" data-wf="' + esc(f.id) + '"><span class="d">' + fmtDate(f._date || '') + '</span><span class="ds"><b>' + esc(f.zh) + '</b>　' + esc(f.hook) + '</span></button>').join('') + '</div>';
  h += '<div class="h2"><b>托運點子</b><i>CHECK-IN</i></div><div class="card"><p class="muted" style="margin:0 0 10px;font-size:13.5px;line-height:1.6">你自己有一個還很粗的點子？丟進來。明天的塔台會把它發展成一班完整的航班：鉤子、安檢、檢查表、航線全套。</p>' +
    '<div class="lanepick" id="lp">' + ['novel', 'game', 'free'].map((k, i) => '<button class="lane-' + k + (i === 1 ? ' on' : '') + '" data-l="' + k + '">' + LANE[k].zh + '</button>').join('') + '</div>' +
    '<textarea id="idea-t" rows="3" placeholder="例如：一款在颱風夜的便利商店裡守店的遊戲"></textarea><button class="btn" id="idea-go">' + ICON.send + '托運給塔台</button>' +
    (S.ideas.length ? '<div class="qlist">' + S.ideas.slice().reverse().map((x) => '<div class="lane-' + x.lane + '"><i>' + LANE[x.lane].zh + '</i>' + esc(x.text) + '</div>').join('') + '</div>' : '') + '</div>';
  h += '<div class="h2"><b>設定</b><i>SETTINGS</i></div><div class="card">' +
    setRow('sfx', '音效', '翻牌、蓋章、廣播鈴聲') + setRow('music', '背景音樂', '航廈候機室的慢氛圍') + setRow('announce', '每天第一次打開就廣播', '先響鈴，再唸今天的航班') +
    '<div class="set"><div class="lb"><b>特效</b><i>收斂：少動畫、不震動（系統設了「減少動態效果」也會自動收斂）</i></div><div class="seg" id="fxseg"><button data-fx="full" class="' + (S.settings.fx !== 'calm' ? 'on' : '') + '">全開</button><button data-fx="calm" class="' + (S.settings.fx === 'calm' ? 'on' : '') + '">收斂</button></div></div>' +
    '<div class="set"><div class="lb"><b>塔台連線</b><i>' + (IS_WEB ? '你的表態、工單、機長報告會送到塔台，每天的排程照著出題。' : '存在 Claude 的雲端，每天的排程讀得到。') + (S.out.length ? '<br>還有 ' + S.out.length + ' 筆等塔台確認收到。' : '<br>全部都收到了。') + '</i></div><button class="chip-btn" id="sync-now">立即同步</button></div>' +
    '<div class="set"><div class="lb"><b>送不出去時</b><i>把還沒送達的紀錄複製起來，貼給 Claude 也行</i></div><button class="chip-btn" id="copy-out">' + ICON.copy + '複製</button></div>' +
    '<div class="set"><div class="lb"><b>重看開場</b><i>翻牌開場＋廣播再來一次</i></div><button class="chip-btn" id="replay">播放</button></div>' +
    '<div class="set"><div class="lb"><b>版本</b><i>轉機 TURNAROUND v' + VERSION + (IS_WEB ? '・網頁版' : '・Claude 版') + '</i></div></div></div>';
  el.innerHTML = h;
  el.onclick = (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.set) { S.settings[t.dataset.set] = !S.settings[t.dataset.set]; t.classList.toggle('on', S.settings[t.dataset.set]); save(); Snd.init(); Snd.tick(); haptic(8); if (t.dataset.set === 'music') Snd.music(true); return; }
    if (t.dataset.fx) { S.settings.fx = t.dataset.fx; save(); $$('#fxseg button').forEach((b) => b.classList.toggle('on', b === t)); document.documentElement.classList.toggle('reduce', reduced()); Snd.tick(); return; }
    if (t.dataset.l) { $$('#lp button').forEach((b) => b.classList.toggle('on', b === t)); Snd.tick(); return; }
    if (t.id === 'idea-go') {
      const tx = ($('#idea-t').value || '').trim(); if (tx.length < 4) { toast('多寫幾個字，塔台才知道怎麼發展'); Snd.beep(false); return; }
      const lane = ($('#lp .on') || {}).dataset ? $('#lp .on').dataset.l : 'game';
      const x = { id: S.dev + '-i' + (S.seq + 1), lane, text: tx.slice(0, 500), t: now() };
      S.ideas.push(x); emit('idea', { lane, text: x.text }); Snd.tear(); setTimeout(() => Snd.beep(true), 250); haptic(16);
      toast('托運成功：明天塔台會把它發展成一班航班'); renderMe(); return;
    }
    if (t.dataset.wf) {
      if (e.target.closest('.ck') || t.dataset.lp === '1') { toggleMerge(t.dataset.wf); return; }
      go('#f/' + t.dataset.wf); return;
    }
    if (t.id === 'merge') {
      const [a, b] = mergeSel.map((id) => S.flights[id]); if (!a || !b) return;
      const m = { id: S.dev + '-m' + (S.seq + 1), a: a.id, b: b.id, t: now() };
      S.merges.push(m); emit('merge', { a: a.id, b: b.id, za: a.zh, zb: b.zh });
      const text = '我在《轉機》想申請「聯程」：把《' + a.zh + '》和《' + b.zh + '》兩個點子合體，看能不能長出更厚的新作品。\n\n【A《' + a.zh + '》】' + a.hook + '\n' + a.pitch + '\n\n【B《' + b.zh + '》】' + b.hook + '\n' + b.pitch + '\n\n請照飛行手冊，提 2～3 個合體方向；先只討論，等我說「開工」。';
      copyText(text).then(() => { Snd.whoosh(); FX.takeoff(t); toast('聯程申請送出！也複製好了，可以直接貼給 Claude 聊<br><a href="https://claude.ai/new" target="_blank" rel="noopener">打開 Claude</a>', 6000); mergeSel = []; renderMe(); });
      return;
    }
    if (t.id === 'sync-now') { Snd.beep(true); Sync.flush(true); App.checkInbox(true); toast(IS_WEB ? '已送出，塔台每小時收一次' : '已存到雲端'); return; }
    if (t.id === 'copy-out') { copyText('《轉機》還沒送達塔台的紀錄（請幫我收進 apps/turnaround/data/inbox.json）：\n' + JSON.stringify({ v: 1, dev: S.dev, ev: S.out })).then(() => toast('已複製 ' + S.out.length + ' 筆')); return; }
    if (t.id === 'replay') { const d = D.days[D.index.latest]; if (d) App.intro(d, true); }
  };
  // 按住登機證＝選取聯程
  const wl = $('#wallet', el);
  if (wl) {
    let tm = 0;
    wl.addEventListener('pointerdown', (e) => { const c = e.target.closest('.wl'); if (!c) return; tm = setTimeout(() => { c.dataset.lp = '1'; toggleMerge(c.dataset.wf); setTimeout(() => { c.dataset.lp = ''; }, 400); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((k) => wl.addEventListener(k, () => clearTimeout(tm)));
  }
}
function toggleMerge(id) {
  if (mergeSel.includes(id)) mergeSel = mergeSel.filter((x) => x !== id); else { mergeSel.push(id); if (mergeSel.length > 2) mergeSel.shift(); }
  Snd.tick(); haptic(12); renderMe();
}
function setRow(k, b, i) { return '<div class="set"><div class="lb"><b>' + b + '</b><i>' + i + '</i></div><button class="tg' + (S.settings[k] ? ' on' : '') + '" data-set="' + k + '" aria-label="' + b + '"></button></div>'; }

/* ---------- 頁、抽屜、燈箱 ---------- */
function openPage(html, id) {
  closePages(true);
  const pg = document.createElement('div'); pg.className = 'page'; pg.id = id; pg.innerHTML = html;
  $('#pages').appendChild(pg);
  document.body.style.overflow = 'hidden';
  pg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { back(); } });
  Snd.tear();
  return pg;
}
function closePages(instant) {
  $$('#pages .page').forEach((p) => { if (instant) p.remove(); else { p.classList.add('out'); setTimeout(() => p.remove(), 280); } });
  document.body.style.overflow = '';
  Voice.stop();
  const ab = $('.actbar'); if (ab && instant) ab.remove();
}
function openSheet(html) {
  const s = $('#sheet'); s.innerHTML = '<div class="sh"><div class="sh-grab"></div>' + html + '</div>'; s.hidden = false;
  s.onclick = (e) => { if (e.target === s || e.target.closest('[data-close]')) closeSheet(); };
  Snd.tick(); return s;
}
function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; }
function lightbox(src, cap) {
  const l = $('#lightbox'); l.innerHTML = '<img alt="" src="' + esc(src) + '"><p>' + esc(cap || '') + '</p><button class="chip-btn">關閉</button>'; l.hidden = false;
  l.onclick = () => { l.hidden = true; l.innerHTML = ''; };
}

/* ---------- 特效：起飛（畫在一張全螢幕畫布上，飛完就停） ---------- */
const FX = {
  takeoff(fromEl) {
    if (reduced()) return;
    const cv = $('#fx'); const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = fromEl ? fromEl.getBoundingClientRect() : { left: W / 2, top: H - 100, width: 0, height: 0 };
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2, x1 = W + 60, y1 = -60, cx = x0 + (x1 - x0) * 0.15, cy = y0 - 40;
    const trail = []; const t0 = performance.now(); const dur = 1100;
    const plane = new Path2D('M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur); const e = k * k * (3 - 2 * k) * 0.6 + k * k * 0.4;
      const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1;
      const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1;
      trail.push({ x, y, a: 1 });
      g.clearRect(0, 0, W, H);
      trail.forEach((p) => { p.a -= 0.028; if (p.a > 0) { g.globalAlpha = p.a * 0.5; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 7); g.fill(); } });
      const nx = trail.length > 1 ? trail[trail.length - 2] : { x: x0, y: y0 };
      const ang = Math.atan2(y - nx.y, x - nx.x) + Math.PI / 2;
      g.globalAlpha = 1; g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.6 + e, 1.6 + e); g.translate(-12, -12); g.fillStyle = '#ffd21a'; g.fill(plane); g.restore();
      if (k < 1 || trail.some((p) => p.a > 0)) requestAnimationFrame(step); else g.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(step);
  },
};

/* ---------- 塔台連線（只有 Claude 版：直接問 Claude） ---------- */
const Tower = {
  sample: null, threads: {},
  ok() { return !!this.sample; },
  async init() {
    if (IS_WEB || !window.claude || typeof window.claude.use !== 'function') return;
    try { this.sample = await window.claude.use('sample'); } catch (e) { this.sample = null; }
    if (this.sample && App.ready) App.refresh(true);
  },
  sys() {
    const law = D.manual.rules.filter((r) => r.status === 'official').map((r) => '・' + r.title + '：' + r.rule).join('\n');
    return '你是《轉機》航廈的塔台，也是痞子葳的創作夥伴。一律用繁體中文、稱呼他「痞子葳」，口吻像可靠的塔台：簡潔、直接、有判斷；該唱反調就唱反調，不拍馬屁。只討論、不開工（他說「開工」才動手）。回答控制在 250 字內，必要時用條列。\n\n飛行手冊（他定下的創作守則）：\n' + law;
  },
  bind(box, key, ctxFn) {
    if (!box) return;
    const th = this.threads[key] || (this.threads[key] = []);
    const list = $('.chat', box), ta = $('textarea', box), btn = $('.chat-in button', box);
    const paint = () => { list.innerHTML = th.map((m) => '<div class="msg ' + (m.role === 'user' ? 'me' : 'tw') + '">' + esc(m.content) + '</div>').join('') || '<p class="muted" style="margin:0;font-size:13.5px">直接問塔台。例如：「這個點子最弱的地方怎麼補？」「三條航線你會選哪條？」</p>'; };
    paint();
    btn.onclick = async () => {
      const q = (ta.value || '').trim(); if (!q || this.busy) return;
      Snd.init(); this.busy = true; ta.value = '';
      th.push({ role: 'user', content: q }); paint();
      const live = document.createElement('div'); live.className = 'msg tw'; live.textContent = '…'; list.appendChild(live);
      const msgs = [{ role: 'user', content: this.sys() + '\n\n【這次要聊的】\n' + ctxFn() + '\n\n痞子葳問：' + th[0].content }];
      th.slice(1).forEach((m) => msgs.push({ role: m.role, content: m.content }));
      try {
        const r = await this.sample(msgs, { cache: false, onText: ({ text }) => { live.textContent = text; } });
        th.push({ role: 'assistant', content: r.text || live.textContent }); Snd.beep(true);
      } catch (e) {
        th.pop(); ta.value = q;
        live.textContent = e && e.code === 'rate_limited' ? '塔台忙線中，等一下再問。' : e && e.code === 'not_granted' ? '塔台連線沒有開放。' : '塔台沒有回應，再試一次。';
      }
      this.busy = false; paint();
    };
  },
};
