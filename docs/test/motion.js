// Site motion: Lenis smooth scrolling + GSAP/ScrollTrigger.
// Content is visible by default: everything here only adds motion once the scripts have loaded.
// - One authored moment: a meteor streaks across the home wordmark and writes it in (the manifesto's
//   "劃下一道最亮眼的光芒"), then the ✦ under it ignites.
// - Continuity: a short, quiet entrance when the page changes (go() → history.replaceState).
// - Restrained reveals tied to meaning: heading rules draw in like star trails, pledge quotes come into
//   focus, the cabinet cards arrive as a list.
// prefers-reduced-motion: no smooth scrolling, no travel; only opacity changes remain.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger, lenis = null;
  if (G && ST) G.registerPlugin(ST);

  if (window.Lenis && !reduce) {
    lenis = window.AeLenis = new window.Lenis({
      autoRaf: !G, lerp: .11, anchors: { offset: -74 },
      // Stops itself while something sets overflow:hidden on <html> (the photo game, open member cards).
      autoToggle: true, allowNestedScroll: true,
      prevent: function (n) { return !!(n.closest && n.closest('.leaflet-container,.aepc-root')); },
    });
    if (G) {
      if (ST) lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    }
  }
  if (!G || !ST) return;

  var EXPO = 'expo.out';
  function root() { return document.querySelector('[data-lang]'); }
  function pageNodes(r) {
    return [].filter.call(r.children, function (c, i) {
      if (!i || c.tagName === 'FOOTER') return false;
      var cs = getComputedStyle(c); return cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'sticky';
    });
  }

  function meteor(h1) {
    var sec = h1.closest('section'); if (!sec) return;
    var star = [].find.call(sec.querySelectorAll('span'), function (s) { return s.textContent.trim() === '✦'; });
    ST.create({
      trigger: h1, start: 'top 85%', once: true,
      onEnter: function () {
        if (reduce) { G.fromTo(h1, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power1.out', clearProps: 'opacity' }); return; }
        var sr = sec.getBoundingClientRect(), r = h1.getBoundingClientRect();
        var x0 = r.left - sr.left - 30, x1 = r.right - sr.left + 26, y0 = r.top - sr.top + r.height * .22, y1 = r.top - sr.top + r.height * .62;
        var m = document.createElement('div'); m.className = 'ae-meteor'; m.setAttribute('aria-hidden', 'true'); sec.appendChild(m);
        var tl = G.timeline({ onComplete: function () { m.remove(); G.set(h1, { clearProps: 'clipPath' }); } });
        G.set(m, { x: x0, y: y0, rotation: Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI });
        tl.fromTo(h1, { clipPath: 'inset(-45% 100% -45% 0%)' }, { clipPath: 'inset(-45% 0% -45% 0%)', duration: 1.2, ease: 'power3.inOut' }, 0)
          .fromTo(m, { opacity: 0 }, { opacity: 1, duration: .18, ease: 'none' }, 0)
          .to(m, { x: x1, y: y1, duration: 1.2, ease: 'power3.inOut' }, 0)
          .to(m, { opacity: 0, scaleX: .2, duration: .4, ease: 'power2.out' }, 1.05);
        if (star) tl.fromTo(star, { scale: .3, rotation: -120, opacity: .2 }, { scale: 1, rotation: 0, opacity: 1, duration: .8, ease: EXPO, clearProps: 'transform,opacity' }, .95);
      },
    });
  }

  function reveals(r) {
    // Heading rules: the 1px line beside each section heading draws in from the heading.
    [].forEach.call(r.querySelectorAll('h2 + span'), function (s) {
      var st = s.getAttribute('style') || ''; if (st.indexOf('height:1px') < 0) return;
      G.fromTo(s, { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: reduce ? .01 : 1.1, ease: EXPO, clearProps: 'transform', scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
    });
    // Pledge quotes come into focus.
    [].forEach.call(r.querySelectorAll('blockquote'), function (q) {
      G.fromTo(q, reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: .8, ease: EXPO, clearProps: 'transform,filter,opacity', scrollTrigger: { trigger: q, start: 'top 88%', once: true } });
    });
    // Cabinet cards arrive as a list (transforms cleared afterwards so an opened card can go position:fixed).
    var mems = r.querySelectorAll('.mem');
    if (mems.length) {
      G.set(mems, { opacity: 0, y: reduce ? 0 : 26 });
      ST.batch(mems, {
        start: 'top 92%', once: true, interval: .08, batchMax: 5,
        onEnter: function (b) { G.to(b, { opacity: 1, y: 0, duration: .7, ease: EXPO, stagger: .07, overwrite: true, clearProps: 'transform,opacity' }); },
      });
    }
  }

  var navT = 0;
  function enter(animate) {
    var r = root(); if (!r) return;
    ST.getAll().forEach(function (t) { t.kill(); });
    if (lenis) { lenis.resize(); lenis.scrollTo(0, { immediate: true, force: true }); }
    if (animate) {
      var nodes = pageNodes(r);
      G.fromTo(nodes, reduce ? { opacity: 0 } : { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: reduce ? .25 : .55, ease: EXPO, stagger: .05, clearProps: 'transform,opacity' });
    }
    var h1 = [].find.call(r.querySelectorAll('section h1'), function (h) { return h.textContent.trim() === 'Aeterna'; });
    if (h1) meteor(h1);
    reveals(r);
    clearTimeout(navT); navT = setTimeout(function () { ST.refresh(); }, 400);
  }

  // go() always ends with history.replaceState; the new page renders on the next frame or two.
  var rs = history.replaceState;
  history.replaceState = function () {
    var out = rs.apply(this, arguments);
    requestAnimationFrame(function () { requestAnimationFrame(function () { enter(true); }); });
    return out;
  };
  // Boot once images have loaded: before that the banner has no height and every trigger would sit
  // inside the first viewport and fire unseen.
  function boot(n) {
    var r = root();
    if (!r || !r.querySelector('section')) { if (n < 200) setTimeout(function () { boot(n + 1); }, 50); return; }
    enter(false);
  }
  if (document.readyState === 'complete') boot(0); else window.addEventListener('load', function () { boot(0); });
})();
