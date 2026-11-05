// 地圖與戰鬥舞台
import { STORY } from './story.js';

// ---------- 小工具：用形狀畫格子 ----------
function G(w, h, ch) { return Array.from({ length: h }, () => Array(w).fill(ch)); }
function R(g, x, z, w, d, ch) { for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = ch; }
function E(g, cx, cz, rx, rz, ch, only) {
  for (let j = Math.max(0, Math.floor(cz - rz - 1)); j < Math.min(g.length, Math.ceil(cz + rz + 1)); j++)
    for (let i = Math.max(0, Math.floor(cx - rx - 1)); i < Math.min(g[0].length, Math.ceil(cx + rx + 1)); i++) {
      const dx = (i + 0.5 - cx) / rx, dz = (j + 0.5 - cz) / rz;
      if (dx * dx + dz * dz <= 1 && (!only || only.includes(g[j][i]))) g[j][i] = ch;
    }
}
function P(g, pts, r, ch, only) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L * 3));
    for (let s = 0; s <= n; s++) { const t = s / n; E(g, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, r, r, ch, only); }
  }
}
const rowsOf = (g) => g.map((r) => r.join(''));
const has = (k) => (F) => !!F[k];
const not = (k) => (F) => !F[k];

// ---------- 光線環境 ----------
const ENV = {
  night: { bg: '#070b16', fog: ['#070b16', 22, 50], hemi: ['#3e5e90', '#161c2e', 0.98], dir: { color: '#9ab4ff', i: 1.05, pos: [-8, 14, 6] }, ambient: '#56628e',
    post: { bloom: 0.62, threshold: 0.82, vignette: 0.5, sat: 1.0, tilt: 0.35, lift: [0.01, 0.012, 0.035], gain: [0.96, 1, 1.1] } },
  dusk: { bg: '#2a1e34', fog: ['#2a1e34', 24, 56], hemi: ['#e6a48a', '#34264a', 0.74], dir: { color: '#ffb888', i: 1.08, pos: [-12, 8, 7] }, ambient: '#6a5a78',
    post: { bloom: 0.45, threshold: 0.9, vignette: 0.46, sat: 1.04, tilt: 0.32, lift: [0.016, 0.01, 0.022], gain: [1.02, 0.97, 0.95] } },
  siege: { bg: '#0a0710', fog: ['#0a0710', 20, 46], hemi: ['#5a3a4a', '#140a12', 0.8], dir: { color: '#b0a0d0', i: 0.7, pos: [-8, 14, 6] }, ambient: '#4a3a54',
    post: { bloom: 0.7, threshold: 0.8, vignette: 0.56, sat: 1.0, tilt: 0.38, lift: [0.02, 0.008, 0.02], gain: [1.08, 0.95, 0.98] } },
  after: { bg: '#0c0f1c', fog: ['#0c0f1c', 24, 56], hemi: ['#ffe2b0', '#1e1a2a', 1.0], dir: { color: '#ffe8c0', i: 1.2, pos: [2, 18, 4] }, ambient: '#6a6480',
    post: { bloom: 0.75, threshold: 0.8, vignette: 0.45, sat: 1.04, tilt: 0.3, lift: [0.02, 0.016, 0.03], gain: [1.05, 1.0, 0.98] } },
  flats: { bg: '#040c16', fog: ['#040c16', 18, 44], hemi: ['#3a5a8a', '#0e1626', 1.0], dir: { color: '#9ab4ff', i: 0.95, pos: [-6, 14, 8] }, ambient: '#4a5a8c',
    post: { bloom: 0.72, threshold: 0.78, vignette: 0.5, sat: 1.06, tilt: 0.36, lift: [0.008, 0.016, 0.04], gain: [0.94, 1.0, 1.08] } },
  ruins: { bg: '#03070a', fog: ['#03070a', 15, 40], hemi: ['#2e5262', '#0c1014', 0.85], dir: { color: '#7ab0c0', i: 0.7, pos: [-4, 14, 6] }, ambient: '#44606a',
    post: { bloom: 0.78, threshold: 0.76, vignette: 0.56, sat: 0.98, tilt: 0.36, lift: [0.008, 0.016, 0.02], gain: [0.95, 1.02, 1.05] },
    phaseL: { hemi: ['#ffe0a6', '#3a3020', 1.05], dir: { color: '#ffd890', i: 1.3 }, ambient: '#8a7a62' } },
};
const WATER = {
  night: { deep: '#071a2c', shallow: '#16485a', foam: '#bcd8dc', sky: '#0c1a2c' },
  dusk: { deep: '#18203a', shallow: '#32566a', foam: '#c8b6ac', sky: '#3a2842' },
  siege: { deep: '#100a18', shallow: '#3a2030', foam: '#c8a0a0', sky: '#2a0e14' },
  flats: { deep: '#061626', shallow: '#13424e', foam: '#7ac0c8', sky: '#0a1a30' },
  ruins: { deep: '#04141c', shallow: '#0e3a40', foam: '#5aa8a0', sky: '#082028' },
};

// =====================================================================
// 孤燈岬
// =====================================================================
const CAPE_ROWS = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~cccppppppc~~~~~~~~',
  '~~~~~ccccccppppppcccc~~~~~',
  '~~~~cccccccppppppccccc~~~~',
  '~~~ccccccccppppppccccc~~~~',
  '~~~ccccccccppppppcccccc~~~',
  '~~~cccc3333ppppppcccccc~~~',
  '~~cccccccccc33ccccccccc~~~',
  '~~cccccccccc33cccccccccc~~',
  '~~cccccccccc33cccccccccc~~',
  '~~ccccccccccyyccccccccc~~~',
  '~bbbbbbbbbbb22bbbbbbbbbb~~',
  '~bbbbbbbbbb22bbbbbbbbbbb~~',
  '~bbbbbbbbb22bbbbbbbbbbbb~~',
  '~bbbbbbbb22bbbbbbbbbbbbb~~',
  '~bbbbbbbb22bbbbbbbbbbbb~~~',
  '~bbbbbbbbxxbbbbbbbbbbbb~~~',
  '~aaaaaaaa11aaaaaaaaaaaaa~~',
  '~aaaaaaaaa11aaaaaaaaaaaa~~',
  '~aaaaaaaaaa11aaaaaaaaaaaa~',
  '~;,,,,,,,,,,,,,,,,,,kkkk;~',
  '~;,,,,,,,,,,,,,,,,,,kkkk~~',
  '~~;,,,,,,,,,,,,,,,,,kkk~~~',
  '~~;,,~~,,,,,,,,,,,,,,,;~~~',
  '~~~;,~~,,,,,,,,,,,,,,;~~~~',
  '~~~~;;;;;;;;,,;;;;;;;;~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~==~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~',
];
const CAPE_LEGEND = {
  '~': { water: true, bed: -1.7 },
  c: { g: 'grass', h: 3 }, p: { g: 'slab', h: 3 }, 3: { g: 'dirt', h: 3 }, y: { g: 'dirt', h: 2.5 },
  b: { g: 'grass', h: 2 }, 2: { g: 'dirt', h: 2 }, x: { g: 'dirt', h: 1.5 },
  a: { g: 'meadow', h: 1 }, 1: { g: 'dirt', h: 1 },
  ',': { g: 'sand', h: 0.5 }, ';': { g: 'wetsand', h: 0.2 }, '=': { g: 'planks', h: 0.5 }, k: { g: 'rock', h: 1.0 },
};
const LH = { x: 13.5, z: 4.3, h: 9 };
function capeProps(v) {
  const P = [
    { type: 'lighthouse', x: LH.x, z: LH.z, h: LH.h, lit: v !== 'siege' },
    // 籬笆（台地邊緣）
    { type: 'fence', x: 3, z: 11.5, len: 8 }, { type: 'fence', x: 15, z: 11.5, len: 7 },
    // 燈
    { type: 'lamp', x: 10, z: 9 }, { type: 'lamp', x: 15, z: 9 }, { type: 'lamp', x: 11, z: 15 }, { type: 'lamp', x: 8, z: 19 }, { type: 'lamp', x: 14, z: 22 }, { type: 'lamp', x: 11, z: 26 },
    // 樹
    { type: 'tree', kind: 'pine', x: 3, z: 12, v: 2 }, { type: 'tree', kind: 'pine', x: 5, z: 13, v: 3 }, { type: 'tree', kind: 'pine', x: 2, z: 15, v: 4 }, { type: 'tree', kind: 'pine', x: 6, z: 16, v: 5, s: 0.9 },
    { type: 'tree', kind: 'pine', x: 21, z: 12, v: 6 }, { type: 'tree', kind: 'pine', x: 22, z: 15, v: 7, s: 1.1 }, { type: 'tree', kind: 'pine', x: 20, z: 16, v: 8, s: 0.85 },
    { type: 'tree', x: 3, z: 19, v: 2 }, { type: 'tree', x: 20, z: 19, v: 3, s: 1.05 }, { type: 'tree', kind: 'autumn', x: 22, z: 18, v: 4, s: 0.9 },
    { type: 'tree', kind: 'pine', x: 4, z: 5, v: 9, s: 0.9 }, { type: 'tree', kind: 'pine', x: 20, z: 5, v: 10 }, { type: 'tree', x: 19, z: 3, v: 5, s: 0.85 },
    { type: 'bush', x: 6, z: 18, v: 2, soft: true }, { type: 'bush', x: 16, z: 20, v: 3, soft: true }, { type: 'bush', x: 2, z: 20, v: 4, soft: true }, { type: 'bush', x: 17, z: 9, v: 5, soft: true }, { type: 'bush', x: 9, z: 4, v: 6, soft: true },
    { type: 'tufts', x: 3, z: 2, w: 20, d: 10, n: 60, seed: 4 }, { type: 'tufts', x: 1, z: 12, w: 23, d: 6, n: 50, seed: 7 }, { type: 'tufts', x: 1, z: 18, w: 24, d: 3, n: 45, seed: 9, color: '#6a9a44' },
    // 歷代燈守之墓
    ...[15, 16, 17, 18, 19].map((x, i) => ({ type: 'box', x, z: 13, w: 0.5, d: 0.24, h: 0.62 + (i % 2) * 0.12, tex: 'slab' })),
    { type: 'sign', x: 20, z: 14, text: '歷代燈守長眠之地。\n燈不熄，人不寂。' },
    // 小屋周邊
    { type: 'barrel', x: 10, z: 5 }, { type: 'barrel', x: 10, z: 4 }, { type: 'crate', x: 4, z: 7 }, { type: 'crate', x: 4, z: 6, s: 0.55 }, { type: 'bench', x: 17, z: 8 },
    // 海灘
    { type: 'rock', x: 3, z: 22, s: 1.2 }, { type: 'rock', x: 8, z: 25, s: 0.8 }, { type: 'rock', x: 17, z: 25, s: 0.9 }, { type: 'rock', x: 0, z: 24, s: 1.6 }, { type: 'rock', x: 24, z: 26, s: 1.8 },
    { type: 'rock', x: 24, z: 9, s: 1.5 }, { type: 'rock', x: 1, z: 9, s: 1.3 }, { type: 'rock', x: 22, z: 21, s: 0.7, soft: true },
    { type: 'net', x: 4, z: 23 }, { type: 'barrel', x: 10, z: 25 }, { type: 'crate', x: 14, z: 26 }, { type: 'crate', x: 15, z: 26, s: 0.55 },
    { type: 'boat', x: 14, z: 30, len: 3, mast: true, rot: Math.PI / 2 },
  ];
  if (v === 'day' || v === 'after') P.push({ type: 'campfire', x: 7, z: 22, id: 'cape_camp' });
  if (v === 'siege') {
    P.push({ type: 'ship', x: 3, z: 31, len: 7, rot: 0.3, sail: '#3a3034', mark: '#b02020' }, { type: 'ship', x: 23, z: 31, len: 7, rot: -0.4, sail: '#3a3034', mark: '#b02020' }, { type: 'ship', x: 25, z: 14, len: 7, rot: 1.4, sail: '#3a3034', mark: '#b02020' });
    P.push({ type: 'light', x: 3, y: 1.6, z: 31, color: '#ff4030', i: 18, range: 8 }, { type: 'light', x: 23, y: 1.6, z: 31, color: '#ff4030', i: 18, range: 8 }, { type: 'light', x: 25, y: 1.6, z: 14, color: '#ff4030', i: 18, range: 8 });
    P.push({ type: 'brazier', x: 12, z: 24, color: '#ff6a3a' }, { type: 'brazier', x: 9, z: 12, color: '#ff6a3a' });
  }
  return P;
}
function capeVariant(F) { return !F.prologue_night ? 'night' : F.chapter1_done ? 'after' : F.saw_fleet ? 'siege' : 'day'; }
function cape(F) {
  const v = capeVariant(F);
  const env = { night: ENV.night, day: ENV.dusk, siege: ENV.siege, after: ENV.after }[v];
  const def = {
    name: '孤燈岬', en: 'LONELAMP CAPE', rows: CAPE_ROWS, legend: CAPE_LEGEND, seed: 11, env, waterColors: WATER[v === 'day' ? 'dusk' : v === 'siege' ? 'siege' : 'night'],
    phase: v === 'day' ? 'L' : 'D', bgm: v === 'siege' ? 'battle' : v === 'night' ? null : 'cape', amb: 'waves', variant: v,
    motes: v === 'day' ? ['#ffd8a0', '#ffe8c8'] : v === 'after' ? ['#fff0c0', '#ffd890'] : null,
    lighthouse: { x: LH.x, y: 3 + LH.h + 1.05, z: LH.z, len: 46, rad: 5.5, speed: 0.32, on: v !== 'siege', pillar: v === 'after' },
    buildings: [
      { x: 5, z: 4, w: 5, d: 3, h: 2.6, wall: 'plaster2', timber: true, roof: 'roofteal', door: { x: 2.5 }, windows: [{ x: 1, y: 1.2, flower: true }, { x: 4, y: 1.2 }], chimney: true, lit: 0.9, id: 'cottage', label: '小屋',
        onDoor: async (S, F) => {
          if (capeVariant(F) === 'siege') { await S.say(null, '（小屋的門被撞開了。屋裡沒有人。）'); return; }
          await S.say(null, '（師父的小屋。屋裡有燈油和海藻茶的味道。）');
          const i = await S.choice(['在床上休息一下', '離開']);
          if (i === 0) { await S.fade(true, 500); S.rest(); S.sfx('heal'); await S.wait(500); await S.fade(false, 500); await S.say(null, '睡了一下。大家的體力都恢復了。'); }
        } },
    ],
    props: capeProps(v),
    npcs: [], enemies: [], triggers: [], exits: [], spots: [],
  };
  if (v === 'night') {
    def.npcs.push({ id: 'owen', cast: 'owen', name: '歐文', x: 13.7, z: 7.1, dir: 'left', silent: true, fixedDir: true });
    def.enter = async (S, F) => { if (!F.prologue_night) await STORY.opening(S, F); };
  }
  if (v === 'day') {
    def.npcs.push({ id: 'owen', cast: 'owen', name: '歐文', x: 11, z: 22, dir: 'down', talk: (S, F) => STORY.owenTalk(S, F),
      shadow: '（再撐一下……至少，撐到這孩子回來。）' });
    def.enemies.push(
      { id: 'c1', art: 'crab', enc: 'cape_a', x: 4, z: 24, cond: has('lise_joined') },
      { id: 'c2', art: 'gull', enc: 'cape_a', x: 19, z: 18, fly: 1, cond: has('lise_joined') },
      { id: 'c3', art: 'wraith', enc: 'cape_b', x: 18, z: 4, fly: 0.5, cond: has('lise_joined') },
    );
    def.spots.push({ x: 12, z: 31, r: 1.7, label: '乘船', run: (S, F) => STORY.toHarbor(S, F) });
    def.enter = async (S, F) => { if (!F.lise_joined) await STORY.lisearrive(S, F); };
  }
  if (v === 'siege') {
    def.enemies.push(
      { id: 's1', art: 'soldier', enc: 'siege_a', x: 12, z: 21, scale: 1, sight: 4.2, speed: 2.3 },
      { id: 's2', art: 'archer', enc: 'siege_a', x: 7, z: 15, scale: 1, sight: 4.2, speed: 2.3 },
      { id: 's3', art: 'soldier', enc: 'siege_a', x: 16, z: 13, scale: 1, sight: 4.2, speed: 2.3 },
    );
    def.triggers.push({ x: 8, z: 8.6, w: 12, d: 3, flag: 'finale_t', cond: not('chapter1_done'), run: (S, F) => STORY.finale(S, F) });
    def.enter = async (S, F) => { if (!F.siege_arrived) await STORY.siegeArrive(S, F); };
  }
  if (v === 'after') {
    def.spots.push({ x: 12, z: 31, r: 1.7, label: '乘船', run: (S, F) => STORY.toHarbor(S, F) });
  }
  if (v !== 'night') {
    def.spots.push({ kind: 'fish', x: 22, z: 22, r: 1.5, pool: 'cape' });
    def.spots.push({ x: 13, z: 6, r: 1.25, label: '燈室', run: async (S, F) => {
      const v2 = capeVariant(F);
      if (v2 === 'after') await S.say(null, '（燈室的門再也打不開了。門縫裡透出來的光，暖暖的。）');
      else if (v2 === 'siege') await S.say(null, '（門從裡面閂上了。）');
      else await S.say(null, '（通往燈室的門。燈油的味道從門縫裡飄出來。）');
    } });
  }
  return def;
}

// =====================================================================
// 霧港
// =====================================================================
function harborRows() {
  const g = G(34, 30, 'R');
  R(g, 2, 2, 30, 9, 'u');          // 上層街道 z2-10
  R(g, 15, 10, 3, 1, 's'); R(g, 27, 10, 2, 1, 's');
  R(g, 1, 11, 31, 13, 'c');        // 港町 z11-23
  R(g, 32, 12, 2, 6, 'd');         // 東門
  R(g, 0, 24, 34, 6, '~');
  R(g, 1, 24, 31, 1, '=');         // 碼頭
  R(g, 5, 25, 3, 5, '='); R(g, 18, 25, 3, 4, '='); R(g, 27, 25, 3, 3, '=');
  R(g, 2, 2, 2, 2, 'g'); R(g, 29, 2, 3, 1, 'g');
  return rowsOf(g);
}
const HARBOR_ROWS = harborRows();
const HARBOR_LEGEND = {
  R: { g: 'hill', h: 4.5, block: true }, u: { g: 'cobble', h: 2 }, g: { g: 'grass', h: 2 }, s: { g: 'slab', h: 1.5 },
  c: { g: 'quay', h: 1 }, d: { g: 'dirt', h: 1 }, '=': { g: 'planks', h: 0.5 }, '~': { water: true, bed: -1.8 },
};
function harborNpcs(v) {
  const N = [];
  N.push({ id: 'gran', cast: 'gran', name: '葛蘭太太', x: 16, z: 8.75, dir: 'down', talk: (S, F) => STORY.oilShop(S, F),
    shadow: (F) => (F.gran_done ? '（阿森……你回家了。）' : '（阿森，你到底在哪裡……）') });
  N.push({ id: 'merchant', cast: 'merchant', name: '雜貨商馬可', x: 12, z: 14, dir: 'down',
    talk: async (S, F) => { await S.say('雜貨商馬可', F.ruins_done ? '燈塔那邊出事了？……還是要補點貨吧。' : '歡迎光臨！大退潮前，潮藥賣得最好。'); await S.shop('general'); },
    shadow: '（晝國的兵把港口的燈油全收走了，說是要給艦隊用……可別說是我說的。）' });
  N.push({ id: 'smith', cast: 'smith', name: '老韓', x: 26, z: 14.6, dir: 'down', talk: smithTalk,
    shadow: '（那孩子的燈鉤……握柄都磨亮了。是個好學徒。）' });
  N.push({ id: 'inn', cast: 'inn', name: '旅店老闆娘蘿拉', x: 28, z: 8.75, dir: 'down', talk: innTalk,
    shadow: (F) => (F.ruins_done ? '（兵全上船了。酒錢沒付，可我寧願他們別走。）' : '（今晚的客人全是兵。他們喝酒的樣子，像在送行。）') });
  if (v === 'dusk') {
    N.push({ id: 'fisher', cast: 'fisher', name: '老漁夫波克', x: 19, z: 23.7, dir: 'down',
      lines: [['燈塔的小哥？稀客。', '昨晚那三秒，整個港口都看見了。我討海四十年，第一次看到長明燈眨眼。'],
        ['大退潮的晚上，退潮灘會露出整片海床。', '珠子、沉船……還有些不該醒的東西。'],
        ['想釣魚的話，碼頭邊隨你釣。', '暗的時候燈籠魚多，亮的時候曦鯛會浮上來。']],
      shadow: '（東邊碼頭盡頭的礁石縫裡，我藏了兩罐上好的燈油……本來想送上燈塔，可我一直沒臉上去。）' });
    N.push({ id: 'sailor', cast: 'sailor', name: '赫利昂水兵', x: 21, z: 18, dir: 'left', wander: 1,
      lines: [['港口最近到處都是我們的人。上面說是「例行巡航」。', '……我只是個水兵，問那麼多幹嘛。'], ['范德長官？她是潮汛署的，跟我們海軍不是同一掛。', '聽說她在潮汛署考第一名。劍倒是很少拔。']],
      shadow: '（上將的艦隊今晚就要出港。說好的七天……騙人的。）' });
    N.push({ id: 'girl', cast: 'girl', name: '小米雅', x: 14, z: 18, dir: 'down', wander: 1.2,
      lines: [['大哥哥是從燈塔來的嗎？', '燈塔上面，看得到夜邦嗎？'], ['媽媽說，晚上不可以一直盯著海看。', '因為海會看回來。']],
      shadow: '（燈塔的大哥哥好高……下次可以帶我上去看光嗎？）' });
    N.push({ id: 'granny', cast: 'granny', name: '老奶奶', x: 10, z: 21, dir: 'down', talk: grannyTalk,
      shadow: '（老頭子的鯨骨還收在床底下……要是能變成燈塔用的東西，他會高興的吧。）' });
    N.push({ id: 'nightkid', cast: 'nightkid', name: '夜邦的孩子', x: 7, z: 12.2, dir: 'right',
      lines: [['……你身上那盞燈，是長明燈分出來的火嗎？'], ['我跟爸爸從夜邦來賣魚。', '這裡好亮，亮到眼睛會痛。可是我喜歡。']],
      shadow: '（好想帶一點光回家……我家那條街，已經三個月沒有燈油了。）' });
    N.push({ id: 'docker', cast: 'villager', name: '碼頭工人', x: 4, z: 23.2, dir: 'down',
      lines: [['大退潮要來了。今晚，潮水會退到看不見的地方。', '上一次這麼大的退潮，是十年前。那年的夜潮淹死了好多人。']],
      shadow: '（十年前那晚，上將的女兒就是在這個碼頭被浪捲走的……）' });
    N.push({ id: 'traveler', cast: 'villager2', name: '旅人', x: 23, z: 20, dir: 'down', wander: 1,
      lines: [['我從赫利昂來。那邊的太陽一動也不動，在天頂掛了七百年。', '到了霧港，我才第一次知道「傍晚」是什麼顏色。'],
        ['晝國說夜邦人偷了他們的光，夜邦說晝國人搶了他們的天。', '其實大家只是都怕對方那一邊的海。']],
      shadow: '（回不去了。赫利昂的東堤一淹，我家就沒了。）' });
    N.push({ id: 'gate', cast: 'soldier', name: '赫利昂水兵', x: 30, z: 14.1, dir: 'left', fixedDir: true, talk: (S, F) => STORY.gate(S, F),
      shadow: '（范德長官……她知道上將打算做什麼嗎？）' });
  } else {
    N.push({ id: 'docker', cast: 'villager', name: '碼頭工人', x: 6, z: 23.2, dir: 'down',
      lines: [['燈塔……燈塔的光，不轉了。', '海上那一圈紅色的燈是什麼？船嗎？那麼多船……']], shadow: '（又要淹水了嗎……十年前那樣。）' });
    N.push({ id: 'fisher', cast: 'fisher', name: '老漁夫波克', x: 19, z: 23.7, dir: 'down',
      lines: [['小哥，快回去吧。你師父一個人在上面。']], shadow: '（長明燈要是熄了，這片海就是夜潮的了。）' });
    N.push({ id: 'traveler', cast: 'villager2', name: '旅人', x: 16, z: 19, dir: 'down',
      lines: [['剛剛海軍的人全部上船了。酒錢都沒付。', '……他們往孤燈岬去了。']], shadow: '（那個方向，是燈塔。）' });
  }
  return N;
}
async function smithTalk(S, F) {
  const name = '老韓';
  if (S.has('bone') && !F.hook2_made) {
    await S.say(name, '這是……老傑克的鯨骨！他老婆居然肯拿出來。');
    await S.say(name, '好。給我一點時間——');
    await S.fade(true, 400); S.sfx('blunt'); await S.wait(400); S.sfx('blunt'); await S.wait(500); await S.fade(false, 400);
    S.take('bone', 1); F.hook2_made = 1;
    await S.say(name, '鯨骨燈鉤。輕，又韌。拿去吧，錢就不用了——替我們守好那盞燈。');
    S.give('hook2', 1);
    return;
  }
  if (!F.bone_quest) {
    F.bone_quest = 1;
    await S.say(name, '燈塔的小哥？你那把燈鉤，握柄都磨亮了。');
    await S.say(name, '要是有鯨骨，我能給你打一把好的。可惜這年頭，鯨骨比月白珠還難找。');
  } else await S.say(name, '要打什麼？武器淬鍊也找我。');
  await S.shop('smith');
}
async function innTalk(S, F) {
  const name = '旅店老闆娘蘿拉';
  await S.say(name, '潮聲旅店，一晚 20 銀貝。床很軟，窗外就是海。');
  const i = await S.choice(['住一晚（20 銀貝）', '不用了']);
  if (i !== 0) return;
  if (S.gold() < 20) { await S.say(name, '……銀貝好像不太夠喔。'); return; }
  S.addGold(-20);
  await S.fade(true, 600); S.rest(); S.bgm(null); await S.wait(900); S.sfx('heal'); await S.fade(false, 600);
  S.bgm('harbor');
  await S.say(null, '睡得很沉。大家的體力都恢復了。');
  S.save();
  S.toast('已自動存檔');
}
async function grannyTalk(S, F) {
  const name = '老奶奶';
  if (F.shine_granny && !F.bone_given) {
    F.bone_given = 1;
    await S.say(name, '……你這孩子，剛剛用燈照了我一下吧？');
    await S.say(name, '老頭子的鯨骨，一直收在床底下。他活著的時候常說：要是能打成燈塔用的東西就好了。');
    await S.say(name, '拿去吧。給老韓看，他知道怎麼做。');
    S.give('bone', 1);
    return;
  }
  if (F.bone_given) { await S.say(name, '老頭子要是知道，一定很高興。'); return; }
  await S.say(name, '唉，年輕人。我家老頭子以前是捕鯨的。');
  await S.say(name, '他常說，鯨魚死的時候，會往有光的地方游。');
}
function harbor(F) {
  const v = F.ruins_done ? 'night' : 'dusk';
  const env = v === 'night' ? ENV.night : ENV.dusk;
  const def = {
    name: '霧港', en: 'MISTHARBOR', rows: HARBOR_ROWS, legend: HARBOR_LEGEND, seed: 23, env, waterColors: WATER[v === 'night' ? 'night' : 'dusk'], lampDay: 0.9,
    phase: v === 'night' ? 'D' : 'L', bgm: 'harbor', amb: 'waves', variant: v, motes: v === 'dusk' ? ['#ffd8a0', '#f0c8a0'] : null,
    buildings: [
      { x: 2, z: 4, w: 4, d: 4, h: 2.8, wall: 'plaster', timber: true, roof: 'roofred', door: { x: 1.5 }, windows: [{ x: 3, y: 1.3, flower: true }], chimney: true },
      { x: 7, z: 3, w: 5, d: 5, h: 3.6, wall: 'brick', roof: 'roofslate', door: { x: 2.5 }, windows: [{ x: 1, y: 1.4 }, { x: 4, y: 1.4 }, { x: 1, y: 2.7 }, { x: 4, y: 2.7 }] },
      { x: 13, z: 4, w: 6, d: 4, h: 3.0, wall: 'plaster3', timber: true, roof: 'roofbrown', door: { x: 3.5, lit: true }, windows: [{ x: 1.3, y: 1.3 }, { x: 5.2, y: 1.3, flower: true }], sign: { x: 2, y: 0.25, icon: 'bottle' }, chimney: true },
      { x: 20, z: 4, w: 4, d: 4, h: 2.6, wall: 'plaster2', roof: 'roofteal', door: { x: 2 }, windows: [{ x: 0.8, y: 1.2 }, { x: 3.2, y: 1.2 }] },
      { x: 25, z: 3, w: 6, d: 5, h: 3.6, wall: 'woodwall', roof: 'roofred', door: { x: 3.5, lit: true }, windows: [{ x: 1, y: 1.3 }, { x: 5, y: 1.3, flower: true }, { x: 1, y: 2.7 }, { x: 5, y: 2.7 }], sign: { x: 2, y: 0.3, icon: 'mug' }, chimney: true },
      { x: 1, z: 12, w: 5, d: 4, h: 3.2, wall: 'woodwall', roof: 'roofbrown', door: { x: 2.5, w: 22, h: 30 }, windows: [], sideWindows: [] },
      { x: 24, z: 11, w: 5, d: 3, h: 2.8, wall: 'brick', roof: 'roofslate', door: { x: 1.5, lit: true }, windows: [{ x: 3.8, y: 1.2 }], chimney: true, sign: { x: 3, y: 0.25, icon: 'sword' } },
    ],
    props: [
      // 廣場
      { type: 'well', x: 16, z: 17 }, { type: 'stall', x: 10, z: 13, color: '#b8443a' }, { type: 'stall', x: 20, z: 21, color: '#3a6aa8' },
      { type: 'bench', x: 8, z: 21 }, { type: 'bench', x: 20, z: 13 },
      { type: 'sign', x: 13, z: 11, text: '【公告】\n大退潮之夜，退潮灘為赫利昂王國禁區。\n違者以叛國論處。——潮汛署' },
      { type: 'lamp', x: 12, z: 12 }, { type: 'lamp', x: 21, z: 11 }, { type: 'lamp', x: 7, z: 17 }, { type: 'lamp', x: 23, z: 17 }, { type: 'lamp', x: 14, z: 23 }, { type: 'lamp', x: 26, z: 23 }, { type: 'lamp', x: 5, z: 23 },
      { type: 'lamp', x: 6, z: 9 }, { type: 'lamp', x: 12, z: 9 }, { type: 'lamp', x: 19, z: 9 }, { type: 'lamp', x: 24, z: 9 }, { type: 'lamp', x: 31, z: 9 },
      { type: 'tree', x: 30, z: 20, v: 3 }, { type: 'tree', kind: 'autumn', x: 2, z: 9, v: 6, s: 0.85 }, { type: 'bush', x: 29, z: 22, v: 2, soft: true }, { type: 'bush', x: 3, z: 3, v: 4, soft: true },
      { type: 'tree', kind: 'pine', x: 4, z: 1, v: 3, s: 1.1 }, { type: 'tree', kind: 'pine', x: 11, z: 0, v: 4 }, { type: 'tree', kind: 'pine', x: 19, z: 1, v: 5, s: 1.15 }, { type: 'tree', kind: 'pine', x: 27, z: 0, v: 6 }, { type: 'tree', x: 32, z: 1, v: 7 },
      { type: 'tufts', x: 2, z: 2, w: 2, d: 2, n: 6, seed: 3 }, { type: 'tufts', x: 29, z: 2, w: 3, d: 1, n: 5, seed: 5 },
      // 鍛造
      { type: 'box', x: 26, z: 15, w: 0.8, d: 0.5, h: 0.6, tex: 'darkrock' }, { type: 'brazier', x: 29, z: 14 },
      // 倉庫與碼頭
      { type: 'crate', x: 6, z: 13 }, { type: 'crate', x: 6, z: 14, s: 0.55 }, { type: 'barrel', x: 6, z: 20 }, { type: 'barrel', x: 7, z: 19 }, { type: 'crate', x: 1, z: 17 }, { type: 'barrel', x: 1, z: 18 },
      { type: 'crate', x: 1, z: 20 }, { type: 'crate', x: 2, z: 20 }, { type: 'crate', x: 1, z: 20, stack: true, s: 0.6 }, { type: 'barrel', x: 3, z: 21 }, { type: 'barrel', x: 4, z: 21 }, { type: 'crate', x: 5, z: 21, s: 0.6 },
      { type: 'net', x: 2, z: 22 }, { type: 'light', x: 3.5, y: 2.2, z: 17.5, color: '#ffb860', i: 7, range: 5 },
      { type: 'crate', x: 3, z: 23 }, { type: 'barrel', x: 9, z: 23 }, { type: 'crate', x: 24, z: 23 }, { type: 'crate', x: 25, z: 23, s: 0.6 }, { type: 'barrel', x: 30, z: 23 },
      { type: 'net', x: 15, z: 22 },
      { type: 'boat', x: 3, z: 27, len: 3, mast: true, rot: Math.PI / 2 }, { type: 'boat', x: 10, z: 26, len: 3, rot: 0.1 }, { type: 'boat', x: 14, z: 27, len: 3, mast: true, rot: -0.15 }, { type: 'boat', x: 22, z: 26, len: 3, rot: 0.2 },
      { type: 'ship', x: 30.5, z: 28.5, len: 6, rot: Math.PI / 2, sail: '#e8e0cc', mark: '#c9a040', lights: v === 'dusk' },
      // 東門
      { type: 'box', x: 31, z: 12, w: 0.8, d: 0.8, h: 3.4, tex: 'ruinwall' }, { type: 'box', x: 31, z: 17, w: 0.8, d: 0.8, h: 3.4, tex: 'ruinwall' },
      { type: 'box', x: 31, z: 12, w: 0.8, d: 5.8, h: 0.6, y: 3.4, tex: 'ruinwall2', solid: false }, { type: 'brazier', x: 30, z: 12 }, { type: 'brazier', x: 30, z: 17 },
    ],
    npcs: harborNpcs(v),
    triggers: [
      { x: 8, z: 10.6, w: 21, d: 13, cond: (F) => F.oil_heard && !F.thief, flag: 'thief', run: (S, F) => STORY.thief(S, F) },
      { x: 1.2, z: 15.8, w: 7, d: 3.4, cond: (F) => F.thief && !F.noct_joined, run: (S, F) => STORY.noctDeal(S, F) },
    ],
    exits: [
      { x: 32.7, z: 12, w: 1.3, d: 6, to: 'flats', at: [1.5, 12.5], dir: 'right', cond: (F) => F.gate_open && !F.ruins_done,
        block: async (S, F) => { if (F.ruins_done) await S.say(null, '（潮水回來了。退潮灘已經沉回海底。）'); else await STORY.gate(S, F); } },
    ],
    spots: [
      { x: 6, z: 28.5, r: 1.7, label: '小船', run: (S, F) => STORY.toCape(S, F) },
      { kind: 'fish', x: 19, z: 27.5, r: 1.4, pool: 'cape' },
      { x: 31, z: 23, r: 1.2, label: '調查', cond: (F) => F.shine_fisher && !F.fisher_gift,
        run: async (S, F) => { F.fisher_gift = 1; await S.say(null, '礁石縫裡卡著一個油布包。裡面是兩罐封好的燈油，還有一張紙條——「給燈塔」。'); S.give('oil', 2); } },
    ],
    enter: async (S, F) => {
      if (!F.harbor_arrived) await STORY.harborArrive(S, F);
      else if (F.ruins_done && !F.saw_fleet) await STORY.harborNight(S, F);
    },
  };
  return def;
}

// =====================================================================
// 退潮灘
// =====================================================================
function flatsRows() {
  const g = G(40, 24, '~');
  E(g, 19.5, 12, 21.5, 10.2, ';');
  R(g, 0, 9, 6, 7, ';');
  E(g, 35, 3, 4, 4.5, ';');
  // 沙洲小徑
  P(g, [[1, 12.5], [6, 12.5], [10, 11.2], [14, 9.6], [19, 9], [23, 10.4], [27, 8.6], [31, 6.6], [34, 4.2], [35.5, 2]], 1.25, ',');
  P(g, [[10, 11.2], [12, 15], [17, 13.8], [22, 15.5], [27, 15.2], [31, 12]], 0.85, ',');
  // 海藻床
  E(g, 8.5, 17.5, 3.2, 2, 'e', [';']); E(g, 27, 18.5, 3.4, 2.1, 'e', [';']); E(g, 16, 4, 2.6, 1.5, 'e', [';']); E(g, 30, 3.8, 2.4, 1.3, 'e', [';']);
  // 潮池
  E(g, 6.5, 6.3, 2.1, 1.5, '~'); E(g, 15.5, 17.6, 2.4, 1.7, '~'); E(g, 23.5, 4.6, 2.1, 1.3, '~'); E(g, 31.2, 18.2, 1.9, 1.3, '~'); E(g, 20.3, 13.2, 1.3, 1.0, '~'); E(g, 36.5, 13, 2, 1.6, '~');
  // 岩棚
  E(g, 11.5, 3.6, 2.4, 1.8, 'k'); E(g, 11.4, 3.3, 1.3, 0.9, 'K');
  E(g, 28.4, 11.4, 2.6, 1.9, 'k'); E(g, 28.6, 11.4, 1.3, 0.95, 'K');
  E(g, 20.6, 20, 2.3, 1.5, 'k');
  E(g, 4, 19.5, 2, 1.4, 'k');
  // 通往遺跡的石坡
  R(g, 33, 0, 5, 4, 'S'); R(g, 34, 0, 3, 1, 'T');
  // 入口道路
  R(g, 0, 11, 3, 4, 'd');
  return rowsOf(g);
}
const FLATS_ROWS = flatsRows();
const FLATS_LEGEND = {
  '~': { water: true, bed: -0.9 }, ';': { g: 'wetsand', h: 0.2 }, ',': { g: 'sand', h: 0.5 }, e: { g: 'kelp', h: 0.25 },
  k: { g: 'rock', h: 0.7 }, K: { g: 'rock', h: 1.2 }, S: { g: 'slab', h: 1.0 }, T: { g: 'slab', h: 1.5 }, d: { g: 'dirt', h: 1.0 },
};
function flats(F) {
  return {
    name: '退潮灘', en: 'THE LOW-TIDE FLATS', rows: FLATS_ROWS, legend: FLATS_LEGEND, seed: 31, env: ENV.flats, waterColors: WATER.flats, sea: -0.3,
    phase: 'D', bgm: 'flats', amb: 'waves', motes: ['#7ae0d0', '#a0c0ff', '#c0fff0'], banner: true,
    buildings: [],
    props: [
      { type: 'wreck', x: 21.5, z: 12.0, rot: 0.45 },
      { type: 'coral', x: 8, z: 17, n: 6 }, { type: 'coral', x: 26, z: 18, n: 5 }, { type: 'coral', x: 16, z: 3, n: 5 }, { type: 'coral', x: 31, z: 17, n: 4 }, { type: 'coral', x: 7, z: 8, n: 4 }, { type: 'coral', x: 24, z: 6, n: 4 },
      { type: 'coral', x: 13, z: 19, n: 3 }, { type: 'coral', x: 34, z: 9, n: 4 }, { type: 'coral', x: 2, z: 16, n: 3 },
      { type: 'rock', x: 4, z: 7, s: 1.3 }, { type: 'rock', x: 13, z: 20, s: 1.0 }, { type: 'rock', x: 36, z: 8, s: 1.4 }, { type: 'rock', x: 33, z: 13, s: 1.6 }, { type: 'rock', x: 19, z: 2, s: 1.2 },
      { type: 'rock', x: 25, z: 21, s: 1.1 }, { type: 'rock', x: 9, z: 1, s: 1.6 }, { type: 'rock', x: 1, z: 6, s: 1.8 }, { type: 'rock', x: 38, z: 17, s: 1.7 }, { type: 'rock', x: 17, z: 22, s: 1.5 },
      { type: 'light', x: 6.5, y: 0.4, z: 6.3, color: '#4ad0c0', i: 7, range: 5 }, { type: 'light', x: 15.5, y: 0.4, z: 17.6, color: '#4ad0c0', i: 8, range: 5.5 },
      { type: 'light', x: 23.5, y: 0.4, z: 4.6, color: '#7a9aff', i: 7, range: 5 }, { type: 'light', x: 31.2, y: 0.4, z: 18.2, color: '#5ad8b0', i: 6, range: 4.5 },
      { type: 'brazier', x: 33, z: 3, color: '#7ac8ff' }, { type: 'brazier', x: 37, z: 3, color: '#7ac8ff' },
      { type: 'lamp', x: 2, z: 10 }, { type: 'sign', x: 3, z: 15, text: '退潮灘——\n只有大退潮的夜裡才走得過去。\n潮水回來之前，務必離開。' },
      { type: 'chest', id: 'fl_c1', x: 11, z: 3, item: 'potion', n: 2 }, { type: 'chest', id: 'fl_c2', x: 28, z: 11, item: 'e_sight' },
      { type: 'chest', id: 'fl_c3', x: 20, z: 20, item: 'iron', n: 2 }, { type: 'chest', id: 'fl_c4', x: 4, z: 19, gold: 120 },
      { type: 'campfire', x: 17, z: 7, id: 'flats_camp' },
      { type: 'pillar', x: 32, z: 1, h: 2.4, tex: 'ruinwall', broken: true }, { type: 'pillar', x: 38, z: 1, h: 3, tex: 'ruinwall' },
      { type: 'arch', x: 33.6, z: 0, w: 3.8, h: 3.4 },
    ],
    npcs: [],
    enemies: [
      { id: 'f1', art: 'crab', enc: 'flats_a', x: 8, z: 12 },
      { id: 'f2', art: 'jelly', enc: 'flats_b', x: 12, z: 15, fly: 1 },
      { id: 'f3', art: 'snail', enc: 'flats_c', x: 18, z: 10, speed: 1.6 },
      { id: 'f4', art: 'wraith', enc: 'flats_d', x: 24, z: 8, fly: 0.5 },
      { id: 'f5', art: 'crab2', enc: 'flats_e', x: 25, z: 15 },
      { id: 'f6', art: 'crab', enc: 'flats_a', x: 31, z: 8 },
      { id: 'f7', art: 'jelly', enc: 'flats_b', x: 32, z: 14, fly: 1 },
      { id: 'f8', art: 'wraith', enc: 'flats_d', x: 34, z: 5, fly: 0.5 },
    ],
    triggers: [
      { x: 0, z: 9, w: 5, d: 7, flag: 'flats_t', run: (S, Fl) => STORY.flatsArrive(S, Fl) },
      { x: 32, z: 1.5, w: 6, d: 3.5, flag: 'ruins_gate_t', run: (S, Fl) => STORY.ruinsGate(S, Fl) },
    ],
    exits: [
      { x: 0, z: 10, w: 0.6, d: 6, to: 'harbor', at: [31.0, 14.5], dir: 'left' },
      { x: 33.6, z: 0, w: 3.8, d: 0.7, to: 'ruins', at: [14.5, 34.2], dir: 'up' },
    ],
    spots: [{ kind: 'fish', x: 15, z: 15, r: 1.5, pool: 'flats' }],
  };
}

// =====================================================================
// 沉鐘遺跡（可轉燈）
// =====================================================================
const RUINS_ROWS = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWhhhhhhhhhhhhhhhhhhhhhhhhWWW',
  'WWWWWWWWWWWWWDDDDWWWWWWWWWWWWW',
  'WWWWWWWWWffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWfffffDDffffffffffff~~~~~~~~W',
  'WWfffffDDffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWfffff~~ffffffffffff~~~~~~~~W',
  'WWWWWWWWWffffffffffffWWWWWWWWW',
  'W~~~~~~~~~~~~LLLL~~~~~~~~~~~~W',
  'W~~~~~~~~~~~~LLLL~~~~~~~~~~~~W',
  'W~~~~~~~~~~~~LLLL~~~~~~~~~~~~W',
  'W~~~~~~~~~~~~LLLL~~~~~~~~~~~~W',
  'WffffffffffffffffffffffffffffW',
  'WffffffffffffffffffffffffffffW',
  'WWffffffwffffffffffffwffffffWW',
  'WWffffffwffffffffffffwffffffWW',
  'WWffffffffffffffffffffffffffWW',
  'WWffffffffffffffffffffffffffWW',
  'WWffffffwffffffffffffwffffffWW',
  'WWffffffwffffffffffffwffffffWW',
  'wwwwwwwwwffffffffffffwwwwwwwww',
  'wwwwwwwwwffffffffffffwwwwwwwww',
  'wwwwwwwwwwwwwffffwwwwwwwwwwwww',
];
const RUINS_LEGEND = {
  W: { g: 'wall', h: 3.6, block: true }, w: { g: 'wall', h: 1.9, block: true },
  f: { g: 'slab', h: 1 }, h: { g: 'slab', h: 1.5 }, '~': { water: true, bed: -1.3 },
  L: { g: 'slab', h: 1, phase: 'L' }, D: { g: 'slabdark', h: 1, phase: 'D' },
};
function ruins(F) {
  return {
    name: '沉鐘遺跡', en: 'THE DROWNED BELL', rows: RUINS_ROWS, legend: RUINS_LEGEND, seed: 47, env: ENV.ruins, waterColors: WATER.ruins, sea: -0.2,
    phase: 'D', phaseToggle: true, bgm: 'ruins', amb: 'cave', motes: ['#7ae0c0', '#c0f0e0'],
    buildings: [],
    props: [
      // 鐘之大廳
      { type: 'bell', x: 14.5, z: 4.3, s: 1.0 },
      { type: 'mural', x: 22.5, z: 1.03, y: 2.0, w: 6 },
      { type: 'statue', x: 4, z: 4, lamp: true, lit: true }, { type: 'statue', x: 25, z: 4, lamp: true, lit: true },
      { type: 'pillar', x: 5, z: 7, h: 3.4 }, { type: 'pillar', x: 24, z: 7, h: 3.4 }, { type: 'pillar', x: 8, z: 2, h: 3.2, broken: true }, { type: 'pillar', x: 20, z: 2, h: 2.4, broken: true },
      { type: 'brazier', x: 10, z: 6, color: '#7aa8ff' }, { type: 'brazier', x: 18, z: 6, color: '#7aa8ff' },
      { type: 'coral', x: 24, z: 2, n: 6 }, { type: 'coral', x: 26, z: 3, n: 5 }, { type: 'coral', x: 21, z: 2, n: 4 },
      { type: 'light', x: 24.5, y: 2.3, z: 2.6, color: '#e8f0ff', i: 9, range: 5, priority: 2 },
      // 中段
      ...[12, 15, 18].flatMap((z) => [{ type: 'pillar', x: 9, z, h: 2.9, broken: z === 15 }, { type: 'pillar', x: 20, z, h: 2.9, broken: z === 18 }]),
      { type: 'light', x: 24.5, y: 0.4, z: 15, color: '#3a9ab8', i: 10, range: 7 },
      { type: 'brazier', x: 3, z: 12, color: '#9a7aff' }, { type: 'chest', id: 'ru_c1', x: 3, z: 14, item: 'e_break' },
      { type: 'rock', x: 5, z: 18, s: 0.9, tex: 'ruinwall2' },
      // 運河
      { type: 'brazier', x: 11, z: 25 }, { type: 'brazier', x: 18, z: 25 },
      { type: 'rock', x: 4, z: 26, s: 1.0, tex: 'ruinwall2' }, { type: 'rock', x: 25, z: 25, s: 0.8, tex: 'ruinwall2' },
      // 入口大廳
      { type: 'pillar', x: 10, z: 28, h: 2.8 }, { type: 'pillar', x: 19, z: 28, h: 2.8, broken: true }, { type: 'pillar', x: 10, z: 32, h: 2.8, broken: true }, { type: 'pillar', x: 19, z: 32, h: 2.8 },
      { type: 'campfire', x: 4, z: 29, id: 'ruins_camp' },
      { type: 'chest', id: 'ru_c2', x: 26, z: 28, item: 'bigpotion', n: 2 }, { type: 'chest', id: 'ru_c3', x: 23, z: 31, item: 'shard', n: 2 },
      { type: 'brazier', x: 13, z: 34 }, { type: 'brazier', x: 16, z: 34 },
      { type: 'coral', x: 7, z: 31, n: 3 }, { type: 'coral', x: 22, z: 27, n: 3 },
    ],
    npcs: [],
    enemies: [
      { id: 'r1', art: 'shade', enc: 'ruins_b', x: 15, z: 29, fly: 0.3 },
      { id: 'r2', art: 'rustguard', enc: 'ruins_a', x: 24, z: 30, speed: 1.8 },
      { id: 'r3', art: 'rustguard', enc: 'ruins_c', x: 4, z: 16, speed: 1.8 },
      { id: 'r4', art: 'snail', enc: 'ruins_d', x: 12, z: 18, speed: 1.4 },
      { id: 'r5', art: 'shade', enc: 'ruins_b', x: 7, z: 26, fly: 0.3 },
      { id: 'r6', art: 'rustguard', enc: 'ruins_a', x: 22, z: 8, speed: 1.8, cond: has('warden_done') },
    ],
    triggers: [
      { x: 10, z: 24.9, w: 10, d: 2.2, flag: 'bridge_t', run: (S, Fl) => STORY.bridgeHint(S, Fl) },
      { x: 9, z: 12.6, w: 12, d: 2.4, flag: 'eel_t', run: (S, Fl) => STORY.eel(S, Fl) },
      { x: 9, z: 7.6, w: 12, d: 2.4, flag: 'warden_t', cond: has('eel_done'), run: (S, Fl) => STORY.warden(S, Fl) },
    ],
    exits: [{ x: 13, z: 35.3, w: 4, d: 0.7, to: 'flats', at: [35.5, 1.8], dir: 'down' }],
    spots: [{ x: 22, z: 2, r: 1.8, label: '壁畫', run: (S, Fl) => STORY.mural(S, Fl) }],
    enter: async (S, Fl) => { if (!Fl.ruins_entered) await STORY.ruinsArrive(S, Fl); },
  };
}

export const MAPS = { cape, harbor, flats, ruins };

// =====================================================================
// 戰鬥舞台
// =====================================================================
const BENV = {
  dayL: { hemi: ['#ffd8a8', '#4a3a3a', 1.15], dir: { color: '#ffd090', i: 1.7, pos: [-8, 10, 8] }, ambient: '#8a7a7a', bg: '#3a2a3a', fog: ['#3a2a3a'], post: { bloom: 0.55, sat: 1.08, gain: [1.06, 1.0, 0.94], lift: [0.02, 0.015, 0.02] } },
  nightD: { hemi: ['#3a5a8a', '#141a2a', 0.85], dir: { color: '#9ab4ff', i: 0.95, pos: [-6, 14, 6] }, ambient: '#4a5680', bg: '#070b16', fog: ['#070b16'], post: { bloom: 0.7, sat: 1.0, gain: [0.95, 1.0, 1.1], lift: [0.01, 0.012, 0.035] } },
  siegeL: { hemi: ['#ffc8a0', '#4a2a2a', 1.1], dir: { color: '#ffb890', i: 1.6, pos: [-8, 10, 8] }, ambient: '#8a6a6a', bg: '#3a1e24', fog: ['#3a1e24'], post: { bloom: 0.6, sat: 1.05, gain: [1.08, 0.98, 0.92], lift: [0.025, 0.012, 0.015] } },
  siegeD: { hemi: ['#5a3a4a', '#140a12', 0.85], dir: { color: '#c0a0d0', i: 0.8, pos: [-6, 14, 6] }, ambient: '#4a3a54', bg: '#0a0710', fog: ['#0a0710'], post: { bloom: 0.75, sat: 1.0, gain: [1.08, 0.95, 0.98], lift: [0.02, 0.008, 0.02] } },
  flatsL: { hemi: ['#d8f0ff', '#2a3a4a', 1.1], dir: { color: '#e8f4ff', i: 1.5, pos: [-8, 12, 8] }, ambient: '#7a8aa0', bg: '#1a2a3a', fog: ['#1a2a3a'], post: { bloom: 0.6, sat: 1.05, gain: [1.0, 1.02, 1.04], lift: [0.015, 0.02, 0.03] } },
  flatsD: { hemi: ['#2a4a7a', '#0c121e', 0.85], dir: { color: '#8aa8ff', i: 0.85, pos: [-6, 14, 8] }, ambient: '#3a4a78', bg: '#040c16', fog: ['#040c16'], post: { bloom: 0.75, sat: 1.06, gain: [0.94, 1.0, 1.08], lift: [0.008, 0.016, 0.04] } },
  ruinsL: { hemi: ['#ffe0a6', '#3a3020', 1.1], dir: { color: '#ffd890', i: 1.45, pos: [-6, 12, 7] }, ambient: '#8a7a62', bg: '#2a2418', fog: ['#2a2418'], post: { bloom: 0.62, sat: 1.04, gain: [1.06, 1.0, 0.92], lift: [0.02, 0.015, 0.01] } },
  ruinsD: { hemi: ['#2a4a5a', '#0a0e12', 0.8], dir: { color: '#7ab0c0', i: 0.65, pos: [-4, 14, 6] }, ambient: '#38525c', bg: '#03070a', fog: ['#03070a'], post: { bloom: 0.8, sat: 0.98, gain: [0.95, 1.02, 1.05], lift: [0.008, 0.016, 0.02] } },
};
function stageCape(siege) {
  const g = G(24, 17, '~');
  R(g, 0, 6, 24, 11, 'g'); E(g, 4, 6, 4.2, 1.6, 'g'); E(g, 19, 5.6, 3.5, 1.4, 'g');
  R(g, 0, 15, 24, 2, 'g');
  P(g, [[11, 16], [11.5, 11], [13, 7]], 0.8, 'd');
  return {
    rows: rowsOf(g), legend: { '~': { water: true, bed: -1.6 }, g: { g: 'grass', h: 1 }, d: { g: 'dirt', h: 1 } }, seed: siege ? 71 : 61, sea: -0.6,
    waterColors: siege ? WATER.siege : WATER.night, center: [12, 1, 10.5],
    env: siege ? { L: BENV.siegeL, D: BENV.siegeD } : { L: BENV.dayL, D: BENV.nightD },
    props: [
      { type: 'tree', kind: 'pine', x: 1, z: 7, v: 2, s: 1.1 }, { type: 'tree', kind: 'pine', x: 3, z: 6, v: 4 }, { type: 'tree', kind: 'pine', x: 21, z: 7, v: 5 }, { type: 'tree', kind: 'pine', x: 23, z: 9, v: 6, s: 0.9 },
      { type: 'tree', x: 0, z: 11, v: 3 }, { type: 'bush', x: 22, z: 12, v: 2, soft: true }, { type: 'bush', x: 2, z: 14, v: 3, soft: true },
      { type: 'tufts', x: 0, z: 6, w: 24, d: 10, n: 70, seed: 6 },
      { type: 'fence', x: 6, z: 6.5, len: 5 }, { type: 'fence', x: 14, z: 6.5, len: 4 },
      { type: 'lamp', x: 6, z: 7 }, { type: 'lamp', x: 18, z: 7 },
      { type: 'rock', x: 20, z: 14, s: 1.1 }, { type: 'rock', x: 3, z: 3, s: 1.6 }, { type: 'rock', x: 15, z: 3, s: 1.3 },
      ...(siege ? [{ type: 'ship', x: 6, z: 1.5, len: 7, rot: 0.2, sail: '#3a3034', mark: '#b02020' }, { type: 'light', x: 6, y: 1.5, z: 1.5, color: '#ff4030', i: 16, range: 8 }, { type: 'brazier', x: 9, z: 8, color: '#ff6a3a' }] : [{ type: 'boat', x: 9, z: 3, len: 3, mast: true, rot: 0.3 }]),
    ],
  };
}
function stageFlats() {
  const g = G(24, 17, ';');
  E(g, 5, 3, 3.5, 1.8, '~'); E(g, 18, 2.6, 4.5, 2, '~'); E(g, 22, 14, 2.4, 1.6, '~');
  E(g, 3, 13, 3, 2, 'e', [';']); E(g, 12, 5, 3, 1.2, 'e', [';']);
  P(g, [[0, 12], [8, 10.5], [16, 10.5], [24, 9]], 1.6, ',');
  return {
    rows: rowsOf(g), legend: FLATS_LEGEND, seed: 81, sea: -0.3, waterColors: WATER.flats, center: [12, 0.5, 10.5],
    env: { L: BENV.flatsL, D: BENV.flatsD },
    props: [
      { type: 'wreck', x: 13, z: 2.6, rot: 0.15 }, { type: 'coral', x: 2, z: 12, n: 6 }, { type: 'coral', x: 21, z: 12, n: 5 }, { type: 'coral', x: 9, z: 4, n: 4 }, { type: 'coral', x: 4, z: 6, n: 4 },
      { type: 'rock', x: 1, z: 8, s: 1.6 }, { type: 'rock', x: 22, z: 6, s: 1.4 }, { type: 'rock', x: 16, z: 15, s: 1.0 },
      { type: 'light', x: 5, y: 0.5, z: 3, color: '#4ad0c0', i: 8, range: 6 }, { type: 'light', x: 18, y: 0.5, z: 2.6, color: '#7a9aff', i: 8, range: 6 },
    ],
  };
}
function stageRuins(water) {
  const g = G(24, 17, 'f');
  R(g, 0, 0, 24, 3, 'W');
  if (water) { R(g, 0, 3, 24, 5, '~'); R(g, 0, 15, 24, 2, 'f'); }
  return {
    rows: rowsOf(g), legend: RUINS_LEGEND, seed: water ? 93 : 91, sea: -0.2, waterColors: WATER.ruins, center: [12, 1, 11],
    env: { L: BENV.ruinsL, D: BENV.ruinsD },
    props: [
      { type: 'pillar', x: 3, z: water ? 8 : 4, h: 3.2 }, { type: 'pillar', x: 20, z: water ? 8 : 4, h: 3.2, broken: true }, { type: 'pillar', x: 0, z: 9, h: 3.4 }, { type: 'pillar', x: 23, z: 11, h: 2.6, broken: true },
      { type: 'brazier', x: 7, z: water ? 8 : 5, color: '#7aa8ff' }, { type: 'brazier', x: 17, z: water ? 8 : 5, color: '#7aa8ff' },
      ...(water ? [{ type: 'light', x: 12, y: 0.3, z: 5, color: '#3a9ab8', i: 12, range: 9 }, { type: 'coral', x: 2, z: 9, n: 4 }] : [{ type: 'mural', x: 12, z: 3.02, y: 1.9, w: 7 }, { type: 'statue', x: 1, z: 4, lamp: true, lit: true }, { type: 'statue', x: 22, z: 4, lamp: true, lit: true }]),
      { type: 'rock', x: 1, z: 14, s: 0.9, tex: 'ruinwall2' }, { type: 'rock', x: 22, z: 15, s: 1.0, tex: 'ruinwall2' },
    ],
  };
}
function stageBell() {
  const g = G(24, 17, 'h');
  R(g, 0, 0, 24, 2, 'W');
  return {
    rows: rowsOf(g), legend: RUINS_LEGEND, seed: 97, sea: -0.2, water: false, center: [12, 1.5, 11.2],
    env: { L: BENV.ruinsL, D: BENV.ruinsD },
    props: [
      { type: 'bell', x: 12, z: 4.2, s: 1.15 },
      { type: 'pillar', x: 2, z: 5, h: 3.6 }, { type: 'pillar', x: 21, z: 5, h: 3.6 }, { type: 'pillar', x: 0, z: 10, h: 3.4, broken: true }, { type: 'pillar', x: 23, z: 12, h: 3.4 },
      { type: 'brazier', x: 6, z: 7, color: '#7aa8ff' }, { type: 'brazier', x: 18, z: 7, color: '#7aa8ff' },
      { type: 'statue', x: 4, z: 2, lamp: true, lit: true }, { type: 'statue', x: 19, z: 2, lamp: true, lit: true },
      { type: 'coral', x: 1, z: 14, n: 4 }, { type: 'coral', x: 22, z: 8, n: 3 },
    ],
  };
}
export const STAGES = {
  cape: stageCape(false), cape_siege: stageCape(true), flats: stageFlats(), ruins: stageRuins(false), ruins_water: stageRuins(true), bell: stageBell(),
};
