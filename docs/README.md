# Aeterna website — deploy files

Upload the **contents of this folder** (not the folder itself) to the repo root:

    index.html
    manifest.json
    OneSignalSDKWorker.js     <- must sit next to index.html
    support.js
    welfare-data-global.js
    calendar-data-global.js
    photos/                   (36 images + app icons)
    _ds/                      (stylesheet)
    .nojekyll                 (required — stops GitHub Pages ignoring _ds/)

GitHub Pages: Settings → Pages → Deploy from branch → main → / (root).

---

## Turning on notifications

Notifications are **off** until you add a OneSignal App ID.

1. Sign up free at onesignal.com → New App/Website → Web.
2. Site URL: your live GitHub Pages URL (must be the exact https:// address).
3. Choose "Custom Code" integration. Skip their code snippet — it's already built in.
4. Copy the **App ID**.
5. In `index.html`, find this line (near the bottom):

       &quot;pushAppId&quot;:{&quot;editor&quot;:&quot;text&quot;,&quot;default&quot;:&quot;&quot;

   Put your App ID between the last pair of `&quot;` marks:

       &quot;default&quot;:&quot;your-app-id-here&quot;

6. Re-upload `index.html`. The bell appears in the nav bar.

To send a notification: OneSignal dashboard → Messages → New Push.

### What to expect
- **Android Chrome** — works straight away.
- **iPhone/iPad** — only in Safari, and only after "Add to Home Screen" (iOS 16.4+). The site tells users this automatically.
- **iOS Chrome** — cannot receive web push at all. Apple's restriction, not fixable.
- Realistic opt-in is roughly 10–30% of visitors.

### Previewing the bell before setup
Add `?push` to the URL (e.g. `…/index.html?push`) to see the notification dialog without an App ID.
