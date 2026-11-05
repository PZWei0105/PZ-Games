// DOM 介面：對話、橫幅、提示、場景 HUD、選單、商店
import { ITEMS, WEAPONS, ACCESSORIES, ENGRAVES, CHARS, SKILLS, TYPES, ULTS, ENEMIES, statsAt, expToNext, RECIPES, TEMPER, SHOPS } from './data.js';

export const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const chipT = (t, extra = '') => `<span class="chip ${extra}" style="color:${TYPES[t].c};border-color:${TYPES[t].c}66">${TYPES[t].n}</span>`;

export class UI {
  constructor(game) {
    this.g = game;
    this.root = document.getElementById('ui');
    this.fadeEl = document.getElementById('fade');
    this.flashEl = document.getElementById('flashv');
    const R = this.root;
    this.hud = h('div', 'hide'); this.hud.id = 'hud'; R.appendChild(this.hud);
    this.banner = h('div'); this.banner.id = 'banner'; R.appendChild(this.banner);
    this.toasts = h('div'); this.toasts.id = 'toasts'; R.appendChild(this.toasts);
    this.cardEl = h('div'); this.cardEl.id = 'card'; document.body.appendChild(this.cardEl);
    this.joy = h('div', '', '<i></i>'); this.joy.id = 'joy'; R.appendChild(this.joy);
    this.layer = h('div'); this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none'; R.appendChild(this.layer);
    this.dialogOpen = false;
    this.buildHud();
  }
  // ---------------- 基本 ----------------
  async fade(on, ms = 450) { this.fadeEl.style.transitionDuration = ms + 'ms'; this.fadeEl.classList.toggle('on', on); await wait(ms + 30); }
  flash(color = '#fff', ms = 260, a = 0.8) {
    const f = this.flashEl; f.style.transition = 'none'; f.style.background = color; f.style.opacity = a;
    requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms`; f.style.opacity = 0; });
  }
  toast(text, ms = 2200) {
    const t = h('div', 'toast panel', text); this.toasts.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 450); }, ms);
  }
  async showBanner(t1, t2, ms = 2600) {
    this.banner.innerHTML = `<div class="b1">${t1}</div><div class="line"></div><div class="b2">${t2 || ''}</div>`;
    this.banner.classList.add('on');
    await wait(ms);
    this.banner.classList.remove('on');
  }
  async card(c1, c2, c3 = '', ms = 3200) {
    this.cardEl.innerHTML = `<div class="c1">${c1}</div><div class="c2">${c2}</div><div class="c3">${c3}</div>`;
    this.cardEl.classList.add('on');
    await wait(ms);
    this.cardEl.classList.remove('on');
    await wait(900);
  }
  // ---------------- 對話 ----------------
  textSpeed() { return [24, 46, 95, 9999][this.g.settings.text ?? 1]; }
  async say(name, text, o = {}) {
    this.dialogOpen = true;
    const d = h('div', 'panel orn' + (name ? '' : ' narr')); d.id = 'dialog';
    if (name) d.appendChild(h('div', 'name', name));
    const tx = h('div', 'text'); d.appendChild(tx);
    const more = h('div', 'more', '▼'); more.style.opacity = 0; d.appendChild(more);
    const catcher = h('div', 'pe'); catcher.style.cssText = 'position:absolute;inset:0;z-index:7';
    this.root.appendChild(catcher); this.root.appendChild(d);
    if (name && this.g.onSpeak) this.g.onSpeak(name);
    let shown = 0, done = false, resolve;
    const p = new Promise((r) => (resolve = r));
    const sp = this.textSpeed();
    let last = performance.now();
    const step = () => {
      if (done) return;
      const now = performance.now();
      const add = Math.max(1, Math.floor(((now - last) / 1000) * sp));
      if (now - last > 1000 / sp) {
        shown = Math.min(text.length, shown + add); last = now;
        tx.textContent = text.slice(0, shown);
        if (shown % 3 === 0 && name) this.g.sound.sfx('talk', 0.6);
      }
      if (shown >= text.length) { done = true; more.style.opacity = 1; return; }
      requestAnimationFrame(step);
    };
    step();
    const adv = (e) => {
      e?.preventDefault?.();
      if (!done) { done = true; shown = text.length; tx.textContent = text; more.style.opacity = 1; return; }
      cleanup(); resolve();
    };
    const key = (e) => { if (['Enter', 'Space', 'KeyZ', 'KeyE'].includes(e.code)) adv(e); };
    const cleanup = () => { catcher.remove(); d.remove(); window.removeEventListener('keydown', key); this.dialogOpen = false; };
    catcher.addEventListener('pointerdown', adv); d.addEventListener('pointerdown', adv);
    window.addEventListener('keydown', key);
    if (o.auto) setTimeout(() => { if (this.dialogOpen) { done = true; cleanup(); resolve(); } }, o.auto);
    return p;
  }
  choice(opts, prompt) {
    return new Promise((res) => {
      const box = h('div'); box.id = 'choices';
      if (prompt) { const pp = h('div', 'panel', prompt); pp.style.cssText = 'padding:10px 14px;font-size:14px;margin-bottom:4px'; box.appendChild(pp); }
      opts.forEach((o, i) => {
        const b = h('button', 'btn' + (i === 0 ? ' gold' : ''), o);
        b.onclick = () => { this.g.sound.sfx('ok'); box.remove(); res(i); };
        box.appendChild(b);
      });
      this.root.appendChild(box);
    });
  }
  // ---------------- HUD ----------------
  buildHud() {
    const H = this.hud;
    H.innerHTML = '';
    this.locEl = h('div', 'loc panel', '<span class="ph"></span><span class="nm"></span>'); H.appendChild(this.locEl);
    this.objEl = h('div', 'obj'); H.appendChild(this.objEl);
    const mb = h('button', 'btn mbtn pe', '☰'); mb.onclick = () => this.g.openMenu(); H.appendChild(mb);
    this.actsEl = h('div', 'acts pe'); H.appendChild(this.actsEl);
  }
  showHud(on) { this.hud.classList.toggle('hide', !on); }
  setLocation(name, phase) {
    this.locEl.querySelector('.nm').textContent = name;
    const ph = this.locEl.querySelector('.ph');
    ph.textContent = phase === 'L' ? '明' : '暗';
    ph.style.cssText = phase === 'L' ? 'background:#3a2a10;color:#ffd27a;border:1px solid #ffd27a' : 'background:#141a34;color:#b8c4ff;border:1px solid #8fa0ff';
  }
  setObjective(t) { this.objEl.textContent = t ? '◆ ' + t : ''; this.objEl.style.display = t ? '' : 'none'; }
  setActions(list) {
    const key = list.map((a) => a.label).join('|');
    if (key === this.actKey) return;
    this.actKey = key;
    this.actsEl.innerHTML = '';
    for (const a of list) {
      const b = h('button', 'btn act' + (a.sec ? ' sec' : ''), a.label);
      b.onpointerdown = (e) => { e.stopPropagation(); };
      b.onclick = (e) => { e.stopPropagation(); this.g.sound.sfx('ok'); a.fn(); };
      this.actsEl.appendChild(b);
    }
  }
  // 頭上標示
  emote(x, y, text, ms = 1200) {
    const e = h('div', 'emote', text); e.style.left = x + 'px'; e.style.top = y + 'px';
    this.layer.appendChild(e); setTimeout(() => e.remove(), ms);
    return e;
  }
  shadowTalk(x, y, text, ms = 4200) {
    const e = h('div', 'shadowtalk', text); e.style.left = x + 'px'; e.style.top = y + 'px';
    this.layer.appendChild(e); setTimeout(() => { e.style.transition = 'opacity .6s'; e.style.opacity = 0; setTimeout(() => e.remove(), 700); }, ms);
  }
  // ---------------- 教學 ----------------
  tutorial(html) {
    return new Promise((res) => {
      const t = h('div', 'tut panel orn', html + '<button class="btn gold ok">知道了</button>');
      t.querySelector('.ok').onclick = () => { this.g.sound.sfx('ok'); t.remove(); res(); };
      this.root.appendChild(t);
    });
  }
  // ---------------- 選單 ----------------
  openMenu(tab = 'party') {
    if (this.menuEl) return;
    const m = h('div', 'pe'); m.id = 'menu';
    const top = h('div', 'top');
    const tabs = h('div', 'tabs');
    const T = [['party', '隊伍'], ['items', '道具'], ['equip', '裝備'], ['notes', '筆記'], ['beast', '圖鑑'], ['save', '存檔'], ['settings', '設定']];
    for (const [k, n] of T) { const b = h('button', 'btn tab' + (k === tab ? ' on' : ''), n); b.onclick = () => { this.g.sound.sfx('tick'); this.menuTab(k); }; b.dataset.k = k; tabs.appendChild(b); }
    const close = h('button', 'btn', '✕'); close.style.cssText = 'width:44px;flex:none;padding:10px 0'; close.onclick = () => this.closeMenu();
    top.appendChild(tabs); top.appendChild(close);
    m.appendChild(top);
    const body = h('div', 'body'); m.appendChild(body);
    this.menuEl = m; this.menuBody = body;
    this.root.appendChild(m);
    this.menuTab(tab);
  }
  closeMenu() { if (!this.menuEl) return; this.g.sound.sfx('back'); this.menuEl.remove(); this.menuEl = null; this.g.onMenuClosed?.(); }
  menuTab(k) {
    this.menuEl.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    const B = this.menuBody; B.innerHTML = ''; B.scrollTop = 0;
    this['tab_' + k](B);
  }
  memberStats(m) {
    const s = statsAt(m.id, m.lv);
    const w = WEAPONS[m.weapon] || {};
    s.atk += (w.atk || 0) + ((this.g.state.weapons[m.weapon]?.star || 1) - 1) * 3;
    s.mag += (w.mag || 0) + ((this.g.state.weapons[m.weapon]?.star || 1) - 1) * 2;
    const acc = ACCESSORIES[m.acc]; if (acc) for (const [k, v] of Object.entries(acc.mod)) if (s[k] != null) s[k] += v;
    return s;
  }
  tab_party(B) {
    const S = this.g.state;
    B.appendChild(h('div', 'sec-h', `隊伍　<span class="gold">${S.gold}</span> 銀貝`));
    for (const m of S.party) {
      const c = CHARS[m.id], s = this.memberStats(m), need = expToNext(m.lv);
      const card = h('div', 'card panel');
      card.innerHTML = `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:17px">${c.name}</b><span class="tag">${c.title}</span><span style="margin-left:auto" class="gold">Lv ${m.lv}</span></div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:8px;font-size:12px"><span style="width:38px">體力</span><div class="bar hpbar ${m.hp < s.hp * 0.3 ? 'low' : ''}" style="flex:1"><i style="width:${(m.hp / s.hp) * 100}%"></i></div><span style="width:72px;text-align:right">${m.hp}/${s.hp}</span></div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:5px;font-size:12px"><span style="width:38px">經驗</span><div class="bar expbar" style="flex:1"><i style="width:${(m.exp / need) * 100}%"></i></div><span style="width:72px;text-align:right">${m.exp}/${need}</span></div>
        <div class="statgrid"><span>攻擊<b>${s.atk}</b></span><span>防禦<b>${s.def}</b></span><span>速度<b>${s.spd}</b></span><span>術力<b>${s.mag}</b></span><span>術防<b>${s.res}</b></span><span>武器<b>${WEAPONS[m.weapon]?.name || '—'}</b></span></div>`;
      const sk = h('div'); sk.style.cssText = 'margin-top:10px;display:flex;flex-direction:column;gap:2px';
      for (const [k, lv] of c.skills) {
        const s2 = SKILLS[k]; if (s2.basic) continue;
        const have = m.lv >= lv;
        const ph = s2.phase === 'L' ? '<span class="chip" style="color:#ffd27a">明</span>' : s2.phase === 'D' ? '<span class="chip" style="color:#b8c4ff">暗</span>' : '<span class="chip" style="color:#aaa">常</span>';
        sk.appendChild(h('div', '', `<div style="display:flex;gap:6px;align-items:center;font-size:13px;opacity:${have ? 1 : 0.4}">${ph}${s2.type ? chipT(s2.type) : ''}<b>${s2.name}</b><span class="tag">${have ? '光 ' + s2.cost : 'Lv ' + lv + ' 習得'}</span></div><div class="t2" style="font-size:12px;color:var(--muted);margin:1px 0 5px 4px">${s2.desc || ''}</div>`));
      }
      const u = ULTS[m.id];
      if (u) sk.appendChild(h('div', '', `<div style="font-size:13px;margin-top:4px"><span class="chip" style="color:#ffd27a;border-color:#ffd27a">絕技</span> <b>${u.name}</b></div><div style="font-size:12px;color:var(--muted);margin:2px 0 0 4px">${u.desc}</div>`));
      card.appendChild(sk);
      B.appendChild(card);
    }
  }
  tab_items(B) {
    const S = this.g.state;
    const groups = [['可用道具', (k) => ITEMS[k]?.use], ['料理', (k) => ITEMS[k]?.meal], ['魚', (k) => ITEMS[k]?.fish], ['素材與珍品', (k) => ITEMS[k]?.mat]];
    let any = false;
    if (S.meal) B.appendChild(h('div', 'card panel', `<b style="color:var(--gold2)">正在生效：${ITEMS[S.meal.id].name}</b><div class="t2" style="font-size:12px;color:var(--muted);margin-top:4px">${ITEMS[S.meal.id].desc}（還剩 ${S.meal.n} 場）</div>`));
    for (const [title, f] of groups) {
      const keys = Object.keys(S.inv).filter((k) => S.inv[k] > 0 && f(k));
      if (!keys.length) continue;
      any = true;
      B.appendChild(h('div', 'sec-h', title));
      const box = h('div', 'panel');
      for (const k of keys) {
        const it = ITEMS[k];
        const row = h('div', 'mrow', `<div class="grow"><div class="t1">${it.name}　<span class="tag">×${S.inv[k]}</span></div><div class="t2">${it.desc}</div></div>`);
        if (it.field) { const b = h('button', 'btn', '使用'); b.onclick = () => this.pickMember((m) => { if (this.g.useFieldItem(k, m)) this.menuTab('items'); }); row.appendChild(b); }
        box.appendChild(row);
      }
      B.appendChild(box);
    }
    if (!any) B.appendChild(h('div', 'card panel', '包包是空的。'));
  }
  pickMember(fn) {
    const ov = h('div', 'overlay'); const box = h('div', 'box panel orn');
    box.innerHTML = '<div class="head"><h3>給誰用？</h3></div>';
    for (const m of this.g.state.party) {
      const s = this.memberStats(m);
      const b = h('button', 'btn', `${CHARS[m.id].name}　<span class="tag">${m.hp}/${s.hp}</span>`); b.style.marginBottom = '8px';
      b.onclick = () => { ov.remove(); fn(m); };
      box.appendChild(b);
    }
    const c = h('button', 'btn', '取消'); c.onclick = () => ov.remove(); box.appendChild(c);
    ov.appendChild(box); this.root.appendChild(ov);
  }
  tab_equip(B) {
    const S = this.g.state;
    for (const m of S.party) {
      const c = CHARS[m.id];
      const card = h('div', 'card panel');
      card.innerHTML = `<b style="font-size:16px">${c.name}</b>`;
      const w = WEAPONS[m.weapon], star = S.weapons[m.weapon]?.star || 1;
      const slots = (w?.slots || 0) + (star >= 3 ? 1 : 0);
      const r1 = h('div', 'mrow', `<div class="grow"><div class="t2">武器</div><div class="t1">${w?.name || '—'} <span style="color:#ffd27a">${'★'.repeat(star)}</span></div><div class="t2">攻擊 +${(w?.atk || 0) + (star - 1) * 3}${w?.mag ? '　術力 +' + ((w.mag || 0) + (star - 1) * 2) : ''}　刻槽 ${slots}</div></div>`);
      const opts = Object.keys(S.weapons).filter((k) => WEAPONS[k].who === m.id);
      if (opts.length > 1) { const b = h('button', 'btn', '更換'); b.onclick = () => this.pickFrom('換武器', opts.map((k) => [k, `${WEAPONS[k].name} ${'★'.repeat(S.weapons[k].star || 1)}`, WEAPONS[k].desc]), (k) => { m.weapon = k; m.engr = (m.engr || []).slice(0, (WEAPONS[k].slots || 0) + ((S.weapons[k].star || 1) >= 3 ? 1 : 0)); this.menuTab('equip'); }); r1.appendChild(b); }
      card.appendChild(r1);
      const a = ACCESSORIES[m.acc];
      const r2 = h('div', 'mrow', `<div class="grow"><div class="t2">飾品</div><div class="t1">${a?.name || '（無）'}</div><div class="t2">${a?.desc || ''}</div></div>`);
      const accs = Object.keys(S.accs).filter((k) => S.accs[k] > 0 && (k === m.acc || S.party.filter((p) => p.acc === k).length < S.accs[k]));
      const b2 = h('button', 'btn', '更換'); b2.onclick = () => this.pickFrom('換飾品', [['', '（不裝）', ''], ...accs.map((k) => [k, ACCESSORIES[k].name, ACCESSORIES[k].desc])], (k) => { m.acc = k || null; this.g.clampHp(); this.menuTab('equip'); });
      r2.appendChild(b2); card.appendChild(r2);
      m.engr = m.engr || [];
      for (let i = 0; i < slots; i++) {
        const e = ENGRAVES[m.engr[i]];
        const r3 = h('div', 'mrow', `<div class="grow"><div class="t2">刻槽 ${i + 1}</div><div class="t1">${e?.name || '（空）'}</div><div class="t2">${e?.desc || ''}</div></div>`);
        const used = (k) => S.party.reduce((n, p) => n + (p.engr || []).filter((x) => x === k).length, 0);
        const avail = Object.keys(S.engr).filter((k) => S.engr[k] - used(k) > 0 || m.engr[i] === k);
        const b3 = h('button', 'btn', '刻印'); b3.onclick = () => this.pickFrom('選擇刻印', [['', '（清空）', ''], ...avail.map((k) => [k, ENGRAVES[k].name, ENGRAVES[k].desc])], (k) => { m.engr[i] = k || null; this.menuTab('equip'); });
        if (!avail.length && !m.engr[i]) b3.classList.add('off');
        r3.appendChild(b3); card.appendChild(r3);
      }
      B.appendChild(card);
    }
    if (!Object.keys(S.engr).length) B.appendChild(h('div', 'tag', '刻印可以從寶箱、支線和頭目身上取得。刻在武器的刻槽裡就會生效。'));
  }
  pickFrom(title, list, fn) {
    const ov = h('div', 'overlay'); const box = h('div', 'box panel orn');
    box.innerHTML = `<div class="head"><h3>${title}</h3></div>`;
    const sc = h('div', 'scroll');
    for (const [k, n, d] of list) {
      const row = h('button', 'btn', `<div style="text-align:left"><div>${n}</div><div style="font-size:12px;color:var(--muted);font-weight:400;margin-top:2px">${d || ''}</div></div>`);
      row.style.cssText = 'width:100%;margin-bottom:6px';
      row.onclick = () => { this.g.sound.sfx('ok'); ov.remove(); fn(k); };
      sc.appendChild(row);
    }
    box.appendChild(sc);
    const c = h('button', 'btn', '取消'); c.style.marginTop = '8px'; c.onclick = () => ov.remove(); box.appendChild(c);
    ov.appendChild(box); this.root.appendChild(ov);
  }
  tab_notes(B) {
    const S = this.g.state;
    B.appendChild(h('div', 'card panel', `<div class="tag">目前目標</div><div style="font-size:16px;margin-top:6px;color:var(--gold2)">${S.objective || '—'}</div>`));
    B.appendChild(h('div', 'sec-h', '旅途紀錄'));
    const box = h('div', 'panel');
    for (const l of [...(S.log || [])].reverse()) box.appendChild(h('div', 'mrow', `<div class="grow"><div class="t1">${l.t}</div><div class="t2">${l.d}</div></div>`));
    if (!(S.log || []).length) box.appendChild(h('div', 'mrow', '<div class="t2">還沒有紀錄。</div>'));
    B.appendChild(box);
    B.appendChild(h('div', 'sec-h', '明暗相位'));
    B.appendChild(h('div', 'card panel', `<div style="font-size:13px;line-height:1.8;color:#ddd2bc">戰場會隨燈塔的光在<b style="color:#ffd27a">明</b>、<b style="color:#b8c4ff">暗</b>之間翻轉。敵人的弱點在兩邊不一樣；光屬性只能在明時用，影屬性只能在暗時用。<br>翻轉的瞬間，身上每存 1 點光，下一擊就強 20%（餘暉）。魏子葳的「轉燈」可以自己決定什麼時候翻。</div>`));
  }
  tab_beast(B) {
    const S = this.g.state, list = Object.keys(S.bestiary || {});
    if (!list.length) { B.appendChild(h('div', 'card panel', '還沒遇過任何魔物。')); return; }
    B.appendChild(h('div', 'tag', '戰鬥中照出來的弱點會記在這裡。'));
    for (const id of list) {
      const E = ENEMIES[id], rec = S.bestiary[id];
      const wk = (k) => { const known = rec[k] || []; const all = E.weak[k]; if (!all.length && rec['seen' + k]) return '<span class="tag">無</span>'; return all.map((t) => known.includes(t) ? chipT(t) : '<span class="chip" style="color:#666">？</span>').join(' ') || '<span class="tag">？</span>'; };
      B.appendChild(h('div', 'card panel', `<div style="display:flex;align-items:baseline;gap:8px"><b>${E.name}</b><span class="tag">Lv ${E.lv}　架勢 ${E.guard}</span><span class="tag" style="margin-left:auto">打倒 ${rec.n || 0}</span></div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:13px"><span style="color:#ffd27a;width:22px">明</span>${wk('L')}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:6px;font-size:13px"><span style="color:#b8c4ff;width:22px">暗</span>${wk('D')}</div>`));
    }
  }
  tab_save(B) {
    const G = this.g;
    B.appendChild(h('div', 'tag', '進度會自動存在這台裝置。也可以手動存到三個欄位，或用存檔碼帶到別的裝置。'));
    for (const slot of ['auto', '1', '2', '3']) {
      const info = G.slotInfo(slot);
      const row = h('div', 'card panel');
      row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><b>${slot === 'auto' ? '自動存檔' : '欄位 ' + slot}</b><div class="tag" style="margin-top:3px">${info || '空'}</div></div></div>`;
      const bx = row.firstChild;
      if (slot !== 'auto' && G.canSave()) { const s = h('button', 'btn', '存檔'); s.onclick = () => { G.save(slot); this.toast('已存檔'); this.menuTab('save'); }; bx.appendChild(s); }
      if (info) { const l = h('button', 'btn', '讀取'); l.onclick = () => { this.closeMenu(); G.load(slot); }; bx.appendChild(l); }
      B.appendChild(row);
    }
    if (!G.canSave()) B.appendChild(h('div', 'tag', '劇情進行中，暫時不能手動存檔。'));
    B.appendChild(h('div', 'sec-h', '存檔碼'));
    const box = h('div', 'card panel');
    const ta = h('textarea'); ta.style.cssText = 'width:100%;height:80px;background:#0b0f18;color:#ddd;border:1px solid var(--line);border-radius:4px;font-size:11px;padding:6px';
    ta.placeholder = '把存檔碼貼在這裡，再按「匯入」';
    const b1 = h('button', 'btn', '產生並複製'); b1.onclick = async () => { const code = G.exportCode(); ta.value = code; try { await navigator.clipboard.writeText(code); this.toast('已複製存檔碼'); } catch (e) { ta.select(); this.toast('請手動複製上面的文字'); } };
    const b2 = h('button', 'btn', '匯入'); b2.onclick = () => { if (G.importCode(ta.value.trim())) { this.closeMenu(); } else this.toast('存檔碼不正確'); };
    const bb = h('div'); bb.style.cssText = 'display:flex;gap:8px;margin-top:8px'; bb.appendChild(b1); bb.appendChild(b2);
    box.appendChild(ta); box.appendChild(bb); B.appendChild(box);
    const t = h('button', 'btn', '回到標題'); t.style.marginTop = '14px'; t.onclick = async () => { const i = await this.choice(['回到標題', '取消'], '沒存的進度會不見。'); if (i === 0) { this.closeMenu(); G.toTitle(); } };
    B.appendChild(t);
  }
  tab_settings(B) {
    const G = this.g, S = G.settings;
    const row = (label, opts, key, fn) => {
      const r = h('div', 'mrow'); r.appendChild(h('div', 'grow', `<div class="t1">${label}</div>`));
      const g = h('div'); g.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end';
      opts.forEach(([v, n]) => { const b = h('button', 'btn' + (S[key] === v ? ' gold' : ''), n); b.style.padding = '8px 10px'; b.onclick = () => { S[key] = v; G.applySettings(); fn?.(v); this.menuTab('settings'); }; g.appendChild(b); });
      r.appendChild(g); return r;
    };
    const box = h('div', 'panel');
    box.appendChild(row('畫質', [['low', '低'], ['mid', '中'], ['high', '高']], 'quality'));
    box.appendChild(row('景深與光暈', [[0, '關'], [0.6, '弱'], [1, '標準']], 'fx'));
    box.appendChild(row('音樂', [[0, '關'], [0.3, '小'], [0.55, '中'], [0.85, '大']], 'music'));
    box.appendChild(row('音效', [[0, '關'], [0.4, '小'], [0.8, '中'], [1, '大']], 'sfx'));
    box.appendChild(row('文字速度', [[0, '慢'], [1, '中'], [2, '快'], [3, '瞬間']], 'text'));
    box.appendChild(row('戰鬥速度', [[1, '1×'], [1.6, '1.6×'], [2.2, '2.2×']], 'bspeed'));
    box.appendChild(row('畫面震動', [[1, '開'], [0, '關']], 'shake'));
    B.appendChild(box);
    B.appendChild(h('div', 'tag', '手機發燙或卡頓時，把畫質調到「中」或「低」。'));
  }
  // ---------------- 商店 ----------------
  shop(id) {
    return new Promise((res) => {
      const G = this.g, S = G.state, sh = SHOPS[id];
      const ov = h('div', 'overlay'); const box = h('div', 'box panel orn');
      let mode = 'buy';
      const render = () => {
        box.innerHTML = `<div class="head"><h3>${sh.name}</h3><span class="gold">${S.gold}</span><span class="tag">銀貝</span></div>`;
        const tabs = h('div'); tabs.style.cssText = 'display:flex;gap:6px;margin-bottom:8px';
        for (const [k, n] of [['buy', '買'], ['sell', '賣']]) { const b = h('button', 'btn' + (mode === k ? ' gold' : ''), n); b.onclick = () => { mode = k; render(); }; tabs.appendChild(b); }
        box.appendChild(tabs);
        const sc = h('div', 'scroll panel');
        if (mode === 'buy') for (const k of sh.items) {
          const it = ITEMS[k] || WEAPONS[k] || ACCESSORIES[k];
          const price = it.price;
          const own = ITEMS[k] ? (S.inv[k] || 0) : WEAPONS[k] ? (S.weapons[k] ? 1 : 0) : (S.accs[k] || 0);
          const extra = WEAPONS[k] ? `（${CHARS[WEAPONS[k].who].name}用，攻擊 +${WEAPONS[k].atk}）` : '';
          const row = h('div', 'mrow', `<div class="grow"><div class="t1">${it.name}　<span class="tag">持有 ${own}</span></div><div class="t2">${it.desc || ''}${extra}</div></div><span class="gold">${price}</span>`);
          const b = h('button', 'btn', '買');
          if (S.gold < price || (WEAPONS[k] && S.weapons[k])) b.classList.add('off');
          b.onclick = () => { S.gold -= price; if (ITEMS[k]) S.inv[k] = (S.inv[k] || 0) + 1; else if (WEAPONS[k]) S.weapons[k] = { star: 1 }; else S.accs[k] = (S.accs[k] || 0) + 1; G.sound.sfx('coin'); render(); };
          row.appendChild(b); sc.appendChild(row);
        }
        else {
          const keys = Object.keys(S.inv).filter((k) => S.inv[k] > 0 && ITEMS[k] && (ITEMS[k].sell || ITEMS[k].price) && !ITEMS[k].key);
          if (!keys.length) sc.appendChild(h('div', 'mrow', '<div class="t2">沒有可以賣的東西。</div>'));
          for (const k of keys) {
            const it = ITEMS[k], price = it.sell || Math.floor(it.price / 2);
            const row = h('div', 'mrow', `<div class="grow"><div class="t1">${it.name}　<span class="tag">×${S.inv[k]}</span></div></div><span class="gold">${price}</span>`);
            const b = h('button', 'btn', '賣'); b.onclick = () => { S.inv[k]--; S.gold += price; G.sound.sfx('coin'); render(); };
            row.appendChild(b); sc.appendChild(row);
          }
        }
        box.appendChild(sc);
        if (id === 'smith') {
          const t = h('button', 'btn gold', '淬鍊武器'); t.style.marginTop = '8px'; t.onclick = () => { ov.remove(); this.temper().then(() => this.shop(id).then(res)); };
          box.appendChild(t);
        }
        const c = h('button', 'btn', '離開'); c.style.marginTop = '8px'; c.onclick = () => { ov.remove(); res(); }; box.appendChild(c);
      };
      render(); ov.appendChild(box); this.root.appendChild(ov);
    });
  }
  temper() {
    return new Promise((res) => {
      const G = this.g, S = G.state;
      const ov = h('div', 'overlay'); const box = h('div', 'box panel orn');
      const render = () => {
        box.innerHTML = `<div class="head"><h3>淬鍊</h3><span class="gold">${S.gold}</span></div><div class="tag" style="margin-bottom:8px">每升一星：攻擊 +3、術力 +2。三星多一個刻槽。</div>`;
        const sc = h('div', 'scroll panel');
        for (const k of Object.keys(S.weapons)) {
          const w = WEAPONS[k], st = S.weapons[k].star || 1;
          if (w.who === 'owen') continue;
          const need = TEMPER[st];
          const mats = need ? Object.entries(need.mats).map(([m, n]) => `${ITEMS[m].name} ${S.inv[m] || 0}/${n}`).join('、') : '已經是最高等級';
          const row = h('div', 'mrow', `<div class="grow"><div class="t1">${w.name} <span style="color:#ffd27a">${'★'.repeat(st)}</span></div><div class="t2">${need ? `需要：${mats}、銀貝 ${need.gold}` : mats}</div></div>`);
          if (need) {
            const ok = S.gold >= need.gold && Object.entries(need.mats).every(([m, n]) => (S.inv[m] || 0) >= n);
            const b = h('button', 'btn gold', '淬鍊'); if (!ok) b.classList.add('off');
            b.onclick = () => { S.gold -= need.gold; for (const [m, n] of Object.entries(need.mats)) S.inv[m] -= n; S.weapons[k].star = st + 1; G.sound.sfx('levelup'); this.toast(`${w.name} 升到 ${'★'.repeat(st + 1)}`); render(); };
            row.appendChild(b);
          }
          sc.appendChild(row);
        }
        box.appendChild(sc);
        const c = h('button', 'btn', '返回'); c.style.marginTop = '8px'; c.onclick = () => { ov.remove(); res(); }; box.appendChild(c);
      };
      render(); ov.appendChild(box); this.root.appendChild(ov);
    });
  }
  // 營火：料理
  cook() {
    return new Promise((res) => {
      const G = this.g, S = G.state;
      const ov = h('div', 'overlay'); const box = h('div', 'box panel orn');
      const render = () => {
        box.innerHTML = `<div class="head"><h3>魏子葳的料理</h3></div><div class="tag" style="margin-bottom:8px">吃了之後接下來三場戰鬥有效。同時只能有一道生效。</div>`;
        const sc = h('div', 'scroll panel');
        for (const r of RECIPES) {
          const it = ITEMS[r.id];
          const ok = Object.entries(r.need).every(([k, n]) => (S.inv[k] || 0) >= n);
          const row = h('div', 'mrow', `<div class="grow"><div class="t1">${it.name}</div><div class="t2">${it.desc}<br>材料：${Object.entries(r.need).map(([k, n]) => `${ITEMS[k].name} ${S.inv[k] || 0}/${n}`).join('、')}</div></div>`);
          const b = h('button', 'btn gold', '煮'); if (!ok) b.classList.add('off');
          b.onclick = () => { for (const [k, n] of Object.entries(r.need)) S.inv[k] -= n; S.meal = { id: r.id, ...it.meal }; G.sound.sfx('heal'); this.toast(`${it.name}做好了，大家吃得很開心。`); ov.remove(); res(true); };
          row.appendChild(b); sc.appendChild(row);
        }
        box.appendChild(sc);
        const c = h('button', 'btn', '不煮了'); c.style.marginTop = '8px'; c.onclick = () => { ov.remove(); res(false); }; box.appendChild(c);
      };
      render(); ov.appendChild(box); this.root.appendChild(ov);
    });
  }
}
