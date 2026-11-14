/* 樣品館：共用小工具 */
const Lab = { demos: [] };
/** 每個示範頁上方的返回列 */
Lab.bar = (title, sub) => `<div class="lab-bar"><button class="lab-back pz-btn ghost" data-ui aria-label="返回" style="padding:0">‹</button><div class="lab-title">${title}<small>${sub || ''}</small></div></div>`;
/** 把 [data-chip] 綁成開關：state 物件的 key 對應 chip 的值 */
Lab.chips = (root, state, onChange) => {
  root.querySelectorAll('[data-chip]').forEach((b) => {
    const k = b.dataset.chip; b.classList.toggle('on', !!state[k]);
    b.addEventListener('click', () => { state[k] = !state[k]; b.classList.toggle('on', !!state[k]); PZ.uiSound(state[k] ? 'confirm' : 'cancel'); if (onChange) onChange(k, state[k]); });
  });
};
Lab.range = (input, onInput) => { const paint = () => input.style.setProperty('--v', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); paint(); input.addEventListener('input', () => { paint(); onInput(+input.value); }); };
Lab.bindBack = (root) => { const b = root.querySelector('.lab-back'); if (b) b.addEventListener('click', () => PZ.go('hub', null, { type: 'iris', time: 0.4 })); };
/** 手機橫拿（矮螢幕）時控制面板在右邊（見 00_lab.css）：回傳鏡頭要往右挪幾個世界單位，內容才會置中在左邊空出來的地方 */
Lab.side = () => PZ.screen.landscape && PZ.screen.h <= 520;
Lab.shift = () => { if (!Lab.side()) return 0; PZ.cam.compute(); const pw = Math.min(320, PZ.screen.w * 0.44) + 20; return pw / 2 / (PZ.cam.ez || 1); };
/** 畫重複的地板（只畫看得到的範圍） */
Lab.floor = (g, frame = 'floor', size = 96) => {
  const v = PZ.cam.view, x0 = Math.floor(v.x / size) * size - size, y0 = Math.floor(v.y / size) * size - size;
  g.tile(frame, x0, y0, v.w + size * 3, v.h + size * 3, { ox: -x0, oy: -y0 });
};
/** 有影子的角色 */
Lab.actor = (g, f, x, y, o = {}) => {
  g.ellipse(x, y, (o.shadow || 15) * (o.sx || 1), (o.shadow || 15) * 0.36, 'rgba(0,0,0,.45)');
  g.spr(f, x, y + (o.oy || 0), o.r || 0, (o.sx || 1) * (o.flip ? -1 : 1), o.sy || o.sx || 1, o.a == null ? 1 : o.a, o.color, o.add || 0, o.flash || 0);
};
