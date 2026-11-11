// 整條主線的自動流程。V：{ name, rules:[選項關鍵字…], bounty:bool, skipSide:bool }
window.playAll = async function (V) {
  const D = DRV, need = (c, msg) => { if (!c) throw new Error('CHECK FAILED: ' + msg); }, f = () => G.flags;
  D.setup(); D.rules = V.rules || [];
  document.querySelector('#title .bt[data-k=new]').click(); await D.sleep(200); await D.waitIdle();
  const side = !V.skipSide;
  // ── 序 ──
  need(Z.id === 'vault', 'start in vault');
  await D.enc('z0a'); await D.enc('z0b'); need(G.party.yuan.active, 'yuan joined');
  if (side) { await D.use('v_c1'); await D.goto(25, 25, .6); }
  await D.goto(2, 2, .5); await D.sleep(50); await D.waitIdle(); need(Z.id === 'camp', 'reached camp, in ' + Z.id); need(f().camp_intro, 'camp intro');
  await D.rest(); D.gear();
  // ── 骸骨坡 ──
  await D.go('slope'); need(f().slope_intro, 'slope intro');
  await D.enc('s1'); if (side) await D.use('s_c1'); await D.enc('s2'); await D.use('hammer_trapped'); need(f().r_hammer, 'hammer');
  if (side) { await D.goto(20, 33, .6); await D.use('s_c2'); await D.use('s_fire'); }
  D.gear(); await D.enc('s3'); if (side) await D.goto(34, 14, .6);
  await D.enc('s4'); need(f().warden_hesitated, 'first warden scene'); if (side) await D.use('s_c3');
  D.gear(); if (!V.skipLedger) { await D.enc('s5'); need(f().c1_done, 'c1'); }
  await D.rest(); D.gear(); await D.go('slope');
  await D.enc('s6'); need(f().threejaw_dead, 'threejaw'); await D.use('s_seat'); need(f().piece1 && G.party.wei.ultOk, 'courtbox');
  if (side) { await D.use('s_hook'); await D.use('s_gold'); await D.use('s_hook_b'); }
  await D.rest(); D.gear();
  // ── 鏽錨集 ──
  await D.go('market'); await D.goto(16, 22, 1); need(f().market_seen, 'market seen');
  await D.use('scale'); need(f().scale_met, 'scale met'); await D.use('ear_m'); await D.use('luo_gate'); need(G.party.luo.active, 'luo joined');
  if (f().has_debtbook) { if (V.sellBook) await D.use('toll'); else await D.use('scale'); need(!f().has_debtbook, 'debtbook handled'); }
  if (side) { await D.goto(24, 21, .6); await D.use('vill1'); await D.use('vill2'); await D.use('vill3'); }
  await D.rest(); D.gear();
  if (V.bounty) { flag('b07_on'); await D.go('slope'); await D.enc('sb'); await D.rest(); D.gear(); }
  // ── 沉油渠 ──
  await D.go('sump'); await D.enc('o1'); if (side) { await D.use('o_c1'); await D.goto(28, 35, .6); }
  await D.enc('o2'); if (side) await D.use('o_gold'); D.gear();
  await D.use('o_fire'); await D.enc('o3'); await D.enc('o4'); await D.use('zhu_trapped'); need(f().r_zhu, 'zhu');
  if (side) { await D.goto(15, 20, .6); await D.use('o_c2'); }
  await D.rest(); D.gear(); await D.go('sump');
  await D.goto(11, 10, 1); need(f().saw_memorial, 'memorial'); await D.use('luchen'); need(f().met_luchen, 'luchen');
  await D.use('stele'); need(f().piece2, 'piece2'); if (side) { await D.goto(5, 11, .6); await D.use('elder_tether'); }
  await D.use('sluice'); await D.sleep(50); await D.waitIdle();
  if (f().elder_fight && !f().c2_done) { await D.enc('o5'); }
  need(f().c2_done, 'c2 done (oil)'); await D.rest(); D.gear();
  await D.go('market'); await D.use('scale'); need(f().scale_reported, 'reported');
  if (V.bounty) { flag('bcity_on'); await D.go('sump'); await D.enc('ob'); await D.rest(); D.gear(); }
  // ── 懸骸廊 ──
  await D.go('gallery'); await D.use('gate'); need(f().gate_done, 'gate');
  if (!f().guild_pass && !f().sneak_route) { await D.enc('h1'); await D.enc('h2'); }
  else if (f().sneak_route && side) { await D.enc('h2'); }
  if (side) await D.goto(27, 34, .6); // 殘窗第八片
  D.gear(); await D.use('g_fire'); await D.enc('h3'); await D.use('blind_pen'); need(f().r_blind, 'blind');
  await D.rest(); D.gear(); await D.go('gallery'); if (f().sneak_route) await D.goto(25, 24, 1.2);
  if (side) { await D.enc('h4'); await D.use('g_c3'); await D.goto(23, 12, .6); if (G.party.yuan.active) { await D.use('g_hook'); await D.use('g_feather'); await D.use('g_hook_b'); } }
  await D.use('ledger'); need(f().c3_done, 'c3'); if (side) await D.goto(6, 18, .6);
  await D.rest(); D.gear(); await D.go('gallery');
  await D.use('zhuo'); await D.sleep(50); await D.waitIdle();
  if (f().zhuo_fight && !f().c4_done) await D.enc('h5');
  need(f().c4_done, 'c4 done'); need(f().piece3, 'piece3');
  await D.rest(); D.gear();
  // ── 錨鏈根 ──
  await D.go('root'); await D.enc('r1'); if (side) await D.use('r_c1'); await D.enc('r2'); if (side) await D.goto(16, 32, .6);
  await D.use('r_fire'); await D.enc('r3'); if (side) { await D.use('r_gold'); await D.goto(24, 14, .6); }
  await D.rest(); D.gear(); await D.go('root');
  await D.enc('boss'); await D.sleep(50); await D.waitIdle();
  need(f().boss_done, 'boss done'); need(f().reforged, 'reforged'); need(f().vol1_done, 'vol1 done');
  await D.use('cutlink');
  return 'ok';
};
