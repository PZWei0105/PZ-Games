// 戰鬥邏輯（與畫面分開）：輸入一串指令，輸出一串事件；固定亂數種子，同一串指令每次算出一樣的結果
import { SKILLS, ULTS, CHARS, ENEMIES, MOVES, ITEMS, WEAPONS, ACCESSORIES, statsAt } from './data.js';

export function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const MAXL = 5;

export class Battle {
  constructor(o) {
    this.rand = mulberry(o.seed ?? 12345);
    this.phase = o.phase || 'D';
    this.phaseLen = o.phaseLen || 3;
    this.counter = this.phaseLen;
    this.round = 1;
    this.lampUsed = false;
    this.units = [];
    this.uidN = 1;
    this.flags = o.flags || {};
    this.noEscape = !!o.noEscape;
    this.isBoss = !!o.boss;
    this.meal = o.meal || null;
    this.loot = { exp: 0, gold: 0, items: [] };
    this.stolen = [];
    this.over = null;
    this.turnLog = [];
    for (const m of o.party) this.addParty(m);
    for (const e of o.enemies) this.addEnemy(e);
    this.preempt = !!o.preempt;
    this.order = []; this.nextOrder = [];
  }
  addParty(m) {
    const c = CHARS[m.id];
    const lv = c.fixedLv || m.lv;
    const s = statsAt(m.id, lv);
    const w = WEAPONS[m.weapon] || {};
    const star = m.star || 1;
    s.atk += (w.atk || 0) + (star - 1) * 3; s.mag += (w.mag || 0) + (star - 1) * 2;
    const acc = ACCESSORIES[m.acc] || {};
    for (const [k, v] of Object.entries(acc.mod || {})) if (s[k] != null) s[k] += v;
    const maxHp = s.hp;
    const u = {
      uid: this.uidN++, side: 'party', id: m.id, name: c.name, lv, ...s, maxHp, hp: Math.min(maxHp, m.hp ?? maxHp),
      lumen: 1, ult: m.ult || 0, buffs: [], taunt: 0, ko: (m.hp ?? maxHp) <= 0, engr: m.engr || [], accMod: acc.mod || {}, afterglow: 0, defended: false,
      skills: CHARS[m.id].skills.filter(([k, l]) => lv >= l).map(([k]) => k), ctrl: m.ctrl || 'local', guest: !!c.guest,
    };
    if (u.engr.includes('e_swift')) u.lumen += 1;
    if (this.meal?.lumen) u.lumen += this.meal.lumen;
    if (this.meal?.ult) u.ult = Math.min(100, u.ult + this.meal.ult);
    this.units.push(u);
    return u;
  }
  addEnemy(id) {
    const e = ENEMIES[id];
    const u = {
      uid: this.uidN++, side: 'enemy', id, name: e.name, lv: e.lv, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def, mag: e.mag, res: e.res, spd: e.spd,
      guard: e.guard, guardMax: e.guard, weak: e.weak, revealed: { L: new Set(), D: new Set() }, broken: 0, buffs: [], charge: null, ko: false, turns: 0, boss: e.boss, art: e.art,
    };
    // 同名敵人加上 A B
    const same = this.units.filter((x) => x.side === 'enemy' && x.id === id);
    if (same.length) { if (same.length === 1 && !same[0].name.endsWith('A')) same[0].name += ' A'; u.name += ' ' + 'ABCD'[same.length]; }
    this.units.push(u);
    return u;
  }
  get party() { return this.units.filter((u) => u.side === 'party'); }
  get enemies() { return this.units.filter((u) => u.side === 'enemy'); }
  alive(side) { return this.units.filter((u) => u.side === side && !u.ko); }
  byId(uid) { return this.units.find((u) => u.uid === uid); }
  r() { return this.rand(); }
  phaseKey() { return this.phase; }

  calcOrder() {
    return this.units.filter((u) => !u.ko).map((u) => ({ u, s: this.spdOf(u) * (0.9 + this.r() * 0.2) + (this.round === 1 && this.preempt && u.side === 'party' ? 1000 : 0) }))
      .sort((a, b) => b.s - a.s).map((x) => x.u.uid);
  }
  spdOf(u) { return u.spd * (1 + this.buffSum(u, 'spd')); }
  buffSum(u, stat) { return u.buffs.filter((b) => b.stat === stat).reduce((s, b) => s + b.amt, 0); }

  start() {
    const ev = [];
    this.order = this.calcOrder();
    this.nextOrder = this.calcOrderPreview();
    if (this.preempt) ev.push({ t: 'text', text: '先制！我方先動', kind: 'good' });
    for (const u of this.party) if (u.engr.includes('e_sight')) for (const e of this.enemies) this.revealOne(e, ev);
    // 沒有弱點的相位直接標示
    ev.push({ t: 'round', round: this.round });
    return ev;
  }
  calcOrderPreview() {
    // 預告下一輪（用目前的速度，不消耗亂數）
    return this.units.filter((u) => !u.ko).sort((a, b) => this.spdOf(b) - this.spdOf(a)).map((u) => u.uid);
  }
  revealOne(e, ev) {
    const k = this.phase;
    const unknown = e.weak[k].filter((t) => !e.revealed[k].has(t));
    if (!unknown.length) return false;
    const t = unknown[Math.floor(this.r() * unknown.length)];
    e.revealed[k].add(t);
    ev.push({ t: 'reveal', target: e.uid, type: t, phase: k });
    return true;
  }

  // 取得下一個行動者（自動處理回合結束、失衡跳過、蓄力倒數）
  next() {
    const ev = [];
    for (let guard = 0; guard < 50; guard++) {
      if (this.over) return { unit: null, ev };
      if (!this.order.length) this.endRound(ev);
      if (this.over) return { unit: null, ev };
      const uid = this.order.shift();
      const u = this.byId(uid);
      if (!u || u.ko) continue;
      if (u.side === 'enemy' && u.broken >= this.round) { ev.push({ t: 'skip', who: u.uid }); u.acted = true; continue; }
      u.acted = true;
      // 回合開始
      if (u.side === 'party') {
        const gain = 1 + (u.defended ? 1 : 0) + (u.accMod.lumenChance && this.r() < u.accMod.lumenChance ? 1 : 0);
        u.defended = false;
        const before = u.lumen;
        u.lumen = Math.min(MAXL, u.lumen + (this.round === 1 && !u.turnedOnce ? 0 : gain));
        u.turnedOnce = true;
        if (u.lumen !== before) ev.push({ t: 'lumen', who: u.uid, v: u.lumen });
      }
      if (u.side === 'enemy') u.turns++;
      if (u.charge) {
        u.charge.turns--;
        if (u.charge.turns <= 0) {
          const mv = u.charge.move; u.charge = null;
          ev.push({ t: 'unleash', who: u.uid, move: mv });
          this.doEnemyMove(u, mv, ev, true);
          this.checkEnd(ev);
          continue;
        }
        ev.push({ t: 'charging', who: u.uid, turns: u.charge.turns, move: u.charge.move });
        continue;
      }
      return { unit: u, ev };
    }
    return { unit: null, ev };
  }

  endRound(ev) {
    // 狀態倒數
    for (const u of this.units) {
      u.buffs = u.buffs.filter((b) => --b.turns > 0);
      if (u.taunt > 0) u.taunt--;
      if (u.side === 'enemy' && u.broken && u.broken <= this.round && !u.ko) { u.broken = 0; u.guard = u.guardMax; ev.push({ t: 'recover', who: u.uid, guard: u.guard }); }
      if (u.side === 'party' && !u.ko && this.meal?.regen) { const h = Math.round(u.maxHp * this.meal.regen); u.hp = Math.min(u.maxHp, u.hp + h); ev.push({ t: 'heal', target: u.uid, amt: h, quiet: true }); }
    }
    this.counter--;
    if (this.counter <= 0) this.flip(this.phase === 'L' ? 'D' : 'L', 'cycle', ev);
    this.round++;
    this.lampUsedRound = false;
    for (const u of this.units) u.acted = false;
    this.order = this.calcOrder();
    this.nextOrder = this.calcOrderPreview();
    ev.push({ t: 'round', round: this.round });
  }

  flip(to, by, ev) {
    if (to === this.phase) { this.counter = this.phaseLen; return; }
    this.phase = to;
    this.counter = this.phaseLen;
    this.lampUsed = false;
    ev.push({ t: 'phase', to, by });
    for (const u of this.alive('party')) {
      const per = u.engr.includes('e_afterglow') ? 0.3 : 0.2;
      const ag = Math.min(1, u.lumen * per);
      if (ag > 0) { u.afterglow = ag; ev.push({ t: 'afterglow', who: u.uid, v: ag }); }
      if (u.engr.includes('e_tide')) { const h = Math.round(u.maxHp * 0.1); u.hp = Math.min(u.maxHp, u.hp + h); ev.push({ t: 'heal', target: u.uid, amt: h }); }
    }
  }

  // 可用技能（依目前相位）
  skillsOf(u) {
    return u.skills.map((k) => ({ k, s: SKILLS[k] })).filter((x) => !x.s.basic);
  }
  canUse(u, k) {
    const s = SKILLS[k];
    if (!s) return false;
    if (s.phase !== 'A' && s.phase !== this.phase) return false;
    return u.lumen >= (s.cost || 0);
  }

  // 玩家／電腦指令
  act(u, cmd) {
    const ev = [];
    if (this.over || !u || u.ko) return ev;
    if (cmd.type === 'skill') {
      const s = SKILLS[cmd.id];
      if (!s || !this.canUse(u, cmd.id)) return ev;
      u.lumen -= s.cost || 0;
      if (s.cost) ev.push({ t: 'lumen', who: u.uid, v: u.lumen });
      this.useSkill(u, s, cmd, ev, cmd.id);
    } else if (cmd.type === 'defend') {
      u.defended = true;
      u.buffs.push({ stat: 'guarding', amt: 1, turns: 1 });
      ev.push({ t: 'defend', who: u.uid });
      this.ultGain(u, 4, ev);
    } else if (cmd.type === 'lamp') {
      if (this.lampUsed || u.lumen < 2) return ev;
      u.lumen -= 2; this.lampUsed = true;
      ev.push({ t: 'lumen', who: u.uid, v: u.lumen });
      ev.push({ t: 'act', who: u.uid, name: '轉燈', fx: 'lamp' });
      this.flip(this.phase === 'L' ? 'D' : 'L', 'lamp', ev);
    } else if (cmd.type === 'item') {
      this.useItem(u, cmd, ev);
    } else if (cmd.type === 'ult') {
      if (u.ult < 100) return ev;
      u.ult = 0; ev.push({ t: 'ult', who: u.uid, v: 0 });
      this.useUlt(u, cmd, ev);
    } else if (cmd.type === 'flee') {
      if (this.noEscape) { ev.push({ t: 'text', text: '逃不掉！' }); }
      else if (this.r() < 0.75) { ev.push({ t: 'flee', ok: true }); this.over = 'flee'; ev.push({ t: 'end', result: 'flee' }); return ev; }
      else ev.push({ t: 'flee', ok: false, text: '沒逃掉！' });
    } else if (cmd.type === 'enemy') {
      this.doEnemyMove(u, cmd.move, ev, false, cmd.targets);
    }
    u.afterglow = cmd.type === 'skill' || cmd.type === 'ult' ? 0 : u.afterglow;
    this.checkEnd(ev);
    return ev;
  }

  targetsFor(u, s, cmd) {
    const foes = this.alive(u.side === 'party' ? 'enemy' : 'party');
    const friends = this.alive(u.side);
    if (s.target === 'enemy') { const t = this.byId(cmd.targets?.[0]); return [t && !t.ko ? t : foes[0]].filter(Boolean); }
    if (s.target === 'enemies') return foes;
    if (s.target === 'allies') return friends;
    if (s.target === 'ally') { const t = this.byId(cmd.targets?.[0]); return [t || u]; }
    if (s.target === 'self') return [u];
    return foes;
  }

  useSkill(u, s, cmd, ev, key) {
    const targets = this.targetsFor(u, s, cmd);
    ev.push({ t: 'act', who: u.uid, name: s.basic ? null : s.name, skill: key, fx: s.fx, targets: targets.map((t) => t.uid), kind: s.kind });
    if (s.kind === 'heal') {
      for (const t of targets) {
        if (t.ko) continue;
        const amt = Math.round((u.mag * s.pow * 2.2 + 20) * (0.95 + this.r() * 0.1));
        t.hp = Math.min(t.maxHp, t.hp + amt);
        ev.push({ t: 'heal', target: t.uid, amt });
      }
      return;
    }
    if (s.kind === 'buff') {
      for (const t of targets) {
        for (const [stat, amt] of Object.entries(s.buff)) if (stat !== 'turns') t.buffs.push({ stat, amt, turns: s.buff.turns + 1 });
        ev.push({ t: 'buff', target: t.uid, buff: s.buff });
      }
      if (s.taunt) { u.taunt = s.taunt + 1; ev.push({ t: 'text', text: `${u.name}吸引了敵人的注意` }); }
      return;
    }
    if (s.reveal) for (const t of targets) this.revealOne(t, ev);
    for (const t of targets) {
      const hits = s.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (t.ko) break;
        this.hit(u, t, s.type, s.kind, s.pow, ev, { multi: hits > 1, i });
      }
      if (s.debuff && !t.ko) {
        for (const [stat, amt] of Object.entries(s.debuff)) if (stat !== 'turns') t.buffs.push({ stat, amt, turns: s.debuff.turns + 1 });
        ev.push({ t: 'debuff', target: t.uid, buff: s.debuff });
      }
      if (s.steal && !t.ko) this.trySteal(u, t, ev);
    }
  }

  useUlt(u, cmd, ev) {
    const U = ULTS[u.id];
    ev.push({ t: 'ultStart', who: u.uid, name: U.name });
    if (U.kind === 'heal') {
      for (const t of this.party) { if (t.ko) { t.ko = false; ev.push({ t: 'revive', target: t.uid }); } const amt = t.maxHp - t.hp; t.hp = t.maxHp; t.lumen = MAXL; ev.push({ t: 'heal', target: t.uid, amt }); ev.push({ t: 'lumen', who: t.uid, v: t.lumen }); }
      return;
    }
    const foes = () => this.alive('enemy');
    for (const [type, pow] of U.hits) {
      if (U.target === 'random') {
        const f = foes(); if (!f.length) break;
        const t = f[Math.floor(this.r() * f.length)];
        this.hit(u, t, type, U.kind, pow, ev, { ult: true });
      } else for (const t of foes()) this.hit(u, t, type, U.kind, pow, ev, { ult: true });
    }
    if (U.heal) for (const t of this.alive('party')) { const amt = Math.round(t.maxHp * U.heal); t.hp = Math.min(t.maxHp, t.hp + amt); ev.push({ t: 'heal', target: t.uid, amt }); }
    if (U.steal) for (const t of foes()) this.trySteal(u, t, ev, true);
    if (U.flip) this.flip(this.phase === 'L' ? 'D' : 'L', 'ult', ev);
  }

  useItem(u, cmd, ev) {
    const it = ITEMS[cmd.id]; if (!it) return;
    const t = this.byId(cmd.targets?.[0]) || u;
    ev.push({ t: 'act', who: u.uid, name: it.name, fx: 'item', targets: [t.uid], item: cmd.id });
    ev.push({ t: 'useItem', id: cmd.id });
    if (it.use.revive) { if (t.ko) { t.ko = false; t.hp = Math.round(t.maxHp * it.use.revive); ev.push({ t: 'revive', target: t.uid }); ev.push({ t: 'heal', target: t.uid, amt: t.hp }); } return; }
    if (t.ko) return;
    if (it.use.heal) { const amt = Math.min(t.maxHp - t.hp, it.use.heal); t.hp += amt; ev.push({ t: 'heal', target: t.uid, amt: it.use.heal }); }
    if (it.use.lumen) { t.lumen = Math.min(MAXL, t.lumen + it.use.lumen); ev.push({ t: 'lumen', who: t.uid, v: t.lumen }); }
  }

  trySteal(u, t, ev, sure) {
    const e = ENEMIES[t.id];
    if (!e.steal || t.stolen) { ev.push({ t: 'text', text: '沒什麼好偷的' }); return; }
    if (sure || t.broken || this.r() < 0.5) { t.stolen = true; this.stolen.push(e.steal); ev.push({ t: 'steal', who: u.uid, target: t.uid, item: e.steal }); }
    else ev.push({ t: 'text', text: '沒偷到' });
  }

  ultGain(u, v, ev) {
    if (u.side !== 'party' || u.ko || u.guest && false) return;
    const mul = u.engr.includes('e_ever') ? 1.3 : 1;
    const before = u.ult;
    u.ult = Math.min(100, u.ult + v * mul);
    if (Math.floor(u.ult) !== Math.floor(before)) ev.push({ t: 'ult', who: u.uid, v: u.ult });
  }

  // 一次命中
  hit(a, t, type, kind, pow, ev, o = {}) {
    if (t.ko) return;
    // 閃避
    const eva = this.buffSum(t, 'eva');
    if (t.side === 'party' && eva > 0 && this.r() < eva) { ev.push({ t: 'miss', target: t.uid, who: a.uid }); return; }
    let A = kind === 'mag' ? a.mag : a.atk, D = kind === 'mag' ? t.res : t.def;
    A *= 1 + this.buffSum(a, kind === 'mag' ? 'mag' : 'atk');
    D *= Math.max(0.2, 1 + this.buffSum(t, kind === 'mag' ? 'res' : 'def'));
    let dmg = A * pow * 2 * 50 / (50 + D * 2);
    let weak = false, crit = false;
    if (t.side === 'enemy' && type) weak = t.weak[this.phase].includes(type);
    if (weak) dmg *= 1.5;
    if (t.side === 'enemy' && t.broken) dmg *= 1.6 * (a.engr?.includes('e_break') ? 1.2 : 1);
    if (a.afterglow) dmg *= 1 + a.afterglow;
    if (a.side === 'enemy' && this.phase === 'D') { const ns = ENEMIES[a.id]?.nightStrong; if (ns) dmg *= 1 + ns; }
    if (t.buffs.some((b) => b.stat === 'guarding')) dmg *= 0.5;
    if (kind === 'atk' && this.r() < 0.06) { crit = true; dmg *= 1.5; }
    dmg *= 0.92 + this.r() * 0.16;
    dmg = Math.max(1, Math.round(dmg));
    t.hp = Math.max(0, t.hp - dmg);
    const e = { t: 'hit', who: a.uid, target: t.uid, dmg, type, weak, crit, ult: !!o.ult, hp: t.hp };
    ev.push(e);
    if (weak && t.side === 'enemy') {
      if (!t.revealed[this.phase].has(type)) { t.revealed[this.phase].add(type); ev.push({ t: 'reveal', target: t.uid, type, phase: this.phase }); }
      this.ultGain(a, 7, ev);
      if (!t.broken && t.guard > 0) {
        let dec = 1;
        if (a.engr?.includes('e_chain') && this.r() < 0.2) dec = 2;
        t.guard = Math.max(0, t.guard - dec);
        ev.push({ t: 'guard', target: t.uid, guard: t.guard });
        if (t.guard === 0) {
          t.broken = this.round + 1;
          ev.push({ t: 'break', target: t.uid, who: a.uid });
          this.ultGain(a, 16, ev);
          if (t.charge) { t.charge = null; ev.push({ t: 'cancel', who: t.uid }); }
        }
      }
    } else if (t.side === 'enemy' && type && !weak) {
      ev.push({ t: 'resist', target: t.uid, type });
    }
    if (t.side === 'party') {
      this.ultGain(t, (dmg / t.maxHp) * 55, ev);
      if (t.engr?.includes('e_keeper') && this.r() < 0.3 && t.hp > 0) { t.lumen = Math.min(MAXL, t.lumen + 1); ev.push({ t: 'lumen', who: t.uid, v: t.lumen }); }
    }
    if (t.hp <= 0) {
      t.ko = true; t.charge = null;
      ev.push({ t: 'ko', target: t.uid });
      if (t.side === 'enemy') {
        const E = ENEMIES[t.id];
        this.loot.exp += E.exp; this.loot.gold += E.gold;
        for (const [it, p, w] of E.drop || []) if (this.r() < p) this.loot.items.push(it);
      }
    }
  }

  // ---------- 敵人 AI ----------
  enemyCommand(u) {
    const E = ENEMIES[u.id];
    const ph = this.phase;
    const pick = (list) => {
      const ok = list.filter(([m, w, p]) => w > 0 && (!p || p === ph));
      const tot = ok.reduce((s, x) => s + x[1], 0);
      let r = this.r() * tot;
      for (const x of ok) { r -= x[1]; if (r <= 0) return x[0]; }
      return ok[0]?.[0] || 'pinch';
    };
    let mv = null;
    const n = u.turns;
    const half = u.hp < u.maxHp * 0.5;
    if (u.id === 'eel') {
      if (n % 3 === 0) mv = 'maelstrom';
    } else if (u.id === 'warden') {
      const wisps = this.alive('enemy').filter((x) => x.id === 'bellwisp').length;
      if (n % 4 === 1 && wisps < 1) mv = 'summon';
      else if (this.phase === 'L' && n % 3 === 2) mv = 'darkturn';
      else if (this.phase === 'D' && n % 3 === 0) mv = 'toll';
    } else if (u.id === 'gray') {
      const allies = this.alive('enemy').length;
      if (this.phase === 'D' && n % 3 === 1) mv = 'flare';
      else if (n % 4 === 2 && allies > 1) mv = 'order';
      else if (n % 3 === 0) mv = 'execute';
    } else if (u.id === 'jelly' && this.phase === 'D') {
      const hurt = this.alive('enemy').find((x) => x.hp < x.maxHp * 0.6);
      if (hurt && this.r() < 0.5) mv = 'glow';
    } else if (u.id === 'bellwisp') {
      const boss = this.alive('enemy').find((x) => x.id === 'warden');
      if (boss && boss.hp < boss.maxHp * 0.9 && this.r() < 0.45) mv = 'resonate';
    }
    if (!mv) mv = pick(E.moves);
    if (mv === 'glow' && this.phase !== 'D') mv = 'sting';
    return { type: 'enemy', move: mv };
  }

  pickTarget(u, mode) {
    const p = this.alive('party');
    if (!p.length) return null;
    if (mode === 'lowest') return p.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const taunt = p.find((x) => x.taunt > 0);
    if (taunt && this.r() < 0.75) return taunt;
    return p[Math.floor(this.r() * p.length)];
  }

  doEnemyMove(u, mvKey, ev, unleashed, forcedTargets) {
    const m = MOVES[mvKey]; if (!m) return;
    if (m.charge && !unleashed) {
      const turns = mvKey === 'toll' && u.hp < u.maxHp * 0.5 ? 1 : m.charge;
      u.charge = { move: mvKey, turns };
      ev.push({ t: 'charge', who: u.uid, move: mvKey, name: m.name, turns, text: m.text });
      return;
    }
    if (m.kind === 'phase') {
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [] });
      if (m.text) ev.push({ t: 'text', text: m.text });
      this.flip(m.to, 'enemy', ev);
      return;
    }
    if (m.kind === 'summon') {
      if (this.alive('enemy').length >= 3) { ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [] }); ev.push({ t: 'text', text: '鐘聲在空蕩的大廳裡回響。' }); return; }
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [] });
      const nu = this.addEnemy(m.what);
      ev.push({ t: 'summon', unit: nu.uid, id: m.what });
      return;
    }
    if (m.kind === 'buffall') {
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [] });
      for (const x of this.alive('enemy')) { x.buffs.push({ stat: 'atk', amt: m.buff.atk, turns: m.buff.turns + 1 }); ev.push({ t: 'buff', target: x.uid, buff: m.buff }); }
      if (m.text) ev.push({ t: 'text', text: m.text });
      return;
    }
    if (m.kind === 'buff') {
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [u.uid] });
      for (const [stat, amt] of Object.entries(m.buff)) if (stat !== 'turns') u.buffs.push({ stat, amt, turns: m.buff.turns + 1 });
      ev.push({ t: 'buff', target: u.uid, buff: m.buff });
      return;
    }
    if (m.kind === 'heal') {
      const hurt = this.alive('enemy').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [hurt.uid] });
      const amt = Math.round(hurt.maxHp * m.pow); hurt.hp = Math.min(hurt.maxHp, hurt.hp + amt); ev.push({ t: 'heal', target: hurt.uid, amt });
      return;
    }
    if (m.kind === 'healboss') {
      const boss = this.alive('enemy').find((x) => x.boss);
      if (!boss) { this.doEnemyMove(u, 'chime', ev); return; }
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [boss.uid] });
      const amt = Math.round(boss.maxHp * m.pow); boss.hp = Math.min(boss.maxHp, boss.hp + amt); ev.push({ t: 'heal', target: boss.uid, amt });
      return;
    }
    if (m.kind === 'drain') {
      const ps = this.alive('party');
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: ps.map((x) => x.uid) });
      for (const x of ps) { x.lumen = Math.max(0, x.lumen - m.lumen); ev.push({ t: 'lumen', who: x.uid, v: x.lumen, drain: true }); }
      if (m.text) ev.push({ t: 'text', text: m.text });
      return;
    }
    if (m.kind === 'debuff') {
      const t = this.pickTarget(u);
      ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: [t.uid] });
      for (const [stat, amt] of Object.entries(m.debuff)) if (stat !== 'turns') t.buffs.push({ stat, amt, turns: m.debuff.turns + 1 });
      ev.push({ t: 'debuff', target: t.uid, buff: m.debuff });
      return;
    }
    // 攻擊
    let targets;
    if (m.target === 'all') targets = this.alive('party');
    else if (m.target === 'lowest') targets = [this.pickTarget(u, 'lowest')];
    else targets = [this.pickTarget(u)];
    targets = targets.filter(Boolean);
    ev.push({ t: 'act', who: u.uid, name: m.name, fx: m.fx, targets: targets.map((x) => x.uid), enemy: true, big: !!unleashed });
    for (const t of targets) for (let i = 0; i < (m.hits || 1); i++) this.hit(u, t, null, m.kind, m.pow, ev);
  }

  checkEnd(ev) {
    if (this.over) return;
    if (!this.alive('enemy').length) {
      this.over = 'win';
      ev.push({ t: 'end', result: 'win' });
    } else if (!this.alive('party').filter((u) => !u.guest || true).length) {
      this.over = 'lose';
      ev.push({ t: 'end', result: 'lose' });
    }
  }

  // 自動戰鬥：簡單又不笨的選擇
  autoCommand(u) {
    const foes = this.alive('enemy');
    const weakTargets = (type) => foes.filter((e) => e.weak[this.phase].includes(type) && (e.revealed[this.phase].has(type) || true));
    // 有人快倒了就補
    const low = this.alive('party').find((x) => x.hp < x.maxHp * 0.35);
    const heal = u.skills.find((k) => SKILLS[k].kind === 'heal' && this.canUse(u, k));
    if (low && heal) return { type: 'skill', id: heal, targets: [low.uid] };
    if (u.ult >= 100) return { type: 'ult', targets: [foes[0]?.uid] };
    let best = null, bestScore = -1;
    for (const k of u.skills) {
      const s = SKILLS[k];
      if (!s || s.kind === 'buff' || s.kind === 'heal' || !this.canUse(u, k)) continue;
      for (const e of foes) {
        let sc = s.pow * (s.hits || 1) * (s.target === 'enemies' ? foes.length * 0.7 : 1);
        if (s.type && e.weak[this.phase].includes(s.type)) sc *= 2.2 * (s.hits || 1);
        if (e.broken) sc *= 1.5;
        sc -= (s.cost || 0) * 0.25;
        if (sc > bestScore) { bestScore = sc; best = { type: 'skill', id: k, targets: [e.uid] }; }
      }
    }
    return best || { type: 'skill', id: u.skills[0], targets: [foes[0]?.uid] };
  }

  // 戰鬥結束後要寫回存檔的狀態
  results() {
    return this.party.filter((u) => !u.guest).map((u) => ({ id: u.id, hp: u.ko ? 1 : u.hp, ult: u.ult }));
  }
}
