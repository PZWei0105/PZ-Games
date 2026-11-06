import * as esbuild from 'esbuild';
import fs from 'fs';
const [entry, out] = process.argv.slice(2);
const r = await esbuild.build({ entryPoints: [entry], bundle: true, minify: false, format: 'iife', write: false, target: ['es2020'] });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(out, `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#app{position:fixed;inset:0}</style></head><body><div id="app"></div><script>${js}</script></body></html>`);
console.log('ok', out, (js.length / 1024).toFixed(0) + 'KB');
