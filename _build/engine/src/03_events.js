/* ==========================================================================
   03 事件
   PZ.on('pause', fn) / PZ.off / PZ.once / PZ.emit
   引擎會發出的事件見說明書「事件」一節（resize、pause、resume、hidden、visible、
   device、quality、contextlost、contextrestored、scene、save…）。
   ========================================================================== */
function makeEmitter(target) {
  const map = new Map();
  target.on = (name, fn) => { let a = map.get(name); if (!a) map.set(name, (a = [])); a.push(fn); return () => target.off(name, fn); };
  target.off = (name, fn) => { const a = map.get(name); if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
  target.once = (name, fn) => { const off = target.on(name, (...x) => { off(); fn(...x); }); return off; };
  target.emit = (name, a, b, c) => { const arr = map.get(name); if (!arr || !arr.length) return; for (const fn of arr.slice()) safeCall(fn, target, a, b, c); };
  return target;
}
makeEmitter(PZ);
PZ.emitter = () => makeEmitter({});
