// 在 Node 裡載入純邏輯的原始檔（不碰畫面的那幾支），給模擬器與檢查腳本用
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');
const LOGIC = ['01_util.js', '02_data.js', '03_items.js', '04_foes.js', '04b_enc.js', '11_battle.js'];
function load(files, names, extra) {
  const code = files.map(f => fs.readFileSync(path.isAbsolute(f) ? f : path.join(SRC, f), 'utf8')).join('\n') + '\n' + (extra || '')
    + '\n;__out = {' + names.map(n => `${n}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',') + '};';
  const ctx = { console, Math, JSON, __out: null, performance: { now: () => Date.now() }, process };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'bundle.js' });
  return ctx.__out;
}
module.exports = { load, LOGIC, SRC };
