// ===== 介面：工具鈕、風、提示、標籤、選單、結局 =====
const WIND_WORD = ['無風', '微風', '強風', '狂風'];
const STATE_WORD = { graze: '吃草', alert: '警覺', trot: '受驚', flee: '逃竄', trapped: '被火圍住', cornered: '被逼到石壁下', shore: '被逼到湖邊', charge: '發狂', balk: '被火擋住', sink: '掉進冰湖' };
const UI = {
  hintQ: [], hintT: 0, hintOn: false, seen: store.get('hints', {}), floats: [],
  init() {
    this.icons();
    this.hud = $('#hud');
    this.tag = $('#tag'); this.aimLbl = $('#aimLbl');
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('div');
      d.className = 'lbl flt';
      $('#labels').appendChild(d);
      this.floats.push({ el: d, t: 9, x: 0, y: 0 });
    }
  },
  icons() {
    const mk = (fn) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const c = cv.getContext('2d'); c.lineCap = 'round'; c.lineJoin = 'round';
      fn(c); return cv.toDataURL();
    };
    const bone = 'rgba(240,227,198,.95)', och = 'rgba(214,128,58,1)', yel = 'rgba(250,206,110,1)';
    $('#icSpear').src = mk((c) => {
      c.translate(48, 48); c.rotate(-0.78);
      c.beginPath(); c.moveTo(-40, 0); c.lineTo(26, 0); c.strokeStyle = bone; c.lineWidth = 5; c.stroke();
      c.beginPath(); c.moveTo(42, 0); c.lineTo(22, -9); c.lineTo(26, 0); c.lineTo(22, 9); c.closePath(); c.fillStyle = och; c.fill();
      c.beginPath(); for (const x of [-38, -28]) { c.moveTo(x, 0); c.lineTo(x - 9, -9); c.moveTo(x, 0); c.lineTo(x - 9, 9); }
      c.strokeStyle = och; c.lineWidth = 3.5; c.stroke();
    });
    $('#icFire').src = mk((c) => {
      c.beginPath(); c.moveTo(36, 86); c.lineTo(54, 44); c.strokeStyle = bone; c.lineWidth = 7; c.stroke();
      const fl = (s, col) => {
        c.beginPath(); c.moveTo(56 - 14 * s, 46);
        c.bezierCurveTo(56 - 18 * s, 30, 60 - 4 * s, 20, 62, 6 + (1 - s) * 22);
        c.bezierCurveTo(64 + 6 * s, 22, 74 + 10 * s, 30, 60 + 14 * s, 46); c.closePath();
        c.fillStyle = col; c.fill();
      };
      fl(1, 'rgba(200,70,34,1)'); fl(0.7, och); fl(0.42, yel);
    });
    $('#icWait').src = mk((c) => {
      c.beginPath(); c.moveTo(14, 48); c.quadraticCurveTo(48, 18, 82, 48); c.quadraticCurveTo(48, 78, 14, 48); c.closePath();
      c.strokeStyle = bone; c.lineWidth = 5; c.stroke();
      c.beginPath(); c.arc(48, 48, 10, 0, TAU); c.fillStyle = och; c.fill();
      c.beginPath(); for (const a of [-1.9, -1.57, -1.24]) { c.moveTo(48 + Math.cos(a) * 30, 40 + Math.sin(a) * 22); c.lineTo(48 + Math.cos(a) * 40, 40 + Math.sin(a) * 30); }
      c.strokeStyle = bone; c.lineWidth = 3.5; c.stroke();
    });
  },
  setTool(t) {
    for (const b of document.querySelectorAll('.tool[data-tool]')) b.classList.toggle('on', b.dataset.tool === t);
  },
  tools(W) {
    for (const b of document.querySelectorAll('.tool[data-tool]')) {
      const n = W.tools[b.dataset.tool];
      b.querySelector('.tally').innerHTML = '<i></i>'.repeat(n);
      b.classList.toggle('empty', n <= 0);
    }
  },
  wind(W, gust) {
    const w = W.wind.now, n = W.wind.next;
    const arrow = (v) => (v > 0 ? ' →' : v < 0 ? ' ←' : '');
    $('#windTxt').textContent = WIND_WORD[Math.abs(w)] + arrow(w);
    $('#windNext').textContent = '下一回：' + WIND_WORD[Math.abs(n)] + arrow(n);
    const cv = $('#windc'), c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.save(); c.scale(2, 2);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const s = Math.abs(w), d = sgn(w) || 1;
    if (s === 0) {
      c.beginPath(); c.arc(42, 20, 9, 0, TAU); c.strokeStyle = 'rgba(240,227,198,.55)'; c.lineWidth = 2.2; c.stroke();
      c.beginPath(); c.arc(42, 20, 2.5, 0, TAU); c.fillStyle = 'rgba(214,128,58,1)'; c.fill();
    } else {
      c.translate(42, 20); c.scale(d, 1);
      for (let i = 0; i < 3; i++) {
        const on = i < s;
        const y = -10 + i * 10;
        c.beginPath(); c.moveTo(-34, y); c.bezierCurveTo(-18, y - 5, -4, y + 5, 14, y);
        c.strokeStyle = on ? 'rgba(240,227,198,.85)' : 'rgba(240,227,198,.18)'; c.lineWidth = 2.2; c.stroke();
      }
      for (let i = 0; i < s; i++) {
        const x = 18 + i * 7;
        c.beginPath(); c.moveTo(x - 5, -8); c.lineTo(x + 3, 0); c.lineTo(x - 5, 8);
        c.strokeStyle = 'rgba(214,128,58,1)'; c.lineWidth = 3; c.stroke();
      }
    }
    c.restore();
    if (gust) { const el = $('#wind'); el.classList.remove('gust'); void el.offsetWidth; el.classList.add('gust'); }
  },
  turn(W) { $('#turn').textContent = '第 ' + W.stats.turns + ' 回'; },
  busy(on) { this.hud.classList.toggle('busy', on); },
  // ---------- 提示 ----------
  hint(id, html, dur = 5) {
    if (id && this.seen[id]) return;
    if (id) { this.seen[id] = 1; store.set('hints', this.seen); }
    this.hintQ.push({ html, dur });
  },
  hintNow(html, dur = 3) { this.hintQ.unshift({ html, dur }); this.hintT = 0; },
  clearHint() { this.hintT = 0; },
  hintTick(dt) {
    const el = $('#hint');
    this.hintT -= dt;
    if (this.hintT <= 0) {
      if (this.hintQ.length) {
        const h = this.hintQ.shift();
        el.innerHTML = h.html; el.classList.add('show'); this.hintT = h.dur; this.hintOn = true;
        A.chime();
      } else if (this.hintOn) { el.classList.remove('show'); this.hintOn = false; }
    }
  },
  // ---------- 標籤 ----------
  float(text, sx, sy, big) {
    const f = this.floats.find((q) => q.t > 1.2) || this.floats[0];
    f.t = 0; f.x = sx; f.y = sy; f.el.textContent = text;
    f.el.classList.toggle('big', !!big);
  },
  labels(dt, W, toCss, aim, phase) {
    const m = W.mam;
    const tagEl = this.tag;
    if (phase === 'end' || phase === 'title' || (!m.alive && m.state !== 'sink')) tagEl.style.opacity = 0;
    else {
      let [x, y] = toCss(m.x + 20 * m.fv, m.y - 292 + (m.state === 'sink' ? 150 : 0));
      // 上面太擠（提示框、風向）就改放到牠腳下
      if (y < (this.hintOn && !S.aimHide ? 156 : 84)) y = toCss(0, m.y + 54)[1];
      tagEl.style.opacity = 1;
      tagEl.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
      const word = STATE_WORD[m.state] || '';
      const hp = Math.max(0, Math.ceil(m.hp / 10));
      const key = word + hp;
      if (tagEl._k !== key) {
        tagEl._k = key;
        tagEl.innerHTML = word + '<div class="hp">' + '<i></i>'.repeat(hp) + '<i class="e"></i>'.repeat(10 - hp) + '</div>';
      }
      tagEl.classList.toggle('rage', m.state === 'charge' || m.state === 'balk');
    }
    const al = this.aimLbl;
    if (aim && aim.label) {
      const [x, y] = toCss(aim.lx, aim.ly);
      al.style.opacity = 1;
      al.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
      if (al._k !== aim.label) { al._k = aim.label; al.textContent = aim.label; }
    } else al.style.opacity = 0;
    for (const f of this.floats) {
      f.t += dt;
      const a = f.t < 0.15 ? f.t / 0.15 : Math.max(0, 1 - (f.t - 0.7) / 0.5);
      f.el.style.opacity = a;
      f.el.style.transform = `translate(${f.x}px,${f.y - f.t * 46}px) translate(-50%,-100%)`;
    }
  },
  // ---------- 結局 ----------
  end(W, best, run) {
    const o = W.over, s = W.stats, h = W.harvest();
    const e = $('#end');
    e.classList.toggle('lose', !o.win);
    $('#endK').textContent = '第 ' + run + ' 場狩獵';
    let T, L;
    if (o.win) {
      const m = W.mam;
      if (m.how === 'ice') { T = '冰沉'; L = s.torches ? '火把牠趕上了冰，冰撐不住。牠沉進湖底，你們只從冰洞邊割回一點肉。' : '牠踩上了薄冰，冰撐不住。牠沉進湖底，你們只從冰洞邊割回一點肉。'; }
      else if (m.how === 'fire') { T = '燎原'; L = '牠倒在自己逃不出的火裡。肉燒焦了一半，皮也燒壞了。'; }
      else if (m.how === 'bleed') { T = '血盡'; L = '矛一直扎在身上，牠越逃，血流得越快，最後走不動了。'; }
      else if (s.burnDmg > 25) { T = '火與矛'; L = '火逼牠、矛放牠的血，牠終於倒下。'; }
      else if (s.vitals >= 2) { T = '穿心'; L = '矛扎進了肩後的要害。整頭猛獁完完整整。'; }
      else { T = '放血'; L = '你沒讓牠衝到面前。牠流盡了血，倒在草原上。'; }
    } else if (o.why === 'trample') { T = '踏碎'; L = '牠衝上了石台。'; }
    else { T = '空手'; L = '矛用完了，火也熄了。牠走進了風雪裡。'; }
    $('#endT').textContent = T;
    $('#endL').textContent = L;
    const row = (name, n, max) => '<span class="hv">' + name + ' ' + '<i></i>'.repeat(n) + '<i class="e"></i>'.repeat(max - n) + '</span>';
    $('#endH').innerHTML = o.win ? row('肉', h.meat, 6) + row('皮', h.hide, 4) + row('牙', h.ivory, 2) : '';
    let verdict = '';
    if (o.win) verdict = h.score >= 10 ? '部落熬得過這個冬天。' : h.score >= 5 ? '省著吃，撐得到開春。' : '不夠吃。這個冬天會很長。';
    else verdict = '這個冬天會很長。';
    $('#endS').textContent = verdict + '　' + s.turns + ' 回合・矛 ' + s.spears + '・火把 ' + s.torches;
    $('#endB').textContent = best.isNew && o.win ? '最好的一次收穫！' : best.score > 0 ? '最好的一次：' + best.title + '（肉 ' + best.meat + '、皮 ' + best.hide + '、牙 ' + best.ivory + '）' : '';
    e.classList.remove('hid', 'peek');
  },
};
