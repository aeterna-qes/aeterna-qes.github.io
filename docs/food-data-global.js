/* Aeterna food map — PRELOADED DATA.
   ---------------------------------------------------------------------------
   This file makes the food map instant: no network request, no waiting.
   While `items` is empty the site falls back to querying OpenStreetMap live.

   HOW TO FILL IT (about two minutes, once a term):

   1. Go to  https://overpass-turbo.eu
   2. Paste this into the left-hand panel, replacing whatever is there:

        [out:json][timeout:60];
        (
          node(around:900,22.323445,114.171458)["amenity"~"^(restaurant|fast_food|cafe|ice_cream)$"]["name"];
          way(around:900,22.323445,114.171458)["amenity"~"^(restaurant|fast_food|cafe|ice_cream)$"]["name"];
        );
        out center;

   3. Click "Run". Wait for the pins to appear.
   4. Click "Export" → "raw data directly from Overpass API".
      A .json file downloads.
   5. Send that file to Claude and it will be converted into this file.

   The 900 is the radius in metres from the school gate (≈15 min walk).
   22.323445,114.171458 is QES.

   Fields on each item:
     n     name in English (or the only name OSM has)
     z     name in Chinese
     c     category id — noodle chacha jp kr fast snack drink dessert rice other
     la/lo latitude / longitude
     d     true if the shop is also on our student-welfare list
   --------------------------------------------------------------------------- */
window.AE_FOOD = {
  generated: null,
  items: []
};
