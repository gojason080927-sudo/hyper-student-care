import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

/** Cache-bust query — bump when forcing clients to re-fetch manifest */
const TEACHER_MANIFEST_HREF = '/teacher/manifest.webmanifest?v=4-daily-test-20260821'
const SW_UPDATE_INTERVAL_MS = 60_000

let teacherSwReloadScheduled = false

/**
 * 강사용 PWA manifest 연결 + service worker 등록 (로그인 전 포함).
 * autoUpdate: 새 배포 SW가 설치되면 활성화 후 클라이언트를 최신 번들로 맞춤.
 * Supabase/학생 데이터 캐시는 건드리지 않음 (NetworkOnly).
 */
export function TeacherPwaRegistrar() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = () => {
        void registration.update().catch((error) => {
          console.warn('[TeacherPWA] update check failed', error)
        })
      }

      check()
      window.setInterval(check, SW_UPDATE_INTERVAL_MS)

      const onVisible = () => {
        if (document.visibilityState === 'visible') check()
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('focus', check)
    },
    onNeedRefresh() {
      void updateServiceWorker(true)
    },
  })

  useEffect(() => {
    let manifestLink = document.querySelector(
      'link[rel="manifest"][data-teacher-pwa]',
    ) as HTMLLinkElement | null
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.setAttribute('data-teacher-pwa', 'true')
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = TEACHER_MANIFEST_HREF

    const theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#0B1F4A')

    if (!('serviceWorker' in navigator)) {
      return () => {
        manifestLink?.remove()
      }
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.installing?.scriptURL ??
          registration.waiting?.scriptURL ??
          ''
        const isLegacyRootSw =
          scriptUrl.includes('/sw.js') && !scriptUrl.includes('/teacher/sw.js')
        if (isLegacyRootSw) {
          void registration.unregister()
        }
      }
    })

    const onControllerChange = () => {
      if (teacherSwReloadScheduled) return
      teacherSwReloadScheduled = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      manifestLink?.remove()
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return (
    <PwaUpdatePrompt
      needRefresh={needRefresh}
      onUpdate={() => {
        void updateServiceWorker(true)
      }}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}
