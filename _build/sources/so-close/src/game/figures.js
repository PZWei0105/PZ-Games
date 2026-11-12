// 角色公仔（全部用程式建出來）：星砂果凍 J／發條小隊 W／甜點盲盒 K（機甲 M、街頭 S、睡衣 P 在 figures2.js）
// 每隻：底部在 y=0，高約 0.11～0.13；正面朝 +z
import {
  THREE, V3, rnd, G, star5, rbox, gearGeo, heartGeo, tube, part, surf, onSurf,
  beads, toonEyes, smile, catMouth, blush, waffleTex, paintedFace, makeMats, jel, sand, windKey, ghostGeo, mergeGeometries,
} from './figkit.js';
import { CHAR } from './data.js';
import { FIG2, PAL2 } from './figures2.js';
export { mixVersion, disposeFigure } from './figkit.js';

// ---------------- 角色 ----------------
// 回傳 { g, tick(t), act(t) }：tick 一直在跑的小動畫；act 是升到 ★★ 才有的專屬動作
const FIG = {
  // ===== 星砂果凍 =====
  J1(m) { // 軟軟幽靈
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const vols = [];
    jel(body, m, 'main', ghostGeo(), [0, 0.008, 0], [1.02, 1.12, 1.0], null, { keep: null });
    vols.push({ p: [0, 0.05, 0], s: [0.034, 0.034, 0.034] });
    const hc = [0, 0.062, 0], hs = [0.043, 0.06, 0.043];
    beads(body, m, hc, hs, { yaw: 0.36, pitch: 0.05, r: 0.0058 });
    onSurf(body, G.sph(), m.dark, hc, hs, 0, -0.16, { inset: 0.0012, scale: [0.0034, 0.0046, 0.0022] });
    blush(body, m, hc, hs, { yaw: 0.62, pitch: -0.09, r: 0.0058 });
    const arms = [];
    for (const k of [-1, 1]) arms.push(jel(body, m, 'main', G.sph(), [k * 0.044, 0.046, 0.006], [0.012, 0.008, 0.009], [0, 0, k * 0.6], { core: 0 }));
    sand(body, m, vols, 30, 11);
    return { g, tick: (t) => { body.position.y = Math.sin(t * 1.6) * 0.003; }, act: (t) => { body.position.y = 0.004 + Math.sin(t * 2.4) * 0.006; body.rotation.z = Math.sin(t * 1.2) * 0.12; arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (0.6 + Math.sin(t * 6) * 0.35); }); } };
  },
  J2(m) { // 晴天菇
    const g = new THREE.Group(), vols = [];
    const stem = jel(g, m, 'sub', new THREE.LatheGeometry([[0, 0], [0.024, 0.001], [0.028, 0.008], [0.027, 0.03], [0.023, 0.05], [0.02, 0.058], [0, 0.058]].map(([r, y]) => new THREE.Vector2(r, y)), 48), [0, 0, 0], 1, null, { keep: vols });
    vols[0] = { p: [0, 0.028, 0], s: [0.022, 0.024, 0.022] };
    const cap = new THREE.Group(); cap.position.y = 0.056; g.add(cap);
    const capGeo = new THREE.LatheGeometry([[0, 0.05], [0.02, 0.047], [0.038, 0.036], [0.05, 0.018], [0.054, 0.006], [0.05, 0.0], [0.03, 0.002], [0, 0.004]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
    jel(cap, m, 'main', capGeo, [0, 0, 0], 1, null, { core: 0.6 });
    vols.push({ p: [0, 0.075, 0], s: [0.04, 0.016, 0.04] });
    const R = rnd(5);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + R(), up = 0.35 + R() * 0.75;
      const pt = { yaw: a, pitch: up };
      onSurf(cap, G.sph(), m.acc, [0, 0.004, 0], [0.051, 0.044, 0.051], pt.yaw, pt.pitch, { inset: 0.0016, scale: [0.006 + R() * 0.003, 0.006 + R() * 0.003, 0.002] });
    }
    const fc = [0, 0.03, 0], fs = [0.0272, 0.03, 0.0272];
    beads(g, m, fc, fs, { yaw: 0.42, pitch: 0.08, r: 0.0052 });
    smile(g, m, fc, fs, { pitch: -0.14, w: 0.0045 });
    blush(g, m, fc, fs, { yaw: 0.72, pitch: -0.08, r: 0.0048 });
    sand(g, m, vols, 40, 13);
    return { g, tick: (t) => { cap.rotation.z = Math.sin(t * 1.3) * 0.03; }, act: (t) => { const b = Math.abs(Math.sin(t * 3.2)); g.position.y = b * 0.012; g.scale.set(1 + (1 - b) * 0.06, 1 - (1 - b) * 0.06, 1 + (1 - b) * 0.06); cap.rotation.z = Math.sin(t * 6.4) * 0.08; } };
  },
  J3(m) { // 嗶嗶雞
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const vols = [];
    jel(body, m, 'main', G.sph(), [0, 0.048, 0], [0.046, 0.046, 0.043], null, { keep: vols });
    for (const k of [-1, 1]) part(body, G.sph(), m.sub, [k * 0.014, 0.004, 0.012], [0.009, 0.004, 0.012]);
    const wings = [];
    for (const k of [-1, 1]) wings.push(jel(body, m, 'main', G.sph(), [k * 0.044, 0.044, -0.002], [0.007, 0.018, 0.014], [0, 0, k * 0.35], { core: 0 }));
    const tuft = new THREE.Group(); tuft.position.set(0, 0.092, 0); body.add(tuft);
    for (const [x, rz, s] of [[-0.004, 0.5, 0.9], [0.002, -0.1, 1.15], [0.007, -0.6, 0.85]]) jel(tuft, m, 'main', G.sph(), [x, 0.006 * s, 0], [0.0035 * s, 0.009 * s, 0.0035 * s], [0, 0, rz], { core: 0 });
    const hc = [0, 0.048, 0], hs = [0.046, 0.046, 0.043];
    beads(body, m, hc, hs, { yaw: 0.36, pitch: 0.2, r: 0.0058 });
    const beak = onSurf(body, G.cone(), m.sub, hc, hs, 0, 0.04, { inset: -0.004, scale: [0.0075, 0.012, 0.0075] });
    beak.rotateX(Math.PI / 2);
    blush(body, m, hc, hs, { yaw: 0.62, pitch: 0.02, r: 0.006 });
    sand(body, m, vols, 44, 17);
    return { g, tick: (t) => { tuft.rotation.z = Math.sin(t * 2) * 0.08; }, act: (t) => { const b = Math.abs(Math.sin(t * 4)); body.position.y = b * 0.01; wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.35 + b * 0.7); }); body.rotation.y = Math.sin(t * 2) * 0.2; } };
  },
  J4(m) { // 長耳兔
    const g = new THREE.Group(), vols = [];
    jel(g, m, 'main', G.sph(), [0, 0.026, -0.002], [0.034, 0.028, 0.03], null, { keep: vols });
    const head = new THREE.Group(); head.position.set(0, 0.062, 0.004); g.add(head);
    jel(head, m, 'main', G.sph(), [0, 0, 0], [0.034, 0.03, 0.031], null, { keep: [] });
    vols.push({ p: [0, 0.062, 0.004], s: [0.03, 0.026, 0.028] });
    const ears = [];
    for (const k of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(k * 0.013, 0.022, -0.004); e.rotation.set(-0.15, 0, k * -0.22); head.add(e);
      jel(e, m, 'main', G.sph(), [0, 0.03, 0], [0.0095, 0.032, 0.0065], null, { core: 0.55 });
      part(e, G.sph(), m.sub, [0, 0.03, 0.004], [0.0055, 0.024, 0.003]);
      ears.push(e);
    }
    for (const k of [-1, 1]) jel(g, m, 'main', G.sph(), [k * 0.016, 0.006, 0.022], [0.011, 0.007, 0.012], null, { core: 0 });
    jel(g, m, 'main', G.sph(), [0, 0.022, -0.033], 0.009, null, { core: 0 });
    const hs = [0.034, 0.03, 0.031];
    beads(head, m, [0, 0, 0], hs, { yaw: 0.44, pitch: 0.12, r: 0.0056 });
    onSurf(head, G.sph(), m.sub, [0, 0, 0], hs, 0, -0.08, { inset: 0.001, scale: [0.0038, 0.003, 0.0025] });
    catMouth(head, m, [0, 0, 0], hs, { pitch: -0.24, w: 0.0032, gap: 0.075 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.66, pitch: -0.14, r: 0.0055 });
    sand(g, m, vols, 46, 19);
    return { g, tick: (t) => { ears[0].rotation.z = 0.22 + Math.sin(t * 1.4) * 0.04; ears[1].rotation.z = -0.22 - Math.sin(t * 1.4 + 1) * 0.04; }, act: (t) => { const b = Math.abs(Math.sin(t * 3.4)); g.position.y = b * 0.014; ears[0].rotation.x = -0.15 - b * 0.35; ears[1].rotation.x = -0.15 - b * 0.35; ears[1].rotation.z = -0.22 - (Math.sin(t * 9) > 0.7 ? 0.5 : 0); } };
  },
  J5(m) { // 圓滾海豹
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const vols = [];
    jel(body, m, 'main', G.sph(), [0, 0.044, 0], [0.05, 0.044, 0.042], null, { keep: vols });
    jel(body, m, 'sub', G.sph(), [0, 0.034, 0.018], [0.036, 0.03, 0.026], null, { core: 0 });
    const fl = [];
    for (const k of [-1, 1]) fl.push(jel(body, m, 'main', G.sph(), [k * 0.046, 0.02, 0.014], [0.016, 0.006, 0.011], [0, k * 0.5, k * -0.5], { core: 0 }));
    for (const k of [-1, 1]) jel(body, m, 'main', G.sph(), [k * 0.012, 0.012, -0.04], [0.012, 0.005, 0.016], [0.3, k * 0.6, 0], { core: 0 });
    const hc = [0, 0.044, 0], hs = [0.05, 0.044, 0.042];
    beads(body, m, hc, hs, { yaw: 0.36, pitch: 0.24, r: 0.0062 });
    onSurf(body, G.sph(), m.acc, hc, hs, 0, 0.09, { inset: 0.0008, scale: [0.0058, 0.0042, 0.003] });
    const mz = surf(hc, hs, 0, 0.0);
    for (const k of [-1, 1]) onSurf(body, G.sph(), m.main, hc, hs, k * 0.09, 0.0, { inset: -0.002, scale: [0.0078, 0.0062, 0.005] });
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) onSurf(body, G.sphS(), m.acc, hc, hs, k * (0.2 + (i % 2) * 0.06), 0.02 - i * 0.05, { inset: -0.0012, scale: 0.0011 });
    void mz;
    blush(body, m, hc, hs, { yaw: 0.6, pitch: 0.1, r: 0.0058 });
    sand(body, m, vols, 52, 23);
    return { g, tick: (t) => { fl[0].rotation.z = 0.5 + Math.sin(t * 2) * 0.1; fl[1].rotation.z = -0.5 - Math.sin(t * 2) * 0.1; }, act: (t) => { body.rotation.z = Math.sin(t * 2.2) * 0.32; body.position.x = Math.sin(t * 2.2) * 0.012; fl[0].rotation.z = 0.5 + Math.sin(t * 8) * 0.4; fl[1].rotation.z = -0.5 - Math.sin(t * 8 + 1) * 0.4; } };
  },
  J6(m) { // 微笑蠑螈
    const g = new THREE.Group(), vols = [];
    jel(g, m, 'main', G.sph(), [0, 0.024, -0.008], [0.028, 0.024, 0.034], null, { keep: vols });
    const tail = new THREE.Group(); tail.position.set(0, 0.022, -0.036); g.add(tail);
    jel(tail, m, 'main', G.sph(), [0, 0.004, -0.018], [0.006, 0.014, 0.024], [0.2, 0, 0], { core: 0 });
    for (const k of [-1, 1]) jel(g, m, 'main', G.sph(), [k * 0.024, 0.008, 0.012], [0.009, 0.005, 0.01], [0, 0, k * -0.3], { core: 0 });
    const head = new THREE.Group(); head.position.set(0, 0.066, 0.006); g.add(head);
    const hs = [0.046, 0.032, 0.036];
    jel(head, m, 'main', G.sph(), [0, 0, 0], hs, null, { keep: [] });
    vols.push({ p: [0, 0.066, 0.006], s: [0.04, 0.026, 0.03] });
    const gills = [];
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) {
      const gr = new THREE.Group(); gr.position.set(k * 0.036, 0.004 + (1 - i) * 0.011, -0.006); gr.rotation.set(0, 0, k * (-0.9 + i * 0.55)); head.add(gr);
      part(gr, G.sph(), m.sub, [k * 0.011, 0, 0], [0.012, 0.0032, 0.003]);
      for (let j = 0; j < 4; j++) { part(gr, G.sph(), m.sub, [k * (0.006 + j * 0.0048), 0.003, 0], [0.0022, 0.0042, 0.002], [0, 0, k * 0.5]); part(gr, G.sph(), m.sub, [k * (0.006 + j * 0.0048), -0.003, 0], [0.0022, 0.0042, 0.002], [0, 0, k * -0.5]); }
      gills.push(gr);
    }
    beads(head, m, [0, 0, 0], hs, { yaw: 0.6, pitch: 0.12, r: 0.0052 });
    smile(head, m, [0, 0, 0], hs, { pitch: -0.12, w: 0.014, t: 0.12, open: 0.62 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.78, pitch: -0.08, r: 0.0058 });
    sand(g, m, vols, 50, 29);
    return { g, tick: (t) => { gills.forEach((q, i) => { q.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.05); }); }, act: (t) => { tail.rotation.y = Math.sin(t * 5) * 0.6; head.rotation.z = Math.sin(t * 1.6) * 0.12; gills.forEach((q, i) => { q.rotation.x = Math.sin(t * 7 + i * 0.8) * 0.4; }); } };
  },
  J7(m) { // 月光鯨
    const g = new THREE.Group(), vols = [];
    const wave = new THREE.LatheGeometry([[0, 0.012], [0.03, 0.012], [0.042, 0.009], [0.046, 0.004], [0.044, 0], [0, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    jel(g, m, 'sub', wave, [0, 0, 0], [1.1, 1, 0.9], null, { core: 0.6 });
    const whale = new THREE.Group(); whale.position.set(0, 0.05, 0); whale.rotation.y = -0.5; g.add(whale);
    const bs = [0.055, 0.034, 0.034];
    jel(whale, m, 'main', G.sph(), [0, 0, 0], bs, null, { keep: [] });
    vols.push({ p: [0, 0.05, 0], s: [0.04, 0.026, 0.026] });
    jel(whale, m, 'sub', G.sph(), [0.008, -0.012, 0], [0.042, 0.02, 0.028], null, { core: 0 });
    const tail = new THREE.Group(); tail.position.set(-0.05, 0.004, 0); whale.add(tail);
    jel(tail, m, 'main', G.sph(), [-0.008, 0.004, 0], [0.012, 0.007, 0.006], [0, 0, 0.5], { core: 0 });
    for (const k of [-1, 1]) jel(tail, m, 'main', G.sph(), [-0.018, 0.014, k * 0.009], [0.012, 0.004, 0.009], [k * 0.4, 0, 0.9], { core: 0 });
    for (const k of [-1, 1]) jel(whale, m, 'main', G.sph(), [0.012, -0.018, k * 0.03], [0.013, 0.004, 0.008], [k * -0.5, 0.4 * k, -0.3], { core: 0 });
    // 臉在 +x 方向（鯨魚頭），所以用 yaw = 90°
    const hc = [0, 0, 0];
    for (const k of [-1, 1]) {
      const { p, n } = surf(hc, bs, Math.PI / 2 + k * 0.48, 0.06);
      const e = part(whale, G.sph(), m.eye, [p.x - n.x * 0.002, p.y - n.y * 0.002, p.z - n.z * 0.002], 0.0052);
      const h = p.clone().addScaledVector(n, 0.003).add(V3(0, 0.0022, 0)); part(whale, G.sphS(), m.hl, [h.x, h.y, h.z], 0.0016); void e;
    }
    smile(whale, m, hc, bs, { yaw: Math.PI / 2, pitch: -0.16, w: 0.008, open: 0.6 });
    // 頭上的月亮
    const moonS = new THREE.Shape(); moonS.absarc(0, 0, 1, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0.42, 0.18, 0.86, 0, Math.PI * 2, true); moonS.holes.push(hole);
    const moonG = new THREE.ExtrudeGeometry(moonS, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 24 }); moonG.translate(0, 0, -0.175);
    const moonM = new THREE.MeshStandardMaterial({ color: '#fff0a8', emissive: '#ffd040', emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.1 });
    const moon = part(whale, moonG, moonM, [0.012, 0.042, 0], 0.012, [0, Math.PI / 2, 0.3]);
    // 噴出來的星星
    const spout = new THREE.Group(); spout.position.set(0.018, 0.032, 0); whale.add(spout);
    const stars = [];
    for (let i = 0; i < 5; i++) { const s = part(spout, star5(), m.star, [Math.sin(i * 1.3) * 0.006, 0.01 + i * 0.008, Math.cos(i * 1.7) * 0.004], 0.0028 - i * 0.0003); stars.push(s); }
    sand(g, m, vols, 54, 31);
    return { g, tick: (t) => { whale.position.y = 0.05 + Math.sin(t * 1.2) * 0.003; stars.forEach((s, i) => { s.rotation.y = t * 2 + i; s.scale.setScalar((0.0028 - i * 0.0003) * (0.8 + 0.3 * Math.sin(t * 4 + i))); }); moon.rotation.z = 0.3 + Math.sin(t) * 0.05; }, act: (t) => { whale.rotation.z = Math.sin(t * 1.8) * 0.12; tail.rotation.z = Math.sin(t * 4) * 0.5; spout.scale.setScalar(0.7 + Math.abs(Math.sin(t * 2.2)) * 0.6); } };
  },
  J8(m) { // 流星龍
    const g = new THREE.Group(), vols = [];
    jel(g, m, 'main', G.sph(), [0, 0.03, 0], [0.034, 0.03, 0.03], null, { keep: vols });
    jel(g, m, 'sub', G.sph(), [0, 0.028, 0.014], [0.024, 0.024, 0.018], null, { core: 0 });
    for (const k of [-1, 1]) jel(g, m, 'main', G.sph(), [k * 0.02, 0.006, 0.016], [0.011, 0.007, 0.012], null, { core: 0 });
    const head = new THREE.Group(); head.position.set(0, 0.074, 0.004); g.add(head);
    const hs = [0.034, 0.03, 0.031];
    jel(head, m, 'main', G.sph(), [0, 0, 0], hs, null, { keep: [] });
    vols.push({ p: [0, 0.074, 0.004], s: [0.03, 0.026, 0.027] });
    jel(head, m, 'main', G.sph(), [0, -0.008, 0.024], [0.018, 0.012, 0.014], null, { core: 0 });
    for (const k of [-1, 1]) part(head, G.cone(), m.acc, [k * 0.016, 0.028, -0.006], [0.0045, 0.014, 0.0045], [-0.25, 0, k * -0.35]);
    for (const k of [-1, 1]) jel(head, m, 'main', G.sph(), [k * 0.03, 0.006, -0.006], [0.004, 0.011, 0.007], [0, 0, k * -0.9], { core: 0 });
    beads(head, m, [0, 0, 0], hs, { yaw: 0.42, pitch: 0.12, r: 0.0062 });
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.dark, [0, -0.008, 0.024], [0.018, 0.012, 0.014], k * 0.3, 0.3, { inset: 0.0006, scale: [0.0016, 0.0012, 0.0012] });
    smile(head, m, [0, -0.008, 0.024], [0.018, 0.012, 0.014], { pitch: -0.25, w: 0.006, open: 0.6 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.72, pitch: -0.14, r: 0.0055 });
    // 翅膀
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.quadraticCurveTo(0.2, 0.9, 1, 1); ws.quadraticCurveTo(0.75, 0.62, 0.95, 0.42); ws.quadraticCurveTo(0.62, 0.32, 0.72, 0.08); ws.quadraticCurveTo(0.38, 0.1, 0, 0);
    const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 });
    const wings = [];
    for (const k of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(k * 0.016, 0.046, -0.022); g.add(w);
      const wm = part(w, wg, m.acc2, [0, 0, 0], [0.034 * k, 0.034, 0.034], [0, k * 0.5, 0]); void wm;
      wings.push(w);
    }
    // 背刺＋尾巴＋流星
    for (let i = 0; i < 4; i++) part(g, G.cone(), m.acc, [0, 0.086 - i * 0.016 + 0.006, -0.026 - i * 0.004], [0.0035, 0.008, 0.003], [-0.9 - i * 0.2, 0, 0]);
    const tail = new THREE.Group(); tail.position.set(0, 0.012, -0.03); g.add(tail);
    const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.012, 0.0, -0.016), V3(0.03, 0.006, -0.012), V3(0.038, 0.018, 0.004)]);
    jel(tail, m, 'main', new THREE.TubeGeometry(curve, 24, 0.006, 12), [0, 0, 0], 1, null, { core: 0 });
    const tipStar = part(tail, star5(), m.star, [0.038, 0.026, 0.006], 0.008);
    sand(g, m, vols, 70, 37, 0.0025);
    return { g, tick: (t) => { tipStar.rotation.y = t * 1.8; wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * Math.sin(t * 1.4) * 0.08; }); }, act: (t) => { wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * Math.sin(t * 9) * 0.45; }); g.position.y = Math.abs(Math.sin(t * 4.5)) * 0.008; head.rotation.x = Math.sin(t * 2.2) * 0.1; tail.rotation.y = Math.sin(t * 3) * 0.3; tipStar.scale.setScalar(0.008 * (1 + Math.abs(Math.sin(t * 4.5)) * 0.5)); } };
  },
  // ===== 發條小隊 =====
  W1(m) { // 發條企鵝
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.05, 0], bs = [0.037, 0.048, 0.035];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.042, 0.012], [0.029, 0.036, 0.025]);
    onSurf(body, G.sph(), m.sub, bc, bs, 0, 0.42, { inset: 0.009, scale: [0.026, 0.017, 0.012] });
    toonEyes(body, m, bc, bs, { yaw: 0.26, pitch: 0.46, r: 0.0078, pr: 0.6 });
    const beak = onSurf(body, G.cone(), m.acc, bc, bs, 0, 0.3, { inset: -0.004, scale: [0.006, 0.011, 0.005] }); beak.rotateX(Math.PI / 2);
    blush(body, m, bc, bs, { yaw: 0.5, pitch: 0.32, r: 0.0055 });
    const fl = [];
    for (const k of [-1, 1]) { const f = new THREE.Group(); f.position.set(k * 0.034, 0.058, 0); body.add(f); part(f, G.sph(), m.main, [k * 0.004, -0.016, 0], [0.007, 0.021, 0.013], [0, 0, k * 0.25]); fl.push(f); }
    for (const k of [-1, 1]) part(g, G.sph(), m.acc, [k * 0.014, 0.004, 0.018], [0.011, 0.0045, 0.015]);
    const key = windKey(body, m, [0, 0.054, -0.034]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; }, act: (t) => { const s = Math.sin(t * 7); body.rotation.z = s * 0.14; body.position.y = Math.abs(s) * 0.004; fl[0].rotation.z = -0.3 - Math.abs(s) * 0.5; fl[1].rotation.z = 0.3 + Math.abs(s) * 0.5; key.rotation.z = t * 4; } };
  },
  W2(m) { // 鼓手熊
    const g = new THREE.Group();
    part(g, G.sph(), m.main, [0, 0.032, 0], [0.032, 0.031, 0.028]);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.016, 0.008, 0.012], [0.012, 0.008, 0.014]);
    for (const k of [-1, 1]) part(g, G.sph(), m.sub, [k * 0.016, 0.006, 0.024], [0.007, 0.005, 0.003]);
    const head = new THREE.Group(); head.position.set(0, 0.074, 0.002); g.add(head);
    const hs = [0.033, 0.03, 0.03];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.025, 0.022, -0.004], [0.011, 0.011, 0.008]); part(head, G.sph(), m.sub, [k * 0.025, 0.022, -0.0005], [0.0065, 0.0065, 0.005]); }
    const mc = [0, -0.009, 0.022], ms = [0.015, 0.011, 0.01];
    part(head, G.sph(), m.sub, mc, ms);
    onSurf(head, G.sph(), m.dark, mc, ms, 0, 0.5, { inset: 0.001, scale: [0.0048, 0.0034, 0.0034] });
    smile(head, m, mc, ms, { pitch: -0.25, w: 0.0045, open: 0.7 });
    beads(head, m, [0, 0, 0], hs, { yaw: 0.36, pitch: 0.16, r: 0.0058 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.6, pitch: -0.06, r: 0.0058 });
    // 鼓
    const drum = new THREE.Group(); drum.position.set(0, 0.034, 0.03); drum.rotation.x = 0.35; g.add(drum);
    part(drum, G.cyl(), m.acc, [0, 0, 0], [0.019, 0.015, 0.019]);
    for (const y of [-0.0078, 0.0078]) { part(drum, G.cyl(), m.acc2, [0, y, 0], [0.0182, 0.0012, 0.0182]); part(drum, G.torus(), m.brass, [0, y, 0], [0.0192, 0.0192, 0.009], [Math.PI / 2, 0, 0]); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; part(drum, G.cyl(), m.brass, [Math.cos(a) * 0.0193, 0, Math.sin(a) * 0.0193], [0.0011, 0.0145, 0.0011], [0, 0, (i % 2 ? 1 : -1) * 0.5]); }
    const arms = [];
    for (const k of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(k * 0.028, 0.046, 0.006); g.add(a);
      part(a, G.sph(), m.main, [k * 0.004, -0.008, 0.008], [0.008, 0.012, 0.009], [0.7, 0, k * 0.4]);
      const st = new THREE.Group(); st.position.set(k * 0.006, -0.012, 0.016); a.add(st);
      part(st, G.cyl(), m.sub, [0, 0, 0.012], [0.0016, 0.03, 0.0016], [Math.PI / 2 - 0.5, 0, 0]);
      part(st, G.sph(), m.acc2, [0, 0.007, 0.026], 0.0032);
      arms.push(a);
    }
    const key = windKey(g, m, [0, 0.036, -0.028]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; }, act: (t) => { arms.forEach((a, i) => { a.rotation.x = Math.max(0, Math.sin(t * 9 + i * Math.PI)) * 0.55; }); head.rotation.z = Math.sin(t * 4.5) * 0.08; head.position.y = 0.074 + Math.abs(Math.sin(t * 4.5)) * 0.002; key.rotation.z = t * 4; } };
  },
  W3(m) { // 跳跳蛙
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.032, 0], bs = [0.043, 0.032, 0.036];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.026, 0.016], [0.032, 0.022, 0.022]);
    for (const k of [-1, 1]) {
      part(body, G.sph(), m.main, [k * 0.019, 0.056, 0.008], 0.0125);
      const e = surf([k * 0.019, 0.056, 0.008], [0.0125, 0.0125, 0.0125], 0, 0.12);
      part(body, G.sph(), m.white, [e.p.x, e.p.y, e.p.z - 0.004], [0.0092, 0.0095, 0.006]);
      part(body, G.sph(), m.eye, [e.p.x, e.p.y + 0.0006, e.p.z + 0.0012], [0.005, 0.0058, 0.003]);
      part(body, G.sphS(), m.hl, [e.p.x - 0.0015, e.p.y + 0.0026, e.p.z + 0.0035], 0.0014);
    }
    smile(body, m, bc, bs, { pitch: 0.12, w: 0.02, t: 0.08, open: 0.55 });
    blush(body, m, bc, bs, { yaw: 0.62, pitch: 0.18, r: 0.0065 });
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.038, 0.012, -0.008], [0.014, 0.011, 0.022], [0, k * 0.3, 0]); part(body, G.sph(), m.main, [k * 0.04, 0.003, 0.014], [0.012, 0.004, 0.01]); }
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.018, 0.004, 0.03], [0.008, 0.005, 0.009]);
    for (let i = 0; i < 4; i++) part(body, G.sph(), m.acc, [(i - 1.5) * 0.014 + Math.sin(i) * 0.004, 0.05 - (i % 2) * 0.006, -0.026], 0.0035 + (i % 2) * 0.001);
    const key = windKey(body, m, [0, 0.036, -0.036]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; }, act: (t) => { const ph = (t * 1.4) % 1; const up = Math.sin(Math.min(1, ph / 0.7) * Math.PI); body.position.y = up * 0.026; const sq = ph > 0.7 ? Math.sin((ph - 0.7) / 0.3 * Math.PI) : 0; body.scale.set(1 + sq * 0.12, 1 - sq * 0.14 + up * 0.06, 1 + sq * 0.12); key.rotation.z = t * 4; } };
  },
  W4(m) { // 鐵皮機器人
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, rbox(0.052, 0.042, 0.036, 0.22), m.main, [0, 0.04, 0]);
    part(body, G.cyl(), m.sub, [0, 0.042, 0.018], [0.0105, 0.002, 0.0105], [Math.PI / 2, 0, 0]);
    const needle = part(body, rbox(0.0015, 0.009, 0.0012, 0.3), m.dark, [0, 0.044, 0.0204]);
    for (const [x, c] of [[-0.016, 'acc'], [0.016, 'acc2']]) part(body, G.sph(), m[c] || m.acc, [x, 0.03, 0.017], [0.0038, 0.0038, 0.0024]);
    for (const [x, y] of [[-0.022, 0.056], [0.022, 0.056], [-0.022, 0.024], [0.022, 0.024]]) part(body, G.sphS(), m.steel, [x, y, 0.0178], 0.0016);
    const head = new THREE.Group(); head.position.set(0, 0.083, 0); body.add(head);
    part(head, rbox(0.046, 0.034, 0.034, 0.24), m.sub, [0, 0, 0]);
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff4b0', emissive: '#ffd23a', emissiveIntensity: 1.3 });
    for (const k of [-1, 1]) { part(head, G.cyl(), m.dark, [k * 0.011, 0.003, 0.0165], [0.0068, 0.003, 0.0068], [Math.PI / 2, 0, 0]); part(head, G.sph(), lamp, [k * 0.011, 0.003, 0.0178], [0.0052, 0.0052, 0.0024]); part(head, G.sphS(), m.hl, [k * 0.011 - 0.0018, 0.0052, 0.0198], 0.0012); }
    for (let i = 0; i < 4; i++) part(head, rbox(0.0024, 0.006, 0.002, 0.3), m.dark, [(i - 1.5) * 0.0042, -0.0095, 0.0171]);
    blush(head, m, [0, 0, 0], [0.024, 0.018, 0.0175], { yaw: 0.72, pitch: -0.2, r: 0.0042 });
    for (const k of [-1, 1]) { part(head, G.cyl(), m.main, [k * 0.025, 0, 0], [0.006, 0.004, 0.006], [0, 0, Math.PI / 2]); }
    part(head, G.cyl(), m.steel, [0, 0.024, 0], [0.0012, 0.016, 0.0012]);
    const ant = part(head, G.sph(), new THREE.MeshStandardMaterial({ color: '#ff5a5a', emissive: '#ff2a2a', emissiveIntensity: 1.2 }), [0, 0.033, 0], 0.0042);
    const arms = [];
    for (const k of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(k * 0.03, 0.05, 0); body.add(a);
      part(a, G.sph(), m.steel, [0, 0, 0], 0.0048);
      part(a, G.cyl(), m.sub, [k * 0.002, -0.012, 0], [0.0042, 0.022, 0.0042], [0, 0, k * 0.15]);
      for (const s of [-1, 1]) part(a, G.torus(Math.PI, 0.3), m.steel, [k * 0.004, -0.026, s * 0.003], [0.0042, 0.0042, 0.0042], [0, Math.PI / 2, s * 0.4 - Math.PI / 2]);
      arms.push(a);
    }
    const legs = [];
    for (const k of [-1, 1]) { const l = new THREE.Group(); l.position.set(k * 0.013, 0.02, 0); body.add(l); part(l, G.cyl(), m.sub, [0, -0.008, 0], [0.0068, 0.014, 0.0068]); part(l, rbox(0.016, 0.006, 0.02, 0.3), m.main, [0, -0.016, 0.003]); legs.push(l); }
    const key = windKey(body, m, [0, 0.044, -0.018]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; ant.material.emissiveIntensity = Math.sin(t * 3) > 0.6 ? 2.4 : 0.6; needle.rotation.z = Math.sin(t * 0.7) * 0.8; }, act: (t) => { const s = Math.sin(t * 6); legs[0].position.y = 0.02 + Math.max(0, s) * 0.005; legs[1].position.y = 0.02 + Math.max(0, -s) * 0.005; arms[0].rotation.x = s * 0.6; arms[1].rotation.x = -s * 0.6; body.rotation.z = s * 0.05; head.rotation.y = Math.sin(t * 1.3) * 0.4; key.rotation.z = t * 4; } };
  },
  W5(m) { // 兇鯊
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.05, 0], bs = [0.038, 0.049, 0.036];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.038, 0.014], [0.028, 0.034, 0.024]);
    beads(body, m, bc, bs, { yaw: 0.36, pitch: 0.36, r: 0.0052 });
    for (const k of [-1, 1]) onSurf(body, rbox(1, 0.28, 0.4, 0.4), m.dark, bc, bs, k * 0.34, 0.5, { inset: -0.0008, scale: 0.012, roll: k * 0.42 });
    const mouth = onSurf(body, G.torus(Math.PI * 0.6, 0.18), m.dark, bc, bs, 0, 0.16, { inset: 0.0004, scale: 0.011, roll: Math.PI + Math.PI * 0.2 });
    for (let i = 0; i < 5; i++) { const a = -0.26 + i * 0.13; const tt = onSurf(body, G.cone(), m.white, bc, bs, a, 0.11 - Math.abs(a) * 0.1, { inset: -0.0012, scale: [0.0018, 0.0034, 0.0018] }); tt.rotateX(Math.PI / 2); tt.rotateX(Math.PI / 2); }
    void mouth;
    blush(body, m, bc, bs, { yaw: 0.55, pitch: 0.24, r: 0.0055 });
    const fs = new THREE.Shape(); fs.moveTo(-1, 0); fs.quadraticCurveTo(-0.6, 0.4, 0.2, 1.1); fs.quadraticCurveTo(0.35, 0.5, 1, 0); fs.lineTo(-1, 0);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 3 }); fg.translate(0, 0, -0.15);
    part(body, fg, m.main, [0, 0.088, -0.012], [0.016, 0.018, 0.016], [0, Math.PI / 2, 0]);
    part(body, fg, m.main, [0, 0.012, -0.034], [0.012, 0.016, 0.014], [-0.5, Math.PI / 2, 0.6]);
    const fins = [];
    for (const k of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(k * 0.034, 0.044, 0.006); body.add(f);
      part(f, G.sph(), m.main, [k * 0.008, -0.006, 0], [0.012, 0.0055, 0.01], [0, 0, k * -0.6]);
      part(f, G.torus(Math.PI * 2, 0.42), m.acc, [k * 0.008, -0.005, 0], [0.0075, 0.0075, 0.0075], [0, Math.PI / 2, k * -0.6 + Math.PI / 2]);
      fins.push(f);
    }
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.016, 0.006, 0.016], [0.01, 0.006, 0.012]);
    const key = windKey(body, m, [0, 0.05, -0.035]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; }, act: (t) => { body.position.x = Math.sin(t * 38) * 0.0012; body.rotation.z = Math.sin(t * 31) * 0.02; fins.forEach((f, i) => { f.rotation.z = (i ? 1 : -1) * (Math.sin(t * 10) * 0.35); }); key.rotation.z = t * 4; } };
  },
  W6(m) { // 太空貓
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, G.sph(), m.main, [0, 0.034, 0], [0.031, 0.032, 0.029]);
    for (const [x, c] of [[-0.009, 'acc'], [0, 'acc2'], [0.009, 'acc']]) part(body, G.sph(), m[c], [x, 0.04, 0.028], [0.0034, 0.0034, 0.0022]);
    part(body, G.torus(Math.PI * 2, 0.32), m.steel, [0, 0.058, 0], [0.022, 0.022, 0.024], [Math.PI / 2, 0, 0]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.015, 0.008, 0.012], [0.01, 0.009, 0.012]); part(body, G.sph(), m.acc2, [k * 0.015, 0.003, 0.016], [0.0105, 0.004, 0.011]); }
    const arm = [];
    for (const k of [-1, 1]) { const a = new THREE.Group(); a.position.set(k * 0.028, 0.044, 0.002); body.add(a); part(a, G.sph(), m.main, [k * 0.004, -0.01, 0.004], [0.008, 0.013, 0.008], [0.3, 0, k * 0.35]); part(a, G.sph(), m.white, [k * 0.008, -0.022, 0.008], 0.0058); arm.push(a); }
    part(body, rbox(0.03, 0.034, 0.014, 0.25), m.main, [0, 0.046, -0.03]);
    part(body, rbox(0.022, 0.006, 0.004, 0.3), m.acc2, [0, 0.054, -0.0375]);
    part(body, G.cyl(), m.steel, [0.009, 0.072, -0.03], [0.0011, 0.016, 0.0011]);
    const blink = part(body, G.sph(), new THREE.MeshStandardMaterial({ color: '#ffd23a', emissive: '#ffb21a', emissiveIntensity: 1.2 }), [0.009, 0.081, -0.03], 0.0028);
    const head = new THREE.Group(); head.position.set(0, 0.082, 0.001); body.add(head);
    const hs = [0.027, 0.024, 0.025];
    part(head, G.sph(), m.sub, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.cone(), m.sub, [k * 0.015, 0.021, -0.002], [0.0085, 0.014, 0.0065], [0, 0, k * -0.35]); part(head, G.cone(), m.blush, [k * 0.015, 0.02, 0.0012], [0.0048, 0.009, 0.002], [0, 0, k * -0.35]); }
    beads(head, m, [0, 0, 0], hs, { yaw: 0.4, pitch: 0.1, r: 0.0054 });
    onSurf(head, G.sph(), m.blush, [0, 0, 0], hs, 0, -0.08, { inset: 0.0006, scale: [0.0026, 0.0019, 0.0015] });
    catMouth(head, m, [0, 0, 0], hs, { pitch: -0.2, w: 0.0028, gap: 0.07 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.66, pitch: -0.12, r: 0.0046 });
    const helm = part(head, G.sph(), m.glass, [0, 0.004, 0], 0.039);
    helm.renderOrder = 3;
    part(head, G.sphS(), m.hl, [-0.016, 0.026, 0.024], [0.004, 0.0065, 0.002], [0, -0.5, 0.5]);
    const key = windKey(body, m, [0, 0.044, -0.037]);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; blink.material.emissiveIntensity = Math.sin(t * 4) > 0.5 ? 2.2 : 0.5; }, act: (t) => { body.position.y = 0.006 + Math.sin(t * 1.6) * 0.006; body.rotation.y = Math.sin(t * 0.8) * 0.4; body.rotation.z = Math.sin(t * 1.1) * 0.08; arm[1].rotation.z = 0.6 + Math.sin(t * 7) * 0.4; key.rotation.z = t * 4; } };
  },
  W7(m) { // 炸毛獅
    const g = new THREE.Group();
    part(g, G.sph(), m.main, [0, 0.03, 0], [0.03, 0.029, 0.027]);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.015, 0.007, 0.013], [0.011, 0.007, 0.013]);
    const tail = part(g, tube([[0.006, 0.012, -0.022], [0.02, 0.01, -0.03], [0.03, 0.026, -0.03], [0.034, 0.04, -0.022]], 0.0028), m.main, [0, 0, 0]);
    part(g, G.sph(), m.sub, [0.034, 0.044, -0.02], 0.0075);
    const head = new THREE.Group(); head.position.set(0, 0.074, 0.004); g.add(head);
    const mane = new THREE.Group(); head.add(mane);
    const R = rnd(7);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const sp = part(mane, G.cone(), m.sub, [Math.cos(a) * 0.03, Math.sin(a) * 0.03, -0.008], [0.009, 0.02 + R() * 0.008, 0.008]); sp.rotation.z = a - Math.PI / 2; sp.rotateX(-0.25); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; part(mane, G.sph(), m.sub, [Math.cos(a) * 0.026, Math.sin(a) * 0.026, -0.004], 0.0098); }
    const hs = [0.028, 0.026, 0.026];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) part(head, G.sph(), m.main, [k * 0.018, 0.022, 0.002], [0.007, 0.007, 0.005]);
    const mc = [0, -0.008, 0.019], ms = [0.014, 0.01, 0.009];
    part(head, G.sph(), m.acc, mc, ms);
    onSurf(head, G.sph(), m.dark, mc, ms, 0, 0.55, { inset: 0.0012, scale: [0.0052, 0.0034, 0.003] });
    catMouth(head, m, mc, ms, { pitch: -0.2, w: 0.0032, gap: 0.14 });
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) onSurf(head, G.sphS(), m.dark, mc, ms, k * (0.45 + (i % 2) * 0.15), 0.05 - i * 0.12, { inset: -0.0006, scale: 0.0009 });
    beads(head, m, [0, 0, 0], hs, { yaw: 0.36, pitch: 0.2, r: 0.0055 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.6, pitch: -0.04, r: 0.005 });
    const key = windKey(g, m, [0, 0.034, -0.027]);
    void tail;
    return { g, tick: (t) => { key.rotation.z = t * 1.2; mane.rotation.z = Math.sin(t * 0.8) * 0.03; }, act: (t) => { const f = Math.pow(Math.abs(Math.sin(t * 2.4)), 6); mane.scale.setScalar(1 + f * 0.22); head.rotation.z = Math.sin(t * 9) * 0.06 * (1 - f); key.rotation.z = t * 6; } };
  },
  W8(m) { // 齒輪龍
    const g = new THREE.Group();
    part(g, G.sph(), m.main, [0, 0.034, 0], [0.036, 0.034, 0.032]);
    part(g, G.sph(), m.sub, [0, 0.032, 0.016], [0.025, 0.027, 0.02]);
    for (let i = 0; i < 3; i++) part(g, G.torus(Math.PI * 0.9, 0.18), m.main, [0, 0.022 + i * 0.011, 0.0335 - Math.abs(i - 1) * 0.002], [0.016 - Math.abs(i - 1) * 0.003, 0.004, 0.006], [0, 0, Math.PI * 0.05 + Math.PI]);
    const core = part(g, G.sph(), new THREE.MeshStandardMaterial({ color: '#ffd0a0', emissive: '#ff7a1a', emissiveIntensity: 1.6 }), [0, 0.05, 0.03], 0.0058);
    part(g, G.torus(Math.PI * 2, 0.3), m.brass, [0, 0.05, 0.031], 0.0072);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.018, 0.008, 0.014], [0.012, 0.008, 0.014]);
    const head = new THREE.Group(); head.position.set(0, 0.082, 0.004); g.add(head);
    const hs = [0.033, 0.029, 0.03];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    const sc = [0, -0.007, 0.022], ss = [0.019, 0.013, 0.014];
    part(head, G.sph(), m.main, sc, ss);
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.dark, sc, ss, k * 0.3, 0.35, { inset: 0.0006, scale: [0.0017, 0.0013, 0.0012] });
    smile(head, m, sc, ss, { pitch: -0.2, w: 0.0065, open: 0.6 });
    for (const k of [-1, 1]) part(head, tube([[0, 0, 0], [0.002, 0.008, -0.004], [0.004, 0.014, -0.012], [0.003, 0.016, -0.02]].map(([x, y, z]) => [k * x, y, z]), 0.0028, 16), m.acc2, [k * 0.014, 0.02, -0.004]);
    beads(head, m, [0, 0, 0], hs, { yaw: 0.4, pitch: 0.14, r: 0.006 });
    for (const k of [-1, 1]) onSurf(head, rbox(1, 0.3, 0.4, 0.4), m.dark, [0, 0, 0], hs, k * 0.42, 0.42, { inset: -0.0006, scale: 0.0085, roll: k * 0.25 });
    blush(head, m, [0, 0, 0], hs, { yaw: 0.68, pitch: -0.1, r: 0.0052 });
    // 齒輪翅膀
    const wings = [];
    for (const k of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(k * 0.026, 0.06, -0.022); w.rotation.y = k * 0.5; g.add(w);
      const big = part(w, gearGeo(12, 0.019, 0.0155, 0.004, 0.004), m.brass, [k * 0.012, 0.012, 0]);
      const small = part(w, gearGeo(8, 0.0115, 0.009, 0.003, 0.0035), m.brass, [k * 0.03, 0.002, 0.002]);
      wings.push({ w, big, small, k });
    }
    const tail = part(g, tube([[0, 0.012, -0.026], [0.012, 0.008, -0.04], [0.028, 0.012, -0.04], [0.036, 0.022, -0.03]], 0.005), m.main, [0, 0, 0]);
    const tg = part(g, gearGeo(8, 0.009, 0.0072, 0.002, 0.003), m.brass, [0.038, 0.026, -0.028], 1, [0, 0.8, 0]);
    void tail;
    const key = windKey(g, m, [0, 0.042, -0.033], 1.25);
    return { g, tick: (t) => { key.rotation.z = t * 1.2; wings.forEach((q) => { q.big.rotation.z = t * 0.8 * q.k; q.small.rotation.z = -t * 1.3 * q.k; }); tg.rotation.z = t; core.material.emissiveIntensity = 1.3 + Math.sin(t * 3) * 0.4; }, act: (t) => { wings.forEach((q) => { q.big.rotation.z = t * 4 * q.k; q.small.rotation.z = -t * 6.5 * q.k; q.w.rotation.y = q.k * (0.5 + Math.sin(t * 6) * 0.25); }); head.rotation.z = Math.sin(t * 2) * 0.1; core.material.emissiveIntensity = 1.6 + Math.abs(Math.sin(t * 6)) * 1.6; key.rotation.z = t * 5; } };
  },
  WH(m) { // 永動貓
    const g = new THREE.Group();
    part(g, G.sph(), m.main, [0, 0.032, 0], [0.034, 0.032, 0.03]);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.016, 0.007, 0.016], [0.011, 0.007, 0.013]);
    const tail = new THREE.Group(); tail.position.set(0.016, 0.01, -0.024); g.add(tail);
    part(tail, tube([[0, 0, 0], [0.018, 0.002, -0.004], [0.03, 0.014, 0.004], [0.028, 0.032, 0.012]], 0.0042), m.main, [0, 0, 0]);
    part(tail, G.sph(), m.sub, [0.028, 0.033, 0.012], 0.0052);
    const heart = new THREE.Group(); heart.position.set(0, 0.034, 0.03); g.add(heart);
    const hm = new THREE.MeshStandardMaterial({ color: '#ff8a6a', emissive: '#ff3a1a', emissiveIntensity: 2 });
    part(heart, heartGeo(), hm, [0, 0, 0], 0.009);
    const gears = [];
    for (let i = 0; i < 3; i++) { const gg = part(heart, gearGeo(8, 1, 0.8, 0.3, 0.3), m.sub, [0, 0, 0], 0.0042); gears.push(gg); }
    part(g, G.torus(Math.PI * 2, 0.25), m.sub, [0, 0.056, 0.002], [0.024, 0.024, 0.026], [Math.PI / 2, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, 0.078, 0.004); g.add(head);
    const hs = [0.032, 0.028, 0.029];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.cone(), m.main, [k * 0.018, 0.025, -0.002], [0.0105, 0.017, 0.0075], [0, 0, k * -0.38]); part(head, G.cone(), m.sub, [k * 0.018, 0.024, 0.002], [0.006, 0.011, 0.002], [0, 0, k * -0.38]); }
    const em = new THREE.MeshStandardMaterial({ color: '#fff0a0', emissive: '#ffc23a', emissiveIntensity: 2.2 });
    for (const k of [-1, 1]) { onSurf(head, G.sph(), em, [0, 0, 0], hs, k * 0.4, 0.1, { inset: 0.001, scale: [0.0062, 0.007, 0.003] }); onSurf(head, G.sph(), m.eye, [0, 0, 0], hs, k * 0.4, 0.1, { inset: -0.0012, scale: [0.0016, 0.0058, 0.0015] }); }
    onSurf(head, G.sph(), m.sub, [0, 0, 0], hs, 0, -0.08, { inset: 0.0006, scale: [0.0026, 0.0019, 0.0015] });
    catMouth(head, m, [0, 0, 0], hs, { pitch: -0.2, w: 0.0032, gap: 0.075, mat: m.sub });
    // 背上沒有發條：只有一圈光
    const ring = part(g, G.torus(Math.PI * 2, 0.3), m.sub, [0, 0.04, -0.032], 0.006);
    const glowDisk = part(g, G.disk(), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.5), side: THREE.DoubleSide }), [0, 0.04, -0.0322], 0.0045, [0, Math.PI, 0]);
    void ring; void glowDisk;
    return { g, tick: (t) => { const b = Math.pow(Math.max(0, Math.sin(t * 5)), 10); heart.scale.setScalar(1 + b * 0.18); hm.emissiveIntensity = 1.8 + b * 2.5; gears.forEach((q, i) => { const a = t * 1.5 + (i * Math.PI * 2) / 3; q.position.set(Math.cos(a) * 0.013, Math.sin(a) * 0.013, 0.002); q.rotation.z = t * 3; }); tail.rotation.y = Math.sin(t * 1.4) * 0.15; }, act: (t) => { tail.rotation.y = Math.sin(t * 3.5) * 0.4; head.rotation.z = Math.sin(t * 1.7) * 0.15; g.rotation.y = Math.sin(t * 0.9) * 0.3; } };
  },
  // ===== 甜點盲盒 =====
  K1(m) { // 草莓兔
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, G.sph(), m.main, [0, 0.024, 0], [0.026, 0.024, 0.023]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.012, 0.005, 0.014], [0.009, 0.006, 0.011]);
    const berry = new THREE.Group(); berry.position.set(0, 0.024, 0.026); body.add(berry);
    part(berry, G.sph(), m.sub, [0, 0, 0], [0.0085, 0.009, 0.008]);
    part(berry, G.cone(), m.acc, [0, 0.009, 0], [0.006, 0.003, 0.006]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.012, 0.026, 0.02], [0.0065, 0.0055, 0.0065]);
    const head = new THREE.Group(); head.position.set(0, 0.064, 0.002); body.add(head);
    const hs = [0.034, 0.031, 0.031];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(head, hm, 'K1', { iris: '#ff4a6a', iris3: '#ffc0d0', mouth: 'w', lash: true, ey: 0.46 }, { pitch0: -0.1 });
    const hood = part(head, new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, 1.3), m.sub, [0, 0.002, -0.004], [0.0375, 0.036, 0.0365], [-0.36, 0, 0]);
    void hood;
    const R = rnd(3);
    for (let i = 0; i < 26; i++) { const yaw = R() * Math.PI * 2, pitch = 0.2 + R() * 1.2; if (pitch < 0.3) continue; const c0 = V3(0, 0.002, -0.004); const { p, n } = surf([0, 0, 0], [0.0378, 0.0363, 0.0368], yaw, pitch); const pp = p.clone().applyAxisAngle(V3(1, 0, 0), -0.36).add(c0); const s2 = part(head, G.sph(), m.acc2, [pp.x, pp.y, pp.z], [0.0013, 0.0021, 0.0013]); s2.quaternion.setFromUnitVectors(V3(0, 1, 0), n.applyAxisAngle(V3(1, 0, 0), -0.36)); }
    const crown = new THREE.Group(); crown.position.set(0, 0.037, -0.016); crown.rotation.x = -0.36; head.add(crown);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; part(crown, G.sph(), m.acc, [Math.cos(a) * 0.009, 0, Math.sin(a) * 0.009], [0.008, 0.002, 0.004], [0, -a, 0]); }
    part(crown, G.cyl(), m.acc, [0, 0.005, 0], [0.0018, 0.008, 0.0018]);
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.019, 0.028, 0.0); e.rotation.z = k * -0.35; head.add(e); part(e, G.sph(), m.main, [0, 0.014, 0], [0.0072, 0.018, 0.0055]); part(e, G.sph(), m.blush, [0, 0.014, 0.004], [0.0042, 0.013, 0.002]); ears.push(e); }
    return { g, tick: (t) => { ears[0].rotation.z = -0.35 * -1 + Math.sin(t * 1.5) * 0.04; ears[1].rotation.z = -0.35 - Math.sin(t * 1.5 + 1) * 0.04; }, act: (t) => { const b = Math.abs(Math.sin(t * 3.6)); body.position.y = b * 0.012; ears.forEach((e, i) => { e.rotation.x = -b * 0.4; e.rotation.z = (i ? -0.35 : 0.35) + (i ? -1 : 1) * b * 0.2; }); head.rotation.z = Math.sin(t * 1.8) * 0.1; } };
  },
  K2(m) { // 棉花糖羊
    const g = new THREE.Group(), wool = new THREE.Group(); g.add(wool);
    for (const [x, z] of [[-0.016, 0.012], [0.016, 0.012], [-0.014, -0.014], [0.014, -0.014]]) part(g, G.cyl(), m.sub, [x, 0.008, z], [0.0055, 0.016, 0.0055]);
    part(wool, G.sph(), m.main, [0, 0.042, 0], [0.034, 0.03, 0.032]);
    const R = rnd(9), puffs = [];
    for (let i = 0; i < 30; i++) { const yaw = (i / 30) * Math.PI * 2 * 3.1 + R(), pitch = -0.6 + (i / 30) * 1.9; const { p } = surf([0, 0.042, 0], [0.034, 0.03, 0.032], yaw, pitch); if (p.z > 0.02 && p.y > 0.03 && Math.abs(p.x) < 0.02) continue; const r = 0.011 + R() * 0.005; puffs.push(part(wool, G.sph(), m.main, [p.x, p.y, p.z], r)); }
    const head = new THREE.Group(); head.position.set(0, 0.058, 0.026); g.add(head);
    const hs = [0.023, 0.025, 0.017];
    const hm = part(head, G.sph(), m.sub, [0, 0, 0], hs);
    paintedFace(head, hm, 'K2', { iris: '#8a5a3a', iris3: '#e8c8a0', mouth: 'pout', brow: 1, ex: 0.21, ey: 0.46, er: 0.22 }, { pitch0: -0.05, wide: 1.8, tall: 1.05 });
    for (let i = 0; i < 5; i++) part(head, G.sph(), m.main, [(i - 2) * 0.008, 0.022 + (i % 2) * 0.003, -0.004], 0.0085 + (i % 2) * 0.002);
    for (const k of [-1, 1]) { const h = part(head, G.torus(Math.PI * 1.4, 0.32), m.acc, [k * 0.022, 0.008, -0.004], 0.0075, [0, k * 0.7, k > 0 ? 0.6 : Math.PI - 0.6]); void h; part(head, G.sph(), m.sub, [k * 0.026, -0.002, -0.002], [0.007, 0.004, 0.004], [0, 0, k * -0.5]); }
    return { g, tick: (t) => { puffs.forEach((p, i) => { p.scale.setScalar(p.userData.s || (p.userData.s = p.scale.x)); }); }, act: (t) => { puffs.forEach((p, i) => { p.scale.setScalar(p.userData.s * (1 + Math.sin(t * 7 + i * 0.7) * 0.09)); }); wool.scale.set(1 + Math.sin(t * 3.5) * 0.03, 1 - Math.sin(t * 3.5) * 0.03, 1); head.rotation.z = Math.sin(t * 2) * 0.12; } };
  },
  K3(m) { // 布丁貓
    const g = new THREE.Group();
    part(g, G.sph(), m.main, [0, 0.025, 0], [0.027, 0.025, 0.024]);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.012, 0.005, 0.015], [0.009, 0.006, 0.01]);
    for (const k of [-1, 1]) part(g, G.sph(), m.main, [k * 0.014, 0.026, 0.02], [0.0065, 0.0055, 0.0065]);
    const tail = part(g, tube([[0.008, 0.01, -0.02], [0.022, 0.014, -0.026], [0.03, 0.03, -0.022], [0.026, 0.044, -0.012]], 0.0042), m.main, [0, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, 0.064, 0.003); g.add(head);
    const hs = [0.034, 0.03, 0.031];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(head, hm, 'K3', { iris: '#3a8cff', iris3: '#bfe4ff', mouth: 'w', ey: 0.47 }, { pitch0: -0.1 });
    for (const k of [-1, 1]) { part(head, G.cone(), m.main, [k * 0.022, 0.022, -0.002], [0.0095, 0.015, 0.007], [0, 0, k * -0.5]); part(head, G.cone(), m.blush, [k * 0.022, 0.021, 0.002], [0.0055, 0.0095, 0.002], [0, 0, k * -0.5]); }
    const pud = new THREE.Group(); pud.position.set(0, 0.026, -0.002); head.add(pud);
    part(pud, new THREE.LatheGeometry([[0, 0], [0.019, 0], [0.0195, 0.002], [0.016, 0.016], [0.0155, 0.018], [0, 0.018]].map(([r, y]) => new THREE.Vector2(r, y)), 48), m.sub, [0, 0, 0]);
    part(pud, G.sph(), m.acc, [0, 0.0172, 0], [0.0168, 0.0042, 0.0168]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; part(pud, G.sph(), m.acc, [Math.cos(a) * 0.0158, 0.0128, Math.sin(a) * 0.0158], [0.0028, 0.006, 0.0028]); }
    for (let i = 0; i < 3; i++) part(pud, G.torus(Math.PI * 2, 0.5), m.white, [0, 0.022 + i * 0.0036, 0], [0.0078 - i * 0.0022, 0.0078 - i * 0.0022, 0.0042], [Math.PI / 2, 0, 0]);
    part(pud, G.sph(), m.acc2, [0, 0.0345, 0], 0.0048);
    part(pud, tube([[0, 0.038, 0], [0.002, 0.044, -0.001], [0.005, 0.047, -0.002]], 0.0007, 8), m.dark, [0, 0, 0]);
    void tail;
    return { g, tick: (t) => { pud.scale.set(1 + Math.sin(t * 2.4) * 0.015, 1 - Math.sin(t * 2.4) * 0.02, 1 + Math.sin(t * 2.4) * 0.015); }, act: (t) => { const w = Math.sin(t * 9) * Math.exp(-((t * 1.2) % 1.6) * 2.2); pud.scale.set(1 + w * 0.12, 1 - w * 0.16, 1 + w * 0.12); pud.rotation.z = w * 0.2; head.rotation.z = Math.sin(t * 1.6) * 0.08; } };
  },
  K4(m) { // 甜甜圈熊
    const g = new THREE.Group(), all = new THREE.Group(); g.add(all);
    part(all, G.sph(), m.main, [0, 0.03, 0], [0.025, 0.026, 0.023]);
    const ring = new THREE.Group(); ring.position.set(0, 0.022, 0); all.add(ring);
    part(ring, G.torus(Math.PI * 2, 0.42), m.sub, [0, 0, 0], [0.03, 0.03, 0.026], [Math.PI / 2, 0, 0]);
    part(ring, G.torus(Math.PI * 2, 0.4), m.acc, [0, 0.0045, 0], [0.0302, 0.0302, 0.019], [Math.PI / 2, 0, 0]);
    const sprMats = ['#ffffff', '#ffe04a', '#5ad8ff', '#7aff9a', '#b87aff'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    const R = rnd(5);
    for (let i = 0; i < 28; i++) { const a = R() * Math.PI * 2, rr = 0.03 + (R() - 0.5) * 0.012; part(ring, G.cap(), sprMats[i % 5], [Math.cos(a) * rr, 0.0118, Math.sin(a) * rr], [0.0013, 0.0018, 0.0013], [Math.PI / 2, 0, a + R()]); }
    for (const k of [-1, 1]) part(all, G.sph(), m.main, [k * 0.024, 0.036, 0.016], [0.0075, 0.006, 0.0085]);
    const head = new THREE.Group(); head.position.set(0, 0.07, 0.002); all.add(head);
    const hs = [0.032, 0.029, 0.029];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.023, 0.021, -0.004], [0.0105, 0.0105, 0.008]); part(head, G.sph(), m.acc2, [k * 0.023, 0.021, -0.0003], [0.006, 0.006, 0.004]); }
    part(head, G.sph(), m.acc2, [0, -0.01, 0.022], [0.012, 0.0085, 0.0085]);
    paintedFace(head, hm, 'K4', { iris: '#5a3a1a', iris3: '#d8a878', mouth: 'none', ey: 0.42 }, { pitch0: -0.06 });
    onSurf(head, G.sph(), m.dark, [0, -0.01, 0.022], [0.012, 0.0085, 0.0085], 0, 0.45, { inset: 0.0008, scale: [0.0042, 0.003, 0.003] });
    smile(head, m, [0, -0.01, 0.022], [0.012, 0.0085, 0.0085], { pitch: -0.2, w: 0.0036, open: 0.7 });
    return { g, tick: (t) => { all.position.y = Math.sin(t * 1.5) * 0.002; }, act: (t) => { all.position.y = 0.004 + Math.sin(t * 2.2) * 0.006; all.rotation.z = Math.sin(t * 1.6) * 0.12; ring.rotation.y = t * 1.2; head.rotation.z = -Math.sin(t * 1.6) * 0.1; } };
  },
  K5(m) { // 冰淇淋龍
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, G.sph(), m.main, [0, 0.028, 0], [0.028, 0.027, 0.025]);
    part(body, G.sph(), m.acc2, [0, 0.026, 0.012], [0.02, 0.021, 0.015]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.013, 0.006, 0.014], [0.0095, 0.006, 0.011]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.016, 0.03, 0.02], [0.0062, 0.0052, 0.0062]);
    const tail = part(body, tube([[0, 0.01, -0.022], [0.016, 0.008, -0.03], [0.028, 0.014, -0.026], [0.032, 0.026, -0.016]], 0.0045), m.main, [0, 0, 0]);
    part(body, G.cone(), m.main, [0.033, 0.03, -0.014], [0.006, 0.008, 0.003], [0, 0, -0.6]);
    const wings = [];
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.quadraticCurveTo(0.3, 1, 1, 0.9); ws.quadraticCurveTo(0.8, 0.5, 0.95, 0.25); ws.quadraticCurveTo(0.5, 0.2, 0, 0);
    const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3 });
    for (const k of [-1, 1]) { const w = new THREE.Group(); w.position.set(k * 0.012, 0.04, -0.018); body.add(w); part(w, wg, m.acc, [0, 0, 0], [0.024 * k, 0.024, 0.024], [0, k * 0.5, 0]); wings.push(w); }
    const head = new THREE.Group(); head.position.set(0, 0.068, 0.003); body.add(head);
    const hs = [0.033, 0.03, 0.03];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(head, hm, 'K5', { iris: '#ff6a9a', iris3: '#ffd0e0', mouth: 'grin', brow: -1, ey: 0.46 }, { pitch0: -0.1 });
    const cone = new THREE.Group(); cone.position.set(0.004, 0.026, -0.002); cone.rotation.z = -0.18; head.add(cone);
    const scoop = part(cone, G.sph(), m.acc, [0, 0.004, 0], [0.017, 0.013, 0.017]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; part(cone, G.sph(), m.acc, [Math.cos(a) * 0.0145, -0.002 - (i % 3) * 0.002, Math.sin(a) * 0.0145], [0.0035, 0.006 + (i % 3) * 0.002, 0.0035]); }
    const wf = new THREE.MeshPhysicalMaterial({ color: m.sub.color, map: waffleTex(), roughness: 0.6, clearcoat: 0.2 }); m._slots.push(wf); wf.userData.P = m.sub.userData.P;
    part(cone, G.cone(), wf, [0, 0.03, 0], [0.012, 0.034, 0.012]);
    part(cone, G.sph(), m.acc2, [0, 0.016, 0], [0.0128, 0.003, 0.0128]);
    void scoop; void tail;
    for (const k of [-1, 1]) part(head, G.cone(), m.acc2, [k * 0.022, 0.014, -0.012], [0.0042, 0.012, 0.0042], [-0.5, 0, k * -0.7]);
    return { g, tick: (t) => { wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * Math.sin(t * 1.5) * 0.1; }); }, act: (t) => { wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * Math.sin(t * 10) * 0.5; }); body.position.y = Math.abs(Math.sin(t * 3)) * 0.01; cone.rotation.z = -0.18 + Math.sin(t * 6) * 0.08; } };
  },
  K6(m) { // 蛋糕貓頭鷹
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.044, 0], bs = [0.036, 0.042, 0.033];
    const bm = part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.acc2, [0, 0.032, 0.014], [0.024, 0.026, 0.02]);
    paintedFace(body, bm, 'K6', { iris: '#ffb21a', iris3: '#fff0a0', iris2: '#5a2a00', mouth: 'none', ex: 0.2, ey: 0.42, er: 0.26, wide: 0.96 }, { pitch0: 0.4, wide: 1.5, tall: 0.85 });
    const beak = onSurf(body, G.cone(), m.acc2, bc, bs, 0, 0.3, { inset: -0.002, scale: [0.0045, 0.008, 0.004] }); beak.rotateX(Math.PI / 2 + 0.6);
    for (const k of [-1, 1]) part(body, G.cone(), m.main, [k * 0.022, 0.084, -0.002], [0.007, 0.014, 0.006], [0, 0, k * -0.5]);
    const wings = [];
    for (const k of [-1, 1]) { const w = new THREE.Group(); w.position.set(k * 0.033, 0.05, 0); body.add(w); part(w, G.sph(), m.main, [k * 0.002, -0.012, 0], [0.007, 0.02, 0.016], [0, 0, k * 0.2]); wings.push(w); }
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) part(body, G.sph(), m.acc2, [k * 0.012 + (i - 1) * 0.004, 0.003, 0.02], [0.0024, 0.0024, 0.005]);
    const hat = new THREE.Group(); hat.position.set(-0.012, 0.086, 0); hat.rotation.z = 0.32; body.add(hat);
    part(hat, G.cone(), m.acc, [0, 0.014, 0], [0.012, 0.028, 0.012]);
    for (let i = 0; i < 6; i++) { const a = i * 1.1, y = 0.004 + (i % 3) * 0.008; const r = 0.012 * (1 - (y + 0.0) / 0.028); part(hat, G.sph(), m.white, [Math.cos(a) * r, y, Math.sin(a) * r], 0.0016); }
    part(hat, G.sph(), m.white, [0, 0.029, 0], 0.0042);
    const cake = new THREE.Group(); cake.position.set(0.026, 0.022, 0.028); body.add(cake);
    part(cake, G.cyl(), m.sub, [0, 0, 0], [0.011, 0.012, 0.011]);
    part(cake, G.cyl(), m.acc, [0, 0.0066, 0], [0.0115, 0.0024, 0.0115]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; part(cake, G.sph(), m.acc, [Math.cos(a) * 0.0108, 0.004, Math.sin(a) * 0.0108], [0.002, 0.0035, 0.002]); }
    part(cake, G.cyl(), new THREE.MeshStandardMaterial({ color: '#7ad8ff', roughness: 0.4 }), [0, 0.014, 0], [0.0012, 0.012, 0.0012]);
    const flame = part(cake, G.sph(), m.flame, [0, 0.0225, 0], [0.0022, 0.0042, 0.0022]);
    return { g, tick: (t) => { flame.scale.set(0.0022 * (1 + Math.sin(t * 23) * 0.12), 0.0042 * (1 + Math.sin(t * 17) * 0.18), 0.0022); }, act: (t) => { body.rotation.z = Math.sin(t * 2.2) * 0.14; hat.rotation.z = 0.32 + Math.sin(t * 4.4) * 0.12; wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.abs(Math.sin(t * 6)) * 0.5; }); flame.scale.set(0.0022 * (1 + Math.sin(t * 23) * 0.2), 0.0042 * (1.2 + Math.sin(t * 17) * 0.3), 0.0022); } };
  },
  K7(m) { // 珍奶章魚
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const hc = [0, 0.05, 0], hsz = [0.036, 0.035, 0.033];
    const hm = part(body, G.sph(), m.main, hc, hsz);
    paintedFace(body, hm, 'K7', { iris: '#5a3a2a', iris3: '#e8c0a0', mouth: 'o', ey: 0.44 }, { pitch0: -0.18, wide: 1.6, tall: 0.95 });
    const legs = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const L = new THREE.Group(); L.position.set(Math.sin(a) * 0.022, 0.02, Math.cos(a) * 0.022); L.rotation.y = a; body.add(L);
      part(L, tube([[0, 0, 0], [0, -0.008, 0.008], [0, -0.012, 0.018], [0, -0.006, 0.026], [0, 0.002, 0.026]], 0.0052, 16), m.main, [0, 0, 0]);
      const pearl = part(L, G.sph(), m.acc2, [0, 0.006, 0.027], 0.0052);
      legs.push({ L, pearl, a });
    }
    const lid = new THREE.Group(); lid.position.set(0, 0.08, -0.002); lid.rotation.z = 0.14; body.add(lid);
    part(lid, G.cyl(), m.sub, [0, 0, 0], [0.024, 0.004, 0.024]);
    part(lid, new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.glass, [0, 0.002, 0], [0.019, 0.014, 0.019]);
    part(lid, G.cyl(), m.acc, [0.006, 0.02, 0], [0.0032, 0.04, 0.0032], [0, 0, -0.32]);
    return { g, tick: (t) => { legs.forEach((q, i) => { q.L.rotation.x = Math.sin(t * 1.5 + i) * 0.06; }); }, act: (t) => { legs.forEach((q, i) => { q.L.rotation.x = Math.sin(t * 6 + i * 0.8) * 0.3; q.pearl.position.y = 0.006 + Math.abs(Math.sin(t * 6 + i * 0.8)) * 0.006; }); body.rotation.y = Math.sin(t * 1.2) * 0.3; body.position.y = Math.abs(Math.sin(t * 3)) * 0.004; } };
  },
  K8(m) { // 糖霜獨角獸
    const g = new THREE.Group();
    const liner = new THREE.LatheGeometry([[0, 0], [0.026, 0], [0.033, 0.024], [0, 0.024]].map(([r, y]) => new THREE.Vector2(r, y)), 72);
    { const P = liner.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); if (r < 1e-4) continue; const a = Math.atan2(x, z), k = 1 + Math.sin(a * 18) * 0.035; P.setX(i, x * k); P.setZ(i, z * k); } liner.computeVertexNormals(); }
    part(g, liner, m.acc3, [0, 0, 0]);
    for (let i = 0; i < 3; i++) part(g, G.torus(Math.PI * 2, 0.55), m.main, [0, 0.027 + i * 0.006, 0], [0.026 - i * 0.006, 0.026 - i * 0.006, 0.012], [Math.PI / 2, 0, 0]);
    const uni = new THREE.Group(); uni.position.y = 0.034; g.add(uni);
    part(uni, G.sph(), m.main, [0, 0.018, -0.002], [0.024, 0.022, 0.021]);
    for (const k of [-1, 1]) part(uni, G.sph(), m.main, [k * 0.012, 0.006, 0.016], [0.0075, 0.006, 0.009]);
    for (const k of [-1, 1]) part(uni, G.sph(), m.acc2, [k * 0.012, 0.0035, 0.022], [0.006, 0.003, 0.004]);
    const head = new THREE.Group(); head.position.set(0, 0.054, 0.004); uni.add(head);
    const hs = [0.031, 0.028, 0.029];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(head, hm, 'K8', { iris: '#b06aff', iris3: '#ffd0ff', iris2: '#2a0a5a', mouth: 'smile', lash: true, starPupil: 'rgba(255,255,255,.9)', ey: 0.46 }, { pitch0: -0.1 });
    for (const k of [-1, 1]) part(head, G.cone(), m.main, [k * 0.018, 0.023, -0.006], [0.0062, 0.012, 0.005], [0, 0, k * -0.45]);
    // 螺旋角
    const horn = new THREE.ConeGeometry(1, 1, 48, 24); { const P = horn.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const a = Math.atan2(x, z), r = Math.hypot(x, z); const tw = (y + 0.5) * 9; const k = 1 + Math.sin(a * 2 - tw) * 0.12; const na = a; P.setX(i, Math.sin(na) * r * k); P.setZ(i, Math.cos(na) * r * k); } horn.computeVertexNormals(); }
    const hornM = part(head, horn, m.acc2, [0, 0.038, 0.008], [0.0075, 0.03, 0.0075], [0.25, 0, 0]);
    // 彩虹鬃毛
    const mane = new THREE.Group(); head.add(mane);
    const cols = ['sub', 'acc', 'acc2', 'sub', 'acc', 'acc2', 'sub', 'acc'];
    for (let i = 0; i < 8; i++) { const a = -0.25 + i * 0.3; part(mane, G.sph(), m[cols[i]], [0.012 + Math.sin(i * 0.9) * 0.004 + i * 0.0012, 0.027 * Math.cos(a) - 0.002, -0.026 * Math.sin(a) - 0.004], 0.0092 - i * 0.0003); }
    for (const [x, y, z, c, r] of [[-0.007, 0.027, 0.012, 'sub', 0.0072], [0.002, 0.03, 0.006, 'acc', 0.0068], [-0.014, 0.022, 0.016, 'acc2', 0.006]]) part(mane, G.sph(), m[c], [x, y, z], r);
    const tail = new THREE.Group(); tail.position.set(0, 0.012, -0.024); uni.add(tail);
    for (let i = 0; i < 5; i++) part(tail, G.sph(), m[cols[i]], [Math.sin(i) * 0.004, 0.004 + i * 0.002, -i * 0.005], 0.0072 - i * 0.0006);
    const sp = [];
    for (let i = 0; i < 4; i++) { const s2 = part(head, star5(), m.star, [0, 0, 0], 0.0026); sp.push(s2); }
    return { g, tick: (t) => { sp.forEach((s2, i) => { const a = t * 1.1 + i * 1.6; s2.position.set(Math.cos(a) * 0.012, 0.04 + Math.sin(t * 2 + i) * 0.006, 0.008 + Math.sin(a) * 0.012); s2.rotation.y = t * 2; }); }, act: (t) => { uni.rotation.y = Math.sin(t * 1.4) * 0.35; head.rotation.z = Math.sin(t * 2.8) * 0.1; hornM.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 3)) * 0.8; sp.forEach((s2, i) => { const a = t * 3 + i * 1.6; s2.position.set(Math.cos(a) * 0.02, 0.03 + Math.sin(t * 4 + i) * 0.012, 0.008 + Math.sin(a) * 0.02); }); } };
  },
  KH(m) { // 午夜甜點師
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const pm = m.pearl;
    part(body, G.sph(), pm, [0, 0.028, 0], [0.027, 0.027, 0.024]);
    for (const k of [-1, 1]) part(body, G.sph(), pm, [k * 0.012, 0.006, 0.014], [0.0095, 0.006, 0.011]);
    part(body, G.sph(), m.acc, [0, 0.022, 0.012], [0.02, 0.019, 0.014]);
    part(body, star5(), m.sub, [0, 0.022, 0.0262], 0.0042);
    const tail = part(body, tube([[0.008, 0.01, -0.02], [0.022, 0.014, -0.026], [0.03, 0.03, -0.02], [0.026, 0.044, -0.01]], 0.0042), pm, [0, 0, 0]); void tail;
    const whisk = new THREE.Group(); whisk.position.set(0.024, 0.034, 0.016); whisk.rotation.set(0.3, 0, -0.4); body.add(whisk);
    part(whisk, G.cyl(), m.sub, [0, -0.008, 0], [0.0018, 0.016, 0.0018]);
    for (let i = 0; i < 4; i++) part(whisk, G.torus(Math.PI * 2, 0.06), m.sub, [0, 0.008, 0], [0.0045, 0.009, 0.0045], [0, (i / 4) * Math.PI, 0]);
    part(body, G.sph(), pm, [0.022, 0.03, 0.018], [0.0062, 0.0055, 0.0062]);
    const mac = new THREE.Group(); mac.position.set(-0.024, 0.03, 0.018); body.add(mac);
    for (const [y, c] of [[-0.003, '#ff9ad0'], [0.003, '#9ad8ff']]) part(mac, G.sph(), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 0.6 }), [0, y, 0], [0.0072, 0.0032, 0.0072]);
    part(mac, G.cyl(), m.white, [0, 0, 0], [0.006, 0.002, 0.006]);
    part(body, G.sph(), pm, [-0.02, 0.03, 0.016], [0.0062, 0.0055, 0.0062]);
    const head = new THREE.Group(); head.position.set(0, 0.066, 0.002); body.add(head);
    const hs = [0.033, 0.029, 0.03];
    const hm = part(head, G.sph(), pm, [0, 0, 0], hs);
    paintedFace(head, hm, 'KH', { iris: '#ffb21a', iris3: '#fff3b0', iris2: '#5a3000', mouth: 'w', lash: true, starPupil: 'rgba(255,250,220,.95)', ey: 0.46 }, { pitch0: -0.1 });
    for (const k of [-1, 1]) { part(head, G.cone(), pm, [k * 0.021, 0.021, -0.004], [0.009, 0.014, 0.0068], [0, 0, k * -0.5]); part(head, G.cone(), m.blush, [k * 0.021, 0.02, 0.0002], [0.005, 0.009, 0.002], [0, 0, k * -0.5]); }
    const hat = new THREE.Group(); hat.position.set(0, 0.024, -0.004); hat.rotation.x = -0.12; head.add(hat);
    part(hat, G.cyl(), m.white, [0, 0.008, 0], [0.019, 0.016, 0.019]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; part(hat, G.sph(), m.white, [Math.cos(a) * 0.014, 0.022, Math.sin(a) * 0.014], 0.011); }
    part(hat, G.sph(), m.white, [0, 0.028, 0], 0.014);
    part(hat, star5(), m.sub, [0, 0.009, 0.0195], 0.0052);
    const orb = [];
    for (let i = 0; i < 5; i++) orb.push(part(g, star5(), m.star, [0, 0, 0], 0.0028));
    return { g, tick: (t) => { orb.forEach((s2, i) => { const a = t * 0.8 + (i / 5) * Math.PI * 2; s2.position.set(Math.cos(a) * 0.05, 0.05 + Math.sin(t * 1.6 + i) * 0.012, Math.sin(a) * 0.04); s2.rotation.y = t * 2 + i; }); whisk.rotation.z = -0.4 + Math.sin(t * 2) * 0.1; }, act: (t) => { whisk.rotation.y = t * 8; whisk.rotation.z = -0.4 + Math.sin(t * 8) * 0.25; hat.rotation.z = Math.sin(t * 3) * 0.08; head.rotation.z = Math.sin(t * 1.5) * 0.1; orb.forEach((s2, i) => { const a = t * 2.2 + (i / 5) * Math.PI * 2; s2.position.set(Math.cos(a) * 0.05, 0.05 + Math.sin(t * 3 + i) * 0.02, Math.sin(a) * 0.04); }); } };
  },
  JH(m) { // 銀河貓
    const g = new THREE.Group(), vols = [];
    jel(g, m, 'main', G.sph(), [0, 0.03, 0], [0.036, 0.032, 0.032], null, { core: 0 });
    vols.push({ p: [0, 0.03, 0], s: [0.032, 0.028, 0.028] });
    const head = new THREE.Group(); head.position.set(0, 0.074, 0.006); g.add(head);
    const hs = [0.034, 0.029, 0.03];
    jel(head, m, 'main', G.sph(), [0, 0, 0], hs, null, { core: 0 });
    vols.push({ p: [0, 0.074, 0.006], s: [0.03, 0.025, 0.026] });
    for (const k of [-1, 1]) jel(head, m, 'main', G.cone(), [k * 0.019, 0.027, -0.002], [0.011, 0.018, 0.008], [0, 0, k * -0.38], { core: 0 });
    for (const k of [-1, 1]) jel(g, m, 'main', G.sph(), [k * 0.018, 0.006, 0.02], [0.01, 0.007, 0.012], null, { core: 0 });
    const tail = new THREE.Group(); tail.position.set(0.02, 0.01, -0.026); g.add(tail);
    const tc = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.022, 0.004, 0.006), V3(0.034, 0.018, 0.016), V3(0.028, 0.034, 0.024)]);
    jel(tail, m, 'main', new THREE.TubeGeometry(tc, 24, 0.006, 12), [0, 0, 0], 1, null, { core: 0 });
    // 發光的眼睛
    const em = new THREE.MeshStandardMaterial({ color: '#fff0a0', emissive: '#ffcf3a', emissiveIntensity: 2.6 });
    for (const k of [-1, 1]) onSurf(head, G.sph(), em, [0, 0, 0], hs, k * 0.42, 0.08, { inset: 0.001, scale: [0.0062, 0.0072, 0.003] });
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.eye, [0, 0, 0], hs, k * 0.42, 0.08, { inset: -0.0012, scale: [0.0016, 0.0058, 0.0015] });
    onSurf(head, G.sph(), m.blush, [0, 0, 0], hs, 0, -0.08, { inset: 0.0006, scale: [0.0028, 0.002, 0.0015] });
    catMouth(head, m, [0, 0, 0], hs, { pitch: -0.2, w: 0.0034, gap: 0.075 });
    // 肚子裡的銀河（不透明的小亮點，透過果凍看得到）
    const gal = new THREE.Group(); gal.position.set(0, 0.032, 0); gal.rotation.x = 0.5; g.add(gal);
    const R = rnd(41), list = [], cols = [];
    for (let i = 0; i < 260; i++) {
      const arm = i % 2, k = Math.pow(R(), 0.7), a = arm * Math.PI + k * 5.5 + (R() - 0.5) * 0.6, r = 0.002 + k * 0.024;
      const o = new THREE.OctahedronGeometry(0.0008 + R() * 0.0012, 0);
      o.translate(Math.cos(a) * r, (R() - 0.5) * 0.004, Math.sin(a) * r);
      const c = new THREE.Color().setHSL(k < 0.2 ? 0.12 : 0.55 + R() * 0.25, 0.9, 0.7);
      const n = o.attributes.position.count, ca = new Float32Array(n * 3); for (let j = 0; j < n; j++) { ca[j * 3] = c.r; ca[j * 3 + 1] = c.g; ca[j * 3 + 2] = c.b; }
      o.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      list.push(o);
    }
    const gm = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) });
    gal.add(new THREE.Mesh(mergeGeometries(list), gm));
    part(gal, G.sph(), m.star, [0, 0, 0], 0.0035);
    sand(g, m, [vols[1]], 30, 43, 0.0016);
    return { g, tick: (t) => { gal.rotation.y = t * 0.6; tail.rotation.y = Math.sin(t * 1.3) * 0.15; }, act: (t) => { gal.rotation.y = t * 1.8; tail.rotation.y = Math.sin(t * 3) * 0.35; head.rotation.z = Math.sin(t * 1.5) * 0.15; head.rotation.y = Math.sin(t * 0.8) * 0.25; } };
  },
};

// 色票：普通版、異色版
const PAL = {
  J1: [{ main: '#8fd0ff' }, { main: '#c49bff' }],
  J2: [{ main: '#ffcf3a', sub: '#fff0d8', acc: '#ffffff' }, { main: '#ff6f9f', sub: '#d8f4ff', acc: '#fff7a8' }, ['acc']],
  J3: [{ main: '#ffe04a', sub: '#ff8a2a' }, { main: '#9ff0d0', sub: '#ff6f95' }],
  J4: [{ main: '#ffaed0', sub: '#ff6f9f' }, { main: '#a8dcff', sub: '#4aa8ff' }],
  J5: [{ main: '#b0cfe6', sub: '#f4fbff', acc: '#4a5a72' }, { main: '#ffcf9f', sub: '#fff4e0', acc: '#7a4a2a' }, ['acc']],
  J6: [{ main: '#ffa8c6', sub: '#ff5a90' }, { main: '#9ff0ff', sub: '#2fbfff' }],
  J7: [{ main: '#3f86ff', sub: '#bfe0ff' }, { main: '#8a5cff', sub: '#ffc6f0' }],
  J8: [{ main: '#7f78ff', sub: '#d0c4ff', acc: '#ffe27a', acc2: '#ff9ad8' }, { main: '#ff6f4a', sub: '#ffd8a8', acc: '#fff2a0', acc2: '#ffb84a' }, ['acc']],
  JH: [{ main: '#2c2a8a' }, null],
  W1: [{ main: '#262a3e', sub: '#f6f8ff', acc: '#ff9a2a' }, { main: '#2f6bff', sub: '#fff4d8', acc: '#ffd23a' }],
  W2: [{ main: '#b8743a', sub: '#f2d6b0', acc: '#e8333a', acc2: '#ffffff' }, { main: '#ff9ac8', sub: '#fff0f6', acc: '#3a8cff', acc2: '#fff3a8' }],
  W3: [{ main: '#4fd25a', sub: '#e2ffb8', acc: '#2f8a3a' }, { main: '#ff8a3a', sub: '#ffe8b8', acc: '#c04a1a' }],
  W4: [{ main: '#32c2c8', sub: '#dfe6ee', acc: '#ff4a4a', acc2: '#ffd23a' }, { main: '#ff5a5a', sub: '#ffeacc', acc: '#3aa8ff', acc2: '#7aff8a' }],
  W5: [{ main: '#5f8cb8', sub: '#f4f6ff', acc: '#ff8a2a' }, { main: '#ff7ab0', sub: '#fff0f6', acc: '#3ad8a8' }],
  W6: [{ main: '#f6f7fb', sub: '#ffa848', acc: '#ff4a5a', acc2: '#4a7aff' }, { main: '#2a2e48', sub: '#d8d8e8', acc: '#ffd23a', acc2: '#ff5ad8' }],
  W7: [{ main: '#ffc84a', sub: '#e8682a', acc: '#fff0c8' }, { main: '#eef0ff', sub: '#8a5aff', acc: '#ffffff' }],
  W8: [{ main: '#e8333a', sub: '#ffd27a', acc2: '#2a2a3a' }, { main: '#2a3a8a', sub: '#9ff0ff', acc2: '#e8e8ff' }],
  WH: [{ main: '#121218', sub: '#ffcf5a' }, null],
  K1: [{ main: '#f8e8ec', sub: '#ff3f58', acc: '#4fcf5f', acc2: '#ffe08a' }, { main: '#fff8e6', sub: '#fff2ee', acc: '#3ab8a8', acc2: '#ff4a6a' }],
  K2: [{ main: '#f8e6ef', sub: '#ffcfb0', acc: '#e0b48a' }, { main: '#d6eeff', sub: '#fff0d8', acc: '#b8a0ff' }],
  K3: [{ main: '#f6e8d6', sub: '#ffd65a', acc: '#a8521a', acc2: '#ff2f45' }, { main: '#ece6ff', sub: '#ffb0d0', acc: '#ff6a9a', acc2: '#ffd23a' }],
  K4: [{ main: '#e8b47a', sub: '#f0c890', acc: '#ff8fc4', acc2: '#fff0dc' }, { main: '#f6f2ee', sub: '#d8a070', acc: '#6a3a1e', acc2: '#ffe0e8' }],
  K5: [{ main: '#9ff0cc', sub: '#e8b870', acc: '#ff98bf', acc2: '#fff4e2' }, { main: '#ffcf9f', sub: '#c88848', acc: '#7a4a2a', acc2: '#fff8f0' }],
  K6: [{ main: '#c4acff', sub: '#ffffff', acc: '#ff8ac8', acc2: '#fff1d0' }, { main: '#ffc878', sub: '#8a5a3a', acc: '#5ac8ff', acc2: '#ffffff' }],
  K7: [{ main: '#e8c4a0', sub: '#ffffff', acc: '#ff86ae', acc2: '#24140c' }, { main: '#c4ecbc', sub: '#ffffff', acc: '#5ac8ff', acc2: '#24140c' }],
  K8: [{ main: '#f6eef6', sub: '#ff9ed6', acc: '#86ccff', acc2: '#ffd86a', acc3: '#c8b4ff' }, { main: '#3a3a72', sub: '#ff7ad8', acc: '#6ad8ff', acc2: '#ffe08a', acc3: '#8a6aff' }],
  KH: [{ main: '#ffffff', sub: '#ffcf5a', acc: '#262a4a' }, null],
};

// ---------------- 對外 ----------------
Object.assign(FIG, FIG2);
Object.assign(PAL, PAL2);
export function hasFigure(cid) { return !!FIG[cid]; }
export function buildFigure(cid, v = 'n', opts = {}) {
  const ch = CHAR[cid];
  const [pal, alt, opaque] = PAL[cid] || [{ main: '#ffffff' }, null];
  const m = makeMats(ch, v, pal, alt, opaque || []);
  const b = FIG[cid](m, opts);
  // 動畫只動裡面那一層；外層留給開獎、陳列、房間去擺位置和縮放
  const root = new THREE.Group(); root.add(b.g); b.inner = b.g; b.g = root;
  b.mats = m; b.cid = cid; b.v = v;
  b.g.userData.fig = cid;
  b.g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  b.points = [];
  return b;
}
