import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
BOT = open(os.path.join(os.path.dirname(__file__), 'run.py'), encoding='utf-8').read().split('BOT = r"""')[1].split('"""')[0]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(URL); page.wait_for_timeout(1500)
    page.click('text=新的殖民地'); page.wait_for_timeout(300); page.click('#intro .skip'); page.wait_for_timeout(400)
    page.evaluate(BOT); page.evaluate("__bot.resolve(); G.speed=0;")
    page.evaluate("__bot.run(9); __bot.resolve();")
    for label, setup in [('day z1.35', "G.t=Math.floor(G.t/DAY)*DAY+12*60; CAM.tz=CAM.z=1.35;"), ('night z1.35', "G.t=Math.floor(G.t/DAY)*DAY+22*60; CAM.tz=CAM.z=1.35;"), ('night z0.5', "CAM.tz=CAM.z=0.5;"), ('tide z0.8', "scheduleTide(G.day); G.t=Math.floor(G.t/DAY)*DAY+18.6*60; for(let i=0;i<200;i++){simAdvance(1);__bot.resolve();} CAM.tz=CAM.z=0.8;")]:
        page.evaluate(setup + " const h=hull(); centerOn(h.x+2.5,h.y+1.5);")
        ms = page.evaluate("(()=>{ const t=[]; for(let i=0;i<40;i++){ const a=performance.now(); render(); t.push(performance.now()-a);} t.sort((a,b)=>a-b); return [t[20], t[36], awake().length, G.beasts.length, G.buildings.length]; })()")
        print(label, 'median %.1fms p90 %.1fms' % (ms[0], ms[1]), 'colonists', ms[2], 'beasts', ms[3], 'buildings', ms[4])
    br.close()
