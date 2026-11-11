#!/usr/bin/env python3
"""虛擬搖桿：拖動就走、拖越遠越快、放手就停、輕點仍是走過去；對話跳出來時搖桿作廢。python3 tests/joystick.py"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game, ROOT
fails = []
def check(n, c, info=''):
    print(('  ok   ' if c else '  FAIL ') + n + ('  ' + str(info) if not c else ''))
    if not c: fails.append(n)
async def main():
    async with Game() as g:
        await g.pg.add_script_tag(path=os.path.join(ROOT, 'tests', 'showcase.js'))
        await g.js("(() => { __show.base(); __show.zone('camp', 11, 15); __show.calm(true); S.cut = 0; return 1; })()"); await g.wait(400)
        pos = "({ x: Z.leader.x, y: Z.leader.y })"; m = g.pg.mouse
        p0 = await g.js(pos)
        # 往右下拖（畫面右下＝世界 +x）
        await m.move(200, 600); await m.down(); await m.move(215, 605); await m.move(250, 620, steps=4); await g.wait(700)
        vis = await g.js("!!document.querySelector('#joy.on')"); p1 = await g.js(pos)
        await g.shot('joy_drag')
        check('joystick shows where the finger went down', vis)
        check('drag moves the hero', abs(p1['x'] - p0['x']) + abs(p1['y'] - p0['y']) > .8, (p0, p1))
        # 拖出圈外：搖桿跟著走，人還在走
        await m.move(380, 700, steps=5); await g.wait(300); o = await g.js("[JOY.ox, JOY.oy]")
        check('base follows a finger that runs past the ring', o[0] > 240, o)
        await m.up(); await g.wait(120); p2 = await g.js(pos); await g.wait(500); p3 = await g.js(pos)
        check('release: stops and hides', abs(p3['x'] - p2['x']) + abs(p3['y'] - p2['y']) < .05 and not await g.js("!!document.querySelector('#joy.on')"), (p2, p3))
        # 小幅拖＝慢走，大幅拖＝快走
        async def speed(dx):
            a = await g.js(pos); await m.move(195, 450); await m.down(); await m.move(195 + dx, 450 - dx * .5, steps=3); await g.wait(500); b = await g.js(pos); await m.up(); await g.wait(200)
            return ((b['x'] - a['x']) ** 2 + (b['y'] - a['y']) ** 2) ** .5
        s1 = await speed(-16); s2 = await speed(-60); check('farther drag walks faster', s2 > s1 * 1.4, (s1, s2))
        # 輕點仍然是走過去
        a = await g.js(pos); await m.click(260, 520); await g.wait(1200); b = await g.js(pos)
        check('tap still walks there', abs(b['x'] - a['x']) + abs(b['y'] - a['y']) > .5 and not await g.js("!!document.querySelector('#joy.on')"), (a, b))
        # 按著搖桿時跳出對話：搖桿作廢，對話結束後不會自己衝出去
        await m.move(200, 600); await m.down(); await m.move(240, 620, steps=3); await g.wait(200)
        await g.js("(() => { S.cut++; say(null, '測試。'); return 1; })()"); await g.wait(300)
        await g.js("(() => { endTalk(); S.cut = 0; return 1; })()"); a = await g.js(pos); await g.wait(600); b = await g.js(pos)
        check('dialog cancels the held joystick', abs(b['x'] - a['x']) + abs(b['y'] - a['y']) < .05 and not await g.js("!!document.querySelector('#joy.on')"), (a, b))
        await m.up()
        # 戰鬥中拖動不出搖桿
        await g.js("(() => { __show.battle('s1'); return 1; })()"); await g.pg.wait_for_function("S.mode === 'battle'", timeout=30000); await g.wait(800)
        await m.move(200, 500); await m.down(); await m.move(260, 540, steps=3); await g.wait(200)
        check('no joystick in battle', not await g.js("!!document.querySelector('#joy.on')")); await m.up()
    print('\n' + ('全部通過' if not fails else '失敗：' + ', '.join(fails)))
asyncio.run(main())
