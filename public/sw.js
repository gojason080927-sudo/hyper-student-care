// Legacy root-scope service worker cleanup.
// Replaces the old /sw.js that cached site-wide and blocked PWA install updates.
// Cache bust: 2026-08-21-daily-test-deploy
const SW_CLEANUP_VERSION = '2026-08-21-daily-test-deploy'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => {
        console.log('[sw-cleanup]', SW_CLEANUP_VERSION)
      }),
  )
})
