import type { ContentPost, NoticeAudienceType } from '../types/records'
import type { Student } from '../types/student'
import { getMathSharedGroup, getMathSharedLinkedClassNames } from './mathSharedGroup'

function isWithinPublishPeriod(post: ContentPost, today = new Date()): boolean {
  const todayStr = today.toISOString().slice(0, 10)
  if (post.publishStartDate && post.publishStartDate > todayStr) return false
  if (post.publishEndDate && post.publishEndDate < todayStr) return false
  return true
}

/** 학부모·학생 화면용 공지 필터 (RPC 2차 검증·로컬 모드용) */
export function isNoticeVisibleToStudent(
  post: ContentPost,
  student: Pick<Student, 'id' | 'grade' | 'className'>,
): boolean {
  if (!post.isPublished) return false
  if (!isWithinPublishPeriod(post)) return false

  const audience: NoticeAudienceType = post.audienceType ?? 'all'
  const className = student.className.trim()

  switch (audience) {
    case 'all':
      return true
    case 'grade':
      return post.targetGrade === student.grade
    case 'student':
      return post.targetStudentId === student.id
    case 'class': {
      const target = (post.targetClassName ?? '').trim()
      if (!target) return false
      if (target === className) return true
      const targetGroup = getMathSharedGroup(student.grade, target)
      const studentGroup = getMathSharedGroup(student.grade, className)
      if (
        targetGroup &&
        studentGroup &&
        targetGroup === studentGroup &&
        target.includes(' 수학')
      ) {
        const linked = getMathSharedLinkedClassNames(student.grade, className)
        return linked.includes(target)
      }
      return false
    }
    default:
      return true
  }
}

export function filterNoticesForStudent(
  posts: ContentPost[],
  student: Pick<Student, 'id' | 'grade' | 'className'>,
): ContentPost[] {
  return posts.filter((post) => isNoticeVisibleToStudent(post, student))
}

/** 강사 관리 화면: 만료 공지 포함 여부 */
export function filterNoticesForTeacherAdmin(
  posts: ContentPost[],
  includeExpired: boolean,
): ContentPost[] {
  if (includeExpired) return posts
  const todayStr = new Date().toISOString().slice(0, 10)
  return posts.filter((post) => !post.publishEndDate || post.publishEndDate >= todayStr)
}

export const NOTICE_AUDIENCE_OPTIONS: { value: NoticeAudienceType; label: string }[] = [
  { value: 'all', label: '전체 학생' },
  { value: 'grade', label: '특정 학년' },
  { value: 'class', label: '특정 반/과정' },
  { value: 'student', label: '특정 학생' },
]

export const SCHEDULE_DAY_OPTIONS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
] as const
