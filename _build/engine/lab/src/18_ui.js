/* 樣品館：介面與劇情 */
PZ.scene('ui', {
  bg: '#0a0d14',
  ui: () => `${Lab.bar('介面與劇情', '同一套元件，換主題就是另一款遊戲的樣子')}
    <div class="lab-panel" data-ui>
      <div class="lab-row"><span class="lab-label">主題</span>${['night', 'ink', 'neon', 'steel', 'paper'].map((t, i) => `<button class="lab-chip cyan${i ? '' : ' on'}" data-t="${t}">${{ night: '夜', ink: '水墨', neon: '霓虹', steel: '軍事', paper: '紙' }[t]}</button>`).join('')}</div>
      <div class="lab-row"><button class="lab-chip big" data-u="say">劇情對話</button><button class="lab-chip big" data-u="ask">選擇</button><button class="lab-chip big" data-u="confirm">確認框</button><button class="lab-chip big" data-u="choose">選單</button></div>
      <div class="lab-row"><button class="lab-chip big" data-u="toast">提示</button><button class="lab-chip big" data-u="banner">大標題</button><button class="lab-chip big" data-u="boss">BOSS</button><button class="lab-chip big" data-u="settings">設定</button><button class="lab-chip big" data-u="pause">暫停選單</button></div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    box.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); PZ.ui.theme(b.dataset.t); }));
    const save = PZ.save.open('engine-lab', { version: 1, defaults: () => ({ visits: 0 }), describe: (d) => `來過 ${d.visits} 次` });
    save.data.visits++; save.write();
    const U = PZ.ui, act = {
      say: () => U.say([['魏子葳', '凌晨三點十二分，手機又亮了。'], [null, '巷口的路燈閃了兩下，像在提醒什麼。'], ['魏子葳', '……這單地址，是我自己家。'], ['老闆', '送完就收工，別多問。', { side: 'right' }]], { faces: { 魏子葳: 'face_wei' }, voices: { 老闆: 0.75 } }),
      ask: async () => { const i = await U.ask('門縫底下有光。要怎麼做？', ['直接開門', '先貼著門聽', { label: '報警', desc: '手機沒有訊號', disabled: true }], { name: '魏子葳' }); U.toast(['你推開了門。', '門的另一邊，也有人在聽。'][i]); },
      confirm: async () => { const ok = await U.confirm({ title: '確定要離開？', body: '這一局的進度會自動存檔。', ok: '離開', cancel: '再想想' }); U.toast(ok ? '你選了離開' : '你留下來了'); },
      choose: async () => { const v = await U.choose({ title: '升級三選一', options: [{ label: '貫穿彈', desc: '子彈多穿過一隻怪', value: 'a' }, { label: '急救包', desc: '回復 30% 生命', value: 'b' }, { label: '磁鐵', desc: '撿東西的範圍變大', value: 'c' }] }); if (v) { PZ.fx.celebrate(0, -40); U.toast('拿到了：' + { a: '貫穿彈', b: '急救包', c: '磁鐵' }[v], { kind: 'good' }); } },
      toast: () => U.toast('撿到 金幣 ×' + PZ.rand.int(1, 9), { kind: 'good', sound: 'coin' }),
      banner: () => U.banner('第二章', { sub: '空城的訂單' }),
      boss: () => { U.banner('BOSS 來襲', { sub: '屍王・陳師傅', style: 'boss' }); PZ.cam.shake(0.5); PZ.fx.vignette('#b0001a', 0.8, 1.2); },
      settings: () => U.settings({ save }),
      pause: () => U.pause({ items: [{ label: '回到大廳', value: 'hub', onClick: () => PZ.go('hub', null, { type: 'iris' }) }], save }),
    };
    box.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => act[b.dataset.u]()));
    // 縮放剛好 1 倍：「12px 中文字」就真的是 12px
    const lay = () => { PZ.cam.fit(Math.min(PZ.screen.w, PZ.screen.h)); PZ.cam.y = Lab.side() ? -180 : -120; PZ.cam.x = Lab.shift(); }; lay(); this.offR = PZ.on('resize', lay); this.t = 0;
    PZ.music.play('ink', { intensity: 0.3, fade: 1.5 });
  },
  exit() { PZ.ui.theme('night'); PZ.ui.closeSay(); this.offR(); },
  update(dt) { this.t += dt; },
  render(g) {
    Lab.floor(g);
    Lab.actor(g, 'hero', 0, 0, { sy: 1 + Math.sin(this.t * 2) * 0.015 });
    g.glow(0, -30, 120, 'rgba(255,181,71,.18)');
    const sizes = [12, 16, 20, 28, 36];   // 最大那行在 390 寬的手機上也要整行看得到
    let y = -300; for (const s of sizes) { g.text(`${s}px 中文字清楚嗎？`, 0, y, { size: s, align: 'center', color: '#e9eef7', weight: s > 20 ? 900 : 500 }); y += s * 1.35; }
  },
});
