/* ===================== settings sheet ===================== */
R.settingsUI = (() => {
  const { $, $$, esc, I, settings } = R;
  const sw = (k) => `<button type="button" class="sw${settings.get(k) ? ' on' : ''}" data-sw="${k}" role="switch" aria-checked="${!!settings.get(k)}"></button>`;
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${k}" data-v="${v}" class="${String(settings.get(k)) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const ENG = { single: '單軌換帶', dual: '雙軌接力' };

  async function html() {
    const est = await R.db.estimate();
    const pers = await R.db.persisted();
    const used = est && est.usage ? est.usage / 1048576 : 0;
    const quota = est && est.quota ? est.quota / 1048576 : 0;
    const fmtMB = (m) => (m > 1024 ? (m / 1024).toFixed(1) + ' GB' : Math.round(m) + ' MB');
    const ds = R.player.diag.stats();
    const eng = R.player.engine();
    const lat = settings.get('latency') || 0;
    const left = R.analysis.left();
    const where = R.CLAUDE ? '這是 Claude 上的版本：歌存在這個瀏覽器裡，可能不會一直留著，也不能鎖屏一直聽。長期使用請開網頁版 ' + R.WEB_URL + '，再加到主畫面。' : R.embedded ? '你現在是從《PZ 遊戲收藏》裡打開的。' + (R.isIOS ? '想鎖屏也一直聽，建議把「耳目一新」單獨加到主畫面（在 iPhone 上，它的歌庫跟這裡是分開的）。' : R.isAndroid || R.isTouch ? '想鎖屏也一直聽，建議把「耳目一新」單獨加到主畫面。' : '想單獨開，可以用瀏覽器打開它，再安裝成 App。') : R.standalone ? '已經是獨立 App，鎖屏控制、背景播放都會用到。' : R.isIOS ? '用 Safari 的「分享 → 加入主畫面」，就會變成獨立 App，鎖屏繼續播。' : R.isAndroid ? '用 Chrome 選單（⋮）的「加到主畫面」或「安裝應用程式」，就會變成獨立 App，離線也能開。' : '可以安裝成 App（網址列右側的安裝圖示），離線也能開。';
    return `<div class="sh-head"><h3>設定</h3><button type="button" class="ib" data-act="sheet-close" aria-label="關閉">${I.close}</button></div>
    <div class="sc">
      <div class="sec-t">播放</div>
      <div class="set-g">
        <div class="set-r set-col"><div class="lb"><b>鎖屏連播方式</b><small>iPhone 鎖住螢幕時換下一首比較容易斷。「自動」會先用單軌換帶，偵測到沒接上就自己改成雙軌接力。目前使用：<b style="display:inline;color:var(--accent)">${ENG[eng]}</b></small></div>${seg('engine', [['auto', '自動（推薦）'], ['single', '單軌換帶'], ['dual', '雙軌接力']])}</div>
        <div class="set-r set-col"><div class="lb"><b>鎖屏換歌紀錄</b><small>${ds.total ? `背景換歌 ${ds.total} 次：接上 ${ds.ok} 次、沒接上 ${ds.fail} 次${ds.bgpause ? `；被系統暫停 ${ds.bgpause} 次` : ''}` : '還沒有鎖屏換歌的紀錄。鎖住螢幕聽完一首，這裡就會記下有沒有接上。'}</small></div></div>
        <div class="set-r set-col"><div class="lb"><b>畫面跟聲音對拍</b><small>戴藍牙耳機時，如果畫面比聲音快，往右調。現在：${lat > 0 ? '+' : ''}${lat} 毫秒</small></div><input type="range" min="-200" max="400" step="10" value="${lat}" data-range="latency" aria-label="畫面延遲"></div>
        ${R.isIOS ? '' : `<div class="set-r set-col"><div class="lb"><b>音量</b></div><input type="range" min="0" max="1" step="0.01" value="${settings.get('volume')}" data-range="volume" aria-label="音量"></div>`}
      </div>
      <div class="sec-t">聲光</div>
      <div class="set-g">
        <div class="set-r"><div class="lb"><b>介面音效</b><small>按鈕、換 Skin 的音效，每套 Skin 的聲音都不一樣</small></div>${sw('sfx')}</div>
        <div class="set-r set-col"><div class="lb"><b>介面音效音量</b></div><input type="range" min="0" max="1" step="0.05" value="${settings.get('sfxVol')}" data-range="sfxVol" aria-label="介面音效音量"></div>
        <div class="set-r"><div class="lb"><b>閃光特效</b><small>重拍時的故障閃爍、爆閃；怕刺眼可以關掉</small></div>${sw('flash')}</div>
        <div class="set-r set-col"><div class="lb"><b>畫質</b><small>「自動」在手機變慢時會自己降一點解析度</small></div>${seg('quality', [['auto', '自動'], ['high', '最高'], ['low', '省電']])}</div>
      </div>
      <div class="sec-t">換膚</div>
      <div class="set-g">
        <div class="set-r set-col"><div class="lb"><b>換膚方式</b><small>歌單如果綁了 Skin，播那個歌單時一律穿它</small></div>${seg('skinMode', [['fixed', '固定一套'], ['shuffle', '每首換一套']])}</div>
        <div class="set-r"><div class="lb"><b>打開衣櫃</b><small>左右滑就能用正在播的歌試穿</small></div><button type="button" class="chipb pri" data-act="wardrobe">${I.hanger}衣櫃</button></div>
      </div>
      <div class="sec-t">儲存空間</div>
      <div class="set-g">
        <div class="set-r set-col"><div class="lb"><b>${R.lib.count()} 首歌 · 用了 ${fmtMB(used)}</b><small>${quota ? `這台裝置大約還能放 ${fmtMB(Math.max(0, quota - used))}。` : ''}歌放在這個 App 裡，不用網路也能聽。${left ? `還有 ${left} 首在分析節奏。` : ''}</small></div>${quota ? `<div class="meter"><i style="width:${Math.min(100, (used / quota) * 100).toFixed(1)}%"></i></div>` : ''}</div>
        <div class="set-r"><div class="lb"><b>防止被系統清掉</b><small>${pers ? '已開啟：瀏覽器不會自動清掉你的歌。' : '向瀏覽器申請保留這些歌（加到主畫面後最穩）。'}</small></div>${pers ? `<span style="color:var(--accent)">${I.check}</span>` : '<button type="button" class="chipb" data-s="persist">申請</button>'}</div>
        <div class="set-r"><div class="lb"><b>放一首示範曲</b><small>現場合成的一首 56 秒電子樂，有安靜段落也有爆點，試 Skin 用</small></div><button type="button" class="chipb" data-s="demo">${I.sparkle}加入</button></div>
        <div class="set-r"><div class="lb"><b>清空歌庫</b><small>刪掉 App 裡所有的歌、歌單和設定（原始檔不受影響）</small></div><button type="button" class="chipb" data-s="wipe" style="color:#ff8a8a">${I.trash}清空</button></div>
      </div>
      <div class="sec-t">加到主畫面</div>
      <div class="set-g"><div class="set-r"><div class="lb"><small style="font-size:13.5px;color:rgba(255,255,255,.75)">${esc(where)}</small></div></div></div>
      <div class="about"><b>耳目一新 RESKIN</b><br>痞子葳的換膚音樂播放器 · 版本 ${esc(R.VERSION)}<br>空白鍵播放／暫停 · ← → 快轉 · Shift + ← → 換歌 · S 衣櫃 · L 歌庫 · F 派對 · H 最愛 · Y 歌詞</div>
    </div>`;
  }
  let open = false;
  async function show() {
    const h = await html();
    R.ui.openSheet(h, { kind: 'settings', onClose: () => { open = false; } });
    open = true;
  }
  async function refresh() { if (R.ui.sheetKind() !== 'settings') return; const sc = $('.sc', R.ui.body()); const top = sc ? sc.scrollTop : 0; R.ui.body().innerHTML = await html(); const s2 = $('.sc', R.ui.body()); if (s2) s2.scrollTop = top; }

  document.addEventListener('click', async (e) => {
    if (R.ui.sheetKind() !== 'settings') return;
    const b = R.ui.body(); if (!b.contains(e.target)) return;
    const s = e.target.closest('[data-sw]');
    if (s) { const k = s.dataset.sw; settings.set(k, !settings.get(k)); s.classList.toggle('on', !!settings.get(k)); s.setAttribute('aria-checked', String(!!settings.get(k))); R.sfx.play('toggle'); return; }
    const g = e.target.closest('[data-seg]');
    if (g) {
      settings.set(g.dataset.seg, g.dataset.v); R.sfx.play('toggle');
      if (g.dataset.seg === 'engine' && g.dataset.v === 'auto') settings.set('engineWarned', false);
      if (g.dataset.seg === 'quality') R.bus.emit('quality');
      refresh(); return;
    }
    const a = e.target.closest('[data-s]');
    if (!a) return;
    if (a.dataset.s === 'persist') { const ok = await R.db.persist(); R.toast(ok ? '已開啟，瀏覽器不會自動清掉你的歌' : (R.isIOS && !R.standalone ? '先加到主畫面，iPhone 才會保留' : '瀏覽器沒有答應，常用它就會比較穩')); refresh(); }
    else if (a.dataset.s === 'demo') { R.ui.closeSheet(true); R.app.addDemo(); }
    else if (a.dataset.s === 'wipe') {
      if (await R.ui.confirm({ title: '清空整個歌庫？', sub: '所有歌、歌單和設定都會刪掉，無法復原。手機或電腦裡的原始檔不會受影響。', ok: '全部清空', danger: true })) {
        R.player.pause(); await R.lib.wipe(); location.reload();
      }
    }
  });
  document.addEventListener('input', (e) => {
    if (R.ui.sheetKind() !== 'settings') return;
    const r = e.target.closest('[data-range]'); if (!r) return;
    const k = r.dataset.range, v = parseFloat(r.value);
    settings.set(k, v);
    if (k === 'volume') R.player.setVolume(v);
    if (k === 'latency') { const lb = r.parentNode.querySelector('small'); if (lb) lb.textContent = `戴藍牙耳機時，如果畫面比聲音快，往右調。現在：${v > 0 ? '+' : ''}${v} 毫秒`; }
  });
  document.addEventListener('change', (e) => { if (R.ui.sheetKind() === 'settings' && e.target.closest('[data-range="sfxVol"]')) R.sfx.play('tap'); });
  return { show, refresh };
})();
