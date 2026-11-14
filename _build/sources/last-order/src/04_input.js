/* ===== 輸入（PZ 引擎）：觸控浮動搖桿、鍵盤、手把 ===== */
const Input = {
  stick: null, keys: Object.create(null),
  init() {
    addEventListener('keydown', e => {
      const block = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (App.screen === 'play' && block.includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      App.onKey(e);
    });
    // 手把：A 翻滾（劇情：下一句）、X／RB／RT 汽油彈、Y／LB 換槍、START 暫停、BACK 跳過劇情（B 是選單的「返回」）
    PZ.input.bind({ padDodge: ['PadA'], padMolo: ['PadX', 'PadRB', 'PadRT'], padCycle: ['PadY', 'PadLB'], padPause: ['PadStart'], padSkip: ['PadBack'], padResume: ['PadB'] });
    PZ.input.onPress('padDodge', () => { if (App.screen === 'play' && G && G.state === 'play') doDodge(); else if (App.screen === 'story') Story.advance(); });
    PZ.input.onPress('padMolo', () => { if (App.screen === 'play' && G && G.state === 'play') throwMolotov(); });
    PZ.input.onPress('padCycle', () => { if (App.screen === 'play' && G && G.state === 'play') cycleGun(); });
    PZ.input.onPress('padPause', () => { if (App.screen !== 'play' || !G) return; if (G.state === 'play') UI.pause(); else if (G.state === 'paused') UI.resume(); });
    PZ.input.onPress('padSkip', () => { if (App.screen === 'story') Story.skip(); });
    PZ.input.onPress('padResume', () => { if (App.screen === 'play' && G && G.state === 'paused') UI.resume(); });
    // 觸控：畫面任一處按住拖曳＝浮動搖桿（樣子沿用原本的）
    this.stick = PZ.input.stick({ target: 'move', zone: { l: 0, t: 0, r: 1, b: 1 }, radius: 46, cls: 'lo-stick' });
    this.stick.show(false);
  },
  endJoy() { if (this.stick) this.stick.reset(); },
  vec() { const m = PZ.input.move; return [m.x, m.y]; }
};
