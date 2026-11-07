import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
BOT = open(os.path.join(os.path.dirname(__file__), 'run.py'), encoding='utf-8').read().split('BOT = r"""')[1].split('"""')[0]
seeds = [int(x) for x in sys.argv[1:]] or [11, 222, 3333, 44444, 555555]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    page = br.new_context(viewport={'width': 390, 'height': 844}).new_page()
    errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_timeout(1200)
    page.evaluate(BOT)
    for sd in seeds:
        r = page.evaluate(f"""(()=>{{ UI.titleOn=false; G=newGame({sd}); buildTerrainColors(); G.paused=false; G.speed=0; playScene('prologue'); __bot.resolve(); __bot.actDay=null;
          const res=__bot.run(14);
          const h=hull(); const metalNodes=G.world.nodes.filter(n=>n.type==='debris'||n.type==='rock'||n.type==='crate');
          const near=metalNodes.filter(n=>dist(n.x,n.y,h.x+2.5,h.y+1.5)<20).length;
          const jobs={{}}; for(const c of awake()) jobs[c.job]=(jobs[c.job]||0)+1;
          return {{seed:{sd}, days:res.out.map(o=>[o.day,o.res.metal,o.b,o.awake,o.res.food].join(':')).join(' '), metalNodes:metalNodes.length, near, jobs, act:res.actDay, dead:G.stats.lost}}; }})()""")
        print(json.dumps(r, ensure_ascii=False))
    print('\n'.join(errs[:10]) or 'NO ERRORS')
    br.close()
