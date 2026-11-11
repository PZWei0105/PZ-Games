"""測試共用：開無頭瀏覽器載入遊戲。用法見 tests/flow_*.py"""
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = '/tmp/fc'
class Game:
    def __init__(self, w=390, h=844, build='web'): self.w, self.h, self.build, self.errs = w, h, os.environ.get('FC_BUILD', build), []  # FC_BUILD=old：拿 dist/old/（自己放進去的舊版）來對照
    async def __aenter__(self):
        self.pw = await async_playwright().start()
        self.b = await self.pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-first-run', '--autoplay-policy=no-user-gesture-required'])
        self.ctx = await self.b.new_context(viewport={'width': self.w, 'height': self.h}, device_scale_factor=2, has_touch=False)
        self.pg = await self.ctx.new_page()
        self.pg.on('console', lambda m: self.errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        self.pg.on('pageerror', lambda e: self.errs.append('PAGEERR: ' + str(e)))
        await self.pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await self.pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        await self.pg.goto('file://' + os.path.join(ROOT, 'dist', self.build, 'index.html')); await self.pg.wait_for_timeout(500)
        await self.pg.evaluate("S.set.gfx = 'hi'; 1")  # 無頭瀏覽器是軟體算圖，別讓「自動畫質」把截圖降階
        return self
    async def __aexit__(self, *a):
        if self.errs: print('--- console ---'); print('\n'.join(self.errs[:30]))
        else: print('(no console errors)')
        await self.b.close(); await self.pw.stop()
    async def js(self, code): return await self.pg.evaluate(code)
    async def do(self, code):
        """執行但不等它回傳的 Promise（say／choose 這類要等玩家點的）"""
        return await self.pg.evaluate('(() => { ' + code + '; return 1; })()')
    async def wait(self, ms): await self.pg.wait_for_timeout(ms)
    async def shot(self, name): os.makedirs(OUT, exist_ok=True); await self.pg.screenshot(path=f'{OUT}/{name}.png'); return f'{OUT}/{name}.png'
    async def tap(self, x, y): await self.pg.mouse.click(x, y)
    async def click(self, sel, nth=0):
        loc = self.pg.locator(sel).nth(nth); await loc.click(timeout=4000)
    async def text(self, sel):
        try: return await self.pg.locator(sel).first.inner_text(timeout=1500)
        except Exception: return None
    async def advance(self, n=1, gap=120):
        """點對話往下走 n 次（每次點兩下：先顯示全文，再下一句）"""
        for _ in range(n):
            await self.pg.mouse.click(self.w / 2, self.h - 60); await self.wait(60); await self.pg.mouse.click(self.w / 2, self.h - 60); await self.wait(gap)
    async def talk_through(self, limit=60):
        """一路點到對話結束或出現選項"""
        for _ in range(limit):
            st = await self.js("({d: S.dialog, c: !!document.querySelector('#dlg .dc'), m: !document.querySelector('#modal').classList.contains('hide')})")
            if not st['d'] or st['c'] or st['m']: return st
            await self.pg.mouse.click(self.w / 2, self.h - 60); await self.wait(70)
        return None
