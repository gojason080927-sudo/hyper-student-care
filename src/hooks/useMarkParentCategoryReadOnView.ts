import { useEffect, useRef } from 'react'
import { useParentUnreadOptional } from '../contexts/ParentUnreadContext'
import type { ParentUnreadCategory } from '../utils/parentUnread'

/** 상세 페이지가 정상 로드된 뒤 해당 메뉴 읽음 처리 */
export function useMarkParentCategoryReadOnView(
  category: ParentUnreadCategory,
  ready = true,
) {
  const unread = useParentUnreadOptional()
  const markCategoryRead = unread?.markCategoryRead
  const markedRef = useRef(false)

  useEffect(() => {
    if (!markCategoryRead || !ready || markedRef.current) return
    markedRef.current = true
    void markCategoryRead(category)
  }, [category, ready, markCategoryRead])
}
