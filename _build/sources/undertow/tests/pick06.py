"""從 x06a／x06c／x06d 挑最亮的一張複製成 06.png（燈管在閃，亮度每張不同）。用法：python3 pick06.py <截圖資料夾>"""
import sys, shutil, os
from PIL import Image, ImageStat
d = sys.argv[1]
c = [f for f in ('x06a.png', 'x06c.png', 'x06d.png') if os.path.exists(os.path.join(d, f))]
best = max(c, key=lambda f: ImageStat.Stat(Image.open(os.path.join(d, f)).convert('L')).mean[0])
shutil.copy(os.path.join(d, best), os.path.join(d, '06.png')); print('06 <-', best)
