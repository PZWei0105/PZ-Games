'use strict';
/* ====== 介面：據點、面板、遊戲中 HUD、劇情 ====== */
const S = { mode: 'boot', paused: false };
function toast(msg, cls = '') { const t = el('div', 'toast ' + cls, esc(msg)); $('#toast').appendChild(t); setTimeout(() => t.remove(), 2800); }

/* ---------- 無線電字幕 ---------- */
const RAD = { q: [], cur: null, t: 0 };
function say(who, text, dur) { RAD.q.push({ who, text, dur: dur || clamp(1.8 + text.length * .085, 2.2, 6) }); }
function sayList(list, delay = 0) { if (!list) return; if (delay) setTimeout(() => list.forEach(([w, t]) => say(w, t)), delay * 1000); else list.forEach(([w, t]) => say(w, t)); }
function updateRadio(dt) {
  const box = $('#radio');
  if (RAD.cur) { RAD.t -= dt; if (RAD.t <= 0) { RAD.cur = null; box.classList.remove('show'); RAD.gap = .3; } }
  if (!RAD.cur && RAD.q.length) {
    RAD.gap = (RAD.gap || 0) - dt; if (RAD.gap > 0) return;
    RAD.cur = RAD.q.shift(); RAD.t = RAD.cur.dur;
    const w = RAD.cur.who === 'boss' ? { n: W && W.ch.boss.n, c: '#ff6a7a' } : WHO[RAD.cur.who] || WHO.sys;
    box.style.borderLeftColor = w.c;
    box.innerHTML = (w.n ? `<b style="color:${w.c}">${esc(w.n)}</b>` : '') + esc(RAD.cur.text);
    box.classList.add('show');
  }
}

/* ---------- 共用：當票卡片 ---------- */
function orbStyle(r) { const c = RAR[r].c; return `background:radial-gradient(circle at 35% 30%,#fff,${mixHex(c, '#ffffff', .35)} 35%,${shade(c, -.35)});box-shadow:0 0 ${8 + r * 5}px ${rgba(c, .7)}`; }
function sealHtml(r) { const c = RAR[r].c; return `<span class="seal" style="background:${shade(c, -.25)};color:#fff">${RAR[r].seal}</span>`; }
function ticket(it, acts = '') {
  const who = CH[it.ch] ? CH[it.ch].nick : '';
  const kindTag = it.kind === 'life' ? `<span class="tag" style="border-color:${RAR[3].c};color:${RAR[3].c}">人生記憶</span>` : it.kind === 'core' ? `<span class="tag" style="border-color:${RAR[5].c};color:${RAR[5].c}">核心記憶</span>` : '';
  return `<div class="ticket" data-id="${it.id}"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="body">
    <div class="nm" style="color:${mixHex(RAR[it.rar].c, '#ffffff', .35)}">${esc(it.n)}</div><div class="fl">${esc(it.f)}</div>
    <div class="meta">${sealHtml(it.rar)}<span>${RAR[it.rar].n}</span><span>· ${it.size} 格</span><span>· ${esc(who)}</span>${kindTag}</div></div>
    ${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
}
const sellPrice = it => Math.round(it.val * (G.perks.su ? 1.08 : 1));
const heOf = c => c && (c.id === 'lin' || c.id === 'zhou') ? '她' : '他';

/* ---------- 面板 ---------- */
function sheet(id, title, sub, body, foot, opt = {}) {
  closeSheet(id);
  const s = el('div', 'screen'); s.id = id;
  s.innerHTML = `<div class="scrim"></div><div class="sheet" style="${opt.wide ? 'width:min(96vw,640px)' : ''}"><div class="hd"><h2>${title}</h2><span class="sub">${sub || ''}</span></div>
    <div class="bd">${body}</div>${foot != null ? `<div class="ft">${foot}</div>` : ''}${opt.noX ? '' : '<button class="x" data-x>✕</button>'}</div>`;
  $('#ui').appendChild(s);
  const x = s.querySelector('[data-x]'); if (x) x.onclick = () => { AU.sfx('ui'); closeSheet(id); opt.onClose && opt.onClose(); };
  if (!opt.noScrim) s.querySelector('.scrim').onclick = () => { if (opt.modal) return; closeSheet(id); opt.onClose && opt.onClose(); };
  AU.sfx('uiOpen');
  return s;
}
function closeSheet(id) { const s = document.getElementById(id); if (s) s.remove(); }
function confirmBox(title, text, yes, no, onYes, danger) {
  const s = sheet('confirm', title, '', `<div class="note">${text}</div>`, `<button class="btn ghost" data-n>${no}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-y>${yes}</button>`, { modal: true });
  s.querySelector('[data-n]').onclick = () => closeSheet('confirm');
  s.querySelector('[data-y]').onclick = () => { closeSheet('confirm'); onYes(); };
}

/* ====================================================================== */
const UI = {
  swapOpen: false,
  /* ---------- 標題 ---------- */
  title() {
    S.mode = 'title'; $('#hud').classList.add('hidden'); $('#ui').innerHTML = '';
    const has = !!bestSave();
    const s = el('div', 'screen'); s.id = 'title';
    s.innerHTML = `<div class="logo"><div class="cn">竊夢者</div><div class="en">DREAMTHIEF</div><div class="tl">在夢主醒來以前，帶著記憶離開</div></div>
      <div class="tap">輕觸以入夢</div><div class="menu hidden">${has ? '<button class="btn primary" data-c>繼續</button>' : '<button class="btn primary" data-n>入夢</button>'}
      ${has ? '<button class="btn ghost small" data-n>從頭開始</button>' : ''}<button class="btn ghost small" data-s>設定</button></div><div class="ver">v1.0</div>`;
    $('#ui').appendChild(s);
    const reveal = () => { AU.init(); AU.music('title'); s.querySelector('.tap').classList.add('hidden'); s.querySelector('.menu').classList.remove('hidden'); s.onpointerdown = null; };
    s.onpointerdown = e => { if (e.target.closest('button')) return; reveal(); };
    s.querySelector('.tap').onclick = reveal;
    const c = s.querySelector('[data-c]'); if (c) c.onclick = () => { AU.init(); G = fixG(bestSave()); refreshPerks(); UI.hub(); };
    s.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      AU.init();
      const go = () => { G = newG(); saveGame(); UI.playScene({ lines: PROLOGUE, scene: 'prologue' }, () => { UI.hub(HUB_FIRST); }); };
      if (has) confirmBox('從頭開始', '目前的進度會被覆蓋。確定嗎？', '從頭開始', '取消', go, true); else go();
    });
    s.querySelector('[data-s]').onclick = () => { AU.init(); UI.settings(); };
  },
  settings() {
    const g = G || newG();
    const row = (k, n) => `<div class="upg"><div class="tx"><div class="n">${n}</div></div><button class="btn small ${g.settings[k] ? 'primary' : 'ghost'}" data-k="${k}">${g.settings[k] ? '開' : '關'}</button></div>`;
    const s = sheet('set', '設定', '', `<div class="list">${row('music', '音樂')}${row('sfx', '音效')}${row('shake', '畫面震動')}</div>
      <div class="sec">存檔碼</div><div class="note">換手機或電腦時，把存檔碼複製過去貼上，就能接著玩。</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn small" data-ex ${G ? '' : 'disabled'}>產生存檔碼</button><button class="btn small ghost" data-im>貼上存檔碼</button></div>
      <textarea id="codebox" style="width:100%;height:80px;margin-top:10px;background:#0c0a12;color:#cfc8ea;border:1px solid #3a3450;border-radius:4px;font-size:11px;display:none"></textarea>`, null);
    s.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; g.settings[k] = !g.settings[k]; if (G) saveGame(); AU.applyVol(); UI.settings(); });
    const box = s.querySelector('#codebox');
    s.querySelector('[data-ex]').onclick = () => { box.style.display = 'block'; box.value = exportCode(); box.select(); try { navigator.clipboard.writeText(box.value).then(() => toast('已複製存檔碼', 'good'), () => toast('請長按文字框，手動複製')); } catch (e) { toast('請長按文字框，手動複製'); } };
    s.querySelector('[data-im]').onclick = () => {
      if (box.style.display === 'none') { box.style.display = 'block'; box.value = ''; box.placeholder = '把存檔碼貼在這裡，再按一次「貼上存檔碼」'; box.focus(); return; }
      try { G = importCode(box.value); refreshPerks(); saveGame(); toast('讀取成功', 'good'); closeSheet('set'); UI.hub(); } catch (e) { toast('存檔碼不對：' + e.message, 'bad'); }
    };
  },

  /* ---------- 夜當 ---------- */
  hub(lines) {
    S.mode = 'hub'; S.paused = false; W = null;
    $('#hud').classList.add('hidden'); $('#ui').innerHTML = '';
    AU.music('hub'); AU.setTension(0);
    const s = el('div', 'screen'); s.id = 'hub';
    const pend = G.pending.length;
    const tgt = CH[G.sel] && G.chapters[G.sel].unlocked ? G.sel : 0;
    s.innerHTML = `<div class="top"><div class="place">夜當<small>NIGHT PAWN</small></div><div class="cash money">${fmt(G.money)}</div></div>
      <div class="talk"><div class="bubble hidden"></div></div>
      <div class="dock">
        <button class="dockbtn" data-p><span class="ic">當</span><span class="lb">當鋪</span>${pend ? `<span class="dot">${pend}</span>` : ''}</button>
        <button class="dockbtn" data-a><span class="ic">匣</span><span class="lb">記憶匣</span></button>
        <button class="dockbtn" data-w><span class="ic">工</span><span class="lb">工作台</span></button>
        <button class="dockbtn" data-m><span class="ic">≡</span><span class="lb">選單</span></button>
        <button class="btn primary go" data-go>入夢</button>
      </div>`;
    $('#ui').appendChild(s);
    s.querySelector('[data-p]').onclick = () => UI.pawn();
    s.querySelector('[data-a]').onclick = () => UI.archive();
    s.querySelector('[data-w]').onclick = () => UI.workshop();
    s.querySelector('[data-m]').onclick = () => UI.menu();
    s.querySelector('[data-go]').onclick = () => UI.prep();
    UI.hubTalk(lines || [rnd.pick(G.lastResult === 'lost' ? HUB_DEAD : HUB_IDLE)]);
    saveGame();
  },
  hubTalk(lines) {
    const b = $('#hub .bubble'); if (!b) return;
    const q = lines.slice();
    const next = () => {
      if (!q.length) { b.classList.add('hidden'); b.onclick = null; return; }
      const [w, t] = q.shift(), who = WHO[w] || WHO.sys;
      b.classList.remove('hidden'); b.style.pointerEvents = 'auto'; b.style.borderLeftColor = who.c;
      b.innerHTML = (who.n ? `<b style="color:${who.c}">${esc(who.n)}</b>` : '') + esc(t) + (q.length ? ' <span class="mute" style="font-size:11px">▸</span>' : '');
      AU.sfx('page');
      clearTimeout(UI._ht); UI._ht = setTimeout(next, 2200 + t.length * 110);
    };
    b.onclick = () => { clearTimeout(UI._ht); next(); };
    next();
  },
  menu() {
    const s = sheet('menu', '選單', '', `<div class="list">
      <button class="btn ghost" data-s>設定與存檔碼</button><button class="btn ghost" data-h>怎麼玩</button>
      <button class="btn ghost" data-t>回到標題</button></div>
      <div class="sec">紀錄</div><div class="note">潛入 ${G.stats.dives} 次・成功撤離 ${G.stats.extracts} 次・迷失 ${G.stats.lost} 次<br>解決夢衛 ${G.stats.kills}・背刺 ${G.stats.assassins}・賺過 ${fmt(G.stats.earned)}
      ${G.endings.length ? '<br>看過的結局：' + G.endings.map(k => '「' + ENDINGS[k].n + '」').join('、') : ''}</div>`, null);
    s.querySelector('[data-s]').onclick = () => { closeSheet('menu'); UI.settings(); };
    s.querySelector('[data-h]').onclick = () => { closeSheet('menu'); UI.howto(); };
    s.querySelector('[data-t]').onclick = () => { saveGame(); UI.title(); };
  },
  howto() {
    sheet('howto', '怎麼玩', '', `<div class="note">
      <b class="gold">搜、打、撤</b><br>潛進夢主的夢，翻櫃子找記憶，在夢主醒來以前離開。帶出來的記憶可以賣錢，也可以留著。<br><br>
      <b class="gold">移動</b><br>在畫面空白處按住拖曳。推一半是「靜步」，沒有腳步聲；推到底是「跑」，會吵醒附近睡著的夢衛。<br><br>
      <b class="gold">翻找</b><br>靠近櫃子站著不動，就會開始翻。<br><br>
      <b class="gold">戰鬥與潛行</b><br>夢器會自動瞄準已經發現你的夢衛。從背後靠近沒發現你的夢衛，會自動背刺，沒有聲音。拿燈的巡夜者被照到太久會尖叫。<br><br>
      <b class="gold">清醒度</b><br>上方的眼睛越張越開：時間、槍聲、尖叫都會讓夢主越來越清醒。滿了以後夢會崩塌，三十秒內沒出去就會迷失，身上的東西全部掉光（保險格除外）。<br><br>
      <b class="gold">撤離</b><br>鐘門：敲鐘後守住十二秒，全部帶走。墜窗：立刻離開，只抱得住六格。渡夢人：給他一段鮮憶以上的記憶。暫停選單的「緊急甦醒」：只留保險格。漩梯可以下潛到更深、更值錢的一層。<br><br>
      <b class="gold">鍵盤</b><br>WASD 移動、按住 Shift 靜步、空白鍵閃身、E 夢具、Q 吃糖、F 互動、B 背包、Esc 暫停。</div>`, null);
  },

  /* 當鋪：賣、留、買回 */
  pawn() {
    const pend = G.pending, sold = G.sold;
    const cheap = pend.filter(i => i.rar <= 1 && i.kind === 'gen');
    let body = `<div class="note">每一段記憶都可以「賣」換錢，或「留」進記憶匣。人生記憶集滿一組，會解鎖那個人的故事。</div>`;
    body += `<div class="sec">待處理（${pend.length}）</div>`;
    if (!pend.length) body += `<div class="note mute">櫃台上沒有東西。</div>`;
    else {
      if (cheap.length > 1) body += `<button class="btn small ghost" data-bulk style="margin-bottom:10px">碎憶、淡憶全部賣掉（+${fmt(cheap.reduce((s, i) => s + sellPrice(i), 0))}）</button>`;
      body += `<div class="list">` + pend.map(it => ticket(it, `<button class="btn small" data-sell="${it.id}">賣 ${fmt(sellPrice(it))}</button><button class="btn small ghost" data-keep="${it.id}">留</button>`)).join('') + `</div>`;
    }
    if (sold.length) {
      body += `<div class="sec">回購櫃</div><div class="note">人生記憶這類東西，夜當會替你收在後面的櫃子，隨時能買回來。價錢是三倍。</div><div class="list" style="margin-top:8px">`;
      body += sold.map(it => ticket(it, `<button class="btn small" data-buy="${it.id}" ${G.money < it.val * 3 ? 'disabled' : ''}>買回 ${fmt(it.val * 3)}</button>`)).join('') + `</div>`;
    }
    const s = sheet('pawn', '當鋪', `<span class="money">${fmt(G.money)}</span>`, body, null, { onClose: () => UI.hub([]) });
    const doSell = (it) => {
      G.pending = G.pending.filter(x => x.id !== it.id);
      G.money += sellPrice(it); G.stats.earned += sellPrice(it);
      if (it.kind !== 'gen') G.sold.push(it);
      AU.sfx('sell'); saveGame(); UI.pawn();
    };
    s.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const it = G.pending.find(x => x.id === b.dataset.sell); if (!it) return;
      if (it.kind === 'qing') confirmBox('要賣嗎？', `「${esc(it.n)}」<br><br><span class="mute">……我盯著它看了很久。</span><br><br>賣掉的話，之後要用三倍價錢（${fmt(it.val * 3)}）才買得回來。`, '賣', '不賣了', () => doSell(it));
      else if (it.kind === 'life') confirmBox('要賣嗎？', `「${esc(it.n)}」是${esc(CH[it.ch].dreamer)}人生的一部分。集滿一組才看得到${heOf(CH[it.ch])}的故事。<br>賣掉的話，之後要用三倍價錢才買得回來。`, '賣', '不賣了', () => doSell(it));
      else doSell(it);
    });
    s.querySelectorAll('[data-keep]').forEach(b => b.onclick = () => {
      const it = G.pending.find(x => x.id === b.dataset.keep); if (!it) return;
      G.pending = G.pending.filter(x => x.id !== it.id); G.archive.push(it); AU.sfx('keep');
      const before = Object.keys(G.perks).length; refreshPerks();
      if (Object.keys(G.perks).length > before && it.kind === 'life') { const ch = CH[it.ch]; toast(`集滿了「${ch.life.set}」：${ch.life.perk.n}`, 'gold'); }
      saveGame(); UI.pawn();
    });
    const bulk = s.querySelector('[data-bulk]'); if (bulk) bulk.onclick = () => { let sum = 0; for (const it of cheap) { sum += sellPrice(it); } G.pending = G.pending.filter(x => !cheap.includes(x)); G.money += sum; G.stats.earned += sum; AU.sfx('sell'); saveGame(); UI.pawn(); };
    s.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const it = G.sold.find(x => x.id === b.dataset.buy); if (!it || G.money < it.val * 3) return;
      G.money -= it.val * 3; G.sold = G.sold.filter(x => x.id !== it.id); G.archive.push(it); refreshPerks(); AU.sfx('buy'); saveGame(); toast('買回來了：' + it.n, 'good'); UI.pawn();
    });
  },

  /* 記憶匣 */
  archive(tab) {
    tab = tab ?? (UI._atab || 0); UI._atab = tab;
    const ch = CH[tab];
    const tabs = CH.map((c, i) => `<button class="btn small ${i === tab ? 'primary' : 'ghost'}" data-tab="${i}" style="padding:0 .6em">${i === 4 ? '晴' : c.nick}</button>`).join('');
    let body = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${tabs}</div>`;
    const kept = G.archive.filter(i => i.ch === tab);
    if (tab < 4) {
      const core = G.archive.find(i => i.key === 'core_' + ch.id);
      body += `<div class="sec">核心記憶</div>` + (core ? ticket(core, `<button class="btn small ghost" data-replay="${tab}">重看</button>`) : `<div class="note mute">還沒拿到。在${esc(ch.dreamer)}的夢核，由心魔看守。</div>`);
      body += `<div class="sec">人生記憶・${esc(ch.life.set)}</div><div class="list">`;
      ch.life.items.forEach((x, i) => { const it = G.archive.find(a => a.key === ch.id + '_life' + i); body += it ? ticket(it) : `<div class="ticket" style="opacity:.45"><div class="orb" style="background:#1a1622;border:1px dashed #555"></div><div class="body"><div class="nm">？？？</div><div class="fl">在深眠以下的櫃子裡。</div></div></div>`; });
      body += `</div>`;
      const done = G.perks[ch.id];
      body += done ? `<div class="sec">夢語</div><div class="note" style="white-space:pre-wrap;color:#e8e2d4">${esc(ch.life.story)}</div><div class="note gold" style="margin-top:8px">永久加成「${ch.life.perk.n}」：${ch.life.perk.d}</div>` : `<div class="note mute" style="margin-top:8px">集滿四段，會看見${esc(ch.dreamer)}的故事，並得到永久加成「${ch.life.perk.n}」。</div>`;
      const q = ch.qing || null;
      const qs = (ch.qingSet || (q ? [q] : [])).map(x => G.archive.find(a => a.key === x.key)).filter(Boolean);
      if (qs.length) body += `<div class="sec">不是${esc(ch.nick)}的東西</div><div class="list">` + qs.map(it => ticket(it)).join('') + `</div>`;
    } else {
      const n = qingKept();
      body += `<div class="sec">那一夜</div><div class="note">${CH.slice(0, 4).map((c, i) => G.chapters[i].core ? `<span class="gold">「${c.core.n}」</span>` : '<span class="mute">「？？？」</span>').join('　')}</div>`;
      body += `<div class="sec">晴的記憶（${n}/5）</div><div class="list">`;
      QING.forEach(q => { const it = G.archive.find(a => a.key === q.key); body += it ? ticket(it) : `<div class="ticket" style="opacity:.4"><div class="orb" style="background:#1a1622;border:1px dashed #555"></div><div class="body"><div class="nm">？？？</div></div></div>`; });
      body += `</div>`;
      if (G.endings.length) body += `<div class="sec">結局</div><div class="note">${G.endings.map(k => '「' + ENDINGS[k].n + '」').join('、')}</div>`;
    }
    const others = kept.filter(i => i.kind === 'gen');
    if (others.length) body += `<div class="sec">收著的記憶（${others.length}）</div><div class="list">` + others.map(it => ticket(it, `<button class="btn small ghost" data-sellk="${it.id}">賣 ${fmt(sellPrice(it))}</button>`)).join('') + `</div>`;
    const s = sheet('arch', '記憶匣', `${G.archive.length} 段`, body, null, { onClose: () => UI.hub([]) });
    s.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { AU.sfx('ui'); UI.archive(+b.dataset.tab); });
    s.querySelectorAll('[data-replay]').forEach(b => b.onclick = () => { const c = CH[+b.dataset.replay]; UI.playScene(c.core, () => UI.archive()); });
    s.querySelectorAll('[data-sellk]').forEach(b => b.onclick = () => { const it = G.archive.find(x => x.id === b.dataset.sellk); if (!it) return; G.archive = G.archive.filter(x => x.id !== it.id); G.money += sellPrice(it); G.stats.earned += sellPrice(it); AU.sfx('sell'); saveGame(); UI.archive(); });
  },

  /* 工作台 */
  workshop() {
    const lvPips = (l, m) => `<div class="pipsL">${Array.from({ length: m }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = `<div class="sec">夢器</div><div class="list">`;
    for (const id of WEAPON_ORDER) {
      const w = WEAPONS[id], st = G.weapons[id];
      let act;
      if (!st.owned) act = `<button class="btn small" data-wu="${id}" ${G.money < w.cost ? 'disabled' : ''}>解鎖 ${fmt(w.cost)}</button>`;
      else if (st.lvl < 5) act = `<button class="btn small" data-wl="${id}" ${G.money < WEAPON_LV_COST[st.lvl] ? 'disabled' : ''}>升級 ${fmt(WEAPON_LV_COST[st.lvl])}</button>`;
      else act = `<span class="gold" style="font-size:12px">滿級</span>`;
      body += `<div class="upg"><div class="ic">${w.n[0]}</div><div class="tx"><div class="n">${w.n} <span class="mute" style="font-size:11px">${w.en}</span></div><div class="d">${w.d}<br><span class="mute">3 級：${w.lv3}・5 級：${w.lv5}</span></div>${st.owned ? lvPips(st.lvl, 5) : ''}</div>${act}</div>`;
    }
    body += `</div><div class="sec">夢具</div><div class="list">`;
    for (const id of TOOL_ORDER) {
      const t = TOOLS[id], own = G.tools[id];
      body += `<div class="upg"><div class="ic">${t.n[0]}</div><div class="tx"><div class="n">${t.n}</div><div class="d">${t.d}${t.cd ? `（冷卻 ${t.cd} 秒）` : ''}</div></div>${own ? '<span class="mute" style="font-size:12px">已有</span>' : `<button class="btn small" data-tu="${id}" ${G.money < t.cost ? 'disabled' : ''}>解鎖 ${fmt(t.cost)}</button>`}</div>`;
    }
    body += `</div><div class="sec">身體與裝備</div><div class="list">`;
    for (const id of META_ORDER) {
      const m = META[id], l = G.meta[id];
      body += `<div class="upg"><div class="ic">${m.ic}</div><div class="tx"><div class="n">${m.n}</div><div class="d">${m.d(l)}${l < m.max ? `<br><span class="mute">下一級：${m.d(l + 1)}</span>` : ''}</div>${lvPips(l, m.max)}</div>${l < m.max ? `<button class="btn small" data-mu="${id}" ${G.money < m.cost[l] ? 'disabled' : ''}>${fmt(m.cost[l])}</button>` : '<span class="gold" style="font-size:12px">滿級</span>'}</div>`;
    }
    const maxC = 3 + G.meta.candy * 2;
    body += `</div><div class="sec">醒神糖</div><div class="upg"><div class="ic">糖</div><div class="tx"><div class="n">醒神糖 × ${G.candyStock}</div><div class="d">潛入時吃一顆回 45 生命。每次最多帶 ${maxC} 顆；迷失的話，帶進去的會掉光。</div></div><button class="btn small" data-candy ${G.money < CANDY_PRICE ? 'disabled' : ''}>買 ${CANDY_PRICE}</button></div>`;
    const s = sheet('ws', '工作台', `<span class="money">${fmt(G.money)}</span>`, body, null, { onClose: () => UI.hub([]) });
    const buy = (cost, fn) => { if (G.money < cost) return; G.money -= cost; fn(); AU.sfx('buy'); saveGame(); const sc = s.querySelector('.bd').scrollTop; UI.workshop(); $('#ws .bd').scrollTop = sc; };
    s.querySelectorAll('[data-wu]').forEach(b => b.onclick = () => { const id = b.dataset.wu; buy(WEAPONS[id].cost, () => { G.weapons[id].owned = true; toast('解鎖了' + WEAPONS[id].n, 'good'); }); });
    s.querySelectorAll('[data-wl]').forEach(b => b.onclick = () => { const id = b.dataset.wl; buy(WEAPON_LV_COST[G.weapons[id].lvl], () => G.weapons[id].lvl++); });
    s.querySelectorAll('[data-tu]').forEach(b => b.onclick = () => { const id = b.dataset.tu; buy(TOOLS[id].cost, () => { G.tools[id] = true; toast('解鎖了' + TOOLS[id].n, 'good'); }); });
    s.querySelectorAll('[data-mu]').forEach(b => b.onclick = () => { const id = b.dataset.mu; buy(META[id].cost[G.meta[id]], () => G.meta[id]++); });
    s.querySelector('[data-candy]').onclick = () => buy(CANDY_PRICE, () => G.candyStock++);
  },

  /* 入夢準備 */
  prep() {
    if (!G.chapters[G.sel] || !G.chapters[G.sel].unlocked) G.sel = 0;
    const sel = G.sel, maxC = Math.min(3 + G.meta.candy * 2, G.candyStock);
    G.loadout.candies = Math.min(G.loadout.candies, maxC);
    if (!G.weapons[G.loadout.weapon].owned) G.loadout.weapon = 'revolver';
    if (!G.tools[G.loadout.tool]) G.loadout.tool = 'decoy';
    let body = `<div class="list">`;
    CH.forEach((c, i) => {
      const st = G.chapters[i], lifeN = c.life ? c.life.items.filter((x, k) => G.archive.some(a => a.key === c.id + '_life' + k)).length : 0;
      body += `<div class="dossier ${st.unlocked ? '' : 'locked'} ${i === sel ? 'sel' : ''}" data-ch="${i}"><canvas width="148" height="192"></canvas><div style="flex:1;min-width:0">
        <div class="nm">${st.unlocked ? esc(c.title) : '？？？'}</div><div class="who">${st.unlocked ? esc(c.who) : '還沒有人留下委託'}</div>
        ${st.unlocked ? `<div class="ds">${esc(c.desc)}</div><div class="ds" style="color:#c9b6ff">蛾：「${esc(c.moth)}」</div>
        <div class="st"><span class="tag">夢的規則：${esc(c.rule.n)}</span>${i < 4 ? `<span class="tag" style="${st.core ? 'color:#ff8a94;border-color:#ff8a94' : ''}">核心記憶 ${st.core ? '✓' : '—'}</span><span class="tag">人生記憶 ${lifeN}/4</span>` : ''}${st.best >= 0 ? `<span class="tag">最深：${['淺眠', '深眠', '夢核'][st.best]}</span>` : ''}</div>` : ''}
      </div></div>`;
    });
    body += `</div>`;
    const c = CH[sel];
    body += `<div class="sec">${esc(c.rule.n)}</div><div class="note">${esc(c.rule.d)}</div>`;
    if (sel < 4 || true) { const sd = sideFor(sel).map(id => SIDE.find(x => x.id === id)); body += `<div class="sec">副委託</div><div class="list">` + sd.map(x => `<div class="contract"><span><b class="gold">${x.n}</b>　${x.d}</span><span class="money">${fmt(x.r * (1 + sel * .25))}</span></div>`).join('') + `</div>`; }
    body += `<div class="sec">夢器</div><div class="loadrow">` + WEAPON_ORDER.map(id => `<button class="pick ${G.loadout.weapon === id ? 'sel' : ''} ${G.weapons[id].owned ? '' : 'off'}" data-w="${id}"><div class="n">${WEAPONS[id].n}</div><div class="d">${G.weapons[id].owned ? 'Lv ' + G.weapons[id].lvl : '工作台解鎖'}</div></button>`).join('') + `</div>`;
    body += `<div class="sec">夢具</div><div class="loadrow">` + TOOL_ORDER.map(id => `<button class="pick ${G.loadout.tool === id ? 'sel' : ''} ${G.tools[id] ? '' : 'off'}" data-t="${id}"><div class="n">${TOOLS[id].n}</div><div class="d">${G.tools[id] ? (TOOLS[id].cd ? '冷卻 ' + TOOLS[id].cd + ' 秒' : '一次') : '工作台解鎖'}</div></button>`).join('') + `</div>`;
    body += `<div class="sec">醒神糖</div><div style="display:flex;align-items:center;gap:12px"><button class="btn small ghost" data-c="-1">−</button><span class="serif" style="font-size:18px">${G.loadout.candies}</span><button class="btn small ghost" data-c="1">＋</button><span class="mute" style="font-size:12px">庫存 ${G.candyStock}・最多帶 ${3 + G.meta.candy * 2}</span></div>`;
    const s = sheet('prep', '入夢', '選一個夢主', body, `<button class="btn primary" data-go style="flex:1">潛入${esc(c.dreamer)}的夢</button>`, { wide: true });
    s.querySelectorAll('.dossier canvas').forEach((cv, i) => drawDreamerCard(cv, i));
    s.querySelectorAll('[data-ch]').forEach(d => d.onclick = () => { const i = +d.dataset.ch; if (!G.chapters[i].unlocked) { toast('還沒有這個人的委託', 'bad'); return; } G.sel = i; AU.sfx('ui'); const sc = s.querySelector('.bd').scrollTop; UI.prep(); $('#prep .bd').scrollTop = sc; });
    s.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const id = b.dataset.w; if (!G.weapons[id].owned) { toast('在工作台解鎖', 'bad'); return; } G.loadout.weapon = id; AU.sfx('ui'); const sc = s.querySelector('.bd').scrollTop; UI.prep(); $('#prep .bd').scrollTop = sc; });
    s.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const id = b.dataset.t; if (!G.tools[id]) { toast('在工作台解鎖', 'bad'); return; } G.loadout.tool = id; AU.sfx('ui'); const sc = s.querySelector('.bd').scrollTop; UI.prep(); $('#prep .bd').scrollTop = sc; });
    s.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { G.loadout.candies = clamp(G.loadout.candies + +b.dataset.c, 0, maxC); AU.sfx('ui'); const sc = s.querySelector('.bd').scrollTop; UI.prep(); $('#prep .bd').scrollTop = sc; });
    s.querySelector('[data-go]').onclick = () => UI.startDive(sel);
  },
  startDive(chi) {
    if (chi === 4 && !G.flags.finalIntro) { G.flags.finalIntro = 1; saveGame(); }
    G.candyStock -= G.loadout.candies;
    G.stats.dives++; G.chapters[chi].dives++;
    G.lastResult = null;
    saveGame();
    closeSheet('prep');
    UI.fadeTo(() => {
      $('#ui').innerHTML = '';
      newDive(chi);
      S.mode = 'dive'; S.paused = false;
      $('#hud').classList.remove('hidden');
      R.snap = true; RAD.q = []; RAD.cur = null; $('#radio').classList.remove('show');
      UI.banner(CH[chi].title, CH[chi].dreamer + '的夢・淺眠');
      AU.music('dream', chi, 0);
      UI.hudInit();
      if (!G.flags.tut) { G.flags.tut = 1; UI.hint('在畫面空白處按住拖曳來移動', 5); }
    });
  },

  /* ---------- 遊戲中 ---------- */
  hudInit() {
    const p = W.players[0];
    $('#bTool .k').textContent = TOOLS[p.tool.id].n;
    UI._hud = {};
    let bb = $('#bossbar'); if (bb) bb.remove(); $('#mini').style.visibility = ''; $('#radio').style.top = '';
  },
  hud(dt) {
    if (!W) return;
    const p = W.players[0], h = UI._hud || (UI._hud = {});
    const set = (k, v, fn) => { if (h[k] !== v) { h[k] = v; fn(v); } };
    set('hp', Math.ceil(p.hp) + '/' + p.hpMax, () => { $('#hp .fill').style.width = (p.hp / p.hpMax * 100) + '%'; $('#hp .num').textContent = Math.ceil(p.hp) + ' / ' + p.hpMax; });
    h.lag = lerp(h.lag ?? 1, p.hp / p.hpMax, Math.min(1, dt * 2.5)); $('#hp .lag').style.width = (h.lag * 100) + '%';
    const wk = Math.round(W.wake * 2) / 2;
    set('wake', wk + ':' + (W.collapse ? Math.ceil(W.collapse) : 0), () => {
      $('#wake .fill').style.width = W.wake + '%';
      const lbl = W.collapse ? `夢崩　${Math.ceil(W.collapse)}` : ['熟睡', '淺睡', '輾轉', '將醒'][W.stage];
      $('#wake .lbl').textContent = lbl; $('#wake').classList.toggle('collapse', !!W.collapse);
      const o = clamp(W.wake / 100, 0, 1); $('#eyeLid').setAttribute('d', `M1 10 Q15 ${10 - o * 9} 29 10 Q15 ${10 + o * 9} 1 10Z`); $('#eyePup').setAttribute('r', (o * 4.2).toFixed(2));
    });
    set('depth', W.depth + W.ch.dreamer, () => $('#depth').textContent = W.ch.nick + '・' + ['淺眠', '深眠', '夢核'][W.depth]);
    const used = bagUsed(p);
    set('bag', used + '/' + p.cap + ':' + p.bag.map(i => i.rar + (i.pocket ? 'p' : '')).join(','), () => {
      $('#bag .c').textContent = used + '/' + p.cap; $('#bag').classList.toggle('full', used >= p.cap);
      let pips = ''; for (const it of p.bag) for (let k = 0; k < it.size; k++) pips += `<i class="${it.pocket ? 'lock' : ''}" style="background:${RAR[it.rar].c}"></i>`; for (let k = used; k < p.cap; k++) pips += '<i></i>';
      $('#bag .pips').innerHTML = pips;
      if (p.carry) $('#bag .c').textContent = '背著晴';
    });
    set('lvl', p.lvl + ':' + p.xp, () => { $('#lvl').textContent = 'Lv ' + p.lvl; $('#xp .fill').style.width = (p.xp / xpNeed(p.lvl) * 100) + '%'; });
    set('dash', p.dash + ':' + p.dashMax, () => $('#bDash .s').textContent = p.dashMax > 1 ? '×' + p.dash : '');
    set('candy', p.candies, () => { $('#bCandy .s').textContent = p.candies; $('#bCandy').style.opacity = p.candies ? 1 : .45; });
    const tl = p.tool.id === 'incense' ? (p.tool.uses ? '' : '用完') : p.tool.cd > 0 ? Math.ceil(p.tool.cd) + '' : '';
    set('tool', tl, v => $('#bTool .s').textContent = v);
    cdSweep($('#bDash .cd'), p.dash < p.dashMax && p.dashCd > 0 ? p.dashCd / (3 * p.st.dashCd) : 0, p.dash <= 0);
    cdSweep($('#bTool .cd'), p.tool.cd > 0 ? p.tool.cd / TOOLS[p.tool.id].cd : (p.tool.id === 'incense' && !p.tool.uses ? 1 : 0), true);
    const act = p.act ? p.act.label : '';
    set('act', act, v => { const b = $('#bAct'); b.classList.toggle('hidden', !v); $('#bAct .k').textContent = v; });
    // 頭目血條
    const b = W.boss;
    if (b && b.awake && !b.dead) {
      let bb = $('#bossbar');
      if (!bb) { bb = el('div', '', `<div style="font-family:var(--serif);letter-spacing:.3em;font-size:13px;color:#ffb3ba;text-align:center;text-shadow:0 1px 4px #000">${esc(W.ch.boss.n)}</div><div style="height:7px;background:rgba(0,0,0,.6);border:1px solid rgba(255,120,130,.5);border-radius:4px;overflow:hidden;margin-top:3px"><div class="f" style="height:100%;background:linear-gradient(90deg,#ff3b4f,#ff9aa4);width:100%"></div></div>`); bb.id = 'bossbar'; bb.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(var(--sat) + 62px);width:min(70vw,360px);pointer-events:none'; $('#hud').appendChild(bb); $('#radio').style.top = 'calc(var(--sat) + 114px)'; }
      bb.querySelector('.f').style.width = (b.hp / b.hpMax * 100) + '%'; $('#mini').style.visibility = 'hidden';
    } else { const bb = $('#bossbar'); if (bb) { bb.remove(); $('#radio').style.top = ''; $('#mini').style.visibility = ''; } }
    AU.setTension(W.collapse ? 4 : W.stage + (p.hp < p.hpMax * .3 ? 1 : 0));
  },
  hint(text, dur = 3) { const h = $('#hint'); h.textContent = text; h.classList.add('show'); clearTimeout(UI._hint); UI._hint = setTimeout(() => h.classList.remove('show'), dur * 1000); },
  banner(a, b, boss) { const bn = $('#banner'); bn.querySelector('.a').textContent = a; bn.querySelector('.b').textContent = b || ''; bn.querySelector('.a').style.color = boss ? '#ffd0d4' : ''; bn.classList.add('show'); clearTimeout(UI._bn); UI._bn = setTimeout(() => bn.classList.remove('show'), 2600); },
  fadeTo(fn) {
    let f = $('#fade'); if (!f) { f = el('div'); f.id = 'fade'; f.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s;pointer-events:none;z-index:40'; $('#app').appendChild(f); }
    f.style.pointerEvents = 'auto'; f.style.opacity = 1;
    setTimeout(() => { try { fn(); } catch (e) { console.error(e); } setTimeout(() => { f.style.opacity = 0; f.style.pointerEvents = 'none'; }, 80); }, 380);
  },
  pause() {
    if (S.mode !== 'dive' || !W || W.out) return;
    S.paused = true;
    const s = sheet('pause', '暫停', W.ch.title, `<div class="list">
      <button class="btn primary" data-r>繼續</button>
      <button class="btn" data-b>背包與保險格</button>
      <button class="btn danger" data-w>緊急甦醒（只留保險格）</button>
      <button class="btn ghost" data-h>怎麼玩</button>
      <div style="display:flex;gap:8px"><button class="btn small ghost" data-mu style="flex:1">音樂：${G.settings.music ? '開' : '關'}</button><button class="btn small ghost" data-sf style="flex:1">音效：${G.settings.sfx ? '開' : '關'}</button></div></div>`, null, { onClose: () => S.paused = false });
    s.querySelector('[data-r]').onclick = () => { closeSheet('pause'); S.paused = false; };
    s.querySelector('[data-b]').onclick = () => { closeSheet('pause'); UI.bag(); };
    s.querySelector('[data-h]').onclick = () => { UI.howto(); };
    s.querySelector('[data-mu]').onclick = () => { G.settings.music = !G.settings.music; AU.applyVol(); closeSheet('pause'); UI.pause(); };
    s.querySelector('[data-sf]').onclick = () => { G.settings.sfx = !G.settings.sfx; AU.applyVol(); closeSheet('pause'); UI.pause(); };
    s.querySelector('[data-w]').onclick = () => confirmBox('緊急甦醒', '馬上醒來。背包裡只有保險格裡的東西帶得走，其他的會留在夢裡。', '醒來', '取消', () => { closeSheet('pause'); S.paused = false; extract(W.players[0], 'wake'); }, true);
  },
  bag() {
    if (!W) return;
    S.paused = true;
    const p = W.players[0];
    const used = bagUsed(p), pu = pocketUsed(p);
    let body = `<div class="note">放進<b class="gold">保險格</b>的記憶，就算迷失也帶得走（保險格 ${pu}/${p.pocketCap}）。丟掉的記憶會留在地上。</div><div class="bagGrid" style="margin-top:10px">`;
    if (!p.bag.length) body += `<div class="note mute">背包是空的。</div>`;
    const sorted = p.bag.slice().sort((a, b) => (b.pocket - a.pocket) || b.rar - a.rar);
    for (const it of sorted) body += `<div class="itemrow"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n" style="color:${mixHex(RAR[it.rar].c, '#fff', .3)}">${it.pocket ? '<span class="tag" style="border-color:#53f0d6;color:#53f0d6;margin-right:4px">保險</span>' : ''}${esc(it.n)}</div><div class="m">${RAR[it.rar].n}・${it.size} 格${it.val ? '・' + fmt(it.val) : ''}</div></div>
      <button class="btn small ${it.pocket ? 'primary' : 'ghost'}" data-pk="${it.id}" ${!it.pocket && pu + it.size > p.pocketCap ? 'disabled' : ''}>${it.pocket ? '取出' : '保險'}</button><button class="btn small ghost" data-dr="${it.id}">丟</button></div>`;
    body += `</div>`;
    const s = sheet('bagS', '背包', `${used}/${p.cap} 格`, body, null, { onClose: () => S.paused = false });
    s.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const it = p.bag.find(x => x.id === b.dataset.pk); if (!it) return; if (!it.pocket && pocketUsed(p) + it.size > p.pocketCap) return; it.pocket = !it.pocket; AU.sfx('ui'); UI.bag(); });
    s.querySelectorAll('[data-dr]').forEach(b => b.onclick = () => { const it = p.bag.find(x => x.id === b.dataset.dr); if (!it) return; p.bag = p.bag.filter(x => x !== it); it.pocket = false; W.picks.push({ k: 'mem', x: p.x + fx(-20, 20), y: p.y + 24, z: 0, vz: null, vx: 0, vy: 0, t: 0, item: it, beam: 1, ign: W.t + 2 }); AU.sfx('drop', it.rar); UI.bag(); });
  },
  openSwap(p, k) {
    UI.swapOpen = true; S.paused = true;
    const it = k.item, sel = new Set();
    const loose = p.bag.filter(x => !x.pocket).sort((a, b) => a.val / a.size - b.val / b.size);
    const done = () => { UI.swapOpen = false; S.paused = false; closeSheet('swap'); };
    const render = () => {
      const used = bagUsed(p), freed = loose.filter(x => sel.has(x.id)).reduce((a, x) => a + x.size, 0), need = it.size - (p.cap - used), ok = freed >= need;
      let body = `<div class="note">背包滿了。新的這段要 <b class="gold">${it.size} 格</b>：</div>` + ticket(it) + `<div class="sec">要丟下哪幾段？（${freed}/${need} 格）</div><div class="bagGrid">`;
      if (!loose.length) body += `<div class="note mute">背包裡都是保險格的東西，換不了。</div>`;
      for (const x of loose) body += `<div class="itemrow ${sel.has(x.id) ? 'new' : ''}" data-k="${x.id}"><div class="orb" style="${orbStyle(x.rar)}"></div><div class="tx"><div class="n">${esc(x.n)}</div><div class="m">${RAR[x.rar].n}・${x.size} 格・${fmt(x.val)}</div></div><span class="serif">${sel.has(x.id) ? '丟下' : '留著'}</span></div>`;
      body += `</div>`;
      const s = sheet('swap', '要換嗎？', `${used}/${p.cap} 格`, body, `<button class="btn ghost" data-no>不拿</button><button class="btn primary" data-y ${ok ? '' : 'disabled'}>換</button>`, { modal: true, noX: true });
      s.querySelector('[data-no]').onclick = done;
      s.querySelectorAll('[data-k]').forEach(r => r.onclick = () => { const id = r.dataset.k; if (sel.has(id)) sel.delete(id); else sel.add(id); AU.sfx('ui'); const sc = s.querySelector('.bd').scrollTop; render(); $('#swap .bd').scrollTop = sc; });
      s.querySelector('[data-y]').onclick = () => {
        for (const x of loose) if (sel.has(x.id)) { p.bag = p.bag.filter(y => y !== x); W.picks.push({ k: 'mem', x: p.x + fx(-26, 26), y: p.y + fx(14, 30), z: 0, vz: null, vx: 0, vy: 0, t: 0, item: x, beam: 1, ign: W.t + 3 }); }
        takeMemory(p, k); done();
      };
    };
    render();
  },
  openPutDown(p, k) {
    UI.swapOpen = true; S.paused = true;
    const s = sheet('swap', '放下她？', '', ticket(k.item) + `<div class="note" style="margin-top:12px">背著晴就拿不了東西。要先把她放下來嗎？</div>`, `<button class="btn ghost" data-no>不要</button><button class="btn danger" data-y>放下她</button>`, { modal: true, noX: true });
    const done = () => { UI.swapOpen = false; S.paused = false; closeSheet('swap'); };
    s.querySelector('[data-no]').onclick = done;
    s.querySelector('[data-y]').onclick = () => { putDownQing(p); k.ign = 0; done(); };
  },
  openWindowPick(p) {
    S.paused = true;
    const loose = p.bag.filter(i => !i.pocket).sort((a, b) => b.val / b.size - a.val / a.size);
    const keep = new Set(); let sz = 0; for (const it of loose) if (sz + it.size <= 6) { keep.add(it.id); sz += it.size; }
    const render = () => {
      let used = 0; loose.forEach(i => { if (keep.has(i.id)) used += i.size; });
      let body = `<div class="note">跳下去的人，只抱得住 6 格的東西（保險格裡的不算）。選要帶走的：<b class="gold">${used}/6</b></div><div class="bagGrid" style="margin-top:10px">`;
      for (const it of loose) body += `<div class="itemrow ${keep.has(it.id) ? 'new' : ''}" data-k="${it.id}"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n">${esc(it.n)}</div><div class="m">${RAR[it.rar].n}・${it.size} 格・${fmt(it.val)}</div></div><span class="serif">${keep.has(it.id) ? '帶走' : '留下'}</span></div>`;
      body += `</div>`;
      const s = sheet('winp', '跳窗', '', body, `<button class="btn ghost" data-no>先不跳</button><button class="btn primary" data-y>跳下去</button>`, { modal: true, noX: true });
      s.querySelectorAll('[data-k]').forEach(r => r.onclick = () => { const id = r.dataset.k, it = loose.find(x => x.id === id); if (keep.has(id)) keep.delete(id); else if (used + it.size <= 6) keep.add(id); else { toast('抱不住了', 'bad'); return; } AU.sfx('ui'); render(); });
      s.querySelector('[data-no]').onclick = () => { closeSheet('winp'); S.paused = false; };
      s.querySelector('[data-y]').onclick = () => { closeSheet('winp'); S.paused = false; const kept = p.bag.filter(i => i.pocket || keep.has(i.id)); extract(p, 'window', kept); };
    };
    render();
  },
  openFerry(p) {
    S.paused = true;
    const ok = p.bag.filter(i => i.rar >= 2 && i.kind !== 'core');
    let body = `<div class="note">渡夢人不說話，只是伸出手。給他一段<b style="color:${RAR[2].c}">鮮憶</b>以上的記憶，他就載你出去。</div><div class="bagGrid" style="margin-top:10px">`;
    if (!ok.length) body += `<div class="note mute">你身上沒有他要的東西。</div>`;
    for (const it of ok) body += `<div class="itemrow"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n">${esc(it.n)}</div><div class="m">${RAR[it.rar].n}・${fmt(it.val)}</div></div><button class="btn small" data-g="${it.id}">給他</button></div>`;
    body += `</div>`;
    const s = sheet('ferry', '渡夢人', '', body, `<button class="btn ghost" data-no>再想想</button>`, { modal: true, noX: true });
    s.querySelector('[data-no]').onclick = () => { closeSheet('ferry'); S.paused = false; };
    s.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const it = p.bag.find(x => x.id === b.dataset.g); if (!it) return; p.bag = p.bag.filter(x => x !== it); closeSheet('ferry'); S.paused = false; extract(p, 'ferry'); });
  },
  wantLevelUp(p) { if (UI.lvOpen || W.out) return; UI.levelUp(p); },
  levelUp(p) {
    if (!p.pend) return;
    UI.lvOpen = true; S.paused = true;
    const ch = upChoices(p);
    const s = el('div', 'screen'); s.id = 'lvup';
    s.innerHTML = `<div class="scrim"></div><div style="position:relative;display:flex;flex-direction:column;align-items:center"><div class="t">靈感</div><div class="s">Lv ${p.lvl}・選一個</div><div class="cards">` +
      ch.map(k => { const u = UPS[k], l = (p.ups[k] || 0) + 1; return `<button class="card ${l >= 5 ? 'max' : ''}" data-u="${k}"><div class="ic">${u.ic}</div><div><div class="n">${u.n}<span class="lv">${l >= 5 ? '極' : 'Lv ' + l}</span></div><div class="d">${u.d(l)}${l >= 5 ? '；' + u.x : ''}</div></div></button>`; }).join('') + `</div></div>`;
    $('#ui').appendChild(s); AU.sfx('levelup');
    s.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { applyUp(p, b.dataset.u); AU.sfx('uiOpen'); s.remove(); UI.lvOpen = false; if (p.pend > 0) UI.levelUp(p); else S.paused = false; });
  },

  /* ---------- 結算 ---------- */
  onPick(it) { if (it.kind === 'core') UI.hint('核心記憶：放進保險格就不怕迷失', 4); },
  endDive(res) {
    const chi = W.chi, finalDone = chi === 4 && W.finalPhase >= 1;
    setTimeout(() => {
      S.paused = true;
      const p = res.p;
      if (res.ok) {
        G.stats.extracts++;
        G.chapters[chi].best = Math.max(G.chapters[chi].best, W.stats.depthMax);
        G.candyStock += p.candies;
      } else { G.stats.lost++; }
      G.stats.kills += W.stats.kills; G.stats.assassins += W.stats.assassins;
      G.lastResult = res.ok ? 'ok' : 'lost';
      let reward = 0; const sideRes = [];
      const items = res.items.filter(i => i.kind !== 'core');
      const core = res.items.find(i => i.kind === 'core');
      if (res.ok) {
        const val = items.reduce((s, i) => s + i.val, 0), blues = items.filter(i => i.rar >= 2).length;
        for (const id of (W.side || [])) {
          const sd = SIDE.find(x => x.id === id); if (!sd) continue;
          const ok = { quiet: W.stats.maxWake < 60, deep: W.stats.depthMax >= 1, ghost: W.stats.assassins >= 5, purge: W.stats.kills >= 30, rich: val >= 3000, blue: blues >= 3 }[id];
          const r = Math.round(sd.r * (1 + chi * .25));
          sideRes.push({ sd, ok, r }); if (ok) reward += r;
        }
        G.side[chi] = null; sideFor(chi);
      }
      let mothPay = 0;
      if (core && !G.chapters[chi].core) { mothPay = Math.round(2500 * (1 + chi * .3)); }
      G.money += reward + mothPay; G.stats.earned += reward + mothPay;
      for (const it of items) { it.pocket = false; delete it.carryOk; G.pending.push(it); }
      const after = [];
      if (core && !G.chapters[chi].core) {
        G.chapters[chi].core = true; core.pocket = false; G.archive.push(core);
        if (chi + 1 < CH.length) G.chapters[chi + 1].unlocked = true;
        after.push(() => UI.playScene(CH[chi].core, null, true));
      }
      saveGame();
      // 結局
      if (chi === 4 && res.ok && finalDone) {
        const k = res.carried ? (qingKept() >= 4 ? 'sunny' : 'stranger') : 'repeat';
        if (!G.endings.includes(k)) G.endings.push(k);
        saveGame();
        UI.results(res, { reward, sideRes, mothPay, items }, () => UI.playScene({ lines: ENDINGS[k].lines, scene: 'end_' + k, title: '結局・' + ENDINGS[k].n }, () => UI.epilogue(k)));
        return;
      }
      UI.results(res, { reward, sideRes, mothPay, items }, () => {
        const go = () => {
          let lines = null;
          if (core && CH[chi].core.after.length) lines = CH[chi].core.after.slice();
          if (core && chi === 3) lines = (lines || []).concat(BEFORE_FINAL);
          UI.hub(lines);
          if (G.pending.length && !lines) setTimeout(() => UI.pawn(), 450);
        };
        if (after.length) after[0] && UI.playScene(CH[chi].core, go); else go();
      });
    }, res.ok ? 900 : 1500);
  },
  results(res, o, next) {
    $('#hud').classList.add('hidden'); AU.setTension(0);
    const p = res.p;
    const how = { bell: '敲鐘撤離', window: '跳窗', ferry: '渡夢', wake: '緊急甦醒', lost: '迷失' }[res.how];
    let body = `<div class="big serif" style="color:${res.ok ? '#bffff1' : '#ff8a94'}">${res.ok ? '醒來' : '迷失'}</div><div class="note" style="text-align:center">${esc(W.ch.title)}・${['淺眠', '深眠', '夢核'][W.stats.depthMax]}・${how}</div>`;
    body += `<div class="stat"><span>解決夢衛<b>${W.stats.kills}</b></span><span>背刺<b>${W.stats.assassins}</b></span><span>最高清醒度<b>${Math.round(W.stats.maxWake)}%</b></span><span>等級<b>${p.lvl}</b></span></div>`;
    if (o.mothPay) body += `<div class="contract" style="border-color:#c9b6ff"><span><b style="color:#c9b6ff">蛾的報酬</b>　核心記憶已送達</span><span class="money">+${fmt(o.mothPay)}</span></div>`;
    if (o.sideRes.length) body += `<div class="sec">副委託</div><div class="list">` + o.sideRes.map(s => `<div class="contract" style="${s.ok ? '' : 'opacity:.45'}"><span><b class="${s.ok ? 'gold' : 'mute'}">${s.sd.n}</b>　${s.sd.d}</span><span class="${s.ok ? 'money' : 'mute'}">${s.ok ? '+' + fmt(s.r) : '未完成'}</span></div>`).join('') + `</div>`;
    const all = o.items.slice().sort((a, b) => b.rar - a.rar);
    if (res.carried) body += `<div class="note" style="text-align:center;margin:14px 0;color:#ffd0d0;font-family:var(--serif);font-size:16px;letter-spacing:.15em">背著晴，走出了那場雨。</div>`;
    body += `<div class="sec">${res.ok ? '帶出來的記憶' : '保險格裡的記憶'}（${all.length}）</div><div class="bagGrid">`;
    if (!all.length) body += `<div class="note mute">${res.carried ? '除了她，什麼都沒帶。' : '什麼都沒帶出來。'}</div>`;
    for (const it of all) body += `<div class="itemrow"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n" style="color:${mixHex(RAR[it.rar].c, '#fff', .3)}">${esc(it.n)}</div><div class="m">${RAR[it.rar].n}・${fmt(it.val)}</div></div></div>`;
    if (res.lost && res.lost.length) { body += `<div class="note red" style="margin-top:8px">留在夢裡的：</div>`; for (const it of res.lost.slice(0, 12)) body += `<div class="itemrow lost"><div class="orb" style="${orbStyle(it.rar)}"></div><div class="tx"><div class="n">${esc(it.n)}</div></div></div>`; }
    body += `</div>`;
    S.mode = 'result';
    const s = sheet('result', res.ok ? '結算' : '結算', '', body, `<button class="btn primary" data-n style="flex:1">回到夜當</button>`, { modal: true, noX: true });
    s.querySelector('[data-n]').onclick = () => { closeSheet('result'); next(); };
  },
  epilogue(k) {
    const lines = [];
    CH.slice(0, 4).forEach(c => { const done = G.perks[c.id], he = heOf(c); lines.push(['', `${c.dreamer}：` + (done ? `${he}的那段人生，在記憶匣裡好好收著。` : `從${he}夢裡拿走的那些記憶，現在在某個陌生人的腦子裡，被當成自己的過去。`)]); });
    lines.push(['', `—— 結局「${ENDINGS[k].n}」 ——\n（共三種結局。回到夜當可以繼續潛入，也能再潛一次「那一夜」。）`]);
    UI.playScene({ lines, scene: 'epilogue' }, () => UI.hub([['shen', k === 'repeat' ? '……錢在櫃台上。' : '回來了。坐。'], ['man', k === 'sunny' ? '她說，下禮拜要來店裡看看。' : '……我還在。有單的話，叫我。']]));
  },

  /* ---------- 劇情演出 ---------- */
  playScene(sc, done, quiet) {
    const prevMode = S.mode, wasPaused = S.paused;
    S.paused = true;
    const s = el('div', 'screen'); s.id = 'scene';
    s.innerHTML = `<canvas></canvas><div class="txt"><span class="line"></span></div><button class="skip">略過</button><div class="next">輕觸繼續</div>`;
    $('#ui').appendChild(s);
    const cv = s.querySelector('canvas'), line = s.querySelector('.line');
    const lines = sc.lines; let i = -1, t0 = 0, typing = null, alive = true;
    AU.music('scene');
    const fit = () => { cv.width = Math.round(innerWidth * R.dpr); cv.height = Math.round(innerHeight * R.dpr); }; fit();
    const draw = (ts) => { if (!alive) return; const t = ts / 1000; drawScene(cv, sc.scene, t, i); requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
    const show = () => {
      i++;
      if (i >= lines.length) { end(); return; }
      const [w, txt] = lines[i], who = WHO[w];
      line.innerHTML = (who && who.n ? `<span class="who" style="color:${who.c}">${esc(who.n)}</span>` : '') + '<span class="tx"></span>';
      // 整句先排好版（每個字先藏起來），再一個字一個字亮起來：打字時不會一直換行跳動
      const tx = line.querySelector('.tx'); let n = 0; clearInterval(typing);
      tx.innerHTML = [...txt].map(ch => ch === '\n' ? '\n' : `<i>${esc(ch)}</i>`).join('');
      const chars = tx.querySelectorAll('i');
      typing = setInterval(() => { if (n < chars.length) chars[n++].classList.add('on'); if (n >= chars.length) { clearInterval(typing); typing = null; } }, 45);
      AU.sfx('page');
    };
    const end = () => { alive = false; clearInterval(typing); s.remove(); S.paused = wasPaused; if (prevMode === 'dive' && W && !W.out) { S.paused = false; AU.music('dream', W.chi, W.depth); } if (done) done(); };
    s.onclick = e => { if (e.target.classList.contains('skip')) return; if (typing) { clearInterval(typing); typing = null; line.querySelectorAll('.tx i').forEach(x => x.classList.add('on')); return; } show(); };
    s.querySelector('.skip').onclick = end;
    if (sc.title) UI.banner(sc.title, '');
    show();
  },
};
function cdSweep(el, k, dim) {   // 冷卻：圓鈕上順時針退去的暗色扇形（CSS 畫，不用每格重畫畫布）
  if (!el) return;
  const p = k > 0 ? Math.min(100, Math.ceil(k * 100)) : 0, d = dim ? 1 : 0;
  if (el._p === p && el._d === d) return;
  el._p = p; el._d = d;
  el.style.setProperty('--p', p);
  el.style.setProperty('--cdc', dim ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.35)');
}
