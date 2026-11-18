'use strict';
/* 補番 BINGE — 畫面特效：墨水圈轉場（Iris）、眼睛貼（Eyecatch）、閃光（キラキラ）、蓋章、數字滾動、開場（OP） */

const Fx = (() => {
  const lite = () => SET.fx === 'lite' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  /* 墨水圈轉場：從點的位置暈開墨水蓋住畫面，換頁，再從畫面中間開一個圈露出新頁（卡通的 Iris） */
  function iris(mid, x, y) {
    const el = $('#iris');
    if (lite() || busy) { if (mid) mid(); return; }
    busy = true;
    Snd.play('tab');
    const W = innerWidth, H = innerHeight;
    x = x == null ? W / 2 : x; y = y == null ? H / 2 : y;
    const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20;
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--r', R + 'px');
    el.className = 'iris close';
    setTimeout(() => {
      try { if (mid) mid(); } catch (e) { console.error(e); }
      el.style.setProperty('--x', W / 2 + 'px');
      el.style.setProperty('--y', H * 0.45 + 'px');
      el.style.setProperty('--r', Math.hypot(W, H) / 2 + 30 + 'px');
      el.className = 'iris open';
      setTimeout(() => { el.className = 'iris'; busy = false; }, 420);
    }, 300);
  }

  /* 眼睛貼：放映前的一秒小卡（作品名＋第幾話），蓋住播放器載入的空檔 */
  function eyecatch(host, title, ep, color) {
    if (!host) return () => {};
    const el = document.createElement('div');
    el.className = 'eyec' + (lite() ? ' lite' : '');
    el.style.setProperty('--ec', color || 'var(--sakura)');
    el.innerHTML = `<i class="ec-a"></i><i class="ec-b"></i><i class="ec-lines"></i>
      <div class="ec-in"><b class="d ec-logo">補番</b><span class="ec-ep d">${esc(ep || '放映開始')}</span><span class="ec-t">${esc(title || '')}</span></div>
      <i class="ec-star s1">✦</i><i class="ec-star s2">✦</i><i class="ec-star s3">✧</i>`;
    host.appendChild(el);
    Snd.play('eyecatch');
    let gone = false;
    const off = () => {
      if (gone) return;
      gone = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 420);
    };
    setTimeout(off, 2600);
    return off;
  }

  /* 數字滾動 */
  function count(el, to, ms = 900) {
    if (!el) return;
    if (lite()) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* キラキラ：四角星＋小圓點噴出來（追番、抽中） */
  function sparkle(x, y, colors = ['#ffd23f', '#ff4f9a', '#ffffff', '#2ec5ff'], n = 26) {
    if (lite()) return;
    const c = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const S = 300;
    c.width = c.height = S * dpr;
    c.className = 'fx-burst';
    c.style.cssText = 'left:' + (x - S / 2) + 'px;top:' + (y - S / 2) + 'px;width:' + S + 'px;height:' + S + 'px';
    document.body.appendChild(c);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const ps = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, v = 2 + Math.random() * 4.5;
      ps.push({ x: S / 2, y: S / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, l: 1, s: 3 + Math.random() * 7, c: colors[i % colors.length], star: i % 3 !== 2, r: Math.random() * 3 });
    }
    const star = (s) => {
      g.beginPath();
      g.moveTo(0, -s); g.quadraticCurveTo(0, 0, s, 0); g.quadraticCurveTo(0, 0, 0, s); g.quadraticCurveTo(0, 0, -s, 0); g.quadraticCurveTo(0, 0, 0, -s);
      g.fill();
    };
    let f = 0;
    const tick = () => {
      g.clearRect(0, 0, S, S);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.vx *= 0.965; p.vy *= 0.975; p.l -= 0.021; p.r += 0.08;
        if (p.l <= 0) return;
        g.save(); g.globalAlpha = Math.max(0, p.l); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
        if (p.star) star(p.s * (0.6 + p.l * 0.6)); else { g.beginPath(); g.arc(0, 0, p.s * 0.35, 0, 7); g.fill(); }
        g.restore();
      });
      if (++f < 54) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  }

  /* 蓋章：完食！、抽中！ */
  function stamp(host, text, cls = '') {
    const s = document.createElement('div');
    s.className = 'stamp ' + cls;
    s.innerHTML = '<b class="d">' + esc(text) + '</b>';
    host.appendChild(s);
    setTimeout(() => s.remove(), 1600);
  }

  /* 標題卡：像動畫每一集開頭的「第 N 話『…』」 */
  function titleCard(ep, title, sub, ms = 2900) {
    if (lite()) { toast(title + (sub ? '：' + sub : '')); return; }
    const el = document.createElement('div');
    el.className = 'tcard';
    el.innerHTML = `<div class="tc-in"><span class="tc-ep d">${esc(ep)}</span><b class="tc-t d">${esc(title)}</b>${sub ? `<span class="tc-s">${esc(sub)}</span>` : ''}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); }, ms);
    setTimeout(() => el.remove(), ms + 700);
  }

  /* 開場（OP）：天空→點一下開播→白閃→集中線→大字砸下→三格快切（今天的精選）→墨水圈打開 */
  function boot(info) {
    const gate = $('#gate');
    gate.hidden = false;
    gate.className = 'gate';
    const ep = info.ep || 1;
    gate.innerHTML = `
      <i class="g-burst"></i>
      <div class="g-in">
        <div class="g-ep d">第 ${ep} 話</div>
        <div class="g-logo"><b class="d">補番</b><span class="d">BINGE</span></div>
        <div class="g-sub">「${esc(info.line || '今天也一口氣看完吧')}」</div>
        <button class="g-btn d" id="gateBtn"><i>▶</i>開播</button>
        <div class="g-meta">${esc(info.stats || '')}</div>
      </div>
      <div class="g-cuts" id="gCuts">${(info.cuts || []).slice(0, 3).map((id, i) => `<i class="cut c${i + 1}"><img src="${thumb(id, 'hqdefault')}" alt=""></i>`).join('')}</div>
      <i class="g-flash"></i>`;
    return new Promise((res) => {
      const go = () => {
        Snd.init();
        const btn = $('#gateBtn');
        if (btn) btn.disabled = true;
        if (lite()) { gate.hidden = true; gate.innerHTML = ''; res(); return; }
        gate.classList.add('go');
        Snd.play('slam');
        setTimeout(() => { gate.classList.add('cuts'); Snd.play('whoosh'); }, 520);
        [0, 1, 2].forEach((i) => setTimeout(() => { Snd.play('dodon'); gate.classList.add('cut' + (i + 1)); }, 640 + i * 260));
        setTimeout(() => {
          gate.classList.add('end');
          Snd.play('kira');
          setTimeout(() => {
            iris(() => { gate.hidden = true; gate.innerHTML = ''; gate.className = ''; }, innerWidth / 2, innerHeight / 2);
            res();
          }, 380);
        }, 1520);
      };
      $('#gateBtn').addEventListener('click', go, { once: true });
    });
  }
  return { iris, eyecatch, count, sparkle, stamp, titleCard, boot, lite };
})();
