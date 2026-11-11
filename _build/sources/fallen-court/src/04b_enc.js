// ============ 遭遇表 ============
// zl 區域等級；foes 敵人（可寫 [類型, 排] 指定站位）；scene 地利；lv 預期隊伍等級（模擬器用）
const ENC = {
  // 序・靜滯窖
  z0a: { zone: 'vault', zl: 1, lv: 1, foes: ['hound'], tut: 'first', noFlee: true, atkK: .8 },
  z0b: { zone: 'vault', zl: 1, lv: 1, foes: ['hound', 'hound', 'hound'], tut: 'second', noFlee: true, atkK: .72 },
  // 骸骨坡
  s1: { zone: 'slope', zl: 2, lv: 2, foes: ['hound', 'hound', 'spitter'], atkK: .88 },
  s2: { zone: 'slope', zl: 2, lv: 2, foes: ['crab', 'hound'] },
  s3: { zone: 'slope', zl: 3, lv: 3, foes: ['spitter', 'crab', 'spitter'], scene: ['cluster', 'barrel'] },
  s4: { zone: 'slope', zl: 3, lv: 3, foes: ['warden', 'drone'] },
  s5: { zone: 'slope', zl: 3, lv: 3, foes: ['hound', 'hound', 'hound'], scene: ['barrel'] },
  s6: { zone: 'slope', zl: 3, lv: 4, foes: ['hound', 'threejaw', 'hound'], elite: true, drop: 'collar' },
  sb: { zone: 'slope', zl: 4, lv: 5, foes: ['drone', 'drone07', 'drone', 'drone'], elite: true, drop: 'wick', bounty: 'b07' },
  // 沉油渠
  o1: { zone: 'sump', zl: 4, lv: 5, foes: ['unmoored', 'unmoored', 'spitter'] },
  o2: { zone: 'sump', zl: 4, lv: 5, foes: ['spore', 'moss', 'spore'], scene: ['oil', 'barrel'] },
  o3: { zone: 'sump', zl: 5, lv: 5, foes: ['warden', 'warden', 'arbalest'] },
  o4: { zone: 'sump', zl: 5, lv: 6, foes: ['unmoored', 'moss', 'unmoored'], scene: ['cluster'] },
  o5: { zone: 'sump', zl: 5, lv: 6, foes: ['unmoored', 'elder', 'unmoored'], scene: ['hang'], elite: true, noFlee: true },
  ob: { zone: 'sump', zl: 6, lv: 6, foes: ['citycrab', 'spitter'], scene: ['oil'], elite: true, drop: 'ballast', bounty: 'bcity' },
  // 懸骸廊
  h1: { zone: 'gallery', zl: 6, lv: 7, foes: ['bruiser', 'bruiser', 'rigger'], scene: ['hang'] },
  h2: { zone: 'gallery', zl: 6, lv: 7, foes: ['bruiser', 'rigger', 'rigger'], scene: ['ledge'] },
  h3: { zone: 'gallery', zl: 7, lv: 7, foes: ['bruiser', 'foreman', 'bruiser', 'rigger'], elite: true },
  h4: { zone: 'gallery', zl: 7, lv: 8, foes: ['arbalest', 'drone', 'arbalest'], scene: ['ledge'] },
  h5: { zone: 'gallery', zl: 7, lv: 8, foes: ['bruiser', 'zhuo', 'bruiser', 'rigger'], scene: ['hang'], elite: true, noFlee: true, drop: 'pricetag' },
  // 錨鏈根
  r1: { zone: 'root', zl: 8, lv: 8, foes: ['warden', 'warden', 'arbalest', 'drone'] },
  r2: { zone: 'root', zl: 8, lv: 9, foes: ['unmoored', 'moss', 'unmoored', 'unmoored'], scene: ['ledge'] },
  r3: { zone: 'root', zl: 8, lv: 9, foes: ['warden', 'warden', 'arbalest', 'arbalest'] },
  boss: { zone: 'root', zl: 9, lv: 10, foes: ['keeper', 'pylon', 'pylon', 'pylon', 'pylon'], scene: ['hang', 'hang', 'hang'], boss: true, noFlee: true },
};
for (const k in ENC) ENC[k].id = k;
