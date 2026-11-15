/* 解包 — 粉專圖卡產生器：遊戲狂想曲塗鴉海報風，1080×1350（4:5）或 1080×1080（1:1）。
   遊戲圖片要能畫進畫布再匯出，所以先試直接載（CORS），不行就走 images.weserv.nl 圖片代理，再不行就只畫塗鴉底。 */
const CFONT = '"Noto Sans TC","PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC",sans-serif';
const IMGC = {};
function loadImgCors(url) {
  if (!url) return Promise.resolve(null);
  if (IMGC[url]) return IMGC[url];
  const tryOne = (u) => new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    const t = setTimeout(() => res(null), 9000);
    im.onload = () => { clearTimeout(t); res(im.naturalWidth > 130 ? im : null); };
    im.onerror = () => { clearTimeout(t); res(null); };
    im.src = u;
  });
  IMGC[url] = (async () => {
    let im = await tryOne(url);
    if (!im) im = await tryOne('https://images.weserv.nl/?url=' + encodeURIComponent(url.replace(/^https?:\/\//, '')) + '&w=1280&output=jpg');
    return im;
  })();
  return IMGC[url];
}
function wrapText(c, text, maxW) {
  const out = []; const NO_START = '，。、；：！？」』）〉》…%,.!?)';
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      const t = line + ch;
      if (c.measureText(t).width > maxW && line) {
        if (NO_START.includes(ch)) { out.push(t); line = ''; continue; }
        out.push(line); line = ch;
      } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}
function fitSize(c, lines, maxW, max, min, weight = 900) {
  for (let s = max; s >= min; s -= 2) { c.font = `${weight} ${s}px ${CFONT}`; if (lines.every((l) => c.measureText(l).width <= maxW)) return s; }
  return min;
}
function coverDraw(c, im, x, y, w, h) {
  const r = Math.max(w / im.naturalWidth, h / im.naturalHeight); const sw = w / r, sh = h / r;
  c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
function tornPath(c, x, y, w, h, R, amp = 10) {
  c.beginPath(); const st = 34;
  c.moveTo(x, y + R() * amp);
  for (let px = x; px <= x + w; px += st) c.lineTo(Math.min(px, x + w), y + R() * amp);
  for (let py = y; py <= y + h; py += st) c.lineTo(x + w - R() * amp, Math.min(py, y + h));
  for (let px = x + w; px >= x; px -= st) c.lineTo(Math.max(px, x), y + h - R() * amp);
  for (let py = y + h; py >= y; py -= st) c.lineTo(x + R() * amp, Math.max(py, y));
  c.closePath();
}
function blobAt(c, x, y, r, col, R) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  for (let i = 0; i < 16; i++) { const a = R() * 7, d = r * (0.8 + R() * 1.3), rr = r * (0.06 + R() * 0.2); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); c.fill(); }
  for (let i = 0; i < 3; i++) { const dx = (R() - 0.5) * r * 1.2, len = r * (0.6 + R() * 1.8), ww = r * 0.13; c.fillRect(x + dx - ww / 2, y, ww, len); c.beginPath(); c.arc(x + dx, y + len, ww * 0.9, 0, 7); c.fill(); }
}
function halftone(c, W, H, col, step = 18, rad = 3.2) {
  c.fillStyle = col;
  for (let y = 0; y < H + step; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < W + step; x += step) { c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill(); }
}
function stepText(c, text, x, y, size, fill, stroke, shadow = '#FF2E88', last = '#111') {
  c.font = `900 ${size}px ${CFONT}`; c.textBaseline = 'top'; c.lineJoin = 'round';
  const o = Math.max(3, Math.round(size * 0.05));
  for (let k = 4; k >= 1; k--) { c.fillStyle = k === 4 ? last : shadow; c.lineWidth = size * 0.16; c.strokeStyle = k === 4 ? last : shadow; c.strokeText(text, x + o * k, y + o * k); c.fillText(text, x + o * k, y + o * k); }
  c.lineWidth = size * 0.16; c.strokeStyle = stroke; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y);
}
function tape(c, x, y, w, h, ang, col = 'rgba(255,255,255,.78)') { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.fillRect(-w / 2, -h / 2, w, h); c.restore(); }
function sticker(c, text, x, y, bg, fg, ang, size = 34) {
  c.save(); c.font = `900 ${size}px ${CFONT}`; const w = c.measureText(text).width + size * 0.9, h = size * 1.55;
  c.translate(x + w / 2, y + h / 2); c.rotate(ang);
  c.fillStyle = '#111'; c.fillRect(-w / 2 + 6, -h / 2 + 6, w, h);
  c.fillStyle = bg; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
  c.fillStyle = fg; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(text, 0, 2); c.restore();
  return w;
}
function stampSeal(c, x, y, r, stamp, label) {
  c.save(); c.translate(x, y); c.rotate(-0.25);
  c.fillStyle = 'rgba(255,255,255,.86)'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = stamp === '推薦' ? '#e3001b' : stamp === '觀望' ? '#111' : '#555'; c.lineWidth = r * 0.13; c.beginPath(); c.arc(0, 0, r * 0.9, 0, 7); c.stroke();
  c.lineWidth = r * 0.03; c.beginPath(); c.arc(0, 0, r * 0.72, 0, 7); c.stroke();
  c.fillStyle = c.strokeStyle; c.textAlign = 'center'; c.textBaseline = 'middle';
  const t = stamp + (stamp === '推薦' ? '!!' : '');
  c.font = `900 ${Math.round(r * (t.length > 3 ? 0.42 : 0.5))}px ${CFONT}`; c.fillText(t, 0, label ? -r * 0.1 : 0);
  if (label) { c.font = `900 ${Math.round(r * 0.18)}px ${CFONT}`; c.fillText(label, 0, r * 0.36); }
  c.restore();
}
function brandSticker(c, x, y, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const w = 300, h = 112;
  c.fillStyle = '#FF2E88'; c.fillRect(-w / 2 + 8, -h / 2 + 8, w, h);
  c.fillStyle = '#111'; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = '#FFE600'; c.lineWidth = 5; c.strokeRect(-w / 2, -h / 2, w, h);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = `900 46px ${CFONT}`; c.fillText('遊戲狂想曲', 0, -14);
  c.fillStyle = '#FFE600'; c.font = '400 32px "Bebas Neue",sans-serif'; c.fillText('GAME  RHAPSODY', 0, 30);
  // 皇冠塗鴉
  c.strokeStyle = '#FF2E88'; c.lineWidth = 9; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-70, -h / 2 - 12); c.lineTo(-78, -h / 2 - 66); c.lineTo(-36, -h / 2 - 34); c.lineTo(0, -h / 2 - 80); c.lineTo(36, -h / 2 - 34); c.lineTo(78, -h / 2 - 66); c.lineTo(70, -h / 2 - 12); c.closePath(); c.stroke();
  c.restore();
}
const PT = { size: 32, lab: 26 };
function pointH(c, p, w) { c.font = `700 ${PT.size}px ${CFONT}`; return 14 + PT.lab + 8 + wrapText(c, p.t, w - 64).length * PT.size * 1.3 + 14; }
function pointStrips(c, pts, x, y, w, R) {
  const cols = ['#FF2E88', '#FFE600', '#111'];
  pts.forEach((p, i) => {
    c.font = `700 ${PT.size}px ${CFONT}`; const lines = wrapText(c, p.t, w - 64); const h = pointH(c, p, w);
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate((R() - 0.5) * 0.02); c.translate(-(x + w / 2), -(y + h / 2));
    c.fillStyle = '#111'; c.fillRect(x + 6, y + 6, w, h);
    c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.fillStyle = cols[i % 3]; c.fillRect(x, y, 16, h);
    c.textBaseline = 'top'; c.textAlign = 'left';
    c.fillStyle = '#FF2E88'; c.font = `900 ${PT.lab}px ${CFONT}`; c.fillText(p.h, x + 36, y + 14);
    c.fillStyle = '#111'; c.font = `700 ${PT.size}px ${CFONT}`;
    lines.forEach((ln, k) => c.fillText(ln, x + 36, y + 14 + PT.lab + 8 + k * PT.size * 1.3));
    c.restore(); y += h + 14;
  });
  return y;
}

async function drawCard(cv, f, lv, opt) {
  const W = 1080, H = opt.ratio === '11' ? 1080 : 1350; cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); const R = rnd(opt.seed * 7919 + hashStr(f.id)); const cd = f.fanpage.card || {};
  const B = opt.layout === 'B';
  const allText = [cd.kicker, cd.title, cd.sub, ...(cd.tags || []), ...((cd.points || []).map((p) => p.h + p.t)), '遊戲狂想曲', f.verdict.stamp, f.verdict.label, f.fanpage.credit].join('');
  try { await Promise.race([Promise.all([document.fonts.load(`900 80px ${CFONT}`, allText), document.fonts.load(`700 40px ${CFONT}`, allText), document.fonts.load('400 40px "Bebas Neue"', 'GAME RHAPSODY')]), sleep(4000)]); } catch (e) { /* 用系統字 */ }
  const imgUrl = (cd.image) || (lv && lv.shots && lv.shots[opt.seed % Math.max(1, lv.shots.length)]) || heroOf({ media: f.media, steam: f.game.steam }, lv);
  const im = await loadImgCors(imgUrl);
  c.textAlign = 'left'; c.textBaseline = 'top';
  // 背景
  if (B) { c.fillStyle = '#111'; c.fillRect(0, 0, W, H); halftone(c, W, H, 'rgba(255,255,255,.07)', 16, 2.6); }
  else {
    c.fillStyle = '#FFE600'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W * 0.85, H * 0.18); c.fillStyle = 'rgba(0,0,0,.045)';
    for (let i = 0; i < 24; i++) { c.rotate(Math.PI / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(1800, -120); c.lineTo(1800, 120); c.closePath(); c.fill(); }
    c.restore(); halftone(c, W, H, 'rgba(0,0,0,.09)', 18, 3.2);
  }
  // 濺漆（先畫，壓在內容底下）
  const spots = [[W * 0.06, H * 0.12], [W * 0.95, H * 0.08], [W * 0.93, H * 0.6], [W * 0.04, H * 0.68], [W * 0.62, H * 0.985]];
  spots.forEach(([x, y], i) => blobAt(c, x + (R() - 0.5) * 60, y + (R() - 0.5) * 60, 26 + R() * 38, i % 2 ? '#111' : '#FF2E88', R));
  if (B) spots.slice(0, 3).forEach(([x, y]) => blobAt(c, x + 40, y + 50, 18 + R() * 20, '#FFE600', R));

  const sq = opt.ratio === '11';
  const tags = (cd.tags || []).slice(0, 4);
  const ptsAll = (cd.points || []).slice(0, 3);
  // 先量好每一塊的高度，再決定放幾條重點、圖片多高（字一定要清楚，不夠放就少放一條）
  const tl = String(cd.title || f.game.zh).split('\n').slice(0, 3);
  const ts = fitSize(c, tl, W - 130, sq ? 90 : 104, 56);
  const titleH = tl.length * ts * 1.18 + 22, subH = cd.sub ? 88 : 0, kickH = 92, brandH = 150, top = sq ? 40 : 52;
  let tagsH = tags.length ? 80 : 0, k = ptsAll.length, imgH = 0;
  const minImg = sq ? 230 : 320;
  const ptsH = (n) => ptsAll.slice(0, n).reduce((acc, p) => acc + pointH(c, p, W - 112) + 14, 0);
  for (;;) {
    imgH = B ? H - (titleH + subH + tagsH + ptsH(k) + brandH) + 40 : H - (top + kickH + titleH + subH + 36 + tagsH + ptsH(k) + brandH);
    if (imgH >= (B ? H * 0.3 : minImg) || (k === 0 && !tagsH)) break;
    if (k > 1) k--; else if (tagsH) tagsH = 0; else k = 0;
  }
  imgH = Math.round(Math.min(B ? H * 0.46 : 520, Math.max(B ? H * 0.26 : 220, imgH)));
  const pts = ptsAll.slice(0, k);
  let y = top, imgY = 0;
  if (B) {           // 版型 B：上方大圖淡進黑牆
    if (im) coverDraw(c, im, 0, 0, W, imgH);
    else { c.fillStyle = '#222'; c.fillRect(0, 0, W, imgH); }
    const g = c.createLinearGradient(0, imgH * 0.5, 0, imgH); g.addColorStop(0, 'rgba(17,17,17,0)'); g.addColorStop(1, 'rgba(17,17,17,1)');
    c.fillStyle = g; c.fillRect(0, imgH * 0.5, W, imgH * 0.5 + 2);
    c.save(); c.beginPath(); c.rect(0, imgH * 0.6, W, imgH * 0.4); c.clip(); halftone(c, W, imgH, 'rgba(17,17,17,.55)', 12, 3.4); c.restore();
  }
  // 膠帶標語
  c.font = `900 40px ${CFONT}`; const kw = Math.min(W - 90, c.measureText(cd.kicker || '').width + 56);
  c.save(); c.translate(44 + kw / 2, y + 32); c.rotate(-0.035);
  c.fillStyle = B ? '#FFE600' : '#111'; c.fillRect(-kw / 2, -32, kw, 64);
  c.fillStyle = B ? '#111' : '#FFE600'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(cd.kicker || '', 0, 3, kw - 30); c.restore();
  c.textAlign = 'left'; c.textBaseline = 'top';
  y = B ? imgH - 40 : y + kickH;
  // 標題
  tl.forEach((ln, i) => stepText(c, ln, 52, y + i * ts * 1.18, ts, B ? '#FFE600' : '#111', B ? '#111' : '#fff'));
  y += titleH;
  // 副標
  if (cd.sub) {
    c.font = `900 ${sq ? 34 : 38}px ${CFONT}`; const sw = Math.min(W - 110, c.measureText(cd.sub).width + 44);
    c.save(); c.translate(56, y); c.rotate(0.012); c.fillStyle = B ? '#FF2E88' : '#111'; c.fillRect(0, 0, sw, 64);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(cd.sub, 22, 34, sw - 44); c.restore(); y += subH;
  }
  // 版型 A：撕紙框裡的遊戲圖
  if (!B) {
    imgY = y + 6; const iw = W - 120, ix = 60;
    c.save(); c.translate(W / 2, imgY + imgH / 2); c.rotate(-0.02); c.translate(-W / 2, -(imgY + imgH / 2));
    tornPath(c, ix - 16, imgY - 16, iw + 32, imgH + 32, R, 10); c.fillStyle = '#111'; c.save(); c.translate(10, 10); c.fill(); c.restore();
    tornPath(c, ix - 16, imgY - 16, iw + 32, imgH + 32, R, 10); c.fillStyle = '#fff'; c.fill();
    c.save(); c.beginPath(); c.rect(ix, imgY, iw, imgH); c.clip();
    if (im) coverDraw(c, im, ix, imgY, iw, imgH);
    else { c.fillStyle = '#222'; c.fillRect(ix, imgY, iw, imgH); c.fillStyle = '#FFE600'; c.font = '400 120px "Rubik Wet Paint","Bebas Neue",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.game.en.slice(0, 14), W / 2, imgY + imgH / 2); c.textAlign = 'left'; c.textBaseline = 'top'; }
    c.restore(); c.restore();
    tape(c, ix + 40, imgY - 10, 170, 46, -0.5); tape(c, ix + iw - 40, imgY - 6, 170, 46, 0.45);
    y = imgY + imgH + 30;
  }
  // 印章：A 壓在圖的右下角；B 壓在圖的右上方
  stampSeal(c, W - 170, B ? Math.max(170, imgH - 230) : imgY + imgH - 50, sq ? 98 : 112, f.verdict.stamp, f.verdict.label);
  // 品牌貼紙先畫：皇冠塗鴉壓在重點紙條底下
  brandSticker(c, W - 200, H - 82, -0.05);
  // 標籤貼紙
  if (tagsH) {
    let tx = 56; const ty = y + 4;
    tags.forEach((t, i) => { if (tx > W - 200) return; const bg = i % 2 ? '#FF2E88' : (B ? '#FFE600' : '#111'), fg = i % 2 ? '#fff' : (B ? '#111' : '#FFE600'); const w = sticker(c, t, tx, ty, bg, fg, (R() - 0.5) * 0.08, sq ? 30 : 33); tx += w + 22; });
    y += tagsH;
  }
  // 重點紙條
  if (pts.length) y = pointStrips(c, pts, 56, y + 4, W - 112, R);
  // 品牌與素材標註
  c.fillStyle = B ? 'rgba(255,255,255,.75)' : 'rgba(17,17,17,.75)'; c.font = `700 22px ${CFONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  wrapText(c, f.fanpage.credit || '', 600).slice(0, 2).forEach((ln, i, a) => c.fillText(ln, 52, H - 34 - (a.length - 1 - i) * 30));
}

async function cardRender(f) {
  const cv = $('#cardcv'); if (!cv) return;
  const busy = $('#cardbusy'); if (busy) busy.style.display = 'grid';
  try { await drawCard(cv, f, liveOf(f.game.steam), CARD); } catch (e) { console.warn(e); toast('圖卡畫不出來：' + e.message, 'warn'); }
  if (busy) busy.style.display = 'none';
}
function cardBlob() {
  const cv = $('#cardcv');
  return new Promise((res) => { try { cv.toBlob((b) => res(b), 'image/png'); } catch (e) { res(null); } });
}
