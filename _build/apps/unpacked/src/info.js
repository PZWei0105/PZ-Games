/* 解包 — 遊戲情報卡（2026-11-19）：App 裡出現的每一款遊戲都點得進去看介紹。
   解包過、推坑過的：直接去那一篇（有附情境的，例如免費補給站的「去領」，就先開卡片、上面放「看完整專題」）。
   追蹤中的：用 live/<appid>.json（跟專題頁同一份）。
   其他（行情板、免費補給站、TGA 入圍、週報下週出擊、出擊日曆、專題裡的「跟誰像」）：讀 data/info/<appid>.json
   （GitHub Actions 每天從 Steam 商店更新：介紹、截圖、動態預告、語言、平台、價格、評價）。
   只有名字的用 data/names.json 查 appid（Steam 商店搜尋、名字完全一樣才算）。都沒有：簡單的卡＋點播解包、問 Claude、去商店找。 */
const INFO = { got: {}, names: null, seq: 0 };
/* 名字比對：跟資料管線 live.py 的 name_key 一模一樣（先拿掉 ™®©，全形半形統一、小寫、標點空白都當成一個空格） */
const ROMAN = { ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9', xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16' };
const nameKey = (s) => String(s || '').replace(/[™®©]/g, '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').map((w) => ROMAN[w] || w).join(' ');
function namesLoad() {
  if (INFO.names) return Promise.resolve(INFO.names);
  return once('names', () => getJSON('names.json').then((d) => (INFO.names = (d && d.names) || {})).catch(() => (INFO.names = {})));
}
async function nameKnown(...names) { const m = await namesLoad(); return names.some((n) => n && m[nameKey(n)]); }
async function appidOf(...names) {
  const m = await namesLoad();
  for (const n of names) { const e = n && m[nameKey(n)]; if (e && e[0]) return e[0]; }
  return null;
}
function infoLoad(a) {
  a = String(a);
  if (a in INFO.got) return Promise.resolve(INFO.got[a]);
  return once('info:' + a, () => getJSON('info/' + a + '.json').catch(() => null).then((d) => (INFO.got[a] = d)));
}
/* 這款寫過嗎：照 appid、照名字（中文名、英文名都比） */
function refOfSteam(a) {
  a = +a; if (!a) return null;
  const f = S.index.items.find((x) => +x.steam === a); if (f) return 'f/' + f.id;
  const p = ((S.picks && S.picks.items) || []).find((x) => +x.steam === a); return p ? 'p/' + p.id : null;
}
function refOfName(...names) {
  const ks = names.map(nameKey).filter((k) => k.length > 1); if (!ks.length) return null;
  const hit = (x) => ks.includes(nameKey(x.zh)) || ks.includes(nameKey(x.en));
  const f = S.index.items.find(hit); if (f) return 'f/' + f.id;
  const p = ((S.picks && S.picks.items) || []).find(hit); return p ? 'p/' + p.id : null;
}
function navTo(to) { closeSheet(); if (to === location.hash.replace('#', '')) return; sfx.slap(); NAVN++; location.hash = to; }

/* spec：{appid, name, en, img, badge, url, store, desc, dev, ref, ctx（這款在這裡的情境，HTML）, btns（多的按鈕，HTML）, key}
   沒有情境（ctx）又寫過的：直接去那一篇，那裡最完整。 */
async function gameInfo(spec) {
  const my = ++INFO.seq;
  let a = spec.appid ? +spec.appid : null;
  if (!a && (spec.name || spec.en)) a = await appidOf(spec.en, spec.name);
  const ref = (spec.ref && spec.ref.replace(':', '/')) || (a && refOfSteam(a)) || refOfName(spec.name, spec.en);
  if (ref && !spec.ctx) { navTo(ref); return; }
  if (!a) spec.known = await nameKnown(spec.en, spec.name);   // 名字查過了（真的找不到）還是還沒輪到
  const tracked = a && liveOf(a);
  const cached = !a ? null : tracked ? (liveReady(a) ? liveOf(a) : undefined) : (String(a) in INFO.got ? INFO.got[String(a)] : undefined);
  openSheet(`<div class="hinfo gi" id="gi">${gameHtml(spec, cached === undefined ? null : cached, a, ref, cached === undefined)}</div>`, 'hsheet');
  sfx.lock(); giFx();
  if (cached !== undefined) return;
  let d;
  if (tracked) { await liveLoad([a], 2500); d = liveOf(a); } else d = await infoLoad(a);
  const box = $('#gi'); if (!box || my !== INFO.seq) return;     // 已經關掉或開了別張
  box.innerHTML = gameHtml(spec, d, a, ref, false); giFx();
}
function giFx() {
  const v = $('#gi .hi-v'); if (v) { v.addEventListener('playing', () => v.classList.add('on'), { once: true }); v.play().catch(() => {}); }
}
const zhOf = (d) => (d && d.langs ? (d.langs.tc ? 'tc' : d.langs.sc ? 'sc' : 'none') : null);
function gameHtml(spec, d, a, ref, loading) {
  const name = spec.name || (d && d.name) || spec.en || '這款遊戲';
  const alt = [d && d.name, spec.en].find((n) => n && nameKey(n) !== nameKey(name));
  const img = spec.img || (d && d.img && (d.img.header || d.img.hero || d.img.wide)) || '';
  const mc = (d && !d.adult && d.micro) || {}; const mv = fxOn() && (mc.mp4 || mc.webm);
  const zh = zhOf(d); const rel = (d && d.rel) || {}; const pr = (d && d.price) || {}; const rv = (d && d.rv) || {};
  const chips = [
    ...((d && d.tags) || []).slice(0, 4).map((t) => `<span class="chip n">${esc(t)}</span>`),
    zh === 'tc' ? `<span class="chip">${d.langs.tc.audio ? '繁中語音' : '繁中'}</span>` : zh === 'sc' ? '<span class="chip n">只有簡中</span>' : zh === 'none' ? '<span class="chip n">無中文</span>' : '',
    d && (d.plat || []).includes('deck') ? '<span class="chip n">Steam Deck 驗證</span>' : '',
    rel.ea ? '<span class="chip y">搶先體驗</span>' : '', rel.soon ? '<span class="chip p">即將推出</span>' : '',
    d && d.ws ? '<span class="chip n">MOD 工作坊</span>' : '', d && d.free ? '<span class="chip y">免費遊玩</span>' : ''].join('');
  const yr = rel.date ? rel.date.slice(0, 4) : '';
  const cells = d ? [
    ['台灣售價', d.free ? '免費' : pr.final != null && (pr.final > 0 || pr.orig > 0) ? fmtNT(pr.final) : '—', pr.disc > 0 ? `特價 -${pr.disc}%${pr.orig ? '・原價 ' + fmtNT(pr.orig) : ''}` : pr.final > 0 ? 'Steam 台灣區' : rel.soon ? '還沒開賣' : '台灣區沒有標價'],
    ['上市', rel.date ? mdDay(rel.date) : rel.soon ? '未定' : '—', rel.date ? (rel.soon ? '預定・' : '') + yr + ' 年' : esc(rel.text || '')],
    ['Steam 評價', rv.n && rv.pct != null ? rv.pct + '%' : '—', rv.n && rv.pct != null ? `${rv.label || ''}・${fmtN(rv.n)} 則` : rel.soon ? '還沒上市' : '評論還不夠']] : [];
  const shots = (d && !d.adult && d.shots) || [];
  const store = a ? ['https://store.steampowered.com/app/' + a + '/', 'Steam 商店頁'] : spec.url ? [spec.url, (spec.store || '商店') + ' 頁面'] : spec.name ? ['https://store.steampowered.com/search/?term=' + encodeURIComponent(spec.en || spec.name), '到 Steam 找找'] : null;
  const qref = ref ? ref.replace('/', ':') : a ? 'a:' + a : '';
  const desc = (d && d.short) || spec.desc || '';
  const dev = d && (d.dev || d.pub) ? [d.dev && '開發：' + d.dev, d.pub && d.pub !== d.dev && '發行：' + d.pub].filter(Boolean).join('・') : spec.dev ? '開發：' + spec.dev : '';
  return `${img || mv ? `<div class="hi-img">${img ? `<img src="${esc(img)}" alt="" onerror="imgFail(this)">` : '<div class="ph">INFO</div>'}${mv ? `<video class="hi-v" muted loop playsinline autoplay preload="auto" src="${esc(mc.mp4 || mc.webm)}"></video>` : ''}${spec.badge ? `<span class="bn">${esc(spec.badge)}</span>` : ''}</div>` : ''}
    <h3 class="${img || mv ? '' : 'gi-top'}">${esc(name)}</h3>${alt ? `<div class="ben">${esc(alt)}</div>` : ''}
    ${chips.trim() ? `<div class="chips" style="padding:0;margin-top:8px">${chips}</div>` : ''}
    ${spec.ctx ? `<div class="gi-ctx">${spec.ctx}</div>` : ''}
    ${cells.length ? `<div class="hi-price">${cells.map(([k, v, s]) => `<div><span>${k}</span><b class="${String(v).length > 6 ? 'sm' : ''}">${esc(v)}</b>${s ? `<em>${esc(s)}</em>` : ''}</div>`).join('')}</div>` : ''}
    ${desc ? `<p class="hi-p">${esc(desc)}</p>` : loading ? '<p class="sub-note gi-wait">介紹讀取中…</p>' : ''}
    ${dev ? `<p class="sub-note">${esc(dev)}</p>` : ''}
    ${shots.length ? `<div class="gi-shots">${shots.map((s) => `<img src="${esc(s)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`).join('')}</div>` : ''}
    <div class="btnrow">${ref ? `<button class="btn y" data-go="${esc(ref)}">${ref[0] === 'f' ? ICON.page : ICON.gem}<span>${ref[0] === 'f' ? '看完整專題' : '看推坑全文'}</span></button>`
      : `<button class="btn y" data-act="askreq" data-g="${esc(name)}" data-a="${a || ''}">${ICON.radio}<span>點播解包這款</span></button>`}
      <button class="btn p" data-act="askq" data-q="${esc(name + '：值得玩嗎？')}" data-ref="${esc(qref)}" data-ctx="${esc(name)}">${ICON.radio}<span>問 Claude</span></button>
      ${spec.btns || ''}${store ? `<a class="btn" href="${esc(store[0])}" target="_blank" rel="noopener noreferrer">${ICON.cart}<span>${esc(store[1])}</span></a>` : ''}</div>
    <p class="sub-note gi-src">${d ? (isTracked(a) ? '介紹、截圖來自 Steam 商店（每小時更新）。' : '介紹、截圖來自 Steam 商店（每天更新）。') : loading ? '' : a ? 'Steam 的介紹還在整理，下一輪更新後就會出現；想看完整分析可以點播解包。' : !spec.known ? `Steam 的資料還在對（每小時對一批名字），晚點再點開看看${spec.url ? '' : '；也可以先到 Steam 找找'}。` : spec.desc ? `介紹來自 ${esc(spec.store || '商店')}；Steam 上找不到同名的遊戲。` : 'Steam 上找不到同名的遊戲（可能是主機獨佔、手機遊戲或還沒上架）。想看完整分析，點播解包就會排進寫稿。'}</p>`;
}
const isTracked = (a) => !!(a && liveOf(a));

/* 行情板的卡片下面接一段遊戲介紹（介紹、開發、上市、截圖），資料一樣從 live/ 或 info/ 來 */
async function giAboutInto(box, a) {
  if (!box || !a) return;
  let d;
  if (isTracked(a)) { await liveLoad([a], 2500); d = liveOf(a); } else d = await infoLoad(a);
  if (!d || !box.isConnected) return;
  const rel = d.rel || {}; const shots = (!d.adult && d.shots) || [];
  const dev = [d.dev && '開發：' + d.dev, d.pub && d.pub !== d.dev && '發行：' + d.pub, rel.date && (rel.soon ? '預定 ' : '') + rel.date.replace(/-/g, '/') + ' 上市'].filter(Boolean).join('・');
  if (!d.short && !shots.length) return;
  box.innerHTML = `<div class="gi-about"><h4>遊戲介紹</h4>${d.short ? `<p class="hi-p">${esc(d.short)}</p>` : ''}${dev ? `<p class="sub-note">${esc(dev)}</p>` : ''}
    ${shots.length ? `<div class="gi-shots">${shots.map((s) => `<img src="${esc(s)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`).join('')}</div>` : ''}</div>`;
}

/* 從各個地方點進來：key 決定是哪一款、帶什麼情境 */
async function gameOpen(k) {
  const [kind, ...rest] = String(k || '').split(':'); const id = rest.join(':');
  if (kind === 'free') {
    const x = ((S.free && S.free.items) || []).find((y) => y.id === id); if (!x) return;
    S.freeSeen[x.id] = 1; LS.set('freeSeen', S.freeSeen);
    const [sn] = STORE[x.store] || [x.store];
    const left = x.end ? Date.parse(x.end) - Date.now() : null; const got = !!S.freeGot[x.id];
    const ctx = `<b>${ICON.gift}${esc(sn)} ${x.up ? '下週免費' : '限時免費領'}</b><span>${x.up ? `${esc(twWhen(x.start))} 開放` : left != null ? `${esc(leftTxt(left))}・${esc(twWhen(x.end))} 截止` : '截止時間看商店頁'}${x.orig_t || x.orig ? `・原價 ${esc(x.orig_t || fmtNT(x.orig))}` : ''}</span><small>領了就永久留在帳號裡。${x.store === 'steam' ? '' : `要用 ${esc(sn)} 的帳號領。`}</small>`;
    const btns = x.up ? '' : `<a class="btn ${got ? '' : 'y'}" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" data-act="frgo" data-id="${esc(x.id)}">${ICON.gift}<span>${got ? '再看一次' : `去 ${esc(sn)} 領`}</span></a><button class="btn ${got ? 'k' : ''}" data-act="frgot" data-id="${esc(x.id)}">${got ? '✓ 領過了' : '標記領過'}</button>`;
    return gameInfo({ appid: x.appid, name: x.title, img: x.img, badge: x.up ? '下週免費' : '免費', url: x.url, store: sn, desc: x.desc, dev: x.dev, ctx, btns });
  }
  if (kind === 'tga') {
    const [cid, i] = id.split(':'); const t = S.tgaD; const c = t && t.cats.find((y) => y.id === cid); const n = c && c.nom[+i]; if (!n) return;
    const cats = t.cats.filter((y) => y.nom.some((m) => nameKey(m.n) === nameKey(n.n))).map((y) => y.zh);
    const ctx = `<b>${ICON.trophy}TGA 2026 入圍 ${cats.length} 項</b><span>${esc(cats.join('、'))}</span>`;
    return gameInfo({ appid: n.steam, name: n.zh || n.n, en: n.n, ref: n.ref, ctx: n.ref ? '' : ctx });
  }
  if (kind === 'wx') {
    const [wid, i] = id.split('#'); const wf = S.weekF && S.weekF[wid]; const n = wf && (wf.next || [])[+i]; if (!n) return;
    const dd = n.d.length > 7 ? `${mdDay(n.d)}（週${WK[new Date(n.d + 'T00:00:00Z').getUTCDay()]}）` : n.d.slice(0, 7).replace('-', '/') + '（日期未定）';
    const src = (n.s || []).map((j) => wf.sources && wf.sources[j]).filter(Boolean);
    const ctx = `<b>${ICON.cal}下週出擊・${esc(dd)}</b><span>${esc(n.t || '')}</span>${src.length ? `<small>來源：${src.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('、')}</small>` : ''}`;
    return gameInfo({ appid: n.steam, name: n.name, ref: n.ref, ctx: n.ref ? '' : ctx });
  }
  if (kind === 'cmp') { const p = id.indexOf('|'); return gameInfo({ appid: +id.slice(0, p) || null, name: id.slice(p + 1).replace(/[《》〈〉]/g, '').trim() }); }
  if (kind === 'a') return gameInfo({ appid: +id });
}
