// ============ 選單、據點設施、商店、層圖 ============
const PM = { tab: 'party', hero: 'wei', bagF: 'all', codex: 'foe', onClose: null };
const SET_KEY = 'fallencourt.set';
function saveSettings() { try { store.set(SET_KEY, JSON.stringify(S.set)); } catch (e) { /* ignore */ } if (typeof audioVolume === 'function') audioVolume(); }
function loadSettings() { try { const s = JSON.parse(store.get(SET_KEY) || 'null'); if (s) Object.assign(S.set, s); } catch (e) { /* ignore */ } }
function panelShow(title, tabs, cur, onTab) {
  S.panel = true; UI.panel.classList.remove('hide'); UI.hud.classList.add('hide');
  UI.panel.innerHTML = `<div class="ph"><h2>${title}</h2><button class="bt x">✕</button></div><div class="seam"></div>${tabs ? `<div class="tabs">${tabs.map(t => `<button class="bt ${t[0] === cur ? 'on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>` : ''}<div class="pb"></div>`;
  $('#panel .x').onclick = () => { sfx('ui'); panelClose(); };
  if (tabs) $$('#panel .tabs .bt').forEach(b => b.onclick = () => { sfx('ui'); onTab(b.dataset.t); });
  return $('#panel .pb');
}
function panelClose() { S.panel = false; UI.panel.classList.add('hide'); UI.panel.innerHTML = ''; if (S.mode === 'explore' && !S.dialog) { UI.hud.classList.remove('hide'); hudZone(); } saveGame(); const f = PM.onClose; PM.onClose = null; if (f) f(); }
function panelWait() { return new Promise(res => { PM.onClose = res; }); }
function modalShow(html) { UI.modal.classList.remove('hide'); UI.modal.innerHTML = html; return UI.modal; }
function modalClose() { UI.modal.classList.add('hide'); UI.modal.innerHTML = ''; }
const resLine = () => `<div class="res"><span>銖<b>${G.coin}</b></span><span>碎料<b>${G.scrap}</b></span><span>浮石屑<b>${G.dust}</b></span><span>金繼漆<b>${G.lacquer}</b></span></div>`;
const consLine = () => `<div class="res" style="margin-top:6px">${Object.keys(CONSUM).map(k => `<span>${CONSUM[k].n}<b>${G.cons[k] || 0}/${G.beltMax}</b></span>`).join('')}</div>`;
function ownedItems() { // 全部家當：{ it, who, slot }
  const out = []; for (const id of G.roster) { if (!G.party[id].active) continue; for (const s of SLOTS) { const uid = G.party[id].eq[s]; if (uid && G.items[uid]) out.push({ it: G.items[uid], who: id, slot: s }); } }
  for (const uid of G.bag) if (G.items[uid]) out.push({ it: G.items[uid], who: null }); return out;
}
const sortItems = l => l.sort((a, b) => (b.it || b).rar - (a.it || a).rar || (b.it || b).il - (a.it || a).il);
function setHpRatio(id, fn) { const p = G.party[id], r = clamp(p.hp / heroNow(id).hpMax, 0, 1); fn(); p.hp = Math.max(1, Math.round(heroNow(id).hpMax * r)); }
function equipItem(hid, uid) { const it = G.items[uid], slot = BASE[it.base].slot, p = G.party[hid]; setHpRatio(hid, () => { const old = p.eq[slot]; p.eq[slot] = uid; G.bag = G.bag.filter(x => x !== uid); if (old) G.bag.push(old); }); it.isNew = false; sfx('equip'); }
function unequipItem(hid, slot) { const p = G.party[hid], old = p.eq[slot]; if (!old) return; setHpRatio(hid, () => { delete p.eq[slot]; G.bag.push(old); }); sfx('equip'); }
function removeItem(uid) { G.bag = G.bag.filter(x => x !== uid); delete G.items[uid]; }

// ---------- 主選單 ----------
const MENU_TABS = [['party', '隊伍'], ['bag', '背包'], ['ledger', '秤簿'], ['window', '殘窗'], ['codex', '圖鑑'], ['set', '設定']];
function openMenu(tab, hero) {
  if (S.mode !== 'explore' || S.dialog || S.cut || S.hold) return;
  if (tab) PM.tab = tab; if (hero) PM.hero = hero; if (!G.party[PM.hero] || !G.party[PM.hero].active) PM.hero = activeIds()[0];
  const pb = panelShow({ party: '隊伍', bag: '背包', ledger: '秤簿', window: '殘窗', codex: '圖鑑', set: '設定' }[PM.tab], MENU_TABS, PM.tab, t => openMenu(t));
  ({ party: tabParty, bag: tabBag, ledger: tabLedger, window: tabWindow, codex: tabCodex, set: tabSet })[PM.tab](pb);
}
function skillMeta(id, sk) { const u = { hero: id, tal: G.party[id].tal, leg: heroNow(id).leg }; let c = sk.cost || 0; if (sk.id === 'w_lift' && u.tal.w3a) c = 0; if ((sk.id === 'y_hook' || sk.id === 'y_hoist') && u.leg.firsthook) c = 0; return `${c ? '勢 ' + c : sk.gain ? '勢 +' + sk.gain : '不花勢'}・${delayClass(sk.delay)} ${sk.delay}${sk.cd ? '・冷卻 ' + sk.cd : ''}`; }
function tabParty(pb) {
  const ids = activeIds(), id = PM.hero, p = G.party[id], H = HERO[id], st = heroNow(id);
  let h = '<div class="heroTabs">' + ids.map(x => `<div class="ht ${x === id ? 'on' : ''}" data-h="${x}"><div><b style="color:${HERO[x].col}">${HERO[x].n}</b><span>${HERO[x].title}</span></div></div>`).join('') + '</div>';
  h += `<div class="stat" style="margin-top:8px"><div><b>${Math.round(p.hp)}<small style="font-size:11px;color:var(--dim)">/${st.hpMax}</small></b><span>生命</span></div><div><b>${Math.round(st.atk)}</b><span>攻擊</span></div><div><b>${st.arm}</b><span>護甲</span></div><div><b>${st.spd}</b><span>速度</span></div><div><b>${st.crit}%</b><span>暴擊</span></div></div>`;
  if (p.wounds) h += `<div class="hint" style="color:#ff8a7a">帶著 ${p.wounds} 道傷勢：最大生命 −${p.wounds * 10}%。回覆舟營的營火休息就會好。</div>`;
  h += `<div class="sk" style="margin-top:8px"><span class="sl" style="background:${H.col}">${H.passive.n[0]}</span><div><b>${H.passive.n}</b><span class="meta">被動・${H.role}</span><p>${H.passive.d}</p></div></div>`;
  const fk = Object.keys(st.fams); const rf = partyResonance(ids, G.party, G.items);
  h += `<div class="fams">${fk.length ? fk.map(k => `<span style="color:${FAM[k].c}">${FAM[k].full} ${st.fams[k]}</span>`).join('') : '<span style="color:var(--dim)">身上還沒有任何一系的詞條</span>'}</div>`;
  h += rf ? `<div class="hint" style="color:${FAM[rf].c}">【${RESO_FAM[rf].n}】成立：${RESO_FAM[rf].d}</div>` : (ids.length > 1 ? '<div class="hint">隊上每個人身上都有兩條同一系的詞條，就會成立「共鳴系」：平時全隊加成，合體技多一個效果。</div>' : '');
  h += '<div class="sec">裝備</div>';
  for (const s of SLOTS) { const it = p.eq[s] ? G.items[p.eq[s]] : null; const cnt = G.bag.filter(u => G.items[u] && BASE[G.items[u].base].slot === s && canEquip(id, G.items[u])).length;
    h += `<div class="slot tap" data-s="${s}" style="border-left-color:${it ? RAR[it.rar].c : 'var(--lead)'}"><span class="sn">${SLOT_N[s]}</span><div class="sv" style="color:${it ? RAR[it.rar].c : 'var(--dim)'}">${it ? itemName(it) : '（空）'}<small>${it ? (it.leg ? LEG[it.leg].rule : it.affs.map(a => AFF[a.id].n).join('・') || '沒有詞條') : (cnt ? `背包裡有 ${cnt} 件可以用` : '')}</small></div><span class="go">${cnt ? `<b style="color:var(--gold);font-size:12px">${cnt}</b> ›` : '›'}</span></div>`; }
  h += `<div class="sec">招式　<small style="font-weight:400;letter-spacing:0;color:var(--dim);font-family:var(--f)">帶 ${p.skills.length} / 4</small></div>`;
  const bs = SK[H.basic]; h += `<div class="sk on"><span class="sl">${SEAL[bs.id]}</span><div><b>${bs.n}</b><span class="meta">普攻・${skillMeta(id, bs)}</span><p>${bs.d}</p></div></div>`;
  for (const sid of heroSkillsAt(id, p.lv)) { const sk = SK[sid], on = p.skills.includes(sid); h += `<div class="sk tap ${on ? 'on' : 'off'}" data-sk="${sid}"><span class="sl" style="background:${sk.slam ? '#ffcf5a' : sk.lift ? '#bfe8ff' : 'var(--bone)'}">${SEAL[sid]}</span><div><b>${sk.n}</b><span class="meta">${skillMeta(id, sk)}${on ? '' : '・沒帶'}</span><p>${sk.d}</p></div></div>`; }
  const nx = H.learn.filter(a => a[1] > p.lv)[0]; if (nx) h += `<div class="hint">${nx[1]} 級學會「${SK[nx[0]].n}」。</div>`;
  const ul = SK[H.ult]; h += `<div class="sk ${p.ultOk ? 'on' : 'off'}" style="${p.ultOk ? 'border-color:#c9a23a' : ''}"><span class="sl" style="background:var(--gold)">${SEAL[ul.id]}</span><div><b>${ul.n}</b><span class="meta">奧義・勢 5</span><p>${p.ultOk ? ul.d : '還沒有領悟。' + (id === 'wei' ? '他的身體記得，只是還沒想起來。' : '這得等' + (id === 'yuan' ? '她' : '他') + '自己的事有了著落。')}</p></div></div>`;
  h += '<div class="sec">天賦</div>'; let anyT = false;
  for (const t of H.talents) { const got = p.tal[t[1].id] ? t[1] : p.tal[t[2].id] ? t[2] : null; anyT = true;
    if (got) h += `<div class="sk on"><span class="sl" style="background:${H.col}">${got.n[0]}</span><div><b>${got.n}</b><span class="meta">${t[0]} 級</span><p>${got.d}</p></div></div>`;
    else if (G.lv >= t[0]) h += `<div class="sk tap" data-tal="${t[0]}" style="border-color:var(--gold)"><span class="sl" style="background:var(--gold)">？</span><div><b>可以選一個天賦</b><span class="meta">${t[0]} 級</span><p>${t[1].n}　或　${t[2].n}</p></div></div>`;
    else h += `<div class="sk off"><span class="sl">${t[0]}</span><div><b>${t[1].n}　／　${t[2].n}</b><span class="meta">${t[0]} 級</span></div></div>`; }
  void anyT; pb.innerHTML = h;
  $$('#panel .ht').forEach(d => { d.insertBefore(chipCanvas(portrait(d.dataset.h, 'chip'), 40), d.firstChild); d.onclick = () => { sfx('ui'); openMenu('party', d.dataset.h); }; });
  $$('#panel .slot').forEach(d => d.onclick = () => { sfx('ui'); openEquip(id, d.dataset.s); });
  $$('#panel .sk[data-sk]').forEach(d => d.onclick = () => { const sid = d.dataset.sk, i = p.skills.indexOf(sid); if (i >= 0) { if (p.skills.length <= 1) { toast('至少帶一招。'); return; } p.skills.splice(i, 1); } else { if (p.skills.length >= 4) { toast('最多帶 4 招。先點掉一招。'); sfx('deny'); return; } p.skills.push(sid); } sfx('equip'); const sc = pb.scrollTop; openMenu('party'); $('#panel .pb').scrollTop = sc; });
  $$('#panel .sk[data-tal]').forEach(d => d.onclick = async () => { const t = H.talents.find(x => x[0] === +d.dataset.tal); await chooseTalent({ id, t }); openMenu('party'); });
}
function openEquip(hid, slot) {
  const p = G.party[hid], cur = p.eq[slot] ? G.items[p.eq[slot]] : null;
  const list = sortItems(G.bag.map(u => G.items[u]).filter(it => it && BASE[it.base].slot === slot && canEquip(hid, it)));
  let h = `<div class="mb cut"><h3>${HERO[hid].n}・${SLOT_N[slot]}</h3><div class="seam"></div><div class="ms">`;
  if (cur) h += `<div class="hint">現在穿的</div>${itemHtml(cur, { lore: true, noNew: true })}`;
  h += `<div class="hint">${list.length ? '背包裡能換上的（▲▼ 是跟現在這件比）：' : '背包裡沒有這個部位能用的東西。'}</div>`;
  for (const it of list) h += itemHtml(it, { tap: true, cmp: cur, lore: true });
  h += `</div><div class="mf">${cur && slot !== 'weapon' ? '<button class="bt" data-k="off">卸下</button>' : ''}<button class="bt gold" data-k="x">回去</button></div></div>`;
  modalShow(h);
  $$('#modal .it.tap').forEach(d => d.onclick = () => { equipItem(hid, d.dataset.uid); modalClose(); openMenu('party'); });
  $$('#modal .mf .bt').forEach(b => b.onclick = () => { sfx('ui'); if (b.dataset.k === 'off') unequipItem(hid, slot); modalClose(); openMenu('party'); });
}
function tabBag(pb) {
  const all = sortItems(G.bag.map(u => G.items[u]).filter(Boolean)), f = PM.bagF, list = all.filter(it => f === 'all' || BASE[it.base].slot === f);
  let h = resLine() + consLine() + `<div class="seg" style="margin:10px 0 8px">${[['all', '全部'], ['weapon', '武器'], ['armor', '護甲'], ['trinket', '飾物'], ['relic', '遺物']].map(a => `<button class="bt ${a[0] === f ? 'on' : ''}" data-f="${a[0]}">${a[1]}</button>`).join('')}</div>`;
  if (!list.length) h += '<div class="empty">空的。</div>';
  for (const it of list) h += itemHtml(it, { tap: true });
  if (all.length) h += `<div class="hint">點一件看細節、換給誰。${G.flags.r_hammer ? '不要的拿去營地的鍛爐拆掉，換碎料。' : ''}</div>`;
  pb.innerHTML = h;
  $$('#panel .seg .bt').forEach(b => b.onclick = () => { PM.bagF = b.dataset.f; sfx('ui'); openMenu('bag'); });
  $$('#panel .it.tap').forEach(d => d.onclick = () => { sfx('ui'); openItem(d.dataset.uid); });
}
function openItem(uid) {
  const it = G.items[uid]; it.isNew = false; const slot = BASE[it.base].slot;
  let h = `<div class="mb cut"><h3>${SLOT_N[slot]}</h3><div class="seam"></div><div class="ms">${itemHtml(it, { lore: true, noNew: true })}`;
  const who = activeIds().filter(id => canEquip(id, it));
  for (const id of who) { const cur = G.party[id].eq[slot] ? G.items[G.party[id].eq[slot]] : null; h += `<div class="hint">${HERO[id].n}現在的${SLOT_N[slot]}：${cur ? `<b style="color:${RAR[cur.rar].c}">${itemName(cur)}</b>` : '（空）'}</div>`; }
  h += `</div><div class="mf">${who.map(id => `<button class="bt gold" data-h="${id}">給${HERO[id].n}</button>`).join('')}<button class="bt" data-h="">回去</button></div></div>`;
  modalShow(h);
  $$('#modal .mf .bt').forEach(b => b.onclick = () => { if (b.dataset.h) equipItem(b.dataset.h, uid); else sfx('ui'); modalClose(); openMenu('bag'); });
}
function standing(f) { const v = G.rep[f];
  return { ji: ['集裡的人看見你們，把孩子拉進屋裡。', '集裡的人不跟你們說話。', '集裡有人朝你們吐口水，也有人沒有。', '鏽錨集還不認識你們。', '集裡有人開始跟你們點頭。', '集裡的人會替你們留一盞燈。', '鏽錨集把你們當自己人。'],
    bang: ['繩幫出了價：你們的頭，按重計。', '繩幫的人看到你們，手會往鉤上放。', '繩幫記著你們的帳。', '繩幫還不知道該拿你們怎麼辦。', '繩幫的人對你們還算客氣。', '繩幫把你們當成能談買賣的人。', '繩幫的人叫你們「上頭的朋友」。'],
    shou: ['守墜人說，你們的名字不會刻在任何碑上。', '守墜人不讓你們靠近碑。', '守墜人看你們的眼神是冷的。', '守墜人不過問你們的事。', '守墜人肯讓你們在碑前坐一會。', '守墜人替你們在碑前添了一點油。', '守墜人說，你們是記得的人。'] }[f][v + 3]; }
function tabLedger(pb) {
  let h = `<div class="hint" style="font-family:var(--fs);font-size:13px;color:#c8c2b4">${G.flags.market_seen ? '秤婆有一本秤簿，什麼都記。你們做過的事，她一行一行寫在裡面。' : '做過的事，總有人記著。'}</div>`;
  if (!G.deeds.length) h += '<div class="empty">還沒有值得記的事。</div>';
  for (const d of G.deeds) h += `<div class="deed">${d.t}</div>`;
  if (G.flags.market_seen) { h += '<div class="sec">各方</div>'; for (const f of ['ji', 'bang', 'shou']) if (f !== 'shou' || G.flags.met_luchen) h += `<div class="deed" style="border-left-color:${f === 'ji' ? '#ffb86b' : f === 'bang' ? '#c8402f' : '#d8d2c4'}">${standing(f)}</div>`; }
  const cs = [['yuan', '岑鳶'], ['luo', '駱山']].filter(a => G.party[a[0]].active);
  if (cs.length) { h += '<div class="sec">同行的人</div>'; for (const [k, n] of cs) { const v = G.aff[k]; h += `<div class="deed" style="border-left-color:${HERO[k].col}">${n}${v >= 8 ? '把後背交給你了。' : v >= 5 ? '開始把你的話當一回事。' : v >= 2 ? '還在看你是什麼樣的人。' : '跟你同路，僅此而已。'}</div>`; } }
  pb.innerHTML = h;
}
function tabWindow(pb) {
  const n = G.shards.length;
  let h = `<canvas class="rosew" width="600" height="600"></canvas><div class="hint" style="text-align:center">${n >= 12 ? '整扇窗都回來了。' : `殘窗　${n} / 12`}</div>`;
  for (let i = 1; i <= 12; i++) { const got = G.shards.includes(i); h += got ? `<div class="shd"><b>第 ${i} 片</b>${SHARDS[i - 1].replace(/\n/g, '<br>')}</div>` : `<div class="shd no"><b>第 ${i} 片</b>還沒找到。${SHARD_HINT[i - 1] && G.flags.r_ear ? '小耳說：' + SHARD_HINT[i - 1] : ''}</div>`; }
  pb.innerHTML = h; const c = $('#panel .rosew'); drawRose(c.getContext('2d'), 300, 300, 282, G.shards.slice(), 0);
}
const RULES = [
  ['行動順序', '畫面上方那一排，是接下來誰先動。每一招都有「延遲」：快招很快又輪到你，重招要等比較久。選招的時候，那一排會先排給你看——確認之前就知道自己會落在哪。'],
  ['前排與後排', '近身招只打得到前排。後排的、飄在空中的，要用遠程招打，或讓岑鳶用「倒鉤」拖到前排。前排全倒了，後排才會補上來。'],
  ['浮與墜', '帶「浮力」的招式會累積浮力，累積到目標的重量，牠就被打上半空：行動延後、不能反擊。這時候用「墜擊」招把牠砸下來——越重的東西，砸下來越痛，旁邊的也會被震到。'],
  ['意圖、蓄力與打斷', '每個敵人頭上寫著牠下一步要做什麼、打誰、大概多痛。重招要先蓄力，頭上會多幾格「穩固」。用帶「衝擊」的招把穩固打光，或把牠打浮，蓄力就會中斷，牠還會失衡。'],
  ['勢', '每個人頭像下面的五格。普攻、架勢、擊殺、連攜都會加一格；招式要花勢；集滿五格可以放奧義。'],
  ['連攜與共鳴', '隊友緊接著隊友行動（中間沒有敵人插進來）就是連攜：後手更痛，還會累積全隊的「共鳴」。前一個人剛把牠打浮、打到失衡或標記，後一個人馬上打在那上面，就是完美連攜。共鳴滿了，任何人都能發動合體技「庭隕」。'],
  ['地利', '戰場上有些東西可以打：爆燃桶、浮石簇、吊在頭上的懸骸。站在崖邊或油面上打，也有各自的好處。開打前看一眼「敵情」。'],
  ['倒地與傷勢', '生命歸零會倒地，隊友可以用止血膏或「裹傷」拉起來。倒過的人會帶一道傷勢（最大生命 −10%），回營火休息才會好。戰鬥之間生命不會回滿；區域裡的殘火可以坐一次。'],
  ['奇襲', '敵人看得到的範圍會畫在地上。從那個範圍外面貼上去，全隊就能搶先動手；被牠先看到，就是牠們先動。'],
];
function tabCodex(pb) {
  const c = PM.codex; let h = `<div class="seg" style="margin-bottom:8px">${[['foe', '敵人'], ['rule', '怎麼打'], ['status', '狀態'], ['leg', '金繼']].map(a => `<button class="bt ${a[0] === c ? 'on' : ''}" data-f="${a[0]}">${a[1]}</button>`).join('')}</div>`;
  if (c === 'foe') { const ks = Object.keys(FOE).filter(k => G.seenFoe[k] && !FOE[k].object); if (!ks.length) h += '<div class="empty">還沒遇過什麼。</div>';
    for (const k of ks) { const F = FOE[k]; h += `<div class="intel"><div class="iname"><span>${F.n}</span><i>${F.row === 'front' ? '前排' : F.row === 'back' ? '後排' : '空中'}・${['無重', '輕', '中', '重', '巨', '不動'][Math.min(5, F.w)]}</i></div><p style="font-family:var(--fs);color:#b8b2a4">${F.lore}</p>${F.traits.map(t => `<p><b>${t.n}</b>　${t.d}</p>`).join('')}<p style="color:var(--dim)">招式：${F.moves.map(m => m.n + (m.charge ? '（蓄力）' : '')).join('、')}</p></div>`; } }
  else if (c === 'rule') for (const r of RULES) h += `<div class="intel h"><div class="iname"><span>${r[0]}</span></div><p>${r[1]}</p></div>`;
  else if (c === 'status') for (const k in STATUS) h += `<div class="intel" style="border-left-color:${STATUS[k].c}"><div class="iname"><span style="color:${STATUS[k].c}">${STATUS[k].n}</span></div><p>${STATUS[k].d}</p></div>`;
  else { const ks = Object.keys(LEG).filter(k => G.lore[k]); if (!ks.length) h += '<div class="empty">金繼：摔碎過、又被人用金漆補起來的東西。<br>你還沒有找到任何一件。</div>'; h += ks.length ? `<div class="hint">找到 ${ks.length} / ${Object.keys(LEG).length} 件</div>` : '';
    for (const k of ks) h += `<div class="it leg" style="border-left-color:${RAR[4].c}"><div class="ic" style="background:${RAR[4].c}">${SLOT_SEAL[BASE[LEG[k].base].slot]}</div><div class="ib"><div class="in" style="color:${RAR[4].c}">${LEG[k].n}</div><div class="rule">${LEG[k].rule}</div><div class="lore">${LEG[k].lore}</div></div></div>`; }
  pb.innerHTML = h; $$('#panel .seg .bt').forEach(b => b.onclick = () => { PM.codex = b.dataset.f; sfx('ui'); openMenu('codex'); });
}
function tabSet(pb) {
  const tg = (k, n, d) => `<div class="kv"><span>${n}<small style="display:block;font-size:11px;color:var(--dim)">${d}</small></span><button class="bt sm ${S.set[k] ? 'gold' : ''}" data-tg="${k}">${S.set[k] ? '開' : '關'}</button></div>`;
  let h = `<div class="kv"><span>音樂</span><input type="range" min="0" max="100" value="${Math.round(S.set.music * 100)}" data-v="music"></div><div class="kv"><span>音效</span><input type="range" min="0" max="100" value="${Math.round(S.set.sfx * 100)}" data-v="sfx"></div>`;
  h += `<div class="kv"><span>戰鬥演出速度</span><div class="seg">${[[1, '×1'], [1.5, '×1.5'], [2.2, '×2']].map(a => `<button class="bt ${Math.abs(S.set.speed - a[0]) < .01 ? 'on' : ''}" data-sp="${a[0]}">${a[1]}</button>`).join('')}</div></div>`;
  h += `<div class="kv"><span>畫質<small style="display:block;font-size:11px;color:var(--dim)">自動：跑不順的時候會自己降一級</small></span><div class="seg">${[['auto', '自動'], ['hi', '精細'], ['lo', '流暢']].map(a => `<button class="bt ${S.set.gfx === a[0] ? 'on' : ''}" data-gfx="${a[0]}">${a[1]}</button>`).join('')}</div></div>`;
  h += tg('shake', '畫面震動', '重擊時畫面會晃') + tg('flash', '閃光', '暴擊與墜擊的白光') + tg('hints', '新手提示', '頭幾場戰鬥的說明') + tg('easy', '從容模式', '敵人的傷害 −25%。想專心看故事的時候開');
  h += `<div class="sec">存檔</div><div class="hint">每打完一場、每過一段劇情都會自動存。下面這串「存檔碼」可以把進度搬到另一台裝置，或在 Claude 版與網頁版之間搬。${cloudNote() ? '<br><span style="color:#9fd8ff">' + cloudNote() + '</span>' : ''}</div><textarea class="code" id="svout" readonly></textarea><div class="acts"><button class="bt" id="svcopy">複製存檔碼</button></div><textarea class="code" id="svin" placeholder="把存檔碼貼在這裡" style="margin-top:8px"></textarea><div class="acts"><button class="bt" id="svload">讀取這串存檔碼</button></div>`;
  h += `<div class="sec">其他</div><div class="acts"><button class="bt" id="totitle">回到片頭</button></div><div class="hint">已經走了 ${Math.floor(G.stat.sec / 60)} 分鐘・打過 ${G.stat.battles} 場・墜擊 ${G.stat.slams} 次・連攜 ${G.stat.links} 次</div>`;
  pb.innerHTML = h;
  $$('#panel input[type=range]').forEach(r => r.oninput = () => { S.set[r.dataset.v] = r.value / 100; saveSettings(); if (r.dataset.v === 'sfx') sfx('ui'); });
  $$('#panel [data-tg]').forEach(b => b.onclick = () => { S.set[b.dataset.tg] = !S.set[b.dataset.tg]; saveSettings(); sfx('ui'); openMenu('set'); });
  $$('#panel [data-gfx]').forEach(b => b.onclick = () => { S.set.gfx = b.dataset.gfx; Gfx.cap = 2; PERF.bad = 0; saveSettings(); resize(); sfx('ui'); openMenu('set'); });
  $$('#panel [data-sp]').forEach(b => b.onclick = () => { S.set.speed = +b.dataset.sp; saveSettings(); sfx('ui'); openMenu('set'); });
  saveGame(); $('#svout').value = exportSave();
  $('#svcopy').onclick = () => { const t = $('#svout'); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => toast('複製好了。'), () => toast(ok ? '複製好了。' : '複製不了：請長按文字框自己全選複製。')); else toast(ok ? '複製好了。' : '請長按文字框自己全選複製。'); };
  // 讀存檔碼：先把選單關掉（關選單會存一次現在這份），再換成碼裡的那一份——順序反過來的話，碼裡的進度會被搬到現在站的地方
  $('#svload').onclick = async () => {
    const code = $('#svin').value; if (!code.trim()) { toast('先把存檔碼貼進去。'); return; }
    const g = decodeSave(code); if (!g) { toast('這串存檔碼讀不出來。'); sfx('deny'); return; }
    panelClose(); switchSave(g, '讀好了。');
  };
  $('#totitle').onclick = async () => { panelClose(); await fadeTo(1); showTitle(); await fadeTo(0); };
}

// ---------- 鍛爐（老鎚）----------
function costHtml(c) { const have = { coin: G.coin, scrap: G.scrap, dust: G.dust, lacquer: G.lacquer }, nm = { coin: '銖', scrap: '碎料', dust: '浮石屑', lacquer: '金繼漆' }; return '<div class="cost">' + Object.keys(c).filter(k => c[k] > 0).map(k => `${nm[k]} <b class="${have[k] < c[k] ? 'lack' : ''}">${c[k]}</b>`).join('　') + '</div>'; }
const canPay = c => G.coin >= (c.coin || 0) && G.scrap >= (c.scrap || 0) && G.dust >= (c.dust || 0) && G.lacquer >= (c.lacquer || 0);
function pay(c) { G.coin -= c.coin || 0; G.scrap -= c.scrap || 0; G.dust -= c.dust || 0; G.lacquer -= c.lacquer || 0; }
function openForge(tab) {
  tab = tab || 'up'; const pb = panelShow('鍛爐', [['up', '強化'], ['sal', '拆解']], tab, t => openForge(t)); let h = resLine();
  if (tab === 'up') { h += '<div class="hint">老鎚：「東西給我。基礎的數字每敲一次多一成不到，最多敲三次；金繼的可以敲五次。」</div>';
    const list = ownedItems().filter(o => (o.it.up || 0) < upMax(o.it) && (BASE[o.it.base].slot === 'weapon' || BASE[o.it.base].slot === 'armor')); sortItems(list);
    if (!list.length) h += '<div class="empty">沒有能再敲的武器或護甲。</div>';
    for (const o of list) { const c = upCost(o.it); h += `<div data-up="${o.it.uid}" class="${canPay(c) ? '' : 'no'}">${itemHtml(o.it, { tap: true, noNew: true, who: (o.who ? HERO[o.who].n + '身上' : '背包') })}${costHtml(c)}</div><div style="height:8px"></div>`; }
  } else { h += '<div class="hint">老鎚：「不要的丟進來。能回一點料。」只列背包裡的；身上穿的不會出現在這裡。</div>';
    const list = sortItems(G.bag.map(u => G.items[u]).filter(it => it && !it.leg && !it.keep)).reverse();
    const junk = list.filter(it => it.rar <= 1 && !it.keep); if (junk.length > 1) h += `<div class="acts"><button class="bt" id="saljunk">把凡鐵與良工全拆了（${junk.length} 件）</button></div><div style="height:8px"></div>`;
    if (!list.length) h += '<div class="empty">背包裡沒有能拆的。</div>';
    for (const it of list) { const y = salvageYield(it); h += `<div data-sal="${it.uid}">${itemHtml(it, { tap: true, noNew: true })}<div class="cost">拆了得：碎料 <b>${y.scrap}</b>${y.dust ? '　浮石屑 <b>' + y.dust + '</b>' : ''}</div></div><div style="height:8px"></div>`; } }
  pb.innerHTML = h;
  $$('#panel [data-up]').forEach(d => d.onclick = () => { const it = G.items[d.dataset.up], c = upCost(it); if (!canPay(c)) { toast('料不夠。'); sfx('deny'); return; } const who = G.roster.find(id => SLOTS.some(s => G.party[id].eq[s] === it.uid)); const f = () => { pay(c); it.up = (it.up || 0) + 1; }; if (who) setHpRatio(who, f); else f(); sfx('craft'); toast(`${itemName(it)}`); const sc = pb.scrollTop; openForge('up'); $('#panel .pb').scrollTop = sc; });
  const sal = uid => { const it = G.items[uid], y = salvageYield(it); G.scrap += y.scrap; G.dust += y.dust; removeItem(uid); };
  $$('#panel [data-sal]').forEach(d => d.onclick = async () => { const it = G.items[d.dataset.sal]; if (it.rar >= 2 && !(await confirmBox('拆掉？', `<b style="color:${RAR[it.rar].c}">${itemName(it)}</b><br>拆了就沒了。`, '拆'))) return; sal(it.uid); sfx('craft'); const sc = pb.scrollTop; openForge('sal'); $('#panel .pb').scrollTop = sc; });
  const jb = $('#saljunk'); if (jb) jb.onclick = () => { for (const it of G.bag.map(u => G.items[u]).filter(it => it && !it.leg && !it.keep && it.rar <= 1)) sal(it.uid); sfx('craft'); openForge('sal'); };
  return PM.onClose ? null : panelWait();
}
// ---------- 刻台（盲叔）----------
function openEngrave(tab) {
  tab = tab || 're'; const pb = panelShow('刻台', [['re', '重鑄'], ['kin', '金繼']], tab, t => openEngrave(t)); let h = resLine();
  if (tab === 're') { h += `<div class="hint">盲叔：「你指一條，我刮掉，重新刻。刻出來三條讓你挑——都不要，也可以留著原來的，料我照收。」</div>${costHtml(REFORGE_COST)}<div style="height:8px"></div>`;
    const list = ownedItems().filter(o => !o.it.leg && o.it.affs.length); sortItems(list); if (!list.length) h += '<div class="empty">沒有帶詞條的東西。</div>';
    for (const o of list) h += `<div data-re="${o.it.uid}">${itemHtml(o.it, { tap: true, noNew: true, who: o.who ? HERO[o.who].n + '身上' : '背包' })}</div>`;
  } else { h += `<div class="hint">盲叔：「摔碎的東西，用金漆補起來，會比原來多一道紋。」把一件<b style="color:${RAR[2].c}">珍品</b>補成<b style="color:${RAR[3].c}">庭造</b>，多一條詞條（三條裡挑一條）。</div>${costHtml(KINTSUGI_COST)}<div style="height:8px"></div>`;
    const list = ownedItems().filter(o => o.it.rar === 2); sortItems(list); if (!list.length) h += '<div class="empty">手上沒有珍品。</div>';
    for (const o of list) h += `<div data-kin="${o.it.uid}">${itemHtml(o.it, { tap: true, noNew: true, who: o.who ? HERO[o.who].n + '身上' : '背包' })}</div>`; }
  pb.innerHTML = h;
  const affPick = (it, opts, title, withKeep) => new Promise(res => { let m = `<div class="mb cut"><h3>${title}</h3><div class="seam"></div><div class="ms">`; opts.forEach((a, i) => { const A = AFF[a.id]; m += `<div class="sk tap" data-i="${i}" style="cursor:pointer"><span class="sl" style="background:${FAM[A.fam].c}">${A.fam === 'gen' ? '◆' : FAM[A.fam].n}</span><div><b>${A.n}</b><p>${affText(a)}</p></div></div>`; }); m += `</div>${withKeep ? '<div class="mf"><button class="bt" data-i="-1">都不要，留著原來的</button></div>' : ''}</div>`; modalShow(m); $$('#modal [data-i]').forEach(d => d.onclick = () => { modalClose(); res(+d.dataset.i); }); });
  const whoOf = it => G.roster.find(id => SLOTS.some(s => G.party[id].eq[s] === it.uid));
  $$('#panel [data-re]').forEach(d => d.onclick = async () => { const it = G.items[d.dataset.re]; if (!canPay(REFORGE_COST)) { toast('料不夠。'); sfx('deny'); return; }
    let idx = 0; if (it.affs.length > 1) { idx = await affPick(it, it.affs, '刮掉哪一條？', true); if (idx < 0) return; }
    const opts = reforgeOptions(it, idx); if (!opts.length) { toast('這件刻不出別的了。'); return; } pay(REFORGE_COST); sfx('craft');
    const k = await affPick(it, opts, `換掉「${AFF[it.affs[idx].id].n}」`, true); if (k >= 0) { const w = whoOf(it), f = () => { it.affs[idx] = opts[k]; }; if (w) setHpRatio(w, f); else f(); sfx('loot2'); toast(itemName(it)); } const sc = pb.scrollTop; openEngrave('re'); $('#panel .pb').scrollTop = sc; });
  $$('#panel [data-kin]').forEach(d => d.onclick = async () => { const it = G.items[d.dataset.kin]; if (!canPay(KINTSUGI_COST)) { toast(G.lacquer < 1 ? '沒有金繼漆。精英身上、鎖箱和金繼箱裡會有。' : '銖不夠。'); sfx('deny'); return; }
    const opts = kintsugiOptions(it); if (!opts.length) { toast('這件補不上去。'); return; } const k = await affPick(it, opts, '補上哪一道？', true); if (k < 0) return; pay(KINTSUGI_COST); const w = whoOf(it), f = () => { it.affs.push(opts[k]); it.rar = 3; }; if (w) setHpRatio(w, f); else f(); sfx('loot3'); toast(itemName(it) + '　庭造'); openEngrave('kin'); });
  return PM.onClose ? null : panelWait();
}
// ---------- 藥棚（阿朮）----------
const BELT_COST = [0, 0, 0, 120, 260];
function openHerb() {
  const pb = panelShow('藥棚'); let h = resLine() + consLine() + '<div class="hint">阿朮：「止血膏我這裡管夠，回營火坐下就替你們補滿。另外兩樣得花錢，材料不好找。」</div>';
  for (const k of ['fire', 'float']) { const c = CONSUM[k], full = (G.cons[k] || 0) >= G.beltMax; h += `<div class="card"><div class="row"><div style="flex:1"><b>${c.n}</b><div class="hint" style="padding:2px 0">${c.d}</div></div><button class="bt ${full || G.coin < c.price ? '' : 'gold'}" data-buy="${k}" ${full ? 'disabled' : ''}>${full ? '帶滿了' : c.price + ' 銖'}</button></div></div>`; }
  if (G.beltMax < 5) { const c = BELT_COST[G.beltMax]; h += `<div class="card"><div class="row"><div style="flex:1"><b>加一格腰帶</b><div class="hint" style="padding:2px 0">每種道具可以多帶一個（現在 ${G.beltMax}）。</div></div><button class="bt ${G.coin < c ? '' : 'gold'}" data-belt="1">${c} 銖</button></div></div>`; }
  pb.innerHTML = h;
  $$('#panel [data-buy]').forEach(b => b.onclick = () => { const k = b.dataset.buy, c = CONSUM[k]; if (G.coin < c.price) { toast('銖不夠。'); sfx('deny'); return; } G.coin -= c.price; G.cons[k] = (G.cons[k] || 0) + 1; sfx('coin'); openHerb(); });
  $$('#panel [data-belt]').forEach(b => b.onclick = () => { const c = BELT_COST[G.beltMax]; if (G.coin < c) { toast('銖不夠。'); sfx('deny'); return; } G.coin -= c; G.beltMax++; G.cons.potion = G.beltMax; sfx('craft'); openHerb(); });
  return PM.onClose ? null : panelWait();
}
// ---------- 聽風板（小耳）----------
const BOUNTY = [
  { id: 'b07', enc: 'sb', zone: 'slope', n: '獨燈・零七', need: 'threejaw_dead', d: '骸骨坡東北角的鏽鐵台上，有一盞紅光的巡燈，帶著三盞小的。被牠照到的人，所有燈都打他。', tip: '牠們全在空中：帶遠程招、帶墜擊。', r: '零七的燈芯' },
  { id: 'bcity', enc: 'ob', zone: 'sump', n: '負城者', need: 'c2_done', d: '沉油渠東北的渣土坡上，有一隻背著半座禮拜堂的蟹。腳下全是油。', tip: '牠太重，一個人挑不起來。殼會一塊一塊掉。', r: '壓艙石' },
];
function zoneLeft(zid) { const m = buildZone(zid), st = zs(zid); let c = 0, s = 0; for (const e of m.ents) { if (e.k === 'chest' && !st.got[e.id] && (!e.cond || e.cond.indexOf('flag:') < 0 || evalCond(e.cond))) c++; if (e.k === 'shard' && !G.shards.includes(e.id)) s++; } return { c, s }; }
function openBoard() {
  const pb = panelShow('聽風板'); let h = '<div class="hint">小耳把聽來的事釘在一塊船板上。字是岑鳶教她寫的。</div><div class="sec">懸賞</div>'; let any = false;
  for (const b of BOUNTY) { if (!G.flags[b.need]) continue; any = true; const done = !!zs(b.zone).enc[b.enc], on = !!G.flags[b.id + '_on'];
    h += `<div class="card" style="border-left:4px solid ${done ? 'var(--lead2)' : 'var(--gold)'};${done ? 'opacity:.55' : ''}"><b style="font-family:var(--fs);font-size:16px;letter-spacing:.1em">${b.n}</b><div class="hint" style="padding:3px 0;color:#c8c2b4">${b.d}</div><div class="hint" style="padding:0">${b.tip}　身上有：<b style="color:var(--gold)">${b.r}</b></div>${done ? '<div class="hint">已經解決了。</div>' : on ? `<div class="hint" style="color:var(--gold)">接下了。牠在${ZONES[b.zone].n}。</div>` : `<div class="acts"><button class="bt gold" data-b="${b.id}">接下</button></div>`}</div>`; }
  if (!any) h += '<div class="empty">還沒有聽到什麼值得去的。</div>';
  h += '<div class="sec">傳聞</div>';
  for (const z of LAYER_ORDER) { if (!G.disc[z] || ZONES[z].safe && z !== 'market') continue; const l = zoneLeft(z); h += `<div class="kv"><span>${ZONES[z].n}</span><span style="font-size:12.5px;color:${l.c + l.s ? 'var(--bone)' : 'var(--dim)'}">${l.c + l.s ? `${l.c ? '還有 ' + l.c + ' 個箱子沒開' : ''}${l.c && l.s ? '・' : ''}${l.s ? l.s + ' 片殘窗' : ''}` : '撿乾淨了'}</span></div>`; }
  pb.innerHTML = h;
  $$('#panel [data-b]').forEach(b => b.onclick = () => { flag(b.dataset.b + '_on'); sfx('confirm'); toast('接下了。'); openBoard(); });
  return PM.onClose ? null : panelWait();
}
function openStation(id) {
  if (id === 'rest') { runScript('sys_camp'); return; }
  sfx('ui');
  if (id === 'forge') openForge(); else if (id === 'engrave') openEngrave(); else if (id === 'herb') openHerb(); else if (id === 'board') openBoard(); else if (id === 'window') { PM.tab = 'window'; openMenu('window'); }
}
// ---------- 秤婆的攤子 ----------
function shopStage() { return G.flags.c4_done ? 4 : G.flags.c2_done ? 3 : G.party.luo.active || G.flags.luo_gone ? 2 : 1; }
function shopStock() { const st = shopStage(); if (!G.shop || G.shop.stage !== st) { const zl = [0, 3, 5, 7, 9][st], items = []; for (let i = 0; i < 5; i++) { const it = genItem({ il: zl + R.i(-1, 0), rar: i === 0 ? 3 : i < 3 ? 2 : 1, party: activeIds() }); it.isNew = false; items.push(it); } G.shop = { stage: st, items }; } return G.shop.items; }
const shopPrice = it => Math.round(itemValue(it) * (G.flags.debt_cleared ? 1.5 : 2.1));
function openShop(tab) {
  tab = tab || 'buy'; const pb = panelShow('秤婆的攤子', [['buy', '買'], ['sell', '賣']], tab, t => openShop(t)); let h = resLine() + consLine();
  if (tab === 'buy') { h += `<div class="hint">秤婆：「${G.flags.debt_cleared ? '債簿的事，集裡記著。給你們算便宜。' : '東西不騙人，價錢也不騙人。'}」</div>`;
    const pf = (G.cons.potion || 0) >= G.beltMax; h += `<div class="card"><div class="row"><div style="flex:1"><b>止血膏</b><div class="hint" style="padding:2px 0">${CONSUM.potion.d}</div></div><button class="bt ${pf ? '' : 'gold'}" data-pot="1" ${pf ? 'disabled' : ''}>${pf ? '帶滿了' : CONSUM.potion.price + ' 銖'}</button></div></div>`;
    for (const it of shopStock()) h += `<div data-buy="${it.uid}">${itemHtml(it, { tap: true, noNew: true })}<div class="cost">${shopPrice(it) > G.coin ? `<b class="lack">${shopPrice(it)}</b>` : `<b>${shopPrice(it)}</b>`} 銖</div></div><div style="height:8px"></div>`;
    if (!G.shop.items.length) h += '<div class="empty">攤子上沒東西了。過一陣子再來。</div>';
  } else { h += '<div class="hint">秤婆把東西放上秤，報一個數。她不還價。</div>'; const list = sortItems(G.bag.map(u => G.items[u]).filter(it => it && !it.leg && !it.keep)).reverse(); if (!list.length) h += '<div class="empty">背包裡沒有能賣的。</div>';
    for (const it of list) h += `<div data-sell="${it.uid}">${itemHtml(it, { tap: true, noNew: true })}<div class="cost">賣 <b>${Math.round(itemValue(it) * .5)}</b> 銖</div></div><div style="height:8px"></div>`; }
  pb.innerHTML = h;
  $$('#panel [data-pot]').forEach(b => b.onclick = () => { if (G.coin < CONSUM.potion.price) { toast('銖不夠。'); sfx('deny'); return; } G.coin -= CONSUM.potion.price; G.cons.potion++; sfx('coin'); openShop('buy'); });
  $$('#panel [data-buy]').forEach(d => d.onclick = async () => { const it = G.shop.items.find(x => x.uid === d.dataset.buy), pr = shopPrice(it); if (G.coin < pr) { toast('銖不夠。'); sfx('deny'); return; } if (!(await confirmBox('買下？', `<b style="color:${RAR[it.rar].c}">${itemName(it)}</b><br>${pr} 銖`, '買'))) return; G.coin -= pr; G.shop.items = G.shop.items.filter(x => x !== it); it.isNew = true; giveItem(it); sfx('coin'); openShop('buy'); });
  $$('#panel [data-sell]').forEach(d => d.onclick = async () => { const it = G.items[d.dataset.sell]; if (it.rar >= 2 && !(await confirmBox('賣掉？', `<b style="color:${RAR[it.rar].c}">${itemName(it)}</b><br>${Math.round(itemValue(it) * .5)} 銖`, '賣'))) return; G.coin += Math.round(itemValue(it) * .5); removeItem(it.uid); sfx('coin'); const sc = pb.scrollTop; openShop('sell'); $('#panel .pb').scrollTop = sc; });
  return PM.onClose ? null : panelWait();
}
// ---------- 層圖：在去過的入口之間移動 ----------
function openLayerMap() {
  if (S.dialog || S.cut) return; sfx('ui');
  let h = '<div class="mb cut"><h3>壓艙層</h3><div class="seam"></div><div class="ms"><div class="hint" style="text-align:center">越上面，離那個光點越近。</div><div class="lm">';
  LAYER_ORDER.forEach((z, i) => { const Zd = ZONES[z], ok = !!G.disc[z], here = Z.id === z; h += `<div class="lmz ${here ? 'here' : ''} ${ok ? '' : 'no'}" data-z="${z}"><div class="lv">${z === 'market' ? '集' : Zd.safe ? '營' : i === 0 ? '底' : Zd.zl}</div><div><b>${ok ? Zd.n : '？？？'}</b><span>${ok ? Zd.sub + (here ? '　・現在在這裡' : '') : '還沒有路'}</span></div></div>`; });
  h += '</div></div><div class="mf"><button class="bt">留在這裡</button></div></div>'; modalShow(h);
  $('#modal .mf .bt').onclick = () => { sfx('ui'); modalClose(); };
  $$('#modal .lmz').forEach(d => d.onclick = () => { const z = d.dataset.z; if (z === Z.id) { $('#modal .mf .bt').onclick(); return; } sfx('confirm'); modalClose(); travel(z); });
}
