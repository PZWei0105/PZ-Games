/* ===== 像素美術：模板編譯、道具繪製、圖示、數字字型 ===== */
const ART = {"tpl":{"walker":{"top":[".....HHH.....","....HhhhH....","...Hhhhhhs...","...Hhhssss...","...Hsseses...","....sssssS...","....SsmmS....",".....SsS.....","...tttttttsss","..Tttttttttss","..Ttrtttt....","..TttttrT....","..TtttttT...."],"a":["...PpppP.....","...pp.pp.....","..pp...pp....","..pP...pP....",".bb.....bb..."],"b":["...PpppP.....","...pp.pp.....","...pp.pp.....","...pP.pP.....","..bb..bb....."]},"runner":{"top":["......HHH....",".....HhhhH...","....Hhhhhhs..","....Hhhsses..","....HsssssS..",".....SsmS....","....tttt.....","...tTtttts...","..sTttttts...","..s.TtttT....","....TttT....."],"a":["....PppP.....","...pp..pp....","..pp....pp...",".pP......pP..","bb........bb."],"b":["....PppP.....","....pppp.....","....pp.pp....","...pP..pP....","..bb..bb....."]},"brute":{"top":["......HHHH......",".....HhhhhH.....",".....Hsesess....",".....SssmmsS....","....ttSsssStt...","..tttttttttttt..",".tTttttttttttsss",".TTtttttrttttsss","sTTttttttttttt..","ssTttttttttttT..",".sTtttrttttttT..","..TTttttttttTT..","..TTtttttrttTT..","...TTttttttTT...","...PPppppppPP..."],"a":["...ppp....ppp...","..ppp......ppp..","..pPP......pPP..",".bbbb......bbbb."],"b":["....ppp..ppp....","....ppp..ppp....","....pPP..pPP....","...bbbb.bbbb...."]},"bloater":{"top":[".....HHH......","....HhhhH.....","....Hsesss....","....SsmmsS....","...gtSsStg....","..tgttgtttgs..",".tgggtttgggss.",".ttgtttGtgtss.",".tttGgtttttt..",".tgttttgGtgt..","..ttgggtttt...","..tttGtttgt...","...PPppppP...."],"a":["...pp...pp....","...pP...pP....","..bb....bb...."],"b":["....pp.pp.....","....pP.pP.....","...bb.bb......"]},"spitter":{"top":[".....HHH.....","....HhhhH....","....Hsesgs...","....SssgGg...",".....SsGS....",".....SsS.....","....tttt.....","...tTtttt....","...sTtttts...","...sTtrtTs...","....TtttT...."],"a":["....PppP.....","....pp.pp....","...pp...pp...","...pP...pP...","..bb.....bb.."],"b":["....PppP.....","....pp.pp....","....pp.pp....","....pP.pP....","...bb..bb...."]},"riot":{"top":["....xxxxx....","...xXxxxxx...","...xXllllx...","...xXlelex...","...xXsssSx...","....SsmS.....","...ttttt.ggg.","..TtttttsgGg.","..TtttttsgGg.","..TttlttsgGg.","..TttttttgGg.","..TtttttTgGg.","...PpppP.ggg."],"a":["...pp.pp.....","..pp...pp....","..pP...pP....",".bb.....bb..."],"b":["...pp.pp.....","...pp.pp.....","...pP.pP.....","..bb..bb....."]},"player":{"top":["......xxxxx...",".....xxwxxxx..","....xxwxxxxxx.","....xxxxxxxxx.","....xxsseses..","....xxssssss..",".....xSsssS...","yyyyy.jSSj....","yYWYyjjjjjjs..","yYYYyjljjjjs..","yYYYyjljjjj...","yYYYyjjjjjj...","yyyyyjjjjjj..."],"a":[".....ppppp....",".....pp.pp....","....pp...pp...","....pP...pP...","...bb.....bb.."],"b":[".....ppppp....",".....pp.pp....",".....pp.pp....",".....pP.pP....","....bb..bb...."]},"ally":{"top":["....hhhh....","...hhhhhh...","..hhhhhhhh..",".hhhsssssh..",".h.hsesesh..","....sssss...",".....SsS....","...ttttttt..","..tTttttttt.","..sTtwtttts.","...Tttttt...","...Tttttt..."],"a":["...PppppP...","...pp..pp...","..pp....pp..","..pP....pP..",".bb......bb."],"b":["...PppppP...","...pp..pp...","...pp..pp...","...pP..pP...","..bb....bb.."]},"riotboss":{"top":[".......xxxxxx.......","......xXxxxxxx......",".....xXxxxxxxxx.....",".....xXllllllxx.....",".....xXlellelx......",".....xXllllllx......","......SsmmmsS.......","....aaaSsssSaa.gggg.","...aAAaaaaaaaAagGGGg","..aAAaaaaaaaaaagGwGg","..aAaaacccccaaagGGGg","..aAaaacCCCcaaagGGGg","..aAaaacccccaaagGGGg","..sAaaaaaaaaaaagGGGg","..ssaaaaaaaaaa.gGGGg","...aaaaarraaaa.gGGGg","...AAaaaaaaaAA.gGGGg","....PPPppppPPP.gGGGg"],"a":["....pppp..pppp.gGGGg","....pppp..pppp..gggg","...ppPp....pPpp.....","...pPPp....pPPp.....","..bbbbb....bbbbb...."],"b":["....pppp..pppp.gGGGg",".....ppp..ppp...gggg",".....pPp..pPp.......",".....pPp..pPp.......","....bbbb..bbbb......"]},"abiao":{"top":["........HHHHH.........",".......HhhhhhH........",".......Hseseess.......",".......SsssmmsS.......",".....tttSssssSttt.....","...tttttttttttttttt...","..tttkttttttttttkttt..",".tttkkttttttttttkktts.",".ttttttttrrtttttttttss","sstttttttttttttttttss.","sstTtttttttttttttTtcc.",".sTTtttttttrtttttTTc..","..TTtttttttttttttTTc..","..TTTtttttttttttTTTcc.","...TTTPPPPPPPPPTTT..c."],"a":[".....PPppppppppPP...c.",".....pppp....pppp..cc.","....pppp......pppp.c..","....pPPp......pPPp.cc.","...bbbbb......bbbbb.c."],"b":[".....PPppppppppPP...c.","......pppp..pppp...cc.","......pppp..pppp...c..","......pPPp..pPPp..cc..",".....bbbbb.bbbbb..c..."]},"bed7":{"top":["........HHHH..........",".......HhhhhH.........","......Hsssessv........","......SsvssesS........","......SsmmmmsS........",".......SmmmmS.........",".....gggSssSggg.......","...ggggGgggggggggi....","..ggttgggggggGgggi....",".gttttggggGggggggi....",".gtvttgggggggggggtt...","ttttvtgggrggggGgggttt.","tttttggggggggggggttvt.",".ttttgggggGggggggtttt.","..tt.ggggggggrgggg.tt.",".....gGgggggggggGg....",".....ggggggggggggg...."],"a":["......tttt....tttt....","......tvtt....tttv....",".....tttt......tttt...",".....ttt........ttt..."],"b":[".......tttt..tttt.....",".......tvtt..tttv.....",".......tttt..tttt.....","......ttt....ttt......"]},"giant":{"top":["..........HHHH..........",".........HhhhhH.........",".........Hsesess........",".........SsmmmsS........",".......fffSsssSfff......",".....fffFffffffFffff....","...ttfFffffFffffffFftt..","..tttfffFffffffFffffttt.",".tttffFffffffFffffFffttt",".tttfffffFffffffFfffttt.","tttt.fFfffffFffffff.tttt","tttt.ffffFffffffFff.tttt",".ttt.fffffffrfffff..ttt.",".ss..ffFffffffFfff...ss.",".....fffffffffffff......"],"a":["......ppppppppppp.......","......ppppp.ppppp.......",".....ppppp...ppppp......",".....pPPpp...pPPpp......","....bbbbbb...bbbbbb....."],"b":["......ppppppppppp.......",".......pppp.pppp........",".......pppp.pppp........",".......pPPp.pPPp........","......bbbbb.bbbbb......."]},"captain":{"top":[".........kkkkkkkk.........","........kkoookkkkk........","........kkkkkkkkkkk.......",".........HsseseshH........",".........SsssmmmsS........","..........SnmmmmS.........","......cccaaSsssSaaa.......","....ccaaaaaaaoaaaaaaa.....","...ccaaaAaaaaaaaaAaaaa....","..ccaaaaAaaaaoaaaAaaaaa...","..cttaaaAaaaaaaaaAaaaatt..",".cttnaaaaaaaaoaaaaaaaantt.",".cttt.aaaaaaaaaaaaaaa.tttw","ccttt.aaaAaaaaaaaAaaa.ttww","cc.ss.aaaaaaaaaaaaaaa..ss.","c.....aaaaaaaaaaaaaaa.....","cc....aaaAaaaaaaaAaaa....."],"a":[".cc....ppppppppppppp......","..cc...ppppp...ppppp......","...cc.ppppp.....ppppp.....","....c.pPPpp.....pPPpp.....",".....bbbbbb.....bbbbbb...."],"b":[".cc....ppppppppppppp......","..cc....ppppp.ppppp.......","...cc...ppppp.ppppp.......","....cc..pPPpp.pPPpp.......",".....c.bbbbbb.bbbbbb......"]}},"pal":{"zbase":{"s":"#9fae8f","S":"#76856a","e":"#f4f1a6","m":"#5a0f12","r":"#7d1717","b":"#121212"},"z_office":{"h":"#2a2420","H":"#171310","t":"#d8d3c6","T":"#a39d8e","p":"#2a2f3d","P":"#1a1e28"},"z_casual":{"h":"#3a2a1e","H":"#241a12","t":"#b33a3a","T":"#7f2525","p":"#3d5a80","P":"#2a3f5c"},"z_elder":{"h":"#b8b8b0","H":"#8a8a84","t":"#7a6a52","T":"#5a4d3a","p":"#4a4a4a","P":"#333333"},"z_police":{"h":"#1d1d1d","H":"#0f0f0f","t":"#2b3a58","T":"#1a2338","p":"#1f2a40","P":"#141c2c"},"z_vendor":{"h":"#1e1a18","H":"#0f0d0c","t":"#e7e1d2","T":"#b9b2a0","p":"#3b3b3b","P":"#262626"},"z_gang":{"h":"#111111","H":"#050505","t":"#1d1d1d","T":"#0e0e0e","p":"#6b5b45","P":"#4a3f30"},"z_nurse":{"h":"#1a1616","H":"#0c0a0a","t":"#86b7d6","T":"#5e8fae","p":"#86b7d6","P":"#5e8fae","b":"#e6e6e6"},"z_patient":{"h":"#4a4038","H":"#2e2822","t":"#c9d8e0","T":"#98aeba","p":"#c9d8e0","P":"#98aeba","b":"#8f9d80"},"z_doctor":{"h":"#6a6a66","H":"#4a4a46","t":"#ecebe6","T":"#bdbcb4","p":"#39465a","P":"#26303f"},"z_rain":{"h":"#2a2420","H":"#171310","t":"#e3c01c","T":"#b39510","p":"#e3c01c","P":"#b39510"},"z_worker":{"h":"#262626","H":"#141414","t":"#ff7a1a","T":"#c85a0e","p":"#2e4a7a","P":"#1f3558"},"z_soldier":{"h":"#1a1a1a","H":"#0c0c0c","t":"#56603f","T":"#3f4730","p":"#56603f","P":"#3f4730","b":"#2b2418"},"z_sailor":{"h":"#2b2b2b","H":"#161616","t":"#e0621a","T":"#a8470f","p":"#e0621a","P":"#a8470f","b":"#262626"},"z_jogger":{"h":"#1a1a1a","H":"#0a0a0a","t":"#3a3a44","T":"#24242c","p":"#707070","P":"#4c4c4c","s":"#b39c8a","S":"#8a7564","e":"#ff5a3a"},"z_brute":{"h":"#1f1f1f","H":"#0f0f0f","t":"#6b5b4b","T":"#4a3f34","p":"#303848","P":"#1f2530","s":"#95a386","S":"#6c7a5e"},"z_bloater":{"h":"#3a3a2a","H":"#22221a","t":"#b8b57c","T":"#8c8a58","g":"#a8e25c","G":"#5f8d2c","p":"#4a4a4a","P":"#333333","s":"#b8b57c","S":"#8c8a58"},"z_spitter":{"h":"#2a2a2a","H":"#151515","t":"#5d6a4a","T":"#414b33","g":"#a3e84e","G":"#5f9a22","p":"#3a3a3a","P":"#262626"},"z_riot":{"x":"#1f2533","X":"#3d4a63","l":"#2d3a4f","t":"#1f2a40","T":"#141c2c","g":"#3a3f48","G":"#7f98ae","p":"#1a2233","P":"#111827"},"player":{"x":"#263246","X":"#3a4a63","w":"#8fa6c2","s":"#e2a57b","S":"#b87b56","e":"#1a1414","y":"#f0a030","Y":"#b8741c","W":"#ffd48a","j":"#2c2f36","l":"#dfe7ee","p":"#27324a","P":"#1a2234","b":"#161616"},"ally":{"h":"#15110f","s":"#ecb592","S":"#c38c6c","e":"#1a1414","t":"#8cc3e0","T":"#5f95b4","w":"#ffffff","p":"#8cc3e0","P":"#5f95b4","b":"#f0f0f0"},"riotboss":{"x":"#1b212e","X":"#3a4660","l":"#1e2a3b","e":"#ffd54a","s":"#9fae8f","S":"#76856a","m":"#5a0f12","a":"#243452","A":"#141d2e","c":"#2d3d5a","C":"#51648a","g":"#2e333c","G":"#8298ad","w":"#c7d9e8","r":"#7d1717","p":"#1f2a40","P":"#141c2c","b":"#0f0f0f"},"abiao":{"H":"#0f0f0f","h":"#1d1d1d","s":"#96a88a","S":"#6d7f63","e":"#fff27a","m":"#4a0c0c","t":"#96a88a","T":"#6d7f63","k":"#2c5652","r":"#7d1717","P":"#27272a","p":"#3a3a3f","b":"#111111","c":"#a3a9b1"},"bed7":{"H":"#2e2a26","h":"#4a4038","s":"#b9a8b8","S":"#8d7a8c","v":"#5b3a63","e":"#ffec80","m":"#3a0a14","g":"#c3d6e0","G":"#8fa9b8","t":"#b9a8b8","i":"#e8f4f8","r":"#7d1717"},"giant":{"H":"#141414","h":"#2b2b2b","s":"#8e9c7e","S":"#66735a","e":"#ffe36a","m":"#4a0c0c","f":"#a83232","F":"#5e1a1a","t":"#8e9c7e","r":"#7d1717","p":"#34507a","P":"#22385a","b":"#1a1a1a"},"captain":{"k":"#141b2b","o":"#d4a73a","H":"#1c1c1c","h":"#333333","s":"#7f9aa0","S":"#5d7479","e":"#d9ff7a","m":"#1f0d12","n":"#b7b0a0","a":"#1c2a44","A":"#101a2c","c":"#8c929a","t":"#7f9aa0","w":"#3f6a3a","p":"#1c2a44","P":"#101a2c","b":"#0d0d0d"}},"portrait":{"ziwei":{"pal":{"x":"#263246","X":"#3a4a63","v":"#0f1620","h":"#15110f","k":"#15110f","s":"#e2a57b","S":"#b87b56","e":"#1a1212","b":"#c28b67","m":"#7a3b32","j":"#2c2f36","l":"#dfe7ee"},"rows":["....xxxxxxxx....","...xXXXXXXXXx...","..xXvvvvvvvvXx..","..xxxxxxxxxxxx..","..xxhhhhhhhhxx..","..xxkksssskkxx..","..xxsssssssssx..","..xxseessseesx..","..xxsssssssssx..","...xssssSssssx..","....ssbbbbbss...","....sbbmmmbbs...",".....sbbbbbs....","...jjjSsssSjjj..","..jljjjjjjjjljj.",".jjljjjjjjjjjljj"]},"ziqing":{"pal":{"h":"#15110f","s":"#efbb98","S":"#c9906f","k":"#15110f","e":"#1a1212","m":"#b8545a","t":"#8cc3e0","w":"#ffffff"},"rows":["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhhhhhhhhhhh..","..hhhssssssshh..","..hhskksskkshh..","..hhssssssssh...","..hhseessseesh..","..hhssssssssh...","..hh.ssssSsss...","..hh..sssssss...","..h...ssmmss....","......ssssss....","....ttSSsSSttt..","...ttttwttttttt.","..tttttttttttttt"]},"akun":{"pal":{"c":"#23466e","C":"#16304e","o":"#e0b84a","h":"#b9b6ae","k":"#8a8780","s":"#d69c74","S":"#a8704f","e":"#1a1212","m":"#6e3a2e","t":"#2f5d8c","w":"#e0b84a"},"rows":["....cccccccc....","...cCCCCCCCCc...","..cccccoocccccc.","..CCCCCCCCCCCC..","...hhssssssshh..","...hkksssskksh..","...hsssssssssh..","...hseessseesh..","...ssssssssssS..","....ssssSssssS..","....sSsssssSs...","....ssmmmmmss...",".....SsssssS....","...ttttSSSttttt.","..tttwtttttwtttt","..tttttttttttttt"]},"baoge":{"pal":{"s":"#c98f68","S":"#a06c4a","b":"#1a1410","k":"#1f4a48","e":"#1a1212","m":"#5a2a22","o":"#e6c14a","t":"#111111"},"rows":["................",".....ssssss.....","....sSssssss....","...sSssssssss...","...sssssssssss..","...sbbbssbbbss..","...sssssssssss..","...seeesssseees.","...sssssssssss..","....ssssSSsssS..","....sssssssssS..","....ssmmmmmsss..",".....SssssssS...","..kksssooosssss.",".kksssoostoosss.","kkkssssssssssssk"]},"hsu":{"pal":{"h":"#a8a8a2","s":"#dfa47e","S":"#b07852","b":"#6a6a66","g":"#2a2a2a","e":"#1a1212","W":"#e8f4ff","m":"#7a4034","w":"#f2f2ee","t":"#5a8fae"},"rows":["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhhssssssshh..","..hssssssssssh..","..hsbbbssbbbsh..","..sgggggsgggggs.","..sgeegsggeWgs..","..sgggggsgggggs.","...sssssSsssss..","....sssssssss...","....ssmmmmsss...",".....SssssS.....","...wwwSSSSwww...","..wwwwtttttwwww.",".wwwwwwttttwwwww"]},"lu":{"pal":{"c":"#3f4a2c","C":"#2a3220","o":"#d9b347","h":"#1a1a1a","s":"#c89370","S":"#9c6a4a","b":"#1a1410","e":"#1a1212","m":"#5c2e26","g":"#4b5635"},"rows":["....cccccccc....","...cCCCCCCCCc...","..ccccccocccccc.",".CCCCCCCCCCCCCC.","...hssssssssh...","...sbbbssbbbs...","...ssssssssss...","...seessseess...","...ssssssssss...","...sssssSssss...","....ssssssss....","....smmmmmms....",".....ssssss.....","..gggggSSgggggg.",".gggoggggggoggg.","gggggggggggggggg"]},"ama":{"pal":{"h":"#c9c6be","H":"#a09c94","s":"#d49a73","S":"#a66e4c","b":"#8a8780","e":"#1a1212","m":"#7a3b32","r":"#9b2d2d","a":"#e9e2cf"},"rows":["......hhhh......",".....hHHHHh.....","....hhhhhhhh....","...hhhhhhhhhh...","..hhhssssssshh..","..hhsssssssshh..","..hsbbssssbbsh..","..hseessseessh..","..hssssssssssh..","...sSsssSssSs...","...ssssssssss...","....ssmmmmss....",".....SssssS.....","...rrrSSSSrrr...","..rrrraaaaarrrr.",".rrrrraaaaarrrrr"]},"radio":{"pal":{"k":"#1b1f27","g":"#5b6472","G":"#8a93a3","r":"#d23a3a","y":"#ffb347","w":"#cfd6e0"},"rows":["..........k.....",".........k......","........k.......",".......k........","..kkkkkkkkkkkk..",".kggggggggggggk.",".kgwwwwwwwggggk.",".kgwyyyyywgrgGk.",".kgwwwwwwwggggk.",".kgggggggggGGgk.",".kgkgkgkgkgggGk.",".kggggggggggggk.",".kgkgkgkgkgGGgk.",".kggggggggggggk.","..kkkkkkkkkkkk..","................"]},"phone":{"pal":{"k":"#101318","g":"#2a2f38","y":"#ffb347","w":"#e8e3d8","c":"#6fd0e8"},"rows":["....kkkkkkkk....","...kggggggggk...","...kgkkkkkkgk...","...kgyyyyyygk...","...kgywwwwygk...","...kgyyyyyygk...","...kgwwwwwwgk...","...kgkkkkkkgk...","...kgwwwwkkgk...","...kgkkkkkkgk...","...kgccccccgk...","...kgkkkkkkgk...","...kgkkkkkkgk...","...kggggggggk...","...kggggkgggk...","....kkkkkkkk...."]}},"icon":{"pal":{"g":"#8b93a1","G":"#565d69","w":"#d9dee6","W":"#ffffff","b":"#8a5a32","B":"#5e3b1f","k":"#1b1d22","K":"#3a3f48","y":"#ffcf5a","Y":"#d28f1d","o":"#ff7a1a","r":"#d23a3a","x":"#2f3b52","v":"#1a2230","c":"#6fd0e8"},"pistol":["............","............",".ggggggggggg",".gwwwwwwwwgg",".ggggggggggg",".gggggGgg...","....gGGg....","....gGGg....","....gGGgg...",".....gGGg...",".....gggg...","............"],"shotgun":["............","............","............","ggggggggg...","gwwwwwwwwgbb","gggggggggbbb","......gbbbBb",".....gbbbBb.","....gbbBb...","....bbb.....","............","............"],"rifle":["............","...g........","gggggggggg..","gwwwwwwwwggg","gggggggggGGg","....ggkgGGGg","....ggk..GGg","....gg....Gg","...kk.......","..kk........","............","............"],"bat":["..........ww",".........wwW","........wwW.",".......wwW..","......wwW...",".....wwW....","....wwW.....","...wwW......","..kwW.......",".kkk........","kk..........","k..........."],"molotov":[".....oy.....","....yoo.....",".....wW.....",".....wW.....","....bBBb....","....bBBb....","...bBBBBb...","..bBBoBBBb..","..bBoooBBb..","..bBBBBBBb..","...bbbbbb...","............"],"shoe":["............","............","....ww......","....wKw.....","....wKww....","...wwKwww...","..wwwwwwwwo.",".wwwwwwwwwwo",".kkkkkkkkkkk","............","............","............"],"ammo":["............","..y...y...y.",".yYy.yYy.yYy",".yYy.yYy.yYy",".bbb.bbb.bbb",".bBb.bBb.bBb",".bBb.bBb.bBb",".bBb.bBb.bBb",".bbb.bbb.bbb","............","............","............"],"med":["............","....kkkk....","...k....k...",".wwwwwwwwww.",".wwwwcwwwww.",".wwwccccwww.",".wwwwcwwwww.",".wwwwwwwwww.",".gggggggggg.","............","............","............"],"heart":["............","..rr...rr...",".rrrr.rrrr..",".rWrrrrrrr..",".rrrrrrrrr..","..rrrrrrr...","...rrrrr....","....rrr.....",".....r......","............","............","............"],"helmet":["............","....xxxx....","...xxwxxx...","..xxwxxxxx..","..xxxxxxxx..","..xvvvvvvx..","..xx....xx..","..xx....xx..","............","............","............","............"],"bolt":["......yy....",".....yy.....","....yy......","...yyyyy....",".....yy.....","....yy......","...yy.......","..y.........","............","............","............","............"],"bullet":["............",".....yy.....","....yYYy....","....yYYy....","....bbbb....","....bBBb....","....bBBb....","....bBBb....","....bbbb....","............","............","............"],"pierce":["............","............","............","......k.....","ww.w..kw.ww.","wwwwwwkwwwwW","ww.w..kw.ww.","......k.....","............","............","............","............"],"multi":["............","..y....y....",".yYy..yYy...",".bBb..bBb...",".bBb..bBb...",".bBb..bBb...",".bbb..bbb...","............","............","............","............","............"],"crosshair":[".....r......",".....r......","...rrrrr....","..r..r..r...","rrrr.r.rrrr.","..r..r..r...","...rrrrr....",".....r......",".....r......","............","............","............"],"can":["....kk......","...gggg.....","...gwgg.....","...gwgg.....","...gyyg.....","...gyyg.....","...gwgg.....","...gggg.....","....kk......","............","............","............"],"eye":["............","............","...wwwwww...","..ww.kk.ww..",".ww.kkkk.ww.","..ww.kk.ww..","...wwwwww...","............","............","............","............","............"],"skull":["...wwwww....","..wwwwwww...",".wwkkwkkww..",".wwkkwkkww..",".wwwwkwwww..","..wwwwwww...","..w.w.w.w...","............","............","............","............","............"],"drop":[".....r......","....rrr.....","....rrr.....","...rrrrr....","..rrWrrrr...","..rrWrrrr...","..rrrrrrr...","...rrrrr....","............","............","............","............"],"box":["............","..yyyyyyyy..",".yWWWWWWWWy.",".yYYYYYYYYy.",".yYYYkkYYYy.",".yYYYYYYYYy.",".yYYYYYYYYy.",".yyyyyyyyyy.","............","............","............","............"],"fuse":["....kk......","...gwwg.....","...gyyg.....","...gyyg.....","...gyyg.....","...gwwg.....","....kk......","............","............","............","............","............"],"fire":[".....o......","....oo......","....oyo.....","...oyyo.o...","..ooyWyoo...","..oyWWWyo...","..oyWWWyo...","...oyyyo....","....ooo.....","............","............","............"],"rage":["....rr......","....rr......","....rr......","....rr......","....rr......","............","....rr......","....rr......","............","............","............","............"],"bowl":[".....k.k....",".....k.k....","....wkwkw...","...wwwwwww..","..byyyyyyyb.","..bbbbbbbbb.","...bbbbbbb..","....bbbbb...","............","............","............","............"]}};
const OUTLINE = '#0b0a10';
function hexRGB(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function paintRows(rows, pal, outline) {
  const h = rows.length; let w = 0; for (const r of rows) w = Math.max(w, r.length);
  const pad = outline === false ? 0 : 1;
  const c = mkCanvas(w + pad * 2, h + pad * 2), x = c.getContext('2d');
  const img = x.createImageData(c.width, c.height), d = img.data, W = c.width;
  const filled = new Uint8Array(c.width * c.height);
  const cache = {};
  for (let y = 0; y < h; y++) {
    const r = rows[y];
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]; if (ch === '.' || ch === ' ') continue;
      const col = pal[ch]; if (!col) continue;
      const rgb = cache[col] || (cache[col] = hexRGB(col));
      const px = i + pad, py = y + pad, k = (py * W + px) * 4;
      d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255; filled[py * W + px] = 1;
    }
  }
  if (pad) {
    const oc = hexRGB(OUTLINE);
    for (let y = 0; y < c.height; y++) for (let i = 0; i < W; i++) {
      if (filled[y * W + i]) continue;
      const n = (i > 0 && filled[y * W + i - 1]) || (i < W - 1 && filled[y * W + i + 1]) || (y > 0 && filled[(y - 1) * W + i]) || (y < c.height - 1 && filled[(y + 1) * W + i]);
      if (n) { const k = (y * W + i) * 4; d[k] = oc[0]; d[k + 1] = oc[1]; d[k + 2] = oc[2]; d[k + 3] = 255; }
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}
function flipC(c) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
function tintC(c, col, a) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a === undefined ? 1 : a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return o; }
function corpseC(c) { const o = mkCanvas(c.height, c.width), x = o.getContext('2d'); x.setTransform(0, 1, -1, 0, c.height, 0); x.drawImage(c, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(38,6,8,0.5)'; x.fillRect(0, 0, o.width, o.height); return o; }

const SPR_CACHE = {};
function charSprite(tpl, palKeys) {
  const key = tpl + '|' + palKeys.join(',');
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  const t = ART.tpl[tpl];
  const pal = Object.assign({}, ART.pal.zbase);
  for (const k of palKeys) Object.assign(pal, ART.pal[k]);
  const fr = ['a', 'b'].map(k => {
    const n = paintRows(t.top.concat(t[k]), pal);
    const wn = tintC(n, '#ffffff');
    return { n, f: flipC(n), wn, wf: flipC(wn) };
  });
  const s = { fr, w: fr[0].n.width, h: fr[0].n.height, corpse: corpseC(fr[0].n), corpseF: corpseC(fr[0].f) };
  SPR_CACHE[key] = s; return s;
}

/* 圖示與頭像 → data URL（給 DOM 用） */
const URL_CACHE = {};
function iconCanvas(name) { return paintRows(ART.icon[name], ART.icon.pal); }
function iconURL(name) { const k = 'i:' + name; if (!URL_CACHE[k]) URL_CACHE[k] = iconCanvas(name).toDataURL(); return URL_CACHE[k]; }
function portraitURL(name) {
  const k = 'p:' + name; if (URL_CACHE[k]) return URL_CACHE[k];
  const p = ART.portrait[name]; if (!p) return '';
  const c = paintRows(p.rows, p.pal, false);
  return (URL_CACHE[k] = c.toDataURL());
}

/* 3x5 像素數字（傷害數字用） */
const DIG = { '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'], '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'], '+': ['000', '010', '111', '010', '000'], '!': ['010', '010', '010', '000', '010'], 'x': ['000', '101', '010', '101', '000'], '%': ['101', '001', '010', '100', '101'] };
const DIGC = {};
function digitGlyphs(col) {
  if (DIGC[col]) return DIGC[col];
  const out = {};
  for (const ch in DIG) {
    const rows = DIG[ch]; const c = mkCanvas(5, 7), x = c.getContext('2d');
    x.fillStyle = OUTLINE;
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (rows[yy][xx] === '1') x.fillRect(xx, yy, 3, 3);
    x.fillStyle = col;
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (rows[yy][xx] === '1') x.fillRect(xx + 1, yy + 1, 1, 1);
    out[ch] = c;
  }
  return (DIGC[col] = out);
}
function drawNum(ctx, str, x, y, col, sc) {
  sc = sc || 1; const g = digitGlyphs(col); const cw = 4 * sc;
  let px = Math.round(x - (str.length * cw) / 2); const py = Math.round(y);
  for (const ch of str) { const c = g[ch]; if (c) ctx.drawImage(c, px, py, 5 * sc, 7 * sc); px += cw; }
}

/* ===== 道具繪製 ===== */
function P2(w, h, fn) { const c = mkCanvas(w, h), x = c.getContext('2d'); fn(x, w, h); return c; }
function R(x, col, a, b, w, h) { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); }
function dots(x, a, b, w, h, cols, dens, rnd) { rnd = rnd || Math.random; const n = (w * h * dens) | 0; for (let i = 0; i < n; i++) { x.fillStyle = cols[(rnd() * cols.length) | 0]; x.fillRect(a + ((rnd() * w) | 0), b + ((rnd() * h) | 0), 1, 1); } }
function shade(c, col) { return c; }
function shadowOval(x, cx, cy, rx, ry, a) { x.fillStyle = `rgba(0,0,0,${a || 0.35})`; for (let j = -ry; j <= ry; j++) { const hw = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry + 0.01))); x.fillRect(cx - hw, cy + j, hw * 2, 1); } }

const PROP = {
  pillar(adCol) {
    return P2(32, 60, (x) => {
      shadowOval(x, 16, 57, 15, 3, 0.4);
      R(x, '#1a1d24', 1, 0, 30, 58);
      R(x, '#cfd3d8', 2, 0, 28, 57);
      R(x, '#aeb4bc', 2, 0, 5, 57);
      for (let yy = 4; yy < 56; yy += 12) R(x, '#b7bcc3', 2, yy, 28, 1);
      for (let xx = 9; xx < 30; xx += 7) R(x, '#bfc4ca', xx, 0, 1, 57);
      R(x, '#2e6db5', 2, 41, 28, 4); R(x, '#5c95d8', 2, 41, 28, 1);
      R(x, '#8a9098', 2, 53, 28, 4);
      R(x, '#2f343d', 6, 12, 21, 21);
      R(x, adCol, 7, 13, 19, 19);
      R(x, 'rgba(255,255,255,0.35)', 7, 13, 19, 3);
      R(x, 'rgba(0,0,0,0.25)', 10, 20, 7, 9); R(x, 'rgba(255,255,255,0.5)', 18, 24, 5, 5);
      const g = x.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, 'rgba(5,6,10,0.85)'); g.addColorStop(1, 'rgba(5,6,10,0)'); x.fillStyle = g; x.fillRect(1, 0, 30, 14);
    });
  },
  bench() {
    return P2(44, 16, (x) => {
      shadowOval(x, 22, 13, 20, 2, 0.35);
      R(x, '#3a3f48', 4, 9, 3, 6); R(x, '#3a3f48', 37, 9, 3, 6);
      R(x, '#1b1d22', 1, 3, 42, 8);
      R(x, '#a1a9b3', 2, 4, 40, 3); R(x, '#6d757f', 2, 7, 40, 3);
      for (let i = 4; i < 42; i += 4) R(x, '#8a929c', i, 4, 1, 3);
    });
  },
  column() {
    return P2(32, 54, (x) => {
      shadowOval(x, 16, 51, 15, 3, 0.45);
      R(x, '#1a1b1f', 1, 0, 30, 52);
      R(x, '#8f9297', 2, 0, 28, 51);
      R(x, '#74777c', 2, 0, 5, 51);
      dots(x, 2, 0, 28, 51, ['#9b9ea3', '#7f8287', '#86898e'], 0.18);
      for (let i = 0; i < 28; i++) for (let j = 0; j < 8; j++) { x.fillStyle = ((i + j) >> 2) % 2 ? '#1b1b1b' : '#e0b020'; x.fillRect(2 + i, 42 + j, 1, 1); }
      R(x, '#c93a2e', 12, 18, 9, 9); R(x, '#f2eee6', 14, 20, 5, 5);
      const g = x.createLinearGradient(0, 0, 0, 12); g.addColorStop(0, 'rgba(5,6,10,0.85)'); g.addColorStop(1, 'rgba(5,6,10,0)'); x.fillStyle = g; x.fillRect(1, 0, 30, 12);
    });
  },
  scooter(col) {
    return P2(30, 20, (x) => {
      shadowOval(x, 15, 17, 13, 2, 0.4);
      const wh = (cx) => { R(x, '#111', cx - 3, 11, 7, 7); R(x, '#111', cx - 4, 12, 9, 5); R(x, '#6d6d6d', cx - 1, 13, 3, 3); };
      wh(7); wh(23);
      R(x, OUTLINE, 5, 5, 21, 9); R(x, col, 6, 6, 19, 7); R(x, 'rgba(255,255,255,0.3)', 6, 6, 19, 1);
      R(x, '#1a1a1a', 9, 4, 9, 3);
      R(x, '#2b2b2b', 22, 1, 2, 6); R(x, '#2b2b2b', 20, 1, 6, 1);
      R(x, '#fff4c0', 25, 6, 2, 2);
      R(x, 'rgba(0,0,0,0.3)', 6, 11, 19, 2);
    });
  },
  drum() {
    return P2(14, 18, (x) => {
      shadowOval(x, 7, 16, 6, 2, 0.4);
      R(x, OUTLINE, 1, 1, 12, 16); R(x, '#a8322b', 2, 2, 10, 14); R(x, '#7a241f', 2, 2, 10, 3); R(x, '#c8483c', 2, 5, 2, 10);
      R(x, '#6e1f1a', 2, 7, 10, 1); R(x, '#6e1f1a', 2, 12, 10, 1);
      R(x, '#f2d23a', 5, 8, 4, 3); R(x, '#1a1a1a', 6, 9, 2, 1);
    });
  },
  gas() {
    return P2(12, 18, (x) => {
      shadowOval(x, 6, 16, 5, 2, 0.4);
      R(x, OUTLINE, 1, 2, 10, 15); R(x, '#4f6fa0', 2, 3, 8, 13); R(x, '#7394c4', 3, 3, 2, 12); R(x, '#c8322b', 2, 8, 8, 2);
      R(x, OUTLINE, 4, 0, 4, 3); R(x, '#9aa0a8', 5, 1, 2, 2);
    });
  },
  car(col, dmg) {
    return P2(50, 34, (x) => {
      shadowOval(x, 25, 29, 24, 4, 0.45);
      R(x, OUTLINE, 1, 6, 48, 24); R(x, OUTLINE, 3, 4, 44, 28);
      R(x, col, 2, 6, 46, 23); R(x, col, 4, 5, 42, 25);
      R(x, 'rgba(0,0,0,0.28)', 2, 21, 46, 8);
      R(x, 'rgba(255,255,255,0.18)', 4, 6, 42, 2);
      R(x, '#1d2633', 12, 9, 7, 13); R(x, '#1d2633', 32, 9, 5, 13);
      R(x, 'rgba(160,190,220,0.35)', 13, 10, 2, 11); R(x, 'rgba(160,190,220,0.3)', 33, 10, 1, 11);
      R(x, col, 19, 8, 13, 15); R(x, 'rgba(255,255,255,0.12)', 19, 8, 13, 3);
      R(x, '#fff1b8', 46, 9, 2, 3); R(x, '#fff1b8', 46, 19, 2, 3);
      R(x, '#b8231c', 2, 9, 2, 3); R(x, '#b8231c', 2, 19, 2, 3);
      R(x, '#111', 8, 28, 8, 3); R(x, '#111', 34, 28, 8, 3);
      if (dmg) { R(x, '#e8eef4', 14, 12, 1, 1); R(x, '#e8eef4', 16, 15, 1, 1); R(x, '#e8eef4', 13, 17, 2, 1); R(x, '#6d1616', 22, 20, 5, 2); R(x, '#6d1616', 24, 22, 2, 3); }
    });
  },
  bus() {
    return P2(98, 38, (x) => {
      shadowOval(x, 49, 33, 47, 4, 0.45);
      R(x, OUTLINE, 1, 3, 96, 31); R(x, '#d7dce1', 2, 4, 94, 29); R(x, '#2f8a5a', 2, 22, 94, 4);
      R(x, 'rgba(0,0,0,0.25)', 2, 26, 94, 7);
      for (let i = 6; i < 90; i += 11) { R(x, '#1d2633', i, 8, 9, 10); R(x, 'rgba(255,230,160,0.35)', i + 1, 9, 3, 8); }
      R(x, '#111', 12, 32, 12, 4); R(x, '#111', 72, 32, 12, 4);
      R(x, '#fff1b8', 94, 10, 2, 4);
    });
  },
  truck() {
    return P2(84, 38, (x) => {
      shadowOval(x, 42, 33, 40, 4, 0.45);
      R(x, OUTLINE, 1, 4, 62, 30); R(x, '#b8bcc2', 2, 5, 60, 28);
      for (let i = 4; i < 62; i += 5) R(x, '#9aa0a8', i, 5, 1, 28);
      R(x, 'rgba(0,0,0,0.25)', 2, 24, 60, 9);
      R(x, OUTLINE, 62, 8, 21, 26); R(x, '#3a5a8a', 63, 9, 19, 24); R(x, '#1d2633', 72, 11, 8, 9);
      R(x, '#111', 8, 32, 12, 4); R(x, '#111', 44, 32, 12, 4); R(x, '#111', 66, 32, 12, 4);
    });
  },
  ambulance() {
    return P2(50, 38, (x) => {
      shadowOval(x, 25, 33, 24, 4, 0.45);
      R(x, OUTLINE, 1, 3, 48, 30); R(x, '#f2f2ee', 2, 4, 46, 28);
      R(x, 'rgba(0,0,0,0.18)', 2, 24, 46, 8);
      R(x, '#ff7a1a', 2, 17, 46, 4); R(x, '#2f5d8c', 2, 21, 46, 1);
      R(x, '#1d2633', 36, 8, 8, 9); R(x, 'rgba(160,190,220,0.35)', 37, 9, 2, 7);
      R(x, '#2f5d8c', 16, 8, 8, 8); R(x, '#f2f2ee', 19, 9, 2, 6); R(x, '#f2f2ee', 17, 11, 6, 2);
      R(x, '#111', 7, 31, 9, 4); R(x, '#111', 34, 31, 9, 4);
      R(x, '#33363c', 14, 1, 20, 3);
    });
  },
  container(col) {
    return P2(80, 48, (x) => {
      shadowOval(x, 40, 44, 39, 4, 0.5);
      const dk = 'rgba(0,0,0,0.3)';
      R(x, OUTLINE, 0, 0, 80, 46);
      R(x, col, 1, 1, 78, 13); R(x, 'rgba(255,255,255,0.18)', 1, 1, 78, 13);
      for (let i = 3; i < 78; i += 6) R(x, 'rgba(0,0,0,0.12)', i, 1, 1, 13);
      R(x, col, 1, 15, 78, 30);
      for (let i = 2; i < 78; i += 3) R(x, dk, i, 15, 1, 30);
      R(x, 'rgba(0,0,0,0.4)', 1, 14, 78, 1);
      R(x, 'rgba(0,0,0,0.25)', 1, 38, 78, 7);
      R(x, 'rgba(255,255,255,0.35)', 8, 20, 18, 2); R(x, 'rgba(255,255,255,0.25)', 8, 24, 10, 2);
      dots(x, 1, 15, 78, 30, ['rgba(120,60,30,0.5)', 'rgba(0,0,0,0.2)'], 0.05);
    });
  },
  bollard() {
    return P2(12, 14, (x) => {
      shadowOval(x, 6, 12, 5, 2, 0.4);
      R(x, OUTLINE, 2, 1, 8, 12); R(x, '#2a2d33', 3, 2, 6, 10); R(x, '#e0b020', 3, 2, 6, 2); R(x, '#4a4f58', 4, 4, 1, 7);
    });
  },
  bed(blood) {
    return P2(34, 22, (x) => {
      shadowOval(x, 17, 19, 16, 2, 0.35);
      R(x, OUTLINE, 1, 2, 32, 17); R(x, '#9aa3ab', 2, 3, 30, 15);
      R(x, '#e6ecef', 3, 4, 28, 10); R(x, '#ffffff', 4, 5, 7, 7);
      R(x, '#7fa9c9', 12, 4, 19, 10); R(x, '#6a93b3', 16, 6, 12, 1); R(x, '#6a93b3', 14, 10, 15, 1);
      R(x, '#5d666e', 3, 15, 2, 4); R(x, '#5d666e', 29, 15, 2, 4);
      if (blood) { R(x, '#7d1717', 15, 7, 6, 4); R(x, '#5a0f12', 17, 8, 3, 2); R(x, '#7d1717', 21, 12, 2, 5); }
    });
  },
  generator() {
    return P2(34, 30, (x) => {
      shadowOval(x, 17, 27, 16, 3, 0.45);
      R(x, OUTLINE, 1, 2, 32, 25); R(x, '#d9b43a', 2, 3, 30, 23); R(x, '#b8942a', 2, 18, 30, 8);
      for (let i = 5; i < 29; i += 3) R(x, '#6b5a1e', i, 7, 2, 7);
      for (let i = 0; i < 30; i++) { x.fillStyle = (i >> 2) % 2 ? '#1b1b1b' : '#f0c02a'; x.fillRect(2 + i, 23, 1, 3); }
      R(x, '#3a3f48', 24, 0, 4, 3);
    });
  },
  sandbag() {
    return P2(18, 13, (x) => {
      shadowOval(x, 9, 11, 8, 2, 0.35);
      const bag = (a, b) => { R(x, OUTLINE, a, b, 9, 5); R(x, '#b6a579', a + 1, b + 1, 7, 3); R(x, '#d0c090', a + 1, b + 1, 7, 1); };
      bag(0, 6); bag(8, 6); bag(4, 2);
    });
  },
  crate() {
    return P2(22, 18, (x) => {
      shadowOval(x, 11, 15, 10, 2, 0.4);
      R(x, OUTLINE, 1, 2, 20, 14); R(x, '#5a6340', 2, 3, 18, 12); R(x, '#6d7750', 2, 3, 18, 3);
      R(x, '#3f4730', 2, 9, 18, 1); R(x, '#e8e2c8', 6, 11, 10, 2);
    });
  },
  vending() {
    return P2(22, 36, (x) => {
      shadowOval(x, 11, 33, 10, 2, 0.4);
      R(x, OUTLINE, 1, 0, 20, 34); R(x, '#c92f2f', 2, 1, 18, 32); R(x, '#e8f0f2', 4, 4, 14, 16);
      for (let j = 6; j < 20; j += 4) for (let i = 5; i < 17; i += 3) R(x, ['#2f8a5a', '#e0b020', '#2e6db5', '#d8423c'][(i + j) % 4], i, j, 2, 2);
      R(x, '#1a1a1a', 5, 24, 12, 4);
    });
  },
  counter() {
    return P2(66, 26, (x) => {
      shadowOval(x, 33, 23, 32, 3, 0.4);
      R(x, OUTLINE, 1, 4, 64, 19); R(x, '#e2dfd6', 2, 5, 62, 6); R(x, '#b8b3a6', 2, 11, 62, 11);
      R(x, '#2a2f38', 10, 0, 12, 8); R(x, '#5fd0e6', 11, 1, 10, 5);
      R(x, '#7d1717', 40, 7, 8, 2); R(x, '#7d1717', 44, 9, 2, 6);
      R(x, '#8fdc6a', 52, 14, 8, 3);
    });
  },
  tent() {
    return P2(50, 36, (x) => {
      shadowOval(x, 25, 32, 24, 4, 0.45);
      R(x, OUTLINE, 2, 6, 46, 27);
      for (let j = 0; j < 12; j++) R(x, '#4f5a3a', 3 + j * 2 > 25 ? 25 : 3, 7 + j, 44, 1);
      R(x, '#4f5a3a', 3, 7, 44, 25); R(x, '#5f6b46', 3, 7, 44, 10); R(x, '#3a4229', 20, 18, 10, 14);
    });
  },
  tower() {
    return P2(14, 52, (x) => {
      shadowOval(x, 7, 49, 6, 2, 0.4);
      R(x, OUTLINE, 5, 6, 4, 44); R(x, '#8a9098', 6, 7, 2, 43);
      R(x, OUTLINE, 0, 0, 14, 8); R(x, '#3a3f48', 1, 1, 12, 6); R(x, '#fffbe0', 2, 5, 10, 2);
    });
  },
  barrier() {
    return P2(34, 16, (x) => {
      shadowOval(x, 17, 13, 16, 2, 0.35);
      R(x, OUTLINE, 1, 3, 32, 7);
      for (let i = 0; i < 30; i++) { x.fillStyle = (i >> 2) % 2 ? '#f2f2ee' : '#c8322b'; x.fillRect(2 + i, 4, 1, 5); }
      R(x, '#3a3f48', 4, 10, 2, 5); R(x, '#3a3f48', 28, 10, 2, 5);
    });
  },
  armyTruck() {
    return P2(66, 36, (x) => {
      shadowOval(x, 33, 31, 32, 4, 0.45);
      R(x, OUTLINE, 1, 5, 64, 26); R(x, '#4b5635', 2, 6, 62, 24); R(x, '#5f6b46', 2, 6, 62, 6);
      R(x, '#3a4229', 44, 6, 1, 24); R(x, '#1d2633', 50, 10, 10, 7);
      R(x, '#111', 8, 29, 10, 4); R(x, '#111', 46, 29, 10, 4);
      R(x, '#e8e2c8', 12, 16, 16, 3);
    });
  },
  crowd(shirt, arms) {
    return P2(8, 15, (x) => {
      R(x, OUTLINE, 2, 0, 4, 4); R(x, '#2a2420', 3, 0, 2, 1); R(x, '#8a6a52', 3, 1, 2, 3);
      R(x, OUTLINE, 1, 4, 6, 7); R(x, shirt, 2, 4, 4, 6);
      if (arms) { R(x, OUTLINE, 0, 0, 1, 5); R(x, OUTLINE, 7, 0, 1, 5); R(x, '#8a6a52', 0, 0, 1, 1); R(x, '#8a6a52', 7, 0, 1, 1); }
      R(x, OUTLINE, 2, 10, 4, 5); R(x, '#2a2f3d', 2, 10, 2, 4); R(x, '#2a2f3d', 4, 10, 2, 4);
    });
  }
};

