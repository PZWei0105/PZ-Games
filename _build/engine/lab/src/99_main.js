/* 樣品館：啟動 */
PZ.start({
  id: 'engine-lab', title: '樣品館', version: '1.0.0',
  orientation: 'any', background: '#05070c',
  binds: { fire: ['Space', 'KeyJ', 'PadA', 'PadRT', 'Mouse0'], dash: ['ShiftLeft', 'KeyK', 'PadB', 'PadLT'] },
  async load(progress) {
    LabArt.make(); progress(0.6);
    LabMusic.define(); progress(1);
  },
  first: 'hub',
});
