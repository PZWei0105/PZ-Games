// ============ 劇情（一）：腳本框架、序、骸骨坡、鏽錨集 ============
// 每段劇情是一個 async 函式；say／choose 等玩家點了才往下走。
const SCRIPTS = {};
S.cut = 0;
async function runScript(id, ent, arg) {
  const fn = SCRIPTS[id]; if (!fn) return undefined;
  S.cut++; if (Z) { Z.path = null; Z.goal = null; }
  let r; try { r = await fn(ent || {}, arg); } catch (e) { console.error('script ' + id, e); }
  endTalk(); S.cut--;
  if (!S.cut) { if (S.mode === 'explore' && Z) { Cam.tzoom = baseZoom(); Cam.tcy = .52; refreshBlocked(); refreshZoneLights(); hudZone(); } saveGame(); }
  return r;
}
const has = id => !!(G.party[id] && G.party[id].active);
const wait = ms => new Promise(r => setTimeout(r, Dlg.auto ? 0 : ms));
const FULL = { full: true };
// lines(['yuan','…'], [null,'旁白'], ['?luo','他在隊上才會說'])
async function lines(...ls) { for (const l of ls) { if (!l) continue; let who = l[0]; if (who && who[0] === '?') { who = who.slice(1); if (!has(who)) continue; } await say(who, l[1], l[2]); } }
function joinHero(id) { const p = G.party[id]; p.active = true; p.lv = G.lv; p.skills = heroSkillsAt(id, p.lv).slice(0, 4); p.hp = heroNow(id).hpMax; p.newSkills = []; if (Z) refreshFollowers(); if (S.mode === 'explore') hudZone(); sfx('join'); }
function leaveHero(id) { const p = G.party[id]; p.active = false; for (const s of ['armor', 'trinket', 'relic']) if (p.eq[s]) { G.bag.push(p.eq[s]); delete p.eq[s]; } if (Z) refreshFollowers(); if (S.mode === 'explore') hudZone(); }
async function fight(encId, opts) { endTalk(); if (S.mode !== 'explore') return null; const g = Z.groups.find(x => x.id === encId); if (!g) return { over: 'win' }; return await engage(g, 0, opts); }
function walkCut(x, y) { return new Promise(res => { if (Dlg.auto || !walkTo(x, y) || !Z.path || !Z.path.length) { res(); return; } Z.goal = null; const done = () => { clearTimeout(tm); res(); }; const tm = setTimeout(() => { if (Z.auto === done) { Z.auto = null; Z.path = null; res(); } }, 7000); Z.auto = done; }); }
async function camTo(x, y, zoom, ms) { Cam.tx = x; Cam.ty = y; Cam.tz = tileH(x, y); if (zoom) Cam.tzoom = zoom; await wait(ms == null ? 900 : ms); }
function notice(title, body, btn) { if (Dlg.auto) return Promise.resolve(); return new Promise(res => { modalShow(`<div class="mb cut"><h3>${title}</h3><div class="seam"></div><div class="ms">${body}</div><div class="mf"><button class="bt gold">${btn || '好'}</button></div></div>`); $('#modal .mf .bt').onclick = () => { sfx('ui'); modalClose(); res(); }; }); }
async function learnUlt(id) { const p = G.party[id]; if (p.ultOk) return; p.ultOk = true; sfx('ult'); const sk = SK[HERO[id].ult]; await notice('奧義', `<div class="lv">${HERO[id].n}領悟了「${sk.n}」</div><div class="sk on" style="border-color:#c9a23a"><span class="sl" style="background:var(--gold)">${SEAL[sk.id]}</span><div><b>${sk.n}</b><span class="meta">勢 5</span><p>${sk.d}</p></div></div><div class="hint">頭像下面那五格「勢」集滿，就能放。</div>`); }
async function gotPiece(n, text) { if (G.flags['piece' + n]) return; flag('piece' + n); G.pieces = (G.pieces || 0) + 1; sfx('piece'); await notice('口令殘片', `<div class="lv" style="font-size:21px;letter-spacing:.24em;margin:14px 0">${text}</div><div class="hint" style="text-align:center">${G.pieces} / 3　${G.pieces >= 2 ? '你知道這句話該怎麼接了。' : '只有半句。'}</div>`); }
async function giveLeg(id) { const it = giveItem(genLegend(id)); await showLoot({ items: [it], title: '金繼' }); return it; }
function gain(o) { const nm = { coin: '銖', scrap: '碎料', dust: '浮石屑', lacquer: '金繼漆' }, t = []; for (const k in o) { G[k] += o[k]; t.push(`${nm[k]} +${o[k]}`); } if (t.length) { toast(t.join('　')); sfx('coin'); } }
function unlockZone(z) { if (!G.disc[z]) { G.disc[z] = 1; toast(`有路可以去「${ZONES[z].n}」了。`); } }
function nearPass(x, y) { x = Math.round(x); y = Math.round(y); const h = Z.m.ht[y][x]; let best = { x, y }, bd = 99; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = x + dx, ty = y + dy; if (passable(tx, ty) && Z.m.ht[ty][tx] === h) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = { x: tx, y: ty }; } } } return best; }
function teleport(x, y) { const p = nearPass(x, y), L = Z.leader; L.x = p.x; L.y = p.y; L.z = tileH(p.x, p.y); refreshFollowers(); Cam.tx = p.x; Cam.ty = p.y; Cam.tz = L.z; camSnap(); }
// 依劇情增減敵人、決定先後手
function encFoes(E) {
  let list = E.id === 'h2' && G.flags.ledger_grudge ? E.foes.concat(['ledger']) : E.foes.slice();
  // 同伴離隊後人手不夠：四個以上的敵群少來一兩個（精英與層主本人不少）
  const short = E.zone === 'vault' || E.zone === 'slope' || E.boss ? 0 : Math.max(0, 3 - activeIds().length);
  for (let k = 0; k < short && list.length >= (k ? 3 : 4); k++) { for (let i = list.length - 1; i >= 0; i--) if (!FOE[list[i]].elite && !FOE[list[i]].boss) { list.splice(i, 1); break; } }
  return list;
}
function encAmbush(g, a) { if (g.id === 'h2' && G.flags.ledger_saved) return 1; return a; }

// ---------- 現在該做什麼（顯示在左上角）----------
function currentObjective() {
  const f = G.flags, done = id => Object.values(G.zones).some(z => z.enc[id]);
  if (f.vol1_done) return '底層的事告一段落了。還有懸賞、沒開的箱子、沒找齊的殘窗。';
  if (!f.met_yuan) return done('z0a') ? '往上走。' : '離開這個地方。';
  if (!f.camp_intro) return '跟著岑鳶走：<b>西北邊的棧道</b>。';
  let s;
  if (!f.threejaw_dead) s = Z.id === 'camp' ? '從營地<b>南邊的棧道</b>出去，上骸骨坡撿貨。' : Z.id === 'slope' ? '往<b>坡頂</b>走。那裡有一艘稅舟的殘骸。' : '回骸骨坡，往坡頂走。';
  else if (!f.piece1) s = '稅舟的艙裡有一只<b>匣子</b>。';
  else if (!f.scale_met) s = f.market_seen ? '找<b>秤婆</b>秤貨。她在秤場。' : '帶著貨去<b>鏽錨集</b>。';
  else if (!has('luo') && !f.luo_gone && !f.c2_done) s = '<b>東門</b>的夜巡駱山認得去油渠的路。';
  else if (!f.c2_done) s = !f.saw_memorial ? '<b>沉油渠</b>：看舊油渠還有沒有油。往西北走到底。' : !f.met_luchen ? '跟墜碑前的<b>碑守</b>談談。' : f.elder_fight ? '陸安在碑頂。讓他下來。' : '平台南邊有一道<b>閘</b>。油給誰，在那裡決定。';
  else if (!f.c4_done) s = !f.gate_done && !f.guild_pass ? '<b>懸骸廊</b>：往鏈根的路在繩幫手上。' : f.zhuo_fight ? '卓九斤在廳裡等。' : !f.c3_done && !f.saw_zhuo ? '穿過懸骸廊。<b>帳房</b>和卓九斤的廳都在最裡面。' : '<b>卓九斤</b>在最裡面的廳。';
  else if (!f.boss_done) s = '<b>錨鏈根</b>：往上的路只剩這一條。';
  else s = '去看看<b>斷鏈的切口</b>。';
  if (Z.id !== 'camp' && campTalks().some(t => t.key)) s += '<br><span style="color:var(--gold)">有人想在營火邊說話。</span>';
  return s;
}

// ═════════ 序・醒（靜滯窖）═════════
SCRIPTS.intro = async () => {
  await sceneBlack();
  await lines([null, '黑。', FULL], [null, '很高的地方，有一個光點。', FULL], [null, '你記得的，只有這麼多。', FULL]);
  await sceneOff(); toast('點地面：走過去。按住不放：一直走。');
};
SCRIPTS.n_pod = async () => {
  await lines([null, '一口石棺，從中間裂開了。石頭是淡藍色的，摸起來比看起來輕。'], [null, '棺蓋內側有人用指甲刻過字，刮掉了大半。認得出來的只有最後幾個：\n「……為什麼不行。」']);
  if (G.flags.reforged) await lines([null, '你現在知道躺進去的是誰了。\n你還不知道，是誰要他記得。']);
};
SCRIPTS.pre_z0a = async () => { await lines([null, '有東西在啃骨頭。\n牠抬起頭。']); };
SCRIPTS.post_z0a = async () => { await lines([null, '你手裡是半截劍。握法是對的。\n你不記得學過。'], ['wei', '……手還記得。']); };
SCRIPTS.pre_z0b = async () => {
  await lines([null, '三隻。牠們散開了，像是練過。'], [null, '一支弩箭從上面釘下來，釘在最前面那隻的腳邊。'],
    ['yuan', '別動！那個藍衣服的——對，我說你。'], ['yuan', '從上面掉下來的？還會動？\n……行。先打。打完再算你值多少。']);
  joinHero('yuan'); flag('met_yuan');
};
SCRIPTS.post_z0b = async () => {
  await lines(['yuan', '我叫岑鳶。這口窖是我先看上的。'], ['yuan', '你是墜客吧。上頭掉下來的東西，身上通常有好料——通常也都摔爛了。\n你怎麼沒爛？'], ['wei', '不知道。'], ['yuan', '名字呢？'], ['wei', '……魏子葳。'],
    [null, '這三個字自己從嘴裡出來。\n別的沒有跟著出來。'], ['yuan', '就這樣？行吧。'],
    ['yuan', '這樣談：你能打，我認路。這底下撿到的東西對分。\n我在湊一筆攀稅，湊夠了就往上走。你要去哪，我不管。']);
  const k = await choose([{ t: '「好。」' }, { t: '「往上，是哪裡？」' }, { t: '「我不需要人帶路。」' }]);
  if (k === 0) { addAff('yuan', 1); await lines(['yuan', '爽快。']); }
  else if (k === 1) { await lines(['yuan', '看到那個光點沒有？這底下每個人都看得到。那就是上面。'], ['yuan', '上面有路可以出去。\n……有人是這樣說的。'], ['wei', '我跟妳走。']); addAff('yuan', 1); }
  else await lines(['yuan', '你連自己是誰都說不上來。'], ['yuan', '走吧。跟不跟隨你。']);
  await lines(['yuan', '西北邊那條棧道。我的窩不遠。']);
  deed('最底下的窖裡，有一個人醒了過來。岑鳶把他領了回去。');
};
SCRIPTS.x_vault_out = async () => {
  if (!has('yuan') && !G.flags.met_yuan) { await lines([null, '棧道往上。風是從那裡灌下來的。\n但是後面還有東西在動——而且你不認得路。']); const L = Z.leader, p = nearPass(4, 4); L.x = p.x; L.y = p.y; refreshFollowers(); return; }
  await travel('camp');
};
SCRIPTS.arrive_camp = async () => {
  if (G.flags.camp_intro) return; flag('camp_intro');
  await lines([null, '一艘渡空舟，倒扣在渣土上。船肋撐著，底下生了一堆火。'], ['yuan', '覆舟營。名字我取的。\n以前不只我一個人住。'],
    ['yuan', '火隨便坐。坐下來，傷會好。'], ['yuan', '北邊那個窗框別碰——'], ['yuan', '……算了，你碰吧。我撿了四年，一片玻璃都沒鑲回去過。']);
  if (G.shards.length) await lines(['yuan', '你身上那片是彩窗的碎片？\n……給我。我替你鑲上去。']);
  await lines(['yuan', '南邊的棧道出去是骸骨坡。上頭掉下來的東西全堆在那裡。\n坡上有鏽衛在巡，所以沒人敢撿。所以有貨。'], ['yuan', '歇夠了就走。']);
  G.disc.slope = 1; saveGame();
};

// ═════════ 營火 ═════════
SCRIPTS.sys_camp = async () => {
  const talks = campTalks();
  const k = await choose([{ t: '休息', sub: '生命回滿，傷勢治好' + (G.flags.r_zhu ? '，止血膏補滿' : '') }, talks.length ? { t: '夜話', sub: talks.map(t => t.n).join('、'), key: talks.some(t => t.key) } : null, { t: '整備', sub: '隊伍、裝備、招式' }, { t: '離開' }], { prompt: '營火。' });
  if (k === 0) { await fadeTo(1); restFull(); G.cons.potion = Math.max(G.cons.potion, G.flags.r_zhu ? G.beltMax : 2); sfx('rest'); saveGame(); await wait(600); await fadeTo(0); toast('歇過了。'); }
  else if (k === 1) { let t = talks[0]; if (talks.length > 1) { const j = await choose(talks.map(x => ({ t: x.n, key: x.key })).concat([{ t: '算了' }]), { prompt: '誰？' }); if (j >= talks.length) return; t = talks[j]; } endTalk(); await SCRIPTS[t.id](); }
  else if (k === 2) setTimeout(() => openMenu('party'), 40);
};
SCRIPTS.sys_fire = async () => {
  const st = zs(Z.id);
  if (st.fire >= 1) { await lines([null, '灰還是溫的。這堆火坐過了。\n回覆舟營歇一次，它才會再燒起來。']); return; }
  const k = await choose([{ t: '坐下', sub: '全隊生命回滿（每趟一次）' }, { t: '先不要' }], { prompt: '一堆殘火。有人留了柴。' }); if (k !== 0) return;
  st.fire = 1; await fadeTo(1); for (const id of activeIds()) G.party[id].hp = heroNow(id).hpMax; sfx('rest'); await wait(450); await fadeTo(0); toast('生命回滿了。');
};
SCRIPTS.sys_hook = async e => {
  if (!has('yuan')) { await lines([null, '一根釘死的鉤樁。繩子垂在搆不到的地方。\n得有個會用鉤索的。']); return; }
  await lines(['yuan', String(e.id).endsWith('_b') ? '下去了。抓好。' : '這種高度，一鉤就上去。抓好。']);
  await fadeTo(1); teleport(e.tx, e.ty); sfx('hook'); await fadeTo(0);
};
SCRIPTS.sys_shard = async e => {
  const n = G.shards.length; await sceneRose(G.shards.slice(), `殘窗　${n} / 12`); sfx('glass');
  await say(null, SHARDS[e.id - 1]);
  if (!G.flags.shard_tip && has('yuan')) { flag('shard_tip'); await lines(['yuan', '彩窗的碎片。營裡那個窗框就是它的。\n帶回去，鑲得上。']); }
  if (n >= 12 && !G.flags.window_full) { flag('window_full'); await lines([null, '十二片都回來了。\n窗上那個舉著劍的人，你現在認得出是誰。']); G.lacquer += 2; toast('金繼漆 +2'); deed('覆舟營的殘窗，十二片全鑲了回去。'); }
  await sceneOff();
};

// ═════════ 一・拾骸（骸骨坡）═════════
SCRIPTS.arrive_slope = async () => {
  if (G.flags.slope_intro) return; flag('slope_intro');
  await lines(['yuan', '看到沒有。整面坡都是。\n城掉下來的時候，先掉的是這些。'], ['yuan', '地上那片紅的別踩。那是牠們看得到的範圍。'], ['yuan', '從旁邊繞，貼到背後再動手。牠們來不及轉頭。']);
};
SCRIPTS.pre_s1 = async () => { await lines(['yuan', '後面那隻蜥蜴，你的劍搆不到。'], ['yuan', '我來射。不然我把牠鉤過來，你砍。']); };
SCRIPTS.pre_s2 = async () => { await lines(['yuan', '負骸蟹。背上那塊殼，砍不動的。'], ['yuan', '把牠掀起來。你那一下由下往上挑的——殼護不到肚子。'], ['yuan', '牠重，挑一下不夠。連挑兩下，趁牠還沒站穩。\n牠舉起鉗子不動的時候，就是在蓄力——敲牠，別讓牠夾下來。']); };
SCRIPTS.t_hammer_rescue = async () => {
  await lines(['hammer', '……那隻蟹走了？\n壓了我大半天。牠當我是塊好石頭。'], ['hammer', '他們叫我老鎚。打鐵的。繩幫要我替他們打鉤，我說我只打鍋。\n然後我就在這裡了。'], ['yuan', '你會打鐵？'], ['hammer', '會。有爐子嗎？'], ['yuan', '有火。'], ['hammer', '火也行。']);
  flag('r_hammer'); deed('岑鳶的營地多了一個打鐵的。'); toast('老鎚去了覆舟營：鍛爐可以用了。');
};
SCRIPTS.t_hammer = async () => {
  const k = await choose([{ t: '打鐵', sub: '強化、拆解' }, { t: '「你怎麼會被蟹壓住？」' }, { t: '走了' }], { prompt: '老鎚在敲東西。火星往上飄，沒有落下來。' });
  if (k === 0) { endTalk(); await openForge(); }
  else if (k === 1) await lines(['hammer', '繩幫的人把我丟在坡上。說，不打鉤，就去餵蟹。'], ['hammer', '蟹不吃人。蟹只是喜歡重的東西。\n這底下每一樣東西都喜歡重的東西。'], G.flags.reforged ? ['hammer', '你那把劍。接起來了。\n那道金縫不是我的手藝。也不是這底下任何人的。'] : ['hammer', '你那把劍我看過了。斷口是老的，比我爺爺還老。\n我接不起來。我只能讓剩下的這半截利一點。']);
};
SCRIPTS.pre_s3 = async () => { await lines(['yuan', '那堆發藍光的石頭看到沒有？浮石。\n打它一下，周圍的東西全都會輕。'], ['yuan', '旁邊那桶是燈油。\n……你懂我意思。']); };
SCRIPTS.tr_first_warden = async () => {
  await camTo(18.6, 12.4, baseZoom() * 1.12, 1100);
  await lines([null, '前面站著一具盔甲。銅綠色，比人高一個頭。\n面甲是一片彩窗，裡面有光。'], ['yuan', '鏽衛。城還在天上的時候就在巡了。\n別讓牠看到——'], [null, '牠轉過頭。面甲裡的光停在你身上。'],
    ['warden', '……識別。\n……錨……'], [null, '戟舉到一半，停了一拍。'], ['warden', '……識別失敗。未獲准上行。'], ['yuan', '牠剛才是不是在等你說什麼？'], ['wei', '……不知道。'], ['yuan', '上面那盞燈會叫人。先打燈。']);
  flag('warden_hesitated');
};
SCRIPTS.e_ledger = async () => {
  await camTo(9.6, 18.6, baseZoom() * 1.1, 900);
  await lines([null, '一艘小艇的殘骸。底下壓著一個人，穿繩幫的灰衣，懷裡死抱著一本簿子。'], [null, '幾隻犬圍著他轉。牠們不急。'],
    ['rigger', '喂——！那邊的！救人！有賞！\n繩幫有賞！'], ['yuan', '收稅的。他們叫他算盤。\n集裡每個人欠多少，都記在他那本簿子上。'], ['yuan', '……我的也是。']);
  const k = await choose([{ t: '過去' }, { t: '再看看', sub: '先離開。之後還可以回來。' }]);
  return k === 0;
};
SCRIPTS.post_s5 = async () => {
  await lines(['rigger', '好、好，身手不錯。\n把這塊板子搬開。我回去跟鏈主說你們的好話。'], ['yuan', '（壓低聲音）那本簿子。\n拿走它，集裡一半的人就不欠繩幫了。'], ['yuan', '他腿斷了。爬得回去。\n……大概。']);
  const k = await choose([{ t: '搬開板子，救他。', sub: '繩幫會記得這個人情。' }, { t: '拿走債簿。人留在這裡。', sub: '集裡的債在你手上了。他爬得回去——大概。' }, { t: '「救你可以。撕掉岑鳶的那幾頁。」', sub: '她欠的那三頁。' }]);
  if (k === 0) {
    await lines(['rigger', '識相。以後過關報我的名字，攀稅收你們一半。'], [null, '他一拐一拐地走了。簿子抱得很緊。'], ['yuan', '……你知道那裡面寫了多少人嗎。']);
    flag('ledger_saved'); addRep('bang', 1); deed('坡上，他救了繩幫的收稅人。債簿還在那個人手上。');
  } else if (k === 1) {
    await lines([null, '你把簿子從他懷裡抽出來。他抓了一下，沒抓住。'], ['rigger', '那是鏈主的東西！你知道那上面有多少——\n我記住你了。藍衣服的。我記住你了！'], ['yuan', '走。'], [null, '走出很遠，還聽得到他在喊。\n喊的是數字。']);
    flag('has_debtbook'); flag('ledger_grudge'); addAff('yuan', 1); addRep('bang', -1); deed('坡上，他拿走了繩幫的債簿。收稅的還活著，少了一條腿。'); toast('拿到了「債簿」。交給誰，是你的事。');
  } else {
    await lines(['rigger', '三頁？就為了三頁？\n……行。行！'], [null, '他撕得很小心，像在割自己的肉。'], [null, '岑鳶把那三頁接過去，看了很久。\n然後撕成很小的碎片，撒進風裡。'], ['rigger', '帳上沒有妳了，丫頭。\n鏈主問起來，我會說是蟲蛀的。'], ['yuan', '……']);
    flag('ledger_saved'); flag('yuan_cleared'); addAff('yuan', 2); deed('坡上，他救了繩幫的收稅人，換岑鳶的三頁帳。');
  }
  flag('c1_done');
};
SCRIPTS.pre_s6 = async () => {
  await camTo(7.4, 6.4, baseZoom() * 1.1, 900);
  await lines([null, '一艘稅舟的殘骸，船肋朝天。有東西躺在船肋中間。\n牠站起來的時候，鏈子在響。'], ['yuan', '三顎。脖子上那些全是項圈。\n牠咬死一個，收一條。'], ['yuan', '先殺小的。旁邊有同伴的時候，牠皮厚。']);
};
SCRIPTS.e_threejaw = async () => {
  await lines([null, '牠倒下去的時候，項圈散了一地。\n最舊的那一條上有字。'], ['yuan', '艙還在。裡面有個匣子，白的，沒有鎖孔。\n我試過。打不開。']);
  flag('threejaw_dead'); deed('骸骨坡頂的三顎死了。坡上的人敢多走幾步了。');
};
SCRIPTS.n_courtbox = async () => {
  await lines([null, '一只白色的匣子。沒有鎖孔，只有一個手印大小的凹痕。'], ['?yuan', '我按過。別人也按過。\n誰按都沒用。'], [null, '你把手放上去。\n大小剛好。'], [null, '匣子開了。'],
    [null, '裡面的東西你認得。不是記得——是認得。'], [null, '一個女人的聲音，很近：\n「子葳。那一劍要從上往下。」', FULL], [null, '「不是砍。是放手。」', FULL]);
  await learnUlt('wei');
  await lines([null, '匣底壓著一片薄銅。上面刻著半句話。']);
  await gotPiece(1, '「錨已斷。」');
  await lines(['?yuan', '……為什麼你的手打得開庭造的東西？'], ['?yuan', '算了。別說「不知道」。'], ['?yuan', '貨夠了。去鏽錨集，找秤婆秤一秤。\n回營地，從棧道走。']);
  deed('稅舟裡那只誰也打不開的匣子，他一按就開了。'); unlockZone('market');
};

// ═════════ 二・鏽錨集 ═════════
SCRIPTS.tr_market_arrive = async () => {
  await camTo(16, 15, baseZoom() * .92, 1300);
  await lines([null, '鏽錨集。底下唯一的聚落。\n一根生鏽的大錨倒在正中間，人沿著錨爪搭棚子。'], [null, '燈柱很多。\n亮著的不到一半。'], ['?yuan', '上個月還亮著七成。'], [null, '有人看了你們一眼，又把頭低下去。\n秤場那邊，一個老太太在秤一袋釘子。']);
  flag('market_seen');
};
SCRIPTS.t_scale = async () => {
  const f = G.flags;
  if (!f.scale_met) {
    await lines(['scale', '岑家的丫頭。又上坡了。'], ['?yuan', '有貨。秤吧。'], ['scale', '貨我秤。人我也秤。'], ['scale', '你。站過來。'], [null, '她沒有動秤。她只是看。'],
      ['scale', '庭造的料子。庭造的站法。\n三百年沒人這樣站了——我也只在圖上看過。'], ['scale', '我不問你從哪來。我只記一筆：「某日，岑鳶帶回一個人。」'], ['scale', '你以後做了什麼，我一行一行往下寫。這本叫秤簿。\n集裡每個人都有一頁。']);
    gain({ coin: 80 });
    await lines([null, '她數了八十銖，推過來。'], ['scale', '坐。有件事。'], ['scale', '燈油。集裡的油是跟繩幫買的。\n上個月他們說，油渠乾了。以後油得用別的東西換。'], ['scale', '他們要二十個人。叫「上貢」。年年都要，今年要得多。\n上去的沒有一個回來——繩幫說是上面收了，過好日子去了。'],
      ['scale', '燈滅了，苔會長進來，失重的會飄進來。燈是命。\n二十個人也是命。我秤不出來。'], ['scale', '舊油渠在沉油渠那一頭。繩幫說乾了。\n我不信繩幫。可是我的人走不到那裡。你們走得到。'], ['scale', '去看一眼。有油沒油，回來告訴我。'], ['scale', '要去，先到東門找駱山。那條路他認得。\n他不見得肯走。']);
    flag('scale_met'); deed('秤婆翻開了他的那一頁。'); return;
  }
  // 回報油渠
  if (f.c2_done && !f.scale_reported) {
    flag('scale_reported');
    if (f.oil_ji) { await lines(['scale', '油來了。昨天夜裡渠響了一整晚。'], ['scale', '碑前那盞火的事，我聽說了。\n這筆我記在集的頭上，不記在你頭上。']); gain({ coin: 120 }); }
    else if (f.oil_split) { await lines(['scale', '油來了。不多。夠。'], ['scale', '陸家的老碑守……我年輕的時候見過他。他那時候腳還在地上。'], ['scale', '這筆我記下來。記得很清楚。']); gain({ coin: 60 }); }
    else if (f.oil_bang) await lines(['scale', '你們去看了。油在。\n你們沒有拿。'], ['scale', '我不問為什麼。我記下來。'], ['scale', '今天早上，繩幫來領人了。']);
    else await lines(['scale', '繩幫的人今天來說，油渠是他們的了。'], ['scale', '……我秤過你。\n我秤錯了。']);
  }
  for (;;) {
    const opts = [{ t: '買賣' }, f.has_debtbook ? { t: '把債簿交給她。', key: true } : null, G.rep.ji >= 2 && !f.got_scale ? { t: '「妳那桿秤……」', key: true } : null, { t: '「上面有什麼？」' }, { t: '「城是怎麼掉下來的？」' }, { t: '走了' }];
    const k = await choose(opts, { prompt: '秤婆把秤桿擱平，等你開口。' });
    if (k === 0) { endTalk(); await openShop(); saveHere(); }
    else if (k === 1) {
      await lines(['scale', '……這是算盤的簿子。'], ['scale', '你知道這上面是多少人的幾年嗎。'], [null, '她一頁一頁撕。撕下來的放進秤盤。\n秤盤沉到底。然後她把整盤倒進火盆。'], ['scale', '債沒了。繩幫會來要。\n讓他們來。']);
      f.has_debtbook = 0; flag('debt_cleared'); addRep('ji', 2); addRep('bang', -1); if (has('yuan')) addAff('yuan', 1); deed('他把繩幫的債簿交給秤婆燒了。集裡一半的人不欠了。');
    } else if (k === 2) { await lines(['scale', '這桿你拿去。仿的。'], [null, '她說謊的時候，眼睛不眨。']); flag('got_scale'); await giveLeg('scale'); }
    else if (k === 3) await lines(['scale', '我祖母的祖母說，上面有天。\n天是什麼，她沒說清楚。她自己也沒見過。'], ['scale', '我們是壓艙民的後代。城還在飛的時候，就住在艙底。\n城在天上，我們在城的肚子裡。'], ['scale', '那個光點是淵口。我只知道這麼多。\n繩幫知道的比我多。所以他們能賣。']);
    else if (k === 4) await lines(['scale', '地上的人打上來，把錨鏈弄斷了。\n老話是這樣說的。'], ['scale', '守墜人有另一個說法。你去沉油渠會遇到他們。'], f.piece2 ? ['scale', '……你已經看過那塊碑了。\n那我沒有什麼好說的了。'] : ['scale', '聽聽就好。']);
    else return;
  }
};
SCRIPTS.t_luo_gate = async () => {
  if (!G.flags.scale_met) { await lines(['luo', '東門晚上不開。\n白天也沒什麼好出去的。'], [null, '他看了岑鳶一眼。多看了一下。'], ['?yuan', '看什麼。'], ['luo', '沒有。']); return; }
  await lines(['luo', '秤婆要你們去油渠。'], ['?yuan', '你是夜巡的。你認得我。'], ['luo', has('yuan') ? '岑家的。四年前從懸骸廊跑出來的那個。\n繩幫的帳上還掛著妳。' : '你是岑家丫頭帶回來的那個人。'], ['?yuan', '所以？'], ['luo', has('yuan') ? '所以沒有。我是守門的，不是收帳的。' : '集裡的事我都知道一點。'],
    ['luo', '油渠那條路我走過。\n……以前走過。我跟你們去。'], ['?yuan', '我們不需要——'], ['luo', '集裡的燈不能滅。\n我守了四年的門。燈滅了，門就沒有用了。']);
  const k = await choose([{ t: '「走吧。」' }, { t: '「你以前是做什麼的？」' }]);
  if (k === 1) await lines(['luo', '押東西的。後來不押了。'], ['?yuan', '押什麼？'], ['luo', '走吧。']);
  joinHero('luo'); unlockZone('sump'); deed('東門的駱山跟他們走了。四年來，東門第一次沒有人守夜。'); toast('駱山加入了。');
};
SCRIPTS.t_ear_market = async () => {
  await lines(['ear', has('yuan') ? '岑鳶姊！妳帶了誰？\n他的劍怎麼只有一半？' : '你就是岑鳶姊帶回來的那個人？\n你的劍怎麼只有一半？'], ['?yuan', '小耳。集裡最吵的東西。\n也是最靈的。'], ['ear', '我聽到繩幫的人跟秤婆講話。他們說二十個。'], ['ear', '我數過了。集裡十四歲以下的，二十一個。'], ['ear', '我姊十三。'],
    ['?yuan', '……妳來營裡。替我們聽風。有吃的。'], has('yuan') ? ['ear', '那我姊呢？'] : ['ear', '你們那裡缺不缺人？我什麼都聽得到。'], ['?yuan', '先妳。\n妳姊的事，我在想。']);
  flag('r_ear'); deed('小耳去了覆舟營。那孩子什麼都聽得到。'); toast('小耳去了覆舟營：聽風板可以看了。');
};
SCRIPTS.t_ear = async () => {
  const f = G.flags;
  const k = await choose([{ t: '看聽風板', sub: '懸賞、哪裡還有沒撿的東西' }, { t: '「最近聽到什麼？」' }, { t: '走了' }], { prompt: '小耳坐在船肋上晃腳。' });
  if (k === 0) { endTalk(); await openBoard(); }
  else if (k === 1) await lines(f.vol1_done ? ['ear', '大家都在講鏈根的事。講的都不一樣。\n我比較想聽你講。'] : f.ear_sister_gone ? ['ear', '……我姊上去了。'] : f.c4_done ? ['ear', '懸骸廊那邊好吵。吵了一整夜。\n然後就很安靜。'] : f.c2_done ? ['ear', '集裡的人在講油的事。每個人講的都不一樣。'] : ['ear', '鏽衛走路是三步一停。失重的人不走路。\n繩幫的人走路，鉤子會響。'], f.ear_sister_gone ? ['ear', '繩幫的人說上面有天。\n天是什麼顏色？你從上面來的，你知道嗎？'] : null);
};
SCRIPTS.t_toll = async () => {
  const f = G.flags;
  await lines(['bruiser', f.c4_done ? (f.zhuo_dead ? '……鏈主沒了。現在誰說了算，我也不知道。' : f.exposed ? '別看我。那本簿子上，也有我弟弟。' : '鏈主交代過，你們是客。') : '繩幫的買賣不在這裡談。要談，上懸骸廊。', { name: '繩幫的人' }]);
  if (f.has_debtbook && !f.c4_done) {
    await lines(['bruiser', '那本簿子。鏈主出一百五十銖買回去。\n不問你怎麼拿到的。', { name: '繩幫的人' }]);
    const k = await choose([{ t: '賣。', sub: '一百五十銖。集裡的債照舊。' }, { t: '不賣。' }]);
    if (k === 0) { f.has_debtbook = 0; flag('debt_sold'); gain({ coin: 150 }); addRep('bang', 1); if (has('yuan')) { addAff('yuan', -1); await lines(['yuan', '……你賣回去了。']); } deed('他把債簿賣回給繩幫。一百五十銖。'); }
  }
};
SCRIPTS.t_vill1 = async () => { const f = G.flags; await lines(['vill_a', f.oil_ji ? '燈亮了。\n我女兒問我為什麼哭。' : f.oil_split ? '燈比以前暗。但是亮著。\n夠了。' : f.oil_bang ? '油來了。人走了。\n我隔壁空了一張床。' : f.oil_sold ? '繩幫說油渠歸他們了。一盞燈，一個月三十銖。\n我點不起。' : '燈滅到我家門口了。\n再滅一盞，我就得把孩子抱到秤場去睡。']); };
SCRIPTS.t_vill2 = async () => { const f = G.flags; await lines(['vill_b', f.exposed ? '我看到那本簿子了。「按重計」。\n我弟弟四十斤。' : f.zhuo_dead ? '卓九斤死了。那我弟弟呢？\n沒有人能問了。' : '我弟弟是三年前上去的。繩幫說上面有天。\n我問他們，天是什麼顏色。沒有一個答得出來。']); };
SCRIPTS.t_vill3 = async () => { const f = G.flags; await lines(f.boss_done ? ['vill_c', '聽說鏈根那個東西不動了。\n三百年了。'] : ['vill_c', '我爺爺說，他爺爺見過城在天上。\n像一口倒過來的鍋，底下拖著一條鏈子。'], f.boss_done ? ['vill_c', '我爺爺的爺爺要是知道，會說什麼呢。'] : ['vill_c', '鏈子斷的那天晚上，底下的人是先聽到聲音，才看到光的。']); };
