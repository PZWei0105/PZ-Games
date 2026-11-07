'use strict';
/* ====== 介面 ====== */
const UI = {
  sel: null, build: null, mode: null, alert: null, sheet: null, q: [], modal: null, lastTouch: 0,
  _t: 0, _o: 0, _s: 0, prevSpeed: 1, porCache: new Map(),
};
const el = id => document.getElementById(id);

UI.init = function () {
  // 速度
  const sp = el('speed');
  [['pause', 0], ['play', 1], ['ff', 2], ['fff', 3]].forEach(([ic, v]) => {
    const b = h('button', { 'data-v': v, 'aria-label': '速度' + v, onclick: () => { SFX.click(); setSpeed(v); } });
    b.innerHTML = icon(ic); sp.append(b);
  });
  // 資源
  const rs = el('res');
  for (const k of RES_KEYS) {
    const c = h('div', { class: 'chip', 'data-k': k, onclick: () => resTip(k) });
    c.innerHTML = `<span style="color:${RES[k].color}">${icon(k)}</span><b class="num">0</b>`;
    rs.append(c);
  }
  const pw = h('div', { class: 'chip pw', onclick: () => resTip('power') });
  pw.innerHTML = `<span style="color:#ffe28a">${icon('power')}</span><span class="pwnet num">+0</span><span class="pwbar"><i></i></span>`;
  rs.append(pw);
  // 側邊
  const side = el('side');
  for (const [ic, f, lab] of [['rotL', () => rotate(-1), '向左旋轉'], ['rotR', () => rotate(1), '向右旋轉'], ['home', () => { const hh = hull(); centerOn(hh.x + 2.5, hh.y + 1.5, Math.max(CAM.z, 1.2)); }, '回到營地']]) {
    const b = h('button', { class: 'panel br', 'aria-label': lab, onclick: () => { SFX.click(); f(); } }); b.innerHTML = icon(ic); side.append(b);
  }
  // dock
  const dk = el('dock').querySelector('.bar');
  for (const [k, ic, lab] of [['build', 'build', '建造'], ['people', 'people', '人員'], ['pods', 'pod', '冬眠艙'], ['research', 'flask', '研究'], ['log', 'log', '日誌'], ['menu', 'menu', '選單']]) {
    const b = h('button', { class: 'db', 'data-k': k, onclick: () => { SFX.open(); UI.toggleSheet(k); } });
    b.innerHTML = icon(ic) + `<span>${lab}</span>`;
    dk.append(b);
  }
  el('sheet').querySelector('.sh-x').innerHTML = icon('x');
  el('sheet').querySelector('.sh-x').onclick = () => { SFX.close(); UI.closeSheet(); };
  el('sheet').addEventListener('pointerdown', () => { UI.lastTouch = performance.now(); });
  el('obj').onclick = e => {
    if (e.target.closest('.hintb')) return;
    el('obj').classList.toggle('min'); SFX.click();
  };
  el('modal').addEventListener('click', e => { if (UI.modal && UI.modal.onTap) UI.modal.onTap(e); });
};
function resTip(k) {
  if (k === 'power') {
    const P = G.power;
    UI.toast(`電力：發電 ${P.gen.toFixed(1)} kW／耗電 ${P.use.toFixed(1)} kW。電池 ${Math.floor(P.stored)}／${P.cap} 度。喚醒一人要 ${wakeCost()} 度。`);
  } else {
    const pop = awake().length;
    const tips = { food: `每人每天大約吃 2 份，目前 ${pop} 人。`, metal: '建造的主要材料，從殘骸與礦脈岩取得。', fiber: '傘菌樹的纖維，可以蓋圍籬、宿舍，也能當生質發電的燃料。', comp: '從貨櫃殘骸拆出，或在工坊用金屬加工。', med: '醫療站用生質製作，治療時使用。' };
    UI.toast(`${RES[k].name}：${Math.floor(G.res[k])}。${tips[k] || ''}`);
  }
}
function setSpeed(v) { G.speed = v; UI.prevSpeed = v || UI.prevSpeed; UI.updateHUD(true); }
function rotate(d) {
  try {
    const img = document.createElement('canvas'); img.width = cv.width; img.height = cv.height;
    img.getContext('2d').drawImage(cv, 0, 0);
    CAM.fade = { img, t: performance.now() };
  } catch (e) {}
  CAM.rot = (CAM.rot + d + 4) % 4;
}

/* ---------- HUD ---------- */
UI.updateHUD = function (force) {
  if (!G) return;
  const now = performance.now();
  if (!force && now - UI._t < 180) return;
  UI._t = now;
  const hh = hourOf(G.t);
  const night = isNight();
  const tide = G.tide.phase === 'active';
  const wlabel = tide ? '潮夜' : G.weather && G.weather.type === 'storm' ? '沙暴' : night ? '夜' : hh < 9 ? '清晨' : hh < 16 ? '白天' : '黃昏';
  el('clock').innerHTML = `<span style="color:${tide ? '#ff7bd8' : night ? '#cfc6ff' : '#ffd166'}">${icon(night || tide ? 'moon' : 'sun', 'moonic')}</span><div><div class="d">第 ${G.day} 日 <span class="t">${clockStr(G.t)}</span></div><div class="w">${wlabel}${G.tide.phase === 'warn' && G.tide.day ? ` · 潮夜：第 ${G.tide.day} 日` : ''}</div></div>`;
  $$('#speed button').forEach(b => { const v = +b.dataset.v; b.classList.toggle('on', v === G.speed); b.classList.toggle('p', v === 0 && G.speed === 0); });
  const pop = awake().length;
  for (const c of $$('#res .chip[data-k]')) {
    const k = c.dataset.k; const v = Math.floor(G.res[k]);
    c.querySelector('b').textContent = v;
    c.classList.toggle('low', (k === 'food' && v < pop * 3) || (k === 'metal' && v < 8) || (k === 'comp' && v < 3 && G.day > 2));
  }
  const P = G.power;
  const net = P.gen - P.use;
  const pw = $('#res .pw');
  pw.querySelector('.pwnet').textContent = (net >= 0 ? '+' : '') + net.toFixed(1);
  pw.querySelector('.pwnet').style.color = net >= 0 ? '#bff7cf' : '#ffb3b3';
  const lv = clamp(P.stored / P.cap, 0, 1);
  const bi = pw.querySelector('.pwbar i');
  bi.style.width = `calc(${lv * 100}% - 2px)`;
  bi.style.background = lv < 0.15 ? '#ff6b6b' : lv < 0.35 ? '#ffd166' : '#7cf0a0';
  bi.style.color = bi.style.background;
  // 潮夜
  const tb = el('tidebar');
  const T_ = G.tide;
  if (T_.phase === 'active') {
    tb.classList.remove('hidden');
    const boss = G.beasts.find(b => b.type === 'mother' && !b.dead);
    tb.innerHTML = `<div class="tt">潮夜</div><div class="ts">${T_.blackout ? `冬眠艙：最低維生${T_.lostThis ? `｜已失去 ${T_.lostThis} 具` : ''}` : '燈火全開，砲塔運作中'}${boss ? `<br>潮母 ${Math.ceil(boss.hp)}／${boss.hpMax}` : ''}</div><button class="sw ${T_.blackout ? 'on' : ''}" id="bo">燈火管制<i></i></button>`;
    el('bo').onclick = () => { setBlackout(!G.tide.blackout); UI.updateHUD(true); };
  } else if (T_.phase === 'warn' && T_.day && (T_.day - G.t / DAY) <= 4) {
    tb.classList.remove('hidden');
    const left = (T_.day - 1) * DAY + 18.5 * 60 - G.t;
    const d = Math.floor(left / DAY), hrs = Math.floor((left % DAY) / 60);
    tb.innerHTML = `<div class="tt">潮夜將至</div><div class="ts">雙月交會倒數 <b class="num">${d > 0 ? d + ' 日 ' : ''}${hrs} 小時</b>｜蓋圍籬、砲塔、照明，備好藥品</div>`;
  } else if (!P.ok) {
    tb.classList.remove('hidden');
    tb.innerHTML = `<div class="tt" style="color:#ffb3b3;text-shadow:0 0 12px #ff6b6b">斷電</div><div class="ts">冬眠艙維生系統降級中，撐太久會有人醒不過來。蓋太陽能板、蓄電池，或先停用耗電的建築。</div>`;
  } else tb.classList.add('hidden');
  // 徽章
  const podsB = $('#dock .db[data-k="pods"]');
  const canWake = P.stored >= wakeCost() && G.scan.length && G.pods.some(p => p.status === 'sleep');
  setBadge(podsB, canWake);
  const rB = $('#dock .db[data-k="research"]');
  setBadge(rB, hasB('research') && !G.tech.cur && TECH_ORDER.some(techAvailable));
  if (now - UI._o > 500) {
    UI._o = now; UI.updateObj();
    const hb = el('hud').getBoundingClientRect().bottom; el('obj').style.top = Math.round(hb + 6) + 'px';
    // 提示永遠貼在下方：面板打開時貼在面板上緣
    const sh = el('sheet'), ts = el('toasts');
    if (sh.classList.contains('open') && innerWidth < 900) ts.style.bottom = Math.round(innerHeight - sh.getBoundingClientRect().top + 8) + 'px';
    else ts.style.bottom = '';
  }
  if (UI.sheet && now - UI._s > 1100 && now - UI.lastTouch > 1500) { UI._s = now; UI.refreshSheet(); }
};
function setBadge(b, on) { let x = b.querySelector('.badge'); if (on && !x) b.append(h('i', { class: 'badge' })); if (!on && x) x.remove(); }

/* ---------- 目標 ---------- */
UI.updateObj = function () {
  const box = el('obj');
  const list = activeObjectives();
  const E = G.exp;
  let ex = '';
  if (E.phase && !['idle', 'done'].includes(E.phase)) {
    const el_ = (G.t - E.t0) / DAY;
    const left = Math.max(0, (E.ret + E.delay / DAY - el_) * 24);
    ex = `<div id="exptrk">◆ 遠征隊在外：${E.step < 3 ? '前往艦橋段' : '返回營地'}（約 ${Math.ceil(left)} 小時後回來）</div>`;
  }
  if (!list.length && !ex) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  let html = '';
  list.forEach((o, i) => {
    const allDone = o.checks.every(c => c[1]);
    let hint = o.hint;
    if (o.id === 'night1') hint = !hasB('dorm') ? 'build:dorm' : !hasB('mess') ? 'build:mess' : 'bush';
    if (o.id === 'study') hint = hasB('research') ? 'research' : 'build:research';
    if (o.id === 'wake1' || o.id === 'team') hint = G.power.stored >= wakeCost() ? 'pods' : 'build:solar';
    html += `<div class="${i ? 'o2' : ''}"><div class="oh"><span class="lbl">${o.ms ? 'MILESTONE' : i ? 'ALSO' : 'OBJECTIVE'}</span>${i === 0 && hint && !allDone ? `<button class="hintb" data-h="${hint}">指引</button>` : ''}</div><div class="ot">${o.title}</div>`;
    for (const [t, ok] of o.checks) html += `<div class="oi ${ok ? 'done' : ''}"><i class="bx"></i><span>${t}</span></div>`;
    html += '</div>';
  });
  html += ex;
  if (box._h !== html) { box.innerHTML = html; box._h = html; const hb = box.querySelector('.hintb'); if (hb) hb.onclick = () => { SFX.click(); UI.hint(hb.dataset.h); }; }
};
UI.hint = function (hint) {
  const [k, arg] = hint.split(':');
  if (k === 'build') { UI.openSheet('build', { focus: arg }); }
  else if (k === 'pods') UI.openSheet('pods');
  else if (k === 'research') UI.openSheet('research');
  else if (k === 'exp') { if (G.flags.located && !canLaunch()) UI.openSheet('exp'); else UI.openSheet(G.flags.antennaBuilt ? 'research' : 'build', { focus: 'antenna' }); }
  else if (k === 'bush') {
    const hh = hull();
    const n = G.world.nodes.filter(n => n.type === 'bush' && n.amt > 0 && explored(n.x, n.y)).sort((a, b) => dist(a.x, a.y, hh.x + 2.5, hh.y + 1.5) - dist(b.x, b.y, hh.x + 2.5, hh.y + 1.5))[0];
    if (n) { centerOn(n.x + .5, n.y + .5); UI.select({ kind: 'n', o: n }); UI.toast('按「標記附近同類」，採集的人就會去摘燈果。'); }
  }
  else if (k === 'crystal') {
    const n = G.world.nodes.filter(n => n.type === 'crystal' && explored(n.x, n.y)).sort((a, b) => dist(a.x, a.y, hull().x, hull().y) - dist(b.x, b.y, hull().x, hull().y))[0];
    if (G.flags.crystalSample) UI.openSheet('research');
    else if (n) { centerOn(n.x + .5, n.y + .5); UI.select({ kind: 'n', o: n }); UI.toast('點「標記採集」，採集人員就會去取樣。'); }
  }
};

/* ---------- 提示 ---------- */
UI.toast = function (text, type = 'info') {
  if (!text || UI.titleOn || (G && G.demo)) return;
  const box = el('toasts');
  const t = h('div', { class: 'toast panel ' + type }, text);
  if (UI.alert && type === 'bad' && performance.now() - UI.alert.t < 500) { const a = UI.alert; t.onclick = () => centerOn(a.x, a.y); t.style.cursor = 'pointer'; }
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 420); }, type === 'bad' ? 5200 : 3600);
};
UI.alertAt = function (x, y) { UI.alert = { x, y, t: performance.now() }; };

/* ---------- 選取 ---------- */
UI.select = function (s) {
  UI.sel = s;
  if (!s) { if (UI.sheet && ['c', 'b', 'n', 'beast'].includes(UI.sheet.kind)) UI.closeSheet(); return; }
  SFX.tap();
  UI.openSheet(s.kind, s);
};
UI.onTap = function (sx, sy) {
  if (UI.build) return UI.placeTap(sx, sy);
  const hit = pickAt(sx, sy);
  if (UI.mode) return UI.modeTap(hit);
  if (!hit || hit.kind === 'tile') { UI.select(null); return; }
  UI.select(hit);
};

/* ---------- 面板 ---------- */
UI.toggleSheet = function (k) { if (UI.sheet && UI.sheet.kind === k) UI.closeSheet(); else { UI.sel = null; UI.openSheet(k); } };
UI.openSheet = function (kind, data) {
  if (UI.build) UI.endBuild();
  UI.sheet = { kind, data };
  $$('#dock .db').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
  const sh = el('sheet');
  sh.classList.add('open');
  UI.refreshSheet(true);
  if (data && data.focus) setTimeout(() => { const c = sh.querySelector(`[data-type="${data.focus}"]`); if (c) { c.classList.add('hl'); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 80);
};
UI.closeSheet = function () {
  UI.sheet = null; UI.sel = null;
  el('sheet').classList.remove('open');
  $$('#dock .db').forEach(b => b.classList.remove('on'));
};
UI.refreshSheet = function (first) {
  const S = UI.sheet; if (!S) return;
  const sh = el('sheet'), body = sh.querySelector('.sh-b');
  const st = body.scrollTop;
  const R_ = SHEETS[S.kind];
  if (!R_) return;
  const out = R_(S.data, first);
  if (!out) { UI.closeSheet(); return; }
  sh.querySelector('.sh-t').textContent = out.t;
  sh.querySelector('.sh-s').textContent = out.s || '';
  body.replaceChildren(out.b);
  if (!first) body.scrollTop = st; else body.scrollTop = 0;
};
function sec(t) { return h('div', { class: 'sec' }, h('span', { class: 'lbl' }, t)); }
function meter(v, col) { const m = h('div', { class: 'meter' }); const i = h('i'); i.style.width = clamp(v, 0, 1) * 100 + '%'; if (col) { i.style.background = col; i.style.boxShadow = `0 0 8px ${col}`; } m.append(i); return m; }
function kv(k, v) { return h('div', { class: 'kv' }, h('span', null, k), h('b', null, v)); }
function btn(label, f, cls = '', dis) { const b = h('button', { class: 'btn ' + cls, onclick: e => { e.stopPropagation(); SFX.click(); f(); setTimeout(() => UI.refreshSheet(), 30); } }); b.innerHTML = label; if (dis) b.disabled = true; return b; }
function copyCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.style.width = src.style.width; c.style.height = src.style.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
UI.por = function (c, w = 96, hh = 116) {
  const key = (c.id || c.name) + ':' + w;
  let p = UI.porCache.get(key);
  if (!p) { p = portraitCanvas(c, w, hh); UI.porCache.set(key, p); }
  return copyCanvas(p);
};
function activity(c) {
  if (c.dead) return '已故';
  if (c.away) return '遠征中';
  if (c.downed) return c.lie ? '躺在' + BUILD[bById(c.lie)?.type || 'dorm'].name + '休養' : c.carriedBy ? '被抬去治療' : '倒下了，等人救援';
  if (c.brk) return '心情崩潰：' + { strike: '罷工', cry: '躲著哭', rage: '情緒失控' }[c.brk.type];
  const t = c.task;
  if (!t) return '發呆';
  const bn = t.bid && bById(t.bid) ? BUILD[bById(t.bid).type].name : '';
  const nn = t.nid && nodeById(t.nid) ? NODE[nodeById(t.nid).type].name : '';
  const pn = t.pid && byId(t.pid) ? byId(t.pid).name : '';
  switch (t.kind) {
    case 'build': return '建造' + bn;
    case 'repair': return '修補' + bn;
    case 'harvest': return t.phase === 'haul' ? '搬運' + (c.carry ? RES[c.carry.res].name : '物資') : '採集' + nn;
    case 'work': return ({ farm: '在溫室照顧星薯', craft: '在工坊製作' + (t.item === 'rifle' ? '步槍' : '零件'), research: G.tech.cur ? `研究「${TECH[G.tech.cur].name}」` : '分析資料', decrypt: '破解黑盒子', medmake: '製作藥品', repair: '修理冬眠艙' })[t.what] || '工作';
    case 'eat': return '吃飯'; case 'sleep': return t.ground ? '睡在地上' : '在宿舍睡覺'; case 'rest': return '休養';
    case 'rescue': return '搶救' + pn; case 'treat': return '照顧' + pn; case 'fight': return '戰鬥';
    case 'flee': return t.storm ? '躲沙暴' : '躲進艙內'; case 'patrol': return '巡邏'; case 'leisure': return '休息、聊天';
    case 'wander': return '四處走走'; case 'wait': return '等艦長說話'; case 'move': return '移動中'; case 'talk': return '和' + pn + '談話'; case 'inspect': return '調查' + nn;
    case 'break': return '心情崩潰';
  }
  return '';
}

const SHEETS = {};
SHEETS.c = function (s) {
  const c = s.o;
  if (!c || c.dead && !s.keep) return { t: c ? c.name : '', s: '已故', b: h('div', { class: 'muted' }, c ? `${c.name} 已經不在了。` : '') };
  const b = h('div');
  const head = h('div', { class: 'ph' });
  const por = h('div', { class: 'por' }); por.append(UI.por(c)); head.append(por);
  const info = h('div', { style: { flex: 1, minWidth: 0 } });
  info.append(h('div', { class: 'nm' }, c.name), h('div', { class: 'rl' }, `${c.role}｜${c.age} 歲｜${SUIT[c.suit].name}`), h('div', { class: 'now' }, '▸ ' + activity(c)));
  if (c.thought && !c.away) info.append(h('div', { class: 'th' }, '「' + c.thought + '」'));
  head.append(info); b.append(head);
  // 狀態
  const tags = h('div', { style: { marginTop: '8px' } });
  if (c.leader) tags.append(h('span', { class: 'tag', style: { color: '#ffe08a', borderColor: 'rgba(255,224,138,.4)' } }, '艦長｜你'));
  if (c.sick) tags.append(h('span', { class: 'tag neg' }, `${c.sickLabel}（${Math.ceil((c.sick - G.t) / 60)} 小時）`));
  if (c.weapon) tags.append(h('span', { class: 'tag' }, '配槍'));
  if (c.partner && byId(c.partner)) tags.append(h('span', { class: 'tag pos' }, '伴侶：' + byId(c.partner).name));
  if (!c.bed && !c.leader) tags.append(h('span', { class: 'tag neg' }, '沒有床位'));
  if (tags.childNodes.length) b.append(tags);
  // 數值
  const bars = h('div', { class: 'bars2', style: { marginTop: '10px' } });
  const mcol = c.mood >= 60 ? '#7cf0a0' : c.mood >= 35 ? '#ffd166' : '#ff6b6b';
  const row = (lab, v, col, txt) => { bars.append(h('span', null, lab), meter(v, col), h('span', { class: 'num' }, txt)); };
  row('心情', c.mood / 100, mcol, `${Math.round(c.mood)} ${moodWord(c.mood)}`);
  row('飽足', c.food / 100, '#f2a65a', Math.round(c.food));
  row('精神', c.rest / 100, '#9fb4ff', Math.round(c.rest));
  row('生命', c.hp / c.hpMax, '#ff8a8a', `${Math.round(c.hp)}/${c.hpMax}`);
  if (!c.leader) row('信任', (c.trust + 100) / 200, c.trust >= 30 ? '#7fe3ff' : c.trust >= -15 ? '#b8c7d9' : '#ff6b6b', `${Math.round(c.trust)}`);
  b.append(bars);
  // 艦長行動
  const L = leader();
  const acts = h('div', { class: 'btns' });
  if (c.leader) {
    acts.append(btn(icon('talk') + '找人談話', () => UI.startMode('talk')), btn(icon('move') + '移動到…', () => UI.startMode('move')));
    const ruin = G.world.nodes.find(n => n.type === 'ruin' && explored(n.x, n.y));
    if (ruin && !G.flags.ruin) acts.append(btn(icon('eye') + '調查石碑', () => { cmd(L, { kind: 'inspect', nid: ruin.id }); UI.toast('艦長出發去調查石碑。'); }, 'warn'));
    if (c.task && c.task.cmd) acts.append(btn('取消命令', () => endTask(c)));
  } else if (!c.away) {
    const recent = G.t - c.talkedAt < DAY;
    const can = L && !L.downed && !L.away;
    acts.append(btn(icon('talk') + (recent ? '今天談過了' : '請艦長來談談'), () => { cmd(L, { kind: 'talk', pid: c.id }); UI.toast(`艦長正走向 ${c.name}。`); }, recent ? '' : 'pri', !can));
  }
  if (!c.away) acts.append(btn(icon('eye') + '鏡頭跟隨', () => { UI.follow = c; UI.toast('鏡頭跟隨中（拖曳畫面即取消）。'); }));
  b.append(acts);
  // 工作
  if (!c.away) {
    b.append(sec('主要工作 JOB'));
    const jobs = h('div', { class: 'jobs' });
    for (const j of JOB_KEYS) {
      const J = JOBS[j];
      const x = h('button', { class: 'job' + (c.job === j ? ' on' : ''), onclick: () => { SFX.click(); setJob(c, j); if (j === 'guard' && !c.weapon) UI.toast(G.rifles > 0 ? '' : '軍械櫃沒有步槍了。可以在工坊製造。', 'warn'); UI.refreshSheet(); } });
      x.innerHTML = icon(J.icon) + `<span>${J.name}</span><span class="lv">${c.sk[J.skill]}</span>`;
      jobs.append(x);
    }
    b.append(jobs);
    b.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '沒有自己的工作時，大家會去幫忙建造與採集。'));
  }
  // 技能
  b.append(sec('技能 SKILLS'));
  const sk = h('div', { class: 'skills' });
  const top = topSkill(c);
  for (const k of SKILL_KEYS) {
    const v = c.sk[k];
    const r = h('div', { class: 'sk' + ((JOBS[top] && JOBS[top].skill === k) || (top === k) ? ' top' : '') });
    const pips = h('div', { class: 'pips' }); for (let i = 1; i <= 10; i++) pips.append(h('i', { class: i <= v ? 'f' : '' }));
    r.append(h('span', null, SKILLS[k]), pips, h('span', { class: 'num' }, v));
    sk.append(r);
  }
  b.append(sk);
  // 特質
  b.append(sec('特質 TRAITS'));
  const tr = h('div');
  for (const t of c.traits) { const d = TRAITS[t] || { d: '' }; tr.append(h('span', { class: 'tag ' + (d.pos === true ? 'pos' : d.pos === false ? 'neg' : ''), onclick: () => UI.toast(`${t}：${d.d}`) }, t)); }
  b.append(tr);
  // 心情來源
  if (c.moodMods && c.moodMods.length) {
    b.append(sec('心情來源 MOOD'));
    const m = h('div', { class: 'mods' });
    for (const x of c.moodMods.slice(0, 8)) m.append(h('span', { class: x.v >= 0 ? 'good' : 'bad' }, `${x.label} ${x.v > 0 ? '+' : ''}${x.v}`));
    b.append(m);
  }
  // 人際
  const others = G.colonists.filter(o => o !== c && !o.dead && relGet(c, o) !== undefined).map(o => ({ o, v: opinion(c, o) })).filter(x => Math.abs(x.v) >= 8 || preTag(c, x.o)).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 7);
  if (others.length) {
    b.append(sec('人際 RELATIONS'));
    for (const { o, v } of others) {
      const [lab, cls] = relLabel(v);
      const tag = preTag(c, o);
      const r = h('div', { class: 'rel', onclick: () => { if (!o.away && !o.dead) { UI.select({ kind: 'c', o }); centerOn(o.x, o.y); } } });
      const mp = UI.por(o, 30, 36); mp.style.flex = 'none';
      r.append(mp, h('span', null, o.name), tag ? h('span', { class: 'tag pos', style: { margin: 0 } }, tag) : '', h('span', { class: 'rv ' + cls }, `${lab} ${v > 0 ? '+' : ''}${Math.round(v)}`));
      b.append(r);
    }
  }
  b.append(sec('檔案 DOSSIER'), h('div', { class: 'bio' }, c.bio));
  return { t: c.name, s: c.leader ? '長庚號艦長（你）' : c.role, b };
};
SHEETS.b = function (s) {
  const B = s.o;
  if (!G.buildings.includes(B)) return null;
  const d = BUILD[B.type];
  const b = h('div');
  const pw = d.use || d.gen;
  const status = !B.done ? `施工中 ${Math.floor(B.prog * 100)}%` : !B.active ? '已停用' : pw && !powered(B) && !d.gen ? '停電' : '運作中';
  const top = h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } });
  const th = thumbImg(B.type); th.style.width = '110px'; th.style.height = '86px'; th.style.flex = 'none';
  const inf = h('div', { style: { flex: 1 } }, h('div', { class: 'small ' + (status === '運作中' ? 'good' : status === '停電' ? 'bad' : 'warnc') }, '● ' + status), h('div', { class: 'bio', style: { marginTop: '4px' } }, d.desc));
  top.append(th, inf); b.append(top);
  b.append(kv('耐久', `${Math.ceil(B.hp)} / ${B.hpMax}`), meter(B.hp / B.hpMax, B.hp < B.hpMax * .35 ? '#ff6b6b' : '#7fe3ff'));
  if (d.use) b.append(kv('耗電', d.use + ' kW'));
  if (d.gen) b.append(kv('目前發電', (B.out || 0).toFixed(1) + ' kW'));
  const wk = G.colonists.filter(c => c.task && c.task.bid === B.id && !c.dead).map(c => c.name);
  if (wk.length) b.append(kv(B.done ? '在這裡的人' : '施工人員', wk.join('、')));
  const acts = h('div', { class: 'btns' });
  switch (B.type) {
    case 'hull': {
      b.append(kv('電池', `${Math.floor(G.power.stored)} / ${G.power.cap} 度`), kv('軍械櫃', `步槍 ${G.rifles} 把`));
      const sleeping = G.pods.filter(p => p.status === 'sleep').length;
      b.append(kv('冬眠艙', `沉睡中 ${sleeping} 具`));
      acts.append(btn(icon('pod') + '打開冬眠艙庫', () => UI.openSheet('pods'), 'pri'));
      if (G.flags.located) acts.append(btn(icon('exp') + '遠征隊', () => UI.openSheet('exp')));
      break;
    }
    case 'battery': b.append(kv('全殖民地電池', `${Math.floor(G.power.stored)} / ${G.power.cap} 度`)); break;
    case 'biogen': b.append(kv('燃料', G.res.fiber >= 1 || B.fuel > 0 ? '生質充足' : '沒有生質了！')); break;
    case 'dorm': { const r = G.colonists.filter(c => c.bed === B.id && !c.dead).map(c => c.name); b.append(kv('住戶', r.length ? r.join('、') : '（空）'), kv('床位', `${r.length} / 4`)); break; }
    case 'medbay': { const r = G.colonists.filter(c => c.lie === B.id && !c.dead).map(c => c.name); b.append(kv('病床', r.length ? r.join('、') : '（空）'), kv('藥品庫存', Math.floor(G.res.med))); break; }
    case 'research': {
      b.append(kv('目前研究', G.tech.cur ? TECH[G.tech.cur].name : '（未選擇）'), kv('資料庫存', Math.floor(G.res.data)));
      acts.append(btn(icon('flask') + '選擇研究項目', () => UI.openSheet('research'), 'pri'));
      if (G.flags.blackbox && !G.flags.decrypted) b.append(h('div', { class: 'small warnc' }, CA('shen') ? '沈鷺做研究工作時，會優先破解黑盒子。' : '研究「黑盒子解密」可以破解黑盒子。'));
      break;
    }
    case 'workshop': {
      b.append(kv('軍械櫃', `步槍 ${G.rifles} 把｜排程 ${G.rifleQ} 把`));
      acts.append(btn((G.compOn ? '✓ ' : '') + '持續生產零件', () => { G.compOn = !G.compOn; }, G.compOn ? 'pri' : ''));
      acts.append(btn('+1 步槍（8 金屬、3 零件）', () => { G.rifleQ++; }));
      b.append(h('div', { class: 'small muted' }, '工坊需要「製造」工作的人。零件存到 40 就會暫停，而且一定保留 20 金屬給建造用。警戒人員會自動配槍。'));
      break;
    }
    case 'greenhouse': {
      b.append(kv('生長進度', Math.floor(B.grow) + '%'), meter(B.grow / 100, '#8fe08a'));
      const dark = G.flags.ghDark > G.t;
      acts.append(btn(dark ? '恢復夜間補光' : '關掉夜間補光', () => { G.flags.ghDark = dark ? 0 : G.t + 12 * 60; }));
      break;
    }
    case 'antenna': b.append(kv('信號', G.tech.done.signal ? '已定位艦橋段' : '需要研究「信號解析」')); if (G.flags.located) acts.append(btn(icon('exp') + '遠征隊', () => UI.openSheet('exp'), 'pri')); break;
    case 'turret': b.append(kv('射程', BUILD.turret.range + ' 格'), kv('傷害', BUILD.turret.dmg * (G.tech.done.ballistic ? 1.25 : 1))); break;
  }
  if (B.done && (d.use || d.gen) && B.type !== 'hull') acts.append(btn(B.active ? '停用' : '啟用', () => { B.active = !B.active; }));
  if (B.type !== 'hull') acts.append(btn(B.done ? '拆除（退回一半材料）' : '取消施工（全額退回）', () => UI.confirm(B.done ? `拆除${d.name}？` : `取消施工${d.name}？`, () => { cancelBuild(B); UI.closeSheet(); }), 'bad'));
  b.append(acts);
  return { t: d.name, s: B.done ? '' : '施工中', b };
};
SHEETS.n = function (s) {
  const n = s.o;
  if (!G.world.nodes.includes(n)) return null;
  const d = NODE[n.type];
  const b = h('div');
  b.append(h('div', { class: 'bio' }, d.desc));
  if (d.res) {
    b.append(kv('每次採集', `+${d.yield} ${RES[d.res].name}${d.bonus && d.bonus.comp ? '（有機會拆出零件）' : ''}`));
    if (n.type === 'bush') b.append(kv('狀態', n.amt > 0 ? '果實成熟' : `再生中（約 ${Math.ceil(((n.regrowAt || 0) - G.t) / 60)} 小時）`));
    else if (d.amt) b.append(kv('剩餘', `${n.amt} 次`));
    if (n.type === 'crystal' && !G.story.done.study && !n.marked) b.append(h('div', { class: 'small warnc' }, '完成「研究這顆星」之後，晶簇才會引起大家的興趣。也可以手動標記。'));
    const acts = h('div', { class: 'btns' });
    acts.append(btn(n.marked ? '取消標記' : '標記採集', () => { markNode(n, !n.marked); }, n.marked ? '' : 'pri'));
    acts.append(btn('標記附近同類', () => { const k = markNear(n); UI.toast(`標記了 ${k} 處${d.name}。採集人員會優先處理。`); }));
    b.append(acts);
    b.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '「採集」工作的人會優先處理標記的目標；沒有標記時，他們會挑營地最缺的資源。'));
  }
  if (n.type === 'ruin') {
    const acts = h('div', { class: 'btns' });
    acts.append(btn(icon('eye') + (G.flags.ruin ? '再去看看' : '派艦長調查'), () => { cmd(leader(), { kind: 'inspect', nid: n.id }); UI.toast('艦長出發去調查石碑。'); UI.closeSheet(); }, 'pri', leader().away || leader().downed));
    b.append(acts);
  }
  if (n.type === 'nest') b.append(h('div', { class: 'small bad' }, '刺背獸會從這裡出來夜襲。'));
  return { t: d.name, s: '', b };
};
SHEETS.beast = function (s) {
  const x = s.o;
  if (x.dead) return null;
  const d = BEAST[x.type];
  const b = h('div');
  b.append(kv('生命', `${Math.ceil(x.hp)} / ${x.hpMax}`), meter(x.hp / x.hpMax, '#ff6b6b'));
  b.append(kv('狀態', x.hostile ? '具攻擊性' : '在荒野遊蕩'));
  const desc = { bug: '趨光的小型生物，單獨一隻沒什麼威脅。潮夜時會成千上萬地湧來。', spine: '背上長著發光尖刺的掠食者，會在夜裡襲擊落單的人。', mother: '潮夜的主宰。牠會朝共振最強的地方前進——也就是冬眠艙。' }[x.type];
  b.append(h('div', { class: 'bio' }, desc));
  return { t: d.name, s: '原生生物', b };
};
SHEETS.build = function (data) {
  const b = h('div');
  UI.buildTab = UI.buildTab || 'power';
  if (data && data.focus && BUILD[data.focus]) { UI.buildTab = BUILD[data.focus].cat; data.focus2 = data.focus; data.focus = null; }
  const tabs = h('div', { class: 'tabs' });
  for (const k in BUILD_CATS) tabs.append(h('button', { class: 'tab' + (UI.buildTab === k ? ' on' : ''), onclick: () => { SFX.click(); UI.buildTab = k; UI.refreshSheet(true); } }, BUILD_CATS[k]));
  b.append(tabs);
  const cards = h('div', { class: 'cards' });
  for (const type in BUILD) {
    const d = BUILD[type];
    if (d.cat !== UI.buildTab) continue;
    const un = isUnlocked(type);
    if (type === 'antenna' && !un) continue;
    const card = h('button', { class: 'card' + (un ? '' : ' lock'), 'data-type': type, onclick: () => { if (!un) { UI.toast(d.req === '@antenna' ? '劇情尚未解鎖。' : `需要研究「${TECH[d.req].name}」。`, 'warn'); return; } SFX.click(); UI.startBuild(type); } });
    card.append(thumbImg(type), h('div', { class: 'cn' }, d.name));
    const cc = h('div', { class: 'cc' });
    for (const k in d.cost) cc.append(h('span', { class: (G.res[k] || 0) < d.cost[k] ? 'no' : '', html: `<span style="color:${RES[k].color}">${icon(k)}</span>${d.cost[k]}` }));
    if (d.use) cc.append(h('span', { html: `<span style="color:#ffe28a">${icon('power')}</span>-${d.use}` }));
    if (d.gen) cc.append(h('span', { class: 'good', html: `<span style="color:#ffe28a">${icon('power')}</span>+${d.gen}` }));
    card.append(cc);
    if (!un) card.append(h('div', { class: 'lk' }, '研究：' + (TECH[d.req] ? TECH[d.req].name : '？')));
    if (data && data.focus2 === type) card.classList.add('hl');
    cards.append(card);
  }
  b.append(cards);
  return { t: '建造', s: '選一個建築，再點地圖決定位置', b };
};
SHEETS.people = function () {
  const b = h('div');
  const list = G.colonists.filter(c => !c.dead);
  const avgM = list.reduce((s, c) => s + c.mood, 0) / Math.max(1, list.length);
  b.append(kv('殖民地人數', `${list.length} 人（遠征 ${list.filter(c => c.away).length}）`), kv('平均心情', `${Math.round(avgM)} ${moodWord(avgM)}`), kv('對艦長的平均信任', Math.round(avgTrust())), kv('床位', `${G.colonists.filter(c => c.bed && !c.dead).length} / ${bedCount()}`), kv('每日食物消耗', `約 ${list.length * 2} 份`));
  b.append(sec('成員 CREW'));
  const l = h('div', { class: 'list' });
  for (const c of list) {
    const li = h('button', { class: 'li', onclick: () => { SFX.tap(); if (!c.away) centerOn(c.x, c.y); UI.select({ kind: 'c', o: c }); } });
    const mp = UI.por(c, 40, 48); mp.className = 'mini';
    const mcol = c.mood >= 60 ? '#7cf0a0' : c.mood >= 35 ? '#ffd166' : '#ff6b6b';
    const m = h('div', { class: 'li-m' });
    const nm = h('div', { class: 'li-n' }, c.name); nm.insertAdjacentHTML('beforeend', `<span style="color:var(--mut);font-weight:400;font-size:12px">${icon(JOBS[c.job].icon)} ${JOBS[c.job].name}</span>`);
    m.append(nm, h('div', { class: 'li-s' }, activity(c)), meter(c.mood / 100, mcol));
    li.append(mp, m);
    l.append(li);
  }
  b.append(l);
  return { t: '人員', s: '點一個人看詳細資料', b };
};
SHEETS.pods = function () {
  const b = h('div');
  const P = G.power, cost = wakeCost();
  const bt = h('div', { class: 'batt panel' });
  const enough = P.stored >= cost;
  bt.innerHTML = `<span style="color:#ffe28a">${icon('power')}</span><div style="flex:1"><div class="lbl">BATTERY</div><div class="big num">${Math.floor(P.stored)}<span class="muted" style="font-size:14px"> / ${P.cap} 度</span></div><div class="small ${enough ? 'good' : 'warnc'}">${enough ? `電力足夠，可以喚醒一人（${cost} 度）` : `喚醒需要 ${cost} 度，還差 ${Math.ceil(cost - P.stored)} 度`}</div></div>`;
  b.append(bt);
  const hh0 = hourOf(G.t);
  const after = P.stored - cost;
  if (enough && after < P.use * 9 && (hh0 > 14 || hh0 < 6)) b.append(h('div', { class: 'small warnc', style: { marginTop: '6px', lineHeight: 1.6 } }, `⚠ 喚醒後電池只剩 ${Math.floor(after)} 度。照目前每小時 ${P.use.toFixed(1)} 度的耗電，今晚可能撐不住——斷電太久，沉睡中的冬眠艙會有危險。`));
  const free = bedCount() - G.colonists.filter(c => c.bed && !c.dead).length;
  if (free <= 0) b.append(h('div', { class: 'small warnc', style: { marginTop: '6px' } }, '沒有空床位了——新醒來的人只能睡在地上。'));
  b.append(sec('伴星掃描 SCAN'));
  const scan = G.scan.map(podById).filter(p => p && p.status === 'sleep');
  const freeScan = G.day > G.scanDay || G.freeScan;
  const pods = h('div', { class: 'pods' });
  for (const p of scan) pods.append(podCard(p, enough));
  if (!scan.length) pods.append(h('div', { class: 'muted small' }, '沒有可喚醒的冬眠艙。'));
  b.append(pods);
  const rb = h('div', { class: 'btns' });
  rb.append(btn(freeScan ? '重新掃描（今日免費）' : '重新掃描（5 度電）', () => { if (rescan(!freeScan)) { G.freeScan = false; SFX.research(); } else UI.toast('電力不足。', 'bad'); }, '', !freeScan && P.stored < 5));
  b.append(rb);
  b.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '資料庫受損，伴星只能讀出部分資訊。每天可以免費重新掃描一次。'));
  const dmg = G.pods.filter(p => p.status === 'sleep' && p.dmg);
  if (dmg.length) {
    b.append(sec('受損艙 DAMAGED'));
    const dl = h('div', { class: 'pods' });
    for (const p of dmg) {
      const per = podPerson(p);
      const card = h('div', { class: 'pod dmg' });
      const left = p.left / DAY;
      const info = h('div', { class: 'pi' });
      info.append(h('div', { class: 'pl' }, '艙 ' + p.label), h('div', { class: 'pn' }, p.mask.name || p.key === 'bai' ? per.name : '（姓名毀損）'), h('div', { class: 'pr ' + (left < 2 ? 'bad' : 'warnc') }, p.repairQ ? `修理中 ${Math.floor(p.repair / 60 * 100)}%（需要「製造」的人）` : `維生系統剩約 ${left >= 1 ? Math.floor(left) + ' 日 ' : ''}${Math.floor((p.left % DAY) / 60)} 小時`));
      const acts = h('div', { class: 'btns' });
      if (!p.repairQ) acts.append(btn('修復（6 零件）', () => { if (!repairPod(p)) UI.toast('零件不足。', 'bad'); else UI.toast(`已排程修理 ${p.label}。`, 'good'); }, 'warn', G.res.comp < 6));
      acts.append(btn(`直接喚醒（${cost} 度）`, () => UI.doWake(p), '', !enough));
      info.append(acts);
      card.append(info);
      dl.append(card);
    }
    b.append(dl);
  }
  const sl = G.pods.filter(p => p.status === 'sleep').length, aw = G.pods.filter(p => p.status === 'awake').length, lo = G.pods.filter(p => p.status === 'lost').length;
  b.append(sec('統計'), kv('沉睡中', sl + ' 具'), kv('已甦醒', aw + ' 具'), kv('已失去', lo + ' 具'));
  return { t: '冬眠艙庫', s: '選擇要喚醒的人', b };
};
function podCard(p, enough) {
  const per = podPerson(p);
  const m = p.mask;
  const card = h('div', { class: 'pod' });
  const pp = h('div', { class: 'pp' });
  const por = portraitCanvas(per, 64, 78, { corrupt: m.corrupt || !m.name });
  if (m.corrupt) por.style.filter = 'blur(2.2px) brightness(.8)';
  else if (!m.name) por.style.filter = 'blur(1.6px) brightness(.9)';
  pp.append(por);
  const info = h('div', { class: 'pi' });
  info.append(h('div', { class: 'pl' }, '艙 ' + p.label));
  if (m.corrupt) { info.append(h('div', { class: 'pn bad' }, '▒▒ 資料毀損 ▒▒'), h('div', { class: 'pr' }, '艙壓正常。其餘一無所知。')); }
  else {
    info.append(h('div', { class: 'pn' }, m.name ? per.name : '姓名：？？？'));
    info.append(h('div', { class: 'pr' }, (m.role ? per.role : '職業：？？？') + (per.age && m.name ? `｜${per.age} 歲` : '')));
    if (m.trait) info.append(h('div', { style: { marginTop: '3px' } }, h('span', { class: 'tag' }, per.traits[0] || '？')));
  }
  const acts = h('div', { class: 'btns', style: { marginTop: '4px' } });
  acts.append(btn(icon('pod') + `喚醒（${wakeCost()} 度）`, () => UI.doWake(p), 'pri', !enough));
  info.append(acts);
  card.append(pp, info);
  return card;
}
UI.doWake = function (p) {
  const c = wakePod(p);
  if (!c) { UI.toast('電力不足。', 'bad'); return; }
  UI.closeSheet();
  UI.queueWake(c, p);
};
SHEETS.research = function () {
  const b = h('div');
  b.append(kv('資料庫存', Math.floor(G.res.data)), kv('研究人員', G.colonists.filter(c => c.task && c.task.what === 'research').map(c => c.name).join('、') || '（沒有人在研究台）'));
  if (!hasB('research')) b.append(h('div', { class: 'small warnc' }, '先蓋一座研究台，指派「研究」工作的人。'));
  b.append(sec('技術 TECH'));
  const l = h('div', { class: 'list' });
  for (const id of TECH_ORDER) {
    const t = TECH[id];
    const done = G.tech.done[id], cur = G.tech.cur === id, av = techAvailable(id);
    if (t.story && !done && !av && !(t.need && G.flags[t.need]) && id !== 'crystal' && id !== 'signal') { if (id === 'decrypt' && !G.flags.blackbox) continue; }
    if (id === 'signal' && !G.flags.antenna) continue;
    if (id === 'decrypt' && !G.flags.blackbox) continue;
    const li = h('div', { class: 'li', style: { alignItems: 'flex-start', flexDirection: 'column', gap: '4px', borderColor: cur ? 'var(--cy)' : '' } });
    const top = h('div', { style: { display: 'flex', width: '100%', alignItems: 'center', gap: '8px' } });
    top.append(h('div', { class: 'li-n', style: { flex: 1 } }, (done ? '✓ ' : '') + t.name), h('span', { class: 'num small ' + (done ? 'good' : 'muted') }, done ? '完成' : `${Math.floor(G.tech.prog[id] || 0)}/${t.cost}`));
    li.append(top, h('div', { class: 'small muted', style: { lineHeight: 1.55 } }, t.desc));
    if (!done) {
      if (cur) li.append(meter((G.tech.prog[id] || 0) / t.cost));
      else if (av) li.append(btn('研究這個', () => { setResearch(id); SFX.research(); }, 'pri'));
      else {
        let why = '';
        if (t.pre && !t.pre.every(p => G.tech.done[p])) why = '需要先完成：' + t.pre.filter(p => !G.tech.done[p]).map(p => TECH[p].name).join('、');
        else if (t.need) why = { crystalSample: '需要晶簇樣本', antennaBuilt: '需要通訊天線', blackbox: '需要黑盒子' }[t.need];
        li.append(h('div', { class: 'small warnc' }, why));
      }
    }
    l.append(li);
  }
  b.append(l);
  return { t: '研究', s: '研究人員產出的資料會投入目前的項目', b };
};
SHEETS.log = function () {
  const b = h('div');
  UI.logTab = UI.logTab || 'obj';
  const tabs = h('div', { class: 'tabs' });
  for (const [k, n] of [['obj', '主線'], ['log', '紀錄']]) tabs.append(h('button', { class: 'tab' + (UI.logTab === k ? ' on' : ''), onclick: () => { UI.logTab = k; UI.refreshSheet(true); } }, n));
  b.append(tabs);
  if (UI.logTab === 'obj') {
    b.append(h('div', { class: 'lbl' }, G.story.act >= 2 ? 'ACT I — COMPLETE' : 'ACT I — 墜落'));
    for (const m of MAIN) {
      const done = G.story.done[m.id], av = OBJ[m.id].avail();
      if (!done && !av) { b.append(h('div', { class: 'li', style: { opacity: .45 } }, h('div', { class: 'li-m' }, h('div', { class: 'li-n' }, '？？？')))); continue; }
      b.append(h('div', { class: 'li' }, h('div', { class: 'li-m' }, h('div', { class: 'li-n' + (done ? ' good' : '') }, (done ? '✓ ' : '◇ ') + m.title), h('div', { class: 'small muted', style: { whiteSpace: 'normal' } }, m.desc))));
    }
    if (G.story.act >= 2) {
      b.append(sec('第二幕 ACT II'), h('div', { class: 'bio' }, '第二幕「呼喚」製作中。殖民地會繼續運作，潮夜會週期性地回來，冬眠艙裡還有很多人在等你。'));
    }
    if (G.flags.courseKnown) b.append(sec('已知的事'), h('div', { class: 'bio' }, [
      '・這裡不是新禾。我們偏離了四十一光年。',
      G.flags.sophiaScene ? '・蘇菲亞說：這種偏差不可能是故障，是有人花了好幾年一點一點改掉的。' : '',
      G.flags.aiCheck ? '・伴星曾反覆讀取艦長的冬眠艙紀錄。' : '',
      G.flags.ruin ? '・石碑的紋路和晶簇同步。艦長碰到它時，心跳停了兩秒。' : '',
      G.tide.day ? '・雙月交會的夜晚，整座峽谷的生物會湧向共振最強的地方。' : '',
      G.flags.decrypted ? '・航道是用艦長授權碼 W-0001 改掉的。艦長曾在航行第三十年甦醒十九分鐘，之後要求刪除那段記憶。他當時說：「帶他們去，它在呼喚的地方。」' : '',
    ].filter(Boolean).join('\n')));
  } else {
    const l = h('div', { class: 'loglist' });
    for (const e of G.logs.slice().reverse()) { const d = h('div', { class: e.type }); d.append(h('span', { class: 'lt' }, `D${dayOf(e.t)} ${clockStr(e.t)}`), e.text); l.append(d); }
    b.append(l);
  }
  return { t: '日誌', s: '', b };
};
SHEETS.exp = function () {
  const b = h('div');
  const why = canLaunch();
  b.append(h('div', { class: 'bio' }, '前往東北方二十二公里外的艦橋段，取回黑盒子。來回大約兩天，途中會遇到需要判斷的狀況——隊伍裡的技能越齊全越好（建造、戰鬥、研究）。'));
  if (why) { b.append(h('div', { class: 'small warnc', style: { margin: '8px 0' } }, why)); return { t: '遠征隊', s: '', b }; }
  UI.expSel = UI.expSel || new Set();
  if (G.flags.xmGo && C('xiaoman')) UI.expSel.add(C('xiaoman').id);
  b.append(sec('選擇隊員（2～3 人）'));
  const l = h('div', { class: 'list' });
  for (const c of awake().filter(c => !c.downed)) {
    const on = UI.expSel.has(c.id);
    const li = h('button', { class: 'li', style: { borderColor: on ? 'var(--cy)' : '' }, onclick: () => { if (on) UI.expSel.delete(c.id); else if (UI.expSel.size < 3) UI.expSel.add(c.id); else UI.toast('最多三人。'); UI.refreshSheet(); } });
    const mp = UI.por(c, 40, 48); mp.className = 'mini';
    li.append(mp, h('div', { class: 'li-m' }, h('div', { class: 'li-n' }, (on ? '✓ ' : '') + c.name + (c.leader ? '（艦長）' : '')), h('div', { class: 'li-s' }, `建造 ${c.sk.build}｜戰鬥 ${c.sk.combat}｜研究 ${c.sk.research}${c.sick ? '｜生病中' : ''}`)));
    l.append(li);
  }
  b.append(l);
  const ok = UI.expSel.size >= 2;
  b.append(h('div', { class: 'btns' }, btn(icon('exp') + `出發（${UI.expSel.size} 人）`, () => { const r = launchExpedition([...UI.expSel]); if (r) UI.toast(r, 'bad'); else { UI.expSel = null; UI.closeSheet(); } }, 'pri', !ok)));
  b.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '隊員離開期間不會在營地工作。'));
  return { t: '遠征隊', s: '艦橋段・黑盒子', b };
};
SHEETS.menu = function () {
  const b = h('div');
  const acts = h('div', { class: 'btns' });
  acts.append(btn('存檔', () => saveGame(true), 'pri'), btn('說明', () => UI.openSheet('help')), btn(SFX.muted ? icon('mute') + '開聲音' : icon('sound') + '靜音', () => { SFX.toggleMute(); }));
  b.append(acts);
  b.append(sec('音量'));
  for (const [k, n] of [['master', '總音量'], ['music', '音樂與環境'], ['sfx', '音效']]) {
    const r = h('input', { type: 'range', class: 'rng', min: 0, max: 1, step: 0.05, value: SFX.vol[k] });
    r.oninput = () => SFX.setVol(k, +r.value);
    r.addEventListener('pointerdown', e => e.stopPropagation());
    b.append(h('div', { class: 'small muted' }, n), r);
  }
  b.append(sec('存檔碼（備份或換裝置）'));
  const ta = h('textarea', { class: 'code', placeholder: '按「產生存檔碼」，或貼上存檔碼再按「讀取」。' });
  ta.addEventListener('pointerdown', e => e.stopPropagation());
  b.append(ta);
  b.append(h('div', { class: 'btns' },
    btn('產生存檔碼', () => { ta.value = exportCode(); ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => UI.toast('已複製到剪貼簿。', 'good')).catch(() => UI.toast('已產生，請手動複製。')); } catch (e) { UI.toast('已產生，請手動複製。'); } }),
    btn('讀取存檔碼', () => { try { const o = importCode(ta.value); UI.confirm('讀取這個存檔？目前的進度會被取代。', () => { startFromSave(o); UI.toast('讀取完成。', 'good'); }); } catch (e) { UI.toast('存檔碼無法讀取。', 'bad'); } })));
  b.append(sec('其他'));
  b.append(h('div', { class: 'btns' }, btn('回到標題畫面', () => { saveGame(); UI.closeSheet(); showTitle(); }), btn('重新開始', () => UI.confirm('放棄目前的殖民地，重新開始？', () => { clearLocal(); UI.closeSheet(); startNew(true); }), 'bad')));
  b.append(h('div', { class: 'small muted', style: { marginTop: '10px' } }, `自動存檔：每天早上與離開時。${CLOUD.ready ? '已連上 Claude 雲端存檔。' : ''}`));
  return { t: '選單', s: '墜星 LANDFALL', b };
};
SHEETS.help = function () {
  const b = h('div', { class: 'help' });
  b.innerHTML = `
<p><b>你是艦長魏子葳。</b>長庚號迫降在一顆有兩個月亮的星球上，船上一百多人還在冬眠。你要讓他們一個個醒來，活下去。</p>
<p><b>操作</b>：單指拖曳移動畫面、雙指縮放；右側按鈕可以旋轉視角、回到營地。點人、建築、資源，下方會出現詳細資料。</p>
<p><b>建造</b>：點「建造」選一個建築，點地圖決定位置，再按 ✓。材料會先扣掉，接著有人去施工，你會看著它一點一點蓋起來。圍籬可以連續點擊快速放置。</p>
<p><b>人員</b>：每個人都有主要工作。沒事做的時候，大家會去幫忙建造和採集。點一個人可以換工作、看他的心情來源、人際關係，以及他現在在想什麼。</p>
<p><b>喚醒</b>：電池存到 60 度就能從「冬眠艙」喚醒一人。資料庫受損，你只看得到部分資料——誰會醒來，打開才知道。受損的冬眠艙有倒數，記得修。</p>
<p><b>心情與信任</b>：吃得好、睡得好、有朋友、被艦長重視，心情就會變好。心情太差的人會崩潰。你的每個決定，都會影響大家對你的信任。艦長可以親自找人談話。</p>
<p><b>夜晚</b>：刺背獸會在夜裡出沒。把一兩個人的工作設成「警戒」，他們會拿槍巡邏。</p>
<p><b>潮夜</b>：雙月交會的那一夜，整座峽谷的生物都會湧來。蓋圍籬、照明、砲塔，備好藥品。潮夜時可以下令「燈火管制」——怪物會變少，但冬眠艙會降到最低維生。</p>
<p><b>電腦操作</b>：滑鼠滾輪縮放、拖曳移動；空白鍵暫停，1／2／3 切換速度，Q／E 旋轉，B 建造，Esc 關閉面板。</p>`;
  return { t: '說明', s: '', b };
};

/* ---------- 建造模式 ---------- */
UI.startBuild = function (type) {
  UI.closeSheet();
  const d = BUILD[type];
  const [cx, cy] = s2w(CAM.W / 2, CAM.H * 0.55);
  UI.build = { type, x: clamp(Math.floor(cx - d.w / 2 + 0.5), 0, N - d.w), y: clamp(Math.floor(cy - d.h / 2 + 0.5), 0, N - d.h), placed: 0 };
  // 從中心找最近的可放位置
  if (canPlace(type, UI.build.x, UI.build.y)) {
    outer: for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!canPlace(type, UI.build.x + dx, UI.build.y + dy)) { UI.build.x += dx; UI.build.y += dy; break outer; }
    }
  }
  el('dock').classList.add('hidden');
  el('buildbar').classList.remove('hidden');
  UI.renderBuildBar();
};
UI.renderBuildBar = function () {
  const B = UI.build; if (!B) return;
  const d = BUILD[B.type];
  const bar = el('buildbar').querySelector('.bar');
  const why = canPlace(B.type, B.x, B.y) || (canAfford(d.cost) ? '' : '材料不足');
  const cost = Object.entries(d.cost).map(([k, v]) => `<span style="color:${(G.res[k] || 0) < v ? '#ff6b6b' : RES[k].color}">${RES[k].name} ${v}</span>`).join('　');
  const wall = d.wall;
  bar.innerHTML = `<button class="rb" id="bx">${icon('x')}</button><div class="bi"><div class="bn">${d.name}${wall && B.placed ? `<span class="small muted">　已放置 ${B.placed}</span>` : ''}</div><div class="bw">${cost}</div><div class="bw ${why ? 'bad' : ''}">${why || (wall ? '點地圖直接放置，可以連續點' : '點地圖移動位置，按 ✓ 確認')}</div></div><button class="rb ${!why || wall ? 'ok' : ''}" id="bok">${icon('check')}</button>`;
  el('bx').onclick = () => { SFX.close(); UI.endBuild(); };
  el('bok').onclick = () => {
    if (wall) { SFX.click(); UI.endBuild(); return; }
    const r = orderBuild(B.type, B.x, B.y);
    if (typeof r === 'string') { UI.toast(r, 'bad'); SFX.alert(); }
    else { SFX.done(); UI.toast(`${d.name}的工地已經畫好，等人來施工。`, 'good'); UI.endBuild(); }
  };
};
UI.placeTap = function (sx, sy) {
  const B = UI.build;
  const d = BUILD[B.type];
  const [wx, wy] = s2w(sx, sy);
  const nx = clamp(Math.floor(wx - (d.w - 1) / 2), 0, N - d.w), ny = clamp(Math.floor(wy - (d.h - 1) / 2), 0, N - d.h);
  B.x = nx; B.y = ny;
  if (d.wall) {
    const r = orderBuild(B.type, nx, ny);
    if (typeof r !== 'string') { B.placed++; SFX.tap(); }
    else if (r !== '和其他建築重疊') UI.toast(r, 'bad');
  } else SFX.click();
  UI.renderBuildBar();
};
UI.endBuild = function () {
  UI.build = null;
  el('buildbar').classList.add('hidden');
  el('dock').classList.remove('hidden');
};

/* ---------- 指令模式（艦長） ---------- */
UI.startMode = function (m) {
  UI.mode = m;
  UI.closeSheet();
  const mb = el('modebar');
  mb.classList.remove('hidden');
  mb.innerHTML = `<span>${m === 'talk' ? '點選要談話的人' : '點選要前往的位置'}</span><button class="btn" id="mbx">取消</button>`;
  el('mbx').onclick = () => UI.endMode();
};
UI.endMode = function () { UI.mode = null; el('modebar').classList.add('hidden'); };
UI.modeTap = function (hit) {
  const L = leader();
  if (UI.mode === 'talk') {
    if (hit && hit.kind === 'c' && !hit.o.leader) { cmd(L, { kind: 'talk', pid: hit.o.id }); UI.toast(`艦長正走向 ${hit.o.name}。`); UI.endMode(); }
    else UI.toast('請點一位殖民者。');
  } else if (UI.mode === 'move') {
    const t = hit && hit.kind === 'tile' ? [hit.x, hit.y] : hit && hit.o && hit.o.x != null ? [Math.floor(hit.o.x), Math.floor(hit.o.y)] : null;
    if (t && passable(t[0], t[1])) { cmd(L, { kind: 'move', x: t[0], y: t[1] }); UI.endMode(); fxBurst(t[0] + .5, t[1] + .5, '#7fe3ff', 6, 0.5); }
    else UI.toast('那裡走不過去。');
  }
};

/* ---------- 確認框 ---------- */
UI.confirm = function (text, yes) {
  UI.queue({ type: 'custom', render(mc, done) {
    const card = h('div', { class: 'evt panel br' });
    card.append(h('div', { class: 'et', style: { fontSize: '18px', marginTop: '18px' } }, text));
    const ch = h('div', { class: 'ch' });
    ch.append(h('button', { class: 'choice', onclick: e => { e.stopPropagation(); SFX.click(); done(); yes(); } }, '確定'), h('button', { class: 'choice', onclick: e => { e.stopPropagation(); SFX.close(); done(); } }, '取消'));
    card.append(ch); mc.append(card);
  } });
};

/* ---------- 彈出佇列 ---------- */
UI.busy = () => !!UI.modal || UI.q.length > 0;
UI.queue = function (item) { UI.q.push(item); UI.next(); };
UI.queueScene = function (lines, after) { UI.queue({ type: 'scene', lines, after }); };
UI.queueEvent = function (ev) { UI.queue({ type: 'event', ev, after: ev.after }); };
UI.queueWake = function (c, p) { UI.queue({ type: 'wake', c, p, after: () => { const a = G._afterWake, b2 = G._afterWake2; G._afterWake = null; G._afterWake2 = null; if (b2) b2(); if (a) a(); } }); };
UI.actEnd = function (sum) { UI.queue({ type: 'act', sum }); };
UI.next = function () {
  if (UI.modal || !UI.q.length || UI.titleOn) return;
  const it = UI.q.shift();
  UI.modal = it;
  if (G && G.speed) { UI.prevSpeed = G.speed; }
  if (G) G.paused = true;
  const m = el('modal'); const mc = m.querySelector('.mc');
  mc.replaceChildren();
  m.classList.add('on'); document.body.classList.add('modal-on');
  const done = () => {
    m.classList.remove('on'); mc.replaceChildren(); document.body.classList.remove('modal-on');
    UI.modal = null;
    if (G) G.paused = false;
    if (it.after) try { it.after(); } catch (e) { console.error(e); }
    setTimeout(UI.next, 60);
  };
  it.done = done;
  if (it.type === 'scene') runScene(it, mc, done);
  else if (it.type === 'event') runEvent(it, mc, done);
  else if (it.type === 'wake') runWake(it, mc, done);
  else if (it.type === 'act') runAct(it, mc, done);
  else if (it.type === 'custom') it.render(mc, done);
};
function runScene(it, mc, done) {
  let i = -1, typing = null;
  const skip = h('button', { class: 'skip low', onclick: e => { e.stopPropagation(); clearInterval(typing); SFX.close(); done(); } }, '略過 »');
  const show = () => {
    i++;
    clearInterval(typing);
    if (i >= it.lines.length) { done(); return; }
    const L = it.lines[i];
    mc.replaceChildren(skip);
    if (L.n) {
      const n = h('div', { class: 'narr' }, L.n);
      mc.append(n);
      typing = null;
      return;
    }
    const sp = L.s === 'teamxm' ? (CA('xiaoman') || leader()) : speakerOf(L.s);
    const box = h('div', { class: 'dlg panel br' });
    const dp = h('div', { class: 'dp' });
    if (sp.ai) dp.append(aiAvatar(96, 116)); else dp.append(UI.por(sp));
    const body = h('div', { style: { flex: 1, minWidth: 0 } });
    const nm = h('div', { class: 'dn' }, sp.ai ? '伴星' : sp.name);
    if (sp.ai) nm.append(h('small', null, 'COMPANION · 艦載 AI')); else if (sp.leader) nm.append(h('small', null, '艦長')); else nm.append(h('small', null, sp.role || ''));
    const tx = h('div', { class: 'dt' });
    if (sp.ai) tx.style.color = '#c9f6ff';
    body.append(nm, tx);
    box.append(dp, body, h('div', { class: 'nx' }, '▼'));
    mc.append(box);
    const full = L.t; let k = 0;
    typing = setInterval(() => { k += 1; tx.textContent = full.slice(0, k); if (k % 2 === 0) SFX.type(); if (k >= full.length) { clearInterval(typing); typing = null; } }, 26);
    it.finish = () => { clearInterval(typing); typing = null; tx.textContent = full; };
  };
  UI.modal.onTap = () => { if (typing) { it.finish(); } else show(); };
  show();
}
function runEvent(it, mc, done) {
  const ev = it.ev;
  const card = h('div', { class: 'evt panel br' });
  const art = h('div', { class: 'ea', html: icon(ART_ICON[ev.art] || 'warn') });
  card.append(art, h('div', { class: 'et' }, ev.title));
  const tx = h('div', { class: 'ex' });
  for (const p of ev.text.split('\n\n')) tx.append(h('p', null, p));
  card.append(tx);
  const ch = h('div', { class: 'ch' });
  for (const c of ev.choices) {
    const r = c.req ? c.req(G) : true;
    const b = h('button', { class: 'choice', onclick: e => { e.stopPropagation(); SFX.click(); try { c.fx(G); } catch (err) { console.error(err); } done(); } });
    b.append(c.t);
    if (c.sub) b.append(h('small', null, c.sub));
    if (r !== true) { b.disabled = true; b.append(h('small', { class: 'why' }, '✕ ' + r)); }
    ch.append(b);
  }
  card.append(ch);
  mc.append(card);
  SFX.open();
}
function runWake(it, mc, done) {
  const c = it.c, p = it.p;
  SFX.wake();
  const w = h('div', { class: 'wake' });
  const frost = h('canvas', { id: 'frost' });
  w.append(frost);
  const lab = h('div', { class: 'wl' }, `POD ${p.label} · 解凍中`);
  const bar = h('div', { class: 'wbar' }, h('i'));
  w.append(lab, bar);
  const card = h('div', { class: 'wc panel br' });
  const top = h('div', { class: 'wtop' });
  const pc = portraitCanvas(c, 120, 144); pc.style.flex = 'none';
  const nm = h('div', { style: { minWidth: 0 } }, h('div', { class: 'lbl' }, 'CREW DOSSIER'), h('div', { class: 'wn' }, c.name), h('div', { class: 'wr' }, `${c.role}｜${c.age} 歲`));
  const tg = h('div', { style: { marginTop: '6px' } });
  for (const t of c.traits) tg.append(h('span', { class: 'tag ' + (TRAITS[t] && TRAITS[t].pos === true ? 'pos' : TRAITS[t] && TRAITS[t].pos === false ? 'neg' : '') }, t));
  nm.append(tg);
  top.append(pc, nm);
  card.append(top);
  const sk = h('div', { class: 'skills' });
  const sorted = SKILL_KEYS.slice().sort((a, b) => c.sk[b] - c.sk[a]).slice(0, 4);
  for (const k of sorted) { const r = h('div', { class: 'sk' + (k === sorted[0] ? ' top' : '') }); const pips = h('div', { class: 'pips' }); for (let i = 1; i <= 10; i++) pips.append(h('i', { class: i <= c.sk[k] ? 'f' : '' })); r.append(h('span', null, SKILLS[k]), pips, h('span', { class: 'num' }, c.sk[k])); sk.append(r); }
  card.append(sk);
  card.append(h('div', { class: 'wq' }, c.first || '……'));
  card.append(h('div', { class: 'small muted', style: { lineHeight: 1.6 } }, c.bio));
  const ok = h('button', { class: 'btn pri', style: { marginTop: '4px' }, onclick: e => { e.stopPropagation(); SFX.click(); stopF = true; done(); centerOn(c.x, c.y); } }, '歡迎回來');
  card.append(ok);
  w.append(card);
  mc.append(w);
  // 冰霧粒子
  let stopF = false;
  const fc = frost.getContext('2d');
  const fr = () => { frost.width = innerWidth; frost.height = innerHeight; };
  fr();
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 60, y: innerHeight / 2, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 4 - 1, l: 1 + Math.random(), s: 8 + Math.random() * 30 }));
  const step = () => {
    if (stopF || !frost.isConnected) return;
    fc.clearRect(0, 0, frost.width, frost.height);
    fc.globalCompositeOperation = 'lighter'; for (const q of ps) { q.x += q.vx; q.y += q.vy; q.vx *= 0.985; q.vy *= 0.985; q.l -= 0.007; q.s += 0.35; if (q.l > 0) { const gr = fc.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.s); gr.addColorStop(0, `rgba(170,235,255,${q.l * 0.07})`); gr.addColorStop(1, 'rgba(170,235,255,0)'); fc.fillStyle = gr; fc.beginPath(); fc.arc(q.x, q.y, q.s, 0, TAU); fc.fill(); } }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  requestAnimationFrame(() => { bar.querySelector('i').style.width = '100%'; });
  setTimeout(() => { lab.textContent = `POD ${p.label} · 生命徵象穩定`; SFX.reveal(); card.classList.add('on'); }, 1500);
  UI.modal.onTap = () => {};
}
function runAct(it, mc, done) {
  const s = it.sum;
  const a = h('div', { class: 'act' });
  a.append(h('div', { class: 'a1' }, 'ACT I COMPLETE'), h('div', { class: 'a2' }, '第一幕　墜落'));
  const st = h('div', { class: 'stats' });
  for (const [v, n] of [[s.days, '存活天數'], [s.awake, '殖民地人數'], [s.lost, '失去的人'], [s.built, '建造'], [s.killed, '擊退的生物'], [s.trust, '平均信任']]) st.append(h('div', { class: 'st' }, h('b', null, v), h('span', null, n)));
  a.append(st);
  if (s.friends) a.append(h('div', { class: 'nx2' }, `這段日子裡最要好的兩個人：${s.friends.join(' 與 ')}`));
  a.append(h('div', { class: 'nx2' }, (s.truth === 'open' ? '你把真相告訴了所有人。' : '你把黑盒子鎖了起來。') + '\n\n「它」在呼喚。而你，曾經答應過它。\n\n第二幕「呼喚」製作中。\n殖民地會繼續運作——潮夜還會再來，冬眠艙裡還有人在等你。'));
  a.querySelector('.nx2:last-child').style.whiteSpace = 'pre-line';
  a.append(h('button', { class: 'btn pri', onclick: e => { e.stopPropagation(); done(); } }, '繼續經營殖民地'));
  mc.append(a);
}

/* ---------- 標題與序章 ---------- */
UI.renderTitle = function (save) {
  const t = el('title');
  t.innerHTML = '';
  const logo = h('div', { class: 'logo' }, h('div', { class: 'zh' }, '墜星'), h('div', { class: 'en' }, 'LANDFALL'), h('div', { class: 'tag2' }, '長庚號殖民地　第一幕｜墜落'));
  const tb = h('div', { class: 'tb' });
  if (save) tb.append(h('button', { class: 'btn pri', onclick: () => { SFX.init(); SFX.click(); startFromSave(save); } }, `繼續　第 ${save.day} 日｜${save.colonists.filter(c => !c.dead).length} 人`));
  tb.append(h('button', { class: 'btn' + (save ? '' : ' pri'), onclick: () => { SFX.init(); SFX.click(); if (save) UI.confirm('開始新的殖民地？目前的進度會被覆蓋。', () => { clearLocal(); startNew(); }); else startNew(); } }, '新的殖民地'));
  tb.append(h('div', { class: 'ver' }, 'ZHUIXING · BUILD ' + BUILD_ID));
  t.append(logo, tb);
};
function playIntro(after) {
  const box = el('intro');
  box.classList.remove('hidden');
  box.innerHTML = '';
  const lines = [['長庚號殖民船　航行第四十一年', ''], ['船上一百一十三人，全在沉睡。', ''], ['再過九天，他們就會在新禾星醒來。', ''], ['——但長庚號，沒有抵達新禾。', 'red']];
  const sk = h('button', { class: 'skip', onclick: () => finish() }, '略過 »');
  box.append(sk);
  const ln = h('div', { class: 'il' });
  box.append(ln);
  let i = 0, done_ = false, timer;
  const step = () => {
    if (done_) return;
    if (i >= lines.length) { crash(); return; }
    ln.classList.remove('on');
    setTimeout(() => { if (done_) return; ln.textContent = lines[i][0]; ln.className = 'il ' + lines[i][1]; requestAnimationFrame(() => ln.classList.add('on')); SFX.tap(); i++; timer = setTimeout(step, i === lines.length ? 2400 : 2600); }, 700);
  };
  const crash = () => {
    const f = el('flash');
    SFX.boom();
    f.style.transition = 'none'; f.style.opacity = 1;
    setTimeout(() => { box.classList.add('hidden'); f.style.transition = 'opacity 1.6s'; f.style.opacity = 0; finish(); }, 160);
  };
  const finish = () => { if (done_) return; done_ = true; clearTimeout(timer); box.classList.add('hidden'); after(); };
  step();
}
