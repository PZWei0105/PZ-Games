import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
OUT = os.path.join(ROOT, 'shots')
BOT = open(os.path.join(os.path.dirname(__file__), 'run.py'), encoding='utf-8').read().split('BOT = r"""')[1].split('"""')[0]
desk = len(sys.argv) > 1 and sys.argv[1] == 'desk'
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1) if desk else br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_timeout(1500)
    page.click('text=新的殖民地'); page.wait_for_timeout(300); page.click('#intro .skip'); page.wait_for_timeout(400)
    page.evaluate(BOT); page.evaluate("__bot.resolve(); G.speed=0; __bot.run(7.3); __bot.resolve(); G.t=Math.floor(G.t/DAY)*DAY+10*60;")
    pre = 'd_' if desk else ''
    if desk:
        page.evaluate("const h=hull(); centerOn(h.x+2.5,h.y+1.5,1.1); UI.select({kind:'b',o:hull()})"); page.wait_for_timeout(900); page.screenshot(path=f'{OUT}/{pre}30_hull.png')
    page.evaluate("UI.closeSheet(); playScene([{s:'any',t:'艦長，你看天上——兩個月亮，一大一小。'},{s:'ai',t:'新禾星只有一顆衛星。'}])"); page.wait_for_timeout(1600); page.screenshot(path=f'{OUT}/{pre}31_dialog.png')
    page.evaluate("__bot.resolve(); UI.openSheet('people')"); page.wait_for_timeout(700); page.screenshot(path=f'{OUT}/{pre}32_people.png')
    page.evaluate("UI.openSheet('research')"); page.wait_for_timeout(600); page.screenshot(path=f'{OUT}/{pre}33_research.png')
    page.evaluate("G.flags.located=1; G.tide.done=true; G.exp={phase:'idle',team:[]}; UI.openSheet('exp')"); page.wait_for_timeout(600); page.screenshot(path=f'{OUT}/{pre}34_exp.png')
    page.evaluate("UI.logTab='obj'; UI.openSheet('log')"); page.wait_for_timeout(600); page.screenshot(path=f'{OUT}/{pre}35_log.png')
    page.evaluate("UI.closeSheet(); const n=G.world.nodes.find(n=>n.type==='bush'&&explored(n.x,n.y)); centerOn(n.x,n.y,1.5); UI.select({kind:'n',o:n})"); page.wait_for_timeout(700); page.screenshot(path=f'{OUT}/{pre}36_node.png')
    print('\n'.join(errs[:10]) or 'NO ERRORS')
    br.close()
