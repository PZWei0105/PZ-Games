/* ===================== listening log: how long, which songs, which hours, which skins =====================
   Counted from the playing <audio> element's own clock (timeupdate keeps coming with the screen locked), so lock-screen
   listening counts too. A play counts once a song has been heard for 30 seconds (or half of a short song).
   Kept per day in the kv store: { s: seconds, n: plays, h: [24 hours], t: { songId: [seconds, plays] }, k: { skin: seconds } }. */
R.stats = (() => {
  const { bus } = R;
  let S = null, dirty = false, lastEl = null, lastCT = 0, lastId = null, run = 0, counted = false;
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  async function load() {
    try { S = await R.db.get('kv', 'stats'); } catch (e) { S = null; }
    if (!S || typeof S !== 'object' || !S.days) S = { v: 1, since: Date.now(), days: {} };
  }
  function save() { if (!S || !dirty) return; dirty = false; R.db.put('kv', S, 'stats').catch(() => {}); }
  const saveSoon = R.debounce(save, 8000);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  function tick(el) {
    if (!S) return;
    const id = el.dataset.tid;
    if (!id || el.paused || el.src === R.player.SILENT) { lastEl = null; return; }
    const cur = R.player.current(); if (!cur || cur.id !== id) return;
    const ct = el.currentTime;
    if (lastEl === el && lastId === id) {
      const d = ct - lastCT;
      if (d > 0 && d < 2.5) add(id, d);
      if (ct + 1 < lastCT) { run = 0; counted = false; } // looped, or jumped back to the start
    } else if (lastId !== id) { run = 0; counted = false; }
    lastEl = el; lastCT = ct; lastId = id;
  }
  function add(id, d) {
    const now = new Date(), k = dayKey(now);
    const day = S.days[k] || (S.days[k] = { s: 0, n: 0, h: new Array(24).fill(0), t: {}, k: {} });
    day.s += d; day.h[now.getHours()] += d;
    const tt = day.t[id] || (day.t[id] = [0, 0]); tt[0] += d;
    const sk = (R.stage.current() || {}).id; if (sk) day.k[sk] = (day.k[sk] || 0) + d;
    run += d;
    const t = R.lib.get(id), dur = (t && t.duration) || 0;
    if (!counted && (run >= 30 || (dur > 8 && run >= dur * 0.5))) { counted = true; tt[1]++; day.n++; }
    dirty = true; saveSoon();
  }
  for (const el of R.player.els) el.addEventListener('timeupdate', () => tick(el));
  bus.on('track', () => { lastEl = null; });
  // songs deleted from the library drop out of the log too
  bus.on('library', () => {
    if (!S) return;
    for (const day of Object.values(S.days)) for (const id of Object.keys(day.t)) if (!R.lib.get(id)) delete day.t[id];
  });

  /* ---------- summaries for the report ---------- */
  const PERIOD = { week: '這一週', month: '這個月', year: '今年', all: '全部' };
  function range(period) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (period === 'week') return new Date(now.getTime() - 6 * 864e5);
    if (period === 'month') return new Date(now.getTime() - 29 * 864e5);
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    return null;
  }
  function summary(period) {
    const from = range(period), fk = from ? dayKey(from) : '';
    const keys = Object.keys(S.days).filter((k) => !fk || k >= fk).sort();
    const hours = new Array(24).fill(0), tracks = new Map(), skins = new Map();
    let total = 0, plays = 0, best = null;
    for (const k of keys) {
      const d = S.days[k]; total += d.s; plays += d.n;
      d.h.forEach((v, i) => { hours[i] += v; });
      for (const [id, [s, n]] of Object.entries(d.t)) { const x = tracks.get(id) || { s: 0, n: 0 }; x.s += s; x.n += n; tracks.set(id, x); }
      for (const [sk, s] of Object.entries(d.k || {})) skins.set(sk, (skins.get(sk) || 0) + s);
      if (!best || d.s > best.s) best = { k, s: d.s };
    }
    const topTracks = Array.from(tracks.entries()).map(([id, x]) => ({ t: R.lib.get(id), s: x.s, n: x.n })).filter((x) => x.t).sort((a, b) => b.n - a.n || b.s - a.s);
    const art = new Map();
    for (const x of topTracks) { const a = (x.t.artist || '').trim() || '未知歌手'; const y = art.get(a) || { name: a, s: 0, n: 0, songs: 0 }; y.s += x.s; y.n += x.n; y.songs++; art.set(a, y); }
    const topArtists = Array.from(art.values()).sort((a, b) => b.s - a.s);
    const topSkins = Array.from(skins.entries()).map(([id, s]) => ({ def: R.skins.get(id), s })).filter((x) => x.def).sort((a, b) => b.s - a.s);
    // streak: days in a row (ending today or yesterday) with at least a minute of music
    let streak = 0; { const d = new Date(); d.setHours(0, 0, 0, 0); if (!(S.days[dayKey(d)] && S.days[dayKey(d)].s >= 60)) d.setTime(d.getTime() - 864e5); while (S.days[dayKey(d)] && S.days[dayKey(d)].s >= 60) { streak++; d.setTime(d.getTime() - 864e5); } }
    // taste, weighted by listening time
    let wb = 0, wsum = 0, minor = 0, keyed = 0, hype = 0;
    for (const x of topTracks) { const f = R.smart.feats(x.t); if (x.t.bpm) { wb += x.t.bpm * x.s; wsum += x.s; } if (x.t.mkey) { keyed += x.s; if (f.minor) minor += x.s; } hype += f.hype * x.s; }
    const night = (hours.slice(22).concat(hours.slice(0, 4)).reduce((a, b) => a + b, 0)) / (total || 1);
    const morning = hours.slice(6, 10).reduce((a, b) => a + b, 0) / (total || 1);
    const peak = hours.indexOf(Math.max(...hours));
    return {
      period, label: PERIOD[period], total, plays, days: keys.filter((k) => S.days[k].s >= 60).length, hours, peak, best,
      topTracks, topArtists, topSkins, streak, since: S.since,
      avgBpm: wsum ? Math.round(wb / wsum) : 0, minorShare: keyed ? minor / keyed : 0, hype: total ? hype / total : 0, night, morning,
    };
  }
  // a one-line music personality from the numbers
  function persona(s) {
    if (s.total < 60) return { k: 'new', name: '剛起步的探險家', icon: '🧭', line: '報告才剛開始記錄，多聽幾首，你的音樂人格就會浮現。' };
    if (s.night > 0.35) return { k: 'night', name: '午夜電台主持人', icon: '🌙', line: `你有 ${Math.round(s.night * 100)}% 的時間在深夜聽歌，城市睡了，你的耳朵還醒著。` };
    if (s.avgBpm >= 124 && s.hype > 0.55) return { k: 'speed', name: '節奏狂熱者', icon: '⚡', line: `平均 ${s.avgBpm} BPM，你的心跳大概一直在副歌裡。` };
    if (s.minorShare > 0.6) return { k: 'poet', name: '小調詩人', icon: '🖋️', line: `你聽的歌有 ${Math.round(s.minorShare * 100)}% 是小調，懂得在旋律裡找情緒。` };
    if (s.morning > 0.3) return { k: 'early', name: '晨光派', icon: '☀️', line: `一早就開播，${Math.round(s.morning * 100)}% 的音樂陪你開機。` };
    if (s.avgBpm && s.avgBpm < 96) return { k: 'slow', name: '慢活旅人', icon: '🌊', line: `平均 ${s.avgBpm} BPM，不趕路，讓旋律慢慢流過去。` };
    if (s.topSkins.length >= 5) return { k: 'fashion', name: '換膚時尚家', icon: '🎨', line: `你穿過 ${s.topSkins.length} 套 Skin，聽歌也要換心情。` };
    return { k: 'all', name: '全頻段冒險家', icon: '🎧', line: '快的慢的、亮的暗的都聽，你的歌單沒有邊界。' };
  }
  return { load, summary, persona, PERIOD, raw: () => S, flush: save, _add: (id, d) => add(id, d) };
})();
