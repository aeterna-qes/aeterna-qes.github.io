(function () {
  if (window.customElements.get('ae-fuzzy')) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  class AeFuzzy extends HTMLElement {
    connectedCallback() {
      if (this._on) return; this._on = true;
      this.style.display = 'inline-block'; this.style.lineHeight = '0';
      var cv = this.cv = document.createElement('canvas');
      cv.setAttribute('data-fc-canvas', ''); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', this.getAttribute('text') || '');
      var sh = this.getAttribute('shadow');
      if (sh) { cv.setAttribute('data-fc-shadow', sh); cv.style.filter = 'drop-shadow(0 0 16px ' + sh + ')'; }
      cv.style.display = 'block';
      this.appendChild(cv);
      this._start();
    }
    disconnectedCallback() {
      this._on = false; cancelAnimationFrame(this._raf); this._raf = 0; clearTimeout(this._gt); clearTimeout(this._ge);
      if (this._io) this._io.disconnect(); if (this._rs) window.removeEventListener('resize', this._rs);
      this.innerHTML = '';
    }
    _start() {
      var self = this, cv = this.cv, ctx = cv.getContext('2d'), src = document.createElement('canvas'), sx = src.getContext('2d');
      var A = function (n, d) { var v = self.getAttribute(n); return v == null || v === '' ? d : v; };
      var text = A('text', ''), fsz = A('size', '64px'), fw = A('weight', '900'), ff = A('family', 'inherit'), color = A('color', 'currentColor');
      var base = +A('base', .18), hov = +A('hover', .5), range = +A('range', 30), fps = +A('fps', 50);
      var intro = !!self.getAttribute('intro'), introDur = 1400, glitch = !!self.getAttribute('glitch');
      var padX = range + 20, inset = 5, dpr = 1, fpx = 16, box = { left: 0, asc: 0, w: 0, h: 0, cw: 0, ch: 0 };
      var vis = true, hovering = false, glitching = false, last = 0, introStart = 0, introDone = !intro || reduce, drawn = -1, coarse = 1, intensity = 0, built = false;
      var card = self.closest('[data-fc-card]');
      function hidden() { return card && card.style.opacity === '0'; }
      function measure() { var p = document.createElement('span'); p.style.fontSize = fsz; self.appendChild(p); var s = parseFloat(getComputedStyle(p).fontSize); p.remove(); return s > 0 ? s : 16; }
      function font() { return fw + ' ' + fpx + 'px ' + (ff === 'inherit' ? getComputedStyle(self).fontFamily : ff); }
      function ink() { return /^(currentcolor|inherit)$/i.test(color) ? getComputedStyle(self).color : color; }
      function notify() { self.dispatchEvent(new CustomEvent('fc-redraw', { bubbles: true })); }
      function draw() {
        var step = Math.max(1, Math.round(coarse * dpr)), amp = intensity * range * dpr, ox = Math.round(padX * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); drawn = intensity;
        if (amp < .5) { ctx.drawImage(src, ox, 0); return; }
        for (var y = 0; y < src.height; y += step) {
          var h = Math.min(step, src.height - y);
          ctx.drawImage(src, 0, y, src.width, h, ox + Math.round((Math.random() - .5) * amp), y, src.width, h);
        }
      }
      function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2); fpx = measure();
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.font = font();
        var m = sx.measureText(text), left = m.actualBoundingBoxLeft || 0, w = Math.max(1, Math.ceil(left + (m.actualBoundingBoxRight || m.width)));
        var asc = m.actualBoundingBoxAscent || fpx, des = m.actualBoundingBoxDescent || fpx * .2, th = Math.max(1, Math.ceil(asc + des));
        box = { left: left, asc: asc, w: w, h: th, cw: w + inset * 2 + padX * 2, ch: th };
        src.width = Math.ceil((w + inset * 2) * dpr); src.height = Math.ceil(th * dpr);
        cv.width = Math.ceil(box.cw * dpr); cv.height = Math.ceil(box.ch * dpr);
        cv.style.width = box.cw + 'px'; cv.style.height = box.ch + 'px'; cv.style.margin = '0 ' + (-padX - inset) + 'px';
        sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, src.width, src.height);
        sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.font = font(); sx.textBaseline = 'alphabetic'; sx.fillStyle = ink();
        sx.fillText(text, inset + left, asc);
        if (!introDone && !introStart) cv.style.opacity = '0';
        intensity = 0; coarse = 1; draw(); built = true; notify();
      }
      function tick(now) {
        self._raf = 0; if (!self._on || !vis) return;
        self._raf = requestAnimationFrame(tick);
        if (now - last < 1000 / fps - 1) return; last = now;
        if (hidden()) {
          if (!introDone && !introStart) return;
          if (introDone) return;
        }
        var goal = glitching ? 1 : hovering ? hov : (reduce ? 0 : base), lvl = goal, en = 0;
        if (!introDone) {
          if (!introStart) introStart = now;
          var pr = Math.min(1, (now - introStart) / introDur), env = Math.pow(1 - pr, 2.5);
          lvl += (2 - lvl) * env; en = env;
          cv.style.opacity = pr < .3 ? (1 - Math.pow(1 - pr / .3, 2)).toFixed(3) : '';
          if (pr >= 1) { introDone = true; intensity = reduce ? 0 : base; coarse = 1; draw(); notify(); return; }
        }
        intensity = lvl; coarse = 1 + 3 * en * en;
        if (intensity === 0 && drawn === 0) return;
        draw();
      }
      function go() { if (!self._raf && self._on && vis && built) { last = 0; self._raf = requestAnimationFrame(tick); } }
      cv.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * box.cw / r.width, y = (e.clientY - r.top) * box.ch / r.height;
        hovering = x >= padX && x <= padX + box.w + inset * 2 && y >= 0 && y <= box.ch;
      });
      cv.addEventListener('pointerleave', function () { hovering = false; });
      if (glitch && !reduce) {
        var sched = function () { self._gt = setTimeout(function () { glitching = true; self._ge = setTimeout(function () { glitching = false; sched(); }, 200); }, 2600); };
        sched();
      }
      this._io = new IntersectionObserver(function (e) { vis = e[0].isIntersecting; go(); });
      this._io.observe(cv);
      var lastSize = 0;
      this._rs = function () { var s = measure(); if (built && s !== lastSize) { lastSize = s; build(); } };
      window.addEventListener('resize', this._rs);
      fpx = measure();
      var ready = document.fonts && document.fonts.load ? document.fonts.load(font(), text).catch(function () {}) : Promise.resolve();
      ready.then(function () { if (!self._on) return; build(); lastSize = fpx; go(); });
    }
  }
  customElements.define('ae-fuzzy', AeFuzzy);
})();
