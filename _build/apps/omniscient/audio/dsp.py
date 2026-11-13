"""全知 OMNISCIENT — 離線音訊合成工具（作曲與音效共用）

所有聲音都在這裡用程式「錄」出來，再壓成 MP3 放進 App：
- 抗鋸齒振盪器（PolyBLEP 鋸齒波／方波）、超級鋸齒、FM 鐘聲
- 可逐樣本調變截止頻率的 TPT 狀態變數濾波器（低通／帶通／高通）
- 卷積殘響（分頻衰減的立體聲脈衝響應）、乒乓延遲、側鏈壓縮
- 母帶：高通、膠水壓縮、限幅器、響度標準化（pedalboard、pyloudnorm）
"""
import numpy as np
from numba import njit
from scipy import signal

SR = 44100


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


# ---------------------------------------------------------------- 振盪器
@njit(cache=True)
def _blep(t, dt):
    if t < dt:
        t = t / dt
        return t + t - t * t - 1.0
    if t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@njit(cache=True)
def saw(freq, phase):
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase
    for i in range(n):
        dt = freq[i] / SR
        out[i] = 2.0 * ph - 1.0 - _blep(ph, dt)
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True)
def square(freq, phase, pw):
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase
    for i in range(n):
        dt = freq[i] / SR
        v = 1.0 if ph < pw else -1.0
        v += _blep(ph, dt)
        t2 = ph - pw
        if t2 < 0.0:
            t2 += 1.0
        v -= _blep(t2, dt)
        out[i] = v
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


def sine(freq, phase=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), np.shape(freq))
    return np.sin(2 * np.pi * (np.cumsum(f) / SR + phase))


def supersaw(freq, n_voices=7, detune=0.18, seed=0, width=1.0):
    """經典超級鋸齒：7 個微走音的鋸齒波，左右散開。回傳 (L, R)"""
    rng = np.random.default_rng(seed)
    spread = np.linspace(-1, 1, n_voices)
    L = np.zeros_like(freq)
    R = np.zeros_like(freq)
    for k, s in enumerate(spread):
        cents = s * detune * 100.0 * (1.0 if k != n_voices // 2 else 0.0)
        f = freq * 2.0 ** (cents / 1200.0)
        v = saw(f, rng.random())
        pan = 0.5 + 0.5 * s * width
        g = 1.0 if k == n_voices // 2 else 0.78
        L += v * g * np.cos(pan * np.pi / 2)
        R += v * g * np.sin(pan * np.pi / 2)
    return L / n_voices * 1.6, R / n_voices * 1.6


def fm_bell(freq, dur, ratio=3.5, index=4.0, idx_decay=1.2, seed=0):
    """FM 玻璃鐘聲：調變指數隨時間衰減（亮→柔）"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = index * np.exp(-t / idx_decay)
    mod = np.sin(2 * np.pi * freq * ratio * t) * idx
    car = np.sin(2 * np.pi * freq * t + mod)
    # 第二層微走音，讓聲音有空氣感
    car2 = np.sin(2 * np.pi * freq * 1.003 * t + 0.6 * mod + seed)
    return 0.7 * car + 0.3 * car2


# ---------------------------------------------------------------- 濾波器（TPT 狀態變數，可逐樣本調變）
@njit(cache=True)
def svf(x, cutoff, q, mode):
    """mode 0＝低通、1＝帶通、2＝高通；cutoff 是每個樣本的頻率陣列"""
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        fc = cutoff[i]
        if fc < 10.0:
            fc = 10.0
        if fc > SR * 0.45:
            fc = SR * 0.45
        g = np.tan(np.pi * fc / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = v1 * k
        else:
            y[i] = x[i] - k * v1 - v2
    return y


def lp(x, fc, q=0.707):
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape).copy()
    return svf(x, fc, q, 0)


def bp(x, fc, q=1.0):
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape).copy()
    return svf(x, fc, q, 1)


def hp(x, fc, q=0.707):
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape).copy()
    return svf(x, fc, q, 2)


def lp24(x, fc, q=0.9):
    """兩級串接＝24dB/oct，像類比合成器的梯形濾波器"""
    return lp(lp(x, fc, 0.54), fc, q)


def butter(x, fc, kind='low', order=2):
    sos = signal.butter(order, fc, btype=kind, fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def shelf(x, fc, gain_db, kind='high'):
    """一階 shelving EQ：原訊號加上（增益−1）×那一段頻帶"""
    A = 10 ** (gain_db / 20.0)
    band = butter(x, fc, 'high' if kind == 'high' else 'low', 1)
    return x + (A - 1.0) * band


# ---------------------------------------------------------------- 包絡
def adsr(n, a, d, s, r, gate):
    """n：總長度（樣本），gate：按住幾秒（之後進入 release）"""
    t = np.arange(n) / SR
    env = np.empty(n)
    a = max(a, 1e-4)
    d = max(d, 1e-4)
    r = max(r, 1e-4)
    att = t < a
    env[att] = (t[att] / a) ** 1.0
    dec = (t >= a) & (t < gate)
    env[dec] = s + (1.0 - s) * np.exp(-(t[dec] - a) / (d / 4.0))
    rel = t >= gate
    # 放開那一刻的值
    if gate < a:
        g0 = gate / a
    else:
        g0 = s + (1.0 - s) * np.exp(-(gate - a) / (d / 4.0))
    env[rel] = g0 * np.exp(-(t[rel] - gate) / (r / 4.6))
    return env


def fade(x, fin=0.002, fout=0.01):
    n = len(x)
    a = min(int(fin * SR), n)
    b = min(int(fout * SR), n)
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)
    if b > 0:
        x[-b:] *= np.linspace(1, 0, b)
    return x


# ---------------------------------------------------------------- 立體聲小工具
def pan(x, p):
    """p：-1（左）～1（右），等功率"""
    a = (p + 1) * np.pi / 4
    return x * np.cos(a), x * np.sin(a)


class Bus:
    """一條立體聲軌：把音符一個一個加進去"""

    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, t0, L, R=None, gain=1.0):
        if R is None:
            R = L
        i0 = int(round(t0 * SR))
        if i0 >= self.n:
            return
        m = min(len(L), self.n - i0)
        if i0 < 0:
            L = L[-i0:]
            R = R[-i0:]
            m = min(len(L), self.n)
            i0 = 0
        self.L[i0:i0 + m] += L[:m] * gain
        self.R[i0:i0 + m] += R[:m] * gain

    def stereo(self):
        return np.stack([self.L, self.R])


# ---------------------------------------------------------------- 殘響
def make_ir(seconds=3.0, seed=7, predelay=0.018, bright=1.0, er=True):
    """分頻衰減的立體聲殘響：低頻留得久、高頻散得快，聽起來像大廳而不是金屬罐"""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    out = []
    bands = [(None, 250, 1.15), (250, 1800, 1.0), (1800, 6000, 0.62 * bright), (6000, None, 0.32 * bright)]
    for ch in range(2):
        noise = rng.standard_normal(n)
        ir = np.zeros(n)
        for lo, hi, k in bands:
            if lo is None:
                b = butter(noise, hi, 'low', 2)
            elif hi is None:
                b = butter(noise, lo, 'high', 2)
            else:
                b = butter(butter(noise, lo, 'high', 2), hi, 'low', 2)
            ir += b * np.exp(-6.91 * t / (seconds * k))
        ir *= np.minimum(1.0, t / 0.045) ** 1.5      # 漸入：擴散感
        if er:   # 早期反射
            for k2 in range(14):
                d = rng.uniform(0.006, 0.075)
                i = int(d * SR)
                ir[i] += rng.choice([-1, 1]) * rng.uniform(0.25, 0.7) * np.exp(-d / 0.05)
        pd = int(predelay * SR)
        ir = np.concatenate([np.zeros(pd), ir])[:n]
        out.append(ir)
    ir = np.stack(out)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def convolve_stereo(x, ir, wet=1.0):
    """x：(2, n)；回傳同長度的濕訊號"""
    n = x.shape[1]
    y = np.stack([signal.fftconvolve(x[c], ir[c], mode='full')[:n] for c in range(2)])
    return y * wet


@njit(cache=True)
def pingpong(xl, xr, dsamp, fb, damp):
    """乒乓延遲（只回傳濕訊號）：左右交替、每次回授都更暗"""
    n = xl.shape[0]
    bl = np.zeros(dsamp)
    br = np.zeros(dsamp)
    yl = np.empty(n)
    yr = np.empty(n)
    idx = 0
    zl = 0.0
    zr = 0.0
    for i in range(n):
        dl = bl[idx]
        dr = br[idx]
        yl[i] = dl
        yr[i] = dr
        zl += damp * (dr - zl)
        zr += damp * (dl - zr)
        bl[idx] = (xl[i] + xr[i]) * 0.5 + fb * zl
        br[idx] = fb * zr
        idx += 1
        if idx >= dsamp:
            idx = 0
    return yl, yr


def sidechain(n, hits, depth=0.55, release=0.16, attack=0.004):
    env = np.ones(n)
    L = int(0.7 * SR)
    t = np.arange(L) / SR
    shape = 1.0 - depth * np.exp(-t / release) * np.minimum(1.0, t / attack + 0.6)
    for h in hits:
        i0 = int(h * SR)
        if i0 >= n:
            continue
        m = min(L, n - i0)
        env[i0:i0 + m] = np.minimum(env[i0:i0 + m], shape[:m])
    return env


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


# ---------------------------------------------------------------- 母帶
@njit(cache=True)
def _smooth_gain(g, rel_coef):
    n = g.shape[0]
    out = np.empty(n)
    cur = 1.0
    for i in range(n):
        if g[i] < cur:
            cur = g[i]
        else:
            cur = cur + (g[i] - cur) * rel_coef
        out[i] = cur
    return out


def limiter(x, ceiling_db=-1.0, lookahead_ms=5.0, release_ms=90.0):
    """只削掉偶爾冒出來的尖峰：有預看、平滑放開，不會像壓縮器那樣把整首歌壓扁"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    ceil = 10 ** (ceiling_db / 20.0)
    peak = np.max(np.abs(x), axis=0)
    need = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
    la = max(1, int(lookahead_ms * SR / 1000))
    g = minimum_filter1d(need, size=2 * la + 1, mode='nearest')
    g = uniform_filter1d(g, size=la, mode='nearest')     # 讓壓下去的那一刻也圓滑
    g = np.minimum(g, minimum_filter1d(need, size=2 * la + 1, mode='nearest') * 1.0 + 0.0)
    g = _smooth_gain(g, 1.0 - np.exp(-1.0 / (release_ms * SR / 1000)))
    return x * g


def master(st, target_lufs=-16.0, ceiling_db=-1.0, glue=True, air_db=1.5):
    import pedalboard as pb
    import pyloudnorm as pyln
    x = st.astype(np.float32)
    chain = [pb.HighpassFilter(cutoff_frequency_hz=28)]
    if glue:
        chain.append(pb.Compressor(threshold_db=-16, ratio=1.6, attack_ms=25, release_ms=220))
    x = pb.Pedalboard(chain)(x, SR).astype(np.float64)
    if air_db:
        x = np.stack([shelf(x[c], 8500.0, air_db) for c in range(2)])
    meter = pyln.Meter(SR)
    for _ in range(3):
        lufs = meter.integrated_loudness(x.T)
        x = x * (10 ** ((target_lufs - lufs) / 20.0))
        x = limiter(x, ceiling_db)
    return x, meter.integrated_loudness(x.T)


def write_wav(path, st):
    from scipy.io import wavfile
    x = np.clip(st, -1, 1)
    wavfile.write(path, SR, (x.T * 32767).astype(np.int16))
