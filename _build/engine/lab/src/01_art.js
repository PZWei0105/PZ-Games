/* 樣品館：用程式畫的美術（也是「怎麼畫出有質感的程式美術」的範例） */
const LabArt = {};

/** 小工具：在 ctx 上畫帶邊光的形狀 */
function rimShape(c, path, fill, rim, rimW = 2) {
  c.save(); path(c); c.fillStyle = fill; c.fill();
  c.clip(); c.globalCompositeOperation = 'source-atop';
  c.lineWidth = rimW * 2; c.strokeStyle = rim; path(c); c.stroke();
  c.restore();
}

LabArt.make = () => {
  const A = PZ.art;
  // 主角：連帽外送員，背光的輪廓＋發光護目鏡
  A.make('hero', 46, 64, (c, w, h) => {
    const cx = w / 2;
    // 披風
    const cape = c.createLinearGradient(0, 16, 0, h); cape.addColorStop(0, '#2b3b5c'); cape.addColorStop(1, '#141c2e');
    rimShape(c, (x) => { x.beginPath(); x.moveTo(cx, 12); x.bezierCurveTo(cx + 20, 18, cx + 21, 44, cx + 17, h - 3); x.lineTo(cx - 17, h - 3); x.bezierCurveTo(cx - 21, 44, cx - 20, 18, cx, 12); x.closePath(); }, cape, '#7fb2ff', 1.6);
    // 背包
    c.fillStyle = '#ffb547'; c.beginPath(); c.roundRect(cx - 13, 26, 26, 20, 4); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(cx - 13, 38, 26, 3);
    c.fillStyle = '#fff4dc'; c.font = '900 8px sans-serif'; c.textAlign = 'center'; c.fillText('PZ', cx, 36);
    // 頭與帽兜
    const hood = c.createRadialGradient(cx - 3, 8, 2, cx, 12, 14); hood.addColorStop(0, '#3a4f78'); hood.addColorStop(1, '#18213a');
    rimShape(c, (x) => { x.beginPath(); x.arc(cx, 13, 11.5, 0, Math.PI * 2); }, hood, '#9cc6ff', 1.4);
    // 護目鏡
    c.fillStyle = '#0b1020'; c.beginPath(); c.roundRect(cx - 8, 10, 16, 6, 3); c.fill();
    const vis = c.createLinearGradient(cx - 8, 0, cx + 8, 0); vis.addColorStop(0, '#46d4ff'); vis.addColorStop(1, '#b6f3ff');
    c.fillStyle = vis; c.beginPath(); c.roundRect(cx - 7, 11, 14, 4, 2); c.fill();
    // 腳
    c.fillStyle = '#0d1220'; c.fillRect(cx - 9, h - 5, 7, 5); c.fillRect(cx + 2, h - 5, 7, 5);
  }, { anchor: [0.5, 0.94] });

  // 敵人：駝背的「空殼」，紫色邊光、發光的眼睛
  const husk = (c, w, h, tint) => {
    const cx = w / 2;
    const body = c.createLinearGradient(0, 8, 0, h); body.addColorStop(0, tint[0]); body.addColorStop(1, tint[1]);
    rimShape(c, (x) => { x.beginPath(); x.moveTo(cx - 4, 6); x.bezierCurveTo(cx + 18, 4, cx + 20, 30, cx + 15, h - 2); x.lineTo(cx + 6, h - 6); x.lineTo(cx + 2, h - 1); x.lineTo(cx - 5, h - 6); x.lineTo(cx - 14, h - 2); x.bezierCurveTo(cx - 20, 30, cx - 18, 8, cx - 4, 6); x.closePath(); }, body, tint[2], 2);
    // 手臂
    c.strokeStyle = tint[1]; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 12, 22); c.quadraticCurveTo(cx - 22, 34, cx - 16, 44); c.stroke();
    c.beginPath(); c.moveTo(cx + 12, 22); c.quadraticCurveTo(cx + 22, 34, cx + 17, 44); c.stroke();
    // 眼睛（會被泛光放大）
    for (const ex of [-5, 5]) { const g = c.createRadialGradient(cx + ex, 17, 0, cx + ex, 17, 5); g.addColorStop(0, '#fff'); g.addColorStop(0.35, tint[3]); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(cx + ex - 5, 12, 10, 10); }
    // 裂紋
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - 6, 30); c.lineTo(cx - 2, 36); c.lineTo(cx - 5, 42); c.stroke();
  };
  A.make('husk', 42, 52, (c, w, h) => husk(c, w, h, ['#3b2a4f', '#160f22', '#c48bff', '#ff4fd8']), { anchor: [0.5, 0.94] });
  A.make('husk2', 42, 52, (c, w, h) => husk(c, w, h, ['#4f2a2a', '#1e0d0d', '#ff9a6b', '#ffd04f']), { anchor: [0.5, 0.94] });
  A.make('brute', 72, 84, (c, w, h) => husk(c, w, h, ['#2a3f4f', '#0c161e', '#7ff0ff', '#ff3b3b']), { anchor: [0.5, 0.94] });

  // 地板：金屬地磚，一格 96（有雜訊、鉚釘、髒污）
  A.make('floor', 96, 96, (c, w, h) => {
    c.fillStyle = '#121822'; c.fillRect(0, 0, w, h);
    const r = PZ.rng(5);
    for (let i = 0; i < 220; i++) { c.fillStyle = `rgba(${r.next() < 0.5 ? '255,255,255' : '0,0,0'},${r.range(0.01, 0.04)})`; c.fillRect(r.range(0, w), r.range(0, h), r.range(1, 6), r.range(1, 6)); }
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = 'rgba(140,170,220,.10)'; c.lineWidth = 1; c.strokeRect(2.5, 2.5, w - 5, h - 5);
    c.fillStyle = 'rgba(160,190,230,.18)'; for (const [x, y] of [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]]) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
    const g = c.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.6); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  // 彈頭（發光的長條）
  A.make('bolt', 28, 8, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,190,90,0)'); g.addColorStop(0.6, 'rgba(255,214,140,.9)'); g.addColorStop(1, '#fff'); c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2.4, 0, 0, Math.PI * 2); c.fill(); });
  // 經驗寶石
  A.make('gem', 14, 18, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d8fbff'); g.addColorStop(0.5, '#46d4ff'); g.addColorStop(1, '#1a5bd8'); c.fillStyle = g; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w, h * 0.4); c.lineTo(w / 2, h); c.lineTo(0, h * 0.4); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(w / 2, 1); c.lineTo(w * 0.78, h * 0.38); c.lineTo(w / 2, h * 0.45); c.closePath(); c.fill(); });

  // 城市地塊（鏡頭示範用）
  const R = PZ.rng(9);
  for (let i = 0; i < 6; i++) {
    A.make('bldg' + i, 120, 120, (c, w, h) => {
      const hue = [210, 30, 190, 260, 350, 140][i];
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(14, 16, w - 16, h - 16);
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue},18%,34%)`); g.addColorStop(1, `hsl(${hue},22%,20%)`);
      c.fillStyle = g; c.fillRect(6, 6, w - 18, h - 18);
      c.strokeStyle = `hsla(${hue},40%,75%,.35)`; c.lineWidth = 2; c.strokeRect(7, 7, w - 20, h - 20);
      for (let k = 0; k < 9; k++) { c.fillStyle = R.chance(0.5) ? `hsla(45,100%,70%,${R.range(0.5, 0.9)})` : 'rgba(10,14,22,.6)'; c.fillRect(18 + (k % 3) * 26, 18 + Math.floor(k / 3) * 26, 14, 14); }
      c.fillStyle = `hsla(${hue},30%,60%,.25)`; c.fillRect(w - 40, 12, 20, 8);
    }, { anchor: [0, 0] });
  }
  A.make('tree', 34, 34, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(w / 2 + 3, h / 2 + 4, 14, 12, 0, 0, Math.PI * 2); c.fill(); const g = c.createRadialGradient(w / 2 - 4, h / 2 - 4, 2, w / 2, h / 2, 15); g.addColorStop(0, '#7fdc7a'); g.addColorStop(1, '#2c6b3a'); c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, 14, 0, Math.PI * 2); c.fill(); });

  // 立繪（對話示範用）：剪影＋邊光的半身
  A.make('face_wei', 220, 260, (c, w, h) => {
    const cx = w / 2;
    const bg = c.createRadialGradient(cx, h * 0.45, 10, cx, h * 0.45, w * 0.7); bg.addColorStop(0, 'rgba(70,212,255,.25)'); bg.addColorStop(1, 'rgba(70,212,255,0)'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const body = c.createLinearGradient(0, 120, 0, h); body.addColorStop(0, '#26355a'); body.addColorStop(1, '#0c1222');
    rimShape(c, (x) => { x.beginPath(); x.moveTo(cx - 95, h); x.bezierCurveTo(cx - 90, 170, cx - 60, 150, cx, 148); x.bezierCurveTo(cx + 60, 150, cx + 90, 170, cx + 95, h); x.closePath(); }, body, '#8fc0ff', 3);
    const head = c.createRadialGradient(cx - 14, 80, 6, cx, 92, 62); head.addColorStop(0, '#34497a'); head.addColorStop(1, '#141c33');
    rimShape(c, (x) => { x.beginPath(); x.moveTo(cx, 30); x.bezierCurveTo(cx + 62, 34, cx + 66, 130, cx + 36, 158); x.lineTo(cx - 36, 158); x.bezierCurveTo(cx - 66, 130, cx - 62, 34, cx, 30); x.closePath(); }, head, '#a8d0ff', 3);
    c.fillStyle = '#060a14'; c.beginPath(); c.roundRect(cx - 40, 82, 80, 26, 13); c.fill();
    const v = c.createLinearGradient(cx - 40, 0, cx + 40, 0); v.addColorStop(0, '#46d4ff'); v.addColorStop(1, '#c9f6ff'); c.fillStyle = v; c.beginPath(); c.roundRect(cx - 34, 87, 68, 15, 8); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx - 26, 90, 20, 3);
  }, { scale: 1.5 });
};
