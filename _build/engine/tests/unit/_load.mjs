// 在 Node 裡載入組好的引擎（沒有 DOM），給單元測試用
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function loadPZ(extra = {}) {
  const code = fs.readFileSync(path.join(here, '../../build/pz-engine.js'), 'utf8');
  const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, ...extra };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'pz-engine.js' });
  return ctx.PZ;
}
