/* ───────── 封面：每本書都是一冊線裝書（布面、右側四眼線裝、左上題簽、朱印） ───────── */
const Cover = (() => {
  const CLOTHS = ['#1d2f4a', '#4a2c20', '#1e3a34', '#3b2238', '#2b2f38', '#5a3d1e', '#263a52', '#40282a', '#2f3b22'];
  const MOTIFS = ['waves', 'cloud', 'moon', 'grid', 'reeds'];
  const mix = (hex, to, a) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const c = p(hex), t = p(to);
    return '#' + c.map((v, i) => Math.round(v + (t[i] - v) * a).toString(16).padStart(2, '0')).join('');
  };
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  const motifs = {
    // 關山：層疊的山脊、嶺上一座烽燧、落雪
    pass(r, hi, lo, cloth) {
      let s = '<circle cx="132" cy="92" r="26" fill="' + hi + '" opacity=".1"/><circle cx="132" cy="92" r="17" fill="' + hi + '" opacity=".16"/>';
      const tones = [mix(cloth, '#ffffff', .13), mix(cloth, '#000000', .2), mix(cloth, '#000000', .42)];
      let peak = [0, 0];
      for (let k = 0; k < 3; k++) {
        const base = 206 + k * 30; let d = 'M0 ' + (base + 6);
        for (let x = 0; x <= 180; x += 12 + r() * 16) { const y = base - r() * (34 - k * 8) - (k === 1 ? 22 * Math.exp(-Math.pow((x - 112) / 26, 2)) : 0); d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0); if (k === 1 && Math.abs(x - 112) < 12 && (!peak[1] || y < peak[1])) peak = [x, y]; }
        s += '<path d="' + d + ' L180 300 L0 300Z" fill="' + tones[k] + '"/>';
        if (k === 1 && peak[1]) s += '<path d="M' + (peak[0] - 5) + ' ' + (peak[1] + 2) + 'l1.500-15h7l1.500 15z" fill="' + tones[2] + '"/><circle cx="' + peak[0] + '" cy="' + (peak[1] - 16) + '" r="2" fill="#ffc977"/><circle cx="' + peak[0] + '" cy="' + (peak[1] - 16) + '" r="7" fill="#ffc977" opacity=".16"/>';
      }
      for (let i = 0; i < 30; i++) s += '<circle cx="' + (r() * 176).toFixed(0) + '" cy="' + (40 + r() * 230).toFixed(0) + '" r="' + (.5 + r() * 1).toFixed(1) + '" fill="#fff" opacity="' + (.12 + r() * .3).toFixed(2) + '"/>';
      return s;
    },
    // 環帶：小行星帶的弧、碎石、一點船燈
    belt(r, hi, lo) {
      let s = '';
      for (let k = 0; k < 4; k++) s += '<ellipse cx="150" cy="250" rx="' + (70 + k * 26) + '" ry="' + (22 + k * 9) + '" fill="none" stroke="' + hi + '" stroke-width="' + (k === 1 ? 1.2 : .6) + '" opacity="' + (.34 - k * .05) + '" transform="rotate(-24 150 250)"/>';
      for (let i = 0; i < 40; i++) { const a = r() * 6.283, rr = 76 + r() * 70, x = 150 + Math.cos(a) * rr, y = 250 + Math.sin(a) * rr * .34, c = Math.cos(-.42), n = Math.sin(-.42), X = 150 + (x - 150) * c - (y - 250) * n, Y = 250 + (x - 150) * n + (y - 250) * c; if (X < 2 || X > 176 || Y > 296) continue; s += '<rect x="' + X.toFixed(1) + '" y="' + Y.toFixed(1) + '" width="' + (1 + r() * 2.6).toFixed(1) + '" height="' + (1 + r() * 2).toFixed(1) + '" fill="' + hi + '" opacity="' + (.25 + r() * .4).toFixed(2) + '" transform="rotate(' + (r() * 90).toFixed(0) + ' ' + X.toFixed(1) + ' ' + Y.toFixed(1) + ')"/>'; }
      return s + '<circle cx="96" cy="206" r="1.8" fill="#ffd9a0" opacity=".9"/><circle cx="96" cy="206" r="6" fill="#ffd9a0" opacity=".12"/>';
    },
    // 浮字：一行行沒說出口的話，往上淡掉
    words(r, hi) {
      let s = '';
      for (let c = 0; c < 6; c++) { const x = 92 + c * 15; let y = 150 + r() * 60; for (let i = 0; i < 9 && y < 290; i++) { const hgt = 5 + r() * 9; s += '<rect x="' + x + '" y="' + y.toFixed(0) + '" width="7" height="' + hgt.toFixed(0) + '" rx="1" fill="' + hi + '" opacity="' + (.05 + (y - 150) / 150 * .3).toFixed(2) + '"/>'; y += hgt + 4; } }
      return s;
    },
    // 殘卷：蟲蛀破口的紙邊與流雲
    scroll(r, hi, lo) {
      let d = 'M86 300'; for (let y = 300; y >= 196; y -= 8) d += ' L' + (86 + r() * 9).toFixed(0) + ' ' + y; d += ' L178 196 L178 300Z';
      let s = '<path d="' + d + '" fill="' + hi + '" opacity=".14"/>';
      for (let i = 0; i < 5; i++) s += '<path d="M' + (100 + i * 14) + ' 206v' + (70 + r() * 16).toFixed(0) + '" stroke="' + hi + '" stroke-width=".7" opacity=".3"/>';
      for (let i = 0; i < 3; i++) { const x = 30 + r() * 90, y = 200 + i * 30; s += '<path d="M' + x + ' ' + y + 'q9-9 18 0t18 0" fill="none" stroke="' + hi + '" stroke-width=".9" opacity=".3"/>'; }
      return s;
    },
    // 雷紋：秦器上的回字紋
    thunder(r, hi) {
      let s = '';
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const x = 6 + i * 29, y = 208 + row * 29; s += '<path d="M' + x + ' ' + y + 'h23v23h-18v-13h9v6" fill="none" stroke="' + hi + '" stroke-width="1.3" opacity="' + (.16 + row * .1) + '"/>'; }
      return s;
    },
    // 海線：一條沿海的路，浪一層一層
    road(r, hi) {
      let s = '<path d="M20 300C40 262 120 262 110 228S60 198 150 172" fill="none" stroke="' + hi + '" stroke-width="5" opacity=".14"/><path d="M20 300C40 262 120 262 110 228S60 198 150 172" fill="none" stroke="' + hi + '" stroke-width=".9" stroke-dasharray="5 6" opacity=".5"/>';
      for (let i = 0; i < 5; i++) s += '<path d="M' + (112 + i * 5) + ' ' + (236 + i * 13) + 'q8-6 16 0t16 0t16 0" fill="none" stroke="' + hi + '" stroke-width=".8" opacity="' + (.2 + i * .05) + '"/>';
      return s;
    },
    // 孤月遠峰
    moon(r, hi, lo) {
      return '<circle cx="118" cy="178" r="34" fill="' + hi + '" opacity=".1"/><circle cx="118" cy="178" r="34" fill="none" stroke="' + hi + '" stroke-width=".8" opacity=".4"/><path d="M0 268L34 226l22 24 30-42 38 50 22-20 32 30v34H0z" fill="' + lo + '" opacity=".7"/>';
    },
    // 繩紋：一道絞緊的繩
    rope(r, hi) {
      let s = '';
      for (let i = 0; i < 16; i++) s += '<path d="M' + (i * 12 - 6) + ' 262q8-16 16 0" fill="none" stroke="' + hi + '" stroke-width="2.4" opacity=".28"/><path d="M' + (i * 12) + ' 258q8 16 16 0" fill="none" stroke="' + hi + '" stroke-width="1" opacity=".2"/>';
      return s;
    },
    waves(r, hi) {
      let s = '';
      for (let row = 0; row < 5; row++) for (let i = -1; i < 7; i++) { const x = i * 30 + (row % 2 ? 15 : 0), y = 300 - row * 15; s += '<path d="M' + x + ' ' + y + 'a15 15 0 0 1 30 0M' + (x + 6) + ' ' + y + 'a9 9 0 0 1 18 0" fill="none" stroke="' + hi + '" stroke-width=".8" opacity="' + (.34 - row * .05) + '"/>'; }
      return s;
    },
    cloud(r, hi) {
      let s = '';
      for (let i = 0; i < 5; i++) { const x = 16 + r() * 110, y = 188 + i * 22; s += '<path d="M' + x + ' ' + y + 'c6-10 20-10 24 0c8-6 18 0 16 8h-48c-4-4 0-10 8-8z" fill="none" stroke="' + hi + '" stroke-width=".9" opacity="' + (.2 + r() * .2).toFixed(2) + '"/>'; }
      return s;
    },
    grid(r, hi) {
      let s = '';
      for (let i = 0; i < 7; i++) s += '<path d="M' + (8 + i * 27) + ' 196v104" stroke="' + hi + '" stroke-width=".6" opacity=".22"/>';
      return s + '<path d="M0 196h178" stroke="' + hi + '" stroke-width="1.2" opacity=".3"/>';
    },
    reeds(r, hi) {
      let s = '';
      for (let i = 0; i < 14; i++) { const x = 20 + r() * 150, hgt = 40 + r() * 70, bend = (r() - .5) * 30; s += '<path d="M' + x.toFixed(0) + ' 300q' + (bend / 2).toFixed(0) + '-' + (hgt / 2).toFixed(0) + ' ' + bend.toFixed(0) + '-' + hgt.toFixed(0) + '" fill="none" stroke="' + hi + '" stroke-width=".9" opacity="' + (.2 + r() * .25).toFixed(2) + '"/>'; }
      return s;
    },
    plain() { return ''; },
  };

  function slip(title, seal) {
    const latin = (title.match(/[\x20-\x7e]/g) || []).length > title.length * .5;
    let chars = Array.from(title.replace(/\s+/g, latin ? ' ' : ''));
    let out = '', H;
    if (latin) {
      const t = chars.length > 26 ? chars.slice(0, 25).join('') + '…' : chars.join('');
      H = clamp(40 + t.length * 8.2, 110, 236);
      out += '<text transform="translate(47 ' + (36) + ') rotate(90)" font-size="15" class="cv-t" textLength="' + Math.min(H - 44, t.length * 8.6).toFixed(0) + '" lengthAdjust="spacingAndGlyphs">' + esc(t) + '</text>';
    } else {
      if (chars.length > 16) chars = chars.slice(0, 15).concat('…');
      const two = chars.length > 8, per = two ? Math.ceil(chars.length / 2) : chars.length;
      const fs = two ? 17 : clamp(190 / Math.max(per, 4), 18, 27), step = fs * 1.16;
      H = Math.max(96, 30 + per * step + 26);
      chars.forEach((c, i) => {
        const col = two ? Math.floor(i / per) : 0, row = two ? i % per : i;
        const x = two ? (col === 0 ? 53 : 33) : 43;
        out += '<text x="' + x + '" y="' + (36 + row * step + fs * .86).toFixed(1) + '" font-size="' + fs.toFixed(1) + '" text-anchor="middle" class="cv-t">' + esc(c) + '</text>';
      });
    }
    const y1 = 22 + H;
    return '<g><rect x="20" y="22" width="46" height="' + H.toFixed(0) + '" rx="1.500" fill="#ece4d2"/><rect x="20" y="22" width="46" height="' + H.toFixed(0) + '" rx="1.500" fill="url(#cvPaper)"/>'
      + '<rect x="22.500" y="24.500" width="41" height="' + (H - 5).toFixed(0) + '" fill="none" stroke="#7b6a48" stroke-width=".7" opacity=".55"/>' + out
      + '<rect x="34" y="' + (y1 - 23).toFixed(0) + '" width="18" height="18" rx="2" fill="#b3382c"/><text x="43" y="' + (y1 - 9.200).toFixed(1) + '" font-size="12.500" text-anchor="middle" class="cv-s">' + esc(seal) + '</text></g>';
  }

  function svg(book, opt) {
    opt = opt || {};
    const cv = book.cover || {}, id = book.id || book.title;
    const cloth = cv.cloth || CLOTHS[hash32(id) % CLOTHS.length];
    const hi = mix(cloth, '#ffffff', .55), lo = mix(cloth, '#000000', .35);
    const motif = motifs[cv.motif] ? cv.motif : MOTIFS[hash32(id + 'm') % MOTIFS.length];
    const r = rng(hash32(id) || 7);
    const uid = 'c' + hash32(id + (opt.k || '')).toString(36);
    let holes = '';
    [34, 111, 189, 266].forEach((y) => { holes += '<path d="M185 ' + y + 'h15" stroke="#e4dcc8" stroke-width="1.300" opacity=".9"/><circle cx="185" cy="' + y + '" r="1.700" fill="#0c0f14"/>'; });
    const img = opt.img ? '<image href="' + opt.img + '" x="0" y="0" width="200" height="300" preserveAspectRatio="xMidYMid slice"/>' : '';
    return '<svg class="cover-svg" viewBox="0 0 200 300" role="img" aria-label="' + esc(book.title) + ' 封面" preserveAspectRatio="xMidYMid slice">'
      + '<defs><pattern id="' + uid + 'w" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5h3M.5 0v3" stroke="#fff" stroke-width=".35" opacity=".07"/><path d="M0 2h3" stroke="#000" stroke-width=".35" opacity=".12"/></pattern>'
      + '<linearGradient id="' + uid + 'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>'
      + '<linearGradient id="cvPaper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#8a7a5a" stop-opacity=".18"/></linearGradient></defs>'
      + '<rect width="200" height="300" fill="' + cloth + '"/>'
      + (img || ('<g>' + motifs[motif](r, hi, lo, cloth) + '</g>'))
      + '<rect width="200" height="300" fill="url(#' + uid + 'w)"/>'
      + (img ? '' : slip(book.title || '無題', cv.seal || Array.from(book.title || '書')[0]))
      + '<rect x="178" width="22" height="300" fill="#000" opacity="' + (img ? .28 : .2) + '"/><path d="M178 0v300" stroke="#000" stroke-width=".8" opacity=".35"/>'
      + '<path d="M185 0v300" stroke="#e4dcc8" stroke-width="1.300" opacity=".9"/>' + holes
      + '<rect width="200" height="300" fill="url(#' + uid + 'l)"/></svg>';
  }

  function pick(title) { const h = hash32(title); return { cloth: CLOTHS[h % CLOTHS.length], motif: MOTIFS[(h >>> 8) % MOTIFS.length], seal: Array.from(title.replace(/[\s《》「」]/g, '') || '書')[0] }; }
  /* 給鎖屏與系統播放器用的封面圖（PNG data URL） */
  function png(book, size) {
    return new Promise((res) => {
      try {
        const s = svg(book, { k: 'png' }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" ').replace(/class="cv-t"/g, 'font-family="serif" font-weight="700" fill="#2a2118"').replace(/class="cv-s"/g, 'font-family="serif" font-weight="700" fill="#fff"');
        const im = new Image();
        im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.fillStyle = (book.cover && book.cover.cloth) || '#1d2f4a'; g.fillRect(0, 0, size, size); const w = size * .62, hh = w * 1.5; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = size * .05; g.drawImage(im, (size - w) / 2, (size - hh) / 2, w, hh); try { res(c.toDataURL('image/png')); } catch (e) { res(''); } };
        im.onerror = () => res('');
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      } catch (e) { res(''); }
    });
  }
  return { svg, pick, png, CLOTHS };
})();
