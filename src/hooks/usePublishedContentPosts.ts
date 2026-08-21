import { useMemo } from 'react'
import type { ContentPost } from '../types/records'
import type { Student } from '../types/student'
import { sortContentPosts } from '../utils/contentPost'
import { filterNoticesForStudent } from '../utils/noticeAudience'
import { useData } from './useData'

/** 학부모·학생용 읽기 전용 게시글 (공개·대상 필터 적용) */
export function usePublishedContentPosts(student?: Pick<Student, 'id' | 'grade' | 'className'>): ContentPost[] {
  const { contentPosts } = useData()
  return useMemo(() => {
    let list = contentPosts.filter((post) => post.isPublished)
    if (student) {
      list = filterNoticesForStudent(list, student)
    }
    return sortContentPosts(list)
  }, [contentPosts, student])
}
