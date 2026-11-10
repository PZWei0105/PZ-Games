#!/usr/bin/env python3
"""下回分解 — 回頭聽一遍：用語音辨識把錄好的說書音軌逐句聽回來，對照原文找出讀錯、漏字的句子。

  listen.py <book> <章號> [...]          檢查書架上的音軌
  listen.py --wav 檔.wav --tl 檔.json --book <book> --n <章號>   檢查試聽檔
  選項：--show 30（列出差最多的幾句） --min 0.12（差異比例超過多少才列）

比對的是「拼音」（不含聲調），所以同音字不算錯；列出來的句子要人看：
多半是破音字或生僻字。確定讀錯就把修正寫進 lexicon.txt（原文=同音替身），再重錄那一章。

需要：pip install sherpa-onnx pypinyin opencc-python-reimplemented numpy ；ffmpeg。
辨識模型（SenseVoice）第一次會自動下載到 ~/.cache/pznc-tts/。
"""
import argparse, collections, json, os, re, subprocess, sys, tarfile, urllib.request
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shelf, narrate  # noqa: E402

ASR_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2'
ASR = os.path.join(narrate.CACHE, 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17')


def recognizer():
    import sherpa_onnx
    if not os.path.exists(os.path.join(ASR, 'model.int8.onnx')):
        os.makedirs(narrate.CACHE, exist_ok=True)
        tmp = os.path.join(narrate.CACHE, 'sv.tar.bz2')
        print('下載辨識模型（約 160 MB）…', flush=True)
        urllib.request.urlretrieve(ASR_URL, tmp)
        with tarfile.open(tmp) as t:
            t.extractall(narrate.CACHE)
        os.remove(tmp)
    return sherpa_onnx.OfflineRecognizer.from_sense_voice(model=ASR + '/model.int8.onnx', tokens=ASR + '/tokens.txt',
                                                         num_threads=2, use_itn=False, language='zh')


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0


def pin(s):
    from pypinyin import lazy_pinyin
    s = re.sub(r'[^一-鿿0-9A-Za-z]', '', s)
    return lazy_pinyin(s), s


def edit_ops(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    ops, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + (a[i - 1] != b[j - 1]):
            if a[i - 1] != b[j - 1]:
                ops.append(('sub', i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append(('del', i - 1, j)); i -= 1
        else:
            ops.append(('ins', i, j - 1)); j -= 1
    return dp[n][m], ops[::-1]


def check(audio, tl, blocks, show, minr, tag):
    rec = recognizer()
    subs = collections.Counter()
    rows, tot_err, tot_len = [], 0, 0
    for bi, a, b, t0, t1 in tl['units']:
        src = blocks[bi][1][a:b]
        seg = audio[int(max(0, t0 - 0.05) * 16000):int((t1 + 0.12) * 16000)]
        st = rec.create_stream(); st.accept_waveform(16000, seg); rec.decode_stream(st)
        hyp = st.result.text
        pa, sa = pin(narrate.speakable(src))
        pb, sb = pin(hyp)
        d, ops = edit_ops(pa, pb)
        tot_err += d; tot_len += max(1, len(pa))
        for op, i, j in ops:
            if op == 'sub' and i < len(sa) and j < len(sb):
                subs[(sa[i], pa[i], sb[j], pb[j])] += 1
        r = d / max(1, len(pa))
        if d and r >= minr:
            rows.append((r, d, t0, src, hyp))
    rows.sort(reverse=True)
    print('%s：%d 句，拼音差異 %.2f%%（%d/%d）' % (tag, len(tl['units']), 100 * tot_err / max(1, tot_len), tot_err, tot_len))
    for r, d, t0, src, hyp in rows[:show]:
        print('  [%s] 差 %d (%.0f%%)\n     原文：%s\n     聽到：%s' % (narrate.clock(t0), d, r * 100, src, hyp))
    if subs:
        print('  常見的替換（原字 讀音 → 聽成）：' + '、'.join('%s(%s)→%s(%s)×%d' % (k[0], k[1], k[2], k[3], v) for k, v in subs.most_common(25)))
    return tot_err / max(1, tot_len)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('book', nargs='?'); ap.add_argument('n', nargs='*', type=int)
    ap.add_argument('--wav'); ap.add_argument('--tl'); ap.add_argument('--book', dest='book2'); ap.add_argument('--n', dest='n2', type=int)
    ap.add_argument('--show', type=int, default=30); ap.add_argument('--min', type=float, default=0.12)
    a = ap.parse_args()
    lib = shelf.load()
    if a.wav:
        b = shelf.book_of(lib, a.book2); c = next(c for c in b['chapters'] if c['n'] == a.n2)
        with open(os.path.join(shelf.BOOKS, b['id'], c['f']), 'rb') as f:
            blocks = shelf.blocks(shelf.unpack(f.read()))
        check(load_audio(a.wav), json.load(open(a.tl)), blocks, a.show, a.min, os.path.basename(a.wav))
        return
    b = shelf.book_of(lib, a.book)
    for c in b['chapters']:
        if (a.n and c['n'] not in a.n) or not c.get('au'):
            continue
        with open(os.path.join(shelf.BOOKS, b['id'], c['f']), 'rb') as f:
            blocks = shelf.blocks(shelf.unpack(f.read()))
        tl = json.load(open(os.path.join(shelf.BOOKS, b['id'], c['au']['tl'])))
        check(load_audio(os.path.join(shelf.BOOKS, b['id'], c['au']['f'])), tl, blocks, a.show, a.min, '《%s》%s' % (b['title'], c['label']))


if __name__ == '__main__':
    main()
