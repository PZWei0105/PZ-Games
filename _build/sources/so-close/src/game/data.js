// 遊戲資料：稀有度、版本、角色、機台、機率、經濟、段位
export const RARITY = {
  N: { key: 'N', name: '普通', en: 'COMMON', color: '#cfd8e6', glow: '#ffffff', xp: 6, order: 0 },
  R: { key: 'R', name: '稀有', en: 'RARE', color: '#4db2ff', glow: '#59c1ff', xp: 12, order: 1 },
  SR: { key: 'SR', name: '超稀有', en: 'SUPER RARE', color: '#c07bff', glow: '#b26bff', xp: 30, order: 2 },
  SSR: { key: 'SSR', name: '傳說', en: 'LEGENDARY', color: '#ffc93c', glow: '#ffb81f', xp: 100, order: 3 },
  HID: { key: 'HID', name: '隱藏版', en: 'SECRET', color: '#ffe7a3', glow: '#ff6a2b', xp: 400, order: 4 },
};
export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'HID'];
export const NEXT_TIER = { N: 'R', R: 'SR', SR: 'SSR' };

// 版本：普通／異色／夜光／鍍金（鍍金只出在黑金庫）
export const VERSIONS = {
  n: { key: 'n', name: '普通版', short: '普', en: 'STANDARD', mult: 1, xp: 0, color: '#cfd8e6' },
  a: { key: 'a', name: '異色版', short: '異', en: 'ALT COLOR', mult: 2.4, xp: 12, color: '#ff8be0' },
  g: { key: 'g', name: '夜光版', short: '夜', en: 'GLOW', mult: 4.5, xp: 30, color: '#7dffd2' },
  m: { key: 'm', name: '鍍金版', short: '金', en: 'GILDED', mult: 6, xp: 24, color: '#ffd36a' },
};
export const VERSION_ORDER = ['n', 'a', 'g', 'm'];
// 限量編號（0＝不編號）
const EDITION = { n: { N: 0, R: 1200, SR: 480, SSR: 120 }, a: { N: 600, R: 300, SR: 120, SSR: 30 }, g: { N: 240, R: 120, SR: 48, SSR: 12 }, m: { R: 88, SR: 36, SSR: 18 } };
export const editionOf = (tier, v) => (tier === 'HID' ? 8 : EDITION[v]?.[tier] || 0);

export const SERIES = {
  J: { key: 'J', name: '星砂果凍', en: 'STARDUST JELLY', blurb: '軟軟的果凍裡，封著一小撮會發光的星砂。', color: '#7ad8ff', finish: 'jelly', machine: 'm1' },
  M: { key: 'M', name: '機甲核心', en: 'MECHA CORE', blurb: '巴掌大的機甲，每一台都是手工烤漆。', color: '#ff8a3a', finish: 'metal', machine: 'm5' },
  W: { key: 'W', name: '發條小隊', en: 'WIND-UP SQUAD', blurb: '轉三圈發條，就會搖搖晃晃走一段。', color: '#ffb35c', finish: 'vinyl', machine: 'm2' },
  S: { key: 'S', name: '街頭英雄', en: 'STREET HEROES', blurb: '這條街上最酷的一群。嘴上說不在意，其實很在意自己帥不帥。', color: '#b6ff3a', finish: 'street', machine: 'm6' },
  K: { key: 'K', name: '甜點盲盒', en: 'SWEET DREAMS', blurb: '每一盒都是一場甜點做的夢。', color: '#ff8fc8', finish: 'paint', machine: 'm3' },
  P: { key: 'P', name: '睡衣派對', en: 'PAJAMA PARTY', blurb: '今晚誰都不准先睡——說完這句話的那隻，最先睡著。', color: '#b9a8ff', finish: 'flock', machine: 'm7' },
};
export const SERIES_ORDER = ['J', 'M', 'W', 'S', 'K', 'P'];

// 角色：tier 決定扭蛋／盒子的顏色；value 是普通版市價（NT$）
export const CHARS = [
  { id: 'J1', s: 'J', tier: 'N', name: '軟軟幽靈', en: 'Squishy Ghost', value: 360, line: '想嚇人的時候，會先說一聲「我要嚇你了喔」。' },
  { id: 'J2', s: 'J', tier: 'N', name: '晴天菇', en: 'Sunny Shroom', value: 340, line: '名字叫晴天，最怕的卻是曬太陽。' },
  { id: 'J3', s: 'J', tier: 'N', name: '嗶嗶雞', en: 'Peep Chick', value: 380, line: '叫聲很有氣勢，可惜只會叫「嗶」。' },
  { id: 'J4', s: 'J', tier: 'R', name: '長耳兔', en: 'Long-ear Bunny', value: 1180, line: '耳朵很長，聽到的八卦特別多，但牠一句都沒說出去過。' },
  { id: 'J5', s: 'J', tier: 'R', name: '圓滾海豹', en: 'Roly Seal', value: 1280, line: '明明是海豹，滾起來比游得還快。' },
  { id: 'J6', s: 'J', tier: 'SR', name: '微笑蠑螈', en: 'Smiley Axolotl', value: 5600, line: '一直在笑，不是因為開心，是臉就長這樣。' },
  { id: 'J7', s: 'J', tier: 'SR', name: '月光鯨', en: 'Moonlight Whale', value: 6200, line: '游過的地方會留下一條星星，所以每次偷吃都被抓到。' },
  { id: 'J8', s: 'J', tier: 'SSR', name: '流星龍', en: 'Comet Dragon', value: 46800, line: '噴出來的不是火，是亮晶晶的星砂。打噴嚏的時候最漂亮。' },
  { id: 'JH', s: 'J', tier: 'HID', name: '銀河貓', en: 'Galaxy Cat', value: 388000, line: '肚子裡裝了一整個銀河。牠唯一在乎的事情是晚餐。' },

  { id: 'W1', s: 'W', tier: 'N', name: '發條企鵝', en: 'Wind-up Penguin', value: 360, line: '每走三步跌倒一次，從來沒有放棄過。' },
  { id: 'W2', s: 'W', tier: 'N', name: '鼓手熊', en: 'Drummer Bear', value: 380, line: '負責打拍子，可是每一拍都慢半拍。' },
  { id: 'W3', s: 'W', tier: 'N', name: '跳跳蛙', en: 'Hop Frog', value: 340, line: '說要跳很遠，結果每次都跳回原地。' },
  { id: 'W4', s: 'W', tier: 'R', name: '鐵皮機器人', en: 'Tin Robot', value: 1280, line: '全身都是鐵，最怕的是下雨天。' },
  { id: 'W5', s: 'W', tier: 'R', name: '兇鯊', en: 'Grumpy Shark', value: 1380, line: '一臉兇相，其實怕水，所以是陸地限定。' },
  { id: 'W6', s: 'W', tier: 'SR', name: '太空貓', en: 'Astro Cat', value: 6800, line: '去過月球，回來只說了一句：那裡沒有罐頭。' },
  { id: 'W7', s: 'W', tier: 'SR', name: '炸毛獅', en: 'Frizz Lion', value: 5800, line: '鬃毛看起來很威風，其實是發條轉太緊炸開的。' },
  { id: 'W8', s: 'W', tier: 'SSR', name: '齒輪龍', en: 'Gear Dragon', value: 52800, line: '全隊最強，但發條要轉三百圈才動得了。' },
  { id: 'WH', s: 'W', tier: 'HID', name: '永動貓', en: 'Perpetual Cat', value: 466000, line: '背上沒有發條，可是牠一直在動。沒人知道為什麼，牠自己也不知道。' },

  { id: 'K1', s: 'K', tier: 'R', name: '草莓兔', en: 'Strawberry Bunny', value: 1180, line: '披著草莓，因為牠覺得自己還不夠甜。' },
  { id: 'K2', s: 'K', tier: 'R', name: '棉花糖羊', en: 'Marshmallow Sheep', value: 1080, line: '一碰就陷下去，脾氣卻硬得要命。' },
  { id: 'K3', s: 'K', tier: 'R', name: '布丁貓', en: 'Pudding Cat', value: 1280, line: '頭上的布丁不能吃——牠說的。' },
  { id: 'K4', s: 'K', tier: 'R', name: '甜甜圈熊', en: 'Donut Bear', value: 1380, line: '游泳圈是甜甜圈做的，所以從來沒下過水。' },
  { id: 'K5', s: 'K', tier: 'SR', name: '冰淇淋龍', en: 'Sundae Dragon', value: 6200, line: '一生氣就會融化，所以很少生氣。' },
  { id: 'K6', s: 'K', tier: 'SR', name: '蛋糕貓頭鷹', en: 'Birthday Owl', value: 5600, line: '每天都說今天是牠生日。' },
  { id: 'K7', s: 'K', tier: 'SR', name: '珍奶章魚', en: 'Boba Octopus', value: 6800, line: '八隻手都拿著珍珠，所以沒有手可以喝。' },
  { id: 'K8', s: 'K', tier: 'SSR', name: '糖霜獨角獸', en: 'Frosting Unicorn', value: 58800, line: '角是糖霜擠的，下雨天會變短。' },
  { id: 'KH', s: 'K', tier: 'HID', name: '午夜甜點師', en: 'Midnight Pâtissier', value: 520000, line: '這一整盒甜點都是牠做的。牠對糖過敏。' },

  { id: 'M1', s: 'M', tier: 'N', name: '偵察兵', en: 'Scout Unit', value: 360, line: '偵察了一整天，最大的發現是自己迷路了。' },
  { id: 'M2', s: 'M', tier: 'N', name: '工兵', en: 'Engineer Unit', value: 380, line: '什麼都修得好，修完一定多出一顆螺絲。' },
  { id: 'M3', s: 'M', tier: 'N', name: '衛兵', en: 'Guard Unit', value: 340, line: '盾牌舉得很高，躲在後面的時候其實在打瞌睡。' },
  { id: 'M4', s: 'M', tier: 'R', name: '疾風', en: 'Gale', value: 1280, line: '全隊最快，唯一的問題是煞不住。' },
  { id: 'M5', s: 'M', tier: 'R', name: '重砲', en: 'Heavy Cannon', value: 1380, line: '雙肩大砲威力驚人——射出來的是彩色紙花。' },
  { id: 'M6', s: 'M', tier: 'SR', name: '蒼刃', en: 'Azure Blade', value: 6800, line: '光刃一拔出來，整個房間都亮了，所以晚上被拿去當夜燈。' },
  { id: 'M7', s: 'M', tier: 'SR', name: '赤焰', en: 'Crimson Blaze', value: 6200, line: '熱血到全身冒煙——其實是散熱風扇壞了。' },
  { id: 'M8', s: 'M', tier: 'SSR', name: '獵鷹核心', en: 'Falcon Core', value: 52800, line: '展翼只要三秒，擺姿勢要三十秒。它堅持每次都把變身動畫跑完。' },
  { id: 'MH', s: 'M', tier: 'HID', name: '零號機', en: 'Unit Zero', value: 466000, line: '所有機甲都是照著它設計的——包括那對貓耳。說明書只有一行：別摸耳朵。' },

  { id: 'S1', s: 'S', tier: 'N', name: '滑板柴犬', en: 'Skater Shiba', value: 360, line: '滑板很帥，停下來的方法只有一種：撞牆。' },
  { id: 'S2', s: 'S', tier: 'N', name: '耳機倉鼠', en: 'Beats Hamster', value: 340, line: '耳機裡放的，是自己嗑瓜子的聲音。' },
  { id: 'S3', s: 'S', tier: 'N', name: '籃球河馬', en: 'Hoops Hippo', value: 380, line: '投籃一次都沒進過，但是轉球可以轉一整天。' },
  { id: 'S4', s: 'S', tier: 'R', name: '墨鏡鱷魚', en: 'Shades Croc', value: 1280, line: '墨鏡從來不拿下來，因為牠的眼睛其實超級可愛。' },
  { id: 'S5', s: 'S', tier: 'R', name: 'DJ 貓頭鷹', en: 'DJ Owl', value: 1180, line: '混音技術一流，可惜只會放同一首歌。' },
  { id: 'S6', s: 'S', tier: 'SR', name: '忍者貓', en: 'Ninja Cat', value: 6200, line: '身手快到看不見，可是脖子上的鈴鐺一直沒拔。' },
  { id: 'S7', s: 'S', tier: 'SR', name: '搖滾狼', en: 'Rock Wolf', value: 5800, line: '每次嚎完都會小聲問：剛剛那段好聽嗎？' },
  { id: 'S8', s: 'S', tier: 'SSR', name: '街頭霸主', en: 'Street King', value: 56800, line: '整條街都聽牠的，牠只聽阿嬤的。' },
  { id: 'SH', s: 'S', tier: 'HID', name: '塗鴉之王', en: 'Graffiti King', value: 488000, line: '牆上的塗鴉沒有人看過是誰畫的——因為牠是從那面牆上走下來的。' },

  { id: 'P1', s: 'P', tier: 'N', name: '呵欠海獺', en: 'Yawning Otter', value: 360, line: '從早上打呵欠打到晚上，中間順便睡了個午覺。' },
  { id: 'P2', s: 'P', tier: 'N', name: '抱枕熊', en: 'Pillow Bear', value: 340, line: '抱枕比牠還大，所以其實是抱枕抱著牠。' },
  { id: 'P3', s: 'P', tier: 'N', name: '數羊小羊', en: 'Counting Lamb', value: 380, line: '睡不著的時候數羊，數到自己就停了。' },
  { id: 'P4', s: 'P', tier: 'R', name: '恐龍裝柯基', en: 'Dino Corgi', value: 1280, line: '穿上恐龍裝以為自己很兇，吼出來是「汪」。' },
  { id: 'P5', s: 'P', tier: 'R', name: '黑眼圈熊貓', en: 'Sleepy Panda', value: 1180, line: '黑眼圈是天生的，牠一直以為是自己沒睡飽。' },
  { id: 'P6', s: 'P', tier: 'SR', name: '雲朵兔', en: 'Cloud Bunny', value: 5600, line: '睡在雲上面，翻身的時候要特別小心。' },
  { id: 'P7', s: 'P', tier: 'SR', name: '小夢狐', en: 'Dream Fox', value: 6200, line: '每天晚上都夢到自己在睡覺，醒來覺得好累。' },
  { id: 'P8', s: 'P', tier: 'SSR', name: '枕頭大王', en: 'Pillow King', value: 48800, line: '全世界的枕頭都歸牠管，牠自己睡地板。' },
  { id: 'PH', s: 'P', tier: 'HID', name: '夢遊貓', en: 'Sleepwalker Cat', value: 398000, line: '每天半夜會繞派對一圈，替每個人蓋好被子。醒來什麼都不記得。' },
];
export const CHAR = Object.fromEntries(CHARS.map((c) => [c.id, c]));
export const seriesChars = (s) => CHARS.filter((c) => c.s === s);
export const hiddenChar = (s) => CHARS.find((c) => c.s === s && c.tier === 'HID');
export const charsOf = (s, tier) => CHARS.filter((c) => c.s === s && c.tier === tier);
export const versionsOf = (c) => (c.tier === 'HID' ? ['n'] : c.tier === 'N' ? ['n', 'a', 'g'] : ['n', 'a', 'g', 'm']);
// 收藏的鍵：角色＋版本，例如 J3.a
export const colKey = (cid, v) => `${cid}.${v}`;
export const parseKey = (k) => { const [cid, v] = k.split('.'); return CHAR[cid] ? { cid, v: v || 'n', c: CHAR[cid] } : null; };
export const valueOf = (c, v) => (c.tier === 'HID' ? c.value : Math.round((c.value * VERSIONS[v].mult) / 10) * 10);

// 星級：同一隻角色（不分版本）拿到第 3 隻升 ★★、第 6 隻升 ★★★
export const STAR_AT = [1, 3, 6];
export const starOf = (got) => (got >= STAR_AT[2] ? 3 : got >= STAR_AT[1] ? 2 : got >= 1 ? 1 : 0);

// 初代系列（v1 的獎品，只留在陳列櫃）
export const OLD_SERIES = {
  A: { key: 'A', name: '星砂瓶', en: 'STARDUST BOTTLES' },
  B: { key: 'B', name: '機械心臟', en: 'CLOCKWORK HEARTS' },
  C: { key: 'C', name: '寶石匣', en: 'JEWEL CASKET' },
};
export const OLD_PRIZES = [
  { id: 'A1', series: 'A', rarity: 'N', name: '藍沙漏', en: 'Blue Hourglass', value: 280, line: '倒過來，藍色的沙會發光，大約流三分鐘。' },
  { id: 'A2', series: 'A', rarity: 'N', name: '月光小瓶', en: 'Moonlight Vial', value: 320, line: '瓶子裡的小月亮，會跟著真的月相變圓變缺。' },
  { id: 'A3', series: 'A', rarity: 'R', name: '螢火罐', en: 'Firefly Jar', value: 980, line: '二十七隻光點各自亂飛，從來不撞在一起。' },
  { id: 'A4', series: 'A', rarity: 'R', name: '極光燈', en: 'Aurora Lantern', value: 1280, line: '關燈之後，天花板會出現一整片極光。' },
  { id: 'A5', series: 'A', rarity: 'SR', name: '星雲水晶球', en: 'Nebula Orb', value: 5800, line: '裡面的星雲每天轉一點點，一年才轉一圈。' },
  { id: 'A6', series: 'A', rarity: 'SSR', name: '銀河瓶', en: 'Galaxy in a Bottle', value: 46800, line: '旋臂上有兩千顆星，中央那顆比其他的都亮。' },
  { id: 'A7', series: 'A', rarity: 'HID', name: '事件視界', en: 'Event Horizon', value: 388000, line: '光進去就出不來。盯太久，時間會變慢。' },
  { id: 'B1', series: 'B', rarity: 'N', name: '黃銅齒輪', en: 'Brass Gear', value: 240, line: '十八齒，咬合精度到百分之一公釐。' },
  { id: 'B2', series: 'B', rarity: 'N', name: '發條鑰匙', en: 'Wind-up Key', value: 260, line: '不知道是哪台機器的鑰匙，但轉起來很順。' },
  { id: 'B3', series: 'B', rarity: 'R', name: '懷錶', en: 'Pocket Watch', value: 1180, line: '秒針會走，一天只慢一秒。' },
  { id: 'B4', series: 'B', rarity: 'R', name: '發條小鳥', en: 'Clockwork Bird', value: 1380, line: '上緊發條，牠會叫三聲，然後歪頭看你。' },
  { id: 'B5', series: 'B', rarity: 'SR', name: '八音盒', en: 'Music Box', value: 6800, line: '音筒上一共四百一十二根針，彈的曲子沒有名字。' },
  { id: 'B6', series: 'B', rarity: 'SSR', name: '天體儀', en: 'Grand Orrery', value: 52800, line: '六顆行星照真實比例公轉，太陽是一顆會發熱的燈芯。' },
  { id: 'B7', series: 'B', rarity: 'HID', name: '永動之心', en: 'Perpetual Heart', value: 466000, line: '沒有上發條，沒有電池。它自己在跳。' },
  { id: 'C1', series: 'C', rarity: 'R', name: '紫晶簇', en: 'Amethyst Cluster', value: 1580, line: '七根晶柱，最高的那根剛好九公分。' },
  { id: 'C2', series: 'C', rarity: 'R', name: '翡翠骰', en: 'Jade D20', value: 1880, line: '二十面都磨到透光，擲出來永遠不會停在邊上。' },
  { id: 'C3', series: 'C', rarity: 'SR', name: '藍寶石戒', en: 'Sapphire Ring', value: 8800, line: '矢車菊藍，在白光底下會出現六道星光。' },
  { id: 'C4', series: 'C', rarity: 'SR', name: '紅寶石王冠', en: 'Ruby Crown', value: 12800, line: '只有手掌大，但每一顆紅寶石都是真的切面。' },
  { id: 'C5', series: 'C', rarity: 'SSR', name: '帝王之心', en: 'Heart of the Emperor', value: 58800, line: '五十八個切面，轉一圈會在牆上灑滿彩虹。' },
  { id: 'C6', series: 'C', rarity: 'HID', name: '虹色黑鑽', en: 'Black Rainbow', value: 520000, line: '黑到看不見切面，只有光打上去的那一瞬間，整顆炸成彩虹。' },
];
export const OLD_PRIZE = Object.fromEntries(OLD_PRIZES.map((p) => [p.id, p]));

// 機台
// power：一般爪力 { g 夾, l 上升, c 到頂 }；strong：保夾爪力；meter：保夾門檻（次）
export const MACHINES = [
  {
    id: 'm1', name: '星砂扭蛋機', en: 'STARDUST', kind: 'pile', series: 'J', cost: 10, unlock: 0,
    theme: { body: '#123a6b', trim: '#53d6ff', accent: '#9ef0ff', floor: '#16284a', back: ['#0b1a3a', '#1b3f7a'] },
    power: { g: 1, l: 0.84, c: 0.52 }, strong: { g: 1, l: 0.96, c: 0.88 }, meter: 10,
    stock: 56, mix: { N: 0.56, R: 0.31, SR: 0.11, SSR: 0 }, ssr: 1, blackChance: 0.04, glowChance: 0.07,
    tip: '入門台。扭蛋的顏色就是稀有度，裡面是哪一隻、會不會變異，打開才知道。保夾燈集滿，下一爪就是強爪。',
  },
  {
    id: 'm5', name: '機甲格納庫', en: 'MECHA DOCK', kind: 'pile', series: 'M', cost: 10, unlock: 0,
    theme: { body: '#1d2632', trim: '#ff8a1a', accent: '#ffd29a', floor: '#151c26', back: ['#090d13', '#223244'] },
    power: { g: 1, l: 0.82, c: 0.5 }, strong: { g: 1, l: 0.96, c: 0.88 }, meter: 11,
    stock: 56, mix: { N: 0.55, R: 0.32, SR: 0.11, SSR: 0 }, ssr: 1, blackChance: 0.04, glowChance: 0.07,
    tip: '機甲核心的格納庫，跟入門台一樣從第一天就能玩。爪力和入門台差不多，保夾 11 次。',
  },
  {
    id: 'm2', name: '發條工坊', en: 'CLOCKWORK', kind: 'pile', series: 'W', cost: 15, unlock: 1,
    theme: { body: '#4a2410', trim: '#ffb35c', accent: '#ffd9a0', floor: '#2b1a10', back: ['#24120a', '#5a2c12'] },
    power: { g: 1, l: 0.72, c: 0.4 }, strong: { g: 1, l: 0.95, c: 0.85 }, meter: 13,
    stock: 56, mix: { N: 0.52, R: 0.33, SR: 0.13, SSR: 0 }, ssr: 1, blackChance: 0.05, glowChance: 0.07,
    tip: '扭蛋比較重，爪子到頂會鬆得比較多。',
  },
  {
    id: 'm6', name: '街頭塗鴉台', en: 'STREET CORNER', kind: 'pile', series: 'S', cost: 15, unlock: 1,
    theme: { body: '#2a1240', trim: '#b6ff3a', accent: '#f4ff9a', floor: '#1a1024', back: ['#10081a', '#3a1652'] },
    power: { g: 1, l: 0.78, c: 0.45 }, strong: { g: 1, l: 0.95, c: 0.86 }, meter: 12,
    stock: 56, mix: { N: 0.53, R: 0.33, SR: 0.12, SSR: 0 }, ssr: 1, blackChance: 0.05, glowChance: 0.07,
    tip: '街頭英雄的地盤。爪子到頂會鬆一點，要抓正中間。保夾 12 次。',
  },
  {
    id: 'm3', name: '甜點推落台', en: 'SWEET DROP', kind: 'shelf', series: 'K', cost: 15, unlock: 2,
    theme: { body: '#4a0f3c', trim: '#ff5fc8', accent: '#ffb3ea', floor: '#2a0b26', back: ['#1d0718', '#5a1048'] },
    power: { g: 0.9, l: 0.5, c: 0.3 }, strong: { g: 1, l: 1, c: 1 }, meter: 7,
    boxes: 3, mix: { R: 0.56, SR: 0.34, SSR: 0.10 }, glowChance: 0.06,
    tip: '盲盒平常夾不起來——把爪子對準盒子正中間稍微後面一點，收爪的時候會把它往前推，推到邊緣就掉下去。保夾燈集滿的那一爪力氣夠大，對準盒子正中間就能直接夾起來。越稀有的盒子放得越裡面。',
  },
  {
    id: 'm7', name: '睡衣派對', en: 'PAJAMA PARTY', kind: 'pile', series: 'P', cost: 15, unlock: 3,
    theme: { body: '#2c2a6e', trim: '#ffb8e8', accent: '#dcd4ff', floor: '#1c1a42', back: ['#0e0c26', '#36307a'] },
    power: { g: 1, l: 0.76, c: 0.44 }, strong: { g: 1, l: 0.95, c: 0.86 }, meter: 9,
    stock: 56, mix: { N: 0.53, R: 0.33, SR: 0.12, SSR: 0 }, ssr: 1, blackChance: 0.05, glowChance: 0.08,
    tip: '睡衣派對的扭蛋機。爪子軟綿綿的，到頂鬆得比較多；但保夾只要 9 次，強爪來得快。',
  },
  {
    id: 'm4', name: '黑金庫', en: 'BLACK VAULT', kind: 'pile', series: 'X', cost: 30, unlock: 4,
    theme: { body: '#0c0b0a', trim: '#e8c25a', accent: '#fff0b8', floor: '#141210', back: ['#080706', '#2a2212'] },
    power: { g: 1, l: 0.64, c: 0.33 }, strong: { g: 1, l: 0.93, c: 0.8 }, meter: 18,
    stock: 40, mix: { R: 0.4, SR: 0.4, SSR: 0.2 }, ssr: 6, black: 2, blackChance: 0, glowChance: 0,
    tip: '全店最硬的爪。這台裡面全部是鍍金版——六個系列稀有以上的角色都有。黑金蛋開出隱藏版的機率是三分之一。',
  },
];
export const MACHINE = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

// 開蛋機率
export const ODDS = {
  // 版本：隱藏版、夜光、異色（其餘普通）
  cap: { HID: 1 / 150, g: 0.03, a: 0.1 },
  box: { HID: 1 / 100, g: 0.06, a: 0.14 },
  // 發光扭蛋／發光盲盒：必定變異
  glow: { HID: 1 / 50, g: 0.3 },
  // 黑金蛋：三分之一隱藏版，其餘是傳說角色（必定變異）
  black: 1 / 3,
  // 加碼（一次最多一個）
  ev: { key: 0.15, gold: 0.04, egg: 0.03, tri: 0.02 },
  evBox: { key: 0.25, gold: 0.05 },
  evVault: { key: 0.2, gold: 0.04, egg: 0.03 },
  // 祕密寶箱：必定傳說以上
  chest: { HID: 0.1, g: 0.35 },
  keys: 5,
};

// 段位
export const RANKS = [
  { name: '路人', xp: 0 }, { name: '新手', xp: 40 }, { name: '熟客', xp: 130 }, { name: '常客', xp: 280 }, { name: '老手', xp: 500 },
  { name: '夾技師', xp: 820 }, { name: '職人', xp: 1300 }, { name: '達人', xp: 2000 }, { name: '名人', xp: 3000 }, { name: '夾神', xp: 4500 },
];
export const rankOf = (xp) => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i; return r; };

export const ECON = {
  start: 200, daily: 150, regenEvery: 45, regenCap: 100, playXp: 2, openingMeter: 6,
  rankReward: (r) => 60 + 30 * r, seriesReward: 500, allVersionsReward: 1500,
  // 重複的角色（同一個版本）→ 兌換券
  ticket: { N: 1, R: 3, SR: 8, SSR: 20, HID: 60 },
  // 兌換櫃台：指定角色（普通版）
  price: { N: 12, R: 30, SR: 75, SSR: 180 },
  ticketToTokens: { cost: 10, tokens: 40 },
  seriesTickets: 20,
};

export const CAP_R = { N: 0.05, R: 0.05, SR: 0.052, SSR: 0.064, BLK: 0.06 };
export const CAP_M = { N: 0.1, R: 0.105, SR: 0.115, SSR: 0.24, BLK: 0.22 };
// 盲盒尺寸（寬、高、深、重量）
export const BOX_SIZE = { R: { sx: 0.12, sy: 0.15, sz: 0.1, mass: 0.2 }, SR: { sx: 0.126, sy: 0.158, sz: 0.104, mass: 0.23 }, SSR: { sx: 0.134, sy: 0.168, sz: 0.11, mass: 0.27 } };

// 每日任務（每天從裡面挑 3 個）
export const MISSIONS = [
  { id: 'win3', text: '夾到 3 個獎品', goal: 3, reward: 40, ev: 'win' },
  { id: 'play12', text: '投幣 12 次', goal: 12, reward: 30, ev: 'play' },
  { id: 'near2', text: '「差一點」2 次', goal: 2, reward: 35, ev: 'near' },
  { id: 'power1', text: '用強爪夾到獎品', goal: 1, reward: 50, ev: 'powerwin' },
  { id: 'rare1', text: '夾到稀有以上的扭蛋或盲盒', goal: 1, reward: 40, ev: 'rare' },
  { id: 'sr1', text: '夾到超稀有以上的扭蛋或盲盒', goal: 1, reward: 80, ev: 'sr' },
  { id: 'mut1', text: '開出異色或夜光版', goal: 1, reward: 60, ev: 'mut' },
  { id: 'box1', text: '在推落台推落一盒', goal: 1, reward: 60, ev: 'box', need: 'm3' },
  { id: 'multi1', text: '一爪夾到兩個以上', goal: 1, reward: 90, ev: 'multi' },
  { id: 'm2play', text: '在發條工坊玩 5 次', goal: 5, reward: 40, ev: 'play:m2', need: 'm2' },
  { id: 'm5play', text: '在機甲格納庫玩 5 次', goal: 5, reward: 40, ev: 'play:m5', need: 'm5' },
  { id: 'm6play', text: '在街頭塗鴉台玩 5 次', goal: 5, reward: 40, ev: 'play:m6', need: 'm6' },
  { id: 'm7play', text: '在睡衣派對玩 5 次', goal: 5, reward: 45, ev: 'play:m7', need: 'm7' },
  { id: 'm4play', text: '在黑金庫玩 3 次', goal: 3, reward: 60, ev: 'play:m4', need: 'm4' },
  { id: 'buddy1', text: '讓夥伴陪你夾到 2 個獎品', goal: 2, reward: 45, ev: 'buddywin', need: 'buddy' },
  { id: 'pet3', text: '在收藏房間摸摸 3 隻公仔', goal: 3, reward: 30, ev: 'pet', need: 'own3' },
];

// ---------------- 第二波：夥伴、收藏房間、機台外觀（全部只改外觀，不影響爪力與機率） ----------------
// 夥伴的台詞：依系列的個性
export const BUDDY_LINES = {
  J: { win: ['噗嚕噗嚕！夾到了！', '亮晶晶的！', '耶——星砂都在跳！'], near: ['啊……差一點點……', '嗚，滑掉了……', '下一次一定！'], power: ['強爪來了！', '這一爪會發光喔！'], tap: ['軟軟的，要摸摸嗎？', '噗嚕～', '今天也要夾到喔！'] },
  M: { win: ['目標回收完成！', '任務成功！', '戰果確認，漂亮！'], near: ['警告：目標脫離……', '可惡，差一點！', '重新校準中……'], power: ['輸出全開！', '強爪模式，啟動！'], tap: ['系統正常。', '待命中，隨時可以出擊。', '請勿觸碰駕駛艙。'] },
  W: { win: ['喀啦喀啦——成功！', '發條轉到最緊了！', '好耶！轉三圈慶祝！'], near: ['喀……卡住了……', '差一點！再上一次發條！', '嗚哇，鬆掉了！'], power: ['發條上緊了！', '全速前進！'], tap: ['幫我轉一下發條好嗎？', '喀啦喀啦～', '走三步就要休息一下。'] },
  S: { win: ['Yo！帥啦！', '這招很街頭！', '收下了，酷！'], near: ['不會吧……', '差一點！再來一次！', '嘖，手滑。'], power: ['強爪，上啦！', '這一爪很帥喔！'], tap: ['嘿，要不要來一場？', '我很酷，對吧？', '別弄亂我的帽子。'] },
  K: { win: ['甜甜的勝利！', '這個比蛋糕還棒！', '耶～要加一球冰淇淋！'], near: ['糖霜掉了……', '差一點點就甜了……', '沒關係，再來一份！'], power: ['加糖！強爪！', '今天的特餐是強爪！'], tap: ['想吃點心嗎？', '我身上有糖霜的味道喔。', '嘿嘿，甜甜的～'] },
  P: { win: ['哇……醒了醒了！', '夾到了……可以睡了嗎……', '耶～睡前的禮物！'], near: ['呼……再一次……', '差一點……我先瞇一下……', '嗚，好可惜……'], power: ['醒來了！強爪！', '這一爪……很有精神！'], tap: ['呼哈～好睏……', '晚安……不對，還沒要睡！', 'Zzz……啊，我沒睡！'] },
  HID: { win: ['……不錯。', '我就知道。', '嗯，收下吧。'], near: ['……可惜。', '下一次。', '再看一次爪子的角度。'], power: ['就是現在。', '……上。'], tap: ['……（盯）', '你找到我了。', '噓。'] },
};
export const buddyLines = (c) => BUDDY_LINES[c.tier === 'HID' ? 'HID' : c.s] || BUDDY_LINES.J;

// 機殼配色（id 'base' 用機台自己的配色）；need：series＝收齊任一系列、hidden＝拿到任一隱藏版
export const CAB_SKINS = [
  { id: 'base', name: '原廠配色', price: 0 },
  { id: 'pearl', name: '珍珠白', body: '#d8d6e4', trim: '#5ad0ff', price: 30 },
  { id: 'sakura', name: '櫻花粉', body: '#ff8fbf', trim: '#fff2f8', price: 30 },
  { id: 'mint', name: '薄荷蘇打', body: '#2fb294', trim: '#c8fff0', price: 30 },
  { id: 'sunset', name: '夕陽橘', body: '#ff7a2a', trim: '#ffe27a', price: 30 },
  { id: 'midnight', name: '午夜霓虹', body: '#14141c', trim: '#ff3fb4', price: 40 },
  { id: 'gold', name: '黑金', body: '#14100a', trim: '#ffcf5a', need: 'series' },
  { id: 'rainbow', name: '彩虹霓虹', body: '#1a1430', trim: 'rainbow', need: 'hidden' },
];
// 夾爪材質
export const CLAW_SKINS = [
  { id: 'chrome', name: '鏡面銀', color: '#dfe6ef', rough: 0.14, price: 0 },
  { id: 'gold', name: '香檳金', color: '#ffd27a', rough: 0.16, price: 25 },
  { id: 'rose', name: '玫瑰金', color: '#f4b0a0', rough: 0.18, price: 25 },
  { id: 'black', name: '黑鉻', color: '#3a3c46', rough: 0.2, price: 25 },
  { id: 'iris', name: '幻彩', color: '#eef0fa', rough: 0.1, iri: true, need: 'hidden' },
];
// 收藏房間的佈置
export const ROOM_THEMES = [
  { id: 'wood', name: '溫馨木屋', price: 0 },
  { id: 'night', name: '星空小屋', price: 40 },
  { id: 'candy', name: '糖果房間', price: 40 },
  { id: 'neon', name: '霓虹電玩房', price: 50 },
  { id: 'mech', name: '機甲基地', price: 50 },
  { id: 'gold', name: '黃金展示廳', need: 'hidden' },
];
export const NEED_TEXT = { series: '收齊任一系列解鎖', hidden: '拿到任一隻隱藏版解鎖' };
