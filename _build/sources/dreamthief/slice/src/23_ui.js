'use strict';
/* ====== 試玩關：介面 ====== */
const S = { mode: 'boot', paused: false };
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
function toast(msg, cls = '') { const t = el('div', 'toast ' + cls, esc(msg)); $('#toast').appendChild(t); setTimeout(() => t.remove(), 2800); }

/* ---------- 無線電字幕 ---------- */
const RAD = { q: [], cur: null, t: 0, gap: 0 };
function say(who, text, dur) { RAD.q.push({ who, text, at: performance.now(), dur: dur || clamp(1.8 + text.length * .085, 2.4, 6) }); }
function sayList(list, delay = 0) { if (!list) return; if (delay) setTimeout(() => list.forEach(([w, t]) => say(w, t)), delay * 1000); else list.forEach(([w, t]) => say(w, t)); }
function updateRadio(dt) {
  const box = $('#radio');
  if (RAD.cur) { RAD.t -= dt; if (RAD.t <= 0) { RAD.cur = null; box.classList.remove('show'); RAD.gap = .3; } }
  if (!RAD.cur && RAD.q.length) {
    RAD.gap -= dt; if (RAD.gap > 0) return;
    while (RAD.q.length > 1 && performance.now() - RAD.q[0].at > 9000) RAD.q.shift();
    RAD.cur = RAD.q.shift(); RAD.t = RAD.q.length > 2 ? Math.min(RAD.cur.dur, 2.6) : RAD.cur.dur;
    const w = RAD.cur.who === 'boss' ? { n: W ? W.ch.boss.n : '', c: '#ff6a7a' } : WHO[RAD.cur.who] || WHO.sys;
    box.style.borderLeftColor = w.c;
    box.innerHTML = (w.n ? `<b style="color:${w.c}">${esc(w.n)}</b>` : '') + esc(RAD.cur.text);
    box.classList.add('show');
  }
}
function radioClear() { RAD.q.length = 0; RAD.cur = null; const b = $('#radio'); if (b) b.classList.remove('show'); }

/* ---------- 面板 ---------- */
function sheet(id, title, sub, body, foot, opt = {}) {
  closeSheet(id);
  const s = el('div', 'screen'); s.id = id;
  s.innerHTML = `<div class="scrim"></div><div class="sheet" style="${opt.wide ? 'width:min(96vw,640px)' : ''}"><div class="hd"><h2>${title}</h2><span class="sub">${sub || ''}</span></div>
    <div class="bd">${body}</div>${foot != null ? `<div class="ft">${foot}</div>` : ''}${opt.noX ? '' : '<button class="x" data-x>✕</button>'}</div>`;
  $('#ui').appendChild(s);
  const x = s.querySelector('[data-x]'); if (x) x.onclick = () => { AU.sfx('ui'); closeSheet(id); opt.onClose && opt.onClose(); };
  s.querySelector('.scrim').onclick = () => { if (opt.modal) return; closeSheet(id); opt.onClose && opt.onClose(); };
  AU.sfx('uiOpen');
  return s;
}
function closeSheet(id) { const s = document.getElementById(id); if (s) s.remove(); }
function confirmBox(title, text, yes, no, onYes, danger, onNo) {
  const s = sheet('confirm', title, '', `<div class="note">${text}</div>`, `<button class="btn ghost" data-n>${no}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-y>${yes}</button>`, { modal: true, noX: true });
  s.querySelector('[data-n]').onclick = () => { AU.sfx('ui'); closeSheet('confirm'); onNo && onNo(); };
  s.querySelector('[data-y]').onclick = () => { closeSheet('confirm'); onYes(); };
}
function orbStyle(r) { const c = RAR[r].c; return `background:radial-gradient(circle at 35% 30%,#fff,${mixHex(c, '#ffffff', .35)} 35%,${shade(c, -.35)});box-shadow:0 0 ${8 + r * 5}px ${rgba(c, .7)}`; }
function memRow(it, acts = '', tag = '') {
  return `<div class="itemrow"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n" style="color:${mixHex(RAR[it.rar].c, '#fff', .3)}">${tag}${esc(it.n)}</div>
    <div class="m">${RAR[it.rar].n}・${it.size ? it.size + ' 格・' : ''}<span class="money">${fmt(it.val)}</span></div><div class="fl">${esc(it.f)}</div></div>${acts}</div>`;
}
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const STAGE = ['熟睡', '淺睡', '輾轉', '將醒', '醒了'];
function toolCd(id, lv) { return id === 'mirror' ? 2.8 * (lv >= 4 ? .75 : 1) : id === 'oil' ? 3.6 : id === 'tube' ? 2.4 : id === 'clock' ? 6.5 * (lv >= 3 ? .75 : 1) : 0; }
function cdSweep(e, k, dim) {
  if (!e) return;
  const p = k > 0 ? Math.min(100, Math.ceil(k * 100)) : 0, d = dim ? 1 : 0;
  if (e._p === p && e._d === d) return;
  e._p = p; e._d = d;
  e.style.setProperty('--p', p);
  e.style.setProperty('--cdc', dim ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.35)');
}

/* ====================================================================== */
const UI = {
  chOpen: false, chWait: null, _hud: {}, _tips: {},
  /* ---------- 標題 ---------- */
  title() {
    S.mode = 'title'; S.paused = false;
    $('#hud').classList.add('hidden'); $('#ui').innerHTML = ''; radioClear();
    const s = el('div', 'screen'); s.id = 'title';
    s.innerHTML = `<div class="logo"><div class="cn">竊夢者</div><div class="en">DREAMTHIEF</div><div class="tl">試玩關・老韓的夜班</div>
      <div class="pitch">一層一層往上搜，守住每一扇門，<br>到天台敲響那座鐘。</div></div>
      <div class="menu"><div class="tap">輕觸開始</div></div><div class="ver">試玩版 0.1</div>`;
    $('#ui').appendChild(s);
    const go = () => {
      AU.init(); AU.sfx('uiOpen'); AU.music('title');
      s.querySelector('.menu').innerHTML = `<button class="btn primary" data-go>開始夜班</button><button class="btn ghost" data-how>怎麼玩</button>
        <div class="row2"><button class="btn small ghost" data-mu>音樂：${G.settings.music ? '開' : '關'}</button><button class="btn small ghost" data-sf>音效：${G.settings.sfx ? '開' : '關'}</button></div>`;
      s.querySelector('[data-go]').onclick = () => { AU.sfx('ui'); UI.fadeTo(() => UI.start()); };
      s.querySelector('[data-how]').onclick = () => { AU.sfx('ui'); UI.howto(); };
      s.querySelector('[data-mu]').onclick = e => { G.settings.music = !G.settings.music; AU.applyVol(); e.target.textContent = '音樂：' + (G.settings.music ? '開' : '關'); };
      s.querySelector('[data-sf]').onclick = e => { G.settings.sfx = !G.settings.sfx; AU.applyVol(); e.target.textContent = '音效：' + (G.settings.sfx ? '開' : '關'); };
      s.onpointerdown = null;
    };
    if (AU.ready) go(); else s.onpointerdown = e => { e.preventDefault(); go(); };
  },
  howto() {
    const was = S.paused; S.paused = true;
    const li = (k, t) => `<div class="how"><b>${k}</b><span>${t}</span></div>`;
    const body = `<div class="howlist">
      ${li('移動', '在螢幕左半邊按住拖曳。走到樓梯間，往上或往下推（或按「上樓／下樓」）就會爬樓梯。')}
      ${li('開槍', '醒槍會自己瞄準最近的夢魘開火，彈匣空了會自己換。你只要走位。')}
      ${li('搜索', '站在放大鏡底下不要動，就會一圈一圈搜開。<i style="color:#7fe08a">綠</i>＜<i style="color:#5fb6ff">藍</i>＜<i style="color:#b98aff">紫</i>＜<i style="color:#ffc94a">金</i>＜<i style="color:#ff4d5e">紅</i>，越稀有越久。下一圈是什麼顏色，放大鏡下面的圓點看得到。')}
      ${li('波次', '夢魘從發紅的裂縫一波一波湧出。清完一波，有 10 秒喘息。')}
      ${li('門', '門擋得住夢魘，子彈打得穿門縫。站在門邊會自己修。上鎖的門要夢幣或鑰匙，站在門前就會開。')}
      ${li('靈光', '撿滿靈光、或搜到靈光，就能三選一：夢具（自動施放，最多三件）或強化。')}
      ${li('記憶', '值錢的記憶進背包（10 格）。背包滿了，撿到更值錢的會自己換掉最便宜的。第一段深憶以上的會自己放進保險格，迷失了也帶得走。')}
      ${li('夢中人', '夢裡有被困住的人。站在他們身邊就會救起來，他們會自己走到天台。從鐘那裡撤離，才帶得走他們的記憶。')}
      ${li('清醒度', '時間、開新房間、開鎖、清完一波都會讓夢主越來越醒，夢魘也越來越兇。滿 100，心魔會出現在天台、把鐘封住。')}
      ${li('撤離', '天台的鐘敲響後，待在天台撐 30 秒就醒來。湊齊 6 個鐘擺零件，也可以隨時按「醒來」——但夢中人帶不走。')}
      ${li('鍵盤', 'A／D 或 ←／→ 移動，W／S 或 ↑／↓ 爬樓梯，空白鍵閃身，Q 吃糖，E 敲鐘或醒來，B 背包，Esc 暫停。')}
    </div>`;
    sheet('howS', '怎麼玩', '老韓的夜班', body, `<button class="btn primary" data-ok style="flex:1">知道了</button>`, { onClose: () => S.paused = was });
    $('#howS [data-ok]').onclick = () => { closeSheet('howS'); S.paused = was; };
  },
  fadeTo(fn) {
    let f = $('#fade'); if (!f) { f = el('div'); f.id = 'fade'; f.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s;pointer-events:none;z-index:40'; $('#app').appendChild(f); }
    f.style.pointerEvents = 'auto'; f.style.opacity = 1;
    setTimeout(() => { try { fn(); } catch (e) { console.error(e); } setTimeout(() => { f.style.opacity = 0; f.style.pointerEvents = 'none'; }, 80); }, 380);
  },

  /* ---------- 開局 ---------- */
  start() {
    $('#ui').innerHTML = ''; radioClear();
    svNewRun();
    S.mode = 'play'; S.paused = false; UI.chOpen = false; UI.chWait = null; UI._tips = {};
    R.snap = true; R.rc.clear();
    $('#hud').classList.remove('hidden');
    UI.hudInit();
    AU.music('dream', 0, 0);
    sayList(SV_RADIO.start, .6);
    setTimeout(() => { if (S.mode === 'play' && W && !W.out) UI.hint(IS_TOUCH ? '左半邊按住拖曳來移動・槍會自己開火' : 'A／D 移動・W／S 爬樓梯・空白鍵閃身・槍會自己開火', 5); }, 900);
  },
  hudInit() {
    UI._hud = {};
    if (!IS_TOUCH) $('#bWake').textContent = '醒來 E';
    if (!IS_TOUCH) for (const [id, k] of [['#bDash', '空白鍵'], ['#bCandy', 'Q'], ['#bUp', 'W'], ['#bDown', 'S'], ['#bAct', 'E']]) { const b = $(id); if (!b.querySelector('.kb')) b.appendChild(el('span', 'kb', k)); }
    const bb = $('#bossbar'); if (bb) bb.remove();
    $('#hold').classList.add('hidden');
  },
  tip(k, text, dur) { if (UI._tips[k]) return; UI._tips[k] = 1; UI.hint(text, dur || 4); },
  hud(dt) {
    if (!W) return;
    const p = W.players[0], h = UI._hud;
    const set = (k, v, fn) => { if (h[k] !== v) { h[k] = v; fn(v); } };
    // 生命
    set('hp', Math.ceil(p.hp) + '/' + p.hpMax, () => { $('#hp .fill').style.width = (p.hp / p.hpMax * 100) + '%'; $('#hp .num').textContent = Math.ceil(p.hp) + ' / ' + p.hpMax; $('#hp').classList.toggle('low', p.hp < p.hpMax * .3); });
    h.lag = lerp(h.lag ?? 1, p.hp / p.hpMax, Math.min(1, dt * 2.5)); const lg = Math.round(h.lag * 200) / 2; if (h.lagW !== lg) { h.lagW = lg; $('#hp .lag').style.width = lg + '%'; }
    // 清醒度與波次
    const wv = W.wave, wk = Math.floor(W.wake);
    let st;
    if (W.extract) st = '撐住！';
    else if (W.boss) st = '心魔在天台';
    else if (wv.state === 'wait') st = wv.n === 0 ? `夢魘 ${Math.ceil(wv.t)} 秒後湧出` : `喘息 ${Math.ceil(wv.t)} 秒`;
    else st = `第 ${wv.n} 波・還有 ${wv.queue.length + svWaveAlive(wv.n)} 隻`;
    set('wake', wk + '|' + st, () => {
      $('#wake .fill').style.width = W.wake + '%';
      $('#wake .lbl').innerHTML = `<span class="st">${STAGE[W.lvl]} ${wk}</span><span class="wv">${st}</span>`;
      const o = clamp(W.wake / 100, 0, 1); $('#eyeLid').setAttribute('d', `M1 10 Q15 ${10 - o * 9} 29 10 Q15 ${10 + o * 9} 1 10Z`); $('#eyePup').setAttribute('r', (o * 4.2).toFixed(2));
      $('#wake').classList.toggle('hot', W.lvl >= 3 || !!W.boss);
    });
    // 資源
    const resc = W.survivors.filter(v => v.state !== 'wait').length;
    set('res', W.coins + '|' + W.keys + '|' + W.parts + '|' + resc, () => {
      $('#res').innerHTML = `<span class="money">${W.coins}</span>${W.keys ? `<span class="rk"><i>鑰</i>${W.keys}</span>` : ''}<span class="rp${W.parts >= 6 ? ' ok' : ''}"><i>擺</i>${Math.min(6, W.parts)}/6</span><span class="rv"><i>人</i>${resc}/3</span>`;
    });
    // 背包
    const used = bagUsed();
    set('bag', used + '|' + W.cap + '|' + W.bag.map(i => i.rar + ':' + i.size).join(',') + '|' + (W.pocket ? W.pocket.rar : '-'), () => {
      $('#bag .c').textContent = used + '/' + W.cap; $('#bag').classList.toggle('full', used >= W.cap);
      let pips = W.pocket ? `<i class="pk" style="background:${RAR[W.pocket.rar].c}"></i><b></b>` : `<i class="pk"></i><b></b>`;
      for (const it of W.bag) for (let k = 0; k < it.size; k++) pips += `<i style="background:${RAR[it.rar].c}"></i>`;
      for (let k = used; k < W.cap; k++) pips += '<i></i>';
      $('#bag .pips').innerHTML = pips;
    });
    // 夢具
    const tk = Object.values(W.tools).map(t => t.id + t.lv).join(',');
    set('tools', tk, () => {
      const ts = Object.values(W.tools);
      let s = ''; for (const t of ts) { const d = SV_TOOLS[t.id]; s += `<div class="tl" data-t="${t.id}" style="--tc:${d.c}"><i class="cd"></i><b>${d.ic}</b><span class="lv">${'●'.repeat(t.lv)}${'○'.repeat(5 - t.lv)}</span></div>`; }
      for (let i = ts.length; i < 3; i++) s += `<div class="tl empty"></div>`;
      $('#tools').innerHTML = s;
    });
    for (const t of Object.values(W.tools)) { const m = toolCd(t.id, t.lv); if (m) cdSweep($(`#tools [data-t="${t.id}"] .cd`), t.cd > 0 ? t.cd / m : 0, false); }
    // 靈光
    set('xp', W.xpLvl + '|' + W.xp, () => { $('#lvl').textContent = '靈光 Lv ' + W.xpLvl; $('#xp .fill').style.width = Math.min(100, W.xp / svXpNeed(W.xpLvl) * 100) + '%'; });
    // 按鈕
    cdSweep($('#bDash .cd'), p.dashCd > 0 ? p.dashCd / W.st.dashCd : 0, false);
    set('candy', W.candies, () => { $('#bCandy .s').textContent = W.candies; $('#bCandy').classList.toggle('off', !W.candies); });
    const act = p.act ? p.act.label + '|' + p.act.k : '';
    set('act', act, () => { const b = $('#bAct'); b.classList.toggle('hidden', !p.act); if (p.act) { $('#bAct .k').textContent = p.act.label; b.classList.toggle('sealed', p.act.k === 'sealed'); } });
    const s = !p.climb && p.state === 'alive' ? stairAt(p.f, p.x) : null, up = !!(s && p.f < s.f1), dn = !!(s && p.f > s.f0);
    set('climb', up + '|' + dn, () => { $('#bUp').classList.toggle('hidden', !up); $('#bDown').classList.toggle('hidden', !dn); });
    if (s) UI.tip('stair', IS_TOUCH ? '在樓梯間往上推、或按「上樓」就會爬樓梯' : '在樓梯間按 W 上樓、S 下樓', 4);
    set('wakeBtn', W.parts >= 6 && !W.out, v => $('#bWake').classList.toggle('hidden', !v));
    // 撐住
    if (W.extract) {
      const hd = $('#hold'); hd.classList.remove('hidden');
      set('hold', Math.ceil(Math.max(0, W.extract.t)) + '|' + !!W.extract.onRoof, () => {
        hd.innerHTML = `<div class="n">${Math.ceil(Math.max(0, W.extract.t))}</div><div class="t">${W.extract.onRoof ? '撐住！待在天台' : '回天台！計時停了'}</div>`;
        hd.classList.toggle('off', !W.extract.onRoof);
      });
    }
    // 心魔血條
    const b = W.boss;
    if (b && !b.dead) {
      let bb = $('#bossbar');
      if (!bb) { bb = el('div', '', `<div class="nm">${esc(W.ch.boss.n)}</div><div class="bar"><div class="f"></div></div>`); bb.id = 'bossbar'; $('#hud').appendChild(bb); }
      const k = Math.round(b.hp / b.hpMax * 400) / 4; if (h.boss !== k) { h.boss = k; bb.querySelector('.f').style.width = k + '%'; }
    } else { const bb = $('#bossbar'); if (bb) bb.remove(); }
    AU.setTension(W.extract ? 3 : W.boss ? 3 : Math.min(3, W.lvl) + (p.hp < p.hpMax * .3 ? 1 : 0));
  },
  hint(text, dur = 3) { const h = $('#hint'); h.textContent = text; h.classList.add('show'); clearTimeout(UI._hint); UI._hint = setTimeout(() => h.classList.remove('show'), dur * 1000); },
  banner(a, b, boss) { const bn = $('#banner'); bn.querySelector('.a').textContent = a; bn.querySelector('.b').textContent = b || ''; bn.querySelector('.a').style.color = boss ? '#ffd0d4' : ''; bn.classList.add('show'); clearTimeout(UI._bn); UI._bn = setTimeout(() => bn.classList.remove('show'), 2600); },

  /* ---------- 靈光三選一 ---------- */
  choose(q) {
    if (!W || W.out) return;
    UI.chOpen = true; S.paused = true;
    const cs = svChoices(q);
    if (!cs.length) { UI.chOpen = false; S.paused = false; return; }
    const owned = Object.keys(W.tools).length;
    const s = el('div', 'screen'); s.id = 'lvup';
    const head = q === 2 ? ['紅色靈光', '三張都連升兩級'] : q === 1 ? ['金色靈光', '第一張連升兩級'] : ['靈光', `Lv ${W.xpLvl}・選一個`];
    s.innerHTML = `<div class="scrim"></div><div class="wrap"><div class="t ${q ? 'q' + q : ''}">${head[0]}</div><div class="s">${head[1]}</div><div class="cards">` +
      cs.map((c, i) => {
        const n = c.gold ? 2 : 1;
        let ic, nm, lv, d, col;
        if (c.k === 'tool') {
          const T0 = SV_TOOLS[c.id], cur = W.tools[c.id] ? W.tools[c.id].lv : 0, to = Math.min(5, cur + n);
          ic = T0.ic; nm = T0.n; col = T0.c;
          lv = cur ? `Lv ${cur} → ${to}` : `新夢具${to > 1 ? '・直上 Lv ' + to : ''}`;
          d = T0.lv.slice(cur, to).join('；');
          if (!cur) d += `<span class="own">夢具 ${owned + 1}/3</span>`;
        } else {
          const U = SV_UPS[c.id], cur = W.ups[c.id] || 0, to = Math.min(U.max, cur + n);
          ic = U.ic; nm = U.n; col = '#f3dca0';
          lv = `Lv ${cur} → ${to}／${U.max}`; d = U.d + (to - cur > 1 ? `（×${to - cur}）` : '');
        }
        return `<button class="card ${c.k} ${c.gold ? 'gold' : ''}" data-i="${i}" style="--cc:${col}"><div class="ic">${ic}</div><div class="tx"><div class="n">${nm}<span class="lv">${lv}</span></div><div class="d">${d}</div></div></button>`;
      }).join('') + `</div></div>`;
    $('#ui').appendChild(s); AU.sfx('levelup');
    let picked = false;
    s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      if (picked) return; picked = true;
      svApplyChoice(cs[+b.dataset.i]); AU.sfx('uiOpen');
      b.classList.add('picked');
      setTimeout(() => { s.remove(); UI.chOpen = false; S.paused = false; UI.chWait = .35; }, 160);
    });
  },

  /* ---------- 背包 ---------- */
  bag() {
    if (!W || W.out || S.mode !== 'play') return;
    const was = S.paused; S.paused = true;
    const p = W.players[0], used = bagUsed();
    let body = `<div class="note">背包 ${used}/${W.cap} 格。<b class="teal">保險格</b>裡的記憶，就算迷失也帶得走。</div><div class="sec">保險格</div><div class="bagGrid">`;
    body += W.pocket ? memRow(W.pocket, W.bag.length || used < W.cap ? `<button class="btn small ghost" data-out>取出</button>` : '') : `<div class="note mute">空的。第一段深憶以上的記憶會自己放進來。</div>`;
    body += `</div><div class="sec">背包</div><div class="bagGrid">`;
    if (!W.bag.length) body += `<div class="note mute">還是空的。</div>`;
    for (const it of W.bag.slice().sort((a, b) => b.val - a.val)) body += memRow(it, `<div class="acts">${W.pocket ? '' : `<button class="btn small primary" data-pk="${it.id}">保險</button>`}<button class="btn small ghost" data-dr="${it.id}">丟下</button></div>`);
    body += `</div>`;
    const close = () => { S.paused = was; };
    const s = sheet('bagS', '背包', `${fmt(W.bag.reduce((a, i) => a + i.val, 0) + (W.pocket ? W.pocket.val : 0))} 夢幣的記憶`, body, null, { onClose: close });
    s.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const it = W.bag.find(x => x.id === +b.dataset.pk); if (!it || W.pocket) return; W.pocket = it; W.bag = W.bag.filter(x => x !== it); AU.sfx('ui'); closeSheet('bagS'); S.paused = was; UI.bag(); });
    const ob = s.querySelector('[data-out]'); if (ob) ob.onclick = () => { const it = W.pocket; if (!it || bagUsed() + it.size > W.cap) { toast('背包放不下', 'bad'); return; } W.bag.push(it); W.pocket = null; AU.sfx('ui'); closeSheet('bagS'); S.paused = was; UI.bag(); };
    s.querySelectorAll('[data-dr]').forEach(b => b.onclick = () => {
      const it = W.bag.find(x => x.id === +b.dataset.dr); if (!it) return;
      W.bag = W.bag.filter(x => x !== it);
      const x = clamp(p.x + p.face * 26, FL(p.f).x0 + 30, FL(p.f).x1 - 30);
      W.picks.push({ k: 'mem', x, y: FY(p.f), f: p.f, tx: x, ty: FY(p.f), t: 1, item: it, land: true, ign: W.t + 2 });
      AU.sfx('drop', it.rar); closeSheet('bagS'); S.paused = was; UI.bag();
    });
  },

  /* ---------- 暫停 ---------- */
  pause() {
    if (S.mode !== 'play' || !W || W.out || UI.chOpen) return;
    S.paused = true;
    const ups = Object.entries(W.ups).filter(([, v]) => v > 0);
    const tl = Object.values(W.tools);
    const build = (tl.length ? tl.map(t => `<span class="tag" style="border-color:${SV_TOOLS[t.id].c};color:${SV_TOOLS[t.id].c}">${SV_TOOLS[t.id].n} Lv${t.lv}</span>`).join(' ') : '') +
      (ups.length ? ' ' + ups.map(([k, v]) => `<span class="tag">${SV_UPS[k].n} ${v}</span>`).join(' ') : '');
    const s = sheet('pause', '暫停', `${W.ch.title}・${fmtT(W.t)}`, `<div class="list">
      ${build ? `<div class="note">這一局：${build}</div>` : ''}
      <button class="btn primary" data-r>繼續</button>
      <button class="btn" data-b>背包</button>
      <button class="btn ghost" data-h>怎麼玩</button>
      <div style="display:flex;gap:8px"><button class="btn small ghost" data-mu style="flex:1">音樂：${G.settings.music ? '開' : '關'}</button><button class="btn small ghost" data-sf style="flex:1">音效：${G.settings.sfx ? '開' : '關'}</button></div>
      <div style="display:flex;gap:8px"><button class="btn small ghost" data-re style="flex:1">重新開始</button><button class="btn small ghost" data-t style="flex:1">回標題</button></div></div>`, null, { onClose: () => S.paused = false });
    s.querySelector('[data-r]').onclick = () => { closeSheet('pause'); S.paused = false; };
    s.querySelector('[data-b]').onclick = () => { closeSheet('pause'); S.paused = false; UI.bag(); };
    s.querySelector('[data-h]').onclick = () => { closeSheet('pause'); S.paused = false; UI.howto(); };
    s.querySelector('[data-mu]').onclick = e => { G.settings.music = !G.settings.music; AU.applyVol(); e.target.textContent = '音樂：' + (G.settings.music ? '開' : '關'); };
    s.querySelector('[data-sf]').onclick = e => { G.settings.sfx = !G.settings.sfx; AU.applyVol(); e.target.textContent = '音效：' + (G.settings.sfx ? '開' : '關'); };
    s.querySelector('[data-re]').onclick = () => confirmBox('重新開始', '這一局的東西都會不見。', '重新開始', '取消', () => { closeSheet('pause'); UI.fadeTo(() => UI.start()); }, true);
    s.querySelector('[data-t]').onclick = () => confirmBox('回標題', '這一局的東西都會不見。', '回標題', '取消', () => { closeSheet('pause'); UI.fadeTo(() => { W = null; UI.title(); }); }, true);
  },

  /* ---------- 結算 ---------- */
  results(res) {
    S.mode = 'result'; S.paused = false;
    $('#hud').classList.add('hidden'); AU.setTension(0); radioClear();
    $$('#ui .screen').forEach(s => s.remove()); UI.chOpen = false;
    AU.music(res.kind === 'lost' ? 'scene' : 'hub');
    const ok = res.kind !== 'lost';
    const how = { bell: '敲鐘撤離', wake: '緊急醒來', lost: '迷失在夢裡' }[res.kind];
    let body = `<div class="big serif" style="color:${ok ? '#bffff1' : '#ff8a94'}">${ok ? '醒來' : '迷失'}</div><div class="note" style="text-align:center">${esc(W.ch.title)}・${how}</div>`;
    body += `<div class="stat"><span>時間<b>${fmtT(res.t)}</b></span><span>清完的波次<b>${res.waves}</b></span><span>解決夢魘<b>${res.kills}</b></span><span>開過的房間<b>${W.L.rooms.filter(r => r.style !== 'stair' && r.entered).length}/${W.L.rooms.filter(r => r.style !== 'stair').length}</b></span><span>最高清醒度<b>${res.wake}</b></span><span>心魔<b>${res.boss ? '打倒了' : W.wake >= 100 ? '沒打倒' : '沒出現'}</b></span></div>`;
    if (res.svMems.length) {
      body += `<div class="sec">夢中人的記憶</div><div class="bagGrid">`;
      for (const it of res.svMems) body += memRow(it, '', `<span class="tag" style="border-color:#ffd0e0;color:#ffd0e0;margin-right:6px">夢中人</span>`);
      body += `</div>`;
    }
    const items = res.items.slice().sort((a, b) => b.rar - a.rar || b.val - a.val);
    body += `<div class="sec">${ok ? '帶出來的記憶' : '保險格裡的記憶'}（${items.length}）</div><div class="bagGrid">`;
    if (!items.length) body += `<div class="note mute">什麼都沒帶出來。</div>`;
    for (const it of items) body += memRow(it, '', it === res.items[0] && W.pocket === it ? `<span class="tag" style="border-color:#53f0d6;color:#53f0d6;margin-right:6px">保險</span>` : '');
    body += `</div>`;
    if (res.lost && res.lost.length) { body += `<div class="note red" style="margin-top:10px">留在夢裡的記憶：</div><div class="bagGrid">`; for (const it of res.lost) body += `<div class="itemrow lost"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n">${esc(it.n)}</div></div></div>`; body += `</div>`; }
    const left = W.survivors.filter(v => !res.svMems.some(m => m.n === v.mem.n));
    if (left.length) body += `<div class="note" style="margin-top:12px;color:#ffc6d6">還留在夢裡的：${left.map(v => esc(v.n)).join('、')}</div>`;
    if (ok && res.coins) body += `<div class="contract" style="margin-top:12px"><span>身上的夢幣</span><span class="money">${fmt(res.coins)}</span></div>`;
    body += `<div class="contract total"><span>這一趟的總值</span><span class="money">${fmt(res.total)}</span></div>`;
    const s = sheet('result', '結算', '', body, `<button class="btn ghost" data-t>回標題</button><button class="btn primary" data-n style="flex:1">再來一次</button>`, { modal: true, noX: true });
    s.querySelector('[data-n]').onclick = () => { AU.sfx('ui'); UI.fadeTo(() => UI.start()); };
    s.querySelector('[data-t]').onclick = () => { AU.sfx('ui'); UI.fadeTo(() => { W = null; UI.title(); }); };
  },
};
