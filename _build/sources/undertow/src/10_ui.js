/* ============ 10 介面 ============ */
const SVG = {
  track: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 22a11 11 0 0 1 22 0"/><path d="M10 22a6 6 0 0 1 12 0"/><path d="M16 22L23 12"/><circle cx="16" cy="22" r="1.8" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="#cfeff7"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  fire: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="2.5" fill="currentColor"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7"/></svg>',
  quiet: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M10 12a6 6 0 0 1 12 0c0 4-3 5-4 8s-1 6-4 6"/><path d="M14 12a2 2 0 0 1 4 0"/><path d="M4 4l24 24"/></svg>',
  sneak: '<svg viewBox="0 0 32 32" fill="currentColor"><ellipse cx="11" cy="20" rx="4" ry="6"/><ellipse cx="21" cy="12" rx="4" ry="6"/><circle cx="8" cy="11" r="1.6"/><circle cx="11" cy="9.5" r="1.6"/><circle cx="18" cy="3.8" r="1.5"/><circle cx="21.5" cy="3" r="1.5"/></svg>',
  breath: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M16 4v10M16 12l-5 4M16 12l5 4"/><path d="M11 15c-4 0-6 4-6 9 0 3 2 4 4 3l3-2v-8"/><path d="M21 15c4 0 6 4 6 9 0 3-2 4-4 3l-3-2v-8"/></svg>',
  med: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2" fill="#eef2f0"/><rect x="10.5" y="8" width="3" height="9" fill="#ff4f5e"/><rect x="7.5" y="11" width="9" height="3" fill="#ff4f5e"/></svg>',
  decoy: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffcf3a" stroke-width="2" stroke-linecap="round"><rect x="9" y="10" width="6" height="11" rx="1.5" fill="#5d6d75" stroke="#8fa3ad"/><path d="M12 10V7"/><path d="M8 5a6 6 0 0 1 8 0"/><path d="M5 2.5a10 10 0 0 1 14 0"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="#ff4f5e"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>',
  dive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v14"/><path d="M6 12l6 6 6-6"/><path d="M4 21h16"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="11" r="5"/><path d="M8 15l-2 6h12l-2-6"/><path d="M12 6V3"/></svg>',
  crew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M15 14.5c3 0 5.5 2 5.5 5"/></svg>',
  files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="12" r="2.2"/><circle cx="15.5" cy="12" r="2.2"/><path d="M8.5 14.2h7"/></svg>',
  relic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/></svg>',
  set: '<svg viewBox="0 0 24 24" fill="none" stroke="#cfeff7" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
};
const UI = {
  modalOpen: false, hudT: 0, subQ: [], subCur: null, subT: 0, tab: 'dive',
  /* ---------- 標題 ---------- */
  title() {
    S.mode = 'title'; $('#hud').classList.add('hidden'); this.closeModal();
    const sc = $('#screen'); sc.classList.remove('hidden');
    const N = 16, order = RNG(7).shuffle([...Array(N).keys()]);
    const slices = order.map((k, j) => `<span class="sl" style="clip-path:inset(0 ${100 - (k + 1) * 100 / N}% 0 ${k * 100 / N}%);animation-delay:${(.25 + j * .16 + (k % 3) * .05).toFixed(2)}s">深艙</span>`).join('');
    sc.innerHTML = `<div id="title"><div class="logo"><h1><span class="ghost">深艙</span>${slices}</h1><div class="en">${'UNDERTOW'.split('').map((c, j) => `<i style="animation-delay:${(2.9 + j * .12).toFixed(2)}s">${c}</i>`).join('')}</div><div class="tg">牠看不見你　牠聽得見你</div></div>
      <div class="acts"><button class="btn primary" id="t-go">開始下潛</button><button class="btn ghost" id="t-set">設定</button></div>
      <div class="foot">${VERSION}・建議戴耳機</div></div>`;
    $('#t-go').onclick = () => { AU.init(); AU.voiceUnlock(); AU.play('ui2'); if (!G.seenPrologue) { this.story(PROLOGUE, {}, () => { G.seenPrologue = true; saveGame(); this.hub('dive'); }); } else this.hub('dive'); };
    $('#t-set').onclick = () => { AU.init(); AU.play('ui'); this.settings(); };
  },
  /* ---------- 母船 ---------- */
  hub(tab) {
    S.mode = 'hub'; this.tab = tab || this.tab; $('#hud').classList.add('hidden');
    AU.stopAmb();
    const sc = $('#screen'); sc.classList.remove('hidden');
    sc.innerHTML = `<div id="hub"><div class="hdr"><div class="ship"><b>海燕號</b><span>SALVAGE VESSEL HAIYAN</span></div>
      <div class="cr"><span class="num">${fmt(G.credits)}</span><small>信用點</small></div><button class="hbtn" id="h-set">${SVG.set}</button></div>
      <div class="body"><div class="wrap" id="h-body"></div></div>
      <div class="tabs">${[['dive', '下潛'], ['gear', '整備'], ['crew', '生還者'], ['files', '檔案'], ['relic', '藏品']].map(([k, n]) => `<button data-t="${k}" class="${k === this.tab ? 'on' : ''}">${SVG[k]}${n}${k === 'files' && LOG_ORDER.some(id => G.logs[id] && !G.read[id]) ? '<i class="dot"></i>' : ''}</button>`).join('')}</div></div>`;
    sc.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { AU.play('ui'); this.hub(b.dataset.t); });
    $('#h-set').onclick = () => { AU.play('ui'); this.settings(); };
    const body = $('#h-body');
    ({ dive: this.tabDive, gear: this.tabGear, crew: this.tabCrew, files: this.tabFiles, relic: this.tabRelic })[this.tab].call(this, body);
  },
  tabDive(body) {
    let h = `<div class="sec-h"><h2>下潛</h2><span>瀚淵站・寂淵海溝</span></div>`;
    SECTORS.forEach((s, i) => {
      const g = G.sectors[i], lock = !g.unlocked;
      const sv = s.survivors.filter(id => G.survivors[id]).length, lg = s.logs.filter(id => G.logs[id]).length;
      h += `<button class="dive ${lock ? 'lock' : ''}" data-i="${i}"><div class="art" style="background:radial-gradient(circle at 70% 50%,${rgba(s.col, .45)},transparent 60%),repeating-linear-gradient(90deg,transparent 0 38px,rgba(255,255,255,.05) 38px 40px),repeating-linear-gradient(0deg,transparent 0 30px,rgba(255,255,255,.05) 30px 32px)"></div>
        <div class="no">SECTOR 0${i + 1}・${s.en}</div><h3>${s.name}</h3><div class="dp">水深 ${fmt(s.depth)} m${s.final ? '・最終區' : ''}</div>
        ${lock ? `<div class="meta">先從 ${SECTORS[i - 1].name} 成功撤離</div>` : `<div class="meta"><span>生還者 <b>${sv}/${s.survivors.length}</b></span><span>錄音・日誌 <b>${lg}/${s.logs.length}</b></span>${g.best ? `<span>最佳打撈 <b>${fmt(g.best)}</b></span>` : ''}</div>
        <div class="stars">${['撤離', '救全員', '聆'].map((n, k) => `<i class="${g.stars[k] ? 'on' : ''}"><span>${g.stars[k] ? '◆' : ''}</span></i>`).join('')}</div>`}
        ${!lock && !g.runs ? '<span class="tag new">NEW</span>' : ''}</button>`;
    });
    if (G.endless.unlocked) h += `<button class="dive endless" data-i="5"><div class="no">ENDLESS</div><h3>無盡深潛</h3><div class="dp">下一層：第 ${G.endless.best + 1} 層・最深紀錄 ${G.endless.best} 層</div><div class="meta">沒有劇情、沒有生還者。越深越危險，打撈價值越高。</div></button>`;
    const endN = Object.keys(G.endings).length;
    if (endN) h += `<div class="sec-h" style="margin-top:18px"><h2>結局</h2><span>${endN}/3</span></div><div class="meta" style="font-size:13px;color:var(--mute)">${['A', 'B', 'C'].map(k => G.endings[k] ? `結局 ${k}・${ENDINGS[k].name}` : `結局 ${k}・？？？`).join('　')}</div>`;
    body.innerHTML = h;
    body.querySelectorAll('.dive').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i < 5 && !G.sectors[i].unlocked) { AU.play('deny'); return; }
      AU.play('ui'); this.loadout(i);
    });
  },
  tabGear(body) {
    let h = `<div class="sec-h"><h2>整備</h2><span>用信用點升級潛水服</span></div>`;
    for (const m of META) {
      const lv = metaLv(m.id), max = lv >= m.max, cost = max ? 0 : m.cost[lv];
      h += `<div class="upg"><div class="ic" data-pi="${m.icon}"></div><div class="tx"><b>${m.name}</b><p>${lv ? m.txt(lv) : '尚未升級'}${max ? '' : `　<span style="color:var(--cyan)">下一級：${m.nx}</span>`}</p><div class="pips">${Array.from({ length: m.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div></div>
        <button class="btn small ${max ? 'ghost' : G.credits >= cost ? 'primary' : ''} buy" data-m="${m.id}" ${max || G.credits < cost ? 'disabled' : ''}>${max ? '滿級' : `<span class="num">${fmt(cost)}</span>`}</button></div>`;
    }
    h += `<div class="sec-h" style="margin-top:18px"><h2>裝備</h2><span>撈到藍圖就能帶下去・槍對聆沒有用</span></div><div class="wgrid">`;
    for (const id of WEAPON_ORDER) {
      const W0 = WEAPONS[id], has = G.weapons.includes(id);
      h += `<div class="wcard ${has ? '' : 'lock'}"><canvas data-wi="${id}" width="112" height="112"></canvas><b>${has ? W0.name : '？？？'}<small style="font-size:10px;color:var(--mute);margin-left:6px">${W0.kind === 'gun' ? '槍' : '保命工具'}</small></b><p>${has ? W0.desc : '藍圖未取得'}</p>${has ? `<div class="nz ${NZ[W0.nz].c}">聲音：${NZ[W0.nz].t}</div>` : ''}</div>`;
    }
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('[data-pi]').forEach(d => d.appendChild(iconCanvas(48, x => drawPassiveIcon(x, d.dataset.pi))));
    body.querySelectorAll('[data-wi]').forEach(c => { const x = c.getContext('2d'); x.scale(112 / 64, 112 / 64); drawWeaponIcon(x, c.dataset.wi); });
    body.querySelectorAll('.buy').forEach(b => b.onclick = () => {
      const m = META.find(q => q.id === b.dataset.m), lv = metaLv(m.id);
      if (lv >= m.max || G.credits < m.cost[lv]) { AU.play('deny'); return; }
      G.credits -= m.cost[lv]; G.meta[m.id] = lv + 1; saveGame(); AU.play('buy'); this.hub('gear');
    });
  },
  tabCrew(body) {
    const n = survCount();
    let h = `<div class="sec-h"><h2>生還者</h2><span>${n}/12・救出的人會給你一個永久加成</span></div>`;
    if (G.survivors.lin) h += `<div class="sv" style="border-color:rgba(95,231,255,.45)"><canvas data-sv="lin" width="128" height="128"></canvas><div class="tx"><b>林汐<em>聲學研究員</em></b><div class="pk">◆ 聽得見聆：聆的位置提示範圍 +25%，牠從管道出來前多 1.5 秒預警</div><p>「牠們唱的不是歌，是地圖。三短一長是『我在這裡』，兩長是『回來』。……我花了三年才聽懂。」</p></div></div>`;
    for (const id of SURV_ORDER) {
      const s = SURV[id], ok = G.survivors[id];
      h += `<div class="sv ${ok ? '' : 'lock'}"><canvas data-sv="${id}" width="128" height="128"></canvas><div class="tx"><b>${ok ? s.name : '失蹤中'}<em>${ok ? s.role : SECTORS[s.sector].name}</em></b>${ok ? `<div class="pk">◆ ${s.ptxt}</div><p>${s.tes}</p>` : `<p style="color:var(--dim)">最後一次出現在${SECTORS[s.sector].name}。</p>`}</div></div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-sv]').forEach(c => { const x = c.getContext('2d'); x.scale(2, 2); drawPortrait(x, c.dataset.sv, c.dataset.sv === 'lin' ? 190 : SURV[c.dataset.sv].hue); });
  },
  tabFiles(body) {
    const got = LOG_ORDER.filter(id => G.logs[id]).length;
    let h = `<div class="sec-h"><h2>檔案</h2><span>${got}/${LOG_ORDER.length}・錄音、日誌、監視器</span></div>`;
    SECTORS.forEach((s, i) => {
      h += `<div class="lgsec"><h4>${s.name}</h4>`;
      for (const id of s.logs) { const L = LOGS[id], ok = G.logs[id]; h += `<button class="lg ${ok ? '' : 'lock'} ${ok && !G.read[id] ? 'unread' : ''}" data-l="${id}"><small>${ok ? L.who : '未取得'}</small>${ok ? L.text.slice(0, 26) + '……' : '？？？'}</button>`; }
      h += '</div>';
    });
    body.innerHTML = h;
    body.querySelectorAll('.lg').forEach(b => b.onclick = () => { const id = b.dataset.l; if (!G.logs[id]) { AU.play('deny'); return; } AU.play('ui'); this.readLog(id); });
  },
  tabRelic(body) {
    const got = RELICS.filter(r => G.relics[r.id]).length;
    let h = `<div class="sec-h"><h2>藏品</h2><span>${got}/${RELICS.length}・傳說以上的搜索點才找得到</span></div><div class="rgrid">`;
    for (const r of RELICS) { const st = G.relics[r.id] || 0; h += `<button class="rl ${st ? '' : 'lock'}" data-r="${r.id}"><canvas data-ri="${r.id}" width="120" height="120"></canvas><b>${st ? r.name : '？？？'}</b>${st ? `<div class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div>` : ''}</button>`; }
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('[data-ri]').forEach(c => { const x = c.getContext('2d'); x.scale(120 / 64, 120 / 64); drawRelicIcon(x, c.dataset.ri); });
    body.querySelectorAll('.rl').forEach(b => b.onclick = () => { const r = RELICS.find(q => q.id === b.dataset.r), st = G.relics[r.id] || 0; if (!st) { AU.play('deny'); return; } AU.play('ui');
      this.modal(`<h3>${r.name}</h3><div class="sub">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div><p class="serif" style="line-height:1.9;font-size:15px">${r.txt}</p><p style="color:var(--green);font-size:13px">加成：${r.b}${st > 1 ? `（×${st}）` : ''}</p><div class="row"><button class="btn small" data-close>關閉</button></div>`); });
  },
  readLog(id) {
    const L = LOGS[id]; G.read[id] = true; saveGame();
    const amber = L.kind === 'voice' || L.kind === 'cast';
    this.modal(`<div class="term ${amber ? 'amber' : ''}"><div class="th"><span>瀚淵站 檔案終端</span><span>${id.replace('-', '・')}</span></div><div class="tw">${L.who}</div><p class="tt" id="tt"></p><div class="tf">輕觸文字可直接顯示全文</div></div><div class="row"><button class="btn small" data-close>關閉</button></div>`, () => { clearInterval(this.typeI); if (S.mode === 'hub') this.hub('files'); });
    const box = $('#tt'), txt = L.text; let i = 0;
    clearInterval(this.typeI);
    const step = () => { i = Math.min(txt.length, i + 2); box.innerHTML = txt.slice(0, i) + '<i class="cur"></i>'; if (i % 6 === 0) AU.play('type'); if (i >= txt.length) clearInterval(this.typeI); };
    this.typeI = setInterval(step, 38);
    box.parentNode.onclick = () => { i = txt.length - 2; step(); };
  },
  loadout(si) {
    const guns = GUN_ORDER.filter(id => G.weapons.includes(id)), tools = TOOL_ORDER.filter(id => G.weapons.includes(id));
    let sel = guns.includes(G.lastWeapon) ? G.lastWeapon : guns[0];
    let selT = tools.includes(G.lastTool) ? G.lastTool : tools[0] || null;
    const S0 = si < 5 ? SECTORS[si] : sectorCfg(5, G.endless.best + 1);
    const card = (id, on, k) => `<button class="card ${on ? 'gold' : ''}" data-${k}="${id}" style="--c:${WEAPONS[id].col}"><canvas data-wi="${id}" width="116" height="116"></canvas><div class="tx"><div class="k">${on ? '已選擇' : k === 'w' ? '槍' : '保命工具'}</div><b>${WEAPONS[id].name}</b><p>${WEAPONS[id].desc}</p><span class="nz ${NZ[WEAPONS[id].nz].c}">聲音：${NZ[WEAPONS[id].nz].t}</span>${k === 'w' ? `<span class="nz">開局 ${WEAPONS[id].ammo0} ${WEAPONS[id].unit}</span>` : `<span class="nz">次數 ${WEAPONS[id].uses0}</span>`}</div></button>`;
    const draw = () => {
      this.modal(`<h3>${S0.name}</h3><div class="sub">水深 ${fmt(S0.depth)} m・選一把槍、一樣保命工具</div>
        <div class="cards">${guns.map(id => card(id, id === sel, 'w')).join('')}</div>
        <div class="sub" style="margin:14px 0 8px">保命工具</div>
        ${tools.length ? `<div class="cards">${tools.map(id => card(id, id === selT, 't')).join('')}</div>` : '<p style="font-size:12.5px;color:var(--mute);line-height:1.6;margin:0 2px">還沒有工具。從生活艙段成功撤離，就會拿到第一個保命工具「焊槍」。</p>'}
        <p style="font-size:12px;color:var(--mute);line-height:1.6;margin:12px 2px 0">生命 ${makePlayerPreview().hp}・震爆彈 ${1 + metaLv('flash')}・醫療包 ${metaLv('med')}・誘餌 ${1 + metaLv('decoy')}・重抽 ${1 + metaLv('reroll') + (survPerk('reroll') ? 1 : 0)}</p>
        <div class="row"><button class="btn ghost small" data-close>返回</button><button class="btn primary" id="go">下潛</button></div>`);
      $('#modal').querySelectorAll('[data-wi]').forEach(c => { const x = c.getContext('2d'); x.scale(116 / 64, 116 / 64); drawWeaponIcon(x, c.dataset.wi); });
      $('#modal').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { sel = b.dataset.w; AU.play('ui'); draw(); });
      $('#modal').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { selT = b.dataset.t; AU.play('ui'); draw(); });
      $('#go').onclick = () => { AU.init(); AU.voiceUnlock(); AU.play('ui2'); G.lastWeapon = sel; G.lastTool = selT; saveGame(); this.closeModal(); this.startDive(si); };
    };
    draw();
  },
  /* ---------- 開始下潛 ---------- */
  startDive(si) {
    const tier = si === 5 ? G.endless.best + 1 : 0;
    fade(() => {
      $('#screen').classList.add('hidden'); $('#screen').innerHTML = '';
      newWorld(si, tier);
      S.mode = 'dive'; R.snapCam = true; resize();
      this.initHud();
      AU.startAmb(si);
      const S0 = W.S;
      this.banner(S0.name, `水深 ${fmt(S0.depth)} m`, 'cy');
      S0.intro.slice(1).forEach(t => W.subs.push({ who: '', text: t, kind: 'doc', dur: 4 }));
      setTimeout(() => tip('start'), 1500);
      if (si === 4) setTimeout(() => { if (W && W.si === 4) W.subs.push({ who: '【錄音｜林汐】', text: '……你到了。我聽得到你的腳步聲。往下走，我在最底層。', kind: 'log', dur: 5 }); }, 6000);
      else { const w0 = W; setTimeout(() => { if (W === w0 && W.state === 'play') say(G.stats.dives === 0 ? PA.start[0] : pick(PA.start)); }, 9000); }
    });
  },
  /* ---------- 遊戲中 HUD ---------- */
  initHud() {
    $('#hud').classList.remove('hidden');
    $('#btn-pause').innerHTML = SVG.pause;
    $('#btn-med').innerHTML = SVG.med + '<b></b><i class="cd"></i>';
    $('#btn-decoy').innerHTML = SVG.decoy + '<b></b><i class="cd"></i>';
    $('#btn-track').innerHTML = SVG.track + '<em>偵測</em>'; this.trackerBtn();
    const tb = $('#btn-tool'); tb.innerHTML = ''; tb.classList.toggle('hidden', !W.P.tool);
    if (W.P.tool) { tb.appendChild(iconCanvas(68, x => drawWeaponIcon(x, W.P.tool))); tb.insertAdjacentHTML('beforeend', '<b></b><i class="cd"></i>'); tb.style.borderColor = rgba(WEAPONS[W.P.tool].col, .75); }
    $('#hud-sector .nm').textContent = W.S.name + (W.S.endless ? ` 第 ${W.tier} 層` : '');
    $('#hud-sector .dp').textContent = fmt(W.S.depth) + ' M';
    $('#dockbar').classList.add('hidden'); $('#btn-trap').classList.add('hidden');
    $('#subtitle').innerHTML = ''; $('#toasts').innerHTML = ''; $('#banner').innerHTML = '';
    this.subQ = []; this.subCur = null; this.actMode = null; this.stance(); this.hideMode(false); this.hudT = 0;
    $('#joyhint').classList.toggle('hidden', G.stats.dives > 1);
  },
  trackerBtn() { const b = $('#btn-track'); if (b && W) b.classList.toggle('on', W.tracker.on); },
  stance() {
    const b = $('#btn-stance'), q = W && W.P.stealth;
    b.className = q ? 'quiet' : '';
    b.innerHTML = SVG.sneak + (q ? '潛行中' : '潛行');
  },
  hideMode(on) {
    const o = $('#hideov');
    if (on && W && W.P.hide) { o.className = 'on ' + HIDE_INFO[W.P.hide.type].ov; o.querySelector('.lbl').textContent = '牠經過的時候，按住「憋氣」'; }
    else o.className = '';
    this.actMode = null;
  },
  actBtn() {
    const p = W.P, b = $('#btn-act'), mode = p.hide ? 'breath' : 'fire';
    if (this.actMode !== mode) { this.actMode = mode; b.className = mode === 'breath' ? 'breath' : ''; b.innerHTML = (mode === 'breath' ? SVG.breath + '憋氣' : SVG.fire + '開火') + '<b></b><i class="ring"></i>'; this.actB = b.querySelector('b'); this.actR = b.querySelector('.ring'); }
    b.classList.toggle('held', mode === 'breath' ? p.hold : p.fireHeld);
    if (mode === 'fire') { const v = String(p.ammo); if (this.actB.textContent !== v) this.actB.textContent = v; b.classList.toggle('empty', p.ammo <= 0); }
    else { this.actR.style.setProperty('--p', (p.breath * 100).toFixed(1) + '%'); this.actR.style.setProperty('--rc', p.breath < .3 ? '#ff6b6b' : '#9fe0ff'); }
  },
  updateHud(dt) {
    if (!W) return;
    this.tickSubs(dt);
    const tb = $('#btn-track'); if (tb) tb.classList.toggle('ping', W.tracker.on && W.tracker.pingFx > .75);
    this.actBtn();
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = .07;
    const p = W.P;
    // 生命／氧氣／隨身物品
    $('#hud-hp .hp i').style.width = (clamp(p.hp / p.hpMax, 0, 1) * 100) + '%';
    const lag = $('#hud-hp .hp s'); const lw = parseFloat(lag.style.width || '100'); const nw = clamp(p.hp / p.hpMax, 0, 1) * 100; lag.style.width = (lw > nw ? Math.max(nw, lw - 2) : nw) + '%';
    $('#hud-hp .hpv').textContent = Math.max(0, Math.ceil(p.hp));
    $('#hud-hp .o2row').classList.toggle('hidden', p.o2 > .99);
    $('#hud-hp .o2 i').style.width = (p.o2 * 100) + '%';
    $('#hud-hp .fls b').textContent = p.flashes; $('#hud-hp .fls b').style.color = p.flashes ? '' : '#ff6b6b';
    $('#hud-hp .bat b').textContent = p.batteries;
    $('#hud-hp .fus').classList.toggle('hidden', !p.fuses); $('#hud-hp .fus b').textContent = p.fuses;
    $('#hud-hp .key').classList.toggle('hidden', !W.key);
    $('#btn-med b').textContent = p.med; $('#btn-med').classList.toggle('empty', p.med <= 0); $('#btn-med .cd').style.setProperty('--p', (p.medT / 1.2 * 100) + '%');
    $('#btn-decoy b').textContent = p.decoys; $('#btn-decoy').classList.toggle('empty', p.decoys <= 0); $('#btn-decoy .cd').style.setProperty('--p', (p.decoyT * 100) + '%');
    if (p.tool) { const t0 = $('#btn-tool'); t0.querySelector('b').textContent = p.toolUses; t0.classList.toggle('empty', p.toolUses <= 0); t0.querySelector('.cd').style.setProperty('--p', (p.toolT / .9 * 100) + '%'); }
    // 打撈袋
    const bagH = `◆ ${fmt(W.bagVal)}${W.bagWt > 5 ? `<em>負重・腳步聲 +${Math.round(Math.min(.6, W.bagWt * .02) * 100)}%</em>` : ''}`;
    if (this.bagH !== bagH) { this.bagH = bagH; $('#hud-sector .bag').innerHTML = bagH; }
    // 深壓
    const pr = W.pressure, stg = STAGES[W.stage];
    $('#pring').style.strokeDashoffset = 157 * (1 - pr / 100); $('#pring').style.stroke = stg.col;
    const pv = $('#hud-pressure .pv'), pvt = Math.floor(pr) + '%'; if (pv.textContent !== pvt) { pv.textContent = pvt; pv.style.fontSize = pr >= 100 ? '14px' : ''; }
    const ps = $('#hud-pressure .ps'); ps.textContent = stg.name; ps.style.color = stg.col;
    // 心率：太快的話牠聽得到
    const hr = Math.round(W.heart), hh = $('#hud-heart');
    hh.innerHTML = `${SVG.heart}<span style="color:${hr >= 148 ? '#ff4f5e' : hr >= 120 ? '#ffb03a' : '#dbecf1'}">${hr}</span><small>${hr >= 148 ? '太快了' : 'BPM'}</small>`;
    hh.classList.toggle('fast', hr >= 148);
    // 狀態列：崩潰倒數／陷阱
    const wv = $('#hud-wave'), traps = armedTraps();
    if (W.dock.called && !W.dock.arrived) wv.innerHTML = '';
    else if (W.stage >= 4) { wv.className = 'hot'; wv.innerHTML = `崩潰倒數<b>${Math.max(0, Math.ceil(W.collapseT))}</b>`; }
    else if (W.ending) wv.innerHTML = '';
    else if (traps.length) { wv.className = ''; wv.innerHTML = `陷阱<b style="color:#ffd23a;font-size:13px">通電待命</b>`; }
    else wv.innerHTML = '';
    const trb = $('#btn-trap');
    if (traps.length && W.state === 'play') { trb.classList.remove('hidden'); const ready = !!trapReady(); trb.classList.toggle('ready', ready); trb.querySelector('small').textContent = ready ? '牠在水裡！' : (traps.some(r => r.water >= .26) ? '把牠引進去' : '還沒淹水'); }
    else trb.classList.add('hidden');
    const db = $('#dockbar');
    if (W.dock.called && !W.dock.arrived) { db.classList.remove('hidden'); db.innerHTML = `潛艇抵達<b>${Math.max(0, Math.ceil(W.dock.t))}</b>`; }
    else if (W.dock.arrived) { db.classList.remove('hidden'); db.innerHTML = '潛艇到了<b style="font-size:20px">走到月池登艇</b>'; }
    else db.classList.add('hidden');
    // 目標
    const o = W.obj;
    $('#hud-obj').innerHTML = `<div class="obj ${W.dock.arrived ? 'done' : ''}">◆ 撤離</div><div class="obj ${o.survivors && o.rescued >= o.survivors ? 'done' : ''}">◆ 生還者 <b>${o.rescued}/${o.survivors}</b></div><div class="obj ${o.hunterKill ? 'done' : ''}">◆ ${o.hunterKill ? '聆 已除掉' : '設局除掉聆'}</div>`;
    // 情境按鈕
    const its = W.state === 'play' ? interactables() : [];
    const cb = $('#btn-ctx'), it = its[0];
    if (p.channel) { cb.classList.remove('hidden'); cb.className = ''; cb.querySelector('span').textContent = p.channel.it.label + '…'; cb.querySelector('i').style.width = (p.channel.t / p.channel.it.dur * 100) + '%'; }
    else if (it) { cb.classList.remove('hidden'); cb.className = it.off ? 'off' : it.k === 'hide' || it.k === 'unhide' ? 'hide' : it.warn ? 'warn' : ''; cb.querySelector('span').textContent = it.label; cb.querySelector('i').style.width = '0'; }
    else cb.classList.add('hidden');
  },
  tickSubs(dt) {
    const box = $('#subtitle');
    while (W.subs.length) {
      const s = W.subs.shift(); if (s.kind === 'radio' && !s.prio && this.subQ.length > 2) continue;
      this.subQ.push(s); if ((s.prio || 0) >= 2) this.subQ.sort((a, b) => (b.prio || 0) - (a.prio || 0));
      if ((s.prio || 0) >= 3 && this.subCur && (this.subCur.prio || 0) < 3) this.subT = Math.min(this.subT, .12);
    }
    if (this.subCur) { this.subT -= dt; if (this.subT <= 0) { const n = box.firstChild; if (n) { n.classList.remove('on'); setTimeout(() => n.remove(), 360); } this.subCur = null; this.subGap = .35; } return; }
    if (this.subGap > 0) { this.subGap -= dt; return; }
    if (!this.subQ.length) return;
    const s = this.subQ.shift(); this.subCur = s; this.subT = s.dur || 3;
    box.innerHTML = '';
    const cls = s.kind === 'radio' ? 'radio' : s.kind === 'voice' ? 'voice' : s.kind === 'ai' ? 'ai crt' : (s.kind === 'log' || s.kind === 'doc') ? 'crt' + (s.kind === 'log' ? ' amber' : '') : '';
    const d = el('div', 'sb ' + cls, (s.who ? `<span class="who">${s.kind === 'ai' ? '◉ ' : ''}${s.who}</span>` : '') + s.text);
    box.appendChild(d); requestAnimationFrame(() => d.classList.add('on'));
  },
  banner(t, s, cls) { const b = $('#banner'); b.innerHTML = ''; const d = el('div', 'bn ' + (cls || ''), t + (s ? `<small>${s}</small>` : '')); b.appendChild(d); setTimeout(() => d.remove(), 2500); },
  toast(html, col) { const box = $('#toasts'); const d = el('div', 'toast', html); d.style.borderLeftColor = col || 'var(--r0)'; if (col) d.style.color = col; box.prepend(d); while (box.children.length > 5) box.lastChild.remove(); setTimeout(() => d.remove(), 3300); },
  hurt(f) { const h = $('#hurt'); h.style.transition = 'none'; h.style.boxShadow = `inset 0 0 120px ${30 + f * 60}px rgba(255,20,40,${.35 + f * .5})`; requestAnimationFrame(() => { h.style.transition = 'box-shadow .6s'; h.style.boxShadow = 'inset 0 0 120px 40px rgba(255,20,40,0)'; }); },
  flashScreen(col) { const h = $('#hurt'); h.style.transition = 'none'; h.style.background = col; requestAnimationFrame(() => { h.style.transition = 'background .5s'; h.style.background = 'transparent'; }); },
  /* ---------- 彈窗 ---------- */
  modal(inner, onClose, cls) {
    const m = $('#modal'); m.classList.remove('hidden'); this.modalOpen = true;
    m.innerHTML = `<div class="mbox panel ${cls || ''}">${inner}</div>`;
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { AU.play('ui'); this.closeModal(); onClose && onClose(); });
  },
  closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; this.modalOpen = false; },
  confirm(title, text, ok, fn) {
    this.modal(`<h3>${title}</h3><p style="text-align:center;color:var(--mute);font-size:14px;line-height:1.7">${text}</p><div class="row"><button class="btn ghost small" data-close>取消</button><button class="btn warn small" id="cf-ok">${ok}</button></div>`);
    $('#cf-ok').onclick = () => { this.closeModal(); fn(); };
  },
  /* ---------- 強化艙：三選一 ---------- */
  levelUp() {
    const p = W.P;
    AU.play('levelup');
    const cards = rollCards();
    const show = () => {
      this.modal(`<h3>強化艙</h3><div class="sub">打開強化艙・選一個</div><div class="cards">${cards.map((c, i) => cardHTML(c, i)).join('')}</div>
        <div class="row"><button class="btn ghost small" id="rr" ${p.rerolls > 0 ? '' : 'disabled'}>重抽（剩 ${p.rerolls}）</button></div>`, null, 'lvup');
      $('#modal').querySelectorAll('canvas[data-c]').forEach(cv => { const c = cards[+cv.dataset.c]; const x = cv.getContext('2d'); x.scale(116 / 64, 116 / 64); if (c.w) drawWeaponIcon(x, c.w); else drawPassiveIcon(x, c.icon); });
      let picked = false;
      $('#modal').querySelectorAll('.card').forEach(b => b.onclick = () => { if (picked) return; picked = true; applyCard(cards[+b.dataset.i]); AU.play('ui2'); this.closeModal(); W.cacheQ--; });
      $('#rr').onclick = () => { if (p.rerolls <= 0) return; p.rerolls--; AU.play('ui'); cards.splice(0, cards.length, ...rollCards()); show(); };
    };
    show();
  },
  pause() {
    if (!W || this.modalOpen || W.state !== 'play') return;
    AU.play('ui');
    const p = W.P;
    const G0 = WEAPONS[p.gun], tag = (c, t) => `<span class="tag" style="border-color:${c};color:${c}">${t}</span>`;
    const build = tag(G0.col, `${G0.name} ${p.gunLv >= 5 ? '★' + G0.evo : 'Lv' + p.gunLv}・${p.ammo}${G0.unit}`) + ' ' + (p.tool ? tag(WEAPONS[p.tool].col, `${WEAPONS[p.tool].name} ×${p.toolUses}`) + ' ' : '') + tag('#ffffff', `震爆彈 ×${p.flashes}`) + ' ' + Object.keys(p.passives).map(k => tag('#5fe39a', `${PASSIVES[k].name} Lv${p.passives[k]}`)).join(' ');
    this.modal(`<h3>暫停</h3><div class="sub">${W.S.name}・${fmt(W.S.depth)} m・${Math.floor(W.t / 60)}:${String(Math.floor(W.t % 60)).padStart(2, '0')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">${build}</div>
      <div class="mapbox"><canvas id="bigmap" width="640" height="560"></canvas></div>
      <div class="legend"><span><i style="background:#ffffff;box-shadow:0 0 6px #7dffa8"></i>你</span><span><i style="background:#5fe7ff"></i>生還者</span><span><i style="background:#ffb03a"></i>關著的門</span><span><i style="background:#ff4f5e"></i>壞掉／上鎖</span><span><i style="background:#3c96ff"></i>進水</span><span><i style="background:#ebfff0;box-shadow:0 0 6px #7dffa8"></i>偵測到的移動</span><span>撤＝撤離塢　艙＝逃生艙</span></div>
      <p style="font-size:12px;color:var(--mute);line-height:1.7;margin:10px 0 0">提示：聆打不死，子彈只會告訴牠你在哪。關上的門會擋住一半的聲音；躲起來、牠經過時憋氣。標著「電」的艙可以設成陷阱。</p>
      <div class="row"><button class="btn ghost small" id="ps-set">設定</button><button class="btn ghost small" id="ps-quit">放棄這趟</button><button class="btn primary" data-close>繼續</button></div>`);
    this.bigMap = $('#bigmap').getContext('2d'); drawMinimap(this.bigMap, 640, 560, true);
    $('#ps-set').onclick = () => { this.settings(() => this.pause()); };
    $('#ps-quit').onclick = () => this.confirm('放棄這趟？', '這趟撈到的東西會全部留在海底。', '放棄', () => endRun('dead'));
  },
  settings(back) {
    const s = G.settings;
    this.modal(`<h3>設定</h3><div class="sub">SETTINGS</div>
      <div class="set"><span>配樂與環境音</span><input type="range" min="0" max="1" step=".05" value="${s.music}" id="st-mu"></div>
      <div class="set"><span>音效</span><input type="range" min="0" max="1" step=".05" value="${s.sfx}" id="st-sf"></div>
      <div class="set"><span>畫面震動</span><button class="tgl ${s.shake ? 'on' : ''}" id="st-sh"></button></div>
      <div class="set"><span>手機震動</span><button class="tgl ${s.vib ? 'on' : ''}" id="st-vb"></button></div>
      <div class="set"><span>傷害數字</span><button class="tgl ${s.nums ? 'on' : ''}" id="st-nm"></button></div>
      <div class="set"><span>站內廣播語音<small>手機有中文語音時才會念出來</small></span><button class="tgl ${s.voice ? 'on' : ''}" id="st-vo"></button></div>
      <div class="set"><span>頻閃與閃光<small>對閃光敏感的話請關閉</small></span><button class="tgl ${s.flash ? 'on' : ''}" id="st-fl"></button></div>
      <div class="set"><span>膠片顆粒</span><button class="tgl ${s.grain ? 'on' : ''}" id="st-gr"></button></div>
      <div class="set"><span>存檔碼（換裝置用）</span><button class="btn small ghost" id="st-ex">匯出／匯入</button></div>
      <p style="font-size:11.5px;color:var(--mute);line-height:1.7;margin-top:10px">操作：左半邊拖曳移動（梯子往上／下拖）、右下大鈕按住開火（躲起來時變成按住憋氣）、旁邊的腳印鈕切換潛行、橘色鈕是保命工具、情境按鈕開關艙門、躲進家具與其他互動、雷達鈕開關動態偵測器。鍵盤：WASD／方向鍵、空白鍵按住開火／憋氣、C 潛行、E 互動與躲藏、G 工具、Q 誘餌、R 醫療包、T 偵測器、V 通電、Esc 暫停。</p>
      <div class="row"><button class="btn primary small" data-close>完成</button></div>`, () => { saveGame(); back && back(); });
    $('#st-mu').oninput = e => { s.music = +e.target.value; AU.applyVol(); };
    $('#st-sf').oninput = e => { s.sfx = +e.target.value; AU.applyVol(); };
    const tg = (id, k) => { $(id).onclick = () => { s[k] = !s[k]; $(id).classList.toggle('on', s[k]); AU.play('ui'); }; };
    tg('#st-sh', 'shake'); tg('#st-vb', 'vib'); tg('#st-nm', 'nums'); tg('#st-vo', 'voice'); tg('#st-fl', 'flash'); tg('#st-gr', 'grain');
    $('#st-gr').addEventListener('click', () => setupGrain());
    $('#st-vo').addEventListener('click', () => { AU.voiceUnlock(); if (s.voice) AU.speak('站內廣播，測試。'); else AU.hush(); });
    $('#st-ex').onclick = () => this.saveCode(back);
  },
  saveCode(back) {
    const code = exportCode();
    this.modal(`<h3>存檔碼</h3><div class="sub">複製起來，到另一台裝置貼上</div><textarea id="sc-t" style="width:100%;height:110px;background:#020a0f;color:var(--text);border:1px solid var(--line);font-size:11px;padding:8px;font-family:monospace">${code}</textarea>
      <div class="row"><button class="btn ghost small" id="sc-cp">複製</button><button class="btn ghost small" id="sc-in">匯入貼上的存檔碼</button><button class="btn primary small" data-close>完成</button></div>`, () => back && back());
    $('#sc-cp').onclick = () => {
      const t = $('#sc-t'); t.select();
      const done = ok => this.toastTop(ok ? '已複製' : '已選取，長按即可複製');
      const legacy = () => { let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } done(ok); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(() => done(true), legacy); else legacy(); } catch (e) { legacy(); }
    };
    $('#sc-in').onclick = () => { if (importCode($('#sc-t').value)) { this.toastTop('匯入成功'); this.closeModal(); this.hub('dive'); } else { AU.play('deny'); this.toastTop('存檔碼不正確'); } };
  },
  toastTop(t) { const d = el('div', 'toast', t); d.style.cssText = 'position:absolute;left:50%;top:20px;transform:translateX(-50%);z-index:50'; $('#app').appendChild(d); setTimeout(() => d.remove(), 2400); },
  /* ---------- 結算 ---------- */
  results(sum) {
    $('#hud').classList.add('hidden'); AU.stopAmb();
    const titles = { dock: ['成功撤離', '潛艇浮上去了。你帶著東西，也帶著人。'], pod: ['逃生艙脫離', '你一個人上來了。'], dead: sum.caught ? ['被牠找到了', '最後傳回海燕號的，是一聲很近、很近的呼吸。這趟撈到的東西，都留在了海底。'] : [W && W.collapsed ? '站體崩潰' : '失聯', '海燕號收不到你的訊號。這趟撈到的東西，都留在了海底。'] };
    let [t, sub] = titles[sum.kind];
    if (sum.ok && sum.ending && ENDINGS[sum.ending]) { t = `結局 ${sum.ending}・${ENDINGS[sum.ending].name}`; sub = ENDINGS[sum.ending].sub; }
    AU.play(sum.ok ? 'star' : 'fail');
    const loot = sum.loot.slice().sort((a, b) => b.val - a.val).slice(0, 14);
    const mm = Math.floor(sum.time / 60), ss = String(Math.floor(sum.time % 60)).padStart(2, '0');
    let h = `<div class="res"><h3>${t}</h3><div class="sub">${sub}</div>`;
    h += `<div class="big num">${sum.ok ? '+' + fmt(sum.credits) : '0'}</div><div class="sub" style="margin-top:-8px">信用點</div>`;
    if (!sum.endless && sum.ok) h += `<div class="stars">${['成功撤離', '救出全員', '設局除掉聆'].map((n, k) => `<div class="${sum.stars[k] ? 'on' : ''}"><i></i>${n}</div>`).join('')}</div>`;
    h += `<div class="lines"><div><span>打撈物</span><b>${sum.loot.length} 件</b></div><div><span>擊倒</span><b>${sum.kills}</b></div><div><span>躲過聆</span><b>${sum.dodges} 次</b></div>${sum.escapes ? `<div><span>從牠手裡掙脫</span><b>${sum.escapes} 次</b></div>` : ''}<div><span>下潛時間</span><b>${mm}:${ss}</b></div></div>`;
    if (loot.length && sum.ok) h += `<div class="loot">${loot.map(l => `<span style="color:${RAR[l.rar].col}">${l.name}</span>`).join('')}</div>`;
    const news = [];
    for (const id of sum.rescued) news.push(`生還者「${SURV[id].name}」加入海燕號：${SURV[id].ptxt}`);
    for (const id of sum.bps) news.push(`${WEAPONS[id].kind === 'tool' ? '新工具' : '新武器'}解鎖：${WEAPONS[id].name}`);
    for (const id of sum.relics) news.push(`藏品：${RELICS.find(r => r.id === id).name}`);
    for (const n of sum.unlocked) news.push(`新區段開放：${n}`);
    if (sum.bounty) news.push(`集團懸賞 ${fmt(sum.bounty)} 信用點已入帳`);
    if (sum.newStars.length) news.push(`新達成目標 ×${sum.newStars.length}（已加進信用點）`);
    if (sum.logs.length) news.push(`取得錄音・日誌 ×${sum.logs.length}（在「檔案」可以重聽）`);
    if (sum.ok && W && W.S.final && !W.ending) news.push('林汐還在深艙。往最底層走，找到收容槽。');
    if (sum.ok && sum.ending) { const got = Object.keys(G.endings).filter(k => G.endings[k]).length; news.push(`已看過的結局 ${got}／3` + (sum.ending === 'B' && !G.endings.A ? '（救出全部十二位生還者，也許還有別的路）' : '')); }
    if (news.length) h += `<div class="new">${news.map(n => '◆ ' + n).join('<br>')}</div>`;
    if (sum.ok && !sum.endless && sum.firstClear && DEBRIEF[sum.si]) h += `<p class="serif" style="margin-top:12px;font-size:13.5px;line-height:1.8;color:#b7cbd2;border-left:2px solid var(--amber);padding-left:10px"><span style="color:var(--amber);font-size:11px;font-family:var(--sans)">老韓（無線電）</span><br>${DEBRIEF[sum.si].join('<br>')}</p>`;
    h += `<div class="row"><button class="btn ghost small" id="rs-again">${sum.endless && sum.ok ? '繼續往下' : '再潛一次'}</button><button class="btn primary" id="rs-hub">回到海燕號</button></div></div>`;
    this.modal(h);
    $('#rs-hub').onclick = () => { AU.play('ui'); this.closeModal(); W = null; fade(() => this.hub('dive')); };
    $('#rs-again').onclick = () => { AU.play('ui'); const si = sum.endless ? 5 : sum.si; this.closeModal(); W = null; this.loadout(si); };
  },
  /* ---------- 劇情 ---------- */
  story(lines, opts, done) {
    const st = $('#story'); st.classList.remove('hidden'); this.storyOn = true;
    let i = 0;
    const cv = makeCanvas(10, 10); cv.style.opacity = '.6';
    const finish = (choice) => { st.classList.add('hidden'); st.innerHTML = ''; this.storyOn = false; done && done(choice); };
    const show = () => {
      if (i >= lines.length) {
        if (opts.choice) {
          st.innerHTML = `<div class="txt"><div class="ln">你決定——</div></div><div class="choice"><button class="btn primary" id="ch-a">打開海閘，讓牠回家<small>林汐知道該怎麼做</small></button><button class="btn warn" id="ch-c">帶走 Y-01<small>集團懸賞 50,000 信用點</small></button></div>`;
          $('#ch-a').onclick = e => { e.stopPropagation(); AU.play('ui2'); W.endT = W.t; finish('A'); };
          $('#ch-c').onclick = e => { e.stopPropagation(); AU.play('ui2'); W.endT = W.t; finish('C'); };
          return;
        }
        if (opts.ending) { st.innerHTML = `<div class="txt"><div class="ln" style="font-size:30px;letter-spacing:.3em"><span class="sp">ENDING ${opts.ending}</span>${ENDINGS[opts.ending].name}</div></div><div class="tap">輕觸繼續</div>`; st.onclick = () => { st.onclick = null; finish(); }; opts.ending = null; AU.play('motif', { vol: 1 }); return; }
        st.onclick = null; finish(); return;
      }
      const L = lines[i];
      st.innerHTML = `<div class="txt"><div class="ln">${L.sp ? `<span class="sp">${L.sp}</span>` : ''}${L.t.replace(/\n/g, '<br>')}</div></div><div class="tap">輕觸繼續</div>${opts.choice || opts.ending ? '' : '<button class="skip" id="st-skip">略過</button>'}`;
      const sk = $('#st-skip'); if (sk) sk.onclick = e => { e.stopPropagation(); AU.play('ui'); i = lines.length; show(); };
      AU.play('ui');
    };
    st.onclick = () => { i++; show(); };
    show();
  },
};
function fade(fn) { const f = $('#fade'); f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 460); }
function makePlayerPreview() { let hp = 100 + metaLv('hp') * 14 + relicBonus('hp'); if (survPerk('maxhp')) hp *= 1.1; return { hp: Math.round(hp) }; }

/* ---------- 強化艙的卡 ---------- */
function rollCards() {
  const p = W.P, pool = [];
  if (p.gunLv < 5) pool.push({ kind: 'gup', w: p.gun, lv: p.gunLv + 1, wt: p.gunLv + 1 === 5 ? 3 : 2.4 });
  const pk = Object.keys(p.passives);
  for (const id of pk) if (p.passives[id] < PASSIVES[id].max) pool.push({ kind: 'pup', p: id, lv: p.passives[id] + 1, wt: 2, icon: PASSIVES[id].icon });
  if (pk.length < 4) for (const id in PASSIVES) if (!p.passives[id]) pool.push({ kind: 'pnew', p: id, lv: 1, wt: id === 'lungs' || id === 'calm' || id === 'quiet' ? 2 : 1.3, icon: PASSIVES[id].icon });
  if (p.tool) pool.push({ kind: 'tplus', w: p.tool, wt: p.toolUses <= 1 ? 2.6 : 1.4 });
  pool.push({ kind: 'flash', icon: 'flash', wt: p.flashes ? .9 : 2 });
  pool.push({ kind: 'ammo', w: p.gun, wt: p.ammo < 8 ? 2.4 : .9 });
  const out = [];
  const rng = RNG((Math.random() * 1e9) | 0);
  while (out.length < 3 && pool.length) { const c = rng.weighted(pool, q => q.wt); out.push(c); pool.splice(pool.indexOf(c), 1); }
  if (out.length < 3) out.push({ kind: 'heal', icon: 'heal' });
  if (out.length < 3) out.push({ kind: 'cash', icon: 'credits' });
  return out;
}
function cardHTML(c, i) {
  let k = '', name = '', lv = '', desc = '', col = RAR[2].col, nz = '', gold = false;
  if (c.kind === 'gup') { const W0 = WEAPONS[c.w]; name = W0.name; desc = W0.lv[c.lv - 1]; k = c.lv === 5 ? '進化' : '武器強化'; lv = `Lv${c.lv - 1}→${c.lv}`; gold = c.lv === 5; col = gold ? RAR[4].col : RAR[2].col; }
  else if (c.kind === 'pnew' || c.kind === 'pup') { const P0 = PASSIVES[c.p]; name = P0.name; desc = P0.lv[c.lv - 1]; k = c.kind === 'pnew' ? '新裝備' : '裝備強化'; col = RAR[1].col; if (c.kind === 'pup') lv = `Lv${c.lv - 1}→${c.lv}`; }
  else if (c.kind === 'tplus') { name = WEAPONS[c.w].name; desc = '次數 +2'; k = '保命工具'; col = WEAPONS[c.w].col; }
  else if (c.kind === 'flash') { name = '震爆彈'; desc = '被牠抓住時自動用掉：炸牠的耳朵，掙脫一次'; k = '保命'; col = '#ffffff'; gold = true; }
  else if (c.kind === 'ammo') { const W0 = WEAPONS[c.w]; name = `${W0.name}彈藥`; desc = `+${ammoGain() * 2} ${W0.unit}`; k = '補給'; col = W0.col; }
  else if (c.kind === 'heal') { name = '急救'; desc = '回復 40% 生命'; k = '補給'; col = RAR[1].col; }
  else { name = '打撈加給'; desc = '打撈袋價值 +80'; k = '補給'; col = RAR[4].col; }
  return `<button class="card ${gold ? 'gold' : ''}" data-i="${i}" style="--c:${col}"><canvas data-c="${i}" width="116" height="116"></canvas><div class="tx"><div class="k">${k}</div><b>${name}<em>${lv}</em></b><p>${desc}</p>${nz}</div></button>`;
}
function applyCard(c) {
  const p = W.P;
  if (c.kind === 'gup') { p.gunLv = c.lv; if (c.lv === 5) banner('進化', WEAPONS[c.w].evo, 'gd'); }
  else if (c.kind === 'pnew' || c.kind === 'pup') { p.passives[c.p] = c.lv; p.dirty = true; if (c.p === 'hull') { const st0 = p.hpMax; const base = makePlayerPreview().hp; p.hpMax = Math.round(base * (1 + .2 * p.passives.hull)); p.hp += p.hpMax - st0; } }
  else if (c.kind === 'tplus') p.toolUses += 2;
  else if (c.kind === 'flash') p.flashes++;
  else if (c.kind === 'ammo') p.ammo += ammoGain() * 2;
  else if (c.kind === 'heal') p.hp = Math.min(p.hpMax, p.hp + p.hpMax * .4);
  else { W.bagVal += 80; W.bag.push({ name: '打撈加給', rar: 4, val: 80 }); }
}
