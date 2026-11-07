"""重畫 App 圖示：把 icon.html 拍成 icon-512.png，再縮成 192、180。"""
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = br.new_page(viewport={'width': 512, 'height': 512})
    pg.goto((HERE / 'icon.html').as_uri())
    pg.wait_for_timeout(400)
    pg.locator('#c').screenshot(path=str(HERE / 'icon-512.png'))
    br.close()
im = Image.open(HERE / 'icon-512.png').convert('RGB')
for s in (192, 180):
    im.resize((s, s), Image.LANCZOS).save(HERE / f'icon-{s}.png')
print('ok')
