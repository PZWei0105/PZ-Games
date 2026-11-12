import { thumb } from '../game/showcase.js';
import { CHARS } from '../game/data.js';
document.body.style.cssText = 'background:#111;display:flex;flex-wrap:wrap;gap:6px;padding:6px;margin:0';
for (const p of CHARS) for (const sil of [false, true]) { const im = new Image(); im.src = thumb(p.id + '.n', sil); im.style.cssText = 'width:120px;height:120px;background:#223'; im.title = p.id; document.body.appendChild(im); }
window.__ready = true;
