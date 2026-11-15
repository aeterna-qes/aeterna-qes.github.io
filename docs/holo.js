(function () {
  if (window.AeHolo) return;
  var VS = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  var FS = '#version 300 es\nprecision highp float;' +
    'uniform vec2 uSize;uniform float uAspect;uniform vec2 uTilt;uniform vec2 uLight;uniform float uDistance;uniform float uIntensity;uniform float uScale;uniform float uEdge;uniform float uFrame;uniform float uRadius;uniform float uGlare;uniform vec3 uFoil;uniform float uHolo;uniform vec4 uHole;' +
    'out vec4 outColor;const float TAU=6.28318530718;' +
    'struct Foil{float mask;float angle;float jitter;vec2 facet;};' +
    'float hash(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}' +
    'vec2 hash2(vec2 p){return vec2(hash(p),hash(p+17.31));}' +
    'vec3 hue(float t){t=abs(fract(t*0.5)*2.0-1.0);vec3 c=mix(vec3(0.1,0.25,1.0),vec3(0.0,0.85,1.0),smoothstep(0.0,0.25,t));c=mix(c,vec3(0.25,1.0,0.2),smoothstep(0.25,0.45,t));c=mix(c,vec3(1.0,0.92,0.05),smoothstep(0.45,0.65,t));c=mix(c,vec3(1.0,0.45,0.05),smoothstep(0.65,0.85,t));return mix(c,vec3(0.95,0.12,0.3),smoothstep(0.85,1.0,t));}' +
    'Foil stars(vec2 p){Foil best=Foil(0.0,0.0,0.0,vec2(0.0));vec2 g=p/(0.08/uScale);vec2 base=floor(g);' +
    'for(int j=-1;j<=1;j++){for(int i=-1;i<=1;i++){vec2 id=base+vec2(float(i),float(j));float pick=hash(id+1.3);vec2 d=g-(id+0.5+(hash2(id)-0.5)*0.55);float m=smoothstep(0.07,0.035,length(d));' +
    'if(pick<0.62){float size=mix(0.16,0.5,pow(hash(id+9.0),1.8));float sector=TAU/(pick<0.3?4.0:5.0);float k=abs(fract((atan(d.y,d.x)+hash(id+4.0)*TAU)/sector)-0.5)*2.0;float edge=size*mix(1.0,0.36,pow(k,0.6));m=smoothstep(edge,edge*0.8,length(d));}' +
    'if(m>best.mask)best=Foil(m,hash(id+6.0)*TAU,hash(id+8.0),(hash2(id+2.0)-0.5)*0.6);}}return best;}' +
    'vec3 sparkles(vec2 p,vec3 hw,vec2 sweep,float awake){vec2 g=p*62.0;vec2 cell=floor(g);vec2 d=fract(g)-0.5-(hash2(cell)-0.5)*0.36;float spin=hash(cell+3.0)*TAU;d=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*d;vec2 a=abs(d);' +
    'float hex=max(a.x*0.866+a.y*0.5,a.y);float size=mix(0.22,0.38,hash(cell+2.0));float piece=smoothstep(size,size-0.07,hex)*step(0.42,hash(cell+4.0));vec3 facet=normalize(vec3((hash2(cell+6.0)-0.5)*0.9,1.0));float flash=pow(max(dot(facet,hw),0.0),6.0);' +
    'vec3 tint=hue(dot(sweep,vec2(cos(spin),sin(spin)))*1.2+dot(sweep,vec2(0.8,0.6))*0.8+hash(cell+8.0)*0.5);vec3 color=piece*tint*(0.3+1.6*flash)*awake;' +
    'vec2 fine=p*210.0;vec2 sc=floor(fine);float speck=smoothstep(0.24,0.0,length(fract(fine)-0.5-(hash2(sc)-0.5)*0.5))*step(0.72,hash(sc+1.0));float sf=pow(max(dot(normalize(vec3((hash2(sc+2.0)-0.5)*0.9,1.0)),hw),0.0),10.0);return color+vec3(1.2)*speck*sf*(1.0-piece);}' +
    'void main(){vec2 uv=vec2(gl_FragCoord.x/uSize.x,1.0-gl_FragCoord.y/uSize.y);vec2 p=vec2(uv.x,uv.y*uAspect);vec2 center=vec2(0.5,0.5*uAspect);vec2 q=abs(p-center)-center+uRadius;' +
    'float outside=length(max(q,0.0))+min(max(q.x,q.y),0.0)-uRadius;float pixel=1.0/uSize.x;float cov=clamp(0.5-outside/pixel,0.0,1.0);if(cov<=0.0){outColor=vec4(0.0);return;}' +
    'mat3 rx=mat3(1.0,0.0,0.0,0.0,cos(uTilt.x),sin(uTilt.x),0.0,-sin(uTilt.x),cos(uTilt.x));mat3 ry=mat3(cos(uTilt.y),0.0,-sin(uTilt.y),0.0,1.0,0.0,sin(uTilt.y),0.0,cos(uTilt.y));mat3 turn=rx*ry;' +
    'vec3 world=turn*vec3(p-center,0.0);vec3 view=normalize(transpose(turn)*(vec3(0.0,0.0,uDistance)-world));vec3 lamp=vec3((uLight-0.5)*vec2(1.1,1.1*uAspect),0.9);vec3 light=normalize(transpose(turn)*(lamp-world));' +
    'vec3 hw=normalize(light+view);vec2 sweep=light.xy+view.xy;float sheen=pow(max(hw.z,0.0),10.0);float shine=pow(max(hw.z,0.0),80.0);float frame=1.0-smoothstep(uFrame-pixel,uFrame+pixel,-outside);' +
    'Foil f=stars(p);vec2 dir=vec2(cos(f.angle),sin(f.angle));float phase=dot(sweep,dir)*0.6+dot(sweep,vec2(0.8,0.6))*1.4+f.jitter*0.3;vec3 tint=hue(phase);' +
    'float glint=pow(max(dot(normalize(vec3(f.facet,1.0)),hw),0.0),24.0)*step(0.001,length(f.facet));vec3 foil=mix(tint,vec3(1.0),0.12)*(1.15+0.3*sheen)+uFoil*glint*1.2;' +
    'float tilted=smoothstep(0.02,0.21,length(sin(uTilt)));float awake=mix(0.25,1.0,tilted);' +
    // Foil only on unlocked cards (uHolo), and never over the photo (uHole, in uv).
    'float hole=step(uHole.x,uv.x)*step(uv.x,uHole.z)*step(uHole.y,uv.y)*step(uv.y,uHole.w);float holo=uHolo*(1.0-hole);' +
    'float a1=holo*f.mask*uIntensity*mix(0.2,0.6,tilted);' +
    'vec3 c2=hue(dot(sweep,vec2(0.7,0.7))*0.9+uv.y*0.8+uv.x*0.4);float a2=holo*(0.07+0.13*tilted)*(0.6+0.4*sheen);' +
    'vec3 rgb=foil*a1+c2*a2*(1.0-a1);float a=a1+a2*(1.0-a1);' +
    'vec3 add=uFoil*sheen*0.12*frame+vec3(sheen*0.07+shine*0.3)*uGlare;' +
    'rgb+=add;a=clamp(max(a,max(max(rgb.r,rgb.g),rgb.b)),0.0,1.0);vec3 col=a>0.001?pow(clamp(rgb/a,0.0,1.0),vec3(1.0/2.2))*a:vec3(0.0);' +
    'outColor=vec4(col*cov,a*cov);}';

  var S = { intensity: .85, scale: 1, edge: .8, frame: .04, glare: .5, foil: [0xe2, 0xe6, 0xec].map(function (c) { return Math.pow(c / 255, 2.2); }), tiltMax: 12, hoverScale: 1.03 };
  var PERSPECTIVE = 1100;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl, cv, P, ok = null, cards = [], raf = 0, last = 0;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function unlocked() { try { if (localStorage.getItem('ae-holo-charis') === '1') return true; var v = JSON.parse(localStorage.getItem('aepc-chairs') || 'null'); return !!(v && v.u); } catch (e) { return false; } }
  function init() {
    if (ok !== null) return ok;
    cv = document.createElement('canvas'); cv.width = cv.height = 2;
    gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return (ok = false);
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS); if (!v || !f) return (ok = false);
    var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'position'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return (ok = false);
    var u = {}; ['uSize', 'uAspect', 'uTilt', 'uLight', 'uDistance', 'uIntensity', 'uScale', 'uEdge', 'uFrame', 'uRadius', 'uGlare', 'uFoil', 'uHolo', 'uHole'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    P = { p: p, u: u };
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return (ok = true);
  }
  function draw(c) {
    if (!c.w || !c.h || c.open) return;
    var bw = c.canvas.width, bh = c.canvas.height;
    if (cv.width < bw || cv.height < bh) { cv.width = Math.max(cv.width, bw); cv.height = Math.max(cv.height, bh); }
    gl.viewport(0, 0, bw, bh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P.p); var u = P.u;
    gl.uniform2f(u.uSize, bw, bh); gl.uniform1f(u.uAspect, bh / bw);
    gl.uniform2f(u.uTilt, c.s.tx * Math.PI / 180, c.s.ty * Math.PI / 180);
    gl.uniform2f(u.uLight, c.s.lx, c.s.ly);
    gl.uniform1f(u.uDistance, PERSPECTIVE / Math.max(1, c.w));
    gl.uniform1f(u.uIntensity, S.intensity); gl.uniform1f(u.uScale, S.scale); gl.uniform1f(u.uEdge, S.edge); gl.uniform1f(u.uFrame, S.frame);
    gl.uniform1f(u.uRadius, c.r / Math.max(1, c.w)); gl.uniform1f(u.uGlare, S.glare); gl.uniform3f(u.uFoil, S.foil[0], S.foil[1], S.foil[2]);
    gl.uniform1f(u.uHolo, c.holo ? 1 : 0); gl.uniform4f(u.uHole, c.hole[0], c.hole[1], c.hole[2], c.hole[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    c.ctx.clearRect(0, 0, bw, bh);
    c.ctx.drawImage(cv, 0, cv.height - bh, bw, bh, 0, 0, bw, bh);
  }
  function spring(v, vel, t, k, d, dt) { var n = vel + ((t - v) * k - vel * d) * dt; return [v + n * dt, n]; }
  function tick(c, dt) {
    var s = c.s, tx = 0, ty = 0, lx = .36, ly = .26, lift = 1, pt = c.ptr;
    if (pt.inside && !reduce && !c.open) { tx = (.5 - pt.y) * 2 * S.tiltMax; ty = (pt.x - .5) * 2 * S.tiltMax; lx = pt.x; ly = pt.y; lift = S.hoverScale; }
    var st = Math.ceil(dt / (1 / 240)), h = dt / st, r;
    for (var i = 0; i < st; i++) {
      r = spring(s.tx, s.vx, tx, 150, 16, h); s.tx = r[0]; s.vx = r[1];
      r = spring(s.ty, s.vy, ty, 150, 16, h); s.ty = r[0]; s.vy = r[1];
      r = spring(s.lx, s.lvx, lx, 220, 30, h); s.lx = r[0]; s.lvx = r[1];
      r = spring(s.ly, s.lvy, ly, 220, 30, h); s.ly = r[0]; s.lvy = r[1];
      r = spring(s.lift, s.liftV, lift, 320, 30, h); s.lift = r[0]; s.liftV = r[1];
    }
    if (c.open) c.el.style.transform = '';
    else {
      var rest = Math.abs(s.tx) < .01 && Math.abs(s.ty) < .01 && Math.abs(s.lift - 1) < .0005;
      c.el.style.transform = rest ? '' : 'perspective(' + PERSPECTIVE + 'px) scale(' + s.lift.toFixed(4) + ') rotateX(' + s.tx.toFixed(3) + 'deg) rotateY(' + s.ty.toFixed(3) + 'deg)';
    }
    draw(c);
    var motion = Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.liftV) * 40 + (Math.abs(s.lvx) + Math.abs(s.lvy)) * 60 + Math.abs(s.tx - tx) + Math.abs(s.ty - ty);
    c.calm = motion > .02 ? 0 : c.calm + dt;
    return pt.inside || c.calm <= .3;
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000)); last = now; var any = false;
    cards.forEach(function (c) { if (!c.active) return; if (tick(c, dt)) any = true; else c.active = false; });
    if (any) raf = requestAnimationFrame(frame);
  }
  function wake(c) { c.active = true; c.calm = 0; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function measure(c) {
    var cs = getComputedStyle(c.el);
    c.open = cs.position === 'fixed';
    c.canvas.style.display = c.open ? 'none' : 'block';
    c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; c.r = parseFloat(cs.borderTopLeftRadius) || 16;
    // Charis's card turns holographic once the island chair hunt is complete (saved by photo3d.js).
    c.holo = c.el.closest('.mem-1') ? unlocked() : false; c.hole = [2, 2, 2, 2];
    var ph = c.holo && c.el.querySelector('.mem-photo');
    if (ph && ph.offsetParent === c.el && c.w && c.h) c.hole = [ph.offsetLeft / c.w, ph.offsetTop / c.h, (ph.offsetLeft + ph.offsetWidth) / c.w, (ph.offsetTop + ph.offsetHeight) / c.h];
    var d = Math.min(window.devicePixelRatio || 1, 2), bw = Math.max(1, Math.round(c.w * d)), bh = Math.max(1, Math.round(c.h * d));
    if (c.canvas.width !== bw || c.canvas.height !== bh) { c.canvas.width = bw; c.canvas.height = bh; }
  }
  function attach(el) {
    el.setAttribute('data-hc', '');
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;border-radius:inherit;z-index:3';
    el.appendChild(canvas);
    var c = { el: el, canvas: canvas, ctx: canvas.getContext('2d'), ptr: { x: .5, y: .5, inside: false }, s: { tx: 0, ty: 0, vx: 0, vy: 0, lx: .36, ly: .26, lvx: 0, lvy: 0, lift: 1, liftV: 0 }, calm: 0, active: false };
    function track(e) {
      if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.buttons) return;
      var r = el.getBoundingClientRect(); if (!r.width) return;
      c.ptr = { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), inside: true };
      wake(c);
    }
    function leave() { c.ptr.inside = false; wake(c); }
    c.on = { pointerenter: track, pointermove: track, pointerdown: track, pointerleave: leave, pointercancel: leave, pointerup: function (e) { if (e.pointerType !== 'mouse') leave(); } };
    Object.keys(c.on).forEach(function (k) { el.addEventListener(k, c.on[k]); });
    c.ro = new ResizeObserver(function () {
      var was = c.open; measure(c);
      if (c.open && !was) { c.ptr.inside = false; c.s.tx = c.s.ty = c.s.vx = c.s.vy = 0; c.s.lift = 1; c.s.liftV = 0; el.style.transform = ''; }
      draw(c);
    });
    c.ro.observe(el);
    measure(c); draw(c);
    cards.push(c);
  }
  function detach(c) { Object.keys(c.on).forEach(function (k) { c.el.removeEventListener(k, c.on[k]); }); c.ro.disconnect(); }
  function scan() {
    if (!init()) return;
    cards = cards.filter(function (c) { if (c.el.isConnected && c.canvas.isConnected) return true; detach(c); if (c.el.isConnected) { c.el.removeAttribute('data-hc'); c.el.style.transform = ''; } return false; });
    [].forEach.call(document.querySelectorAll('.mem-card:not([data-hc])'), attach);
  }
  var t = 0;
  function queue() { if (!t) t = setTimeout(function () { t = 0; scan(); }, 120); }
  window.AeHolo = scan;
  function refresh() { cards.forEach(function (c) { measure(c); draw(c); }); }
  window.addEventListener('storage', function (e) { if (e.key === 'aepc-chairs') refresh(); });
  window.addEventListener('ae-chairs', refresh);
  function boot() { scan(); new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
