import type { Student } from '../types/student'

export type MakeupPlanAudienceType = 'all' | 'grade' | 'class' | 'student'

export type MakeupPlanAudienceSelection = {
  audienceType: MakeupPlanAudienceType
  targetGrade: string
  targetClassName: string
  targetStudentId: string
}

export const MAKEUP_PLAN_AUDIENCE_OPTIONS: { value: MakeupPlanAudienceType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'grade', label: '학년' },
  { value: 'class', label: '특정 반' },
  { value: 'student', label: '학생' },
]

export function makeupPlanAudienceSelectionError(
  audience: MakeupPlanAudienceSelection,
): string | null {
  const type = audience.audienceType || 'student'
  if (type === 'all') return null
  if (type === 'grade') {
    return audience.targetGrade.trim() ? null : '학년을 선택해 주세요.'
  }
  if (type === 'class') {
    if (!audience.targetGrade.trim()) return '학년을 선택해 주세요.'
    if (!audience.targetClassName.trim()) return '반을 선택해 주세요.'
    return null
  }
  return audience.targetStudentId.trim() ? null : '학생을 선택해 주세요.'
}

export function enrolledStudentsForMakeup(
  students: Pick<Student, 'id' | 'grade' | 'className' | 'status'>[],
): Pick<Student, 'id' | 'grade' | 'className' | 'status'>[] {
  return students.filter((student) => student.status === '재원')
}

export function resolveMakeupPlanTargetStudentIds(
  students: Pick<Student, 'id' | 'grade' | 'className' | 'status'>[],
  audience: MakeupPlanAudienceSelection,
): { studentIds: string[]; error: string | null } {
  const selectionError = makeupPlanAudienceSelectionError(audience)
  if (selectionError) return { studentIds: [], error: selectionError }

  const enrolled = enrolledStudentsForMakeup(students)
  const type = audience.audienceType || 'student'
  let matched = enrolled

  if (type === 'grade') {
    matched = enrolled.filter((student) => student.grade === audience.targetGrade.trim())
  } else if (type === 'class') {
    const grade = audience.targetGrade.trim()
    const className = audience.targetClassName.trim()
    matched = enrolled.filter(
      (student) => student.grade === grade && student.className.trim() === className,
    )
  } else if (type === 'student') {
    matched = enrolled.filter((student) => student.id === audience.targetStudentId.trim())
  }

  const studentIds = [...new Set(matched.map((student) => student.id))]
  if (studentIds.length === 0) {
    return { studentIds: [], error: '해당하는 재원 학생이 없습니다.' }
  }
  return { studentIds, error: null }
}
