import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 문제/영상 자료실: SPA 라우트 진입 시 bundle을 다시 읽고, 앱 재개 시에도 갱신한다.
 * visibility/focus는 HOME → 자료실 탭 이동에서 발생하지 않는다.
 */
export function useHubContentRefresh(reload: () => Promise<void>): { refreshing: boolean } {
  const location = useLocation()
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRefreshing(true)
    void reloadRef.current().finally(() => {
      if (!cancelled) setRefreshing(false)
    })
    const runSilent = () => {
      void reloadRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') runSilent()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', runSilent)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', runSilent)
    }
  }, [location.pathname])

  return { refreshing }
}
