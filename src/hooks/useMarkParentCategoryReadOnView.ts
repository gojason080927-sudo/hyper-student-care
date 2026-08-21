import { useEffect, useRef } from 'react'
import { useParentUnreadOptional } from '../contexts/ParentUnreadContext'
import type { ParentUnreadCategory } from '../utils/parentUnread'

/** 상세 페이지가 정상 로드된 뒤 해당 메뉴 읽음 처리 */
export function useMarkParentCategoryReadOnView(
  category: ParentUnreadCategory,
  ready = true,
) {
  const unread = useParentUnreadOptional()
  const markedRef = useRef(false)

  useEffect(() => {
    if (!unread || !ready || markedRef.current) return
    markedRef.current = true
    void unread.markCategoryRead(category)
  }, [category, ready, unread])
}
