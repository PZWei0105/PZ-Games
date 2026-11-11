#!/usr/bin/env python3
"""各區域截圖：python3 tests/qa_zones.py [w h] [前綴]"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game
from qa import SETUP
SPOTS = [('vault', 9, 9), ('slope', 31, 31), ('slope', 19, 15), ('slope', 9, 9), ('market', 16, 17), ('market', 7, 7), ('sump', 21, 31), ('sump', 20, 18), ('sump', 8, 7), ('gallery', 30, 31), ('gallery', 19, 18), ('gallery', 10, 8), ('root', 21, 28), ('root', 11, 11)]
async def main():
    w = int(sys.argv[1]) if len(sys.argv) > 1 else 390; h = int(sys.argv[2]) if len(sys.argv) > 2 else 844; pre = sys.argv[3] if len(sys.argv) > 3 else 'z'
    async with Game(w, h) as g:
        print(await g.js(SETUP)); await g.wait(300)
        await g.do("for (const k in SCRIPTS) if (k.startsWith('pre_') || k.startsWith('arrive_') || k.startsWith('tr_') || k === 'e_boss' || k === 'e_ledger') SCRIPTS[k] = async () => {}; engage = async () => {}; G.flags.zhuo_fight = 0; G.disc.root = 1;")
        for i, (z, x, y) in enumerate(SPOTS):
            await g.do(f"enterZone('{z}'); hudMode('explore'); teleport({x}, {y});")
            await g.wait(700); await g.shot(f'{pre}{i:02d}_{z}')
if __name__ == '__main__':
    asyncio.run(main())
