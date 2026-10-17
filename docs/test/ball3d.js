(function () {
  if (window.customElements.get('ae-ball')) return;
  var URL3 = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var URLG = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
  // GLTFLoader imports bare 'three'; the importmap in index.html points it at URL3 so only one copy loads.
  function glb(url) {
    var c = window.__aeGLB || (window.__aeGLB = {});
    return c[url] || (c[url] = import(URLG).then(function (m) { return new m.GLTFLoader().loadAsync(new URL(url, document.baseURI).href); }).then(function (g) { return g.scene; }));
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SHF = 'varying vec2 vU;void main(){float r=length(vU-.5)*2.;gl_FragColor=vec4(.12,.08,.24,(1.-smoothstep(0.,1.,r))*.42);}';
  // Pebbled rubber grip: a tileable dot bump map on the GLB's 'dodgeball' material (shared by clones, made once).
  var bumpTex = null;
  function pebble(T, m) {
    m.traverse(function (o) {
      if (!o.isMesh || o.material.name !== 'dodgeball' || o.material.bumpMap) return;
      if (!bumpTex) {
        var cv = document.createElement('canvas'); cv.width = cv.height = 64;
        var g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
        for (var i = 0; i < 140; i++) {
          var x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 64, y = (Math.sin(i * 78.233) * 43758.5453 % 1 + 1) % 1 * 64, r = 1.6 + (i % 3) * .5;
          for (var dx = -64; dx <= 64; dx += 64) for (var dy = -64; dy <= 64; dy += 64) {
            var gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
            gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
          }
        }
        bumpTex = new T.CanvasTexture(cv); bumpTex.wrapS = bumpTex.wrapT = T.RepeatWrapping; bumpTex.repeat.set(26, 13);
      }
      o.material.bumpMap = bumpTex; o.material.bumpScale = .18; o.material.needsUpdate = true;
    });
    return m;
  }
  class AeBall extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%'; this.style.position = 'relative';
      if (this._init) { this._go(); return; }
      this._init = true;
      var self = this;
      import(URL3).then(function (T) {
        return glb('models/dodgeball.glb').then(function (m) { return [T, pebble(T, m.clone())]; }, function (e) { console.warn(e); return [T, null]; });
      }).then(function (a) { self._build(a[0], a[1]); }).catch(function (e) { console.warn(e); });
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
    _build(T, model) {
      var self = this, r = new T.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setClearColor(0, 0);
      r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(r.domElement); this.r = r;
      var sc = this.sc = new T.Scene(), cam = this.cam = new T.PerspectiveCamera(28, 1, .1, 50);
      cam.position.set(0, .35, 5.6); cam.lookAt(0, -.15, 0);
      sc.add(new T.HemisphereLight('#f3ecff', '#3a2b62', 1.6));
      var k = new T.DirectionalLight('#ffffff', 2.4); k.position.set(-3, 5, 6); sc.add(k);
      var rim = new T.DirectionalLight('#cdb6f2', 2.4); rim.position.set(4, 2, -5); sc.add(rim);
      var warm = new T.DirectionalLight('#ffd9a8', .8); warm.position.set(2, -3, 4); sc.add(warm);
      this.ball = model || this._plainBall(T);
      this.ball.rotation.set(.5, 0, .25);
      sc.add(this.ball);
      var sh = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), new T.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SHF }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = -1.32; sh.scale.set(1, .55, 1); this.sh = sh; sc.add(sh);
      this._t0 = performance.now(); this._last = this._t0;
      new ResizeObserver(function () { self._size(); self._render(performance.now()); }).observe(this);
      this._io = new IntersectionObserver(function (e) { self._vis = e[0].isIntersecting; self._go(); });
      this._io.observe(this);
      this._size(); this._render(this._t0); this._go();
    }
    // Fallback when the GLB can't load: a plain orange rubber sphere.
    _plainBall(T) { return new T.Mesh(new T.SphereGeometry(1, 64, 48), new T.MeshStandardMaterial({ color: '#f47a1f', roughness: .6 })); }
    _size() {
      var w = this.clientWidth || 1, h = this.clientHeight || 1;
      this.r.setSize(w, h, false); this.cam.aspect = w / h;
      var fit = Math.max(1, 1 / this.cam.aspect * .9); this.cam.position.z = 5.6 * fit; this.cam.updateProjectionMatrix();
    }
    _render(t) {
      if (!this.r) return;
      var dt = Math.min(.05, (t - this._last) / 1000); this._last = t;
      var s = (t - this._t0) / 1000, b = reduce ? 0 : Math.abs(Math.sin(s * 2.2));
      if (!reduce) { this.ball.rotation.y += dt * .9; this.ball.rotation.x += dt * .25; }
      this.ball.position.y = -.25 + b * .3;
      var sq = 1 - (1 - b) * (1 - b) * .05; this.ball.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      var k = 1 - b * .35; this.sh.scale.set(k, .55 * k, 1); this.sh.material.opacity = 1;
      this.r.render(this.sc, this.cam);
    }
    snap() { if (!this.r || !this.clientWidth) return null; this._render(performance.now()); return this.r.domElement; }
    _go() {
      var self = this;
      if (this._raf || !this.r || this._vis === false) return;
      var tick = function (t) {
        self._raf = 0;
        if (!self.isConnected || self._vis === false) return;
        if (!self.paused) self._render(t); else self._last = t;
        self._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }
  }
  customElements.define('ae-ball', AeBall);
})();
