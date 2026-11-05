// 像素人物產生器：正面／背面／側面（朝左），走路、待機與戰鬥姿勢
import { Pix, ramp, hex, shift, mix } from './pixel.js';

export const FW = 48, FH = 56;

// 部件編號＝繪製順序（數字大的在前面）
const PT = {
  CAPE_B: 1, HAIR_B: 2, ARM_B: 3, WPN_B: 4, LEG_B: 5, BOOT_B: 6, LEG_F: 7, BOOT_F: 8,
  TOP: 9, COAT: 10, BELT: 11, NECK: 12, SCARF_B: 13, ARM_F: 14, HAND_B: 15, HAND_F: 16, HEAD: 17,
  BEARD: 18, HAIR: 19, HAT: 20, GOG: 21, SCARF: 22, CAPE_F: 23, WPN: 24, WPN2: 25, GLOW: 26,
};

function J(view, pose, frame, body) {
  // 回傳關節位置
  const k = body === 'kid' ? 1 : 0;
  const broad = body === 'broad' ? 1.4 : body === 'slim' ? -0.8 : 0;
  const j = { bob: 0, lean: 0, headX: 0, headY: 0 };
  // 走路相位
  const walk = pose === 'walk';
  const ph = walk ? [0, 1, 0, -1][frame % 4] : 0;
  const bob = walk ? (frame % 2 === 1 ? -1 : 0) : (pose === 'idle' || pose === 'b_idle') && frame === 1 ? 1 : 0;
  j.bob = bob;
  const y0 = k ? 6 : 0; // 小孩整體往下（比較矮）
  j.y0 = y0;
  if (view === 'side') {
    let sw = walk ? ph * 3.2 : 0;
    let lean = 0, armF = [21.5, 33.5], armB = [26.5, 33.5], hipF = [23.5, 36], hipB = [24.8, 36];
    let ankF = [23.5 - sw, 49.5], ankB = [24.8 + sw, 49.5];
    if (walk) { armF = [22 + ph * 2.2, 33.5]; armB = [26 - ph * 2.2, 33.5]; if (ph !== 0) { ankF[1] -= ph > 0 ? 0 : 1.5; ankB[1] -= ph < 0 ? 0 : 1.5; } }
    if (pose === 'b_idle') { ankF = [21, 49.5]; ankB = [27, 49.5]; armF = [19.5, 31.5]; armB = [26.5, 32]; lean = -0.5; }
    if (pose === 'atk1') { ankF = [20.5, 49.5]; ankB = [28.5, 49.5]; armF = [26, 22]; armB = [29, 30]; lean = 1.5; }
    if (pose === 'atk2') { ankF = [15, 49.5]; ankB = [29, 49.5]; armF = [12, 30]; armB = [27, 31]; lean = -3.5; }
    if (pose === 'cast') { ankF = [20.5, 49.5]; ankB = [27, 49.5]; armF = [13.5, 24.5]; armB = [28, 24]; lean = -1; }
    if (pose === 'hurt') { ankF = [22, 49.5]; ankB = [27.5, 49.5]; armF = [23.5, 34]; armB = [29, 30]; lean = 2.5; }
    if (pose === 'guard') { ankF = [20, 49.5]; ankB = [28, 49.5]; armF = [17.5, 29]; armB = [24, 31]; lean = -1; }
    if (pose === 'win') { ankF = [21.5, 49.5]; ankB = [26.5, 49.5]; armF = [20, 15]; armB = [27.5, 33]; lean = 0; }
    j.lean = lean;
    j.head = [23.5 + lean * 0.9, 15 + y0 + bob];
    j.shoulderF = [23 + lean * 0.7, 25.5 + y0 + bob]; j.shoulderB = [25.5 + lean * 0.7, 25.5 + y0 + bob];
    j.handF = [armF[0] + lean * 0.3, armF[1] + y0 + bob * 0.5]; j.handB = [armB[0] + lean * 0.3, armB[1] + y0 + bob * 0.5];
    j.hipF = [hipF[0] + lean * 0.3, hipF[1] + y0 + bob * 0.5]; j.hipB = [hipB[0] + lean * 0.3, hipB[1] + y0 + bob * 0.5];
    j.ankF = ankF.map((v, i) => (i ? v : v)); j.ankB = ankB;
    j.torso = [[20 + lean * 0.7, 24 + y0 + bob], [28 + lean * 0.7, 24 + y0 + bob], [27.6 + lean * 0.3, 35.5 + y0 + bob * 0.5], [20.4 + lean * 0.3, 35.5 + y0 + bob * 0.5]];
    if (k) { j.ankF[1] = 49.5; j.ankB[1] = 49.5; }
  } else {
    const L = walk ? (ph === 1 ? 2 : 0) : 0, R = walk ? (ph === -1 ? 2 : 0) : 0;
    j.head = [24, 15 + y0 + bob];
    j.shoulderL = [17.8 - broad, 25.5 + y0 + bob]; j.shoulderR = [30.2 + broad, 25.5 + y0 + bob];
    const sw = walk ? ph : 0;
    j.handL = [16.4 - broad, 34.5 + y0 + bob * 0.5 - sw * 1]; j.handR = [31.6 + broad, 34.5 + y0 + bob * 0.5 + sw * 1];
    j.hipL = [21.6, 36.5 + y0 + bob * 0.5]; j.hipR = [26.4, 36.5 + y0 + bob * 0.5];
    j.ankL = [21.6, 49.6 - L]; j.ankR = [26.4, 49.6 - R];
    j.torso = [[17.5 - broad, 24 + y0 + bob], [30.5 + broad, 24 + y0 + bob], [29.6 + broad * 0.6, 35.5 + y0 + bob * 0.5], [18.4 - broad * 0.6, 35.5 + y0 + bob * 0.5]];
  }
  return j;
}

// 主要繪製
export function human(spec, view = 'front', pose = 'idle', frame = 0) {
  const p = new Pix(FW, FH);
  const R = {}; // 部件 → 色帶
  const S = spec;
  const skin = ramp(S.skin || '#f0c6a2');
  const hairR = ramp(S.hair?.color || '#2b2a3a');
  const topR = ramp(S.top?.color || '#3c5a7a');
  const coatR = S.coat ? ramp(S.coat.color) : topR;
  const legR = ramp(S.pants || '#3a3446');
  const bootR = ramp(S.boots || '#4a3426');
  const beltR = ramp(S.belt || '#6a4a2a');
  const body = S.body || 'normal';
  const j = J(view, pose, frame, body);
  const darkR = (r) => r.map((c) => shift(c, -0.9));
  const put = (part, r) => { R[part] = r; };
  const side = view === 'side', back = view === 'back', front = view === 'front';
  const kid = body === 'kid';

  // ---- 披風（背後）
  if (S.cape && !side) {
    if (front) {
      const cr = ramp(S.cape.color); put(PT.CAPE_B, darkR(cr));
      p.poly([[17, 25 + j.y0 + j.bob], [31, 25 + j.y0 + j.bob], [32.5, 44 + j.y0], [15.5, 44 + j.y0]], cr[2], PT.CAPE_B);
    }
  }
  if (S.cape && side) {
    const cr = ramp(S.cape.color); put(PT.CAPE_B, darkR(cr));
    const sx = j.shoulderB[0] + 1, sy = j.shoulderB[1] - 1;
    const flow = pose === 'walk' ? (frame % 2) : 0;
    p.poly([[sx - 3, sy], [sx + 2, sy], [sx + 6 + flow, 44 + j.y0], [sx + 1, 46 + j.y0], [sx - 3, 40 + j.y0]], cr[2], PT.CAPE_B);
  }
  // ---- 長髮在身後
  const hs = S.hair?.style || 'short';
  if ((hs === 'long' || hs === 'pony') && !back) {
    put(PT.HAIR_B, hairR.map((c) => shift(c, -0.5)));
    if (front) p.poly([[17, 14 + j.y0 + j.bob], [31, 14 + j.y0 + j.bob], [32, 27 + j.y0 + j.bob], [16, 27 + j.y0 + j.bob]], hairR[2], PT.HAIR_B);
    if (side) {
      const hx = j.head[0] + 4, hy = j.head[1] - 2;
      if (hs === 'pony') { p.limb(hx + 1, hy - 1, hx + 5, hy + 7, 4.5, 2.5, hairR[2], PT.HAIR_B); p.ellipse(hx + 4.5, hy + 9, 1.6, 2.4, hairR[2], PT.HAIR_B); }
      else p.poly([[hx - 2, hy - 3], [hx + 3, hy - 3], [hx + 4, hy + 12], [hx - 1, hy + 11]], hairR[2], PT.HAIR_B);
    }
  }
  // ---- 背後的手臂與武器（側面）
  if (side) {
    put(PT.ARM_B, darkR(S.coat ? coatR : topR));
    p.limb(j.shoulderB[0], j.shoulderB[1], (j.shoulderB[0] + j.handB[0]) / 2 + 0.5, (j.shoulderB[1] + j.handB[1]) / 2, 4, 3.6, (S.coat ? coatR : topR)[2], PT.ARM_B);
    p.limb((j.shoulderB[0] + j.handB[0]) / 2 + 0.5, (j.shoulderB[1] + j.handB[1]) / 2, j.handB[0], j.handB[1], 3.6, 3.2, (S.coat ? coatR : topR)[2], PT.ARM_B);
    put(PT.HAND_B, darkR(skin));
    p.ellipse(j.handB[0], j.handB[1] + 1, 1.7, 1.7, skin[2], PT.HAND_B);
  }
  // ---- 腿
  const legW = kid ? 4 : body === 'broad' ? 5.6 : body === 'slim' ? 4.3 : 5;
  if (side) {
    put(PT.LEG_B, darkR(legR)); put(PT.BOOT_B, darkR(bootR));
    const kB = [(j.hipB[0] + j.ankB[0]) / 2 + 0.8, (j.hipB[1] + j.ankB[1]) / 2];
    p.limb(j.hipB[0], j.hipB[1], kB[0], kB[1], legW, legW - 0.6, legR[2], PT.LEG_B);
    p.limb(kB[0], kB[1], j.ankB[0], j.ankB[1], legW - 0.6, legW - 1, legR[2], PT.LEG_B);
    p.poly([[j.ankB[0] - 3.8, j.ankB[1] - 1.5], [j.ankB[0] + 2.2, j.ankB[1] - 3], [j.ankB[0] + 2.2, 53.5], [j.ankB[0] - 4.5, 53.5]], bootR[2], PT.BOOT_B);
    put(PT.LEG_F, legR); put(PT.BOOT_F, bootR);
    const kF = [(j.hipF[0] + j.ankF[0]) / 2 - 0.4, (j.hipF[1] + j.ankF[1]) / 2];
    p.limb(j.hipF[0], j.hipF[1], kF[0], kF[1], legW, legW - 0.6, legR[2], PT.LEG_F);
    p.limb(kF[0], kF[1], j.ankF[0], j.ankF[1], legW - 0.6, legW - 1, legR[2], PT.LEG_F);
    const by = Math.min(53.5, j.ankF[1] + 4);
    p.poly([[j.ankF[0] - 3.8, j.ankF[1] - 1.5], [j.ankF[0] + 2.2, j.ankF[1] - 3], [j.ankF[0] + 2.2, by], [j.ankF[0] - 4.5, by]], bootR[2], PT.BOOT_F);
  } else {
    put(PT.LEG_B, legR); put(PT.LEG_F, legR); put(PT.BOOT_B, bootR); put(PT.BOOT_F, bootR);
    p.limb(j.hipL[0], j.hipL[1], j.ankL[0], j.ankL[1] - 1, legW, legW - 0.8, legR[2], PT.LEG_B);
    p.limb(j.hipR[0], j.hipR[1], j.ankR[0], j.ankR[1] - 1, legW, legW - 0.8, legR[2], PT.LEG_F);
    const bt = (ax, ay, part) => p.poly([[ax - 2.6, ay - 3.5], [ax + 2.6, ay - 3.5], [ax + 2.9, ay + 3.9], [ax - 2.9, ay + 3.9]], bootR[2], part);
    bt(j.ankL[0] - 0.3, j.ankL[1], PT.BOOT_B); bt(j.ankR[0] + 0.3, j.ankR[1], PT.BOOT_F);
  }
  // ---- 軀幹
  put(PT.TOP, topR);
  p.poly(j.torso, topR[2], PT.TOP);
  if (!side) {
    p.ellipse(j.torso[0][0] + 1.5, j.torso[0][1] + 1.5, 2.2, 2, topR[2], PT.TOP);
    p.ellipse(j.torso[1][0] - 1.5, j.torso[1][1] + 1.5, 2.2, 2, topR[2], PT.TOP);
  }
  // ---- 外套下擺
  const cl = S.coatLen ?? 0;
  if (cl > 0) {
    put(PT.COAT, coatR);
    const yb = 35 + j.y0 + j.bob * 0.5, ye = yb + 3 + cl * 9;
    if (side) {
      const wv = pose === 'walk' ? (frame % 2 ? 1 : 0) : 0;
      const lx = j.torso[3][0], rx = j.torso[2][0];
      p.poly([[lx - 0.5, yb - 1], [rx + 0.5, yb - 1], [rx + 2.5 + wv, ye], [lx - 1.5 - (pose === 'atk2' ? 3 : 0), ye - 1]], coatR[2], PT.COAT);
    } else {
      p.poly([[j.torso[3][0] - 0.5, yb - 1], [j.torso[2][0] + 0.5, yb - 1], [j.torso[2][0] + 2.2, ye], [j.torso[3][0] - 2.2, ye]], coatR[2], PT.COAT);
    }
  }
  // ---- 腰帶
  if (S.belt) {
    put(PT.BELT, beltR);
    const by = 34.6 + j.y0 + j.bob * 0.5;
    if (side) p.rect(Math.round(j.torso[3][0]), Math.round(by), Math.round(j.torso[2][0] - j.torso[3][0]) + 1, 2, beltR[2], PT.BELT);
    else p.rect(Math.round(j.torso[3][0]), Math.round(by), Math.round(j.torso[2][0] - j.torso[3][0]), 2, beltR[2], PT.BELT);
  }
  // ---- 外套前襟（正面）
  if (S.coat && front) {
    const t = j.torso;
    p.poly([[t[0][0], t[0][1]], [t[0][0] + 3.6, t[0][1]], [t[3][0] + 2.6, t[3][1] + 0.5], [t[3][0], t[3][1] + 0.5]], coatR[2], PT.COAT);
    p.poly([[t[1][0] - 3.6, t[1][1]], [t[1][0], t[1][1]], [t[2][0], t[2][1] + 0.5], [t[2][0] - 2.6, t[2][1] + 0.5]], coatR[2], PT.COAT);
    R[PT.COAT] = coatR;
  }
  if (S.coat && back) {
    p.poly(j.torso, coatR[2], PT.COAT); R[PT.COAT] = coatR;
  }
  // ---- 脖子
  put(PT.NECK, skin.map((c) => shift(c, -0.8)));
  p.rect(22 + (side ? -0.5 + j.lean * 0.8 : 0), 21 + j.y0 + j.bob, 4, 4, skin[2], PT.NECK);
  // ---- 前面的手臂
  const armR = S.coat ? coatR : topR;
  put(PT.ARM_F, armR); put(PT.HAND_F, skin);
  if (side) {
    const e = [(j.shoulderF[0] + j.handF[0]) / 2 - 0.6, (j.shoulderF[1] + j.handF[1]) / 2 + 0.3];
    p.limb(j.shoulderF[0], j.shoulderF[1], e[0], e[1], 4.4, 3.8, armR[2], PT.ARM_F);
    p.limb(e[0], e[1], j.handF[0], j.handF[1], 3.8, 3.4, armR[2], PT.ARM_F);
    p.ellipse(j.handF[0], j.handF[1] + 0.8, 1.8, 1.8, skin[2], PT.HAND_F);
  } else {
    put(PT.HAND_B, skin);
    for (const [s, h, part] of [[j.shoulderL, j.handL, PT.ARM_F], [j.shoulderR, j.handR, PT.ARM_F]]) {
      const e = [(s[0] + h[0]) / 2 + (s[0] < 24 ? -0.6 : 0.6), (s[1] + h[1]) / 2];
      p.limb(s[0], s[1], e[0], e[1], 4.4, 4, armR[2], part);
      p.limb(e[0], e[1], h[0], h[1] - 0.5, 4, 3.6, armR[2], part);
    }
    p.ellipse(j.handL[0], j.handL[1] + 0.6, 1.8, 1.8, skin[2], PT.HAND_F);
    p.ellipse(j.handR[0], j.handR[1] + 0.6, 1.8, 1.8, skin[2], PT.HAND_F);
  }
  // ---- 頭
  put(PT.HEAD, skin);
  const [hx, hy] = j.head;
  if (side) p.ellipse(hx, hy, 6.5, 7, skin[2], PT.HEAD);
  else p.ellipse(hx, hy, 7, 7.1, skin[2], PT.HEAD);
  if (side) { p.set(Math.round(hx - 7), Math.round(hy + 2), skin[2], PT.HEAD); }
  // ---- 鬍子
  if (S.beard) {
    const br = ramp(S.beard); put(PT.BEARD, br);
    if (front) p.poly([[hx - 5, hy + 1], [hx + 5, hy + 1], [hx + 3.5, hy + 9], [hx, hy + 11], [hx - 3.5, hy + 9]], br[2], PT.BEARD);
    if (side) p.poly([[hx - 6, hy + 1], [hx - 0.5, hy + 1], [hx - 1, hy + 8], [hx - 4, hy + 10], [hx - 6.5, hy + 6]], br[2], PT.BEARD);
  }
  // ---- 頭髮
  put(PT.HAIR, hairR);
  drawHair(p, hs, view, hx, hy, hairR, S);
  // ---- 帽子
  if (S.hat) drawHat(p, S.hat, view, hx, hy, R);
  // ---- 圍巾
  if (S.scarf) {
    const sr = ramp(S.scarf.color); put(PT.SCARF, sr);
    const sy = 22.5 + j.y0 + j.bob;
    if (side) {
      p.poly([[hx - 4.5, sy - 1], [hx + 3.5, sy - 1], [hx + 4, sy + 3], [hx - 4.5, sy + 3]], sr[2], PT.SCARF);
      const fl = pose === 'walk' ? (frame % 2) * 1.5 : pose === 'atk2' ? 3 : 0;
      p.poly([[hx + 2, sy], [hx + 5, sy + 1], [hx + 10 + fl, sy + 5 - fl * 0.5], [hx + 8 + fl, sy + 8], [hx + 3, sy + 3]], sr[2], PT.SCARF);
    } else {
      p.poly([[hx - 6, sy - 1], [hx + 6, sy - 1], [hx + 6.5, sy + 2.5], [hx - 6.5, sy + 2.5]], sr[2], PT.SCARF);
      if (front) p.poly([[hx + 1.5, sy + 2], [hx + 4.5, sy + 2], [hx + 4, sy + 9], [hx + 1.5, sy + 8.5]], sr[2], PT.SCARF);
      else p.poly([[hx - 1.5, sy + 2], [hx + 1.5, sy + 2], [hx + 2, sy + 10], [hx - 2, sy + 10]], sr[2], PT.SCARF);
    }
  }
  // ---- 披風（背面在前）
  if (S.cape && back) {
    const cr = ramp(S.cape.color); put(PT.CAPE_F, cr);
    p.poly([[17, 24 + j.y0 + j.bob], [31, 24 + j.y0 + j.bob], [32.5, 45 + j.y0], [24, 46 + j.y0], [15.5, 45 + j.y0]], cr[2], PT.CAPE_F);
  }
  // ---- 護目鏡
  if (S.goggles && !back) {
    const gr = ramp(S.goggles.color || '#3a4a5a'); put(PT.GOG, gr);
    const gy = hy - 5.5;
    if (front) { p.rect(hx - 7, gy, 14, 1, gr[1], PT.GOG); p.ellipse(hx - 3, gy + 0.5, 2.3, 1.8, gr[2], PT.GOG); p.ellipse(hx + 3, gy + 0.5, 2.3, 1.8, gr[2], PT.GOG); }
    if (side) { p.rect(hx - 5, gy, 11, 1, gr[1], PT.GOG); p.ellipse(hx - 4.5, gy + 0.5, 2.1, 1.8, gr[2], PT.GOG); }
  }

  // ---- 武器
  drawWeapon(p, S.weapon, view, pose, frame, j, R);

  // ---- 明暗
  for (const k of Object.keys(R)) p.shade(+k, R[k], { soft: [PT.HEAD, PT.HAND_F, PT.HAND_B, PT.NECK].includes(+k), hi: ![PT.HAND_F, PT.HAND_B].includes(+k) });
  hairShine(p, view, j.head, hairR, S.hair?.style || 'short', !!S.hat);
  // ---- 內線
  p.innerLines((q) => R[q], [PT.HEAD, PT.HAND_F, PT.HAND_B, PT.NECK, PT.GLOW, PT.BEARD, PT.HAIR_B]);

  // ---- 臉部細節（明暗後才畫）
  const eyeC = hex(S.eyes || '#3b2a20');
  const lash = hex('#1a1520');
  if (front && !S.noFace) {
    const ey = Math.round(hy);
    for (const [ex, d] of [[Math.round(hx - 4), 0], [Math.round(hx + 2), 1]]) {
      p.set(ex, ey, lash); p.set(ex + 1, ey, lash);
      p.set(ex + d, ey + 1, lash); p.set(ex + 1 - d, ey + 1, eyeC);
      p.set(ex + d, ey + 2, shift(eyeC, -0.4)); p.set(ex + 1 - d, ey + 2, shift(eyeC, 0.8));
    }
    if (!S.beard) p.set(Math.round(hx), Math.round(hy + 5), shift(skin[1], -0.4));
    if (S.blush) { p.set(Math.round(hx - 5), Math.round(hy + 4), hex(S.blush)); p.set(Math.round(hx + 5), Math.round(hy + 4), hex(S.blush)); }
  }
  if (side && !S.noFace) {
    const ey = Math.round(hy), ex = Math.round(hx - 4.5);
    if (pose === 'hurt') { p.set(ex, ey + 1, lash); p.set(ex + 1, ey + 1, lash); }
    else { p.set(ex, ey, lash); p.set(ex + 1, ey, lash); p.set(ex, ey + 1, lash); p.set(ex + 1, ey + 1, eyeC); p.set(ex + 1, ey + 2, shift(eyeC, 0.8)); p.set(ex, ey + 2, shift(eyeC, -0.4)); }
    if (!S.beard) p.set(Math.round(hx - 5.5), Math.round(hy + 5), shift(skin[1], -0.4));
    if (S.blush) p.set(Math.round(hx - 3), Math.round(hy + 4), hex(S.blush));
  }
  // 細節：鈕扣、徽記
  if (S.trim && !side) {
    const tr = hex(S.trim);
    if (front) for (let yy = 26; yy < 34; yy += 3) p.set(24, yy + j.y0 + Math.round(j.bob), tr);
  }
  if (S.emblem && front) {
    const em = hex(S.emblem); const cx = 24, cy = 29 + j.y0 + Math.round(j.bob);
    p.set(cx, cy - 1, em); p.set(cx - 1, cy, em); p.set(cx + 1, cy, em); p.set(cx, cy + 1, em); p.set(cx, cy, shift(em, 1.5));
  }
  p.outline();
  // 燈光（發光像素，外框之後）
  if (S.weapon === 'lanternhook' || S.weapon === 'lanternstaff') drawLanternGlow(p, view, pose, j);
  return p;
}

function drawHair(p, hs, view, hx, hy, hr, S) {
  const c = hr[2];
  const part = PT.HAIR;
  if (hs === 'bald') return;
  if (view === 'back') {
    p.ellipse(hx, hy - 0.5, 7.6, 7.6, c, part);
    if (hs === 'long') p.poly([[hx - 7.5, hy], [hx + 7.5, hy], [hx + 8, hy + 13], [hx - 8, hy + 13]], c, part);
    else if (hs === 'pony') { p.poly([[hx - 7, hy], [hx + 7, hy], [hx + 6, hy + 6], [hx - 6, hy + 6]], c, part); p.limb(hx, hy + 2, hx + 0.5, hy + 13, 4.2, 2.4, c, part); }
    else if (hs === 'old') p.poly([[hx - 7.5, hy - 1], [hx + 7.5, hy - 1], [hx + 7, hy + 5], [hx - 7, hy + 5]], c, part);
    else p.poly([[hx - 7.3, hy - 1], [hx + 7.3, hy - 1], [hx + 6.5, hy + 6], [hx + 3, hy + 7.5], [hx - 3, hy + 7.5], [hx - 6.5, hy + 6]], c, part);
    if (hs === 'messy') { p.set(hx - 8, hy - 3, c, part); p.set(hx + 8, hy - 2, c, part); p.set(hx + 7, hy + 7, c, part); }
    return;
  }
  if (view === 'front') {
    // 頭頂
    p.ellipse(hx, hy - 2.6, 7.7, 5.6, c, part);
    if (hs === 'old') {
      p.ellipse(hx, hy - 4, 6.5, 3.8, c, part);
      p.rect(hx - 8, hy - 3, 2, 6, c, part); p.rect(hx + 6, hy - 3, 2, 6, c, part);
      return;
    }
    // 瀏海鋸齒
    const pts = hs === 'messy'
      ? [[hx - 8, hy + 0.5], [hx - 6.5, hy - 2.6], [hx - 5, hy - 1.2], [hx - 3, hy - 3.6], [hx - 1, hy - 1.5], [hx + 1, hy - 3.8], [hx + 3, hy - 1.6], [hx + 4.8, hy - 3.4], [hx + 6.6, hy - 0.8], [hx + 8, hy - 1.2], [hx + 8, hy - 5], [hx - 8, hy - 5]]
      : hs === 'pony' || hs === 'long'
        ? [[hx - 8, hy + 2.5], [hx - 6.5, hy - 3], [hx - 4, hy - 3.4], [hx - 1.5, hy - 2.4], [hx + 0.5, hy - 4], [hx + 2.5, hy - 2.2], [hx + 5, hy - 3.6], [hx + 7, hy - 1.8], [hx + 8, hy + 2.5], [hx + 8, hy - 5], [hx - 8, hy - 5]]
        : [[hx - 7.8, hy - 0.5], [hx - 5, hy - 2.5], [hx - 2, hy - 1.6], [hx, hy - 3], [hx + 2.5, hy - 1.6], [hx + 5.5, hy - 2.4], [hx + 7.8, hy - 0.5], [hx + 7.8, hy - 5], [hx - 7.8, hy - 5]];
    p.poly(pts, c, part);
    // 側髮
    const sl = hs === 'long' || hs === 'pony' ? 8 : hs === 'messy' ? 5.5 : 3.5;
    p.poly([[hx - 7.8, hy - 2], [hx - 5.6, hy - 2], [hx - 5.8, hy + sl - 1], [hx - 7.2, hy + sl]], c, part);
    p.poly([[hx + 7.8, hy - 2], [hx + 5.6, hy - 2], [hx + 5.8, hy + sl - 1], [hx + 7.2, hy + sl]], c, part);
    if (hs === 'messy') { p.set(hx - 3, hy - 8.5, c, part); p.set(hx - 2, hy - 8.5, c, part); p.set(hx + 4, hy - 8, c, part); }
    if (hs === 'pony') { p.ellipse(hx + 6, hy - 6.5, 1.8, 1.6, hex(S.ribbon || '#c43b3b'), part); }
    return;
  }
  // 側面（朝左）
  p.ellipse(hx + 1.2, hy - 2.4, 7.3, 5.9, c, part);
  p.poly([[hx - 2, hy - 3], [hx + 6.6, hy - 4], [hx + 7.2, hy + (hs === 'short' || hs === 'old' ? 4 : hs === 'messy' ? 5.5 : 7)], [hx + 3, hy + (hs === 'messy' ? 3.5 : 5)], [hx + 0.8, hy - 1]], c, part);
  if (hs !== 'old') {
    const bang = hs === 'messy' ? [[hx - 7.4, hy - 0.6], [hx - 6.2, hy - 3.3], [hx - 4.4, hy - 1.9], [hx - 3, hy - 3.6], [hx - 1, hy - 2.4], [hx, hy - 5], [hx - 7, hy - 5]]
      : [[hx - 7.2, hy - 0.6], [hx - 5.5, hy - 3.4], [hx - 3, hy - 2.6], [hx - 0.5, hy - 3.4], [hx, hy - 5], [hx - 7, hy - 5]];
    p.poly(bang, c, part);
  }
  if (hs === 'messy') { p.set(hx + 7, hy - 6, c, part); p.set(hx + 8, hy - 4, c, part); p.set(hx + 3, hy - 9, c, part); }
  if (hs === 'pony') p.ellipse(hx + 6.5, hy - 4.5, 1.7, 1.6, hex(S.ribbon || '#c43b3b'), part);
}

function hairShine(p, view, head, hr, hs, hatted) {
  if (hatted || hs === 'bald') return;
  const [hx, hy] = head, c = hr[4], c2 = hr[3];
  const pts = view === 'front' ? [[-4, -6], [-3, -7], [-2, -7], [2, -7], [3, -7], [4, -6]]
    : view === 'back' ? [[-3, -6], [-2, -7], [-1, -7], [1, -7], [2, -7], [3, -6]]
      : [[-2, -7], [-1, -7.5], [0, -7.5], [3, -7], [4, -6.5]];
  pts.forEach(([dx, dy], i) => {
    const x = Math.round(hx + dx), y = Math.round(hy + dy);
    if (p.alpha(x, y) > 0 && p.alpha(x, y - 1) > 0) p.set(x, y, i === 0 || i === pts.length - 1 ? c2 : c);
  });
}

function drawHat(p, hat, view, hx, hy, R) {
  const hr = ramp(hat.color || '#2c3550'); R[PT.HAT] = hr;
  const c = hr[2];
  if (hat.type === 'bicorne') {
    if (view === 'side') p.poly([[hx - 9, hy - 6], [hx - 3, hy - 11], [hx + 4, hy - 11.5], [hx + 10, hy - 6], [hx + 1, hy - 5]], c, PT.HAT);
    else p.poly([[hx - 11, hy - 4.5], [hx - 4, hy - 10.5], [hx + 4, hy - 10.5], [hx + 11, hy - 4.5], [hx, hy - 5.5]], c, PT.HAT);
    p.rect(hx - (view === 'side' ? 1 : 1), hy - 9, 2, 2, hex(hat.trim || '#d8b25a'), PT.HAT);
  } else if (hat.type === 'helmet') {
    p.ellipse(hx + (view === 'side' ? 0.6 : 0), hy - 3, 8.1, 6.6, c, PT.HAT);
    p.rect(hx - 8.5, hy - 1, 17, 2, hr[1], PT.HAT);
    if (view === 'front') { p.rect(hx - 1, hy - 10, 2, 4, hex(hat.trim || '#d8b25a'), PT.HAT); }
    if (view === 'side') { p.rect(hx - 1, hy - 10, 2, 3, hex(hat.trim || '#d8b25a'), PT.HAT); p.poly([[hx + 5, hy - 1], [hx + 8.5, hy - 1], [hx + 8, hy + 5], [hx + 5.5, hy + 4]], c, PT.HAT); }
  } else if (hat.type === 'hood') {
    p.ellipse(hx + (view === 'side' ? 1 : 0), hy - 2.2, 8.3, 7.4, c, PT.HAT);
    if (view === 'front') p.ellipse(hx, hy + 1.8, 5.6, 5.4, [0, 0, 0, 0], PT.HAT);
  } else if (hat.type === 'cap') {
    p.ellipse(hx + (view === 'side' ? 0.8 : 0), hy - 5, 7.4, 3.6, c, PT.HAT);
    if (view === 'side') p.rect(hx - 9, hy - 3.5, 6, 1.5, hr[1], PT.HAT); else if (view === 'front') p.rect(hx - 7.5, hy - 3.2, 15, 1.5, hr[1], PT.HAT);
  } else if (hat.type === 'bandana') {
    p.poly([[hx - 7.8, hy - 4], [hx + 7.8, hy - 4], [hx + 7.8, hy - 1.6], [hx - 7.8, hy - 1.6]], c, PT.HAT);
    if (view !== 'front') p.poly([[hx + 6, hy - 3], [hx + 10, hy - 1], [hx + 9, hy + 2], [hx + 6, hy]], c, PT.HAT);
  } else if (hat.type === 'rain') {
    p.poly([[hx - 10, hy - 3], [hx - 6, hy - 10], [hx + 6, hy - 10], [hx + 10, hy - 3]], c, PT.HAT);
  }
}

function drawWeapon(p, w, view, pose, frame, j, R) {
  if (!w) return;
  const wood = ramp('#7a5634'), metal = ramp('#b8c0cc'), brass = ramp('#c9973f'), dark = ramp('#3c3a48');
  if (view !== 'side') {
    // 正背面：武器簡化為斜放在身旁
    if (w === 'lanternhook' || w === 'lanternstaff') {
      R[PT.WPN] = wood;
      const x = view === 'front' ? j.handR[0] + 1 : j.handL[0] - 1;
      p.line(x, j.handR[1] + 6, x + (view === 'front' ? 1 : -1), 4 + j.y0, wood[2], 1.6, PT.WPN);
      R[PT.WPN2] = brass;
      const lx = x + (view === 'front' ? -1 : 1);
      p.rect(lx - 2, 6 + j.y0, 5, 6, brass[2], PT.WPN2);
    } else if (w === 'sword_shield') {
      R[PT.WPN] = metal; R[PT.WPN2] = ramp('#e8d7a8');
      if (view === 'front') {
        p.line(j.handR[0] + 0.5, j.handR[1] + 1, j.handR[0] + 1.5, j.handR[1] + 13, metal[2], 1.6, PT.WPN);
        p.ellipse(j.handL[0] - 1, j.handL[1] - 2, 4.6, 5.4, R[PT.WPN2][2], PT.WPN2);
      } else {
        p.ellipse(24, 30 + j.y0 + j.bob, 6.2, 6.8, R[PT.WPN2][2], PT.WPN2);
      }
    } else if (w === 'daggers') {
      R[PT.WPN] = metal;
      p.line(j.handL[0], j.handL[1] + 1, j.handL[0] - 1, j.handL[1] + 5, metal[2], 1.2, PT.WPN);
      p.line(j.handR[0], j.handR[1] + 1, j.handR[0] + 1, j.handR[1] + 5, metal[2], 1.2, PT.WPN);
    } else if (w === 'spear') {
      R[PT.WPN] = wood; R[PT.WPN2] = metal;
      const x = view === 'front' ? j.handR[0] + 0.5 : j.handL[0] - 0.5;
      p.line(x, 52, x, 6 + j.y0, wood[2], 1.4, PT.WPN);
      p.poly([[x - 1.5, 7 + j.y0], [x + 1.5, 7 + j.y0], [x, 1 + j.y0]], metal[2], PT.WPN2);
    } else if (w === 'sabre') {
      R[PT.WPN] = metal;
      p.line(j.handR[0] + 0.5, j.handR[1] + 1, j.handR[0] + 2.5, j.handR[1] + 12, metal[2], 1.5, PT.WPN);
    } else if (w === 'staff') {
      R[PT.WPN] = wood;
      p.line(j.handR[0] + 1, 53, j.handR[0] + 1, 14 + j.y0, wood[2], 1.6, PT.WPN);
    }
    return;
  }
  // 側面：武器依姿勢
  const hx = j.handF[0], hy = j.handF[1] + 0.5;
  const ang = { b_idle: -2.05, atk1: -0.75, atk2: -2.98, cast: -2.2, hurt: -1.25, guard: -2.4, win: -1.62, idle: -0.95, walk: -0.95 }[pose] ?? -1.4;
  const fieldCarry = pose === 'idle' || pose === 'walk';
  if (w === 'lanternhook' || w === 'lanternstaff') {
    R[PT.WPN] = wood; R[PT.WPN2] = brass;
    const L = 30;
    const ox = fieldCarry ? j.handB[0] : hx, oy = fieldCarry ? j.handB[1] + 0.5 : hy;
    const bx = ox - Math.cos(ang) * 7, by = oy - Math.sin(ang) * 7;
    const tx = ox + Math.cos(ang) * (L - 7), ty = oy + Math.sin(ang) * (L - 7);
    const wp = fieldCarry ? PT.WPN_B : PT.WPN, wp2 = fieldCarry ? PT.WPN_B : PT.WPN2;
    if (fieldCarry) R[PT.WPN_B] = wood.map((c) => shift(c, -0.4));
    p.line(bx, by, tx, ty, wood[2], 1.6, wp);
    if (w === 'lanternhook') {
      // 鉤子
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const h1 = [0, 0], h2 = [0, 0];
      const hk = Math.cos(ang) < 0 ? 3 : -3;
      const h1b = [tx + ux * 2, ty + uy * 2], h2b = [h1b[0] + hk, h1b[1] - 1];
      h1[0] = h1b[0]; h1[1] = h1b[1]; h2[0] = h2b[0]; h2[1] = h2b[1];
      p.line(tx, ty, h1[0], h1[1], metal[2], 1.3, wp2);
      p.line(h1[0], h1[1], h2[0], h2[1] + 0, metal[2], 1.2, wp2);
      p.line(h2[0], h2[1], h2[0], h2[1] + 2, metal[2], 1.2, wp2);
      // 吊燈
      const lx = h2[0], ly = h2[1] + 3;
      p.rect(Math.round(lx - 2), Math.round(ly), 5, 6, brass[2], fieldCarry ? PT.WPN_B : PT.WPN2);
      p.rect(Math.round(lx - 1.5), Math.round(ly - 1), 4, 1, brass[1], fieldCarry ? PT.WPN_B : PT.WPN2);
      j.lantern = [Math.round(lx), Math.round(ly + 3)];
    } else {
      const lx = tx, ly = ty;
      p.rect(Math.round(lx - 2), Math.round(ly - 2), 5, 6, brass[2], PT.WPN2);
      j.lantern = [Math.round(lx), Math.round(ly + 1)];
    }
  } else if (w === 'sword_shield') {
    R[PT.WPN] = metal; R[PT.WPN2] = ramp('#e8d7a8');
    const sa = { atk1: -0.85, atk2: 2.55, guard: -2.0, win: -1.57, hurt: -1.1, cast: -2.2, b_idle: -2.35, idle: 1.95, walk: 1.95 }[pose] ?? 2.2;
    const L = 15, tx = hx + Math.cos(sa) * L, ty = hy + Math.sin(sa) * L;
    p.line(hx - Math.cos(sa) * 2, hy - Math.sin(sa) * 2, hx, hy, ramp('#5b3a2a')[2], 1.4, PT.WPN);
    p.line(hx + Math.cos(sa) * 1, hy + Math.sin(sa) * 1, tx, ty, metal[2], 1.9, PT.WPN);
    const gx = hx + Math.cos(sa), gy = hy + Math.sin(sa);
    p.line(gx - Math.sin(sa) * 2.4, gy + Math.cos(sa) * 2.4, gx + Math.sin(sa) * 2.4, gy - Math.cos(sa) * 2.4, brass[2], 1.2, PT.WPN);
    // 盾在背後那隻手
    const sx = pose === 'guard' ? j.handF[0] - 2 : j.handB[0] + 1, sy = pose === 'guard' ? j.handF[1] - 3 : j.handB[1] - 2.5;
    p.ellipse(sx, sy, pose === 'guard' ? 3.6 : 3, 5.6, R[PT.WPN2][2], pose === 'guard' ? PT.WPN2 : PT.WPN_B);
    if (pose !== 'guard') R[PT.WPN_B] = R[PT.WPN2].map((c) => shift(c, -0.8));
  } else if (w === 'daggers') {
    R[PT.WPN] = metal; R[PT.WPN_B] = metal.map((c) => shift(c, -0.8));
    const sa = { atk1: -0.7, atk2: 2.95, cast: -2.4, win: -1.5, b_idle: 2.3 }[pose] ?? 1.9;
    p.line(hx, hy, hx + Math.cos(sa) * 6, hy + Math.sin(sa) * 6, metal[2], 1.3, PT.WPN);
    p.line(j.handB[0], j.handB[1] + 0.5, j.handB[0] + Math.cos(sa + 0.3) * 5, j.handB[1] + Math.sin(sa + 0.3) * 5, metal[2], 1.2, PT.WPN_B);
  } else if (w === 'spear') {
    R[PT.WPN] = wood; R[PT.WPN2] = metal;
    const sa = { atk1: -0.45, atk2: -3.08, b_idle: -2.1 }[pose] ?? -1.62;
    const tx = hx + Math.cos(sa) * 22, ty = hy + Math.sin(sa) * 22;
    p.line(hx - Math.cos(sa) * 12, hy - Math.sin(sa) * 12, tx, ty, wood[2], 1.4, PT.WPN);
    p.poly([[tx + Math.sin(sa) * 1.6, ty - Math.cos(sa) * 1.6], [tx + Math.cos(sa) * 5, ty + Math.sin(sa) * 5], [tx - Math.sin(sa) * 1.6, ty + Math.cos(sa) * 1.6]], metal[2], PT.WPN2);
  } else if (w === 'sabre') {
    R[PT.WPN] = metal;
    const sa = { atk1: -0.9, atk2: 2.75, b_idle: 2.3 }[pose] ?? 1.9;
    let px = hx, py = hy;
    for (let i = 0; i < 14; i++) { const a2 = sa + i * 0.025; const nx = px + Math.cos(a2), ny = py + Math.sin(a2); p.line(px, py, nx, ny, metal[2], 1.6, PT.WPN); px = nx; py = ny; }
  } else if (w === 'staff') {
    R[PT.WPN] = wood;
    p.line(hx, hy + 18, hx - 1, hy - 12, wood[2], 1.6, PT.WPN);
  }
}

function drawLanternGlow(p, view, pose, j) {
  let x, y;
  if (view === 'side' && j.lantern) [x, y] = j.lantern;
  else if (view === 'front') { x = Math.round(j.handR[0]) + 1; y = 9 + j.y0; }
  else if (view === 'back') { x = Math.round(j.handL[0]) - 1; y = 9 + j.y0; }
  if (x == null) return;
  const g1 = hex('#fff3c4'), g2 = hex('#ffd36a'), g3 = hex('#f29a2e');
  p.rect(x - 1, y - 1, 3, 3, g2, PT.GLOW);
  p.set(x, y, g1, PT.GLOW); p.set(x, y - 1, g1, PT.GLOW);
  p.set(x - 1, y + 1, g3, PT.GLOW); p.set(x + 1, y + 1, g3, PT.GLOW);
  j.glow = [x, y];
}

// 產生一個角色的全部影格
export const FIELD_POSES = [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3]];
export const BATTLE_POSES = ['b_idle', 'b_idle1', 'atk1', 'atk2', 'cast', 'hurt', 'guard', 'win'];

export function characterFrames(spec, withBattle = true) {
  const frames = [], index = {};
  for (const view of ['front', 'back', 'side']) for (const [pose, f] of FIELD_POSES) {
    index[`${view}_${pose}${f}`] = frames.length;
    frames.push(human(spec, view, pose, f));
  }
  if (withBattle) for (const pose of BATTLE_POSES) {
    index[`b_${pose}`] = frames.length;
    if (pose === 'b_idle1') frames.push(human(spec, 'side', 'b_idle', 1));
    else frames.push(human(spec, 'side', pose, 0));
  }
  return { frames, index };
}
