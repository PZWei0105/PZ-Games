/* ===== 劇情：角色、五章腳本、過場畫面、劇情播放器 ===== */
const SPEAKERS = {
  n: { name: '', col: '#e8e3d8', face: 'radio' },
  '葳': { name: '魏子葳', col: '#ffb347', face: 'ziwei' },
  '晴': { name: '魏子晴', col: '#7fd3ec', face: 'ziqing' },
  '坤': { name: '阿坤伯', col: '#9fc7ff', face: 'akun' },
  '豹': { name: '豹哥', col: '#ff7a6a', face: 'baoge' },
  '嬤': { name: '香腸阿嬤', col: '#ffcf8a', face: 'ama' },
  '許': { name: '許醫師', col: '#d9e2ea', face: 'hsu' },
  '呂': { name: '呂上校', col: '#c3d48f', face: 'lu' },
  '廣播': { name: '廣播', col: '#aab4c4', face: 'radio' }
};

/* ---------- 劇本 ---------- */
const S1_IN = [
  { s: 'phone' }, { sfx: 'phone' },
  { phone: { time: '23:41', title: '新訂單', rows: ['取餐｜路口手搖飲', '送達｜市立醫院 急診室', '珍珠奶茶 ×2（半糖少冰）'], note: '備註：哥，颱風天加你兩百，騎慢一點。', who: '顧客：魏子晴' } },
  '颱風「霧鯨」的外圍環流掃過台北。全市停班停課，街上只剩外送員。',
  '魏子葳本來要收工了。海軍陸戰隊退伍四年，跑外送三年，他很清楚——這種夜最好賺，也最容易死。',
  '下單的是他妹，魏子晴。市立醫院急診護理師，今晚值大夜。',
  ['葳', '……颱風天還喝冰的。'],
  '他按下接單。',
  ['廣播', '……另外，一艘停靠基隆港的貨輪「東昇十二號」，多名船員出現不明高燒，已送往市立醫院隔離觀察。衛生單位表示，目前沒有擴散風險……'],
  '雨太大，他把廣播關了。',
  { s: 'street' },
  '23:58，市民大道。一個赤腳的男人從車陣裡衝出來，白襯衫濕透，前襟是紅的。',
  '魏子葳急煞。機車在積水裡打滑，連人帶車摔進對向車道。',
  '他撐起身，看見那個男人趴在一個計程車司機身上。',
  '不是在救人。是在吃。',
  '司機還在尖叫。然後不叫了。然後，站了起來。',
  { s: 'station' },
  '他衝進最近的捷運站。樓梯口躺著一名員警，喉嚨被撕開，配槍還在槍套裡。',
  '他蹲下，拔槍，退出彈匣。十二發。手沒有抖——四年沒摸槍，身體還記得。',
  ['坤', '少年仔！這邊！'],
  '站務員阿坤，五十八歲，在這個站待了三十年。他身後的月台上，擠滿了等末班車的人。',
  ['坤', '末班車還有四分鐘！樓梯擋住，撐到車進站，大家就走得了！'],
  '樓梯上傳來腳步聲。很多，很亂。不像人在走路。',
  { card: { no: '第一章', title: '末班車', place: '捷運站 月台', time: '00:03', late: '已逾時 00:02' } }
];
const S1_OUT = [
  { s: 'train' },
  '月台門打開的瞬間，人群像洪水一樣湧進車廂。',
  '阿坤沒有上車。他站在月台上，左手按著右臂，制服袖子濕透——不是雨。',
  ['葳', '阿坤伯——'],
  ['坤', '我在這站三十年，每天看末班車開走。'],
  ['坤', '今天也一樣。'],
  '他按下關門鈕。玻璃門在兩人之間闔上。',
  '列車開動。魏子葳最後看見的，是阿坤轉過身，抓起滅火器，走向樓梯口。',
  { s: 'phone' }, { sfx: 'phone' },
  { phone: { time: '00:34', title: '外送中', rows: ['送達｜市立醫院 急診室', '預計送達 00:01'], note: '已逾時 00:33', who: '顧客：魏子晴', late: true } },
  '他打給子晴。沒通。再打。第三次，通了。',
  ['晴', '哥？你在哪？醫院這邊……這邊出事了……'],
  ['晴', '不要來。你聽到沒有？不要過來。'],
  '電話斷了。',
  ['葳', '……單都接了。']
];
const S2_IN = [
  { s: 'market' },
  '列車在下一站前斷電，停在隧道中間。乘客摸黑走出隧道口，外面是夜市。',
  '颱風夜，攤子都收了。只剩帆布和鐵皮在風裡拍打，一排紅燈籠還亮著。',
  '夜市旁的立體停車場，有人用貨櫃和鐵皮圍出一座堡壘。裡面有燈、有發電機、有食物。',
  '還有槍。',
  ['豹', '外送的？'],
  '說話的人赤膊，胸口刺著一隻豹。這一帶的角頭，大家叫他豹哥。手下十幾個，獵槍、開山刀都有。',
  ['豹', '我這裡不養閒人。要過夜、要借車去醫院，都可以。'],
  ['豹', '先下去籠子，給大家看一場。'],
  '籠子，是停車場一樓用鐵皮圍起來的空地。鐵皮外面，是整條夜市的屍群。',
  '二樓、三樓的車道上站滿了人。豹哥的手下、躲進來的攤商、抱著小孩的媽媽。有人押菸，有人押罐頭。',
  '人群裡，一個賣香腸的阿嬤沒有下注。她只是盯著他身上的外送外套，看了很久。',
  ['豹', '賭他撐幾分鐘。開門。'],
  { card: { no: '第二章', title: '籠子', place: '夜市 立體停車場', time: '01:14', late: '已逾時 01:13' } }
];
const S2_OUT = [
  { s: 'market' },
  '阿彪倒下的時候，整座停車場沒有一點聲音。',
  '然後有人開始拍手。一個、兩個、三十個。',
  '魏子葳抬頭。三樓車道上，豹哥的臉在燈籠底下一陣紅一陣白。',
  ['豹', '……你要什麼。'],
  ['葳', '車鑰匙。去醫院。'],
  '一串鑰匙從三樓丟下來。沒有人敢笑。',
  '賣香腸的阿嬤走下樓梯，把一盒霰彈塞進他的保溫箱。',
  ['嬤', '阮孫嘛是跑外送的。'],
  ['嬤', '伊今暗嘛有出去送。'],
  '她沒有再說下去。他也沒有問。',
  ['廣播', '……國防部緊急通告：明日清晨六點，基隆港西岸碼頭將開出最後一班撤離船，僅限未感染民眾登船。重複……'],
  '01:52。離最後一班船，還有四個小時。',
  '醫院在反方向。'
];
const S3_IN = [
  { s: 'hospital' },
  '市立醫院急診室的自動門卡在一半。一開，一關。一開，一關。',
  '地上的血被雨水沖淡，一路流進停車場的排水溝。',
  '整棟樓停電了。電梯、門禁、廣播，全死。',
  '他在護理站翻到今晚的班表——大夜，急診B區：魏子晴。',
  'B區的電子門鎖死了，要恢復供電才打得開。',
  '配電室的保險絲被人拔走了，三個。大概是有人想拆去接自己的發電機。',
  '他打開保溫箱看了一眼。兩杯珍奶都還在，冰塊早就化了。',
  ['葳', '三個保險絲。'],
  { card: { no: '第三章', title: '急診室', place: '市立醫院', time: '02:31', late: '已逾時 02:30' } }
];
const S3_OUT = [
  { s: 'er' },
  '急診B區的門滑開，裡面的人全舉起手邊的東西。點滴架、剪刀、滅火器。',
  '然後，有人放下了剪刀。',
  ['晴', '……哥？'],
  '她瘦了一圈，眼眶是黑的。護理服上有血，不知道是誰的。左前臂纏著繃帶。',
  ['葳', '你的珍奶。'],
  '他把兩杯奶茶放在護理站檯面上。封膜皺了，杯身全是水珠。',
  ['晴', '……都不冰了。'],
  ['葳', '颱風天，少冰。'],
  '她笑出來，笑到一半變成哭。他抱住她，她整個人在發抖。',
  ['葳', '手怎麼了？'],
  ['晴', '上禮拜被酒醉的病人抓的，縫了三針。醫暴啦，習慣了。'],
  ['晴', '等一下，我要按確認收貨，給你五星——'],
  '她的手機螢幕是黑的。沒電了。',
  ['晴', '……先欠著。到了安全的地方再給你。'],
  '許醫師走過來。急診主治，五十歲，眼鏡裂了一邊。',
  ['許', '救護車還能開，油是滿的。'],
  ['許', '走國道去基隆。現在就走。']
];
const S4_IN = [
  { s: 'highway' },
  '國道一號，汐止高架段。',
  '救護車在棄置的車陣裡熄火。水箱被一輛翻倒的貨車刺穿，白煙直冒。',
  ['許', '給我幾分鐘。我年輕時在修車廠打過工。'],
  '高架橋下，汐止的屍群聞到了引擎的熱，開始往交流道上爬。',
  '幾百公尺外有一座被放棄的國軍檢查哨。沙包、拒馬，一輛翻倒的軍卡。',
  ['晴', '哥，我跟你一起守。'],
  ['葳', '你顧醫生。'],
  '她沒有爭，只是把袖子又往下拉了一點。',
  { card: { no: '第四章', title: '國道', place: '國道一號 汐止高架', time: '03:48', late: '已逾時 03:47' } }
];
const S4_OUT = [
  { s: 'dawnroad' },
  '救護車重新發動的時候，天邊開始泛白。',
  '子晴縮在後車廂，靠著氧氣瓶，一直發抖。她把沒電的手機插上車上的充電座。',
  ['葳', '冷？'],
  ['晴', '淋了一整晚的雨，正常。'],
  '許醫師從急救包拿了兩顆退燒藥給她。他看了她的手臂一眼，什麼都沒說。',
  '救護車駛下國道。基隆到了。',
  '05:21。港口的探照燈，像一排不會眨的眼睛。'
];
const S5_IN = [
  { s: 'harbor' },
  '基隆港西岸碼頭。撤離船「海安輪」靠在岸邊，舷梯前排著上千人。',
  '軍方設了檢查站。每個人都要量體溫、看傷口。發燒的、有傷的，一律帶去旁邊的貨櫃區「觀察」。',
  '貨櫃區那邊，偶爾傳來槍響。一聲，然後安靜。',
  ['呂', '下一個。'],
  '輪到子晴。額溫槍亮起紅燈：38.9。',
  '兩名士兵同時舉起步槍。',
  ['許', '她是護理師！她只是淋了雨——'],
  ['呂', '袖子拉起來。'],
  '子晴沒有動。',
  '就在這時，碼頭另一端的圍欄倒了。',
  '屍群從貨櫃區湧出來。那些被帶去「觀察」的人，全都回來了。',
  ['呂', '守住舷梯！先讓船上的人走！'],
  ['葳', '子晴，跟緊我。'],
  { card: { no: '第五章', title: '最後一班船', place: '基隆港 西岸碼頭', time: '05:36', late: '已逾時 05:35' } }
];
const FINAL = [
  { s: 'pier' },
  '海安輪的汽笛響了。舷梯開始收起。',
  ['呂', '最後三十秒！'],
  '子晴站在舷梯下，沒有動。',
  ['葳', '子晴！'],
  '她拉起左手的袖子。繃帶底下不是縫線，是一圈清清楚楚的齒痕。',
  ['晴', '七床。'],
  ['晴', '停電的時候，隔離病房的門開了。我擋在門口，讓學妹先跑。'],
  ['晴', '上禮拜那個是騙你的。你會衝進來。你每次都會衝進來。'],
  ['許', '……我在國道上就知道了。她求我不要說。'],
  ['晴', '哥，你送到了。'],
  ['晴', '換我送你上船。'],
  { choice: [{ k: 'go', t: '上船', d: '她要你走。' }, { k: 'stay', t: '留下', d: '訂單拒收。' }] }
];
const END_GO = [
  { s: 'boat' },
  '許醫師和兩名士兵把他拖上舷梯。',
  '他最後看見的子晴，背對著船站在碼頭上，手裡握著一把信號槍。屍群從貨櫃之間湧出來。',
  '一道紅光升上基隆港灰白的天空。整片屍群轉過頭，朝那道光走去，離開了舷梯。',
  '海安輪駛出港口。',
  '06:02。碼頭邊的基地台還活著。他的手機震了一下。',
  { sfx: 'phone' },
  { phone: { time: '06:02', title: '您收到一則新評價', stars: 5, rows: ['訂單 #0923-2341｜珍珠奶茶 ×2'], note: '哥，送到了。這次換你不要回頭。', who: '顧客：魏子晴' } },
  '他沒有回頭。',
  '他一直看著手機，直到訊號消失。',
  { end: '最後一單　完' }
];
const END_STAY = [
  { s: 'pier' },
  '他沒有上船。',
  '他把保溫箱放在碼頭上，拿出最後一盒霰彈。子晴瞪著他，想罵人，最後笑了出來。',
  ['晴', '你每次都這樣。'],
  ['葳', '嗯。'],
  '海安輪駛出港口。碼頭上只剩兩個人，和一整座城市的死人。',
  { card: { no: '終章', title: '最後的碼頭', place: '基隆港 西岸碼頭', time: '06:04', late: '訂單狀態：拒收' } }
];
function endStayEpilogue(sec) {
  return [
    { s: 'pier' },
    '他們守住碼頭 ' + fmtTime(sec) + '。',
    '那天下午，外木山的漁民說，西岸碼頭的繫纜樁上坐著兩個人，分一杯不冰的奶茶。',
    '沒有人上前去確認。',
    { end: '最後一單　完' }
  ];
}

/* ---------- 第二章彈幕 ---------- */
const DM = {
  early: ['賭他一分鐘', '外送仔要被吃了', '我押兩包菸他撐不過', '豹哥這次太狠', '他是不是在發抖', '開賭開賭！', '這咖看起來很虛', '換下一個啦', '外送的也敢來', '押罐頭！押罐頭！'],
  mid: ['欸……他會打', '這動作是練過的', '棒子揮得好準', '我改押他活', '兩包菸還我', '陸戰隊的喔？', '真的假的', '這槍法……', '他沒在怕的', '誰押他的？'],
  late: ['殺神', '這什麼怪物', '豹哥臉都綠了', '外送之神', '我罐頭全押他', '加油！！！', '少年仔撐住', '阿彪是不是要出來了', '我兒子說他以後要跑外送', '籠子要被屍體塞滿了'],
  combo: ['連殺！！', '再來！', '太扯了', '這是人嗎', '外送仔！外送仔！'],
  boss: ['阿彪！！', '那是人嗎', '鐵鍊斷了！', '快跑啊外送仔', '打他背後！', '他要衝了！'],
  win: ['……', '贏了？', '他贏了！！！', '豹哥……', '跪了跪了', '開門讓他走！']
};
function cageDanmaku() { const k = G.kills; if (G.boss) return [pick(DM.boss), 'hot']; const pool = k < 35 ? DM.early : k < 110 ? DM.mid : DM.late; return [pick(pool), k >= 110 ? 'hot' : '']; }

/* ---------- 五章關卡腳本 ---------- */
const CHAPTERS = {
  1: {
    no: '第一章', title: '末班車', place: '捷運站 月台', build: buildStation, guns: ['pistol'], picks: 0, dark: 0.6, ambient: '8,10,20', rain: false, sound: 'indoor',
    skins: ['z_office', 'z_casual', 'z_elder', 'z_police', 'z_office'], start: [30, 17], hpMul: 1, lowLine: '還不能倒……珍奶還沒送到。', intro: S1_IN, outro: S1_OUT, deadLine: '末班車開走了。',
    init(g) { g.phase = 'hold'; g.hold = 200; g.spawn = { rate: 0.9, mix: { walker: 1 } }; setObj('撐到末班車進站', '', 0); say('坤', '撐住！車已經過上一站了！'); },
    update(g, dt) {
      const t = g.t;
      if (g.phase === 'hold') {
        const k = clamp(t / g.hold, 0, 1);
        g.obj.sub = '列車進站倒數 ' + fmtTime(g.hold - t); g.obj.prog = k;
        g.spawn.rate = lerp(0.9, 3.3, k);
        g.spawn.mix = t < 40 ? { walker: 1 } : t < 95 ? { walker: 0.8, runner: 0.2 } : t < 150 ? { walker: 0.64, runner: 0.22, bloater: 0.14 } : { walker: 0.58, runner: 0.2, bloater: 0.12, brute: 0.1 };
        once(g, 'r1', t >= 45, () => say('坤', '有人被咬了！被咬的……離大家遠一點！'));
        once(g, 'r2', t >= 82, () => say('葳', '……這幾隻會跑。'));
        once(g, 'h1', t >= 115, () => { horde(26, { walker: 0.75, runner: 0.25 }); say('坤', '樓梯上面！全部都是！'); });
        once(g, 'r3', t >= 160, () => say('坤', '車到了——不對，停在隧道口！'));
        once(g, 'h2', t >= 168, () => horde(30, { walker: 0.66, runner: 0.22, brute: 0.12 }));
        if (t >= g.hold) {
          g.phase = 'boss'; g.spawn.rate = 0.7; g.spawn.mix = { walker: 1 };
          say('坤', '列車長說隧道裡有東西……是警察！');
          const s = g.map.spawns[(Math.random() * 3) | 0];
          bossEnter('riotboss', s.x * T, (s.y - 1.6) * T, 1);
          setObj('擊倒 鎮暴隊長', '引牠衝撞柱子或牆壁', null);
        }
      } else if (g.phase === 'boss') {
        if (g.bossDead) { g.phase = 'train'; g.train = { x: g.map.pw + 30 }; g.trainT = 0; say('坤', '車進站了！上車！快上車！'); setObj('上車！', '跑到打開的車門', 1); g.spawn.rate = 1.4; g.spawn.mix = { walker: 0.7, runner: 0.3 }; Sound.play('siren'); }
      } else if (g.phase === 'train') {
        g.trainT += dt;
        const tgt = T * 1.5; g.train.x = lerp(g.train.x, tgt, Math.min(1, dt * 1.8)); if (Math.abs(g.train.x - tgt) < 1) g.train.x = tgt;
        if (g.trainT > 2.6) g.doorOpen = Math.min(1, (g.doorOpen || 0) + dt * 1.4);
        if (g.doorOpen >= 1 && !g.flags.doors) { g.flags.doors = 1; for (const d of g.map.doors) setBlock(g.map, d, 6, 2, 1, 0, 0); g.markers = g.map.doors.map(d => ({ x: (d + 1) * T, y: 6.6 * T })); }
        if (g.flags.doors) { const p = g.p; if (p.y < 7 * T - 1 && g.map.doors.some(d => p.x > d * T - 3 && p.x < (d + 2) * T + 3)) { g.markers = []; chapterClear(); } }
      }
    }
  },
  2: {
    no: '第二章', title: '籠子', place: '夜市 立體停車場', build: buildCage, guns: ['pistol'], picks: 2, dark: 0.56, ambient: '14,8,12', rain: true, sound: 'rain',
    skins: ['z_vendor', 'z_gang', 'z_casual', 'z_office', 'z_elder'], start: [22, 18], hpMul: 1.15, hazKind: 'drum', lowLine: '還不能倒……珍奶還沒送到。', intro: S2_IN, outro: S2_OUT, deadLine: '豹哥收走了所有的菸和罐頭。',
    init(g) {
      g.phase = 'w1'; g.spawn = { rate: 1.4, mix: { walker: 0.8, runner: 0.2 } }; setObj('活下去', '第一波', 0); say('豹', '開門！');
      g.dm = cageDanmaku; g.hype = 0.1; Sound.play('crowd');
      g.onCombo = () => { g.hype = Math.min(1, g.hype + 0.12); for (let i = 0; i < 3; i++) Danmaku.push(pick(DM.combo), 'hot'); Sound.play('crowd'); };
    },
    update(g) {
      const t = g.t, k = g.kills;
      g.hype = Math.max(g.hype, Math.min(1, 0.1 + k / 260));
      if (g.phase !== 'boss' && g.phase !== 'done') { g.obj.prog = Math.min(1, t / 275); g.obj.sub = (g.phase === 'w1' ? '第一波' : g.phase === 'w2' ? '第二波' : '第三波') + '｜觀眾 ' + (80 + Math.floor(g.hype * 120)) + ' 人'; }
      once(g, 'gun', k >= 55 || t >= 80, () => {
        say('嬤', '少年仔！接著！');
        const x = clamp(g.p.x + (g.p.x > g.map.pw / 2 ? -26 : 26), 3 * T, g.map.pw - 3 * T), y = clamp(g.p.y - 20, 8 * T, g.map.ph - 3 * T);
        const q = addPickup(x, y, 'shotgun', { fz: 90 }); g.markers = [q];
        for (const s of ['阿嬤！？', '那是豹哥的槍吧', '阿嬤帥喔', '豹哥臉黑了']) Danmaku.push(s, 'hot');
        Sound.play('crowd');
      });
      if (g.markers.length && !g.pickups.includes(g.markers[0])) g.markers = [];
      if (g.phase === 'w1') { g.spawn.rate = lerp(1.4, 2.6, clamp(t / 100, 0, 1)); if (t >= 100) { g.phase = 'w2'; say('豹', '開第二道門。'); g.spawn.mix = { walker: 0.55, runner: 0.27, bloater: 0.12, spitter: 0.06 }; } }
      else if (g.phase === 'w2') {
        g.spawn.rate = lerp(2.6, 3.4, clamp((t - 100) / 90, 0, 1));
        once(g, 'h1', t >= 150, () => { horde(30, { walker: 0.6, runner: 0.4 }); say('豹', '後面那批也放進去。'); });
        if (t >= 190) { g.phase = 'w3'; g.spawn.mix = { walker: 0.5, runner: 0.22, bloater: 0.1, riot: 0.1, brute: 0.08 }; say('豹', '……把穿制服的那幾隻也放進去。'); }
      } else if (g.phase === 'w3') {
        g.spawn.rate = lerp(3.2, 3.9, clamp((t - 190) / 80, 0, 1));
        once(g, 'h2', t >= 232, () => horde(34, { walker: 0.5, runner: 0.3, riot: 0.2 }));
        if (t >= 275) {
          g.phase = 'boss'; g.spawn.rate = 0.9; g.spawn.mix = { walker: 0.6, runner: 0.4 }; say('豹', '好。很好。');
          g.later.push({ t: 2.2, fn: () => { say('豹', '阿彪，出來打聲招呼。'); bossEnter('abiao', 22 * T, 31.4 * T, 1); setObj('擊倒 阿彪', '別被鐵鍊掃到；紅圈出現就閃', null); for (let i = 0; i < 5; i++) Danmaku.push(pick(DM.boss), 'hot'); } });
        }
      } else if (g.phase === 'boss') {
        if (g.bossDead) {
          g.phase = 'done'; g.hype = 1; g.spawn.rate = 0; Sound.play('crowd');
          for (let i = 0; i < 8; i++) g.later.push({ t: i * 0.25, fn: () => Danmaku.push(pick(DM.win), 'hot') });
          g.later.push({ t: 2.6, fn: chapterClear });
          for (const z of g.zs) if (!z.dead && !z.boss) { z.hp = 0; killZombie(z, { src: 'boom' }); }
        }
      }
    }
  },
  3: {
    no: '第三章', title: '急診室', place: '市立醫院', build: buildHospital, guns: ['pistol', 'shotgun'], picks: 3, dark: 0.84, ambient: '4,8,12', rain: false, sound: 'indoor',
    skins: ['z_nurse', 'z_patient', 'z_doctor', 'z_patient', 'z_office'], start: [21, 21.5], hpMul: 1.3, lowLine: '還不能倒……子晴還在裡面。', intro: S3_IN, outro: S3_OUT, deadLine: '急診B區的門，一直沒有打開。',
    init(g) {
      g.phase = 'fuse'; g.fuses = 0; g.spawn = { rate: 1.3, mix: { walker: 0.8, runner: 0.14, spitter: 0.06 } };
      setObj('找回保險絲', '0 / 3', 0); say('葳', '子晴，撐住。');
      const m = g.map;
      g.markers = ['A', 'D', 'H'].map(id => { const r = m.rooms.find(q => q.id === id); return addPickup((r.x + r.w / 2) * T, (r.y + r.h / 2) * T, 'fuse'); });
      g.onFuse = (k) => {
        g.fuses++; g.markers = g.markers.filter(q => q !== k);
        g.obj.sub = g.fuses + ' / 3'; g.obj.prog = g.fuses / 3;
        if (g.fuses === 1) { say('葳', '一個。'); horde(14, { walker: 0.7, runner: 0.3 }, { ring: true, title: '有東西被驚動了', sub: '走廊兩頭都有聲音' }); }
        else if (g.fuses === 2) { say('葳', '還差一個。'); horde(18, { walker: 0.6, runner: 0.3, spitter: 0.1 }, { ring: true, title: '整層樓都醒了', sub: '' }); }
        else { say('葳', '回配電室。'); g.phase = 'power'; setObj('回到配電室', '把保險絲裝回去', 1); g.markers = [{ x: m.powerPt.x, y: m.powerPt.y }]; }
      };
    },
    update(g) {
      const t = g.t, m = g.map, p = g.p;
      if (g.phase === 'fuse' || g.phase === 'power') { g.spawn.rate = lerp(1.3, 3.2, clamp(t / 200, 0, 1)); g.spawn.mix = t < 60 ? { walker: 0.8, runner: 0.14, spitter: 0.06 } : { walker: 0.6, runner: 0.2, spitter: 0.1, bloater: 0.06, brute: 0.04 }; }
      if (g.phase === 'power' && d2(p.x, p.y, m.powerPt.x, m.powerPt.y) < 30 * 30) {
        g.phase = 'powered'; g.power = true; g.dark = 0.52; g.markers = [];
        banner('供電恢復', 'B區的門開了——隔離病房的門也開了', 'gold'); Sound.play('siren');
        setBlock(m, m.isoDoor.x, m.isoDoor.y, 3, 1, 0, 0); g.isoOpen = true; g.ftx = -1; g.flowT = 0;
        g.later.push({ t: 1.6, fn: () => { say('葳', '……那是什麼聲音。'); bossEnter('bed7', m.isoPt.x, m.isoPt.y, 1); setObj('擊倒 七床', '紅色扇形是嘔吐，紅圈是牠要跳過來', null); g.spawn.rate = 1.2; } });
      }
      if (g.phase === 'powered' && g.bossDead && !g.flags.end) { g.flags.end = 1; g.spawn.rate = 0; g.later.push({ t: 2.2, fn: chapterClear }); }
    }
  },
  4: {
    no: '第四章', title: '國道', place: '國道一號 汐止高架', build: buildHighway, guns: ['pistol', 'shotgun'], picks: 4, dark: 0.72, ambient: '6,8,16', rain: true, sound: 'rain',
    skins: ['z_rain', 'z_worker', 'z_office', 'z_casual', 'z_soldier', 'z_rain'], start: [35.5, 16.4], hpMul: 1.55, hazKind: 'gas', lowLine: '還不能倒……子晴還在車上。', intro: S4_IN, outro: S4_OUT, deadLine: '救護車的警示燈，閃到天亮。',
    init(g) {
      g.phase = 'fix'; g.fix = 0; g.ambHp = g.ambMax = 1300; g.objPt = g.map.ambPt; g.objR = 30; g.objBias = 0.33;
      g.objHitFn = (z) => { g.ambHp -= z.dmg; if (g.ambHp <= 0 && g.state === 'play') { g.deadLine = '救護車被屍群淹沒了。'; playerDie(); } };
      g.spawn = { rate: 1.6, mix: { walker: 0.7, runner: 0.2, spitter: 0.1 } };
      setObj('守住救護車', '修理 0%', 0); say('許', '水箱先補！守住車子！');
    },
    update(g, dt) {
      const t = g.t;
      if (g.phase === 'fix') {
        let near = 0; for (const z of g.zs) if (!z.dead && d2(z.x, z.y, g.objPt.x, g.objPt.y) < 42 * 42) near++;
        g.fix = Math.min(1, g.fix + dt / 185 * (near > 2 ? 0.35 : 1));
        g.obj.sub = '修理 ' + Math.floor(g.fix * 100) + '%｜車體 ' + Math.max(0, Math.ceil(g.ambHp / g.ambMax * 100)) + '%'; g.obj.prog = g.fix;
        g.spawn.rate = lerp(1.6, 3.8, g.fix);
        g.spawn.mix = g.fix < 0.3 ? { walker: 0.7, runner: 0.2, spitter: 0.1 } : g.fix < 0.6 ? { walker: 0.55, runner: 0.22, spitter: 0.1, bloater: 0.08, brute: 0.05 } : { walker: 0.48, runner: 0.22, spitter: 0.1, bloater: 0.08, brute: 0.07, riot: 0.05 };
        once(g, 'h0', t >= 35, () => horde(22, { walker: 0.8, runner: 0.2 }));
        once(g, 'crate', t >= 55, () => { say('葳', '檢查哨那邊有東西。'); const q = addPickup(g.map.crateAt.x, g.map.crateAt.y, 'rifle'); g.markers = [q]; banner('國軍檢查哨', '右上角有一箱補給', 'amber'); });
        if (g.markers.length && !g.pickups.includes(g.markers[0])) { g.markers = []; if (!g.flags.t91) { g.flags.t91 = 1; say('葳', 'T91。……好久不見。'); } }
        once(g, 'f50', g.fix >= 0.5, () => { say('許', '水箱好了！換電瓶！'); horde(30, { walker: 0.6, runner: 0.3, brute: 0.1 }); });
        once(g, 'f80', g.fix >= 0.8, () => { say('許', '再撐一下！'); horde(34, { walker: 0.55, runner: 0.3, bloater: 0.15 }); });
        if (g.fix >= 1) {
          g.phase = 'boss'; g.objBias = 0; g.spawn.rate = 1; say('許', '好了！上車——');
          g.later.push({ t: 1.3, fn: () => { say('晴', '哥！後面！'); bossEnter('giant', 3 * T, 14 * T, 1); setObj('擊倒 巨人', '牠會把車丟過來，看紅圈閃開', null); } });
        }
      } else if (g.phase === 'boss' && g.bossDead && !g.flags.end) { g.flags.end = 1; g.spawn.rate = 0; g.later.push({ t: 2, fn: chapterClear }); }
    }
  },
  5: {
    no: '第五章', title: '最後一班船', place: '基隆港 西岸碼頭', build: () => buildHarbor(false), guns: ['pistol', 'shotgun', 'rifle'], picks: 5, dark: 0.38, ambient: '22,14,26', rain: false, sound: 'dawn',
    skins: ['z_worker', 'z_soldier', 'z_office', 'z_casual', 'z_elder', 'z_sailor'], start: [35.5, 11.5], hpMul: 1.8, hazKind: 'drum', lowLine: '還不能倒……船還沒開。', intro: S5_IN, outro: null, deadLine: '海安輪的汽笛響了。他沒有聽見。',
    init(g) {
      g.phase = 'board'; g.board = 0; g.objPt = g.map.gang; g.objR = 24; g.objBias = 0.3; g.objHitFn = () => { };
      g.spawn = { rate: 2, mix: { walker: 0.7, runner: 0.2, spitter: 0.1 } }; g.soldierT = 0; g.evT = 0;
      setObj('守住舷梯', '登船 0 / 1200', 0); say('呂', '舷梯守住！能上船的全部上船！');
    },
    update(g, dt) {
      const t = g.t, m = g.map;
      g.soldierT -= dt;
      if (g.soldierT <= 0 && g.phase !== 'done') {
        g.soldierT = 0.32; let best = null, bd = 130 * 130;
        for (const z of g.zs) { if (z.dead || z.boss) continue; const d = d2(z.x, z.y, m.gang.x, m.gang.y); if (d < bd) { bd = d; best = z; } }
        if (best) { g.tracers.push({ x1: rand(22, 50) * T, y1: 0.8 * T, x2: best.x, y2: best.y - best.hh, t: 0.07 }); hitZombie(best, 24, { src: 'ally', kx: 0, ky: 50 }); Sound.play('rifle'); }
      }
      for (let i = m.evac.length - 1; i >= 0; i--) { const e = m.evac[i]; e.x += (35.5 * T - e.x) * dt * 2; e.y -= 34 * dt; if (e.y < 2.2 * T) m.evac.splice(i, 1); }
      if (g.phase === 'board') {
        let near = 0; for (const z of g.zs) if (!z.dead && d2(z.x, z.y, m.gang.x, m.gang.y) < 44 * 44) near++;
        const f = Math.max(0.1, 1 - near * 0.25);
        g.board = Math.min(1200, g.board + 1200 / 225 * f * dt);
        g.obj.sub = '登船 ' + Math.floor(g.board) + ' / 1200' + (near > 1 ? '｜舷梯被堵住了！' : ''); g.obj.prog = g.board / 1200;
        g.evT -= dt; if (g.evT <= 0) { g.evT = 0.3 / f; m.evac.push({ x: m.gang.x + rand(-10, 10), y: m.gang.y + rand(14, 26), c: pick(['#c8322b', '#2e6db5', '#e0b020', '#e8e3d8', '#2f8a5a', '#ff7a1a']) }); }
        g.spawn.rate = lerp(2, 4.6, g.board / 1200);
        g.spawn.mix = g.board < 400 ? { walker: 0.7, runner: 0.2, spitter: 0.1 } : g.board < 800 ? { walker: 0.55, runner: 0.23, spitter: 0.08, bloater: 0.08, brute: 0.06 } : { walker: 0.47, runner: 0.23, spitter: 0.08, bloater: 0.08, brute: 0.07, riot: 0.07 };
        once(g, 'h1', t >= 50, () => horde(34, { walker: 0.6, runner: 0.3, bloater: 0.1 }));
        once(g, 'hatch', t >= 90, () => { say('呂', '東昇十二號的艙門開了！'); banner('東昇十二號', '艙門裡的船員全出來了', 'red'); g.hatchOn = true; });
        if (g.hatchOn) { g.hatchT = (g.hatchT || 0) - dt; if (g.hatchT <= 0) { g.hatchT = 1.1; spawnZombie('walker', { pos: [m.hatch.x * T + rand(-10, 10), m.hatch.y * T + rand(0, 6)], skin: 'z_sailor' }); } }
        once(g, 'm50', g.board >= 600, () => { say('晴', '哥，左邊！'); horde(40, { walker: 0.55, runner: 0.3, brute: 0.15 }); });
        once(g, 'm80', g.board >= 960, () => { say('呂', '最後一批！'); horde(44, { walker: 0.5, runner: 0.3, riot: 0.1, bloater: 0.1 }); });
        if (g.board >= 1200) {
          g.phase = 'boss'; g.spawn.rate = 1.2; g.objBias = 0; g.hatchOn = false; say('呂', '那是什麼東西……');
          g.later.push({ t: 1.6, fn: () => { bossEnter('captain', m.hatch.x * T, (m.hatch.y + 1.8) * T, 1); setObj('擊倒 船長', '扇形紅區是錨鍊橫掃，拉開距離', null); } });
        }
      } else if (g.phase === 'boss' && g.bossDead && !g.flags.end) { g.flags.end = 1; g.phase = 'done'; g.spawn.rate = 0; g.later.push({ t: 2.2, fn: chapterClear }); }
    }
  },
  E: {
    no: '終章', title: '最後的碼頭', place: '基隆港 西岸碼頭', build: () => buildHarbor(true), guns: ['pistol', 'shotgun', 'rifle'], picks: 3, dark: 0.34, ambient: '26,18,26', rain: false, sound: 'dawn', endless: true,
    skins: ['z_worker', 'z_soldier', 'z_office', 'z_casual', 'z_elder', 'z_sailor'], start: [35.5, 12], hpMul: 1.4, hazKind: 'drum', lowLine: '……還沒完。', intro: null, outro: null, deadLine: '',
    init(g) {
      g.phase = 'endless'; g.spawn = { rate: 2, mix: { walker: 0.8, runner: 0.2 } }; setObj('守住碼頭', '', null);
      g.allies.push({ x: g.p.x - 16, y: g.p.y + 6, r: 5, face: 1, an: 0, cd: 1, spr: charSprite('ally', ['ally']), aim: 0 });
      g.nextBoss = 150; g.bossIdx = 0; g.lastHorde = 0; say('晴', '你每次都這樣。');
    },
    update(g) {
      const t = g.t;
      g.obj.sub = '撐過 ' + fmtTime(t) + '｜最佳 ' + fmtTime(Math.max(Save.d.endless, 0));
      g.hpMul = 1.4 + t / 110; g.dmgMul = 1 + t / 420; g.spawn.rate = Math.min(9, 2 + t / 28);
      g.spawn.mix = t < 60 ? { walker: 0.8, runner: 0.2 } : t < 180 ? { walker: 0.6, runner: 0.22, bloater: 0.08, spitter: 0.1 } : { walker: 0.5, runner: 0.22, bloater: 0.08, spitter: 0.08, brute: 0.07, riot: 0.05 };
      if (t >= g.nextBoss && !g.boss) { g.nextBoss = t + 150; const ks = ['riotboss', 'abiao', 'bed7', 'giant', 'captain'], k = ks[g.bossIdx % 5]; g.bossIdx++; const pos = spawnPos(true) || [g.p.x + 120, g.p.y]; bossEnter(k, pos[0], pos[1], 0.75 + t / 300); }
      if (t - g.lastHorde > 45) { g.lastHorde = t; horde(18 + Math.floor(t / 20), { walker: 0.6, runner: 0.3, brute: 0.1 }); }
      if (t > Save.d.endless && ((t | 0) % 10 === 0)) { Save.d.endless = Math.floor(t); }
    }
  }
};

/* ---------- 過場畫面（程式繪製的像素插圖） ---------- */
const Scene = {
  cv: null, ctx: null, w: 200, h: 120, id: null, st: null, t: 0, rain: [], flash: 0, lt: 6, amb: null,
  resize() {
    const cw = innerWidth, ch = innerHeight;
    let s = Math.sqrt(cw * ch / 64000); s = Math.min(s, Math.min(cw, ch) / 150); s = Math.max(1, s);
    this.w = Math.round(cw / s); this.h = Math.round(ch / s);
    this.cv.width = this.w; this.cv.height = this.h; this.ctx.imageSmoothingEnabled = false;
    this.rain = []; for (let i = 0; i < this.w * this.h / 700; i++) this.rain.push({ x: rand(-30, this.w), y: rand(this.h), v: rand(200, 300), l: randi(3, 6) });
    if (this.id) this.build();
  },
  set(id) { const a = SCENES[id].amb; if (a !== this.amb) { this.amb = a; Sound.startAmb(a); } if (this.id === id && this.st) return; this.id = id; this.t = 0; this.build(); },
  build() { this.st = mkCanvas(this.w, this.h); const x = this.st.getContext('2d'); x.imageSmoothingEnabled = false; SCENES[this.id].draw(x, this.w, this.h, seeded(this.id.length * 977 + 13)); },
  frame(dt) {
    if (!this.st) return;
    this.t += dt;
    const c = this.ctx, w = this.w, h = this.h, S = SCENES[this.id];
    c.drawImage(this.st, 0, 0);
    if (S.anim) S.anim(c, w, h, this.t);
    if (S.rain) {
      c.fillStyle = 'rgba(175,200,235,0.3)';
      for (const d of this.rain) { d.y += d.v * dt; d.x += d.v * 0.22 * dt; if (d.y > h + 6) { d.y = rand(-20, -4); d.x = rand(-40, w); } for (let k = 0; k < d.l; k++) c.fillRect(Math.round(d.x - k * 0.22), Math.round(d.y - k), 1, 1); }
      this.lt -= dt; if (this.lt <= 0) { this.lt = rand(7, 16); this.flash = 1; setTimeout(() => Sound.play('thunder'), rand(300, 1100)); }
    }
    if (this.flash > 0) { c.fillStyle = `rgba(210,225,255,${(this.flash * 0.35).toFixed(3)})`; c.fillRect(0, 0, w, h); this.flash = Math.max(0, this.flash - dt * 3); }
  }
};
function hz(w, h) { return Math.round(h * (w < h ? 0.5 : 0.62)); }
function vgrad(x, y0, y1, w, a, b) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, y0, w, y1 - y0); }
function skyline(x, w, base, rnd, col, hmin, hmax, wins, wp, signs) {
  let px = -((rnd() * 12) | 0);
  while (px < w) {
    const bw = 6 + ((rnd() * 20) | 0), bh = hmin + ((rnd() * (hmax - hmin)) | 0);
    R(x, col, px, base - bh, bw, bh + 1);
    if (wp) for (let yy = base - bh + 3; yy < base - 2; yy += 4) for (let xx = px + 2; xx < px + bw - 2; xx += 3) if (rnd() < wp) R(x, wins[(rnd() * wins.length) | 0], xx, yy, 1, 2);
    if (signs && rnd() < 0.45) { const sc = signs[(rnd() * signs.length) | 0], sy = base - bh + 4 + ((rnd() * bh * 0.5) | 0); R(x, sc, px + 1, sy, 2, Math.min(12, (bh * 0.4) | 0)); signs.out && signs.out.push([px + 2, sy, sc]); }
    px += bw + ((rnd() * 3) | 0);
  }
}
function glowAdd(x, cx, cy, r, rgb, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over'; }
function spr(x, img, cx, by, sc, flip) { const w = img.width * sc, h = img.height * sc; x.save(); x.imageSmoothingEnabled = false; if (flip) { x.translate(cx + w / 2, by - h); x.scale(-1, 1); x.drawImage(img, 0, 0, w, h); } else x.drawImage(img, Math.round(cx - w / 2), Math.round(by - h), w, h); x.restore(); }
function cityNight(x, w, h, rnd, opt) {
  opt = opt || {}; const hy = hz(w, h);
  vgrad(x, 0, hy, w, opt.top || '#070b14', opt.bot || '#1b2233');
  skyline(x, w, hy - 6, rnd, '#0e1320', (hy * 0.25) | 0, (hy * 0.7) | 0, ['#ffd88a', '#9fd0ff', '#ffb45a'], 0.07);
  const signs = ['#ff5a5a', '#5fe0e6', '#ffb347', '#8fdc6a', '#ff7ad9']; signs.out = [];
  skyline(x, w, hy, rnd, '#131a28', (hy * 0.18) | 0, (hy * 0.5) | 0, ['#ffd88a', '#fff1c8'], 0.05, signs);
  vgrad(x, hy, h, w, '#0d1016', '#07090c');
  for (const [sx, sy, sc] of signs.out) { glowAdd(x, sx, sy + 4, 14, hexRGB(sc).join(','), 0.35); for (let yy = hy + 2; yy < h; yy += 2) if (rnd() < 0.55) { x.globalAlpha = 0.25 * (1 - (yy - hy) / (h - hy)); R(x, sc, sx + ((rnd() * 3) | 0) - 1, yy, 2, 1); } x.globalAlpha = 1; }
  for (let yy = hy + 4; yy < h; yy += 5 + ((yy - hy) / 6 | 0)) R(x, 'rgba(60,70,90,0.35)', 0, yy, w, 1);
  return hy;
}
function lamp(x, lx, base, hgt) { R(x, '#1b2029', lx, base - hgt, 2, hgt); R(x, '#1b2029', lx, base - hgt, 8, 2); R(x, '#fff1c8', lx + 5, base - hgt + 2, 3, 1); glowAdd(x, lx + 6, base - hgt + 6, hgt * 0.7, '255,180,90', 0.28); }
const SCENES = {
  phone: { rain: true, amb: 'rain', draw(x, w, h, rnd) { cityNight(x, w, h, rnd); x.fillStyle = 'rgba(5,7,12,0.45)'; x.fillRect(0, 0, w, h); } },
  title: {
    rain: true, amb: 'rain',
    draw(x, w, h, rnd) {
      const hy = cityNight(x, w, h, rnd); lamp(x, (w * 0.18) | 0, hy + 6, (h * 0.32) | 0); lamp(x, (w * 0.82) | 0, hy + 6, (h * 0.3) | 0);
      const sc = Math.max(2, Math.round(Math.min(w, h) / 70)), by = Math.round(hy + (h - hy) * (w < h ? 0.16 : 0.42));
      glowAdd(x, w / 2 - 4 * sc, by - 11 * sc, 16 * sc, '255,170,60', 0.25);
      x.fillStyle = 'rgba(0,0,0,0.5)'; ovalFill(x, w / 2, by, 8 * sc, 2 * sc);
      spr(x, PSPR.fr[0].n, w / 2, by + sc, sc);
      for (let i = 0; i < 4; i++) { const zx = rand(w * 0.05, w * 0.95), zb = hy + rand(4, 14); if (Math.abs(zx - w / 2) < w * 0.15) continue; x.globalAlpha = 0.55; spr(x, tintC(charSprite('walker', ['z_office']).fr[i & 1].n, '#05070b', 0.8), zx, zb, 1, zx > w / 2); x.globalAlpha = 1; }
    },
    anim(c, w, h, t) { const hy = hz(w, h), sc = Math.max(2, Math.round(Math.min(w, h) / 70)), by = Math.round(hy + (h - hy) * (w < h ? 0.16 : 0.42)); const a = 0.12 + Math.sin(t * 2) * 0.05; glowAdd(c, w / 2 - 4 * sc, by - 11 * sc, 12 * sc, '255,170,60', a); }
  },
  street: {
    rain: true, amb: 'rain',
    draw(x, w, h, rnd) {
      const hy = cityNight(x, w, h, rnd, { top: '#0a0b12', bot: '#26161c' }); lamp(x, (w * 0.12) | 0, hy + 6, (h * 0.3) | 0);
      const sc = Math.max(1, Math.round(Math.min(w, h) / 90)), gy = Math.round(hy + (h - hy) * 0.38);
      const taxi = PROP.car('#e0b020', true); spr(x, taxi, w * 0.66, gy + 6 * sc, sc * 1.2);
      const sco = corpseC(PROP.scooter('#2e6db5')); spr(x, sco, w * 0.26, gy + 10 * sc, sc);
      for (let i = 0; i < 60; i++) R(x, pick(BLOODC), w * 0.62 + rand(-16, 16) * sc, gy + rand(2, 10) * sc, 2, 1);
      const vic = charSprite('walker', ['z_casual']).corpse; spr(x, vic, w * 0.58, gy + 9 * sc, sc);
      const zz = charSprite('walker', ['z_office']); spr(x, zz.fr[0].n, w * 0.55, gy + 7 * sc, sc * 1.4, true);
      spr(x, charSprite('walker', ['z_worker']).fr[1].n, w * 0.84, gy + 5 * sc, sc * 1.2, true);
      glowAdd(x, w * 0.66, gy, 40 * sc, '255,60,40', 0.18);
    },
    anim(c, w, h, t) { const hy = hz(w, h), gy = Math.round(hy + (h - hy) * 0.38); if (((t * 3) | 0) % 2) glowAdd(c, w * 0.72, gy - 6, 30, '255,190,80', 0.2); }
  },
  station: {
    rain: false, amb: 'indoor',
    draw(x, w, h, rnd) {
      const hy = hz(w, h);
      R(x, '#14171d', 0, 0, w, h * 0.16); for (let i = 0; i < 3; i++) R(x, '#e8f0ff', w * (0.15 + i * 0.3), h * 0.12, w * 0.16, 2);
      R(x, '#cfd3d8', 0, h * 0.16, w, hy - h * 0.16);
      for (let yy = h * 0.16; yy < hy; yy += 8) R(x, '#bfc4ca', 0, yy | 0, w, 1); for (let xx = 0; xx < w; xx += 12) R(x, '#c4c9cf', xx, h * 0.16, 1, hy - h * 0.16);
      R(x, '#2e6db5', 0, hy - h * 0.14, w, Math.max(3, h * 0.03)); R(x, '#8fb6e8', 0, hy - h * 0.14, w, 1);
      R(x, '#1d3f6e', w * 0.3, h * 0.2, w * 0.4, h * 0.07); R(x, '#f2f2ee', w * 0.34, h * 0.225, w * 0.12, 2); R(x, '#ffcf5a', w * 0.52, h * 0.225, w * 0.12, 2);
      R(x, '#5d626d', 0, hy, w, h - hy); dots(x, 0, hy, w, h - hy, ['#6c717c', '#52565f', '#4d5159'], 0.08, rnd);
      R(x, '#c9a22a', 0, hy + 2, w, 3);
      const sc = Math.max(1, Math.round(Math.min(w, h) / 110));
      for (let i = 0; i < 18; i++) { const cx = rand(0, w), c = PROP.crowd(pick(['#c8322b', '#2e6db5', '#e8e3d8', '#2f8a5a', '#1b1b1b', '#e0b020']), rnd() < 0.2); spr(x, c, cx, hy + rand(8, 20) * sc, sc * 1.5); }
      R(x, '#aeb4bc', w * 0.02, h * 0.16, w * 0.1, h); R(x, '#cfd3d8', w * 0.04, h * 0.16, w * 0.07, h); R(x, '#2e6db5', w * 0.02, hy - 4, w * 0.1, 3);
      R(x, '#aeb4bc', w * 0.88, h * 0.16, w * 0.1, h); R(x, '#cfd3d8', w * 0.9, h * 0.16, w * 0.07, h); R(x, '#2e6db5', w * 0.88, hy - 4, w * 0.1, 3);
      const cop = charSprite('walker', ['z_police']).corpse; spr(x, cop, w * 0.3, h * 0.9, sc * 2); for (let i = 0; i < 40; i++) R(x, pick(BLOODC), w * 0.3 + rand(-20, 20) * sc, h * 0.9 + rand(-4, 4) * sc, 2, 1);
    },
    anim(c, w, h, t) { const on = Math.sin(t * 5) > 0.2; if (on) glowAdd(c, w * 0.5, h * 0.18, w * 0.4, '255,40,30', 0.18); if (Math.random() < 0.04) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, w, h); } }
  },
  train: {
    rain: false, amb: 'indoor',
    draw(x, w, h) {
      R(x, '#0b0e14', 0, 0, w, h);
      R(x, '#1a1f2a', 0, h * 0.62, w, h * 0.38); R(x, '#23344f', w * 0.05, h * 0.7, w * 0.9, h * 0.08); R(x, '#2e4a70', w * 0.05, h * 0.7, w * 0.9, 2);
      for (const px of [0.08, 0.5, 0.92]) R(x, '#9aa0a8', w * px, 0, 2, h * 0.7);
      R(x, '#9aa0a8', 0, h * 0.06, w, 2);
      for (let i = 0; i < 7; i++) { const px = w * (0.12 + i * 0.13); R(x, '#9aa0a8', px, h * 0.06, 1, 6); R(x, '#d9dee6', px - 2, h * 0.06 + 6, 5, 4); }
    },
    anim(c, w, h, t) {
      const x0 = w * 0.1, y0 = h * 0.14, ww = w * 0.8, hh = h * 0.42, off = Math.min(ww * 0.6, t * t * 3);
      c.save(); c.beginPath(); c.rect(x0, y0, ww, hh); c.clip();
      R(c, '#cfd3d8', x0, y0, ww, hh * 0.62); R(c, '#2e6db5', x0, y0 + hh * 0.5, ww, 3); R(c, '#5d626d', x0, y0 + hh * 0.62, ww, hh * 0.38); R(c, '#c9a22a', x0, y0 + hh * 0.62, ww, 2);
      const sc = Math.max(1, Math.round(Math.min(w, h) / 100)), base = y0 + hh * 0.96;
      spr(c, PROP.crowd('#2f5d8c', false), x0 + ww * 0.45 - off, base, sc * 2.2);
      R(c, '#c8322b', x0 + ww * 0.45 - off + 3 * sc, base - 14 * sc, 3 * sc, 7 * sc);
      for (let i = 0; i < 4; i++) spr(c, charSprite('walker', ['z_office', 'z_casual', 'z_police', 'z_elder'].slice(i, i + 1)).fr[((t * 3 + i) | 0) & 1].n, x0 + ww * (0.72 + i * 0.09) - off, base, sc * 2, true);
      c.fillStyle = 'rgba(160,200,230,0.12)'; c.fillRect(x0, y0, ww, hh);
      for (let i = 0; i < 5; i++) R(c, 'rgba(255,255,255,0.08)', x0 + ((i * 53 + t * 20) % ww), y0, 3, hh);
      c.restore();
      R(c, '#2a3140', x0 - 3, y0 - 3, ww + 6, 3); R(c, '#2a3140', x0 - 3, y0 + hh, ww + 6, 3); R(c, '#2a3140', x0 - 3, y0, 3, hh); R(c, '#2a3140', x0 + ww, y0, 3, hh);
    }
  },
  market: {
    rain: true, amb: 'rain',
    draw(x, w, h, rnd) {
      const hy = hz(w, h);
      vgrad(x, 0, hy, w, '#08070d', '#21121a');
      R(x, '#3a3d44', w * 0.6, h * 0.12, w * 0.4, hy - h * 0.12 + 4);
      for (let i = 0; i < 4; i++) { const ly = h * 0.12 + i * (hy - h * 0.12) / 4; R(x, '#8e949c', w * 0.6, ly | 0, w * 0.4, 2); for (let k = 0; k < 10; k++) spr(x, PROP.crowd(pick(['#c8322b', '#2e6db5', '#e0b020', '#e8e3d8', '#1b1b1b']), rnd() < 0.3), w * 0.62 + rnd() * w * 0.36, ly + 1, 1); }
      for (let i = 0; i < 6; i++) { const sx = w * (0.02 + i * 0.1), col = pick(['#b8322b', '#2e5a9a', '#c89a2a', '#2f7a4a']); x.fillStyle = col; x.beginPath(); x.moveTo(sx, hy - 20); x.lineTo(sx + w * 0.09, hy - 20); x.lineTo(sx + w * 0.045, hy - 30); x.fill(); R(x, '#1b1d22', sx + 1, hy - 20, 1, 20); R(x, '#1b1d22', sx + w * 0.085, hy - 20, 1, 20); R(x, '#2a2420', sx, hy - 8, w * 0.09, 8); }
      vgrad(x, hy, h, w, '#1a1014', '#0a0709');
      for (let i = 0; i < 40; i++) { x.globalAlpha = 0.3; R(x, '#e0402c', rnd() * w, hy + rnd() * (h - hy), randi(2, 6), 1); x.globalAlpha = 1; }
    },
    anim(c, w, h, t) {
      for (let s = 0; s < 3; s++) {
        const y0 = h * (0.08 + s * 0.08);
        for (let i = 0; i <= 12; i++) {
          const k = i / 12, lx = k * w, ly = y0 + Math.sin(k * Math.PI) * h * 0.06 + Math.sin(t * 2 + i + s) * 1.2;
          R(c, OUTLINE, lx - 2, ly, 5, 6); R(c, '#e0402c', lx - 1, ly + 1, 3, 4); glowAdd(c, lx, ly + 3, 10, '255,80,50', 0.22);
        }
      }
    }
  },
  hospital: {
    rain: true, amb: 'rain',
    draw(x, w, h, rnd) {
      const hy = hz(w, h);
      vgrad(x, 0, hy, w, '#070a10', '#161c26');
      R(x, '#8a8f95', w * 0.1, h * 0.1, w * 0.8, hy - h * 0.1); R(x, '#9ea3a8', w * 0.1, h * 0.1, w * 0.8, 3);
      for (let yy = h * 0.14; yy < hy - 20; yy += 9) for (let xx = w * 0.13; xx < w * 0.87; xx += 8) R(x, rnd() < 0.08 ? '#ffe9b0' : '#1b2330', xx, yy, 5, 5);
      R(x, '#5d6470', w * 0.25, hy - 16, w * 0.5, 4); R(x, '#141820', w * 0.35, hy - 12, w * 0.3, 12);
      vgrad(x, hy, h, w, '#0e1116', '#07080b');
      spr(x, PROP.ambulance(), w * 0.2, hy + (h - hy) * 0.3, Math.max(1, Math.round(Math.min(w, h) / 120)));
      for (let i = 0; i < 80; i++) { x.globalAlpha = 0.6; R(x, pick(BLOODC), w * 0.5 + rand(-6, 6) + (i / 80) * w * 0.3, hy + (i / 80) * (h - hy), 2, 1); } x.globalAlpha = 1;
    },
    anim(c, w, h, t) {
      const hy = hz(w, h);
      R(c, '#c8322b', w * 0.4, hy - 26, w * 0.2, 8); for (let i = 0; i < 3; i++) R(c, '#fff4ea', w * 0.43 + i * w * 0.05, hy - 24, 4, 4);
      glowAdd(c, w * 0.5, hy - 22, 40, '255,50,40', 0.3 + Math.sin(t * 3) * 0.05);
      const gap = Math.abs(Math.sin(t * 1.3)) * w * 0.12; R(c, '#9fb3c4', w * 0.35, hy - 12, w * 0.15 - gap / 2, 12); R(c, '#9fb3c4', w * 0.5 + gap / 2, hy - 12, w * 0.15 - gap / 2, 12);
    }
  },
  er: {
    rain: false, amb: 'indoor',
    draw(x, w, h) {
      const vx = w / 2, vy = h * 0.36;
      R(x, '#1c2026', 0, 0, w, h);
      x.fillStyle = '#b8c0bc'; x.beginPath(); x.moveTo(0, h); x.lineTo(w, h); x.lineTo(vx + w * 0.08, vy); x.lineTo(vx - w * 0.08, vy); x.fill();
      x.fillStyle = '#d8dcd8'; x.beginPath(); x.moveTo(0, 0); x.lineTo(vx - w * 0.08, vy - h * 0.12); x.lineTo(vx - w * 0.08, vy); x.lineTo(0, h); x.fill();
      x.beginPath(); x.moveTo(w, 0); x.lineTo(vx + w * 0.08, vy - h * 0.12); x.lineTo(vx + w * 0.08, vy); x.lineTo(w, h); x.fill();
      R(x, '#2a3038', vx - w * 0.08, vy - h * 0.12, w * 0.16, h * 0.12);
      x.strokeStyle = '#3f9a5a'; x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.4, h); x.lineTo(vx - 2, vy); x.stroke();
      x.strokeStyle = '#c8453c'; x.beginPath(); x.moveTo(w * 0.62, h); x.lineTo(vx + 2, vy); x.stroke();
      x.fillStyle = 'rgba(160,200,170,0.6)'; x.beginPath(); x.moveTo(w * 0.02, h * 0.1); x.lineTo(w * 0.22, h * 0.26); x.lineTo(w * 0.22, h * 0.62); x.lineTo(w * 0.02, h * 0.85); x.fill();
      for (let i = 0; i < 90; i++) { x.globalAlpha = 0.7; R(x, pick(BLOODC), lerp(w * 0.55, vx, i / 90) + rand(-3, 3), lerp(h * 0.95, vy, i / 90), 2, 1); } x.globalAlpha = 1;
      R(x, '#e2dfd6', 0, h * 0.8, w, h * 0.05); R(x, '#b8b3a6', 0, h * 0.85, w, h * 0.15);
      const sc = Math.max(2, Math.round(Math.min(w, h) / 60));
      const cup = (cx) => { const cw = 6 * sc, ch = 10 * sc, bx = Math.round(cx - cw / 2), by = Math.round(h * 0.8 - ch + sc); R(x, OUTLINE, bx - sc, by - sc, cw + 2 * sc, ch + sc); R(x, 'rgba(230,240,245,0.55)', bx, by, cw, ch); R(x, '#b87a4a', bx + sc * 0.5, by + 2 * sc, cw - sc, ch - 2.5 * sc); for (let i = 0; i < 6; i++) R(x, '#1a1210', bx + sc + (i % 3) * 1.5 * sc, by + ch - 2.5 * sc - ((i / 3) | 0) * sc, sc, sc); R(x, '#f2f2ee', bx - sc * 0.5, by - sc, cw + sc, sc); for (let i = 0; i < 4; i++) R(x, 'rgba(255,255,255,0.7)', bx + rand(0, cw), by + rand(0, ch), 1, 1); };
      cup(w * 0.44); cup(w * 0.56);
    },
    anim(c, w, h, t) { for (let i = 0; i < 3; i++) { const on = Math.sin(t * (3 + i) + i * 2) > -0.6 || Math.random() < 0.1; if (on) { R(c, '#eef6ff', w * (0.3 + i * 0.14), h * (0.05 + i * 0.07), w * (0.12 - i * 0.03), 2); glowAdd(c, w * (0.36 + i * 0.13), h * (0.06 + i * 0.07), w * 0.2, '220,240,255', 0.12); } } }
  },
  highway: {
    rain: true, amb: 'rain',
    draw(x, w, h, rnd) { drawRoad(x, w, h, rnd, false); },
    anim(c, w, h, t) { const hy = hz(w, h), on = ((t * 4) | 0) % 2, ax = w * 0.5, ay = hy + (h - hy) * 0.55; glowAdd(c, ax - 8, ay - 14, 30, on ? '255,40,30' : '40,90,255', 0.4); }
  },
  dawnroad: { rain: false, amb: 'dawn', draw(x, w, h, rnd) { drawRoad(x, w, h, rnd, true); } },
  harbor: {
    rain: false, amb: 'dawn',
    draw(x, w, h, rnd) {
      const hy = hz(w, h) - Math.round(h * 0.06);
      vgrad(x, 0, hy, w, '#1c1a30', '#e0906a'); glowAdd(x, w * 0.3, hy, w * 0.5, '255,160,100', 0.35);
      x.fillStyle = '#262436'; x.beginPath(); x.moveTo(0, hy); for (let i = 0; i <= 10; i++) x.lineTo(w * i / 10, hy - 8 - Math.sin(i * 1.3) * 6 - rnd() * 6); x.lineTo(w, hy); x.fill();
      vgrad(x, hy, h, w, '#2a3448', '#141c2a');
      for (let i = 0; i < 60; i++) R(x, 'rgba(255,190,140,0.25)', rnd() * w, hy + rnd() * (h - hy) * 0.5, randi(3, 10), 1);
      for (const cx of [0.08, 0.22]) { const bx = w * cx; R(x, '#16161e', bx, hy - h * 0.3, 3, h * 0.3); R(x, '#16161e', bx + w * 0.08, hy - h * 0.3, 3, h * 0.3); R(x, '#16161e', bx - w * 0.04, hy - h * 0.32, w * 0.18, 4); }
      R(x, '#1a2638', w * 0.42, hy - h * 0.14, w * 0.62, h * 0.2); R(x, '#d8dde2', w * 0.5, hy - h * 0.22, w * 0.4, h * 0.08); R(x, '#8a2a26', w * 0.42, hy + h * 0.05, w * 0.62, 3);
      for (let i = 0; i < 16; i++) R(x, '#ffe6a0', w * 0.46 + i * w * 0.035, hy - h * 0.06, 2, 2);
      R(x, '#5a5c60', 0, h * 0.78, w, h * 0.22); R(x, '#e0b020', 0, h * 0.78, w, 2);
      for (let i = 0; i < 70; i++) { const px = w * 0.1 + rnd() * w * 0.75; R(x, OUTLINE, px - 1, h * 0.78 + 3 + (i % 3), 3, 6); R(x, pick(['#c8322b', '#2e6db5', '#e0b020', '#e8e3d8', '#2f8a5a']), px, h * 0.78 + 4 + (i % 3), 1, 4); }
    },
    anim(c, w, h, t) { const hy = hz(w, h); for (let i = 0; i < 2; i++) { const a = Math.sin(t * 0.4 + i * 2) * 0.6 - Math.PI / 2; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,250,220,0.08)'; c.beginPath(); const ox = w * (0.55 + i * 0.3), oy = hy - h * 0.2; c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a - 0.08) * h, oy + Math.sin(a - 0.08) * h); c.lineTo(ox + Math.cos(a + 0.08) * h, oy + Math.sin(a + 0.08) * h); c.fill(); c.restore(); } }
  },
  pier: {
    rain: false, amb: 'dawn',
    draw(x, w, h, rnd) {
      const hy = hz(w, h) - Math.round(h * 0.04);
      vgrad(x, 0, hy, w, '#3a2a48', '#f0a070'); glowAdd(x, w * 0.7, hy, w * 0.5, '255,190,120', 0.45);
      vgrad(x, hy, h, w, '#3a4458', '#182030');
      for (let i = 0; i < 70; i++) R(x, 'rgba(255,200,150,0.3)', w * 0.5 + rnd() * w * 0.45, hy + rnd() * (h - hy) * 0.4, randi(3, 10), 1);
      R(x, '#1a2638', w * 0.62, hy - 10, w * 0.22, 10); R(x, '#d8dde2', w * 0.66, hy - 15, w * 0.12, 5);
      R(x, '#5a5c60', 0, h * 0.72, w, h * 0.28); R(x, '#e0b020', 0, h * 0.72, w, 2);
      for (let i = 0; i < 8; i++) spr(x, tintC(charSprite('walker', ['z_worker']).fr[i & 1].n, '#10121a', 0.7), w * (0.02 + i * 0.05), h * 0.8 + (i % 2) * 4, 1);
    },
    anim(c, w, h, t) {
      const sc = Math.max(2, Math.round(Math.min(w, h) / 70)), bx = w * 0.62, by = h * 0.92;
      spr(c, charSprite('ally', ['ally']).fr[0].n, bx, by, sc, false);
      const fy = by - 16 * sc - Math.min(h * 0.7, t * 26), fx = bx + 6 * sc;
      if (t > 1) { R(c, '#ff4a3a', fx - 1, fy - 1, 3, 3); glowAdd(c, fx, fy, 50 + Math.sin(t * 8) * 4, '255,60,40', 0.4); for (let i = 1; i < 12; i++) R(c, 'rgba(255,160,120,0.5)', fx, fy + i * 3, 1, 2); }
    }
  },
  boat: {
    rain: false, amb: 'dawn',
    draw(x, w, h, rnd) {
      const hy = hz(w, h);
      vgrad(x, 0, hy, w, '#4a3a58', '#f2b080'); glowAdd(x, w * 0.4, hy, w * 0.6, '255,200,140', 0.4);
      vgrad(x, hy, h, w, '#46506a', '#1c2436');
      R(x, '#3a3c44', w * 0.08, hy - 4, w * 0.3, 5); for (let i = 0; i < 6; i++) R(x, '#16161e', w * (0.1 + i * 0.04), hy - 10, 2, 6);
      for (let i = 0; i < 50; i++) R(x, 'rgba(255,220,180,0.3)', rnd() * w, hy + 4 + rnd() * (h - hy) * 0.5, randi(3, 12), 1);
      R(x, '#8a9098', 0, h * 0.8, w, 3); R(x, '#8a9098', 0, h * 0.88, w, 3); for (let i = 0; i < w; i += 18) R(x, '#6d737b', i, h * 0.8, 3, h * 0.2);
      R(x, '#1a2638', 0, h * 0.92, w, h * 0.08);
    },
    anim(c, w, h, t) { const hy = hz(w, h), fx = w * 0.22, fy = hy - 30 - Math.min(h * 0.3, t * 8); glowAdd(c, fx, fy, 40, '255,60,40', 0.45); R(c, '#ff4a3a', fx - 1, fy - 1, 3, 3); for (let i = 0; i < 3; i++) { const gx = (w * 0.5 + i * 30 + t * 12) % w, gy = h * 0.2 + i * 8 + Math.sin(t * 3 + i) * 3; R(c, '#2a2a33', gx, gy, 2, 1); R(c, '#2a2a33', gx + 3, gy, 2, 1); R(c, '#2a2a33', gx + 2, gy + 1, 1, 1); } }
  }
};
function drawRoad(x, w, h, rnd, dawn) {
  const hy = hz(w, h);
  vgrad(x, 0, hy, w, dawn ? '#221e38' : '#080b14', dawn ? '#d9825a' : '#161c2a');
  if (dawn) glowAdd(x, w * 0.7, hy, w * 0.5, '255,170,110', 0.35);
  for (let i = 0; i < 90; i++) R(x, pick(dawn ? ['#ffd8b0', '#fff1d8'] : ['#ffd88a', '#fff4d0', '#ff8a5a', '#8fb6e8']), rnd() * w, hy - rnd() * 10, 1, 1);
  x.fillStyle = '#23252a'; x.beginPath(); x.moveTo(w * 0.42, hy); x.lineTo(w * 0.58, hy); x.lineTo(w * 1.2, h); x.lineTo(-w * 0.2, h); x.fill();
  x.fillStyle = '#6f7276'; x.beginPath(); x.moveTo(w * 0.42, hy); x.lineTo(w * 0.43, hy); x.lineTo(-w * 0.1, h); x.lineTo(-w * 0.2, h); x.fill();
  x.beginPath(); x.moveTo(w * 0.58, hy); x.lineTo(w * 0.57, hy); x.lineTo(w * 1.1, h); x.lineTo(w * 1.2, h); x.fill();
  for (let i = 0; i < 12; i++) { const k = i / 12, y = hy + (h - hy) * k * k; R(x, 'rgba(230,230,220,0.6)', w * 0.5 - 1, y, 2, Math.max(1, (h - hy) * 0.02 * (1 + k * 3))); }
  const sc = Math.max(1, Math.round(Math.min(w, h) / 100));
  const cars = [[0.28, 0.35], [0.72, 0.4], [0.16, 0.7], [0.86, 0.75], [0.36, 0.2], [0.64, 0.18]];
  for (const [cx, k] of cars) { const s = sc * (0.6 + k * 1.2); spr(x, PROP.car(pick(['#c8322b', '#2e6db5', '#e8e3d8', '#8a8f96', '#1b1b1b']), true), w * cx, hy + (h - hy) * k + 12 * s, s); if (!dawn) glowAdd(x, w * cx - 20 * s, hy + (h - hy) * k + 6 * s, 10 * s, '255,40,30', 0.3); }
  spr(x, PROP.ambulance(), w * 0.5, hy + (h - hy) * 0.55 + 4 * sc, sc * 1.4);
  if (dawn) { x.fillStyle = 'rgba(255,190,140,0.12)'; x.fillRect(0, 0, w, h); }
}

/* ---------- 劇情播放器 ---------- */
const Story = {
  lines: null, i: 0, done: null, typing: false, full: '', shown: 0, mode: '',
  play(lines, done) { this.lines = lines; this.i = -1; this.done = done; App.go('story'); this.next(); },
  hideAll() { $('stPhone').hidden = true; $('stCard').hidden = true; $('stChoice').hidden = true; $('stEnd').hidden = true; $('stBox').hidden = true; },
  next() {
    while (true) {
      this.i++;
      if (this.i >= this.lines.length) return this.finish();
      const L = this.lines[this.i];
      if (L && typeof L === 'object' && !Array.isArray(L)) { if (L.s) { Scene.set(L.s); continue; } if (L.sfx) { Sound.play(L.sfx); continue; } }
      break;
    }
    this.hideAll();
    const L = this.lines[this.i];
    if (typeof L === 'string') this.say(null, L);
    else if (Array.isArray(L)) this.say(L[0], L[1]);
    else if (L.phone) this.phone(L.phone);
    else if (L.card) this.card(L.card);
    else if (L.choice) this.choice(L.choice);
    else if (L.end) this.endCard(L.end);
  },
  say(who, text) {
    this.mode = 'say'; const box = $('stBox'); box.hidden = false;
    const sp = who ? SPEAKERS[who] : null;
    box.classList.toggle('narr', !sp);
    $('stName').textContent = sp ? sp.name : ''; $('stName').style.color = sp ? sp.col : '';
    $('stName').hidden = !sp; $('stFace').hidden = !sp; if (sp) $('stFace').src = portraitURL(sp.face);
    this.full = text; this.shown = 0; this.typing = true; $('stText').textContent = ''; $('stNext').hidden = true;
  },
  phone(ph) {
    this.mode = 'phone'; this.typing = false;
    const el = $('stPhone');
    el.innerHTML = `<div class="ph-top"><span>外送</span><span>${ph.time}</span></div><b class="ph-title${ph.late ? ' late' : ''}">${ph.title}</b>` + (ph.stars ? `<div class="ph-stars">${'★'.repeat(ph.stars)}</div>` : '') + ph.rows.map(r => `<p>${r}</p>`).join('') + `<p class="ph-note">${ph.note}</p><p class="ph-who">${ph.who}</p><span class="tap">點一下繼續</span>`;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  },
  card(c) {
    this.mode = 'card'; this.typing = false;
    const el = $('stCard');
    el.innerHTML = `<div class="cc-order">訂單 #0923-2341　外送中</div><div class="cc-no">${c.no}</div><div class="cc-title">${c.title}</div><div class="cc-meta"><span>${c.place}</span><span>${c.time}</span></div><div class="cc-late">${c.late}</div><span class="tap">點一下開始</span>`;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  },
  choice(list) {
    this.mode = 'choice'; this.typing = false;
    const el = $('stChoice'); el.innerHTML = '';
    for (const c of list) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn choice'; b.innerHTML = `<b>${c.t}</b><small>${c.d}</small>`; b.addEventListener('click', e => { e.stopPropagation(); Sound.play('click'); this.finish(c.k); }); el.appendChild(b); }
    el.hidden = false;
  },
  endCard(t) { this.mode = 'end'; this.typing = false; const el = $('stEnd'); el.textContent = t; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); },
  advance() {
    if (!this.lines || this.mode === 'choice') return;
    if (this.typing) { this.typing = false; this.shown = this.full.length; $('stText').textContent = this.full; $('stNext').hidden = false; return; }
    Sound.play('click'); this.next();
  },
  skip() {
    if (!this.lines) return;
    for (let j = this.i + 1; j < this.lines.length; j++) { const L = this.lines[j]; if (L && L.choice) { for (let k = this.i + 1; k < j; k++) if (this.lines[k] && this.lines[k].s) Scene.set(this.lines[k].s); this.i = j - 1; this.next(); return; } }
    this.finish();
  },
  finish(v) { const d = this.done; this.done = null; this.lines = null; this.hideAll(); if (d) d(v); },
  frame(dt) {
    Scene.frame(dt);
    if (this.typing) {
      const before = this.shown | 0; this.shown += dt * 30 * PZ.settings.get('textSpeed'); const n = Math.min(this.full.length, this.shown | 0);
      if (n !== before) { $('stText').textContent = this.full.slice(0, n); if (n % 2 === 0) Sound.play('type'); }
      if (n >= this.full.length) { this.typing = false; $('stNext').hidden = false; }
    }
  }
};

