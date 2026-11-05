// 劇情腳本：序章＋第一章「霧港與沉鐘」
// S 是腳本介面（見 game.js 的 scriptApi）

const W = '魏子葳', O = '歐文', L = '莉瑟', N = '諾克', K = '卡斯坦', G = '葛雷';

export const STORY = {
  // ================= 序章 =================
  async opening(S) {
    S.flag('noEncounter', 1);
    await S.card('序章', '燈　下', '七百年來，這盞燈從沒熄過。', 3600);
    S.bgm('cape'); S.amb('waves');
    S.cam(13.5, 7.5, 0.8);
    await S.fade(false);
    await S.wait(900);
    await S.say(O, '子葳，今晚的燈芯修得不錯。');
    await S.say(W, '你每天都這樣說。');
    await S.say(O, '因為你每天都修得不錯。');
    await S.say(W, '……燈油只剩三天的量。補給船已經晚了六天。');
    await S.say(O, '霧港那邊，大概又在吵晝國跟夜邦誰該出油錢吧。');
    S.emote('owen', '…');
    await S.say(O, '咳、咳。');
    await S.say(W, '你咳了一整個月。');
    await S.say(O, '老燈守都會咳。海風太鹹了。');
    await S.wait(400);
    await S.say(W, '師父。');
    await S.say(O, '嗯？');
    await S.say(W, '……沒事。光又轉回來了。');
    await S.say(O, '七百年了，它每一次都會轉回來。');
    await S.wait(600);
    S.flicker(true);
    S.sfx('lamp');
    S.bgm(null);
    await S.wait(1400);
    S.emote('wei', '！');
    await S.say(W, '……燈。');
    await S.say(O, '熄了？不可能——');
    S.shake(0.2, 0.8); S.sfx('tide');
    await S.wait(500);
    S.spawn({ id: 'mon1', art: 'crab', x: 12.5, z: 11.5, monster: true });
    S.spawn({ id: 'mon2', art: 'crab', x: 14.5, z: 11.2, monster: true });
    S.emote('owen', '！');
    await S.say(O, '下面！夜潮爬上來了！');
    await S.say(O, '子葳，光沒回來之前，牠們會一直爬上來。用你的燈鉤！');
    S.move('mon1', 12.8, 9.4, 1.6); await S.move('mon2', 14.2, 9.3, 1.6);
    const r1 = await S.battle('tut1');
    S.despawn('mon1'); S.despawn('mon2');
    await S.say(O, '好孩子。');
    S.sfx('tide'); S.shake(0.15, 0.6);
    S.spawn({ id: 'mon3', art: 'wraith', x: 19.5, z: 8.5, monster: true });
    S.spawn({ id: 'mon4', art: 'crab', x: 18.5, z: 9.8, monster: true });
    await S.say(O, '……潮鬼。燈一熄，連牠們都上來了。');
    await S.say(O, '過來。把燈芯撥亮一點——');
    S.rest(); S.sfx('heal'); S.flash('#ffe8b0', 500, 0.35);
    await S.say(O, '潮鬼在黑暗裡打不痛。子葳——轉燈。讓牠們見見光。');
    await S.say(W, '轉燈不是只能在燈室裡做嗎？');
    await S.say(O, '你手上那盞，也是長明燈的火分出來的。去吧。');
    S.move('mon3', 16, 7.6, 1.4); await S.move('mon4', 15.6, 8.6, 1.4);
    await S.battle('tut2');
    S.despawn('mon3'); S.despawn('mon4');
    await S.say(O, '我上去看看燈。你守在這裡。');
    await S.move('owen', 13.5, 6.0, 2);
    S.hide('owen');
    await S.wait(1600);
    S.flicker(false); S.sfx('phase'); S.flash('#fff2c8', 600);
    S.bgm('cape');
    await S.wait(900);
    await S.say(W, '（三秒。燈熄了三秒。）');
    S.show('owen', 13.5, 6.2);
    await S.move('owen', 12.6, 7.4, 1.6);
    await S.say(O, '燈芯沒事，油也還有。是燈自己……眨了一下眼。');
    await S.say(W, '燈不會眨眼。');
    await S.say(O, '七百年前，第一位燈守大概也是這麼說的。');
    await S.say(O, '去睡吧。明天一早，你去霧港買燈油。');
    await S.say(W, '補給船——');
    await S.say(O, '不等了。');
    await S.fade(true);
    S.flag('prologue_night', 1);
    await S.narr('晨昏帶沒有真正的早晨。\n燈塔的光掃過來的那一段時間，大家就叫它「白天」。');
    await S.goto('cape', [12.5, 22.5], 'down', { variant: 'day', noBanner: true });
  },
  async lisearrive(S) {
    S.flag('noEncounter', 1);
    S.cam(12.5, 25.5, 0.9);
    await S.fade(false);
    S.bgm('cape');
    S.spawn({ id: 'lise_npc', cast: 'lise', x: 12.5, z: 30.5, dir: 'up' });
    await S.move('lise_npc', 12.5, 26.2, 1.6);
    await S.say(L, '請問哪一位是燈守？');
    await S.say(O, '我是。這孩子是我的學徒。');
    await S.say(L, '我是赫利昂王國潮汛署的潮汛官，莉瑟・范德。');
    await S.say(L, '昨夜，赫利昂港口的所有人都看見了：長明燈熄了。');
    await S.say(O, '三秒而已。');
    await S.say(L, '三秒，夜潮就淹過了赫利昂的東堤，捲走了兩艘漁船。');
    S.emote('wei', '…');
    await S.say(L, '我帶來海軍上將卡斯坦閣下的命令。');
    await S.say(L, '「孤燈岬燈塔即日起由赫利昂海軍接管。七日之內，燈守須交出燈室的鑰匙。」');
    await S.say(W, '燈塔不屬於任何一國。');
    await S.say(L, '這是命令，不是商量。');
    await S.say(O, '卡斯坦啊……他女兒的事，我一直很遺憾。');
    S.emote('lise_npc', '？');
    await S.say(L, '……您認識上將？');
    await S.say(O, '十年前那場夜潮，是我把他從海裡撈上來的。只撈到他一個。');
    await S.say(O, '替我轉告他：鑰匙我不會交，燈塔也不會跑。他想談，就自己來。');
    await S.say(L, '……我會一字不漏地轉達。');
    await S.say(O, '另外，范德小姐。你回程會經過霧港吧？');
    await S.say(L, '是。');
    await S.say(O, '帶上我的學徒。燈油快沒了，他得去買，路上不太平。');
    await S.say(L, '我是潮汛官，不是護衛。');
    await S.say(O, '上將派你來「看著」燈塔，對吧？燈油也是燈塔的一部分。');
    S.emote('lise_npc', '…');
    await S.wait(500);
    await S.say(L, '……好吧。僅限到霧港。');
    await S.say(W, '不用勉強。');
    await S.say(L, '這是職責，不是勉強。');
    S.despawn('lise_npc');
    S.join('lise', 3);
    S.flag('lise_joined', 1); S.flag('noEncounter', 0);
    S.objective('搭碼頭盡頭的小船，前往霧港');
    S.log('燈熄了三秒', '長明燈七百年來第一次熄滅。晝國的潮汛官莉瑟帶來接管燈塔的命令，並同行前往霧港。');
    S.toast('莉瑟加入了隊伍');
    S.camFollow();
  },
  async owenTalk(S, F) {
    if (F.ruins_done) return;
    const i = F.owenT || 0;
    const lines = [
      ['路上小心。霧港的人講話很快，價錢也是。', '月白油一罐要六十銀貝。他們要是開到一百，你就說是歐文要的。'],
      ['范德小姐，這孩子不太會說話。', '但他說出口的事，就一定會做到。這點你可以放心。'],
      ['還不走？船不會自己划過去。'],
    ];
    for (const l of lines[Math.min(i, lines.length - 1)]) await S.say(O, l);
    if (i === 1) await S.say(L, '……我會記住的。');
    F.owenT = i + 1;
  },
  async toHarbor(S, F) {
    if (!F.lise_joined) { await S.say(W, '（還不能走。）'); return; }
    const i = await S.choice(['出發去霧港', '再等一下']);
    if (i !== 0) return;
    await S.fade(true);
    await S.narr('小船順著光束的方向，駛向霧港。');
    await S.goto('harbor', [6.5, 27.5], 'up', { first: !F.harbor_arrived });
  },
  // ================= 第一章 =================
  async harborArrive(S, F) {
    if (F.harbor_arrived) return;
    F.harbor_arrived = 1;
    await S.card('第一章', '霧港與沉鐘', '', 3000);
    await S.fade(false);
    S.bgm('harbor'); S.amb('waves');
    await S.banner('霧港', 'MISTHARBOR');
    await S.say(L, '霧港。晨昏帶最大的港口，晝國跟夜邦的商船都在這裡停靠。');
    await S.say(W, '也是燈油最貴的地方。');
    await S.say(L, '油行在廣場北邊。我在碼頭等你。');
    await S.say(W, '你不是要「看著」我嗎？');
    S.emote('lise', '…');
    await S.say(L, '……我跟你一起去。');
    S.objective('去廣場北邊的「潮光油行」買燈油');
  },
  async oilShop(S, F) {
    if (F.oil_heard && !F.ruins_done) { await S.say('葛蘭太太', '大退潮已經開始了。要去的話，東邊閘門出去就是退潮灘。小心點，孩子。'); return; }
    if (F.ruins_done) { await STORY.granReturn(S, F); return; }
    F.oil_heard = 1;
    await S.say('葛蘭太太', '月白油？小哥，整個霧港一滴都不剩了。');
    await S.say('葛蘭太太', '月白油得用月白珠來榨。珠床在退潮灘那頭的沉鐘遺跡裡，一年到頭泡在海水底下。');
    await S.say('葛蘭太太', '只有大退潮的晚上，人才走得進去。');
    await S.say(W, '大退潮是什麼時候？');
    await S.say('葛蘭太太', '就今晚。你運氣不錯——還是說，運氣很差。');
    await S.say(L, '沉鐘遺跡是赫利昂劃的禁區。');
    await S.say('葛蘭太太', '是啊，晝國的禁區。可是燈要是熄了，禁區還有什麼用？');
    await S.say('葛蘭太太', '……上個月，我兒子阿森下去採珠，到現在還沒回來。你們要去的話，路上要是看到他……');
    await S.say(W, '……我會注意。');
    S.objective('等大退潮。從東邊的閘門出去');
  },
  async thief(S, F) {
    S.flag('noLamp', 1);
    S.spawn({ id: 'noct_npc', cast: 'noct', x: S.px() + 3, z: S.pz() + 1, dir: 'left' });
    await S.move('noct_npc', S.px() + 0.6, S.pz() + 0.3, 5);
    S.sfx('steal'); S.shake(0.15, 0.3);
    await S.say('？？？', '借用一下！');
    await S.move('noct_npc', 8.5, 17.6, 6);
    await S.move('noct_npc', 3.5, 17.5, 6);
    S.despawn('noct_npc');
    S.emote('lise', '！');
    await S.say(L, '小偷！');
    await S.say(W, '……我的燈。');
    await S.say(L, '你為什麼這麼冷靜？');
    await S.say(W, '我在想她往哪跑。……西邊，倉庫那裡。');
    S.objective('追上偷燈的小偷（西邊倉庫）');
  },
  async noctDeal(S, F) {
    S.cam(4.5, 17, 0.85);
    S.spawn({ id: 'noct_npc', cast: 'noct', x: 3.5, z: 17.5, dir: 'up' });
    await S.wait(500);
    await S.say('？？？', '奇怪……這燈在暗的地方，會自己亮起來。');
    S.face('noct_npc', 'right');
    await S.say(W, '還給我。');
    await S.say('？？？', '別急嘛，燈塔小哥。');
    await S.say('？？？', '還帶了個晝國的大小姐。');
    await S.say(L, '潮汛官。還有，偷竊依法——');
    await S.say('？？？', '依法、依法。你們晝國的法，管得到夜邦人嗎？');
    await S.say('？？？', '聽好。我要進沉鐘遺跡。裡面的沉影怕光，可是普通的燈一帶進去就會被吹熄。');
    await S.say('？？？', '這一盞不一樣。');
    await S.say(W, '所以你偷我的燈。');
    await S.say('？？？', '所以我「借」你的燈。');
    await S.say('？？？', '……不然這樣。你們也要進去，對吧？油行的葛蘭太太嘴巴很大。');
    await S.say('？？？', '我下去過三次，知道珠床在哪。帶我一起，珠子分我一半。');
    await S.say(L, '不行。她是罪犯——');
    await S.say(W, '三成。');
    await S.say('？？？', '一半。我得買燈。');
    await S.say(W, '買燈？');
    await S.say('？？？', '夜邦沒有太陽，小哥。你們點燈不用錢，我們家那邊，燈油是用命換的。');
    await S.wait(500);
    await S.say('？？？', '……四成。');
    await S.say(W, '成交。');
    await S.say(L, '魏子葳！');
    await S.say(W, '她認得路。我們不認得。');
    S.emote('lise', '…');
    await S.say(L, '……我會盯著她。');
    await S.say('？？？', '隨便你盯，大小姐。');
    S.sfx('ok');
    await S.say(N, '我叫諾克。燈還你——接好。');
    S.despawn('noct_npc');
    S.join('noct', 4);
    S.flag('noct_joined', 1); S.flag('noLamp', 0);
    S.toast('諾克加入了隊伍');
    S.objective('大退潮開始了。從東邊閘門前往退潮灘');
    S.log('偷燈的夜邦人', '夜邦拾荒客諾克偷走了燈，又用它換來一筆交易：帶路進沉鐘遺跡，月白珠分她四成。');
    S.camFollow();
  },
  async gate(S, F) {
    if (!F.noct_joined) {
      await S.say('赫利昂水兵', '前面是退潮灘，晝國的禁區。沒有通行令不能過。');
      if (F.oil_heard) await S.say(L, '（我是潮汛官……可是帶著燈守學徒進禁區，不在我的職責裡。）');
      return;
    }
    if (F.gate_open) { await S.say('赫利昂水兵', '范德長官，路上小心。'); return; }
    await S.say('赫利昂水兵', '前面是禁區——范德長官？');
    await S.say(L, '潮汛官執行公務。這兩位是我的……協助人員。');
    await S.say(N, '（協助人員。）');
    await S.say('赫利昂水兵', '是！……長官，那個，上將的艦隊……');
    await S.say(L, '艦隊怎麼了？');
    await S.say('赫利昂水兵', '……沒事。請通過。');
    F.gate_open = 1;
    S.objective('穿過退潮灘，前往沉鐘遺跡');
  },
  async flatsArrive(S, F) {
    if (F.flats_arrived) return;
    F.flats_arrived = 1;
    await S.say(N, '歡迎來到退潮灘。踩到發光的水母記得叫一聲，我好知道該往哪跑。');
    await S.say(L, '……這裡好暗。');
    await S.say(N, '怕黑？');
    await S.say(L, '我沒有怕黑。我只是不習慣……看不見地平線。');
    await S.say(W, '她怕黑。');
    await S.say(L, '魏子葳。');
    S.objective('穿過退潮灘，前往沉鐘遺跡');
  },
  async camp1(S, F) {
    await S.narr('營火劈啪作響。魏子葳把潮鯖串在燈鉤上，慢慢翻著。');
    await S.say(N, '燈塔小哥居然會做菜。');
    await S.say(W, '燈塔上沒有餐廳。');
    await S.say(L, '……很好吃。');
    await S.say(N, '大小姐，晝國的天空一直都是亮的，對吧？');
    await S.say(L, '嗯。太陽永遠掛在同一個地方。我們靠鐘聲分早晚。');
    await S.say(N, '那你看過星星嗎？');
    await S.say(L, '……在書上看過。');
    await S.say(N, '我們那邊天天都有。一抬頭就是一整片，冷得要命，可是很漂亮。');
    await S.say(N, '換我沒看過太陽了。聽說會燙？');
    await S.say(L, '……是溫暖。不是燙。');
    await S.wait(700);
    await S.say(W, '你們兩個加起來，剛好是一整天。');
    await S.say(N, '……這是你今天講過最長的一句好話。');
    await S.say(W, '別習慣。');
  },
  async ruinsGate(S, F) {
    if (F.ruins_entered) return true;
    await S.say(N, '那個拱門後面就是沉鐘遺跡。我上次就是在門口被沉影追著跑。');
    await S.say(L, '你上次一個人進去？');
    await S.say(N, '三次都是一個人。所以我才需要那盞燈。……還有你們。');
    return true;
  },
  async ruinsArrive(S, F) {
    if (F.ruins_entered) return;
    F.ruins_entered = 1;
    await S.fade(false);
    S.bgm('ruins'); S.amb('cave');
    await S.banner('沉鐘遺跡', 'THE DROWNED BELL');
    await S.narr('遠處傳來一聲鐘響。沉在海底七百年的街道，正在一點一點吐出海水。');
    await S.say(W, '……燈芯在發燙。');
    await S.say(N, '它上次也這樣。可是在我手上的時候，它只會亮，不會燙。');
    S.objective('深入沉鐘遺跡，找到珠床');
  },
  async bridgeHint(S, F) {
    if (F.tut_field) return;
    F.tut_field = 1;
    await S.say(L, '前面斷掉了。過不去。');
    await S.say(W, '……燈光照到的地方，好像有東西。');
    await S.tutorial('按右下角的<b>轉燈</b>，可以在這裡翻轉明暗。<br>有些路只在<b style="color:#ffd27a">明</b>裡出現，有些只在<b style="color:#b8c4ff">暗</b>裡出現。<br>在遺跡裡，戰鬥也會從你翻好的那一面開始。');
  },
  async eel(S, F) {
    S.cam(19.5, 15, 0.95);
    S.shake(0.4, 1.2); S.sfx('tide');
    await S.say(N, '水在動……退後！');
    S.spawn({ id: 'eel_v', art: 'eel', x: 24.5, z: 15.2, monster: true, scale: 0.75, dir: 'left' });
    S.sfx('splash'); S.shake(0.3, 0.6);
    S.emote('wei', '！');
    await S.move('eel_v', 22.2, 15.0, 3);
    await S.wait(300);
    const r = await S.battle('boss_eel');
    S.despawn('eel_v');
    if (r !== 'win') return;
    F.eel_done = 1;
    await S.say(N, '……這傢伙的牙，可以磨成很好的匕首。');
    await S.say(L, '你現在在想這個？');
    await S.say(N, '大小姐，在夜邦，什麼都要想。');
    S.objective('往北走，鐘聲是從那邊傳來的');
  },
  async warden(S, F) {
    S.cam(14.5, 6.5, 0.9);
    S.bgm(null);
    await S.wait(600);
    S.sfx('phase');
    await S.narr('大廳的盡頭，一口比房子還高的鐘懸在半空。鐘底下，站著一個巨大的身影。');
    S.spawn({ id: 'warden_v', art: 'warden', x: 14.5, z: 6.4, monster: true, scale: 0.72, dir: 'left' });
    S.flash('#9ab0ff', 500, 0.35); S.shake(0.25, 0.6);
    await S.say('？？？', '……燈……守……');
    await S.say('？？？', '七百年……終於……有燈守……回來了。');
    await S.say(W, '我是燈守的學徒。');
    await S.say('沉鐘守', '那就……證明你……拿得動那盞燈。');
    S.camFollow();
    const r = await S.battle('boss_warden');
    if (r !== 'win') return;
    S.despawn('warden_v');
    F.warden_done = 1;
    S.bgm('ruins');
    await S.say('沉鐘守', '光……還是溫的……好……很好……');
    await S.say('沉鐘守', '告訴……現在的燈守……月……醒了……');
    S.sfx('phase'); S.shake(0.3, 1);
    await S.narr('巨大的身影碎成了一地銅綠。大鐘響了最後一聲，北面的石牆亮了起來。');
    S.objective('看看北面發光的壁畫');
  },
  async mural(S, F) {
    if (!F.warden_done) { await S.say(W, '（牆上好像畫著什麼，太暗了看不清楚。）'); return; }
    if (F.mural_seen) { await S.narr('「月墜於此。燈若長明，月則長眠。」'); return; }
    F.mural_seen = 1;
    S.cam(22.5, 3.2, 0.8);
    await S.narr('壁畫上，一輪月亮墜進了海裡。\n海面上立著一座燈塔，光，照著月亮落下的地方。');
    await S.narr('壁畫底下刻著一行古字。');
    await S.say(W, '「月墜於此。燈若長明，月則長眠。」');
    await S.say(N, '……你看得懂這種字？');
    await S.say(W, '……我不知道為什麼看得懂。');
    await S.say(L, '月亮……在海底？那天上的——');
    await S.say(N, '天上沒有月亮啊，大小姐。夜邦的天空只有星星。');
    await S.say(L, '書上說，七百年前，天上有兩個光：一個太陽，一個月亮。');
    await S.say(W, '它掉下來了。燈的光，讓它一直睡著。');
    await S.say(N, '……那燈熄掉的那三秒呢？');
    await S.wait(900);
    await S.say(W, '它翻了個身。');
    await S.wait(500);
    await S.say(N, '……珠床就在旁邊。我去拿。');
    await S.narr('珠床裡長滿了月白珠，在燈光下像一顆顆小月亮。\n旁邊卡著一頂破掉的潛水盔。');
    await S.say(N, '……阿森。');
    await S.say(N, '他的名牌，我拿回去給他媽媽。');
    S.give('pearl', 4);
    S.flag('tag_found', 1);
    S.shake(0.35, 1.6); S.sfx('tide');
    await S.say(N, '水回來了！大退潮要結束了——快走！');
    await S.fade(true);
    F.ruins_done = 1;
    await S.narr('三人在海水淹回遺跡之前，逃出了退潮灘。');
    await S.goto('harbor', [31.0, 14.5], 'left', { variant: 'night' });
  },
  async harborNight(S, F) {
    if (F.saw_fleet) return;
    F.saw_fleet = 1;
    S.bgm(null);
    await S.fade(false);
    await S.wait(400);
    await S.say(L, '……燈塔。');
    await S.say(N, '光呢？光怎麼不轉了？');
    await S.narr('海的那一頭，孤燈岬一片漆黑。\n燈塔四周，亮著一圈紅色的船燈。');
    await S.say(L, '那是……赫利昂的艦隊。上將說過要等七天——');
    S.emote('wei', '！');
    await S.say(W, '師父。');
    S.objective('立刻搭船回孤燈岬（碼頭西側）');
    S.bgm('harbor');
  },
  async granReturn(S, F) {
    if (F.gran_done) { await S.say('葛蘭太太', '……謝謝你們帶他回家。'); return; }
    if (!F.tag_found) return;
    F.gran_done = 1;
    await S.say(N, '……葛蘭太太。');
    await S.narr('諾克把一塊被海水泡皺的名牌，放進她手裡。');
    await S.say('葛蘭太太', '……');
    await S.say('葛蘭太太', '這孩子，從小就說要採一顆最大的珠子給我。');
    await S.say('葛蘭太太', '把這個拿去。阿森的燈油……他說等他回來要用的。');
    S.give('e_ever', 1);
    S.give('oil', 3);
    await S.say(W, '……謝謝。');
  },
  async toCape(S, F) {
    if (F.chapter1_done) {
      const j = await S.choice(['回孤燈岬', '再等一下']);
      if (j !== 0) return;
      await S.fade(true);
      await S.narr('小船朝著那道光柱，慢慢駛去。');
      await S.goto('cape', [12.5, 29.5], 'up');
      return;
    }
    if (!F.saw_fleet) return STORY.toHarborBoatEarly(S, F);
    const i = await S.choice(['回孤燈岬', '再等一下']);
    if (i !== 0) return;
    await S.fade(true);
    await S.narr('小船劃過漆黑的海面。這一次，沒有光可以順著走。');
    await S.goto('cape', [12.5, 29.5], 'up', { variant: 'siege' });
  },
  async toHarborBoatEarly(S) { await S.say(W, '（燈油還沒買到。現在回去也沒用。）'); },
  async siegeArrive(S, F) {
    if (F.siege_arrived) return;
    F.siege_arrived = 1;
    S.cam(12.5, 26.5, 0.9);
    await S.fade(false);
    S.bgm('battle');
    await S.banner('孤燈岬', '長明之夜');
    await S.say(N, '……碼頭上全是晝國兵。');
    await S.say(L, '是上將的近衛隊。');
    await S.say(L, '……魏子葳，我不能對自己人拔劍。');
    await S.say(W, '那你站在後面。');
    await S.say(L, '……我沒說我要站在後面。');
    S.objective('衝上燈塔');
  },
  async finale(S, F) {
    S.bgm(null);
    S.cam(13.5, 8.5, 0.85);
    S.spawn({ id: 'castan', cast: 'castan', x: 13.5, z: 7.2, dir: 'down' });
    S.spawn({ id: 'gray_npc', cast: 'gray', x: 12.3, z: 7.8, dir: 'down' });
    S.spawn({ id: 'owen2', cast: 'owen', x: 14.8, z: 6.6, dir: 'left' });
    S.spawn({ id: 'sol1', cast: 'soldier', x: 10.5, z: 8.6, dir: 'right' });
    S.spawn({ id: 'sol2', cast: 'soldier', x: 16.5, z: 8.6, dir: 'left' });
    await S.wait(700);
    await S.say(K, '歐文。我給了你七天。');
    await S.say(O, '你只等了一天，阿斯。');
    await S.say(K, '燈昨夜熄了三秒。今晚，熄了一整個時辰。');
    await S.say(K, '赫利昂的東堤，沒了。三十七個人。');
    S.emote('owen2', '…');
    await S.say(K, '把光束釘死在晝國這一側。只要光一直照著赫利昂，夜潮就再也上不了我們的岸。');
    await S.say(O, '光照著赫利昂，諾瓦就會沉。');
    await S.say(K, '諾瓦本來就活在黑暗裡。');
    S.emote('noct', '！');
    await S.say(N, '……你說什麼？');
    await S.say(W, '燈塔不屬於任何一國。');
    S.face('castan', 'down');
    await S.say(K, '孩子。十年前，我女兒也是這麼相信的。');
    await S.say(K, '葛雷。');
    await S.say(G, '是。');
    await S.say(G, '范德潮汛官，退到我身後。');
    await S.wait(700);
    await S.say(L, '……上將。潮汛署守則第一條：「潮水不分國界」。');
    S.sfx('slash');
    await S.narr('莉瑟拔出了劍，站到魏子葳身邊。');
    await S.say(G, '抗命。');
    await S.say(L, '是。');
    await S.say(O, '哈。老頭子也還能揮兩下。');
    S.toast('歐文暫時加入了隊伍');
    S.camFollow();
    const r = await S.battle('boss_gray', { guest: 'owen' });
    if (r !== 'win') return;
    S.bgm('sad');
    S.cam(13.5, 7.5, 0.8);
    await S.say(G, '……上將，請下令。');
    await S.say(K, '夠了。燈室的鑰匙——');
    await S.say(O, '阿斯。你知道燈為什麼會熄嗎？');
    await S.say(O, '燈油沒問題，燈芯也沒問題。是燈守老了。');
    S.emote('wei', '？');
    await S.say(W, '……師父？');
    await S.say(O, '長明燈燒的不是油，是燈守的命。七百年來，每一代燈守都是這樣，一點一點把自己燒進去。');
    await S.say(O, '我的命快燒完了。所以燈才會眨眼。');
    await S.wait(900);
    await S.say(O, '子葳。燈芯在你身上。你是七百年來，第一個能轉動燈的人——所以你不能留在這裡燒。');
    await S.say(O, '去夜邦。找到第一位燈守的墓。答案在那裡。');
    await S.say(W, '我不走。');
    await S.say(O, '這是師父最後一次命令你。');
    await S.move('owen2', 13.5, 5.9, 1.2);
    S.hide('owen2');
    await S.say(K, '歐文——！');
    await S.wait(1200);
    S.flash('#ffffff', 1600, 1); S.sfx('phase'); S.sfx('boom'); S.shake(0.6, 2);
    S.beamPillar();
    await S.wait(1500);
    await S.narr('那天晚上，長明燈亮得像一顆小太陽。');
    await S.narr('光芒把赫利昂的艦隊推回了霧裡。\n然後，光束不再旋轉。它直直地衝上了天頂。');
    await S.say(K, '……撤退。');
    await S.say(K, '魏子葳。七天後，我會帶著黑帆艦隊回來。這盞燈，只能為一個國家亮。');
    S.despawn('castan'); S.despawn('gray_npc'); S.despawn('sol1'); S.despawn('sol2');
    await S.wait(900);
    await S.narr('燈塔的門縫裡，躺著師父的燈杖。燈芯，還是溫的。');
    S.give('hook3', 1);
    await S.say(L, '子葳……');
    await S.say(N, '……你師父說，去夜邦。');
    await S.say(W, '……嗯。');
    await S.say(W, '光轉回來之前出發。');
    await S.say(N, '光不會再轉了，小哥。');
    await S.wait(800);
    await S.say(W, '那就……在它熄掉之前。');
    await S.fade(true, 1400);
    F.chapter1_done = 1;
    S.log('長明之夜', '歐文用自己的命點亮了長明燈，逼退了赫利昂艦隊。光束從此不再旋轉。卡斯坦說七天後會帶黑帆艦隊回來。');
    await S.card('第一章　霧港與沉鐘', '完', '長明燈不再旋轉，光柱直指天頂。<br>距離黑帆艦隊回來，還有七天。<br><br>第二章「夜邦」製作中', 7000);
    await S.ending();
  },
  // ---------- 營火通用 ----------
  async campTalk(S, F, id) {
    if (id === 'flats_camp' && !F.camp1) { F.camp1 = 1; await STORY.camp1(S, F); return true; }
    if (id === 'ruins_camp' && !F.camp2 && F.noct_joined) { F.camp2 = 1; await STORY.camp2(S, F); return true; }
    return false;
  },
  async camp2(S, F) {
    await S.narr('遺跡深處，連營火的煙都往上飄得很慢。');
    await S.say(L, '魏子葳。你是在燈塔出生的嗎？');
    await S.say(W, '不是。我是被一艘白色的貝殼小船沖上孤燈岬的。');
    await S.say(N, '貝殼小船？');
    await S.say(W, '師父說，那天晚上是夜潮最大的一次。船裡只有我，跟一條寫著名字的布。');
    await S.say(W, '「魏子葳」。用一種誰都看不懂的字寫的。師父花了三年才讀出來。');
    await S.say(L, '……所以你從來沒見過自己的家人。');
    await S.say(W, '燈塔就是。');
    await S.wait(600);
    await S.say(N, '……我有一個弟弟。');
    await S.say(N, '他怕黑。在夜邦怕黑，跟在海裡怕水一樣，很麻煩。');
    await S.say(N, '所以我要買燈。很多很多燈。');
    await S.say(L, '……我以為你要錢是為了自己。');
    await S.say(N, '大小姐，你以為的事情很多。');
    await S.say(L, '……對不起。');
    await S.say(N, '……幹嘛道歉啦。快吃。');
  },
  async lighthouseDoor(S, F) {
    if (F.siege_arrived && !F.chapter1_done) return;
    if (!F.prologue_night) return;
    await S.say(W, '（燈室的門。師父在上面。）');
  },
};
