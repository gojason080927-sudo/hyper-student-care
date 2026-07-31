import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

const TEACHER_MANIFEST_HREF = '/teacher/manifest.webmanifest'

/** 강사용 PWA manifest 연결 + service worker 등록 (로그인 전 포함) */
export function TeacherPwaRegistrar() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      void registration?.update()
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
    if (theme) theme.setAttribute('content', '#173564')

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const scriptUrl =
            registration.active?.scriptURL ?? registration.installing?.scriptURL ?? ''
          const isLegacyRootSw =
            scriptUrl.includes('/sw.js') && !scriptUrl.includes('/teacher/sw.js')
          if (isLegacyRootSw) {
            void registration.unregister()
          }
        }
      })
    }

    return () => {
      manifestLink?.remove()
    }
  }, [])

  return (
    <PwaUpdatePrompt
      needRefresh={needRefresh}
      onUpdate={() => void updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}
