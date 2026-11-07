"""Headless 測試：手機尺寸截圖＋自動遊玩長時間模擬"""
import sys, json, time, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
OUT = os.path.join(ROOT, 'shots')
os.makedirs(OUT, exist_ok=True)
mode = sys.argv[1] if len(sys.argv) > 1 else 'shots'
days = int(sys.argv[2]) if len(sys.argv) > 2 else 20

BOT = r"""
window.__bot = {
  errs: [],
  find(type){ const d=BUILD[type]; const h=hull(); const cx=h.x+2.5, cy=h.y+1.5;
    let best=null, bd=1e9;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const dd=Math.hypot(x+d.w/2-cx,y+d.h/2-cy); if(dd<4.5||dd>bd) continue; if(!canPlace(type,x,y)){ // 留一格走道
        let ok=true; for(let yy=y-1;yy<=y+d.h;yy++)for(let xx=x-1;xx<=x+d.w;xx++){ if(bAt(xx,yy)&&!(xx>=x&&xx<x+d.w&&yy>=y&&yy<y+d.h)) ok=false; }
        if(ok){bd=dd;best=[x,y];} } }
    return best; },
  build(type){ if(!isUnlocked(type)||!canAfford(BUILD[type].cost)) return false; const p=this.find(type); if(!p) return false; const r=orderBuild(type,p[0],p[1]); return typeof r!=='string'; },
  ring(){ // 圍籬圈
    const h=hull(); const cx=Math.round(h.x+2.5), cy=Math.round(h.y+1.5); let k=0;
    for(let a=0;a<64;a++){ const t=a/64*Math.PI*2; const x=Math.round(cx+Math.cos(t)*11), y=Math.round(cy+Math.sin(t)*9);
      if(G.res.fiber<3) break; if(!canPlace('fence',x,y)&&!bAt(x,y)&&!(a%9===0)){ orderBuild('fence',x,y); k++; } }
    return k; },
  resolve(){ let n=0; while((UI.modal||UI.q.length)&&n<30){ n++; if(!UI.modal){UI.next(); continue;} const m=UI.modal;
      if(m.type==='event'){ const ch=m.ev.choices.find(c=>!c.req||c.req(G)===true); if(ch) ch.fx(G); }
      m.done(); } },
  plan: ['solar','dorm','mess','research','solar','battery','workshop','dorm','solar','greenhouse','lamp','storage','medbay','antenna','turret','turret','dorm','greenhouse','battery','biogen','lamp','turret','dorm','solar','wall'],
  techs: ['agro','lights','crystal','medic','turret','cryo','biofuel','signal','struct','hydro','solar2','ballistic','trauma','decrypt'],
  tick(){
    this.resolve();
    // 建築
    const have={}; for(const b of G.buildings) have[b.type]=(have[b.type]||0)+1;
    const need={}; for(const t of this.plan){ need[t]=(need[t]||0)+1; if((have[t]||0)<need[t]){ if(this.build(t)) {have[t]=(have[t]||0)+1;} break; } }
    if(G.tide.day && G.day>=G.tide.day-3 && G.res.fiber>10) this.ring();
    // 喚醒
    if(G.power.stored>=wakeCost()+10 && G.scan.length && bedCount()-G.colonists.filter(c=>c.bed).length>0 || G.power.stored>=wakeCost()+60 && G.scan.length){ const p=podById(G.scan[0]); if(p) { wakePod(p); this.resolve(); } }
    if(G.freeScan && !G.scan.length) { rescan(false); G.freeScan=false; }
    // 受損艙
    for(const p of G.pods) if(p.status==='sleep'&&p.dmg&&!p.repairQ&&p.left<5*DAY&&G.res.comp>=10) repairPod(p);
    // 研究
    if(!G.tech.cur) for(const t of this.techs) if(techAvailable(t)){ setResearch(t); break; }
    // 晶簇樣本
    if(G.story.done.study && !G.flags.crystalSample){ const n=G.world.nodes.find(n=>n.type==='crystal'&&explored(n.x,n.y)); if(n) n.marked=true; }
    // 工作分配：確保有人研究、種田、警戒、製造
    const crew=awake().filter(c=>!c.leader);
    const want=[['research',hasB('research')?1:0],['farm',hasB('greenhouse')?Math.ceil(crew.length/5):0],['guard',crew.length>=5?1+Math.floor(crew.length/8):0],['craft',hasB('workshop')?1:0],['medic',hasB('medbay')&&crew.length>6?1:0]];
    for(const [j,n] of want){ let cur=crew.filter(c=>c.job===j).length; for(const c of crew.slice().sort((a,b)=>b.sk[JOBS[j].skill]-a.sk[JOBS[j].skill])){ if(cur>=n) break; if(c.job===j) continue; if(crew.filter(x=>x.job===c.job).length<=1 && ['research','farm'].includes(c.job)) continue; setJob(c,j); cur++; } }
    // 遠征
    if(G.flags.located && G.tide.done && G.exp.phase==='idle'){ const team=crew.filter(c=>!c.downed&&!c.sick).sort((a,b)=>(b.sk.build+b.sk.combat+b.sk.research)-(a.sk.build+a.sk.combat+a.sk.research)).slice(0,3).map(c=>c.id); launchExpedition(team); }
    // 艦長談話
    const L=leader(); if(L&&!L.task?.cmd){ const low=crew.filter(c=>c.mood<35&&G.t-c.talkedAt>DAY)[0]; if(low) cmd(L,{kind:'talk',pid:low.id}); }
  },
  run(days){
    const out=[]; const t0=performance.now();
    const end=G.t+days*DAY;
    let lastDay=G.day;
    while(G.t<end){
      this.tick();
      for(let i=0;i<30;i++){ simAdvance(1); if(UI.modal||UI.q.length) this.resolve(); stepFX(0.05); }
      if(G.day!==lastDay){ lastDay=G.day; const crew=awake(); out.push({day:G.day, res:Object.fromEntries(Object.entries(G.res).map(([k,v])=>[k,Math.floor(v)])), pw:Math.floor(G.power.stored)+'/'+G.power.cap, gen:G.power.gen.toFixed(1), use:G.power.use.toFixed(1), awake:awakeCount(), dead:G.stats.lost, mood:Math.round(crew.reduce((s,c)=>s+c.mood,0)/crew.length), trust:Math.round(avgTrust()), done:Object.keys(G.story.done).join(','), tide:G.tide.phase+':'+G.tide.day, beasts:G.beasts.length, b:G.buildings.filter(b=>b.done).length+'/'+G.buildings.length, exp:G.exp.phase, act:G.story.act, techs:Object.keys(G.tech.done).length, downed:crew.filter(c=>c.downed).length, sick:crew.filter(c=>c.sick).length, brk:crew.filter(c=>c.brk).length}); }
      if(G.story.act>=2 && !this.actDay) this.actDay=G.day;
    }
    return {out, ms:Math.round(performance.now()-t0), actDay:this.actDay||null, logs:G.logs.slice(-40).map(l=>'D'+dayOf(l.t)+' '+l.text)};
  }
};
"""

def main():
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        if mode == 'desktop':
            ctx = br.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        else:
            ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        page.goto(URL)
        page.wait_for_timeout(1800)
        if mode in ('shots', 'desktop'):
            page.screenshot(path=f'{OUT}/01_title.png')
            page.click('text=新的殖民地')
            page.wait_for_timeout(600)
            page.click('#intro .skip')
            page.wait_for_timeout(900)
            page.screenshot(path=f'{OUT}/02_prologue.png')
            # 推進對話
            for i in range(14):
                page.mouse.click(200, 400)
                page.wait_for_timeout(120)
                page.mouse.click(200, 400)
                page.wait_for_timeout(120)
            page.wait_for_timeout(500)
            page.screenshot(path=f'{OUT}/03_start.png')
            page.evaluate(BOT)
            # 第一個太陽能板
            page.evaluate("UI.openSheet('build')")
            page.wait_for_timeout(600)
            page.screenshot(path=f'{OUT}/04_buildmenu.png')
            page.evaluate("UI.closeSheet(); UI.startBuild('solar')")
            page.wait_for_timeout(400)
            page.screenshot(path=f'{OUT}/05_place.png')
            page.evaluate("document.getElementById('bok').click()")
            page.evaluate("G.speed=3")
            page.wait_for_timeout(4000)
            page.screenshot(path=f'{OUT}/06_building.png')
            page.evaluate("__bot.run(1.2)")
            page.evaluate("__bot.resolve()")
            page.wait_for_timeout(300)
            page.evaluate("UI.openSheet('pods')")
            page.wait_for_timeout(500)
            page.screenshot(path=f'{OUT}/07_pods.png')
            page.evaluate("UI.closeSheet(); const p=podById(G.scan[0]); G.power.stored=200; UI.doWake(p)")
            page.wait_for_timeout(2600)
            page.screenshot(path=f'{OUT}/08_wake.png')
            page.evaluate("__bot.resolve(); __bot.run(2.4); __bot.resolve();")
            page.evaluate("G.t = Math.floor(G.t/DAY)*DAY + 21*60; G.day=dayOf(G.t);")
            page.wait_for_timeout(1200)
            page.screenshot(path=f'{OUT}/09_night.png')
            page.evaluate("const c=awake().find(c=>!c.leader); centerOn(c.x,c.y,1.8); UI.select({kind:'c',o:c})")
            page.wait_for_timeout(900)
            page.screenshot(path=f'{OUT}/10_colonist.png')
            page.evaluate("UI.closeSheet(); G.t = Math.floor(G.t/DAY)*DAY + DAY + 11*60; G.day=dayOf(G.t); const h=hull(); centerOn(h.x+2.5,h.y+1.5,1.0)")
            page.wait_for_timeout(1200)
            page.screenshot(path=f'{OUT}/11_day.png')
            print('\n'.join(errs[:40]) or 'NO ERRORS')
        elif mode == 'sim':
            page.click('text=新的殖民地')
            page.wait_for_timeout(400)
            page.click('#intro .skip')
            page.wait_for_timeout(500)
            page.evaluate(BOT)
            page.evaluate("__bot.resolve(); G.speed=0;")
            res = page.evaluate(f"__bot.run({days})")
            for r in res['out']:
                print(json.dumps(r, ensure_ascii=False))
            print('ms', res['ms'], 'actDay', res['actDay'])
            print('\n'.join(res['logs']))
            page.screenshot(path=f'{OUT}/sim_end.png')
            print('\n'.join(errs[:40]) or 'NO ERRORS')
        br.close()

main()
