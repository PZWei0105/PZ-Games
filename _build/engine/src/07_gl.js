/* ==========================================================================
   07 WebGL2 繪圖器
   - 所有東西都是「四邊形」：貼圖、圓、光暈、線、文字都走同一個批次，一次畫完。
   - 一般混合與「加亮（發光）」可以在同一批裡混著畫（預乘透明度的技巧），粒子不會打斷批次。
   - 同一批最多 8 張貼圖；換貼圖不必重送資料。
   - 後製：場景先畫到離屏畫布，再一次做泛光、衝擊波扭曲、色差、調色、暗角、閃白、顆粒。
   - iPhone 切到背景可能弄丟 WebGL（context lost）：會自動重建；一直救不回來就換成 Canvas2D。
   ========================================================================== */
const MAX_QUADS = 8192, VERT_WORDS = 6, QUAD_WORDS = VERT_WORDS * 4;
const BLEND = { normal: 0, multiply: 1, screen: 2, erase: 3, add: 4 };
const MODE = { sprite: 0, solid: 1, circle: 2, ring: 3, glow: 4, line: 5, silhouette: 6, beam: 7 };

const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 aExt;
uniform vec2 uView;
uniform vec2 uOff;
out vec2 vUV; out vec4 vCol; flat out int vTex; flat out int vMode; out float vAdd; out float vParam;
void main(){
  gl_Position = vec4(aPos * uView + uOff, 0.0, 1.0);
  vUV = aUV; vCol = aCol;
  vTex = int(aExt.x * 255.0 + 0.5); vMode = int(aExt.y * 255.0 + 0.5); vAdd = aExt.z; vParam = aExt.w;
}`;
const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D uT[8];
in vec2 vUV; in vec4 vCol; flat in int vTex; flat in int vMode; in float vAdd; in float vParam;
out vec4 o;
vec4 tx(int i, vec2 uv){
  if(i==0) return texture(uT[0],uv); if(i==1) return texture(uT[1],uv); if(i==2) return texture(uT[2],uv); if(i==3) return texture(uT[3],uv);
  if(i==4) return texture(uT[4],uv); if(i==5) return texture(uT[5],uv); if(i==6) return texture(uT[6],uv); return texture(uT[7],uv);
}
void main(){
  vec4 col = vec4(vCol.rgb * vCol.a, vCol.a);
  vec4 c;
  if (vMode == 0) {
    c = tx(vTex, vUV) * col;
    if (vParam > 0.0) c.rgb = mix(c.rgb, vec3(c.a), vParam);
  } else if (vMode == 1) {
    c = col;
  } else if (vMode == 2) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else if (vMode == 3) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4); float inner = 1.0 - max(vParam, aa * 1.5);
    c = col * (smoothstep(inner - aa, inner, d) * (1.0 - smoothstep(1.0 - aa, 1.0, d)));
  } else if (vMode == 4) {
    float d = length(vUV); float a = max(0.0, 1.0 - d); a = a * a * (1.0 + vParam * 3.0 * a);
    c = col * a;
  } else if (vMode == 5) {
    float d = abs(vUV.y); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else if (vMode == 6) {
    c = col * tx(vTex, vUV).a;
  } else {
    // 光束：v 是「到中線的距離 ÷ 寬端半寬」，除以這裡的半寬比例（窄端比例放在 param）才不會在梯形對角線折一下
    float hw = mix(vParam, 1.0, clamp(vUV.x, 0.0, 1.0));
    float a = clamp(1.0 - abs(vUV.y) / max(hw, 0.001), 0.0, 1.0);
    c = col * (a * a * (3.0 - 2.0 * a));
  }
  c.a *= (1.0 - vAdd);
  o = c;
}`;
const FULL_VS = `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const BRIGHT_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThresh; in vec2 vUV; out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV + uTexel * vec2(-0.5,-0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,-0.5)).rgb
         + texture(uTex, vUV + uTexel * vec2(-0.5,0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,0.5)).rgb;
  c *= 0.25;
  // 亮度：以人眼亮度為主（飽和的橘、紅這類「顏色很鮮但不是光」的美術不會整片發光），
  // 再參考最亮的通道（霓虹、火光這種純色光還是會微微發光）；疊加發光（add）疊出來的白光照樣強烈泛光
  float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)) * 0.85);
  float k = smoothstep(uThresh, uThresh + 0.3, l) * (0.35 + 0.65 * min(l, 1.0));
  o = vec4(c * k, 1.0);
}`;
const DOWN_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec3 s = texture(uTex, vUV).rgb * 4.0;
  s += texture(uTex, vUV - uTexel).rgb; s += texture(uTex, vUV + uTexel).rgb;
  s += texture(uTex, vUV + vec2(uTexel.x, -uTexel.y)).rgb; s += texture(uTex, vUV - vec2(uTexel.x, -uTexel.y)).rgb;
  o = vec4(s / 8.0, 1.0);
}`;
const UP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec2 h = uTexel * 0.5; vec3 s = vec3(0.0);
  s += texture(uTex, vUV + vec2(-h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, -h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(s / 12.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uScene; uniform sampler2D uBloom;
uniform vec2 uRes; uniform float uTime; uniform float uAspect;
uniform vec4 uWave[4]; uniform vec4 uWaveP[4]; uniform int uWaves;
uniform float uChroma; uniform float uBloomAmt; uniform float uVig; uniform vec3 uVigCol; uniform float uGrain;
uniform float uSat; uniform float uContrast; uniform float uBright; uniform vec3 uTint; uniform vec4 uFlash; uniform float uScan; uniform float uWarp;
uniform sampler2D uLut0; uniform sampler2D uLut1; uniform float uLutMix; uniform float uLutAmt;
in vec2 vUV; out vec4 o;
// 16³ 調色表（256×16 的長條：藍色分 16 片、每片 16×16 是紅×綠）
vec3 lut(sampler2D t, vec3 c){
  c = clamp(c, 0.0, 1.0);
  float b = c.b * 15.0, b0 = floor(b), b1 = min(b0 + 1.0, 15.0);
  float x = c.r * 15.0 + 0.5, y = (c.g * 15.0 + 0.5) / 16.0;
  return mix(texture(t, vec2((b0 * 16.0 + x) / 256.0, y)).rgb, texture(t, vec2((b1 * 16.0 + x) / 256.0, y)).rgb, b - b0);
}
void main(){
  vec2 uv = vUV;
  if (uWarp > 0.0) { vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 + dot(c, c) * uWarp); }
  for (int i = 0; i < 4; i++) {
    if (i >= uWaves) break;
    vec4 w = uWave[i]; vec2 d = uv - w.xy; d.x *= uAspect; float dist = length(d);
    float th = uWaveP[i].x; float k = 1.0 - smoothstep(0.0, th, abs(dist - w.z));
    if (dist > 0.0001) { vec2 n = d / dist; n.x /= uAspect; uv -= n * k * w.w; }
  }
  vec3 col;
  if (uChroma > 0.0) { vec2 off = (uv - 0.5) * uChroma; col = vec3(texture(uScene, uv + off).r, texture(uScene, uv).g, texture(uScene, uv - off).b); }
  else col = texture(uScene, uv).rgb;
  if (uBloomAmt > 0.0) col += texture(uBloom, uv).rgb * uBloomAmt;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5 + uBright;
  col *= uTint;
  if (uLutAmt > 0.0) { vec3 g = lut(uLut0, col); if (uLutMix > 0.0) g = mix(g, lut(uLut1, col), uLutMix); col = mix(col, g, uLutAmt); }
  if (uVig > 0.0) { vec2 q = vUV - 0.5; q.x *= mix(1.0, uAspect, 0.5); float v = 1.0 - smoothstep(0.2, 0.85, length(q) * 1.15); col = mix(uVigCol, col, mix(1.0, v, uVig)); }
  if (uScan > 0.0) col *= 1.0 - uScan * (0.5 + 0.5 * sin(vUV.y * uRes.y * 3.14159));
  col = mix(col, uFlash.rgb, uFlash.a);
  if (uGrain > 0.0) { float n = fract(sin(dot(vUV * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453); col += (n - 0.5) * uGrain; }
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/* ---- 光影（25_light.js 用）：遮光圖 → 跳躍填色（JFA）算距離場 → 每盞燈一個方塊，柔和陰影 ---- */
// JFA 每個格子存「最近的牆邊格子的相對位移」：r、g＝dx、dy（偏 128，±127 格內），b＝那個牆邊格子被蓋住多少（0.5～1，0＝沒找到；用來算到次像素的邊），a＝這格自己在不在牆裡
// 種子是「牆的邊緣」：牆外的點量到牆邊、牆裡的點量到出口 → 有正負號的距離場，光走進牆裡也能平順地算
const JFA_SEED_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uTex; out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy), S = textureSize(uTex, 0);
  float a = texelFetch(uTex, p, 0).a; bool ins = a > 0.5, edge = false;
  if (ins) {
    if (p.x + 1 < S.x && texelFetch(uTex, p + ivec2(1, 0), 0).a <= 0.5) edge = true;
    if (p.x > 0 && texelFetch(uTex, p - ivec2(1, 0), 0).a <= 0.5) edge = true;
    if (p.y + 1 < S.y && texelFetch(uTex, p + ivec2(0, 1), 0).a <= 0.5) edge = true;
    if (p.y > 0 && texelFetch(uTex, p - ivec2(0, 1), 0).a <= 0.5) edge = true;
  }
  o = vec4(128.0 / 255.0, 128.0 / 255.0, edge ? max(a, 0.51) : 0.0, ins ? 1.0 : 0.0);
}`;
const JFA_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uTex; uniform int uStep; uniform ivec2 uSize; out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy); int best = 1 << 30; ivec2 bo = ivec2(0); float bc = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 q = p + ivec2(i, j) * uStep;
    if (q.x < 0 || q.y < 0 || q.x >= uSize.x || q.y >= uSize.y) continue;
    vec4 s = texelFetch(uTex, q, 0); if (s.b < 0.25) continue;
    ivec2 off = q + ivec2(floor(s.rg * 255.0 + 0.5)) - 128 - p; int d = off.x * off.x + off.y * off.y;
    if (d < best) { best = d; bo = off; bc = s.b; }
  }
  float ins = texelFetch(uTex, p, 0).a;
  o = (bc > 0.25 && abs(bo.x) <= 127 && abs(bo.y) <= 127) ? vec4((vec2(bo) + 128.0) / 255.0, bc, ins) : vec4(128.0 / 255.0, 128.0 / 255.0, 0.0, ins);
}`;
// 畫布像素座標的方塊（燈、水面）：uRect＝x0,y0,x1,y1（畫布 px，y 往下）
const RECT_VS = `#version 300 es
uniform vec4 uRect; uniform vec2 uCanvas; out vec2 vP;
void main(){ vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)); vec2 p = mix(uRect.xy, uRect.zw, c); vP = p; gl_Position = vec4(p.x / uCanvas.x * 2.0 - 1.0, 1.0 - p.y / uCanvas.y * 2.0, 0.0, 1.0); }`;
const LIGHT_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uJfa; uniform vec2 uCanvas; uniform vec2 uMS; uniform ivec2 uMSize;
uniform vec2 uPos; uniform float uRad; uniform vec3 uCol; uniform float uHaze; uniform vec4 uCone; uniform float uFall;
uniform vec4 uSh; uniform float uSeed; uniform float uFar;
in vec2 vP; layout(location=0) out vec4 o; layout(location=1) out vec4 oHaze;
vec2 toM(vec2 p){ return vec2(p.x * uMS.x, (uCanvas.y - p.y) * uMS.y); }
// 有正負號的距離（遮光圖的格子）：牆外＝到牆邊多遠，牆裡＝負的（到出口多遠）；畫面外當成空地
float sdf(vec2 m){
  if (m.x < 0.0 || m.y < 0.0 || m.x >= float(uMSize.x) || m.y >= float(uMSize.y)) return uFar;
  ivec2 t = ivec2(floor(m)); vec4 s = texelFetch(uJfa, t, 0); float d = uFar;
  float c = 1.0;
  if (s.b > 0.25) { ivec2 off = ivec2(floor(s.rg * 255.0 + 0.5)) - 128; d = length(m - (vec2(t + off) + 0.5)); c = s.b; }
  return s.a > 0.5 ? -(d + c - 0.5) : max(d + 0.5 - c, 0.0);
}
float shadow(vec2 p, vec2 l){
  vec2 v = l - p; float len = length(v); if (len < 1.0) return 1.0;
  vec2 dir = v / len; float res = 1.0, t = 0.0, tEnd = len, d;
  // 燈本身嵌在牆裡（牆上的火把）：燈旁邊那段牆不擋
  if (sdf(l) < 0.0) { float e = 0.0; for (int i = 0; i < 24; i++) { d = sdf(l - dir * e); if (d >= 0.0 || e >= len) break; e += max(-d, 0.5); } tEnd = len - e; }
  // 自己就在牆裡：光只滲進表面一點點（牆面、柱子朝燈的那一側有亮邊）。走出自己這面牆之後，從出口再往燈算
  float t0 = 0.0;
  if (sdf(p) < 0.0) {
    d = -1.0;
    for (int i = 0; i < 24; i++) { d = sdf(p + dir * t); if (d >= 0.0 || t >= tEnd) break; t += max(-d, 0.35); }
    float pen = d >= 0.0 ? max(t - d, 0.0) : t;
    res = 1.0 - smoothstep(uSh.z * 0.3, uSh.z + 0.001, pen);
    if (res < 0.003) return 0.0;
    if (t >= tEnd) return res;
    t0 = t; t += 1.0;
  } else t = 1.0;
  // 往燈的方向跳著走（距離場說可以放心跳多遠），順便量「擦邊」多近 → 半影
  float k = len / max(uSh.y, 0.5); int steps = int(uSh.w);
  for (int i = 0; i < 64; i++) {
    if (i >= steps || t >= tEnd - max(uSh.y, 1.0)) break;   // 光源本身有大小：擦過燈旁邊（光源範圍內）的牆不算擋住
    d = sdf(p + dir * t);
    if (d <= 0.0) return 0.0;
    res = min(res, k * d / (t - t0)); if (res < 0.003) return 0.0;
    t += max(d, 0.75);
  }
  res = clamp(res, 0.0, 1.0); return res * res * (3.0 - 2.0 * res);
}
void main(){
  vec2 d = vP - uPos; float L = length(d), s = L / uRad;
  if (s >= 1.0) discard;
  float w = clamp(1.0 - s * s * s * s, 0.0, 1.0), att = w * w / (1.0 + uFall * s * s);
  if (uCone.z > -1.5) { vec2 dn = L > 0.001 ? d / L : uCone.xy; att *= max(smoothstep(uCone.z, uCone.w, dot(dn, uCone.xy)), (1.0 - smoothstep(0.0, 0.04, s)) * 0.5); }
  if (att < 0.002) discard;
  float sh = uSh.x > 0.5 ? shadow(toM(vP), toM(uPos)) : 1.0;
  vec3 c = uCol * att * sh;
  float n = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  o = vec4(c + n * (1.5 / 255.0), 1.0); oHaze = vec4(c * uHaze, 1.0);
}`;
// 環境光區塊（室內暗、室外亮；側視遊戲的天空背景）：方塊內換成另一種環境光，邊緣柔和
const ZONE_FS = `#version 300 es
precision highp float;
uniform vec4 uRect; uniform vec4 uCol; uniform float uSoft; in vec2 vP; layout(location=0) out vec4 o; layout(location=1) out vec4 oHaze;
void main(){ vec2 d = min(vP - uRect.xy, uRect.zw - vP); float m = smoothstep(0.0, max(uSoft, 0.001), min(d.x, d.y)) * uCol.a; o = vec4(uCol.rgb * 0.5, m); oHaze = vec4(0.0); }`;
const APPLY_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; in vec2 vUV; out vec4 o;
void main(){ o = vec4(texture(uTex, vUV).rgb, 1.0); }`;
// 水面、熱浪：先把畫面「抓」下來，再用扭曲過的座標讀回去
const GRAB_FS = `#version 300 es
precision highp float;
uniform sampler2D uGrab; uniform vec2 uCanvas; uniform vec4 uRect; uniform float uTime;
uniform vec4 uCol; uniform vec4 uP; uniform vec4 uW; uniform vec4 uSky; uniform float uShape;
in vec2 vP; out vec4 o;
vec2 uvOf(vec2 p){ p = clamp(p, vec2(0.5), uCanvas - 0.5); return vec2(p.x / uCanvas.x, 1.0 - p.y / uCanvas.y); }
void main(){
  vec2 sz = max(uRect.zw - uRect.xy, vec2(1.0)), q = (vP - uRect.xy) / sz;
  vec2 wp = (vP - uRect.xy) / uW.x + uW.yz; float t = uTime * uW.w; int mode = int(uP.x + 0.5);
  if (mode == 2) {
    float edge = smoothstep(0.0, 0.25, q.x) * smoothstep(1.0, 0.75, q.x) * smoothstep(0.0, 0.35, q.y) * smoothstep(1.0, 0.8, q.y);
    vec2 off = vec2(sin(wp.y * 0.09 + t * 5.0) + sin(wp.y * 0.23 - t * 7.0 + wp.x * 0.05) * 0.5, sin(wp.x * 0.11 + t * 4.0) * 0.4) * uP.y * edge;
    float m = uShape > 0.5 ? 1.0 - smoothstep(0.82, 1.0, length(q * 2.0 - 1.0)) : 1.0;
    o = vec4(texture(uGrab, uvOf(vP + off)).rgb * m, m); return;
  }
  float depth = mode == 0 ? q.y : 0.5;
  float ax = sin(wp.x * 0.045 + t * 1.7) * 0.6 + sin(wp.x * 0.13 - t * 2.3 + wp.y * 0.07) * 0.4;
  float ay = sin(wp.y * 0.09 + t * 1.9 + wp.x * 0.02) * 0.5 + sin(wp.x * 0.07 + t * 1.1) * 0.5;
  vec2 rip = vec2(ax, ay) * uP.y * (0.35 + depth * 0.9);
  vec3 col = texture(uGrab, uvOf(vP + rip * 0.6)).rgb;
  if (mode == 0) {
    vec2 src = vec2(vP.x + rip.x * 1.4, 2.0 * uRect.y - vP.y + rip.y * 1.8);
    vec3 refl = texture(uGrab, uvOf(src)).rgb;
    if (src.y < 0.0) refl = uSky.rgb;
    float f = uP.z * (0.25 + 0.75 * (1.0 - smoothstep(0.0, 1.0, depth)));
    col = mix(col, refl, f);
    float line = 1.0 - smoothstep(0.0, max(1.5, uW.x * 1.2), abs(vP.y - uRect.y - ay * uP.y * 0.3));
    col += line * uP.w * 0.5;
  } else {
    float c1 = sin(wp.x * 0.08 + t * 1.3 + sin(wp.y * 0.07 + t)) * sin(wp.y * 0.09 - t * 1.1 + sin(wp.x * 0.05));
    col += vec3(pow(max(c1, 0.0), 6.0)) * uP.z * 0.45;
  }
  col = mix(col, uCol.rgb, uCol.a * (0.3 + 0.7 * depth));
  // 橢圓（水窪、池塘）：邊緣柔和地淡掉，還有一圈亮邊
  float m = 1.0;
  if (uShape > 0.5) { float e = length(q * 2.0 - 1.0); m = 1.0 - smoothstep(0.86, 1.0, e); col += smoothstep(0.7, 0.93, e) * (1.0 - smoothstep(0.93, 1.0, e)) * uP.w * 0.25; }
  o = vec4(col * m, m);
}`;

/** 後製參數（PZ.post）：特效模組會去動它們；遊戲也可以直接設 */
const Post = PZ.post = {
  enabled: true,
  bloom: { on: true, strength: 0.6, threshold: 0.78 },
  vignette: 0.35, vignetteColor: '#000', chroma: 0, grain: 0.035, scan: 0, warp: 0,
  sat: 1, contrast: 1, bright: 0, tint: [1, 1, 1],
  flash: [1, 1, 1, 0],
  waves: [], // {x, y（螢幕 px）, r, strength, thick}
};

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('著色器編譯失敗：' + log); }
  return s;
}
function program(gl, vs, fs, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('著色器連結失敗：' + gl.getProgramInfoLog(p));
  const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

class GLRenderer {
  constructor(canvas) {
    this.kind = 'webgl2'; this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', desynchronized: false });
    if (!gl) throw new Error('這台裝置不支援 WebGL2');
    this.gl = gl;
    this.textures = new Set();
    this.stats = { draws: 0, quads: 0, flushes: 0, tex: 0, lights: 0 };
    this.buf = new ArrayBuffer(MAX_QUADS * QUAD_WORDS * 4);
    this.f32 = new Float32Array(this.buf); this.u32 = new Uint32Array(this.buf);
    this.n = 0; this.slots = []; this.blend = 0; this.target = null; this.inScene = false; this.lost = false;
    this.w = canvas.width; this.h = canvas.height;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.lostAt = Time.real; PZ.emit('contextlost'); }, false);
    canvas.addEventListener('webglcontextrestored', () => { try { this.lost = false; this.setup(); for (const t of [...this.textures]) { t.gl = null; t.fb = null; if (t.restore) t.restore(t); else this.texAlloc(t); } PZ.emit('contextrestored'); } catch (e) { reportError(e, 'contextrestored'); } }, false);
    this.setup();
  }
  setup() {
    const gl = this.gl;
    this.maxSlots = Math.min(8, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    this.sp = program(gl, SPRITE_VS, SPRITE_FS, ['uView', 'uOff', 'uT']);
    gl.useProgram(this.sp.p); gl.uniform1iv(this.sp.u.uT, [0, 1, 2, 3, 4, 5, 6, 7]);
    this.pBright = program(gl, FULL_VS, BRIGHT_FS, ['uTex', 'uTexel', 'uThresh']);
    this.pDown = program(gl, FULL_VS, DOWN_FS, ['uTex', 'uTexel']);
    this.pUp = program(gl, FULL_VS, UP_FS, ['uTex', 'uTexel']);
    this.pComp = program(gl, FULL_VS, COMP_FS, ['uScene', 'uBloom', 'uRes', 'uTime', 'uAspect', 'uWave', 'uWaveP', 'uWaves', 'uChroma', 'uBloomAmt', 'uVig', 'uVigCol', 'uGrain', 'uSat', 'uContrast', 'uBright', 'uTint', 'uFlash', 'uScan', 'uWarp', 'uLut0', 'uLut1', 'uLutMix', 'uLutAmt']);
    // 光影、水面用的著色器：第一次用到才編譯（沒用光影的遊戲不花這個時間）
    this.pl = null; this.lfbo = {}; this.lfboKey = ''; this.grabTex = null; this.grabW = 0; this.grabH = 0;
    this.lut = [null, null]; this.lutVer = [-1, -1];
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW);
    const stride = VERT_WORDS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, stride, 20);
    const idx = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0, v = 0; i < idx.length; i += 6, v += 4) { idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v; idx[i + 4] = v + 2; idx[i + 5] = v + 3; }
    this.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.emptyVao = gl.createVertexArray();
    // 1×1 白色貼圖：形狀用、沒用到的貼圖槽也綁它
    this.white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
    this.applyBlend(0);
    this.fbo = {}; // 場景、泛光鏈
    this.fboSize = '';
  }
  /* ---- 貼圖 ---- */
  texCreate(w, h, o = {}) {
    const t = { id: ++TexId, w, h, gl: null, nearest: !!o.nearest, rt: !!o.rt, restore: o.restore || null, fb: null };
    this.texAlloc(t); this.textures.add(t); return t;
  }
  texAlloc(t) {
    const gl = this.gl; t.gl = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = t.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (t.rt) { t.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.gl, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  /** 把 canvas／圖片貼到貼圖的 (x, y)（整張來源） */
  texUpload(t, src, x = 0, y = 0) {
    if (this.lost) return;
    const gl = this.gl; this.flush();
    if (!t.gl) this.texAlloc(t);
    gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  texClear(t) { if (this.lost || !t.gl) return; this.flush(); const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t.gl); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }
  texDelete(t) { if (t.gl && !this.lost) { this.flush(); this.gl.deleteTexture(t.gl); if (t.fb) this.gl.deleteFramebuffer(t.fb); } t.gl = null; t.fb = null; this.textures.delete(t); }
  /* ---- 離屏畫布（場景、泛光）---- */
  /** 建一張離屏畫布：o.nearest（不內插）、o.extra（多一張同大小的貼圖接在第二個出口，畫光的時候順便畫霧裡的光） */
  makeFbo(w, h, o = {}) {
    const gl = this.gl; w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    const tx = () => {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = o.nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const tex = tx(), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const out = { tex, fb, w, h, tex2: null };
    if (o.extra) { out.tex2 = tx(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, out.tex2, 0); }
    return out;
  }
  dropFbo(f) { if (!f) return; const gl = this.gl; gl.deleteTexture(f.tex); if (f.tex2) gl.deleteTexture(f.tex2); gl.deleteFramebuffer(f.fb); }
  ensureFbos() {
    const key = this.w + 'x' + this.h + ':' + (Quality.cur.bloom || 0);
    if (key === this.fboSize) return;
    this.fboSize = key;
    const gl = this.gl;
    for (const k in this.fbo) this.dropFbo(this.fbo[k]);
    this.fbo = {};
    const mk = (name, w, h) => { this.fbo[name] = this.makeFbo(w, h); };
    mk('scene', this.w, this.h);
    const b = Quality.cur.bloom || 0;
    if (b) { const d = b >= 2 ? 2 : 4; mk('b0', this.w / d, this.h / d); mk('b1', this.w / d / 2, this.h / d / 2); mk('b2', this.w / d / 4, this.h / d / 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* ---- 一格的開始與結束 ---- */
  usePost() { return Post.enabled && Quality.cur.post && !this.lost; }
  begin(clear) {
    if (this.lost) return;
    const gl = this.gl;
    this.w = this.canvas.width; this.h = this.canvas.height;
    this.stats.draws = this.stats.quads = this.stats.flushes = this.stats.lights = 0;
    this.n = 0; this.slots.length = 0; this.inTarget = false;
    this.inScene = this.usePost();
    if (this.inScene) { this.ensureFbos(); this.bindTarget(this.fbo.scene.fb, this.w, this.h, false); }
    else this.bindTarget(null, this.w, this.h, false);
    const c = toColor(clear == null ? '#000' : clear);
    gl.clearColor(cR(c) / 255, cG(c) / 255, cB(c) / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  bindTarget(fb, w, h, rt, vw, vh) {
    const gl = this.gl; this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, vw || w, vh || h);
    gl.useProgram(this.sp.p); gl.bindVertexArray(this.vao);
    // 畫到貼圖（rt）時 y 不翻：貼圖第 0 列在下面，之後當貼圖用時 UV 翻一下
    gl.uniform2f(this.sp.u.uView, 2 / w, rt ? 2 / h : -2 / h); gl.uniform2f(this.sp.u.uOff, -1, rt ? -1 : 1);
    this.curW = w; this.curH = h;
    this.applyBlend(this.blend, true);
  }
  /** 開始畫到某張貼圖（rt：用 texCreate(w, h, {rt:true}) 建的）；endTarget() 回到原本的地方 */
  beginTarget(t, clear) {
    if (this.lost) return;
    this.flush(); this._prevTarget = this.inScene ? this.fbo.scene : null; this.inTarget = true;
    if (!t.gl) this.texAlloc(t);
    this.bindTarget(t.fb, t.w, t.h, true);
    if (clear !== undefined) { const gl = this.gl, c = toColor(clear); gl.clearColor(cR(c) / 255 * cA(c), cG(c) / 255 * cA(c), cB(c) / 255 * cA(c), cA(c)); gl.clear(gl.COLOR_BUFFER_BIT); }
  }
  endTarget() { this.inTarget = false; if (this.lost) return; const p = this._prevTarget; this.bindTarget(p ? p.fb : null, this.w, this.h, false); }
  applyBlend(b, force) {
    if (b === this.blend && !force) return;
    this.flush(); this.blend = b; const gl = this.gl;
    if (b === 1) gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 2) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else if (b === 3) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 4) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  setBlend(name) { this.applyBlend(BLEND[name] || 0); }
  slotOf(t) {
    if (!t) return 0;
    const s = this.slots; for (let i = 0; i < s.length; i++) if (s[i] === t) return i;
    if (s.length >= this.maxSlots) this.flush();
    s.push(t); return s.length - 1;
  }
  /**
   * 畫一個四邊形：單位正方形 (0,0)-(1,1) 經過仿射矩陣 [a c e; b d f] 變成畫面上的位置（畫布像素）。
   * u0,v0,u1,v1：貼圖座標；形狀模式時是 -1～1。color：打包顏色；mode：MODE；add：0～1 發光；param：模式參數（閃白、環的粗細…）
   */
  quad(t, a, b, c, d, e, f, u0, v0, u1, v1, color, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = e; F[i + 1] = f; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + e; F[i + 1] = b + f; F[i + 2] = u1; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + c + e; F[i + 1] = b + d + f; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = c + e; F[i + 1] = d + f; F[i + 2] = u0; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext;
    this.n++;
  }
  /** 任意四個角的四邊形（拖尾、梯形光束）：0→1→2→3 順時針；c0 給 0、3 角，c1 給 1、2 角（可以一頭濃一頭淡） */
  quad4(t, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, c0, c1, mode, add, param) { this.quadv(t, x0, y0, u0, v0, x1, y1, u1, v0, x2, y2, u1, v1, x3, y3, u0, v1, c0, c1, mode, add, param); }
  /** 同上，但四個角各自給貼圖座標（光束要用） */
  quadv(t, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2, x3, y3, u3, v3, c0, c1, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = x0; F[i + 1] = y0; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = c0; U[i + 5] = ext; i += 6;
    F[i] = x1; F[i + 1] = y1; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x2; F[i + 1] = y2; F[i + 2] = u2; F[i + 3] = v2; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x3; F[i + 1] = y3; F[i + 2] = u3; F[i + 3] = v3; U[i + 4] = c0; U[i + 5] = ext;
    this.n++;
  }
  /** 實心三角形（多邊形拆成三角形用）：第二個三角形退化 */
  tri(x1, y1, x2, y2, x3, y3, color, add) {
    if (this.lost) return;
    if (this.n >= MAX_QUADS) this.flush();
    const ext = ((((add * 255) & 255) << 16) | (MODE.solid << 8)) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    const put = (x, y) => { F[i] = x; F[i + 1] = y; F[i + 2] = 0; F[i + 3] = 0; U[i + 4] = color; U[i + 5] = ext; i += 6; };
    put(x1, y1); put(x2, y2); put(x3, y3); put(x3, y3);
    this.n++;
  }
  flush() {
    if (!this.n || this.lost) { this.n = 0; return; }
    const gl = this.gl;
    for (let i = 0; i < this.maxSlots; i++) { gl.activeTexture(gl.TEXTURE0 + i); const t = this.slots[i]; gl.bindTexture(gl.TEXTURE_2D, t && t.gl ? t.gl : this.white); }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32, 0, this.n * QUAD_WORDS);
    gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_SHORT, 0);
    this.stats.draws++; this.stats.quads += this.n;
    this.n = 0; this.slots.length = 0;
  }
  /* ---- 光影、水面（著色器第一次用到才編譯）---- */
  lightProgs() {
    if (this.pl) return this.pl;
    const gl = this.gl;
    this.pl = {
      seed: program(gl, FULL_VS, JFA_SEED_FS, ['uTex']),
      jfa: program(gl, FULL_VS, JFA_FS, ['uTex', 'uStep', 'uSize']),
      light: program(gl, RECT_VS, LIGHT_FS, ['uRect', 'uCanvas', 'uJfa', 'uMS', 'uMSize', 'uPos', 'uRad', 'uCol', 'uHaze', 'uCone', 'uFall', 'uSh', 'uSeed', 'uFar']),
      apply: program(gl, FULL_VS, APPLY_FS, ['uTex']),
      zone: program(gl, RECT_VS, ZONE_FS, ['uRect', 'uCanvas', 'uCol', 'uSoft']),
      grab: program(gl, RECT_VS, GRAB_FS, ['uRect', 'uCanvas', 'uGrab', 'uTime', 'uCol', 'uP', 'uW', 'uSky', 'uShape']),
    };
    return this.pl;
  }
  /**
   * 光影（25_light.js 呼叫）。S = { ambient: [r,g,b]（0～1）, zones: [{ x0,y0,x1,y1（畫布 px）, r,g,b,a, soft }], lights, n, scale（光照圖解析度）, mask（遮光圖解析度）, shadows, steps, drawOcc()（畫遮光物）, haze }
   * 每盞燈：{ x, y, r（畫布 px）, cr, cg, cb（已乘強度）, cone: null | [dx, dy, cos外, cos內], size, soak（畫布 px）, sh, haze, fall }
   */
  lighting(S) {
    if (this.lost || this.inTarget) return false;
    const gl = this.gl, P = this.lightProgs();
    this.flush();
    const W = this.w, H = this.h, prev = this.inScene ? this.fbo.scene : null;
    const lw = Math.max(1, Math.ceil(W * S.scale)), lh = Math.max(1, Math.ceil(H * S.scale));
    const mk = S.mask || S.scale, mw = Math.max(1, Math.ceil(W * mk)), mh = Math.max(1, Math.ceil(H * mk)), key = lw + 'x' + lh + '/' + mw + 'x' + mh;
    if (key !== this.lfboKey) {
      for (const k in this.lfbo) this.dropFbo(this.lfbo[k]);
      this.lfbo = { lm: this.makeFbo(lw, lh, { extra: true }), mask: this.makeFbo(mw, mh), j0: this.makeFbo(mw, mh, { nearest: true }), j1: this.makeFbo(mw, mh, { nearest: true }) };
      this.lfboKey = key;
    }
    const F = this.lfbo; let jfa = null;
    if (S.shadows && S.drawOcc) {
      // 1) 遮光圖：用平常的畫圖程式、照相機畫，只是畫在小張的圖上
      const pb = this.blend; this.applyBlend(0, true);
      this.bindTarget(F.mask.fb, W, H, false, mw, mh);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      try { S.drawOcc(); } catch (e) { reportError(e, 'light.occluders'); }
      this.flush(); this.blend = pb;
      // 2) 距離場（JFA：步長 reach、reach/2 … 1；最遠量到 2×reach 格，再遠就當「很遠」）
      gl.disable(gl.BLEND); gl.bindVertexArray(this.emptyVao);
      const pass = (prog, src, dst) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, mw, mh); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uTex, 0); };
      pass(P.seed, F.mask, F.j0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      let a = F.j0, b = F.j1;
      for (let st = S.reach || 64; st >= 1; st >>= 1) { pass(P.jfa, a, b); gl.uniform1i(P.jfa.u.uStep, st); gl.uniform2i(P.jfa.u.uSize, mw, mh); gl.drawArrays(gl.TRIANGLES, 0, 3); const t = a; a = b; b = t; }
      jfa = a;
    }
    // 3) 光照圖：先鋪環境光，每盞燈一個方塊加上去；「霧裡的光」同時畫進第二張
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.lm.fb); gl.viewport(0, 0, lw, lh);
    gl.drawBuffers(S.haze ? [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0, gl.NONE]);
    const amb = this._amb || (this._amb = new Float32Array(4));
    amb[0] = S.ambient[0] * 0.5; amb[1] = S.ambient[1] * 0.5; amb[2] = S.ambient[2] * 0.5; amb[3] = 1; gl.clearBufferfv(gl.COLOR, 0, amb);
    if (S.haze) { amb[0] = amb[1] = amb[2] = 0; gl.clearBufferfv(gl.COLOR, 1, amb); }
    gl.enable(gl.BLEND); gl.bindVertexArray(this.emptyVao);
    if (S.zones && S.zones.length) {
      const Z = P.zone, zu = Z.u; gl.useProgram(Z.p); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform2f(zu.uCanvas, W, H);
      for (const z of S.zones) { gl.uniform4f(zu.uRect, z.x0, z.y0, z.x1, z.y1); gl.uniform4f(zu.uCol, z.r, z.g, z.b, z.a); gl.uniform1f(zu.uSoft, z.soft); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    }
    gl.blendFunc(gl.ONE, gl.ONE);
    const L = P.light, u = L.u, ms = mw / W; gl.useProgram(L.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, jfa ? jfa.tex : this.white); gl.uniform1i(u.uJfa, 0);
    gl.uniform2f(u.uCanvas, W, H); gl.uniform2f(u.uMS, mw / W, mh / H); gl.uniform2i(u.uMSize, mw, mh); gl.uniform1f(u.uSeed, (Time.frame % 64) * 1.7); gl.uniform1f(u.uFar, Math.min(127, (S.reach || 64) * 2 - 1));
    for (let i = 0; i < S.n; i++) {
      const l = S.lights[i];
      gl.uniform4f(u.uRect, l.x - l.r, l.y - l.r, l.x + l.r, l.y + l.r);
      gl.uniform2f(u.uPos, l.x, l.y); gl.uniform1f(u.uRad, l.r); gl.uniform3f(u.uCol, l.cr, l.cg, l.cb); gl.uniform1f(u.uHaze, l.haze); gl.uniform1f(u.uFall, l.fall);
      if (l.cone) gl.uniform4f(u.uCone, l.cone[0], l.cone[1], l.cone[2], l.cone[3]); else gl.uniform4f(u.uCone, 1, 0, -2, -1.9);
      gl.uniform4f(u.uSh, jfa && l.sh ? 1 : 0, l.size * ms, l.soak * ms, S.steps);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // 4) 乘回場景（2× 相乘：光照圖 0.5＝原色，最亮可到原色的兩倍），霧裡的光再加上去
    gl.bindFramebuffer(gl.FRAMEBUFFER, prev ? prev.fb : null); gl.viewport(0, 0, W, H);
    const A = P.apply; gl.useProgram(A.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(A.u.uTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, F.lm.tex); gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (S.haze) { gl.bindTexture(gl.TEXTURE_2D, F.lm.tex2); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    this.stats.lights += S.n;
    this.bindTarget(prev ? prev.fb : null, W, H, false);
    return true;
  }
  /**
   * 水面、熱浪：把畫面一塊抓下來，扭曲後畫回去。o = { mode: 0 倒影（側視）| 1 俯視水面 | 2 熱浪, rect: [x0,y0,x1,y1]（畫布 px）,
   *   src: [x0,y0,x1,y1] 要抓的範圍, col: [r,g,b,a], amp（畫布 px）, reflect, foam, scale（畫布 px／世界單位）, wx, wy（方塊左上角的世界座標）, speed, sky: [r,g,b] }
   */
  grab(o) {
    if (this.lost || this.inTarget) return false;
    const gl = this.gl, P = this.lightProgs(); this.flush();
    const W = this.w, H = this.h;
    if (!this.grabTex || this.grabW !== W || this.grabH !== H) {
      if (this.grabTex) gl.deleteTexture(this.grabTex);
      this.grabTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.grabTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, W, H, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.grabW = W; this.grabH = H;
    }
    const s = o.src, x0 = clamp(Math.floor(s[0]), 0, W), y0 = clamp(Math.floor(s[1]), 0, H), x1 = clamp(Math.ceil(s[2]), 0, W), y1 = clamp(Math.ceil(s[3]), 0, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.grabTex);
    if (x1 > x0 && y1 > y0) gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x0, H - y1, x0, H - y1, x1 - x0, y1 - y0);
    const G = P.grab, u = G.u; gl.useProgram(G.p); gl.bindVertexArray(this.emptyVao); gl.uniform1i(u.uGrab, 0);
    const r = o.rect; gl.uniform4f(u.uRect, r[0], r[1], r[2], r[3]); gl.uniform2f(u.uCanvas, W, H); gl.uniform1f(u.uTime, o.time);
    gl.uniform4f(u.uCol, o.col[0], o.col[1], o.col[2], o.col[3]); gl.uniform4f(u.uP, o.mode, o.amp, o.reflect, o.foam);
    gl.uniform4f(u.uW, o.scale, o.wx, o.wy, o.speed); gl.uniform4f(u.uSky, o.sky[0], o.sky[1], o.sky[2], 1); gl.uniform1f(u.uShape, o.shape ? 1 : 0);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.bindTarget(this.inScene ? this.fbo.scene.fb : null, W, H, false);
    return true;
  }
  /** 調色表（PZ.post.grade）：兩張 256×16，換的時候淡入淡出 */
  lutSync(i, data, ver) {
    const gl = this.gl;
    if (!this.lut[i]) {
      this.lut[i] = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.lut[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.lutVer[i] = -1;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.lut[i]);
    if (this.lutVer[i] !== ver) { gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 16, gl.RGBA, gl.UNSIGNED_BYTE, data); this.lutVer[i] = ver; }
  }
  /** 場景畫完：做後製並換到螢幕；之後畫的東西（HUD）不受震動、色差影響 */
  hud() {
    if (this.lost) return;
    if (!this.inScene) { this.flashOverlay(); return; }
    this.flush(); this.inScene = false;
    const gl = this.gl, S = this.fbo.scene;
    gl.bindVertexArray(this.emptyVao); gl.disable(gl.BLEND);
    let bloomTex = null;
    const bq = Quality.cur.bloom || 0;
    if (bq && Post.bloom.on && Post.bloom.strength > 0 && this.fbo.b0) {
      const pass = (prog, src, dst, uni) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uTex, 0); gl.uniform2f(prog.u.uTexel, 1 / src.w, 1 / src.h); if (uni) uni(prog); gl.drawArrays(gl.TRIANGLES, 0, 3); };
      const { b0, b1, b2 } = this.fbo;
      pass(this.pBright, S, b0, (p) => gl.uniform1f(p.u.uThresh, Post.bloom.threshold));
      pass(this.pDown, b0, b1); pass(this.pDown, b1, b2);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      pass(this.pUp, b2, b1); pass(this.pUp, b1, b0);
      gl.disable(gl.BLEND);
      bloomTex = b0.tex;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.w, this.h);
    const P = this.pComp, u = P.u; gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex); gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomTex || this.white); gl.uniform1i(u.uBloom, 1);
    gl.uniform2f(u.uRes, this.w, this.h); gl.uniform1f(u.uTime, Time.real); gl.uniform1f(u.uAspect, this.w / this.h);
    const ws = Post.waves, n = Math.min(4, ws.length), W = this._W || (this._W = new Float32Array(16)), WP = this._WP || (this._WP = new Float32Array(16)), sw = Screen.w || 1, sh = Screen.h || 1;
    for (let i = 0; i < n; i++) { const w = ws[i]; W[i * 4] = w.x / sw; W[i * 4 + 1] = 1 - w.y / sh; W[i * 4 + 2] = w.r / sh; W[i * 4 + 3] = w.strength; WP[i * 4] = Math.max(0.002, w.thick / sh); }
    gl.uniform4fv(u.uWave, W); gl.uniform4fv(u.uWaveP, WP); gl.uniform1i(u.uWaves, n);
    gl.uniform1f(u.uChroma, Post.chroma * Settings.flashScale()); gl.uniform1f(u.uBloomAmt, bloomTex ? Post.bloom.strength : 0);
    const vc = toColor(Post.vignetteColor);
    gl.uniform1f(u.uVig, Post.vignette); gl.uniform3f(u.uVigCol, cR(vc) / 255, cG(vc) / 255, cB(vc) / 255); gl.uniform1f(u.uGrain, Post.grain);
    gl.uniform1f(u.uSat, Post.sat); gl.uniform1f(u.uContrast, Post.contrast); gl.uniform1f(u.uBright, Post.bright);
    gl.uniform3f(u.uTint, Post.tint[0], Post.tint[1], Post.tint[2]);
    const fl = Post.flash; gl.uniform4f(u.uFlash, fl[0], fl[1], fl[2], fl[3] * Settings.flashScale());
    gl.uniform1f(u.uScan, Post.scan); gl.uniform1f(u.uWarp, Post.warp);
    const lt = Post._lut; gl.uniform1i(u.uLut0, 2); gl.uniform1i(u.uLut1, 3);
    if (lt && lt.amt > 0.001 && lt.a) {
      gl.activeTexture(gl.TEXTURE2); this.lutSync(0, lt.a, lt.va);
      gl.activeTexture(gl.TEXTURE3); if (lt.b && lt.mix > 0.001) this.lutSync(1, lt.b, lt.vb); else gl.bindTexture(gl.TEXTURE_2D, this.lut[0]);
      gl.uniform1f(u.uLutMix, lt.b ? lt.mix : 0); gl.uniform1f(u.uLutAmt, Math.min(1, lt.amt));
    } else {
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.white); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.white);
      gl.uniform1f(u.uLutMix, 0); gl.uniform1f(u.uLutAmt, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    this.bindTarget(null, this.w, this.h, false);
  }
  /** 沒有後製時：閃白用一個全螢幕方塊蓋上去 */
  flashOverlay() {
    const fl = Post.flash, a = fl[3] * Settings.flashScale();
    if (a <= 0.001) return;
    this.quad(null, this.w, 0, 0, this.h, 0, 0, 0, 0, 1, 1, pack(fl[0] * 255, fl[1] * 255, fl[2] * 255, a), MODE.solid, 0, 0);
  }
  end() { if (this.lost) return; if (this.inScene) this.hud(); this.flush(); }
  destroy() { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
}
let TexId = 0;
