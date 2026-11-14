/* ==========================================================================
   24 啟動
     PZ.start({
       id: 'last-order', title: '最後一單', version: '2.0.0',
       orientation: 'any',               // 'portrait' | 'landscape' | 'any'
       background: '#07090d',
       fit: 420,                         // 畫面短邊看得到的世界單位（相機自動縮放）
       step: 0,                          // 0＝可變步長；1/60＝固定步長
       theme: 'night' 或 { accent: '#f5a', … },
       fonts: ['PZ Sans'],               // 嵌入字型：等它載好才畫字
       settings: { music: 0.6 },         // 這款遊戲的預設設定
       binds: { fire: ['Space', 'PadA'] },
       async load(progress) { … 畫圖、定義音效 … progress(0.5) },
       scenes: { title: {...}, play: {...} },   // 也可以另外用 PZ.scene() 定義
       first: 'title',
     });
   ========================================================================== */
PZ.cfg = null;
PZ.start = async (cfg = {}) => {
  if (!HAS_DOM) throw new Error('PZ.start 需要瀏覽器');
  PZ.cfg = cfg;
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  Screen.init(cfg);
  Debug.init(cfg);
  UI.init(cfg);
  Input.init();
  if (cfg.binds) Input.bind(cfg.binds);
  // 畫質起點：手機「精細」、電腦「極致」、記憶體小的手機「平衡」；之前在這台自動降過就從那一階開始
  const start = cfg.quality != null ? cfg.quality : Env.lowMemory ? 1 : Env.mobile ? 2 : 3;
  const dev = Store.getJSON('pz.device.tier', null);
  Quality.start = start; Quality.tier = dev != null ? Math.min(start, dev + 1) : start;
  PZ.on('quality', (t, why) => { if (why === 'slow' || why === 'fast') Store.setJSON('pz.device.tier', t); });
  Settings.load(cfg.id || 'game', cfg.settings);
  if (cfg.step) Time.step = cfg.step;
  if (cfg.fit) Cam.fitSize = cfg.fit;
  if (cfg.post === false) Post.enabled = false;
  if (cfg.post && typeof cfg.post === 'object') { const p = cfg.post; for (const k in p) { if (k === 'bloom' && typeof p.bloom === 'object') Object.assign(Post.bloom, p.bloom); else Post[k] = p[k]; } }
  if (cfg.title && !document.title) document.title = cfg.title;
  Screen.measure(true);
  Gfx.create(cfg.renderer || (/[?&]c2d\b/.test(location.href) ? 'canvas2d' : 'webgl2'));
  Art.init();
  if (cfg.scenes) for (const k in cfg.scenes) PZ.scene(k, cfg.scenes[k]);
  Loop.start();
  let L = null;
  if (cfg.load) {
    L = cfg.loading === false ? null : UI.loading(cfg.title || '', '載入中');
    const progress = (p, note) => { if (L) L.progress(p, note); };
    await Text.ready(cfg.fonts || []);
    try { await cfg.load(progress); } catch (e) { reportError(e, 'load'); }
    progress(1);
  } else await Text.ready(cfg.fonts || []);
  PZ.emit('ready');
  if (L) L.done();
  if (cfg.first) await PZ.go(cfg.first, cfg.firstParams, { type: cfg.firstTransition || 'fade', time: 0.5 });
  return PZ;
};
