/* ==========================================================================
   21 介面元件（DOM，疊在畫布上）
   外觀用 CSS 變數決定，每款遊戲自己定：PZ.ui.theme({ accent: '#e33', panel: '…', font: '…' })
   內建主題：PZ.ui.theme('night' | 'ink' | 'neon' | 'steel' | 'paper')
   元件：
     await PZ.ui.alert('標題', '內容')                 await PZ.ui.confirm({ title, body, ok, cancel }) → true/false
     await PZ.ui.choose({ title, body, options: [{ label, value, desc, disabled }] }) → value
     await PZ.ui.modal({ title, body, buttons: [{ label, value, primary }], wide }) → value
     PZ.ui.toast('撿到 金幣 ×3', { kind: 'good' })   PZ.ui.banner('BOSS 來襲', { sub: '屍王', style: 'boss' })
     PZ.ui.settings({ save })   標準設定頁（音量、震動、閃光、觸覺、數字、畫質、存檔碼、雲端）
     PZ.ui.pause({ items: [{ label, onClick }] })   標準暫停選單
     PZ.ui.tip(元素, '說明', { side })              提示框：滑鼠移上去、手指按住、手把焦點移到就出現
     PZ.ui.holo(卡片元素, { tilt: 14, foil: true })    閃卡：跟著手指傾斜、亮面跟著跑、彩虹箔
     PZ.ui.slots({ items: [{ icon, name, desc, count, rarity, new }], cols, size, onPick })   格子背包（稀有度光暈、數量、新東西的小點）
     await PZ.ui.title({ title, sub, kicker, items: [{ label, value, primary }], foot, backdrop })  標題畫面（字一個個浮上來、掃光；backdrop：蓋一層深色）
   所有 .pz-btn 自動有按下音效、觸覺、按壓動畫；鍵盤方向鍵／手把十字鍵可以移動焦點，A／Enter 按、B／Esc 返回。
   ========================================================================== */
const ENGINE_CSS = __PZ_CSS__;
const THEMES = {
  night: {},
  ink: { text: '#1c1712', dim: 'rgba(28,23,18,.68)', faint: 'rgba(28,23,18,.4)', bg: 'rgba(236,228,212,.72)', panel: 'rgba(246,240,228,.97)', panel2: 'rgba(28,23,18,.06)', line: 'rgba(28,23,18,.18)', accent: '#b8232f', accent2: '#2c5d8a', 'on-accent': '#fff8ee', radius: '6px', 'radius-s': '4px', shadow: '0 18px 44px rgba(40,24,10,.35)', font: '"PZ Serif","Noto Serif TC","Songti TC","PMingLiU",serif' },
  neon: { text: '#e9f6ff', dim: 'rgba(200,235,255,.65)', bg: 'rgba(4,2,16,.78)', panel: 'rgba(12,8,30,.92)', line: 'rgba(120,220,255,.25)', accent: '#ff2bd6', accent2: '#2bf3ff', 'on-accent': '#18001a', radius: '4px', 'radius-s': '3px', shadow: '0 0 40px rgba(255,43,214,.25), 0 20px 50px rgba(0,0,0,.6)' },
  steel: { text: '#e8ece4', dim: 'rgba(220,228,214,.62)', bg: 'rgba(10,12,8,.8)', panel: 'rgba(28,32,26,.95)', line: 'rgba(200,214,180,.18)', accent: '#c9d94a', accent2: '#ff9a2e', 'on-accent': '#151a05', radius: '2px', 'radius-s': '2px' },
  paper: { text: '#2a2620', dim: 'rgba(42,38,32,.66)', bg: 'rgba(250,246,238,.7)', panel: '#fffdf8', panel2: 'rgba(42,38,32,.05)', line: 'rgba(42,38,32,.14)', accent: '#ff7a3d', accent2: '#3d8bff', 'on-accent': '#fff', shadow: '0 18px 40px rgba(60,40,20,.18)' },
};
const UI = PZ.ui = { stack: [], focus: null, _toasts: null, _say: null };

UI.init = (cfg = {}) => {
  if (!HAS_DOM) return;
  if (!document.getElementById('pz-css')) { const st = document.createElement('style'); st.id = 'pz-css'; st.textContent = ENGINE_CSS; document.head.insertBefore(st, document.head.firstChild); }
  if (cfg.theme) UI.theme(cfg.theme);
  UI.enhance(Screen.ui);
  // 介面導覽：鍵盤、手把
  const navKey = (dir) => () => { if (UI.top()) UI.move(dir); };
  Input.onPress('up', navKey('up')); Input.onPress('down', navKey('down')); Input.onPress('left', navKey('left')); Input.onPress('right', navKey('right'));
  Input.onPress('confirm', () => { const t = UI.top(); if (t && UI.focus && document.body.contains(UI.focus)) { UI.focus.click(); } });
  Input.onPress('cancel', () => { const t = UI.top(); if (t && t.back) t.back(); });
};
/** 換主題：名字或變數物件（key 不用寫 --pz-） */
UI.theme = (t) => {
  const vars = typeof t === 'string' ? THEMES[t] || {} : t;
  const st = Screen.root && Screen.root.style; if (!st) return;
  if (typeof t === 'string') for (const k of ['text', 'dim', 'faint', 'bg', 'panel', 'panel2', 'line', 'accent', 'accent2', 'on-accent', 'radius', 'radius-s', 'shadow', 'font']) st.removeProperty('--pz-' + k);
  for (const k in vars) st.setProperty('--pz-' + k, vars[k]);
};
UI.themes = THEMES;

/** 幫一個 DOM 區塊裡的按鈕加上音效、觸覺、按壓感 */
UI.enhance = (root) => {
  if (!root || root._pzEnh) return; root._pzEnh = true;
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.pz-btn,.pz-toggle,[data-sfx]'); if (!b || b.disabled) return;
    b.classList.add('pz-press'); const up = () => { b.classList.remove('pz-press'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    const s = b.dataset.sfx; if (s !== 'none') PZ.uiSound(s || 'click');
    Haptics.tap('light');
  });
  root.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.pz-btn'); if (b && b !== UI._hover) { UI._hover = b; PZ.uiSound('hover'); } });
};

/* ---------- 焦點導覽（手把、鍵盤）---------- */
UI.top = () => UI.stack[UI.stack.length - 1] || null;
function focusables(root) { return [...root.querySelectorAll('.pz-btn,.pz-toggle,.pz-focusable,.pz-range,.pz-seg button')].filter((e) => !e.disabled && e.offsetParent !== null); }
UI.setFocus = (elx) => {
  if (UI.focus) { UI.focus.classList.remove('pz-focus'); if (UI.focus._tipHide) UI.focus._tipHide(); }
  UI.focus = elx;
  if (elx) { elx.classList.add('pz-focus'); try { elx.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } if (elx._tipShow && (Input.device === 'gamepad' || Input.device === 'keyboard')) elx._tipShow(); }
};
UI.move = (dir) => {
  const t = UI.top(); if (!t) return;
  const list = focusables(t.el); if (!list.length) return;
  const cur = UI.focus && list.includes(UI.focus) ? UI.focus : null;
  if (!cur) { UI.setFocus(list[0]); PZ.uiSound('hover'); return; }
  if (cur.classList.contains('pz-range') && (dir === 'left' || dir === 'right')) { cur.value = clamp(+cur.value + (dir === 'right' ? 0.1 : -0.1), +cur.min, +cur.max); cur.dispatchEvent(new Event('input', { bubbles: true })); return; }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bs = Infinity;
  for (const e of list) {
    if (e === cur) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy;
    const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4; if (!ok) continue;
    const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx), side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy), s = main + side * 2.2;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { UI.setFocus(best); PZ.uiSound('hover'); }
};
/** 推一層（對話框、選單）：Esc／B 會呼叫 back */
const syncTouch = () => { if (Screen.touch) Screen.touch.classList.toggle('pz-ui-open', UI.stack.length > 0); };
UI.push = (elx, back) => { const layer = { el: elx, back }; UI.stack.push(layer); syncTouch(); if (Input.device === 'gamepad' || Input.device === 'keyboard') setTimeout(() => { const f = focusables(elx); const p = elx.querySelector('.primary') || f[0]; if (p) UI.setFocus(p); }, 30); return layer; };
UI.pop = (layer) => { const i = UI.stack.indexOf(layer); if (i >= 0) UI.stack.splice(i, 1); UI.setFocus(null); syncTouch(); };

/* ---------- 對話框 ---------- */
UI.modal = (o = {}) => new Promise((resolve) => {
  const wrap = el('div', 'pz-modal-wrap' + (o.cls ? ' ' + o.cls : ''));
  const box = el('div', 'pz-modal' + (o.wide ? ' wide' : ''));
  if (o.title) box.appendChild(el('h2', '', o.title));
  if (o.body != null) { const b = el('div', 'pz-body'); if (typeof o.body === 'string') b.innerHTML = o.body; else b.appendChild(o.body); box.appendChild(b); }
  let done = false;
  const close = (v) => { if (done) return; done = true; UI.pop(layer); wrap.classList.remove('on'); setTimeout(() => wrap.remove(), 220); if (o.pause !== false) PZ.resume('modal'); if (o.onClose) safeCall(o.onClose, null, v); resolve(v); };
  if (o.options) {
    const list = el('div', 'pz-list');
    for (const op of o.options) {
      const b = el('button', 'pz-btn' + (op.primary ? ' primary' : ''), op.label + (op.desc ? `<small>${op.desc}</small>` : '')); b.type = 'button';
      if (op.disabled) b.disabled = true;
      b.onclick = () => close(op.value !== undefined ? op.value : op.label);
      list.appendChild(b);
    }
    box.appendChild(list);
  }
  if (o.buttons && o.buttons.length) {
    const acts = el('div', 'pz-actions');
    for (const bt of o.buttons) { const b = el('button', 'pz-btn' + (bt.primary ? ' primary' : '') + (bt.danger ? ' danger' : '') + (bt.ghost ? ' ghost' : ''), bt.label); b.type = 'button'; if (bt.sfx) b.dataset.sfx = bt.sfx; b.onclick = () => { if (bt.onClick && safeCall(bt.onClick, null, close) === false) return; close(bt.value); }; acts.appendChild(b); }
    box.appendChild(acts);
  }
  wrap.appendChild(box);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && o.closable !== false && o.backdrop !== false) close(o.cancelValue); });
  Screen.ui.appendChild(wrap); UI.enhance(wrap);
  if (o.pause !== false) PZ.pause('modal');
  Input.releaseAll();
  const layer = UI.push(wrap, o.closable === false ? null : () => close(o.cancelValue));
  if (o.onOpen) safeCall(o.onOpen, null, box, close);
  requestAnimationFrame(() => wrap.classList.add('on'));
  if (o.sound !== false) PZ.uiSound('open');
});
UI.alert = (title, body, ok = '好') => UI.modal({ title, body, buttons: [{ label: ok, value: true, primary: true }], cancelValue: true });
UI.confirm = (o) => UI.modal({ title: o.title, body: o.body, buttons: [{ label: o.cancel || '取消', value: false, sfx: 'cancel' }, { label: o.ok || '確定', value: true, primary: true, danger: o.danger, sfx: 'confirm' }], cancelValue: false, pause: o.pause });
UI.choose = (o) => UI.modal({ title: o.title, body: o.body, options: o.options, cancelValue: o.cancelValue != null ? o.cancelValue : null, closable: o.closable, pause: o.pause });

/* ---------- 提示泡泡、大標題 ---------- */
UI.toast = (text, o = {}) => {
  if (!UI._toasts) { UI._toasts = el('div', 'pz-toasts'); Screen.ui.appendChild(UI._toasts); }
  const t = el('div', 'pz-toast' + (o.kind ? ' ' + o.kind : ''), (o.icon ? `<span>${o.icon}</span>` : '') + `<span>${text}</span>`);
  UI._toasts.appendChild(t);
  while (UI._toasts.children.length > 4) UI._toasts.firstChild.remove();
  if (o.sound) PZ.uiSound(o.sound === true ? 'notify' : o.sound);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, o.ms || 2200);
  return t;
};
UI.banner = (text, o = {}) => new Promise((res) => {
  const b = el('div', 'pz-banner' + (o.style ? ' ' + o.style : ''), `<div class="pz-b-main">${text}</div>${o.sub ? `<div class="pz-b-sub">${o.sub}</div>` : ''}`);
  Screen.ui.appendChild(b);
  if (o.sound !== false) { const s = o.sound || (o.style === 'boss' ? 'alarm' : 'notify'); if (Sfx.has(s)) Sfx.play(s, { bus: 'ui' }); }
  setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); res(); }, 360); }, o.ms || 1900);
});

/* ---------- 提示框 ---------- */
UI.tip = (target, content, o = {}) => {
  let box = null, timer = 0;
  const html = () => (typeof content === 'function' ? content() : content);
  const place = () => {
    if (!box) return;
    const r = target.getBoundingClientRect(), R = Screen.ui.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight, sf = Screen.safe;
    const sx = r.left - R.left + r.width / 2, above = r.top - R.top - 10, below = r.bottom - R.top + 10;
    const up = o.side ? o.side === 'top' : above - bh > 8 + sf.t;
    const x = clamp(sx - bw / 2, 8 + sf.l, Math.max(8 + sf.l, R.width - bw - 8 - sf.r)), y = up ? above - bh : below;
    box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.setProperty('--ax', clamp(sx - x, 12, bw - 12) + 'px'); box.classList.toggle('below', !up);
  };
  const show = () => {
    if (box || !document.body.contains(target)) return;
    box = el('div', 'pz-tip' + (o.cls ? ' ' + o.cls : ''), html()); Screen.ui.appendChild(box); place();
    requestAnimationFrame(() => box && box.classList.add('on'));
  };
  const hide = () => { clearTimeout(timer); if (!box) return; const b = box; box = null; b.classList.remove('on'); setTimeout(() => b.remove(), 180); };
  const enter = (e) => { if (e.pointerType === 'mouse') show(); };
  const down = (e) => { if (e.pointerType !== 'mouse') { clearTimeout(timer); timer = setTimeout(show, o.delay != null ? o.delay : 300); } };
  const leave = () => hide();
  target.addEventListener('pointerenter', enter); target.addEventListener('pointerdown', down);
  target.addEventListener('pointerleave', leave); target.addEventListener('pointerup', leave); target.addEventListener('pointercancel', leave);
  target._tipShow = show; target._tipHide = hide;
  return {
    show, hide,
    set(c) { content = c; if (box) { box.innerHTML = html(); place(); } },
    remove() { hide(); target.removeEventListener('pointerenter', enter); target.removeEventListener('pointerdown', down); target.removeEventListener('pointerleave', leave); target.removeEventListener('pointerup', leave); target.removeEventListener('pointercancel', leave); target._tipShow = target._tipHide = null; },
  };
};

/* ---------- 閃卡 ---------- */
UI.holo = (card, o = {}) => {
  card.classList.add('pz-holo'); if (o.foil !== false) card.classList.add('pz-foil');
  if (!card.querySelector(':scope > .pz-holo-shine')) card.appendChild(el('i', 'pz-holo-shine'));
  const st = card.style, max = o.tilt != null ? o.tilt : 14; let tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5, on = 0, ton = 0, raf = 0;
  const step = () => {
    raf = 0; cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; on += (ton - on) * 0.14;
    st.setProperty('--rx', ((0.5 - cy) * max * 2 * on).toFixed(2) + 'deg'); st.setProperty('--ry', ((cx - 0.5) * max * 2 * on).toFixed(2) + 'deg');
    st.setProperty('--gx', (cx * 100).toFixed(1) + '%'); st.setProperty('--gy', (cy * 100).toFixed(1) + '%'); st.setProperty('--hon', on.toFixed(3));
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(ton - on) > 0.002) raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  const move = (e) => { const r = card.getBoundingClientRect(); tx = clamp01((e.clientX - r.left) / Math.max(1, r.width)); ty = clamp01((e.clientY - r.top) / Math.max(1, r.height)); ton = 1; kick(); };
  const leave = () => { tx = 0.5; ty = 0.5; ton = 0; kick(); };
  const up = (e) => { if (e.pointerType !== 'mouse') leave(); };
  card.addEventListener('pointermove', move); card.addEventListener('pointerdown', move); card.addEventListener('pointerleave', leave); card.addEventListener('pointerup', up); card.addEventListener('pointercancel', leave);
  return { remove() { card.removeEventListener('pointermove', move); card.removeEventListener('pointerdown', move); card.removeEventListener('pointerleave', leave); card.removeEventListener('pointerup', up); card.removeEventListener('pointercancel', leave); card.classList.remove('pz-holo', 'pz-foil'); } };
};

/* ---------- 格子背包 ---------- */
const slotIcon = (icon) => { if (icon && Art.has(icon)) { const c = Art.canvas(icon); c.className = 'pz-slot-ico'; return c; } return el('span', 'pz-slot-ico', icon || ''); };
UI.slots = (o = {}) => {
  const grid = el('div', 'pz-slots'); grid.style.setProperty('--cols', o.cols || 5); grid.style.setProperty('--sz', (o.size || 58) + 'px');
  const fill = (items) => {
    grid.querySelectorAll('.pz-slot').forEach((b) => { if (b._tip) b._tip.remove(); });
    grid.innerHTML = '';
    const n = Math.max(items.length, o.min || 0);
    for (let i = 0; i < n; i++) {
      const it = items[i], r = it ? it.rarity || 'common' : '';
      const b = el('button', 'pz-slot pz-focusable' + (it ? ' r-' + r : ' empty')); b.type = 'button'; b.dataset.sfx = it ? 'card' : 'none';
      if (it) {
        b.appendChild(slotIcon(it.icon));
        if (it.count > 1) b.appendChild(el('b', 'pz-slot-n', '×' + it.count));
        if (it.new) b.appendChild(el('i', 'pz-slot-new'));
        if (it.name) b._tip = UI.tip(b, `<b>${it.name}</b>${it.tag ? `<em>${it.tag}</em>` : ''}${it.desc ? `<div>${it.desc}</div>` : ''}`, { cls: 'r-' + r });
        b.onclick = () => {
          grid.querySelectorAll('.pz-slot.sel').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
          if (it.new) { it.new = false; const nn = b.querySelector('.pz-slot-new'); if (nn) nn.remove(); }
          if (o.onPick) safeCall(o.onPick, null, it, i);
        };
      } else if (o.lockEmpty !== false) b.disabled = true;
      grid.appendChild(b);
    }
  };
  fill(o.items || []);
  grid.set = fill;
  return grid;
};

/* ---------- 標題畫面 ---------- */
UI.title = (o = {}) => new Promise((resolve) => {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const letters = [...String(o.title || '')].map((c, i) => (c === ' ' ? ' ' : `<span style="--i:${i}">${esc(c)}</span>`)).join('');
  const box = el('div', 'pz-title' + (o.backdrop ? ' solid' : '') + (o.cls ? ' ' + o.cls : ''), `<div class="pz-title-in">${o.kicker ? `<div class="pz-title-kicker">${o.kicker}</div>` : ''}<h1 class="pz-title-main" data-t="${esc(o.title)}">${letters}</h1>${o.sub ? `<div class="pz-title-sub">${o.sub}</div>` : ''}<div class="pz-title-menu"></div>${o.items ? '' : `<div class="pz-title-press">${o.press || (Env.touch ? '點一下開始' : '按任意鍵開始')}</div>`}</div>${o.foot ? `<div class="pz-title-foot">${o.foot}</div>` : ''}`);
  let done = false, layer = null, offPad = null;
  const close = (v) => {
    if (done) return; done = true; if (layer) UI.pop(layer); window.removeEventListener('keydown', key, true); if (offPad) offPad();
    box.classList.add('out'); setTimeout(() => { box.remove(); resolve(v); }, 420);
  };
  const key = (e) => { if (!o.items && !e.repeat) { e.preventDefault(); PZ.uiSound('confirm'); close('start'); } };
  if (o.items) {
    const menu = box.querySelector('.pz-title-menu');
    o.items.forEach((it, i) => { const b = el('button', 'pz-btn' + (it.primary ? ' primary' : ''), it.label); b.type = 'button'; b.style.setProperty('--i', i); b.onclick = () => close(it.value !== undefined ? it.value : it.label); menu.appendChild(b); });
  } else {
    box.addEventListener('pointerdown', () => { PZ.uiSound('confirm'); close('start'); });
    setTimeout(() => { if (!done) window.addEventListener('keydown', key, true); }, 300);
    offPad = Input.onPress('confirm', () => { if (Input.device === 'gamepad') { PZ.uiSound('confirm'); close('start'); } });
  }
  Screen.ui.appendChild(box); UI.enhance(box);
  layer = UI.push(box, null);
});

/* ---------- 載入畫面 ---------- */
UI.loading = (title, note) => {
  let L = document.getElementById('pz-loading');
  if (!L) { L = el('div', 'pz-loading', `<div class="pz-loading-box"><div class="pz-loading-title"></div><div class="pz-loading-bar"><i></i></div><div class="pz-loading-note"></div></div>`); L.id = 'pz-loading'; Screen.ui.appendChild(L); }
  L.classList.remove('out');
  L.querySelector('.pz-loading-title').textContent = title || '';
  L.querySelector('.pz-loading-note').textContent = note || '';
  return { progress(p, n) { L.querySelector('i').style.width = clamp01(p) * 100 + '%'; if (n != null) L.querySelector('.pz-loading-note').textContent = n; }, done() { L.classList.add('out'); setTimeout(() => L.remove(), 450); } };
};

/* ---------- 設定頁 ---------- */
UI.settings = (o = {}) => {
  const box = el('div', 'pz-set');
  const row = (label, sub, ctl) => { const r = el('div', 'pz-set-row'); r.appendChild(el('span', '', label + (sub ? `<small>${sub}</small>` : ''))); r.appendChild(ctl); box.appendChild(r); return r; };
  const head = (t) => box.appendChild(el('h3', '', t));
  const slider = (k, onInput) => { const s = el('input', 'pz-range'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = Settings.get(k); const paint = () => s.style.setProperty('--v', s.value * 100 + '%'); paint(); s.oninput = () => { Settings.set(k, +s.value); paint(); if (onInput) onInput(+s.value); }; return s; };
  const toggle = (k, inv) => { const b = el('button', 'pz-toggle'); b.type = 'button'; const sync = () => b.classList.toggle('on', inv ? !Settings.get(k) : !!Settings.get(k)); sync(); b.onclick = () => { Settings.set(k, !Settings.get(k)); sync(); }; return b; };
  const seg = (k, opts) => { const s = el('div', 'pz-seg'); for (const [v, l] of opts) { const b = el('button', String(Settings.get(k)) === String(v) ? 'on' : '', l); b.type = 'button'; b.onclick = () => { Settings.set(k, v); for (const x of s.children) x.classList.toggle('on', x === b); PZ.uiSound('click'); }; s.appendChild(b); } return s; };
  head('聲音');
  row('音樂', '', slider('music'));
  row('音效', '', slider('sfx', () => PZ.uiSound('click', { force: true })));
  if (Env.ios) row('跟其他 App 的音樂一起播', '打開後會跟著側邊靜音鍵', toggle('mixOthers'));
  head('畫面與手感');
  row('畫面震動', '怕暈可以調小', slider('shake'));
  row('閃光', '怕閃可以關掉', toggle('flash'));
  row('震動回饋', Env.ios ? 'iPhone 只有按按鈕時會震' : '', toggle('haptics'));
  row('傷害數字', '', toggle('numbers'));
  row('畫質', '自動：卡頓時會自己調低', seg('quality', [['auto', '自動'], ['high', '精細'], ['mid', '平衡'], ['low', '流暢']]));
  if (!Env.mobile) row('省電', '鎖在 60 幀', seg('fpsCap', [[0, '不鎖'], [60, '60 幀']]));
  if (Env.touch) row('觸控按鈕大小', '', slider('touchSize'));
  if (o.extra) for (const x of o.extra) { if (x.head) head(x.head); else row(x.label, x.sub, x.control); }
  if (o.save) {
    const sv = o.save; head('存檔');
    if (!sv.persistent) box.appendChild(el('div', 'pz-hint', '這個瀏覽器不讓遊戲存資料，進度只會留到關掉為止。可以用下面的存檔碼帶走。'));
    if (sv.cloud) box.appendChild(el('div', 'pz-hint', sv.cloud.note()));
    const r = el('div', 'pz-set-row'); const b1 = el('button', 'pz-btn', '複製存檔碼'), b2 = el('button', 'pz-btn', '貼上存檔碼'); b1.type = b2.type = 'button';
    r.appendChild(b1); r.appendChild(b2); box.appendChild(r);
    b1.onclick = async () => { const code = sv.code(); let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { /* 不給用剪貼簿 */ } if (ok) UI.toast('存檔碼已複製', { kind: 'good' }); else { const ta = el('textarea', 'pz-code'); ta.value = code; ta.readOnly = true; UI.modal({ title: '存檔碼', body: ta, buttons: [{ label: '好', primary: true }], pause: false, onOpen: () => { ta.focus(); ta.select(); } }); } };
    b2.onclick = async () => {
      const ta = el('textarea', 'pz-code'); ta.placeholder = '把存檔碼貼在這裡';
      const v = await UI.modal({ title: '讀取存檔碼', body: ta, buttons: [{ label: '取消', value: false }, { label: '讀取', value: true, primary: true }], pause: false, onOpen: () => setTimeout(() => ta.focus(), 50) });
      if (!v) return;
      if (sv.load(ta.value)) { UI.toast('讀取成功', { kind: 'good' }); if (o.onLoad) o.onLoad(); } else UI.toast('存檔碼不對，請整段複製再貼一次', { kind: 'bad' });
    };
  }
  return UI.modal({ title: o.title || '設定', body: box, wide: false, buttons: [{ label: '重設', ghost: true, onClick: () => { Settings.reset(); UI.toast('已恢復預設'); return true; } }, { label: '完成', primary: true, value: true }], pause: o.pause });
};

/* ---------- 標準暫停選單 ---------- */
UI.pause = (o = {}) => {
  const items = [{ label: '繼續', value: 'resume', primary: true }].concat(o.items || []).concat(o.settings === false ? [] : [{ label: '設定', value: 'settings' }]);
  return UI.choose({ title: o.title || '暫停', body: o.body, options: items, cancelValue: 'resume' }).then(async (v) => {
    const it = items.find((x) => x.value === v || x.label === v);
    if (v === 'settings') { await UI.settings({ save: o.save }); return UI.pause(o); }
    if (it && it.onClick) safeCall(it.onClick, null);
    return v;
  });
};
