/* ===================== DIY skins: own photo, colours, visualiser, layout, font + the editor ===================== */
(() => {
  const { esc, I, settings } = R;
  const FONTS = { round: '"Fredoka", var(--sans)', tech: '"Orbitron", var(--sans)', hand: '"Permanent Marker", var(--sans)', serif: '"Playfair Display", var(--sans)', sys: 'var(--sans)' };
  const VIZ = [['bars', '光柱'], ['wave', '波形'], ['ring', '光環'], ['particles', '粒子']];
  const LAYOUT = [['card', '卡片'], ['full', '滿版']];
  const FONT_L = [['round', '圓體'], ['tech', '科技'], ['hand', '手寫'], ['serif', '典雅'], ['sys', '系統']];
  const SW = ['#ff6fae', '#ff3b4a', '#ff8a3d', '#ffd23f', '#7cff6b', '#3ff0d0', '#22b8ff', '#7a6bff', '#c86bff', '#ffffff'];
  const blank = () => ({ id: 'diy-' + R.uid(), name: '我的 Skin', photo: null, dim: 0.45, blur: 0.35, accent: '#ff6fae', accent2: '#3ff0d0', viz: 'bars', layout: 'card', font: 'round', created: Date.now() });
  const photoUrls = new Map();
  async function photoUrl(id) {
    if (!id) return null;
    if (photoUrls.has(id)) return photoUrls.get(id);
    const b = await R.db.get('images', id).catch(() => null);
    if (!b) return null;
    const u = URL.createObjectURL(b); photoUrls.set(id, u); return u;
  }
  let preview = null;

  R.diySkin = (cfg) => {
    if (!cfg) return null;
    const dark = R.color.mix(cfg.accent, '#000000', 0.82);
    return {
      id: cfg.id, base: 'diy', diy: true, name: cfg.name || '我的 Skin', group: 'DIY', en: 'CUSTOM',
      desc: '你自己做的 Skin' + (cfg.photo ? '（用了你的照片）' : ''),
      theme: { bg: dark, fg: '#ffffff', accent: cfg.accent, accent2: cfg.accent2, ui: 'rgba(18,18,26,.97)', line: 'rgba(255,255,255,.12)', dock: 'rgba(0,0,0,.35)', dockfg: '#ffffff' },
      enterMs: 1100,
      emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="dy-${cfg.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cfg.accent}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect width="116" height="150" fill="url(#dy-${cfg.id})"/>${cfg.photo ? '<g fill="none" stroke="#fff" stroke-width="3" opacity=".9"><rect x="30" y="34" width="56" height="44" rx="6"/><circle cx="46" cy="50" r="5"/><path d="M30 72l18-14 14 10 10-6 14 12"/></g>' : '<circle cx="58" cy="58" r="24" fill="none" stroke="#fff" stroke-width="4" opacity=".9"/><circle cx="58" cy="58" r="7" fill="#fff"/>'}<g fill="${cfg.accent2}">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${18 + i * 12}" y="${120 - (8 + ((i * 37) % 22))}" width="7" height="${8 + ((i * 37) % 22)}" rx="3.5"/>`).join('')}</g></svg>`,
      sfx: null,
      mount(root, api) { return mountDiy(root, api, cfg); },
    };
  };

  function mountDiy(root, api, cfg) {
    root.style.setProperty('--dy-font', FONTS[cfg.font] || FONTS.round);
    root.style.setProperty('--dy-a', cfg.accent); root.style.setProperty('--dy-b', cfg.accent2);
    root.classList.add('dy-' + cfg.layout);
    root.innerHTML = `<canvas class="dy-bg"></canvas><div class="dy-dim" style="background:rgba(0,0,0,${cfg.dim})"></div><canvas class="dy-viz"></canvas>
      <div class="dy-wrap">
        <div class="dy-art"><img data-bind="cover" alt="" draggable="false"></div>
        <div class="dy-info" data-ui><div class="dy-t" data-bind="title"></div><div class="dy-a" data-bind="artist"></div></div>
        ${R.ui.seek('dy-seek')}
        ${R.ui.ctrl('dy-ctrl')}
      </div>`;
    const bg = api.canvas(root.querySelector('.dy-bg'), { dprMax: 1.5, alpha: false });
    const vz = api.canvas(root.querySelector('.dy-viz'));
    const artEl = root.querySelector('.dy-art');
    let photo = null, blurred = null, A = { x: 0, y: 0, r: 80 };
    const parts = [];
    const measure = () => { const r = artEl.getBoundingClientRect(); A = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 }; };
    measure();
    function bake() {
      const { w, h } = bg;
      if (!photo) { blurred = null; return; }
      // shrink then grow = blur, without a CSS filter on a full-screen layer
      const k = 1 - Math.pow(cfg.blur, 0.6) * 0.97;
      const tw = Math.max(16, Math.round(Math.min(1400, w) * k)), s = Math.max(tw / photo.width, (tw * h / w) / photo.height);
      const c = document.createElement('canvas'); c.width = tw; c.height = Math.max(16, Math.round(tw * h / w));
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      x.drawImage(photo, (c.width - photo.width * s) / 2, (c.height - photo.height * s) / 2, photo.width * s, photo.height * s);
      blurred = c;
    }
    function paintBg() {
      const { ctx, w, h } = bg;
      if (blurred) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(blurred, 0, 0, w, h); }
      else {
        const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, R.color.mix(cfg.accent, '#000000', 0.45)); g.addColorStop(0.55, R.color.mix(cfg.accent, '#000000', 0.82)); g.addColorStop(1, R.color.mix(cfg.accent2, '#000000', 0.6));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
    paintBg();
    if (cfg.photo) photoUrl(cfg.photo).then((u) => { if (!u) return; const im = new Image(); im.onload = () => { photo = im; bake(); paintBg(); }; im.src = u; });
    api.beat((s) => { if (cfg.viz === 'particles' && s > 0.4) for (let i = 0; i < 14 * s; i++) { const a = Math.random() * R.TAU, sp = 60 + Math.random() * 220 * s; parts.push({ x: A.x, y: A.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random() * 0.8, s: 1.5 + Math.random() * 3 }); } });
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    return {
      resize() { bg.resize(); vz.resize(); measure(); bake(); paintBg(); },
      frame(dt, t, v) {
        const { ctx, w, h } = vz; vz.clear();
        ctx.globalCompositeOperation = 'lighter';
        const ca = cfg.accent, cb = cfg.accent2;
        if (cfg.viz === 'bars') {
          const n = 28, gap = 4, bw = (Math.min(w, 760) - gap * (n - 1)) / n, x0 = (w - (bw * n + gap * (n - 1))) / 2, base = h * (cfg.layout === 'full' ? 0.62 : 0.97);
          for (let i = 0; i < n; i++) {
            const b = v.bands[Math.min(31, i + 2)], hh = 4 + b * h * 0.22;
            const g = ctx.createLinearGradient(0, base - hh, 0, base); g.addColorStop(0, R.color.rgba(cb, 0.9)); g.addColorStop(1, R.color.rgba(ca, 0.35));
            ctx.fillStyle = g; rr(ctx, x0 + i * (bw + gap), base - hh, bw, hh, Math.min(bw / 2, 6)); ctx.fill();
          }
        } else if (cfg.viz === 'wave') {
          const n = 48, mid = h * (cfg.layout === 'full' ? 0.6 : 0.88), amp = h * 0.09;
          for (const [col, k, wd] of [[ca, 1, 10], [cb, 0.7, 4]]) {
            ctx.strokeStyle = R.color.rgba(col, 0.75); ctx.lineWidth = wd; ctx.lineJoin = 'round'; ctx.beginPath();
            for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * w, y = mid - v.wave[i] * amp * k * (0.4 + v.level); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            ctx.stroke();
          }
        } else if (cfg.viz === 'ring') {
          const n = 64, r0 = A.r * 1.08;
          for (let i = 0; i < n; i++) {
            const b = v.bands[Math.floor((i < n / 2 ? i : n - 1 - i) / (n / 2) * 30) + 1], a = (i / n) * R.TAU - Math.PI / 2, len = 4 + b * A.r * 0.55;
            ctx.strokeStyle = R.color.rgba(i % 2 ? cb : ca, 0.85); ctx.lineWidth = Math.max(2, (R.TAU * r0 / n) * 0.5); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(A.x + Math.cos(a) * r0, A.y + Math.sin(a) * r0); ctx.lineTo(A.x + Math.cos(a) * (r0 + len), A.y + Math.sin(a) * (r0 + len)); ctx.stroke();
          }
        } else {
          const gl = api.glow(cb, 32);
          for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; const s = p.s * 4 * p.life; ctx.globalAlpha = Math.min(1, p.life); ctx.drawImage(gl, p.x - s / 2, p.y - s / 2, s, s); }
          ctx.globalAlpha = 1;
          if (parts.length > 400) parts.splice(0, parts.length - 400);
          const s = A.r * (2.6 + v.bass * 1.2); ctx.globalAlpha = 0.25 + v.level * 0.3; ctx.drawImage(api.glow(ca, 64), A.x - s / 2, A.y - s / 2, s, s); ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
        root.style.setProperty('--lv', v.level.toFixed(3));
      },
    };
  }

  /* ---------- editor ---------- */
  let cur = null, isNew = false;
  const segH = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-dk="${k}" data-v="${v}" class="${cur[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const swH = (k) => `<div class="sw8">${SW.map((c) => `<button type="button" data-dc="${k}" data-v="${c}" class="${cur[k] === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-dcc="${k}" value="${cur[k]}" aria-label="自訂顏色"></div>`;
  async function html() {
    const pu = cur.photo ? await photoUrl(cur.photo) : null;
    return `<div class="sh-head"><h3>${isNew ? '自己做一套 Skin' : '編輯 Skin'}</h3><button type="button" class="ib" data-dy="cancel" aria-label="取消">${I.close}</button></div>
      <div class="sc">
        <div class="set-g">
          <div class="set-r set-col"><div class="lb"><b>名字</b></div><input class="txt-in" type="text" maxlength="16" value="${esc(cur.name)}" data-dy-name></div>
          <div class="set-r set-col"><div class="lb"><b>背景照片</b><small>用自己的照片當背景（只存在這台裝置）</small></div><div class="photo-pick"><div class="ph" style="${pu ? `background-image:url('${pu}')` : ''}">${pu ? '' : I.image}</div><button type="button" class="chipb pri" data-dy="photo">${I.image}選照片</button>${cur.photo ? `<button type="button" class="chipb" data-dy="nophoto">${I.close}拿掉</button>` : ''}</div></div>
          <div class="set-r set-col"><div class="lb"><b>背景暗度</b></div><input type="range" min="0" max="0.85" step="0.01" value="${cur.dim}" data-dr="dim"></div>
          <div class="set-r set-col"><div class="lb"><b>背景模糊</b></div><input type="range" min="0" max="1" step="0.01" value="${cur.blur}" data-dr="blur"></div>
        </div>
        <div class="set-g">
          <div class="set-r set-col"><div class="lb"><b>主色</b></div>${swH('accent')}</div>
          <div class="set-r set-col"><div class="lb"><b>副色</b></div>${swH('accent2')}</div>
        </div>
        <div class="set-g">
          <div class="set-r set-col"><div class="lb"><b>視覺效果</b></div>${segH('viz', VIZ)}</div>
          <div class="set-r set-col"><div class="lb"><b>版面</b></div>${segH('layout', LAYOUT)}</div>
          <div class="set-r set-col"><div class="lb"><b>字體</b><small>只影響英數字；中文用系統字型</small></div>${segH('font', FONT_L)}</div>
        </div>
        <div class="btn-row" style="padding:4px 4px 14px">
          <button type="button" class="btn pri wide" data-dy="save">${I.check}存好，就穿這套</button>
          ${isNew ? '' : `<button type="button" class="btn dng wide" data-dy="del">${I.trash}刪掉這套</button>`}
        </div>
      </div>`;
  }
  let origSkin = null;
  const PREV = '__diy_preview__';
  const prevDef = () => { const d = R.diySkin(Object.assign({}, cur, { id: PREV })); d.name = cur.name; return d; };
  const getOrig = R.skins.get;
  R.skins.get = (id) => (id === PREV && cur ? prevDef() : getOrig(id));
  const live = R.debounce(() => { if (cur) R.stage.show(PREV, { instant: true, force: true, silent: true }); }, 120);
  async function edit(id) {
    const list = settings.get('diy') || [];
    const found = id && list.find((x) => x.id === id);
    cur = found ? JSON.parse(JSON.stringify(found)) : blank();
    isNew = !found;
    origSkin = (R.stage.current() || {}).id || settings.get('skin');
    if (isNew) { const t = R.player.current(); if (t) { const c = R.art.colorsOf(t); cur.accent = c.vibrant; cur.accent2 = c.light; } }
    R.ui.openSheet(await html(), { kind: 'diy', half: true, onClose: () => { if (cur) { const o = origSkin; cur = null; R.stage.show(o, { instant: true, silent: true }); } } });
    R.stage.show(PREV, { instant: true, force: true, silent: true });
  }
  async function rerender() { const sc = R.$('.sc', R.ui.body()); const top = sc ? sc.scrollTop : 0; R.ui.body().innerHTML = await html(); const s2 = R.$('.sc', R.ui.body()); if (s2) s2.scrollTop = top; }
  const photoIn = R.$('#photoIn');
  photoIn.addEventListener('change', async () => {
    const f = photoIn.files && photoIn.files[0]; photoIn.value = '';
    if (!f || !cur) return;
    try {
      const im = await R.art.loadImage(f);
      const s = Math.min(1, 1600 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const blob = await R.art.toBlob(c, 'image/jpeg', 0.86);
      const pid = 'ph-' + R.uid();
      await R.db.put('images', blob, pid);
      cur.photo = pid; await rerender(); live();
      R.sfx.play('ok');
    } catch (e) { R.toast('這張照片讀不了，換一張試試'); }
  });
  document.addEventListener('click', async (e) => {
    if (R.ui.sheetKind() !== 'diy' || !cur) return;
    const b = R.ui.body(); if (!b.contains(e.target)) return;
    const k = e.target.closest('[data-dk]');
    if (k) { cur[k.dataset.dk] = k.dataset.v; R.$$(`[data-dk="${k.dataset.dk}"]`, b).forEach((x) => x.classList.toggle('on', x === k)); R.sfx.play('toggle'); live(); return; }
    const c = e.target.closest('[data-dc]');
    if (c) { cur[c.dataset.dc] = c.dataset.v; R.$$(`[data-dc="${c.dataset.dc}"]`, b).forEach((x) => x.classList.toggle('on', x === c)); const inp = R.$(`[data-dcc="${c.dataset.dc}"]`, b); if (inp) inp.value = c.dataset.v; R.sfx.play('tick'); live(); return; }
    const a = e.target.closest('[data-dy]'); if (!a) return;
    const act = a.dataset.dy;
    if (act === 'photo') { photoIn.click(); return; }
    if (act === 'nophoto') { cur.photo = null; await rerender(); live(); return; }
    if (act === 'cancel') { R.ui.closeSheet(); return; }
    if (act === 'save') {
      cur.name = (cur.name || '').trim() || '我的 Skin';
      const list = (settings.get('diy') || []).slice();
      const i = list.findIndex((x) => x.id === cur.id);
      const old = i >= 0 ? list[i] : null;
      if (old && old.photo && old.photo !== cur.photo) R.db.del('images', old.photo).catch(() => {});
      if (i >= 0) list[i] = cur; else list.push(cur);
      settings.set('diy', list); settings.set('skin', cur.id);
      const id = cur.id; cur = null;
      R.ui.closeSheet(true);
      R.stage.show(id, { force: true });
      R.sfx.play('ok'); R.toast('做好了！衣櫃裡也找得到它');
      return;
    }
    if (act === 'del') {
      if (!(await R.ui.confirm({ title: `刪掉「${cur.name}」？`, ok: '刪掉', danger: true }))) return;
      const list = (settings.get('diy') || []).filter((x) => x.id !== cur.id);
      if (cur.photo) R.db.del('images', cur.photo).catch(() => {});
      settings.set('diy', list);
      if (settings.get('skin') === cur.id) settings.set('skin', 'neon');
      for (const p of R.lib.pl.all()) if (p.skin === cur.id) { p.skin = null; R.lib.pl.save(p); }
      if (origSkin === cur.id) origSkin = settings.get('skin');
      R.ui.closeSheet(); R.toast('已刪掉');
    }
  });
  document.addEventListener('input', (e) => {
    if (R.ui.sheetKind() !== 'diy' || !cur) return;
    if (e.target.matches('[data-dy-name]')) { cur.name = e.target.value; return; }
    const r = e.target.closest('[data-dr]'); if (r) { cur[r.dataset.dr] = parseFloat(r.value); live(); return; }
    const cc = e.target.closest('[data-dcc]'); if (cc) { cur[cc.dataset.dcc] = cc.value; R.$$(`[data-dc="${cc.dataset.dcc}"]`, R.ui.body()).forEach((x) => x.classList.remove('on')); live(); }
  });
  R.diy = { edit, isPreview: (id) => id === PREV };
})();
