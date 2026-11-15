(function () {
  if (window.AeFlexRow) return;
  function wrap(v, s) { return ((((v + s / 2) % s) + s) % s) - s / 2; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function quint(v) { return 1 - Math.pow(1 - c01(v), 5); }
  function inout(v) { var t = c01(v); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function legacy(root) {
    var cards = [].slice.call(root.querySelectorAll('[data-fc-card]')), n = cards.length;
    if (!n) return function () {};
    var host = root.parentElement || root;
    var cnt = host.querySelector('[data-fc-count]'), prevB = host.querySelector('[data-fc-prev]'), nextB = host.querySelector('[data-fc-next]');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 300, H = 400, S = 320, L = S * n, width = 1, pos = 0, vel = 0, goal = 0, raf = 0, last = 0, energy = 0, lastPos = 0, active = -1, alive = true, vis = true;
    var introT = reduce ? 1 : 0, introOn = reduce, wheelT = 0;
    var p = { down: false, drag: false, id: -1, sx: 0, sy: 0, sp: 0, touch: false, samples: [], moved: false };
    function measure() {
      var oldS = S;
      W = cards[0].offsetWidth || 300; H = cards[0].offsetHeight || 400;
      S = W + Math.max(14, Math.min(26, W * .07)); L = S * n;
      root.style.maxWidth = Math.max(W, L - S) + 'px';
      width = root.clientWidth || 1;
      if (oldS !== S) { pos = pos / oldS * S; goal = Math.round(goal / oldS) * S; }
    }
    function nearest(at) { return ((Math.round(at / S) % n) + n) % n; }
    function snap(at) { return Math.round(at / S) * S; }
    function setActive(i) {
      if (i === active) return; active = i;
      cards.forEach(function (c, j) { c.setAttribute('aria-current', j === i ? 'true' : 'false'); c.tabIndex = j === i ? 0 : -1; });
      if (cnt) cnt.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    }
    function frame(now) {
      raf = 0; if (!alive) return;
      var dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
      var anim = false;
      if (introOn && introT < 1) { introT = Math.min(1, introT + dt / 1.9); anim = true; }
      if (!p.drag) {
        var k = 55, c = 2 * Math.sqrt(k), st = Math.ceil(dt * 240), h = dt / st;
        for (var q = 0; q < st; q++) { vel += (k * (goal - pos) - c * vel) * h; pos += vel * h; }
        if (Math.abs(goal - pos) < .05 && Math.abs(vel) < .5) { pos = goal; vel = 0; } else anim = true;
      } else anim = true;
      var travel = Math.abs(pos - lastPos) / dt; lastPos = pos;
      var et = reduce ? 0 : Math.min(travel / 2600, 1);
      energy += (et - energy) * (1 - Math.exp(-dt / (et > energy ? .07 : .35)));
      if (energy > .001) anim = true;
      setActive(nearest(pos));
      var lens = W * .5, reach = Math.max(W * .95, width * .2), B = Math.min(H * .2, width * .075);
      var strength = introOn ? inout((introT - .3) / .65) : 0, shrink = 1 - .2 * energy, half = width / 2;
      for (var i = 0; i < n; i++) {
        var rel = wrap(i * S - pos, L), a = Math.abs(rel), sg = rel < 0 ? -1 : 1;
        var t = c01((a - lens) / reach), ramp = t * t * t * (t * (t * 6 - 15) + 10), dr = 30 * t * t * (1 - t) * (1 - t);
        var y = -sg * ramp * B * strength, rot = -Math.atan(B * dr / reach) * 57.3 * strength, sl = dr / 1.875 * strength;
        var sc = shrink, al = 1, iy = 0;
        if (introT < 1) {
          var loc = c01((introT - Math.min(a / (width * .6), 1) * .34) / .6);
          al = c01(loc * 4); iy = (1 - quint(loc)) * H * .9; sc *= .55 + .45 * inout((loc - .18) / .82);
        }
        var f = (sl * 7).toFixed(1), el = cards[i];
        el.style.transform = 'translate(-50%,-50%) translate3d(' + rel.toFixed(1) + 'px,' + (y + iy).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
        el.style.opacity = al;
        el.style.zIndex = 100 - Math.round(a / 10);
        el.style.visibility = a - W / 2 > half + 20 ? 'hidden' : 'visible';
        el.style.boxShadow = (-f) + 'px 0 0 rgba(255,80,150,.32),' + f + 'px 0 0 rgba(80,170,255,.32),0 0 0 1.5px rgba(251,199,90,' + (i === active ? '.7' : '.25') + '),0 18px 40px rgba(58,43,98,.28)';
      }
      if (vis && (anim || p.down)) raf = requestAnimationFrame(frame);
    }
    function start() { if (raf || !alive) return; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stepBy(d) { goal = snap(goal) + d * S; start(); }
    function goTo(i) { goal = goal + wrap(i * S - goal, L); start(); }
    function skip() { if (introOn) introT = 1; }
    function down(e) {
      if (e.button > 0) return; skip();
      p.down = true; p.id = e.pointerId; p.touch = e.pointerType === 'touch'; p.sx = e.clientX; p.sy = e.clientY; p.sp = pos; p.drag = false; p.moved = false;
      p.samples = [{ x: e.clientX, t: performance.now() }];
      if (Math.abs(vel) > 40) { goal = pos; vel = 0; }
      start();
    }
    function move(e) {
      if (!p.down || e.pointerId !== p.id) return;
      var dx = e.clientX - p.sx, dy = e.clientY - p.sy, slop = p.touch ? 10 : 5;
      if (!p.drag) {
        if (p.touch && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) { p.down = false; return; }
        if (Math.abs(dx) > slop) { p.drag = true; p.moved = true; p.sx = e.clientX; p.sp = pos; try { root.setPointerCapture(e.pointerId); } catch (x) {} root.style.cursor = 'grabbing'; }
      }
      if (p.drag) {
        pos = p.sp - (e.clientX - p.sx); goal = pos; vel = 0;
        var now = performance.now(); p.samples.push({ x: e.clientX, t: now });
        while (p.samples.length > 2 && now - p.samples[0].t > 100) p.samples.shift();
      }
      start();
    }
    function up(e) {
      if (!p.down || e.pointerId !== p.id) return;
      p.down = false; root.style.cursor = '';
      if (!p.drag) return;
      p.drag = false;
      var now = performance.now(), a = p.samples[0], b = p.samples[p.samples.length - 1], v = 0;
      if (a && b && b.t > a.t && now - b.t < 70) v = -((b.x - a.x) / (b.t - a.t)) * 1000;
      vel = v;
      var land = snap(pos + v * .32);
      if (Math.abs(v) > 400 && Math.abs(land - snap(pos)) < 1) land += (v > 0 ? 1 : -1) * S;
      goal = land; start();
    }
    function cancel() { p.down = false; p.drag = false; root.style.cursor = ''; goal = snap(pos); start(); }
    function click(e) {
      var card = e.target.closest && e.target.closest('[data-fc-card]');
      if (!card || !root.contains(card)) return;
      if (p.moved) { p.moved = false; e.stopPropagation(); e.preventDefault(); return; }
      var i = cards.indexOf(card);
      if (i !== active || Math.abs(goal - pos) > 2) { e.stopPropagation(); e.preventDefault(); goTo(i); }
    }
    function wheel(e) {
      var dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) { dx = dy; dy = 0; }
      if (Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault(); skip();
      goal += Math.max(-120, Math.min(120, dx * (e.deltaMode === 1 ? 16 : 1))) * 1.25;
      clearTimeout(wheelT); wheelT = setTimeout(function () { goal = snap(goal); start(); }, 150);
      start();
    }
    function key(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); skip(); stepBy(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(); stepBy(-1); }
    }
    var onPrev = function () { skip(); stepBy(-1); }, onNext = function () { skip(); stepBy(1); };
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', cancel);
    root.addEventListener('click', click, true);
    root.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('keydown', key);
    if (prevB) prevB.addEventListener('click', onPrev);
    if (nextB) nextB.addEventListener('click', onNext);
    cards.forEach(function (c) { c.addEventListener('dragstart', function (e) { e.preventDefault(); }); });
    var onRedraw = function (e) { if (!ready) return; var c = e.target.closest && e.target.closest('[data-fc-card]'), i = cards.indexOf(c); if (i >= 0) { drawCard(i); start(); } };
    root.addEventListener('fc-redraw', onRedraw);
    var ro = new ResizeObserver(function () { measure(); start(); }); ro.observe(root);
    var io = new IntersectionObserver(function (en) {
      vis = en[0].isIntersecting;
      if (vis && !introOn) { introOn = true; introT = 0; }
      start();
    }, { threshold: .25 });
    io.observe(root);
    measure(); start();
    return function () {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); clearTimeout(wheelT);
      root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', cancel); root.removeEventListener('click', click, true); root.removeEventListener('wheel', wheel); root.removeEventListener('keydown', key);
      if (prevB) prevB.removeEventListener('click', onPrev);
      if (nextB) nextB.removeEventListener('click', onNext);
    };
  }
  var LENS_FS = '#version 300 es\nprecision highp float;uniform sampler2D tScene;uniform vec2 uResolution;uniform float uDpr;uniform vec2 uCenter;uniform vec2 uHalf;uniform float uAngle;uniform float uExponent;uniform float uInner;uniform float uOuter;uniform float uFlow;uniform float uCurl;uniform float uDispersion;uniform float uStrength;uniform float uSceneAlpha;out vec4 fragColor;' +
    'void main(){vec2 frag=gl_FragCoord.xy/uDpr;vec2 uv=frag/uResolution;vec2 rel=frag-vec2(uCenter.x,uResolution.y-uCenter.y);float ca=cos(uAngle);float sa=sin(uAngle);' +
    'vec2 local=vec2(ca*rel.x+sa*rel.y,-sa*rel.x+ca*rel.y);vec2 k=max(abs(local)/uHalf,vec2(1e-5));float nd=pow(pow(k.x,uExponent)+pow(k.y,uExponent),1.0/uExponent);' +
    'vec2 grad=pow(k,vec2(uExponent-1.0))*sign(local)/uHalf*pow(nd,1.0-uExponent);float glen=max(length(grad),1e-6);float edge=(nd-1.0)/glen;vec2 outward=grad/glen;' +
    'vec2 normal=vec2(ca*outward.x-sa*outward.y,sa*outward.x+ca*outward.y);vec2 along=vec2(-normal.y,normal.x);' +
    'float t=clamp((edge+uInner)/(uInner+uOuter),0.0,1.0);float ramp=t*t*t*(t*(t*6.0-15.0)+10.0);float slope=16.0*t*t*(1.0-t)*(1.0-t);' +
    'float reachX=rel.x/(uResolution.x*0.5);float side=smoothstep(0.02,0.3,abs(reachX))*(uCurl==0.0?sign(reachX):uCurl);float lift=ramp*side*uFlow*uStrength;' +
    'vec2 swirl=along*along.y*side*slope*uFlow*uStrength*0.35;vec2 drift=vec2(0.0,-lift)-swirl;vec2 shifted=uv+drift/uResolution;' +
    'vec2 texels=uResolution*uDpr;vec2 gx=dFdx(shifted);vec2 gy=dFdy(shifted);gx*=min(1.0,3.0/max(length(gx*texels),1e-4));gy*=min(1.0,3.0/max(length(gy*texels),1e-4));' +
    'vec4 color=textureGrad(tScene,shifted,gx,gy);vec2 spread=vec2(0.0,side*slope*uFlow*uStrength)/uResolution*uDispersion;float spreadPx=length(spread*texels);' +
    'if(color.a>0.002&&spreadPx>0.25){vec3 base=color.rgb/color.a;vec3 sumColor=vec3(0.0);vec3 sumWeight=vec3(0.0);' +
    'for(int i=0;i<12;i++){float s=(float(i)+0.5)/12.0;vec4 c=textureGrad(tScene,shifted+spread*(s-0.5),gx,gy);vec3 w=max(1.0-abs(vec3(s)-vec3(0.15,0.5,0.85))*2.6,0.0)*c.a;sumColor+=c.rgb*(w/max(c.a,0.002));sumWeight+=w;}' +
    'vec3 split=mix(base,sumColor/max(sumWeight,vec3(1e-4)),clamp(sumWeight*2.0,0.0,1.0));color.rgb=mix(color.rgb,clamp(split,0.0,1.0)*color.a,smoothstep(0.25,1.5,spreadPx));}' +
    'fragColor=color*uSceneAlpha;}';
  var CARD_VS = '#version 300 es\nin vec2 aPos;uniform vec4 uRect;uniform vec2 uRes;out vec2 vL;void main(){vL=aPos;vec2 px=uRect.xy+(aPos-.5)*uRect.zw;gl_Position=vec4(px.x/uRes.x*2.-1.,1.-px.y/uRes.y*2.,0.,1.);}';
  var CARD_FS = '#version 300 es\nprecision highp float;uniform sampler2D tMap;uniform vec2 uSize;uniform vec2 uBox;uniform float uRadius;uniform float uAlpha;uniform float uDpr;in vec2 vL;out vec4 o;' +
    'float rb(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}' +
    'void main(){vec2 p=(vL-.5)*uBox;float m=clamp(.5-rb(p,uSize*.5,uRadius)*uDpr,0.,1.)*uAlpha;o=texture(tMap,p/uSize+.5)*m;}';
  var LENS_VS = '#version 300 es\nin vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}';
  var BEND = .24, TILT = 62 * Math.PI / 180, REACH = .38, DISP = .45, RADIUS = 20, PIXEL_BUDGET = 4.5e6;
  function cssGrad(ctx, w, h, deg, cols) {
    var a = deg * Math.PI / 180, vx = Math.sin(a), vy = -Math.cos(a), len = Math.abs(w * vx) + Math.abs(h * vy);
    var g = ctx.createLinearGradient(w / 2 - vx * len / 2, h / 2 - vy * len / 2, w / 2 + vx * len / 2, h / 2 + vy * len / 2);
    cols.forEach(function (c, i) { g.addColorStop(cols.length === 1 ? 0 : i === 1 && cols.length === 3 ? .6 : i / (cols.length - 1), c.trim()); });
    return g;
  }
  function wrapLines(ctx, txt, maxW) {
    var toks = txt.match(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]|[^\s\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]+|\s+/g) || [], lines = [], cur = '';
    toks.forEach(function (t) {
      var test = cur + t;
      if (cur && !/^\s+$/.test(t) && ctx.measureText(test).width > maxW) { lines.push(cur.trim()); cur = t; } else cur = test;
    });
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }
  function drawCube(ctx, x, y, w, h) {
    var E = Math.min(w, h) * .4, cx = x + w / 2, cy = y + h / 2 + E * .05;
    var a = [.866 * E, .5 * E], b = [-.866 * E, .5 * E], d = [0, E], T = [cx, cy - E];
    var faces = [[T, a, b, '#faf6ff', 0], [[T[0] + b[0], T[1] + b[1]], a, d, '#7a8be8', .08], [[cx, cy], [-b[0], -b[1]], d, '#e0707f', .2]];
    ctx.save(); ctx.shadowColor = 'rgba(30,20,60,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 16;
    ctx.fillStyle = '#2e2352'; ctx.beginPath();
    ctx.moveTo(T[0], T[1]); ctx.lineTo(T[0] + a[0], T[1] + a[1]); ctx.lineTo(T[0] + a[0], T[1] + a[1] + E); ctx.lineTo(cx, cy + E); ctx.lineTo(T[0] + b[0], T[1] + b[1] + E); ctx.lineTo(T[0] + b[0], T[1] + b[1]); ctx.closePath(); ctx.fill();
    ctx.restore();
    var g = .09;
    faces.forEach(function (f) {
      var O = f[0], e1 = f[1], e2 = f[2];
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
        var u0 = (i + g) / 3, u1 = (i + 1 - g) / 3, v0 = (j + g) / 3, v1 = (j + 1 - g) / 3;
        var P = function (u, v) { return [O[0] + e1[0] * u + e2[0] * v, O[1] + e1[1] * u + e2[1] * v]; };
        var p = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var q = 1; q < 4; q++) ctx.lineTo(p[q][0], p[q][1]); ctx.closePath();
        ctx.fillStyle = f[3]; ctx.fill();
        if (f[4]) { ctx.fillStyle = 'rgba(20,10,40,' + f[4] + ')'; ctx.fill(); }
      }
    });
  }
  window.AeFlexRow = function (root) {
    var cv = document.createElement('canvas');
    var gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return legacy(root);
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function prog(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); } return { p: p, u: u }; }
    var cardP, lensP;
    try { cardP = prog(CARD_VS, CARD_FS); lensP = prog(LENS_VS, LENS_FS); } catch (err) { console.warn(err); return legacy(root); }
    function vao(data) { var v = gl.createVertexArray(); gl.bindVertexArray(v); var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return v; }
    var quad = vao([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), tri = vao([-1, -1, 3, -1, -1, 3]);
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    var sTex = gl.createTexture(), fbo = gl.createFramebuffer();
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    root.insertBefore(cv, root.firstChild);

    var cards = [].slice.call(root.querySelectorAll('[data-fc-card]')), n = cards.length;
    var host = root.parentElement || root;
    var cnt = host.querySelector('[data-fc-count]'), prevB = host.querySelector('[data-fc-prev]'), nextB = host.querySelector('[data-fc-next]');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var models = cards.map(function (c) { return c.querySelector('ae-photo-cam, ae-cube, ae-ball'); });
    var texs = cards.map(function () { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 63, 150, 255])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); return t; });
    var posters = cards.map(function () { return null; }), ready = false;
    var width = 1, height = 1, dpr = 1, bw = 2, bh = 2, W = 300, H = 400, S = 320, L = S * n;
    var pos = 0, vel = 0, goal = 0, raf = 0, last = 0, energy = 0, lastPos = 0, active = -1, alive = true, vis = true, dirty = true;
    var introT = 0, introOn = false, wheelT = 0, settleT = 0, overlay = -1, instances = [], sig = '';
    var p = { down: false, drag: false, id: -1, sx: 0, sy: 0, sp: 0, touch: false, samples: [], moved: false };
    cards.forEach(function (c) { c.style.opacity = '0'; c.style.pointerEvents = 'none'; c.style.transform = 'translate(-50%,-50%)'; c.style.boxShadow = 'none'; });
    models.forEach(function (m) { if (m) m.paused = true; });

    function drawCard(i) {
      var el = cards[i], rc = el.getBoundingClientRect(), w = rc.width, h = rc.height; if (!w || !h) return;
      var td = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
      c.width = Math.round(w * td); c.height = Math.round(h * td);
      var x = c.getContext('2d'); x.scale(td, td);
      x.fillStyle = cssGrad(x, w, h, 160, (el.getAttribute('data-fc-bg') || '#3a2b62,#5a3f96,#7a55bf').split(',')); x.fillRect(0, 0, w, h);
      var gEl = el.querySelector('[data-fc-glow]');
      if (gEl) { var gr = gEl.getBoundingClientRect(); x.save(); x.translate(gr.left - rc.left + gr.width / 2, gr.top - rc.top + gr.height / 2); x.scale(gr.width / 2, gr.height / 2); var rg = x.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, gEl.getAttribute('data-fc-glow')); rg.addColorStop(.66, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(-1, -1, 2, 2); x.restore(); }
      var tp = el.querySelector('[data-fc-text]');
      if (tp) { var tr = tp.getBoundingClientRect(); x.fillStyle = getComputedStyle(tp).backgroundColor; x.fillRect(tr.left - rc.left, tr.top - rc.top, tr.width, tr.height); }
      var m = models[i];
      if (m) {
        var mr = m.getBoundingClientRect(), mx = mr.left - rc.left, my = mr.top - rc.top;
        if (!posters[i] && m.tagName === 'AE-CUBE') drawCube(x, mx, my, mr.width, mr.height);
        else if (posters[i]) { x.save(); x.shadowColor = 'rgba(30,20,60,.35)'; x.shadowBlur = 18; x.shadowOffsetY = 16; x.drawImage(posters[i], mx, my, mr.width, mr.height); x.restore(); }
      }
      [].forEach.call(el.querySelectorAll('[data-fc-canvas]'), function (k) {
        var kr = k.getBoundingClientRect(); if (!kr.width || !k.width) return;
        x.save(); var ks = k.getAttribute('data-fc-shadow'); if (ks) { x.shadowColor = ks; x.shadowBlur = 22; }
        x.drawImage(k, kr.left - rc.left, kr.top - rc.top, kr.width, kr.height); x.restore();
      });
      [].forEach.call(el.querySelectorAll('[data-fc-draw]'), function (t) {
        var cs = getComputedStyle(t), r = t.getBoundingClientRect(), txt = (t.innerText || '').trim(); if (!txt || !r.width) return;
        if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
        x.save();
        x.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; x.fillStyle = cs.color; x.textBaseline = 'middle';
        if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        var ts = cs.textShadow && cs.textShadow !== 'none' && cs.textShadow.match(/(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
        if (ts) { x.shadowColor = ts[1]; x.shadowOffsetX = +ts[2]; x.shadowOffsetY = +ts[3]; x.shadowBlur = +ts[4]; }
        var fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.25, lines = wrapLines(x, txt, r.width + 2);
        lines.forEach(function (ln, j) { x.fillText(ln, r.left - rc.left, r.top - rc.top + lh * (j + .5)); });
        x.restore();
      });
      gl.bindTexture(gl.TEXTURE_2D, texs[i]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      dirty = true;
    }
    function drawAll() { for (var i = 0; i < n; i++) drawCard(i); sig = signature(); start(); }
    function signature() { return [].map.call(root.querySelectorAll('[data-fc-draw]'), function (t) { return t.innerText; }).join('|'); }
    function snap(i) {
      var m = models[i]; if (!m || !m.snap) return false;
      var src = m.snap(); if (!src || !src.width) return false;
      var c = posters[i] || document.createElement('canvas'); c.width = src.width; c.height = src.height;
      c.getContext('2d').clearRect(0, 0, c.width, c.height); c.getContext('2d').drawImage(src, 0, 0); posters[i] = c; return true;
    }
    var snapTries = 0, snapIv = setInterval(function () {
      var waiting = false;
      models.forEach(function (m, i) { if (m && m.snap && !posters[i]) { if (snap(i)) drawCard(i); else waiting = true; } });
      if (!waiting || ++snapTries > 40) clearInterval(snapIv);
      start();
    }, 300);
    var sigIv = setInterval(function () { if (ready && signature() !== sig) drawAll(); }, 700);

    function measure() {
      width = Math.max(1, root.clientWidth); height = Math.max(1, root.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      bw = Math.max(2, Math.round(width * dpr)); bh = Math.max(2, Math.round(height * dpr)); cv.width = bw; cv.height = bh;
      gl.bindTexture(gl.TEXTURE_2D, sTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      var oldS = S; W = cards[0].offsetWidth || 300; H = cards[0].offsetHeight || 400; S = W + Math.max(14, Math.min(24, W * .06)); L = S * n;
      if (oldS !== S) { pos = pos / oldS * S; goal = Math.round(goal / oldS) * S; }
      dirty = true;
    }
    function nearest(at) { return ((Math.round(at / S) % n) + n) % n; }
    function snapPt(at) { return Math.round(at / S) * S; }
    function setActive(i) {
      if (i === active) return; active = i;
      if (cnt) cnt.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    }
    function setOverlay(i) {
      if (i === overlay) return;
      var prev = overlay; overlay = i;
      if (prev >= 0) {
        var pc = cards[prev]; pc.style.transition = 'opacity .06s linear'; pc.style.opacity = '0'; pc.style.pointerEvents = 'none';
        if (models[prev]) { if (snap(prev)) drawCard(prev); models[prev].paused = true; }
      }
      if (i >= 0) {
        var c = cards[i]; c.style.transition = 'opacity .28s ease'; c.style.opacity = '1'; c.style.pointerEvents = 'auto';
        if (models[i]) models[i].paused = false;
      }
    }
    function frame(now) {
      raf = 0; if (!alive) return;
      var dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
      var anim = false;
      if (introOn && introT < 1) { introT = reduce ? 1 : Math.min(1, introT + dt / 2.1); anim = true; }
      if (vis && (anim || p.down)) { rafAt = now; raf = requestAnimationFrame(frame); }
      if (!p.drag) {
        var k = 80, c = 2 * Math.sqrt(k), st = Math.ceil(dt * 240), h = dt / st;
        for (var q = 0; q < st; q++) { vel += (k * (goal - pos) - c * vel) * h; pos += vel * h; }
        if (Math.abs(goal - pos) < .6 && Math.abs(vel) < 8) { pos = goal; vel = 0; } else anim = true;
      } else anim = true;
      if (Math.abs(pos) > L * 8) { var shf = Math.round(pos / L) * L; pos -= shf; goal -= shf; p.sp -= shf; }
      var travel = Math.abs(pos - lastPos) / dt; lastPos = pos;
      var et = reduce ? 0 : Math.min(travel / 2600, 1);
      energy += (et - energy) * (1 - Math.exp(-dt / (et > energy ? .07 : .35)));
      if (energy > .001) anim = true;
      setActive(nearest(pos));
      var settled = introOn && introT >= 1 && !p.down && pos === goal && vel === 0;
      if (settled) energy = Math.min(energy, .08);
      settleT = settled ? settleT + dt : 0;
      setOverlay(settleT > .08 ? active : -1);
      if (settled && overlay < 0) anim = true;
      if (anim || dirty) {
        dirty = false;
        var strength = 0, sceneA = introOn ? 1 : 0, homeX = width / 2, homeY = height / 2, shrink = 1 - .2 * energy, draws = [];
        if (introOn) strength = reduce ? 1 : inout((introT - .3) / .65);
        for (var i = 0; i < n; i++) {
          var baseRel = wrap(i * S - pos, L);
          for (var kk = -3; kk <= 3; kk++) {
            var rel = baseRel + kk * L; if (Math.abs(rel) - W / 2 > width + 40) continue;
            var sc = shrink, al = 1, y = homeY;
            if (introT < 1) {
              var loc = c01((introT - Math.min(Math.abs(rel) / (width * .6), 1) * .34) / .6);
              al = c01(loc * 4); y += (1 - quint(loc)) * height * .62; sc *= .5 + .5 * inout((loc - .18) / .82);
            }
            var x = homeX + rel, cw = W * sc;
            if (al <= .001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
            draws.push({ i: i, rel: rel, x: x, y: y, cw: cw, ch: H * sc, al: al });
          }
        }
        draws.sort(function (a, b) { return Math.abs(b.rel) - Math.abs(a.rel); });
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, bw, bh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(cardP.p); gl.bindVertexArray(quad); gl.activeTexture(gl.TEXTURE0);
        var U = cardP.u; gl.uniform2f(U.uRes, width, height); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uRadius, RADIUS); gl.uniform1i(U.tMap, 0);
        instances = [];
        draws.forEach(function (d) {
          gl.bindTexture(gl.TEXTURE_2D, texs[d.i]);
          gl.uniform4f(U.uRect, d.x, d.y, d.cw + 2, d.ch + 2); gl.uniform2f(U.uBox, d.cw + 2, d.ch + 2); gl.uniform2f(U.uSize, d.cw, d.ch); gl.uniform1f(U.uAlpha, d.al);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          instances.push({ i: d.i, x0: d.x - d.cw / 2, x1: d.x + d.cw / 2, y0: d.y - d.ch / 2, y1: d.y + d.ch / 2 });
        });
        gl.bindTexture(gl.TEXTURE_2D, sTex); gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, bw, bh); gl.disable(gl.BLEND); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(lensP.p); gl.bindVertexArray(tri);
        var lw = Math.max(width, W * 3.4), hw = .74 * lw / 2, hh = 1.18 * lw / 2, inner = Math.max(4, REACH * (hw + hh) * .5), V = lensP.u;
        gl.uniform1i(V.tScene, 0); gl.uniform2f(V.uResolution, width, height); gl.uniform1f(V.uDpr, dpr); gl.uniform2f(V.uCenter, homeX, homeY);
        gl.uniform2f(V.uHalf, hw, hh); gl.uniform1f(V.uAngle, TILT); gl.uniform1f(V.uExponent, 2); gl.uniform1f(V.uInner, inner); gl.uniform1f(V.uOuter, inner * 1.6);
        gl.uniform1f(V.uFlow, BEND * (hw + hh) * .45); gl.uniform1f(V.uCurl, 0); gl.uniform1f(V.uDispersion, DISP * .12); gl.uniform1f(V.uStrength, strength); gl.uniform1f(V.uSceneAlpha, sceneA);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }
      if (!raf && vis && (anim || p.down)) { rafAt = now; raf = requestAnimationFrame(frame); }
    }
    var rafAt = 0;
    function start() {
      if (!alive) return;
      var now = performance.now();
      if (raf && now - rafAt < 200) return;
      if (raf) cancelAnimationFrame(raf);
      if (!raf) last = now;
      rafAt = now; raf = requestAnimationFrame(frame);
    }
    function beginIntro() { if (introOn || !ready) return; introOn = true; introT = reduce ? 1 : 0; start(); }
    function stepBy(d) { goal = snapPt(goal) + d * S; start(); }
    function goTo(i) { goal = goal + wrap(i * S - goal, L); start(); }
    function skip() { if (introOn) introT = 1; }
    function local(e) { var r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function hit(e) { var q = local(e); for (var j = instances.length - 1; j >= 0; j--) { var t = instances[j]; if (q[0] >= t.x0 && q[0] <= t.x1 && q[1] >= t.y0 && q[1] <= t.y1) return t; } return null; }
    function down(e) {
      if (e.button > 0) return; skip();
      p.down = true; p.id = e.pointerId; p.touch = e.pointerType === 'touch'; p.sx = e.clientX; p.sy = e.clientY; p.sp = pos; p.drag = false; p.moved = false;
      p.samples = [{ x: e.clientX, t: performance.now() }];
      if (Math.abs(vel) > 40) { goal = pos; vel = 0; }
      start();
    }
    function move(e) {
      if (!p.down) { root.style.cursor = hit(e) ? 'pointer' : ''; return; }
      if (e.pointerId !== p.id) return;
      var dx = e.clientX - p.sx, dy = e.clientY - p.sy, slop = p.touch ? 10 : 5;
      if (!p.drag) {
        if (p.touch && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) { p.down = false; return; }
        if (Math.abs(dx) > slop) { p.drag = true; p.moved = true; p.sx = e.clientX; p.sp = pos; try { root.setPointerCapture(e.pointerId); } catch (x) {} root.style.cursor = 'grabbing'; }
      }
      if (p.drag) {
        pos = p.sp - (e.clientX - p.sx); goal = pos; vel = 0;
        var now = performance.now(); p.samples.push({ x: e.clientX, t: now });
        while (p.samples.length > 2 && now - p.samples[0].t > 100) p.samples.shift();
      }
      start();
    }
    function up(e) {
      if (!p.down || e.pointerId !== p.id) return;
      p.down = false; root.style.cursor = '';
      if (!p.drag) {
        if (overlay >= 0 && cards[overlay].contains(e.target)) return;
        var t = hit(e);
        if (t && t.i !== active) goTo(t.i);
        else if (t && Math.abs(goal - pos) < 2) { pos = goal; vel = 0; energy = 0; settleT = 1; setOverlay(active); var ac = cards[active]; if (ac.tagName === 'BUTTON') ac.click(); }
        start(); return;
      }
      p.drag = false;
      var now = performance.now(), a = p.samples[0], b = p.samples[p.samples.length - 1], v = 0;
      if (a && b && b.t > a.t && now - b.t < 70) v = -((b.x - a.x) / (b.t - a.t)) * 1000;
      vel = v;
      var land = snapPt(pos + v * .32);
      if (Math.abs(v) > 400 && Math.abs(land - snapPt(pos)) < 1) land += (v > 0 ? 1 : -1) * S;
      goal = land; start();
    }
    function cancel() { p.down = false; p.drag = false; root.style.cursor = ''; goal = snapPt(pos); start(); }
    function click(e) { if (p.moved) { p.moved = false; e.stopPropagation(); e.preventDefault(); } }
    function wheel(e) {
      var dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) { dx = dy; dy = 0; }
      if (Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault(); skip();
      goal += Math.max(-120, Math.min(120, dx * (e.deltaMode === 1 ? 16 : 1))) * 1.25;
      clearTimeout(wheelT); wheelT = setTimeout(function () { goal = snapPt(goal); start(); }, 150);
      start();
    }
    function key(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); skip(); stepBy(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(); stepBy(-1); }
      else if (e.key === 'Enter' && e.target === root && overlay >= 0) { cards[overlay].click(); }
    }
    var onPrev = function () { skip(); stepBy(-1); }, onNext = function () { skip(); stepBy(1); };
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', cancel);
    root.addEventListener('click', click, true);
    root.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('keydown', key);
    if (prevB) prevB.addEventListener('click', onPrev);
    if (nextB) nextB.addEventListener('click', onNext);
    cards.forEach(function (c) { c.addEventListener('dragstart', function (e) { e.preventDefault(); }); });
    var onRedraw = function (e) { if (!ready) return; var c = e.target.closest && e.target.closest('[data-fc-card]'), i = cards.indexOf(c); if (i >= 0) { drawCard(i); start(); } };
    root.addEventListener('fc-redraw', onRedraw);
    var ro = new ResizeObserver(function () { measure(); if (ready) drawAll(); start(); }); ro.observe(root);
    var io = new IntersectionObserver(function (en) {
      vis = en[0].isIntersecting;
      if (vis) beginIntro();
      start();
    }, { threshold: .25 });
    measure();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      if (!alive) return; ready = true; drawAll(); io.observe(root);
      var rc = root.getBoundingClientRect(); if (rc.bottom > 0 && rc.top < (window.innerHeight || 800)) beginIntro();
      setTimeout(beginIntro, 1500);
    });
    return function () {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); clearTimeout(wheelT); clearInterval(snapIv); clearInterval(sigIv);
      root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', cancel); root.removeEventListener('click', click, true); root.removeEventListener('wheel', wheel); root.removeEventListener('keydown', key);
      if (prevB) prevB.removeEventListener('click', onPrev);
      if (nextB) nextB.removeEventListener('click', onNext);
      models.forEach(function (m) { if (m) m.paused = false; });
      gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext();
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    };
  };
})();
