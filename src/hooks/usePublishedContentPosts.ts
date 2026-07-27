import { useMemo } from 'react'
import type { ContentPost } from '../types/records'
import { sortContentPosts } from '../utils/contentPost'
import { useData } from './useData'

/** 학부모·학생용 읽기 전용 게시글 (공개 글만, 저장·삭제 함수 미포함) */
export function usePublishedContentPosts(): ContentPost[] {
  const { contentPosts } = useData()
  return useMemo(
    () => sortContentPosts(contentPosts.filter((post) => post.isPublished)),
    [contentPosts],
  )
}
