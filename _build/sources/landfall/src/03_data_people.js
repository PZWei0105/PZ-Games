'use strict';
/* ====== 人物資料：特質、手寫角色、隨機殖民者、內心話 ====== */
const SKIN = ['#f3d4b8', '#e6b994', '#c8946f', '#9a6a4c', '#6b4734'];
const SUIT = {
  crew:   { c: '#2c4a7a', trim: '#e8c25a', name: '艦組員' },
  colon:  { c: '#2f7f86', trim: '#bff3ee', name: '殖民者' },
  med:    { c: '#d9e4ec', trim: '#4fc3d9', name: '醫療' },
  sec:    { c: '#4c5a3c', trim: '#d6c48a', name: '安保' },
  corp:   { c: '#3a3d48', trim: '#c9ccd6', name: '星衡集團' },
  inmate: { c: '#d9772e', trim: '#2a2a2a', name: '受刑殖民者' },
};

const TRAITS = {
  '領袖':     { d: '說的話讓人願意相信。談話效果加倍。', pos: true },
  '冷靜':     { d: '危險與傷痛對心情的打擊減半。', pos: true },
  '勤勞':     { d: '工作速度 +15%。', pos: true },
  '懶散':     { d: '工作速度 -15%，但不太會累。', pos: false },
  '樂天':     { d: '心情 +6。', pos: true },
  '悲觀':     { d: '心情 -6。', pos: false },
  '暴躁':     { d: '容易和人起衝突；戰鬥 +2。', pos: false },
  '夜貓子':   { d: '夜裡工作不扣心情，白天比較沒精神。', pos: null },
  '話多':     { d: '更常找人聊天，交朋友快，結仇也快。', pos: null },
  '寡言':     { d: '很少主動聊天，人際變化慢。', pos: null },
  '好奇':     { d: '研究速度 +15%；看到新東西心情會變好。', pos: true },
  '固執':     { d: '對艦長的信任變化減半。', pos: null },
  '忠誠':     { d: '信任下降的速度減半。', pos: true },
  '慈祥':     { d: '身邊的人心情 +3。', pos: true },
  '體弱':     { d: '生命上限 -30%，體力活慢一些。', pos: false },
  '強壯':     { d: '生命上限 +25%，採集與建造 +10%。', pos: true },
  '學得快':   { d: '技能成長速度加倍。', pos: true },
  '手腳不乾淨': { d: '偶爾會偷偷多拿一份食物。', pos: false },
  '野心家':   { d: '對艦長的信任會慢慢流失，除非一直被重視。', pos: false },
  '失眠':     { d: '休息恢復較慢。', pos: false },
  '工作狂':   { d: '工作時心情變好，閒著反而難受。', pos: null },
  '美食家':   { d: '在食堂吃飯時心情加倍。', pos: null },
  '怕黑':     { d: '夜裡沒有燈光時心情 -5。', pos: false },
  '毒舌':     { d: '說話帶刺，和固執的人處不來，和樂天的人意外合拍。', pos: null },
  '果斷':     { d: '危險時反應快，戰鬥時不會慌。', pos: true },
  '熱心':     { d: '會優先去救倒下的人；交朋友容易。', pos: true },
};
// 特質相性（聊天時的加減）
function traitCompat(a, b) {
  let s = 0;
  const has = (p, t) => p.traits.includes(t);
  if (has(a, '毒舌') && has(b, '固執') || has(b, '毒舌') && has(a, '固執')) s -= 3;
  if (has(a, '毒舌') && has(b, '樂天') || has(b, '毒舌') && has(a, '樂天')) s += 2;
  if (has(a, '暴躁') || has(b, '暴躁')) s -= 1.5;
  if (has(a, '話多') && has(b, '寡言') || has(b, '話多') && has(a, '寡言')) s -= 1;
  if (has(a, '慈祥') || has(b, '慈祥')) s += 2;
  if (has(a, '熱心') || has(b, '熱心')) s += 1;
  if (has(a, '樂天') && has(b, '樂天')) s += 1.5;
  if (has(a, '悲觀') && has(b, '樂天') || has(b, '悲觀') && has(a, '樂天')) s += 0.5;
  if (has(a, '野心家') && has(b, '忠誠') || has(b, '野心家') && has(a, '忠誠')) s -= 1;
  if (a.age && b.age && Math.abs(a.age - b.age) < 12) s += 0.7;
  if (a.suit === b.suit) s += 0.8;
  return s;
}

/* 手寫角色
 * look: { skin, hair(樣式), hc(髮色), acc[](配件), beard(色) }
 * hair 樣式：0平頭 1旁分 2齊肩 3長直 4馬尾 5髮髻 6長辮 7捲髮 8光頭 9亂髮 10不對稱短髮 11油頭 12短捲 13雙丸子 */
const CAST = {
  weizw: {
    name: '魏子葳', g: 'm', age: 38, role: '長庚號艦長', suit: 'crew', job: 'build', leader: true,
    sk: { build: 4, gather: 3, farm: 2, craft: 3, research: 4, medic: 2, combat: 6, social: 7 },
    traits: ['領袖', '冷靜'], hue: '#7fe3ff',
    look: { skin: 1, hair: 1, hc: '#1b1714', acc: ['stubble'] },
    bio: '長庚號第三任艦長。接手時船已經航行了二十年，他的航程大半是在冬眠裡度過的。依照規定，船遇上緊急狀況時，第一個被喚醒的人是他。',
  },
  anna: {
    name: '安娜．沃爾科娃', g: 'f', age: 45, role: '輪機長', suit: 'crew', job: 'build',
    sk: { build: 9, gather: 4, farm: 1, craft: 8, research: 5, medic: 2, combat: 3, social: 3 },
    traits: ['暴躁', '工作狂'], hue: '#ffb36b', trust: 40,
    look: { skin: 0, hair: 6, hc: '#b4462a', acc: ['goggles', 'freckles'] },
    bio: '長庚號的輪機長，和引擎相處的時間比和人還長。她從不相信伴星——「機器不該替人做決定」是她的口頭禪。',
    first: '……引擎。引擎怎麼了？誰動了我的引擎？',
  },
  qin: {
    name: '秦守仁', g: 'm', age: 61, role: '安保主任', suit: 'sec', job: 'guard',
    sk: { build: 5, gather: 4, farm: 2, craft: 2, research: 1, medic: 3, combat: 9, social: 4 },
    traits: ['固執', '忠誠'], hue: '#d8e07a', trust: 35,
    look: { skin: 2, hair: 0, hc: '#a3a3a3', acc: ['scar', 'mustache'], beard: '#9a9a9a' },
    bio: '當了三十年兵，退伍後還是閒不下來，應徵了殖民船的安保主任。押送受刑殖民者登船的人就是他——他記得每一個人的編號。',
    first: '安保主任秦守仁，報到。……（他看了看四周的殘骸）看來這趟，沒有回程了。',
  },
  ye: {
    name: '葉知秋', g: 'f', age: 34, role: '外科醫師', suit: 'med', job: 'medic',
    sk: { build: 2, gather: 2, farm: 2, craft: 3, research: 5, medic: 9, combat: 1, social: 4 },
    traits: ['冷靜', '工作狂'], hue: '#9ff5e0', trust: 20,
    look: { skin: 0, hair: 4, hc: '#141214', acc: ['glasses'] },
    bio: '外科醫師。和丈夫白朗一起報名移民，說好了到新禾要種一整片桂花樹。',
    first: '我睡了多久？……白朗呢？我先生白朗，他在哪一具艙？',
  },
  bai: {
    name: '白朗', g: 'm', age: 36, role: '地質學家', suit: 'colon', job: 'gather',
    sk: { build: 4, gather: 8, farm: 3, craft: 3, research: 6, medic: 1, combat: 2, social: 6 },
    traits: ['樂天', '話多'], hue: '#ffd38a', trust: 25,
    look: { skin: 1, hair: 7, hc: '#6b4a2f', acc: ['beard'], beard: '#5a3d26' },
    bio: '地質學家，看到石頭會蹲下來看半天。冬眠前最後一刻還在跟大家講冷笑話。',
    first: '我做了好長一個夢，夢裡我在敲一顆會唱歌的石頭……知秋？知秋在哪？',
  },
  shen: {
    name: '沈鷺', g: 'f', age: 29, role: '受刑殖民者 #4471', suit: 'inmate', job: 'research',
    sk: { build: 3, gather: 2, farm: 1, craft: 6, research: 8, medic: 2, combat: 2, social: 3 },
    traits: ['夜貓子', '毒舌'], hue: '#6fd0ff', trust: -10,
    look: { skin: 0, hair: 10, hc: '#17161d', streak: '#3fb6ff', acc: ['earring'] },
    bio: '受刑殖民者，編號 4471。入獄原因：入侵星衡集團的 AI 核心。星衡集團——就是造出伴星的那家公司。',
    first: '……我還以為醒來會在監獄星。（她看了看四周）好吧，差不多。',
  },
  zhou: {
    name: '周木', g: 'm', age: 24, role: '受刑殖民者 #5120', suit: 'inmate', job: 'craft',
    sk: { build: 4, gather: 5, farm: 3, craft: 7, research: 2, medic: 1, combat: 3, social: 7 },
    traits: ['手腳不乾淨', '樂天'], hue: '#ffc46b', trust: 0,
    look: { skin: 2, hair: 9, hc: '#2b2016', acc: ['headband'] },
    bio: '受刑殖民者，編號 5120。罪名是在太空港扒了一位議員的錢包——裡面夾著一張不該存在的轉帳單。他說他只是運氣不好。',
    first: '我的天，我們墜機了？……那是不是代表，現在沒人管我了？',
  },
  sophia: {
    name: '蘇菲亞．恩科莫', g: 'f', age: 31, role: '導航員', suit: 'crew', job: 'research',
    sk: { build: 3, gather: 3, farm: 1, craft: 4, research: 6, medic: 3, combat: 5, social: 5 },
    traits: ['果斷', '失眠'], hue: '#b9a6ff', trust: 45,
    look: { skin: 4, hair: 12, hc: '#151110', acc: ['earring'] },
    bio: '長庚號的導航員。她能只靠肉眼看星空，在三分鐘內算出船的位置——這件事，整艘船只有她做得到。',
    first: '位置。給我位置。……不，先別說，讓我看天空。',
  },
  ramon: {
    name: '雷蒙．加西亞', g: 'm', age: 33, role: '廚師', suit: 'colon', job: 'farm',
    sk: { build: 3, gather: 4, farm: 6, craft: 3, research: 1, medic: 2, combat: 3, social: 8 },
    traits: ['樂天', '美食家'], hue: '#ff9a7a', trust: 25,
    look: { skin: 2, hair: 11, hc: '#1a1410', acc: ['mustache'], beard: '#1a1410' },
    bio: '廚師。在地球上開過一家只有六張桌子的小館子，倒閉那天他請所有客人吃了最後一頓。他說，新的星球需要好吃的東西。',
    first: '有誰餓了嗎？……沒有廚房？沒關係，有火就行。',
  },
  xu: {
    name: '許衡', g: 'm', age: 40, role: '星衡集團監察員', suit: 'corp', job: 'research',
    sk: { build: 2, gather: 2, farm: 1, craft: 2, research: 4, medic: 2, combat: 2, social: 6 },
    traits: ['野心家', '怕黑'], hue: '#d7dbe6', trust: -15,
    look: { skin: 0, hair: 1, hc: '#121212', acc: ['glasses'] },
    bio: '星衡集團派駐長庚號的監察員。殖民地的土地、這艘船，甚至你身上那套連身服，契約上都寫著屬於星衡。他記得每一條條款。',
    first: '我是星衡集團監察員許衡。在總部的指示到達之前，這裡的一切決策，都必須經過我。',
  },
  tang: {
    name: '唐槿', g: 'f', age: 38, role: '安保顧問', suit: 'corp', job: 'guard',
    sk: { build: 3, gather: 4, farm: 1, craft: 3, research: 2, medic: 4, combat: 9, social: 2 },
    traits: ['寡言', '忠誠'], hue: '#ff8fb1', trust: 0,
    look: { skin: 1, hair: 4, hc: '#0e0e0e', acc: ['scar'] },
    bio: '名義上是星衡集團的安保顧問，實際上是許衡的影子。她從不解釋自己，也從不多問。',
    first: '（她先確認了所有出口的位置，才開口）……許衡先生在哪一具艙？',
  },
  rani: {
    name: '拉妮．梅塔', g: 'f', age: 27, role: '生物學家', suit: 'colon', job: 'research',
    sk: { build: 2, gather: 4, farm: 7, craft: 2, research: 7, medic: 4, combat: 1, social: 5 },
    traits: ['好奇', '話多'], hue: '#a6ff9a', trust: 20,
    look: { skin: 3, hair: 3, hc: '#1d130c', acc: ['headband'] },
    bio: '生物學家。移民申請書上「志願」那一欄，她寫了一整頁：「我想成為第一個親眼看見外星生命的人。」',
    first: '空氣成分？溫度？……等一下，那是什麼？那是活的嗎？那在發光！',
  },
  deng: {
    name: '鄧鐵', g: 'm', age: 50, role: '礦工', suit: 'colon', job: 'gather',
    sk: { build: 7, gather: 9, farm: 2, craft: 4, research: 1, medic: 1, combat: 4, social: 2 },
    traits: ['寡言', '勤勞', '強壯'], hue: '#c9b38f', trust: 20,
    look: { skin: 3, hair: 8, hc: '#2a2a2a', acc: ['beard'], beard: '#3a3632' },
    bio: '在月球礦場挖了二十年。兒子沒通過移民體檢，留在了地球。他上船那天只說了一句：「去那邊，給他蓋間房子。」',
    first: '……嗯。（他看了看四周，捲起袖子）哪裡要挖？',
  },
  xiaoman: {
    name: '程小滿', g: 'f', age: 16, role: '農業學徒', suit: 'colon', job: 'farm', minor: true,
    sk: { build: 2, gather: 3, farm: 4, craft: 3, research: 3, medic: 2, combat: 1, social: 5 },
    traits: ['學得快', '樂天'], hue: '#ffa6d2', trust: 30,
    look: { skin: 0, hair: 13, hc: '#2a1a12', acc: [] },
    bio: '十六歲，船上年紀最小的殖民者之一。媽媽程薇是農藝學家，說好了到新禾要教她分辨每一種土壤。媽媽的冬眠艙，在艦橋段。',
    first: '媽？……媽媽呢？她的艙應該就在我旁邊才對啊——',
  },
  meng: {
    name: '孟清禾', g: 'f', age: 72, role: '退休教師', suit: 'colon', job: 'farm',
    sk: { build: 1, gather: 1, farm: 5, craft: 2, research: 3, medic: 4, combat: 0, social: 9 },
    traits: ['慈祥', '體弱'], hue: '#f2e6c9', trust: 35,
    look: { skin: 1, hair: 5, hc: '#e6e1d8', acc: ['glasses'] },
    bio: '教了四十五年國文。所有人都說她太老了，不該上船。她說：「總得有人記得，人是怎麼說故事的。」大家都叫她孟婆婆。',
    first: '哎呀，這一覺睡得可真久。……孩子，別慌，先坐下，喝口水。',
  },
  ouyang: {
    name: '歐陽辰', g: 'm', age: 19, role: '機電系學生', suit: 'colon', job: 'craft',
    sk: { build: 4, gather: 3, farm: 1, craft: 5, research: 5, medic: 1, combat: 2, social: 3 },
    traits: ['學得快', '夜貓子'], hue: '#8fe3ff',
    look: { skin: 0, hair: 9, hc: '#3b2a1a', acc: ['goggles'] },
    bio: '機電系大二，休學上船。他的私人行李配額，全拿來裝一台拆成零件的無人機。',
    first: '呃……這是真的嗎？還是我在 VR 裡？如果是 VR，這畫質也太好了吧。',
  },
  chengwei: {
    name: '程薇', g: 'f', age: 42, role: '農藝學家', suit: 'colon', job: 'farm', bridge: true,
    sk: { build: 3, gather: 4, farm: 9, craft: 2, research: 6, medic: 3, combat: 1, social: 5 },
    traits: ['冷靜', '勤勞'], hue: '#c6ff9e', trust: 25,
    look: { skin: 0, hair: 2, hc: '#2a1f17', acc: [] },
    bio: '農藝學家，程小滿的母親。她的冬眠艙安置在艦橋段的應急艙——全船最安全的位置。',
    first: '小滿……小滿呢？',
  },
};
// 既有關係（單向好感）
const PRE_REL = [
  ['ye', 'bai', 92, '夫妻'], ['bai', 'ye', 92, '夫妻'],
  ['chengwei', 'xiaoman', 96, '母女'], ['xiaoman', 'chengwei', 96, '母女'],
  ['shen', 'zhou', 40, '獄友'], ['zhou', 'shen', 45, '獄友'],
  ['qin', 'shen', -30], ['shen', 'qin', -35], ['qin', 'zhou', -20], ['zhou', 'qin', -15],
  ['xu', 'tang', 20, '雇主'], ['tang', 'xu', 12, '雇主'],
  ['shen', 'xu', -40], ['xu', 'shen', -30], ['anna', 'xu', -25],
  ['sophia', 'anna', 25, '同事'], ['anna', 'sophia', 22, '同事'],
  ['ramon', 'deng', 10], ['deng', 'ramon', 10], ['rani', 'bai', 15], ['bai', 'rani', 15],
];

/* 隨機殖民者 */
const NAME_POOL = {
  sur: '陳林黃張李王吳劉蔡楊鄭謝郭洪曾邱廖賴徐蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施余趙盧梁顏柯孫翁戴范宋方杜傅侯曹薛丁卓馬阮董藍石蔣古紀姚連馮湯田康姜汪鄒尤巫黎涂龔嚴韓袁金童陸夏柳邵錢伍倪溫于譚駱熊任甘顧毛章史官萬俞雷饒'.split(''),
  m: ['志明', '建宏', '冠宇', '承恩', '宇軒', '柏翰', '俊傑', '家豪', '文彬', '子安', '浩然', '正德', '明哲', '書豪', '品睿', '宗翰', '立群', '偉成', '冠廷', '博文', '致遠', '一帆', '若谷', '星河', '澤宇', '天佑', '景行', '守拙', '仲謀', '亦凡'],
  f: ['怡君', '雅婷', '佳穎', '詩涵', '欣怡', '宜蓁', '思妤', '品妍', '雨柔', '芷晴', '若曦', '靜宜', '婉婷', '舒涵', '曉彤', '映雪', '語彤', '安琪', '晴川', '素心', '知夏', '青禾', '采薇', '念慈', '如嵐', '可芸', '霽月', '書瑤'],
  fm: ['艾瑞克', '卡洛斯', '尤素夫', '健太', '盧卡', '馬特奧', '奧馬爾', '阿米爾', '伊凡', '湯瑪斯', '拉吉', '阮文'],
  ff: ['瑪莉亞', '艾瑪', '娜迪雅', '莉亞', '秀美', '索菲', '英格麗', '阿雅', '奧莉維亞', '法蒂瑪', '漢娜', '美咲'],
  fl: ['韓森', '桑托斯', '阿里', '伯格', '小林', '羅西', '門多薩', '哈利德', '佩卓娃', '科恩', '朴', '杜邦', '楊森', '奧孔科沃', '諾瓦克', '席爾瓦'],
};
const ROLES = [
  { n: '建築工', s: { build: 7, gather: 4 }, j: 'build' }, { n: '電工', s: { craft: 6, build: 5 }, j: 'craft' },
  { n: '農夫', s: { farm: 7, gather: 4 }, j: 'farm' }, { n: '護理師', s: { medic: 7, social: 4 }, j: 'medic' },
  { n: '程式設計師', s: { research: 7, craft: 3 }, j: 'research' }, { n: '機械技師', s: { craft: 7, build: 4 }, j: 'craft' },
  { n: '物流員', s: { gather: 6, build: 3 }, j: 'gather' }, { n: '獸醫', s: { medic: 6, farm: 5 }, j: 'medic' },
  { n: '小學老師', s: { social: 7, research: 3 }, j: 'farm' }, { n: '前警察', s: { combat: 7, social: 3 }, j: 'guard' },
  { n: '礦工', s: { gather: 7, build: 4 }, j: 'gather' }, { n: '水電工', s: { build: 6, craft: 5 }, j: 'build' },
  { n: '實驗室助理', s: { research: 6, medic: 3 }, j: 'research' }, { n: '會計', s: { research: 4, social: 5 }, j: 'research' },
  { n: '記者', s: { social: 7, research: 4 }, j: 'gather' }, { n: '消防員', s: { combat: 5, build: 5, medic: 3 }, j: 'guard' },
  { n: '木匠', s: { build: 6, craft: 6 }, j: 'build' }, { n: '漁夫', s: { gather: 6, farm: 4 }, j: 'gather' },
  { n: '藥師', s: { medic: 6, research: 4 }, j: 'medic' }, { n: '園藝師', s: { farm: 7, social: 3 }, j: 'farm' },
  { n: '貨運司機', s: { gather: 5, combat: 4 }, j: 'gather' }, { n: '焊工', s: { build: 5, craft: 6 }, j: 'craft' },
];
const BACKSTORY = [
  '在地球上當了十二年{r}，覺得人生一眼就能看到盡頭。',
  '抽中移民資格那天，{he}把所有家當都賣了，只留下一把舊吉他。',
  '{he}的家鄉被海平面吞掉了。新禾，是{he}第一次能自己選擇住在哪裡。',
  '離婚後報名了移民。{he}說，四十一光年應該夠遠了。',
  '為了還清家裡的債，簽了二十年的殖民勞務契約。',
  '從小看著星星長大，終於輪到{he}自己去星星上了。',
  '船上的履歷只寫了一句：「什麼都願意做。」',
  '帶著父親的骨灰上船——父親一輩子都想去宇宙看看。',
  '{he}只是想去一個沒有人認識{he}的地方。',
  '在地球上是小有名氣的{r}。{he}說這點名氣到了四十一光年外一文不值，正好。',
  '上船前一晚，{he}在海邊坐到天亮。沒有人知道{he}在想什麼。',
  '報名表上的緊急聯絡人欄位，{he}空著沒填。',
];
const FIRST_WORDS = [
  '……好冷。這裡是新禾嗎？', '我還活著？……太好了，我還活著。', '誰把燈開得這麼亮……',
  '我夢到下雨了。地球的雨。', '我們到了嗎？為什麼大家的表情這麼奇怪？', '先別跟我說話……讓我吐一下。',
  '是艦長？……出事了，對不對？', '我睡了多久？我的貓……喔對，貓沒有上船。', '這是哪裡？窗外那是……兩個月亮？',
];
const GEN_TRAITS = ['勤勞', '懶散', '樂天', '悲觀', '暴躁', '夜貓子', '話多', '寡言', '好奇', '固執', '忠誠', '強壯', '體弱', '學得快', '失眠', '工作狂', '美食家', '怕黑', '熱心', '冷靜'];
const HUES = ['#7fe3ff', '#ffb36b', '#9ff5e0', '#ffd38a', '#b9a6ff', '#ff9a7a', '#a6ff9a', '#ff8fb1', '#d8e07a', '#8fe3ff', '#f7c6ff', '#c9f0ff'];

/* 內心話（情境 → 通用句；角色專屬句另存） */
const THOUGHTS = {
  hungry: ['肚子在叫了。', '再不吃東西，我要開始啃殘骸了。', '燈果……現在連燈果都想吃。'],
  tired: ['眼皮好重。', '再撐一下就去睡。', '我現在可以站著睡著。'],
  build: ['這個角度再鎖緊一點。', '蓋好了，大家就能睡得安穩點。', '鐵板比想像中重。'],
  gather: ['這一塊應該還能拆出點東西。', '多搬一點回去，大家就多撐一天。', '手套快磨破了。'],
  farm: ['葉子比昨天多了一片。', '這裡的土是紫色的，作物會不會也長成紫色？', '慢慢長，不急。'],
  research: ['這組數據不太對……再算一次。', '有規律，一定有規律。', '如果這個假設成立的話——'],
  craft: ['再磨一下就能用了。', '把廢鐵變成有用的東西，挺療癒的。', '這個零件得拆了重做。'],
  medic: ['傷口不深，會好的。', '別亂動，馬上就好。', '藥品還夠用幾天？'],
  guard: ['那邊的草叢剛剛動了一下。', '夜裡的聲音跟白天不一樣。', '有我在，睡吧。'],
  idle: ['這裡的天空顏色真怪。', '不知道地球現在幾月了。', '風裡有一股甜甜的味道。', '要是能洗個熱水澡就好了。'],
  night: ['那些光……是蘑菇在發光嗎？', '兩個月亮。我還是不習慣。', '夜裡好安靜，靜得讓人發毛。'],
  danger: ['那是什麼東西？！', '快跑！', '別過來……別過來……'],
  hurt: ['好痛……', '我還撐得住。', '血……止不住……'],
  low: ['我們真的回得去嗎？', '我不想再撐了。', '為什麼偏偏是我們？'],
  high: ['今天其實還不錯。', '說不定，這裡會變成家。', '大家都在，就好。'],
  ground: ['地上好硬，背好痛。', '睡在泥巴上，像回到童軍營。'],
  sick: ['頭好暈，世界在轉。', '冬眠的後遺症……想吐。'],
  tide: ['天空的顏色變了。', '牠們來了……好多……', '撐過今晚，撐過今晚就好。'],
  storm: ['沙子打在臉上好痛。', '什麼都看不見了。'],
  away: ['不知道營地那邊還好嗎。'],
};
const OWN_THOUGHTS = {
  weizw: { idle: ['他們看著我。我得比他們更像知道答案的人。'], night: ['兩個月亮……我好像在哪裡見過。'], low: ['如果我早一點醒來呢？'] },
  anna: { build: ['這焊道要是在船上，我會叫他重做三遍。'], idle: ['伴星又在算什麼？我不喜歡它安靜的時候。'], night: ['引擎沒壞。引擎是被關掉的。'] },
  qin: { guard: ['三十年了，我還是聽得出不對勁的聲音。'], idle: ['那兩個囚犯，得盯緊一點。'], high: ['這群人，還算有點樣子。'] },
  ye: { medic: ['手術刀很穩。手很穩。'], idle: ['桂花樹……在這裡種得活嗎？'], low: ['我連他的艙都打不開。'] },
  bai: { gather: ['這塊岩層至少三億年！……好啦，我隨便說的。'], idle: ['知秋又在偷偷擔心我了。'], night: ['這顆星的石頭真的會唱歌，我發誓。'] },
  shen: { research: ['伴星的程式碼風格……我認得這個寫法。'], idle: ['監獄星的伙食都比這好。'], night: ['夜裡思路最清楚。'] },
  zhou: { idle: ['口袋裡多一顆燈果，不算偷吧？'], craft: ['我的手很巧的，只是以前用錯地方。'], high: ['沒人叫我編號，挺新鮮的。'] },
  sophia: { night: ['這些星座全都不對。全都不對。'], idle: ['四十一光年。這不可能是失誤。'], research: ['把航道倒推回去……'] },
  ramon: { idle: ['燈果加一點鹽，再烤一下，說不定會有驚喜。'], high: ['大家吃飽了，我就開心了。'], farm: ['好的料理，從好的土開始。'] },
  xu: { idle: ['這些資產的損失，總部會想知道是誰的責任。'], night: ['為什麼這裡這麼暗……'], low: ['沒有總部，我算什麼？'] },
  tang: { guard: ['……'], idle: ['許衡又在算計什麼。'], high: ['這裡的人，不太一樣。'] },
  rani: { idle: ['那隻燈蟲剛剛是不是在看我？！'], research: ['碳基，但又不完全是……太美了。'], night: ['整片山谷都在發光，我願意在這裡待一輩子。'] },
  deng: { gather: ['挖。'], idle: ['那小子現在應該長得比我高了。'], high: ['這房子，蓋得還行。'] },
  xiaoman: { idle: ['媽媽一定還活著。一定。'], farm: ['媽媽說，看葉子的顏色就知道土好不好。'], night: ['好想媽媽。'] },
  meng: { idle: ['孩子們今天都吃飽了沒？'], night: ['這月亮，要是李白看到了，不知道要寫幾首。'], high: ['人啊，只要還在一起，就能過下去。'] },
  ouyang: { craft: ['等零件夠了，我的無人機就能飛了！'], idle: ['這裡的重力好像比地球輕一點點？'], night: ['夜裡寫程式最有感覺。'] },
  chengwei: { farm: ['這種土，其實很肥。'], idle: ['小滿長大了。在我睡著的時候。'] },
};
