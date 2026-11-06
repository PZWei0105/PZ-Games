// 打包：dist/index.html（單檔，給 Claude 作品，含雲端存檔）＋ dist/web/（獨立網頁版：manifest 與圖示）
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(path.join(dist, 'web'), { recursive: true });
const dev = process.argv.includes('--dev');
const bundle = async (cloud) => {
  const r = await esbuild.build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: !dev, format: 'iife', target: ['es2020', 'safari15'], write: false, legalComments: 'none', charset: 'utf8', define: { __CLOUD__: cloud ? 'true' : 'false' } });
  return r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
};
const js = await bundle(true), jsWeb = await bundle(false);
const shell = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const single = shell.replace('<!--MANIFEST-->', '').replace('<!--GAME-->', () => `<script>${js}</script>`);
fs.writeFileSync(path.join(dist, 'index.html'), single);
const man = '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png">';
fs.writeFileSync(path.join(dist, 'web/index.html'), shell.replace('<!--MANIFEST-->', man).replace('<!--GAME-->', () => `<script>${jsWeb}</script>`));
fs.writeFileSync(path.join(dist, 'web/manifest.webmanifest'), JSON.stringify({
  name: '差一點 SO CLOSE', short_name: '差一點', start_url: './', display: 'fullscreen', orientation: 'any', background_color: '#05060b', theme_color: '#05060b',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 1));
console.log('built', (single.length / 1024).toFixed(0) + ' KB');
