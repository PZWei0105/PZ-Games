#!/usr/bin/env python3
"""檢查錄好的聲音：每段響度、峰值、頻段平衡、立體聲相關、頻譜圖（PNG）"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile


def bands(x, sr):
    f, p = signal.welch(x, sr, nperseg=8192)
    def e(lo, hi):
        m = (f >= lo) & (f < hi)
        return 10 * np.log10(np.sum(p[m]) + 1e-20)
    ref = e(20, 20000)
    return {k: round(e(lo, hi) - ref, 1) for k, (lo, hi) in {
        'sub<60': (20, 60), 'bass60-250': (60, 250), 'lowmid250-800': (250, 800), 'mid800-2k': (800, 2000),
        'pres2-5k': (2000, 5000), 'bril5-10k': (5000, 10000), 'air10k+': (10000, 20000)}.items()}


def main(path, info_path=None, png=None):
    import pyloudnorm as pyln
    sr, d = wavfile.read(path)
    x = d.astype(np.float64) / 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    meter = pyln.Meter(sr)
    print('length %.1fs  integrated %.1f LUFS  peak %.2f dBFS' % (len(x) / sr, meter.integrated_loudness(x), 20 * np.log10(np.abs(x).max() + 1e-12)))
    mono = x.mean(1)
    print('bands (dB rel. total):', bands(mono, sr))
    c = np.corrcoef(x[:, 0], x[:, 1])[0, 1]
    print('stereo correlation %.2f' % c)
    if info_path:
        info = json.load(open(info_path))
        for s in info['sections']:
            a = int(s['t'] * sr)
            b = int((s['t'] + s['bars'] * info['bar']) * sr)
            seg = x[a:b]
            try:
                L = meter.integrated_loudness(seg)
            except Exception:
                L = float('nan')
            print('  %-6s %6.1fs  %6.1f LUFS  peak %6.2f  bands %s' % (s['name'], s['t'], L, 20 * np.log10(np.abs(seg).max() + 1e-12), bands(seg.mean(1), sr)))
    if png:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(16, 7), gridspec_kw={'height_ratios': [1, 3]})
        t = np.arange(len(mono)) / sr
        step = max(1, len(mono) // 4000)
        env = np.abs(mono[:len(mono) // step * step]).reshape(-1, step).max(1)
        ax[0].plot(np.arange(len(env)) * step / sr, env, lw=0.6)
        ax[0].set_xlim(0, t[-1])
        f, tt, S = signal.spectrogram(mono, sr, nperseg=2048, noverlap=1024)
        ax[1].pcolormesh(tt, f, 10 * np.log10(S + 1e-12), shading='auto', vmin=-120, vmax=-40, cmap='magma')
        ax[1].set_yscale('symlog', linthresh=200)
        ax[1].set_ylim(30, 20000)
        if info_path:
            for s in info['sections']:
                for a in ax:
                    a.axvline(s['t'], color='c', lw=0.8)
                ax[0].text(s['t'] + 0.5, env.max() * 0.9, s['name'], color='c')
        plt.tight_layout()
        plt.savefig(png, dpi=90)
        print('png ->', png)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None, sys.argv[3] if len(sys.argv) > 3 else None)
