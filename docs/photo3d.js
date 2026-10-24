(function () {
  if (window.customElements.get('ae-photo-cam')) return;
  var URL3 = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var p3; function three() { return p3 || (p3 = import(URL3)); }
  var URLG = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
  // GLTFLoader imports bare 'three'; the importmap in index.html points it at URL3 so only one copy loads.
  function glb(url) {
    var c = window.__aeGLB || (window.__aeGLB = {});
    return c[url] || (c[url] = import(URLG).then(function (m) { return new m.GLTFLoader().loadAsync(new URL(url, document.baseURI).href); }).then(function (g) { return g.scene; }));
  }
  var leatherDone = false;
  // GLB cameras (models/*.glb, built by tools/build-models.mjs); falls back to the procedural builds below.
  function loadCams(T) {
    return Promise.all([glb('models/camera-vintage.glb'), glb('models/camera-modern.glb')]).then(function (a) {
      var old = a[0].clone(), nw = a[1].clone();
      if (!leatherDone) {
        leatherDone = true;
        old.traverse(function (o) { if (o.isMesh && o.material.name === 'Leather') { var t = leatherTex(T); t.repeat.set(1.6, 1.6); o.material.map = o.material.bumpMap = t; o.material.bumpScale = .025; o.material.needsUpdate = true; } });
        nw.traverse(function (o) { if (o.isMesh && o.material.name === 'grip') { var t = leatherTex(T); t.repeat.set(3, 3); o.material.bumpMap = t; o.material.bumpScale = .6; o.material.needsUpdate = true; } });
      }
      return [old, nw];
    }).catch(function (e) { console.warn(e); return [buildCam(T), buildModern(T)]; });
  }
  function leatherTex(T) {
    var cv = document.createElement('canvas'), x, y; cv.width = cv.height = 64;
    var cx = cv.getContext('2d'), im = cx.createImageData(64, 64);
    for (y = 0; y < 64; y++) for (x = 0; x < 64; x++) { var i = (y * 64 + x) * 4, v = 165 + vn(x * .7, y * .7) * 60 + hash(x, y) * 30; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    cx.putImageData(im, 0, 0);
    var tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  function el(tag, css, text) { var d = document.createElement(tag); d.style.cssText = css; if (text != null) d.textContent = text; return d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(x, z) { var s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vn(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    var a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { return vn(x * .07, z * .07) * .6 + vn(x * .15 + 10, z * .15) * .3 + vn(x * .3 + 40, z * .3) * .1; }

  var TX = {
    en: { hint: 'Tap the camera to play', fail: 'The mini game needs WebGL to run.', brief: 'Recreate this photo', briefBody: 'Walk the island, set the time of day and the season, then line up the same shot and press the shutter.', start: 'Start', target: 'Target', ghost: 'Ghost', time: 'Time', season: 'Season', seasons: ['Spring', 'Summer', 'Autumn', 'Winter'], newShot: 'New shot', shoot: 'Shutter', retry: 'Try again', next: 'Next shot', yours: 'Your shot', score: 'Score', pos: 'Position', angle: 'Angle', close: 'Close', keys: 'WASD / arrows to move · Space to jump · Shift to sprint · click the view to look around (Esc frees the mouse) · click or F to shoot · Q/E change time · 1–4 change season · T to inspect', touch: 'Joystick to move · drag to look · ▲ to jump', jump: 'Jump',
      inspect: 'Inspect', talkTo: 'Talk', chairName: 'Chair', chair: 'A normal chair.', leave: 'Go away', chairs: 'Chairs', sit: 'Sit', stand: 'Stand up',
      want: 'It looks like it wants to say something… Perhaps you should find another chair? ({n}/{N} chairs found)',
      last: 'That’s every chair! ({N}/{N} chairs found) …All over the island, the chairs have started to shake.',
      again: 'It shakes again, happy to see you. It has already said all it can. ({n}/{N} chairs found)',
      // Each hidden chair has its own reaction to "?" (q) and to being sat on (s).
      cq: { porch: 'This chair is right outside the cabin, in plain sight. Maybe that’s the best hiding spot of all.', beach: 'The chair stares out to sea, perfectly still, as if waiting for the storm that is approaching.', mill: 'The chair creaks in time with the sails. Creak… creak-creak… It might be Morse code.', class: 'This is the teacher’s chair. It clears its throat… and decides class is dismissed.', cave: 'Its creak echoes around the cave. Creak… eak… eak… It seems pleased with the acoustics.', maze: 'The chair looks relieved. It has been trying to find the way out for a very long time.', light: 'This chair has been guarding the lighthouse all by itself. It wobbles, proudly.', green: 'Surrounded by plants, the chair waves a leaf at you. Plants, it seems to say, make a great photo subject.' },
      cs: { porch: 'You sit down in front of the cabin. There’s plenty of open space around here.', beach: 'You sit and watch the waves roll in. For some reason, you feel… motivated.', mill: 'It’s dusty in here and smells of flour. Above you, the sails turn and turn.', class: 'You sit at the front of the class. Every desk is facing you. Suddenly you remember some unfinished homework.', cave: 'Cool and quiet. The lantern flickers. A good place to hide from homework.', maze: 'You sit in the middle of the maze, hedges on every side. You may need a moment to remember the way out.', light: 'It’s a tight squeeze. The lamp hums somewhere above you, and you can hear the waves.', green: 'Warm, green and full of leaves. You think about framing a shot of that fern.' },
      dq: '…Nothing happens. It really is just a normal chair.', ds: 'You sit. It is a perfectly ordinary classroom chair.',
      charis: 'Charis · President', ch1: 'Thank you for finding all my chairs 😍', ch2: 'Dun dun dun… da-CHAIR! To thank you, let me give you a chance to enter the photography competition!',
      ch3: 'And if you ask me, Chairs, whether the competition photo has to have flowers in it 🤔', ch4: 'I’ll tell you: I don’t know. Because I’m not Chairs, I’m Charis ☺️',
      ch5: 'Just kidding! Your photo only needs plants as its theme. It doesn’t have to be flowers~',
      ch6: 'Oh, and I’ve unlocked two bonus shots, and I’m in both of them. Come and find me!', ch7: 'Back for the bonus shots? Pick one, I’ll be in the picture.',
      secretWho: 'Charis · psst', secret: 'Psst… go back to “About us” and take another look at my card. I think it’s got a little shinier ✨', ha: 'Ha…', yay: 'Yay!', show: 'Show me', later: 'Later', comp: 'Competition details', reset: 'Hide the chairs again', bonus: 'Bonus shot',
      msgs: ['Spot on!', 'So close!', 'Getting there', 'Keep exploring'],
      hints: { pos: 'Walk to where the photographer stood.', angle: 'Turn to frame it the same way.', earlier: 'Try an earlier hour.', later: 'Try a later hour.', season: 'Check the season.', none: 'Perfect match.' } },
    zh: { hint: '撳一下相機開始玩', fail: '此小遊戲需要 WebGL 支援。', brief: '重拍這張相片', briefBody: '在島上走走，調好時間和季節，對準同一個角度再按快門。', start: '開始', target: '目標', ghost: '疊影', time: '時間', season: '季節', seasons: ['春', '夏', '秋', '冬'], newShot: '換一張', shoot: '快門', retry: '再試', next: '下一張', yours: '你的相片', score: '分數', pos: '位置', angle: '角度', close: '關閉', keys: 'WASD／方向鍵移動 · 空白鍵跳 · Shift 疾跑 · 點擊畫面用滑鼠轉視角（Esc 釋放滑鼠）· 點擊或 F 拍照 · Q/E 調時間 · 1–4 換季節 · T 查看', touch: '搖桿移動 · 拖動轉視角 · ▲ 跳', jump: '跳',
      inspect: '查看', talkTo: '對話', chairName: '椅子', chair: '一張普通的椅子。', leave: '走開', chairs: '椅子', sit: '坐下', stand: '站起來',
      want: '它好像想說些什麼……或許你應該去找另一張椅子？（已找到 {n}/{N} 張椅子）',
      last: '全部椅子都找到了！（已找到 {N}/{N} 張椅子）……島上各處的椅子一起震動起來。',
      again: '它又震了一下，好像很高興再見到你。它想說的都已經說完了。（已找到 {n}/{N} 張椅子）',
      cq: { porch: '這張椅子就放在小屋門外，光明正大。也許這才是最好的藏身之處。', beach: '這張椅子一動不動地望著大海，彷彿在等待一場正在逼近的風暴。', mill: '椅子隨著風車的節奏吱吱作響：吱……吱吱……說不定是摩斯密碼。', class: '這是老師的椅子。它清了清喉嚨……然後決定提早下課。', cave: '它的吱吱聲在山洞裡迴盪：吱……吱……吱……它似乎很滿意這裡的回音。', maze: '椅子看起來鬆了一口氣。它好像已經在這裡找出口找了很久很久。', light: '這張椅子一直獨自看守著燈塔。它驕傲地晃了一晃。', green: '被植物包圍的椅子向你揮了揮一片葉子，好像在說：植物，是很好的拍攝題材。' },
      cs: { porch: '你在小屋前坐了下來。這附近空曠得很。', beach: '你坐下來看著海浪一下一下拍上岸。不知為何，你忽然覺得……充滿動力。', mill: '這裡滿是塵埃，還有一陣麵粉味。頭頂的風車一直在轉。', class: '你坐在講台前，每張書桌都對著你。你突然想起還有功課未做。', cave: '清涼又安靜，燈籠的火光一閃一閃。是躲避功課的好地方。', maze: '你坐在迷宮正中央，四面都是樹籬。你可能需要想一想回去的路。', light: '空間有點窄。頭頂的燈在嗡嗡作響，你聽得見海浪聲。', green: '溫暖、翠綠，到處都是葉子。你開始構思怎樣替那棵蕨類植物拍一張相。' },
      dq: '……甚麼也沒有發生。它真的只是一張普通的椅子。', ds: '你坐了下來。這是一張再普通不過的課室椅子。',
      charis: 'Charis · 主席', ch1: '多謝你幫我搵返齊啲凳啊 😍', ch2: '登 登 登 凳...... 為咗報答你，就等我送一個參加攝影比賽嘅機會俾你啦！',
      ch3: '如果你問我 Chairs，個攝影比賽係咪一定要有「花」🤔', ch4: '我會答你，我唔知道，因為我唔係 Chairs，係 Charis ☺️',
      ch5: 'Just kidding！比賽相片只要係以植物為主題就可以，唔一定係花架～',
      ch6: '另外，我仲解鎖咗兩張特別相片，兩張都有我㗎！快啲嚟搵我啦～', ch7: '返嚟影特別相片？揀一張啦，我會喺相入面等你㗎。',
      secretWho: 'Charis · 悄悄話', secret: '噓……偷偷話你知，返去「關於我們」再睇吓我張卡，佢好似閃咗啲喎 ✨', ha: '哈……', yay: '好呀！', show: '去看看', later: '遲啲先', comp: '比賽詳情', reset: '把椅子放回原位', bonus: '特別相片',
      msgs: ['完美重現！', '非常接近！', '有點樣子了', '繼續探索'],
      hints: { pos: '走到拍攝者站的位置。', angle: '轉一轉，對準同一構圖。', earlier: '試試早一點的時間。', later: '試試晚一點的時間。', season: '季節好像不對。', none: '完全吻合。' } },
  };
  var FONT = "'Inter',sans-serif", SERIF = "'Marcellus','Noto Serif TC',serif";
  var PILL_L = "all:unset;box-sizing:border-box;cursor:pointer;padding:7px 14px;border:1px solid #cdb6f2;border-radius:999px;background:rgba(250,246,255,.92);color:#3a2b62;font-family:" + FONT + ";font-size:12px;letter-spacing:.04em;white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)";
  var PILL = "all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 16px;border:1px solid rgba(205,182,242,.28);border-radius:999px;background:rgba(20,14,42,.62);color:#faf6ff;font-family:" + FONT + ";font-size:12.5px;font-weight:500;letter-spacing:.04em;white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)";
  var GOLD = "all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 26px;border-radius:999px;background:linear-gradient(150deg,#fbc75a,#eb9a12);color:#2e2352;font-family:" + FONT + ";font-size:14px;font-weight:600;letter-spacing:.06em;box-shadow:0 10px 24px rgba(235,154,18,.3)";
  var KICK = "font-family:" + FONT + ";font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#fbc75a";

  var CSS = '.aepc-root button:focus-visible,.aepc-root input:focus-visible{outline:2px solid #fbc75a;outline-offset:2px}' +
    '.aepc-btn{transition:background-color .15s ease,border-color .15s ease,color .15s ease,transform .12s ease,filter .15s ease}' +
    '.aepc-btn:not(.aepc-gold):hover{background-color:rgba(58,43,98,.88)!important;border-color:rgba(251,199,90,.55)!important}' +
    '.aepc-gold:hover{filter:brightness(1.07)}.aepc-btn:active{transform:scale(.97)}' +
    '.aepc-seg{transition:color .15s ease,background .2s ease}.aepc-seg:hover{color:#faf6ff!important}' +
    '.aepc-thumb:hover{transform:rotate(0deg) scale(1.04)!important}.aepc-shut:hover>span{transform:scale(.95)}' +
    '.aepc-range{-webkit-appearance:none;appearance:none;background:transparent}' +
    '.aepc-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(90deg,#1b2150 0%,#262a62 20%,#e98f8a 26%,#f6c27a 29%,#8fc2ee 38%,#a6d4f6 62%,#f3b062 72%,#e07b6a 77%,#4a3672 82%,#1b2150 100%)}' +
    '.aepc-range::-moz-range-track{height:6px;border-radius:999px;background:linear-gradient(90deg,#1b2150 0%,#262a62 20%,#e98f8a 26%,#f6c27a 29%,#8fc2ee 38%,#a6d4f6 62%,#f3b062 72%,#e07b6a 77%,#4a3672 82%,#1b2150 100%)}' +
    '.aepc-range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;margin-top:-7px;border-radius:50%;background:#faf6ff;border:3px solid #fbc75a;box-shadow:0 2px 10px rgba(0,0,0,.45),0 0 0 4px rgba(251,199,90,.15)}' +
    '.aepc-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#faf6ff;border:3px solid #fbc75a;box-shadow:0 2px 10px rgba(0,0,0,.45)}' +
    '@keyframes aepc-blink{50%{opacity:.2}}@keyframes aepc-in{from{opacity:0;transform:translateY(16px) scale(.98)}}' +
    '@keyframes aepc-pop{from{opacity:0;transform:translateY(26px) rotate(0deg)}}' +
    '@keyframes aepc-dev{from{filter:brightness(1.9) saturate(0) contrast(.6) blur(4px)}to{filter:none}}' +
    '@media (prefers-reduced-motion:reduce){.aepc-root *{animation:none!important}}';
  function css() { if (document.getElementById('aepc-css')) return; var t = document.createElement('style'); t.id = 'aepc-css'; t.textContent = CSS; document.head.appendChild(t); }
  var IC = {
    spring: '<circle cx="12" cy="7" r="3"></circle><circle cx="16.8" cy="10.5" r="3"></circle><circle cx="15" cy="16" r="3"></circle><circle cx="9" cy="16" r="3"></circle><circle cx="7.2" cy="10.5" r="3"></circle><circle cx="12" cy="12" r="1.4" fill="currentColor"></circle>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"></path>',
    leaf: '<path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z"></path><path d="M5 19l8-8"></path>',
    snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"></path>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path>',
    ghost: '<rect x="3" y="8" width="12" height="10" rx="1.5"></rect><rect x="9" y="4" width="12" height="10" rx="1.5" stroke-dasharray="2.4 2.4"></rect>',
    close: '<path d="M6 6l12 12M18 6L6 18"></path>',
    chair: '<path d="M7 3v18M7 13h10v8M7 7.5h5"></path>',
    shuffle: '<path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.9-1.6 4-3.6M13.5 9.6C14.6 8 15.8 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3"></path>'
  };
  function ico(n, z) { return '<svg width="' + z + '" height="' + z + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function btn(c, html, cls) { var b = el('button', c); b.className = cls || 'aepc-btn'; b.innerHTML = html; return b; }
  var CARD = 'display:flex;flex-direction:column;gap:16px;max-height:100%;overflow:auto;padding:clamp(16px,2.6vw,24px);border-radius:20px;background:linear-gradient(165deg,#251b4b,#160f2e 70%);border:1px solid rgba(205,182,242,.18);box-shadow:0 40px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(250,246,255,.06);scrollbar-width:thin;scrollbar-color:rgba(205,182,242,.3) transparent;animation:aepc-in .45s cubic-bezier(.2,.8,.2,1) both';
  var POLA = 'background:#f6f1ea;border-radius:4px;box-shadow:0 16px 36px rgba(0,0,0,.45)';

  // ---------- Procedural camera models (fallback when the GLBs can't load) ----------
  function buildCam(T) {
    var g = new T.Group(), x, y;
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var cx = cv.getContext('2d'), im = cx.createImageData(64, 64);
    for (y = 0; y < 64; y++) for (x = 0; x < 64; x++) { var i = (y * 64 + x) * 4, v = 165 + vn(x * .7, y * .7) * 60 + hash(x, y) * 30; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    cx.putImageData(im, 0, 0);
    var tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 1);
    var leather = new T.MeshStandardMaterial({ color: '#4a3880', map: tex, bumpMap: tex, bumpScale: .03, roughness: .85 });
    var metal = new T.MeshStandardMaterial({ color: '#ebe4f8', roughness: .3, metalness: .35 });
    var dark = new T.MeshStandardMaterial({ color: '#221a3c', roughness: .45, metalness: .3 });
    var gold = new T.MeshStandardMaterial({ color: '#f2b544', roughness: .3, metalness: .45, emissive: '#5a3500', emissiveIntensity: .25 });
    var glass = new T.MeshStandardMaterial({ color: '#28245e', emissive: '#3b3290', emissiveIntensity: .5, roughness: .08, metalness: .6 });
    function box(w, h, d, x, y, z, m) { var b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }
    function cyl(r, h, x, y, z, m, front) { var c = new T.Mesh(new T.CylinderGeometry(r, r, h, 44), m); if (front) c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }
    box(2.4, 1.5, 1.2, 0, -.05, 0, leather); cyl(.6, 1.5, -1.2, -.05, 0, leather); cyl(.6, 1.5, 1.2, -.05, 0, leather);
    box(2.4, .42, 1.28, 0, .88, 0, metal); cyl(.64, .42, -1.2, .88, 0, metal); cyl(.64, .42, 1.2, .88, 0, metal);
    box(2.4, .2, 1.28, 0, -.9, 0, metal); cyl(.64, .2, -1.2, -.9, 0, metal); cyl(.64, .2, 1.2, -.9, 0, metal);
    box(.12, .22, .2, -1.88, .72, 0, metal); box(.12, .22, .2, 1.88, .72, 0, metal);
    box(.62, .24, .04, -1.0, .9, .64, glass); box(.3, .24, .04, .62, .9, .64, glass);
    box(.62, .07, .02, -1.0, .5, .61, gold);
    cyl(.08, .04, 1.02, .46, .61, new T.MeshStandardMaterial({ color: '#e8930f', emissive: '#e8930f', emissiveIntensity: .6 }), true);
    cyl(.24, .06, 1.05, 1.12, .2, dark); cyl(.16, .14, 1.05, 1.19, .2, gold);
    cyl(.3, .16, .42, 1.17, -.05, dark); box(.05, .02, .12, .42, 1.26, .18, gold);
    cyl(.28, .18, -1.15, 1.18, 0, metal); cyl(.1, .08, -1.15, 1.3, 0, dark);
    box(.5, .07, .42, -.28, 1.125, 0, dark);
    cyl(.8, .12, 0, -.1, .66, metal, true);
    cyl(.68, .36, 0, -.1, .88, dark, true);
    cyl(.72, .16, 0, -.1, .88, gold, true);
    cyl(.62, .14, 0, -.1, 1.12, metal, true);
    cyl(.58, .12, 0, -.1, 1.24, dark, true);
    cyl(.46, .04, 0, -.1, 1.29, glass, true);
    cyl(.3, .02, 0, -.1, 1.305, new T.MeshStandardMaterial({ color: '#4b3fa8', emissive: '#2c2380', roughness: .05, metalness: .8 }), true);
    box(.12, .12, .01, -.16, .06, 1.32, new T.MeshBasicMaterial({ color: '#faf6ff' }));
    box(.06, .06, .01, .02, .1, 1.32, new T.MeshBasicMaterial({ color: '#cdb6f2' }));
    return g;
  }

  function buildModern(T) {
    var g = new T.Group();
    var body = new T.MeshStandardMaterial({ color: '#1c1a22', roughness: .55, metalness: .25 });
    var grip = new T.MeshStandardMaterial({ color: '#141218', roughness: .9, metalness: 0 });
    var gun = new T.MeshStandardMaterial({ color: '#3a3842', roughness: .35, metalness: .6 });
    var silver = new T.MeshStandardMaterial({ color: '#d9d6e0', roughness: .25, metalness: .7 });
    var gold = new T.MeshStandardMaterial({ color: '#f2b544', roughness: .3, metalness: .45, emissive: '#5a3500', emissiveIntensity: .25 });
    var glass = new T.MeshStandardMaterial({ color: '#141a3e', emissive: '#2a3a9a', emissiveIntensity: .55, roughness: .05, metalness: .8 });
    function box(w, h, d, x, y, z, m) { var b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }
    function cyl(r, h, x, y, z, m, front, seg) { var c = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 48), m); if (front) c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }
    box(3.0, 1.62, .9, 0, -.08, 0, body);
    cyl(.2, 1.62, -1.5, -.08, .25, body); cyl(.2, 1.62, -1.5, -.08, -.25, body); box(.4, 1.62, .5, -1.5, -.08, 0, body);
    box(.72, 1.66, .55, 1.16, -.08, .5, grip); cyl(.36, 1.66, 1.48, -.08, .52, grip);
    box(1.1, .44, .84, 0, .92, -.04, body); box(.76, .2, .62, 0, 1.22, -.08, body);
    box(.5, .06, .4, 0, 1.35, -.08, gun);
    cyl(.27, .16, -.92, .82, 0, gun, false, 36); cyl(.24, .04, -.92, .91, 0, silver, false, 36);
    cyl(.24, .14, .92, .8, -.12, gun, false, 36);
    cyl(.17, .08, 1.3, .79, .5, silver, false, 32); cyl(.2, .03, 1.3, .755, .5, gun, false, 32);
    cyl(.06, .03, -1.15, .45, .46, new T.MeshStandardMaterial({ color: '#e8930f', emissive: '#e8930f', emissiveIntensity: .7 }), true);
    cyl(.82, .1, 0, -.12, .5, silver, true);
    cyl(.86, .03, 0, -.12, .56, gold, true);
    cyl(.74, .36, 0, -.12, .76, body, true);
    var rib = cyl(.77, .3, 0, -.12, 1.06, grip, true, 28);
    cyl(.72, .12, 0, -.12, 1.27, gun, true);
    cyl(.7, .06, 0, -.12, 1.36, body, true);
    cyl(.56, .03, 0, -.12, 1.39, glass, true);
    cyl(.28, .02, 0, -.12, 1.405, new T.MeshStandardMaterial({ color: '#2d2470', emissive: '#4a3cc0', emissiveIntensity: .5, roughness: .05, metalness: .9 }), true);
    box(.1, .1, .01, -.2, .1, 1.41, new T.MeshBasicMaterial({ color: '#faf6ff' }));
    return g;
  }

  class AePhotoCam extends HTMLElement {
    static get observedAttributes() { return ['locale']; }
    attributeChangedCallback() { if (this._hint) this._hint.textContent = this.L.hint; }
    get loc() { return this.getAttribute('locale') === 'en' ? 'en' : 'zh'; }
    get L() { return TX[this.loc]; }
    connectedCallback() {
      if (this._built) { this._go(); return; }
      this._built = true;
      this.loopOnly = this.getAttribute('mode') === 'loop';
      this.style.cssText += ';display:block;position:relative;width:100%;height:100%;user-select:none;-webkit-user-select:none';
      if (!this.loopOnly) {
        this.appendChild(el('div', 'position:absolute;left:50%;bottom:7%;width:50%;height:9%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(58,43,98,.28),rgba(58,43,98,0) 70%);pointer-events:none'));
        this.style.cursor = 'pointer';
      }
      var self = this;
      three().then(function (T) { return loadCams(T).then(function (m) { self._init(T, m[0], m[1]); }); }).catch(function () {
        if (!self.loopOnly) self.appendChild(el('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:' + FONT + ';font-size:13px;color:#5f5088', self.L.fail));
      });
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; if (this._pm) { window.removeEventListener('pointermove', this._pm); document.removeEventListener('pointerout', this._po); this._pm = null; } }
    snap() { if (!this.r || !this.rtA || !this.clientWidth) return null; this._veil(performance.now(), 0); return this.r.domElement; }
    _veilInit(T) {
      var self = this, bd = new Uint8Array(256), x, y;
      for (y = 0; y < 8; y++) for (x = 0; x < 8; x++) { var v = x ^ y, m = ((v & 1) << 5) | ((y & 1) << 4) | ((v & 2) << 2) | ((y & 2) << 1) | ((v & 4) >> 1) | ((y & 4) >> 2); bd[(y * 8 + x) * 4] = Math.floor((m + .5) / 64 * 255); bd[(y * 8 + x) * 4 + 3] = 255; }
      var bt = new T.DataTexture(bd, 8, 8); bt.magFilter = bt.minFilter = T.NearestFilter; bt.needsUpdate = true;
      this.rtA = new T.WebGLRenderTarget(2, 2, { samples: 4 }); this.rtB = new T.WebGLRenderTarget(2, 2, { samples: 4 });
      var hx = function (h) { var n = parseInt(h.slice(1), 16); return new T.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
      this.vu = { tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture }, tBay: { value: bt }, uRes: { value: new T.Vector2(1, 1) }, uPt: { value: new T.Vector2(-9999, -9999) }, uRad: { value: 0 }, uSoft: { value: .6 }, uCell: { value: 4 }, uFull: { value: 0 }, uRim: { value: .14 },
        uInk: { value: hx('#2e2352') }, uPaper: { value: hx('#f6f1ff') }, uRimC: { value: hx('#fbc75a') } };
      var mat = new T.ShaderMaterial({ uniforms: this.vu, blending: T.NoBlending, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: [
          'uniform sampler2D tA,tB,tBay;uniform vec2 uRes,uPt;uniform float uRad,uSoft,uCell,uFull,uRim;uniform vec3 uInk,uPaper,uRimC;varying vec2 vUv;',
          'float bay(vec2 c){return texture2D(tBay,(mod(c,8.)+.5)/8.).r;}',
          'vec3 toS(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}',
          'void main(){vec2 px=gl_FragCoord.xy;vec2 cell=floor(px/uCell);vec2 cuv=(cell+.5)*uCell/uRes;',
          'vec4 o=texture2D(tA,cuv);float da=step(.5,o.a);vec3 oc=toS(o.rgb/max(o.a,.001));',
          'float l=dot(oc,vec3(.2126,.7152,.0722));l=pow(clamp((l-.5)*1.2+.55,0.,1.),1.25);',
          'vec3 dc=mix(uInk,uPaper,step(bay(cell),l));vec4 col=vec4(dc*da,da);',
          'vec4 n=texture2D(tB,vUv);vec4 nc=vec4(toS(n.rgb/max(n.a,.001))*n.a,n.a);float na=step(.5,texture2D(tB,cuv).a);',
          'float m=max(clamp((uRad-distance((cell+.5)*uCell,uPt))/max(uRad*uSoft,1.),0.,1.),uFull);',
          'float lo=bay(cell.yx)*(1.-uRim);',
          'if(m>lo&&uRim>0.&&max(da,na)>0.)col=vec4(uRimC,1.);',
          'if(m>lo+uRim)col=nc;',
          'gl_FragColor=col;}'].join('') });
      this.vs = new T.Scene(); this.vs.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat)); this.vc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this._vx = this._vy = this._vr = 0; this._vInit = false; this._full = 0;
      this._pm = function (e) { if (e.pointerType === 'touch') return; self._px = e.clientX; self._py = e.clientY; self._pIn = true; self._pSeen = true; };
      this._po = function (e) { if (!e.relatedTarget) self._pIn = false; };
      window.addEventListener('pointermove', this._pm, { passive: true }); document.addEventListener('pointerout', this._po, { passive: true });
    }
    _veil(t, dt) {
      var r = this.r, U = this.vu, rc = this.getBoundingClientRect(), w = rc.width, h = rc.height, dpr = r.getPixelRatio(), mn = Math.min(w, h), tx, ty, tr = 0;
      this._full = this.zoom ? Math.min(1, this._full + dt * 3) : Math.max(0, this._full - dt * 2);
      if (coarse || !this._pSeen) {
        var s = t / 1000; tx = w * (.5 + (reduce ? 0 : .3 * Math.sin(s * .53) + .06 * Math.sin(s * 1.31 + .6))); ty = h * (.5 + (reduce ? 0 : .2 * Math.sin(s * .71 + 1.1) + .05 * Math.cos(s * 1.57)));
        tr = reduce ? 0 : mn * .24;
      } else {
        tx = this._px - rc.left; ty = this._py - rc.top;
        var dOut = Math.hypot(Math.max(rc.left - this._px, 0, this._px - rc.right), Math.max(rc.top - this._py, 0, this._py - rc.bottom));
        var prox = this._pIn ? 1 - clamp(dOut / 260, 0, 1) : 0, c = 1 - clamp(Math.hypot(tx - w / 2, ty - h / 2) / (mn * .5), 0, 1);
        tr = mn * .34 * sstep(0, 1, prox) + (dOut > 0 ? 0 : Math.hypot(w, h) * sstep(.5, 1, c));
      }
      if (!this._vInit) { this._vx = tx; this._vy = ty; this._vInit = true; }
      var kf = 1 - Math.exp(-dt / .06), kr = 1 - Math.exp(-dt / .2);
      this._vx += (tx - this._vx) * kf; this._vy += (ty - this._vy) * kf; this._vr += (tr - this._vr) * kr;
      U.uPt.value.set(this._vx * dpr, (h - this._vy) * dpr); U.uRad.value = this._vr * dpr; U.uFull.value = this._full;
      U.uCell.value = Math.max(2, Math.round(2 * dpr));
      r.setClearColor(0, 0);
      if (this._full < 1) { this.oldCam.visible = true; this.newCam.visible = false; r.setRenderTarget(this.rtA); r.render(this.scene, this.cam); }
      if (this._vr > .5 || this._full > 0) { this.oldCam.visible = false; this.newCam.visible = true; r.setRenderTarget(this.rtB); r.render(this.scene, this.cam); }
      r.setRenderTarget(null); r.render(this.vs, this.vc);
    }
    _init(T, m, nm) {
      this.T = T;
      try { this.r = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
      var r = this.r; r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(r.domElement);
      var sc = this.scene = new T.Scene();
      this.cam = new T.PerspectiveCamera(30, 1, .1, 100);
      sc.add(new T.HemisphereLight('#f3ecff', '#3a2b62', 1.7));
      var k = new T.DirectionalLight('#ffffff', 2.3); k.position.set(-4, 6, 8); sc.add(k);
      var rim = new T.DirectionalLight('#fbc75a', 2); rim.position.set(5, 2, -6); sc.add(rim);
      var fil = new T.DirectionalLight('#b490ef', 1.1); fil.position.set(-6, -2, 4); sc.add(fil);
      this.pivot = new T.Group(); m.position.set(0, -.15, -.3); this.pivot.add(m); sc.add(this.pivot);
      nm.position.copy(m.position); this.pivot.add(nm); this.oldCam = m; this.newCam = nm;
      this._veilInit(T);
      this.pivot.rotation.y = -.6;
      this.dist = 12;
      if (!this.loopOnly) {
        this._hint = el('div', PILL_L + ';position:absolute;left:50%;bottom:2%;transform:translateX(-50%);pointer-events:none', this.L.hint);
        this.appendChild(this._hint);
        this._flash = el('div', 'position:absolute;inset:0;background:#faf6ff;opacity:0;pointer-events:none;border-radius:24px');
        this.appendChild(this._flash);
        var self = this;
        this.addEventListener('click', function () { self._zoomIn(); });
        this.addEventListener('pointerenter', function () { self.hover = true; });
        this.addEventListener('pointerleave', function () { self.hover = false; });
      }
      this._ro = new ResizeObserver(this._size.bind(this)); this._ro.observe(this); this._size();
      var me = this;
      this._io = new IntersectionObserver(function (e) { me._vis = e[0].isIntersecting; }); this._io.observe(this);
      this._go();
    }
    _size() {
      var w = this.clientWidth, h = this.clientHeight; if (!w || !h || !this.r) return;
      this.r.setSize(w, h, false); this.cam.aspect = w / h;
      if (this.rtA) { var bw = Math.round(w * this.r.getPixelRatio()), bh = Math.round(h * this.r.getPixelRatio()); this.rtA.setSize(bw, bh); this.rtB.setSize(bw, bh); this.vu.uRes.value.set(bw, bh); }
      this.dist = (this.loopOnly ? 10.5 : 12) * Math.max(1, 1.05 / (w / h));
      this.cam.updateProjectionMatrix();
      if (!this.zoom) { this.cam.position.set(0, .6, this.dist); this.cam.lookAt(0, .15, 0); }
    }
    _go() {
      if (this._raf || !this.r) return;
      var self = this, last = performance.now();
      var f = function (t) {
        self._raf = 0; if (!self.isConnected) return;
        var dt = Math.min(.05, (t - last) / 1000); last = t;
        if ((self._vis !== false || self.zoom) && !self.paused) self._frame(t, dt);
        self._raf = requestAnimationFrame(f);
      };
      this._raf = requestAnimationFrame(f);
    }
    _frame(t, dt) {
      var p = this.pivot, z = this.zoom;
      if (z) {
        var k = clamp((t - z.t0) / 1150, 0, 1), a = ease(clamp(k / .5, 0, 1)), b = clamp((k - .25) / .75, 0, 1); b = b * b * b;
        p.rotation.y = z.ry + (z.ryT - z.ry) * a; p.rotation.x = z.rx * (1 - a); p.position.y = z.py * (1 - a);
        this.cam.position.set(0, .6 + (-.25 - .6) * b, this.dist + (2.55 - this.dist) * b);
        this.cam.lookAt(0, .15 - .4 * b, 0);
        this._flash.style.opacity = sstep(.72, 1, k);
        if (k >= 1 && !z.done) { z.done = true; this._open(); }
      } else if (!this.game) {
        p.rotation.y += dt * (reduce ? .15 : this.hover ? 1.5 : .55);
        p.rotation.x = .16 + (reduce ? 0 : Math.sin(t / 2100) * .06);
        p.position.y = reduce ? 0 : Math.sin(t / 900) * .08;
      }
      this._veil(t, dt);
    }
    _zoomIn() {
      if (this.zoom || this.game || !this.r) return;
      var ry = this.pivot.rotation.y, TAU = Math.PI * 2, tgt = Math.ceil(ry / TAU) * TAU;
      if (tgt - ry < .5) tgt += TAU;
      this.zoom = { t0: performance.now() - (reduce ? 1150 : 0), ry: ry, ryT: tgt, rx: this.pivot.rotation.x, py: this.pivot.position.y };
    }
    _open() {
      var self = this;
      this.game = new Game(this.T, this.loc, function () {
        self.game = null; self.zoom = null;
        self.pivot.rotation.y = self.pivot.rotation.y % (Math.PI * 2);
        self._size();
        self._flash.style.transition = 'opacity .5s ease'; self._flash.style.opacity = 0;
        setTimeout(function () { self._flash.style.transition = ''; }, 520);
      });
    }
  }
  customElements.define('ae-photo-cam', AePhotoCam);
  var snapP = null;
  window.AePhotoSnap = function (idx, w, h) {
    return snapP || (snapP = three().then(function (T) {
      var g = Object.create(Game.prototype); g.T = T; g.loc = 'zh'; g.L = TX.zh;
      g.stage = el('div', 'position:fixed;left:-99999px;top:0;width:' + w + 'px;height:' + h + 'px;pointer-events:none');
      document.body.appendChild(g.stage);
      g.segBtns = []; g.timeVal = {}; g.timeIco = {}; g.range = { value: 0 }; g._recText = function () {};
      try {
        g._gl(); g._world(); g._resize(); g._challenges();
        var c = g.list[idx % g.list.length];
        g._setSeason(c.season); g._setHour(c.hour);
        g.cam.position.set(c.pos[0], c.pos[1], c.pos[2]); g.cam.lookAt(c.look[0], c.look[1], c.look[2]);
        g._tick(0, true); g.r.render(g.scene, g.cam);
        return g.canvas.toDataURL('image/jpeg', .86);
      } finally { try { g.r.dispose(); g.r.forceContextLoss(); } catch (e) {} g.stage.remove(); }
    }));
  };

  // ---------- Chairs and Charis (the hidden-chair quest) ----------
  function loadSt() { try { var v = JSON.parse(localStorage.getItem('aepc-chairs') || 'null'); if (v && v.f) return v; } catch (e) {} return { f: [], u: 0 }; }
  function saveSt(v) {
    try { localStorage.setItem('aepc-chairs', JSON.stringify(v)); if (v.u) localStorage.setItem('ae-holo-charis', '1'); } catch (e) {}
    try { window.dispatchEvent(new Event('ae-chairs')); } catch (e) {}
  }
  // A plain wooden chair, seat 0.55 high, front facing +Z.
  function buildChair(T, wood, dark) {
    var g = new T.Group();
    function b(w, h, d, x, y, z, m) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); }
    b(.86, .1, .86, 0, .5, 0, wood);
    for (var a = -1; a <= 1; a += 2) { b(.1, .45, .1, a * .36, .225, .36, dark); b(.1, 1.2, .1, a * .36, .6, -.36, dark); }
    b(.86, .1, .1, 0, 1.15, -.36, wood); b(.62, .08, .06, 0, .93, -.36, wood); b(.62, .08, .06, 0, .74, -.36, wood);
    return g;
  }
  // Charis, blocky, from the cabinet photo: hair tied back, round glasses, blue gingham school dress.
  function pix(T, w, h, fn) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d');
    fn(function (px, py, col) { x.fillStyle = col; x.fillRect(px, py, 1, 1); }, w, h);
    var t = new T.CanvasTexture(c); t.magFilter = t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.colorSpace = T.SRGBColorSpace; return t;
  }
  // 4 x 3 body units at 64 px per unit: x from -0.4 to 3.6, y from 20.1 down to 17.1 (body coordinates).
  function badgeTex(T) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 192; var g = c.getContext('2d'), TEAL = '#2a9fc0';
    g.lineCap = g.lineJoin = 'round';
    // Gold pin, then the navy name bar and the red bar below it.
    g.fillStyle = '#e8b23a'; g.beginPath(); g.moveTo(42, 18); g.lineTo(58, 24); g.lineTo(56, 40); g.lineTo(42, 48); g.lineTo(28, 40); g.lineTo(26, 24); g.closePath(); g.fill();
    g.fillStyle = '#b07a12'; g.fillRect(38, 28, 8, 8);
    g.fillStyle = '#2e2f5c'; g.fillRect(12, 60, 64, 22); g.fillStyle = '#f4f2f6'; g.fillRect(18, 66, 30, 4); g.fillRect(18, 73, 44, 3);
    g.fillStyle = '#c0392b'; g.fillRect(12, 94, 64, 20); g.fillStyle = '#f4f2f6'; g.fillRect(16, 98, 22, 12); g.fillStyle = '#2e2f5c'; g.fillRect(20, 101, 6, 6);
    // Shield: flat top dipping slightly in the middle, straight sides, curving to a point.
    g.save(); g.translate(98, 8);
    var sh = function (k) { g.beginPath(); g.moveTo(6 + k, 10 + k); g.quadraticCurveTo(64, 2 + k * 1.6, 122 - k, 10 + k); g.lineTo(122 - k, 70); g.bezierCurveTo(122 - k, 112 - k * .4, 88, 132 - k, 64, 156 - k * 1.5); g.bezierCurveTo(40, 132 - k, 6 + k, 112 - k * .4, 6 + k, 70); g.closePath(); };
    sh(0); g.fillStyle = '#fbfaf6'; g.fill(); g.lineWidth = 6; g.strokeStyle = TEAL; g.stroke();
    sh(11); g.lineWidth = 3; g.stroke();
    // Monogram: a looping Q across the top, with E and S interlaced beneath it.
    g.lineWidth = 6; g.strokeStyle = TEAL;
    g.beginPath(); g.ellipse(64, 52, 33, 17, -.12, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(84, 62); g.quadraticCurveTo(98, 72, 110, 70); g.stroke();
    g.beginPath(); g.moveTo(62, 64); g.bezierCurveTo(36, 56, 26, 78, 46, 82); g.bezierCurveTo(22, 86, 28, 112, 62, 106); g.stroke();
    g.beginPath(); g.moveTo(102, 66); g.bezierCurveTo(80, 56, 68, 78, 84, 84); g.bezierCurveTo(102, 90, 98, 112, 68, 108); g.stroke();
    g.restore();
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function buildCharis(T) {
    var U = 1.75 / 32, HAIR = '#2a1d1b', SKIN = '#f3d3bb', g = new T.Group(), parts = {};
    function ging(P, w, h, ox, oy, y0, y1) { for (var y = y0 || 0; y < (y1 == null ? h : y1); y++) for (var x = 0; x < w; x++) { var a = ((x + (ox || 0)) >> 1) & 1, b = ((y + (oy || 0)) >> 1) & 1; P(x, y, a && b ? '#3a8fcf' : a || b ? '#86c4ea' : '#eef7fc'); } }
    function fill(P, w, h, col, y0, y1) { for (var y = y0 || 0; y < (y1 == null ? h : y1); y++) for (var x = 0; x < w; x++) P(x, y, col); }
    function mat(t) { return new T.MeshLambertMaterial({ map: t }); }
    function box(w, h, d, faces, parent, x, y, z) {
      var m = new T.Mesh(new T.BoxGeometry(w * U, h * U, d * U), faces.map(mat)); m.position.set(x * U, y * U, z * U);
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    }
    function pivot(parent, x, y, z) { var p = new T.Group(); p.position.set(x * U, y * U, z * U); parent.add(p); return p; }
    var body = parts.body = pivot(g, 0, 0, 0);
    // Legs: dress hem, skin, white socks, black shoes.
    var legT = pix(T, 8, 24, function (P, w, h) { ging(P, w, h, 0, 0, 0, 9); fill(P, w, h, SKIN, 9, 16); fill(P, w, h, '#f4f2f6', 16, 21); fill(P, w, h, '#1d1824', 21, 24); });
    var shoe = pix(T, 8, 8, function (P, w, h) { fill(P, w, h, '#1d1824'); }), gtop = pix(T, 8, 8, function (P, w, h) { ging(P, w, h); });
    [-2, 2].forEach(function (x, i) { var lp = parts[i ? 'legR' : 'legL'] = pivot(body, x, 12, 0); box(4, 12, 4, [legT, legT, gtop, shoe, legT, legT], lp, 0, -6, 0); });
    // Skirt flare and torso.
    var sk = pix(T, 20, 10, function (P, w, h) { ging(P, w, h, 1, 0); });
    box(9.4, 5, 5, [sk, sk, gtop, gtop, sk, sk], body, 0, 9.5, 0);
    var front = pix(T, 16, 24, function (P, w, h) {
      ging(P, w, h);
      for (var r = 0; r < 6; r++) { P(3 + r, r, '#ffffff'); P(12 - r, r, '#ffffff'); for (var x = 4 + r; x < 12 - r; x++) if (r < 4) P(x, r, SKIN); }
    });
    var back = pix(T, 16, 24, function (P, w, h) { ging(P, w, h); }), side = pix(T, 8, 24, function (P, w, h) { ging(P, w, h); });
    box(8, 12, 4, [side, side, gtop, gtop, front, back], body, 0, 18, 0);
    var bd = new T.Mesh(new T.PlaneGeometry(4 * U, 3 * U), new T.MeshLambertMaterial({ map: badgeTex(T), transparent: true, alphaTest: .05 }));
    bd.position.set(1.6 * U, 18.6 * U, 2.02 * U); bd.receiveShadow = true; body.add(bd);
    // Arms: short gingham sleeves.
    var armT = pix(T, 6, 24, function (P, w, h) { ging(P, w, h, 0, 0, 0, 8); fill(P, w, h, SKIN, 8, 24); }), skinT = pix(T, 4, 4, function (P, w, h) { fill(P, w, h, SKIN); });
    [-5.5, 5.5].forEach(function (x, i) { var ap = parts[i ? 'armR' : 'armL'] = pivot(body, x, 23, 0); box(3, 12, 4, [armT, armT, gtop, skinT, armT, armT], ap, 0, -5, 0); });
    // Head: fringe swept to one side, strands framing the face, round tinted glasses, a smile.
    var head = parts.head = pivot(body, 0, 24, 0);
    var face = pix(T, 16, 16, function (P, w, h) {
      fill(P, w, h, SKIN);
      fill(P, w, h, HAIR, 0, 4); for (var x = 0; x < 16; x++) if (x < 7 || x > 12) P(x, 4, HAIR); for (x = 0; x < 4; x++) P(x, 5, HAIR);
      for (var y = 4; y < 14; y++) { P(0, y, HAIR); P(15, y, HAIR); if (y < 11) { P(1, y, HAIR); P(14, y, HAIR); } }
      function lens(cx) {
        for (var yy = 6; yy <= 10; yy++) for (var xx = cx - 2; xx <= cx + 2; xx++) {
          var d = Math.abs(xx - cx) + Math.abs(yy - 8); if (d > 3) continue;
          P(xx, yy, d === 3 || (Math.abs(xx - cx) === 2 && yy === 8) ? '#6b5560' : '#ead0c8');
        }
        P(cx, 8, '#2b2030'); P(cx, 9, '#2b2030');
      }
      lens(5); lens(10); P(7, 7, '#6b5560'); P(8, 7, '#6b5560');
      P(3, 11, '#f0aaa3'); P(12, 11, '#f0aaa3'); P(8, 10, '#e2b59c');
      P(6, 12, '#b5585a'); P(7, 13, '#b5585a'); P(8, 13, '#b5585a'); P(9, 12, '#b5585a');
    });
    var hs = pix(T, 16, 16, function (P, w, h) { fill(P, w, h, HAIR); for (var y = 5; y < 16; y++) for (var x = 9; x < 16; x++) if (!(x < 12 && y > 12)) P(x, y, x === 9 && y < 10 ? HAIR : SKIN); for (y = 4; y < 12; y++) P(15, y, HAIR); P(11, 9, '#e7b9a0'); });
    var hs2 = pix(T, 16, 16, function (P, w, h) { fill(P, w, h, HAIR); for (var y = 5; y < 16; y++) for (var x = 0; x < 7; x++) if (!(x > 3 && y > 12)) P(x, y, x === 6 && y < 10 ? HAIR : SKIN); for (y = 4; y < 12; y++) P(0, y, HAIR); P(4, 9, '#e7b9a0'); });
    var hb = pix(T, 16, 16, function (P, w, h) { fill(P, w, h, HAIR); for (var x = 0; x < 16; x += 3) for (var y = 0; y < 16; y++) if ((x + y) % 5 === 0) P(x, y, '#3a2a26'); }), chin = pix(T, 4, 4, function (P, w, h) { fill(P, w, h, SKIN); });
    box(8, 8, 8, [hs, hs2, hb, chin, face, hb], head, 0, 4, 0);
    box(2.6, 6, 2, [hb, hb, hb, hb, hb, hb], head, 0, 2.2, -4.8);
    box(3.2, 1.4, 1.6, [hb, hb, hb, hb, hb, hb], head, 0, 5.4, -4.4);
    // Name tag.
    var nc = document.createElement('canvas'); nc.width = 512; nc.height = 112; var nx = nc.getContext('2d');
    nx.fillStyle = 'rgba(30,21,58,.82)'; nx.beginPath(); if (nx.roundRect) nx.roundRect(6, 10, 500, 92, 46); else nx.rect(6, 10, 500, 92); nx.fill();
    nx.strokeStyle = '#fbc75a'; nx.lineWidth = 4; nx.stroke();
    nx.font = '600 44px Inter, "Noto Sans TC", sans-serif'; nx.textAlign = 'center'; nx.textBaseline = 'middle'; nx.fillStyle = '#fbc75a'; nx.fillText('Charis · 主席', 256, 58);
    var nt = new T.CanvasTexture(nc); nt.colorSpace = T.SRGBColorSpace;
    var tag = parts.tag = new T.Sprite(new T.SpriteMaterial({ map: nt, transparent: true, fog: false })); tag.scale.set(1.25, .27, 1); tag.position.y = 2.15; g.add(tag);
    g.userData.parts = parts; return g;
  }

  // ---------- Island game ----------
  // S stretches the island layout (terrain and landmark anchors) without changing any building.
  var S = 1.45, R = 64, NX = R * 2 + 1, NY = 34, SEA = 6;
  function inB(x, z) { return x >= -R && x <= R && z >= -R && z <= R; }
  var GRASS = 1, DIRT = 2, STONE = 3, SAND = 4, GRAVEL = 5, COBBLE = 6, PATH = 7, OAK = 8, BIRCH = 9, SPRUCE = 10, CHERRY = 11,
    OAKL = 12, BIRCHL = 13, SPRUCEL = 14, CHERRYL = 15, PLANK = 16, WHITE = 17, RED = 18, LAMP = 19, GLASS = 20, ROOF = 21, DARK = 22, TALL = 23, FLOWER = 24,
    WATERB = 28, WHEAT = 29, LILY = 30, FARM = 31, FENCE = 32, LANTERN = 33, BRICK = 34, PROOF = 35, GILT = 36, CLOCK = 37;
  var NB = 38, OPQ = new Uint8Array(NB), SOL = new Uint8Array(NB), CUT = new Uint8Array(NB), PLANT = new Uint8Array(NB);
  for (var q = 1; q < NB; q++) OPQ[q] = SOL[q] = 1;
  [OAKL, BIRCHL, SPRUCEL, CHERRYL, GLASS].forEach(function (k) { OPQ[k] = 0; CUT[k] = 1; });
  [TALL, FLOWER, FLOWER + 1, FLOWER + 2, FLOWER + 3, WHEAT, LILY].forEach(function (k) { OPQ[k] = SOL[k] = 0; PLANT[k] = 1; });
  // River/pond water is wadeable; fences block; lanterns are decoration.
  OPQ[WATERB] = SOL[WATERB] = 0; OPQ[FENCE] = 0; OPQ[LANTERN] = SOL[LANTERN] = 0;
  var WALK = {}; [GRASS, DIRT, STONE, SAND, GRAVEL, COBBLE, PATH, PLANK, FARM, BRICK].forEach(function (k) { WALK[k] = 1; });
  var T_GT = 1, T_GS = 5, T_DIRT = 9, T_STONE = 10, T_COBBLE = 11, T_SAND = 12, T_GRAVEL = 13, T_PATH = 14, T_OAK = 15, T_LOGTOP = 16, T_BIRCH = 17, T_SPRUCE = 18, T_CHERRY = 19,
    T_PLANK = 20, T_WHITE = 21, T_RED = 22, T_LAMP = 23, T_GLASS = 24, T_ROOF = 25, T_DARK = 26, T_SNOW = 27, T_OAKL = 28, T_BIRCHL = 32, T_SPRUCEL = 36, T_CHERRYL = 40, T_TALL = 44, T_FLOWER = 48,
    T_BRICK = 52, T_PROOF = 53, T_GOLD = 54, T_CLOCK = 55, T_FARM = 56, T_WHEAT = 57, T_LILY = 61;
  var BASE = {}; BASE[DIRT] = T_DIRT; BASE[STONE] = T_STONE; BASE[SAND] = T_SAND; BASE[GRAVEL] = T_GRAVEL; BASE[COBBLE] = T_COBBLE; BASE[PLANK] = T_PLANK; BASE[WHITE] = T_WHITE; BASE[RED] = T_RED; BASE[ROOF] = T_ROOF; BASE[DARK] = T_DARK;
  BASE[BRICK] = T_BRICK; BASE[PROOF] = T_PROOF; BASE[GILT] = T_GOLD; BASE[FARM] = T_FARM;
  var SKY = [[0, '#0a0f2c'], [4.6, '#121a45'], [5.4, '#3d3a72'], [6.1, '#e99a7a'], [6.9, '#f3c49a'], [7.8, '#9fd2f2'], [12, '#7fc3f0'], [16.6, '#94c8ec'], [17.6, '#f2b07a'], [18.3, '#e9806a'], [18.9, '#8a4f86'], [19.6, '#2c2a62'], [20.6, '#0a0f2c'], [24, '#0a0f2c']];
  var WATER = ['#3f8fd6', '#3486d2', '#4a84b0', '#a9c9de'];

  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function makeAtlas() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    var g = cv.getContext('2d'), img = g.createImageData(256, 128), D = img.data, x, y, s, t;
    function P(t, x, y, c, k, a) { var i = (((t >> 4) * 16 + y) * 256 + (t % 16) * 16 + x) * 4; k = k == null ? 1 : k; D[i] = c[0] * k; D[i + 1] = c[1] * k; D[i + 2] = c[2] * k; D[i + 3] = a == null ? 255 : a; }
    function rn(t, x, y, q) { return hash(t * 13.7 + x * 1.91 + (q || 0) * 7.3, y * 3.17 - t * .71 + (q || 0) * 1.9); }
    function each(fn) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) fn(x, y); }
    function fill(t, hex, amt, sp, sk) { var c = rgb(hex); each(function (x, y) { P(t, x, y, c, (1 + (rn(t, x, y) - .5) * amt) * (sp && rn(t, x, y, 5) < sp ? sk : 1)); }); }
    function pick(t, x, y, cols, amt) { P(t, x, y, rgb(cols[Math.floor(rn(t, x, y, 3) * cols.length)]), 1 + (rn(t, x, y) - .5) * amt); }
    var GT = ['#7cc457', '#5ba63e', '#a9a24b', '#eef3f8'], DC = '#86593a';
    for (s = 0; s < 4; s++) (function (s) {
      fill(T_GT + s, GT[s], s === 3 ? .06 : .3, s === 3 ? 0 : .12, 1.12);
      var t = T_GS + s;
      each(function (x, y) {
        var e = 3 + (rn(t, x, 0, 1) > .45 ? 1 : 0) + (rn(t, x, 0, 2) > .8 ? 1 : 0);
        if (y < e) P(t, x, y, rgb(GT[s]), 1 + (rn(t, x, y) - .5) * (s === 3 ? .06 : .26));
        else P(t, x, y, rgb(DC), 1 + (rn(t, x, y) - .5) * .32);
      });
    })(s);
    fill(T_DIRT, DC, .32, .1, .78);
    var sc = rgb('#8c8e95');
    each(function (x, y) { P(T_STONE, x, y, sc, 1 + (vn(x * .55 + 3, y * .55) - .5) * .3 + (rn(T_STONE, x, y) - .5) * .12); });
    each(function (x, y) {
      var row = y >> 2, off = (row % 2) * 2, cell = ((x + off) >> 2) % 4, mort = (x + off) % 4 === 0 || y % 4 === 0;
      P(T_COBBLE, x, y, sc, mort ? .6 : .86 + hash(cell * 3.1 + row, row * 7.7) * .28 + (rn(T_COBBLE, x, y) - .5) * .1);
    });
    fill(T_SAND, '#dccf9b', .12, .08, .9);
    each(function (x, y) { pick(T_GRAVEL, x, y, ['#8a847f', '#a59d95', '#6e6964', '#9a8b79'], .1); });
    fill(T_PATH, '#a3824f', .16, .1, .82);
    [[T_OAK, '#6b4a2f'], [T_SPRUCE, '#4b3421'], [T_CHERRY, '#603a42']].forEach(function (L) { var c = rgb(L[1]); each(function (x, y) { P(L[0], x, y, c, 1 + (hash(x * 2.3, L[0]) - .5) * .32 + (rn(L[0], x, y) - .5) * .12); }); });
    var bc = rgb('#e5e1d6'), bk = rgb('#2f2b28');
    each(function (x, y) { P(T_BIRCH, x, y, rn(T_BIRCH, x >> 2, y, 4) > .84 ? bk : bc, 1 + (rn(T_BIRCH, x, y) - .5) * .08); });
    each(function (x, y) { var dd = Math.hypot(x - 7.5, y - 7.5); P(T_LOGTOP, x, y, rgb(dd > 6.6 ? '#6b4a2f' : Math.floor(dd * 1.15) % 2 ? '#b48a58' : '#9b7345'), 1 + (rn(T_LOGTOP, x, y) - .5) * .1); });
    [[T_PLANK, '#b48b56'], [T_DARK, '#433a50']].forEach(function (L) { var c = rgb(L[1]); each(function (x, y) { var bd = y >> 2, seam = y % 4 === 3 || x === (bd * 5 + 3) % 16; P(L[0], x, y, c, seam ? .72 : 1 + (hash(bd, L[0]) - .5) * .12 + (rn(L[0], x, y) - .5) * .1); }); });
    fill(T_WHITE, '#ece8ef', .05); fill(T_RED, '#c34f4d', .08);
    var lc = rgb('#f7d27a');
    each(function (x, y) { P(T_LAMP, x, y, lc, .8 + hash((x >> 1) * 1.3 + 9, (y >> 1) * 2.1) * .32); });
    each(function (x, y) {
      var ed = x === 0 || y === 0 || x === 15 || y === 15, st = (x - y === 4 && x > 5 && x < 11) || (x - y === 1 && x > 7 && x < 11);
      if (ed) P(T_GLASS, x, y, rgb('#d8ecf3')); else if (st) P(T_GLASS, x, y, [255, 255, 255], 1, 230);
    });
    var rc = rgb('#7e3541'), rm = rgb('#55252d');
    each(function (x, y) { var rw = y >> 2, xo = x + (rw % 2) * 4, mo = y % 4 === 3 || xo % 8 === 0; P(T_ROOF, x, y, mo ? rm : rc, mo ? 1 : 1 + (hash((xo >> 3) + rw * 3, 1) - .5) * .16 + (rn(T_ROOF, x, y) - .5) * .08); });
    fill(T_SNOW, '#f0f4f9', .05);
    [
      [T_OAKL, [['#79c651', '#8bd162'], ['#3f8c34', '#4b9a3c'], ['#da842c', '#c5512d', '#e3b23b'], ['#eef3f8', '#eef3f8', '#e0e9ef', '#3f7537']]],
      [T_BIRCHL, [['#93d36a', '#a6dd7a'], ['#6ca843', '#7bb54d'], ['#eac53b', '#f2d756'], ['#eef3f8', '#e3ebf1', '#6c9a45']]],
      [T_SPRUCEL, [['#43744b', '#4f8257'], ['#2f5e3b', '#386a43'], ['#38603e', '#43693f'], ['#eef3f8', '#eef3f8', '#2f5e3b']]],
      [T_CHERRYL, [['#f5a8c8', '#f9c3d9', '#ee8fb9'], ['#5c9e46', '#6aab51'], ['#d4693b', '#c94630', '#e19b3b'], ['#eef3f8', '#e7eef3', '#dba5ba']]],
    ].forEach(function (L) {
      for (var s = 0; s < 4; s++) (function (t, cols, hole) { each(function (x, y) { if (rn(t, x, y, 2) >= hole) pick(t, x, y, cols, .28); }); })(L[0] + s, L[1][s], s === 3 ? .14 : .2);
    });
    var TG = ['#7fce57', '#5aa83f', '#b5a64b'];
    for (s = 0; s < 3; s++) for (var k = 0; k < 7; k++) {
      var bx = 1 + Math.floor(hash(k * 3.3, s + 1) * 14), bh = 6 + Math.floor(hash(k * 1.7, s + 4) * 8), lean = hash(k, s * 9) > .5 ? 1 : -1;
      for (y = 15; y > 15 - bh; y--) P(T_TALL + s, clamp(bx + (y < 15 - bh * .6 ? lean : 0), 0, 15), y, rgb(TG[s]), .78 + (15 - y) / bh * .35);
    }
    ['#f2c94c', '#e8648a', '#f4f1f8', '#6f8ff0'].forEach(function (h, k) {
      var t = T_FLOWER + k, c = rgb(h), gr = rgb('#4c8f35');
      for (var y = 7; y < 16; y++) P(t, 7, y, gr, .9 + y * .01);
      P(t, 6, 12, gr); P(t, 8, 10, gr);
      [[7, 3], [6, 4], [7, 4], [8, 4], [5, 5], [6, 5], [8, 5], [9, 5], [6, 6], [7, 6], [8, 6], [7, 7]].forEach(function (p) { P(t, p[0], p[1], c, .92 + hash(p[0], p[1] + k) * .16); });
      P(t, 7, 5, rgb(k === 0 ? '#9a6328' : '#f6d55c'));
    });
    // Brick, the school's purple roof, gold trim, clock face, farmland.
    var bkc = rgb('#a8524a'), bkm = rgb('#d6ccc2');
    each(function (x, y) { var rw = y >> 2, xo = x + (rw % 2) * 4, mo = y % 4 === 3 || xo % 8 === 0; P(T_BRICK, x, y, mo ? bkm : bkc, mo ? .95 : 1 + (hash((xo >> 3) + rw * 5, 3) - .5) * .2 + (rn(T_BRICK, x, y) - .5) * .1); });
    var pc = rgb('#5a3f96'), pm = rgb('#3a2b62');
    each(function (x, y) { var rw = y >> 2, xo = x + (rw % 2) * 4, mo = y % 4 === 3 || xo % 8 === 0; P(T_PROOF, x, y, mo ? pm : pc, mo ? 1 : 1 + (hash((xo >> 3) + rw * 3, 7) - .5) * .18 + (rn(T_PROOF, x, y) - .5) * .08); });
    fill(T_GOLD, '#f2b544', .14, .1, 1.12);
    each(function (x, y) {
      var dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy), c;
      if (d > 7.2) c = rgb('#ece8ef'); else if (d > 6.1) c = rgb('#e8a92e');
      else if ((Math.abs(dx) < .8 && dy < 0 && dy > -5) || (Math.abs(dy) < .8 && dx > 0 && dx < 3.6)) c = rgb('#2e2352');
      else c = (d > 4.8 && d < 5.6 && (Math.abs(dx) < .7 || Math.abs(dy) < .7)) ? rgb('#5a3f96') : rgb('#fbf3dd');
      P(T_CLOCK, x, y, c);
    });
    each(function (x, y) { P(T_FARM, x, y, rgb(x % 4 === 1 ? '#3e2717' : '#5b3a24'), 1 + (rn(T_FARM, x, y) - .5) * .25); });
    // Wheat through the seasons: green, golden, cut stubble, snowy stubble.
    [['#7fbf4a', '#5d9c35', 13], ['#e9c45a', '#c99a32', 13], ['#c7a24b', '#a07a35', 5], ['#c7a24b', '#eef3f8', 4]].forEach(function (W, k) {
      var t = T_WHEAT + k;
      for (var j = 0; j < 6; j++) {
        var bx = 1 + j * 2.6 | 0, bh = W[2] - (j % 2) * 2;
        for (var y = 15; y > 15 - bh; y--) P(t, bx, y, rgb(W[0]), .82 + (15 - y) / bh * .3);
        if (k < 2) for (var y2 = 16 - bh; y2 < 19 - bh; y2++) { P(t, bx, y2, rgb(W[1])); P(t, bx + 1, y2 + 1, rgb(W[1]), .9); }
        if (k === 3) P(t, bx, 16 - bh, rgb(W[1]));
      }
    });
    // Lily pads: spring/summer flower, autumn yellowing, winter none.
    ['#4f9a3c', '#3f8c34', '#b7a33b'].forEach(function (h, k) {
      var t = T_LILY + k;
      each(function (x, y) { var dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy); if (d < 6.5 && !(dx > 0 && Math.abs(dy) < dx * .45)) P(t, x, y, rgb(h), 1 + (rn(t, x, y) - .5) * .2 - (d > 5.6 ? .2 : 0)); });
      if (k < 2) [[6, 6], [7, 6], [6, 7], [7, 7], [5, 7], [8, 6], [7, 5]].forEach(function (q) { P(t, q[0], q[1], rgb(k ? '#f4f1f8' : '#f39ac0')); });
    });
    g.putImageData(img, 0, 0); return cv;
  }

  function genWorld() {
    var B = new Uint8Array(NX * NY * NX), H = new Int16Array(NX * NX), fixed = new Uint8Array(NX * NX), path = new Uint8Array(NX * NX), lamps = [], x, y, z, a, b, k;
    // Water surface height for river, pond and field-channel columns (-1 = none).
    var liq = new Int16Array(NX * NX).fill(-1);
    function ci(x, z) { return (x + R) * NX + (z + R); }
    function inW(x, y, z) { return inB(x, z) && y >= 0 && y < NY; }
    function set(x, y, z, id) { if (inW(x, y, z)) B[((x + R) * NY + y) * NX + (z + R)] = id; }
    function get(x, y, z) { return inW(x, y, z) ? B[((x + R) * NY + y) * NX + (z + R)] : 0; }
    function Hg(x, z) { return inB(x, z) ? H[ci(x, z)] : 0; }
    function Lg(x, z) { return inB(x, z) ? liq[ci(x, z)] : -1; }
    function leaf(x, y, z, id) { if (!get(x, y, z)) set(x, y, z, id); }
    function segD(px, pz, ax, az, bx, bz) { var dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
    function gauss(x, z, cx, cz, w) { return Math.exp(-((x - cx) * (x - cx) + (z - cz) * (z - cz)) / w); }
    for (x = -R; x <= R; x++) for (z = -R; z <= R; z++) {
      var u = x / S, v = z / S, d = Math.hypot(u * 1.04, v) / 35.5;
      H[ci(x, z)] = clamp(Math.round(SEA - 2.5 + (1 - d * d) * 6.5 + (fbm(u + 50, v + 50) - .5) * 6
        + 10 * gauss(u, v, 14, -13, 110) + 3 * gauss(u, v, -13, -11, 44) + 3.5 * gauss(u, v, 27, -10, 40)), 1, 22);
    }
    function relax(passes, raise) {
      for (var p = 0; p < passes; p++) for (var x = -R; x <= R; x++) for (var z = -R; z <= R; z++) {
        var c = ci(x, z), h = H[c]; if (h < SEA - 1 || fixed[c]) continue;
        var n1 = Hg(x + 1, z), n2 = Hg(x - 1, z), n3 = Hg(x, z + 1), n4 = Hg(x, z - 1);
        h = Math.min(h, Math.max(Math.min(n1, n2, n3, n4), SEA - 2) + 1);
        if (raise) h = Math.max(h, Math.max(n1, n2, n3, n4) - 1);
        H[c] = h;
      }
    }
    relax(12, false);
    function nearLand(x, z, lo, hi) {
      x = Math.round(x * S); z = Math.round(z * S);
      for (var r = 0; r < 30; r++) for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !inB(x + dx, z + dz)) continue;
        var h = Hg(x + dx, z + dz); if (h >= lo && h <= hi) return [x + dx, z + dz];
      }
      return [x, z];
    }
    function flatten(cx, cz, r, h) { for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) if (inB(cx + dx, cz + dz)) { H[ci(cx + dx, cz + dz)] = h; fixed[ci(cx + dx, cz + dz)] = 1; } }
    var Lp = nearLand(-27, 15, SEA, SEA + 2), Lb = clamp(Hg(Lp[0], Lp[1]), SEA, SEA + 2); flatten(Lp[0], Lp[1], 2, Lb);
    var Cp = nearLand(1, 6, SEA + 2, SEA + 6), Cb = clamp(Hg(Cp[0], Cp[1]), SEA + 2, SEA + 6); flatten(Cp[0], Cp[1], 5, Cb);
    var Tp = nearLand(-13, -12, SEA + 3, SEA + 10), Tb = Hg(Tp[0], Tp[1]); flatten(Tp[0], Tp[1], 1, Tb);
    var Wp = nearLand(27, -10, SEA + 3, SEA + 9), Wb = Hg(Wp[0], Wp[1]); flatten(Wp[0], Wp[1], 3, Wb);
    var Sp = nearLand(-4, -24, SEA + 1, SEA + 5), Sb = clamp(Hg(Sp[0], Sp[1]), SEA + 1, SEA + 5); flatten(Sp[0], Sp[1], 9, Sb);
    var Fp = nearLand(Cp[0] / S - 13, Cp[1] / S + 1, SEA + 1, SEA + 6), Fb = clamp(Hg(Fp[0], Fp[1]), SEA + 1, SEA + 6); flatten(Fp[0], Fp[1], 5, Fb);
    var Op = nearLand(-25, -3, SEA + 1, SEA + 4), Ob = clamp(Hg(Op[0], Op[1]), SEA + 1, SEA + 4); flatten(Op[0], Op[1], 6, Ob);
    var Mp = nearLand(12, 21, SEA + 2, SEA + 5), Mb = clamp(Hg(Mp[0], Mp[1]), SEA + 2, SEA + 5); flatten(Mp[0], Mp[1], 8, Mb);
    var Gp = nearLand(-24, -17, SEA + 2, SEA + 6), Gb = clamp(Hg(Gp[0], Gp[1]), SEA + 2, SEA + 6); flatten(Gp[0], Gp[1], 5, Gb);
    relax(8, true);
    var lx = Lp[0], lz = Lp[1], cx = Cp[0], cz = Cp[1], tx = Tp[0], tz = Tp[1], wx = Wp[0], wz = Wp[1], sx = Sp[0], sz = Sp[1], fx = Fp[0], fz = Fp[1], ox = Op[0], oz = Op[1];
    // River: from a spring on the mountain's east flank to the east coast. The surface only steps down
    // in drops of 3+ (waterfalls); in between it holds level and the banks are built up to contain it.
    var RV = [[16, -6], [20, -1], [25, 3], [31, 6], [37, 8], [R / S + 4, 9]].map(function (q) { return [q[0] * S, q[1] * S]; }), samples = [], level = 99, fall = null, bigDrop = 0, H0 = H.slice();
    for (k = 0; k < RV.length - 1; k++) {
      var n = Math.ceil(Math.hypot(RV[k + 1][0] - RV[k][0], RV[k + 1][1] - RV[k][1]) * 2);
      for (var st = 0; st < n; st++) samples.push([RV[k][0] + (RV[k + 1][0] - RV[k][0]) * st / n, RV[k][1] + (RV[k + 1][1] - RV[k][1]) * st / n]);
    }
    samples.forEach(function (sp, si) {
      var rx = Math.round(sp[0]), rz = Math.round(sp[1]), hc = inB(rx, rz) ? H0[ci(rx, rz)] : 0, want = Math.max(SEA - 1, hc - 1);
      if (hc < SEA - 1) return; // reached the sea
      if (level === 99) level = want;
      else if (want <= level - 3 || (want < level && want <= SEA)) { if (level - want > bigDrop) { bigDrop = level - want; fall = { i: si, x: sp[0], z: sp[1], top: level, bot: want }; } level = want; }
      for (var dx = -3; dx <= 3; dx++) for (var dz = -3; dz <= 3; dz++) {
        var qx = Math.round(sp[0]) + dx, qz = Math.round(sp[1]) + dz; if (!inB(qx, qz)) continue;
        var c = ci(qx, qz), dd = Math.hypot(qx - sp[0], qz - sp[1]);
        if (dd <= 1.75) { if (liq[c] < 0 || level < liq[c]) { liq[c] = level; H[c] = level - 1; fixed[c] = 1; } }
        else if (dd <= 2.9 && liq[c] < 0 && H[c] < level + 1 && level > SEA - 1 && H0[c] >= SEA - 1) { H[c] = level + 1; fixed[c] = 1; }
      }
    });
    if (!fall) { var mid = samples[samples.length >> 2]; fall = { i: samples.length >> 2, x: mid[0], z: mid[1], top: liq[ci(Math.round(mid[0]), Math.round(mid[1]))], bot: SEA }; }
    // Pond: an oval dug two deep around the flattened clearing.
    for (a = -6; a <= 6; a++) for (b = -6; b <= 6; b++) {
      var e = (a * a) / 20 + (b * b) / 11; if (e > 1 || !inB(ox + a, oz + b)) continue;
      var pc = ci(ox + a, oz + b); H[pc] = Ob - (e < .55 ? 2 : 1); liq[pc] = Ob;
    }
    var kh0 = -1, K = [0, 0];
    for (x = -R; x <= R; x++) for (z = -R; z <= R; z++) if (!fixed[ci(x, z)] && H[ci(x, z)] > kh0) { kh0 = H[ci(x, z)]; K = [x, z]; }
    // Field: irrigation channel down the middle row.
    for (a = -3; a <= 3; a++) { var fc = ci(fx + a, fz); H[fc] = Fb - 1; liq[fc] = Fb; }
    for (x = -R; x <= R; x++) for (z = -R; z <= R; z++) {
      var c0 = ci(x, z), h = H[c0], wet = liq[c0] >= 0, under = h < SEA - 1, beach = !under && h <= SEA, rock = h >= SEA + 11 || (h >= SEA + 7 && vn(x * .35 + 7, z * .35) > .62);
      for (y = 0; y <= h; y++) {
        var id;
        if (wet) id = y === h ? (hash(x * 2.1, z * 1.3) < .5 ? GRAVEL : SAND) : y > h - 2 ? SAND : STONE;
        else if (under) id = y === h && hash(x * 1.3, z * .7) < .35 ? GRAVEL : y > h - 3 ? SAND : STONE;
        else if (beach) id = y > h - 3 ? SAND : STONE;
        else if (rock) id = STONE;
        else id = y === h ? GRASS : y > h - 3 ? DIRT : STONE;
        set(x, y, z, id);
      }
      if (wet) for (y = h + 1; y <= liq[c0]; y++) set(x, y, z, WATERB);
    }
    // Pier
    var Px = cx, z0 = R - 10, zEnd;
    for (z = cz + 5; z < R; z++) if (Hg(Px, z) < SEA - 1) { z0 = z; break; }
    zEnd = Math.min(R - 2, z0 + 9);
    for (z = z0 - 2; z <= zEnd; z++) for (a = -1; a <= 1; a++) {
      var hx = Hg(Px + a, z);
      if (hx < SEA - 1) { set(Px + a, SEA - 1, z, PLANK); if (a && (z - z0) % 4 === 0) for (y = hx + 1; y < SEA - 1; y++) set(Px + a, y, z, OAK); }
      else if (hx <= SEA) set(Px + a, hx, z, PLANK);
    }
    for (a = -1; a <= 1; a += 2) { set(Px + a, SEA, zEnd, OAK); set(Px + a, SEA + 1, zEnd, LAMP); lamps.push([Px + a + .5, SEA + 1.5, zEnd + .5, 14]); }
    // Rowboat moored beside the pier.
    if (Hg(Px + 4, zEnd - 3) < SEA - 2 && Hg(Px + 4, zEnd - 1) < SEA - 2) {
      for (z = zEnd - 5; z <= zEnd - 1; z++) for (a = 3; a <= 5; a++) {
        var rim = a !== 4 || z === zEnd - 5 || z === zEnd - 1;
        set(Px + a, SEA - 1, z, rim ? DARK : PLANK);
        if (rim) set(Px + a, SEA, z, PLANK);
      }
      set(Px + 4, SEA, zEnd - 3, PLANK);
    }
    // Lighthouse
    for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) set(lx + a, Lb, lz + b, COBBLE);
    for (y = Lb + 1; y <= Lb + 10; y++) for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++)
      set(lx + a, y, lz + b, a === 1 && b === 0 && y <= Lb + 2 ? DARK : Math.floor((y - Lb - 1) / 2) % 2 ? RED : WHITE);
    for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) set(lx + a, Lb + 11, lz + b, DARK);
    for (a = -2; a <= 2; a += 4) for (b = -2; b <= 2; b += 4) set(lx + a, Lb + 12, lz + b, DARK);
    for (y = Lb + 12; y <= Lb + 13; y++) for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) set(lx + a, y, lz + b, a || b ? GLASS : LAMP);
    for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) set(lx + a, Lb + 14, lz + b, RED);
    set(lx, Lb + 15, lz, DARK);
    for (y = Lb + 1; y <= Lb + 2; y++) { set(lx, y, lz, 0); set(lx + 1, y, lz, 0); }
    set(lx, Lb + 3, lz, LANTERN);
    lamps.push([lx + .5, Lb + 13, lz + .5, 40]);
    // Cabin
    for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) {
      var ea = Math.abs(a) === 3, eb = Math.abs(b) === 3;
      set(cx + a, Cb, cz + b, ea || eb ? COBBLE : PLANK);
      if (!(ea || eb)) continue;
      for (y = Cb + 1; y <= Cb + 3; y++) {
        var w = ea && eb ? OAK : PLANK;
        if (b === 3 && a === 0 && y <= Cb + 2) w = 0;
        else if (y === Cb + 2 && !(ea && eb) && ((ea && Math.abs(b) === 1) || (eb && Math.abs(a) === 2))) w = GLASS;
        set(cx + a, y, cz + b, w);
      }
    }
    set(cx, Cb + 3, cz + 3, LAMP);
    for (k = 0; k <= 4; k++) for (a = -4; a <= 4; a++) for (b = -4; b <= 4; b++) {
      var ab = Math.abs(b), yy = Cb + 4 + k;
      if (ab === 4 - k) set(cx + a, yy, cz + b, ROOF);
      else if (ab < 4 - k && Math.abs(a) === 3) set(cx + a, yy, cz + b, PLANK);
    }
    set(cx - 3, Cb + 5, cz, GLASS); set(cx + 3, Cb + 5, cz, GLASS);
    set(cx + 2, Cb + 1, cz - 2, LAMP);
    for (y = Cb + 2; y <= Cb + 9; y++) set(cx + 2, y, cz - 2, COBBLE);
    for (a = -1; a <= 1; a++) set(cx + a, Cb, cz + 4, PLANK);
    lamps.push([cx + .5, Cb + 2.4, cz + .5, 12], [cx + .5, Cb + 3.5, cz + 4.4, 12]);
    // Cherry tree
    for (y = Tb + 1; y <= Tb + 5; y++) set(tx, y, tz, CHERRY);
    [[1, 4, 0], [2, 5, 0], [-1, 5, 1], [-2, 6, 1], [0, 6, -1], [1, 6, -2]].forEach(function (p) { set(tx + p[0], Tb + p[1], tz + p[2], CHERRY); });
    for (a = -4; a <= 4; a++) for (var dy = -2; dy <= 3; dy++) for (b = -4; b <= 4; b++) {
      if (Math.sqrt(a * a + dy * dy * 2 + b * b) < 3.9 && hash(a * 3 + tx, b * 5 + dy * 11) > .1) leaf(tx + a, Tb + 7 + dy, tz + b, CHERRYL);
    }
    for (a = -4; a <= 4; a++) for (b = -4; b <= 4; b++) { var md = Math.abs(a) + Math.abs(b); if (md >= 3 && md <= 4 && hash(a + 40, b - 9) > .55) leaf(tx + a, Tb + 4, tz + b, CHERRYL); }
    // Windmill: tapering round tower, conical roof, door and sail hub facing the cabin.
    var fd = [0, 1]; // faces south, over the river valley
    for (y = Wb + 1; y <= Wb + 10; y++) {
      var rr = 2.5 - (y - Wb - 1) * .09;
      for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) {
        var dd = Math.hypot(a, b); if (dd > rr || dd < rr - 1.3) continue;
        var front = a === fd[0] * 2 && b === fd[1] * 2, side = a === fd[1] * 2 && b === -fd[0] * 2;
        var blk = y === Wb + 1 ? COBBLE : y === Wb + 6 ? DARK : WHITE;
        if (front && y <= Wb + 2) blk = 0; else if ((front || side) && y === Wb + 5) blk = GLASS;
        set(wx + a, y, wz + b, blk);
      }
    }
    for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) { if (Math.hypot(a, b) <= 2.6) set(wx + a, Wb, wz + b, COBBLE); }
    [[2.4, 0], [1.6, 1], [.9, 2], [0, 3]].forEach(function (L) { for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) if (Math.hypot(a, b) <= L[0] + .2) set(wx + a, Wb + 11 + L[1], wz + b, ROOF); });
    set(wx + fd[0] * 2, Wb + 9, wz + fd[1] * 2, DARK); set(wx + fd[0] * 3, Wb + 9, wz + fd[1] * 3, DARK);
    set(wx + fd[0] * 3, Wb + 2, wz + fd[1] * 3, LANTERN);
    var mill = { x: wx + .5 + fd[0] * 4.25, y: Wb + 9.5, z: wz + .5 + fd[1] * 4.25, yaw: Math.atan2(fd[0], fd[1]) };
    // School with a clock tower (purple roof, gold trim), facing south.
    for (a = -9; a <= 9; a++) for (b = -9; b <= 9; b++) if (Math.abs(a) <= 8 && Math.abs(b) <= 6) set(sx + a, Sb, sz + b, Math.abs(a) <= 7 && Math.abs(b) <= 4 ? PLANK : COBBLE);
    for (a = -7; a <= 7; a++) for (b = -4; b <= 4; b++) {
      var wa = Math.abs(a) === 7, wbb = Math.abs(b) === 4; if (!(wa || wbb)) continue;
      for (y = Sb + 1; y <= Sb + 7; y++) {
        var sb2 = WHITE, ly = y - Sb;
        if (ly === 1 || ly === 4) sb2 = BRICK;
        if (wa && wbb) sb2 = BRICK;
        else if ((ly === 2 || ly === 3 || ly === 5 || ly === 6) && (wbb ? a % 2 === 0 && Math.abs(a) < 7 : Math.abs(b) % 2 === 1 && Math.abs(b) < 4)) sb2 = GLASS;
        if (b === 4 && Math.abs(a) <= 1 && ly <= 3) sb2 = ly === 3 ? GILT : 0;
        set(sx + a, y, sz + b, sb2);
      }
    }
    for (k = 0; k <= 5; k++) for (a = -8; a <= 8; a++) for (b = -6; b <= 6; b++) {
      var abb = Math.abs(b), yr = Sb + 8 + k;
      if (abb === 6 - k) set(sx + a, yr, sz + b, Math.abs(a) === 8 ? GILT : PROOF);
      else if (abb < 6 - k && Math.abs(a) === 7) set(sx + a, yr, sz + b, WHITE);
    }
    for (y = Sb + 8; y <= Sb + 16; y++) for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) {
      var corner = Math.abs(a) === 1 && Math.abs(b) === 1, ty = y - Sb;
      var tb = corner ? BRICK : ty === 13 && (a === 0 || b === 0) ? CLOCK : ty === 15 && !corner ? 0 : WHITE;
      if (a === 0 && b === 0) tb = ty === 15 ? LAMP : 0;
      set(sx + a, y, sz + b, tb);
    }
    for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) set(sx + a, Sb + 17, sz + b, Math.abs(a) === 2 || Math.abs(b) === 2 ? GILT : PROOF);
    for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) set(sx + a, Sb + 18, sz + b, PROOF);
    set(sx, Sb + 19, sz, PROOF); set(sx, Sb + 20, sz, GILT); set(sx, Sb + 21, sz, GILT);
    set(sx, Sb + 3, sz + 5, LAMP);
    lamps.push([sx + .5, Sb + 15.5, sz + .5, 18], [sx + .5, Sb + 3.5, sz + 5.6, 12, 1]);
    // Field: farmland rows of wheat around the channel, fenced, gate facing the cabin.
    for (a = -3; a <= 3; a++) for (b = -3; b <= 3; b++) { if (!b) continue; set(fx + a, Fb, fz + b, FARM); set(fx + a, Fb + 1, fz + b, WHEAT); }
    var gate = Math.sign(cx - fx) || 1;
    for (a = -4; a <= 4; a++) for (b = -4; b <= 4; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== 4 || (a === gate * 4 && Math.abs(b) <= 1)) continue;
      set(fx + a, Fb + 1, fz + b, FENCE);
    }
    // Pond lilies.
    for (a = -5; a <= 5; a++) for (b = -4; b <= 4; b++) { var lc2 = ci(ox + a, oz + b); if (liq[lc2] === Ob && H[lc2] === Ob - 2 && hash(a * 3.3 + ox, b * 1.7) > .72) set(ox + a, Ob + 1, oz + b, LILY); }
    // ---- Hiding places for the chair hunt ----
    var hid = {}, decoys = [], caveAt = null, caveWay = null;
    // Porch: out in the open in front of the cabin, with room around it for Charis to appear.
    hid.porch = [cx - 4, cz + 6, 0];
    // Windmill: on the ground floor, facing the door.
    hid.mill = [wx, wz - 1, 0, Wb + 1]; set(wx + 1, Wb + 3, wz, LANTERN);
    // School: a classroom with a blackboard, two rows of desks, decoy chairs, and the teacher's chair.
    for (a = -3; a <= 3; a++) for (y = Sb + 2; y <= Sb + 3; y++) set(sx + a, y, sz - 4, DARK);
    [-5, -3, -1, 1, 3, 5].forEach(function (a) { [-1, 1].forEach(function (b) { set(sx + a, Sb + 1, sz + b, PLANK); decoys.push({ x: sx + a, y: Sb + 1, z: sz + b + 1, yaw: Math.PI }); }); });
    set(sx + 2, Sb + 1, sz - 2, PLANK); set(sx + 3, Sb + 1, sz - 2, PLANK);
    hid.class = [sx + 3, sz - 3, 0, Sb + 1];
    set(sx - 4, Sb + 6, sz, LANTERN); set(sx + 4, Sb + 6, sz, LANTERN); lamps.push([sx + .5, Sb + 5, sz + .5, 13]);
    // Lighthouse: just inside the door.
    hid.light = [lx, lz, Math.PI / 2, Lb + 1];
    // Hedge maze (13 x 13, two blocks high) with a little room off-centre; the gate faces south.
    var MZ = ['#############', '#.......#...#', '#.#####.#.#.#', '#.#...#...#.#', '#.#.#.#####.#', '#...#.#...#.#', '#####.#...#.#',
      '#.....#...#.#', '#.#######.#.#', '#.#.......#.#', '#.#.#######.#', '#...#.......#', '######.######'];
    var mx = Mp[0], mz = Mp[1];
    for (b = 0; b < 13; b++) for (a = 0; a < 13; a++) {
      var qx = mx + a - 6, qz = mz + b - 6;
      set(qx, Mb, qz, MZ[b][a] === '#' ? GRASS : hash(qx * 1.3, qz * .7) < .3 ? GRAVEL : PATH);
      if (MZ[b][a] === '#') { set(qx, Mb + 1, qz, OAKL); set(qx, Mb + 2, qz, OAKL); }
    }
    set(mx - 1, Mb + 3, mz + 6, LANTERN); set(mx + 1, Mb + 3, mz + 6, LANTERN); set(mx - 1, Mb + 2, mz + 6, OAK); set(mx + 1, Mb + 2, mz + 6, OAK);
    lamps.push([mx + .5, Mb + 3.3, mz + 6.5, 9, 1]);
    hid.maze = [mx + 2, mz, 0, Mb + 1];
    // Overgrown greenhouse: glass on a white frame, half swallowed by leaves; door to the south.
    var gx = Gp[0], gz = Gp[1];
    for (a = -4; a <= 4; a++) for (b = -3; b <= 3; b++) {
      var ea = Math.abs(a) === 4, eb = Math.abs(b) === 3;
      set(gx + a, Gb, gz + b, ea || eb ? COBBLE : GRASS);
      for (y = Gb + 1; y <= Gb + 4; y++) {
        if (y < Gb + 4 && !(ea || eb)) continue;
        var gb = y === Gb + 4 ? (Math.abs(a) <= 3 && Math.abs(b) <= 2 ? GLASS : WHITE) : ea && eb ? WHITE : GLASS;
        if (gb === GLASS && (a >= 3 || b <= -2) && hash(a * 5.1 + gx, b * 2.3 + y) < .75) gb = OAKL;
        if (b === 3 && a === 0 && y <= Gb + 2) gb = 0;
        set(gx + a, y, gz + b, gb);
      }
    }
    for (b = -2; b <= 2; b++) { set(gx - 3, Gb + 1, gz + b, PLANK); set(gx - 3, Gb + 2, gz + b, FLOWER + ((b + 4) % 4)); }
    [[-1, -2], [0, -2], [-1, 2], [1, 2], [2, 1], [-2, 0]].forEach(function (q, i) { set(gx + q[0], Gb + 1, gz + q[1], FLOWER + i % 4); });
    [[1, -1], [2, -1], [1, 0], [2, 0]].forEach(function (q) { set(gx + q[0], Gb + 1, gz + q[1], OAKL); set(gx + q[0], Gb + 2, gz + q[1], OAKL); });
    set(gx, Gb + 3, gz, LANTERN);
    hid.green = [gx + 3, gz - 2, -Math.PI / 2, Gb + 1];
    // Cave: a mossy rock outcrop on the summit's flank, with a tunnel running into a lantern-lit chamber.
    (function () {
      var dirs = [[0, -1], [-1, 0], [0, 1], [1, 0]], d = null, i, j;
      for (i = 0; i < dirs.length && !d; i++) {
        var ok = true;
        for (j = -6; j <= 7 && ok; j++) for (var w = -5; w <= 5 && ok; w++) {
          var qx = K[0] + dirs[i][0] * (7 + j) - dirs[i][1] * w, qz = K[1] + dirs[i][1] * (7 + j) + dirs[i][0] * w;
          if (!inB(qx, qz) || liq[ci(qx, qz)] >= 0 || fixed[ci(qx, qz)] || Hg(qx, qz) < SEA + 2) ok = false;
        }
        if (ok) d = dirs[i];
      }
      if (!d) return;
      // Local frame: u runs outward from the summit (the entrance side), v across it.
      var ux = d[0], uz = d[1], vx = -uz, vz = ux, ox = K[0] + ux * 7, oz = K[1] + uz * 7, Hc = Hg(ox, oz);
      function at(u, v) { return [ox + ux * u + vx * v, oz + uz * u + vz * v]; }
      var u, v, y, q, f = Hg(at(6, 0)[0], at(6, 0)[1]) + 1;
      for (u = -6; u <= 6; u++) for (v = -5; v <= 5; v++) {
        var e = 1 - (u / 6.2) * (u / 6.2) - (v / 5.2) * (v / 5.2); if (e <= 0) continue;
        q = at(u, v); var base = Hg(q[0], q[1]), topY = Math.max(base, Hc + Math.round(5.5 * Math.sqrt(e)) - (hash(q[0] * 1.7, q[1]) < .3 ? 1 : 0));
        for (y = base + 1; y <= topY; y++) set(q[0], y, q[1], y === topY && hash(q[0], q[1] * 2.3) < .45 ? COBBLE : STONE);
        if (topY > base && hash(q[0] * .7, q[1] * 1.9) < .42) leaf(q[0], topY + 1, q[1], OAKL);
      }
      function dig(u, v) {
        q = at(u, v); if (!inB(q[0], q[1])) return;
        for (y = f; y <= f + 2; y++) set(q[0], y, q[1], 0);
        if (get(q[0], f - 1, q[1]) === GRASS) set(q[0], f - 1, q[1], GRAVEL);
        for (y = f - 1; y > 0 && !get(q[0], y, q[1]); y--) set(q[0], y, q[1], y === f - 1 ? GRAVEL : STONE);
      }
      for (u = -2; u <= 8; u++) for (v = 0; v <= 1; v++) dig(u, v);
      for (u = -4; u <= -1; u++) for (v = -1; v <= 2; v++) dig(u, v);
      q = at(-4, 2); set(q[0], f + 2, q[1], LANTERN); q = at(-4, -1); set(q[0], f + 2, q[1], LANTERN);
      q = at(-3, 0.5); lamps.push([q[0] + .5, f + 2, q[1] + .5, 9, 1]);
      q = at(-3, 0); hid.cave = [q[0], q[1], Math.atan2(ux, uz), f];
      caveAt = [ox, oz]; caveWay = [at(9, 0), at(12, 0), at(15, 0)];
    })();
    // Paths, with plank bridges where they cross water and lantern posts along the way.
    var bridge = [], walked = [];
    function paint(x, z) {
      if (!inB(x, z)) return; var c = ci(x, z), h = H[c];
      if (liq[c] >= 0 && liq[c] > SEA - 1 && !path[c]) { set(x, liq[c] + 1, z, PLANK); path[c] = 1; bridge.push([x, z]); return; }
      if (get(x, h, z) === GRASS) { set(x, h, z, PATH); path[c] = 1; walked.push([x, z]); }
    }
    function line(x0, z0, x1, z1) {
      var n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0), 1);
      for (var s = 0; s <= n; s++) {
        var px = Math.round(x0 + (x1 - x0) * s / n), pz = Math.round(z0 + (z1 - z0) * s / n), hz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
        paint(px, pz); if (hash(px * 1.7, pz) > .5 || Lg(px, pz) >= 0) paint(px + (hz ? 0 : 1), pz + (hz ? 1 : 0));
      }
    }
    line(cx, cz + 5, Px, z0 - 3); line(cx - 1, cz + 5, lx + 3, lz); line(cx - 5, cz - 1, tx + 2, tz + 2);
    line(cx + 4, cz - 4, wx + fd[0] * 5, wz + fd[1] * 5); line(cx - 2, cz - 5, sx, sz + 7); line(cx - 5, cz + 1, fx + gate * 5, fz);
    line(sx - 8, sz + 2, ox + 2, oz - 5); line(Px + 1, z0 - 7, mx, mz + 8);
    if (caveWay) line(caveWay[0][0], caveWay[0][1], sx + 9, sz + 1);
    // Bridge rails on the water cells flanking each deck plank.
    bridge.forEach(function (q) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = q[0] + d[0], nz = q[1] + d[1], c = inB(nx, nz) ? ci(nx, nz) : -1; if (c < 0 || path[c] || liq[c] < 0) return;
        set(nx, liq[c] + 1, nz, PLANK); set(nx, liq[c] + 2, nz, FENCE); path[c] = 2;
      });
    });
    var posts = 0;
    walked.forEach(function (q, i) {
      if (i % 9 !== 4) return;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var j = 0; j < 4; j++) {
        var nx = q[0] + dirs[(i + j) % 4][0], nz = q[1] + dirs[(i + j) % 4][1]; if (!inB(nx, nz) || path[ci(nx, nz)]) continue;
        var ph = H[ci(nx, nz)]; if (get(nx, ph, nz) !== GRASS || get(nx, ph + 1, nz)) continue;
        set(nx, ph + 1, nz, FENCE); set(nx, ph + 2, nz, FENCE); set(nx, ph + 3, nz, LANTERN);
        lamps.push([nx + .5, ph + 3.3, nz + .5, 8, posts++ >= 4 ? 1 : 0]); break;
      }
    });
    // Summit
    var kh = kh0;
    var east = 0; for (x = R; x > 0; x--) if (Hg(x, 2) >= SEA - 1) { east = x; break; }
    var fs = samples[Math.min(samples.length - 2, fall.i + 20)], fsp = samples[Math.min(samples.length - 1, fall.i + 21)], fnx = -(fsp[1] - fs[1]), fnz = fsp[0] - fs[0];
    // Viewpoints: the first standable cell (searching outward from dmax to dmin, fanning around angle `ang`)
    // with a clear line of sight from eye height to the target. Trees are planted later and keep clear of these lines.
    function surf(x, z) { for (var y = NY - 1; y >= 0; y--) { var g = get(x, y, z); if (g && !PLANT[g]) return y; } return -1; }
    function los(ax, ay, az, bx, by, bz) {
      // The last 4.5 units are the subject itself (walls, lantern glass), so they don't count.
      var L = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(L * 3);
      for (var i = 2; i < n && (1 - i / n) * L > 4.5; i++) { var t = i / n; if (SOL[get(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t), Math.floor(az + (bz - az) * t))]) return false; }
      return true;
    }
    function spot(tg, ang, dmax, dmin, def) {
      for (var k = 0; k < 13; k++) {
        var an = ang + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .22;
        for (var d = dmax; d >= dmin; d -= 1.5) {
          var x = Math.round(tg[0] + Math.sin(an) * d), z = Math.round(tg[2] + Math.cos(an) * d); if (!inB(x, z)) continue;
          var h = surf(x, z); if (h < SEA - 1 || !WALK[get(x, h, z)] || SOL[get(x, h + 1, z)] || SOL[get(x, h + 2, z)]) continue;
          if (los(x + .5, h + 2.62, z + .5, tg[0], tg[1], tg[2])) return [x, z];
        }
      }
      return def;
    }
    var lht = [lx + .5, Lb + 12, lz + .5], cab = [cx + .5, Cb + 2, cz + .5], fallT = [fall.x, (fall.top + fall.bot) / 2 + 1, fall.z];
    var chal = [
      { en: 'Lighthouse at dusk', zh: '黃昏燈塔', from: spot(lht, Math.atan2(Px - lx, z0 - lz), 21, 14, [Px, zEnd - 1]), look: lht, hour: 18.5, season: 1 },
      { en: 'Blossom morning', zh: '櫻花早晨', from: [tx + 6, tz + 5], look: [tx + .5, Tb + 6.5, tz + .5], hour: 8, season: 0 },
      { en: 'Snowy cabin by night', zh: '雪夜小屋', from: [cx + 2, cz + 11], look: [cx + .5, Cb + 3.5, cz + .5], hour: 21, season: 3 },
      { en: 'Autumn from the summit', zh: '山頂秋色', from: spot(cab, Math.atan2(K[0] - cx, K[1] - cz), Math.hypot(K[0] - cx, K[1] - cz), Math.hypot(K[0] - cx, K[1] - cz) - 9, [K[0], K[1]]), look: cab, hour: 15.5, season: 2 },
      { en: 'Sunrise at sea', zh: '海上日出', from: [east - 1, 2], look: [east + 40, SEA + 5, 14], hour: 6.5, season: 1 },
      { en: 'Pier under the stars', zh: '星空碼頭', from: [Px, z0 - 2], look: [Px + .5, SEA + 5, z0 + 30], hour: .5, season: 2 },
      { en: 'Windmill at golden hour', zh: '金色風車', from: [Math.round(mill.x - 7), Math.round(mill.z + 17)], look: [mill.x, mill.y - 1, mill.z], hour: 17.4, season: 1 },
      { en: 'Clock tower at night', zh: '夜色鐘樓', from: [sx + 7, sz + 15], look: [sx + .5, Sb + 13.5, sz + .5], hour: 20.5, season: 0 },
      { en: 'Autumn waterfall', zh: '秋日瀑布', from: spot(fallT, Math.atan2(fs[0] + fnx * 4 - fall.x, fs[1] + fnz * 4 - fall.z), 13, 6, [Math.round(fs[0]), Math.round(fs[1])]), look: fallT, hour: 10, season: 2 },
    ];
    // Chairs (one per ~9 cells of radius) on free ground around the island, each facing out to the view.
    // Found in any order; once all are found they merge into Charis, which unlocks the bonus shots.
    function seat(px, pz, r) {
      px = Math.round(px); pz = Math.round(pz);
      for (var rr = 0; rr <= r; rr++) for (var dx = -rr; dx <= rr; dx++) for (var dz = -rr; dz <= rr; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== rr) continue;
        var x = px + dx, z = pz + dz; if (!inB(x, z)) continue;
        var c = ci(x, z), h = H[c], g = get(x, h, z);
        if (h < SEA || liq[c] >= 0 || path[c] || (g !== GRASS && g !== SAND && g !== STONE) || SOL[get(x, h + 1, z)] || get(x, h + 2, z) || Math.abs(Hg(x + 1, z) - h) > 1 || Math.abs(Hg(x, z + 1) - h) > 1) continue;
        return [x, h + 1, z];
      }
      return null;
    }
    if (!hid.cave) { var ks = seat(K[0] + 2, K[1] - 2, 8); if (ks) hid.cave = [ks[0], ks[2], Math.atan2(ks[0], ks[2]), ks[1]]; }
    (function () {
      var D = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
      for (var r = 0; r <= 16 && !hid.beach; r++) for (var dx = -r; dx <= r && !hid.beach; dx++) for (var dz = -r; dz <= r && !hid.beach; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        var x = Px + 12 + dx, z = z0 + dz; if (!inB(x, z)) continue;
        var c = ci(x, z), h = H[c]; if (get(x, h, z) !== SAND || h < SEA || liq[c] >= 0 || path[c] || get(x, h + 1, z)) continue;
        // Its back to the island and nothing but sand around it.
        var flat = true; for (var a2 = -2; a2 <= 2; a2++) for (var b2 = -2; b2 <= 2; b2++) { var g2 = get(x + a2, Hg(x + a2, z + b2), z + b2); if (Hg(x + a2, z + b2) >= SEA && (g2 !== SAND || Math.abs(Hg(x + a2, z + b2) - h) > 1 || get(x + a2, Hg(x + a2, z + b2) + 1, z + b2))) flat = false; }
        if (!flat) continue;
        // Face open sea 3 to 6 cells away: water that keeps going, not a tide pool.
        var bd = 99, by = 0;
        D.forEach(function (u) { for (var d = 1; d <= 6; d++) { if (Hg(x + u[0] * d, z + u[1] * d) < SEA - 1) { var open = true; for (var e = d + 1; e <= d + 12; e++) if (Hg(x + u[0] * e, z + u[1] * e) >= SEA - 1) open = false; if (open && d < bd) { bd = d; by = Math.atan2(u[0], u[1]); } break; } } });
        if (bd >= 3 && bd <= 6) hid.beach = [x, z, by];
      }
    })();
    var chairs = ['porch', 'mill', 'class', 'cave', 'maze', 'light', 'green', 'beach'].filter(function (k) { return hid[k]; }).map(function (k) {
      var q = hid[k]; return { k: k, x: q[0], y: q[3] != null ? q[3] : Hg(q[0], q[1]) + 1, z: q[1], yaw: q[2] };
    });
    // Bonus shots with Charis: in front of the school in the morning, and seated on the summit at sunset.
    var gs = seat(sx + 3, sz + 8, 4) || [sx + 3, Sb + 1, sz + 8], tp = seat(K[0] - 2, K[1] + 1, 4) || [K[0], kh + 1, K[1]];
    var gT = [gs[0] + .5, gs[1] + 2.4, gs[2] - .5], tT = [tp[0] + .5, tp[1] + 1, tp[2] + .5];
    var bonus = [
      { en: 'The president at school', zh: '校園裡的主席', from: spot(gT, .15, 5.5, 3.5, [gs[0], gs[2] + 5]), look: gT, hour: 8.5, season: 0, charis: { x: gs[0] + .5, y: gs[1], z: gs[2] + .5, yaw: 0 } },
      { en: 'The main seat', zh: '主席之位', from: spot(tT, -1.05, 4.5, 3, [tp[0] - 3, tp[2] + 2]), look: tT, hour: 17.7, season: 2, charis: { x: tp[0] + .5, y: tp[1], z: tp[2] + .5, yaw: -Math.PI / 2, sit: 1 } },
    ];
    var marks = [[lx, lz, 6], [cx, cz, 7.5], [tx, tz, 6], [K[0], K[1], 3], [Px, z0, 4], [wx, wz, 6], [sx, sz, 12], [fx, fz, 6.5], [ox, oz, 7.5]];
    chairs.forEach(function (c) { marks.push([c.x, c.z, 4.5]); });
    marks.push([mx, mz, 9.5], [gx, gz, 6.5], [hid.porch[0], hid.porch[1], 8]);
    if (caveAt) { marks.push([caveAt[0], caveAt[1], 8]); caveWay.forEach(function (q) { marks.push([q[0], q[1], 5]); }); }
    bonus.forEach(function (b) { marks.push([b.charis.x, b.charis.z, 5]); });
    chal = chal.concat(bonus);
    var segs = chal.map(function (c) { var dx = c.look[0] - c.from[0], dz = c.look[2] - c.from[1], l = Math.hypot(dx, dz) || 1, m = Math.min(l, 40) / l; return [c.from[0], c.from[1], c.from[0] + dx * m, c.from[1] + dz * m]; });
    chal.forEach(function (c) { marks.push([c.from[0], c.from[1], 3.5]); });
    function blocked(x, z, r) { return marks.some(function (m) { return Math.hypot(m[0] - x, m[1] - z) < Math.max(m[2], r || 0); }); }
    function tree(kind, x, h, z) {
      var r1 = hash(x * 1.1, z * 2.2), th, tp, y, a, b, dy, rr;
      if (kind === 2) {
        th = 6 + Math.floor(r1 * 3); tp = h + th;
        for (dy = 0; dy < th; dy++) {
          var yy = tp + 1 - dy; if (yy <= h + 2) break;
          rr = dy === 0 ? 0 : dy % 2 ? 1 : Math.min(3, (dy >> 1) + 1);
          for (a = -rr; a <= rr; a++) for (b = -rr; b <= rr; b++) if (Math.abs(a) + Math.abs(b) <= rr + (rr > 1 ? 1 : 0)) leaf(x + a, yy, z + b, SPRUCEL);
        }
        for (y = h + 1; y <= tp; y++) set(x, y, z, SPRUCE);
        return;
      }
      var LF = kind ? BIRCHL : OAKL;
      th = (kind ? 5 : 4) + Math.floor(r1 * 2); tp = h + th;
      for (dy = -1; dy <= 2; dy++) {
        rr = dy <= 0 ? 2 : 1;
        for (a = -rr; a <= rr; a++) for (b = -rr; b <= rr; b++) {
          var cor = Math.abs(a) === rr && Math.abs(b) === rr;
          if (cor && (dy === 2 || kind || hash(x + a * 3.7, z + b * 1.3 + dy) < .5)) continue;
          leaf(x + a, tp + dy, z + b, LF);
        }
      }
      for (y = h + 1; y <= tp; y++) set(x, y, z, kind ? BIRCH : OAK);
    }
    var trees = [];
    for (x = -R + 2; x <= R - 2; x++) for (z = -R + 2; z <= R - 2; z++) {
      var th0 = H[ci(x, z)]; if (th0 < SEA + 1 || get(x, th0, z) !== GRASS || get(x, th0 + 1, z)) continue;
      var fo = vn(x * .09 + 100, z * .09 - 30), sp = fo > .55 ? 3 : 4;
      if (hash(x * 3.1, z * 1.7) < (fo > .55 ? .8 : .95)) continue;
      if (blocked(x, z)) continue;
      if (segs.some(function (s) { return segD(x, z, s[0], s[1], s[2], s[3]) < 3.8; })) continue;
      if (trees.some(function (t) { return Math.hypot(t[0] - x, t[1] - z) < sp; })) continue;
      if (path[ci(x, z)] || path[ci(x + 1, z)] || path[ci(x - 1, z)] || path[ci(x, z + 1)] || path[ci(x, z - 1)]) continue;
      if (Lg(x + 1, z) >= 0 || Lg(x - 1, z) >= 0 || Lg(x, z + 1) >= 0 || Lg(x, z - 1) >= 0) continue;
      trees.push([x, z]);
      tree(th0 >= SEA + 8 ? 2 : (x < -4 && z > -8) || hash(x, z * 5) > .82 ? 1 : 0, x, th0, z);
    }
    for (x = -R + 1; x < R; x++) for (z = -R + 1; z < R; z++) {
      var bh = H[ci(x, z)]; if (get(x, bh, z) !== GRASS || get(x, bh + 1, z) || hash(x * 7.7, z * 3.3) < .993 || blocked(x, z)) continue;
      set(x, bh + 1, z, hash(x, z) > .5 ? COBBLE : STONE);
      if (H[ci(x + 1, z)] === bh && !get(x + 1, bh + 1, z) && hash(z, x) > .4) set(x + 1, bh + 1, z, STONE);
    }
    for (x = -R; x <= R; x++) for (z = -R; z <= R; z++) {
      var ph = H[ci(x, z)]; if (get(x, ph, z) !== GRASS || get(x, ph + 1, z)) continue;
      var r = hash(x * 5.3, z + 7), mm = vn(x * .12 - 20, z * .12 + 5);
      if (r > .955 - mm * .08) set(x, ph + 1, z, FLOWER + Math.floor(hash(x, z * 3) * 4));
      else if (r > .64) set(x, ph + 1, z, TALL);
    }
    chairs.concat(decoys).forEach(function (c) { set(c.x, c.y, c.z, 0); set(c.x, c.y + 1, c.z, 0); });
    bonus.forEach(function (b) { set(Math.floor(b.charis.x), b.charis.y, Math.floor(b.charis.z), 0); });
    chal.length -= bonus.length;
    var top = new Int16Array(NX * NX), water = new Uint8Array(NX * NX);
    for (x = -R; x <= R; x++) for (z = -R; z <= R; z++) {
      var tt = -1; for (y = NY - 1; y >= 0; y--) { var g2 = get(x, y, z); if (g2 && !PLANT[g2]) { tt = y; break; } }
      top[ci(x, z)] = tt; water[ci(x, z)] = tt < SEA - 1 ? 1 : 0;
    }
    return { B: B, top: top, water: water, lamps: lamps, chal: chal, bonus: bonus, chairs: chairs, decoys: decoys, L: [lx, Lb, lz], C: [cx, Cb, cz], T: [tx, Tb, tz], K: K, pier: [Px, z0, zEnd], mill: mill };
  }

  function tileFor(id, f, s, sky) {
    var snow = s === 3 && sky && f === 0;
    switch (id) {
      case GRASS: return f === 0 ? T_GT + s : f === 1 ? T_DIRT : T_GS + s;
      case PATH: return f === 0 ? (snow ? T_SNOW : T_PATH) : T_DIRT;
      case OAK: case BIRCH: case SPRUCE: case CHERRY: return f < 2 ? (snow ? T_SNOW : T_LOGTOP) : id === OAK ? T_OAK : id === BIRCH ? T_BIRCH : id === SPRUCE ? T_SPRUCE : T_CHERRY;
      case OAKL: return T_OAKL + s;
      case BIRCHL: return T_BIRCHL + s;
      case SPRUCEL: return T_SPRUCEL + s;
      case CHERRYL: return T_CHERRYL + s;
      case LAMP: case LANTERN: return T_LAMP;
      case GLASS: return T_GLASS;
      case WHEAT: return T_WHEAT + s;
      case LILY: return s === 3 ? 0 : T_LILY + Math.min(s, 2);
      case FARM: return f === 0 ? (snow ? T_SNOW : T_FARM) : T_DIRT;
      case CLOCK: return f === 2 ? T_CLOCK : T_WHITE;
      case FENCE: return T_PLANK;
    }
    return snow ? T_SNOW : BASE[id];
  }
  var FACES = [
    { n: [1, 0, 0], o: [1, 0, 1], u: [0, 0, -1], v: [0, 1, 0], f: 2, sh: .9 },
    { n: [-1, 0, 0], o: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0], f: 2, sh: .9 },
    { n: [0, 1, 0], o: [0, 1, 1], u: [1, 0, 0], v: [0, 0, -1], f: 0, sh: 1 },
    { n: [0, -1, 0], o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], f: 1, sh: .7 },
    { n: [0, 0, 1], o: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], f: 2, sh: .84 },
    { n: [0, 0, -1], o: [1, 0, 0], u: [-1, 0, 0], v: [0, 1, 0], f: 2, sh: .84 },
  ];
  var AOV = [.42, .62, .8, 1], E = .012;
  function Buf() { return { p: [], n: [], c: [], u: [[], [], [], []], i: [] }; }
  function uvp(b, tiles, cu, cv) { for (var s = 0; s < 4; s++) { var t = tiles[s], c = t % 16, r = t >> 4; b.u[s].push((c + (cu ? 1 - E : E)) / 16, 1 - (r + (cv ? E : 1 - E)) / 8); } }
  // Axis-aligned box with a full tile on every face (fence posts, rails, lanterns).
  var BOXF = [
    [[1, 0, 0], .86, function (a, b) { return [[b[0], a[1], b[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [b[0], b[1], b[2]]]; }],
    [[-1, 0, 0], .86, function (a, b) { return [[a[0], a[1], a[2]], [a[0], a[1], b[2]], [a[0], b[1], b[2]], [a[0], b[1], a[2]]]; }],
    [[0, 0, 1], .86, function (a, b) { return [[a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], b[2]]]; }],
    [[0, 0, -1], .86, function (a, b) { return [[b[0], a[1], a[2]], [a[0], a[1], a[2]], [a[0], b[1], a[2]], [b[0], b[1], a[2]]]; }],
    [[0, 1, 0], 1, function (a, b) { return [[a[0], b[1], b[2]], [b[0], b[1], b[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]]]; }],
    [[0, -1, 0], .7, function (a, b) { return [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], a[1], b[2]], [a[0], a[1], b[2]]]; }],
  ];
  function boxQ(b, a, c, tiles) {
    BOXF.forEach(function (F) {
      var base = b.p.length / 3, q = F[2](a, c);
      q.forEach(function (v, k) { b.p.push(v[0], v[1], v[2]); b.n.push(F[0][0], F[0][1], F[0][2]); b.c.push(F[1], F[1], F[1]); uvp(b, tiles, k === 1 || k === 2, k >= 2); });
      b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  }
  function buildMesh(W) {
    var bufs = { op: Buf(), cut: Buf(), glow: Buf(), plant: Buf(), liq: { p: [], n: [], c: [], uv: [], i: [] } }, B = W.B;
    var PL = [T_PLANK, T_PLANK, T_PLANK, T_PLANK];
    function g(x, y, z) { return x < -R || x > R || z < -R || z > R || y < 0 || y >= NY ? 0 : B[((x + R) * NY + y) * NX + (z + R)]; }
    function o(x, y, z) { return OPQ[g(x, y, z)]; }
    for (var x = -R; x <= R; x++) for (var z = -R; z <= R; z++) {
      var tc = W.top[(x + R) * NX + (z + R)];
      for (var y = 0; y <= Math.min(NY - 1, tc + 1); y++) {
        var id = g(x, y, z); if (!id) continue;
        if (id === WATERB) {
          // River/pond water: faces only towards air; the surface sits a little below the block top.
          var L = bufs.liq, th = g(x, y + 1, z) === WATERB ? 1 : .88;
          for (var wf = 0; wf < 6; wf++) {
            var WF = FACES[wf], wn = WF.n, wnb = g(x + wn[0], y + wn[1], z + wn[2]);
            if (wnb === WATERB || OPQ[wnb] || wf === 3 || (wf === 2 && th === 1)) continue;
            var wb = L.p.length / 3;
            for (var wk = 0; wk < 4; wk++) {
              var wu = wk === 1 || wk === 2 ? 1 : 0, wv = wk >= 2 ? 1 : 0;
              var px = x + WF.o[0] + wu * WF.u[0] + wv * WF.v[0], py = y + (WF.o[1] + wu * WF.u[1] + wv * WF.v[1]) * th, pz = z + WF.o[2] + wu * WF.u[2] + wv * WF.v[2];
              L.p.push(px, py, pz); L.n.push(wn[0], wn[1], wn[2]); L.c.push(WF.sh, WF.sh, WF.sh);
              if (wf === 2) L.uv.push(px * .25, pz * .25); else L.uv.push((px + pz) * .25, py * .25);
            }
            L.i.push(wb, wb + 1, wb + 2, wb, wb + 2, wb + 3);
          }
          continue;
        }
        if (id === FENCE) {
          boxQ(bufs.op, [x + .38, y, z + .38], [x + .62, y + 1, z + .62], PL);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
            var nb = g(x + d[0], y, z + d[1]); if (nb !== FENCE && !(OPQ[nb] && !CUT[nb])) return;
            var x0 = d[0] > 0 ? x + .62 : d[0] < 0 ? x : x + .44, x1 = d[0] > 0 ? x + 1 : d[0] < 0 ? x + .38 : x + .56;
            var z0 = d[1] > 0 ? z + .62 : d[1] < 0 ? z : z + .44, z1 = d[1] > 0 ? z + 1 : d[1] < 0 ? z + .38 : z + .56;
            boxQ(bufs.op, [x0, y + .32, z0], [x1, y + .46, z1], PL); boxQ(bufs.op, [x0, y + .68, z0], [x1, y + .82, z1], PL);
          });
          continue;
        }
        if (id === LANTERN) {
          boxQ(bufs.glow, [x + .32, y, z + .32], [x + .68, y + .44, z + .68], [T_LAMP, T_LAMP, T_LAMP, T_LAMP]);
          boxQ(bufs.op, [x + .28, y + .44, z + .28], [x + .72, y + .54, z + .72], [T_DARK, T_DARK, T_DARK, T_SNOW]);
          continue;
        }
        if (id === LILY) {
          var lb = bufs.plant, lbase = lb.p.length / 3, ly = y - .1, lt = [tileFor(LILY, 0, 0), tileFor(LILY, 0, 1), tileFor(LILY, 0, 2), tileFor(LILY, 0, 3)];
          [[0, 1, 0, 0], [1, 1, 1, 0], [1, 0, 1, 1], [0, 0, 0, 1]].forEach(function (v) { lb.p.push(x + v[0], ly, z + v[1]); lb.n.push(0, 1, 0); lb.c.push(1, 1, 1); uvp(lb, lt, v[2], v[3]); });
          lb.i.push(lbase, lbase + 1, lbase + 2, lbase, lbase + 2, lbase + 3);
          continue;
        }
        if (PLANT[id]) {
          var b = bufs.plant, r = hash(x * 1.7 + y, z * 2.3), tl;
          if (id === TALL) tl = [T_TALL, T_TALL + 1, T_TALL + 2, 0];
          else if (id === WHEAT) tl = [T_WHEAT, T_WHEAT + 1, T_WHEAT + 2, T_WHEAT + 3];
          else { var ft = T_FLOWER + id - FLOWER; tl = [ft, r < .6 ? ft : 0, r < .18 ? ft : 0, 0]; }
          [[.15, .15, .85, .85], [.85, .15, .15, .85]].forEach(function (q) {
            var base = b.p.length / 3;
            [[q[0], 0, q[1], 0, 0], [q[2], 0, q[3], 1, 0], [q[2], 1, q[3], 1, 1], [q[0], 1, q[1], 0, 1]].forEach(function (v) {
              b.p.push(x + v[0], y + v[1] * .95, z + v[2]); b.n.push(0, 1, 0); var br = v[4] ? 1 : .72; b.c.push(br, br, br); uvp(b, tl, v[3], v[4]);
            });
            b.i.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 2, base + 1, base, base + 3, base + 2);
          });
          continue;
        }
        var buf = id === LAMP ? bufs.glow : CUT[id] ? bufs.cut : bufs.op, sky = y === tc && y >= SEA - 1;
        for (var fi = 0; fi < 6; fi++) {
          var F = FACES[fi], n = F.n, nb = g(x + n[0], y + n[1], z + n[2]);
          if (OPQ[nb] || (nb === id && CUT[id]) || (y === 0 && fi === 3)) continue;
          var tiles = [tileFor(id, F.f, 0, sky), tileFor(id, F.f, 1, sky), tileFor(id, F.f, 2, sky), tileFor(id, F.f, 3, sky)];
          var base2 = buf.p.length / 3, ao = [], sx = x + n[0], sy = y + n[1], sz = z + n[2];
          for (var k = 0; k < 4; k++) {
            var cu = k === 1 || k === 2 ? 1 : 0, cv = k >= 2 ? 1 : 0, su = cu ? 1 : -1, sv = cv ? 1 : -1;
            var s1 = o(sx + su * F.u[0], sy + su * F.u[1], sz + su * F.u[2]), s2 = o(sx + sv * F.v[0], sy + sv * F.v[1], sz + sv * F.v[2]);
            var cc = o(sx + su * F.u[0] + sv * F.v[0], sy + su * F.u[1] + sv * F.v[1], sz + su * F.u[2] + sv * F.v[2]);
            var av = s1 && s2 ? 0 : 3 - s1 - s2 - cc; ao.push(av);
            var br2 = AOV[av] * F.sh;
            buf.p.push(x + F.o[0] + cu * F.u[0] + cv * F.v[0], y + F.o[1] + cu * F.u[1] + cv * F.v[1], z + F.o[2] + cu * F.u[2] + cv * F.v[2]);
            buf.n.push(n[0], n[1], n[2]); buf.c.push(br2, br2, br2); uvp(buf, tiles, cu, cv);
          }
          if (ao[0] + ao[2] >= ao[1] + ao[3]) buf.i.push(base2, base2 + 1, base2 + 2, base2, base2 + 2, base2 + 3);
          else buf.i.push(base2 + 1, base2 + 2, base2 + 3, base2 + 1, base2 + 3, base2);
        }
      }
    }
    return bufs;
  }

  class Game {
    constructor(T, loc, onClose) {
      this.T = T; this.loc = loc; this.L = TX[loc]; this.onClose = onClose;
      this.keys = {}; this.joy = { x: 0, y: 0 }; this.season = 1; this.hour = 12;
      this.vx = this.vy = this.vz = 0; this.onGround = false; this.bobT = this.bobA = 0; this._unlockT = 0;
      this.st = loadSt();
      this._ui();
      try { this._gl(); this._world(); } catch (e) {
        console.warn(e); this.flash.style.opacity = 0;
        this.stage.appendChild(el('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#cbbcf0', this.L.fail)); return;
      }
      this._resize(); this._spawn(); this._setSeason(1); this._setHour(12); this._challenges(); this._chairCount(); this._pick(null, true); this._loop();
      var f = this.flash; requestAnimationFrame(function () { f.style.transition = 'opacity .7s ease'; f.style.opacity = 0; });
    }
    _ui() {
      var self = this, L = this.L;
      this._prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      var root = this.root = el('div', 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:#120c26;color:#faf6ff;font-family:' + FONT + ';-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent');
      root.className = 'aepc-root'; css();
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
      var st = this.stage = el('div', 'position:relative;flex:1 1 auto;min-height:0;overflow:hidden;touch-action:none;cursor:crosshair');
      root.appendChild(st);
      var narrow = this.narrow = window.innerWidth < 720;
      this.ghost = el('img', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.36;pointer-events:none;display:none');
      var vig = el('div', 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 75% at 50% 50%,rgba(10,6,24,0) 55%,rgba(10,6,24,.5) 100%)');
      var vf = el('div', 'position:absolute;inset:clamp(14px,2.6vw,22px);pointer-events:none');
      [['top:0;left:0', 'border-top', 'border-left'], ['top:0;right:0', 'border-top', 'border-right'], ['bottom:0;left:0', 'border-bottom', 'border-left'], ['bottom:0;right:0', 'border-bottom', 'border-right']].forEach(function (c) {
        vf.appendChild(el('div', 'position:absolute;' + c[0] + ';width:22px;height:22px;' + c[1] + ':1.5px solid rgba(250,246,255,.85);' + c[2] + ':1.5px solid rgba(250,246,255,.85)'));
      });
      ['left:33.333%;top:0;bottom:0;width:1px', 'left:66.666%;top:0;bottom:0;width:1px', 'top:33.333%;left:0;right:0;height:1px', 'top:66.666%;left:0;right:0;height:1px'].forEach(function (c) {
        vf.appendChild(el('div', 'position:absolute;' + c + ';background:rgba(250,246,255,.09)'));
      });
      var ret = el('div', 'position:absolute;left:50%;top:50%;width:38px;height:38px;margin:-19px 0 0 -19px;border:1px solid rgba(250,246,255,.7);border-radius:50%');
      ret.appendChild(el('div', 'position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;border-radius:50%;background:#fbc75a'));
      ['left:50%;top:-9px;width:1px;height:6px', 'left:50%;bottom:-9px;width:1px;height:6px', 'top:50%;left:-9px;width:6px;height:1px', 'top:50%;right:-9px;width:6px;height:1px'].forEach(function (c) { ret.appendChild(el('div', 'position:absolute;' + c + ';background:rgba(250,246,255,.7)')); });
      vf.appendChild(ret);
      var pm = el('div', 'position:absolute;right:10px;top:50%;width:14px;height:clamp(90px,22vh,150px);transform:translateY(-50%)');
      for (var q = 0; q <= 8; q++) pm.appendChild(el('div', 'position:absolute;right:0;top:' + q * 12.5 + '%;height:1px;width:' + (q % 4 === 0 ? 14 : 7) + 'px;background:rgba(250,246,255,' + (q === 4 ? '.8' : '.35') + ')'));
      this.pitchMk = el('div', 'position:absolute;right:17px;top:50%;width:0;height:0;margin-top:-4px;border-top:4px solid transparent;border-bottom:4px solid transparent;border-left:6px solid #fbc75a');
      pm.appendChild(this.pitchMk); vf.appendChild(pm);
      st.append(this.ghost, vig, vf);
      this.rec = el('div', 'position:absolute;top:clamp(20px,3.6vw,30px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:rgba(14,9,30,.55);border:1px solid rgba(205,182,242,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:11.5px;letter-spacing:.08em;font-variant-numeric:tabular-nums;color:#e6dcfa;pointer-events:none;white-space:nowrap');
      st.appendChild(this.rec);
      var tg = el('div', 'position:absolute;top:clamp(24px,4vw,34px);left:clamp(24px,4vw,34px);display:flex;flex-direction:column;gap:12px;align-items:flex-start');
      this.thumbBtn = el('button', 'all:unset;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:6px 6px 7px;' + POLA + ';transform:rotate(-2.5deg);transition:transform .2s ease');
      this.thumbBtn.className = 'aepc-thumb'; this.thumbBtn.setAttribute('aria-label', L.target);
      this.thumb = el('img', 'display:block;width:clamp(84px,16vw,136px);aspect-ratio:4/3;object-fit:cover;background:#2a1f48');
      this.thumbLbl = el('span', 'font-family:' + SERIF + ';font-size:11.5px;letter-spacing:.03em;color:#3a2b62;padding:0 2px;max-width:clamp(84px,16vw,136px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis');
      this.thumbBtn.append(this.thumb, this.thumbLbl);
      this.thumbBtn.onclick = function () { self._showBrief(); };
      this.ghostBtn = btn(PILL + ';min-height:34px;padding:0 12px;font-size:11.5px', ico('ghost', 16) + '<span>' + L.ghost + '</span>');
      this.ghostBtn.onclick = function () { self.ghostBtn.blur(); self._ghost(!self.ghostOn); };
      this.chairCt = el('div', PILL + ';cursor:default;min-height:30px;padding:0 12px;font-size:11.5px;font-variant-numeric:tabular-nums;display:none');
      this.chairCt.setAttribute('aria-live', 'polite');
      tg.append(this.thumbBtn, this.ghostBtn, this.chairCt); st.appendChild(tg);
      var close = btn(PILL + ';position:absolute;top:clamp(22px,3.8vw,32px);right:clamp(22px,3.8vw,32px);width:44px;height:44px;padding:0', ico('close', 18));
      close.setAttribute('aria-label', L.close); close.onclick = function () { self.close(); };
      st.appendChild(close);
      var sh = el('button', 'all:unset;cursor:pointer;position:absolute;right:clamp(26px,4vw,42px);bottom:clamp(26px,4vw,42px);width:80px;height:80px;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:rgba(14,9,30,.35);border:2px solid rgba(250,246,255,.92);box-shadow:0 10px 26px rgba(0,0,0,.4)');
      sh.className = 'aepc-shut';
      var shi = el('span', 'position:relative;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe2a1,#fbc75a 45%,#e0890b);box-shadow:inset 0 -3px 6px rgba(120,60,0,.35),0 0 20px rgba(251,199,90,.35);transition:transform .12s ease');
      shi.appendChild(el('span', 'position:absolute;inset:9px;border-radius:50%;border:1.5px solid rgba(46,35,82,.22)'));
      sh.appendChild(shi); sh.setAttribute('aria-label', L.shoot);
      sh.onpointerdown = function (e) { e.stopPropagation(); shi.style.transform = 'scale(.86)'; };
      sh.onpointerup = sh.onpointerleave = function () { shi.style.transform = ''; };
      sh.onclick = function () { sh.blur(); self._shoot(); };
      st.appendChild(sh);
      if (coarse) {
        var jb = el('div', 'position:absolute;left:clamp(24px,4vw,40px);bottom:clamp(24px,4vw,40px);width:116px;height:116px;border-radius:50%;background:radial-gradient(circle,rgba(250,246,255,.05),rgba(14,9,30,.45));border:1.5px solid rgba(250,246,255,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);touch-action:none');
        jb.appendChild(el('div', 'position:absolute;inset:22px;border-radius:50%;border:1px dashed rgba(250,246,255,.18);pointer-events:none'));
        var kn = el('div', 'position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#faf6ff,#d9cbf5);border:2px solid rgba(251,199,90,.7);box-shadow:0 4px 12px rgba(0,0,0,.35);pointer-events:none');
        jb.appendChild(kn); st.appendChild(jb);
        var jid = null;
        var jm = function (e) {
          var r = jb.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, m = Math.hypot(dx, dy), max = 42;
          if (m > max) { dx *= max / m; dy *= max / m; }
          kn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; self.joy.x = dx / max; self.joy.y = dy / max;
        };
        jb.addEventListener('pointerdown', function (e) { e.stopPropagation(); jid = e.pointerId; jb.setPointerCapture(jid); jm(e); self._seen(); });
        jb.addEventListener('pointermove', function (e) { if (e.pointerId === jid) jm(e); });
        var je = function (e) { if (e.pointerId !== jid) return; jid = null; kn.style.transform = ''; self.joy.x = self.joy.y = 0; };
        jb.addEventListener('pointerup', je); jb.addEventListener('pointercancel', je);
        var jp = el('button', 'all:unset;box-sizing:border-box;cursor:pointer;position:absolute;right:calc(clamp(26px,4vw,42px) + 8px);bottom:calc(clamp(26px,4vw,42px) + 94px);width:64px;height:64px;border-radius:50%;background:rgba(14,9,30,.45);border:1.5px solid rgba(250,246,255,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;touch-action:none');
        jp.setAttribute('aria-label', L.jump);
        jp.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf6ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"></path></svg>';
        jp.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); self.jumpHeld = true; });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { jp.addEventListener(ev, function () { self.jumpHeld = false; }); });
        st.appendChild(jp);
      }
      this.keyHint = el('div', 'position:absolute;left:50%;' + (narrow ? 'top:56%' : 'top:calc(clamp(20px,3.6vw,30px) + 48px)') + ';transform:translateX(-50%);width:max-content;max-width:min(560px,calc(100% - 48px));padding:9px 16px;border-radius:14px;background:rgba(14,9,30,.6);border:1px solid rgba(205,182,242,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:11.5px;line-height:1.6;letter-spacing:.03em;color:#e6dcfa;text-align:center;pointer-events:none;transition:opacity .6s ease', coarse ? L.touch : L.keys);
      st.appendChild(this.keyHint);
      this.prompt = btn(PILL + ';position:absolute;left:50%;bottom:calc(clamp(24px,4vw,40px) + 22px);transform:translateX(-50%);min-height:42px;border-color:rgba(251,199,90,.55);display:none', '');
      this.prompt.onpointerdown = function (e) { e.stopPropagation(); };
      this.prompt.onclick = function () { self.prompt.blur(); self._interact(); };
      st.appendChild(this.prompt);
      this.talk = el('div', 'position:absolute;left:50%;bottom:clamp(18px,3.4vw,32px);transform:translateX(-50%);width:min(640px,calc(100% - 32px));box-sizing:border-box;display:none;flex-direction:column;gap:10px;padding:16px clamp(16px,2.4vw,22px);border-radius:18px;background:linear-gradient(165deg,rgba(37,27,75,.95),rgba(22,15,46,.95));border:1px solid rgba(205,182,242,.24);box-shadow:0 24px 60px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)');
      this.talk.setAttribute('role', 'dialog'); this.talk.setAttribute('aria-live', 'polite');
      this.talk.onpointerdown = function (e) { e.stopPropagation(); };
      this.flashShot = el('div', 'position:absolute;inset:0;background:#faf6ff;opacity:0;pointer-events:none');
      this.iris = el('div', 'position:absolute;left:50%;top:50%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;border-radius:50%;box-shadow:0 0 0 160vmax #0b0716;pointer-events:none;display:none');
      st.append(this.flashShot, this.iris);
      this.brief = el('div', 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(11,7,24,.66);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)');
      this.result = el('div', this.brief.style.cssText);
      st.append(this.brief, this.result, this.talk);
      var bar = el('div', 'flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 26px;padding:14px clamp(16px,3vw,28px) calc(14px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#1d1539,#140e2b);border-top:1px solid rgba(205,182,242,.14);box-shadow:0 -12px 30px rgba(0,0,0,.25)');
      var tb = el('label', 'display:flex;align-items:center;gap:12px;flex:1 1 280px;min-width:0');
      this.timeIco = el('span', 'display:flex;color:#fbc75a');
      this.timeVal = el('span', 'font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;min-width:50px;letter-spacing:.02em');
      this.range = el('input', 'flex:1;min-width:80px;height:28px;margin:0;cursor:pointer'); this.range.className = 'aepc-range';
      this.range.type = 'range'; this.range.min = 0; this.range.max = 23.75; this.range.step = .25; this.range.value = 12;
      this.range.oninput = function () { self._setHour(+self.range.value); };
      this.range.onchange = this.range.onpointerup = function () { self.range.blur(); };
      tb.append(el('span', KICK, L.time), this.timeIco, this.timeVal, this.range);
      var sb = el('div', 'display:flex;align-items:center;gap:12px');
      sb.appendChild(el('span', KICK, L.season));
      var sg = el('div', 'display:flex;gap:3px;padding:3px;border-radius:999px;background:rgba(250,246,255,.05);border:1px solid rgba(205,182,242,.2)');
      var icn = ['spring', 'sun', 'leaf', 'snow'], tiny = window.innerWidth < 420;
      this.segBtns = L.seasons.map(function (s, i) {
        var b = btn('all:unset;box-sizing:border-box;cursor:pointer;min-height:36px;min-width:40px;padding:0 12px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;font-size:12.5px;letter-spacing:.04em', ico(icn[i], 15) + (tiny ? '' : '<span>' + s + '</span>'), 'aepc-seg');
        b.setAttribute('aria-label', s); b.title = s;
        b.onclick = function () { b.blur(); self._setSeason(i); };
        sg.appendChild(b); return b;
      });
      sb.appendChild(sg);
      var nb = btn(PILL + ';border-color:rgba(251,199,90,.45)', ico('shuffle', 16) + '<span>' + L.newShot + '</span>');
      nb.onclick = function () { nb.blur(); self._pick(); };
      bar.append(tb, sb, nb);
      root.appendChild(bar);
      this.flash = el('div', 'position:absolute;inset:0;background:#faf6ff;opacity:1;pointer-events:none');
      root.appendChild(this.flash);
      document.body.appendChild(root);
      // Look: pointer lock on desktop (click to capture), drag on touch / as fallback
      st.addEventListener('pointerdown', function (e) {
        if (e.target !== self.canvas) return;
        self._seen();
        if (e.pointerType === 'mouse') { if (self._locked()) { self._shoot(); return; } self._lock(); }
        if (self.drag) return;
        self.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        if (e.pointerType !== 'mouse') st.setPointerCapture(e.pointerId);
      });
      st.addEventListener('pointermove', function (e) {
        var d = self.drag; if (!d || d.id !== e.pointerId || self._locked()) return;
        self._look(e.clientX - d.x, e.clientY - d.y, e.pointerType === 'touch' ? .0062 : .0042);
        d.x = e.clientX; d.y = e.clientY;
      });
      var up = function (e) { if (self.drag && self.drag.id === e.pointerId) self.drag = null; };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      this._mm = function (e) { if (self._locked()) self._look(e.movementX || 0, e.movementY || 0, .0023); };
      this._plc = function () { if (!self._locked()) self._unlockT = performance.now(); self.drag = null; };
      document.addEventListener('mousemove', this._mm); document.addEventListener('pointerlockchange', this._plc);
      var MOVE = /^(Arrow(Up|Down|Left|Right)|Key[WASD]|Space|ShiftLeft|ShiftRight|ControlLeft)$/;
      this._kd = function (e) {
        var c = e.code;
        if (self.merge) return;
        if (self._talking()) {
          if (c === 'Escape') self._talkEnd();
          else if (/^Digit[1-4]$/.test(c) && self.talkOpts[+c.charAt(5) - 1]) self.talkOpts[+c.charAt(5) - 1].click();
          return;
        }
        if (c === 'Escape') { if (self._locked() || performance.now() - self._unlockT < 400) return; if (self.result.style.display === 'flex') self._hide(self.result); else self.close(); return; }
        if (self._modal()) { if (c === 'Enter' || c === 'Space') { e.preventDefault(); if (self._modalBtn && !e.repeat) self._modalBtn(); } return; }
        if (c === 'KeyF' || c === 'Enter') { e.preventDefault(); if (!e.repeat) self._shoot(); return; }
        if (c === 'KeyT') { if (!e.repeat) self._interact(); return; }
        if (c === 'KeyQ' || c === 'KeyE') { self._setHour((((self.hour + (c === 'KeyE' ? .5 : -.5)) % 24) + 24) % 24); return; }
        if (/^Digit[1-4]$/.test(c)) { self._setSeason(+c.charAt(5) - 1); return; }
        if (MOVE.test(c)) { e.preventDefault(); self.keys[c] = true; self._seen(); }
      };
      this._ku = function (e) { self.keys[e.code] = false; };
      this._bl = function () { self.keys = {}; self.jumpHeld = false; };
      window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku); window.addEventListener('blur', this._bl);
      this._rs = function () { self._resize(); }; window.addEventListener('resize', this._rs);
      this._ro = new ResizeObserver(this._rs); this._ro.observe(st);
    }
    _look(dx, dy, k) { this.yaw -= dx * k; this.pitch = clamp(this.pitch - dy * k, -1.5, 1.5); }
    _locked() { return !!this.canvas && document.pointerLockElement === this.canvas; }
    _lock() { if (coarse || !this.canvas || !this.canvas.requestPointerLock) return; try { var p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    _unlock() { if (this._locked() && document.exitPointerLock) document.exitPointerLock(); }
    _seen() { if (!this._hinted) { this._hinted = true; var k = this.keyHint; setTimeout(function () { k.style.opacity = 0; }, 4500); } }
    _modal() { return this.brief.style.display === 'flex' || this.result.style.display === 'flex' || this._talking() || !!this.merge; }
    _talking() { return !!this.talk && this.talk.style.display === 'flex'; }
    // Dialogue box: speaker, typed line, options as [label, fn, primary].
    _say(who, text, opts) {
      var self = this, o = this.talk; this._freeze(); this.prompt.style.display = 'none'; this._tg = null;
      o.innerHTML = ''; o.style.display = 'flex';
      var line = el('p', 'margin:0;min-height:3.3em;font-family:' + SERIF + ';font-size:clamp(15px,2vw,17px);line-height:1.65;letter-spacing:.02em;color:#faf6ff;text-wrap:pretty');
      var row = el('div', 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end');
      this.talkOpts = opts.map(function (q) {
        var b = btn(q[2] ? GOLD + ';min-height:40px;padding:0 20px' : PILL, '', q[2] ? 'aepc-btn aepc-gold' : 'aepc-btn'); b.textContent = q[0];
        b.onclick = function () { b.blur(); q[1](); }; row.appendChild(b); return b;
      });
      o.append(el('span', KICK, who), line, row);
      clearInterval(this._type);
      if (reduce) line.textContent = text;
      else { var n = 0, ch = Array.from(text); this._type = setInterval(function () { n += 2; line.textContent = ch.slice(0, n).join(''); if (n >= ch.length) clearInterval(self._type); }, 28); }
      var f = this.talkOpts[this.talkOpts.length - 1]; setTimeout(function () { if (f.isConnected) f.focus({ preventScroll: true }); }, 60);
    }
    _talkEnd(look) { clearInterval(this._type); this.talk.style.display = 'none'; this.talk.innerHTML = ''; this.talkOpts = []; if (look) this._lock(); }
    _chairCount() {
      var n = this.st.f.length, N = this.chairs.length;
      this.chairCt.style.display = n && !this.st.u ? 'inline-flex' : 'none';
      this.chairCt.innerHTML = ico('chair', 15) + '<span>' + this.L.chairs + ' ' + n + '/' + N + '</span>';
    }
    _interact() {
      var t = this._tg; if (!t || this._modal()) return;
      var self = this, L = this.L, end = function () { self._talkEnd(true); };
      if (t === 'charis') { this._charisTalk(false); return; }
      var i = +t.slice(1), decoy = t.charAt(0) === 'd', k = decoy ? null : this.W.chairs[i].k;
      var q = decoy ? function () { self._say(L.chairName, L.dq, [[L.leave, end]]); } : function () { self._chairQ(i); };
      var sit = function () { self._say(L.chairName, decoy ? L.ds : L.cs[k], [[L.stand, end], ['?', q, 1]]); };
      this._say(L.chairName, L.chair, [[L.leave, end], [L.sit, sit], ['?', q, 1]]);
    }
    _chairQ(i) {
      var self = this, L = this.L, f = this.st.f, N = this.chairs.length, had = f.indexOf(i) >= 0;
      this.chairs[i].userData.shake = reduce ? .3 : .9;
      if (!had) { f.push(i); saveSt(this.st); this._chairCount(); }
      var fmt = function (s) { return s.replace(/\{n\}/g, f.length).replace(/\{N\}/g, N); };
      var next = function () {
        if (f.length >= N) self._say(L.chairName, fmt(L.last), [['!', function () { self._talkEnd(); self._mergeStart(); }, 1]]);
        else self._say(L.chairName, fmt(had ? L.again : L.want), [[L.leave, function () { self._talkEnd(true); }]]);
      };
      if (had) next(); else this._say(L.chairName, L.cq[this.W.chairs[i].k], [['…', next, 1]]);
    }
    _charisTalk(first) {
      var self = this, L = this.L, who = L.charis, end = function () { self._talkEnd(true); };
      var bonus = function (k) { return function () { self._talkEnd(); self._pick(self.list.length - 2 + k); }; };
      var comp = function () {
        // Close the game and bring the competition's key dates into view on the page underneath.
        self._talkEnd(); self.close();
        setTimeout(function () { var t = document.querySelector('[data-ae-steps]'); if (!t) return; t = t.closest('section') || t; if (window.AeLenis) window.AeLenis.scrollTo(t, { offset: -70 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }, 420);
      };
      var B = this.W.bonus;
      if (first) {
        this.wave = 1.8;
        var lines = [[L.ch1, '…'], [L.ch2, L.yay], [L.ch3, '?'], [L.ch4, L.ha], [L.ch5, '…']];
        var step = function (n) {
          if (n === 3 || n === 0) self.wave = 1.2;
          if (n < lines.length) self._say(who, lines[n][0], [[lines[n][1], function () { step(n + 1); }, 1]]);
          else self._say(who, L.ch6, [[L.later, end], [L.comp, comp], [L.show, bonus(0), 1]]);
        };
        step(0);
      } else {
        this.wave = 1.2;
        this._say(who, L.ch7, [[L.reset, function () { self._resetChairs(); end(); }], [L.comp, comp], [B[0][this.loc], bonus(0), 1], [B[1][this.loc], bonus(1), 1]]);
      }
    }
    _resetChairs() {
      this.st = { f: [], u: 0 }; saveSt(this.st); this.bseen = {};
      this.chairs.forEach(function (c) { var u = c.userData; c.visible = true; c.position.copy(u.home); c.rotation.set(0, u.yaw, 0); c.scale.setScalar(1); });
      this.charis.visible = this.goldChair.visible = false;
      var wasBonus = this.ch && this.ch.bonus; this._challenges(); this._chairCount();
      if (wasBonus) this._pick();
    }
    _placeCharis(c) {
      var C = this.charis, P = C.userData.parts, sit = !!c.sit;
      C.visible = true; C.scale.setScalar(1); C.position.set(c.x, c.y - (sit ? .1 : 0), c.z); C.rotation.y = c.yaw; C.userData.yaw = c.yaw; C.userData.sit = sit;
      P.legL.rotation.x = P.legR.rotation.x = sit ? -Math.PI / 2 : 0;
      this.goldChair.visible = sit; if (sit) { this.goldChair.position.set(c.x, c.y, c.z); this.goldChair.rotation.y = c.yaw; }
    }
    _mergeStart() {
      // Meet about 4.5 m away on the player's own level, as close to straight ahead as the ground allows.
      var fl = Math.round(this.py), p = null, self = this;
      var clear = function (x, z) { var n = 8; for (var s = 1; s < n; s++) { var t = s / n; if (self._solid(Math.floor(self.px + (x + .5 - self.px) * t), fl + 1, Math.floor(self.pz + (z + .5 - self.pz) * t))) return false; } return true; };
      [4.5, 3.5, 2.5, 1.7].some(function (dd) {
        for (var k = 0; k < 12 && !p; k++) {
          var a = self.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5, x = Math.floor(self.px - Math.sin(a) * dd), z = Math.floor(self.pz - Math.cos(a) * dd);
          for (var f2 = fl - 1; f2 <= fl + 1 && !p; f2++) if (self._solid(x, f2 - 1, z) && !self._hit(x + .5, f2, z + .5) && clear(x, z)) p = [x, z, f2];
        }
        return !!p;
      });
      if (!p) p = this._near(this.px - Math.sin(this.yaw) * 4.5, this.pz - Math.cos(this.yaw) * 4.5);
      this.merge = { t: 0, c: [p[0] + .5, p[2], p[1] + .5] }; this._freeze();
      this.chairs.forEach(function (c) { c.userData.from = c.position.clone(); c.userData.r0 = c.rotation.y; });
    }
    _mergeTick(dt) {
      var m = this.merge, T = this.T, t = m.t += dt, c = m.c, N = this.chairs.length;
      var A = reduce ? 0 : 1, B = reduce ? 0 : 2, C = reduce ? .2 : 1, R0 = A + B + C;
      // Turn the view toward the meeting point.
      var eye = this.py + 1.62, wy = Math.atan2(this.px - c[0], this.pz - c[2]), wp = Math.atan2(c[1] + (m.shown ? 1.1 : 1.8) - eye, Math.hypot(this.px - c[0], this.pz - c[2]));
      var dy = ((wy - this.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI, k = 1 - Math.exp(-dt * 3);
      this.yaw += dy * k; this.pitch += (clamp(wp, -.6, .8) - this.pitch) * k;
      if (t < R0 && !reduce) this.chairs.forEach(function (o, i) {
        var u = o.userData, ph = i / N * Math.PI * 2 + t * 2;
        if (t < A) { var a = ease(t / A); o.position.copy(u.from); o.position.y += a * 3; o.rotation.y = u.r0 + a * 3; return; }
        var orb = function (r, h) { return new T.Vector3(c[0] + Math.cos(ph) * r, c[1] + h, c[2] + Math.sin(ph) * r); };
        if (t < A + B) {
          var q = ease((t - A) / B), s0 = u.from.clone(); s0.y += 3;
          o.position.copy(s0.lerp(orb(3.2, 2.6), q)); o.position.y += Math.sin(Math.PI * q) * 14; o.rotation.y = u.r0 + 3 + q * 8; o.rotation.z = Math.sin(t * 7 + i) * .3;
          return;
        }
        var r = clamp((t - A - B) / C, 0, 1);
        o.position.copy(orb(3.2 * (1 - ease(r)), 2.6 - r * .9)); o.rotation.y += dt * (6 + r * 20); o.rotation.z = 0; o.scale.setScalar(1 - r * .7);
      });
      if (t >= R0 && !m.shown) {
        m.shown = true; this.chairs.forEach(function (o) { o.visible = false; });
        var fl = this.flashShot; fl.style.transition = 'none'; fl.style.opacity = .85;
        requestAnimationFrame(function () { fl.style.transition = 'opacity .9s ease'; fl.style.opacity = 0; });
        this._placeCharis({ x: c[0], y: c[1], z: c[2], yaw: Math.atan2(this.px - c[0], this.pz - c[2]) });
        this.wave = 2.4; if (!reduce) this._burst(c[0], c[1] + 1.1, c[2]);
      }
      if (m.shown) { var pk = clamp((t - R0) / .55, 0, 1), bk = 1 + 2.7 * Math.pow(pk - 1, 3) + 1.7 * Math.pow(pk - 1, 2); this.charis.scale.setScalar(reduce ? 1 : Math.max(.01, bk)); }
      if (t >= R0 + 1.1) {
        this.merge = null; this.charis.scale.setScalar(1);
        this.st.u = 1; saveSt(this.st); this._challenges(); this._chairCount();
        this._charisTalk(true);
      }
    }
    _burst(x, y, z) {
      var b = this.burst, a = b.geometry.attributes.position.array, v = b.userData.v;
      for (var i = 0; i < a.length; i += 3) { a[i] = x; a[i + 1] = y; a[i + 2] = z; var th = hash(i, 41) * Math.PI * 2, ph = Math.acos(1 - 2 * hash(i, 42)), sp = 2 + hash(i, 43) * 4; v[i] = Math.sin(ph) * Math.cos(th) * sp; v[i + 1] = Math.abs(Math.cos(ph)) * sp + 1; v[i + 2] = Math.sin(ph) * Math.sin(th) * sp; }
      b.geometry.attributes.position.needsUpdate = true; b.visible = true; b.userData.t = 0; b.material.opacity = 1;
    }
    _hide(o) { o.style.display = 'none'; o.innerHTML = ''; this._modalBtn = null; }
    _ghost(on) { this.ghostOn = on; this.ghost.style.display = on ? 'block' : 'none'; this.ghostBtn.style.borderColor = on ? '#fbc75a' : 'rgba(205,182,242,.4)'; this.ghostBtn.style.color = on ? '#fbc75a' : '#faf6ff'; }
    _gl() {
      var T = this.T;
      var r = this.r = new T.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      this.canvas = r.domElement; this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.stage.insertBefore(this.canvas, this.stage.firstChild);
      this.cam = new T.PerspectiveCamera(70, 1, .05, 400); this.cam.rotation.order = 'YXZ';
    }
    _resize() {
      if (!this.r) return;
      var w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return;
      this.r.setSize(w, h, false); this.cam.aspect = w / h;
      if (this.rtA) { var bw = Math.round(w * this.r.getPixelRatio()), bh = Math.round(h * this.r.getPixelRatio()); this.rtA.setSize(bw, bh); this.rtB.setSize(bw, bh); this.vu.uRes.value.set(bw, bh); } this.cam.updateProjectionMatrix();
    }
    _world() {
      var T = this.T, W = this.W = genWorld(), sc = this.scene = new T.Scene(), self = this, i, j;
      sc.background = new T.Color(); sc.fog = new T.Fog('#7fc3f0', 62, 178);
      var tex = new T.CanvasTexture(makeAtlas());
      tex.magFilter = tex.minFilter = T.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = T.SRGBColorSpace;
      var bufs = buildMesh(W); this.meshes = [];
      function mk(b, mat, shadow) {
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
        g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
        g.setAttribute('color', new T.Float32BufferAttribute(b.c, 3));
        var uvs = b.u.map(function (a) { return new T.Float32BufferAttribute(a, 2); });
        g.setAttribute('uv', uvs[1]); g.setIndex(b.i);
        var m = new T.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; m.userData.uvs = uvs;
        sc.add(m); self.meshes.push(m); return m;
      }
      mk(bufs.op, new T.MeshLambertMaterial({ map: tex, vertexColors: true }), true);
      mk(bufs.cut, new T.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: .5, side: T.DoubleSide }), true);
      mk(bufs.plant, new T.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: .5, side: T.FrontSide }), true);
      this.glowMat = new T.MeshLambertMaterial({ map: tex, vertexColors: true, emissive: '#ffd08a', emissiveMap: tex, emissiveIntensity: 0 });
      mk(bufs.glow, this.glowMat, false);
      var wc = document.createElement('canvas'); wc.width = wc.height = 16; var wg = wc.getContext('2d');
      for (i = 0; i < 16; i++) for (j = 0; j < 16; j++) {
        var v = Math.round(206 + 26 * (.5 + .5 * Math.sin(i * .8 + j * 1.6 + Math.sin(j * .7) * 2)) + hash(i, j) * 20);
        wg.fillStyle = 'rgb(' + v + ',' + v + ',' + Math.min(255, v + 6) + ')'; wg.fillRect(i, j, 1, 1);
      }
      var wt = this.waterTex = new T.CanvasTexture(wc); wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(300, 300);
      wt.magFilter = T.NearestFilter; wt.colorSpace = T.SRGBColorSpace;
      this.waterMat = new T.MeshLambertMaterial({ map: wt, color: WATER[1], transparent: true, opacity: .78, depthWrite: false });
      var water = new T.Mesh(new T.PlaneGeometry(300, 300), this.waterMat); water.rotation.x = -Math.PI / 2; water.position.y = SEA - .15; water.receiveShadow = true; sc.add(water);
      // River, pond and channel water: its own copy of the ripple texture so it can flow.
      var lt = this.liqTex = wt.clone(); lt.repeat.set(1, 1); lt.needsUpdate = true;
      this.liqMat = new T.MeshLambertMaterial({ map: lt, color: WATER[1], vertexColors: true, transparent: true, opacity: .82, depthWrite: false });
      var LQ = bufs.liq, lg = new T.BufferGeometry();
      lg.setAttribute('position', new T.Float32BufferAttribute(LQ.p, 3)); lg.setAttribute('normal', new T.Float32BufferAttribute(LQ.n, 3));
      lg.setAttribute('color', new T.Float32BufferAttribute(LQ.c, 3)); lg.setAttribute('uv', new T.Float32BufferAttribute(LQ.uv, 2)); lg.setIndex(LQ.i);
      var lq = new T.Mesh(lg, this.liqMat); lq.receiveShadow = true; sc.add(lq);
      // Windmill sails, turning on a hub that faces the cabin.
      var M = W.mill, cloth = new T.MeshLambertMaterial({ color: '#f3ebdf' }), wood = new T.MeshLambertMaterial({ color: '#7a5636' });
      this.sails = new T.Group(); this.sails.position.set(M.x, M.y, M.z); this.sails.rotation.y = M.yaw; sc.add(this.sails);
      var rotor = this.rotor = new T.Group(); this.sails.add(rotor);
      rotor.add(new T.Mesh(new T.CylinderGeometry(.38, .38, .5, 12).rotateX(Math.PI / 2), wood));
      for (i = 0; i < 4; i++) {
        var arm = new T.Group(); arm.rotation.z = i * Math.PI / 2 + .3;
        var spar = new T.Mesh(new T.BoxGeometry(.22, 6.2, .22), wood); spar.position.y = 3.2; arm.add(spar);
        var sail = new T.Mesh(new T.BoxGeometry(1.5, 4.6, .06), cloth); sail.position.set(.86, 3.7, .08); arm.add(sail);
        for (j = 0; j < 4; j++) { var rib = new T.Mesh(new T.BoxGeometry(1.62, .07, .1), wood); rib.position.set(.86, 1.6 + j * 1.4, .13); arm.add(rib); }
        rotor.add(arm);
      }
      this.sails.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.hemi = new T.HemisphereLight('#ffffff', '#4a3a2e', 1); sc.add(this.hemi);
      var k = this.key = new T.DirectionalLight('#ffffff', 2.5); k.castShadow = true;
      var sz = coarse ? 1024 : 2048; k.shadow.mapSize.set(sz, sz);
      var s = k.shadow.camera; s.left = s.bottom = -(R + 12); s.right = s.top = R + 12; s.near = 1; s.far = 220;
      k.shadow.bias = -.0005; k.shadow.normalBias = .04;
      sc.add(k); sc.add(k.target);
      // Minor lamps (5th field) only glow; real point lights are kept to a handful.
      this.points = W.lamps.filter(function (p) { return !p[4]; }).map(function (p) { var l = new T.PointLight('#ffcf70', 0, p[3], 1.5); l.position.set(p[0], p[1], p[2]); l.userData.big = p[3] > 20; sc.add(l); return l; });
      var bm = function (col) { return new T.MeshBasicMaterial({ color: col, fog: false, transparent: true }); };
      this.sun = new T.Mesh(new T.PlaneGeometry(10, 10), bm('#fff4d2')); sc.add(this.sun);
      this.moon = new T.Mesh(new T.PlaneGeometry(7, 7), bm('#e6ebff')); sc.add(this.moon);
      var sp = []; for (i = 0; i < 700; i++) { var u = hash(i, 1), ww = hash(i, 2), th = u * Math.PI * 2, ph = Math.acos(1 - ww * 1.1); sp.push(Math.sin(ph) * Math.cos(th) * 160, Math.cos(ph) * 160, Math.sin(ph) * Math.sin(th) * 160); }
      var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      this.stars = new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: 1.7, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); sc.add(this.stars);
      this.clouds = new T.Group(); this.cloudMat = new T.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: .85 });
      for (i = 0; i < 22; i++) {
        var gg = new T.Group(), n = 2 + Math.floor(hash(i, 4) * 3);
        for (j = 0; j < n; j++) { var cb = new T.Mesh(new T.BoxGeometry(6 + Math.floor(hash(i, j) * 6), 1.2, 4 + Math.floor(hash(j, i) * 5)), this.cloudMat); cb.position.set(j * 4 - n * 2, 0, Math.round((hash(i + j, 9) - .5) * 4)); gg.add(cb); }
        gg.position.set((hash(i, 7) - .5) * 190, SEA + 28 + Math.floor(hash(i, 8) * 3), (hash(i, 11) - .5) * 190); gg.userData.x0 = gg.position.x; this.clouds.add(gg);
      }
      sc.add(this.clouds);
      var sn = []; for (i = 0; i < 1500; i++) sn.push((hash(i, 21) - .5) * 44, hash(i, 22) * 20, (hash(i, 23) - .5) * 44);
      var sng = new T.BufferGeometry(); sng.setAttribute('position', new T.Float32BufferAttribute(sn, 3));
      // Seasonal particles: spring petals, autumn leaves, winter snow (summer uses fireflies instead).
      this.snow = new T.Points(sng, new T.PointsMaterial({ color: '#ffffff', size: .13, transparent: true, opacity: .9, depthWrite: false })); sc.add(this.snow);
      var ff = []; for (i = 0; i < 240; i++) ff.push((hash(i, 31) - .5) * 40, hash(i, 32) * 4, (hash(i, 33) - .5) * 40);
      var ffg = new T.BufferGeometry(); ffg.setAttribute('position', new T.Float32BufferAttribute(ff, 3));
      this.flies = new T.Points(ffg, new T.PointsMaterial({ color: '#fff0a0', size: .16, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      this.flies.userData.base = ff; sc.add(this.flies);
      this.sunDir = new T.Vector3(); this.skyC = new T.Color(); this._c1 = new T.Color(); this._c2 = new T.Color();
      // Hidden-chair quest.
      var st = this.st || { f: [], u: 0 }, wood = new T.MeshLambertMaterial({ color: '#a5764a' }), dk = new T.MeshLambertMaterial({ color: '#77502f' });
      this.chairs = W.chairs.map(function (c, i) {
        var o = buildChair(T, wood, dk); o.position.set(c.x + .5, c.y, c.z + .5); o.rotation.y = c.yaw;
        o.userData = { i: i, home: o.position.clone(), yaw: c.yaw, shake: 0 }; o.visible = !st.u; sc.add(o); return o;
      });
      st.f = st.f.filter(function (i) { return i < self.chairs.length; });
      // Look-alike chairs in the classroom: they answer, but they aren't part of the hunt.
      this.decoys = W.decoys.map(function (c) { var o = buildChair(T, wood, dk); o.position.set(c.x + .5, c.y, c.z + .5); o.rotation.y = c.yaw; o.userData = { home: o.position.clone(), yaw: c.yaw, shake: 0 }; sc.add(o); return o; });
      var gm = new T.MeshLambertMaterial({ color: '#f2b53a', emissive: '#6a4300', emissiveIntensity: .35 });
      this.goldChair = buildChair(T, gm, gm); this.goldChair.visible = false; sc.add(this.goldChair);
      this.charis = buildCharis(T); this.charis.visible = false; sc.add(this.charis);
      if (st.u) this._placeCharis(W.bonus[0].charis);
      var bp = new Float32Array(90 * 3), bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(bp, 3));
      this.burst = new T.Points(bg, new T.PointsMaterial({ color: '#fbc75a', size: .14, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.burst.userData.v = new Float32Array(90 * 3); this.burst.visible = false; this.burst.frustumCulled = false; sc.add(this.burst);
    }
    _blk(x, y, z) { return x < -R || x > R || z < -R || z > R || y < 0 || y >= NY ? 0 : this.W.B[((x + R) * NY + y) * NX + (z + R)]; }
    _solid(x, y, z) {
      if (!inB(x, z) || y < 0) return true;
      if (this.W.water[(x + R) * NX + (z + R)] && y < SEA + 3) return true;
      return SOL[this._blk(x, y, z)] === 1;
    }
    _hit(px, py, pz) {
      var x0 = Math.floor(px - .3), x1 = Math.floor(px + .3 - 1e-4), y0 = Math.floor(py + 1e-4), y1 = Math.floor(py + 1.8 - 1e-4), z0 = Math.floor(pz - .3), z1 = Math.floor(pz + .3 - 1e-4);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) if (this._solid(x, y, z)) return true;
      return false;
    }
    _col(x, z) {
      if (!inB(x, z)) return -1; var c = (x + R) * NX + (z + R);
      if (this.W.water[c]) return -1;
      var t = this.W.top[c]; return WALK[this._blk(x, t, z)] ? t + 1 : -1;
    }
    _near(x, z) {
      x = Math.round(x); z = Math.round(z);
      for (var r = 0; r < 14; r++) for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        var f = this._col(x + dx, z + dz); if (f >= 0) return [x + dx, z + dz, f];
      }
      return [0, 0, this.W.top[R * NX + R] + 1];
    }
    _spawn() {
      var C = this.W.C, p = this._near(C[0] + 4, C[2] + 9);
      this.px = p[0] + .5; this.pz = p[1] + .5; this.py = p[2];
      this.yaw = Math.atan2(this.px - (C[0] + .5), this.pz - (C[2] + .5)); this.pitch = .04;
      this.cam.position.set(this.px, this.py + 1.62, this.pz); this.cam.rotation.set(this.pitch, this.yaw, 0);
    }
    _setSeason(s) {
      this.season = s;
      this.meshes.forEach(function (m) { m.geometry.setAttribute('uv', m.userData.uvs[s]); });
      this.waterMat.color.set(WATER[s]); this.waterMat.opacity = s === 3 ? .9 : .78;
      this.snow.visible = s !== 1; this.flies.visible = s === 1;
      this.snow.material.color.set(['#f7b3cf', '#ffffff', '#e8862f', '#ffffff'][s]); this.snow.material.size = [.17, .13, .2, .13][s];
      this.snow.geometry.setDrawRange(0, s === 3 ? Infinity : 520);
      this.liqMat.color.set(s === 3 ? '#cfe4f2' : WATER[s]); this.liqMat.opacity = s === 3 ? .96 : .82;
      this.cloudMat.color.set(s === 3 ? '#e4e8f0' : '#ffffff');
      this.segBtns.forEach(function (b, i) { b.style.background = i === s ? 'linear-gradient(150deg,#fbc75a,#eb9a12)' : 'transparent'; b.style.color = i === s ? '#2e2352' : '#e6dcfa'; b.style.fontWeight = i === s ? 600 : 400; });
      this._recText();
    }
    _setHour(h) {
      this.hour = h;
      var a = (h - 6) / 12 * Math.PI, s = Math.sin(a), i;
      var sd = this.sunDir.set(Math.cos(a), s, .32).normalize();
      for (i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h <= SKY[i + 1][0]) {
        var t = (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
        this.skyC.copy(this._c1.set(SKY[i][1])).lerp(this._c2.set(SKY[i + 1][1]), t); break;
      }
      this.scene.background.copy(this.skyC); this.scene.fog.color.copy(this.skyC);
      var day = sstep(-.08, .22, s), night = 1 - sstep(-.18, .06, s), lit = 1 - sstep(-.04, .2, s), up = s >= -.02;
      var k = this.key;
      k.position.copy(sd).multiplyScalar(up ? 80 : -80);
      k.intensity = up ? 2.6 * sstep(-.02, .3, s) : .55 * sstep(0, .3, -s);
      if (up) k.color.copy(this._c1.set('#ffae72')).lerp(this._c2.set('#fff4e2'), sstep(0, .45, s)); else k.color.set('#9fb2ff');
      this.hemi.color.copy(this.skyC).lerp(this._c1.set('#ffffff'), .35);
      this.hemi.intensity = .45 + .9 * day;
      this.glowMat.emissiveIntensity = .15 + 1.4 * lit;
      this.points.forEach(function (p) { p.intensity = lit * (p.userData.big ? 60 : 18); });
      this.stars.material.opacity = night; this.flies.material.opacity = night * .95;
      this.sun.material.color.copy(this._c1.set('#ffb86b')).lerp(this._c2.set('#fff6da'), sstep(0, .4, s));
      this.sun.visible = s > -.12; this.moon.visible = s < .12;
      this.timeVal.textContent = this._fmt(h);
      var ti = h >= 6 && h < 18.5 ? 'sun' : 'moon'; if (this._ti !== ti) { this._ti = ti; this.timeIco.innerHTML = ico(ti, 18); }
      if (+this.range.value !== h) this.range.value = h;
      this._recText();
    }
    _fmt(h) { var hh = Math.floor(h) % 24, mm = Math.round((h - Math.floor(h)) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
    _recText() {
      if (!this.timeVal) return;
      var h = this.hour, dayt = h >= 7.5 && h < 16.5, gold = !dayt && ((h >= 5 && h < 7.5) || (h >= 16.5 && h < 19));
      var ex = dayt ? ['f/8', '1/500', 'ISO 100'] : gold ? ['f/4', '1/125', 'ISO 400'] : ['f/1.8', '1/15', 'ISO 3200'];
      var sep = 'width:1px;height:10px;background:rgba(205,182,242,.3)', r = this.rec;
      r.innerHTML = '';
      r.append(el('span', 'width:7px;height:7px;border-radius:50%;background:#e0707f;box-shadow:0 0 8px #e0707f' + (reduce ? '' : ';animation:aepc-blink 1.6s steps(1) infinite')), el('span', 'color:#faf6ff;font-weight:500', this._fmt(h)), el('span', '', this.L.seasons[this.season].toUpperCase()));
      if (!this.narrow) { r.appendChild(el('span', sep)); ex.forEach(function (e) { r.appendChild(el('span', '', e)); }); }
      r.appendChild(el('span', sep)); this.headEl = el('span', 'min-width:62px'); this._hd = null; r.appendChild(this.headEl);
    }
    _challenges() {
      var self = this, all = this.W.chal.concat(this.st && this.st.u ? this.W.bonus.map(function (b, i) { return Object.assign({ bonus: i + 1 }, b); }) : []);
      this.list = all.map(function (c) { var p = self._near(c.from[0], c.from[1]); return Object.assign({}, c, { pos: [p[0] + .5, p[2] + 1.62, p[1] + .5] }); });
    }
    _pick(force, first) {
      var n = this.list.length, reg = this.W.chal.length, i = force, seen = this.bseen || (this.bseen = {});
      if (i == null && !first) for (var k = reg; k < n; k++) if (!seen[k]) { i = k; break; }
      if (i == null) do { i = Math.floor(Math.random() * reg); } while (reg > 1 && i === this.ci);
      if (i >= reg) seen[i] = 1;
      this.ci = i; this.ch = this.list[i];
      var c = this.ch, keep = { h: this.hour, s: this.season };
      if (c.charis) this._placeCharis(c.charis);
      var cv = this.charis && this.charis.visible; if (cv && !c.charis) this.charis.visible = false;
      this._setSeason(c.season); this._setHour(c.hour);
      this.cam.position.set(c.pos[0], c.pos[1], c.pos[2]); this.cam.lookAt(c.look[0], c.look[1], c.look[2]);
      this._tick(0, true);
      this.r.render(this.scene, this.cam);
      if (cv) this.charis.visible = true;
      c.img = this.canvas.toDataURL('image/jpeg', .86);
      this._setSeason(keep.s); this._setHour(keep.h);
      this.cam.position.set(this.px, this.py + 1.62, this.pz); this.cam.rotation.set(this.pitch, this.yaw, 0);
      this.thumb.src = this.ghost.src = c.img; this.thumbLbl.textContent = c[this.loc];
      this._ghost(false); this._hide(this.result); this._showBrief();
    }
    _freeze() { this._unlock(); this.keys = {}; this.jumpHeld = false; }
    _showBrief() {
      this._freeze();
      var self = this, L = this.L, c = this.ch, o = this.brief; o.innerHTML = '';
      var card = el('div', CARD + ';width:min(560px,100%)');
      var pol = el('div', 'align-self:center;width:min(92%,440px);padding:10px 10px 0;' + POLA + ';transform:rotate(-1.5deg);animation:aepc-pop .6s .08s cubic-bezier(.2,.8,.2,1) both');
      var img = el('img', 'display:block;width:100%;aspect-ratio:4/3;max-height:30vh;object-fit:cover;background:#2a1f48'); img.src = c.img;
      pol.append(img, el('div', 'padding:10px 4px 12px;font-family:' + SERIF + ';font-size:15px;color:#3a2b62;letter-spacing:.03em', c[this.loc]));
      var txt = el('div', 'display:flex;flex-direction:column;gap:8px');
      txt.append(el('span', KICK, c.bonus ? L.bonus + ' · Charis' : L.target), el('h3', 'margin:0;color:#faf6ff;font-family:' + SERIF + ';font-size:clamp(22px,3.4vw,28px);font-weight:400;letter-spacing:.04em', L.brief), el('p', 'margin:0;font-size:14px;line-height:1.75;color:#cbbcf0;text-wrap:pretty', L.briefBody));
      var b = btn(GOLD + ';align-self:flex-start', L.start, 'aepc-btn aepc-gold');
      var go = function () { self._hide(self.brief); self._lock(); };
      b.onclick = go; this._modalBtn = go;
      card.append(pol, txt, b);
      o.appendChild(card); o.style.display = 'flex';
      setTimeout(function () { b.focus({ preventScroll: true }); }, 50);
    }
    _shoot() {
      if (this._modal() || !this.ch) return;
      var g = this.ghostOn; if (g) this.ghost.style.display = 'none';
      this.r.render(this.scene, this.cam);
      var mine = this.canvas.toDataURL('image/jpeg', .86);
      if (g) this.ghost.style.display = 'block';
      var ir = this.iris;
      if (!reduce) {
        ir.style.display = 'block'; ir.style.transition = 'none'; ir.style.transform = 'scale(1)'; void ir.offsetWidth;
        ir.style.transition = 'transform .11s cubic-bezier(.5,0,1,1)'; ir.style.transform = 'scale(0)';
        setTimeout(function () { ir.style.transition = 'transform .42s cubic-bezier(0,0,.2,1)'; ir.style.transform = 'scale(1)'; setTimeout(function () { ir.style.display = 'none'; }, 440); }, 160);
      }
      var f = this.flashShot; f.style.transition = 'none'; f.style.opacity = reduce ? .9 : .4;
      requestAnimationFrame(function () { f.style.transition = 'opacity .45s ease'; f.style.opacity = 0; });
      var c = this.ch, T = this.T, eye = this.py + 1.62;
      var dPos = Math.hypot(this.px - c.pos[0], this.pz - c.pos[2]) + Math.abs(eye - c.pos[1]) * .5;
      var want = new T.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
      var have = new T.Vector3(); this.cam.getWorldDirection(have);
      var dAng = Math.acos(clamp(want.dot(have), -1, 1)) * 180 / Math.PI;
      var dh = this.hour - c.hour; dh = ((dh + 12) % 24 + 24) % 24 - 12;
      var sp = clamp(1 - (dPos - .8) / 8, 0, 1), sa = clamp(1 - (dAng - 3) / 30, 0, 1), st = clamp(1 - (Math.abs(dh) - .25) / 3, 0, 1), ss = this.season === c.season ? 1 : 0;
      var score = Math.round(sp * 35 + sa * 35 + st * 20 + ss * 10);
      var H = this.L.hints, worst = [[1 - sp, H.pos], [1 - sa, H.angle], [1 - st, dh > 0 ? H.earlier : H.later], [1 - ss, H.season]].sort(function (a, b) { return b[0] - a[0]; });
      var hints = worst.filter(function (w) { return w[0] > .08; }).slice(0, 2).map(function (w) { return w[1]; });
      var self = this; this._freeze();
      setTimeout(function () { self._showResult(mine, score, [[self.L.pos, sp], [self.L.angle, sa], [self.L.time, st], [self.L.season, ss]], hints.length ? hints.join(' ') : H.none); }, 480);
    }
    _showResult(mine, score, parts, hint) {
      var self = this, L = this.L, c = this.ch, o = this.result; o.innerHTML = '';
      var card = el('div', CARD + ';width:min(820px,100%)');
      var head = el('div', 'display:flex;align-items:center;flex-wrap:wrap;gap:12px 18px');
      var CI = (2 * Math.PI * 34).toFixed(1);
      var ring = el('div', 'position:relative;width:84px;height:84px;flex:0 0 auto');
      ring.innerHTML = '<svg width="84" height="84" viewBox="0 0 84 84" style="display:block;transform:rotate(-90deg)"><defs><linearGradient id="aepcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b490ef"></stop><stop offset="1" stop-color="#fbc75a"></stop></linearGradient></defs><circle cx="42" cy="42" r="34" fill="none" stroke="rgba(250,246,255,.1)" stroke-width="5"></circle><circle cx="42" cy="42" r="34" fill="none" stroke="url(#aepcg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + CI + '" stroke-dashoffset="' + CI + '" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)"></circle></svg>';
      var arc = ring.querySelectorAll('circle')[1];
      var numEl = el('span', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:' + SERIF + ';font-size:30px;color:#fbc75a;font-variant-numeric:tabular-nums', reduce ? String(score) : '0');
      ring.appendChild(numEl);
      var mi = score >= 90 ? 0 : score >= 70 ? 1 : score >= 45 ? 2 : 3;
      var hcol = el('div', 'display:flex;flex-direction:column;gap:4px;flex:1 1 220px;min-width:0');
      hcol.append(el('span', KICK + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis', L.score + ' / 100 · ' + c[this.loc]), el('span', 'color:#faf6ff;font-family:' + SERIF + ';font-size:clamp(22px,3.2vw,28px);letter-spacing:.03em', L.msgs[mi]));
      head.append(ring, hcol);
      var pics = el('div', 'flex:1.2 1 320px;min-width:0;display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:clamp(10px,2vw,16px);padding:4px 2px');
      [[c.img, L.target, -1.8], [mine, L.yours, 1.4]].forEach(function (p, i) {
        var f = el('figure', 'margin:0;padding:8px 8px 0;' + POLA + ';transform:rotate(' + p[2] + 'deg);animation:aepc-pop .55s ' + (i * .12) + 's cubic-bezier(.2,.8,.2,1) both');
        var im = el('img', 'display:block;width:100%;aspect-ratio:4/3;max-height:min(34vh,260px);object-fit:cover;background:#2a1f48' + (i ? ';animation:aepc-dev 1.6s .25s ease-out both' : '')); im.src = p[0];
        f.append(im, el('figcaption', 'padding:8px 2px 10px;font-family:' + SERIF + ';font-size:13px;letter-spacing:.04em;color:#3a2b62', p[1])); pics.appendChild(f);
      });
      var bars = el('div', 'display:grid;grid-template-columns:auto 1fr auto;gap:9px 14px;align-items:center;font-size:12.5px'), fills = [];
      parts.forEach(function (p) {
        var tr = el('div', 'height:6px;border-radius:999px;background:rgba(250,246,255,.08);overflow:hidden');
        var fl = el('div', 'height:100%;width:' + (reduce ? Math.round(p[1] * 100) : 0) + '%;border-radius:999px;background:linear-gradient(90deg,#b490ef,#fbc75a);transition:width .9s cubic-bezier(.2,.8,.2,1)');
        tr.appendChild(fl); fills.push([fl, p[1]]);
        bars.append(el('span', 'color:#e6dcfa', p[0]), tr, el('span', 'font-variant-numeric:tabular-nums;color:#cbbcf0;min-width:34px;text-align:right', Math.round(p[1] * 100) + '%'));
      });
      var acts = el('div', 'display:flex;flex-wrap:wrap;gap:10px;margin-top:2px');
      var again = btn(PILL, L.retry), next = btn(GOLD, L.next, 'aepc-btn aepc-gold');
      again.onclick = function () { self._hide(self.result); self._lock(); };
      next.onclick = function () { self._pick(); };
      this._modalBtn = next.onclick;
      acts.append(next, again);
      var side = el('div', 'flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:14px;justify-content:center');
      side.append(bars, el('p', 'margin:0;font-size:13.5px;line-height:1.7;color:#cbbcf0;text-wrap:pretty', hint));
      // After the second bonus shot, Charis whispers a hint about her card on the About page.
      if (c.bonus === 2) {
        var sec = el('div', 'display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(251,199,90,.08);border:1px dashed rgba(251,199,90,.55);animation:aepc-in .5s .6s cubic-bezier(.2,.8,.2,1) both');
        sec.append(el('span', KICK, L.secretWho), el('span', 'font-family:' + SERIF + ';font-size:14.5px;line-height:1.65;color:#faf6ff;text-wrap:pretty', L.secret));
        side.appendChild(sec);
      }
      side.appendChild(acts);
      var body = el('div', 'display:flex;flex-wrap:wrap;gap:16px clamp(16px,2.6vw,26px);align-items:stretch');
      body.append(pics, side);
      card.append(head, body);
      o.appendChild(card); o.style.display = 'flex';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        arc.style.strokeDashoffset = (CI * (1 - score / 100)).toFixed(1);
        fills.forEach(function (f) { f[0].style.width = Math.round(f[1] * 100) + '%'; });
      }); });
      if (!reduce) { var t0 = performance.now(); var cu = function (t) { var k = clamp((t - t0) / 1000, 0, 1); numEl.textContent = Math.round(score * (1 - Math.pow(1 - k, 3))); if (k < 1 && numEl.isConnected) requestAnimationFrame(cu); }; requestAnimationFrame(cu); }
    }
    _phys(dt) {
      var k = this.keys, md = this._modal();
      var f = md ? 0 : (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.joy.y;
      var rt = md ? 0 : (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + this.joy.x;
      var m = Math.hypot(f, rt); if (m > 1) { f /= m; rt /= m; m = 1; }
      var spd = k.ShiftLeft || k.ShiftRight || k.ControlLeft ? 5.8 : 4.3, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      var tvx = (-sy * f + cy * rt) * spd, tvz = (-cy * f - sy * rt) * spd, ac = 1 - Math.exp(-dt * (this.onGround ? 16 : 5));
      this.vx += (tvx - this.vx) * ac; this.vz += (tvz - this.vz) * ac;
      if (!md && (k.Space || this.jumpHeld) && this.onGround) { this.vy = 8.6; this.onGround = false; }
      if (this._hit(this.px, this.py, this.pz)) this.py = Math.floor(this.py) + 1;
      var n = Math.max(1, Math.ceil(dt / .01)), h = dt / n, auto = coarse && m > .3;
      for (var i = 0; i < n; i++) {
        this.vy = Math.max(-40, this.vy - 30 * h);
        var nx = this.px + this.vx * h;
        if (!this._hit(nx, this.py, this.pz)) this.px = nx;
        else { if (auto && this.onGround && !this._hit(nx, this.py + 1.05, this.pz)) { this.vy = 8.6; this.onGround = false; } this.vx = 0; }
        var nz = this.pz + this.vz * h;
        if (!this._hit(this.px, this.py, nz)) this.pz = nz;
        else { if (auto && this.onGround && !this._hit(this.px, this.py + 1.05, nz)) { this.vy = 8.6; this.onGround = false; } this.vz = 0; }
        var ny = this.py + this.vy * h;
        if (this._hit(this.px, ny, this.pz)) { if (this.vy < 0) { this.py = Math.ceil(ny - 1e-6); this.onGround = true; } this.vy = 0; }
        else { this.py = ny; this.onGround = false; }
      }
      var obs = this.chairs.filter(function (o) { return o.visible; }).concat(this.decoys); if (this.charis.visible) obs.push(this.charis);
      for (i = 0; i < obs.length; i++) {
        var o = obs[i].position, dx = this.px - o.x, dz = this.pz - o.z, d = Math.hypot(dx, dz), rr = obs[i] === this.charis ? .7 : .85;
        if (d < rr && d > 1e-4 && this.py < o.y + 1.15 && this.py + 1.8 > o.y) { this.px = o.x + dx / d * rr; this.pz = o.z + dz / d * rr; }
      }
    }
    _tick(dt, still) {
      var cam = this.cam, t = performance.now() / 1000, i;
      if (!still) {
        this._phys(dt);
        var sp = Math.hypot(this.vx, this.vz);
        this.bobA += ((this.onGround && sp > .6 ? 1 : 0) - this.bobA) * Math.min(1, dt * 8);
        this.bobT += dt * sp * 2.2;
        cam.position.set(this.px, this.py + 1.62 + Math.sin(this.bobT * 2) * .04 * this.bobA, this.pz);
        cam.rotation.set(this.pitch, this.yaw, 0);
        if (this.headEl) { var dg = Math.round(((-this.yaw * 180 / Math.PI) % 360 + 360) % 360) % 360; if (dg !== this._hd) { this._hd = dg; this.headEl.textContent = (dg < 10 ? '00' : dg < 100 ? '0' : '') + dg + '° ' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(dg / 45) % 8]; } }
        if (this.pitchMk) this.pitchMk.style.top = (50 - clamp(this.pitch / 1.5, -1, 1) * 50) + '%';
      }
      if (this.merge && !still) this._mergeTick(dt);
      this._questTick(dt, t, still);
      var p = cam.position;
      this.sun.position.copy(this.sunDir).multiplyScalar(120).add(p); this.sun.lookAt(p);
      this.moon.position.copy(this.sunDir).multiplyScalar(-120).add(p); this.moon.lookAt(p);
      this.stars.position.copy(p);
      var cl = this.clouds.children;
      for (i = 0; i < cl.length; i++) cl[i].position.x = (cl[i].userData.x0 + t * .8 + 95) % 190 - 95;
      this.waterTex.offset.set((t * .04) % 1, (t * .025) % 1);
      if (this.season !== 3) this.liqTex.offset.set((t * .02) % 1, (t * .3) % 1);
      if (this.rotor && !still) this.rotor.rotation.z -= dt * (reduce ? .12 : .55);
      if (this.flies.visible && this.flies.material.opacity > .01) {
        var fa = this.flies.geometry.attributes.position, fb = this.flies.userData.base, far = fa.array;
        for (i = 0; i < far.length; i += 3) { far[i] = fb[i] + Math.sin(t * .5 + i) * .9; far[i + 1] = fb[i + 1] + Math.sin(t * .8 + i * .3) * .4; far[i + 2] = fb[i + 2] + Math.cos(t * .45 + i * .7) * .9; }
        fa.needsUpdate = true; this.flies.position.set(Math.round(p.x / 40) * 40, p.y - 3, Math.round(p.z / 40) * 40);
      }
      if (this.snow.visible) {
        var a = this.snow.geometry.attributes.position, arr = a.array, sn = this.season, base = still ? 0 : dt * (sn === 3 ? 2.2 : sn === 0 ? .5 : .75), sway = sn === 3 || still ? 0 : dt;
        for (i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= base * (1 + hash(i, 5)); if (arr[i + 1] < 0) arr[i + 1] += 20;
          if (sway) { arr[i] += Math.sin(t * 1.6 + i * .37) * sway * .7; arr[i + 2] += Math.cos(t * 1.2 + i * .53) * sway * .5; }
        }
        a.needsUpdate = true;
        this.snow.position.set(Math.round(p.x / 44) * 44, Math.max(0, p.y - 8), Math.round(p.z / 44) * 44);
      }
    }
    _questTick(dt, t, still) {
      var i, o, u;
      for (i = 0; i < this.chairs.length; i++) {
        o = this.chairs[i]; u = o.userData; if (!(u.shake > 0) || this.merge) continue;
        u.shake = Math.max(0, u.shake - dt); var k = u.shake / .9;
        o.rotation.set(0, u.yaw, reduce ? .06 * k : Math.sin(t * 55) * .12 * k); o.position.x = u.home.x + (reduce ? 0 : Math.sin(t * 70) * .05 * k); o.position.y = u.home.y + (reduce ? 0 : Math.abs(Math.sin(t * 35)) * .08 * k);
      }
      var C = this.charis;
      if (C.visible) {
        var P = C.userData.parts, sit = C.userData.sit, w = this.wave > 0 ? (this.wave = Math.max(0, this.wave - dt)) : 0;
        P.body.position.y = sit ? 0 : Math.sin(t * 2) * .01;
        var dyaw = Math.atan2(this.cam.position.x - C.position.x, this.cam.position.z - C.position.z) - C.rotation.y;
        dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        var near = Math.hypot(this.cam.position.x - C.position.x, this.cam.position.z - C.position.z) < 9 && !still;
        P.head.rotation.y += ((near ? clamp(dyaw, -.9, .9) : 0) - P.head.rotation.y) * Math.min(1, dt * 4);
        P.armL.rotation.x = sit ? -.5 : Math.sin(t * 1.6) * .06; P.armL.rotation.z = 0;
        P.armR.rotation.x = sit && !w ? -.5 : w ? 0 : -Math.sin(t * 1.6) * .06;
        P.armR.rotation.z = w ? 2.5 + (reduce ? 0 : Math.sin(t * 11) * .35) : 0;
      }
      var b = this.burst;
      if (b.visible) {
        var a = b.geometry.attributes.position.array, v = b.userData.v; b.userData.t += dt;
        for (i = 0; i < a.length; i += 3) { v[i + 1] -= dt * 4; a[i] += v[i] * dt; a[i + 1] += v[i + 1] * dt; a[i + 2] += v[i + 2] * dt; }
        b.geometry.attributes.position.needsUpdate = true; b.material.opacity = clamp(1 - b.userData.t / 1.6, 0, 1); if (b.userData.t > 1.6) b.visible = false;
      }
      if (still || !this.prompt) return;
      var tg = null, best = 2.6, md = this._modal();
      if (!md) {
        for (i = 0; i < this.chairs.length; i++) { o = this.chairs[i]; if (!o.visible) continue; var d = Math.hypot(this.px - o.position.x, this.pz - o.position.z); if (d < best && Math.abs(this.py - o.position.y) < 2.6) { best = d; tg = 'c' + i; } }
        for (i = 0; i < this.decoys.length; i++) { o = this.decoys[i]; d = Math.hypot(this.px - o.position.x, this.pz - o.position.z); if (d < best && Math.abs(this.py - o.position.y) < 2.6) { best = d; tg = 'd' + i; } }
        if (C.visible && Math.hypot(this.px - C.position.x, this.pz - C.position.z) < 2.9 && Math.abs(this.py - C.position.y) < 2.2) tg = 'charis';
      }
      if (tg !== this._tg) {
        this._tg = tg; this.prompt.style.display = tg ? 'inline-flex' : 'none';
        if (tg) this.prompt.innerHTML = (coarse ? '' : '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:6px;background:#fbc75a;color:#2e2352;font-weight:700;font-size:11px">T</span>') + '<span>' + (tg === 'charis' ? this.L.talkTo + ' · Charis' : this.L.inspect) + '</span>';
      }
    }
    _loop() {
      var self = this, last = performance.now();
      var f = function (t) {
        if (self.dead) return;
        var dt = Math.min(.05, (t - last) / 1000); last = t;
        self._tick(dt); self.r.render(self.scene, self.cam);
        self._raf = requestAnimationFrame(f);
      };
      this._raf = requestAnimationFrame(f);
    }
    close() {
      if (this.dead) return; this.dead = true;
      cancelAnimationFrame(this._raf); this._unlock();
      window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku); window.removeEventListener('resize', this._rs); window.removeEventListener('blur', this._bl);
      document.removeEventListener('mousemove', this._mm); document.removeEventListener('pointerlockchange', this._plc);
      if (this._ro) this._ro.disconnect();
      var self = this;
      this.root.style.transition = 'opacity .35s ease'; this.root.style.opacity = 0;
      setTimeout(function () {
        if (self.r) { if (self.scene) self.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); self.r.dispose(); self.r.forceContextLoss(); }
        self.root.remove(); document.documentElement.style.overflow = self._prevOverflow;
        self.onClose && self.onClose();
      }, 360);
    }
  }
})();
