// 在 Node 裡載入組好的 App 引擎（沒有 DOM），給單元測試用
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function loadPZA(extra = {}) {
  const file = process.env.PZA_FILE || path.join(here, '../../build/pz-appkit.js');
  const code = fs.readFileSync(file, 'utf8');
  const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, JSON, TextEncoder, atob, btoa, crypto: globalThis.crypto, AbortController, ...extra };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: path.basename(file) });
  return ctx.PZA;
}
