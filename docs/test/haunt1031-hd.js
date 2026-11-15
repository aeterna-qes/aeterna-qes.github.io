// 禁區 1031 · HD-2D renderer.
// Loaded on demand by haunt1031.js when the full-screen game opens. The game logic (Zone) is unchanged:
// it still draws its sprites in game pixels, but into two layers (lit + glow) that this module stands in
// a real-time lit 3D corridor: moonlight with shadows, the lantern's gaze cone, ceiling lamps, light
// shafts in the mist, a polished floor that reflects, depth of field, bloom and a colour grade.
// If anything here fails, the game keeps its classic 2D look.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Reflector } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js';

const K = 1 / 26;                 // metres per game pixel
const PPM = 24;                   // environment texture pixels per metre
const CEIL = 118 * K;             // storey height = the game's corridor height (WALL)
const SLAB = .52, SH = CEIL + SLAB;
const BACK = -2.6;                // back wall
const ZP = -1.2;                  // the plane the game's sprites stand on
const PILLAR_GAP = 9.5;

// Quality tiers. Light counts and shader loop sizes are fixed per tier; resolution and passes step down live.
const TIERS = {
  high: { pr: 1.5, maxH: 1100, vol: 2, steps: 40, refl: .5, dof: 36, bloom: 6, shadow: 2048, lamps: 4, glows: 3, pumps: 3, part: 1, soft: true },
  mid: { pr: 1.25, maxH: 820, vol: 3, steps: 22, refl: .34, dof: 16, bloom: 5, shadow: 1024, lamps: 3, glows: 1, pumps: 2, part: .5, soft: true },
  low: { pr: 1, maxH: 560, vol: 0, steps: 0, refl: 0, dof: 0, bloom: 4, shadow: 1024, lamps: 2, glows: 0, pumps: 1, part: .25, soft: false },
};
export function pickTier(q, coarse) {
  if (TIERS[q]) return q;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (coarse) return mem <= 3 || cores <= 4 ? 'low' : 'mid';
  return mem <= 2 ? 'mid' : 'high';
}

// ---------------------------------------------------------------------------------------------
// helpers
let seed = 1031;
const R = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hh = (x, y) => { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const sh = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

class PB {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Uint8ClampedArray(w * h * 4); this.z = new Float32Array(w * h); this.e = null; }
  px(x, y, c, z, al = 255) {
    x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x; this.a[i * 4] = c[0]; this.a[i * 4 + 1] = c[1]; this.a[i * 4 + 2] = c[2]; this.a[i * 4 + 3] = al;
    if (z !== undefined) this.z[i] = z;
  }
  rect(x, y, w, h, c, z, al) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c, z, al); }
  glow(x, y, c) {
    if (!this.e) this.e = new Uint8ClampedArray(this.w * this.h * 4);
    x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4; this.e[i] = c[0]; this.e[i + 1] = c[1]; this.e[i + 2] = c[2]; this.e[i + 3] = 255;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); const i = (y * this.w + x) * 4; return [this.a[i], this.a[i + 1], this.a[i + 2]]; }
  zat(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0)); return this.z[y * this.w + x]; }
  canvas(arr = this.a) { const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(arr), this.w, this.h), 0, 0); return c; }
  normal(s = 3, wrap = true) {
    const w = this.w, h = this.h, o = new Uint8ClampedArray(w * h * 4);
    const Z = (x, y) => { if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); } return this.z[y * w + x]; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = -(Z(x + 1, y) - Z(x - 1, y)) * s, ny = (Z(x, y + 1) - Z(x, y - 1)) * s, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
      o[i] = (nx / l * .5 + .5) * 255; o[i + 1] = (ny / l * .5 + .5) * 255; o[i + 2] = (1 / l * .5 + .5) * 255; o[i + 3] = 255;
    }
    return this.canvas(o);
  }
}
function tex(c, { srgb = true, rep = null, crisp = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = crisp ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = !crisp; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function matFrom(pb, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex(pb.canvas(), { rep: o.rep }), normalMap: tex(pb.normal(o.ns ?? 3, !!o.rep), { srgb: false, rep: o.rep }), roughness: o.rough ?? .88, metalness: o.metal ?? 0 });
  if (pb.e) { m.emissiveMap = tex(pb.canvas(pb.e), { rep: o.rep }); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = o.ei ?? 1; }
  return m;
}
const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '111001011001111', 4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110' };
function text(pb, s, x, y, col, z, glow) { for (const ch of s) { const f = FONT[ch]; if (f) for (let i = 0; i < 15; i++) if (f[i] === '1') { pb.px(x + i % 3, y + (i / 3 | 0), col, z); if (glow) pb.glow(x + i % 3, y + (i / 3 | 0), glow); } x += 4; } }

// one look per floor: plaster, mosaic dado, band
const LOOK = [
  { P: ['#c4bad0', '#bab0c7', '#cdc4d8'], T: ['#7c8fa8', '#8799b0', '#6f849f', '#93a2b8', '#7a8aa6'], band: '#4a3a6e', mood: 1 },
  { P: ['#c6c0b2', '#bab3a4', '#d0c9bb'], T: ['#7f9a86', '#8aa591', '#6f8c79', '#97ae9c', '#7a9584'], band: '#3d5a4a', mood: 1 },
  { P: ['#cbbdad', '#bfb09f', '#d4c7b8'], T: ['#a88f7c', '#b39a86', '#9a826f', '#bca591', '#a08672'], band: '#6a4630', mood: .9 },
  { P: ['#a89eb7', '#9c92ac', '#b2a8c1'], T: ['#6c5f86', '#77699a', '#62567c', '#83759f', '#6a5d88'], band: '#3a2350', mood: .75 },
];

// ---------------------------------------------------------------------------------------------
// textures
function wallPB(X0, X1, look, o) {
  const w = Math.round((X1 - X0) * PPM), h = Math.round(CEIL * PPM), pb = new PB(w, h);
  const P = look.P.map(hex), TL = look.T.map(hex), GR = hex('#4d5670'), BAND = hex(look.band), SK = hex('#2b2237');
  const X = xm => Math.round((xm - X0) * PPM);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const yb = h - 1 - y, n = hh(x, y + o.k * 999);
    if (yb < 2) pb.px(x, y, sh(SK, .9 + n * .2), .7);
    else if (yb < 29) {
      if (x % 4 === 3 || (yb - 2) % 4 === 3) pb.px(x, y, sh(GR, .92 + n * .15), .1);
      else pb.px(x, y, sh(TL[(hh(x >> 2, (yb - 2) >> 2) * TL.length) | 0], .93 + n * .12), .5);
    }
    else if (yb < 31) pb.px(x, y, sh(BAND, .9 + n * .2), .62);
    else pb.px(x, y, hh(x >> 1, y >> 1) < .1 ? P[1] : n > .97 ? P[2] : P[0], .35 + n * .03);
  }
  for (let k = 0; k < w / 7; k++) { const x = (R() * w) | 0, L = (4 + R() * 40) | 0, s = .8 + R() * .1; for (let y = 0; y < L; y++) { if (R() < .12) continue; pb.px(x, y, sh(pb.get(x, y), s + y / L * (1 - s))); } }
  for (let k = 0; k < w / 34; k++) { const cx = R() * w, cy = h - 34 - R() * 12, r = 3 + R() * 7; for (let y = cy - r; y < cy + r; y++) for (let x = cx - r; x < cx + r; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.6) / r; if (d < 1 && hh(x | 0, y | 0) > d * .8) pb.px(x, y, sh(pb.get(x, y), .9)); } }
  for (let k = 0; k < w / 45; k++) { let x = R() * w, y = 30 + R() * 50; const n = 8 + R() * 22; for (let i = 0; i < n; i++) { pb.px(x, y, sh(pb.get(x, y), .62), pb.zat(x, y) - .25); x += R() < .5 ? 1 : 0; y += R() < .55 ? 1 : -1; } }
  // classroom windows
  (o.cls || []).forEach(([x0m, x1m, lit]) => {
    const x0 = X(x0m), x1 = X(x1m), yt = h - 1 - 64, yb2 = h - 1 - 30;
    pb.rect(x0, yt, x1 - x0, yb2 - yt, hex('#3a324a'), .9);
    for (let y = yt + 1; y < yb2 - 1; y++) for (let x = x0 + 1; x < x1 - 1; x++) {
      if ((x - x0) % 15 === 0 || y === yt + 16) continue;
      const gt = (y - yt) / (yb2 - yt); let c = mix(hex('#161c30'), hex('#232c46'), gt); if ((x + y * 2) % 31 < 2) c = sh(c, 1.45);
      const cur = (x - x0) % 30 < 5; if (cur) c = mix(c, hex('#5d4a6e'), .5);
      pb.px(x, y, c, cur ? .5 : .2);
      if (lit) pb.glow(x, y, sh(hex(lit), (.3 + .25 * gt) * (cur ? .5 : 1)));
    }
  });
  // high windows over labs
  (o.win || []).forEach(([x0m, x1m, glow]) => {
    const x0 = X(x0m), x1 = X(x1m), y0 = 3, y1 = 14;
    pb.rect(x0, y0, x1 - x0, y1 - y0, hex('#3a324a'), .9);
    for (let px = x0 + 1; px < x1 - 1; px += 15) for (let y = y0 + 1; y < y1 - 1; y++) for (let x = px; x < Math.min(px + 14, x1 - 1); x++) {
      const gt = (y - y0) / (y1 - y0); let c = mix(hex('#1a2136'), hex('#28324f'), gt * .6); if ((x - y + 300) % 19 < 2) c = sh(c, 1.5);
      pb.px(x, y, c, .25); if (glow) pb.glow(x, y, sh(hex(glow), .25 + .3 * gt + hh(x, y) * .08));
    }
  });
  // posters
  (o.posters || []).forEach(([xm, ym, pw, ph, base, kind]) => {
    const x0 = X(xm), y0 = h - 1 - Math.round(ym * PPM), B = hex(base);
    pb.rect(x0, y0, pw, ph, (x, y) => sh(B, .94 + hh(x, y) * .1), .55);
    if (kind === 'lines') for (let y = y0 + 2; y < y0 + ph - 2; y += 2) for (let x = x0 + 1; x < x0 + pw - 1 - (hh(x0, y) * 3 | 0); x++) pb.px(x, y, sh(B, .62));
    if (kind === 'pumpkin') { const cx = x0 + pw / 2, cy = y0 + ph / 2 + 1; for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) if (x * x / 18 + y * y / 10 < 1) pb.px(cx + x, cy + y, hex('#2a1a12')); text(pb, '1031', x0 + 1, y0 + 1, hex('#2a1a12'), .6); }
  });
  // stair openings (blocked = chains and rubble)
  (o.stairs || []).forEach(([xm, wm, label, blocked]) => {
    const x0 = X(xm - wm / 2), x1 = X(xm + wm / 2), top = h - 1 - 74;
    for (let y = top; y < h; y++) for (let x = x0; x < x1; x++) { const d = (y - top) / (h - top); pb.px(x, y, mix(hex('#07050d'), hex('#151024'), d * .7), -.6); }
    for (let s = 0; s < 8; s++) { const yy = h - 4 - s * 9, xs = x0 + s * Math.round((x1 - x0) / 9); for (let x = xs; x < x1; x++) { pb.px(x, yy, hex('#2e2352'), -.3); pb.px(x, yy + 1, hex('#1c1630'), -.4); } }
    for (let x = x0 - 2; x < x1 + 2; x++) { pb.px(x, top - 1, hex('#3a324a'), .9); pb.px(x, top - 2, hex('#3a324a'), .9); }
    if (blocked) for (let i = 0; i <= x1 - x0; i++) { const a = top + 14 + i * .9, b = top + 14 + (x1 - x0 - i) * .9; [a, b].forEach((yy, j) => { const c = (i + j) % 3 === 0 ? hex('#d6d0e4') : hex('#8c7fae'); pb.px(x0 + i, yy, c, 1); pb.px(x0 + i, yy + 1, sh(c, .6), .9); }); }
    if (blocked) for (let k = 0; k < 40; k++) { const x = x0 + R() * (x1 - x0), y = h - 2 - R() * 10 * R(); pb.rect(x, y, 2 + R() * 3, 2, hex(R() < .5 ? '#6f6a7a' : '#8a8496'), .8); }
    label && plaque(pb, label, (x0 + x1) / 2, h - 1 - 80);
  });
  // big dark opening at the end of the corridor (corner / stairs up)
  (o.opening || []).forEach(([x0m, x1m]) => { const x0 = X(x0m), x1 = X(x1m); for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) pb.px(x, y, mix(hex('#06040b'), hex('#120d22'), (x - x0) / (x1 - x0) * .3 + hh(x, y) * .05), -.8); });
  (o.labels || []).forEach(([xm, s]) => plaque(pb, s, X(xm), h - 1 - 73));
  return pb;
}
function plaque(pb, s, cx, y) {
  const tw = s.length * 4 - 1, x = Math.round(cx - tw / 2);
  pb.rect(x - 2, y - 1, tw + 4, 7, hex('#2e2352'), .95); pb.rect(x - 2, y - 1, tw + 4, 1, hex('#b8913a'), 1);
  text(pb, s, x, y + 1, hex('#e9dcff'), 1.05);
}
function floorPB() {
  const S = 96, pb = new PB(S, S), base = ['#b9b0a6', '#b0a799', '#c0b8ae', '#a99f93'].map(hex), chips = ['#6b6070', '#e7dfd2', '#4f4658', '#9d8c78', '#c9a77a', '#7f8fa0'].map(hex);
  for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
    const tone = base[(hh(tx, ty + 50) * 4) | 0];
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const X = tx * 12 + x, Y = ty * 12 + y;
      if (x === 0 || y === 0) pb.px(X, Y, sh(hex('#5e5662'), .9 + hh(X, Y) * .2), 0, 255);
      else { const c = hh(X + 7, Y * 3) < .17 ? chips[(hh(X, Y + 9) * 6) | 0] : sh(tone, .95 + hh(X, Y) * .08); pb.px(X, Y, c, .5, 140); }
    }
  }
  return pb;
}
function concretePB(w, h, base, o = {}) {
  const pb = new PB(w, h), B = hex(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = hh(x + (o.k || 0) * 77, y); pb.px(x, y, sh(B, .9 + n * .16 - (n > .96 ? .2 : 0)), .4 + n * .1); }
  for (let k = 0; k < (o.stains ?? 6); k++) { const cx = R() * w, cy = R() * h, r = 2 + R() * 6; for (let y = cy - r; y < cy + r; y++) for (let x = cx - r; x < cx + r; x++) if (Math.hypot(x - cx, y - cy) < r * (.6 + hh(x | 0, y | 0) * .4)) pb.px((x + w) % w, (y + h) % h, sh(pb.get((x + w) % w, (y + h) % h), .88)); }
  if (o.moss) for (let x = 0; x < w; x++) { const m = (hh(x, 1) * o.moss) | 0; for (let y = h - m; y < h; y++) pb.px(x, y, mix(pb.get(x, y), hex(hh(x, y) > .5 ? '#4b5a33' : '#3c4a2c'), .7), .55); }
  return pb;
}
function pillarPB(look, storeys) {
  const w = 10, H = Math.round(storeys * SH * PPM), pb = new PB(w, H), TL = look.T.map(hex);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const wy = (H - y - .5) / PPM, f = wy % SH, n = hh(x, y + 500);
    if (f > CEIL) pb.px(x, y, sh(hex('#9a92a6'), .9 + n * .15), .45);
    else if (f < .08) pb.px(x, y, hex('#2b2237'), .7);
    else if (f < 1.2) { const yy = Math.floor((f - .08) * PPM), g = x % 4 === 3 || yy % 4 === 3; pb.px(x, y, g ? hex('#4d5670') : sh(TL[(hh(x >> 2, yy >> 2) * TL.length) | 0], .93 + n * .12), g ? .1 : .5); }
    else if (f < 1.28) pb.px(x, y, hex(look.band), .6);
    else pb.px(x, y, sh(hex(look.P[0]), .93 + n * .1), .35);
  }
  for (let k = 0; k < 14; k++) { const x = (R() * w) | 0, y0 = (R() * H) | 0, L = 5 + R() * 20; for (let y = y0; y < y0 + L; y++) pb.px(x, y, sh(pb.get(x, y), .86)); }
  return pb;
}
function doorPB(dbl, w, h, glow) {
  const pb = new PB(w, h), FR = hex('#3a2f4a'), WD = hex('#6e4d3b'), WD2 = hex('#5b3e30');
  pb.rect(0, 0, w, h, FR, 1);
  const half = Math.floor((w - 4) / 2), leaves = dbl ? [[2, half], [2 + half, w - 4 - half]] : [[2, w - 4]];
  leaves.forEach(([lx, lw], li) => {
    for (let y = 2; y < h; y++) for (let x = lx; x < lx + lw; x++) { const g = hh(x, 7) * .14 + hh(x, (y / 5) | 0) * .06; pb.px(x, y, sh(hh(x, 3) > .7 ? WD2 : WD, .9 + g), .55); }
    const px0 = lx + 3, px1 = lx + lw - 3, py0 = Math.round(h * .56), py1 = Math.round(h * .88);
    for (let x = px0; x < px1; x++) { pb.px(x, py0, sh(WD, .62), .3); pb.px(x, py1, sh(WD, 1.25), .7); }
    for (let y = py0; y < py1; y++) { pb.px(px0, y, sh(WD, .62), .3); pb.px(px1 - 1, y, sh(WD, 1.2), .7); }
    const gx0 = lx + 4, gx1 = lx + lw - 4, gy0 = Math.round(h * .13), gy1 = Math.round(h * .45);
    pb.rect(gx0 - 1, gy0 - 1, gx1 - gx0 + 2, gy1 - gy0 + 2, sh(WD2, .7), .45);
    for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) {
      const gt = (y - gy0) / (gy1 - gy0); let c = mix(hex('#1b2236'), hex('#2a3452'), gt);
      const wire = (x + y) % 5 === 0 || (x - y + 50) % 5 === 0; if (wire) c = sh(c, 1.35); if ((x - y + 40) % 13 < 2) c = sh(c, 1.5);
      pb.px(x, y, c, .2); if (glow) pb.glow(x, y, sh(hex(glow), (.42 + .3 * (1 - gt)) * (wire ? .55 : 1)));
    }
    const hx = dbl ? (li === 0 ? lx + lw - 3 : lx + 1) : lx + lw - 3, hy = Math.round(h * .5);
    pb.rect(hx, hy, 2, 4, hex('#e8b04a'), 1.2); pb.px(hx, hy, hex('#fff0b8'), 1.25);
    pb.rect(lx, h - 6, lw, 4, (x, y) => sh(hex('#8a879a'), .9 + hh(x, y) * .2), .75);
  });
  if (dbl) for (let y = 2; y < h; y++) pb.px(2 + half - 1, y, hex('#1d1626'), .1);
  return pb;
}
function boardPB() {
  const w = 44, h = 26, pb = new PB(w, h);
  pb.rect(0, 0, w, h, hex('#4a3426'), 1);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const n = hh(x, y + 40); pb.px(x, y, n < .2 ? hex('#8d6440') : n > .85 ? hex('#c09366') : hex('#a77d52'), .4 + n * .05); }
  const paper = (x0, y0, pw, ph, c, kind) => {
    const C = hex(c); pb.rect(x0, y0, pw, ph, (x, y) => sh(C, .95 + hh(x, y) * .08), .7);
    if (kind === 'lines') for (let y = y0 + 2; y < y0 + ph - 1; y += 2) for (let x = x0 + 1; x < x0 + pw - 1 - (hh(x, y) * 3 | 0); x++) pb.px(x, y, sh(C, .6));
    if (kind === 'cal') { for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) pb.px(x0 + 1 + i * 2, y0 + 3 + j * 2, sh(C, .55)); pb.px(x0 + 9, y0 + 9, hex('#c8283a')); pb.rect(x0, y0, pw, 2, hex('#c8283a')); }
    if (kind === 'missing') { pb.rect(x0 + 2, y0 + 2, pw - 4, 6, hex('#3c3a44')); pb.rect(x0 + 4, y0 + 3, 2, 2, hex('#cfc6b5')); }
    pb.px(x0 + (pw >> 1), y0, hex(['#c8283a', '#2f7ad8', '#e8b04a'][(hh(x0, y0) * 3) | 0]), 1);
  };
  paper(3, 3, 9, 12, '#efe9dc', 'lines'); paper(13, 4, 10, 13, '#f2eee4', 'cal'); paper(24, 3, 8, 12, '#e8e0cf', 'missing'); paper(33, 5, 8, 10, '#e6893a', 'lines'); paper(6, 16, 12, 7, '#d8e6f0', 'lines'); paper(26, 16, 9, 8, '#efe9dc', 'lines');
  return pb;
}
function lockerPB() {
  const pb = new PB(36, 52);
  for (let i = 0; i < 3; i++) {
    const x0 = i * 12; pb.rect(x0, 0, 12, 52, (x, y) => sh(hex('#4f5a7a'), .92 + hh(x, y) * .1), .6);
    pb.rect(x0, 0, 1, 52, hex('#2c3248'), .2); pb.rect(x0 + 11, 0, 1, 52, hex('#7a86a6'), .8);
    for (let y = 5; y < 12; y += 2) pb.rect(x0 + 3, y, 6, 1, hex('#2c3248'), .2);
    pb.rect(x0 + 8, 24, 1, 5, hex('#c9c3d8'), 1);
  }
  return pb;
}
function grassPB() {
  const S = 48, pb = new PB(S, S), G = ['#2f4a2c', '#365330', '#3e5c35', '#2a4128'].map(hex);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const n = hh(x, y + 3000); pb.px(x, y, n > .9 ? hex('#56783f') : G[(hh(x >> 1, y >> 1) * 4) | 0], .3 + n * .2); }
  for (let k = 0; k < 26; k++) { const x = R() * S, y = R() * S, c = hex(['#b0662a', '#7d3a24', '#c98a3a', '#8a7a2a'][(R() * 4) | 0]); pb.px(x, y, c, .6); pb.px(x + 1, y, sh(c, .8), .55); }
  return pb;
}
function pavingPB() {
  const pb = new PB(48, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
    const gap = x % 12 === 0 || y % 12 === 0, n = hh(x, y + 222);
    if (gap) pb.px(x, y, hh(x, y) > .5 ? hex('#3c4a2c') : hex('#2c2a30'), 0);
    else pb.px(x, y, sh(hex(['#8e8794', '#857e8c', '#968f9c'][(hh(x / 12 | 0, y / 12 | 0) * 3) | 0]), .9 + n * .15), .5);
  }
  return pb;
}
function leafClumpPB(pal) {
  const S = 40, pb = new PB(S, S), P = pal.map(hex);
  for (let k = 0; k < 120; k++) {
    const a = R() * Math.PI * 2, r = Math.pow(R(), .7) * 17, x = 20 + Math.cos(a) * r, y = 20 + Math.sin(a) * r * .85;
    const c = sh(P[(R() * P.length) | 0], 1 - (y / S) * .35), wide = R() < .5;
    pb.rect(x, y, wide ? 3 : 2, wide ? 2 : 3, c, 1 - r / 20, 255); pb.px(x, y, sh(c, 1.25), 1.1 - r / 20, 255);
  }
  return pb;
}
function tuftAtlasPB() {
  const pb = new PB(64, 16);
  const blades = (ox, n, tall) => { for (let b = 0; b < n; b++) { const bx = ox + 2 + R() * 12, ht = (tall ? 9 : 6) + R() * (tall ? 7 : 6), lean = (R() - .5) * .9; for (let i = 0; i < ht; i++) { const t = i / ht; pb.px(bx + lean * i * i / ht, 15 - i, mix(hex('#24381f'), hex('#6a8a42'), t * .9), t); } } };
  blades(0, 18, false); blades(16, 16, true); blades(32, 12, true);
  for (let k = 0; k < 3; k++) {
    const x = 50 + k * 4 + (R() - .5) * 2, top = 3 + (R() * 4 | 0);
    for (let y = top + 2; y < 16; y++) pb.px(x, y, hex('#3f6136'), .5);
    for (let a = 0; a < 7; a++) { const an = a / 7 * Math.PI * 2; for (let r = 1; r < 4; r++) pb.px(x + Math.cos(an) * r, top + Math.sin(an) * r * .7 - (r === 3 ? 1 : 0), hex(r === 3 ? '#e8a0a8' : '#c8283a'), 1); }
  }
  return pb;
}
function leafAtlasPB() {
  const pb = new PB(32, 8), C = ['#c96a26', '#9c2e22', '#c99a3a', '#6f7a2c'].map(hex);
  for (let v = 0; v < 4; v++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const dx = x - 3.5, dy = y - 3.5; if ((dx * dx) / 9 + (dy * dy) / 5 < 1 && Math.abs(dx - dy) < 4.6) pb.px(v * 8 + x, y, sh(C[v], x + y < 7 ? 1.15 : .9), 1); }
  return pb;
}
function pumpkinPB() {
  const pb = new PB(64, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) { const rib = (x % 8 === 0) ? .72 : (x % 8 === 1 || x % 8 === 7) ? .86 : 1; pb.px(x, y, sh(hex('#d9701e'), rib * (.92 + hh(x, y) * .12) * (1 - Math.abs(y - 15) / 60)), rib); }
  const face = (x, y) => { pb.px(x, y, hex('#3a1606'), 0); pb.glow(x, y, hex('#ffb347')); };
  for (let y = 0; y < 4; y++) for (let x = 0; x <= y; x++) { face(11 + x, 8 + y); face(14 - x, 8 + y); face(19 + x, 8 + y); face(22 - x, 8 + y); }
  face(16, 13); face(16, 14); face(15, 14); face(17, 14);
  for (let x = 8; x < 25; x++) { const top = 18 + ((x % 3 === 0) ? 1 : 0), bot = 21 - ((x % 4 === 2) ? 1 : 0) - (x < 10 || x > 22 ? 1 : 0); for (let y = top; y <= bot; y++) face(x, y); }
  return pb;
}
function curtainPB(w, h) {
  const pb = new PB(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fold = Math.sin(x / 3.2 + Math.sin(y / 30) * .6), n = hh(x, y);
    pb.px(x, y, mix(hex('#3a1026'), hex('#7a2446'), fold * .5 + .5 + n * .05), fold);
  }
  for (let y = 0; y < 9; y++) for (let x = 0; x < w; x++) pb.px(x, y, y === 0 || y === 8 ? hex('#fbc75a') : (x + y) % 8 < 5 ? hex('#6b2140') : hex('#5a1a35'), 1);
  for (let x = 0; x < w; x += 6) for (let y = 9; y < 12; y++) pb.px(x, y, hex('#e8b04a'), 1.2);
  return pb;
}

// ---------------------------------------------------------------------------------------------
// shaders shared by several passes
const SHADOW_FN = `
  #include <packing>
  uniform sampler2D uShadowMap; uniform mat4 uShadowMatrix;
  float moonVis(vec3 p) {
    vec4 sc = uShadowMatrix * vec4(p, 1.); vec3 c = sc.xyz / sc.w;
    if (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.;
    return step(c.z - .003, unpackRGBAToDepth(texture2D(uShadowMap, c.xy)));
  }`;
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

// ---------------------------------------------------------------------------------------------
export function create(o) {
  const tierName = pickTier(o.quality, o.coarse), Q = TIERS[tierName], reduce = !!o.reduce;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;left:0;top:0;display:block;pointer-events:none';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', alpha: false }); }
  catch (e) { return null; }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return null; }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.setClearColor(0x05030a, 1);
  o.stage.insertBefore(cv, o.before);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .3, 120);
  camera.layers.enable(1);
  const U = { time: { value: 0 }, wind: { value: 0 } };
  const SHU = { uShadowMap: { value: null }, uShadowMatrix: { value: new THREE.Matrix4() } };

  function addSway(mat, amp, key) {
    mat.onBeforeCompile = s => {
      s.uniforms.uT = U.time; s.uniforms.uWind = U.wind;
      s.vertexShader = 'attribute float aSw;\nuniform float uT;\nuniform float uWind;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = position.x * .7 + position.z * .45 + position.y * .3;
        float sw = (sin(uT * 1.6 + ph) * .55 + sin(uT * 2.9 + ph * 1.9) * .25 + sin(uT * 6.3 + ph * 3.7) * .08) * (.45 + uWind) + uWind * .8;
        transformed.x += sw * aSw * ${amp.toFixed(3)};
        transformed.z += sin(uT * 1.2 + ph * 1.4) * aSw * ${(amp * .35).toFixed(3)} * (.5 + uWind);
        transformed.y -= abs(sw) * aSw * ${(amp * .18).toFixed(3)};`);
    };
    mat.customProgramCacheKey = () => 'sway-' + key + '-' + amp;
    return mat;
  }

  // ---- persistent lights -----------------------------------------------------------------------
  const MOON_DIR = new THREE.Vector3(.6, -.3, -.74).normalize();
  const moon = new THREE.DirectionalLight(0x9ab0ff, 1.3);
  moon.castShadow = true; moon.shadow.mapSize.set(Q.shadow, Q.shadow);
  Object.assign(moon.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, near: 1, far: 90 });
  moon.shadow.bias = -.0006; moon.shadow.normalBias = .02;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0x3a3470, 0x120c1c, .03); scene.add(hemi);
  const lanP = new THREE.PointLight(0xffb050, 2.6, 4, 2); scene.add(lanP);
  const lanS = new THREE.SpotLight(0xffc46e, 30, 6, .45, .55, 1.3); scene.add(lanS, lanS.target);
  const lampL = []; for (let i = 0; i < Q.lamps; i++) { const L = new THREE.PointLight(0xe8eeff, 0, 9, 2); scene.add(L); lampL.push(L); }
  const glowL = []; for (let i = 0; i < Q.glows; i++) { const L = new THREE.PointLight(0xa98cff, 0, 4, 2); scene.add(L); glowL.push(L); }
  const endL = new THREE.PointLight(0xff3a6a, 0, 7, 2); scene.add(endL);

  // night sky (seen above the roof on the top floor, and past the corridor ends)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), new THREE.ShaderMaterial({
    uniforms: { uT: U.time, uOff: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform float uOff; varying vec3 vW;
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.03; a *= .5; } return s; }
      void main() {
        vec2 p = vW.xy - vec2(uOff, 0.); float h = clamp((p.y + 5.) / 50., 0., 1.);
        vec3 c = mix(vec3(.075, .05, .16), vec3(.008, .006, .025), pow(h, .5));
        vec2 sp = floor(p * 1.4); c += vec3(.9) * step(.985, h2(sp)) * (.5 + .5 * sin(uT * (1. + h2(sp + 3.) * 3.) + h2(sp) * 40.)) * smoothstep(.2, .45, h) * .35;
        vec2 mp = vec2(-21., 24.); float d = length(p - mp), disc = smoothstep(3.1, 2.9, d);
        c += vec3(1., .97, .88) * disc * (2.4 - fbm((p - mp) * .7) * 1.);
        c += vec3(.55, .62, 1.) * exp(-d * .2) * .22 + vec3(.6, .65, 1.) * exp(-d * .9) * .7 * (1. - disc);
        vec2 q = p * vec2(.05, .11) + vec2(uT * .012, 0.); float cl = smoothstep(.42, .72, fbm(q + fbm(q * 1.7) * .6));
        c = mix(c, vec3(.035, .025, .07) + vec3(.55, .6, 1.) * exp(-d * .045) * 1.4 * (.4 + fbm(q * 3.)), cl * (.9 - disc * .7));
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  sky.position.z = -60; scene.add(sky);

  // ---- the game's sprite layers ---------------------------------------------------------------
  const litC = document.createElement('canvas'), glowC = document.createElement('canvas');
  litC.width = glowC.width = 2; litC.height = glowC.height = 2;
  const litX = litC.getContext('2d'), glowX = glowC.getContext('2d');
  const mkLayer = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const litT = mkLayer(litC), glowT = mkLayer(glowC);
  const NPL = Q.lamps + Q.glows + 2;
  const litMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: litT }, uAmb: { value: new THREE.Color(.04, .032, .07) }, uMoon: { value: new THREE.Color(.07, .08, .16) },
      uLan: { value: new THREE.Vector3() }, uLanC: { value: new THREE.Color(1.3, .85, .45) }, uLanR: { value: 4 }, uFace: { value: 1 }, uCone: { value: .46 },
      uLP: { value: Array.from({ length: NPL }, () => new THREE.Vector3()) }, uLC: { value: Array.from({ length: NPL }, () => new THREE.Vector3()) }, uLN: { value: 0 }, ...SHU,
    },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: SHADOW_FN + `
      uniform sampler2D map; uniform vec3 uAmb; uniform vec3 uMoon; uniform vec3 uLan; uniform vec3 uLanC; uniform float uLanR; uniform float uFace; uniform float uCone;
      uniform vec3 uLP[${NPL}]; uniform vec3 uLC[${NPL}]; uniform int uLN;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vec4 a = texture2D(map, vUv); if (a.a < .01) discard;
        vec3 L = uAmb;
        vec2 d = vW.xy - uLan.xy; float along = d.x * uFace;
        float halo = 1. - smoothstep(.25, 1.5, length(d));
        float cone = step(-.25, along) * (1. - smoothstep(uLanR * .75, uLanR, along)) * (1. - smoothstep(abs(along) * uCone + .2, abs(along) * uCone + .6, abs(d.y)));
        L += uLanC * (halo * .55 + cone * .85);
        for (int k = 0; k < ${NPL}; k++) { if (k >= uLN) break; vec3 dl = uLP[k] - vW; L += uLC[k] / (dot(dl, dl) * .7 + .5); }
        L += uMoon * moonVis(vW);
        gl_FragColor = vec4(a.rgb * min(L, vec3(1.35)), a.a);
      }`,
    transparent: true, depthWrite: false,
  });
  const quad = new THREE.PlaneGeometry(1, 1);
  const litPlane = new THREE.Mesh(quad, litMat); litPlane.castShadow = true; litPlane.frustumCulled = false; litPlane.renderOrder = 2;
  litPlane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: litT, alphaTest: .5 });
  scene.add(litPlane);
  // a faint lilac silhouette wherever a pillar or the railing hides a sprite
  const silMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: litT } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { float a = texture2D(map, vUv).a; if (a < .5) discard; gl_FragColor = vec4(.55, .42, .9, .4); }',
    transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth,
  });
  const silPlane = new THREE.Mesh(quad, silMat); silPlane.frustumCulled = false; silPlane.renderOrder = 3; silPlane.layers.set(1); scene.add(silPlane);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowT, transparent: true, depthTest: false, depthWrite: false, color: new THREE.Color(1.7, 1.7, 1.7) });
  const glowPlane = new THREE.Mesh(quad, glowMat); glowPlane.frustumCulled = false; glowPlane.renderOrder = 4; scene.add(glowPlane);

  // travellers possessing a door: drawn on the door, not on the walking plane
  const doorSpr = [];
  function doorSprite(i, img) {
    let s = doorSpr[i];
    if (!s) {
      const t = new THREE.CanvasTexture(img); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(img.width * K, img.height * K), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, emissive: 0xb8c8ff, emissiveMap: t, emissiveIntensity: .35, roughness: 1 }));
      m.renderOrder = 1; scene.add(m); s = doorSpr[i] = { m, img };
    }
    if (s.img !== img) { s.img = img; s.m.material.map.image = img; s.m.material.map.needsUpdate = true; }
    return s.m;
  }
  // ---- the level (rebuilt per corridor) -------------------------------------------------------
  let turnLamp = null, G = null, LV = { id: -1 }, reflector = null, floorMat = null, outlines = [], lampX = [], tubes = null, curtain = null, X1 = 10;
  const disposeGroup = g => g.traverse(m => {
    if (m.geometry) m.geometry.dispose();
    const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    ms.forEach(mt => { ['map', 'normalMap', 'emissiveMap'].forEach(k => mt[k] && mt[k].dispose()); mt.dispose(); });
    if (m.isReflector) m.dispose();
  });
  function build(z) {
    if (G) { scene.remove(G); disposeGroup(G); G = null; } turnLamp = null;
    seed = 1031 + z.lv * 77;
    const L = z.L, lv = z.lv, look = LOOK[lv] || LOOK[0], len = L.len * K, openStart = lv === 0, X0 = openStart ? -9 : -.25; X1 = len + .25;
    const OX0 = X0 - 8, OX1 = X1 + 8, OW = OX1 - OX0, OC = (OX0 + OX1) / 2;
    const LENW = X1 - X0, CX = (X0 + X1) / 2;
    G = new THREE.Group(); scene.add(G);
    const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; G.add(m); return m; };
    const at = (m, x, y, zz) => { m.position.set(x, y, zz); return m; };
    const concMat = matFrom(concretePB(24, 24, '#8f879b', { stains: 5 }), { rep: [LENW, 1] });
    const ceilMat = matFrom(concretePB(48, 48, '#8a8296', { stains: 9, k: 2 }), { rep: [LENW / 2, 1.5] });
    const kerbMat = matFrom(concretePB(24, 6, '#9a93a3', { k: 3, stains: 3 }), { rep: [LENW, 1] });
    const riserMat = matFrom(concretePB(24, 12, '#7c7584', { k: 4, moss: 5 }), { rep: [LENW, 1] });
    const metal = new THREE.MeshStandardMaterial({ color: 0x3c3550, roughness: .45, metalness: .6 });
    const darkFrame = new THREE.MeshStandardMaterial({ color: 0x2c2338, roughness: .7 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a8098, roughness: .6 });
    const fascia = k => {
      const pb = new PB(Math.round(LENW * PPM), 13);
      for (let y = 0; y < 13; y++) for (let x = 0; x < pb.w; x++) { const n = hh(x, y + k * 50); pb.px(x, y, y < 2 ? hex('#5d566b') : y === 5 || y === 6 ? hex('#5a3f96') : y === 7 ? hex('#c89a3a') : sh(hex(look.P[0]), .92 + n * .1), y === 7 ? .7 : .4); }
      for (let i = 0; i < pb.w / 10; i++) { const x = R() * pb.w, Lh = 2 + R() * 9; for (let y = 8; y < 8 + Lh && y < 13; y++) pb.px(x, y, sh(pb.get(x, y), .78)); }
      return matFrom(pb);
    };
    const pillars = []; for (let x = 5.6; x < len - .6; x += PILLAR_GAP) pillars.push(x); if (openStart) pillars.unshift(-3.9);
    const storey = (y0, k, wall, lit) => {
      const wx1 = wall.x1 || X1; add(at(new THREE.Mesh(new THREE.PlaneGeometry(wx1 - X0, CEIL), matFrom(wallPB(X0, wx1, look, { k, ...wall }), { ns: 2.4, ei: .9 })), (X0 + wx1) / 2, y0 + CEIL / 2, BACK), false);
      if (!openStart) endWall(X0, y0, BACK, .3, 1, k); endWall(X1, y0, wall.turnZ || BACK, .3, -1, k + 5);
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, SLAB, 3.05), [concMat, concMat, concMat, ceilMat, fascia(k), concMat]), CX, y0 + CEIL + SLAB / 2, BACK + 3.05 / 2));
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, .2, .26), kerbMat), CX, y0 + .1, .13));
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, .05, .07), metal), CX, y0 + 1.04, .13));
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, .035, .04), metal), CX, y0 + .3, .13));
      const xs = []; for (let x = X0 + .05; x < X1; x += .125) if (!pillars.some(p => Math.abs(p - x) < .24)) xs.push(x);
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .82, .022), metal, xs.length), d = new THREE.Object3D();
      xs.forEach((x, i) => { d.position.set(x, y0 + .61, .13); d.updateMatrix(); bars.setMatrixAt(i, d.matrix); });
      add(bars);
    };
    // between the doors: windows, lockers and extinguishers, like the 2D corridor
    const used = L.doors.map(d => d[0]), cls = [], lockers = [], ext = [];
    for (let i = 70; i < L.gate - 40; i += 70) { if (used.some(u => Math.abs(u - i) < 56)) continue; const k = (i / 70 | 0) % 3; if (k === 0) cls.push([i * K - 1, i * K + 1, null]); else if (k === 1) lockers.push(i * K); else ext.push(i * K); }
    const wall = { cls, labels: [], posters: [], win: [], stairs: [], opening: [] };
    const doors = []; if (openStart) { doors.push({ x: -1.6, kind: 'entrance' }); wall.labels.push([-1.6, 'ENTRANCE']); }
    L.doors.forEach((d, i) => {
      const x = d[0] * K;
      if (d[2] === 'stairs') { wall.stairs.push([x, 2, d[1], true]); return; }
      if (d[2] === 'board') { doors.push({ i, x, kind: 'board' }); return; }
      const dbl = d[2] === 'lab'; doors.push({ i, x, kind: dbl ? 'lab' : 'door' }); if (d[1]) wall.labels.push([x, d[1]]);
      if (dbl) wall.win.push([x - 2.4, x + 2.4, lv === 0 ? (d[1].indexOf('CHEM') >= 0 ? '#5affa0' : '#7f9cff') : null]);
    });
    for (let k = 0; k < 4; k++) wall.posters.push([(L.gate * K) * (k + .5) / 4 + 1.3, 1.9, 6 + (k % 2) * 3, 8 + (k % 2) * 4, k === 1 ? '#e6893a' : '#efe9dc', k === 1 ? 'pumpkin' : 'lines']);
    const ex = (L.len - 40) * K;
    const TURN_W = 2.4, TURN_Z = -11; if (L.end === 'corner') { wall.x1 = X1 - TURN_W; wall.turnZ = TURN_Z; }
    if (L.end === 'stairs') wall.stairs.push([ex, 2.7, 'STAIRS 2', false]);
    if (L.end === 'entrance') { doors.push({ x: ex, kind: 'entrance' }); wall.labels.push([ex, 'FLOOR 3']); }
    storey(0, 1, wall, true);
    function endWall(x, y0, z0, z1, face, k) {
      const w = z1 - z0, pb = wallPB(0, w, look, { k });
      const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, CEIL), matFrom(pb, { ns: 2.4 })), false);
      m.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; m.position.set(x, y0 + CEIL / 2, (z0 + z1) / 2);
      // the slab and parapet close off too
      add(at(new THREE.Mesh(new THREE.BoxGeometry(.3, SLAB, w + .1), concMat), x - face * .15, y0 + CEIL + SLAB / 2, (z0 + z1) / 2));
    }
    // floor 1 ends where the lab wing turns the corner: the corridor carries on away from you into the dark
    if (L.end === 'corner') {
      const xa = X1 - TURN_W, cx2 = (xa + X1) / 2, dz = BACK - TURN_Z, cz = (BACK + TURN_Z) / 2;
      const tf = add(new THREE.Mesh(new THREE.PlaneGeometry(TURN_W, dz), matFrom(floorPB(), { rep: [TURN_W / 4, dz / 4], rough: .35, ns: 1.2 })), false); tf.rotation.x = -Math.PI / 2; tf.position.set(cx2, .001, cz);
      add(at(new THREE.Mesh(new THREE.BoxGeometry(TURN_W + .3, SLAB, dz), [concMat, concMat, concMat, ceilMat, concMat, concMat]), cx2, CEIL + SLAB / 2, cz));
      const lw = add(new THREE.Mesh(new THREE.PlaneGeometry(dz, CEIL), matFrom(wallPB(0, dz, look, { k: 7, cls: [[dz * .25, dz * .25 + 1.6, null]] }), { ns: 2.4 })), false);
      lw.rotation.y = Math.PI / 2; lw.position.set(xa, CEIL / 2, cz);
      add(at(new THREE.Mesh(new THREE.PlaneGeometry(TURN_W, CEIL), matFrom(wallPB(0, TURN_W, look, { k: 8, labels: [[TURN_W / 2, 'EXIT']] }), { ns: 2.4 })), cx2, CEIL / 2, TURN_Z), false);
      const tl = new THREE.PointLight(0xc8d8ff, 1.4, 6, 2); tl.position.set(cx2, CEIL - .6, TURN_Z + 2.5); G.add(tl); turnLamp = tl;
      add(at(new THREE.Mesh(new THREE.BoxGeometry(.16, .035, 1.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.6) })), cx2, CEIL - .5, TURN_Z + 2.5), false, false);
      const ex = add(new THREE.Mesh(new THREE.BoxGeometry(.6, .22, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 2.4, .9) })), false, false); ex.position.set(cx2, CEIL - .35, TURN_Z + .05);
    }
    // the building is solid past both ends of the corridor
    {
      const yB = lv >= 2 ? -SH - .45 : -.45, yT = lv < 3 ? 2 * SH + .2 : SH + 1, zb = BACK - .6, zf = .45, em = matFrom(concretePB(24, 24, '#6f6880', { stains: 12, k: 21 }), { rep: [3, 5] });
      (openStart ? [[X1, X1 + 7]] : [[X1, X1 + 7], [X0 - 7, X0]]).forEach(([a, b]) => add(at(new THREE.Mesh(new THREE.BoxGeometry(b - a, yT - yB, zf - zb), em), (a + b) / 2, (yB + yT) / 2, (zb + zf) / 2)));
    }
    // the floor above (or the roof and sky on the top floor), the floor below on upper floors
    if (lv < 3) storey(SH, 2, { cls: Array.from({ length: Math.ceil(LENW / 5) }, (_, i) => [X0 + 1 + i * 5, X0 + 3.4 + i * 5, (hh(i, lv) < .07 ? '#ffb766' : null)]) }, false);
    else {
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, .9, .3), concMat), CX, SH + .45, .25));
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, .12, 3.1), concMat), CX, SH + .06, BACK + 1.55));
      for (let x = 6; x < len; x += 23) add(at(new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 1.5, 12), concMat), x, SH + 1.3, BACK + 1.1));
    }
    if (lv >= 2) storey(-SH, 3, { cls: Array.from({ length: Math.ceil(LENW / 5) }, (_, i) => [X0 + 1 + i * 5, X0 + 3.4 + i * 5, null]) }, false);
    const pm = matFrom(pillarPB(look, lv >= 2 ? 3 : 2));
    const pBase = lv >= 2 ? -SH : -.45, pTop = SH + SLAB + (lv < 3 ? CEIL : .9);
    pillars.forEach(x => add(at(new THREE.Mesh(new THREE.BoxGeometry(.42, pTop - pBase, .42), pm), x, (pBase + pTop) / 2, .12)));
    // the floor: polished terrazzo over a planar reflection
    const FD = .3 - BACK, FZ = (BACK + .3) / 2;
    floorMat = matFrom(floorPB(), { rep: [LENW / 4, FD / 4], rough: .3, ns: 1.2 }); floorMat.transparent = Q.refl > 0;
    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(LENW, FD), floorMat), false); floor.rotation.x = -Math.PI / 2; floor.position.set(CX, .002, FZ);
    reflector = null;
    if (Q.refl > 0) {
      reflector = new Reflector(new THREE.PlaneGeometry(LENW, FD), { clipBias: .003, textureWidth: 256, textureHeight: 256, color: 0x8a86a0 });
      reflector.rotation.x = -Math.PI / 2; reflector.position.set(CX, 0, FZ); G.add(reflector);
      const ob = reflector.onBeforeRender; reflector.onBeforeRender = function (...a) { floor.visible = false; ob.apply(this, a); floor.visible = true; };
      sizeReflector();
    }
    // doors
    outlines = [];
    const outlineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb490ef).multiplyScalar(2), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false });
    doors.forEach(d => {
      let w, h, y0 = 0;
      if (d.kind === 'board') {
        w = 60 * K; h = 38 * K; y0 = 1.0;
        add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, .04), [darkFrame, darkFrame, darkFrame, darkFrame, matFrom(boardPB(), { ns: 3 }), darkFrame]), d.x, y0 + h / 2, BACK + .03));
      } else {
        const dbl = d.kind !== 'door'; w = (dbl ? (d.kind === 'entrance' ? 60 : 52) : 40) * K; h = (d.kind === 'entrance' ? 84 : 72) * K;
        const pb = doorPB(dbl, Math.round(w * PPM), Math.round(h * PPM), lv === 0 && dbl && d.kind === 'lab' ? (d.x > 15 ? '#5affa0' : '#7f9cff') : null);
        add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, .05), [darkFrame, darkFrame, darkFrame, darkFrame, matFrom(pb, { ns: 2.5, ei: 2.2, rough: .7 }), darkFrame]), d.x, h / 2, BACK + .03));
        const f = (fw, fh, fx, fy) => add(at(new THREE.Mesh(new THREE.BoxGeometry(fw, fh, .09), frameMat), fx, fy, BACK + .045));
        f(.07, h + .07, d.x - w / 2 - .035, (h + .07) / 2); f(.07, h + .07, d.x + w / 2 + .035, (h + .07) / 2); f(w + .14, .07, d.x, h + .035);
      }
      if (d.i == null) return;
      const og = new THREE.Group();
      [[w + .26, .03, 0, y0 + h + .1], [w + .26, .03, 0, y0 - .06], [.03, h + .16, -w / 2 - .12, y0 + h / 2 + .02], [.03, h + .16, w / 2 + .12, y0 + h / 2 + .02]].forEach(([ww, hh2, xx, yy]) => og.add(at(new THREE.Mesh(new THREE.PlaneGeometry(ww, hh2), outlineMat), xx, yy, 0)));
      og.position.set(d.x, 0, BACK + .1); G.add(og); outlines[d.i] = og;
    });
    if (lv === 0) { const lab = doors.filter(d => d.kind === 'lab'); lab.forEach(d => { const L2 = new THREE.PointLight(d.x > 15 ? 0x5affa0 : 0x7f9cff, 1, 4.5, 2); L2.position.set(d.x, 1.5, BACK + .35); G.add(L2); }); }
    // lockers and extinguishers
    const lm = matFrom(lockerPB(), { ns: 2, rough: .5, metal: .2 });
    lockers.forEach(x => add(at(new THREE.Mesh(new THREE.BoxGeometry(36 / PPM, 52 / PPM, .4), [darkFrame, darkFrame, darkFrame, darkFrame, lm, darkFrame]), x, 26 / PPM, BACK + .2)));
    const red = new THREE.MeshStandardMaterial({ color: 0xb3262e, roughness: .4 });
    ext.forEach(x => { add(at(new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .55, 10), red), x, .3, BACK + .15)); add(at(new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .06), darkFrame), x, .62, BACK + .15)); });
    // the final room's curtain sways in a draught from nowhere
    curtain = null;
    if (L.end === 'final') {
      const cw = 150 * K, pb = curtainPB(Math.round(cw * PPM), Math.round(CEIL * PPM)), g = new THREE.PlaneGeometry(cw, CEIL, 24, 8); g.translate(0, -CEIL / 2, 0);
      const p = g.attributes.position, sw = new Float32Array(p.count); for (let i = 0; i < p.count; i++) sw[i] = Math.min(1, -p.getY(i) / CEIL) * .6; g.setAttribute('aSw', new THREE.BufferAttribute(sw, 1));
      const m = addSway(matFrom(pb, { ns: 4, rough: .8 }), .08, 'curtain'); m.side = THREE.DoubleSide;
      curtain = add(at(new THREE.Mesh(g, m), len - 75 * K, CEIL, BACK + .25));
      add(at(new THREE.Mesh(new THREE.PlaneGeometry(cw + .3, CEIL), new THREE.MeshStandardMaterial({ color: 0x0a0612 })), len - 75 * K, CEIL / 2, BACK + .01), false);
    }
    // ceiling lamps hang on rods so you can see them under the slab
    lampX = (z.lamps || []).map(l => (l.x + 9) * K);
    const hous = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, .05, .16), frameMat, Math.max(1, lampX.length));
    tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, .035, .045), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, lampX.length));
    const rods = new THREE.InstancedMesh(new THREE.BoxGeometry(.015, .7, .015), metal, Math.max(1, lampX.length * 2));
    const dd = new THREE.Object3D();
    lampX.forEach((x, i) => {
      dd.position.set(x, CEIL - .75, -1.25); dd.updateMatrix(); hous.setMatrixAt(i, dd.matrix);
      dd.position.y = CEIL - .8; dd.updateMatrix(); tubes.setMatrixAt(i, dd.matrix); tubes.setColorAt(i, new THREE.Color(.1, .1, .12));
      [-.45, .45].forEach((ox, j) => { dd.position.set(x + ox, CEIL - .38, -1.25); dd.updateMatrix(); rods.setMatrixAt(i * 2 + j, dd.matrix); });
    });
    add(hous); G.add(tubes); add(rods);
    // outside: courtyard on the ground floor, treetops and a long drop above it
    if (lv < 2) {
      add(at(new THREE.Mesh(new THREE.BoxGeometry(OW, .45, 2.9), [riserMat, riserMat, concMat, concMat, riserMat, riserMat]), OC, -.225, BACK + 1.45));
      const pave = add(new THREE.Mesh(new THREE.PlaneGeometry(OW, 1.6), matFrom(pavingPB(), { rep: [OW / 2, 1.6] })), false); pave.rotation.x = -Math.PI / 2; pave.position.set(OC, -.45, 1.1);
      const grass = add(new THREE.Mesh(new THREE.PlaneGeometry(OW, 14), matFrom(grassPB(), { rep: [OW / 2, 7], ns: 1.5 })), false); grass.rotation.x = -Math.PI / 2; grass.position.set(OC, -.452, 1.9 + 7);
      tufts(OX0, OX1, -.45, .35, 1.9, Math.round(OW * 6 * (Q.part > .3 ? 1 : .5)));
      // jack-o'-lanterns along the paving
      const pmat = matFrom(pumpkinPB(), { ns: 1.5, rough: .55, ei: 3 });
      let n = 0; for (let x = 3.5; x < len; x += 9 + hh(x | 0, 3) * 6) { pumpkin(x, .75 + hh(x | 0, 9) * .3, .7 + hh(x | 0, 5) * .35, pmat, n++ < Q.pumps * 99); }
    } else {
      add(at(new THREE.Mesh(new THREE.BoxGeometry(LENW, SLAB, .4), concMat), CX, -SLAB / 2, .2));
      for (let x = X0 + 4; x < X1; x += 11 + hh(x | 0, 7) * 6) foliage(new THREE.Vector3(x, -2.2, 2.8 + hh(x | 0, 2) * 1.5), new THREE.Vector3(2, .9, 1.1), 26, 1.1, ['#7a8a3a', '#9a8f34', '#d27a30', '#a4452c', '#e0a048', '#5f6e34', '#b55e2e'], .1, 'tt' + (x | 0));
    }
    // Halloween bunting between pillars (not in the final corridor)
    if (lv < 3) bunting(pillars, CEIL - .02, .36);
    // cobwebs
    pillars.forEach((x, i) => { if (hh(i, lv) < .35) web(x + .21, 1); });
    LV = { id: z.lvId, lv, len, end: L.end, gate: L.gate * K };
    function pumpkin(x, zz, s, m, withLight) {
      const g = new THREE.SphereGeometry(.3 * s, 16, 10), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), a = Math.atan2(vz, vx), k = 1 - .07 * Math.abs(Math.sin(a * 4)); p.setXYZ(i, vx * k, vy * .78, vz * k); }
      g.computeVertexNormals();
      const me = add(at(new THREE.Mesh(g, m), x, -.45 + .3 * s * .78, zz)); me.rotation.y = (hh(x | 0, 1) - .5) * .6;
      add(at(new THREE.Mesh(new THREE.CylinderGeometry(.025 * s, .04 * s, .12 * s, 6), new THREE.MeshStandardMaterial({ color: 0x4a5a2a })), x, -.45 + .3 * s * 1.56 + .03, zz));
    }
    function cardGeo(w, h, m4, center, bend, swayFn, uv) {
      const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.applyMatrix4(m4);
      const p = g.attributes.position, nr = g.attributes.normal, sw = new Float32Array(p.count), v = new THREE.Vector3(), nn = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); nn.fromBufferAttribute(nr, i);
        if (center) nn.lerp(v.clone().sub(center).normalize(), bend).normalize(); else nn.lerp(new THREE.Vector3(0, 1, 0), bend).normalize();
        nr.setXYZ(i, nn.x, nn.y, nn.z); sw[i] = swayFn(v);
      }
      g.setAttribute('aSw', new THREE.BufferAttribute(sw, 1));
      if (uv) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, uv[0] + u.getX(i) * uv[2], u.getY(i)); }
      return g;
    }
    function tufts(x0, x1, y, z0, z1, n) {
      const pb = tuftAtlasPB(), map = tex(pb.canvas()), geos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const x = x0 + R() * (x1 - x0), zz = z0 + R() * (z1 - z0), s = .35 + R() * .35, v = R(), variant = v < .12 ? 3 : v < .35 ? 2 : v < .6 ? 1 : 0;
        for (const yaw of [0, Math.PI / 2]) { e.set(0, yaw + R() * .6, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, zz), q, new THREE.Vector3(1, 1, 1)); geos.push(cardGeo(s, s * .9, m4, null, .65, vv => Math.max(0, (vv.y - y) / s), [variant * .25, 0, .25])); }
      }
      add(new THREE.Mesh(mergeGeometries(geos), addSway(new THREE.MeshStandardMaterial({ map, alphaTest: .5, side: THREE.DoubleSide, roughness: .9 }), .14, 'grass')), false, true);
    }
    function foliage(center, rad, count, size, pal, amp, key) {
      const pb = leafClumpPB(pal), map = tex(pb.canvas()), geos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        let x, y, zz; do { x = R() * 2 - 1; y = R() * 2 - 1; zz = R() * 2 - 1; } while (x * x + y * y + zz * zz > 1);
        const sc = size * (.75 + R() * .5), pos = new THREE.Vector3(center.x + x * rad.x, center.y + y * rad.y - sc / 2, center.z + zz * rad.z);
        e.set((R() - .5) * .7, R() * Math.PI * 2, (R() - .5) * .5); q.setFromEuler(e); m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
        const ph = R() * .4; geos.push(cardGeo(sc, sc, m4, center, .78, v => Math.max(0, (v.y - (center.y - rad.y)) / (2 * rad.y)) * (.7 + ph)));
      }
      const mesh = add(new THREE.Mesh(mergeGeometries(geos), addSway(new THREE.MeshStandardMaterial({ map, normalMap: tex(pb.normal(2.5, false), { srgb: false }), alphaTest: .5, side: THREE.DoubleSide, roughness: .85 }), amp, key)), true, true);
      mesh.customDepthMaterial = addSway(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .5, side: THREE.DoubleSide }), amp, key + 'd');
    }
    function bunting(ps, y, zz) {
      const pos = [], col = [], nor = [], sw = [], C = ['#e8792b', '#5a3f96', '#221b2e', '#fbc75a'].map(c => new THREE.Color(c)); let ci = 0;
      for (let s = 0; s + 1 < ps.length; s++) {
        const a = ps[s] + .25, b = ps[s + 1] - .25, n = Math.floor((b - a) / .26);
        for (let i = 0; i < n; i++) { const x = a + (i + .5) * (b - a) / n, u = (x - a) / (b - a) * 2 - 1, top = y - .2 * (1 - u * u), c = C[ci++ % 4]; pos.push(x - .08, top, zz, x + .08, top, zz, x, top - .19, zz); nor.push(0, 0, 1, 0, 0, 1, 0, 0, 1); sw.push(0, 0, 1); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
      }
      if (!pos.length) return;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aSw', new THREE.Float32BufferAttribute(sw, 1));
      const m = add(new THREE.Mesh(g, addSway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .8 }), .09, 'bunt')));
      m.customDepthMaterial = addSway(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }), .09, 'buntd');
    }
    function web(x, s) {
      const pb = new PB(24, 24);
      for (let a = 0; a < 6; a++) { const an = a / 5 * Math.PI / 2; for (let r = 0; r < 24; r += .5) pb.px(Math.cos(an) * r, Math.sin(an) * r, [220, 220, 235], 1, 150); }
      for (let r = 4; r < 24; r += 4) for (let an = 0; an < Math.PI / 2; an += .02) pb.px(Math.cos(an) * r, Math.sin(an) * r, [200, 200, 220], 1, 110);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: tex(pb.canvas()), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      w.position.set(x + .5 * s, CEIL - .5, .12); w.rotation.z = Math.PI; w.scale.x = -s; G.add(w);
    }
  }

  // ---- particles: falling leaves, dust in the moonbeams, wisps -------------------------------
  const NL = Math.round(140 * Q.part) || 20;
  const leafGeo = new THREE.PlaneGeometry(.13, .13), leafVar = new Float32Array(NL); for (let i = 0; i < NL; i++) leafVar[i] = (R() * 4) | 0;
  leafGeo.setAttribute('aVar', new THREE.InstancedBufferAttribute(leafVar, 1));
  const leafMat = new THREE.MeshStandardMaterial({ map: tex(leafAtlasPB().canvas(), { crisp: true }), alphaTest: .5, side: THREE.DoubleSide, roughness: .8 });
  leafMat.onBeforeCompile = s => { s.vertexShader = 'attribute float aVar;\n' + s.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2(vMapUv.x * .25 + aVar * .25, vMapUv.y);'); };
  leafMat.customProgramCacheKey = () => 'leaf';
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, NL); leaves.receiveShadow = true; leaves.frustumCulled = false; scene.add(leaves);
  const LF = Array.from({ length: NL }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3(), rest: 0, ph: R() * 10, life: 1 }));
  let camWX = 0, viewW = 18;
  const spawnLeaf = (L, init) => { L.p.set(camWX - viewW * .7 + R() * viewW * 1.2, init ? -.3 + R() * 9 : 8.5 + R() * 1.5, -1.8 + R() * 3.5); L.v.set(.3, -.5, 0); L.s.set(R() * 6 - 3, R() * 6 - 3, R() * 6 - 3); L.r.set(R() * 6, R() * 6, R() * 6); L.rest = 0; L.life = 1; };
  LF.forEach(L => spawnLeaf(L, true));
  const dummy = new THREE.Object3D();
  function updateLeaves(dt, t, wind) {
    LF.forEach((L, i) => {
      if (L.rest > 0) {
        L.rest -= dt; if (wind > .75 && R() < dt * .4) { L.rest = 0; L.v.set(1.5, 1.2, 0); }
        L.life = Math.min(1, L.rest / .6); if (L.rest <= 0) spawnLeaf(L, false);
      } else {
        L.v.x += ((.25 + wind * 2.6) - L.v.x) * dt * 1.4; L.v.y += ((-.55 + Math.sin(t * 3.1 + L.ph) * .4) - L.v.y) * dt * 2; L.v.z += Math.sin(t * 1.7 + L.ph * 3) * .5 * dt;
        L.p.addScaledVector(L.v, dt); L.r.x += L.s.x * dt * (.6 + wind); L.r.y += L.s.y * dt; L.r.z += L.s.z * dt * (.6 + wind);
        if (L.p.z < BACK + .05) { L.p.z = BACK + .05; L.v.z = Math.abs(L.v.z); }
        const onCorr = L.p.z < .25 && L.p.z > BACK && L.p.y > -.2, ground = onCorr ? .008 : LV.lv >= 2 ? -40 : -.445;
        if (L.p.y <= ground) { L.p.y = ground; L.rest = 4 + R() * 8; L.r.set(-Math.PI / 2, R() * 6, 0); }
        if (L.p.x > camWX + viewW || L.p.y < -6) spawnLeaf(L, false);
      }
      dummy.position.copy(L.p); dummy.rotation.copy(L.r); dummy.scale.setScalar(L.rest > 0 ? Math.max(.001, L.life) : 1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    });
    leaves.instanceMatrix.needsUpdate = true;
  }
  const ND = Math.round(380 * Q.part);
  const dust = (() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(ND * 3), a = new Float32Array(ND);
    for (let i = 0; i < ND; i++) { p[i * 3] = R() * 24; p[i * 3 + 1] = R() * 3.6; p[i * 3 + 2] = BACK + R() * 4.4; a[i] = R(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: U.time, uPR: { value: 1 }, uCX: { value: 0 }, uLamp: { value: new THREE.Vector3() }, ...SHU },
      vertexShader: `uniform float uT; uniform float uPR; uniform float uCX; attribute float aR; varying vec3 vW; varying float vR;
        void main() { vec3 p = position; float t = uT * (.15 + aR * .1);
          p += vec3(sin(t + aR * 40.) * .5, sin(t * 1.3 + aR * 17.) * .3, cos(t * .9 + aR * 9.) * .3);
          p.x = uCX - 12. + mod(p.x - uCX + 12., 24.);
          vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; vR = aR; vec4 mv = viewMatrix * w;
          gl_Position = projectionMatrix * mv; gl_PointSize = uPR * (1. + aR * 1.6) * 10. / -mv.z; }`,
      fragmentShader: SHADOW_FN + `uniform vec3 uLamp; varying vec3 vW; varying float vR;
        void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard;
          vec3 c = vec3(.55, .65, 1.) * moonVis(vW) * .7; vec3 dl = uLamp - vW; c += vec3(1., .65, .3) * .9 / (dot(dl, dl) * 3. + .4);
          gl_FragColor = vec4(c * (1. - d * 2.) * (.2 + vR * .35), 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
  })();
  const NW = Math.round(14 * Math.max(.5, Q.part));
  const wisps = (() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(NW * 3), a = new Float32Array(NW);
    for (let i = 0; i < NW; i++) { p[i * 3] = R() * 30; p[i * 3 + 1] = -.2 + R() * 1.4; p[i * 3 + 2] = .7 + R() * 1.2; a[i] = R(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: U.time, uPR: { value: 1 }, uCX: { value: 0 }, uY: { value: 0 } },
      vertexShader: `uniform float uT; uniform float uPR; uniform float uCX; uniform float uY; attribute float aR; varying float vA; varying float vR;
        void main() { vec3 p = position; float t = uT * (.25 + aR * .2) + aR * 30.;
          p += vec3(sin(t) * 1.2, sin(t * 1.7) * .35 + uY, cos(t * .8) * .3); p.x = uCX - 15. + mod(p.x - uCX + 15., 30.);
          vA = .45 + .55 * pow(.5 + .5 * sin(uT * (1. + aR * 2.) + aR * 20.), 3.); vR = aR;
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPR * (14. + aR * 10.) * 8. / -mv.z; }`,
      fragmentShader: `varying float vA; varying float vR;
        void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard; float core = exp(-d * d * 60.), halo = exp(-d * d * 12.) * .35;
          gl_FragColor = vec4(mix(vec3(.6, .85, 1.), vec3(.8, .62, 1.), vR) * (core * 4. + halo) * vA, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
  })();

  // ---- post: volumetric light, composite (with cheap fog when there is no volume pass), DOF, bloom, grade
  const fsGeo = new THREE.BufferGeometry();
  fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  fsGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passes = [];
  const makePass = (fs, uniforms, extra = {}) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...extra });
    const mesh = new THREE.Mesh(fsGeo, mat); mesh.frustumCulled = false; const sc = new THREE.Scene(); sc.add(mesh); passes.push(mat);
    return { u: uniforms, run(rt) { renderer.setRenderTarget(rt); renderer.render(sc, fsCam); } };
  };
  const NLV = 8;
  const WORLD_AT = 'vec3 worldAt(vec2 uv, float d) { vec4 v = uProjInv * vec4(uv * 2. - 1., d * 2. - 1., 1.); v /= v.w; return (uViewInv * v).xyz; }';
  const vol = Q.vol ? makePass(SHADOW_FN + `
    uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCam;
    uniform float uT; uniform vec3 uMoonDir; uniform vec3 uMoonCol; uniform float uDens; uniform float uExt; uniform float uLow;
    uniform vec3 uLP[${NLV}]; uniform vec3 uLC[${NLV}]; uniform vec4 uLD[${NLV}]; uniform float uLR[${NLV}]; uniform int uLN;
    varying vec2 vUv;
    float h13(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
    float dens(vec3 p) { float y = p.y - uLow; vec3 q = p * .42 + vec3(-uT * .22, uT * .03, uT * .05);
      float n = vn(q) * .62 + vn(q * 2.3 + 7.1) * .38;
      return uDens * ((.06 + exp(-max(y, 0.) * .5) * .26) * (.55 + .9 * n) + exp(-max(y, 0.) * 1.5) * smoothstep(.3, .72, n) * 2.4); }
    ${WORLD_AT}
    void main() {
      vec3 wp = worldAt(vUv, texture2D(tDepth, vUv).r); vec3 rd = wp - uCam; float L = length(rd); rd /= L; L = min(L, 30.);
      const int N = ${Q.steps || 1}; float st = L / float(N);
      float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
      float g = .3, ct = dot(rd, -uMoonDir), ph = (1. - g * g) / pow(1. + g * g - 2. * g * ct, 1.5) * .0796;
      vec3 acc = vec3(0.); float T = 1.;
      for (int i = 0; i < N; i++) {
        vec3 p = uCam + rd * ((float(i) + j) * st); float s = dens(p);
        vec3 S = uMoonCol * moonVis(p) * ph;
        for (int k = 0; k < ${NLV}; k++) { if (k >= uLN) break; vec3 dl = uLP[k] - p; float d2 = dot(dl, dl), dd = sqrt(d2);
          float cone = uLD[k].w > 0. ? smoothstep(uLD[k].w, uLD[k].w + .06, dot(-dl / dd, uLD[k].xyz)) * 4. : 1.;
          float rng = uLR[k] > 0. ? 1. - smoothstep(uLR[k] * .7, uLR[k], dd) : 1.;
          S += uLC[k] * cone * rng / (d2 + .3); }
        acc += T * s * st * S; T *= exp(-s * st * uExt);
      }
      gl_FragColor = vec4(acc, T);
    }`, {
    tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
    uT: U.time, uMoonDir: { value: MOON_DIR }, uMoonCol: { value: new THREE.Color(0x9ab0ff).multiplyScalar(7) }, uDens: { value: .036 }, uExt: { value: 1.6 }, uLow: { value: -.45 },
    uLP: { value: Array.from({ length: NLV }, () => new THREE.Vector3()) }, uLC: { value: Array.from({ length: NLV }, () => new THREE.Vector3()) },
    uLD: { value: Array.from({ length: NLV }, () => new THREE.Vector4()) }, uLR: { value: new Array(NLV).fill(0) }, uLN: { value: 0 }, ...SHU,
  }) : null;
  const comp = makePass(`uniform sampler2D tScene; uniform sampler2D tVol; uniform sampler2D tDepth; uniform vec2 uTx; uniform float uVol;
    uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCam; uniform float uLow; varying vec2 vUv;
    ${WORLD_AT}
    void main() {
      vec3 c = texture2D(tScene, vUv).rgb;
      if (uVol > .5) {
        vec4 v = texture2D(tVol, vUv) * .4 + (texture2D(tVol, vUv + uTx) + texture2D(tVol, vUv - uTx) + texture2D(tVol, vUv + vec2(uTx.x, -uTx.y)) + texture2D(tVol, vUv + vec2(-uTx.x, uTx.y))) * .15;
        c = c * v.a + v.rgb;
      } else {
        vec3 wp = worldAt(vUv, texture2D(tDepth, vUv).r); float dist = min(length(wp - uCam), 30.);
        float f = (1. - exp(-dist * .012)) * (.4 + .6 * exp(-max(wp.y - uLow, 0.) * .5));
        c = mix(c, vec3(.05, .05, .11), clamp(f, 0., .5));
      }
      gl_FragColor = vec4(c, 1.);
    }`, { tScene: { value: null }, tVol: { value: null }, tDepth: { value: null }, uTx: { value: new THREE.Vector2() }, uVol: { value: 0 }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uLow: { value: -.45 } });
  const dof = Q.dof ? makePass(`#include <packing>
    uniform sampler2D tCol; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uFocus; uniform float uAper; uniform float uMaxR; uniform float uTilt; uniform float uNear; uniform float uFar;
    varying vec2 vUv;
    float coc(vec2 uv) { float z = -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar);
      return clamp((z - uFocus) / z * uAper + smoothstep(.78, 1., uv.y) * uTilt, -uMaxR, uMaxR); }
    void main() {
      float k0 = coc(vUv); vec3 sum = texture2D(tCol, vUv).rgb; float ws = 1.;
      const int N = ${Q.dof};
      for (int i = 0; i < N; i++) {
        float fi = float(i) + .5, r = sqrt(fi / float(N)) * uMaxR, a = fi * 2.39996323;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes; float k = coc(uv), sc = abs(k);
        if (k > k0) sc = min(sc, abs(k0));
        float w = clamp(sc - r + 1., 0., 1.); sum += texture2D(tCol, uv).rgb * w; ws += w;
      }
      gl_FragColor = vec4(sum / ws, 1.);
    }`, { tCol: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uFocus: { value: 12 }, uAper: { value: 3 }, uMaxR: { value: 6 }, uTilt: { value: 2 }, uNear: { value: camera.near }, uFar: { value: camera.far } }) : null;
  const down = makePass(`uniform sampler2D tSrc; uniform vec2 uTx; uniform float uThr; uniform float uPre; varying vec2 vUv;
    void main() { vec3 c = (texture2D(tSrc, vUv - uTx).rgb + texture2D(tSrc, vUv + vec2(uTx.x, -uTx.y)).rgb + texture2D(tSrc, vUv + vec2(-uTx.x, uTx.y)).rgb + texture2D(tSrc, vUv + uTx).rgb) * .25;
      if (uPre > .5) { float l = max(c.r, max(c.g, c.b)); c *= max(l - uThr, 0.) / max(l, 1e-4); }
      gl_FragColor = vec4(c, 1.); }`, { tSrc: { value: null }, uTx: { value: new THREE.Vector2() }, uThr: { value: .85 }, uPre: { value: 0 } });
  const up = makePass(`uniform sampler2D tSrc; uniform vec2 uTx; varying vec2 vUv;
    void main() { vec3 c = texture2D(tSrc, vUv).rgb * 4.;
      c += (texture2D(tSrc, vUv + vec2(uTx.x, 0.)).rgb + texture2D(tSrc, vUv - vec2(uTx.x, 0.)).rgb + texture2D(tSrc, vUv + vec2(0., uTx.y)).rgb + texture2D(tSrc, vUv - vec2(0., uTx.y)).rgb) * 2.;
      c += texture2D(tSrc, vUv + uTx).rgb + texture2D(tSrc, vUv - uTx).rgb + texture2D(tSrc, vUv + vec2(uTx.x, -uTx.y)).rgb + texture2D(tSrc, vUv + vec2(-uTx.x, uTx.y)).rgb;
      gl_FragColor = vec4(c / 16., 1.); }`, { tSrc: { value: null }, uTx: { value: new THREE.Vector2() } }, { transparent: true, blending: THREE.AdditiveBlending });
  const fin = makePass(`uniform sampler2D tCol; uniform sampler2D tBloom; uniform float uBloom; uniform float uExpo; uniform float uT; uniform vec2 uRes; uniform float uTen; uniform float uGH; varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    float hs(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uTen > 0.) { float band = floor(uv.y * uGH / 4.); uv.x += sin(uT * 5. + band * 4. * .09) * uTen / uRes.x * (uRes.y / uGH); }
      vec2 dc = uv - .5; float r2 = dot(dc, dc); vec2 ca = dc * r2 * .012;
      vec3 c = vec3(texture2D(tCol, uv - ca).r, texture2D(tCol, uv).g, texture2D(tCol, uv + ca).b);
      c += texture2D(tBloom, uv).rgb * uBloom;
      c *= uExpo;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(c, c * vec3(.82, .86, 1.2), 1. - smoothstep(0., .3, l)) + vec3(.003, .002, .008);
      c = aces(c);
      c = mix(c, c * vec3(1.06, 1., .9), smoothstep(.45, 1., l));
      c *= 1. - smoothstep(.12, .75, r2 * 1.9) * .62;
      c = pow(c, vec3(1. / 2.2));
      c += (hs(vUv * uRes + fract(uT) * 91.) - .5) * .022;
      gl_FragColor = vec4(c, 1.);
    }`, { tCol: { value: null }, tBloom: { value: null }, uBloom: { value: .85 }, uExpo: { value: .8 }, uT: U.time, uRes: { value: new THREE.Vector2() }, uTen: { value: 0 }, uGH: { value: 270 } });

  const HF = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let rtScene, rtVol, rtComp, rtDof, BL = [], RW = 1, RH = 1, scale = 1;
  const FX = { vol: !!vol, refl: Q.refl > 0, dof: !!dof };
  function sizeReflector() { if (reflector) reflector.getRenderTarget().setSize(Math.max(64, RW * Q.refl | 0), Math.max(64, RH * Q.refl | 0)); }
  let css = { w: 1, h: 1 }, gw = 1, gh = 1, gfy = 1, camGX = 0;
  function setSize() {
    const dpr = window.devicePixelRatio || 1;
    let pr = Math.min(dpr, Q.pr) * scale; if (css.h * pr > Q.maxH) pr = Q.maxH / css.h;
    renderer.setPixelRatio(pr); renderer.setSize(css.w, css.h, false);
    cv.style.width = css.w + 'px'; cv.style.height = css.h + 'px';
    RW = Math.max(2, Math.floor(css.w * pr)); RH = Math.max(2, Math.floor(css.h * pr));
    [rtScene, rtVol, rtComp, rtDof, ...BL].forEach(r => r && r.dispose());
    rtScene = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: Q.soft ? 4 : 0 }); rtScene.depthTexture = new THREE.DepthTexture(RW, RH); rtScene.depthTexture.type = THREE.UnsignedIntType;
    rtVol = vol ? new THREE.WebGLRenderTarget(Math.max(2, RW / Q.vol | 0), Math.max(2, RH / Q.vol | 0), HF) : null;
    rtComp = new THREE.WebGLRenderTarget(RW, RH, HF); rtDof = dof ? new THREE.WebGLRenderTarget(RW, RH, HF) : null;
    BL = []; for (let i = 0, bw = RW >> 1, bh = RH >> 1; i < Q.bloom; i++, bw = Math.max(1, bw >> 1), bh = Math.max(1, bh >> 1)) BL.push(new THREE.WebGLRenderTarget(bw, bh, HF));
    sizeReflector();
    if (dof) { dof.u.uRes.value.set(RW, RH); dof.u.uMaxR.value = 5 * RH / 900; dof.u.uAper.value = 3 * RH / 900; dof.u.uTilt.value = 4 * RH / 900; }
    fin.u.uRes.value.set(RW, RH); if (rtVol) comp.u.uTx.value.set(1 / rtVol.width, 1 / rtVol.height);
    dust.material.uniforms.uPR.value = pr; wisps.material.uniforms.uPR.value = pr;
  }

  // ---- per frame -------------------------------------------------------------------------------
  let shown = true, frames = 0, acc = 0, slowN = 0, lastT = 0;
  const tmpV = new THREE.Vector3();
  const api = {
    proj(gx, gy, zw) { const d = Math.max(9, gh * K * 1.15), r = d / (d + (ZP - zw)), cx = (camGX + gw / 2), camY = gfy * K, Y = (gfy - gy) * K; return [gw / 2 + (gx - cx) * r, gfy - (camY + (Y - camY) * r) / K]; },
    wallZ: BACK + .09,
    tier: tierName, canvas: cv, lit: litC, glow: glowC, litX, glowX, on: true,
    setLevel(z) { if (z.demo || !z.L) return; if (z.lvId !== LV.id) build(z); else lampX = (z.lamps || []).map(l => (l.x + 9) * K); },
    resize(f, z) {
      css = { w: f.W * f.s, h: f.H * f.s }; gw = f.W; gh = f.H; gfy = z.fy;
      if (litC.width !== gw || litC.height !== gh) { litC.width = glowC.width = gw; litC.height = glowC.height = gh; litT.dispose(); glowT.dispose(); }
      setSize(); fin.u.uGH.value = gh;
    },
    show(v) { if (v === shown) return; shown = v; cv.style.display = v ? 'block' : 'none'; },
    dispose() { if (G) disposeGroup(G); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); cv.remove(); api.on = false; },
    frame(z) {
      if (!shown || !G || !rtScene) return;
      const t = z.t, dt = Math.min(.05, Math.max(0, t - lastT)) || .016; lastT = t; U.time.value = t;
      const gust = Math.pow(Math.max(0, Math.sin(t * .37) * Math.sin(t * .13 + 2)), 2), wind = reduce ? .15 : .18 + gust * .85; U.wind.value = wind;
      camGX = z.cam; gfy = z.fy; gw = z.W; gh = z.H;
      const W = z.W, H = z.H, fy = z.fy, cam = z.cam, dark = z.lc3 && z.lc3.st === 'off', warn = z.lc3 && z.lc3.st === 'warn';
      // camera: eye at the height of the screen's top edge, looking straight down the z axis, with an
      // off-axis frustum so the sprite plane (z = ZP) maps exactly onto the screen
      const shx = z.shake > 0 && !reduce ? (Math.random() * 4 - 2) : 0, shy = z.shake > 0 && !reduce ? (Math.random() * 2 - 1) : 0;
      const yTop = (fy + shy) * K, yBot = (fy + shy - H) * K, camY = yTop, d = Math.max(9, H * K * 1.15);
      const cx = (cam + W / 2 + shx) * K; camWX = cx; viewW = W * K;
      camera.position.set(cx, camY, ZP + d); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld();
      const n = camera.near, s = n / d;
      camera.projectionMatrix.makePerspective(-W / 2 * K * s, W / 2 * K * s, (yTop - camY) * s, (yBot - camY) * s, n, camera.far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      [litPlane, silPlane, glowPlane].forEach(m => { m.position.set(cx, (yTop + yBot) / 2, ZP); m.scale.set(W * K, H * K, 1); });
      glowPlane.position.z = ZP + .01;
      sky.position.x = cx * .9; sky.position.y = 30; sky.material.uniforms.uOff.value = cx * .9;
      litT.needsUpdate = true; glowT.needsUpdate = true;
      // moon (shadow box follows the camera, snapped to texels so shadows don't shimmer)
      const half = Math.max(14, W * K / 2 + 7), texel = half * 2 / Q.shadow, tx = Math.round(cx / texel) * texel;
      Object.assign(moon.shadow.camera, { left: -half, right: half }); moon.shadow.camera.updateProjectionMatrix();
      moon.target.position.set(tx, 2, 0); moon.position.copy(MOON_DIR).multiplyScalar(-40).add(moon.target.position);
      moon.intensity = (dark ? .1 : .3) * (LOOK[LV.lv] || LOOK[0]).mood;
      // lantern: a warm halo plus a spotlight down the gaze cone
      const lg = z.lantern(), lw = new THREE.Vector3(lg[0] * K, (fy - lg[1]) * K, ZP + .45), R = Math.max(.5, z.range * K), beam = z.beaming;
      lanP.position.copy(lw); lanP.intensity = 2.4 * (reduce ? 1 : .92 + Math.sin(t * 9) * .05);
      lanS.position.copy(lw); lanS.target.position.set(lw.x + z.face * R, lw.y - R * .08, ZP - .4); lanS.distance = R * 1.25; lanS.angle = beam ? .16 : Math.atan(.46); lanS.intensity = (beam ? 70 : 34) * Math.max(.3, z.light || 1);
      litMat.uniforms.uLan.value.copy(lw); litMat.uniforms.uLanR.value = R; litMat.uniforms.uFace.value = z.face; litMat.uniforms.uCone.value = beam ? .1 : .46;
      // ceiling lamps: the nearest lit ones get real lights
      const lamps = z.lamps || [];
      const lit = l => { if (dark) return 0; if (warn) return (t * 14 | 0) % 3 === 0 ? 1 : 0; return l.k === 'on' || (l.k === 'flicker' && (reduce || Math.sin(t * 13 + l.ph) * Math.sin(t * 3.1 + l.ph * 2) > -.2)) ? 1 : 0; };
      const tc = new THREE.Color(), litList = [];
      lamps.forEach((l, i) => { const on = lit(l); if (tubes && i < tubes.count) { tubes.setColorAt(i, tc.setRGB(on ? 2 : .05, on ? 2.1 : .05, on ? 2.4 : .07)); } if (on) litList.push(lampX[i]); });
      if (tubes && tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
      litList.sort((a, b) => Math.abs(a - cx) - Math.abs(b - cx));
      const PL = [];
      lampL.forEach((L, i) => { const x = litList[i]; if (x == null) { L.intensity = 0; return; } L.position.set(x, CEIL - .95, -1.25); L.intensity = 2.3; PL.push([L.position.clone(), new THREE.Vector3(.9, .93, 1).multiplyScalar(.38), [0, -1, 0, .5], 0]); });
      // glowing enemies light their surroundings
      const glows = (z.en || []).filter(e => !e.dead && e.a > .3 && (e.type === 'g' || e.type === 'w' || e.type === 'F')).map(e => [Math.abs(e.x - z.px), e]).sort((a, b) => a[0] - b[0]);
      glowL.forEach((L, i) => { const g = glows[i]; if (!g) { L.intensity = 0; return; } const e = g[1]; L.position.set(e.x * K, (fy - e.y) * K + (e.type === 'F' ? 1.5 : .3), ZP + .4); L.color.set(e.type === 'w' ? 0x8fc4ff : e.type === 'F' ? 0x7a3aff : 0xa98cff); L.intensity = e.type === 'F' ? 3 : 1.6; PL.push([L.position.clone(), new THREE.Vector3(L.color.r, L.color.g, L.color.b).multiplyScalar(.35), null, 0]); });
      if (turnLamp) turnLamp.intensity = reduce ? 1.2 : (Math.sin(t * 11) * Math.sin(t * 4.3 + 1) > .35 ? .15 : 1.4);
      const fin3 = LV.end === 'final' && z.phase !== 'explore'; endL.intensity = fin3 ? 3 + Math.sin(t * 2) : 0; endL.position.set((LV.len - 75 * K), 2.2, BACK + .6);
      // the sprite layer's own light list
      litMat.uniforms.uLN.value = Math.min(NPL, PL.length); PL.slice(0, NPL).forEach(([p, c], i) => { litMat.uniforms.uLP.value[i].copy(p); litMat.uniforms.uLC.value[i].copy(c); });
      litMat.uniforms.uMoon.value.setRGB(.07, .08, .16).multiplyScalar(dark ? .3 : 1);
      // possessed doors (only seen in your light, like the 2D game)
      let di = 0; const dImg = z.A && z.A.door && z.A.door.burden && z.A.door.burden[0];
      if (dImg) (z.en || []).forEach(e => { if (e.type !== 't' || !e.door || e.dead || !e.seen) return; const m = doorSprite(di++, dImg); m.visible = true; m.position.set(e.door.x * K, dImg.height * K / 2, BACK + .09); m.material.opacity = reduce ? .85 : .6 + Math.sin(t * 9) * .25; });
      for (let i = di; i < doorSpr.length; i++) doorSpr[i].m.visible = false;
      // door outlines vanish once searched
      (z.doors || []).forEach((dd, i) => { const og = outlines[i]; if (og) { og.visible = !dd.done; og.children.forEach(m => { m.material.opacity = .32 + (reduce ? .08 : Math.sin(t * 2 + dd.x) * .12); }); } });
      // particles
      if (!reduce) updateLeaves(dt, t, wind);
      dust.material.uniforms.uCX.value = cx; dust.material.uniforms.uLamp.value.copy(lw);
      wisps.visible = LV.lv < 2; wisps.material.uniforms.uCX.value = cx;
      // render
      renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
      SHU.uShadowMap.value = moon.shadow.map ? moon.shadow.map.texture : null; SHU.uShadowMatrix.value.copy(moon.shadow.matrix);
      const useVol = vol && FX.vol;
      if (useVol) {
        const VL = [];
        VL.push([lw, new THREE.Vector3(1, .7, .35).multiplyScalar(.24), [0, 0, 0, 0], 2.5]);
        VL.push([lw, new THREE.Vector3(1, .78, .45).multiplyScalar((beam ? 1.2 : .55) * Math.max(.3, z.light || 1)), [z.face, -.08, -.1, beam ? .985 : .9], R * 1.2]);
        PL.forEach(([p, c, dir]) => VL.push([p, c.clone().multiplyScalar(dir ? .06 : .3), dir || [0, 0, 0, 0], 0]));
        if (fin3) VL.push([endL.position, new THREE.Vector3(1, .2, .4).multiplyScalar(.3), [0, 0, 0, 0], 0]);
        vol.u.uLN.value = Math.min(NLV, VL.length);
        VL.slice(0, NLV).forEach(([p, c, dd, r], i) => { vol.u.uLP.value[i].copy(p); vol.u.uLC.value[i].copy(c); const l = Math.hypot(dd[0], dd[1], dd[2]) || 1; vol.u.uLD.value[i].set(dd[0] / l, dd[1] / l, dd[2] / l, dd[3]); vol.u.uLR.value[i] = r; });
        vol.u.tDepth.value = rtScene.depthTexture; vol.u.uProjInv.value.copy(camera.projectionMatrixInverse); vol.u.uViewInv.value.copy(camera.matrixWorld); vol.u.uCam.value.copy(camera.position);
        vol.u.uLow.value = LV.lv >= 2 ? -SH - .45 : -.45; vol.u.uMoonCol.value.setRGB(.6, .69, 1).multiplyScalar(dark ? .6 : 2);
        vol.run(rtVol);
      }
      comp.u.tScene.value = rtScene.texture; comp.u.tVol.value = rtVol ? rtVol.texture : null; comp.u.uVol.value = useVol ? 1 : 0;
      comp.u.tDepth.value = rtScene.depthTexture; comp.u.uProjInv.value.copy(camera.projectionMatrixInverse); comp.u.uViewInv.value.copy(camera.matrixWorld); comp.u.uCam.value.copy(camera.position); comp.u.uLow.value = LV.lv >= 2 ? -SH - .45 : -.45;
      comp.run(rtComp);
      let src = rtComp;
      if (dof && FX.dof) { dof.u.tCol.value = rtComp.texture; dof.u.tDepth.value = rtScene.depthTexture; dof.u.uFocus.value = d; dof.run(rtDof); src = rtDof; }
      const col = src;
      BL.forEach((rt, i) => { down.u.tSrc.value = src.texture; down.u.uTx.value.set(1 / src.width, 1 / src.height); down.u.uPre.value = i === 0 ? 1 : 0; down.run(rt); src = rt; });
      renderer.autoClear = false;
      for (let i = BL.length - 2; i >= 0; i--) { up.u.tSrc.value = BL[i + 1].texture; up.u.uTx.value.set(1 / BL[i + 1].width, 1 / BL[i + 1].height); up.run(BL[i]); }
      renderer.autoClear = true;
      fin.u.tCol.value = col.texture; fin.u.tBloom.value = BL[0].texture; fin.u.uTen.value = z.tension > .55 && !reduce ? (z.tension - .55) * 7 : 0;
      fin.run(null);
      // frame-rate governor: lower the resolution first, then drop the heaviest passes
      acc += dt; frames++;
      if (acc > 2) {
        const fps = frames / acc; frames = 0; acc = 0;
        if (fps < 40) slowN++; else slowN = 0;
        if (slowN >= 2) {
          slowN = 0;
          if (scale > .62) { scale = Math.max(.6, scale - .14); setSize(); }
          else if (FX.vol) FX.vol = false;
          else if (FX.dof) FX.dof = false;
          else if (FX.refl && reflector) { FX.refl = false; reflector.visible = false; floorMat.transparent = false; floorMat.needsUpdate = true; }
        }
        api.fps = fps;
      }
    },
  };
  return api;
}
