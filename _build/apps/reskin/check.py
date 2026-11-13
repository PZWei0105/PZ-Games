#!/usr/bin/env python3
"""耳目一新 RESKIN 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/reskin/check.py                      # 網頁版（apps/reskin/）
  python3 _build/apps/reskin/check.py --claude /tmp/rs-c   # 另外檢查 build.py --claude-out 輸出的 Claude 版
  python3 _build/apps/reskin/check.py --friend /tmp/rs-f   # 另外檢查 build.py --friend-out 輸出的朋友版
  python3 _build/apps/reskin/check.py --one /home/claude/out/朋友版/index.html   # 朋友版單一檔案：只放這一個檔案上網也能用

標籤      MP3（ID3v2.3＋封面）、M4A（封面）、FLAC（Vorbis＋圖片）、WAV（從檔名猜歌手）、Big5 編碼的舊 MP3 標籤
分析      每首都算出節奏（BPM 誤差 ±3）與頻譜
節拍      節拍引擎（第 3 版）：合成的舞曲、流行、抒情、嘻哈四首（已知每一拍），速度、每一拍、每小節第一拍都要對；
          示範曲的節拍格線、拍子事件準時、對拍滑桿方向、對拍測試、「正在對拍」提示、節奏大師計分、粒子封面的 WebGL
播放      單軌換帶：播完接下一首；雙軌接力：螢幕關著時提前交棒、記成功；鎖屏沒接上 → 自動改雙軌＋「繼續播放」；
          單曲循環、上一首重頭、隨機保留目前這首、刪掉正在播的歌、壞掉的檔案跳過
介面      空歌庫→示範曲、衣櫃左右滑試穿＋就穿這套、歌單綁 Skin、每首換一套、DIY 存檔、派對模式、重新整理後接著上次
新功能    歌詞（資料夾裡的 .lrc 跟著唱亮、點一句跳過去；內嵌歌詞）、我的最愛（H 鍵、愛心歌單）、睡眠定時（倒數、
          播完這首）、改歌曲資訊（Skin 上的字跟著換）、子資料夾各存一個歌單、分享卡片、DIY 分享碼（複製→貼上）、
          副歌偵測＋全開特效、提前排好的節拍（煙火準時炸開）
資料夾    整個資料夾匯入（子資料夾、略過 ._ 檔／.DS_Store／文字檔、WMA 說明不能播、已在歌庫的跳過、資料夾裡的
          cover.jpg 當封面、去掉檔名前的曲序、照資料夾順序）、存成歌單、「匯入」選單開資料夾、沒有歌的資料夾、
          中途停止再匯入、空間不夠停下來不留殘檔、螢幕關著不分析節奏、上千首的歌庫邊捲邊畫
讀不到時  歌存成純位元組、舊版 Blob 讀一次就轉存；blob: 連結被擋時改用 data: 連結（音樂、封面）；檔案讀不到
          標記起來、重新匯入就補回；連續三首播不了就停下來說明（Claude 版附網頁版連結）
每套 Skin 手機直拿、手機橫拿、電腦各截一張（/tmp/reskin-check）；每套都換一次歌（換歌動畫）；沒有程式錯誤
離線      網頁版關掉伺服器還打得開
需要 Playwright、numpy、ffmpeg（雲端沙盒都有，不要執行 playwright install）。有 BAD 時 exit code 1。
"""
import argparse, functools, http.server, json, os, shutil, socketserver, struct, subprocess, sys, threading

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SKINS = ['neon', 'rhythm', 'blackhole', 'particles', 'neoncity', 'woofer', 'stage', 'supercar', 'mecha', 'fighter', 'nebula', 'liquid', 'fireworks', 'aurora', 'jelly', 'catdj', 'gacha', 'arcade', 'vinyl', 'cassette', 'ink', 'scope', 'glass']
GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']  # WebGL in headless Chromium (the 3D skins, the bloom)
PHONE = {'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 2, 'has_touch': True, 'is_mobile': True}
DESK = {'viewport': {'width': 1280, 'height': 800}}
LAND = {'width': 844, 'height': 390}
HIDE = "Object.defineProperty(Document.prototype,'hidden',{get(){return !!window.__hid},configurable:true});Object.defineProperty(Document.prototype,'visibilityState',{get(){return window.__hid?'hidden':'visible'},configurable:true});"
BAD = []


def ok(cond, msg):
    print(('OK   ' if cond else 'BAD  ') + msg)
    if not cond:
        BAD.append(msg)


def fixtures(d):
    import numpy as np
    os.makedirs(d, exist_ok=True)
    sr = 44100
    rng = np.random.default_rng(3)

    def song(bpm, secs, root):
        n = int(secs * sr); t = np.arange(n) / sr; out = np.zeros(n); beat = 60 / bpm
        for b in range(int(secs / beat)):
            s = int(b * beat * sr); L = min(n - s, int(0.4 * sr)); tt = np.arange(L) / sr
            out[s:s + L] += np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-tt * 30)) / sr) * np.exp(-tt * 7) * 0.9
            hs = int((b + 0.5) * beat * sr)
            if hs < n:
                HL = min(n - hs, int(0.05 * sr)); out[hs:hs + HL] += rng.standard_normal(HL) * np.exp(-np.arange(HL) / sr * 80) * 0.15
        for k, m in enumerate([1, 1.2, 1.5]):
            out += 0.12 * np.sin(2 * np.pi * root * m * t + k)
        out /= np.max(np.abs(out)) * 1.05
        return out

    def wav(path, x):
        d16 = (np.clip(np.stack([x, x], 1), -1, 1) * 32767).astype('<i2')
        with open(path, 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', 36 + d16.nbytes) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 2, sr, sr * 4, 4, 16) + b'data' + struct.pack('<I', d16.nbytes) + d16.tobytes())

    from PIL import Image
    cov = os.path.join(d, 'cover.png'); Image.new('RGB', (300, 300), (230, 40, 200)).save(cov)
    ff = lambda *a: subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *a], check=True)
    wav(os.path.join(d, 'a.wav'), song(128, 20, 110))
    ff('-i', os.path.join(d, 'a.wav'), '-i', cov, '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame', '-b:a', '160k', '-c:v', 'mjpeg', '-id3v2_version', '3', '-metadata', 'title=霓虹夜奔', '-metadata', 'artist=痞子葳 x Suno', '-disposition:v', 'attached_pic', os.path.join(d, 't1.mp3'))
    wav(os.path.join(d, 'b.wav'), song(150, 18, 98))
    ff('-i', os.path.join(d, 'b.wav'), '-i', cov, '-map', '0:a', '-map', '1:v', '-c:a', 'flac', '-c:v', 'png', '-disposition:v', 'attached_pic', '-metadata', 'title=Overdrive 衝刺', '-metadata', 'artist=Test Artist', os.path.join(d, 't3.flac'))
    wav(os.path.join(d, 'c.wav'), song(100, 16, 146.8))
    ff('-i', os.path.join(d, 'c.wav'), '-i', cov, '-map', '0:a', '-map', '1:v', '-c:a', 'aac', '-b:a', '128k', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', '-metadata', 'title=慢慢睡', '-metadata', 'artist=Suno', os.path.join(d, 't2.m4a'))
    wav(os.path.join(d, 'd.wav'), song(118, 15, 123.5))
    shutil.copy(os.path.join(d, 'd.wav'), os.path.join(d, '痞子葳 - 雨天散步.wav'))
    raw = os.path.join(d, 'raw.mp3')
    ff('-i', os.path.join(d, 'd.wav'), '-c:a', 'libmp3lame', '-b:a', '128k', '-id3v2_version', '0', '-write_id3v1', '0', raw)
    frame = lambda fid, text: fid.encode() + struct.pack('>I', len(text.encode('big5')) + 1) + b'\x00\x00' + b'\x00' + text.encode('big5')
    fr = frame('TIT2', '五月天的夜晚') + frame('TPE1', '台灣老歌手'); size = len(fr) + 64
    tag = b'ID3\x03\x00\x00' + bytes([(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f]) + fr + b'\x00' * 64
    open(os.path.join(d, 'big5.mp3'), 'wb').write(tag + open(raw, 'rb').read())
    open(os.path.join(d, 'broken.mp3'), 'wb').write(b'ID3\x03\x00\x00\x00\x00\x00\x00' + os.urandom(3000))
    for f in ('a.wav', 'b.wav', 'c.wav', 'd.wav', 'raw.mp3', 'cover.png'):
        os.remove(os.path.join(d, f))
    return d


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root):
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=root))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def run(url, out, fx, web):
    from playwright.sync_api import sync_playwright
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] + GL)
        ctx = b.new_context(**PHONE)
        pg = ctx.new_page()
        pg.add_init_script(HIDE)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        ev = pg.evaluate
        pg.goto(url); pg.wait_for_timeout(350)
        ok(ev('!!document.querySelector("#splash.boot .bt-cv")'), '開機動畫：打開 App 先跑科幻啟動')
        pg.wait_for_function("!document.getElementById('splash')", timeout=20000); pg.wait_for_timeout(300)
        ok(pg.is_visible('#empty'), '空歌庫：看得到匯入卡片')
        pg.click('#empty [data-act="demo"]')
        pg.wait_for_function('RESKIN.lib.count() === 1 && RESKIN.player.isPlaying()', timeout=30000)
        ok(ev('document.getElementById("empty").hidden'), '示範曲：合成、加入、開始播放')
        files = [os.path.join(fx, f) for f in ('t1.mp3', 't2.m4a', 't3.flac', 'big5.mp3', '痞子葳 - 雨天散步.wav')]
        pg.set_input_files('#fileIn', files)
        pg.wait_for_function('document.getElementById("busy").hidden && RESKIN.lib.count() === 6', timeout=90000)
        pg.wait_for_function('RESKIN.analysis.left() === 0', timeout=180000)
        L = {t['name']: t for t in ev('RESKIN.lib.all()')}
        ok(L['t1.mp3']['title'] == '霓虹夜奔' and L['t1.mp3']['artist'] == '痞子葳 x Suno' and L['t1.mp3']['cover'] == 1, 'MP3：歌名、歌手、封面')
        ok(L['t2.m4a']['title'] == '慢慢睡' and L['t2.m4a']['cover'] == 1, 'M4A：歌名、封面')
        ok(L['t3.flac']['title'] == 'Overdrive 衝刺' and L['t3.flac']['cover'] == 1, 'FLAC：歌名、封面')
        ok(L['big5.mp3']['title'] == '五月天的夜晚' and L['big5.mp3']['artist'] == '台灣老歌手', 'Big5 舊標籤讀得出中文')
        ok(L['痞子葳 - 雨天散步.wav']['title'] == '雨天散步' and L['痞子葳 - 雨天散步.wav']['artist'] == '痞子葳', '沒標籤的 WAV：從檔名分出歌手和歌名')
        ok(all(t['an'] == 1 for t in L.values()), '每首都分析完節奏')
        ok(abs(L['t1.mp3']['bpm'] - 128) < 3 and abs(L['t3.flac']['bpm'] - 150) < 3, 'BPM 抓得準（128、150）')
        # playback engines
        ev('() => { const all = RESKIN.lib.list(); const t = all.find(x => x.name === "t1.mp3"); RESKIN.player.playFrom(all.map(x => x.id), t.id, {type:"library"}); }')
        pg.wait_for_timeout(1000)
        t0 = ev('RESKIN.player.current().id')
        ev('RESKIN.player.seek(RESKIN.player.duration() - 1)'); pg.wait_for_timeout(2600)
        ok(ev('RESKIN.player.current().id') != t0 and ev('RESKIN.player.isPlaying()'), '單軌換帶：播完自動接下一首')
        ev('RESKIN.settings.set("engine","dual")'); pg.wait_for_timeout(200)
        t1 = ev('RESKIN.player.current().id')
        ev('RESKIN.player.seek(RESKIN.player.duration() - 3.2)'); pg.wait_for_timeout(1200)
        ev('window.__hid = true; document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_timeout(3400)
        last = ev('RESKIN.player.diag.log.slice(-1)[0]')
        ok(ev('RESKIN.player.current().id') != t1 and ev('RESKIN.player.isPlaying()') and last and last.get('ok') is True and last.get('why') == 'near-end', '雙軌接力：螢幕關著時提前交棒，記錄成功')
        ev('window.__hid = false; document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_timeout(700)
        ev('RESKIN.settings.set("engine","auto"); RESKIN.settings.set("engineAuto","single")')
        ev('() => { window.__hid = true; document.dispatchEvent(new Event("visibilitychange")); const P = RESKIN.player; P.diag.begin(P.queue()[(P.index()+1) % P.queue().length], "single", "ended"); P.diag.pend.at = Date.now() - 6000; P.els.forEach(e => e.pause()); }')
        pg.wait_for_timeout(400)
        ev('window.__hid = false; document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_timeout(1500)
        ok(ev('RESKIN.settings.get("engineAuto")') == 'dual' and pg.is_visible('.toast button'), '鎖屏沒接上：自動改用雙軌接力，跳出「繼續播放」')
        pg.click('.toast button'); pg.wait_for_timeout(1300)
        ok(ev('RESKIN.player.isPlaying()'), '「繼續播放」接得回來')
        ev('RESKIN.player.cycleRepeat()'); c0 = ev('RESKIN.player.current().id')
        ev('RESKIN.player.seek(RESKIN.player.duration() - 0.8)'); pg.wait_for_timeout(2000)
        ok(ev('RESKIN.player.current().id') == c0 and ev('RESKIN.player.time()') < 2.5, '單曲循環')
        ev('RESKIN.player.cycleRepeat(); RESKIN.player.cycleRepeat()')
        ev('RESKIN.player.seek(9)'); pg.wait_for_timeout(300); ev('RESKIN.player.prev()'); pg.wait_for_timeout(500)
        ok(ev('RESKIN.player.current().id') == c0 and ev('RESKIN.player.time()') < 1.5, '上一首：超過 3 秒先回到開頭')
        ev('RESKIN.player.setShuffle(true)')
        ok(ev('RESKIN.player.queue()[RESKIN.player.index()]') == c0, '隨機播放保留正在播的這首'); ev('RESKIN.player.setShuffle(false)')
        pg.set_input_files('#fileIn', [os.path.join(fx, 'broken.mp3')]); pg.wait_for_function('document.getElementById("busy").hidden', timeout=30000); pg.wait_for_timeout(2500)
        ev('() => { const all = RESKIN.lib.list(); const t = all.find(x => x.name === "broken.mp3"); RESKIN.player.playFrom(all.map(x => x.id), t.id, {type:"library"}); }'); pg.wait_for_timeout(3000)
        ok(ev('RESKIN.player.current().name') != 'broken.mp3', '壞掉的檔案：提示後跳下一首')
        ev('() => RESKIN.lib.remove([RESKIN.lib.list().find(x => x.name === "broken.mp3").id])'); pg.wait_for_timeout(300)
        ev('RESKIN.lib.remove([RESKIN.player.current().id])'); pg.wait_for_timeout(800)
        ok(ev('RESKIN.lib.count()') == 5 and ev('!!RESKIN.player.current()'), '刪掉正在播的歌：換到別首')
        # wardrobe, playlist binding, shuffle mode, DIY, party, restore
        pg.click('#dock [data-act="wardrobe"]'); pg.wait_for_timeout(800)
        ev('() => { const r = document.querySelector(".wd-rack"); const it = document.querySelector("[data-wid=jelly]"); r.scrollLeft = it.offsetLeft - (r.clientWidth - it.offsetWidth) / 2; }'); pg.wait_for_timeout(1300)
        ok(ev('RESKIN.stage.current().id') == 'jelly', '衣櫃：滑到哪套就試穿哪套')
        pg.screenshot(path=os.path.join(out, 'ui-wardrobe.png'))
        pg.click('[data-w="ok"]'); pg.wait_for_timeout(600)
        ok(ev('RESKIN.settings.get("skin")') == 'jelly', '衣櫃：就穿這套')
        ev('async () => { const p = await RESKIN.lib.pl.create("開車聽", RESKIN.lib.list().slice(0, 3).map(t => t.id)); p.skin = "vinyl"; await RESKIN.lib.pl.save(p); }')
        ev('RESKIN.library.open("lists")'); pg.wait_for_timeout(700)
        pg.click('[data-pl]:not([data-pl="fav"]):not([data-pl^="smart:"])'); pg.wait_for_timeout(600)
        pg.screenshot(path=os.path.join(out, 'ui-playlist.png'))
        pg.click('[data-l="pl-play"]'); pg.wait_for_timeout(1600)
        ok(ev('RESKIN.stage.current().id') == 'vinyl', '歌單綁 Skin：播這個歌單自動換上黑膠')
        ev('() => { const all = RESKIN.lib.list(); RESKIN.player.playFrom(all.map(t => t.id), all[0].id, {type:"library"}); }'); pg.wait_for_timeout(1500)
        ok(ev('RESKIN.stage.current().id') == 'jelly', '離開歌單：換回自己選的那套')
        ev('RESKIN.settings.set("skinMode","shuffle")'); s0 = ev('RESKIN.stage.current().id')
        pg.click('.skin [data-act="next"]'); pg.wait_for_timeout(1500)
        ok(ev('RESKIN.stage.current().id') != s0, '每首換一套：換歌就換 Skin')
        ev('RESKIN.settings.set("skinMode","fixed")'); pg.wait_for_timeout(1200)
        ev('RESKIN.diy.edit(null)'); pg.wait_for_timeout(1000)
        pg.screenshot(path=os.path.join(out, 'ui-diy-editor.png'))
        pg.click('[data-dk="viz"][data-v="ring"]'); pg.wait_for_timeout(400)
        pg.click('[data-dy="save"]'); pg.wait_for_timeout(1300)
        ok(ev('RESKIN.stage.current().id.startsWith("diy-") && RESKIN.settings.get("diy").length === 1'), 'DIY：存好就穿上，衣櫃裡也有')
        pg.screenshot(path=os.path.join(out, 'ui-diy.png'))
        ev('RESKIN.library.open("songs")'); pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(out, 'ui-library.png')); ev('RESKIN.ui.closeSheet(true)')
        ev('RESKIN.settingsUI.show()'); pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(out, 'ui-settings.png')); ev('RESKIN.ui.closeSheet(true)')
        pg.wait_for_timeout(500)
        pg.click('#dock [data-act="party"]'); pg.wait_for_timeout(3600)
        ok(ev('document.body.classList.contains("party") && getComputedStyle(document.getElementById("dock")).opacity === "0"'), '派對模式：按鈕收起來')
        pg.screenshot(path=os.path.join(out, 'ui-party.png'))
        ev('RESKIN.party.toggle(false)')
        cur = ev('RESKIN.player.current().id')
        pg.reload(); pg.wait_for_timeout(2500)
        ok(ev('RESKIN.player.current() && RESKIN.player.current().id') == cur and ev('RESKIN.lib.count()') == 5, '重新打開：歌庫還在、停在上次那首')
        # every skin, phone
        ev('() => { const all = RESKIN.lib.list(); RESKIN.player.playFrom(all.map(t => t.id), all.find(t => t.demo).id, {type:"library"}, {at: 38}); }'); pg.wait_for_timeout(900)
        for s in SKINS:
            ev(f'RESKIN.stage.show("{s}", {{instant: true, silent: true}})'); pg.wait_for_timeout(1800)
            pg.screenshot(path=os.path.join(out, f'{s}-phone.png'))
        # every skin plays its song-change animation once
        for s in SKINS:
            ev(f'RESKIN.settings.set("skin", "{s}"); RESKIN.stage.show("{s}", {{instant: true, silent: true}})'); pg.wait_for_timeout(500)
            ev('RESKIN.player.next()'); pg.wait_for_timeout(700)
        ok(ev('RESKIN.stage.current().id') == SKINS[-1], '每套 Skin：換歌動畫跑完')
        # every skin, phone on its side
        pg.set_viewport_size(LAND); pg.wait_for_timeout(600)
        for s in SKINS:
            ev(f'RESKIN.stage.show("{s}", {{instant: true, silent: true}})'); pg.wait_for_timeout(1700)
            pg.screenshot(path=os.path.join(out, f'{s}-land.png'))
        pg.set_viewport_size(PHONE['viewport']); pg.wait_for_timeout(400)
        ok(not errs, '手機：沒有程式錯誤' + ('' if not errs else '：' + ' | '.join(errs[:5])))
        ctx.close()
        # every skin, desktop
        errs.clear()
        ctx = b.new_context(**DESK); pg = ctx.new_page(); ev = pg.evaluate
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1200)
        ev('RESKIN.lib.addDemo()'); pg.wait_for_function('RESKIN.analysis.left() === 0 && RESKIN.lib.count() === 1', timeout=60000)
        ev('() => { const t = RESKIN.lib.list()[0]; RESKIN.player.playFrom([t.id], t.id, {type:"library"}, {at: 38}); }'); pg.wait_for_timeout(900)
        for s in SKINS:
            ev(f'RESKIN.stage.show("{s}", {{instant: true, silent: true}})'); pg.wait_for_timeout(1600)
            pg.screenshot(path=os.path.join(out, f'{s}-desk.png'))
        ok(not errs, '電腦：沒有程式錯誤' + ('' if not errs else '：' + ' | '.join(errs[:5])))
        if web:
            pg.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=20000)
            web.shutdown(); web.server_close()
            try:
                pg.reload(); pg.wait_for_timeout(2500)
                ok(ev('!!document.querySelector(".skin") && RESKIN.lib.count() === 1'), '離線：關掉伺服器還打得開，歌也還在')
            except Exception as e:
                ok(False, '離線：' + str(e)[:120])
        ctx.close(); b.close()


def feature_fixtures(d, fx):
    """A folder with two subfolders: a song with a synced .lrc next to it, one with lyrics inside its tags, one without."""
    import numpy as np
    shutil.rmtree(d, ignore_errors=True)
    A, B = os.path.join(d, '合輯', 'A面'), os.path.join(d, '合輯', 'B面')
    os.makedirs(A); os.makedirs(B)
    shutil.copy(os.path.join(fx, 't1.mp3'), os.path.join(A, '01 第一首.mp3'))
    open(os.path.join(A, '01 第一首.lrc'), 'w', encoding='utf-8').write('[ti:第一首]\n[00:00.40]<00:00.40>第一 <00:01.00>句歌 <00:01.80>詞\n[00:02.50]第二句歌詞\n[00:05.00]第三句歌詞\n[00:08.00]第四句歌詞\n[00:12.00]第五句歌詞\n')
    sr = 22050

    def wav(path, freq, secs):
        t = np.arange(int(secs * sr)) / sr; x = 0.35 * np.sin(2 * np.pi * freq * t)
        d16 = (np.stack([x, x], 1) * 32767).astype('<i2')
        with open(path, 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', 36 + d16.nbytes) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 2, sr, sr * 4, 4, 16) + b'data' + struct.pack('<I', d16.nbytes) + d16.tobytes())
    tmp = os.path.join(d, 'x.wav'); wav(tmp, 330, 6)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k', '-id3v2_version', '3', '-metadata', 'title=夜曲', '-metadata', 'lyrics=內嵌的第一行\n內嵌的第二行', os.path.join(B, '夜曲.mp3')], check=True)
    os.remove(tmp)
    wav(os.path.join(B, '尾聲.wav'), 262, 5)
    return os.path.join(d, '合輯')


def run_features(url, out, folder):
    from playwright.sync_api import sync_playwright
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] + GL)
        ctx = b.new_context(**PHONE)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        ev = pg.evaluate
        done = lambda t=60000: pg.wait_for_function('document.getElementById("busy").hidden', timeout=t)
        pg.goto(url); pg.wait_for_function("!!window.RESKIN && !document.getElementById('splash')", timeout=20000); pg.wait_for_timeout(500)
        # subfolders + lyrics
        pg.set_input_files('#folderIn', folder); done(); pg.wait_for_timeout(300)
        T = {t['name']: t for t in ev('RESKIN.lib.list().map(t => ({ id: t.id, name: t.name, kind: RESKIN.lyrics.kind(t) }))')}
        ok(len(T) == 3, '資料夾（有子資料夾）：三首都進來（%s）' % list(T))
        ok(T.get('01 第一首.mp3', {}).get('kind') == 'synced', '歌詞：資料夾裡同名的 .lrc 自動配上，而且有時間標記（%s）' % T.get('01 第一首.mp3'))
        ok(T.get('夜曲.mp3', {}).get('kind') == 'plain', '歌詞：歌曲檔裡內嵌的歌詞也讀得到（%s）' % T.get('夜曲.mp3'))
        btn = pg.locator('#toasts .toast button', has_text='存成歌單')
        if btn.count():
            btn.first.click(); pg.wait_for_timeout(500)
            pg.screenshot(path=os.path.join(out, 'ui-folder-playlists.png'))
            pg.click('#modal .md-i:has-text("每個資料夾各存一個歌單")'); pg.wait_for_timeout(700)
        P = sorted((x['name'], x['n']) for x in ev('RESKIN.lib.pl.all().filter(p => p.id !== "fav").map(p => ({ name: p.name, n: p.ids.length }))'))
        ok(P == [('A面', 1), ('B面', 2)], '子資料夾：每個資料夾各存一個歌單（%s）' % P)
        # lyrics follow the song; tapping a line jumps there
        first = T['01 第一首.mp3']['id']
        ev('(id) => RESKIN.player.playFrom(RESKIN.lib.list().map(t => t.id), id, { type: "library" })', first)
        pg.wait_for_function('RESKIN.player.isPlaying() && RESKIN.player.time() > 0.2', timeout=15000)
        ok(ev('!!document.querySelector("#dock [data-act=more] .dot")'), '有歌詞的歌：「更多」按鈕上有小點')
        pg.keyboard.press('y'); pg.wait_for_timeout(300)
        ev('RESKIN.player.seek(2.7)'); pg.wait_for_timeout(900)
        ok(ev('(document.querySelector("#lyrics .ly-list p.on") || {}).textContent') == '第二句歌詞', '歌詞：唱到哪句亮哪句')
        pg.screenshot(path=os.path.join(out, 'ui-lyrics.png'))
        pg.click('#lyrics .ly-list p[data-i="3"]'); pg.wait_for_timeout(500)
        ok(7.8 <= ev('RESKIN.player.time()') < 9.5, '歌詞：點一句就跳到那裡')
        pg.keyboard.press('y'); pg.wait_for_timeout(300)
        # favourites
        pg.keyboard.press('h'); pg.wait_for_timeout(400)
        ok(ev('!!RESKIN.player.current().fav') and 'on' in ev('document.querySelector("#dock [data-act=fav]").className'), '我的最愛：H 鍵（或愛心）加進去，愛心變色')
        ok(ev('(id) => RESKIN.lib.pl.get("fav").ids.includes(id)', first), '我的最愛：自動出現在「我的最愛」歌單')
        ev("RESKIN.library.open('lists')"); pg.wait_for_timeout(600)
        ok(ev('(document.querySelector("#sheetBody [data-pl]:not([data-pl^=\'smart:\'])") || {}).dataset.pl') == 'fav', '歌單頁：「我的最愛」排在自己的歌單第一個')
        pg.screenshot(path=os.path.join(out, 'ui-lists.png'))
        ev('RESKIN.ui.closeSheet(true)'); pg.wait_for_timeout(400)
        # sleep timer: minutes, then "end of this song"
        ev('RESKIN.player.setSleep(30)'); pg.wait_for_timeout(1200)
        ok(not ev('document.getElementById("sleepPill").hidden') and ':' in ev('document.getElementById("sleepPill").textContent'), '睡眠定時：右上角顯示倒數')
        ev('RESKIN.player.setSleep(0.03)'); pg.wait_for_timeout(2600)
        ok(not ev('RESKIN.player.isPlaying()') and ev('document.getElementById("sleepPill").hidden'), '睡眠定時：時間到就停')
        ev('RESKIN.player.play()'); pg.wait_for_timeout(600)
        ev("RESKIN.player.setSleep('end')"); c0 = ev('RESKIN.player.current().id')
        ev('RESKIN.player.seek(RESKIN.player.duration() - 1)'); pg.wait_for_timeout(2400)
        ok(not ev('RESKIN.player.isPlaying()') and ev('RESKIN.player.current().id') == c0, '睡眠定時「播完這首」：這首唱完就停，不接下一首')
        # edit the song: the skin's text follows
        ev('RESKIN.stage.show("ink", { instant: true, silent: true })'); pg.wait_for_timeout(1500)
        ev('(id) => RESKIN.extras.editTrack(id)', c0); pg.wait_for_timeout(600)
        pg.fill('[data-ed-f="title"]', '改過的歌名'); pg.fill('[data-ed-f="artist"]', '新的歌手'); pg.click('[data-ed="save"]'); pg.wait_for_timeout(800)
        ok(ev('RESKIN.player.current().title') == '改過的歌名' and ev('document.querySelector(".skin [data-bind=title]").textContent') == '改過的歌名', '改歌曲資訊：存好後 Skin 上的歌名馬上跟著換')
        ok(ev('document.querySelector(".ik-seal").textContent') == '新的', '改歌曲資訊：自己畫字的 Skin 也跟著換（水墨的印章）')
        # share card
        ev('RESKIN.share.open()')
        try:
            pg.wait_for_selector('.share-img', timeout=15000); pg.wait_for_timeout(500)
            dims = ev('(() => { const i = document.querySelector(".share-img"); return [i.naturalWidth, i.naturalHeight]; })()')
            ok(dims == [1080, 1350], '分享卡片：做出 1080×1350 的圖（%s）' % dims)
            pg.screenshot(path=os.path.join(out, 'ui-share.png'))
        except Exception as e:
            ok(False, '分享卡片：' + str(e)[:100])
        ev('RESKIN.ui.closeSheet(true)'); pg.wait_for_timeout(400)
        # DIY share code: copy, paste back
        code = ev("RESKIN.diy.toCode({ name: '分享測試', accent: '#ff2bd6', accent2: '#22f3ff', viz: 'ring', layout: 'full', font: 'tech', dim: .4, blur: .3 })")
        back = ev('(c) => RESKIN.diy.fromCode("朋友傳來：" + c + " 試試看")', code)
        ok(code.startswith('耳目一新Skin:') and back and back.get('accent') == '#ff2bd6' and back.get('viz') == 'ring', 'DIY 分享碼：複製出來、貼回去還原（夾在別的字中間也認得）')
        # chorus: found, every skin goes all out; beats can be read ahead
        ev('RESKIN.lib.addDemo()'); pg.wait_for_function('RESKIN.analysis.left() === 0 && RESKIN.lib.count() === 4', timeout=60000)
        ev('() => { const t = RESKIN.lib.list().find(t => t.demo); RESKIN.player.playFrom([t.id], t.id, { type: "library" }); }'); pg.wait_for_timeout(1200)
        spans = ev('RESKIN.viz.hotSpans')
        ok(bool(spans), '副歌偵測：示範曲找得到副歌（%s）' % spans)
        ev('RESKIN.player.seek(20)'); pg.wait_for_timeout(500)
        ahead = ev('RESKIN.viz.upcoming(RESKIN.viz.t, RESKIN.viz.t + 2)')
        ok(len(ahead) >= 4 and all(ahead[i] > ahead[i - 2] for i in range(2, len(ahead), 2)), '節拍可以提前讀：接下來兩秒的拍點（煙火提前發射，剛好在拍上炸開）')
        if spans:
            ev('RESKIN.stage.show("glass", { instant: true, silent: true })'); pg.wait_for_timeout(800)
            ev('(t) => RESKIN.player.seek(t)', spans[0][0] - 1.2); pg.wait_for_timeout(2600)
            ok(ev('RESKIN.viz.hot') > 0.5 and ev('RESKIN.hype.count()') > 0, '副歌全開：進副歌時彩帶炮、光束一起來')
            pg.screenshot(path=os.path.join(out, 'ui-chorus.png'))
        # --- the light layer, depth, transitions, lock-screen cards ---
        ok(ev('RESKIN.fx.ok()'), 'GPU 泛光：WebGL 泛光層啟動')
        for k in ('portal', 'shatter', 'pixel'):
            ev('(k) => RESKIN.settings.set("transFx", k)', k)
            nxt = 'neon' if ev('RESKIN.stage.current().id') != 'neon' else 'aurora'
            ev('(id) => RESKIN.stage.show(id, { silent: true })', nxt); pg.wait_for_timeout(250)
            mid = ev('RESKIN.trans.kind()')
            pg.screenshot(path=os.path.join(out, 'ui-trans-%s.png' % k)); pg.wait_for_timeout(1500)
            ok(mid == k and ev('document.querySelectorAll("#stage .skin").length') == 1 and not ev('RESKIN.trans.active()'), '換 Skin 轉場「%s」：跑完、舊的 Skin 收掉（%s）' % ({'portal': '傳送門', 'shatter': '玻璃碎裂', 'pixel': '像素溶解'}[k], mid))
        ev('RESKIN.settings.set("transFx", "auto")')
        sizes = ev('async (ids) => { const out = []; for (const id of ids) { await RESKIN.stage.show(id, { instant: true, silent: true }); const c = await RESKIN.poster.card(RESKIN.player.current(), RESKIN.stage.current(), 300); out.push(c.width + "x" + c.height); } return out; }', SKINS)
        ok(len(sizes) == len(SKINS) and all(x == '300x300' for x in sizes), '鎖屏封面換膚：每套 Skin 都畫得出自己的封面卡（%d 套）' % len(sizes))
        # --- analysis v3 (beat grid), the beat clock, sync, song intel, smart playlists ---
        A = ev('RESKIN.lib.all().filter(t => t.an === 1).map(t => ({ av: t.av, k: t.mkey, loud: t.loud }))')
        ok(A and all(x['av'] == 3 and x['loud'] is not None for x in A) and sum(1 for x in A if x['k']) >= len(A) - 1, '分析第 3 版：每首都量出節拍格線、調性、響度、亮度（%s）' % [x['k'] for x in A])
        check_beat_clock(pg, ev, out)
        ev('() => { const t = RESKIN.lib.list().find(t => t.demo); RESKIN.player.playFrom([t.id], t.id, { type: "library" }); }'); pg.wait_for_timeout(900)
        ev('RESKIN.insight.open()'); pg.wait_for_timeout(1200)
        ok(pg.is_visible('.in-grid') and 'BPM' in pg.inner_text('.in-grid'), '歌曲情報：BPM、調性、能量一目了然')
        pg.screenshot(path=os.path.join(out, 'ui-intel.png'))
        if spans:
            ev('RESKIN.player.seek(2)'); pg.click('[data-in="chorus"]'); pg.wait_for_timeout(700)
            ok(spans[0][0] - 1 <= ev('RESKIN.player.time()') <= spans[0][1], '歌曲情報：一鍵跳到副歌')
        ev('RESKIN.ui.closeSheet(true)'); pg.wait_for_timeout(300)
        sm = ev('RESKIN.smart.all().map(p => ({ id: p.id, n: p.ids.length, bpm: p.ids.map(id => RESKIN.smart.feats(RESKIN.lib.get(id)).rb) }))')
        run = [x for x in sm if x['id'] == 'smart:run'][0]
        ok(len(sm) == 4 and run['bpm'] == sorted(run['bpm']), '智慧歌單：嗨歌／運動／放鬆／深夜，運動照 BPM 由慢到快（%s）' % [(x['id'], x['n']) for x in sm])
        ev("RESKIN.library.open('lists')"); pg.wait_for_timeout(600); pg.screenshot(path=os.path.join(out, 'ui-smart.png')); ev('RESKIN.ui.closeSheet(true)')
        # --- karaoke ---
        ev('(id) => RESKIN.player.playFrom(RESKIN.lib.list().map(t => t.id), id, { type: "library" })', first); pg.wait_for_timeout(500)
        ev('RESKIN.stage.show("ink", { instant: true, silent: true })'); pg.wait_for_timeout(400)
        pg.keyboard.press('y'); ev('RESKIN.player.seek(1.6)'); pg.wait_for_timeout(700)
        k1 = ev('document.querySelectorAll("#lyrics p.on .kc.k1").length')
        ok(k1 >= 1 and ev('!!document.querySelector("#lyrics p.on .kc.kn")') and ev('document.getElementById("lyrics").dataset.look') == 'ink', '卡拉 OK 歌詞：一個字一個字亮起，字體特效跟著 Skin（水墨：%d 字）' % k1)
        ok(ev('document.getElementById("stage").classList.contains("defocus")'), '景深：歌詞打開時 Skin 對焦到後面')
        pg.screenshot(path=os.path.join(out, 'ui-karaoke.png'))
        pg.keyboard.press('y'); pg.wait_for_timeout(300)
        # --- listening report ---
        ev('() => { RESKIN.lib.list().forEach((t, i) => { for (let k = 0; k < 40 + i * 30; k++) RESKIN.stats._add(t.id, 1); }); }')
        ev('RESKIN.report.open()'); pg.wait_for_timeout(700)
        nsl = ev('document.querySelectorAll("#report .rp-s").length')
        for _ in range(nsl - 1):
            pg.mouse.click(340, 400); pg.wait_for_timeout(250)
        pg.wait_for_selector('#report .rp-card img', timeout=15000)
        pg.screenshot(path=os.path.join(out, 'ui-report.png'))
        ok(nsl >= 7, '聽歌報告：總時數、主打歌、最愛歌手、最愛 Skin、時鐘、音樂人格、分享圖（%d 張）' % nsl)
        ev('RESKIN.report.close()'); pg.wait_for_timeout(500)
        # --- music video ---
        ev('() => { const t = RESKIN.lib.list().find(t => t.demo); RESKIN.player.playFrom([t.id], t.id, { type: "library" }); }'); pg.wait_for_timeout(700)
        ev('RESKIN.clip.open()'); pg.wait_for_timeout(600)
        pg.click('[data-cl-len="15"]'); pg.click('[data-cl="go"]')
        try:
            pg.wait_for_function('RESKIN.ui.sheetKind() === "share" && !!document.querySelector(".share-vid")', timeout=60000)
            pg.wait_for_function('document.querySelector(".share-vid").readyState >= 1', timeout=10000)
            v = ev('(() => { const x = document.querySelector(".share-vid"); return [x.videoWidth, x.videoHeight, x.duration]; })()')
            ok(v[0] == 720 and v[1] == 1280 and 13 <= (v[2] if v[2] == v[2] else 15) <= 17, '音樂短片：錄出 9:16、15 秒的影片（%s）' % v)
            pg.screenshot(path=os.path.join(out, 'ui-clip.png'))
        except Exception as e:
            ok(False, '音樂短片：' + str(e)[:120])
        ev('RESKIN.ui.closeSheet(true)')
        ok(not errs, '新功能：沒有程式錯誤' + ('' if not errs else '：' + ' | '.join(errs[:5])))
        ctx.close(); b.close()


def beat_songs(d):
    """Four synthesized songs with known beats (22050 Hz mono float32): EDM 128, syncopated pop 100, ballad 72 (piano
    intro, drums later), hip-hop 90 with an 808. The kind of songs the old onset detector got wrong."""
    import numpy as np
    os.makedirs(d, exist_ok=True)
    SR = 22050; rng = np.random.default_rng(7)
    def kick(g=1.0):
        n = int(SR * 0.35); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28)
        return g * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    def snare(g=0.6):
        n = int(SR * 0.22); t = np.arange(n) / SR; x = np.convolve(rng.standard_normal(n), [1, -0.8], 'same')
        return g * (0.6 * x * np.exp(-t * 18) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25))
    def hat(g=0.18):
        n = int(SR * 0.05); t = np.arange(n) / SR; x = rng.standard_normal(n); x = x - np.convolve(x, np.ones(4) / 4, 'same')
        return g * x * np.exp(-t * 90)
    def tone(freq, dur, g, a=0.01, dk=None, harm=(1, .5, .33, .25), vib=0):
        n = int(SR * dur); t = np.arange(n) / SR; f = freq * (1 + vib * np.sin(2 * np.pi * 5.5 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
        x = sum(h * np.sin((i + 1) * ph) for i, h in enumerate(harm))
        return g * x * np.minimum(1, t / a) * (np.exp(-t / dk) if dk else 1) * np.minimum(1, (dur - t) / 0.03)
    def place(buf, x, t):
        i = int(t * SR); j = min(len(buf), i + len(x))
        if i < len(buf): buf[i:j] += x[: j - i]
    NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
    PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    spec = {'edm': (128, 40, 4), 'pop': (100, 36, 4), 'ballad': (72, 24, 4), 'hiphop': (90, 30, 2)}
    out = {}
    for kind, (bpm, bars, intro) in spec.items():
        bl = 60 / bpm; buf = np.zeros(int(SR * (bars * 4 * bl + 2))); beats = []
        for bar in range(bars):
            t0 = bar * 4 * bl; ch = PROG[bar % 4]; drums = bar >= intro; chorus = (bar // 8) % 2 == 1
            if drums: beats += [t0 + k * bl for k in range(4)]
            if kind == 'edm':
                for k in range(4):
                    if drums: place(buf, kick(1.0), t0 + k * bl)
                    if drums and k in (1, 3): place(buf, snare(0.45), t0 + k * bl)
                    for e in range(2): place(buf, hat(0.15 if e else 0.08), t0 + (k + e / 2) * bl)
                    place(buf, tone(NOTE(ch[0] - 24), bl * 0.45, 0.35, a=0.005, dk=0.2), t0 + (k + 0.5) * bl)
                for m in ch: place(buf, tone(NOTE(m), 4 * bl, 0.06, a=0.3, harm=(1, .6, .4, .3, .2)), t0)
            if kind == 'pop':
                for p in (0, 1.5, 2):
                    if drums: place(buf, kick(0.8), t0 + p * bl)
                for p in (1, 3):
                    if drums: place(buf, snare(0.55), t0 + p * bl)
                for e in range(8):
                    if drums: place(buf, hat(0.12 if e % 2 else 0.17), t0 + e * bl / 2)
                for p, Ln in [(0, 1.4), (1.5, 1.0), (2.75, 1.2)]: place(buf, tone(NOTE(ch[0] - 24), Ln * bl, 0.45, a=0.008, dk=0.9, harm=(1, .7, .3, .15)), t0 + p * bl)
                for p in (0, 1.5, 3):
                    for m in ch: place(buf, tone(NOTE(m), 1.2 * bl, 0.07, a=0.004, dk=0.5), t0 + p * bl)
                for i, m in enumerate([ch[2], ch[1], ch[2], ch[0]]): place(buf, tone(NOTE(m), bl * 0.95, 0.22 if chorus else 0.14, a=0.06, harm=(1, .6, .5, .3, .2), vib=0.012), t0 + (i + 0.25) * bl)
            if kind == 'ballad':
                for k in range(4):
                    for m in ch: place(buf, tone(NOTE(m), 1.05 * bl, 0.09, a=0.004, dk=0.9), t0 + k * bl)
                    if drums and k in (0, 2): place(buf, kick(0.45), t0 + k * bl)
                    if drums and k in (1, 3): place(buf, snare(0.3), t0 + k * bl)
                place(buf, tone(NOTE(ch[0] - 24), 4 * bl, 0.35, a=0.05, dk=3.0, harm=(1, .5, .2)), t0)
                for m in ch: place(buf, tone(NOTE(m + 12), 4 * bl, 0.035, a=0.8, harm=(1, .5, .4, .3)), t0)
                for i, m in enumerate([ch[2] + 12, ch[1] + 12]): place(buf, tone(NOTE(m), 2 * bl * 0.95, 0.12, a=0.1, harm=(1, .5, .4, .2), vib=0.01), t0 + i * 2 * bl + 0.1)
            if kind == 'hiphop':
                for p in (0, 1.75, 2.5):
                    if drums: place(buf, kick(0.5), t0 + p * bl)
                    place(buf, tone(NOTE(ch[0] - 24), 0.9 * bl, 0.55, a=0.004, dk=1.4, harm=(1, .25)), t0 + p * bl)
                for p in (1, 3):
                    if drums: place(buf, snare(0.6), t0 + p * bl)
                for e in range(8):
                    if drums: place(buf, hat(0.14), t0 + e * bl / 2 + (0.08 * bl if e % 2 else 0))
                for m in ch: place(buf, tone(NOTE(m), 4 * bl, 0.05, a=0.02, dk=2.5), t0)
        buf /= np.max(np.abs(buf)) * 1.05
        f = os.path.join(d, kind + '.f32'); buf.astype(np.float32).tofile(f)
        out[kind] = {'file': f, 'bpm': bpm, 'beats': beats, 'bar': 4 * bl}
    return out


def run_beats(analysis_js=None):
    """The beat engine on its own (Node runs analysis.js): tempo, every beat, the bar's first beat."""
    node = shutil.which('node')
    if not node:
        print('（略過節拍引擎離線測試：這台沒有 node）'); return
    songs = beat_songs('/tmp/reskin-beats')
    js = """const fs = require('fs'); const src = fs.readFileSync(process.argv[2], 'utf8');
      const beatCore = new Function(src.slice(src.indexOf('function beatCore'), src.indexOf('function analyzeCore')) + ';return beatCore')();
      const out = {}; for (const f of process.argv.slice(3)) { const b = fs.readFileSync(f); const x = new Float32Array(b.buffer, b.byteOffset, b.length / 4).slice();
        const r = beatCore(x, 22050); out[f] = { bpm: r.bpm, beats: Array.from(r.beats), bpos: Array.from(r.bpos), kicks: r.kicks.length, tones: r.tones.length }; }
      console.log(JSON.stringify(out));"""
    jf = '/tmp/reskin-beats/run.js'; open(jf, 'w').write(js)
    res = json.loads(subprocess.check_output([node, jf, analysis_js or os.path.join(HERE, 'src', 'analysis.js')] + [v['file'] for v in songs.values()], timeout=300))
    names = {'edm': '舞曲 128', 'pop': '切分流行 100', 'ballad': '抒情 72', 'hiphop': '嘻哈 90'}
    for kind, v in songs.items():
        r = res[v['file']]; T = v['beats']; B = r['beats']; tol = 0.07
        D = [t for t in B if T[0] - 0.2 <= t <= T[-1] + 0.2]
        hit = sum(1 for t in T if any(abs(u - t) <= tol for u in D))
        P = hit / max(1, len(D)); Rc = hit / len(T); F = 2 * P * Rc / max(1e-9, P + Rc)
        good = tot = 0
        for i, t in enumerate(B):
            m = [u for u in T if abs(u - t) <= tol]
            if not m: continue
            tot += 1; k = (m[0] - T[0]) / v['bar']; good += (abs(k - round(k)) < 0.01) == (r['bpos'][i] == 0)
        ok(abs(r['bpm'] / v['bpm'] - 1) < 0.015 and F >= 0.95 and good >= 0.9 * tot,
           '節拍引擎（%s）：速度 %.1f、每一拍 F=%.0f%%、每小節第一拍 %d/%d' % (names[kind], r['bpm'], F * 100, good, tot))


def check_beat_clock(pg, ev, out, new_skins=True):
    """The beat clock in the app: the demo's grid, beats firing on time, the latency setting, the sync test, the chip
    (and, in the main edition, the rhythm-game and particle skins)."""
    ev('() => { const t = RESKIN.lib.list().find(t => t.demo); RESKIN.player.playFrom([t.id], t.id, { type: "library" }); }'); pg.wait_for_timeout(900)
    g = ev('(async () => { const r = await RESKIN.analysis.get(RESKIN.player.current().id); const B = Array.from(r.beats), P = Array.from(r.bpos); return { v: r.v, bpm: r.bpm, gaps: B.slice(1).map((x, i) => x - B[i]), down: B.filter((x, i) => P[i] === 0), tones: (r.tones || []).length }; })()')
    ok(g['v'] == 3 and abs(g['bpm'] - 120) < 0.6 and max(abs(x - 0.5) for x in g['gaps']) < 0.02 and all(abs(x / 2 - round(x / 2)) < 0.02 for x in g['down']) and g['tones'] > 0,
       '節拍格線：示範曲 120 BPM、每拍 0.5 秒、每小節第一拍都在 2 秒的倍數上')
    ev('RESKIN.player.seek(20)'); ev('RESKIN.player.play()'); pg.wait_for_timeout(600)
    ev('() => { window.__bt = []; RESKIN.viz.onBeat((s, i) => window.__bt.push([RESKIN.player.time(), i.bpos, i.down])); }')
    pg.wait_for_timeout(3200)
    bt = ev('window.__bt')
    ph = [((t + 0.035) % 0.5) for t, _, _ in bt]
    late = [min(x, 0.5 - x) for x in ph]
    ok(ev('RESKIN.viz.synced') and 5 <= len(bt) <= 8 and max(late) < 0.09 and all(d == (p == 0) for _, p, d in bt),
       '拍子事件：照節拍格線準時發出（3 秒 %d 拍、最晚 %.0f 毫秒）' % (len(bt), max(late) * 1000 if late else -1))
    ev('RESKIN.settings.set("latency", 200)'); pg.wait_for_timeout(200)
    d = ev('RESKIN.viz.t - RESKIN.player.time()')
    ev('RESKIN.settings.set("latency", 0)')
    ok(abs(d - (0.035 - 0.2)) < 0.05, '對拍滑桿：往右調（藍牙耳機比較慢）畫面就晚一點（%.0f 毫秒）' % (d * 1000))
    ev('() => { RESKIN.viz.synced = false; }'); pg.wait_for_timeout(2300)
    chip = ev('(document.getElementById("syncChip") || {}).className')
    ev('() => { RESKIN.viz.synced = true; }'); pg.wait_for_timeout(600)
    chip2 = ev('(document.getElementById("syncChip") || {}).className')
    ok(chip == 'wait' and chip2 == 'ok', '「正在對拍」提示：還沒對上拍時出現，對上後說一聲就收起來（%s → %s）' % (chip, chip2))
    ev('RESKIN.sync.open()'); pg.wait_for_timeout(500)
    pg.click('[data-sy="play"]'); pg.wait_for_timeout(1400)
    flashed = ev('!!document.querySelector(".sy-ring.on")')
    pg.click('[data-sy="+10"]'); lat = ev('RESKIN.settings.get("latency")')
    pg.screenshot(path=os.path.join(out, 'ui-sync.png'))
    pg.click('[data-sy="zero"]'); ev('RESKIN.ui.closeSheet()'); pg.wait_for_timeout(700)
    ok(flashed and lat == 10 and ev('RESKIN.player.isPlaying()'), '對拍測試：滴答聲配閃光、可以微調，關掉後音樂接著播')
    if not new_skins:
        return
    ev('RESKIN.stage.show("rhythm", { instant: true, silent: true })'); ev('RESKIN.player.seek(24)'); pg.wait_for_timeout(3500)
    sc = ev('parseInt(document.querySelector(".skin-rhythm [data-rr=score]").textContent, 10)')
    lv = ev('document.querySelector(".skin-rhythm [data-rr=lv]").textContent')
    pg.screenshot(path=os.path.join(out, 'ui-rhythm.png'))
    ok(sc > 0 and lv.startswith('LV ') and lv != 'LV --', '節奏大師：音符照這首的鼓聲寫成譜，打中就計分（%s、%d 分）' % (lv, sc))
    ev('RESKIN.stage.show("particles", { instant: true, silent: true })'); pg.wait_for_timeout(1200)
    ok(not ev('RESKIN.stage.root().classList.contains("pa-flat")'), '粒子封面：WebGL 粒子啟動（不是退回靜態封面）')
    ev('RESKIN.stage.show("neon", { instant: true, silent: true })'); pg.wait_for_timeout(300)


def folder_fixtures(d, fx):
    """Folders for the folder-import checks: an album (nested, with junk and a cover), 40 songs, a folder without songs."""
    import numpy as np
    from PIL import Image
    shutil.rmtree(d, ignore_errors=True)
    sr = 22050

    def wav(path, freq, secs, seed):
        rng = np.random.default_rng(seed); t = np.arange(int(secs * sr)) / sr
        x = 0.4 * np.sin(2 * np.pi * freq * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 * t)) + 0.02 * rng.standard_normal(t.size)
        d16 = (np.clip(np.stack([x, x], 1), -1, 1) * 32767).astype('<i2')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', 36 + d16.nbytes) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 2, sr, sr * 4, 4, 16) + b'data' + struct.pack('<I', d16.nbytes) + d16.tobytes())
    A = os.path.join(d, 'album', '專輯資料夾')
    os.makedirs(A)
    shutil.copy(os.path.join(fx, 't1.mp3'), os.path.join(A, '01 開場.mp3'))  # the same song as t1.mp3: already in the library
    wav(os.path.join(A, 'disc2', '02 夜行.wav'), 330, 6, 1)
    wav(os.path.join(A, 'disc2', '10 尾聲.wav'), 392, 5, 2)
    wav(os.path.join(A, 'disc2', '3 中場.wav'), 262, 5, 3)
    rng = np.random.default_rng(9)
    img = (np.stack([np.full((400, 400), 20), np.full((400, 400), 200), np.full((400, 400), 190)], 2) + rng.integers(0, 40, (400, 400, 3))).astype('uint8')
    Image.fromarray(img).save(os.path.join(A, 'cover.jpg'), quality=90)
    open(os.path.join(A, '._01 開場.mp3'), 'wb').write(os.urandom(4096))
    open(os.path.join(A, '.DS_Store'), 'wb').write(os.urandom(6148))
    open(os.path.join(A, 'notes.txt'), 'w').write('liner notes')
    open(os.path.join(A, 'old song.wma'), 'wb').write(os.urandom(20000))
    M = os.path.join(d, 'many', '一大批')
    for i in range(40):
        wav(os.path.join(M, 'part%d' % (i // 10), 'song %02d.wav' % i), 200 + i * 7, 8, 100 + i)
    E = os.path.join(d, 'empty', '只有圖片')
    os.makedirs(E); Image.fromarray(img).save(os.path.join(E, 'photo.jpg'))
    return d


def run_folders(url, out, fd, fx):
    from playwright.sync_api import sync_playwright
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL)
        ctx = b.new_context(**PHONE)
        pg = ctx.new_page()
        pg.add_init_script(HIDE)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        done = lambda t=90000: pg.wait_for_function('document.getElementById("busy").hidden', timeout=t)
        last = lambda: ev('(() => { const t = document.querySelectorAll("#toasts .toast > span"); return t.length ? t[t.length - 1].textContent : ""; })()')
        pg.goto(url); pg.wait_for_function("!!window.RESKIN && !document.getElementById('splash')", timeout=20000); pg.wait_for_timeout(800)
        ok(pg.is_visible('#empty [data-act="import-folder"]'), '空歌庫：有「整個資料夾」按鈕')
        pg.screenshot(path=os.path.join(out, 'ui-empty.png'))
        pg.set_input_files('#fileIn', [os.path.join(fx, 't1.mp3')]); done()
        pg.set_input_files('#folderIn', os.path.join(fd, 'album', '專輯資料夾')); done(); pg.wait_for_timeout(300)
        L = ev('RESKIN.lib.list().map(t => ({ title: t.title, name: t.name, cover: t.cover }))')
        msg = last()
        ok(len(L) == 4 and '加入 3 首' in msg and '1 首已經在歌庫' in msg, '資料夾：子資料夾的歌也進來，已在歌庫的跳過（%s）' % msg)
        ok('WMA' in msg and not any(x['name'].startswith('.') or x['name'].endswith(('.txt', '.wma')) for x in L), '資料夾：略過 ._ 檔、.DS_Store、文字檔，WMA 說明這台不能播')
        ok([x['title'] for x in L[:3]] == ['夜行', '中場', '尾聲'], '資料夾：照資料夾順序，去掉檔名前的曲序（%s）' % [x['title'] for x in L[:3]])
        ok(all(x['cover'] == 1 for x in L), '資料夾：沒有內嵌封面的歌用資料夾裡的 cover.jpg')
        btn = pg.locator('#toasts .toast button', has_text='存成歌單')
        ok(btn.count() == 1, '資料夾：提示上有「存成歌單」')
        if btn.count():
            btn.first.click(); pg.wait_for_timeout(500)
            if pg.is_visible('#modal .md-i'):   # the album has a disc2 subfolder: one playlist for the whole folder
                pg.click('#modal .md-i:has-text("存成一個歌單")'); pg.wait_for_timeout(500)
        P = ev('RESKIN.lib.pl.all().filter(p => p.id !== "fav").map(p => ({ name: p.name, titles: p.ids.map(id => RESKIN.lib.get(id).title) }))')
        ok(P == [{'name': '專輯資料夾', 'titles': ['霓虹夜奔', '夜行', '中場', '尾聲']}], '存成歌單：用資料夾名稱、照資料夾順序、已在歌庫的也算')
        ev("RESKIN.library.open('songs')"); pg.wait_for_timeout(600)
        pg.click('[data-l="import"]'); pg.wait_for_timeout(450)
        pg.screenshot(path=os.path.join(out, 'ui-import-menu.png'))
        try:
            with pg.expect_file_chooser(timeout=5000) as fc:
                pg.click('#modal .md-i:has-text("整個資料夾")')
            ok(fc.value.element.get_attribute('id') == 'folderIn', '「匯入」選單：選「整個資料夾」打開的是資料夾選擇器')
            fc.value.set_files(os.path.join(fd, 'empty', '只有圖片')); pg.wait_for_timeout(1200)
            ok('沒有音樂檔' in last() and ev('RESKIN.lib.count()') == 4, '沒有歌的資料夾：說清楚、什麼都不加')
        except Exception as e:
            ok(False, '「匯入」選單：' + str(e)[:120])
        # a big folder: stop halfway, then import it again
        pg.set_input_files('#folderIn', os.path.join(fd, 'many', '一大批'))
        pg.wait_for_function('/^[3-9] \\//.test(document.getElementById("busyText").textContent)', timeout=30000)
        pg.screenshot(path=os.path.join(out, 'ui-import-busy.png'))
        pg.click('#busyStop'); done()
        n1 = ev('RESKIN.lib.count()') - 4
        ok(0 < n1 < 40 and '已停止' in last(), '大量匯入：按「停止匯入」會停（停在第 %d 首）' % n1)
        pg.set_input_files('#folderIn', os.path.join(fd, 'many', '一大批')); done()
        ok(ev('RESKIN.lib.count()') == 44 and ('%d 首已經在歌庫' % n1) in last(), '再匯入一次：補上沒放的，放過的跳過')
        pg.wait_for_function('RESKIN.analysis.left() === 0', timeout=180000)
        # storage runs out halfway
        ev('() => RESKIN.lib.remove(RESKIN.lib.list().slice(0, 20).map(t => t.id))'); pg.wait_for_timeout(300)
        ev("""() => { const real = RESKIN.db.putAudio; let n = 0; window.__realPut = real; RESKIN.db.putAudio = async (id, blob) => { if (++n > 6) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return real(id, blob); }; }""")
        ev('window.__hid = true; document.dispatchEvent(new Event("visibilitychange"))')
        pg.set_input_files('#folderIn', os.path.join(fd, 'many', '一大批'))
        try:
            pg.wait_for_selector('#modal:not([hidden]) .md', timeout=60000); pg.wait_for_timeout(300)
            box = pg.inner_text('#modal .md')
            counts = ev('Promise.all([RESKIN.db.keys("audio"), RESKIN.db.keys("tracks")]).then(([a, t]) => [a.length, t.length])')
            ok('儲存空間不夠了' in box and '加入 6 首' in box and counts[0] == counts[1], '空間不夠：停下來說清楚，沒有留下只有一半的歌')
            pg.click('#modal [data-r="0"]'); pg.wait_for_timeout(300)
        except Exception as e:
            ok(False, '空間不夠：' + str(e)[:120])
        ev('() => { RESKIN.db.putAudio = window.__realPut; }')
        a0 = ev('RESKIN.lib.all().filter(t => !t.an).length'); pg.wait_for_timeout(2500)
        a1 = ev('RESKIN.lib.all().filter(t => !t.an).length')
        ok(a0 == a1 == 6, '螢幕關著：不分析節奏（等畫面打開）')
        ev('window.__hid = false; document.dispatchEvent(new Event("visibilitychange"))')
        try:
            pg.wait_for_function('RESKIN.lib.all().every(t => t.an)', timeout=60000); ok(True, '畫面打開：接著分析')
        except Exception:
            ok(False, '畫面打開：接著分析')
        # a library of 1,000 songs (records only): the list draws the first rows, the rest while scrolling
        ev("""async () => { const db = await RESKIN.db.open(); await new Promise((res, rej) => { const tx = db.transaction('tracks', 'readwrite'); const os = tx.objectStore('tracks');
          for (let i = 0; i < 1000; i++) os.put({ id: 'big' + i, key: 'bigk' + i, title: '大量測試 ' + i, artist: '', album: '', duration: 180, size: 1, type: 'audio/mpeg', name: 'b' + i + '.mp3', added: 1000 - i, cover: 0, colors: null, an: 1, bpm: 0, energy: .5, plays: 0 });
          tx.oncomplete = res; tx.onerror = rej; }); }""")
        pg.reload(); pg.wait_for_function("!!window.RESKIN && !document.getElementById('splash')", timeout=30000)
        ev("RESKIN.library.open('songs')"); pg.wait_for_timeout(600)
        rows = lambda: ev("document.querySelectorAll('#sheetBody .sc .row').length")
        r0 = rows()
        for _ in range(15):
            ev("document.querySelector('#sheetBody .sc').scrollTop = 1e9"); pg.wait_for_timeout(200)
        n = ev('RESKIN.lib.count()')
        ok(r0 == 150 and rows() == n, '上千首的歌庫：先畫 150 首，捲到底全部都在（%d／%d）' % (rows(), n))
        ok(not errs, '資料夾匯入：沒有程式錯誤' + ('' if not errs else '：' + ' | '.join(errs[:5])))
        ctx.close(); b.close()


BLOCK_BLOBS = """(() => { const real = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => (b && ((window.__noBlobAudio && /^audio\\//.test(b.type)) || (window.__noBlobImg && /^image\\//.test(b.type)))) ? 'blob:' + location.origin + '/refused-' + Math.random().toString(36).slice(2) : real(b); })();"""


def run_fallbacks(url, claude_url, out, fx):
    """iPhone web views that refuse blob: links or cannot read stored files back (the Claude app): the player must
    still play, covers must still show, and when nothing works it must stop and explain instead of skipping on."""
    from playwright.sync_api import sync_playwright
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] + GL)

        def page(u, init=''):
            ctx = b.new_context(**PHONE)
            ctx.add_init_script(BLOCK_BLOBS + init)
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(u); pg.wait_for_function("!!window.RESKIN && !document.getElementById('splash')", timeout=20000); pg.wait_for_timeout(500)
            return ctx, pg
        files = [os.path.join(fx, f) for f in ('t1.mp3', 't3.flac', '痞子葳 - 雨天散步.wav')]
        last = lambda pg: pg.evaluate('(() => { const t = document.querySelectorAll("#toasts .toast > span"); return t.length ? t[t.length - 1].textContent : ""; })()')

        # 1) stored as plain bytes; an old Blob record is read once and stored as bytes from then on
        ctx, pg = page(url); ev = pg.evaluate
        five = files + [os.path.join(fx, 't2.m4a'), os.path.join(fx, 'big5.mp3')]
        pg.set_input_files('#fileIn', five); pg.wait_for_function('document.getElementById("busy").hidden && RESKIN.lib.count() === 5', timeout=60000)
        kinds = ev('Promise.all(RESKIN.lib.all().map(t => RESKIN.db.get("audio", t.id))).then(vs => vs.map(v => v instanceof Blob ? "blob" : (v && v.buf ? "bytes" : "none")))')
        ok(kinds == ['bytes'] * 5, '存歌：用純位元組存，不存 Blob（%s）' % kinds)
        ok(ev('RESKIN.db.keys("covers").then(ks => Promise.all(ks.map(k => RESKIN.db.get("covers", k)))).then(vs => vs.length > 0 && vs.every(v => v && v.buf && !(v instanceof Blob)))'), '存封面：也是純位元組')
        moved = ev("""async () => { const t = RESKIN.lib.list()[0]; const raw = await RESKIN.db.getAudioRaw(t.id);
            await RESKIN.db.put('audio', new Blob([raw.buf], { type: raw.type }), t.id);
            const b = await RESKIN.db.getAudio(t.id); await new Promise(r => setTimeout(r, 400));
            const v = await RESKIN.db.get('audio', t.id); return b.size === raw.buf.byteLength && !(v instanceof Blob) && v.buf.byteLength === raw.buf.byteLength; }""")
        ok(moved, '舊版存的 Blob：讀一次就轉存成純位元組')
        # 2) a stored file that cannot be read back: marked, explained, and repaired by importing it again
        ev("""() => { const real = RESKIN.db.getRaw; window.__realRaw = real; RESKIN.db.getRaw = async (s, k) => { if (s === 'audio' && k === window.__lostId) { const e = new Error('unreadable'); e.lost = true; throw e; } return real(s, k); }; }""")
        lid = ev('(() => { const q = RESKIN.player.queue(), i = RESKIN.player.index(); const id = q[(i + 2) % q.length]; window.__lostId = id; return id; })()')
        lname = ev('(id) => RESKIN.lib.get(id).name', lid)
        ev('(id) => RESKIN.player.playFrom(RESKIN.lib.list().map(t => t.id), id, { type: "library" })', lid); pg.wait_for_timeout(1200)
        said = ev('Array.from(document.querySelectorAll("#toasts .toast > span")).some(t => t.textContent.includes("讀不到"))')
        ok(ev('(id) => RESKIN.lib.get(id).lost === 1', lid) and said and not ev('RESKIN.player.isPlaying()'), '檔案讀不到：標記起來、說「重新匯入就會補回」、不亂跳')
        ev('() => { RESKIN.db.getRaw = window.__realRaw; }')
        pg.set_input_files('#fileIn', [os.path.join(fx, lname)]); pg.wait_for_function('document.getElementById("busy").hidden', timeout=30000); pg.wait_for_timeout(300)
        ok('補回 1 首' in last(pg) and not ev('(id) => RESKIN.lib.get(id).lost', lid) and ev('RESKIN.lib.count()') == 5, '重新匯入同一首：補回來，不會多一首（%s）' % last(pg))
        ev('(id) => RESKIN.player.playFrom(RESKIN.lib.list().map(t => t.id), id, { type: "library" })', lid)
        try:
            pg.wait_for_function('RESKIN.player.isPlaying() && RESKIN.player.time() > 0.3', timeout=15000); ok(True, '補回的歌：播得出來')
        except Exception:
            ok(False, '補回的歌：播得出來')
        ctx.close()

        # 3) blob: links refused for music and pictures: data: links take over
        ctx, pg = page(url, 'window.__noBlobAudio = true; window.__noBlobImg = true;'); ev = pg.evaluate
        pg.set_input_files('#fileIn', files); pg.wait_for_function('document.getElementById("busy").hidden && RESKIN.lib.count() === 3', timeout=60000)
        ev('() => { const all = RESKIN.lib.list(); RESKIN.player.playFrom(all.map(t => t.id), all[0].id, { type: "library" }); }')
        try:
            pg.wait_for_function('RESKIN.player.isPlaying() && RESKIN.player.time() > 0.3', timeout=20000)
            ok(ev('RESKIN.settings.get("srcMode")') == 'data' and ev('RESKIN.player.els[0].src.startsWith("data:") || RESKIN.player.els[1].src.startsWith("data:")'), 'blob: 連結被擋：自動改用 data: 連結，歌照樣播')
        except Exception:
            ok(False, 'blob: 連結被擋：自動改用 data: 連結，歌照樣播')
        ev('RESKIN.player.next()')
        try:
            pg.wait_for_function('RESKIN.player.isPlaying() && RESKIN.player.time() > 0.3', timeout=20000); ok('播不了' not in last(pg), '下一首：直接用 data: 連結，不再先失敗一次')
        except Exception:
            ok(False, '下一首：直接用 data: 連結，不再先失敗一次')
        cov = ev('RESKIN.art.coverUrl(RESKIN.player.current(), "thumb")')
        ok(ev('RESKIN.blobImages') is False and str(cov).startswith('data:image'), '圖片的 blob: 連結被擋：封面改用 data: 連結')
        pg.screenshot(path=os.path.join(out, 'fallback-data-links.png'))
        ctx.close()

        # 4) nothing plays at all: stop after three songs and explain (web copy, then the Claude copy with a link)
        for u, tag in ((url, 'web'), (claude_url, 'claude')):
            if not u:
                continue
            # every stored song comes back as noise, from the very start (so no good link is ever prepared)
            ctx, pg = page(u, """const iv = setInterval(() => { if (window.RESKIN && RESKIN.db) { clearInterval(iv); RESKIN.db.getAudio = async () => new Blob([new Uint8Array(4096).map((_, i) => (i * 73) & 255)], { type: 'audio/mpeg' }); } }, 2);"""); ev = pg.evaluate
            pg.set_input_files('#fileIn', files + [os.path.join(fx, 't2.m4a'), os.path.join(fx, 'big5.mp3')]); pg.wait_for_function('document.getElementById("busy").hidden && RESKIN.lib.count() === 5', timeout=60000)
            ev('() => { const all = RESKIN.lib.list(); RESKIN.player.playFrom(all.map(t => t.id), all[0].id, { type: "library" }); }')
            try:
                pg.wait_for_selector('#modal:not([hidden]) .md', timeout=30000); pg.wait_for_timeout(1500)
                box = pg.inner_text('#modal .md')
                warned = ev('RESKIN.lib.all().filter(t => t.warn).length')
                good = not ev('RESKIN.player.isPlaying()') and warned == 3
                if tag == 'claude':
                    good = good and '網頁版' in box and pg.get_attribute('#modal .md-link', 'href') == 'https://pzwei0105.github.io/PZ-Games/apps/reskin/'
                    pg.screenshot(path=os.path.join(out, 'fallback-explain-claude.png'))
                else:
                    good = good and '連續好幾首都播不了' in box
                ok(good, '%s：全都播不了時，第三首就停下來說明（不會一路跳完整個歌庫）' % ('Claude 版' if tag == 'claude' else '網頁版'))
            except Exception as e:
                ok(False, '%s：全都播不了時停下來說明：%s' % (tag, str(e)[:100]))
            ctx.close()
        ok(not errs, '讀不到時的處理：沒有程式錯誤' + ('' if not errs else '：' + ' | '.join(errs[:5])))
        b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude')
    ap.add_argument('--friend')
    ap.add_argument('--one')
    ap.add_argument('--out', default='/tmp/reskin-check')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    fx = fixtures('/tmp/reskin-fixtures')
    run_beats()
    srv = serve(REPO)
    s2 = serve(a.claude) if a.claude else None
    run_fallbacks(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', f'http://127.0.0.1:{s2.server_address[1]}/' if s2 else None, a.out, fx)
    run_folders(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', a.out, folder_fixtures('/tmp/reskin-folders', fx), fx)
    run_features(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', a.out, feature_fixtures('/tmp/reskin-feat', fx))
    run(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', a.out, fx, srv)
    if a.claude:
        print('--- Claude 版 ---')
        os.makedirs(os.path.join(a.out, 'claude'), exist_ok=True)
        run(f'http://127.0.0.1:{s2.server_address[1]}/', os.path.join(a.out, 'claude'), fx, None)
    if a.friend:
        print('--- 朋友版 ---')
        page = open(os.path.join(a.friend, 'index.html'), encoding='utf-8').read()
        ok(not any(w in page for w in ('痞子葳', '收藏庫', 'PZ 遊戲收藏', 'pzwei0105', 'PZ-Games')), '朋友版：沒有痞子葳的名字、沒有收藏庫的網址或字樣')
        s3 = serve(a.friend)
        os.makedirs(os.path.join(a.out, 'friend'), exist_ok=True)
        run(f'http://127.0.0.1:{s3.server_address[1]}/', os.path.join(a.out, 'friend'), fx, s3)
    if a.one:
        print('--- 朋友版（單一檔案）---')
        page = open(a.one, encoding='utf-8').read()
        ok(not any(w in page for w in ('痞子葳', '收藏庫', 'PZ 遊戲收藏', 'pzwei0105', 'PZ-Games')), '單一檔案：沒有痞子葳的名字、沒有收藏庫的網址或字樣')
        ok('rel="manifest" href="data:' in page and 'rel="apple-touch-icon" href="data:' in page and 'window.RESKIN_ONEFILE = true;' in page, '單一檔案：主畫面圖示和 manifest 都在檔案裡，不另外抓 sw.js')
        d1 = '/tmp/reskin-onefile-site'
        shutil.rmtree(d1, ignore_errors=True); os.makedirs(d1); shutil.copy(a.one, os.path.join(d1, 'index.html'))   # the site is this one file and nothing else
        s4 = serve(d1)
        os.makedirs(os.path.join(a.out, 'one'), exist_ok=True)
        run(f'http://127.0.0.1:{s4.server_address[1]}/', os.path.join(a.out, 'one'), fx, None)
    print('\n截圖在', a.out)
    if BAD:
        print('BAD', len(BAD)); sys.exit(1)
    print('全部 OK')


if __name__ == '__main__':
    main()
