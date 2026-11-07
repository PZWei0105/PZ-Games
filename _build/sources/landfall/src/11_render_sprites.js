'use strict';
/* ====== 渲染：建築、植物、人物、生物、整幀合成 ====== */
const GLOWPTS = [];
function addGlow(sx, sy, r, col, a) { if (r < 3.5 || a < 0.03 || sx < -r || sy < -r || sx > CAM.W + r || sy > CAM.H + r) return; GLOWPTS.push(sx, sy, r, col, a); }
function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
function fillPoly(pts, col) { poly(pts); ctx.fillStyle = col; ctx.fill(); }
const LEFT_SIDE = ['S', 'E', 'N', 'W'], RIGHT_SIDE = ['E', 'N', 'W', 'S'];
const PS = 1.3;  // 人物放大
const BSC = { bug: 1.4, spine: 1.15, mother: 1 };

/* 等角方塊幾何 */
function boxGeom(x, y, w, h, H, base = 0) {
  const P = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => { const [rx, ry] = rotP(a, b); return { rx, ry, a, b }; });
  const pick = f => P.reduce((m, p) => f(p) < f(m) ? p : m);
  const top = pick(p => p.rx + p.ry), bot = pick(p => -(p.rx + p.ry)), rgt = pick(p => -(p.rx - p.ry)), lft = pick(p => p.rx - p.ry);
  const g = (p, hh) => w2s(p.a, p.b, hh);
  return {
    T: g(top, base), R: g(rgt, base), B: g(bot, base), L: g(lft, base),
    Tu: g(top, base + H), Ru: g(rgt, base + H), Bu: g(bot, base + H), Lu: g(lft, base + H), H, base,
    left: { a: g(lft, base), b: g(bot, base), H, side: LEFT_SIDE[CAM.rot] },
    right: { a: g(bot, base), b: g(rgt, base), H, side: RIGHT_SIDE[CAM.rot] },
  };
}
function fpt(f, u, v) { return [f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u - f.H * CAM.z * v]; }
function frect(f, u0, u1, v0, v1) { return [fpt(f, u0, v0), fpt(f, u1, v0), fpt(f, u1, v1), fpt(f, u0, v1)]; }
function drawBox(g, cTop, cLeft, cRight, edge) {
  fillPoly([g.L, g.B, g.Bu, g.Lu], cLeft);
  fillPoly([g.B, g.R, g.Ru, g.Bu], cRight);
  fillPoly([g.Tu, g.Ru, g.Bu, g.Lu], cTop);
  if (edge !== false) {
    ctx.strokeStyle = edge || 'rgba(10,12,24,0.45)'; ctx.lineWidth = Math.max(0.6, 0.9 * CAM.z);
    poly([g.L, g.B, g.R, g.Ru, g.Tu, g.Lu]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(g.Lu[0], g.Lu[1]); ctx.lineTo(g.Bu[0], g.Bu[1]); ctx.lineTo(g.Ru[0], g.Ru[1]); ctx.stroke();
  }
}
function groundShadow(x, y, w, h, H, a = 0.26) {
  const g = boxGeom(x, y, w, h, 0);
  const off = [H * CAM.z * 0.5, H * CAM.z * 0.22];
  const sh = p => [p[0] + off[0], p[1] + off[1]];
  ctx.fillStyle = `rgba(6,6,16,${a})`;
  poly([g.T, g.R, sh(g.R), sh(g.B), sh(g.L), g.L, g.B]); ctx.fill();
  ctx.fillStyle = `rgba(6,6,16,${a * 0.8})`;
  poly([g.T, g.R, g.B, g.L]); ctx.fill();
}
function faceText(f, text, u, v, size, col) {
  const a = fpt(f, u, v);
  const dx = f.b[0] - f.a[0], dy = f.b[1] - f.a[1], l = Math.hypot(dx, dy) || 1;
  ctx.save(); ctx.transform(dx / l, dy / l, 0, 1, a[0], a[1]);
  ctx.font = `700 ${size}px "Chakra Petch","Noto Sans TC",sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0); ctx.restore();
}

/* ---------- 建築 ---------- */
function drawBuilding(b, dark) {
  const d = BUILD[b.type];
  const z = CAM.z;
  const lit = G.power.ok && b.active && !G.tide.blackout;
  if (!b.done) return drawSite(b, dark);
  const fn = BDRAW[b.type];
  if (fn) fn(b, dark, lit, z);
  // 受損
  if (b.hp < b.hpMax * 0.5 && R() < 0.05) fxSmoke(b.x + b.w / 2, b.y + b.h / 2, 26, '#4a4048');
}
function drawSite(b, dark) {
  const d = BUILD[b.type];
  const H = BH[b.type] || 24;
  const p = b.prog;
  const g = boxGeom(b.x, b.y, b.w, b.h, H);
  const z = CAM.z;
  // 地基
  fillPoly([g.T, g.R, g.B, g.L], 'rgba(60,70,95,0.55)');
  ctx.strokeStyle = 'rgba(127,227,255,0.8)'; ctx.lineWidth = 1.2 * z; ctx.setLineDash([5 * z, 4 * z]);
  poly([g.T, g.R, g.B, g.L]); ctx.stroke(); ctx.setLineDash([]);
  if (p > 0.01) {
    // 真正的建築從地面往上長出來
    const extra = { lamp: 62, antenna: 106, research: 42, workshop: 26, hull: 0, dorm: 10, mess: 12, biogen: 30, greenhouse: 4 }[b.type];
    const tall = H + (extra == null ? 14 : extra);
    const clipH = tall * easeOut(p);
    const cg = boxGeom(b.x - 0.3, b.y - 0.3, b.w + 0.6, b.h + 0.6, clipH);
    ctx.save(); poly([cg.L, cg.B, cg.R, cg.Ru, cg.Tu, cg.Lu]); ctx.clip();
    const fake = Object.assign({}, b, { done: true, active: false, grow: 0, busy: false, out: 0, firing: false });
    try { if (b.type === 'fence') drawWallLike(fake, 14, '#8a6a9a', '#6d4f7d', '#c9a6e0', false); else if (b.type === 'wall') drawWallLike(fake, 24, '#9aa6b5', '#7a8696', '#d0d8e2', true); else if (BDRAW[b.type]) BDRAW[b.type](fake, 0, false, z); } catch (e) {}
    ctx.restore();
    // 焊接光
    if (p < 0.995) {
      const wg = boxGeom(b.x, b.y, b.w, b.h, Math.min(clipH, H));
      ctx.strokeStyle = `rgba(255,214,120,${0.55 + 0.35 * Math.sin(RT * 9)})`; ctx.lineWidth = 1.8 * z;
      ctx.beginPath(); ctx.moveTo(wg.Lu[0], wg.Lu[1]); ctx.lineTo(wg.Bu[0], wg.Bu[1]); ctx.lineTo(wg.Ru[0], wg.Ru[1]); ctx.stroke();
      addGlow(wg.Bu[0], wg.Bu[1], 18 * z, '#ffd27a', 0.5);
    }
  }
  // 鷹架
  ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = 1.3 * z;
  ctx.beginPath();
  for (const [a, u] of [[g.L, g.Lu], [g.B, g.Bu], [g.R, g.Ru]]) { ctx.moveTo(a[0], a[1]); ctx.lineTo(u[0], u[1]); }
  ctx.moveTo(g.Lu[0], g.Lu[1]); ctx.lineTo(g.Bu[0], g.Bu[1]); ctx.lineTo(g.Ru[0], g.Ru[1]);
  const mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const lm = mid(g.L, g.Lu), bm = mid(g.B, g.Bu), rm = mid(g.R, g.Ru);
  ctx.moveTo(lm[0], lm[1]); ctx.lineTo(bm[0], bm[1]); ctx.lineTo(rm[0], rm[1]);
  ctx.moveTo(g.L[0], g.L[1]); ctx.lineTo(bm[0], bm[1]); ctx.moveTo(g.B[0], g.B[1]); ctx.lineTo(rm[0], rm[1]);
  ctx.stroke();
  // 進度條
  const [sx, sy] = w2s(b.x + b.w / 2, b.y + b.h / 2, H + 14);
  bar(sx, sy, 34 * Math.min(1.4, z), p, '#ffd166');
}
function bar(sx, sy, w, v, col) {
  ctx.fillStyle = 'rgba(8,10,24,0.75)'; ctx.fillRect(sx - w / 2 - 1, sy - 3, w + 2, 6);
  ctx.fillStyle = col; ctx.fillRect(sx - w / 2, sy - 2, w * clamp(v, 0, 1), 4);
}
const BH = { hull: 46, solar: 10, battery: 22, biogen: 22, dorm: 30, mess: 30, storage: 22, medbay: 28, research: 24, workshop: 30, greenhouse: 34, antenna: 12, lamp: 8, fence: 14, wall: 24, turret: 14 };

const BDRAW = {
  hull(b, dark, lit, z) {
    const H = 46;
    groundShadow(b.x, b.y, b.w, b.h, H, 0.3);
    const g = boxGeom(b.x, b.y, b.w, b.h, H);
    // 側面
    const sideFill = (f, base, dk) => {
      const grd = ctx.createLinearGradient(0, f.a[1] - H * z, 0, f.a[1] + 6);
      grd.addColorStop(0, shade(base, 0.08)); grd.addColorStop(1, shade(base, -0.25 - dk));
      fillPoly([f.a, f.b, fpt(f, 1, 1), fpt(f, 0, 1)], grd);
    };
    sideFill(g.left, '#b3bfcc', 0); sideFill(g.right, '#8796a8', 0.08);
    // 頂面：圓筒高光
    const m1 = w2s(b.x + b.w / 2, b.y, H), m2 = w2s(b.x + b.w / 2, b.y + b.h, H);
    const grd = ctx.createLinearGradient(m1[0], m1[1], m2[0], m2[1]);
    grd.addColorStop(0, '#8d9aab'); grd.addColorStop(0.42, '#eef3f8'); grd.addColorStop(0.6, '#cfd8e2'); grd.addColorStop(1, '#9aa7b8');
    fillPoly([g.Tu, g.Ru, g.Bu, g.Lu], grd);
    ctx.strokeStyle = 'rgba(10,12,24,0.5)'; ctx.lineWidth = 1 * z; poly([g.L, g.B, g.R, g.Ru, g.Tu, g.Lu]); ctx.stroke();
    // 面板接縫
    for (const f of [g.left, g.right]) {
      const along = (f.side === 'S' || f.side === 'N');
      const n = along ? 10 : 6;
      ctx.strokeStyle = 'rgba(40,48,64,0.35)'; ctx.lineWidth = 0.8 * z;
      ctx.beginPath();
      for (let i = 1; i < n; i++) { const a = fpt(f, i / n, 0.05), c = fpt(f, i / n, 0.95); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); }
      const l1 = fpt(f, 0, 0.62), l2 = fpt(f, 1, 0.62); ctx.moveTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]);
      ctx.stroke();
      if (along) {
        // 舷窗列
        for (let i = 0; i < 9; i++) {
          const u = 0.17 + i * 0.085;
          const wpts = frect(f, u, u + 0.045, 0.66, 0.8);
          fillPoly(wpts, lit ? mix('#3a6a80', '#9ff7ff', 0.35 + dark * 0.65) : '#26303e');
          if (lit && dark > 0.2) { const c = fpt(f, u + .022, .73); addGlow(c[0], c[1], 9 * z, '#8ff3ff', 0.45); }
        }
        // 警示條（破口端）
        const westAt = f.side === 'S' ? (CAM.rot === 0 || CAM.rot === 3 ? 0 : 1) : (CAM.rot === 1 || CAM.rot === 2 ? 0 : 1);
        const hz = westAt === 0 ? [0.02, 0.12] : [0.88, 0.98];
        for (let k = 0; k < 4; k++) { const u0 = hz[0] + k * 0.025; fillPoly(frect(f, u0, u0 + 0.0125, 0.1, 0.5), k % 2 ? '#1d1f26' : '#f2a03a'); }
        // 艙門（南側中央）
        if (f.side === 'S') {
          fillPoly(frect(f, 0.47, 0.57, 0.0, 0.5), '#4a5568');
          fillPoly(frect(f, 0.485, 0.555, 0.02, 0.45), lit ? mix('#516680', '#bdf6ff', dark) : '#3a4454');
          if (lit && dark > 0.1) { const c = fpt(f, 0.52, 0.2); addGlow(c[0], c[1], 22 * z, '#8ff3ff', 0.5); }
        }
        faceText(f, '長庚號  CHANGGENG', 0.52, 0.3, Math.round(6.5 * z), 'rgba(30,40,58,0.75)');
      } else if (f.side === 'E') {
        // 引擎噴口
        for (const [u, v, r] of [[0.3, 0.42, 0.13], [0.7, 0.42, 0.13], [0.5, 0.78, 0.08]]) {
          const c = fpt(f, u, v); const rx = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]) * r;
          ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, rx * 1.15, Math.atan2(f.b[1] - f.a[1], f.b[0] - f.a[0]), 0, TAU); ctx.fill();
          ctx.strokeStyle = '#5c6575'; ctx.lineWidth = 2 * z; ctx.stroke();
          ctx.fillStyle = 'rgba(255,120,60,0.25)'; ctx.beginPath(); ctx.ellipse(c[0], c[1], rx * .5, rx * .58, 0, 0, TAU); ctx.fill();
        }
      } else if (f.side === 'W') {
        // 斷裂口：冬眠艙庫
        const op = [fpt(f, 0.08, 0.05), fpt(f, 0.3, 0.12), fpt(f, 0.45, 0.02), fpt(f, 0.62, 0.15), fpt(f, 0.92, 0.06), fpt(f, 0.95, 0.55), fpt(f, 0.82, 0.92), fpt(f, 0.6, 0.82), fpt(f, 0.4, 0.95), fpt(f, 0.15, 0.85), fpt(f, 0.05, 0.5)];
        fillPoly(op, '#0c1220');
        if (lit) {
          ctx.save(); poly(op); ctx.clip();
          for (let i = 0; i < 6; i++) { const c = fpt(f, 0.18 + i * 0.13, 0.4 + (i % 2) * 0.2); ctx.fillStyle = 'rgba(120,240,255,0.35)'; ctx.fillRect(c[0] - 3 * z, c[1] - 9 * z, 6 * z, 14 * z); addGlow(c[0], c[1], 14 * z, '#6fe9ff', 0.5); }
          ctx.restore();
        }
        ctx.strokeStyle = '#6a7484'; ctx.lineWidth = 1.6 * z;
        ctx.beginPath(); for (let i = 1; i < 5; i++) { const a = fpt(f, i * 0.2, 0.1), c = fpt(f, i * 0.2 + 0.03, 0.85); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); } ctx.stroke();
      }
    }
    // 頂部天線與信標
    const [ax, ay] = w2s(b.x + b.w - 0.9, b.y + 1.5, H);
    ctx.strokeStyle = '#d9e2ec'; ctx.lineWidth = 1.6 * z;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 30 * z); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax - 6 * z, ay - 20 * z); ctx.lineTo(ax + 6 * z, ay - 20 * z); ctx.stroke();
    const blink = (Math.sin(RT * 3) > 0.6);
    ctx.fillStyle = blink ? '#ff4d4d' : '#6a2020'; ctx.beginPath(); ctx.arc(ax, ay - 31 * z, 2.4 * z, 0, TAU); ctx.fill();
    if (blink) addGlow(ax, ay - 31 * z, 16 * z, '#ff4d4d', 0.8);
    // 碟形天線
    const [dx, dy] = w2s(b.x + 1.3, b.y + 1.5, H);
    ctx.fillStyle = '#c9d3de'; ctx.beginPath(); ctx.ellipse(dx, dy - 7 * z, 9 * z, 5 * z, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7f8c9c'; ctx.lineWidth = 1.2 * z; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, dy - 6 * z); ctx.stroke();
    // 燈光
    if (lit) { addLight(b.x + 2.5, b.y + 3.7, 3.4, '#9ff5ff', 0.85); addLight(b.x - 0.6, b.y + 1.5, 2.6, '#6fe9ff', 0.7); addLight(b.x + 2.5, b.y - 0.7, 2.2, null, 0.45); }
    else addLight(b.x + 2.5, b.y + 3.6, 1.8, null, 0.4);
    // 斷口冒煙（前幾天）
    const smk = Math.max(0, 1 - (G.t / DAY) / 3.5);
    if (smk > 0 && R() < 0.14 * smk) fxSmoke(b.x - 0.2, b.y + 1.5, 26, '#8a8496');
    if (smk > 0 && R() < 0.05 * smk) part(b.x + 0.1, b.y + 1.5, 20, (R() - .5) * .3, (R() - .5) * .3, 30, 0.6, '#ffb36b', 2, 'glow');
  },
  solar(b, dark, lit, z) {
    groundShadow(b.x, b.y, 2, 2, 8, 0.2);
    const g = boxGeom(b.x + .08, b.y + .08, 1.84, 1.84, 5);
    drawBox(g, '#3a4458', '#2c3446', '#1f2533');
    // 兩片傾斜面板
    for (const off of [0, 0.95]) {
      const p0 = w2s(b.x + 0.15, b.y + 0.12 + off, 9), p1 = w2s(b.x + 1.85, b.y + 0.12 + off, 9), p2 = w2s(b.x + 1.85, b.y + 0.88 + off, 16), p3 = w2s(b.x + 0.15, b.y + 0.88 + off, 16);
      const sun = sunFactor();
      const grd = ctx.createLinearGradient(p0[0], p0[1], p2[0], p2[1]);
      grd.addColorStop(0, '#1b2b55'); grd.addColorStop(0.5 + Math.sin(RT * 0.3) * 0.2, mix('#2b4a8a', '#9fd2ff', sun * 0.6)); grd.addColorStop(1, '#162344');
      fillPoly([p0, p1, p2, p3], grd);
      ctx.strokeStyle = 'rgba(160,200,255,0.35)'; ctx.lineWidth = 0.7 * z;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { const t = i / 4; ctx.moveTo(lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)); ctx.lineTo(lerp(p3[0], p2[0], t), lerp(p3[1], p2[1], t)); }
      const m0 = [(p0[0] + p3[0]) / 2, (p0[1] + p3[1]) / 2], m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
      ctx.strokeStyle = '#8a97a8'; ctx.lineWidth = 1 * z; poly([p0, p1, p2, p3]); ctx.stroke();
    }
    if (b.out > 1 && dark < 0.5) { const [sx, sy] = w2s(b.x + 1, b.y + 1, 14); addGlow(sx, sy, 10 * z, '#bfe6ff', 0.15 * (b.out / 12)); }
  },
  battery(b, dark, lit, z) {
    groundShadow(b.x, b.y, 1, 1, 22, 0.22);
    const g = boxGeom(b.x + .14, b.y + .14, .72, .72, 22);
    drawBox(g, '#d5dde6', '#aab6c4', '#7f8c9c');
    const lv = clamp(G.power.stored / G.power.cap, 0, 1);
    const f = g.left;
    for (let i = 0; i < 4; i++) {
      const on = lv > i / 4 + 0.05;
      const col = lv < 0.25 ? '#ff6b6b' : lv < 0.5 ? '#ffd166' : '#7cf0a0';
      fillPoly(frect(f, 0.25, 0.75, 0.15 + i * 0.18, 0.28 + i * 0.18), on ? col : '#3a4252');
      if (on && dark > 0.2) { const c = fpt(f, .5, .2 + i * .18); addGlow(c[0], c[1], 6 * z, col, 0.6); }
    }
    const [tx, ty] = w2s(b.x + .5, b.y + .5, 22);
    ctx.fillStyle = '#59636f'; ctx.fillRect(tx - 3 * z, ty - 3 * z, 6 * z, 3 * z);
  },
  biogen(b, dark, lit, z) {
    groundShadow(b.x, b.y, 2, 2, 30, 0.25);
    const g = boxGeom(b.x + .1, b.y + .1, 1.8, 1.8, 14);
    drawBox(g, '#4e5a4a', '#3c4639', '#2c342a');
    // 槽體
    const [cx, cy] = w2s(b.x + 1, b.y + 1, 14);
    const r = 15 * z, hh = 22 * z;
    ctx.fillStyle = '#5a6b55'; ctx.fillRect(cx - r, cy - hh, r * 2, hh);
    const grd = ctx.createLinearGradient(cx - r, 0, cx + r, 0); grd.addColorStop(0, '#7d9172'); grd.addColorStop(0.4, '#a9bd9a'); grd.addColorStop(1, '#3f4d3a');
    ctx.fillStyle = grd; ctx.fillRect(cx - r, cy - hh, r * 2, hh);
    ctx.fillStyle = '#c3d4b6'; ctx.beginPath(); ctx.ellipse(cx, cy - hh, r, r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a5845'; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI); ctx.fill();
    const on = b.out > 0;
    ctx.fillStyle = on ? '#8dff9a' : '#2a3a2a'; ctx.fillRect(cx - 3 * z, cy - hh * 0.7, 6 * z, hh * 0.45);
    if (on) { addGlow(cx, cy - hh * 0.5, 18 * z, '#8dff9a', 0.55); addLight(b.x + 1, b.y + 1, 2.4, '#8dff9a', 0.7); if (R() < 0.25) fxSmoke(b.x + 1.6, b.y + 0.5, 46, '#6a6a6a'); }
    // 煙囪
    const [qx, qy] = w2s(b.x + 1.6, b.y + 0.5, 14);
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(qx - 2.5 * z, qy - 30 * z, 5 * z, 30 * z);
  },
  dorm(b, dark, lit, z) {
    const H = 30;
    groundShadow(b.x, b.y, 2, 2, H, 0.26);
    const g = boxGeom(b.x + .06, b.y + .06, 1.88, 1.88, H);
    drawBox(g, '#e6edf3', '#c8d2dd', '#97a5b6');
    const occ = G.colonists.some(c => c.inside === b.id && !c.dead);
    for (const f of [g.left, g.right]) {
      fillPoly(frect(f, 0, 1, 0.55, 0.65), '#2fb4b0');
      for (const u of [0.2, 0.62]) {
        const wl = lit && (occ || dark > 0.3);
        fillPoly(frect(f, u, u + 0.18, 0.2, 0.45), wl ? mix('#5a6f86', '#ffe2a0', dark) : '#3d4b5d');
        if (wl && dark > 0.25) { const c = fpt(f, u + 0.09, 0.32); addGlow(c[0], c[1], 12 * z, '#ffd38a', 0.55); }
      }
      if (f.side === 'S' || f.side === 'E') fillPoly(frect(f, 0.43, 0.56, 0, 0.42), '#59677a');
    }
    // 圓弧屋頂
    const r1 = w2s(b.x + 1, b.y + .1, H + 7), r2 = w2s(b.x + 1, b.y + 1.9, H + 7);
    ctx.strokeStyle = '#f5f8fb'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.stroke();
    const vn = w2s(b.x + 1.45, b.y + 0.6, H);
    ctx.fillStyle = '#8a97a8'; ctx.fillRect(vn[0] - 3 * z, vn[1] - 7 * z, 6 * z, 7 * z);
    if (lit) addLight(b.x + 1, b.y + 1, 2.6, '#ffd38a', occ ? 0.8 : 0.45);
    if (occ && dark > 0.3 && Math.sin(RT * 1.3 + b.id) > 0.3) { const [zx, zy] = w2s(b.x + 1, b.y + 1, H + 16 + (RT * 6 % 10)); ctx.fillStyle = 'rgba(220,235,255,0.75)'; ctx.font = `700 ${Math.round(10 * z)}px sans-serif`; ctx.fillText('z', zx + 4 * z, zy); }
  },
  mess(b, dark, lit, z) {
    const H = 30;
    groundShadow(b.x, b.y, 2, 2, 14, 0.2);
    // 地板
    const g0 = boxGeom(b.x + .1, b.y + .1, 1.8, 1.8, 3);
    drawBox(g0, '#7a6a5c', '#5e5146', '#4a3f36');
    // 桌子
    const tb = boxGeom(b.x + .55, b.y + .7, .9, .6, 10, 3);
    drawBox(tb, '#c9a27a', '#a8835e', '#86684a');
    // 爐火
    const [fx_, fy_] = w2s(b.x + 1.55, b.y + 1.55, 6);
    const fl = 0.7 + 0.3 * Math.sin(RT * 9 + b.id);
    ctx.fillStyle = '#3a3030'; ctx.fillRect(fx_ - 5 * z, fy_ - 6 * z, 10 * z, 6 * z);
    if (lit) { addGlow(fx_, fy_ - 6 * z, 16 * z * fl, '#ffb347', 0.8); addLight(b.x + 1.5, b.y + 1.5, 3.2, '#ffb347', 0.85 * fl); if (R() < 0.1) fxSmoke(b.x + 1.55, b.y + 1.55, 14, '#cfc8c8'); }
    // 柱子與帆布頂
    for (const [px, py] of [[.15, .15], [1.85, .15], [1.85, 1.85], [.15, 1.85]]) { const a = w2s(b.x + px, b.y + py, 0), c = w2s(b.x + px, b.y + py, H); ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = 2.4 * z; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
    const t1 = w2s(b.x + .05, b.y + .05, H), t2 = w2s(b.x + 1.95, b.y + .05, H), t3 = w2s(b.x + 1.95, b.y + 1.95, H), t4 = w2s(b.x + .05, b.y + 1.95, H), tc = w2s(b.x + 1, b.y + 1, H + 10);
    const sides = [[t1, t2], [t2, t3], [t3, t4], [t4, t1]];
    sides.forEach(([a, c], i) => fillPoly([a, c, tc], i % 2 ? '#d9774a' : '#e88f5f'));
    ctx.strokeStyle = 'rgba(60,30,20,0.4)'; ctx.lineWidth = 0.8 * z; poly([t1, t2, t3, t4]); ctx.stroke();
  },
  storage(b, dark, lit, z) {
    groundShadow(b.x, b.y, 2, 2, 20, 0.22);
    const crates = [[.15, .15, .8, .8, 18, '#b5763f'], [1.05, .2, .75, .7, 14, '#2f7f86'], [.2, 1.05, .7, .75, 12, '#6d7a52'], [1.0, 1.0, .85, .85, 22, '#c98a4a']];
    crates.sort((a, c) => { const [ra, rb] = rotP(a[0], a[1]), [rc, rd] = rotP(c[0], c[1]); return (ra + rb) - (rc + rd); });
    for (const [x, y, w, h, H, col] of crates) {
      const g = boxGeom(b.x + x, b.y + y, w, h, H);
      drawBox(g, shade(col, 0.15), col, shade(col, -0.25));
      for (const f of [g.left, g.right]) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8 * z; const a = fpt(f, 0, 0.5), c = fpt(f, 1, 0.5); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
    }
  },
  medbay(b, dark, lit, z) {
    const H = 28;
    groundShadow(b.x, b.y, 2, 2, H, 0.25);
    const g = boxGeom(b.x + .08, b.y + .08, 1.84, 1.84, H);
    drawBox(g, '#f1f5f8', '#d4dde6', '#a5b2c0');
    for (const f of [g.left, g.right]) {
      const c = fpt(f, 0.5, 0.55);
      const s = 5 * z;
      ctx.fillStyle = lit ? '#3fd6c4' : '#5f8f8a';
      ctx.fillRect(c[0] - s * 0.35, c[1] - s, s * 0.7, s * 2); ctx.fillRect(c[0] - s, c[1] - s * 0.35, s * 2, s * 0.7);
      if (lit && dark > 0.2) addGlow(c[0], c[1], 14 * z, '#3fd6c4', 0.5);
      fillPoly(frect(f, 0.12, 0.3, 0.2, 0.42), lit ? mix('#6a8296', '#c8fff6', dark) : '#4a5866');
    }
    if (lit) addLight(b.x + 1, b.y + 1, 2.6, '#9ffff0', 0.7);
  },
  research(b, dark, lit, z) {
    const H = 24;
    groundShadow(b.x, b.y, 2, 2, H, 0.25);
    const g = boxGeom(b.x + .1, b.y + .1, 1.8, 1.8, H);
    drawBox(g, '#4a5670', '#3a4458', '#29303f');
    for (const f of [g.left, g.right]) {
      fillPoly(frect(f, 0.12, 0.88, 0.35, 0.75), lit ? '#0d2a3a' : '#1a2230');
      if (lit) for (let i = 0; i < 4; i++) { const y = 0.42 + i * 0.08; const w = 0.2 + ((b.id * 7 + i * 13 + Math.floor(RT * 2)) % 7) / 10; fillPoly(frect(f, 0.16, 0.16 + w * 0.6, y, y + 0.03), '#6fe3ff'); }
    }
    // 全像星球
    const [hx, hy] = w2s(b.x + 1, b.y + 1, H + 18);
    if (lit) {
      ctx.strokeStyle = 'rgba(111,227,255,0.85)'; ctx.lineWidth = 1 * z;
      ctx.beginPath(); ctx.arc(hx, hy, 10 * z, 0, TAU); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(hx, hy, 10 * z * Math.abs(Math.cos(RT + i * 1.05)), 10 * z, 0, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(hx, hy, 10 * z, 3.5 * z, 0, 0, TAU); ctx.stroke();
      addGlow(hx, hy, 22 * z, '#6fe3ff', 0.45 + (b.busy ? 0.3 : 0));
      const [bx2, by2] = w2s(b.x + 1, b.y + 1, H);
      ctx.fillStyle = 'rgba(111,227,255,0.15)'; ctx.beginPath(); ctx.moveTo(bx2 - 8 * z, by2); ctx.lineTo(hx - 10 * z, hy); ctx.lineTo(hx + 10 * z, hy); ctx.lineTo(bx2 + 8 * z, by2); ctx.fill();
      addLight(b.x + 1, b.y + 1, 2.4, '#6fe3ff', 0.6);
    }
  },
  workshop(b, dark, lit, z) {
    const H = 30;
    groundShadow(b.x, b.y, 2, 2, H, 0.26);
    const g = boxGeom(b.x + .06, b.y + .06, 1.88, 1.88, H);
    drawBox(g, '#8a8f99', '#6c727c', '#50555e');
    for (const f of [g.left, g.right]) {
      const door = frect(f, 0.2, 0.8, 0, 0.7);
      fillPoly(door, '#3a3f48');
      ctx.strokeStyle = 'rgba(160,170,185,0.35)'; ctx.lineWidth = 0.8 * z; ctx.beginPath();
      for (let i = 1; i < 7; i++) { const a = fpt(f, 0.2, i * 0.1), c = fpt(f, 0.8, i * 0.1); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); }
      ctx.stroke();
      fillPoly(frect(f, 0, 1, 0.82, 0.9), '#f2a03a');
      if (b.busy && lit) { const c = fpt(f, 0.5, 0.3); addGlow(c[0], c[1], 16 * z, '#ffcf6b', 0.5 + 0.3 * Math.sin(RT * 20)); }
    }
    // 吊臂
    const a = w2s(b.x + .4, b.y + .4, H), c = w2s(b.x + .4, b.y + .4, H + 22), e = w2s(b.x + 1.5, b.y + 1.1, H + 22);
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2.2 * z; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0], e[1] + 14 * z + Math.sin(RT) * 2 * z); ctx.stroke();
    if (lit) addLight(b.x + 1, b.y + 1, 2.2, '#ffcf6b', b.busy ? 0.8 : 0.4);
  },
  greenhouse(b, dark, lit, z) {
    const H = 34;
    groundShadow(b.x, b.y, 3, 2, 18, 0.18);
    const g0 = boxGeom(b.x + .06, b.y + .06, 2.88, 1.88, 5);
    drawBox(g0, '#5a4a3a', '#6b5b4a', '#4a3e32');
    // 作物
    const grow = b.grow / 100;
    const glit = lit && !(G.flags.ghDark > G.t);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const [px, py] = w2s(b.x + 0.4 + i * 1.05, b.y + 0.3 + j * 0.42, 5);
      const s = (2.5 + grow * 5.5) * z;
      ctx.fillStyle = mix('#3f8a4a', '#8fe08a', grow); ctx.beginPath(); ctx.ellipse(px, py - s * 0.5, s, s * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = mix('#2c6a36', '#5fb05a', grow); ctx.beginPath(); ctx.ellipse(px - s * 0.3, py - s * 0.6, s * 0.5, s * 0.4, 0, 0, TAU); ctx.fill();
    }
    // 拱形玻璃
    const ribs = 5;
    const shell = [];
    for (let i = 0; i <= ribs; i++) {
      const t = i / ribs;
      const pts = [];
      for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; pts.push(w2s(b.x + .06 + t * 2.88, b.y + 1 - Math.cos(a) * 0.94, 5 + Math.sin(a) * (H - 5))); }
      shell.push(pts);
    }
    ctx.fillStyle = glit && dark > 0.2 ? 'rgba(200,120,255,0.18)' : 'rgba(190,235,255,0.16)';
    ctx.beginPath(); const s0 = shell[0], s1 = shell[ribs];
    ctx.moveTo(s0[0][0], s0[0][1]); for (const p of s0) ctx.lineTo(p[0], p[1]); for (let i = s1.length - 1; i >= 0; i--) ctx.lineTo(s1[i][0], s1[i][1]); ctx.closePath(); ctx.fill();
    // 上緣
    ctx.strokeStyle = 'rgba(220,245,255,0.6)'; ctx.lineWidth = 1.2 * z;
    for (const pts of shell) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.beginPath(); for (let k = 0; k <= 8; k++) { const p = shell.map(s => s[k]); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[ribs][0], p[ribs][1]); } ctx.stroke();
    const top = shell[Math.floor(ribs / 2)][4];
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(top[0] - 10 * z, top[1] + 6 * z, 18 * z, 5 * z, -0.4, 0, TAU); ctx.fill();
    if (glit) { addLight(b.x + 1.5, b.y + 1, 3.2, '#c58bff', 0.8); addGlow(top[0], top[1] + 14 * z, 40 * z, '#b77bff', 0.18 + dark * 0.4); }
    // 生長進度
    if (b.grow > 0) { const [sx, sy] = w2s(b.x + 1.5, b.y + 1, H + 12); if (CAM.z > 0.8 && (UI.sel && UI.sel.o === b)) bar(sx, sy, 34, grow, '#8fe08a'); }
  },
  antenna(b, dark, lit, z) {
    groundShadow(b.x, b.y, 2, 2, 40, 0.18);
    const g = boxGeom(b.x + .3, b.y + .3, 1.4, 1.4, 12);
    drawBox(g, '#8a97a8', '#6c7888', '#4f5a68');
    const base = w2s(b.x + 1, b.y + 1, 12);
    const H = 92 * z;
    ctx.strokeStyle = '#c9d3de'; ctx.lineWidth = 1.4 * z;
    const lx = 9 * z;
    ctx.beginPath();
    ctx.moveTo(base[0] - lx, base[1]); ctx.lineTo(base[0], base[1] - H); ctx.lineTo(base[0] + lx, base[1]);
    for (let i = 1; i < 7; i++) { const t = i / 7; const w = lx * (1 - t); const y = base[1] - H * t; ctx.moveTo(base[0] - w, y); ctx.lineTo(base[0] + w, y - H / 14); ctx.moveTo(base[0] + w, y); ctx.lineTo(base[0] - w, y - H / 14); }
    ctx.stroke();
    // 碟
    const dy = base[1] - H * 0.62;
    ctx.fillStyle = '#e1e8ef'; ctx.beginPath(); ctx.ellipse(base[0] + 7 * z, dy, 13 * z, 8 * z, -0.6 + Math.sin(RT * 0.3) * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a97a8'; ctx.stroke();
    const blink = Math.sin(RT * 2.4) > 0.5;
    ctx.fillStyle = blink ? '#ff4d4d' : '#5a1a1a'; ctx.beginPath(); ctx.arc(base[0], base[1] - H - 2 * z, 2.6 * z, 0, TAU); ctx.fill();
    if (blink && lit) addGlow(base[0], base[1] - H - 2 * z, 18 * z, '#ff4d4d', 0.8);
    if (lit && G.tech.done.signal) { ctx.strokeStyle = `rgba(127,233,255,${0.5 - (RT % 1.5) / 3})`; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.arc(base[0] + 7 * z, dy, 10 * z + (RT % 1.5) * 20 * z, -1.2, 0.2); ctx.stroke(); }
  },
  lamp(b, dark, lit, z) {
    const on = lit && isNight();
    const [bx, by] = w2s(b.x + .5, b.y + .5, 0);
    ctx.fillStyle = 'rgba(6,6,16,0.3)'; ctx.beginPath(); ctx.ellipse(bx, by, 7 * z, 3.5 * z, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#59636f'; ctx.fillRect(bx - 4 * z, by - 5 * z, 8 * z, 5 * z);
    ctx.strokeStyle = '#a9b4c2'; ctx.lineWidth = 2.2 * z; ctx.beginPath(); ctx.moveTo(bx, by - 4 * z); ctx.lineTo(bx, by - 54 * z); ctx.stroke();
    ctx.fillStyle = '#d9e2ec'; ctx.beginPath(); ctx.moveTo(bx - 7 * z, by - 52 * z); ctx.lineTo(bx + 7 * z, by - 52 * z); ctx.lineTo(bx + 4 * z, by - 58 * z); ctx.lineTo(bx - 4 * z, by - 58 * z); ctx.fill();
    ctx.fillStyle = on ? '#fff3c4' : '#6b6f78'; ctx.fillRect(bx - 5 * z, by - 52 * z, 10 * z, 2.5 * z);
    if (on) { addLight(b.x + .5, b.y + .5, BUILD.lamp.light, '#ffe9a8', 1); addGlow(bx, by - 50 * z, 26 * z, '#ffe9a8', 0.9); ctx.fillStyle = 'rgba(255,240,190,0.08)'; ctx.beginPath(); ctx.moveTo(bx - 6 * z, by - 50 * z); ctx.lineTo(bx + 6 * z, by - 50 * z); ctx.lineTo(bx + 34 * z, by + 6 * z); ctx.lineTo(bx - 34 * z, by + 6 * z); ctx.fill(); }
  },
  fence(b, dark, lit, z) { drawWallLike(b, 14, '#8a6a9a', '#6d4f7d', '#c9a6e0', false); },
  wall(b, dark, lit, z) { drawWallLike(b, 24, '#9aa6b5', '#7a8696', '#d0d8e2', true); },
  turret(b, dark, lit, z) {
    groundShadow(b.x, b.y, 1, 1, 14, 0.25);
    const g = boxGeom(b.x + .12, b.y + .12, .76, .76, 12);
    drawBox(g, '#6a7486', '#4f5868', '#3a4250');
    const [cx, cy] = w2s(b.x + .5, b.y + .5, 12);
    const ang = b.aim != null ? b.aim : RT * 0.4 + b.id;
    const [sdx, sdy] = dirToScreen(Math.cos(ang), Math.sin(ang));
    const l = Math.hypot(sdx, sdy) || 1;
    ctx.fillStyle = '#8590a2'; ctx.beginPath(); ctx.ellipse(cx, cy - 4 * z, 10 * z, 6 * z, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b313c'; ctx.lineWidth = 4 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - 6 * z); ctx.lineTo(cx + sdx / l * 16 * z, cy - 6 * z + sdy / l * 16 * z); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#c3ccd8'; ctx.beginPath(); ctx.arc(cx, cy - 7 * z, 5.5 * z, 0, TAU); ctx.fill();
    const on = G.power.ok && !G.tide.blackout;
    ctx.fillStyle = on ? (b.firing ? '#ff6b6b' : '#7fe9ff') : '#444'; ctx.beginPath(); ctx.arc(cx, cy - 7 * z, 2 * z, 0, TAU); ctx.fill();
    if (on) addGlow(cx, cy - 7 * z, 10 * z, b.firing ? '#ff6b6b' : '#7fe9ff', 0.6);
  },
};
function drawWallLike(b, H, cTop, cSide, cHi, metal) {
  const z = CAM.z;
  const x = b.x, y = b.y;
  const nb = (dx, dy) => { const o = bAt(x + dx, y + dy); return o && (o.type === 'fence' || o.type === 'wall') && o.done; };
  // 中柱
  const post = boxGeom(x + .36, y + .36, .28, .28, H + 2);
  const parts = [];
  if (nb(1, 0)) parts.push([x + .5, y + .4, .5, .2]);
  if (nb(-1, 0)) parts.push([x, y + .4, .5, .2]);
  if (nb(0, 1)) parts.push([x + .4, y + .5, .2, .5]);
  if (nb(0, -1)) parts.push([x + .4, y, .2, .5]);
  const all = parts.map(p => ({ p, d: (() => { const [a, c] = rotP(p[0] + p[2] / 2, p[1] + p[3] / 2); return a + c; })() }));
  all.push({ post: true, d: (() => { const [a, c] = rotP(x + .5, y + .5); return a + c; })() });
  all.sort((a, c) => a.d - c.d);
  for (const o of all) {
    if (o.post) { drawBox(post, shade(cTop, 0.1), cSide, shade(cSide, -0.25)); continue; }
    const [px, py, pw, ph] = o.p;
    const g = boxGeom(px, py, pw, ph, H);
    drawBox(g, cTop, cSide, shade(cSide, -0.2));
    if (!metal) for (const f of [g.left, g.right]) { ctx.strokeStyle = 'rgba(255,220,255,0.25)'; ctx.lineWidth = 0.8 * z; ctx.beginPath(); for (const v of [0.3, 0.6]) { const a = fpt(f, 0, v), c = fpt(f, 1, v); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); } ctx.stroke(); }
  }
  if (b.hp < b.hpMax) { const [sx, sy] = w2s(x + .5, y + .5, H + 10); bar(sx, sy, 20 * Math.min(1.4, z), b.hp / b.hpMax, b.hp < b.hpMax * .35 ? '#ff6b6b' : '#ffd166'); }
}

/* ---------- 地圖節點 ---------- */
function drawNode(n, dark) {
  const z = CAM.z;
  const [sx, sy] = w2s(n.x + .5, n.y + .5);
  const v = n.var;
  const gl = 0.15 + 0.85 * dark;
  switch (n.type) {
    case 'tree': {
      const hgt = (48 + (v % 23)) * z, cw = (22 + (v % 9)) * z, sway = Math.sin(RT * 0.8 + v) * 1.5 * z;
      ctx.fillStyle = 'rgba(6,6,16,0.32)'; ctx.beginPath(); ctx.ellipse(sx + 8 * z, sy + 2 * z, cw * 1.05, cw * 0.4, 0, 0, TAU); ctx.fill();
      // 菌柄
      const grd = ctx.createLinearGradient(sx - 5 * z, 0, sx + 5 * z, 0); grd.addColorStop(0, '#e6dcf5'); grd.addColorStop(1, '#8f7fb5');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(sx - 5.5 * z, sy); ctx.quadraticCurveTo(sx - 3 * z, sy - hgt * 0.5, sx - 2.4 * z + sway, sy - hgt + 4 * z); ctx.lineTo(sx + 2.4 * z + sway, sy - hgt + 4 * z); ctx.quadraticCurveTo(sx + 3 * z, sy - hgt * 0.5, sx + 5.5 * z, sy); ctx.closePath(); ctx.fill();
      // 傘蓋底部（皺褶）
      const cy = sy - hgt;
      ctx.fillStyle = '#4a2a6a'; ctx.beginPath(); ctx.ellipse(sx + sway, cy + 3 * z, cw, cw * 0.36, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#7ff0ff', 0.25 + 0.6 * dark); ctx.lineWidth = 0.9 * z;
      ctx.beginPath(); for (let i = -4; i <= 4; i++) { ctx.moveTo(sx + sway, cy + 3 * z); ctx.lineTo(sx + sway + i * cw / 4.6, cy + 3 * z + cw * 0.3 * Math.cos(i / 5)); } ctx.stroke();
      addGlow(sx + sway, cy + 5 * z, cw * 1.3, '#58f0ff', 0.22 * gl);
      // 傘蓋頂
      const capG = ctx.createRadialGradient(sx + sway - cw * 0.35, cy - cw * 0.45, 1, sx + sway, cy, cw * 1.15);
      const hue = v % 3 === 0 ? ['#e07bf0', '#9b3fc6', '#5a2080'] : v % 3 === 1 ? ['#ff8fc8', '#c74a9a', '#6a2058'] : ['#b88bff', '#7a4ad6', '#3e2480'];
      capG.addColorStop(0, hue[0]); capG.addColorStop(0.5, hue[1]); capG.addColorStop(1, hue[2]);
      ctx.fillStyle = capG;
      ctx.beginPath(); ctx.ellipse(sx + sway, cy, cw, cw * 0.36, 0, Math.PI, TAU); ctx.ellipse(sx + sway, cy, cw, cw * 0.62, 0, TAU, Math.PI, true); ctx.fill();
      // 斑點
      ctx.fillStyle = 'rgba(255,240,255,0.55)';
      for (let i = 0; i < 4; i++) { const a = (v * 13 + i * 71) % 100 / 100; ctx.beginPath(); ctx.arc(sx + sway + (a - .5) * cw * 1.3, cy - cw * (0.18 + (i % 2) * 0.2), (1.6 + (i % 2)) * z, 0, TAU); ctx.fill(); }
      break;
    }
    case 'bush': {
      const ripe = n.amt > 0;
      ctx.fillStyle = 'rgba(6,6,16,0.3)'; ctx.beginPath(); ctx.ellipse(sx + 3 * z, sy + 1 * z, 15 * z, 6 * z, 0, 0, TAU); ctx.fill();
      const blobs = [[-7, -6, 8], [6, -7, 8], [0, -12, 9], [-2, -4, 7]];
      for (const [bx, by, r] of blobs) { const g2 = ctx.createRadialGradient(sx + bx * z - 2 * z, sy + by * z - 3 * z, 1, sx + bx * z, sy + by * z, r * z); g2.addColorStop(0, '#4f8f86'); g2.addColorStop(1, '#1f4a4a'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sx + bx * z, sy + by * z, r * z, 0, TAU); ctx.fill(); }
      if (ripe) for (let i = 0; i < 6; i++) {
        const fx_ = sx + ((v * 7 + i * 37) % 22 - 11) * z, fy_ = sy - (4 + (v * 3 + i * 17) % 12) * z;
        const pulse = 0.7 + 0.3 * Math.sin(RT * 2 + i + v);
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(fx_, fy_, 2.6 * z, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2c4'; ctx.beginPath(); ctx.arc(fx_ - .8 * z, fy_ - .8 * z, 0.9 * z, 0, TAU); ctx.fill();
        addGlow(fx_, fy_, 8 * z, '#ffb347', 0.5 * gl * pulse);
      }
      break;
    }
    case 'rock': {
      const k = 0.6 + n.amt / (n.max || 3) * 0.4;
      ctx.fillStyle = 'rgba(6,6,16,0.32)'; ctx.beginPath(); ctx.ellipse(sx + 4 * z, sy + 2 * z, 22 * z * k, 8 * z * k, 0, 0, TAU); ctx.fill();
      const rocks = [[-8, 0, 14], [7, 2, 11], [0, -3, 17]];
      for (const [ox, oy, r] of rocks) {
        const R0 = r * z * k, x0 = sx + ox * z * k, y0 = sy + oy * z * k;
        const pts = [[x0 - R0, y0], [x0 - R0 * 0.7, y0 - R0 * 0.9], [x0 + R0 * 0.1, y0 - R0 * 1.25], [x0 + R0 * 0.85, y0 - R0 * 0.7], [x0 + R0, y0], [x0 + R0 * 0.3, y0 + R0 * 0.35], [x0 - R0 * 0.5, y0 + R0 * 0.3]];
        fillPoly(pts, '#454b5e');
        fillPoly([pts[0], pts[1], pts[2], [x0 + R0 * 0.05, y0 - R0 * 0.35]], '#6a7290');
        fillPoly([pts[2], pts[3], pts[4], [x0 + R0 * 0.05, y0 - R0 * 0.35]], '#535a72');
        ctx.fillStyle = '#d8a35a'; ctx.beginPath(); ctx.arc(x0 + R0 * 0.25, y0 - R0 * 0.5, 1.6 * z, 0, TAU); ctx.arc(x0 - R0 * 0.3, y0 - R0 * 0.2, 1.2 * z, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'crystal': {
      const res = G.tide.day ? clamp(1 - (G.tide.day - G.t / DAY) / 8, 0.15, 1) : 0.2;
      const pulse = 0.5 + 0.5 * Math.sin(RT * (1.2 + res * 5) + v);
      ctx.fillStyle = 'rgba(6,6,16,0.28)'; ctx.beginPath(); ctx.ellipse(sx + 3 * z, sy + 1 * z, 14 * z, 5 * z, 0, 0, TAU); ctx.fill();
      const shards = n.amt >= 2 ? [[-6, 26, -0.25, '#ff6fcf'], [5, 34, 0.12, '#59e6ff'], [-1, 20, 0.35, '#ff9be0'], [9, 16, 0.5, '#9ff5ff']] : [[-3, 22, -0.2, '#ff6fcf'], [5, 16, 0.3, '#59e6ff']];
      for (const [ox, hh, tilt, col] of shards) {
        const bx = sx + ox * z, by = sy, H = hh * z, w = 4.5 * z;
        const tx = bx + Math.sin(tilt) * H, ty = by - Math.cos(tilt) * H;
        ctx.fillStyle = rgba(col, 0.82);
        ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(tx - w * 0.7, ty + w); ctx.lineTo(tx, ty - w * 0.4); ctx.lineTo(tx + w * 0.7, ty + w); ctx.lineTo(bx + w, by); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(bx - w * 0.3, by); ctx.lineTo(tx - w * 0.2, ty + w); ctx.lineTo(tx, ty - w * 0.4); ctx.closePath(); ctx.fill();
        addGlow((bx + tx) / 2, (by + ty) / 2, H * 0.9, col, (0.15 + 0.6 * dark) * (0.5 + pulse * 0.5) * (0.6 + res * 0.6));
      }
      if (dark > 0.3) addLight(n.x + .5, n.y + .5, 1.2 + res, null, 0.5 * pulse);
      break;
    }
    case 'debris': {
      ctx.fillStyle = 'rgba(6,6,16,0.3)'; ctx.beginPath(); ctx.ellipse(sx + 3 * z, sy + 1 * z, 18 * z, 6 * z, 0, 0, TAU); ctx.fill();
      const a = (v % 7) / 7 * 0.8 - 0.4;
      const plate = (ox, oy, w, h2, rot, col) => {
        ctx.save(); ctx.translate(sx + ox * z, sy + oy * z); ctx.rotate(rot);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-w * z, 0); ctx.lineTo(-w * 0.6 * z, -h2 * z); ctx.lineTo(w * 0.8 * z, -h2 * 0.8 * z); ctx.lineTo(w * z, -2 * z); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,24,34,0.6)'; ctx.lineWidth = 0.9 * z; ctx.stroke();
        ctx.restore();
      };
      plate(-5, 2, 11, 9, a, '#aab6c4');
      plate(6, 0, 9, 14, -a - 0.3, '#c9d3de');
      ctx.fillStyle = '#f2a03a'; ctx.save(); ctx.translate(sx + 6 * z, sy); ctx.rotate(-a - 0.3); ctx.fillRect(-4 * z, -11 * z, 3 * z, 8 * z); ctx.fillStyle = '#1d1f26'; ctx.fillRect(-1 * z, -11 * z, 3 * z, 8 * z); ctx.restore();
      ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 1.4 * z; ctx.beginPath(); ctx.moveTo(sx - 2 * z, sy - 3 * z); ctx.bezierCurveTo(sx + 4 * z, sy - 12 * z, sx + 12 * z, sy - 2 * z, sx + 14 * z, sy - 6 * z); ctx.stroke();
      if ((v % 4 === 0) && G.t / DAY < 2.5 && R() < 0.03) fxSmoke(n.x + .5, n.y + .5, 8, '#5a5462');
      break;
    }
    case 'crate': {
      const g = boxGeom(n.x + .12, n.y + .18, .76, .64, 20);
      groundShadow(n.x + .12, n.y + .18, .76, .64, 20, 0.22);
      drawBox(g, '#e08a4a', '#c06c34', '#8a4c26');
      for (const f of [g.left, g.right]) { ctx.strokeStyle = 'rgba(40,20,10,0.4)'; ctx.lineWidth = 0.9 * z; ctx.beginPath(); for (const u of [0.25, 0.5, 0.75]) { const a = fpt(f, u, 0), c = fpt(f, u, 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); } ctx.stroke(); }
      const tp = w2s(n.x + .5, n.y + .5, 20);
      ctx.fillStyle = '#2f7f86'; ctx.beginPath(); ctx.ellipse(tp[0], tp[1], 7 * z, 3 * z, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'ruin': {
      ctx.fillStyle = 'rgba(6,6,16,0.35)'; ctx.beginPath(); ctx.ellipse(sx + 10 * z, sy + 3 * z, 20 * z, 7 * z, 0, 0, TAU); ctx.fill();
      const H = 70 * z, w = 11 * z;
      const grd = ctx.createLinearGradient(sx - w, 0, sx + w, 0); grd.addColorStop(0, '#2c2840'); grd.addColorStop(0.5, '#1a1728'); grd.addColorStop(1, '#0f0d18');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(sx - w, sy); ctx.lineTo(sx - w * 0.85, sy - H); ctx.lineTo(sx, sy - H - 8 * z); ctx.lineTo(sx + w * 0.85, sy - H); ctx.lineTo(sx + w, sy); ctx.closePath(); ctx.fill();
      const pulse = 0.5 + 0.5 * Math.sin(RT * 1.4);
      ctx.strokeStyle = rgba('#ff7bd8', 0.35 + 0.5 * pulse); ctx.lineWidth = 1.3 * z;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const y = sy - H * (0.15 + i * 0.13); ctx.moveTo(sx - w * 0.5, y); ctx.lineTo(sx + w * 0.1 * ((i % 3) - 1), y - 4 * z); ctx.lineTo(sx + w * 0.5, y); }
      ctx.stroke();
      ctx.strokeStyle = rgba('#7ff0ff', 0.3 + 0.4 * (1 - pulse)); ctx.beginPath(); ctx.arc(sx, sy - H * 0.82, 4 * z, 0, TAU); ctx.stroke();
      addGlow(sx, sy - H * 0.5, 30 * z, '#ff7bd8', (0.15 + dark * 0.5) * pulse);
      addLight(n.x + .5, n.y + .5, 2, null, 0.6 * pulse);
      break;
    }
    case 'nest': {
      ctx.fillStyle = '#1a0d14'; ctx.beginPath(); ctx.ellipse(sx, sy, 16 * z, 8 * z, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a2028'; ctx.lineWidth = 3 * z; ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.fillStyle = '#5a2a30'; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 15 * z, sy + Math.sin(a) * 7.5 * z); ctx.lineTo(sx + Math.cos(a) * 20 * z, sy + Math.sin(a) * 10 * z - 6 * z); ctx.lineTo(sx + Math.cos(a + .2) * 15 * z, sy + Math.sin(a + .2) * 7.5 * z); ctx.fill(); }
      if (Math.sin(RT * 0.7 + v) > 0.85) { ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(sx - 3 * z, sy - 1 * z, 1.2 * z, 0, TAU); ctx.arc(sx + 3 * z, sy - 1 * z, 1.2 * z, 0, TAU); ctx.fill(); addGlow(sx, sy, 10 * z, '#ff5a4a', 0.5); }
      break;
    }
  }
  if (n.marked) {
    const bob = Math.sin(RT * 3) * 2 * z;
    ctx.fillStyle = '#ffd166'; ctx.strokeStyle = 'rgba(10,12,24,0.8)'; ctx.lineWidth = 1.5;
    const ty = sy - (n.type === 'tree' ? 80 : n.type === 'rock' || n.type === 'crystal' ? 40 : 28) * z + bob;
    ctx.beginPath(); ctx.moveTo(sx, ty + 7 * z); ctx.lineTo(sx - 5 * z, ty); ctx.lineTo(sx + 5 * z, ty); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

/* ---------- 人物 ---------- */
function drawPerson(p, sx, sy, z, o = {}) {
  const look = p.look, suit = SUIT[p.suit] || SUIT.colon;
  const skin = SKIN[look.skin] || SKIN[1];
  const t = o.t || 0;
  const front = o.front !== false;
  const flip = o.flip ? -1 : 1;
  const act = o.act || 'idle';
  const walk = o.moving ? o.walk : 0;
  const s = z;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(flip * s, s);
  if (o.lying) { ctx.rotate(-Math.PI / 2 * 0.95); ctx.translate(10, -4); }
  if (!o.lying && !o.noShadow) { ctx.fillStyle = 'rgba(6,6,16,0.32)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.6, 0, 0, TAU); ctx.fill(); }
  const sit = act === 'sad';
  const bob = o.moving ? Math.abs(Math.sin(walk * 1.0)) * 1.4 : (act === 'idle' || act === 'watch' ? Math.sin(t * 2) * 0.4 : 0);
  ctx.translate(0, -bob + (sit ? 6 : 0));
  const sw = o.moving ? Math.sin(walk) * 3.2 : 0;
  // 腿
  const legC = shade(suit.c, -0.25);
  if (!sit) {
    ctx.fillStyle = legC;
    rr(-5 + sw * 0.35, -12, 4.2, 12 - Math.max(0, sw) * 0.3, 1.8); rr(0.8 - sw * 0.35, -12, 4.2, 12 - Math.max(0, -sw) * 0.3, 1.8);
    ctx.fillStyle = '#22252e'; rr(-5.2 + sw * 0.35, -3, 4.6, 3, 1.2); rr(0.6 - sw * 0.35, -3, 4.6, 3, 1.2);
  } else { ctx.fillStyle = legC; rr(-6, -6, 12, 5, 2); ctx.fillStyle = '#22252e'; rr(4, -5, 4, 4, 1.2); }
  // 背包（背面）
  if (!front) { ctx.fillStyle = '#4a5160'; rr(-6, -25, 12, 12, 2.5); ctx.fillStyle = '#6a7384'; rr(-5, -24, 10, 3, 1); }
  // 軀幹
  const tg = ctx.createLinearGradient(-7, -26, 7, -11);
  tg.addColorStop(0, shade(suit.c, 0.18)); tg.addColorStop(1, shade(suit.c, -0.15));
  ctx.fillStyle = tg; rr(-7.2, -26, 14.4, 15.5, 4);
  ctx.fillStyle = suit.trim; ctx.fillRect(-7, -14.5, 14, 1.6);
  if (front) {
    ctx.fillStyle = suit.trim; ctx.beginPath(); ctx.moveTo(-3.5, -26); ctx.lineTo(0, -22.5); ctx.lineTo(3.5, -26); ctx.lineTo(2, -26); ctx.lineTo(0, -24); ctx.lineTo(-2, -26); ctx.fill();
    ctx.fillStyle = p.hue || '#7fe3ff'; ctx.fillRect(2.2, -21, 3, 2.2);
  }
  // 手臂
  const arm = (side, ang, len = 10.5) => {
    ctx.save(); ctx.translate(side * 7.4, -24.5); ctx.rotate(ang * side);
    ctx.fillStyle = shade(suit.c, side > 0 ? -0.08 : 0.05); rr(-1.8, 0, 3.6, len, 1.8);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, len + 0.6, 1.9, 0, TAU); ctx.fill();
    ctx.restore();
  };
  let aL = 0.08 + (o.moving ? -sw * 0.09 : 0), aR = 0.08 + (o.moving ? sw * 0.09 : 0);
  const sp = t * 7;
  if (act === 'hammer' || act === 'pickaxe' || act === 'chop') aR = -1.6 + Math.abs(Math.sin(sp)) * 2.0;
  else if (act === 'pick' || act === 'type') { aL = -0.7 + Math.sin(sp) * 0.15; aR = -0.7 - Math.sin(sp) * 0.15; }
  else if (act === 'eat') { aR = -1.9 + Math.max(0, Math.sin(t * 2.5)) * 0.6; }
  else if (act === 'talk') { aR = -0.6 + Math.sin(t * 4) * 0.5; }
  else if (act === 'aim' || act === 'watch') { aR = -1.25; aL = -1.0; }
  else if (sit) { aL = -0.5; aR = -0.5; }
  if (o.carry) { aL = -1.2; aR = -1.2; }
  arm(-1, aL);
  // 工具
  if (act === 'hammer' || act === 'pickaxe' || act === 'chop') {
    ctx.save(); ctx.translate(7.4, -24.5); ctx.rotate(aR); ctx.translate(0, 11);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-0.8, -1, 1.6, 7);
    ctx.fillStyle = act === 'chop' ? '#c9d3de' : '#8a96a8'; if (act === 'pickaxe') { ctx.beginPath(); ctx.moveTo(-4.5, 6); ctx.quadraticCurveTo(0, 3.5, 4.5, 6); ctx.lineTo(0, 7.5); ctx.fill(); } else ctx.fillRect(-2.6, 5, 5.2, 3.2);
    ctx.restore();
  }
  if ((o.weapon && (act === 'aim' || act === 'watch')) || (o.weapon && !o.carry)) {
    ctx.save(); ctx.translate(2, -19); ctx.rotate(act === 'aim' || act === 'watch' ? -0.1 : 0.9);
    ctx.fillStyle = '#2b2f38'; ctx.fillRect(-2, -1.4, 16, 2.8); ctx.fillStyle = '#5a6272'; ctx.fillRect(-3, -1.6, 6, 3.4); ctx.fillStyle = '#7fe9ff'; ctx.fillRect(9, -2.2, 2, 1);
    ctx.restore();
  }
  arm(1, aR);
  // 搬運的箱子
  if (o.carry) {
    const col = RES[o.carry] ? RES[o.carry].color : '#c98a4a';
    ctx.fillStyle = shade(col, -0.3); rr(-6.5, -27, 13, 9, 1.5); ctx.fillStyle = col; rr(-6.5, -27, 13, 3, 1.5);
  }
  // 頭
  const hy = -32;
  if (front) { ctx.fillStyle = shade(skin, -0.15); ctx.beginPath(); ctx.arc(-7, hy + 0.5, 1.8, 0, TAU); ctx.arc(7, hy + 0.5, 1.8, 0, TAU); ctx.fill(); }
  const hg = ctx.createRadialGradient(-2, hy - 3, 1, 0, hy, 8);
  hg.addColorStop(0, shade(skin, 0.12)); hg.addColorStop(1, shade(skin, -0.12));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, hy, 7.2, 0, TAU); ctx.fill();
  drawHair(look, hy, front, 'back');
  if (front) {
    const blink = (Math.sin(t * 0.9 + (p.id || 0)) > 0.97);
    const eyeY = hy + 0.6;
    if (act === 'sleep' || o.lying || blink) { ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3.6, eyeY); ctx.lineTo(-1.6, eyeY); ctx.moveTo(1.6, eyeY); ctx.lineTo(3.6, eyeY); ctx.stroke(); }
    else { ctx.fillStyle = '#1e1a22'; ctx.beginPath(); ctx.ellipse(-2.6, eyeY, 1.05, 1.35, 0, 0, TAU); ctx.ellipse(2.6, eyeY, 1.05, 1.35, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-2.9, eyeY - 0.9, 0.6, 0.6); ctx.fillRect(2.3, eyeY - 0.9, 0.6, 0.6); }
    if (z > 0.95) {
      ctx.strokeStyle = shade(skin, -0.35); ctx.lineWidth = 0.8; ctx.beginPath();
      if (act === 'sad') { ctx.arc(0, hy + 5.5, 1.6, Math.PI * 1.15, Math.PI * 1.85); } else { ctx.arc(0, hy + 3.2, 1.5, 0.2, Math.PI - 0.2); }
      ctx.stroke();
    }
    if (look.acc.includes('freckles')) { ctx.fillStyle = 'rgba(150,80,50,0.5)'; for (const [fx_, fy_] of [[-3.8, 2.4], [-3, 3], [3, 2.4], [3.8, 3]]) ctx.fillRect(fx_, hy + fy_, 0.7, 0.7); }
    if (look.acc.includes('scar')) { ctx.strokeStyle = 'rgba(190,90,90,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(3.4, hy - 1.5); ctx.lineTo(5, hy + 2.5); ctx.stroke(); }
    if (look.acc.includes('beard')) { ctx.fillStyle = look.beard || look.hc; ctx.beginPath(); ctx.moveTo(-6.4, hy + 1); ctx.quadraticCurveTo(-5, hy + 8.5, 0, hy + 8.2); ctx.quadraticCurveTo(5, hy + 8.5, 6.4, hy + 1); ctx.lineTo(4.5, hy + 2.5); ctx.quadraticCurveTo(0, hy + 6, -4.5, hy + 2.5); ctx.closePath(); ctx.fill(); }
    if (look.acc.includes('stubble')) { ctx.fillStyle = 'rgba(40,30,30,0.22)'; ctx.beginPath(); ctx.ellipse(0, hy + 4.5, 5.2, 3, 0, 0, Math.PI); ctx.fill(); }
    if (look.acc.includes('mustache')) { ctx.fillStyle = look.beard || look.hc; ctx.beginPath(); ctx.ellipse(-1.4, hy + 2.6, 1.8, 0.8, 0.2, 0, TAU); ctx.ellipse(1.4, hy + 2.6, 1.8, 0.8, -0.2, 0, TAU); ctx.fill(); }
    if (look.acc.includes('glasses')) { ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 0.75; ctx.beginPath(); ctx.arc(-2.7, hy + 0.6, 2, 0, TAU); ctx.moveTo(4.7, hy + 0.6); ctx.arc(2.7, hy + 0.6, 2, 0, TAU); ctx.moveTo(-0.7, hy + 0.4); ctx.lineTo(0.7, hy + 0.4); ctx.stroke(); }
    if (look.acc.includes('earring')) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(-7, hy + 2.6, 0.9, 0, TAU); ctx.fill(); }
  }
  drawHair(look, hy, front, 'front');
  if (look.acc.includes('headband')) { ctx.fillStyle = p.hue || '#ff6b6b'; ctx.fillRect(-7.3, hy - 4.2, 14.6, 2); }
  if (look.acc.includes('goggles')) { ctx.fillStyle = '#3a3a44'; ctx.fillRect(-7.4, hy - 5.4, 14.8, 2.2); if (front) { ctx.fillStyle = '#7fd3ff'; ctx.beginPath(); ctx.arc(-2.8, hy - 4.3, 2.1, 0, TAU); ctx.arc(2.8, hy - 4.3, 2.1, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.7; ctx.stroke(); } }
  // 輪廓
  ctx.restore();
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }
function drawHair(look, hy, front, layer) {
  const c = look.hc, st = look.hair;
  ctx.fillStyle = c;
  const cap = (cov = 0.42) => { ctx.beginPath(); ctx.arc(0, hy, 7.6, Math.PI * (1 + 0.5 - cov - 0.5) - 0.05, Math.PI * (2 - 0.5 + cov + 0.5) + 0.05); ctx.closePath(); ctx.fill(); };
  const capF = () => { ctx.beginPath(); ctx.arc(0, hy, 7.7, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(4, hy - 2.5, 0, hy - 3); ctx.quadraticCurveTo(-4, hy - 2.5, -7.6, hy - 1); ctx.closePath(); ctx.fill(); };
  if (layer === 'back') {
    // 頭後方的長髮
    if (st === 3) { ctx.beginPath(); ctx.moveTo(-7.6, hy - 2); ctx.lineTo(-8, hy + 11); ctx.quadraticCurveTo(0, hy + 13, 8, hy + 11); ctx.lineTo(7.6, hy - 2); ctx.fill(); }
    if (st === 2 || st === 10) { ctx.beginPath(); ctx.moveTo(-8, hy - 2); ctx.lineTo(-8.2, hy + (st === 10 ? 6 : 5)); ctx.lineTo(8.2, hy + (st === 10 ? 3 : 5)); ctx.lineTo(8, hy - 2); ctx.fill(); }
    if (!front) {
      if (st !== 8) { ctx.beginPath(); ctx.arc(0, hy, 7.8, 0, TAU); ctx.fill(); }
      if (st === 4) { ctx.beginPath(); ctx.ellipse(0, hy + 7, 2.4, 6, 0, 0, TAU); ctx.fill(); }
      if (st === 5) { ctx.beginPath(); ctx.arc(0, hy - 6, 3.6, 0, TAU); ctx.fill(); }
      if (st === 6) { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(1, hy + 6 + i * 3.2, 2.2, 1.9, 0, 0, TAU); ctx.fill(); } }
      if (st === 13) { ctx.beginPath(); ctx.arc(-6, hy - 6, 3.2, 0, TAU); ctx.arc(6, hy - 6, 3.2, 0, TAU); ctx.fill(); }
      if (st === 10 && look.streak) { ctx.fillStyle = look.streak; ctx.fillRect(2, hy - 7, 2, 12); }
    }
    return;
  }
  if (!front) return;
  switch (st) {
    case 0: cap(0.3); break;
    case 1: capF(); ctx.beginPath(); ctx.moveTo(-7.6, hy - 1); ctx.quadraticCurveTo(-2, hy - 6, 6, hy - 3.5); ctx.lineTo(7.6, hy - 1); ctx.lineTo(7.4, hy - 4); ctx.arc(0, hy, 7.7, -0.4, Math.PI + 0.1, true); ctx.fill(); break;
    case 2: capF(); ctx.beginPath(); ctx.moveTo(-7.8, hy - 2); ctx.lineTo(-8, hy + 5); ctx.lineTo(-5.6, hy + 5); ctx.lineTo(-5.8, hy - 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(7.8, hy - 2); ctx.lineTo(8, hy + 5); ctx.lineTo(5.6, hy + 5); ctx.lineTo(5.8, hy - 2); ctx.fill(); break;
    case 3: capF(); ctx.beginPath(); ctx.moveTo(-7.8, hy - 2); ctx.lineTo(-8, hy + 10); ctx.lineTo(-5.8, hy + 10); ctx.lineTo(-5.9, hy - 1); ctx.fill(); ctx.beginPath(); ctx.moveTo(7.8, hy - 2); ctx.lineTo(8, hy + 10); ctx.lineTo(5.8, hy + 10); ctx.lineTo(5.9, hy - 1); ctx.fill(); break;
    case 4: capF(); ctx.beginPath(); ctx.ellipse(7.6, hy + 1, 1.8, 4.5, 0.4, 0, TAU); ctx.fill(); break;
    case 5: capF(); ctx.beginPath(); ctx.arc(0, hy - 7.5, 3.4, 0, TAU); ctx.fill(); break;
    case 6: capF(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-6.8 + i * 0.3, hy + 2 + i * 3, 2, 1.8, 0, 0, TAU); ctx.fill(); } break;
    case 7: for (let i = 0; i < 9; i++) { const a = Math.PI * (1.0 + i / 8); ctx.beginPath(); ctx.arc(Math.cos(a) * 6.8, hy + Math.sin(a) * 6.8, 3, 0, TAU); ctx.fill(); } break;
    case 8: ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-2, hy - 4.5, 2.4, 1.2, -0.4, 0, TAU); ctx.fill(); break;
    case 9: capF(); for (let i = 0; i < 6; i++) { const a = Math.PI * (1.1 + i * 0.16); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, hy + Math.sin(a) * 6); ctx.lineTo(Math.cos(a + 0.12) * 10, hy + Math.sin(a + 0.12) * 10); ctx.lineTo(Math.cos(a + 0.28) * 6.5, hy + Math.sin(a + 0.28) * 6.5); ctx.fill(); } break;
    case 10: capF(); ctx.beginPath(); ctx.moveTo(-7.8, hy - 2); ctx.lineTo(-8, hy + 6.5); ctx.lineTo(-5.2, hy + 6.5); ctx.lineTo(-5.6, hy - 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(7.8, hy - 2); ctx.lineTo(8, hy + 2.5); ctx.lineTo(6, hy + 2.5); ctx.fill(); if (look.streak) { ctx.fillStyle = look.streak; ctx.beginPath(); ctx.moveTo(-1, hy - 7.4); ctx.quadraticCurveTo(-4, hy - 4, -6.6, hy + 4); ctx.lineTo(-5.4, hy + 4); ctx.quadraticCurveTo(-2.6, hy - 3.6, 0.6, hy - 7.2); ctx.fill(); } break;
    case 11: cap(0.36); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-2, hy - 5.5, 3, 1, -0.3, 0, TAU); ctx.fill(); break;
    case 12: for (let i = 0; i < 8; i++) { const a = Math.PI * (1.02 + i / 7.3); ctx.beginPath(); ctx.arc(Math.cos(a) * 6.6, hy + Math.sin(a) * 6.6, 2.2, 0, TAU); ctx.fill(); } break;
    case 13: capF(); ctx.beginPath(); ctx.arc(-6.4, hy - 6, 3.2, 0, TAU); ctx.arc(6.4, hy - 6, 3.2, 0, TAU); ctx.fill(); break;
  }
}
function drawColonist(c, dark) {
  const z = CAM.z;
  let x = c.x, y = c.y;
  if (c.carriedBy) { const car = byId(c.carriedBy); if (car) { x = car.x; y = car.y; } }
  const [sx, sy] = w2s(x, y, c.carriedBy ? 22 : 0);
  if (!onScreen(sx, sy)) return;
  const [vx, vy] = dirToScreen(c.dx || 0, c.dy || 1);
  const front = vy > -0.15;
  const flip = vx < 0;
  const act = c.downed ? 'sleep' : (c.task && c.task.kind === 'sleep' && c.task.ground && c.task.phase === 'sleep') ? 'sleep' : (c.working || 'idle');
  const lying = c.downed || act === 'sleep';
  // 選取圈
  if (UI.sel && UI.sel.o === c) {
    const pr = 0.8 + Math.sin(RT * 4) * 0.08;
    ctx.strokeStyle = 'rgba(127,227,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 15 * z * PS * pr, 6.5 * z * PS * pr, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(127,227,255,0.35)'; ctx.lineWidth = 4; ctx.stroke();
  }
  if (c.leader && !lying) { ctx.strokeStyle = 'rgba(232,194,90,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx, sy, 11 * z * PS, 4.6 * z * PS, 0, 0, TAU); ctx.stroke(); }
  drawPerson(c, sx, sy, z * PS, { front: lying ? true : front, flip, act, moving: c.moving, walk: c.walk, t: RT + c.id, weapon: c.weapon || (c.leader && act === 'aim'), carry: c.carry && c.carry.res, lying });
  // 頭燈
  if (dark > 0.25) addLight(x, y, G.tide.blackout ? 0.9 : 1.6, null, 0.8, 22);
  if (lying && !c.carriedBy && c.downed) {
    const p = 0.6 + 0.4 * Math.sin(RT * 5);
    const q = z * PS; ctx.fillStyle = `rgba(255,90,90,${p})`; ctx.fillRect(sx - 2 * q, sy - 34 * q, 4 * q, 11 * q); ctx.fillRect(sx - 5.5 * q, sy - 30.5 * q, 11 * q, 4 * q);
  }
  if (act === 'sleep' && !c.downed) { ctx.fillStyle = 'rgba(220,235,255,0.8)'; ctx.font = `700 ${Math.round(11 * z)}px sans-serif`; ctx.fillText('z', sx + 10 * z, sy - 22 * z - (RT * 5 % 8) * z); }
  if (act === 'sad' && Math.sin(RT * 3 + c.id) > 0.5) { ctx.fillStyle = '#8fd3ff'; ctx.beginPath(); ctx.arc(sx + 4 * z, sy - 31 * z + (RT * 10 % 6) * z, 1.5 * z, 0, TAU); ctx.fill(); }
  c._sx = sx; c._sy = sy;
}
function drawBeast(b, dark) {
  if (!explored(Math.floor(b.x), Math.floor(b.y))) return;
  const z = CAM.z;
  const [sx, sy] = w2s(b.x, b.y);
  if (!onScreen(sx, sy, 160)) return;
  const d = BEAST[b.type];
  const [vx] = dirToScreen(b.dx || 1, b.dy || 0);
  const flip = vx < 0 ? -1 : 1;
  const wk = b.moving ? b.walk : RT * 0.5;
  const hitFlash = b.hit > 0 ? 1 : 0;
  const tideGlow = b.mode === 'tide' ? 1.4 : 1;
  const bz = z * (BSC[b.type] || 1);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(flip * bz, bz);
  if (b.type === 'bug') {
    ctx.fillStyle = 'rgba(6,6,16,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1e2a1e'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const o = Math.sin(wk * 2 + i * 2) * 2; ctx.beginPath(); ctx.moveTo(-3 + i * 3, -4); ctx.lineTo(-5 + i * 3 + o, 0); ctx.moveTo(-3 + i * 3, -4); ctx.lineTo(-1 + i * 3 - o, 0.5); ctx.stroke(); }
    ctx.fillStyle = hitFlash ? '#ffffff' : '#9dff6a'; ctx.beginPath(); ctx.ellipse(-4, -6, 6.5, 4.6, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b3a2a'; ctx.beginPath(); ctx.ellipse(3, -6.5, 5, 3.8, -0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3e5a3a'; ctx.beginPath(); ctx.arc(7.5, -7, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3e5a3a'; ctx.beginPath(); ctx.moveTo(9, -8); ctx.quadraticCurveTo(12, -13, 14, -12 + Math.sin(RT * 4 + b.id)); ctx.stroke();
    ctx.restore();
    addGlow(sx - 4 * bz * flip, sy - 6 * bz, 11 * bz * tideGlow, '#9dff6a', (0.18 + dark * 0.3) * (hitFlash ? 1.6 : 1));
    if (dark > 0.3) addLight(b.x, b.y, 0.8, null, 0.6);
  } else if (b.type === 'spine') {
    ctx.fillStyle = 'rgba(6,6,16,0.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1014'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [lx, ph] of [[-10, 0], [-6, 2], [6, 1], [10, 3]]) { const o = Math.sin(wk * 1.6 + ph) * 3; ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx + o, -1); ctx.stroke(); }
    ctx.lineCap = 'butt';
    const bg = ctx.createLinearGradient(0, -22, 0, -6); bg.addColorStop(0, hitFlash ? '#fff' : '#6a2a34'); bg.addColorStop(1, '#2e1218');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(-1, -13, 15, 7.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14, -14, 6.5, 5, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd0c8'; ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(22, -11); ctx.lineTo(18, -10); ctx.fill();
    ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.arc(16, -16, 1.4, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) { const x = -12 + i * 4.5; ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.moveTo(x - 2, -19); ctx.lineTo(x + 0.5, -27 - (i % 2) * 3); ctx.lineTo(x + 2.5, -19); ctx.fill(); }
    ctx.restore();
    addGlow(sx, sy - 22 * bz, 18 * bz, '#ff6a5a', 0.2 + dark * 0.3);
    if (dark > 0.3) addLight(b.x, b.y, 1.2, null, 0.6);
  } else if (b.type === 'mother') {
    ctx.fillStyle = 'rgba(6,6,16,0.4)'; ctx.beginPath(); ctx.ellipse(0, 0, 70, 22, 0, 0, TAU); ctx.fill();
    // 觸手腳
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const lx = Math.cos(a) * 46, ly = Math.sin(a) * 15;
      const o = Math.sin(wk * 1.2 + i) * 8;
      ctx.strokeStyle = 'rgba(160,110,220,0.85)'; ctx.lineWidth = 6 - Math.abs(Math.sin(a)) * 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(lx * 0.4, -40 + ly * 0.3); ctx.quadraticCurveTo(lx * 0.9 + o, -40, lx + o * 0.5, ly); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    const pulse = 0.8 + 0.2 * Math.sin(RT * 2.4);
    const bg = ctx.createRadialGradient(-10, -70, 4, 0, -56, 58);
    bg.addColorStop(0, hitFlash ? 'rgba(255,255,255,0.95)' : 'rgba(240,210,255,0.9)'); bg.addColorStop(0.5, 'rgba(170,110,240,0.65)'); bg.addColorStop(1, 'rgba(90,40,160,0.25)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -56, 54 * pulse, 40, 0, Math.PI, TAU); ctx.ellipse(0, -56, 54 * pulse, 14, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ffe9ff'; ctx.beginPath(); ctx.arc(0, -60, 9 + Math.sin(RT * 4) * 1.5, 0, TAU); ctx.fill();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI + Math.PI; ctx.fillStyle = 'rgba(127,240,255,0.8)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 40, -56 + Math.sin(a) * 28, 2.4, 0, TAU); ctx.fill(); }
    ctx.restore();
    addGlow(sx, sy - 60 * z, 70 * z, '#9a5cff', 0.16 + dark * 0.18);
    addGlow(sx, sy - 60 * z, 16 * z, '#ffd6ff', 0.5);
    addLight(b.x, b.y, 4.5, '#c78bff', 0.7);
  } else ctx.restore();
  // 血條
  if (b.hp < b.hpMax || b.type === 'mother') {
    const w = (b.type === 'mother' ? 90 : b.type === 'spine' ? 34 : 20) * Math.min(1.3, z);
    const hh = (b.type === 'mother' ? 110 : b.type === 'spine' ? 36 : 18) * bz;
    bar(sx, sy - hh, w, b.hp / b.hpMax, b.type === 'mother' ? '#c78bff' : '#ff6b6b');
  }
  b._sx = sx; b._sy = sy;
}
function drawPet() {
  const p = G.pet; if (!p || p.hidden) return;
  const z = CAM.z;
  const [sx, sy] = w2s(p.x, p.y);
  const col = p.alarm ? '#ff5a5a' : '#9dff6a';
  ctx.fillStyle = 'rgba(6,6,16,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 6 * z, 2.2 * z, 0, 0, TAU); ctx.fill();
  const hop = Math.abs(Math.sin(p.walk * 2)) * 2 * z;
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sx, sy - 4 * z - hop, 4 * z, 3 * z, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2b3a2a'; ctx.beginPath(); ctx.arc(sx + 3 * z, sy - 5 * z - hop, 2 * z, 0, TAU); ctx.fill();
  addGlow(sx, sy - 4 * z, 10 * z * (p.alarm ? 1.6 : 1), col, p.alarm ? 0.9 : 0.6);
}
function drawBubble(c) {
  if (!c.bubble) return;
  const age = (performance.now() - c.bubble.t) / 1000;
  if (age > 2.6) { c.bubble = null; return; }
  const z = CAM.z;
  const [sx, sy] = [c._sx, c._sy];
  if (sx == null) return;
  const y = sy - 52 * z * PS - Math.min(age, 0.3) * 12;
  const a = age < 0.15 ? age / 0.15 : age > 2.2 ? (2.6 - age) / 0.4 : 1;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(240,248,255,0.95)'; ctx.strokeStyle = 'rgba(20,30,50,0.5)'; ctx.lineWidth = 1;
  const w = 20, hh = 15;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w / 2, y - hh, w, hh, 6) : ctx.rect(sx - w / 2, y - hh, w, hh); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx - 3, y); ctx.lineTo(sx, y + 4); ctx.lineTo(sx + 3, y); ctx.fill();
  const ic = c.bubble.icon;
  ctx.fillStyle = ic === 'heart' ? '#ff5d8f' : ic === 'anger' ? '#ff7a3d' : '#3a8fd9';
  const cx = sx, cy = y - hh / 2;
  if (ic === 'heart') { ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.bezierCurveTo(cx - 7, cy - 1, cx - 3, cy - 6, cx, cy - 2.5); ctx.bezierCurveTo(cx + 3, cy - 6, cx + 7, cy - 1, cx, cy + 4); ctx.fill(); }
  else if (ic === 'anger') { ctx.lineWidth = 2; ctx.strokeStyle = '#ff7a3d'; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx - 1, cy - 1); ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx + 1, cy - 1); ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx - 1, cy + 1); ctx.moveTo(cx + 4, cy + 4); ctx.lineTo(cx + 1, cy + 1); ctx.stroke(); }
  else { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(cx + i * 4.5, cy, 1.6, 0, TAU); ctx.fill(); } }
  ctx.globalAlpha = 1;
}
function drawStatusIcon(c) {
  if (c.dead || c.away || c.hidden || c.downed) return;
  let ic = null;
  if (c.brk) ic = ['!', '#ff6b6b'];
  else if (c.sick) ic = ['✚', '#7ef0c4'];
  else if (c.food < 20) ic = ['食', '#f2a65a'];
  else if (c.rest < 15) ic = ['睏', '#9fb4ff'];
  if (!ic) return;
  const z = CAM.z;
  const sx = c._sx, sy = c._sy - 48 * z * PS;
  ctx.fillStyle = 'rgba(8,10,24,0.8)'; ctx.beginPath(); ctx.arc(sx + 10 * z, sy + 4 * z, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = ic[1]; ctx.font = '700 9px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ic[0], sx + 10 * z, sy + 4.5 * z); ctx.textBaseline = 'alphabetic';
}

/* ---------- 建造預覽 ---------- */
function drawGhost() {
  const B = UI.build;
  if (!B || !B.type) return;
  const d = BUILD[B.type];
  const why = canPlace(B.type, B.x, B.y);
  const ok = !why && canAfford(d.cost);
  const g = boxGeom(B.x, B.y, d.w, d.h, BH[B.type] || 20);
  const col = ok ? '127,227,255' : '255,107,107';
  fillPoly([g.T, g.R, g.B, g.L], `rgba(${col},0.22)`);
  ctx.globalAlpha = 0.55;
  drawBox(g, `rgba(${col},0.35)`, `rgba(${col},0.25)`, `rgba(${col},0.18)`, `rgba(${col},0.9)`);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = 2; poly([g.T, g.R, g.B, g.L]); ctx.stroke();
  if (d.light || d.range) {
    const r = d.light || d.range;
    const [cx, cy] = w2s(B.x + .5, B.y + .5);
    ctx.strokeStyle = `rgba(${col},0.45)`; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * TW / 2 * CAM.z * 1.41, r * TH / 2 * CAM.z * 1.41, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  B.why = why || (canAfford(d.cost) ? '' : '材料不足');
}

/* ---------- 整幀 ---------- */
function render() {
  const dpr = CAM.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  LIGHTS.length = 0; GLOWPTS.length = 0;
  const dark = Math.max(darkness(), G.tide.phase === 'active' ? 0.85 : 0);
  drawSky(dark);
  drawPlateau();
  drawTerrain(dark);
  drawFog();
  // 地面發光（光蘚、溪水）
  if (dark > 0.05 && CAM.z > 0.55) {
    const [x0, y0, x1, y1] = visibleTiles();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      if (!G.world.fog[i]) continue;
      const t = G.world.ter[i], d = G.world.deco[i];
      if (t === T.MOSS && d % 2 === 0) { const [sx, sy] = w2s(x + .3 + (d % 5) / 10, y + .5 + ((d >> 3) % 5) / 12); addGlow(sx, sy, 7 * CAM.z, '#58f0ff', dark * (0.5 + 0.4 * Math.sin(RT * 1.5 + d))); }
      else if (t === T.WATER && d % 3 === 0) { const [sx, sy] = w2s(x + .5, y + .5); addGlow(sx, sy, 16 * CAM.z, '#3fe0ff', dark * 0.35); }
      else if (t === T.GLASS && d % 4 === 0) { const [sx, sy] = w2s(x + .5, y + .5); addGlow(sx, sy, 9 * CAM.z, '#ff7bd8', dark * 0.45); }
    }
  }
  // 物件排序
  const items = [];
  const [x0, y0, x1, y1] = visibleTiles();
  const inView = (x, y) => x >= x0 - 3 && x <= x1 + 3 && y >= y0 - 3 && y <= y1 + 3;
  for (const n of G.world.nodes) {
    if (!inView(n.x, n.y) || !G.world.fog[idx(n.x, n.y)]) continue;
    const [rx, ry] = rotP(n.x + .5, n.y + .5); items.push({ d: rx + ry, k: 0, o: n });
  }
  for (const b of G.buildings) {
    if (!inView(b.x, b.y) && !inView(b.x + b.w, b.y + b.h)) continue;
    let dm = -1e9;
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) { const [rx, ry] = rotP(xx + .5, yy + .5); dm = Math.max(dm, rx + ry); }
    items.push({ d: dm, k: 1, o: b });
  }
  for (const c of G.colonists) {
    if (c.dead || c.away || (c.hidden && !c.carriedBy)) continue;
    let x = c.x, y = c.y;
    if (c.carriedBy) { const car = byId(c.carriedBy); if (car) { x = car.x; y = car.y; } }
    const [rx, ry] = rotP(x, y); items.push({ d: rx + ry + (c.carriedBy ? 0.01 : 0), k: 2, o: c });
  }
  for (const b of G.beasts) { const [rx, ry] = rotP(b.x, b.y); items.push({ d: rx + ry, k: 3, o: b }); }
  if (G.pet) { const [rx, ry] = rotP(G.pet.x, G.pet.y); items.push({ d: rx + ry, k: 4, o: G.pet }); }
  // 大型建築與旁邊的小東西：站在可見面前方的畫在後面，背後的畫在前面
  const bigs = [];
  for (const it of items) if (it.k === 1 && it.o.w * it.o.h > 1) {
    const b = it.o; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [px, py] of [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]) { const [rx, ry] = rotP(px, py); x0 = Math.min(x0, rx); y0 = Math.min(y0, ry); x1 = Math.max(x1, rx); y1 = Math.max(y1, ry); }
    bigs.push({ x0, y0, x1, y1, d: it.d });
  }
  if (bigs.length) for (const it of items) {
    if (it.k === 1 && it.o.w * it.o.h > 1) continue;
    let rx, ry;
    if (it.k === 0) [rx, ry] = rotP(it.o.x + .5, it.o.y + .5);
    else if (it.k === 1) [rx, ry] = rotP(it.o.x + .5, it.o.y + .5);
    else if (it.k === 2) { const c = it.o; const car = c.carriedBy && byId(c.carriedBy); [rx, ry] = rotP(car ? car.x : c.x, car ? car.y : c.y); }
    else [rx, ry] = rotP(it.o.x, it.o.y);
    for (const B of bigs) {
      if (rx < B.x0 - 1.2 || rx > B.x1 + 1.6 || ry < B.y0 - 1.2 || ry > B.y1 + 1.6) continue;
      if (rx >= B.x1 - 0.02 || ry >= B.y1 - 0.02) it.d = Math.max(it.d, B.d + 0.02);
      else it.d = Math.min(it.d, B.d - 0.02);
    }
  }
  items.sort((a, b) => a.d - b.d || a.k - b.k);
  for (const it of items) {
    if (it.k === 0) drawNode(it.o, dark);
    else if (it.k === 1) drawBuilding(it.o, dark);
    else if (it.k === 2) drawColonist(it.o, dark);
    else if (it.k === 3) drawBeast(it.o, dark);
    else drawPet();
  }
  drawSmoke();
  drawFXWorld(dark);
  // 光照
  drawLighting(dark);
  // 加色發光點
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < GLOWPTS.length; i += 5) glow(GLOWPTS[i], GLOWPTS[i + 1], GLOWPTS[i + 2], GLOWPTS[i + 3], GLOWPTS[i + 4]);
  ctx.globalCompositeOperation = 'source-over';
  // 沙暴
  if (G.weather && G.weather.type === 'storm') drawStorm();
  // 介面層
  drawGhost();
  for (const c of G.colonists) { if (!c.dead && !c.away && !c.hidden) { drawBubble(c); drawStatusIcon(c); } }
  if (UI.sel && UI.sel.kind === 'c' && !UI.sel.o.hidden && !UI.sel.o.away) drawNameTag(UI.sel.o);
  drawThoughtPop();
  if (UI.sel && UI.sel.kind === 'b') drawSelB(UI.sel.o);
  if (UI.sel && UI.sel.kind === 'n') drawSelN(UI.sel.o);
  drawTexts();
  if (UI.alert && performance.now() - UI.alert.t < 2600) drawAlertPing();
  // 暈影
  const vg = ctx.createRadialGradient(CAM.W / 2, CAM.H / 2, Math.min(CAM.W, CAM.H) * 0.35, CAM.W / 2, CAM.H / 2, Math.max(CAM.W, CAM.H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(4,4,12,${0.35 + dark * 0.2})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, CAM.W, CAM.H);
  // 旋轉過場
  if (CAM.fade) {
    const k = (performance.now() - CAM.fade.t) / 260;
    if (k >= 1) CAM.fade = null;
    else { ctx.globalAlpha = 1 - easeOut(k); ctx.drawImage(CAM.fade.img, 0, 0, CAM.W, CAM.H); ctx.globalAlpha = 1; }
  }
}
function drawStorm() {
  const W = CAM.W, H = CAM.H;
  const k = clamp((G.t - G.weather.t0) / 60, 0, 1) * clamp((G.weather.until - G.t) / 60, 0, 1);
  ctx.fillStyle = `rgba(150,90,40,${0.22 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(230,180,120,${0.35 * k})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) { const x = ((i * 137 + RT * 600) % (W + 200)) - 100, y = (i * 89 % H) + Math.sin(RT + i) * 10; ctx.moveTo(x, y); ctx.lineTo(x - 26, y + 6); }
  ctx.stroke();
}
function drawNameTag(c) {
  const z = CAM.z;
  const sx = c._sx, sy = c._sy - 54 * z * PS;
  if (sx == null) return;
  ctx.font = '700 12px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(c.name).width + 14;
  ctx.fillStyle = 'rgba(8,12,28,0.82)'; ctx.fillRect(sx - w / 2, sy - 16, w, 18);
  ctx.fillStyle = c.hue; ctx.fillRect(sx - w / 2, sy - 16, 2, 18);
  ctx.fillStyle = '#e8f6ff'; ctx.fillText(c.name, sx, sy - 3);
}
function drawSelB(b) {
  const g = boxGeom(b.x, b.y, b.w, b.h, 0);
  ctx.strokeStyle = `rgba(127,227,255,${0.6 + 0.3 * Math.sin(RT * 4)})`; ctx.lineWidth = 2;
  poly([g.T, g.R, g.B, g.L]); ctx.stroke();
  const d = BUILD[b.type];
  if (b.type === 'turret' || b.type === 'lamp') {
    const r = d.range || d.light; const [cx, cy] = w2s(b.x + .5, b.y + .5);
    ctx.strokeStyle = 'rgba(127,227,255,0.35)'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.ellipse(cx, cy, r * TW / 2 * CAM.z * 1.41, r * TH / 2 * CAM.z * 1.41, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (b.hp < b.hpMax && !BUILD[b.type].wall) { const [sx, sy] = w2s(b.x + b.w / 2, b.y + b.h / 2, (BH[b.type] || 20) + 16); bar(sx, sy, 40, b.hp / b.hpMax, '#ff9f6b'); }
}
function drawSelN(n) {
  const g = boxGeom(n.x, n.y, 1, 1, 0);
  ctx.strokeStyle = `rgba(255,209,102,${0.6 + 0.3 * Math.sin(RT * 4)})`; ctx.lineWidth = 2;
  poly([g.T, g.R, g.B, g.L]); ctx.stroke();
}
function drawAlertPing() {
  const a = UI.alert; const k = ((performance.now() - a.t) / 900) % 1;
  const [sx, sy] = w2s(a.x, a.y);
  ctx.strokeStyle = `rgba(255,90,90,${1 - k})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(sx, sy, 20 + k * 50, (20 + k * 50) * 0.5, 0, 0, TAU); ctx.stroke();
}

/* 內心話泡泡：偶爾讓畫面上的某個人說出他在想什麼 */
const TP = { c: null, t: 0, next: 6 };
function drawThoughtPop() {
  if (!G || G.demo || UI.modal) return;
  const now = performance.now() / 1000;
  if (!TP.c && now > TP.next) {
    const vis = G.colonists.filter(c => !c.dead && !c.away && !c.hidden && !c.downed && c.thought && c._sx > 40 && c._sx < CAM.W - 40 && c._sy > 160 && c._sy < CAM.H - 120);
    if (vis.length) { TP.c = R.pick(vis); TP.t = now; pickThought(TP.c); }
    TP.next = now + 14 + R() * 12;
  }
  if (!TP.c) return;
  const c = TP.c, age = now - TP.t;
  if (age > 5 || c.hidden || c.dead || c.away) { TP.c = null; return; }
  const a = age < 0.25 ? age / 0.25 : age > 4.5 ? (5 - age) / 0.5 : 1;
  const z = CAM.z;
  const txt = c.thought;
  ctx.font = '500 12.5px "Noto Sans TC",sans-serif';
  const w = Math.min(ctx.measureText(txt).width + 18, 230);
  const sx = clamp(c._sx, w / 2 + 6, CAM.W - w / 2 - 6), sy = c._sy - 60 * z * PS - 4;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(14,20,40,0.92)'; ctx.strokeStyle = rgba(c.hue, 0.7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w / 2, sy - 26, w, 24, 8) : ctx.rect(sx - w / 2, sy - 26, w, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(c._sx - 3, sy + 3, 2.6, 0, TAU); ctx.arc(c._sx - 1, sy + 9, 1.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e9e1ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let t = txt; while (ctx.measureText(t).width > w - 16 && t.length > 2) t = t.slice(0, -2) + '…';
  ctx.fillText(t, sx, sy - 13.5); ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}
