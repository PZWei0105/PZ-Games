// ============ 介面：HUD、對話、戰鬥指令、戰利品 ============
let UI = null;
const NAMES = { wei: '魏子葳', yuan: '岑鳶', luo: '駱山', scale: '秤婆', zhuo: '卓九斤', luchen: '陸沉', hammer: '老鎚', blind: '盲叔', zhu: '阿朮', ear: '小耳', foreman: '把頭', bruiser: '繩幫的人', rigger: '算盤', vill_a: '集民', vill_b: '集民', vill_c: '老人', keeper: '守錨者', warden: '鏽衛', elder: '陸安', voice: '？？？' };
const SEAL = { c_guard: '架', c_wait: '待', c_potion: '藥', c_fire: '火', c_float: '浮', c_unison: '隕', w_atk: '斬', w_lift: '挑', w_slam: '墜', w_dash: '掠', w_rip: '鋒', w_time: '時', w_nova: '引', w_ult: '天', y_atk: '弩', y_mark: '標', y_hook: '鉤', y_hoist: '提', y_yank: '扯', y_zip: '索', y_volley: '矢', y_ult: '鈞', l_atk: '盾', l_oath: '誓', l_slam: '鎮', l_ram: '撞', l_mend: '裹', l_ward: '護', l_nail: '釘', l_ult: '門' };
const skKind = sk => sk.unison ? 'uni' : sk.item ? 'item' : sk.slam ? 'slam' : sk.lift ? 'lift' : (sk.tg === 'self' || sk.tg === 'ally' || sk.tg === 'allies') ? (sk.stance || sk.id === 'c_wait' ? 'st' : 'sup') : 'atk';
function uiInit() {
  const root = $('#ui');
  root.innerHTML = `<div id="hud" class="hide"><div id="zchip"><div class="zn"></div><div class="zo"></div></div><button id="menubt" class="bt">☰</button><button id="mapbt" class="bt hide">層</button><div id="pbar"></div><div id="xpl"><i></i></div></div>
<div id="bhud" class="hide"><div id="border"></div><div id="binfo"><div id="reso"></div></div><div id="bside"></div><div id="tut" class="hide"></div><div id="bbot"><div id="btip"></div><div id="bcards"></div><div id="bcmd"></div></div></div>
<div id="scene"></div><div id="dlg" class="hide"></div><div id="panel" class="hide"></div><div id="modal" class="hide"></div><div id="toast"></div><div id="fade"></div>`;
  UI = { hud: $('#hud'), bhud: $('#bhud'), dlg: $('#dlg'), panel: $('#panel'), modal: $('#modal'), toast: $('#toast'), fade: $('#fade'), scene: $('#scene') };
  $('#menubt').onclick = () => { sfx('ui'); openMenu('party'); };
  $('#mapbt').onclick = () => { if (S.cut || S.dialog) return; if (nearFoe(9)) { sfx('deny'); toast('附近有東西。走遠一點再看層圖。'); return; } openLayerMap(); };
}
function toast(s) { const d = el('div', '', s); UI.toast.appendChild(d); setTimeout(() => d.remove(), 3300); }
function toastAff(w, n) { if (!n) return; toast(`${NAMES[w]}${n > 0 ? '記住了這件事。' : '看了你一眼，沒說話。'}`); }
function fadeTo(a) { UI.fade.style.pointerEvents = a ? 'auto' : 'none'; UI.fade.style.opacity = a; return new Promise(r => setTimeout(r, Dlg.auto ? 0 : 380)); }
function zoneTitle(Zd) { const o = $('#ztitle'); if (o) o.remove(); const d = el('div', '', `<b>${Zd.n}</b><span>${Zd.sub}</span><i></i>`); d.id = 'ztitle'; $('#ui').appendChild(d); setTimeout(() => d.remove(), 3500); sfx('zone'); }
function chipCanvas(src, size) { const c = mkCanvas(size * 2, size * 2), g = c.getContext('2d'); g.drawImage(src, 0, 0, size * 2, size * 2); return c; }
function copyCanvas(src) { const c = mkCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; }
// ---------- 探索 HUD ----------
function hudMode(m) { UI.hud.classList.toggle('hide', m !== 'explore'); UI.bhud.classList.toggle('hide', m !== 'battle'); if (m === 'explore') hudZone(); }
function nearFoe(r) { const L = Z.leader; return Z.groups.some(g => groupActive(g) && g.units.some(u => Math.hypot(u.x - L.x, u.y - L.y) < r)); }
function objective() { const q = typeof currentObjective === 'function' ? currentObjective() : ''; return q || ''; }
function hudZone() {
  if (!Z) return; $('#zchip .zn').textContent = Z.def.n; $('#zchip .zo').innerHTML = objective();
  const pb = $('#pbar'); pb.innerHTML = ''; const ids = activeIds();
  for (const id of ids) { const p = G.party[id], st = heroNow(id), d = el('div', 'pc'), k = clamp(p.hp / st.hpMax, 0, 1); d.style.borderBottomColor = HERO[id].col; d.appendChild(chipCanvas(portrait(id, 'chip'), 34)); d.insertAdjacentHTML('beforeend', `<div class="pi"><div class="pnm"><span>${ids.length > 2 ? HERO[id].n.slice(0, 1) : HERO[id].n}</span><i>${Math.round(p.hp)}</i></div><div class="bar"><i class="${k < .35 ? 'low' : ''}" style="width:${k * 100}%"></i></div></div>`); d.onclick = () => { sfx('ui'); openMenu('party', id); }; pb.appendChild(d); }
  const b = el('button', 'bt', '背包'); b.onclick = () => { sfx('ui'); openMenu('bag'); }; pb.appendChild(b);
  const mb = $('#mapbt'); mb.classList.toggle('hide', !G.disc.camp || !G.disc.slope);
  $('#xpl i').style.width = (G.lv >= LEVEL_CAP ? 100 : G.xp / xpNeed(G.lv) * 100) + '%';
}

// ---------- 對話 ----------
const Dlg = { adv: null, skip: false, auto: null };
function dlgOpen(full) { S.dialog = true; UI.dlg.classList.remove('hide'); if (full !== undefined) UI.dlg.classList.toggle('full', !!full); UI.hud.classList.add('hide'); if (S.mode === 'battle') UI.bhud.classList.add('hide'); }
function dlgClose() { S.dialog = false; Dlg.adv = null; UI.dlg.classList.add('hide'); UI.dlg.classList.remove('full'); UI.dlg.innerHTML = ''; UI.dlg.onclick = null; if (S.mode === 'explore') { UI.hud.classList.remove('hide'); hudZone(); } else if (S.mode === 'battle') UI.bhud.classList.remove('hide'); }
// who＝角色 id（決定名字與彩窗半身像），或 null＝旁白；o：{ name, look, right, full }
function say(who, text, o) {
  o = o || {};
  if (Dlg.skip) return Promise.resolve();
  if (Dlg.auto) { Dlg.auto({ who, text }); return Promise.resolve(); }
  return new Promise(res => {
    dlgOpen(o.full);
    const lk = o.look || who, look = who && LOOKS[lk] && !o.noLook ? lk : null, nm = o.name != null ? o.name : (who ? NAMES[who] || who : '');
    UI.dlg.innerHTML = `<button class="bt skip">略過 ▸▸</button>${look ? `<div class="dp ${o.right ? 'r' : ''}"></div>` : ''}${nm ? `<div class="dn">${nm}</div>` : ''}<div class="db cut"><div class="dt ${who ? '' : 'nar'}"></div><div class="dm">▼</div></div>`;
    if (look) $('#dlg .dp').appendChild(copyCanvas(portrait(look, 'bust')));
    const dt = $('#dlg .dt'); let i = 0, done = false; const sp = 1000 / 52;
    if (who) sfx('talk');
    const tick = () => { if (done) return; i = Math.min(text.length, i + 1); dt.textContent = text.slice(0, i); if (i >= text.length) { done = true; return; } setTimeout(tick, '，。！？…—：'.includes(text[i - 1]) ? sp * 4 : sp); };
    tick();
    const fin = () => { UI.dlg.onclick = null; Dlg.adv = null; res(); };
    const adv = ev => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (!done) { done = true; dt.textContent = text; return; } sfx('uiSoft'); fin(); };
    UI.dlg.onclick = adv; Dlg.adv = adv;
    $('#dlg .skip').onclick = ev => { ev.stopPropagation(); done = true; Dlg.skip = true; fin(); };
  });
}
const nar = (text, o) => say(null, text, o);
// list：[{ t, sub, dis, key }]（空項會略過）；回傳選到的 index
function choose(list, o) {
  o = o || {}; Dlg.skip = false;
  if (Dlg.auto) return Promise.resolve(Dlg.auto({ choose: list, o }));
  return new Promise(res => {
    dlgOpen(o.full); const keep = $('#dlg .db');
    if (o.prompt || !keep) UI.dlg.innerHTML = o.prompt ? `<div class="db cut"><div class="dt nar">${o.prompt}</div></div>` : '';
    else { for (const q of ['.dm', '.skip', '.dp', '.dn']) { const m = $('#dlg ' + q); if (m) m.remove(); } const dt = $('#dlg .dt'); if (dt) dt.style.minHeight = '0'; }
    const c = el('div', 'dc'); list.forEach((it, i) => { if (!it) return; const b = el('button', 'bt' + (it.key ? ' key' : ''), `${it.t}${it.sub ? `<small>${it.sub}</small>` : ''}`); if (it.dis) b.disabled = true; b.onclick = ev => { ev.stopPropagation(); sfx('ui'); res(i); }; c.appendChild(b); });
    const db = $('#dlg .db'); if (db) UI.dlg.insertBefore(c, db); else UI.dlg.appendChild(c);
    UI.dlg.onclick = null; Dlg.adv = null;
  });
}
function endTalk() { Dlg.skip = false; if (S.dialog) dlgClose(); }
// 過場大圖：殘窗（lit＝亮起的瓣）
function sceneRose(lit, cap) { const sc = UI.scene; sc.innerHTML = ''; const c = mkCanvas(640, 640), g = c.getContext('2d'); drawRose(g, 320, 320, 300, lit, 0); sc.appendChild(c); if (cap) sc.appendChild(el('div', 'cap', cap)); sc.classList.add('on'); return new Promise(r => setTimeout(r, Dlg.auto ? 0 : 700)); }
function sceneBlack(cap) { const sc = UI.scene; sc.innerHTML = cap ? `<div class="cap solo">${cap}</div>` : ''; sc.classList.add('on'); return new Promise(r => setTimeout(r, Dlg.auto ? 0 : 700)); }
function sceneOff() { UI.scene.classList.remove('on'); return new Promise(r => setTimeout(() => { if (!UI.scene.classList.contains('on')) UI.scene.innerHTML = ''; r(); }, Dlg.auto ? 0 : 600)); }

// ---------- 戰鬥：順序條、卡片、指令 ----------
let BI = null; // 目前等待輸入的狀態
function uiBattleRefresh() { if (!B || !BV) return; uiBattleOrder(); uiBattleHp(); uiBattleReso(); }
function uiBattleOrder() {
  if (!B) return; const pv = BV && BV.sel && BV.sel.preview, ord = pv ? pv.order : bOrder(9), base = pv ? bOrder(9) : null, box = $('#border'); box.innerHTML = '';
  const n = VW < 380 ? 8 : 9; const seen = {};
  ord.slice(0, n).forEach((o, i) => { const u = U(o.id), d = el('div', 'oc ' + (isHero(u) ? 'h' : 'f') + (i === 0 && !pv ? ' cur' : '') + (o.charge ? ' chg' : '') + (seen[o.id] ? ' rep' : '')); seen[o.id] = 1; d.appendChild(chipCanvas(chipFor(u), 36)); if (base && (!base[i] || base[i].id !== o.id)) d.classList.add('mv'); if (pv && i === 0) d.classList.add('cur'); box.appendChild(d); });
}
function uiBattleReso() { const r = $('#reso'); let h = '共鳴 '; for (let i = 0; i < B.resoMax; i++) h += `<i class="${i < B.reso ? 'on' : ''}"></i>`; r.innerHTML = h; r.classList.toggle('full', B.reso >= B.resoMax); }
function uiBattleHp() {
  if (!B) return; const box = $('#bcards'); box.innerHTML = '';
  for (const u of allHeroes()) { const v = BV.units[u.id], hp = v ? v.hp : u.hp, k = clamp(hp / u.hpMax, 0, 1), d = el('div', 'hc' + (B.cur === u.id ? ' cur' : '') + (u.down ? ' dn' : '')); let m = ''; for (let i = 0; i < 5; i++) m += `<i class="${i < u.mom ? 'on' : ''}"></i>`;
    d.innerHTML = `<div class="hn" style="color:${HERO[u.hero].col}">${u.name}<i>${Math.max(0, Math.round(hp))}/${u.hpMax}</i></div><div class="bar"><i class="${k < .35 ? 'low' : ''}" style="width:${k * 100}%"></i>${u.shield > 0 ? `<b style="width:${clamp(u.shield / u.hpMax, 0, 1) * 100}%"></b>` : ''}</div><div class="mom ${u.mom >= 5 ? 'full' : ''}">${m}</div>`; box.appendChild(d); }
}
function uiBattleTurn(uid) { uiBattleRefresh(); const u = U(uid); if (u && isHero(u)) sfx('turn'); }
function uiCallout(uid, s, release, charge) { const v = BV.units[uid]; if (!v) return; BV.texts.push({ uid, x: v.x, y: v.y, z: v.z + v.lift + unitH(v.look) * v.scale / 34, s: (release ? '發動・' : '') + s, col: charge ? '#ffb0a0' : isHero(U(uid)) ? '#fff6dc' : '#ffd0c8', plate: true, t0: BV.t, dx: 0, life: 1.0, edge: charge || release ? '#ff6a5a' : isHero(U(uid)) ? HERO[U(uid).hero].col : '#8a8ea4' }); }
function cmdButton(u, c, mini) {
  const sk = c.sk, cost = skillCost(u, sk), dl = skillDelay(u, sk), kind = skKind(sk), b = el('button', 'cb k-' + kind + (sk.ult ? ' ult' : '') + (c.no ? ' no' : '') + (mini ? ' mini' : ''));
  let meta = '';
  if (sk.item) meta = ''; else { if (cost) meta += `<span>勢 <b>${cost}</b></span>`; else if (sk.gain) meta += `<span style="color:#8fd0ff">勢 +${sk.gain}</span>`; meta += `<span class="${dl <= 70 ? 'q' : dl >= 120 ? 'z' : ''}">${delayClass(dl)} <b>${dl}</b></span>`; }
  b.innerHTML = `<span class="sl">${SEAL[sk.id] || '技'}</span><div class="cn">${sk.n}</div><div class="cs">${c.no ? c.no : meta}</div>${sk.item ? `<span class="cnt">${B.items[sk.item] || 0}</span>` : ''}`;
  b.onclick = () => pickCmd(c); b.dataset.sk = sk.id; return b;
}
function renderCmds() {
  const u = BI.u, cmds = heroCommands(u), box = $('#bcmd'); box.innerHTML = ''; BI.cmds = cmds;
  const H0 = HERO[u.hero], main = [H0.basic].concat(u.skills), by = id => cmds.find(c => c.sk.id === id);
  for (const id of main) box.appendChild(cmdButton(u, by(id)));
  if (u.ultOk) box.appendChild(cmdButton(u, by(H0.ult)));
  box.appendChild(cmdButton(u, by('c_guard'))); box.appendChild(cmdButton(u, by('c_wait')));
  const fill = () => { while (box.children.length % 4) box.appendChild(el('div')); }; fill();
  for (const id of ['c_potion', 'c_fire', 'c_float']) { const c = by(id); if (id !== 'c_potion' && !(G.cons[id === 'c_fire' ? 'fire' : 'float'] > 0) && !(B.items[c.sk.item] > 0)) continue; box.appendChild(cmdButton(u, c, true)); }
  while (box.children.length % 4 !== 3) box.appendChild(el('div'));
  { const c = by('c_unison'), b = cmdButton(u, c, true); if (c.no) b.querySelector('.cn').textContent = `庭隕 ${B.reso}/${B.resoMax}`; box.appendChild(b); }
  setTip(null);
}
// 收藏庫版本的頁面上有一顆可以拖動的 PZ 圓鈕（hub.js 放的，44px，預設在右邊 42% 高的地方）。
// 它蓋在遊戲上面、會吃掉點擊，所以戰鬥的東西要讓開它。這裡照 hub.js 的算法推回它現在的位置；Claude 版沒有這顆鈕，回傳 null。
function hubRect() {
  if (!window.__pzHub) return null;
  let p = null; try { p = JSON.parse(localStorage.getItem('pzgc.v1.handle')); } catch (e) { /* ignore */ }
  const W = innerWidth, H = innerHeight; let x = p && p.x != null ? clamp(p.x * W, 6, W - 50) : W - 52; const y = p && p.y != null ? clamp(p.y * H, 50, H - 104) : H * .42;
  x = x + 22 < W / 2 ? 6 : W - 50; return { x, y, w: 44, h: 44, right: x > W / 2 };
}
// 「出手」那一列如果被圓鈕壓到，就把那一列縮進來
function dodgeHub() {
  const tip = $('#btip'); if (!tip) return; tip.style.marginRight = ''; tip.style.marginLeft = '';
  const r = hubRect(); if (!r || !tip.firstChild) return; const b = tip.getBoundingClientRect();
  if (r.y > b.bottom || r.y + r.h < b.top) return;
  if (r.right && b.right > r.x - 4) tip.style.marginRight = Math.round(b.right - r.x + 6) + 'px'; else if (!r.right && b.left < r.x + r.w + 4) tip.style.marginLeft = Math.round(r.x + r.w + 6 - b.left) + 'px';
}
function setTip(c, extra) { setTip0(c, extra); dodgeHub(); }
function setTip0(c, extra) {
  const tip = $('#btip'); if (!BI) { tip.innerHTML = ''; return; }
  if (!c) { tip.innerHTML = `<div class="tx cut"><b style="color:${HERO[BI.u.hero].col}">${BI.u.name}</b>　選一招。直接點敵人就是普攻。<br><span style="color:var(--dim)">上面那排是接下來誰先動。</span></div>`; return; }
  const sk = c.sk; tip.innerHTML = `<div class="tx cut"><b>${sk.n}</b>${extra ? `　<em>${extra}</em>` : ''}<br>${sk.d}</div><button class="bt gold go" ${BI.pick == null ? 'disabled' : ''}>出手</button>`;
  $('#btip .go').onclick = () => confirmAct();
}
function pickCmd(c) {
  if (!BI) return; if (c.no) { sfx('deny'); toast(c.sk.n + '：' + c.no); return; }
  if (BI.c === c && BI.pick != null) { confirmAct(); return; }
  sfx('ui'); BI.c = c; BI.pick = null; const u = BI.u, sk = c.sk, T0 = skillTargets(u, sk);
  $$('#bcmd .cb').forEach(b => b.classList.toggle('on', b.dataset.sk === sk.id));
  BV.sel = { sk: sk.id, targets: T0.units.slice(), scene: T0.scene.slice(), pick: null, pickScene: null, preview: null, all: T0.all };
  if (!T0.units.length && !T0.scene.length) { setTip(c, '沒有打得到的目標'); return; }
  if (T0.all) { setPick(T0.units[0]); return; }
  if (T0.units.length === 1 && !T0.scene.length) { setPick(T0.units[0]); return; }
  // 預設挑上次的目標；沒有就不預選
  const last = BI.lastTgt != null && T0.units.includes(BI.lastTgt) && sk.tg !== 'ally' ? BI.lastTgt : null;
  if (last != null) setPick(last); else { setTip(c, sk.tg === 'ally' ? '選一名隊友' : '選一個目標'); uiBattleOrder(); }
}
function setPick(tgt) {
  const c = BI.c, sel = BV.sel; BI.pick = tgt; const isScene = tgt && tgt.scene != null;
  sel.pick = isScene ? null : (sel.all ? null : tgt); sel.pickScene = isScene ? tgt.scene : null; if (sel.all) sel.pick = null;
  sel.preview = bPreview(BI.u.id, c.sk.id, tgt);
  let extra = '';
  if (isScene) { const S0 = SCENE[B.scene[tgt.scene].k]; extra = S0.n + '：' + S0.d; }
  else if (!sel.all && typeof tgt === 'number') { const t = U(tgt); extra = '→ ' + t.name; if (t.side === 'foe') { const F = FOE[t.type]; if (F.traits[0]) extra += `（${F.traits.map(x => x.n).join('、')}）`; } }
  if (sel.preview.notes.length) extra += '　' + [...new Set(sel.preview.notes)].join('・');
  setTip(c, extra); uiBattleOrder(); sfx('uiSoft');
}
function confirmAct() { if (!BI || BI.pick == null) return; const r = BI.res, a = { sk: BI.c.sk.id, tgt: BI.pick }; if (typeof a.tgt === 'number') BI_last[BI.u.id] = a.tgt; BI = null; BV.sel = null; $('#bcmd').innerHTML = ''; $('#btip').innerHTML = ''; sfx('confirm'); r(a); }
const BI_last = {};
function battleTap(sx, sy) { // 戰鬥中點畫面
  if (!BI) { return; }
  const hit = bvPick(sx, sy); if (!hit) return;
  const u = BI.u;
  if (hit.scene != null) { if (BV.sel && BV.sel.scene.includes(hit.scene)) { if (BI.pick && BI.pick.scene === hit.scene) confirmAct(); else setPick({ scene: hit.scene }); } else { const S0 = SCENE[B.scene[hit.scene].k]; const c = BI.cmds.find(x => x.sk.id === HERO[u.hero].basic); const T0 = skillTargets(u, c.sk); if (T0.scene.includes(hit.scene)) { pickCmd(c); setPick({ scene: hit.scene }); } else toast(S0.n + '：' + (S0.ranged ? '要用遠程招才打得到。' : S0.d)); } return; }
  const tid = hit.unit, t = U(tid);
  if (BV.sel && BV.sel.targets.includes(tid)) { if (BV.sel.all) { confirmAct(); return; } if (BI.pick === tid) confirmAct(); else setPick(tid); return; }
  if (t.side === 'foe' && !t.dead) { // 沒選招就點敵人＝普攻
    const c = BI.cmds.find(x => x.sk.id === HERO[u.hero].basic), T0 = skillTargets(u, c.sk);
    if (T0.units.includes(tid)) { if (!BV.sel || BV.sel.sk !== c.sk.id) pickCmd(c); setPick(tid); }
    else { sfx('deny'); toast(BV.sel && SK[BV.sel.sk].reach === 'melee' || !BV.sel ? '近身招打不到後排。先清前排，或讓岑鳶把牠鉤過來。' : '這一招打不到牠。'); }
  }
}
function heroInput(u) { return new Promise(res => { BI = { u, res, c: null, pick: null, lastTgt: BI_last[u.id] }; renderCmds(); uiBattleRefresh(); }); }
function uiBattleSide() {
  const box = $('#bside'); box.innerHTML = '';
  const mk = (t, fn) => { const b = el('button', 'bt sm', t); b.onclick = fn; box.appendChild(b); return b; };
  mk('敵情', () => { sfx('ui'); openIntel(); });
  mk('速 ' + (S.set.speed >= 2 ? '×2' : S.set.speed > 1 ? '×1.5' : '×1'), () => { S.set.speed = S.set.speed >= 2 ? 1 : S.set.speed > 1 ? 2.2 : 1.5; saveSettings(); sfx('ui'); uiBattleSide(); });
  if (!B.noFlee) mk('撤退', () => { if (!BI) { toast('輪到自己人的時候才能撤。'); return; } confirmBox('撤退？', '退出這場戰鬥。敵人會回復原狀。', '撤退').then(ok => { if (ok && BI) { const r = BI.res; BI = null; BV.sel = null; r('flee'); } }); });
  const r = box.getBoundingClientRect(); S.sideRect = r.width ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; // 畫戰場上的牌子時要讓開這一排
}
// 敵情：場上每個東西的特性與下一步
function openIntel() {
  let h = '<div class="mb cut"><h3>敵情</h3><div class="seam"></div><div class="ms">';
  for (const u of liveFoes()) { const F = FOE[u.type], it = u.object ? null : intentInfo(u), v = BV.units[u.id]; const st = ST_SHOW.filter(a => u.s[a[0]]).map(a => `<span class="tag" style="color:${STATUS[a[0]].c}">${STATUS[a[0]].n}${typeof u.s[a[0]] === 'number' && u.s[a[0]] > 1 ? ' ' + u.s[a[0]] : ''}</span>`).join('');
    h += `<div class="intel"><div class="iname"><span>${F.n}　<small style="font-weight:400;color:var(--dim);font-size:11px">${u.row === 'front' ? '前排' : u.row === 'back' ? '後排' : '空中'}・${u.object ? '不會動' : '重量 ' + ['無', '輕', '中', '重', '巨', '不動'][Math.min(5, u.w)]}</small></span><i>${Math.max(0, Math.round(v ? v.hp : u.hp))} / ${u.hpMax}</i></div>${st}`;
    for (const t of F.traits) h += `<p><b>${t.n}</b>　${t.d}</p>`;
    if (it) { const tg = it.tgt.map(id => U(id).name).join('、'); h += `<p class="nx">下一步：<b>${it.charging ? '發動 ' : ''}${it.mv.n}</b>${it.willCharge ? `（要先蓄力，穩固 ${it.pips}）` : it.charging ? `（蓄力中，穩固剩 ${it.pips}）` : ''}${tg ? ' → ' + (it.mv.tgt === 'all' ? '全隊' : tg) : ''}</p>`; }
    if (!u.object && !u.s.aloft && u.s.lift > 0) h += `<p>浮力 ${u.s.lift} / ${u.w}</p>`;
    h += '</div>'; }
  B.scene.forEach(s => { const S0 = SCENE[s.k]; h += `<div class="intel sc"><div class="iname"><span>${S0.n}</span><i>${S0.passive ? '常駐' : s.used ? (s.wake ? '休眠中' : '用掉了') : '可用'}</i></div><p>${S0.d}</p></div>`; });
  if (B.shelter > 0) h += `<div class="intel sc"><div class="iname"><span>錨蔭</span><i>${B.shelter}</i></div><p>砸在我方場上的錨。牠放「墜庭」的時候，每一點錨蔭能完全護住一個人（生命最低的優先）。</p></div>`;
  if (B.resoFam) h += `<div class="intel h"><div class="iname"><span>${RESO_FAM[B.resoFam].n}</span><i>共鳴系</i></div><p>${RESO_FAM[B.resoFam].d}</p></div>`;
  for (const u of allHeroes()) { const st = ST_SHOW.filter(a => u.s[a[0]]); if (!st.length) continue; h += `<div class="intel h"><div class="iname"><span>${u.name}</span></div>` + st.map(a => `<p><b style="color:${STATUS[a[0]].c}">${STATUS[a[0]].n}</b>　${STATUS[a[0]].d}</p>`).join('') + '</div>'; }
  h += '</div><div class="mf"><button class="bt gold">回去</button></div></div>';
  UI.modal.classList.remove('hide'); UI.modal.innerHTML = h; $('#modal .mf .bt').onclick = () => { sfx('ui'); UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; };
}
// 一整場戰鬥
async function battlePlay(g, F, opts) {
  const E = ENC[g.id];
  bvSetup(g, F); S.mode = 'battle'; hudMode('battle'); $('#bcmd').innerHTML = ''; $('#btip').innerHTML = ''; $('#tut').classList.add('hide'); audioBattle(E.boss ? 2 : 1); battleCam(); uiBattleRefresh(); uiBattleSide();
  const moves = []; for (const u of allHeroes()) { const v = BV.units[u.id]; v.a = 'walk'; v.loop = true; moves.push(tween(v, v.hx, v.hy, 480, ease).then(() => idle(v))); }
  for (const k in BV.units) { const v = BV.units[k]; if (v.ex != null && Math.hypot(v.x - v.hx, v.y - v.hy) > .04) { v.a = 'walk'; v.loop = true; moves.push(tween(v, v.hx, v.hy, 420, ease).then(() => idle(v))); } }
  fxBanner(opts.ambush > 0 ? '奇襲' : opts.ambush < 0 ? '遭襲' : E.boss ? '守錨者「不移」' : '接敵', opts.ambush > 0 ? '牠們還沒看見你。全隊搶先一步' : '', opts.ambush < 0 ? '#ff6a5a' : '#ffcf5a'); sfx('engage');
  await Promise.all(moves); await sleep(420);
  let guard = 0;
  while (!B.over && guard++ < 900) {
    const r = bNext(); await play(r.ev);
    if (B.over) break; if (!r.u) continue;
    if (isHero(r.u)) {
      await tutBattle(E, r.u);
      const a = await heroInput(r.u); if (a === 'flee') { B.over = 'flee'; break; }
      await play(bAct(r.u.id, a.sk, a.tgt));
    } else { await sleep(260); await play(foeAct(r.u)); }
    if (B.parley && !B.parleyDone) { B.parley = false; B.parleyDone = true; uiBattleRefresh(); const res = await runScript('e_parley'); if (res === 'end') { B.over = 'win'; break; } uiBattleRefresh(); }
    battleCam();
  }
  BI = null; BV.sel = null; $('#bcmd').innerHTML = ''; $('#btip').innerHTML = ''; $('#tut').classList.add('hide');
  if (B.over === 'win') { fxBanner('勝', '', '#ffcf5a'); sfx('win'); for (const u of liveHeroes()) anim(BV.units[u.id], 'cast', 700); await sleep(1000); }
  else if (B.over === 'lose') { fxBanner('全員倒地', '', '#ff6a5a'); sfx('lose'); await sleep(1100); }
  return B.over;
}
// 新手提示（只在序章的兩場出現）
async function tutBattle(E, u) {
  if (!E.tut || !S.set.hints || Dlg.auto) return; const k = E.tut + ':' + (G.tut[E.tut] || 0); G.tut[E.tut] = (G.tut[E.tut] || 0) + 1;
  const T0 = {
    'first:0': '<b>點那隻犬</b>就是普攻，再點一次（或按「出手」）確認。<br>上面那排是接下來的行動順序：誰先動，一眼看得到。',
    'first:1': '試試<b>挑月</b>：把牠打上半空。<br>浮空的東西，用<b>墜星斬</b>砸下來會重得多。',
    'first:2': '牠頭上寫著牠下一步要做什麼、要打誰、大概多痛。',
    'second:0': '岑鳶加入了。她的箭打得到後排，<b>標定</b>能讓下一擊必定暴擊。',
    'second:1': '隊友<b>緊接著</b>隊友行動（中間沒有敵人）就是<b>連攜</b>：更痛，還會累積<b>共鳴</b>。<br>選招的時候看上面那排：自己會落在哪，先看再決定。',
    'second:2': '一個人把牠<b>打浮</b>，下一個人緊接著<b>砸</b>＝完美連攜。<br><b>待機</b>可以讓出順位，等隊友先動。',
  }[k];
  if (!T0) return; const t = $('#tut'); t.innerHTML = T0 + '<small>點一下知道了</small>'; t.classList.remove('hide'); await new Promise(r => { t.onclick = () => { t.classList.add('hide'); r(); }; });
}
function confirmBox(title, text, yes, no) { if (Dlg.auto) return Promise.resolve(true); return new Promise(res => { UI.modal.classList.remove('hide'); UI.modal.innerHTML = `<div class="mb cut"><h3>${title}</h3><div class="seam"></div><div class="ms" style="text-align:center;font-size:14px;line-height:1.7;padding:6px 0">${text}</div><div class="mf"><button class="bt" data-k="0">${no || '算了'}</button><button class="bt gold" data-k="1">${yes || '好'}</button></div></div>`; $$('#modal .bt').forEach(b => b.onclick = () => { sfx('ui'); UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; res(b.dataset.k === '1'); }); }); }
function defeatMenu(E) { if (Dlg.auto) return Promise.resolve(Dlg.auto({ defeat: E }) || 'retry'); return new Promise(res => { UI.modal.classList.remove('hide'); UI.modal.innerHTML = `<div class="mb cut"><h3>全員倒地</h3><div class="seam"></div><div class="ms" style="text-align:center;font-size:14px;line-height:1.8;padding:8px 0;font-family:var(--fs);color:#c8c2b4">淵底很暗。有人把你們拖了出來。</div><div class="mf"><button class="bt" data-k="camp">回覆舟營</button><button class="bt gold" data-k="retry">重整再戰</button></div></div>`; $$('#modal .bt').forEach(b => b.onclick = () => { sfx('ui'); UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; res(b.dataset.k); }); void E; }); }

// ---------- 物品卡 ----------
const SLOT_SEAL = { weapon: '兵', armor: '甲', trinket: '飾', relic: '遺' };
function itemHtml(it, o) {
  o = o || {}; const b = BASE[it.base], R0 = RAR[it.rar], st = itemStats(it), cmp = o.cmp ? itemStats(o.cmp) : null, parts = [];
  const dv = (k, lab, suf) => { if (st[k] == null && !(cmp && cmp[k])) return; const v = st[k] || 0, c = cmp ? v - (cmp[k] || 0) : 0; parts.push(`${lab} ${k === 'spd' && v > 0 ? '+' : ''}${v}${suf || ''}${cmp && c ? `<span class="${c > 0 ? 'up' : 'dn'}"> ${c > 0 ? '▲' : '▼'}${Math.abs(Math.round(c * 10) / 10)}</span>` : ''}`); };
  dv('atk', '攻擊'); dv('hp', '生命'); dv('arm', '護甲'); dv('spd', '速度'); if (st.impact) parts.push('衝擊 +1');
  const who = b.who ? HERO[b.who].n + '專用' : b.heavy ? '重甲' : '';
  let h = `<div class="it ${it.leg ? 'leg' : ''} ${o.tap ? 'tap' : ''}" style="border-left-color:${R0.c}" data-uid="${it.uid}"><div class="ic" style="background:${R0.c}">${SLOT_SEAL[b.slot]}</div><div class="ib"><div class="in" style="color:${R0.c}">${itemName(it)}<small>${R0.n}・${SLOT_N[b.slot]}・${it.il} 階${who ? '・' + who : ''}</small></div>`;
  if (parts.length) h += `<div class="is">${parts.join('　')}</div>`;
  if (it.leg) h += `<div class="rule">${LEG[it.leg].rule}</div>`;
  for (const a of it.affs) { const A = AFF[a.id]; h += `<div class="ia"><i style="color:${FAM[A.fam].c}">${A.fam === 'gen' ? '◆' : FAM[A.fam].n}</i><b style="font-weight:700">${A.n}</b>　${affText(a)}</div>`; }
  if (it.leg && o.lore) h += `<div class="lore">${LEG[it.leg].lore}</div>`;
  if (o.who) h += `<div class="is" style="color:var(--dim)">${o.who}</div>`;
  h += `</div>${it.isNew && !o.noNew ? '<span class="new">新</span>' : ''}</div>`; return h;
}
// ---------- 戰利品 ----------
function showLoot(o) {
  if (Dlg.auto) { for (const id of G.roster) G.party[id].newSkills = []; Dlg.auto({ loot: o }); return Promise.resolve(); }
  return new Promise(res => {
    UI.modal.classList.remove('hide'); const mats = o.mats || {}, ml = [];
    if (o.coin) ml.push(`銖<b>+${o.coin}</b>`); if (mats.scrap) ml.push(`碎料<b>+${mats.scrap}</b>`); if (mats.dust) ml.push(`浮石屑<b>+${mats.dust}</b>`); if (mats.lacquer) ml.push(`金繼漆<b>+${mats.lacquer}</b>`); if (mats.potion) ml.push(`止血膏<b>+${mats.potion}</b>`);
    let h = `<div class="mb cut"><h3>${o.title || '戰利品'}</h3><div class="seam"></div><div class="ms">`;
    if (o.xp) h += `<div class="res" style="justify-content:center;margin-top:4px">經驗<b>+${o.xp}</b></div><div class="xpb"><i style="width:${G.lv >= LEVEL_CAP ? 100 : G.xp / xpNeed(G.lv) * 100}%"></i></div>`;
    if (o.ups && o.ups.length) h += `<div class="lv">升到 ${o.ups[o.ups.length - 1]} 級</div>` + learnedHtml();
    if (ml.length) h += `<div class="res" style="justify-content:center;margin:8px 0">${ml.join('')}</div>`;
    h += `<div id="lootlist"></div></div><div class="mf"><button class="bt gold">收下</button></div></div>`; UI.modal.innerHTML = h;
    if (o.ups && o.ups.length) sfx('levelup');
    const list = $('#lootlist'); let i = 0;
    const next = () => { if (i >= o.items.length) return; const it = o.items[i++], d = el('div', 'flip', itemHtml(it, { lore: true, noNew: true })); list.appendChild(d); sfx(['loot0', 'loot1', 'loot2', 'loot3', 'loot4'][it.rar]); d.scrollIntoView({ block: 'nearest' }); setTimeout(next, it.rar >= 4 ? 900 : 420); };
    if (!o.items.length && !ml.length && !o.xp) list.innerHTML = '<div style="text-align:center;color:var(--dim);padding:10px">空的。</div>';
    setTimeout(next, 350);
    $('#modal .mf .bt').onclick = () => { sfx('ui'); UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; for (const id of G.roster) G.party[id].newSkills = []; if (S.mode === 'explore') hudZone(); res(); };
  });
}
function learnedHtml() { let h = ''; for (const id of activeIds()) for (const s of (G.party[id].newSkills || [])) h += `<div class="sk on"><span class="sl">${SEAL[s]}</span><div><b>${HERO[id].n}學會了「${SK[s].n}」</b><p>${SK[s].d}${G.party[id].skills.includes(s) ? '' : '<br><span style="color:var(--gold)">招式欄滿了：到「隊伍」裡換上去。</span>'}</p></div></div>`; return h; }
function chooseTalent(o) {
  if (Dlg.auto) { G.party[o.id].tal[o.t[1].id] = 1; return Promise.resolve(); }
  return new Promise(res => {
    const id = o.id, t = o.t; UI.modal.classList.remove('hide');
    UI.modal.innerHTML = `<div class="mb cut"><h3>${HERO[id].n}・天賦</h3><div class="seam"></div><div class="ms"><div style="text-align:center;font-size:12.5px;color:var(--dim);margin:6px 0 10px">選一個。選了就定了。</div>${[1, 2].map(k => `<div class="sk tap" data-k="${k}" style="cursor:pointer;padding:12px"><span class="sl" style="background:${HERO[id].col}">${t[k].n[0]}</span><div><b style="font-size:15px">${t[k].n}</b><p style="font-size:13px">${t[k].d}</p></div></div>`).join('')}</div></div>`;
    $$('#modal .sk').forEach(d => d.onclick = () => { sfx('talent'); G.party[id].tal[t[+d.dataset.k].id] = 1; UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; saveGame(); res(); });
  });
}
