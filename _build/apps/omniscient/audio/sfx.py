#!/usr/bin/env python3
"""全知 OMNISCIENT — 介面音效（全部同一個調：D 小調，跟配樂疊在一起不打架）

每一個都短、乾淨、有空間感；不用長音、不用刺耳的方波。輸出到 out/sfx/*.wav
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import (SR, adsr, bp, butter, convolve_stereo, fade, fm_bell, hp, limiter, lp, lp24, make_ir, mtof, pan, saw,
                 shelf, sine, soft_clip, supersaw, write_wav)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(42)
HALL = make_ir(2.6, seed=3, predelay=0.02)
ROOM = make_ir(0.9, seed=9, predelay=0.006, bright=1.2)


def z(sec):
    return np.zeros(int(sec * SR))


def st(L, R=None):
    return np.stack([L, L if R is None else R])


def verb(x, ir, wet, dry=1.0):
    pad = np.zeros((2, ir.shape[1]))
    xx = np.concatenate([x, pad], axis=1)
    w = convolve_stereo(xx, ir)
    w = np.stack([lp(hp(w[c], 250.0), 9000.0) for c in range(2)])
    return xx * dry + w * wet


def trim(x, thresh=1e-4, tail=0.02):
    e = np.max(np.abs(x), axis=0)
    idx = np.where(e > thresh)[0]
    if len(idx) == 0:
        return x
    end = min(x.shape[1], idx[-1] + int(tail * SR))
    y = x[:, :end].copy()
    f = min(int(0.03 * SR), y.shape[1])
    y[:, -f:] *= np.linspace(1, 0, f)
    return y


def norm(x, peak_db):
    p = np.max(np.abs(x))
    return x * (10 ** (peak_db / 20.0) / p) if p > 0 else x


def save(name, x, peak_db=-6.0):
    x = norm(trim(x), peak_db)
    write_wav(os.path.join(OUT, name + '.wav'), x)
    print('%-12s %.2fs' % (name, x.shape[1] / SR))


def tt(sec):
    return np.arange(int(sec * SR)) / SR


# ---------------------------------------------------------------- 開機：上升（約 4.4 秒）
def boot_rise():
    d = 4.4
    t = tt(d)
    u = t / d
    noise = rng.standard_normal(len(t))
    swL = bp(noise, 200 * (40 ** (u ** 1.8)), 3.0)
    swR = bp(rng.standard_normal(len(t)), 210 * (40 ** (u ** 1.8)), 3.0)
    drone = np.zeros(len(t))
    for m, g in ((26, 1.0), (38, 0.6), (45, 0.35)):
        drone += saw(np.full(len(t), float(mtof(m))) * (1 + 0.004 * np.sin(2 * np.pi * 0.3 * t)), rng.random()) * g
    drone = lp24(drone, 90 + 2500 * u ** 2.2, 1.2) * np.minimum(1, t / 1.2)
    shimmer = sum(np.sin(2 * np.pi * float(mtof(m)) * t + rng.random() * 6) for m in (86, 93, 98, 101)) / 4
    shimmer *= (u ** 3) * 0.25 * (1 + 0.5 * np.sin(2 * np.pi * 9 * t))
    amp = (u ** 2.4)
    L = (swL * amp * 0.9 + drone * 0.35 + shimmer)
    R = (swR * amp * 0.9 + drone * 0.35 + shimmer)
    x = st(L, R)
    x[:, -int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return verb(x, HALL, 0.35)


# ---------------------------------------------------------------- 開機：睜眼的衝擊（BRAAM＋玻璃和弦＋次低頻）
def boot_hit():
    d = 4.5
    t = tt(d)
    boom = sine(30 + 40 * np.exp(-t / 0.18)) * np.exp(-t / 1.1)
    braam = np.zeros(len(t))
    for m in (26, 38, 45, 50):
        l, r = supersaw(np.full(len(t), float(mtof(m))), n_voices=5, detune=0.12, seed=m)
        braam += l
    braam = lp24(braam, 180 + 1600 * np.exp(-t / 0.35), 1.3) * np.exp(-t / 1.4) * np.minimum(1, t / 0.008)
    glass = np.zeros(len(t))
    for k, m in enumerate((74, 81, 84, 88)):     # D5 A5 C6 E6：Dm9 的上層
        b = fm_bell(float(mtof(m)), d, ratio=3.5, index=2.0, idx_decay=0.5, seed=k)
        glass += b * np.exp(-t / 1.6) * (0.9 - k * 0.12)
    crack = hp(rng.standard_normal(len(t)), 2500.0) * np.exp(-t / 0.05) * 0.5
    L = soft_clip(boom * 1.2, 1.1) + braam * 0.5 + glass * 0.22 + crack
    R = soft_clip(boom * 1.2, 1.1) + braam * 0.5 + np.roll(glass, 90) * 0.22 + crack
    x = st(L, R)
    f = int(0.8 * SR)
    x[:, -f:] *= np.linspace(1, 0, f) ** 2
    return verb(x, HALL, 0.55)


# ---------------------------------------------------------------- 資料到站（非常輕的玻璃滴答）
def tick(m):
    t = tt(0.12)
    f = float(mtof(m))
    x = np.sin(2 * np.pi * f * t + 1.5 * np.exp(-t / 0.006) * np.sin(2 * np.pi * f * 2.0 * t)) * np.exp(-t / 0.022)
    x += hp(rng.standard_normal(len(t)), 6000.0) * np.exp(-t / 0.0015) * 0.25
    return verb(st(fade(x, 0.0002, 0.01)), ROOM, 0.25)


# ---------------------------------------------------------------- 卡片點亮
def blip(m):
    t = tt(0.25)
    f0 = float(mtof(m))
    f = f0 * (1 + 0.6 * (1 - np.exp(-t / 0.02)))
    x = sine(f) * np.exp(-t / 0.05) + sine(f * 2.01) * np.exp(-t / 0.03) * 0.25
    return verb(st(fade(x, 0.0003, 0.02)), ROOM, 0.35)


# ---------------------------------------------------------------- 新聞蓋章
def stamp(kind):
    t = tt(0.9)
    thock = sine(80 + 90 * np.exp(-t / 0.012)) * np.exp(-t / 0.07)
    click = bp(rng.standard_normal(len(t)), 2200.0, 1.2) * np.exp(-t / 0.004) * 0.6
    x = thock * 0.9 + click
    if kind == 'official':
        x += (np.sin(2 * np.pi * float(mtof(86)) * t) * 0.5 + np.sin(2 * np.pi * float(mtof(93)) * t) * 0.35) * np.exp(-t / 0.3) * np.minimum(1, t / 0.003)
    elif kind == 'fact':
        x += np.sin(2 * np.pi * float(mtof(81)) * t) * np.exp(-t / 0.12) * 0.35
    else:  # 觀點：兩下短促、帶一點緊張感的提示
        for d0, m in ((0.0, 89), (0.085, 88)):
            i = int(d0 * SR)
            seg = t[: len(t) - i]
            tone = np.sin(2 * np.pi * float(mtof(m)) * seg) * np.exp(-seg / 0.05) * np.minimum(1, seg / 0.003) * 0.35
            x[i:] += tone
    return verb(st(fade(x, 0.0002, 0.05)), ROOM, 0.3)


# ---------------------------------------------------------------- 掃描光束（從左掃到右）
def scan():
    d = 1.5
    t = tt(d)
    u = t / d
    n1 = rng.standard_normal(len(t))
    sweep = bp(n1, 600 * (12 ** np.sin(np.pi * u * 0.5) ** 1.2), 1.6) * np.sin(np.pi * u) ** 1.5
    whoosh = lp(rng.standard_normal(len(t)), 900.0) * np.sin(np.pi * u) ** 2 * 0.6
    sparkle = sum(np.sin(2 * np.pi * float(mtof(m)) * t + rng.random() * 6) for m in (93, 98, 100)) / 3 * np.sin(np.pi * u) ** 4 * 0.15
    x = sweep + whoosh + sparkle
    p = -0.9 + 1.8 * u                      # 左 → 右
    L = x * np.cos((p + 1) * np.pi / 4)
    R = x * np.sin((p + 1) * np.pi / 4)
    return verb(st(L, R), HALL, 0.3)


# ---------------------------------------------------------------- 結論的鐘聲（上行＝亮、下行＝暗）
def chime(up=True):
    seq = (74, 77, 81, 88) if up else (81, 77, 74, 72)
    d = 3.2
    t = tt(d)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    for k, m in enumerate(seq):
        i = int(k * 0.085 * SR)
        b = fm_bell(float(mtof(m)), d - k * 0.085, ratio=3.5, index=1.6, idx_decay=0.4, seed=k)
        b *= np.exp(-np.arange(len(b)) / SR / 1.1) * np.minimum(1, np.arange(len(b)) / SR / 0.003)
        l, r = pan(b, -0.45 + k * 0.3)
        L[i:i + len(l)] += l[: len(t) - i]
        R[i:i + len(r)] += r[: len(t) - i]
    return verb(st(hp(L, 300.0), hp(R, 300.0)), HALL, 0.5)


def alert():
    t = tt(0.9)
    x = np.zeros(len(t))
    for d0, m in ((0.0, 81), (0.16, 77)):
        i = int(d0 * SR)
        seg = t[: len(t) - i]
        x[i:] += (np.sin(2 * np.pi * float(mtof(m)) * seg) + 0.3 * np.sin(2 * np.pi * float(mtof(m)) * 2 * seg)) * np.exp(-seg / 0.12) * np.minimum(1, seg / 0.004)
    x += sine(np.full(len(t), 73.4)) * np.exp(-t / 0.25) * 0.4
    return verb(st(fade(x, 0.0002, 0.05)), ROOM, 0.35)


def click():
    t = tt(0.06)
    x = bp(rng.standard_normal(len(t)), 3200.0, 1.4) * np.exp(-t / 0.0025) + np.sin(2 * np.pi * 1760 * t) * np.exp(-t / 0.008) * 0.4
    return st(fade(x, 0.0001, 0.01))


def report():
    d = 3.6
    t = tt(d)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    for m in (50, 57, 60, 64, 65, 69):
        l, r = supersaw(np.full(len(t), float(mtof(m))), n_voices=5, detune=0.14, seed=m)
        L += l
        R += r
    env = adsr(len(t), 0.9, 1.0, 0.8, 1.6, 1.6)
    L = hp(lp(L, 2400.0), 200.0) * env * 0.35
    R = hp(lp(R, 2400.0), 200.0) * env * 0.35
    whoosh = bp(rng.standard_normal(len(t)), 500 * (8 ** np.minimum(1, t / 0.9)), 1.4) * np.sin(np.pi * np.minimum(1, t / 1.2)) * 0.4
    return verb(st(L + whoosh, R + whoosh), HALL, 0.5)


def burst():
    d = 2.0
    t = tt(d)
    L = np.zeros(len(t))
    R = np.zeros(len(t))
    notes = [86, 89, 91, 93, 96, 98, 101, 103]
    for k, m in enumerate(notes):
        i = int(k * 0.05 * SR)
        seg = t[: len(t) - i]
        b = np.sin(2 * np.pi * float(mtof(m)) * seg + 0.8 * np.exp(-seg / 0.02) * np.sin(2 * np.pi * float(mtof(m)) * 3 * seg)) * np.exp(-seg / 0.22)
        l, r = pan(b * (1 - k * 0.07), -0.7 + k * 0.2)
        L[i:] += l
        R[i:] += r
    return verb(st(L, R), HALL, 0.45)


def panel(m):
    t = tt(0.6)
    thump = sine(55 + 60 * np.exp(-t / 0.03)) * np.exp(-t / 0.12) * 0.8
    rise = sine(float(mtof(m)) * (1 + 0.5 * (1 - np.exp(-t / 0.08)))) * np.exp(-t / 0.18) * 0.3
    hum = hp(saw(np.full(len(t), float(mtof(m - 24))), 0.0), 200.0) * np.exp(-t / 0.15) * 0.08
    return verb(st(fade(thump + rise + hum, 0.0003, 0.05)), ROOM, 0.4)


def main():
    save('boot_rise', boot_rise(), -7.0)
    save('boot_hit', boot_hit(), -2.5)
    for k, m in enumerate((98, 101, 105)):     # D7 F7 A7
        save('tick%d' % (k + 1), tick(m), -17.0)
    for k, m in enumerate((81, 86)):
        save('blip%d' % (k + 1), blip(m), -14.0)
    for kind in ('official', 'fact', 'opinion'):
        save('stamp_' + kind, stamp(kind), -9.0)
    save('scan', scan(), -9.0)
    save('chime_up', chime(True), -8.0)
    save('chime_down', chime(False), -8.0)
    save('alert', alert(), -10.0)
    save('click', click(), -14.0)
    save('report', report(), -9.0)
    save('burst', burst(), -10.0)
    for k, m in enumerate((62, 65, 69, 72, 74, 77)):
        save('panel%d' % (k + 1), panel(m), -10.0)


if __name__ == '__main__':
    main()
