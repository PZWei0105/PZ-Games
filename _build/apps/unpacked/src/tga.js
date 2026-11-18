/* 解包 — TGA 預測戰：The Game Awards 2026 的 30 個獎，你先押；Claude 的預測 11/18 就寫好封存在 data/tga.json，你鎖定之後才拆封。
   開獎當天的排程把得獎填進 tga.json 的 win，App 自動對答案算分（年度遊戲 5 分、六項製作獎 2 分、其他 1 分；加倍卡 3 張）。
   你的押注只存在這台裝置；鎖定時也送一份到點播台收件，開獎排程的推播才算得出你的分數。 */
const TGA = { cd: 0, sure: false, card: { mode: 'pred', ratio: '45', seed: 1 }, justLocked: false };
const TGA_GRP = [['main', '年度大獎與製作獎'], ['indie', '獨立遊戲'], ['genre', '類型獎'], ['more', '其他獎項'], ['extra', '番外：電競與創作者']];
S.tgaMe = Object.assign({ picks: {}, x2: [], lock: null, peek: false, seenRes: false }, LS.get('tga', {}));
const tgaSave = () => LS.set('tga', S.tgaMe);
const nomName = (n) => (n ? n.zh || n.n : '');

function tgaPhase() {
  const t = S.tgaD; if (!t) return 'none';
  if (t.result_at || t.cats.some((c) => c.win != null)) return 'result';
  if (Date.now() >= Date.parse(t.show)) return 'live';
  return S.tgaMe.lock ? 'locked' : 'pick';
}
function tgaReveal() { const ph = tgaPhase(); return !!(S.tgaMe.lock || S.tgaMe.peek || ph === 'live' || ph === 'result'); }
function tgaPicked() { const t = S.tgaD; return t ? t.cats.filter((c) => S.tgaMe.picks[c.id] != null).length : 0; }
function tgaScore(who) {
  const t = S.tgaD; let pts = 0, hit = 0, done = 0, max = 0;
  for (const c of (t && t.cats) || []) {
    const p = who === 'me' ? S.tgaMe.picks[c.id] : c.claude.c; const k = who === 'me' && S.tgaMe.x2.includes(c.id) ? 2 : 1;
    max += c.pt * k;
    if (c.win == null) continue;
    done++; if (p === c.win) { hit++; pts += c.pt * k; }
  }
  return { pts, hit, done, max };
}
function tgaDiff() { const t = S.tgaD; return t ? t.cats.filter((c) => S.tgaMe.picks[c.id] != null && S.tgaMe.picks[c.id] !== c.claude.c).length : 0; }

function tgaNom(c, n, i, my, reveal, can) {
  const r = n.ref && wkRef(n.ref);
  const cls = [my === i ? 'me' : '', reveal && c.claude.c === i ? 'cl' : '', c.win === i ? 'win' : '', c.win != null && c.win !== i ? 'out' : ''].join(' ');
  const mk = (reveal && c.claude.c === i ? '<i class="tg-cl">C</i>' : '') + (my === i ? '<i class="tg-me">押</i>' : '');
  return `<button class="tg-n ${cls}" data-act="tgapick" data-c="${c.id}" data-i="${i}"${can ? '' : ' aria-disabled="true"'}><span class="tg-l">${'ABCDEFGH'[i]}</span><span class="tg-nt"><b>${esc(nomName(n))}</b>${n.zh ? `<small>${esc(n.n)}</small>` : ''}${n.sub ? `<small>${esc(n.sub)}</small>` : ''}${r ? `<em>${r.kind === 'f' ? '解包過' : '推坑過'}</em>` : ''}</span>${mk ? `<span class="tg-mk">${mk}</span>` : ''}${c.win === i ? `<i class="tg-win">${ICON.trophy}<b>得獎</b></i>` : ''}</button>`;
}
function tgaCatHtml(c, ph, reveal) {
  const me = S.tgaMe; const my = me.picks[c.id]; const x2 = me.x2.includes(c.id); const can = ph === 'pick'; const cl = c.claude;
  const res = c.win != null ? `<div class="tg-res"><b class="${my === c.win ? 'ok' : 'no'}">${my == null ? '你沒押' : my === c.win ? `你押中 +${c.pt * (x2 ? 2 : 1)}` : '你沒中'}</b><b class="${cl.c === c.win ? 'ok' : 'no'}">Claude ${cl.c === c.win ? '押中 +' + c.pt : '沒中'}</b></div>` : '';
  return `<section class="tg-cat g-${c.grp} ${c.id === 'goty' ? 'goty' : ''} ${my != null ? 'has' : ''}" id="tg-${c.id}">
    <div class="tg-ch"><div class="tg-cn"><h4>${esc(c.zh)}</h4><span>${esc(c.en)}</span></div><b class="tg-pt">${c.pt}<small>分</small></b>${can || x2 ? `<button class="tg-x2 ${x2 ? 'on' : ''}" data-act="tgax2" data-c="${c.id}"${can ? '' : ' disabled'}>×2</button>` : ''}</div>
    <div class="tg-noms">${c.nom.map((n, i) => tgaNom(c, n, i, my, reveal, can)).join('')}</div>
    ${reveal ? `<div class="tg-why ${my != null && my !== cl.c ? 'diff' : ''}"><b>Claude 押「${esc(nomName(c.nom[cl.c]))}」<i>${'★'.repeat(cl.conf)}${'☆'.repeat(3 - cl.conf)}</i></b><p>${esc(cl.why)}</p></div>` : ''}${res}</section>`;
}
function tgaCd() {
  const t = S.tgaD; const ms = Date.parse(t.show) - Date.now();
  if (ms <= 0) return tgaPhase() === 'result' ? '已開獎' : '直播中';
  const d = Math.floor(ms / 864e5); return `D-${d} ${cdTxt(ms % 864e5)}`;
}
function renderTga() {
  const t = S.tgaD;
  const head = '';
  if (!t) return `<div class="sec-h"><h2 class="spray-h y">TGA 預測戰</h2></div><div class="empty">TGA 資料讀不到，晚點再試。</div>`;
  const ph = tgaPhase(); const me = S.tgaMe; const reveal = tgaReveal();
  const n = t.cats.length; const picked = tgaPicked(); const a = tgaScore('me'), b = tgaScore('cl');
  const goty = t.cats.find((c) => c.id === 'goty');
  const res = ph === 'result';
  const lead = res ? (a.pts > b.pts ? 'me' : a.pts < b.pts ? 'cl' : 'tie') : '';
  const hero = `<section class="tg-hero ${ph}" id="tghero"><div class="tg-beams"><i></i><i></i><i></i><i></i></div><div class="tg-stars"></div>
    <div class="tg-k">THE GAME AWARDS 2026</div><h1 class="tg-t"><span>TGA</span>預測戰</h1>
    <div class="tg-cd"><b id="tgcd">${esc(tgaCd())}</b><span>${res ? `${esc(twWhen(t.show))} 頒獎・開獎完成 ${a.done}/${n}` : `台灣時間 ${esc(twWhen(t.show))} 開播・${esc(t.venue || '')}`}</span></div>
    <div class="tg-sb">
      <div class="tg-p me ${lead === 'me' ? 'lead' : ''}"><span>痞子葳</span><b ${res ? `class="cu" data-n="${a.pts}" data-f="i"` : ''}>${res ? a.pts : `${picked}<small>/${n}</small>`}</b><em>${res ? `分・猜中 ${a.hit} 項${me.peek ? '・偷看過' : ''}` : ph === 'pick' ? '押注中' : me.lock ? '已鎖定' : '沒鎖定'}</em>${lead === 'me' ? '<i class="crown">👑</i>' : ''}</div>
      <div class="tg-vs">VS</div>
      <div class="tg-p cl ${lead === 'cl' ? 'lead' : ''}"><span>Claude</span><b ${res ? `class="cu" data-n="${b.pts}" data-f="i"` : 'class="txt"'}>${res ? b.pts : reveal ? '已拆封' : '封存中'}</b><em>${res ? `分・猜中 ${b.hit} 項` : reveal ? `跟你不同 ${tgaDiff()} 項` : '11/18 寫好'}</em>${lead === 'cl' ? '<i class="crown">👑</i>' : ''}</div>
    </div></section>`;
  const info = res ? `<div class="tg-info"><p class="tg-rule">${esc(t.rules)}</p><a class="btn sm" href="${esc(t.vote_url)}" target="_blank" rel="noopener noreferrer">${ICON.trophy}<span>TGA 官網看完整得獎名單</span></a></div>` : `<div class="tg-info"><p>${esc(t.intro)}</p><p class="tg-rule">${esc(t.rules)}</p>
    ${Date.now() < Date.parse(t.vote_end) ? `<a class="btn sm y" href="${esc(t.vote_url)}" target="_blank" rel="noopener noreferrer">${ICON.trophy}<span>去官網投粉絲票（${esc(twWhen(t.vote_end))} 截止）</span></a>` : ''}</div>`;
  const env = !reveal ? `<div class="tg-env"><div class="env"><i class="flap"></i><b class="wax">C</b></div><div class="tg-et"><b>Claude 的 30 項預測封存中</b><span>${esc(mdDay(t.sealed.slice(0, 10)))} 寫好、存在 GitHub 上；你鎖定之後才拆封，誰也不能偷改（<a href="https://github.com/PZWei0105/PZ-Games/commits/main/apps/unpacked/data/tga.json" target="_blank" rel="noopener noreferrer">修改紀錄就是證明</a>）。</span><button class="btn sm" data-act="tgapeek">偷看（成績單會註記）</button></div></div>` : '';
  const groups = TGA_GRP.map(([g, label]) => { const cs = t.cats.filter((c) => c.grp === g); return cs.length ? `<h3 class="tape-h ${g === 'main' ? 'p' : g === 'extra' ? '' : 'y'}">${esc(label)} <small>${cs.length} 項</small></h3><div class="tg-cats">${cs.map((c) => tgaCatHtml(c, ph, reveal)).join('')}</div>` : ''; }).join('');
  const bar = ph === 'pick' ? `<div class="tg-bar"><div class="tgb-p"><b>${picked}<small>/${n}</small></b><span>已押・加倍 ${me.x2.length}/3</span><i style="--p:${(picked / n * 100).toFixed(1)}%"></i></div><button class="btn p" data-act="tgalock">${TGA.sure ? '再按一次鎖定（鎖了就不能改）' : '鎖定預測'}</button></div>` : '';
  const card = (me.lock || res) && goty && me.picks.goty != null ? `<h3 class="tape-h p">粉專圖卡</h3>
    <div class="cardwrap"><canvas id="cardcv" width="1080" height="1350"></canvas><div class="cardbusy" id="cardbusy">噴漆中…</div></div>
    <div class="btnrow" style="justify-content:center"><button class="btn sm ${TGA.card.mode === 'pred' ? 'y' : ''}" data-act="tgacm" data-v="pred">預測卡</button>${res ? `<button class="btn sm ${TGA.card.mode === 'score' ? 'y' : ''}" data-act="tgacm" data-v="score">成績單</button>` : ''}<button class="btn sm ${TGA.card.ratio === '45' ? 'y' : ''}" data-act="tgacr" data-v="45">4:5 直式</button><button class="btn sm ${TGA.card.ratio === '11' ? 'y' : ''}" data-act="tgacr" data-v="11">1:1 方形</button></div>
    <div class="btnrow" style="justify-content:center"><button class="btn p" data-act="tgaspray">${ICON.can}<span>重噴一張</span></button><button class="btn y" data-act="tgadl">${ICON.dl}<span>下載圖卡</span></button>${navigator.share ? `<button class="btn" data-act="tgashare">${ICON.share}<span>分享圖卡</span></button>` : ''}</div>
    <div class="copybox"><h4>粉專貼文</h4><textarea id="posttxt">${esc(tgaPost())}</textarea><div class="btnrow"><button class="btn y sm" data-act="tgacopy">${ICON.copy}<span>複製貼文</span></button></div></div>` : '';
  return head + hero + info + env + groups + card
    + `<details class="wsrc"><summary>入圍名單與 Claude 預測的 ${t.sources.length} 個來源</summary><ol class="srcs">${t.sources.map((s, i) => `<li><b>${i + 1}</b><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>${s.d ? `（${esc(s.d)}）` : ''}</li>`).join('')}</ol></details>
    <p class="sub-note" style="margin-top:10px">入圍名單照 TGA 官方公布（11/17）；Claude 的預測是看評價、入圍數和往年頒獎傾向的判斷，不是內線消息。</p>` + bar;
}
/* 首頁橫幅：開獎後一週收起來 */
function tgaBanner() {
  const t = S.tgaD; if (!t) return '';
  const show = Date.parse(t.show); if (Date.now() > show + 8 * 864e5) return '';
  const ph = tgaPhase(); const picked = tgaPicked(); const n = t.cats.length; const d = Math.max(0, Math.ceil((show - Date.now()) / 864e5));
  let main, sub;
  if (ph === 'result') { const a = tgaScore('me'), b = tgaScore('cl'); const g = t.cats.find((c) => c.id === 'goty'); main = `TGA 開獎！你 ${a.pts} 分 vs Claude ${b.pts} 分`; sub = g && g.win != null ? `年度最佳遊戲：${nomName(g.nom[g.win])}` : '得獎名單陸續填入中'; }
  else if (ph === 'live') { main = 'TGA 頒獎直播中'; sub = '得獎名單一出來就自動對答案'; }
  else if (ph === 'locked') { main = `預測已鎖定・D-${d}`; sub = `${twWhen(t.show)} 開獎，跟 Claude 比誰準`; }
  else { main = picked ? `TGA 預測戰：已押 ${picked}/${n}，還沒鎖定` : 'TGA 2026 預測戰開打'; sub = `D-${d}・30 個獎你先押，再拆 Claude 的封存預測`; }
  return `<div class="tg-ban ${ph}" data-go="tga"><div class="tgb-l">${ICON.trophy}<b>TGA</b><span>2026</span></div><div class="tgb-b"><b>${esc(main)}</b><span>${esc(sub)}</span></div><span class="hs-a">→</span></div>`;
}

/* ---- 互動 ---- */
function tgaAct(a, act) {
  const t = S.tgaD; if (!t) return false;
  const ph = tgaPhase(); const me = S.tgaMe;
  if (a === 'tgapick') {
    if (ph !== 'pick') { toast(ph === 'locked' ? '已經鎖定了，等開獎' : '已經開播，不能再押', 'warn'); return true; }
    const c = act.dataset.c, i = +act.dataset.i;
    if (me.picks[c] === i) { delete me.picks[c]; sfx.scratch(); } else { me.picks[c] = i; sfx.stamp(); haptic(); burstAt(act, [YEL, PINK, BLK], 12, 7); }
    tgaSave(); TGA.sure = false; tgaRefreshCat(c); tgaBarUpdate(); return true;
  }
  if (a === 'tgax2') {
    if (ph !== 'pick') return true;
    const c = act.dataset.c; const k = me.x2.indexOf(c);
    if (k >= 0) { me.x2.splice(k, 1); sfx.scratch(); } else { if (me.x2.length >= 3) { toast('加倍卡只有 3 張，先收回一張', 'warn'); return true; } me.x2.push(c); sfx.lock(); burstAt(act, [PINK, YEL], 14, 8); }
    tgaSave(); tgaRefreshCat(c); tgaBarUpdate(); return true;
  }
  if (a === 'tgapeek') {
    me.peek = true; tgaSave(); sfx.rip(); toast('拆開偷看了：成績單會標「偷看過」'); const y = scrollY; VIEW().innerHTML = renderTga(); scrollTo(0, y); tgaFx(); tgaFlip(); return true;
  }
  if (a === 'tgalock') {
    if (ph !== 'pick') return true;
    if (me.picks.goty == null) { toast('至少先押年度最佳遊戲', 'warn'); const g = $('#tg-goty'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
    if (!TGA.sure) { TGA.sure = true; act.textContent = '再按一次鎖定（鎖了就不能改）'; sfx.click(); setTimeout(() => { TGA.sure = false; const bb = $('[data-act="tgalock"]'); if (bb) bb.textContent = '鎖定預測'; }, 4000); return true; }
    TGA.sure = false; me.lock = new Date().toISOString().replace(/\.\d+Z$/, 'Z'); tgaSave();
    const picks = {}; for (const c of t.cats) if (me.picks[c.id] != null) picks[c.id] = me.picks[c.id];
    askEmit('tga', { picks, x2: me.x2.slice(0, 3), peek: !!me.peek, lock: me.lock });
    TGA.justLocked = true; sfx.drop(); haptic(30); route(); return true;
  }
  if (a === 'tgacm' || a === 'tgacr' || a === 'tgaspray') {
    if (a === 'tgacm') TGA.card.mode = act.dataset.v; if (a === 'tgacr') TGA.card.ratio = act.dataset.v;
    if (a === 'tgaspray') { TGA.card.seed++; sfx.rattle(); setTimeout(() => sfx.hiss(0.6), 200); } else sfx.click();
    $$('[data-act="tgacm"]').forEach((x) => x.classList.toggle('y', x.dataset.v === TGA.card.mode)); $$('[data-act="tgacr"]').forEach((x) => x.classList.toggle('y', x.dataset.v === TGA.card.ratio));
    const pt = $('#posttxt'); if (pt) pt.value = tgaPost();
    tgaCardRender(); return true;
  }
  if (a === 'tgadl' || a === 'tgashare') { tgaCardSave(a === 'tgashare'); return true; }
  if (a === 'tgacopy') { const v = $('#posttxt') ? $('#posttxt').value : tgaPost(); copyText(v).then((ok) => { if (ok) { sfx.stamp(); toast('已複製'); burstAt(act, [YEL, PINK], 12, 7); } else toast('複製失敗，請長按文字自己複製', 'warn'); }); return true; }
  return false;
}
function tgaRefreshCat(id) {
  const c = S.tgaD.cats.find((x) => x.id === id); const el = $('#tg-' + id); if (!c || !el) return;
  el.outerHTML = tgaCatHtml(c, tgaPhase(), tgaReveal());
}
function tgaBarUpdate() {
  const t = S.tgaD; const bar = $('.tg-bar'); const n = t.cats.length; const p = tgaPicked();
  if (bar) { $('.tgb-p b', bar).innerHTML = `${p}<small>/${n}</small>`; $('.tgb-p span', bar).textContent = `已押・加倍 ${S.tgaMe.x2.length}/3`; $('.tgb-p i', bar).style.setProperty('--p', (p / n * 100).toFixed(1) + '%'); const lb = $('[data-act="tgalock"]', bar); if (lb) lb.textContent = '鎖定預測'; }
  const me = $('.tg-p.me b'); if (me && tgaPhase() === 'pick') me.innerHTML = `${p}<small>/${n}</small>`;
}
/* 拆封：Claude 的理由一張張翻開 */
function tgaFlip() {
  const ws = $$('.tg-why'); if (!fxOn()) return;
  ws.forEach((w, i) => { w.classList.add('pre'); setTimeout(() => { if (!w.isConnected) return; w.classList.remove('pre'); w.classList.add('flip'); if (i < 8) sfx.blip(700 + i * 90); }, 300 + Math.min(i, 14) * 90); });
}
function tgaFx() {
  clearInterval(TGA.cd);
  const cd = $('#tgcd'); if (cd) TGA.cd = setInterval(() => { if (!cd.isConnected) { clearInterval(TGA.cd); return; } cd.textContent = tgaCd(); }, 1000);
  const hero = $('#tghero'); const ph = tgaPhase();
  if (hero && fxOn()) { hero.classList.add('go'); setTimeout(() => { sfx.riser(); }, 120); }
  if (TGA.justLocked) {
    TGA.justLocked = false;
    setTimeout(() => { sfx.rip(); flash(YEL, 0.35); burstAt($('.tg-p.cl') || hero, [YEL, PINK, BLK], 34, 15); }, 250);
    setTimeout(() => { sfx.fanfare(); toast(`Claude 拆封了：你們有 ${tgaDiff()} 項押得不一樣`); }, 650);
    tgaFlip();
  }
  if (ph === 'result') {
    const sb = $('.tg-sb'); if (sb) countUp(sb);
    if (!S.tgaMe.seenRes) { S.tgaMe.seenRes = true; tgaSave(); setTimeout(() => { sfx.fanfare(); const w = $('.tg-p.lead'); if (w) { burstAt(w, [YEL, PINK, BLK], 40, 16); if (fxOn()) shake(8, 260); } }, 900); }
  }
  if ($('#cardcv')) tgaCardRender();
}
function tgaStop() { clearInterval(TGA.cd); }

/* ---- 粉專：貼文與圖卡（品牌是遊戲狂想曲，不寫名字） ---- */
function tgaPost() {
  const t = S.tgaD; const me = S.tgaMe; const pick = (c) => (me.picks[c.id] != null ? nomName(c.nom[me.picks[c.id]]) : '（沒押）');
  const main = t.cats.filter((c) => c.grp === 'main' || ['indie', 'action', 'actadv', 'rpg'].includes(c.id));
  if (TGA.card.mode === 'score' && tgaPhase() === 'result') {
    const a = tgaScore('me'); const hits = t.cats.filter((c) => c.win != null && me.picks[c.id] === c.win); const g = t.cats.find((c) => c.id === 'goty');
    return `TGA 2026 開獎！遊戲狂想曲的預測成績：${a.done} 項猜中 ${a.hit} 項，拿下 ${a.pts} 分 🏆\n\n押中的：${hits.slice(0, 8).map((c) => `${c.zh}（${nomName(c.nom[c.win])}）`).join('、') || '這次全軍覆沒 😂'}\n\n今年的年度最佳遊戲是《${g && g.win != null ? nomName(g.nom[g.win]) : '？'}》，你猜中了嗎？留言跟我們對答案 👇\n\n#TGA2026 #TheGameAwards #遊戲狂想曲`;
  }
  return `TGA 2026 頒獎前，遊戲狂想曲先押了！🏆\n\n${main.filter((c) => me.picks[c.id] != null).map((c) => `${c.zh}：${pick(c)}`).join('\n')}\n\n台灣時間 ${twWhen(t.show)} 開獎。你覺得今年的年度最佳遊戲是誰？留言押一個，開獎後一起對答案 👇\n\n#TGA2026 #TheGameAwards #遊戲狂想曲`;
}
async function tgaCardRender() {
  const cv = $('#cardcv'); if (!cv) return;
  const busy = $('#cardbusy'); if (busy) busy.style.display = 'grid';
  try { await drawTgaCard(cv, TGA.card); } catch (e) { console.warn(e); toast('圖卡畫不出來：' + e.message, 'warn'); }
  if (busy) busy.style.display = 'none';
}
async function tgaCardSave(share) {
  const b = await cardBlob(); if (!b) { toast('這張圖卡含有外部圖片，裝置不讓存。換「重噴一張」再試，或直接截圖。', 'warn'); return; }
  const name = `tga2026-${TGA.card.mode}-${TGA.card.ratio}.png`;
  if (share) { const f = new File([b], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return; } }
  const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  sfx.stamp(); impact($('#cardcv'), [YEL, PINK], false); toast('圖卡已下載');
}
async function drawTgaCard(cv, opt) {
  const t = S.tgaD; const me = S.tgaMe; const W = 1080, H = opt.ratio === '11' ? 1080 : 1350; cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); const R = rnd(opt.seed * 7919 + 2026); const sq = opt.ratio === '11'; const score = opt.mode === 'score' && tgaPhase() === 'result';
  const cats = t.cats; const goty = cats.find((x) => x.id === 'goty');
  const ORDER = ['direction', 'narrative', 'art', 'score', 'audio', 'performance', 'actadv', 'action', 'rpg', 'indie', 'sim', 'family', 'sports', 'multi', 'debut', 'impact', 'fighting', 'ongoing', 'community', 'anticipated', 'adapt', 'access', 'vr', 'mobile', 'ugc', 'esgame', 'esathlete', 'esteam', 'creator'];
  const rows = cats.filter((x) => x.id !== 'goty' && (score ? x.win != null && me.picks[x.id] != null : me.picks[x.id] != null))
    .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)).slice(0, sq ? 4 : 6);
  const pickOf = (x) => (score ? (x.win != null ? x.nom[x.win] : null) : me.picks[x.id] != null ? x.nom[me.picks[x.id]] : null);
  const allText = cats.map((x) => x.zh + nomName(pickOf(x)) + (pickOf(x) || {}).n).join('') + '遊戲狂想曲預測年度最佳遊戲猜中得分成績單押中沒中留言你押誰開獎';
  try { await Promise.race([Promise.all([document.fonts.load(`900 80px ${CFONT}`, allText), document.fonts.load('400 40px "Bebas Neue"', 'TGA 2026 GAME RHAPSODY 0123456789')]), sleep(4000)]); } catch (e) { /* 系統字 */ }
  // 舞台：黑底、金色聚光、星點
  c.fillStyle = '#0d0b08'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.5, -60, 40, W * 0.5, H * 0.25, W * 0.9); g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(0.45, 'rgba(255,170,40,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  halftone(c, W, H, 'rgba(255,214,90,.08)', 18, 2.6);
  for (let i = 0; i < 46; i++) { const x = R() * W, y = R() * H * 0.9, s = 2 + R() * 5; c.fillStyle = R() < 0.5 ? '#FFE600' : '#fff'; c.globalAlpha = 0.3 + R() * 0.6; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  [[W * 0.96, H * 0.06], [W * 0.97, H * 0.55], [W * 0.03, H * 0.33]].forEach(([x, y], i) => blobAt(c, x, y, 22 + R() * 26, i % 2 ? '#FFE600' : '#FF2E88', R));
  c.textBaseline = 'top'; c.textAlign = 'left';
  sticker(c, score ? '遊戲狂想曲・預測成績單' : '遊戲狂想曲先押了', 52, 46, '#FF2E88', '#fff', -0.03, sq ? 32 : 36);
  // TGA 2026 大字
  c.save(); c.translate(54, sq ? 128 : 140); c.rotate(-0.025); c.font = `400 ${sq ? 190 : 230}px "Bebas Neue",sans-serif`;
  for (let k = 4; k >= 1; k--) { c.fillStyle = k === 4 ? '#000' : '#FF2E88'; c.fillText('TGA 2026', k * 7, k * 7); }
  c.lineWidth = 12; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.strokeText('TGA 2026', 0, 0); const gg = c.createLinearGradient(0, 0, 0, 200); gg.addColorStop(0, '#fff6c2'); gg.addColorStop(0.5, '#FFD54A'); gg.addColorStop(1, '#e09b10'); c.fillStyle = gg; c.fillText('TGA 2026', 0, 0); c.restore();
  let y = sq ? 340 : 400;
  // 年度遊戲大框
  const gp = pickOf(goty); const ref = gp && gp.ref && wkRef(gp.ref); const im = ref ? await loadImgCors(heroOf(ref.it, liveOf(ref.it.steam))) : null;
  const bh = sq ? 230 : 300, bx = 52, bw = W - 104;
  c.save(); c.translate(W / 2, y + bh / 2); c.rotate(-0.012); c.translate(-W / 2, -(y + bh / 2));
  tornPath(c, bx - 12, y - 12, bw + 24, bh + 24, R, 9); c.fillStyle = '#FFE600'; c.fill();
  c.save(); c.beginPath(); c.rect(bx, y, bw, bh); c.clip();
  if (im) { coverDraw(c, im, bx, y, bw, bh); const sh = c.createLinearGradient(0, y, 0, y + bh); sh.addColorStop(0, 'rgba(0,0,0,.15)'); sh.addColorStop(1, 'rgba(0,0,0,.85)'); c.fillStyle = sh; c.fillRect(bx, y, bw, bh); }
  else { c.fillStyle = '#16120a'; c.fillRect(bx, y, bw, bh); halftone(c, W, H, 'rgba(255,214,90,.12)', 14, 2.2); }
  c.fillStyle = '#FFE600'; c.font = `900 ${sq ? 34 : 38}px ${CFONT}`; c.fillText(score ? '年度最佳遊戲得主' : '年度最佳遊戲，我們押', bx + 28, y + 26);
  const nm = gp ? nomName(gp) : '還沒押'; let fs = sq ? 74 : 92; c.font = `900 ${fs}px ${CFONT}`; while (c.measureText(nm).width > bw - 56 && fs > 44) { fs -= 4; c.font = `900 ${fs}px ${CFONT}`; }
  c.fillStyle = '#fff'; c.textBaseline = 'alphabetic'; c.fillText(nm, bx + 28, y + bh - 34); c.textBaseline = 'top';
  c.restore(); c.restore();
  tape(c, bx + 50, y - 6, 160, 44, -0.45); tape(c, bx + bw - 50, y - 4, 160, 44, 0.4);
  if (score && goty.win != null) { const ok = me.picks.goty === goty.win; sticker(c, ok ? '押中！' : '沒押中', W - 290, y + bh - 24, ok ? '#FF2E88' : '#fff', ok ? '#fff' : '#111', 0.08, 40); }
  y += bh + (sq ? 34 : 46);
  // 其他獎項
  const rh = Math.min(sq ? 78 : 92, (H - (sq ? 170 : 220) - y) / Math.max(1, rows.length));
  rows.forEach((x, i) => {
    const p = pickOf(x); const yy = y + i * rh; const hit = score && x.win != null && me.picks[x.id] === x.win;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(255,214,90,.1)'; c.fillRect(52, yy, W - 104, rh - 8);
    c.fillStyle = '#FFD54A'; c.font = `900 ${Math.round(rh * 0.3)}px ${CFONT}`; c.textBaseline = 'middle'; c.fillText(x.zh.replace('（新獎項）', ''), 72, yy + (rh - 8) / 2);
    const vx = 72 + Math.min(330, c.measureText('最佳動作冒險遊戲').width) + 24;
    let v = p ? nomName(p) : '—'; c.font = `900 ${Math.round(rh * 0.4)}px ${CFONT}`;
    while (c.measureText(v).width > W - 104 - (vx - 52) - (score ? 90 : 30) && v.length > 2) v = v.slice(0, -1);
    c.fillStyle = '#fff'; c.fillText(v === nomName(p) || !p ? v : v + '…', vx, yy + (rh - 8) / 2);
    if (score) { c.fillStyle = hit ? '#7dff9a' : '#ff6b6b'; c.font = `900 ${Math.round(rh * 0.5)}px ${CFONT}`; c.textAlign = 'right'; c.fillText(hit ? '✓' : '✗', W - 74, yy + (rh - 8) / 2); c.textAlign = 'left'; }
    c.textBaseline = 'top';
  });
  if (score) {
    const a = tgaScore('me');
    c.save(); c.translate(W - 210, sq ? 200 : 230); c.rotate(0.12); c.fillStyle = '#e3001b'; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.fill(); c.lineWidth = 7; c.strokeStyle = '#fff'; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '400 92px "Bebas Neue",sans-serif'; c.fillText(`${a.hit}/${a.done}`, 0, -12); c.font = `900 30px ${CFONT}`; c.fillText(`猜中・${a.pts} 分`, 0, 52); c.restore();
  }
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `900 ${sq ? 30 : 34}px ${CFONT}`;
  c.fillText(score ? '你猜中幾項？留言對答案！' : '你押誰？留言押一個，開獎一起對答案！', 52, H - (sq ? 70 : 92));
  brandSticker(c, W - 200, H - 82, -0.05);
}
