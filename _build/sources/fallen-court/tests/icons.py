#!/usr/bin/env python3
"""用遊戲自己的彩窗畫出圖示：python3 tests/icons.py  → assets/icon-512/192/180.png"""
import asyncio, base64, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game, ROOT
JS = """(size) => { const c = mkCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, size * .1, size / 2, size / 2, size * .72); gr.addColorStop(0, '#1c2038'); gr.addColorStop(1, '#07080e'); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  drawRose(g, size / 2, size / 2, size * .41, 'all', 0);
  g.fillStyle = 'rgba(7,8,14,.36)'; g.beginPath(); g.arc(size / 2, size / 2, size * .41, 0, TAU); g.fill();
  g.strokeStyle = '#ffcf5a'; g.lineWidth = size * .011; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); const P = [[.80, .16], [.70, .28], [.74, .36], [.60, .47], [.63, .56], [.46, .68], [.49, .76], [.30, .88]]; P.forEach((p, i) => i ? g.lineTo(p[0] * size, p[1] * size) : g.moveTo(p[0] * size, p[1] * size)); g.stroke();
  g.font = `900 ${size * .47}px 'Noto Serif CJK TC','Noto Serif TC',serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#07080e'; g.lineWidth = size * .04; g.strokeText('墜', size / 2, size * .525); g.fillStyle = '#f6eedb'; g.fillText('墜', size / 2, size * .525);
  return c.toDataURL('image/png'); }"""
async def main():
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    async with Game(600, 600) as g:
        for s in (512, 192, 180):
            url = await g.pg.evaluate(JS, s)
            open(os.path.join(ROOT, 'assets', f'icon-{s}.png'), 'wb').write(base64.b64decode(url.split(',')[1]))
            print('icon', s)
if __name__ == '__main__':
    asyncio.run(main())
