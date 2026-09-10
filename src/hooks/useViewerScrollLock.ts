import { useEffect, useRef } from 'react'

/** 전체화면 뷰어용 스크롤 잠금. 닫을 때 원래 스크롤 위치를 복원한다. */
export function useViewerScrollLock(locked: boolean) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!locked) return

    scrollYRef.current = window.scrollY
    const { overflow, position, top, width } = document.body.style
    const htmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYRef.current}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = overflow
      document.body.style.position = position
      document.body.style.top = top
      document.body.style.width = width
      window.scrollTo(0, scrollYRef.current)
    }
  }, [locked])
}
