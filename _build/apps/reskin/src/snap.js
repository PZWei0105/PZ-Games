/* ===================== snapshot: paint a skin (canvases, pictures, boxes, gradients, text) onto one canvas =====================
   Used by the skin transitions (the old skin shatters / dissolves as a picture), the music videos (every frame) and the
   lock-screen cards. It is not a browser engine: it paints what matters (canvases, the cover, backgrounds, borders,
   linear / radial / striped gradients, text with its glow, clip shapes) and skips the rest (pseudo-elements, filters). */
R.snap = (() => {
  const imgs = new Map();
  function image(url) {
    if (!url) return null;
    let e = imgs.get(url);
    if (!e) {
      e = { im: new Image(), ok: false };
      e.im.onload = () => { e.ok = true; }; e.im.src = url;
      imgs.set(url, e);
      if (imgs.size > 30) imgs.delete(imgs.keys().next().value);
    }
    return e.ok ? e.im : null;
  }
  // split "a(b,c), d" at top-level commas
  function split(s) {
    const out = []; let d = 0, cur = '';
    for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  const COL = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|transparent|[a-z]+(?=\s|$))/i;
  function stops(parts, len) {
    const out = [];
    for (const p of parts) {
      const m = COL.exec(p); if (!m) continue;
      const col = m[1] === 'transparent' ? 'rgba(0,0,0,0)' : m[1];
      const rest = p.slice(m.index + m[1].length).trim().split(/\s+/).filter(Boolean);
      const pos = rest.map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : x.endsWith('px') ? parseFloat(x) / (len || 1) : NaN)).filter((x) => !isNaN(x));
      if (!pos.length) out.push([null, col]);
      for (const q of pos) out.push([q, col]);
    }
    // stops without a position spread evenly between their neighbours
    if (!out.length) return out;
    if (out[0][0] == null) out[0][0] = 0;
    if (out[out.length - 1][0] == null) out[out.length - 1][0] = 1;
    for (let i = 1; i < out.length; i++) {
      if (out[i][0] != null) { if (out[i][0] < out[i - 1][0]) out[i][0] = out[i - 1][0]; continue; }
      let j = i; while (out[j][0] == null) j++;
      for (let k = i; k < j; k++) out[k][0] = out[i - 1][0] + ((out[j][0] - out[i - 1][0]) * (k - i + 1)) / (j - i + 1);
    }
    return out;
  }
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const DIR = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315 };
  // one background layer → paints itself into the box (x, y, w, h)
  function paintLayer(ctx, layer, x, y, w, h) {
    const m = /^(repeating-)?(linear|radial)-gradient\((.*)\)$/s.exec(layer);
    if (m) {
      const rep = !!m[1], parts = split(m[3]);
      if (m[2] === 'linear') {
        let ang = 180;
        if (/^-?[\d.]+(deg|turn|rad)$/.test(parts[0])) { const v = parseFloat(parts[0]); ang = parts[0].endsWith('turn') ? v * 360 : parts[0].endsWith('rad') ? (v * 180) / Math.PI : v; parts.shift(); }
        else if (/^to /.test(parts[0])) { ang = DIR[parts[0]] != null ? DIR[parts[0]] : 180; parts.shift(); }
        const a = (ang * Math.PI) / 180, sx = Math.sin(a), sy = -Math.cos(a);
        const L = Math.abs(w * sx) + Math.abs(h * sy);
        const st = stops(parts, L);
        if (!st.length) return;
        if (rep) {
          // stripes (scan lines, grooves): one period on a little canvas, repeated — only straight up/down or sideways
          const per = st[st.length - 1][0] * L; if (per < 1 || (Math.abs(sx) > 0.01 && Math.abs(sy) > 0.01)) return;
          const vert = Math.abs(sy) > 0.5, pc = document.createElement('canvas');
          pc.width = vert ? 1 : Math.ceil(per); pc.height = vert ? Math.ceil(per) : 1;
          const px = pc.getContext('2d'), g = vert ? px.createLinearGradient(0, 0, 0, per) : px.createLinearGradient(0, 0, per, 0);
          for (const [p, c] of st) g.addColorStop(clamp01((p * L) / per), c);
          px.fillStyle = g; px.fillRect(0, 0, pc.width, pc.height);
          const pat = ctx.createPattern(pc, 'repeat'); if (!pat) return;
          ctx.save(); ctx.translate(x, y); ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.restore();
          return;
        }
        const cx = x + w / 2, cy = y + h / 2;
        const g = ctx.createLinearGradient(cx - (sx * L) / 2, cy - (sy * L) / 2, cx + (sx * L) / 2, cy + (sy * L) / 2);
        for (const [p, c] of st) g.addColorStop(clamp01(p), c);
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        return;
      }
      if (rep) return;
      // radial: [shape / size] [at x y], then the colour stops
      let rx = null, ry = null, px = 0.5, py = 0.5;
      const head = parts[0];
      if (/ at |^(circle|ellipse|closest|farthest)|^[\d.]+(px|%)(\s+[\d.]+(px|%))?$/.test(head)) {
        parts.shift();
        const [sz, at] = head.split(' at ');
        const pos = (v, ref) => (v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : v === 'center' || v == null ? 0.5 : v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / ref);
        if (at) { const q = at.trim().split(/\s+/); px = pos(q[0], w); py = pos(q[1], h); if (!isFinite(px)) px = 0.5; if (!isFinite(py)) py = 0.5; }
        const nums = (sz || '').trim().split(/\s+/).filter((v) => /[\d.]+(px|%)$/.test(v));
        if (nums.length) { rx = nums[0].endsWith('%') ? (parseFloat(nums[0]) / 100) * w : parseFloat(nums[0]); ry = nums[1] ? (nums[1].endsWith('%') ? (parseFloat(nums[1]) / 100) * h : parseFloat(nums[1])) : rx; }
        else if (/closest-side/.test(sz || '')) { rx = Math.min(px, 1 - px) * w; ry = Math.min(py, 1 - py) * h; if (/circle/.test(sz)) rx = ry = Math.min(rx, ry); }
      }
      const cx = x + px * w, cy = y + py * h;
      if (rx == null) { const fx = Math.max(px, 1 - px) * w, fy = Math.max(py, 1 - py) * h; rx = fx * Math.SQRT2; ry = fy * Math.SQRT2; }
      const st = stops(parts, rx); if (!st.length || rx < 0.5) return;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx || 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      for (const [p, c] of st) g.addColorStop(clamp01(p), c);
      ctx.fillStyle = g; ctx.fillRect(-cx + x, (-cy + y) * (rx / ry || 1), w, h * (rx / ry || 1));
      ctx.restore();
      return;
    }
    const u = /^url\("?(.*?)"?\)$/.exec(layer);
    if (u) { const im = image(u[1]); if (im) cover(ctx, im, x, y, w, h); }
  }
  function cover(ctx, im, x, y, w, h, fit) {
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih) return;
    if (fit === 'fill') { ctx.drawImage(im, x, y, w, h); return; }
    const s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    if (fit === 'contain') { ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); return; }
    const sw = w / s, sh = h / s;
    ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }
  function radii(cs, w, h) {
    const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v, i) => { const n = parseFloat(v) || 0; return String(v).endsWith('%') ? (n / 100) * (i % 2 ? h : w) : n; });
    const k = Math.min(1, w / Math.max(1e-3, r[0] + r[1]), w / Math.max(1e-3, r[2] + r[3]), h / Math.max(1e-3, r[0] + r[3]), h / Math.max(1e-3, r[1] + r[2]));
    return r.map((v) => v * k);
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (!r || !(r[0] || r[1] || r[2] || r[3])) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + r[0], y); ctx.lineTo(x + w - r[1], y); ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);
    ctx.lineTo(x + w, y + h - r[2]); ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
    ctx.lineTo(x + r[3], y + h); ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);
    ctx.lineTo(x, y + r[0]); ctx.arcTo(x, y, x + r[0], y, r[0]); ctx.closePath();
  }
  // clip-path: polygon(), circle(), ellipse(), inset()
  function shapePath(ctx, cp, x, y, w, h) {
    const m = /^(polygon|circle|ellipse|inset)\((.*)\)/.exec(cp || ''); if (!m) return false;
    const len = (v, ref) => (String(v).endsWith('%') ? (parseFloat(v) / 100) * ref : parseFloat(v) || 0);
    ctx.beginPath();
    if (m[1] === 'polygon') {
      const pts = split(m[2].replace(/^(nonzero|evenodd)\s*,/, ''));
      pts.forEach((p, i) => { const [a, b] = p.trim().split(/\s+/); const px = x + len(a, w), py = y + len(b, h); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.closePath(); return true;
    }
    if (m[1] === 'circle' || m[1] === 'ellipse') {
      const [sz, at] = m[2].split(' at '); const q = (at || '50% 50%').trim().split(/\s+/);
      const cx = x + len(q[0] || '50%', w), cy = y + len(q[1] || '50%', h); const s = (sz || '').trim().split(/\s+/);
      let rx, ry;
      if (m[1] === 'circle') { rx = ry = s[0] && /[\d.]/.test(s[0]) ? len(s[0], Math.hypot(w, h) / Math.SQRT2) : Math.min(w, h) / 2; }
      else { rx = s[0] && /[\d.]/.test(s[0]) ? len(s[0], w) : w / 2; ry = s[1] && /[\d.]/.test(s[1]) ? len(s[1], h) : h / 2; }
      ctx.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); return true;
    }
    const [box, rnd] = m[2].split(' round '); const v = box.trim().split(/\s+/);
    const t = len(v[0], h), r = len(v[1] != null ? v[1] : v[0], w), b = len(v[2] != null ? v[2] : v[0], h), l = len(v[3] != null ? v[3] : v[1] != null ? v[1] : v[0], w);
    const rr = rnd ? parseFloat(rnd) || 0 : 0;
    rrect(ctx, x + l, y + t, Math.max(0, w - l - r), Math.max(0, h - t - b), [rr, rr, rr, rr]); return true;
  }
  const visible = (cs) => cs.display !== 'none' && cs.visibility !== 'hidden';
  const BLEND = { screen: 'screen', multiply: 'multiply', overlay: 'overlay', 'soft-light': 'soft-light', 'hard-light': 'hard-light', lighten: 'lighten', darken: 'darken', 'color-dodge': 'color-dodge', 'plus-lighter': 'lighter', difference: 'difference' };
  const CONTROL = 'button, input, select, textarea, .seek, .ctrl, [data-act], [data-snap-skip]';
  // the first text-shadow: colour x y blur
  function shadowOf(s) {
    if (!s || s === 'none') return null;
    const first = split(s)[0]; const m = COL.exec(first); if (!m) return null;
    const n = first.replace(m[1], '').trim().split(/\s+/).map(parseFloat);
    return { c: m[1], x: n[0] || 0, y: n[1] || 0, b: n[2] || 0 };
  }

  /* plan: walk the tree once (styles are read here, positions every frame) */
  function plan(root, opt) {
    opt = opt || {};
    const items = [];
    const walk = (el, alpha, clips, blend) => {
      for (const c of el.children) {
        if (c.classList && c.classList.contains('rs-glare')) continue;
        const cs = getComputedStyle(c);
        if (!visible(cs)) continue;
        const op = parseFloat(cs.opacity); if (!(op > 0.02)) continue;
        if (!opt.ui && c.matches(CONTROL)) continue;
        const a = alpha * op, tag = c.tagName;
        const bl = BLEND[cs.mixBlendMode] || blend;
        const own = cs.clipPath && cs.clipPath !== 'none' ? clips.concat([{ el: c, cp: cs.clipPath }]) : clips;
        if (tag === 'CANVAS') { items.push({ k: 'cv', el: c, a, clips: own, bl }); continue; }
        if (tag === 'IMG') { items.push({ k: 'img', el: c, a, clips: own, bl, fit: cs.objectFit, cs }); continue; }
        if (tag === 'svg' || tag === 'SVG') { if (opt.svg !== false) items.push({ k: 'svg', el: c, a, clips: own, bl }); continue; }
        if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SCRIPT') continue;
        // the box itself: background colour, background layers, a plain border
        const bg = cs.backgroundColor, bi = cs.backgroundImage;
        const hasBg = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
        const bw = parseFloat(cs.borderTopWidth) || 0;
        const hasBorder = bw > 0 && cs.borderTopStyle !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(cs.borderTopColor);
        const clipText = /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '');
        if ((hasBg || (bi && bi !== 'none') || hasBorder) && !clipText) items.push({ k: 'box', el: c, a, clips: own, bl, cs, bg: hasBg ? bg : null, bi: bi && bi !== 'none' ? split(bi).reverse() : null, border: hasBorder ? { w: bw, c: cs.borderTopColor } : null });
        // its own text
        let txt = '';
        for (const n of c.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
        txt = txt.replace(/\s+/g, ' ').trim();
        const kids = cs.overflow !== 'visible' ? own.concat([{ el: c, r: true, cs }]) : own;
        if (txt && opt.text !== false) items.push({ k: 'txt', el: c, a, clips: kids, bl, cs, txt: cs.textTransform === 'uppercase' ? txt.toUpperCase() : txt, grad: clipText ? (bi && bi !== 'none' ? split(bi)[0] : null) : null });
        if (c.children.length) walk(c, a, kids, bl);
      }
    };
    walk(root, 1, [], 'source-over');
    return { root, items, bg: getComputedStyle(document.body).backgroundColor };
  }

  const svgCache = new WeakMap();
  function svgRaster(el, w, h) {
    let c = svgCache.get(el);
    if (c && (c.pending || (c.w === Math.round(w) && c.h === Math.round(h)))) return c.ok ? c.im : null;
    c = { pending: true, ok: false, w: Math.round(w), h: Math.round(h), im: new Image() };
    svgCache.set(el, c);
    try {
      const clone = el.cloneNode(true), src = el.querySelectorAll('*'), dst = clone.querySelectorAll('*');
      for (let i = 0; i < src.length; i++) {
        const s = getComputedStyle(src[i]);
        for (const k of ['fill', 'stroke', 'stroke-width', 'opacity', 'stroke-dasharray', 'stroke-linecap', 'fill-opacity', 'stroke-opacity']) dst[i].setAttribute(k, s.getPropertyValue(k));
      }
      const cs = getComputedStyle(el);
      clone.setAttribute('width', c.w); clone.setAttribute('height', c.h);
      clone.setAttribute('fill', cs.fill); clone.setAttribute('stroke', cs.stroke);
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      c.im.onload = () => { c.ok = true; c.pending = false; };
      c.im.onerror = () => { c.pending = false; };
      c.im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    } catch (e) { c.pending = false; }
    return null;
  }

  /* draw a plan: screen coordinates are mapped by m = { ox, oy, s } (x' = (x - ox) * s) */
  function draw(ctx, P, m) {
    const s = m.s, X = (x) => (x - m.ox) * s, Y = (y) => (y - m.oy) * s;
    const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: X(r.left), y: Y(r.top), w: r.width * s, h: r.height * s }; };
    for (const it of P.items) {
      const el = it.el;
      if (!el.isConnected) continue;
      const r = rectOf(el);
      if (r.w < 0.5 || r.h < 0.5) continue;
      ctx.save();
      for (const c of it.clips) {
        const cr = rectOf(c.el);
        if (c.cp) { if (shapePath(ctx, c.cp, cr.x, cr.y, cr.w, cr.h)) ctx.clip(); }
        else { rrect(ctx, cr.x, cr.y, cr.w, cr.h, radii(c.cs || getComputedStyle(c.el), cr.w, cr.h)); ctx.clip(); }
      }
      ctx.globalAlpha = it.a; ctx.globalCompositeOperation = it.bl || 'source-over';
      try {
        if (it.k === 'cv') { if (el.width > 1 && el.height > 1) ctx.drawImage(el, r.x, r.y, r.w, r.h); }
        else if (it.k === 'img') {
          if (el.complete && el.naturalWidth && !el.classList.contains('blank')) {
            rrect(ctx, r.x, r.y, r.w, r.h, radii(it.cs, r.w, r.h)); ctx.clip();
            cover(ctx, el, r.x, r.y, r.w, r.h, it.fit === 'contain' ? 'contain' : it.fit === 'fill' ? 'fill' : 'cover');
          }
        } else if (it.k === 'svg') { const im = svgRaster(el, r.w / s, r.h / s); if (im) ctx.drawImage(im, r.x, r.y, r.w, r.h); }
        else if (it.k === 'box') {
          rrect(ctx, r.x, r.y, r.w, r.h, radii(it.cs, r.w, r.h));
          ctx.save(); ctx.clip();
          if (it.bg) { ctx.fillStyle = it.bg; ctx.fillRect(r.x, r.y, r.w, r.h); }
          if (it.bi) for (const L of it.bi) paintLayer(ctx, L, r.x, r.y, r.w, r.h);
          ctx.restore();
          if (it.border) { ctx.lineWidth = it.border.w * s; ctx.strokeStyle = it.border.c; rrect(ctx, r.x + ctx.lineWidth / 2, r.y + ctx.lineWidth / 2, r.w - ctx.lineWidth, r.h - ctx.lineWidth, radii(it.cs, r.w, r.h)); ctx.stroke(); }
        } else if (it.k === 'txt') text(ctx, it, r, s, X, Y);
      } catch (e) { /* one odd element never spoils the picture */ }
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function text(ctx, it, r, s, X, Y) {
    const cs = it.cs, el = it.el;
    const fs = parseFloat(cs.fontSize) * s;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs.toFixed(1)}px ${cs.fontFamily}`;
    const ls = parseFloat(cs.letterSpacing) || 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (ls * s).toFixed(1) + 'px';
    const col = cs.color;
    let fill = col;
    if (it.grad) { const g = document.createElement('canvas'); g.width = 2; g.height = Math.max(2, Math.round(r.h)); const gx = g.getContext('2d'); paintLayer(gx, it.grad, 0, 0, 2, g.height); fill = ctx.createPattern(g, 'repeat-x') || '#fff'; ctx.save(); ctx.translate(0, r.y); }
    const sh = shadowOf(cs.textShadow);
    if (sh) { ctx.shadowColor = sh.c; ctx.shadowBlur = sh.b * s; ctx.shadowOffsetX = sh.x * s; ctx.shadowOffsetY = sh.y * s; }
    ctx.fillStyle = fill; ctx.textBaseline = 'middle';
    // where the text really sits (padding, alignment): a range around its text nodes
    let tr = null, rects = null;
    try { const rg = document.createRange(); rg.selectNodeContents(el); tr = rg.getBoundingClientRect(); rects = rg.getClientRects(); } catch (e) { tr = null; }
    const dy = it.grad ? -r.y : 0;
    if (tr && tr.width > 0 && rects && rects.length <= 1) {
      ctx.textAlign = 'left';
      // text wider than its box (cut off with …) starts at the box's left edge
      const x = tr.width * s > r.w + 1 ? r.x : X(tr.left);
      ctx.fillText(it.txt, x, Y(tr.top) + (tr.height * s) / 2 + dy);
    } else {
      // wrapped text: lay it out again inside the box
      const lh = (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3) * s;
      const lines = []; let cur = '';
      for (const ch of Array.from(it.txt)) { if (ctx.measureText(cur + ch).width > r.w && cur) { lines.push(cur); cur = ch.trim() ? ch : ''; } else cur += ch; }
      if (cur) lines.push(cur);
      ctx.textAlign = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left';
      const ax = ctx.textAlign === 'center' ? r.x + r.w / 2 : ctx.textAlign === 'right' ? r.x + r.w : r.x;
      lines.forEach((l, i) => ctx.fillText(l, ax, r.y + lh * (i + 0.5) + dy));
    }
    if (it.grad) ctx.restore();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  // a still picture of an element (the whole skin by default) at scale s (1 = CSS pixels)
  function shot(root, opt) {
    opt = opt || {};
    root = root || R.stage.root(); if (!root) return null;
    const rb = root.getBoundingClientRect();
    const s = opt.s || 1;
    const c = opt.canvas || document.createElement('canvas');
    if (!opt.canvas) { c.width = Math.max(1, Math.round(rb.width * s)); c.height = Math.max(1, Math.round(rb.height * s)); }
    const x = c.getContext('2d');
    const P = plan(root, opt);
    x.fillStyle = opt.bg || P.bg || '#000'; x.fillRect(0, 0, c.width, c.height);
    draw(x, P, { ox: rb.left, oy: rb.top, s });
    return c;
  }
  return { plan, draw, shot, cover, rrect, paintLayer, image };
})();
