'use strict';
/* ====== 數值資料 ====== */
const RAR = [
  { k: 0, n: '碎憶', c: '#a3a8bd', seal: '碎', v: [18, 55], glow: .35 },
  { k: 1, n: '淡憶', c: '#6fd18a', seal: '淡', v: [60, 150], glow: .5 },
  { k: 2, n: '鮮憶', c: '#5fb6ff', seal: '鮮', v: [160, 380], glow: .7 },
  { k: 3, n: '深憶', c: '#b98aff', seal: '深', v: [420, 950], glow: .9 },
  { k: 4, n: '刻骨', c: '#ffc94a', seal: '刻', v: [1100, 2600], glow: 1.2 },
  { k: 5, n: '核心', c: '#ff4d5e', seal: '核', v: [0, 0], glow: 1.4 },
];

/* 夢器（武器）：數值是 1 級；工作台每升一級傷害 +13% */
const WEAPONS = {
  revolver: { n: '醒槍', en: 'REVOLVER', d: '左輪。六發，聲音不小，每一槍都有份量。', dmg: 27, rate: 2.5, mag: 6, reload: 1.0, range: 7.0, spd: 20, spread: .035, pellets: 1, noise: 6.5, pierce: 0, knock: 130, cost: 0,
    lv3: '子彈多貫穿 1 個', lv5: '每輪最後一發必定暴擊' },
  crossbow: { n: '雨弩', en: 'CROSSBOW', d: '沒有聲音。慢，但一箭能穿過好幾個。', dmg: 48, rate: 1.7, mag: 1, reload: .6, range: 8.4, spd: 17, spread: .01, pellets: 1, noise: 0, pierce: 2, knock: 170, cost: 1500,
    lv3: '再多貫穿 1 個', lv5: '箭會在牆上反彈一次' },
  shotgun: { n: '散夢', en: 'SCATTER', d: '散彈。近距離掃倒一整排，非常吵。', dmg: 13, rate: 1.3, mag: 4, reload: 1.3, range: 4.6, spd: 18, spread: .3, pellets: 6, noise: 9.5, pierce: 0, knock: 210, cost: 2200,
    lv3: '多 2 顆彈丸', lv5: '彈丸會灼燒' },
  needle: { n: '縫線', en: 'NEEDLER', d: '連射。一根根細針，停不下來。', dmg: 9, rate: 9, mag: 30, reload: 1.5, range: 6.3, spd: 22, spread: .09, pellets: 1, noise: 4.5, pierce: 0, knock: 45, cost: 3000,
    lv3: '彈匣 +12', lv5: '每第 8 針放出連鎖' },
};
const WEAPON_ORDER = ['revolver', 'crossbow', 'shotgun', 'needle'];
const WEAPON_LV_COST = [0, 900, 1800, 3200, 5200];

/* 夢具 */
const TOOLS = {
  decoy: { n: '回聲彈', d: '丟出一顆會響的玻璃珠，附近的夢衛會過去看。', cd: 15, cost: 0 },
  incense: { n: '安眠香', d: '夢主睡得更沉：清醒度 −20。每次潛入只能點一次。', cd: 0, uses: 1, cost: 1200 },
  mirror: { n: '鏡隱', d: '5 秒內沒有誰看得見你；這段時間從任何角度都能背刺。', cd: 24, cost: 2600 },
  stun: { n: '縫影針', d: '把周圍夢衛的影子釘在地上，定身 2.5 秒。', cd: 18, cost: 3800 },
};
const TOOL_ORDER = ['decoy', 'incense', 'mirror', 'stun'];

/* 靈感（局內三選一） */
const UPS = {
  chain: { n: '連鎖', ic: '鏈', w: 10, d: l => `擊中時放電，跳到附近 ${1 + l} 個夢衛（${30 + l * 10}% 傷害）`, x: '電弧會再分岔一次' },
  pierce: { n: '穿心', ic: '穿', w: 9, d: l => `子彈多貫穿 ${l} 個，傷害 +${l * 6}%`, x: '貫穿不再減傷' },
  split: { n: '分岔', ic: '岔', w: 8, d: l => `擊中後裂成 ${l + 1} 片碎彈`, x: '碎彈也會再裂一次' },
  bounce: { n: '彈跳', ic: '彈', w: 7, d: l => `子彈在牆上反彈 ${Math.ceil(l / 2)} 次，傷害 +${l * 5}%`, x: '反彈後傷害翻倍' },
  burn: { n: '灼痕', ic: '灼', w: 8, d: l => `擊中點燃，每秒 ${4 + l * 3} 傷害，燒 3 秒`, x: '燒死的夢衛會把火傳給旁邊' },
  chill: { n: '寒夢', ic: '寒', w: 7, d: l => `擊中緩速 ${15 + l * 7}%`, x: '有機率直接凍住 1.5 秒' },
  boom: { n: '爆心', ic: '爆', w: 8, d: l => `夢衛死掉時爆開，周圍受到 ${12 + l * 9} 傷害`, x: '爆炸範圍加大一半' },
  blades: { n: '飛刃', ic: '刃', w: 8, d: l => `${l} 把飛刃繞著你轉`, x: '飛刃轉速翻倍' },
  multi: { n: '雙發', ic: '雙', w: 8, d: l => `每次多射 ${Math.ceil(l / 2)} 發（扇形）`, x: '再多 1 發' },
  rate: { n: '速射', ic: '速', w: 10, d: l => `射速 +${l * 12}%、換彈 −${l * 8}%`, x: '換彈瞬間完成' },
  power: { n: '重擊', ic: '重', w: 10, d: l => `傷害 +${l * 14}%`, x: '擊退加倍' },
  crit: { n: '暴擊', ic: '暴', w: 9, d: l => `暴擊率 +${l * 7}%、暴擊傷害 +${l * 15}%`, x: '暴擊會震暈 0.5 秒' },
  vigor: { n: '厚夢', ic: '厚', w: 7, d: l => `生命上限 +${l * 20}，並回復 30`, x: '回復全部生命' },
  regen: { n: '回春', ic: '春', w: 7, d: l => `每殺一隻回 ${l} 點，每秒回 ${(l * .4).toFixed(1)} 點`, x: '每殺一隻回 8 點' },
  swift: { n: '輕步', ic: '輕', w: 7, d: l => `移動 +${l * 7}%、跑步聲範圍 −${l * 12}%`, x: '跑步也沒有聲音' },
  shadow: { n: '潛影', ic: '潛', w: 7, d: l => `被發現的速度 −${l * 14}%、背刺距離 +${l * 12}%`, x: '背刺後 2 秒隱身' },
  hands: { n: '巧手', ic: '巧', w: 7, d: l => `搜索速度 +${l * 22}%`, x: '每個櫃子多掉一段記憶' },
  eye: { n: '慧眼', ic: '眼', w: 6, d: l => `夢燈範圍 +${l * 8}%；裡面有好東西的櫃子會發光`, x: '看得到櫃子裡最好的那段' },
  calm: { n: '沉眠', ic: '眠', w: 7, d: l => `清醒度上升 −${l * 8}%`, x: '背刺會讓清醒度 −1' },
  magnet: { n: '磁吸', ic: '吸', w: 6, d: l => `夢屑與憶珀的吸取範圍 +${l * 35}%`, x: '整層的夢屑都會飛過來' },
  dash: { n: '閃身', ic: '閃', w: 7, d: l => `閃身冷卻 −${l * 10}%${l >= 3 ? '；穿過的夢衛受傷' : ''}`, x: '閃身後留下殘影吸引夢衛' },
  ward: { n: '護符', ic: '符', w: 6, d: l => `每 ${(14 - l * 1.6).toFixed(1)} 秒擋下一次傷害`, x: '擋下時震開周圍' },
};
const UP_IDS = Object.keys(UPS);
const xpNeed = l => Math.round(4 + l * 3 + l * l * .35);

/* 工作台（永久） */
const META = {
  bag: { n: '背包', ic: '囊', d: l => `能帶出來的記憶：${[8, 10, 12, 14][l]} 格`, max: 3, cost: [1200, 3000, 6500] },
  pocket: { n: '保險格', ic: '鎖', d: l => `迷失時也帶得走：${l + 1} 格`, max: 2, cost: [2500, 7000] },
  hp: { n: '體魄', ic: '魄', d: l => `生命上限 ${100 + l * 15}`, max: 5, cost: [600, 1200, 2200, 3600, 5500] },
  lantern: { n: '夢燈', ic: '燈', d: l => `夢燈範圍 +${l * 12}%，搜索速度 +${l * 8}%`, max: 3, cost: [800, 2000, 4000] },
  dash: { n: '閃身', ic: '閃', d: l => `閃身次數 ${1 + l}`, max: 1, cost: [3500] },
  candy: { n: '糖罐', ic: '糖', d: l => `醒神糖最多帶 ${3 + l * 2} 顆`, max: 1, cost: [1500] },
  start: { n: '起手靈感', ic: '靈', d: l => l ? '每次入夢先拿一個靈感' : '每次入夢先拿一個隨機靈感', max: 1, cost: [4000] },
};
const META_ORDER = ['bag', 'pocket', 'hp', 'lantern', 'dash', 'candy', 'start'];
const CANDY_PRICE = 100;

/* 夢衛（敵人）基礎數值；速度單位：格/秒 */
const FOES = {
  shade: { n: '影民', hp: 34, r: 15, spd: 1.5, aspd: 2.45, dmg: 10, xp: 1, notice: 1.9 },
  watcher: { n: '巡夜者', hp: 44, r: 15, spd: 1.25, aspd: 2.2, dmg: 7, xp: 2, notice: 1.6, cone: 5.6, fov: .6 },
  ripper: { n: '撕紙', hp: 30, r: 14, spd: 1.9, aspd: 2.6, dmg: 13, xp: 2, notice: 2.1 },
  echo: { n: '回音', hp: 38, r: 15, spd: 1.4, aspd: 1.9, dmg: 9, xp: 2, notice: 2.3 },
  cocoon: { n: '蛹', hp: 58, r: 18, spd: 0, aspd: 0, dmg: 0, xp: 3, notice: 2.2 },
  warden: { n: '夢衛', hp: 310, r: 25, spd: 1.15, aspd: 1.75, dmg: 22, xp: 10, notice: 2.4 },
};

/* 副委託 */
const SIDE = [
  { id: 'quiet', n: '無聲', d: '清醒度 60% 以下撤離', r: 450 },
  { id: 'deep', n: '深潛', d: '潛到深眠以下再撤離', r: 550 },
  { id: 'ghost', n: '幽靈', d: '背刺 5 次', r: 500 },
  { id: 'purge', n: '清掃', d: '解決 30 個夢衛', r: 400 },
  { id: 'rich', n: '大單', d: '帶出總值 3000 以上的記憶', r: 600 },
  { id: 'blue', n: '鮮貨', d: '帶出 3 段鮮憶以上的記憶', r: 500 },
];
