// 打包：dist/artifact/index.html（Claude 版單檔）＋ dist/web/（獨立網頁版：manifest 與圖示）
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(path.join(dist, 'web'), { recursive: true });
fs.mkdirSync(path.join(dist, 'artifact'), { recursive: true });
const dev = process.argv.includes('--dev');
const r = await esbuild.build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: !dev, format: 'iife', target: ['es2020', 'safari15'], write: false, legalComments: 'none', charset: 'utf8' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const shell = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
fs.writeFileSync(path.join(dist, 'artifact/index.html'), shell.replace('<!--MANIFEST-->', '').replace('<!--GAME-->', () => `<script>${js}</script>`));
const man = '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png">';
fs.writeFileSync(path.join(dist, 'web/index.html'), shell.replace('<!--MANIFEST-->', man).replace('<!--GAME-->', () => `<script>${js}</script>`));
fs.writeFileSync(path.join(dist, 'web/manifest.webmanifest'), JSON.stringify({
  name: '火樹銀花 SKYBLOOM', short_name: '火樹銀花', start_url: './', display: 'fullscreen', orientation: 'any', background_color: '#04050c', theme_color: '#04050c',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 1));
console.log('built', (js.length / 1024).toFixed(0) + ' KB');
