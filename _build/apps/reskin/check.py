#!/usr/bin/env python3
"""耳目一新 RESKIN 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/reskin/check.py                      # 網頁版（apps/reskin/）
  python3 _build/apps/reskin/check.py --claude /tmp/rs-c   # 另外檢查 build.py --claude-out 輸出的 Claude 版

標籤      MP3（ID3v2.3＋封面）、M4A（封面）、FLAC（Vorbis＋圖片）、WAV（從檔名猜歌手）、Big5 編碼的舊 MP3 標籤
分析      每首都算出節奏（BPM 誤差 ±3）與頻譜
播放      單軌換帶：播完接下一首；雙軌接力：螢幕關著時提前交棒、記成功；鎖屏沒接上 → 自動改雙軌＋「繼續播放」；
          單曲循環、上一首重頭、隨機保留目前這首、刪掉正在播的歌、壞掉的檔案跳過
介面      空歌庫→示範曲、衣櫃左右滑試穿＋就穿這套、歌單綁 Skin、每首換一套、DIY 存檔、派對模式、重新整理後接著上次
資料夾    整個資料夾匯入（子資料夾、略過 ._ 檔／.DS_Store／文字檔、WMA 說明不能播、已在歌庫的跳過、資料夾裡的
          cover.jpg 當封面、去掉檔名前的曲序、照資料夾順序）、存成歌單、「匯入」選單開資料夾、沒有歌的資料夾、
          中途停止再匯入、空間不夠停下來不留殘檔、螢幕關著不分析節奏、上千首的歌庫邊捲邊畫
每套 Skin 手機直拿、電腦各截一張（/tmp/reskin-check），沒有程式錯誤
離線      網頁版關掉伺服器還打得開
需要 Playwright、numpy、ffmpeg（雲端沙盒都有，不要執行 playwright install）。有 BAD 時 exit code 1。
"""
import argparse, functools, http.server, json, os, shutil, socketserver, struct, subprocess, sys, threading

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SKINS = ['neon', 'mecha', 'nebula', 'jelly', 'gacha', 'vinyl', 'cassette', 'scope', 'glass']
PHONE = {'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 2, 'has_touch': True, 'is_mobile': True}
DESK = {'viewport': {'width': 1280, 'height': 800}}
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
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = b.new_context(**PHONE)
        pg = ctx.new_page()
        pg.add_init_script(HIDE)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        ev = pg.evaluate
        pg.goto(url); pg.wait_for_timeout(1500)
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
        pg.click('[data-pl]'); pg.wait_for_timeout(600)
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
        b = p.chromium.launch()
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
        P = ev('RESKIN.lib.pl.all().map(p => ({ name: p.name, titles: p.ids.map(id => RESKIN.lib.get(id).title) }))')
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude')
    ap.add_argument('--out', default='/tmp/reskin-check')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    fx = fixtures('/tmp/reskin-fixtures')
    srv = serve(REPO)
    run_folders(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', a.out, folder_fixtures('/tmp/reskin-folders', fx), fx)
    run(f'http://127.0.0.1:{srv.server_address[1]}/apps/reskin/', a.out, fx, srv)
    if a.claude:
        print('--- Claude 版 ---')
        s2 = serve(a.claude)
        os.makedirs(os.path.join(a.out, 'claude'), exist_ok=True)
        run(f'http://127.0.0.1:{s2.server_address[1]}/', os.path.join(a.out, 'claude'), fx, None)
    print('\n截圖在', a.out)
    if BAD:
        print('BAD', len(BAD)); sys.exit(1)
    print('全部 OK')


if __name__ == '__main__':
    main()
