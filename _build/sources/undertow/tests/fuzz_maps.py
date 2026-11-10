"""地圖生成檢查：每個艙段各生 250 張地圖，確認撤離塢有月池、深艙有收容槽、逃生艙有艙口、所有艙室都走得到。用法：python3 tests/fuzz_maps.py"""
import asyncio, json, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from run import page
from playwright.async_api import async_playwright
JS = r"""() => {
  const out = {}; const bad = []; let hideRooms = 0, liveRooms = 0;
  for (let si = 0; si <= 5; si++) {
    let n = 0;
    for (let seed = 1; seed <= 250; seed++) {
      const M = genMap(si, seed * 7919 + si, si === 5 ? 1 + (seed % 6) : 0);
      n++;
      const R = (c, f) => M.rooms.find(r => r.c === c && r.f === f);
      const has = (r, k) => (r.props || []).some(p => p.kind === k);
      const dock = M.rooms[M.dock];
      if (!has(dock, 'moonpool')) bad.push([si, seed, 'no moonpool']);
      if (M.deep >= 0 && !has(M.rooms[M.deep], 'bigtank')) bad.push([si, seed, 'no tank']);
      if (si === 4 && M.deep < 0) bad.push([si, seed, 'no deep room']);
      for (const r of M.rooms) if (r.special === 'pod' && !has(r, 'podhatch')) bad.push([si, seed, 'no podhatch']);
      // 道具不可壓到梯子
      for (const r of M.rooms) for (const L of [r.ladUp, r.ladDown]) if (L) for (const p of r.props || []) { const lx = L.x - r.x0; if (p.kind !== 'body' && lx > p.x + 8 && lx < p.x + p.w - 8 && ['bigtank','moonpool','podhatch','hatch'].includes(p.kind)) bad.push([si, seed, 'prop on ladder ' + p.kind]); }
      // 可達性（玩家）：門（非上鎖）與梯子
      const seen = new Set([M.start]), q = [M.rooms[M.start]];
      while (q.length) { const r = q.shift(); const nb = [];
        if (r.doorL && r.doorL.state !== 'locked') nb.push(R(r.c - 1, r.f)); if (r.doorR && r.doorR.state !== 'locked') nb.push(R(r.c + 1, r.f));
        if (r.ladDown) nb.push(R(r.c, r.f + 1)); if (r.ladUp) nb.push(R(r.c, r.f - 1));
        for (const x of nb) if (x && !x.collapsed && !seen.has(x.i)) { seen.add(x.i); q.push(x); } }
      for (const r of M.rooms) if (!r.collapsed && !seen.has(r.i) && r.special !== 'vault') bad.push([si, seed, 'unreachable room ' + r.i + ' ' + (r.special||'')]);
      if (!seen.has(M.dock)) bad.push([si, seed, 'dock unreachable']);
      if (M.deep >= 0 && !seen.has(M.deep)) bad.push([si, seed, 'deep unreachable']);
      if (M.vault >= 0 && !M.rooms.some(r => (r.spots || []).some(s => s.kind === 'key'))) bad.push([si, seed, 'vault without key']);
      // v2.0：陷阱艙、保險絲、躲藏點
      if (!M.traps.length) bad.push([si, seed, 'no trap room']);
      const fuses = M.rooms.reduce((a, r) => a + (r.spots || []).filter(s => s.kind === 'fuse').length, 0);
      if (fuses < M.traps.length) bad.push([si, seed, 'trap without fuse']);
      for (const ti of M.traps) if (!seen.has(ti)) bad.push([si, seed, 'trap unreachable']);
      if (!(dock.hides || []).length) bad.push([si, seed, 'dock no hide']);
      const live = M.rooms.filter(r => !r.collapsed); hideRooms += live.filter(r => (r.hides || []).length).length; liveRooms += live.length;
      for (const rs of M.residents) if (rs.type === 'wall') { const r = M.rooms[rs.room]; if ((r.props || []).some(p => rs.x - r.x0 > p.x - 8 && rs.x - r.x0 < p.x + p.w + 8)) bad.push([si, seed, 'wall on prop']); }
    }
    out[si] = n;
  }
  const agg = {}; for (const b of bad) agg[b[0] + ':' + b[2]] = (agg[b[0] + ':' + b[2]] || 0) + 1;
  return { out, nbad: bad.length, agg, sample: bad.slice(0, 8), hideRoomPct: Math.round(hideRooms / liveRooms * 100) };
}"""
async def main():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        r = await pg.evaluate(JS)
        print(json.dumps(r, ensure_ascii=False, indent=1))
        print(errs[:5])
        await b.close()
asyncio.run(main())
