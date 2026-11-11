// 在瀏覽器裡自動玩：對話自動過、選項照規則選、戰鬥交給機器人、走路直接快轉。
// 用法（Playwright）：注入 bot.js 與這支，然後 await DRV.run(腳本)
window.DRV = {
  rules: [], log: [], stats: { battles: [], defeats: 0, choices: [] }, fail: null,
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  idle() { return S.mode === 'explore' && !S.cut && !S.dialog && !S.panel && document.querySelector('#modal').classList.contains('hide'); },
  async waitIdle(ms) { const t0 = Date.now(); while (!this.idle()) { if (Date.now() - t0 > (ms || 90000)) throw new Error('waitIdle timeout: mode=' + S.mode + ' cut=' + S.cut + ' dlg=' + S.dialog + ' panel=' + S.panel + ' B=' + (B ? B.over + '/' + B.turns : '-')); await this.sleep(8); } },
  setup() {
    S.set.speed = 60; S.set.hints = false; openLayerMap = () => { };
    Dlg.auto = o => {
      if (o.choose) { const list = o.choose; let pick = -1;
        for (const r of DRV.rules) { const i = list.findIndex(it => it && !it.dis && (r[0] === '=' ? it.t === r.slice(1) : it.t.indexOf(r) >= 0)); if (i >= 0) { pick = i; break; } }
        if (pick < 0) { for (let i = list.length - 1; i >= 0; i--) if (list[i] && !list[i].dis) { pick = i; break; } }
        DRV.stats.choices.push((o.o && o.o.prompt ? '[' + o.o.prompt.slice(0, 8) + '] ' : '') + list.filter(Boolean).map((it, i) => it.t).join(' | ') + ' => ' + (list[pick] ? list[pick].t : '?')); return pick; }
      if (o.defeat) { DRV.stats.defeats++; DRV.lastDefeat = (DRV.lastDefeat || 0) + 1; return DRV.lastDefeat > 3 ? 'camp' : 'retry'; }
      return undefined;
    };
    heroInput = async u => { const a = botChoose(u); return { sk: a.sk, tgt: a.tgt }; };
    const bp = battlePlay; battlePlay = async (g, F, opts) => { const t0 = Date.now(); const hp0 = allHeroes().reduce((a, h) => a + h.hp, 0), mx = allHeroes().reduce((a, h) => a + h.hpMax, 0); const r = await bp(g, F, opts); const hp1 = allHeroes().reduce((a, h) => a + Math.max(0, h.hp), 0); DRV.stats.battles.push({ id: g.id, over: r, rounds: +(B.time / 100).toFixed(1), loss: Math.round((hp0 - hp1) / mx * 100), start: Math.round(hp0 / mx * 100), downs: B.stat.downs, lv: G.lv, n: allHeroes().length, links: B.stat.links, slams: B.stat.slams, ms: Date.now() - t0 }); if (r === 'win') DRV.lastDefeat = 0; return r; };
  },
  // 走到 (x, y)。途中開打或進劇情就等它結束再繼續
  async goto(x, y, near) {
    near = near || 1.0; const zid = Z.id;
    for (let k = 0; k < 14; k++) {
      await this.waitIdle(); if (Z.id !== zid) return true; const L = Z.leader; if (Math.hypot(L.x - x, L.y - y) <= near) return true;
      if (!walkTo(x, y)) { DRV.log.push('no path to ' + x + ',' + y + ' from ' + L.x.toFixed(1) + ',' + L.y.toFixed(1) + ' in ' + Z.id); return false; }
      let n = 0; while (Z.path && Z.path.length && this.idle() && n++ < 3000) { worldUpdate(.05); if (n % 40 === 0) await this.sleep(0); }
      await this.sleep(20);
    }
    await this.waitIdle(); return Z.id !== zid || Math.hypot(Z.leader.x - x, Z.leader.y - y) <= near + 1;
  },
  ent(id) { return Z.ents.find(e => e.id === id); },
  // 走過去跟某個東西互動（NPC、箱子、筆記、設施）
  async use(id) {
    await this.waitIdle(); const e = this.ent(id); if (!e) { DRV.log.push('no ent ' + id + ' in ' + Z.id); return false; } if (!entVisible(e)) { DRV.log.push('ent hidden ' + id); return false; }
    for (let k = 0; k < 8; k++) {
      await this.waitIdle(); walkTo(e.x, e.y, e); let n = 0, fired = false;
      while (this.idle() && n++ < 3000) { const g0 = Z.goal; worldUpdate(.05); if (g0 && !Z.goal && (!Z.path || !Z.path.length)) { fired = true; break; } if (!Z.path || !Z.path.length) { if (!Z.goal) break; } if (n % 40 === 0) await this.sleep(0); }
      await this.sleep(30); await this.waitIdle(); if (fired) return true;
      if (Math.hypot(Z.leader.x - e.x, Z.leader.y - e.y) < 2.2) { interact(e); await this.sleep(30); await this.waitIdle(); return true; }
    }
    DRV.log.push('could not reach ent ' + id + ' in ' + Z.id); return false;
  },
  // 去打某一場遭遇
  async enc(id) {
    await this.waitIdle(); const g = Z.groups.find(x => x.id === id); if (!g) { if (zs(Z.id).enc[id]) return true; DRV.log.push('no enc ' + id + ' in ' + Z.id); return false; }
    if (!groupActive(g)) { DRV.log.push('enc inactive ' + id); return false; }
    for (let k = 0; k < 10 && !zs(Z.id).enc[id]; k++) { if (Z.id !== ENC[id].zone) { DRV.log.push('left zone during enc ' + id + ' (now ' + Z.id + ')'); return false; } await this.goto(g.e.x - .8, g.e.y + .8, 1.2); await this.waitIdle(); }
    return !!zs(ENC[id].zone).enc[id];
  },
  async go(zone) { await this.waitIdle(); if (Z.id === zone) return; if (!G.disc[zone]) { DRV.log.push('zone locked ' + zone); throw new Error('zone locked ' + zone); } await travel(zone); await this.sleep(30); await this.waitIdle(); },
  async rest() { await this.go('camp'); restFull(); G.cons.potion = Math.max(G.cons.potion, G.flags.r_zhu ? G.beltMax : 2); for (const t of campTalks()) { await runScript(t.id); await this.waitIdle(); } },
  // 自動換上比較好的裝備（很粗的規則：稀有度高、物品等級高的優先）
  gear() { for (const id of activeIds()) for (const s of SLOTS) { const cur = G.party[id].eq[s] ? G.items[G.party[id].eq[s]] : null, sc = it => it ? it.rar * 3 + it.il + (it.leg ? 6 : 0) + (it.up || 0) : -1; let best = null; for (const uid of G.bag) { const it = G.items[uid]; if (!it || BASE[it.base].slot !== s || !canEquip(id, it)) continue; if (sc(it) > sc(best || cur)) best = it; } if (best) equipItem(id, best.uid); }
    for (const id of activeIds()) { const p = G.party[id], learned = heroSkillsAt(id, p.lv), want = id === 'wei' ? ['w_lift', 'w_slam', 'w_dash', p.lv >= 6 ? 'w_time' : 'w_rip'] : id === 'yuan' ? ['y_mark', 'y_hoist', 'y_yank', 'y_hook'] : ['l_oath', 'l_slam', 'l_mend', 'l_ram']; const a = want.filter(x => learned.includes(x)); for (const x of learned) if (a.length < 4 && !a.includes(x)) a.push(x); p.skills = a.slice(0, 4); } },
};
