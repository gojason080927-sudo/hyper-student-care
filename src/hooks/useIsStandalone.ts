import { useMemo } from 'react'

/** PWA 홈 화면 추가 후 standalone 실행 여부 */
export function useIsStandalone(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  }, [])
}
