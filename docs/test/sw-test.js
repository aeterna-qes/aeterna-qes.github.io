/* Diagnostic only — an empty service worker with no imports.
   If this registers but OneSignalSDKWorker.js does not, the failure is the
   cross-origin importScripts inside the OneSignal worker, not the file path. */
self.addEventListener('install', function () { self.skipWaiting(); });
