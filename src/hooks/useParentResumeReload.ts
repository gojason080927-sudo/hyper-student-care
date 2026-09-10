import { useEffect, useRef } from 'react'

/**
 * 카카오 인앱·PWA가 기존 WebView를 다시 보여줄 때 최신 서버 값을 다시 읽는다.
 * 최초 mount 조회는 호출 측에서 수행한다.
 */
export function useParentResumeReload(reload: () => void) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    const run = () => {
      reloadRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', run)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', run)
      window.removeEventListener('focus', onVisible)
    }
  }, [])
}
