/* 解包 — 粉專作戰台・教學與影片三連發。
   教學：開站任務（一次性，從零開三個平台）、平台規則速查（data/platforms.json）、去哪裡看數據、YouTube 上片清單。
   影片三連發：上新片時前一天預告、當天上片文、隔天開討論，三個平台自動排進週曆。先給範本；按「請 Claude 寫」走點播台（type: vid），
   寫稿（05:23）或願望單（16:37）那一班寫好放 data/videos/<點播 id>.json（目錄 data/videos.json），App 對上自己送出的就換成 Claude 的版本。 */
const BIO = {
  name: '遊戲狂想曲',
  bio: '🎮 每天解包一款新遊戲\nPC／主機遊戲推坑・特價情報・新片預告\n好遊戲不錯過，雷遊戲不踩過\n▼ YouTube 完整影片',
  fbabout: '遊戲狂想曲 GAME RHAPSODY｜PC／主機遊戲推坑、新作解包、特價情報，每天一款。好遊戲不錯過，雷遊戲不踩過。完整影片在 YouTube「遊戲狂想曲」。',
};
const QUESTS = [
  { id: 'ig', t: '開 Instagram 帳號，切成創作者', why: 'Threads 要用 IG 帳號登入，IG 也是三個導流平台之一。', steps: [
    '下載 Instagram，用一個新的 email 註冊：粉專帳號跟你個人的帳號分開，以後才不會混在一起。',
    '名稱填「遊戲狂想曲」；帳號（@ 後面那串）挑一個好記的英文，最好跟 YouTube 頻道的拼法一樣，三個平台都用同一個。',
    '大頭貼用頻道的噴漆 Logo：三個平台、YouTube 都用同一張，觀眾一眼認得出是你。',
    '個人檔案 → 右上「☰」→「帳號類型和工具」→「切換為專業帳號」→ 選「創作者」，類別找「遊戲影片創作者」。專業帳號才有洞察報告（看成績）和排程。',
    '「編輯個人檔案」→ 簡介貼下面準備好的那段；「連結」放 YouTube 頻道網址（IG 個人檔案最多 5 個連結）。'], copy: ['name', 'bio'] },
  { id: 'th', t: '用 IG 帳號開 Threads', why: '台灣討論遊戲最熱的地方，是我們的主力。', steps: [
    '下載 Threads，選「用 Instagram 登入」，選剛剛開的遊戲狂想曲帳號。',
    '可以一鍵匯入 IG 的大頭貼、名稱和簡介。',
    '個人檔案設成「公開」，連結放 YouTube 頻道網址。',
    '先追蹤十幾個你常看的遊戲媒體、遊戲社群帳號，首頁才會推遊戲相關的串文給你，也方便去留言互動。'], copy: ['bio'] },
  { id: 'fb', t: '建 Facebook 粉專', why: '粉專要用你的個人帳號建立，但外人看不到管理員是誰。', steps: [
    '打開 Facebook → 右下「☰」選單 →「粉絲專頁」→「建立」（或「建立新粉絲專頁」）。',
    '名稱填「遊戲狂想曲」，類別打「遊戲影片創作者」。',
    '簡介貼下面準備好的那段，網站填 YouTube 頻道網址。',
    '大頭貼用同一張 Logo；封面可以用頻道的橫幅圖。',
    '建好以後，右上角大頭貼可以切換「你本人」和「遊戲狂想曲」：發文前一定確定是粉專身分。'], copy: ['fbabout'] },
  { id: 'link', t: '把 IG 連到 FB 粉專', why: '連起來之後，可以用 Meta Business Suite 一次把 FB 和 IG 排好。', steps: [
    'Facebook 切成粉專身分 →「設定」→「已連結的帳號」→ Instagram →「連結帳號」，登入遊戲狂想曲的 IG。',
    '找不到的話：IG 個人檔案 →「☰」→「帳號管理中心」→「帳號」→「新增帳號」，把 Facebook 加進來。',
    '下載「Meta Business Suite」App 登入，看得到粉專和 IG 兩個帳號就成功了。'] },
  { id: 'yt', t: 'YouTube 頻道放上三個社群連結', why: '在 YouTube 看到你的人，也找得到粉專。', steps: [
    '用電腦開 studio.youtube.com →「自訂」→「基本資訊」→「連結」→「新增連結」。',
    '依序加 Threads、Instagram、Facebook 粉專的網址，標題填平台名稱。',
    '按「發布」。頻道首頁的簡介下面就看得到這三個連結。'] },
  { id: 'cal', t: '把發文時段加進手機行事曆', why: '時間到手機會跳提醒，不用自己記。', steps: [
    '到「排程」先選發文節奏（起步、標準、衝刺）。',
    '按「時段加進手機行事曆」→ iPhone 會跳出「加入行事曆」→ 按「全部加入」。之後每週固定時段都會提醒。'], act: ['opics', '現在加進行事曆'] },
  { id: 'first', t: '發第一篇', why: '開站完成！之後每天照「今日任務」發就好。', steps: [
    '回「今日」，點第一個任務的「開始上架」，照上架教學一步一步做。',
    '發完回來按「發好了」蓋章；隔天回填這篇的成績。'], go: ['fan', '去今日任務'] },
];
const YT_CHECK = [
  ['標題', '前 20 個字放最吸引人的：遊戲名＋你的觀點（手機上只看得到前面）。'],
  ['縮圖', '大字 3～6 個＋遊戲畫面、高對比，縮成手機大小還看得懂。'],
  ['說明欄', '前兩行寫重點和「訂閱遊戲狂想曲」，下面放 Threads、IG、FB 的連結。'],
  ['章節', '說明欄打時間軸：第一行 00:00、至少 3 段、每段 10 秒以上，YouTube 會自動分章節。'],
  ['結束畫面', '最後 5～20 秒放「下一支影片」和「訂閱」。'],
  ['播放清單', '放進對應的系列，例如每月新遊戲推薦。'],
  ['公開時間', '排程公開或首播，跟預告文講的時間一樣。'],
  ['置頂留言', '自己留一個問題置頂帶動留言；回 App 把影片網址貼進三連發。'],
];
const questDone = () => QUESTS.filter((q) => S.ops.setup[q.id]).length;
function opsSetupBanner() {
  const n = questDone(); if (n >= QUESTS.length) return '';
  return `<div class="setup-ban" data-go="fan/~learn"><b>開站任務 ${n}／${QUESTS.length}</b><span>${esc((QUESTS.find((q) => !S.ops.setup[q.id]) || {}).t || '')}</span><i style="--p:${(n / QUESTS.length).toFixed(3)}"></i><em>繼續 ›</em></div>`;
}

/* ---- 教學頁 ---- */
function renderOpsLearn() {
  const P = plat(); const n = questDone(); const pr = S.ops.prof;
  const rule = (pf, t) => { const r = P[pf] || {}; return `<div class="rule"><div class="rule-h">${pf === 'yt' ? '<span class="pfb yt">YT</span>' : pfBadge(pf)}<b>${esc(t)}</b></div><ul>${(r.notes || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${(r.src || []).length ? `<details><summary>${r.src.length} 個來源</summary>${r.src.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('')}</details>` : ''}</div>`; };
  return `<div class="ops learn">${opsNav('learn')}${opsHead('教學', '從零開始：先把三個平台開好，之後每一篇的上架教學都在任務裡。')}
    <section class="q-top"><div class="q-ring" style="--p:${(n / QUESTS.length).toFixed(3)}"><b>${n}</b><span>／${QUESTS.length}</span></div><div><b>${n >= QUESTS.length ? '開站完成！' : '開站任務'}</b><p>${n >= QUESTS.length ? '三個平台都開好了：每天照「今日任務」發就好。' : '照順序做，每做完一個按「完成」蓋章。'}</p></div></section>
    <section class="prof"><h4>先填你的 YouTube 頻道網址</h4><p class="sub-note">簡介、連結會用到（只存在這台裝置）。</p>
      <label class="op-lab">YouTube 頻道<input type="url" data-act="opprof" data-k="yt" value="${esc(pr.yt)}" placeholder="https://www.youtube.com/@…"></label></section>
    <div class="quests">${QUESTS.map((q, i) => { const ok = !!S.ops.setup[q.id]; return `<details class="quest ${ok ? 'ok' : ''}" ${!ok && QUESTS.findIndex((x) => !S.ops.setup[x.id]) === i ? 'open' : ''}><summary><i>${ok ? '✓' : i + 1}</i><b>${esc(q.t)}</b>${ok ? '<em>完成</em>' : ''}</summary>
      <p class="q-why">${esc(q.why)}</p><ol>${q.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${(q.copy || []).map((k) => `<div class="cpx"><pre>${esc(BIO[k])}</pre><button class="btn sm y" data-act="opcopyx" data-k="${k}">${ICON.copy}<span>複製</span></button></div>`).join('')}
      ${q.id === 'ig' || q.id === 'th' || q.id === 'fb' ? (pr.yt ? `<div class="cpx"><pre>${esc(pr.yt)}</pre><button class="btn sm" data-act="opcopyx" data-k="yt">${ICON.copy}<span>複製頻道網址</span></button></div>` : '<p class="sub-note">上面填了頻道網址，這裡就能一鍵複製。</p>') : ''}
      <div class="btnrow">${q.act ? `<button class="btn sm" data-act="${q.act[0]}">${esc(q.act[1])}</button>` : ''}${q.go ? `<button class="btn sm" data-go="${q.go[0]}">${esc(q.go[1])}</button>` : ''}<button class="btn sm ${ok ? '' : 'p'}" data-act="opq" data-k="${q.id}">${ok ? '取消完成' : '完成！'}</button></div></details>`; }).join('')}</div>
    <h3 class="tape-h">平台規則速查 <small>查證於 ${esc(P.checked)}</small></h3>
    <div class="rules">${rule('th', 'Threads（脆）')}${rule('ig', 'Instagram')}${rule('fb', 'Facebook 粉專')}${rule('yt', 'YouTube 營利門檻')}</div>
    <p class="sub-note">平台規則會改：每週日的懶人包編輯會順手查一次，有變就更新這裡和上架教學。</p>
    <h3 class="tape-h">去哪裡看數據</h3>
    <div class="howto">${CK_F.map(([k, l, how]) => `<div><b>${esc(l)}</b><span>${esc(how)}</span></div>`).join('')}${OPS_PF.map((p) => `<div><b>${PFI[p].n} 每篇成績</b><span>${esc(STAT_HOW[p])}</span></div>`).join('')}</div>
    <h3 class="tape-h y">YouTube 上片清單 <small>每次上片照這張檢查</small></h3>
    <ol class="ytc">${YT_CHECK.map(([h, t]) => `<li><b>${esc(h)}</b><span>${esc(t)}</span></li>`).join('')}</ol>
    <div class="endcta"><button class="btn p" data-act="opvidnew">${ICON.film}<span>＋上片三連發</span></button><button class="btn" data-act="askq" data-q="粉專經營問題：" data-ref="" data-ctx="粉專經營">${ICON.radio}<span>粉專問題問 Claude</span></button></div></div>`;
}

/* ---- 影片三連發 ---- */
function vidClaudeReady(v) { return !!(v && v.ev && S.vidIdx && (S.vidIdx.items || []).some((x) => x.id === v.ev)); }
async function vidClaude(v) {
  if (!vidClaudeReady(v)) return null;
  S.vidF = S.vidF || {};
  if (!S.vidF[v.ev]) { try { S.vidF[v.ev] = await getJSON('videos/' + v.ev + '.json'); } catch (e) { return null; } }
  return S.vidF[v.ev];
}
function vidTpl(v, k) {
  const hm = v.at.slice(11, 16); const note = (v.note || '').trim(); const t = v.t;
  const games = (v.games || []).map((g) => '#' + String(g).replace(/[\s#：:・,，、]/g, '')).filter((g) => g.length > 1);
  const tags = [...games.slice(0, 2), '#遊戲', '#新片上線'].slice(0, 4).concat(BRAND_TAG);
  if (k === 'pre') return { post: `明天 ${hm}，遊戲狂想曲的新片要上了：《${t}》${note ? `\n\n這集會聊：${note}` : ''}\n\n先來押一下：你最想看哪一段？留言先押，明天影片裡對答案。`, threads: `明天 ${hm} 新片：《${t}》${note ? `\n\n${note}` : ''}\n\n先押：你最想看哪一段？`, tags };
  if (k === 'up') return { post: `新片上線：《${t}》${note ? `\n\n${note}` : ''}\n\n看完留言告訴我：你同意嗎？`, threads: `新片上線：《${t}》${note ? `\n\n${note}` : ''}\n\n看完回來告訴我你同不同意。`, tags };
  return { post: `昨天的新片《${t}》，留言區最多人在吵的是：＿＿＿（把你看到的寫在這裡）\n\n你站哪一邊？`, threads: `昨天那支《${t}》，留言區吵最兇的是：＿＿＿\n\n你站哪邊？`, tags };
}
function titleLines(t) {
  t = String(t || '').trim(); if (t.length <= 11) return t;
  let cut = -1; for (let i = Math.min(11, t.length - 1); i >= 4; i--) if (/[\s：:｜|、，,！!？?》」）)-]/.test(t[i])) { cut = i + 1; break; }
  if (cut < 0) cut = Math.min(11, Math.ceil(t.length / 2));
  const a = t.slice(0, cut).trim(); let b = t.slice(cut).trim(); if (b.length > 11) b = b.slice(0, 10) + '…';
  return a + '\n' + b;
}
function vidCardF(dr) {
  const v = dr.vid; const k = dr.vk; const yt = ytIdOf(v.url); const cd = dr.card || {};
  return {
    id: 'v-' + v.id + '-' + k, game: { zh: v.t, en: 'NEW VIDEO', steam: null }, verdict: { stamp: { pre: '明天', up: '新片', talk: '開聊' }[k], label: '' },
    media: { yt: yt ? [{ id: yt }] : [], images: [] },
    fanpage: { credit: '遊戲狂想曲 YouTube', card: { kicker: cd.kicker || { pre: `明天 ${v.at.slice(11, 16)} 上片`, up: '新片上線｜YouTube', talk: '昨天的新片｜開聊' }[k], title: cd.title || titleLines(v.t), sub: cd.sub || '遊戲狂想曲 YouTube', tags: cd.tags || [], points: cd.points || [], image: yt ? ytThumb(yt) : '' } },
  };
}
async function renderOpsVid(id) {
  const v = vidOf(id); if (!v) return `<div class="ops">${opsNav('plan')}<div class="empty">找不到這支影片（可能刪掉了）。<br><button class="btn y" data-go="fan/~plan" style="margin-top:12px">回排程</button></div></div>`;
  const cl = await vidClaude(v); const yt = ytIdOf(v.url); const qa = v.ev ? qaOf(v.ev) : null;
  const st = cl ? ['ok', 'Claude 寫好了：三篇都換成 Claude 的版本'] : v.ev ? ['wait', `已請 Claude 寫・${qa && qa.st === 'no' ? '這次沒接：' + (qa.a || '') : '下一班 ' + nextShift('vid').at + ' ' + nextShift('vid').name}`] : ['tpl', '現在是範本：可以直接用，或請 Claude 照這集內容寫'];
  const up = v.at.slice(0, 10); const chk = S.ops.vchk[v.id] || {};
  const sec = async (k) => {
    const ref = `v:${v.id}:${k}`; const d = addD(up, VK[k].off); const at = VK[k].at || v.at.slice(11, 16); const pub = pubOf(ref);
    const dr = await opsDraft(ref);
    return `<section class="vk"><div class="vk-h"><span class="vk-n">${VK[k].n}</span><b>${esc(dayLab(d))} ${esc(at)}</b></div>
      <div class="vk-pf">${VK[k].pfs.map((p) => `<button class="sibb ${pub[p] ? 'ok' : ''}" data-act="opgoto" data-ref="${esc(ref)}" data-pf="${p}">${pfBadge(p)}<span>${pub[p] ? '已發' : '上架'}</span></button>`).join('')}</div>
      <details class="vk-t"><summary>看文案</summary><div class="pftxt">${nl2br(pfCompose(dr, 'th').text)}</div><div class="pftxt">${nl2br(pfCompose(dr, 'fb').text)}</div></details></section>`;
  };
  const secs = (await Promise.all(Object.keys(VK).map(sec))).join('');
  return `<div class="ops vid">${opsNav('plan')}
    <div class="btnrow" style="margin-top:12px"><button class="btn sm k" data-go="fan/~plan">← 排程</button></div>
    <section class="v-hero"><div class="vh-i" ${yt ? `style="background-image:url('${esc(ytThumb(yt))}')"` : ''}>${yt ? '' : `<span>${ICON.film}</span>`}<em>影片三連發</em></div>
      <h2>${esc(v.t)}</h2><p>上片 ${esc(dayLab(up))} ${esc(v.at.slice(11, 16))}${v.note ? `<br><small>${esc(v.note)}</small>` : ''}</p>
      <div class="v-st ${st[0]}">${esc(st[1])}</div>
      <label class="op-lab">YouTube 影片網址<input type="url" data-act="opvurl" data-id="${esc(v.id)}" value="${esc(v.url || '')}" placeholder="上片後貼上：https://youtu.be/…"></label>
      <div class="btnrow">${!v.ev ? `<button class="btn p" data-act="opvidreq" data-id="${esc(v.id)}">${ICON.radio}<span>請 Claude 寫這三篇</span></button>` : ''}<button class="btn sm" data-act="opvidedit" data-id="${esc(v.id)}">改標題／時間</button><button class="btn sm" data-act="opviddel" data-id="${esc(v.id)}">刪除</button></div></section>
    ${secs}
    <h3 class="tape-h y">上片清單 <small>${Object.keys(chk).length}／${YT_CHECK.length}</small></h3>
    <div class="ytc chk">${YT_CHECK.map(([h, t], i) => `<button class="${chk[i] ? 'ok' : ''}" data-act="opvck" data-id="${esc(v.id)}" data-i="${i}"><i>${chk[i] ? '✓' : i + 1}</i><b>${esc(h)}</b><span>${esc(t)}</span></button>`).join('')}</div>
    ${cl && cl.yt ? `<h3 class="tape-h">Claude 準備的 YouTube 文字</h3>${cl.yt.desc ? `<div class="cpx"><pre>${esc(cl.yt.desc)}</pre><button class="btn sm y" data-act="opcopyx" data-k="ytdesc" data-id="${esc(v.id)}">${ICON.copy}<span>複製說明欄</span></button></div>` : ''}${cl.yt.pin ? `<div class="cpx"><pre>${esc(cl.yt.pin)}</pre><button class="btn sm y" data-act="opcopyx" data-k="ytpin" data-id="${esc(v.id)}">${ICON.copy}<span>複製置頂留言</span></button></div>` : ''}` : ''}</div>`;
}
function opsVidFx() { if (fxOn()) $$('.vk').forEach((s, i) => { s.style.setProperty('--i', i); s.classList.add('drop'); }); }
function vidSheet(v) {
  const d = v ? v.at.slice(0, 10) : addD(todayTW(), 2); const t = v ? v.at.slice(11, 16) : '20:00';
  openSheet(`<h3>${ICON.film} ${v ? '改影片資料' : '上片三連發'}</h3><p class="sub-note">${v ? '' : '填好之後，前一天預告、當天上片、隔天討論會自動排進三個平台的週曆。'}</p>
    <label class="op-lab">影片標題<input type="text" id="vt" maxlength="120" value="${esc(v ? v.t : '')}" placeholder="例如：11 月必玩新遊戲 TOP 10"></label>
    <div class="op-2"><label class="op-lab">上片日期<input type="date" id="vd" value="${esc(d)}" min="${esc(todayTW())}"></label><label class="op-lab">上片時間<input type="time" id="vh" value="${esc(t)}"></label></div>
    <label class="op-lab">這集在講什麼？（選填）<textarea id="vn" maxlength="400" placeholder="講了哪幾款遊戲、你的結論、想讓觀眾吵什麼">${esc(v ? v.note || '' : '')}</textarea></label>
    <label class="op-lab">提到的遊戲（選填，用頓號分開）<input type="text" id="vg" maxlength="200" value="${esc(v ? (v.games || []).join('、') : '')}" placeholder="例如：GTA VI、Balatro"></label>
    <label class="op-lab">YouTube 網址（選填，上片後再補也行）<input type="url" id="vu" value="${esc(v ? v.url || '' : '')}" placeholder="https://youtu.be/…"></label>
    ${v ? '' : '<label class="op-chk"><input type="checkbox" id="vreq" checked> 請 Claude 照這集內容寫三篇（走點播台，下一班會寫；內容會存在公開的 GitHub 上）</label>'}
    <div class="btnrow"><button class="btn p" data-act="opvidsave" data-id="${esc(v ? v.id : '')}">${v ? '存好' : '排進週曆'}</button></div>`, 'hsheet');
}
function vidEmit(v) {
  const ev = askEmit('vid', Object.assign({ title: v.t.slice(0, 120), when: v.at + ':00+08:00' }, v.note ? { note: v.note.slice(0, 400) } : {}, (v.games || []).length ? { games: v.games.slice(0, 6) } : {}, ytIdOf(v.url) ? { url: v.url.slice(0, 200) } : {}));
  v.ev = ev.id; opsSave();
}

/* ---- 點擊與輸入 ---- */
async function opsLearnAct(a, act) {
  if (a === 'opq') { const k = act.dataset.k; if (S.ops.setup[k]) delete S.ops.setup[k]; else { S.ops.setup[k] = todayTW(); sfx.stamp(); impact(act, [RED, YEL, BLK], questDone() >= QUESTS.length); if (questDone() >= QUESTS.length) setTimeout(() => { sfx.fanfare(); toast('開站完成！之後照今日任務發就好'); }, 300); } opsSave(); const y = scrollY; await route(); scrollTo(0, y); return true; }
  if (a === 'opcopyx') {
    const k = act.dataset.k; let text = BIO[k] || (k === 'yt' ? S.ops.prof.yt : '');
    if (k === 'ytdesc' || k === 'ytpin') { const cl = await vidClaude(vidOf(act.dataset.id)); text = cl && cl.yt ? (k === 'ytdesc' ? cl.yt.desc : cl.yt.pin) : ''; }
    if (text && await copyText(text)) { sfx.stamp(); burstAt(act, [YEL, PINK], 12, 7); toast('已複製'); } else toast('沒有東西可以複製', 'warn');
    return true;
  }
  if (a === 'opvidnew') { vidSheet(null); return true; }
  if (a === 'opvidedit') { vidSheet(vidOf(act.dataset.id)); return true; }
  if (a === 'opvidsave') {
    const t = ($('#vt').value || '').trim(); const d = $('#vd').value; const h = $('#vh').value || '20:00';
    if (t.length < 2) { toast('先寫影片標題', 'warn'); return true; }
    if (!/^\d{4}-\d\d-\d\d$/.test(d || '')) { toast('選上片日期', 'warn'); return true; }
    const games = ($('#vg').value || '').split(/[、,，\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
    const o = { t: t.slice(0, 120), at: d + 'T' + h, note: ($('#vn').value || '').trim().slice(0, 400), games, url: ($('#vu').value || '').trim().slice(0, 200) };
    let v = vidOf(act.dataset.id);
    if (v) Object.assign(v, o); else { v = Object.assign({ id: rid(), made: new Date().toISOString(), ev: null }, o); S.ops.vids.push(v); if ($('#vreq') && $('#vreq').checked) vidEmit(v); }
    opsSave(); closeSheet(); sfx.slap(); burst(innerWidth / 2, innerHeight / 3, [PINK, YEL, BLK], 30, 12);
    toast(v.ev && !act.dataset.id ? `排好了，也請 Claude 寫了（下一班 ${nextShift('vid').at}）` : '排好了');
    if (ROUTE === 'fan/~vid:' + v.id) route(); else location.hash = 'fan/~vid:' + v.id;
    return true;
  }
  if (a === 'opvidreq') { const v = vidOf(act.dataset.id); if (v) { vidEmit(v); sfx.radio(); burstAt(act, [PINK, YEL, BLK], 20, 10); toast(`送出了！下一班 ${nextShift('vid').at} ${nextShift('vid').name}會寫`); route(); } return true; }
  if (a === 'opviddel') {
    if (!act.dataset.sure) { act.dataset.sure = 1; act.textContent = '再按一次刪除'; return true; }
    S.ops.vids = S.ops.vids.filter((v) => v.id !== act.dataset.id); delete S.ops.vchk[act.dataset.id]; opsSave(); sfx.scratch(); toast('刪掉了'); location.hash = 'fan/~plan'; return true;
  }
  if (a === 'opvck') { const c = S.ops.vchk[act.dataset.id] = S.ops.vchk[act.dataset.id] || {}; const i = act.dataset.i; if (c[i]) delete c[i]; else { c[i] = 1; sfx.pop(); } opsSave(); act.classList.toggle('ok', !!c[i]); $('i', act).textContent = c[i] ? '✓' : +i + 1; const h = act.closest('.ops').querySelector('.tape-h.y small'); if (h) h.textContent = `${Object.keys(c).length}／${YT_CHECK.length}`; return true; }
  return false;
}
function opsLearnInput(t) {
  const a = t.dataset.act;
  if (a === 'opprof') { S.ops.prof[t.dataset.k] = t.value.trim().slice(0, 200); opsSave(); return true; }
  if (a === 'opvurl') { const v = vidOf(t.dataset.id); if (v) { v.url = t.value.trim().slice(0, 200); opsSave(); } return true; }
  return false;
}
