// ============ 劇情（三）：錨鏈根、真相、終幕、營火夜話、殘窗 ============

// ═════════ 五・錨鏈根 ═════════
SCRIPTS.arrive_root = async () => {
  if (G.flags.root_intro) return; flag('root_intro');
  await lines([null, '風是從上面灌下來的。'], [null, '抬頭。那個光點比任何時候都大——\n大到看得出來：它是一個洞。'], [null, '一條鏈子從洞口垂下來。每一節都比人高。\n它沒有垂到底。最後一節懸在半空，斷口朝下。'], ['?yuan', '天錨鏈。\n……比我想的近。'], ['?luo', '沒有人走到過這麼近。\n走到的，都沒有回來。']);
};
SCRIPTS.pre_r1 = async () => { await lines([null, '鏽衛。比別處的都新。\n這裡沒有人來過，牠們沒有用舊。'], ['warden', '……錨衛……\n……識別……失敗。'], ['?yuan', '牠剛才說了「錨衛」。'], ['wei', '我聽到了。']); };
SCRIPTS.pre_r2 = async () => { await lines([null, '平台的邊緣。失重的人聚在這裡——\n這裡離浮石最近。']); };
SCRIPTS.pre_r3 = async () => { await lines([null, '石階上，最後一隊。\n牠們排得很整齊，像在等人檢閱。']); };
SCRIPTS.tr_boss_approach = async () => {
  await camTo(8.6, 8.2, baseZoom() * .9, 1500);
  await lines([null, '平台盡頭，一具庭衛跪在斷鏈底下。\n牠比其他的大三倍。下半身跟鏈子的最後一節熔在了一起。'], [null, '四根錨樁，把牠釘在原地。']);
};
SCRIPTS.e_boss = async () => {
  await lines([null, '牠抬起頭。面甲裡的光是白的。'], ['keeper', '止步。此鏈已斷。'], ['keeper', '奉令：守至無人問。'], G.flags.piece2 ? [null, '你在碑上看過這一句。\n在你的名字底下。'] : null, ['keeper', '未獲准上行者，退。'],
    has('yuan') ? ['yuan', '那四根樁在替牠撐著。先拆樁。\n頭上吊著的那幾段鏈，打下來也砸得到樁。'] : [null, '四根樁上的鏈子繃得很直。\n牠的力氣，有一半是從樁上來的。'], [null, '牠把自己從地上撐了起來。']);
};
SCRIPTS.e_parley = async () => {
  const can = (G.pieces || 0) >= 2;
  await lines([null, '牠停了。\n戟尖離你的臉，不到一尺。'], [null, '面甲裡的光暗下去，又亮起來。\n這一次是藍的——跟你醒來的那口棺，一樣的藍。'], ['keeper', '……識別。\n……錨衛。'], ['keeper', '錨衛大人。'], ['keeper', '屬下「不移」，奉大人之令守此鏈。\n三百年又十一日。無人問。'], has('yuan') ? [null, '岑鳶的箭還搭在弦上。她忘了放。'] : null, ['?yuan', '牠叫你什麼？']);
  const k = await choose([{ t: '「有人問了。」', sub: can ? '牠等這一句，等了三百年。' : '你知道有一句話。你湊不齊它。', dis: !can, key: can }, { t: '（什麼都不說。把劍舉起來。）', sub: '牠擋在路上。' }]);
  if (k === 1) { await lines([null, '你把劍舉了起來。'], ['keeper', '……領教。']); return 'fight'; }
  await lines(['wei', '……有人問了。'], [null, '牠跪了下去。\n整座平台跟著沉了一寸。'], ['keeper', '領令。'], ['keeper', '請大人示下：此鏈，此路，今後如何。']);
  const j = await choose([{ t: '「下去。去守鏽錨集。」', sub: '這條路，交給集裡的人自己管。' }, { t: '「停機。你守完了。」', sub: '路開著。沒有人看守。' }, { t: '「續令。我們過去之後，繼續守。」', sub: '除了你們，誰也不准上去。' }]);
  if (j === 0) { await lines(['keeper', '領令。守集。'], [null, '牠把自己從錨樁上一根一根解下來。\n三百年來，牠第一次往下走。']); flag('keeper_ji'); G.flags.path = 'gate'; addRep('ji', 2); }
  else if (j === 1) { await lines(['keeper', '……領令。'], [null, '光滅了。\n牠還跪著，像一座碑。']); flag('keeper_rest'); G.flags.path = 'open'; }
  else { await lines(['keeper', '領令。守至無人問。'], [null, '牠側過身，讓出一個人寬的路。']); flag('keeper_stay'); G.flags.path = 'seal'; }
  flag('boss_spared'); deed(j === 0 ? '鏈根那具庭衛聽了他一句話，下來守鏽錨集了。' : j === 1 ? '鏈根那具庭衛聽了他一句話，停了。' : '鏈根那具庭衛聽了他一句話，讓他過去，然後繼續守。');
  return 'end';
};
SCRIPTS.post_boss = async (g, res) => {
  const f = G.flags; flag('boss_done');
  if (f.boss_spared) { await lines([null, '牠解下胸前的一枚印，雙手遞過來。']); await giveLeg('writ'); }
  else {
    await lines([null, '牠倒下去的時候，說了最後一句。'], ['keeper', '……錨衛大人。\n屬下……未曾移。']); await giveLeg('heart');
    deed('鏈根那具庭衛倒了。牠守了三百年又十一日。');
    if (res && res.pylons === 0) await lines([null, '四根樁早就斷了。牠倒下去，沒有扯動任何東西。\n平台晃了一下，穩住了。']);
    else {
      await lines([null, '牠倒下去，還連著的錨樁被一起扯倒。\n平台從中間裂開。'], [null, '入口的閘架鬆了。幾百斤的鐵柵往下滑——']); shake(18); sfx('slam');
      if (has('luo') && G.aff.luo >= 6) {
        await lines([null, '駱山把門盾插進滑槽，用背頂住。'], ['luo', '過去。'], ['?yuan', '駱山——'], ['luo', '我守了一輩子的門。\n這是第一扇，我想讓人過去的。'], has('yuan') ? ['luo', '岑鳶。上面的秤。\n替我看一眼。'] : ['luo', '上面的秤。替我看一眼。'], [null, '你們過去了。'], [null, '鐵柵落下來的聲音，在淵裡響了很久。', FULL]);
        UI.dlg.classList.remove('full'); leaveHero('luo'); flag('luo_dead'); flag('luo_gone'); deed('閘架塌的時候，駱山用門盾頂住了它。他沒有過來。'); toast('駱山不在了。');
      } else if (has('luo')) { await lines([null, '駱山把你們推過去，自己滾了進來。\n鐵柵擦著他的背落下。'], ['luo', '……沒事。門板擋了一下。']); G.party.luo.wounds = Math.min(3, (G.party.luo.wounds || 0) + 1); }
      else if (f.exposed) { await lines([null, '跟上來看鏈的幾個集民，還站在閘架底下。'], [null, '來不及喊。']); flag('gate_deaths'); addRep('ji', -2); deed('閘架塌了。底下站著跟上來看鏈的集民。'); }
      else await lines([null, '鐵柵落下來，砸在你們身後。\n回頭的路還在。只是窄了。']);
    }
  }
  await finale();
};
// 終幕的三幕。每演完一幕就存一次：之後在哪一幕關掉遊戲，回來就從那一幕接（每一幕自己記得演過了沒有）
async function finale() { checkpoint('n_cutlink'); await SCRIPTS.sc_reveal(); checkpoint('n_cutlink'); await SCRIPTS.sc_path(); checkpoint('n_cutlink'); await SCRIPTS.sc_epilogue(); }
function reforgeBlade() {
  flag('reforged'); const L0 = LEG.anchorblade; let it = Object.values(G.items).find(x => x.keep);
  if (it) { it.leg = 'anchorblade'; it.rar = 4; it.il = L0.il; it.base = L0.base; it.affs = L0.affs.map(a => ({ id: a[0], t: a[1] })); delete it.bn; it.isNew = true; G.lore.anchorblade = 1; }
  else it = giveItem(genLegend('anchorblade'));
  for (const id of G.roster) G.party[id].hp = Math.min(G.party[id].hp, heroNow(id).hpMax); return it;
}
SCRIPTS.sc_reveal = async () => {
  if (G.flags.reforged) return; const y = has('yuan'), l = has('luo');
  await walkCut(7, 5); await camTo(5.6, 3.8, baseZoom() * 1.15, 1200);
  await lines([null, '斷鏈的最後一節垂在平台盡頭。\n切口是平的。平得像鏡子。'], [null, '不是扯斷的。不是鏽斷的。\n是一劍。從裡面，往外。'], [null, '切口裡嵌著東西。'], [null, '半截劍。'], ['?yuan', '……那是——'], [null, '你把手裡的殘刃舉起來。\n斷口，對著斷口。'], [null, '合上了。', FULL]);
  await fadeTo(1); await sceneRose('all', '墜庭之夜'); await fadeTo(0); sfx('glass');
  await lines([null, '三百年前。錨心室。\n鏈子在響。整座城都在響。', FULL], [null, '窗外，地在往下陷。圍城的火把一片一片滅掉。\n不是被風吹滅的。是地沒了。', FULL], [null, '六張椅子上的人，舉了手。\n第七張是空的。坐那張椅子的人，站在你旁邊。', FULL],
    ['voice', '他們要再抽一口。\n抽乾底下那些人腳下的地，讓城再飛一百年。', FULL], ['voice', '子葳。我不下令。\n我只告訴你，我的秤怎麼說。', FULL], ['voice', '斬。', FULL], [null, '你斬了。', FULL],
    [null, '然後你對牆邊那具庭衛說：\n「錨已斷。守至無人問。」', FULL], [null, '然後，城掉下來了。', FULL], [null, '住在艙底的那些人，掉得最深。', FULL]);
  await fadeTo(1); await sceneOff(); await fadeTo(0); UI.dlg.classList.remove('full');
  const it = reforgeBlade();
  await lines([null, '劍沒有完全合上。\n接縫是一道金色的線。']);
  await showLoot({ items: [it], title: '殘刃・斷錨' });
  if (y) await lines(...(G.aff.yuan >= 6 ? [['yuan', '你那時候砍下去，有問過底下的人嗎？'], ['wei', '沒有。'], ['yuan', '那這一次，你得問。']] : [['yuan', '三百年。'], ['yuan', '我們在這底下三百年。\n是因為你。'], [null, '她沒有哭。她把弩背回背上。手在抖。']]));
  if (l) {
    await lines(['luo', '我押過十一趟人。\n我沒有資格問你。'], ['luo', '……可是我想知道。你後悔嗎？']);
    const k = await choose([{ t: '「不知道。」' }, { t: '「不後悔。」' }, { t: '「每一天。——如果我記得每一天的話。」' }]);
    await lines(k === 0 ? ['luo', '我也是。十一趟，每一趟都不知道。'] : k === 1 ? ['luo', '……那你比我強。或者比我狠。'] : ['luo', '記不得也好。記得的人，才知道那有多長。']); if (k !== 1) addAff('luo', 1);
  }
  if (!y && !l) await lines([null, '沒有人可以問你後不後悔。\n你是一個人走到這裡的。']);
  deed('天錨鏈是從裡面斬斷的。那把劍是他的。');
};
SCRIPTS.sc_path = async () => {
  const f = G.flags; if (f.path) return;
  await lines([null, '斷口以上，每一節都還連著洞口。\n爬得上去。'], [null, '守在這裡的東西不在了。\n這條路以後給誰走，現在是你說了算。']);
  const k = await choose([{ t: '開鏈。誰想上去，都可以。', sub: '底下的人會湧上去。上面有什麼，沒有人知道。' }, { t: '設關。交給鏽錨集的人自己管。', sub: '誰能上去、為什麼上去，讓底下的人自己秤。' }, { t: '封鏈。我們過去之後，把最下面幾節砍掉。', sub: '不會再有人被送上去。也不會再有人自己上得去。' }]);
  f.path = ['open', 'gate', 'seal'][k];
  if (k === 0) await lines(['?yuan', '……這一次，你問了嗎？']);
  else if (k === 1) { await lines(['?yuan', '讓他們自己秤。\n這個，我服。']); if (has('yuan')) addAff('yuan', 1); addRep('ji', 1); }
  else { await lines(['?yuan', '你又替底下的人決定了。']); if (has('yuan')) addAff('yuan', -2); }
  deed(k === 0 ? '他說：鏈開著。誰想上去都可以。' : k === 1 ? '他說：這條路，讓集裡的人自己管。' : '他說：他們過去之後，把鏈砍掉。');
};
// 終幕：依做過的事，一段一段交代
function epilogue() {
  const f = G.flags, out = [], y = has('yuan'), l = has('luo');
  const stopped = !f.deal_zhuo && f.c4_done;
  out.push(['鏽錨集', (f.oil_ji ? '鏽錨集的燈，一盞一盞亮了回來。有人在錨爪上多掛了一盞。沒有人問那是給誰的。' : f.oil_split ? '鏽錨集的燈比以前暗，但是每一盞都亮著。上貢的名單，從二十個劃成了十個。' : f.oil_bang ? '鏽錨集的燈亮著，燒的是繩幫的油。集裡少了二十個人。小耳每天去東門看一次。' : '油渠歸了繩幫。鏽錨集的燈，一盞一個月三十銖。點得起的人家，一個月比一個月少。')
    + (f.oil_bang ? '' : f.deal_zhuo ? (f.oil_split ? '那十個人，後來還是上去了。' : '今年的二十個人上去了。帳是你帶上去的。') : f.exposed ? '那份名單後來被釘在秤場的柱子上。今年那一欄是空的。' : stopped ? (f.oil_split ? '那十個人，最後沒有上去。' : '今年沒有人來領人。明年的事，沒有人知道。') : '') + (f.gate_deaths ? '閘架底下的那幾個人，秤婆在秤簿上各記了一頁。' : '') + (f.debt_cleared ? '債簿燒掉以後，有幾戶人家第一次在門口點了自己的燈。' : '')]);
  out.push(['繩幫', f.zhuo_dead ? '卓九斤死了。繩幫散成了十幾股，每一股都說自己才是鏈主。懸骸廊裡吊著的東西，有幾樣是新的。' : f.deal_zhuo ? '卓九斤的買賣照做。他說，上面的秤今年多給了一成油。他沒有說為什麼。' : f.exposed ? (f.zhuo_hung ? '卓九斤在秤底下吊了三天。後來有人把他放了下來。他沒有走。他坐在廳裡，把每一桿秤都拆了。' : '算盤揹著卓九斤往上走了。走之前，他把剩下的帳本全燒了。') : '卓九斤往上走了。沒有人看到他到了哪裡。繩幫還在收稅，只是手軟了一點——沒有人知道他哪一天回來。']);
  out.push(['守墜人', f.oil_split ? '碑前的火小了一半。陸沉在碑腳刻了一個新的名字：陸安。刻得很深。' : f.flame_out ? '墜碑前沒有火了。守墜人往更深的地方去。有人說看過陸沉一個人回來，用手指把碑上的名字，一個一個描過。' : '不滅焰還在燒。陸沉說，碑上該添二十個名字。她還沒有決定刻不刻。']);
  const camp = [f.r_hammer ? '老鎚的爐子' : null, f.r_blind ? '盲叔的刻台' : null, f.r_zhu ? '阿朮的藥棚' : null, f.r_ear ? '小耳的聽風板' : null].filter(Boolean), n = G.shards.length;
  out.push(['覆舟營', (camp.length ? `倒扣的船底下，多了${camp.join('、')}。` : '倒扣的船底下，還是只有那一堆火。') + (n >= 12 ? '那扇窗整個亮了。夜裡，它是營裡最亮的東西。' : n ? `窗框裡鑲回了 ${n} 片。剩下的還在底下某個地方。` : '窗框還是空的。')]);
  out.push(['岑鳶', y ? (G.aff.yuan >= 6 ? '岑鳶走在最前面。她說她認路。她沒有上去過。' : '岑鳶走在最前面，離你三步遠。不多，也不少。') : f.yuan_deal ? '岑鳶一個人先上去了。鏈上有她的鉤痕，每一道都很深。' : '岑鳶一個人先上去了。她沒有回頭等任何人。']);
  out.push(['駱山', f.luo_dead ? '駱山的門盾還卡在閘槽裡。秤婆叫人不要動它。集裡的孩子說，東門現在有兩扇。' : f.luo_stay ? '駱山留在了東門。夜裡，他還是守著。門板背面多了一行字，不是記號，是一個名字。' : l ? '駱山走在最後面。他回頭看了一次鏽錨集的燈。然後沒有再回頭。' : '駱山回了東門。夜裡，他還是守著。有人看到他在門板背面刻東西——不是記號。是一個名字。四十一斤的那一個。']);
  out.push(['鏈', f.path === 'open' ? '鏈開了。頭一個月，上去了兩百多人。沒有人下來。底下的人把這個當成好消息。' : f.path === 'gate' ? (f.keeper_ji ? '那具庭衛現在站在鏽錨集的東門外。要上鏈的人，先到秤場，在秤簿上留一行字：寫自己為什麼要上去。' : '鏈根設了關。要上去的人，先在秤簿上留一行字：寫自己為什麼要上去。秤婆不批，也不駁。她只是記。') : (f.keeper_stay ? '那具庭衛還跪在鏈底下。有人問，牠就答：「奉令。」沒有人再問第二句。' : '最下面的三節鏈被砍掉了。不會再有人被送上去。也不會再有人自己上得去。有人在斷口底下放了一盞燈。')]);
  return out;
}
SCRIPTS.sc_epilogue = async () => {
  const f = G.flags; if (f.vol1_done) return;
  if (has('luo') && G.aff.luo >= 6 && (f.oil_bang || f.oil_sold || G.rep.ji <= 0) && !f.luo_asked) {
    flag('luo_asked'); await lines(['luo', '集裡的燈……我放不下。'], ['luo', '我想留下。東門總得有人守。']);
    const k = await choose([{ t: '「留下吧。」' }, { t: '「集裡有秤婆。跟我們上去。」' }]);
    if (k === 0) { await lines(['luo', '上面的秤。替我看一眼。']); leaveHero('luo'); flag('luo_stay'); flag('luo_gone'); deed('駱山留在了鏽錨集。'); } else { await lines(['luo', '……好。']); addAff('luo', 1); }
  }
  const ep = epilogue();
  await fadeTo(1); await sceneBlack('底層的後來'); await fadeTo(0);
  for (const [t, s] of ep) await say(null, s, { full: true, name: t });
  const n = activeIds().length;
  await lines([null, n > 1 ? '你們開始往上爬。' : '你開始往上爬。', FULL], [null, '鏈很長。', FULL], [null, '那個光點，三百年來第一次，有人離它越來越近。', FULL]);
  if (has('yuan')) await lines([null, '爬到看不見底的時候，岑鳶問：\n「上面的人知道嗎？知道是誰斬的？」', FULL], [null, '你說：「到了就知道。」', FULL]);
  flag('vol1_done'); checkpoint(); sfx('win');
  await notice('第一卷　壓艙層　完', `<div class="end">${ep.map(a => `<h4>${a[0]}</h4>${a[1]}`).join('')}<h4>你走過的路</h4>${Math.floor(G.stat.sec / 60)} 分鐘・${G.stat.battles} 場戰鬥・墜擊 ${G.stat.slams} 次・連攜 ${G.stat.links} 次・殘窗 ${G.shards.length} / 12・金繼 ${Object.keys(G.lore).length} / ${Object.keys(LEG).length}</div><div class="hint" style="text-align:center">往上是中層。七席的殘黨，還在爭那幾塊浮石。<br>底層還留著：懸賞、沒開的箱子、沒找齊的殘窗。你做過的每一件事，都會跟著你上去。</div>`, '留在底層');
  await fadeTo(1); await sceneOff(); UI.dlg.classList.remove('full'); await fadeTo(0);
};
SCRIPTS.n_cutlink = async () => {
  if (!G.flags.vol1_done) { await finale(); return; }
  await lines([null, '切口還是那麼平。\n你的劍現在是一整把了。接縫是一道金線。'], [null, '鏈子在風裡輕輕地響。往上看，那個洞很亮。']);
};

// ═════════ 營火夜話 ═════════
function campTalks() {
  const f = G.flags, y = has('yuan'), l = has('luo'), t = [], done = id => Object.values(G.zones).some(z => z.enc[id]);
  const add = (id, n, cond, key) => { if (cond && !f['ct_' + id]) t.push({ id: 'ct_' + id, n, key: !!key }); };
  add('yuan_tax', '岑鳶在數銖', y && done('s1'));
  add('luo_door', '駱山的門板', l);
  add('name', '碑上的名字', f.piece2 && (y || l) && !f.reforged);
  add('yuan_bird', '岑鳶在拆她的鉤', y && f.yuan_knows, true);
  add('yuan_hook', '岑鳶的第一根鉤', y && f.ct_yuan_bird && !f.got_firsthook && G.aff.yuan >= 4, true);
  add('luo_confess', '駱山有話要對岑鳶說', y && l && f.ledger_burnt && G.aff.luo >= 5, true);
  add('reconcile', '岑鳶把水囊丟了過去', y && l && f.no_link_yl && f.luo_done, true);
  add('luo_plank', '駱山在刻東西', l && f.luo_done, true);
  add('luo_plank2', '東門原來的門板', l && f.ct_luo_plank && !f.got_nightdoor && G.aff.luo >= 4, true);
  add('before_root', '明天', f.c4_done && !f.boss_done);
  return t;
}
SCRIPTS.ct_yuan_tax = async () => {
  await lines([null, '岑鳶在數銖。數了兩遍，數字一樣。\n她還是數了第三遍。'], ['yuan', '攀稅。要上去，得過繩幫的關。過關要秤重，一斤兩銖。'], ['yuan', '我四年前被秤過一次。不是我要秤的。\n上面不收。帳上寫：「退」。'], ['yuan', '我弟弟收了。岑雀。十一歲。\n他們說上面有天，有吃不完的東西。'], ['yuan', '我不信。\n可是我得親眼看到：我不信的，是對的還是錯的。']);
  const k = await choose([{ t: '「我跟妳去找。」' }, { t: '「上面要是什麼都沒有呢？」' }, { t: '（往火裡添一根柴。）' }]);
  if (k === 0) { await lines(['yuan', '……你連自己的事都還沒搞清楚。'], ['yuan', '隨便你。']); addAff('yuan', 1); }
  else if (k === 1) await lines(['yuan', '那我就把他帶下來。']);
  else { await lines(['yuan', '……你這個人，還算安靜。']); addAff('yuan', 1); }
  flag('ct_yuan_tax');
};
SCRIPTS.ct_luo_door = async () => {
  await lines([null, '駱山把門盾立在火邊烤。背面全是刻痕。'], [null, '十一道很深。\n後面的很淺，密密麻麻，數不清。']);
  const k = await choose([{ t: '「淺的是什麼？」' }, { t: '「深的是什麼？」' }]);
  await lines(k === 0 ? ['luo', '守過的夜。一夜一道。'] : ['luo', '……以後說。'], ['luo', '這塊板子本來是東門的門。門框爛了，板子還是好的。'], ['luo', '我想：門守不住了，至少板子還能擋東西。']);
  addAff('luo', 1); flag('ct_luo_door');
};
SCRIPTS.ct_name = async () => {
  await lines(['?yuan', '碑上那個名字。'], ['?yuan', '如果真的是你——三百年。\n你躺在石頭裡的時候，我們家已經換了十幾代人。'], ['?luo', '鏽衛看到他會停。庭造的匣子他打得開。碑上有他的名字。'], ['?luo', '我守門的時候學到一件事：\n三件事湊在一起，就不是巧了。']);
  const k = await choose([{ t: '「我想知道我做了什麼。」' }, { t: '「我不想知道。」' }, { t: '「不管我是誰，路都是往上。」' }]);
  if (k === 0) await lines(has('yuan') ? ['yuan', '那就往上。答案不在底下。\n底下只有碑。'] : ['luo', '那就往上。底下只有碑。']);
  else if (k === 1) await lines(has('luo') ? ['luo', '不想知道的事，通常已經知道一半了。'] : ['yuan', '你騙誰。']);
  else { await lines(has('yuan') ? ['yuan', '這句我愛聽。'] : ['luo', '……嗯。']); if (has('yuan')) addAff('yuan', 1); }
  flag('ct_name');
};
SCRIPTS.ct_yuan_bird = async () => {
  await lines([null, '岑鳶在拆她鉤柄上的纏布。一層一層。\n最裡面是一條小孩的腰帶，繡著一隻雀。'], ['yuan', '上收。他到了。'], ['yuan', '四年了。我第一次知道，他至少到了。'], ['yuan', '這條是他的。我逃出來那天，從他床上拿的。\n我一直纏在最裡面，怕弄髒。'], ['yuan', '不怕了。'], [null, '她把腰帶纏在最外面，打了一個死結。']);
  await learnUlt('yuan'); flag('ct_yuan_bird'); addAff('yuan', 1);
  if (G.aff.yuan >= 4) await SCRIPTS.ct_yuan_hook(); else await lines(['yuan', '……我還有一根鉤。舊的。\n以後再說。']);
};
SCRIPTS.ct_yuan_hook = async () => {
  await lines(['yuan', '這一根。我做的第一根鉤。逃出來那天，用的就是它。'], ['yuan', '之前捨不得用。怕斷。'], ['yuan', '現在想：斷了，也是用斷的。']);
  flag('got_firsthook'); flag('ct_yuan_hook'); await giveLeg('firsthook'); toast('到「隊伍」裡替岑鳶換上。');
};
SCRIPTS.ct_luo_confess = async () => {
  await lines(['luo', '岑鳶。'], ['luo', '那本簿子燒了。上面有一行，妳沒有看到。'], ['luo', '「押送：駱山」。\n妳弟弟的那一趟。'], [null, '很久。火裡有一根柴斷了。'], ['yuan', '……你可以不說的。\n簿子燒了。沒有人會知道。'], ['luo', '我知道。'], ['yuan', '……他路上有沒有哭？'], ['luo', '沒有。\n他問我，秤完可不可以回去。'], ['yuan', '……他就是那樣。'], [null, '那天晚上，他們兩個坐在火的同一邊。\n沒有再說話。']);
  flag('luo_confessed'); flag('ct_luo_confess'); flag('yuan_knows'); addAff('yuan', 1); addAff('luo', 1); deed('簿子燒了以後，駱山自己把那一行說了出來。');
};
SCRIPTS.ct_reconcile = async () => {
  await lines(['yuan', '你開了那些門。'], ['luo', '開晚了。'], ['yuan', '晚了四年。'], ['yuan', '……晚了也算。'], [null, '她把自己的水囊丟給他。他接住了。']);
  G.flags.no_link_yl = 0; flag('ct_reconcile'); addAff('yuan', 1); addAff('luo', 1); toast('岑鳶與駱山，又能連攜了。'); deed('岑鳶把水囊丟給了駱山。');
};
SCRIPTS.ct_luo_plank = async () => {
  await lines([null, '駱山把門盾翻過來，在背面刻東西。'], ['luo', '以前刻的是趟數。後來刻的是夜。'], ['luo', '今天刻的是門。\n我開的那一扇。']);
  flag('ct_luo_plank'); addAff('luo', 1);
  if (G.aff.luo >= 4) await SCRIPTS.ct_luo_plank2();
};
SCRIPTS.ct_luo_plank2 = async () => {
  await lines(['luo', '這一塊，才是東門原來的門板。我一直收在營裡。'], ['luo', '背著它，比背那塊新的重。'], ['luo', '現在背得動了。']);
  flag('got_nightdoor'); flag('ct_luo_plank2'); await giveLeg('nightdoor'); toast('到「隊伍」裡替駱山換上。');
};
SCRIPTS.ct_before_root = async () => {
  const y = has('yuan'), l = has('luo');
  if (!y && !l) { await lines([null, '只有你一個人。\n火還是一樣生。'], [null, '明天上鏈根。']); flag('ct_before_root'); return; }
  await lines([null, '火比平常小。沒有人去添。'], ['?yuan', '明天上鏈根。'], ['?yuan', '我想了四年，上面是什麼樣子。\n現在只差一段路，我反而不敢想了。'], ['?luo', '上去的人沒有回來過。可能是上面太好。可能是別的。'], ['?luo', '不管哪一種，總得有人看了，回來說。']);
  const k = await choose([{ t: '「不管上面是什麼，一起看。」' }, { t: '「睡吧。」' }]);
  if (k === 0) { if (y) addAff('yuan', 1); if (l) addAff('luo', 1); await lines(['?yuan', '……嗯。'], y ? null : ['luo', '……嗯。']); }
  flag('ct_before_root');
};
// 營地裡找同伴說話：有夜話先說夜話，沒有就是一句現在的心情
SCRIPTS.t_yuan = async () => {
  const f = G.flags, t = campTalks().find(x => x.id.indexOf('yuan') >= 0 && x.id !== 'ct_luo_confess'); if (t) { await SCRIPTS[t.id](); return; }
  await lines(['yuan', f.reforged ? '……你那時候砍下去的事，我還在想。\n別催我。' : f.c4_done ? '鏈根。再上去就是了。' : f.c2_done ? '懸骸廊。我發過誓不回去。\n誓這種東西，在這底下撐不久。' : f.threejaw_dead ? '集裡的燈在滅。小時候我以為燈本來就會亮。\n像石頭本來就會掉。' : '坡頂那隻三顎，我一個人不敢碰。\n現在是兩個人。']);
};
SCRIPTS.t_luo = async () => {
  const f = G.flags, t = campTalks().find(x => x.id.indexOf('luo') >= 0); if (t) { await SCRIPTS[t.id](); return; }
  await lines(['luo', f.reforged ? '我押過十一趟。你斬了一劍。\n我們兩個，誰也別安慰誰。' : f.c4_done ? '鏈根我沒去過。押送只到秤前。\n再上去，是別人的事。' : f.c2_done ? '懸骸廊我熟。閉著眼都走得出來。\n我寧可不熟。' : '門我交給秤婆的孫子看著。他才十二歲。\n……所以得快去快回。']);
};

// ═════════ 殘窗：十二片「墜庭之夜」═════════
const SHARDS = [
  '城的肚子裡，有一間沒有窗的房。\n有人躺進石頭以前，把劍放在胸口。劍只有半截。',
  '艙底的孩子在數石頭。大人說：我們夠重，城才飛得穩。\n孩子問：那我們什麼時候可以上去看？',
  '七張椅子圍成一圈。第七張面向窗外。\n坐在上面的人，看的是底下。',
  '地上的人舉著火把，圍住了錨。他們的田在往下陷。\n他們喊的話，城上聽不見。',
  '點燈的人沿著庭燎街，一盆一盆添油。\n他不知道那是最後一次。',
  '六隻手舉起來。窗外的火把滅了一片。\n不是風。是地沒了。',
  '一個女人把自己的印從桌上拿走。\n她說：我的秤，不這樣秤。',
  '信差鳥全都飛了起來。牠們一輩子不落地。\n那天晚上，牠們沒有地方可以落。',
  '看門的狗在渡空舟上叫了一整夜。\n沒有人來解牠的項圈。',
  '有人在錨心室外面拍門，喊：不要！\n也有人喊：快！兩種聲音，一樣多。',
  '鏈子斷的時候沒有聲音。\n聲音是後來才到的。',
  '城開始往下掉的時候，艙底的人最先知道。\n他們抱著石頭，像大人教的那樣。',
];
const SHARD_HINT = ['靜滯窖，棺室的東南角。', '骸骨坡，第一片鏽鐵地的東南邊。', '骸骨坡，往東北角鏽鐵台的路上。', '鏽錨集，東南邊的棚子後面。', '沉油渠，進去第一片鏽鐵地的西南角。', '沉油渠，長苔那一片的西南邊。', '沉油渠，墜碑平台的西南邊。', '懸骸廊，進去第一段的西南角。', '懸骸廊，債籠那一片的東北角。', '懸骸廊，帳房的西南邊。', '錨鏈根，崖邊那一片的西南角。', '錨鏈根，石階那一片的東北角。'];
