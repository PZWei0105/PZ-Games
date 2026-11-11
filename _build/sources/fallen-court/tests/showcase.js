// 收藏庫截圖用的擺設：tests/shots_steps.py 會把這個檔整段送進頁面，之後用 __show.xxx() 擺出要拍的畫面。
// 只在截圖時用，不會進遊戲本體。
window.__show = (() => {
  // 進區域、開打前的過場全部靜音（不然會擋住畫面）
  const mute = () => { for (const k in SCRIPTS) if (k.startsWith('pre_') || k.startsWith('arrive_') || k.startsWith('tr_') || k === 'e_boss' || k === 'e_ledger') SCRIPTS[k] = async () => { }; };
  // 一份走到中後段的進度：三個人、幾件金繼、營地的人都救回來了
  function base() {
    const t = document.querySelector('#title'); if (t) t.remove();
    newGame(); const f = G.flags;
    for (const k of ['met_yuan', 'camp_intro', 'slope_intro', 'r_hammer', 'r_blind', 'r_zhu', 'r_ear', 'market_seen', 'scale_met', 'threejaw_dead', 'piece1', 'piece2', 'c1_done', 'ledger_saved', 'warden_hesitated', 'saw_memorial', 'met_luchen', 'sump_intro', 'gallery_intro', 'shard_tip']) f[k] = 1;
    G.lv = 7; G.xp = 120; joinHero('yuan'); joinHero('luo');
    for (const id of ['wei', 'yuan', 'luo']) G.party[id].lv = 7;
    G.party.wei.skills = ['w_lift', 'w_slam', 'w_dash', 'w_time']; G.party.wei.ultOk = true; G.party.wei.tal = { w3a: 1, w5b: 1 }; G.party.yuan.tal = { y3b: 1 }; G.pieces = 2;
    rnd = mulberry32(77);
    for (let i = 0; i < 9; i++) giveItem(genItem({ il: 5 + (i % 3), rar: [1, 2, 3, 1, 2, 0, 3, 2, 1][i], party: ['wei', 'yuan', 'luo'] }));
    for (const k of ['collar', 'chair', 'patchrobe']) giveItem(genLegend(k));
    equipItem('wei', G.bag.find(u => G.items[u].leg === 'collar')); equipItem('yuan', G.bag.find(u => G.items[u].leg === 'chair'));
    rnd = Math.random;
    G.coin = 486; G.scrap = 34; G.dust = 6; G.lacquer = 2; G.cons = { potion: 3, fire: 1, float: 2 }; G.shards = [1, 2, 3, 5, 8, 9]; G.aff = { yuan: 5, luo: 3 }; G.rep = { ji: 2, bang: -1, shou: 0 };
    for (const z of ['camp', 'slope', 'market', 'sump', 'gallery', 'root']) G.disc[z] = 1;
    for (const k of ['hound', 'spitter', 'crab', 'warden', 'drone', 'threejaw', 'unmoored', 'moss']) G.seenFoe[k] = 1;
    deed('最底下的窖裡，有一個人醒了過來。岑鳶把他領了回去。'); deed('坡上，他救了繩幫的收稅人，換岑鳶的三頁帳。'); deed('墜碑上有他的名字。刻了三百年了。');
    for (const id of ['wei', 'yuan', 'luo']) G.party[id].hp = heroNow(id).hpMax;
    S.set.hints = false; S.set.gfx = 'hi'; resize(); mute(); enterZone('camp'); hudMode('explore'); camSnap();
    return 'ok';
  }
  const quiet = () => { UI.toast.innerHTML = ''; const z = document.querySelector('#ztitle'); if (z) z.remove(); return 'ok'; };
  const walk = (x, y) => { walkTo(x, y); return 'ok'; };
  // 探索的截圖：敵人看到也不開打（拍完要 calm(false) 還原，後面的戰鬥才打得起來）
  const _engage = engage, _sees = groupSees; const calm = on => { engage = on ? (async () => { }) : _engage; groupSees = on ? (() => false) : _sees; return 'ok'; };
  // 鏡頭：人站在畫面多高的地方（預設 .52）、拉遠拉近
  const frame = (cy, zk) => { Cam.tcy = Cam.cy = cy; S.zoomK = zk || 1; Cam.tzoom = baseZoom(); camSnap(); return 'ok'; };
  function zone(z, x, y, zk) { mute(); S.cut = 0; if (!Z || Z.id !== z) enterZone(z); for (const e of Z.ents) if (e.k === 'trigger') e.done = true; hudMode('explore'); teleport(x, y); S.zoomK = zk || 1; Cam.tzoom = baseZoom(); camSnap(); return 'ok'; }
  // 鏡頭不跟人，改看 (x, y)（要先停住人：這時候世界不會動）
  function look(x, y) { S.cut = 1; Cam.tx = x; Cam.ty = y; Cam.tz = tileH(x, y); camSnap(); return 'ok'; }
  // 開一場戰鬥（不等它打完）。first：讓這個人第一個動（'wei'／'yuan'／'luo'）
  function battle(enc, first) {
    mute(); calm(false); for (const k of ['b07_on', 'bcity_on', 'zhuo_fight', 'elder_fight']) flag(k);
    for (const id of activeIds()) G.party[id].hp = heroNow(id).hpMax;
    const z = ENC[enc].zone, old = B; zs(z).enc = {}; enterZone(z); hudMode('explore'); const gp = Z.groups.find(x => x.id === enc); teleport(gp.e.x - 3, gp.e.y + 3); engage(gp, 0);
    if (first) { let n = 0; const iv = setInterval(() => { if (n++ > 200) clearInterval(iv); if (B && B !== old) { clearInterval(iv); const u = B.units.find(x => x.hero === first); if (u) { u.t = Math.min(...B.units.filter(x => !x.object).map(x => x.t)) - 2; uiBattleRefresh(); } } }, 15); }
    return 'ok';
  }
  // 大家的勢補到 n 格（招式才按得下去）
  function mom(n) { for (const u of allHeroes()) u.mom = n; renderCmds(); uiBattleRefresh(); return 'ok'; }
  const hero = () => (BI ? BI.u.hero : null);
  // 輪到自己人時：選招（id 或名字的一部分）、選第幾個目標（-1＝最後一個），confirm＝直接出手
  function act(sk, ti, confirm) {
    if (!BI) return 'not yet';
    const c = BI.cmds.find(x => !x.no && (x.sk.id === sk || x.sk.n.includes(sk))); if (!c) return 'no skill ' + sk + ' in ' + BI.cmds.filter(x => !x.no).map(x => x.sk.id).join(',');
    pickCmd(c); const T0 = skillTargets(BI.u, c.sk); if (T0.units.length) setPick(T0.units[ti < 0 ? T0.units.length + ti : Math.min(ti || 0, T0.units.length - 1)]);
    if (confirm) confirmAct(); return 'ok ' + c.sk.n;
  }
  function charge() { for (const u of allHeroes()) { u.mom = 5; u.ultOk = true; } B.reso = B.resoMax; renderCmds(); uiBattleRefresh(); return 'ok'; }
  function talk(who, text, opt) { S.cut++; say(who, text, opt); return 'ok'; }
  function pick(list) { choose(list); return 'ok'; }
  function done() { try { endTalk(); } catch (e) { /* ignore */ } S.cut = 0; return 'ok'; }
  return { base, quiet, zone, walk, look, calm, frame, battle, mom, hero, act, charge, talk, pick, done, mute };
})();
'ok';
