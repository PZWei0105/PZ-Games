"""劇情節點截圖：施工、潮夜、潮母、事件、結局"""
import os, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
OUT = os.path.join(ROOT, 'shots')
BOT = open(os.path.join(os.path.dirname(__file__), 'run.py'), encoding='utf-8').read().split('BOT = r"""')[1].split('"""')[0]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_timeout(1500)
    page.click('text=新的殖民地'); page.wait_for_timeout(300); page.click('#intro .skip'); page.wait_for_timeout(400)
    page.evaluate(BOT); page.evaluate("__bot.resolve(); G.speed=0;")
    # 施工中
    page.evaluate("G.res.metal=200;G.res.comp=50;G.res.fiber=80; __bot.build('solar'); __bot.build('dorm'); for(let i=0;i<600;i++){simAdvance(0.25); if(G.buildings.some(b=>!b.done&&b.prog>0.45)) break;} const b=G.buildings.find(b=>!b.done)||hull(); centerOn(b.x+1,b.y+1,1.6); G.speed=0;")
    page.wait_for_timeout(700); page.screenshot(path=f'{OUT}/20_construct.png')
    # 跑到潮夜
    page.evaluate("__bot.run(1); __bot.resolve(); scheduleTide(G.day+1); __bot.run(0.4); while(!(G.tide.phase==='active')) { __bot.tick(); simAdvance(5); __bot.resolve(); } for(let i=0;i<150;i++){ simAdvance(1); __bot.resolve(); } const h=hull(); centerOn(h.x+2.5,h.y+1.5,0.95); G.speed=1;")
    page.wait_for_timeout(1500); page.screenshot(path=f'{OUT}/21_tide.png')
    page.evaluate("for(let i=0;i<260;i++){ simAdvance(1); __bot.resolve(); if(G.beasts.some(b=>b.type==='mother'&&!b.dead&&dist(b.x,b.y,hull().x+2.5,hull().y+1.5)<9)) break; } const m=G.beasts.find(b=>b.type==='mother'); if(m) centerOn(m.x,m.y,1.1);")
    page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/22_boss.png')
    page.evaluate("setBlackout(true)"); page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/23_blackout.png')
    # 事件卡
    page.evaluate("setBlackout(false); for(let i=0;i<800;i++){ simAdvance(1); __bot.resolve(); if(G.tide.phase!=='active') break; } __bot.resolve(); fireEvent(EVENTS.find(e=>e.id==='council'));")
    page.wait_for_timeout(800); page.screenshot(path=f'{OUT}/24_event.png')
    # 結局
    page.evaluate("__bot.resolve(); G.flags.decrypted='ai'; G.story.finale=0; actEnd();")
    page.wait_for_timeout(900); page.screenshot(path=f'{OUT}/25_act.png')
    print('\n'.join(errs[:20]) or 'NO ERRORS')
    br.close()
