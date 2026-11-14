/* 樣品館：三首示範配樂（也是「怎麼用文字寫譜」的範例） */
const LabMusic = {};
LabMusic.define = () => {
  const M = PZ.music;
  // 一、夜行（合成器流行，A 小調，Am–F–C–G）
  const bassBar = (r1, r2) => `${r1} . ${r2} . ${r1} . ${r2} . ${r1} . ${r2} . ${r1} . ${r2} .`;
  const arpBar = (a, b, c, d) => `${a} ${b} ${c} ${d} ${c} ${b} ${a} ${b} ${c} ${d} ${c} ${b} ${a} ${b} ${c} ${b}`;
  M.define('drive', {
    bpm: 104, steps: 16,
    tracks: [
      { inst: 'kick', pat: 'x...x...x...x...', vol: 0.85 },
      { inst: 'snare', pat: '....x.......x...', vol: 0.45, min: 0.25 },
      { inst: 'hat', pat: '..x...x...x...x.', vol: 0.28, min: 0.15 },
      { inst: 'hat', pat: 'x.x.x.x.x.x.x.x.', vol: 0.16, min: 0.7 },
      { inst: 'bass', notes: [bassBar('A1', 'A2'), bassBar('F1', 'F2'), bassBar('C2', 'C3'), bassBar('G1', 'G2')].join(' | '), vol: 0.6 },
      { inst: 'pad', chords: 'Am F C G', vol: 0.2, base: 57 },
      { inst: 'arp', notes: [arpBar('A3', 'C4', 'E4', 'A4'), arpBar('F3', 'A3', 'C4', 'F4'), arpBar('C4', 'E4', 'G4', 'C5'), arpBar('G3', 'B3', 'D4', 'G4')].join(' | '), vol: 0.22, min: 0.45, pan: 0.25 },
      { inst: 'lead', notes: 'E5 - - - - - D5 - C5 - - - B4 - - - | C5 - - - - - B4 - A4 - - - G4 - - - | E4 - G4 - C5 - - - D5 - E5 - - - - - | D5 - - - - - - - B4 - - - - - - -', vol: 0.5, min: 0.8, pan: -0.15, rev: 0.25 },
    ],
  });
  // 二、墨（五聲音階，D 宮調：古箏琶音＋笛子旋律）
  M.define('ink', {
    bpm: 76, steps: 16,
    tracks: [
      { inst: 'zither', notes: 'D4 . A4 . D5 . E5 . F#5 . E5 . D5 . A4 . | B3 . F#4 . B4 . D5 . E5 . D5 . B4 . F#4 . | E4 . B4 . E5 . F#5 . A5 . F#5 . E5 . B4 . | A3 . E4 . A4 . B4 . D5 . B4 . A4 . E4 .', vol: 0.5, rev: 0.3 },
      { inst: 'strings', chords: 'Dsus2 Bm Em7 Asus4', vol: 0.16, base: 50 },
      { inst: 'sub', notes: 'D2 - - - - - - - - - - - - - - - | B1 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - - | A1 - - - - - - - - - - - - - - -', vol: 0.4 },
      { inst: 'flute', notes: 'A5 - - - B5 - A5 - F#5 - - - E5 - D5 - | F#5 - - - - - E5 - D5 - B4 - - - - - | E5 - F#5 - A5 - - - B5 - A5 - F#5 - E5 - | D5 - - - - - - - - - - - . . . .', vol: 0.55, min: 0.4, rev: 0.35 },
      { inst: 'tom', pat: 'x.......x...o...', note: 'D2', vol: 0.45, min: 0.55 },
      { inst: 'shaker', pat: '..x...x...x...xx', vol: 0.25, min: 0.7 },
    ],
  });
  // 三、凌晨（恐怖張力：小二度的不安、心跳低鼓、遠處的鐘）
  M.define('dread', {
    bpm: 66, steps: 16,
    tracks: [
      { inst: 'sub', notes: 'D1 - - - - - - - - - - - - - - - | Eb1 - - - - - - - - - - - - - - -', vol: 0.55 },
      { inst: 'choir', chords: 'Dm Eb', vol: 0.22, base: 50, rev: 0.4 },
      { inst: 'kick', pat: 'x..x............', vol: 0.7, min: 0.2 },
      { inst: 'bell', notes: 'A5 . . . . . . . . . . . . . . . | Bb5 . . . . . . . . . . . . . . .', vol: 0.3, min: 0.35, rev: 0.5 },
      { inst: 'strings', notes: 'D4 Eb4 D4 Eb4 D4 Eb4 D4 Eb4 D4 Eb4 D4 Eb4 D4 Eb4 D4 Eb4', vol: 0.12, min: 0.7, gate: 0.6 },
      { inst: 'rim', pat: '......x.......x.', vol: 0.3, min: 0.85 },
    ],
  });
  M.define('win', { bpm: 150, once: true, tracks: [{ inst: 'arp', notes: 'C5 E5 G5 C6 - - - -', vol: 0.5 }, { inst: 'bell', notes: 'C6 . . . . . . .', vol: 0.4 }, { inst: 'pad', chords: 'C', vol: 0.3 }] });
};
