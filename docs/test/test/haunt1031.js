(function () {
  if (window.customElements.get('ae-haunt')) return;
  // 禁區 1031 · WEEPING ANGELS. A 2D pixel-art side-scroller across four school corridors.
  // Walk left and right; the lantern lights a cone in front of you, and whatever is in it is "watched".
  // Draw the symbol above a ghost to banish it. Weeping Angels ignore symbols: they only move while unwatched,
  // and crumble if you hold them in your gaze. Search the doors for evidence (hidden: some doors are empty, some hide a traveller); three opens each boss.
  // Art: every sprite has a code-drawn placeholder. Real sheets (photos/1031/*.png, see SHEETS) replace them when present.
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // HD-2D renderer (haunt1031-hd.js, loaded when the full game opens; the classic 2D look is the fallback)
  var HDURL = (function () { try { var s = document.currentScript && document.currentScript.src; if (!s) [].forEach.call(document.scripts, function (sc) { if (/haunt1031\.js/.test(sc.src)) s = sc.src; }); return new URL('haunt1031-hd.js', s || document.baseURI).href; } catch (e) { return 'haunt1031-hd.js'; } })();
  var GFX = ['auto', 'high', 'mid', 'low', 'classic'];
  var FONT = "'Inter','Noto Sans TC',sans-serif", SERIF = "'Marcellus','Noto Serif TC',serif";
  // Cubic 11: a free Traditional Chinese pixel font (github.com/ACh-K/Cubic-11), used for every piece of game UI.
  var PIX = "'Cubic 11','Noto Sans TC',monospace", PIXURL = 'https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@1.500/fonts/web/Cubic_11.woff2';
  // stepped pixel corners, and the game's box: white frame, dark gap, purple inner line
  var PXC = 'clip-path:polygon(0 4px,4px 4px,4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px))';
  var PXBOX = 'background:#0c0818;box-shadow:inset 0 0 0 4px #efe8ff,inset 0 0 0 7px #0c0818,inset 0 0 0 9px #5a3f96;' + PXC;
  function el(tag, css, text) { var d = document.createElement(tag); if (css) d.style.cssText = css; if (text != null) d.textContent = text; return d; }
  function cnv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(s) { return s[Math.random() * s.length | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function loadJ(k) { try { return JSON.parse(load(k)); } catch (e) { return null; } }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // The final boss's name stays out of plain text until the reveal.
  var FB = (function () { try { return atob('WWFtbXk='); } catch (e) { return '?'; } })();

  // ---- Text ---------------------------------------------------------------
  var TX = {
    zh: {
      title: '禁區 1031', sub: 'WEEPING ANGELS', pick: '選擇你的探險者', boy: '男生', girl: '女生',
      newRun: '進入禁區', cont: function (n) { return '繼續 · ' + n; }, files: '禁區生物檔案',
      how: '逐道門搜查，找出收起來的證據。有些門是空的，有些門後面躲著旅客！集齊三份證據就能打開走廊盡頭的封印。畫出鬼魂頭上的符號把它驅散。',
      rule: '請謹記，注視是對抗它們的唯一方法……',
      keys: '← → 移動及轉身 · ↑ 搜查 · 滑鼠畫符號或按 1 – 5 · 空白鍵 武器 · Esc 暫停',
      keysTouch: '◀ ▶ 移動及轉身 · 「搜查」按鈕 · 在畫面上畫符號 · ✦ 武器', rotate: '把手機橫放，視野更闊',
      best: '最高分', play: '開始遊戲', hint: '注視，是唯一的方法',
      paused: '暫停', resume: '繼續', restart: '由檢查點重來', exit: '離開', close: '關閉', pause: '暫停', back: '返回',
      over: '你被黑暗吞噬了……', retry: '由檢查點重來',
      score: '分數', time: '時間', hearts: '剩餘生命', timeBonus: '時間獎勵', total: '總分', newBest: '新紀錄！', gfx: '畫質', gfxQ: ['自動', '高', '中', '低', '經典 2D'], achGot: '解鎖成就', peaceHow: '用對話解放所有旅客和首領。不要驅散任何一個，連在走廊畫符號趕走旅客也不行。生命旁邊的 ★ 還在，就仍有機會。', peaceLost: ['和平使者失敗：你用符號驅散了一個旅客。', '和平使者失敗：你在戰鬥中驅散了旅客。', '和平使者失敗：你驅散了首領。'], peace: ['和平使者', '沒有驅散任何旅客或首領，全部都用說話解放了。'], shards: '魂晶',
      search: '搜查', empty: '這裏甚麼也沒有。', stolen: '證據被奪走了！',
      gate: function (n) { return '封印未解 · 還需要 ' + n + ' 份證據'; }, gateOpen: '封印解除了',
      exitHint: '前往下一處 →', tap: '撳一下繼續',
      tipMove: '證據收在門後面，逐道門搜查（按 ↑）', tipMoveTouch: '證據收在門後面，走到門前按「搜查」', tipDraw: '畫出符號，驅散鬼魂', tipGaze: '天使只會在你看不見時移動。轉身，用燈籠照住它！',
      tipTension: '旅客附身在門上，假扮成證據！搜查前先用燈籠照一照，看清楚。', possessed: '是陷阱！旅客撲了出來', shopThanks: ['多謝惠顧！下層見～', '用得開心呀！', '記住要一直望住天使㗎！'], freeze: '定！', freezeSub: '哨子響起時不要動',
      lightsOut: '燈滅了……', embers: '接住火光，燈籠才不會熄滅',
      evidence: '證據', clear: '你解放了禁區', thanks: '多謝參與 禁區 1031',
      levels: ['一樓 · 實驗室走廊', '一樓 · 課室走廊', '二樓', '三樓'],
      bosses: ['實驗體', '走廊糾察', '泣母', '？？？'],
      phase: ['黑暗吞噬光明', '它在召喚……', '黑暗正在剝落 · 畫出最後的封印'],
      shopName: '小Cha 商店', shopHi: ['歡迎光臨～小Cha 商店！', '魂晶夠唔夠呀？', '小心天使，唔好轉身呀！', '買定離手！', '上面好黑㗎，買多盞燈啦～'],
      buy: '購買', maxed: '已滿', go: '出發 →', owned: '擁有',
      upg: {
        lan: ['更亮的燈籠', '注視範圍更闊更遠，天使碎得更快'],
        heart: ['多一顆心', '生命上限 +1'],
        calm: ['寧神符', '緊張累積得更慢'],
        steady: ['穩定之手', '緊張時符號更易被認出'],
        ward: ['封印護符', '抵擋一次傷害，每間商店補充'],
        quick: ['快手搜查', '搜查證據更快']
      },
      speaker: '？？？', revealLines: ['……', '我……出來了？', '謝謝你一直看著我，沒有移開目光。', '下年萬聖節，記得再來玩。'],
      fail: '此瀏覽器無法載入遊戲。', unknown: '尚未遇見',
      danger: '危險等級', trait: '特性', ability: '能力',
      weapon: '選擇武器', skill: '武器',
      vtip: { t: '迷路旅客害怕被看見。燈光照到它，它就會衝過來！轉身避開它。', te: '回音旅客：你走它就走，你停它就停。停下來，畫出它的符號。', tb: '負重旅客會附身在門上冒充證據。搜查前先照一照。', gs: '隱魂：在燈光外完全看不見。', gw: '怒魂：第一個符號會不停變換，看準時機！', gt: '雙生魂：驅散一隻後，三秒內要驅散另一隻！' },
      wpn: {
        lantern: ['燈籠', '光就是武器。按住空白鍵（或 ✦）把光收成光束：照得更遠，燒掉鬼魂的符號，天使碎得更快，還能定住旅客。光束會耗油，放開就會回復。戰鬥時：畫出符號攻擊，火光會減慢附近的攻擊。'],
        wand: ['魔杖', '畫出的每個符號都是咒語，會用魔力（慢慢回復）：— 光矢打掉前方敵人一個符號，| 光牆擋住敵人，V 減慢所有敵人，Λ 向前瞬移，○ 護盾。魔力滿時按空白鍵發動「星落」。戰鬥時：按次序畫出咒文，每回合可以張開一次護盾。'],
        yoyo: ['搖搖', '近身武器。空白鍵（或 ✦）擲出搖搖，打掉身前敵人的符號；連續命中會連擊，最多一次打掉三個。能定住旅客、擊退天使。代價：一隻手拿著搖搖，燈光照得較近。戰鬥時：看準時機撳下去，還可以轉動搖搖擊碎攻擊。']
      },
      b: { banish: '驅散', talk: '對話', item: '物品', free: '解放', seal: '封印', calm: '平靜',
        notReady: function (n) { return n + '還未準備好放手。先和它談談。'; }, ready: function (n) { return n + '平靜下來了。你可以解放它。'; },
        candy: '小Cha 糖果', ate: '你吃了糖果，回復一顆心。', none: '口袋空空如也。', angry: '它生氣了，下一輪攻擊會更快。',
        move: '用方向鍵或 WASD 移動火光', moveTouch: '在畫面上拖動來移動火光',
        trace: '畫出符號！（或按 1 – 5）', chant: '按次序畫出咒文！（或按 1 – 5）', swing: '搖搖到金色位置時撳一下！（空白鍵）',
        shield: '護盾', spin: '旋轉', beam: '燈光照著你移動的方向。照住石像，它們就不能動。', freeze: '哨子響起時不要動！',
        miss: '沒有命中。', won: function (n) { return '獲得 ◆ ' + n; }, returned: '它把奪走的證據還給了你。' }
    },
    en: {
      title: 'Forbidden Zone 1031', sub: 'WEEPING ANGELS', pick: 'Choose your explorer', boy: 'Boy', girl: 'Girl',
      newRun: 'Enter the zone', cont: function (n) { return 'Continue · ' + n; }, files: 'Creature files',
      how: 'The evidence is hidden behind the doors, so search them one by one. Some are empty, and some hide a traveller! Three pieces break the seal at the end of each corridor. Draw the symbol above a ghost to banish it.',
      rule: 'Remember: your gaze is the only thing that stops them……',
      keys: '← → walk and turn · ↑ search · draw with the mouse or press 1 – 5 · Space weapon · Esc pause',
      keysTouch: '◀ ▶ walk and turn · Search button · draw on the screen · ✦ weapon', rotate: 'Turn your phone sideways to see further',
      best: 'Best', play: 'Play', hint: 'Watch them. It’s the only way.',
      paused: 'Paused', resume: 'Resume', restart: 'Restart from checkpoint', exit: 'Exit', close: 'Close', pause: 'Pause', back: 'Back',
      over: 'The darkness took you…', retry: 'Retry from checkpoint',
      score: 'Score', time: 'Time', hearts: 'Hearts left', timeBonus: 'Time bonus', total: 'Total', newBest: 'New best!', gfx: 'Graphics', gfxQ: ['Auto', 'High', 'Medium', 'Low', 'Classic 2D'], achGot: 'Achievement unlocked', peaceHow: 'Free every traveller and boss by talking. Banish none of them, and that includes drawing a traveller’s symbols in the corridor. While the ★ next to your hearts is still there, you can still earn it.', peaceLost: ['Peace Keeper lost: you banished a traveller with its symbols.', 'Peace Keeper lost: you banished a traveller in battle.', 'Peace Keeper lost: you banished a boss.'], peace: ['Peace Keeper', 'You talked every traveller and boss free, and banished none of them.'], shards: 'Shards',
      search: 'Search', empty: 'Nothing here.', stolen: 'Your evidence was taken!',
      gate: function (n) { return 'Sealed · ' + n + ' more evidence needed'; }, gateOpen: 'The seal breaks',
      exitHint: 'Onward →', tap: 'Tap to continue',
      tipMove: 'Evidence hides behind the doors. Search them (↑)', tipMoveTouch: 'Evidence hides behind the doors. Walk up to one and tap Search', tipDraw: 'Draw the symbol to banish the ghost', tipGaze: 'Angels only move when you can’t see them. Turn and hold your lantern on it!',
      tipTension: 'A traveller has hidden in a door, posing as evidence! Shine your lantern on a door before you search it.', possessed: 'A trap! The traveller lunges out', shopThanks: ['Thank you! See you upstairs~', 'Use it well!', 'Remember: keep your eyes on the angels!'], freeze: 'Freeze!', freezeSub: 'Don’t move while the whistle blows',
      lightsOut: 'The lights die…', embers: 'Catch the embers to keep your lantern alight',
      evidence: 'Evidence', clear: 'You freed the zone', thanks: 'Thanks for playing Forbidden Zone 1031',
      levels: ['Floor 1 · Lab wing', 'Floor 1 · Classroom wing', 'Floor 2', 'Floor 3'],
      bosses: ['The Experiment', 'The Hall Monitor', 'The Weeping Mother', '???'],
      phase: ['The darkness eats the light', 'It calls for help…', 'The darkness peels away · draw the last seal'],
      shopName: 'Little Cha’s shop', shopHi: ['Welcome to Little Cha’s shop!', 'Got enough shards?', 'Careful with the angels. Don’t turn around!', 'No refunds!', 'It’s very dark upstairs. Buy a brighter lantern~'],
      buy: 'Buy', maxed: 'Max', go: 'Set off →', owned: 'Owned',
      upg: {
        lan: ['Brighter lantern', 'A wider, longer gaze. Angels crack faster'],
        heart: ['Extra heart', '+1 max heart'],
        calm: ['Calm charm', 'Tension builds more slowly'],
        steady: ['Steady hand', 'Symbols read better while tense'],
        ward: ['Seal ward', 'Blocks one hit. Refilled at every shop'],
        quick: ['Quick search', 'Search for evidence faster']
      },
      speaker: '???', revealLines: ['…', 'Am I… out?', 'Thank you for watching. You never looked away.', 'Come back next Halloween.'],
      fail: 'This browser can’t run the game.', unknown: 'Not met yet',
      danger: 'Danger', trait: 'Trait', ability: 'Ability',
      weapon: 'Choose a weapon', skill: 'Weapon',
      vtip: { t: 'Lost Travellers hate being seen. Catch one in your light and it charges! Turn away from it.', te: 'Echo Traveller: it walks when you walk and stops when you stop. Stand still and draw its symbols.', tb: 'Burdened Travellers hide in doors, posing as evidence. Shine your light on a door before you search it.', gs: 'Shade: invisible outside your light.', gw: 'Wrath: its first symbol keeps changing. Time your drawing!', gt: 'Twins: banish one, then the other within three seconds!' },
      wpn: {
        lantern: ['Lantern', 'Your light is the weapon. Hold Space (or ✦) to focus it into a beam: it reaches further, burns symbols off ghosts, cracks angels faster and pins travellers in place. The beam burns oil, which refills when you let go. In battle: draw the symbol to attack, and your flame slows nearby attacks.'],
        wand: ['Wand', 'Every symbol you draw is also a spell, paid for with mana that refills slowly: — Bolt knocks a symbol off the enemy in front, | Wall blocks enemies, V Slow slows everything, Λ Blink jumps you forward, ○ Ward blocks a hit. With full mana, Space casts Starfall. In battle: draw the spell in order, and raise a shield once per turn.'],
        yoyo: ['Yiu Yiu', 'A close-range weapon. Space (or ✦) throws it and knocks a symbol off the enemy in front; quick hits chain into combos that knock off up to three at once. It stuns travellers and knocks angels back. The cost: one hand is busy, so your light is shorter. In battle: tap in time, and spin it to smash attacks.']
      },
      b: { banish: 'Banish', talk: 'Talk', item: 'Item', free: 'Free', seal: 'Seal', calm: 'Calm',
        notReady: function (n) { return n + ' isn’t ready to let go yet. Talk to it first.'; }, ready: function (n) { return n + ' is calm now. You can free it.'; },
        candy: 'Little Cha’s candy', ate: 'You eat the candy. +1 heart.', none: 'Your pockets are empty.', angry: 'It’s angry. Its next attack will be faster.',
        move: 'Move the flame with the arrow keys or WASD', moveTouch: 'Drag anywhere to move the flame',
        trace: 'Draw the symbol! (or press 1 – 5)', chant: 'Draw the spell in order! (or press 1 – 5)', swing: 'Tap when the yiu yiu reaches the gold! (Space)',
        shield: 'Shield', spin: 'Spin', beam: 'Your light points the way you move. Statues can’t move while it’s on them.', freeze: 'Don’t move while the whistle blows!',
        miss: 'Missed.', won: function (n) { return 'You got ◆ ' + n; }, returned: 'It gives back the evidence it took.' }
    }
  };
  // Evidence: three per corridor, read in order as they're found.
  var NOTES = {
    zh: ['實驗記錄，1985 年 10 月 31 日：「所有燈泡同時熄滅，指南針全部指向三樓。」', '褪色的告示：「萬聖節話劇《泣使》，三樓，晚上八時。」', '一個貼著「勿開」的試劑瓶，裏面的黑霧在動。',
      '點名簿：同一個名字被劃掉了又寫上，寫上了又劃掉。', '話劇道具清單：「天使石像 ×12。注意：別背對它們。」', '一張演員合照，每張臉都被刮花了，只有一個人望向鏡頭外。',
      '旅客留言：「我們只是想來看看……門在身後關上了。」', '校務日誌：「三樓封閉，任何人不得進入。」', '一張演出門票，座位寫著：「最後一排，你的位置。」',
      '劇本最後一頁：「當燈再亮起時，天使會帶走那個沒有看著她的人。」', '手寫字條：「黑暗借用了那個人的身體。只要有人一直看著，那人就能回來。」', '一盞熄滅的燈籠，和你手上的一模一樣。'],
    en: ['Lab log, 31 Oct 1985: “Every bulb went out at once. Every compass pointed to the third floor.”', 'A faded notice: “Halloween play, The Weeping Angels. Third floor, 8 pm.”', 'A bottle labelled DO NOT OPEN. The black mist inside is moving.',
      'A class register: one name crossed out and written back, again and again.', 'Props list for the play: “Angel statues ×12. Note: never turn your back on them.”', 'A cast photo. Every face is scratched out except one, looking off-camera.',
      'A traveller’s note: “We only came to look… the door shut behind us.”', 'School log: “Third floor sealed. No one is to enter.”', 'A ticket. The seat reads: “Back row. Your seat.”',
      'The last page of the script: “When the lights return, the angel takes whoever wasn’t watching.”', 'A handwritten note: “The darkness borrowed someone’s body. If someone keeps watching, they can come back.”', 'A dead lantern, exactly like yours.']
  };
  // Creature files (bestiary). Angels keep their glitched line until you've crumbled one.
  var FILES = [
    { k: 'a', st: 4, zh: ['WEEPING ANGELS', '當個體注視該生物，則生物靜止不動；當個體移動目光，則生物##$_$$-9', '攻擊意向極强，當成功接觸個體，則無差別造成 3 點傷害', '當個體移動目光，則生物會以極速逼近。'],
      en: ['WEEPING ANGELS', 'While watched, it cannot move. When the observer looks away, it ##$_$$-9', 'Highly aggressive. On contact it deals 3 damage, without exception.', 'When the observer looks away, it closes in at terrifying speed.'] },
    { k: 't', st: 2, zh: ['迷路旅客', '葬身於禁區的旅客，害怕被人看見。被燈光照到時會轉身衝向你。', '接觸時把你拖進戰鬥。不照它，它就只會在走廊徘徊。'],
      en: ['Lost Travellers', 'Travellers who died in the zone. They hate being seen: catch one in your light and it turns and charges.', 'On contact it drags you into a battle. Keep your light off it and it just wanders.'] },
    { k: 'te', st: 3, zh: ['回音旅客', '它模仿你的腳步：你走，它就走（還快一點）；你停，它就停。', '走路永遠甩不掉它。停下來，畫出符號驅散它。'],
      en: ['Echo Travellers', 'It copies your footsteps: when you walk, it walks (a little faster); when you stop, it stops.', 'You can never outwalk it. Stand still and draw its symbols.'] },
    { k: 'tb', st: 2, zh: ['負重旅客', '拖著行李的旅客，會附身在門上冒充證據。', '搜查前先用燈光照一照門。被它撲到會奪走一份證據。'],
      en: ['Burdened Travellers', 'Travellers dragging their luggage. They hide in doors and pose as evidence.', 'Shine your light on a door before you search it. If one springs, it steals a piece of evidence.'] },
    { k: 'g', st: 1, zh: ['遊魂', '飄向光源，頭上帶著一至三個符號', '接觸時造成 1 點傷害'], en: ['Wandering ghosts', 'Drift toward light, carrying one to three symbols.', 'Deal 1 damage on contact.'] },
    { k: 'gs', st: 2, zh: ['隱魂', '在燈光外完全看不見，連符號也藏起來。', '只有被燈光照到時才可以驅散。'], en: ['Shades', 'Invisible outside your light, symbols and all.', 'You can only banish one while your light is on it.'] },
    { k: 'gw', st: 2, zh: ['怒魂', '頭上的第一個符號每隔一會就會變。', '看準時機，在符號變之前畫出來。'], en: ['Wraths', 'The first symbol over its head keeps changing.', 'Time it: draw the symbol before it changes.'] },
    { k: 'gt', st: 3, zh: ['雙生魂', '總是兩隻一起出現，用一條線連著。', '驅散一隻後，三秒內要驅散另一隻，否則它會復活。'], en: ['Twins', 'They always come in pairs, joined by a thread.', 'Banish one, then the other within three seconds, or the first comes back.'] },
    { k: 'w', st: 1, zh: ['鬼火', '細小而迅速，從四面八方竄出', '接觸時造成 1 點傷害'], en: ['Wisps', 'Small and fast. They dart in from every side.', 'Deal 1 damage on contact.'] }
  ];

  // Which creature-file entry an enemy counts as.
  function VK(e) { return e.type === 't' ? ({ echo: 'te', burden: 'tb' }[e.v] || 't') : e.type === 'g' && e.v ? 'g' + { shade: 's', wrath: 'w', twin: 't' }[e.v] : e.type; }
  // Variants are recoloured copies of the base sprite until their own art arrives.
  var VT = { echo: ['#cdb6f2', .45], burden: ['#c9a46a', .35], shade: ['#b490ef', .5], wrath: ['#f0566a', .5], twin: ['#7fb6f2', .4], charge: ['#f0566a', .55] }, VCACHE = {};
  function vSpr(img, key) { if (!key || !VT[key]) return img; var c = VCACHE[key] || (VCACHE[key] = new Map()), o = c.get(img); if (!o) { o = tint(img, VT[key][0], VT[key][1]); c.set(img, o); } return o; }
  // Wand spells: [mana cost, label]
  var SPELL = { h: [1, 'BOLT'], v: [2, 'WALL'], V: [2, 'SLOW'], A: [1, 'BLINK'], o: [3, 'WARD'] };

  // ---- Pixel art (placeholders, drawn at half size and doubled) ------------
  var INK = '#1a1230';
  var PAL = {
    skin: '#f2c9a0', skinD: '#d49a74', hair: '#2b1d1c', shirt: '#eceaf6', shirtD: '#bdb6d6', tie: '#3a2b62',
    trou: '#4b4b5e', trouD: '#38384a', skirt: '#2f3566', skirtD: '#232850', sock: '#eceaf6', shoe: '#17121f', gold: '#fbc75a'
  };
  function outline(c, col) {
    var w = c.width, h = c.height, x = c.getContext('2d'), d = x.getImageData(0, 0, w, h), s = d.data, a = new Uint8Array(w * h), i, px, py;
    var r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
    for (i = 0; i < w * h; i++) a[i] = s[i * 4 + 3] ? 1 : 0;
    for (py = 0; py < h; py++) for (px = 0; px < w; px++) {
      i = py * w + px; if (a[i]) continue;
      if ((px > 0 && a[i - 1]) || (px < w - 1 && a[i + 1]) || (py > 0 && a[i - w]) || (py < h - 1 && a[i + w])) { s[i * 4] = r; s[i * 4 + 1] = g; s[i * 4 + 2] = b; s[i * 4 + 3] = 255; }
    }
    x.putImageData(d, 0, 0); return c;
  }
  function sprite(w, h, fn, line) {
    var c = cnv(w + 2, h + 2), x = c.getContext('2d');
    fn(function (px, py, pw, ph, col) { x.fillStyle = col; x.fillRect(px + 1, py + 1, pw, ph); });
    return outline(c, line || INK);
  }
  function up(c, k) { k = k || 2; var o = cnv(c.width * k, c.height * k), x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, o.width, o.height); return o; }
  function tint(c, col, a) { var o = cnv(c.width, c.height), x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, o.width, o.height); return o; }

  // Student, 16x24 (doubled to 36x52 with the outline). pose: idle, walk, cast.
  function student(girl, pose, f) {
    var P = PAL;
    return sprite(16, 24, function (p) {
      var b = pose === 'walk' ? f % 2 : pose === 'idle' ? f : 0;
      var legs = pose === 'walk' ? [[4, 9], [6, 7], [9, 4], [7, 6]][f] : [5, 8];
      legs.forEach(function (lx, k) {
        var lift = pose === 'walk' && f % 2 && k ? 1 : 0;
        if (girl) { p(lx + 1, 19, 2, 2 - lift, k ? P.skin : P.skinD); p(lx + 1, 21 - lift, 2, 1, P.sock); }
        else p(lx, 18, 3, 4 - lift, k ? P.trou : P.trouD);
        p(lx, 22 - lift, 4, 2, P.shoe);
      });
      p(4, 10 + b, 8, 7, P.shirt); p(4, 10 + b, 1, 7, P.shirtD);
      if (girl) {
        p(3, 16 + b, 10, 3, P.skirt); p(5, 17 + b, 1, 2, P.skirtD); p(8, 17 + b, 1, 2, P.skirtD); p(11, 17 + b, 1, 2, P.skirtD);
        p(8, 10 + b, 3, 1, P.tie); p(9, 11 + b, 1, 1, P.tie);
      } else { p(4, 17 + b, 8, 1, P.trouD); p(9, 10 + b, 1, 6, P.tie); }
      if (pose === 'cast') { p(9, 11 + b, 5, 2, P.shirtD); p(14, 10 + b, 2, 2, P.skin); }
      else { var ax = pose === 'walk' ? [9, 8, 7, 8][f] : 8; p(ax, 11 + b, 2, 4, P.shirtD); p(ax, 15 + b, 2, 1, P.skin); }
      p(5, 2 + b, 7, 7, P.skin); p(7, 9 + b, 3, 1, P.skinD);
      p(5, b, 7, 1, P.hair); p(4, 1 + b, 9, 2, P.hair); p(4, 3 + b, 3, 3, P.hair); p(7, 3 + b, 4, 1, P.hair);
      if (girl) { p(3, 3 + b, 3, 8, P.hair); p(4, 11 + b, 2, 1, P.hair); p(10, 1 + b, 2, 1, P.gold); }
      else p(4, 6 + b, 2, 1, P.hair);
      p(7, 5 + b, 1, 2, P.skinD); p(10, 5 + b, 1, 2, INK); p(11, 7 + b, 1, 1, '#f09a9a');
    });
  }
  // Where the lantern hangs, in doubled sprite pixels (canvas 36x52).
  function hand(pose, f) {
    var b = pose === 'walk' ? f % 2 : pose === 'idle' ? f : 0;
    if (pose === 'cast') return [34, 24 + b * 2];
    return [((pose === 'walk' ? [9, 8, 7, 8][f] : 8) + 2) * 2, (17 + b) * 2];
  }
  function ghostSpr(f, hit) {
    var body = hit ? '#ffffff' : '#efe8ff', sh = hit ? '#f4efff' : '#c9b8f0';
    return sprite(16, 15, function (p) {
      var hw = [3, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7], y, x;
      for (y = 0; y < 13; y++) { p(8 - hw[y], y, hw[y] * 2, 1, body); p(8 + hw[y] - 2, y, 2, 1, sh); }
      for (x = 1; x < 15; x++) p(x, 13, 1, ((x >> 1) + f) % 2 ? 1 : 2, x > 12 ? sh : body);
      p(0, 7, 2, 2, body);
      p(4, 5, 2, 3, '#2a1d4a'); p(8, 5, 2, 3, '#2a1d4a'); p(4, 5, 1, 1, '#fff'); p(8, 5, 1, 1, '#fff');
      p(6, 9, 2, f ? 2 : 1, '#2a1d4a'); p(3, 8, 1, 1, '#f5a8c8'); p(10, 8, 1, 1, '#f5a8c8');
    }, '#5a3f96');
  }
  function wispSpr(f, hit) {
    return sprite(11, 11, function (p) {
      var hw = [1, 1, 2, 2, 3, 4, 5, 5, 5, 4, 3], y;
      for (y = 0; y < 11; y++) {
        var cx = 5 + (y < 3 ? (f ? 1 : -1) * (3 - y) / 2 | 0 : 0);
        p(cx - hw[y] + 1, y, hw[y] * 2 - 1, 1, hit ? '#fff4dc' : '#f39a4a');
        if (hw[y] > 2) p(cx - hw[y] + 3, y, hw[y] * 2 - 5, 1, hit ? '#ffffff' : '#fbc75a');
      }
      p(3, 7, 1, 2, INK); p(6, 7, 1, 2, INK);
    }, '#7a2e18');
  }
  // Weeping Angel: a stone statue. 'cover' = hands over its face (watched); 'lunge' = reaching, face bared.
  function angelSpr(pose, crack) {
    var S = '#a7a5b6', M = '#85839a', D = '#5f5d74', K = '#2a2838';
    return sprite(18, 30, function (p) {
      var y;
      // wings
      var wy = pose === 'lunge' ? 2 : 6;
      for (y = 0; y < 15; y++) { var ww = Math.max(1, 5 - Math.abs(y - 5) / 2 | 0); p(4 - ww, wy + y, ww, 1, y % 3 ? M : D); p(14, wy + y, ww, 1, y % 3 ? M : D); }
      // robe
      for (y = 10; y < 30; y++) { var hw = Math.min(6, 3 + ((y - 10) / 4 | 0)); p(9 - hw, y, hw * 2, 1, S); p(9 + hw - 2, y, 2, 1, M); if (y % 5 === 0) p(9 - hw + 2, y, 1, 3, M); }
      p(5, 29, 8, 1, D);
      // head
      p(6, 2, 6, 7, S); p(10, 2, 2, 7, M); p(6, 1, 6, 1, M);
      if (pose === 'cover') {
        p(5, 4, 8, 4, S); p(5, 4, 8, 1, '#c3c1d0'); p(8, 4, 1, 4, M); p(5, 8, 3, 3, S); p(10, 8, 3, 3, S);
      } else {
        p(7, 4, 1, 2, K); p(10, 4, 1, 2, K); p(7, 7, 4, 2, K); p(7, 7, 1, 1, '#d9d7e4'); p(9, 7, 1, 1, '#d9d7e4'); p(8, 8, 1, 1, '#d9d7e4'); p(10, 8, 1, 1, '#d9d7e4');
        p(12, 9, 6, 2, S); p(16, 8, 2, 1, S); p(16, 11, 2, 1, S); p(12, 12, 5, 2, M);
      }
      if (crack > 0) { p(7, 12, 1, 3, K); p(8, 15, 1, 2, K); p(9, 17, 1, 3, K); }
      if (crack > 1) { p(11, 18, 1, 4, K); p(10, 22, 1, 2, K); p(6, 3, 1, 2, K); p(5, 21, 2, 1, K); }
      if (crack > 2) { p(12, 13, 1, 3, K); p(4, 24, 3, 1, K); p(10, 2, 1, 3, K); p(8, 25, 1, 3, K); }
    }, '#17151f');
  }
  // Perished Traveller: a translucent wanderer with a hat and a pack, no face.
  function travSpr(f) {
    var B = '#a9c4d6', M = '#7f9db3', D = '#5d7891';
    return sprite(14, 24, function (p) {
      var b = f % 2;
      p(3, 3 + b, 8, 1, D); p(4, 0 + b, 6, 3, M); p(5, 4 + b, 4, 5, B); p(5, 5 + b, 4, 3, '#2c3a4c');
      p(3, 9 + b, 8, 8, B); p(9, 9 + b, 2, 8, M); p(0, 9 + b, 3, 7, D); p(0, 10 + b, 3, 1, M);
      p(11, 11 + b, 2, 5, B); for (var y = 17; y < 24; y++) { var hw = 4 - ((y - 17) / 2 | 0); if (hw > 0) p(7 - hw, y, hw * 2, 1, (y + f) % 3 ? B : M); }
    }, '#33485e');
  }
  // Stage boss 2: the Hall Monitor (a huge ghost with a prefect's armband and whistle).
  function bossSpr(f, hit) {
    var body = hit ? '#ffffff' : '#e7dcff', sh = hit ? '#f4efff' : '#b9a3ea', dk = '#2a1d4a';
    return sprite(36, 34, function (p) {
      var y, x;
      for (y = 0; y < 30; y++) {
        var hw = y < 14 ? Math.max(3, Math.round(16 * Math.sqrt(Math.max(0, 1 - Math.pow((14 - y) / 14.5, 2))))) : 16;
        p(18 - hw, y, hw * 2, 1, body); p(18 + hw - 4, y, 4, 1, sh);
      }
      for (x = 2; x < 34; x++) p(x, 30, 1, ((x >> 2) + f) % 2 ? 2 : 4, x > 29 ? sh : body);
      p(0, 15, 4, 6, body); p(0, 16, 4, 3, '#5a3f96'); p(0, 17, 4, 1, '#fbc75a');
      p(7, 8, 2, 1, dk); p(9, 9, 2, 1, dk); p(11, 10, 2, 1, dk);
      p(19, 10, 2, 1, dk); p(21, 9, 2, 1, dk); p(23, 8, 2, 1, dk);
      p(8, 11, 4, 4, dk); p(19, 11, 4, 4, dk); p(9, 12, 2, 2, '#fbc75a'); p(20, 12, 2, 2, '#fbc75a');
      p(12, 18, 7, 3, '#fbc75a'); p(17, 19, 2, 1, '#eb9a12'); p(10, 19, 2, 1, dk);
      p(14, 21, 1, 5, '#5a3f96'); p(6, 23, 3, 1, '#f5a8c8'); p(23, 23, 3, 1, '#f5a8c8');
    }, '#3a2b62');
  }
  // The final boss: hooded, so nothing gives away who it is until the reveal.
  function cloakSpr(freed) {
    var c = freed ? '#2a1f4a' : '#140d2a', e = freed ? '#fff4dc' : '#fbc75a';
    return sprite(16, 26, function (p) {
      var y;
      p(5, 0, 6, 1, c); p(4, 1, 8, 3, c); p(3, 4, 10, 5, c);
      for (y = 9; y < 26; y++) { var hw = Math.min(7, 4 + ((y - 9) / 3 | 0)); p(8 - hw, y, hw * 2, 1, c); }
      p(6, 6, 1, 1, e); p(9, 6, 1, 1, e); p(7, 12, 2, 2, freed ? '#fbc75a' : '#5a3f96');
    }, freed ? '#fbc75a' : '#5a3f96');
  }
  // Little Cha: a tiny chibi shopkeeper (placeholder until her sheet arrives).
  function chaSpr(f) {
    return sprite(14, 18, function (p) {
      var b = f % 2;
      p(2, 1 + b, 10, 8, PAL.hair); p(3, 3 + b, 8, 6, PAL.skin); p(3, 2 + b, 8, 2, PAL.hair); p(2, 3 + b, 2, 7, PAL.hair); p(10, 3 + b, 2, 7, PAL.hair);
      p(10, 1 + b, 2, 2, PAL.gold); p(5, 5 + b, 1, 2, INK); p(8, 5 + b, 1, 2, INK); p(4, 7 + b, 1, 1, '#f5a8c8'); p(9, 7 + b, 1, 1, '#f5a8c8'); p(6, 8 + b, 2, 1, '#c0566a');
      p(3, 10, 8, 5, '#5a3f96'); p(6, 10, 2, 5, PAL.gold); p(1, 11 - b, 2, 3, PAL.skin); p(11, 11, 2, 3, PAL.skin);
      p(4, 15, 2, 3, PAL.shoe); p(8, 15, 2, 3, PAL.shoe);
    }, '#2a1d4a');
  }

  // ---- Art registry ---------------------------------------------------------
  // Each entry is { anim: [frames] }, frames are canvases. Sheets dropped into photos/1031/ override the placeholders:
  // one animation per row, frames left to right, each frame fw x fh, transparent background.
  // `fix` maps the loaded rows onto the animations the engine asks for.
  var x2 = function (a) { return a.map(function (c) { return up(c, 2); }); };
  var SHEETS = {
    boy: { src: 'photos/1031/boy.png', fw: 32, fh: 48, rows: ['idle', 'walk', 'cast', 'search', 'hurt', 'win'], lantern: true },
    girl: { src: 'photos/1031/girl.png', fw: 32, fh: 48, rows: ['idle', 'walk', 'cast', 'search', 'hurt', 'win'], lantern: true },
    face: { src: 'photos/1031/faces.png', fw: 64, fh: 64, rows: ['boy', 'girl', 'cha'] },
    angel: { src: 'photos/1031/angel.png', fw: 32, fh: 56, rows: ['c', 'l', 'k'], fix: function (o) {
      var cover = [o.c[0], o.k[0], o.k[1], o.k[2]], lunge = o.l.concat([o.l[o.l.length - 1]]);
      ART.mother = { cover: x2(cover), lunge: x2(lunge) };
      return { cover: cover, lunge: lunge, rubble: [o.k[3]] };
    } },
    cha: { src: 'photos/1031/cha.png', fw: 24, fh: 32, rows: ['idle', 'wave', 'happy'] },
    // The final boss's sheets keep neutral names (see the note at the top of the file).
    final: { src: 'photos/1031/boss4.png', fw: 64, fh: 80, rows: ['idle', 'cast', 'freed'] },
    finalB: { src: 'photos/1031/boss4b.png', fw: 32, fh: 48, rows: ['true'], into: 'final' },
    finalF: { src: 'photos/1031/boss4f.png', fw: 64, fh: 64, rows: ['face'], into: 'final' },
    // Batch 2. Corridor sheets face right; battle sheets face the player.
    boy2: { src: 'photos/1031/boy2.png', fw: 32, fh: 48, rows: ['beam', 'wand', 'yoyo'], lantern: true, into: 'boy' },
    girl2: { src: 'photos/1031/girl2.png', fw: 32, fh: 48, rows: ['beam', 'wand', 'yoyo'], lantern: true, into: 'girl' },
    trav: { src: 'photos/1031/trav.png', fw: 32, fh: 48, rows: ['li', 'ld', 'lc', 'ei', 'ed', 'bi', 'bd'], fix: function (o) {
      return { idle: o.li, K: { lost: { idle: o.li, drift: o.ld, charge: o.lc }, echo: { idle: o.ei, drift: o.ed }, burden: { idle: o.bi, drift: o.bd } } };
    } },
    door: { src: 'photos/1031/door.png', fw: 40, fh: 72, rows: ['burden'] },
    btrav: { src: 'photos/1031/btrav.png', fw: 96, fh: 96, rows: ['li', 'la', 'lh', 'lc', 'ei', 'ea', 'eh', 'ec', 'bi', 'ba', 'bh', 'bc'], fix: function (o) {
      var s = function (p) { return { idle: o[p + 'i'], attack: o[p + 'a'], hurt: o[p + 'h'], calm: o[p + 'c'] }; };
      return { lost: s('l'), echo: s('e'), burden: s('b') };
    } },
    mon: { src: 'photos/1031/mon.png', fw: 72, fh: 72, rows: ['idle', 'whistle'], into: 'monitor', fix: function (o) { return { idle: o.idle, whistle: o.whistle, hit: [tint(o.idle[0], '#ffffff', .5)], right: true }; } },
    bmon: { src: 'photos/1031/bmon.png', fw: 96, fh: 96, rows: ['idle', 'attack', 'hurt', 'calm'] },
    exp: { src: 'photos/1031/exp.png', fw: 48, fh: 40, rows: ['idle'] },
    bexp: { src: 'photos/1031/bexp.png', fw: 96, fh: 96, rows: ['idle', 'attack', 'hurt', 'calm'] },
    bmother: { src: 'photos/1031/bmother.png', fw: 80, fh: 112, rows: ['idle', 'attack', 'crack', 'calm'] },
    bfinal: { src: 'photos/1031/boss4c.png', fw: 96, fh: 112, rows: ['p1', 'p2', 'p3', 'hurt'] },
    ghost: { src: 'photos/1031/ghost.png', fw: 24, fh: 24, rows: ['g', 'shade', 'wrath', 'twin', 'twin2'], fix: function (o) {
      var s = function (a) { return { idle: a.slice(0, 2), hit: [a[2] || a[0]] }; }, r = s(o.g);
      r.V = { shade: s(o.shade), wrath: s(o.wrath), twin: s(o.twin), twin2: s(o.twin2) }; return r;
    } },
    wisp: { src: 'photos/1031/wisp.png', fw: 12, fh: 12, rows: ['a'], fix: function (o) { return { idle: o.a.slice(0, 2), hit: [o.a[2] || o.a[0]] }; } },
    fx: { src: 'photos/1031/fx.png', fw: 12, fh: 12, rows: ['t', 'X', 'M', 'Q', 'F'] },
    yoyo: { src: 'photos/1031/yoyo.png', fw: 16, fh: 16, rows: ['spin'] },
    ui: { src: 'photos/1031/uiicons.png', fw: 24, fh: 24, rows: ['icons'] },
    uiflame: { src: 'photos/1031/uiflame.png', fw: 8, fh: 12, rows: ['flame'], into: 'ui' }
  };
  // The lantern is drawn into the student sheets: find its gold pixels so the light starts there.
  function findLantern(c) {
    var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, sx = 0, sy = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] > 200 && d[i + 1] > 120 && d[i + 1] < 235 && d[i + 2] < 110) { var p = i / 4; sx += p % c.width; sy += p / c.width | 0; n++; }
    if (n >= 4) c.lan = [sx / n, sy / n];
  }
  var ART;
  function art() {
    if (ART) return ART;
    var st = function (girl) {
      return {
        idle: [0, 1].map(function (f) { return up(student(girl, 'idle', f)); }),
        walk: [0, 1, 2, 3].map(function (f) { return up(student(girl, 'walk', f)); }),
        cast: [up(student(girl, 'cast', 0))]
      };
    };
    ART = {
      boy: st(false), girl: st(true),
      ghost: { idle: [up(ghostSpr(0)), up(ghostSpr(1))], hit: [up(ghostSpr(0, true))] },
      wisp: { idle: [up(wispSpr(0)), up(wispSpr(1))], hit: [up(wispSpr(0, true))] },
      angel: { cover: [0, 1, 2, 3].map(function (k) { return up(angelSpr('cover', k)); }), lunge: [0, 1, 2, 3].map(function (k) { return up(angelSpr('lunge', k)); }) },
      mother: { cover: [0, 1, 2, 3].map(function (k) { return up(angelSpr('cover', k), 4); }), lunge: [0, 1, 2, 3].map(function (k) { return up(angelSpr('lunge', k), 4); }) },
      trav: { idle: [up(travSpr(0)), up(travSpr(1))] },
      monitor: { idle: [up(bossSpr(0)), up(bossSpr(1))], hit: [up(bossSpr(0, true))] },
      final: { idle: [up(cloakSpr(false), 3)], freed: [up(cloakSpr(true), 3)] },
      cha: { idle: [chaSpr(0), chaSpr(1)] },
      door: {}, btrav: {}, bmon: {}, exp: {}, bexp: {}, bmother: {}, bfinal: {}, fx: {}, yoyo: {}, ui: {}
    };
    Object.keys(SHEETS).forEach(function (k) {
      var s = SHEETS[k], im = new Image();
      im.onload = function () {
        var cols = Math.floor(im.width / s.fw), out = {};
        s.rows.forEach(function (name, r) {
          var fr = [];
          for (var c = 0; c < cols; c++) {
            var o = cnv(s.fw, s.fh), x = o.getContext('2d'); x.drawImage(im, c * s.fw, r * s.fh, s.fw, s.fh, 0, 0, s.fw, s.fh);
            if (x.getImageData(0, 0, s.fw, s.fh).data.some(function (v, i) { return i % 4 === 3 && v; })) { if (s.lantern) findLantern(o); fr.push(o); }
          }
          if (fr.length) out[name] = fr;
        });
        if (s.fix) out = s.fix(out);
        var key = s.into || k;
        ART[key] = Object.assign({}, ART[key], out);
        ART[key].real = true;
      };
      im.src = s.src;
    });
    return ART;
  }

  // ---- Symbols and pixel text ---------------------------------------------
  var GL = {
    h: ['0000000', '0000000', '0000000', '1111111', '0000000', '0000000', '0000000'],
    v: ['0001000', '0001000', '0001000', '0001000', '0001000', '0001000', '0001000'],
    V: ['1000001', '1000001', '0100010', '0100010', '0010100', '0010100', '0001000'],
    A: ['0001000', '0010100', '0010100', '0100010', '0100010', '1000001', '1000001'],
    o: ['0011100', '0100010', '1000001', '1000001', '1000001', '0100010', '0011100']
  };
  var KEYG = { '1': 'h', '2': 'v', '3': 'V', '4': 'A', '5': 'o' };
  var BK = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
  function glyph(x, g, gx, gy, col, s) {
    s = s || 1; x.fillStyle = col;
    GL[g].forEach(function (r, j) { for (var i = 0; i < 7; i++) if (r[i] === '1') x.fillRect(gx + i * s, gy + j * s, s, s); });
  }
  var F3 = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
    '+': '000010111010000', ':': '000010000010000', 'x': '000101010101000', '-': '000000111000000', '!': '010010010000010', '?': '111001011000010', '.': '000000000000010', '/': '001001010100100',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111', 'F': '111100110100100',
    'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101', 'L': '100100100100111',
    'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010', 'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101',
    'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101',
    'Y': '101101010010010', 'Z': '111001010100111'
  };
  function ptext(x, str, tx, ty, col) {
    x.fillStyle = col;
    for (var k = 0; k < str.length; k++) { var m = F3[str[k]]; if (m) for (var i = 0; i < 15; i++) if (m[i] === '1') x.fillRect(tx + k * 4 + i % 3, ty + (i / 3 | 0), 1, 1); }
  }
  var HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  // HUD hearts: the pixel sheet (full, half, empty) once loaded, else drawn here. Returns the x after the last heart.
  function hearts(x, hp, maxHp) {
    var H = ART && ART.ui && ART.ui.hearts;
    for (var i = 0; i < maxHp / 2; i++) { var v = hp - i * 2; if (H) x.drawImage(H[v >= 2 ? 0 : v === 1 ? 1 : 2], 4 + i * 10, 3); else heart(x, 4 + i * 9, 4, v >= 1 ? '#f39a4a' : '#3a2b62', v === 1, '#3a2b62'); }
    return H ? 4 + Math.ceil(maxHp / 2) * 10 : 4 + maxHp / 2 * 9;
  }
  function heart(x, hx, hy, col, half, col2) {
    HEART.forEach(function (r, j) { for (var i = 0; i < 7; i++) if (r[i] === '1') { x.fillStyle = half && i > 3 ? col2 : col; x.fillRect(hx + i, hy + j, 1, 1); } });
  }
  function shard(x, sx, sy) { x.fillStyle = '#b490ef'; x.fillRect(sx + 2, sy, 1, 1); x.fillRect(sx + 1, sy + 1, 3, 1); x.fillRect(sx, sy + 2, 5, 1); x.fillRect(sx + 1, sy + 3, 3, 1); x.fillRect(sx + 2, sy + 4, 1, 1); x.fillStyle = '#efe8ff'; x.fillRect(sx + 1, sy + 2, 1, 1); }
  function line(x, x0, y0, x1, y1, w) {
    w = w || 1; var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), o = (w - 1) / 2;
    for (var i = 0; i <= n; i++) x.fillRect(Math.round(x0 + (x1 - x0) * i / n - o), Math.round(y0 + (y1 - y0) * i / n - o), w, w);
  }
  // A 64x64 portrait frame for dialogues, or null while the sheet is still loading.
  function faceCnv(img, px) {
    if (!img) return null;
    var c = cnv(64, 64), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0);
    c.style.cssText = 'flex:none;width:' + px + 'px;height:' + px + 'px;image-rendering:pixelated;background:#1a1230;box-shadow:0 0 0 3px #5a3f96';
    return c;
  }
  // Puts a portrait beside the dialogue's text when there is one.
  function withFace(d, face, parts) {
    var col = el('div', 'display:flex;flex-direction:column;gap:6px;flex:1;min-width:0');
    parts.forEach(function (p) { col.appendChild(p); });
    if (!face) { parts.forEach(function (p) { d.appendChild(p); }); return; }
    var row = el('div', 'display:flex;gap:14px;align-items:center'); row.appendChild(face); row.appendChild(col); d.appendChild(row);
  }
  function fmtT(s) { s = Math.floor(s); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); }

  // ---- The four corridors (from the hand-drawn school map) ------------------
  // doors: [x, label, kind]  kind: door | lab | board | stairs (blocked) | none
  // ev: indexes of doors that can hold evidence (three are chosen per run)
  // trig: [x, spawns...]  spawn = [delay s, type, side, symbols]  types: w wisp, g ghost, t traveller, a angel; sides: R ahead, L behind, T from the ceiling
  // tip: [x, key]
  function classDoors(prefix) { var o = [], k = 0; ['A', 'B', 'C', 'D'].forEach(function (c) { o.push([130 + k++ * 140, prefix[0] + c]); }); ['A', 'B', 'C', 'D'].forEach(function (c) { o.push([130 + k++ * 140 + 40, prefix[1] + c]); }); return o.map(function (d) { return [d[0], d[1], 'door']; }); }
  var LEVELS = [
    { len: 1200, gate: 830, pool: 'hvVA', wall: '#241b40', boss: 'X', end: 'corner',
      doors: [[220, 'PHYSICS LAB', 'lab'], [320, 'PREP ROOM', 'door'], [420, '', 'board'], [520, 'STORE ROOM', 'door'], [620, 'CHEMISTRY LAB', 'lab'], [760, 'STAIRS 1', 'stairs']], ev: [0, 1, 2, 3, 4],
      tips: [[40, 'tipMove'], [170, 'tipDraw']],
      trig: [[170, [0, 'w', 'R', 'h'], [2.2, 'w', 'R', 'v']], [330, [0, 'g', 'R', '??'], [1.6, 'w', 'L', '?']], [520, [0, 't', 'R', '??'], [1.4, 'w', 'T', '?']], [700, [0, 'g', 'R', '???'], [1, 'g', 'L', '??'], [2.2, 'w', 'R', '?']]] },
    { len: 1700, gate: 1360, pool: 'hvVAo', wall: '#251a3c', boss: 'M', end: 'stairs',
      doors: classDoors('34'), ev: [0, 1, 2, 3, 4, 5, 6, 7],
      tips: [[300, 'tipGaze']],
      trig: [[180, [0, 'g', 'R', '??'], [1.2, 'w', 'R', '?']], [300, [0, 'a', 'R']], [540, [0, 'g', 'R', '??'], [.6, 'a', 'L'], [2, 'w', 'T', '?']], [780, [0, 't', 'R', '??'], [1, 'g', 'R', '??'], [2.2, 'w', 'L', '?']],
        [1000, [0, 'a', 'L'], [.5, 'a', 'R'], [1.6, 'g', 'R', '???']], [1220, [0, 'g', 'R', '??'], [.8, 't', 'L', '??'], [1.8, 'w', 'R', '?'], [2.4, 'w', 'L', '?']]] },
    { len: 1800, gate: 1440, pool: 'hvVAo', wall: '#211a3e', boss: 'Q', end: 'entrance',
      doors: classDoors('12'), ev: [0, 1, 2, 3, 4, 5, 6, 7],
      trig: [[160, [0, 'a', 'R'], [.8, 'g', 'L', '??']], [380, [0, 't', 'R', '??'], [.6, 't', 'L', '?'], [2, 'w', 'T', '?']], [620, [0, 'a', 'L'], [0, 'a', 'R'], [1.4, 'g', 'R', '???']],
        [860, [0, 'g', 'R', '??'], [.5, 'g', 'L', '??'], [1.5, 't', 'R', '??'], [2.5, 'w', 'T', '?']], [1100, [0, 'a', 'R'], [.4, 'a', 'L'], [1.2, 't', 'L', '???'], [2, 'w', 'R', '?']],
        [1320, [0, 'g', 'R', '???'], [1, 'a', 'L'], [1.8, 'w', 'T', '?'], [2.4, 'w', 'L', '?']]] },
    { len: 1800, gate: 1440, pool: 'hvVAo', wall: '#1d1638', boss: 'F', end: 'final',
      doors: classDoors('56'), ev: [0, 1, 2, 3, 4, 5, 6, 7],
      trig: [[160, [0, 'g', 'R', '???'], [.8, 'a', 'L']], [400, [0, 't', 'R', '???'], [.6, 'a', 'R'], [1.6, 'w', 'T', '?'], [2.2, 'w', 'L', '?']], [640, [0, 'a', 'L'], [0, 'a', 'R'], [.8, 'g', 'R', '??'], [2, 't', 'L', '??']],
        [880, [0, 'g', 'R', '???'], [.4, 'g', 'L', '???'], [1.4, 'a', 'R'], [2.6, 'w', 'T', '?']], [1120, [0, 't', 'R', '???'], [.5, 't', 'L', '??'], [1.2, 'a', 'L'], [2, 'g', 'R', '???']],
        [1330, [0, 'a', 'R'], [0, 'a', 'L'], [1, 'g', 'R', '???'], [1.8, 'w', 'T', '?'], [2.4, 'w', 'T', '?']]] }
  ];
  var WALL = 118;
  var DEF = { w: { spd: 30, hr: 9, dmg: 1, sh: 1, pts: 50 }, g: { spd: 19, hr: 12, dmg: 1, sh: 1, pts: 100 }, t: { spd: 24, hr: 16, dmg: 0, sh: 3, pts: 150 }, a: { spd: 80, hr: 12, dmg: 3, sh: 3, pts: 200 } };
  var UPG = { lan: [35, 50, 65], heart: [40, 55, 70], calm: [30, 45], steady: [30, 45], ward: [35], quick: [25, 40] };

  function buildBG(L, H, fy, demoLen) {
    var len = demoLen || L.len, c = cnv(len, H), x = c.getContext('2d'), i, top = fy - WALL, wall = L ? L.wall : '#241b40';
    var R = function (a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); };
    R(0, 0, len, top, '#0b0820');
    for (i = 0; i < len; i += 56) R(i, 0, 4, top - 4, '#100c27');
    R(0, top - 4, len, 4, '#1b1438');
    R(0, top, len, fy - top, wall);
    for (i = 0; i < len * (fy - top) / 40; i++) R(Math.random() * len | 0, top + Math.random() * (fy - top - 38) | 0, 1 + (Math.random() * 2 | 0), 1, Math.random() < .5 ? '#2a1f4a' : '#1d1636');
    R(0, fy - 38, len, 38, '#1d1636'); R(0, fy - 39, len, 1, '#3a2b62');
    for (i = 0; i < len; i += 14) R(i, fy - 37, 1, 34, '#1a1331');
    R(0, fy - 3, len, 3, '#2e2352');
    for (var y = fy, row = 0; y < H; y += 10, row++) for (i = -(row % 2) * 10; i < len; i += 20) {
      R(i, y, 20, 10, (i / 20 + row) % 2 ? '#1a1430' : '#1e1736'); R(i, y, 20, 1, '#150f28'); R(i, y, 1, 10, '#150f28');
    }
    R(0, fy, len, 1, '#2c2150');
    if (!L) { for (i = 50; i < len; i += 170) door(i, '3' + 'ABCD'[(i / 170 | 0) % 4]); return c; }
    var used = L.doors.map(function (d) { return d[0]; });
    // windows, lockers and fire extinguishers between doors
    for (i = 70; i < L.gate - 40; i += 70) {
      if (used.some(function (u) { return Math.abs(u - i) < 56; })) continue;
      var k = (i / 70 | 0) % 3;
      if (k === 0) { R(i - 26, top + 20, 52, 42, '#3a2b62'); R(i - 23, top + 23, 46, 36, '#0a0919'); for (var m = 0; m < 6; m++) R(i - 23, top + 28 + m * 6, 46, 2, m % 2 ? '#15132c' : '#1b1836'); R(i - 1, top + 23, 2, 36, '#3a2b62'); R(i - 23, top + 40, 46, 2, '#3a2b62'); }
      else if (k === 1) for (var lk = 0; lk < 3; lk++) { var lx = i - 22 + lk * 15; R(lx, fy - 54, 14, 51, '#2f2654'); R(lx, fy - 54, 14, 1, '#463a78'); R(lx + 10, fy - 32, 1, 5, '#8c7fae'); R(lx + 3, fy - 49, 8, 1, '#1a1331'); R(lx + 3, fy - 46, 8, 1, '#1a1331'); }
      else { R(i - 4, fy - 22, 8, 19, '#a3283b'); R(i - 2, fy - 26, 4, 4, '#2e2352'); R(i - 4, fy - 16, 8, 3, '#eceaf6'); }
    }
    L.doors.forEach(function (d) {
      if (d[2] === 'board') { var bx = d[0] - 30; R(bx, top + 26, 60, 38, '#3a2b62'); R(bx + 3, top + 29, 54, 32, '#5b3a2a');
        [['#eceaf6', 4, 3, 12, 15], ['#cdb6f2', 20, 6, 11, 12], ['#fbc75a', 36, 3, 11, 11], ['#eceaf6', 35, 17, 12, 10], ['#f39a4a', 6, 21, 10, 6]].forEach(function (n) { R(bx + 3 + n[1], top + 29 + n[2], n[3], n[4], n[0]); R(bx + 3 + n[1] + (n[3] >> 1), top + 29 + n[2], 1, 1, '#c0392b'); });
      } else if (d[2] === 'stairs') {
        var sx = d[0] - 26; R(sx, fy - 80, 52, 80, '#120c26'); for (var s = 0; s < 7; s++) R(sx + s * 7, fy - 12 - s * 10, 52 - s * 7, 3, '#2e2352');
        R(sx - 4, fy - 62, 60, 3, '#8c7fae'); R(sx - 4, fy - 34, 60, 3, '#8c7fae'); line(x, sx, fy - 70, sx + 52, fy - 20); line(x, sx + 52, fy - 70, sx, fy - 20);
        R(sx + 4, fy - 92, 44, 9, '#e9e0ff'); ptext(x, d[1], sx + 26 - d[1].length * 2, fy - 90, INK);
      } else if (d[2] === 'lab') door(d[0], d[1], true);
      else door(d[0], d[1]);
    });
    // the end of the corridor
    var ex = len - 40;
    if (L.end === 'final') {
      var cx0 = len - 150; R(cx0 - 8, top - 4, 158, fy - top + 4, '#120c26');
      for (i = 0; i < 140; i++) R(cx0 + i, top + 14, 1, fy - top - 14, i % 10 < 4 ? '#5c1d3a' : i % 10 < 7 ? '#4a1630' : '#3a1026');
      R(cx0 - 4, top + 3, 150, 12, '#6b2140'); for (i = 0; i < 150; i += 8) R(cx0 - 4 + i, top + 14, 5, 3, '#6b2140');
      R(cx0 - 4, top + 3, 150, 1, '#fbc75a'); R(cx0 - 4, top + 15, 150, 1, '#eb9a12'); R(cx0 - 8, fy - 5, 158, 5, '#3a2b62');
    } else if (L.end === 'stairs') {
      R(ex - 30, fy - 92, 70, 92, '#120c26'); for (var t2 = 0; t2 < 8; t2++) R(ex - 30 + t2 * 8, fy - 10 - t2 * 11, 70 - t2 * 8, 3, '#3a2b62');
      R(ex - 22, fy - 104, 44, 9, '#e9e0ff'); ptext(x, 'STAIRS 2', ex - 16, fy - 102, INK);
    } else if (L.end === 'entrance') {
      R(ex - 30, fy - 84, 60, 84, '#3a2b62'); R(ex - 27, fy - 81, 26, 81, '#4a3470'); R(ex + 1, fy - 81, 26, 81, '#4a3470'); R(ex - 20, fy - 70, 12, 22, '#120c26'); R(ex + 8, fy - 70, 12, 22, '#120c26');
      R(ex - 26, fy - 96, 52, 9, '#e9e0ff'); ptext(x, 'FLOOR 3', ex - 14, fy - 94, INK);
    } else { R(len - 60, top, 60, fy - top, '#120c26'); for (i = 0; i < 60; i += 4) R(len - 60 + i, top, 2, fy - top, '#16102c'); }
    return c;
    function door(dx, label, lab) {
      var w = lab ? 52 : 40, l = dx - w / 2;
      R(l, fy - 72, w, 72, '#3a2b62'); R(l + 3, fy - 69, w - 6, 69, '#4a3470'); R(l + 3, fy - 69, 1, 69, '#563d80');
      if (lab) { R(l + w / 2 - 1, fy - 69, 2, 69, '#3a2b62'); R(l + 8, fy - 60, 12, 16, '#120c26'); R(l + w - 20, fy - 60, 12, 16, '#120c26'); }
      else { R(l + 8, fy - 62, 13, 18, '#120c26'); R(l + 9, fy - 61, 4, 6, '#2a2350'); R(l + w - 10, fy - 36, 3, 3, '#fbc75a'); }
      var pw = Math.max(20, label.length * 4 + 6); R(dx - pw / 2, fy - 84, pw, 9, '#e9e0ff'); R(dx - pw / 2, fy - 76, pw, 1, '#9d8cc4');
      ptext(x, label, Math.round(dx - label.length * 2 + 1), fy - 82, INK);
    }
  }

  // ---- Stroke recognition: —, |, V, Λ, ○ --------------------------------
  function recog(pts) {
    var n = pts.length, i; if (n < 3) return null;
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, cum = [0];
    for (i = 0; i < n; i++) {
      var p = pts[i]; minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y);
      if (i) cum.push(cum[i - 1] + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y));
    }
    var w = maxx - minx, h = maxy - miny, sz = Math.max(w, h), len = cum[n - 1];
    if (sz < 22) return null;
    var a = pts[0], b = pts[n - 1], gap = Math.hypot(b.x - a.x, b.y - a.y), dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    if (gap < sz * .45 && len > sz * 2.2 && w > h * .45 && h > w * .45) return 'o';
    if (gap / len > .82) { if (dx > dy * 1.7) return 'h'; if (dy > dx * 1.7) return 'v'; return null; }
    var lo = 0, hi = 0;
    for (i = 0; i < n; i++) { if (pts[i].y > pts[lo].y) lo = i; if (pts[i].y < pts[hi].y) hi = i; }
    var mid = function (k) { var f = cum[k] / len; return f > .2 && f < .8; };
    if (w > h * .3) {
      if (mid(lo) && pts[lo].y - a.y > h * .5 && pts[lo].y - b.y > h * .5) return 'V';
      if (mid(hi) && a.y - pts[hi].y > h * .5 && b.y - pts[hi].y > h * .5) return 'A';
    }
    if (gap / len > .65) { if (dx > dy * 2.2) return 'h'; if (dy > dx * 2.2) return 'v'; }
    return null;
  }
  function glyphPath(g, cx, cy, r, k) {
    var P = [], n = 24, i;
    for (i = 0; i <= n * k; i++) {
      var u = i / n, p;
      if (g === 'h') p = [cx - r + 2 * r * u, cy];
      else if (g === 'v') p = [cx, cy - r + 2 * r * u];
      else if (g === 'V') p = u < .5 ? [cx - r + r * u * 2, cy - r + 2 * r * u * 2] : [cx + r * (u - .5) * 2, cy + r - 2 * r * (u - .5) * 2];
      else if (g === 'A') p = u < .5 ? [cx - r + r * u * 2, cy + r - 2 * r * u * 2] : [cx + r * (u - .5) * 2, cy - r + 2 * r * (u - .5) * 2];
      else p = [cx + Math.sin(u * 6.283) * r, cy - Math.cos(u * 6.283) * r];
      P.push({ x: p[0], y: p[1] });
    }
    return P;
  }

  // ---- The engine -----------------------------------------------------------
  class Zone {
    constructor(canvas, opt) {
      this.c = canvas; this.x = canvas.getContext('2d'); this.o = opt || {}; this.demo = !!this.o.demo;
      this.A = art(); this.lc = cnv(2, 2); this.lx = this.lc.getContext('2d'); this.wc = cnv(2, 2);
      this.girl = !!this.o.girl; this.W = this.H = 0; this.in = { l: 0, r: 0, up: 0 };
      this.fog = []; for (var i = 0; i < 8; i++) this.fog.push({ x: rnd(0, 700), y: rnd(-.3, .5), r: rnd(40, 90), s: rnd(2, 6) });
      this.run = { maxHp: 6, upg: { lan: 0, heart: 0, calm: 0, steady: 0, ward: 0, quick: 0 }, shards: 0, score: 0, time: 0, weapon: 'lantern' };
      this.lv = 0; this.t = 0;
      this.startLevel(0);
    }
    // Start (or restart) corridor n with the run's current upgrades.
    startLevel(n) {
      this.lv = n; this.L = this.demo ? null : LEVELS[n]; this.lvId = (this.lvId || 0) + 1;
      var r = this.run;
      this.maxHp = 6 + r.upg.heart * 2; this.hp = this.maxHp; this.ward = r.upg.ward ? 1 : 0;
      this.px = this.demo ? 0 : 40; this.face = 1; this.camX = 0; this.walkD = 0; this.moving = false;
      this.inv = 0; this.shake = 0; this.castT = 0; this.flashG = null; this.flashT = 0; this.tension = 0;
      this.en = []; this.parts = []; this.bolts = []; this.texts = []; this.trail = []; this.trailLife = 0; this.proj = []; this.puddles = []; this.embers = []; this.rubble = []; this.overT = 0;
      this.queue = []; this.ti = 0; this.tipi = 0; this.tSpawn = null; this.ev = 0; this.searchT = 0; this.near = null; this.gateA = 1; this.gateMsg = 0;
      this.phase = this.demo ? 'demo' : 'explore'; this.arena = null; this.light = 1; this.lights = null; this.lc3 = null; this.boss = null; this.exitSaid = false;
      this.demoT = 1.2; this.demoDraw = null;
      this.sk = 0; this.mana = 0; this.flare = 0; this.yo = null; this.lost = []; this.candy = 2;
      this.oil = 100; this.beaming = false; this.wall = null; this.slowT = 0; this.combo = 0; this.comboT = 0; this._lpx = null; this.stepD = 0;
      if (this.L) {
        var L = this.L, pickEv = shuffle(L.ev.slice()).slice(0, 3);
        this.doors = L.doors.map(function (d, i) { return { x: d[0], label: d[1], kind: d[2], ev: pickEv.indexOf(i) >= 0, done: d[2] === 'stairs' }; });
        this.hideAt = shuffle(this.doors.filter(function (d) { return !d.ev && !d.done && d.kind !== 'board'; })).slice(0, this.lv < 2 ? 1 : 2); this.hidPut = false;
      } else this.doors = [];
      if (this.W) this._layout();
    }
    resize(W, H) {
      this.W = W; this.H = H; this.c.width = W; this.c.height = H; this.lc.width = W; this.lc.height = H; this.wc.width = W; this.wc.height = H;
      var oldF = this.fy;
      this.fy = Math.min(H - 16 - (this.padB || 0), Math.round(H * .5 + 72));
      if (oldF != null) { var d = this.fy - oldF; this.en.forEach(function (e) { e.y += d; e.ty += d; }); }
      this._layout(); this.draw();
    }
    _layout() {
      this.len = this.demo ? this.W + 4 : this.L.len;
      this.bg = buildBG(this.L, this.H, this.fy, this.demo ? this.len : 0);
      this.lamps = []; for (var i = 40, k = 0; i < this.len; i += 110, k++) this.lamps.push({ x: i, k: k % 4 === 2 ? 'dead' : k % 3 === 1 ? 'flicker' : 'on', ph: rnd(0, 9) });
      if (this.demo) this.px = Math.round(this.W * .3);
      this._cam(true);
      if (this.hd && !this.demo) this.hd.setLevel(this);
    }
    get top() { return this.fy - WALL; }
    get range() { return (96 + this.run.upg.lan * 22) * this.light * (this.lc3 && this.lc3.st === 'off' ? .4 : 1) * (this.run.weapon === 'yoyo' ? .8 : 1) * (this.beaming ? 1.8 : 1); }
    _cam(snap) {
      var W = this.W, lo = 0, hi = Math.max(0, this.len - W);
      if (this.arena) { lo = this.arena.x0 - 10; hi = Math.max(lo, this.arena.x1 + 30 - W); }
      var target = clamp(this.px - W * .5 + this.face * W * .16, lo, hi);
      this.camX = snap ? target : this.camX + (target - this.camX) * Math.min(1, (this.dtLast || .016) * 4);
      this.camX = clamp(this.camX, lo, hi); this.cam = Math.round(this.camX);
    }
    // Poses beyond idle/walk/cast only exist in the real sheets; the placeholders fall back to cast or idle.
    pose() {
      var set = this.girl ? this.A.girl : this.A.boy;
      var p = this.phase === 'over' ? 'hurt' : this.phase === 'done' ? 'win' : this.inv > 1.05 ? 'hurt' : this.searchT > 0 ? 'search' : this.beaming ? 'beam' : this.yo ? 'yoyo' : this.castT > 0 ? (this.run && this.run.weapon === 'wand' ? 'wand' : 'cast') : this.moving ? 'walk' : 'idle';
      if (set[p]) return p;
      if (p === 'wand') return 'cast';
      if (p === 'beam' || p === 'yoyo') return this.moving ? 'walk' : 'idle';
      return p === 'search' ? 'cast' : 'idle';
    }
    frame(pose) {
      if (pose === 'walk') return (this.walkD / 7 | 0) % 4;
      if (pose === 'idle') return (this.t * 1.6 | 0) % 2;
      if (pose === 'cast') return this.castT > .22 ? 0 : 1;
      if (pose === 'beam') return reduce ? 0 : (this.t * 6 | 0) % 2;
      if (pose === 'wand') return Math.min(3, (1 - this.castT / .3) * 4 | 0);
      if (pose === 'yoyo') return Math.min(3, (1 - this.yo.t / .34) * 5 | 0);
      if (pose === 'search') return (this.t * 4 | 0) % 2;
      if (pose === 'hurt') return this.phase === 'over' ? Math.min(3, (this.t - (this.overT || this.t)) * 5 | 0) : 0;
      if (pose === 'win') return Math.min(1, (this.t * 2 | 0) % 3);
      return 0;
    }
    spr() { var set = this.girl ? this.A.girl : this.A.boy, pose = this.pose(), arr = set[pose] || set.idle; return arr[this.frame(pose) % arr.length]; }
    lantern() {
      var img = this.spr();
      if (img && img.lan) return [this.px + this.face * (img.lan[0] - img.width / 2), this.fy + 2 - img.height + img.lan[1]];
      var pose = this.pose(), f = this.frame(pose), hp = hand(pose, f);
      return [this.px + this.face * (hp[0] - 18), this.fy + 2 - 52 + hp[1] + 4];
    }
    watched(e) { var d = (e.x - this.px) * this.face; return d > -8 && d < this.range + (e.hr || 10); }

    // ---- spawning
    // Variants unlock floor by floor. v forces a variant (twin partners and revivals).
    spawn(type, side, gl, v) {
      var W = this.W, fy = this.fy, D = DEF[type] || {}, e = { type: type, gl: (gl || '').split(''), t: 0, a: 0, hit: 0, ph: rnd(0, 6), drop: false, hr: D.hr || 12, spd: (D.spd || 10) * (1 + this.lv * .1) };
      var lo = this.cam, hi = this.cam + W, lv = this.L ? this.lv : 0;
      if (type === 't') e.v = v || pick([['lost'], ['lost', 'burden'], ['lost', 'burden', 'echo'], ['lost', 'burden', 'echo']][lv]);
      if (type === 'g') e.v = v !== undefined ? v : pick([[null], [null, 'shade'], [null, 'shade', 'wrath'], [null, 'shade', 'wrath', 'twin']][lv]);
      if (type === 'a') {
        e.y = e.ty = fy; e.crack = 0; e.a = 1;
        e.x = side === 'L' ? Math.max(lo - 20, this.px - this.range - 50) : this.px + Math.max(this.range + 40, 80);
        if (side === 'L' && this.face < 0) e.x = this.px + Math.max(this.range + 40, 80);
      } else if (type === 't') {
        e.ty = fy - 2; e.y = e.ty; e.x = side === 'L' ? lo - 16 : hi + 16; e.dir = side === 'L' ? 1 : -1;
      } else {
        e.ty = type === 'w' ? fy - rnd(24, 52) : fy - rnd(30, 64);
        if (side === 'L') { e.x = Math.max(lo - 10, this.px - 120); e.spd *= .8; }
        else if (side === 'T') { e.x = this.px + rnd(50, 100) * (Math.random() < .5 ? -1 : 1); e.drop = true; }
        else e.x = Math.min(hi + 10, this.px + 170);
        e.y = side === 'T' ? this.top - 8 : e.ty;
      }
      if (this.arena) e.x = clamp(e.x, this.arena.x0 + 6, this.arena.x1 + 20);
      if (e.v === 'wrath') e.ct = 1.6;
      this.en.push(e);
      if (e.v === 'twin' && v === undefined) { var m = this.spawn('g', side, this._syms(Math.max(1, e.gl.length)), 'twin'); m.x = e.x + (side === 'L' ? -30 : 30); m.ty = e.ty - 14; if (!m.drop) m.y = m.ty; e.mate = m; m.mate = e; m.tw = 1; }
      this.o.onSeen && this.o.onSeen(VK(e)); return e;
    }
    _pool() { return this.L ? this.L.pool : 'hvVAo'; }
    _syms(n) { var s = '', p = this._pool(); for (var i = 0; i < n; i++) s += pick(p); return s; }

    // ---- casting
    cast(g) {
      if (this.phase === 'over' || this.phase === 'done') return false;
      if (this.searchT > 0) this.searchT = 0;
      if (this.boss && this.boss.type === 'M' && this.boss.ws === 2) this._whistled();
      if (g && this.tension >= 1 && Math.random() < .35 - this.run.upg.steady * .14) g = null;
      if (!g) { this._fizz(); return false; }
      var self = this, L = this.lantern(), hits = this.en.filter(function (e) { return !e.dead && (e.a > .4 || (e.type === 't' && e.door)) && e.gl.length && e.gl[0] === g && e.x > self.cam - 6 && e.x < self.cam + self.W + 6 && !(e.type === 't' && e.door && !e.seen); });
      this.flashG = g; this.flashT = .45; this.castT = .3;
      var wand = this.run.weapon === 'wand';
      if (wand && hits.length) this.mana = Math.min(5, this.mana + hits.length * .5);
      var killed = [];
      hits.forEach(function (e) {
        e.gl.shift(); e.hit = .16; self.run.score += 10;
        self.bolts.push({ x1: L[0], y1: L[1], x2: e.x, y2: e.y - (e.type === 'M' || e.type === 'F' ? 30 : 6), life: .18, col: self.run.weapon === 'wand' ? '#cdb6f2' : null });
        if (e.type === 'M') { self.shake = Math.max(self.shake, .15); if (e.gl.length === 7 || e.gl.length === 4) { self.spawn('w', 'T', self._syms(1)); self.spawn('w', 'R', self._syms(1)); } }
        if (!e.gl.length) killed.push(e);
      });
      killed.forEach(function (e) { self._defeat(e, killed.length); });
      var spelled = wand && this._spell(g);
      if (!hits.length && !spelled) { this._fizz(); return false; }
      return true;
    }
    _bounds() { var lo = 14, hi = this.len - 20; if (this.arena) { lo = this.arena.x0 + 8; hi = this.arena.x1 + (this.phase === 'cleared' ? 30 : 0); } if (this.phase === 'explore' && this.ev < 3) hi = Math.min(hi, this.L.gate - 12); return [lo, hi]; }
    // Wand: every drawn symbol is also a spell, paid for in mana.
    _spell(g) {
      var c = SPELL[g], self = this; if (!c || this.mana < c[0]) return false;
      this.mana -= c[0];
      if (g === 'h') {
        var tg = this.en.filter(function (e) { var d = (e.x - self.px) * self.face; return !e.dead && e.wait == null && e.gl.length && e.a > .4 && !(e.type === 't' && e.door) && d > -6 && d < 220; }).sort(function (a, b) { return Math.abs(a.x - self.px) - Math.abs(b.x - self.px); })[0], L = this.lantern();
        if (tg) { this.bolts.push({ x1: L[0], y1: L[1], x2: tg.x, y2: tg.y - 6, life: .25, col: '#cdb6f2' }); this._strip([tg]); }
      }
      else if (g === 'v') this.wall = { x: this.px + this.face * 34, t: 4 };
      else if (g === 'V') this.slowT = 3;
      else if (g === 'A') { var b = this._bounds(), ox = this.px; this.px = clamp(this.px + this.face * 64, b[0], b[1]); this._lpx = this.px; this.inv = Math.max(this.inv, .45); this._burst(ox, this.fy - 24, 12, ['#cdb6f2', '#efe8ff']); this._burst(this.px, this.fy - 24, 12, ['#cdb6f2', '#efe8ff']); }
      else if (g === 'o') this.ward = 1;
      this.texts.push({ x: this.px, y: this.fy - 66, s: c[1], life: 1 });
      return true;
    }
    // The weapon skill (Space or the ✦ button). Lantern: Flare. Wand: Starfall, once mana is full. Yiu yiu: Throw.
    skill() {
      if (this.demo || this.phase === 'over' || this.phase === 'done' || this.phase === 'freed') return;
      var self = this, w = this.run.weapon || 'lantern';
      var vis = function (e) { return !e.dead && e.wait == null && e.x > self.cam - 6 && e.x < self.cam + self.W + 6 && !(e.type === 't' && e.door && !e.seen); };
      var inFront = function (e, r) { var d = (e.x - self.px) * self.face; return d > -6 && d < r; };
      if (w === 'wand') {
        if (this.mana < 5) { this._fizz(); return; }
        this.mana = 0; this.castT = .3; this.shake = .25;
        var list = this.en.filter(function (e) { return vis(e) && e.gl.length && e.a > .4; });
        list.forEach(function (e) { self.bolts.push({ x1: e.x + rnd(-30, 30), y1: self.top - 30, x2: e.x, y2: e.y - 6, life: .3, col: '#cdb6f2' }); });
        this._strip(list); return;
      }
      if (w === 'lantern') return; // the lantern's beam is held (in.sk), not triggered
      if (this.sk > 0) { this._fizz(); return; }
      // yiu yiu: quick hits chain into a combo that strips up to three symbols at once
      this.sk = .55; this.castT = .25;
      var tg = this.en.filter(function (e) { return vis(e) && inFront(e, 92) && (e.type === 'a' || e.gl.length); }).sort(function (a, b) { return Math.abs(a.x - self.px) - Math.abs(b.x - self.px); })[0];
      this.yo = { tx: tg ? tg.x : this.px + this.face * 80, ty: tg ? tg.y - (tg.type === 'a' ? 30 : 6) : null, t: .34 };
      if (!tg) { this.combo = 0; return; }
      this.combo = this.comboT > 0 ? Math.min(3, this.combo + 1) : 1; this.comboT = 1.4;
      if (this.combo > 1) this.texts.push({ x: tg.x, y: tg.y - 44, s: 'x' + this.combo, life: .8 });
      if (tg.type === 'a') { tg.x += this.face * (26 + this.combo * 10); tg.stun = 1; this._burst(tg.x, tg.y - 30, 8, ['#a7a5b6']); return; }
      if (tg.type === 't') { tg.stun = 1.5; tg.charge = false; }
      for (var i = 0; i < this.combo; i++) this._strip([tg]);
    }
    _strip(list) {
      var self = this, killed = [];
      list.forEach(function (e) { if (!e.gl.length) return; e.gl.shift(); e.hit = .16; self.run.score += 10; if (!e.gl.length) killed.push(e); });
      killed.forEach(function (e) { self._defeat(e, killed.length); });
    }
    // A battle ended (see Battle): reward, and clear the enemy from the corridor.
    endBattle(k, e, how) {
      var T = TXc(this);
      if (how !== 'free' && k !== 'F') this._unpeace(k === 't' ? 't' : 'b');
      if (k === 'F') { e.wait = null; e.inBattle = false; e.freed = true; e.freedT = this.t; e.gl = []; this.light = 1; this.run.shards += 25; this.run.score += 1500; this._burst(e.x, e.y - 40, 70, ['#fff4dc', '#fbc75a', '#efe8ff']); this._bossDown(e); return; }
      this.inv = Math.max(this.inv, 1.6); e.dead = true; e.inBattle = false;
      if (k === 't') {
        this.run.shards += how === 'free' ? 5 : DEF.t.sh; this.run.score += how === 'free' ? 250 : DEF.t.pts;
        this.tension = how === 'free' ? 0 : Math.max(0, this.tension - .3);
        this._burst(e.x, e.y - 20, 16, ['#a9c4d6', '#efe8ff']);
        if (how === 'free' && this.lost.length) { var d = this.lost.pop(); if (!d.done) { d.done = true; this.ev++; this.gateA = 1; if (this.ev >= 3) this.o.onBanner && this.o.onBanner(T.gateOpen); } }
        return;
      }
      this._burst(e.x, e.y - 40, 60, how === 'free' ? ['#fff4dc', '#fbc75a', '#efe8ff'] : ['#efe8ff', '#cdb6f2', '#5a3f96']);
      if (how === 'free') { this.run.shards += 10; this.run.score += 500; }
      this._bossDown(e);
    }
    _unpeace(why) { if (this.run.peace === false || this.demo) return; this.run.peace = false; this.o.onPeaceLost && this.o.onPeaceLost(why); }
    _defeat(e, combo) {
      var self = this, D = DEF[e.type];
      if (e.type === 'X') {
        this._burst(e.x, e.y, 18, ['#7fd36b', '#c9f29b', '#3f8a3a']);
        if (e.size > 1) [-1, 1].forEach(function (s) { var c = self._blob(e.size - 1, e.x + s * 14); c.vx = s * 40; });
        e.dead = true; this._unpeace('b'); this.run.shards += 1; this.run.score += 150;
        if (!this.en.some(function (o) { return o.type === 'X' && !o.dead; })) this._bossDown(e);
        return;
      }
      if (e.type === 'M') { this._unpeace('b'); e.dead = true; this._burst(e.x, e.y - 30, 60, ['#efe8ff', '#cdb6f2', '#fbc75a']); this._bossDown(e); return; }
      if (e.type === 'F') {
        e.fph++; this.shake = .6; this._burst(e.x, e.y - 40, 40, ['#140d2a', '#5a3f96', '#fbc75a']);
        if (e.fph === 2) { e.gl = this._syms(8).split(''); this.o.onBanner && this.o.onBanner(TXc(this).phase[1]); }
        else if (e.fph === 3) { e.gl = 'hvVAo'.split(''); this.light = 1; this.embers = []; this.en.forEach(function (o) { if (o !== e) { o.dead = true; self._burst(o.x, o.y - 10, 10, ['#5a3f96']); } }); this.o.onBanner && this.o.onBanner(TXc(this).phase[2]); }
        else { e.freed = true; e.freedT = this.t; e.gl = []; this._burst(e.x, e.y - 40, 70, ['#fff4dc', '#fbc75a', '#efe8ff']); this._bossDown(e); }
        return;
      }
      var pts = D.pts * combo; e.dead = true;
      if (e.v === 'twin') { if (e.mate && !e.mate.dead) { if (!e.mate.rev) e.mate.rev = { t: 3, x: e.x, ty: e.ty }; } else { this.run.shards += 2; this.texts.push({ x: e.x, y: e.y - 26, s: 'PAIR', life: 1.2 }); } e.rev = null; }
      this.run.score += pts; this.run.shards += D.sh;
      if (e.type === 't') { this._unpeace('ts'); this.tension = Math.max(0, this.tension - .2); if (e.door) { e.door.poss = null; e.door = null; } }
      this.texts.push({ x: e.x, y: e.y - 14, s: '+' + D.sh, sh: 1, life: 1 });
      this._burst(e.x, e.y - (e.type === 't' ? 20 : 0), 16, e.type === 'w' ? ['#fbc75a', '#f39a4a'] : e.type === 't' ? ['#a9c4d6', '#efe8ff'] : ['#efe8ff', '#cdb6f2', '#b490ef']);
    }
    _bossDown(e) {
      var self = this;
      this.boss = null; this.phase = 'cleared'; this.shake = .5; this.run.shards += 15; this.run.score += 1000;
      this.lc3 = null; this.light = 1; this.proj = []; this.puddles = []; this.queue = [];
      this.en.forEach(function (o) { if (!o.dead && o !== e) { o.dead = true; self._burst(o.x, o.y - 8, 10, ['#cdb6f2', '#5a3f96']); } });
      this.texts.push({ x: e.x, y: e.y - 50, s: '+15', sh: 1, life: 1.6 });
      if (this.L && this.L.boss === 'F') { this.phase = 'freed'; setTimeout(function () { self.o.onFreed && self.o.onFreed(); }, 1400); }
      else { this.arena.x1 = this.len - 40; this.o.onBossDown && this.o.onBossDown(); }
    }
    _fizz() { var L = this.lantern(); this._burst(L[0], L[1] - 4, 5, ['#8c7fae']); }
    _burst(x, y, n, cols) {
      if (reduce) n = Math.ceil(n / 3);
      for (var i = 0; i < n; i++) { var a = rnd(0, 6.28), s = rnd(14, 52); this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 12, life: rnd(.35, .85), col: pick(cols) }); }
    }
    hurt(n, e) {
      if (this.inv > 0 || this.demo || n <= 0 || this.phase === 'over') return;
      this.shake = .35;
      if (this.ward) { this.ward = 0; this.inv = 1; this._burst(this.px, this.fy - 26, 18, ['#fbc75a', '#fff4dc']); return; }
      this.hp -= n; this.inv = 1.4;
      this._burst(this.px, this.fy - 24, 12, ['#f39a4a', '#eceaf6']);
      if (this.hp <= 0) { this.hp = 0; this.overT = this.t; this.phase = 'over'; this.o.onOver && this.o.onOver(); }
    }
    _whistled() { var b = this.boss; if (!b || b.pen) return; b.pen = true; this.hurt(1); b.gl.push(pick(this._pool()), pick(this._pool())); this.texts.push({ x: b.x, y: b.y - 74, s: '!', life: 1 }); }

    // Perished Travellers come in three kinds:
    // lost: can't bear to be seen; in your light it turns and charges, in the dark it wanders.
    // echo: walks when you walk (a little faster) and stops when you stop.
    // burden: heads for an unsearched door and possesses it, posing as evidence.
    // Touching any of them starts a battle.
    _trav(e, dt, ad) {
      var self = this, free = this.o.onBattle && this.inv <= 0 && !e.inBattle && (this.phase === 'explore' || this.phase === 'cleared');
      if (e.door) { e.seen = this.watched(e); return; }
      if (e.stun > 0) { e.stun -= dt; return; }
      var toP = this.px > e.x ? 1 : -1;
      if (e.v === 'echo') e.x += toP * Math.min(ad, this.stepD * 1.6 + 6 * dt);
      else if (e.v === 'lost') {
        var lit = this.watched(e);
        e.lit = lit ? (e.lit || 0) + dt : Math.max(0, (e.lit || 0) - dt * .5);
        if (!e.charge && e.lit > .28) { e.charge = true; e.cool = 0; this.texts.push({ x: e.x, y: e.y - 62, s: '!', life: .8 }); this._burst(e.x, e.y - 30, 10, ['#f0566a', '#a9c4d6']); }
        if (e.charge) { e.cool = lit ? 0 : e.cool + dt; if (e.cool > 2.4) e.charge = false; e.x += toP * 122 * dt; if (lit) this.tension = Math.min(1, this.tension + dt * .3); }
        else { e.wt = (e.wt == null ? rnd(1.5, 3) : e.wt) - dt; if (e.wt <= 0) { e.wt = rnd(1.2, 2.6); e.wd = Math.random() < .75 ? toP : -toP; } e.x = clamp(e.x + ((e.wd || toP) * e.spd + Math.sin(e.t * 1.3 + e.ph) * 10) * dt, 20, this.len - 20); }
      } else {
        e.bt = (e.bt == null ? rnd(.8, 1.5) : e.bt) - dt;
        if (this.phase === 'explore' && !e.goal) {
          var opts = this.doors.filter(function (d) { return !d.done && !d.poss && d.kind !== 'stairs' && Math.abs(d.x - self.px) < 420 && Math.abs(d.x - self.px) > 30; });
          if (opts.length) e.goal = opts.sort(function (a, b) { return Math.abs(a.x - e.x) - Math.abs(b.x - e.x); })[0];
        }
        if (e.goal && (e.goal.done || e.goal.poss)) e.goal = null;
        var tx = e.goal ? e.goal.x : this.px, dirT = tx > e.x ? 1 : -1;
        e.x += (dirT * e.spd + Math.sin(e.t * 1.3 + e.ph) * 14) * dt;
        if (e.bt <= 0) { e.bt = rnd(.9, 1.8); this._burst(e.x, e.y - 22, 8, ['#a9c4d6', '#5d7891']); e.x += dirT * rnd(40, 80) + rnd(-18, 18); e.a = .2; }
        if (e.goal && Math.abs(e.goal.x - e.x) < 12) {
          e.door = e.goal; e.goal = null; e.door.poss = e; e.x = e.door.x; e.y = this.fy;
          this._burst(e.x, this.fy - 40, 12, ['#a9c4d6', '#2c3a4c']);
          if (!this.tipPoss) { this.tipPoss = true; this.o.onTip && this.o.onTip('tipTension'); }
          return;
        }
      }
      if (ad < e.hr && free) { e.inBattle = true; e.a = 1; this.o.onBattle('t', e, !!e.charge || e.v === 'echo'); return; }
      if (ad < e.hr) { this.tension = Math.min(1, this.tension + .25); this._burst(e.x, e.y - 20, 10, ['#a9c4d6', '#2c3a4c']); e.x += (e.x > this.px ? 1 : -1) * 70; e.a = .2; }
    }
    // Searching a possessed door: the traveller lunges out and takes a piece of evidence.
    _sprung(d) {
      var e = d.poss; d.poss = null; if (!e) return;
      e.door = null; e.goal = null; e.a = 1; e.x = d.x + (this.px > d.x ? -30 : 30); e.bt = .9;
      this.tension = Math.min(1, this.tension + .45); this.shake = .45; this._burst(d.x, this.fy - 40, 24, ['#a9c4d6', '#efe8ff', '#2c3a4c']);
      this.o.onBanner && this.o.onBanner(TXc(this).possessed);
      if (this.ev > 0 && !e.hid) {
        this.ev--; var back = this.doors.filter(function (o) { return o.ev && o.done; }); if (back.length) { var bd = pick(back); bd.done = false; this.lost.push(bd); }
        this.gateA = 1; this.o.onStolen && this.o.onStolen();
      }
      if (this.o.onBattle && this.phase !== 'boss') { e.inBattle = true; this.o.onBattle('t', e, true); }
    }

    // ---- bosses
    _blob(size, x) {
      var e = { type: 'X', size: size, r: [0, 9, 14, 22][size], x: x, y: this.fy, ty: this.fy, gl: this._syms([0, 2, 3, 4][size]).split(''), t: 0, a: 1, hit: 0, ph: rnd(0, 6), hr: [0, 9, 14, 20][size], spd: [0, 18, 13, 8][size], ft: rnd(2, 4), vx: 0 };
      this.en.push(e); return e;
    }
    _startBoss() {
      var L = this.L, x0 = L.gate, x1 = L.len - 40, cx = Math.min(x1 - 30, x0 + Math.max(160, this.W * .7)), e;
      this.arena = { x0: x0, x1: x1 }; this.phase = 'boss';
      if (L.boss === 'X') e = this._blob(3, cx);
      else if (L.boss === 'M') { e = { type: 'M', x: cx, y: this.fy - 8, ty: this.fy - 8, gl: this._syms(10).split(''), max: 10, t: 0, a: 0, hit: 0, ph: 0, hr: 30, spd: 9, wt: 3.5, ws: 0 }; this.en.push(e); }
      else if (L.boss === 'Q') { e = { type: 'Q', x: cx, y: this.fy, ty: this.fy, gl: [], t: 0, a: 1, hit: 0, ph: 0, hr: 30, cracks: 0, g: 0, spd: 60 }; this.en.push(e); }
      else { e = { type: 'F', x: x1 - 50, y: this.fy - 6, ty: this.fy - 6, gl: this._syms(6).split(''), t: 0, a: 0, hit: 0, ph: 0, hr: 30, fph: 1, et: 1.5, st: 4 }; this.en.push(e); }
      this.boss = e;
      if (this.o.onBattle) { e.wait = 1; e.a = 1; e.x = Math.min(cx, this.px + Math.max(110, this.W * .32)); }
      this.o.onBanner && this.o.onBanner(TXc(this).bosses['XMQF'.indexOf(L.boss)]);
      if (L.boss === 'F' && !this.o.onBattle) { var self = this; setTimeout(function () { self.o.onBanner && self.o.onBanner(TXc(self).phase[0]); }, 1900); }
    }

    // ---- simulation
    update(dt) {
      this.t += dt; this.dtLast = dt;
      var self = this, ph = this.phase;
      if (ph === 'demo') { this._demo(dt); this._tick(dt); return; }
      if (ph === 'over' || ph === 'done') { this._tick(dt); return; }
      this.run.time += dt;
      this.castT = Math.max(0, this.castT - dt); this.flashT = Math.max(0, this.flashT - dt); this.inv = Math.max(0, this.inv - dt); this.shake = Math.max(0, this.shake - dt);
      this.sk = Math.max(0, this.sk - dt); this.flare = Math.max(0, this.flare - dt); if (this.yo && (this.yo.t -= dt) <= 0) this.yo = null;
      this.comboT = Math.max(0, this.comboT - dt); this.slowT = Math.max(0, this.slowT - dt); if (this.wall && (this.wall.t -= dt) <= 0) this.wall = null;
      var wpn = this.run.weapon || 'lantern';
      if (wpn === 'wand') this.mana = Math.min(5, this.mana + dt * .4);
      if (wpn === 'lantern') { this.beaming = !!this.in.sk && ph !== 'freed' && this.oil > (this.beaming ? 0 : 20); this.oil = this.beaming ? Math.max(0, this.oil - dt * 30) : Math.min(100, this.oil + dt * 16); } else this.beaming = false;
      // walking and turning
      var dir = (this.in.r ? 1 : 0) - (this.in.l ? 1 : 0), lo = 14, hi = this.len - 20;
      if (this.arena) { lo = this.arena.x0 + 8; hi = this.arena.x1 + (ph === 'cleared' ? 30 : 0); }
      if (ph === 'explore' && this.ev < 3) hi = Math.min(hi, this.L.gate - 12);
      if (ph === 'freed') dir = 0;
      if (dir) {
        this.face = dir; this.searchT = 0;
        if (this.boss && this.boss.type === 'M' && this.boss.ws === 2) this._whistled();
        var nx = clamp(this.px + dir * 52 * dt, lo, hi);
        if (nx === this.px && ph === 'explore' && this.ev < 3 && dir > 0 && this.px >= this.L.gate - 13 && this.gateMsg <= 0) { this.gateMsg = 3; this.o.onBanner && this.o.onBanner(TXc(this).gate(3 - this.ev)); }
        this.walkD += Math.abs(nx - this.px); this.moving = nx !== this.px; this.px = nx;
      } else this.moving = false;
      this.gateMsg -= dt;
      // travellers hiding in doors (placed once the floor height is known)
      if (!this.hidPut && this.hideAt && this.fy && !this.demo) {
        this.hidPut = true; var zs = this;
        this.hideAt.forEach(function (d) { if (d.poss) return; var e = zs.spawn('t', 'R', zs._syms(zs.lv < 2 ? 2 : 3)); e.x = d.x; e.y = zs.fy; e.a = 1; e.door = d; e.hid = true; d.poss = e; });
      }
      // searching
      var near = null;
      if (ph === 'explore') this.doors.forEach(function (d) { if (!d.done && Math.abs(d.x - self.px) < 18) near = d; });
      if (near !== this.near) { this.near = near; this.o.onNear && this.o.onNear(!!near); }
      if (near && this.in.up && !dir) {
        if (this.boss && this.boss.ws === 2) this._whistled();
        this.searchT += dt * (1 + this.run.upg.quick * .45);
        if (this.searchT >= 1.5) {
          this.searchT = 0;
          if (near.poss) { this._sprung(near); }
          else if ((near.done = true) && near.ev) {
            this.ev++; this.run.shards += 4; this.run.score += 250; this._burst(near.x, this.fy - 40, 20, ['#fbc75a', '#fff4dc']);
            var idx = this.lv * 3 + Math.min(2, this.ev - 1), self2 = this;
            this.o.onNote && this.o.onNote(idx);
            if (this.ev >= 3) setTimeout(function () { self2.o.onBanner && self2.o.onBanner(TXc(self2).gateOpen); }, 400);
          } else { this.texts.push({ x: near.x, y: this.fy - 70, s: '...', life: 1 }); this.o.onEmpty && this.o.onEmpty(); }
          this.near = null; this.o.onNear && this.o.onNear(false);
        }
      } else if (!this.in.up) this.searchT = 0;
      // gate, triggers, tips
      if (ph === 'explore') {
        if (this.ev >= 3) this.gateA = Math.max(0, this.gateA - dt * 1.5);
        var L = this.L;
        while (this.ti < L.trig.length && this.px >= L.trig[this.ti][0]) {
          var tr = L.trig[this.ti++];
          for (var q = 1; q < tr.length; q++) this.queue.push({ at: this.t + tr[q][0], s: tr[q] });
        }
        if (L.tips) while (this.tipi < L.tips.length && this.px >= L.tips[this.tipi][0]) this.o.onTip && this.o.onTip(L.tips[this.tipi++][1]);
        this.tSpawn = (this.tSpawn == null ? 7 : this.tSpawn) - dt;
        if (this.tSpawn <= 0) {
          this.tSpawn = rnd(9, 14) - this.lv * 1.5;
          var tn = this.en.filter(function (o) { return o.type === 't' && !o.dead && !o.hid; }).length;
          if (tn < 1 + Math.min(2, this.lv) && this.px > 90 && this.px < L.gate - 60) this.spawn('t', Math.random() < .6 ? 'R' : 'L', this._syms(this.lv < 2 ? 2 : 3));
        }
        if (this.px > L.gate + 24 && this.ev >= 3) this._startBoss();
      }
      var angelUp = this.en.some(function (o) { return o.type === 'a' && !o.dead; });
      for (var i = this.queue.length - 1; i >= 0; i--) if (this.t >= this.queue[i].at) { if (this.queue[i].s[1] === 'a' && angelUp) { this.queue[i].at = this.t + 1.2; continue; } if (this.queue[i].s[1] === 'a') angelUp = true; var s = this.queue[i].s; this.queue.splice(i, 1); this.spawn(s[1], s[2], (s[3] || '').replace(/\?/g, function () { return pick(self._pool()); })); }
      if (ph === 'cleared' && this.px >= this.len - 44 && !this.exitSaid) { this.exitSaid = true; this.phase = 'done'; this.o.onLevelDone && this.o.onLevelDone(); }
      if (ph === 'cleared' && !this.exitHint) { this.exitHint = true; }
      // light cycle (Weeping Mother)
      if (this.lc3) {
        var c3 = this.lc3; c3.t += dt;
        var durs = { on: 3.6, warn: .9, off: 1.8 };
        if (c3.t >= durs[c3.st]) {
          c3.t = 0; c3.st = c3.st === 'on' ? 'warn' : c3.st === 'warn' ? 'off' : 'on';
          var Q = this.boss;
          if (c3.st === 'off' && Q) {
            // she reappears in the dark, but always at least 130px away, on whichever side has room
            if (Math.random() < .5) { var gap = rnd(130, 170), lx = this.px - gap, rx = this.px + gap, okL = lx >= this.arena.x0 + 20, okR = rx <= this.arena.x1; if (okL || okR) Q.x = okL && okR ? (Q.x > this.px ? lx : rx) : okL ? lx : rx; }
            this.o.onBanner && this.o.onBanner(TXc(this).lightsOut);
          }
          if (c3.st === 'on' && Q) { Q.g = 0; Q.cool = false; }
        }
      }
      // the final boss's darkness
      if (this.boss && this.boss.type === 'F' && this.boss.fph < 3 && this.boss.wait == null) {
        var F = this.boss;
        this.light = Math.max(.32, this.light - dt * .045);
        F.et -= dt; if (F.et <= 0) { F.et = 2.4; this.embers.push({ x: clamp(this.px + rnd(-70, 70), this.arena.x0 + 10, this.arena.x1), y: this.top + 4, life: 7 }); }
        F.st -= dt;
        if (F.st <= 0) {
          var mins = this.en.filter(function (o) { return o !== F && !o.dead; }).length;
          F.st = F.fph === 1 ? 5.5 : 3.8; F.castT = 1;
          var kind = F.fph === 1 ? 'w' : pick(['a', 't', 'g', 'w']); if (kind === 'a' && this.en.some(function (o) { return o.type === 'a' && !o.dead; })) kind = 'g';
          if (mins < (F.fph === 1 ? 2 : 4)) this.spawn(kind, Math.random() < .5 ? 'L' : 'R', this._syms(F.fph === 1 ? 1 : 2));
        }
      }
      this.embers.forEach(function (m) {
        m.y = Math.min(self.fy - 6, m.y + 34 * dt); m.life -= dt;
        if (Math.abs(m.x - self.px) < 12 && m.y > self.fy - 56) { m.life = 0; self.light = Math.min(1, self.light + .35); self._burst(m.x, m.y, 10, ['#fbc75a', '#fff4dc']); }
      });
      this.embers = this.embers.filter(function (m) { return m.life > 0; });
      // how far you walked this frame (the echo traveller copies it); the wand's Slow
      this.stepD = this._lpx == null ? 0 : Math.abs(this.px - this._lpx); this._lpx = this.px;
      var slowK = this.slowT > 0 ? .4 : 1;
      // enemies
      var near2 = 0;
      this.en.forEach(function (e) {
        if (e.dead) return;
        e.t += dt; e.a = Math.min(1, e.a + dt * 1.8); e.hit = Math.max(0, e.hit - dt);
        var d = self.px - e.x, dirE = d > 0 ? 1 : -1, ad = Math.abs(d);
        if (e.wait != null) { if (!e.inBattle) { e.wait -= dt; if (e.wait <= 0) { e.inBattle = true; self.o.onBattle(e.type, e); } } return; }
        if (e.type === 'a') {
          var seen = self.watched(e);
          e.seen = seen;
          if (seen) { e.crack += dt; if (e.crack >= 2.8 - self.run.upg.lan * .35) { e.dead = true; self.rubble.push({ x: e.x, life: 2.2, flip: e.x > self.px }); self.run.shards += DEF.a.sh; self.run.score += DEF.a.pts; self.texts.push({ x: e.x, y: e.y - 70, s: '+' + DEF.a.sh, sh: 1, life: 1 }); self._burst(e.x, e.y - 30, 30, ['#a7a5b6', '#85839a', '#5f5d74']); self.o.onAngel && self.o.onAngel(); } }
          else if (e.stun > 0) e.stun -= dt;
          else e.x += dirE * Math.min(ad, e.spd * dt * slowK);
          if (ad < e.hr + 6) { self.hurt(DEF.a.dmg); e.x -= dirE * 70; }
          return;
        }
        if (e.type === 'Q') {
          var on = self.lc3 && self.lc3.st !== 'off', seenQ = on && self.watched(e);
          e.seen = seenQ;
          if (seenQ && self.lc3.st === 'on' && !e.cool) { e.g += dt; if (e.g >= 1.4) { e.cracks++; e.cool = true; e.g = 0; e.hit = .3; self.shake = .4; self._burst(e.x, e.y - 60, 30, ['#a7a5b6', '#85839a']); e.x -= dirE * 30; if (e.cracks >= 3) { e.dead = true; self._burst(e.x, e.y - 50, 80, ['#a7a5b6', '#85839a', '#5f5d74', '#d9d7e4']); self._bossDown(e); } } }
          if (!seenQ) e.x += dirE * Math.min(ad, (self.lc3 && self.lc3.st === 'off' ? 38 : 26) * dt);
          if (ad < e.hr) { self.hurt(2); e.x -= dirE * 110; }
          e.x = clamp(e.x, self.arena.x0 + 10, self.arena.x1 + 20);
          return;
        }
        if (e.type === 'X') {
          e.x += (dirE * e.spd + e.vx) * dt; e.vx *= .92; e.x = clamp(e.x, self.arena.x0 + 10, self.arena.x1 + 20);
          if (e.size > 1) { e.ft -= dt; if (e.ft <= 0) { e.ft = rnd(3, 4.5) / (e.size === 3 ? 1 : .8); self.proj.push({ x: e.x, y: e.y - e.r * 2, vx: (self.px - e.x) / 1.1, vy: -70, k: 'flask' }); } }
          if (ad < e.hr) { self.hurt(1); e.x -= dirE * 30; }
          return;
        }
        if (e.type === 'M') {
          if (e.ws === 0) { e.wt -= dt; e.x += dirE * e.spd * dt; if (e.wt <= 0) { e.ws = 1; e.wt = .9; self.o.onFreeze && self.o.onFreeze(); } }
          else if (e.ws === 1) { e.wt -= dt; if (e.wt <= 0) { e.ws = 2; e.wt = 2.2; e.pen = false; } }
          else { e.wt -= dt; if (e.wt <= 0) { e.ws = 0; e.wt = rnd(4.5, 6.5); } }
          e.y += (e.ty + (reduce ? 0 : Math.sin(e.t * 2) * 3) - e.y) * Math.min(1, dt * 3);
          if (ad < e.hr) { self.hurt(1); e.x -= dirE * 50; }
          e.x = clamp(e.x, self.arena.x0 + 20, self.arena.x1 + 20);
          return;
        }
        if (e.type === 'F') { e.castT = Math.max(0, (e.castT || 0) - dt); e.y = e.ty + (reduce || e.freed ? 0 : Math.sin(e.t * 1.5) * 4); return; }
        if (e.drop) { e.y += 50 * dt; if (e.y >= e.ty) e.drop = false; return; }
        if (e.type === 't') { self._trav(e, dt * slowK, ad); if (!e.door && ad < 52) near2 = Math.max(near2, 1 - ad / 52); return; }
        // ghost kinds: the shade only shows in your light, the wrath's first symbol keeps changing, twins revive each other
        if (e.v === 'shade') e.a = self.watched(e) ? Math.min(1, e.a + dt * 3) : Math.max(.06, e.a - dt * 4.5);
        if (e.v === 'wrath' && e.gl.length) { e.ct -= dt; if (e.ct <= 0) { e.ct = 1.6; var og = e.gl[0]; while (e.gl[0] === og) e.gl[0] = pick(self._pool()); } }
        if (e.rev) { e.rev.t -= dt; if (e.rev.t <= 0) { var rv = e.rev; e.rev = null; var nb = self.spawn('g', 'R', self._syms(1), 'twin'); nb.x = rv.x; nb.ty = nb.y = rv.ty; nb.a = .3; nb.mate = e; e.mate = nb; nb.tw = e.tw ? 0 : 1; self._burst(rv.x, rv.ty, 14, ['#7fb6f2', '#efe8ff']); } }
        if (e.stun > 0) { e.stun -= dt; return; }
        e.x += dirE * e.spd * dt * slowK;
        var bob = reduce ? 0 : Math.sin(e.t * 2.4 + e.ph) * 3;
        e.y += (e.ty + bob - e.y) * Math.min(1, dt * 3);
        if (ad < e.hr * .7) { self.hurt(DEF[e.type].dmg); e.dead = true; self._burst(e.x, e.y, 8, ['#5a3f96', '#3a2b62']); }
      });
      // the wand's Wall holds back anything on the far side of it
      if (this.wall) { var wx = this.wall.x, sd = this.px > wx ? 1 : -1; this.en.forEach(function (e) { if (e.dead || e.door || e.wait != null || 'agwt'.indexOf(e.type) < 0) return; if ((e.x - wx) * sd < 0) e.x = sd > 0 ? Math.min(e.x, wx - 8) : Math.max(e.x, wx + 8); }); }
      // the lantern's beam: cracks angels fast, burns symbols off whatever it holds, pins travellers
      if (this.beaming) this.en.forEach(function (e) {
        if (e.dead || e.wait != null || !self.watched(e)) return;
        if (e.type === 'a') { e.crack += dt * 2; return; }
        if ((e.type === 't' && e.door) || !e.gl.length || e.a < .4 || 'gwt'.indexOf(e.type) < 0) return;
        if (e.type === 't') { e.stun = Math.max(e.stun || 0, .35); e.charge = false; e.lit = 0; }
        e.burn = (e.burn || 0) + dt; if (e.burn >= .55) { e.burn = 0; self._strip([e]); }
      });
      // tension
      var calm = 1 - this.run.upg.calm * .3;
      if (near2) this.tension = Math.min(1, this.tension + dt * .28 * near2 * calm); else this.tension = Math.max(0, this.tension - dt * .04);
      // flasks and puddles
      this.proj.forEach(function (p) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 130 * dt;
        if (p.y >= self.fy - 2) { p.dead = true; self.puddles.push({ x: p.x, life: 4.5 }); self._burst(p.x, self.fy - 4, 10, ['#7fd36b', '#c9f29b']); }
      });
      this.proj = this.proj.filter(function (p) { return !p.dead; });
      this.rubble = this.rubble.filter(function (r) { r.life -= dt; return r.life > 0; });
      this.puddles.forEach(function (p) { p.life -= dt; if (Math.abs(p.x - self.px) < 14 && p.life > .3) self.hurt(1); });
      this.puddles = this.puddles.filter(function (p) { return p.life > 0; });
      this._cam();
      this._tick(dt);
    }
    _tick(dt) {
      this.en = this.en.filter(function (e) { return !e.dead; });
      this.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 44 * dt; p.vx *= .97; p.life -= dt; });
      this.parts = this.parts.filter(function (p) { return p.life > 0; });
      this.bolts.forEach(function (b) { b.life -= dt; }); this.bolts = this.bolts.filter(function (b) { return b.life > 0; });
      this.texts.forEach(function (t) { t.y -= 14 * dt; t.life -= dt; }); this.texts = this.texts.filter(function (t) { return t.life > 0; });
      if (this.trailLife > 0) { this.trailLife -= dt; if (this.trailLife <= 0) this.trail = []; }
    }
    // Attract mode for the page preview: a ghost drifts in and the student draws its symbol.
    _demo(dt) {
      this.demoT -= dt;
      if (this.demoT <= 0 && !this.en.length) { var e = this.spawn(Math.random() < .5 ? 'g' : 'w', 'R', pick('hvVAo')); e.x = this.W + 8; this.demoT = 9; }
      var g = this.en[0], self = this;
      this.en.forEach(function (o) { o.t += dt; o.a = Math.min(1, o.a + dt * 1.8); o.hit = Math.max(0, o.hit - dt); if (Math.abs(self.px - o.x) > 34) o.x -= o.spd * dt; o.y += (o.ty + (reduce ? 0 : Math.sin(o.t * 2.4 + o.ph) * 3) - o.y) * Math.min(1, dt * 3); });
      if (g && !this.demoDraw && g.x - this.px < this.W * .45) this.demoDraw = { g: g.gl[0], t: 0 };
      if (this.demoDraw) {
        var d = this.demoDraw; d.t += dt;
        var cx = Math.round(this.W * .62), cy = Math.round(this.H * .32), r = Math.max(8, Math.round(Math.min(this.W, this.H) * .09));
        this.trail = glyphPath(d.g, cx, cy, r, Math.min(1, d.t / .55)); this.trailLife = .35;
        if (d.t >= .7) { this.castT = .3; this.flashT = 0; var L = this.lantern(); this.bolts.push({ x1: L[0], y1: L[1], x2: g.x, y2: g.y, life: .18 }); g.dead = true; this._burst(g.x, g.y, 16, ['#efe8ff', '#cdb6f2', '#fbc75a']); this.demoDraw = null; this.demoT = 1.6; }
      }
      this.castT = Math.max(0, this.castT - dt);
    }

    // ---- drawing
    draw() {
      if (this.hd && this.hd.on && !this.demo && this.W) { this._drawHD(); return; }
      var x = this.x, W = this.W, H = this.H, A = this.A, fy = this.fy, top = this.top, t = this.t, self = this;
      if (!W) return;
      x.imageSmoothingEnabled = false;
      x.save();
      if (this.shake > 0 && !reduce) x.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-1, 1)));
      var cam = this.cam, dark = this.lc3 && this.lc3.st === 'off', warn = this.lc3 && this.lc3.st === 'warn';
      x.drawImage(this.bg, cam, 0, W, H, 0, 0, W, H);
      var lit = function (l) { if (dark) return false; if (warn) return (t * 14 | 0) % 3 === 0; return l.k === 'on' || (l.k === 'flicker' && (reduce || Math.sin(t * 13 + l.ph) * Math.sin(t * 3.1 + l.ph * 2) > -.2)); };
      this.lamps.forEach(function (l) { var sx = l.x - cam; if (sx < -20 || sx > W + 20) return; x.fillStyle = '#3a3358'; x.fillRect(sx - 1, top - 5, 20, 4); x.fillStyle = lit(l) ? '#f6f0ff' : '#4a4268'; x.fillRect(sx, top - 4, 18, 2); });
      // the seal across the corridor until three pieces of evidence are found
      if (this.L && this.gateA > 0 && this.phase === 'explore') {
        var gx = this.L.gate - cam; x.globalAlpha = this.gateA;
        for (var gy = top; gy < fy; gy += 2) { x.fillStyle = (gy + (t * 20 | 0)) % 6 < 2 ? 'rgba(180,144,239,.55)' : 'rgba(90,63,150,.35)'; x.fillRect(gx - 2, gy, 4, 2); }
        for (var ch = 0; ch < 3; ch++) { x.fillStyle = '#8c7fae'; line(x, gx - 22, top + 30 + ch * 26, gx + 22, top + 46 + ch * 26); line(x, gx + 22, top + 30 + ch * 26, gx - 22, top + 46 + ch * 26); }
        x.globalAlpha = 1;
      }
      // puddles and stone things sit in the dark
      this.puddles.forEach(function (p) { x.globalAlpha = Math.min(1, p.life); x.fillStyle = '#3f8a3a'; x.fillRect(Math.round(p.x - 14 - cam), fy - 2, 28, 3); x.fillStyle = '#7fd36b'; x.fillRect(Math.round(p.x - 10 - cam), fy - 3, 20, 2); x.globalAlpha = 1; });
      this.en.forEach(function (e) { if (e.type === 'a' || e.type === 'Q') self._drawEnemy(e); });
      // student and lantern
      var me = this.spr(), L = this.lantern();
      if (!(this.inv > 0 && this.inv < 1.05 && this.phase !== 'over' && (t * 12 | 0) % 2)) drawSpr(x, me, this.px - cam, fy + 2, this.face < 0);
      var lx = Math.round(L[0] - cam), ly = Math.round(L[1]);
      if (!me.lan) { x.fillStyle = INK; x.fillRect(lx - 3, ly - 2, 7, 9); x.fillStyle = '#fbc75a'; x.fillRect(lx - 2, ly - 1, 5, 7); x.fillStyle = '#fff4dc'; x.fillRect(lx - 1, ly + 1, 2, 3); }
      // the rubble a crumbled angel leaves behind
      this.rubble.forEach(function (r) { var rs = A.angel.rubble; if (!rs) return; x.globalAlpha = Math.min(1, r.life); drawSpr(x, rs[0], r.x - cam, fy + 2, r.flip); x.globalAlpha = 1; });
      // Little Cha waits at the exit once the floor is clear (not after the final room)
      if ((this.phase === 'cleared' || this.phase === 'done') && A.cha.wave && this.L && this.L.boss !== 'F') { var cw = this.phase === 'done' ? A.cha.happy : A.cha.wave; drawSpr(x, cw[reduce ? 0 : (t * 4 | 0) % cw.length], this.len - 22 - cam, fy + 2, true); }
      if (this.ward) { x.fillStyle = 'rgba(251,199,90,.5)'; x.fillRect(this.px - cam - 20, fy - 58, 1, 54); x.fillRect(this.px - cam + 20, fy - 58, 1, 54); }
      // darkness, with stepped holes for the lantern cone and each lamp
      var lc = this.lx; lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, W, H);
      lc.fillStyle = dark ? 'rgba(3,2,10,.96)' : 'rgba(6,4,16,.87)'; lc.fillRect(0, 0, W, H); lc.globalCompositeOperation = 'destination-out';
      var hole = function (cx, cy, r, sx, sy, a) {
        var g = lc.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(.45, 'rgba(0,0,0,' + a + ')'); g.addColorStop(.46, 'rgba(0,0,0,' + a * .7 + ')');
        g.addColorStop(.7, 'rgba(0,0,0,' + a * .7 + ')'); g.addColorStop(.71, 'rgba(0,0,0,' + a * .38 + ')'); g.addColorStop(.88, 'rgba(0,0,0,' + a * .38 + ')'); g.addColorStop(.89, 'rgba(0,0,0,' + a * .12 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.save(); lc.translate(cx, cy); lc.scale(sx, sy); lc.fillStyle = g; lc.fillRect(-r, -r, r * 2, r * 2); lc.restore();
      };
      var fl = reduce ? 0 : Math.sin(t * 9) * 1.2 + Math.sin(t * 23) * .8, R = this.demo ? 70 : this.range;
      hole(lx, ly, 30 * Math.max(.6, this.light) + fl, 1, 1, 1);
      var cone = function (ctx) { var f2 = self.face, rr = R + fl + (self.castT > 0 ? 10 : 0); ctx.beginPath(); ctx.moveTo(lx, ly - 3); ctx.lineTo(lx + f2 * rr, ly - rr * (self.beaming ? .1 : .46)); ctx.lineTo(lx + f2 * rr, Math.min(fy + 6, ly + rr * (self.beaming ? .1 : .34))); ctx.lineTo(lx, ly + 3); ctx.closePath(); };
      if (R > 4) { var cg = lc.createLinearGradient(lx, 0, lx + this.face * R, 0); cg.addColorStop(0, 'rgba(0,0,0,1)'); cg.addColorStop(.62, 'rgba(0,0,0,.9)'); cg.addColorStop(.63, 'rgba(0,0,0,.6)'); cg.addColorStop(.86, 'rgba(0,0,0,.6)'); cg.addColorStop(.87, 'rgba(0,0,0,.25)'); cg.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = cg; cone(lc); lc.fill(); }
      this.lamps.forEach(function (l) { var sx = l.x - cam + 9; if (sx > -60 && sx < W + 60 && lit(l)) hole(sx, top + 36, 46, 1, 1.4, .72); });
      this.en.forEach(function (e) { if (e.type === 'g' || e.type === 'w' || (e.type === 't' && !e.door) || e.type === 'M') hole(e.x - cam, e.y - (e.type === 't' ? 22 : e.type === 'M' ? 30 : 0), e.type === 'M' ? 48 : 20, 1, 1, .3); if (e.type === 'X') hole(e.x - cam, e.y - e.r, e.r * 2, 1, 1, .45); if (e.type === 'F') hole(e.x - cam, e.y - 40, 46, 1, 1.3, e.fph >= 3 ? .8 : .25); });
      this.embers.forEach(function (m) { hole(m.x - cam, m.y, 22, 1, 1, .55); });
      if (this.L && this.L.end === 'final' && this.phase !== 'explore') hole(this.len - 75 - cam, fy - 50, 70, 1.2, 1, .3);
      x.drawImage(this.lc, 0, 0);
      if (!this.demo && R > 4) { var tg = x.createLinearGradient(lx, 0, lx + this.face * R, 0); tg.addColorStop(0, 'rgba(251,199,90,.13)'); tg.addColorStop(1, 'rgba(251,199,90,0)'); x.fillStyle = tg; cone(x); x.fill(); }
      if (this.beaming && R > 4) { x.globalAlpha = .24 + (reduce ? 0 : Math.sin(t * 20) * .05); x.fillStyle = '#fff4dc'; cone(x); x.fill(); x.globalAlpha = 1; }
      // unsearched doors share one faint outline: what's behind them stays hidden until you search
      this.doors.forEach(function (d) {
        if (d.done || d.kind === 'stairs' || d.kind === 'none') return; var sx = d.x - cam; if (sx < -40 || sx > W + 40) return;
        var w = d.kind === 'lab' ? 52 : d.kind === 'board' ? 60 : 40, hgt = d.kind === 'board' ? 38 : 72, yy = d.kind === 'board' ? top + 26 : fy - 72;
        x.globalAlpha = .3 + (reduce ? .1 : Math.sin(t * 2 + d.x) * .1); x.fillStyle = '#b490ef';
        x.fillRect(sx - w / 2 - 2, yy - 2, w + 4, 1); x.fillRect(sx - w / 2 - 2, yy + hgt, w + 4, 1); x.fillRect(sx - w / 2 - 2, yy - 2, 1, hgt + 3); x.fillRect(sx + w / 2 + 1, yy - 2, 1, hgt + 3);
        x.globalAlpha = 1;
      });
      // mist
      this.fog.forEach(function (m) {
        var fx = ((m.x + (reduce ? 0 : t * m.s) - cam * .5) % (W + 180) + W + 180) % (W + 180) - 90, fyy = fy + m.y * 70;
        var g = x.createRadialGradient(fx, fyy, 0, fx, fyy, m.r); g.addColorStop(0, 'rgba(180,144,239,.07)'); g.addColorStop(1, 'rgba(180,144,239,0)');
        x.fillStyle = g; x.fillRect(fx - m.r, fyy - m.r, m.r * 2, m.r * 2);
      });
      // glowing things sit above the dark
      this.embers.forEach(function (m) { var sx = Math.round(m.x - cam), sy = Math.round(m.y); x.fillStyle = '#eb9a12'; x.fillRect(sx - 2, sy - 2, 5, 5); x.fillStyle = '#fbc75a'; x.fillRect(sx - 1, sy - 3, 3, 6); x.fillStyle = '#fff4dc'; x.fillRect(sx, sy - 1, 1, 2); });
      this.proj.forEach(function (p) { var sx = Math.round(p.x - cam), sy = Math.round(p.y); x.fillStyle = '#c9f29b'; x.fillRect(sx - 2, sy - 2, 5, 5); x.fillStyle = '#eceaf6'; x.fillRect(sx - 1, sy - 5, 3, 3); });
      if (this.wall) { var wsx = Math.round(this.wall.x - cam); x.globalAlpha = Math.min(1, this.wall.t) * (.55 + (reduce ? 0 : Math.sin(t * 12) * .15)); x.fillStyle = '#cdb6f2'; x.fillRect(wsx - 2, top + 10, 4, fy - top - 10); x.fillStyle = '#efe8ff'; x.fillRect(wsx, top + 10, 1, fy - top - 10); x.globalAlpha = 1; }
      this.en.forEach(function (e) {
        if (e.v === 'twin' && e.mate && !e.mate.dead && !e.dead && e.x <= e.mate.x && e.a > .3) { x.fillStyle = 'rgba(127,182,242,.55)'; var n = Math.max(2, Math.abs(e.mate.x - e.x) / 3 | 0); for (var i = 0; i <= n; i += 2) x.fillRect(Math.round(e.x + (e.mate.x - e.x) * i / n - cam), Math.round(e.y + (e.mate.y - e.y) * i / n), 1, 1); }
        if (e.rev && !e.dead) ptext(x, String(Math.ceil(e.rev.t)), Math.round(e.x - cam - 1), Math.round(e.y - 34), '#7fb6f2');
      });
      this.en.forEach(function (e) { if (e.type !== 'a' && e.type !== 'Q') self._drawEnemy(e); });
      this.en.forEach(function (e) { self._bubble(e); });
      // searching progress
      if (this.searchT > 0) { var bw = 30, bx = Math.round(this.px - cam - bw / 2), by = fy - 66; x.fillStyle = '#120c26'; x.fillRect(bx - 1, by - 1, bw + 2, 5); x.fillStyle = '#fbc75a'; x.fillRect(bx, by, Math.round(bw * this.searchT / 1.5), 3); }
      else if (this.near && !this.demo && !coarse) { var ax = Math.round(this.px - cam), ay = fy - 70 + (reduce ? 0 : Math.round(Math.sin(t * 5))); x.fillStyle = '#fbc75a'; x.fillRect(ax - 3, ay + 2, 7, 1); x.fillRect(ax - 2, ay + 1, 5, 1); x.fillRect(ax - 1, ay, 3, 1); x.fillRect(ax, ay - 1, 1, 1); x.fillRect(ax, ay + 3, 1, 4); }
      this.bolts.forEach(function (b) {
        var n = 8, i, px = b.x1 - cam, py = b.y1; x.fillStyle = b.col ? (b.life > .1 ? '#efe8ff' : b.col) : b.life > .1 ? '#fff4dc' : '#fbc75a';
        for (i = 1; i <= n; i++) {
          var qx = b.x1 - cam + (b.x2 - b.x1) * i / n + (i < n ? rnd(-3, 3) : 0), qy = b.y1 + (b.y2 - b.y1) * i / n + (i < n ? rnd(-3, 3) : 0);
          line(x, px, py, qx, qy); px = qx; py = qy;
        }
      });
      if (this.yo) { var yo = this.yo, kk = 1 - Math.abs(1 - 2 * (1 - yo.t / .34)), L2 = this.lantern(), yx = Math.round(L2[0] + (yo.tx - L2[0]) * kk - cam), yy = Math.round(L2[1] + ((yo.ty || L2[1]) - L2[1]) * kk); x.fillStyle = '#efe8ff'; line(x, Math.round(L2[0] - cam), Math.round(L2[1]), yx, yy); var ys = this.A.yoyo.spin; if (ys) x.drawImage(ys[(t * 16 | 0) % ys.length], yx - 8, yy - 8); else disc(x, yx, yy, 3, '#f5a8c8', '#fff4dc'); }
      this.parts.forEach(function (p) { x.globalAlpha = Math.min(1, p.life * 2); x.fillStyle = p.col; x.fillRect(Math.round(p.x - cam), Math.round(p.y), 1, 1); });
      x.globalAlpha = 1;
      this.texts.forEach(function (tx) { var sx = Math.round(tx.x - cam - tx.s.length * 2), col = tx.life > .3 || (t * 10 | 0) % 2 ? '#fbc75a' : '#eb9a12'; ptext(x, tx.s, sx, Math.round(tx.y), tx.sh ? '#cdb6f2' : col); if (tx.sh) shard(x, sx + tx.s.length * 4 + 1, Math.round(tx.y)); });
      x.restore();
      // tension: the picture slips sideways in bands, and the edges go red
      if (this.tension > .55 && !reduce) {
        var wx = this.wc.getContext('2d'), amp = (this.tension - .55) * 7;
        wx.clearRect(0, 0, W, H); wx.drawImage(this.c, 0, 0);
        for (var yy2 = 0; yy2 < H; yy2 += 4) x.drawImage(this.wc, 0, yy2, W, 4, Math.round(Math.sin(t * 5 + yy2 * .09) * amp), yy2, W, 4);
      }
      if (this.slowT > 0) { x.fillStyle = 'rgba(180,144,239,' + Math.min(.12, this.slowT * .06) + ')'; x.fillRect(0, 0, W, H); }
      if (this.tension > .3) { var va = (this.tension - .3) * .5 * (reduce ? 1 : .8 + Math.sin(t * 6) * .2), vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(120,10,30,0)'); vg.addColorStop(1, 'rgba(120,10,30,' + va + ')'); x.fillStyle = vg; x.fillRect(0, 0, W, H); }
      // the stroke being drawn
      if (this.trail.length > 1) {
        x.globalAlpha = this.trailLife > 0 ? clamp(this.trailLife / .35, 0, 1) : 1;
        x.fillStyle = 'rgba(180,144,239,.35)';
        for (var i = 1; i < this.trail.length; i++) line(x, this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y, 3);
        x.fillStyle = '#fbc75a';
        for (i = 1; i < this.trail.length; i++) line(x, this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y, 1);
        x.globalAlpha = 1;
      }
      if (this.flashG && this.flashT > 0 && !this.demo) { x.globalAlpha = Math.min(1, this.flashT * 3); glyph(x, this.flashG, Math.round(W / 2 - 14), Math.round(H * .2), '#fbc75a', 4); x.globalAlpha = 1; }
      if (!this.demo && this.hud !== false) this._hud(x);
    }
    // HD-2D: the same sprites, split into three layers. "lit" stands in the 3D corridor and is lit by the
    // lantern, lamps and moon; "glow" holds things that shine on their own; the UI canvas stays on top.
    _drawHD() {
      var hd = this.hd, W = this.W, H = this.H, A = this.A, fy = this.fy, top = this.top, t = this.t, self = this, cam = this.cam;
      var UI = this.x, LX = hd.litX, GX = hd.glowX;
      [UI, LX, GX].forEach(function (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false; c.globalAlpha = 1; });
      // the seal across the corridor
      var x = GX;
      if (this.L && this.gateA > 0 && this.phase === 'explore') {
        var gx = this.L.gate - cam; x.globalAlpha = this.gateA;
        for (var gy = top; gy < fy; gy += 2) { x.fillStyle = (gy + (t * 20 | 0)) % 6 < 2 ? 'rgba(180,144,239,.55)' : 'rgba(90,63,150,.35)'; x.fillRect(gx - 2, gy, 4, 2); }
        for (var ch = 0; ch < 3; ch++) { x.fillStyle = '#8c7fae'; line(x, gx - 22, top + 30 + ch * 26, gx + 22, top + 46 + ch * 26); line(x, gx + 22, top + 30 + ch * 26, gx - 22, top + 46 + ch * 26); }
        x.globalAlpha = 1;
      }
      // lit layer: everything that stands in the corridor
      x = LX; this.x = LX;
      this.puddles.forEach(function (p) { x.globalAlpha = Math.min(1, p.life); x.fillStyle = '#3f8a3a'; x.fillRect(Math.round(p.x - 14 - cam), fy - 2, 28, 3); x.fillStyle = '#7fd36b'; x.fillRect(Math.round(p.x - 10 - cam), fy - 3, 20, 2); x.globalAlpha = 1; });
      this.en.forEach(function (e) { if (e.type === 'a' || e.type === 'Q') self._drawEnemy(e); });
      var me = this.spr(), L = this.lantern();
      if (!(this.inv > 0 && this.inv < 1.05 && this.phase !== 'over' && (t * 12 | 0) % 2)) drawSpr(x, me, this.px - cam, fy + 2, this.face < 0);
      var lx = Math.round(L[0] - cam), ly = Math.round(L[1]);
      if (!me.lan) { x.fillStyle = INK; x.fillRect(lx - 3, ly - 2, 7, 9); x.fillStyle = '#fbc75a'; x.fillRect(lx - 2, ly - 1, 5, 7); x.fillStyle = '#fff4dc'; x.fillRect(lx - 1, ly + 1, 2, 3); }
      this.rubble.forEach(function (r) { var rs = A.angel.rubble; if (!rs) return; x.globalAlpha = Math.min(1, r.life); drawSpr(x, rs[0], r.x - cam, fy + 2, r.flip); x.globalAlpha = 1; });
      if ((this.phase === 'cleared' || this.phase === 'done') && A.cha.wave && this.L && this.L.boss !== 'F') { var cw = this.phase === 'done' ? A.cha.happy : A.cha.wave; drawSpr(x, cw[reduce ? 0 : (t * 4 | 0) % cw.length], this.len - 22 - cam, fy + 2, true); }
      this.en.forEach(function (e) { if (e.type !== 'a' && e.type !== 'Q' && e.type !== 'g' && e.type !== 'w' && !(e.type === 't' && e.door)) self._drawEnemy(e); });
      if (this.yo) { var yo = this.yo, kk = 1 - Math.abs(1 - 2 * (1 - yo.t / .34)), L2 = this.lantern(), yx = Math.round(L2[0] + (yo.tx - L2[0]) * kk - cam), yy = Math.round(L2[1] + ((yo.ty || L2[1]) - L2[1]) * kk); x.fillStyle = '#efe8ff'; line(x, Math.round(L2[0] - cam), Math.round(L2[1]), yx, yy); var ys = this.A.yoyo.spin; if (ys) x.drawImage(ys[(t * 16 | 0) % ys.length], yx - 8, yy - 8); else disc(x, yx, yy, 3, '#f5a8c8', '#fff4dc'); }
      // glow layer: ghosts, wisps, embers, spells, sparks, a faint gaze cone
      x = GX; this.x = GX;
      var R = this.range, fl = reduce ? 0 : Math.sin(t * 9) * 1.2 + Math.sin(t * 23) * .8;
      var cone = function (ctx) { var f2 = self.face, rr = R + fl + (self.castT > 0 ? 10 : 0); ctx.beginPath(); ctx.moveTo(lx, ly - 3); ctx.lineTo(lx + f2 * rr, ly - rr * (self.beaming ? .1 : .46)); ctx.lineTo(lx + f2 * rr, Math.min(fy + 6, ly + rr * (self.beaming ? .1 : .34))); ctx.lineTo(lx, ly + 3); ctx.closePath(); };
      if (R > 4) { var tg = x.createLinearGradient(lx, 0, lx + this.face * R, 0); tg.addColorStop(0, 'rgba(251,199,90,' + (this.beaming ? .2 : .06) + ')'); tg.addColorStop(1, 'rgba(251,199,90,0)'); x.fillStyle = tg; cone(x); x.fill(); }
      if (this.ward) { x.fillStyle = 'rgba(251,199,90,.5)'; x.fillRect(this.px - cam - 20, fy - 58, 1, 54); x.fillRect(this.px - cam + 20, fy - 58, 1, 54); }
      this.embers.forEach(function (m) { var sx = Math.round(m.x - cam), sy = Math.round(m.y); x.fillStyle = '#eb9a12'; x.fillRect(sx - 2, sy - 2, 5, 5); x.fillStyle = '#fbc75a'; x.fillRect(sx - 1, sy - 3, 3, 6); x.fillStyle = '#fff4dc'; x.fillRect(sx, sy - 1, 1, 2); });
      this.proj.forEach(function (p) { var sx = Math.round(p.x - cam), sy = Math.round(p.y); x.fillStyle = '#c9f29b'; x.fillRect(sx - 2, sy - 2, 5, 5); x.fillStyle = '#eceaf6'; x.fillRect(sx - 1, sy - 5, 3, 3); });
      if (this.wall) { var wsx = Math.round(this.wall.x - cam); x.globalAlpha = Math.min(1, this.wall.t) * (.55 + (reduce ? 0 : Math.sin(t * 12) * .15)); x.fillStyle = '#cdb6f2'; x.fillRect(wsx - 2, top + 10, 4, fy - top - 10); x.fillStyle = '#efe8ff'; x.fillRect(wsx, top + 10, 1, fy - top - 10); x.globalAlpha = 1; }
      this.en.forEach(function (e) { if (e.v === 'twin' && e.mate && !e.mate.dead && !e.dead && e.x <= e.mate.x && e.a > .3) { x.fillStyle = 'rgba(127,182,242,.55)'; var n = Math.max(2, Math.abs(e.mate.x - e.x) / 3 | 0); for (var i = 0; i <= n; i += 2) x.fillRect(Math.round(e.x + (e.mate.x - e.x) * i / n - cam), Math.round(e.y + (e.mate.y - e.y) * i / n), 1, 1); } });
      this.en.forEach(function (e) { if (e.type === 'g' || e.type === 'w') self._drawEnemy(e); });
      this.bolts.forEach(function (b) {
        var n = 8, i, px = b.x1 - cam, py = b.y1; x.fillStyle = b.col ? (b.life > .1 ? '#efe8ff' : b.col) : b.life > .1 ? '#fff4dc' : '#fbc75a';
        for (i = 1; i <= n; i++) { var qx = b.x1 - cam + (b.x2 - b.x1) * i / n + (i < n ? rnd(-3, 3) : 0), qy = b.y1 + (b.y2 - b.y1) * i / n + (i < n ? rnd(-3, 3) : 0); line(x, px, py, qx, qy); px = qx; py = qy; }
      });
      this.parts.forEach(function (p) { x.globalAlpha = Math.min(1, p.life * 2); x.fillStyle = p.col; x.fillRect(Math.round(p.x - cam), Math.round(p.y), 1, 1); });
      x.globalAlpha = 1;
      // UI layer
      x = UI; this.x = UI;
      this.en.forEach(function (e) { if (e.rev && !e.dead) ptext(x, String(Math.ceil(e.rev.t)), Math.round(e.x - cam - 1), Math.round(e.y - 34), '#7fb6f2'); });
      this.en.forEach(function (e) { if (e.type === 't' && e.door && hd.proj) { var p = hd.proj(e.x, e.y, hd.wallZ), ox = e.x, oy = e.y; e.x = p[0] + cam; e.y = Math.round(p[1]); self._bubble(e); e.x = ox; e.y = oy; } else self._bubble(e); });
      if (this.searchT > 0) { var bw = 30, bx = Math.round(this.px - cam - bw / 2), by = fy - 66; x.fillStyle = '#120c26'; x.fillRect(bx - 1, by - 1, bw + 2, 5); x.fillStyle = '#fbc75a'; x.fillRect(bx, by, Math.round(bw * this.searchT / 1.5), 3); }
      else if (this.near && !coarse) { var ax = Math.round(this.px - cam), ay = fy - 70 + (reduce ? 0 : Math.round(Math.sin(t * 5))); x.fillStyle = '#fbc75a'; x.fillRect(ax - 3, ay + 2, 7, 1); x.fillRect(ax - 2, ay + 1, 5, 1); x.fillRect(ax - 1, ay, 3, 1); x.fillRect(ax, ay - 1, 1, 1); x.fillRect(ax, ay + 3, 1, 4); }
      this.texts.forEach(function (tx) { var sx = Math.round(tx.x - cam - tx.s.length * 2), col = tx.life > .3 || (t * 10 | 0) % 2 ? '#fbc75a' : '#eb9a12'; ptext(x, tx.s, sx, Math.round(tx.y), tx.sh ? '#cdb6f2' : col); if (tx.sh) shard(x, sx + tx.s.length * 4 + 1, Math.round(tx.y)); });
      if (this.slowT > 0) { x.fillStyle = 'rgba(180,144,239,' + Math.min(.12, this.slowT * .06) + ')'; x.fillRect(0, 0, W, H); }
      if (this.tension > .3) { var va = (this.tension - .3) * .5 * (reduce ? 1 : .8 + Math.sin(t * 6) * .2), vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(120,10,30,0)'); vg.addColorStop(1, 'rgba(120,10,30,' + va + ')'); x.fillStyle = vg; x.fillRect(0, 0, W, H); }
      if (this.trail.length > 1) {
        x.globalAlpha = this.trailLife > 0 ? clamp(this.trailLife / .35, 0, 1) : 1;
        x.fillStyle = 'rgba(180,144,239,.35)'; for (var i = 1; i < this.trail.length; i++) line(x, this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y, 3);
        x.fillStyle = '#fbc75a'; for (i = 1; i < this.trail.length; i++) line(x, this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y, 1);
        x.globalAlpha = 1;
      }
      if (this.flashG && this.flashT > 0) { x.globalAlpha = Math.min(1, this.flashT * 3); glyph(x, this.flashG, Math.round(W / 2 - 14), Math.round(H * .2), '#fbc75a', 4); x.globalAlpha = 1; }
      if (this.hud !== false) this._hud(x);
      hd.frame(this);
    }
    _drawEnemy(e) {
      var x = this.x, A = this.A, t = this.t, cam = this.cam, sx = e.x - cam, spr;
      if (sx < -120 || sx > this.W + 120) return;
      x.globalAlpha = e.a;
      if (e.type === 'a') { var ad2 = Math.abs(e.x - this.px); spr = e.seen ? A.angel.cover[Math.min(3, e.crack / (2.8 - this.run.upg.lan * .35) * 4 | 0)] : A.angel.lunge[ad2 < 50 ? 2 : ad2 < 110 ? 1 : 0]; drawSpr(x, spr, sx, e.y + (A.angel.real ? 3 : 2), e.x > this.px); if (e.seen && e.crack > .05) { var cn = 2.8 - this.run.upg.lan * .35; x.fillStyle = '#120c26'; x.fillRect(Math.round(sx - 13), e.y - 72, 26, 4); x.fillStyle = '#fbc75a'; x.fillRect(Math.round(sx - 12), e.y - 71, Math.round(24 * Math.min(1, e.crack / cn)), 2); } }
      else if (e.type === 'Q') { spr = A.mother[this.lc3 && this.lc3.st === 'off' || !e.seen ? 'lunge' : 'cover'][Math.min(3, e.cracks)]; drawSpr(x, spr, sx, e.y + (A.angel.real ? 7 : 5), e.x > this.px); if (e.seen && this.lc3 && this.lc3.st === 'on' && !e.cool) { x.fillStyle = '#fbc75a'; x.fillRect(Math.round(sx - 20), e.y - 136, Math.round(40 * e.g / 1.4), 2); } }
      else if (e.type === 't') {
        if (e.door && A.door.burden) { if (e.seen) { x.globalAlpha = reduce ? .85 : .6 + Math.sin(t * 9) * .25; drawSpr(x, A.door.burden[0], sx, this.fy - 2, false); } }
        else if (e.door) { if (e.seen) { x.globalAlpha = reduce ? .5 : .35 + Math.sin(t * 9) * .15; x.fillStyle = '#a9c4d6'; x.fillRect(Math.round(sx - 14), this.fy - 66, 28, 62); x.globalAlpha = .9; x.fillStyle = '#2c3a4c'; x.fillRect(Math.round(sx - 7), this.fy - 50, 4, 6); x.fillRect(Math.round(sx + 3), this.fy - 50, 4, 6); x.fillRect(Math.round(sx - 4), this.fy - 38, 8, 6); } }
        else {
          var tK = A.trav.K && A.trav.K[e.v || 'lost'], tmv = e._dx != null && Math.abs(e.x - e._dx) > .02, tfl = tmv ? e.x < e._dx : e.x > this.px; e._dx = e.x;
          if (tK) { var tf = e.charge && tK.charge ? tK.charge : tmv && tK.drift ? tK.drift : tK.idle; spr = tf[reduce ? 0 : (t * (tf === tK.idle ? 2 : 7) + e.ph | 0) % tf.length]; }
          else { spr = vSpr(A.trav.idle[(t * 2 + e.ph | 0) % 2], e.charge && (t * 10 | 0) % 2 ? 'charge' : e.v === 'lost' ? null : e.v); tfl = e.x > this.px; }
          if (e.v === 'echo' && !reduce) { x.globalAlpha = e.a * .18; var edx = e.x > this.px ? 10 : -10; drawSpr(x, spr, sx + edx, e.y + 2, tfl); drawSpr(x, spr, sx + edx * 2, e.y + 2, tfl); }
          x.globalAlpha = e.a * (tK ? .9 : .8); drawSpr(x, spr, sx + (e.charge && !reduce ? Math.round(rnd(-1, 1)) : 0), e.y + 2, tfl);
          if (e.stun > 0) { x.globalAlpha = 1; for (var s2 = 0; s2 < 3; s2++) { var aa = t * 5 + s2 * 2.1; x.fillStyle = '#fbc75a'; x.fillRect(Math.round(sx + Math.cos(aa) * 9), Math.round(e.y - 52 + Math.sin(aa) * 3), 2, 2); } }
        }
      }
      else if (e.type === 'X') { var xi = A.exp.idle; if (xi) { var xs = xi[reduce ? 0 : (t * 2 + e.ph | 0) % xi.length]; if (e.hit > 0) xs = tint(xs, '#ffffff', .55); var xk = e.r / 20, xw = Math.round(xs.width * xk), xh = Math.round(xs.height * xk); x.imageSmoothingEnabled = xk < 1; x.drawImage(xs, Math.round(sx - xw / 2), e.y - xh + 2, xw, xh); x.imageSmoothingEnabled = false; } else blob(x, Math.round(sx), e.y, e.r, t + e.ph, e.hit > 0); }
      else if (e.type === 'M') {
        var mw = e.ws && A.monitor.whistle; spr = e.hit ? A.monitor.hit[0] : mw ? mw[(t * 6 | 0) % mw.length] : A.monitor.idle[(t * 2.5 | 0) % 2]; drawSpr(x, spr, sx, e.y + 4, A.monitor.right ? e.x > this.px : e.x < this.px);
        if (e.ws === 1 && (t * 8 | 0) % 2) ptext(x, '!', Math.round(sx - 1), e.y - 80, '#f39a4a');
        if (e.ws === 2) for (var k = 0; k < 3; k++) { x.fillStyle = 'rgba(251,199,90,' + (.7 - k * .2) + ')'; var rr = 8 + k * 6 + ((t * 20 | 0) % 6); x.fillRect(Math.round(sx + 10 + rr), e.y - 34 - k * 2, 1, 6 + k * 3); x.fillRect(Math.round(sx - 10 - rr), e.y - 34 - k * 2, 1, 6 + k * 3); }
      }
      else if (e.type === 'F') {
        var FA = A.final;
        if (e.freed) { var ft = this.t - (e.freedT || this.t); spr = FA.real && FA.true && ft > 3 ? FA.true[(t * .8 | 0) % FA.true.length] : FA.freed[Math.min(FA.freed.length - 1, ft * 2.4 | 0)]; }
        else spr = FA.real && FA.cast && e.castT > 0 ? FA.cast[Math.min(FA.cast.length - 1, (1 - e.castT) * 3.4 | 0)] : FA.idle[reduce ? 0 : (t * 5 | 0) % FA.idle.length];
        if (!e.freed && !reduce) for (var j = 0; j < 6; j++) { var a2 = t * 1.4 + j * 1.05, r2 = 34 + Math.sin(t * 2 + j) * 6; x.fillStyle = j % 2 ? 'rgba(20,13,42,.8)' : 'rgba(90,63,150,.6)'; x.fillRect(Math.round(sx + Math.cos(a2) * r2), Math.round(e.y - 40 + Math.sin(a2) * r2 * .7), 4, 4); }
        drawSpr(x, spr, sx, e.freed && FA.real ? this.fy + 2 : e.y + 3, e.x > this.px);
      }
      else { var set = e.type === 'w' ? A.wisp : A.ghost, gV = e.type === 'g' && e.v && set.V, gfl = !!A.ghost.V && e.x > this.px; if (gV) set = gV[e.v === 'twin' && e.tw ? 'twin2' : e.v] || set; spr = e.hit ? set.hit[0] : set.idle[(t * (e.type === 'w' ? 6 : 2.5) | 0) % 2]; if (e.type === 'g' && !gV) spr = vSpr(spr, e.v); if (gfl) { x.save(); x.translate(Math.round(sx) * 2, 0); x.scale(-1, 1); } if (e.stun > 0 && (t * 10 | 0) % 2) spr = vSpr(spr, 'charge'); x.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(e.y - spr.height / 2)); if (gfl) x.restore(); }
      x.globalAlpha = 1;
    }
    _bubble(e) {
      if (!e.gl.length) return;
      if (e.type === 't' && e.door) { if (!e.seen) return; } else if (e.a < .3) return;
      var x = this.x, W = this.W, cam = this.cam, t = this.t, show = e.type === 'F' && e.fph >= 3 ? 5 : 3;
      if (this.tension >= .8 && !reduce && (t * 6 + e.ph | 0) % 3 === 0) return;
      var hgt = e.type === 'M' ? 76 : e.type === 'F' ? 90 : e.type === 'X' ? e.r * 2 + 6 : e.type === 't' ? (e.door ? 92 : 56) : e.type === 'g' ? 22 : 16;
      var gl = e.gl.slice(0, show), bw = gl.length * 9 + 3, bx = clamp(Math.round(e.x - cam - bw / 2), 2, W - bw - 14), by = Math.round(e.y - hgt - 13);
      x.globalAlpha = e.a * (e.type === 'F' && e.fph < 3 ? clamp(this.light * 1.5 - .2, .15, 1) : 1);
      x.fillStyle = 'rgba(18,12,38,.85)'; x.fillRect(bx, by, bw, 11); x.fillStyle = '#5a3f96'; x.fillRect(bx, by + 11, bw, 1);
      gl.forEach(function (g, i) { glyph(x, g, bx + 2 + i * 9, by + 2, i ? '#9d8cc4' : e.v === 'wrath' ? '#f39a4a' : '#fbc75a'); });
      if (e.v === 'wrath' && e.ct != null) { x.fillStyle = '#f0566a'; x.fillRect(bx, by + 12, Math.round(bw * e.ct / 1.6), 1); }
      if (e.gl.length > show) ptext(x, '+' + (e.gl.length - show), bx + bw + 2, by + 3, '#9d8cc4');
      x.globalAlpha = 1;
    }
    _hud(x) {
      var W = this.W, H = this.H, i, r = this.run;
      hearts(x, this.hp, this.maxHp);
      if (this.L && this.run.peace !== false) { var px0 = 8 + this.maxHp / 2 * 9 + (this.ward ? 5 : 0); x.fillStyle = '#fbc75a'; x.fillRect(px0 + 3, 3, 1, 1); x.fillRect(px0 + 2, 4, 3, 1); x.fillRect(px0, 5, 7, 1); x.fillRect(px0 + 1, 6, 5, 1); x.fillRect(px0 + 1, 7, 2, 1); x.fillRect(px0 + 4, 7, 2, 1); }
      if (this.ward) { x.fillStyle = '#fbc75a'; x.fillRect(4 + this.maxHp / 2 * 9, 5, 3, 5); }
      shard(x, 4, 14); ptext(x, String(r.shards), 11, 14, '#cdb6f2');
      if (this.L && this.phase === 'explore') for (i = 0; i < 3; i++) { x.fillStyle = i < this.ev ? '#fbc75a' : '#3a2b62'; x.fillRect(4 + i * 7, 23, 5, 6); if (i < this.ev) { x.fillStyle = '#fff4dc'; x.fillRect(5 + i * 7, 24, 1, 2); } }
      // tension meter
      if (this.tension > 0.02) { var tw = 30; x.fillStyle = '#120c26'; x.fillRect(3, 32, tw + 2, 4); x.fillStyle = this.tension >= 1 ? ((this.t * 8 | 0) % 2 ? '#f0566a' : '#a3283b') : '#b490ef'; x.fillRect(4, 33, Math.round(tw * this.tension), 2); }
      if (this.L) {
        var wk = r.weapon || 'lantern'; WI[wk] = WI[wk] || wIcon(wk); x.drawImage(WI[wk], 3, 39, 8, 8);
        if (wk === 'wand') for (i = 0; i < 5; i++) { x.fillStyle = i < Math.floor(this.mana) ? (this.mana >= 5 && (this.t * 4 | 0) % 2 ? '#efe8ff' : '#cdb6f2') : '#3a2b62'; x.fillRect(13 + i * 5, 42, 4, 3); }
        else if (wk === 'lantern') { var of = this.oil / 100; x.fillStyle = '#120c26'; x.fillRect(12, 41, 26, 5); x.fillStyle = this.beaming ? '#fff4dc' : of < .2 ? '#8c7fae' : '#fbc75a'; x.fillRect(13, 42, Math.round(24 * of), 3); }
        else { var fr = 1 - this.sk / .55; x.fillStyle = '#120c26'; x.fillRect(12, 41, 26, 5); x.fillStyle = fr >= 1 ? '#fbc75a' : '#8c7fae'; x.fillRect(13, 42, Math.round(24 * fr), 3); if (this.comboT > 0 && this.combo > 1) ptext(x, 'x' + this.combo, 41, 41, '#f5a8c8'); }
      }
      ptext(x, String(r.score), Math.round(W / 2 - String(r.score).length * 2), 5, '#fbc75a');
      // boss bar
      var b = this.boss;
      if (b) {
        var frac = b.type === 'Q' ? 1 - b.cracks / 3 : b.type === 'X' ? this.en.filter(function (o) { return o.type === 'X'; }).reduce(function (s, o) { return s + o.size * o.gl.length; }, 0) / 12 : b.type === 'F' ? ((3 - b.fph) + b.gl.length / (b.fph === 1 ? 6 : b.fph === 2 ? 8 : 5)) / 3 : b.gl.length / Math.max(b.max, b.gl.length);
        var bwid = Math.min(140, W - 40), bx0 = Math.round((W - bwid) / 2); x.fillStyle = '#120c26'; x.fillRect(bx0 - 1, H - 9, bwid + 2, 5); x.fillStyle = '#f39a4a'; x.fillRect(bx0, H - 8, Math.round(bwid * clamp(frac, 0, 1)), 3);
      }
      if (this.phase === 'cleared' && (this.t * 2 | 0) % 2) { var ex = this.len - 44 - this.cam; if (ex < W - 10) { x.fillStyle = '#fbc75a'; x.fillRect(Math.round(ex), this.fy - 60, 6, 1); x.fillRect(Math.round(ex) + 4, this.fy - 61, 1, 3); } else ptext(x, '>', W - 10, this.fy - 60, '#fbc75a'); }
    }
  }
  F3['>'] = '100010001010100';
  function TXc(z) { return TX[z.o.loc === 'en' ? 'en' : 'zh']; }
  function drawSpr(x, img, cx, by, flip) {
    var l = Math.round(cx - img.width / 2), tp = Math.round(by - img.height);
    if (!flip) { x.drawImage(img, l, tp); return; }
    x.save(); x.translate(l + img.width, tp); x.scale(-1, 1); x.drawImage(img, 0, 0); x.restore();
  }
  // The Experiment: a wobbling pixel blob of spilled chemicals, drawn straight to the screen.
  function blob(x, cx, by, r, t, hit) {
    var cy = by - r, y;
    for (y = -r; y <= r; y++) {
      var w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)) * (1 + (reduce ? 0 : Math.sin(t * 3 + y * .3) * .06)));
      if (y > r * .3) w = Math.max(w, Math.round(r * .9));
      x.fillStyle = hit ? '#eaffd8' : y < -r * .5 ? '#9be37f' : '#6cc45b'; x.fillRect(cx - w, cy + y, w * 2, 1);
      x.fillStyle = hit ? '#ffffff' : '#3f8a3a'; x.fillRect(cx + w - 2, cy + y, 2, 1);
    }
    x.fillStyle = '#2a4a24'; x.fillRect(cx - r, by, r * 2, 1);
    var e = Math.max(1, r / 6 | 0); x.fillStyle = '#12210f'; x.fillRect(cx - r / 3 - e, cy - 2, e * 2, e * 2 + 1); x.fillRect(cx + r / 3 - e, cy - 2, e * 2, e * 2 + 1);
    x.fillStyle = '#efffe0'; x.fillRect(cx - r / 3 - e, cy - 2, 1, 1); x.fillRect(cx + r / 3 - e, cy - 2, 1, 1);
    if (!reduce) { x.fillStyle = '#c9f29b'; x.fillRect(cx - r / 2 + ((t * 9 | 0) % r), cy - r / 2 - ((t * 14 | 0) % 6), 2, 2); }
  }
  function fit(box) {
    var bw = box.clientWidth, bh = box.clientHeight, s = Math.max(2, Math.round(Math.min(bw / 460, bh / 270)));
    if (coarse && bh > bw) { var dpr = window.devicePixelRatio || 1; s = Math.max(1, Math.round(Math.min(bw / 290, bh / 270) * dpr) / dpr); }
    return { s: s, W: Math.ceil(bw / s), H: Math.ceil(bh / s), bw: bw, bh: bh };
  }

  // ---- Battles --------------------------------------------------------------
  // Meeting a Perished Traveller, or reaching the first three bosses, cuts to a turn-based battle.
  // Your turn: Banish (your weapon's attack), Talk, Item or Free. Their turn: steer your flame
  // through their attack inside a box. Talk calms them; once calm, Free ends it kindly.
  var BT = {
    t: {
      zh: { name: '葬身旅客', intro: '葬身旅客擋住了走廊。',
        idle: ['旅客在看一張沒有路的地圖。', '它喃喃唸著一班 1985 年的列車時間。', '它的行李箱在滴水。'],
        talk: [['問它要去哪裏', '「回家……尾班車……我錯過了。」它垂下地圖。', 55], ['告訴它門已經開了', '「開了……？」它望向樓梯，半信半疑。', 50], ['舉起燈籠照亮它', '燈光照到它的臉，一瞬間它看起來像個學生。', 45], ['叫它走開', '「走開？我早就迷路了。」它的行李開始震動。', -25]],
        atk: ['行李牌從天而降！', '地圖撕成一條條線！', '腳步聲逼近！'],
        free: '旅客摺好地圖，穿過牆壁，走向巴士站。', banish: '旅客像塵埃一樣散去。' },
      en: { name: 'Perished Traveller', intro: 'A Perished Traveller blocks the corridor.',
        idle: ['The traveller studies a map with no roads on it.', 'It mutters a train time from 1985.', 'Its suitcase is dripping.'],
        talk: [['Ask where they were going', '“Home… the last bus… I missed it.” It lowers its map.', 55], ['Tell them the door is open now', '“Open…?” It turns toward the stairs, unsure.', 50], ['Hold your lantern up to them', 'The light catches its face. For a moment it looks like a student.', 45], ['Tell it to get lost', '“Lost? I’ve been lost for years.” Its luggage starts to shake.', -25]],
        atk: ['Luggage tags rain down!', 'The map tears into lines!', 'Footsteps close in!'],
        free: 'The traveller folds its map and walks through the wall, toward the bus stop.', banish: 'The traveller scatters like dust.' }
    },
    X: {
      zh: { intro: '實驗體從實驗室的洗手盤湧了出來。',
        idle: ['它冒著泡，裏面有東西貼著「勿開」。', '它有一股燒焦膠喉的氣味。', '你一望向試劑瓶，它就發抖。'],
        talk: [['讀它瓶上的標籤', '「樣本 1031，失敗。」那團東西縮小了一點。', 35], ['告訴它不是失敗品', '它晃了晃，一個氣泡破成小小的心形。', 40], ['提出幫它清潔實驗室', '它把灑出來的水滴收回身上，有點不好意思。', 35], ['戳它一下', '壞主意。它分成兩半，兩半都很生氣。', -25]],
        atk: ['燒瓶飛過來！', '它在牆壁之間反彈！', '氣泡從地面升起！'],
        free: '實驗體縮進一個燒杯裏，安心地嘆了口氣。', banish: '實驗體化成一陣綠色蒸氣。' },
      en: { intro: 'The Experiment oozes up out of the lab sink.',
        idle: ['It bubbles. Something inside is labelled DO NOT OPEN.', 'It smells like burnt Bunsen tubing.', 'It quivers when you look at the jar.'],
        talk: [['Read the label on its jar', '“SAMPLE 1031. FAILED.” The blob shrinks a little.', 35], ['Tell it it isn’t a failure', 'It wobbles. A bubble pops into a tiny heart.', 40], ['Offer to clean up the lab', 'It gathers its spilled drops back in, embarrassed.', 35], ['Poke it', 'Bad idea. It splits in two, and both halves are angry.', -25]],
        atk: ['Flasks fly!', 'It bounces off the walls!', 'Bubbles rise from the floor!'],
        free: 'The Experiment settles into a beaker and sighs, relieved.', banish: 'The Experiment evaporates in a puff of green steam.' }
    },
    M: {
      zh: { intro: '走廊糾察吹響哨子：「走廊不准奔跑！」',
        idle: ['它翻看記錄板，上面有你的名字。', '臂章寫著「風紀」，墨水已經很舊。', '「你的通行證呢？」'],
        talk: [['出示通行證', '它盯著通行證看了很久。「……可以。」', 35], ['為奔跑道歉', '「道歉已記錄。」它在記錄板上寫了些好話。', 40], ['問它臂章的事', '「1985 年那一屆。一直沒有人來接我的班。」', 35], ['從它身邊跑過', '哨子尖叫起來。這是錯誤答案。', -25]],
        atk: ['遲到紙滿天飛！', '間尺橫掃走廊！', '校規列隊步過！'],
        free: '走廊糾察在通行證上簽名，敬了個禮，終於可以下班了。', banish: '哨子掉在地上，滾走了。' },
      en: { intro: 'The Hall Monitor blows the whistle. “No running in the corridor!”',
        idle: ['It checks its clipboard. Your name is on it.', 'The armband reads PREFECT. The ink is very old.', '“Where is your hall pass?”'],
        talk: [['Show your hall pass', 'It squints at the pass for a long time. “…Acceptable.”', 35], ['Apologise for running', '“Apology noted.” It writes something kind on the clipboard.', 40], ['Ask about its armband', '“Class of 1985. Nobody ever came to take over my shift.”', 35], ['Run straight past it', 'The whistle shrieks. That was the wrong answer.', -25]],
        atk: ['Late slips everywhere!', 'The ruler sweeps the hall!', 'The rules march down the corridor!'],
        free: 'The Hall Monitor signs your pass, salutes, and finally goes off duty.', banish: 'The whistle drops to the floor and rolls away.' }
    },
    Q: {
      zh: { intro: '泣母掩著臉。遠處傳來一首搖籃曲。',
        idle: ['石淚從她的指縫流下。', '她在數數。一……二……三……', '她的孩子在黑暗中等待。'],
        talk: [['問她在等誰', '「我的孩子們。他們上了樓，再也沒有下來。」', 35], ['答應不移開目光', '她掩著臉的手鬆開了一點點。', 40], ['哼出話劇裏的搖籃曲', '她跟著哼起來，石像停止了爬行。', 35], ['轉身背對她', '千萬不要這樣做。房間一下子變冷了。', -25]],
        atk: ['她的孩子爬近了！', '燈滅了！', '石淚落下！'],
        free: '泣母放下雙手，她在微笑。她化成石像，終於安息了。', banish: '泣母碎成一地瓦礫。' },
      en: { intro: 'The Weeping Mother covers her face. Somewhere, a lullaby.',
        idle: ['Stone tears run between her fingers.', 'She is counting. One… two… three…', 'Her children wait in the dark.'],
        talk: [['Ask who she is waiting for', '“My little ones. They went upstairs and never came down.”', 35], ['Promise not to look away', 'Her hands loosen, just a little.', 40], ['Hum the lullaby from the play', 'She hums along. The statues stop creeping.', 35], ['Turn your back on her', 'Never do that. The room goes cold.', -25]],
        atk: ['Her children creep closer!', 'The lights die!', 'Stone tears fall!'],
        free: 'The Weeping Mother lowers her hands. She is smiling. She turns to stone, at peace.', banish: 'The Weeping Mother crumbles into rubble.' }
    }
  };
  // Traveller kinds in battle (merged over BT.t).
  var BTV = {
    lost: { zh: { name: '迷路旅客', intro: '迷路旅客尖叫著衝了過來！' }, en: { name: 'Lost Traveller', intro: 'The Lost Traveller shrieks and rushes at you!' } },
    echo: { zh: { name: '回音旅客', intro: '回音旅客停在你身後，和你同時停下了腳步。', atk: ['腳步聲逼近！', '它模仿你的每一步！', '地圖撕成一條條線！'] },
      en: { name: 'Echo Traveller', intro: 'The Echo Traveller stops right behind you, at the same moment you do.', atk: ['Footsteps close in!', 'It copies your every step!', 'The map tears into lines!'] } },
    burden: { zh: { name: '負重旅客', intro: '負重旅客拖著行李箱，擋在你面前。', atk: ['行李牌從天而降！', '行李箱四處亂彈！', '地圖撕成一條條線！'] },
      en: { name: 'Burdened Traveller', intro: 'The Burdened Traveller drags its suitcases into your way.', atk: ['Luggage tags rain down!', 'Suitcases bounce everywhere!', 'The map tears into lines!'] } }
  };
  // The final boss: never named here; the name only appears in the reveal (FB).
  BT.F = {
    zh: { intro: '黑暗從房間深處湧出，凝聚成一個披著斗篷的身影。',
      idle: [['斗篷下甚麼也看不見，只有黑暗在呼吸。', '你的燈籠越來越暗。', '它在低聲數著甚麼……一、二、三……'],
        ['走廊上的一切都在回應它的呼喚。', '旅客、實驗體、哨子和搖籃曲，全部混在一起。'],
        ['斗篷的邊緣正在剝落。', '黑暗之下，好像有人在發抖。']],
      talk: [['問它是誰', '「我……忘記了。黑暗連名字也拿走了。」', 35], ['告訴它大家都在等它', '斗篷下傳來一聲很輕的抽泣。', 35], ['一直看著它，不移開目光', '黑暗退後了一點，好像害怕被人看見。', 40], ['吹熄燈籠', '房間陷入一片漆黑。黑暗笑了。', -1]],
      atk: [['鬼火圍攏過來！', '黑暗吞噬光明！'], ['它在召喚走廊上的一切！', '熟悉的攻擊又來了！'], ['黑影劃破房間！', '黑暗旋轉著散開！', '黑暗正在剝落！']],
      phaseUp: ['第一道封印碎了。黑暗開始召喚幫手……', '第二道封印碎了。斗篷開始剝落……'],
      done: '最後的封印碎了。黑暗散去，斗篷下面有一個人在發抖。',
      notReady: '黑暗還緊緊纏著它。先打破三道封印。',
      free: '你伸出手。那個人慢慢地握住了。' },
    en: { intro: 'Darkness pours out of the back of the room and gathers into a hooded figure.',
      idle: [['There is nothing under the hood but breathing darkness.', 'Your lantern grows dimmer.', 'It is whispering numbers… one, two, three…'],
        ['Everything in the corridors answers its call.', 'The traveller, the Experiment, the whistle and the lullaby, all at once.'],
        ['The edges of the cloak are peeling away.', 'Under the darkness, someone is shaking.']],
      talk: [['Ask who it is', '“I… forgot. The darkness took my name too.”', 35], ['Tell it everyone is waiting', 'A small sob comes from under the hood.', 35], ['Keep watching. Don’t look away.', 'The darkness shrinks back, as if it hates being seen.', 40], ['Blow out your lantern', 'The room goes pitch black. The darkness laughs.', -1]],
      atk: [['Wisps close in!', 'The darkness eats the light!'], ['It calls on everything in the corridors!', 'Familiar attacks return!'], ['Shadows cut across the room!', 'The darkness spins apart!', 'The darkness is peeling away!']],
      phaseUp: ['The first seal breaks. The darkness calls for help…', 'The second seal breaks. The cloak starts to peel away…'],
      done: 'The last seal breaks. The darkness lifts, and under the cloak someone is trembling.',
      notReady: 'The darkness still holds it tight. Break all three seals first.',
      free: 'You reach out your hand. Slowly, they take it.' }
  };
  // seal = how much Banish damage it takes; dmg = hearts lost per hit; dur = seconds per attack
  var BDEF = { t: { seal: 6, dmg: 1, dur: 5 }, X: { seal: 10, dmg: 1, dur: 6.5 }, M: { seal: 12, dmg: 1, dur: 7 }, Q: { seal: 12, dmg: 2, dur: 7 }, F: { seal: 8, dmg: 1, dur: 7 } };

  // Attack patterns, one list per enemy. Box coordinates run 0..bw, 0..bh. s scales speed.
  function every(b, dt, key, gap, fn) { var p = b.ps; p[key] = (p[key] == null ? 0 : p[key]) - dt; while (p[key] <= 0) { p[key] += gap; fn(); } }
  function edge(l) { var k = Math.random() * 4 | 0; return k === 0 ? [rnd(0, l.bw), -3] : k === 1 ? [rnd(0, l.bw), l.bh + 3] : k === 2 ? [-3, rnd(0, l.bh)] : [l.bw + 3, rnd(0, l.bh)]; }
  function aim(b, p, sp) { var dx = b.fx - p[0], dy = b.fy - p[1], d = Math.hypot(dx, dy) || 1; return [dx / d * sp, dy / d * sp]; }
  function bounce(o, dt, b, l) {
    if (b.wind) return;
    var hit = false;
    if ((o.x < o.r && o.vx < 0) || (o.x > l.bw - o.r && o.vx > 0)) { o.vx = -o.vx; hit = true; }
    if ((o.y < o.r && o.vy < 0) || (o.y > l.bh - o.r && o.vy > 0)) { o.vy = -o.vy; hit = true; }
    if (hit && o.r > 3 && b.bul.length < 14) { o.r -= 1.5; b.add({ x: o.x, y: o.y, vx: o.vy, vy: o.vx, r: o.r, k: 'blob', keep: 1, step: bounce }); }
  }
  // Statues (the Weeping Mother): frozen while in your beam, crumble if held there, creep when not.
  function statue(o, dt, b, l) {
    var dx = o.x - b.fx, dy = o.y - b.fy, d = Math.hypot(dx, dy) || 1;
    o.lit = !b.dark && d < 50 && (dx * b.fd[0] + dy * b.fd[1]) / d > .8;
    if (o.lit) { o.g += dt; if (o.g >= 1) { o.dead = true; b.burst(o.x, o.y, 8, ['#a7a5b6', '#d9d7e4']); } return; }
    var sp = (b.dark ? 44 : 22) * b.spd * (b.wind ? 1.8 : 1); o.x -= dx / d * sp * dt; o.y -= dy / d * sp * dt;
  }
  function addStatue(b, l) { if (b.bul.filter(function (o) { return o.k === 'stat'; }).length >= 5) return; var p = edge(l); b.add({ x: clamp(p[0], 2, l.bw - 2), y: clamp(p[1], 2, l.bh - 2), vx: 0, vy: 0, r: 4, k: 'stat', g: 0, keep: 1, dmg: 2, step: statue }); }
  var PAT = {
    t: [
      function (b, dt, l, s) { every(b, dt, 'a', .42, function () { b.add({ x: rnd(4, l.bw - 4), y: -4, vx: 0, vy: rnd(38, 52) * s, r: 3, k: 'tag', ph: rnd(0, 6), step: function (o, d) { o.x += Math.sin(o.t * 3 + o.ph) * 16 * d; } }); }); },
      function (b, dt, l, s) { every(b, dt, 'a', 1.5, function () { var g = rnd(16, l.bw - 16); for (var x = 3; x < l.bw; x += 6) if (Math.abs(x - g) > 13) b.add({ x: x, y: -3, vx: 0, vy: 30 * s, r: 3, k: 'map' }); }); },
      function (b, dt, l, s) { every(b, dt, 'a', .5, function () { var p = edge(l), v = aim(b, p, 46 * s); b.add({ x: p[0], y: p[1], vx: v[0], vy: v[1], r: 3, k: 'step' }); }); }
    ],
    X: [
      function (b, dt, l, s) { every(b, dt, 'a', .7, function () { b.add({ x: rnd(10, l.bw - 10), y: -4, vx: rnd(-14, 14), vy: 20 * s, ay: 70 * s, r: 3, k: 'flask', step: function (o, d, b2, l2) { if (o.y >= l2.bh - 3) { o.dead = true; [-1, 0, 1].forEach(function (k) { b2.add({ x: o.x, y: l2.bh - 4, vx: k * 38 * s, vy: -62 * s, ay: 90, r: 2, k: 'drop', life: 1.6 }); }); } } }); }); },
      function (b, dt, l, s) { if (!b.ps.init) { b.ps.init = 1; [-1, 1].forEach(function (k) { b.add({ x: l.bw / 2 + k * 40, y: 14, vx: k * 52 * s, vy: 44 * s, r: 7, k: 'blob', keep: 1, step: bounce }); }); } },
      function (b, dt, l, s) { every(b, dt, 'a', .6, function () { b.add({ x: rnd(8, l.bw - 8), y: l.bh + 4, vx: 0, vy: -34 * s, r: 4, k: 'bub', top: rnd(l.bh * .2, l.bh * .6), step: function (o, d, b2) { if (o.y < o.top) { o.dead = true; [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (v) { b2.add({ x: o.x, y: o.y, vx: v[0] * 26 * s, vy: v[1] * 26 * s, r: 2, k: 'drop', life: 2.4 }); }); } } }); }); }
    ],
    M: [
      function (b, dt, l, s) { every(b, dt, 'a', .45, function () { var L = Math.random() < .5; b.add({ x: L ? -4 : l.bw + 4, y: rnd(4, l.bh - 4), vx: (L ? 1 : -1) * 72 * s, vy: 0, r: 3, k: 'slip' }); }); },
      function (b, dt, l, s) { every(b, dt, 'a', 2, function () { var g = rnd(14, l.bh - 14); for (var y = 2; y < l.bh; y += 6) if (Math.abs(y - g) > 12) b.add({ x: -4, y: y, vx: 50 * s, vy: 0, r: 3, k: 'rule' }); }); },
      function (b, dt, l, s) { every(b, dt, 'a', 1.15, function () { var n = Math.floor(l.bw / 16), gap = Math.random() * (n - 1) | 0; for (var c = 0; c < n; c++) if (c !== gap && c !== gap + 1) b.add({ x: 8 + c * 16, y: -4, vx: 0, vy: 30 * s, r: 3, k: 'bang' }); }); }
    ],
    Q: [
      function (b, dt, l) { every(b, dt, 'a', 1.1, function () { addStatue(b, l); }); },
      function (b, dt, l) { every(b, dt, 'a', 1, function () { addStatue(b, l); }); var p = b.ps; p.dk = (p.dk || 0) + dt; var cyc = p.dk % 3.1; b.dark = cyc > 2.2 ? 1 : 0; },
      function (b, dt, l, s) { every(b, dt, 'a', .24, function () { b.add({ x: rnd(3, l.bw - 3), y: -3, vx: 0, vy: 62 * s, r: 2, k: 'tear' }); }); every(b, dt, 'b', 1.8, function () { addStatue(b, l); }); }
    ]
  };

  // Traveller kinds: the echo's footprints mirror your every move; the burdened one's suitcases bounce.
  function mirror(o, dt, b, l) { var m = b.lmv || { x: 0, y: 0 }; o.x = clamp(o.x - m.x * 1.1, 2, l.bw - 2); o.y = clamp(o.y - m.y * 1.1, 2, l.bh - 2); var dx = b.fx - o.x, dy = b.fy - o.y, d = Math.hypot(dx, dy) || 1; o.x += dx / d * (b.wind ? 40 : 8) * dt; o.y += dy / d * (b.wind ? 40 : 8) * dt; }
  function suitcase(o, dt, b, l) { if (o.y > l.bh - o.r && o.vy > 0) { o.vy = -o.vy * .62; o.n++; if (o.n > 2) o.dead = true; } if ((o.x < o.r && o.vx < 0) || (o.x > l.bw - o.r && o.vx > 0)) o.vx = -o.vx; }
  var PATV = {
    echo: [PAT.t[2], function (b, dt, l) {
      var add = function () { var p = [rnd(6, l.bw - 6), rnd(6, l.bh - 6)]; if (Math.hypot(p[0] - b.fx, p[1] - b.fy) < 34) p[1] = (p[1] + l.bh / 2) % l.bh; b.add({ x: p[0], y: p[1], vx: 0, vy: 0, r: 3, k: 'step', keep: 1, step: mirror }); };
      if (!b.ps.init) { b.ps.init = 1; for (var i = 0; i < 6; i++) add(); }
      every(b, dt, 'a', 1.3, function () { if (b.bul.length < 11) add(); });
    }, PAT.t[1]],
    burden: [PAT.t[0], function (b, dt, l, s) { every(b, dt, 'a', .8, function () { b.add({ x: rnd(10, l.bw - 10), y: -6, vx: rnd(-30, 30) * s, vy: 10, ay: 90 * s, r: 5, k: 'case', n: 0, keep: 1, step: suitcase }); }); }, PAT.t[1]]
  };
  // The final boss, three phases (one list each): 1 the darkness eats your light, catch embers;
  // 2 it calls on everything you've met; 3 the darkness peels away in sweeping beams and rings.
  function darkLight(b, dt, l) { b.lightB = Math.max(.3, b.lightB - dt * .1); every(b, dt, 'e', 1.5, function () { b.add({ x: rnd(10, l.bw - 10), y: -4, vx: 0, vy: 26, r: 3, k: 'ember', good: 1 }); }); }
  function beam(b, l) { var h = Math.random() < .5; b.beams.push({ h: h, v: h ? rnd(6, l.bh - 6) : rnd(6, l.bw - 6), t: 0 }); }
  function orbRing(b, l, s) { b.ps.rot = (b.ps.rot || 0) + .5; for (var i = 0; i < 6; i++) { var a = b.ps.rot + i * 1.047; b.add({ x: l.bw / 2, y: l.bh / 2, vx: Math.cos(a) * 34 * s, vy: Math.sin(a) * 34 * s, r: 3, k: 'orb' }); } }
  var PATF = [
    [
      function (b, dt, l, s) { darkLight(b, dt, l); every(b, dt, 'a', .55, function () { var p = edge(l), v = aim(b, p, 40 * s); b.add({ x: p[0], y: p[1], vx: v[0], vy: v[1], r: 3, k: 'wisp', ph: rnd(0, 6), step: function (o, d) { o.x += Math.sin(o.t * 6 + o.ph) * 20 * d; } }); }); },
      function (b, dt, l, s) { darkLight(b, dt, l); every(b, dt, 'a', .3, function () { b.add({ x: rnd(3, l.bw - 3), y: -4, vx: rnd(-10, 10), vy: rnd(40, 56) * s, r: 3, k: 'orb' }); }); }
    ],
    [PAT.t[2], PAT.X[0], PAT.M[0], PAT.Q[0], PAT.X[1], PAT.t[0]],
    [
      function (b, dt, l, s) { every(b, dt, 'a', 1.15 / s, function () { beam(b, l); }); },
      function (b, dt, l, s) { every(b, dt, 'a', .55, function () { orbRing(b, l, s); }); },
      function (b, dt, l, s) { every(b, dt, 'a', 1.7 / s, function () { beam(b, l); }); every(b, dt, 'b', .9, function () { orbRing(b, l, s); }); }
    ]
  ];
  class Battle {
    constructor(z, k, e, cb) {
      this.z = z; this.k = k; this.e = e; this.cb = cb; this.D = BDEF[k];
      this.seal = this.D.seal; this.calm = 0; this.used = {}; this.ai = 0; this.angry = 0;
      this.st = 'idle'; this.t = 0; this.bul = []; this.parts = []; this.pops = []; this.ps = {};
      this.fx = 0; this.fy = 0; this.fd = [0, -1]; this.shield = 0; this.spin = 0; this.spinCd = 0; this.dark = 0; this.hitT = 0;
      this.wp = z.run.weapon || 'lantern'; this.ph = 1; this.lightB = 1; this.beams = [];
    }
    lay() {
      var W = this.z.W, H = this.z.H, bw = Math.min(170, Math.round(W * .44)), bh = Math.min(92, Math.round(H * .36)), ey = Math.round(H * .4);
      return { W: W, H: H, ey: ey, bw: bw, bh: bh, bx: Math.round((W - bw) / 2), by: ey + 10 };
    }
    add(o) { o.t = 0; this.bul.push(o); return o; }
    burst(x, y, n, cols) { if (reduce) n = Math.ceil(n / 3); for (var i = 0; i < n; i++) { var a = rnd(0, 6.28), s = rnd(10, 40); this.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, .7), col: pick(cols) }); } }
    pop(s, col, x, y) { var l = this.lay(); this.pops.push({ s: s, col: col || '#fbc75a', x: x != null ? x : l.W / 2, y: y != null ? y : l.ey - 50, life: 1.1 }); }
    // the enemy's turn
    dodge(onEnd) {
      this.wind = false;
      var l = this.lay();
      this.st = 'pre'; this.t = 0; this.bul = []; this.ps = {}; this.fx = l.bw / 2; this.fy = l.bh * .62; this.fd = [0, -1];
      this.shield = 0; this.shUsed = false; this.spin = 0; this.spinCd = 0; this.dark = 0; this.wh = { st: 0, t: 2.4 };
      this.pat = this.ai % 3;
      if (this.k === 'F') { var fl = PATF[this.ph - 1]; this.patFn = fl[this.ai % fl.length]; } else this.patFn = (this.k === 't' && PATV[this.e.v] ? PATV[this.e.v] : PAT[this.k])[this.pat];
      this.beamOn = this.patFn === PAT.Q[0] || this.k === 'Q'; this.lightB = 1; this.beams = []; this.ai++;
      this.spd = (this.angry ? 1.3 : 1) * (1 - this.calm * .0025) * (1 + this.z.lv * .05); this.angry = 0;
      this.onEnd = onEnd;
    }
    special() {
      if (this.st !== 'dodge') return;
      if (this.wp === 'wand' && !this.shUsed) { this.shUsed = true; this.shield = 2.2; this.burst(this.fx, this.fy, 10, ['#cdb6f2', '#efe8ff']); }
      else if (this.wp === 'yoyo' && this.spinCd <= 0) { this.spin = .75; this.spinCd = 2.4; }
    }
    _hit(n) {
      var z = this.z;
      if (z.inv > 0) return;
      if (this.shield > 0) { this.shield = 0; z.inv = .6; this.burst(this.fx, this.fy, 14, ['#cdb6f2', '#efe8ff']); return; }
      z.hurt(n); this.hitT = .3; this.burst(this.fx, this.fy, 10, ['#f39a4a', '#eceaf6']);
    }
    // your Banish turn: each weapon attacks differently
    attack(onEnd) {
      this.st = 'atk'; this.t = 0; this.onEnd = onEnd; var P = 'hvVAo';
      if (this.wp === 'wand') this.at = { seq: [pick(P), pick(P), pick(P), pick(P)], i: 0, lim: 4.6, dmg: 0 };
      else if (this.wp === 'yoyo') this.at = { i: 0, n: 3, t: 0, dur: .95, zone: rnd(.45, .8), w: .2, dmg: 0 };
      else this.at = { g: pick(P), i: 0, n: 2, t: 0, lim: 2.4, dmg: 0 };
    }
    input(g) {
      if (this.st !== 'atk' || this.wp === 'yoyo') return;
      var a = this.at, l = this.lay();
      if (this.wp === 'wand') {
        if (g && g === a.seq[a.i]) { a.i++; a.dmg++; this.burst(l.W / 2, l.by + l.bh / 2, 8, ['#cdb6f2', '#efe8ff']); if (a.i >= a.seq.length) { a.dmg++; this.pop('PERFECT', '#cdb6f2'); this._atkEnd(); } }
        else { this.pop('MISS', '#8c7fae'); this._atkEnd(); }
        return;
      }
      if (g && g === a.g) { var d = a.t < 1.1 ? 2 : 1; a.dmg += d; this.pop(d > 1 ? 'FAST x2' : 'HIT', '#fbc75a'); this.burst(l.W / 2, l.by + l.bh / 2, 12, ['#fbc75a', '#fff4dc']); }
      else this.pop('MISS', '#8c7fae');
      this._nextTrace();
    }
    tap() {
      if (this.st !== 'atk' || this.wp !== 'yoyo') return;
      var a = this.at, p = a.t / a.dur, off = Math.abs(p - a.zone);
      if (off < a.w / 6) { a.dmg += 2; this.pop('PERFECT', '#fbc75a'); }
      else if (off < a.w / 2) { a.dmg += 1; this.pop('HIT', '#efe8ff'); }
      else this.pop('MISS', '#8c7fae');
      this._nextSwing();
    }
    _nextTrace() { var a = this.at; a.i++; a.t = 0; if (a.i >= a.n) this._atkEnd(); else { var o = a.g; while (a.g === o) a.g = pick('hvVAo'); } }
    _nextSwing() { var a = this.at; a.i++; a.t = 0; a.dur *= .88; a.zone = rnd(.4, .85); if (a.i >= a.n) this._atkEnd(); }
    _atkEnd() {
      var a = this.at, d = a.dmg; this.st = 'post'; this.t = 0;
      if (d > 0) { this.seal = Math.max(0, this.seal - d); this.e.hit = .3; this.z.shake = .3; this.pop('-' + d, '#f39a4a', this.lay().W / 2, this.lay().ey - 30); }
      this.atkDmg = d;
    }
    update(dt, mv) {
      var self = this, l = this.lay(), z = this.z;
      this.t += dt; this.hitT = Math.max(0, this.hitT - dt);
      z.inv = Math.max(0, z.inv - dt); z.shake = Math.max(0, z.shake - dt); z.t += dt; z._tick(dt);
      this.e.hit = Math.max(0, (this.e.hit || 0) - dt);
      this.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.life -= dt; }); this.parts = this.parts.filter(function (p) { return p.life > 0; });
      this.pops.forEach(function (p) { p.y -= 10 * dt; p.life -= dt; }); this.pops = this.pops.filter(function (p) { return p.life > 0; });
      if (this.st === 'post' && this.t > .8) { this.st = 'idle'; var f = this.onEnd; this.onEnd = null; f && f(this.atkDmg); return; }
      if (this.st === 'atk') {
        var a = this.at; a.t += dt; if (this.wp === 'wand') a.tt = (a.tt || 0) + dt;
        if (this.wp === 'yoyo' && a.t > a.dur) { this.pop('MISS', '#8c7fae'); this._nextSwing(); }
        else if (this.wp === 'wand' && a.tt > a.lim) { this.pop('TIME', '#8c7fae'); this._atkEnd(); }
        else if (this.wp === 'lantern' && a.t > a.lim) { this.pop('MISS', '#8c7fae'); this._nextTrace(); }
        return;
      }
      if (this.st === 'pre') { if (this.t > .9) { this.st = 'dodge'; this.t = 0; this.onStart && this.onStart(); } return; }
      if (this.st !== 'dodge') return;
      // the flame
      this.lmv = mv; var moved = Math.abs(mv.x) + Math.abs(mv.y) > .05;
      if (moved) { var m = Math.hypot(mv.x, mv.y); this.fd = [mv.x / m, mv.y / m]; }
      // Hall Monitor: everything freezes at the whistle, and so must you
      var frozen = false;
      if (this.k === 'M') {
        var w = this.wh; w.t -= dt;
        if (w.t <= 0) { w.st = (w.st + 1) % 3; w.t = [2.6, .6, 1.1][w.st]; w.pen = false; }
        frozen = w.st === 2;
        if (frozen && moved && !w.pen) { w.pen = true; this._hit(1); this.pop('!', '#f39a4a', l.W / 2, l.by - 6); }
      }
      this.fx = clamp(this.fx + mv.x, 3, l.bw - 3); this.fy = clamp(this.fy + mv.y, 3, l.bh - 3);
      if (!this.wind && this.t >= this.D.dur) { this.wind = true; this.bul.forEach(function (b) { if (b.k === 'blob') b.keep = 0; }); }
      if (!frozen && !this.wind) this.patFn(this, dt, l, this.spd);
      this.beams.forEach(function (m) { m.t += dt; if (m.t > .75 && m.t < 1.1 && Math.abs((m.h ? self.fy : self.fx) - m.v) < 4) self._hit(self.D.dmg); });
      this.beams = this.beams.filter(function (m) { return m.t < 1.15; });
      this.spinCd = Math.max(0, this.spinCd - dt); this.shield = Math.max(0, this.shield - dt);
      this.bul.forEach(function (b) {
        if (frozen) return;
        var k = self.wp === 'lantern' && Math.hypot(b.x - self.fx, b.y - self.fy) < 24 ? .55 : 1, d = dt * k;
        b.t += d; b.vy += (b.ay || 0) * d; b.x += b.vx * d; b.y += b.vy * d;
        if (b.step) b.step(b, d, self, l);
        if (b.life != null && (b.life -= dt) <= 0) b.dead = true;
        if (!b.keep && (b.x < -12 || b.x > l.bw + 12 || b.y < -12 || b.y > l.bh + 12)) b.dead = true;
      });
      if (this.spin > 0) {
        this.spin -= dt; var sx = this.fx + Math.cos(this.t * 15) * 13, sy = this.fy + Math.sin(this.t * 15) * 13;
        this.bul.forEach(function (b) { if (!b.dead && Math.hypot(b.x - sx, b.y - sy) < b.r + 4) { b.dead = true; self.burst(b.x, b.y, 4, ['#f5a8c8', '#efe8ff']); } });
      }
      this.bul.forEach(function (b) { if (!b.dead && b.good && Math.hypot(b.x - self.fx, b.y - self.fy) < b.r + 4) { b.dead = true; self.lightB = Math.min(1, self.lightB + .35); self.burst(b.x, b.y, 10, ['#fbc75a', '#fff4dc']); } });
      this.bul.forEach(function (b) { if (!b.dead && !b.good && Math.hypot(b.x - self.fx, b.y - self.fy) < b.r + 2) { if (b.k !== 'stat' || self.wind) b.dead = true; else b.x += (b.x - self.fx) * 2, b.y += (b.y - self.fy) * 2; self._hit(b.dmg || self.D.dmg); } });
      this.bul = this.bul.filter(function (b) { return !b.dead; });
      var left = this.bul.some(function (b) { return !b.good; }) || this.beams.length;
      if (this.wind && left && this.t >= this.D.dur + 10) { this.bul.forEach(function (b) { self.burst(b.x, b.y, 4, ['#a7a5b6', '#efe8ff']); }); left = 0; }
      if (this.wind && !left) { this.st = 'idle'; this.wind = false; this.bul = []; this.beams = []; this.dark = 0; this.lightB = 1; var f = this.onEnd; this.onEnd = null; f && f(); }
    }
    draw() {
      var z = this.z, x = z.x, l = this.lay(), W = l.W, H = l.H, t = z.t, A = z.A, self = this;
      x.imageSmoothingEnabled = false;
      x.save();
      if (z.shake > 0 && !reduce) x.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-1, 1)));
      if (z.bg) x.drawImage(z.bg, z.cam || 0, 0, W, H, 0, 0, W, H);
      x.fillStyle = this.dark ? 'rgba(3,2,10,.95)' : 'rgba(7,5,15,.84)'; x.fillRect(-4, -4, W + 8, H + 8);
      var g = x.createRadialGradient(W / 2, l.ey - 30, 4, W / 2, l.ey - 30, Math.max(60, H * .45)); g.addColorStop(0, 'rgba(90,63,150,.32)'); g.addColorStop(1, 'rgba(90,63,150,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      // the enemy
      var e = this.e, cx = Math.round(W / 2 + (e.hit > 0 && !reduce ? rnd(-2, 2) : 0)), by = l.ey, maxH = Math.max(40, l.ey - 26), bob = reduce ? 0 : Math.round(Math.sin(t * 2) * 2);
      var ea = this.st === 'dead' ? .4 : this.st === 'won' ? Math.max(0, 1 - this.t * .9) : 1; x.globalAlpha = ea;
      if (this.k === 'X' && !A.bexp.idle) blob(x, cx, by, Math.min(26, Math.round(maxH / 2.3)), t, e.hit > 0);
      else if (this.k === 'F') {
        var FA = A.final, fs2 = this.fin ? FA.freed[0] : FA.real && FA.cast && (this.st === 'pre' || this.st === 'dodge') ? FA.cast[Math.min(FA.cast.length - 1, (t * 3 | 0) % FA.cast.length)] : FA.idle[reduce ? 0 : (t * 5 | 0) % FA.idle.length];
        if (!this.fin && !reduce) for (var j = 0; j < 8; j++) { var a2 = t * 1.4 + j * .785, r2 = 30 + Math.sin(t * 2 + j) * 6 + (3 - this.ph) * 6; x.fillStyle = j % 2 ? 'rgba(20,13,42,.85)' : 'rgba(90,63,150,.7)'; x.fillRect(Math.round(cx + Math.cos(a2) * r2), Math.round(by - 36 + Math.sin(a2) * r2 * .7), 4, 4); }
        var BF = A.bfinal; if (!this.fin && BF['p' + this.ph]) { var bfa = e.hit > 0 && BF.hurt ? BF.hurt : BF['p' + this.ph]; fs2 = bfa[reduce ? 0 : (t * 2 | 0) % bfa.length]; }
        else if (e.hit > 0) fs2 = tint(fs2, '#ffffff', .55);
        x.globalAlpha = ea; fitSpr(x, fs2, cx, by + (reduce ? 0 : bob), maxH); x.globalAlpha = 1;
      }
      else {
        var bs = this.bSpr(t), spr = bs ? bs : this.k === 't' ? vSpr(A.trav.idle[(t * 2 | 0) % 2], e.v === 'lost' ? null : e.v) : this.k === 'M' ? (e.hit > 0 ? A.monitor.hit[0] : A.monitor.idle[(t * 2.5 | 0) % 2]) : A.mother[this.dark ? 'lunge' : 'cover'][Math.min(3, Math.floor((1 - this.seal / this.D.seal) * 4))];
        if (e.hit > 0 && this.k !== 'M' && !bs) spr = tint(spr, '#ffffff', .55);
        if (this.k === 't') x.globalAlpha = .85 * ea;
        fitSpr(x, spr, cx, by + (this.k === 'M' ? bob : 0), maxH);
        x.globalAlpha = 1;
      }
      x.globalAlpha = 1;
      // the box
      if (this.st === 'pre' || this.st === 'dodge' || this.st === 'atk' || this.st === 'post') {
        var bx = l.bx, byy = l.by, frz = this.k === 'M' && this.st === 'dodge' && this.wh.st;
        x.fillStyle = '#05030b'; x.fillRect(bx, byy, l.bw, l.bh);
        x.fillStyle = frz === 2 ? '#f0566a' : frz === 1 && (t * 10 | 0) % 2 ? '#f39a4a' : '#efe8ff';
        x.fillRect(bx - 2, byy - 2, l.bw + 4, 2); x.fillRect(bx - 2, byy + l.bh, l.bw + 4, 2); x.fillRect(bx - 2, byy, 2, l.bh); x.fillRect(bx + l.bw, byy, 2, l.bh);
        x.fillStyle = '#5a3f96'; x.fillRect(bx + 1, byy + 1, l.bw - 2, 1); x.fillRect(bx + 1, byy + l.bh - 2, l.bw - 2, 1); x.fillRect(bx + 1, byy + 1, 1, l.bh - 2); x.fillRect(bx + l.bw - 2, byy + 1, 1, l.bh - 2);
        if (frz === 1) ptext(x, '!', bx + l.bw / 2 - 1, byy - 9, '#f39a4a');
        x.save(); x.beginPath(); x.rect(bx, byy, l.bw, l.bh); x.clip(); x.translate(bx, byy);
        if (this.st === 'dodge' || this.st === 'pre') this._drawDodge(x, l, t);
        else this._drawAtk(x, l, t);
        x.restore();
      }
      // hearts and candy, top left
      var hw = hearts(x, z.hp, z.maxHp), i;
      if (z.ward) { x.fillStyle = '#fbc75a'; x.fillRect(hw, 5, 3, 5); }
      for (i = 0; i < (z.candy || 0); i++) { x.fillStyle = '#f5a8c8'; x.fillRect(5 + i * 8, 14, 4, 4); x.fillStyle = '#fff4dc'; x.fillRect(6 + i * 8, 15, 1, 1); x.fillStyle = '#f5a8c8'; x.fillRect(3 + i * 8, 15, 1, 2); x.fillRect(9 + i * 8, 15, 1, 2); }
      this.parts.forEach(function (p) { x.globalAlpha = Math.min(1, p.life * 2); x.fillStyle = p.col; x.fillRect(Math.round(l.bx + p.x), Math.round(l.by + p.y), 1, 1); }); x.globalAlpha = 1;
      this.pops.forEach(function (p) { x.globalAlpha = Math.min(1, p.life * 2); ptext(x, p.s, Math.round(p.x - p.s.length * 2), Math.round(p.y), p.col); }); x.globalAlpha = 1;
      x.restore();
      // the stroke being drawn (Banish with the lantern or the wand)
      var tr = z.trail;
      if (tr.length > 1) {
        x.globalAlpha = z.trailLife > 0 ? clamp(z.trailLife / .35, 0, 1) : 1;
        x.fillStyle = this.wp === 'wand' ? 'rgba(205,182,242,.4)' : 'rgba(180,144,239,.35)'; for (i = 1; i < tr.length; i++) line(x, tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y, 3);
        x.fillStyle = this.wp === 'wand' ? '#efe8ff' : '#fbc75a'; for (i = 1; i < tr.length; i++) line(x, tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y, 1);
        x.globalAlpha = 1;
      }
    }
    // The battle-sheet frame for this enemy (null while the sheet loads): attack while it attacks, hurt when hit, calm once it can be freed.
    bSpr(t) {
      var A = this.z.A, e = this.e, S = this.k === 't' ? A.btrav[e.v || 'lost'] : this.k === 'M' ? A.bmon : this.k === 'X' ? A.bexp : this.k === 'Q' ? A.bmother : null;
      if (!S || !S.idle) return null;
      var pick = function (a, sp) { return a[reduce ? 0 : (t * sp | 0) % a.length]; };
      if (e.hit > 0 && S.hurt && this.k !== 'Q') return S.hurt[0];
      if (this.calm >= 100 && S.calm) return S.calm[0];
      if (this.k === 'Q') { var lv = Math.min(3, Math.floor((1 - this.seal / this.D.seal) * 4)); if (this.dark) return pick(S.attack, 2); return lv > 0 && S.crack ? S.crack[Math.min(S.crack.length - 1, lv - 1)] : pick(S.idle, 1.5); }
      if (this.k === 'M') { if (this.st === 'dodge' && this.wh.st) return pick(S.attack, 6); return pick(S.idle, 2); }
      if ((this.st === 'dodge' || this.st === 'pre') && S.attack) return pick(S.attack, 3);
      return pick(S.idle, this.k === 'X' ? 3 : 2);
    }
    _drawDodge(x, l, t) {
      var self = this, fx = Math.round(this.fx), fy = Math.round(this.fy);
      if (this.wp === 'lantern') { var g = x.createRadialGradient(fx, fy, 2, fx, fy, 24); g.addColorStop(0, 'rgba(251,199,90,.22)'); g.addColorStop(1, 'rgba(251,199,90,0)'); x.fillStyle = g; x.fillRect(fx - 24, fy - 24, 48, 48); }
      if (this.beamOn && !this.dark) {
        var a = Math.atan2(this.fd[1], this.fd[0]); x.fillStyle = 'rgba(251,199,90,.16)'; x.beginPath(); x.moveTo(fx, fy); x.arc(fx, fy, 50, a - .64, a + .64); x.closePath(); x.fill();
      }
      var FX = this.z.A.fx, FXK = { tag: ['t', 0], map: ['t', 1], step: ['t', 2], flask: ['X', 0], drop: ['X', 1], blob: ['X', 2], bub: ['X', 3], slip: ['M', 0], rule: ['M', 1], bang: ['M', 2], tear: ['Q', 3], wisp: ['F', 0], orb: ['F', 1], ember: ['F', 2] };
      this.bul.forEach(function (b) {
        var bx = Math.round(b.x), by = Math.round(b.y), fk = b.k === 'stat' ? ['Q', b.lit ? (b.g > .4 ? 2 : 1) : 0] : FXK[b.k], fi = fk && FX[fk[0]] && FX[fk[0]][fk[1]];
        if (fi) { var fs = b.r > 4 ? Math.max(12, b.r * 2 + 4) : 12; if (fs === 12) x.drawImage(fi, bx - 6, by - 6); else x.drawImage(fi, Math.round(bx - fs / 2), Math.round(by - fs / 2), fs, fs); }
        else if (b.k === 'tag') { x.fillStyle = '#e2cf98'; x.fillRect(bx - 2, by - 2, 5, 4); x.fillStyle = '#7a6236'; x.fillRect(bx - 1, by - 1, 1, 1); }
        else if (b.k === 'map') { x.fillStyle = '#cdb6f2'; x.fillRect(bx - 3, by - 1, 6, 2); }
        else if (b.k === 'step') { x.fillStyle = '#a9c4d6'; x.fillRect(bx - 1, by - 2, 3, 4); x.fillRect(bx - 1, by - 3, 1, 1); }
        else if (b.k === 'flask') { x.fillStyle = '#c9f29b'; x.fillRect(bx - 2, by - 1, 5, 4); x.fillStyle = '#eceaf6'; x.fillRect(bx - 1, by - 3, 3, 2); }
        else if (b.k === 'drop' || b.k === 'blob' || b.k === 'bub') disc(x, bx, by, b.r, b.k === 'bub' ? '#9be37f' : '#6cc45b', b.k === 'bub' ? '#eaffd8' : '#c9f29b');
        else if (b.k === 'slip') { x.fillStyle = '#efe8ff'; x.fillRect(bx - 3, by - 2, 6, 4); x.fillStyle = '#f0566a'; x.fillRect(bx - 2, by - 1, 4, 1); }
        else if (b.k === 'rule') { x.fillStyle = '#fbc75a'; x.fillRect(bx - 1, by - 3, 3, 6); }
        else if (b.k === 'bang') ptext(x, '!', bx - 1, by - 2, '#f39a4a');
        else if (b.k === 'case') { x.fillStyle = '#1a1230'; x.fillRect(bx - 5, by - 4, 11, 8); x.fillStyle = '#9c6b3e'; x.fillRect(bx - 4, by - 3, 9, 6); x.fillStyle = '#c9a46a'; x.fillRect(bx - 4, by - 1, 9, 1); x.fillStyle = '#1a1230'; x.fillRect(bx - 1, by - 6, 3, 2); }
        else if (b.k === 'tear') { x.fillStyle = '#d9d7e4'; x.fillRect(bx, by - 2, 1, 3); }
        else if (b.k === 'ember') { x.fillStyle = '#eb9a12'; x.fillRect(bx - 2, by - 1, 5, 4); x.fillStyle = '#fbc75a'; x.fillRect(bx - 1, by - 3, 3, 5); x.fillStyle = '#fff4dc'; x.fillRect(bx, by - 1, 1, 2); }
        else if (b.k === 'wisp') { x.fillStyle = '#5a3f96'; x.fillRect(bx - 2, by - 2, 5, 5); x.fillStyle = '#b490ef'; x.fillRect(bx - 1, by - 1, 3, 3); x.fillStyle = '#efe8ff'; x.fillRect(bx, by - 1, 1, 1); }
        else if (b.k === 'orb') { disc(x, bx, by, 3, '#2a1d4a'); x.fillStyle = '#b490ef'; x.fillRect(bx - 1, by - 1, 2, 2); }
        else if (b.k === 'stat') {
          x.fillStyle = b.lit ? '#d9d7e4' : '#85839a'; x.fillRect(bx - 3, by - 4, 7, 8); x.fillStyle = '#5f5d74'; x.fillRect(bx - 3, by + 3, 7, 1);
          if (b.lit) { x.fillStyle = '#a7a5b6'; x.fillRect(bx - 2, by - 2, 2, 1); x.fillRect(bx + 1, by - 2, 2, 1); if (b.g > .4) { x.fillStyle = '#3a3358'; x.fillRect(bx, by - 4, 1, 3 + Math.round(b.g * 4)); } }
          else { x.fillStyle = '#1a1230'; x.fillRect(bx - 2, by - 2, 1, 2); x.fillRect(bx + 2, by - 2, 1, 2); }
        }
      });
      this.beams.forEach(function (m) {
        var on = m.t > .75, w = on ? 5 : 1; x.fillStyle = on ? '#5a3f96' : (t * 12 | 0) % 2 ? 'rgba(180,144,239,.7)' : 'rgba(180,144,239,.25)';
        if (m.h) x.fillRect(0, Math.round(m.v - w / 2), l.bw, w); else x.fillRect(Math.round(m.v - w / 2), 0, w, l.bh);
        if (on) { x.fillStyle = '#efe8ff'; if (m.h) x.fillRect(0, Math.round(m.v), l.bw, 1); else x.fillRect(Math.round(m.v), 0, 1, l.bh); }
      });
      // phase 1 of the final boss: darkness closes in on your flame until you catch an ember
      if (this.k === 'F' && this.ph === 1 && this.st === 'dodge') { var rr = 16 + 52 * this.lightB, dg = x.createRadialGradient(fx, fy, rr * .55, fx, fy, rr); dg.addColorStop(0, 'rgba(3,2,10,0)'); dg.addColorStop(1, 'rgba(3,2,10,.96)'); x.fillStyle = dg; x.fillRect(0, 0, l.bw, l.bh); this.bul.forEach(function (b) { if (b.k === 'ember') { x.fillStyle = '#fbc75a'; x.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 3, 4); } }); }
      if (this.st !== 'dodge') return;
      if (this.shield > 0) { x.fillStyle = 'rgba(205,182,242,' + (this.shield < .5 && (t * 10 | 0) % 2 ? .2 : .55) + ')'; ring(x, fx, fy, 7); }
      if (this.spin > 0) { var sx = Math.round(fx + Math.cos(this.t * 15) * 13), sy = Math.round(fy + Math.sin(this.t * 15) * 13); x.fillStyle = 'rgba(239,232,255,.5)'; line(x, fx, fy, sx, sy); disc(x, sx, sy, 3, '#f5a8c8', '#fff4dc'); }
      if (this.z.inv > 0 && (t * 14 | 0) % 2) return;
      var fl = reduce ? 0 : (t * 10 | 0) % 2;
      x.fillStyle = '#eb9a12'; x.fillRect(fx - 2, fy - 1, 5, 4); x.fillStyle = '#fbc75a'; x.fillRect(fx - 1, fy - 3 - fl, 3, 6 + fl); x.fillStyle = '#fff4dc'; x.fillRect(fx, fy - 1, 1, 2);
    }
    _drawAtk(x, l, t) {
      var a = this.at, cx = Math.round(l.bw / 2), cy = Math.round(l.bh / 2);
      if (!a) return;
      if (this.wp === 'yoyo') {
        var x0 = 8, x1 = l.bw - 8, zx = x0 + (x1 - x0) * a.zone, zw = (x1 - x0) * a.w;
        x.fillStyle = '#3a2b62'; x.fillRect(x0, cy, x1 - x0, 1);
        x.fillStyle = 'rgba(251,199,90,.35)'; x.fillRect(Math.round(zx - zw / 2), cy - 8, Math.round(zw), 17); x.fillStyle = '#fbc75a'; x.fillRect(Math.round(zx - zw / 12), cy - 8, Math.max(1, Math.round(zw / 6)), 17);
        if (this.st === 'atk') { var p = Math.min(1, a.t / a.dur), yx = Math.round(x0 + (x1 - x0) * p); x.fillStyle = '#efe8ff'; x.fillRect(x0, cy - 1, yx - x0, 1); disc(x, yx, cy, 4, '#f5a8c8', '#fff4dc'); }
        for (var i = 0; i < a.n; i++) { x.fillStyle = i < a.i ? '#5a3f96' : '#cdb6f2'; x.fillRect(cx - a.n * 4 + i * 8, l.bh - 7, 5, 3); }
        return;
      }
      if (this.wp === 'wand') {
        var n = a.seq.length, sx0 = cx - n * 10 + 3;
        a.seq.forEach(function (g, i) { glyph(x, g, sx0 + i * 20, cy - 7, i < a.i ? '#5a3f96' : i === a.i ? '#efe8ff' : '#9d8cc4', 2); });
        if (this.st === 'atk') { x.fillStyle = '#3a2b62'; x.fillRect(8, l.bh - 6, l.bw - 16, 2); x.fillStyle = '#cdb6f2'; x.fillRect(8, l.bh - 6, Math.round((l.bw - 16) * Math.max(0, 1 - (a.tt || 0) / a.lim)), 2); }
        return;
      }
      if (this.st === 'atk') {
        glyph(x, a.g, cx - 14, cy - 16, '#fbc75a', 4);
        x.fillStyle = '#3a2b62'; x.fillRect(8, l.bh - 6, l.bw - 16, 2); x.fillStyle = a.t < 1.1 ? '#fbc75a' : '#eb9a12'; x.fillRect(8, l.bh - 6, Math.round((l.bw - 16) * Math.max(0, 1 - a.t / a.lim)), 2);
      }
    }
  }
  function disc(x, cx, cy, r, col, hi) { for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); x.fillStyle = col; x.fillRect(cx - w, cy + y, w * 2 + 1, 1); } if (hi) { x.fillStyle = hi; x.fillRect(cx - Math.round(r / 2), cy - Math.round(r / 2), 1, 1); } }
  function ring(x, cx, cy, r) { for (var a = 0; a < 6.283; a += .2) x.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
  // Draw a sprite as large as it fits (whole-number zoom when it can), feet at by.
  function fitSpr(x, img, cx, by, maxH) {
    var k = img.height * 2 <= maxH ? 2 : img.height <= maxH + 14 ? 1 : (maxH + 14) / img.height, w = Math.round(img.width * k), h = Math.round(img.height * k);
    if (k < 1) { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; }
    x.drawImage(img, Math.round(cx - w / 2), Math.round(by - h), w, h); x.imageSmoothingEnabled = false;
  }
  // The flame bullet in front of battle text and next to the focused option.
  function flameIcon() { var Fl = ART && ART.ui && ART.ui.flame; if (Fl) { var fc = cnv(8, 12); fc.getContext('2d').drawImage(Fl[0], 0, 0); return fc; } var c = cnv(6, 8), x = c.getContext('2d'), p = function (a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); }; p(2, 0, 2, 1, '#fbc75a'); p(1, 1, 4, 2, '#fbc75a'); p(0, 3, 6, 4, '#eb9a12'); p(1, 3, 4, 4, '#fbc75a'); p(2, 4, 2, 3, '#fff4dc'); p(1, 7, 4, 1, '#eb9a12'); return c; }
  // 16x16 icons for Talk, Item and Free
  var UIX = { lantern: 0, wand: 1, yoyo: 2, talk: 3, item: 4, free: 5 };
  function uiIcon(k) {
    var I = ART && ART.ui && ART.ui.icons; if (!I || UIX[k] == null || !I[UIX[k] + 6]) return null;
    var w = document.createElement('span'); w.className = 'ic2';
    [I[UIX[k]], I[UIX[k] + 6]].forEach(function (s, j) { var c = cnv(24, 24); c.getContext('2d').drawImage(s, 0, 0); c.className = 'ic' + j; w.appendChild(c); });
    return w;
  }
  function aIcon(k) {
    var c = cnv(16, 16), x = c.getContext('2d'), p = function (a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (k === 'talk') { p(2, 2, 12, 1, INK); p(1, 3, 1, 7, INK); p(14, 3, 1, 7, INK); p(2, 10, 12, 1, INK); p(2, 3, 12, 7, '#efe8ff'); p(4, 11, 3, 1, INK); p(4, 11, 2, 2, '#efe8ff'); p(3, 13, 1, 1, INK); p(4, 6, 2, 2, '#5a3f96'); p(7, 6, 2, 2, '#5a3f96'); p(10, 6, 2, 2, '#5a3f96'); }
    else if (k === 'item') { p(4, 5, 8, 7, INK); p(5, 6, 6, 5, '#f5a8c8'); p(6, 7, 2, 1, '#fff4dc'); p(1, 6, 3, 1, INK); p(1, 10, 3, 1, INK); p(1, 7, 3, 3, '#f5a8c8'); p(12, 6, 3, 1, INK); p(12, 10, 3, 1, INK); p(12, 7, 3, 3, '#f5a8c8'); p(7, 9, 3, 1, '#d97aa3'); }
    else { p(7, 3, 2, 10, INK); p(2, 3, 5, 5, '#fbc75a'); p(9, 3, 5, 5, '#fbc75a'); p(3, 8, 4, 4, '#eb9a12'); p(9, 8, 4, 4, '#eb9a12'); p(3, 4, 2, 2, '#fff4dc'); p(11, 4, 2, 2, '#fff4dc'); p(6, 1, 1, 2, INK); p(9, 1, 1, 2, INK); }
    return c;
  }
  // Small weapon icons for the menu and the battle buttons.
  function wIcon(k) {
    var c = cnv(16, 16), x = c.getContext('2d'), p = function (a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (k === 'lantern') { p(6, 1, 4, 1, INK); p(5, 2, 1, 2, INK); p(10, 2, 1, 2, INK); p(4, 4, 8, 10, INK); p(5, 5, 6, 8, '#eb9a12'); p(6, 5, 4, 7, '#fbc75a'); p(7, 7, 2, 3, '#fff4dc'); p(4, 14, 8, 1, '#3a2b62'); }
    else if (k === 'wand') { for (var i = 0; i < 9; i++) { p(3 + i, 13 - i, 2, 2, i < 2 ? INK : '#6b4a2b'); } p(11, 1, 3, 5, '#fbc75a'); p(10, 2, 5, 3, '#fbc75a'); p(12, 0, 1, 7, '#fbc75a'); p(9, 3, 7, 1, '#fbc75a'); p(12, 3, 1, 1, '#fff4dc'); }
    else { p(8, 0, 1, 6, '#efe8ff'); p(5, 6, 7, 8, INK); p(4, 7, 9, 6, INK); p(5, 7, 7, 6, '#f5a8c8'); p(6, 6, 5, 8, '#f5a8c8'); p(5, 9, 7, 2, '#5a3f96'); p(7, 8, 1, 1, '#fff4dc'); }
    return c;
  }

  var WI = {};

  // ---- Full-screen game -----------------------------------------------------
  var CSS = '@font-face{font-family:"Cubic 11";src:url(' + PIXURL + ') format("woff2");font-display:swap}' +
    '.ae1031-root button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.ae1031-root button:focus-visible{outline:3px solid #fbc75a;outline-offset:2px}' +
    '.ae1031-root button:not(:disabled):hover{filter:brightness(1.18)}.ae1031-root button:not(:disabled):active{transform:translateY(2px)}' +
    '.ae1031-root .bact{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 6px;border:0;background:#0c0818;color:#cdb6f2;font-size:20px;letter-spacing:.06em;box-shadow:inset 0 0 0 3px #cdb6f2;' + PXC + '}' +
    '.ae1031-root .bact:not(:disabled):hover,.ae1031-root .bact:focus-visible,.ae1031-root .bact.on{color:#fbc75a;box-shadow:inset 0 0 0 3px #fbc75a;outline:none;filter:none}' +
    '.ae1031-root .ic2{display:inline-flex;flex:none}.ae1031-root .ic2 canvas{width:100%;height:100%;image-rendering:pixelated}.ae1031-root .ic2 .ic1{display:none}' +
    '.ae1031-root :is(button:not(:disabled):hover,button:focus-visible,button.on,button.ready,button[aria-pressed=true]) .ic2 .ic0{display:none}.ae1031-root :is(button:not(:disabled):hover,button:focus-visible,button.on,button.ready,button[aria-pressed=true]) .ic2 .ic1{display:block}' +
    '@media (max-width:520px){.ae1031-root .bacts{grid-template-columns:repeat(2,1fr)!important}.ae1031-root .bact{min-height:44px;font-size:18px}}' +
    '.ae1031-root .bact:disabled{opacity:.4;cursor:default}.ae1031-root .bact.ready{color:#fbc75a;box-shadow:inset 0 0 0 3px #fbc75a;animation:ae1031-blink 1s steps(2) infinite}' +
    '.ae1031-root .bopt{display:flex;align-items:center;gap:10px;min-height:38px;padding:0 4px;border:0;background:none;color:#efe8ff;font-size:20px;text-align:left}' +
    '.ae1031-root .bopt::before{content:"";flex:none;width:12px;height:16px;background:var(--ae-flame) center/contain no-repeat;image-rendering:pixelated;visibility:hidden}' +
    '.ae1031-root .bopt:not(:disabled):hover,.ae1031-root .bopt:focus-visible{color:#fbc75a;outline:none;filter:none}.ae1031-root .bopt:not(:disabled):hover::before,.ae1031-root .bopt:focus-visible::before{visibility:visible}' +
    '.ae1031-root .bopt:disabled{color:#5a4d80;cursor:default;text-decoration:line-through}' +
    '.ae1031-root .more{animation:ae1031-blink .8s steps(2) infinite}@keyframes ae1031-blink{50%{opacity:.35}}' +
    '.ae1031-root canvas{image-rendering:pixelated;image-rendering:crisp-edges}' +
    '.ae1031-root .pad{position:absolute;bottom:max(16px,env(safe-area-inset-bottom));width:64px;height:64px;border:0;background:rgba(12,8,24,.8);box-shadow:inset 0 0 0 3px #cdb6f2;' + PXC + ';color:#e9e0ff;font-size:22px;display:flex;align-items:center;justify-content:center;touch-action:none;-webkit-user-select:none;user-select:none}' +
    '.ae1031-root .pad:active,.ae1031-root .pad.on{background:#3a2b62;box-shadow:inset 0 0 0 3px #fbc75a;transform:translateY(2px)}' +
    '.ae1031-root .upg{display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center;width:100%;padding:10px 12px;border:0;background:#120c26;box-shadow:inset 0 0 0 3px #3a2b62;text-align:left}' +
    '@keyframes ae1031-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.ae1031-root *{animation:none!important;transition:none!important}}';
  function css() { if (document.getElementById('ae1031-css')) return; var t = document.createElement('style'); t.id = 'ae1031-css'; t.textContent = CSS; document.head.appendChild(t); }
  var BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border:0;background:#fbc75a;color:#2e2352;font-size:18px;letter-spacing:.04em;box-shadow:inset 0 0 0 3px #2e2352,inset 0 -7px 0 #eb9a12;' + PXC;
  var BTN2 = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 20px;border:0;background:#0c0818;color:#e9e0ff;font-size:17px;letter-spacing:.04em;box-shadow:inset 0 0 0 3px #cdb6f2;' + PXC;
  var ICON = 'position:absolute;top:max(12px,env(safe-area-inset-top));width:44px;height:44px;border:0;background:#0c0818;box-shadow:inset 0 0 0 3px #cdb6f2;' + PXC + ';color:#e9e0ff;font-size:16px;display:flex;align-items:center;justify-content:center;padding:0';
  var SAVE = 'ae1031-save2', SEEN = 'ae1031-seen';

  class Game {
    constructor(loc, onClose) {
      this.loc = loc; this.L = TX[loc]; this.onClose = onClose; this.girl = load('ae1031-pick') === 'girl';
      this.weapon = { wand: 1, yoyo: 1 }[load('ae1031-weapon')] ? load('ae1031-weapon') : 'lantern';
      this.bk = { l: 0, r: 0, u: 0, d: 0 }; this.dmv = { x: 0, y: 0 };
      this.seen = loadJ(SEEN) || {};
      this._ui();
      var self = this;
      this.h = new Zone(this.cv, {
        girl: this.girl, loc: loc,
        onBanner: function (s) { self.banner(s); },
        onTip: function (k) { self.tipShow(self.L[coarse && self.L[k + 'Touch'] ? k + 'Touch' : k]); },
        onNote: function (i) { self._note(NOTES[self.loc][i]); },
        onEmpty: function () { self.tipShow(self.L.empty, 1500); },
        onStolen: function () { self.banner(self.L.stolen); },
        onPeaceLost: function (why) { self.tipShow(self.L.peaceLost[why === 'ts' ? 0 : why === 't' ? 1 : 2], 4200); },
        onNear: function (on) { self.bs.style.display = on && self.mode === 'play' ? 'flex' : 'none'; },
        onFreeze: function () { self.banner(self.L.freeze); self.tipShow(self.L.freezeSub, 2200); },
        onSeen: function (k) { var tk = 'v2' + k, ch = false; if (!self.seen[k]) { self.seen[k] = 1; ch = true; } if (!self.seen[tk] && self.L.vtip[k]) { self.seen[tk] = 1; ch = true; self.tipShow(self.L.vtip[k], 4600); } if (ch) save(SEEN, JSON.stringify(self.seen)); },
        onAngel: function () { if (!self.seen.ab) { self.seen.ab = 1; save(SEEN, JSON.stringify(self.seen)); } },
        onOver: function () { setTimeout(function () { self._over(); }, 700); },
        onBossDown: function () { self.banner(self.L.exitHint); },
        onLevelDone: function () { self._levelDone(); },
        onFreed: function () { self._reveal(); },
        onBattle: function (k, e, amb) { self._battle(k, e, amb); }
      });
      this._resize(); this.mode = 'menu'; this._menu(); this._loop();
      this._hdInit();
    }
    _hdInit() {
      var self = this, q = load('ae1031-gfx') || 'auto';
      if (this.hd) { this.hd.dispose(); this.hd = null; this.h.hd = null; }
      if (q === 'classic' || !window.WebGL2RenderingContext) return;
      import(HDURL).then(function (m) {
        if (self.mode === 'closed' || self.hd) return;
        var hd = null; try { hd = m.create({ stage: self.stage, before: self.cv, quality: q, reduce: reduce, coarse: coarse }); } catch (e) { console.warn('1031 HD-2D unavailable', e); }
        if (!hd) return;
        self.hd = hd; self.h.hd = hd; self._resize(); hd.setLevel(self.h);
      }).catch(function (e) { console.warn('1031 HD-2D unavailable', e); });
    }
    _ui() {
      var self = this, L = this.L;
      css();
      this._prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
      var root = this.root = el('div', 'position:fixed;inset:0;z-index:2147483000;background:#07050f;color:#faf6ff;font-family:' + PIX + ';-webkit-user-select:none;user-select:none;opacity:0;transition:opacity .35s ease');
      root.className = 'ae1031-root'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', L.title); root.setAttribute('data-lenis-prevent', '');
      var st = this.stage = el('div', 'position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:crosshair');
      this.cv = el('canvas', 'position:absolute;left:0;top:0'); st.appendChild(this.cv); root.appendChild(st);
      this.bn = el('div', 'position:absolute;left:16px;right:16px;top:15%;text-align:center;font-family:' + PIX + ';font-size:clamp(20px,4vw,32px);letter-spacing:.06em;color:#fbc75a;text-shadow:0 2px 12px rgba(0,0,0,.7);opacity:0;transition:opacity .4s ease;pointer-events:none');
      this.tip = el('div', 'position:absolute;left:16px;right:16px;top:calc(15% + 46px);text-align:center;font-size:14px;line-height:1.6;letter-spacing:.04em;color:#e9e0ff;text-shadow:0 1px 6px rgba(0,0,0,.9);opacity:0;transition:opacity .3s ease;pointer-events:none');
      root.appendChild(this.bn); root.appendChild(this.tip);
      var x = this.bx = el('button', ICON + ';right:max(12px,env(safe-area-inset-right))', '✕'); x.setAttribute('aria-label', L.close); x.onclick = function () { self.close(); };
      var pz = this.bp = el('button', ICON + ';right:calc(max(12px,env(safe-area-inset-right)) + 50px);font-size:13px;font-weight:700;letter-spacing:1px', 'II'); pz.setAttribute('aria-label', L.pause); pz.onclick = function () { self._pause(); };
      root.appendChild(x); root.appendChild(pz);
      // touch controls: hold ◀ ▶ to walk, Search appears at a door
      this.pads = el('div', 'display:none'); root.appendChild(this.pads);
      var pad = function (lbl, left, key, aria) {
        var b = el('button', '', lbl); b.className = 'pad'; b.type = 'button'; b.setAttribute('aria-label', aria); b.style.left = left;
        var on = function (e) { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); self.h.in[key] = 1; b.classList.add('on'); };
        var off = function () { self.h.in[key] = 0; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        self.pads.appendChild(b); return b;
      };
      pad('◀', 'max(16px,env(safe-area-inset-left))', 'l', '←'); pad('▶', 'calc(max(16px,env(safe-area-inset-left)) + 76px)', 'r', '→');
      this.bs = pad(L.search, 'auto', 'up', L.search); this.bs.style.left = 'auto'; this.bs.style.right = 'max(16px,env(safe-area-inset-right))'; this.bs.style.width = '84px'; this.bs.style.borderRadius = '32px'; this.bs.style.fontSize = '15px'; this.bs.style.display = 'none';
      if (coarse) this.bs.style.background = 'rgba(235,154,18,.75)', this.bs.style.color = '#2e2352';
      root.appendChild(this.bs);
      this.dlg = el('div', 'position:absolute;left:16px;right:16px;bottom:max(18px,env(safe-area-inset-bottom));max-width:620px;margin:0 auto;display:none;flex-direction:column;gap:6px;padding:20px 24px;' + PXBOX + ';cursor:pointer;z-index:2');
      root.appendChild(this.dlg);
      this.bui = el('div', 'position:absolute;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));max-width:700px;margin:0 auto;display:none;flex-direction:column;gap:10px;z-index:2;cursor:default');
      this.bbox = el('div', PXBOX + ';display:flex;flex-direction:column;gap:6px;padding:18px 22px;min-height:92px');
      var tl = this.bline = el('div', 'display:flex;gap:12px;align-items:flex-start'), fi = flameIcon();
      fi.style.cssText = 'flex:none;width:12px;height:16px;margin-top:6px;image-rendering:pixelated';
      this.btx = el('div', 'flex:1;font-size:clamp(17px,2.4vw,21px);line-height:1.5;color:#faf6ff;min-height:1.5em');
      tl.appendChild(fi); tl.appendChild(this.btx);
      this.bopts = el('div', 'display:none;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:2px 18px');
      this.bmore = el('div', 'align-self:flex-end;font-size:14px;color:#fbc75a;line-height:1;visibility:hidden', '▼'); this.bmore.className = 'more';
      this.bbox.appendChild(tl); this.bbox.appendChild(this.bopts); this.bbox.appendChild(this.bmore);
      this.bact = el('div', 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px'); this.bact.className = 'bacts';
      this.bui.appendChild(this.bbox); this.bui.appendChild(this.bact);
      this.bbox.addEventListener('click', function () { self._bAdvance(); });
      root.appendChild(this.bui);
      this.bhead = el('div', 'position:absolute;top:max(14px,env(safe-area-inset-top));left:110px;right:110px;display:none;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 16px;pointer-events:none;z-index:2');
      root.appendChild(this.bhead);
      this.bsp = el('button', 'right:max(16px,env(safe-area-inset-right));width:104px;font-size:17px;display:none;z-index:2', ''); this.bsp.className = 'pad'; this.bsp.type = 'button';
      this.bsp.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (self.bt) self.bt.special(); });
      root.appendChild(this.bsp);
      var sk = el('button', 'right:calc(max(16px,env(safe-area-inset-right)) + 96px);font-size:20px', '✦'); sk.className = 'pad'; sk.type = 'button'; sk.setAttribute('aria-label', L.skill);
      sk.addEventListener('pointerdown', function (e) { e.preventDefault(); sk.setPointerCapture && sk.setPointerCapture(e.pointerId); sk.classList.add('on'); if (self.mode === 'play') { self.h.in.sk = 1; self.h.skill(); } });
      var skOff = function () { self.h.in.sk = 0; sk.classList.remove('on'); };
      sk.addEventListener('pointerup', skOff); sk.addEventListener('pointercancel', skOff); sk.addEventListener('lostpointercapture', skOff);
      this.pads.appendChild(sk);
      this.panel = el('div', 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(7,5,15,.66);overflow:auto;z-index:3');
      root.appendChild(this.panel);
      document.body.appendChild(root);
      requestAnimationFrame(function () { root.style.opacity = 1; });
      root.style.setProperty('--ae-flame', 'url(' + flameIcon().toDataURL() + ')');

      this.pts = null; this.pid = null;
      st.addEventListener('pointerdown', function (e) {
        if (self.mode === 'note' || self.mode === 'talk') { self._next(); return; }
        if (self.mode === 'battle') {
          var b = self.bt; if (!b) return;
          if (self.bsay) { self._bAdvance(); return; }
          if (b.st === 'dodge' || b.st === 'pre') { st.setPointerCapture && st.setPointerCapture(e.pointerId); self.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
          if (b.st === 'atk' && b.wp === 'yoyo') { b.tap(); return; }
          if (b.st !== 'atk' || self.pts) return;
          st.setPointerCapture && st.setPointerCapture(e.pointerId);
          self.pid = e.pointerId; self.pts = []; self.h.trail = []; self.h.trailLife = 0; self._add(e); return;
        }
        if (self.mode !== 'play' || self.pts) return;
        st.setPointerCapture && st.setPointerCapture(e.pointerId);
        self.pid = e.pointerId; self.pts = []; self.h.trail = []; self.h.trailLife = 0; self._add(e);
      });
      st.addEventListener('pointermove', function (e) {
        if (self.pts && e.pointerId === self.pid) self._add(e);
        var d = self.drag; if (d && e.pointerId === d.id) { self.dmv.x += (e.clientX - d.x) / self.fs * 1.15; self.dmv.y += (e.clientY - d.y) / self.fs * 1.15; d.x = e.clientX; d.y = e.clientY; }
      });
      var up = function (e) {
        if (self.drag && e.pointerId === self.drag.id) self.drag = null;
        if (!self.pts || e.pointerId !== self.pid) return; var g = recog(self.pts); self.pts = null; self.pid = null; self.h.trailLife = .35;
        if (self.mode === 'play') self.h.cast(g); else if (self.mode === 'battle' && self.bt) self.bt.input(g);
      };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      this.dlg.addEventListener('click', function () { self._next(); });
      var KM = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'up', w: 'up', W: 'up' };
      this._kd = function (e) {
        if (self.mode === 'battle' && e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') { self._bKey(e); return; }
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (self.mode === 'play' || self.mode === 'battle') self._pause(); else if (self.mode === 'paused') self._resume(); else if (self.mode === 'menu' || self.mode === 'over' || self.mode === 'clear') self.close(); e.preventDefault(); return; }
        if (KM[e.key] && self.mode === 'play') { self.h.in[KM[e.key]] = 1; e.preventDefault(); return; }
        if (self.mode === 'play' && KEYG[e.key]) { self.h.cast(KEYG[e.key]); e.preventDefault(); }
        if (self.mode === 'play' && (e.key === ' ' || e.key === 'q' || e.key === 'Q')) { self.h.in.sk = 1; if (!e.repeat) self.h.skill(); e.preventDefault(); }
        if ((self.mode === 'note' || self.mode === 'talk') && (e.key === ' ' || e.key === 'Enter')) { self._next(); e.preventDefault(); }
      };
      this._ku = function (e) { if (KM[e.key]) self.h.in[KM[e.key]] = 0; if (e.key === ' ' || e.key === 'q' || e.key === 'Q') self.h.in.sk = 0; if (BK[e.key]) self.bk[BK[e.key]] = 0; };
      this._rs = function () { self._resize(); };
      this._vis = function () { if (document.hidden && (self.mode === 'play' || self.mode === 'battle')) self._pause(); };
      this._blur = function () { self.h.in.l = self.h.in.r = self.h.in.up = self.h.in.sk = 0; self.bk.l = self.bk.r = self.bk.u = self.bk.d = 0; };
      window.addEventListener('keydown', this._kd); window.addEventListener('keyup', this._ku); window.addEventListener('resize', this._rs); window.addEventListener('blur', this._blur); document.addEventListener('visibilitychange', this._vis);
    }
    _add(e) {
      var r = this.stage.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      this.pts.push({ x: cx, y: cy }); if (this.pts.length > 400) this.pts.shift();
      this.h.trail.push({ x: cx / this.fs, y: cy / this.fs });
    }
    _resize() {
      var f = fit(this.stage); this.fs = f.s;
      this.cv.style.width = f.W * f.s + 'px'; this.cv.style.height = f.H * f.s + 'px';
      this.h.padB = coarse && !this.h.demo ? Math.ceil(70 / f.s) : 0;
      this.h.resize(f.W, f.H);
      if (this.hd) this.hd.resize(f, this.h);
    }
    banner(s) { var b = this.bn; b.textContent = s; b.style.opacity = 1; clearTimeout(this._bt); this._bt = setTimeout(function () { b.style.opacity = 0; }, 1900); }
    tipShow(s, ms) { var t = this.tip; t.textContent = s; t.style.top = 'calc(15% + 46px)'; if (this.bt && t.offsetParent) { var l = this.bt.lay(), cr = this.cv.getBoundingClientRect(), pr = t.offsetParent.getBoundingClientRect(); t.style.top = Math.round(cr.top - pr.top + (l.by + l.bh + 5) * this.fs) + 'px'; } t.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(function () { t.style.opacity = 0; }, ms || 4200); }
    _controls(on) { this.pads.style.display = on && coarse ? 'block' : 'none'; if (!on) { this.bs.style.display = 'none'; this.h.in.l = this.h.in.r = this.h.in.up = this.h.in.sk = 0; } else if (this.h.near) this.bs.style.display = 'flex'; }
    _show(nodes, wide) {
      var p = this.panel; p.innerHTML = '';
      var card = el('div', 'width:min(' + (wide ? 520 : 420) + 'px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 24px;' + PXBOX + ';text-align:center;animation:ae1031-in .3s steps(4)');
      nodes.forEach(function (n) { if (n) { n.style.flexShrink = '0'; card.appendChild(n); } });
      p.appendChild(card); p.style.display = 'flex';
      var b = card.querySelector('button'); if (b) b.focus();
    }
    _hide() { this.panel.style.display = 'none'; this.panel.innerHTML = ''; }
    _btn(label, fn, alt) { var b = el('button', alt ? BTN2 : BTN, label); b.type = 'button'; b.onclick = fn; return b; }
    _row(btns) { var r = el('div', 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px'); btns.forEach(function (b) { if (b) r.appendChild(b); }); return r; }
    _h(s, col, size) { return el('h2', 'margin:0;font-family:' + PIX + ';font-size:' + (size || 'clamp(26px,5.5vw,36px)') + ';font-weight:400;letter-spacing:.06em;text-shadow:3px 3px 0 #2a1d4a;color:' + (col || '#f39a4a'), s); }
    _menu() {
      var self = this, L = this.L, best = +load('ae1031-best2') || 0, sv = loadJ(SAVE);
      this.mode = 'menu'; this.bp.style.display = 'none'; this._controls(false);
      var picks = el('div', 'display:flex;gap:12px'), cards = [];
      [['boy', false], ['girl', true]].forEach(function (o) {
        var b = el('button', 'display:flex;flex-direction:column;align-items:center;gap:8px;width:108px;padding:12px 8px 10px;border:0;background:#120c26;color:#e9e0ff;font-size:16px;' + PXC); b.type = 'button';
        var c = cnv(36, 52); c.style.cssText = 'width:72px;height:104px;image-rendering:pixelated'; b.appendChild(c); b.appendChild(el('span', '', L[o[0]]));
        b.setAttribute('aria-pressed', 'false');
        b.onclick = function () { self.girl = o[1]; save('ae1031-pick', o[0]); paint(); };
        cards.push({ b: b, c: c, girl: o[1] }); picks.appendChild(b);
      });
      var paint = function () { cards.forEach(function (k) { var on = k.girl === self.girl; k.b.style.boxShadow = 'inset 0 0 0 3px ' + (on ? '#fbc75a' : '#3a2b62'); k.b.style.color = on ? '#fbc75a' : '#e9e0ff'; k.b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); };
      this._menuAnim = function (t) { cards.forEach(function (k) { var g = k.c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 36, 52); var on = k.girl === self.girl, set = art()[k.girl ? 'girl' : 'boy'], fr = on && !reduce ? set.walk[(t * 6 | 0) % set.walk.length] : set.idle[0]; g.drawImage(fr, Math.round((36 - fr.width) / 2), 52 - fr.height); }); };
      paint();
      var wrow = el('div', 'display:flex;gap:8px'), wdesc = el('p', 'margin:0;font-size:12.5px;line-height:1.65;color:#d9cbf5;max-width:40ch;min-height:5em'), wbs = [];
      ['lantern', 'wand', 'yoyo'].forEach(function (k) {
        var b = el('button', 'display:flex;flex-direction:column;align-items:center;gap:4px;width:84px;padding:10px 4px 8px;border:0;background:#120c26;color:#e9e0ff;font-size:16px;' + PXC); b.type = 'button';
        var ic = uiIcon(k) || wIcon(k); ic.style.cssText = 'width:32px;height:32px;image-rendering:pixelated'; b.appendChild(ic); b.appendChild(el('span', '', L.wpn[k][0]));
        b.onclick = function () { self.weapon = k; save('ae1031-weapon', k); wpaint(); };
        wbs.push({ b: b, k: k }); wrow.appendChild(b);
      });
      var wpaint = function () { wbs.forEach(function (o) { var on = o.k === self.weapon; o.b.style.boxShadow = 'inset 0 0 0 3px ' + (on ? '#fbc75a' : '#3a2b62'); o.b.style.color = on ? '#fbc75a' : '#e9e0ff'; o.b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); wdesc.textContent = L.wpn[self.weapon][1]; };
      wpaint();
      this._show([
        el('div', 'font-size:11px;letter-spacing:.24em;color:#f6b27a', L.sub),
        this._h(L.title),
        el('p', 'margin:0;font-family:' + PIX + ';font-size:14px;color:#cdb6f2;font-style:italic', L.rule),
        el('div', 'font-size:13px;letter-spacing:.08em;color:#cdb6f2', L.pick), picks,
        el('div', 'font-size:13px;letter-spacing:.08em;color:#cdb6f2', L.weapon), wrow, wdesc,
        el('p', 'margin:0;font-size:14px;line-height:1.75;color:#d9cbf5;max-width:36ch', L.how),
        glyphRow(),
        el('p', 'margin:0;font-size:12px;line-height:1.6;color:#8c7fae;max-width:40ch', (coarse ? L.keysTouch : L.keys) + (best ? ' · ' + L.best + ' ' + best : '')),
        /"peace"/.test(load('ae1031-ach') || '') ? el('p', 'margin:0;font-size:13px;color:#fbc75a', '★ ' + L.peace[0]) : el('p', 'margin:0;font-size:12px;line-height:1.6;color:#8c7fae;max-width:40ch', '☆ ' + L.peace[0] + '：' + L.peaceHow),
        coarse && innerHeight > innerWidth ? el('p', 'margin:0;font-size:12px;color:#f6b27a', '⟲ ' + L.rotate) : null,
        this._row([sv ? this._btn(L.cont(L.levels[sv.lv]), function () { self._start(sv); }) : null, this._btn(L.newRun + ' →', function () { self._start(null); }, !!sv)]),
        this._row([this._btn(L.files, function () { self._files(); }, true), (function () {
          var q = load('ae1031-gfx') || 'auto', b = self._btn(L.gfx + ' · ' + L.gfxQ[GFX.indexOf(q)], function () {
            q = GFX[(GFX.indexOf(q) + 1) % GFX.length]; save('ae1031-gfx', q); b.textContent = L.gfx + ' · ' + L.gfxQ[GFX.indexOf(q)]; self._hdInit();
          }, true); b.setAttribute('aria-live', 'polite'); return b;
        })()]),
        // Preview only: ?1031dev in the URL adds a floor picker (with 300 shards to try the shop).
        /1031dev/.test(location.search) ? this._row([['t', 0], ['X', 0], ['M', 1], ['Q', 2], ['F', 3]].map(function (o) {
          var b = self._btn('⚔ ' + (o[0] === 't' ? BT.t[self.loc].name : L.bosses['XMQF'.indexOf(o[0])]), function () {
            self._start({ lv: o[1], maxHp: 6, upg: {}, shards: 60, score: 0, time: 0 }); var h = self.h;
            if (o[0] === 't') { var e = h.spawn('t', 'R', '??'); e.x = h.px + 30; e.a = 1; e.inBattle = true; self._battle('t', e); }
            else { h.ev = 3; h.px = h.L.gate + 30; h.ti = h.L.trig.length; h.queue = []; }
          }, true); b.style.minHeight = '36px'; b.style.fontSize = '14px'; return b; })) : null,
        /1031dev/.test(location.search) ? this._row(L.levels.map(function (n, i) { var b = self._btn(n, function () { self._start({ lv: i, maxHp: 6, upg: {}, shards: 60, score: 0, time: 0 }); }, true); b.style.minHeight = '36px'; b.style.fontSize = '12px'; return b; })) : null
      ]);
    }
    _files() {
      var self = this, L = this.L, list = el('div', 'display:flex;flex-direction:column;gap:10px;width:100%;text-align:left');
      FILES.forEach(function (f) {
        var met = !!self.seen[f.k], T = f[self.loc], row = el('div', 'display:flex;gap:12px;padding:14px;background:#120c26;box-shadow:inset 0 0 0 3px #3a2b62');
        var c = cnv(40, 40); c.style.cssText = 'flex:none;width:56px;height:56px;image-rendering:pixelated;' + (met ? '' : 'filter:brightness(0) opacity(.5)');
        var g = c.getContext('2d'), A = art(), tvk = { te: 'echo', tb: 'burden' }[f.k], gvk = { gs: 'shade', gw: 'wrath', gt: 'twin' }[f.k], spr = f.k === 'a' ? A.angel.cover[0] : f.k[0] === 't' ? (A.trav.K ? A.trav.K[tvk || 'lost'].idle[0] : vSpr(A.trav.idle[0], tvk)) : f.k[0] === 'g' ? (A.ghost.V && gvk ? A.ghost.V[gvk].idle[0] : vSpr(A.ghost.idle[0], gvk)) : A.wisp.idle[0];
        g.imageSmoothingEnabled = false; var sc = Math.min(40 / spr.width, 40 / spr.height); g.drawImage(spr, (40 - spr.width * sc) / 2, (40 - spr.height * sc) / 2, spr.width * sc, spr.height * sc);
        row.appendChild(c);
        var tx = el('div', 'display:flex;flex-direction:column;gap:4px;font-size:13px;line-height:1.6;color:#d9cbf5');
        tx.appendChild(el('b', 'font-size:15px;color:#efe8ff;letter-spacing:.04em', met ? T[0] : '？？？'));
        tx.appendChild(el('span', 'color:#f39a4a;font-size:12px', L.danger + ' ' + '☆☆☆☆☆'.slice(0, f.st)));
        if (met) { tx.appendChild(el('span', '', L.trait + '：' + (f.k === 'a' && self.seen.ab ? T[3] : T[1]))); tx.appendChild(el('span', '', L.ability + '：' + T[2])); }
        else tx.appendChild(el('span', 'color:#8c7fae', L.unknown));
        row.appendChild(tx); list.appendChild(row);
      });
      this._show([this._h(L.files, '#e9e0ff', '26px'), el('p', 'margin:0;font-family:' + PIX + ';font-size:13px;color:#cdb6f2;font-style:italic', L.rule), list, this._btn(L.back, function () { self._menu(); }, true)], true);
    }
    // Start a run: from a checkpoint (sv) or fresh.
    _start(sv) {
      this._menuAnim = null; this._hide(); this.h.girl = this.girl;
      var r = this.h.run;
      if (sv) { r.maxHp = sv.maxHp; r.upg = Object.assign({ lan: 0, heart: 0, calm: 0, steady: 0, ward: 0, quick: 0 }, sv.upg); r.shards = sv.shards; r.score = sv.score; r.time = sv.time; r.peace = sv.peace !== false; }
      else { r.upg = { lan: 0, heart: 0, calm: 0, steady: 0, ward: 0, quick: 0 }; r.shards = 0; r.score = 0; r.time = 0; r.peace = true; }
      r.weapon = this.weapon;
      this._enter(sv ? sv.lv : 0);
    }
    _checkpoint(lv) { var r = this.h.run; this.cp = { lv: lv, maxHp: r.maxHp, upg: Object.assign({}, r.upg), shards: r.shards, score: r.score, time: r.time, peace: r.peace !== false }; save(SAVE, JSON.stringify(this.cp)); }
    _enter(lv) {
      this._checkpoint(lv); this._bHide(); this.bt = null;
      this.h.startLevel(lv); this.h.resize(this.h.W, this.h.H);
      this.mode = 'play'; this.bp.style.display = 'flex'; this.dlg.style.display = 'none'; this._controls(true);
      this.banner(this.L.levels[lv]);
    }
    _pause() {
      if (this.mode !== 'play' && this.mode !== 'battle') return;
      var self = this, L = this.L; this.pmode = this.mode; this.mode = 'paused'; this.pts = null; this.drag = null; this._controls(false);
      this._show([this._h(L.paused, '#e9e0ff', '30px'),
        this._row([this._btn(L.resume, function () { self._resume(); }), this._btn(L.restart, function () { self._retry(); }, true), this._btn(L.exit, function () { self.close(); }, true)])]);
    }
    _resume() { this._hide(); this.mode = this.pmode === 'battle' && this.bt ? 'battle' : 'play'; if (this.mode === 'play') this._controls(true); }
    _retry() {
      var cp = this.cp, r = this.h.run; this._hide();
      r.maxHp = cp.maxHp; r.upg = Object.assign({}, cp.upg); r.shards = cp.shards; r.score = cp.score; r.time = cp.time; r.peace = cp.peace !== false;
      this._enter(cp.lv);
    }
    _over() {
      if (this.mode === 'closed') return;
      var self = this, L = this.L; this.mode = 'over'; this._controls(false); this.tip.style.opacity = 0; this._bHide(); this.bt = null;
      this._show([this._h(L.over), el('div', 'font-size:15px;color:#d9cbf5', L.levels[this.h.lv] + ' · ' + L.score + ' ' + this.h.run.score),
        this._row([this._btn(L.retry, function () { self._retry(); }), this._btn(L.exit, function () { self.close(); }, true)])]);
    }
    // Evidence note: the world holds still while you read it.
    _note(s) {
      this.mode = 'note'; this._controls(false); var d = this.dlg; d.innerHTML = '';
      var A = art(), sf = A.face && A.face[this.girl ? 'girl' : 'boy'];
      var nt = el('span', 'font-family:' + PIX + ';font-size:clamp(17px,2.3vw,20px);line-height:1.65;color:#faf6ff');
      withFace(d, faceCnv(sf && sf[1], 64), [el('span', 'font-size:13px;letter-spacing:.2em;color:#fbc75a', this.L.evidence + ' ' + this.h.ev + ' / 3'),
        nt,
        el('span', 'align-self:flex-end;font-size:11px;color:#8c7fae', this.L.tap + ' ▸')]);
      d.style.display = 'flex'; this._noteAt = performance.now(); this._type(nt, s);
    }
    // Text appears letter by letter; a tap finishes the line first.
    _type(node, str) { if (reduce) { node.textContent = str; this.tw = null; return; } node.textContent = ''; this.tw = { el: node, s: str, i: 0 }; }
    _typeDone() { if (!this.tw) return false; this.tw.el.textContent = this.tw.s; this.tw = null; return true; }
    _next() {
      if ((this.mode === 'note' || this.mode === 'talk') && this._typeDone()) return;
      if (this.mode === 'note') { if (performance.now() - this._noteAt < 350) return; this.dlg.style.display = 'none'; this.mode = 'play'; this._controls(true); return; }
      if (this.mode !== 'talk') return;
      var L = this.L, d = this.dlg; this.li++;
      if (this.li >= L.revealLines.length) { d.style.display = 'none'; this._clear(); return; }
      d.innerHTML = '';
      var bf = art().final.face;
      var rt = el('span', 'font-family:' + PIX + ';font-size:clamp(18px,2.4vw,22px);line-height:1.6;color:#faf6ff');
      withFace(d, faceCnv(bf && bf[Math.min(2, this.li)], 72), [el('span', 'font-size:13px;letter-spacing:.2em;color:#fbc75a', this.li >= 2 ? FB : L.speaker),
        rt,
        el('span', 'align-self:flex-end;font-size:11px;color:#8c7fae', L.tap + ' ▸')]);
      d.style.display = 'flex'; this._type(rt, L.revealLines[this.li]);
    }
    _reveal() { save('ae-holo-gold', '1'); try { window.dispatchEvent(new Event('ae-gold')); } catch (e) {} if (this.mode === 'closed') return; this.mode = 'talk'; this._controls(false); this.li = -1; this._next(); }
    // Little Cha's shop, between corridors.
    _levelDone() {
      if (this.mode === 'closed') return;
      this.mode = 'shop'; this._controls(false); this.bp.style.display = 'none';
      this.h.run.score += Math.round(this.h.hp * 50); this.h.tension = 0;
      this._shop(this.h.lv + 1, pick(this.L.shopHi));
    }
    _shop(next, say, bought) {
      var self = this, L = this.L, r = this.h.run;
      var head = el('div', 'display:flex;align-items:center;gap:14px;text-align:left');
      var pc = cnv(64, 64); pc.style.cssText = 'width:96px;height:96px;image-rendering:pixelated;flex:none;background:#1a1230;box-shadow:0 0 0 3px #5a3f96';
      var t0 = -1;
      this._menuAnim = function (t) { if (t0 < 0) t0 = t; var g = pc.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64); var A = art(), fc = A.face && A.face.cha;
        if (fc) { var k = bought && t - t0 < 1.6 ? 1 : 0; g.drawImage(fc[k], 0, Math.round(reduce ? 0 : Math.sin(t * 2.4) * 1)); }
        else { var fr = A.cha.idle; g.drawImage(fr[reduce ? 0 : (t * 2 | 0) % fr.length], 16, 22, 32, 40); } };
      head.appendChild(pc);
      var hx = el('div', 'display:flex;flex-direction:column;gap:6px');
      hx.appendChild(el('b', 'font-family:' + PIX + ';font-size:22px;font-weight:400;color:#fbc75a', L.shopName));
      hx.appendChild(el('span', 'font-size:14px;line-height:1.6;color:#efe8ff', '「' + say + '」'));
      head.appendChild(hx);
      var wallet = el('div', 'font-size:14px;color:#cdb6f2;font-variant-numeric:tabular-nums', L.shards + ' ◆ ' + r.shards);
      var list = el('div', 'display:flex;flex-direction:column;gap:8px;width:100%');
      Object.keys(UPG).forEach(function (k) {
        var lvl = r.upg[k], costs = UPG[k], max = lvl >= costs.length, cost = costs[lvl], T = L.upg[k];
        var row = el('div', ''); row.className = 'upg';
        row.appendChild(el('b', 'font-size:14px;color:#efe8ff;font-weight:600', T[0] + ' ' + '●'.repeat(lvl) + '○'.repeat(costs.length - lvl)));
        var b = el('button', (max || r.shards < cost ? BTN2 : BTN) + ';min-height:38px;padding:0 14px;font-size:16px;grid-row:span 2', max ? L.maxed : '◆ ' + cost); b.type = 'button';
        b.disabled = max || r.shards < cost; if (b.disabled) b.style.opacity = .5; b.dataset.k = k;
        b.onclick = function () { if (r.shards < cost || max) return; r.shards -= cost; r.upg[k]++; if (k === 'heart') r.maxHp += 2; self._shop(next, pick(L.shopThanks), k); };
        row.appendChild(b);
        row.appendChild(el('span', 'font-size:12px;color:#a99ccc;line-height:1.5', T[1]));
        list.appendChild(row);
      });
      this._show([head, wallet, list, this._btn(L.go + ' ' + L.levels[next], function () { self._menuAnim = null; self._hide(); self._enter(next); })], true);
      // after a purchase, keep focus on that item (or on the way out if it can't be bought again)
      if (bought) { var fb = list.querySelector('button[data-k="' + bought + '"]'); (fb && !fb.disabled ? fb : this.panel.querySelector('button:last-of-type')).focus(); }
    }
    _clear() {
      if (this.mode === 'closed') return;
      var self = this, L = this.L, h = this.h, r = h.run, hb = h.hp * 100, tb = Math.max(0, Math.round((1200 - r.time) * 2)), total = r.score + hb + tb, best = +load('ae1031-best2') || 0;
      this.mode = 'clear'; this.bp.style.display = 'none'; this._controls(false);
      if (total > best) save('ae1031-best2', total);
      try { localStorage.removeItem(SAVE); } catch (e) {}
      var peace = r.peace !== false, ach = null;
      if (peace) {
        save('ae1031-ach', JSON.stringify({ peace: 1 }));
        ach = el('div', 'display:flex;align-items:center;gap:12px;padding:10px 14px;text-align:left;background:#1a1230;box-shadow:inset 0 0 0 3px #fbc75a;' + PXC);
        var ai = uiIcon('free') || aIcon('free'); ai.style.cssText = 'width:32px;height:32px;image-rendering:pixelated;flex:none'; if (ai.className === 'ic2') ai.querySelector('.ic0').style.display = 'none', ai.querySelector('.ic1').style.display = 'block';
        var at = el('div', 'display:flex;flex-direction:column;gap:2px');
        at.appendChild(el('span', 'font-size:11px;letter-spacing:.18em;color:#f6b27a', L.achGot));
        at.appendChild(el('b', 'font-family:' + PIX + ';font-size:20px;font-weight:400;color:#fbc75a', L.peace[0]));
        at.appendChild(el('span', 'font-size:12px;line-height:1.5;color:#d9cbf5', L.peace[1]));
        ach.appendChild(ai); ach.appendChild(at);
      }
      var tbl = el('div', 'display:grid;grid-template-columns:1fr auto;gap:6px 24px;font-size:14px;color:#d9cbf5;text-align:left;font-variant-numeric:tabular-nums');
      [[L.score, r.score], [L.hearts + ' ×100', hb], [L.timeBonus + ' (' + fmtT(r.time) + ')', tb]].forEach(function (row) { tbl.appendChild(el('span', '', row[0])); tbl.appendChild(el('span', 'text-align:right', String(row[1]))); });
      tbl.appendChild(el('span', 'padding-top:6px;border-top:1px solid rgba(205,182,242,.25);color:#fbc75a;font-weight:600', L.total));
      tbl.appendChild(el('span', 'padding-top:6px;border-top:1px solid rgba(205,182,242,.25);color:#fbc75a;font-weight:600;text-align:right', String(total)));
      var cf = art().face, cfi = cf && cf[h.girl ? 'girl' : 'boy'];
      this._show([faceCnv(cfi && cfi[2], 88), el('div', 'font-size:11px;letter-spacing:.24em;color:#f6b27a', L.sub), this._h(L.clear, '#fbc75a', '30px'), ach, tbl,
        total > best ? el('div', 'font-size:13px;color:#f39a4a', L.newBest) : el('div', 'font-size:12px;color:#8c7fae', L.best + ' ' + best),
        el('div', 'font-size:13px;letter-spacing:.06em;color:#cdb6f2', L.thanks),
        this._row([this._btn(L.newRun, function () { self._start(null); }), this._btn(L.exit, function () { self.close(); }, true)])]);
    }
    // ---- battles (see Battle). A pixel text box types out each line; the four actions sit under it.
    _battle(k, e, ambush) {
      if (this.mode !== 'play') return;
      var self = this, L = this.L; this.mode = 'battle'; this._controls(false); this.pts = null; this.drag = null; this.h.trail = [];
      this.bk = { l: 0, r: 0, u: 0, d: 0 }; this.dmv = { x: 0, y: 0 }; this.tip.style.opacity = 0; this.bn.style.opacity = 0;
      this.bt = new Battle(this.h, k, e); this.bT = k === 't' && BTV[e.v] ? Object.assign({}, BT.t[this.loc], BTV[e.v][this.loc]) : BT[k][this.loc];
      this.bt.onStart = function () { self.bui.style.display = 'none'; self._bSpecial(true); };
      this.bact.innerHTML = ''; this.bA = {};
      [['banish', 'Banish', L.b.banish, uiIcon(this.bt.wp) || wIcon(this.bt.wp)], ['talk', 'Talk', L.b.talk, uiIcon('talk') || aIcon('talk')], ['item', 'Item', L.b.item, uiIcon('item') || aIcon('item')], ['free', 'Free', L.b.free, uiIcon('free') || aIcon('free')]].forEach(function (o) {
        var b = el('button', ''); b.type = 'button'; b.className = 'bact';
        o[3].style.cssText = 'width:24px;height:24px;image-rendering:pixelated;flex:none'; b.appendChild(o[3]); b.appendChild(el('span', '', o[2]));
        b.onclick = function (ev) { ev.stopPropagation(); if (self.bsay || performance.now() - self._bAt < 250) return; self['_b' + o[1]](); };
        self.bA[o[0]] = b; self.bact.appendChild(b);
      });
      this.bhead.style.display = 'flex'; this._bHead();
      this._bSay([this.bT.intro], ambush ? function () { self._bEnemy(); } : function () { self._bMenu(); });
    }
    _bName() { return this.bT.name || this.L.bosses['XMQF'.indexOf(this.bt.k)]; }
    _bHead() {
      var b = this.bt, L = this.L, h = this.bhead; if (!b) return; h.innerHTML = '';
      h.appendChild(el('b', 'font-size:20px;font-weight:400;letter-spacing:.08em;color:#fbc75a;text-shadow:2px 2px 0 #1a1230', this._bName()));
      var bar = function (lbl, v, col) {
        var r = el('div', 'display:flex;align-items:center;gap:8px;font-size:14px;letter-spacing:.08em;color:#efe8ff;text-shadow:2px 2px 0 #1a1230'); r.appendChild(el('span', '', lbl));
        var tr = el('div', 'width:84px;height:10px;background:#1a1230;box-shadow:0 0 0 2px #efe8ff'); tr.appendChild(el('div', 'height:100%;width:' + Math.round(clamp(v, 0, 1) * 100) + '%;background:' + col)); r.appendChild(tr); return r;
      };
      h.appendChild(bar(L.b.seal + (b.k === 'F' ? ' ' + ['I', 'II', 'III'][b.ph - 1] : ''), b.seal / b.D.seal, '#f39a4a'));
      h.appendChild(bar(L.b.calm, b.calm / 100, b.calm >= 100 ? '#fbc75a' : '#b490ef'));
    }
    _bHide() { if (!this.bui) return; this.bui.style.display = 'none'; this.bhead.style.display = 'none'; this.bsp.style.display = 'none'; this.bsay = false; this.tw = null; }
    _bSpecial(on) { var b = this.bt, s = this.bsp; if (on && b && b.wp !== 'lantern') { s.textContent = this.L.b[b.wp === 'wand' ? 'shield' : 'spin']; s.style.display = 'flex'; } else s.style.display = 'none'; }
    // The four actions: cur marks the one whose list is open; Free blinks once it can be used.
    _bActs(on, cur) {
      var self = this, b = this.bt, ready = b && (b.k === 'F' ? b.fin : b.calm >= 100);
      Object.keys(this.bA || {}).forEach(function (k) { var x = self.bA[k]; x.disabled = !on || (k === 'banish' && b.fin); x.classList.toggle('on', k === cur); x.classList.toggle('ready', !!(on && k === 'free' && ready && k !== cur)); });
      if (this.bA && this.bA.item) this.bA.item.lastChild.textContent = this.L.b.item + ' ×' + (this.h.candy || 0);
    }
    _bText(str) { this.bline.style.display = 'flex'; this.bopts.style.display = 'none'; this.bopts.innerHTML = ''; this._type(this.btx, str); }
    _bSay(lines, then) {
      this.bq = lines.slice(); this.bthen = then; this.bsay = true; this._bSpecial(false); this._bActs(false);
      this.bui.style.display = 'flex'; this.bmore.style.visibility = 'hidden';
      this._bText(this.bq.shift()); this._bAt = performance.now();
      if (!this.tw) this.bmore.style.visibility = 'visible';
    }
    _bAdvance() {
      if (!this.bsay) return;
      if (this._typeDone()) { this.bmore.style.visibility = 'visible'; return; }
      if (performance.now() - this._bAt < 200) return;
      this.bmore.style.visibility = 'hidden';
      if (this.bq.length) { this._bText(this.bq.shift()); this._bAt = performance.now(); if (!this.tw) this.bmore.style.visibility = 'visible'; return; }
      this.bsay = false; var f = this.bthen; this.bthen = null; f && f();
    }
    // A list of choices shown inside the text box (Talk options, items): [label, fn, disabled]
    _bOpts(list) {
      var self = this, box = this.bopts; box.innerHTML = ''; this.tw = null;
      this.bline.style.display = 'none'; box.style.display = 'grid'; this.bmore.style.visibility = 'hidden'; this._bAt = performance.now();
      list.forEach(function (o) { var b = el('button', '', o[0]); b.type = 'button'; b.className = 'bopt'; if (o[2]) b.disabled = true; b.onclick = function (ev) { ev.stopPropagation(); if (performance.now() - self._bAt < 250) return; o[1](); }; box.appendChild(b); });
      var f = box.querySelector('button:not([disabled])'); if (f && !coarse) f.focus({ preventScroll: true });
    }
    _bMenu() {
      if (this.mode !== 'battle' || !this.bt) return;
      var b = this.bt, L = this.L, T = this.bT, ready = b.k === 'F' ? b.fin : b.calm >= 100, idle = b.k === 'F' ? T.idle[b.ph - 1] : T.idle;
      this.bsay = false; this._bSpecial(false); this._bHead(); this.bui.style.display = 'flex'; this.bmore.style.visibility = 'hidden';
      this._bText(b.fin ? T.done : ready ? L.b.ready(this._bName()) : idle[b.ai % idle.length]);
      this._bActs(true); this._bAt = performance.now();
      var f = this.bA[ready ? 'free' : 'banish']; if (f && !coarse) f.focus({ preventScroll: true });
    }
    _bTalk() {
      var self = this, b = this.bt;
      this._bActs(true, 'talk');
      this._bOpts(this.bT.talk.map(function (o, i) { return [o[0], function () { self._bTalked(i); }, !!b.used[i]]; }));
    }
    _bTalked(i) {
      var self = this, b = this.bt, o = this.bT.talk[i], was = b.calm, L = this.L;
      b.used[i] = 1; if (o[2] < 0) b.angry = 1; else b.calm = Math.min(100, b.calm + o[2]);
      this._bHead();
      var lines = [o[1]]; if (o[2] < 0) lines.push(L.b.angry); else if (b.k !== 'F' && b.calm >= 100 && was < 100) lines.push(L.b.ready(this._bName()));
      this._bSay(lines, function () { self._bEnemy(); });
    }
    _bItem() {
      var self = this, L = this.L, h = this.h;
      this._bActs(true, 'item');
      if (!h.candy) { this._bText(L.b.none); return; }
      this._bOpts([[L.b.candy + ' ×' + h.candy, function () { h.candy--; h.hp = Math.min(h.maxHp, h.hp + 2); self._bSay([L.b.ate], function () { self._bEnemy(); }); }, h.hp >= h.maxHp]]);
    }
    _bFree() {
      var self = this, b = this.bt;
      if (b.k === 'F' ? !b.fin : b.calm < 100) { this._bSay([b.k === 'F' ? this.bT.notReady : this.L.b.notReady(this._bName())], function () { self._bMenu(); }); return; }
      this._bWin('free');
    }
    _bBanish() {
      var self = this, b = this.bt, L = this.L, T = this.bT;
      if (b.fin) return;
      this.bui.style.display = 'none'; this.h.trail = [];
      this.tipShow(L.b[b.wp === 'wand' ? 'chant' : b.wp === 'yoyo' ? 'swing' : 'trace'], 2600);
      b.attack(function (d) {
        self._bHead();
        if (b.seal > 0) { if (!d) self._bSay([L.b.miss], function () { self._bEnemy(); }); else self._bEnemy(); return; }
        if (b.k !== 'F') { self._bWin('banish'); return; }
        // the final boss: each broken seal starts the next phase; after the third it can only be freed
        if (b.ph < 3) { b.ph++; b.seal = b.D.seal; b.e.hit = .6; self._bHead(); self._bSay([T.phaseUp[b.ph - 2]], function () { self._bEnemy(); }); }
        else { b.fin = true; self._bHead(); self._bSay([T.done], function () { self._bMenu(); }); }
      });
    }
    _bEnemy() {
      if (this.mode !== 'battle' || !this.bt) return;
      var self = this, b = this.bt, L = this.L, T = this.bT, tips = this.bTips = this.bTips || {}, say = [], atk = b.k === 'F' ? T.atk[b.ph - 1] : T.atk;
      this.bsay = false; this._bActs(false); this.bui.style.display = 'flex'; this.bmore.style.visibility = 'hidden';
      this._bText(atk[b.ai % atk.length]);
      b.dodge(function () { self._bSpecial(false); self._bMenu(); });
      if (!tips.move) { tips.move = 1; say.push(coarse ? L.b.moveTouch : L.b.move); }
      if ((b.k === 'Q' || b.k === 'M') && !tips[b.k]) { tips[b.k] = 1; say.push(L.b[b.k === 'Q' ? 'beam' : 'freeze']); }
      if (b.k === 'F' && b.ph === 1 && !tips.F) { tips.F = 1; say.push(L.embers); }
      if (say.length) this.tipShow(say.join(' · '), 3400);
    }
    _bWin(how) {
      var self = this, b = this.bt, h = this.h, L = this.L, back = b.k === 't' && how === 'free' && h.lost.length > 0, l = b.lay();
      var n = b.k === 't' ? (how === 'free' ? 5 : DEF.t.sh) : b.k === 'F' ? 25 : 15 + (how === 'free' ? 10 : 0);
      b.st = 'won'; b.t = 0; b.burst(l.W / 2 - l.bx, l.ey - 30 - l.by, 40, how === 'free' ? ['#fff4dc', '#fbc75a', '#efe8ff'] : ['#efe8ff', '#cdb6f2', '#5a3f96']);
      this._bSay([this.bT[how]].concat(back ? [L.b.returned] : [], [L.b.won(n)]), function () { var e = b.e, k = b.k; self._bHide(); self.bt = null; self.mode = 'play'; self._controls(k !== 'F'); h.endBattle(k, e, how); });
    }
    _bTick(dt) {
      var b = this.bt, k = this.bk, sp = 82 * dt, mx = (k.r ? 1 : 0) - (k.l ? 1 : 0), my = (k.d ? 1 : 0) - (k.u ? 1 : 0);
      if (mx && my) { mx *= .7071; my *= .7071; }
      var mv = { x: mx * sp + this.dmv.x, y: my * sp + this.dmv.y }; this.dmv.x = this.dmv.y = 0;
      b.update(dt, mv);
      if (this.h.phase === 'over' && b.st !== 'dead') { b.st = 'dead'; this._bHide(); }
    }
    _bKey(e) {
      var b = this.bt, key = e.key; if (!b) return;
      if (BK[key]) { this.bk[BK[key]] = 1; if (b.st === 'dodge' || b.st === 'pre') { e.preventDefault(); return; } }
      if (this.bsay) { if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z') { if (!e.repeat) this._bAdvance(); e.preventDefault(); } return; }
      if ((key === 'x' || key === 'X' || key === 'Backspace') && this.bopts.style.display !== 'none') { this._bMenu(); e.preventDefault(); return; }
      if (b.st === 'dodge') { if (key === ' ' || key === 'q' || key === 'Q' || key === 'Shift') { b.special(); e.preventDefault(); } return; }
      if (b.st === 'atk') {
        if (b.wp === 'yoyo') { if ((key === ' ' || key === 'Enter') && !e.repeat) { b.tap(); e.preventDefault(); } }
        else if (KEYG[key]) { b.input(KEYG[key]); e.preventDefault(); }
        return;
      }
      // menu: arrow keys move through the open list, or across the four actions
      if (/^Arrow/.test(key)) {
        var list = this.bopts.style.display !== 'none' ? this.bopts : this.bact;
        var bs = [].slice.call(list.querySelectorAll('button:not([disabled])')), i = bs.indexOf(document.activeElement), n = bs.length;
        var cols = list === this.bact && innerWidth > 520 ? n : Math.max(1, Math.round(list.clientWidth / Math.max(1, bs[0] ? bs[0].offsetWidth : 1)));
        var step = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -cols : cols;
        if (n) bs[i < 0 ? 0 : ((i + step) % n + n) % n].focus({ preventScroll: true });
        e.preventDefault();
      }
    }
    _loop() {
      var self = this, last = performance.now();
      var f = function (t) {
        if (self.mode === 'closed') return;
        var dt = Math.min(.05, (t - last) / 1000); last = t;
        if (self._menuAnim) self._menuAnim(t / 1000);
        var tw = self.tw; if (tw) { tw.i += dt * 38; tw.el.textContent = tw.s.slice(0, tw.i | 0); if (tw.i >= tw.s.length) { self.tw = null; if (self.bsay) self.bmore.style.visibility = 'visible'; } }
        self.h.hud = self.mode === 'play' || self.mode === 'note' || self.mode === 'paused';
        if (self.mode === 'battle' && self.bt) self._bTick(dt);
        else if (self.mode === 'play') self.h.update(dt);
        else if (self.mode === 'menu' || self.mode === 'shop' || self.mode === 'over' || self.mode === 'clear' || self.mode === 'talk') { self.h.t += dt; self.h._tick(dt); }
        var inB = self.bt && (self.mode === 'battle' || self.mode === 'paused');
        if (self.hd) self.hd.show(!inB);
        if (inB) self.bt.draw(); else self.h.draw();
        self._raf = requestAnimationFrame(f);
      };
      this._raf = requestAnimationFrame(f);
    }
    close() {
      if (this.mode === 'closed') return; this.mode = 'closed';
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) {}
      cancelAnimationFrame(this._raf); clearTimeout(this._bt); clearTimeout(this._tt);
      if (this.hd) { var hd = this.hd; this.hd = null; this.h.hd = null; setTimeout(function () { hd.dispose(); }, 380); }
      window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku); window.removeEventListener('resize', this._rs); window.removeEventListener('blur', this._blur); document.removeEventListener('visibilitychange', this._vis);
      var self = this; this.root.style.opacity = 0;
      setTimeout(function () { self.root.remove(); document.documentElement.style.overflow = self._prevOverflow; self.onClose && self.onClose(); }, 360);
    }
  }
  function glyphRow() {
    var r = el('div', 'display:flex;gap:10px;justify-content:center');
    ['h', 'v', 'V', 'A', 'o'].forEach(function (g, i) {
      var c = cnv(9, 9), x = c.getContext('2d'); glyph(x, g, 1, 1, '#fbc75a');
      c.style.cssText = 'width:27px;height:27px;image-rendering:pixelated';
      var w = el('div', 'display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:#8c7fae'); w.appendChild(c); w.appendChild(el('span', '', String(i + 1)));
      r.appendChild(w);
    });
    return r;
  }

  // ---- <ae-haunt>: the attract-mode preview on the page --------------------
  class AeHaunt extends HTMLElement {
    static get observedAttributes() { return ['locale']; }
    attributeChangedCallback() { if (this._lbl) this._lbl.textContent = this.L.play + ' →'; if (this._hint) this._hint.textContent = this.L.hint; }
    get loc() { return this.getAttribute('locale') === 'en' ? 'en' : 'zh'; }
    get L() { return TX[this.loc]; }
    get paused() { return !!this._paused; }
    set paused(v) { this._paused = !!v; if (!v) this._go(); }
    connectedCallback() {
      if (this._built) { this._go(); return; }
      this._built = true;
      var self = this;
      this.style.cssText += ';display:block;position:relative;width:100%;height:100%;overflow:hidden;border-radius:18px;background:#07050f;cursor:pointer;user-select:none;-webkit-user-select:none';
      this.setAttribute('role', 'button'); this.tabIndex = 0;
      var cv = this.cv = el('canvas', 'position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges');
      cv.setAttribute('data-fc-canvas', '');
      this.appendChild(cv);
      this._hint = el('span', 'position:absolute;left:0;right:0;top:14px;text-align:center;font-family:' + FONT + ';font-size:12px;letter-spacing:.12em;color:#cdb6f2;text-shadow:0 1px 6px rgba(0,0,0,.8);pointer-events:none', this.L.hint);
      var b = el('span', BTN + ';position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font-family:' + FONT + ';pointer-events:none');
      this._lbl = el('span', '', this.L.play + ' →'); b.appendChild(this._lbl);
      this.appendChild(this._hint); this.appendChild(b);
      this.setAttribute('aria-label', this.L.title + ' · ' + this.L.play);
      try { this.h = new Zone(cv, { demo: true, loc: this.loc }); } catch (e) { console.warn(e); return; }
      this._fit();
      this._ro = new ResizeObserver(function () { self._fit(); }); this._ro.observe(this);
      this._io = new IntersectionObserver(function (es) { self._vis = es[0].isIntersecting; if (self._vis) self._go(); }); this._io.observe(this);
      var open = function () { if (self._game) return; self._paused = true;
        if (coarse) { try { var de = document.documentElement, rq = de.requestFullscreen || de.webkitRequestFullscreen; if (rq && !document.fullscreenElement) { var pr = rq.call(de, { navigationUI: 'hide' }); if (pr && pr.then) pr.then(function () { try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }).catch(function () {}); } } catch (e) {} } self._game = new Game(self.loc, function () { self._game = null; self._paused = false; self._go(); }); };
      this.addEventListener('click', open);
      this.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      this._vis = true; this._go();
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
    _fit() {
      if (!this.h || !this.clientWidth) return;
      var f = fit(this), s = Math.max(2, Math.round(f.bw / 220)), W = Math.ceil(f.bw / s), H = Math.ceil(f.bh / s);
      this.cv.style.width = W * s + 'px'; this.cv.style.height = H * s + 'px';
      this.h.resize(W, H);
      if (reduce) { this.h.en.length || this.h.spawn('g', 'R', 'V'); this.h.en[0].a = 1; this.h.en[0].x = W * .72; this.h.draw(); }
    }
    snap() { if (!this.h || !this.h.W) return null; this.h.draw(); return this.cv; }
    _go() {
      if (this._raf || !this.h || reduce || this._paused || !this._vis || !this.isConnected) return;
      var self = this, last = performance.now();
      var f = function (t) {
        if (self._paused || !self._vis || !self.isConnected) { self._raf = 0; return; }
        var dt = Math.min(.05, (t - last) / 1000); last = t;
        self.h.update(dt); self.h.draw();
        self._raf = requestAnimationFrame(f);
      };
      this._raf = requestAnimationFrame(f);
    }
  }
  customElements.define('ae-haunt', AeHaunt);
})();
