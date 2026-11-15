// Builds the site's 3D models and writes them to ../models/*.glb.
//   cd tools && npm install && node build-models.mjs
// Everything is modelled in code with three@0.160.0 (same version the site loads) and exported with
// GLTFExporter, so the GLBs can be regenerated or tweaked here. Coordinate frames match the old
// procedural builds: Y up, front +Z, the camera lenses centred on (0, -0.1).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'models');
const TAU = Math.PI * 2;

// GLTFExporter reads its binary blob through FileReader, which Node lacks.
globalThis.FileReader ??= class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:' + (b.type || 'application/octet-stream') + ';base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
};

// ---------- helpers ----------
function std(name, color, roughness, metalness, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }); m.name = name; return m;
}
function phys(name, color, roughness, metalness, extra = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra }); m.name = name; return m;
}
function put(g, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); g.add(m); return m;
}
// Lathe profile [[radius, z], ...] revolved around +Z (the lens axis). Order points front-ward.
function lathe(pts, seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2); return g;
}
// Closed cylinder with flat-topped ridges (knurling), axis Y, centred on y = 0.
function ribbed(rO, rI, h, ribs) {
  const ring = [], s = TAU / ribs;
  for (let i = 0; i < ribs; i++) {
    const a = i * s;
    ring.push([a, rO], [a + .42 * s, rO], [a + .52 * s, rI], [a + .92 * s, rI]);
  }
  const P = ring.map(([a, r]) => [Math.sin(a) * r, Math.cos(a) * r]), y0 = -h / 2, y1 = h / 2, v = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    v.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    v.push(0, y1, 0, ax, y1, az, bx, y1, bz);
    v.push(0, y0, 0, bx, y0, bz, ax, y0, az);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
function rrect(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape(), x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function stadium(a, R) {
  const s = new THREE.Shape(); s.moveTo(-a, -R); s.lineTo(a, -R);
  s.absarc(a, 0, R, -Math.PI / 2, Math.PI / 2); s.lineTo(-a, R); s.absarc(-a, 0, R, Math.PI / 2, Math.PI * 1.5); return s;
}
// Extrude a shape drawn in plan (x, -z) into a slab spanning y0..y1 with a rounded bevel.
function slabY(shape, y0, y1, bevel, curve = 32) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.001, y1 - y0 - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: curve });
  g.translate(0, 0, bevel); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
}
// Extrude a shape drawn in elevation (x, y) along +Z from z0 to z1.
function slabZ(shape, z0, z1, bevel, curve = 24, bevelSegments = 3) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.001, z1 - z0 - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments, curveSegments: curve });
  g.translate(0, 0, z0 + bevel); return g;
}
function cyl(r, h, seg = 48) { return new THREE.CylinderGeometry(r, r, h, seg); }
function capsule2d(x0, y0, r0, x1, y1, r1, n = 12) {
  const a = Math.atan2(y1 - y0, x1 - x0), s = new THREE.Shape();
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + Math.PI * i / n; const p = [x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + Math.PI * i / n; s.lineTo(x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1); }
  return s;
}
// Radial engraving ticks on a disc lying in the XZ plane at height y.
function ticks(g, mat, n, r, y, len, w = .014, skip = []) {
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const a = i / n * TAU, m = put(g, new THREE.BoxGeometry(w, .006, len), mat, [Math.sin(a) * r, y, Math.cos(a) * r]);
    m.rotation.y = a;
  }
}
// Collapse a group into one mesh per material (fewer draw calls, smaller file).
function bake(root, name) {
  root.updateMatrixWorld(true);
  const by = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const keep = o.material.userData.uv ? ['position', 'normal', 'uv'] : ['position', 'normal'];
    if (o.material.userData.uv && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    // Smooth normals below 40°, hard edges above: lets mergeVertices share most vertices.
    g = toCreasedNormals(g, Math.PI * 40 / 180);
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
  });
  const out = new THREE.Group(); out.name = name;
  for (const [mat, list] of by) {
    const m = new THREE.Mesh(mergeVertices(mergeGeometries(list), 1e-5), mat);
    m.name = name + '_' + mat.name; out.add(m);
  }
  return out;
}

// ---------- Rubik's cube ----------
function buildCube() {
  // Face colours in three's Y-up frame (the old CSS cube had +y pointing down).
  const COL = { px: '#e0707f', nx: '#eb9a12', py: '#faf6ff', ny: '#fbc75a', pz: '#7a8be8', nz: '#5fbf9a' };
  const body = std('cube_body', '#2a1f4a', .38, .05);
  const stickerMat = {};
  for (const k in COL) stickerMat[k] = phys('sticker_' + k, COL[k], .3, 0, { clearcoat: .6, clearcoatRoughness: .25 });
  const bodyGeo = new RoundedBoxGeometry(.98, .98, .98, 2, .1);
  const stGeo = slabZ(rrect(.78, .78, .13), 0, .028, .01, 4, 2);
  const NORM = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] };
  const ROT = { px: [0, Math.PI / 2, 0], nx: [0, -Math.PI / 2, 0], py: [-Math.PI / 2, 0, 0], ny: [Math.PI / 2, 0, 0], pz: [0, 0, 0], nz: [0, Math.PI, 0] };
  const root = new THREE.Group(); root.name = 'rubiks_cube';
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const c = new THREE.Group(); c.name = `cubie_${x}_${y}_${z}`; c.position.set(x, y, z);
    c.userData = { cubie: [x, y, z] };
    const b = new THREE.Mesh(bodyGeo, body); b.name = c.name + '_body'; c.add(b);
    for (const f in NORM) {
      const n = NORM[f];
      if (n[0] && n[0] !== x || n[1] && n[1] !== y || n[2] && n[2] !== z) continue;
      const s = new THREE.Mesh(stGeo, stickerMat[f]); s.name = c.name + '_' + f;
      s.rotation.set(...ROT[f]); s.position.set(n[0] * .482, n[1] * .482, n[2] * .482);
      s.userData = { face: f }; c.add(s);
    }
    root.add(c);
  }
  return root;
}

// ---------- Dodgeball ----------
// Orange rubber playground ball: a moulded seam around one great circle, raised purple AETERNA lettering
// on each side, an inflation valve. The pebbled grip is a bump map added at runtime (ball3d.js) on 'dodgeball'.
function buildBall() {
  const rubber = phys('dodgeball', '#f47a1f', .58, 0, { clearcoat: .25, clearcoatRoughness: .45, sheen: .4, sheenColor: '#ffc89a' });
  const printMat = phys('dodgeball_print', '#5a3f96', .5, 0, { clearcoat: .4, clearcoatRoughness: .35 });
  rubber.userData.uv = true;
  const g = new THREE.SphereGeometry(1, 128, 96), P = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    // Seam: a rounded groove along the x = 0 great circle.
    const ds = Math.abs(Math.asin(Math.max(-1, Math.min(1, v.x)))), r = 1 - .014 * Math.max(0, 1 - (ds / .026) ** 2);
    P.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  const root = new THREE.Group(); root.name = 'dodgeball';
  const m = new THREE.Mesh(g, rubber); m.name = 'dodgeball_body'; root.add(m);
  const font = new Font(JSON.parse(fs.readFileSync(createRequire(import.meta.url).resolve('three/examples/fonts/helvetiker_bold.typeface.json'), 'utf8')));
  [[[1, 0, 0], [0, 0, -1]], [[-1, 0, 0], [0, 0, 1]]].forEach(([N, U], i) => {
    const t = new THREE.Mesh(sphereText(font, 'AETERNA', N, U, [0, 1, 0]), printMat); t.name = 'dodgeball_print' + i; root.add(t);
  });
  const valve = new THREE.Group();
  put(valve, lathe([[0, -.02], [.05, -.02], [.05, .003], [.04, .01], [.016, .005], [0, .005]], 32), std('ball_valve', '#c2561a', .7, 0));
  const dir = new THREE.Vector3(.12, .72, .68).normalize();
  valve.position.copy(dir.clone().multiplyScalar(.995)); valve.lookAt(dir.clone().multiplyScalar(2));
  root.add(bake(valve, 'ball_valve'));
  return root;
}
// Text wrapped onto the unit sphere around normal N (tangent axes U, V), raised by H.
function sphereText(font, str, N, U, V, size = .17, H = .012) {
  const g = new TextGeometry(str, { font, size, height: H + .006, curveSegments: 6, bevelEnabled: false });
  g.computeBoundingBox(); const bb = g.boundingBox;
  g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -.006);
  const n = new THREE.Vector3(...N), u = new THREE.Vector3(...U), w = new THREE.Vector3(...V), P = g.attributes.position, q = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    // Map tangent-plane x to an arc angle so the word wraps evenly instead of stretching at the ends.
    const ax = P.getX(i) * .95, ay = P.getY(i);
    q.copy(n).multiplyScalar(Math.cos(ax)).addScaledVector(u, Math.sin(ax)).addScaledVector(w, ay).normalize().multiplyScalar(1 + P.getZ(i));
    P.setXYZ(i, q.x, q.y, q.z);
  }
  g.deleteAttribute('uv');
  return mergeVertices(toCreasedNormals(g, Math.PI / 4), 1e-6);
}
// ---------- Vintage rangefinder camera ----------
function buildVintage() {
  const g = new THREE.Group();
  const leather = std('Leather', '#4a3880', .82, 0); leather.userData.uv = true;
  const chrome = std('chrome', '#ebe4f8', .22, .85);
  const satin = std('chrome_satin', '#cfc7e0', .42, .8);
  const dark = std('enamel', '#221a3c', .42, .3);
  const black = std('rubber', '#16112a', .8, 0);
  const gold = std('gold', '#f2b544', .28, .8, { emissive: '#5a3500', emissiveIntensity: .2 });
  const glass = phys('glass', '#3a3290', .02, .2, { emissive: '#3b3290', emissiveIntensity: .25, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .42 });
  const glassIn = phys('glass_inner', '#4b3fa8', .05, .8, { emissive: '#2c2380', emissiveIntensity: .6, clearcoat: 1 });
  const iris = std('iris', '#2a2340', .35, .7), irisEdge = std('iris_edge', '#6a5e8c', .3, .8);
  const ring = std('lens_glint', '#b490ef', .2, .2, { emissive: '#7a62c8', emissiveIntensity: .7 });
  const strap = std('strap', '#2e2352', .72, 0);
  const vf = phys('viewfinder', '#1e1a3c', .05, .4, { clearcoat: 1, emissive: '#2a2560', emissiveIntensity: .3 });
  const frost = std('frost', '#ece5f8', .9, 0, { emissive: '#cdb6f2', emissiveIntensity: .12 });
  const paint = std('engraving', '#faf6ff', .6, 0);
  const amber = std('lamp', '#e8930f', .4, 0, { emissive: '#e8930f', emissiveIntensity: .7 });
  // Body: stadium-plan slabs — bottom plate, leatherette band, top plate.
  put(g, slabY(stadium(1.2, .57), -.86, -.69, .03), chrome);
  put(g, slabY(stadium(1.2, .555), -.7, .64, .012), leather);
  put(g, slabY(stadium(1.2, .58), .62, 1.06, .05), chrome);
  // A thin satin seam line where the top plate meets the leather.
  put(g, slabY(stadium(1.2, .565), .6, .63, 0), satin);
  // Front windows on the top plate (front face at z = .63).
  [[-.98, .84, .5, .26, vf], [-.22, .84, .28, .2, frost], [.74, .84, .44, .27, vf]].forEach(([x, y, w, h, m]) => {
    const ring = rrect(w + .07, h + .07, .06, x, y); ring.holes.push(rrect(w, h, .04, x, y));
    put(g, slabZ(ring, .6, .65, .008, 16), satin);
    put(g, slabZ(rrect(w, h, .04, x, y), .6, .635, 0, 16), m);
  });
  // Rewind knob with folding crank (left).
  put(g, cyl(.3, .06), satin, [-1.15, 1.09, 0]);
  put(g, ribbed(.28, .262, .18, 40), chrome, [-1.15, 1.2, 0]);
  put(g, cyl(.24, .02), chrome, [-1.15, 1.3, 0]);
  put(g, cyl(.09, .07, 24), dark, [-1.15, 1.34, 0]);
  put(g, new THREE.BoxGeometry(.06, .035, .3), dark, [-1.15, 1.37, .1]);
  // Accessory shoe.
  put(g, new THREE.BoxGeometry(.56, .03, .46), satin, [-.25, 1.075, -.02]);
  put(g, new THREE.BoxGeometry(.44, .022, .4), dark, [-.25, 1.1, -.02]);
  [-1, 1].forEach((s) => put(g, new THREE.BoxGeometry(.06, .05, .46), chrome, [-.25 + s * .22, 1.11, -.02]));
  // Shutter-speed dial: knurled skirt, dark top with engraved scale, gold index.
  put(g, ribbed(.3, .285, .14, 48), chrome, [.42, 1.13, -.05]);
  put(g, cyl(.27, .03), dark, [.42, 1.215, -.05]);
  ticks(g, paint, 12, .19, 1.232, .07, .016, [0]);
  put(g, new THREE.ConeGeometry(.035, .07, 3), gold, [.42, 1.08, .29], [Math.PI / 2, 0, 0]);
  // Shutter button with collar + film advance lever.
  put(g, cyl(.19, .06), chrome, [1.06, 1.09, .08]);
  put(g, lathe([[0, 0], [.105, 0], [.105, .07], [.09, .1], [.05, .115], [0, .118]], 40), gold, [1.06, 1.12, .08], [-Math.PI / 2, 0, 0]);
  put(g, slabY(capsule2d(1.06, -.08, .2, .62, .42, .06), 1.12, 1.15, .006), satin);
  put(g, cyl(.065, .07, 24), black, [.6, 1.15, -.43]);
  // Back: viewfinder eyepiece and film counter.
  put(g, slabZ(rrect(.34, .22, .05, .74, .84), -.68, -.58, .015), black);
  put(g, slabZ(rrect(.24, .14, .03, .74, .84), -.69, -.675, 0), vf);
  put(g, cyl(.11, .03, 32), satin, [.98, 1.075, -.32]);
  put(g, cyl(.075, .006, 32), vf, [.98, 1.09, -.32]);
  // Strap lugs.
  [-1, 1].forEach((s) => {
    put(g, cyl(.08, .08, 24), satin, [s * 1.77, .82, 0], [0, 0, Math.PI / 2]);
    put(g, new THREE.TorusGeometry(.085, .022, 12, 28), chrome, [s * 1.86, .82, 0], [0, Math.PI / 2, 0]);
  });
  // Front: self-timer lamp, gold maker's badge.
  put(g, cyl(.07, .04, 24), amber, [1.02, .4, .555], [Math.PI / 2, 0, 0]);
  put(g, cyl(.09, .02, 24), satin, [1.02, .4, .54], [Math.PI / 2, 0, 0]);
  put(g, slabZ(rrect(.5, .1, .05, -1.0, .45), .54, .57, .006), gold);
  // Lens (centred at y = -.1): mount, aperture ring, knurled focus ring, DOF scale, front bezel, glass.
  const L = new THREE.Group(); L.position.set(0, -.1, 0); g.add(L);
  put(L, lathe([[.7, .54], [.7, .58], [.66, .6], [.62, .6]]), chrome);
  put(L, lathe([[.62, .6], [.62, .7], [.6, .71]]), chrome);
  put(L, ribbed(.615, .595, .1, 24), dark, [0, 0, .76], [Math.PI / 2, 0, 0]);
  ticksZ(L, paint, 9, .615, .76, .4);
  put(L, ribbed(.64, .615, .18, 60), black, [0, 0, .9], [Math.PI / 2, 0, 0]);
  put(L, lathe([[.6, .99], [.58, 1.0], [.57, 1.12], [.55, 1.13]]), chrome);
  ticksZ(L, dark, 7, .572, 1.06, .35);
  put(L, lathe([[.55, 1.13], [.55, 1.24], [.53, 1.25]]), dark);
  put(L, lathe([[.53, 1.25], [.53, 1.29], [.5, 1.31], [.44, 1.31], [.42, 1.29]]), chrome);
  lensCore(L, .42, 1.12, 1.29, { black, inner: glassIn, iris, irisEdge, ring });
  put(L, lathe(capPts(.42, .05, 1.255), 64), glass);
  // Focus tab under the knurled ring, aperture tab on the aperture ring, gold mount index dot.
  put(L, slabZ(capsule2d(0, -.62, .07, 0, -.74, .05), .86, .94, .01), satin);
  put(L, new THREE.BoxGeometry(.06, .05, .08), satin, [0, .63, .76]);
  put(L, cyl(.025, .02, 16), gold, [.5, .48, .59], [Math.PI / 2, 0, 0]);
  // Top-plate screws, frame-selector and rewind-release levers, flash sync sockets, tripod socket.
  [[-1.62, .22], [-1.62, -.22], [1.62, .22], [1.62, -.22]].forEach(([x, z]) => {
    put(g, cyl(.035, .012, 16), satin, [x, 1.066, z]);
    put(g, new THREE.BoxGeometry(.05, .006, .008), dark, [x, 1.073, z], [0, x * z > 0 ? .6 : -.6, 0]);
  });
  put(g, slabZ(capsule2d(.2, .8, .025, .32, .7, .02), .63, .66, .004), satin);
  put(g, slabZ(capsule2d(-1.3, .2, .04, -1.3, .02, .03), .555, .59, .006), satin);
  [-.62, -.3].forEach((x) => { put(g, cyl(.05, .05, 20), satin, [x, .82, -.62], [Math.PI / 2, 0, 0]); put(g, cyl(.025, .052, 12), dark, [x, .82, -.63], [Math.PI / 2, 0, 0]); });
  put(g, cyl(.09, .02, 24), satin, [0, -.87, -.1]); put(g, cyl(.04, .022, 16), dark, [0, -.875, -.1]);
  // Leather strap hanging behind, threaded through the lugs.
  const sp = [[-1.86, .82, 0], [-2.0, .56, -.06], [-2.04, .05, -.26], [-1.72, -.58, -.6], [-.95, -.96, -.95], [0, -1.04, -1.06]];
  const curve = new THREE.CatmullRomCurve3(sp.concat(sp.slice(0, -1).reverse().map(([x, y, z]) => [-x, y, z])).map((q) => new THREE.Vector3(...q)));
  const band = new THREE.Shape(); band.moveTo(-.025, -.09); band.lineTo(.025, -.09); band.lineTo(.025, .09); band.lineTo(-.025, .09); band.closePath();
  put(g, new THREE.ExtrudeGeometry(band, { steps: 120, bevelEnabled: false, extrudePath: curve }), strap);
  return bake(g, 'camera_vintage');
}
// Ticks around a ring on the lens barrel (axis Z), spread over `span` of the circumference (top-centred).
function ticksZ(g, mat, n, r, z, span) {
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - .5) * span * TAU;
    const m = put(g, new THREE.BoxGeometry(.012, .006, .05), mat, [Math.sin(a) * r, Math.cos(a) * r, z]);
    m.rotation.z = -a;
  }
}
// Radial ticks lying on a lens front face (axis Z) at height z.
function ticksFront(g, mat, n, r, z) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, m = put(g, new THREE.BoxGeometry(.004, i % 3 ? .02 : .035, .004), mat, [Math.sin(a) * r, Math.cos(a) * r, z]);
    m.rotation.z = -a;
  }
}
// Spherical-cap profile for lens glass: base radius r, bulge h, starting at z0.
function capPts(r, h, z0, n = 12) {
  const R = (r * r + h * h) / (2 * h), pts = [];
  for (let i = 0; i <= n; i++) { const rr = r * (1 - i / n); pts.push([rr, z0 + h - (R - Math.sqrt(R * R - rr * rr))]); }
  return pts;
}

// What you see through the tinted front glass: dark throat, an inner element and an 8-blade iris.
function lensCore(L, r, z0, z1, m) {
  put(L, lathe([[r, z1], [r, z0], [0, z0]], 48), m.black);
  put(L, lathe(capPts(r * .5, .025, z0 + .004), 40), m.inner);
  const plate = new THREE.Shape(); plate.absarc(0, 0, r * .97, 0, TAU);
  const hole = new THREE.Path(), rh = r * .34;
  for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU + .2; k ? hole.lineTo(Math.cos(a) * rh, Math.sin(a) * rh) : hole.moveTo(Math.cos(a) * rh, Math.sin(a) * rh); }
  plate.holes.push(hole);
  put(L, slabZ(plate, z0 + .03, z0 + .042, 0, 48), m.iris);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU + .2, len = r * .58, d = a + 1.95;
    const b = put(L, new THREE.BoxGeometry(len, .007, .008), m.irisEdge, [Math.cos(a) * rh + Math.cos(d) * len / 2, Math.sin(a) * rh + Math.sin(d) * len / 2, z0 + .046]);
    b.rotation.z = d;
  }
  // Two faint inner reflections floating behind the front glass.
  [[.78, .012], [.55, .008]].forEach(([k, w]) => put(L, new THREE.TorusGeometry(r * k, w, 6, 64), m.ring, [0, 0, z1 - .012]));
}
// Extrude a shape drawn in side elevation (-z, y) along +X from x0 to x1.
function slabX(shape, x0, x1, bevel, curve = 16) { const g = slabZ(shape, x0, x1, bevel, curve); g.rotateY(Math.PI / 2); return g; }

// ---------- Modern mirrorless camera ----------
function buildModern() {
  const g = new THREE.Group();
  const body = std('body', '#1c1a22', .55, .25);
  const rubber = std('grip', '#141218', .92, 0);
  const gun = std('gunmetal', '#3a3842', .35, .65);
  const silver = std('silver', '#d9d6e0', .25, .75);
  const gold = std('gold', '#f2b544', .28, .8, { emissive: '#5a3500', emissiveIntensity: .2 });
  const glass = phys('glass', '#202a6a', .02, .3, { emissive: '#2a3a9a', emissiveIntensity: .25, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .4 });
  const glassIn = phys('glass_inner', '#2d2470', .05, .9, { emissive: '#4a3cc0', emissiveIntensity: .5, clearcoat: 1 });
  const black = std('throat', '#09080d', .9, 0);
  const iris = std('iris', '#1d1b24', .35, .7), irisEdge = std('iris_edge', '#5c5872', .3, .8);
  const ring = std('lens_glint', '#8fa4ff', .2, .2, { emissive: '#4a6ae0', emissiveIntensity: .7 });
  const rec = std('rec', '#e0707f', .4, 0, { emissive: '#b8404f', emissiveIntensity: .4 });
  rubber.userData.uv = true;
  const lcd = phys('screen', '#0e0c18', .08, .2, { emissive: '#231d4a', emissiveIntensity: .45, clearcoat: 1 });
  const paint = std('print', '#faf6ff', .6, 0);
  const amber = std('lamp', '#e8930f', .4, 0, { emissive: '#e8930f', emissiveIntensity: .8 });
  // Main shell and the EVF hump.
  put(g, slabZ(rrect(2.9, 1.5, .2, 0, -.08), -.44, .44, .06), body);
  const hump = new THREE.Shape(); hump.moveTo(-.62, .6); hump.lineTo(.62, .6); hump.lineTo(.42, 1.18); hump.quadraticCurveTo(.4, 1.24, .34, 1.24); hump.lineTo(-.34, 1.24); hump.quadraticCurveTo(-.4, 1.24, -.42, 1.18); hump.closePath();
  put(g, slabZ(hump, -.42, .3, .06), body);
  put(g, slabZ(rrect(.38, .09, .04, 0, 1.0), .3, .34, .008), gold);
  // Hot shoe.
  put(g, new THREE.BoxGeometry(.5, .03, .46), gun, [0, 1.315, -.07]);
  [-1, 1].forEach((s) => put(g, new THREE.BoxGeometry(.05, .045, .46), silver, [s * .21, 1.34, -.07]));
  // Grip (viewer's left from the front), soft rubber block.
  put(g, slabY(rrect(.78, .66, .28, -1.08, -.54), -.86, .66, .12, 24), rubber);
  // Shutter button + power collar on the grip, rear command dial, mode dials.
  put(g, ribbed(.2, .185, .07, 36), gun, [-1.1, .7, .5]);
  put(g, lathe([[0, 0], [.12, 0], [.12, .05], [.1, .075], [0, .085]], 40), silver, [-1.1, .735, .5], [-Math.PI / 2, 0, 0]);
  put(g, ribbed(.17, .158, .1, 30), gun, [-.95, .68, -.2]);
  put(g, ribbed(.31, .295, .16, 54), gun, [.92, .74, -.05]);
  put(g, cyl(.27, .02), silver, [.92, .83, -.05]);
  ticks(g, paint, 10, .2, .842, .06, .016);
  put(g, new THREE.ConeGeometry(.03, .06, 3), gold, [.92, .7, .31], [Math.PI / 2, 0, 0]);
  put(g, ribbed(.2, .188, .12, 36), gun, [.42, .72, -.2]);
  put(g, cyl(.17, .015), silver, [.42, .785, -.2]);
  // Front: AF-assist lamp, lens release button.
  put(g, cyl(.055, .03, 24), amber, [.3, .98, .3], [Math.PI / 2, 0, 0]);
  put(g, cyl(.08, .04, 24), silver, [.86, -.55, .45], [Math.PI / 2, 0, 0]);
  // Back: screen with bezel, eyecup, buttons.
  put(g, slabZ(rrect(1.7, 1.06, .07, .3, -.14), -.47, -.44, .006), gun);
  put(g, slabZ(rrect(1.6, .96, .05, .3, -.14), -.475, -.465, 0), lcd);
  put(g, slabZ(rrect(.62, .38, .14, 0, .98), -.6, -.42, .04), rubber);
  put(g, slabZ(rrect(.4, .24, .07, 0, .98), -.605, -.595, 0), lcd);
  [[-1.0, .25], [-1.0, -.05], [-1.0, -.35], [-.74, .52]].forEach(([x, y]) => put(g, cyl(.065, .05, 24), gun, [x, y, -.47], [Math.PI / 2, 0, 0]));
  put(g, ribbed(.17, .16, .05, 30), gun, [-1.0, -.62, -.47], [Math.PI / 2, 0, 0]);
  // Strap lugs.
  [-1, 1].forEach((s) => put(g, new THREE.TorusGeometry(.08, .022, 12, 28), silver, [s * 1.52, .5, 0], [0, Math.PI / 2, 0]));
  // Lens (centred at y = -.1).
  const L = new THREE.Group(); L.position.set(0, -.1, 0); g.add(L);
  put(L, lathe([[.82, .44], [.82, .5], [.8, .52]]), silver);
  put(L, lathe([[.81, .52], [.81, .55]]), gold);
  put(L, lathe([[.77, .55], [.77, .66]]), body);
  put(L, ribbed(.79, .765, .34, 90), rubber, [0, 0, .83], [Math.PI / 2, 0, 0]);
  put(L, lathe([[.76, 1.0], [.76, 1.06]]), body);
  ticksZ(L, paint, 5, .762, 1.03, .18);
  put(L, ribbed(.765, .75, .18, 120), rubber, [0, 0, 1.15], [Math.PI / 2, 0, 0]);
  put(L, lathe([[.74, 1.24], [.76, 1.34], [.76, 1.39], [.72, 1.42], [.66, 1.42], [.64, 1.4]]), gun);
  put(L, lathe([[.64, 1.4], [.64, 1.38], [.58, 1.37], [.58, 1.36]], 64), body);
  ticksFront(L, paint, 36, .61, 1.383);
  lensCore(L, .58, 1.2, 1.36, { black, inner: glassIn, iris, irisEdge, ring });
  put(L, lathe(capPts(.58, .06, 1.335), 72), glass);
  // AF/MF switch block and distance window on the barrel.
  put(L, slabX(rrect(.2, .12, .03, -.6, 0), .74, .8, .01), body);
  put(L, new THREE.BoxGeometry(.035, .05, .06), silver, [.81, 0, .6]);
  put(L, slabZ(rrect(.24, .08, .03, 0, .755), .96, .99, 0), black);
  // Front: function buttons by the mount, front command dial in the grip.
  [[-.88, -.38], [-.88, -.62]].forEach(([x, y]) => put(g, cyl(.05, .04, 20), gun, [x, y, .45], [Math.PI / 2, 0, 0]));
  put(g, ribbed(.16, .148, .07, 30), gun, [-1.08, .46, .86]);
  // Top: microphone holes, red REC button; tilt-screen hinges on the back.
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) [-1, 1].forEach((sx) => put(g, cyl(.012, .01, 8), black, [sx * (.22 + i * .045), 1.302, .2 + j * .05]));
  put(g, cyl(.07, .04, 20), silver, [1.2, .745, .2]); put(g, cyl(.05, .03, 20), rec, [1.2, .77, .2]);
  [-.5, 1.1].forEach((x) => put(g, cyl(.035, .2, 12), gun, [x, .4, -.475], [0, 0, Math.PI / 2]));
  // Sides: rubber port covers (right), memory-card door (grip side).
  [[.18, .34], [-.32, .4]].forEach(([y, h]) => put(g, slabX(rrect(.42, h, .05, 0, y), 1.5, 1.53, .008), rubber));
  put(g, slabX(rrect(.46, .62, .06, -.55, -.18), -1.615, -1.59, .006), body);
  // Speaker grille on the back.
  for (let i = 0; i < 5; i++) put(g, cyl(.012, .01, 8), black, [1.25, -.62 + i * .045, -.474], [Math.PI / 2, 0, 0]);
  return bake(g, 'camera_modern');
}

async function exportGLB(obj, file) {
  const scene = new THREE.Scene(); scene.add(obj);
  const buf = await new GLTFExporter().parseAsync(scene, { binary: true });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(buf));
  let tris = 0; obj.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  console.log(file.padEnd(22), (buf.byteLength / 1024).toFixed(0).padStart(5), 'KB', String(Math.round(tris)).padStart(7), 'tris');
}

fs.mkdirSync(OUT, { recursive: true });
await exportGLB(buildCube(), 'cube.glb');
await exportGLB(buildBall(), 'dodgeball.glb');
await exportGLB(buildVintage(), 'camera-vintage.glb');
await exportGLB(buildModern(), 'camera-modern.glb');
