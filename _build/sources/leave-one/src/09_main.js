// ===== 主程式：鏡頭、操作、回合、畫面合成、開機 =====
const CV = $('#gl');
let W = null;
const S = {
  phase: 'title', tool: 'spear', aim: null, worldT: 0, ff: false, dieT: 0, endT: 0, impactT: 0, flightPred: null,
  hitstop: 0, slowT: 0, slowK: 1, light: 0.13, flash: 0, mural: 0, run: store.get('runs', 0), best: store.get('best', { score: 0 }),
  dpr: 1, q: 1, pq: ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 0.75 : 1, cssW: 0, cssH: 0, perfT: 0, perfN: 0, perfAcc: 0, portraitOK: false, sprayed: 0, ended: false, peek: false,
  hitThisTurn: false, lakeHinted: false, started: false,
};
const cam = { x: 1000, y: 470, z: 0.5, user: 1, panX: 0, panY: 0, shake: 0, ox: 0, oy: 0, k: 1, snap: true };

// ---------- 鏡頭 ----------
function frameBox() {
  const m = W.mam, h = W.hunter;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const add = (x, y, px = 0, py = 0) => { x0 = Math.min(x0, x - px); x1 = Math.max(x1, x + px); y0 = Math.min(y0, y - py); y1 = Math.max(y1, y + py); };
  const addM = () => add(m.x + 40 * m.fv, m.y - 140, 250, 165);
  const addH = () => add(h.x, h.y - 80, 100, 115);
  const ph = S.phase;
  if (ph === 'title' || ph === 'aim') {
    addH(); addM();
    if (S.aim && S.aim.pred && S.aim.pred.res) {
      const r = S.aim.pred.res; add(r.x, r.y, 90, 50);
      // 拋物線的最高點也框進來（太高就算了）
      const pts = S.aim.pred.pts;
      let top = 1e9, tx = 0;
      for (let i = 1; i < pts.length; i += 2) if (pts[i] < top) { top = pts[i]; tx = pts[i - 1]; }
      if (top > -60) add(tx, top, 20, 30);
    }
    if (m.x > 1150) add(Math.min(LAKE1, m.x + 420), 612);
  } else if (ph === 'flight' || ph === 'impact') {
    const p = W.proj;
    if (p) add(p.x, p.y, 150, 90);
    if (S.flightPred) add(S.flightPred.x, S.flightPred.y, 150, 90);
    addM();
    if (p && p.t < 0.25) addH();
  } else if (ph === 'end') {
    addM();
    if (S.handAt) add(S.handAt.x, S.handAt.y, 110, 110);
    if (Math.abs(m.x - h.x) < 1100) addH();
  } else {
    addM();
    for (const fx of W.flames) if (Math.abs(fx - m.x) < 650) add(fx, W.groundAt(fx) - 60, 30, 50);
    if (Math.abs(m.x - h.x) < 950 || !h.alive) addH();
    if ((m.x > 1250 && m.vx > 0) || m.state === 'sink' || m.state === 'shore') add(Math.min(LAKE1 + 20, m.x + 380), 612);
  }
  return { x0, x1, y0, y1 };
}
function updateCam(dt) {
  if (S.camLock) { cam.x = S.camLock.x; cam.y = S.camLock.y; cam.z = S.camLock.z; cam.shake = 0; return; }
  const b = frameBox();
  const vw = S.cssW, vh = S.cssH;
  const short = vh < 520;
  const top = short ? 58 : 74, bot = short ? 100 : 124;
  const uh = Math.max(120, vh - top - bot);
  const bw = Math.max(200, b.x1 - b.x0), bh = Math.max(160, b.y1 - b.y0);
  const zMin = clamp(Math.min(vw, vh * 1.6) / 1500, 0.28, 0.6);
  // 結局卡在橫向小螢幕時放右邊，壁畫往左挪
  const side = S.phase === 'end' && !S.peek && vh < 520 && vw > vh ? 0.48 : 0;
  let z = Math.min((vw * (0.9 - side)) / bw, uh / bh);
  z = clamp(z, zMin, 1.25) * cam.user;
  const cx = (b.x0 + b.x1) / 2 + cam.panX + (side * vw * 0.5) / z;
  const cy = (b.y0 + b.y1) / 2 - (top - bot) / 2 / z + cam.panY;
  const fast = S.phase === 'flight' ? 6 : S.phase === 'world' || S.phase === 'dying' ? 3 : 2.4;
  const k = cam.snap ? 1 : 1 - Math.exp(-dt * fast);
  cam.snap = false;
  cam.x += (cx - cam.x) * k;
  cam.y += (cy - cam.y) * k;
  cam.z = Math.exp(Math.log(cam.z) + (Math.log(z) - Math.log(cam.z)) * k);
  const hw = vw / 2 / cam.z, hh = vh / 2 / cam.z;
  cam.x = clamp(cam.x, -250 + hw, 2700 - hw);
  if (hw * 2 > 2950) cam.x = 1225;
  cam.y = clamp(cam.y, -120 + hh, 980 - hh);
  if (hh * 2 > 1100) cam.y = 430;
  cam.shake = Math.max(0, cam.shake - dt * 2.6);
}
const toCss = (x, y) => [(x - cam.ox) * cam.z, (y - cam.oy) * cam.z];
const toPx = (x, y) => [(x - cam.ox) * cam.k, (y - cam.oy) * cam.k];

// ---------- 開局、回合 ----------
function startHunt() {
  const seed = ((Date.now() * 9301) ^ Math.floor(Math.random() * 1e9)) >>> 0;
  W = new World(seed);
  FX.reset();
  S.phase = 'aim'; S.aim = null; S.worldT = 0; S.dieT = 0; S.endT = 0; S.mural = 0; S.sprayed = 0; S.ended = false; S.peek = false;
  S.hitstop = 0; S.slowT = 0; S.ff = false; S.hitThisTurn = false; S.lakeHinted = false;
  S.run++; store.set('runs', S.run);
  setTool('spear', true);
  cam.panX = 0; cam.panY = 0;
  $('#end').classList.add('hid');
  $('#hud').classList.remove('hid');
  $('#labels').style.opacity = 1;
  $('#ffBtn').classList.remove('on');
  UI.tools(W); UI.wind(W, false); UI.turn(W); UI.busy(false);
  UI.hint('elder', '老獵人說：冬天要來了。<b>部落要肉，也要皮。</b>', 4.2);
  UI.hint('aim', '在畫面上<b>按住、往後拉</b>，放手就擲出去。', 8);
  checkRotate();
}
function setTool(t, silent) {
  if (W && W.tools[t] <= 0) { if (!silent) UI.hintNow(t === 'spear' ? '矛用完了。' : '火把用完了。', 1.6); return; }
  S.tool = t; W && (W.hunter.tool = t);
  UI.setTool(t);
  if (!silent) A.knock();
  if (t === 'fire') UI.hint('fire', '火把落在草上就會起火，<b>順著風</b>燒。猛獁怕火。', 5.5);
  if (S.aim) S.aim.dirty = true;
}
function doThrow() {
  const a = S.aim;
  if (!a || !W.throwProj(S.tool, a.ang, a.power)) return;
  W._lastAng = a.ang;
  S.flightPred = a.pred && a.pred.res;
  S.aim = null;
  S.phase = 'flight';
  UI.busy(true); UI.clearHint();
  UI.tools(W);
}
function doWait() {
  if (S.phase !== 'aim') return;
  A.knock();
  S.aim = null;
  startWorld();
}
function startWorld() { S.phase = 'world'; S.worldT = 0; UI.busy(true); }
function endWorld() {
  const before = W.wind.now;
  W.nextTurn();
  if (W.over) { toDying(); return; }
  S.phase = 'aim';
  cam.panX = 0; cam.panY = 0;
  UI.busy(false);
  UI.wind(W, before !== W.wind.now);
  if (before !== W.wind.now) A.gustFx();
  UI.turn(W);
  if (W.tools[S.tool] <= 0) { const o = S.tool === 'spear' ? 'fire' : 'spear'; if (W.tools[o] > 0) setTool(o, true); }
  UI.tools(W);
  const burning = W.grass.some((s) => s.st === 1);
  if (S.hitThisTurn) { UI.hint('bleed', '矛扎在牠身上，牠<b>一跑就流血</b>。別讓牠衝到你面前。', 5.5); S.hitThisTurn = false; }
  if (burning) UI.hint('wait', '火還在燒。按<b>「等一回」</b>不出手，看火和牠怎麼動。', 5);
  if (W.tools.spear + W.tools.fire === 0) UI.hintNow('手上沒東西了。按<b>「等一回」</b>，看牠撐不撐得住。', 3);
}
function toDying() {
  if (S.phase === 'dying' || S.phase === 'end') return;
  S.phase = 'dying'; S.dieT = 0;
  UI.busy(true);
  if (W.over.win) { setTimeout(() => A.roll(), 500); }
}
function toEnd() {
  S.phase = 'end'; S.endT = 0;
  UI.hintQ.length = 0; UI.hintT = 0; $('#hint').classList.remove('show'); UI.hintOn = false;
  {
    const m = W.mam, h = W.hunter;
    const near = Math.abs(m.x - h.x) < 900;
    S.handAt = near ? { x: (m.x + h.x) / 2, y: Math.min(h.y, m.y) - 330 } : { x: clamp(m.x - 360 * Math.sign(m.x - h.x || 1), 160, 2300), y: m.y - 330 };
  }
  $('#hud').classList.add('hid');
  $('#labels').style.opacity = 0;
  const h = W.harvest();
  let best = S.best;
  const titleOf = () => { const m = W.mam; return m.how === 'ice' ? '冰沉' : m.how === 'fire' ? '燎原' : m.how === 'bleed' ? '血盡' : '放血'; };
  if (W.over.win && h.score > (best.score || 0) && (best.score > 0 || h.score >= 5)) {
    best = { score: h.score, meat: h.meat, hide: h.hide, ivory: h.ivory, title: titleOf(), isNew: true };
    S.best = { ...best, isNew: false }; store.set('best', S.best);
  } else {
    if (W.over.win && h.score > (best.score || 0)) { S.best = { score: h.score, meat: h.meat, hide: h.hide, ivory: h.ivory, title: titleOf() }; store.set('best', S.best); }
    best = { ...best, isNew: false };
  }
  if (W.over.win) A.flute([587, 659, 784, 880, 784, 988], 0.3);
  else A.flute([440, 392, 330, 294], 0.42);
  setTimeout(() => { if (S.phase === 'end') UI.end(W, best, S.run); }, 1700);
}

// ---------- 事件 → 聲音、粒子、字 ----------
function panOf(x) { return clamp(((x - cam.ox) * cam.z / S.cssW) * 2 - 1, -1, 1); }
function nearOf(x) { return clamp(1 - Math.abs((x - cam.x) * cam.z) / (S.cssW * 0.9), 0.25, 1); }
function handleEvents() {
  const m = W.mam;
  for (const e of W.ev) {
    const pan = e.x !== undefined ? panOf(e.x) : 0;
    switch (e.e) {
      case 'throw': A.whoosh(e.power, e.tool); break;
      case 'hit': {
        A.thud('flesh', pan);
        S.hitstop = 0.13; cam.shake = Math.max(cam.shake, 0.55);
        FX.burst('blood', e.x, e.y, 7, { vx: 0 });
        const [sx, sy] = toCss(e.x, e.y - 30);
        UI.float('−' + e.dmg + '　' + ZONE_TXT[e.zone], sx, sy, e.zone === 'vital');
        S.hitThisTurn = true;
        break;
      }
      case 'bounce': {
        A.thud('tusk', pan); FX.burst('spark', e.x, e.y, 10);
        const [sx, sy] = toCss(e.x, e.y - 30); UI.float(ZONE_TXT.tusk, sx, sy);
        break;
      }
      case 'land':
        if (e.kind === 'rock') { A.thud('rock', pan); FX.burst('spark', e.x, e.y - 4, e.tool === 'fire' ? 14 : 8); }
        else if (e.kind === 'ice') { A.thud('ice', pan); FX.burst('shard', e.x, e.y - 2, 3); }
        else { A.thud('ground', pan); FX.burst('dust', e.x, e.y, 6, { v: 80, w: 20 }); }
        break;
      case 'ignite': A.ignite(pan); FX.burst('ember', e.x, e.y, 22); FX.burst('dust', e.x, e.y, 5, { v: 60 }); cam.shake = Math.max(cam.shake, 0.25); break;
      case 'hiss': {
        A.hiss(pan); FX.burst('steam', e.x, e.y, 12);
        const [sx, sy] = toCss(e.x, e.y - 30); UI.float(e.ice ? '冰被燒薄了' : '熄了', sx, sy);
        break;
      }
      case 'splash': A.splash(pan, 0.5); FX.burst('splash', e.x, 612, 8, { v: 160, w: 10 }); break;
      case 'torchHit': {
        A.thud('flesh', pan); A.ignite(pan); FX.burst('ember', e.x, e.y, 28);
        const [sx, sy] = toCss(e.x, e.y - 30); UI.float('燒到了', sx, sy);
        cam.shake = Math.max(cam.shake, 0.4);
        break;
      }
      case 'startle': A.stomp(0.4, pan); break;
      case 'trumpet': A.trumpet(e.k, pan); if (e.k === 'rage') cam.shake = Math.max(cam.shake, 0.35); break;
      case 'rage': UI.hint('rage', '牠被激怒，<b>衝過來了</b>！火能擋住牠。', 5); break;
      case 'balk': cam.shake = Math.max(cam.shake, 0.45); FX.burst('dust', m.x - 120 * m.fv, m.y, 12, { v: 160, w: 60 }); break;
      case 'trapped': UI.hint('trapped', '牠被火圍住了。火燒得越久，牠越想<b>硬衝出去</b>。', 4.5); break;
      case 'shore':
        if (!S.lakeHinted) { S.lakeHinted = true; UI.hint('lake', '牠被逼到湖邊。掉進冰湖的話，<b>肉就撈不回來了</b>。', 5.5); }
        break;
      case 'step': {
        const near = nearOf(e.x);
        A.stomp((0.35 + 0.65 * e.heavy) * near, pan);
        cam.shake = Math.max(cam.shake, 0.18 * e.heavy * near);
        FX.burst('dust', e.x - 90 * m.face, e.y, 2, { v: 90, w: 30, vx: -m.vx * 0.2 });
        if (m.spears.length) {
          const w = m.spears[Math.floor(Math.random() * m.spears.length)];
          FX.burst('blood', m.x + w.lx * m.face, m.y - w.ly, 2, { vx: m.vx });
        }
        break;
      }
      case 'crack': A.crack(e.lvl, pan); if (e.lvl >= 2) cam.shake = Math.max(cam.shake, 0.15); break;
      case 'break': A.iceBreak(pan); FX.burst('shard', e.x, 604, 2); FX.burst('splash', e.x, 612, 5); cam.shake = Math.max(cam.shake, 0.9); break;
      case 'plunge': A.splash(pan, 1.7); FX.burst('splash', e.x, 612, 22, { v: 420, w: 220 }); FX.burst('shard', e.x, 604, 6); S.slowT = 0.9; S.slowK = 0.35; cam.shake = 1.2; break;
      case 'burn': FX.burst('ember', e.x + (Math.random() - 0.5) * 160, e.y + 40, 4); break;
      case 'die':
        A.groan(pan); cam.shake = Math.max(cam.shake, 0.9); S.slowT = 0.7; S.slowK = 0.4;
        if (e.how !== 'ice') FX.burst('dust', e.x, e.y, 18, { v: 200, w: 300 });
        break;
      case 'trample': A.stomp(1.6, pan); A.thud('flesh', pan); cam.shake = 1.5; S.hitstop = 0.18; break;
      case 'lost': { const [sx, sy] = toCss(cam.x, cam.y); UI.float('落空了', sx, sy); break; }
    }
  }
  W.ev.length = 0;
}
function tension() {
  const m = W.mam;
  if (S.phase === 'title') return 0;
  if (!m.alive) return 0.08;
  let t = { graze: 0.05, alert: 0.25, trot: 0.35, flee: 0.6, trapped: 0.78, cornered: 0.72, shore: 0.66, charge: 0.86, balk: 0.8, sink: 0.92 }[m.state] || 0;
  if (m.state === 'charge') t += clamp(1 - (m.x - W.hunter.x) / 900, 0, 1) * 0.14;
  if (S.phase === 'end') t *= 0.3;
  return clamp(t, 0, 1);
}

// ---------- 光與發光 ----------
function buildLights(extra, hand) {
  GLR.clearLights(); GLR.clearGlow();
  const t = P.t, Lt = S.light;
  const vwW = S.cssW / cam.z, vhW = S.cssH / cam.z, big = Math.max(vwW, vhW);
  const fl = 0.9 + 0.07 * vnoise(t * 6.5, 1) + 0.04 * vnoise(t * 17, 2);
  GLR.light(cam.ox + vwW * 0.3 + vnoise(t * 0.5, 3) * 18, cam.oy + vhW * 0.5, 380, big * 0.62, 1.38 * fl * Lt, 1.0 * fl * Lt, 0.7 * fl * Lt);
  GLR.light(cam.ox + vwW * 0.86, cam.oy + vhW * 0.32, 640, big * 0.48, 0.42 * Lt, 0.34 * Lt, 0.27 * Lt);
  // 火：連在一起的燒成一團光
  const cl = [];
  let cur = null;
  for (const s of W.grass) {
    if (s.st !== 1) { if (cur && s.i - cur.last > 2) { cl.push(cur); cur = null; } continue; }
    if (!cur) cur = { sum: 0, wx: 0, n: 0, last: s.i };
    cur.sum += s.I; cur.wx += s.cx * s.I; cur.n++; cur.last = s.i;
  }
  if (cur) cl.push(cur);
  cl.sort((a, b) => b.sum - a.sum);
  for (let i = 0; i < cl.length; i++) {
    const c = cl[i];
    if (c.sum < 0.05) continue;
    const x = c.wx / c.sum, y = W.groundAt(x) - 46;
    const f = (0.85 + 0.15 * vnoise(t * 9 + i * 3, 7)) * Math.min(2.6, 0.6 + c.sum * 0.3);
    if (i < 7) GLR.light(x, y, 70, 150 + 18 * c.n, 0.95 * Math.min(f, 2.1), 0.48 * Math.min(f, 2.1), 0.17 * Math.min(f, 2.1));
    const [sx, sy] = toPx(x, y - 10);
    const gi = Math.min(0.75, c.sum * 0.12);
    GLR.glow(sx, sy, (170 + 20 * c.n) * cam.k, 0.38 * gi, 0.15 * gi, 0.03 * gi, 1.8);
  }
  const fe = (x, y, I, rad) => {
    const [sx, sy] = toPx(x, y);
    GLR.glow(sx, sy, rad * cam.k, 0.3 * I, 0.14 * I, 0.03 * I, 2.4);
  };
  for (const s of W.grass) {
    if (s.st === 1) fe(s.cx, W.groundAt(s.cx) - 28, s.I, 60);
    else if (s.st === 2) { const [sx, sy] = toPx(s.cx, W.groundAt(s.cx) - 2); const a = 1 - s.t / 3.5; GLR.glow(sx, sy, 16 * cam.k, 0.4 * a, 0.08 * a, 0.02 * a, 2); }
  }
  for (const b of W.brands) {
    const a = 1 - b.t / b.life;
    GLR.light(b.x, b.y - 30, 50, 110, 0.9 * a, 0.48 * a, 0.18 * a);
    fe(b.x, b.y - 14, 0.8 * a, 70);
  }
  for (const e of extra) {
    GLR.light(e.x, e.y - 20, 60, 140, 1.0, 0.55, 0.2);
    fe(e.x, e.y - 10, 1, 80);
  }
  const m = W.mam;
  if (m.alive && m.rage > 0.2) {
    const a = m.head;
    const lx = 132 - 92, ly = 214 - 205;
    const ex = 92 + lx * Math.cos(a) - ly * Math.sin(a), ey = 205 + lx * Math.sin(a) + ly * Math.cos(a);
    const [sx, sy] = toPx(m.x + ex * m.fv, m.y - ey);
    GLR.glow(sx, sy, 16 * cam.k, 0.9 * m.rage, 0.14 * m.rage, 0.05 * m.rage, 2);
  }
  FX.glow(toPx, cam.k / cam.z);
  // 瞄準的軌跡：一串餘燼
  const a = S.aim;
  if (S.phase === 'aim' && a && a.active && a.pred) {
    const pts = a.pred.pts, sc = S.dpr * S.q;
    let lastX = -1e9, lastY = -1e9, n = 0;
    const total = pts.length / 2;
    for (let i = 0; i < pts.length; i += 2) {
      const [sx, sy] = toPx(pts[i], pts[i + 1]);
      if (Math.hypot(sx - lastX, sy - lastY) < 15 * sc) continue;
      lastX = sx; lastY = sy; n++;
      const f = 1 - (i / 2 / total) * 0.45;
      GLR.glow(sx, sy, 4.2 * sc, 0.95 * f, 0.72 * f, 0.42 * f, 2.4);
    }
    const r = a.pred.res;
    if (r) {
      const [sx, sy] = toPx(r.x, r.y);
      const col = r.type === 'mam' ? (r.zone === 'vital' ? [1, 0.25, 0.1] : r.zone === 'tusk' || r.zone === 'head' ? [0.6, 0.6, 0.6] : [1, 0.5, 0.2]) : S.tool === 'fire' && r.kind === 'grass' ? [1, 0.6, 0.15] : [0.8, 0.7, 0.55];
      const pulse = 0.75 + 0.25 * Math.sin(t * 8);
      GLR.glow(sx, sy, 20 * sc * pulse, col[0] * 0.8, col[1] * 0.8, col[2] * 0.8, 2.2);
    }
    // 手指拉的線
    const [x0, y0] = [a.sx * sc, a.sy * sc], [x1, y1] = [a.x * sc, a.y * sc];
    const L = Math.hypot(x1 - x0, y1 - y0), steps = Math.floor(L / (13 * sc));
    for (let i = 0; i <= steps; i++) {
      const u = steps ? i / steps : 0;
      GLR.glow(lerp(x0, x1, u), lerp(y0, y1, u), 3 * sc, 0.35, 0.3, 0.25, 2);
    }
    GLR.glow(x0, y0, (14 + 22 * a.power) * sc, 0.25, 0.17, 0.08, 1.6);
  }
  // 標題畫面：還沒點著的火把
  if (S.phase === 'title' && !S.started) {
    const sc = S.dpr * S.q;
    const p = 0.75 + 0.25 * Math.sin(t * 3);
    GLR.glow(S.cssW * 0.5 * sc, S.cssH * 0.88 * sc, 26 * sc * p, 0.7, 0.28, 0.06, 1.8);
  }
}
function aimLabel() {
  const a = S.aim;
  if (S.phase !== 'aim' || !a || !a.active || !a.pred || !a.pred.res) return null;
  const r = a.pred.res;
  let label = '';
  if (r.type === 'mam') label = S.tool === 'fire' ? '燒牠' : AIM_TXT[r.zone];
  else if (r.type === 'out') label = '飛出去了';
  else if (S.tool === 'fire') label = r.kind === 'grass' ? '起火' : r.kind === 'ice' ? '把冰燒薄' : r.kind === 'water' ? '掉進水裡' : '石頭上（燒一下就熄）';
  else label = r.kind === 'ice' ? '冰面' : r.kind === 'water' ? '掉進水裡' : r.kind === 'rock' ? '石頭' : (Math.abs(r.x - W.mam.x) < 240 && W.mam.alive ? '落在牠旁邊（嚇牠）' : '地上');
  return { label, lx: r.x, ly: r.y - 26 };
}

// ---------- 畫 ----------
function render() {
  const sh = cam.shake * cam.shake;
  const jx = (Math.random() - 0.5) * 22 * sh / cam.z, jy = (Math.random() - 0.5) * 16 * sh / cam.z;
  cam.k = cam.z * S.dpr * S.q;
  cam.ox = cam.x - S.cssW / 2 / cam.z + jx;
  cam.oy = cam.y - S.cssH / 2 / cam.z + jy;
  P.k = cam.k * S.pq; P.ox = cam.ox; P.oy = cam.oy; P.vw = P.cv.width; P.vh = P.cv.height; P.px = S.dpr * S.q * S.pq;
  const c = P.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, P.vw, P.vh);
  c.setTransform(P.k, 0, 0, P.k, -cam.ox * P.k, -cam.oy * P.k);
  c.lineCap = 'round'; c.lineJoin = 'round';
  paintGround(W);
  FX.paintUnder();
  paintGrass(W);
  paintStuck(W);
  const aimP = S.phase === 'aim' && S.aim && S.aim.active ? S.aim : null;
  const hand = paintHunter(W, aimP, S.tool);
  paintMammoth(W);
  const extra = [];
  const pf = paintProj(W);
  if (pf) extra.push(pf);
  if (hand.fireAt && (S.phase === 'aim' || S.phase === 'title')) extra.push(hand.fireAt);
  paintFlames(W, extra);
  FX.paint();
  // 瞄準軌跡：炭筆點（畫在岩壁上，所以也會被火光照到）
  const a = S.aim;
  if (S.phase === 'aim' && a && a.active && a.pred) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    const sc = P.px, pts = a.pred.pts, n = pts.length / 2;
    const toP = (x, y) => [(x - cam.ox) * P.k, (y - cam.oy) * P.k];
    let lx = -1e9, ly = -1e9;
    c.fillStyle = rgba(PIG.char, 0.88);
    for (let i = 0; i < pts.length; i += 2) {
      const [sx, sy] = toP(pts[i], pts[i + 1]);
      if (Math.hypot(sx - lx, sy - ly) < 15 * sc) continue;
      lx = sx; ly = sy;
      c.beginPath(); c.arc(sx, sy, (3.6 - (i / 2 / n) * 1.4) * sc, 0, TAU); c.fill();
    }
    const r = a.pred.res;
    if (r && r.type !== 'out') {
      const [sx, sy] = toP(r.x, r.y);
      c.strokeStyle = rgba(PIG.char, 0.92); c.lineWidth = 3 * sc;
      c.beginPath(); c.arc(sx, sy, 12 * sc, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(sx - 6 * sc, sy - 6 * sc); c.lineTo(sx + 6 * sc, sy + 6 * sc); c.moveTo(sx + 6 * sc, sy - 6 * sc); c.lineTo(sx - 6 * sc, sy + 6 * sc); c.stroke();
    }
  }
  buildLights(extra, hand);
  GLR.render(cam, P.cv, { amb: 0.07, time: P.t, expo: 1 + S.flash, mural: S.mural });
}

// ---------- 操作 ----------
const ptr = new Map();
let pinch = null;
function maxDrag() { return clamp(Math.min(S.cssW, S.cssH) * 0.42, 110, 260); }
function updAim(a) {
  const dx = a.x - a.sx, dy = a.y - a.sy, L = Math.hypot(dx, dy);
  if (L > 12) a.active = true;
  let ang = Math.atan2(-dy, -dx);
  if (Math.cos(ang) < -0.25) ang = ang < 0 ? Math.min(ang, -1.82) : Math.max(ang, 1.4);
  ang = clamp(ang, -1.82, 1.4);
  a.ang = ang; a.power = clamp(L / maxDrag(), 0, 1);
  a.dirty = true;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && A.ctx && A.ctx.state !== 'running') A.ctx.resume(); });
CV.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (A.ctx && A.ctx.state !== 'running') A.ctx.resume();
  try { CV.setPointerCapture(e.pointerId); } catch (er) { /* 不支援 */ }
  ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2) {
    S.aim = null;
    const [p1, p2] = [...ptr.values()];
    pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), u: cam.user, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2, px: cam.panX, py: cam.panY };
    return;
  }
  if (S.phase === 'aim' && ptr.size === 1) {
    if (W.tools[S.tool] <= 0) { UI.hintNow(W.tools.spear + W.tools.fire ? '這個用完了，換另一樣。' : '手上沒東西了，按「等一回」。', 2); return; }
    S.aim = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false, power: 0, ang: -0.7, pred: null, dirty: false, id: e.pointerId };
  }
});
CV.addEventListener('pointermove', (e) => {
  const p = ptr.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (pinch && ptr.size >= 2) {
    const [p1, p2] = [...ptr.values()];
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    cam.user = clamp(pinch.u * (d / pinch.d), 0.55, 1.9);
    cam.panX = pinch.px - ((p1.x + p2.x) / 2 - pinch.mx) / cam.z;
    cam.panY = pinch.py - ((p1.y + p2.y) / 2 - pinch.my) / cam.z;
    return;
  }
  const a = S.aim;
  if (a && a.id === e.pointerId && S.phase === 'aim') { a.x = e.clientX; a.y = e.clientY; updAim(a); }
});
const up = (e) => {
  ptr.delete(e.pointerId);
  if (ptr.size < 2) pinch = null;
  const a = S.aim;
  if (a && a.id === e.pointerId && S.phase === 'aim') {
    if (a.active && a.power >= 0.08 && e.type !== 'pointercancel') doThrow();
    else S.aim = null;
  }
};
CV.addEventListener('pointerup', up);
CV.addEventListener('pointercancel', up);
CV.addEventListener('wheel', (e) => { e.preventDefault(); cam.user = clamp(cam.user * Math.exp(-e.deltaY * 0.0012), 0.55, 1.9); }, { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());
for (const b of document.querySelectorAll('.tool[data-tool]')) b.addEventListener('click', () => { if (S.phase === 'aim') setTool(b.dataset.tool); });
$('#waitBtn').addEventListener('click', doWait);
$('#ffBtn').addEventListener('click', () => { S.ff = !S.ff; $('#ffBtn').classList.toggle('on', S.ff); A.knock(); });
$('#menuBtn').addEventListener('click', () => { A.knock(); $('#menu').classList.remove('off'); $('#mSound').innerHTML = '<b>聲音</b>：' + (A.on ? '開' : '關'); });
$('#mResume').addEventListener('click', () => { $('#menu').classList.add('off'); });
$('#mHow').addEventListener('click', () => { $('#menu').classList.add('off'); $('#how').classList.remove('off'); });
$('#howClose').addEventListener('click', () => { $('#how').classList.add('off'); });
$('#mSound').addEventListener('click', () => { A.setOn(!A.on); $('#mSound').innerHTML = '<b>聲音</b>：' + (A.on ? '開' : '關'); });
$('#mRestart').addEventListener('click', () => { $('#menu').classList.add('off'); startHunt(); });
$('#againBtn').addEventListener('click', () => { A.init(); A.knock(); startHunt(); });
$('#peekBtn').addEventListener('click', () => { $('#end').classList.add('peek'); S.peek = true; });
$('#peekBack').addEventListener('click', () => { $('#end').classList.remove('peek'); S.peek = false; });
$('#rotSkip').addEventListener('click', () => { S.portraitOK = true; checkRotate(); });
window.addEventListener('keydown', (e) => {
  if (e.key === '1') setTool('spear');
  else if (e.key === '2') setTool('fire');
  else if (e.key === ' ' || e.key === 'Enter') { if (S.phase === 'title') ignite(); else doWait(); e.preventDefault(); }
  else if (e.key === 'Escape') { $('#menu').classList.toggle('off'); $('#how').classList.add('off'); }
});
function checkRotate() {
  const portrait = S.cssH > S.cssW * 1.05 && Math.min(S.cssW, S.cssH) < 760;
  $('#rotate').classList.toggle('off', !(portrait && !S.portraitOK && S.phase !== 'title'));
}

// ---------- 開場：點燃火把 ----------
function ignite() {
  if (S.started) return;
  S.started = true;
  A.init();
  A.light();
  const t0 = performance.now();
  const ramp = () => {
    const k = (performance.now() - t0) / 1400;
    S.light = lerp(0.13, 1, smooth(clamp(k, 0, 1)));
    S.flash = Math.max(0, 0.35 * (1 - Math.abs(k - 0.25) * 4));
    if (k < 1) requestAnimationFrame(ramp); else { S.light = 1; S.flash = 0; }
  };
  ramp();
  $('#title').style.opacity = 0;
  $('#title').style.pointerEvents = 'none';
  setTimeout(() => { $('#title').classList.add('off'); startHuntFirst(); }, 1100);
}
function startHuntFirst() {
  // 標題畫面那一頭猛獁直接接著用，不重開
  S.phase = 'aim';
  S.run++; store.set('runs', S.run);
  $('#hud').classList.remove('hid');
  UI.tools(W); UI.wind(W, false); UI.turn(W); UI.busy(false);
  setTool('spear', true);
  UI.hint('elder', '老獵人說：冬天要來了。<b>部落要肉，也要皮。</b>', 4.2);
  UI.hint('aim', '在畫面上<b>按住、往後拉</b>，放手就擲出去。', 8);
  checkRotate();
}
$('#title').addEventListener('click', ignite);

// ---------- 主迴圈 ----------
function resize() {
  S.cssW = window.innerWidth; S.cssH = window.innerHeight;
  S.dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(2, Math.round(S.cssW * S.dpr * S.q)), ch = Math.max(2, Math.round(S.cssH * S.dpr * S.q));
  CV.width = cw; CV.height = ch;
  P.resize(Math.max(2, Math.round(cw * S.pq)), Math.max(2, Math.round(ch * S.pq))); GLR.resize(cw, ch);
  checkRotate();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!last) last = now;
  const rt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // 卡頓就降解析度（只降不升）
  S.perfAcc += rt; S.perfN++;
  if (S.perfAcc > 2) {
    const avg = S.perfAcc / S.perfN;
    if (avg > 0.028 && S.q > 0.62) { S.q = S.q > 0.9 ? 0.8 : 0.64; resize(); }
    S.perfAcc = 0; S.perfN = 0;
  }
  P.t += rt;
  P.boil = Math.floor(P.t * 9);
  let ts = 1;
  if (S.hitstop > 0) { S.hitstop -= rt; ts = 0.07; }
  else if (S.slowT > 0) { S.slowT -= rt; ts = S.slowK; }
  const sdt = rt * ts * (S.ff && S.phase === 'world' ? 3 : 1);
  switch (S.phase) {
    case 'aim': {
      const a = S.aim;
      if (a && a.dirty) { a.pred = W.predict(S.tool, a.ang, a.power); a.dirty = false; }
      break;
    }
    case 'flight':
      if (W.flightStep(sdt)) { S.phase = 'impact'; S.impactT = 0.45; }
      break;
    case 'impact':
      S.impactT -= sdt;
      if (W.over) toDying(); else if (S.impactT <= 0) startWorld();
      break;
    case 'world':
      W.step(sdt);
      S.worldT += sdt;
      if (W.over) toDying(); else if (S.worldT >= TURN_TIME) endWorld();
      break;
    case 'dying':
      W.step(sdt);
      S.dieT += rt;
      if (S.dieT > (W.mam.how === 'ice' ? 1.6 : 2.6)) toEnd();
      break;
    case 'end': {
      S.endT += rt;
      S.mural = smooth(clamp(S.endT / 1.6, 0, 1));
      if (S.endT > 0.4 && S.sprayed < 1) {
        const k = clamp((S.endT - 0.4) / 1.1, 0, 1);
        const want = Math.floor(k * 1500);
        if (S.sprayed === 0) A.spray();
        const n = want - FX.spray.length;
        if (n > 0) sprayHand(S.handAt.x, S.handAt.y, 62, n);
        if (k >= 1) S.sprayed = 1; else S.sprayed = 0.5;
      }
      break;
    }
  }
  W.anim(rt * ts);
  FX.update(rt * ts, W, { x0: cam.ox, x1: cam.ox + S.cssW / cam.z, y0: cam.oy, y1: cam.oy + S.cssH / cam.z });
  handleEvents();
  updateCam(rt);
  UI.hintTick(rt);
  const aiming = !!(S.aim && S.aim.active);
  if (aiming !== S.aimHide) { S.aimHide = aiming; $('#hint').classList.toggle('aimhide', aiming); }
  A.tick(rt, { wind: W.wind.now, fire: W.fireLevel(), tension: tension(), drums: S.phase !== 'title', vol: 1 });
  render();
  UI.labels(rt, W, toCss, aimLabel(), S.phase);
}

function boot() {
  P.init();
  UI.init();
  resize();
  if (!GLR.init(CV)) {
    const e = $('#err');
    e.classList.remove('off');
    e.textContent = '這台裝置的瀏覽器沒有開 WebGL，畫不出岩壁。換 Chrome 或 Safari 再試試看。';
    return;
  }
  const wallSeed = Math.floor(Math.random() * 1e6);
  GLR.makeWall(wallSeed, makeDecor(wallSeed));
  W = new World(((Date.now() * 7919) ^ Math.floor(Math.random() * 1e9)) >>> 0);
  setTool('spear', true);
  UI.tools(W); UI.wind(W, false); UI.turn(W);
  requestAnimationFrame(frame);
}
// 測試用
window.__lo = {
  get W() { return W; }, S, cam, start: () => { if (S.phase === 'title') ignite(); },
  newHunt: (seed) => { startHunt(); if (seed !== undefined) { W = new World(seed); UI.tools(W); UI.wind(W, false); UI.turn(W); } },
  aimAt(tool, ang, power) { setTool(tool, true); S.aim = { sx: 300, sy: 300, x: 300 - Math.cos(ang) * power * maxDrag(), y: 300 - Math.sin(ang) * power * maxDrag(), active: true, power, ang, dirty: true, id: -1 }; },
  throwNow() { if (S.aim) { S.aim.pred = W.predict(S.tool, S.aim.ang, S.aim.power); doThrow(); } },
  wait: doWait,
  findAim(tool, tx, wantMam) {
    let best = null;
    for (let a = -1.5; a <= -0.1; a += 0.03) for (let p = 0.05; p <= 1.0001; p += 0.015) {
      const r = W.predict(tool, a, p).res;
      if (!r) continue;
      if (wantMam) { if (r.type === 'mam') { const s = { vital: 0, body: 1, leg: 2, trunk: 2, head: 3, tusk: 9 }[r.zone]; if (!best || s < best.s) best = { a, p, s, r }; } }
      else if (r.type === 'ground') { const s = Math.abs(r.x - tx); if (!best || s < best.s) best = { a, p, s, r }; }
    }
    return best;
  },
};
boot();
