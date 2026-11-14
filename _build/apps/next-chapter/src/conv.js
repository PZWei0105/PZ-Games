/* ───────── 簡體轉繁體：匯入的簡體書自動轉成臺灣繁體（轉換表 lib/opencc-cn2t.js，用到時才下載） ───────── */
const Conv = (() => {
  // 只出現在簡體字的常用字；一段文字裡這些字夠多，就當作簡體書
  const SIMP = '们这说时会对发过还进开关门问间东车长马鸟鱼语读书见观听让论谁给样么为个来国学实经现认话边远运选万与专业两严丰临丽举义乐习乡买乱争亏亚产亲仅从价众优传伤体农决况净凉减凤击则刚创别剧办务动劳势区医华单卖卫却厂历压县参双发变号叹吗员团园围图圆场坏块坚声处备复头夹奋妈宁宝实审宫寻导将层岁岛币师带帮应废张弹强归当录忆忧怀态总恶惊惯战户执扩扫扬报担拥择挂损换据数断无旧显晓暂杀杂权条杨极构枪标树桥梦检楼欢残气汇汉没济浅测满灯灵点烟热爱爷状独猎环盖确礼离种积称稳穷笔紧红约级纪纸线练组细织终结络绝统继续维绿编缘罗罚职联肃脑脚脸节苏药获营虽规视觉计训议讯记讲许设访证评识诉词试该详误请调谈谢贝负财责败货质购贵费贺资赏赛赶转轮软轻载较辆达违连适递遗邮针钟钢钱铁银锁错键镇闪闭闲闹闻队阳阴阵阶际陆陈险随难静页顶项顺须顾顿预领题颜额风飞饭饮驾验鸡鸣麦黄齐龙';
  const set = new Set(SIMP);
  let loading = null, conv = {};
  /* 抽樣看看是不是簡體：每一百個漢字裡，簡體專用字超過兩個 */
  function looksSimplified(text) {
    let han = 0, simp = 0;
    for (let i = 0; i < text.length && han < 30000; i++) {
      const c = text.charCodeAt(i);
      if (c < 0x4e00 || c > 0x9fff) continue;
      han++; if (set.has(text[i])) simp++;
    }
    return han > 40 && simp / han > 0.02;
  }
  function load() {
    if (window.OpenCC) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'lib/opencc-cn2t.js'; s.async = true;
      s.onload = () => (window.OpenCC ? res() : rej(new Error('轉換表載入失敗')));
      s.onerror = () => { loading = null; rej(new Error('簡轉繁的轉換表下載失敗，連上網路再試一次')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  /* mode：'tw' 只轉字形；'twp' 連詞彙一起換成臺灣用語（软件→軟體、信息→資訊） */
  async function converter(mode) {
    await load();
    if (!conv[mode]) conv[mode] = window.OpenCC.Converter({ from: 'cn', to: mode === 'twp' ? 'twp' : 'tw' });
    return conv[mode];
  }
  return { looksSimplified, converter, load };
})();
