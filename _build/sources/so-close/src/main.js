// 進入點
import { Game } from './game/game.js';
import { startCloud } from './game/cloud.js';

function fatal(msg) {
  const b = document.getElementById('boot');
  if (b) { const s = b.querySelector('.s'); if (s) s.innerHTML = msg; }
}
function boot() {
  const test = document.createElement('canvas');
  const gl = test.getContext('webgl2') || test.getContext('webgl');
  if (!gl) { fatal('這台裝置的瀏覽器沒有開啟 WebGL，<br>沒辦法顯示 3D 畫面。<br>請換用最新版的 Safari 或 Chrome。'); return; }
  try {
    const g = new Game();
    window.__game = g;
    if (typeof __CLOUD__ !== 'undefined' && __CLOUD__) startCloud((c) => g.onCloud(c));
  } catch (e) { console.error(e); fatal('啟動時發生錯誤：<br><span style="font-size:12px">' + (e && e.message ? e.message : e) + '</span>'); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
