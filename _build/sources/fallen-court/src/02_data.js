// ============ 規則資料：系、狀態、技能、角色、天賦 ============
const FAM = {
  cin:   { n: '燼', c: '#ff7a3c', full: '燼系' },
  rust:  { n: '鏽', c: '#4fc7a0', full: '鏽系' },
  aloft: { n: '浮', c: '#8fd0ff', full: '浮系' },
  shade: { n: '影', c: '#b58cff', full: '影系' },
  oath:  { n: '誓', c: '#f3d98a', full: '誓系' },
  gen:   { n: '通', c: '#c9c4b8', full: '通用' },
};
const STATUS = {
  aloft:   { n: '浮空', c: '#8fd0ff', bad: 1, d: '被打上半空：行動延後、不能反擊。被「墜擊」招式打中會重摔。到自己行動時落地。' },
  stagger: { n: '失衡', c: '#ffcf5a', bad: 1, d: '受到的傷害 +25%，持續到下次行動結束。' },
  mark:    { n: '標記', c: '#b58cff', bad: 1, d: '下一次被打中必定暴擊。' },
  burn:    { n: '灼燒', c: '#ff7a3c', bad: 1, d: '自己行動開始時，每層受一次傷害，然後少一層。' },
  rust:    { n: '鏽蝕', c: '#4fc7a0', bad: 1, d: '每層護甲 −8，整場戰鬥不會消退。' },
  slow:    { n: '遲滯', c: '#9aa6c8', bad: 1, d: '招式延遲 +25%。' },
  lit:     { n: '照準', c: '#ffe08a', bad: 1, d: '被燈照著：受到的傷害 +25%。' },
  exposed: { n: '點名', c: '#ff6a5a', bad: 1, d: '繩幫的人都盯著他打，沒有人能替他擋。' },
  isolate: { n: '落單', c: '#ff6a5a', bad: 1, d: '被拖離隊伍：到下次行動前不能被治療、掩護，也接不上連攜。' },
  shield:  { n: '護盾', c: '#f3d98a', d: '額外的生命，先被扣。' },
  guard:   { n: '架勢', c: '#e8e2d0', d: '受到的傷害減半，持續到下次行動。' },
  riposte: { n: '回鋒', c: '#e8e2d0', d: '受到的傷害 −30%，被近身打中就反擊。' },
  oathdr:  { n: '立誓', c: '#f3d98a', d: '敵人的單體攻擊都得打他；他受到的傷害 −30%。' },
  gate:    { n: '不動門', c: '#f3d98a', d: '全隊受到的傷害 −60%。' },
  evade:   { n: '飛索', c: '#b58cff', d: '閃過下一次單體攻擊。' },
  ambush:  { n: '伏擊', c: '#b58cff', d: '下一擊必定暴擊。' },
  still:   { n: '不移', c: '#f3d98a', d: '每層傷害 +8%。' },
  enrage:  { n: '狂怒', c: '#ff5a4a', d: '速度與傷害提高。' },
  moss:    { n: '苔毯', c: '#5fd0b0', d: '每層每回合回復生命；有苔的時候打不浮。被灼燒一次掉一層。' },
};
const delayClass = d => d <= 70 ? '快' : d >= 120 ? '重' : '中';

// ---------- 技能 ----------
// tg：foe 單體｜adj 目標＋相鄰｜multi 目標＋最近的幾個｜foes 全體敵人｜self｜ally 一名隊友｜allies 全隊
// reach：melee 近身（只打得到前排）｜ranged 遠程
const SK = {
  // ── 共通 ──
  c_guard:  { n: '架勢', tg: 'self', delay: 70, gain: 1, stance: 'guard', icon: 'guard', d: '到下次行動前，受到的傷害減半。勢 +1。' },
  c_wait:   { n: '待機', tg: 'self', delay: 40, icon: 'wait', d: '什麼都不做，很快再輪到你。用來等隊友、湊連攜。' },
  c_potion: { n: '止血膏', tg: 'ally', delay: 60, heal: .35, revive: .25, item: 'potion', icon: 'potion', d: '一名隊友回復 35% 生命；可以拉起倒地的人。' },
  c_fire:   { n: '火油瓶', tg: 'foes', reach: 'ranged', fixed: 18, fixedLv: 3, burn: 2, ignite: true, delay: 70, item: 'fire', icon: 'fire', fx: 'firebomb', d: '全體敵人受到少量傷害、灼燒 2 層。' },
  c_float:  { n: '浮石彈', tg: 'foes', reach: 'ranged', noDmg: true, lift: 2, delay: 70, item: 'float', icon: 'float', fx: 'floatbomb', d: '全體敵人浮力 2：輕的、中的當場浮起來。' },
  c_unison: { n: '庭隕', tg: 'foes', reach: 'ranged', delay: 100, unison: true, icon: 'unison', fx: 'unison', d: '【合體技】鉤住所有敵人、震上半空，再一劍全部砸下。全員失衡、延遲 +30。' },

  // ── 魏子葳 ──
  w_atk:  { n: '斷流', who: 'wei', tg: 'foe', reach: 'melee', mult: 1.0, delay: 80, gain: 1, impact: 1, icon: 'slash', fx: 'slash', d: '近身一斬。勢 +1。' },
  w_lift: { n: '挑月', who: 'wei', tg: 'foe', reach: 'melee', mult: .7, delay: 90, cost: 1, lift: 2, icon: 'lift', fx: 'uppercut', d: '由下往上挑：浮力 2。浮力夠重量，就把目標打上半空。' },
  w_slam: { n: '墜星斬', who: 'wei', tg: 'foe', reach: 'melee', mult: 1.6, delay: 130, cost: 2, slam: true, impact: 2, delayIfGround: 15, icon: 'slam', fx: 'slam', d: '【墜擊】把浮空的目標砸回地面：傷害大增，相鄰的敵人吃衝擊波。目標沒浮空時改為延遲 +15。' },
  w_dash: { n: '掠影', who: 'wei', tg: 'adj', reach: 'melee', mult: .8, splash: .5, delay: 60, cd: 2, icon: 'dash', fx: 'dash', d: '一閃而過：目標 80%，相鄰的敵人各 50%。很快就能再動。' },
  w_rip:  { n: '回鋒', who: 'wei', tg: 'self', delay: 70, cost: 1, stance: 'riposte', icon: 'riposte', fx: 'stance', d: '到下次行動前：受到的傷害 −30%，被近身打中就反手一劍。' },
  w_time: { n: '斷時', who: 'wei', tg: 'foe', reach: 'ranged', mult: .6, delay: 100, cost: 2, delayTgt: 35, cut: true, icon: 'time', fx: 'wave', d: '一道劍氣，打得到後排：把目標的行動往後推 35。也斬得斷吊鏈。' },
  w_nova: { n: '引浮', who: 'wei', tg: 'foes', reach: 'ranged', mult: .3, delay: 90, cost: 2, lift: 1, icon: 'nova', fx: 'nova', d: '劍插地面，浮石共鳴：全體敵人浮力 1。' },
  w_ult:  { n: '天墜', who: 'wei', tg: 'foes', reach: 'ranged', mult: 1.5, delay: 140, cost: 5, ult: true, slamAloft: true, staggerAll: true, impact: 3, icon: 'ult_w', fx: 'skyfall', d: '【奧義】躍上半空再墜下：全體 150%，浮空中的敵人當場重摔。全部失衡。' },

  // ── 岑鳶（全部遠程）──
  y_atk:    { n: '袖弩', who: 'yuan', tg: 'foe', reach: 'ranged', mult: .85, delay: 75, gain: 1, icon: 'bolt', fx: 'bolt', d: '一箭，打得到後排。勢 +1。' },
  y_mark:   { n: '標定', who: 'yuan', tg: 'foe', reach: 'ranged', mult: .6, delay: 60, cd: 1, mark: 1, icon: 'mark', fx: 'bolt', d: '打上標記：下一擊打它必定暴擊。' },
  y_hook:   { n: '倒鉤', who: 'yuan', tg: 'foe', reach: 'ranged', mult: .7, delay: 100, cost: 1, pullFront: true, delayIfFront: 20, impact: 1, cut: true, icon: 'hook', fx: 'hook', d: '把後排或空中的敵人拖到前排，讓近身招打得到。已經在前排的，延遲 +20。' },
  y_hoist:  { n: '上提', who: 'yuan', tg: 'foe', reach: 'ranged', mult: .4, delay: 80, cost: 1, lift: 1, icon: 'hoist', fx: 'hookup', d: '浮力 1。幫魏子葳把重的東西撐起來。' },
  y_yank:   { n: '墜鉤', who: 'yuan', tg: 'foe', reach: 'ranged', mult: .9, slamMult: 1.3, delay: 110, cost: 2, slam: true, delayIfGround: 20, icon: 'yank', fx: 'yank', d: '【墜擊】把浮空的目標扯回地面。目標沒浮空時改為延遲 +20。' },
  y_zip:    { n: '飛索', who: 'yuan', tg: 'self', delay: 50, cd: 2, stance: 'evade', ambush: true, icon: 'zip', fx: 'zip', d: '盪上高處：閃過下一次單體攻擊，下一擊必定暴擊。' },
  y_volley: { n: '亂矢', who: 'yuan', tg: 'foes', reach: 'ranged', mult: .5, delay: 110, cost: 2, mark: 1, icon: 'volley', fx: 'volley', d: '全體敵人各中一箭，並被標記。' },
  y_ult:    { n: '千鈞一線', who: 'yuan', tg: 'multi', n2: 2, reach: 'ranged', mult: 1.2, perExtra: .2, delay: 120, cost: 5, ult: true, mark: 1, pullFront: true, delayTgt: 20, icon: 'ult_y', fx: 'gather', d: '【奧義】勾住目標和另外兩個敵人撞在一起：勾到越多越痛。全部標記、拖到前排、延遲 +20。' },

  // ── 駱山 ──
  l_atk:  { n: '盾擊', who: 'luo', tg: 'foe', reach: 'melee', mult: .9, delay: 90, gain: 1, impact: 2, icon: 'bash', fx: 'bash', d: '用門板撞過去。衝擊 2：打斷蓄力的好手。勢 +1。' },
  l_oath: { n: '立誓', who: 'luo', tg: 'self', delay: 80, cost: 1, stance: 'oathdr', icon: 'oath', fx: 'stance', d: '到下次行動前：敵人的單體攻擊都得打他。他受到的傷害 −30%。' },
  l_slam: { n: '鎮地', who: 'luo', tg: 'foe', reach: 'melee', mult: 1.2, delay: 120, cost: 2, slam: true, impact: 3, delayIfGround: 15, icon: 'quake', fx: 'quake', d: '【墜擊】把浮空的目標拍進地裡。目標沒浮空時：衝擊 3、延遲 +15。' },
  l_ram:  { n: '撞門', who: 'luo', tg: 'foe', reach: 'melee', mult: 1.0, delay: 110, cost: 1, impact: 2, ram: .5, delayTgt: 15, icon: 'ram', fx: 'ram', d: '把目標撞向相鄰的一個敵人：對方吃 50%，兩個都延遲 +15。' },
  l_mend: { n: '裹傷', who: 'luo', tg: 'ally', delay: 100, cd: 3, heal: .30, revive: .30, cleanse: true, icon: 'mend', fx: 'mend', d: '一名隊友回復 30% 生命，解除灼燒與遲滯。可以拉起倒地的人。' },
  l_ward: { n: '護庭', who: 'luo', tg: 'allies', delay: 90, cost: 2, shieldPct: .15, icon: 'ward', fx: 'ward', d: '全隊各得一層護盾（他最大生命的 15%）。' },
  l_nail: { n: '鏽釘錘', who: 'luo', tg: 'foe', reach: 'melee', mult: 1.1, delay: 100, cost: 1, rust: 2, impact: 1, icon: 'nail', fx: 'bash', d: '近身重擊：鏽蝕 2 層。' },
  l_ult:  { n: '不動門', who: 'luo', tg: 'self', delay: 100, cost: 5, ult: true, stance: 'gate', gateTurns: 2, staggerFront: true, icon: 'ult_l', fx: 'gate', d: '【奧義】兩回合內全隊受到的傷害 −60%。發動時前排的敵人全部失衡。' },
};
for (const k in SK) SK[k].id = k;

// ---------- 角色 ----------
const HERO = {
  wei: {
    n: '魏子葳', title: '殘刃劍士', role: '浮與墜・時間軸', w: 2, col: '#8fd0ff',
    base: { hp: 120, atk: 20, arm: 10, spd: 105, crit: 8 }, grow: { hp: 10, atk: 1.6 },
    passive: { n: '殘刃', d: '對浮空或失衡的目標，傷害 +20%。' },
    basic: 'w_atk', ult: 'w_ult',
    learn: [['w_lift', 1], ['w_slam', 1], ['w_dash', 2], ['w_rip', 4], ['w_time', 6], ['w_nova', 8]],
    weapon: 'sword', heavyOk: true,
    talents: [
      [3, { id: 'w3a', n: '輕挑', d: '挑月不再花勢。' }, { id: 'w3b', n: '重墜', d: '墜擊的衝擊波傷害 +50%。' }],
      [5, { id: 'w5a', n: '殘響', d: '掠影砍中的敵人延遲 +10。' }, { id: 'w5b', n: '借勢', d: '每次讓敵人失衡，勢 +1。' }],
      [7, { id: 'w7a', n: '凌空', d: '墜擊浮空的目標必定暴擊。' }, { id: 'w7b', n: '止水', d: '回鋒再減傷 20%，反擊附帶延遲 +15。' }],
      [9, { id: 'w9a', n: '雙墜', d: '每場戰鬥第一次奧義後，返還 2 點勢。' }, { id: 'w9b', n: '深斬', d: '斷時的延遲再 +15，並帶衝擊 2。' }],
    ],
  },
  yuan: {
    n: '岑鳶', title: '鉤索弩手', role: '標記・後排殺手', w: 1, col: '#b58cff',
    base: { hp: 90, atk: 18, arm: 5, spd: 115, crit: 12 }, grow: { hp: 7, atk: 1.5 },
    passive: { n: '居高', d: '她的招式都打得到後排與空中；對那些目標傷害 +15%。' },
    basic: 'y_atk', ult: 'y_ult',
    learn: [['y_mark', 1], ['y_hook', 1], ['y_hoist', 3], ['y_yank', 5], ['y_zip', 6], ['y_volley', 8]],
    weapon: 'hookbow', heavyOk: false,
    talents: [
      [3, { id: 'y3a', n: '快手', d: '標定沒有冷卻。' }, { id: 'y3b', n: '倒刺', d: '倒鉤傷害 +40%，並附鏽蝕 1 層。' }],
      [5, { id: 'y5a', n: '高處', d: '對後排與空中目標的加成，由 +15% 變 +30%。' }, { id: 'y5b', n: '纏鬥', d: '被攻擊後獲得伏擊：下一擊必定暴擊（每輪一次）。' }],
      [7, { id: 'y7a', n: '一線', d: '伏擊的暴擊傷害由 ×1.5 變 ×2。' }, { id: 'y7b', n: '收網', d: '墜鉤把目標砸下來之後，它再延遲 +20。' }],
      [9, { id: 'y9a', n: '千鈞', d: '千鈞一線多勾一個敵人。' }, { id: 'y9b', n: '獵心', d: '被標記的敵人死亡時，標記轉到生命最高的敵人身上。' }],
    ],
  },
  luo: {
    n: '駱山', title: '門盾衛士', role: '護盾・打斷・鏽蝕', w: 3, col: '#f3d98a',
    base: { hp: 160, atk: 16, arm: 22, spd: 88, crit: 5 }, grow: { hp: 14, atk: 1.2 },
    passive: { n: '門板', d: '隊友生命低於 35% 時被單體攻擊，由他代受（每輪一次）。' },
    basic: 'l_atk', ult: 'l_ult',
    learn: [['l_oath', 1], ['l_slam', 1], ['l_ram', 4], ['l_mend', 5], ['l_ward', 7], ['l_nail', 8]],
    weapon: 'doorshield', heavyOk: true,
    talents: [
      [3, { id: 'l3a', n: '厚門', d: '架勢的減傷由 50% 變 65%。' }, { id: 'l3b', n: '頂門', d: '盾擊附帶延遲 +10。' }],
      [5, { id: 'l5a', n: '守諾', d: '立誓期間每次被打，勢 +1（每輪至多 2）。' }, { id: 'l5b', n: '震地', d: '鎮地衝擊 +1，相鄰的敵人吃一半傷害。' }],
      [7, { id: 'l7a', n: '門後', d: '代受的門檻由 35% 變 50%，代受時傷害 −30%。' }, { id: 'l7b', n: '戰地醫', d: '裹傷冷卻 −1，多回復 10%。' }],
      [9, { id: 'l9a', n: '不動如山', d: '不動門多持續 1 回合。' }, { id: 'l9b', n: '同擔', d: '護庭的護盾量 +50%。' }],
    ],
  },
};
for (const k in HERO) HERO[k].id = k;
const LEVEL_CAP = 10;
const xpNeed = lv => 32 + 26 * (lv - 1) + 4 * (lv - 1) * (lv - 1);
function heroBaseStat(id, lv) {
  const h = HERO[id];
  return { hp: Math.round(h.base.hp + h.grow.hp * (lv - 1)), atk: h.base.atk + h.grow.atk * (lv - 1), arm: h.base.arm, spd: h.base.spd, crit: h.base.crit };
}
function heroSkillsAt(id, lv) { return HERO[id].learn.filter(a => a[1] <= lv).map(a => a[0]); }

// 共鳴系：全隊每人都帶 ≥2 條同系詞條時成立
const RESO_FAM = {
  cin:   { n: '燼鳴', d: '全隊的灼燒傷害 +25%；合體技附帶灼燒 3 層。' },
  rust:  { n: '鏽鳴', d: '鏽蝕每層多 −2 護甲；合體技附帶鏽蝕 3 層。' },
  aloft: { n: '浮鳴', d: '全隊浮力 +1；合體技的延遲再 +30。' },
  shade: { n: '影鳴', d: '全隊暴擊傷害 ×1.75；合體技必定暴擊。' },
  oath:  { n: '誓鳴', d: '連攜時雙方各回復 5%；合體技後全隊護盾 20%。' },
};
// 規則常數
const RULE = {
  critMult: 1.5, staggerDmg: .25, staggerDelay: 20, aloftDelay: 30, aloftDmgHero: .25,
  slamBase: 1.5, slamPerW: .25, shock: .5,
  burnPct: .15, burnMax: 5, rustArm: 8, rustMax: 5, linkDmg: .20, perfectDmg: .50, resoMax: 6,
  postHeal: .25, woundHp: .10, woundMax: 3, guardDR: .5, ripDR: .3, oathDR: .3, gateDR: .6, litDmg: .25, slowDelay: .25,
  passiveWei: .20, backYuan: .15, coverAt: .35, ambushAdv: 30, ambushedAdv: 20,
};
