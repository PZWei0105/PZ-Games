/* 轉機 — 2026/11/18 超級大更新：開場「今日出發看板」、機長分頁「航線雷達」
   - 開場：翻牌轉機／TURNAROUND／日期之後，今天的每一班航班（時間、班號、目的地代碼、名字、登機門）一列一列翻上看板，
     最後一列是今天進廠的作品；一架飛機掠過看板起飛。全部是今天 day 檔裡的真實航班。
   - 航線雷達：塔台雷達幕。每一班航班是一個光點：方位＝登機門（小說、遊戲、自由、探索各一個空域），
     離中心多遠＝多久以前（越近越靠中心），顏色＝你的表態（登機綠、延誤黃、取消紅、還沒表態白色閃）。
     點光點打開那張登機證。下面一行一行寫各空域飛過幾班、登機幾班，還有「還沒登機過的空域」——
     不是要縮小題材，是提醒哪一區你還沒試過（守則 m-x06 不扼殺創意）。 */

/* ---------- 開場：今日出發看板 ---------- */
function introBoardHtml(day) {
  const rows = day.flights.map((f, i) => {
    const v = S.votes[f.id]; const st = v ? STATUS[v.v] : null;
    return '<div class="ixr lane-' + f.lane + '" style="--i:' + i + '"><span class="ixt">' + Flap.html(f.time || '--:--', 'sm') + '</span><span class="ixn">' + Flap.html(f.no || '', 'sm amber') + '</span><span class="ixd">' + Flap.html(f.dest || '', 'sm') + '</span><b class="ixz">' + esc(f.zh || '') + '</b><span class="ixg">' + esc(f.gate || '') + '</span><i class="ixs ' + (v ? v.v : '') + '">' + (st ? st[1] : 'BOARDING') + '</i></div>';
  }).join('');
  const ins = day.inspection; const w = ins && D.fleetBy[ins.work];
  const hang = ins ? '<div class="ixr hang" style="--i:' + day.flights.length + '"><span class="ixt">' + Flap.html('MRO', 'sm') + '</span><span class="ixn">' + Flap.html(w ? (w.reg || 'B-PZ') : 'B-PZ', 'sm amber') + '</span><span class="ixd"></span><b class="ixz">' + esc(w ? w.zh || '' : '') + '</b><span class="ixg">H1</span><i class="ixs y">' + (S.dispatched[ins.id] ? 'DISPATCHED' : 'IN SERVICE') + '</i></div>' : '';
  return '<div class="ixb"><div class="ixh"><span>DEPARTURES · 今日出發</span><span>' + fmtDate(day.date) + '</span></div>' + rows + hang + '<i class="ixplane">' + ICON.plane + '</i></div>';
}

/* ---------- 航線雷達 ---------- */
const RADAR = { raf: 0, idle: 0, blips: [], hit: null, t0: 0, sweeps: 0 };
const SECTOR = { novel: -Math.PI * 0.75, game: -Math.PI * 0.25, free: Math.PI * 0.25, explore: Math.PI * 0.75 };   // 四個空域的中心方位
const LANE_COL = { novel: '#ff7a59', game: '#4c9dff', free: '#b98cff', explore: '#2fe0c8' };
const RD_SPAN = 30;   // 雷達最外圈＝30 天前
/** 幾天前 → 離中心多遠（對數，今天、昨天、上週分得開） */
const rdR = (days) => 0.2 + 0.72 * Math.log1p(Math.min(days, RD_SPAN)) / Math.log1p(RD_SPAN);
/** 所有看得到的航班：載入過的每一天＋登機證夾的快照（舊的日子不用再載） */
function radarFlights() {
  const out = new Map();
  for (const [date, day] of Object.entries(D.days)) if (day && day.flights) day.flights.forEach((f) => out.set(f.id, Object.assign({}, f, { _date: date })));
  for (const [id, f] of Object.entries(S.flights)) if (!out.has(id) && f && f._date) out.set(id, f);
  return [...out.values()];
}
async function radarLoad() {
  const want = (D.index.days || []).slice(0, RD_SPAN).map((d) => d.date).filter((d) => !(d in D.days)).slice(0, 12);
  if (!want.length) return false;
  let got = false;
  // 直接讀、讀不到就算了（不跳「這一天的航班讀不到」；Claude 版本來就只帶最近幾天）
  await Promise.all(want.map(async (d) => { try { const j = await App.getJSON('data/days/' + d + '.json'); if (j) { D.days[d] = j; got = true; } } catch (e) { /* 不畫那一天 */ } }));
  return got;
}
function radarStats(fl) {
  const st = {};
  Object.keys(LANE).forEach((k) => { st[k] = { n: 0, board: 0, delay: 0, cancel: 0 }; });
  fl.forEach((f) => { const s = st[f.lane]; if (!s) return; s.n++; const v = S.votes[f.id]; if (v && s[v.v] != null) s[v.v]++; });
  return st;
}
function radarHtml() {
  const fl = radarFlights();
  const st = radarStats(fl);
  const empty = Object.keys(LANE).filter((k) => st[k].n && !st[k].board);
  return '<div class="h2" id="radar-h"><b>航線雷達</b><i>RADAR</i><span class="r">' + fl.length + ' 班航班</span></div>' +
    '<div class="radar card"><div class="rd-wrap"><canvas id="rd-cv" aria-label="航線雷達：每一班航班的方位、遠近與你的表態"></canvas><div class="rd-tip" id="rd-tip" hidden></div></div>' +
    '<div class="rd-leg"><span><i class="g"></i>登機</span><span><i class="a"></i>延誤</span><span><i class="r"></i>取消</span><span><i class="w"></i>還沒表態</span><span class="rd-r">越靠中心越新・外圈 ' + RD_SPAN + ' 天前</span></div>' +
    '<div class="rd-rows">' + Object.keys(LANE).map((k) => { const s = st[k]; return '<div class="rd-row" style="--lc:' + LANE_COL[k] + '"><b>' + LANE[k].zh + '<em>' + LANE[k].gate + '</em></b><span>飛過 ' + s.n + ' 班</span><span class="g">登機 ' + s.board + '</span><span class="a">延誤 ' + s.delay + '</span><span class="r">取消 ' + s.cancel + '</span><u><i style="transform:scaleX(' + (s.n ? s.board / s.n : 0) + ')"></i></u></div>'; }).join('') + '</div>' +
    (empty.length ? '<p class="rd-note">還沒登機過的空域：' + empty.map((k) => '<b style="color:' + LANE_COL[k] + '">' + LANE[k].zh + '</b>').join('、') + '。不是要你一定要飛，只是提醒那一區還有沒試過的天空。</p>' : '') + '</div>';
}
function radarStart() {
  const cv = $('#rd-cv'); if (!cv) return;
  cancelAnimationFrame(RADAR.raf); clearTimeout(RADAR.idle); RADAR.sweeps = 0;
  const box = cv.parentNode;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { const w = box.clientWidth; cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr); cv.style.width = w + 'px'; cv.style.height = w + 'px'; return w; };
  let W = size();
  const g = cv.getContext('2d');
  const today = D.index.latest;
  const days = (a) => Math.max(0, Math.round((new Date(today + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5));
  RADAR.blips = radarFlights().map((f) => {
    const h = hash32(f.id);
    const ang = (SECTOR[f.lane] ?? 0) + (((h % 1000) / 1000) - 0.5) * (Math.PI / 2.6);
    const r = rdR(days(f._date || today)) + ((h >> 10) % 100) / 100 * 0.04;
    const v = S.votes[f.id]; const s = v ? v.v : (f._date === today ? 'live' : 'old');
    return { f, ang, r, s, lit: 0 };
  });
  RADAR.t0 = performance.now();
  const COL = { board: '#2fe07f', delay: '#ffb21e', cancel: '#ff4b3e', live: '#ffffff', old: '#5d6672' };
  const calm = reduced();
  let lastSweep = -1;
  const draw = (now) => {
    if (!cv.isConnected) { cancelAnimationFrame(RADAR.raf); return; }
    // 換到別的分頁、App 在背景：不畫，0.7 秒後再看一次（省電）
    if (!calm && (document.hidden || !cv.offsetParent)) { RADAR.idle = setTimeout(() => { RADAR.raf = requestAnimationFrame(draw); }, 700); return; }
    const t = (now - RADAR.t0) / 1000;
    const R0 = W / 2 - 6, cx = W / 2, cy = W / 2;
    const on = calm ? 1 : Math.min(1, t / 0.8), ease = 1 - Math.pow(1 - on, 3);   // 開機：雷達幕從中心展開
    const R = R0 * (0.2 + 0.8 * ease);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, W);
    // 幕：深綠底、四圈距離環、十字、四個空域的扇形
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, '#0d1a14'); bg.addColorStop(1, '#050807');
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    Object.entries(SECTOR).forEach(([k, a]) => {
      g.fillStyle = LANE_COL[k] + '14'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - Math.PI / 4 + 0.02, a + Math.PI / 4 - 0.02); g.closePath(); g.fill();
      g.fillStyle = LANE_COL[k]; g.font = '800 ' + Math.round(Math.max(11, R * 0.075)) + 'px "Barlow Condensed","Arial Narrow",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(LANE[k].en, cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    });
    g.strokeStyle = 'rgba(47,224,127,.22)'; g.lineWidth = 1;
    const RINGS = [[1, '1D'], [7, '7D'], [15, '15D'], [RD_SPAN, RD_SPAN + 'D']];
    RINGS.forEach(([d]) => { g.beginPath(); g.arc(cx, cy, R * rdR(d), 0, Math.PI * 2); g.stroke(); });
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.fillStyle = 'rgba(47,224,127,' + (0.6 * ease).toFixed(2) + ')'; g.font = '700 10px "JetBrains Mono",monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    RINGS.forEach(([d, s]) => g.fillText(s, cx + 4, cy - R * rdR(d) - 4));
    // 掃描線：4 秒一圈
    const sw = calm ? -Math.PI / 2 : ((t / 4) % 1) * Math.PI * 2 - Math.PI / 2;
    if (!calm) {
      for (let i = 0; i < 24; i++) {
        const a0 = sw - (i + 1) * 0.035;
        g.fillStyle = 'rgba(47,224,127,' + (0.16 * (1 - i / 24)).toFixed(3) + ')';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a0 + 0.036); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(120,255,170,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sw) * R, cy + Math.sin(sw) * R); g.stroke();
    }
    // 光點：掃到的那一下亮起來，慢慢退回
    const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    RADAR.blips.forEach((b) => {
      const d = norm(sw - b.ang);
      if (!calm && d < 0.08) { if (b.lit < 0.5 && b.s === 'live' && RADAR.sweeps < 3 && now - lastSweep > 500) { lastSweep = now; Snd.ping(); } b.lit = 1; }   // 還沒表態的光點：前三圈掃到時「咚」一聲
      b.lit = Math.max(calm ? 0.6 : 0.25, b.lit - 0.012);
      const x = cx + Math.cos(b.ang) * b.r * R, y = cy + Math.sin(b.ang) * b.r * R;
      if (ease < 1) b.lit = Math.min(b.lit, ease);
      b.x = x; b.y = y;
      const c = COL[b.s] || COL.old;
      const pulse = b.s === 'live' && !calm ? 0.5 + 0.5 * Math.sin(t * 4 + b.ang) : 0;
      g.globalAlpha = Math.min(1, 0.35 + b.lit * 0.65);
      g.fillStyle = c; g.beginPath(); g.arc(x, y, 4 + pulse * 2, 0, Math.PI * 2); g.fill();
      if (b.lit > 0.6 || b.s === 'live') { g.strokeStyle = c; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 8 + (1 - b.lit) * 8 + pulse * 3, 0, Math.PI * 2); g.stroke(); }
      if (b.s === 'live' || b === RADAR.hit) {
        // 標籤往外放（左半邊靠右對齊），不擠在塔台上
        const left = Math.cos(b.ang) < 0;
        g.globalAlpha = ease; g.fillStyle = '#e6fff0'; g.font = '700 10px "JetBrains Mono",monospace'; g.textAlign = left ? 'right' : 'left'; g.textBaseline = 'middle';
        g.fillText(b.f.no || '', x + (left ? -11 : 11), y + (Math.sin(b.ang) < 0 ? -9 : 9));
      }
      g.globalAlpha = 1;
    });
    // 中心：塔台
    g.fillStyle = '#ffd21a'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,210,26,.5)'; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.stroke();
    const turn = Math.floor(t / 4); if (turn !== RADAR.turn) { RADAR.turn = turn; RADAR.sweeps = turn; }
    if (!calm) RADAR.raf = requestAnimationFrame(draw);
  };
  RADAR.raf = requestAnimationFrame(draw);
  const pick = (ev) => {
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let best = null, bd = 22;
    RADAR.blips.forEach((b) => { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } });
    return best;
  };
  cv.onclick = (ev) => {
    const b = pick(ev); if (!b) return;
    RADAR.hit = b; Snd.tick(); haptic(10);
    const tip = $('#rd-tip');
    const v = S.votes[b.f.id];
    tip.innerHTML = '<b>' + esc(b.f.zh) + '</b><span>' + esc(b.f.no) + '・' + LANE[b.f.lane].zh + '・' + fmtDate(b.f._date || '') + '</span><span>' + (v ? STATUS[v.v][0] : b.s === 'live' ? '等你表態' : '沒表態') + '</span><button class="chip-btn y" data-f="' + esc(b.f.id) + '">打開登機證</button>';
    tip.hidden = false;
    tip.style.left = Math.min(Math.max(8, b.x - 90), cv.clientWidth - 188) + 'px';
    tip.style.top = Math.min(b.y + 14, cv.clientHeight - 110) + 'px';
    if (calm) draw(performance.now());
  };
  addEventListener('resize', () => { if (cv.isConnected) W = size(); }, { once: true });
}
