#!/usr/bin/env python3
"""全知 OMNISCIENT — 主題配樂「Omniscient」（D 小調、100 BPM、72 小節 ≈ 2 分 53 秒）

段落：前奏（8）→ A（16）→ B（16）→ 斷奏（8）→ 高潮（16）→ 尾奏（8）
樂器：脈衝貝斯（16 分音符）＋超低頻、深沉大鼓、拍手、細緻的 Hi-hat、寬廣的超級鋸齒 Pad、
      濾波打開的琶音、玻璃鐘聲主旋律（高潮時加一層柔和鋸齒主奏）、資料滴答聲、上升音與衝擊音。
輸出：out/theme.wav（母帶處理後）與 out/theme.json（段落時間，給畫面跟著音樂呼吸用）
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import (SR, Bus, adsr, bp, butter, convolve_stereo, fade, fm_bell, hp, lp, lp24, make_ir, master, mtof,
                 pan, pingpong, saw, shelf, sidechain, sine, soft_clip, square, supersaw, write_wav)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)

BPM = 100
BEAT = 60.0 / BPM
STEP = BEAT / 4
BAR = BEAT * 4
SECTIONS = [('intro', 8), ('A', 16), ('B', 16), ('break', 8), ('drop', 16), ('outro', 8)]
NBARS = sum(n for _, n in SECTIONS)
TAIL = 5.0
LENGTH = NBARS * BAR + TAIL

SEC_OF = []
for name, n in SECTIONS:
    SEC_OF += [name] * n
SEC_START = {}
b0 = 0
for name, n in SECTIONS:
    SEC_START[name] = b0
    b0 += n

# ---------------------------------------------------------------- 和聲
CH = {  # 名稱：(低音根音, Pad 聲位, 琶音音列)
    'Dm9': (38, [50, 57, 60, 64, 65], [62, 65, 69, 72, 76, 77]),
    'Bbmaj7': (34, [53, 57, 62, 65, 69], [58, 62, 65, 69, 74, 77]),
    'Gm9': (31, [53, 57, 62, 65, 70], [62, 65, 67, 70, 74, 77]),
    'Asus4': (33, [52, 57, 62, 64, 69], [57, 62, 64, 69, 74, 76]),
    'A': (33, [52, 57, 61, 64, 69], [57, 61, 64, 69, 73, 76]),
    'Fmaj9': (41, [53, 57, 60, 64, 67], [60, 64, 65, 67, 69, 72]),
    'Csus2': (36, [50, 55, 60, 62, 67], [60, 62, 67, 72, 74, 79]),
    'Dm': (38, [50, 57, 62, 65, 69], [62, 65, 69, 74, 77, 81]),
}
P1 = ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7', 'Gm9', 'Gm9', 'Asus4', 'A']
P2 = ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7', 'Fmaj9', 'Fmaj9', 'Csus2', 'Csus2']
CHORDS = (['Dm9'] * 4 + ['Bbmaj7', 'Bbmaj7', 'Asus4', 'A']      # 前奏
          + P1 + P1                                             # A
          + P2 + P2                                             # B
          + ['Bbmaj7', 'Bbmaj7', 'Gm9', 'Gm9', 'Bbmaj7', 'Bbmaj7', 'Asus4', 'A']   # 斷奏
          + P2 + P2                                             # 高潮
          + ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7', 'Gm9', 'Gm9', 'Dm9', 'Dm9'])        # 尾奏
assert len(CHORDS) == NBARS

rng = np.random.default_rng(20261113)


def T(bar, step=0.0):
    return bar * BAR + step * STEP


def chord_spans():
    """把連續相同的和弦合併成一段：[(起始小節, 小節數, 和弦)]"""
    out = []
    for b, c in enumerate(CHORDS):
        if out and out[-1][2] == c:
            out[-1][1] += 1
        else:
            out.append([b, 1, c])
    return out


# ================================================================ 鼓
def kick_sound(gain=1.0):
    n = int(0.62 * SR)
    t = np.arange(n) / SR
    f = 46 + 92 * np.exp(-t / 0.035) + 30 * np.exp(-t / 0.006)
    body = sine(f) * np.exp(-t / 0.26)
    click = hp(rng.standard_normal(n), 3500.0) * np.exp(-t / 0.0025) * 0.35
    k = soft_clip(body * 1.2 + click, 1.3)
    return fade(k * gain, 0.0005, 0.03)


def clap_sound():
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022):     # 三下快速的拍擊＝真實的拍手
        i = int(d * SR)
        env[i:] += np.exp(-(t[i:] - d) / 0.006) * 0.8
    env += np.exp(-np.maximum(t - 0.03, 0) / 0.11) * (t >= 0.03) * 0.55
    c = bp(noise, 1450.0, 0.9) * env + hp(noise, 4200.0) * env * 0.35
    body = sine(np.full(n, 196.0)) * np.exp(-t / 0.035) * 0.35
    return fade(c + body, 0.0003, 0.05)


def snare_roll_hit(cut):
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), cut, 0.8) * np.exp(-t / 0.045)
    s += sine(np.full(n, 185.0)) * np.exp(-t / 0.03) * 0.3
    return fade(s, 0.0003, 0.02)


METAL = np.array([205.3, 369.4, 304.4, 522.3, 540.0, 800.0]) * 1.0


def hat_sound(open_=False, tone=1.0):
    n = int((0.42 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    m = sum(np.sign(np.sin(2 * np.pi * f * 2.3 * tone * t + rng.random() * 6)) for f in METAL)
    noise = rng.standard_normal(n)
    x = bp(m * 0.5 + noise * 0.6, 9200.0, 0.8)
    x = hp(x, 6500.0)
    d = 0.11 if open_ else 0.022
    return fade(x * np.exp(-t / d), 0.0003, 0.01)


def ride_sound():
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    m = sum(np.sin(2 * np.pi * f * 3.1 * t + rng.random() * 6) for f in METAL)
    x = hp(m * 0.4 + rng.standard_normal(n) * 0.25, 5200.0)
    return fade(x * np.exp(-t / 0.35) * 0.6, 0.0005, 0.05)


# ================================================================ 效果音
def impact(size=1.0):
    n = int(3.2 * SR)
    t = np.arange(n) / SR
    boom = sine(32 + 34 * np.exp(-t / 0.25)) * np.exp(-t / (0.9 * size))
    hit = lp(rng.standard_normal(n), 900.0) * np.exp(-t / 0.18) * 0.9
    metal = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (0.5 + k * 0.2)) for k, f in enumerate([523.25 * 2, 587.33 * 3, 880.0 * 2.01]))
    return fade(soft_clip(boom * 1.1 + hit, 1.2) + metal * 0.05 * size, 0.0005, 0.2)


def crash():
    n = int(3.6 * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 5000.0) * np.exp(-t / 0.9)
    shimmer = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) for f in rng.uniform(4000, 11000, 30)) / 30
    return fade(x * 0.55 + shimmer * np.exp(-t / 1.4) * 0.3, 0.0005, 0.3)


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    noise = rng.standard_normal(n)
    sweep = bp(noise, 350.0 * (24.0 ** (u ** 1.6)), 2.2) * (u ** 2.2)
    tone = (saw(mtof(50) * 2 ** (u * 1.5) * np.ones(n), 0.0) + saw(mtof(50.12) * 2 ** (u * 1.5) * np.ones(n), 0.5)) * 0.5
    tone = lp(tone, 500 + 6000 * u ** 2) * (u ** 3) * 0.35
    x = sweep + tone
    return fade(x, 0.01, 0.004)


def downlifter(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    x = lp(rng.standard_normal(n), 9000.0 * (0.03 ** u), 1.5) * (1 - u) ** 1.5
    return fade(x, 0.002, 0.05)


def data_tick(f):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t / 0.01) * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.018)
    return fade(x, 0.0003, 0.01)


# ================================================================ 旋律
def bell(m, dur, vel=1.0, bright=1.0):
    f = float(mtof(m))
    tail = dur + 2.4
    x = fm_bell(f, tail, ratio=3.5, index=2.4 * bright, idx_decay=0.35, seed=m % 7)
    t = np.arange(len(x)) / SR
    env = np.minimum(1.0, t / 0.004) * np.exp(-t / (0.55 + dur * 0.5))
    x = x * env
    # 柔和的八度泛音層，讓它「玻璃感」
    x += np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.4) * 0.12
    return fade(hp(x, 300.0) * vel, 0.0005, 0.08)


def soft_lead(m, dur, vel=1.0):
    f = float(mtof(m))
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.4, 0, 1)
    L, R = supersaw(f * vib, n_voices=3, detune=0.08, seed=m)
    env = adsr(n, 0.025, 0.4, 0.75, 0.45, dur)
    cut = 2600 + 1500 * np.exp(-t / 0.2)
    L = lp(L, cut, 0.8) * env
    R = lp(R, cut, 0.8) * env
    return fade(L * vel, 0.001, 0.05), fade(R * vel, 0.001, 0.05)


MOTIF_A = [(0, 6, 69), (6, 2, 74), (8, 4, 76), (12, 4, 77), (16, 8, 76), (24, 4, 74), (28, 4, 72),
           (32, 6, 74), (38, 2, 77), (40, 4, 81), (44, 4, 79), (48, 12, 77), (60, 4, 76),
           (64, 6, 72), (70, 2, 77), (72, 4, 79), (76, 4, 81), (80, 8, 79), (88, 4, 77), (92, 4, 76),
           (96, 8, 74), (104, 4, 76), (108, 4, 79), (112, 16, 76)]
MOTIF_B = MOTIF_A[:-4] + [(96, 8, 74), (104, 4, 76), (108, 4, 72), (112, 16, 74)]


# ================================================================ 編曲與錄製
def render():
    B = {k: Bus(LENGTH) for k in ('kick', 'clap', 'hats', 'bass', 'sub', 'pads', 'arp', 'lead', 'ticks', 'fx', 'atmos')}
    kicks = []

    # ---------------- 大鼓
    for b in range(NBARS):
        sec = SEC_OF[b]
        steps = []
        g = 1.0
        if sec == 'intro' and b >= 4:
            steps, g = [0], 0.55 + 0.1 * (b - 4)
        elif sec == 'A':
            steps = [0, 8] if b < SEC_START['A'] + 8 else [0, 4, 8, 12]
        elif sec == 'B':
            steps = [0, 4, 8, 12]
        elif sec == 'drop':
            steps = [0, 4, 8, 12] + ([14] if (b - SEC_START['drop']) % 4 == 3 else [])
        elif sec == 'outro' and b < SEC_START['outro'] + 4:
            steps, g = [0, 4, 8, 12], 1.0 - 0.15 * (b - SEC_START['outro'])
        for s in steps:
            t0 = T(b, s)
            B['kick'].add(t0, kick_sound(g * (0.8 if s == 14 else 1.0)))
            kicks.append(t0)

    # ---------------- 拍手、小鼓滾奏
    for b in range(NBARS):
        sec = SEC_OF[b]
        if sec in ('B', 'drop'):
            for s in (4, 12):
                c = clap_sound()
                B['clap'].add(T(b, s), c, c, 1.0)
    rb = SEC_START['break'] + 6
    for k in range(32):           # 斷奏最後兩小節：16 分音符 → 32 分音符，越來越密、越來越亮
        if k < 16:
            t0 = T(rb, k)
        else:
            t0 = T(rb + 1, (k - 16) * 0.5)
            t1 = T(rb + 1, (k - 16) * 0.5 + 8)
        u = k / 32
        h = snare_roll_hit(900 + 4000 * u)
        B['clap'].add(t0, h, h, 0.25 + 0.8 * u ** 1.5)
        if k >= 16:
            h2 = snare_roll_hit(1000 + 5000 * u)
            B['clap'].add(t1, h2, h2, 0.3 + 0.8 * u ** 1.5)

    # ---------------- Hi-hat（16 分音符、重音、微搖擺）
    acc = [1.0, 0.42, 0.7, 0.42] * 4
    for b in range(NBARS):
        sec = SEC_OF[b]
        rel = b - SEC_START[sec]
        steps, open_steps, g = [], [], 1.0
        if sec == 'intro' and b >= 4:
            steps, g = list(range(16)), 0.25 + 0.07 * (b - 4)
        elif sec == 'A':
            steps = [2, 6, 10, 14] if rel < 8 else list(range(16))
        elif sec == 'B':
            steps = list(range(16))
            open_steps = [2, 6, 10, 14] if rel >= 8 else []
        elif sec == 'break' and rel >= 4:
            steps, g = list(range(0, 16, 2)), 0.3 + 0.1 * (rel - 4)
        elif sec == 'drop':
            steps = list(range(16))
            open_steps = [2, 6, 10, 14]
        elif sec == 'outro' and rel < 4:
            steps, g = list(range(16)), 0.8 - 0.15 * rel
        for s in steps:
            if s in open_steps:
                continue
            sw = STEP * 0.07 if s % 2 else 0.0
            v = acc[s] * g * rng.uniform(0.85, 1.05)
            h = hat_sound(False, rng.uniform(0.98, 1.02))
            L, R = pan(h, rng.uniform(-0.25, 0.25))
            B['hats'].add(T(b, s) + sw, L, R, v)
        for s in open_steps:
            h = hat_sound(True)
            L, R = pan(h, 0.15)
            B['hats'].add(T(b, s), L, R, 0.55 * g)
        if sec == 'drop':
            for s in (0, 4, 8, 12):
                r = ride_sound()
                L, R = pan(r, -0.3)
                B['hats'].add(T(b, s), L, R, 0.35)

    # ---------------- 脈衝貝斯（16 分音符）＋超低頻
    octs = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12]
    accb = [1.0, 0.55, 0.85, 0.55, 0.9, 0.55, 0.8, 0.55, 1.0, 0.55, 0.85, 0.55, 0.9, 0.6, 0.8, 0.65]

    def bass_cut(b):
        sec = SEC_OF[b]
        rel = b - SEC_START[sec]
        if sec == 'intro':
            return 260 + 90 * max(0, rel - 4)
        if sec == 'A':
            return 520 + 18 * rel
        if sec == 'B':
            return 800 + 25 * rel
        if sec == 'drop':
            return 1250 + 30 * rel
        if sec == 'outro':
            return max(250, 1100 - 130 * rel)
        return 400

    for b in range(NBARS):
        sec = SEC_OF[b]
        if sec == 'break' or (sec == 'intro' and b < 4) or (sec == 'outro' and b >= SEC_START['outro'] + 6):
            continue
        root = CH[CHORDS[b]][0]
        g = 1.0 if sec != 'intro' else 0.5 + 0.12 * (b - 4)
        if sec == 'outro':
            g = 1.0 - 0.14 * (b - SEC_START['outro'])
        cut0 = bass_cut(b)
        for s in range(16):
            m = root + octs[s]
            f = float(mtof(m))
            dur = STEP * 0.82
            n = int((dur + 0.08) * SR)
            t = np.arange(n) / SR
            fr = np.full(n, f)
            x = saw(fr, 0.0) * 0.8 + square(fr * 0.5, 0.25, 0.5) * 0.35
            cut = cut0 * (0.55 + 2.2 * np.exp(-t / 0.045)) * (1.0 + 0.25 * accb[s])
            x = lp24(soft_clip(x, 1.4), cut, 1.15)
            env = adsr(n, 0.002, 0.12, 0.55, 0.05, dur) * accb[s]
            B['bass'].add(T(b, s), fade(x * env, 0.0005, 0.004), None, g)
    for b0_, n_, c in chord_spans():    # 超低頻：每個和弦一個長音
        if all(SEC_OF[bb] == 'intro' for bb in range(b0_, b0_ + n_)) and b0_ < 4:
            continue
        root = CH[c][0]
        while mtof(root) > 60:
            root -= 12
        dur = n_ * BAR
        n = int((dur + 0.3) * SR)
        x = sine(np.full(n, float(mtof(root)))) * adsr(n, 0.08, 0.5, 0.9, 0.3, dur)
        sec = SEC_OF[b0_]
        g = 0.9 if sec in ('drop', 'B') else 0.75 if sec != 'break' else 0.35
        B['sub'].add(T(b0_), x, None, g)

    # ---------------- Pad（寬廣的超級鋸齒）
    def pad_cut(b):
        return {'intro': 700 + 120 * b, 'A': 1400, 'B': 1900, 'break': 1600, 'drop': 3200}.get(SEC_OF[b], max(500, 1500 - 120 * (b - SEC_START['outro'])))

    for b0_, n_, c in chord_spans():
        sec = SEC_OF[b0_]
        dur = n_ * BAR
        voicing = CH[c][1] + ([CH[c][1][-1] + 12, CH[c][1][1] + 24] if sec == 'drop' else [])
        attack = 3.0 if b0_ == 0 else 0.5 if sec != 'break' else 1.2
        rel = 1.8
        n = int((dur + rel + 0.2) * SR)
        t = np.arange(n) / SR
        cut = pad_cut(b0_) * (1 + 0.18 * np.sin(2 * np.pi * t / 7.0 + b0_)) * np.minimum(1.0, 0.45 + t / max(attack, 0.1))
        L = np.zeros(n)
        R = np.zeros(n)
        for k, m in enumerate(voicing):
            l, r = supersaw(np.full(n, float(mtof(m))), n_voices=7, detune=0.16, seed=b0_ * 31 + k)
            L += l
            R += r
        L = hp(lp24(L, cut, 0.8), 170.0)
        R = hp(lp24(R, cut, 0.8), 170.0)
        env = adsr(n, attack, 1.0, 0.9, rel, dur)
        gsec = {'intro': 0.9, 'A': 0.85, 'B': 0.85, 'break': 1.0, 'drop': 0.95, 'outro': 0.85}[sec]
        B['pads'].add(T(b0_), L * env, R * env, gsec / len(voicing) * 5)

    # ---------------- 琶音（濾波會慢慢打開）
    pat = [0, 2, 4, 2, 5, 4, 2, 4, 0, 2, 4, 5, 3, 4, 2, 1]

    def arp_cut(b, s):
        sec = SEC_OF[b]
        rel = b - SEC_START[sec] + s / 16
        if sec == 'intro':
            return 260 * (8.0 ** (rel / 8))
        if sec == 'A':
            return 1700 + 40 * rel
        if sec == 'B':
            return 2600 + 50 * rel
        if sec == 'break':
            return 900 + 150 * rel
        if sec == 'drop':
            return 4200
        return max(500, 2600 - 280 * rel)

    for b in range(NBARS):
        sec = SEC_OF[b]
        if sec == 'outro' and b >= SEC_START['outro'] + 6:
            continue
        tones = CH[CHORDS[b]][2]
        g = {'intro': 0.55, 'A': 0.8, 'B': 0.85, 'break': 0.7, 'drop': 0.8, 'outro': 0.7}[sec]
        for s in range(16):
            m = tones[pat[s]]
            if sec == 'drop' and s % 4 == 0:
                m += 12
            f = float(mtof(m))
            n = int(0.42 * SR)
            t = np.arange(n) / SR
            fr = np.full(n, f)
            x = saw(fr, rng.random()) * 0.7 + square(fr * 1.003, rng.random(), 0.32) * 0.35
            cut = arp_cut(b, s) * (0.3 + 1.9 * np.exp(-t / 0.055))
            x = lp(x, cut, 1.5)
            env = np.minimum(1, t / 0.002) * np.exp(-t / 0.15)
            x = hp(x * env, 260.0)
            v = (1.0 if s % 4 == 0 else 0.72) * rng.uniform(0.9, 1.05)
            L, R = pan(fade(x, 0.0003, 0.02), 0.22 if s % 2 else -0.22)
            B['arp'].add(T(b, s), L, R, g * v)

    # ---------------- 主旋律：B 段玻璃鐘聲；高潮升八度鐘聲＋柔和鋸齒主奏
    def play_motif(start_bar, motif, octave=0, lead=False, vel=1.0):
        for st, ln, m in motif:
            t0 = T(start_bar, st)
            dur = ln * STEP
            x = bell(m + octave, dur, vel)
            L, R = pan(x, 0.08)
            B['lead'].add(t0, L, R)
            if lead:
                l2, r2 = soft_lead(m, dur * 0.95, 0.55 * vel)
                B['lead'].add(t0, l2, r2)

    play_motif(SEC_START['B'], MOTIF_A, 0, False, 0.85)
    play_motif(SEC_START['B'] + 8, MOTIF_B, 0, False, 0.95)
    play_motif(SEC_START['drop'], MOTIF_A, 12, True, 0.9)
    play_motif(SEC_START['drop'] + 8, MOTIF_B, 12, True, 1.0)
    # 斷奏：鐘聲慢慢撥出和弦
    for b0_, n_, c in chord_spans():
        if SEC_OF[b0_] != 'break':
            continue
        for k, m in enumerate(CH[c][2][:5]):
            x = bell(m + 12, 1.8, 0.55 - k * 0.05, 0.7)
            L, R = pan(x, -0.4 + k * 0.2)
            B['lead'].add(T(b0_, k * 1.5), L, R)
    # 尾奏：主題的頭四個音，越來越遠
    for k, (st, ln, m) in enumerate(MOTIF_A[:4]):
        x = bell(m, ln * STEP, 0.6)
        L, R = pan(x, 0.0)
        B['lead'].add(T(SEC_START['outro'] + 4, st), L, R)

    # ---------------- 資料滴答（D 小調五聲音階的高音，量化在 16 分音符）
    penta = [86, 89, 91, 93, 96, 98]
    dens = {'intro': 0.03, 'A': 0.07, 'B': 0.09, 'break': 0.05, 'drop': 0.1, 'outro': 0.04}
    for b in range(NBARS):
        for s in range(16):
            if rng.random() < dens[SEC_OF[b]]:
                x = data_tick(float(mtof(rng.choice(penta))))
                L, R = pan(x, rng.uniform(-0.8, 0.8))
                B['ticks'].add(T(b, s), L, R, rng.uniform(0.4, 1.0))

    # ---------------- 上升、衝擊、鈸
    def put(bus, t0, x, g=1.0, p=0.0):
        L, R = pan(x, p)
        B[bus].add(t0, L, R, g)

    put('fx', T(6), riser(2 * BAR), 0.8)
    put('fx', T(8), impact(0.9), 1.0)
    put('fx', T(8), crash(), 0.45)
    put('fx', T(SEC_START['B']), impact(0.6), 0.6)
    put('fx', T(SEC_START['B']), crash(), 0.5)
    put('fx', T(SEC_START['break'] - 1), downlifter(BAR * 1.2), 0.6)
    put('fx', T(SEC_START['break']), impact(0.7), 0.7)
    put('fx', T(SEC_START['break'] + 4), riser(4 * BAR), 0.9)
    put('fx', T(SEC_START['drop']), impact(1.3), 1.15)
    put('fx', T(SEC_START['drop']), crash(), 0.65)
    put('fx', T(SEC_START['drop'] + 8), crash(), 0.4)
    put('fx', T(SEC_START['outro']), crash(), 0.35)
    put('fx', T(SEC_START['outro']), downlifter(BAR * 2), 0.5)

    # ---------------- 氛圍：前奏與斷奏的低頻風聲
    n = B['atmos'].n
    t = np.arange(n) / SR
    wind = bp(rng.standard_normal(n), 500 + 300 * np.sin(2 * np.pi * t / 11.0), 0.6)
    wind2 = bp(rng.standard_normal(n), 520 + 300 * np.sin(2 * np.pi * t / 13.0 + 1), 0.6)
    amp = np.zeros(n)
    for name, (a, z) in (('intro', (0, 8)), ('break', (SEC_START['break'], SEC_START['break'] + 8))):
        i0, i1 = int(T(a) * SR), int(T(z) * SR)
        seg = np.arange(i1 - i0) / (i1 - i0)
        amp[i0:i1] = np.sin(np.pi * seg) ** 0.8
    B['atmos'].L += wind * amp
    B['atmos'].R += wind2 * amp
    return B, kicks


def mix(B, kicks):
    n = B['kick'].n
    sc = sidechain(n, kicks, depth=0.62, release=0.14)
    sc_soft = sidechain(n, kicks, depth=0.3, release=0.2)
    st = {k: b.stereo() for k, b in B.items()}
    st['bass'] *= sc
    st['sub'] *= sidechain(n, kicks, depth=0.75, release=0.12)
    st['pads'] *= sc_soft
    st['arp'] *= sidechain(n, kicks, depth=0.25, release=0.16)

    def active_rms(x):
        m = np.abs(x).max(axis=0) > 1e-4
        return np.sqrt(np.mean(x[:, m] ** 2)) if m.any() else 1.0

    target = {'kick': -15.5, 'clap': -22.5, 'hats': -27.0, 'bass': -19.5, 'sub': -25.0, 'pads': -21.5, 'arp': -23.0,
              'lead': -21.0, 'ticks': -35.0, 'fx': -24.0, 'atmos': -33.0}
    for k in st:
        r = active_rms(st[k])
        st[k] = st[k] * (10 ** (target[k] / 20.0) / r)
    # 每一軌的 EQ
    for k, f in (('pads', 220.0), ('arp', 280.0), ('lead', 320.0), ('ticks', 1800.0), ('atmos', 120.0)):
        st[k] = np.stack([hp(st[k][c], f) for c in range(2)])
    for k, f, g in (('arp', 4000.0, 2.5), ('lead', 5000.0, 2.0), ('pads', 6000.0, 1.5)):
        st[k] = np.stack([shelf(st[k][c], f, g) for c in range(2)])
    st['bass'] = np.stack([lp(st['bass'][c], 4200.0) for c in range(2)])
    st['hats'] = np.stack([shelf(st['hats'][c], 11000.0, -3.0) for c in range(2)])

    # 送往殘響與延遲
    hall = make_ir(3.4, seed=11, predelay=0.024)
    plate = make_ir(1.3, seed=5, predelay=0.008, bright=1.3)
    send_h = st['pads'] * 0.42 + st['arp'] * 0.3 + st['lead'] * 0.5 + st['ticks'] * 0.5 + st['fx'] * 0.45 + st['clap'] * 0.18 + st['atmos'] * 0.6
    send_p = st['clap'] * 0.35 + st['hats'] * 0.08 + st['kick'] * 0.04 + st['bass'] * 0.03
    wet_h = convolve_stereo(send_h, hall)
    wet_p = convolve_stereo(send_p, plate)
    wet_h = np.stack([lp(hp(wet_h[c], 220.0), 8500.0) for c in range(2)])
    wet_p = np.stack([lp(hp(wet_p[c], 300.0), 9000.0) for c in range(2)])
    dsend = st['arp'] * 0.32 + st['lead'] * 0.28 + st['ticks'] * 0.45
    dl, dr = pingpong(dsend[0].copy(), dsend[1].copy(), int(STEP * 3 * SR), 0.42, 0.35)
    dly = np.stack([hp(dl, 350.0), hp(dr, 350.0)])
    dly *= sidechain(n, kicks, depth=0.35, release=0.2)

    mixbus = sum(st.values()) + wet_h * 0.55 + wet_p * 0.45 + dly * 0.55
    mixbus *= macro_dynamics(n)
    return mixbus, st


def macro_dynamics(n):
    """整首歌的起伏（dB）：前奏從遠處慢慢靠近、A 中等、B 再推、斷奏退開、高潮全開、尾奏遠去"""
    pts = [(0, -9.0), (T(4), -6.5), (T(8) - 0.01, -3.5), (T(8), -3.0), (T(24), -2.0), (T(40) - 0.01, -1.0),
           (T(40), -5.5), (T(46), -4.5), (T(48) - 0.01, -1.5), (T(48), 0.0), (T(64), 0.0), (T(68), -3.0), (T(72), -9.0), (LENGTH, -14.0)]
    tt = np.arange(n) / SR
    db = np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])
    from scipy.ndimage import uniform_filter1d
    db = uniform_filter1d(db, size=int(0.08 * SR))
    return 10 ** (db / 20.0)


def main():
    B, kicks = render()
    mixbus, stems = mix(B, kicks)
    # 尾巴自然淡出：讓循環重播時接得無聲無息
    n = mixbus.shape[1]
    fo = int(4.0 * SR)
    mixbus[:, -fo:] *= np.linspace(1, 0, fo) ** 1.6
    out, lufs = master(mixbus, target_lufs=-16.0, ceiling_db=-1.0)
    write_wav(os.path.join(OUT, 'theme.wav'), out)
    secs = []
    t = 0.0
    for name, nb in SECTIONS:
        secs.append({'name': name, 't': round(t, 4), 'bars': nb})
        t += nb * BAR
    info = {'bpm': BPM, 'bar': BAR, 'beat': BEAT, 'length': round(LENGTH, 3), 'music_end': round(NBARS * BAR, 3), 'sections': secs, 'lufs': round(lufs, 2)}
    with open(os.path.join(OUT, 'theme.json'), 'w') as f:
        json.dump(info, f)
    print('theme rendered', info)


if __name__ == '__main__':
    main()
