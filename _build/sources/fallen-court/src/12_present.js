// ============ 戰鬥演出：站位、事件播放、特效 ============
let BV = null; // 戰鬥畫面狀態
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms / (S.set.speed || 1))));
const SK_ANIM = { slash: 'atk', uppercut: 'up', slam: 'smash', dash: 'atk', wave: 'atk', nova: 'cast', skyfall: 'smash', bolt: 'shoot', hook: 'shoot', hookup: 'shoot', yank: 'shoot', zip: 'cast', volley: 'shoot', gather: 'shoot', bash: 'atk', quake: 'smash', ram: 'atk', mend: 'cast', ward: 'cast', gate: 'cast', stance: 'guard', firebomb: 'cast', floatbomb: 'cast', unison: 'cast' };
const FOE_ANIM = { bite: 'atk', pounce: 'atk', spit: 'shoot', acidrain: 'shoot', claw: 'atk', crush: 'smash', thrust: 'atk', sweep: 'smash', xbolt: 'shoot', pierce: 'shoot', beam: 'cast', zap: 'shoot', alarm: 'cast', grab: 'atk', wail: 'cast', whip: 'atk', fog: 'cast', hammer: 'atk', drag: 'atk', trip: 'shoot', cut: 'shoot', howl: 'cast', triple: 'atk', point: 'cast', whipcrack: 'cast', lash: 'atk', tide: 'cast', cityfall: 'smash', chainzap: 'cast', slamhook: 'smash', uphook: 'up', twinhook: 'atk', courtfall: 'smash', chainsweep: 'atk', anchordrop: 'cast', chainsmash: 'atk' };

function bvSetup(g, F) {
  const c = g.e, cz = tileH(c.x, c.y);
  BV = { units: {}, c: { x: c.x, y: c.y, z: cz }, g, texts: [], fx: [], sel: null, crack: 0, banner: null, scene: [], t: 0, flash: 0, cut: null, dark: 0, groundFx: [], kx: 1 };
  const hs = allHeroes(), HF = formation(hs.length, 0, 0, 0).hero;
  const ids = activeIds(), walkers = [Z.leader].concat(Z.followers);
  hs.forEach((u, i) => { const w = walkers.find(x => x.id === u.hero) || Z.leader; BV.units[u.id] = mkBV(u, u.hero, w.x, w.y, cz, c.x + HF[i].x, c.y + HF[i].y, false, 1); });
  // 敵人沿用探索時的站位
  const gu = g.units.slice(); for (const u of B.units) if (u.side === 'foe') { const k = gu.findIndex(x => x.type === u.type); const src = k >= 0 ? gu.splice(k, 1)[0] : { x: c.x + 2, y: c.y - 2 }; const v = BV.units[u.id] = mkBV(u, FOE[u.type].look, src.x, src.y, cz, src.x, src.y, true, FOE[u.type].scale || 1); v.ex = src.x; v.ey = src.y; }
  fitFormation(false);
  (B.scene || []).forEach((s, i) => { const p = (c.props || []).filter(q => q.k === s.k)[(B.scene.slice(0, i).filter(q => q.k === s.k)).length] || null; BV.scene.push({ k: s.k, x: p ? p.x : c.x, y: p ? p.y : c.y, z: cz, i }); });
  Z.battleCenter = { x: c.x, y: c.y };
  void ids;
}
function mkBV(u, look, x, y, z, hx, hy, flip, scale) { return { id: u.id, look, x, y, z, hx, hy, flip, scale, a: 'idle', t0: 0, dur: 0, loop: true, flash: 0, alpha: 1, lift: 0, liftT: 0, hp: u.hp, sh: u.shield, ph: Math.random() * 5, gone: false, tw: null, hold: null }; }
function layoutFoes(snap) {
  const c = BV.c, n = k => B.rows[k].length, F = formation(1, n('front'), n('back'), n('air'), BV.kx);
  for (const k of ['front', 'back', 'air']) B.rows[k].forEach((id, i) => { const v = BV.units[id]; if (!v) return; let p = F[k][i]; const u0 = U(id); if (u0 && u0.object) { if (!v.slot) v.slot = { i, f: n('front'), b: n('back'), a: n('air') }; p = formation(1, v.slot.f, v.slot.b, v.slot.a, BV.kx)[k][v.slot.i] || p; } v.hx = c.x + p.x; v.hy = c.y + p.y; v.air = k === 'air' && !B.airLow; if (snap) { v.x = v.hx; v.y = v.hy; } else tween(v, v.hx, v.hy, 260); });
}
function tween(v, x, y, ms, ez) { return new Promise(res => { v.tw = { x0: v.x, y0: v.y, x1: x, y1: y, t0: BV.t, dur: Math.max(.001, ms / 1000 / (S.set.speed || 1)), ez: ez || ease, res }; }); }
function anim(v, a, ms, hold) { v.a = a; v.t0 = BV.t; v.dur = ms / 1000 / (S.set.speed || 1); v.loop = false; v.hold = hold || null; }
function idle(v) { const u = U(v.id); v.loop = true; v.a = u && u.down ? 'down' : u && u.charging ? 'charge' : u && isHero(u) && (u.s.guard || u.s.riposte || u.s.oathdr) ? 'guard' : 'idle'; }
// 直拿時畫面窄，鏡頭是被寬度卡住的：把隊形左右收攏一點，人就能畫大一些。
// 只有收了真的變大才收（層主那種很高的場面是被高度卡住，收了只會擠）。開打時敵人會從探索的站位走進收攏後的位置。
function fitFormation(resized) {
  let tight = false;
  const set = k => {
    BV.kx = k; const hs = allHeroes(), HF = formation(hs.length, 0, 0, 0, k).hero;
    hs.forEach((u, i) => { const v = BV.units[u.id]; if (v) { v.hx = BV.c.x + HF[i].x; v.hy = BV.c.y + HF[i].y; } });
    layoutFoes(true); const f = camFit(); tight = f.tight; return f.z;
  };
  const z1 = set(1); if (VW < VH * .9) { const z2 = set(.84); if (z2 < z1 * 1.06) set(1); else if (tight && set(.78) < z2 * 1.04) set(.84); } // 再收一級（.78）只在要讓開收藏庫的 PZ 圓鈕、畫面更窄的時候才用
  if (resized) { for (const u of allHeroes()) { const v = BV.units[u.id]; if (v && !v.tw) { v.x = v.hx; v.y = v.hy; } } return; } // 打到一半轉了手機：站回新的位置
  if (BV.kx !== 1) for (const k in BV.units) { const v = BV.units[k]; if (v.ex != null) { v.x = v.ex; v.y = v.ey; } }
}
// 鏡頭要怎麼擺才把場上所有人框進來（只算，不動鏡頭）
function camFit() {
  const pts = Object.values(BV.units).filter(v => !v.gone);
  // 橫拿／電腦：指令在右邊，戰場往左讓
  const land = VW > VH * 1.15, panelW = land ? Math.min(VW * .46, 470) + 12 : 0, top = land ? 62 : 92, bot = land ? 86 : Math.min(330, VH * .40);
  // 收藏庫的 PZ 圓鈕如果壓在戰場那一段高度上，那一邊多讓 40px（不然點不到站在邊上的人）
  const hr = hubRect(), hubIn = hr && hr.y < VH - bot && hr.y + hr.h > top, sideL = 14 + (hubIn && !hr.right ? 40 : 0), sideR = 14 + (hubIn && hr.right && !land ? 40 : 0);
  // 頭上的血條、狀態、意圖、預覽不隨鏡頭縮放（敵人約 60px、自己人約 30px）。要用倍率換算回場景的尺寸，所以多跑兩輪讓它收斂
  let z = 1, mx = 0, my = 0;
  for (let pass = 0; pass < 3; pass++) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const v of pts) {
      const px = isoX(v.hx, v.hy), py = isoY(v.hx, v.hy, 0), u = B && U(v.id), over = pass ? (u && u.side === 'foe' ? 60 : 30) / z : 26, h = unitH(v.look) * .82 * v.scale + (v.air ? 60 : 0);
      x0 = Math.min(x0, px - 34 * v.scale); x1 = Math.max(x1, px + 34 * v.scale); y0 = Math.min(y0, py - h - over); y1 = Math.max(y1, py + 12);
    }
    const zw = (VW - panelW - sideL - sideR) / (x1 - x0), zh = (VH - top - bot) / (y1 - y0);
    z = clamp(Math.min(zw, zh), .62, land ? 2.1 : 1.75); mx = (x0 + x1) / 2 + (panelW + sideR - sideL) / 2 / z; my = (y0 + y1) / 2;
  }
  return { z, mx, my, cy: (top + (VH - bot)) / 2 / VH, tight: sideL + sideR > 28 };
}
function battleCam() {
  const f = camFit(), c = BV.c;
  // 換回世界座標。camFit 的 py 是用高度 0 算的，鏡頭和所有人又都站在戰場的高度 c.z，兩邊抵銷，所以這裡不用再加高度
  Cam.tx = f.my / TH + f.mx / TW; Cam.ty = f.my / TH - f.mx / TW; Cam.tz = c.z; Cam.tzoom = f.z; Cam.tcy = f.cy;
}
// ---------- 特效 ----------
const upos = v => [v.x, v.y, v.z + v.lift];
function fxText(v, s, col, big) { BV.texts.push({ x: v.x, y: v.y, z: v.z + v.lift + unitH(v.look) * v.scale / 46, s, col: col || '#fff', big: !!big, t0: BV.t, dx: (Math.random() - .5) * 26, life: big ? 1.25 : 1.0 }); }
function fxBanner(s, sub, col) { BV.banner = { s, sub, col: col || '#ffcf5a', t0: BV.t }; }
function fxSparks(x, y, z, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (sp || 3) * (.4 + Math.random()); part({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 1 + Math.random() * 3.5, grav: 9, life: .35 + Math.random() * .35, size: 1.4 + Math.random() * 1.6, col, k: 'streak' }); } }
function fxRing(x, y, z, col, size, life, lw) { part({ x, y, z, k: 'ring', col, size: 6, grow: size, life: life || .45, lw: lw || 4 }); }
function fxGlow(x, y, z, col, size, life) { part({ x, y, z, k: 'glow', col, size: size || 40, life: life || .3, grow: 1.5 }); }
function fxShards(x, y, z, n, up) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1 + Math.random() * 3; part({ x, y, z: z + Math.random() * .8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: up ? 1 + Math.random() * 3 : 2 + Math.random() * 3, grav: up ? -1.5 : 7, life: up ? 1.3 : .8, size: 2.5 + Math.random() * 3, col: GLASS[i % 5], k: 'shard', spin: (Math.random() - .5) * 14, add: false }); } }
function fxSlashArc(v, tgt, col, big) { BV.fx.push({ k: 'arc', x: tgt.x, y: tgt.y, z: tgt.z + tgt.lift + .9 * tgt.scale, t0: BV.t, life: .22, col: col || '#eaf4ff', big, flip: v.x > tgt.x || v.flip }); }
function fxBeam(a, b, col, w, life) { BV.fx.push({ k: 'beam', a: [a.x, a.y, a.z + a.lift + 1.1 * a.scale], b: [b.x, b.y, b.z + b.lift + .8 * b.scale], t0: BV.t, life: life || .16, col: col || '#fff', w: w || 3 }); }
function fxCrack(x, y, z) { BV.groundFx.push({ x, y, z, t0: BV.t, life: 1.6, seed: Math.random() * 99 }); }
function fxHit(src, v, e) {
  const [x, y, z] = upos(v), zc = z + .8 * v.scale, heavy = e.dmg > (U(v.id).hpMax * .22) || e.crit || e.slam;
  v.flash = 1; anim(v, 'hit', 260); v.hitDir = src ? Math.sign(v.x - src.x || 1) : 1;
  fxSparks(x, y, zc, heavy ? 16 : 8, e.kind === 'dot' ? '#ff9050' : e.crit ? '#ffe9a8' : '#ffffff', heavy ? 4.5 : 3);
  fxGlow(x, y, zc, e.kind === 'dot' ? '#ff7030' : e.crit ? '#ffcf5a' : '#cfe6ff', heavy ? 62 : 38, .22);
  if (heavy) { fxRing(x, y, z + .1, e.crit ? '#ffcf5a' : '#ffffff', 22, .4, 4); shake(e.slam ? 13 : 8); } else shake(3.5);
  if (e.crit) { BV.crack = BV.t; fxShards(x, y, zc, 10); sfx('crit'); }
  fxText(v, String(e.dmg), e.kind === 'dot' ? '#ff9a50' : e.crit ? '#ffcf5a' : isHero(U(v.id)) ? '#ff8a7a' : '#ffffff', e.crit || e.slam);
  sfx(e.kind === 'dot' ? 'burn' : e.slam ? 'slam' : heavy ? 'hitHeavy' : 'hit');
  if (S.set.flash && (e.crit || e.slam)) BV.flash = .5;
}
// ---------- 事件播放 ----------
async function play(evs) {
  let actor = null, away = false, lastHitAt = 0;
  const goHome = async () => { if (actor && away) { const v = actor; away = false; await tween(v, v.hx, v.hy, 190, easeOut); idle(v); } actor = null; };
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i], nx = evs[i + 1], v = e.u != null ? BV.units[e.u] : null;
    try { switch (e.t) {
      case 'turn': { uiBattleTurn(e.u); break; }
      case 'act': {
        await goHome(); const u = U(e.u), sk = SK[e.sk]; actor = v;
        if (e.link) { const pv = BV.units[e.prev]; fxBanner(e.perfect ? '完美連攜' : '連攜', pv ? U(pv.id).name + ' × ' + u.name : '', e.perfect ? '#ffcf5a' : '#bfe8ff'); sfx(e.perfect ? 'perfect' : 'link'); if (pv) fxBeam(pv, v, e.perfect ? '#ffcf5a' : '#bfe8ff', 2, .3); await sleep(e.perfect ? 340 : 200); }
        if (e.unison) { await cutIn(e.u, '庭隕', '合體技', true); }
        else if (e.ult) { await cutIn(e.u, sk.n, '奧義'); }
        else uiCallout(e.u, sk.n);
        const tv = e.tgt >= 0 ? BV.units[e.tgt] : e.scene >= 0 ? BV.scene[e.scene] : null, an = SK_ANIM[sk.fx] || 'cast';
        if (sk.reach === 'melee' && tv && tv !== v) { away = true; const dir = Math.sign(tv.x - tv.y - (v.x - v.y)) || 1, off = scr2grid(-1.15 * (tv.scale || 1) * dir, .2); await tween(v, tv.x + off.x, tv.y + off.y, 170, easeOut); }
        anim(v, an, an === 'smash' ? 560 : an === 'shoot' ? 380 : an === 'cast' ? 460 : 480, true); sfx(an === 'shoot' ? (sk.fx === 'bolt' || sk.fx === 'volley' ? 'bolt' : 'hook') : an === 'cast' ? 'cast' : 'swing');
        await sleep(an === 'smash' ? 300 : an === 'shoot' ? 150 : an === 'cast' ? 230 : 235);
        if (tv && an === 'shoot') fxBeam(v, tv.id != null ? tv : { x: tv.x, y: tv.y, z: tv.z, lift: 0, scale: 1 }, sk.fx === 'bolt' || sk.fx === 'volley' ? '#fff3c8' : '#d0a860', sk.fx === 'bolt' ? 2.5 : 3.5, .2);
        if (sk.fx === 'wave' && tv) fxBeam(v, tv, '#8fd0ff', 7, .25);
        if (sk.fx === 'nova' || sk.fx === 'floatbomb') { fxRing(BV.c.x + 1, BV.c.y - 1, BV.c.z + .1, '#8fd0ff', 60, .6, 5); sfx('lift'); }
        if (sk.fx === 'firebomb') { for (const f of realFoes()) { const fv = BV.units[f.id]; fxGlow(fv.x, fv.y, fv.z + .5, '#ff7030', 70, .4); } sfx('explode'); shake(8); }
        if (sk.fx === 'skyfall') { v.lift = 0; BV.dark = .5; }
        break;
      }
      case 'foeact': {
        await goHome(); const u = U(e.u), mv = moveOf(u, e.mv); actor = v; uiCallout(e.u, mv.n, e.release);
        const an = FOE_ANIM[mv.fx] || 'atk', tv = e.tgt.length === 1 ? BV.units[e.tgt[0]] : null;
        if (mv.melee && tv) { away = true; const off = scr2grid(1.15, .15); await tween(v, tv.x + off.x, tv.y + off.y, 190, easeOut); }
        else if (mv.melee && e.tgt.length > 1) { away = true; const off = scr2grid(-.6, 0); await tween(v, BV.c.x + off.x, BV.c.y + off.y, 220, easeOut); }
        anim(v, an, an === 'smash' ? 600 : 460, true); sfx(an === 'shoot' ? 'spit' : an === 'cast' ? 'cast' : 'swingFoe');
        await sleep(an === 'smash' ? 330 : 230);
        if (an === 'shoot' || mv.fx === 'beam' || mv.fx === 'zap') for (const id of e.tgt) fxBeam(v, BV.units[id], mv.fx === 'spit' || mv.fx === 'acidrain' ? '#8ff0a0' : mv.fx === 'beam' ? '#ffe08a' : '#cfe6ff', 3, .2);
        if (an === 'smash' && e.tgt.length > 1) { shake(14); fxRing(BV.c.x - 1.4, BV.c.y + 1.4, BV.c.z + .1, '#ffffff', 80, .5, 6); sfx('slam'); }
        break;
      }
      case 'charge': { await goHome(); const mv = moveOf(U(e.u), e.mv); uiCallout(e.u, mv.n + '・蓄力', false, true); v.loop = true; v.a = 'charge'; sfx('charge'); fxRing(v.x, v.y, v.z + .1, '#ff6a5a', 30, .6, 4); await sleep(480); break; }
      case 'hit': {
        const sv = e.src >= 0 ? BV.units[e.src] : null, tv = BV.units[e.tgt]; if (!tv) break;
        if (e.kind === 'counter' && sv) { anim(sv, 'atk', 300, true); await sleep(120); }
        if (e.kind === 'follow' && sv) { anim(sv, SK_ANIM[SK[HERO[U(sv.id).hero].basic].fx] || 'atk', 300); fxBeam(sv, tv, '#b58cff', 2.5, .2); }
        if (sv && sv !== tv && (e.kind === 'skill' || e.kind === 'counter' || e.kind === 'foe') && Math.hypot(sv.x - tv.x, sv.y - tv.y) < 2.2) fxSlashArc(sv, tv, e.crit ? '#ffe9a8' : isHero(U(sv.id)) ? '#eaf4ff' : '#ffb0a0', e.slam || e.crit);
        tv.hp = e.hp; tv.sh = e.sh; fxHit(sv, tv, e); uiBattleHp();
        const more = nx && nx.t === 'hit' && nx.kind === e.kind; await sleep(more ? 55 : e.crit || e.slam ? 300 : 190);
        if (e.crit || e.slam) await hitStop(70);
        break;
      }
      case 'slam': { const tv = BV.units[e.tgt]; if (tv) { const [x, y, z] = [tv.x, tv.y, tv.z]; tv.lift = 0; tv.liftT = 0; fxCrack(x, y, z); fxRing(x, y, z + .05, '#ffcf5a', 70, .55, 6); fxRing(x, y, z + .05, '#ffffff', 44, .4, 3); for (let k = 0; k < 14; k++) part({ x: x + (Math.random() - .5), y: y + (Math.random() - .5), z: z + 3 + Math.random() * 2, vz: -16, life: .22, size: 2.2, col: '#ffffff', k: 'streak' }); fxSparks(x, y, z + .2, 22, '#ffe9a8', 6); shake(16); fxText(tv, '墜！', '#ffcf5a', true); } await sleep(160); break; }
      case 'launch': { if (v) { v.liftT = 1.25; fxText(v, '浮空', '#8fd0ff', true); fxRing(v.x, v.y, v.z + .05, '#8fd0ff', 34, .5, 4); for (let k = 0; k < 12; k++) part({ x: v.x + (Math.random() - .5) * .8, y: v.y + (Math.random() - .5) * .8, z: v.z + Math.random() * .5, vz: 2.5 + Math.random() * 2.5, life: .8, size: 2.2, col: '#bfe8ff', k: 'glow' }); sfx('lift'); v.loop = true; v.a = 'aloft'; uiBattleRefresh(); } await sleep(240); break; }
      case 'lift': { if (v) { fxText(v, `浮力 ${e.n}/${e.w}`, '#8fd0ff'); for (let k = 0; k < 5; k++) part({ x: v.x, y: v.y, z: v.z + .4, vz: 2 + Math.random() * 2, vx: (Math.random() - .5), vy: (Math.random() - .5), life: .6, size: 2, col: '#bfe8ff', k: 'glow' }); } break; }
      case 'land': { if (v) { v.liftT = 0; if (!e.hard) { await sleep(160); idle(v); } } break; }
      case 'status': { if (v && e.on) { const S0 = STATUS[e.k]; if (S0 && ['stagger', 'mark', 'burn', 'rust', 'slow', 'lit', 'exposed', 'isolate'].includes(e.k) && !(e.k === 'burn' && e.n > 1 && evs[i - 1] && evs[i - 1].t === 'hit' && evs[i - 1].kind === 'dot')) { fxText(v, S0.n + (e.n > 1 ? ' ' + e.n : ''), S0.c); if (e.k === 'stagger') { sfx('stagger'); fxSparks(v.x, v.y, v.z + 1, 8, '#ffcf5a', 3); } if (e.k === 'mark') sfx('mark'); } } if (v) idleSoon(v); uiBattleRefresh(); break; }
      case 'interrupt': { if (v) { fxText(v, '打斷！', '#ffcf5a', true); fxBanner('打斷', U(e.u).name + ' 的蓄力被打斷了', '#ffcf5a'); sfx('interrupt'); shake(10); idle(v); } await sleep(260); break; }
      case 'chip': { if (v) { fxText(v, '穩固 −' + e.n, '#ffd9a0'); sfx('chip'); } break; }
      case 'delay': { if (v && e.n >= 10) fxText(v, '延後 ' + Math.round(e.n), '#c0c8e0'); uiBattleOrder(); break; }
      case 'adv': { if (v && e.n >= 6) fxText(v, '提前 ' + Math.round(e.n), '#a8f0c8'); uiBattleOrder(); break; }
      case 'mom': { uiBattleHp(); break; }
      case 'reso': { uiBattleReso(); if (e.n > 0) sfx('reso'); break; }
      case 'shield': { if (v) { v.sh = e.v; fxText(v, '護盾 +' + e.n, '#f3d98a'); fxRing(v.x, v.y, v.z + .8, '#f3d98a', 26, .4, 3); sfx('shield'); uiBattleHp(); } break; }
      case 'heal': { if (v) { v.hp = e.hp; if (e.n > 0) { fxText(v, '+' + e.n, '#8ff0a0'); for (let k = 0; k < 8; k++) part({ x: v.x + (Math.random() - .5) * .6, y: v.y + (Math.random() - .5) * .6, z: v.z + .3, vz: 1.6 + Math.random() * 1.6, life: .8, size: 2, col: '#8ff0a0', k: 'glow' }); sfx('heal'); } uiBattleHp(); } await sleep(120); break; }
      case 'revive': { if (v) { v.hp = e.hp; fxText(v, '站起來了', '#8ff0a0', true); idle(v); sfx('heal'); uiBattleHp(); } await sleep(240); break; }
      case 'down': { if (v) { v.loop = true; v.a = 'down'; fxText(v, '倒地', '#ff6a5a', true); sfx('down'); shake(8); uiBattleHp(); } await sleep(420); break; }
      case 'death': { if (v) { await sleep(90); v.gone = true; fxShards(v.x, v.y, v.z + .4, 16, true); fxGlow(v.x, v.y, v.z + .8, '#bfe8ff', 60, .4); sfx('death'); layoutFoes(false); uiBattleRefresh(); } await sleep(200); break; }
      case 'ledge': { if (v) { fxText(v, '打落深淵', '#8fd0ff', true); fxBanner('打落深淵', '', '#8fd0ff'); } await sleep(260); break; }
      case 'burst': { if (v) { fxRing(v.x, v.y, v.z + .4, '#9fe3ff', 60, .6, 5); sfx('lift'); } break; }
      case 'row': { layoutFoes(false); await sleep(200); break; }
      case 'summon': { const u = U(e.u); BV.units[e.u] = mkBV(u, FOE[u.type].look, BV.c.x + 5, BV.c.y - 5, BV.c.z, 0, 0, true, FOE[u.type].scale || 1); layoutFoes(false); fxText(BV.units[e.u], '增援', '#ff6a5a'); sfx('summon'); await sleep(320); uiBattleRefresh(); break; }
      case 'evade': { if (v) { fxText(v, '閃過', '#b58cff', true); sfx('swing'); const o = scr2grid(-.8, -.6); tween(v, v.hx + o.x, v.hy + o.y, 120, easeOut).then(() => tween(v, v.hx, v.hy, 160)); } await sleep(200); break; }
      case 'cover': { const fv = BV.units[e.for]; if (v && fv) { fxText(v, '代受', '#f3d98a', true); sfx('shield'); const o = scr2grid(.7, 0); away = false; await tween(v, fv.x + o.x, fv.y + o.y, 130, easeOut); v.coverBack = 1; } break; }
      case 'counter': { if (v) fxText(v, '反擊', '#e8e2d0', true); break; }
      case 'follow': { if (v) fxText(v, '補刀', '#b58cff'); break; }
      case 'scene': { if (e.use) { const s = BV.scene[e.idx]; if (s) { if (s.k === 'barrel') { fxGlow(s.x, s.y, s.z + .5, '#ff7030', 120, .5); fxRing(s.x, s.y, s.z + .1, '#ffb050', 70, .5, 6); fxSparks(s.x, s.y, s.z + .5, 26, '#ffb050', 6); sfx('explode'); shake(14); const tt = Gfx.tiles.find(q => q.x === Math.round(s.x) && q.y === Math.round(s.y)); if (tt) tt.hide = true; } if (s.k === 'cluster') { fxRing(s.x, s.y, s.z + .1, '#8fd0ff', 90, .7, 6); fxGlow(s.x, s.y, s.z + 1, '#9fe3ff', 120, .5); sfx('lift'); } } await sleep(200); } uiBattleRefresh(); break; }
      case 'hangdrop': { const s = BV.scene.find(q => q.i === e.idx && q.k === 'hang' && !q.dropped) || BV.scene.find(q => q.k === 'hang' && !q.dropped); if (s) { s.dropped = 1; s.fall = BV.t; const pv = e.onto != null && BV.units[e.onto]; if (pv) { s.x0 = s.x; s.y0 = s.y; s.tx = pv.x; s.ty = pv.y; } } sfx('chain'); await sleep(260); sfx('slam'); shake(18); const cxp = e.side === 'foe' ? scr2grid(1.3, 0) : scr2grid(-2.5, 0); fxRing(BV.c.x + cxp.x, BV.c.y + cxp.y, BV.c.z + .1, '#ffffff', 90, .6, 7); fxSparks(BV.c.x + cxp.x, BV.c.y + cxp.y, BV.c.z + .3, 30, '#cfc9bb', 6); break; }
      case 'unison': { BV.dark = .65; await sleep(200); for (const f of realFoes()) { const fv = BV.units[f.id]; if (fv) { fxBeam(BV.units[e.by], fv, '#d0a860', 3, .3); } } sfx('hook'); await sleep(260); sfx('lift'); shake(10); await sleep(300); sfx('slam'); shake(22); fxRing(BV.c.x + 1.4, BV.c.y - 1.4, BV.c.z + .1, '#ffcf5a', 140, .8, 8); BV.flash = .9; break; }
      case 'phase': { fxBanner('斷鏈', '牠把自己從錨上扯了下來', '#ff6a5a'); shake(20); sfx('slam'); if (v) v.phase = 2; await sleep(900); break; }
      case 'anchor': { fxBanner('錨蔭 ' + e.n, '砸下來的錨可以躲', '#f3d98a'); await sleep(300); uiBattleRefresh(); break; }
      case 'text': { if (e.big) { fxBanner(e.s, '', e.c); await sleep(300); } else if (v) fxText(v, e.s, e.c); break; }
    } } catch (err) { console.error('battle fx ' + e.t, err); }
    void lastHitAt;
  }
  await goHome();
  for (const k in BV.units) { const v = BV.units[k]; if (v.coverBack) { v.coverBack = 0; tween(v, v.hx, v.hy, 200); } if (!v.gone) { v.hold = null; idle2(v); } }
  BV.dark = 0; uiBattleRefresh();
}
function idleSoon(v) { if (v.loop) idle2(v); }
function idle2(v) { const u = U(v.id); if (!u) return; if (u.s.aloft && !hasTrait(u, 'hover')) { v.a = 'aloft'; v.liftT = 1.25; } else { v.liftT = v.air ? 0 : 0; idle(v); } }
function hitStop(ms) { BV.stop = BV.t; return sleep(ms); }
async function cutIn(uid, name, kind, all) { BV.cut = { uid, name, kind, t0: BV.t, all }; BV.dark = .6; sfx('ult'); await sleep(820); BV.cut = null; }

// ---------- 每格更新與繪製 ----------
function bvUpdate(dt) {
  if (!BV) return; BV.t += dt;
  for (const k in BV.units) {
    const v = BV.units[k];
    if (v.tw) { const q = clamp((BV.t - v.tw.t0) / v.tw.dur, 0, 1), e = v.tw.ez(q); v.x = lerp(v.tw.x0, v.tw.x1, e); v.y = lerp(v.tw.y0, v.tw.y1, e); if (q >= 1) { const r = v.tw.res; v.tw = null; r(); } }
    if (!v.loop && BV.t - v.t0 > v.dur && !v.hold) idle2(v); // hold＝停在最後一格，等這一手演完
    v.flash = Math.max(0, v.flash - dt * 5);
    const lt = v.air ? 1.5 : v.liftT; v.lift += (lt - v.lift) * Math.min(1, dt * (lt > v.lift ? 9 : 16));
    if (v.gone) v.alpha = Math.max(0, v.alpha - dt * 3.5);
  }
  BV.flash = Math.max(0, BV.flash - dt * 4);
  for (let i = BV.texts.length - 1; i >= 0; i--) if (BV.t - BV.texts[i].t0 > BV.texts[i].life) BV.texts.splice(i, 1);
  for (let i = BV.fx.length - 1; i >= 0; i--) if (BV.t - BV.fx[i].t0 > BV.fx[i].life) BV.fx.splice(i, 1);
  for (let i = BV.groundFx.length - 1; i >= 0; i--) if (BV.t - BV.groundFx[i].t0 > BV.groundFx[i].life) BV.groundFx.splice(i, 1);
}
function bvCollect(t) {
  const units = [], decals = [], glow = [], sel = BV.sel;
  for (const k in BV.units) {
    const v = BV.units[k]; if (v.alpha <= 0) continue; const u = U(v.id);
    const p = v.loop ? 0 : clamp((BV.t - v.t0) / v.dur, 0, 1), P = { t: t + v.ph, a: v.a, p, phase: u.phase, reforged: !!G.flags.reforged };
    const isTgt = sel && sel.targets && sel.targets.includes(v.id), isPick = sel && sel.pick === v.id, cur = B.cur === v.id;
    units.push({ x: v.x, y: v.y, z: v.z, bias: v.tw ? .2 : 0, draw(g, sx, sy, kz) {
      const sc = v.scale, ly = v.lift * LH * 2 * kz;
      g.globalAlpha = v.alpha * .4 * (1 - Math.min(.6, v.lift * .25)); g.fillStyle = '#000'; g.beginPath(); g.ellipse(sx, sy, 19 * kz * sc * (1 - v.lift * .12), 7 * kz * sc * (1 - v.lift * .12), 0, 0, TAU); g.fill(); g.globalAlpha = v.alpha;
      if (cur && isHero(u)) { g.strokeStyle = HERO[u.hero].col; g.lineWidth = 2.4 * kz; g.beginPath(); g.ellipse(sx, sy, 24 * kz, 9.5 * kz, 0, 0, TAU); g.stroke(); }
      if (isTgt) { const pu = .5 + .5 * Math.sin(t * 7); g.strokeStyle = isPick ? '#ffcf5a' : `rgba(255,255,255,${.5 + pu * .4})`; g.lineWidth = (isPick ? 3.4 : 2.2) * kz; g.setLineDash(isPick ? [] : [7 * kz, 5 * kz]); g.beginPath(); g.ellipse(sx, sy, (26 + pu * 3) * kz * sc, (10.5 + pu * 1.2) * kz * sc, 0, 0, TAU); g.stroke(); g.setLineDash([]); }
      drawUnitAt(g, v.look, sx, sy - ly, kz, { flip: v.flip, scale: sc, P, flash: v.flash > .05 ? v.flash * .85 : 0, tint: !v.flash && u.s.stagger ? '#ffcf5a' : !v.flash && FOE[u.type] && FOE[u.type].tint ? FOE[u.type].tint : null, tintA: u.s.stagger ? .07 + .09 * (.5 + .5 * Math.sin(BV.t * 7 + v.ph)) : .3 });
      g.globalAlpha = 1;
    } });
    if (u.s.burn > 0 && !v.gone && Math.random() < .25) part({ x: v.x + (Math.random() - .5) * .5, y: v.y + (Math.random() - .5) * .5, z: v.z + v.lift + .3 + Math.random() * 1.2, vz: 1.5 + Math.random(), life: .5, size: 1.6, col: '#ff8a3c', k: 'ember' });
    if (u.s.aloft && !v.gone && Math.random() < .2) part({ x: v.x + (Math.random() - .5) * .7, y: v.y + (Math.random() - .5) * .7, z: v.z + .1, vz: 2 + Math.random() * 2, life: .6, size: 1.6, col: '#bfe8ff', k: 'glow' });
  }
  // 地利
  for (const s of BV.scene) {
    const st = B.scene[s.i], S0 = SCENE[s.k], can = sel && sel.scene && sel.scene.includes(s.i), pick = sel && sel.pickScene === s.i;
    if (s.k === 'hang') { const fall = s.fall ? Math.min(1, (BV.t - s.fall) / .26) : 0; if (fall < 1 || st.used) { const up = !(st.used && !s.fall) && fall < .5; if (up) decals.push({ x: s.x, y: s.y, z: s.z, draw(g, sx, sy, kz) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(sx, sy, 30 * kz, 11 * kz, 0, 0, TAU); g.fill(); } }); if (s.tx != null) { const q = easeIn(fall); s.x = lerp(s.x0, s.tx, q); s.y = lerp(s.y0, s.ty, q); } units.push({ x: s.x, y: s.y, z: s.z, bias: up ? 9 : .3, draw(g, sx, sy, kz) { const hy = st.used && !s.fall ? 0 : (1 - easeIn(fall)) * 150 * kz; g.save(); g.translate(sx, sy - hy); if (hy > 2) { g.strokeStyle = U_INK; g.lineWidth = 5 * kz; g.beginPath(); g.moveTo(0, -46 * kz); g.lineTo(0, -900); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 2.2 * kz; g.setLineDash([6 * kz, 4 * kz]); g.stroke(); g.setLineDash([]); } g.scale(kz, kz); uFill(g, [-34, -8, -26, -40, -4, -52, 22, -44, 36, -16, 20, 4, -18, 6], '#5a3a2c'); uFill(g, [-26, -40, -4, -52, 2, -22, -20, -14], '#7a4a36', 1.6); uFill(g, [2, -22, 22, -44, 36, -16, 20, 4], '#4a2e24', 1.6); g.restore(); if (can) sceneMark(g, sx, sy - hy - 30 * kz, kz, t, pick); } }); } }
    else if (!S0.passive) { if (can) decals.push({ x: s.x, y: s.y, z: s.z, draw(g, sx, sy, kz) { sceneMark(g, sx, sy - 70 * kz, kz, t, pick); } }); if (s.k === 'cluster' && st.used) glow.push(() => { }); }
  }
  // 地面裂紋（金繼）
  for (const c of BV.groundFx) decals.push({ x: c.x, y: c.y, z: c.z, draw(g, sx, sy, kz) { const a = 1 - (BV.t - c.t0) / c.life, rr = mulberry32(c.seed * 1000 | 0); g.save(); g.translate(sx, sy); g.scale(1, .5); g.strokeStyle = `rgba(255,207,90,${a})`; g.lineWidth = 2.4 * kz; g.lineCap = 'round'; for (let i = 0; i < 7; i++) { let ang = i / 7 * TAU + rr() * .5, r = 0, x = 0, y = 0; g.beginPath(); g.moveTo(0, 0); for (let j = 0; j < 4; j++) { r += (10 + rr() * 14) * kz; ang += (rr() - .5) * .7; x = Math.cos(ang) * r; y = Math.sin(ang) * r; g.lineTo(x, y); } g.stroke(); } g.restore(); } });
  Gfx.bunits = units; Gfx.bdecals = decals; Gfx.bglow = glow;
  const c = BV.c; Gfx.dynLights = [{ x: c.x - 1.4, y: c.y + 1.4, c: '#ffeeda', r: 8.5, z: 2, noGlow: true, i: .62 }, { x: c.x + 1.8, y: c.y - 1.8, c: '#dfe8ff', r: 8.5, z: 2, noGlow: true, i: .55 }];
}
function sceneMark(g, sx, sy, kz, t, pick) { const b = Math.sin(t * 5) * 4 * kz; g.fillStyle = pick ? '#ffcf5a' : '#ffffff'; g.strokeStyle = U_INK; g.lineWidth = 2 * kz; g.beginPath(); g.moveTo(sx, sy + 12 * kz + b); g.lineTo(sx - 9 * kz, sy + b); g.lineTo(sx + 9 * kz, sy + b); g.closePath(); g.fill(); g.stroke(); }
// 畫在光照之後的東西：血條、狀態、意圖、數字、特效
function bvOverlay(g, kz, t) {
  if (!BV) return;
  if (BV.dark > 0) { g.fillStyle = `rgba(4,5,12,${BV.dark * .55})`; g.fillRect(0, 0, VW, VH); }
  // 斬擊弧與光束
  for (const f of BV.fx) {
    const q = (BV.t - f.t0) / f.life;
    if (f.k === 'arc') { const [sx, sy] = w2s(f.x, f.y, f.z), r = (f.big ? 50 : 36) * kz; g.save(); g.translate(sx, sy); g.scale(f.flip ? -1 : 1, 1); g.rotate(-.9 + q * .5); g.globalAlpha = 1 - q; g.strokeStyle = f.col; g.lineCap = 'round'; g.lineWidth = (f.big ? 11 : 7) * kz * (1 - q * .6); g.beginPath(); g.arc(0, 0, r, -1.1 + q * 1.2, .9 + q * 1.5); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 2.4 * kz; g.beginPath(); g.arc(0, 0, r, -.6 + q * 1.4, .8 + q * 1.5); g.stroke(); g.restore(); g.globalAlpha = 1; }
    else if (f.k === 'beam') { const a = w2s(f.a[0], f.a[1], f.a[2]), b = w2s(f.b[0], f.b[1], f.b[2]), k0 = Math.min(1, q * 3), k1 = Math.max(0, q * 1.6 - .6); g.globalAlpha = 1 - q * .5; g.strokeStyle = f.col; g.lineWidth = f.w * kz; g.lineCap = 'round'; g.beginPath(); g.moveTo(lerp(a[0], b[0], k1), lerp(a[1], b[1], k1)); g.lineTo(lerp(a[0], b[0], k0), lerp(a[1], b[1], k0)); g.stroke(); g.globalAlpha = 1; }
  }
  const sel = BV.sel, uiTop = VW > VH * 1.15 ? 62 : 92; // 上方順序條與共鳴佔掉的高度
  const plates = [], blocks = [], SB = S.sideRect && VW <= VH * 1.15 ? S.sideRect : null; // 直拿時右上角那排按鈕壓在戰場上：牌子要讓開
  if (SB) blocks.push({ id: -1, sx: (SB.left + SB.right) / 2, y: (SB.top + SB.bottom) / 2, w: SB.right - SB.left + 4, hh: (SB.bottom - SB.top) / 2 });
  for (const k in BV.units) {
    const v = BV.units[k], u = U(v.id); if (v.gone || !u) continue;
    const [sx, sy0] = w2s(v.x, v.y, v.z + v.lift), top = sy0 - (unitH(v.look) * .82 * v.scale + 10) * kz;
    if (u.side === 'foe') {
      const w = (u.boss ? 120 : u.elite ? 84 : 52) * Math.min(1.25, kz), h = 6, x = sx - w / 2, y = Math.max(top - 4, uiTop + (statusCount(u) ? 62 : 46));
      g.fillStyle = 'rgba(8,9,14,.85)'; g.fillRect(x - 1.5, y - 1.5, w + 3, h + 3); g.fillStyle = '#3a2428'; g.fillRect(x, y, w, h);
      const pv = sel && sel.preview && sel.preview.units[v.id], hpn = v.hp / u.hpMax;
      g.fillStyle = u.object ? '#9aa6c8' : '#e2584a'; g.fillRect(x, y, w * clamp(hpn, 0, 1), h);
      if (pv && pv.loss > 0) { const a = clamp((v.hp - pv.loss) / u.hpMax, 0, 1); g.fillStyle = `rgba(255,255,255,${.55 + .35 * Math.sin(t * 9)})`; g.fillRect(x + w * a, y, w * (hpn - a), h); }
      if (v.sh > 0) { g.fillStyle = '#f3d98a'; g.fillRect(x, y - 3, w * clamp(v.sh / u.hpMax, 0, 1), 2); }
      drawStatusRow(g, u, sx, y - 13, 1);
      const P = intentPlate(g, u), sc0 = statusCount(u); plates.push({ u, v, sx, x: sx, y: y - (sc0 ? 30 : 14), w: P ? P.w : 0, P, pv: pv && (pv.loss > 0 || pv.aloft !== u.s.aloft) ? pv : null });
      blocks.push({ id: u.id, sx, y: sc0 ? y - 6.5 : y + 3, w: Math.max(w, sc0 * 17), hh: sc0 ? 14.5 : 5 }); // 這個敵人的血條＋狀態列：別人的意圖牌不要蓋上來
    } else { const y = top - 2; drawStatusRow(g, u, sx, y, 1); const w = 44, hpn = clamp(v.hp / u.hpMax, 0, 1); g.fillStyle = 'rgba(8,9,14,.8)'; g.fillRect(sx - w / 2 - 1, y + 8, w + 2, 6); g.fillStyle = hpn < .35 ? '#e2584a' : '#7fd69a'; g.fillRect(sx - w / 2, y + 9, w * hpn, 4); if (v.sh > 0) { g.fillStyle = '#f3d98a'; g.fillRect(sx - w / 2, y + 6.5, w * clamp(v.sh / u.hpMax, 0, 1), 2); } }
  }
  // 意圖牌：兩個敵人站得近又一樣高，牌會互相蓋住。由下往上排，撞到的往上疊一層
  // 找位置：先原地，不行就往左右挪一點，再不行才往上疊（挪得離主人越近越好，才看得出是誰的）
  plates.sort((a, b) => b.y - a.y); const placed = [], TRY = [[0, 0], [-24, 0], [24, 0], [-40, 0], [40, 0], [0, -21], [-24, -21], [24, -21], [0, -42], [0, -63]];
  for (const p of plates) {
    if (p.P) {
      const hit = (x, y) => placed.some(q => Math.abs(q.sx - x) < (q.w + p.w) / 2 + 3 && Math.abs(q.y - y) < 20) || blocks.some(q => q.id !== p.u.id && Math.abs(q.sx - x) < (q.w + p.w) / 2 + 2 && Math.abs(q.y - y) < q.hh + 10);
      const y0 = p.y; for (const [ox, oy] of TRY) { const x = clamp(p.sx + ox, p.w / 2 + 4, VW - p.w / 2 - 4); if (!hit(x, y0 + oy)) { p.x = x; p.y = y0 + oy; break; } }
      if (p.y < y0 - 1) { g.strokeStyle = 'rgba(160,164,190,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y + 9); g.lineTo(p.sx, y0 - 8); g.stroke(); } // 疊上去的牌：拉一條細線指回主人
      placed.push({ sx: p.x, y: p.y, w: p.w }); drawIntent(g, p.u, p.v, p.x, p.y, t, p.P);
    }
    if (p.pv) { // 預覽牌：平常放意圖牌正上方；會頂到上面的順序條或右上角那排按鈕，就改放右邊、左邊、再不行放下面
      const T = previewTag(g, p.u, p.pv), half = T.w / 2, ok = (x, y) => y - T.up >= uiTop - 2 && x - half >= 2 && x + half <= VW - 2 && !(SB && x + half > SB.left - 4 && y - T.up < SB.bottom + 3 && y + 9 > SB.top);
      const c = [[p.x, p.y - 28], [p.x + p.w / 2 + 5 + half, p.y], [p.x - p.w / 2 - 5 - half, p.y], [p.x, p.y + 32]].find(q => ok(q[0], q[1])) || [p.x, p.y - 28];
      drawPreviewTag(g, p.pv, T, c[0], c[1]);
    }
  }
  // 地利名牌
  for (const s of BV.scene) { const st = B.scene[s.i], S0 = SCENE[s.k]; if (S0.passive || (st.used && !st.wake)) continue; const [sx, sy1] = w2s(s.x, s.y, s.z + (s.k === 'hang' && !st.used ? 12 : 2.4)); let sy = Math.max(sy1, uiTop + 16); g.font = `700 ${11}px ${FONT_S}`; g.textAlign = 'center'; const w = g.measureText(S0.n).width + 12; for (let n = 0; n < 3 && placed.some(q => Math.abs(q.sx - sx) < (q.w + w) / 2 + 2 && Math.abs(q.y - sy) < 18); n++) sy += 20; placed.push({ sx, y: sy, w }); g.fillStyle = st.used ? 'rgba(20,22,32,.7)' : 'rgba(20,22,32,.9)'; g.fillRect(sx - w / 2, sy - 9, w, 17); g.strokeStyle = st.used ? '#5a5a66' : '#ffcf5a'; g.lineWidth = 1; g.strokeRect(sx - w / 2 + .5, sy - 8.5, w - 1, 16); g.fillStyle = st.used ? '#8a8894' : '#ffe9a8'; g.fillText(S0.n + (st.used ? '（休眠）' : ''), sx, sy + 3.5); }
  // 飄字
  for (const tx of BV.texts) { if (tx.plate) { const q = (BV.t - tx.t0) / tx.life, [sx, sy0] = w2s(tx.x, tx.y, tx.z), a = q < .1 ? q / .1 : q > .8 ? (1 - q) / .2 : 1, sy = sy0 - 46; g.globalAlpha = clamp(a, 0, 1); g.font = `900 14px ${FONT_T}`; g.textAlign = 'center'; const w = g.measureText(tx.s).width + 22; g.fillStyle = 'rgba(8,9,16,.94)'; g.beginPath(); g.moveTo(sx - w / 2 + 6, sy - 13); g.lineTo(sx + w / 2, sy - 13); g.lineTo(sx + w / 2, sy + 7); g.lineTo(sx + w / 2 - 6, sy + 13); g.lineTo(sx - w / 2, sy + 13); g.lineTo(sx - w / 2, sy - 7); g.closePath(); g.fill(); g.strokeStyle = tx.edge || '#8a8ea4'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = tx.col; g.fillText(tx.s, sx, sy + 5); g.globalAlpha = 1; continue; }
    const q = (BV.t - tx.t0) / tx.life, [sx, sy] = w2s(tx.x, tx.y, tx.z), y = sy - (26 + q * 34) - (tx.big ? 8 : 0), sc = tx.big ? 1 + Math.max(0, .5 - q * 3) : 1; g.globalAlpha = q > .7 ? (1 - q) / .3 : 1; const num = /^[\d+]/.test(tx.s); g.font = `${num ? 700 : 900} ${Math.round((tx.big ? (num ? 30 : 21) : (num ? 21 : 14)) * sc)}px ${num ? FONT_N : FONT_S}`; g.textAlign = 'center'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(6,7,12,.92)'; g.lineWidth = tx.big ? 5 : 4; g.strokeText(tx.s, sx + tx.dx, y); g.fillStyle = tx.col; g.fillText(tx.s, sx + tx.dx, y); }
  g.globalAlpha = 1;
  // 暴擊：一道裂窗
  if (BV.crack && BV.t - BV.crack < .32 && S.set.flash) { const q = (BV.t - BV.crack) / .32, rr = mulberry32((BV.crack * 1000) | 0); g.globalAlpha = 1 - q; g.strokeStyle = '#fff6dc'; g.lineWidth = 2.2; g.lineCap = 'round'; const ox = VW * (.4 + rr() * .3), oy = VH * (.25 + rr() * .2); for (let i = 0; i < 6; i++) { let a = rr() * TAU, x = ox, y = oy; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { a += (rr() - .5) * .9; const l = 30 + rr() * 80; x += Math.cos(a) * l; y += Math.sin(a) * l; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; }
  if (BV.flash > 0) { g.fillStyle = `rgba(255,250,235,${BV.flash * .35})`; g.fillRect(0, 0, VW, VH); }
  // 橫幅
  if (BV.banner) { const q = (BV.t - BV.banner.t0) / 1.25; if (q >= 1) BV.banner = null; else { const a = q < .12 ? q / .12 : q > .75 ? (1 - q) / .25 : 1, y = VH * (VW > VH ? .2 : .19), sl = (1 - easeOut(Math.min(1, q * 5))) * 60; g.globalAlpha = a; const gr = g.createLinearGradient(0, 0, VW, 0); gr.addColorStop(0, 'rgba(8,9,16,0)'); gr.addColorStop(.3, 'rgba(8,9,16,.86)'); gr.addColorStop(.7, 'rgba(8,9,16,.86)'); gr.addColorStop(1, 'rgba(8,9,16,0)'); g.fillStyle = gr; g.fillRect(0, y - 30, VW, 60); g.fillStyle = BV.banner.col; g.fillRect(VW * .2, y - 30, VW * .6, 1.5); g.fillRect(VW * .2, y + 28.5, VW * .6, 1.5); g.font = `900 28px ${FONT_T}`; g.textAlign = 'center'; g.fillStyle = BV.banner.col; g.fillText(BV.banner.s, VW / 2 - sl, y + (BV.banner.sub ? 2 : 10)); if (BV.banner.sub) { g.font = `500 12px ${FONT_S}`; g.fillStyle = '#d8d2c4'; g.fillText(BV.banner.sub, VW / 2 + sl, y + 21); } g.globalAlpha = 1; } }
  if (BV.cut) drawCutIn(g, t);
}
const FONT_S = "'Noto Sans TC','Noto Sans CJK TC','PingFang TC',sans-serif", FONT_T = "'Noto Serif TC','Noto Serif CJK TC','Songti TC',serif", FONT_N = "'Oswald','Noto Sans TC','Noto Sans CJK TC',sans-serif";
const ST_SHOW = [['aloft', '浮'], ['stagger', '衡'], ['mark', '標'], ['burn', '灼'], ['rust', '鏽'], ['slow', '滯'], ['lit', '照'], ['exposed', '名'], ['isolate', '單'], ['guard', '架'], ['riposte', '鋒'], ['oathdr', '誓'], ['gate', '門'], ['evade', '索'], ['ambush', '伏'], ['still', '移'], ['moss', '苔']];
const statusCount = u => ST_SHOW.reduce((n, a) => n + (u.s[a[0]] ? 1 : 0), 0);
function drawStatusRow(g, u, sx, y) {
  const list = ST_SHOW.filter(a => u.s[a[0]]); if (!list.length) return; const w = 17, x0 = sx - list.length * w / 2;
  list.forEach((a, i) => { const c = STATUS[a[0]].c, x = x0 + i * w, n = typeof u.s[a[0]] === 'number' && u.s[a[0]] > 1 && ['burn', 'rust', 'still', 'moss'].includes(a[0]) ? u.s[a[0]] : 0; g.fillStyle = 'rgba(10,11,18,.92)'; g.beginPath(); g.moveTo(x + 2, y - 8); g.lineTo(x + w - 3, y - 8); g.lineTo(x + w - 1, y - 5); g.lineTo(x + w - 1, y + 7); g.lineTo(x, y + 7); g.lineTo(x, y - 6); g.closePath(); g.fill(); g.strokeStyle = c; g.lineWidth = 1.2; g.stroke(); g.fillStyle = c; g.font = `700 10.5px ${FONT_S}`; g.textAlign = 'center'; g.fillText(a[1], x + w / 2 - (n ? 2.5 : .5), y + 3.6); if (n) { g.font = `700 8px ${FONT_N}`; g.fillStyle = '#fff'; g.fillText(n, x + w - 3.6, y + 6); } });
}
// 這個敵人頭上的意圖牌要寫什麼、多寬（沒有牌就回傳 null）
function intentPlate(g, u) {
  if (u.object || BV.texts.some(x => x.plate && x.uid === u.id)) return null; const it = intentInfo(u); if (!it) return null;
  const mv = it.mv, total = Object.values(it.dmg).reduce((a, b) => a + b, 0), all = mv.tgt === 'all', label = (it.charging ? '發動 ' : it.willCharge ? '將蓄力 ' : '') + mv.n;
  g.font = `700 11px ${FONT_S}`; const tw = g.measureText(label).width; const dn = total ? (all ? '全體 ' : '') + Math.round(all ? total / Math.max(1, it.tgt.length) : total) : ''; g.font = `700 13px ${FONT_N}`; const dw = dn ? g.measureText(dn).width + 6 : 0; const dots = !all && it.tgt.length ? it.tgt.length * 9 + 3 : 0;
  return { it, mv, all, label, tw, dn, dw, dots, w: tw + dw + dots + 14 };
}
function drawIntent(g, u, v, sx, y, t, P) {
  P = P || intentPlate(g, u); if (!P) return;
  const { it, mv, all, label, tw, dn, dw, dots, w } = P, x = sx - w / 2, danger = it.charging || it.willCharge; void mv; void all;
  const pu = danger ? .5 + .5 * Math.sin(t * 8) : 0;
  g.fillStyle = danger ? `rgba(${70 + pu * 40},16,18,.94)` : 'rgba(14,15,24,.9)'; g.beginPath(); g.moveTo(x + 4, y - 9); g.lineTo(x + w, y - 9); g.lineTo(x + w, y + 5); g.lineTo(x + w - 4, y + 9); g.lineTo(x, y + 9); g.lineTo(x, y - 5); g.closePath(); g.fill(); g.strokeStyle = danger ? '#ff6a5a' : '#5a5e74'; g.lineWidth = 1.2; g.stroke();
  g.textAlign = 'left'; g.font = `700 11px ${FONT_S}`; g.fillStyle = danger ? '#ffd0c8' : '#d8d2c4'; g.fillText(label, x + 6, y + 4); let px = x + 6 + tw + 5;
  if (dn) { g.font = `700 13px ${FONT_N}`; g.fillStyle = '#ff8a7a'; g.fillText(dn, px, y + 4.6); px += dw; }
  if (dots) for (const id of it.tgt) { const h = U(id); g.fillStyle = HERO[h.hero].col; g.beginPath(); g.arc(px + 3, y, 3.4, 0, TAU); g.fill(); g.strokeStyle = U_INK; g.lineWidth = 1; g.stroke(); px += 9; }
  if (it.charging) { const n = moveOf(u, u.charging.mv).charge.pips; for (let i = 0; i < n; i++) { g.fillStyle = i < it.pips ? '#ffcf5a' : '#3a3a46'; g.strokeStyle = U_INK; g.lineWidth = 1.2; g.beginPath(); g.rect(sx - n * 7 + i * 14 + 1, y + 12, 11, 5); g.fill(); g.stroke(); } }
  else if (it.willCharge) { const n = it.pips; for (let i = 0; i < n; i++) { g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.2; g.strokeRect(sx - n * 7 + i * 14 + 1.5, y + 12.5, 10, 4); } }
}
// 出手前的預覽牌（「−26 浮空」）。previewTag 只量不畫，回傳文字與寬高；drawPreviewTag 畫在 (sx, y)
function previewTag(g, u, pv) {
  const parts = []; if (pv.loss > 0) parts.push('−' + Math.round(pv.loss)); if (pv.dead) parts.push('擊殺'); else { if (pv.aloft && !u.s.aloft) parts.push('浮空'); if (pv.stagger && !u.s.stagger) parts.push('失衡'); }
  const s = parts.join(' '); g.font = `700 14px ${FONT_N}`; const crit = pv.cc > 0 && pv.cc < 100 && pv.cdmg ? `暴擊 ${Math.round(pv.cc)}%：${pv.cdmg}` : '';
  return { s, crit, w: g.measureText(s).width + 14, up: crit ? 27 : 11 }; // up：從 y 往上佔多高
}
function drawPreviewTag(g, pv, T, sx, y) {
  g.font = `700 14px ${FONT_N}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(sx - T.w / 2, y - 11, T.w, 20); g.fillStyle = pv.dead ? '#b0201a' : '#15161e'; g.fillText(T.s, sx, y + 4);
  if (T.crit) { g.font = `500 10px ${FONT_S}`; g.fillStyle = '#ffe9a8'; g.strokeStyle = 'rgba(6,7,12,.9)'; g.lineWidth = 3; g.strokeText(T.crit, sx, y - 16); g.fillText(T.crit, sx, y - 16); }
}
function drawCutIn(g, t) { // 奧義特寫：彩窗半身像從側邊滑入
  const c = BV.cut, q = (BV.t - c.t0) / (.82 / (S.set.speed || 1)), a = q < .15 ? q / .15 : q > .85 ? (1 - q) / .15 : 1, u = U(c.uid), land = VW > VH;
  const h = land ? VH * .46 : VH * .26, y = VH * (land ? .27 : .3), sl = (1 - easeOut(Math.min(1, q * 4))) * VW;
  g.save(); g.globalAlpha = clamp(a, 0, 1);
  g.fillStyle = 'rgba(6,7,12,.9)'; g.beginPath(); g.moveTo(0, y + 18); g.lineTo(VW, y - 18); g.lineTo(VW, y + h - 18); g.lineTo(0, y + h + 18); g.closePath(); g.fill();
  const col = c.all ? '#ffcf5a' : HERO[u.hero].col; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y + 18); g.lineTo(VW, y - 18); g.moveTo(0, y + h + 18); g.lineTo(VW, y + h - 18); g.stroke();
  const ids = c.all ? liveHeroes().map(x => x.hero) : [u.hero];
  const im0 = portrait(ids[0], 'bust'), x0 = land ? VW * .12 : 6; let ph = h * 1.25, pw = ph * im0.width / im0.height, step = pw * .66; const tot = pw + step * (ids.length - 1), room = (land ? VW * .56 : VW - 12); if (tot > room) { const k2 = room / tot; ph *= k2; pw *= k2; step *= k2; }
  ids.forEach((hid, i) => { g.drawImage(portrait(hid, 'bust'), x0 + i * step - sl, y + h - ph + 10, pw, ph); });
  const below = c.all && !land, ty = below ? y + h + 58 : y + h * .62;
  g.textAlign = 'right'; g.font = `900 ${land ? 54 : below ? 44 : 36}px ${FONT_T}`; g.fillStyle = '#fff6dc'; g.strokeStyle = 'rgba(6,7,12,.9)'; g.lineWidth = 6; g.lineJoin = 'round'; const tx = VW - 18 + sl * .5; g.strokeText(c.name, tx, ty); g.fillText(c.name, tx, ty);
  g.font = `700 13px ${FONT_S}`; g.fillStyle = col; g.strokeText(c.kind + (c.all ? '' : '・' + u.name), tx, ty + 22); g.fillText(c.kind + (c.all ? '' : '・' + u.name), tx, ty + 22);
  g.restore(); void t;
}
function bvPick(sx, sy) { // 點到哪個單位／地利
  let best = null, bd = 1e9;
  for (const s of BV.scene) { if (s.k !== 'hang' || B.scene[s.i].used) continue; const [x, y] = w2s(s.x, s.y, s.z + 10.6), d = Math.hypot(sx - x, sy - y); if (d < 42 && d < bd) { bd = d; best = { scene: s.i }; } }
  if (best) return best; // 懸骸畫在所有人上面：點到石頭或它的名牌，就是它（好幾段擠在一起時挑最近的）
  for (const k in BV.units) { const v = BV.units[k]; if (v.gone) continue; const [x, y] = w2s(v.x, v.y, v.z + v.lift), h = unitH(v.look) * .82 * v.scale * Cam.zoom, w = 30 * v.scale * Cam.zoom; if (sx > x - w && sx < x + w && sy > y - h - 30 && sy < y + 14) { const d = Math.hypot(sx - x, sy - (y - h * .5)); if (d < bd) { bd = d; best = { unit: v.id }; } } }
  for (const s of BV.scene) { const S0 = SCENE[s.k]; if (S0.passive) continue; const [x, y] = w2s(s.x, s.y, s.z + (s.k === 'hang' ? 10.6 : 1.2)); const d = Math.hypot(sx - x, sy - y); if (d < (s.k === 'hang' ? 52 : 46) && d < bd) { bd = d; best = { scene: s.i }; } }
  return best;
}
