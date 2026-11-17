/* 翻牌字格（Solari 機場看板）：每一格上下兩半，翻過去時先翻上半、再落下半 */
const Flap = {
  ZH: '轉機航班登機出發延誤檢修簽派塔台點子遊戲小說自由天光雲海星辰風雨沙城夜潮界層組',
  EN: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  NUM: '0123456789',
  cell(c) {
    const b = '<b>' + esc(c) + '</b>';
    return '<span class="fc"><span class="fu">' + b + '</span><span class="fl">' + b + '</span><span class="ft">' + b + '</span><span class="fb">' + b + '</span></span>';
  },
  html(text, cls, blank) {
    const cs = Array.from(String(text));
    return '<span class="flaps ' + (cls || '') + '" data-t="' + esc(text) + '" aria-label="' + esc(text) + '">' + cs.map((c) => this.cell(blank === false ? c : ' ')).join('') + '</span>';
  },
  pool(c) {
    if (/[0-9]/.test(c)) return this.NUM;
    if (/[A-Za-z]/.test(c)) return this.EN;
    if (c === ' ' || /[^㐀-鿿]/.test(c)) return this.EN;
    return this.ZH;
  },
  setFace(cell, part, c) { const b = cell.querySelector('.' + part + ' b'); if (b) b.textContent = c; },
  flip(cell, from, to, dur) {
    return new Promise((res) => {
      const ft = cell.querySelector('.ft'), fb = cell.querySelector('.fb');
      this.setFace(cell, 'fu', to); this.setFace(cell, 'fl', from); this.setFace(cell, 'ft', from); this.setFace(cell, 'fb', to);
      const h = dur / 2;
      const a1 = ft.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: h, easing: 'ease-in', fill: 'forwards' });
      Snd.clack();
      a1.onfinish = () => {
        const a2 = fb.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: h, easing: 'ease-out', fill: 'forwards' });
        a2.onfinish = () => {
          this.setFace(cell, 'fl', to); this.setFace(cell, 'ft', to);
          a1.cancel(); a2.cancel();
          res();
        };
      };
    });
  },
  async spinCell(cell, target, steps, delay, dur) {
    if (delay) await sleep(delay);
    let cur = cell.querySelector('.fl b').textContent;
    const pool = this.pool(target);
    for (let i = 0; i < steps; i++) {
      const nx = pool[Math.floor(Math.random() * pool.length)];
      await this.flip(cell, cur, nx, dur); cur = nx;
    }
    if (cur !== target) await this.flip(cell, cur, target, dur + 30);
  },
  // 把 root 裡所有還沒翻過的看板翻上去
  run(root, opts) {
    const o = Object.assign({ base: 0, step: 38, dur: 74, min: 2, max: 6 }, opts || {});
    const sets = $$('.flaps[data-t]:not(.ran)', root);
    const jobs = [];
    sets.forEach((el, si) => {
      el.classList.add('ran');
      const target = Array.from(el.getAttribute('data-t'));
      const cells = $$('.fc', el);
      if (reduced() || !Snd.ctx && o.quiet) { cells.forEach((c, i) => this.paint(c, target[i] || ' ')); return; }
      cells.forEach((c, i) => {
        const steps = o.min + Math.floor(Math.random() * (o.max - o.min + 1));
        jobs.push(this.spinCell(c, target[i] || ' ', steps, o.base + si * 90 + i * o.step, o.dur));
      });
    });
    return Promise.all(jobs);
  },
  paint(cell, c) { ['fu', 'fl', 'ft', 'fb'].forEach((p) => this.setFace(cell, p, c)); },
  // 換字（例如狀態變了）：長度一樣就直接翻，不一樣就重畫
  async set(el, text, cls) {
    if (!el) return;
    const cs = Array.from(text), cells = $$('.fc', el);
    if (cells.length !== cs.length) {
      const tmp = document.createElement('span'); tmp.innerHTML = this.html(text, cls || el.className.replace(/\bflaps\b|\bran\b/g, '').trim());
      const n = tmp.firstChild; el.replaceWith(n); return this.run(n.parentNode, { min: 1, max: 3 });
    }
    el.setAttribute('data-t', text);
    return Promise.all(cells.map((c, i) => this.spinCell(c, cs[i], reduced() ? 0 : 1 + Math.floor(Math.random() * 2), i * 40, 70)));
  },
};
