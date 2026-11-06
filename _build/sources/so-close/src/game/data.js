// 遊戲資料：稀有度、系列、獎品、機台、段位
export const RARITY = {
  N: { key: 'N', name: '普通', en: 'COMMON', color: '#cfd8e6', glow: '#ffffff', ed: 0, recycle: 3, xp: 6, order: 0 },
  R: { key: 'R', name: '稀有', en: 'RARE', color: '#4db2ff', glow: '#59c1ff', ed: 3000, recycle: 8, xp: 12, order: 1 },
  SR: { key: 'SR', name: '超稀有', en: 'SUPER RARE', color: '#c07bff', glow: '#b26bff', ed: 500, recycle: 25, xp: 30, order: 2 },
  SSR: { key: 'SSR', name: '傳說', en: 'LEGENDARY', color: '#ffc93c', glow: '#ffb81f', ed: 88, recycle: 100, xp: 100, order: 3 },
  HID: { key: 'HID', name: '隱藏版', en: 'SECRET', color: '#ffe7a3', glow: '#ff6a2b', ed: 8, recycle: 500, xp: 400, order: 4 },
};
export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'HID'];

export const SERIES = {
  A: { key: 'A', name: '星砂瓶', en: 'STARDUST BOTTLES', blurb: '把夜空裝進玻璃裡。', color: '#53d6ff' },
  B: { key: 'B', name: '機械心臟', en: 'CLOCKWORK HEARTS', blurb: '黃銅、齒輪，和會走的時間。', color: '#ffb35c' },
  C: { key: 'C', name: '寶石匣', en: 'JEWEL CASKET', blurb: '只放得下最亮的東西。', color: '#ff5fc8' },
};

// 市價（NT$）、一句說明
export const PRIZES = [
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
export const PRIZE = Object.fromEntries(PRIZES.map((p) => [p.id, p]));
export const seriesPrizes = (s) => PRIZES.filter((p) => p.series === s);
export const hiddenOf = (s) => PRIZES.find((p) => p.series === s && p.rarity === 'HID');

// 機台
// power：一般爪力 { g 夾, l 上升, c 到頂 }；strong：保夾爪力；meter：保夾門檻（次）
export const MACHINES = [
  {
    id: 'm1', name: '星砂扭蛋機', en: 'STARDUST', kind: 'pile', series: 'A', cost: 10, unlock: 0,
    theme: { body: '#123a6b', trim: '#53d6ff', accent: '#9ef0ff', floor: '#16284a', back: ['#0b1a3a', '#1b3f7a'] },
    power: { g: 1, l: 0.84, c: 0.52 }, strong: { g: 1, l: 0.96, c: 0.88 }, meter: 10,
    stock: 56, mix: { N: 0.56, R: 0.31, SR: 0.11, SSR: 0 }, ssr: 1, blackChance: 0.04,
    tip: '入門台。保夾燈集滿，下一爪就是強爪。',
  },
  {
    id: 'm2', name: '發條工坊', en: 'CLOCKWORK', kind: 'pile', series: 'B', cost: 15, unlock: 1,
    theme: { body: '#4a2410', trim: '#ffb35c', accent: '#ffd9a0', floor: '#2b1a10', back: ['#24120a', '#5a2c12'] },
    power: { g: 1, l: 0.72, c: 0.4 }, strong: { g: 1, l: 0.95, c: 0.85 }, meter: 13,
    stock: 56, mix: { N: 0.52, R: 0.33, SR: 0.13, SSR: 0 }, ssr: 1, blackChance: 0.05,
    tip: '扭蛋比較重，爪子到頂會鬆得比較多。',
  },
  {
    id: 'm3', name: '寶石推落台', en: 'JEWEL DROP', kind: 'shelf', series: 'C', cost: 15, unlock: 2,
    theme: { body: '#4a0f3c', trim: '#ff5fc8', accent: '#ffb3ea', floor: '#2a0b26', back: ['#1d0718', '#5a1048'] },
    power: { g: 0.9, l: 0.5, c: 0.3 }, strong: null, meter: 0,
    boxes: 2, mix: { R: 0.55, SR: 0.35, SSR: 0.10 },
    tip: '盒子太重夾不起來——把爪子放在盒子後面，收爪的時候會把它往前推。推到邊緣就會掉下去。越稀有的盒子放得越裡面。',
  },
  {
    id: 'm4', name: '黑金庫', en: 'BLACK VAULT', kind: 'pile', series: 'X', cost: 30, unlock: 4,
    theme: { body: '#0c0b0a', trim: '#e8c25a', accent: '#fff0b8', floor: '#141210', back: ['#080706', '#2a2212'] },
    power: { g: 1, l: 0.64, c: 0.33 }, strong: { g: 1, l: 0.93, c: 0.8 }, meter: 18,
    stock: 40, mix: { R: 0.4, SR: 0.4, SSR: 0.2 }, ssr: 6, black: 2, blackChance: 0,
    tip: '全店最硬的爪。黑金蛋開出隱藏版的機率是三分之一。',
  },
];
export const MACHINE = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

// 段位
export const RANKS = [
  { name: '路人', xp: 0 }, { name: '新手', xp: 40 }, { name: '熟客', xp: 130 }, { name: '常客', xp: 280 }, { name: '老手', xp: 500 },
  { name: '夾技師', xp: 820 }, { name: '職人', xp: 1300 }, { name: '達人', xp: 2000 }, { name: '名人', xp: 3000 }, { name: '夾神', xp: 4500 },
];
export const rankOf = (xp) => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i; return r; };

export const ECON = {
  start: 200, daily: 150, regenEvery: 45, regenCap: 100, playXp: 2, hiddenChance: 1 / 150, blackHidden: 1 / 3, openingMeter: 6,
  rankReward: (r) => 60 + 30 * r, seriesReward: 500,
};

export const CAP_R = { N: 0.05, R: 0.05, SR: 0.052, SSR: 0.064, BLK: 0.06 };
export const CAP_M = { N: 0.1, R: 0.105, SR: 0.115, SSR: 0.24, BLK: 0.22 };

// 每日任務（每天從裡面挑 3 個）
export const MISSIONS = [
  { id: 'win3', text: '夾到 3 個獎品', goal: 3, reward: 40, ev: 'win' },
  { id: 'play12', text: '投幣 12 次', goal: 12, reward: 30, ev: 'play' },
  { id: 'near2', text: '「差一點」2 次', goal: 2, reward: 35, ev: 'near' },
  { id: 'power1', text: '用強爪夾到獎品', goal: 1, reward: 50, ev: 'powerwin' },
  { id: 'rare1', text: '夾到稀有以上的獎品', goal: 1, reward: 40, ev: 'rare' },
  { id: 'sr1', text: '夾到超稀有以上的獎品', goal: 1, reward: 80, ev: 'sr' },
  { id: 'box1', text: '在推落台推落一盒', goal: 1, reward: 60, ev: 'box', need: 'm3' },
  { id: 'multi1', text: '一爪夾到兩個以上', goal: 1, reward: 90, ev: 'multi' },
  { id: 'm2play', text: '在發條工坊玩 5 次', goal: 5, reward: 40, ev: 'play:m2', need: 'm2' },
  { id: 'm4play', text: '在黑金庫玩 3 次', goal: 3, reward: 60, ev: 'play:m4', need: 'm4' },
];
