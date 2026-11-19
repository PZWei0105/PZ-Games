import math, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
# 在 src/ 裡跑；先 npm i @fontsource/bebas-neue @fontsource/permanent-marker @fontsource/rubik-wet-paint
D=Path(__file__).resolve().parent; F=D/'node_modules/@fontsource'
CSS=f"""
@font-face{{font-family:'Bebas Neue';src:url('file://{F}/bebas-neue/files/bebas-neue-latin-400-normal.woff2')}}
@font-face{{font-family:'Permanent Marker';src:url('file://{F}/permanent-marker/files/permanent-marker-latin-400-normal.woff2')}}
@font-face{{font-family:'Rubik Wet Paint';src:url('file://{F}/rubik-wet-paint/files/rubik-wet-paint-latin-400-normal.woff2')}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#FFE600;overflow:hidden}}
#s{{position:relative;overflow:hidden;background:#FFE600;color:#111;font-family:'Noto Sans CJK TC',sans-serif}}
.abs{{position:absolute}}
.ht{{position:absolute;inset:0;background-image:radial-gradient(#00000024 24%,transparent 26%);background-size:24px 24px}}
.cv{{position:absolute;left:0;top:0;pointer-events:none}}
.ttl{{font-weight:900;line-height:1;color:#111;paint-order:stroke fill;white-space:nowrap}}
.tape{{position:absolute;background:#111;color:#FFE600;font-weight:900;white-space:nowrap;overflow:hidden;letter-spacing:.15em}}
.tape.pk{{background:#FF2E88;color:#111}}
.drip{{position:absolute;background:#111;border-radius:0 0 999px 999px}}
.drip.p{{background:#FF2E88}}
.stk{{position:absolute;border-radius:50%;background:#FF2E88;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Rubik Wet Paint';line-height:1;border-style:solid;border-color:#111}}
.hand{{font-family:'Permanent Marker';color:#111}}
.chr{{position:absolute;filter:drop-shadow(var(--sh) var(--sh) 0 #FF2E88)}}
"""
def ttl_style(fs):
    st=fs*0.035; sh=fs*0.022
    shadow=','.join(f'{sh*i:.1f}px {sh*i:.1f}px 0 #FF2E88' for i in range(1,5))+f',{sh*5.2:.1f}px {sh*5.2:.1f}px 0 #111'
    return f"font-size:{fs}px;-webkit-text-stroke:{st:.1f}px #fff;text-shadow:{shadow}"
def rays(cx,cy,R,col='#111',op=.12,n=28,rot=0):
    s=''
    for i in range(n):
        a1=i/n*2*math.pi+rot; a2=a1+math.pi/n
        s+=f'<polygon points="{cx},{cy} {cx+math.cos(a1)*R:.0f},{cy+math.sin(a1)*R:.0f} {cx+math.cos(a2)*R:.0f},{cy+math.sin(a2)*R:.0f}" fill="{col}"/>'
    return f'<svg class="abs" style="left:0;top:0;opacity:{op}" width="100%" height="100%">{s}</svg>'
def crown(x,y,w,rot=0,sw=14):
    h=w*200/380
    return f'''<svg class="abs" style="left:{x}px;top:{y}px;transform:rotate({rot}deg)" width="{w}" height="{h:.0f}" viewBox="-20 -20 420 240"><path d="M30 170 L20 50 L110 120 L190 20 L270 120 L360 50 L350 170 Z" fill="none" stroke="#111" stroke-width="{sw}" stroke-linejoin="round"/><circle cx="20" cy="40" r="16" fill="#FF2E88" stroke="#111" stroke-width="5"/><circle cx="190" cy="10" r="16" fill="#FF2E88" stroke="#111" stroke-width="5"/><circle cx="360" cy="40" r="16" fill="#FF2E88" stroke="#111" stroke-width="5"/></svg>'''
def chars(t): return t
SPLAT_JS="""
function rnd(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}}
function blob(c,R,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,7);c.fill();
 for(let i=0;i<14;i++){const a=R()*7,d=r*(.8+R()*1.1),rr=r*(.08+R()*.22);c.beginPath();c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,rr,0,7);c.fill();}
 for(let i=0;i<3;i++){const dx=(R()-.5)*r*1.2;c.fillRect(x+dx-r*.07,y,r*.14,r*(.8+R()*1.6));}}
function spray(c,R,x,y,r,col,n){c.fillStyle=col;for(let i=0;i<n;i++){const a=R()*7,d=Math.pow(R(),.6)*r;c.globalAlpha=.5+R()*.5;c.fillRect(x+Math.cos(a)*d,y+Math.sin(a)*d,2+R()*5,2+R()*5);}c.globalAlpha=1}
function paint(list,seed){const cv=document.querySelector('.cv'),c=cv.getContext('2d'),R=rnd(seed);
 for(const p of list){ if(p[0]=='b')blob(c,R,p[1],p[2],p[3],p[4]); else spray(c,R,p[1],p[2],p[3],p[4],p[5]); }}
"""
def page(w,h,body,splats=None,seed=7):
    js=f'<script>{SPLAT_JS}paint({splats or []},{seed});</script>'
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div id="s" style="width:{w}px;height:{h}px">{body}</div>{js}</body></html>'
STK=f'file://{D}/sticker.png'

def avatarB():
    W=1024
    body=f'''<div class="ht"></div>{rays(512,470,1000,op=.13)}<canvas class="cv" width="{W}" height="{W}"></canvas>
    <img class="chr" src="{STK}" style="--sh:16px;left:92px;top:96px;width:850px;transform:rotate(-4deg)">
    {crown(470,52,210,10,16)}'''
    sp=[['b',250,300,60,'#FF2E88'],['b',830,720,48,'#111'],['s',800,250,90,'#FF2E88',900],['s',200,780,90,'#111',600],['b',760,170,22,'#111']]
    return page(W,W,body,sp,11)

def avatarA():
    W=1024
    body=f'''<div class="ht"></div>{rays(512,512,1000,op=.13)}<canvas class="cv" width="{W}" height="{W}"></canvas>
    {crown(330,120,360,-6,16)}
    <div class="abs ttl" style="left:0;right:0;text-align:center;top:250px;{ttl_style(560)}">狂</div>
    <div class="drip" style="left:330px;top:745px;width:30px;height:110px"></div><div class="drip p" style="left:560px;top:750px;width:30px;height:150px"></div><div class="drip" style="left:690px;top:745px;width:24px;height:80px"></div>'''
    sp=[['b',235,330,52,'#FF2E88'],['b',800,690,46,'#111'],['s',820,280,90,'#FF2E88',800],['s',230,760,80,'#111',500]]
    return page(W,W,body,sp,5)

def tagline(fs): return f'<span style="background:#111;color:#FFE600;padding:.12em .5em .16em;box-shadow:.12em .12em 0 #FF2E88;font-weight:900;font-size:{fs}px;letter-spacing:.08em">好遊戲不錯過・雷遊戲不踩過</span>'
def marquee(t,n=8): return (t+'　')*n

def banner():
    W,H=2560,1440
    # 手機安全區 x 507–2053, y 508–931
    body=f'''<div class="ht"></div>{rays(1530,720,2600,op=.11,n=34)}<canvas class="cv" width="{W}" height="{H}"></canvas>
    <div class="tape" style="left:-200px;right:-200px;top:270px;height:118px;font-size:66px;line-height:118px;transform:rotate(-4deg)">{marquee('GAME RHAPSODY ★ 遊戲狂想曲 ★')}</div>
    <div class="tape pk" style="left:-200px;right:-200px;top:1070px;height:118px;font-size:66px;line-height:118px;transform:rotate(3deg)">{marquee('遊戲狂想曲 ✦ GAME RHAPSODY ✦',9)}</div>
    <img class="chr" src="{STK}" style="--sh:12px;left:520px;top:492px;width:470px;transform:rotate(-5deg)">
    {crown(1600,505,170,12,16)}
    <div class="abs ttl" style="left:1040px;top:560px;{ttl_style(196)}">遊戲狂想曲</div>
    <div class="drip" style="left:1150px;top:752px;width:18px;height:70px"></div><div class="drip p" style="left:1420px;top:756px;width:18px;height:96px"></div><div class="drip" style="left:1820px;top:752px;width:16px;height:56px"></div>
    <div class="abs" style="left:1046px;top:830px;transform:rotate(-2deg)">{tagline(52)}</div>
    <div class="stk" style="left:2130px;top:560px;width:260px;height:260px;font-size:52px;border-width:9px;box-shadow:11px 11px 0 #111;transform:rotate(12deg)">GAME<br>RHAPSODY</div>
    <div class="abs hand" style="left:150px;top:600px;font-size:60px;line-height:1.15;transform:rotate(-8deg)">PC · PS5<br>&nbsp;· SWITCH</div>'''
    sp=[['b',400,520,70,'#FF2E88'],['b',2300,960,60,'#111'],['b',980,980,40,'#FF2E88'],['s',2000,500,120,'#FF2E88',1400],['s',300,950,120,'#111',900],['b',1980,880,30,'#111'],['s',1500,1010,90,'#FF2E88',700]]
    return page(W,H,body,sp,21)

def cover():
    W,H=1640,856
    # 安全區 x 59–1581, y 116–740；左下角留給大頭貼
    body=f'''<div class="ht"></div>{rays(820,428,1800,op=.11,n=30)}<canvas class="cv" width="{W}" height="{H}"></canvas>
    <div class="tape" style="left:-150px;right:-150px;top:40px;height:88px;font-size:48px;line-height:88px;transform:rotate(-3deg)">{marquee('GAME RHAPSODY ★ 遊戲狂想曲 ★')}</div>
    <div class="tape pk" style="left:-150px;right:-150px;top:760px;height:88px;font-size:48px;line-height:88px;transform:rotate(2.5deg)">{marquee('遊戲狂想曲 ✦ GAME RHAPSODY ✦',9)}</div>
    <img class="chr" src="{STK}" style="--sh:12px;left:1060px;top:150px;width:520px;transform:rotate(5deg)">
    {crown(700,190,150,-8,16)}
    <div class="abs ttl" style="left:150px;top:300px;{ttl_style(168)}">遊戲狂想曲</div>
    <div class="drip" style="left:240px;top:466px;width:16px;height:60px"></div><div class="drip p" style="left:520px;top:470px;width:16px;height:84px"></div><div class="drip" style="left:820px;top:466px;width:14px;height:48px"></div>
    <div class="abs" style="left:420px;top:560px;transform:rotate(-2deg)">{tagline(42)}</div>
    <div class="abs hand" style="left:160px;top:190px;font-size:52px;transform:rotate(-6deg)">PC・PS5・Switch</div>'''
    sp=[['b',120,250,46,'#FF2E88'],['b',1000,640,40,'#111'],['s',950,200,100,'#FF2E88',900],['s',1500,690,90,'#111',600]]
    return page(W,H,body,sp,33)

jobs={'avatar_A':(avatarA,1024,1024,2),'avatar_B':(avatarB,1024,1024,2),'banner':(banner,2560,1440,1),'cover':(cover,1640,856,2)}
sel=sys.argv[1:] or list(jobs)
with sync_playwright() as p:
    b=p.chromium.launch()
    for k in sel:
        fn,w,h,dsf=jobs[k]
        (D/f'{k}.html').write_text(fn())
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=dsf)
        pg.goto(f'file://{D}/{k}.html'); pg.wait_for_timeout(500); pg.evaluate('document.fonts.ready')
        pg.locator('#s').screenshot(path=str(D/f'out_{k}.png')); pg.close(); print('ok',k)
    b.close()
