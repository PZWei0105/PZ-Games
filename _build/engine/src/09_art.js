/* ==========================================================================
   09 美術：用程式畫的圖收進圖集（atlas）
     PZ.art.make('zombie', 48, 64, (ctx, w, h) => { …用 Canvas2D 畫… }, { anchor: [0.5, 0.9] });
     g.sprite('zombie', x, y);           // 之後用名字畫
   - 在 w×h 的「邏輯大小」裡畫，實際以 scale 倍（預設 2）的像素存，放大也清楚。
   - 很多小圖會擠在同一張 2048 的大貼圖裡：同一批畫完，iPhone 的記憶體也省。
   - WebGL 模式下 CPU 端不留畫布（畫完就上傳），WebGL 遺失時用原本的畫法重畫。
   - 外部圖片：await PZ.art.image('hero', 'data:image/png;base64,…')。
   - 要在 DOM 裡用（立繪、頭像）：PZ.art.canvas('portrait') 回傳一張新畫布。
   ========================================================================== */
class Skyline {
  constructor(w, h) { this.w = w; this.h = h; this.nodes = [{ x: 0, y: 0, w }]; this.used = 0; }
  fit(i, w, h) {
    const n = this.nodes[i]; if (n.x + w > this.w) return -1;
    let y = n.y, left = w, j = i;
    while (left > 0) { if (j >= this.nodes.length) return -1; y = Math.max(y, this.nodes[j].y); if (y + h > this.h) return -1; left -= this.nodes[j].w; j++; }
    return y;
  }
  insert(w, h) {
    let best = -1, by = Infinity, bw = Infinity, bx = 0;
    for (let i = 0; i < this.nodes.length; i++) { const y = this.fit(i, w, h); if (y >= 0 && (y + h < by || (y + h === by && this.nodes[i].w < bw))) { best = i; by = y + h; bw = this.nodes[i].w; bx = this.nodes[i].x; } }
    if (best < 0) return null;
    const y = by - h;
    this.nodes.splice(best, 0, { x: bx, y: by, w });
    for (let i = best + 1; i < this.nodes.length; i++) {
      const n = this.nodes[i], p = this.nodes[i - 1];
      if (n.x < p.x + p.w) { const shrink = p.x + p.w - n.x; n.x += shrink; n.w -= shrink; if (n.w <= 0) { this.nodes.splice(i, 1); i--; } else break; } else break;
    }
    for (let i = 0; i < this.nodes.length - 1; i++) { if (this.nodes[i].y === this.nodes[i + 1].y) { this.nodes[i].w += this.nodes[i + 1].w; this.nodes.splice(i + 1, 1); i--; } }
    this.used += w * h;
    return { x: bx, y };
  }
}
PZ.Skyline = Skyline;

class Frame {
  constructor(name) { this.name = name; this.tex = null; this.sx = 0; this.sy = 0; this.sw = 0; this.sh = 0; this.w = 0; this.h = 0; this.ax = 0.5; this.ay = 0.5; this.u0 = 0; this.v0 = 0; this.u1 = 1; this.v1 = 1; this.entry = null; }
  setRect(tex, sx, sy, sw, sh) { this.tex = tex; this.sx = sx; this.sy = sy; this.sw = sw; this.sh = sh; this.u0 = sx / tex.w; this.v0 = sy / tex.h; this.u1 = (sx + sw) / tex.w; this.v1 = (sy + sh) / tex.h; }
}
PZ.Frame = Frame;

const Art = PZ.art = {
  scale: 2, pageSize: 2048, firstPageSize: 1024, pad: 2,   // 第一張圖集先開 1024（小遊戲省 12 MB），放不下再開 2048
  frames: new Map(), pages: [], pending: [], entries: [],
  _scratch: null, _sctx: null,
};
function scratch(w, h) {
  if (!Art._scratch) { Art._scratch = document.createElement('canvas'); Art._sctx = Art._scratch.getContext('2d', { willReadFrequently: false }); }
  const c = Art._scratch; if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } else Art._sctx.clearRect(0, 0, w, h);
  const x = Art._sctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.imageSmoothingEnabled = true;
  return x;
}
/** 依條目的畫法畫到 ctx（左上角＝(ox, oy)，已經含 pad） */
function paintEntry(ctx, en, ox, oy) {
  ctx.save();
  ctx.translate(ox + en.pad, oy + en.pad);
  ctx.beginPath(); ctx.rect(0, 0, en.pw - en.pad * 2, en.ph - en.pad * 2); ctx.clip();
  ctx.scale(en.scale, en.scale);
  if (en.nearest) ctx.imageSmoothingEnabled = false;
  try { en.draw(ctx, en.w, en.h, en.arg); } catch (e) { reportError(e, 'art:' + en.name); }
  ctx.restore();
}
function newPage(nearest, w = Art.pageSize, h = Art.pageSize, solo = false) {
  const r = Gfx.r;
  const page = { nearest, w, h, sky: solo ? null : new Skyline(w, h), entries: [], tex: null, solo };
  page.tex = r.texCreate(w, h, { nearest, restore: () => restorePage(page) });
  Art.pages.push(page);
  return page;
}
function uploadEntry(en) {
  const r = Gfx.r, page = en.page;
  if (r.kind === 'canvas2d') { paintEntry(page.tex.ctx, en, en.x, en.y); page.tex._white = null; return; }
  const ctx = scratch(en.pw, en.ph); paintEntry(ctx, en, 0, 0);
  r.texUpload(page.tex, Art._scratch, en.x, en.y);
}
function restorePage(page) {
  const r = Gfx.r;
  if (r.kind !== 'canvas2d') { page.tex.gl = null; r.texAlloc(page.tex); }
  else page.tex.ctx.clearRect(0, 0, page.w, page.h);
  for (const en of page.entries) uploadEntry(en);
}
function place(en) {
  const ps = Art.pageSize;
  if (en.pw > ps || en.ph > ps) {
    const maxT = (Gfx.r && Gfx.r.maxTex) || 4096;
    if (en.pw > maxT || en.ph > maxT) { warnOnce('big:' + en.name, `圖「${en.name}」太大（${en.pw}×${en.ph}），自動縮小`); const k = Math.min(maxT / en.pw, maxT / en.ph) * 0.98; en.scale *= k; en.pw = Math.ceil(en.w * en.scale) + en.pad * 2; en.ph = Math.ceil(en.h * en.scale) + en.pad * 2; }
    const pg = newPage(en.nearest, en.pw, en.ph, true); en.page = pg; en.x = 0; en.y = 0; pg.entries.push(en); return;
  }
  for (const pg of Art.pages) {
    if (pg.solo || pg.nearest !== en.nearest) continue;
    const p = pg.sky.insert(en.pw, en.ph);
    if (p) { en.page = pg; en.x = p.x; en.y = p.y; pg.entries.push(en); return; }
  }
  const first = !Art.pages.some((p) => !p.solo && p.nearest === en.nearest), fs = Art.firstPageSize;
  const pg = first && en.pw <= fs && en.ph <= fs ? newPage(en.nearest, fs, fs) : newPage(en.nearest);
  const p = pg.sky.insert(en.pw, en.ph);
  en.page = pg; en.x = p.x; en.y = p.y; pg.entries.push(en);
}
function realize(en) {
  place(en); uploadEntry(en);
  const f = en.frame; f.setRect(en.page.tex, en.x + en.pad, en.y + en.pad, en.pw - en.pad * 2, en.ph - en.pad * 2);
}

/**
 * 畫一張圖收進圖集。
 * o: { scale（像素密度，預設 2）, anchor: [ax, ay]（0～1，預設置中）, pixel: true（像素風、不模糊）, pad, arg（傳給 draw 的第 4 個參數） }
 * 同名會覆蓋（舊的位置不回收）。
 */
Art.make = (name, w, h, draw, o = {}) => {
  let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  const scale = o.scale || (o.pixel ? 1 : Art.scale), pad = o.pad != null ? o.pad : Art.pad;
  const en = { name, w, h, draw, scale, pad, nearest: !!o.pixel, arg: o.arg, pw: Math.ceil(w * scale) + pad * 2, ph: Math.ceil(h * scale) + pad * 2, page: null, x: 0, y: 0, frame: f };
  f.w = w; f.h = h; const an = o.anchor || [0.5, 0.5]; f.ax = an[0]; f.ay = an[1]; f.entry = en;
  if (Gfx.r) realize(en); else Art.pending.push(en);
  return f;
};
/** 一整排動畫格：回傳 frames 陣列（名字是 name:0、name:1…） */
Art.sheet = (name, count, w, h, draw, o = {}) => {
  const out = [];
  for (let i = 0; i < count; i++) out.push(Art.make(`${name}:${i}`, w, h, (ctx, ww, hh) => draw(ctx, ww, hh, i), o));
  return out;
};
/** 載入圖片（網址或 data URL）。o: { w, h（邏輯大小，預設＝原圖大小 ÷ density）, density（預設 1）, anchor, pixel } */
Art.image = (name, src, o = {}) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const d = o.density || 1, w = o.w || img.naturalWidth / d, h = o.h || img.naturalHeight / d;
    res(Art.make(name, w, h, (ctx, ww, hh) => ctx.drawImage(img, 0, 0, ww, hh), Object.assign({ scale: img.naturalWidth / w }, o)));
  };
  img.onerror = () => rej(new Error('圖片載入失敗：' + name));
  img.src = src;
});
const MISSING = new Frame('missing');
Art.get = (name) => {
  if (typeof name !== 'string') return name;
  const f = Art.frames.get(name);
  if (f) return f;
  warnOnce('missing:' + name, '找不到圖：' + name);
  return MISSING;
};
Art.has = (name) => Art.frames.has(name);
/** 把一張圖重畫成新的 DOM 畫布（立繪、頭像、按鈕圖示用）。scale 預設跟裝置像素比一樣清楚 */
Art.canvas = (name, scale) => {
  const f = Art.get(name), en = f.entry; if (!en) return document.createElement('canvas');
  const s = scale || Math.min(3, (HAS_DOM && window.devicePixelRatio) || 2);
  const c = document.createElement('canvas'); c.width = Math.ceil(en.w * s); c.height = Math.ceil(en.h * s);
  const x = c.getContext('2d'); x.scale(s, s); if (en.nearest) x.imageSmoothingEnabled = false;
  try { en.draw(x, en.w, en.h, en.arg); } catch (e) { reportError(e, 'art.canvas:' + name); }
  return c;
};
Art.url = (name, scale) => Art.canvas(name, scale).toDataURL('image/png');

/** 畫布貼圖（render target）：可以把東西「畫進去」留著（地上的血跡、彈孔、迷你地圖）。用 g.into(name, () => {...}) 畫 */
Art.target = (name, w, h, o = {}) => {
  const r = Gfx.r; let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  const res = o.res || 1, pw = Math.ceil(w * res), ph = Math.ceil(h * res);
  const tex = r.texCreate(pw, ph, { rt: true, nearest: !!o.pixel, restore: (t) => { if (Gfx.r.kind !== 'canvas2d') { t.gl = null; Gfx.r.texAlloc(t); } } });
  f.setRect(tex, 0, 0, pw, ph); f.w = w; f.h = h; f.ax = 0; f.ay = 0; f.rt = true; f.res = res;
  return f;
};

/**
 * 把一張「一直在變的畫布」當成貼圖（舊遊戲遷移、小地圖、動態文字面板）：
 *   const f = PZ.art.live('world', canvas, { pixel: true });  每次畫布畫完呼叫 f.refresh()
 * 畫布大小變了會自動重新配置。Canvas2D 模式下直接用那張畫布，不複製。
 */
Art.live = (name, canvas, o = {}) => {
  let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  f.live = canvas; f.ax = o.anchor ? o.anchor[0] : 0; f.ay = o.anchor ? o.anchor[1] : 0;
  const alloc = () => {
    const r = Gfx.r, w = canvas.width, h = canvas.height;
    // 舊貼圖：Canvas2D 模式下只拿掉包裝（canvas 是遊戲自己的，不能被清掉）；WebGL 才真的刪貼圖
    if (f.tex && r.textures.has(f.tex)) { if (f.tex.canvas === canvas) r.textures.delete(f.tex); else r.texDelete(f.tex); }
    if (r.kind === 'canvas2d') { f.tex = { id: ++TexId, w, h, canvas, ctx: canvas.getContext('2d'), nearest: !!o.pixel, restore: null, live: true }; r.textures.add(f.tex); }
    else f.tex = r.texCreate(w, h, { nearest: !!o.pixel, restore: (t) => { if (Gfx.r.texAlloc) Gfx.r.texAlloc(t); if (Gfx.r.texUpload) Gfx.r.texUpload(t, canvas, 0, 0); } });
    f.setRect(f.tex, 0, 0, w, h); f.w = w / (o.density || 1); f.h = h / (o.density || 1); f._w = w; f._h = h;
  };
  f.refresh = () => {
    const r = Gfx.r; if (!r) return f;
    if (!f.tex || f._w !== canvas.width || f._h !== canvas.height || (r.kind === 'canvas2d') !== !!f.tex.canvas) alloc();
    if (r.kind !== 'canvas2d') r.texUpload(f.tex, canvas, 0, 0); else f.tex._white = null;
    return f;
  };
  if (Gfx.r) f.refresh();
  return f;
};
PZ.on('renderer', () => { for (const f of Art.frames.values()) if (f.live) { f.tex = null; f.refresh(); } });

/** 動畫：PZ.anim(frames, fps, loop) → 回傳函式 (t秒) => frame */
PZ.anim = (frames, fps = 10, loop = true) => {
  const fr = frames.map((f) => Art.get(f));
  return (t) => { let i = Math.floor(t * fps); i = loop ? ((i % fr.length) + fr.length) % fr.length : Math.min(fr.length - 1, Math.max(0, i)); return fr[i]; };
};

/* ---------- 內建圖：粒子與特效常用 ---------- */
function makeBuiltins() {
  const soft = (ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  Art.make('pz.soft', 32, 32, soft);
  Art.make('pz.spark', 32, 8, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, '#fff'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.quadraticCurveTo(w * 0.7, 0, w, h / 2); ctx.quadraticCurveTo(w * 0.7, h, 0, h / 2); ctx.fill(); });
  Art.make('pz.star', 32, 32, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2); ctx.fillStyle = '#fff';
    for (const [l, t] of [[w / 2, 2.2], [w / 3.2, 2.2]]) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? t : l; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 4); ctx.globalAlpha = 0.6; }
    ctx.globalAlpha = 1; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 4); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  });
  Art.make('pz.smoke', 48, 48, (ctx, w, h) => {
    const r = makeRng(7);
    for (let i = 0; i < 14; i++) { const x = w / 2 + r.spread(w * 0.18), y = h / 2 + r.spread(h * 0.18), rad = w * r.range(0.16, 0.3), g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  });
  Art.make('pz.shard', 16, 16, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.2); ctx.lineTo(w * 0.95, h * 0.45); ctx.lineTo(w * 0.3, h * 0.95); ctx.closePath(); ctx.fill(); });
  Art.make('pz.drop', 16, 24, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.quadraticCurveTo(w, h * 0.6, w / 2, h); ctx.quadraticCurveTo(0, h * 0.6, w / 2, 0); ctx.fill(); });
  Art.make('pz.ring', 64, 64, (ctx, w, h) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 3, 0, TAU); ctx.stroke(); });
  Art.make('pz.square', 8, 8, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }, { pad: 1 });
  Art.make('pz.flare', 64, 64, (ctx, w, h) => {
    soft(ctx, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, h / 2 - 1.5, w, 3); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 2); ctx.translate(-w / 2, -h / 2); ctx.fillRect(0, h / 2 - 1.5, w, 3); ctx.restore();
  });
}
Art.init = () => {
  for (const en of Art.pending.splice(0)) realize(en);
  if (!Art.frames.has('pz.soft')) makeBuiltins();
};
