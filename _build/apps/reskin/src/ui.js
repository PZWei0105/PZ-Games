/* ===================== shared UI: sheet, menus, prompts ===================== */
(() => {
  const { $, esc } = R;
  const sheet = $('#sheet'), body = $('#sheetBody'), panel = sheet.querySelector('.sheet-panel');
  let onClose = null, kind = null;

  let hideT = 0;
  R.ui.openSheet = (html, opts) => {
    opts = opts || {};
    clearTimeout(hideT); // reopened while the last one was still sliding away
    if (onClose) { const f = onClose; onClose = null; try { f(); } catch (e) { console.error(e); } }
    kind = opts.kind || null;
    body.innerHTML = html;
    sheet.classList.toggle('short', !!opts.short);
    sheet.classList.toggle('half', !!opts.half);
    panel.style.transform = '';
    const was = !sheet.hidden && sheet.classList.contains('on');
    sheet.hidden = false;
    if (!was) { requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('on'))); if (!opts.silent) R.sfx.play('open'); }
    onClose = opts.onClose || null;
    return body;
  };
  R.ui.closeSheet = (silent) => {
    if (sheet.hidden) return;
    sheet.classList.remove('on');
    panel.style.transform = '';
    if (!silent) R.sfx.play('close');
    const f = onClose; onClose = null; kind = null;
    clearTimeout(hideT);
    hideT = setTimeout(() => { if (!sheet.classList.contains('on')) { sheet.hidden = true; body.innerHTML = ''; } }, 420);
    if (f) { try { f(); } catch (e) { console.error(e); } }
  };
  R.ui.sheetKind = () => (sheet.hidden || !sheet.classList.contains('on') ? null : kind);
  R.ui.body = () => body;

  // drag the sheet down by its handle / header to close it
  let drag = null;
  panel.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.sheet-grab, .sh-head');
    if (!h || e.target.closest('button, input')) return;
    drag = { y: e.clientY, dy: 0, id: e.pointerId };
    try { panel.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    panel.style.transition = 'none';
  });
  panel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    panel.style.transform = `translateY(${drag.dy}px)`;
  });
  const endDrag = () => {
    if (!drag) return;
    panel.style.transition = '';
    if (drag.dy > 110) R.ui.closeSheet(); else panel.style.transform = '';
    drag = null;
  };
  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);

  const modal = $('#modal');
  function showModal(html, onClick) {
    return new Promise((res) => {
      modal.innerHTML = html; modal.hidden = false;
      const done = (v) => { modal.hidden = true; modal.innerHTML = ''; modal.onclick = null; modal.onkeydown = null; res(v); };
      modal.onclick = (e) => onClick(e, done);
      modal.onkeydown = (e) => { if (e.key === 'Escape') done(null); };
      const inp = modal.querySelector('input');
      if (inp) setTimeout(() => { inp.focus(); inp.select && inp.select(); }, 60);
    });
  }
  R.ui.menu = (items, opts) => {
    opts = opts || {};
    const html = `<div class="md" role="menu">${opts.title ? `<div class="md-t">${esc(opts.title)}</div>` : ''}${opts.sub ? `<div class="md-s">${esc(opts.sub)}</div>` : ''}${items.map((it, i) => `<button type="button" class="md-i${it.danger ? ' dng' : ''}${it.on ? ' on' : ''}" data-i="${i}">${it.icon || ''}<span>${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></button>`).join('')}<button type="button" class="md-i" data-i="-1" style="justify-content:center;color:rgba(255,255,255,.6)">取消</button></div>`;
    R.sfx.play('tap');
    return showModal(html, (e, done) => {
      const b = e.target.closest('[data-i]');
      // it.now runs inside the tap itself: opening a file picker only works straight from a tap on iPhone
      if (b) { const i = +b.dataset.i; R.sfx.play('tap'); if (i >= 0 && items[i].now) items[i].now(); done(i < 0 ? null : items[i].key); }
      else if (e.target === modal) done(null);
    });
  };
  R.ui.prompt = (o) => {
    const html = `<div class="md"><div class="md-t">${esc(o.title || '')}</div>${o.sub ? `<div class="md-s">${esc(o.sub)}</div>` : ''}<input class="md-in" type="text" maxlength="60" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" enterkeyhint="done"><div class="md-b"><button type="button" class="btn sec" data-r="0">取消</button><button type="button" class="btn pri" data-r="1">${esc(o.ok || '確定')}</button></div></div>`;
    const p = showModal(html, (e, done) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1' ? modal.querySelector('input').value.trim() : null);
      else if (e.target === modal) done(null);
    });
    setTimeout(() => { const inp = modal.querySelector('input'); if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = modal.querySelector('[data-r="1"]'); if (b) b.click(); } }); }, 0);
    return p;
  };
  R.ui.confirm = (o) => {
    const html = `<div class="md"><div class="md-t">${esc(o.title || '')}</div>${o.sub ? `<div class="md-s">${esc(o.sub)}</div>` : ''}<div class="md-b"><button type="button" class="btn sec" data-r="0">${esc(o.cancel || '取消')}</button><button type="button" class="btn ${o.danger ? 'dng' : 'pri'}" data-r="1">${esc(o.ok || '確定')}</button></div></div>`;
    return showModal(html, (e, done) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
      else if (e.target === modal) done(false);
    });
  };
  R.ui.info = (title, rows) => {
    const html = `<div class="md"><div class="md-t">${esc(title)}</div><div class="md-s" style="padding-bottom:4px">${rows.map(([k, v]) => `<div style="display:flex;gap:12px;padding:6px 0;border-top:1px solid rgba(255,255,255,.06)"><span style="flex:none;width:84px;color:rgba(255,255,255,.45)">${esc(k)}</span><span style="color:#fff;word-break:break-all">${esc(v)}</span></div>`).join('')}</div><div class="md-b" style="grid-template-columns:1fr"><button type="button" class="btn sec" data-r="1">好</button></div></div>`;
    return showModal(html, (e, done) => { if (e.target.closest('[data-r]') || e.target === modal) done(true); });
  };
  R.ui.modalOpen = () => !modal.hidden;

  const busy = $('#busy');
  // opts.stop: show a stop button that calls it; opts.note: a small line under the progress bar
  R.ui.busy = (title, text, frac, opts) => {
    const stop = $('#busyStop'), note = $('#busyNote');
    if (title == null) { busy.hidden = true; stop.hidden = true; stop.onclick = null; note.hidden = true; return; }
    opts = opts || {};
    busy.hidden = false;
    $('#busyTitle').textContent = title;
    $('#busyText').textContent = text || '';
    $('#busyBar').style.width = frac == null ? '0%' : Math.round(frac * 100) + '%';
    $('#busyBar').parentNode.style.visibility = frac == null ? 'hidden' : 'visible';
    note.textContent = opts.note || ''; note.hidden = !opts.note;
    stop.hidden = !opts.stop;
    stop.onclick = opts.stop ? () => { R.sfx.play('tap'); opts.stop(); } : null;
  };
})();
