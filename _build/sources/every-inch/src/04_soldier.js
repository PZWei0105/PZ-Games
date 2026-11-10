/* ───────────── 小兵：零件圖塊＋程序化骨架動畫 ─────────────
   側面朝右為基準（朝左時整個鏡射）。座標原點在腳底，y 往上是負的。
   畫的順序：背包 → 遠側腿 → 近側腿 → 遠側手臂（扣扳機）→ 軀幹 → 頭 → 槍 → 近側手臂（握護木）。
*/
const RIG = { THIGH: 9.0, SHIN: 9.2, TORSO: 14.6, UARM: 8.3, FARM: 8.2, HEAD: 8.6 };

/* ── 武器規格（原點在槍托尾端，朝 +x） ── */
const WEAP = {
  ar: { len: 28, grip: [10, 2.6], fore: [18.4, 1.4], muzzle: [28.3, -0.5], eject: [13.6, -2.3], magwell: [13.1, 1.5], charge: [11.6, -3.1], butt: [2.4, -0.6], lowA: 0.42, recD: 2.4, recR: 0.07, magDur: 1.55 },
  mg: { len: 34, grip: [11.2, 3.2], fore: [22.5, 2.2], muzzle: [34.6, -0.6], eject: [15.5, -3], magwell: [15.2, 2.6], charge: [13, -4.4], butt: [2.6, -0.4], bipod: [28.6, 1.4], lowA: 0.25, recD: 1.6, recR: 0.035, magDur: 2.6 },
  rpg: { len: 39, grip: [9.6, 5.6], fore: [15.6, 5.6], muzzle: [39, 0], eject: [0, 0], butt: [11, 2.6], back: [0, 0], lowA: -0.18, recD: 3.6, recR: 0.18, magDur: 2.5 },
  sr: { len: 38, grip: [11, 2.7], fore: [4.8, 2.6], muzzle: [38.6, -0.6], eject: [14.6, -1.6], bolt: [13.8, 1.9], magwell: [16, 1.6], butt: [2.4, -0.7], bipod: [31, 1.2], lowA: 0.38, recD: 3.2, recR: 0.16, magDur: 0.95 },
  ft: { len: 25, grip: [8, 2.8], fore: [15.6, 1.6], muzzle: [25.6, -0.4], eject: [0, 0], butt: [1.5, 1.6], lowA: 0.22, recD: 0.5, recR: 0.01, magDur: 0 },
};

function buildWeaponSprites() {
  const sides = [['us', '#2a2b31', '#3b3d45', '#4f525b', '#2b2c31', '#596046'], ['en', '#3a2a22', '#3a3c43', '#50535b', '#6d4429', '#7d4f2f']];
  for (const [sd, dark, body, light, furn, furnL] of sides) {
    const en = sd === 'en';
    // 突擊步槍（我方黑色聚合物、敵方木頭槍托）
    mkSpr('ar_' + sd, -1, -7, 30, 6, (g) => {
      poly(g, [0, -1.6, 6.6, -2.4, 7.6, -2.4, 7.6, 2, 5.4, 2.2, 1.2, 3.4, 0, 3.2]); fo(g, en ? lg(g, 0, -2, 0, 3, [0, furnL, 1, furn]) : furn);
      rr(g, 6.8, -3.1, 10, 4.6, 0.8); fo(g, lg(g, 0, -3, 0, 1.5, [0, light, 1, body]));
      if (!en) { rr(g, 9.4, -5.8, 4.6, 2.8, 0.8); fo(g, dark); g.fillStyle = '#ff4b3a'; g.beginPath(); g.arc(13.6, -4.4, 0.8, 0, TAU); g.fill(); }
      else { poly(g, [11, -3.1, 16.5, -3.1, 16.5, -3.9, 11, -3.6]); fo(g, body); }
      poly(g, [9, 1.2, 11.6, 1.2, 10.8, 5.2, 8.8, 4.9]); fo(g, dark);
      rr(g, 16.4, -2.7, 6.8, 4, 0.9); fo(g, en ? lg(g, 0, -2.7, 0, 1.3, [0, furnL, 1, furn]) : lg(g, 0, -2.7, 0, 1.3, [0, light, 1, body]));
      if (!en) { g.fillStyle = dark; for (let i = 0; i < 3; i++) { rr(g, 17.6 + i * 1.9, -1.6, 1.1, 1.8, 0.4); g.fill(); } }
      rr(g, 23, -1.1, 4.4, 1.5, 0.4); fo(g, body);
      if (en) { rr(g, 23.4, -2.6, 0.9, 1.6, 0.2); fo(g, dark); }
      rr(g, 26.8, -1.7, 2.2, 2.7, 0.5); fo(g, dark);
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(7.6, -2.5); g.lineTo(16.2, -2.5); g.stroke();
    });
    mkSpr('arMag_' + sd, -3, -1, 4, 8, (g) => {
      if (en) { g.beginPath(); g.moveTo(-1.6, 0); g.lineTo(1.6, 0); g.quadraticCurveTo(2.8, 3.4, 4.2, 6.4); g.lineTo(1.4, 7.2); g.quadraticCurveTo(0.2, 4, -1.6, 0.6); g.closePath(); fo(g, '#b5622a'); }
      else { poly(g, [-1.6, 0, 1.6, 0, 2.5, 5.4, -0.5, 5.9]); fo(g, '#2a2b30'); }
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-0.6, 1); g.lineTo(0.2, 4.6); g.stroke();
    });
    // 輕機槍
    mkSpr('mg_' + sd, -1, -8, 37, 9, (g) => {
      poly(g, [0, -1.8, 8, -2.8, 9, -2.8, 9, 2.4, 6.4, 2.6, 1.2, 4, 0, 3.6]); fo(g, en ? lg(g, 0, -2, 0, 3, [0, furnL, 1, furn]) : furn);
      rr(g, 8.4, -4, 13.6, 6.4, 1); fo(g, lg(g, 0, -4, 0, 2.4, [0, light, 1, body]));
      rr(g, 9.6, -5.6, 9, 2.2, 0.8); fo(g, dark); // 供彈蓋
      rr(g, 13.6, -8, 5, 2.4, 0.8); fo(g, body); // 提把
      poly(g, [10, 2.2, 12.8, 2.2, 12, 6, 9.8, 5.7]); fo(g, dark);
      rr(g, 21.6, -2.8, 10.4, 4.2, 1.4); fo(g, lg(g, 0, -2.8, 0, 1.4, [0, light, 1, body]));
      g.fillStyle = dark; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(23.4 + i * 2.3, -0.7, 0.65, 0, TAU); g.fill(); }
      rr(g, 31.6, -1.2, 3.4, 1.6, 0.4); fo(g, body);
      rr(g, 33.6, -1.9, 2.4, 2.9, 0.6); fo(g, dark);
    });
    mkSpr('mgBox_' + sd, -4, -1, 4, 8, (g) => { rr(g, -3.4, 0, 6.8, 6.4, 1); fo(g, en ? '#5d6450' : '#59683a'); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-3.4, 0, 6.8, 1.5); });
    // 火箭筒（筒身、彈頭分開）
    mkSpr('rpg_' + sd, -1, -7, 32, 8, (g) => {
      poly(g, [0, -3.2, 2.6, -2.3, 2.6, 2.3, 0, 3.2]); fo(g, dark);
      rr(g, 2.2, -2.4, 28.4, 4.8, 1.6); fo(g, lg(g, 0, -2.4, 0, 2.4, [0, '#5a5f69', 0.45, '#383c44', 1, '#24272d']));
      rr(g, 8.6, -2.9, 11.6, 5.8, 1.4); fo(g, lg(g, 0, -2.9, 0, 2.9, en ? [0, '#b07a45', 0.5, '#8a5a30', 1, '#5f3c1f'] : [0, '#c9b98a', 0.5, '#a5966a', 1, '#77694a']));
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10.4 + i * 2.6, -2.6); g.lineTo(10.4 + i * 2.6, 2.6); g.stroke(); }
      rr(g, 27.4, -3, 3.4, 6, 1); fo(g, '#2a2d33');
      rr(g, 12, -6.2, 3.2, 4, 0.6); fo(g, dark);
      poly(g, [8.6, 2.2, 10.8, 2.2, 10.4, 6.6, 8.4, 6.4]); fo(g, dark);
      poly(g, [14.6, 2.2, 16.8, 2.2, 16.4, 6.6, 14.4, 6.4]); fo(g, dark);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(6, -2.3); g.lineTo(6, 2.3); g.moveTo(24, -2.3); g.lineTo(24, 2.3); g.stroke();
    });
    mkSpr('rpgW_' + sd, -1, -5, 11, 5, (g) => {
      rr(g, 0, -1.6, 3, 3.2, 0.5); fo(g, '#4b5038');
      g.beginPath(); g.moveTo(2.6, -3.6); g.quadraticCurveTo(9, -3.4, 10.6, 0); g.quadraticCurveTo(9, 3.4, 2.6, 3.6); g.closePath();
      fo(g, lg(g, 0, -3.6, 0, 3.6, [0, '#a5ad7c', 0.5, '#7b845a', 1, '#565d3d']));
    });
    // 狙擊槍
    mkSpr('sr_' + sd, -1, -9, 41, 6, (g) => {
      g.beginPath(); g.moveTo(0, -2.4); g.lineTo(9.6, -2.6); g.lineTo(11, -1.6); g.lineTo(11, 2); g.lineTo(7.6, 2.4); g.quadraticCurveTo(4, 2.2, 1.4, 4.2); g.lineTo(0, 3.8); g.closePath();
      fo(g, en ? lg(g, 0, -2, 0, 3, [0, furnL, 1, furn]) : lg(g, 0, -2, 0, 3, [0, '#4d5340', 1, '#353a2c']));
      rr(g, 10.4, -2.8, 9.8, 4, 0.8); fo(g, lg(g, 0, -2.8, 0, 1.2, [0, light, 1, body]));
      rr(g, 10.8, -7.4, 12.6, 3.2, 1.4); fo(g, lg(g, 0, -7.4, 0, -4.2, [0, '#54575f', 1, '#25262b']));
      rr(g, 8.8, -8, 3, 4.2, 1); fo(g, dark); rr(g, 22, -8.2, 3.2, 4.6, 1); fo(g, dark);
      g.fillStyle = '#7fd4ff'; g.globalAlpha = 0.85; rr(g, 24.4, -7.6, 0.8, 3.4, 0.3); g.fill(); g.globalAlpha = 1;
      rr(g, 12, -4.4, 1.4, 1.8, 0.4); fo(g, dark); rr(g, 19.4, -4.4, 1.4, 1.8, 0.4); fo(g, dark);
      poly(g, [10.6, 1.2, 12.8, 1.2, 12.2, 5, 10.4, 4.8]); fo(g, dark);
      rr(g, 20, -2, 14, 2.6, 1); fo(g, en ? furn : '#353a2c');
      rr(g, 33.6, -1, 4.6, 1.3, 0.4); fo(g, body);
      rr(g, 37.6, -1.7, 2.2, 2.7, 0.5); fo(g, dark);
    });
    // 火焰噴射器（噴槍）
    mkSpr('ft_' + sd, -1, -6, 28, 7, (g) => {
      rr(g, 0, -1.5, 9, 3.4, 1.2); fo(g, dark);
      rr(g, 7.6, -2.6, 12, 4.6, 1.4); fo(g, lg(g, 0, -2.6, 0, 2, [0, light, 1, body]));
      rr(g, 9.4, -5.2, 6.4, 2.8, 1); fo(g, '#8a3a24');
      poly(g, [6.6, 1.6, 9, 1.6, 8.4, 5.8, 6.4, 5.6]); fo(g, dark);
      poly(g, [14.4, 1.6, 16.6, 1.6, 16.2, 5.6, 14.2, 5.4]); fo(g, dark);
      rr(g, 19.4, -1.4, 5, 2.4, 0.6); fo(g, body);
      poly(g, [23.8, -2.4, 26.4, -3, 26.4, 2.2, 23.8, 1.6]); fo(g, dark);
    });
  }
  // 噴火兵背的油桶
  for (const id of Object.keys(PAL)) {
    const p = PAL[id];
    mkSpr('tanks_' + id, -15, -22, -2, 0, (g) => {
      for (const [x, c] of [[-13.4, p.team ? '#a53a2a' : '#7a8a3c'], [-9.4, p.team ? '#c24a32' : '#8d9f48']]) {
        rr(g, x, -20.5, 5.6, 17, 2.8); fo(g, lg(g, x, 0, x + 5.6, 0, [0, shade(c, -0.25), 0.5, c, 1, shade(c, 0.2)]));
        rr(g, x + 1.6, -22, 2.4, 2, 0.6); fo(g, '#2c2e35');
      }
      rr(g, -14, -12, 11, 2, 0.6); fo(g, p.belt);
    });
  }
}

/* ── 軀幹、背包、頭（依勢力配色與頭飾） ── */
function buildBodySprites(id) {
  const p = PAL[id];
  const coat = p.gear === 'ushanka' || p.gear === 'mask';
  // 軀幹：原點在髖部，往上 15
  mkSpr('torso_' + id, -9, -19, 10, 9, (g) => {
    if (coat) { // 大衣下擺
      g.beginPath(); g.moveTo(-6.8, -2); g.lineTo(-8, 7.4); g.lineTo(-1, 8); g.lineTo(0.6, 3.6); g.lineTo(2.4, 8); g.lineTo(7.6, 7.2); g.lineTo(6.8, -2); g.closePath();
      fo(g, lg(g, -8, 0, 8, 0, [0, p.clothD, 0.55, p.cloth, 1, p.clothL]));
      g.strokeStyle = rgba(OUT, 0.5); g.lineWidth = 0.6; g.beginPath(); g.moveTo(0.6, 3.6); g.lineTo(0.4, -1); g.stroke();
    }
    rr(g, -6.6, -16.6, 13.6, 18, 4.4); fo(g, lg(g, -6.6, 0, 7, 0, [0, p.clothD, 0.45, p.cloth, 1, p.clothL]));
    // 衣領
    g.beginPath(); g.moveTo(-3.4, -16.6); g.quadraticCurveTo(1.2, -18.4, 5.4, -16.2); g.lineTo(4.2, -14.6); g.quadraticCurveTo(1, -15.6, -2.4, -14.8); g.closePath(); fo(g, p.clothL, OW * 0.8);
    // 戰術背心
    rr(g, -5.8, -14, 12.8, 11.6, 2.8); fo(g, lg(g, -5.8, 0, 7, 0, [0, p.vestD, 0.5, p.vest, 1, p.vestL]));
    g.strokeStyle = rgba(OUT, 0.55); g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(-2.8, -14); g.lineTo(-3.4, -2.6); g.stroke();
    // 胸前彈匣袋
    for (let i = 0; i < 2; i++) {
      const x = 0.6 + i * 3.1;
      rr(g, x, -8.6, 2.8, 5.6, 0.7); fo(g, p.vestD, OW * 0.7);
      rr(g, x - 0.2, -8.9, 3.2, 1.9, 0.6); fo(g, p.vestL, OW * 0.6);
    }
    // 無線電／臂章用的小方塊
    rr(g, -4.6, -12.6, 3.2, 3.6, 0.6); fo(g, p.vestD, OW * 0.7);
    g.fillStyle = p.accent; rr(g, -4.1, -12.1, 2.2, 0.9, 0.3); g.fill();
    // 腰帶
    rr(g, -6.8, -2.6, 14, 3.1, 1); fo(g, p.belt, OW * 0.9);
    rr(g, 4.4, -2.4, 2.4, 2.7, 0.5); fo(g, '#c9b06a', OW * 0.6);
    // 亮邊
    g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(6.2, -12); g.lineTo(6.2, -3.6); g.stroke();
  });
  // 背包：原點在髖部
  mkSpr('pack_' + id, -14, -22, -2, 0, (g) => {
    rr(g, -11.8, -16.4, 7.8, 12.6, 2.4); fo(g, lg(g, -12, 0, -4, 0, [0, p.packD, 1, p.pack]));
    rr(g, -12.2, -16.8, 8.4, 4.4, 2.2); fo(g, p.packD, OW * 0.9);
    rr(g, -12.6, -20.4, 9.4, 4.2, 2.1); fo(g, lg(g, 0, -20.4, 0, -16.2, [0, p.team ? '#8b8f96' : '#86955f', 1, p.team ? '#5d6168' : '#5b6a3c']), OW * 0.9);
    g.strokeStyle = rgba(OUT, 0.5); g.lineWidth = 0.6; g.beginPath(); g.moveTo(-9.6, -20.2); g.lineTo(-9.6, -16.4); g.moveTo(-6.4, -20.2); g.lineTo(-6.4, -16.4); g.stroke();
    rr(g, -9.2, -11, 2.6, 3, 0.6); fo(g, '#b9a46a', OW * 0.6);
  });
  // 火箭兵的彈袋（背兩發）
  mkSpr('quiver_' + id, -16, -28, -2, 0, (g) => {
    rr(g, -12.6, -18, 7.6, 14, 2.4); fo(g, lg(g, -12, 0, -5, 0, [0, p.packD, 1, p.pack]));
    for (const x of [-11.6, -8.4]) {
      g.beginPath(); g.moveTo(x, -18); g.quadraticCurveTo(x + 1.6, -26, x + 3.2, -18); g.closePath(); fo(g, lg(g, x, -26, x, -18, [0, '#a5ad7c', 1, '#5f6744']));
    }
  });
  // 頭：原點在頭中心
  mkSpr('head_' + id, -14, -16, 14, 12, (g) => {
    // 臉＋臉頰＋鼻子：先粗描邊再填色，得到聯集外框
    const face = () => {
      g.beginPath(); g.ellipse(0.2, 0.6, 8.6, 8.2, 0, 0, TAU);
      g.moveTo(9.4, 3.2); g.ellipse(5.4, 3.6, 4.2, 3.7, 0, 0, TAU);
      g.moveTo(10, 1.2); g.arc(8.4, 1.2, 1.7, 0, TAU);
    };
    face(); g.lineWidth = OW * 2; g.strokeStyle = OUT; g.stroke();
    face(); g.fillStyle = lg(g, -6, -6, 8, 8, [0, shade(p.skin, 0.08), 0.6, p.skin, 1, p.skinD]); g.fill();
    // 耳朵
    g.beginPath(); g.ellipse(-1.6, 1.8, 2.2, 2.7, 0.15, 0, TAU); fo(g, p.skinS, OW * 0.8);
    g.strokeStyle = rgba(p.skinD, 0.9); g.lineWidth = 0.6; g.beginPath(); g.arc(-1.5, 1.9, 1.1, -1.2, 1.6); g.stroke();
    // 臉頰紅暈
    g.fillStyle = 'rgba(255,120,110,.22)'; g.beginPath(); g.ellipse(4.2, 3.6, 2.3, 1.4, 0, 0, TAU); g.fill();
    const gear = p.gear;
    if (gear === 'helmet' || gear === 'helmetR') {
      const helm = () => {
        g.beginPath(); g.moveTo(-10.8, 1.6);
        g.bezierCurveTo(-11.6, -7.6, -6, -12.6, 0.4, -12.4);
        g.bezierCurveTo(7.6, -12.2, 11, -7.2, 10.8, -1.8);
        g.lineTo(12.6, -0.8); g.lineTo(12, 0.9); g.lineTo(-11.8, 2.8); g.closePath();
      };
      helm(); fo(g, lg(g, 4, -12, -6, 2, [0, p.helmL, 0.45, p.helm, 1, p.helmD]));
      g.save(); helm(); g.clip();
      g.fillStyle = p.helmD; g.fillRect(-13, -2.4, 27, 2.6);
      g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-8 + i * 2.2, -6 + Math.sin(i * 2.1) * 2, 0.55, 0, TAU); g.fill(); }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.1; g.beginPath(); g.arc(0.6, -1.5, 9, -1.95, -0.85); g.stroke();
      if (gear === 'helmet') { // 頭盔上的護目鏡
        g.strokeStyle = '#2a2622'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9.6, -5.6); g.quadraticCurveTo(0, -9.4, 6.4, -7.8); g.stroke();
        rr(g, 3.2, -10, 6.6, 3.8, 1.6); fo(g, '#2b2a2e');
        rr(g, 4.1, -9.3, 4.9, 2.4, 1.1); g.fillStyle = lg(g, 0, -9.3, 0, -6.9, [0, '#bdf2ff', 1, '#3b9fc4']); g.fill();
        g.fillStyle = '#fff'; g.fillRect(4.7, -8.9, 1.2, 0.8);
      } else { // 紅色頭盔的勢力徽記
        g.fillStyle = p.accent; g.beginPath(); g.arc(3.2, -6.4, 1.6, 0, TAU); g.fill();
      }
      g.strokeStyle = rgba('#2a2622', 0.8); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-1.2, 2.4); g.quadraticCurveTo(0.6, 7.4, 5.6, 8.2); g.stroke();
    } else if (gear === 'bandana') { // 毛帽＋護目鏡＋口罩：焦土幫
      g.beginPath(); g.moveTo(-9.8, 0.4); g.bezierCurveTo(-10.4, -9, -4, -12.2, 1.2, -11.6); g.bezierCurveTo(7.6, -11, 10.2, -6, 9.6, -2.4); g.lineTo(-9.8, 0.4); g.closePath();
      fo(g, lg(g, 0, -12, 0, 0, [0, '#4a403b', 1, '#2c2522']));
      rr(g, -10.6, -3.4, 21, 3.6, 1.6); fo(g, '#3b3230');
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 0.7; for (let i = -8; i < 9; i += 2.2) { g.beginPath(); g.moveTo(i, -3); g.lineTo(i, -0.4); g.stroke(); }
      g.strokeStyle = '#1e1a18'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, -5); g.quadraticCurveTo(0, -7.6, 5, -6.6); g.stroke();
      g.beginPath(); g.arc(6.2, -6.6, 3, 0, TAU); fo(g, '#2a2420');
      g.beginPath(); g.arc(6.2, -6.6, 2, 0, TAU); g.fillStyle = lg(g, 0, -8.6, 0, -4.6, [0, '#ffd28a', 1, '#c26a1c']); g.fill();
      g.fillStyle = '#fff'; g.fillRect(5.2, -7.8, 1, 0.8);
      // 口罩圍巾
      g.beginPath(); g.moveTo(2, 0.6); g.quadraticCurveTo(7, -0.2, 11.4, 1.4); g.lineTo(11, 6.6); g.quadraticCurveTo(6, 9.6, 1.2, 7.4); g.closePath();
      fo(g, lg(g, 0, 0, 0, 9, [0, '#d06a32', 1, '#933a1a']));
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(3, 3.4); g.quadraticCurveTo(7, 3, 10.6, 4); g.stroke();
    } else if (gear === 'ushanka') { // 毛皮雷鋒帽：鐵砧兵團
      const hat = () => {
        g.beginPath(); g.moveTo(-10.6, 4.6);
        for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; const r = 11.2 + (i % 2 ? 0.9 : 0); g.lineTo(0.4 + Math.cos(a) * r, -1.8 + Math.sin(a) * r * 0.95); }
        g.lineTo(11.4, 0.4); g.lineTo(-10.6, 4.6); g.closePath();
      };
      hat(); fo(g, lg(g, 0, -13, 0, 2, [0, shade(p.helm, 0.2), 1, shade(p.helm, -0.25)]));
      rr(g, -11.4, -5.2, 23.4, 5.4, 2.6); fo(g, lg(g, 0, -5, 0, 0, [0, '#8a7462', 1, '#5c4a3d']));
      g.beginPath(); g.moveTo(-6, -0.6); g.quadraticCurveTo(-7.2, 6, -4.2, 9.4); g.quadraticCurveTo(-1, 9, -0.4, 4.4); g.lineTo(-0.6, -0.4); g.closePath(); fo(g, '#6a5546');
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-5, 1); g.lineTo(-4.4, 7); g.stroke();
      g.beginPath(); g.arc(3.8, -2.6, 1.8, 0, TAU); fo(g, p.accent, OW * 0.7);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 0.8; for (let i = -9; i < 10; i += 2.6) { g.beginPath(); g.moveTo(i, -10 + Math.abs(i) * 0.25); g.lineTo(i + 1, -7.4 + Math.abs(i) * 0.2); g.stroke(); }
    } else if (gear === 'pilot') { // 白色飛行頭盔＋深色面罩：白隼
      g.beginPath(); g.moveTo(-10.6, 3.4); g.bezierCurveTo(-11.8, -8.4, -5.6, -13.2, 1, -12.8); g.bezierCurveTo(8.6, -12.4, 11.6, -6.6, 11.2, 0); g.lineTo(9.8, 0.6); g.lineTo(-10.6, 3.4); g.closePath();
      fo(g, lg(g, 4, -12, -6, 3, [0, p.helmL, 0.5, p.helm, 1, p.helmD]));
      g.fillStyle = p.accent; g.beginPath(); g.moveTo(-6, -11); g.quadraticCurveTo(0, -13.6, 6, -11.4); g.lineTo(5.4, -9.8); g.quadraticCurveTo(0, -11.8, -5.4, -9.4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(1.6, -7.2); g.quadraticCurveTo(9, -7.6, 11.2, -3.6); g.quadraticCurveTo(11.6, 0.6, 9.6, 2); g.quadraticCurveTo(5, 1.8, 2, 0.4); g.closePath();
      fo(g, lg(g, 2, -7, 11, 2, [0, '#3a3f5a', 0.5, '#1c1f2e', 1, '#5a3a5a']));
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4, -5.6); g.quadraticCurveTo(7.6, -5.8, 9.4, -3.8); g.stroke();
    } else if (gear === 'mask') { // 鋼盔＋防毒面具：老師的部隊
      g.beginPath(); g.moveTo(1.6, -2); g.quadraticCurveTo(8.6, -3, 10.8, 1.4); g.quadraticCurveTo(10.6, 7.4, 6, 8.6); g.quadraticCurveTo(1.6, 8.4, 0.8, 4.4); g.closePath();
      fo(g, lg(g, 0, -2, 0, 9, [0, '#5b5a55', 1, '#34332f']));
      g.beginPath(); g.arc(6.2, 0.4, 2.6, 0, TAU); fo(g, '#232227');
      g.beginPath(); g.arc(6.2, 0.4, 1.8, 0, TAU); g.fillStyle = lg(g, 0, -1.4, 0, 2.2, [0, '#ff9a8a', 1, '#a21a26']); g.fill();
      rr(g, 9, 4.2, 4.2, 4.4, 1.4); fo(g, '#4a4944'); g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 3; i++) g.fillRect(9.8 + i * 1.2, 5, 0.5, 2.8);
      g.beginPath(); g.moveTo(-11.6, 3.6); g.bezierCurveTo(-11.8, -7.6, -6, -12.2, 0.6, -12); g.bezierCurveTo(7.6, -11.8, 10.6, -7, 10.4, -2.4);
      g.lineTo(12.4, -0.6); g.lineTo(11.6, 0.6); g.lineTo(9, -0.6); g.lineTo(-8, 1.6); g.lineTo(-10, 5.8); g.lineTo(-12.6, 5.6); g.closePath();
      fo(g, lg(g, 4, -12, -6, 4, [0, p.helmL, 0.5, p.helm, 1, p.helmD]));
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.beginPath(); g.arc(0.4, -1.5, 9, -1.95, -0.8); g.stroke();
    } else if (gear === 'bald') { // 鍋爐：光頭＋耳機＋鬍渣
      g.fillStyle = 'rgba(70,50,40,.28)'; g.beginPath(); g.ellipse(4.6, 4.8, 6.4, 3.8, 0.1, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0.2, 0.2, 6.6, -2.5, -1.3); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 2.6; g.beginPath(); g.arc(0.2, 0.6, 9.4, -2.75, -0.55); g.stroke();
      g.strokeStyle = '#3a3c43'; g.lineWidth = 1.2; g.stroke();
      g.beginPath(); g.ellipse(-1.6, 1.8, 3.4, 4, 0.1, 0, TAU); fo(g, '#2c2e35');
      g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0.5, 4); g.quadraticCurveTo(3.6, 7.4, 7.6, 6.2); g.stroke();
      g.beginPath(); g.arc(8, 6, 1.2, 0, TAU); fo(g, '#2c2e35', OW * 0.6);
      g.strokeStyle = '#b5615a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(2, -6.5); g.lineTo(5, -3.8); g.stroke();
    } else if (gear === 'hood') { // 小雀：偽裝兜帽
      g.beginPath(); g.moveTo(-11.4, 9.6); g.bezierCurveTo(-13.4, -4, -8, -12.6, 0.6, -12.4); g.bezierCurveTo(8.4, -12.2, 11.4, -7.4, 11, -3.4);
      g.lineTo(8.6, -3.8); g.quadraticCurveTo(3, -8.4, -2.4, -3.6); g.quadraticCurveTo(-4.8, 2.6, -2.6, 9.8); g.closePath();
      fo(g, lg(g, 0, -12, 0, 10, [0, '#748553', 0.5, '#5d6b3c', 1, '#434e2a']));
      g.strokeStyle = 'rgba(40,52,24,.75)'; g.lineWidth = 0.7;
      for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 18) * Math.PI * 1.15, r = 9 + (i % 3); const x = Math.cos(a) * r, y = -1 + Math.sin(a) * r; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3 + 1); g.stroke(); }
      g.fillStyle = '#86995c'; for (let i = 0; i < 7; i++) { const x = -8 + i * 2.6, y = -10 + Math.abs(i - 3) * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.6, y - 2.4); g.lineTo(x + 2.4, y + 0.6); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(60,80,40,.5)'; g.beginPath(); g.moveTo(2.4, 2.2); g.lineTo(10, 1.2); g.lineTo(10, 2.8); g.lineTo(2.6, 3.8); g.closePath(); g.fill();
    } else if (gear === 'mohawk') { // 卡茲：莫霍克頭＋額頭護目鏡＋拉到脖子的圍巾
      g.fillStyle = 'rgba(70,50,40,.18)'; g.beginPath(); g.ellipse(-1, -3, 8, 5.6, 0, Math.PI, TAU); g.fill();
      g.beginPath(); g.moveTo(-6, -6.4);
      for (let i = 0; i < 5; i++) { const x = -6 + i * 3.1; g.lineTo(x + 1.2, -15.6 + Math.abs(i - 2) * 1.4); g.lineTo(x + 3.1, -7.4 + (i === 4 ? 1 : 0)); }
      g.closePath(); fo(g, lg(g, 0, -16, 0, -6, [0, '#ff9a3a', 1, '#c2410f']));
      g.strokeStyle = '#1e1a18'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, -4.6); g.quadraticCurveTo(0, -7.6, 5.6, -6.2); g.stroke();
      g.beginPath(); g.arc(6.6, -6, 3, 0, TAU); fo(g, '#2a2420');
      g.beginPath(); g.arc(6.6, -6, 2, 0, TAU); g.fillStyle = lg(g, 0, -8, 0, -4, [0, '#ffd28a', 1, '#c26a1c']); g.fill();
      g.strokeStyle = '#b5615a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3.6, 2.2); g.lineTo(6.6, 5.8); g.stroke();
      g.beginPath(); g.moveTo(-6.4, 7.4); g.quadraticCurveTo(1, 10.6, 8.6, 8.4); g.lineTo(8, 11.6); g.quadraticCurveTo(0, 13.6, -6.8, 10.6); g.closePath(); fo(g, lg(g, 0, 7, 0, 13, [0, '#d06a32', 1, '#933a1a']));
    }
  });
  // 頭盔飛掉後的光頭（短髮）
  if (p.gear === 'helmet' || p.gear === 'helmetR' || p.gear === 'mask') {
    mkSpr('headB_' + id, -14, -16, 14, 12, (g) => {
      const face = () => { g.beginPath(); g.ellipse(0.2, 0.6, 8.6, 8.2, 0, 0, TAU); g.moveTo(9.4, 3.2); g.ellipse(5.4, 3.6, 4.2, 3.7, 0, 0, TAU); g.moveTo(10, 1.2); g.arc(8.4, 1.2, 1.7, 0, TAU); };
      face(); g.lineWidth = OW * 2; g.strokeStyle = OUT; g.stroke();
      face(); g.fillStyle = lg(g, -6, -6, 8, 8, [0, shade(p.skin, 0.08), 0.6, p.skin, 1, p.skinD]); g.fill();
      g.beginPath(); g.moveTo(-8.6, 2); g.bezierCurveTo(-9.6, -6, -4, -8.6, 1, -8.4); g.bezierCurveTo(5.6, -8.2, 7.6, -6, 7.8, -4); g.quadraticCurveTo(3, -6, -2, -3); g.quadraticCurveTo(-4.6, 0, -4.4, 3); g.closePath();
      fo(g, '#2f2622', OW * 0.8);
      g.beginPath(); g.ellipse(-1.6, 1.8, 2.2, 2.7, 0.15, 0, TAU); fo(g, p.skinS, OW * 0.8);
    });
  }
  for (const k of ['torso', 'head', 'headB']) {
    if (!SPR[k + '_' + id]) continue;
    tintSpr(k + 'W_' + id, SPR[k + '_' + id], '#ffffff', 0.92);
    tintSpr(k + 'C_' + id, SPR[k + '_' + id], '#231e1c', 0.86);
  }
}

/* ── 姿勢表：髖部位置、前傾、雙腳落點 ── */
const STANCE = {
  stand: { hx: 0, hy: -17.6, lean: 0.05, nx: 3.2, ny: 0, fx: -2.8, fy: 0, nb: -1, fb: -1 },
  kneel: { hx: -1, hy: -10.8, lean: 0.03, nx: 7.4, ny: 0, fx: -10.6, fy: -0.8, nb: -1, fb: -1 },
  crouch: { hx: -1.6, hy: -12.4, lean: 0.48, nx: 5.4, ny: 0, fx: -5.8, fy: 0, nb: -1, fb: -1 },
  prone: { hx: -9.4, hy: -4.2, lean: 1.4, nx: -26.6, ny: -1.8, fx: -25, fy: -1.2, nb: -1, fb: -1 },
};

/* 小兵狀態（戰鬥邏輯只要改這些欄位，動畫自己會跟） */
function newSoldierAnim(u, pal, wk) {
  u.pal = pal; u.wk = wk; u.w = WEAP[wk];
  u.face = u.face || 1; u.vx = 0; u.spd = 0; u.ph = Math.random();
  u.st = 'stand'; u.st0 = 'stand'; u.stb = 1;
  u.aimA = u.w.lowA; u.aimTA = u.w.lowA; u.aimB = 0; u.wantAim = false;
  u.rec = 0; u.act = null; u.flash = 0; u.flinch = 0; u.death = null; u.alpha = 1;
  u.ex = 'n'; u.exT = 0; u.blinkT = rnd(1, 4); u.breathT = rnd(1, 3);
  u.idleT = rnd(2, 6); u.look = 0; u.lookT = 0; u.hop = 0; u.warhead = true; u.magOut = false;
  u.rig = { hip: [0, 0], neck: [0, 0], head: [0, 0], sh: [0, 0], kn: [0, 0], kf: [0, 0], fn: [0, 0], ff: [0, 0], en: [0, 0], ef: [0, 0], hn: [0, 0], hf: [0, 0], wo: [0, 0], wa: 0, lean: 0, hr: 0, slung: false, oneHand: false, magHand: false, warHand: false };
}

function setStance(u, st) { if (u.st === st) return; u.st0 = u.st; u.st = st; u.stb = 0; }
/* 動作：換彈、拉槍機、丟手榴彈、歡呼、敬禮、升旗 */
function startReload(u) {
  if (u.wk === 'ft' || u.death) return;
  const d = u.w.magDur;
  u.act = {
    k: 'reload', t: 0, d,
    onT(u, a) {
      const t = a.t / a.d;
      if (u.wk === 'ar' || u.wk === 'mg') {
        if (!a.f1 && t > 0.14) { a.f1 = true; if (u.wk === 'ar') { u.magOut = true; fxDropPart(u, 'arMag_' + (PAL[u.pal].team ? 'en' : 'us'), weaponPt(u, u.w.magwell)); } sfx('magout', u.x); }
        if (!a.f2 && t > 0.56) { a.f2 = true; u.magOut = false; sfx('magin', u.x); }
        if (!a.f3 && t > 0.8) { a.f3 = true; sfx('charge', u.x); }
      } else if (u.wk === 'sr') {
        if (!a.f1 && t > 0.5) { a.f1 = true; fxCasing(u, true); sfx('bolt', u.x); }
      } else if (u.wk === 'rpg') {
        if (!a.f1 && t > 0.7) { a.f1 = true; u.warhead = true; sfx('magin', u.x); }
      }
    },
  };
}
function startThrow(u, tx, ty) {
  if (u.death) return;
  u.act = { k: 'throw', t: 0, d: 1.0, tx, ty, onT(u, a) { if (!a.f1 && a.t / a.d > 0.56) { a.f1 = true; if (typeof throwGrenade === 'function') throwGrenade(u, a.tx, a.ty); } } };
  setExpr(u, 's', 0.7);
}
function startCheer(u, d) {
  if (u.death) return;
  u.act = { k: 'cheer', t: 0, d: d || 1.6, hc: -1, onT(u, a) { const k = Math.floor(a.t / 0.5); if (k !== a.hc) { a.hc = k; u.hop = 0.45; } } };
  setExpr(u, 's', d || 1.6);
}
function startSalute(u, d) { if (!u.death) u.act = { k: 'salute', t: 0, d: d || 1.4 }; }
function startRaise(u, px, d) { if (!u.death) u.act = { k: 'raise', t: 0, d: d || 1.8, px }; }
function setExpr(u, ex, t) { u.ex = ex; u.exT = t; }

/* 每格更新動畫狀態 */
function animSoldier(u, dt) {
  if (u.death) { animDeath(u, dt); return; }
  u.stb = Math.min(1, u.stb + dt / 0.22);
  const sp = Math.abs(u.vx);
  u.spd = damp(u.spd, sp, 12, dt);
  if (u.spd > 1) {
    const run = u.spd > 46;
    const stride = run ? 26 : 17;
    const p0 = u.ph;
    u.ph = (u.ph + (u.spd * dt) / (stride * 2)) % 1;
    if (u.spd > 20 && u.x !== undefined && typeof fxStep === 'function' && ((p0 < 0.5 && u.ph >= 0.5) || u.ph < p0) && chance(u.spd > 46 ? 0.8 : 0.35)) fxStep(u.x + u.face * 3, u.y, u.spd > 46);
  }
  u.aimB = approach(u.aimB, u.wantAim ? 1 : 0, dt / 0.2);
  const target = u.wantAim ? u.aimTA : u.w.lowA;
  u.aimA = approachAng(u.aimA, target, dt * 5.5);
  u.rec = Math.max(0, u.rec - dt * 9);
  u.flash = Math.max(0, u.flash - dt);
  u.flinch = Math.max(0, u.flinch - dt);
  if (u.exT > 0) { u.exT -= dt; if (u.exT <= 0) u.ex = 'n'; }
  u.blinkT -= dt; if (u.blinkT < -0.12) u.blinkT = rnd(2, 5);
  u.hop = Math.max(0, u.hop - dt);
  if (u.act) {
    u.act.t += dt;
    if (u.act.onT) u.act.onT(u, u.act);
    if (u.act.t >= u.act.d) { const a = u.act; u.act = null; if (a.done) a.done(u, a); }
  }
  // 閒著時左右看
  if (!u.wantAim && u.spd < 2 && !u.act) {
    u.lookT -= dt;
    if (u.lookT <= 0) { u.lookT = rnd(1.5, 4); u.lookTo = pick([0, 0, -0.18, 0.12, 0.2]); }
    u.look = damp(u.look, u.lookTo || 0, 5, dt);
  } else u.look = damp(u.look, 0, 8, dt);
  u.breathT -= dt;
  if (u.breathT <= 0) { u.breathT = rnd(2.4, 4.5); if (typeof fxBreath === 'function' && u.y !== undefined) { const r = u.rig; fxBreath(u.x + u.face * (r.head[0] + 9), u.y + r.head[1] + 4, u.face); } }
}

/* 姿勢參數內插 */
const _sp = { hx: 0, hy: 0, lean: 0, nx: 0, ny: 0, fx: 0, fy: 0, nb: -1, fb: -1 };
function stanceBlend(u) {
  const a = STANCE[u.st0], b = STANCE[u.st], t = E.inOutSine(u.stb);
  for (const k of ['hx', 'hy', 'lean', 'nx', 'ny', 'fx', 'fy']) _sp[k] = lerp(a[k], b[k], t);
  _sp.nb = b.nb; _sp.fb = b.fb;
  return _sp;
}

/* 算出整副骨架 */
function soldierRig(u) {
  if (u.death) return u.rig;   // 陣亡時骨架由 animDeath 負責
  const r = u.rig, w = u.w, s = stanceBlend(u);
  let hx = s.hx, hy = s.hy, lean = s.lean, nx = s.nx, ny = s.ny, fx = s.fx, fy = s.fy;
  const moving = u.spd > 1 && (u.st === 'stand' || u.st === 'crouch');
  if (moving) {
    const run = u.spd > 46;
    const stride = run ? 12.5 : 8.4, lift = run ? 6.4 : 4.2, duty = run ? 0.4 : 0.58;
    const k = clamp(u.spd / 12, 0, 1);
    const foot = (q) => {
      q = ((q % 1) + 1) % 1;
      if (q < duty) { const s2 = q / duty; return [stride * (0.5 - s2), 0]; }
      const s2 = (q - duty) / (1 - duty);
      return [stride * (-0.5 + E.inOutSine(s2)) + 1.5, -lift * Math.sin(Math.PI * s2)];
    };
    const a = foot(u.ph), b = foot(u.ph + 0.5);
    nx = lerp(nx, a[0] + 1.2, k); ny = lerp(ny, a[1], k); fx = lerp(fx, b[0] - 0.4, k); fy = lerp(fy, b[1], k);
    hy += (run ? 1.6 : 1.0) * Math.cos(u.ph * TAU * 2) * k + (run ? 1.4 : 0.3) * k;
    lean += (run ? 0.26 : 0.09) * k;
  } else if (u.st === 'stand' || u.st === 'kneel') {
    hy += Math.sin(G.t * 2.1 + u.ph * 9) * 0.35; // 呼吸
  }
  if (u.hop > 0) hy -= Math.sin((u.hop / 0.45) * Math.PI) * 6;
  if (u.flinch > 0) lean -= Math.sin((u.flinch / 0.22) * Math.PI) * 0.22;
  lean -= u.rec * 0.06 * (u.wk === 'rpg' ? 3 : 1);
  r.lean = lean;
  r.hip[0] = hx; r.hip[1] = hy;
  const sl = Math.sin(lean), cl = Math.cos(lean);
  r.neck[0] = hx + sl * RIG.TORSO; r.neck[1] = hy - cl * RIG.TORSO;
  // 頭部大致保持正，往前傾時會補回來
  r.hr = lean * (u.st === 'prone' ? 0.25 : 0.45) + u.look;
  const hs = Math.sin(r.hr), hc = Math.cos(r.hr);
  const hox = 1.4, hoy = -8.6;
  r.head[0] = r.neck[0] + hox * hc - hoy * hs; r.head[1] = r.neck[1] + hox * hs + hoy * hc;
  if (u.st === 'prone') { r.head[1] += 2.4 * E.inOutSine(u.stb); }
  r.sh[0] = hx + sl * (RIG.TORSO - 3.2) + 0.4 * cl; r.sh[1] = hy - cl * (RIG.TORSO - 3.2) + 0.4 * sl;
  r.fn[0] = nx; r.fn[1] = ny; r.ff[0] = fx; r.ff[1] = fy;
  const kn = ik2(hx + 0.8, hy, nx, ny - 1.4, RIG.THIGH, RIG.SHIN, s.nb);
  const kf = ik2(hx - 0.8, hy, fx, fy - 1.4, RIG.THIGH, RIG.SHIN, s.fb);
  r.kn[0] = kn[0]; r.kn[1] = kn[1]; r.kf[0] = kf[0]; r.kf[1] = kf[1];

  // 武器擺位
  r.slung = false; r.oneHand = false; r.magHand = false; r.warHand = false; r.shell = null;
  let a = u.aimA;
  const act = u.act;
  let handN = null, handF = null;
  if (act && (act.k === 'raise' || act.k === 'mload')) r.slung = true;
  const recD = u.rec * w.recD, recR = u.rec * w.recR;
  const sx = r.sh[0], sy = r.sh[1];
  let ox, oy;
  const placeAt = (ang) => {
    const c = Math.cos(ang), s2 = Math.sin(ang);
    if (u.wk === 'rpg') { const ax = sx + 2.2, ay = sy - 3.6; ox = ax - 13 * c; oy = ay - 13 * s2; }
    else { ox = sx - (w.butt[0] * c - w.butt[1] * s2); oy = sy - (w.butt[0] * s2 + w.butt[1] * c); }
  };
  if (u.wk === 'ft') { // 噴槍掛在腰間
    placeAt(a); ox = r.hip[0] + 0.5 - Math.cos(a) * 1.5; oy = r.hip[1] - 4.4 - Math.sin(a) * 1.5;
  } else placeAt(a);
  // 動作覆寫
  if (act) {
    const t = act.t / act.d;
    if (act.k === 'reload') {
      const dip = Math.sin(clamp(t, 0, 1) * Math.PI);
      a += dip * (u.wk === 'rpg' ? 0.35 : u.wk === 'sr' ? 0.08 : 0.48);
      placeAt(a);
    } else if (act.k === 'throw') {
      a = lerp(u.aimA, 0.95, Math.sin(clamp(t * 1.2, 0, 1) * Math.PI));
      placeAt(a); r.oneHand = true;
    } else if (act.k === 'cheer') {
      a = -0.08 + Math.sin(act.t * 9) * 0.06;
      const hb = Math.abs(Math.sin(act.t * 7.5));
      ox = r.head[0] - 13; oy = r.head[1] - 13 - hb * 3;
    } else if (act.k === 'salute') {
      a = 1.35; placeAt(a); ox = r.hip[0] - 5; oy = r.hip[1] - 2; r.oneHand = true;
    }
  }
  ox -= Math.cos(a) * recD; oy -= Math.sin(a) * recD;
  a -= recR;
  r.wo[0] = ox; r.wo[1] = oy; r.wa = a;
  const ca = Math.cos(a), sa = Math.sin(a);
  const W = (p) => [ox + p[0] * ca - p[1] * sa, oy + p[0] * sa + p[1] * ca];
  handF = W(w.grip);
  handN = W(u.st === 'prone' && u.wk !== 'mg' ? [Math.max(4.4, w.fore[0] * 0.25), 3.2] : w.fore);
  if (act) {
    const t = act.t / act.d;
    if (act.k === 'reload' && u.wk !== 'rpg') {
      const mw = W(w.magwell), pouch = [r.hip[0] + 5 + sl * 6, r.hip[1] - 5];
      const ch = W(w.charge || w.grip);
      const key = [[0, W(w.fore)], [0.14, [mw[0] + 0.6, mw[1] + 3]], [0.36, pouch], [0.56, [mw[0], mw[1] + 3.6]], [0.7, ch], [0.82, [ch[0] - 3, ch[1]]], [1, W(w.fore)]];
      handN = keyPath(key, t);
      r.magHand = t > 0.38 && t < 0.56;
      if (u.wk === 'sr') { // 狙擊槍是拉槍機
        const b = W(w.bolt);
        handF = keyPath([[0, handF], [0.2, b], [0.35, [b[0], b[1] - 1.6]], [0.55, [b[0] - 3.6, b[1] - 1.6]], [0.72, [b[0], b[1] - 1.6]], [0.85, b], [1, handF]], t);
        handN = W([Math.max(4.4, w.fore[0] * 0.25), 3.2]);
        r.magHand = false;
      }
    } else if (act.k === 'reload' && u.wk === 'rpg') {
      const back = [r.sh[0] - 9, r.sh[1] - 3], tip = W([w.muzzle[0] + 4, 0]);
      handN = keyPath([[0, W(w.fore)], [0.25, back], [0.55, [tip[0] + 6, tip[1] - 1]], [0.72, W([w.muzzle[0] - 1, 0])], [1, W(w.fore)]], t);
      r.warHand = t > 0.25 && t < 0.72;
    } else if (act.k === 'throw') {
      const S = r.sh;
      handN = keyPath([[0, W(w.fore)], [0.15, [S[0] + 4, S[1] + 4]], [0.42, [S[0] - 7, S[1] - 10]], [0.56, [S[0] + 9, S[1] - 9]], [0.72, [S[0] + 9, S[1] + 4]], [1, W(w.fore)]], t);
    } else if (act.k === 'salute') {
      handN = [r.head[0] + 5.4, r.head[1] - 4.8];
      handF = W(w.grip);
    } else if (act.k === 'mload') { // 迫擊砲裝填：雙手舉著砲彈對準砲口放下去
      const t2 = clamp(act.t / act.d, 0, 1), drop = t2 < 0.7 ? 0 : (t2 - 0.7) / 0.3;
      handN = [14, -31 + drop * 8]; handF = [11.5, -30 + drop * 8]; r.shell = drop < 0.9 ? [12.8, -33 + drop * 8] : null;
    } else if (act.k === 'raise') {
      const px = act.px !== undefined ? act.px : 10;
      const ph = act.t * 3.2;
      handN = [px - 1, -30 - Math.sin(ph * Math.PI) * 9];
      handF = [px - 2, -30 + Math.sin(ph * Math.PI) * 9];
    }
  }
  if (r.slung) {
    r.wo[0] = r.hip[0] - 9; r.wo[1] = r.hip[1] - 2; r.wa = -1.05;
  }
  // 手臂 IK（肘往下彎）
  const shN = [r.sh[0] + 0.9, r.sh[1] + 0.2], shF = [r.sh[0] - 1.4, r.sh[1] - 0.3];
  const en = ik2(shN[0], shN[1], handN[0], handN[1], RIG.UARM, RIG.FARM, 1);
  const ef = ik2(shF[0], shF[1], handF[0], handF[1], RIG.UARM, RIG.FARM, 1);
  r.shN = shN; r.shF = shF;
  r.en[0] = en[0]; r.en[1] = en[1]; r.ef[0] = ef[0]; r.ef[1] = ef[1];
  r.hn = clampReach(shN, handN, RIG.UARM + RIG.FARM); r.hf = clampReach(shF, handF, RIG.UARM + RIG.FARM);
  return r;
}
function clampReach(a, b, L) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy); if (d <= L) return b; return [a[0] + (dx * L) / d, a[1] + (dy * L) / d]; }
function keyPath(keys, t) {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const k0 = keys[i - 1], k1 = keys[i];
      const s = E.inOutSine(clamp((t - k0[0]) / (k1[0] - k0[0] || 1), 0, 1));
      return [lerp(k0[1][0], k1[1][0], s), lerp(k0[1][1], k1[1][1], s)];
    }
  }
  return keys[keys.length - 1][1];
}
function weaponPt(u, p) { // 武器上某點的世界座標
  const r = u.rig, c = Math.cos(r.wa), s = Math.sin(r.wa);
  const lx = r.wo[0] + p[0] * c - p[1] * s, ly = r.wo[1] + p[0] * s + p[1] * c;
  return [u.x + lx * u.face, u.y + ly];
}

/* ── 畫一個小兵 ──
   效能：小兵很多，所以不用 save/restore，改成自己算矩陣 setTransform。 */
const _pts = new Float32Array(8);
let _Ma = 1, _Mb = 0, _Mc = 0, _Md = 1, _Me = 0, _Mf = 0;
function mBase(ctx) { const m = ctx.getTransform(); _Ma = m.a; _Mb = m.b; _Mc = m.c; _Md = m.d; _Me = m.e; _Mf = m.f; }
function mPart(ctx, x, y, rot, sx, sy) {
  const co = rot ? Math.cos(rot) : 1, si = rot ? Math.sin(rot) : 0;
  const kx = sx === undefined ? 1 : sx, ky = sy === undefined ? kx : sy;
  ctx.setTransform((_Ma * co + _Mc * si) * kx, (_Mb * co + _Md * si) * kx, (-_Ma * si + _Mc * co) * ky, (-_Mb * si + _Md * co) * ky, _Ma * x + _Mc * y + _Me, _Mb * x + _Md * y + _Mf);
}
function mReset(ctx) { ctx.setTransform(_Ma, _Mb, _Mc, _Md, _Me, _Mf); }
function sprM(ctx, s, x, y, rot, sx, sy) { mPart(ctx, x, y, rot, sx, sy); ctx.drawImage(s.c, -s.ox, -s.oy, s.w, s.h); }
function drawSoldier(ctx, u) {
  const r = u.rig, p = PAL[u.pal], side = p.team ? 'en' : 'us';
  const white = u.flash > 0;
  const ch = u.death ? u.death.char : 0;
  const tone = (c) => (white ? '#ffffff' : ch > 0 ? mix(c, '#2a2422', ch * 0.9) : c);
  const cloth = white || ch > 0 ? tone(p.cloth) : p.cloth, clothF = white || ch > 0 ? tone(p.clothF || (p.clothF = shade(p.cloth, -0.18))) : (p.clothF || (p.clothF = shade(p.cloth, -0.18))), clothD = white || ch > 0 ? tone(p.clothD) : p.clothD;
  ctx.save();
  ctx.translate(u.x, u.y);
  if (u.death) applyDeathXform(ctx, u);
  ctx.scale(u.face, 1);
  const A = u.alpha < 1 ? u.alpha : 1;
  if (A < 1) ctx.globalAlpha = A;
  mBase(ctx);
  const hip = r.hip;
  // 背包或油桶
  const packKey = u.wk === 'ft' ? 'tanks_' : u.wk === 'rpg' ? 'quiver_' : 'pack_';
  if (!u.noPack) sprM(ctx, SPR[packKey + u.pal], hip[0], hip[1], r.lean);
  // 背在背上的槍
  if (r.slung) sprM(ctx, SPR[u.wk + '_' + side], r.wo[0], r.wo[1], r.wa);
  mReset(ctx);
  // 遠側腿、近側腿
  const pp = white || ch > 0 ? { boot: tone(p.boot), bootL: tone(p.bootL), glove: tone(p.glove), accent: p.accent } : p;
  legDraw(ctx, hip[0] - 0.8, hip[1], r.kf, r.ff, clothF, pp, white, true);
  legDraw(ctx, hip[0] + 0.8, hip[1], r.kn, r.fn, cloth, pp, white, false);
  // 遠側手臂
  armDraw(ctx, r.shF, r.ef, r.hf, clothD, pp, white, false);
  // 軀幹、頭（白閃與燒焦用預先染好的版本疊上去）
  overlaySpr(ctx, 'torso', u.pal, hip[0], hip[1], r.lean, white, ch, A);
  overlaySpr(ctx, u.noHelmet && SPR['headB_' + u.pal] ? 'headB' : 'head', u.pal, r.head[0], r.head[1], r.hr, white, ch, A);
  if (!white && ch < 0.6) drawFace(ctx, u, r, p);
  // 武器
  if (!r.slung && !u.death) drawWeapon(ctx, u, side);
  mReset(ctx);
  // 近側手臂
  armDraw(ctx, r.shN, r.en, r.hn, cloth, pp, white, true);
  if (r.magHand) sprM(ctx, SPR['arMag_' + side], r.hn[0] - 0.4, r.hn[1] - 1.5, 0.3);
  if (r.warHand) sprM(ctx, SPR['rpgW_' + side], r.hn[0] - 2, r.hn[1] - 0.6, -0.4);
  if (r.shell) { mReset(ctx); ctx.beginPath(); ctx.ellipse(r.shell[0], r.shell[1], 2.2, 4.6, 0, 0, TAU); ctx.fillStyle = '#4e5640'; ctx.fill(); ctx.lineWidth = OW * 0.8; ctx.strokeStyle = OUT; ctx.stroke(); }
  ctx.restore();
}
function overlaySpr(ctx, k, pal, x, y, rot, white, ch, A) {
  sprM(ctx, SPR[k + '_' + pal], x, y, rot);
  if (white) { ctx.globalAlpha = A * 0.9; ctx.drawImage(SPR[k + 'W_' + pal].c, -SPR[k + 'W_' + pal].ox, -SPR[k + 'W_' + pal].oy, SPR[k + 'W_' + pal].w, SPR[k + 'W_' + pal].h); ctx.globalAlpha = A; }
  else if (ch > 0) { const t = SPR[k + 'C_' + pal]; ctx.globalAlpha = A * ch; ctx.drawImage(t.c, -t.ox, -t.oy, t.w, t.h); ctx.globalAlpha = A; }
  mReset(ctx);
}
function legDraw(ctx, hx, hy, k, f, col, p, white, far) {
  _pts[0] = hx; _pts[1] = hy; _pts[2] = k[0]; _pts[3] = k[1]; _pts[4] = f[0]; _pts[5] = f[1] - 2.2;
  drawLimb(ctx, _pts, 3, far ? 5.6 : 6, col, far ? null : (p.hiCache && p.hiCache[col]) || hiOf(p, col));
  // 靴子：著地時平貼，抬腳時跟著小腿轉
  const lifted = clamp(-f[1] / 3, 0, 1);
  const rot = lifted ? (Math.atan2(f[1] - k[1], f[0] - k[0]) - Math.PI / 2) * 0.7 * lifted : 0;
  mPart(ctx, f[0], f[1], rot);
  ctx.beginPath(); ctx.moveTo(-2.8, -3.4); ctx.lineTo(1.4, -3.8); ctx.quadraticCurveTo(5.2, -2.8, 5.4, -0.6); ctx.lineTo(5.2, 0.4); ctx.lineTo(-3.2, 0.4); ctx.closePath();
  ctx.fillStyle = white ? '#fff' : (far ? (p.bootF || (p.bootF = shade(p.boot, -0.15))) : p.boot); ctx.fill(); ctx.lineWidth = OW; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = white ? '#ddd' : p.bootL; ctx.fillRect(-3, -0.9, 8.2, 1.2);
  mReset(ctx);
}
function hiOf(p, col) { if (!p.hiCache) p.hiCache = {}; return (p.hiCache[col] = shade(col, 0.25)); }
function armDraw(ctx, sh, e, h, col, p, white, near) {
  _pts[0] = sh[0]; _pts[1] = sh[1]; _pts[2] = e[0]; _pts[3] = e[1]; _pts[4] = h[0]; _pts[5] = h[1];
  drawLimb(ctx, _pts, 3, near ? 5 : 4.6, col, near ? (p.hiCache && p.hiCache[col]) || hiOf(p, col) : null);
  if (near && !white) { // 臂章：一眼分辨敵我
    const mx = lerp(sh[0], e[0], 0.55), my = lerp(sh[1], e[1], 0.55), a = Math.atan2(e[1] - sh[1], e[0] - sh[0]);
    mPart(ctx, mx, my, a); ctx.fillStyle = p.accent; ctx.fillRect(-1.1, -2.6, 2.2, 5.2); mReset(ctx);
  }
  ctx.beginPath(); ctx.arc(h[0], h[1], 2.25, 0, TAU); ctx.fillStyle = white ? '#fff' : p.glove; ctx.fill(); ctx.lineWidth = OW; ctx.strokeStyle = OUT; ctx.stroke();
}
function drawWeapon(ctx, u, side) {
  const r = u.rig, w = u.w;
  const key = u.wk + '_' + side;
  const co = Math.cos(r.wa), si = Math.sin(r.wa);
  const at = (lx, ly) => [r.wo[0] + lx * co - ly * si, r.wo[1] + lx * si + ly * co];
  if (u.wk === 'ar' && !u.magOut) { const q = at(w.magwell[0], w.magwell[1]); sprM(ctx, SPR['arMag_' + side], q[0], q[1], r.wa); }
  if (u.wk === 'mg') { const q = at(w.magwell[0], w.magwell[1]); sprM(ctx, SPR['mgBox_' + side], q[0], q[1], r.wa); }
  if ((u.wk === 'sr' || u.wk === 'mg') && u.st === 'prone') { // 腳架撐地
    const bp = at(w.bipod[0], w.bipod[1]);
    mReset(ctx);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bp[0], bp[1]); ctx.lineTo(bp[0] - 1.6, -0.6); ctx.moveTo(bp[0], bp[1]); ctx.lineTo(bp[0] + 2.4, -0.6);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.stroke(); ctx.strokeStyle = '#4b4e56'; ctx.lineWidth = 1; ctx.stroke();
  }
  sprM(ctx, SPR[key], r.wo[0], r.wo[1], r.wa);
  if (u.wk === 'rpg' && u.warhead) { const q = at(w.muzzle[0] - 9.6, 0); sprM(ctx, SPR['rpgW_' + side], q[0], q[1], r.wa); }
}

function drawFace(ctx, u, r, p) {
  const gear = p.gear;
  if (gear === 'pilot' || gear === 'mask') {
    if (gear === 'mask' && Math.sin(G.t * 3 + u.ph * 7) > 0.6) { // 鏡片反光
      mPart(ctx, r.head[0], r.head[1], r.hr); const a0 = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a0 * 0.7; ctx.drawImage(FXS.gR.c, 6.2 - FXS.gR.ox * 0.12, 0.4 - FXS.gR.oy * 0.12, FXS.gR.w * 0.12, FXS.gR.h * 0.12);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a0; mReset(ctx);
    }
    return;
  }
  mPart(ctx, r.head[0], r.head[1], r.hr);
  const ex = u.death ? 'd' : u.ex;
  const ey = -0.2, ex0 = 4.7;
  ctx.lineCap = 'round';
  if (ex === 'd') { // 叉叉眼
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(ex0 - 1.3, ey - 1.3); ctx.lineTo(ex0 + 1.3, ey + 1.3); ctx.moveTo(ex0 + 1.3, ey - 1.3); ctx.lineTo(ex0 - 1.3, ey + 1.3); ctx.stroke();
  } else if (ex === 'h' || u.blinkT < 0) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.1; ctx.beginPath();
    if (ex === 'h') { ctx.moveTo(ex0 - 1.5, ey - 1); ctx.lineTo(ex0 + 0.6, ey); ctx.lineTo(ex0 - 1.3, ey + 1.2); } else { ctx.moveTo(ex0 - 1.3, ey + 0.4); ctx.lineTo(ex0 + 1.3, ey + 0.4); }
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1b1720'; ctx.beginPath(); ctx.ellipse(ex0, ey, 1.2, 1.75, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(ex0 - 0.15, ey - 1.2, 0.7, 0.7);
  }
  if (gear !== 'ushanka' || true) { // 眉毛
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.15; ctx.beginPath();
    if (ex === 'f' || ex === 's') { ctx.moveTo(ex0 - 2.2, ey - 3.6); ctx.lineTo(ex0 + 1.6, ey - 2.5); }
    else if (ex === 'h') { ctx.moveTo(ex0 - 2.2, ey - 2.6); ctx.lineTo(ex0 + 1.6, ey - 3.4); }
    else { ctx.moveTo(ex0 - 2.2, ey - 3.2); ctx.lineTo(ex0 + 1.6, ey - 3.3); }
    if (gear !== 'bandana' || true) ctx.stroke();
  }
  if (gear !== 'bandana') { // 嘴巴
    if (ex === 's' || ex === 'd' || ex === 'h') {
      ctx.fillStyle = '#5a1f1f'; ctx.beginPath(); ctx.ellipse(6.6, 4.6, ex === 's' ? 1.6 : 1.1, ex === 's' ? 1.5 : 0.8, 0.2, 0, TAU); ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = OUT; ctx.stroke();
    } else {
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5.4, 4.6); ctx.quadraticCurveTo(6.6, 4.9, 7.8, 4.3); ctx.stroke();
    }
  }
  mReset(ctx);
}

/* 掉落的頭盔（跟頭上那頂一樣） */
function helmetSpr(pal) {
  const key = 'helm_' + pal; if (SPR[key]) return SPR[key];
  const p = PAL[pal];
  return mkSpr(key, -13, -14, 14, 4, (g) => {
    g.beginPath(); g.moveTo(-10.8, 1.6); g.bezierCurveTo(-11.6, -7.6, -6, -12.6, 0.4, -12.4); g.bezierCurveTo(7.6, -12.2, 11, -7.2, 10.8, -1.8); g.lineTo(12.6, -0.8); g.lineTo(12, 0.9); g.lineTo(-11.8, 2.8); g.closePath();
    fo(g, lg(g, 4, -12, -6, 2, [0, p.helmL, 0.45, p.helm, 1, p.helmD]));
    g.fillStyle = p.helmD; g.fillRect(-11, -1.8, 22, 2.4);
  });
}
/* ── 陣亡：中彈往後倒、被炸飛、燒倒、跪下往前倒 ── */
function killSoldier(u, type, dirx, power) {
  if (u.death) return;
  u.death = { k: type, t: 0, rot: 0, vrot: 0, ox: 0, oy: 0, vx: 0, vy: 0, landed: false, pivot: -6, side: 1, char: 0 };
  const d = u.death;
  u.flash = 0; u.flinch = 0;
  if (u.rig && u.rig.wo && !u.rig.slung) {
    const side = PAL[u.pal].team ? 'en' : 'us', wpt = weaponPt(u, [u.w.len * 0.45, 0]);
    P('part', wpt[0], wpt[1], { vx: -u.face * rnd(10, 50) + (type === 'blast' ? dirx * 80 : 0), vy: -rnd(40, 110), ay: 520, vrot: rnd(-9, 9), rot: u.rig.wa * u.face, max: 3.6, gy: u.y + rnd(-1, 3), spr: SPR[u.wk + '_' + side], sx: u.face, bounce: 0.3, stamp: 'part' });
  }
  u.act = null; u.wantAim = false; u.vx = 0;
  if ((type === 'blast' || chance(0.25)) && (PAL[u.pal].gear === 'helmet' || PAL[u.pal].gear === 'helmetR' || PAL[u.pal].gear === 'mask') && typeof P === 'function' && u.rig) {
    const hx = u.x + u.face * u.rig.head[0], hy = u.y + u.rig.head[1] - 6;
    P('part', hx, hy, { vx: dirx * rnd(30, 90), vy: -rnd(120, 220), ay: 560, vrot: rnd(-12, 12), max: 3.6, gy: u.y + rnd(-2, 3), spr: helmetSpr(u.pal), sx: u.face, bounce: 0.45, stamp: 'part' });
    u.noHelmet = true;
  }
  if (type === 'blast') {
    d.vx = dirx * rnd(60, 120) * (power || 1); d.vy = -rnd(150, 230) * (power || 1);
    d.vrot = rnd(5, 9) * (chance(0.5) ? 1 : -1);
  } else if (type === 'shot') {
    d.side = -1; d.vx = -u.face * rnd(14, 26);
  } else if (type === 'crumple') {
    d.side = 1;
  } else if (type === 'burn') {
    d.side = 1; d.run = rnd(0.9, 1.5); d.vx = u.face * rnd(-30, 30);
  }
  if (typeof onSoldierDeath === 'function') onSoldierDeath(u, type, dirx);
}
function animDeath(u, dt) {
  const d = u.death; d.t += dt;
  const r = u.rig;
  if (d.k === 'blast') {
    if (!d.landed) {
      d.vy += 620 * dt; d.ox += d.vx * dt; d.oy += d.vy * dt; d.rot += d.vrot * dt;
      if (d.oy >= 0 && d.vy > 0) {
        d.oy = 0; d.landed = true; d.lt = d.t;
        d.side = Math.cos(d.rot) * u.face > 0 ? -1 : 1;
        d.rot = 0; d.bounce = 1;
        if (typeof fxThud === 'function') fxThud(u.x + d.ox, u.y);
      }
    }
  } else if (d.k === 'burn' && d.t < d.run) {
    d.ox += d.vx * dt; u.ph += dt * 3;
    d.char = Math.min(1, d.t / d.run);
  }
  // 骨架鬆掉
  const st = STANCE.stand;
  const lt = d.landed || d.k !== 'blast' ? 1 : 0;
  r.hip[0] = 0; r.hip[1] = st.hy;
  r.lean = 0;
  const fl = Math.sin(d.t * 18) * Math.max(0, 1 - d.t * 2);
  r.neck[0] = 0; r.neck[1] = st.hy - RIG.TORSO;
  r.hr = -0.2 * d.side;
  r.head[0] = 1.4; r.head[1] = r.neck[1] - 8.6;
  r.sh[0] = 0.4; r.sh[1] = st.hy - RIG.TORSO + 3.2;
  r.fn[0] = 3; r.fn[1] = 0; r.ff[0] = -3; r.ff[1] = 0;
  const kn = ik2(0.8, st.hy, 3, -1.4, RIG.THIGH, RIG.SHIN, -1), kf = ik2(-0.8, st.hy, -3, -1.4, RIG.THIGH, RIG.SHIN, -1);
  r.kn[0] = kn[0]; r.kn[1] = kn[1]; r.kf[0] = kf[0]; r.kf[1] = kf[1];
  const shN = [r.sh[0] + 0.9, r.sh[1] + 0.2], shF = [r.sh[0] - 1.4, r.sh[1] - 0.3];
  r.shN = shN; r.shF = shF;
  const flail = d.k === 'burn' && d.t < d.run ? Math.sin(d.t * 22) * 8 : 0;
  const settle = d.k === 'blast' ? (d.landed ? clamp((d.t - d.lt) / 0.35, 0, 1) : 0) : d.k === 'burn' ? clamp((d.t - d.run) / 0.5, 0, 1) : clamp((d.t - 0.25) / 0.4, 0, 1);
  const s2 = E.outCubic(settle);
  const upN = [shN[0] + 6 + flail * 0.4, shN[1] - 10 + fl * 3 + flail], upF = [shF[0] - 5, shF[1] - 9 - flail];
  const dnN = [shN[0] + 3.5, shN[1] + 11.5], dnF = [shF[0] - 2.5, shF[1] + 11];
  r.hn = [lerp(upN[0], dnN[0], s2), lerp(upN[1], dnN[1], s2)]; r.hf = [lerp(upF[0], dnF[0], s2), lerp(upF[1], dnF[1], s2)];
  const en = ik2(shN[0], shN[1], r.hn[0], r.hn[1], RIG.UARM, RIG.FARM, 1), ef = ik2(shF[0], shF[1], r.hf[0], r.hf[1], RIG.UARM, RIG.FARM, 1);
  r.en[0] = en[0]; r.en[1] = en[1]; r.ef[0] = ef[0]; r.ef[1] = ef[1];
  r.hn = clampReach(shN, r.hn, RIG.UARM + RIG.FARM); r.hf = clampReach(shF, r.hf, RIG.UARM + RIG.FARM);
  r.slung = false;
  // 倒地後幾秒淡出
  const lieT = d.k === 'blast' ? (d.landed ? d.t - d.lt : 0) : d.t;
  if (lieT > 5.5) u.alpha = Math.max(0, 1 - (lieT - 5.5) / 1.2);
  if (u.alpha <= 0) u.gone = true;
}
function applyDeathXform(ctx, u) {
  const d = u.death;
  if (d.k === 'blast' && !d.landed) {
    ctx.translate(d.ox, d.oy - 20); ctx.rotate(d.rot); ctx.translate(0, 20);
    return;
  }
  // 倒下：繞著低處的支點轉 90 度
  let t;
  if (d.k === 'blast') {
    const lt = d.t - d.lt; t = 1;
    const b = Math.max(0, 1 - lt * 3) * Math.abs(Math.sin(lt * 14)) * 5;
    ctx.translate(d.ox, d.oy - b);
  } else if (d.k === 'shot') {
    t = E.inQuad(clamp((d.t - 0.12) / 0.42, 0, 1));
    ctx.translate(d.vx * Math.min(d.t, 0.4), 0);
  } else if (d.k === 'crumple') {
    t = E.inQuad(clamp((d.t - 0.35) / 0.4, 0, 1));
    const kneel = E.outCubic(clamp(d.t / 0.3, 0, 1));
    ctx.translate(0, kneel * 7 * (1 - t));
  } else { // burn
    t = d.t < d.run ? 0 : E.inQuad(clamp((d.t - d.run) / 0.45, 0, 1));
    ctx.translate(d.ox, 0);
  }
  const ang = t * (Math.PI / 2) * d.side * u.face;
  const bounce = t >= 1 ? Math.max(0, 1 - (d.t - 0.6) * 4) * Math.abs(Math.sin(d.t * 18)) * 2 : 0;
  ctx.translate(0, d.pivot - bounce); ctx.rotate(ang); ctx.translate(0, -d.pivot);
}
