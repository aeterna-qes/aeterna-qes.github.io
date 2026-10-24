(function () {
  if (window.customElements.get('ae-cube')) return;
  var URL3 = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var URLG = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
  var p3; function three() { return p3 || (p3 = import(URL3)); }
  // GLTFLoader imports bare 'three'; the importmap in index.html points it at URL3 so only one copy loads.
  function glb(url) {
    var c = window.__aeGLB || (window.__aeGLB = {});
    return c[url] || (c[url] = import(URLG).then(function (m) { return new m.GLTFLoader().loadAsync(new URL(url, document.baseURI).href); }).then(function (g) { return g.scene; }));
  }
  // Face colours in three's Y-up frame; the GLB (tools/build-models.mjs) bakes the same ones.
  var COL = { px: '#e0707f', nx: '#eb9a12', py: '#faf6ff', ny: '#fbc75a', pz: '#7a8be8', nz: '#5fbf9a' };
  var DEG = Math.PI / 180;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  // Clean float drift after a quarter turn: rotation entries are 0/±1, positions are whole numbers.
  function snap(m) { var e = m.elements; for (var i = 0; i < 16; i++) e[i] = Math.round(e[i]); return m; }
  function el(tag, css, text) { var d = document.createElement(tag); d.style.cssText = css; if (text != null) d.textContent = text; return d; }
  function clock(ms) {
    var s = ms / 1000, m = Math.floor(s / 60), r = (s - m * 60).toFixed(2);
    return m ? m + ':' + (r < 10 ? '0' : '') + r : r;
  }
  // Plain boxes and stickers, used only if the GLB can't load.
  function fallbackCube(T) {
    var g = new T.Group(), body = new T.MeshStandardMaterial({ color: '#2a1f4a', roughness: .4 }), bg = new T.BoxGeometry(.96, .96, .96), sg = new T.PlaneGeometry(.8, .8);
    var N = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] };
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      var c = new T.Group(); c.userData.cubie = [x, y, z]; c.add(new T.Mesh(bg, body));
      for (var f in N) {
        var n = N[f]; if (n[0] && n[0] !== x || n[1] && n[1] !== y || n[2] && n[2] !== z) continue;
        var s = new T.Mesh(sg, new T.MeshStandardMaterial({ color: COL[f], roughness: .3 }));
        s.position.set(n[0] * .485, n[1] * .485, n[2] * .485); s.lookAt(n[0], n[1], n[2]); s.userData.face = f; c.add(s);
      }
      g.add(c);
    }
    return g;
  }
  var PILL = "all:unset;box-sizing:border-box;cursor:pointer;padding:7px 14px;border:1px solid #cdb6f2;border-radius:999px;background:rgba(250,246,255,.92);color:#3a2b62;font-family:'Inter',sans-serif;font-size:12px;letter-spacing:.04em;white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)";
  var CL = {
    en: { turn: 'Turn rows', view: 'Rotate view', hint: 'Tap the cube to try solving it', scr: 'Scrambling…', go: 'Drag a row to turn it · drag empty space, or switch to Rotate view, to look around', moves: 'moves', solved: 'Solved!', again: 'New scramble', exit: 'Watch' },
    zh: { turn: '扭動', view: '轉視角', hint: '撳一下扭計骰，親手試試還原', scr: '打亂中……', go: '拖動一行色塊來扭；拖動空白處或切換「轉視角」即可轉動觀看', moves: '步', solved: '還原成功！', again: '再打亂', exit: '觀看' },
  };

  // Rubik's cube rendered with three.js from models/cube.glb. mode="loop" / "spin" are showcase-only;
  // no mode is the playable version. Supports .paused and .snap() for the flexrow carousel.
  class AeCube extends HTMLElement {
    static get observedAttributes() { return ['locale']; }
    attributeChangedCallback() { if (this._built) this._hud(); }
    get L() { return CL[this.getAttribute('locale') === 'en' ? 'en' : 'zh']; }
    connectedCallback() {
      if (this._built) { this._start(); return; }
      this._built = true;
      var mode = this.getAttribute('mode');
      this.mini = mode === 'spin';
      this.loopOnly = mode === 'loop';
      this.canPlay = !this.mini && !this.loopOnly;
      this.mode = 'auto';
      this.style.cssText += ';display:block;width:100%;height:100%;position:relative;user-select:none;-webkit-user-select:none;touch-action:pan-y';
      if (this.canPlay) this.appendChild(el('div', 'position:absolute;left:50%;bottom:4%;width:56%;height:9%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(58,43,98,.28),rgba(58,43,98,0) 70%);pointer-events:none'));
      this._stage = el('div', 'position:absolute;inset:0'); this.appendChild(this._stage);
      this.tool = 'turn';
      this.cubies = []; this.stickers = []; this._hits = [];
      this.rx = -27; this.ry = this.mini ? -30 : -38;
      if (this.canPlay) this._buildHud();
      this._bindPointer();
      this.queue = []; this.phase = 'wait'; this.until = performance.now() + 900;
      var self = this;
      three().then(function (T) {
        return glb('models/cube.glb').then(function (m) { return [T, m.clone()]; }, function (e) { console.warn(e); return [T, null]; });
      }).then(function (a) { self._init(a[0], a[1]); }).catch(function (e) { console.warn(e); });
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
    _init(T, model) {
      this.T = T;
      try { this.r = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
      var r = this.r, self = this;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setClearColor(0, 0);
      r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this._stage.appendChild(r.domElement);
      var sc = this.sc = new T.Scene();
      this.cam = new T.PerspectiveCamera(30, 1, .1, 100);
      sc.add(new T.HemisphereLight('#f3ecff', '#3a2b62', 1.6));
      var k = new T.DirectionalLight('#ffffff', 2.2); k.position.set(-3, 6, 7); sc.add(k);
      var rim = new T.DirectionalLight('#fbc75a', 1.4); rim.position.set(5, 2, -6); sc.add(rim);
      var fil = new T.DirectionalLight('#b490ef', .9); fil.position.set(-6, -2, 4); sc.add(fil);
      this.view = new T.Group(); sc.add(this.view);
      var src = [];
      (model || fallbackCube(T)).traverse(function (o) { if (o.userData.cubie) src.push(o); });
      src.forEach(function (c) {
        var ci = self.cubies.length;
        c.matrixAutoUpdate = false; self.view.add(c);
        c.traverse(function (s) {
          var f = s.userData.face; if (!f) return;
          var info = { ci: ci, ax: 'xyz'.indexOf(f[1]), sg: f[0] === 'p' ? 1 : -1, col: f };
          s.userData.st = info; self.stickers.push(info); self._hits.push(s);
        });
        self.cubies.push({ obj: c, o: c.userData.cubie, m: new T.Matrix4() });
      });
      this._ray = new T.Raycaster();
      this._reset(); this._view(); this._fit(); this._dist = this._goal;
      this._ro = new ResizeObserver(this._fit.bind(this)); this._ro.observe(this);
      this._io = new IntersectionObserver(function (e) { self._vis = e[0].isIntersecting; if (self._vis) self._start(); });
      this._io.observe(this);
      this._render();
    }
    _reset() {
      this.cur = null;
      this.cubies.forEach(function (c) { c.m.makeTranslation(c.o[0], c.o[1], c.o[2]); c.obj.matrix.copy(c.m); c.obj.matrixWorldNeedsUpdate = true; });
    }
    _fit() {
      if (!this.r) return;
      var w = this.clientWidth || 1, h = this.clientHeight || 1, a = w / h;
      this.r.setSize(w, h, false); this.cam.aspect = a; this.cam.updateProjectionMatrix();
      // Same framing as the old CSS cube: the 3-unit cube spans 1/k of the shorter side.
      var k = this.mini ? 1.75 : this.loopOnly ? 1.6 : this.mode === 'play' ? 2.4 : 1.85;
      this._goal = 3 * k * 1.15 / (2 * Math.tan(15 * DEG) * Math.min(1, a));
      if (!this._dist) this._dist = this._goal;
      this._render();
    }
    _view() { if (this.view) this.view.rotation.set(-this.rx * DEG, this.ry * DEG, 0); }
    _render() {
      if (!this.r) return;
      this.cam.position.set(0, 0, this._dist); this.cam.lookAt(0, 0, 0);
      this.r.render(this.sc, this.cam);
    }
    snap() { if (!this.r || !this.clientWidth) return null; this._render(); return this.r.domElement; }
    _buildHud() {
      var self = this;
      this._hint = el('div', PILL + ";position:absolute;left:50%;bottom:0;transform:translateX(-50%);pointer-events:none;cursor:default;display:flex;align-items:center;gap:8px;max-width:calc(100% - 12px);white-space:normal;text-align:center;box-shadow:0 6px 18px rgba(58,43,98,.12)");
      this._hintDot = el('span', 'width:7px;height:7px;border-radius:50%;background:#e8930f;flex:none');
      this._hintTxt = el('span', '');
      this._hint.appendChild(this._hintDot); this._hint.appendChild(this._hintTxt);
      this._bar = el('div', 'position:absolute;left:0;right:0;top:0;display:none;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap');
      this._stat = el('div', "display:flex;flex-direction:column;gap:2px;font-family:'Inter',sans-serif;color:#3a2b62");
      this._time = el('span', 'font-size:26px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.1', '0.00');
      this._moves = el('span', 'font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8c7fae');
      this._stat.appendChild(this._time); this._stat.appendChild(this._moves);
      var btns = el('div', 'display:flex;gap:8px');
      this._again = el('button', PILL); this._again.type = 'button';
      this._exit = el('button', PILL); this._exit.type = 'button';
      [this._again, this._exit].forEach(function (b) {
        b.onpointerdown = function (e) { e.stopPropagation(); };
        b.onmouseenter = function () { b.style.borderColor = '#e8930f'; b.style.color = '#e8930f'; };
        b.onmouseleave = function () { b.style.borderColor = '#cdb6f2'; b.style.color = '#3a2b62'; };
      });
      this._again.onclick = function () { self._play(); };
      this._exit.onclick = function () { self._watch(); };
      btns.appendChild(this._again); btns.appendChild(this._exit);
      this._bar.appendChild(this._stat); this._bar.appendChild(btns);
      this._seg = el('div', 'position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:none;padding:3px;border:1px solid #cdb6f2;border-radius:999px;background:rgba(250,246,255,.94);box-shadow:0 6px 18px rgba(58,43,98,.12)');
      this._segBtns = ['turn', 'view'].map(function (k) {
        var b = el('button', "all:unset;box-sizing:border-box;cursor:pointer;min-height:36px;padding:8px 16px;border-radius:999px;font-family:'Inter','Noto Serif TC',sans-serif;font-size:12.5px;letter-spacing:.04em;white-space:nowrap;transition:background .2s ease,color .2s ease");
        b.type = 'button'; b._k = k;
        b.onpointerdown = function (e) { e.stopPropagation(); };
        b.onclick = function () { self.tool = k; self._hud(); };
        self._seg.appendChild(b); return b;
      });
      this._done = el('div', "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9);opacity:0;pointer-events:none;transition:opacity .35s ease,transform .45s cubic-bezier(.2,1.4,.4,1);display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 26px;border-radius:18px;background:rgba(250,246,255,.94);box-shadow:0 0 0 1.5px #fbc75a,0 18px 40px rgba(58,43,98,.22);font-family:'Inter',sans-serif;color:#3a2b62;text-align:center");
      this._doneT = el('span', "font-family:'Marcellus','Noto Serif TC',serif;font-size:26px;color:#e8930f");
      this._doneS = el('span', 'font-size:14px;font-variant-numeric:tabular-nums');
      this._done.appendChild(this._doneT); this._done.appendChild(this._doneS);
      this.appendChild(this._hint); this.appendChild(this._bar); this.appendChild(this._seg); this.appendChild(this._done);
      this._hud();
    }
    _hud() {
      if (!this._hint) return;
      var L = this.L, play = this.mode === 'play';
      this._hintTxt.textContent = !play ? L.hint : this.scrambling ? L.scr : L.go;
      this._hint.style.display = play && this.moves > 0 ? 'none' : 'flex';
      this._hint.style.bottom = play ? '52px' : '0';
      this._seg.style.display = play ? 'flex' : 'none';
      var tool = this.tool;
      this._segBtns.forEach(function (b) {
        var on = b._k === tool;
        b.textContent = L[b._k];
        b.style.background = on ? 'linear-gradient(150deg,#fbc75a,#eb9a12)' : 'transparent';
        b.style.color = on ? '#2e2352' : '#5f5088';
      });
      this._bar.style.display = play ? 'flex' : 'none';
      this._again.textContent = L.again; this._exit.textContent = L.exit;
      this._moves.textContent = (this.moves || 0) + ' ' + L.moves;
      if (!this.t0) this._time.textContent = '0.00';
      var solved = play && this.solvedAt;
      this._done.style.opacity = solved ? '1' : '0';
      this._done.style.transform = 'translate(-50%,-50%) scale(' + (solved ? 1 : .9) + ')';
      if (solved) { this._doneT.textContent = L.solved; this._doneS.textContent = clock(this.solvedAt - this.t0) + ' · ' + this.moves + ' ' + L.moves; }
    }
    _play() {
      if (!this.r) return;
      if (this.cur) this._finish();
      this.mode = 'play'; this.queue = []; this._reset(); this.tool = 'turn'; this._fit();
      this.style.touchAction = 'none';
      var mv = this._plan(22);
      this.queue = mv; this.speed = 85; this.scrambling = true;
      this.moves = 0; this.t0 = 0; this.solvedAt = 0;
      this._hud();
    }
    _watch() {
      if (this.cur) this._finish();
      this.mode = 'auto'; this.queue = []; this._reset(); this._fit();
      this.style.touchAction = 'pan-y';
      this.scrambling = false; this.phase = 'wait'; this.until = performance.now() + 700;
      this._hud();
    }
    // The sticker under a pointer event, if any.
    _pick(e) {
      if (!this.r) return null;
      var rc = this.getBoundingClientRect(), T = this.T;
      this._ray.setFromCamera(new T.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1), this.cam);
      this.sc.updateMatrixWorld();
      var hit = this._ray.intersectObjects(this._hits, false)[0];
      return hit ? hit.object.userData.st : null;
    }
    _bindPointer() {
      var self = this, d = null;
      this.addEventListener('pointerdown', function (e) {
        if (self.mini || self.loopOnly) return;
        var turn = self.mode === 'play' && self.tool === 'turn' && !self.scrambling && !self.solvedAt;
        d = { x: e.clientX, y: e.clientY, rx: self.rx, ry: self.ry, st: turn ? self._pick(e) : null, moved: false, turned: false };
        self._drag = true; self.style.cursor = 'grabbing';
        try { self.setPointerCapture(e.pointerId); } catch (_) {}
      });
      this.addEventListener('pointermove', function (e) {
        if (!d) return;
        var dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
        if (d.st) {
          if (!d.turned && Math.hypot(dx, dy) > 14) { d.turned = true; self._userTurn(d.st, dx, dy); }
          return;
        }
        self.ry = d.ry + dx * .45;
        self.rx = Math.max(-88, Math.min(88, d.rx - dy * .45));
        self._view(); self._dirty = true;
      });
      var up = function () {
        if (d && !d.moved && self.canPlay && self.mode === 'auto') self._play();
        d = null; self._drag = false; self.style.cursor = self.mini || self.loopOnly ? '' : 'grab';
      };
      this.addEventListener('pointerup', up); this.addEventListener('pointercancel', up);
      if (!this.mini && !this.loopOnly) this.style.cursor = 'grab';
    }
    // Turn the layer that moves the grabbed sticker most nearly along the drag direction.
    _userTurn(st, dx, dy) {
      if (this.queue.length > 1) return;
      var T = this.T, c = this.cubies[st.ci], v = new T.Vector3();
      v.setComponent(st.ax, st.sg); v.transformDirection(c.m);
      var n = [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
      this.view.updateMatrix();
      var len = Math.hypot(dx, dy), best = null;
      for (var k = 0; k < 3; k++) {
        if (n[k]) continue;
        var p = new T.Vector3(); p.setComponent(k, 1); p.transformDirection(this.view.matrix);
        var pl = Math.hypot(p.x, p.y) || 1, dot = (p.x * dx - p.y * dy) / (pl * len);
        if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { k: k, dot: dot };
      }
      var t = [0, 0, 0]; t[best.k] = best.dot > 0 ? 1 : -1;
      // Rotating about n × t by +90° carries the sticker towards t.
      var r = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
      var axis = r[0] ? 0 : r[1] ? 1 : 2;
      this.queue.push({ axis: axis, layer: Math.round(c.m.elements[12 + axis]), dir: r[axis], user: true });
    }
    _solved() {
      var seen = {}, v = new this.T.Vector3();
      for (var i = 0; i < this.stickers.length; i++) {
        var s = this.stickers[i];
        v.set(0, 0, 0); v.setComponent(s.ax, s.sg); v.transformDirection(this.cubies[s.ci].m);
        var key = Math.round(v.x) + ',' + Math.round(v.y) + ',' + Math.round(v.z);
        if (seen[key] && seen[key] !== s.col) return false;
        seen[key] = s.col;
      }
      return true;
    }
    _start() {
      if (this._raf || !this._built) return;
      var self = this, last = performance.now();
      var tick = function (t) {
        if (!self._vis || !self.isConnected) { self._raf = 0; return; }
        if (self.paused || !self.r) { last = t; self._raf = requestAnimationFrame(tick); return; }
        var dt = Math.min(64, t - last); last = t;
        if (!self._drag && !reduce && self.mode === 'auto') { self.ry += dt * (self.mini ? .045 : self.loopOnly ? .02 : .008); self._view(); self._dirty = true; }
        if (!self.mini && (!reduce || self.mode === 'play')) self._turns(t);
        if (self.mode === 'play' && self.t0 && !self.solvedAt) self._time.textContent = clock(performance.now() - self.t0);
        if (Math.abs(self._goal - self._dist) > 1e-3) { self._dist += (self._goal - self._dist) * (reduce ? 1 : 1 - Math.exp(-dt / 110)); self._dirty = true; }
        if (self._dirty) { self._dirty = false; self._render(); }
        self._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
    _plan(n) {
      var moves = [], prev = -1;
      for (var i = 0; i < n; i++) {
        var axis; do { axis = Math.floor(Math.random() * 3); } while (axis === prev);
        prev = axis;
        moves.push({ axis: axis, layer: Math.random() < .5 ? -1 : 1, dir: Math.random() < .5 ? -1 : 1 });
      }
      return moves;
    }
    _rot(axis, ang) { var a = new this.T.Vector3(); a.setComponent(axis, 1); return new this.T.Matrix4().makeRotationAxis(a, ang); }
    _finish() {
      var R = this._rot(this.cur.axis, this.cur.dir * Math.PI / 2);
      this.cur.set.forEach(function (c) { snap(c.m.premultiply(R)); c.obj.matrix.copy(c.m); c.obj.matrixWorldNeedsUpdate = true; });
      var user = this.cur.user; this.cur = null; this._dirty = true;
      if (user && this.mode === 'play') {
        this.moves++;
        if (this._solved()) this.solvedAt = performance.now();
        this._hud();
      }
    }
    _turns(t) {
      if (this.cur) {
        var p = Math.min(1, (t - this.cur.t0) / this.cur.dur);
        if (p >= 1) { this._finish(); return; }
        var R = this._rot(this.cur.axis, this.cur.dir * Math.PI / 2 * ease(p));
        this.cur.set.forEach(function (c) { c.obj.matrix.multiplyMatrices(R, c.m); c.obj.matrixWorldNeedsUpdate = true; });
        this._dirty = true;
        return;
      }
      if (this.mode === 'play') {
        if (!this.queue.length) { if (this.scrambling) { this.scrambling = false; this._hud(); } return; }
      } else if (!this.queue.length) {
        if (t < this.until) return;
        if (this.phase === 'wait' || this.phase === 'solved') {
          this.scr = this._plan(16); this.queue = this.scr.slice(); this.phase = 'scramble'; this.speed = 190;
        } else if (this.phase === 'scramble') {
          this.queue = this.scr.slice().reverse().map(function (m) { return { axis: m.axis, layer: m.layer, dir: -m.dir }; });
          this.phase = 'solve'; this.speed = 230; this.until = t + 1100; return;
        } else { this.phase = 'solved'; this.until = t + 2400; return; }
      }
      var mv = this.queue.shift();
      if (mv.user && !this.t0) this.t0 = performance.now();
      this.cur = {
        axis: mv.axis, dir: mv.dir, t0: t, dur: mv.user ? 150 : this.speed, user: mv.user,
        set: this.cubies.filter(function (c) { return Math.round(c.m.elements[12 + mv.axis]) === mv.layer; }),
      };
    }
  }
  customElements.define('ae-cube', AeCube);

  // Stylised competition timer: a slab with two hand pads and a running display.
  class AeTimer3d extends HTMLElement {
    connectedCallback() {
      if (this._built) { this._start(); return; }
      this._built = true;
      var W = 220, H = 30, D = 112;
      this.style.cssText += ';display:block;width:100%;height:100%;position:relative;pointer-events:none';
      var wrap = el('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;perspective:900px');
      this._scaler = el('div', 'transform-style:preserve-3d;width:0;height:0');
      this._scene = el('div', 'position:relative;transform-style:preserve-3d;width:0;height:0');
      var face = function (w, h, tf, bg) { return el('div', 'position:absolute;left:' + (-w / 2) + 'px;top:' + (-h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;background:' + bg + ';border-radius:6px;transform:' + tf); };
      var side = 'linear-gradient(180deg,#4a3880,#2e2352)';
      var top = face(W, D, 'rotateX(90deg) translateZ(' + H / 2 + 'px)', 'linear-gradient(160deg,#4d3a86,#3a2b62)');
      top.style.borderRadius = '22px';
      [0, 1].forEach(function (i) {
        top.appendChild(el('div', 'position:absolute;top:50%;' + (i ? 'right' : 'left') + ':16px;width:66px;height:66px;margin-top:-33px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#d4c0f7,#b490ef 55%,#8f6bd4);box-shadow:inset 0 -3px 6px rgba(46,35,82,.35),0 0 0 3px rgba(46,35,82,.4)'));
      });
      this._led = el('div', 'position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#e0707f;box-shadow:0 0 8px #e0707f');
      top.appendChild(this._led);
      var front = face(W, H, 'translateZ(' + D / 2 + 'px)', side);
      var lcd = el('div', "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:118px;height:21px;border-radius:4px;background:#1d1636;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;font-size:15px;font-weight:500;letter-spacing:.08em;color:#fbc75a;text-shadow:0 0 6px rgba(251,199,90,.55)", '0:00.00');
      front.appendChild(lcd); this._lcd = lcd;
      this._scene.appendChild(face(W, H, 'rotateY(180deg) translateZ(' + D / 2 + 'px)', side));
      this._scene.appendChild(face(D, H, 'rotateY(90deg) translateZ(' + W / 2 + 'px)', side));
      this._scene.appendChild(face(D, H, 'rotateY(-90deg) translateZ(' + W / 2 + 'px)', side));
      this._scene.appendChild(face(W, D, 'rotateX(-90deg) translateZ(' + H / 2 + 'px)', '#2e2352'));
      this._scene.appendChild(top); this._scene.appendChild(front);
      this._scaler.appendChild(this._scene); wrap.appendChild(this._scaler); this.appendChild(wrap);
      var self = this;
      var fit = function () { var k = Math.min(self.clientWidth / (W * 1.12), self.clientHeight / (D * 1.05)); self._scaler.style.transform = 'scale(' + (k || 1) + ')'; };
      fit(); new ResizeObserver(fit).observe(this);
      this._io = new IntersectionObserver(function (e) { self._vis = e[0].isIntersecting; if (self._vis) self._start(); });
      this._io.observe(this);
      this._cyc = performance.now(); this._goal = 8000 + Math.random() * 6000;
      this._pose(0);
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
    _pose(t) {
      var ry = reduce ? -16 : -16 + Math.sin(t / 1900) * 12, rx = reduce ? -34 : -34 + Math.sin(t / 2600) * 4;
      this._scene.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    }
    _start() {
      if (this._raf || !this._built) return;
      var self = this;
      var tick = function (t) {
        if (!self._vis || !self.isConnected) { self._raf = 0; return; }
        self._pose(t);
        var e = t - self._cyc, run = Math.min(e, self._goal);
        if (e > self._goal + 2200) { self._cyc = t; self._goal = 8000 + Math.random() * 6000; }
        var m = Math.floor(run / 60000), s = (run % 60000) / 1000;
        self._lcd.textContent = m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
        var on = e < self._goal;
        self._led.style.background = on ? '#7fd6ae' : '#e0707f';
        self._led.style.boxShadow = '0 0 8px ' + (on ? '#7fd6ae' : '#e0707f');
        self._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
  }
  customElements.define('ae-timer3d', AeTimer3d);

  var L = {
    en: { idle: 'Hold, then release to start', hold: 'Keep holding…', ready: 'Release to start', run: 'Tap to stop', mean3: 'Round 1 · mean of 3', ao5: 'Final · Ao5', reset: 'Clear', none: 'Your solves appear here' },
    zh: { idle: '按住，放開即開始計時', hold: '繼續按住……', ready: '放開開始', run: '輕按停止', mean3: '初賽 · 3次平均', ao5: '決賽 · Ao5', reset: '清除', none: '成績會在這裏顯示' },
  };
  var fmt = function (ms) { return (ms / 1000).toFixed(2); };

  class AeCubeTimer extends HTMLElement {
    static get observedAttributes() { return ['locale']; }
    attributeChangedCallback() { if (this._built) this._paint(); }
    connectedCallback() {
      if (this._built) return; this._built = true;
      this.times = []; this.state = 'idle';
      this.style.cssText += ';display:flex;flex-direction:column;gap:14px';
      this.pad = el('button', 'all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:170px;padding:22px;border-radius:16px;background:#3a2b62;color:#faf6ff;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;transition:box-shadow .2s ease');
      this.pad.setAttribute('type', 'button');
      this.digits = el('span', "font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;font-size:clamp(46px,9vw,68px);font-weight:500;letter-spacing:.02em;line-height:1;transition:color .15s ease");
      this.hint = el('span', "font-family:'Inter',sans-serif;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:#cdb6f2");
      this.digits.textContent = '0.00';
      this.pad.appendChild(this.digits); this.pad.appendChild(this.hint);
      this.list = el('div', 'display:flex;flex-wrap:wrap;gap:6px;min-height:30px;align-items:center');
      this.stats = el('div', "display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;font-family:'Inter',sans-serif");
      this.appendChild(this.pad); this.appendChild(this.list); this.appendChild(this.stats);
      var self = this;
      var down = function (e) { e.preventDefault(); self._down(); };
      var up = function (e) { e.preventDefault(); self._up(); };
      this.pad.addEventListener('pointerdown', down);
      this.pad.addEventListener('pointerup', up);
      this.pad.addEventListener('pointerleave', function () { if (self.state === 'hold' || self.state === 'ready') { self.state = 'idle'; clearTimeout(self._ht); self._paint(); } });
      this.pad.addEventListener('keydown', function (e) { if (e.code === 'Space' && !e.repeat) down(e); });
      this.pad.addEventListener('keyup', function (e) { if (e.code === 'Space') up(e); });
      this._paint();
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); }
    get t() { return L[this.getAttribute('locale') === 'en' ? 'en' : 'zh']; }
    _down() {
      if (this.state === 'run') {
        cancelAnimationFrame(this._raf);
        var ms = performance.now() - this.t0;
        this.digits.textContent = fmt(ms);
        this.times.push(ms); if (this.times.length > 5) this.times.shift();
        this.state = 'done'; this._paint(); return;
      }
      this.state = 'hold'; this._paint();
      var self = this;
      this._ht = setTimeout(function () { if (self.state === 'hold') { self.state = 'ready'; self._paint(); } }, 350);
    }
    _up() {
      clearTimeout(this._ht);
      if (this.state === 'done') { this.state = 'idle'; this._paint(); return; }
      if (this.state === 'ready') {
        this.state = 'run'; this.t0 = performance.now(); this._paint();
        var self = this;
        var f = function () { self.digits.textContent = fmt(performance.now() - self.t0); self._raf = requestAnimationFrame(f); };
        this._raf = requestAnimationFrame(f);
      } else if (this.state === 'hold') { this.state = 'idle'; this._paint(); }
    }
    _paint() {
      var t = this.t, s = this.state;
      this.hint.textContent = s === 'hold' ? t.hold : s === 'ready' ? t.ready : s === 'run' ? t.run : t.idle;
      this.digits.style.color = s === 'hold' ? '#e0707f' : s === 'ready' ? '#7fd6ae' : '#faf6ff';
      this.pad.style.boxShadow = s === 'run' ? '0 0 0 2px #fbc75a,0 12px 30px rgba(58,43,98,.22)' : '0 12px 30px rgba(58,43,98,.16)';
      if (s === 'idle' && !this.times.length) this.digits.textContent = '0.00';
      var ts = this.times, n = ts.length, bi = -1, wi = -1;
      if (n === 5) { bi = ts.indexOf(Math.min.apply(null, ts)); wi = ts.indexOf(Math.max.apply(null, ts)); if (wi === bi) wi = (bi + 1) % 5; }
      this.list.innerHTML = '';
      if (!n) { this.list.appendChild(el('span', 'font-size:13px;color:#8c7fae', t.none)); }
      ts.forEach(function (ms, i) {
        var drop = i === bi || i === wi;
        this.list.appendChild(el('span', "padding:5px 11px;border-radius:999px;border:1px solid #cdb6f2;background:#faf6ff;font-family:'Inter',sans-serif;font-size:13px;font-variant-numeric:tabular-nums;color:" + (drop ? '#a597c8' : '#3a2b62') + (drop ? ';text-decoration:line-through' : ''), (drop ? '(' : '') + fmt(ms) + (drop ? ')' : '')));
      }, this);
      var mean3 = n >= 3 ? fmt((ts[0] + ts[1] + ts[2]) / 3) : '—';
      var ao5 = n === 5 ? fmt(ts.reduce(function (a, b, i) { return i === bi || i === wi ? a : a + b; }, 0) / 3) : '—';
      var stat = function (label, val) {
        return '<div style="display:flex;flex-direction:column;gap:3px"><span style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e8930f">' + label + '</span><span style="font-size:22px;font-weight:500;font-variant-numeric:tabular-nums;color:#3a2b62">' + val + '</span></div>';
      };
      this.stats.innerHTML = stat(t.mean3, mean3) + stat(t.ao5, ao5) +
        '<button type="button" style="padding:7px 14px;border:1px solid #cdb6f2;border-radius:999px;background:transparent;color:#5f5088;font-family:inherit;font-size:12px;cursor:pointer">' + t.reset + '</button>';
      var self = this;
      this.stats.querySelector('button').onclick = function () { self.times = []; self.state = 'idle'; self.digits.textContent = '0.00'; self._paint(); };
    }
  }
  customElements.define('ae-cube-timer', AeCubeTimer);
})();
