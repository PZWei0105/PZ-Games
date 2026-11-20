/* 解包 — 年度回顧（2026-11-20）
   像限時動態一張一張播：今年解包了幾款、最大的星座、結論分布、最熱的一款、好評率最高三款，再來是痞子葳自己的一年
   （看了幾篇、標了幾款想玩、寫了幾則想法、作戰室省了多少、免費領了幾款、TGA 押中幾個、粉專發了幾則）。沒資料的那張自動跳過。
   隨時都能看（「統計到今天」）；12/20 到 1/10 首頁掛橫幅。最後一張出遊戲狂想曲的年度圖卡：只放解包的數字，
   不放個人的、不放痞子葳。點右邊下一張、點左邊上一張、按住暫停；動畫只動 transform／opacity，音效跟著換裝。 */
const RC = { i: 0, slides: [], el: null, from: 'home', D: null, cnt: [] };

const recapYear = () => { const t = todayTW(); return t.slice(5) <= '01-10' ? String(+t.slice(0, 4) - 1) : t.slice(0, 4); };   // 1/10 前看的是去年
function recapData() {
  const yr = recapYear();
  const F = ((S.index && S.index.items) || []).filter((x) => (x.date || '').startsWith(yr));
  const P = ((S.picks && S.picks.items) || []).filter((x) => (x.date || '').startsWith(yr));
  const W = ((S.weekly && S.weekly.items) || []).filter((x) => String(x.to || x.date || x.id || '').startsWith(yr));
  const all = [...F.map((x) => ({ k: 'f', x })), ...P.map((x) => ({ k: 'p', x }))];
  const fm = {}; all.forEach(({ x }) => { const f = starFam(x.genres); (fm[f.id] = fm[f.id] || { f, n: 0 }).n++; });
  const fams = Object.values(fm).sort((a, b) => b.n - a.n);
  const vd = { 推薦: 0, 觀望: 0, 不推薦: 0 }; F.forEach((x) => { if (vd[x.stamp] != null) vd[x.stamp]++; });
  const pv = {}; P.forEach((x) => { if (x.stamp) pv[x.stamp] = (pv[x.stamp] || 0) + 1; });
  let hot = null; const rated = [];
  for (const { k, x } of all) {
    const lv = liveOf(x.steam); if (!lv) continue;
    const pk = lv.players && lv.players.peak && lv.players.peak.n;
    if (pk && (!hot || pk > hot.pk)) hot = { k, x, pk, lv };
    if (lv.rv && lv.rv.pct != null && lv.rv.n >= 500 && !rated.some((r) => r.x.steam === x.steam)) rated.push({ k, x, pct: lv.rv.pct, n: lv.rv.n, lv });
  }
  rated.sort((a, b) => b.pct - a.pct || b.n - a.n);
  // 痞子葳自己的（只在這台裝置）
  const me = {
    f: F.filter((x) => S.seen[x.id]).length, p: P.filter((x) => S.seen['p:' + x.id]).length,
    v: Object.keys(S.seen).filter((k) => k.startsWith('v:')).length,
    want: Object.values(S.marks || {}).filter((m) => m === 'want').length,
    th: Object.values(S.thoughts || {}).filter((t) => String(t || '').trim()).length,
  };
  let lootN = 0, paid = 0, orig = 0;
  Object.values(S.saleSt || {}).forEach((st) => Object.values((st && st.got) || {}).forEach((g) => { if (!String(g.at || yr).startsWith(yr)) return; lootN++; paid += g.p || 0; orig += g.o || g.p || 0; }));
  const free = Object.keys(S.freeGot || {}).length;
  let tga = null;
  try {
    const nPick = Object.keys(S.tgaMe.picks || {}).length;
    if (S.tgaD && nPick) { const ph = tgaPhase(); tga = ph === 'result' ? { ph, me: tgaScore('me'), cl: tgaScore('cl'), n: nPick } : { ph, n: nPick, all: S.tgaD.cats.length }; }
  } catch (e) { /* 沒 TGA 資料 */ }
  const posts = ((S.ops && S.ops.log) || []).filter((l) => String(l.d || '').startsWith(yr));
  const pf = {}; posts.forEach((l) => { pf[l.pf] = (pf[l.pf] || 0) + 1; });
  return { yr, today: todayTW(), F, P, W, all, fams, vd, pv, hot, rated: rated.slice(0, 3), me, loot: { n: lootN, paid, saved: Math.max(0, orig - paid) }, free, tga, posts: posts.length, pf };
}

/* ---------- 每一張 ---------- */
const rcNum = (n, dec) => `<b class="rc-n" data-n="${n}" data-dec="${dec || 0}">0</b>`;
const rcWan = (n) => (n >= 1e4 ? [Math.round(n / 1e3) / 10, '萬'] : [n, '']);   // 大數字用「萬」當單位寫在後面
const rcPf = { th: 'Threads', fb: 'Facebook', ig: 'Instagram', yt: 'YouTube' };
function recapSlides(D) {
  const S2 = [];
  const cov = D.all.slice(0, 9).map(({ x }, i) => { const im = headerOf(x); return im ? `<i class="rc-pop" style="--d:${0.15 + i * 0.07}s;--r:${((i * 37) % 9) - 4}deg"><img src="${esc(im)}" alt="" onerror="this.parentNode.remove()"></i>` : ''; }).join('');
  S2.push({ k: 'cover', snd: 'riser', h: `<div class="rc-yr rc-pop" style="--d:.05s">${D.yr}</div><h2 class="rc-t rc-pop" style="--d:.25s">解包年鑑</h2>
    <p class="rc-sub rc-pop" style="--d:.45s">統計到 ${esc(mdDay(D.today))}・按右邊往下看</p><div class="rc-mos">${cov}</div>` });
  if (!D.all.length) return S2;
  S2.push({ k: 'count', snd: 'tickUp', h: `<p class="rc-k rc-pop" style="--d:.05s">今年一共解包了</p><div class="rc-big rc-pop" style="--d:.2s">${rcNum(D.all.length)}<span>款遊戲</span></div>
    <div class="rc-chips">${[['專題', D.F.length], ['推坑', D.P.length], ['週報', D.W.length]].filter((x) => x[1]).map(([t, n], i) => `<span class="rc-chip rc-pop" style="--d:${0.7 + i * 0.15}s">${t} <b>${n}</b></span>`).join('')}</div>
    <p class="rc-note rc-pop" style="--d:1.2s">每天清晨 Claude 寫專題、挑推坑，週日晚上結算週報。</p>` });
  if (D.fams.length) {
    const top = D.fams[0]; const mx = top.n;
    S2.push({ k: 'fam', snd: 'whoosh', h: `<p class="rc-k rc-pop" style="--d:.05s">你的星系裡最大的星座</p><h2 class="rc-t rc-pop" style="--d:.2s">${esc(top.f.zh)}</h2><p class="rc-sub rc-pop" style="--d:.35s">${esc(top.f.en)}・${top.n} 款</p>
      <div class="rc-bars">${D.fams.slice(0, 5).map((f, i) => `<div class="rc-bar2 rc-pop" style="--d:${0.55 + i * 0.12}s"><span>${esc(f.f.zh)}</span><i><em style="--w:${(f.n / mx).toFixed(3)};--d:${0.7 + i * 0.12}s"></em></i><b>${f.n}</b></div>`).join('')}</div>
      <button class="btn y sm rc-go rc-pop" style="--d:1.3s" data-act="rcgo" data-v="stars">${ICON.cons}<span>打開遊戲星圖</span></button>` });
  }
  const vn = D.vd.推薦 + D.vd.觀望 + D.vd.不推薦;
  if (vn) {
    S2.push({ k: 'verdict', snd: 'stamp', stamps: 3, h: `<p class="rc-k rc-pop" style="--d:.05s">專題的結論</p>
      <div class="rc-stamps">${[['推薦', 'g'], ['觀望', 'm'], ['不推薦', 'b']].map(([t, c], i) => `<div class="rc-stp ${c} rc-slam" style="--d:${0.35 + i * 0.45}s"><b>${D.vd[t]}</b><span>${t}</span></div>`).join('')}</div>
      ${Object.keys(D.pv).length ? `<p class="rc-note rc-pop" style="--d:1.8s">推坑：${['必玩', '閉眼入', '特價入', '冷門神作'].filter((t) => D.pv[t]).map((t) => `${t} ${D.pv[t]}`).join('・')}</p>` : ''}` });
  }
  if (D.hot) {
    const h = D.hot; const im = heroOf(h.x, h.lv);
    S2.push({ k: 'hot', snd: 'riser', h: `<p class="rc-k rc-pop" style="--d:.05s">今年寫過最熱的一款</p>
      <div class="rc-cv rc-pop" style="--d:.2s">${im ? `<img src="${esc(im)}" alt="" onerror="this.remove()">` : ''}</div>
      <h2 class="rc-t sm rc-pop" style="--d:.45s">${esc(h.x.zh)}</h2><div class="rc-big rc-pop" style="--d:.6s">${rcNum(rcWan(h.pk)[0], h.pk >= 1e4 ? 1 : 0)}<span>${rcWan(h.pk)[1]}人同時在線</span></div><p class="rc-note rc-pop" style="--d:1s">追蹤以來的同上最高（${h.lv.players.peak.at ? esc(mdDay(twDate(Date.parse(h.lv.players.peak.at)))) : ''}）</p>` });
  }
  if (D.rated.length) {
    S2.push({ k: 'best', snd: 'ding', h: `<p class="rc-k rc-pop" style="--d:.05s">好評率最高的三款</p><p class="rc-sub rc-pop" style="--d:.15s">Steam 評論 500 則以上</p>
      <ol class="rc-best">${D.rated.map((r, i) => { const im = headerOf(r.x, r.lv); return `<li class="rc-pop" style="--d:${0.35 + i * 0.25}s" data-go="${r.k}/${esc(r.x.id)}"><em>${i + 1}</em>${im ? `<img src="${esc(im)}" alt="" onerror="this.remove()">` : '<span class="ph0"></span>'}<div><b>${esc(r.x.zh)}</b><small>${esc(fmtN(r.n))} 則評論</small></div><strong>${r.pct}<span>%</span></strong></li>`; }).join('')}</ol>` });
  }
  const m = D.me;
  if (m.f + m.p + m.v + m.want + m.th) {
    S2.push({ k: 'me', snd: 'pop', h: `<p class="rc-k rc-pop" style="--d:.05s">你自己的解包</p><div class="rc-big rc-pop" style="--d:.2s">${rcNum(m.f + m.p)}<span>篇看完了</span></div>
      <div class="rc-grid">${[['專題', m.f, '篇'], ['推坑', m.p, '篇'], ['短影音', m.v, '支'], ['想玩', m.want, '款'], ['寫下想法', m.th, '則']].filter((x) => x[1]).map(([t, n, u], i) => `<div class="rc-cell rc-pop" style="--d:${0.6 + i * 0.12}s"><small>${t}</small><b>${n}</b><i>${u}</i></div>`).join('')}</div>
      ${D.all.length > m.f + m.p ? `<p class="rc-note rc-pop" style="--d:1.3s">還有 ${D.all.length - m.f - m.p} 篇沒看過——遊戲星圖上會閃的就是。</p>` : '<p class="rc-note rc-pop" style="--d:1.3s">全部看完了，探索度 100%。</p>'}` });
  }
  if (D.loot.n || D.free) {
    S2.push({ k: 'loot', snd: 'coin', h: `<p class="rc-k rc-pop" style="--d:.05s">獵價戰果</p>
      ${D.loot.n ? `<div class="rc-big rc-pop" style="--d:.2s"><span class="pre">NT$</span>${rcNum(Math.round(D.loot.saved / 100))}<span>省下來</span></div><p class="rc-sub rc-pop" style="--d:.5s">特賣作戰室收了 ${D.loot.n} 款、花了 ${esc(fmtNT(D.loot.paid))}</p>` : ''}
      ${D.free ? `<div class="rc-chip big rc-pop" style="--d:${D.loot.n ? 0.8 : 0.2}s">免費補給站領了 <b>${D.free}</b> 款</div>` : ''}` });
  }
  if (D.tga) {
    const t = D.tga;
    S2.push({ k: 'tga', snd: t.ph === 'result' ? 'fanfare' : 'tick', h: t.ph === 'result'
      ? `<p class="rc-k rc-pop" style="--d:.05s">TGA 預測戰</p><div class="rc-vs rc-pop" style="--d:.25s"><div><small>你</small><b>${t.me.pts}</b><i>押中 ${t.me.hit}／${t.me.done}</i></div><span>VS</span><div><small>Claude</small><b>${t.cl.pts}</b><i>押中 ${t.cl.hit}／${t.cl.done}</i></div></div>
        <p class="rc-note rc-pop" style="--d:.8s">${t.me.pts > t.cl.pts ? '你贏了 Claude！' : t.me.pts < t.cl.pts ? 'Claude 這次比較準，明年再戰。' : '平手！'}</p>`
      : `<p class="rc-k rc-pop" style="--d:.05s">TGA 預測戰</p><div class="rc-big rc-pop" style="--d:.2s">${rcNum(t.n)}<span>／${t.all} 項已經押了</span></div><p class="rc-note rc-pop" style="--d:.6s">${t.ph === 'live' ? '頒獎直播中，結果出來自動對答案。' : '12/11 早上開獎，結果出來這張會變成你和 Claude 的比分。'}</p>` });
  }
  if (D.posts) {
    S2.push({ k: 'fan', snd: 'pop', h: `<p class="rc-k rc-pop" style="--d:.05s">遊戲狂想曲粉專</p><div class="rc-big rc-pop" style="--d:.2s">${rcNum(D.posts)}<span>則貼文發出去了</span></div>
      <div class="rc-chips">${Object.entries(D.pf).map(([k, n], i) => `<span class="rc-chip rc-pop" style="--d:${0.6 + i * 0.12}s">${esc(rcPf[k] || k)} <b>${n}</b></span>`).join('')}</div>` });
  }
  S2.push({ k: 'end', snd: 'fanfare', h: `<p class="rc-k rc-pop" style="--d:.05s">${D.yr} 解包完畢</p><h2 class="rc-t sm rc-pop" style="--d:.2s">把這一年貼上粉專</h2>
    <div class="rc-cardbox rc-pop" style="--d:.4s"><canvas id="rccv" class="cardcv"></canvas></div>
    <div class="btnrow rc-pop" style="--d:.6s;justify-content:center"><button class="btn y sm" data-act="rcdl">${ICON.dl}<span>下載圖卡</span></button>${navigator.share ? `<button class="btn p sm" data-act="rcshare"><span>分享</span></button>` : ''}<button class="btn sm" data-act="rcagain"><span>再看一次</span></button></div>
    <p class="rc-note rc-pop" style="--d:.8s">圖卡只放解包的數字，不放你個人的紀錄和名字。</p>` });
  return S2;
}

/* ---------- 播放 ---------- */
function recapOpen(from) {
  recapClose(true);
  RC.from = from && !from.startsWith('recap') ? from : 'home';
  RC.D = recapData(); RC.slides = recapSlides(RC.D); RC.i = 0;
  const el = document.createElement('div'); el.id = 'recap'; el.className = 'rc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${RC.D.yr} 解包年鑑`);
  el.innerHTML = `<div class="rc-bars0">${RC.slides.map(() => '<i><em></em></i>').join('')}</div>
    <button class="rc-x" data-act="rcx" aria-label="關閉">✕</button>
    <div class="rc-stage">${RC.slides.map((s, i) => `<section class="rc-s rcs-${s.k}" data-i="${i}">${s.h}</section>`).join('')}</div>`;
  document.body.appendChild(el); document.body.classList.add('rc-on'); RC.el = el;
  el.addEventListener('pointerdown', recapDown); el.addEventListener('pointerup', recapUp); el.addEventListener('pointercancel', recapUp);
  el.querySelector('.rc-bars0').addEventListener('animationend', (e) => { if (e.target.parentNode && e.target.parentNode.classList.contains('on')) recapGo(1); });
  document.addEventListener('keydown', recapKey);
  recapShow(0);
}
function recapClose(silent) {
  if (!RC.el) return;
  RC.cnt.forEach(cancelAnimationFrame); RC.cnt = [];
  RC.el.remove(); RC.el = null; document.body.classList.remove('rc-on'); document.removeEventListener('keydown', recapKey);
  if (!silent) { sfx.click(); if (NAVN > 0) { NAVN--; history.back(); } else location.replace('#' + (RC.from || 'home')); }
}
function recapShow(i) {
  const el = RC.el; if (!el) return;
  i = Math.max(0, Math.min(RC.slides.length - 1, i)); RC.i = i;
  el.querySelectorAll('.rc-s').forEach((s, k) => s.classList.toggle('on', k === i));
  el.querySelectorAll('.rc-bars0 i').forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.remove('on'); });
  const bar = el.querySelectorAll('.rc-bars0 i')[i]; void bar.offsetWidth; if (i < RC.slides.length - 1) bar.classList.add('on'); else bar.classList.add('done');
  el.classList.remove('paused'); el.dataset.k = RC.slides[i].k;
  const sl = RC.slides[i]; try { sfx[sl.snd] ? sfx[sl.snd]() : sfx.whoosh(); } catch (e) { /* */ }
  if (sl.stamps) for (let k = 0; k < sl.stamps; k++) setTimeout(() => { if (RC.el && RC.i === i) { try { sfx.stamp(); } catch (e) { /* */ } haptic(10); } }, 380 + k * 450);
  const sec = el.querySelectorAll('.rc-s')[i];
  sec.querySelectorAll('.rc-n').forEach((n) => recapCount(n));
  if (sl.k === 'end') recapCardRender();
}
function recapCount(n) {
  const to = +n.dataset.n || 0; const dec = +n.dataset.dec || 0; const t0 = performance.now(); const d = 1100;
  const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('zh-TW'));
  const step = (t) => { if (!RC.el) return; const p = Math.min(1, (t - t0 - 250) / d); const e = p <= 0 ? 0 : 1 - Math.pow(1 - p, 3); n.textContent = fmt(to * e); if (p < 1) RC.cnt.push(requestAnimationFrame(step)); };
  if (!fxOn()) { n.textContent = fmt(to); return; }
  RC.cnt.push(requestAnimationFrame(step));
}
function recapGo(d) {
  const j = RC.i + d;
  if (j >= RC.slides.length) return;   // 最後一張停住
  if (j < 0) { recapShow(0); return; }
  recapShow(j);
}
let rcHold = 0, rcDownAt = 0;
function recapDown(e) {
  if (e.target.closest('button, a, [data-go], canvas')) return;
  rcDownAt = performance.now(); clearTimeout(rcHold);
  rcHold = setTimeout(() => { if (RC.el) RC.el.classList.add('paused'); }, 220);   // 按住暫停
}
function recapUp(e) {
  clearTimeout(rcHold);
  if (!RC.el || !rcDownAt) return;
  const held = performance.now() - rcDownAt; rcDownAt = 0;
  if (RC.el.classList.contains('paused')) { RC.el.classList.remove('paused'); if (held > 220) return; }
  if (e.type === 'pointercancel' || e.target.closest('button, a, [data-go], canvas')) return;
  const left = e.clientX < window.innerWidth * 0.3;
  recapGo(left ? -1 : 1);
}
function recapKey(e) {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); recapGo(1); }
  else if (e.key === 'ArrowLeft') recapGo(-1);
  else if (e.key === 'Escape') recapClose();
}
function recapAct(a, el) {
  if (a === 'rcx') { recapClose(); return true; }
  if (a === 'rcagain') { recapShow(0); return true; }
  if (a === 'rcdl' || a === 'rcshare') { recapCardOut(a === 'rcshare'); return true; }
  if (a === 'rcgo') { const to = el.dataset.v; recapClose(true); location.hash = to; return true; }
  return false;
}

/* ---------- 粉專圖卡（1080×1350，遊戲狂想曲；不放個人紀錄、不放名字） ---------- */
async function drawRecapCard(cv, D) {
  const W = 1080, H = 1350; cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#111'; c.fillRect(0, 0, W, H); halftone(c, W, H, 'rgba(255,230,0,.07)', 24, 3.2);
  c.fillStyle = '#FFE600'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, 380); c.lineTo(0, 470); c.closePath(); c.fill();
  c.textBaseline = 'top'; c.fillStyle = '#111'; c.font = `900 44px ${CFONT}`; c.fillText(`解包 UNPACKED・${D.yr} 年鑑`, 64, 60);
  c.font = `400 250px "Bebas Neue",sans-serif`; c.fillStyle = '#FF2E88'; c.fillText(String(D.all.length), 74, 132); c.fillStyle = '#111'; c.fillText(String(D.all.length), 62, 120);
  const nw = c.measureText(String(D.all.length)).width; stepText(c, '款遊戲', 62 + nw + 30, 230, 84, '#fff', '#111');
  c.fillStyle = '#111'; c.font = `900 34px ${CFONT}`;
  c.fillText([D.F.length && `專題 ${D.F.length}`, D.P.length && `推坑 ${D.P.length}`, D.W.length && `週報 ${D.W.length}`].filter(Boolean).join('・'), 64, 380);
  let y = 520;
  if (D.fams.length) {
    c.fillStyle = '#FFE600'; c.font = `900 40px ${CFONT}`; c.fillText('最大的星座', 64, y);
    let x = 64; y += 64;
    D.fams.slice(0, 3).forEach((f, i) => { x += sticker(c, `${f.f.zh} ${f.n}`, x, y, ['#FFE600', '#FF2E88', '#fff'][i], i === 1 ? '#fff' : '#111', [-0.04, 0.03, -0.02][i], 40) + 26; });
    y += 120;
  }
  const vn = D.vd.推薦 + D.vd.觀望 + D.vd.不推薦;
  if (vn) {
    c.fillStyle = '#fff'; c.font = `900 38px ${CFONT}`;
    c.fillText(`推薦 ${D.vd.推薦}・觀望 ${D.vd.觀望}・不推薦 ${D.vd.不推薦}`, 64, y); y += 80;
  }
  if (D.rated.length) {
    c.fillStyle = '#FFE600'; c.font = `900 40px ${CFONT}`; c.fillText('好評率最高', 64, y); y += 66;
    const gw = 296, gh = Math.round(gw * 215 / 460);
    for (let i = 0; i < D.rated.length; i++) {
      const r = D.rated[i]; const x = 64 + i * (gw + 32);
      c.save(); c.translate(x + gw / 2, y + gh / 2); c.rotate((i % 2 ? 1 : -1) * 0.025); c.translate(-gw / 2, -gh / 2);
      c.fillStyle = '#FF2E88'; c.fillRect(8, 8, gw, gh); c.fillStyle = '#fff'; c.fillRect(-6, -6, gw + 12, gh + 12);
      const im = await loadImgCors(headerOf(r.x, r.lv)); if (im) coverDraw(c, im, 0, 0, gw, gh); else { c.fillStyle = '#333'; c.fillRect(0, 0, gw, gh); }
      c.restore();
      c.fillStyle = '#fff'; c.font = `900 26px ${CFONT}`; let nm = r.x.zh; while (c.measureText(nm).width > gw && nm.length > 2) nm = nm.slice(0, -2) + '…'; c.fillText(nm, x, y + gh + 16);
      c.fillStyle = '#FFE600'; c.font = `400 44px "Bebas Neue",sans-serif`; c.fillText(`${r.pct}%`, x, y + gh + 50);
    }
  }
  c.fillStyle = '#777'; c.font = `700 24px ${CFONT}`; c.fillText(`統計到 ${D.today.replace(/-/g, '/')}`, 64, H - 70);
  brandSticker(c, W - 230, H - 120, -0.06);
}
async function recapCardRender() {
  const cv = $('#rccv'); if (!cv || cv.dataset.ok) return;
  cv.dataset.ok = '1'; try { await drawRecapCard(cv, RC.D); } catch (e) { cv.dataset.ok = ''; }
}
async function recapCardOut(share) {
  const cv = $('#rccv'); if (!cv) return;
  const b = await new Promise((res) => { try { cv.toBlob(res, 'image/png'); } catch (e) { res(null); } });
  if (!b) { toast('圖卡裡有圖片不能匯出，換張網路好一點的時候再試', 'warn'); return; }
  const f = new File([b], `rhapsody-${RC.D.yr}-recap.png`, { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return; }
  const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); sfx.ding();
}

/* 首頁橫幅（12/20～1/10）、全部功能 */
function recapBanner() {
  const t = todayTW(); const md = t.slice(5);
  if (!(md >= '12-20' || md <= '01-10')) return '';
  const yr = recapYear();
  return `<div class="sw-ban rc-ban" data-go="recap"><span class="sw-bk">${yr}</span><div><b>解包年鑑出爐了</b><small>一年寫了哪些、你看了多少、TGA 押中幾個</small></div><i>›</i></div>`;
}
