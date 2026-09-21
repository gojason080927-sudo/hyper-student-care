import { Outlet, useLocation } from 'react-router-dom'
import '../../styles/teacherMobileTheme.css'
import { OfflineBanner } from './OfflineBanner'
import { PwaInstallPrompt } from './PwaInstallPrompt'
import { TeacherPwaRegistrar } from './TeacherPwaRegistrar'
import { TeacherMobileBottomNav } from './TeacherMobileBottomNav'
import { useEffect } from 'react'

export function isTeacherMobileHomePath(pathname: string) {
  return pathname === '/teacher/mobile' || pathname === '/teacher/mobile/'
}

export function TeacherMobileLayout() {
  const { pathname } = useLocation()
  const isHome = isTeacherMobileHomePath(pathname)

  useEffect(() => {
    document.title = 'HYPER TEACHER'

    const theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#5b348a')

    let appleIcon = document.querySelector(
      'link[rel="apple-touch-icon"]',
    ) as HTMLLinkElement | null
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = '/teacher/hyper-teacher-apple-touch-v12-180.png?v=12'

    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (favicon) {
      favicon.href = '/teacher/hyper-teacher-icon-v21-192.png?v=21'
      favicon.type = 'image/png'
    }

    let appleTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    ) as HTMLMetaElement | null
    if (!appleTitle) {
      appleTitle = document.createElement('meta')
      appleTitle.name = 'apple-mobile-web-app-title'
      document.head.appendChild(appleTitle)
    }
    appleTitle.content = 'HYPER TEACHER'

    return () => {
      document.title = 'HYPER STUDENT CARE'
    }
  }, [])

  return (
    <div className="teacher-mobile-app flex min-h-svh flex-col overflow-x-hidden">
      <TeacherPwaRegistrar />
      <OfflineBanner />
      <main
        className={
          isHome
            ? 'flex min-h-0 flex-1 flex-col'
            : 'flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]'
        }
        id="teacher-mobile-main"
      >
        <Outlet />
      </main>
      {isHome ? null : <TeacherMobileBottomNav />}
      <PwaInstallPrompt />
    </div>
  )
}
