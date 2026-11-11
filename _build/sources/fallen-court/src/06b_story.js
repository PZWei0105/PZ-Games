// ============ 劇情（二）：沉油渠、懸骸廊 ============

// ═════════ 三・沉油渠 ═════════
SCRIPTS.arrive_sump = async () => {
  if (G.flags.sump_intro) return; flag('sump_intro');
  await lines(['?luo', '沉油渠。城還在飛的時候，燈油從上面流下來，流到這裡。\n現在倒過來了。底下的人來這裡刮。'], ['?luo', '空氣裡有浮石粉。待久了，人會輕。\n變輕的人……你們會看到。'], has('luo') ? null : [null, '空氣裡有一股油味，還有別的——粉一樣的東西，吸進去，腳步會變輕。']);
};
SCRIPTS.pre_o1 = async () => { await lines([null, '兩個人影，腳離地一尺。嘴在動。'], ['?luo', '失重的。別聽他們念什麼。'], ['?luo', '打死的時候離遠一點。他們會散開，散到的東西全往上飄。\n包括你。'], ['?yuan', '用箭。知道了。']); };
SCRIPTS.pre_o2 = async () => { await lines(['?luo', '淵苔。自己會長回來，越拖越難打。\n怕火。'], ['?luo', '腳下是油。'], ['?yuan', '那不是正好？']); };
SCRIPTS.pre_o3 = async () => {
  await lines([null, '水閘前站著三具鏽衛。\n最前面那具的面甲轉過來，停了一拍。'], ['warden', '……錨……\n……識別失敗。'], ['?luo', '牠們看到你，為什麼會頓一下？'], ['?yuan', '坡上那一具也是。'], ['wei', '……']);
};
SCRIPTS.pre_o4 = async () => { await lines(['?luo', '苔有根，掀不動。先把苔燒掉。'], ['?luo', '旁邊那簇浮石留著用。飄著的那兩個，一震就上天。']); };
SCRIPTS.t_zhu_rescue = async () => {
  await lines(['zhu', '你們把那團苔打掉了？\n我在這塊石頭上困了兩天。底下一動，它就噴孢子。'], ['zhu', '我叫阿朮，採藥的。淵苔的孢柄磨成粉可以止血。\n我本來是來採它的。它不這麼想。'], ['zhu', '你們有營地嗎？有火就行。\n止血膏我會配。不收錢，收留我就好。']);
  flag('r_zhu'); deed('覆舟營多了一個採藥的。'); toast('阿朮去了覆舟營：藥棚可以用了。');
};
SCRIPTS.t_zhu = async () => {
  const k = await choose([{ t: '藥棚', sub: '火油瓶、浮石彈、腰帶' }, { t: '「失重的人，治得好嗎？」' }, { t: '走了' }], { prompt: '阿朮在搗東西。一股青苔味。' });
  if (k === 0) { endTalk(); await openHerb(); }
  else if (k === 1) await lines(['zhu', '治不好。浮石粉進了骨頭，就出不來了。'], ['zhu', '先是腳離地。然後是記性——輕的東西先飄走。\n最後連名字都飄走。'], ['zhu', '你也是在浮石裡躺過的吧。你身上有那個味道。\n……你還記得自己的名字。這已經很少見了。']);
};
SCRIPTS.tr_memorial = async () => {
  await camTo(6.5, 5, baseZoom() * .95, 1400);
  await lines([null, '一片白石平台。正中間的地是彩窗鋪的，沒有碎。'], [null, '盡頭立著一塊碑。碑前一盞火，比集裡所有的燈加起來還亮。'], [null, '碑頂上飄著一個人。\n一條鏈子拴著他的腳踝，另一頭在一個白衣女人手裡。'], ['?luo', '守墜人。那個是碑守。'], ['?luo', '……那盞火，就是油的去處。']);
  flag('saw_memorial');
};
SCRIPTS.n_elder = async () => { await lines([null, '老人閉著眼，嘴在動。\n鏈子繃得很直——不是他在往上飄，是有什麼在把他往上拉。']); };
SCRIPTS.n_flame = async () => { await lines([null, '火不大，但是很穩。\n油從石槽裡一滴一滴進來。三百年沒有斷過。']); };
SCRIPTS.t_luchen = async () => {
  const f = G.flags;
  if (f.c2_done) { await lines(['luchen', f.oil_split ? '火小了。他下來了。\n兩件事我都還在習慣。' : '……謝謝。\n我知道這不是你們該付的價。']); return; }
  if (f.elder_fight) { await lines(['luchen', '……快一點。\n不要讓他痛。']); await fight('o5'); return; }
  if (!f.met_luchen) {
    await lines(['luchen', '碑前不帶兵器說話。\n……算了。這底下沒有人放得下兵器。'], ['luchen', '我是陸沉，這一代的碑守。上面那位是我父親，上一代的。\n他在碑前坐了四十年，坐到腳離了地。'], ['luchen', '你們是為油來的。鏽錨集的人每隔幾年來一次。\n我每次都說一樣的話。'],
      ['luchen', '這盞火叫不滅焰。墜庭那一夜點的，沒有熄過。\n碑上是那一夜死的人。火滅了，名字就只是石頭上的坑。'], ['?luo', '集裡的燈滅了，死的是現在的人。'], ['luchen', '我知道。\n所以我每次說完，都睡不著。'], ['luchen', '閘在平台南邊。開哪一邊，油就往哪一邊流。\n我攔不住你們。我只是告訴你們，那是什麼。'], ['luchen', '……去看看碑吧。來了的人，都該看一眼。']);
    flag('met_luchen');
  }
  for (;;) {
    const k = await choose([{ t: '「墜庭那一夜，發生了什麼？」' }, { t: '「妳父親……」' }, f.split_agreed ? null : { t: '「油，可以分嗎？」', key: true }, { t: '走了' }], { prompt: '陸沉握著鏈子。握得很鬆，像握著一隻風箏。' });
    if (k === 0) await lines(['luchen', '集裡的人說，是地上的人把鏈子打斷的。\n繩幫說，是城太老了。'], ['luchen', '守墜人只傳一句話。傳了三百年：'], ['luchen', '「是自己人放的手。」'], ['luchen', '誰放的、為什麼，沒有傳下來。\n也許是故意不傳。']);
    else if (k === 1) await lines(['luchen', '失重的人，最後都會散。我早該讓他散的。'], ['luchen', '我拴著他，不是因為他還在。\n是因為我下不了手。'], ['luchen', '他有時候念我母親的名字。有時候念碑上的。\n我的名字，他四年沒念過了。']);
    else if (k === 2) { await lines(['luchen', '一半的油……\n火會小，不會滅。'], ['luchen', '我可以答應。但是我要一樣東西。'], ['luchen', '替我做我做不到的事。\n讓他下來。'], ['luchen', '想好了，去轉那道閘。我會把鏈子放長。']); flag('split_agreed'); }
    else return;
  }
};
SCRIPTS.n_stele = async () => {
  if (G.flags.piece2) { await lines([null, '「錨衛　魏子葳」。\n底下一行小字：「守至無人問。」']); return; }
  await lines([null, '碑很高。名字從頂上一路刻到腳邊，越下面刻得越淺。\n後來的人沒有力氣了。'], [null, '你的眼睛自己找到了一行。很上面，刻得很深。'], [null, '「錨衛　魏子葳」', FULL], ['?yuan', '……同名吧。'], ['?yuan', '三百年前的人了。同名。\n對吧？'], has('luo') ? [null, '駱山沒有說話。\n他看的不是碑。是你握劍的手。'] : null, [null, '那一行底下有一句小字。別的名字底下都沒有。']);
  await gotPiece(2, '「守至無人問。」');
  const k = await choose([{ t: '「我不記得。」' }, { t: '「那是我。」' }, { t: '（什麼都不說。）' }]);
  if (k === 0) await lines(['?yuan', '你最好是真的不記得。']);
  else if (k === 1) { await lines(['?yuan', '別鬧。'], ['?luo', '他沒有在鬧。']); if (has('luo')) addAff('luo', 1); }
  else await lines([null, '沒有人再開口。']);
  deed('墜碑上有他的名字。刻了三百年了。');
};
async function afterOil() {
  flag('c2_done'); refreshZoneLights();
  await lines(['?luo', '往鏈根只有一條路，要穿過懸骸廊。\n繩幫的地盤。'], ['?yuan', '我認得路。\n我就是從那裡逃出來的。']);
  unlockZone('gallery');
}
SCRIPTS.n_sluice = async () => {
  const f = G.flags;
  if (f.c2_done) { await lines([null, f.oil_ji ? '右邊的輪盤轉到了底。左邊的渠是乾的。' : f.oil_split ? '兩個輪盤各轉了一半。兩邊的渠都在響，都不大聲。' : f.oil_sold ? '閘上多了一道繩幫的鎖，紅繩結。' : '兩個輪盤都沒有人動過。']); return; }
  await lines([null, '一道舊閘。兩個輪盤。\n左邊的渠通往碑前那盞火；右邊的渠是乾的，一路往鏽錨集的方向去。']);
  if (!f.met_luchen) { await lines([null, '先弄清楚這是誰的東西。']); return; }
  await lines(['?luo', '轉右邊，集裡的燈今晚就能亮。'], ['?yuan', '轉右邊，那盞火就滅了。\n三百年的東西。'], ['?luo', '三百年的東西不會餓，也不會被苔吃掉。']);
  const k = await choose([{ t: '把油引給鏽錨集。', sub: '集裡的燈會亮。碑前的火會熄。' }, { t: '不動它。', sub: '火留著。集裡只能收繩幫的油——和繩幫開的價。' }, { t: '分渠。一邊一半。', sub: f.split_agreed ? '陸沉答應了。條件是：讓她父親下來。' : '得先問碑守肯不肯。', dis: !f.split_agreed }, { t: '把這道閘的位置賣給繩幫。', sub: '三百銖。' }, { t: '再想想。' }]);
  if (k === 0) {
    await lines([null, '輪盤很重。' + (has('luo') ? '駱山跟你一起推。' : '') + '\n右邊的渠先是響，然後濕了。'], [null, '碑前的光，一點一點矮下去。'], ['luchen', '……我說過，我攔不住你們。'], ['luchen', '我帶我的人走。碑留在這裡，名字留在這裡。\n沒有火，它們還能留多久，我不知道。'], [null, '她鬆開鏈子。\n老人往上飄，沒有回頭。她一直看到看不見。']);
    flag('oil_ji'); flag('flame_out'); flag('keepers_left'); flag('elder_dead'); addRep('ji', 2); addRep('shou', -2); addRep('bang', -1); if (has('luo')) addAff('luo', 1);
    deed('他把油渠的油引回了鏽錨集。碑前燒了三百年的火，熄了。'); await afterOil();
  } else if (k === 1) {
    await lines([null, '你把手從輪盤上拿開。'], ['?luo', '……那二十個人怎麼辦。'], ['?luo', '我守了四年的門。\n你要我回去告訴他們：門外有油，我們沒拿。'], has('luo') ? [null, '他沒有再說。回程，他走在最後面。'] : null, ['luchen', '……謝謝。\n我知道這不是你們該付的價。']);
    flag('oil_bang'); flag('ear_sister_gone'); addRep('shou', 2); addRep('ji', -1); addRep('bang', 1); if (has('luo')) addAff('luo', -1);
    deed('他沒有動那道閘。碑前的火還在。集裡收了繩幫的油——今年的二十個人，上去了。'); await afterOil();
  } else if (k === 2) {
    await lines(['luchen', '……你們答應了。'], ['luchen', '我把鏈子放長。\n快一點。不要讓他痛。']);
    flag('elder_fight'); refreshBlocked(); await fight('o5');
  } else if (k === 3) {
    await lines(['?yuan', '你說什麼？'], [null, '你把閘的位置畫在一片銅上。'], ['luchen', '你們賣了它。'], ['luchen', '我父親守了四十年。我守了十一年。\n你們用一片銅就賣了。'], [null, '第二天，繩幫的人在覆舟營外面放下一袋銖。沒有敲門。']);
    flag('oil_sold'); flag('flame_out'); flag('keepers_left'); flag('elder_dead'); gain({ coin: 300 }); addRep('bang', 2); addRep('ji', -1); addRep('shou', -2); if (has('yuan')) addAff('yuan', -2); if (has('luo')) addAff('luo', -2);
    deed('他把油閘的位置賣給了繩幫。三百銖。'); await afterOil();
  }
};
SCRIPTS.pre_o5 = async () => { await lines([null, '鏈子放長了。老人飄到平台正中間，睜開眼睛。\n他看的不是你們。'], ['elder', '……沉兒？……天亮了沒有？']); };
SCRIPTS.post_o5 = async () => {
  await lines([null, '他散開的時候沒有聲音。\n一塊浮石從他胸口掉出來。是暗的。'], ['luchen', '他最後念的是我的名字。'], ['luchen', '……四年了。'], ['luchen', '這個給你們。碑上沒有名字的那個人留下來的。\n我父親守了它一輩子。']);
  await giveLeg('knuckle');
  await lines([null, '兩個輪盤，各轉一半。\n兩邊的渠都響了。都不大聲。']);
  flag('oil_split'); flag('elder_dead'); flag('tribute_half'); addRep('ji', 1); addRep('shou', 1); if (has('luo')) addAff('luo', 1);
  deed('他分了渠。集裡的燈暗一點，碑前的火小一點。陸沉的父親下來了。'); await afterOil();
};

// ═════════ 四・懸骸廊 ═════════
SCRIPTS.arrive_gallery = async () => {
  if (G.flags.gallery_intro) return; flag('gallery_intro');
  await lines([null, '一條長廊。頂上吊滿了東西：船殼、屋樑、整面的牆。\n繩幫用鉤鏈把掉下來的殘骸一塊一塊吊起來，底下住人。'], ['?yuan', '懸骸廊。我在這裡長到十五歲。'], ['?yuan', '頭上那些，鏈子一斷就砸下來。\n繩幫的索手最愛玩這個。']);
};
SCRIPTS.t_gate = async () => {
  const f = G.flags, toll = f.ledger_saved ? 60 : 120, ok = !has('yuan') || f.yuan_cleared || f.ledger_saved;
  await lines(['bruiser', '過關秤重。一斤兩銖。墜客另算。', { name: '關口的打手' }]);
  if (has('yuan') && !f.yuan_cleared) await lines(['bruiser', '……等一下。那個丫頭。帳上有她。', { name: '關口的打手' }], ['yuan', '帳上的字，你認得幾個？'], f.ledger_saved ? ['bruiser', '……算盤交代過你們。\n丫頭的帳，今天我當沒看到。', { name: '關口的打手' }] : ['bruiser', '我認得「逃」字。', { name: '關口的打手' }]);
  const k = await choose([{ t: `付攀稅。（${toll} 銖）`, sub: !ok ? '他們不放岑鳶過。' : G.coin < toll ? '銖不夠。' : f.ledger_saved ? '算盤說過，收你們一半。' : '付了，廊裡的人就不攔你們。', dis: !ok || G.coin < toll }, { t: '打進去。' }, has('yuan') ? { t: '走岑鳶當年逃出來的那條路。', sub: '繞過關口。' } : null, { t: '再想想。' }]);
  if (k === 0) { G.coin -= toll; sfx('coin'); await lines(['bruiser', '過。廊裡別亂看。', { name: '關口的打手' }]); flag('guild_pass'); flag('gate_done'); deed('他付了攀稅，從繩幫的關口走進懸骸廊。'); }
  else if (k === 1) { await lines(['bruiser', '那就用秤的。——來人！', { name: '關口的打手' }], [null, '他往廊裡退。裡面有鉤子在響。']); flag('gate_done'); addRep('bang', -1); deed('他從繩幫的關口打了進去。'); }
  else if (k === 2) {
    await lines(['yuan', '跟我來。別出聲。']); await fadeTo(1); teleport(25, 24); await fadeTo(0);
    await lines([null, '岑鳶帶你們鑽進一道吊著的船殼。\n艙壁上有刻痕，一道一道，到她肩膀的高度就停了。'], ['yuan', '量身高的。我跟雀。'], ['yuan', '他比我矮一個頭。每次都踮腳。']);
    flag('gate_done'); flag('sneak_route'); addAff('yuan', 1); deed('他們從岑鳶逃出來的那條路，繞進了懸骸廊。');
  }
};
SCRIPTS.pre_h1 = async () => { await lines(has('yuan') ? ['yuan', '頭上吊著的那塊船殼看到沒有？射斷鏈子，砸在他們頭上。'] : [null, '他們頭上吊著一塊船殼。鏈子看起來不太牢。'], has('yuan') ? ['yuan', '後面那個拿弩的也在打一樣的主意。\n先下手。'] : [null, '後面那個拿弩的，一直在看那條鏈子。']); };
SCRIPTS.pre_h2 = async () => {
  if (G.flags.ledger_grudge) await lines(['rigger', '藍衣服的！\n我說過，我記得你！']);
  else if (G.flags.ledger_saved) await lines([null, '牆上有人用炭畫了一顆算盤珠，旁邊一個箭頭。\n箭頭指著埋伏的人的背後。']);
  await lines(has('yuan') ? ['yuan', '這裡是廊的邊緣。把人掀起來再往下砸——\n他就不會再上來了。'] : [null, '棧板外面就是淵。\n被砸下去的東西，不會再上來。']);
};
SCRIPTS.pre_h3 = async () => {
  await camTo(19, 16, baseZoom() * 1.05, 900);
  await lines([null, '一排木籠。裡面坐著人。\n腳上繫著紅繩，繩上有數字。'], ['foreman', '欠債的。還不出銖，就用別的還。\n別看了。看了也不是你們的。'], has('luo') ? ['luo', '……把門打開。'] : ['?yuan', '把門打開。'], has('luo') ? ['foreman', '駱山？你不是不押了嗎。\n回去守你的門。'] : ['foreman', '憑什麼？'], ['foreman', '弟兄們。秤一秤他們。']);
};
SCRIPTS.post_h3 = async () => { await lines([null, '把頭腰上有鑰匙。\n籠門一扇一扇開了。裡面的人沒有馬上出來——他們先看你們的手，看有沒有鉤。']); deed('懸骸廊的債籠開了。'); addRep('ji', 1); };
SCRIPTS.t_blind_rescue = async () => {
  await lines(['blind', '打完了？\n聽聲音，把頭的鞭子斷了。'], ['blind', '我是刻字的。繩幫要我在秤砣上刻新的斤兩——刻輕一點。\n我說，瞎子的手不會說謊。'], ['blind', '你身上有金漆的味道。還有一把斷過的劍。\n讓我摸摸。'], [null, '他的手指沿著斷口走了一遍。'],
    ['blind', '不是砍斷的，也不是摔斷的。\n是它自己斷的——用力用到底的那一種。'], ['blind', '另外半截還在某個地方。\n卡在它砍的東西裡。']);
  flag('r_blind'); deed('覆舟營多了一個刻字的瞎子。'); toast('盲叔去了覆舟營：刻台可以用了。');
};
SCRIPTS.t_blind = async () => {
  const k = await choose([{ t: '刻台', sub: '重鑄詞條、金繼' }, { t: '「金繼是什麼？」' }, { t: '走了' }], { prompt: '盲叔的手指在一片銅上走。走得很慢。' });
  if (k === 0) { endTalk(); await openEngrave(); }
  else if (k === 1) await lines(['blind', '東西摔碎了，有兩種補法。\n一種是補到看不出來。'], ['blind', '另一種是用金漆。裂在哪裡，金線就在哪裡。\n讓看的人知道：它碎過。它還在。'], ['blind', '這底下的東西全是碎的。城、人、名字。\n我只會第二種補法。']);
};
SCRIPTS.pre_h4 = async () => { await lines([null, '繩幫收來的庭衛，關在一座石台上。\n沒有人下令，牠們就一直瞄著門。']); };
SCRIPTS.n_tribute = async () => {
  const y = has('yuan'), l = has('luo');
  await lines([null, '帳房。一整面牆的簿子，按年排。\n最新的一本攤在桌上。'], [null, '「上貢簿」。\n每一行：名字、歲數、斤兩。最後一欄不是「上收」，就是「退」。'], [null, '你翻到四年前。'], [null, '「岑雀，十一歲，四十一斤，上收。押送：駱山。」', FULL],
    [null, '再往前幾頁：「岑鳶，退。」', FULL], [null, '再往前，紙都黃了：「卓九斤，九斤，退。」', FULL], [null, '沒有一筆是回來的。\n最後一頁的收款欄，寫的不是銖。寫的是：「按重計」。', FULL]);
  UI.dlg.classList.remove('full');
  if (l) await lines([null, '駱山站在門口，沒有進來。\n他知道桌上是什麼。']);
  if (y) await lines(['yuan', '……那是上貢的簿子？\n給我。']);
  let k;
  if (y && l) k = await choose([{ t: '把簿子遞給她。整本。', sub: '她有權知道。他也有權親口說。' }, { t: '撕掉寫著「押送：駱山」的那一頁，再給她。', sub: '眼前太平。' }, { t: '燒掉。', sub: '債、上貢、名字——都沒了。' }]);
  else if (y) k = (await choose([{ t: '把簿子遞給她。' }, { t: '燒掉。', sub: '債、上貢、名字——都沒了。' }])) === 0 ? 3 : 2;
  else k = (await choose([{ t: '收起來。', sub: '這本東西，總有人該看。' }, { t: '燒掉。', sub: '債、上貢、名字——都沒了。' }])) === 0 ? 4 : 2;
  if (k === 0) {
    await lines([null, '她讀得很慢。\n讀到那一行，手指停在紙上。'], ['yuan', '「押送：駱山」。'], ['yuan', '你押的。'], ['luo', '我押的。'], ['yuan', '他十一歲。他怕黑。\n你牽著他走上去的？'],
      ['luo', '我走了十一趟。第十一趟裡有他。他一路沒有哭。'], ['luo', '到了上面的秤前，他回頭問我：\n「叔，秤完可以回去嗎？」'], ['luo', '第十二趟，我走不動了。我回集裡守門。\n我以為守著門，就算還了。'], [null, '岑鳶的弩已經在手上了。\n她自己好像都不知道。']);
    const j = await choose([{ t: '（不插手。）' }, { t: '「他不押，也會有別人押。」' }, { t: '「岑鳶說得對。」' }]);
    if (j === 0) { await lines([null, '沒有人動。很久。'], ['yuan', '……我不會跟他並肩。'], ['yuan', '我要去鏈根。他也要去。路是同一條。\n就這樣。']); flag('no_link_yl'); deed('帳房裡，岑鳶讀到了押送她弟弟的人是誰。兩個人都沒有走。也都不說話了。'); }
    else if (j === 1) { await lines(['yuan', '所以呢？所以就可以？'], ['luo', '不可以。\n別替我說。'], ['yuan', '……路是同一條。我不會跟他並肩。']); flag('no_link_yl'); addAff('yuan', -1); addAff('luo', 1); deed('帳房裡，他替駱山說了一句話。駱山沒有領。'); }
    else {
      await lines(['luo', '……她說得對。'], [null, '駱山把門盾從背上卸下來，看了一下，又背回去。'], ['luo', '東門沒有人守。我回去。'], ['luo', '岑鳶。上面的秤，在鏈根再過去的地方。\n妳到了，替我看一眼。'], [null, '他走的時候沒有回頭。岑鳶也沒有。']);
      leaveHero('luo'); flag('luo_gone'); flag('luo_home'); addAff('yuan', 2); deed('帳房裡，他站在岑鳶那一邊。駱山一個人回了東門。'); toast('駱山離開了隊伍。他身上的東西留了下來。');
    }
    flag('ledger_shown'); flag('has_tribute'); flag('yuan_knows');
  } else if (k === 1) {
    await lines([null, '你把那一頁折起來，收進袖子。\n駱山看到了。'], [null, '她讀得很慢。'], ['yuan', '「岑雀，十一歲，四十一斤，上收。」'], ['yuan', '……上收。他上去了。他到了。'], [null, '她把那一行讀了三遍。'], ['yuan', '押送的那一欄呢？這一頁少了半張。'], ['wei', '蟲蛀的。'], [null, '後來，駱山走過你旁邊，聲音很低：'], ['luo', '你不該替我藏。']);
    flag('page_torn'); flag('has_tribute'); flag('yuan_knows'); deed('帳房裡，上貢簿少了一頁。');
  } else if (k === 2) {
    await lines([null, '紙燒得很快。名字先捲起來，然後是斤兩。'], ['?yuan', '等一下——我還沒看——'], y ? [null, '來不及了。'] : null, ['?yuan', '……裡面有雀嗎？'], y ? ['wei', '有。上收。'] : null, ['?yuan', '……他到了上面。'], l ? [null, '駱山看著火。火滅了，他還在看。'] : null);
    flag('ledger_burnt'); addRep('bang', -2); addRep('ji', 1); if (y) flag('yuan_knows'); deed('他燒了繩幫的上貢簿。上面有多少名字，再也沒有人知道。');
  } else if (k === 3) {
    await lines([null, '她讀得很慢。'], ['yuan', '「岑雀，十一歲，四十一斤，上收。」'], ['yuan', '……上收。他到了。'], ['yuan', '「押送：駱山」。\n東門那個夜巡。'], ['yuan', '……我會回去找他。等我從上面下來。']);
    flag('ledger_shown'); flag('has_tribute'); flag('yuan_knows'); addAff('yuan', 1); deed('帳房裡，岑鳶讀到了她弟弟的那一行。');
  } else { await lines([null, '你把簿子收進懷裡。很沉。']); flag('has_tribute'); deed('他帶走了繩幫的上貢簿。'); }
  flag('c3_done');
  if (y && G.flags.yuan_knows) toast('岑鳶有話想說。回營火邊坐一下。');
};
async function openPens() {
  await lines([null, '廳後的圍欄。今年的二十個人。最小的那個還抱著一只布做的鳥。']);
  if (has('luo')) { await lines([null, '駱山走過去，一扇一扇把門打開。他的手很穩。\n開到最後一扇，他站了很久才轉身。'], ['luo', '十一趟。我一次都沒有開過門。'], ['luo', '這是第一次。']); flag('luo_done'); addAff('luo', 1); await learnUlt('luo'); }
  else await lines(has('yuan') ? [null, '岑鳶用鉤尖把鎖一個一個挑開。\n她沒有說話。挑到最後一個，手在抖。'] : [null, '你把門一扇一扇打開。\n沒有人問你是誰。']);
  flag('pens_open');
}
async function afterZhuo(ringFrom) {
  if (!G.flags.piece3) {
    await lines(ringFrom === 'scale' ? ['scale', '他的東西裡有這個。\n紋跟你的劍一樣。我不問。我記下來。'] : ringFrom === 'zhuo' ? ['zhuo', '這個你拿著。上面的秤認這個紋。\n我撿到它的那天就在想：哪天會掉下來一個配得上它的人。'] : [null, '他的收藏裡有一枚印戒。\n戒面的紋，跟你劍首上的一模一樣。'], [null, '內圈刻著四個字。']);
    await gotPiece(3, '「有人問了。」');
  }
  flag('c4_done'); flag('guild_pass'); unlockZone('root');
}
SCRIPTS.t_zhuo = async () => {
  const f = G.flags, y = has('yuan'), l = has('luo');
  if (!f.saw_zhuo) {
    await camTo(10, 6.4, baseZoom() * 1.05, 900);
    await lines([null, '一間掛滿秤的廳。大的小的，銅的鐵的。每一桿底下都吊著東西。\n廳後有一排圍欄。裡面有人。很安靜。'], [null, '一個矮壯的男人坐在最大的那桿秤底下。\n脖子上掛著一塊舊秤砣。'], ['zhuo', '墜客。我等你好幾天了。\n坡上、油渠、我的關口——你走到哪，我的帳就亂到哪。'],
      ['zhuo', '我叫卓九斤。名字是秤給的。\n我娘抱我上去秤。九斤。上面不收。她把我留在秤盤上，自己走了。'], ['zhuo', '你以為我賣人。我賣的是燈油。\n上面每年要一批人，按重計。給的是油、鐵、藥。三千個人靠這個活。'], ['zhuo', '每年二十個，換三千個有燈。\n你來算。'], ['?yuan', '上去的人呢？'], y ? ['zhuo', '不知道。'] : null, y ? ['zhuo', '我是真的不知道，丫頭。我送到秤前。秤的那一頭，我沒見過。\n我只知道：沒有人下來過，東西每年都下來。'] : null);
    flag('saw_zhuo');
  }
  if (f.page_torn && y && l && !f.torn_out) {
    flag('torn_out');
    await lines(['zhuo', '駱山。你也來了。\n你押過她弟弟那一趟。你跟她說了沒有？'], [null, '岑鳶轉過頭。'], ['yuan', '……那一頁不是蟲蛀的。'], ['luo', '不是。'], ['yuan', '你們兩個都一樣。']);
    addAff('yuan', -4); flag('no_link_yl');
    if (G.aff.yuan < 8) { await lines([null, '她把弩背上，往廳外走。走到門口，停了一下。'], ['yuan', '我自己上去。\n別跟來。']); leaveHero('yuan'); flag('yuan_gone'); flag('yuan_hid'); deed('卓九斤當著岑鳶的面，說破了那一頁。她一個人走了。'); toast('岑鳶離開了隊伍。她身上的東西留了下來。'); }
    else { await lines(['yuan', '等這裡完了。\n你們兩個，一個一個，跟我講清楚。']); deed('卓九斤當著岑鳶的面，說破了那一頁。她沒有走。'); }
  }
  const canShow = f.has_tribute && !f.ledger_burnt;
  const k = await choose([{ t: '動手。' }, { t: '「你的買賣，我接。」', sub: '過關、四百銖，替他把今年的帳帶上去。' }, { t: '把上貢簿攤給全集的人看。', sub: canShow ? '讓底下的人自己決定。' : f.ledger_burnt ? '簿子已經燒了。' : '你手上沒有那本簿子。', dis: !canShow }, { t: '再想想。' }], { prompt: '卓九斤看著你，像在看秤桿往哪一邊斜。' });
  if (k === 0) { await lines(['zhuo', '好。用你們的規矩。'], ['zhuo', '——不。用我的。\n把人打上去，再砸下來。這一手，是我先會的。']); flag('zhuo_fight'); refreshBlocked(); await fight('h5'); }
  else if (k === 1) {
    await lines(['zhuo', '聰明人。'], [null, '他把一只袋子推過來。很沉。']); gain({ coin: 400 });
    if (has('yuan')) { await lines(['yuan', '你接了。'], ['yuan', '我弟弟四十一斤。\n你剛才把他賣了第二次。'], [null, '她走的時候，把你給過她的東西一樣一樣放在地上。']); leaveHero('yuan'); flag('yuan_gone'); flag('yuan_deal'); toast('岑鳶離開了隊伍。'); }
    await lines(['?luo', '……我押過十一趟。\n我沒有資格說你。'], has('luo') ? [null, '他沒有再看你。'] : null);
    flag('deal_zhuo'); flag('ear_sister_gone'); addRep('bang', 2); addRep('ji', -1); if (has('luo')) addAff('luo', -2);
    deed('他接了卓九斤的買賣。今年的帳，是他帶上去的。'); await afterZhuo('zhuo');
  } else if (k === 2) {
    await lines([null, '你沒有拔劍。你把簿子夾在腋下，轉身往外走。'], ['zhuo', '……你要做什麼？']);
    await fadeTo(1); await sceneBlack('鏽錨集・秤場'); await fadeTo(0);
    await lines([null, '秤婆把上貢簿攤在最大的那桿秤上，一頁一頁念。\n念名字。念斤兩。念到最後一欄：「按重計」。', FULL], [null, '沒有人說話。\n然後有人去拿了錨爪上的鉤。', FULL], [null, '那天夜裡，集裡的人走進了懸骸廊。\n繩幫的打手有一半放下了鉤錘——簿子上，也有他們家的人。', FULL], [null, '卓九斤被自己的鉤鏈吊在最大的那桿秤底下。\n秤桿一動也不動。', FULL]);
    if (f.ledger_saved) { await lines([null, '天亮以前，有人把他偷偷放了下來。\n是算盤。他們往上面去了。', FULL]); flag('zhuo_up'); } else flag('zhuo_hung');
    await fadeTo(1); await sceneOff(); await fadeTo(0); UI.dlg.classList.remove('full');
    flag('exposed'); addRep('ji', 2); addRep('bang', -3); if (has('yuan')) addAff('yuan', 1);
    await openPens();
    deed('上貢簿攤在秤場上，念了一整夜。那門買賣，是底下的人自己停的。'); await afterZhuo('scale');
  }
};
SCRIPTS.post_h5 = async () => {
  await lines([null, '他的兩條鉤鏈都斷了。他坐在地上，還在笑。'], ['zhuo', '殺我，繩幫會散成十幾股。每一股都要自己的二十個人。'], ['zhuo', '不殺我，我就往上走。\n上面欠我一個答案：為什麼九斤不收。']);
  const k = await choose([{ t: '（殺了他。）' }, { t: '「往上走。別回來。」' }]);
  if (k === 0) { await lines([null, '他沒有躲。'], [null, '秤砣從他脖子上滑下來，在地上滾了半圈。\n朝上的那一面刻著：「九斤，退」。']); flag('zhuo_dead'); addRep('bang', -3); deed('卓九斤死了。繩幫沒有鏈主了。'); }
  else { await lines(['zhuo', '中層見，墜客。'], ['zhuo', '到時候換你告訴我——\n你斷的，是什麼。']); flag('zhuo_up'); addRep('bang', -2); deed('他放卓九斤往上走了。'); }
  await openPens(); await afterZhuo('room');
};
SCRIPTS.t_zhuo_hung = async () => { await lines(['zhuo', '……九斤。'], ['zhuo', '你知道嗎，墜客。\n吊著的時候，我比九斤還輕。']); };
