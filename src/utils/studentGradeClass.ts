import type { Grade, StoredGrade, SubjectOption } from '../types/student'
import { GRADES } from './labels'

export const CLASS_TRACKS = ['수학', '영어', '영수'] as const
export type ClassTrack = (typeof CLASS_TRACKS)[number]

export function isActiveGrade(grade: string): grade is Grade {
  return (GRADES as readonly string[]).includes(grade)
}

/** 학년별 표준 반/과정: 예) 고1 수학, 고1 영어, 고1 영수 */
export function getClassOptionsForGrade(grade: string): string[] {
  if (!isActiveGrade(grade)) return []
  return CLASS_TRACKS.map((track) => `${grade} ${track}`)
}

export function getAllStandardClassOptions(): string[] {
  return GRADES.flatMap((grade) => getClassOptionsForGrade(grade))
}

export function parseStandardClassName(
  className: string,
): { grade: Grade; track: ClassTrack } | null {
  const trimmed = className.trim()
  if (!trimmed) return null
  for (const grade of GRADES) {
    const prefix = `${grade} `
    if (!trimmed.startsWith(prefix)) continue
    const track = trimmed.slice(prefix.length) as ClassTrack
    if (CLASS_TRACKS.includes(track)) {
      return { grade, track }
    }
  }
  return null
}

export function parseGradeFromClassName(className: string): Grade | null {
  return parseStandardClassName(className)?.grade ?? null
}

export function classTrackToSubject(track: ClassTrack): SubjectOption {
  switch (track) {
    case '수학':
      return '수학'
    case '영어':
      return '영어'
    case '영수':
      return '영어·수학'
  }
}

export function subjectToClassTrack(subject: SubjectOption): ClassTrack {
  switch (subject) {
    case '수학':
      return '수학'
    case '영어':
      return '영어'
    case '영어·수학':
      return '영수'
  }
}

export function buildStandardClassName(grade: string, track: ClassTrack): string {
  return `${grade} ${track}`
}

/** 반/과정 선택 시 과목 자동 매핑 (표준 형식만) */
export function syncSubjectFromClassName(className: string): SubjectOption | null {
  const parsed = parseStandardClassName(className)
  if (!parsed) return null
  return classTrackToSubject(parsed.track)
}

/** 학년 select: 활성 학년 + 기존(비활성) 학년 1개 */
export function getGradeSelectOptions(currentGrade?: string): string[] {
  if (currentGrade && !isActiveGrade(currentGrade)) {
    return [...GRADES, currentGrade]
  }
  return [...GRADES]
}

/** 필터용 반/과정: 표준 3개 + 해당 학년의 기존 비표준 값 */
export function getClassFilterOptions(
  grade: string,
  legacyClassNames: string[] = [],
): string[] {
  if (!grade) return []
  const standard = getClassOptionsForGrade(grade)
  const legacy = legacyClassNames.filter(
    (name) => name.trim() && !standard.includes(name),
  )
  return [...standard, ...legacy]
}

export function collectLegacyClassNamesForGrade(
  students: Array<{ grade: string; className: string }>,
  grade: string,
): string[] {
  const standard = new Set(getClassOptionsForGrade(grade))
  return [
    ...new Set(
      students
        .filter((student) => student.grade === grade && student.className.trim())
        .map((student) => student.className.trim())
        .filter((name) => !standard.has(name)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'))
}

/** 기존 반/과정 → 표준 형식 자동 매핑 (가능할 때만) */
export function mapLegacyClassName(
  className: string,
  grade: StoredGrade,
  subject: SubjectOption,
): string {
  if (parseStandardClassName(className)) return className
  if (!isActiveGrade(grade)) return className

  const normalized = className.trim().toLowerCase()

  if (!normalized) {
    return buildStandardClassName(grade, subjectToClassTrack(subject))
  }

  if (
    normalized.includes('영수') ||
    normalized.includes('영어·수학') ||
    normalized.includes('영어/수학')
  ) {
    return buildStandardClassName(grade, '영수')
  }
  if (normalized.includes('영어') || normalized.includes('english')) {
    return buildStandardClassName(grade, '영어')
  }
  if (normalized.includes('수학') || normalized.includes('math')) {
    return buildStandardClassName(grade, '수학')
  }

  return className
}

export function getClassSelectOptions(
  grade: string,
  currentClassName?: string,
): string[] {
  const standard = getClassOptionsForGrade(grade)
  if (currentClassName?.trim() && !standard.includes(currentClassName)) {
    return [...standard, currentClassName]
  }
  return standard
}

/** 재원 학생에 실제 등록된 반/과정 목록 (중복 제거, 표준 순서 우선) */
export function sortClassNamesForDisplay(classNames: string[]): string[] {
  const unique = [...new Set(classNames.map((name) => name.trim()).filter(Boolean))]
  const standardOrder = getAllStandardClassOptions()
  const standard = standardOrder.filter((name) => unique.includes(name))
  const legacy = unique
    .filter((name) => !standardOrder.includes(name))
    .sort((a, b) => {
      const gradeA = parseGradeFromClassName(a)
      const gradeB = parseGradeFromClassName(b)
      if (gradeA && gradeB) {
        const indexA = GRADES.indexOf(gradeA)
        const indexB = GRADES.indexOf(gradeB)
        if (indexA !== indexB) return indexA - indexB
      } else if (gradeA) {
        return -1
      } else if (gradeB) {
        return 1
      }
      return a.localeCompare(b, 'ko')
    })
  return [...standard, ...legacy]
}

export function getEnrolledClassNames(
  students: Array<{ status: string; className: string }>,
): string[] {
  const names = students
    .filter((student) => student.status === '재원' && student.className.trim())
    .map((student) => student.className.trim())
  return sortClassNamesForDisplay(names)
}

export function getStudentsInClassName<T extends { status: string; className: string; name: string }>(
  students: T[],
  className: string,
): T[] {
  const trimmed = className.trim()
  if (!trimmed) return []
  return students
    .filter((student) => student.status === '재원' && student.className === trimmed)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function formatStudentSelectLabel<
  T extends { id: string; name: string; school: string; grade: string },
>(student: T, classStudents: T[]): string {
  const hasDuplicateName = classStudents.some(
    (item) => item.id !== student.id && item.name === student.name,
  )
  if (!hasDuplicateName) return student.name
  return `${student.name} · ${student.school} · ${student.grade}`
}
