/* 解包 — 點播台：點播解包（指定一款遊戲，下一班寫完整專題）＋你問我答（任何遊戲問題，下一班編輯查證後回答）。
   送出：App → 轉發站（ntfy.sh，訊息留約 12 小時）→ GitHub Actions 每小時收進 data/inbox.json
   → 寫稿（05:23）、推坑（11:43）、願望單（16:37）排程讀了回答，寫進 data/qa.json → 這裡和那一款的頁面都看得到。
   轉發站的主題寫在公開的程式裡，收件端一律當不可信資料；問答也存在公開的 GitHub 上，不要寫私人資料。 */
const ASK_RELAY = 'https://ntfy.sh/pz-unpacked-be41c9397306c2b86f06';
const ASK = { mode: 'ask', pre: null, err: 0, poll: 0, sending: false };
const SHIFTS = [[5, 23, '寫稿編輯', true], [11, 43, '推坑編輯', false], [16, 37, '願望單編輯', true]];   // 時、分、誰、會不會接點播解包
const QUICK = ['值得首發嗎？還是等特價？', '跟同類型的哪一款比較像？差在哪？', '適合拍成頻道影片嗎？要抓什麼角度？', '我的 SCAR 18 開最高畫質順嗎？', '有繁中嗎？台灣玩得到嗎？'];
S.ask = Object.assign({ dev: '', out: [], sent: {}, mine: [], seen: {} }, LS.get('ask', {}));
if (!/^d[a-z0-9]{3,10}$/.test(S.ask.dev)) { S.ask.dev = 'd' + (Math.random().toString(36).slice(2) + 'x0000000').replace(/[^a-z0-9]/g, '').slice(0, 7); LS.set('ask', S.ask); }
const askSave = () => LS.set('ask', S.ask);
const askId = () => S.ask.dev + '-' + (Math.random().toString(36).slice(2) + '00000000').replace(/[^a-z0-9]/g, '').slice(0, 8);

function askEmit(type, data) {
  const ev = Object.assign({ id: askId(), t: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), type }, data);
  S.ask.out.push(ev); S.ask.out = S.ask.out.slice(-60);
  if (type !== 'tga') { S.ask.mine.unshift(ev); S.ask.mine = S.ask.mine.slice(0, 120); }
  askSave(); askFlush(); return ev;
}
async function askFlush(force) {
  if (ASK.sending || !navigator.onLine) { askLamp(); return; }
  const ttl = 3 * 3600e3, now = Date.now();
  const todo = S.ask.out.filter((e) => force || !S.ask.sent[e.id] || now - Date.parse(S.ask.sent[e.id]) > ttl);
  if (!todo.length) { askLamp(); return; }
  const enc = new TextEncoder(); const chunks = []; let cur = [];
  for (const e of todo) { cur.push(e); if (enc.encode(JSON.stringify({ v: 1, dev: S.ask.dev, ev: cur })).length > 3000) { cur.pop(); if (cur.length) chunks.push(cur); cur = [e]; } }
  if (cur.length) chunks.push(cur);
  ASK.sending = true;
  try {
    for (const c of chunks) {
      await fetch(ASK_RELAY, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ v: 1, dev: S.ask.dev, ev: c }) });
      const t = new Date().toISOString(); c.forEach((e) => { S.ask.sent[e.id] = t; });
    }
    ASK.err = 0;
  } catch (e) { ASK.err = Date.now(); }
  ASK.sending = false; askSave(); askLamp();
}
/* inbox.json 收到的就從待送移掉 */
function askAck() {
  const got = new Set(((S.inbox && S.inbox.events) || []).map((e) => e.id));
  const n = S.ask.out.length;
  S.ask.out = S.ask.out.filter((e) => !got.has(e.id));
  if (S.ask.out.length !== n) { for (const k of Object.keys(S.ask.sent)) if (got.has(k)) delete S.ask.sent[k]; askSave(); }
}
const qaOf = (id) => ((S.qa && S.qa.items) || []).find((x) => x.id === id) || null;
const inboxHas = (id) => ((S.inbox && S.inbox.events) || []).some((e) => e.id === id);
function askState(ev) {
  const qa = qaOf(ev.id);
  if (qa && (qa.st === 'done' || qa.st === 'no')) return { k: qa.st, qa };
  if (qa && qa.st === 'wip') return { k: 'wip', qa };
  if (inboxHas(ev.id)) return { k: 'queued' };
  if (S.ask.sent[ev.id]) return { k: 'sent' };
  return { k: 'out' };
}
/* 下一班會處理的排程（點播解包只有寫稿、願望單兩班接） */
function nextShift(type) {
  const tw = new Date(Date.now() + 8 * 3600e3); const mins = tw.getUTCHours() * 60 + tw.getUTCMinutes();
  for (let d = 0; d < 2; d++) for (const s of SHIFTS) {
    if ((type === 'req' || type === 'vid') && !s[3]) continue;
    const m = s[0] * 60 + s[1] + d * 1440;
    if (m > mins + 5) return { name: s[2], at: `${d ? '明天' : '今天'} ${String(s[0]).padStart(2, '0')}:${String(s[1]).padStart(2, '0')}`, inMin: m - mins };
  }
  return { name: SHIFTS[0][2], at: '明天 05:23', inMin: 0 };
}
function askUnread() {
  return S.ask.mine.filter((e) => { const q = qaOf(e.id); return q && (q.st === 'done' || q.st === 'no') && !S.ask.seen[e.id]; }).length;
}
function askLamp() {
  const un = S.ask.out.filter((e) => !S.ask.sent[e.id]).length; const wt = S.ask.out.length - un;
  const st = un && ASK.err ? 'off' : un || wt ? 'wait' : 'ok';
  const txt = un && ASK.err ? `送不出去 ${un}（連上網路會自動重送）` : un ? `送出中 ${un}` : wt ? `已送出 ${wt}・等收件（每小時收一次）` : '都收到了';
  $$('.ask-lamp').forEach((el) => { el.className = 'ask-lamp ' + st; el.querySelector('span').textContent = txt; });
  const d = $('.askb .dot'); if (d) { const n = askUnread(); d.textContent = n; d.classList.toggle('hide', !n); }
}

/* ---- 畫面 ---- */
function refLabel(ref) {
  if (!ref) return '';
  if (ref === 'tga') return 'TGA 預測戰';
  if (ref === 'board') return '行情板';
  if (/^a:\d+$/.test(ref)) { const r = bd() && bd().rows.find((x) => 'a:' + x.a === ref); return r ? mkName(r) : 'Steam ' + ref.slice(2); }
  const r = wkRef(ref); return r ? r.it.zh : '';
}
function qaBody(q) {
  const src = q.src || [];
  return `<div class="qa-a ${q.st}"><div class="qa-h"><b>${q.st === 'no' ? '這題先不接' : q.st === 'wip' ? esc((q.by || 'Claude') + '・處理中') : esc(q.by || 'Claude')}</b><span>${esc(q.at ? ago(q.at) : '')}</span></div>
    ${String(q.a || '').split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${(q.pts || []).length ? `<ul>${q.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${q.link && wkRef(q.link) ? `<div class="btnrow"><button class="btn sm y" data-go="${esc(q.link.replace(':', '/'))}">${ICON.page}<span>${q.type === 'req' ? '看完整解包' : '看那一篇'}</span></button></div>` : ''}
    ${src.length ? `<details class="qa-src"><summary>${src.length} 個來源</summary><ol>${src.map((s) => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a></li>`).join('')}</ol></details>` : ''}</div>`;
}
function askItem(ev) {
  const st = askState(ev); const isReq = ev.type === 'req' || ev.type === 'vid'; const isVid = ev.type === 'vid'; const nx = nextShift(ev.type);
  const myVid = isVid && (S.ops.vids || []).find((v) => v.ev === ev.id);
  const lab = { out: ['送出中', 'w'], sent: ['已送出・等收件（每小時收一次）', 'w'], queued: [`收到了・排隊中，下一班 ${nx.at} ${nx.name}`, 'y'], wip: ['處理中', 'y'], done: ['已回覆', 'g'], no: ['已回覆', 'k'] }[st.k];
  const ref = refLabel(ev.ref);
  return `<article class="qa ${st.k} ${st.qa && !ev.other && !S.ask.seen[ev.id] ? 'new' : ''}" id="qa-${esc(ev.id)}">
    <div class="qa-q"><div class="qa-qh"><span class="qa-tag ${isReq ? 'req' : ''}">${isVid ? '影片三連發' : isReq ? '點播解包' : '你問我答'}</span>${ref ? `<span class="qa-ref">關於：${esc(ref)}</span>` : ''}<time>${esc(ago(ev.t))}</time></div>
      <p>${isVid ? `<b>${esc(ev.title || ev.q || '')}</b>` : isReq ? `<b>${esc(ev.game)}</b>${ev.note ? `<br>${esc(ev.note)}` : ''}` : esc(ev.q)}</p><div class="qa-st s-${lab[1]}"><i></i>${esc(lab[0])}</div></div>
    ${st.qa ? qaBody(st.qa) : ''}${myVid ? `<div class="qa-more"><button class="btn sm y" data-go="fan/~vid:${esc(myVid.id)}">${ICON.film}<span>看三連發</span></button></div>` : ''}
    ${!isReq ? `<div class="qa-more"><button class="btn sm" data-act="askchat" data-id="${esc(ev.id)}">${ICON.copy}<span>現在就聊：複製去問 Claude</span></button></div>` : ''}</article>`;
}
function renderAsk() {
  const pre = ASK.pre || {}; if (pre.mode) ASK.mode = pre.mode;
  const mode = ASK.mode; const nx = nextShift(mode === 'req' ? 'req' : 'ask');
  const mine = new Set(S.ask.mine.map((e) => e.id));
  const others = ((S.qa && S.qa.items) || []).filter((q) => !mine.has(q.id) && q.st === 'done' && q.type !== 'vid').map((q) => ({ id: q.id, t: q.t || q.at, type: q.type, q: q.q, game: q.q, ref: q.ref, other: true }));
  const list = S.ask.mine.concat(others).sort((a, b) => String(b.t).localeCompare(String(a.t)));
  // 選單只列最近的（專題 60 篇、推坑 40 款）；更早的到那一款的頁面按「問 Claude」就會自動帶進來
  const games = [...((S.index && S.index.items) || []).slice(0, 60).map((x) => ['f:' + x.id, x.zh]), ...((S.picks && S.picks.items) || []).slice(0, 40).map((x) => ['p:' + x.id, x.zh + '（推坑）'])];
  return `<section class="ask-hero"><div class="ask-air"><i></i>ON AIR</div><h1>點播台</h1><p>你點，我解。指定一款遊戲，或問任何遊戲問題：下一班編輯查證後回答，答案寫回這裡。</p>
      <div class="ask-lamp ok"><i></i><span>都收到了</span></div><div class="ask-waves"><i></i><i></i><i></i></div></section>
    <div class="seg ask-seg"><button class="${mode === 'ask' ? 'on' : ''}" data-act="askmode" data-v="ask">你問我答</button><button class="${mode === 'req' ? 'on' : ''}" data-act="askmode" data-v="req">點播解包</button></div>
    <section class="ask-form">${mode === 'req' ? `<label>想解包哪一款？<input id="askgame" type="text" maxlength="100" placeholder="遊戲名稱（中文或英文都可以）" value="${esc(pre.game || '')}"></label>
        <label>想特別知道什麼？（選填）<textarea id="asknote" maxlength="300" placeholder="例如：值不值得首發、有沒有中文、適不適合拍影片">${esc(pre.note || '')}</textarea></label>
        <p class="sub-note">寫好的完整專題會出現在今日牆，跟每天的解包一樣深（研究、查核、粉專稿都有）。一天最多接 1～2 款點播。</p>`
      : `<label>你的問題<textarea id="askq" maxlength="600" placeholder="例如：Balatro 跟殺戮尖塔比，哪個適合我？">${esc(pre.q || '')}</textarea></label>
        <div class="ask-chips">${QUICK.map((q, i) => `<button class="chip y" data-act="askchip" data-i="${i}">${esc(q)}</button>`).join('')}</div>
        <label>關於哪一款？（選填）<select id="askref"><option value="">不指定</option>${pre.ref && !games.some((g) => g[0] === pre.ref) ? `<option value="${esc(pre.ref)}" selected>${esc(refLabel(pre.ref) || pre.ctx || pre.ref)}</option>` : ''}${games.map(([v, l]) => `<option value="${esc(v)}" ${pre.ref === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`}
      <div class="ask-send"><button class="btn p" data-act="asksend">${ICON.radio}<span>${mode === 'req' ? '點播！' : '送出問題'}</span></button><span>下一班：<b>${esc(nx.at)}</b> ${esc(nx.name)}</span></div></section>
    <div class="ask-shifts">${SHIFTS.map((s) => `<div><b>${String(s[0]).padStart(2, '0')}:${String(s[1]).padStart(2, '0')}</b><span>${s[2]}</span><em>${s[3] ? '點播＋問答' : '問答'}</em></div>`).join('')}</div>
    <h3 class="tape-h">點播紀錄 <small>${list.length} 則</small></h3>
    <div class="qas">${list.map(askItem).join('') || '<div class="empty">還沒有點播。上面打一個問題試試看！</div>'}</div>
    <p class="sub-note" style="margin-top:14px">問答會存在公開的 GitHub 上（跟每天的解包一樣），不要寫私人資料。排程只回答遊戲相關的問題；回答都會附來源。<br>送不出去時（上面的燈變紅），連上網路或下次打開 App 會自動重送。</p>`;
}
function askFx() {
  askLamp();
  if (fxOn()) $$('.ask-waves i').forEach((w, i) => w.style.setProperty('--i', i));
  // 看過的回答：分頁上的數字歸零
  setTimeout(() => { if (!ROUTE.startsWith('ask')) return; let ch = 0; for (const e of S.ask.mine) { const q = qaOf(e.id); if (q && (q.st === 'done' || q.st === 'no') && !S.ask.seen[e.id]) { S.ask.seen[e.id] = 1; ch = 1; } } if (ch) { askSave(); askLamp(); } }, 1600);
  clearInterval(ASK.poll);
  ASK.poll = setInterval(async () => { if (!ROUTE.startsWith('ask')) { clearInterval(ASK.poll); return; } const before = JSON.stringify((S.qa || {}).items || []) + JSON.stringify(((S.inbox || {}).events || []).length); await loadAsk(); if (before !== JSON.stringify((S.qa || {}).items || []) + JSON.stringify(((S.inbox || {}).events || []).length)) { const y = scrollY; VIEW().innerHTML = renderAsk(); scrollTo(0, y); askLamp(); toast('點播台有新動態'); } }, 120e3);
}
function askStop() { clearInterval(ASK.poll); }

/* ---- 送出 ---- */
function askSend() {
  if (ASK.mode === 'req') {
    const g = ($('#askgame') || {}).value || ''; const note = ($('#asknote') || {}).value || '';
    if (g.trim().length < 2) { toast('先寫遊戲名稱', 'warn'); return; }
    const pre = ASK.pre || {};
    askEmit('req', Object.assign({ game: g.trim().slice(0, 100) }, note.trim() ? { note: note.trim().slice(0, 300) } : {}, pre.appid ? { appid: +pre.appid } : {}));
  } else {
    const q = ($('#askq') || {}).value || ''; const ref = ($('#askref') || {}).value || '';
    if (q.trim().length < 4) { toast('問題寫長一點點', 'warn'); return; }
    const pre = ASK.pre || {};
    askEmit('ask', Object.assign({ q: q.trim().slice(0, 600) }, ref ? { ref } : {}, pre.ctx && ref === pre.ref ? { ctx: pre.ctx.slice(0, 120) } : {}));
  }
  ASK.pre = null; sfx.radio(); haptic(20);
  const b = $('[data-act="asksend"]'); if (b) burstAt(b, [PINK, YEL, BLK], 22, 11);
  const nx = nextShift(ASK.mode === 'req' ? 'req' : 'ask');
  toast(`送出了！下一班 ${nx.at} ${nx.name}會處理`);
  const y = scrollY; VIEW().innerHTML = renderAsk(); scrollTo(0, y); askFx();
  const first = $('.qas .qa'); if (first) { first.classList.add('sent'); }
}
/* 專題／推坑頁的「問 Claude」 */
async function askSheet(kind, id) {
  const it = findItem(id); const name = it ? it.zh : id; const ref = (kind === 'pick' ? 'p:' : 'f:') + id; const nx = nextShift('ask');
  openSheet(`<h3>問 Claude：${esc(name)}</h3>
    <div class="ask-opt"><b>${ICON.radio}送到點播台</b><p>下一班 <b>${esc(nx.at)} ${esc(nx.name)}</b> 查證後回答，答案會出現在這一頁和點播台。</p>
      <textarea id="askq" maxlength="600" placeholder="例如：值得首發嗎？跟○○比呢？"></textarea>
      <div class="ask-chips">${QUICK.map((q, i) => `<button class="chip y" data-act="askchip" data-i="${i}">${esc(q)}</button>`).join('')}</div>
      <div class="btnrow"><button class="btn p" data-act="asksheet" data-ref="${esc(ref)}" data-ctx="${esc(name)}">${ICON.radio}<span>送出問題</span></button></div></div>
    <div class="ask-opt"><b>${ICON.copy}現在就聊</b><p>把這款的重點整理好複製起來，貼到 Claude 就能馬上接著聊。</p><div class="btnrow"><button class="btn" data-act="askpack" data-k="${kind}" data-id="${esc(id)}">複製重點、打開 Claude</button></div></div>`, 'hsheet');
}
async function askPack(kind, id) {
  let txt = '';
  try {
    if (kind === 'pick') {
      const f = await loadPick(id); const lv = liveOf(f.game.steam);
      txt = `我在《解包》看到 Claude 推坑的《${f.game.zh}》（${f.game.en}）。\n推坑理由：${f.pitch}\n${f.why}\n${f.reasons.map((r, i) => `${i + 1}. ${r.h}：${r.t}`).join('\n')}\n價格：${priceLabel({ price_text: f.game.price_text }, lv)}\n（推坑寫於 ${f.date}）\n\n我想問：`;
    } else {
      const f = await loadFeature(id); const lv = liveOf(f.game.steam);
      txt = `我在《解包》看《${f.game.zh}》（${f.game.en}）的專題：${f.headline}\n結論：${f.verdict.stamp}（${f.verdict.label}）${f.verdict.summary}\n${f.buy ? `買不買：${f.buy.call}${f.buy.target != null ? `，目標價 ${fmtNT(f.buy.target)}` : ''}。${f.buy.why}\n` : ''}平台：${f.game.platforms.join('、')}；價格：${priceLabel({ price_text: f.game.price_text }, lv)}；${f.game.release_text}\n（專題寫於 ${f.date}）\n\n我想問：`;
    }
  } catch (e) { txt = `我在《解包》看《${(findItem(id) || {}).zh || id}》，我想問：`; }
  const ok = await copyText(txt);
  if (ok) { sfx.stamp(); toast('重點已複製：貼到 Claude 就能接著聊'); setTimeout(() => window.open('https://claude.ai/new', '_blank', 'noopener'), 350); } else toast('複製失敗', 'warn');
}
async function askChat(id) {
  const e = S.ask.mine.find((x) => x.id === id) || {}; const q = qaOf(id);
  const txt = `我在《解包》的點播台問了：${e.q || (q && q.q) || ''}${e.ref ? `（關於：${refLabel(e.ref)}）` : ''}${q && q.a ? `\nClaude 編輯的回答：${q.a}` : ''}\n\n我想接著聊：`;
  if (await copyText(txt)) { sfx.stamp(); toast('已複製：貼到 Claude 就能接著聊'); setTimeout(() => window.open('https://claude.ai/new', '_blank', 'noopener'), 350); } else toast('複製失敗', 'warn');
}
/* 專題／推坑頁：你問過的 */
function askBoxFor(ref) {
  const items = ((S.qa && S.qa.items) || []).filter((q) => q.ref === ref && q.type === 'ask' && (q.st === 'done' || q.st === 'no'));
  const pend = S.ask.mine.filter((e) => e.ref === ref && e.type === 'ask' && !qaOf(e.id));
  if (!items.length && !pend.length) return '';
  return `<section class="qa-box"><h3 class="tape-h y">${ICON.radio}你問過 Claude <small>${items.length} 則已回覆${pend.length ? `・${pend.length} 則排隊中` : ''}</small></h3>
    ${pend.map((e) => `<div class="qa-mini wait"><b>Q</b><p>${esc(e.q)}</p><span>排隊中，下一班 ${esc(nextShift('ask').at)}</span></div>`).join('')}
    ${items.map((q) => `<div class="qa-mini"><b>Q</b><p>${esc(q.q)}</p>${qaBody(q)}</div>`).join('')}</section>`;
}
