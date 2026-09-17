import { useEffect, useRef } from 'react'

/**
 * 자료실 화면이 이미 열린 뒤 앱 재개(백그라운드→포그라운드, bfcache) 시에만 다시 읽는다.
 * HOME → 자료실 SPA 진입 갱신은 HubLayout이 Outlet을 내리고 다시 읽는다.
 * 여기서 pathname/mount reload를 다시 넣으면 하드 리로드와 루프가 생긴다.
 */
export function useHubContentRefresh(reload: () => Promise<void>): { refreshing: boolean } {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reloadRef.current()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void reloadRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return { refreshing: false }
}
