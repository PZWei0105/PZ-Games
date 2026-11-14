/* ==========================================================================
   10 文字：中文字型圖集
   每個字第一次出現時用瀏覽器畫一次、收進字型貼圖，之後跟圖片一樣一批畫完。
   會依實際顯示大小挑最接近的光柵大小，放大縮小都清楚。
   斷行照中文習慣：逗號句號不放行首、左括號不放行尾，英文整個單字一起換行。
   g.text('第一章 最後一單', x, y, { size: 24, color: '#fff', weight: 900, outline: 3, outlineColor: '#000', align: 'center' })
   ========================================================================== */
const Text = PZ.text = {
  font: '"PZ Sans","Noto Sans TC","PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC",system-ui,sans-serif',
  sizes: [12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160],
  pageSize: 1024, maxPages: 8,
  pages: [], glyphs: new Map(), _measure: new Map(), _ctx: null,
};
const NO_START = new Set('，。、；：！？）」』】》〉…—～,.;:!?)]}’”%·．'.split(''));
const NO_END = new Set('（「『【《〈([{‘“'.split(''));
const isWide = (c) => { const k = c.codePointAt(0); return k >= 0x2e80 || (k >= 0x1100 && k <= 0x11ff); };
const EMOJI = /\p{Extended_Pictographic}/u;

function textCtx() {
  if (!Text._ctx) { const c = document.createElement('canvas'); c.width = c.height = 4; Text._ctx = c.getContext('2d'); }
  return Text._ctx;
}
function fontSpec(st, px) { return `${st.italic ? 'italic ' : ''}${st.weight || 400} ${px}px ${st.font || Text.font}`; }
function rasterSize(need) { for (const s of Text.sizes) if (s >= need) return s; return Text.sizes[Text.sizes.length - 1]; }

function newGlyphPage() {
  const r = Gfx.r, S = Text.pageSize;
  const pg = { sky: new Skyline(S, S), tex: null };
  pg.tex = r.texCreate(S, S, { restore: () => Text.reset() });
  Text.pages.push(pg); return pg;
}
/** 字型圖集滿了或繪圖器換了：全部清掉，之後要用時再畫 */
Text.reset = () => {
  const r = Gfx.r;
  for (const pg of Text.pages) { if (r && r.textures.has(pg.tex)) r.texDelete(pg.tex); }
  Text.pages.length = 0; Text.glyphs.clear();
};
function glyph(ch, st, R, stroke) {
  const fam = st.font || Text.font, key = `${fam}|${st.weight || 400}|${st.italic ? 1 : 0}|${R}|${stroke}|${ch}`;
  let g = Text.glyphs.get(key);
  if (g) return g;
  const r = Gfx.r;
  const mc = textCtx(); mc.font = fontSpec(st, R);
  const m = mc.measureText(ch);
  const asc = m.fontBoundingBoxAscent || R * 0.95, desc = m.fontBoundingBoxDescent || R * 0.28;
  const left = Math.max(0, m.actualBoundingBoxLeft || 0), right = Math.max(m.width, m.actualBoundingBoxRight || m.width);
  const pad = 2 + Math.ceil(stroke), cw = Math.ceil(left + right) + pad * 2, chh = Math.ceil(asc + desc) + pad * 2;
  g = { page: null, sx: 0, sy: 0, sw: cw, sh: chh, ox: -(pad + left), oy: -(pad + asc), adv: m.width, R, color: EMOJI.test(ch), empty: ch === ' ' || ch === '　' };
  if (g.empty || !r) { Text.glyphs.set(key, g); return g; }
  let pg = null, p = null;
  for (const q of Text.pages) { p = q.sky.insert(cw, chh); if (p) { pg = q; break; } }
  if (!p) {
    if (Text.pages.length >= Text.maxPages) { Text.reset(); return glyph(ch, st, R, stroke); }
    pg = newGlyphPage(); p = pg.sky.insert(cw, chh);
    if (!p) { Text.glyphs.set(key, g); g.empty = true; return g; }
  }
  g.page = pg; g.sx = p.x; g.sy = p.y;
  const draw = (ctx, ox, oy) => {
    ctx.save(); ctx.font = fontSpec(st, R); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const bx = ox + pad + left, by = oy + pad + asc;
    if (stroke > 0) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stroke * 2; ctx.strokeStyle = '#fff'; ctx.strokeText(ch, bx, by); }
    ctx.fillStyle = '#fff'; ctx.fillText(ch, bx, by);
    ctx.restore();
  };
  if (r.kind === 'canvas2d') { draw(pg.tex.ctx, p.x, p.y); pg.tex._white = null; }
  else { const ctx = scratch(cw, chh); draw(ctx, 0, 0); r.texUpload(pg.tex, Art._scratch, p.x, p.y); }
  Text.glyphs.set(key, g);
  return g;
}

/** 把字串切成「斷行單位」：中文一字一個、英文一個單字一個、空白獨立 */
function tokens(str) {
  const out = []; let cur = '';
  for (const ch of str) {
    if (ch === '\n') { if (cur) out.push(cur); cur = ''; out.push('\n'); continue; }
    if (ch === ' ' || ch === '\t') { if (cur) out.push(cur); cur = ''; out.push(' '); continue; }
    if (isWide(ch) || EMOJI.test(ch)) { if (cur) out.push(cur); cur = ''; out.push(ch); continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
/** 量寬度（邏輯 px） */
Text.measure = (str, st = {}) => {
  const size = st.size || 16, ls = st.letterSpacing || 0;
  const key = (st.font || '') + '|' + (st.weight || 400) + '|' + (st.italic ? 1 : 0) + '|' + size + '|' + ls + '|' + str;
  let w = Text._measure.get(key);
  if (w !== undefined) return w;
  const mc = textCtx(); mc.font = fontSpec(st, 64);
  w = 0; for (const ch of str) w += mc.measureText(ch).width * size / 64 + ls;
  if (str.length) w -= ls;
  if (Text._measure.size > 4000) Text._measure.clear();
  Text._measure.set(key, w);
  return w;
};
/** 斷行：回傳每一行的字串 */
Text.wrap = (str, st = {}) => {
  str = String(str);
  const maxW = st.maxWidth || 0;
  if (!maxW) return str.split('\n');
  const lines = []; let line = '', lw = 0;
  const sp = Text.measure(' ', st);
  const toks = tokens(str);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '\n') { lines.push(line); line = ''; lw = 0; continue; }
    const tw = t === ' ' ? sp : Text.measure(t, st);
    if (line && lw + tw > maxW && t !== ' ') {
      if (NO_START.has(t[0]) && t.length === 1) { line += t; lw += tw; continue; } // 標點掛在行尾
      // 行尾是左括號：把它一起帶到下一行
      let carry = '';
      while (line && NO_END.has(line[line.length - 1])) { carry = line[line.length - 1] + carry; line = line.slice(0, -1); }
      lines.push(line.replace(/\s+$/, '')); line = carry + t; lw = Text.measure(line, st);
      continue;
    }
    if (!line && t === ' ') continue;
    line += t; lw += tw;
  }
  lines.push(line.replace(/\s+$/, ''));
  return lines;
};

/**
 * 把字畫出來（由 g.text 呼叫）。m：目前矩陣 [a,b,c,d,e,f]（邏輯座標 → 畫布像素）
 * 回傳 {w, h}（邏輯大小）
 */
Text.draw = (r, m, str, x, y, st, alphaMul) => {
  if (r.kind === 'canvas2d') return drawNative(r, m, str, x, y, st, alphaMul);
  const size = st.size || 16, lh = (st.lineHeight || 1.25) * size, ls = st.letterSpacing || 0;
  const lines = Text.wrap(str, st);
  const msc = Math.hypot(m[0], m[1]);
  const R = rasterSize(size * msc * (st.sharp || 1)), k = size / R;
  const align = st.align || 'left', base = st.baseline || 'top';
  const totalH = lines.length * lh;
  let y0 = y;
  if (base === 'middle') y0 = y - totalH / 2; else if (base === 'bottom') y0 = y - totalH; else if (base === 'alphabetic') y0 = y - size * 0.95;
  const asc = size * 0.95 + (lh - size * 1.23) / 2; // 第一行基線離頂端的距離
  let maxW = 0;
  const widths = lines.map((l) => { const w = Text.measure(l, st); if (w > maxW) maxW = w; return w; });
  const color = toColor(st.color || '#fff'), a = alphaMul;
  const passes = [];
  if (st.shadow) { const s = st.shadow === true ? {} : st.shadow; passes.push({ stroke: st.outline || 0, color: toColor(s.color || 'rgba(0,0,0,.55)'), dx: s.x != null ? s.x : size * 0.06, dy: s.y != null ? s.y : size * 0.08 }); }
  if (st.outline) passes.push({ stroke: st.outline, color: toColor(st.outlineColor || '#000'), dx: 0, dy: 0 });
  passes.push({ stroke: 0, color, dx: 0, dy: 0, fill: true });
  const [ma, mb, mc, md, me, mf] = m;
  for (const ps of passes) {
    const strokeR = ps.stroke / k;
    const col = Color.alpha(ps.color, cA(ps.color) * a), add = st.add || 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]; let px = x + ps.dx;
      if (align === 'center') px -= widths[li] / 2; else if (align === 'right') px -= widths[li];
      const by = y0 + li * lh + asc + ps.dy;
      for (const ch of line) {
        const g = glyph(ch, st, R, Math.round(strokeR));
        if (!g.empty && g.page) {
          const gx = px + g.ox * k, gy = by + g.oy * k, gw = g.sw * k, gh = g.sh * k;
          // 單位正方形 → 字的格子
          const a1 = ma * gw, b1 = mb * gw, c1 = mc * gh, d1 = md * gh, e1 = ma * gx + mc * gy + me, f1 = mb * gx + md * gy + mf;
          const tex = g.page.tex, cc = g.color && ps.fill ? Color.alpha(WHITE, cA(col)) : col;
          r.quad(tex, a1, b1, c1, d1, e1, f1, g.sx / tex.w, g.sy / tex.h, (g.sx + g.sw) / tex.w, (g.sy + g.sh) / tex.h, cc, MODE.sprite, add, 0);
        }
        px += g.adv * k + ls;
      }
    }
  }
  return { w: maxW, h: totalH, lines: lines.length };
};

/** Canvas2D 模式：直接用瀏覽器畫字（不經過字型圖集，才能上色、描邊） */
function drawNative(r, m, str, x, y, st, alphaMul) {
  const ctx = r.cur, size = st.size || 16, lh = (st.lineHeight || 1.25) * size, ls = st.letterSpacing || 0;
  const lines = Text.wrap(str, st), totalH = lines.length * lh, base = st.baseline || 'top', align = st.align || 'left';
  let y0 = y; if (base === 'middle') y0 = y - totalH / 2; else if (base === 'bottom') y0 = y - totalH; else if (base === 'alphabetic') y0 = y - size * 0.95;
  const asc = size * 0.95 + (lh - size * 1.23) / 2;
  ctx.save(); ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.font = fontSpec(st, size); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.globalCompositeOperation = st.add ? 'lighter' : 'source-over'; ctx.lineJoin = 'round';
  if ('letterSpacing' in ctx && ls) ctx.letterSpacing = ls + 'px';
  let maxW = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li], w = Text.measure(line, st); maxW = Math.max(maxW, w);
    let px = x; if (align === 'center') px -= w / 2; else if (align === 'right') px -= w;
    const by = y0 + li * lh + asc;
    if (st.shadow) { const sh = st.shadow === true ? {} : st.shadow, sc = toColor(sh.color || 'rgba(0,0,0,.55)'); ctx.globalAlpha = cA(sc) * alphaMul; ctx.fillStyle = ctx.strokeStyle = Color.css(sc | 0xff000000); const dx = sh.x != null ? sh.x : size * 0.06, dy = sh.y != null ? sh.y : size * 0.08; if (st.outline) { ctx.lineWidth = st.outline * 2; ctx.strokeText(line, px + dx, by + dy); } ctx.fillText(line, px + dx, by + dy); }
    if (st.outline) { const oc = toColor(st.outlineColor || '#000'); ctx.globalAlpha = cA(oc) * alphaMul; ctx.strokeStyle = Color.css(oc | 0xff000000); ctx.lineWidth = st.outline * 2; ctx.strokeText(line, px, by); }
    const fc = toColor(st.color || '#fff'); ctx.globalAlpha = cA(fc) * alphaMul; ctx.fillStyle = Color.css(fc | 0xff000000); ctx.fillText(line, px, by);
  }
  ctx.restore();
  return { w: maxW, h: totalH, lines: lines.length };
}
/** 等字型載好（嵌入字型、網路字型）再畫字，不然會先用到替代字型 */
Text.ready = async (families = [], timeout = 2500) => {
  if (!HAS_DOM || !document.fonts) return;
  const loads = families.map((f) => document.fonts.load(`700 32px "${f}"`, '測試字ABC').catch(() => null));
  await Promise.race([Promise.all(loads).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, timeout))]);
};
if (HAS_DOM && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (Gfx.r) Text.reset(); Text._measure.clear(); });
