(function () {
  if (window.AeMaskHead) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.AeMaskHead = function (h) {
    var alive = true, raf = 0, t0 = performance.now(), tx = 0, ty = 0, x = 0, y = 0, hover = false, last = t0;
    h.style.backgroundImage = 'linear-gradient(120deg,#3a2b62,#7a55bf 45%,#f3b062 75%,#e07b6a)';
    h.style.backgroundSize = '125% 125%';
    h.style.backgroundPosition = '50% 50%';
    h.style.webkitBackgroundClip = 'text'; h.style.backgroundClip = 'text';
    h.style.color = 'transparent'; h.style.webkitTextFillColor = 'transparent';
    h.style.transition = 'clip-path 1.1s cubic-bezier(.65,0,.35,1), transform 1.1s cubic-bezier(.16,1,.3,1), opacity .6s ease';
    if (!reduce) { h.style.clipPath = 'inset(-0.2em 100% -0.3em -0.2em)'; h.style.transform = 'translateY(.12em)'; h.style.opacity = '.4'; }
    var shown = false;
    function show() { if (shown) return; shown = true; h.style.clipPath = 'inset(-0.2em -0.2em -0.3em -0.2em)'; h.style.transform = 'none'; h.style.opacity = '1'; io.disconnect(); }
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) show(); }, { threshold: .25 });
    io.observe(h);
    requestAnimationFrame(function () { var rc = h.getBoundingClientRect(); if (rc.bottom > 0 && rc.top < (window.innerHeight || 800)) setTimeout(show, 60); });
    setTimeout(show, 1200);
    function applySnap() {
      if (!window.AePhotoSnap) return setTimeout(applySnap, 400);
      window.AePhotoSnap(0, 1400, 600).then(function (url) { if (url && h.isConnected) h.style.backgroundImage = 'url("' + url + '")'; }).catch(function () {});
    }
    applySnap();
    function frame(now) {
      raf = 0; if (!alive) return;
      var dt = Math.min(.05, (now - last) / 1000), c = (now - t0) / 1000; last = now;
      var dx = reduce ? 0 : Math.sin(c * .21) * 3, dy = reduce ? 0 : Math.cos(c * .17) * 2;
      var k = 1 - Math.exp(-dt / .18);
      x += (tx + dx - x) * k; y += (ty + dy - y) * k;
      h.style.backgroundPosition = (50 + x).toFixed(2) + '% ' + (50 + y).toFixed(2) + '%';
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    function move(e) { var r = h.getBoundingClientRect(); tx = -((e.clientX - r.left) / r.width * 2 - 1) * 8; ty = -((e.clientY - r.top) / r.height * 2 - 1) * 8; }
    function leave() { tx = ty = 0; }
    h.addEventListener('pointermove', move); h.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(frame);
    return function () { alive = false; cancelAnimationFrame(raf); io.disconnect(); h.removeEventListener('pointermove', move); h.removeEventListener('pointerleave', leave); };
  };
})();
