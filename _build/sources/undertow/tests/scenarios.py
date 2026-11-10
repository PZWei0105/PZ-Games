#!/usr/bin/env python3
"""v2.0 核心規則的情境測試：python3 tests/scenarios.py"""
import asyncio, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run import page
from playwright.async_api import async_playwright

SETUP = """(si, seed) => { localStorage.clear(); const G = __ut.G; G.seenPrologue = true; G.sectors.forEach(s => s.unlocked = true);
  G.weapons = ['rivet','arc','harpoon','torch','sonic','cryo','drone']; G.lastTool = 'torch'; Object.keys(RADIO).forEach(k => G.tips[k] = true);
  AU.init(); window.__seed = seed; __ut.start(si); return 'ok'; }"""
PREP = """() => { const W = __ut.W; W.foes.forEach(e => e.dead = true); W.spawnT = 999; const h = W.hunter; h.state = 'away'; h.awayT = 999; return 'ok'; }"""
# 找一排三間都開著門的走廊，把人放在左邊那間
CORRIDOR = """() => { const W = __ut.W;
  for (let f = 0; f < W.F; f++) for (let c = 0; c + 2 < W.C; c++) { const a = W.rooms[f * W.C + c], b = W.rooms[f * W.C + c + 1], d = W.rooms[f * W.C + c + 2];
    if (a.collapsed || b.collapsed || d.collapsed || !b.doorL || !b.doorR) continue;
    for (const dr of [b.doorL, b.doorR]) { dr.state = 'open'; dr.open = 1; } markDoors();
    return { f, c, x0: a.x0, y: a.floorY }; }
  return null; }"""

async def run_case(pg, name, js, wait_ms, check_js):
    r0 = await pg.evaluate(js)
    await pg.wait_for_timeout(wait_ms)
    r = await pg.evaluate(check_js)
    ok = r.get('ok')
    print(('PASS ' if ok else 'FAIL ') + name, json.dumps(r, ensure_ascii=False), flush=True)
    return ok

async def main():
    res = []
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        async def fresh(si=0, seed=1234):
            await pg.evaluate(f"({SETUP})({si}, {seed})"); await pg.wait_for_timeout(1400)
            await pg.evaluate(PREP)
        # A：在開闊的走廊後退開火——牠追得上，抓到你
        await fresh(0, 1234)
        cor = await pg.evaluate(CORRIDOR)
        res.append(await run_case(pg, 'A 後退開火會被追上', f"""() => {{ const W = __ut.W, p = W.P, c = {json.dumps(cor)};
          p.x = c.x0 + 300; p.y = c.y; p.climb = null; W.P.flashes = 0; W.heart = 80;
          const h = W.hunter; Object.assign(h, {{ state: 'hunt', x: c.x0 + 60, y: c.y, tx: p.x, ty: p.y, know: 2, seen: true, quad: 1 }});
          INPUT.jx = 1; setFire(true); window.__hp0 = 0; return 'ok'; }}""", 3200,
          """() => { const W = __ut.W; INPUT.jx = 0; setFire(false); return { ok: !!W.P.caught && W.state !== 'play', st: W.state, caught: W.P.caught, hunter: W.hunter.state, hpHunter: W.hunter.hp === undefined ? 'none' : W.hunter.hp }; }"""))
        # B：子彈打牠沒用，只會讓牠知道你在哪
        await fresh(0, 1234)
        cor = await pg.evaluate(CORRIDOR)
        res.append(await run_case(pg, 'B 子彈打聆無效', f"""() => {{ const W = __ut.W, p = W.P, c = {json.dumps(cor)};
          p.x = c.x0 + 80; p.y = c.y; p.face = 1; W.P.flashes = 3;
          const h = W.hunter; Object.assign(h, {{ state: 'search', x: c.x0 + 420, y: c.y, tx: c.x0 + 420, ty: c.y, know: 0, seen: true, searchT: 0 }});
          window.__thud = 0; const o = AU.play.bind(AU); AU.play = (n, q) => {{ if (n === 'thud') window.__thud++; return o(n, q); }};
          setFire(true); return 'ok'; }}""", 900,
          """() => { const W = __ut.W, h = W.hunter; setFire(false); return { ok: window.__thud > 0 && (h.state === 'hunt' || h.state === 'attack' || h.state === 'stun' || h.state === 'flee') && h.hp === undefined, thud: window.__thud, st: h.state, ammo: W.P.ammo }; }"""))
        # C：躲在櫃子裡、牠經過時憋氣——牠走過去，沒發現
        await fresh(2, 4242)
        info = await pg.evaluate("""() => { const W = __ut.W; const r = W.rooms.find(q => !q.collapsed && q.special !== 'vault' && q.hides && q.hides.some(s => s.type === 'locker') && q.doorL && q.doorR);
          const sp = r.hides.find(s => s.type === 'locker'); for (const d of [r.doorL, r.doorR]) { d.state = 'open'; d.open = 1; } markDoors();
          const p = W.P; p.x = sp.x; p.y = r.floorY; enterHide(sp); p.hideT = 1; W.heart = 110;
          const h = W.hunter; const fromL = sp.x - r.x0 > RW / 2; Object.assign(h, { state: 'search', x: fromL ? r.x0 + 30 : r.x0 + RW - 30, y: r.floorY, know: 0, seen: true, searchT: 0, checkQ: [] });
          h.tx = fromL ? r.x0 + RW + 120 : r.x0 - 120; h.ty = r.floorY; W.learn = { locker: 0, bed: 0, desk: 0 };
          window.__holdT = setInterval(() => { const d = Math.abs(h.x - p.x); if (d < 140 && !p.hold && p.breath > .2) holdBreath(true); if (d > 160 && p.hold) holdBreath(false); }, 30);
          return { sp: sp.x, hx: h.x }; }""")
        await pg.wait_for_timeout(5200)
        r = await pg.evaluate("""() => { clearInterval(window.__holdT); const W = __ut.W; return { ok: !W.P.caught && W.state === 'play' && !!W.P.hide, caught: W.P.caught, hunter: W.hunter.state, hx: Math.round(W.hunter.x), learn: W.learn, dodges: W.dodges, heart: Math.round(W.heart) }; }""")
        print(('PASS ' if r['ok'] else 'FAIL ') + 'C 躲櫃子＋憋氣不會被發現', json.dumps(r, ensure_ascii=False)); res.append(r['ok'])
        # D：一樣躲著，但不憋氣——牠經過時聽到呼吸
        await fresh(2, 4242)
        await pg.evaluate("""() => { const W = __ut.W; const r = W.rooms.find(q => !q.collapsed && q.special !== 'vault' && q.hides && q.hides.some(s => s.type === 'locker') && q.doorL && q.doorR);
          const sp = r.hides.find(s => s.type === 'locker'); for (const d of [r.doorL, r.doorR]) { d.state = 'open'; d.open = 1; } markDoors();
          const p = W.P; p.x = sp.x; p.y = r.floorY; enterHide(sp); p.hideT = 1; W.heart = 110; p.flashes = 0;
          const h = W.hunter; const fromL = sp.x - r.x0 > RW / 2; Object.assign(h, { state: 'search', x: fromL ? r.x0 + 30 : r.x0 + RW - 30, y: r.floorY, know: 0, seen: true, searchT: 0, checkQ: [] });
          h.tx = fromL ? r.x0 + RW + 120 : r.x0 - 120; h.ty = r.floorY; return 'ok'; }""")
        await pg.wait_for_timeout(4200)
        r = await pg.evaluate("""() => { const W = __ut.W; return { ok: !!W.P.caught, caught: W.P.caught, st: W.state, hunter: W.hunter.state }; }""")
        print(('PASS ' if r['ok'] else 'FAIL ') + 'D 躲著不憋氣會被聽到', json.dumps(r, ensure_ascii=False)); res.append(r['ok'])
        # E：焊槍逼退
        await fresh(0, 1234)
        cor = await pg.evaluate(CORRIDOR)
        res.append(await run_case(pg, 'E 焊槍逼退聆', f"""() => {{ const W = __ut.W, p = W.P, c = {json.dumps(cor)};
          p.x = c.x0 + 200; p.y = c.y; p.face = 1;
          const h = W.hunter; Object.assign(h, {{ state: 'search', x: c.x0 + 300, y: c.y, tx: c.x0 + 300, ty: c.y, know: 0, seen: true, searchT: 0, repelled: 0 }});
          useTool(); return 'ok'; }}""", 1600,
          """() => { const W = __ut.W, h = W.hunter; return { ok: (h.state === 'flee' || h.state === 'away') && W.P.toolUses === 2, st: h.state, uses: W.P.toolUses, rep: h.repelled }; }"""))
        # F：陷阱——灌水、通電，把牠電死
        await fresh(1, 777)
        res.append(await run_case(pg, 'F 陷阱電死聆', """() => { const W = __ut.W, r = W.rooms[W.M.traps[0]], p = W.P;
          p.fuses = 1; p.x = r.trap.bx; p.y = r.floorY; armTrap(r); r.water = .6;
          const nb = W.rooms.find(q => !q.collapsed && q !== r && q.f === r.f); p.x = nb.x0 + RW / 2;
          const h = W.hunter; Object.assign(h, { state: 'search', x: r.x0 + RW / 2, y: r.floorY, tx: r.x0 + RW / 2, ty: r.floorY, know: 0, seen: true, searchT: 0 });
          window.__ready = !!trapReady(); fireTrap(); return 'ok'; }""", 3600,
          """() => { const W = __ut.W, h = W.hunter; return { ok: window.__ready && h.dead && W.obj.hunterKill && W.items.some(i => i.kind === 'relic'), ready: window.__ready, dead: h.dead, st: h.state, kill: W.obj.hunterKill }; }"""))
        # G：機器會把牠引過去，牠會把機器拆了
        await fresh(0, 1234)
        res.append(await run_case(pg, 'G 機器引開聆', """() => { const W = __ut.W; const r = W.rooms.find(q => !q.collapsed && q.machines && q.machines.length);
          if (!r) return 'nomachine'; const m = r.machines[0]; window.__m = m;
          const h = W.hunter; Object.assign(h, { state: 'search', x: r.x0 + (m.x - r.x0 > RW / 2 ? 30 : RW - 30), y: r.floorY, tx: r.x0 + 30, ty: r.floorY, know: 0, seen: true, searchT: 0 });
          const p = W.P; const far = W.rooms.find(q => !q.collapsed && Math.abs(q.f - r.f) >= 2) || W.rooms[0]; p.x = far.x0 + 100; p.y = far.floorY;
          startMachine(m); return 'ok'; }""", 6000,
          """() => { const m = window.__m; return { ok: !!m && m.broken, broken: m && m.broken, on: m && m.on, st: __ut.W.hunter.state }; }"""))
        # H：震爆彈——被抓到時掙脫一次
        await fresh(0, 1234)
        cor = await pg.evaluate(CORRIDOR)
        res.append(await run_case(pg, 'H 震爆彈掙脫', f"""() => {{ const W = __ut.W, p = W.P, c = {json.dumps(cor)};
          p.x = c.x0 + 200; p.y = c.y; p.flashes = 1;
          const h = W.hunter; Object.assign(h, {{ state: 'hunt', x: c.x0 + 120, y: c.y, tx: p.x, ty: p.y, know: 2, seen: true }}); return 'ok'; }}""", 1800,
          """() => { const W = __ut.W, h = W.hunter; return { ok: W.state === 'play' && W.P.flashes === 0 && W.escapes === 1 && (h.state === 'stun' || h.state === 'flee' || h.state === 'away'), flashes: W.P.flashes, esc: W.escapes, st: h.state, hp: Math.round(W.P.hp) }; }"""))
        # I：會記住你躲過的地方
        res.append(await run_case(pg, 'I 牠會翻你躲過的那種地方', """() => { const W = __ut.W; const r = W.rooms.find(q => !q.collapsed && q.hides && q.hides.filter(s => s.type === 'locker').length);
          const h = W.hunter; h.tx = r.hides[0].x; h.ty = r.floorY; W.learn = { locker: 0, bed: 0, desk: 0 }; let a = 0, b = 0;
          for (let k = 0; k < 400; k++) { planChecks(h); if (h.checkQ.length) a++; }
          W.learn = { locker: 4, bed: 4, desk: 4 }; for (let k = 0; k < 400; k++) { planChecks(h); if (h.checkQ.length) b++; }
          window.__ab = [a, b]; return 'ok'; }""", 50,
          """() => { const [a, b] = window.__ab; return { ok: b > a * 2.5, before: a, after: b }; }"""))
        # J：實際灌水——門關上、開海水閘，水要灌得夠深，而且要撐得夠久（梯子口不會把水漏光）
        for si, seed in ((0, 1234), (1, 777), (2, 4242), (3, 99), (4, 5150)):
            await fresh(si, seed)
            res.append(await run_case(pg, f'J 灌水撐得住（艙段 {si + 1}）', """() => { const W = __ut.W; __ut.god(); const out = [];
              for (const i of W.M.traps) { const r = W.rooms[i];
                for (const d of [r.doorL, r.doorR]) if (d && d.state !== 'locked') { d.state = 'closed'; d.open = 0; }
                markDoors(); r.water = 0; floodTrap(r); let t12 = 0, t40 = 0;
                for (let k = 1; k <= 60 * 40; k++) { W.hunter.state = 'away'; W.hunter.awayT = 999; updateWorld(1 / 60); if (k === 60 * 12) t12 = r.water; }
                t40 = r.water; out.push({ i, lad: !!r.ladDown, w12: +t12.toFixed(2), w40: +t40.toFixed(2) }); }
              window.__J = out; return 'ok'; }""", 50,
              """() => { const o = window.__J; return { ok: o.length > 0 && o.every(x => x.w12 >= .5 && x.w40 >= .26), traps: o }; }"""))
        print('\n'.join(errs[:20]))
        await b.close()
    print(f'{sum(1 for x in res if x)}/{len(res)} passed')

asyncio.run(main())
