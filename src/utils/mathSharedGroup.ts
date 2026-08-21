import type { Grade } from '../types/student'
import type { ClassTodayReportCommon, TextbookSubject } from '../types/records'
import {
  CLASS_OPTIONS_BY_GRADE,
  isActiveGrade,
  parseStandardClassName,
} from './studentGradeClass'

export type MathSharedGroup = 'A' | 'B'

/** 학년에 수학A/B + 영수A/B 구조가 모두 있을 때만 연동 */
export function gradeHasMathAbLinkStructure(grade: string): grade is Grade {
  if (!isActiveGrade(grade)) return false
  const options = CLASS_OPTIONS_BY_GRADE[grade]
  const hasMathA = options.some((option) => option.endsWith(' 수학A'))
  const hasMathB = options.some((option) => option.endsWith(' 수학B'))
  const hasEngA = options.some((option) => option.endsWith(' 영수A'))
  const hasEngB = options.some((option) => option.endsWith(' 영수B'))
  return hasMathA && hasMathB && hasEngA && hasEngB
}

export function getMathSharedGroup(
  grade: string,
  className: string,
): MathSharedGroup | null {
  const trimmed = className.trim()
  if (!trimmed || !gradeHasMathAbLinkStructure(grade)) return null

  const parsed = parseStandardClassName(trimmed)
  if (!parsed || parsed.grade !== grade) return null

  if (parsed.track === '수학A' || parsed.track === '영수A') return 'A'
  if (parsed.track === '수학B' || parsed.track === '영수B') return 'B'
  return null
}

/** 수학 공통 저장·조회용 shared group key (예: "중3-math-A") */
export function getMathSharedGroupKey(grade: string, className: string): string | null {
  const group = getMathSharedGroup(grade, className)
  if (!group) return null
  return `${grade}-math-${group}`
}

/** 연동 대상 반명 목록 — 현재 반을 우선 */
export function getMathSharedLinkedClassNames(grade: string, className: string): string[] {
  const trimmed = className.trim()
  if (!trimmed) return []

  const group = getMathSharedGroup(grade, trimmed)
  if (!group) return [trimmed]

  const mathClass = `${grade} 수학${group}`
  const engClass = `${grade} 영수${group}`
  if (trimmed === mathClass) return [mathClass, engClass]
  if (trimmed === engClass) return [engClass, mathClass]
  return [trimmed]
}

export function isMathSharedLinkClass(grade: string, className: string): boolean {
  return getMathSharedGroup(grade, className) !== null
}

export function classNamesForClassCommonLookup(
  grade: string,
  className: string,
  subject: TextbookSubject,
): string[] {
  if (subject === '수학') {
    return getMathSharedLinkedClassNames(grade, className)
  }
  return [className.trim()]
}

export function expandClassCommonRecordsForMathSharing(
  record: ClassTodayReportCommon,
): ClassTodayReportCommon[] {
  if (record.subject !== '수학') return [record]

  const linked = getMathSharedLinkedClassNames(record.grade, record.className)
  if (linked.length <= 1) return [record]

  return linked.map((linkedClassName) => ({
    ...record,
    className: linkedClassName,
  }))
}

export function classCommonRecordsHaveMathConflict(
  a: ClassTodayReportCommon,
  b: ClassTodayReportCommon,
): boolean {
  if (a.subject !== '수학' || b.subject !== '수학') return false
  if (a.grade !== b.grade || a.reportDate !== b.reportDate) return false
  if (a.slotNumber !== b.slotNumber) return false

  const fieldsEqual =
    a.previousAssignment.trim() === b.previousAssignment.trim() &&
    a.todayAssignment.trim() === b.todayAssignment.trim() &&
    a.currentProgress.trim() === b.currentProgress.trim() &&
    a.currentPage === b.currentPage &&
    a.totalPage === b.totalPage

  if (fieldsEqual) return false

  const aHasContent = classCommonRecordHasContent(a)
  const bHasContent = classCommonRecordHasContent(b)
  return aHasContent && bHasContent
}

export function classCommonRecordHasContent(record: ClassTodayReportCommon): boolean {
  return Boolean(
    record.previousAssignment.trim() ||
      record.todayAssignment.trim() ||
      record.currentProgress.trim() ||
      record.currentPage > 0 ||
      record.totalPage > 0,
  )
}
