// ============ 裝備：部位、詞條、傳說、生成、工坊 ============
const RAR = [
  { n: '凡鐵', c: '#b9b4a8', affs: 0 },
  { n: '良工', c: '#6fd49a', affs: 1 },
  { n: '珍品', c: '#6fb6ff', affs: 2 },
  { n: '庭造', c: '#c78bff', affs: 3 },
  { n: '金繼', c: '#ffcf5a', affs: 0 },
];
const SLOTS = ['weapon', 'armor', 'trinket', 'relic'];
const SLOT_N = { weapon: '武器', armor: '護甲', trinket: '飾物', relic: '遺物' };
// base：atk／hp／arm 係數以物品等級計算；spd、impact 為固定
const BASE = {
  sword:    { n: '庭劍',   slot: 'weapon', who: 'wei',  atk: 1,    icon: 'sword' },
  sword_l:  { n: '細刃',   slot: 'weapon', who: 'wei',  atk: .9,  spd: 3, icon: 'sword' },
  sword_h:  { n: '闊刃',   slot: 'weapon', who: 'wei',  atk: 1.12, spd: -3, impact: 1, icon: 'sword' },
  bow:      { n: '鉤弩',   slot: 'weapon', who: 'yuan', atk: 1,    icon: 'bow' },
  bow_l:    { n: '袖弩',   slot: 'weapon', who: 'yuan', atk: .9,  spd: 3, icon: 'bow' },
  bow_h:    { n: '絞盤弩', slot: 'weapon', who: 'yuan', atk: 1.12, spd: -3, impact: 1, icon: 'bow' },
  shield:   { n: '門盾',   slot: 'weapon', who: 'luo',  atk: 1,    icon: 'shield' },
  shield_l: { n: '艙蓋盾', slot: 'weapon', who: 'luo',  atk: .9,  spd: 3, icon: 'shield' },
  shield_h: { n: '錨槌盾', slot: 'weapon', who: 'luo',  atk: 1.12, spd: -3, impact: 1, icon: 'shield' },
  armor_l:  { n: '拾荒袍', slot: 'armor', hp: [8, 3],  arm: [2, .6],  spd: 2,  icon: 'robe' },
  armor_m:  { n: '鱗片甲', slot: 'armor', hp: [12, 4.5], arm: [5, 1.2], icon: 'mail' },
  armor_h:  { n: '庭衛殘甲', slot: 'armor', hp: [16, 6], arm: [8, 1.8], spd: -4, heavy: true, icon: 'plate' },
  trinket:  { n: '扣環',   slot: 'trinket', icon: 'ring', names: ['扣環', '墜子', '繩結', '指環', '鈕扣', '鈴舌'] },
  relic:    { n: '浮石殘片', slot: 'relic', icon: 'relic', names: ['浮石殘片', '窗鉛', '碎鐘舌', '錨屑', '庭磚'] },
};
const weaponAtk = il => 4 + 1.5 * il;
const tierOf = il => il >= 9 ? 2 : il >= 5 ? 1 : 0;

// ---------- 詞條 ----------
const AFF = {
  // 數值（每件最多一條）
  S1: { n: '鋒利', fam: 'gen', stat: 1, slot: ['weapon', 'trinket'], v: [8, 12, 16], d: v => `攻擊 +${v}%` },
  S2: { n: '厚實', fam: 'gen', stat: 1, slot: ['armor', 'trinket', 'relic'], v: [10, 15, 20], d: v => `生命 +${v}%` },
  S3: { n: '堅壁', fam: 'gen', stat: 1, slot: ['armor', 'relic'], v: [6, 10, 14], d: v => `護甲 +${v}` },
  S4: { n: '迅捷', fam: 'gen', stat: 1, slot: ['armor', 'trinket', 'weapon'], v: [4, 6, 8], d: v => `速度 +${v}` },
  S5: { n: '精準', fam: 'gen', stat: 1, slot: ['weapon', 'trinket', 'relic'], v: [6, 9, 12], d: v => `暴擊率 +${v}%` },
  S6: { n: '蓄勢', fam: 'gen', stat: 1, slot: ['armor', 'trinket'], v: [1, 1, 2], d: v => `開戰時勢 +${v}` },
  S7: { n: '重擊', fam: 'gen', stat: 1, slot: ['weapon'], v: [1, 1, 1], minT: 1, d: () => `衝擊 +1` },
  S8: { n: '浮石共振', fam: 'gen', stat: 1, slot: ['weapon', 'relic'], v: [0, 0, 1], minT: 2, d: () => `浮力 +1` },
  // 燼
  C1: { n: '灼痕', fam: 'cin', slot: ['weapon'], v: [1, 1, 2], d: v => `暴擊時，對目標施加 ${v} 層灼燒。` },
  C2: { n: '引火', fam: 'cin', slot: ['weapon'], v: [1, 1, 1], d: () => `每回合第一次命中，施加 1 層灼燒。` },
  C3: { n: '餘燼回流', fam: 'cin', slot: ['trinket'], v: [1, 1, 1], d: () => `你施加灼燒時，勢 +1（每回合一次）。` },
  C4: { n: '熾風', fam: 'cin', slot: ['armor'], v: [1, 1, 1], d: () => `你的回合開始時，所有灼燒中的敵人立刻結算一次灼燒（不減層）。` },
  C5: { n: '餘溫', fam: 'cin', slot: ['armor'], v: [1, 1, 1], d: () => `被攻擊時，攻擊者灼燒 1 層。` },
  C6: { n: '燎原', fam: 'cin', slot: ['relic'], v: [1, 1, 1], d: () => `灼燒中的敵人死亡時，層數（至多 3）傳給生命最高的敵人。` },
  // 鏽
  R1: { n: '蝕刃', fam: 'rust', slot: ['weapon'], v: [1, 1, 1], d: () => `每回合第一次命中，施加 1 層鏽蝕。` },
  R2: { n: '見縫', fam: 'rust', slot: ['weapon'], v: [5, 6, 8], d: v => `目標每有 1 層鏽蝕，你對它的暴擊率 +${v}%。` },
  R3: { n: '鏽釘', fam: 'rust', slot: ['trinket'], v: [6, 8, 10], d: v => `你施加鏽蝕時，目標延遲 +${v}。` },
  R4: { n: '蝕甲', fam: 'rust', slot: ['armor'], v: [1, 1, 1], d: () => `被命中時，攻擊者鏽蝕 1 層。` },
  R5: { n: '積鏽', fam: 'rust', slot: ['trinket'], v: [2, 2, 2], d: () => `鏽蝕的層數上限 +2。` },
  R6: { n: '崩解', fam: 'rust', slot: ['relic'], v: [1, 1, 1], d: () => `讓 3 層以上鏽蝕的敵人失衡時，它的護甲本場歸零。` },
  // 浮
  F1: { n: '揚塵', fam: 'aloft', slot: ['weapon'], v: [20, 25, 30], d: v => `你把敵人打上半空時，追加 ${v}% 攻擊的傷害。` },
  F2: { n: '乘虛', fam: 'aloft', slot: ['weapon'], v: [15, 20, 25], d: v => `對浮空的目標，傷害 +${v}%。` },
  F3: { n: '借力', fam: 'aloft', slot: ['trinket'], v: [10, 12, 15], d: v => `你把敵人打上半空時，行動提前 ${v}。` },
  F4: { n: '墜勢', fam: 'aloft', slot: ['trinket'], v: [20, 30, 40], d: v => `墜擊命中時勢 +1，衝擊波傷害 +${v}%。` },
  F5: { n: '輕身', fam: 'aloft', slot: ['armor'], v: [6, 8, 10], d: v => `你行動後，若場上有浮空的敵人，行動提前 ${v}。` },
  F6: { n: '餘震', fam: 'aloft', slot: ['relic'], v: [1, 1, 1], d: () => `墜擊的衝擊波波及全體敵人（不相鄰的吃一半）。` },
  // 影
  M1: { n: '破綻', fam: 'shade', slot: ['weapon'], v: [8, 10, 12], d: v => `你的攻擊消耗掉標記時，行動提前 ${v}。` },
  M2: { n: '趁隙', fam: 'shade', slot: ['weapon'], v: [20, 25, 30], d: v => `對失衡的目標，暴擊率 +${v}%。` },
  M3: { n: '連環', fam: 'shade', slot: ['trinket'], v: [1, 1, 1], d: () => `暴擊時，標記生命最高的另一名敵人（每回合一次）。` },
  M4: { n: '獵首', fam: 'shade', slot: ['trinket'], v: [2, 2, 2], d: () => `擊殺時，勢 +2。` },
  M5: { n: '伏擊', fam: 'shade', slot: ['armor'], v: [15, 20, 25], d: v => `開戰時第一擊必定暴擊，初始行動提前 ${v}。` },
  M6: { n: '補刀', fam: 'shade', slot: ['relic'], v: [40, 40, 50], d: v => `隊友打出暴擊時，你追擊一次（${v}%，每輪一次）。` },
  // 誓
  O1: { n: '誓反', fam: 'oath', slot: ['weapon'], v: [60, 70, 80], d: v => `架勢中被近身打中時，反擊（${v}%）。` },
  O2: { n: '守望', fam: 'oath', slot: ['armor'], v: [8, 10, 12], d: v => `這回合沒有造成傷害（架勢、輔助）時，獲得護盾（最大生命的 ${v}%）。` },
  O3: { n: '以身為門', fam: 'oath', slot: ['armor'], v: [10, 12, 15], d: v => `你還站著的時候，隊友受到的範圍傷害 −${v}%。` },
  O4: { n: '同袍', fam: 'oath', slot: ['trinket'], v: [5, 6, 8], d: v => `連攜時，你和前一位隊友各回復 ${v}% 生命。` },
  O5: { n: '不退', fam: 'oath', slot: ['trinket'], v: [20, 25, 30], d: v => `生命低於 40% 時，受到的傷害 −${v}%。` },
  O6: { n: '薪火', fam: 'oath', slot: ['relic'], v: [3, 3, 3], d: () => `隊友倒地時，你立刻行動，勢 +3。` },
  // 通用
  T1: { n: '搶拍', fam: 'gen', slot: ['trinket'], v: [8, 10, 12], d: v => `快招（延遲 70 以下）的延遲再 −${v}%。` },
  T2: { n: '沉穩', fam: 'gen', slot: ['armor'], v: [12, 16, 20], d: v => `重招（延遲 120 以上）傷害 +${v}%。` },
  T3: { n: '餘裕', fam: 'gen', slot: ['trinket'], v: [6, 8, 10], d: v => `打斷蓄力時，全隊行動提前 ${v}。` },
  T4: { n: '默契', fam: 'gen', slot: ['trinket'], v: [10, 15, 20], d: v => `連攜的傷害加成再 +${v}%。` },
};
for (const k in AFF) AFF[k].id = k;
const affVal = a => AFF[a.id].v[a.t];
const affText = a => AFF[a.id].d(affVal(a));

// ---------- 金繼（傳說）----------
const LEG = {
  collar:  { n: '三顎的項圈', base: 'trinket', il: 3, fam: 'shade', affs: [['M4', 0]],
    rule: '圍獵：目標身上每有一種負面狀態，你對它的傷害 +8%。',
    lore: '項圈內側刻著一行小字：「七號渡空舟・看門犬・乖」。城掉下來的時候，沒有人來解開牠。牠後來把看見的每一條項圈都收了起來。' },
  chair:   { n: '第七席的空椅', base: 'relic', il: 3, fam: 'shade', affs: [['S5', 0]],
    rule: '開戰時，生命最高的敵人被標記；3 回合內這個標記不會被消耗。',
    lore: '七席議事的時候，第七張椅子面向窗外。坐在上面的人看的不是其他六個人，是底下。墜庭那晚表決，這張椅子是空的。' },
  ballast: { n: '壓艙石', base: 'armor_h', il: 5, fam: 'oath', affs: [['S2', 1], ['O2', 1]],
    rule: '你不會被打上半空、被延後行動或失衡。每擋下一次，獲得護盾（最大生命的 10%）。',
    lore: '壓艙民的孩子滿月，要抱一抱艙底的石頭。大人說：城在上面飛，是因為我們在下面夠重。' },
  brazier: { n: '未熄的庭燎', base: 'relic', il: 5, fam: 'cin', affs: [['C6', 1]],
    rule: '你施加的灼燒不再每回合減少層數。',
    lore: '高庭的夜裡不點燈，點「庭燎」——一整條街的火盆。墜下來三百年了，這一盆沒有人添過油。' },
  knuckle: { n: '先墜者的指節', base: 'trinket', il: 5, fam: 'aloft', affs: [['F3', 1]],
    rule: '你的普攻附帶浮力 1，但延遲 +15。',
    lore: '守墜人說，城掉下來之前，有一個人先掉了下來。碑上沒有他的名字，只留了他抓過崖邊的那隻手。' },
  scale:   { n: '量罪天平', base: 'trinket', il: 4, fam: 'rust', affs: [['R3', 0]],
    rule: '鏽蝕的層數上限 +3。敵人身上每有 1 層鏽蝕，它的招式延遲 +4%。',
    lore: '執秤的天平不秤東西，秤票。一邊放「要飛」，一邊放「要付的」。秤婆說這桿是仿的。她說謊。' },
  feather: { n: '不肯落地的羽', base: 'relic', il: 7, fam: 'aloft', affs: [['F6', 1]],
    rule: '被你打上半空的敵人多浮一回合（延遲再 +30），浮空期間受到的傷害 +15%。',
    lore: '信差鳥的羽。高庭的信差鳥一生不落地，死也死在風裡。這一根在崖頂的骨頭堆裡，還在往上飄。' },
  firsthook: { n: '逃奴的第一根鉤', base: 'bow', il: 7, fam: 'shade', affs: [['M1', 1], ['S4', 1]],
    rule: '倒鉤與上提不再花勢；倒鉤多造成延遲 +15。',
    lore: '鉤尖磨得很薄。握柄上纏的布換過很多次，最裡面那層是一條孩子的腰帶，繡著一隻雀。' },
  nightdoor: { n: '守夜人的門板', base: 'shield', il: 7, fam: 'oath', affs: [['O1', 1], ['S3', 1]],
    rule: '你擺出架勢時，隊友也得到一半的減傷。盾擊的衝擊 +1。',
    lore: '鏽錨集東門的舊門板。背面一道一道的刻痕，十一道深，後面的很淺，數不清——那是他守過的夜。' },
  pricetag: { n: '鏈主的價目牌', base: 'trinket', il: 7, fam: 'gen', affs: [['T1', 1]],
    rule: '你擊殺敵人時，下一位行動的隊友立刻行動（每輪一次）。',
    lore: '一塊秤砣大小的鐵牌，正面是今年的價，反面刻著「九斤，退」。他一直把反面朝外掛。' },
  wick:    { n: '零七的燈芯', base: 'trinket', il: 3, fam: 'shade', affs: [['S4', 0]],
    rule: '開戰時全隊行動提前 10。每場戰鬥第一個打你的敵人會被標記。',
    lore: '庭衛巡燈第零七號。三百年來牠照過的每一個人都登記在案，備註欄只有一種寫法：「未獲准上行」。' },
  heart:   { n: '不移之心', base: 'relic', il: 9, fam: 'oath', affs: [['S3', 2]],
    rule: '每次被攻擊而沒有倒下，獲得 1 層「不移」（傷害 +8%，最多 5 層）；倒地就清空。',
    lore: '牠的名字是命令的一部分。下令的人說：不移。牠就三百年沒有動過。' },
  writ:    { n: '錨衛令', base: 'trinket', il: 9, fam: 'oath', affs: [['T4', 2]],
    rule: '合體技只需要 4 點共鳴。',
    lore: '一枚印。印文只有兩個字：「可行」。三百年來，這是牠第一次收到第二道命令。' },
  brokenscale: { n: '斷秤', base: 'sword', il: 8, fam: 'gen', affs: [['S1', 1], ['T2', 1]],
    rule: '你讓敵人的行動延後多少，自己就提前一半。',
    lore: '一把劍，劍脊上嵌著半截秤桿。不知道是誰把秤折了、打進劍裡。也許是想說：以後用這個量。' },
  patchrobe: { n: '拾荒王的補丁袍', base: 'armor_l', il: 3, fam: 'gen', affs: [['S4', 0]],
    rule: '你身上每多一種系的詞條，攻擊、生命、護甲各 +3%（至多 5 種）。',
    lore: '七種布，七個顏色，全是從死人身上撿的。穿它的人說：我身上有整座城。' },
};
LEG.anchorblade = { n: '殘刃・斷錨', base: 'sword', il: 10, fam: 'aloft', affs: [['F2', 2], ['S7', 2]],
  rule: '每場戰鬥一次：你的墜擊，對沒有浮空的目標也成立。',
  lore: '三百年前，這把劍砍進了一樣不該砍的東西，自己也斷了。半截留在切口裡，半截跟著一個人躺進石頭。現在接縫是金的。沒有人知道是誰補的。' };
for (const k in LEG) LEG[k].id = k;

// ---------- 物品 ----------
let _uid = 1;
function newUid() { return 'i' + (G ? (G.uid = (G.uid || 1) + 1) : _uid++); }
function itemBase(it) { return BASE[it.base]; }
function itemName(it) {
  if (it.leg) return LEG[it.leg].n;
  const b = BASE[it.base]; const bn = it.bn || b.n;
  const key = it.affs.find(a => !AFF[a.id].stat) || it.affs[0];
  let s = key ? AFF[key.id].n + '・' + bn : bn;
  return s + (it.up ? ' +' + it.up : '');
}
function itemStats(it) { // 基礎屬性（含強化）
  const b = BASE[it.base], k = 1 + .08 * (it.up || 0), o = {};
  if (b.atk) o.atk = Math.round(weaponAtk(it.il) * b.atk * k * 10) / 10;
  if (b.hp) o.hp = Math.round((b.hp[0] + b.hp[1] * it.il) * k);
  if (b.arm) o.arm = Math.round((b.arm[0] + b.arm[1] * it.il) * k);
  if (b.spd) o.spd = b.spd;
  if (b.impact) o.impact = b.impact;
  return o;
}
function itemWho(it) { return BASE[it.base].who || null; }
function canEquip(hid, it) { const b = BASE[it.base]; if (b.who && b.who !== hid) return false; if (b.heavy && !HERO[hid].heavyOk) return false; return true; }
function itemFams(it) { const f = {}; for (const a of it.affs) { const k = AFF[a.id].fam; if (k !== 'gen') f[k] = (f[k] || 0) + 1; } if (it.leg && LEG[it.leg].fam !== 'gen') f[LEG[it.leg].fam] = (f[LEG[it.leg].fam] || 0) + 1; return f; }
function itemValue(it) { return Math.round((8 + it.il * 5) * [1, 1.8, 3.2, 5.5, 12][it.rar] * (1 + .25 * (it.up || 0))); }
function salvageYield(it) { return { scrap: [1, 2, 3, 5, 8][it.rar] + (it.up || 0), dust: it.rar >= 3 ? 1 : 0 }; }

function affPool(slot, tier, exclude, wantStat) {
  const out = [];
  for (const k in AFF) {
    const a = AFF[k];
    if (!a.slot.includes(slot)) continue;
    if (a.minT != null && tier < a.minT) continue;
    if (exclude && exclude.includes(k)) continue;
    if (wantStat === true && !a.stat) continue;
    if (wantStat === false && a.stat) continue;
    out.push(a);
  }
  return out;
}
function rollAffix(slot, tier, have, famBias) {
  const hasStat = have.some(id => AFF[id].stat);
  let pool = affPool(slot, tier, have, hasStat ? false : undefined);
  if (!pool.length) pool = affPool(slot, tier, have);
  if (!pool.length) return null;
  const list = pool.map(a => ({ a, w: (a.stat ? .8 : 1) * (famBias && famBias[a.fam] ? 2 : 1) }));
  return { id: R.weighted(list).a.id, t: tier };
}
// 生成一件隨機裝備
function genItem(o) {
  const il = Math.max(1, o.il | 0), tier = tierOf(il);
  let base = o.base;
  if (!base) {
    const slot = o.slot || R.weighted([{ s: 'weapon', w: 30 }, { s: 'armor', w: 28 }, { s: 'trinket', w: 28 }, { s: 'relic', w: o.rar >= 2 ? 14 : 0 }]).s;
    if (slot === 'weapon') {
      const who = o.who || R.pick(o.party || ['wei', 'yuan', 'luo']);
      const fam = HERO[who].weapon === 'sword' ? 'sword' : HERO[who].weapon === 'hookbow' ? 'bow' : 'shield';
      base = fam + R.weighted([{ s: '', w: 5 }, { s: '_l', w: 3 }, { s: '_h', w: 3 }]).s;
    } else if (slot === 'armor') base = R.weighted([{ s: 'armor_l', w: 4 }, { s: 'armor_m', w: 4 }, { s: 'armor_h', w: 3 }]).s;
    else base = slot;
  }
  const b = BASE[base]; let rar = o.rar | 0;
  if (b.slot === 'relic' && rar < 1) rar = 1;
  const it = { uid: newUid(), base, il, rar, affs: [], up: 0, isNew: true };
  if (b.names) it.bn = R.pick(b.names);
  const n = RAR[rar].affs;
  for (let i = 0; i < n; i++) { const a = rollAffix(b.slot, tier, it.affs.map(x => x.id), o.famBias); if (a) it.affs.push(a); }
  // 遺物至少帶一條自己的系詞條
  if (b.slot === 'relic' && !it.affs.some(a => !AFF[a.id].stat)) { const p = affPool('relic', tier, it.affs.map(x => x.id), false); if (p.length) it.affs[0] = { id: R.pick(p).id, t: tier }; }
  return it;
}
function genLegend(id) {
  const L = LEG[id];
  return { uid: newUid(), base: L.base, il: L.il, rar: 4, leg: id, affs: L.affs.map(a => ({ id: a[0], t: a[1] })), up: 0, isNew: true };
}
const DROP_W = {
  mob:   [55, 30, 12, 3],
  elite: [0, 40, 45, 15],
  chest: [0, 55, 38, 7],
  lock:  [0, 0, 70, 30],
};
function rollRarity(src) { const w = DROP_W[src]; let r = rnd() * (w[0] + w[1] + w[2] + w[3]); for (let i = 0; i < 4; i++) { r -= w[i]; if (r <= 0) return i; } return 0; }
// 貼心掉落：看隊伍現況決定部位與系
function partyNeeds() {
  if (!G) return {};
  const ids = G.roster.filter(id => G.party[id] && G.party[id].active);
  let worst = null, worstR = 99; const fam = {};
  for (const id of ids) {
    const p = G.party[id];
    for (const s of SLOTS) { const it = p.eq[s] ? G.items[p.eq[s]] : null; const r = it ? it.rar : -1; if (r < worstR || (r === worstR && rnd() < .5)) { worstR = r; worst = { slot: s, who: id }; } }
    for (const s of SLOTS) { const it = p.eq[s] ? G.items[p.eq[s]] : null; if (it) { const f = itemFams(it); for (const k in f) fam[k] = (fam[k] || 0) + f[k]; } }
  }
  const bias = {}; for (const k in fam) if (fam[k] >= 2) bias[k] = 1;
  return { worst, bias, ids };
}
function rollDrop(src, zl) {
  let rar = rollRarity(src);
  if (G) { if (rar >= 2) G.pity = 0; else if ((G.pity || 0) >= 4 && src !== 'mob0') { rar = 2; G.pity = 0; } }
  const need = partyNeeds(); const o = { il: Math.max(1, zl + R.i(-1, 1)), rar, famBias: need.bias, party: need.ids };
  if (need.worst && rnd() < .7) { o.slot = need.worst.slot; if (o.slot === 'weapon') o.who = need.worst.who; if (o.slot === 'relic' && rar < 2) o.slot = 'trinket'; }
  return genItem(o);
}
// ---------- 工坊 ----------
const upCost = it => { const u = (it.up || 0) + 1; return { coin: [40, 80, 140, 220, 320][u - 1], scrap: [3, 6, 10, 14, 18][u - 1], dust: u >= 3 ? u - 2 : 0 }; };
const upMax = it => it.rar === 4 ? 5 : 3;
const REFORGE_COST = { coin: 60, dust: 2 };
const KINTSUGI_COST = { coin: 100, lacquer: 1 };
function reforgeOptions(it, idx) {
  const b = BASE[it.base], tier = tierOf(it.il), have = it.affs.filter((_, i) => i !== idx).map(a => a.id).concat([it.affs[idx].id]);
  const out = [], used = have.slice();
  for (let i = 0; i < 3; i++) { const hasStat = it.affs.some((a, j) => j !== idx && AFF[a.id].stat); let pool = affPool(b.slot, tier, used, hasStat ? false : undefined); if (!pool.length) break; const a = R.pick(pool); used.push(a.id); out.push({ id: a.id, t: tier }); }
  return out;
}
function kintsugiOptions(it) {
  const b = BASE[it.base], tier = tierOf(it.il), used = it.affs.map(a => a.id), out = [];
  for (let i = 0; i < 3; i++) { const hasStat = it.affs.some(a => AFF[a.id].stat); let pool = affPool(b.slot, tier, used, hasStat ? false : undefined); if (!pool.length) break; const a = R.pick(pool); used.push(a.id); out.push({ id: a.id, t: tier }); }
  return out;
}

// ---------- 角色最終屬性 ----------
// p＝G.party[id]：{ lv, eq:{slot:uid}, tal:{}, wounds }；回傳戰鬥用的屬性與詞條表
function calcHero(id, p, items) {
  const b = heroBaseStat(id, p.lv);
  const mods = {}, fams = {}, leg = {};
  let atkFlat = 0, hpFlat = 0, armFlat = 0, spd = b.spd, crit = b.crit, impact = 0, lift = 0, atkPct = 0, hpPct = 0, mom0 = 0;
  for (const s of SLOTS) {
    const it = p.eq[s] ? items[p.eq[s]] : null; if (!it) continue;
    const st = itemStats(it);
    atkFlat += st.atk || 0; hpFlat += st.hp || 0; armFlat += st.arm || 0; spd += st.spd || 0; impact += st.impact || 0;
    for (const a of it.affs) {
      const v = affVal(a);
      switch (a.id) {
        case 'S1': atkPct += v; break; case 'S2': hpPct += v; break; case 'S3': armFlat += v; break; case 'S4': spd += v; break;
        case 'S5': crit += v; break; case 'S6': mom0 += v; break; case 'S7': impact += 1; break; case 'S8': lift += 1; break;
        default: mods[a.id] = (mods[a.id] || 0) + v;
      }
    }
    if (it.leg) leg[it.leg] = 1;
    const f = itemFams(it); for (const k in f) fams[k] = (fams[k] || 0) + f[k];
  }
  let all = 0;
  if (leg.patchrobe) all = 3 * Math.min(5, Object.keys(fams).length);
  const wound = 1 - RULE.woundHp * (p.wounds || 0);
  const hpMax = Math.round((b.hp + hpFlat) * (1 + (hpPct + all) / 100) * wound);
  const atk = (b.atk + atkFlat) * (1 + (atkPct + all) / 100);
  const arm = Math.round((b.arm + armFlat) * (1 + all / 100));
  return { hpMax, atk, arm, spd, crit, impact, lift, mom0, mods, fams, leg, tal: p.tal || {} };
}
function partyResonance(ids, partyMap, items) {
  if (ids.length < 2) return null;
  const per = ids.map(id => calcHero(id, partyMap[id], items).fams);
  for (const f of ['cin', 'rust', 'aloft', 'shade', 'oath']) if (per.every(o => (o[f] || 0) >= 2)) return f;
  return null;
}
// 道具
const CONSUM = {
  potion: { n: '止血膏', max: 3, price: 12, d: '回復 35% 生命，可拉起倒地的人。' },
  fire:   { n: '火油瓶', max: 3, price: 30, d: '全體敵人受到少量傷害、灼燒 2 層。' },
  float:  { n: '浮石彈', max: 3, price: 36, d: '全體敵人浮力 2。' },
};
