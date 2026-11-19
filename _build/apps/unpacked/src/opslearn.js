/* 解包 — 粉專作戰台・教學與影片三連發。
   教學：開站任務分三個階段（2026-11-19 起 Threads 優先：先把 Threads 做起來，IG、FB 之後再開）、Threads 經營心法、前 30 天路線圖、
   平台規則速查（data/platforms.json）、去哪裡看數據、YouTube 上片清單。
   影片三連發：上新片時前一天預告、當天上片文、隔天開討論，自動排進週曆。先給範本；按「請 Claude 寫」走點播台（type: vid），
   寫稿（05:23）或願望單（16:37）那一班寫好放 data/videos/<點播 id>.json（目錄 data/videos.json），App 對上自己送出的就換成 Claude 的版本。 */
const BIO = {
  name: '遊戲狂想曲',
  bio: '🎮 每天解包一款 PC／主機遊戲\n新作值不值得買・私房神作推坑・限免特價情報\n好遊戲不錯過，雷遊戲不踩過\n▼ YouTube「遊戲狂想曲」完整影片',
  fbabout: '遊戲狂想曲 GAME RHAPSODY｜PC／主機遊戲推坑、新作解包、特價情報，每天一款。好遊戲不錯過，雷遊戲不踩過。完整影片在 YouTube「遊戲狂想曲」。',
};
/* 帳號代號（@ 後面那串）：IG、Threads 只能用英文小寫、數字、底線、句點，最多 30 字；YouTube 的 Gaming-Rhapsody 有連字號，要換寫法 */
const HANDLES = ['gaming.rhapsody', 'gaming_rhapsody', 'gamingrhapsody.tw'];
/* 自我介紹（置頂用）：三個口味，都不放網址、不出現本人名字 */
const INTROS = [
  { k: 'intro1', t: '直白版', text: '大家好，這裡是「遊戲狂想曲」🎮\n\n只聊 PC 和主機遊戲。每天在這裡解包一款：\n・新作值不值得買：價格、中文、評價、要玩多久，一次講清楚\n・已上市的私房神作：好玩但你可能錯過的\n・限時免費和特價情報：領了就是你的\n\n不碰抽卡手遊、不下農場標題。好遊戲不錯過，雷遊戲不踩過。\n\n先來認識一下：你最近在玩哪一款？留言丟一款，我們聊聊。' },
  { k: 'intro2', t: '互動版', text: '新帳號報到！這裡是「遊戲狂想曲」，專門幫你篩遊戲。\n\n規則很簡單：\n・每天解包一款 PC／主機遊戲，買之前先看\n・好玩的直接推，會雷的直接講\n・限免、特價一出來就貼\n\n開站第一題：如果硬碟只能留一款遊戲，你留哪一款？' },
  { k: 'intro3', t: '短版', text: '這裡是「遊戲狂想曲」：每天一款 PC／主機遊戲，值不值得買、哪裡好玩、哪裡會雷，直接講。\n\n完整影片在 YouTube 搜尋「遊戲狂想曲」。\n\n你最近卡在哪一款？' },
];
for (const x of INTROS) BIO[x.k] = x.text;
const PHASES = [
  { ph: 1, mode: 'th', t: '第一階段・Threads 開站', s: '主力平台：台灣聊遊戲最熱的地方。照順序做完大約 30 分鐘。' },
  { ph: 2, mode: 'thig', t: '第二階段・加開 Instagram', s: '建議 Threads 連發滿 14 天、或粉絲滿 100 再開：同一篇 App 會幫你做好 IG 圖文版。' },
  { ph: 3, mode: 'all', t: '第三階段・加開 Facebook 粉專', s: 'IG 也穩定之後再開。FB 有每月連結額度這類眉角，App 會幫你算。' },
];
const PH_OF = { th: 1, thig: 2, all: 3 };
const QUESTS = [
  { id: 'name', ph: 1, t: '想好帳號代號', why: '代號（@ 後面那串英文）就是你的門牌：Threads 跟 IG 共用同一個，之後改了別人會找不到你，一開始就選好。', steps: [
    '名稱（大字那一行）一律用「遊戲狂想曲」，不放你本人的名字。',
    '代號只能用英文小寫、數字、底線「_」和句點「.」，不能有連字號：YouTube 的 Gaming-Rhapsody 要換個寫法。下面有三個建議，先想好 2～3 個備案，註冊時被用走了就換下一個。',
    '準備一個新的 email（例如開一個新的 Gmail）專門給遊戲狂想曲用：粉專跟你個人的帳號完全分開，以後交接、找回密碼都乾淨。',
    'Threads、IG、之後的 FB 粉專、YouTube 都用同一個名稱和同一張大頭貼（頻道的噴漆 Logo），觀眾在哪裡看到都認得出是你。'], handles: true, copy: ['name'] },
  { id: 'ig0', ph: 1, t: '開 Instagram 帳號（Threads 的鑰匙）', why: 'Threads 要用 IG 帳號登入。現在只是拿它開門，IG 本身等第二階段再經營。大約 5 分鐘。', steps: [
    '下載 Instagram，打開後點「建立新帳號」。',
    '選用電子郵件註冊，填剛剛準備的新 email，輸入寄來的驗證碼。',
    '設定密碼（記進手機的密碼管理）。生日填你本人的：不會公開，平台只用來確認年齡。',
    '名字填「遊戲狂想曲」，用戶名稱填你選好的代號；被用走就換備案。',
    '接下來問你要不要找聯絡人、加入 Facebook 帳號管理中心、追蹤推薦的人：一律先「略過」或「稍後」，粉專跟你的個人帳號分開比較乾淨。',
    '大頭貼先換成頻道的噴漆 Logo（等一下 Threads 可以一鍵匯入）。',
    '補充：Threads 現在也能直接用 email 註冊，但用 IG 登入的話，第二階段就不用再開一次，兩邊代號也會一樣。'], copy: ['name'] },
  { id: 'th', ph: 1, t: '用 IG 帳號登入 Threads', why: '台灣聊遊戲最熱的地方，這是遊戲狂想曲的主力平台。', steps: [
    '下載 Threads（黑底白色「@」的圖示），打開後選「使用 Instagram 繼續」，選剛剛開的遊戲狂想曲帳號。',
    '建立個人檔案時點「從 Instagram 匯入」：名字、大頭貼、簡介一次帶過來。',
    '隱私一定選「公開個人檔案」：私人帳號的串文陌生人看不到，等於白發。',
    '問你要不要追蹤 IG 上追蹤的人：新帳號本來就沒有，直接下一步。',
    '按「加入 Threads」，完成！之後就用 Threads 這個 App 發文、回留言。'] },
  { id: 'thprof', ph: 1, t: '把個人檔案整理成「門面」', why: '有人看到你的串文點進頭像，三秒內就決定要不要追蹤：大頭貼、簡介、連結、置頂文就是你的招牌。', steps: [
    '點右下角的人像圖示到自己的個人檔案 →「編輯個人檔案」。',
    '簡介貼下面準備好的那段（上限 150 字，這段大約 75 字）。',
    '「連結」→「新增連結」貼 YouTube 頻道網址（最多 5 個，之後開了 IG、FB 再補上）。',
    '編輯畫面如果有「興趣」或「主題」可以掛在個人檔案上，選遊戲、PC 遊戲、Steam 這類，別人一看就知道你聊什麼。',
    '大頭貼確認是頻道的噴漆 Logo，跟 YouTube 一模一樣。'], copy: ['bio'], yt: true },
  { id: 'thfeed', ph: 1, t: '把首頁養成「遊戲版」', why: '首頁推什麼，你海巡就看到什麼。先讓 Threads 知道這個帳號只想看遊戲。', steps: [
    '點下面的放大鏡（搜尋），打「遊戲」或你常玩的遊戲名稱。',
    '主題標籤旁邊有「⋯」的是社群：點進去按右上角「加入」。遊戲相關的挑 1～3 個就好；加入的社群會掛在你的個人檔案上，別人一看就知道你是聊遊戲的。',
    '追蹤 15～20 個帳號：遊戲公司和台灣代理的官方帳號、遊戲媒體、你喜歡的實況主或遊戲創作者。',
    '滑首頁看到跟遊戲無關的串文，點右上「⋯」→「不感興趣」；幾天後首頁就會變成遊戲版。'] },
  { id: 'thintro', ph: 1, t: '發自我介紹，然後置頂', why: '新來的人點進個人檔案，第一眼看到的是置頂文：告訴他你是誰、追蹤你有什麼好處。', steps: [
    '下面三個版本挑一個（照你的口氣改幾個字更好），按「帶到 Threads」或「複製」。',
    '主題標籤選「遊戲」（有遊戲社群的話選社群），按「發佈」。',
    '發完到自己的個人檔案，在這則串文右上點「⋯」→「置頂到個人檔案」。',
    '有人來留言一定回：這是你的第一批朋友。'], intro: true },
  { id: 'cal', ph: 1, t: '把發文時段加進手機行事曆', why: '時間到手機會跳提醒，不用自己記。', steps: [
    '到「排程」先選發文節奏（起步一週 4 篇，或標準每天一篇）。',
    '按「時段加進手機行事曆」→ iPhone 會跳出「加入行事曆」→ 按「全部加入」。之後每週固定時段都會提醒，發文前 5 分鐘響。'], act: ['opics', '現在加進行事曆'] },
  { id: 'first', ph: 1, t: '發第一篇正式貼文', why: '開站完成！之後每天就是三件事：發一篇、回完留言、海巡十分鐘。', steps: [
    '回「今日」，點今天那一篇的「開始上架」，照上架教學一步一步做。',
    '發完回來按「Threads 發好了」蓋章；隔天回填這篇的成績。',
    '當天記得把「每日三件事」都打勾：回留言和海巡跟發文一樣重要。'], go: ['fan', '去今日任務'] },
  { id: 'yt', ph: 1, opt: true, t: 'YouTube 頻道放上 Threads 連結', why: '在 YouTube 看到你的人，也找得到你的 Threads。', steps: [
    '用電腦開 studio.youtube.com →「自訂」→「基本資訊」→「連結」→「新增連結」。',
    '標題填「Threads」，網址填你的 Threads 個人檔案網址（之後開了 IG、FB 再補）。',
    '按「發布」。頻道首頁的簡介下面就看得到這個連結。'] },
  { id: 'igpro', ph: 2, t: '把 IG 切成創作者帳號、整理個人檔案', why: '專業帳號才有洞察報告（看成績）和排程。', steps: [
    '打開 Instagram → 個人檔案 → 右上「☰」→「帳號類型和工具」→「切換為專業帳號」→ 選「創作者」，類別找「遊戲影片創作者」。',
    '「編輯個人檔案」→ 簡介貼下面那段；「連結」放 YouTube 頻道網址（IG 個人檔案最多 5 個連結，可以把 Threads 也放上去）。',
    '確認帳號是公開的，大頭貼跟 Threads 一樣。'], copy: ['bio'], yt: true },
  { id: 'igfirst', ph: 2, t: '發第一篇 IG 圖文', why: '同一篇內容，App 已經做好 IG 版：4:5 圖卡、說明文字、最多 5 個 hashtag。', steps: [
    '回「今日」，IG 的任務會跟 Threads 排在同一天，照上架教學發。',
    'IG 說明文字裡的網址不能點，App 會寫成「連結在個人檔案」。'], go: ['fan', '去今日任務'] },
  { id: 'fb', ph: 3, t: '建 Facebook 粉專', why: '粉專要用你的個人帳號建立，但外人看不到管理員是誰。', steps: [
    '打開 Facebook → 右下「☰」選單 →「粉絲專頁」→「建立」（或「建立新粉絲專頁」）。',
    '名稱填「遊戲狂想曲」，類別打「遊戲影片創作者」。',
    '簡介貼下面準備好的那段，網站填 YouTube 頻道網址。',
    '大頭貼用同一張 Logo；封面可以用頻道的橫幅圖。',
    '建好以後，右上角大頭貼可以切換「你本人」和「遊戲狂想曲」：發文前一定確定是粉專身分。'], copy: ['fbabout'], yt: true },
  { id: 'link', ph: 3, t: '把 IG 連到 FB 粉專', why: '連起來之後，可以用 Meta Business Suite 一次把 FB 和 IG 排好。', steps: [
    'Facebook 切成粉專身分 →「設定」→「已連結的帳號」→ Instagram →「連結帳號」，登入遊戲狂想曲的 IG。',
    '找不到的話：IG 個人檔案 →「☰」→「帳號管理中心」→「帳號」→「新增帳號」，把 Facebook 加進來。',
    '下載「Meta Business Suite」App 登入，看得到粉專和 IG 兩個帳號就成功了。'] },
  { id: 'fbfirst', ph: 3, t: '發第一篇 FB 粉專貼文', why: 'FB 版放完整的 hashtag；部分粉專每月只有少數幾則能帶外部連結，App 會幫你留給上片文。', steps: [
    '回「今日」，FB 的任務會排在固定的日子，照上架教學發。',
    '到「成效」設定你的粉專有沒有連結限制（不確定就選「不知道」）。'], go: ['fan', '去今日任務'] },
];
/* 舊版的開站任務（三平台一起開）換成新的代號：做過的不用重做 */
(function questMigrate() {
  const st = S.ops.setup || {}; let ch = false;
  if (st.ig && !st.ig0) { st.ig0 = st.igpro = st.ig; ch = true; }
  if (st.th && !st.thprof && st.ig) { st.thprof = st.th; ch = true; }
  if (ch) opsSave();
})();
const YT_CHECK = [
  ['標題', '前 20 個字放最吸引人的：遊戲名＋你的觀點（手機上只看得到前面）。'],
  ['縮圖', '大字 3～6 個＋遊戲畫面、高對比，縮成手機大小還看得懂。'],
  ['說明欄', '前兩行寫重點和「訂閱遊戲狂想曲」，下面放 Threads（之後還有 IG、FB）的連結。'],
  ['章節', '說明欄打時間軸：第一行 00:00、至少 3 段、每段 10 秒以上，YouTube 會自動分章節。'],
  ['結束畫面', '最後 5～20 秒放「下一支影片」和「訂閱」。'],
  ['播放清單', '放進對應的系列，例如每月新遊戲推薦。'],
  ['公開時間', '排程公開或首播，跟預告文講的時間一樣。'],
  ['置頂留言', '自己留一個問題置頂帶動留言；回 App 把影片網址貼進三連發。'],
];
/* Threads 經營心法：新帳號最常卡的地方，有出處的附來源 */
const PLAYBOOK = [
  { h: '第一行就要讓人停下來', t: '大家滑動態只看一兩行就決定停不停。把最有感的那件事放第一行：價格、評價、限免，或一句有立場的話；不要寒暄、不要「大家好」。' },
  { h: '一篇只講一款，結尾丟一個好回答的問題', t: '二選一最好回答（「現在買，還是等特價？」）。留言越多，Threads 越會把這篇推給還沒追蹤你的人。' },
  { h: '發完一小時內，每一則留言都回', t: '新帳號最該花力氣的是回覆，不是多發幾篇：串文底下你來我往的對話，會讓這篇被推得更遠。', src: [{ t: 'Sendible：Threads 演算法怎麼運作（2026，含創作者觀察）', u: 'https://www.sendible.com/insights/threads-algorithm' }] },
  { h: '每天海巡 10 分鐘', t: '到別人的遊戲串文底下留有內容的留言（補一個資訊、講一個觀點），比自己多發十篇更容易被看見。不要只留「推」「歡迎追蹤我」，也不要一口氣洗十幾則。' },
  { h: '只聊遊戲，不蹭別的熱門話題', t: 'Threads 會先看貼文在第一批人身上的反應，再決定推不推更遠；為了流量蹭政治、八卦招來的追蹤者對遊戲沒興趣，之後反而拖累你的遊戲文。', src: [{ t: '經理人：品牌經營 Threads 得先做好這 3 件事（2026-10）', u: 'https://www.managertoday.com.tw/articles/view/72899' }] },
  { h: '主題標籤只能選一個：選遊戲社群', t: '每篇只能 1 個主題標籤。標籤旁邊有「⋯」的是社群，加入之後發文選它，貼文會出現在社群裡，被一群本來就愛聊遊戲的人看到。', src: [{ t: 'Meta：Threads 社群（Communities）介紹', u: 'https://about.fb.com/news/2025/10/introducing-threads-communities-find-your-people' }, { t: 'Social Media Today：Threads 社群開放給所有人', u: 'https://www.socialmediatoday.com/news/threads-rolls-out-communities-all-users/801861/' }] },
  { h: '挑對時間發', t: '台灣 Threads 的互動高峰在週間晚上 8～10 點、週四最熱；週一最冷但中午 12 點還行，週末偏冷。排程表已經照這個排好。', src: [{ t: '數位時代／QSearch：台灣 Threads 什麼時段發文最熱鬧', u: 'https://www.bnext.com.tw/article/90152/threads-posting-timing-2026' }] },
  { h: '連結放最後，重點先講完', t: 'Meta 說 2025 年中起帶連結的串文會正常排序、不會被故意壓；但本來就很少人會點出去，所以重點寫在文字裡，連結當補充（上片文才放）。', src: [{ t: 'Social Media Today：Meta 表示 Threads 的連結貼文已正常排序', u: 'https://www.socialmediatoday.com/news/meta-says-link-posts-ranked-properly-threads-reach/750126/' }] },
  { h: '寫錯了，15 分鐘內能改', t: '發出去 15 分鐘內，點串文右上「⋯」→「編輯」可以改字；超過就只能刪掉重發。發完先自己看一遍。', src: [{ t: 'Instagram 官方：Threads 使用技巧（15 分鐘內可編輯）', u: 'https://about.instagram.com/blog/tips-and-tricks/instagram-threads-tips/' }] },
  { h: '穩定比爆紅重要', t: '每天一篇、天天回覆，比一週爆一篇然後消失有用。前兩週只求「每天都有發」，成績之後再看。' },
  { h: '不買粉、不互刷', t: '買來的粉絲不會看你的影片，互刷讚的帳號也不會；平台還可能把這種行為當成不實互動處理。慢慢來，來的都是真的觀眾。' },
  { h: '洞察報告滿 100 粉絲才完整', t: '個人檔案右上的「洞察報告」看得到瀏覽、互動、粉絲變化；粉絲輪廓這類數據要滿 100 位粉絲才會出現。在那之前先看每篇的瀏覽數和留言數。', src: [{ t: 'Sendible：Threads 洞察報告看得到哪些數據（2026）', u: 'https://www.sendible.com/insights/threads-insights' }] },
];
const ROAD30 = [
  ['第 1 天', '開站：做完第一階段，發自我介紹並置頂。'],
  ['第 1～7 天', '每天一篇、回完每一則留言、海巡十分鐘。不看數字，只求「每日三件事」天天打勾。'],
  ['第 8～14 天', '週日第一次回填成績：看專題、推坑、限免、週報哪一類留言最多，下週多發那一類。'],
  ['第 15～30 天', '開始用影片三連發：每支新片前一天預告、當天上片、隔天討論，把 Threads 的人帶去 YouTube。'],
  ['第 30 天', '連發 14 天以上或粉絲滿 100：開第二階段 Instagram，同一篇一鍵做成圖文版。'],
];
const curPhase = () => PH_OF[S.ops.mode] || 3;
const questsActive = () => QUESTS.filter((q) => q.ph <= curPhase());
const questsNeed = () => questsActive().filter((q) => !q.opt);   // 選做的不算在進度裡
const questDone = (L = questsNeed()) => L.filter((q) => S.ops.setup[q.id]).length;
function opsSetupBanner() {
  const L = questsNeed(); const n = questDone(L); if (n >= L.length) return '';
  const ph = PHASES[curPhase() - 1]; const next = L.find((q) => !S.ops.setup[q.id]) || {};
  return `<div class="setup-ban" data-go="fan/~learn"><b>${next.ph === 1 ? '開站任務' : esc(ph.t)} ${n}／${L.length}</b><span>下一步：${esc(next.t || '')}</span><i style="--p:${(n / L.length).toFixed(3)}"></i><em>繼續 ›</em></div>`;
}

/* ---- 教學頁 ---- */
function questHtml(q, i, firstOpen) {
  const ok = !!S.ops.setup[q.id]; const pr = S.ops.prof;
  return `<details class="quest ${ok ? 'ok' : ''} ${q.opt ? 'q-opt' : ''}" ${firstOpen ? 'open' : ''}><summary><i>${ok ? '✓' : i + 1}</i><b>${esc(q.t)}</b>${ok ? '<em>完成</em>' : q.opt ? '<em class="o">選做</em>' : ''}</summary>
      <p class="q-why">${esc(q.why)}</p><ol>${q.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${q.handles ? `<div class="q-handles"><b>代號建議（點一下複製）</b>${HANDLES.map((h) => `<button class="hchip" data-act="opcopyx" data-t="${esc(h)}">@${esc(h)}</button>`).join('')}</div>` : ''}
      ${(q.copy || []).map((k) => `<div class="cpx"><pre>${esc(BIO[k])}</pre><button class="btn sm y" data-act="opcopyx" data-k="${k}">${ICON.copy}<span>複製</span></button></div>`).join('')}
      ${q.yt ? (pr.yt ? `<div class="cpx"><pre>${esc(pr.yt)}</pre><button class="btn sm" data-act="opcopyx" data-k="yt">${ICON.copy}<span>複製頻道網址</span></button></div>` : '<p class="sub-note q-note">在這頁最上面填了 YouTube 頻道網址，這裡就能一鍵複製。</p>') : ''}
      ${q.intro ? `<div class="intros">${INTROS.map((x) => `<div class="intro"><div class="intro-h"><b>${esc(x.t)}</b><span>${x.text.length} 字</span></div><div class="pftxt">${nl2br(x.text)}</div><div class="btnrow"><a class="btn sm y thgo" href="${esc(thIntent(x.text, '遊戲'))}" target="_blank" rel="noopener">${ICON.mega}<span>帶到 Threads</span></a><button class="btn sm" data-act="opcopyx" data-k="${x.k}">${ICON.copy}<span>複製</span></button></div></div>`).join('')}</div>` : ''}
      <div class="btnrow">${q.act ? `<button class="btn sm" data-act="${q.act[0]}">${esc(q.act[1])}</button>` : ''}${q.go ? `<button class="btn sm" data-go="${q.go[0]}">${esc(q.go[1])}</button>` : ''}<button class="btn sm ${ok ? '' : 'p'}" data-act="opq" data-k="${q.id}">${ok ? '取消完成' : '完成！'}</button></div></details>`;
}
function phaseHtml(P) {
  const cur = curPhase(); const L = QUESTS.filter((q) => q.ph === P.ph); const need = L.filter((q) => !q.opt); const n = questDone(need);
  const locked = P.ph > cur; const firstTodo = L.findIndex((q) => !S.ops.setup[q.id]);
  const head = `<div class="ph-h"><span class="ph-n">${P.ph}</span><div><b>${esc(P.t)}</b><p>${esc(P.s)}</p></div><em>${n}／${need.length}</em></div>`;
  if (locked) {
    return `<section class="phase locked">${head}<div class="ph-lock"><p>${P.ph === cur + 1 ? '還沒開：現在先專心經營前一個階段。準備好了按下面，作戰台就會開始排這個平台。' : '前一個階段開了之後再來。'}</p>${P.ph === cur + 1 ? `<button class="btn sm y" data-act="opmode" data-v="${P.mode}">開啟${P.ph === 2 ? '第二' : '第三'}階段</button>` : ''}</div>
      <details class="ph-peek"><summary>先看看要做哪些事</summary><ul>${L.map((q) => `<li>${esc(q.t)}</li>`).join('')}</ul></details></section>`;
  }
  return `<section class="phase ${n >= need.length ? 'done' : ''}">${head}<div class="quests">${L.map((q, i) => questHtml(q, i, i === firstTodo && P.ph === cur)).join('')}</div></section>`;
}
function modeHtml() {
  const M = [['th', '只顧 Threads', '第一階段（建議先這樣）'], ['thig', 'Threads＋IG', '第二階段'], ['all', '三個平台', '第三階段']];
  return `<section class="pmode"><h4>現在經營哪些平台</h4><div class="pm-seg">${M.map(([v, l, s]) => `<button class="${S.ops.mode === v ? 'on' : ''}" data-act="opmode" data-v="${v}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>
    <p class="sub-note">${thOnly() ? '先把一個平台做起來，比三個平台都半套有用：今日任務、排程、成效現在都只算 Threads。IG、FB 之後再開，之前的貼文都會留著。' : '今日任務、排程、成效會照這裡選的平台排；改回只顧 Threads 也不會刪掉任何紀錄。'}</p></section>`;
}
function renderOpsLearn() {
  const P = plat(); const L = questsNeed(); const n = questDone(L); const pr = S.ops.prof; const cur = curPhase();
  const rule = (pf, t) => { const r = P[pf] || {}; return `<div class="rule"><div class="rule-h">${pf === 'yt' ? '<span class="pfb yt">YT</span>' : pfBadge(pf)}<b>${esc(t)}</b></div><ul>${(r.notes || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${(r.src || []).length ? `<details><summary>${r.src.length} 個來源</summary>${r.src.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('')}</details>` : ''}</div>`; };
  const later = ['ig', 'fb'].filter((p) => !opsPfs().includes(p));
  return `<div class="ops learn">${opsNav('learn')}${opsHead('教學', thOnly() ? '從零開始：先把 Threads 開好、養起來。每一篇的上架教學都在任務裡，這裡是開站和經營的功夫。' : '開站任務、經營心法和平台規則。每一篇的上架教學都在任務裡。')}
    <section class="q-top"><div class="q-ring" style="--p:${(n / L.length).toFixed(3)}"><b>${n}</b><span>／${L.length}</span></div><div><b>${n >= L.length ? (cur === 1 ? 'Threads 開站完成！' : '開站完成！') : cur === 1 ? 'Threads 開站任務' : '開站任務'}</b><p>${n >= L.length ? '之後每天照「今日任務」：發一篇、回完留言、海巡十分鐘。' : '照順序做，每做完一個按「完成」蓋章。做到一半離開也沒關係，進度會記住。'}</p></div></section>
    ${modeHtml()}
    <section class="prof"><h4>先填你的 YouTube 頻道網址</h4><p class="sub-note">簡介、連結會用到（只存在這台裝置）。</p>
      <label class="op-lab">YouTube 頻道<input type="url" data-act="opprof" data-k="yt" value="${esc(pr.yt)}" placeholder="https://www.youtube.com/@…"></label></section>
    ${PHASES.map(phaseHtml).join('')}
    <h3 class="tape-h p">Threads 經營心法 <small>新帳號最常卡的 12 件事</small></h3>
    <ol class="pbook">${PLAYBOOK.map((x) => `<li><b>${esc(x.h)}</b><p>${esc(x.t)}</p>${(x.src || []).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('')}</li>`).join('')}</ol>
    <h3 class="tape-h y">前 30 天路線圖</h3>
    <div class="road">${ROAD30.map(([d, t]) => `<div><b>${esc(d)}</b><span>${esc(t)}</span></div>`).join('')}</div>
    <h3 class="tape-h">平台規則速查 <small>查證於 ${esc(P.checked)}</small></h3>
    <div class="rules">${rule('th', 'Threads（脆）')}${opsPfs().includes('ig') ? rule('ig', 'Instagram') : ''}${opsPfs().includes('fb') ? rule('fb', 'Facebook 粉專') : ''}${rule('yt', 'YouTube 營利門檻')}</div>
    ${later.length ? `<details class="pl-why"><summary>之後才用得到的：${later.map((p) => PFI[p].n).join('、')}</summary><div class="rules" style="margin-top:10px">${later.map((p) => rule(p, PFI[p].full)).join('')}</div></details>` : ''}
    <p class="sub-note">平台規則會改：每週日的懶人包編輯會順手查一次，有變就更新這裡和上架教學。</p>
    <h3 class="tape-h">去哪裡看數據</h3>
    <div class="howto">${ckFields().map(([k, l, how]) => `<div><b>${esc(l)}</b><span>${esc(how)}</span></div>`).join('')}${opsPfs().map((p) => `<div><b>${PFI[p].n} 每篇成績</b><span>${esc(STAT_HOW[p])}</span></div>`).join('')}</div>
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
  openSheet(`<h3>${ICON.film} ${v ? '改影片資料' : '上片三連發'}</h3><p class="sub-note">${v ? '' : `填好之後，前一天預告、當天上片、隔天討論會自動排進${thOnly() ? ' Threads 的' : '各平台的'}週曆。`}</p>
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
  if (a === 'opq') {
    const k = act.dataset.k; const L = questsNeed();
    if (S.ops.setup[k]) delete S.ops.setup[k];
    else { S.ops.setup[k] = todayTW(); const all = questDone(L) >= L.length; sfx.stamp(); impact(act, [RED, YEL, BLK], all); if (all) setTimeout(() => { sfx.fanfare(); toast(thOnly() ? 'Threads 開站完成！之後每天：發一篇、回留言、海巡' : '開站完成！之後照今日任務發就好'); }, 300); }
    opsSave(); const y = scrollY; await route(); scrollTo(0, y); return true;
  }
  if (a === 'opcopyx') {
    const k = act.dataset.k; let text = act.dataset.t || BIO[k] || (k === 'yt' ? S.ops.prof.yt : '');
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
