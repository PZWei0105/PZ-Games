/* ===================== covers: thumbnails, colors, generated art ===================== */
R.art = (() => {
  const { hashStr, color } = R;
  const urls = new Map();
  const imgs = new Map();

  async function loadImage(blob) {
    if (window.createImageBitmap) { try { return await createImageBitmap(blob); } catch (e) { /* fall back */ } }
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(blob); const im = new Image();
      im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 2000); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image decode failed')); };
      im.src = u;
    });
  }
  const toBlob = (cv, type, q) => new Promise((res) => { try { cv.toBlob((b) => res(b), type || 'image/jpeg', q || 0.86); } catch (e) { res(null); } });

  function paletteFrom(cv) {
    const x = cv.getContext('2d'); const d = x.getImageData(0, 0, cv.width, cv.height).data;
    let ar = 0, ag = 0, ab = 0, n = 0; const bins = []; for (let i = 0; i < 12; i++) bins.push({ w: 0, r: 0, g: 0, b: 0 });
    let dk = { w: 0, r: 0, g: 0, b: 0 };
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      ar += r; ag += g; ab += b; n++;
      const [h, s, l] = color.rgbToHsl(r, g, b);
      const v = Math.max(r, g, b) / 255;
      if (l < 0.28) { dk.w++; dk.r += r; dk.g += g; dk.b += b; }
      if (l < 0.12 || l > 0.92 || s < 0.18) continue;
      const w = s * s * v * (1 - Math.abs(l - 0.55));
      const bn = bins[Math.floor(h / 30) % 12]; bn.w += w; bn.r += r * w; bn.g += g * w; bn.b += b * w;
    }
    const avg = color.rgbToHex(ar / n, ag / n, ab / n);
    const best = bins.reduce((a, b) => (b.w > a.w ? b : a), bins[0]);
    let vibrant;
    if (best.w > 0.4) {
      const [h, s, l] = color.rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
      vibrant = color.hsl(h, Math.max(0.55, s), Math.min(0.66, Math.max(0.48, l)));
    } else {
      const [h] = color.rgbToHsl(...color.hexToRgb(avg));
      vibrant = color.hsl(h, 0.35, 0.62);
    }
    const dark = dk.w > 8 ? color.mix(color.rgbToHex(dk.r / dk.w, dk.g / dk.w, dk.b / dk.w), '#000000', 0.3) : color.mix(avg, '#000000', 0.72);
    return { avg, vibrant, dark, light: color.mix(vibrant, '#ffffff', 0.72), isDark: color.lum(avg) < 0.3 };
  }

  async function processCover(blob) {
    const img = await loadImage(blob);
    const w = img.width, h = img.height, s = Math.min(w, h);
    if (!s) throw new Error('empty image');
    const sx = (w - s) / 2, sy = (h - s) / 2;
    const mk = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, sx, sy, s, s, 0, 0, n, n); return c; };
    const full = mk(Math.min(720, Math.max(256, s)));
    const out = { full: await toBlob(full, 'image/jpeg', 0.88), thumb: await toBlob(mk(128), 'image/jpeg', 0.8), colors: paletteFrom(mk(24)) };
    if (img.close) img.close();
    if (!out.full || !out.thumb) throw new Error('encode failed');
    return out;
  }

  function placeholderColors(t) {
    const h = hashStr((t && t.title) + '|' + (t && t.artist));
    const hue = h % 360, hue2 = (hue + 35 + ((h >> 9) % 90)) % 360;
    return { avg: color.hsl(hue, 0.45, 0.32), vibrant: color.hsl(hue, 0.78, 0.6), dark: color.hsl(hue, 0.5, 0.1), light: color.hsl(hue, 0.65, 0.86), isDark: true, hue, hue2 };
  }
  const colorsOf = (t) => (t && t.colors) || placeholderColors(t || {});

  // generated sleeve for songs without artwork: gradient, rings, a waveform and the first character of the title
  function placeholder(t, n) {
    const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    const pc = placeholderColors(t), rnd = R.rng(hashStr(t.id || t.title || 'x'));
    const g = x.createLinearGradient(0, 0, n, n);
    g.addColorStop(0, color.hsl(pc.hue, 0.7, 0.42)); g.addColorStop(1, color.hsl(pc.hue2, 0.75, 0.16));
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const rg = x.createRadialGradient(rnd() * n, rnd() * n, 0, rnd() * n, rnd() * n, n * (0.4 + rnd() * 0.5));
      rg.addColorStop(0, color.rgba(color.hsl(pc.hue + rnd() * 80 - 40, 0.9, 0.6), 0.35)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg; x.fillRect(0, 0, n, n);
    }
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = n * 0.004;
    for (let r = n * 0.12; r < n * 0.75; r += n * 0.045) { x.beginPath(); x.arc(n * 0.72, n * 0.3, r, 0, R.TAU); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.75)';
    const bw = n / 44;
    for (let i = 0; i < 22; i++) { const hh = n * (0.03 + Math.pow(rnd(), 1.6) * 0.16); x.fillRect(n * 0.08 + i * bw * 1.6, n * 0.86 - hh, bw, hh); }
    const ch = (t.title || '♪').trim().charAt(0) || '♪';
    x.font = `700 ${Math.round(n * 0.34)}px -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
    x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.92)';
    x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = n * 0.03;
    x.fillText(ch, n * 0.1, n * 0.5);
    return c;
  }

  async function coverUrl(t, size) {
    if (!t) return null;
    size = size || 'full';
    const key = t.id + ':' + size;
    if (urls.has(key)) return urls.get(key);
    let blob = null;
    if (t.cover) { try { blob = await R.db.get('covers', size === 'thumb' ? t.id + ':t' : t.id); } catch (e) { /* ignore */ } }
    if (!blob) blob = await toBlob(placeholder(t, size === 'thumb' ? 128 : 512), 'image/jpeg', 0.9);
    if (!blob) return null;
    if (urls.has(key)) return urls.get(key);
    const u = URL.createObjectURL(blob); urls.set(key, u);
    return u;
  }
  async function coverImage(t) {
    if (!t) return null;
    if (imgs.has(t.id)) return imgs.get(t.id);
    const u = await coverUrl(t, 'full');
    if (!u) return null;
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });
    if (im) { imgs.set(t.id, im); if (imgs.size > 12) imgs.delete(imgs.keys().next().value); }
    return im;
  }
  function forget(id) {
    for (const s of ['full', 'thumb']) { const k = id + ':' + s; if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k); } }
    imgs.delete(id);
  }
  return { processCover, coverUrl, coverImage, colorsOf, placeholder, forget, loadImage, toBlob };
})();
