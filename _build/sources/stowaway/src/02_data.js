// ============ 資料：夜鷺號、船員、道具、計畫 ============
const T = 48;               // 一格的世界像素
const MAPW = 17, MAPH = 42; // 格數

// 房間：x,y,w,h（格）；kind 決定地板與燈色
const ROOMS = [
  { id: 'bridge', name: '艦橋', code: 'A-01', x: 4, y: 0, w: 9, h: 5, kind: 'bridge', lamps: [[6, 2.6, 'cool'], [10.8, 2.6, 'cool']] },
  { id: 'fore', name: '前段走廊', code: 'C-01', x: 7, y: 5, w: 2, h: 8, kind: 'hall', lamps: [[8, 6.6, 'cool'], [8, 10.8, 'cool']] },
  { id: 'comms', name: '通訊室', code: 'A-02', x: 2, y: 5, w: 5, h: 4, kind: 'office', lamps: [[4.4, 7, 'cool']] },
  { id: 'capt', name: '艦長室', code: 'A-03', x: 9, y: 5, w: 5, h: 4, kind: 'cabin', lamps: [[11.5, 7, 'warm']] },
  { id: 'quarters', name: '寢艙', code: 'B-01', x: 1, y: 9, w: 6, h: 5, kind: 'cabin', lamps: [[4, 11.5, 'warm']] },
  { id: 'med', name: '醫務室', code: 'B-02', x: 9, y: 9, w: 6, h: 5, kind: 'med', lamps: [[12, 11.5, 'white']] },
  { id: 'mid', name: '中段走廊', code: 'C-02', x: 7, y: 13, w: 2, h: 9, kind: 'hall', lamps: [[8, 15, 'cool'], [8, 19.6, 'cool']] },
  { id: 'mess', name: '餐廳', code: 'B-03', x: 1, y: 14, w: 6, h: 6, kind: 'mess', lamps: [[4, 17, 'warm']] },
  { id: 'cryo', name: '休眠艙', code: 'B-04', x: 9, y: 14, w: 6, h: 4, kind: 'cryo', lamps: [[12, 16, 'ice']] },
  { id: 'life', name: '維生室', code: 'D-01', x: 9, y: 18, w: 6, h: 4, kind: 'tech', lamps: [[12, 20, 'green']] },
  { id: 'storage', name: '儲藏室', code: 'D-02', x: 1, y: 20, w: 6, h: 4, kind: 'store', lamps: [[4, 22, 'warm']] },
  { id: 'aft', name: '後段走廊', code: 'C-03', x: 7, y: 22, w: 2, h: 9, kind: 'hall', lamps: [[8, 24, 'cool'], [8, 28.6, 'cool']] },
  { id: 'work', name: '工作間', code: 'D-03', x: 1, y: 24, w: 6, h: 5, kind: 'work', lamps: [[4, 26.5, 'warm']] },
  { id: 'reactor', name: '反應爐', code: 'E-01', x: 9, y: 22, w: 7, h: 7, kind: 'reactor', lamps: [[10.6, 23.6, 'amber'], [14.6, 27.6, 'amber']] },
  { id: 'cargo', name: '貨艙', code: 'F-01', x: 3, y: 31, w: 11, h: 7, kind: 'cargo', lamps: [[5.4, 33.6, 'sodium'], [11.2, 33.6, 'sodium'], [8.3, 36.4, 'sodium']] },
  { id: 'lab', name: '樣本間', code: 'F-02', x: 0, y: 31, w: 3, h: 5, kind: 'lab', lamps: [[1.5, 33.5, 'sick']] },
  { id: 'airlock', name: '氣閘', code: 'F-03', x: 14, y: 32, w: 3, h: 4, kind: 'airlock', lamps: [[15.5, 34, 'red']] },
  { id: 'dock', name: '逃生艇泊位', code: 'F-04', x: 4, y: 38, w: 7, h: 4, kind: 'dock', lamps: [[5, 38.8, 'cool'], [10, 38.8, 'cool']] },
];
const ROOM = {}; ROOMS.forEach((r, i) => { r.i = i; ROOM[r.id] = r; });

// 門：a、b 是相鄰兩格（span 沿著邊延伸幾格）；kind: door 一般、bulk 隔艙閘、airin 氣閘內門、airout 氣閘外門
const DOORS = [
  { id: 'd_bridge', a: [7, 4], b: [7, 5], span: 2, kind: 'door' },
  { id: 'd_comms', a: [6, 6], b: [7, 6], span: 1, kind: 'door' },
  { id: 'd_capt', a: [8, 6], b: [9, 6], span: 1, kind: 'door' },
  { id: 'd_quart', a: [6, 11], b: [7, 11], span: 1, kind: 'door' },
  { id: 'd_med', a: [8, 11], b: [9, 11], span: 1, kind: 'door' },
  { id: 'b_fore', a: [7, 12], b: [7, 13], span: 2, kind: 'bulk' },
  { id: 'd_qmess', a: [3, 13], b: [3, 14], span: 1, kind: 'door' },
  { id: 'd_mess', a: [6, 16], b: [7, 16], span: 1, kind: 'door' },
  { id: 'd_cryo', a: [8, 15], b: [9, 15], span: 1, kind: 'door' },
  { id: 'd_life', a: [8, 19], b: [9, 19], span: 1, kind: 'door' },
  { id: 'd_cl', a: [12, 17], b: [12, 18], span: 1, kind: 'door' },
  { id: 'd_store', a: [6, 21], b: [7, 21], span: 1, kind: 'door' },
  { id: 'b_aft', a: [7, 21], b: [7, 22], span: 2, kind: 'bulk' },
  { id: 'd_sw', a: [3, 23], b: [3, 24], span: 1, kind: 'door' },
  { id: 'd_work', a: [6, 26], b: [7, 26], span: 1, kind: 'door' },
  { id: 'd_react', a: [8, 24], b: [9, 24], span: 1, kind: 'door' },
  { id: 'd_lr', a: [11, 21], b: [11, 22], span: 1, kind: 'door' },
  { id: 'b_cargo', a: [7, 30], b: [7, 31], span: 2, kind: 'bulk' },
  { id: 'd_lab', a: [2, 33], b: [3, 33], span: 1, kind: 'door' },
  { id: 'a_in', a: [13, 33], b: [14, 33], span: 2, kind: 'airin' },
  { id: 'a_out', a: [16, 33], b: [17, 33], span: 2, kind: 'airout' },
  { id: 'd_dock', a: [7, 37], b: [7, 38], span: 2, kind: 'door' },
];

// 通風管：節點（格座標，g＝房間裡有格柵）與管段（d＝通風閘門編號）
const VENTS = [
  ['vb', 10, 1.6], ['vc', 3.2, 6.4], ['vk', 12.4, 6.2], ['j1', 7.5, 9.6], ['vq', 2.2, 12.6], ['vm', 13.2, 12.4],
  ['j2', 8.5, 14.2], ['vme', 1.8, 18.4], ['vcr', 13.6, 14.8], ['vl', 13.4, 20.4], ['j3', 8.5, 20.4], ['vs', 2, 21],
  ['vw', 1.8, 27.4], ['vr', 15.2, 24.4], ['j4', 7.5, 28.4], ['vg1', 5, 35.4], ['vg2', 12.6, 32.4], ['vlab', 1, 34.6],
  ['va', 15.6, 32.8], ['vd', 9.8, 38.8],
];
const VLINKS = [
  ['vb', 'j1'], ['vc', 'j1'], ['vk', 'j1'], ['j1', 'vq'], ['j1', 'vm'], ['j1', 'j2', 'D1'],
  ['vq', 'vme', 'D2'], ['vm', 'vcr', 'D3'], ['j2', 'vme'], ['j2', 'vcr'], ['j2', 'j3', 'D4'], ['vcr', 'vl'],
  ['vme', 'vs', 'D5'], ['j3', 'vl'], ['j3', 'vs'], ['vl', 'vr', 'D6'], ['vs', 'vw'], ['j3', 'j4', 'D7'],
  ['vw', 'j4'], ['vr', 'j4'], ['j4', 'vg1'], ['j4', 'vg2', 'D8'], ['vg1', 'vlab'], ['vg2', 'va', 'D9'], ['vg1', 'vd', 'D10'],
];

// 房間裡的東西：hide 躲藏點、box 可搜、con 主控台；s＝站的位置、p＝物件位置；blk＝擋路的格子
const PROPS = [
  // 艦橋
  { r: 'bridge', k: 'con', fn: 'bridge', name: '艦橋主控台', s: [8.5, 1.9], p: [8.5, .55] },
  { r: 'bridge', k: 'con', fn: 'power', name: '電力配置', s: [5.2, 2.2], p: [4.5, 1.3] },
  { r: 'bridge', k: 'hide', ht: 'under', name: '控制台下', s: [11.6, 2.2], p: [11.9, 1.05] },
  { r: 'bridge', k: 'box', loot: 'bridge', name: '應急櫃', s: [5.2, 4.1], p: [4.45, 4.3] },
  // 通訊室
  { r: 'comms', k: 'con', fn: 'comms', name: '通訊台', s: [3.4, 6.1], p: [2.6, 5.5] },
  { r: 'comms', k: 'box', loot: 'comms', name: '抽屜', s: [5.6, 7.9], p: [6.4, 8.4] },
  { r: 'comms', k: 'hide', ht: 'under', name: '桌子底下', s: [3.6, 8.1], p: [2.7, 8.4] },
  // 艦長室
  { r: 'capt', k: 'box', loot: 'capt', name: '艦長的櫃子', s: [13.2, 6], p: [13.8, 5.6] },
  { r: 'capt', k: 'hide', ht: 'under', name: '床底下', s: [10.3, 7.4], p: [9.8, 8.2] },
  // 寢艙
  { r: 'quarters', k: 'box', loot: 'locker', name: '阿傑的置物櫃', s: [2.5, 9.9], p: [2.5, 9.3], owner: 'jie' },
  { r: 'quarters', k: 'box', loot: 'batu', name: '巴圖的置物櫃', s: [5.5, 9.9], p: [5.5, 9.3], owner: 'batu' },
  { r: 'quarters', k: 'hide', ht: 'under', name: '下鋪', s: [2.4, 11.4], p: [1.5, 11.4] },
  { r: 'quarters', k: 'hide', ht: 'under', name: '下鋪', s: [2.4, 13.1], p: [1.5, 13.2] },
  { r: 'quarters', k: 'hide', ht: 'locker', name: '衣櫃', s: [6.2, 13.1], p: [6.6, 13.5] },
  // 醫務室
  { r: 'med', k: 'box', loot: 'med', name: '藥櫃', s: [14.2, 10.2], p: [14.7, 10.2] },
  { r: 'med', k: 'con', fn: 'heal', name: '醫療台', s: [11.4, 11.9], p: [11.4, 10.9] },
  { r: 'med', k: 'hide', ht: 'pod', name: '診療艙', s: [13.2, 13.1], p: [13.8, 13.4] },
  // 餐廳
  { r: 'mess', k: 'box', loot: 'pantry', name: '食物櫃', s: [1.6, 15], p: [1.05, 15] },
  { r: 'mess', k: 'hide', ht: 'under', name: '餐桌底下', s: [2.4, 17.5], p: [3.5, 17] },
  { r: 'mess', k: 'hide', ht: 'locker', name: '冷藏庫', s: [6.2, 19.2], p: [6.6, 19.6] },
  // 休眠艙
  { r: 'cryo', k: 'box', loot: 'cryo', name: '冷卻劑架', s: [9.8, 14.4], p: [9.2, 14.4] },
  { r: 'cryo', k: 'hide', ht: 'pod', name: '休眠艙 1', s: [13.4, 14.6], p: [14.4, 14.6] },
  { r: 'cryo', k: 'hide', ht: 'pod', name: '休眠艙 2', s: [13.4, 16.6], p: [14.4, 16.6] },
  // 維生室
  { r: 'life', k: 'con', fn: 'dampers', name: '通風閘門控制盤', s: [13.6, 18.9], p: [14.6, 18.6] },
  { r: 'life', k: 'box', loot: 'locker', name: '工具櫃', s: [14, 21.1], p: [14.7, 21.4] },
  { r: 'life', k: 'hide', ht: 'locker', name: '維修間', s: [9.8, 21.1], p: [9.2, 21.4] },
  // 儲藏室
  { r: 'storage', k: 'box', loot: 'crate', name: '貨箱', s: [1.8, 21], p: [1.2, 20.6] },
  { r: 'storage', k: 'box', loot: 'crate', name: '貨架', s: [4, 20.6], p: [4, 20.15] },
  { r: 'storage', k: 'box', loot: 'crate', name: '補給箱', s: [5.6, 23.1], p: [6.3, 23.4] },
  { r: 'storage', k: 'hide', ht: 'crate', name: '箱子後面', s: [2.2, 23.1], p: [1.5, 23.5] },
  // 工作間
  { r: 'work', k: 'con', fn: 'craft', name: '工作台', s: [3.8, 25], p: [3.8, 24.4] },
  { r: 'work', k: 'box', loot: 'work', name: '工具牆', s: [1.6, 27.4], p: [1.05, 27.4] },
  { r: 'work', k: 'hide', ht: 'locker', name: '置物櫃', s: [6.2, 28.2], p: [6.6, 28.6] },
  // 反應爐
  { r: 'reactor', k: 'con', fn: 'power', name: '電力面板', s: [10.2, 23.2], p: [9.4, 22.6] },
  { r: 'reactor', k: 'con', fn: 'selfdestruct', name: '自毀裝置', s: [15.2, 27.6], p: [15.7, 28.3] },
  { r: 'reactor', k: 'box', loot: 'crate', name: '備品箱', s: [15.2, 23.2], p: [15.7, 22.6] },
  { r: 'reactor', k: 'hide', ht: 'crate', name: '冷卻槽後面', s: [10, 28], p: [9.4, 28.5] },
  // 貨艙
  { r: 'cargo', k: 'con', fn: 'container', name: '樣本貨櫃', s: [8.2, 33.6], p: [10.5, 32.6] },
  { r: 'cargo', k: 'con', fn: 'airlock', name: '氣閘控制盤', s: [13.2, 36.6], p: [13.75, 37.3] },
  { r: 'cargo', k: 'box', loot: 'crate', name: '打撈箱', s: [4, 32], p: [3.5, 31.5] },
  { r: 'cargo', k: 'box', loot: 'crate', name: '打撈箱', s: [5.8, 36.8], p: [5.2, 37.4] },
  { r: 'cargo', k: 'box', loot: 'crate', name: '貨櫃殘骸', s: [11.8, 36.8], p: [12.5, 37.4] },
  { r: 'cargo', k: 'hide', ht: 'crate', name: '貨堆裡', s: [4.2, 35.2], p: [3.5, 35.4] },
  { r: 'cargo', k: 'hide', ht: 'crate', name: '貨堆裡', s: [12.4, 31.6], p: [13.4, 31.5] },
  // 樣本間
  { r: 'lab', k: 'box', loot: 'lab', name: '研究終端', s: [1.5, 31.6], p: [1.5, 31.05] },
  { r: 'lab', k: 'hide', ht: 'locker', name: '防護衣櫃', s: [1, 35.2], p: [.45, 35.5] },
  // 逃生艇
  { r: 'dock', k: 'con', fn: 'shuttle', name: '逃生艇艙門', s: [7.5, 38.6], p: [7.5, 39.4] },
];
const BLOCKED = [[12, 25], [13, 25], [12, 26], [13, 26], [9, 32], [10, 32], [11, 32], [9, 33], [10, 33], [11, 33],
  [5, 39], [6, 39], [7, 39], [8, 39], [9, 39], [5, 40], [6, 40], [7, 40], [8, 40], [9, 40], [5, 41], [6, 41], [7, 41], [8, 41], [9, 41],
  [3, 16], [4, 16], [3, 17], [4, 17]];

// 燈色
const LAMP = { cool: [190, 220, 255], warm: [255, 206, 150], white: [235, 245, 255], ice: [150, 220, 255], green: [170, 255, 200], amber: [255, 170, 80], sodium: [255, 190, 110], sick: [190, 255, 140], red: [255, 80, 60] };

// ============ 船員 ============
const CREW = [
  { id: 'wei', name: '魏子葳', short: '魏', role: '艦長', col: '#ff8a3d', start: [7.2, 2.4], room: 'bridge', items: [],
    skill: '穩住：同一間房的船員心跳升得慢一半。只有艦長能授權氣閘與自毀。', hair: 'under', skin: '#c99a7c', suit: '#2b3a4a' },
  { id: 'su', name: '蘇芮', short: '蘇', role: '大副', col: '#5aa8ff', start: [9.4, 2.2], room: 'bridge', items: ['tracker'],
    skill: '冷靜判讀：拿偵測器時範圍多一半；坐鎮艦橋時遠端操作沒有冷卻。', hair: 'bob', skin: '#d9ad90', suit: '#27344a' },
  { id: 'deng', name: '鄧伯', short: '鄧', role: '輪機長', col: '#ffd04a', start: [11, 24], room: 'reactor', items: ['welder'],
    skill: '這是我的船：焊接、修理快一倍；能讓反應爐超載多出兩格電。', hair: 'bald', skin: '#b88a6a', suit: '#3d3a2a' },
  { id: 'jie', name: '阿傑', short: '傑', role: '機工', col: '#86f0a0', start: [4.6, 26.4], room: 'work', items: ['lure'],
    skill: '鑽得進去：能爬進通風管；在工作台合成快一倍。', hair: 'messy', skin: '#d6a586', suit: '#2a3d33' },
  { id: 'wen', name: '溫曼', short: '溫', role: '醫官', col: '#e8e6f2', start: [12.4, 12.2], room: 'med', items: ['sedative'],
    skill: '醫官：治療快一倍；鎮定劑效果加倍。', hair: 'bun', skin: '#e2b89c', suit: '#3a3a46' },
  { id: 'batu', name: '巴圖', short: '巴', role: '保全', col: '#ff5a5a', start: [7.4, 34.2], room: 'cargo', items: ['flare'],
    skill: '老兵：武器傷害多三成，警戒時反應更快；阿傑死了他會失控。', hair: 'buzz', skin: '#a8785a', suit: '#3e2b2b' },
];
const CREWI = {}; CREW.forEach((c, i) => { c.i = i; CREWI[c.id] = c; });

// ============ 道具 ============
// rar: 1 普通 2 精良 3 稀有；stack 可疊幾個；use: throw 丟 / melee 近戰 / fire 噴火 / shoot 射 / place 放置 / self 自用 / tool 工具
const ITEMS = {
  tracker: { name: '動態偵測器', rar: 1, use: 'passive', desc: '每兩秒掃一次，會動的東西會變成光點。越近嗶得越快。' },
  flare: { name: '照明彈', rar: 1, stack: 3, use: 'throw', desc: '強光燒 25 秒。牠怕這種光，會繞開；丟在牠身上牠會放手。' },
  lure: { name: '噪音誘餌', rar: 1, stack: 2, use: 'throw', desc: '兩秒後開始響十秒，把牠引過去。同一招用多了牠會起疑。' },
  prod: { name: '電擊棒', rar: 2, use: 'melee', charges: 3, desc: '貼身電牠，讓牠僵住兩秒半。被撲倒時會自動電牠脫身。' },
  welder: { name: '焊槍', rar: 1, use: 'tool', desc: '焊死艙門或格柵。很吵，要花時間。' },
  flamer: { name: '火焰噴射器', rar: 3, use: 'fire', fuel: 100, desc: '三格內噴火。燒到牠會逃；把牠困住燒，就燒得死。' },
  fuel: { name: '燃料罐', rar: 2, use: 'place', desc: '幫噴火器加油，或放在地上當炸彈，用火或照明彈引爆。' },
  harpoon: { name: '魚叉槍', rar: 3, use: 'shoot', charges: 2, desc: '六格內射中牠，把牠釘住三秒。' },
  sentry: { name: '哨戒砲', rar: 3, use: 'place', desc: '放在房間裡，看到牠就開火（80 發）。很吵。' },
  sentrykit: { name: '哨戒砲零件', rar: 2, use: 'none', desc: '拿到工作台，加三個零件能組出哨戒砲。' },
  medkit: { name: '醫療包', rar: 1, stack: 2, use: 'heal', desc: '治好一處傷。' },
  sedative: { name: '鎮定劑', rar: 1, stack: 3, use: 'self', desc: '一分鐘內心跳大降，但動作慢一點。' },
  ln2: { name: '液氮罐', rar: 3, use: 'place', desc: '放在地上，牠一靠近就被凍住五秒。' },
};
const RARN = ['', '普通', '精良', '稀有'];
const LOOT = {
  bridge: [{ it: 'flare', w: 4 }, { it: 'parts', n: 1, w: 3 }, { it: 'medkit', w: 2 }],
  comms: [{ it: 'log', w: 5 }, { it: 'parts', n: 1, w: 3 }, { it: 'flare', w: 2 }],
  capt: [{ it: 'harpoon', w: 6 }, { it: 'log', w: 3 }, { it: 'sedative', w: 2 }],
  locker: [{ it: 'parts', n: 1, w: 4 }, { it: 'sedative', w: 3 }, { it: 'flare', w: 3 }, { it: 'prod', w: 1.4 }, { it: 'lure', w: 2 }, { it: 'medkit', w: 1 }],
  batu: [{ it: 'prod', w: 6 }, { it: 'flare', w: 2 }, { it: 'parts', n: 1, w: 2 }],
  med: [{ it: 'medkit', w: 5 }, { it: 'sedative', w: 5 }],
  pantry: [{ it: 'fuel', w: 3 }, { it: 'parts', n: 1, w: 3 }, { it: 'flare', w: 2 }, { it: 'sedative', w: 1.5 }],
  cryo: [{ it: 'ln2', w: 5 }, { it: 'parts', n: 2, w: 3 }],
  crate: [{ it: 'parts', n: 1, w: 5 }, { it: 'parts', n: 2, w: 2.5 }, { it: 'fuel', w: 3 }, { it: 'flare', w: 3 }, { it: 'sentrykit', w: 1.2 }, { it: 'medkit', w: 1.5 }, { it: 'lure', w: 1.5 }],
  work: [{ it: 'parts', n: 2, w: 5 }, { it: 'prod', w: 2 }, { it: 'lure', w: 2 }],
  lab: [{ it: 'log', w: 6 }, { it: 'sedative', w: 2 }],
};

// 工作台合成
const RECIPES = [
  { id: 'flare', out: 'flare', parts: 1, t: 4 },
  { id: 'lure', out: 'lure', parts: 2, t: 5 },
  { id: 'prod', out: 'prod', parts: 3, t: 6 },
  { id: 'flamer', out: 'flamer', parts: 4, need: 'fuel', t: 8 },
  { id: 'sentry', out: 'sentry', parts: 3, need: 'sentrykit', t: 8 },
];
// 修理
const REPAIRS = { airlock: { parts: 4, t: 16, name: '氣閘控制盤' }, shuttle: { parts: 6, t: 18, name: '逃生艇' }, sensors: { parts: 2, t: 8, name: '感測器' }, reactor: { parts: 2, t: 8, name: '反應爐' } };

// 電力
const SYSTEMS = [
  { id: 'lights', name: '照明', cost: 2, desc: '關掉就只剩紅色應急燈，船員會更怕' },
  { id: 'doors', name: '艙門動力', cost: 1, desc: '關門變慢；不能遠端開關' },
  { id: 'sensors', name: '感測器', cost: 1, desc: '艦橋才看得到全船的光點' },
  { id: 'dampers', name: '通風閘門', cost: 1, desc: '關掉就不能遠端開關閘門' },
  { id: 'life', name: '維生', cost: 1, desc: '關掉空氣會慢慢變差，大家的心跳往上爬' },
  { id: 'airlock', name: '氣閘', cost: 2, desc: '有電才能打開外門' },
];

// ============ 獵手 ============
const STAGES = [
  { name: '幼體', hp: 30, size: .5, walk: 2.6, run: 4.4, vent: 3.4, grab: 0, force: 6, dmg: 1 },
  { name: '成體', hp: 160, size: 1, walk: 1.5, run: 4.5, vent: 2.8, grab: 5, force: 4.2, dmg: 1 },
  { name: '完全體', hp: 240, size: 1.22, walk: 1.75, run: 5.1, vent: 3.2, grab: 4.2, force: 3.2, dmg: 1 },
];

// ============ 幕 ============
const ACTS = [
  { n: '第一幕', t: '空的貨櫃', stage: 0, dur: 250 },
  { n: '第二幕', t: '牠長大了', stage: 1, dur: 480 },
  { n: '第三幕', t: '最後的計畫', stage: 2, dur: 0 },
];
const PLANS = {
  airlock: { name: '拋出去', sub: '把牠引進氣閘，關上內門，打開外門', icon: 'airlock' },
  burn: { name: '燒乾淨', sub: '把牠困在房間裡，用火燒到死', icon: 'flamer' },
  abandon: { name: '棄船', sub: '啟動自毀，搭逃生艇離開夜鷺號', icon: 'shuttle' },
  wait: { name: '撐到天亮', sub: '什麼都沒準備好。撐到公司的船來', icon: 'clock' },
};
const STANCES = [
  { id: 'huddle', name: '抱在一起', sub: '同一間房的人心跳更穩（多降 15），但大家走得慢一點。', icon: 'group' },
  { id: 'split', name: '分頭找零件', sub: '搜東西快四成、更容易翻到好東西；但落單的人心跳更高。', icon: 'search' },
  { id: 'trap', name: '設陷阱', sub: '馬上拿到兩個噪音誘餌；誘餌響得更久，牠更晚才起疑。', icon: 'lure' },
];

// ============ 出航準備（分紅購買） ============
const PERKS = [
  { id: 'tracker2', name: '備用偵測器', cost: 150, desc: '魏子葳也帶一台動態偵測器出航。' },
  { id: 'stash', name: '鄧伯的私藏', cost: 150, desc: '工作台旁多一罐燃料罐。' },
  { id: 'medbag', name: '醫官的藥箱', cost: 150, desc: '溫曼多帶一支鎮定劑和一個醫療包。' },
  { id: 'calib', name: '感測器校準', cost: 200, desc: '艦橋每兩秒掃一次；偵測器範圍多兩格。' },
  { id: 'doors', name: '加固艙門', cost: 250, desc: '牠撞開艙門要多花一半時間。' },
  { id: 'calm', name: '冷靜訓練', cost: 300, desc: '所有人心跳上升速度慢兩成。' },
  { id: 'veteran', name: '老兵的直覺', cost: 300, desc: '巴圖帶著一把魚叉槍出航。' },
  { id: 'power', name: '多一格電', cost: 350, desc: '反應爐輸出七格。' },
];

// ============ 結局 ============
const ENDINGS = [
  { id: 'strangle', name: '扼殺', hint: '趁牠還小，就解決牠。' },
  { id: 'spaced', name: '拋出去', hint: '把牠送進真空。' },
  { id: 'burned', name: '燒乾淨', hint: '用火。' },
  { id: 'abandon', name: '棄船', hint: '讓夜鷺號帶著牠一起燒掉。' },
  { id: 'stowaway', name: '偷渡者', hint: '牠跟上來了。' },
  { id: 'sole', name: '唯一的倖存者', hint: '只剩一個人。' },
  { id: 'company', name: '公司的貨', hint: '什麼都沒做，撐到公司的船來。' },
  { id: 'lost', name: '全滅', hint: '夜鷺號失去聯絡。' },
  { id: 'truth', name: '真相', hint: '收齊所有調查檔案，讓溫醫官活著說出密令。' },
];
