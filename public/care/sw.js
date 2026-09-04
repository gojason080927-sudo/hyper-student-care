/* 학부모 /care PWA service worker — push + 알림 클릭. 강사 /teacher/sw.js 와 스코프가 다릅니다. */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Android Chrome WebAPK("앱 설치") requires a fetch listener.
// Network-only passthrough — does not cache and does not change push handling.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})

self.addEventListener('push', (event) => {
  let payload = { title: 'HYPER Student Care', body: '', url: '/care/' }
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) }
  } catch {
    if (event.data) {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HYPER Student Care', {
      body: payload.body || '오늘 학습보고가 등록되었습니다.',
      icon: '/care/hyper-parent-icon-v6-192.png',
      badge: '/care/hyper-parent-icon-v6-192.png',
      data: { url: payload.url || '/care/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/care/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = client.url || ''
        if (url.includes('/care/') && 'focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(targetUrl).then((navigated) => navigated || client.focus())
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
