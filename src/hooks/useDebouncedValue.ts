import { useEffect, useState } from 'react'

/** 검색 입력 등에 사용 — 짧은 debounce로 불필요한 렌더링 감소 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, value])

  return debounced
}
