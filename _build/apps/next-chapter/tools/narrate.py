#!/usr/bin/env python3
"""下回分解 — 說書音軌：把上架的章節錄成旁白 MP3，並寫出逐句時間軸。

  narrate.py <book> [章號 ...]        錄指定章（不給章號＝這本書所有還沒有音軌的章）
  narrate.py <book> 7 --force         重錄
  narrate.py <book> 7 --sample 12     只錄前 12 句，輸出到 /tmp（試聽、挑聲音用，不動書架）
  narrate.py --all                    書架上所有還沒錄的章
  選項：--voice 100（說書人編號，0～102；每本書可以在 library.json 用 voice 指定） --speed 1.0 --out-dir（試聽輸出位置）

做法：
  1. 章節切成一句一句（太短的併到下一句、太長的在逗號切開），每句各自合成 → 時間軸是精確的。
  2. 合成前把文字轉成模型讀得準的樣子：繁轉簡（模型的詞典是簡體詞）、拿掉引號、
     套用 lexicon.txt 裡的讀音修正（人名、破音字）。這些只影響聲音，不影響書裡的文字。
  3. 句尾、段落、場景切換各有不同長度的停頓；開頭一聲驚堂木，再報章名。
  4. 響度統一到 -17 LUFS，輸出 MP3（單聲道 24 kHz 40 kbps CBR，拖動進度條才準）。
  5. 寫回 library.json 的 au 欄位；App 看到 au 就會用音軌而不是裝置語音。

需要：pip install sherpa-onnx numpy opencc-python-reimplemented ；ffmpeg（含 libmp3lame）。
模型（Kokoro v1.1-zh，Apache-2.0）第一次會自動從 GitHub 下載到 ~/.cache/pznc-tts/。
合成約是實際長度的 0.4 倍時間（雙核心）：一萬字的章節大約錄 15 分鐘、成品約 38 分鐘、約 11 MB。
"""
import argparse, hashlib, json, os, re, subprocess, sys, tarfile, time, urllib.request, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shelf  # noqa: E402

MODEL_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2'
CACHE = os.environ.get('PZNC_TTS_DIR') or os.path.expanduser('~/.cache/pznc-tts')
MODEL = os.path.join(CACHE, 'kokoro-multi-lang-v1_1')
LEXICON = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lexicon.txt')
SR = 24000
DEFAULT_VOICE = 100
ENDERS, CLOSERS = '。！？!?…⋯', '」』”’）》〉】〕)"\''
STRIP = '「」『』“”‘’《》〈〉【】〔〕（）()"\''


def ensure_model():
    if os.path.exists(os.path.join(MODEL, 'model.onnx')):
        return
    os.makedirs(CACHE, exist_ok=True)
    tmp = os.path.join(CACHE, 'kokoro.tar.bz2')
    print('下載說書模型（約 350 MB）…', flush=True)
    urllib.request.urlretrieve(MODEL_URL, tmp)
    with tarfile.open(tmp) as t:
        t.extractall(CACHE)
    os.remove(tmp)


_tts = None


def engine():
    global _tts
    if _tts is None:
        import sherpa_onnx
        ensure_model()
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=MODEL + '/model.onnx', voices=MODEL + '/voices.bin', tokens=MODEL + '/tokens.txt',
                    data_dir=MODEL + '/espeak-ng-data', dict_dir=MODEL + '/dict',
                    lexicon=MODEL + '/lexicon-us-en.txt,' + MODEL + '/lexicon-zh.txt'),
                provider='cpu', num_threads=int(os.environ.get('PZNC_TTS_THREADS', '2')), debug=False),
            rule_fsts=MODEL + '/date-zh.fst,' + MODEL + '/number-zh.fst', max_num_sentences=1)
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts


_cc = None
_lex = None


def load_lexicon():
    """lexicon.txt：一行一條「原文=讀音替身」，用同音字把讀錯的詞換掉（只給語音用）。# 開頭是註解。"""
    global _lex
    if _lex is None:
        _lex = []
        if os.path.exists(LEXICON):
            for ln in open(LEXICON, encoding='utf-8'):
                ln = ln.split('#')[0].strip()
                if '=' in ln:
                    a, b = ln.split('=', 1)
                    if a.strip():
                        _lex.append((a.strip(), b.strip()))
        _lex.sort(key=lambda x: -len(x[0]))
    return _lex


def speakable(text):
    """書裡的一句 → 餵給模型的字串"""
    global _cc
    if _cc is None:
        from opencc import OpenCC
        _cc = OpenCC('t2s')
    s = text
    for a, b in load_lexicon():
        if a in s:
            s = s.replace(a, b)
    s = ''.join(ch for ch in s if ch not in STRIP)
    s = re.sub(r'[—─－-]{2,}', '，', s)
    s = re.sub(r'[…⋯]+', '，', s)
    s = s.replace('—', '，').replace('、', '，').replace('；', '，').replace('：', '，').replace('·', '').replace('　', '，').replace(' ', '')
    s = re.sub(r'[，,]{2,}', '，', s)
    s = re.sub(r'，([。！？])', r'\1', s)
    s = re.sub(r'^[，。！？\s]+', '', s)
    s = _cc.convert(s)
    return s


def sentences(text):
    out, st, i, n = [], 0, 0, len(text)
    while i < n:
        if text[i] in ENDERS:
            j = i + 1
            while j < n and (text[j] in ENDERS or text[j] == '—'):
                j += 1
            while j < n and text[j] in CLOSERS:
                j += 1
            out.append((st, j))
            st = i = j
        else:
            i += 1
    if st < n:
        out.append((st, n))
    return out


def spoken_len(s):
    return len(re.sub(r'[\s%s，。！？；：、…⋯—·　]' % re.escape(STRIP), '', s))


def units_of(text):
    """一段文字 → [(start, end)]：每個單位 6～64 個字左右"""
    sents = sentences(text)
    # 太長的句子在逗號切開
    cut = []
    for a, b in sents:
        if spoken_len(text[a:b]) <= 64:
            cut.append((a, b))
            continue
        st, last = a, a
        for m in re.finditer(r'[，；：、,;]', text[a:b]):
            p = a + m.end()
            if spoken_len(text[st:p]) >= 44:
                cut.append((st, p))
                st = p
            last = p
        if st < b:
            if cut and cut[-1][1] == st and spoken_len(text[st:b]) < 8:
                cut[-1] = (cut[-1][0], b)
            else:
                cut.append((st, b))
    # 太短的句子併到後面（同一段內）
    out, i = [], 0
    while i < len(cut):
        a, b = cut[i]
        while spoken_len(text[a:b]) < 7 and i + 1 < len(cut) and spoken_len(text[a:cut[i + 1][1]]) <= 64:
            i += 1
            b = cut[i][1]
        out.append((a, b))
        i += 1
    if len(out) >= 2 and spoken_len(text[out[-1][0]:out[-1][1]]) < 4 and spoken_len(text[out[-2][0]:out[-1][1]]) <= 70:
        out[-2] = (out[-2][0], out[-1][1])
        out.pop()
    return [u for u in out if spoken_len(text[u[0]:u[1]]) > 0]


def trim(x, pad=0.03):
    """去掉頭尾的靜音，只留一點點氣口"""
    if len(x) == 0:
        return x
    win = int(SR * 0.01)
    n = len(x) // win
    if n < 3:
        return x
    rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    thr = max(0.004, rms.max() * 0.03)
    idx = np.where(rms > thr)[0]
    if len(idx) == 0:
        return x[:0]
    a = max(0, idx[0] * win - int(pad * SR))
    b = min(len(x), (idx[-1] + 1) * win + int(pad * SR))
    y = x[a:b].copy()
    f = int(SR * 0.008)
    if len(y) > 2 * f:
        y[:f] *= np.linspace(0, 1, f)
        y[-f:] *= np.linspace(1, 0, f)
    return y


def knock():
    """驚堂木：一聲脆響加桌面的悶響"""
    t = np.arange(int(SR * 0.5)) / SR
    rng = np.random.default_rng(7)
    click = rng.standard_normal(len(t)) * np.exp(-t * 900) * 0.5
    body = np.sin(2 * np.pi * 930 * t) * np.exp(-t * 60) * 0.5 + np.sin(2 * np.pi * 1870 * t) * np.exp(-t * 95) * 0.2
    thump = np.sin(2 * np.pi * 165 * t * (1 - 0.15 * t)) * np.exp(-t * 22) * 0.6
    y = (click + body + thump) * 0.55
    y[:24] *= np.linspace(0, 1, 24)
    return y.astype(np.float32)


def silence(sec):
    return np.zeros(int(SR * sec), dtype=np.float32)


def pause_after(text_unit, last_in_block, kind):
    s = text_unit.rstrip(CLOSERS + ' 　')
    if kind == 'h':
        return 1.0
    if last_in_block:
        return 0.62
    if s.endswith(('，', '；', '：', '、', ',')):
        return 0.14
    if s.endswith(('…', '⋯', '—')):
        return 0.5
    return 0.36


def synth(text, voice, speed):
    s = speakable(text)
    if not re.search(r'[一-鿿A-Za-z0-9]', s):
        return np.zeros(0, dtype=np.float32), s
    if not re.search(r'[。！？!?]$', s):
        s = s.rstrip('，,') + '。'
    a = engine().generate(s, sid=voice, speed=speed)
    return trim(np.asarray(a.samples, dtype=np.float32)), s


def render(book, ch, body, voice, speed, limit=None, log=True):
    blocks = shelf.blocks(body)
    parts, tl, t = [], [], 0.0

    def push(x):
        nonlocal t
        parts.append(x)
        t += len(x) / SR

    push(silence(0.25)); push(knock()); push(silence(0.35))
    head = ch['label'] + ('，' + ch['name'] if ch.get('name') else '') + '。'
    x, _ = synth(head, voice, speed * 0.94)
    push(x); push(silence(1.1))
    head_end = t
    done, total = 0, sum(len(units_of(tx)) for k, tx in blocks if k in ('p', 'h'))
    t0 = time.time()
    for bi, (kind, tx) in enumerate(blocks):
        if kind == 'br':
            push(silence(1.3))
            continue
        if re.match(r'^[（(]\s*第.{1,12}[章回卷節]\s*完\s*[）)]$', tx.strip()):
            continue
        us = units_of(tx)
        for ui, (a, b) in enumerate(us):
            x, spoken = synth(tx[a:b], voice, speed)
            if len(x) == 0:
                continue
            st = t
            push(x)
            tl.append([bi, a, b, round(st, 2), round(t, 2)])
            push(silence(pause_after(tx[a:b], ui == len(us) - 1, kind)))
            done += 1
            if log and done % 40 == 0:
                el = time.time() - t0
                print('  %d/%d 句  已錄 %s  用時 %ds' % (done, total, clock(t), el), flush=True)
            if limit and done >= limit:
                break
        if limit and done >= limit:
            break
    push(silence(0.8))
    return np.concatenate(parts), tl, head_end


def clock(sec):
    return '%d:%02d' % (sec // 60, sec % 60)


def write_wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def encode(wav, mp3):
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    js = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = ('loudnorm=I=-17:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true'
          % (js['input_i'], js['input_tp'], js['input_lra'], js['input_thresh'], js['target_offset']))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', af, '-ar', str(SR), '-ac', '1',
                    '-c:a', 'libmp3lame', '-b:a', '40k', '-write_xing', '0', '-id3v2_version', '0', mp3], check=True)


def narrate(lib, b, c, voice, speed, force=False, sample=None, out_dir=None):
    if c.get('au') and not force and not sample:
        return False
    with open(os.path.join(shelf.BOOKS, b['id'], c['f']), 'rb') as f:
        body = shelf.unpack(f.read())
    print('錄《%s》%s　%s（%d 字，說書人 %d）' % (b['title'], c['label'], c['name'], c['chars'], voice), flush=True)
    t0 = time.time()
    audio, tl, head_end = render(b, c, body, voice, speed, limit=sample)
    dur = len(audio) / SR
    if sample:
        od = out_dir or '/tmp/pznc-samples'
        os.makedirs(od, exist_ok=True)
        wav = os.path.join(od, '%s-%03d-v%d.wav' % (b['id'], c['n'], voice))
        write_wav(wav, audio)
        encode(wav, wav[:-4] + '.mp3')
        with open(wav[:-4] + '.json', 'w', encoding='utf-8') as f:
            json.dump({'v': 1, 'dur': round(dur, 2), 'head': round(head_end, 2), 'units': tl}, f)
        print('  試聽檔：%s（%s）' % (wav[:-4] + '.mp3', clock(dur)))
        return True
    adir = os.path.join(shelf.BOOKS, b['id'], 'audio')
    os.makedirs(adir, exist_ok=True)
    wav = '/tmp/pznc-%s-%03d.wav' % (b['id'], c['n'])
    mp3 = os.path.join(adir, '%03d.mp3' % c['n'])
    write_wav(wav, audio)
    encode(wav, mp3)
    os.remove(wav)
    with open(mp3, 'rb') as f:
        hv = hashlib.sha1(f.read()).hexdigest()[:8]
    with open(os.path.join(adir, '%03d.json' % c['n']), 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'dur': round(dur, 2), 'head': round(head_end, 2), 'text': c['v'], 'units': tl}, f, separators=(',', ':'))
    c['au'] = {'f': 'audio/%03d.mp3' % c['n'], 'tl': 'audio/%03d.json' % c['n'], 'v': hv, 'dur': round(dur, 1),
               'bytes': os.path.getsize(mp3), 'voice': voice, 'text': c['v']}
    shelf.save(lib)
    print('  完成：%s，%.1f MB，用時 %d 秒' % (clock(dur), os.path.getsize(mp3) / 1e6, time.time() - t0), flush=True)
    return True


def main():
    ap = argparse.ArgumentParser(description='下回分解 說書音軌')
    ap.add_argument('book', nargs='?')
    ap.add_argument('n', nargs='*', type=int)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--voice', type=int)
    ap.add_argument('--speed', type=float, default=1.0)
    ap.add_argument('--sample', type=int)
    ap.add_argument('--out-dir')
    a = ap.parse_args()
    lib = shelf.load()
    books = lib['books'] if a.all else [shelf.book_of(lib, a.book)] if a.book else sys.exit(__doc__)
    for b in books:
        voice = a.voice if a.voice is not None else b.get('voice', DEFAULT_VOICE)
        for c in b['chapters']:
            if a.n and c['n'] not in a.n:
                continue
            narrate(lib, b, c, voice, a.speed, a.force, a.sample, a.out_dir)


if __name__ == '__main__':
    main()
