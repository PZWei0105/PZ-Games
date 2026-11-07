'use strict';
/* ====== 世界資料：資源、建築、研究、地形、節點 ====== */
const RES = {
  food:  { name: '食物', unit: '份', color: '#f2a65a' },
  metal: { name: '金屬', unit: '', color: '#b8c7d9' },
  fiber: { name: '生質', unit: '', color: '#c08bff' },
  comp:  { name: '零件', unit: '', color: '#ffd166' },
  med:   { name: '藥品', unit: '', color: '#7ef0c4' },
  data:  { name: '資料', unit: '', color: '#6fd3ff' },
};
const RES_KEYS = ['food', 'metal', 'fiber', 'comp', 'med'];

const SKILLS = {
  build:    '建造', gather: '採集', farm: '種植', craft: '製造',
  research: '研究', medic: '醫療', combat: '戰鬥', social: '社交',
};
const SKILL_KEYS = Object.keys(SKILLS);
// 可指派的主要工作
const JOBS = {
  build:    { name: '建造', skill: 'build', icon: 'hammer' },
  gather:   { name: '採集', skill: 'gather', icon: 'pick' },
  farm:     { name: '種植', skill: 'farm', icon: 'leaf' },
  craft:    { name: '製造', skill: 'craft', icon: 'gear' },
  research: { name: '研究', skill: 'research', icon: 'flask' },
  medic:    { name: '醫療', skill: 'medic', icon: 'cross' },
  guard:    { name: '警戒', skill: 'combat', icon: 'shield' },
};
const JOB_KEYS = Object.keys(JOBS);

/* 建築
 * cost: 建材；work: 施工量；use: 運作耗電 kW；gen: 發電 kW；slots: 工作位
 * req: 需要的研究；cat: 選單分類 */
const BUILD = {
  hull: { name: '後段艙', w: 5, h: 3, hp: 3000, core: true, store: true, beds: 0,
    desc: '長庚號斷裂後僅存的後段。冬眠艙庫、軍械櫃、應急電池都在裡面。這是一切的起點。' },
  solar: { name: '太陽能板', w: 2, h: 2, hp: 160, cat: 'power', cost: { metal: 16, comp: 3 }, work: 80, gen: 12, solar: true,
    desc: '白天發電，正午最強，夜裡歸零。' },
  battery: { name: '蓄電池', w: 1, h: 1, hp: 140, cat: 'power', cost: { metal: 12, comp: 4 }, work: 60, cap: 120,
    desc: '多儲存 120 度電。喚醒冬眠艙、撐過長夜都靠它。' },
  biogen: { name: '生質發電機', w: 2, h: 2, hp: 200, cat: 'power', cost: { metal: 22, comp: 6 }, work: 110, gen: 6, burn: 1, req: 'biofuel',
    desc: '燃燒生質，日夜穩定供電。每兩小時吃掉 1 單位生質。' },
  dorm: { name: '宿舍艙', w: 2, h: 2, hp: 220, cat: 'life', cost: { fiber: 14, metal: 10 }, work: 100, beds: 4, use: 0.4,
    desc: '四張床。睡在床上，心情好得多。' },
  mess: { name: '食堂', w: 2, h: 2, hp: 180, cat: 'life', cost: { fiber: 12, metal: 6 }, work: 80, use: 0.4, seats: 6,
    desc: '熱食與聊天的地方。在這裡吃飯心情加分，大家也更容易熟起來。' },
  storage: { name: '倉庫', w: 2, h: 2, hp: 180, cat: 'life', cost: { fiber: 10, metal: 6 }, work: 70, store: true,
    desc: '採集回來的東西可以就近卸貨，少走冤枉路。' },
  medbay: { name: '醫療站', w: 2, h: 2, hp: 200, cat: 'life', cost: { metal: 14, comp: 6, fiber: 6 }, work: 110, use: 1.5, beds: 2, slots: 1, req: 'medic',
    desc: '兩張病床。傷患恢復更快；醫療人員會用生質製作藥品。' },
  research: { name: '研究台', w: 2, h: 2, hp: 180, cat: 'work', cost: { metal: 16, comp: 6 }, work: 110, use: 1.5, slots: 2,
    desc: '研究人員在這裡產出資料，解鎖新技術。' },
  workshop: { name: '工坊', w: 2, h: 2, hp: 220, cat: 'work', cost: { metal: 22, fiber: 6 }, work: 110, use: 2.5, slots: 2,
    desc: '把金屬加工成零件，也能造步槍。' },
  greenhouse: { name: '溫室', w: 3, h: 2, hp: 200, cat: 'work', cost: { fiber: 18, metal: 10, comp: 4 }, work: 140, use: 3, slots: 2, req: 'agro',
    desc: '種植改良星薯。需要農夫照顧與電力，夜裡會開紫色補光。' },
  antenna: { name: '通訊天線', w: 2, h: 2, hp: 200, cat: 'work', cost: { metal: 22, comp: 10 }, work: 130, use: 1, req: '@antenna',
    desc: '接收遠方的信號。伴星說，艦橋段的黑盒子還在發報。' },
  lamp: { name: '照明塔', w: 1, h: 1, hp: 120, cat: 'defense', cost: { metal: 6, comp: 2 }, work: 40, use: 0.3, light: 6.5, req: 'lights',
    desc: '照亮周圍。夜裡大家比較安心——但光也會引來東西。' },
  fence: { name: '圍籬', w: 1, h: 1, hp: 90, cat: 'defense', cost: { fiber: 3 }, work: 18, wall: true,
    desc: '擋住生物的去路。牠們得先咬穿它。' },
  wall: { name: '合金牆', w: 1, h: 1, hp: 260, cat: 'defense', cost: { metal: 5 }, work: 28, wall: true, req: 'struct',
    desc: '比圍籬硬得多。' },
  turret: { name: '防禦砲塔', w: 1, h: 1, hp: 170, cat: 'defense', cost: { metal: 18, comp: 9 }, work: 100, use: 0.6, range: 7.5, dmg: 13, req: 'turret',
    desc: '自動瞄準最近的敵人。斷電就停火。' },
};
const BUILD_CATS = { power: '電力', life: '生活', work: '產業', defense: '防禦' };

/* 研究 */
const TECH = {
  agro:    { name: '異星作物馴化', cost: 30, unlock: ['greenhouse'], desc: '讓星薯在這裡的紫色土壤裡活下來。解鎖溫室。' },
  lights:  { name: '照明與警戒', cost: 22, unlock: ['lamp'], desc: '解鎖照明塔。夜裡有光，人就不慌。' },
  biofuel: { name: '生質燃燒', cost: 30, unlock: ['biogen'], desc: '把傘菌樹的纖維燒成電。解鎖生質發電機。' },
  medic:   { name: '野戰醫學', cost: 34, unlock: ['medbay'], desc: '解鎖醫療站與藥品製作。' },
  crystal: { name: '晶簇共振', cost: 40, story: true, need: 'crystalSample', desc: '分析晶簇樣本裡的規律脈動。（需要先採集一份晶簇樣本）' },
  struct:  { name: '強化結構', cost: 40, unlock: ['wall'], desc: '解鎖合金牆；所有建築耐久 +30%。' },
  turret:  { name: '自動防禦', cost: 55, pre: ['lights'], unlock: ['turret'], desc: '解鎖防禦砲塔。' },
  cryo:    { name: '冬眠艙穩壓', cost: 46, desc: '喚醒耗電 60 → 40 度，甦醒後的冬眠失調大幅減輕。' },
  signal:  { name: '信號解析', cost: 48, story: true, need: 'antennaBuilt', desc: '從雜訊裡拼出黑盒子的方位。（需要先建好通訊天線）' },
  hydro:   { name: '水耕循環', cost: 64, pre: ['agro'], desc: '溫室產量 +40%。' },
  solar2:  { name: '高效光電', cost: 58, desc: '太陽能板發電 +25%。' },
  decrypt: { name: '黑盒子解密', cost: 110, story: true, need: 'blackbox', desc: '用蠻力破解黑盒子的加密。（找到黑盒子後才能研究）' },
  ballistic: { name: '彈道校正', cost: 60, pre: ['turret'], desc: '砲塔與步槍傷害 +25%。' },
  trauma:  { name: '創傷照護', cost: 52, pre: ['medic'], desc: '倒下的人不會再失血而死；治療速度 +50%。' },
};
const TECH_ORDER = ['agro', 'lights', 'biofuel', 'medic', 'crystal', 'struct', 'turret', 'cryo', 'signal', 'hydro', 'solar2', 'decrypt', 'ballistic', 'trauma'];

/* 地形 */
const T = { SOIL: 0, BURNT: 1, MOSS: 2, STONE: 3, WATER: 4, ASH: 5, GLASS: 6 };
const TERRAIN = [
  { name: '紫壤', c1: '#3b3352', c2: '#463c61', walk: 1 },
  { name: '焦土', c1: '#2a2531', c2: '#332b3a', walk: 1 },
  { name: '光蘚地', c1: '#2d3d56', c2: '#33496a', walk: 1, glow: '#58f0ff' },
  { name: '板岩地', c1: '#454b5e', c2: '#4f566b', walk: 1.25 },
  { name: '光溪', c1: '#1b5f78', c2: '#2585a0', walk: 3.5, water: true },
  { name: '灰燼', c1: '#3a3540', c2: '#443e4a', walk: 1 },
  { name: '晶化地', c1: '#43395f', c2: '#51457a', walk: 1.1, glow: '#ff7bd8' },
];

/* 地圖物件（可採集節點等） */
const NODE = {
  bush:    { name: '燈果叢', res: 'food', yield: 6, work: 26, block: false, regrow: 2 * DAY, desc: '橘色發光的果實。吃起來像沒熟的葡萄配一點鐵鏽味——但能吃。' },
  tree:    { name: '傘菌樹', res: 'fiber', yield: 9, work: 40, block: true, desc: '高大的菌柄，傘蓋底下的皺褶在夜裡發光。纖維可以當建材。' },
  rock:    { name: '礦脈岩', res: 'metal', yield: 10, work: 46, block: true, amt: 3, desc: '板岩裡夾著金屬礦脈。' },
  debris:  { name: '船體殘骸', res: 'metal', yield: 9, work: 30, block: false, bonus: { comp: 0.35 }, amt: 2, desc: '長庚號的碎片。能拆出金屬，運氣好還有零件。' },
  crate:   { name: '貨櫃殘骸', res: 'comp', yield: 6, work: 44, block: true, bonus: { metal: 1 }, amt: 2, desc: '扭曲的貨櫃，裡面多半是封裝好的零件。' },
  crystal: { name: '晶簇', res: 'data', yield: 6, work: 50, block: true, amt: 2, desc: '粉色與青色交錯的晶體，像在呼吸一樣緩慢明滅。' },
  ruin:    { name: '石碑', block: true, story: true, desc: '不屬於任何人類文明的東西。表面的紋路和晶簇的脈動同步。' },
  nest:    { name: '刺背獸巢', block: false, nest: true, desc: '刺背獸出沒的洞口。' },
};

/* 生物 */
const BEAST = {
  bug:    { name: '燈蟲', hp: 22, dmg: 3, speed: 0.36, size: 0.55, glow: '#9dff6a', range: 0.7, atkGap: 50 },
  spine:  { name: '刺背獸', hp: 95, dmg: 11, speed: 0.30, size: 1.05, glow: '#ff6a5a', range: 0.9, atkGap: 70 },
  mother: { name: '潮母', hp: 1100, dmg: 34, speed: 0.13, size: 2.6, glow: '#c78bff', range: 1.6, atkGap: 90, boss: true },
};

// 數值常數
const K = {
  N: 48,
  MIN_PER_SEC: 8,
  SUNRISE: 6, SUNSET: 18.5,
  WAKE_COST: 60, WAKE_COST_CRYO: 40,
  HULL_CAP: 200, HULL_START: 70, CRYO_DRAIN: 2.0,
  MEAL_INTERVAL: 600,
  WALK: 0.30,       // 格／遊戲分
  START_FOOD: 60,
};
