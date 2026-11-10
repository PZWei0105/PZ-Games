/* ───────────── 戰役：地圖、回合、敵方勢力、基地、出擊準備、劇情 ───────────── */
let CAMP = null;
const RIVALS = ['kaz', 'holder', 'ilya', 'severin'];

function campDefault() {
  const own = {}; for (const k in SECTORS) own[k] = SECTORS[k].own;
  return {
    v: 1, day: 1, money: 160, own, bld: { hq: 1, bar: 2, mot: 0, air: 0, art: 1 },
    deck: ['rifle', 'mg', 'at', 'mortar', 'boiler', 'smoke', 'medic'], heroes: ['boiler'],
    fates: {}, doctrines: [], seen: {}, log: [], threats: [], beaten: [], ending: null, done: false, wins: 0, losses: 0, kills: 0,
  };
}
function campNew() { CAMP = campDefault(); campSave(); store.set('campDay', CAMP); }
function campLoad() { CAMP = store.get('camp', null) || campDefault(); }
function campSave() { if (CAMP) store.set('camp', CAMP); }
function campSummary() { const c = store.get('camp', null); if (!c) return ''; const n = Object.values(c.own).filter((o) => o === 'us').length; return `第 ${c.day} 天・${n} 個據點`; }
function logAdd(txt) { CAMP.log.unshift({ d: CAMP.day, t: txt }); if (CAMP.log.length > 40) CAMP.log.length = 40; }
function owned(f) { return Object.keys(CAMP.own).filter((k) => CAMP.own[k] === f); }
function neighbors(s) { const out = []; for (const [a, b] of ROADS) { if (a === s) out.push(b); else if (b === s) out.push(a); } return out; }
function income() { return owned('us').reduce((a, k) => a + SECTORS[k].inc, 0); }
function rivalAlive(f) { const cap = Object.keys(SECTORS).find((k) => SECTORS[k].own === f && SECTORS[k].cap); return CAMP.own[cap] === f; }
function finalAct() { return ['kaz', 'holder', 'ilya'].every((f) => !rivalAlive(f)); }

/* ── 解鎖與加成：全部從基地等級推算 ── */
function unlocked() {
  const b = CAMP.bld, u = ['rifle', 'mg'];
  if (b.bar >= 2) u.push('at', 'mortar');
  if (b.bar >= 3) u.push('sniper', 'flame');
  if (b.mot >= 1) u.push('apc');
  if (b.mot >= 2) u.push('tank');
  if (b.mot >= 3) u.push('aa');
  if (b.mot >= 4) u.push('mlrs');
  if (b.air >= 1) u.push('heli');
  if (b.art >= 1) u.push('smoke', 'medic');
  if (b.art >= 2) u.push('barrage');
  if (b.art >= 3) u.push('airstrike');
  if (b.air >= 2) u.push('para');
  for (const h of CAMP.heroes) u.push(h);
  return u;
}
function hasDoc(d) { return CAMP.doctrines.includes(d); }
function battleMods() {
  const b = CAMP.bld;
  return {
    lv: { inf: (b.bar >= 4 ? 1 : 0) + (b.bar >= 5 ? 1 : 0), veh: (b.mot >= 5 ? 1.25 : 0) + (CAMP.own.foundry === 'us' ? 1 : 0) + (hasDoc('steel') ? 1.25 : 0), air: (b.air >= 3 ? 1.67 : 0) + (hasDoc('sky') ? 1.67 : 0) },
    supMax: 10 + (b.hq - 1) + (hasDoc('rush') ? 1 : 0),
    regen: 0.42 * (1 + 0.05 * (b.hq - 1)),
    hqHp: 4500 * (b.hq >= 5 ? 1.3 : 1),
    cdMul: (b.art >= 4 ? 0.8 : 1) * (hasDoc('sky') ? 0.85 : 1),
  };
}
function diffOf(sid) {
  const s = SECTORS[sid], f = CAMP.own[sid];
  const tier = { kaz: 0, holder: 1, ilya: 1.2, severin: 2, none: -0.5 }[f] || 0;
  return tier + (s.cap ? 1 : 0) + CAMP.day / 9 + CAMP.beaten.length * 0.35;
}

/* ── 戰役地圖場景 ── */
const MAPV = { sel: null, t: 0, bg: null, ox: 0, oy: 0, s: 1, hover: null, arrows: [] };
function goMap() {
  G.scene = 'map'; B = null; PT.clear();
  if (!CAMP) campLoad();
  setLoop('rotor', 0); setLoop('engine', 0); setLoop('fire', 0); setLoop('wind', 0.04);
  if (!MAPV.bg) buildMapBG();
  MAPV.sel = MAPV.sel && SECTORS[MAPV.sel] ? MAPV.sel : null;
  buildMapUI();
  show('map');
  mapLayout();
  campSave();
  checkStoryOnMap();
}
function mapLayout() {
  const panel = Math.min(312, VIEW.w * 0.36), top = 50, bot = 56;
  const aw = VIEW.w - panel - 16, ah = VIEW.h - top - bot;
  MAPV.s = Math.min(aw / 1000, ah / 600);
  MAPV.ox = 8 + (aw - 1000 * MAPV.s) / 2; MAPV.oy = top + (ah - 600 * MAPV.s) / 2;
}
function m2s(x, y) { return [MAPV.ox + x * MAPV.s, MAPV.oy + y * MAPV.s]; }
function buildMapBG() {
  const R = mulberry32(42);
  MAPV.bg = mkSpr(null, 0, 0, 1000, 600, (g) => {
    g.fillStyle = lg(g, 0, 0, 0, 600, [0, '#dfe7ee', 1, '#cfd9e2']); g.fillRect(-10, -10, 1020, 620);
    // 地形：遠方的山
    const mtn = (x, y, w, h) => { g.fillStyle = lg(g, x, y - h, x, y, [0, '#a9b7c4', 1, '#8a99a8']); g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - h); g.lineTo(x + w, y); g.closePath(); g.fill(); g.fillStyle = '#f4f8fb'; g.beginPath(); g.moveTo(x - w * 0.35, y - h * 0.65); g.lineTo(x, y - h); g.lineTo(x + w * 0.35, y - h * 0.65); g.lineTo(x + w * 0.1, y - h * 0.55); g.closePath(); g.fill(); };
    for (let i = 0; i < 26; i++) mtn(640 + R() * 360, 200 + R() * 220, 30 + R() * 30, 40 + R() * 50);
    for (let i = 0; i < 18; i++) mtn(R() * 1000, 30 + R() * 60, 26 + R() * 30, 30 + R() * 40);
    // 冰湖、河流
    g.fillStyle = 'rgba(160,205,232,.65)'; g.beginPath(); g.ellipse(420, 380, 70, 30, -0.2, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(420, 380, 60, 22, -0.2, 3.6, 5.2); g.stroke();
    g.strokeStyle = 'rgba(150,196,224,.8)'; g.lineWidth = 9; g.beginPath(); g.moveTo(540, 0); g.bezierCurveTo(600, 200, 520, 380, 640, 600); g.stroke();
    g.strokeStyle = 'rgba(220,238,248,.9)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(160,205,232,.55)'; g.beginPath(); g.ellipse(260, 70, 160, 40, 0.1, 0, TAU); g.fill();
    // 森林
    for (let i = 0; i < 260; i++) {
      const cx = [[160, 160], [330, 300], [720, 470], [480, 200], [880, 120], [120, 470]][i % 6];
      const x = cx[0] + (R() - 0.5) * 140, y = cx[1] + (R() - 0.5) * 90, h = 7 + R() * 6;
      g.fillStyle = R() > 0.5 ? '#5d7468' : '#4d6459'; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.4, y); g.lineTo(x - h * 0.4, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - 1, y - h + 1, 2, 2);
    }
    // 紙張質感
    for (let i = 0; i < 5000; i++) { g.fillStyle = R() > 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(80,100,120,.05)'; g.fillRect(R() * 1000, R() * 600, 1.4, 1.4); }
    // 經緯線
    g.strokeStyle = 'rgba(70,90,110,.09)'; g.lineWidth = 1; for (let x = 0; x < 1000; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 600); g.stroke(); } for (let y = 0; y < 600; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(1000, y); g.stroke(); }
  }, 2);
}
SCENES.map = {
  update(dt, rdt) { MAPV.t += rdt; },
  render(c) {
    const dpr = VIEW.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#0d1218'; c.fillRect(0, 0, VIEW.w, VIEW.h);
    const s = MAPV.s;
    c.save(); c.translate(MAPV.ox, MAPV.oy); c.scale(s, s);
    c.drawImage(MAPV.bg.c, -MAPV.bg.ox, -MAPV.bg.oy, MAPV.bg.w, MAPV.bg.h);
    // 勢力範圍
    c.save(); c.beginPath(); c.rect(0, 0, 1000, 600); c.clip();
    for (const k in SECTORS) {
      const S = SECTORS[k], f = CAMP.own[k], col = FACTION[f].color;
      c.fillStyle = rg(c, S.x, S.y, 0, 95, [0, rgba(col, 0.42), 0.6, rgba(col, 0.18), 1, rgba(col, 0)]);
      c.beginPath(); c.arc(S.x, S.y, 95, 0, TAU); c.fill();
    }
    c.restore();
    c.strokeStyle = 'rgba(30,30,40,.35)'; c.lineWidth = 1.5; c.strokeRect(0, 0, 1000, 600);
    // 道路
    c.lineCap = 'round';
    for (const [a, b] of ROADS) {
      const A = SECTORS[a], Bb = SECTORS[b];
      const same = CAMP.own[a] === CAMP.own[b];
      c.strokeStyle = 'rgba(40,40,50,.35)'; c.lineWidth = 5; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bb.x, Bb.y); c.stroke();
      c.strokeStyle = same ? rgba(FACTION[CAMP.own[a]].color, 0.9) : '#f2efe6'; c.lineWidth = 2.2; c.setLineDash(same ? [] : [6, 5]); c.stroke(); c.setLineDash([]);
    }
    // 可以進攻的路：發亮
    for (const k of attackable()) {
      for (const n of neighbors(k)) if (CAMP.own[n] === 'us') {
        const A = SECTORS[n], Bb = SECTORS[k];
        c.strokeStyle = `rgba(157,255,92,${0.5 + Math.sin(MAPV.t * 4) * 0.3})`; c.lineWidth = 3.4; c.setLineDash([10, 8]); c.lineDashOffset = -MAPV.t * 30;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bb.x, Bb.y); c.stroke(); c.setLineDash([]);
      }
    }
    // 威脅箭頭
    for (const th of CAMP.threats) drawThreat(c, th);
    // 據點
    for (const k in SECTORS) drawNode(c, k);
    c.restore();
  },
  down(x, y) { MAPV.press = [x, y]; },
  up(x, y) {
    if (!MAPV.press || Math.hypot(x - MAPV.press[0], y - MAPV.press[1]) > 14) return;
    let best = null, bd = 30;
    for (const k in SECTORS) { const [sx, sy] = m2s(SECTORS[k].x, SECTORS[k].y); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = k; } }
    if (best) { MAPV.sel = best; sfx('tick'); renderMapPanel(); }
  },
};
function attackable() {
  const out = [];
  for (const k in SECTORS) {
    if (CAMP.own[k] === 'us') continue;
    if (SECTORS[k].locked && !finalAct()) continue;
    if (neighbors(k).some((n) => CAMP.own[n] === 'us')) out.push(k);
  }
  return out;
}
function drawThreat(c, th) {
  const A = SECTORS[th.from], Bb = SECTORS[th.to];
  const t = (MAPV.t * 0.8) % 1;
  const col = FACTION[th.fac].color;
  const dx = Bb.x - A.x, dy = Bb.y - A.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  c.strokeStyle = rgba(col, 0.9); c.lineWidth = 5; c.beginPath(); c.moveTo(A.x + ux * 24, A.y + uy * 24); c.lineTo(Bb.x - ux * 30, Bb.y - uy * 30); c.stroke();
  const hx = Bb.x - ux * 26, hy = Bb.y - uy * 26;
  c.fillStyle = col; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - ux * 14 - uy * 9, hy - uy * 14 + ux * 9); c.lineTo(hx - ux * 14 + uy * 9, hy - uy * 14 - ux * 9); c.closePath(); c.fill();
  const px = lerp(A.x, Bb.x, t), py = lerp(A.y, Bb.y, t);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 3.4, 0, TAU); c.fill();
}
function drawNode(c, k) {
  const S = SECTORS[k], f = CAMP.own[k], col = FACTION[f].color;
  const sel = MAPV.sel === k, atk = attackable().includes(k);
  const r = S.cap ? 19 : 14;
  if (sel) { c.strokeStyle = '#ffd36a'; c.lineWidth = 3; c.beginPath(); c.arc(S.x, S.y, r + 7 + Math.sin(MAPV.t * 5) * 2, 0, TAU); c.stroke(); }
  if (atk) { c.strokeStyle = `rgba(157,255,92,${0.6 + Math.sin(MAPV.t * 4) * 0.3})`; c.lineWidth = 2; c.beginPath(); c.arc(S.x, S.y, r + 4, 0, TAU); c.stroke(); }
  c.fillStyle = 'rgba(20,24,30,.35)'; c.beginPath(); c.ellipse(S.x, S.y + r * 0.9, r * 1.1, r * 0.35, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(S.x, S.y, r, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a1720'; c.stroke();
  c.beginPath(); c.arc(S.x, S.y, r - 4, 0, TAU); c.fillStyle = '#1d232b'; c.fill();
  nodeIcon(c, S.icon, S.x, S.y, r - 6, col);
  if (S.locked && !finalAct()) { c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(S.x, S.y, r - 4, 0, TAU); c.fill(); c.strokeStyle = '#ffd36a'; c.lineWidth = 2; c.strokeRect(S.x - 4, S.y - 2, 8, 7); c.beginPath(); c.arc(S.x, S.y - 3, 3.4, Math.PI, TAU); c.stroke(); }
  c.font = `900 ${(S.cap ? 14 : 12.5) / Math.max(0.8, MAPV.s)}px "Noto Sans TC","PingFang TC",sans-serif`; c.textAlign = 'center';
  c.lineWidth = 3.4; c.strokeStyle = 'rgba(240,244,248,.92)'; c.strokeText(S.name, S.x, S.y + r + 14); c.fillStyle = '#1a1f26'; c.fillText(S.name, S.x, S.y + r + 14);
}
function nodeIcon(c, ic, x, y, r, col) {
  c.save(); c.translate(x, y); c.fillStyle = '#eef2f5'; c.strokeStyle = '#eef2f5'; c.lineWidth = 1.6;
  const s = r / 8;
  c.scale(s, s);
  if (ic === 'hq' || ic === 'cap') { c.beginPath(); c.moveTo(-1, 7); c.lineTo(-1, -7); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(-1, -7); c.lineTo(7, -4); c.lineTo(-1, -1); c.closePath(); c.fill(); if (ic === 'cap') { c.fillStyle = '#ffd36a'; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; c.lineTo(-5 + Math.cos(a) * 3, 4 + Math.sin(a) * 3); c.lineTo(-5 + Math.cos(a + 0.63) * 1.3, 4 + Math.sin(a + 0.63) * 1.3); } c.fill(); } }
  else if (ic === 'town') { c.fillRect(-6, -1, 5, 6); c.fillRect(1, -3, 5, 8); c.beginPath(); c.moveTo(-7, -1); c.lineTo(-3.5, -5); c.lineTo(0, -1); c.fill(); c.beginPath(); c.moveTo(0, -3); c.lineTo(3.5, -7); c.lineTo(7, -3); c.fill(); }
  else if (ic === 'oil') { c.beginPath(); c.moveTo(-5, 6); c.lineTo(0, -7); c.lineTo(5, 6); c.stroke(); c.beginPath(); c.moveTo(-3, 1); c.lineTo(3, 1); c.stroke(); c.fillRect(-7, 5, 14, 2); }
  else if (ic === 'radar') { c.beginPath(); c.arc(0, -1, 6, Math.PI * 0.9, Math.PI * 2.1); c.stroke(); c.beginPath(); c.moveTo(0, -1); c.lineTo(0, 7); c.stroke(); c.beginPath(); c.arc(0, -1, 1.6, 0, TAU); c.fill(); }
  else if (ic === 'post') { c.fillRect(-2, -5, 4, 12); c.fillRect(-5, -7, 10, 3); }
  else if (ic === 'depot') { c.strokeRect(-6, -4, 12, 10); c.beginPath(); c.moveTo(-6, -4); c.lineTo(6, 6); c.moveTo(6, -4); c.lineTo(-6, 6); c.stroke(); }
  else if (ic === 'factory') { c.fillRect(-7, 0, 14, 7); c.fillRect(-5, -7, 3, 8); c.fillRect(1, -5, 3, 6); }
  else if (ic === 'bell') { c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(-5, -7, 0, -7); c.quadraticCurveTo(5, -7, 6, 4); c.closePath(); c.fill(); c.beginPath(); c.arc(0, 6, 1.8, 0, TAU); c.fill(); }
  c.restore();
}

/* ── 地圖介面 ── */
function buildMapUI() {
  const m = $('#map');
  m.innerHTML = `
    <div class="bar"><div class="t">第 <span class="num">${CAMP.day}</span> 天<small>白嶺凍原</small></div><div class="sp"></div>
      <div class="res"><i>$</i><span class="num">${CAMP.money}</span></div>
      <div class="res" style="font-size:12px;padding:4px 10px">每天 +<span class="num">${income()}</span></div>
      <button class="ib" id="mMenu" style="width:40px;height:34px"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>
    <div class="side-panel panel" id="mPanel"></div>
    <div class="tabs"><button class="tab on">戰役地圖</button><button class="tab" id="tBase">基地</button><button class="tab" id="tUnits">部隊</button></div>`;
  $('#tBase').onclick = () => { sfx('click'); goBase(); };
  $('#tUnits').onclick = () => { sfx('click'); openUnits(); };
  $('#mMenu').onclick = () => { sfx('click'); openModal('選單', '<p>戰役每天自動存檔。</p>', [['設定', openSettings, 'alt'], ['回標題', () => startGame(), 'alt'], ['繼續', null]]); };
  renderMapPanel();
}
function renderMapPanel() {
  const p = $('#mPanel'); if (!p) return;
  const k = MAPV.sel;
  if (!k) {
    const th = CAMP.threats.map((t) => `<div class="e">⚠ <b>${FACTION[t.fac].name}</b> 正從${SECTORS[t.from].name}瞄準你的<b>${SECTORS[t.to].name}</b>（明天）</div>`).join('');
    p.innerHTML = `<h3>前線指揮部</h3><div class="sub">點地圖上的據點查看。發亮的綠色據點可以進攻。</div>
      <div class="kv" style="margin-top:10px"><span>我軍據點</span><b class="num">${owned('us').length} / 17</b></div>
      <div class="kv"><span>每天收入</span><b class="num">$ ${income()}</b></div>
      <div class="kv"><span>勝 / 敗</span><b class="num">${CAMP.wins} / ${CAMP.losses}</b></div>
      ${RIVALS.map((f) => `<div class="kv"><span style="color:${FACTION[f].color}">${FACTION[f].name}</span><b class="num">${rivalAlive(f) || f === 'severin' ? owned(f).length + ' 個據點' : CAMP.fates[f] ? ({ recruit: '已收編', exile: '已放逐', execute: '已處決' })[CAMP.fates[f]] : '潰散'}</b></div>`).join('')}
      ${th ? `<div style="margin-top:10px">${th}</div>` : ''}
      <div class="log" style="position:static;width:auto;max-height:none;padding:8px 0 0"><h4>戰報</h4>${CAMP.log.slice(0, 8).map((e) => `<div class="e"><b>第${e.d}天</b>　${esc(e.t)}</div>`).join('') || '<div class="e">還沒有任何戰報。</div>'}</div>
      <div class="ops"><button class="btn alt" id="mRest" style="width:100%">整補一天 <small>（收入 ×1.5，不出擊）</small></button></div>`;
    $('#mRest').onclick = () => { sfx('click'); endDay(true); };
    return;
  }
  const S = SECTORS[k], f = CAMP.own[k], fac = FACTION[f];
  const atk = attackable().includes(k);
  const diff = diffOf(k);
  const stars = '★'.repeat(clamp(Math.round(1 + diff * 0.9), 1, 5)) + '☆'.repeat(5 - clamp(Math.round(1 + diff * 0.9), 1, 5));
  const perk = S.perk === 'oil' ? '佔領後：坦克、運兵車、火箭砲車部署費用 -1' : S.perk === 'radar' ? '佔領後：敵軍進攻前一天就會預警' : S.perk === 'factory' ? '佔領後：所有載具 +12%' : '';
  p.innerHTML = `<h3>${S.name}</h3><div class="sub" style="color:${fac.color}">${fac.name}${S.cap ? '・大本營' : ''}</div>
    <p>${esc(S.desc)}</p>
    <div class="kv"><span>每天收入</span><b class="num">$ ${S.inc}</b></div>
    ${f !== 'us' ? `<div class="kv"><span>難度</span><b style="color:var(--gold)">${stars}</b></div>` : ''}
    ${perk ? `<div class="kv"><span>特殊</span><b style="font-size:12px;max-width:180px;text-align:right">${perk}</b></div>` : ''}
    <div class="ops">${atk ? '<button class="btn" id="mAtk" style="width:100%">出擊</button>' : ''}<button class="btn alt" id="mBack" style="width:100%">返回總覽</button></div>
    ${!atk && f !== 'us' ? `<p style="font-size:12px;color:var(--mute)">${S.locked && !finalAct() ? '學院的大門緊閉。先打倒另外三股勢力。' : '要先打下相鄰的據點，才能進攻這裡。'}</p>` : ''}`;
  $('#mBack').onclick = () => { sfx('click'); MAPV.sel = null; renderMapPanel(); };
  if (atk) $('#mAtk').onclick = () => { sfx('click'); openBrief(k, false); };
}

/* ── 出擊準備：情報＋編隊 ── */
let BRIEF = null;
function openBrief(sid, defense, threat) {
  const f = defense ? threat.fac : CAMP.own[sid];
  BRIEF = { sid, f, defense, threat };
  const S = SECTORS[sid], R = RIVAL[f] || RIVAL.kaz;
  const intel = {
    kaz: '焦土幫喜歡一直下兵、從最弱的線鑽進來。火焰兵很兇，機槍組和迫擊砲剋他們。',
    holder: '鐵砧兵團會存補給，再一口氣推坦克。帶火箭兵，或留空襲給他的裝甲。',
    ilya: '白隼的直升機會從天上打你最弱的線。防空砲車和機槍組是必備。',
    severin: '老師什麼都會，而且會針對你出的兵。均衡編隊，別把補給一次花光。',
  }[f];
  const port = { kaz: 'kaz', holder: 'holder', ilya: 'ilya', severin: 'severin' }[f] || 'kaz';
  const b = $('#brief');
  b.innerHTML = `<div class="bar"><div class="t">${defense ? '防守' : '進攻'}：${S.name}<small>${R.faction}</small></div><div class="sp"></div><div class="res"><i>$</i><span class="num">${CAMP.money}</span></div></div>
    <div class="brief"><div class="l panel">
      <div class="rv"><div class="ava"><canvas width="124" height="124"></canvas></div><div><h3>${R.name}「${R.title}」</h3><small>${R.faction}</small></div></div>
      <div class="say">「${esc(pick(R.lines.open))}」</div>
      <div class="intel">${esc(intel)}</div>
      <div class="intel" style="margin-top:8px">${defense ? '他們正在進攻你的據點。打輸了，這裡就會被搶走。' : '打贏就能佔領這個據點。'}</div>
    </div>
    <div class="r panel">
      <div style="font-size:12px;color:var(--mute);letter-spacing:.1em">出擊編隊（最多 8 張，點下面的卡加入、點上面的卡拿掉）</div>
      <div class="slots" id="bSlots"></div>
      <div class="pool" id="bPool"></div>
      <div class="info" id="bInfo">點卡片看說明。</div>
      <div class="go"><button class="btn alt" id="bBack">返回</button><button class="btn" id="bGo">出擊！</button></div>
    </div></div>`;
  $('.rv canvas', b).getContext('2d').drawImage(portraitCanvas(port, 62, true), 0, 0, 124, 124);
  $('#bBack').onclick = () => { sfx('click'); if (defense) { concedeDefense(); } else goMap(); };
  if (defense) $('#bBack').textContent = '放棄據點';
  $('#bGo').onclick = () => { sfx('click'); startCampaignBattle(); };
  renderDeck();
  G.scene = 'brief'; show('brief');
}
function renderDeck() {
  const un = unlocked();
  CAMP.deck = CAMP.deck.filter((k) => un.includes(k)).slice(0, 8);
  const sl = $('#bSlots'), pool = $('#bPool');
  sl.innerHTML = ''; pool.innerHTML = '';
  const mk = (k, where) => {
    const isAb = !!ABIL[k], hero = HERO[k], d = ABIL[k] || hero || UDEF[k];
    const e = el('div', 'card' + (isAb ? ' ab' : '') + (hero ? ' hero' : '') + (where === 'pool' && CAMP.deck.includes(k) ? ' in' : ''));
    const cc = mkCanvas(128, 116); cc.getContext('2d').drawImage(cardThumb(k), 0, 0); e.appendChild(cc);
    e.insertAdjacentHTML('beforeend', `<div class="nm">${hero ? hero.short : d.name}</div><div class="c num">${costOf(k)}</div>`);
    e.addEventListener('click', () => {
      sfx('tick');
      const info = $('#bInfo');
      info.innerHTML = `<b>${hero ? hero.name : d.name}</b>　${esc(hero ? `${hero.quote} 大招「${hero.skill}」：${hero.skillDesc}` : d.desc)}${d.good ? `<br><span style="color:#a9ff7c">剋：${d.good}</span>　<span style="color:#ff9a7f">怕：${d.bad}</span>` : ''}`;
      if (where === 'slot') CAMP.deck = CAMP.deck.filter((x) => x !== k);
      else if (!CAMP.deck.includes(k)) { if (CAMP.deck.length >= 8) { toast('編隊最多 8 張'); return; } CAMP.deck.push(k); }
      else CAMP.deck = CAMP.deck.filter((x) => x !== k);
      renderDeck();
    });
    return e;
  };
  for (const k of CAMP.deck) sl.appendChild(mk(k, 'slot'));
  for (let i = CAMP.deck.length; i < 8; i++) sl.appendChild(el('div', 'empty'));
  for (const k of un) pool.appendChild(mk(k, 'pool'));
  $('#bGo').disabled = CAMP.deck.length === 0;
}
function costOf(k) {
  const d = ABIL[k] || HERO[k] || UDEF[k];
  let c = d.cost;
  if (CAMP && CAMP.own.oil === 'us' && (k === 'tank' || k === 'apc' || k === 'mlrs')) c -= 1;
  if (CAMP && hasDoc('steel') && k === 'tank') c -= 1;
  return c;
}
function startCampaignBattle() {
  const { sid, f, defense } = BRIEF;
  const S = SECTORS[sid];
  const mods = battleMods();
  const diff = diffOf(sid) + (defense ? 0.4 : 0);
  const cfg = {
    rival: f, deck: CAMP.deck.slice(), lv: mods.lv, supMax: mods.supMax, regen: mods.regen, hqHp: mods.hqHp,
    aiLv: Math.floor(clamp(diff * 0.55, 0, 3)), aiRegen: clamp(0.92 + diff * 0.09, 0.9, 1.45), aiHqHp: 4500 * (S.cap && !defense ? 1.35 : 1) * (sid === 'academy' ? 1.3 : 1),
    theme: S.theme, seed: hashStr(sid) % 999, sid, defense, campaign: true, cdMul: mods.cdMul, doc: CAMP.doctrines.slice(),
    flags: defense ? [[0, 1, 1], [0, -1, 1], [0, 1, 1]] : null,
    onEnd: campaignBattleEnd,
  };
  if (CAMP.tutorial) { cfg.tutorial = true; cfg.aiRegen = 0.72; cfg.aiLv = 0; cfg.flags = null; }
  const pre = !defense && S.cap ? 'pre_' + (f === 'severin' ? 'final' : f) : null;
  if (pre && STORY[pre] && !CAMP.seen[pre]) { CAMP.seen[pre] = true; playStory(STORY[pre], () => SCENES.battle.enter(cfg)); }
  else SCENES.battle.enter(cfg);
}

/* 戰鬥結束 → 結算 → 回地圖 */
function campaignBattleEnd(res, stats, preview) {
  const c = B.cfg, sid = c.sid, S = SECTORS[sid];
  const win = res === 'win';
  const reward = win ? 50 + Math.round(S.inc * (S.cap ? 1.5 : 1)) + Math.min(60, stats.kills * 2) : 15;
  if (preview) {
    return { html: win ? `<span style="color:var(--gold)">+$ ${reward}</span>　${c.defense ? `守住了${S.name}` : `佔領${S.name}`}` : c.defense ? `<span style="color:#ff9a7f">${S.name}失守</span>` : `撤回前哨重整（+$ ${reward}）` };
  }
  CAMP.money += reward; CAMP.kills += stats.kills;
  if (c.tutorial) { CAMP.tutorial = false; CAMP.wins++; logAdd(win ? '擊退焦土幫的突襲。' : '前哨差點被搶光。'); campSave(); playStory(STORY.tutorialWin, () => goMap()); return; }
  if (win) {
    CAMP.wins++;
    if (c.defense) { logAdd(`守住了${S.name}。`); CAMP.threats = CAMP.threats.filter((t) => t.to !== sid); afterBattle(); return; }
    const prev = CAMP.own[sid];
    CAMP.own[sid] = 'us';
    logAdd(`佔領${S.name}。`);
    CAMP.threats = CAMP.threats.filter((t) => t.from !== sid && t.to !== sid);
    if (S.cap && prev !== 'none') { capitalTaken(prev, sid); return; }
    if (!CAMP.seen.firstCapture) { CAMP.seen.firstCapture = true; playStory(STORY.firstCapture, afterBattle); return; }
    afterBattle();
  } else {
    CAMP.losses++;
    if (c.defense) { if (loseSector(sid, BRIEF.threat.fac)) return; afterBattle(); return; }
    logAdd(`進攻${S.name}失敗。`);
    afterBattle();
  }
}
function afterBattle() { endDay(false); }
function loseSector(sid, fac) {
  CAMP.own[sid] = fac; logAdd(`${SECTORS[sid].name}被${FACTION[fac].name}搶走了。`);
  CAMP.threats = CAMP.threats.filter((t) => t.to !== sid);
  if (sid === 'p7') { campaignLost(); return true; }
  return false;
}
function concedeDefense() {
  const { sid, threat } = BRIEF;
  if (loseSector(sid, threat.fac)) return;
  endDay(false, true);
}
function capitalTaken(f, sid) {
  CAMP.beaten.push(f);
  const post = STORY['post_' + f];
  if (f === 'severin') { playStory(STORY.post_final, () => chooseEnding()); return; }
  playStory(post, () => {
    const F = FATE[f];
    askChoice(`怎麼處置${F.q}？`, F.opts.map((o) => [o[1], o[2], () => {
      CAMP.fates[f] = o[0];
      applyFate(f, o[0]);
      playStory(F.react[o[0]], () => chooseDoctrine(() => {
        if (finalAct() && !CAMP.seen.finalAct) { CAMP.seen.finalAct = true; playStory(STORY.finalAct, () => endDay(false)); }
        else if (CAMP.beaten.length === 1 && !CAMP.seen.teacher1) { CAMP.seen.teacher1 = true; playStory(STORY.teacher1, () => endDay(false)); }
        else endDay(false);
      }));
    }]));
  });
}
function applyFate(f, fate) {
  const rest = owned(f);
  if (fate === 'recruit') { for (const k of rest) CAMP.own[k] = 'us'; if (!CAMP.heroes.includes(f)) CAMP.heroes.push(f); if (CAMP.deck.length < 8) CAMP.deck.push(f); logAdd(`${FACTION[f].name}併入第七前哨。`); }
  else if (fate === 'exile') { for (const k of rest) CAMP.own[k] = 'none'; logAdd(`${FACTION[f].name}解散，剩下的據點成了無主之地。`); }
  else {
    for (const k of rest) { const ns = neighbors(k).map((n) => CAMP.own[n]).filter((o) => o !== 'us' && o !== f && o !== 'none' && rivalAlive(o)); CAMP.own[k] = ns.length ? pick(ns) : 'none'; }
    CAMP.fear = (CAMP.fear || 0) + 1; logAdd('處決的消息傳遍凍原。其他勢力開始戒備。');
  }
  CAMP.threats = CAMP.threats.filter((t) => t.fac !== f);
}
function chooseDoctrine(done) {
  const pool = Object.keys(DOCTRINE).filter((d) => !CAMP.doctrines.includes(d));
  const three = []; while (three.length < 3 && pool.length) three.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  if (!three.length) { done(); return; }
  askChoice('選擇一條新的戰術準則', three.map((d) => [DOCTRINE[d].name, DOCTRINE[d].desc, () => { CAMP.doctrines.push(d); campSave(); done(); }]));
}

/* ── 一天結束：收入、敵方行動、威脅 ── */
function endDay(rest, skipAI) {
  const inc = Math.round(income() * (rest ? 1.5 : 1));
  CAMP.money += inc;
  if (rest) logAdd(`整補一天，收入 $${inc}。`);
  const events = [];
  let defense = null;
  if (!skipAI) defense = aiTurn(events);
  CAMP.day++;
  // 新英雄：小雀第三天回來
  campSave(); store.set('campDay', CAMP);
  const next = () => {
    if (defense) { defenseAlert(defense); return; }
    goMap();
  };
  if (CAMP.day === 3 && !CAMP.heroes.includes('sparrow')) {
    CAMP.heroes.push('sparrow'); if (CAMP.deck.length < 8) CAMP.deck.push('sparrow');
    playStory([['sparrow', '……我回來了。南方的補給線，全斷了。'], ['wei', '小雀。歡迎回家。'], ['sparrow', '給我一個高點，我幫你看清楚整個戰場。']], () => reportDay(events, next));
    return;
  }
  reportDay(events, next);
}
function reportDay(events, next) {
  if (!events.length) { next(); return; }
  openModal(`第 ${CAMP.day - 1} 天・戰報`, events.map((e) => `<p>• ${e}</p>`).join(''), [['知道了', next]]);
}
function aiTurn(events) {
  let defense = null;
  // 到期的進攻（有雷達才會提前一天預警）
  const due = CAMP.threats.filter((t) => t.day <= CAMP.day + 1);
  CAMP.threats = CAMP.threats.filter((t) => t.day > CAMP.day + 1);
  for (const t of due) if (CAMP.own[t.to] === 'us' && CAMP.own[t.from] === t.fac && !defense) defense = t;
  for (const f of RIVALS) {
    if (!rivalAlive(f) && f !== 'severin') continue;
    const mine = owned(f); if (!mine.length) continue;
    const late = finalAct() && f === 'severin';
    const p = late ? 0.75 : clamp(0.22 + mine.length * 0.06 + (CAMP.fear || 0) * 0.05, 0.2, 0.6);
    if (!chance(p)) continue;
    const opts = [];
    for (const k of mine) for (const n of neighbors(k)) {
      const o = CAMP.own[n];
      if (o === f || SECTORS[n].cap && o !== 'us') continue;
      if (n === 'p7' && owned('us').length > 3 && !late) continue;
      const w = o === 'us' ? (0.6 + owned('us').length * 0.12 + (late ? 2 : 0)) : o === 'none' ? 1.2 : 0.8;
      opts.push([k, n, o, w]);
    }
    if (!opts.length) continue;
    let sum = opts.reduce((a, b) => a + b[3], 0), r = Math.random() * sum, ch = opts[0];
    for (const o of opts) { r -= o[3]; if (r <= 0) { ch = o; break; } }
    const [from, to, o] = ch;
    if (o === 'us') {
      const radar = CAMP.own.radar === 'us';
      const th = { fac: f, from, to, day: CAMP.day + (radar ? 2 : 1) };
      if (radar) { CAMP.threats.push(th); events.push(`<b style="color:${FACTION[f].color}">${FACTION[f].name}</b>在${SECTORS[from].name}集結，明天要打你的<b>${SECTORS[to].name}</b>！（雷達站預警）`); }
      else if (!defense) { defense = th; events.push(`<b style="color:${FACTION[f].color}">${FACTION[f].name}</b>突襲你的<b>${SECTORS[to].name}</b>！`); }
    } else {
      const pa = owned(f).length, pd = o === 'none' ? 1 : owned(o).length;
      const win = chance(clamp(0.5 + (pa - pd) * 0.07, 0.25, 0.8));
      if (win) { CAMP.own[to] = f; const t = `${FACTION[f].name}從${o === 'none' ? '無主之地' : FACTION[o].name}手上搶下了${SECTORS[to].name}。`; logAdd(t); events.push(t); }
      else { const t = `${FACTION[f].name}進攻${SECTORS[to].name}失敗。`; events.push(t); }
    }
  }
  return defense;
}
function defenseAlert(th) {
  G.scene = 'map'; buildMapUI(); show('map');
  openModal('敵軍來襲！', `<p><b style="color:${FACTION[th.fac].color}">${FACTION[th.fac].name}</b>正在進攻你的<b>${SECTORS[th.to].name}</b>。</p><p>迎擊的話，敵人一開始就佔著中間的旗點。放棄的話，這個據點直接被搶走。</p>`,
    [['迎擊', () => openBrief(th.to, true, th)], ['放棄據點', () => { BRIEF = { sid: th.to, threat: th }; concedeDefense(); }, 'alt']]);
}
function campaignLost() {
  CAMP.lost = true; campSave();
  playStory(STORY.lost_capital, () => {
    openModal('第七前哨失守', '<p>前哨被攻下，戰役結束。你可以從今天早上重新來過。</p>', [['今天重來', () => { CAMP = store.get('campDay', null) || campDefault(); campSave(); goMap(); }], ['回標題', startGame, 'alt']]);
  });
}
function chooseEnding() {
  askChoice('鑰匙在你手上。', [
    ['按下按鈕', '讓十二座鐘樓響起。', () => playEnding('launch')],
    ['炸掉鐘樓', '讓這一切跟學院一起埋在雪裡。', () => playEnding('destroy')],
    ['收下鑰匙', '不按，也不炸。守著它。', () => playEnding('hold')],
  ]);
}
function playEnding(k) {
  CAMP.ending = k; CAMP.done = true; campSave();
  const E = ENDINGS[k];
  const lines = E.text.map((t) => ['*', t]);
  for (const f of ['kaz', 'holder', 'ilya']) { const fate = CAMP.fates[f]; if (fate) lines.push(['*', EPILOGUE[f][fate]]); }
  lines.push(['*', `結局「${E.name}」　共 ${CAMP.day} 天・${CAMP.wins} 勝 ${CAMP.losses} 敗・擊倒 ${CAMP.kills} 名敵兵`]);
  playStory(lines, () => { openModal('寸土・完', `<p>${esc(E.title)}</p><p>謝謝你陪第七前哨走完這個冬天。另外兩個結局，也在等你。</p>`, [['回標題', startGame]]); });
}
function checkStoryOnMap() {
  if (CAMP.done || CAMP.lost) return;
  if (finalAct() && !CAMP.seen.finalAct) { CAMP.seen.finalAct = true; playStory(STORY.finalAct, () => goMap()); }
}

/* ── 開場 ── */
function startIntro() {
  CAMP.tutorial = true; campSave();
  playStory(STORY.intro, () => {
    BRIEF = { sid: 'p7', f: 'kaz', defense: true, threat: { fac: 'kaz', from: 'fox', to: 'p7' } };
    CAMP.deck = ['rifle', 'mg', 'at', 'mortar', 'boiler', 'smoke', 'medic'];
    startCampaignBattle();
  });
}
/* 新手引導：開頭幾個提示 */
const TUT = [
  { t: 1.5, txt: '點下面的「步槍班」，再點綠色範圍部署。步兵會自己往前推、自己開火。', until: () => B.units.some((u) => u.side === 0) },
  { t: 0, txt: '旗點旁邊只有我軍時，士兵會把旗子升起來。佔越多旗點，補給回得越快。', until: () => B.flags.filter((f) => f.owner === 0).length >= 4, after: 8 },
  { t: 0, txt: '敵人躲在沙包後面？迫擊砲組最會砸掩體後的人。', until: () => B.units.some((u) => u.side === 0 && u.kind === 'mortar'), after: 30 },
  { t: 0, txt: '英雄「鍋爐」上場後，再點一次他的卡就能放大招「彈雨」。', until: () => B.heroUsed.boiler, after: 55 },
  { t: 0, txt: '把敵方指揮部打爆就贏了。時間到的話，佔的旗點多的一方贏。', until: () => false, after: 85, dur: 6 },
];
function tutorialTick(dt) {
  B.tut = B.tut || { i: 0, t: 0, shown: false };
  const T = B.tut, s = TUT[T.i]; if (!s) return;
  T.t += dt;
  if (!T.shown && B.t > (s.after || s.t)) { T.shown = true; T.st = 0; showHint(s.txt, s.dur || 99); }
  if (T.shown) { T.st += dt; if (s.until() || (s.dur && T.st > s.dur) || T.st > 16) { T.i++; T.shown = false; if (UI.hintT >= 50) showHint('', 0); } }
}

/* ── 基地 ── */
function goBase() {
  G.scene = 'base';
  const b = $('#base');
  const card = (k) => {
    const D = BLD[k], lv = CAMP.bld[k], max = D.max;
    const cost = lv < max ? D.cost[lv] : null;
    const cur = lv ? D.lv[lv - 1] : '尚未興建';
    const nxt = lv < max ? D.lv[lv] : '已經滿級';
    return `<div class="bld panel"><h4>${D.name}<span class="lv">${lv ? 'LV ' + lv : '—'}</span></h4>
      <div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <p>${D.desc}<br><span style="color:#fff">目前：${cur}</span></p><div class="nx">${lv < max ? '下一級：' + nxt : nxt}</div>
      ${cost !== null ? `<button class="btn ${CAMP.money >= cost ? 'gold' : 'alt'}" data-b="${k}" ${CAMP.money >= cost ? '' : 'disabled'}>${lv ? '升級' : '興建'}　$ ${cost}</button>` : '<button class="btn alt" disabled>滿級</button>'}</div>`;
  };
  b.innerHTML = `<div class="bar"><div class="t">第七前哨・基地<small>升級立刻生效</small></div><div class="sp"></div><div class="res"><i>$</i><span class="num">${CAMP.money}</span></div></div>
    <div class="grid">${Object.keys(BLD).map(card).join('')}
      <div class="bld panel"><h4>戰術準則<span class="lv">${CAMP.doctrines.length}</span></h4><p>${CAMP.doctrines.length ? CAMP.doctrines.map((d) => `<b style="color:var(--gold)">${DOCTRINE[d].name}</b>：${DOCTRINE[d].desc}`).join('<br>') : '打下對手的大本營後，可以選一條戰術準則。'}</p></div>
    </div>
    <div class="tabs"><button class="tab" id="tMap">戰役地圖</button><button class="tab on">基地</button><button class="tab" id="tUnits2">部隊</button></div>`;
  $$('[data-b]', b).forEach((x) => x.addEventListener('click', () => {
    const k = x.dataset.b, cost = BLD[k].cost[CAMP.bld[k]];
    if (CAMP.money < cost) return;
    CAMP.money -= cost; CAMP.bld[k]++; campSave(); sfx('coin');
    toast(`${BLD[k].name}升到 LV ${CAMP.bld[k]}：${BLD[k].lv[CAMP.bld[k] - 1]}`);
    for (const u of unlocked()) if (!CAMP.deck.includes(u) && CAMP.deck.length < 8 && !HERO[u]) CAMP.deck.push(u);
    goBase();
  }));
  $('#tMap').onclick = () => { sfx('click'); goMap(); };
  $('#tUnits2').onclick = () => { sfx('click'); openUnits(); };
  show('base');
}
function openUnits() {
  const un = unlocked();
  const all = [...Object.keys(UDEF), ...Object.keys(ABIL), ...Object.keys(HERO)];
  const rows = all.filter((k) => un.includes(k) || !HERO[k]).map((k) => {
    const d = ABIL[k] || HERO[k] || UDEF[k], ok = un.includes(k);
    return `<li style="${ok ? '' : 'opacity:.45'}"><b>${HERO[k] ? HERO[k].name : d.name}</b>（${costOf(k)} 補給）${ok ? '' : '・未解鎖'}<br>${esc(HERO[k] ? `大招「${HERO[k].skill}」：${HERO[k].skillDesc}` : d.desc)}${d.good ? `<br><span style="color:#a9ff7c">剋：${d.good}</span>　<span style="color:#ff9a7f">怕：${d.bad}</span>` : ''}</li>`;
  }).join('');
  openModal('部隊與技能', `<ul style="list-style:none;padding:0">${rows}</ul>`, [['關閉', null]]);
}

/* ── 劇情對話 ── */
function playStory(lines, done) {
  const d = $('#dlg');
  let i = 0, typing = null;
  const prevScene = G.scene;
  const step = () => {
    if (i >= lines.length) { d.classList.remove('on'); d.onclick = null; if (done) done(); return; }
    const [who, txt] = lines[i++];
    const P = PORTRAIT[who];
    d.innerHTML = `<div class="box panel"><div class="por">${P ? '<canvas width="248" height="248"></canvas>' : ''}</div><div class="who" style="color:${who === 'wei' || who === 'amo' || who === 'boiler' || who === 'sparrow' ? 'var(--us)' : who === '*' ? 'var(--mute)' : '#ff9a7f'}">${P ? P.name + '<span style="color:var(--mute);margin-left:8px;font-size:11px">' + P.role + '</span>' : '　'}</div><div class="txt"></div><div class="nx">點一下繼續 ▸</div></div>`;
    if (!P) $('.box', d).style.paddingLeft = '22px';
    if (P) $('.por canvas', d).getContext('2d').drawImage(portraitCanvas(who, 124, !(who === 'wei' || who === 'amo' || who === 'boiler' || who === 'sparrow')), 0, 0, 248, 248);
    const tx = $('.txt', d);
    let n = 0; clearInterval(typing);
    typing = setInterval(() => { n += 2; tx.textContent = txt.slice(0, n); if (n >= txt.length) { clearInterval(typing); typing = null; } }, 22);
    if (who !== '*') sfx('radio');
    d.onclick = () => { sfx('tick'); if (typing) { clearInterval(typing); typing = null; tx.textContent = txt; return; } step(); };
  };
  for (const x of $$('#ui > .scr')) if (x.id !== 'dlg' && x.id !== 'modal') x.classList.remove('on');
  d.classList.add('on');
  step();
}
function askChoice(title, opts) {
  const d = $('#dlg');
  d.innerHTML = `<div class="box panel" style="padding-left:22px"><div class="who" style="color:var(--gold)">${esc(title)}</div><div class="chs"></div></div>`;
  const ch = $('.chs', d);
  for (const [t, sub, fn] of opts) { const b = el('button', 'btn alt', `${esc(t)}<small>${esc(sub)}</small>`); b.onclick = (e) => { e.stopPropagation(); sfx('click'); d.classList.remove('on'); fn(); }; ch.appendChild(b); }
  d.onclick = null;
  for (const x of $$('#ui > .scr')) if (x.id !== 'dlg' && x.id !== 'modal') x.classList.remove('on');
  d.classList.add('on');
}
