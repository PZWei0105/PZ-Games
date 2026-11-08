/* ============ 10 介面 ============ */
const SVG = {
  pause: '<svg viewBox="0 0 24 24" fill="#cfeff7"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  fire: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="2.5" fill="currentColor"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7"/></svg>',
  quiet: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M10 12a6 6 0 0 1 12 0c0 4-3 5-4 8s-1 6-4 6"/><path d="M14 12a2 2 0 0 1 4 0"/><path d="M4 4l24 24"/></svg>',
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
    sc.innerHTML = `<div id="title"><div class="logo"><h1>深艙</h1><div class="en">UNDERTOW</div><div class="tg">牠看不見你　牠聽得見你</div></div>
      <div class="acts"><button class="btn primary" id="t-go">開始下潛</button><button class="btn ghost" id="t-set">設定</button></div>
      <div class="foot">${VERSION}・建議戴耳機</div></div>`;
    $('#t-go').onclick = () => { AU.init(); AU.play('ui2'); if (!G.seenPrologue) { this.story(PROLOGUE, {}, () => { G.seenPrologue = true; saveGame(); this.hub('dive'); }); } else this.hub('dive'); };
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
    h += `<div class="sec-h" style="margin-top:18px"><h2>武器</h2><span>撈到藍圖就能帶下去</span></div><div class="wgrid">`;
    for (const id of WEAPON_ORDER) {
      const W0 = WEAPONS[id], has = G.weapons.includes(id);
      h += `<div class="wcard ${has ? '' : 'lock'}"><canvas data-wi="${id}" width="112" height="112"></canvas><b>${has ? W0.name : '？？？'}</b><p>${has ? W0.desc : '藍圖未取得'}</p>${has ? `<div class="nz ${NZ[W0.nz].c}">聲音：${NZ[W0.nz].t}</div>` : ''}</div>`;
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
    this.modal(`<div class="sub" style="color:${L.kind === 'voice' ? 'var(--cyan)' : 'var(--amber)'}">${L.who}</div><p class="serif" style="font-size:16px;line-height:2;letter-spacing:.04em">${L.text}</p><div class="row"><button class="btn small" data-close>關閉</button></div>`, () => { if (S.mode === 'hub') this.hub('files'); });
  },
  loadout(si) {
    const ws = WEAPON_ORDER.filter(id => G.weapons.includes(id));
    let sel = G.weapons.includes(G.lastWeapon) ? G.lastWeapon : ws[0];
    const S0 = si < 5 ? SECTORS[si] : sectorCfg(5, G.endless.best + 1);
    const draw = () => {
      this.modal(`<h3>${S0.name}</h3><div class="sub">水深 ${fmt(S0.depth)} m・選一把主武器帶下去</div>
        <div class="cards">${ws.map(id => `<button class="card ${id === sel ? 'gold' : ''}" data-w="${id}" style="--c:${WEAPONS[id].col}"><canvas data-wi="${id}" width="116" height="116"></canvas><div class="tx"><div class="k">${id === sel ? '已選擇' : '武器'}</div><b>${WEAPONS[id].name}</b><p>${WEAPONS[id].desc}</p><span class="nz ${NZ[WEAPONS[id].nz].c}">聲音：${NZ[WEAPONS[id].nz].t}</span></div></button>`).join('')}</div>
        <p style="font-size:12px;color:var(--mute);line-height:1.6;margin:12px 2px 0">生命 ${makePlayerPreview().hp}・醫療包 ${metaLv('med')}・誘餌 ${1 + metaLv('decoy')}・重抽 ${1 + metaLv('reroll') + (survPerk('reroll') ? 1 : 0)}</p>
        <div class="row"><button class="btn ghost small" data-close>返回</button><button class="btn primary" id="go">下潛</button></div>`);
      $('#modal').querySelectorAll('[data-wi]').forEach(c => { const x = c.getContext('2d'); x.scale(116 / 64, 116 / 64); drawWeaponIcon(x, c.dataset.wi); });
      $('#modal').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { sel = b.dataset.w; AU.play('ui'); draw(); });
      $('#go').onclick = () => { AU.play('ui2'); G.lastWeapon = sel; saveGame(); this.closeModal(); this.startDive(si); };
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
    });
  },
  /* ---------- 遊戲中 HUD ---------- */
  initHud() {
    $('#hud').classList.remove('hidden');
    $('#btn-pause').innerHTML = SVG.pause;
    $('#btn-med').innerHTML = SVG.med + '<b></b><i class="cd"></i>';
    $('#btn-decoy').innerHTML = SVG.decoy + '<b></b><i class="cd"></i>';
    $('#hud-sector .nm').textContent = W.S.name + (W.S.endless ? ` 第 ${W.tier} 層` : '');
    $('#hud-sector .dp').textContent = fmt(W.S.depth) + ' M';
    $('#bossbar').classList.add('hidden'); $('#dockbar').classList.add('hidden');
    $('#subtitle').innerHTML = ''; $('#toasts').innerHTML = ''; $('#banner').innerHTML = '';
    this.subQ = []; this.subCur = null; this.wslots = null; this.stance(); this.hudT = 0;
    $('#joyhint').classList.toggle('hidden', G.stats.dives > 1);
  },
  stance() {
    const b = $('#btn-stance'), q = W && W.P.stealth;
    b.className = q ? 'quiet' : '';
    b.innerHTML = (q ? SVG.quiet + '潛行' : SVG.fire + '開火');
  },
  updateHud(dt) {
    if (!W) return;
    this.tickSubs(dt);
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = .07;
    const p = W.P;
    // 生命／氧氣／經驗
    $('#hud-hp .hp i').style.width = (clamp(p.hp / p.hpMax, 0, 1) * 100) + '%';
    const lag = $('#hud-hp .hp s'); const lw = parseFloat(lag.style.width || '100'); const nw = clamp(p.hp / p.hpMax, 0, 1) * 100; lag.style.width = (lw > nw ? Math.max(nw, lw - 2) : nw) + '%';
    $('#hud-hp .hpv').textContent = Math.max(0, Math.ceil(p.hp));
    $('#hud-hp .o2row').classList.toggle('hidden', p.o2 > .99);
    $('#hud-hp .o2 i').style.width = (p.o2 * 100) + '%';
    $('#hud-hp .xp i').style.width = (p.xp / p.xpNeed * 100) + '%';
    $('#hud-hp .lvl b').textContent = p.lvl; $('#hud-hp .bat b').textContent = p.batteries;
    $('#hud-hp .key').classList.toggle('hidden', !W.key);
    $('#btn-med b').textContent = p.med; $('#btn-med').classList.toggle('empty', p.med <= 0); $('#btn-med .cd').style.setProperty('--p', (p.medT / 1.2 * 100) + '%');
    $('#btn-decoy b').textContent = p.decoys; $('#btn-decoy').classList.toggle('empty', p.decoys <= 0); $('#btn-decoy .cd').style.setProperty('--p', (p.decoyT * 100) + '%');
    // 打撈袋
    const bagH = `◆ ${fmt(W.bagVal)}${W.bagWt > 5 ? `<em>負重・腳步聲 +${Math.round(Math.min(.6, W.bagWt * .02) * 100)}%</em>` : ''}`;
    if (this.bagH !== bagH) { this.bagH = bagH; $('#hud-sector .bag').innerHTML = bagH; }
    // 深壓
    const pr = W.pressure, stg = STAGES[W.stage];
    $('#pring').style.strokeDashoffset = 157 * (1 - pr / 100); $('#pring').style.stroke = stg.col;
    const pv = $('#hud-pressure .pv'), pvt = Math.floor(pr) + '%'; if (pv.textContent !== pvt) { pv.textContent = pvt; pv.style.fontSize = pr >= 100 ? '14px' : ''; }
    const ps = $('#hud-pressure .ps'); ps.textContent = stg.name; ps.style.color = stg.col;
    // 心率
    $('#hud-heart').innerHTML = `${SVG.heart}<span style="color:${W.heart > 120 ? '#ff4f5e' : W.heart > 95 ? '#ffb03a' : '#dbecf1'}">${Math.round(W.heart)}</span><small>BPM</small>`;
    // 波次／撤離倒數
    const wv = $('#hud-wave');
    if (W.dock.called && !W.dock.arrived) wv.innerHTML = '';
    else if (W.stage >= 4) { wv.className = 'hot'; wv.innerHTML = `崩潰倒數<b>${Math.max(0, Math.ceil(W.collapseT))}</b>`; }
    else if (W.ending) wv.innerHTML = '';
    else if (W.warns.length) { wv.className = 'hot'; wv.innerHTML = `破口警報<b>${Math.max(0, Math.ceil(W.waveT))}</b>`; }
    else { wv.className = ''; wv.innerHTML = `下一波<b>${Math.max(0, Math.ceil(W.waveT))}</b>`; }
    const db = $('#dockbar');
    if (W.dock.called && !W.dock.arrived) { db.classList.remove('hidden'); db.innerHTML = `潛艇抵達<b>${Math.max(0, Math.ceil(W.dock.t))}</b>`; }
    else if (W.dock.arrived) { db.classList.remove('hidden'); db.innerHTML = '潛艇到了<b style="font-size:20px">走到月池登艇</b>'; }
    else db.classList.add('hidden');
    // 目標
    const o = W.obj;
    $('#hud-obj').innerHTML = `<div class="obj ${W.dock.arrived ? 'done' : ''}">◆ 撤離</div><div class="obj ${o.survivors && o.rescued >= o.survivors ? 'done' : ''}">◆ 生還者 <b>${o.rescued}/${o.survivors}</b></div><div class="obj ${o.hunter ? 'done' : ''}">◆ ${o.hunterKill ? '聆 已擊殺' : o.hunter ? '聆 已擊退' : '擊退聆'}</div>`;
    // 武器欄
    const key = p.weapons.map(w => w.id + w.lv).join();
    if (this.wslots !== key) {
      this.wslots = key;
      const box = $('#hud-weapons'); box.innerHTML = '';
      for (const w of p.weapons) { const d = el('div', 'wslot' + (w.lv >= 5 ? ' evo' : '')); d.appendChild(iconCanvas(88, x => drawWeaponIcon(x, w.id))); d.appendChild(el('span', 'lv', w.lv >= 5 ? '★' : 'Lv' + w.lv)); box.appendChild(d); }
    }
    // 獵手血條
    const h = W.hunter, m = W.mother, bb = $('#bossbar');
    const showH = (onMap(h) && (h.state === 'hunt' || h.state === 'attack' || h.state === 'stun' || h.engage > 0 || Math.hypot(h.x - p.x, h.y - p.y) < 650)) || (h && h.dead && h.deadT < 2);
    if (m && !m.dead && m.state !== 'lured') { bb.classList.remove('hidden'); bb.querySelector('.nm').innerHTML = '母聆'; bb.querySelector('i').style.width = (m.hp / m.hpMax * 100) + '%'; bb.querySelector('b').style.display = 'none'; }
    else if (showH) {
      bb.classList.remove('hidden');
      const stt = { search: '搜索', hunt: '追獵', attack: '攻擊', stun: '麻痺', charge: '充能尖嘯', leave: '離開', flee: '逃走', drop: '出現', dead: '倒下' }[h.state] || '';
      bb.querySelector('.nm').innerHTML = `聆<em>${h.enraged ? '激怒・' : ''}${stt}</em>`;
      bb.querySelector('i').style.width = (Math.max(0, h.hp) / h.hpMax * 100) + '%';
      const left = h.hpMax * .25 - h.engage, mk = (h.hp - left) / h.hpMax * 100;
      const b = bb.querySelector('b'); b.style.display = h.dead || h.enraged || mk <= 0 ? 'none' : 'block'; b.style.left = mk + '%';
    } else bb.classList.add('hidden');
    // 情境按鈕
    const its = W.state === 'play' ? interactables() : [];
    const cb = $('#btn-ctx'), it = its[0];
    if (p.channel) { cb.classList.remove('hidden'); cb.className = ''; cb.querySelector('span').textContent = p.channel.it.label + '…'; cb.querySelector('i').style.width = (p.channel.t / p.channel.it.dur * 100) + '%'; }
    else if (it) { cb.classList.remove('hidden'); cb.className = it.off ? 'off' : it.warn ? 'warn' : ''; cb.querySelector('span').textContent = it.label; cb.querySelector('i').style.width = '0'; }
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
    const d = el('div', 'sb ' + (s.kind === 'radio' ? 'radio' : s.kind === 'voice' ? 'voice' : ''), (s.who ? `<span class="who">${s.who}</span>` : '') + s.text);
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
  /* ---------- 升級三選一 ---------- */
  levelUp(cache) {
    const p = W.P;
    AU.play('levelup');
    const cards = rollCards(cache);
    const show = () => {
      this.modal(`<h3>${cache ? '強化艙' : '升級'}</h3><div class="sub">${cache ? '打開強化艙・選一個' : `Lv ${p.lvl}・選一個`}</div><div class="cards">${cards.map((c, i) => cardHTML(c, i)).join('')}</div>
        <div class="row"><button class="btn ghost small" id="rr" ${p.rerolls > 0 ? '' : 'disabled'}>重抽（剩 ${p.rerolls}）</button></div>`, null, 'lvup');
      $('#modal').querySelectorAll('canvas[data-c]').forEach(cv => { const c = cards[+cv.dataset.c]; const x = cv.getContext('2d'); x.scale(116 / 64, 116 / 64); if (c.w) drawWeaponIcon(x, c.w); else drawPassiveIcon(x, c.icon); });
      let picked = false;
      $('#modal').querySelectorAll('.card').forEach(b => b.onclick = () => { if (picked) return; picked = true; applyCard(cards[+b.dataset.i]); AU.play('ui2'); this.closeModal(); if (cache) W.cacheQ--; else W.lvQ--; });
      $('#rr').onclick = () => { if (p.rerolls <= 0) return; p.rerolls--; AU.play('ui'); cards.splice(0, cards.length, ...rollCards(cache)); show(); };
    };
    show();
  },
  pause() {
    if (!W || this.modalOpen || W.state !== 'play') return;
    AU.play('ui');
    const p = W.P;
    const build = p.weapons.map(w => `<span class="tag" style="border-color:${WEAPONS[w.id].col};color:${WEAPONS[w.id].col}">${WEAPONS[w.id].name} ${w.lv >= 5 ? '★' + WEAPONS[w.id].evo : 'Lv' + w.lv}</span>`).join(' ') + ' ' + Object.keys(p.passives).map(k => `<span class="tag" style="border-color:#5fe39a;color:#5fe39a">${PASSIVES[k].name} Lv${p.passives[k]}</span>`).join(' ');
    this.modal(`<h3>暫停</h3><div class="sub">${W.S.name}・${fmt(W.S.depth)} m・${Math.floor(W.t / 60)}:${String(Math.floor(W.t % 60)).padStart(2, '0')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">${build}</div>
      <div class="mapbox"><canvas id="bigmap" width="640" height="560"></canvas></div>
      <div class="legend"><span><i style="background:#e9fdff"></i>你</span><span><i style="background:#5fe39a"></i>生還者</span><span><i style="background:#ffb03a"></i>關著的門</span><span><i style="background:#ff4f5e"></i>壞掉／上鎖</span><span><i style="background:#3c96ff"></i>進水</span><span>撤＝撤離塢　艙＝逃生艙</span></div>
      <p style="font-size:12px;color:var(--mute);line-height:1.7;margin:10px 0 0">提示：關上的門會擋住一半的聲音。聆只會去「最後聽到聲音的地方」。</p>
      <div class="row"><button class="btn ghost small" id="ps-set">設定</button><button class="btn ghost small" id="ps-quit">放棄這趟</button><button class="btn primary" data-close>繼續</button></div>`);
    drawMinimap($('#bigmap').getContext('2d'), 640, 560, true);
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
      <div class="set"><span>存檔碼（換裝置用）</span><button class="btn small ghost" id="st-ex">匯出／匯入</button></div>
      <p style="font-size:11.5px;color:var(--mute);line-height:1.7;margin-top:10px">操作：左半邊拖曳移動（梯子往上／下拖）、右下大鈕切換開火／潛行、情境按鈕開關艙門與互動。鍵盤：WASD／方向鍵、空白鍵切換、E 互動、Q 誘餌、R 醫療包、Esc 暫停。</p>
      <div class="row"><button class="btn primary small" data-close>完成</button></div>`, () => { saveGame(); back && back(); });
    $('#st-mu').oninput = e => { s.music = +e.target.value; AU.applyVol(); };
    $('#st-sf').oninput = e => { s.sfx = +e.target.value; AU.applyVol(); };
    const tg = (id, k) => { $(id).onclick = () => { s[k] = !s[k]; $(id).classList.toggle('on', s[k]); AU.play('ui'); }; };
    tg('#st-sh', 'shake'); tg('#st-vb', 'vib'); tg('#st-nm', 'nums');
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
    const titles = { dock: ['成功撤離', '潛艇浮上去了。你帶著東西，也帶著人。'], pod: ['逃生艙脫離', '你一個人上來了。'], dead: [W && W.collapsed ? '站體崩潰' : '失聯', '海燕號收不到你的訊號。這趟撈到的東西，都留在了海底。'] };
    let [t, sub] = titles[sum.kind];
    if (sum.ok && sum.ending && ENDINGS[sum.ending]) { t = `結局 ${sum.ending}・${ENDINGS[sum.ending].name}`; sub = ENDINGS[sum.ending].sub; }
    AU.play(sum.ok ? 'star' : 'fail');
    const loot = sum.loot.slice().sort((a, b) => b.val - a.val).slice(0, 14);
    const mm = Math.floor(sum.time / 60), ss = String(Math.floor(sum.time % 60)).padStart(2, '0');
    let h = `<div class="res"><h3>${t}</h3><div class="sub">${sub}</div>`;
    h += `<div class="big num">${sum.ok ? '+' + fmt(sum.credits) : '0'}</div><div class="sub" style="margin-top:-8px">信用點</div>`;
    if (!sum.endless && sum.ok) h += `<div class="stars">${['成功撤離', '救出全員', '擊退聆'].map((n, k) => `<div class="${sum.stars[k] ? 'on' : ''}"><i></i>${n}</div>`).join('')}</div>`;
    h += `<div class="lines"><div><span>打撈物</span><b>${sum.loot.length} 件</b></div><div><span>擊殺</span><b>${sum.kills}</b></div><div><span>等級</span><b>Lv ${sum.lvl}</b></div><div><span>下潛時間</span><b>${mm}:${ss}</b></div></div>`;
    if (loot.length && sum.ok) h += `<div class="loot">${loot.map(l => `<span style="color:${RAR[l.rar].col}">${l.name}</span>`).join('')}</div>`;
    const news = [];
    for (const id of sum.rescued) news.push(`生還者「${SURV[id].name}」加入海燕號：${SURV[id].ptxt}`);
    for (const id of sum.bps) news.push(`新武器解鎖：${WEAPONS[id].name}`);
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

/* ---------- 升級卡 ---------- */
function rollCards(cache) {
  const p = W.P, pool = [];
  const unlocked = WEAPON_ORDER.filter(id => G.weapons.includes(id));
  for (const w of p.weapons) if (w.lv < 5) pool.push({ kind: 'wup', w: w.id, lv: w.lv + 1, wt: w.lv + 1 === 5 ? 3.5 : 3 });
  if (p.weapons.length < 4) for (const id of unlocked) if (!p.weapons.some(w => w.id === id)) pool.push({ kind: 'wnew', w: id, lv: 1, wt: cache ? 3.5 : 2.2 });
  const pk = Object.keys(p.passives);
  for (const id of pk) if (p.passives[id] < PASSIVES[id].max) pool.push({ kind: 'pup', p: id, lv: p.passives[id] + 1, wt: 2, icon: PASSIVES[id].icon });
  if (pk.length < 4) for (const id in PASSIVES) if (!p.passives[id]) pool.push({ kind: 'pnew', p: id, lv: 1, wt: 1.6, icon: PASSIVES[id].icon });
  const out = [];
  const rng = RNG((Math.random() * 1e9) | 0);
  while (out.length < 3 && pool.length) { const c = rng.weighted(pool, q => q.wt); out.push(c); pool.splice(pool.indexOf(c), 1); }
  if (out.length < 3) out.push({ kind: 'heal', icon: 'heal' });
  if (out.length < 3) out.push({ kind: 'cash', icon: 'credits' });
  return out;
}
function cardHTML(c, i) {
  let k = '', name = '', lv = '', desc = '', col = RAR[2].col, nz = '', gold = false;
  if (c.kind === 'wnew' || c.kind === 'wup') {
    const W0 = WEAPONS[c.w];
    name = W0.name; desc = W0.lv[c.lv - 1];
    if (c.kind === 'wnew') { k = '新武器'; col = RAR[3].col; nz = `<span class="nz ${NZ[W0.nz].c}">聲音：${NZ[W0.nz].t}</span>`; }
    else { k = c.lv === 5 ? '進化' : '武器強化'; lv = `Lv${c.lv - 1}→${c.lv}`; gold = c.lv === 5; col = gold ? RAR[4].col : RAR[2].col; }
  } else if (c.kind === 'pnew' || c.kind === 'pup') {
    const P0 = PASSIVES[c.p]; name = P0.name; desc = P0.lv[c.lv - 1]; k = c.kind === 'pnew' ? '新裝備' : '裝備強化'; col = RAR[1].col; if (c.kind === 'pup') lv = `Lv${c.lv - 1}→${c.lv}`;
  } else if (c.kind === 'heal') { name = '急救'; desc = '回復 40% 生命'; k = '補給'; col = RAR[1].col; }
  else { name = '打撈加給'; desc = '打撈袋價值 +80'; k = '補給'; col = RAR[4].col; }
  return `<button class="card ${gold ? 'gold' : ''}" data-i="${i}" style="--c:${col}"><canvas data-c="${i}" width="116" height="116"></canvas><div class="tx"><div class="k">${k}</div><b>${name}<em>${lv}</em></b><p>${desc}</p>${nz}</div></button>`;
}
function applyCard(c) {
  const p = W.P;
  if (c.kind === 'wnew') { p.weapons.push(newWeapon(c.w)); if (c.w !== 'drone' && c.w !== 'cryo' && c.w !== 'sonic') p.gun = c.w; }
  else if (c.kind === 'wup') { const w = p.weapons.find(q => q.id === c.w); w.lv = c.lv; if (c.lv === 5) banner('進化', WEAPONS[c.w].evo, 'gd'); }
  else if (c.kind === 'pnew' || c.kind === 'pup') { p.passives[c.p] = c.lv; p.dirty = true; if (c.p === 'hull') { const st0 = p.hpMax; const base = makePlayerPreview().hp; p.hpMax = Math.round(base * (1 + .2 * p.passives.hull)); p.hp += p.hpMax - st0; } }
  else if (c.kind === 'heal') p.hp = Math.min(p.hpMax, p.hp + p.hpMax * .4);
  else { W.bagVal += 80; W.bag.push({ name: '打撈加給', rar: 4, val: 80 }); }
}
