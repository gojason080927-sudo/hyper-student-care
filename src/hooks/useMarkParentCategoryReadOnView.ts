import { useEffect, useRef } from 'react'
import { useParentUnreadOptional } from '../contexts/ParentUnreadContext'
import type { ParentUnreadCategory } from '../utils/parentUnread'

/** 상세 페이지가 정상 로드된 뒤 해당 메뉴 읽음 처리 */
export function useMarkParentCategoryReadOnView(
  category: ParentUnreadCategory,
  ready = true,
  seenThrough?: string | null,
) {
  const unread = useParentUnreadOptional()
  const markCategoryRead = unread?.markCategoryRead
  const markedRef = useRef<string | null>(null)
  const seenKey = seenThrough ?? ''

  useEffect(() => {
    if (!markCategoryRead || !ready) return
    const markKey = `${category}:${seenKey}`
    if (markedRef.current === markKey) return
    markedRef.current = markKey
    void markCategoryRead(category, seenThrough)
  }, [category, ready, markCategoryRead, seenKey, seenThrough])
}
