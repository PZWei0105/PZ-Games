/* ───────────── 載具：坦克、裝甲運兵車、防空車、火箭砲車、武裝直升機、戰機 ─────────────
   都是側面朝右、原點在車底正中央的地面（直升機原點在機身中心）。
*/
const VPAL = {};
function vpal(id) {
  if (VPAL[id]) return VPAL[id];
  const base = {
    us: ['#6f7f3a', '#c9b98a'], red: ['#7e4339', '#c8a08a'], kaz: ['#8b5a34', '#d1a46a'], holder: ['#6b5246', '#b9a091'],
    ilya: ['#868b95', '#d84a5e'], severin: ['#4e484b', '#c23a48'], holderUs: ['#6b5246', '#b9a091'], ilyaUs: ['#868b95', '#d84a5e'],
  }[id] || ['#7e4339', '#c8a08a'];
  const b = base[0];
  const us = id.endsWith('Us');
  const v = { body: b, bodyD: shade(b, -0.3), bodyDD: shade(b, -0.5), bodyL: shade(b, 0.2), trim: base[1], accent: us ? '#9dff5c' : PAL[id] ? PAL[id].accent : '#ff5a3c', team: us ? 0 : PAL[id] ? PAL[id].team : 1 };
  VPAL[id] = v; return v;
}

function buildVehicleSprites() { /* 用到才畫（getV） */ }
function getV(kind, pal) {
  const key = 'v_' + kind + '_' + pal;
  if (SPR[key]) return SPR[key];
  const v = vpal(pal);
  const bolt = (g, x, y) => { g.fillStyle = shade(v.body, -0.45); g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - 0.3, y - 0.3, 0.4, 0, TAU); g.fill(); };
  switch (kind) {
    case 'tankHull': return mkSpr(key, -52, -40, 54, -8, (g) => {
      // 車體
      g.beginPath(); g.moveTo(-48, -22); g.lineTo(-46, -34); g.lineTo(28, -35); g.lineTo(50, -25); g.lineTo(46, -19); g.lineTo(-46, -19); g.closePath();
      fo(g, lg(g, 0, -35, 0, -19, [0, v.bodyL, 0.35, v.body, 1, v.bodyD]));
      g.strokeStyle = rgba(OUT, 0.45); g.lineWidth = 0.8; g.beginPath(); g.moveTo(28, -35); g.lineTo(30, -27); g.lineTo(48, -24); g.stroke();
      // 側裙裝甲
      g.beginPath(); g.moveTo(-47, -27); g.lineTo(42, -27); g.lineTo(46, -21); g.lineTo(42, -15); g.lineTo(-44, -15); g.lineTo(-48, -21); g.closePath();
      fo(g, lg(g, 0, -27, 0, -15, [0, v.body, 1, v.bodyD]));
      for (let x = -40; x <= 38; x += 13) bolt(g, x, -21);
      g.strokeStyle = rgba(OUT, 0.35); g.lineWidth = 0.6; for (let x = -34; x < 42; x += 26) { g.beginPath(); g.moveTo(x, -27); g.lineTo(x, -15); g.stroke(); }
      // 工具箱、排氣管、車燈
      rr(g, -40, -38, 14, 4.4, 1.2); fo(g, v.bodyD, OW * 0.8);
      rr(g, -51, -31, 5, 6, 1.4); fo(g, '#3a3532', OW * 0.8);
      rr(g, 40, -31, 5, 3.2, 1); fo(g, '#e9e2c0', OW * 0.7);
      // 隊伍標誌
      g.fillStyle = v.accent; g.globalAlpha = 0.9; rr(g, -8, -32.5, 10, 3.2, 1); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-44, -33.6, 70, 1.2);
    });
    case 'tankTurret': return mkSpr(key, -32, -62, 30, -32, (g) => {
      g.beginPath(); g.moveTo(-26, -36); g.lineTo(-28, -44); g.quadraticCurveTo(-24, -52, -10, -53); g.lineTo(12, -53); g.quadraticCurveTo(24, -52, 26, -44); g.lineTo(24, -36); g.closePath();
      fo(g, lg(g, 0, -53, 0, -36, [0, v.bodyL, 0.4, v.body, 1, v.bodyD]));
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-20, -51); g.lineTo(14, -51.4); g.stroke();
      // 指揮塔、機槍
      rr(g, -14, -58.5, 12, 6, 2); fo(g, v.bodyD, OW * 0.9);
      rr(g, -12, -61, 8, 3, 1.4); fo(g, v.body, OW * 0.8);
      rr(g, -4, -60.6, 12, 1.8, 0.6); fo(g, '#2c2e35', OW * 0.7);
      // 備用履帶片、潛望鏡
      for (let i = 0; i < 3; i++) { rr(g, -24 + i * 5, -46, 4.4, 6, 0.8); fo(g, '#3c3a38', OW * 0.6); }
      rr(g, 6, -56, 4, 3.4, 0.8); fo(g, '#2c2e35', OW * 0.7); g.fillStyle = '#9fe3ff'; g.fillRect(7, -55, 2, 1.2);
      bolt(g, 16, -46); bolt(g, 8, -40); bolt(g, -6, -40);
      g.fillStyle = v.trim; g.globalAlpha = 0.85; g.font = '900 6px sans-serif'; g.fillText(v.team ? '◆' : '7', 2, -41); g.globalAlpha = 1;
    });
    case 'tankBarrel': return mkSpr(key, -4, -6, 52, 6, (g) => {
      rr(g, -2, -5.4, 9, 10.8, 3); fo(g, lg(g, 0, -5, 0, 5, [0, v.bodyL, 1, v.bodyD])); // 防盾
      rr(g, 6, -2.2, 38, 4.4, 1.2); fo(g, lg(g, 0, -2.2, 0, 2.2, [0, v.bodyL, 0.5, v.body, 1, v.bodyD]));
      rr(g, 22, -3, 6, 6, 1.4); fo(g, v.bodyD, OW * 0.8); // 抽煙器
      rr(g, 43, -3.4, 7, 6.8, 1.2); fo(g, '#2f3036');   // 砲口制退器
      g.fillStyle = '#1a1a1e'; g.fillRect(45, -3.4, 1.2, 6.8); g.fillRect(47.4, -3.4, 1.2, 6.8);
    });
    case 'wheel': return mkSpr(key, -7, -7, 7, 7, (g) => {
      g.beginPath(); g.arc(0, 0, 6.2, 0, TAU); fo(g, '#2a2a2e');
      g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); fo(g, lg(g, -3, -3, 3, 3, [0, shade(v.body, 0.1), 1, v.bodyD]), OW * 0.7);
      g.fillStyle = '#2a2a2e'; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; g.beginPath(); g.arc(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0.75, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(0, 0, 1.3, 0, TAU); g.fillStyle = '#c8c3b0'; g.fill();
    });
    case 'tire': return mkSpr(key, -9, -9, 9, 9, (g) => {
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); fo(g, '#25252a');
      g.strokeStyle = '#3d3d44'; g.lineWidth = 1.4; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 6.4, Math.sin(a) * 6.4); g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); g.stroke(); }
      g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); fo(g, lg(g, -3, -3, 3, 3, [0, v.bodyL, 1, v.bodyD]), OW * 0.7);
      g.fillStyle = '#2a2a2e'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.arc(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.6, 0, TAU); g.fill(); }
    });
    case 'apc': return mkSpr(key, -50, -46, 50, -6, (g) => {
      g.beginPath(); g.moveTo(-46, -12); g.lineTo(-46, -36); g.lineTo(18, -37); g.lineTo(44, -24); g.lineTo(46, -14); g.lineTo(40, -10); g.lineTo(-42, -10); g.closePath();
      fo(g, lg(g, 0, -37, 0, -10, [0, v.bodyL, 0.4, v.body, 1, v.bodyD]));
      g.strokeStyle = rgba(OUT, 0.4); g.lineWidth = 0.8; g.beginPath(); g.moveTo(18, -37); g.lineTo(22, -26); g.lineTo(45, -22); g.moveTo(-46, -22); g.lineTo(40, -22); g.stroke();
      // 輪拱
      g.fillStyle = v.bodyDD; for (const x of [-30, -12, 12, 30]) { g.beginPath(); g.arc(x, -10, 9.4, Math.PI, TAU); g.fill(); }
      // 窗、門、射口
      rr(g, 24, -33, 9, 5, 1.4); fo(g, lg(g, 24, -33, 33, -28, [0, '#c9f1ff', 1, '#4b8fae']), OW * 0.8);
      rr(g, -18, -32, 22, 15, 1.4); g.strokeStyle = rgba(OUT, 0.5); g.lineWidth = 0.8; g.stroke();
      for (const x of [-12, -2]) { rr(g, x, -27, 4.4, 2, 0.6); fo(g, '#1d1d22', OW * 0.6); }
      rr(g, -44, -31, 4, 3, 0.8); fo(g, '#e9e2c0', OW * 0.6);
      for (let x = -40; x <= 36; x += 12) bolt(g, x, -34);
      g.fillStyle = v.accent; g.globalAlpha = 0.9; rr(g, 6, -33, 10, 3, 1); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-44, -35.6, 60, 1.2);
    });
    case 'apcRamp': return mkSpr(key, -2, -28, 6, 2, (g) => { rr(g, 0, -26, 4, 26, 1); fo(g, lg(g, 0, 0, 4, 0, [0, v.bodyD, 1, v.body])); for (let y = -22; y < 0; y += 5) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0.6, y, 2.8, 1); } });
    case 'apcTurret': return mkSpr(key, -12, -12, 26, 2, (g) => {
      g.beginPath(); g.moveTo(-9, 0); g.lineTo(-8, -8); g.quadraticCurveTo(0, -11, 8, -8); g.lineTo(10, 0); g.closePath(); fo(g, lg(g, 0, -11, 0, 0, [0, v.bodyL, 1, v.bodyD]));
    });
    case 'aaHull': return mkSpr(key, -46, -34, 48, -8, (g) => {
      g.beginPath(); g.moveTo(-42, -20); g.lineTo(-40, -30); g.lineTo(26, -31); g.lineTo(44, -23); g.lineTo(40, -18); g.lineTo(-40, -18); g.closePath();
      fo(g, lg(g, 0, -31, 0, -18, [0, v.bodyL, 0.4, v.body, 1, v.bodyD]));
      g.beginPath(); g.moveTo(-41, -25); g.lineTo(38, -25); g.lineTo(42, -19); g.lineTo(38, -14); g.lineTo(-38, -14); g.lineTo(-42, -19); g.closePath();
      fo(g, lg(g, 0, -25, 0, -14, [0, v.body, 1, v.bodyD]));
      for (let x = -34; x <= 34; x += 11) bolt(g, x, -19.5);
      g.fillStyle = v.accent; g.globalAlpha = 0.9; rr(g, -6, -29, 9, 2.8, 1); g.fill(); g.globalAlpha = 1;
    });
    case 'aaTurret': return mkSpr(key, -18, -18, 18, 2, (g) => {
      rr(g, -16, -14, 30, 14, 4); fo(g, lg(g, 0, -14, 0, 0, [0, v.bodyL, 1, v.bodyD]));
      rr(g, -6, -18, 9, 5, 2); fo(g, v.bodyD, OW * 0.8);
      g.fillStyle = '#9fe3ff'; rr(g, 6, -10, 5, 3.4, 1); g.fill(); g.strokeStyle = OUT; g.lineWidth = OW * 0.6; g.stroke();
    });
    case 'aaGun': return mkSpr(key, -4, -4, 36, 4, (g) => { rr(g, -2, -3, 10, 6, 2); fo(g, v.bodyD); rr(g, 6, -1.4, 26, 2.8, 0.8); fo(g, lg(g, 0, -1.4, 0, 1.4, [0, '#5a5e66', 1, '#2b2d33'])); rr(g, 30, -2.2, 4, 4.4, 1); fo(g, '#2b2d33'); });
    case 'radar': return mkSpr(key, -10, -12, 10, 2, (g) => { g.beginPath(); g.ellipse(0, -6, 9, 5, 0, 0, TAU); fo(g, lg(g, -9, 0, 9, 0, [0, '#9aa0a8', 1, '#e8ecf0'])); g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 2); g.stroke(); g.fillStyle = v.accent; g.beginPath(); g.arc(0, -6, 1.4, 0, TAU); g.fill(); });
    case 'truck': return mkSpr(key, -52, -46, 52, -6, (g) => {
      // 車架
      rr(g, -50, -18, 92, 6, 1.4); fo(g, '#3a3634');
      // 駕駛艙
      g.beginPath(); g.moveTo(18, -14); g.lineTo(18, -42); g.lineTo(38, -42); g.lineTo(48, -30); g.lineTo(48, -14); g.closePath();
      fo(g, lg(g, 0, -42, 0, -14, [0, v.bodyL, 0.4, v.body, 1, v.bodyD]));
      g.beginPath(); g.moveTo(30, -39); g.lineTo(37.4, -39); g.lineTo(44.6, -30); g.lineTo(30, -30); g.closePath(); fo(g, lg(g, 30, -39, 44, -30, [0, '#d4f4ff', 1, '#4b8fae']), OW * 0.8);
      g.fillStyle = 'rgba(30,30,40,.6)'; g.beginPath(); g.arc(34, -33, 3, Math.PI, TAU); g.fill(); // 駕駛的影子
      rr(g, 21, -36, 7, 9, 1.2); g.strokeStyle = rgba(OUT, 0.5); g.lineWidth = 0.8; g.stroke();
      rr(g, 45, -24, 4, 4, 1); fo(g, '#fff4c2', OW * 0.6);
      rr(g, 46, -18, 5, 6, 1); fo(g, '#2c2e35', OW * 0.7);
      // 車斗
      rr(g, -50, -26, 66, 9, 1.6); fo(g, lg(g, 0, -26, 0, -17, [0, v.body, 1, v.bodyD]));
      for (let x = -46; x < 14; x += 10) bolt(g, x, -21.5);
      g.fillStyle = v.accent; g.globalAlpha = 0.9; rr(g, 26, -27, 10, 3, 1); g.fill(); g.globalAlpha = 1;
    });
    case 'pod': return mkSpr(key, -34, -16, 12, 4, (g) => { // 火箭發射箱，支點在右下 (0,0)
      rr(g, -32, -14, 42, 14, 2); fo(g, lg(g, 0, -14, 0, 0, [0, v.bodyL, 0.5, v.body, 1, v.bodyD]));
      g.fillStyle = '#1d1d22'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(8.2 - j * 1.2, -11 + i * 3.2, 1.2, 0, TAU); g.fill(); }
      g.strokeStyle = rgba(OUT, 0.4); g.lineWidth = 0.7; g.beginPath(); g.moveTo(-32, -7); g.lineTo(10, -7); g.stroke();
      rr(g, -8, -16, 10, 3, 1); fo(g, v.bodyD, OW * 0.7);
    });
    case 'heli': return mkSpr(key, -72, -30, 54, 22, (g) => {
      // 尾桁、尾翼
      g.beginPath(); g.moveTo(-14, -8); g.lineTo(-62, -6); g.lineTo(-64, -1); g.lineTo(-14, 4); g.closePath(); fo(g, lg(g, 0, -8, 0, 4, [0, v.bodyL, 1, v.bodyD]));
      g.beginPath(); g.moveTo(-58, -6); g.lineTo(-66, -24); g.lineTo(-60, -24); g.lineTo(-50, -6); g.closePath(); fo(g, lg(g, 0, -24, 0, -6, [0, v.bodyL, 1, v.body]));
      rr(g, -54, 0, 12, 3, 1); fo(g, v.bodyD, OW * 0.8);
      // 機身
      g.beginPath(); g.moveTo(-18, -12); g.quadraticCurveTo(-14, -20, 2, -20); g.lineTo(22, -18); g.quadraticCurveTo(44, -12, 48, 2); g.quadraticCurveTo(42, 10, 26, 11); g.lineTo(-8, 11); g.quadraticCurveTo(-18, 8, -20, 0); g.closePath();
      fo(g, lg(g, 0, -20, 0, 11, [0, v.bodyL, 0.45, v.body, 1, v.bodyD]));
      // 座艙罩（前後座）
      g.beginPath(); g.moveTo(10, -18.5); g.quadraticCurveTo(22, -26, 32, -16); g.quadraticCurveTo(40, -10, 42, -4); g.lineTo(14, -6); g.closePath();
      fo(g, lg(g, 10, -24, 40, -4, [0, '#e2f8ff', 0.5, '#6ab4d6', 1, '#24506a']), OW * 0.9);
      g.strokeStyle = OUT; g.lineWidth = 0.9; g.beginPath(); g.moveTo(27, -19); g.lineTo(28, -5.4); g.stroke();
      g.fillStyle = 'rgba(30,30,40,.55)'; g.beginPath(); g.arc(21, -10, 3.2, Math.PI, TAU); g.fill(); g.beginPath(); g.arc(34, -8, 3, Math.PI, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(15, -16); g.quadraticCurveTo(21, -21, 26, -19); g.stroke();
      // 引擎、進氣口
      rr(g, -14, -26, 22, 8, 3); fo(g, lg(g, 0, -26, 0, -18, [0, v.bodyL, 1, v.body]));
      g.beginPath(); g.arc(6, -22, 3, 0, TAU); fo(g, '#1e1e24', OW * 0.7);
      rr(g, -18, -23, 6, 4, 1.4); fo(g, '#3a3532', OW * 0.7);
      // 短翼＋火箭莢艙
      rr(g, -10, -2, 18, 3.4, 1.2); fo(g, v.bodyD, OW * 0.8);
      rr(g, -12, 1, 22, 7, 3.2); fo(g, lg(g, 0, 1, 0, 8, [0, '#6b6f78', 1, '#34373e']));
      g.fillStyle = '#1b1b20'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(9.4, 2.6 + i * 2.2, 0.8, 0, TAU); g.fill(); }
      // 起落架
      g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, 10); g.lineTo(-8, 18); g.moveTo(20, 10); g.lineTo(22, 18); g.stroke();
      rr(g, -16, 17, 46, 2.6, 1.3); fo(g, '#2c2e35', OW * 0.7);
      g.fillStyle = v.accent; g.globalAlpha = 0.9; rr(g, -40, -5.6, 10, 3, 1); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-12, -18.4, 30, 1.2);
    });
    case 'chin': return mkSpr(key, -4, -4, 20, 4, (g) => { g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); fo(g, '#3a3c43'); rr(g, 2, -1, 16, 2, 0.6); fo(g, '#2b2d33'); });
    case 'jet': return mkSpr(key, -66, -20, 66, 16, (g) => {
      g.beginPath(); g.moveTo(-60, -2); g.lineTo(-56, -18); g.lineTo(-46, -18); g.lineTo(-36, -4); g.closePath(); fo(g, lg(g, 0, -18, 0, -2, [0, '#c7ccd4', 1, '#8a919c']));
      g.beginPath(); g.moveTo(-60, -1); g.quadraticCurveTo(-60, -6, -40, -6); g.lineTo(30, -7); g.quadraticCurveTo(56, -6, 64, 0); g.quadraticCurveTo(56, 5, 30, 6); g.lineTo(-40, 5); g.quadraticCurveTo(-60, 5, -60, -1); g.closePath();
      fo(g, lg(g, 0, -7, 0, 6, [0, '#e6e9ee', 0.5, '#a9b0ba', 1, '#6c7480']));
      g.beginPath(); g.moveTo(18, -6.5); g.quadraticCurveTo(30, -15, 44, -6); g.closePath(); fo(g, lg(g, 18, -13, 44, -6, [0, '#e2f8ff', 1, '#3d7c9c']), OW * 0.8);
      g.beginPath(); g.moveTo(-20, 2); g.lineTo(8, 2); g.lineTo(-30, 13); g.lineTo(-38, 13); g.closePath(); fo(g, lg(g, 0, 2, 0, 13, [0, '#b8bec7', 1, '#7f8792']));
      rr(g, -18, 5, 14, 3.4, 1.6); fo(g, '#4a4e57', OW * 0.7); rr(g, 0, 5, 14, 3.4, 1.6); fo(g, '#4a4e57', OW * 0.7);
      g.fillStyle = PAL.us.accent; rr(g, -10, -4, 9, 2.6, 1); g.fill();
      rr(g, -64, -3, 5, 6, 1.4); fo(g, '#3a3532', OW * 0.7);
    });
    case 'bomb': return mkSpr(key, -8, -3, 8, 3, (g) => { g.beginPath(); g.ellipse(0, 0, 6, 2.4, 0, 0, TAU); fo(g, '#4a4e57'); poly(g, [-6, 0, -9, -3, -9, 3]); fo(g, '#3a3e47', OW * 0.7); });
  }
  return null;
}

/* ── 載具動畫狀態 ── */
function newVehAnim(u, kind, pal) {
  u.vk = kind; u.pal = pal; u.face = u.face || 1; u.vx = u.vx || 0;
  u.dist = 0; u.pitch = 0; u.pitchV = 0; u.bob = 0; u.recoil = 0; u.coax = 0; u.ant = 0; u.antV = 0; u.aimA = 0; u.aimTA = 0;
  u.flash = 0; u.smokeT = 0; u.exT = 0; u.alpha = 1; u.wreck = false; u.burnT = 0;
  u.ramp = 0; u.pod = 0; u.jacks = 0; u.rotor = Math.random() * TAU; u.alt = 0; u.tilt = 0; u.spin = 0; u.radar = Math.random() * TAU;
  u.gunSide = 0; u.hpFrac = 1;
}
function animVeh(u, dt) {
  const prevV = u.prevVx || 0; u.prevVx = u.vx;
  const acc = (u.vx - prevV) / Math.max(dt, 0.001);
  u.dist += u.vx * dt;
  // 加減速時車身前後點頭（彈簧）
  const target = clamp(-acc * 0.0009 * u.face, -0.05, 0.05);
  u.pitchV += ((target - u.pitch) * 60 - u.pitchV * 9) * dt; u.pitch += u.pitchV * dt;
  u.bob = Math.abs(u.vx) > 2 ? Math.sin(u.dist * 0.35) * 0.5 : 0;
  u.recoil = Math.max(0, u.recoil - dt * 1.6);
  u.coax = Math.max(0, u.coax - dt * 12);
  u.flash = Math.max(0, u.flash - dt);
  // 天線彈簧
  u.antV += (-(u.ant) * 90 - u.antV * 5 - acc * 0.004 * u.face) * dt; u.ant += u.antV * dt;
  u.aimA = approachAng(u.aimA, u.aimTA, dt * 1.6);
  u.radar += dt * 2.4;
  if (u.vk === 'heli') { u.rotor += dt * 38; u.tilt = damp(u.tilt, clamp(u.vx * 0.006 * u.face, -0.22, 0.22), 3, dt); }
  // 排氣
  u.exT -= dt;
  if (u.exT <= 0 && !u.wreck && u.vk !== 'heli' && u.x !== undefined) {
    const moving = Math.abs(u.vx) > 3;
    u.exT = moving ? 0.12 : 0.5;
    const ex = u.vk === 'truck' ? 46 : -50;
    P('smoke', u.x + ex * u.face, u.y - 26, { vx: -u.face * rnd(10, 20) + WIND.x * 0.3, vy: -rnd(8, 18), max: rnd(0.7, 1.3), size: moving ? 0.12 : 0.08, grow: 0.32, alpha: moving ? 0.5 : 0.3, spr: FXS.smokeD });
    if (moving && (u.vk === 'tank' || u.vk === 'aa')) for (let i = 0; i < 2; i++) P('smoke', u.x - u.face * rnd(-40, 46), u.y - 2, { vx: -u.face * rnd(10, 30), vy: -rnd(6, 18), max: rnd(0.5, 0.8), size: 0.12, grow: 0.35, alpha: 0.6, spr: FXS.dust, layer: 0 });
    if (moving && DECAL && (u.vk === 'tank' || u.vk === 'aa')) { decalMark(u.x - u.face * 30, u.y - 2, 4, 1.3, 'rgba(110,100,92,.22)'); decalMark(u.x - u.face * 30, u.y + 2, 4, 1.3, 'rgba(110,100,92,.22)'); }
  }
  // 受損冒煙、起火
  if (!u.wreck && u.hpFrac < 0.55 && u.x !== undefined) {
    u.smokeT -= dt;
    if (u.smokeT <= 0) { u.smokeT = u.hpFrac < 0.25 ? 0.06 : 0.16; fxSmokeTrail(u.x - u.face * 18, u.y - 36, 1, true); if (u.hpFrac < 0.25) fxFlame(u.x - u.face * 22, u.y - 34, 0.7); }
  }
  if (u.wreck) {
    u.burnT += dt;
    if (u.burnT < 14 && chance(0.6)) fxFlame(u.x + rnd(-14, 14), u.y - 30, 1.1);
    if (u.burnT < 22 && chance(0.12)) fxSmokeTrail(u.x, u.y - 36, 1.6, true);
  }
}

/* 履帶：一圈粗帶子＋會流動的履帶片 */
function drawTrack(c, x0, x1, top, bot, offset, col) {
  const r = (bot - top) / 2, cy = (top + bot) / 2;
  const path = () => {
    c.beginPath(); c.moveTo(x0, top); c.lineTo(x1, top); c.arc(x1, cy, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x0, bot); c.arc(x0, cy, r, Math.PI / 2, Math.PI * 1.5); c.closePath();
  };
  path(); c.lineWidth = 7 + OW * 2; c.strokeStyle = OUT; c.stroke();
  c.lineWidth = 7; c.strokeStyle = '#2b2a2c'; c.stroke();
  c.setLineDash([2.2, 2.6]); c.lineDashOffset = -offset; c.lineWidth = 5.6; c.strokeStyle = col || '#4a4846'; c.stroke(); c.setLineDash([]);
  c.fillStyle = '#1f1e21'; path(); c.fill();
}

function drawVehicle(c, u) {
  const v = vpal(u.pal);
  c.save();
  c.translate(u.x, u.y);
  if (u.alpha < 1) c.globalAlpha = u.alpha;
  c.scale(u.face, 1);
  if (u.wreck) { drawWreck(c, u); c.restore(); return; }
  const k = u.vk;
  if (k === 'tank' || k === 'aa') {
    const tank = k === 'tank';
    const x0 = tank ? -38 : -34, x1 = tank ? 40 : 36, top = tank ? -23 : -21, bot = -0.6;
    drawTrack(c, x0, x1, top, bot, u.dist * u.face);
    const ws = getV('wheel', u.pal), rot = (u.dist * u.face) / 6;
    for (let i = 0; i < (tank ? 6 : 5); i++) dspr(c, ws, x0 + 3 + i * ((x1 - x0 - 6) / (tank ? 5 : 4)), -7.4 + (i % 2 ? u.bob : -u.bob) * 0.5, rot);
    dspr(c, ws, x0, -12, rot, 0.9); dspr(c, ws, x1, -12, rot, 0.9);
    c.translate(0, -8 + u.bob); c.rotate(u.pitch - u.recoil * 0.05); c.translate(0, 8 - u.recoil * 2.2);
    if (tank) {
      dspr(c, getV('tankHull', u.pal), 0, 0);
      // 天線（有彈性）
      c.save(); c.translate(-22, -52); c.lineCap = 'round';
      const a = u.ant, L = 30;
      c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(a * 6, -L * 0.55, a * 18, -L); c.stroke();
      c.strokeStyle = '#7d7f86'; c.lineWidth = 0.7; c.stroke();
      c.fillStyle = v.accent; c.beginPath(); c.arc(a * 18, -L, 1.4, 0, TAU); c.fill();
      c.restore();
      // 砲管：仰角＋後座
      c.save(); c.translate(22, -45); c.rotate(-u.aimA); c.translate(-u.recoil * 11, 0);
      dspr(c, getV('tankBarrel', u.pal), 0, 0);
      c.restore();
      dspr(c, getV('tankTurret', u.pal), 0, 0);
      if (u.coax > 0.5) { const gx = 26, gy = -42; c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gY, gx + 4, gy, 0, 0.18); c.globalCompositeOperation = 'source-over'; }
    } else { // 防空車
      dspr(c, getV('aaHull', u.pal), 0, 0);
      c.save(); c.translate(-4, -31);
      dspr(c, getV('aaTurret', u.pal), 0, 0);
      // 雷達旋轉（左右壓扁假裝在轉）
      c.save(); c.translate(-12, -14); c.scale(Math.cos(u.radar), 1); dspr(c, getV('radar', u.pal), 0, 0); c.restore();
      const ga = -u.aimA - 0.05;
      for (let i = 0; i < 2; i++) {
        c.save(); c.translate(4, -6 + i * 3.2); c.rotate(ga); c.translate(-(u.gunSide === i ? u.recoil : 0) * 4, 0);
        dspr(c, getV('aaGun', u.pal), 0, 0); c.restore();
      }
      c.restore();
    }
  } else if (k === 'apc') {
    const ts = getV('tire', u.pal), rot = (u.dist * u.face) / 8;
    c.save(); c.translate(0, u.bob * 0.6); c.rotate(u.pitch);
    // 後門（坡道）
    c.save(); c.translate(-46, -10); c.rotate(-u.ramp * 1.35); dspr(c, getV('apcRamp', u.pal), 0, 0); c.restore();
    dspr(c, getV('apc', u.pal), 0, 0);
    c.save(); c.translate(6, -37); dspr(c, getV('apcTurret', u.pal), 0, 0);
    c.translate(4, -6); c.rotate(-u.aimA); c.translate(-u.recoil * 3, 0);
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(20, 0); c.stroke(); c.strokeStyle = '#3d4048'; c.lineWidth = 1.8; c.stroke();
    c.restore();
    c.restore();
    for (const x of [-30, -12, 12, 30]) dspr(c, ts, x, -8, rot);
  } else if (k === 'truck') {
    const ts = getV('tire', u.pal), rot = (u.dist * u.face) / 8;
    // 支撐腳
    if (u.jacks > 0) { c.fillStyle = '#3a3634'; for (const x of [-46, -8]) { rr(c, x - 1.6, -18, 3.2, 18 * u.jacks, 1); c.fill(); c.strokeStyle = OUT; c.lineWidth = OW * 0.7; c.stroke(); rr(c, x - 3.6, -18 + 18 * u.jacks - 2, 7.2, 2.4, 0.8); c.fillStyle = '#2a2a2e'; c.fill(); } }
    c.save(); c.translate(0, u.bob * 0.5 - u.jacks * 1.5); c.rotate(u.pitch);
    dspr(c, getV('truck', u.pal), 0, 0);
    c.save(); c.translate(6, -26); c.rotate(-u.pod * 0.62 - u.recoil * 0.04); dspr(c, getV('pod', u.pal), 0, 0); c.restore();
    c.restore();
    for (const x of [-38, -24, 34]) dspr(c, ts, x, -8, rot);
  } else if (k === 'heli') {
    drawHeli(c, u, v);
  }
  c.restore();
}
function drawHeli(c, u, v) {
  c.rotate(u.tilt + (u.spin ? Math.sin(u.spin * 3) * 0.2 : 0));
  if (u.spin) c.scale(Math.cos(u.spin), 1);
  // 尾旋翼
  c.save(); c.translate(-62, -18);
  c.globalAlpha *= 0.55; c.fillStyle = 'rgba(40,40,46,.5)'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
  c.globalAlpha = u.alpha; c.strokeStyle = '#2a2a2e'; c.lineWidth = 1.6; const ta = u.rotor * 1.7;
  c.beginPath(); c.moveTo(Math.cos(ta) * -9, Math.sin(ta) * -9); c.lineTo(Math.cos(ta) * 9, Math.sin(ta) * 9); c.stroke();
  c.restore();
  dspr(c, getV('heli', u.pal), 0, 0);
  // 機鼻機砲（會轉向目標）
  c.save(); c.translate(36, 12); c.rotate(-u.aimA); c.translate(-u.coax * 2, 0); dspr(c, getV('chin', u.pal), 0, 0); c.restore();
  // 主旋翼：透視的葉片＋殘影圓盤
  c.save(); c.translate(-2, -27);
  c.fillStyle = 'rgba(30,32,38,.22)'; c.beginPath(); c.ellipse(0, 0, 64, 4.6, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(30,32,38,.35)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 64, 4.6, 0, 0, TAU); c.stroke();
  for (let i = 0; i < 4; i++) {
    const a = u.rotor + (i * TAU) / 4, x = Math.cos(a) * 62, y = Math.sin(a) * 4.2;
    c.strokeStyle = OUT; c.lineWidth = 3.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke();
    c.strokeStyle = '#4a4c52'; c.lineWidth = 1.6; c.stroke();
  }
  rr(c, -4, -4, 8, 6, 2); c.fillStyle = '#3a3c43'; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
  c.restore();
}
/* 殘骸：燒黑的車體 */
function drawWreck(c, u) {
  const k = u.vk;
  c.globalAlpha *= 0.95;
  const darken = (fn) => { fn(); };
  if (k === 'tank' || k === 'aa') {
    drawTrack(c, -38, 40, -23, -0.6, 0, '#2a2826');
    dspr(c, SPR['v_tankHull_' + u.pal + '_w'] || wreckSpr('tankHull', u.pal), 0, -2, 0.03);
  } else if (k === 'apc') dspr(c, SPR['v_apc_' + u.pal + '_w'] || wreckSpr('apc', u.pal), 0, 2, -0.04);
  else if (k === 'truck') dspr(c, SPR['v_truck_' + u.pal + '_w'] || wreckSpr('truck', u.pal), 0, 4, 0.05);
  else if (k === 'heli') dspr(c, SPR['v_heli_' + u.pal + '_w'] || wreckSpr('heli', u.pal), 0, -6, 0.2);
}
function wreckSpr(kind, pal) {
  const s = getV(kind, pal);
  return tintSpr('v_' + kind + '_' + pal + '_w', s, '#262220', 0.78);
}
/* 炮塔被炸飛時用的整塊圖 */
function turretSpr(pal) {
  const key = 'turretFull_' + pal; if (SPR[key]) return SPR[key];
  const t = getV('tankTurret', pal), b = getV('tankBarrel', pal);
  return mkSpr(key, -32, -62, 72, -32, (g) => { g.save(); g.translate(22, -45); g.drawImage(b.c, -b.ox, -b.oy, b.w, b.h); g.restore(); g.drawImage(t.c, -t.ox, -t.oy, t.w, t.h); }, 3);
}

/* 載具砲口在世界中的位置 */
function vehMuzzle(u, which) {
  const f = u.face;
  let px, py, a, len;
  if (u.vk === 'tank') { px = 22; py = -45 - 8 + 8; a = -u.aimA; len = 50 - u.recoil * 11; }
  else if (u.vk === 'apc') { px = 10; py = -43; a = -u.aimA; len = 20; }
  else if (u.vk === 'aa') { px = 0; py = -37 + (which || 0) * 3.2; a = -u.aimA - 0.05; len = 35; }
  else if (u.vk === 'heli') { const c = Math.cos(u.tilt), s = Math.sin(u.tilt); const lx = 36 + Math.cos(-u.aimA) * 18, ly = 12 + Math.sin(-u.aimA) * 18; return [u.x + f * (lx * c - ly * s), u.y + (lx * s + ly * c), f > 0 ? -u.aimA + u.tilt : Math.PI + u.aimA - u.tilt]; }
  else if (u.vk === 'truck') { const pa = -u.pod * 0.62; px = 6 + Math.cos(pa) * 9; py = -26 + Math.sin(pa) * 9 - 7; a = pa; len = 0; }
  const pc = Math.cos(u.pitch), ps = Math.sin(u.pitch);
  let lx = px + Math.cos(a) * len, ly = py + Math.sin(a) * len;
  const rx = lx * pc - ly * ps, ry = lx * ps + ly * pc;
  return [u.x + f * rx, u.y + ry, f > 0 ? a + u.pitch : Math.PI - a - u.pitch];
}
