/* ───────────── 戰鬥資料：兵種、技能、英雄、勢力、台詞 ───────────── */

/* 傷害類型 × 目標類別 */
const DMUL = {
  bullet: { inf: 1, veh: 0.22, arm: 0.08, air: 0.45, str: 0.12 },
  ap: { inf: 0.5, veh: 1.25, arm: 1, air: 0, str: 0.7 },
  he: { inf: 1, veh: 0.7, arm: 0.45, air: 0, str: 1 },
  shell: { inf: 1, veh: 1, arm: 0.85, air: 0, str: 1.1 },
  flame: { inf: 1.3, veh: 0.35, arm: 0.12, air: 0, str: 0.8 },
  flak: { inf: 0.45, veh: 0.35, arm: 0.1, air: 1.5, str: 0.1 },
};

/* 兵種（第 1 級數值；之後依基地等級加成） */
const UDEF = {
  rifle: { name: '步槍班', en: 'RIFLES', cls: 'inf', n: 4, hp: 62, spd: 34, wk: 'ar', rng: 240, dmg: 10, dt: 'bullet', burst: 3, gap: 0.11, cd: 1.5, acc: 0.6, aa: true, nade: true, cost: 3, cap: 1,
    desc: '四人一班，會搶旗、會躲沙包、會丟手榴彈。什麼都能打，什麼都不特別強。', good: '搶旗、步兵', bad: '坦克' },
  mg: { name: '機槍組', en: 'MACHINE GUN', cls: 'inf', n: 2, hp: 80, spd: 30, wk: 'mg', rng: 290, dmg: 6, dt: 'bullet', burst: 12, gap: 0.075, cd: 1.35, acc: 0.5, aa: true, setup: 1.0, prone: true, suppress: true, cost: 4, cap: 1,
    desc: '趴下架好腳架就是一道彈幕。被壓制的敵人會趴下、打不準、走不動。', good: '步兵群、直升機', bad: '坦克、迫擊砲' },
  at: { name: '火箭兵', en: 'ANTI-TANK', cls: 'inf', n: 2, hp: 56, spd: 32, wk: 'rpg', rng: 285, dmg: 175, dt: 'ap', cd: 3.6, acc: 0.85, prefer: 'veh', cost: 4, cap: 1,
    desc: '一發穿甲火箭就能讓坦克冒煙。裝填慢，被步兵近身會很狼狽。', good: '坦克、裝甲車', bad: '步兵、直升機' },
  sniper: { name: '狙擊手', en: 'SNIPER', cls: 'inf', n: 1, hp: 52, spd: 30, wk: 'sr', rng: 480, dmg: 96, dt: 'bullet', cd: 3.0, acc: 0.9, prone: true, prefer: 'inf', cost: 3, cap: 1,
    desc: '趴在後面一槍一個。專挑機槍手、火箭兵和英雄下手。', good: '步兵、英雄', bad: '載具、砲擊' },
  flame: { name: '火焰兵', en: 'FLAMETHROWER', cls: 'inf', n: 2, hp: 100, spd: 28, wk: 'ft', rng: 125, dmg: 32, dt: 'flame', cost: 4, cap: 1,
    desc: '近距離一片火海，躲在沙包後面也沒用。要靠近才有用。', good: '躲掩體的步兵', bad: '遠程、載具' },
  mortar: { name: '迫擊砲組', en: 'MORTAR', cls: 'inf', n: 2, hp: 52, spd: 30, wk: 'ar', rng: 700, min: 170, dmg: 56, r: 46, dt: 'he', cd: 3.6, acc: 0.75, setup: 1.4, cost: 4, cap: 1,
    desc: '架在後方拋射，專砸擠在一起的人和掩體後面的人。', good: '密集步兵、機槍組', bad: '貼身的敵人' },
  apc: { name: '裝甲運兵車', en: 'APC', cls: 'veh', hp: 540, spd: 46, rng: 250, dmg: 6, dt: 'bullet', burst: 8, gap: 0.08, cd: 1.2, acc: 0.55, aa: true, carry: 4, cost: 6, cap: 0.5,
    desc: '載著一個步槍班衝到前線，打開後門放人。車上機槍邊開邊打。', good: '快速搶旗', bad: '火箭兵' },
  tank: { name: '主戰坦克', en: 'MAIN TANK', cls: 'arm', hp: 1050, spd: 24, rng: 340, dmg: 155, r: 32, dt: 'shell', cd: 3.6, acc: 0.8, coax: { rng: 260, dmg: 5, burst: 6, gap: 0.08, cd: 1.3 }, cost: 7, cap: 0.5,
    desc: '戰場上的鐵砧。主砲一發掀翻一整班，機槍掃掉剩下的。', good: '步兵、掩體、裝甲車', bad: '火箭兵、空襲、直升機' },
  aa: { name: '防空砲車', en: 'AA GUN', cls: 'veh', hp: 480, spd: 28, rng: 420, dmg: 16, dt: 'flak', burst: 6, gap: 0.09, cd: 1.0, acc: 0.7, aaOnly: false, groundRng: 260, cost: 5, cap: 0.5,
    desc: '雙管快砲對天開火，直升機的剋星。打地面也行，就是不夠痛。', good: '直升機', bad: '坦克、火箭兵' },
  mlrs: { name: '火箭砲車', en: 'ROCKET ARTILLERY', cls: 'veh', hp: 360, spd: 30, rng: 1000, min: 330, dmg: 62, r: 48, dt: 'he', salvo: 8, cd: 11, setup: 2.2, acc: 0.7, cost: 7, cap: 0,
    desc: '撐起支架、升起發射箱，八發火箭把一整片地翻過來。車很脆，要藏在後面。', good: '大片敵軍、掩體', bad: '直升機、任何貼近的東西' },
  heli: { name: '武裝直升機', en: 'GUNSHIP', cls: 'air', hp: 540, spd: 70, rng: 320, dmg: 7, dt: 'bullet', burst: 8, gap: 0.07, cd: 1.0, acc: 0.6, rockets: { n: 4, dmg: 56, r: 34, cd: 6 }, alt: 84, cost: 7, cap: 0,
    desc: '從天上掃射、打火箭。地面大多數東西打不到它，只怕防空砲車和機槍。', good: '坦克、步兵', bad: '防空砲車、機槍' },
};

/* 指揮官技能（也是卡片） */
const ABIL = {
  airstrike: { name: '空襲', en: 'AIRSTRIKE', cost: 6, cd: 28, desc: '戰機橫越戰場，沿著一條線投下五顆炸彈。', radius: 140 },
  barrage: { name: '砲擊', en: 'BARRAGE', cost: 5, cd: 20, desc: '後方砲兵朝一個區域連續轟擊三秒。', radius: 110 },
  smoke: { name: '煙幕', en: 'SMOKE', cost: 2, cd: 12, desc: '一片濃煙：裡面的敵人打不準，從外面也很難打中裡面的我軍。', radius: 115 },
  medic: { name: '空投補給', en: 'SUPPLY DROP', cost: 3, cd: 24, desc: '降落傘空投醫療箱：範圍內我軍慢慢回血，另外補 1 點補給。', radius: 110 },
  para: { name: '傘兵', en: 'PARATROOPERS', cost: 6, cd: 30, desc: '運輸機在任何位置投下五名傘兵，可以直接插到敵人背後。', radius: 60 },
};

/* 英雄：單位比一般兵強很多，還有一個可以手動放的大招 */
const HERO = {
  boiler: { name: '葛魯「鍋爐」', short: '鍋爐', kind: 'inf', pal: 'boiler', wk: 'mg', hp: 460, spd: 30, rng: 300, dmg: 7, dt: 'bullet', burst: 14, gap: 0.065, cd: 1.2, acc: 0.55, aa: true, cost: 6, scale: 1.25,
    skill: '彈雨', skillDesc: '五秒內射速三倍，正前方所有步兵被壓得抬不起頭。', scd: 22, quote: '老子的槍，從來不挑食。' },
  sparrow: { name: '蘇雀「小雀」', short: '小雀', kind: 'inf', pal: 'sparrow', wk: 'sr', hp: 170, spd: 30, rng: 580, dmg: 150, dt: 'bullet', cd: 2.6, acc: 0.95, prone: true, cost: 5, scale: 1.08,
    skill: '斬首', skillDesc: '瞄準全場最有價值的目標：步兵或英雄一槍斃命、載具直接打掉一大截。', scd: 24, quote: '……看到了。' },
  kaz: { name: '卡茲「火鼬」', short: '火鼬', kind: 'inf', pal: 'kazboss', wk: 'ft', hp: 420, spd: 34, rng: 140, dmg: 46, dt: 'flame', cost: 6, scale: 1.18,
    skill: '焦土', skillDesc: '往前噴出一道火牆，四秒內誰踩進來誰著火。', scd: 20, quote: '燒乾淨，才好重新種。' },
  holder: { name: '霍爾德「鐵砧號」', short: '鐵砧號', kind: 'tank', pal: 'holder', hp: 2300, spd: 22, rng: 360, dmg: 190, r: 36, dt: 'shell', cd: 3.2, acc: 0.85, coax: { rng: 270, dmg: 6, burst: 8, gap: 0.07, cd: 1.1 }, cost: 8, scale: 1.12,
    skill: '鐵壁', skillDesc: '六秒內吸引所有火力、承受傷害減半，結束時主砲連開兩發。', scd: 26, quote: '躲到我後面。' },
  ilya: { name: '伊莉亞「白隼」', short: '白隼', kind: 'heli', pal: 'ilya', hp: 980, spd: 84, rng: 340, dmg: 8, dt: 'bullet', burst: 10, gap: 0.06, cd: 0.9, acc: 0.65, rockets: { n: 6, dmg: 60, r: 36, cd: 5 }, alt: 90, cost: 8, scale: 1.05,
    skill: '俯衝掃射', skillDesc: '沿著整條戰線低空俯衝，一路火箭齊射。', scd: 24, quote: '抬頭。' },
};

/* 敵方指揮官 */
const RIVAL = {
  kaz: {
    name: '卡茲', title: '火鼬', faction: '焦土幫', pal: 'kaz', color: '#d0571f', emblem: 'flame',
    deck: ['rifle', 'flame', 'mortar', 'mg', 'at', 'apc'], abil: ['barrage'], hero: 'kaz',
    ai: { save: 3.5, aggr: 1.25, lane: 'weak', think: 0.7, abil: 0.6 },
    lines: {
      open: ['喲，綠皮罐頭們，早餐吃了沒？', '今天的伙食，就從你們倉庫拿。', '火鼬來收稅啦！'],
      take: ['這面旗我收下了，謝啦！', '插旗？我拔旗比較快。'],
      lose: ['嘖，那塊地本來就沒油水。', '給你給你，小氣鬼。'],
      big: ['燒起來囉——！', '孩子們，烤肉時間！'],
      low: ['喂喂喂，玩真的啊？', '撤……不，再撐一下！'],
      win: ['下次記得多帶點罐頭來。'], lose2: ['行，算你狠。'],
    },
  },
  holder: {
    name: '霍爾德', title: '鐵砧', faction: '鐵砧兵團', pal: 'holder', color: '#9c2f2a', emblem: 'anvil',
    deck: ['tank', 'rifle', 'at', 'mg', 'apc', 'mortar'], abil: ['barrage'], hero: 'holder',
    ai: { save: 8.5, aggr: 0.9, lane: 'center', think: 1.0, abil: 0.45 },
    lines: {
      open: ['鐵砧兵團，前進。', '年輕人，這裡不是你該來的地方。', '履帶不會後退。'],
      take: ['這一寸，是我們的了。', '穩住，推過去。'],
      lose: ['……打得好。', '重整隊形。'],
      big: ['裝甲推進。', '讓他們聽聽鋼鐵的聲音。'],
      low: ['守住。為了礦坑裡的人。', '還沒結束。'],
      win: ['回去吧。照顧好你的兵。'], lose2: ['……我輸了。'],
    },
  },
  ilya: {
    name: '伊莉亞', title: '白隼', faction: '白隼航空隊', pal: 'ilya', color: '#c9314a', emblem: 'wing',
    deck: ['heli', 'aa', 'sniper', 'rifle', 'at', 'apc'], abil: ['airstrike', 'smoke'], hero: 'ilya',
    ai: { save: 6.5, aggr: 1.05, lane: 'weak', think: 0.85, abil: 0.7 },
    lines: {
      open: ['子葳，好久不見。可惜是在準星裡。', '白隼起飛。你的防空在哪？', '別讓我失望，學弟。'],
      take: ['太慢了，子葳。', '從天上看，你的破綻好明顯。'],
      lose: ['哦？有長進。', '這招是老師教的吧。'],
      big: ['白隼，俯衝。', '抬頭看看。'],
      low: ['……你變強了。', '夠了，我有話要跟你說——'],
      win: ['你還不懂。等你懂了再來。'], lose2: ['終於……你終於來了。'],
    },
  },
  severin: {
    name: '塞弗林', title: '老師', faction: '白棋學院', pal: 'severin', color: '#6e1f2a', emblem: 'knight',
    deck: ['mg', 'mortar', 'sniper', 'mlrs', 'rifle', 'at', 'tank', 'aa'], abil: ['barrage', 'airstrike', 'smoke'], hero: null,
    ai: { save: 6, aggr: 0.95, lane: 'counter', think: 0.6, abil: 0.8, smart: true },
    lines: {
      open: ['學生，這一盤，你先手。', '棋盤上沒有善意，只有一步一步。', '讓我看看你學會了什麼。'],
      take: ['這一子，你下早了。', '犧牲一兵，換一條線。'],
      lose: ['很好，正如我所料。', '嗯，有意思的一步。'],
      big: ['將軍。', '這就是你們學不會的東西。'],
      low: ['……原來如此。', '你比我想的更固執。'],
      win: ['回去重讀戰史吧。'], lose2: ['你贏了。但這盤棋，從來不是你我的。'],
    },
  },
};

/* 我方通訊兵阿默的無線電 */
const RADIO = {
  deploy: { rifle: '步槍班，上！', mg: '機槍組就位！', at: '火箭兵出發！', sniper: '狙擊手找位置中。', flame: '火焰兵，燒過去！', mortar: '迫擊砲架設中！', apc: '運兵車出發！', tank: '坦克上路！', aa: '防空車就位！', mlrs: '火箭砲車展開！', heli: '直升機起飛！' },
  flagTake: ['{f} 點拿下了！', '{f} 點插上我們的旗！', '{f} 點是我們的了！'],
  flagLose: ['{f} 點失守！', '{f} 點被搶了！'],
  enemyTank: ['敵方坦克！派火箭兵！', '鋼鐵怪物來了！'],
  enemyHeli: ['天上有直升機！', '敵機！需要防空！'],
  hqHit: ['指揮部遭到攻擊！', '他們摸到家門口了！'],
  lowSupply: ['補給不夠，再等一下。'],
};

/* 指揮官技能、英雄可用與否：看基地 */
const FLAG_NAMES = ['A', 'B', 'C'];
