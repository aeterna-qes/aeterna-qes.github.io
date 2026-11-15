/* Aeterna welfare map data.
   Pins are grouped by BUILDING, because most welfare shops are units inside
   a few commercial towers near school rather than street-level shopfronts.

   Coordinates are building-level, verified against Google Places on 2026-09-19
   by tools/research-welfare.mjs — Text Search on each building's `q` string.
   All ten resolved by name and moved between 29 m and 348 m from the
   hand-placed originals. `kwongwa` keeps its `approx: true` flag: Google
   resolved 翠園大樓一期, while our shop is in 三期, a separate block up the street —
   treat that one as "verify on the ground". Every pin also carries a `q` search
   string, so the Directions button resolves by name in Google/Apple Maps even
   if a coordinate is off by a block. Shop-level findings from the same run are
   in welfare-report.md.

   To correct a pin: open the site, tap the building, and compare with
   openstreetmap.org — right-click the real spot, "Show address", copy the
   lat/lng out of the URL. */
window.AE_MAP = {
  /* Coordinate from the OpenStreetMap school polygon (way 447395240):
     22.323445 N, 114.171458 E — the mound between Sai Yee Street and Prince
     Edward Road West, 150 m north-west of Mong Kok East station.
     (Wikidata's 22.32556 is ~230 m too far north — don't use it.) */
  SCHOOL: {
    lat: 22.323445, lng: 114.171458,
    n: { en: "Queen Elizabeth School", zh: "伊利沙伯中學" },
    a: { en: "152 Sai Yee Street, Mong Kok", zh: "旺角洗衣街152號" }
  },

  /* Yau Tsim Mong bounds — the map cannot be dragged outside this box. */
  BOUNDS: { s: 22.2930, w: 114.1580, n: 22.3400, e: 114.1850 },

  BUILDINGS: [
    { id: "pakpolee",
      b: { en: "Pakpolee Commercial Centre", zh: "百寶利商業中心" },
      a: { en: "1A–1K Sai Yeung Choi St South, Mong Kok", zh: "旺角西洋菜南街1A–1K號" },
      q: "百寶利商業中心 旺角西洋菜南街",
      /* 1A–1K Sai Yeung Choi St South — the street's southern end, at the
         Dundas Street junction (confirmed: 5 min from Yau Ma Tei MTR A2,
         beside Chow Tai Fook Centre / Gala Place). */
      lat: 22.316240, lng: 114.170496,
      shops: [
        { n: "Alphaomegahk", u: "1606 室", c: "fashion", w: { zh: "門市9折", en: "10% off in store" }, src: "hkssa" },
        { n: "Infinity sneaker", u: "611 室", c: "fashion", w: { zh: "鞋款 −$50（拖鞋除外）；衫/帽/配件 −$20", en: "−$50 footwear (excl. slippers); −$20 apparel, caps & accessories" }, src: "hkssa" },
        { n: "LegiteX Fashion Store", u: "1411 室", c: "fashion", w: { zh: "88折", en: "12% off" }, src: "hkssa" },
        { n: "Missing unicorn", u: "13樓 1311 室", c: "fashion", w: { zh: "正價貨品9折（鞋款除外），需學生證", en: "10% off full-price items (excl. footwear), student ID required" }, src: "hkssa" },
        { n: "Nabwork", u: "11 樓", c: "fashion", w: { zh: "滿$500減$30；滿$1000減$80；滿$1500送防水噴霧", en: "$30 off $500 · $80 off $1000 · free waterproof spray over $1500" }, src: "hkssa" },
        { n: "Stylersnger", u: "6樓 602 室", c: "fashion", w: { zh: "正價9折", en: "10% off full price" }, src: "hkssa" },
        { n: "Feb31", u: "609 室", c: "other", w: { zh: "滿$100享95折", en: "5% off over $100" }, src: "hkssa" }
      ] },

    { id: "hoking",
      b: { en: "Ho King Commercial Centre", zh: "好景商業中心" },
      a: { en: "2–16 Fa Yuen Street, Mong Kok", zh: "旺角花園街2–16號" },
      q: "好景商業中心 旺角花園街",
      /* Junction of Fa Yuen Street and Dundas Street (confirmed, Wikipedia). */
      lat: 22.315983, lng: 114.171942,
      shops: [
        { n: "Holly store", u: "1411C", c: "fashion", w: { zh: "95折", en: "5% off" }, src: "aeterna" },
        { n: "Black story", u: "1408 室", c: "fashion", w: { zh: "現貨95折", en: "5% off in-stock items" }, src: "hkssa" },
        { n: "Counting starr", u: "22樓 07 室", c: "fashion", w: { zh: "部份貨品95折", en: "5% off selected items" }, src: "hkssa" },
        { n: "Halfbeathk", u: "8樓 02 室", c: "fashion", w: { zh: "9折", en: "10% off" }, src: "hkssa" },
        { n: "Korealane", u: "1607 室", c: "fashion", w: { zh: "滿$300享88折，需學生證", en: "12% off over $300, student ID required" }, src: "hkssa" },
        { n: "Take two", u: "1712 室", c: "fashion", w: { zh: "指定貨品95折，需出示會員證", en: "5% off selected items, membership card required" }, src: "hkssa" }
      ] },

    { id: "siuwan",
      b: { en: "CTMA Centre", zh: "兆萬中心" },
      a: { en: "1N Sai Yeung Choi St South, Mong Kok", zh: "旺角西洋菜南街1N號" },
      q: "兆萬中心 CTMA Centre 旺角西洋菜南街1N號",
      /* 1N Sai Yeung Choi Street South, by the Dundas Street junction
         (confirmed, Wikipedia — CTMA Centre, built 1996). */
      lat: 22.315650, lng: 114.170713,
      shops: [
        { n: "Majestic imagine of life", u: "411 & 412 號", c: "fashion", w: { zh: "95折", en: "5% off" }, src: "aeterna" },
        { n: "Mr.Scareco", u: "2樓 209", c: "fashion", w: { zh: "9折", en: "10% off" }, src: "aeterna" },
        { n: "Daydaydreams", u: "2樓 209", c: "fashion", w: { zh: "全店9折", en: "10% off store-wide" }, src: "hkssa" }
      ] },

    { id: "argyle",
      b: { en: "Argyle Centre", zh: "旺角中心" },
      a: { en: "688 Nathan Road, Mong Kok", zh: "旺角彌敦道688號" },
      q: "旺角中心 Argyle Centre 彌敦道688號",
      /* 688 Nathan Road at the Argyle Street junction. */
      lat: 22.319878, lng: 114.169716,
      shops: [
        { n: "Moon Moon CHA", u: "1樓 F84 號舖", c: "food", w: { zh: "85折", en: "15% off" }, src: "aeterna" },
        { n: "魔法雞排", u: "1期 1樓 F52 號舖", c: "food", w: { zh: "正價9折", en: "10% off full price" }, src: "hkssa" },
        { n: "E&T Art Workshop", u: "3樓 T74 號舖", c: "fashion", w: { zh: "9折", en: "10% off" }, src: "hkssa" }
      ] },

    { id: "trendy",
      b: { en: "Trendy Zone", zh: "潮流特區" },
      a: { en: "Chow Tai Fook Centre, 580A Nathan Rd — entrance on Dundas St", zh: "旺角彌敦道580A號周大福商業中心（入口在登打士街）" },
      q: "潮流特區 Trendy Zone 周大福商業中心 旺角登打士街",
      /* Chow Tai Fook Centre, 580A Nathan Road — the only entrance is on
         Dundas Street (confirmed, hklocation). */
      lat: 22.315528, lng: 114.170401,
      shops: [
        { n: "Deluxe", u: "B24", c: "other", w: { zh: "95折", en: "5% off" }, src: "aeterna" },
        { n: "Madtoy", u: "228", c: "other", w: { zh: "9折", en: "10% off" }, src: "aeterna" },
        { n: "B05", u: "", c: "other", w: { zh: "8折", en: "20% off" }, src: "hkssa" }
      ] },

    { id: "langham",
      b: { en: "Langham Place", zh: "朗豪坊" },
      a: { en: "8 Argyle Street, Mong Kok", zh: "旺角亞皆老街8號" },
      q: "朗豪坊 Langham Place 亞皆老街8號",
      /* 8 Argyle Street — coordinate from Wikipedia (22°19′5.35″N,
         114°10′5.11″E). */
      lat: 22.318212, lng: 114.168674,
      shops: [
        { n: "Lab10", u: "10樓 26 號", c: "other", w: { zh: "15% off，不可與其他優惠同時使用", en: "15% off, not combinable with other offers" }, src: "hkssa" },
        { n: "PIG PIG candy", u: "L11 21 & 22", c: "food", w: { zh: "散裝橡皮糖滿$30享9折，需學生證", en: "10% off loose gummies over $30, student ID required" }, src: "hkssa" }
      ] },

    { id: "sunshine",
      b: { en: "Sun Shine City", zh: "新之城" },
      a: { en: "Mong Kok — exact street not yet confirmed", zh: "旺角（確切街道待確認）" },
      q: "新之城 旺角",
      lat: 22.319801, lng: 114.169795,
      shops: [
        { n: "花。畫", u: "2樓 Shop 256", c: "other", w: { zh: "9折", en: "10% off" }, src: "aeterna" }
      ] },

    { id: "yimpofong",
      b: { en: "9 Yim Po Fong Street", zh: "煙廠街9號" },
      a: { en: "9 Yim Po Fong Street, Mong Kok", zh: "旺角煙廠街9號" },
      q: "旺角煙廠街9號",
      lat: 22.316619, lng: 114.172148,
      shops: [
        { n: "Tim store", u: "20樓 04 室", c: "other", w: { zh: "正價9折", en: "10% off full price" }, src: "hkssa" }
      ] },

    { id: "kwongwa",
      b: { en: "Tsui Yuen Building, Kwong Wa Street", zh: "廣華街翠園大樓" },
      a: { en: "Tsui Yuen Bldg Phase 3, 2–30 Kwong Wa St, Mong Kok", zh: "旺角廣華街2–30號翠園大樓三期" },
      q: "旺角廣華街翠園大樓",
      lat: 22.316207, lng: 114.173398, approx: true,
      shops: [
        { n: "爆汗串串", u: "三期地下 2 號舖", c: "food", w: { zh: "正價9折", en: "10% off full price" }, src: "hkssa" }
      ] },

    { id: "cameron",
      b: { en: "21C Cameron Road", zh: "金馬倫道21C號" },
      a: { en: "21C Cameron Road, Tsim Sha Tsui", zh: "尖沙咀金馬倫道21C號" },
      q: "尖沙咀金馬倫道21C號",
      lat: 22.299225, lng: 114.174203,
      shops: [
        { n: "潮丸", u: "地舖", c: "food", w: { zh: "減10%，不可與其他優惠同時使用", en: "10% off, not combinable with other offers" }, src: "hkssa" }
      ] }
  ],

  /* Shops whose welfare entry says only "旺角" with no street or unit —
     listed so they aren't lost, but they cannot be pinned. */
  UNPLACED: [
    { n: "Kawaii", c: "fashion", w: { zh: "買滿兩件 −$10；三件 −$20", en: "−$10 on 2 items · −$20 on 3" }, src: "hkssa" },
    { n: "Angle", c: "other", w: { zh: "9折", en: "10% off" }, src: "aeterna" },
    { n: "Fantasy", c: "other", w: { zh: "2件9折", en: "10% off when buying 2" }, src: "hkssa" }
    /* These follow the same chip filters as the pinned shops. */
  ]
};
