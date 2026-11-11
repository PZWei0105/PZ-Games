// ============ 敵人 ============
// row：front 前排｜back 後排｜air 空中（視同後排，近身打不到）
// move：mult 倍率、delay 延遲、tgt 目標（rand 隨機｜low 血最少｜weak 護甲最低｜threat 傷害最高｜stance 擺架勢的人｜aloft 浮空中的人｜all 全隊｜self）
//       melee 近身（會吃反擊）、charge:{t 蓄力時間, pips 穩固}、cd 冷卻（自己的回合數）、prio 優先、cond 條件
const FOE = {
  hound: {
    n: '拾骸犬', row: 'front', hp: 60, atk: 12, arm: 0, spd: 120, w: 1, xp: 9, coin: [3, 6], look: 'hound',
    lore: '城還在飛的時候，牠們的祖先是看門犬。現在牠們看的是誰先倒下。',
    traits: [{ k: 'pack', n: '圍獵', d: '場上每多一隻別的拾骸犬，牠的傷害 +20%。先殺哪一隻，差很多。' }],
    moves: [
      { id: 'bite', n: '撕咬', mult: 1.0, delay: 85, tgt: 'rand', melee: true, w: 3, fx: 'bite' },
      { id: 'pounce', n: '撲咬', mult: 1.2, delay: 110, tgt: 'low', melee: true, cd: 2, w: 2, fx: 'pounce' },
    ],
  },
  spitter: {
    n: '吐酸蜥', row: 'back', hp: 56, atk: 11, arm: 0, spd: 100, w: 1, xp: 10, coin: [3, 7], look: 'spitter',
    lore: '喉囊裡的東西，能把庭造的銅門蝕出一個洞。',
    traits: [{ k: 'acid', n: '蝕液', d: '牠的攻擊附帶鏽蝕 1 層：你的護甲會越打越薄。' }],
    moves: [
      { id: 'spit', n: '吐酸', mult: .9, delay: 95, tgt: 'rand', rustHero: 1, w: 3, fx: 'spit' },
      { id: 'rain', n: '酸雨', mult: .55, delay: 100, tgt: 'all', rustHero: 1, charge: { t: 60, pips: 1 }, cd: 3, w: 2, cond: 'round2', fx: 'acidrain' },
    ],
  },
  crab: {
    n: '負骸蟹', row: 'front', hp: 190, atk: 15, arm: 30, spd: 78, w: 3, xp: 20, coin: [6, 12], look: 'crab',
    lore: '牠背上那塊窗框，原本朝著東邊，每天第一個照到太陽。',
    traits: [{ k: 'shell', n: '背殼', d: '受到的傷害 −40%。牠失衡或浮空的時候，殼就護不住了。' }],
    moves: [
      { id: 'pinch', n: '鉗擊', mult: 1.0, delay: 100, tgt: 'rand', melee: true, w: 3, fx: 'claw' },
      { id: 'crush', n: '鉗碎', mult: 2.6, delay: 110, tgt: 'rand', melee: true, charge: { t: 70, pips: 2 }, cd: 3, prio: 1, cond: 'notFirst', fx: 'crush' },
    ],
  },
  warden: {
    n: '鏽衛・戟', row: 'front', hp: 170, atk: 15, arm: 24, spd: 85, w: 3, xp: 20, coin: [6, 12], look: 'warden',
    lore: '高庭的庭衛。三百年沒有人給牠們下過新的命令，所以舊的還算數。',
    traits: [{ k: 'formation', n: '列陣', d: '身邊站著別的鏽衛時，雙方受到的傷害 −20%。拆開牠們。' }],
    moves: [
      { id: 'thrust', n: '戟刺', mult: 1.0, delay: 100, tgt: 'rand', melee: true, w: 3, fx: 'thrust' },
      { id: 'sweep', n: '橫掃', mult: 1.1, delay: 110, tgt: 'all', melee: true, charge: { t: 60, pips: 2 }, cd: 3, prio: 1, cond: 'notFirst', fx: 'sweep' },
    ],
  },
  arbalest: {
    n: '鏽衛・弩', row: 'back', hp: 115, atk: 16, arm: 14, spd: 92, w: 2, xp: 16, coin: [5, 10], look: 'arbalest',
    lore: '牠瞄準的時候不呼吸。牠本來就不呼吸。',
    traits: [{ k: 'braced', n: '架弩', d: '上次行動之後沒被打過的話，傷害 +40%。別讓牠安穩地瞄。' }],
    moves: [
      { id: 'shot', n: '弩擊', mult: 1.0, delay: 105, tgt: 'weak', w: 3, fx: 'xbolt' },
      { id: 'pierce', n: '穿釘', mult: 2.0, delay: 110, tgt: 'weak', pierce: true, charge: { t: 50, pips: 1 }, cd: 3, prio: 1, cond: 'notFirst', fx: 'pierce' },
    ],
  },
  drone: {
    n: '巡燈', row: 'air', hp: 50, atk: 8, arm: 0, spd: 118, w: 0, xp: 8, coin: [3, 6], look: 'drone',
    lore: '牠照過的每一個人都登記在案。',
    traits: [{ k: 'hover', n: '懸浮', d: '永遠算浮空：墜擊打牠傷害加倍。近身招碰不到，除非把牠拖下來。' }],
    moves: [
      { id: 'lit', n: '照準', mult: 0, delay: 70, tgt: 'threat', lit: 2, cd: 3, prio: 1, fx: 'beam' },
      { id: 'zap', n: '電擊', mult: .7, delay: 80, tgt: 'rand', w: 3, fx: 'zap' },
      { id: 'alarm', n: '警鈴', mult: 0, delay: 100, tgt: 'self', summon: ['warden'], charge: { t: 120, pips: 1 }, once: true, prio: 2, cond: 'round2', fx: 'alarm' },
    ],
  },
  unmoored: {
    n: '失重者', row: 'front', hp: 105, atk: 13, arm: 0, spd: 95, w: 1, xp: 12, coin: [2, 5], look: 'unmoored',
    lore: '在浮石旁邊待太久的人。先是腳離地，然後是別的。嘴裡還念著一個名字。',
    traits: [{ k: 'burst', n: '失重爆散', d: '死的時候，相鄰的敵人浮力 2。用近身招打死它的人，自己也吃浮力 2。' }],
    moves: [
      { id: 'grab', n: '攫抱', mult: 1.0, delay: 95, tgt: 'rand', melee: true, heroLift: 1, w: 3, fx: 'grab' },
      { id: 'wail', n: '哀鳴', mult: 0, delay: 100, tgt: 'all', heroDelay: 20, momLoss: 1, charge: { t: 50, pips: 1 }, cd: 3, w: 2, cond: 'round2', fx: 'wail' },
    ],
  },
  moss: {
    n: '淵苔團', row: 'front', hp: 180, atk: 13, arm: 5, spd: 80, w: 2, xp: 18, coin: [4, 9], look: 'moss',
    lore: '淵裡沒有光，所以它自己長了一點。',
    traits: [{ k: 'moss', n: '苔毯', d: '每次行動長 1 層苔（最多 3），每層讓它回 5% 生命；有苔的時候打不浮。被灼燒一次掉 1 層，灼燒對它傷害加倍。沒被燒死的話會裂成兩個苔孢。' }],
    moves: [
      { id: 'whip', n: '苔鞭', mult: 1.0, delay: 100, tgt: 'rand', melee: true, w: 3, fx: 'whip' },
      { id: 'fog', n: '孢霧', mult: 0, pctHp: .06, delay: 100, tgt: 'all', slow: 2, charge: { t: 60, pips: 1 }, cd: 3, w: 2, cond: 'round2', fx: 'fog' },
    ],
  },
  spore: {
    n: '苔孢', row: 'front', hp: 30, atk: 8, arm: 0, spd: 105, w: 1, xp: 3, coin: [0, 1], look: 'spore', minor: true,
    lore: '會跳。', traits: [],
    moves: [{ id: 'nib', n: '啃咬', mult: .6, delay: 90, tgt: 'rand', melee: true, w: 1, fx: 'bite' }],
  },
  bruiser: {
    n: '繩幫打手', row: 'front', hp: 140, atk: 14, arm: 12, spd: 98, w: 2, xp: 16, coin: [8, 16], look: 'bruiser',
    lore: '繩幫的規矩：欠的用重量還。他們負責秤。',
    traits: [{ k: 'stubborn', n: '硬頸', d: '生命低於一半時，傷害 +25%。' }],
    moves: [
      { id: 'hammer', n: '鉤錘', mult: 1.0, delay: 95, tgt: 'rand', melee: true, w: 3, fx: 'hammer' },
      { id: 'drag', n: '拖拽', mult: .7, delay: 100, tgt: 'stance', melee: true, strip: true, heroDelay: 15, cd: 2, w: 2, fx: 'drag' },
    ],
  },
  rigger: {
    n: '繩幫索手', row: 'back', hp: 92, atk: 13, arm: 4, spd: 110, w: 1, xp: 13, coin: [7, 14], look: 'rigger',
    lore: '岑鳶的那幾手，是跟他們學的。',
    traits: [{ k: 'cutter', n: '斷索', d: '場上有懸骸的話，他會搶著把它砸在你們頭上。先用掉它，或先解決他。' }],
    moves: [
      { id: 'bolt', n: '弩箭', mult: .9, delay: 85, tgt: 'rand', w: 3, fx: 'xbolt' },
      { id: 'trip', n: '絆索', mult: .4, delay: 80, tgt: 'rand', slow: 2, cd: 2, w: 2, fx: 'trip' },
      { id: 'cut', n: '斷索', mult: 0, delay: 90, tgt: 'all', dropHang: true, charge: { t: 40, pips: 1 }, prio: 2, cond: 'hasHang', fx: 'cut' },
    ],
  },
  // ── 精英 ──
  threejaw: {
    n: '三顎', row: 'front', hp: 430, atk: 16, arm: 8, spd: 112, w: 2, xp: 70, coin: [40, 60], look: 'threejaw', elite: true, scale: 1.45,
    lore: '七號渡空舟的看門犬。牠把看見的每一條項圈都收了起來。',
    traits: [
      { k: 'alpha', n: '群首', d: '場上每有一隻拾骸犬，牠受到的傷害 −15%。' },
      { k: 'frenzy', n: '狂怒', d: '只剩牠自己的時候，速度 +25、傷害 +25%。' },
    ],
    moves: [
      { id: 'howl', n: '嗥召', mult: 0, delay: 90, tgt: 'self', summon: ['hound', 'hound'], summonCap: 3, charge: { t: 60, pips: 2 }, cd: 4, prio: 2, cond: 'fewHounds', fx: 'howl' },
      { id: 'triple', n: '三連咬', mult: .55, hits: 3, delay: 100, tgt: 'low', melee: true, w: 3, fx: 'triple' },
      { id: 'haul', n: '拖行', mult: .8, delay: 110, tgt: 'rand', melee: true, isolate: true, cd: 3, w: 2, fx: 'drag' },
    ],
  },
  foreman: {
    n: '把頭', row: 'back', hp: 480, atk: 17, arm: 16, spd: 100, w: 3, xp: 80, coin: [60, 90], look: 'foreman', elite: true, scale: 1.15,
    lore: '他腰上那本帳，記的不是錢。',
    traits: [{ k: 'whip', n: '催鞭', d: '他每次行動，最慢的那個手下就提前 20。' }],
    moves: [
      { id: 'call', n: '點名', mult: 0, delay: 60, tgt: 'threat', exposed: 2, cd: 3, prio: 1, fx: 'point' },
      { id: 'hasten', n: '催命', mult: 0, delay: 100, tgt: 'self', actAllies: true, charge: { t: 70, pips: 2 }, cd: 4, prio: 2, cond: 'hasAllies', cond2: 'notFirst', fx: 'whipcrack' },
      { id: 'lash', n: '鐵鞭', mult: 1.1, delay: 95, tgt: 'rand', w: 3, fx: 'lash' },
    ],
  },
  elder: {
    n: '失重長老・陸安', row: 'air', hp: 500, atk: 15, arm: 0, spd: 90, w: 1, xp: 80, coin: [20, 30], look: 'elder', elite: true, scale: 1.2,
    lore: '上一任碑守。他守了一輩子的碑，最後飄在碑頂上，被自己的女兒拴著。',
    traits: [
      { k: 'highperch', n: '高懸', d: '飄在碑頂，近身招碰不到。被墜擊或失衡時，會落到前排一回合。' },
      { k: 'burst', n: '失重爆散', d: '死的時候，相鄰的敵人浮力 2。' },
    ],
    moves: [
      { id: 'tide', n: '失重潮', mult: 0, delay: 100, tgt: 'all', heroLift: 2, charge: { t: 80, pips: 2 }, cd: 3, prio: 2, cond: 'notFirst', fx: 'tide' },
      { id: 'kin', n: '喚同類', mult: 0, delay: 80, tgt: 'self', summon: ['unmoored'], summonCap: 2, cd: 3, prio: 1, cond: 'fewKin', fx: 'wail' },
      { id: 'grab', n: '攫抱', mult: .9, delay: 95, tgt: 'rand', melee: true, heroLift: 1, w: 3, fx: 'grab' },
    ],
  },
  citycrab: {
    n: '負城者', row: 'front', hp: 640, atk: 18, arm: 36, spd: 72, w: 4, xp: 90, coin: [50, 80], look: 'citycrab', elite: true, scale: 1.6,
    lore: '牠背著半座小禮拜堂。裡面的長椅還排得好好的。',
    traits: [
      { k: 'shell', n: '背殼', d: '受到的傷害 −40%。牠失衡或浮空的時候無效。' },
      { k: 'crumble', n: '剝落', d: '每失去四分之一生命，殼上就掉一塊：護甲 −8。' },
    ],
    moves: [
      { id: 'pinch', n: '鉗擊', mult: 1.0, delay: 100, tgt: 'rand', melee: true, w: 3, fx: 'claw' },
      { id: 'crush', n: '鉗碎', mult: 2.4, delay: 110, tgt: 'rand', melee: true, charge: { t: 70, pips: 2 }, cd: 3, prio: 1, cond: 'notFirst', fx: 'crush' },
      { id: 'cityfall', n: '城崩', mult: 2.0, delay: 120, tgt: 'all', melee: true, charge: { t: 100, pips: 3 }, cd: 4, prio: 2, cond: 'hpBelow60', fx: 'cityfall' },
    ],
  },
  drone07: {
    n: '獨燈・零七', row: 'air', hp: 300, atk: 10, arm: 0, spd: 125, w: 0, xp: 70, coin: [30, 50], look: 'drone07', elite: true, scale: 1.35,
    lore: '庭衛巡燈第零七號。備註欄只有一種寫法：「未獲准上行」。',
    traits: [
      { k: 'hover', n: '懸浮', d: '永遠算浮空：墜擊打牠傷害加倍。近身招碰不到。' },
      { k: 'redlight', n: '紅光', d: '被牠照準的人，所有巡燈都只打他。' },
    ],
    moves: [
      { id: 'lit', n: '照準', mult: 0, delay: 60, tgt: 'threat', lit: 3, cd: 3, prio: 1, fx: 'beam' },
      { id: 'chain', n: '連鎖電擊', mult: .45, delay: 95, tgt: 'all', w: 3, fx: 'chainzap' },
    ],
  },
  zhuo: {
    n: '卓九斤', row: 'front', hp: 660, atk: 18, arm: 14, spd: 104, w: 3, xp: 110, coin: [120, 160], look: 'zhuo', elite: true, scale: 1.1, human: true,
    lore: '小時候被秤過。九斤。上面不收。',
    traits: [{ k: 'ninejin', n: '九斤鉤', d: '他先把人鉤上半空，再砸下來——用的是跟你們一樣的手法。浮空的人要趕快有人顧。' }],
    moves: [
      { id: 'down', n: '下鉤', mult: 1.5, delay: 110, tgt: 'aloft', melee: true, slamHero: true, prio: 3, cond: 'heroAloft', fx: 'slamhook' },
      { id: 'up', n: '上鉤', mult: .7, delay: 85, tgt: 'rand', melee: true, heroLift: 2, cd: 2, prio: 1, fx: 'uphook' },
      { id: 'twin', n: '雙鉤', mult: .8, delay: 100, tgt: 'two', melee: true, heroDelay: 15, w: 3, fx: 'twinhook' },
    ],
  },
  ledger: { // 記仇的算盤（抉擇一留下他時）
    n: '算盤', row: 'back', hp: 190, atk: 14, arm: 6, spd: 108, w: 1, xp: 30, coin: [40, 60], look: 'rigger', elite: true, scale: 1.05, tint: '#c9a24a',
    lore: '他記得你。他什麼都記。',
    traits: [{ k: 'grudge', n: '記仇', d: '他只打魏子葳。' }],
    moves: [
      { id: 'bolt', n: '弩箭', mult: 1.0, delay: 85, tgt: 'wei', w: 3, fx: 'xbolt' },
      { id: 'trip', n: '絆索', mult: .4, delay: 80, tgt: 'wei', slow: 2, cd: 2, w: 2, fx: 'trip' },
    ],
  },
  // ── 層主與牠的錨樁 ──
  keeper: {
    n: '守錨者「不移」', row: 'front', hp: 1000, atk: 21, arm: 30, spd: 80, w: 5, xp: 260, coin: [200, 240], look: 'keeper', boss: true, scale: 2.3,
    lore: '牠的名字是命令的一部分。',
    traits: [
      { k: 'anchored', n: '錨定', d: '四根錨樁還在時，受到的傷害 −80%；每斷一根少 20%。先拆錨樁，或把懸鏈砸在樁上。' },
      { k: 'unliftable', n: '不移', d: '浮不起來。但牠蓄力的時候，每 2 點浮力能削掉 1 格穩固。' },
    ],
    moves: [
      { id: 'fall', n: '墜庭', mult: 4.0, delay: 130, tgt: 'all', melee: true, shelter: true, charge: { t: 150, pips: 4 }, cd: 5, prio: 3, cond: 'phase2', fx: 'courtfall' },
      { id: 'sweep', n: '鏈掃', mult: 1.3, delay: 110, tgt: 'all', melee: true, heroDelay: 20, charge: { t: 70, pips: 3 }, cd: 3, prio: 2, cond: 'notFirst', fx: 'chainsweep' },
      { id: 'anchor', n: '錨墜', mult: 2.2, delay: 100, tgt: 'rand', anchor: true, charge: { t: 60, pips: 2 }, cd: 2, prio: 1, fx: 'anchordrop' },
      { id: 'quake', n: '鏈震', mult: .55, delay: 95, tgt: 'all', cd: 2, w: 3, cond: 'phase2', fx: 'chainsweep' },
      { id: 'call', n: '召衛', mult: 0, delay: 80, tgt: 'self', summon: ['drone'], summonAlt: ['warden'], summonCap: 2, cd: 4, w: 2, cond: 'fewGuards', fx: 'alarm' },
      { id: 'smash', n: '鏈砸', mult: 1.2, delay: 100, tgt: 'rand', melee: true, w: 3, fx: 'chainsmash' },
    ],
  },
  pylon: {
    n: '錨樁', row: 'back', hp: 90, atk: 0, arm: 20, spd: 60, w: 9, xp: 0, coin: [0, 0], look: 'pylon', object: true, scale: 1.2,
    lore: '把牠釘在這裡的東西。', traits: [{ k: 'inert', n: '錨樁', d: '不會行動。每打斷一根，守錨者少 20% 減傷。' }],
    moves: [],
  },
};
for (const k in FOE) FOE[k].id = k;
const foeHp = (f, zl) => Math.round(f.hp * (1 + .34 * (zl - 1)));
const foeAtk = (f, zl) => f.atk * (1 + .24 * (zl - 1));
const foeXp = (f, zl) => Math.round(f.xp * (1 + .15 * (zl - 1)));

// 地利：戰場上可以點的東西
const SCENE = {
  barrel:  { n: '爆燃桶', d: '打它：前排的敵人受到爆炸傷害、灼燒 2 層。只能用一次。', once: true, look: 'barrel' },
  cluster: { n: '浮石簇', d: '打它：全體敵人浮力 2。之後休眠 3 輪。', sleep: 3, look: 'cluster' },
  hang:    { n: '懸骸', d: '用遠程招打斷吊鏈：砸在前排敵人身上，重傷並失衡。只能用一次。', once: true, ranged: true, look: 'hang' },
  ledge:   { n: '崖邊', d: '在這裡把中型以下的敵人墜擊，會直接打落深淵。', passive: true, look: 'ledge' },
  oil:     { n: '油面', d: '腳下都是油：灼燒會蔓延到相鄰的敵人，灼燒傷害 +50%。', passive: true, look: 'oil' },
};
