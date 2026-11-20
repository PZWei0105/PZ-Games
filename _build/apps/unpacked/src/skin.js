/* 解包 — 換裝（2026-11-20）：一按整套換——顏色、字型、版面造型、音效、配樂、特效、開場。內容完全不變。
   顏色和字型是 CSS 變數（組建時 skins.py 自動把 style.css 的顏色換成角色色票），這裡只負責：
   套用（<html data-skin>）、換裝轉場、換裝選單、各套的牆面材質、給畫布用的顏色。 */
const SKINS = [
  { id: 'graffiti', name: '塗鴉街頭', en: 'STREET', theme: '#111111', pal: ['#FF2E88', '#FFE600', '#111', '#e3001b'], desc: '黃粉黑噴漆牆、貼紙和印章，嘻哈鼓組配樂', snd: '噴漆聲・拍貼紙・嘻哈鼓組' },
  { id: 'pixel', name: '像素掌機', en: '8-BIT', theme: '#0b0d24', pal: ['#29adff', '#ffec27', '#05061a', '#ff004d'], desc: '像素字、方塊邊框、硬派投影，像在掌機上看攻略本', snd: '8-bit 嗶嗶聲・晶片電玩配樂' },
  { id: 'neon', name: '霓虹賽博', en: 'NEON', theme: '#08040f', pal: ['#ff2bd6', '#00f0ff', '#07030f', '#ff3d6e'], desc: '紫黑夜城、霓虹燈管、掃描線與故障閃爍', snd: '合成器音效・Synthwave 電音' },
  { id: 'paper', name: '紙本雜誌', en: 'PAPER', theme: '#f3eee2', pal: ['#d6262b', '#ffd94d', '#1b1813', '#c4161c'], desc: '米白紙、粗黑襯線大標、紅色印章與螢光筆，白天看最舒服', snd: '翻頁、打字機、橡皮章・Lo-fi 爵士' },
];
const SKIN_BY = Object.fromEntries(SKINS.map((s) => [s.id, s]));
const skinId = () => (SKIN_BY[S.settings.skin] ? S.settings.skin : 'graffiti');
function skinCol(name) { return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#fff'; }

let SERIF_LOADED = false;
function skinFonts(id) {
  if (id === 'paper' && !SERIF_LOADED) {   // 雜誌大標：Noto Serif TC（Google 依字切片，用到哪些字才下載哪些）
    SERIF_LOADED = true;
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap';
    document.head.appendChild(l);
  }
  try {
    const f = { pixel: ['16px "PZ Pixel"', '22px "PZ Pixel Num"'], neon: ['20px "PZ Neon Num"', '20px "PZ Neon Hand"'], paper: ['20px "PZ Paper Num"', '20px "PZ Paper Serif"'] }[id] || [];
    f.forEach((x) => document.fonts.load(x, '解包0'));
  } catch (e) { /* 舊瀏覽器 */ }
}

/* 各套的 CSS（skins/<名字>.css）：換上那一套才載入；塗鴉版是 App 本體，不用載 */
const SKIN_CSS = {};
function skinJs(id) {   // 音色、配樂
  if (id === 'graffiti' || SKIN_BANK_OK(id)) return Promise.resolve(true);
  return new Promise((ok) => {
    const sc = document.createElement('script'); sc.src = `skins/${id}.js?v=${VERSION}`; sc.async = true;
    sc.onload = () => ok(true); sc.onerror = () => { sc.remove(); ok(false); };
    document.head.appendChild(sc); setTimeout(() => ok(false), 5000);
  });
}
const SKIN_BANK_OK = (id) => typeof SFX_BANK !== 'undefined' && !!SFX_BANK[id];
function skinCss(id) {
  if (id === 'graffiti') return Promise.resolve(null);
  if (SKIN_CSS[id]) return SKIN_CSS[id];
  const have = $(`link[data-skin="${id}"]`);
  if (have) { skinJs(id); return (SKIN_CSS[id] = Promise.resolve(have)); }
  SKIN_CSS[id] = new Promise((ok) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.skin = id; l.media = 'not all';   // 先載好、還不生效
    l.href = `skins/${id}.css?v=${VERSION}`;
    const done = () => ok(l); l.onload = done; l.onerror = () => { delete SKIN_CSS[id]; l.remove(); ok(null); };
    document.head.appendChild(l); setTimeout(done, 4000);
  });
  return Promise.all([SKIN_CSS[id], skinJs(id)]).then(([l]) => l);
}
async function skinApply(id) {
  const sk = SKIN_BY[id] || SKIN_BY.graffiti;
  const l = await skinCss(sk.id);
  $$('link[data-skin]').forEach((x) => { x.media = x === l ? 'all' : 'not all'; });
  const root = document.documentElement;
  if (sk.id === 'graffiti' || (!l && sk.id !== 'graffiti')) root.removeAttribute('data-skin'); else root.dataset.skin = sk.id;
  const m = $('meta[name="theme-color"]'); if (m) m.content = l || sk.id === 'graffiti' ? sk.theme : '#111111';
  const cs = $('meta[name="color-scheme"]'); if (cs) cs.content = l && sk.id === 'paper' ? 'light' : 'dark';
  skinFonts(sk.id);
  if (typeof fxSkin === 'function') fxSkin(l || sk.id === 'graffiti' ? sk.id : 'graffiti');
  return !!l || sk.id === 'graffiti';
}

/* ---- 換裝轉場：新的一套把舊的「吃掉」（畫布蓋滿 → 換 → 掀開），配樂交叉淡入 ---- */
let SKIN_BUSY = false;
function skinSwitch(id) {
  if (SKIN_BUSY || id === skinId()) return;
  SKIN_BUSY = true; skinFonts(id); const ready = skinCss(id);   // 一按就開始載那一套的 CSS（蓋滿畫面前通常就載好了）
  const go = async () => {
    const ok = await skinApply(id);
    if (!ok) { toast('這一套的畫面沒載到，檢查一下網路再換一次', 'warn'); return; }
    S.settings.skin = id; save('settings'); if (typeof bgmSkin === 'function') bgmSkin(id); topIcons && topIcons();
  };
  if (!fxOn()) { ready.then(go).then(() => { sfxFor(id, 'pop'); SKIN_BUSY = false; skinSheetSync(); toast(`換上「${SKIN_BY[id].name}」`); }); return; }
  skinWipe(id, go).then(() => { SKIN_BUSY = false; skinSheetSync(); });
}

function skinWipe(id, mid) {
  return new Promise((done) => {
    const cv = document.createElement('canvas'); cv.className = 'skin-wipe';
    const d = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    document.body.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(d, d);
    const C = SKIN_WIPE[id] || SKIN_WIPE.graffiti;
    const T1 = C.cover, T2 = C.reveal; const t0 = performance.now(); let swapped = false, hold = false, t1 = 0;
    sfxFor(id, C.snd);
    const loop = (now) => {
      const t = now - t0;
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
      if (t < T1 || hold) C.draw(g, W, H, Math.min(1, t / T1), false);
      else {
        if (!swapped) { swapped = true; hold = true; Promise.resolve(mid()).then(() => { hold = false; t1 = performance.now(); sfxFor(id, C.snd2); }); }
        else { const p = Math.min(1, (now - t1) / T2); C.draw(g, W, H, 1 - p, true); if (p >= 1) { cv.remove(); done(); return; } }
      }
      // 蓋滿的那一下，正中間亮出新一套的名字
      const lt = hold ? 0.5 : swapped && t1 ? (T1 * 0.45 + (now - t1)) / (T1 * 0.45 + T2 * 0.55) : (t - T1 * 0.55) / (T1 * 0.45 + T2 * 0.55);
      if (lt > 0 && lt < 1) skinLabel(g, W, H, id, Math.min(1, lt * 4, (1 - lt) * 4));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
const ease = (x) => 1 - Math.pow(1 - x, 3);
function skinLabel(g, W, H, id, a) {
  const sk = SKIN_BY[id]; const fs = Math.min(W * 0.13, 64); const cx = W / 2, cy = H / 2;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  const st = {
    graffiti: () => { g.font = `900 ${fs}px "Noto Sans TC",sans-serif`; g.lineWidth = fs * 0.16; g.strokeStyle = '#111'; g.lineJoin = 'round'; g.fillStyle = '#FF2E88'; g.fillText(sk.name, cx + 5, cy + 5); g.strokeText(sk.name, cx, cy); g.fillStyle = '#FFE600'; g.fillText(sk.name, cx, cy); g.font = `400 ${fs * 0.5}px "Rubik Wet Paint","Bebas Neue",sans-serif`; g.fillStyle = '#fff'; g.fillText(sk.en, cx, cy + fs * 0.95); },
    pixel: () => { g.font = `400 ${fs}px "PZ Pixel","Noto Sans TC",sans-serif`; g.fillStyle = '#000'; g.fillText(sk.name, cx + 5, cy + 5); g.fillStyle = '#ffec27'; g.fillText(sk.name, cx, cy); g.font = `400 ${fs * 0.34}px "PZ Pixel Logo",monospace`; g.fillStyle = '#29adff'; g.fillText(sk.en, cx, cy + fs * 0.95); },
    neon: () => { g.font = `900 ${fs}px "Noto Sans TC",sans-serif`; g.fillStyle = '#ff2bd6'; g.fillText(sk.name, cx + 3, cy + 3); g.fillStyle = '#00f0ff'; g.fillText(sk.name, cx - 3, cy - 3); g.fillStyle = '#f2efff'; g.fillText(sk.name, cx, cy); g.font = `400 ${fs * 0.6}px "PZ Neon Logo",sans-serif`; g.fillStyle = '#00f0ff'; g.fillText(sk.en, cx, cy + fs * 1.05); },
    paper: () => { g.font = `900 ${fs}px "Noto Serif TC","PZ Paper Serif",serif`; g.fillStyle = '#1b1813'; g.fillText(sk.name, cx, cy); g.fillStyle = '#d6262b'; g.fillRect(cx - fs * 2.1, cy + fs * 0.62, fs * 4.2, 4); g.font = `italic 900 ${fs * 0.5}px "PZ Paper Logo",serif`; g.fillText(sk.en, cx, cy + fs * 1.05); },
  }[id]; if (st) st();
  g.restore();
}
const SKIN_WIPE = {
  // 塗鴉：一道道斜的噴漆帶從左刷到右
  graffiti: {
    cover: 520, reveal: 420, snd: 'hiss', snd2: 'slap',
    draw(g, W, H, p, out) {
      const bands = 7, bh = (H + W * 0.4) / bands;
      for (let i = 0; i < bands; i++) {
        const q = Math.max(0, Math.min(1, p * 1.6 - i * 0.08)); if (q <= 0) continue;
        const e = ease(q);
        g.fillStyle = i % 3 === 1 ? '#FF2E88' : i % 3 === 2 ? '#FFE600' : '#111';
        g.save(); g.translate(0, i * bh - W * 0.2); g.rotate(-0.18);
        const w = (W + 200) * e; g.fillRect(out ? W + 100 - w : -100, 0, w, bh + 2);
        g.restore();
      }
    },
  },
  // 像素：方塊一格一格亂序填滿
  pixel: {
    cover: 480, reveal: 460, snd: 'riser', snd2: 'coin',
    draw(g, W, H, p) {
      const s = 34, cols = Math.ceil(W / s), rows = Math.ceil(H / s);
      g.fillStyle = '#0b0d24';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = ((x * 73856093) ^ (y * 19349663)) >>> 0; const th = (k % 1000) / 1000 * 0.85;
        if (p > th) { const a = Math.min(1, (p - th) / 0.15); const z = s * a; g.fillStyle = (k % 7 === 0) ? '#29adff' : (k % 11 === 0) ? '#ffec27' : '#0b0d24'; g.fillRect(x * s + (s - z) / 2, y * s + (s - z) / 2, z, z); }
      }
    },
  },
  // 霓虹：掃描線由上往下掃，帶故障色條
  neon: {
    cover: 460, reveal: 480, snd: 'riser', snd2: 'zap',
    draw(g, W, H, p) {
      const y = H * ease(p);
      g.fillStyle = '#08040f'; g.fillRect(0, 0, W, y);
      for (let i = 0; i < 9; i++) {
        const yy = y - (i * 37 % 160); if (yy < 0) continue;
        g.fillStyle = i % 2 ? 'rgba(0,240,255,.55)' : 'rgba(255,43,214,.55)';
        g.fillRect((i * 97) % W - 40, yy, 60 + (i * 53) % (W * 0.6), 3 + (i % 3) * 3);
      }
      g.fillStyle = '#00f0ff'; g.fillRect(0, y - 2, W, 3); g.fillStyle = 'rgba(255,43,214,.8)'; g.fillRect(0, y + 2, W, 2);
    },
  },
  // 紙本：一張紙從右邊翻過來
  paper: {
    cover: 520, reveal: 440, snd: 'flip', snd2: 'stamp',
    draw(g, W, H, p, out) {
      const e = ease(p), x = out ? W * (1 - e) : W * (1 - e);
      const ww = W - x;
      g.fillStyle = '#f3eee2'; g.fillRect(x, 0, ww + 2, H);
      g.fillStyle = 'rgba(60,45,20,.18)'; g.fillRect(x - 14, 0, 14, H);
      g.fillStyle = 'rgba(60,45,20,.08)'; g.fillRect(x - 34, 0, 20, H);
      g.fillStyle = '#d6262b'; g.fillRect(x + ww * 0.08, H * 0.42, ww * 0.84 * e, 6);
      g.fillStyle = '#1b1813'; g.fillRect(x + ww * 0.08, H * 0.42 + 14, ww * 0.6 * e, 3);
    },
  },
};

/* ---- 換裝選單 ---- */
function skinSheetHtml() {
  const cur = skinId();
  return `<div class="sh-in skinsh"><div class="sk-h"><b>換裝</b><i>SKIN</i><span>一按整套換：畫面、字型、音效、配樂、特效、開場。內容都一樣。</span></div>
    <div class="sk-list">${SKINS.map((s) => `<button class="sk-card${s.id === cur ? ' on' : ''}" data-act="skin" data-k="${s.id}">
      <div class="skp" data-skin="${s.id}"><div class="skp-wall"><div class="skp-top"><b>解包</b><i>UNPACKED</i></div>
        <div class="skp-h">今日解包<em>11.20</em></div>
        <div class="skp-card"><div class="skp-img"></div><div class="skp-t">雷頓教授與蒸氣新世界</div><span class="skp-st">推薦</span></div>
        <div class="skp-row"><span class="skp-chip">繁中</span><span class="skp-chip y">NT$1,550</span><span class="skp-chip p">-40%</span></div>
        <div class="skp-tabs"><i class="on"></i><i></i><i></i><i></i></div></div></div>
      <div class="sk-meta"><b>${esc(s.name)}</b><i>${esc(s.en)}</i>${s.id === cur ? '<em>使用中</em>' : ''}<p>${esc(s.desc)}</p><small>♪ ${esc(s.snd)}</small></div>
    </button>`).join('')}</div>
    <p class="sk-note">分享到粉專的圖卡維持「遊戲狂想曲」固定樣式，粉專形象才一致。</p></div>`;
}
function openSkinSheet() { openSheet(skinSheetHtml()); }
function skinSheetSync() { const sh = $('#sheet.on .skinsh'); if (sh) sh.parentElement.innerHTML = `<button class="ib sclose" data-act="close" aria-label="關閉">${ICON.x}</button>` + skinSheetHtml(); }
