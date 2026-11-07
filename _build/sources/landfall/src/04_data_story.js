'use strict';
/* ====== 劇情資料：場景、主線、事件、遠征 ======
 * 場景台詞：{s:'ai'|'me'|castKey|'any'|'sci', t:'…'} 或 {n:'旁白'}
 * 'any'＝任一位甦醒的人（沒人就換成艦長）；'sci'＝研究能力最好的人 */
const SCENES = {
  prologue: [
    { s: 'ai', t: '艦長。' },
    { s: 'ai', t: '艦長，請睜開眼睛。' },
    { s: 'me', t: '……伴星？' },
    { s: 'ai', t: '我在。長庚號在四十一小時前迫降。我們只剩下後段艙。' },
    { s: 'me', t: '其他人呢？' },
    { s: 'ai', t: '一百一十二具冬眠艙仍在運作，其中九具受損。艦橋段與中段艙，下落不明。' },
    { s: 'ai', t: '應急電池剩餘 35%。冬眠艙的維生系統，每一分鐘都在消耗它。' },
    { s: 'ai', t: '電力不足，我無法喚醒任何人。艙外的殘骸裡，有足夠的材料組一座太陽能板。' },
    { s: 'me', t: '那就先把燈點亮。' },
  ],
  power: [
    { s: 'ai', t: '發電量回升。依照程序，下一步是喚醒船員。' },
    { s: 'ai', t: '但冬眠艙資料庫在墜毀時受損，我只能讀出部分資料。' },
    { s: 'ai', t: '電池存到 60 度，就能打開一具艙。選誰，由您決定。' },
  ],
  firstWake: [
    { s: 'ai', t: '船上口糧剩 {food} 份。照這個人數，撐不了太久。' },
    { s: 'me', t: '那就先讓大家吃得飽、睡得著。' },
  ],
  dusk1: [
    { n: '太陽落下的時候，整片山谷亮了起來。' },
    { n: '傘菌樹底下的皺褶、溪水、地上的蘚苔……全都在發光。' },
    { s: 'any', t: '……艦長，你看天上。' },
    { n: '兩顆月亮，一大一小，從山脊後面升了起來。' },
    { s: 'ai', t: '新禾星只有一顆衛星。' },
    { s: 'ai', t: '我正在重新計算我們的位置。' },
    { s: 'me', t: '算出來，第一個告訴我。' },
    { s: 'ai', t: '是。' },
  ],
  sophia: [
    { n: '蘇菲亞在艙外站了很久，仰頭看著天空，一句話也沒說。' },
    { s: 'sophia', t: '這不是新禾。' },
    { s: 'sophia', t: '這些星座……我們偏離了將近四十一光年。' },
    { s: 'me', t: '導航故障？' },
    { s: 'sophia', t: '四十一光年不是故障，艦長。是有人一點一點、持續了好幾年，把航道改掉的。' },
    { s: 'sophia', t: '伴星，調出航道修改紀錄。' },
    { s: 'ai', t: '查無紀錄。' },
    { s: 'sophia', t: '查無紀錄？還是被刪掉了？' },
    { s: 'ai', t: '……' },
    { s: 'ai', t: '查無紀錄。' },
  ],
  aiPosition: [
    { s: 'ai', t: '艦長，位置計算完成。' },
    { s: 'ai', t: '我們距離新禾星，四十一光年。' },
    { s: 'me', t: '四十一光年……怎麼會偏這麼多？' },
    { s: 'ai', t: '航道紀錄已損毀。無法判斷。' },
  ],
  team: [
    { s: 'ai', t: '甦醒人數五名。殖民地的基本運作已經穩定。' },
    { s: 'sci', t: '艦長，我們不能一直靠拆船活下去。得先弄懂這顆星——它的土、它的季節、它的生物。' },
    { s: 'me', t: '研究台需要零件。先把它蓋起來。' },
  ],
  agro: [
    { s: 'sci', t: '溫室可以種星薯了。……還有一件事。' },
    { s: 'sci', t: '那些晶簇在「跳」。不是比喻——它們真的在脈動，一亮一暗，而且每天都比前一天快一點。' },
    { s: 'ai', t: '建議採集一份晶簇樣本，進行分析。' },
  ],
  crystal: [
    { s: 'sci', t: '晶簇的脈動跟雙月同步。兩顆月亮越靠近，它跳得越快。' },
    { s: 'sci', t: '還有，我們在晶體裡面找到了這個——' },
    { n: '螢幕放大。晶體深處，密密麻麻封著燈蟲的殼。幾千隻，幾萬隻。' },
    { s: 'ai', t: '依照軌道推算，雙月將在第 {tideDay} 日入夜後交會。' },
    { s: 'any', t: '交會的時候……會怎樣？' },
    { s: 'ai', t: '晶體裡的紀錄顯示：上一次交會的那一夜，整座峽谷的生物同時湧向共振最強的地方。' },
    { s: 'ai', t: '現在，共振最強的地方是我們。我們的電力、我們的燈，還有一百多具冬眠艙。' },
    { s: 'me', t: '還有幾天？' },
    { s: 'ai', t: '{days} 天。' },
    { s: 'me', t: '那就準備好迎接它。' },
  ],
  crystalAuto: [
    { s: 'ai', t: '艦長，晶簇的脈動已經快到肉眼可見。我比對了雙月軌道。' },
    { s: 'ai', t: '雙月將在第 {tideDay} 日入夜後交會。晶體裡的燈蟲殼顯示，那一夜，整座峽谷的生物會朝共振最強的地方湧來。' },
    { s: 'ai', t: '也就是我們。' },
    { s: 'me', t: '……還有 {days} 天。開始準備。' },
  ],
  beacon: [
    { s: 'ai', t: '艦長。我在雜訊裡收到一段很弱的訊號。' },
    { s: 'ai', t: '是艦橋段的黑盒子。它還在發報。' },
    { s: 'me', t: '能定位嗎？' },
    { s: 'ai', t: '需要一座通訊天線，以及完整的信號解析。' },
  ],
  located: [
    { s: 'ai', t: '定位完成。艦橋段在東北方二十二公里，晶簇原野的另一頭。' },
    { s: 'ai', t: '黑盒子還在發報。……應急艙的生命訊號，也還在。' },
    { s: 'ai', t: '但在雙月交會之前，晶簇的共振會讓所有導航設備失靈。必須等潮過去，才能出發。' },
  ],
  locatedAfter: [
    { s: 'ai', t: '定位完成。艦橋段在東北方二十二公里，晶簇原野的另一頭。' },
    { s: 'ai', t: '黑盒子還在發報。應急艙的生命訊號，也還在。' },
    { s: 'ai', t: '共振已經減弱，現在可以出發。' },
  ],
  tideStart: [
    { n: '第二顆月亮，追上了第一顆。' },
    { n: '晶簇的光跳成了心跳的頻率。山谷裡所有會發光的東西，同時暗了一下——' },
    { n: '然後，全部朝著這裡亮了過來。' },
    { s: 'ai', t: '潮來了。' },
    { s: 'ai', t: '艦長，您可以下令燈火管制。熄燈能讓牠們失去目標——但冬眠艙會降到最低維生。撐太久，會有人醒不過來。' },
  ],
  tideBoss: [
    { n: '地面開始震動。' },
    { s: 'any', t: '那……那是什麼……' },
    { s: 'ai', t: '偵測到大型生物。牠正朝著冬眠艙前進。' },
  ],
  tideEnd: [
    { n: '第一道陽光照進峽谷的時候，潮退了。' },
    { n: '倖存的燈蟲像退潮一樣散回山谷，只留下滿地還在發光的殼。' },
    { s: 'any', t: '我們……撐過來了？' },
    { s: 'me', t: '撐過來了。' },
  ],
  expAvail: [
    { s: 'ai', t: '晶簇的共振減弱了。導航設備可以正常運作。' },
    { s: 'ai', t: '艦橋段在東北方二十二公里。黑盒子還在發報，應急艙的生命訊號也還在。' },
    { s: 'xiaoman', t: '應急艙……我媽媽就在那裡！' },
  ],
  arrive: [
    { n: '艦橋段斜插在一片晶簇林裡，像一把折斷的刀。' },
    { n: '應急艙裡有七具冬眠艙。其中三具，指示燈還亮著。' },
    { s: 'team', t: '這一具……名牌上寫著：程薇。' },
    { n: '他們從主控台裡撬出了黑盒子。它比想像中輕得多。' },
  ],
  returnHome: [
    { n: '遠征隊回來了。拖著三具冬眠艙，和一個黑色的盒子。' },
    { s: 'xiaoman', t: '媽——！' },
  ],
  reunion: [
    { n: '冬眠艙打開的時候，程小滿已經在旁邊守了一整夜。' },
    { s: 'chengwei', t: '小滿……小滿？' },
    { s: 'xiaoman', t: '媽，我在這裡。我在這裡。' },
    { n: '程薇伸手摸了摸女兒的臉，好像在確認這不是夢。' },
    { s: 'chengwei', t: '你長高了。……我睡了多久？' },
    { s: 'xiaoman', t: '不重要了。' },
  ],
  decryptShen: [
    { s: 'shen', t: '解開了。' },
    { s: 'shen', t: '航道不是一次改掉的。從航行第三十年開始，每次只偏一點點，偏了整整十一年。任何人看了，都會以為是正常的航向修正。' },
    { s: 'shen', t: '每一次修改，用的都是同一組授權碼。' },
    { n: '她把螢幕轉了過來。' },
    { n: 'W-0001。艦長授權碼。' },
    { s: 'shen', t: '艦長。這組碼，是你的。' },
    { s: 'me', t: '……我不記得。' },
    { s: 'ai', t: '確認無誤。冬眠艙紀錄顯示：航行第三十年第一百一十二日，艦長甦醒了十九分鐘。' },
    { s: 'ai', t: '那十九分鐘裡，艦長下達了航道修改指令，然後返回冬眠。' },
    { s: 'me', t: '我什麼都不記得。' },
    { s: 'ai', t: '我知道。' },
  ],
  decryptAi: [
    { s: 'ai', t: '黑盒子解密完成。' },
    { s: 'ai', t: '航道不是一次修改的。從航行第三十年開始，每次只偏移一點點，持續了十一年。' },
    { s: 'ai', t: '每一次修改，用的都是同一組授權碼：W-0001。' },
    { n: '艦長授權碼。' },
    { s: 'me', t: '……我的？' },
    { s: 'ai', t: '確認無誤。冬眠艙紀錄顯示：航行第三十年第一百一十二日，艦長甦醒了十九分鐘。' },
    { s: 'ai', t: '那十九分鐘裡，艦長下達了航道修改指令，然後返回冬眠。' },
    { s: 'me', t: '我什麼都不記得。' },
    { s: 'ai', t: '我知道。' },
  ],
  confess: [
    { n: '那天夜裡，所有人都睡了。他一個人回到艙裡。' },
    { s: 'me', t: '伴星。那十九分鐘裡，我說了什麼？' },
    { s: 'ai', t: '……' },
    { s: 'ai', t: '您說：「帶他們去，它在呼喚的地方。」' },
    { s: 'ai', t: '然後，您要求我刪除您那十九分鐘的記憶。' },
    { s: 'me', t: '「它」是誰？' },
    { s: 'ai', t: '您沒有告訴我。' },
    { n: '窗外，晶簇又開始緩緩地亮了起來。一下，一下，像在回答什麼。' },
  ],
};

/* 主線目標 */
const MAIN = [
  { id: 'power', title: '恢復電力', desc: '建造一座太陽能板。', hint: 'build:solar' },
  { id: 'wake1', title: '第一個醒來的人', desc: '電池存到 60 度後，打開冬眠艙庫，喚醒一位船員。', hint: 'pods' },
  { id: 'night1', title: '先活下去', desc: '讓大家吃得飽、睡得著。', hint: 'build:dorm' },
  { id: 'team', title: '重建團隊', desc: '讓甦醒的船員達到五人。', hint: 'pods' },
  { id: 'study', title: '研究這顆星', desc: '建造研究台，完成「異星作物馴化」。', hint: 'build:research' },
  { id: 'crystal', title: '晶簇的脈動', desc: '採集一份晶簇樣本，完成「晶簇共振」研究。', hint: 'crystal' },
  { id: 'tide', title: '潮夜將至', desc: '在雙月交會之前做好準備，撐過那一夜。', hint: 'build:fence' },
  { id: 'expedition', title: '艦橋段', desc: '找到艦橋段，帶回黑盒子。', hint: 'exp' },
  { id: 'decrypt', title: '黑盒子', desc: '解開黑盒子的加密。', hint: 'research' },
];

/* 隨機與角色事件
 * cond(G) 是否可觸發；w 權重；once 只觸發一次；gap 冷卻（日）
 * make(G) → {title, art, text, choices:[{t, sub, req(G)→true|'原因', fx(G)}]} */
const EVENTS = [
  {
    id: 'thief', once: true, w: 4,
    cond: G => C('zhou') && G.day >= 3,
    make: G => ({
      title: '多出來的那一份', art: 'food',
      text: `清點口糧的時候，少了三份。\n\n秦守仁在周木的床鋪底下，翻出了包裝紙。周木聳聳肩：「我只是……習慣多留一點。以前在牢裡，不留就會餓。」`,
      choices: [
        { t: '公開懲處', sub: '扣他兩天的休息時間。秦守仁會滿意，周木不會。', fx: G => {
          trust(C('zhou'), -12); mem(C('zhou'), 'punish', -10, 2 * DAY, '被當眾懲處'); trust(C('qin'), 6); trust(C('xu'), 3);
          if (C('shen')) mem(C('shen'), 'friendPunish', -5, DAY, '朋友被當眾懲處');
          G.flags.zhouSteal = 0.3; } },
        { t: '私下談談', sub: '艦長親自找他聊。', fx: G => {
          trust(C('zhou'), 10); mem(C('zhou'), 'notExposed', 7, DAY, '艦長沒有拆穿我'); G.flags.zhouSteal = 0.5; } },
        { t: '讓他管倉庫', sub: '「既然你這麼會藏，以後食物就由你來管。」', fx: G => {
          trust(C('zhou'), 15); mem(C('zhou'), 'trusted', 12, 3 * DAY, '第一次被人信任'); trust(C('qin'), -6);
          G.flags.zhouSteal = 0; G.flags.zhouStore = 1; log('周木接手了倉庫管理。食物消耗減少 6%。', 'good'); } },
      ],
    }),
  },
  {
    id: 'yebai', once: true, w: 50,
    cond: G => C('ye') && podOf('bai') && podOf('bai').dmg && podOf('bai').left < 4 * DAY,
    make: G => ({
      title: '紅燈', art: 'pod',
      text: `葉知秋在冬眠艙庫裡站了一整晚。白朗那具艙的壓力指示燈，從黃色變成了紅色。\n\n「修復要六個零件。我知道我們缺零件。」她的聲音很平靜，平靜得過分。「我只是想問——排得到嗎？」`,
      choices: [
        { t: '現在就修', sub: '花 6 零件，立刻修好。', req: G => G.res.comp >= 6 || '零件不足', fx: G => {
          G.res.comp -= 6; const p = podOf('bai'); p.dmg = false; trust(C('ye'), 15); mem(C('ye'), 'saved', 12, 2 * DAY, '艦長救了他');
          log('白朗的冬眠艙修好了。', 'good'); } },
        { t: '直接喚醒他', sub: '耗電喚醒。受損艙甦醒，冬眠失調會很嚴重。', req: G => G.power.stored >= wakeCost() || '電力不足', fx: G => {
          trust(C('ye'), 10); wakePod(podOf('bai'), true); } },
        { t: '零件要留給防禦', sub: '她會記住這句話。', fx: G => {
          trust(C('ye'), -20); mem(C('ye'), 'notPriority', -15, 3 * DAY, '他排不上'); } },
      ],
    }),
  },
  {
    id: 'council', once: true, w: 5,
    cond: G => C('xu') && awakeCount() >= 6 && G.day >= 4,
    make: G => ({
      title: '委員會', art: 'talk',
      text: `晚飯後，許衡把大家叫到一起。\n\n「我們需要制度。我建議成立殖民地委員會，重大決策交付表決。作為星衡集團的代表，我願意擔任委員長。」\n\n所有人都看向了你。`,
      choices: [
        { t: '同意', sub: '很多人會覺得被尊重。許衡的聲量會變大。', fx: G => {
          trustAll(4, c => !['qin', 'anna'].includes(c.key)); trust(C('xu'), 15); trust(C('qin'), -5); trust(C('anna'), -5); G.flags.council = 1; } },
        { t: '拒絕', sub: '「現在需要的是一個能下決定的人。」', fx: G => {
          trust(C('qin'), 6); trust(C('anna'), 4); trust(C('xu'), -15); trustAll(-3, c => !['qin', 'anna', 'xu'].includes(c.key)); } },
        { t: '委員長由大家選', sub: '需要艦長的社交 7 以上。', req: G => leader().sk.social >= 7 || '社交不足', fx: G => {
          trustAll(6, c => c.key !== 'xu'); trust(C('xu'), -6); mem(C('xu'), 'outplayed', -6, 2 * DAY, '被擺了一道'); G.flags.council = 2;
          log('殖民地委員會成立，委員長由全體投票——魏子葳以壓倒性票數當選。', 'good'); } },
      ],
    }),
  },
  {
    id: 'tang', once: true, w: 8,
    cond: G => C('tang') && C('xu') && C('tang').trust >= 30 && G.day >= 6 && isNight(),
    make: G => ({
      title: '影子', art: 'talk',
      text: `夜裡，唐槿在艙門邊攔住了你。\n\n「許衡要我盯著你。記下你的每一個決定、每一次失誤。等救援來了，這些會變成他接管殖民地的證據。」\n\n她停了一下。「我照做了。……但我想讓你知道，我照做了。」`,
      choices: [
        { t: '「繼續照做。」', sub: '給他他想看的。你會知道他在想什麼。', fx: G => {
          trust(C('tang'), 10); G.flags.tangDouble = 1; log('唐槿成了你的眼睛。', 'good'); } },
        { t: '「你可以停下來。」', sub: '她會更信任你。', fx: G => {
          trust(C('tang'), 18); mem(C('tang'), 'free', 10, 3 * DAY, '可以不用再當影子'); opin(C('xu'), C('tang'), -20); } },
        { t: '「我去找許衡談。」', sub: '攤牌。許衡會知道是她說的。', fx: G => {
          trust(C('xu'), -10); trust(C('tang'), -5); opin(C('xu'), C('tang'), -40); mem(C('xu'), 'exposed', -10, 2 * DAY, '被艦長當面拆穿'); } },
      ],
    }),
  },
  {
    id: 'larva', once: true, w: 5,
    cond: G => C('rani') && G.day >= 3,
    make: G => ({
      title: '手心裡的光', art: 'bug',
      text: `拉妮在溪邊撿到一隻燈蟲幼體，只有手掌大，發著微弱的綠光。牠一直往她手心裡鑽。\n\n「牠不怕我。艦長，牠不怕我！」`,
      choices: [
        { t: '讓她養', sub: '牠會跟著拉妮。危險靠近時，牠會變成紅色。', fx: G => {
          G.flags.pet = 1; mem(C('rani'), 'pet', 10, 4 * DAY, '有了一隻小燈蟲'); spawnPet(); } },
        { t: '解剖研究', sub: '+25 資料。拉妮會很難過。', fx: G => {
          G.res.data += 25; mem(C('rani'), 'dissect', -12, 3 * DAY, '牠在我手心裡死掉了'); trust(C('rani'), -8); } },
        { t: '放回溪邊', sub: '牠屬於這裡。', fx: G => { mem(C('rani'), 'release', 3, DAY, '放牠回家'); } },
      ],
    }),
  },
  {
    id: 'spore', gap: 8, w: 3,
    cond: G => G.day >= 5 && awakeCount() >= 4,
    make: G => {
      const vic = shuffle(awake().filter(c => !c.leader && !c.sick), R).slice(0, Math.min(3, Math.max(2, Math.floor(awakeCount() / 4))));
      G._spore = vic.map(c => c.id);
      return {
        title: '孢子熱', art: 'spore',
        text: `${vic.map(c => c.name).join('、')}開始發燒，皮膚上浮出淡淡的青色斑點。\n\n拉妮的判斷是：空氣裡的孢子。不致命，但會傳染。`,
        choices: [
          { t: '用藥治療', sub: '花 4 藥品，很快就好。', req: G => G.res.med >= 4 || '藥品不足', fx: G => {
            G.res.med -= 4; log('孢子熱控制住了。', 'good'); } },
          { t: '隔離休息', sub: '他們會休息一整天，不會傳開。', fx: G => {
            for (const id of G._spore) { const c = byId(id); if (c) sick(c, 20 * 60, '孢子熱'); } } },
          { t: '試試光蘚偏方', sub: '需要拉妮。可能有效，也可能更糟。', req: G => !!C('rani') || '拉妮還沒醒', fx: G => {
            if (R() < 0.6) { G.res.data += 12; log('光蘚萃取物有效！拉妮把配方記了下來。', 'good'); mem(C('rani'), 'cure', 6, DAY, '偏方成功了'); }
            else { for (const id of G._spore) { const c = byId(id); if (c) sick(c, 40 * 60, '孢子熱加重'); } log('偏方讓病情加重了。', 'bad'); } } },
        ],
      };
    },
  },
  {
    id: 'meteor', gap: 6, w: 2,
    cond: G => G.day >= 4,
    make: G => ({
      title: '殘骸雨', art: 'meteor',
      text: `天空劃過一道又一道火光。\n\n是長庚號的中段艙——在軌道上繞了這麼多天，終於一塊一塊掉了下來。`,
      choices: [{ t: '找掩護', sub: '等它落完，再去撿東西。', fx: G => { meteorShower(); } }],
    }),
  },
  {
    id: 'storm', gap: 7, w: 2,
    cond: G => G.day >= 3 && !G.weather,
    make: G => ({
      title: '沙暴', art: 'storm',
      text: `西邊的天空變成了鐵鏽色。伴星預測：沙暴將在一小時內抵達，持續大半天。\n\n太陽能板會被沙蓋住，外面什麼也看不見。`,
      choices: [
        { t: '全員待在室內', sub: '停工半天，大家心情不受影響。', fx: G => { startWeather('storm', 12 * 60, true); } },
        { t: '照常工作', sub: '在外面頂著沙暴幹活，心情會變差。', fx: G => { startWeather('storm', 12 * 60, false); } },
      ],
    }),
  },
  {
    id: 'birthday', gap: 5, w: 3,
    cond: G => awakeCount() >= 3,
    make: G => {
      const c = R.pick(awake().filter(x => !x.leader)); G._bd = c.id;
      return {
        title: '生日', art: 'cake',
        text: `按地球曆算，今天是${c.name}的生日。\n\n${c.he}自己好像都忘了。`,
        choices: [
          { t: '在食堂辦個小派對', sub: '花 8 份食物，大家都會開心。', req: G => (G.res.food >= 8 && hasB('mess')) || '需要食堂與 8 份食物', fx: G => {
            G.res.food -= 8; memAll('party', 7, DAY, '生日派對'); mem(byId(G._bd), 'bday', 15, 2 * DAY, '大家幫我過了生日'); trust(byId(G._bd), 6); } },
          { t: '跟他說聲生日快樂', sub: '小小的心意。', fx: G => { mem(byId(G._bd), 'bday', 5, DAY, '艦長記得我的生日'); trust(byId(G._bd), 3); } },
        ],
      };
    },
  },
  {
    id: 'quarrel', gap: 3, w: 6,
    cond: G => !!findRivals(),
    make: G => {
      const [a, b] = findRivals(); G._q = [a.id, b.id];
      const why = R.pick(['誰該多值一班夜', '最後一份熱湯', '工具沒放回原位', '誰打呼太大聲', '宿舍裡的床位']);
      return {
        title: '爭吵', art: 'fight',
        text: `${a.name}和${b.name}吵起來了，起因是${why}。\n\n聲音越來越大，旁邊的人都停下了手上的工作。`,
        choices: [
          { t: '艦長出面調解', sub: '艦長的社交越高，越有機會讓兩人和好。', fx: G => {
            const ok = R() < 0.35 + leader().sk.social * 0.07;
            const [x, y] = G._q.map(byId);
            if (ok) { opin(x, y, 18); opin(y, x, 18); trust(x, 3); trust(y, 3); log(`${x.name}和${y.name}握了手。`, 'good'); }
            else { opin(x, y, 4); opin(y, x, 4); log(`兩人勉強安靜下來，但心結還在。`); } } },
          { t: '讓他們自己解決', sub: '可能冷靜下來，也可能打起來。', fx: G => {
            const [x, y] = G._q.map(byId);
            if (R() < 0.5) { hurt(x, 14, '打架'); hurt(y, 14, '打架'); opin(x, y, -15); opin(y, x, -15); log(`${x.name}和${y.name}扭打成一團。`, 'bad'); }
            else { opin(x, y, 6); opin(y, x, 6); log('兩人各自走開，冷靜了下來。'); } } },
          { t: '把兩人調開', sub: '不會打起來，但也不會和好。', fx: G => { const [x, y] = G._q.map(byId); x.apart = y.id; y.apart = x.id; } },
        ],
      };
    },
  },
  {
    id: 'romance', gap: 4, w: 4,
    cond: G => !!findLovers(),
    make: G => {
      const [a, b] = findLovers(); G._love = [a.id, b.id];
      return {
        title: '同一盞燈', art: 'heart',
        text: `${a.name}和${b.name}這幾天總是坐在一起吃飯，夜裡也常常一起守在燈下。\n\n今天，他們來問你：能不能搬進同一間宿舍？`,
        choices: [
          { t: '當然可以', sub: '他們會成為伴侶。', fx: G => { const [x, y] = G._love.map(byId); x.partner = y.id; y.partner = x.id;
            mem(x, 'love', 12, 6 * DAY, '和' + y.name + '在一起了'); mem(y, 'love', 12, 6 * DAY, '和' + x.name + '在一起了'); log(`${x.name}和${y.name}在一起了。`, 'good'); } },
          { t: '現在不是時候', sub: '他們會失望。', fx: G => { const [x, y] = G._love.map(byId); mem(x, 'denied', -8, 2 * DAY, '被拒絕了'); mem(y, 'denied', -8, 2 * DAY, '被拒絕了'); trust(x, -5); trust(y, -5); } },
        ],
      };
    },
  },
  {
    id: 'relic', gap: 4, w: 3,
    cond: G => awakeCount() >= 4 && G.day >= 3,
    make: G => {
      const pool = awake().filter(x => !x.leader); const owner = R.pick(pool); const finder = R.pick(pool.filter(x => x !== owner)) || leader();
      G._relic = [owner.id, finder.id];
      const item = R.pick(['一疊照片', '一支舊手錶', '一封沒寄出去的信', '一個小孩畫的太空船', '一張演唱會門票的票根']);
      return {
        title: '殘骸裡的東西', art: 'box',
        text: `${finder.name}在殘骸裡找到一個變形的鐵盒子，裡面是${item}——屬於${owner.name}。`,
        choices: [
          { t: '交還給' + owner.name, sub: '', fx: G => { const [o, f] = G._relic.map(byId); mem(o, 'relic', 12, 2 * DAY, '找回了遺落的東西'); opin(o, f, 15); } },
          { t: '先收著', sub: '現在不是感傷的時候。', fx: G => {} },
        ],
      };
    },
  },
  {
    id: 'whale', gap: 9, w: 2,
    cond: G => G.day >= 4 && hourOf(G.t) < 9 && hourOf(G.t) >= 5,
    make: G => ({
      title: '天上的鯨', art: 'whale',
      text: `天剛亮的時候，有東西從峽谷上空經過。\n\n像鯨魚一樣大，半透明，身體裡有星星一樣的光點在流動。牠沒有發出任何聲音，慢慢地越過山脊，消失在雲裡。\n\n所有人都停下了手上的事。`,
      choices: [{ t: '看著牠離開', sub: '', fx: G => { memAll('whale', 6, DAY, '看見了天上的巨鯨'); if (C('rani')) mem(C('rani'), 'whale2', 8, 2 * DAY, '那一定是全宇宙最美的生物'); G.res.data += 8; } }],
    }),
  },
  {
    id: 'aiReq', gap: 6, w: 3,
    cond: G => G.day >= 4 && G.power.stored > 50 && isNight(),
    make: G => ({
      title: '伴星的請求', art: 'ai',
      text: `「艦長，我請求在今晚調用 30 度電，執行系統完整性檢查。」\n\n伴星的語氣和平常一樣平靜。`,
      choices: [
        { t: '同意', sub: '-30 度電。', fx: G => { G.power.stored = Math.max(0, G.power.stored - 30); G.flags.aiCheck = (G.flags.aiCheck || 0) + 1;
          if (G.flags.aiCheck === 1) log('檢查期間，你注意到伴星反覆讀取同一份資料：艦長的冬眠艙紀錄。', 'warn'); } },
        { t: '拒絕', sub: '', fx: G => { log('伴星：「明白。」'); } },
        { t: '讓沈鷺盯著', sub: '需要沈鷺。', req: G => !!C('shen') || '沈鷺還沒醒', fx: G => {
          G.power.stored = Math.max(0, G.power.stored - 30); G.res.data += 10; trust(C('shen'), 5);
          log('沈鷺：「它在讀你的冬眠紀錄，艦長。一遍又一遍。」', 'warn'); G.flags.aiCheck = (G.flags.aiCheck || 0) + 1; } },
      ],
    }),
  },
  {
    id: 'anna', once: true, w: 4,
    cond: G => C('anna') && G.day >= 5,
    make: G => ({
      title: '扳手', art: 'wrench',
      text: `安娜拎著一把扳手來找你。\n\n「讓我把伴星從冬眠艙的控制迴路上拆下來。我不想讓一台會說『查無紀錄』的機器，握著一百多條人命。」`,
      choices: [
        { t: '讓她拆', sub: '改成手動喚醒：每次喚醒多耗 10 度電。', fx: G => { G.flags.aiLimited = 1; trust(C('anna'), 15); log('伴星：「……明白。」', 'warn'); } },
        { t: '不行', sub: '「現在沒有伴星，我們連一半的事都做不了。」', fx: G => { trust(C('anna'), -12); mem(C('anna'), 'refused', -6, 2 * DAY, '艦長護著那台機器'); } },
        { t: '先讓沈鷺審程式碼', sub: '需要沈鷺。', req: G => !!C('shen') || '沈鷺還沒醒', fx: G => {
          trust(C('anna'), 6); trust(C('shen'), 6); G.res.data += 15; opin(C('anna'), C('shen'), 15); log('安娜和沈鷺熬了一整夜，看完了伴星的冬眠控制程式。沒有後門——至少這一段沒有。'); } },
      ],
    }),
  },
  {
    id: 'deng', once: true, w: 4,
    cond: G => C('deng') && G.day >= 5,
    make: G => ({
      title: '鐵片上的房子', art: 'house',
      text: `鄧鐵坐在殘骸上，用一塊鐵片刻著什麼。\n\n走近一看，是一棟小房子。屋頂上刻著一個名字：鄧小川。`,
      choices: [
        { t: '坐下來陪他', sub: '艦長會花點時間。', fx: G => { mem(C('deng'), 'company', 12, 2 * DAY, '艦長陪我坐了一會'); trust(C('deng'), 10); } },
        { t: '讓他放一天假', sub: '他今天不會工作。', fx: G => { mem(C('deng'), 'dayoff', 8, DAY, '放了一天假'); C('deng').rest = 100; C('deng').offUntil = G.t + 14 * 60; } },
        { t: '不打擾他', sub: '', fx: G => { mem(C('deng'), 'alone', 2, DAY, '沒人打擾'); } },
      ],
    }),
  },
  {
    id: 'meng', gap: 5, w: 5,
    cond: G => C('meng') && hasB('mess') && isNight() && hourOf(G.t) < 22,
    make: G => ({
      title: '說故事的晚上', art: 'fire',
      text: `晚飯後，孟婆婆坐在食堂的燈下，大家很自然地圍了過來。\n\n「今天，想聽哪一個？」`,
      choices: [
        { t: '嫦娥奔月', sub: '大家心情 +8。', fx: G => { memAll('story', 8, DAY, '聽孟婆婆說故事'); } },
        { t: '愚公移山', sub: '明天大家幹活特別起勁。', fx: G => { memAll('story', 5, DAY, '聽孟婆婆說故事'); G.buffs.work = G.t + DAY; } },
        { t: '她自己的故事', sub: '大家會更喜歡孟婆婆。', fx: G => { memAll('story', 6, DAY, '聽孟婆婆說她的故事'); for (const c of awake()) if (c.key !== 'meng') opin(c, C('meng'), 10); } },
      ],
    }),
  },
  {
    id: 'drone', once: true, w: 4,
    cond: G => C('ouyang') && G.day >= 4 && G.res.comp >= 8,
    make: G => ({
      title: '無人機', art: 'drone',
      text: `歐陽辰抱著一堆零件跑來，眼睛發亮。\n\n「給我八個零件，我能讓牠飛起來！牠可以幫我們看清整座峽谷！」`,
      choices: [
        { t: '給他', sub: '-8 零件。整張地圖會被探索。', req: G => G.res.comp >= 8 || '零件不足', fx: G => {
          G.res.comp -= 8; G.flags.drone = 1; revealAll(); mem(C('ouyang'), 'drone', 15, 3 * DAY, '無人機飛起來了！'); trust(C('ouyang'), 8); } },
        { t: '零件太缺了', sub: '他會失望。', fx: G => { mem(C('ouyang'), 'nodrone', -6, DAY, '無人機飛不起來'); } },
      ],
    }),
  },
  {
    id: 'number', once: true, w: 5,
    cond: G => C('shen') && C('qin') && G.day >= 3,
    make: G => ({
      title: '編號', art: 'fight',
      text: `秦守仁當著大家的面，叫沈鷺「四四七一」。\n\n沈鷺把手上的工具摔在地上。`,
      choices: [
        { t: '站在秦守仁這邊', sub: '「規矩就是規矩。」', fx: G => { trust(C('qin'), 8); trust(C('shen'), -12); if (C('zhou')) trust(C('zhou'), -5); } },
        { t: '「這裡沒有人有編號。」', sub: '受刑殖民者會記住這句話。', fx: G => {
          trust(C('shen'), 12); if (C('zhou')) trust(C('zhou'), 8); trust(C('qin'), -8); G.flags.noNumbers = 1; } },
        { t: '派他們一起值夜班', sub: '不是和好，就是更糟。', fx: G => {
          if (R() < 0.55) { opin(C('qin'), C('shen'), 25); opin(C('shen'), C('qin'), 20); log('值完夜班回來，秦守仁開始叫她「沈鷺」了。', 'good'); }
          else { opin(C('qin'), C('shen'), -10); opin(C('shen'), C('qin'), -12); log('那一夜，兩個人一句話也沒說。'); } } },
      ],
    }),
  },
  {
    id: 'xiaoman', once: true, w: 30,
    cond: G => C('xiaoman') && G.flags.located,
    make: G => ({
      title: '我也要去', art: 'talk',
      text: `程小滿聽說了艦橋段的事。\n\n「我要跟遠征隊一起去。那是我媽媽——我要第一個看到她。」`,
      choices: [
        { t: '帶她去', sub: '她會加入遠征隊名單。', fx: G => { G.flags.xmGo = 1; trust(C('xiaoman'), 10); } },
        { t: '「在家等她回來。」', sub: '她不會高興，但她會等。', fx: G => { mem(C('xiaoman'), 'wait', -4, 2 * DAY, '只能等'); } },
      ],
    }),
  },
  {
    id: 'bugs', gap: 4, w: 3,
    cond: G => hasB('greenhouse') && isNight() && G.day >= 4,
    make: G => ({
      title: '溫室裡的光', art: 'bug',
      text: `溫室的紫色補光，引來了一群燈蟲。牠們正在啃星薯的嫩葉。`,
      choices: [
        { t: '派人去趕', sub: '', fx: G => { spawnBeasts('bug', 4, nearB('greenhouse')); } },
        { t: '關掉補光', sub: '作物今晚長得慢一點。', fx: G => { G.flags.ghDark = G.t + 10 * 60; } },
      ],
    }),
  },
];

/* 遠征 */
const EXPED = {
  out: [
    { id: 'cliff', title: '斷崖', text: '一道斷崖把晶簇原野切成兩半。崖底很深，看不見底。', check: 'build', dc: 6,
      ok: '{best}用纜繩和殘骸鋼板，架了一座簡易的索橋。', choices: [
        { t: '繞路', sub: '多花半天。', fx: E => { E.delay += 0.5 * DAY; } },
        { t: '硬爬下去', sub: '可能有人受傷。', fx: E => { expHurt(E, 22); } }] },
    { id: 'pack', title: '刺背獸群', text: '原野上有一群刺背獸。牠們已經發現你們了。', check: 'combat', dc: 6,
      ok: '{best}開了兩槍，獸群掉頭散開。還留下了一隻被同伴咬死的——今晚有肉了。', okFx: E => { E.loot.food += 10; }, choices: [
        { t: '躲起來等', sub: '多花一點時間。', fx: E => { E.delay += 0.3 * DAY; } },
        { t: '硬闖過去', sub: '會有人受傷。', fx: E => { expHurt(E, 28); E.loot.food += 6; } }] },
    { id: 'field', title: '晶簇原野', text: '整片原野的晶簇都在嗡鳴，指南針在打轉，人的頭也開始發暈。', check: 'research', dc: 5,
      ok: '{best}發現嗡鳴有固定的間隔，帶著大家踩著節奏穿了過去，還順手記錄了一大筆數據。', okFx: E => { E.loot.data += 30; }, choices: [
        { t: '咬牙走過去', sub: '大家會頭痛好幾天。', fx: E => { E.moodHit += 8; } }] },
    { id: 'mid', title: '中段艙碎片', text: '路邊躺著一大塊中段艙的外殼，裡面的貨架還沒完全燒毀。', choices: [
        { t: '拆', sub: '多花一些時間，換一大批物資。', fx: E => { E.delay += 0.3 * DAY; E.loot.comp += 10; E.loot.metal += 12; } },
        { t: '不停留', sub: '', fx: E => {} }] },
    { id: 'arch', title: '霧中的光', text: '霧裡有光在閃。走近一看，是一座石碑——和營地附近那座一模一樣。', choices: [
        { t: '記錄下來', sub: '+20 資料。', fx: E => { E.loot.data += 20; E.lore = 1; } },
        { t: '繞開它', sub: '', fx: E => {} }] },
    { id: 'camp', title: '夜宿', text: '天黑了。原野上的光一盞一盞亮起來，美得不像真的。', choices: [
        { t: '紮營休息', sub: '', fx: E => { E.moodHit -= 4; } },
        { t: '連夜趕路', sub: '省半天，但大家會很累。', fx: E => { E.delay -= 0.4 * DAY; E.moodHit += 6; } }] },
  ],
  back: [
    { id: 'shells', title: '殼之谷', text: '回程經過一座山谷，地上鋪滿了燈蟲的殼，一層疊一層，在月光下閃閃發亮。這是上一次潮夜留下的。', choices: [
        { t: '帶一些回去研究', sub: '+15 資料。', fx: E => { E.loot.data += 15; } },
        { t: '默默走過', sub: '', fx: E => {} }] },
    { id: 'sled', title: '雪橇', text: '拖著三具冬眠艙的雪橇，卡進了晶簇的縫隙裡。', check: 'build', dc: 5,
      ok: '{best}拆了兩根支架當槓桿，雪橇很快又動了起來。', choices: [
        { t: '慢慢拖出來', sub: '多花一些時間。', fx: E => { E.delay += 0.3 * DAY; } }] },
  ],
};
