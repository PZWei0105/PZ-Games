/* ===== 啟動（引擎啟動後呼叫 boot，主迴圈由引擎的場景負責，見 13_engine.js） ===== */
function boot() {
  Sound.on = Save.d.sound;
  if (IS_TOUCH) document.body.classList.add('touch');
  VC.cv = mkCanvas(320, 200); VC.ctx = VC.cv.getContext('2d'); VC.light = mkCanvas(8, 8); VC.lctx = VC.light.getContext('2d'); // 世界畫在離屏的小畫布，再交給引擎放大＋後製
  Scene.cv = $('scv'); Scene.ctx = Scene.cv.getContext('2d');
  PSPR = charSprite('player', ['player']);
  resizeView(); Scene.resize();
  PZ.on('resize', () => { resizeView(); Scene.resize(); });
  Input.init();
  const unlock = () => Sound.init();
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, unlock, true);
  const on = (id, fn) => $(id).addEventListener('click', e => { e.stopPropagation(); fn(e); });
  on('bStart', () => { Sound.play('click'); const d = Save.d; startChapter(d.cleared[5] ? 1 : Math.min(5, d.unlocked)); });
  on('bChapters', () => { Sound.play('click'); renderChapters(); App.go('chapters'); });
  on('bEndless', () => { if (!Save.d.endlessOpen) { Toast.show('先通關第一章'); return; } Sound.play('click'); beginPlay('E'); });
  on('bAch', () => { Sound.play('click'); renderAch(); App.go('ach'); });
  on('bSound', () => { Sound.play('click'); openSettings(); });
  on('bChBack', () => { Sound.play('click'); Title.show(); });
  on('bAchBack', () => { Sound.play('click'); Title.show(); });
  on('bEndBack', () => { Sound.play('click'); Sound.stopAmb(); Scene.amb = null; Title.show(); });
  on('stSkip', () => Story.skip());
  $('scrStory').addEventListener('click', e => { if (e.target.closest('button')) return; Story.advance(); });
  on('lvReroll', () => UI.reroll());
  on('pResume', () => UI.resume());
  on('pRestart', () => UI.restart());
  on('pQuit', () => UI.quit());
  on('pSound', () => openSettings());
  on('dRetry', () => UI.restart());
  on('dMenu', () => UI.deadMenu());
  on('cNext', () => UI.continueAfterClear());
  const act = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  act('btnDodge', doDodge); act('btnMolo', throwMolotov); act('btnPause', () => UI.pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden && App.screen === 'play' && G && G.state === 'play') UI.pause(); });
  $('hudFace').src = portraitURL('ziwei'); $('moloIco').src = iconURL('molotov');
  Title.show();
}

