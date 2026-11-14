/* ===== 介面：畫面切換、選單、升級、暫停、結算、啟動 ===== */
let PSPR = null;
const SCREENS = { title: 'scrTitle', chapters: 'scrChapters', ach: 'scrAch', story: 'scrStory', end: 'scrEnd' };
const App = {
  screen: '',
  go(s) {
    this.screen = s;
    for (const k in SCREENS) $(SCREENS[k]).hidden = k !== s;
    const playing = s === 'play';
    $('stage').hidden = !playing; $('scv').hidden = playing;
    HUD.show(playing);
    for (const id of ['mLv', 'mPause', 'mDead', 'mClear']) $(id).hidden = true;
    if (!playing) Input.endJoy();
  },
  onKey(e) {
    if (this.screen === 'play' && G) {
      if (G.state === 'play') {
        if (e.code === 'Space') doDodge();
        else if (e.code === 'KeyF' || e.code === 'KeyE') throwMolotov();
        else if (e.code === 'KeyQ') cycleGun();
        else if (/^Digit[1-3]$/.test(e.code)) switchGun(+e.code.slice(5) - 1);
        else if (e.code === 'Escape' || e.code === 'KeyP') UI.pause();
        else Game.onMoveInput();
      } else if (G.state === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) UI.resume();
      else if (G.state === 'levelup' && /^Digit[1-3]$/.test(e.code)) UI.pickCard(+e.code.slice(5) - 1);
    } else if (this.screen === 'story') {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); Story.advance(); }
      else if (e.code === 'Escape') Story.skip();
    }
  }
};

function startChapter(n) { Story.play(CHAPTERS[n].intro, () => beginPlay(n, { fromStory: true })); }
function playFinal() {
  Story.play(FINAL, (k) => {
    if (k === 'go') { Save.d.endGo = true; Save.d.ending = 'go'; Save.save(); checkAch(); Story.play(END_GO, () => UI.credits('go')); }
    else { Save.d.endStay = true; Save.d.ending = 'stay'; Save.save(); checkAch(); Story.play(END_STAY, () => beginPlay('E', { fromStory: true })); }
  });
}

const Title = {
  show() { App.go('title'); Scene.set('title'); this.render(); },
  render() {
    const d = Save.d, allDone = !!d.cleared[5];
    const next = Math.min(5, d.unlocked);
    $('bStart').textContent = allDone ? '重溫故事' : d.unlocked > 1 ? '繼續故事・' + CHAPTERS[next].no : '開始故事';
    $('bChN').textContent = Object.keys(d.cleared).filter(k => k !== 'E').length + ' / 5';
    $('bEnN').textContent = d.endlessOpen ? (d.endless ? '最佳 ' + fmtTime(d.endless) : '無盡模式') : '通關第一章解鎖';
    $('bEndless').classList.toggle('locked', !d.endlessOpen);
    $('bAchN').textContent = Object.keys(d.ach).length + ' / ' + ACH.length;
    $('bSoundN').textContent = '音量・震動・存檔碼';
  },
  frame(dt) { Scene.frame(dt); }
};
function renderChapters() {
  const box = $('chList'); box.innerHTML = '';
  const d = Save.d;
  for (let n = 1; n <= 5; n++) {
    const c = CHAPTERS[n], open = n <= d.unlocked, done = !!d.cleared[n];
    const card = S1_IN && [S1_IN, S2_IN, S3_IN, S4_IN, S5_IN][n - 1].find(l => l && l.card).card;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card' + (open ? '' : ' lock');
    b.innerHTML = `<span class="c-no">${c.no}</span><span class="c-time">${card.time}</span><span class="c-title">${open ? c.title : '？？？'}</span><span class="c-place">${open ? c.place : '通關上一章解鎖'}</span><span class="c-st">${done ? '已通關・最佳 ' + fmtTime(d.best[n] || 0) : open ? '未通關' : '未解鎖'}</span>`;
    b.addEventListener('click', () => { if (!open) { Toast.show('先通關' + CHAPTERS[n - 1].no); return; } Sound.play('click'); startChapter(n); });
    box.appendChild(b);
  }
  const e = document.createElement('button'); e.type = 'button'; e.className = 'card dark' + (d.endlessOpen ? '' : ' lock');
  e.innerHTML = `<span class="c-no">終章・無盡</span><span class="c-time">06:04</span><span class="c-title">最後的碼頭</span><span class="c-place">和子晴一起守住碼頭</span><span class="c-st">${d.endless ? '最佳 ' + fmtTime(d.endless) : d.endlessOpen ? '可挑戰' : '通關第一章解鎖'}</span>`;
  e.addEventListener('click', () => { if (!d.endlessOpen) { Toast.show('先通關第一章'); return; } Sound.play('click'); beginPlay('E'); });
  box.appendChild(e);
}
function renderAch() {
  const box = $('achList'); box.innerHTML = '';
  const icons = { first: 'drop', k100: 'skull', k1000: 'skull', k5000: 'skull', c50: 'bolt', c100: 'bolt', c200: 'bolt', bat: 'bat', fire: 'fire', lv20: 'box', ch1: 'pistol', ch2: 'shotgun', ch3: 'bowl', ch4: 'rifle', ch5: 'box', clean: 'helmet', e5: 'molotov', e10: 'molotov', go: 'eye', stay: 'heart' };
  let n = 0;
  for (const a of ACH) {
    const on = !!Save.d.ach[a.id]; if (on) n++;
    const el = document.createElement('div'); el.className = 'ach pbox' + (on ? ' on' : '');
    el.innerHTML = `<img class="pix" alt="" src="${iconURL(icons[a.id] || 'box')}"><b>${a.n}</b><small>${a.d}</small>`;
    box.appendChild(el);
  }
  $('achCount').textContent = n + ' / ' + ACH.length;
}

const UI = {
  opts: null,
  openLevelUp() {
    const g = G; if (!g || g.state !== 'play' || g.pendingLv <= 0) return;
    g.state = 'levelup'; Input.endJoy();
    const opts = this.opts = rollUpgrades(3), p = g.p;
    const intro = g.pickIntro > 0;
    $('lvTitle').textContent = intro ? '起始強化 ' + (g.pickIntro - g.pendingLv + 1) + ' / ' + g.pickIntro : '升級！LV ' + (p.level - g.pendingLv + 1);
    $('lvSub').textContent = intro ? '帶著前面幾章的經驗上場。' : '挑一個。';
    const box = $('lvCards'); box.innerHTML = '';
    opts.forEach((u, i) => {
      const cur = p.lv[u.id] || 0, mx = Math.min(u.max, 5);
      let pips = ''; if (u.max < 90) for (let k = 0; k < mx; k++) pips += `<i class="${k < cur ? 'on' : k === cur ? 'new' : ''}"></i>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'upg';
      b.innerHTML = `<img class="pix" alt="" src="${iconURL(u.icon)}"><div class="nm"><span>${u.name}</span><span class="tag t-${u.tag}">${u.tag}</span></div><div class="pips">${pips}</div><p>${u.d}</p>`;
      b.addEventListener('click', () => this.pickCard(i));
      box.appendChild(b);
    });
    $('lvReroll').textContent = '重抽（剩 ' + g.rerolls + ' 次）'; $('lvReroll').disabled = g.rerolls <= 0;
    $('mLv').hidden = false; Sound.play('level'); PZ.haptic.tap('success'); PZ.fx.flash('#ffe2a8', 0.18, 0.15);
  },
  pickCard(i) {
    const g = G, u = this.opts && this.opts[i]; if (!u || !g || g.state !== 'levelup') return;
    const p = g.p; u.a(p); p.lv[u.id] = (p.lv[u.id] || 0) + 1;
    g.pendingLv--; if (g.pendingLv <= 0) g.pickIntro = 0;
    $('mLv').hidden = true; g.state = 'play'; Sound.play('click'); HUD.syncSlots(true);
    if (g.pendingLv > 0) g.lvDelay = 0.12;
  },
  reroll() { const g = G; if (!g || g.state !== 'levelup' || g.rerolls <= 0) return; g.rerolls--; g.state = 'play'; this.openLevelUp(); },
  pause() {
    const g = G; if (!g || g.state !== 'play') return;
    g.state = 'paused'; Input.endJoy();
    const p = g.p;
    $('pInfo').textContent = (g.ch.no + '　' + g.ch.title) + '｜' + fmtTime(g.t) + '｜擊倒 ' + g.kills;
    const box = $('pBuild'); box.innerHTML = '';
    for (const u of UPG) { const l = p.lv[u.id]; if (!l) continue; const c = document.createElement('span'); c.className = 'chip'; c.innerHTML = `<img class="pix" alt="" src="${iconURL(u.icon)}">${u.name} ${u.max < 90 ? 'Lv' + l : '×' + l}`; box.appendChild(c); }
    if (!box.childElementCount) box.innerHTML = '<span class="chip">還沒有強化</span>';
    $('pKeys').textContent = PZ.input.device === 'gamepad' ? '左類比 移動｜A 翻滾｜X／RB 汽油彈｜Y／LB 換槍｜START 暫停' : IS_TOUCH ? '按住畫面任一處拖曳移動；槍和鋁棒會自己找目標。' : 'WASD／方向鍵 移動｜空白鍵 翻滾｜F 汽油彈｜Q、1–3 換槍｜Esc 暫停｜也可以接手把';
    $('mPause').hidden = false;
  },
  resume() { const g = G; if (!g || g.state !== 'paused') return; $('mPause').hidden = true; g.state = 'play'; },
  restart() { const id = G.chId, fs = G.fromStory; commitStats(); beginPlay(id, { fromStory: fs }); },
  quit() { if (G) commitStats(); G = null; Sound.stopAmb(); Scene.amb = null; Title.show(); },
  statsHTML(rows) { return rows.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join(''); },
  showDead() {
    const g = G;
    if (g.endless) {
      const best = Save.d.endless;
      $('dTitle').textContent = '守住碼頭 ' + fmtTime(g.t);
      $('dLine').textContent = g.t >= best - 0.5 ? '新紀錄。' : '最佳紀錄 ' + fmtTime(best) + '。';
      $('dRetry').textContent = '再守一次';
      $('dMenu').textContent = g.fromStory ? '看結局' : '回主選單';
    } else {
      $('dTitle').textContent = '你倒下了';
      $('dLine').textContent = g.deadLine || g.ch.deadLine || '';
      $('dRetry').textContent = '再來一次'; $('dMenu').textContent = '回主選單';
    }
    $('dStats').innerHTML = this.statsHTML([['撐了', fmtTime(g.t)], ['擊倒', g.kills], ['最高連殺', g.maxCombo], ['等級', 'LV ' + g.p.level]]);
    $('mDead').hidden = false;
  },
  deadMenu() {
    const g = G;
    if (g && g.endless && g.fromStory) { const t = g.t; G = null; Story.play(endStayEpilogue(t), () => UI.credits('stay')); return; }
    this.quit();
  },
  showClear() {
    const g = G, ch = g.ch;
    $('cTitle').textContent = ch.no + '　' + ch.title;
    $('cSub').textContent = g.chId === 5 ? '船長倒下了。汽笛響了。' : '完成。訂單還在跑。';
    $('cStats').innerHTML = this.statsHTML([['用時', fmtTime(g.t)], ['擊倒', g.kills], ['最高連殺', g.maxCombo], ['等級', 'LV ' + g.p.level], ['受到傷害', Math.round(g.dmgTaken)]]);
    const box = $('cAch'); box.innerHTML = '';
    for (const id of g.newAch) { const a = ACH.find(x => x.id === id); if (!a) continue; const c = document.createElement('span'); c.className = 'chip gold'; c.textContent = '成就｜' + a.n; box.appendChild(c); }
    $('cNext').textContent = g.fromStory ? '繼續劇情' : '看這章的結尾';
    $('mClear').hidden = false; Sound.play('level');
  },
  continueAfterClear() {
    const id = G.chId, ch = CHAPTERS[id];
    G = null; Sound.stopAmb(); Scene.amb = null;
    if (id === 5) { playFinal(); return; }
    Story.play(ch.outro, () => startChapter(id + 1));
  },
  credits(kind) {
    App.go('end'); Scene.set(kind === 'go' ? 'boat' : 'pier');
    $('endLine').textContent = kind === 'go' ? '他沒有回頭。' : '他們一起守住了碼頭。';
    const both = Save.d.endGo && Save.d.endStay;
    $('endHint').textContent = both ? '兩個結局都看過了。' : kind === 'go' ? '碼頭上，還有另一個選擇。' : '如果那天他上了船呢？';
  }
};

