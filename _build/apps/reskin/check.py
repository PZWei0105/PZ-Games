#!/usr/bin/env python3
"""耳目一新 RESKIN 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/reskin/check.py                      # 網頁版（apps/reskin/）
  python3 _build/apps/reskin/check.py --claude /tmp/rs-c   # 另外檢查 build.py --claude-out 輸出的 Claude 版

標籤      MP3（ID3v2.3＋封面）、M4A（封面）、FLAC（Vorbis＋圖片）、WAV（從檔名猜歌手）、Big5 編碼的舊 MP3 標籤
分析      每首都算出節奏（BPM 誤差 ±3）與頻譜
播放      單軌換帶：播完接下一首；雙軌接力：螢幕關著時提前交棒、記成功；鎖屏沒接上 → 自動改雙軌＋「繼續播放」；
          單曲循環、上一首重頭、隨機保留目前這首、刪掉正在播的歌、壞掉的檔案跳過
介面      空歌庫→示範曲、衣櫃左右滑試穿＋就穿這套、歌單綁 Skin、每首換一套、DIY 存檔、派對模式、重新整理後接著上次
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude')
    ap.add_argument('--out', default='/tmp/reskin-check')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    fx = fixtures('/tmp/reskin-fixtures')
    srv = serve(REPO)
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
