/* ============ 02 資料 ============ */
const RW = 360, FH = 240, SLAB = 20, WALLW = 16, DOORH = 128;
const VERSION = 'v1.0';

const RAR = [
  { k: 'w', name: '普通', col: '#b9c4cc', t: 1.0, val: 8, wt: .5 },
  { k: 'g', name: '精良', col: '#5fe39a', t: 1.4, val: 16, wt: .7 },
  { k: 'b', name: '稀有', col: '#4fb3ff', t: 1.9, val: 32, wt: 1 },
  { k: 'p', name: '史詩', col: '#b47cff', t: 2.5, val: 64, wt: 1.5 },
  { k: 'o', name: '傳說', col: '#ffc845', t: 3.2, val: 130, wt: 2 },
  { k: 'r', name: '神話', col: '#ff4f5e', t: 4.0, val: 260, wt: 3 },
];

/* 噪音等級說明 */
const NZ = [{ t: '極小聲', c: 'n0' }, { t: '小聲', c: 'n0' }, { t: '中等聲響', c: 'n1' }, { t: '大聲', c: 'n2' }, { t: '震耳欲聾', c: 'n3' }];

/* ---------- 武器 ---------- */
const WEAPONS = {
  rivet: {
    name: '鉚釘槍', col: '#ffcf7a', nz: 2, noise: 230, unlocked: true,
    desc: '連射鉚釘，穩定可靠。聲音中等。',
    lv: ['連射鉚釘，聲音中等', '傷害 +30%', '每次多射 1 發', '射速 +25%', '進化「重鉚」：穿透 2 個目標、傷害 +40%'],
    evo: '重鉚',
  },
  arc: {
    name: '電弧器', col: '#7fe9ff', nz: 1, noise: 110, unlocked: true,
    desc: '連鎖電擊，打在水裡會傳遍整池。很安靜，讓聆麻痺。',
    lv: ['連鎖電擊 3 個目標，水裡傳遍整池', '連鎖 +1', '傷害 +40%', '冷卻 -25%', '進化「雷暴」：每一跳都分叉，並讓小怪麻痺'],
    evo: '雷暴',
  },
  harpoon: {
    name: '魚叉砲', col: '#e8f0f4', nz: 2, noise: 200,
    desc: '重型魚叉，貫穿整排、無視甲殼。',
    lv: ['貫穿所有敵人、無視甲殼', '傷害 +35%', '冷卻 -20%', '連發 2 支', '進化「鎖鏈」：命中的敵人被釘住 1.2 秒'],
    evo: '鎖鏈',
  },
  sonic: {
    name: '聲波炮', col: '#ffa36b', nz: 4, noise: 650,
    desc: '環狀震波擊退四周。對聆傷害 ×2.5 並使牠暈眩——但整座站都聽得到。',
    lv: ['環狀震波，對聆特效', '範圍 +25%', '傷害 +40%', '冷卻 -20%', '進化「共振」：被震到的敵人 3 秒內受傷 +30%，聆暈眩更久'],
    evo: '共振',
  },
  torch: {
    name: '焊槍', col: '#ff8a3d', nz: 0, noise: 60,
    desc: '短程電漿火焰，幾乎無聲。對正在撞門的怪傷害 ×1.5。',
    lv: ['短程火焰＋灼燒，幾乎無聲', '射程 +25%', '傷害 +35%', '灼燒加倍', '進化「熔斷」：燒死的敵人會爆開'],
    evo: '熔斷',
  },
  drone: {
    name: '無人機', col: '#a6ff9e', nz: 1, noise: 70,
    desc: '跟在肩上的小型無人機，自動點射。',
    lv: ['自動點射附近敵人', '傷害 +40%', '射速 +30%', '射程 +30%', '進化「雙機」：再多一台無人機'],
    evo: '雙機',
  },
  cryo: {
    name: '冷凍霧', col: '#bfe6ff', nz: 1, noise: 80,
    desc: '向四周噴出冷凍霧，減速敵人，被減速的敵人受傷 +20%。',
    lv: ['四周冷凍霧、減速 50%', '範圍 +20%', '減速時間 +1.5 秒', '冷卻 -25%', '進化「絕對零度」：第一下直接凍住 1.2 秒'],
    evo: '絕對零度',
  },
};
const WEAPON_ORDER = ['rivet', 'arc', 'harpoon', 'torch', 'drone', 'cryo', 'sonic'];

/* ---------- 被動 ---------- */
const PASSIVES = {
  quiet: { name: '靜音襯墊', icon: 'quiet', max: 3, lv: ['所有聲響 -15%', '所有聲響再 -15%', '所有聲響再 -15%'] },
  hull: { name: '耐壓艙衣', icon: 'hull', max: 3, lv: ['最大生命 +20%', '最大生命再 +20%', '最大生命再 +20%'] },
  regen: { name: '奈米修補', icon: 'regen', max: 3, lv: ['每秒回復 0.6 生命', '每秒回復 1.2 生命', '每秒回復 1.8 生命'] },
  fins: { name: '推進鰭', icon: 'fins', max: 3, lv: ['移動速度 +8%', '移速再 +8%，水中減速減半', '移速再 +8%，水中不減速'] },
  welder: { name: '焊工手套', icon: 'welder', max: 3, lv: ['加固／修補速度 +40%，艙門耐久 +40', '速度再 +40%，耐久再 +40', '速度再 +40%，耐久再 +40'] },
  scan: { name: '掃描儀', icon: 'scan', max: 3, lv: ['搜索速度 +25%', '搜索速度再 +25%', '搜索速度再 +25%，搜索點顯示在小地圖'] },
  magnet: { name: '生物磁吸', icon: 'magnet', max: 3, lv: ['拾取範圍 +40%、經驗 +10%', '拾取範圍再 +40%、經驗再 +10%', '拾取範圍再 +40%、經驗再 +10%'] },
  conduct: { name: '導電液', icon: 'conduct', max: 3, lv: ['電擊傷害 +30%', '電擊傷害再 +30%', '電擊傷害再 +30%，電擊打聆的麻痺加倍'] },
  ballistic: { name: '彈道核心', icon: 'ballistic', max: 3, lv: ['暴擊率 +7%、暴擊傷害 +20%', '再 +7%、+20%', '再 +7%、+20%'] },
  adren: { name: '腎上腺', icon: 'adren', max: 3, lv: ['受傷後 2.5 秒移速 +35%', '加速時間 +1 秒', '受傷後多 0.4 秒無敵'] },
};

/* ---------- 敵人 ---------- */
const FOES = {
  iso: { name: '蝕甲蟲', hp: 20, spd: 72, dmg: 8, door: 7, xp: 2, r: 18, h: 26, cost: 1, wind: .35, reach: 34 },
  jelly: { name: '燈水母', hp: 14, spd: 46, dmg: 20, door: 45, xp: 2, r: 18, h: 40, cost: 1.4, fly: true, fuse: .9, blast: 78 },
  crab: { name: '鉗蟹', hp: 82, spd: 46, dmg: 15, door: 18, xp: 6, r: 28, h: 40, cost: 3, wind: .55, reach: 46, armor: .4 },
  eel: { name: '鞭鰻', hp: 30, spd: 52, wspd: 190, dmg: 13, door: 5, xp: 3, r: 20, h: 22, cost: 2, wind: .4, reach: 130, water: true },
  husk: { name: '回聲人', hp: 62, spd: 50, dmg: 12, door: 11, xp: 6, r: 18, h: 66, cost: 3, wind: .6, reach: 40, shout: true },
};
const HUSK_LINES = ['「……有人嗎？」', '「救救我……門打不開……」', '「小宋？是你嗎？」', '「媽……我好冷……」', '「別關門！別關門！」', '「站長說沒事的……」', '「我聽見你了。」', '「進來啊。」'];

/* ---------- 區段 ---------- */
const SECTORS = [
  {
    id: 0, name: '生活艙段', en: 'HABITAT', depth: 7820, cols: 3, floors: 4, T: 600, col: '#ffb347',
    themes: ['dorm', 'mess', 'med', 'dorm', 'storage', 'lounge', 'laundry', 'dorm', 'mess'],
    hunter: { hp: 1800, walk: 75, run: 155, dmg: 26, door: 70, hear: 1.5 },
    wave: { first: 40, int: 52, budget: 5, grow: 1.4 }, sleepers: 1, husks: 1,
    survivors: ['amon', 'ye', 'bai'], logs: ['1-1', '1-2', '1-3', '1-4', '1-5'],
    intro: ['生活艙段・水深 7,820 公尺', '宿舍、食堂、醫務室。二十三天前，這裡還有人在排隊打飯。'],
  },
  {
    id: 1, name: '機電艙段', en: 'ENGINEERING', depth: 7960, cols: 3, floors: 5, T: 620, col: '#ff8a3d',
    themes: ['pump', 'power', 'workshop', 'storage', 'corridor', 'pump', 'power', 'workshop'],
    hunter: { hp: 2400, walk: 80, run: 160, dmg: 31, door: 80, hear: 1.55 },
    wave: { first: 36, int: 48, budget: 6.5, grow: 1.6 }, sleepers: 2, husks: 1,
    survivors: ['kai', 'wen', 'lily'], logs: ['2-1', '2-2', '2-3', '2-4', '2-5'],
    intro: ['機電艙段・水深 7,960 公尺', '泵浦、發電機、維修通道。整座站的心臟，也是最吵的地方。'],
  },
  {
    id: 2, name: '聲學艙段', en: 'ACOUSTICS', depth: 8110, cols: 4, floors: 5, T: 640, col: '#5fe7ff',
    themes: ['sonar', 'studio', 'archive', 'office', 'sonar', 'studio', 'archive'],
    hunter: { hp: 3100, walk: 82, run: 162, dmg: 37, door: 90, hear: 1.6, shriek: true },
    wave: { first: 34, int: 46, budget: 7.5, grow: 1.8 }, sleepers: 2, husks: 2,
    survivors: ['chen', 'yuki'], logs: ['3-1', '3-2', '3-3', '3-4', '3-5'],
    intro: ['聲學艙段・水深 8,110 公尺', '他們在這裡聽海。後來，海也開始聽他們。'],
  },
  {
    id: 3, name: '標本艙段', en: 'SPECIMEN', depth: 8240, cols: 4, floors: 5, T: 660, col: '#b47cff',
    themes: ['tanks', 'autopsy', 'freezer', 'lab', 'tanks', 'lab', 'freezer'],
    hunter: { hp: 3900, walk: 85, run: 165, dmg: 41, door: 100, hear: 1.65, shriek: true },
    wave: { first: 32, int: 44, budget: 8.5, grow: 2 }, sleepers: 2, husks: 2,
    survivors: ['liang', 'tie'], logs: ['4-1', '4-2', '4-3', '4-4', '4-5'],
    intro: ['標本艙段・水深 8,240 公尺', '培養槽的燈還亮著。裡面有些東西，還在動。'],
  },
  {
    id: 4, name: '回聲深艙', en: 'THE DEEP HOLD', depth: 8400, cols: 4, floors: 6, T: 700, col: '#ff4f5e',
    themes: ['control', 'server', 'tanks', 'office', 'control', 'server', 'lab'],
    hunter: { hp: 4600, walk: 88, run: 168, dmg: 45, door: 110, hear: 1.7, shriek: true },
    wave: { first: 32, int: 42, budget: 9.5, grow: 2.1 }, sleepers: 2, husks: 3,
    survivors: ['wei', 'lu'], logs: ['5-1', '5-2', '5-3', '5-4'],
    intro: ['回聲深艙・水深 8,400 公尺', '林汐說她在這裡。'],
    final: true,
  },
];
const ENDLESS_THEMES = ['dorm', 'mess', 'med', 'pump', 'power', 'workshop', 'sonar', 'studio', 'archive', 'tanks', 'freezer', 'lab', 'server', 'control', 'storage'];

/* ---------- 房間主題 ---------- */
const THEMES = {
  airlock: { name: '氣閘艙', wall: '#1b2a33', light: 'lit' },
  dock: { name: '撤離塢', wall: '#152631', light: 'lit' },
  pod: { name: '逃生艙', wall: '#1c2731', light: 'emer' },
  dorm: { name: '宿舍', wall: '#232c33', light: 'emer' },
  mess: { name: '食堂', wall: '#26302f', light: 'lit' },
  med: { name: '醫務室', wall: '#1f2f33', light: 'lit' },
  storage: { name: '儲藏室', wall: '#252a2c', light: 'emer' },
  lounge: { name: '交誼廳', wall: '#28292f', light: 'emer' },
  laundry: { name: '洗衣房', wall: '#212d33', light: 'emer' },
  pump: { name: '泵浦室', wall: '#1d2a2e', light: 'emer' },
  power: { name: '電力室', wall: '#1d2530', light: 'lit' },
  workshop: { name: '維修工坊', wall: '#272a2b', light: 'emer' },
  corridor: { name: '維修通道', wall: '#1a2328', light: 'dark' },
  sonar: { name: '聲納室', wall: '#16262f', light: 'lit' },
  studio: { name: '錄音室', wall: '#22252c', light: 'emer' },
  archive: { name: '資料庫', wall: '#17222b', light: 'dark' },
  office: { name: '研究室', wall: '#232a30', light: 'emer' },
  tanks: { name: '培養槽區', wall: '#152a2e', light: 'emer' },
  autopsy: { name: '解剖室', wall: '#22302f', light: 'lit' },
  freezer: { name: '冷凍庫', wall: '#1f2d38', light: 'emer' },
  lab: { name: '生物實驗室', wall: '#1d2b2f', light: 'lit' },
  control: { name: '控制室', wall: '#18232c', light: 'emer' },
  server: { name: '主機房', wall: '#141f27', light: 'dark' },
  deep: { name: '收容深艙', wall: '#101c24', light: 'emer' },
};

/* ---------- 戰利品名稱 ---------- */
const LOOT_NAMES = {
  0: ['罐頭肉', '私人相簿', '保溫瓶', '耳機', '腕錶', '香菸一條', '急救藥品', '鈦合金餐具', '筆記型電腦', '紀念打火機', '寫給家人的信', '咖啡豆', '保險箱鑰匙', '珍珠項鍊'],
  1: ['鈦合金零件', '高壓閥', '軸承組', '備用保險絲', '電路板', '工具組', '耐壓纜線', '濾芯', '馬達線圈', '液壓接頭', '發電機調速器', '儀表板'],
  2: ['錄音帶', '頻譜分析儀', '水聽器', '加密硬碟', '耳罩式監聽耳機', '數位錄音機', '聲納浮標', '研究筆記', '光碟', '訊號放大器'],
  3: ['深海樣本瓶', '幼體鱗片', '組織切片', '培養液', '基因定序卡', '寄生體標本', '冷凍胚胎盒', '解剖報告', '異常聽骨'],
  4: ['資料核心', '加密金鑰', '主控權限卡', '軍方合約副本', '收容槽紀錄', '站長的硬碟', '回聲計畫原始檔'],
};
const LOOT_SUFFIX = ['', '', '（完好）', '（原廠封條）', '（極稀有）', '（獨一無二）'];

/* ---------- 生還者 ---------- */
const SURV = {
  amon: { name: '阿蒙', role: '廚師', sector: 0, perk: 'medPlus', ptxt: '醫療包回復 +30%', hue: 28,
    line: '「……你會流汗。你不是牠們。」', tes: '我在儲藏室門上寫「不要敲門」。第十五天，門外有人用小宋的聲音叫我的名字，一聲一聲，很有禮貌。我咬著毛巾坐到天亮。' },
  ye: { name: '小葉', role: '實習生', sector: 0, perk: 'search', ptxt: '搜索速度 +10%', hue: 140,
    line: '「我、我可以自己走，我很輕。」', tes: '我是來實習一個月的。我爸媽以為我在做海洋生態保育。某種意義上，好像也沒錯。' },
  bai: { name: '白姊', role: '護理長', sector: 0, perk: 'maxhp', ptxt: '最大生命 +10%', hue: 200,
    line: '「先救別人——好，我走，我走。」', tes: '宋柏霖在我那裡躺了兩天。他說牠不是在吃人，牠在找東西。後來我才懂，牠找的從來不是我們。' },
  kai: { name: '阿凱', role: '機電學徒', sector: 1, perk: 'weld', ptxt: '艙門加固速度 +30%', hue: 45,
    line: '「師父叫我別等。……我還是等了。」', tes: '師父的筆記我都留著。深艙那道海閘，他說過有一條繞道線路可以從泵房遠端開，只是還沒接完。' },
  wen: { name: '老溫', role: '電工', sector: 1, perk: 'elec', ptxt: '電擊傷害 +15%', hue: 60,
    line: '「電我管，門你管。走。」', tes: '廣播一開，整個電網都在叫。那不是電流聲，是牠們的聲音，被我們的喇叭放大了兩百倍，在牆裡面繞。' },
  lily: { name: '莉莉', role: '作業潛水員', sector: 1, perk: 'swim', ptxt: '水中移速 +25%', hue: 320,
    line: '「我認得你。北海那次，你把我們整組撈上來。」', tes: '打撈員都迷信。你知道為什麼嗎？因為海底下，真的有東西在聽。我們只是比較早承認。' },
  chen: { name: '陳博士', role: '聲學組長', sector: 2, perk: 'sonar', ptxt: '聆的預警距離 +30%', hue: 210,
    line: '「林汐……她還活著嗎？」', tes: '是我教她看頻譜的。她比我早三個月聽懂牠們在說什麼。我花了三個星期，才承認她是對的。那三個星期，死了九個人。' },
  yuki: { name: '小雪', role: '錄音工程師', sector: 2, perk: 'quiet', ptxt: '所有聲響 -10%', hue: 180,
    line: '（她在紙上寫：謝謝。）', tes: '（便條）我錄了二十三天的聲音。最可怕的不是牠們，是我們自己的廣播。它一開，連海都安靜了。' },
  liang: { name: '梁醫師', role: '生物醫學', sector: 3, perk: 'leech', ptxt: '擊殺時有機率回復生命', hue: 100,
    line: '「帶我走。我要作證，我全都記下來了。」', tes: 'Y-01 的聽覺神經比人類敏感一萬倍。牠聽得見我們的心跳。牠哭的時候，整層樓的人都睡不著，因為那聲音就在你胸口裡面。' },
  tie: { name: '鐵哥', role: '保全主任', sector: 3, perk: 'reroll', ptxt: '每局多 1 次重抽', hue: 0,
    line: '「槍早就丟了。開槍是在叫牠來吃飯。」', tes: '站長給我的命令是守住深艙。我守了三天，然後林汐來了。她什麼都沒說，只是看著我。我把鑰匙給了她。' },
  wei: { name: '林薇', role: '站長秘書', sector: 4, perk: 'credits', ptxt: '信用點 +15%', hue: 280,
    line: '「帳號、密碼、合約……我全都知道。我會說出來。」', tes: '軍方的報價單在我信箱裡，是我幫他排版的。字型、行距、頁碼，我做得很仔細。這件事，我得自己扛。' },
  lu: { name: '小陸', role: '潛艇駕駛', sector: 4, perk: 'dock', ptxt: '撤離倒數 -20%', hue: 160,
    line: '「我的船還在塢裡嗎？……算了，你的也行。」', tes: '第一天我就可以開船跑掉。我沒跑。不是因為勇敢，是因為我不知道該載誰、該丟下誰。我就坐在駕駛座上，坐了二十三天。' },
};
const SURV_ORDER = ['amon', 'ye', 'bai', 'kai', 'wen', 'lily', 'chen', 'yuki', 'liang', 'tie', 'wei', 'lu'];
const GENERIC_SURV = ['技術員 何', '研究助理 蔡', '廚工 阿春', '維修員 老吳', '實驗員 江', '清潔員 秀英', '資訊組 小方', '化驗員 簡'];

/* ---------- 藏品 ---------- */
const RELICS = [
  { id: 'earplug', name: '小宋的耳塞', sec: 0, txt: '一對沾了血的降噪耳塞。他戴著它去關冷凍庫的壓縮機。', k: 'noise', v: -.03, b: '所有聲響 -3%' },
  { id: 'knob', name: '製冰機旋鈕', sec: 0, txt: '轉到「關」就沒事了。有人用麥克筆在旁邊寫：記得轉。', k: 'search', v: .04, b: '搜索速度 +4%' },
  { id: 'watch', name: '白姊的懷錶', sec: 0, txt: '指針停在三點十四分。錶蓋裡面貼著一張小孩的大頭貼。', k: 'hp', v: 6, b: '最大生命 +6' },
  { id: 'wrench', name: '周大川的扳手', sec: 1, txt: '握把纏了好幾層膠帶，磨得發亮。上面刻著「阿凱 出師」。', k: 'weld', v: .06, b: '加固速度 +6%' },
  { id: 'pumpcap', name: '被拆開的泵浦外蓋', sec: 1, txt: '十二顆螺絲一顆都沒少，整整齊齊排成一列。不是人排的。', k: 'door', v: 8, b: '艙門耐久 +8' },
  { id: 'fuse', name: '燒黑的主保險絲', sec: 1, txt: '有人用手硬拔下來的。指紋還在上面。', k: 'dmg', v: .03, b: '傷害 +3%' },
  { id: 'phones', name: '林汐的耳機', sec: 2, txt: '左耳的海綿掉了。她總是只戴右邊——左邊留著聽人說話。', k: 'sonar', v: .08, b: '聆的預警距離 +8%' },
  { id: 'spectrum', name: '頻譜印表紙', sec: 2, txt: '三短一長。被人用紅筆圈了一百多次。', k: 'xp', v: .05, b: '經驗 +5%' },
  { id: 'castkey', name: '定向廣播鑰匙', sec: 2, txt: '沈鐸隨身帶著，從來沒有交出去過。上面有齒痕。', k: 'dmg', v: .03, b: '傷害 +3%' },
  { id: 'tag7', name: '七號櫃的名牌', sec: 3, txt: '上面有四個名字。最後一個是手寫補上去的。', k: 'crit', v: .03, b: '暴擊率 +3%' },
  { id: 'notes', name: '小雪的便條本', sec: 3, txt: '整本寫滿了同一個字：噓。', k: 'noise', v: -.03, b: '所有聲響 -3%' },
  { id: 'molt', name: 'Y-01 的蛻殼', sec: 3, txt: '很小，薄得透光，像一隻張開的手掌。', k: 'credits', v: .04, b: '信用點 +4%' },
  { id: 'medal', name: '沈鐸的獎章', sec: 4, txt: '「年度傑出領導」。背面刻著：為了更深的地方。', k: 'credits', v: .04, b: '信用點 +4%' },
  { id: 'toysub', name: '藍色潛艇模型', sec: 4, txt: '某個孩子寄給站上爸爸的生日禮物。郵戳是二十三天前。', k: 'hp', v: 6, b: '最大生命 +6' },
  { id: 'disc', name: '聆的耳盤碎片', sec: -1, txt: '摸上去是溫的。貼近耳朵，會聽到自己的心跳——比平常快一點。', k: 'hunter', v: .06, b: '對聆傷害 +6%' },
];

/* ---------- 母船整備 ---------- */
const META = [
  { id: 'hp', name: '艙衣強化', icon: 'hull', max: 5, cost: [120, 260, 450, 700, 1050], txt: l => `最大生命 +${l * 14}`, nx: '每級 +14 生命' },
  { id: 'armor', name: '減壓護甲', icon: 'armor', max: 5, cost: [150, 300, 520, 800, 1200], txt: l => `受到傷害 -${l * 4}%`, nx: '每級 -4% 受到傷害' },
  { id: 'speed', name: '推進器', icon: 'fins', max: 3, cost: [200, 450, 800], txt: l => `移動速度 +${l * 4}%`, nx: '每級 +4% 移速' },
  { id: 'quiet', name: '靜音塗層', icon: 'quiet', max: 3, cost: [220, 480, 850], txt: l => `所有聲響 -${l * 6}%`, nx: '每級 -6% 聲響' },
  { id: 'search', name: '掃描模組', icon: 'scan', max: 3, cost: [160, 360, 650], txt: l => `搜索速度 +${l * 10}%`, nx: '每級 +10% 搜索速度' },
  { id: 'magnet', name: '回收磁鐵', icon: 'magnet', max: 3, cost: [120, 280, 520], txt: l => `拾取範圍 +${l * 20}%`, nx: '每級 +20% 拾取範圍' },
  { id: 'med', name: '備用醫療包', icon: 'med', max: 2, cost: [260, 600], txt: l => `開局多 ${l} 個醫療包`, nx: '開局 +1 醫療包' },
  { id: 'decoy', name: '誘餌彈匣', icon: 'decoy', max: 2, cost: [240, 560], txt: l => `開局多 ${l} 個聲波誘餌`, nx: '開局 +1 誘餌' },
  { id: 'reroll', name: '重抽晶片', icon: 'reroll', max: 2, cost: [300, 700], txt: l => `每局多 ${l} 次重抽`, nx: '每局 +1 重抽' },
  { id: 'battery', name: '備用電池', icon: 'battery', max: 1, cost: [400], txt: l => l ? '開局帶 1 顆電池' : '', nx: '開局帶 1 顆電池' },
];

/* 星級首通獎勵：給藍圖的時機 */
const BLUEPRINT_PLAN = { 0: 'harpoon', 1: 'torch', 2: 'sonic', 3: 'drone', 4: 'cryo' };
