// 進入點
import { Game } from './game/game.js';
import { startCloud } from './game/cloud.js';

function fatal(msg) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center;background:#05070b;color:#e8dcc0;font-size:15px;line-height:1.9';
  d.innerHTML = `<div><div style="font-size:22px;font-weight:900;letter-spacing:.2em;margin-bottom:14px;color:#f4d995">長明</div>${msg}</div>`;
  document.body.appendChild(d);
}
function boot() {
  const test = document.createElement('canvas');
  const gl = test.getContext('webgl2') || test.getContext('webgl');
  if (!gl) { fatal('這台裝置的瀏覽器沒有開啟 WebGL，<br>沒辦法顯示 3D 畫面。<br>請換用最新版的 Safari 或 Chrome。'); return; }
  try { window.__game = new Game(); if (typeof __CLOUD__ !== 'undefined' && __CLOUD__) startCloud((c) => window.__game.onCloud(c)); }
  catch (e) { console.error(e); fatal('啟動時發生錯誤：<br><span style="font-size:12px;color:#a49c8a">' + (e && e.message ? e.message : e) + '</span>'); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
