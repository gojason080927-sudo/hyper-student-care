import { useEffect, useRef } from 'react'

/**
 * HubLayout은 accessKey가 바뀔 때만 bundle을 읽는다.
 * 문제/영상 자료실은 진입·앱 재개 시 최신 게시를 다시 조회한다.
 */
export function useHubContentRefresh(reload: () => Promise<void>) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    void reloadRef.current()
    const run = () => {
      void reloadRef.current()
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
