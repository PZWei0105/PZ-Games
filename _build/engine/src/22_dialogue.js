/* ==========================================================================
   22 劇情對話
     await PZ.ui.say([
       ['魏子葳', '……又是凌晨三點。'],
       [null, '巷口的路燈閃了兩下。'],                 // 沒有名字＝旁白
       ['老闆', '這單送完就收工。', { face: 'boss_face', side: 'right' }],
     ], { faces: { 魏子葳: 'face_wei' }, voices: { 魏子葳: 0.9, 老闆: 0.75 } });
     const i = await PZ.ui.ask('要怎麼做？', ['衝進去', '先觀察']);   // 回傳選了第幾個
   點一下（或 A／Enter／空白）：字還在跑就一次顯示完，跑完就下一句；按住會快轉。
   右上角：自動、快轉、紀錄（看前面說過的話）。對話時遊戲自動暫停。
   ========================================================================== */
const Say = { log: [], faceCache: new Map() };
function faceEl(face) {
  if (!face) return null;
  if (face instanceof HTMLElement) return face;
  let url = Say.faceCache.get(face);
  if (!url) { url = Art.has(face) ? Art.url(face) : face; Say.faceCache.set(face, url); }
  const img = new Image(); img.src = url; img.alt = ''; return img;
}
function sayBox() {
  if (UI._say) return UI._say;
  const wrap = el('div', 'pz-say', `<div class="pz-say-face"></div><div class="pz-say-box"><div class="pz-say-name"></div><div class="pz-say-text"></div><div class="pz-say-more"></div>
    <div class="pz-say-tools"><button data-t="auto" data-sfx="click">自動</button><button data-t="skip" data-sfx="click">快轉</button><button data-t="log" data-sfx="click">紀錄</button></div></div>`);
  Screen.ui.appendChild(wrap); UI.enhance(wrap);
  const S = UI._say = { wrap, box: wrap.querySelector('.pz-say-box'), name: wrap.querySelector('.pz-say-name'), text: wrap.querySelector('.pz-say-text'), face: wrap.querySelector('.pz-say-face'), auto: false, skip: false, onAdv: null, holdT: 0 };
  wrap.querySelectorAll('.pz-say-tools button').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const t = b.dataset.t;
    if (t === 'auto') { S.auto = !S.auto; b.classList.toggle('on', S.auto); if (S.auto && S.onAdv && S.wrap.classList.contains('done')) S.onAdv(); }
    else if (t === 'skip') { S.skip = !S.skip; b.classList.toggle('on', S.skip); if (S.onAdv) S.onAdv(); }
    else if (t === 'log') { const lg = el('div', 'pz-log', Say.log.slice(-80).map((l) => `<p>${l[0] ? `<b>${l[0]}</b>` : ''}${l[1]}</p>`).join('') || '<p>還沒有對話。</p>'); UI.modal({ title: '對話紀錄', body: lg, buttons: [{ label: '關閉', primary: true }], pause: false, onOpen: () => { lg.scrollTop = lg.scrollHeight; } }); }
  }));
  wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.pz-say-tools,.pz-choices')) return; S.holdT = Time.real; if (S.onAdv) S.onAdv(); });
  return S;
}
function closeSay() { const S = UI._say; if (!S) return; S.wrap.remove(); UI._say = null; }

/** 一句一句播（回傳 Promise）；每句可以是 [名字, 文字, {face, side, voice}] 或字串（旁白） */
UI.say = async (lines, o = {}) => {
  if (!Array.isArray(lines)) lines = [lines];
  const S = sayBox(); S.skip = false;
  if (o.pause !== false) PZ.pause('say');
  Input.releaseAll();
  const layer = UI.push(S.wrap, null);
  const advKey = Input.onPress('confirm', () => { S.holdT = Time.real; if (UI.top() === layer && S.onAdv) S.onAdv(); });
  try {
    for (const ln of lines) {
      const L = typeof ln === 'string' ? [null, ln, {}] : Array.isArray(ln) ? [ln[0], ln[1], ln[2] || {}] : [ln.name, ln.text, ln];
      const [name, text, lo] = L;
      if (lo.do) { await lo.do(); continue; }
      S.wrap.classList.toggle('narr', !name); S.wrap.classList.toggle('right', lo.side === 'right');
      S.name.style.display = name ? '' : 'none'; S.name.textContent = name || '';
      const face = lo.face || (o.faces && name && o.faces[name]) || null;
      S.face.innerHTML = ''; const fe = faceEl(face); if (fe) S.face.appendChild(fe);
      S.wrap.classList.remove('done');
      Say.log.push([name, text]); if (Say.log.length > 300) Say.log.shift();
      await typeLine(S, String(text), (o.voices && name && o.voices[name]) || lo.voice || 1, o);
      S.wrap.classList.add('done');
      await waitAdvance(S, String(text));
    }
  } finally {
    advKey(); UI.pop(layer);
    if (!o.keep) closeSay();
    if (o.pause !== false) PZ.resume('say');
  }
};
function typeLine(S, text, voice, o) {
  return new Promise((res) => {
    const chars = [...text]; let i = 0, wait = 0, last = nowMs();
    S.text.textContent = '';
    const span = document.createTextNode(''); S.text.appendChild(span);
    const speed = 36 * (Settings.get('textSpeed') || 1) * (o.speed || 1);
    let finished = false;
    const finish = () => { if (finished) return; finished = true; clearInterval(timer); span.data = text; S.onAdv = null; res(); };
    S.onAdv = finish;
    const timer = setInterval(() => {
      const now = nowMs(), dt = (now - last) / 1000; last = now;
      const fast = S.skip || (Input.down('confirm') && Time.real - S.holdT > 0.35) || (Input.pointer.down && Time.real - S.holdT > 0.35);
      if (fast) { finish(); return; }
      wait -= dt; if (wait > 0) return;
      let n = Math.max(1, Math.round(speed * dt));
      while (n-- > 0 && i < chars.length) {
        const c = chars[i++]; span.data += c;
        if (o.blip !== false && i % 2 === 1 && c.trim() && Sfx.has('type')) Sfx.play('type', { pitch: voice, bus: 'ui' });
        if ('。！？!?'.includes(c)) { wait = 0.22; break; } if ('，、；：,;:'.includes(c)) { wait = 0.1; break; } if (c === '…') { wait = 0.08; break; }
      }
      if (i >= chars.length) finish();
    }, 16);
  });
}
function waitAdvance(S, text) {
  return new Promise((res) => {
    let t = 0;
    const go = () => { clearTimeout(t); S.onAdv = null; res(); };
    S.onAdv = go;
    if (S.skip) t = setTimeout(go, 60);
    else if (S.auto) t = setTimeout(go, 900 + [...text].length * 45 / (Settings.get('textSpeed') || 1));
  });
}
/** 對話中的選擇：回傳選了第幾個（0 起算）。options 可以是字串或 { label, desc, disabled } */
UI.ask = (prompt, options, o = {}) => new Promise((res) => {
  const S = sayBox();
  if (o.pause !== false) PZ.pause('say');
  S.wrap.classList.add('done'); S.wrap.classList.toggle('narr', !o.name);
  S.name.style.display = o.name ? '' : 'none'; S.name.textContent = o.name || '';
  S.text.textContent = prompt || '';
  const box = el('div', 'pz-choices');
  options.forEach((op, i) => {
    const d = typeof op === 'string' ? { label: op } : op;
    const b = el('button', 'pz-btn', d.label + (d.desc ? `<small style="display:block;color:var(--pz-dim);font-weight:500">${d.desc}</small>` : '')); b.type = 'button';
    if (d.disabled) b.disabled = true;
    b.onclick = (e) => { e.stopPropagation(); Say.log.push([null, '→ ' + d.label]); box.remove(); UI.pop(layer); if (!o.keep) closeSay(); if (o.pause !== false) PZ.resume('say'); PZ.uiSound('confirm'); res(i); };
    box.appendChild(b);
  });
  S.box.appendChild(box); UI.enhance(box);
  const layer = UI.push(S.wrap, null);
  S.onAdv = null;
});
UI.closeSay = closeSay;
