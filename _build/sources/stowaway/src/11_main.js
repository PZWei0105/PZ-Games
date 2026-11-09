// ============ 標題、選單、輸入、主迴圈 ============
function showTitle() {
  S.mode = 'title'; W = null;
  $('#hud').classList.add('hide');
  ['#s-sheet', '#s-scene', '#s-result', '#s-pause', '#pbridge', '#ppower', '#pcraft'].forEach(s => $(s).classList.add('hide'));
  const sc = $('#s-title'); sc.classList.remove('hide');
  const nl = G.newLore.length;
  const ck = G.ckpt;
  sc.innerHTML = `<div class="scr-in">
    <div class="logo"><div class="zh">偷渡者</div><div class="en">STOWAWAY</div><div class="tag">船上多了一個。</div></div>
    ${ck ? `<button class="bigbtn" id="t-cont">繼續航程<small>第 ${ck.voyage} 航次・${ACTS[ck.act].n}「${ACTS[ck.act].t}」</small></button>` : ''}
    <button class="bigbtn ${ck ? 'sec' : ''}" id="t-go">${G.voyages ? '出航' : '開始'}<small>第 ${G.voyages + 1} 航次${G.equip.length ? '・帶著 ' + G.equip.map(id => PERKS.find(p => p.id === id).name).join('、') : ''}</small></button>
    <div class="tmenu">
      <button id="t-perk">出航準備<small>分紅 ${G.money}</small></button>
      <button id="t-log">航行日誌<small>${G.runs.length} 航次</small></button>
      <button id="t-arch">調查檔案<small>${G.lore.length} / ${LORE.length}</small>${nl ? `<span class="nb">新 ${nl}</span>` : ''}</button>
      <button id="t-end">結局<small>${Object.keys(G.endings).filter(k => G.endings[k]).length} / ${ENDINGS.length}</small></button>
      <button id="t-help">怎麼玩<small>操作與規則</small></button>
      <button id="t-set">設定<small>聲音・畫面</small></button>
    </div>
    <div class="meta"><span>NH-07 NIGHT HERON</span><span>建議戴耳機</span></div>
  </div>`;
  const go = () => { AU.init(); const run = () => { G.ckpt = null; saveG(); sc.classList.add('hide'); startGame(); }; if (G.ckpt) askBox('開新的一航會放棄目前存著的航程。確定？', run, '開新的一航'); else run(); };
  $('#t-go').onclick = go;
  if (ck) $('#t-cont').onclick = () => { AU.init(); sc.classList.add('hide'); continueGame(); };
  $('#t-perk').onclick = () => { AU.init(); showPerks(); };
  $('#t-log').onclick = () => { AU.init(); showLog(); };
  $('#t-arch').onclick = () => { AU.init(); showArchive(); };
  $('#t-end').onclick = () => { AU.init(); showEndings(); };
  $('#t-help').onclick = () => { AU.init(); showHelp(); };
  $('#t-set').onclick = () => { AU.init(); showSettings(); };
}
function startGame() {
  S.mode = 'game'; S.paused = false;
  newRun();
  enterRunUI();
  W.phase = 'scene';
  CAM.x = W.crew[0].x; CAM.y = W.crew[0].y + T * 2; CAM.z = CAM.tz = 1.15;
  const pro = W.voyage === 1 ? PROLOGUE : [{ nar: '夜鷺號 · 第 ' + W.voyage + ' 航次' }, { nar: W.mods.event ? { reactor: '開局狀況：反應爐受損，電力少一格（工程師修得好）。', jam: '開局狀況：後段隔艙閘卡死了，關不起來。', sensors: '開局狀況：艦橋感測器故障（⚙2 修得好）。', dark: '開局狀況：儲藏室、工作間、樣本間、後段走廊的燈壞了。' }[W.mods.event] : '同一片黑暗，同一只貨櫃。' }, { who: 'batu', t: '艦長……貨櫃的封條斷了。' }];
  playScene(pro, () => { W.phase = 'play'; tut('select'); setTimeout(() => W && tut('bpm'), 9000); setTimeout(() => W && tut('bridge'), 18000); setTimeout(() => W && tut('vent'), 34000); }, { head: `<span class="lbl">VOYAGE ${String(W.voyage).padStart(2, '0')}</span><h2>空的貨櫃</h2><div class="sub2">第一幕</div>` });
}
function continueGame() {
  S.mode = 'game'; S.paused = false;
  if (!resumeCkpt()) { startGame(); return; }
  enterRunUI();
  const m = aliveCrew()[0]; if (m) { CAM.x = m.x; CAM.y = m.y; }
  toast('從幕間繼續：' + ACTS[W.act].n + '「' + ACTS[W.act].t + '」', 'good');
}
function enterRunUI() {
  $('#hud').classList.remove('hide');
  buildHUD();
  UI.bridgeMode = false; UI.aimMode = null; UI.showVents = false;
  $('#b-vents').classList.remove('on');
  for (const k in LIGHTCACHE) delete LIGHTCACHE[k];
}
// ---------- 船塢的各頁 ----------
function sheet(title, inner, back) {
  const sc = $('#s-sheet'); sc.classList.remove('hide');
  sc.innerHTML = `<div class="scr-in"><div class="shead"><h2>${title}</h2><button id="sh-x">✕</button></div>${inner}</div>`;
  sc.scrollTop = 0;
  $('#sh-x').onclick = () => { sc.classList.add('hide'); if (back) back(); else if (S.mode === 'title') showTitle(); };
  return sc;
}
function showPerks() {
  const draw = () => {
    let h = `<div class="card"><p>每一航結束都會拿到分紅。用分紅買出航準備，每次出航最多帶兩樣。</p><div class="money" style="margin-top:6px">現有分紅 ${G.money}</div></div>`;
    for (const p of PERKS) {
      const own = G.owned.includes(p.id), eq = G.equip.includes(p.id);
      h += `<div class="card perk"><div class="pi">${icon({ tracker2: 'tracker', stash: 'fuel', medbag: 'medkit', calib: 'bridge', doors: 'door', calm: 'heal', veteran: 'harpoon', power: 'power' }[p.id])}</div><div class="pt"><h4>${p.name}</h4><p>${p.desc}</p></div><button data-p="${p.id}" class="${eq ? 'eq' : own ? 'own' : ''}" ${!own && G.money < p.cost ? 'disabled' : ''}>${eq ? '已帶上' : own ? '帶上' : p.cost + ' 分紅'}</button></div>`;
    }
    const sc = sheet('出航準備', h);
    sc.querySelectorAll('button[data-p]').forEach(b => b.onclick = () => {
      const id = b.dataset.p, p = PERKS.find(x => x.id === id);
      if (!G.owned.includes(id)) { if (G.money < p.cost) return; G.money -= p.cost; G.owned.push(id); AU.loot(3); }
      else if (G.equip.includes(id)) G.equip = G.equip.filter(x => x !== id);
      else { if (G.equip.length >= 2) G.equip.shift(); G.equip.push(id); AU.ui('ok'); }
      saveG(); draw();
    });
  };
  draw();
}
function showLog() {
  let h = '';
  if (!G.runs.length) h = `<div class="card"><p>還沒有航行紀錄。每一航結束後，這裡會留下那一夜發生的事。</p></div>`;
  for (const r of G.runs) {
    const E = ENDINGS.find(e => e.id === r.end);
    h += `<div class="card"><h4>第 ${r.v} 航次 · ${E ? E.name : r.end}</h4><p>活著：${r.alive.map(id => CREWI[id].name).join('、') || '無'}　·　${fmtT(r.t)}</p><div class="chron" style="margin-top:6px">${r.chron.map(c => `<div class="ln"><span class="tm">${fmtT(c[0])}</span>${c[1]}</div>`).join('')}</div></div>`;
  }
  sheet('航行日誌', h);
}
function showArchive() {
  let h = `<div class="card"><p>在船上翻到的紀錄、聽到的廣播、看到的東西，都會收進這裡。收齊所有檔案，也許能拼出這趟航程的真相。</p></div><div class="files">`;
  LORE.forEach((f, i) => {
    const has = G.lore.includes(f.id), nw = G.newLore.includes(f.id);
    h += `<button class="file ${has ? '' : 'lock'} ${nw ? 'new' : ''}" data-f="${f.id}" ${has ? '' : 'disabled'}><div class="fn">FILE ${String(i + 1).padStart(2, '0')}${nw ? ' · 新' : ''}</div><div class="ft">${has ? f.title : '？？？'}</div><div class="fs">${has ? f.sum : f.src === 'log' ? '在船上的某個櫃子裡' + (f.late ? '（第 ' + f.late + ' 航次以後）' : '') : f.src === 'beacon' ? '通訊台' : f.src === 'cont' ? '貨艙' : f.src === 'confess' ? '有人藏著一張紙' : '最後一份'}</div></button>`;
  });
  h += `</div>`;
  const sc = sheet('調查檔案', h);
  sc.querySelectorAll('button[data-f]').forEach(b => b.onclick = () => {
    const f = LOREI[b.dataset.f]; G.newLore = G.newLore.filter(x => x !== f.id); saveG();
    sheet(f.title, `<div class="card"><div class="reader">${f.text}</div></div>`, showArchive);
  });
}
function showEndings() {
  let h = `<div class="end-grid">`;
  for (const e of ENDINGS) { const n = G.endings[e.id]; h += `<div class="end ${n ? '' : 'lock'}"><div class="et">${n ? e.name : '？？？'}</div><div class="es">${n ? '達成 ' + n + ' 次' : e.hint}</div></div>`; }
  h += `</div>`;
  sheet('結局', h);
}
function showHelp(fromPause) {
  const h = `
  <div class="card"><h4>目標</h4><p>你指揮夜鷺號上的六個人，撐過這一夜。牠會在地板下的通風管裡長大——第一幕牠還小，趁機搜刮裝備（也可以試著把牠困死）；氣閘和逃生艇在第一幕被檢疫封鎖。第二幕牠會開始獵人，你要準備一個「最終計畫」；第三幕執行計畫：把牠引進氣閘拋出去、困在房間裡燒死，或是啟動自毀搭逃生艇離開。</p></div>
  <div class="card"><h4>操作</h4><p>・點<b>船員卡</b>（或畫面上的人）選人，選人時時間會變慢。<br>・<b>搖桿</b>：選人後在畫面左半邊按住拖曳。輕推是走，推到底是跑（快，但很吵）；走進關著的門會自己開。<br>・也可以<b>點地板</b>叫他走過去，點兩下用跑的。點櫃子搜東西、點躲藏點躲起來、點主控台使用；走到旁邊時，下面的行動列也會跳出「搜」「躲」「操作」。<br>・<b>叫大家跟上</b>：附近的同伴會跟著你走，你躲他們也找地方躲。<br>・點門可以開關或焊死；點格柵可以焊死（要焊槍）。<br>・右半邊拖曳移動鏡頭，兩指縮放；「總覽」看整艘船。<br>・行動列的道具：照明彈、誘餌點了以後再點地圖丟出去。<br>・電腦：WASD／方向鍵移動、按住 Shift 跑、F 屏息、G 叫大家跟上、1～6 選人、空白鍵暫停。</p></div>
  <div class="card"><h4>屏住呼吸</h4><p>有人躲著、牠就在旁邊時，右下會出現<b>「屏息」</b>。按住它，躲著的人心跳就聽不到；牠走到躲藏點前面貼著聽的時候，撐過去牠就會走開。氣有限（心跳越快撐越短），憋到底會喘出來。牠要是親眼看到你躲進去，屏息也沒用。</p></div>
  <div class="card"><h4>心跳</h4><p>船員卡上的 ♥ 是心率。牠喉嚨的發光囊會聽心跳：越害怕的人，越遠就被聽到。躲起來能把範圍減半，但心跳太快一樣會被找到。<br>黑暗、落單、看到牠、受傷會讓心跳升高；和同伴待在一起、艦長在同一間房、打鎮定劑會降下來。心跳太高的人可能會尖叫、亂跑或嚇呆。</p></div>
  <div class="card"><h4>看見牠</h4><p>你只看得到船員視線裡、有燈光照著的地方。偵測器每兩秒掃一次，會動的東西變成紅點；「地板下」的點代表牠在通風管裡。有人坐鎮艦橋主控台，就能看到全船的光點、遠端開關門與通風閘門（D1～D10），也能在任何房間響警報、派清潔機器人小蝸去引開牠。</p></div>
  <div class="card"><h4>牠會學</h4><p>同一種躲藏點用多了，牠會開始去翻；同一招誘餌、警報用到第三次就不上當；被火燒過會改從通風管繞路；被焊死的門擋過，就更常走管道。換招，才活得久。</p></div>
  <div class="card"><h4>擦身而過</h4><p>牠從躲著或沒被發現的人旁邊走過去，會記在航行日誌裡；每一次擦身而過和屏息成功，回到船塢都會多分到一點分紅。</p></div>
  <div class="card"><h4>被撲倒</h4><p>牠撲倒人以後會拖向最近的格柵。五秒內用火焰、電擊棒、照明彈或魚叉打中牠，牠就會放手。開著「警戒」的船員看到會自己出手。身上帶著電擊棒的人會自己電牠脫身。</p></div>
  <div class="card"><h4>電力</h4><p>反應爐只有六格電。要打開氣閘外門得先給「氣閘」兩格，所以通常要關掉全船的燈。鄧伯能讓反應爐超載多兩格。</p></div>
  <div class="card"><h4>存檔</h4><p>每一幕之間的幕間會自動存檔；中途離開，下次從最近的幕間繼續。</p></div>`;
  sheet('怎麼玩', h, fromPause ? () => { } : null);
}
function showSettings(fromPause) {
  const s = G.set;
  const tog = (k, name, sub) => `<div class="opt"><span>${name}${sub ? `<small>${sub}</small>` : ''}</span><button class="tog ${s[k] ? 'on' : ''}" data-k="${k}"></button></div>`;
  const seg = (k, name, vals) => `<div class="opt"><span>${name}</span><div class="seg">${vals.map(v => `<button data-sk="${k}" data-v="${v[0]}" class="${Math.abs(s[k] - v[0]) < .01 ? 'on' : ''}">${v[1]}</button>`).join('')}</div></div>`;
  const h = `<div class="card">${seg('music', '配樂', [[0, '關'], [.4, '小'], [.8, '中'], [1, '大']])}${seg('sfx', '音效', [[0, '關'], [.5, '小'], [1, '中'], [1.3, '大']])}${tog('slowmo', '選人時時間變慢', '關掉會更緊張')}${tog('hints', '新手提示')}${tog('haptic', '震動', 'Android 才有')}${tog('flash', '閃光', '對閃光敏感可以關')}${tog('shake', '畫面晃動')}</div>
  <button class="bigbtn sec" id="s-reset" style="margin-top:10px">清除所有存檔</button>`;
  const sc = sheet('設定', h, fromPause ? () => { } : null);
  sc.querySelectorAll('.tog').forEach(b => b.onclick = () => { s[b.dataset.k] = !s[b.dataset.k]; b.classList.toggle('on', s[b.dataset.k]); saveG(); });
  sc.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { s[b.dataset.sk] = +b.dataset.v; saveG(); AU.setVol(s.music, s.sfx); sc.querySelectorAll(`[data-sk="${b.dataset.sk}"]`).forEach(x => x.classList.toggle('on', x === b)); });
  $('#s-reset').onclick = () => askBox('清除所有航行紀錄、分紅、檔案與結局？', () => { G = defaultG(); S.set = G.set; saveG(); AU.setVol(S.set.music, S.set.sfx); sc.classList.add('hide'); showTitle(); }, '清除');
}

// ---------- 輸入 ----------
const PTR = new Map(); let pinch = null, lastTap = { t: 0, x: 0, y: 0 };
// 搖桿：選人後在畫面左半邊按住拖曳
const JOY = { id: null, ax: 0, ay: 0, dx: 0, dy: 0, mag: 0, R: 56 };
const KEYS = {};
function isLand() { return VW / VH > 1.3; }
function joyFree(m) { return m && !m.dead && m.cocoon < 0 && !m.grabbed && !m.inVent && !m.task && !m.hidden; }
function joyZone(x, y) {
  if (!W || W.phase !== 'play' || UI.bridgeMode || UI.menuOpen || S.paused) return false;
  const m = W.sel >= 0 ? W.crew[W.sel] : null;
  if (!joyFree(m)) return false;
  const land = isLand(), x0 = land ? 146 : 0, x1 = land ? x0 + (VW - x0) * .5 : VW * .56;
  return x >= x0 && x <= x1 && y > (land ? 84 : 150) && y < VH - (land ? 12 : (UI.selBarH || 160) - 4);
}
function joyHome() { const land = isLand(); return [land ? 146 + (VW - 146) * .17 : VW * .2, VH - (land ? 96 : (UI.selBarH || 160) + 92)]; }
function joyStart(id, x, y) {
  JOY.id = id; JOY.ax = x; JOY.ay = y; JOY.mag = 0;
  const j = $('#joy'); j.classList.remove('hide', 'run'); j.style.left = x + 'px'; j.style.top = y + 'px';
  S.slowT = 0; CAM.follow = W.sel; CAM.freeT = 0; CAM.focus = null;
  if (!G.joyUsed) { G.joyUsed = true; saveG(); refreshActbar(true); }
}
function joyMove(x, y) {
  let dx = x - JOY.ax, dy = y - JOY.ay, len = Math.hypot(dx, dy);
  const R0 = JOY.R;
  if (len > R0 * 1.25) { const k = (len - R0 * 1.25) / len; JOY.ax += dx * k; JOY.ay += dy * k; dx = x - JOY.ax; dy = y - JOY.ay; len = Math.hypot(dx, dy); }
  const u = Math.min(1, len / R0);
  JOY.mag = u < .14 ? 0 : (u - .14) / .86;
  if (len > 0) { JOY.dx = dx / len; JOY.dy = dy / len; }
  const j = $('#joy'); j.style.left = JOY.ax + 'px'; j.style.top = JOY.ay + 'px';
  const kx = JOY.dx * u * R0, ky = JOY.dy * u * R0;
  j.querySelector('.jk').style.transform = `translate(${kx}px,${ky}px)`;
  const run = JOY.mag >= .86;
  if (j.classList.contains('run') !== run) { j.classList.toggle('run', run); j.querySelector('.jl').textContent = run ? '跑・很吵' : ''; }
}
function joyEnd() {
  JOY.id = null; JOY.mag = 0;
  const j = $('#joy'); j.classList.add('hide'); j.querySelector('.jk').style.transform = '';
}
// 每一格：把搖桿或鍵盤的方向交給選中的人
function applyDrive() {
  if (!W) return;
  let dx = 0, dy = 0, mag = 0;
  if (JOY.id != null && JOY.mag > 0) { dx = JOY.dx; dy = JOY.dy; mag = JOY.mag; }
  else {
    const kx = (KEYS.r ? 1 : 0) - (KEYS.l ? 1 : 0), ky = (KEYS.d ? 1 : 0) - (KEYS.u ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); dx = kx / l; dy = ky / l; mag = KEYS.shift ? 1 : .72; }
  }
  for (const c of W.crew) c.drive = null;
  const m = W.sel >= 0 ? W.crew[W.sel] : null;
  if (!m || mag <= 0 || UI.bridgeMode || W.phase !== 'play') return;
  if (JOY.id == null && !joyFree(m)) {
    // 鍵盤：躲著或忙著的人，先叫他出來／放下手邊的事
    if (m.hidden) unhide(m); else if (m.task && m.task.type !== 'fire') cancelTask(m); else if (!joyFree(m)) return;
  }
  m.drive = { x: dx, y: dy, mag };
  if (CAM.follow !== W.sel || CAM.freeT > 0) { CAM.follow = W.sel; CAM.freeT = 0; }
}
function setupInput() {
  const cv = $('#cv');
  cv.addEventListener('pointerdown', e => {
    if (S.mode !== 'game') return;
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    const p = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, t0: performance.now(), mode: 'pending', joyOK: JOY.id == null && joyZone(e.clientX, e.clientY) };
    PTR.set(e.pointerId, p);
    // 兩指縮放（拿著搖桿時不縮放）
    if (JOY.id == null) {
      const others = [...PTR.values()].filter(q => q.mode !== 'joy');
      if (others.length === 2) { const [a, b] = others; pinch = { a, b, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: CAM.tz }; a.mode = b.mode = 'pinch'; }
    }
  });
  cv.addEventListener('pointermove', e => {
    const p = PTR.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (p.mode === 'joy') { joyMove(p.x, p.y); return; }
    if (p.mode === 'pinch') { if (pinch) { const d = Math.hypot(pinch.a.x - pinch.b.x, pinch.a.y - pinch.b.y); CAM.tz = clamp(pinch.z * d / pinch.d, fitZoom() * .9, 1.8); CAM.freeT = 999; } return; }
    if (p.mode === 'pending' && Math.hypot(p.x - p.x0, p.y - p.y0) > 10) {
      if (p.joyOK && JOY.id == null && joyZone(p.x0, p.y0)) { p.mode = 'joy'; joyStart(e.pointerId, p.x0, p.y0); joyMove(p.x, p.y); return; }
      p.mode = 'pan';
    }
    if (p.mode === 'pan') { CAM.x -= (p.x - p.lx) / CAM.z; CAM.y -= (p.y - p.ly) / CAM.z; CAM.freeT = 999; CAM.focus = null; }
    p.lx = p.x; p.ly = p.y;
  });
  const up = e => {
    const p = PTR.get(e.pointerId); PTR.delete(e.pointerId);
    if (!p) return;
    if (p.mode === 'joy' || e.pointerId === JOY.id) { joyEnd(); return; }
    if (p.mode === 'pinch') { if (pinch && (p === pinch.a || p === pinch.b)) { const o = p === pinch.a ? pinch.b : pinch.a; pinch = null; o.mode = 'done'; } return; }
    if (p.mode === 'pending' && performance.now() - p.t0 < 450 && e.type === 'pointerup') {
      const now = performance.now(); const dbl = now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 34;
      lastTap = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY };
      handleTap(e.clientX, e.clientY, dbl);
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { if (S.mode !== 'game') return; e.preventDefault(); CAM.tz = clamp(CAM.tz * (e.deltaY > 0 ? .9 : 1.1), fitZoom() * .9, 1.8); CAM.freeT = 999; }, { passive: false });
  const KMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'shift', ShiftRight: 'shift' };
  window.addEventListener('keydown', e => {
    if (S.mode !== 'game' || !W) return;
    if (KMAP[e.code]) { KEYS[KMAP[e.code]] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); return; }
    if (e.code === 'KeyF') { if (!W.breathHeld && !$('#breath').classList.contains('hide')) { W.breathHeld = true; $('#breath').classList.add('on'); } return; }
    if (e.key >= '1' && e.key <= '6') onCrewCard(+e.key - 1);
    else if (e.key === ' ' || e.key === 'Escape') { if (UI.aimMode) { UI.aimMode = null; refreshActbar(true); } else if (UI.bridgeMode) closeBridgeMode(); else pauseGame(!S.paused); e.preventDefault(); }
    else if (e.key === 'r' || e.key === 'R') { const m = W.crew[W.sel]; if (m) { m.run = !m.run; refreshActbar(true); } }
    else if (e.key === 'b' || e.key === 'B') $('#b-bridge').click();
    else if (e.key === 'v' || e.key === 'V') $('#b-vents').click();
    else if (e.key === 'z' || e.key === 'Z') $('#b-zoom').click();
    else if (e.key === 'g' || e.key === 'G') { const m = W.crew[W.sel]; if (m && !m.dead) { if (followersOf(m).length) dismissFollow(m); else callFollow(m); refreshActbar(true); } }
  });
  window.addEventListener('keyup', e => {
    if (KMAP[e.code]) KEYS[KMAP[e.code]] = false;
    if (e.code === 'KeyF' && W) { W.breathHeld = false; $('#breath').classList.remove('on'); }
  });
  window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; if (W) W.breathHeld = false; if (JOY.id != null) joyEnd(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'game' && W && W.phase === 'play' && !S.paused) pauseGame(true); });
  window.addEventListener('pointerdown', () => AU.init(), { once: false, passive: true });
}

// ---------- 主迴圈 ----------
let lastT = 0, slowFrames = 0;
function frame(ts) {
  const t = ts / 1000; let dt = Math.min(.05, t - lastT || .016); lastT = t;
  if (S.mode === 'title') renderTitle(dt);
  else if (S.mode === 'game' && W) {
    let ts2 = S.paused ? 0 : 1;
    S.slowT = Math.max(0, (S.slowT || 0) - dt);
    if (S.set.slowmo && W.sel >= 0 && S.slowT > 0) ts2 *= .35;
    if (W.grabbing) ts2 *= .55;
    if (UI.aimMode && S.set.slowmo) ts2 *= .3;
    ts2 *= (S.speed || 1);
    applyDrive();
    if (W.phase === 'play' && ts2 > 0) { let rem = dt * ts2; while (rem > 0) { const s = Math.min(rem, 1 / 30); worldTick(s); rem -= s; } }
    else if (W.phase === 'cine') { worldTickCine(dt); }
    updateCamera(dt);
    const f0 = performance.now();
    render(dt);
    if (W) { updateHUD(dt); AU.update(dt); }
    const ft = performance.now() - f0;
    if (!S.noAdapt) { if (ft > 26) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1); if (slowFrames > 40 && !S.lowRes) { S.lowRes = true; resize(); } }
  }
  requestAnimationFrame(frame);
}
function worldTickCine(dt) {
  if (!W) return;
  const b = W.beast;
  if (b && b.state === 'spaced') { b.st += dt; const ax = SHIP.door.a_out.x + T * 3, ay = SHIP.door.a_out.y; b.x = lerp(b.x, ax + b.st * 80, dt * 2); b.y = lerp(b.y, ay + Math.sin(b.st * 3) * 20, dt * 2); b.ang += dt * 3; updateBeastRig(b, dt); }
  if (b && b.state === 'dead') updateBeastRig(b, dt * .2);
  updateFx(dt); for (const d of SHIP.doors) updateDoor(d, dt);
}
function renderTitle(dt) {
  ensureShipImg();
  const c = CX; c.setTransform(1, 0, 0, 1, 0, 0);
  drawSpace(c);
  const t = performance.now() / 1000;
  const z = Math.min(VW / (MAPW * T) * 1.25, VH / (MAPH * T) * 1.05);
  c.save(); c.translate(CV.width * .5 + Math.sin(t * .1) * 10 * DPR, CV.height * .52); c.rotate(-.2 + Math.sin(t * .07) * .02); c.scale(z * DPR, z * DPR); c.translate(-MAPW * T / 2, -MAPH * T / 2 - T * 3 + (t * 6) % 1);
  c.drawImage(SHIPIMG, -ART.mg, -ART.mg, SHIPIMG.width / ART.sc, SHIPIMG.height / ART.sc);
  // 一層黑，掃描線般的光帶掃過
  c.fillStyle = 'rgba(2,4,8,.78)'; c.fillRect(-ART.mg, -ART.mg, MAPW * T + ART.mg * 2, MAPH * T + ART.mg * 2);
  const sy = ((t * 120) % (MAPH * T + 600)) - 300;
  const g = c.createLinearGradient(0, sy - 140, 0, sy + 140); g.addColorStop(0, 'rgba(255,140,60,0)'); g.addColorStop(.5, 'rgba(255,140,60,.09)'); g.addColorStop(1, 'rgba(255,140,60,0)');
  c.fillStyle = g; c.fillRect(-ART.mg, sy - 140, MAPW * T + ART.mg * 2, 280);
  // 一個在通風管裡游走的光點
  const L = SHIP.vl[Math.floor(t / 2.5) % SHIP.vl.length], u = (t / 2.5) % 1, p = polyPointAt(L.pts, u);
  c.fillStyle = 'rgba(111,232,255,.9)'; c.beginPath(); c.arc(p[0], p[1], 7, 0, TAU); c.fill();
  c.strokeStyle = `rgba(111,232,255,${.5 * (1 - (t % 1))})`; c.lineWidth = 3; c.beginPath(); c.arc(p[0], p[1], 10 + (t % 1) * 60, 0, TAU); c.stroke();
  c.restore();
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, CV.width, CV.height);
}

// ---------- 開機 ----------
async function boot() {
  loadG();
  initRender();
  buildShip();
  setupInput();
  try { await Promise.race([document.fonts && document.fonts.ready, new Promise(r => setTimeout(r, 1800))]); } catch (e) { }
  ensureShipImg();
  $('#boot').remove();
  showTitle();
  requestAnimationFrame(frame);
}
window.__sw = { get W() { return W; }, get G() { return G; }, S, UI, CAM, startGame, showTitle, worldTick, render, endRun, toInterlude, startAct, newRun, planReady, selectCrew, handleTap, w2s, s2w };
boot();
