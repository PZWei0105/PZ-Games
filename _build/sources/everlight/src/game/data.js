// 遊戲資料：角色、技能、敵人、道具、武器、刻印
export const TYPES = {
  blade: { n: '刃', c: '#d9dde6' }, pierce: { n: '刺', c: '#7fe0d8' }, blunt: { n: '鈍', c: '#d8a878' },
  fire: { n: '焰', c: '#ff8a4a' }, tide: { n: '潮', c: '#5aa8ff' }, light: { n: '光', c: '#ffd76a' }, shadow: { n: '影', c: '#b48aff' },
};
export const PHASE = { L: '明', D: '暗' };

// 技能：phase L=只在明、D=只在暗、A=都可
// kind: atk（物理）mag（術）heal buff special
export const SKILLS = {
  // 魏子葳
  w_attack: { name: '燈鉤', type: 'blunt', kind: 'atk', pow: 1.0, cost: 0, target: 'enemy', phase: 'A', basic: true, fx: 'blunt' },
  w_reveal: { name: '照見', type: 'light', kind: 'mag', pow: 1.35, cost: 1, target: 'enemy', phase: 'L', reveal: 1, fx: 'light', desc: '光屬性。打之前先照出目標一個弱點。' },
  w_hook: { name: '鉤連', type: 'pierce', kind: 'atk', pow: 0.75, hits: 2, cost: 2, target: 'enemy', phase: 'A', fx: 'pierce', desc: '刺屬性兩連擊，一次削兩格架勢。' },
  w_douse: { name: '熄燈一擊', type: 'shadow', kind: 'mag', pow: 1.8, cost: 2, target: 'enemy', phase: 'D', fx: 'shadow', desc: '影屬性重擊。' },
  w_halo: { name: '燈暈', kind: 'heal', pow: 0.9, cost: 2, target: 'allies', phase: 'L', fx: 'heal', desc: '溫暖的燈光替全隊回復體力。', lv: 4 },
  w_bind: { name: '影縛', type: 'shadow', kind: 'mag', pow: 0.85, cost: 3, target: 'enemies', phase: 'D', debuff: { spd: -0.3, turns: 2 }, fx: 'shadow', desc: '影屬性全體攻擊，並拖慢敵人。', lv: 6 },
  // 莉瑟
  l_attack: { name: '斬擊', type: 'blade', kind: 'atk', pow: 1.0, cost: 0, target: 'enemy', phase: 'A', basic: true, fx: 'slash' },
  l_sunblade: { name: '烈陽斬', type: 'fire', kind: 'atk', pow: 1.7, cost: 2, target: 'enemy', phase: 'L', fx: 'fire', desc: '焰屬性的重斬。' },
  l_halo: { name: '日輪', type: 'light', kind: 'atk', pow: 0.8, cost: 3, target: 'enemies', phase: 'L', fx: 'light', desc: '光屬性全體攻擊。' },
  l_vigil: { name: '守夜', kind: 'buff', cost: 1, target: 'self', phase: 'D', buff: { def: 0.6, turns: 2 }, taunt: 2, fx: 'guard', desc: '兩回合內吸引敵人攻擊自己，並提高防禦。' },
  l_bash: { name: '盾擊', type: 'blunt', kind: 'atk', pow: 1.25, cost: 2, target: 'enemy', phase: 'A', debuff: { atk: -0.25, turns: 2 }, fx: 'blunt', desc: '鈍屬性，並降低目標攻擊。' },
  l_matins: { name: '晨禱', kind: 'buff', cost: 2, target: 'allies', phase: 'L', buff: { atk: 0.3, turns: 3 }, fx: 'buff', desc: '全隊攻擊上升三回合。', lv: 6 },
  // 諾克
  n_attack: { name: '刺擊', type: 'pierce', kind: 'atk', pow: 1.0, cost: 0, target: 'enemy', phase: 'A', basic: true, fx: 'pierce' },
  n_shadowstep: { name: '影襲', type: 'shadow', kind: 'atk', pow: 0.85, hits: 2, cost: 2, target: 'enemy', phase: 'D', fx: 'shadow', desc: '影屬性兩連擊。' },
  n_tidestab: { name: '潮刺', type: 'tide', kind: 'atk', pow: 1.45, cost: 1, target: 'enemy', phase: 'D', fx: 'tide', desc: '潮屬性突刺。' },
  n_whirl: { name: '暗渦', type: 'tide', kind: 'mag', pow: 0.95, cost: 3, target: 'enemies', phase: 'D', fx: 'tide', desc: '潮屬性全體攻擊。', lv: 6 },
  n_smoke: { name: '煙幕', kind: 'buff', cost: 2, target: 'allies', phase: 'L', buff: { eva: 0.4, turns: 2 }, fx: 'smoke', desc: '全隊兩回合內容易閃開攻擊。' },
  n_pilfer: { name: '順手', type: 'blade', kind: 'atk', pow: 0.8, cost: 1, target: 'enemy', phase: 'A', steal: true, fx: 'slash', desc: '刃屬性，順便偷一樣東西。失衡的敵人一定偷得到。' },
  // 歐文（臨時隊友）
  o_attack: { name: '燈杖', type: 'blunt', kind: 'atk', pow: 1.0, cost: 0, target: 'enemy', phase: 'A', basic: true, fx: 'blunt' },
  o_ever: { name: '長明之光', type: 'light', kind: 'mag', pow: 1.4, cost: 2, target: 'enemies', phase: 'L', fx: 'light', desc: '光屬性全體攻擊。' },
  o_keep: { name: '守燈', kind: 'heal', pow: 1.2, cost: 2, target: 'allies', phase: 'A', fx: 'heal', desc: '全隊回復體力。' },
  o_dim: { name: '餘燼', type: 'fire', kind: 'mag', pow: 1.5, cost: 1, target: 'enemy', phase: 'D', fx: 'fire', desc: '焰屬性。' },
};

// 絕技
export const ULTS = {
  wei: { name: '晨昏一線', desc: '同時帶著光與影劈開全體敵人，並翻轉明暗。', hits: [['light', 1.5], ['shadow', 1.5]], kind: 'mag', target: 'enemies', flip: true },
  lise: { name: '正午', desc: '喚出一輪小太陽：焰屬性三連擊全體，並替全隊回復。', hits: [['fire', 0.9], ['fire', 0.9], ['fire', 0.9]], kind: 'atk', target: 'enemies', heal: 0.25 },
  noct: { name: '深淵潮', desc: '潮屬性四連擊隨機敵人，並偷走東西。', hits: [['tide', 1.0], ['tide', 1.0], ['tide', 1.0], ['tide', 1.0]], kind: 'atk', target: 'random', steal: true },
  owen: { name: '燈守之誓', desc: '全隊回滿體力與光。', kind: 'heal', target: 'allies', full: true },
};

export const CHARS = {
  wei: { name: '魏子葳', title: '燈守學徒', base: { hp: 120, atk: 13, def: 10, mag: 14, res: 11, spd: 12 }, grow: { hp: 13, atk: 1.7, def: 1.3, mag: 1.9, res: 1.4, spd: 0.9 },
    skills: [['w_attack', 1], ['w_reveal', 1], ['w_hook', 1], ['w_douse', 1], ['w_halo', 4], ['w_bind', 6]], lamp: true, weaponType: 'hook' },
  lise: { name: '莉瑟', title: '赫利昂潮汛官', base: { hp: 150, atk: 15, def: 14, mag: 9, res: 9, spd: 9 }, grow: { hp: 15, atk: 1.9, def: 1.6, mag: 0.9, res: 1.0, spd: 0.7 },
    skills: [['l_attack', 1], ['l_sunblade', 1], ['l_bash', 1], ['l_vigil', 1], ['l_halo', 4], ['l_matins', 6]], weaponType: 'sword' },
  noct: { name: '諾克', title: '夜邦拾荒客', base: { hp: 100, atk: 13, def: 8, mag: 12, res: 10, spd: 16 }, grow: { hp: 10, atk: 1.6, def: 0.9, mag: 1.5, res: 1.1, spd: 1.3 },
    skills: [['n_attack', 1], ['n_tidestab', 1], ['n_shadowstep', 1], ['n_pilfer', 1], ['n_smoke', 1], ['n_whirl', 6]], weaponType: 'dagger' },
  owen: { name: '歐文', title: '老燈守', base: { hp: 260, atk: 14, def: 13, mag: 24, res: 20, spd: 10 }, grow: { hp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0 },
    skills: [['o_attack', 1], ['o_ever', 1], ['o_keep', 1], ['o_dim', 1]], guest: true, fixedLv: 12 },
};

export const expToNext = (lv) => 20 + lv * lv * 12;

export function statsAt(id, lv) {
  const c = CHARS[id], s = {};
  for (const k of Object.keys(c.base)) s[k] = Math.round(c.base[k] + c.grow[k] * (lv - 1));
  return s;
}

// 道具
export const ITEMS = {
  potion: { name: '潮藥', icon: 'potion', desc: '回復一人 80 點體力。', use: { heal: 80 }, price: 30, battle: true, field: true },
  bigpotion: { name: '大潮藥', icon: 'bigpotion', desc: '回復一人 220 點體力。', use: { heal: 220 }, price: 90, battle: true, field: true },
  oil: { name: '燈油滴', icon: 'oil', desc: '一人恢復 2 點光。', use: { lumen: 2 }, price: 60, battle: true },
  incense: { name: '醒神香', icon: 'incense', desc: '讓倒下的隊友醒來，回復三成體力。', use: { revive: 0.3 }, price: 120, battle: true, field: true },
  salt: { name: '鹽晶', icon: 'salt', desc: '淬鍊武器的素材。', price: 0, sell: 12, mat: true },
  iron: { name: '舊鐵片', icon: 'iron', desc: '淬鍊武器的素材。', price: 0, sell: 15, mat: true },
  shard: { name: '遺跡碎片', icon: 'shard', desc: '帶著微光的碎片，淬鍊高級武器用。', price: 0, sell: 40, mat: true },
  pearl: { name: '月白珠', icon: 'pearl', desc: '只在明暗交界處長出的珍珠，非常值錢。', price: 0, sell: 160, mat: true },
  bone: { name: '鯨骨', icon: 'bone', desc: '老鍛造師藏著的寶貝。', price: 0, sell: 0, mat: true, key: true },
  // 魚
  f_mackerel: { name: '潮鯖', icon: 'fish', desc: '晨昏海最常見的魚。料理、賣錢都好。', sell: 8, fish: true },
  f_glowfin: { name: '燈籠魚', icon: 'fish', desc: '只在「暗」裡上鉤，鰭會發光。', sell: 26, fish: true },
  f_sunbream: { name: '曦鯛', icon: 'fish', desc: '只在「明」裡上鉤，鱗片像日光。', sell: 30, fish: true },
  f_eelling: { name: '鐵牙小鰻', icon: 'fish', desc: '咬住就不放的小鰻。', sell: 18, fish: true },
  f_moonray: { name: '月鰩', icon: 'fish', desc: '傳說中「月亮掉進海裡那晚」才出現的魚。', sell: 200, fish: true, rare: true },
  // 料理
  c_grill: { name: '烤潮鯖', icon: 'fish', desc: '下三場戰鬥，開場每人多 1 點光。', meal: { lumen: 1, n: 3 } },
  c_soup: { name: '燈籠魚湯', icon: 'fish', desc: '下三場戰鬥，每回合回復 4% 體力。', meal: { regen: 0.04, n: 3 } },
  c_feast: { name: '曦鯛蒸飯', icon: 'fish', desc: '下三場戰鬥，絕技槽一開場就有四成。', meal: { ult: 40, n: 3 } },
};

export const RECIPES = [
  { id: 'c_grill', need: { f_mackerel: 2 } },
  { id: 'c_soup', need: { f_glowfin: 1, f_mackerel: 1 } },
  { id: 'c_feast', need: { f_sunbream: 1, f_eelling: 1 } },
];

// 武器：atk 加成、星級上限、刻槽
export const WEAPONS = {
  hook1: { name: '燈鉤', who: 'wei', atk: 6, mag: 4, slots: 1, desc: '燈塔配給的長柄燈鉤。' },
  hook2: { name: '鯨骨燈鉤', who: 'wei', atk: 11, mag: 8, slots: 2, desc: '鯨骨打的柄，輕又韌。', price: 0 },
  hook3: { name: '長明燈鉤', who: 'wei', atk: 15, mag: 14, slots: 2, desc: '師父的燈鉤。燈芯還是溫的。' },
  sword1: { name: '潮汛官長劍', who: 'lise', atk: 8, slots: 1, desc: '赫利昂軍的制式長劍。' },
  sword2: { name: '霧港鍛劍', who: 'lise', atk: 13, slots: 1, desc: '霧港老師傅打的劍，重心偏前。', price: 420 },
  sword3: { name: '沉鐘斷刃', who: 'lise', atk: 17, mag: 4, slots: 2, desc: '從沉鐘遺跡帶出來的古劍。' },
  dagger1: { name: '拾荒短匕', who: 'noct', atk: 7, slots: 1, desc: '撿來的，磨過很多次。' },
  dagger2: { name: '鰻牙匕', who: 'noct', atk: 12, slots: 2, desc: '用鐵顎鰻的牙磨成的匕首。' },
  dagger3: { name: '霧港雙刃', who: 'noct', atk: 10, slots: 1, desc: '輕巧的一對短刃。', price: 360 },
  staff1: { name: '老燈杖', who: 'owen', atk: 8, mag: 10, slots: 0, desc: '' },
};
export const ACCESSORIES = {
  a_shell: { name: '貝殼護符', desc: '防禦 +4', mod: { def: 4 }, price: 120 },
  a_scale: { name: '燈籠魚鱗', desc: '術防 +5', mod: { res: 5 }, price: 140 },
  a_compass: { name: '舊羅盤', desc: '速度 +3', mod: { spd: 3 }, price: 200 },
  a_salt: { name: '鹽晶耳墜', desc: '體力 +40', mod: { hp: 40 }, price: 180 },
  a_pearl: { name: '月白項鍊', desc: '每回合多回復 1 點光的機率 30%', mod: { lumenChance: 0.3 } },
};
// 刻印
export const ENGRAVES = {
  e_sight: { name: '照見刻', desc: '戰鬥開場，照出每個敵人一個弱點。' },
  e_afterglow: { name: '餘暉刻', desc: '餘暉加成每點光 +30%（原本 +20%）。' },
  e_break: { name: '破勢刻', desc: '對失衡的敵人傷害再 +20%。' },
  e_swift: { name: '疾光刻', desc: '戰鬥開場多 1 點光。' },
  e_keeper: { name: '守燈刻', desc: '被打中時有三成機率回 1 點光。' },
  e_tide: { name: '潮汐刻', desc: '明暗翻轉時回復 10% 體力。' },
  e_chain: { name: '斷鎖刻', desc: '打中弱點時，兩成機率多削一格架勢。' },
  e_ever: { name: '長明刻', desc: '絕技槽累積速度 +30%。' },
};
// 淬鍊：每升一星 atk +3（mag +2），需要的素材
export const TEMPER = [
  null,
  { gold: 120, mats: { salt: 2, iron: 1 } },
  { gold: 300, mats: { iron: 2, shard: 2 } },
];

// ---------------- 敵人 ----------------
// weak: { L: [...], D: [...] }  guard: 架勢格數
export const ENEMIES = {
  crab: { name: '礁蟹', art: 'crab', lv: 2, hp: 72, atk: 12, def: 12, mag: 4, res: 6, spd: 7, guard: 2, weak: { L: ['blunt', 'fire'], D: ['pierce', 'tide'] }, exp: 16, gold: 8,
    drop: [['salt', 0.3]], steal: 'potion', moves: [['pinch', 3], ['shell', 1, 'L']], size: 1.2 },
  crab2: { name: '紫礁蟹', art: 'crab2', lv: 5, hp: 170, atk: 24, def: 18, mag: 6, res: 10, spd: 8, guard: 3, weak: { L: ['blunt', 'light'], D: ['pierce', 'tide'] }, exp: 44, gold: 18,
    drop: [['salt', 0.5]], steal: 'salt', moves: [['pinch', 3], ['shell', 1, 'L'], ['bubble', 1]], size: 1.25 },
  jelly: { name: '浮燈水母', art: 'jelly', lv: 3, hp: 70, atk: 10, def: 6, mag: 18, res: 12, spd: 11, guard: 2, weak: { L: ['blade', 'fire'], D: ['shadow'] }, exp: 20, gold: 10,
    drop: [['potion', 0.2]], steal: 'oil', moves: [['sting', 3], ['glow', 2, 'D']], size: 1.0, fly: 0.6 },
  wraith: { name: '潮鬼', art: 'wraith', lv: 3, hp: 90, atk: 14, def: 8, mag: 17, res: 10, spd: 10, guard: 3, weak: { L: ['light', 'fire', 'blade'], D: [] }, exp: 24, gold: 12,
    drop: [['oil', 0.15]], steal: 'incense', moves: [['grasp', 3], ['howl', 1, 'D']], size: 1.15, fly: 0.3, nightStrong: 0.3 },
  gull: { name: '崖鷗', art: 'gull', lv: 2, hp: 46, atk: 11, def: 6, mag: 4, res: 6, spd: 15, guard: 1, weak: { L: ['pierce', 'light'], D: ['pierce', 'shadow'] }, exp: 12, gold: 6,
    drop: [['f_mackerel', 0.3]], steal: 'f_mackerel', moves: [['dive', 3], ['peck', 2]], size: 0.95, fly: 1.1 },
  snail: { name: '鹽殼蝸', art: 'snail', lv: 5, hp: 190, atk: 19, def: 28, mag: 8, res: 22, spd: 4, guard: 4, weak: { L: ['blunt'], D: ['tide', 'blunt'] }, exp: 48, gold: 22,
    drop: [['salt', 0.8]], steal: 'salt', moves: [['slam', 3], ['harden', 1], ['slime', 1]], size: 1.25 },
  rustguard: { name: '鏽甲兵', art: 'rustguard', lv: 6, hp: 220, atk: 28, def: 22, mag: 6, res: 12, spd: 8, guard: 4, weak: { L: ['blunt', 'light'], D: ['tide', 'pierce'] }, exp: 62, gold: 26,
    drop: [['iron', 0.6]], steal: 'iron', moves: [['halberd', 3], ['sweep', 1]], size: 1.3 },
  shade: { name: '沉影', art: 'shade', lv: 6, hp: 160, atk: 20, def: 12, mag: 26, res: 16, spd: 12, guard: 3, weak: { L: ['light', 'blade'], D: ['blade', 'blunt'] }, exp: 58, gold: 24,
    drop: [['shard', 0.3]], steal: 'oil', moves: [['drag', 2], ['dirge', 1], ['touch', 2]], size: 1.25, fly: 0.15 },
  bellwisp: { name: '鐘靈', art: 'bellwisp', lv: 8, hp: 110, atk: 16, def: 12, mag: 20, res: 16, spd: 13, guard: 2, weak: { L: ['blunt'], D: ['shadow', 'pierce'] }, exp: 30, gold: 0,
    moves: [['chime', 2], ['resonate', 2]], size: 0.9, fly: 0.8 },
  eel: { name: '鐵顎鰻', art: 'eel', lv: 7, hp: 1500, atk: 31, def: 17, mag: 21, res: 14, spd: 11, guard: 6, weak: { L: ['blade', 'fire'], D: ['shadow', 'blunt'] }, exp: 320, gold: 160,
    drop: [['dagger2', 1, 'w']], steal: 'shard', boss: 'mid', moves: [['bite', 3], ['tail', 2], ['maelstrom', 0]], size: 1.0, big: true },
  warden: { name: '沉鐘守', art: 'warden', lv: 9, hp: 2900, atk: 34, def: 21, mag: 30, res: 18, spd: 9, guard: 8, weak: { L: ['blunt', 'fire'], D: ['shadow', 'pierce', 'tide'] }, exp: 720, gold: 360,
    drop: [['sword3', 1, 'w'], ['shard', 1]], steal: 'pearl', boss: 'main', moves: [['clapper', 3], ['quake', 2], ['summon', 0], ['toll', 0], ['darkturn', 0]], size: 1.0, big: true },
  soldier: { name: '赫利昂槍兵', art: 'soldier', lv: 8, hp: 200, atk: 29, def: 18, mag: 8, res: 12, spd: 10, guard: 3, weak: { L: ['pierce', 'blunt'], D: ['blade', 'shadow'] }, exp: 70, gold: 30,
    drop: [['potion', 0.4]], steal: 'bigpotion', moves: [['thrust', 3], ['brace', 1]], size: 1.25, human: true },
  duelist: { name: '赫利昂劍士', art: 'archer', lv: 8, hp: 180, atk: 31, def: 14, mag: 8, res: 10, spd: 14, guard: 3, weak: { L: ['blade', 'fire'], D: ['pierce', 'tide'] }, exp: 72, gold: 32,
    drop: [['oil', 0.3]], steal: 'oil', moves: [['slash', 3], ['flurry', 1]], size: 1.25, human: true },
  gray: { name: '副官葛雷', art: 'gray', lv: 10, hp: 2700, atk: 36, def: 23, mag: 20, res: 18, spd: 14, guard: 7, weak: { L: ['pierce', 'fire'], D: ['shadow', 'blunt'] }, exp: 900, gold: 400,
    drop: [], steal: 'a_compass', boss: 'final', moves: [['judge', 3], ['coldfront', 2], ['flare', 0], ['order', 0], ['execute', 0]], size: 1.4, human: true },
};

// 敵人招式
export const MOVES = {
  pinch: { name: '鉗擊', kind: 'atk', pow: 1.0, target: 'one', fx: 'slash' },
  shell: { name: '縮殼', kind: 'buff', buff: { def: 0.5, turns: 2 }, target: 'self', fx: 'guard', text: '縮進殼裡，防禦上升。' },
  bubble: { name: '泡沫', kind: 'mag', pow: 0.7, target: 'all', fx: 'tide' },
  sting: { name: '刺螫', kind: 'mag', pow: 1.0, target: 'one', fx: 'tide' },
  glow: { name: '螢光', kind: 'heal', pow: 0.25, target: 'ally', fx: 'heal', text: '暗裡的螢光替同伴療傷。' },
  grasp: { name: '冥手', kind: 'mag', pow: 1.1, target: 'one', fx: 'shadow' },
  howl: { name: '夜嚎', kind: 'drain', lumen: 1, target: 'all', fx: 'shadow', text: '全隊的光被吸走 1 點！' },
  dive: { name: '俯衝', kind: 'atk', pow: 1.15, target: 'one', fx: 'pierce' },
  peck: { name: '啄', kind: 'atk', pow: 0.8, target: 'one', fx: 'pierce' },
  slam: { name: '殼撞', kind: 'atk', pow: 1.1, target: 'one', fx: 'blunt' },
  harden: { name: '鹽殼', kind: 'buff', buff: { def: 0.6, turns: 2 }, target: 'self', fx: 'guard', text: '鹽晶包住了殼。' },
  slime: { name: '黏液', kind: 'debuff', debuff: { spd: -0.3, turns: 2 }, target: 'one', fx: 'tide', text: '速度下降！' },
  halberd: { name: '鏽戟', kind: 'atk', pow: 1.15, target: 'one', fx: 'slash' },
  sweep: { name: '橫掃', kind: 'atk', pow: 0.75, target: 'all', fx: 'slash' },
  drag: { name: '拖入水底', kind: 'mag', pow: 1.35, target: 'one', fx: 'tide' },
  dirge: { name: '哀歌', kind: 'drain', lumen: 1, target: 'all', fx: 'shadow', text: '哀歌讓全隊的光暗下來。' },
  touch: { name: '冰冷的手', kind: 'mag', pow: 0.9, target: 'one', fx: 'shadow' },
  chime: { name: '鐘音', kind: 'mag', pow: 0.6, target: 'all', fx: 'light' },
  resonate: { name: '共鳴', kind: 'healboss', pow: 0.05, target: 'boss', fx: 'heal', text: '鐘靈的共鳴替沉鐘守修補裂縫。' },
  bite: { name: '撕咬', kind: 'atk', pow: 1.3, target: 'one', fx: 'bite' },
  tail: { name: '甩尾', kind: 'atk', pow: 0.85, target: 'all', fx: 'blunt' },
  maelstrom: { name: '大漩渦', kind: 'mag', pow: 1.6, target: 'all', charge: 1, fx: 'tide', text: '鐵顎鰻捲起漩渦——下回合會吞沒全隊！' },
  clapper: { name: '鐘錘', kind: 'atk', pow: 1.35, target: 'one', fx: 'blunt' },
  quake: { name: '震盪', kind: 'atk', pow: 0.85, target: 'all', fx: 'blunt' },
  summon: { name: '喚靈', kind: 'summon', what: 'bellwisp', fx: 'light', text: '鐘聲喚醒了鐘靈。' },
  toll: { name: '沉鐘鳴響', kind: 'mag', pow: 2.1, target: 'all', charge: 2, fx: 'light', text: '沉鐘守開始蓄力——兩回合後鐘聲會震碎一切！' },
  darkturn: { name: '鐘鳴・暗轉', kind: 'phase', to: 'D', fx: 'shadow', text: '鐘聲把光趕走了。' },
  thrust: { name: '突刺', kind: 'atk', pow: 1.1, target: 'one', fx: 'pierce' },
  brace: { name: '列陣', kind: 'buff', buff: { def: 0.4, turns: 2 }, target: 'self', fx: 'guard', text: '舉盾列陣。' },
  slash: { name: '劈砍', kind: 'atk', pow: 1.1, target: 'one', fx: 'slash' },
  flurry: { name: '連斬', kind: 'atk', pow: 0.55, hits: 3, target: 'one', fx: 'slash' },
  judge: { name: '斷罪斬', kind: 'atk', pow: 1.35, target: 'one', fx: 'slash' },
  coldfront: { name: '冷鋒', kind: 'atk', pow: 0.8, target: 'all', fx: 'slash' },
  flare: { name: '照明彈', kind: 'phase', to: 'L', fx: 'light', text: '照明彈把夜色撕開——強制翻到「明」！' },
  order: { name: '號令', kind: 'buffall', buff: { atk: 0.3, turns: 3 }, fx: 'buff', text: '士兵們的攻擊上升了。' },
  execute: { name: '斬首令', kind: 'atk', pow: 2.6, target: 'lowest', charge: 1, fx: 'slash', text: '葛雷鎖定了最虛弱的人——下回合斬首！' },
};

// 遭遇
export const ENCOUNTERS = {
  tut1: { enemies: ['crab', 'crab'], stage: 'cape', phase: 'D', bgm: 'battle', noEscape: true, tutorial: 1 },
  tut2: { enemies: ['wraith', 'crab'], stage: 'cape', phase: 'D', bgm: 'battle', noEscape: true, tutorial: 2 },
  cape_a: { enemies: ['crab', 'gull'], stage: 'cape', phase: 'D' },
  cape_b: { enemies: ['wraith', 'wraith'], stage: 'cape', phase: 'D' },
  flats_a: { enemies: ['crab', 'jelly', 'crab'], stage: 'flats' },
  flats_b: { enemies: ['jelly', 'jelly', 'gull'], stage: 'flats' },
  flats_c: { enemies: ['snail', 'crab'], stage: 'flats' },
  flats_d: { enemies: ['wraith', 'jelly', 'wraith'], stage: 'flats' },
  flats_e: { enemies: ['crab2', 'gull', 'gull'], stage: 'flats' },
  ruins_a: { enemies: ['rustguard', 'shade'], stage: 'ruins' },
  ruins_b: { enemies: ['shade', 'shade', 'jelly'], stage: 'ruins' },
  ruins_c: { enemies: ['rustguard', 'crab2'], stage: 'ruins' },
  ruins_d: { enemies: ['snail', 'shade', 'rustguard'], stage: 'ruins' },
  boss_eel: { enemies: ['eel'], stage: 'ruins_water', bgm: 'boss', noEscape: true, phase: 'L' },
  boss_warden: { enemies: ['bellwisp', 'warden', 'bellwisp'], stage: 'bell', bgm: 'boss', noEscape: true, phase: 'L', boss: true },
  siege_a: { enemies: ['soldier', 'duelist'], stage: 'cape_siege', phase: 'D', noEscape: true },
  boss_gray: { enemies: ['soldier', 'gray', 'duelist'], stage: 'cape_siege', bgm: 'final', noEscape: true, phase: 'D', boss: true },
};

export const SHOPS = {
  general: { name: '霧港雜貨', items: ['potion', 'bigpotion', 'oil', 'incense', 'a_shell', 'a_scale'] },
  smith: { name: '老韓鍛造', items: ['sword2', 'dagger3', 'a_salt', 'a_compass'] },
};

// 魚：依明暗與地點
export const FISH = {
  cape: { L: [['f_mackerel', 6], ['f_sunbream', 2], ['f_eelling', 1]], D: [['f_mackerel', 5], ['f_glowfin', 3], ['f_eelling', 2], ['f_moonray', 0.25]] },
  flats: { L: [['f_mackerel', 5], ['f_sunbream', 3], ['f_eelling', 2]], D: [['f_mackerel', 4], ['f_glowfin', 3], ['f_eelling', 3], ['f_moonray', 0.4]] },
};
