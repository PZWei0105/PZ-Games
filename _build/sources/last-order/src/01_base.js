'use strict';
/* ===== 基本工具 ===== */
const TAU = Math.PI * 2, T = 16;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const chance = p => Math.random() < p;
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const $ = id => document.getElementById(id);
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
function wpick(obj) { let tot = 0; for (const k in obj) tot += obj[k]; let r = Math.random() * tot; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } for (const k in obj) return k; }
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

