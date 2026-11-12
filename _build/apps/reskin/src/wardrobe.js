/* ===================== wardrobe: swipe the rack, the player tries each skin on live ===================== */
R.wardrobe = (() => {
  const { $, $$, esc, I } = R;
  const el = $('#wardrobe');
  let orig = null, staged = null, isOpen = false, scT = 0, rack = null, lastMark = null;
  const HOOK = '<svg viewBox="0 0 40 26" aria-hidden="true" style="width:40px;height:26px"><path d="M20 12V9.6c0-1 .6-1.5 1.5-2 1.2-.7 2.2-1.6 2.2-3.2a3.7 3.7 0 0 0-7.4 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 12L4 24h32z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>';

  function emblemOf(d) {
    if (d.emblem) return d.emblem;
    const t = d.theme;
    return `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="g-${d.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.bg}"/></linearGradient></defs><rect width="116" height="150" fill="url(#g-${d.id})"/><circle cx="58" cy="68" r="30" fill="none" stroke="${t.fg}" stroke-width="5" opacity=".9"/><circle cx="58" cy="68" r="8" fill="${t.fg}"/></svg>`;
  }
  const item = (d) => `<div class="wd-item" data-wid="${d.id}" role="button" tabindex="0" aria-label="${esc(d.name)}"><div class="wd-hook">${HOOK}</div><div class="wd-card" style="background:${d.theme.bg}">${emblemOf(d)}</div><div class="wd-name">${esc(d.name)}</div><div class="wd-grp">${esc(d.group || 'DIY')}</div></div>`;

  function render() {
    const mode = R.settings.get('skinMode');
    el.innerHTML = `<div class="wd-head"><h3>${I.hanger}衣櫃</h3><div class="seg" role="group" aria-label="換膚方式"><button type="button" data-wm="fixed" class="${mode === 'fixed' ? 'on' : ''}">固定這套</button><button type="button" data-wm="shuffle" class="${mode === 'shuffle' ? 'on' : ''}">每首換一套</button></div></div>
      <div class="wd-rod"></div>
      <div class="wd-rack">${R.skins.list().map(item).join('')}<div class="wd-item wd-add" data-wadd role="button" tabindex="0"><div class="wd-hook">${HOOK}</div><div class="wd-card">${I.plus}</div><div class="wd-name">自己做一套</div><div class="wd-grp">DIY</div></div></div>
      <div class="wd-desc" data-wdesc></div>
      <div class="wd-foot"><button type="button" class="btn sec" data-w="cancel">取消</button><button type="button" class="btn sec" data-w="edit" hidden>${I.edit}編輯</button><button type="button" class="btn pri" data-w="ok">${I.check}就穿這套</button></div>`;
    rack = $('.wd-rack', el);
    rack.addEventListener('scroll', onScroll, { passive: true });
  }
  function center(it, smooth) {
    if (!it || !rack) return;
    const left = it.offsetLeft - (rack.clientWidth - it.offsetWidth) / 2;
    if (smooth && rack.scrollTo) rack.scrollTo({ left, behavior: 'smooth' }); else rack.scrollLeft = left;
  }
  function nearest() {
    const c = rack.scrollLeft + rack.clientWidth / 2;
    let best = null, bd = 1e9;
    for (const it of $$('.wd-item', rack)) { const m = it.offsetLeft + it.offsetWidth / 2; const d = Math.abs(m - c); if (d < bd) { bd = d; best = it; } }
    return best;
  }
  function mark(it) {
    if (!it || it === lastMark) return;
    lastMark = it;
    $$('.wd-item', rack).forEach((x) => x.classList.toggle('on', x === it));
    const d = it.dataset.wid ? R.skins.get(it.dataset.wid) : null;
    const desc = $('[data-wdesc]', el);
    const mode = R.settings.get('skinMode');
    desc.textContent = d ? d.desc || '' : '用自己的照片、配色和視覺效果，做一套專屬的 Skin';
    if (mode === 'shuffle' && d) desc.textContent = '每首歌自動換一套（歌單綁定的 Skin 優先）';
    $('[data-w="edit"]', el).hidden = !(d && d.diy);
    $('[data-w="ok"]', el).hidden = !d;
  }
  function onScroll() {
    mark(nearest());
    clearTimeout(scT);
    scT = setTimeout(settle, 150);
  }
  function settle() {
    if (!isOpen) return;
    const it = nearest(); mark(it);
    if (!it || !it.dataset.wid) return;
    const id = it.dataset.wid;
    if (id !== staged) { staged = id; R.stage.show(id, { fast: true, x: '50%', y: '40%' }); }
  }

  function open() {
    if (isOpen) return;
    if (R.ui.sheetKind()) R.ui.closeSheet(true);
    isOpen = true;
    orig = (R.stage.current() || {}).id || R.settings.get('skin');
    staged = orig; lastMark = null;
    render();
    el.hidden = false;
    document.body.classList.add('wd-open');
    requestAnimationFrame(() => {
      center($(`[data-wid="${orig}"]`, el) || $('.wd-item', el), false);
      mark($(`[data-wid="${orig}"]`, el) || $('.wd-item', el));
      requestAnimationFrame(() => el.classList.add('on'));
    });
    R.sfx.play('open');
    if (!R.settings.get('seenWardrobe')) R.settings.set('seenWardrobe', true);
  }
  function close(revert) {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(scT);
    if (revert && staged !== orig) R.stage.show(orig, { fast: true, silent: true });
    el.classList.remove('on');
    document.body.classList.remove('wd-open');
    setTimeout(() => { if (!isOpen) { el.hidden = true; el.innerHTML = ''; rack = null; } }, 450);
    R.bus.emit('wardrobe:closed');
  }

  el.addEventListener('click', (e) => {
    const wm = e.target.closest('[data-wm]');
    if (wm) { R.settings.set('skinMode', wm.dataset.wm); $$('[data-wm]', el).forEach((b) => b.classList.toggle('on', b === wm)); lastMark = null; mark(nearest()); R.sfx.play('toggle'); if (wm.dataset.wm === 'shuffle') R.toast('之後每首歌都會換一套 Skin'); return; }
    const w = e.target.closest('[data-w]');
    if (w) {
      const a = w.dataset.w;
      if (a === 'cancel') { R.sfx.play('close'); close(true); }
      else if (a === 'ok') {
        R.settings.set('skin', staged);
        R.sfx.play('ok');
        const d = R.skins.get(staged);
        close(false);
        if (d) R.toast(`換上「${d.name}」`);
      } else if (a === 'edit') { const id = staged; close(false); R.diy.edit(id); }
      return;
    }
    if (e.target.closest('[data-wadd]')) { close(true); R.diy.edit(null); return; }
    const it = e.target.closest('.wd-item');
    if (it) { center(it, true); R.sfx.play('tick'); }
  });
  return { open, close, isOpen: () => isOpen };
})();
