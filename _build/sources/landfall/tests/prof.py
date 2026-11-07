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
    page.evaluate(BOT); page.evaluate("__bot.resolve(); G.speed=0; __bot.run(9); __bot.resolve(); G.t=Math.floor(G.t/DAY)*DAY+22*60; CAM.tz=CAM.z=0.5; const h=hull(); centerOn(h.x+2.5,h.y+1.5);")
    r = page.evaluate("""(()=>{
      const T={}; const tm=(k,f)=>{const a=performance.now(); f(); T[k]=(T[k]||[]); T[k].push(performance.now()-a);};
      const dark=darkness();
      for(let i=0;i<30;i++){
        ctx.setTransform(CAM.dpr,0,0,CAM.dpr,0,0); LIGHTS.length=0; GLOWPTS.length=0;
        tm('sky',()=>drawSky(dark)); tm('plateau',()=>drawPlateau()); tm('terrain',()=>drawTerrain(dark)); tm('fog',()=>drawFog());
        tm('nodes',()=>{ for(const n of G.world.nodes) if(G.world.fog[idx(n.x,n.y)]) drawNode(n,dark); });
        tm('build',()=>{ for(const b of G.buildings) drawBuilding(b,dark); });
        tm('cols',()=>{ for(const c of G.colonists) if(!c.dead&&!c.hidden&&!c.away) drawColonist(c,dark); });
        tm('light',()=>drawLighting(dark));
        tm('glows',()=>{ ctx.globalCompositeOperation='lighter'; for(let i=0;i<GLOWPTS.length;i+=5) glow(GLOWPTS[i],GLOWPTS[i+1],GLOWPTS[i+2],GLOWPTS[i+3],GLOWPTS[i+4]); ctx.globalCompositeOperation='source-over'; });
      }
      const o={}; for(const k in T){ const a=T[k].sort((x,y)=>x-y); o[k]=[a[15].toFixed(1), a[27].toFixed(1), a[29].toFixed(1)]; } o.glowpts=GLOWPTS.length/5; o.lights=LIGHTS.length; return o; })()""")
    for k,v in r.items(): print(k, v)
    br.close()
