/* ---------- HUD ---------- */
const HUD = {
  c: {},
  reset() {
    this.c = {}; $('bossbar').hidden = true; $('combo').hidden = true; Radio.q.length = 0; Radio.cur = null; $('radio').hidden = true; Banner.q.length = 0; Banner.cur = null; $('banner').hidden = true;
    $('danmaku').innerHTML = ''; $('fxLow').classList.remove('on'); $('hint').hidden = true;
  },
  show(v) { $('hud').hidden = !v; if (!v) { $('danmaku').innerHTML = ''; $('fxLow').classList.remove('on'); } },
  txt(id, v) { if (this.c[id] === v) return; this.c[id] = v; $(id).textContent = v; },
  wid(id, f) { const v = Math.round(clamp(f, 0, 1) * 1000) / 10, k = id + '%'; if (this.c[k] === v) return; this.c[k] = v; $(id).style.width = v + '%'; },
  buildSlots() {
    if (!G) return;
    const box = $('slots'); box.innerHTML = '';
    G.p.guns.forEach((gs, i) => {
      const b = document.createElement('button'); b.className = 'slot'; b.type = 'button'; b.setAttribute('aria-label', GUNS[gs.id].name);
      b.innerHTML = `<img alt="" src="${iconURL(GUNS[gs.id].icon)}"><span class="am"></span><i class="rl"></i><kbd>${i + 1}</kbd>`;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); switchGun(i); });
      box.appendChild(b);
    });
    this.c.slots = null; this.syncSlots(true);
  },
  syncSlots(force) {
    const p = G.p, kids = $('slots').children;
    for (let i = 0; i < p.guns.length && i < kids.length; i++) {
      const gs = p.guns[i], el = kids[i];
      const s = gs.mag + '/' + (gs.res === Infinity ? '∞' : gs.res);
      const key = 's' + i;
      if (force || this.c[key] !== s) { this.c[key] = s; el.querySelector('.am').textContent = s; }
      const act = i === p.gi, ak = 'a' + i;
      if (force || this.c[ak] !== act) { this.c[ak] = act; el.classList.toggle('on', act); }
      const rl = act && p.reload > 0 ? (1 - p.reload / p.reloadMax) : 0, rk = 'r' + i, rv = Math.round(rl * 20) / 20;
      if (force || this.c[rk] !== rv) { this.c[rk] = rv; el.style.setProperty('--rl', rv); el.classList.toggle('rel', rv > 0); }
      const empty = gs.mag <= 0 && gs.res <= 0, ek = 'e' + i;
      if (force || this.c[ek] !== empty) { this.c[ek] = empty; el.classList.toggle('empty', empty); }
    }
  },
  sync(dt) {
    const g = G, p = g.p;
    this.txt('hpTxt', Math.ceil(p.hp) + '/' + p.mhp);
    this.wid('hpFill', p.hp / p.mhp);
    this.wid('xpFill', p.xp / p.xpNext);
    this.txt('hudLv', 'LV ' + p.level);
    this.txt('killN', String(g.kills));
    this.txt('objTxt', g.obj.text || ''); this.txt('objSub', g.obj.sub || '');
    const hasP = g.obj.prog !== null && g.obj.prog !== undefined;
    if (this.c.hasP !== hasP) { this.c.hasP = hasP; $('obj').classList.toggle('noprog', !hasP); }
    if (hasP) this.wid('objFill', g.obj.prog);
    if (g.combo >= 5) { if ($('combo').hidden) $('combo').hidden = false; this.txt('comboN', String(g.combo)); this.wid('comboBar', g.comboT / 3.2); }
    else if (!$('combo').hidden) $('combo').hidden = true;
    if (g.boss) this.wid('bossFill', g.boss.hp / g.boss.mhp);
    this.txt('moloN', String(p.molo));
    const cd = p.rollCd > 0 ? Math.round(p.rollCd / (2.2 * Math.max(0.35, p.st.dodgeCd)) * 20) / 20 : 0;
    if (this.c.cd !== cd) { this.c.cd = cd; const b = $('btnDodge'); b.style.setProperty('--cd', cd); b.classList.toggle('cool', cd > 0); }
    const mz = p.molo <= 0; if (this.c.mz !== mz) { this.c.mz = mz; $('btnMolo').classList.toggle('cool', mz); }
    this.syncSlots();
    const low = p.hp < p.mhp * 0.3 && g.state === 'play';
    if (this.c.low !== low) { this.c.low = low; $('fxLow').classList.toggle('on', low); }
    Radio.tick(dt); Banner.tick(dt); Danmaku.tick(dt);
  },
  hurt(soft) { const e = $('fxHurt'); e.classList.remove('on', 'soft'); void e.offsetWidth; e.classList.add('on'); if (soft) e.classList.add('soft'); },
  bossShow(name) { $('bossName').textContent = name; $('bossbar').hidden = false; this.c['bossFill%'] = null; this.wid('bossFill', 1); },
  bossHide() { $('bossbar').hidden = true; }
};
const Radio = {
  q: [], cur: null, t: 0,
  say(who, text) { this.q.push({ who, text }); if (this.q.length > 3) this.q.shift(); },
  tick(dt) {
    if (this.cur) { this.t -= dt; if (this.t <= 0) { this.cur = null; $('radio').hidden = true; } }
    if (!this.cur && this.q.length) {
      const m = this.q.shift(); this.cur = m; this.t = Math.max(2.8, m.text.length * 0.11);
      const sp = SPEAKERS[m.who] || SPEAKERS.n;
      $('radioFace').src = portraitURL(sp.face); $('radioName').textContent = sp.name; $('radioName').style.color = sp.col; $('radioTxt').textContent = m.text;
      const r = $('radio'); r.hidden = false; r.classList.remove('in'); void r.offsetWidth; r.classList.add('in');
    }
  }
};
function say(who, text) { Radio.say(who, text); }
const Banner = {
  q: [], cur: null, t: 0,
  push(title, sub, cls) { if (this.q.length > 2) this.q.shift(); this.q.push({ title, sub, cls }); },
  tick(dt) {
    if (this.cur) { this.t -= dt; if (this.t <= 0) { this.cur = null; $('banner').hidden = true; } }
    if (!this.cur && this.q.length) {
      const b = this.cur = this.q.shift(); this.t = b.cls === 'boss' ? 3 : 2.1;
      $('bannerT').textContent = b.title; $('bannerS').textContent = b.sub || '';
      const el = $('banner'); el.className = 'banner ' + (b.cls || ''); el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    }
  }
};
function banner(t, s, c) { Banner.push(t, s, c); }
const Danmaku = {
  t: 0, recent: [],
  push(text, cls) {
    const box = $('danmaku'); if (box.childElementCount > 16) return;
    let lane = (Math.random() * 7) | 0;
    for (let k = 0; k < 6 && this.recent.includes(lane); k++) lane = (Math.random() * 7) | 0;
    this.recent.push(lane); if (this.recent.length > 3) this.recent.shift();
    const el = document.createElement('span'); el.className = 'dm ' + (cls || ''); el.textContent = text;
    el.style.top = (lane * 14) + '%'; el.style.animationDuration = rand(6.5, 9.5).toFixed(1) + 's';
    el.addEventListener('animationend', () => el.remove());
    box.appendChild(el);
  },
  tick(dt) {
    if (!G || !G.dm || G.state !== 'play') return;
    this.t -= dt;
    if (this.t <= 0) { const s = G.dm(); if (s) this.push(s[0], s[1]); this.t = rand(0.7, 1.7) / (0.55 + (G.hype || 0)); }
  }
};
const Toast = {
  tm: null,
  show(text) { const el = $('toast'); el.textContent = text; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(this.tm); this.tm = setTimeout(() => { el.hidden = true; }, 2600); }
};
function showHint() {
  const el = $('hint');
  el.innerHTML = IS_TOUCH
    ? '<b>操作</b><span>手指按住畫面任一處拖曳＝移動</span><span>靠近屍體會自動開槍、揮棒</span><span>右下：翻滾閃避、丟汽油彈、換槍</span>'
    : '<b>操作</b><span>WASD／方向鍵 移動，會自動瞄準開槍</span><span>空白鍵 翻滾　F 汽油彈</span><span>Q 或 1–3 換槍　Esc 暫停</span>';
  el.hidden = false; el.classList.remove('out');
  clearTimeout(showHint.tm); showHint.tm = setTimeout(hideHint, 9000);
}
function hideHint() { const el = $('hint'); if (el.hidden) return; el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 400); if (!Save.d.tut) { Save.d.tut = true; Save.save(); } }
const Game = { onMoveInput() { if (!$('hint').hidden) setTimeout(hideHint, 2500); } };

/* ---------- 升級 ---------- */
const UPG = [
  { id: 'dmg', name: '空尖彈', icon: 'bullet', tag: '槍械', max: 5, d: '所有槍械傷害 +18%', a: p => p.st.dmg += 0.18 },
  { id: 'rate', name: '扳機手感', icon: 'bolt', tag: '槍械', max: 5, d: '射速 +14%', a: p => p.st.rate += 0.14 },
  { id: 'reload', name: '陸戰隊換彈', icon: 'ammo', tag: '槍械', max: 4, d: '換彈速度 +25%，彈匣容量 +20%', a: p => { p.st.reload += 0.25; p.st.mag += 0.2; } },
  { id: 'pierce', name: '貫穿彈', icon: 'pierce', tag: '槍械', max: 3, d: '子彈多穿透 1 個敵人', a: p => p.st.pierce += 1 },
  { id: 'multi', name: '雙連發', icon: 'multi', tag: '槍械', max: 2, w: 0.55, d: '每次開火多打 1 發', a: p => p.st.multi += 1 },
  { id: 'crit', name: '爆頭', icon: 'crosshair', tag: '槍械', max: 4, d: '暴擊率 +8%，暴擊傷害 +25%', a: p => { p.st.crit += 0.08; p.st.critMul += 0.25; } },
  { id: 'pistolup', name: '老警的槍', icon: 'pistol', tag: '槍械', max: 3, d: '手槍傷害 +25%，彈匣 +6', a: p => { p.st.pistolDmg += 0.25; p.st.pistolMag += 6; } },
  { id: 'buck', name: '鹿彈', icon: 'shotgun', tag: '槍械', max: 3, need: p => p.guns.some(g => g.id === 'shotgun'), d: '霰彈槍彈丸 +2，擴散 -15%', a: p => { p.st.pellets += 2; p.st.spread -= 0.15; } },
  { id: 'auto', name: 'T91 全自動', icon: 'rifle', tag: '槍械', max: 3, need: p => p.guns.some(g => g.id === 'rifle'), d: '步槍射速 +20%，傷害 +10%', a: p => { p.st.rifleRate += 0.2; p.st.rifleDmg += 0.1; } },
  { id: 'ammo', name: '彈藥袋', icon: 'ammo', tag: '補給', max: 3, need: p => p.guns.some(g => g.res !== Infinity), d: '霰彈槍、步槍備彈上限 +50%，並補滿', a: p => { p.st.ammo += 0.5; refillAmmo(p, 1); } },
  { id: 'bat', name: '全壘打', icon: 'bat', tag: '近戰', max: 5, d: '鋁棒傷害 +35%，擊退 +25%', a: p => { p.st.bat += 0.35; p.st.batKb += 0.25; } },
  { id: 'batrange', name: '大棒子', icon: 'bat', tag: '近戰', max: 4, d: '鋁棒範圍 +18%，揮棒速度 +12%', a: p => { p.st.batR += 0.18; p.st.batSpd += 0.12; } },
  { id: 'dodge', name: '雨衣翻滾', icon: 'shoe', tag: '生存', max: 3, d: '翻滾冷卻 -18%，翻滾會撞傷路上的屍體', a: p => { p.st.dodgeCd -= 0.18; p.st.dodgeHit += 1; } },
  { id: 'speed', name: '外送腿', icon: 'shoe', tag: '生存', max: 4, d: '移動速度 +10%', a: p => p.st.speed += 0.1 },
  { id: 'hp', name: '保溫箱護甲', icon: 'box', tag: '生存', max: 5, d: '最大生命 +25，並回復 25', a: p => { p.mhp += 25; p.hp = Math.min(p.mhp, p.hp + 25); } },
  { id: 'armor', name: '全罩安全帽', icon: 'helmet', tag: '生存', max: 4, d: '受到的傷害 -10%', a: p => p.st.armor += 0.1 },
  { id: 'regen', name: '提神飲料', icon: 'can', tag: '生存', max: 4, d: '每秒回復 0.6 生命', a: p => p.st.regen += 0.6 },
  { id: 'molotov', name: '汽油彈', icon: 'molotov', tag: '火', max: 4, d: '立即 +2 汽油彈，燃燒傷害 +25%', a: p => { p.molo += 2; p.st.fire += 0.25; } },
  { id: 'magnet', name: '眼尖手快', icon: 'eye', tag: '補給', max: 3, d: '拾取範圍 +50%，補給掉落 +30%', a: p => { p.st.pick += 0.5; p.st.drop += 0.3; } },
  { id: 'combo', name: '殺紅眼', icon: 'skull', tag: '特殊', max: 3, d: '每 10 連殺，傷害 +2%（最多 +40%）', a: p => p.st.combo += 0.02 },
  { id: 'vamp', name: '嗜血', icon: 'drop', tag: '特殊', max: 3, d: '擊倒敵人時 8% 機率回復 3 生命', a: p => p.st.vamp += 0.08 },
  { id: 'desperate', name: '背水一戰', icon: 'rage', tag: '特殊', max: 1, w: 0.7, d: '生命低於 35% 時射速 +35%、移速 +15%', a: p => p.st.desperate = 1 },
  { id: 'heal', name: '關東煮', icon: 'bowl', tag: '補給', max: 99, w: 0.6, need: p => p.hp < p.mhp * 0.75, d: '立即回復 45% 生命', a: p => healPlayer(p.mhp * 0.45) }
];
function rollUpgrades(n) {
  const p = G.p, pool = UPG.filter(u => (p.lv[u.id] || 0) < u.max && (!u.need || u.need(p))), out = [];
  const tmp = pool.slice();
  while (out.length < n && tmp.length) {
    let tot = 0; for (const u of tmp) tot += (u.w || 1);
    let r = Math.random() * tot, i = 0; for (; i < tmp.length - 1; i++) { r -= (tmp[i].w || 1); if (r <= 0) break; }
    out.push(tmp[i]); tmp.splice(i, 1);
  }
  if (!out.length) out.push(UPG.find(u => u.id === 'heal'));
  return out;
}

/* ---------- 成就 ---------- */
const ACH = [
  { id: 'first', n: '第一滴血', d: '擊倒第一隻屍體', c: () => tot().kills >= 1 },
  { id: 'k100', n: '百人斬', d: '累計擊倒 100', c: () => tot().kills >= 100 },
  { id: 'k1000', n: '千人斬', d: '累計擊倒 1,000', c: () => tot().kills >= 1000 },
  { id: 'k5000', n: '屍山', d: '累計擊倒 5,000', c: () => tot().kills >= 5000 },
  { id: 'c50', n: '屍山血海', d: '單局連殺 50', c: () => G && G.maxCombo >= 50 },
  { id: 'c100', n: '人間兵器', d: '單局連殺 100', c: () => G && G.maxCombo >= 100 },
  { id: 'c200', n: '陸戰隊不死', d: '單局連殺 200', c: () => G && G.maxCombo >= 200 },
  { id: 'bat', n: '全壘打王', d: '用鋁棒累計擊倒 300', c: () => tot().bat >= 300 },
  { id: 'fire', n: '火葬場', d: '用火累計擊倒 200', c: () => tot().fire >= 200 },
  { id: 'lv20', n: '升到頂', d: '單局升到 20 級', c: () => G && G.p && G.p.level >= 20 },
  { id: 'ch1', n: '末班車', d: '通關第一章', c: () => !!Save.d.cleared[1] },
  { id: 'ch2', n: '籠中之王', d: '通關第二章', c: () => !!Save.d.cleared[2] },
  { id: 'ch3', n: '珍奶送達', d: '通關第三章', c: () => !!Save.d.cleared[3] },
  { id: 'ch4', n: '國道之王', d: '通關第四章', c: () => !!Save.d.cleared[4] },
  { id: 'ch5', n: '最後一單', d: '通關第五章', c: () => !!Save.d.cleared[5] },
  { id: 'clean', n: '毫髮無傷', d: '任一章節受到的傷害低於 30', c: () => false },
  { id: 'e5', n: '守住碼頭', d: '「最後的碼頭」撐過 5 分鐘', c: () => Save.d.endless >= 300 },
  { id: 'e10', n: '天亮了', d: '「最後的碼頭」撐過 10 分鐘', c: () => Save.d.endless >= 600 },
  { id: 'go', n: '不要回頭', d: '在碼頭選擇上船', c: () => !!Save.d.endGo },
  { id: 'stay', n: '拒收', d: '在碼頭選擇留下', c: () => !!Save.d.endStay }
];
function tot() { const s = Save.d.st; return { kills: s.kills + (G ? G.runKills : 0), bat: s.bat + (G ? G.batKills : 0), fire: s.fire + (G ? G.fireKills : 0) }; }
function unlockAch(id) {
  if (Save.d.ach[id]) return;
  Save.d.ach[id] = Date.now(); Save.save();
  const a = ACH.find(x => x.id === id); if (a) { Toast.show('成就解鎖｜' + a.n); Sound.play('ach'); }
  if (G) G.newAch.push(id);
}
function checkAch() { for (const a of ACH) if (!Save.d.ach[a.id] && a.c()) unlockAch(a.id); }

