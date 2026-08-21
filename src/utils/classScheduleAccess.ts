import type { ClassScheduleGrid } from '../types/records'
import type { Student } from '../types/student'
import { getMathSharedLinkedClassNames } from './mathSharedGroup'
import { parseStandardClassName } from './studentGradeClass'

/** 학생이 조회할 수 있는 반/과정명 목록 (Grid 시간표용) */
export function getScheduleGridClassNamesForStudent(
  grade: string,
  className: string,
): string[] {
  const trimmed = className.trim()
  if (!trimmed) return []

  const linked = getMathSharedLinkedClassNames(grade, trimmed)
  const names = new Set(linked.length > 1 ? linked : [trimmed])

  const parsed = parseStandardClassName(trimmed)
  if (
    parsed &&
    (parsed.track === '영수' || parsed.track === '영수A' || parsed.track === '영수B')
  ) {
    names.add(`${grade} 영어`)
  }

  return [...names]
}

export function isScheduleGridVisibleToStudent(
  grid: ClassScheduleGrid,
  grade: string,
  className: string,
): boolean {
  if (!grid.isActive) return false
  if (grid.grade !== grade) return false
  const allowed = getScheduleGridClassNamesForStudent(grade, className)
  return allowed.includes(grid.className)
}

export function filterScheduleGridsForStudent(
  grids: ClassScheduleGrid[],
  student: Pick<Student, 'grade' | 'className'>,
): ClassScheduleGrid[] {
  return grids.filter((grid) => isScheduleGridVisibleToStudent(grid, student.grade, student.className))
}

export function sortScheduleGrids(grids: ClassScheduleGrid[]): ClassScheduleGrid[] {
  return [...grids].sort((a, b) => a.className.localeCompare(b.className, 'ko'))
}

export { getMathSharedLinkedClassNames }
