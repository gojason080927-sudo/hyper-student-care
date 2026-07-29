import { useEffect } from 'react'

/** 모바일 사이드바 열림 시 본문 스크롤 잠금, 닫을 때 복원 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}
