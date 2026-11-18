'use strict';
/* 觀戰 SPECTATE — 畫面特效：轉場（Stinger）、開場倒數、字卡、蓋章、火花、數字滾動 */

const Fx = (() => {
  const lite = () => SET.fx === 'lite' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  /* 整頁轉場：三條斜帶掃過，蓋住的那一刻換畫面 */
  function stinger(mid, sound = true) {
    const st = $('#stinger');
    if (lite() || busy) { if (mid) mid(); return Promise.resolve(); }
    busy = true;
    if (sound) Snd.play('stinger');
    st.classList.remove('go'); void st.offsetWidth; st.classList.add('go');
    return new Promise((res) => {
      setTimeout(() => { try { if (mid) mid(); } catch (e) { console.error(e); } }, 330);
      setTimeout(() => { st.classList.remove('go'); busy = false; res(); }, 860);
    });
  }
  /* 分頁切換：一條斜光刷過 */
  function wipe(mid) {
    const st = $('#stinger');
    if (lite() || busy) { if (mid) mid(); return; }
    Snd.play('tab');
    st.classList.remove('go', 'wipe'); void st.offsetWidth; st.classList.add('wipe');
    setTimeout(() => { if (mid) mid(); }, 150);
    setTimeout(() => st.classList.remove('wipe'), 520);
  }
  /* 數字滾動 */
  function count(el, to, ms = 900) {
    if (!el) return;
    if (lite()) { el.textContent = to; return; }
    const from = 0, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  /* 火花：按鈕位置噴一圈（訂閱、選秀） */
  function burst(x, y, colors = ['#ff2d55', '#ffc229', '#ffffff']) {
    if (lite()) return;
    const c = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const S = 260;
    c.width = c.height = S * dpr;
    c.className = 'fx-burst';
    c.style.cssText = 'left:' + (x - S / 2) + 'px;top:' + (y - S / 2) + 'px;width:' + S + 'px;height:' + S + 'px';
    document.body.appendChild(c);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const ps = [];
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2, v = 2.2 + Math.random() * 4.6;
      ps.push({ x: S / 2, y: S / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, l: 1, w: 2 + Math.random() * 4, c: colors[i % colors.length], r: Math.random() * 6 });
    }
    let f = 0;
    const tick = () => {
      g.clearRect(0, 0, S, S);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.97; p.l -= 0.025; p.r += 0.2;
        if (p.l <= 0) return;
        g.save(); g.globalAlpha = Math.max(0, p.l); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
        g.fillRect(-p.w, -p.w * 0.3, p.w * 2, p.w * 0.6); g.restore();
      });
      if (++f < 44) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  }
  /* 蓋章：選秀、訂閱 */
  function stamp(host, text, cls = '') {
    const s = document.createElement('div');
    s.className = 'stamp ' + cls;
    s.innerHTML = '<b>' + esc(text) + '</b>';
    host.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
  /* 字卡（Lower third）：開場問候、提示 */
  function lowerThird(title, sub, ms = 3600) {
    const el = document.createElement('div');
    el.className = 'l3';
    el.innerHTML = '<div class="l3-tag">ON AIR</div><div class="l3-main"><b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span></div>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); }, ms);
    setTimeout(() => el.remove(), ms + 700);
  }

  /* 開場：點一下 → 3、2、1 → ON AIR → 斜帶轉場進轉播台 */
  function boot(stats) {
    const gate = $('#gate');
    gate.hidden = false;
    gate.className = 'gate';
    gate.innerHTML = `
      <div class="gate-grid"></div>
      <div class="gate-in">
        <div class="gate-brand"><b>觀戰</b><span>SPECTATE</span></div>
        <div class="gate-sub">${esc(NAME)}的遊戲轉播台</div>
        <div class="gate-count" id="gateCount" hidden><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="gc-bg"/><circle cx="60" cy="60" r="52" class="gc-ring" id="gcRing"/></svg><b id="gcNum">3</b></div>
        <button class="gate-btn" id="gateBtn"><i></i>點一下・開始轉播</button>
        <div class="gate-meta">${stats ? esc(stats) : ''}</div>
      </div>
      <div class="gate-corner tl">CAM 01</div><div class="gate-corner tr"><i></i>REC</div><div class="gate-corner bl">${new Date().toLocaleDateString('zh-TW')}</div><div class="gate-corner br">STANDBY</div>`;
    return new Promise((res) => {
      const go = () => {
        Snd.init();
        $('#gateBtn').remove();
        if (lite()) { gate.hidden = true; gate.innerHTML = ''; res(); return; }
        gate.classList.add('counting');
        const cnt = $('#gateCount'), numEl = $('#gcNum'), ring = $('#gcRing');
        cnt.hidden = false;
        let n = 3;
        const tick = () => {
          if (n > 0) {
            numEl.textContent = n;
            numEl.classList.remove('pop'); void numEl.offsetWidth; numEl.classList.add('pop');
            ring.style.transition = 'none'; ring.style.strokeDashoffset = '0'; void ring.offsetWidth;
            ring.style.transition = 'stroke-dashoffset .62s linear'; ring.style.strokeDashoffset = '327';
            Snd.play('beep');
            n--;
            setTimeout(tick, 640);
          } else {
            numEl.textContent = 'ON AIR';
            numEl.classList.add('air');
            gate.classList.add('air');
            Snd.play('go');
            setTimeout(() => {
              Snd.play('onair');
              stinger(() => { gate.hidden = true; gate.innerHTML = ''; gate.className = ''; }, false).then(res);
              Snd.play('whoosh');
            }, 520);
          }
        };
        tick();
      };
      $('#gateBtn').addEventListener('click', go, { once: true });
    });
  }
  return { stinger, wipe, count, burst, stamp, lowerThird, boot, lite };
})();
