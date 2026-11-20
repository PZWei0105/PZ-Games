/* 解包 — 上市戰報＋繁中最新風向（2026-11-20）
   上市戰報：寫過的遊戲一上市，專題頁最上面自動長出「上市第 N 小時・戰報」（直播中），滿 72 小時凍結成「上市 72 小時戰報」：
   同上高峰與曲線、Steam 好評率（首日→72 小時）、繁中玩家好評率、72 小時內的官方修正。資料是 live.py 的 launch_report()
   （live/<appid>.json 的 launch），凍結後永久留著。上市 14 天內放在頁面最上面，之後收進「資訊」。
   繁中最新風向：live.py 每天收一次 Steam 繁中評論（tcv），好評、負評各挑 3 則短摘，附遊玩時數和日期；不存作者。 */
function launchOf(lv) { const L = lv && lv.launch; return L && (L.pk || L.rv) ? L : null; }   // DLC 沒有同上人數：只有評價也算
function launchFresh(L) { return L && Date.now() - L.ts * 1000 < 14 * 864e5; }
function launchHtml(lv, where) {
  const L = launchOf(lv); if (!L) return '';
  const fz = !!L.fz; const ts = L.ts * 1000;
  const hp = L.pk ? Math.max(0, Math.round((L.pkt * 60e3 - ts) / 36e5)) : 0;
  const now = lv.players && lv.players.n;
  const sp = launchSpark(L);
  const rv = L.rv, rv0 = L.rv0, rt = L.rt;
  const trend = rv && rv0 && rv[0] !== rv0[0] ? (rv[0] > rv0[0] ? `<em class="up">▲ 首日 ${rv0[0]}%</em>` : `<em class="dn">▼ 首日 ${rv0[0]}%</em>`) : rv0 ? `<em>首日 ${rv0[0]}%</em>` : '';
  const line = [L.pk ? `開賣${fz ? ' 72 小時' : `第 ${L.h} 小時`}同上最高 ${fmtN(L.pk)} 人（上市後第 ${hp} 小時）` : `開賣${fz ? ' 72 小時' : `第 ${L.h} 小時`}`,
    rv ? `Steam 好評率 ${rv[0]}%（${fmtN(rv[1])} 則）` : '', rt ? `繁中玩家 ${rt[0]}%（${fmtN(rt[1])} 則）` : '',
    L.np ? (fz ? `官方 72 小時內出了 ${L.np} 次修正` : `官方已經出了 ${L.np} 次修正`) : fz ? '72 小時內沒有發修正' : ''].filter(Boolean).join('，') + '。';
  return `<section class="lr ${fz ? 'fz' : 'on'} ${where || ''}" id="launch"><div class="lr-h"><span class="lr-k">${fz ? '上市 72 小時戰報' : `上市第 ${L.h} 小時・戰報`}</span>${fz ? '<i class="lr-tag">凍結</i>' : '<i class="lr-tag on">● 直播中</i>'}<small>${esc(twDate(ts).slice(5).replace('-', '/'))} 上市</small></div>
    ${L.part ? '<p class="lr-part">這款從上市後才開始追蹤，最前面幾個小時的數字不完整。</p>' : ''}
    <div class="lr-g"><div class="lr-c pk"><small>同上高峰</small>${L.pk ? `<b>${esc(fmtN(L.pk))}</b><i>第 ${hp} 小時${now && !fz ? `・現在 ${esc(fmtN(now))}` : ''}</i>` : '<b>—</b><i>Steam 沒給同上人數（DLC 之類）</i>'}</div>
      <div class="lr-c"><small>Steam 好評</small><b>${rv ? rv[0] + '<span>%</span>' : '—'}</b><i>${rv ? `${esc(fmtN(rv[1]))} 則` : '還沒有'}${trend}</i></div>
      <div class="lr-c"><small>繁中玩家</small><b>${rt ? rt[0] + '<span>%</span>' : '—'}</b><i>${rt ? `${esc(fmtN(rt[1]))} 則` : '還沒有'}</i></div>
      <div class="lr-c"><small>官方修正</small><b>${L.np || 0}<span>次</span></b><i>${fz ? '72 小時內' : '上市到現在'}</i></div></div>
    ${sp}<p class="lr-s">${esc(line)}</p>
    ${(L.pt || []).length ? `<div class="lr-pt">${L.pt.map((p) => `<a href="${esc(p.u || '#')}" target="_blank" rel="noopener noreferrer">🔧 ${esc(p.t)}</a>`).join('')}</div>` : ''}</section>`;
}
function launchSpark(L) {
  const P = L.pl || []; if (P.length < 2) return '';
  const m0 = L.ts / 60, W = 300, H = 64; const mx = Math.max(...P.map((p) => p[1])) || 1;
  const pts = P.map((p) => [Math.max(0, Math.min(1, (p[0] - m0) / (72 * 60))) * W, H - 3 - (p[1] / mx) * (H - 8)]);
  const pk = pts[P.findIndex((p) => p[1] === mx)];
  const f = (p) => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  return `<div class="lr-spw"><svg class="lr-sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="ar" d="M${pts[0][0].toFixed(1)},${H} L${pts.map(f).join(' L')} L${pts[pts.length - 1][0].toFixed(1)},${H} Z"/><polyline points="${pts.map(f).join(' ')}"/></svg>${pk ? `<i class="lr-dot" style="left:${(pk[0] / W * 100).toFixed(1)}%;top:${(pk[1] / H * 100).toFixed(1)}%"></i>` : ''}<div class="lr-sx"><span>上市</span><span>24h</span><span>48h</span><span>72 小時</span></div></div>`;
}
/* 追蹤牆：最近 7 天上市、寫過專題或推坑的遊戲，貼一張戰報便利貼（live.json 只帶精簡的 ln，完整的在 live/<appid>.json） */
function launchNotes() {
  const out = []; const seen = new Set();   // 最近上市的排前面，最多 3 張
  const all = [...((S.index && S.index.items) || []).map((x) => ['f', x]), ...((S.picks && S.picks.items) || []).map((x) => ['p', x])];
  for (const [k, x] of all) {
    const lv = liveOf(x.steam); const L = lv && (launchOf(lv) || (lv.ln && (lv.ln.pk || lv.ln.rv) ? lv.ln : null));
    if (!L || seen.has(String(x.steam)) || Date.now() - L.ts * 1000 > 7 * 864e5) continue;
    seen.add(String(x.steam));
    const t = `${x.zh}・${L.fz ? '72 小時戰報' : `上市第 ${L.h} 小時`}`;
    if (L.pk) out.push({ c: 'p', id: x.id, go: k + '/' + x.id, t, v: fmtN(L.pk).replace(' 萬', ''), unit: L.pk >= 10000 ? '萬人' : '人', d: `同上高峰${L.rv ? `・Steam 好評 ${L.rv[0]}%${L.rt ? `・繁中 ${L.rt[0]}%` : ''}` : '・評價還在累積'}` });
    else out.push({ c: 'p', id: x.id, go: k + '/' + x.id, t, v: L.rv[0], unit: '%', d: `Steam 好評率（${fmtN(L.rv[1])} 則）${L.rt ? `・繁中 ${L.rt[0]}%` : ''}` });
    out[out.length - 1].ts = L.ts;
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 3);
}

/* ---- 繁中最新風向 ---- */
function tcvHtml(lv, appid) {
  const V = lv && lv.tcv; if (!V || !((V.pos || []).length || (V.neg || []).length)) return '';
  const tc = lv.rv_tc;
  const q = (x, k) => `<blockquote class="tq ${k}${x[0].length > 90 ? ' cl" data-act="tqx' : ''}"><p>${esc(x[0])}</p><footer>${x[1] ? `玩了 ${esc(String(x[1]))} 小時` : ''}${x[2] ? `・${esc(mdDay(x[2]))}` : ''}</footer></blockquote>`;
  return `<div class="tcv"><div class="tcv-h"><b>繁中玩家・最新風向</b><small>${V.d ? `${esc(mdDay(V.d))} 更新` : ''}・每天收一次 Steam 繁中評論</small>${tc && tc.pct != null ? `<span class="tcv-p">${tc.pct}%<i>${esc(tc.label || '')}・${esc(fmtN(tc.n))} 則</i></span>` : ''}</div>
    <div class="tcv-g"><div class="tcv-c pos"><h4>👍 誇的</h4>${(V.pos || []).map((x) => q(x, 'pos')).join('') || '<p class="tcv-n">最近沒有好評。</p>'}</div>
      <div class="tcv-c neg"><h4>👎 罵的</h4>${(V.neg || []).map((x) => q(x, 'neg')).join('') || '<p class="tcv-n">最近沒有負評。</p>'}</div></div>
    ${appid ? `<a class="tcv-a" href="https://steamcommunity.com/app/${appid}/reviews/?browsefilter=mostrecent&filterLanguage=tchinese" target="_blank" rel="noopener noreferrer">到 Steam 看全部繁中評論 →</a>` : ''}</div>`;
}
function launchAct(a, el) {
  if (a === 'tqx') { el.classList.toggle('open'); return true; }
  return false;
}
