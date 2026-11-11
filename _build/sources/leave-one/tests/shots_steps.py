#!/usr/bin/env python3
"""收藏庫截圖步驟：python3 sources/leave-one/tests/shots_steps.py > /tmp/lo_steps.json
python3 tools/shoot.py --game leave-one --out shots/leave-one --viewport land --dpr 2 --steps /tmp/lo_steps.json"""
import json

CLEAN = "UI.hintQ.length=0; UI.hintT=0; document.querySelector('#hint').classList.remove('show'); UI.hintOn=false;"
steps = [
    {"wait": 2600}, {"shot": "01"},
    {"click": "#title"}, {"wait": 2800},
    # 02：瞄準——火在燒、猛獁警覺、矛的軌跡劃過草原
    {"eval": "__lo.newHunt(4242); W.mam.x=1080; W.mam.y=W.groundAt(1080); W.mam.face=-1; W.mam.fv=-1; W.mam.state='alert'; W.mam.goal=1080;"
             "W.wind.now=2; W.wind.next=1; UI.wind(W,false); W.ignite(700,26); for (const s of W.grass) if (s.st===1){s.t=0.6;s.I=1;} W.updateFlames();"
             "setTool('spear',true); const b=__lo.findAim('spear',0,true); __lo.aimAt('spear',b.a,b.p); " + CLEAN},
    {"wait": 2600}, {"eval": CLEAN}, {"shot": "02"},
    # 03：順風的火追著猛獁跑
    {"eval": "__lo.newHunt(777); W.wind.now=3; W.wind.next=3; UI.wind(W,false); W.mam.x=1180; W.mam.y=W.groundAt(1180); W.mam.face=1; W.mam.fv=1;"
             "W.ignite(930,40); for (const s of W.grass) if (s.st===1){s.t=0.5;s.I=1;} W.updateFlames(); S.phase='world'; S.worldT=-99; UI.busy(true); " + CLEAN},
    {"wait": 1500}, {"eval": CLEAN}, {"shot": "03"},
    # 04：掉進冰湖
    {"eval": "__lo.newHunt(31337); W.wind.now=3; W.wind.next=2; UI.wind(W,false); const m=W.mam; m.x=1520; m.y=W.groundAt(1520); m.face=1; m.fv=1;"
             "W.startFlee(1); m.iceRun=true; m.vx=300; W.ignite(1290,40); for (const s of W.grass) if (s.st===1){s.t=0.5;s.I=1;} W.updateFlames(); S.phase='world'; S.worldT=-99; UI.busy(true); " + CLEAN},
    {"wait": 2300}, {"eval": CLEAN}, {"shot": "04"},
    # 05：扎矛放血＋火牆擋住衝鋒
    {"eval": "__lo.newHunt(9090); const m=W.mam; m.x=760; m.y=W.groundAt(760); m.face=-1; m.fv=-1; m.state='balk'; m.st=0.2; m.rear=1; m.rage=1; m.trumpT=1.2; m.hp=46;"
             "m.spears.push({lx:40,ly:150,la:-2.2,z:'body'},{lx:-60,ly:200,la:-2.0,z:'body'}); m.wounds.push({lx:40,ly:150,t:3},{lx:-60,ly:200,t:3});"
             "W.tools.spear=1; W.tools.fire=1; UI.tools(W); W.wind.now=-1; W.wind.next=-2; UI.wind(W,false); W.ignite(560,40); for (const s of W.grass) if (s.st===1){s.t=0.5;s.I=1;} W.updateFlames();"
             "setTool('fire',true); " + CLEAN},
    {"wait": 1800}, {"eval": CLEAN}, {"shot": "05"},
    # 06：結局的壁畫與收穫
    {"eval": "__lo.newHunt(2468); const m=W.mam; m.x=900; m.y=W.groundAt(900); m.face=-1; m.fv=-1; m.spears.push({lx:52,ly:140,la:-2.3,z:'vital'},{lx:-30,ly:190,la:-2.1,z:'body'}); m.wounds.push({lx:52,ly:140,t:5},{lx:-30,ly:190,t:5});"
             "W.stats.hits=2; W.stats.vitals=1; W.stats.spears=2; W.stats.torches=1; W.stats.turns=5; W.stats.burnDmg=8; W.tools.spear=1; W.killMammoth('spear'); S.phase='world'; " + CLEAN},
    {"wait": 6500}, {"shot": "06"},
]
print(json.dumps(steps, ensure_ascii=False))
