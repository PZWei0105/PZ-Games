// 煙火秀：大會煙火秀（跟配樂對拍）、錄下自己放的煙火再播放
import { Fireworks } from './fireworks.js';
import { SHOW_BPM, SHOW_BARS, showSection } from './audio.js';
import { seeded, store } from './util.js';

const STAGE = { z: -188, x: 92 };
export const BAR = (60 / SHOW_BPM) * 4;

// 產生大會煙火秀：回傳 [{t（炸開的秒數）, type, color, x, y, z, scale, text}]
export function grandShow(k = 1) {
  const R = seeded(2026), ev = [];
  const beat = BAR / 4;
  const at = (bar, b = 0) => bar * BAR + b * beat;
  const add = (t, type, color, x, y, scale = 1, extra = {}) => ev.push({ t, type, color, x, y, z: STAGE.z + (R() - 0.5) * 30, scale, ...extra });
  const X = (f) => (f * 2 - 1) * STAGE.x;
  const sweep = (t0, dur, n, f0, f1, type, color, y0, y1, scale = 0.8) => { for (let i = 0; i < n; i++) { const f = n === 1 ? 0 : i / (n - 1); add(t0 + dur * f, type, color, X(f0 + (f1 - f0) * f), y0 + (y1 - y0) * f, scale); } };
  const keep = (p) => R() < p * (0.45 + 0.55 * k);
  // 前奏：一發一發，讓人看清楚
  add(at(0, 0), 'peony', 'silver', X(0.3), 85, 1.1);
  add(at(0, 2), 'peony', 'silver', X(0.7), 85, 1.1);
  add(at(1, 0), 'chrys', 'blue', X(0.5), 110, 1.3);
  add(at(2, 0), 'willow', 'gold', X(0.25), 95, 1.1);
  add(at(2, 2), 'willow', 'gold', X(0.75), 95, 1.1);
  add(at(3, 0), 'ring', 'red', X(0.38), 90, 1.1);
  add(at(3, 1), 'ring', 'cyan', X(0.62), 90, 1.1);
  add(at(3, 3), 'strobe', 'silver', X(0.5), 120, 0.9);
  // 琶音段：左右掃
  for (let b = 4; b < 8; b++) {
    const dir = b % 2;
    sweep(at(b, 0), beat * 3, 6, dir ? 0.1 : 0.9, dir ? 0.9 : 0.1, 'peony', ['pink', 'cyan', 'gold', 'purple'][b % 4], 70, 95, 0.7);
  }
  add(at(6, 0), 'heart', 'pink', X(0.5), 105, 1.1);
  add(at(7, 0), 'saturn', 'random', X(0.5), 108, 1.2);
  // 主歌：每拍兩發
  const mainTypes = ['chrys', 'peony', 'crossette', 'palm', 'ring', 'crackle', 'willow'];
  for (let b = 8; b < 16; b++) {
    for (let q = 0; q < 4; q++) {
      const ty = mainTypes[(b * 4 + q) % mainTypes.length];
      add(at(b, q), ty, 'random', X(0.12 + R() * 0.76), 75 + R() * 40, 0.95);
      if (keep(0.8)) add(at(b, q + 0.5), 'peony', 'random', X(R()), 65 + R() * 30, 0.7);
    }
  }
  add(at(12, 0), 'smile', 'gold', X(0.3), 110, 1.05);
  add(at(12, 2), 'star', 'cyan', X(0.7), 110, 1.05);
  add(at(14, 0), 'text', 'random', X(0.5), 112, 1.0);
  // 漸強：分裂、閃光，越來越密
  for (let b = 16; b < 20; b++) {
    const n = (b - 15) * 3;
    for (let i = 0; i < n; i++) if (keep(1)) add(at(b, (i / n) * 4), i % 2 ? 'crossette' : 'strobe', i % 2 ? 'gold' : 'silver', X((i + 0.5) / n), 70 + (b - 16) * 8 + R() * 10, 0.8);
  }
  sweep(at(19, 2), beat * 2, 10, 0.05, 0.95, 'mini', 'random', 60, 110, 0.9);
  // 高潮：每拍三到四發
  const hiTypes = ['kamuro', 'palm', 'peony', 'chrys', 'crackle', 'ring', 'crossette', 'multi'];
  for (let b = 20; b < 28; b++) {
    for (let q = 0; q < 4; q++) {
      const ty = hiTypes[(b + q * 3) % hiTypes.length];
      add(at(b, q), ty, R() < 0.25 ? 'rainbow' : 'random', X(0.1 + R() * 0.8), 80 + R() * 45, 1.05);
      if (keep(0.9)) add(at(b, q + 0.33), 'peony', 'random', X(R()), 60 + R() * 35, 0.75);
      if (keep(0.6)) add(at(b, q + 0.66), 'chrys', 'random', X(R()), 70 + R() * 35, 0.8);
    }
  }
  add(at(24, 0), 'text', 'gold', X(0.5), 118, 1.1);
  add(at(26, 0), 'heart', 'red', X(0.25), 108, 1.0); add(at(26, 0), 'heart', 'pink', X(0.75), 108, 1.0);
  // 終章：一整片
  for (let b = 28; b < 30; b++) for (let i = 0; i < 24; i++) if (keep(1)) add(at(b, (i / 24) * 4), ['peony', 'chrys', 'strobe', 'palm', 'crackle'][i % 5], 'random', X(R()), 60 + R() * 60, 0.95);
  for (let i = 0; i < 9; i++) add(at(SHOW_BARS, 0) + i * 0.06, 'kamuro', 'gold', X(0.05 + i * 0.1125), 100 + (i % 2) * 18, 1.25);
  for (let i = 0; i < 6; i++) add(at(SHOW_BARS, 0.5) + i * 0.05, 'willow', 'gold', X(0.12 + i * 0.15), 80, 1.1);
  return ev.sort((a, b) => a.t - b.t);
}

export class ShowPlayer {
  constructor(fw) { this.fw = fw; this.list = null; }
  // events 的 t 是炸開的時間；mode 'burst'（大會）或 'launch'（錄下來的：t 就是發射時間）
  play(events, { timing = 'burst', length } = {}) {
    this.list = events.map((e) => ({ ...e, lt: timing === 'burst' ? e.t - Fireworks.flight(e.y) : e.t })).sort((a, b) => a.lt - b.lt);
    this.i = 0; this.len = length || (this.list.length ? this.list[this.list.length - 1].t + 5 : 5);
    this.done = false;
  }
  stop() { this.list = null; }
  get active() { return !!this.list; }
  update(now) {
    if (!this.list) return;
    while (this.i < this.list.length && this.list[this.i].lt <= now) {
      const e = this.list[this.i++];
      if (now - e.lt > 1.5) continue; // 太晚了（分頁被切走）就略過
      this.fw.launch(e.type, e.color, { x: e.x, y: e.y, z: e.z }, { scale: e.scale, text: e.text, pad: e.pad });
    }
    if (now > this.len) { this.done = true; this.list = null; }
  }
}

// 錄影：記下發射的時間與位置
export class Recorder {
  constructor() { this.on = false; this.ev = []; this.t0 = 0; }
  start(now) { this.on = true; this.ev = []; this.t0 = now; }
  add(now, type, color, target, text) { if (this.on) this.ev.push({ t: +(now - this.t0).toFixed(3), type, color, x: +target.x.toFixed(1), y: +target.y.toFixed(1), z: +target.z.toFixed(1), scale: 1, text }); }
  stop(now) { this.on = false; return { len: now - this.t0, ev: this.ev }; }
  static list() { return store.get('shows', []); }
  static save(rec) {
    const all = Recorder.list();
    const d = new Date();
    const n = (store.get('showSeq', 0) | 0) + 1; store.set('showSeq', n);
    all.unshift({ id: Date.now(), name: `我的煙火秀 #${n}`, date: `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, len: Math.round(rec.len), ev: rec.ev });
    while (all.length > 8) all.pop();
    store.set('shows', all);
    return all[0];
  }
  static remove(id) { store.set('shows', Recorder.list().filter((s) => s.id !== id)); }
}
export { showSection, SHOW_BARS };
