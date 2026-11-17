/* 轉機 TURNAROUND — 核心：狀態、同步、聲音、震動、語音、小工具 */
const VERSION = '1.0.0';
const IS_WEB = !!window.TA_WEB;
const RELAY = 'https://ntfy.sh/pz-turnaround-b53ef251972dad327450';
const KEY = 'turnaround.v1.state';
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const LANE = {
  novel: { zh: '小說', en: 'NOVEL', gate: 'N' },
  game: { zh: '遊戲', en: 'GAME', gate: 'G' },
  free: { zh: '自由', en: 'FREE', gate: 'F' },
  explore: { zh: '探索', en: 'EXPLORE', gate: 'X' },
};
const VERDICT = {
  airworthy: { zh: '適航', en: 'AIRWORTHY', st: 'done' },
  service: { zh: '需檢修', en: 'MAINTENANCE', st: 'service' },
  overhaul: { zh: '大修', en: 'OVERHAUL', st: 'cancel' },
  retire: { zh: '建議退役', en: 'RETIRE', st: 'cancel' },
};
const KIND = {
  fix: { zh: '修', name: '除錯', en: 'FIX' },
  polish: { zh: '磨', name: '打磨', en: 'POLISH' },
  cut: { zh: '減', name: '減重', en: 'CUT' },
  add: { zh: '加', name: '加裝', en: 'ADD' },
};
const WORTH = { high: '價值高', mid: '價值中', low: '價值低' };
const EFFORT = { S: '工時小', M: '工時中', L: '工時大' };
const REASONS = ['這個寫法不夠好看', '太悶', '不夠爽', '做過類似的', '不適合單人', '現在沒感覺', '太像別人的', '規模太大', '看不懂在幹嘛'];
const VERIFY = { hit: ['說中了', 'HIT'], miss: ['說錯了', 'MISS'], na: ['沒遇到', 'N/A'] };
const VERIFY_OVERALL = ['報告大致正確', '方向要調整', '漏了重要問題', '工單太保守', '工單太多', '先別動它'];
const VITALS_DEF = ['核心樂趣', '手感', '介面', '內容量', '回頭率'];
const PIREP_CHIPS = ['手感很好', '想一直玩', '太難', '太簡單', '卡關了', '有點無聊', '畫面很讚', '操作不順', '有 Bug'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtDate(s) { const d = new Date(s + 'T00:00:00'); return String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); }
const WK = ['日', '一', '二', '三', '四', '五', '六'];
const WKE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/* 塔台問候：照他「打開的時間」說，不照排程寫稿的清晨 */
const GREET_RE = /^\s*(?:痞子葳)?(?:機長)?[，,、\s]*(?:早安|午安|晚安|早上好|中午好|下午好|晚上好|您好|你好|嗨)[，。！!、,\s]*/;
const GREET_MID = /(?:痞子葳)?機長[，,]?\s*(?:早安|午安|晚安|早上好|中午好|下午好|晚上好|您好|你好)[，。！!、,\s]*/;
function isStale(date) { return !!date && date < todayStr(); }
function hello() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早安。';
  if (h >= 11 && h < 14) return '午安，吃飯了嗎？';
  if (h >= 14 && h < 18) return '下午好。';
  if (h >= 18 && h < 23) return '晚上好，辛苦一天了。';
  return '夜深了，還沒睡啊？';
}
function staleNote(date, speak) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  const which = date === ys ? '昨天' : '上一批';
  const when = new Date().getHours() < 7 ? '新的航班清晨六點多到站，' : '今天的航班還在路上，';
  return when + (speak ? '先為您重播' + which + '的航班廣播。' : '下面先看' + which + '這幾班。');
}
function towerText(day, live) {
  const body = (day.tower || '').replace(GREET_RE, '');
  if (!live) return body;
  return '痞子葳機長，' + hello() + (isStale(day.date) ? staleNote(day.date) : '') + body;
}
function announceText(day) {
  const g = '痞子葳機長，' + hello() + (isStale(day.date) ? staleNote(day.date, true) : '');
  const t = day.announce || day.tower || '';
  if (GREET_MID.test(t)) return t.replace(GREET_MID, g);
  if (GREET_RE.test(t)) return t.replace(GREET_RE, g);
  const m = t.match(/^[^。]*各位旅客[^。]*。/);
  return m ? m[0] + g + t.slice(m[0].length) : g + t;
}
function dayLabel(s) { const d = new Date(s + 'T00:00:00'); return fmtDate(s) + '（' + WK[d.getDay()] + '）'; }
function reduced() { return S.settings.fx === 'calm' || matchMedia('(prefers-reduced-motion: reduce)').matches; }

/* ---------- 狀態 ---------- */
const DEF = () => ({
  dev: 'd' + Math.random().toString(36).slice(2, 8),
  seq: 0,
  votes: {}, // flightId -> {v, reasons, note, t}
  routes: {}, // flightId -> routeId
  flights: {}, // flightId -> 航班快照（給登機證夾用）
  items: {}, // inspId -> {itemId: approve|reject}
  dispatched: {}, // inspId -> t
  pireps: [], // {id, work, text, chips, t}
  notams: {}, // ruleId -> agree|disagree
  queue: [], // {work, t}
  ideas: [], // {id, lane, text, t}
  merges: [], // {id, a, b, t}
  flight: null, // 正在試飛：{work, insp, t}（回來時跳出試飛回報）
  verify: {}, // 試飛回報：inspId（沒檢修過的作品用 'w:<id>'）-> {work, items{id: hit|miss|na}, notes{id: 文字}, vitals{名稱: 1~5}, overall[], text, mins, t}
  out: [], // 還沒確認送達的事件
  sent: {}, // eventId -> 送出時間
  delivered: 0,
  introDay: '',
  seenDay: '',
  settings: { sfx: true, music: true, announce: true, fx: 'full' },
  at: '',
});
let S = DEF();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(DEF(), JSON.parse(raw)); S.settings = Object.assign(DEF().settings, S.settings || {}); } catch (e) { /* 沒有儲存空間 */ }
let saveT = 0;
function save() {
  S.at = now();
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 存不了就算了 */ }
    Cloud.push();
  }, 250);
}

/* 每一個動作都是一筆事件：本機記一份，再送去塔台（每天的排程讀它） */
function emit(type, data) {
  S.seq += 1;
  const ev = Object.assign({ id: S.dev + '-' + S.seq, t: now(), type }, data);
  S.out.push(ev);
  if (S.out.length > 400) S.out = S.out.slice(-400);
  save();
  Sync.soon();
  return ev;
}

/* ---------- 塔台同步（網頁版：經由轉發站，GitHub 每小時收進 data/inbox.json） ---------- */
const Sync = {
  t: 0, state: 'ok', lastErr: 0,
  soon() { clearTimeout(this.t); this.t = setTimeout(() => this.flush(), 2500); },
  pending() { return S.out.length; },
  async flush(force) {
    if (!IS_WEB) { Cloud.push(); this.mark(); return; }
    if (!navigator.onLine) { this.mark(); return; }
    const ttl = 3 * 3600e3, nowMs = Date.now();
    const todo = S.out.filter((e) => force || !S.sent[e.id] || nowMs - Date.parse(S.sent[e.id]) > ttl);
    if (!todo.length) { this.mark(); return; }
    const chunks = []; let cur = [];
    for (const e of todo) {
      cur.push(e);
      if (JSON.stringify({ v: 1, dev: S.dev, ev: cur }).length > 3000) { cur.pop(); if (cur.length) chunks.push(cur); cur = [e]; }
    }
    if (cur.length) chunks.push(cur);
    try {
      for (const c of chunks) {
        await fetch(RELAY, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ v: 1, dev: S.dev, ev: c }) });
        const t = now(); c.forEach((e) => { S.sent[e.id] = t; });
      }
      this.lastErr = 0;
    } catch (e) { this.lastErr = Date.now(); }
    save(); this.mark();
  },
  ack(ids) {
    if (!ids || !ids.size) return;
    const before = S.out.length;
    S.out = S.out.filter((e) => !ids.has(e.id));
    const n = before - S.out.length;
    if (n) { S.delivered += n; Object.keys(S.sent).forEach((k) => { if (ids.has(k)) delete S.sent[k]; }); save(); }
    this.mark();
  },
  mark() {
    const el = $('#tower-dot'); if (!el) return;
    const p = S.out.length;
    this.state = this.lastErr && p ? 'off' : p ? 'wait' : 'ok';
    el.className = 'tower-dot ' + this.state;
    el.querySelector('span').textContent = p ? '待送 ' + p : '塔台';
  },
};

/* ---------- Claude 版：雲端存檔（db），排程也讀得到 ---------- */
const Cloud = {
  db: null, ready: false, t: 0, busy: false,
  async init() {
    if (IS_WEB || !window.claude || typeof window.claude.use !== 'function') return;
    try { this.db = await window.claude.use('db'); } catch (e) { this.db = null; }
    if (!this.db) return;
    try {
      this.ref = this.db.doc('state/main');
      const snap = await Promise.race([this.ref.get(), sleep(10000).then(() => null)]);
      if (!snap) { this.db = null; return; }
      const d = snap.exists ? snap.data() : null;
      if (d && d.state) {
        const remote = JSON.parse(d.state);
        if (!S.at || (remote.at && remote.at > S.at)) { S = Object.assign(DEF(), remote); S.settings = Object.assign(DEF().settings, remote.settings || {}); }
      }
      this.ready = true;
      if (window.App && App.refresh) App.refresh();
    } catch (e) { this.ready = true; }
  },
  push() {
    if (!this.db || !this.ready) return;
    clearTimeout(this.t);
    this.t = setTimeout(async () => {
      if (this.busy) { this.push(); return; }
      this.busy = true;
      try {
        const keep = Object.assign({}, S, { sent: {} });
        await this.ref.set({ state: JSON.stringify(keep), at: S.at, out: S.out.slice(-300) });
      } catch (e) { /* 下次再存 */ }
      this.busy = false;
    }, 1500);
  },
};

/* ---------- 聲音（全部即時合成） ---------- */
const Snd = {
  ctx: null, master: null, sfx: null, mus: null, noise: null, lastClack: 0, musT: 0, musOn: false, chordAt: 0, ci: 0, duckN: 0,
  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 舊瀏覽器 */ }
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0; this.mus.connect(this.master);
    const len = c.sampleRate; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.resume(); });
  },
  resume() { try { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); } catch (e) { /* 忽略 */ } },
  ok() { return this.ctx && S.settings.sfx; },
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  nz(t, dur, type, f, q, peak, out) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
    const g = c.createGain(); this.env(g, t, 0.002, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(out || this.sfx);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    return { s, fl, g };
  },
  tone(t, f, dur, type, peak, out, slideTo) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); this.env(g, t, 0.004, peak, dur);
    o.connect(g); g.connect(out || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  clack() {
    if (!this.ok()) return; const n = performance.now(); if (n - this.lastClack < 26) return; this.lastClack = n;
    const t = this.ctx.currentTime;
    this.nz(t, 0.022, 'bandpass', 1900 + Math.random() * 1500, 1.4, 0.16);
    this.tone(t, 900 + Math.random() * 300, 0.012, 'square', 0.012);
  },
  bell(t, f, peak, out) {
    this.tone(t, f, 1.8, 'sine', peak, out); this.tone(t, f * 2.005, 1.1, 'sine', peak * 0.32, out); this.tone(t, f * 3.01, 0.6, 'sine', peak * 0.12, out);
  },
  chime(down) {
    if (!this.ok()) return; const t = this.ctx.currentTime + 0.02;
    const ns = down ? [659.25, 523.25, 392] : [392, 523.25, 659.25];
    ns.forEach((f, i) => this.bell(t + i * 0.42, f, 0.2));
  },
  stamp() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    this.tone(t, 140, 0.18, 'sine', 0.55, null, 45);
    this.nz(t, 0.09, 'lowpass', 520, 0.8, 0.5);
    this.nz(t + 0.01, 0.05, 'bandpass', 2600, 1, 0.08);
  },
  beep(ok) {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    if (ok === false) { this.tone(t, 180, 0.22, 'sawtooth', 0.07); return; }
    this.tone(t, 1480, 0.07, 'square', 0.05); if (ok) this.tone(t + 0.1, 2220, 0.09, 'square', 0.05);
  },
  whoosh() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    const x = this.nz(t, 1.1, 'bandpass', 300, 0.9, 0.22); x.fl.frequency.exponentialRampToValueAtTime(2600, t + 1);
    this.tone(t, 90, 1.1, 'sawtooth', 0.025, null, 220);
  },
  tear() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    const x = this.nz(t, 0.3, 'highpass', 1200, 0.7, 0.16); x.fl.frequency.exponentialRampToValueAtTime(6500, t + 0.28);
  },
  tick() { if (!this.ok()) return; this.tone(this.ctx.currentTime, 2400, 0.014, 'sine', 0.05); },
  tele(n) {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    for (let i = 0; i < (n || 10); i++) this.nz(t + i * 0.045 + Math.random() * 0.02, 0.012, 'bandpass', 3000, 2, 0.08);
  },
  scan() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    this.tone(t, 70, 1.4, 'sine', 0.12); this.tone(t, 1760, 1.4, 'sine', 0.012);
    const x = this.nz(t, 1.4, 'bandpass', 800, 2, 0.04); x.fl.frequency.linearRampToValueAtTime(3000, t + 1.4);
  },
  // 背景音樂：航廈候機室的慢氛圍（四個和弦循環＋偶爾的鐘琴）
  CH: [[261.63, 329.63, 392, 493.88, 587.33], [220, 261.63, 329.63, 392, 493.88], [174.61, 220, 261.63, 329.63, 493.88], [196, 246.94, 293.66, 329.63, 440]],
  music(on) {
    if (!this.ctx) return;
    const want = on && S.settings.music;
    const t = this.ctx.currentTime;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setTargetAtTime(want ? (this.duckN ? 0.25 : 1) : 0, t, want ? 1.2 : 0.4);
    if (want && !this.musOn) { this.musOn = true; this.chordAt = t + 0.1; this.loop(); }
    if (!want && this.musOn) { this.musOn = false; clearTimeout(this.musT); }
  },
  duck(on) {
    this.duckN = Math.max(0, this.duckN + (on ? 1 : -1));
    if (this.ctx && this.musOn) this.mus.gain.setTargetAtTime(this.duckN ? 0.22 : 1, this.ctx.currentTime, 0.3);
  },
  loop() {
    if (!this.musOn || !this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    while (this.chordAt < t + 1.5) {
      const at = this.chordAt, ch = this.CH[this.ci % 4], dur = 7.6;
      ch.forEach((f, i) => {
        const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f / (i < 2 ? 2 : 1); o.detune.value = (Math.random() - 0.5) * 8;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.03, at + 2.2); g.gain.linearRampToValueAtTime(0.022, at + dur - 1.2); g.gain.linearRampToValueAtTime(0.0001, at + dur + 1.6);
        o.connect(lp); lp.connect(g); g.connect(this.mus); o.start(at); o.stop(at + dur + 1.8);
      });
      for (let k = 0; k < 3; k++) if (Math.random() < 0.75) this.bell(at + 0.9 + k * 2.3 + Math.random() * 0.6, ch[Math.floor(Math.random() * ch.length)] * 2, 0.022, this.mus);
      this.chordAt += dur; this.ci++;
    }
    this.musT = setTimeout(() => this.loop(), 900);
  },
};

/* ---------- 震動 ---------- */
let hapT = 0;
function haptic(ms = 10) {
  if (reduced()) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    if (!IOS) return;
    const n = performance.now(); if (n - hapT < 60) return; hapT = n;
    const l = document.createElement('label'); l.className = 'hap'; l.setAttribute('aria-hidden', 'true');
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    l.appendChild(i); document.head.appendChild(l); l.click(); l.remove();
  } catch (e) { /* 沒有震動 */ }
}

/* ---------- 廣播（語音） ---------- */
const Voice = {
  tts: null, speaking: false, onState: null,
  async init() {
    if (IS_WEB || !window.claude || typeof window.claude.use !== 'function') return;
    try { this.tts = await window.claude.use('tts'); } catch (e) { this.tts = null; }
  },
  pick() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices();
    return vs.find((v) => /zh[-_]TW/i.test(v.lang)) || vs.find((v) => /zh[-_]HK/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
  },
  can() { return !!this.tts || 'speechSynthesis' in window; },
  set(on) { this.speaking = on; Snd.duck(on); if (this.onState) this.onState(on); },
  async say(text) {
    this.stop();
    if (this.tts) {
      try { this.set(true); await this.tts.speak(text, { voice: 'airy' }); } catch (e) { /* 被停掉或不給說 */ }
      this.set(false); return;
    }
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; const v = this.pick(); if (v) u.voice = v; u.rate = 1.02; u.pitch = 1;
    u.onend = u.onerror = () => this.set(false);
    this.set(true); speechSynthesis.speak(u);
  },
  stop() {
    try { if (this.tts) this.tts.stop(); } catch (e) { /* 忽略 */ }
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
    if (this.speaking) this.set(false);
  },
};
if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) { /* 忽略 */ } }

/* ---------- 小工具 ---------- */
let toastT = 0;
function toast(html, ms) {
  const el = $('#toast'); el.innerHTML = html; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2600);
}
function copyText(t) {
  const done = () => true;
  try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done, () => fallback()); } catch (e) { /* 換備用 */ }
  return Promise.resolve(fallback());
  function fallback() {
    try {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
}
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function barcode(s, color) {
  let x = 0, h = hash32(s), out = '';
  for (let i = 0; i < 64; i++) { h = Math.imul(h ^ (h >>> 13), 1103515245) + 12345 >>> 0; const w = 1 + (h % 3); if (i % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + w + '" height="40"/>'; x += w + (h >>> 7) % 2 + 1; }
  return '<svg viewBox="0 0 ' + x + ' 40" preserveAspectRatio="none" fill="' + (color || '#1a1c22') + '">' + out + '</svg>';
}
const ICON = {
  plane: '<svg viewBox="0 0 24 24"><path transform="rotate(45 12 12)" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
  fly: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1zm3 5v2h10V9zm0 4v2h7v-2z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM5 7h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 2 1 21h22zm-1 7h2v6h-2zm0 8h2v2h-2z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2zm0 4h2v6h-2z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4-5.7-5 7.5-.7z"/></svg>',
  route: '<svg viewBox="0 0 24 24"><path d="M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12-12a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 15c0-6 10-3 10-9h2c0 8-10 5-10 9z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5zm-1 14-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M3 5h2v2H3zm4 0h14v2H7zM3 11h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24"><path d="M22.7 19 13.6 9.9c.9-2.3.4-5-1.5-6.9C10.1 1 7.1.6 4.7 1.7L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M2 21 23 12 2 3v7l15 2-15 2z"/></svg>',
  merge: '<svg viewBox="0 0 24 24"><path d="M7 3v6.6l5 5V21h2v-7.2l-5-5V3zm10 0v6h-2l3 4 3-4h-2V3z"/></svg>',
};
