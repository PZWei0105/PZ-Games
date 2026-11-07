'use strict';
/* ====== 試玩關：老韓的夜班（千禧大樓）— 關卡與數值 ======
   一局：從 1F 警衛室出發，一層一層往上搜，天台敲鐘撐 30 秒撤離。
   夢魘從裂縫一波一波湧出，清完一波有 10 秒喘息；門擋得住牠們，站在門邊就會修。
   放大鏡一圈一圈搜，越稀有越久；搜到的大多當場用掉，只有值錢的記憶進背包。 */

const FH = 250;            // 樓層高度（地板到地板）
const CEIL = 206;          // 室內淨高
const FY = f => -f * FH;   // 第 f 層地板的 y

/* 放大鏡的每一圈 */
const RING = {
  G: { n: '綠', c: '#7fe08a', t: .9 },
  B: { n: '藍', c: '#5fb6ff', t: 1.4 },
  P: { n: '紫', c: '#b98aff', t: 2.2 },
  A: { n: '金', c: '#ffc94a', t: 3.2 },
  R: { n: '紅', c: '#ff4d5e', t: 4.4 },
};
/* 每一圈會開出什麼（權重） */
const RING_DROP = {
  G: [['coin', 56], ['scrap', 22], ['part', 4], ['candy', 7], ['xp', 11]],
  B: [['soul', 24], ['mem1', 30], ['coin', 22], ['part', 6], ['candy', 14]],
  P: [['mem2', 44], ['soul', 22], ['part', 6], ['candy', 10], ['coin', 14]],
  A: [['mem3', 52], ['soulG', 33], ['life', 15]],
  R: [['mem4', 60], ['soulR', 40]],
};

/* 千禧大樓（夢裡的樓層會跳：1F、7F、13F、天台） */
const SV_LEVEL = {
  title: '老韓的夜班', place: '千禧大樓',
  floors: [
    { label: '1F', name: '大廳', x1: 1350, rooms: [
      { id: 'ws0', name: '樓梯間', style: 'stair', x0: 0, x1: 150 },
      { id: 'guard', name: '警衛室', style: 'guard', x0: 150, x1: 450, lamps: [300], props: [
        { t: 'tvwall', x: 236 }, { t: 'gdesk', x: 330, spot: ['G', 'B'] }, { t: 'locker', x: 418, spot: ['G', 'G'] }] },
      { id: 'lobby', name: '大廳', style: 'lobby', x0: 450, x1: 960, lamps: [560, 850], crack: 760, props: [
        { t: 'counter', x: 545, spot: ['G', 'B', 'B'] }, { t: 'plant', x: 650, spot: ['G'] }, { t: 'revolving', x: 760 }, { t: 'sofa', x: 880, spot: ['G', 'B'] }] },
      { id: 'mail', name: '收發室', style: 'mail', x0: 960, x1: 1350, lamps: [1150], props: [
        { t: 'shelf', x: 1050, spot: ['G', 'B', 'P'] }, { t: 'parcels', x: 1180, spot: ['B', 'P'] }, { t: 'cooler', x: 1300 }] },
    ], doors: [{ x: 150, type: 'metal' }, { x: 450, type: 'glass' }, { x: 960, type: 'wood', lock: { coins: 12 } }] },
    { label: '7F', name: '辦公室', x1: 1350, rooms: [
      { id: 'ws1', name: '樓梯間', style: 'stair', x0: 0, x1: 150 },
      { id: 'meet', name: '會議室', style: 'meet', x0: 150, x1: 450, lamps: [300], props: [
        { t: 'table', x: 300, spot: ['G', 'B'] }, { t: 'projector', x: 412, spot: ['B', 'P'] }] },
      { id: 'office', name: '開放辦公區', style: 'office', x0: 450, x1: 870, lamps: [560, 760], crack: 690, props: [
        { t: 'desk', x: 520, spot: ['G', 'B'] }, { t: 'desk', x: 620, spot: ['B', 'P'] }, { t: 'copier', x: 812, spot: ['G', 'B'] }] },
      { id: 'es1', name: '樓梯間', style: 'stair', x0: 870, x1: 1020 },
      { id: 'exec', name: '主管辦公室', style: 'exec', x0: 1020, x1: 1350, lamps: [1185], props: [
        { t: 'bossdesk', x: 1150, spot: ['B', 'P', 'A'] }, { t: 'safe', x: 1298, spot: ['P', 'A', 'R'], special: { 1: 'key' } }] },
    ], doors: [{ x: 150, type: 'metal' }, { x: 450, type: 'wood' }, { x: 870, type: 'metal' }, { x: 1020, type: 'wood', lock: { coins: 35 } }] },
    { label: '13F', name: '診所', x1: 1350, rooms: [
      { id: 'ws2', name: '樓梯間', style: 'stair', x0: 0, x1: 150 },
      { id: 'wait', name: '候診室', style: 'wait', x0: 150, x1: 480, lamps: [315], props: [
        { t: 'ccounter', x: 236, spot: ['G', 'B'] }, { t: 'chairs', x: 340 }, { t: 'magazine', x: 432, spot: ['G', 'P'] }] },
      { id: 'exam', name: '診間', style: 'exam', x0: 480, x1: 870, lamps: [675], props: [
        { t: 'bed', x: 590, spot: ['B', 'P'] }, { t: 'curtain', x: 700 }, { t: 'medcab', x: 812, spot: ['P', 'A', 'R'] }] },
      { id: 'es2', name: '樓梯間', style: 'stair', x0: 870, x1: 1020 },
      { id: 'pharm', name: '藥局', style: 'pharm', x0: 1020, x1: 1350, lamps: [1185], crack: 1255, props: [
        { t: 'pshelf', x: 1090, spot: ['G', 'B', 'P'] }, { t: 'pshelf', x: 1300, spot: ['B', 'P', 'A'] }] },
    ], doors: [{ x: 150, type: 'metal' }, { x: 480, type: 'metal', lock: { key: 1 } }, { x: 870, type: 'wall' }, { x: 1020, type: 'metal' }] },
    { label: 'RF', name: '天台', x1: 1000, roof: true, rooms: [
      { id: 'ws3', name: '屋頂出口', style: 'stair', x0: 0, x1: 150 },
      { id: 'roof', name: '天台', style: 'roof', x0: 150, x1: 1000, crack: 985, props: [
        { t: 'tank', x: 300 }, { t: 'crates', x: 520, spot: ['P', 'A'] }, { t: 'antenna', x: 700 }, { t: 'bell', x: 880 }] },
    ], doors: [{ x: 150, type: 'metal' }] },
  ],
  stairs: [{ id: 'W', x0: 0, x1: 150, f0: 0, f1: 3 }, { id: 'E', x0: 870, x1: 1020, f0: 1, f1: 2 }],
  start: { f: 0, x: 300 },
  bell: { f: 3, x: 880 },
  elites: [{ type: 'watcher', f: 1, x: 1215 }, { type: 'warden', f: 2, x: 1180 }],
  survivors: [
    { id: 'cat', f: 0, x: 1268, n: '兩點的貓', kind: 'cat', line: '（牠看了你一眼，慢慢往樓梯走去。）', reward: 'parts',
      mem: { n: '兩點的貓', f: '監視器第三頻道。每晚兩點，牠從畫面左邊走到右邊。二十二年，他從沒漏看過一次。', rar: 3, val: 680 } },
    { id: 'boy', f: 1, x: 252, n: '加班的年輕人', kind: 'boy', line: '韓伯又叫我早點回家……今天我真的想回家了。', reward: 'soul',
      mem: { n: '早點回家', f: '他每天都對加班的年輕人說「早點回家」。後來那個年輕人真的回家了，再也沒回來加班。', rar: 3, val: 880 } },
    { id: 'ajuan', f: 2, x: 690, n: '阿娟', kind: 'ajuan', line: '這麼晚還在巡？便當放在警衛室了。荷包蛋……又煎老了。', reward: 'heal',
      mem: { n: '便當裡的荷包蛋', f: '每天晚上十點，阿娟送便當來。荷包蛋永遠煎得太老，他從來沒說。', rar: 4, val: 1600, life: true } },
  ],
};

/* 夢魘（數值是清醒度第 0 級） */
const SV_FOES = {
  shade:   { n: '影民', hp: 42, spd: 74, dmg: 9, rate: .95, door: 14, reach: 34, coin: .55, xp: 1, h: 52 },
  ripper:  { n: '撕紙', hp: 26, spd: 158, dmg: 6, rate: .62, door: 7, reach: 30, coin: .5, xp: 1, h: 34 },
  echo:    { n: '回音', hp: 36, spd: 62, dmg: 11, rate: 2.6, door: 6, reach: 30, coin: .8, xp: 2, h: 60, ranged: 250 },
  warden:  { n: '夢衛', hp: 430, spd: 44, dmg: 24, rate: 1.6, door: 55, reach: 58, coin: 6, xp: 8, h: 104, elite: true },
  watcher: { n: '巡夜者', hp: 260, spd: 54, dmg: 12, rate: 1.1, door: 18, reach: 36, coin: 5, xp: 6, h: 62, elite: true },
};
/* 第 n 波有誰 */
function svWaveList(n, lvl) {
  const cnt = Math.min(40, 9 + Math.round(n * 2.8) + lvl * 3), out = [];
  for (let i = 0; i < cnt; i++) {
    const r = Math.random();
    out.push(n >= 3 && r < .26 ? 'ripper' : n >= 4 && r < .4 ? 'echo' : 'shade');
  }
  if (n >= 6 && n % 2 === 0) out.push('brute');
  return out;
}

/* 夢具：自動施放，一局最多帶三件 */
const SV_TOOLS = {
  mirror: { n: '碎鏡', ic: '鏡', c: '#bff6ff',
    lv: ['每 2.8 秒射出一道光，穿過整層，路上的夢魘全打中', '光束傷害 +40%', '一次射兩道', '冷卻 −25%', '前後同時射'] },
  oil: { n: '燈油瓶', ic: '油', c: '#ffb45a',
    lv: ['每 3.6 秒往最近的一群丟燈油瓶，地上燒 3 秒', '火海範圍 +40%', '一次丟兩瓶', '燒 5 秒', '傷害 +60%，燒死的會把火傳出去'] },
  tube: { n: '日光燈管', ic: '燈', c: '#d4f1ff',
    lv: ['每 2.4 秒放電，連鎖跳 3 隻', '多跳 2 隻', '傷害 +40%', '被電到的定住 0.4 秒', '一次放兩道'] },
  clock: { n: '鬧鐘', ic: '鈴', c: '#ffe39a',
    lv: ['每 6.5 秒響一次，震退身邊的夢魘、暈 1 秒', '範圍 +30%', '冷卻 −25%', '傷害 ×2', '每響一次，附近的門修好 60'] },
  plane: { n: '紙飛機', ic: '紙', c: '#f4f1e6',
    lv: ['兩架紙飛機繞著你，輪流俯衝最近的夢魘', '多一架', '傷害 +40%', '再多一架', '俯衝會穿透'] },
  cold: { n: '冷氣', ic: '冷', c: '#9fe8ff',
    lv: ['身邊的夢魘變慢 35%，每秒受傷', '範圍 +25%', '變慢 50%', '傷害 ×2', '偶爾把夢魘凍住'] },
};
const SV_TOOL_IDS = Object.keys(SV_TOOLS);

/* 主槍與身體 */
const SV_UPS = {
  power:  { n: '重擊', ic: '重', max: 5, d: '醒槍傷害 +18%' },
  rate:   { n: '連射', ic: '連', max: 4, d: '射速 +12%' },
  multi:  { n: '齊射', ic: '齊', max: 2, d: '每次多射一發' },
  mag:    { n: '加大彈匣', ic: '匣', max: 3, d: '彈匣 +4' },
  reload: { n: '快手', ic: '換', max: 3, d: '換彈時間 −22%' },
  pierce: { n: '穿透', ic: '穿', max: 2, d: '子彈多穿過一隻' },
  crit:   { n: '要害', ic: '害', max: 4, d: '暴擊率 +8%' },
  vigor:  { n: '體魄', ic: '魄', max: 4, d: '生命上限 +25，並回 25' },
  swift:  { n: '輕步', ic: '步', max: 3, d: '移動 +10%，閃身冷卻 −10%' },
  hands:  { n: '巧手', ic: '搜', max: 4, d: '搜索速度 +25%' },
  carpenter: { n: '木工', ic: '木', max: 3, d: '修門快 60%，門的耐久 +30%' },
  magnet: { n: '吸引', ic: '吸', max: 2, d: '撿夢幣、靈光的範圍 +60%' },
};
const SV_UP_IDS = Object.keys(SV_UPS);
/* 靈光條：第 l 級要多少 */
const svXpNeed = l => Math.round(4 + l * 2.6 + l * l * .45);

/* 門 */
const DOORS = {
  wood:  { n: '木門', hp: 240, c: '#6a4a30', c2: '#8a6440' },
  glass: { n: '玻璃門', hp: 170, c: '#5d7f8e', c2: '#a8d6e6' },
  metal: { n: '防火門', hp: 380, c: '#4a5060', c2: '#7a8296' },
  wall:  { n: '牆', hp: 0 },
};

/* 刻骨（老韓這一夢）與核心 */
const HAN_DEEP = [
  ['凌晨三點的十三樓', '每天凌晨三點，他會走到十三樓的窗邊。從那裡看得見醫院。'],
  ['一百零七把鑰匙', '他閉著眼睛也知道哪一把開哪一扇門。只有一扇，他從來不開。'],
  ['交接簿最後一頁', '「一切正常。」他寫了八千次。最後一次，他寫了很久。'],
  ['值班室的收音機', '只放老歌。阿娟最愛的那一首，他每晚都等。'],
];
const HAN_CORE = { n: '第七頻道', f: '監視器第七頻道。畫面裡，醫院的長椅上坐著一個人，九個小時沒有動。' };

/* 無線電 */
const SV_RADIO = {
  start: [['man', '連上了。這是老韓的夢：千禧大樓，他守了二十二年的夜。'], ['man', '天台有座鐘。敲響它、撐三十秒，你就能醒來。']],
  search: [['man', '站在放大鏡底下就會開始搜。一圈一圈開，越稀有的越久。']],
  wave1: [['man', '牠們從大廳的旋轉門進來了。門擋得住一陣子，從門縫開槍！']],
  doorBroken: [['man', '門破了！站在門邊就會修。']],
  locked: [['man', '上鎖的門要夢幣或鑰匙。站在門前就會開。']],
  lv1: [['man', '夢主翻了個身……清醒度上來了，夢魘會變多。']],
  lv2: [['man', '他快醒了。別貪太久，天台的鐘還在等你。']],
  lv3: [['man', '清醒度快滿了！滿了的話，他心裡那個東西會出來。']],
  boss: [['boss', '……這裡是千禧大樓。夜間不開放。']],
  bossHalf: [['boss', '第七頻道，畫面正常。……一切正常。']],
  bossDie: [['boss', '交接簿……今天也寫「一切正常」。'], ['man', '鐘可以敲了！']],
  bell: [['man', '鐘響了！撐住三十秒！']],
  parts: [['man', '鐘擺零件湊齊六個了。撐不住的話，可以按「醒來」立刻離開——但夢中人帶不走。']],
  bagFull: [['man', '背包滿了。撿到更值錢的，會自己換掉最便宜的。']],
  roof: [['man', '天台到了。鐘在最右邊。']],
  rescue: [['man', '夢中人會自己走到天台。從鐘那裡撤離，才帶得走他們。']],
};
