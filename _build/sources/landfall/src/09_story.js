'use strict';
/* ====== 劇情導演：目標、場景觸發、事件、潮夜、遠征、結局 ====== */
const OBJ = {
  power: { avail: () => true, checks: () => [['建造太陽能板', countB('solar') >= 1]] },
  wake1: { avail: () => SD('power'), checks: () => [['電池存到 ' + wakeCost() + ' 度', G.power.stored >= wakeCost() || awakeCount() >= 1], ['喚醒一位船員', awakeCount() >= 1]] },
  night1: { avail: () => SD('wake1'), checks: () => {
    const f = Math.min(12, Math.floor((G.story.track && G.story.track.food) || 0));
    return [['建造宿舍艙', hasB('dorm')], ['建造食堂', hasB('mess')], [`採集食物 ${f}/12`, f >= 12]]; } },
  team: { avail: () => SD('wake1'), checks: () => [[`甦醒船員 ${Math.min(5, awakeCount())}/5`, awakeCount() >= 5]] },
  study: { avail: () => SD('team') || G.day >= 5, checks: () => [['建造研究台', hasB('research')], ['研究「異星作物馴化」', !!G.tech.done.agro]] },
  crystal: { avail: () => SD('study'), checks: () => [['採集一份晶簇樣本', !!G.flags.crystalSample], ['研究「晶簇共振」', !!G.tech.done.crystal]] },
  tide: { avail: () => G.tide.day > 0, checks: () => [['撐過潮夜', !!G.tide.done]] },
  expedition: { avail: () => !!G.flags.antenna, checks: () => [['建造通訊天線', !!G.flags.antennaBuilt], ['研究「信號解析」', !!G.tech.done.signal], ['潮夜過後派出遠征隊', G.exp.phase !== 'idle'], ['帶回黑盒子', !!G.flags.blackbox]] },
  decrypt: { avail: () => !!G.flags.blackbox, checks: () => [[CA('shen') ? '讓沈鷺在研究台工作，或研究「黑盒子解密」' : '研究「黑盒子解密」', !!G.flags.decrypted]] },
};
const MILESTONES = [
  { id: 'pop12', title: '人丁', desc: '甦醒船員達到 12 人。', done: () => awakeCount() >= 12 },
  { id: 'gh2', title: '倉廩', desc: '建好兩座溫室。', done: () => countB('greenhouse') >= 2 },
  { id: 'pop20', title: '聚落', desc: '甦醒船員達到 20 人。', done: () => awakeCount() >= 20 },
  { id: 'tide3', title: '潮汐', desc: '撐過三次潮夜。', done: () => (G.tide.n || 0) >= 3 },
  { id: 'techall', title: '格物', desc: '完成所有研究。', done: () => TECH_ORDER.every(k => G.tech.done[k]) },
  { id: 'day40', title: '扎根', desc: '在這顆星上活過 40 日。', done: () => G.day >= 40 },
  { id: 'pop40', title: '城邦', desc: '甦醒船員達到 40 人。', done: () => awakeCount() >= 40 },
  { id: 'allpods', title: '一個都不少', desc: '喚醒所有還活著的冬眠艙。', done: () => !G.pods.some(p => p.status === 'sleep') },
];
const SD = id => !!G.story.done[id];

function activeObjectives() {
  const out = [];
  if (G.story.act >= 2) {
    for (const m of MILESTONES) if (!G.story.done['m_' + m.id]) { out.push({ id: 'm_' + m.id, title: m.title, checks: [[m.desc, m.done()]], ms: true }); if (out.length >= 2) break; }
    return out;
  }
  const order = ['tide', ...MAIN.map(m => m.id).filter(x => x !== 'tide')];
  for (const id of order) {
    if (G.story.done[id]) continue;
    const o = OBJ[id];
    if (!o.avail()) continue;
    const m = MAIN.find(x => x.id === id);
    out.push({ id, title: m.title, desc: m.desc, hint: m.hint, checks: o.checks() });
    if (out.length >= 2) break;
  }
  return out;
}

/* ---------- 場景佇列 ---------- */
function playScene(key, vars, after) {
  const lines = (typeof key === 'string' ? SCENES[key] : key).map(l => {
    const o = Object.assign({}, l);
    if (o.t && vars) o.t = o.t.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
    if (o.n && vars) o.n = o.n.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
    return o;
  }).filter(o => {
    if (!o.s || ['ai', 'me', 'any', 'sci', 'team'].includes(o.s)) return true;
    return !!C(o.s);
  });
  G.story.seen[typeof key === 'string' ? key : 'x'] = 1;
  if (typeof UI !== 'undefined' && UI.queueScene) UI.queueScene(lines, after);
  else if (after) after();
}
function speakerOf(s) {
  if (s === 'ai') return { ai: true, name: '伴星' };
  if (s === 'me') return leader();
  if (s === 'any') { const l = awake().filter(c => !c.leader && !c.downed); return l.length ? l[Math.floor(R() * l.length)] : leader(); }
  if (s === 'sci') { const l = awake().filter(c => !c.leader); return l.length ? l.reduce((a, b) => b.sk.research > a.sk.research ? b : a) : leader(); }
  if (s === 'team') { const l = G.exp.team.map(byId).filter(Boolean); return l.length ? l[0] : leader(); }
  return C(s) || leader();
}

/* ---------- 每步檢查 ---------- */
function storyStep(dt) {
  if (G.demo) return;
  const S = G.story;
  S.tick = (S.tick || 0) + dt;
  if (S.tick < 1) return;
  S.tick = 0;
  if (!S.track) S.track = {};
  // 目標完成
  if (S.act === 1) {
    for (const id in OBJ) {
      if (S.done[id] || !OBJ[id].avail()) continue;
      if (OBJ[id].checks().every(c => c[1])) completeObj(id);
    }
  } else {
    for (const m of MILESTONES) if (!S.done['m_' + m.id] && m.done()) { S.done['m_' + m.id] = 1; log(`里程碑達成：${m.title}——${m.desc}`, 'good'); if (typeof SFX !== 'undefined') SFX.milestone(); memAll('ms', 6, DAY, '殖民地的里程碑'); }
  }
  // 第一個黃昏
  if (!S.seen.dusk1 && S.seen.prologue && hourOf(G.t) >= 18.4 && G.day >= 1 && (awakeCount() >= 1 || G.day >= 2)) playScene('dusk1');
  // 伴星算出位置
  if (!G.flags.courseKnown && G.day >= 4 && hourOf(G.t) > 9 && !CA('sophia')) { G.flags.courseKnown = 1; playScene('aiPosition'); }
  // 信號
  if (!G.flags.antenna && S.done.night1 && G.day >= 3 && isNight() && hourOf(G.t) > 19) { G.flags.antenna = 1; playScene('beacon'); }
  // 潮夜自動排程
  if (!G.tide.day && G.day >= 8) { scheduleTide(Math.max(G.day + 4, 11)); playScene('crystalAuto', { tideDay: G.tide.day, days: G.tide.day - G.day }); }
  tideStep();
  expStep();
  // 冬眠艙母女重逢
  if (!G.flags.reunion && C('chengwei') && C('xiaoman') && !C('chengwei').sick) { G.flags.reunion = 1; playScene('reunion', null, () => { mem(C('xiaoman'), 'mom', 25, 8 * DAY, '媽媽回來了'); mem(C('chengwei'), 'daughter', 25, 8 * DAY, '小滿還在'); trust(C('xiaoman'), 15); trust(C('chengwei'), 12); }); }
  // 隱瞞的代價
  if (G.flags.truth === 'secret' && !G.flags.exposed && G.day >= (G.flags.truthDay || 0) + 6 && R() < 0.004) {
    G.flags.exposed = 1;
    UI.queueEvent({
      title: '洩密', art: 'ai',
      text: `不知道是誰先說出去的。\n\n「航道是艦長改的」——這句話在晚飯時傳遍了整個營地。沒有人當面問你，但每個人都在看你。`,
      choices: [
        { t: '站出來說清楚', sub: '晚了，但總比沒有好。', fx: () => { trustAll(-10); trustAll(6, c => c.trust > 30); } },
        { t: '什麼都不說', sub: '', fx: () => { trustAll(-22); } },
      ],
    });
  }
}
function completeObj(id) {
  const S = G.story;
  S.done[id] = 1;
  const m = MAIN.find(x => x.id === id);
  if (typeof SFX !== 'undefined') SFX.objective();
  log(`目標完成：${m.title}`, 'good');
  switch (id) {
    case 'power': playScene('power'); break;
    case 'night1': memAll('settled', 5, DAY, '總算安頓下來了'); break;
    case 'team': playScene('team'); break;
    case 'study': playScene('agro'); break;
    case 'crystal':
      if (!G.tide.day) { scheduleTide(Math.max(G.day + 4, 10)); playScene('crystal', { tideDay: G.tide.day, days: G.tide.day - G.day }); }
      break;
  }
}
function scheduleTide(day) {
  G.tide.day = day; G.tide.phase = 'warn';
  log(`潮夜：第 ${day} 日入夜。`, 'warn');
}

/* ---------- 潮夜 ---------- */
function tideStep() {
  const T_ = G.tide;
  if (!T_.day) return;
  const hh = hourOf(G.t);
  if (T_.phase === 'warn' && G.day === T_.day && hh >= 18.5) {
    T_.phase = 'active'; T_.t0 = G.t; T_.nextWave = G.t + 8; T_.boss = 0; T_.blackMin = 0; T_.lostThis = 0; T_.bossDown = 0;
    if (typeof SFX !== 'undefined') SFX.tide();
    if ((T_.n || 0) === 0) playScene('tideStart');
    else UI.queueScene([{ n: '雙月再次交會。潮，又來了。' }, { s: 'ai', t: '燈火管制開關已開放。' }]);
    for (const c of awake()) c.thinkAt = G.t;
  }
  if (T_.phase !== 'active') return;
  const pop = awake().length;
  const elapsed = G.t - T_.t0;
  // 一波一波
  if (G.t >= T_.nextWave && elapsed < 9 * 60) {
    T_.nextWave = G.t + 20 + R() * 8;
    const scale = 1 + Math.min(T_.n || 0, 4) * 0.3;
    const alive = G.beasts.filter(b => !b.dead && b.mode === 'tide').length;
    let n = Math.round((3 + Math.min(pop, 22) * 0.38 + Math.min(elapsed / 60, 6) * 0.55) * scale * (T_.blackout ? 0.4 : 1));
    n = Math.max(0, Math.min(n, 85 - alive));
    const spot = edgeSpot(16);
    const list = [];
    for (let i = 0; i < n; i++) {
      const x = clamp(spot[0] + R.int(-3, 3), 0, N - 1), y = clamp(spot[1] + R.int(-3, 3), 0, N - 1);
      if (walkCost(x, y, true) > 0) list.push(spawnBeast('bug', x, y, 'tide'));
    }
    if ((T_.n || 0) >= 1 && R() < 0.4 && alive < 85) { const s2 = edgeSpot(16); spawnBeast('spine', s2[0], s2[1], 'tide'); }
    T_.waves++;
  }
  // 潮母
  if (!T_.boss && elapsed > 4 * 60) {
    T_.boss = 1;
    const s = edgeSpot(18);
    const m = spawnBeast('mother', s[0], s[1], 'tide');
    m.hp = m.hpMax = Math.round(BEAST.mother.hp * (1 + (T_.n || 0) * 0.5) * (0.75 + pop * 0.04));
    if ((T_.n || 0) === 0) playScene('tideBoss');
    else log('潮母出現了！', 'bad');
    if (typeof SFX !== 'undefined') SFX.boss();
  }
  // 燈火管制：冬眠艙風險
  if (T_.blackout) {
    T_.blackMin += 1;
    if (T_.blackMin % 60 === 0 && R() < 0.24) { podFail('燈火管制'); T_.lostThis++; }
  }
  // 天亮
  if (hh >= 5.6 && hh < 12 && elapsed > 8 * 60) endTide();
}
function setBlackout(v) {
  if (G.tide.phase !== 'active') return;
  G.tide.blackout = v;
  log(v ? '燈火管制：所有燈光熄滅，砲塔停火。冬眠艙降到最低維生。' : '解除燈火管制：燈光與砲塔恢復。', v ? 'warn' : 'good');
  if (typeof SFX !== 'undefined') SFX.blackout(v);
  for (const b of G.beasts) b.thinkAt = 0;
}
function endTide() {
  const T_ = G.tide;
  T_.phase = 'done'; T_.blackout = false;
  const first = !T_.done;
  T_.done = true; T_.n = (T_.n || 0) + 1;
  for (const b of G.beasts) { if (b.mode === 'tide') { b.mode = 'roam'; b.hostile = false; b.tg = null; b.home = edgeSpot(20); b.leaving = true; } }
  memAll('survived', 12, 3 * DAY, '撐過了潮夜');
  trustAll(T_.lostThis ? 2 : 6);
  if (first) playScene('tideEnd', null, () => { if (G.flags.located) playScene('expAvail'); });
  else log('潮退了。', 'good');
  for (const c of awake()) c.thinkAt = G.t;
  // 下一次
  T_.day = G.day + 9 + R.int(0, 2); T_.phase = 'warn';
  setTimeout(() => G && log(`伴星：雙月又在靠近了。下一次潮夜：第 ${T_.day} 日。`, 'warn'), 4000);
}
// 撤離的生物離開地圖
function cleanupBeasts() {
  for (const b of G.beasts) if (b.leaving && (b.x < 1 || b.y < 1 || b.x > N - 2 || b.y > N - 2)) b.dead = true;
}

/* ---------- 每小時：事件、襲擊 ---------- */
function eventsHourly() {
  cleanupBeasts();
  if (G.demo) return;
  const S = G.story;
  // 白天散步的燈蟲（氛圍）
  if (G.beasts.filter(b => b.mode === 'roam' && b.type === 'bug').length < 5 && R() < 0.25 && G.tide.phase !== 'active') {
    const s = edgeSpot(14); spawnBeasts('bug', R.int(2, 4), null, 'roam').forEach(b => { b.home = [clamp(s[0] + R.int(-6, 6), 2, N - 3), clamp(s[1] + R.int(-6, 6), 2, N - 3)]; });
  }
  // 刺背獸夜襲
  if (!S.nextRaid) S.nextRaid = 4.85;
  const dayF = G.t / DAY;
  if (dayF >= S.nextRaid && isNight() && G.tide.phase !== 'active' && awakeCount() >= 2) {
    S.nextRaid = dayF + 3 + R() * 1.6;
    const nests = G.world.nodes.filter(n => n.type === 'nest');
    const nest = nests.length ? R.pick(nests) : null;
    const k = 2 + Math.floor(G.day / 7) + (awakeCount() > 10 ? 1 : 0);
    const list = nest ? spawnBeasts('spine', k, { x: nest.x, y: nest.y }, 'hunt') : spawnBeasts('spine', k, null, 'hunt');
    if (list.length) { revealAround(list[0].x, list[0].y, 3); log(`刺背獸夜襲！${list.length} 隻正朝營地過來。`, 'bad'); if (typeof SFX !== 'undefined') SFX.alert(); if (typeof UI !== 'undefined' && UI.alertAt) UI.alertAt(list[0].x, list[0].y); }
  }
  // 隨機事件
  if (typeof UI !== 'undefined' && UI.busy && UI.busy()) return;
  if (G.tide.phase === 'active' || G.exp.phase === 'event') return;
  const elig = EVENTS.filter(e => {
    if (e.once && S.evCount[e.id]) return false;
    if (e.gap && S.evAt[e.id] && G.t - S.evAt[e.id] < e.gap * DAY) return false;
    try { return e.cond(G); } catch (err) { return false; }
  });
  if (!elig.length) return;
  const urgent = elig.filter(e => e.w >= 30);
  let ev = null;
  if (urgent.length) ev = urgent[0];
  else if (G.t - S.evLast > 9 * 60 && R() < 0.13) ev = weighted(elig, e => e.w);
  if (!ev) return;
  fireEvent(ev);
}
function fireEvent(ev) {
  const S = G.story;
  S.evCount[ev.id] = (S.evCount[ev.id] || 0) + 1; S.evAt[ev.id] = G.t; S.evLast = G.t;
  const e = ev.make(G);
  if (typeof UI !== 'undefined' && UI.queueEvent) UI.queueEvent(e);
  else { const ch = e.choices.find(c => !c.req || c.req(G) === true); if (ch) ch.fx(G); }
}

/* ---------- 掛勾 ---------- */
function onWake(c) {
  if (c.key === 'sophia' && !G.flags.sophiaScene) {
    G.flags.sophiaScene = 1;
    G.flags.courseKnown = 1;
    G._afterWake = () => playScene('sophia');
  }
  if (G.stats.woken === 1) G._afterWake2 = () => playScene('firstWake', { food: Math.floor(G.res.food) });
}
function onBuilt(b) {

}
function onTech(id) {
  if (id === 'signal') { G.flags.located = 1; playScene(G.tide.done ? 'locatedAfter' : 'located'); }
  if (id === 'decrypt') { G.flags.decrypted = 'ai'; onDecrypted('ai'); }
}
function onDecrypted(who) {
  if (G.story.finale) return;
  G.story.finale = 1;
  const after = () => playScene('confess', null, () => {
    UI.queueEvent({
      title: '明天', art: 'ai',
      text: '明天早上，所有人都會問黑盒子裡有什麼。\n\n你要怎麼說？',
      choices: [
        { t: '公開真相', sub: '「我會把我知道的，全部告訴他們。」信任你的人會留下，其他人會動搖。', fx: () => {
          G.flags.truth = 'open'; trustAll(-12, c => c.trust < 40); trustAll(5, c => c.trust >= 40); if (C('xu')) trust(C('xu'), -10);
          log('你把一切都告訴了大家。營地安靜了很久。', 'warn'); } },
        { t: '暫時隱瞞', sub: '「在弄清楚之前，這件事只有我們知道。」現在沒事——之後就難說了。', fx: () => {
          G.flags.truth = 'secret'; G.flags.truthDay = G.day; if (C('shen')) trust(C('shen'), 4);
          log('黑盒子被鎖進了艦長的櫃子裡。', 'warn'); } },
      ],
      after: () => actEnd(),
    });
  });
  if (who === 'shen' && C('shen')) playScene('decryptShen', null, after);
  else playScene('decryptAi', null, after);
}
function onInspect(n) {
  if (n.type === 'ruin' && !G.flags.ruin) {
    G.flags.ruin = 1; G.res.data += 15;
    playScene([
      { n: '石碑表面的紋路，和晶簇的明滅完全同步。' },
      { n: '他把手放了上去。石頭是溫的，像有心跳。' },
      { n: '那一瞬間，他好像聽見了什麼——很遠、很低，像有人在叫他的名字。' },
      { s: 'ai', t: '艦長？您的心跳剛剛停了兩秒。' },
      { s: 'me', t: '……沒事。' },
    ]);
  } else if (n.type === 'ruin') log('石碑靜靜地立在那裡，微微發著光。', 'quiet');
}
function onBossDown() {}
function actEnd() {
  G.story.act = 2;
  const sum = {
    days: G.day, awake: awakeCount() + 1, lost: G.stats.lost, built: G.stats.built, killed: G.stats.killed,
    trust: Math.round(avgTrust()), truth: G.flags.truth,
  };
  // 最好的朋友
  let best = null, bv = -1;
  const l = awake();
  for (const a of l) for (const b of l) if (a.id < b.id) { const v = opinion(a, b) + opinion(b, a); if (v > bv) { bv = v; best = [a, b]; } }
  sum.friends = best && bv > 60 ? best.map(c => c.name) : null;
  if (typeof UI !== 'undefined' && UI.actEnd) UI.actEnd(sum);
  if (typeof SFX !== 'undefined') SFX.actEnd();
  if (typeof saveGame === 'function') saveGame(true);
}

/* ---------- 遠征 ---------- */
function canLaunch() {
  if (!G.flags.located) return '還沒定位艦橋段';
  if (!G.tide.done) return '潮夜過後才能出發';
  if (G.exp.phase !== 'idle') return '遠征隊已經出發';
  return '';
}
function launchExpedition(ids) {
  const why = canLaunch();
  if (why) return why;
  const team = ids.map(byId).filter(c => c && !c.dead && !c.downed);
  if (team.length < 2) return '至少要兩個人';
  const outs = shuffle(EXPED.out.slice()).slice(0, 2);
  const back = R.pick(EXPED.back);
  G.exp = { phase: 'out', team: team.map(c => c.id), t0: G.t, step: 0, plan: [outs[0], outs[1], 'arrive', back], at: [0.33, 0.66, 1.0, 1.5], ret: 2.0,
    loot: { food: 0, metal: 0, comp: 0, data: 0 }, delay: 0, moodHit: 0, log: [] };
  for (const c of team) { endTask(c, true); c.away = true; c.hidden = true; c.path = null; if (c.inside) c.inside = 0; }
  log(`遠征隊出發了：${team.map(c => c.name).join('、')}。`, 'good');
  if (typeof SFX !== 'undefined') SFX.objective();
  return '';
}
function expTeam() { return G.exp.team.map(byId).filter(Boolean); }
function expBest(sk) { return expTeam().reduce((a, c) => c.sk[sk] > a.sk[sk] ? c : a, expTeam()[0]); }
function expHurt(E, dmg) {
  const t = expTeam(); if (!t.length) return;
  const v = R.pick(t); v.hp = Math.max(22, v.hp - dmg);
  E.log.push(`${v.name}受了傷。`);
}
function expStep() {
  const E = G.exp;
  if (!E || E.phase === 'idle' || E.phase === 'done') return;
  if (E.phase === 'event') return;
  const el = (G.t - E.t0) / DAY;
  if (E.step < E.plan.length && el >= E.at[E.step] + E.delay / DAY) {
    const ev = E.plan[E.step++];
    if (ev === 'arrive') {
      E.phase = 'event';
      G.flags.blackboxFound = 1;
      const lines = SCENES.arrive.slice();
      if (G.flags.xmGo && expTeam().some(c => c.key === 'xiaoman')) lines.splice(2, 1, { s: 'xiaoman', t: '媽……是媽媽的艙！燈還亮著，燈還亮著！' });
      UI.queueScene(lines.map(l => l.s === 'xiaoman' ? Object.assign({}, l, { s: 'teamxm' }) : l), () => { E.phase = 'site'; });
      return;
    }
    E.phase = 'event';
    const team = expTeam();
    let text = ev.text;
    let choices = ev.choices;
    let okText = null;
    if (ev.check) {
      const best = expBest(ev.check);
      if (best && best.sk[ev.check] >= ev.dc) {
        okText = ev.ok.replace('{best}', best.name);
        if (ev.okFx) ev.okFx(E);
        choices = [{ t: '繼續前進', sub: `隊伍中 ${best.name} 的${SKILLS[ev.check]} ${best.sk[ev.check]}（需要 ${ev.dc}）`, fx: () => {} }];
        text += '\n\n' + okText;
      } else {
        text += `\n\n（需要${SKILLS[ev.check]} ${ev.dc}，隊伍裡最高只有 ${best ? best.sk[ev.check] : 0}。）`;
      }
    }
    UI.queueEvent({
      title: '遠征｜' + ev.title, art: 'exp', text,
      choices: choices.map(ch => ({ t: ch.t, sub: ch.sub, fx: () => ch.fx(E) })),
      after: () => { E.phase = E.step >= 3 ? 'back' : 'out'; },
    });
    return;
  }
  if (E.step >= E.plan.length && el >= E.ret + E.delay / DAY) expReturn();
}
function expReturn() {
  const E = G.exp;
  const h = hull();
  const team = expTeam();
  for (const c of team) {
    c.away = false; c.hidden = false;
    const a = accessTiles(h); const s = a.length ? R.pick(a) : [h.x, h.y + h.h];
    c.x = s[0] + .5; c.y = s[1] + .5; c.task = null;
    c.food = 55; c.rest = 45;
    if (E.moodHit > 0) mem(c, 'exptired', -E.moodHit, DAY, '遠征的疲憊');
    mem(c, 'expdone', 8, 3 * DAY, '從艦橋段平安回來');
    trust(c, 6);
    gainXp(c, 'gather', 200);
  }
  for (const k in E.loot) G.res[k] = (G.res[k] || 0) + E.loot[k];
  // 艦橋段的冬眠艙
  const add = (p) => { G.pods.push(Object.assign({ id: uid(), status: 'sleep', dmg: false, left: 0, repairQ: false, repair: 0, mask: { name: true, role: true, trait: true, corrupt: false } }, p)); };
  add({ label: 'E-01', key: 'chengwei' });
  add({ label: 'E-02', seed: (G.seed * 13 + 501) >>> 0 });
  add({ label: 'E-03', seed: (G.seed * 17 + 733) >>> 0 });
  G.scan = [G.pods[G.pods.length - 3].id, ...G.scan].slice(0, 3);
  G.flags.blackbox = 1;
  E.phase = 'done';
  log(`遠征隊回來了！帶回黑盒子、三具冬眠艙${E.loot.comp ? '、' + E.loot.comp + ' 零件' : ''}${E.loot.data ? '、' + E.loot.data + ' 資料' : ''}。`, 'good');
  if (E.lore) log('遠征隊回報：晶簇原野裡還有另一座石碑——和營地附近那座一模一樣。', 'warn');
  playScene('returnHome');
  if (typeof SFX !== 'undefined') SFX.objective();
}
