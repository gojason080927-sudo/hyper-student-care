import type { Grade, StoredGrade, SubjectOption } from '../types/student'
import type { TextbookSubject } from '../types/records'
import { TEXTBOOK_SUBJECTS } from '../types/records'
import { GRADES, SUBJECTS } from './labels'

/** 학년별 표준 반/과정 — 강사/학부모/학생관리 공통 */
export const CLASS_OPTIONS_BY_GRADE: Record<Grade, readonly string[]> = {
  초5: ['초5 수학', '초5 영어', '초5 영수'],
  초6: ['초6 수학', '초6 영어', '초6 영수'],
  중1: ['중1 수학', '중1 영어', '중1 영수A', '중1 영수B'],
  중2: ['중2 수학', '중2 영어', '중2 영수'],
  중3: ['중3 수학A', '중3 수학B', '중3 영어', '중3 영수A', '중3 영수B'],
  고1: ['고1 수학A', '고1 수학B', '고1 영어', '고1 영수A', '고1 영수B'],
  고2: ['고2 수학', '고2 영어', '고2 영수'],
  고3: ['고3 수학', '고3 영어', '고3 영수'],
}

/** @deprecated CLASS_OPTIONS_BY_GRADE 사용 */
export const CLASS_TRACKS = ['수학', '영어', '영수'] as const
export type ClassTrack = (typeof CLASS_TRACKS)[number]

export type StandardClassTrack =
  | '수학'
  | '영어'
  | '수학A'
  | '수학B'
  | '영수'
  | '영수A'
  | '영수B'

export function isActiveGrade(grade: string): grade is Grade {
  return (GRADES as readonly string[]).includes(grade)
}

export function getClassOptionsForGrade(grade: string): string[] {
  if (!isActiveGrade(grade)) return []
  return [...CLASS_OPTIONS_BY_GRADE[grade]]
}

export function getAllStandardClassOptions(): string[] {
  return GRADES.flatMap((grade) => getClassOptionsForGrade(grade))
}

export function isStandardClassNameForGrade(grade: string, className: string): boolean {
  if (!isActiveGrade(grade)) return false
  return getClassOptionsForGrade(grade).includes(className.trim())
}

export function parseStandardClassName(
  className: string,
): { grade: Grade; track: StandardClassTrack } | null {
  const trimmed = className.trim()
  if (!trimmed) return null

  for (const grade of GRADES) {
    for (const option of CLASS_OPTIONS_BY_GRADE[grade]) {
      if (option === trimmed) {
        return { grade, track: option.slice(grade.length + 1) as StandardClassTrack }
      }
    }
  }

  // 레거시 표준 형식: {grade} 수학 | 수학A/B | 영어 | 영수 | 영수A/B
  for (const grade of GRADES) {
    const prefix = `${grade} `
    if (!trimmed.startsWith(prefix)) continue
    const track = trimmed.slice(prefix.length)
    if (
      track === '수학' ||
      track === '수학A' ||
      track === '수학B' ||
      track === '영어' ||
      track === '영수' ||
      track === '영수A' ||
      track === '영수B'
    ) {
      return { grade, track }
    }
  }

  return null
}

export function parseGradeFromClassName(className: string): Grade | null {
  return parseStandardClassName(className)?.grade ?? null
}

export function classTrackToSubject(track: StandardClassTrack | ClassTrack): SubjectOption {
  switch (track) {
    case '수학':
    case '수학A':
    case '수학B':
      return '수학'
    case '영어':
      return '영어'
    case '영수':
    case '영수A':
    case '영수B':
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

export function buildStandardClassName(grade: string, track: StandardClassTrack | ClassTrack): string {
  return `${grade} ${track}`
}

/** 반/과정 선택 시 과목 자동 매핑 (표준·레거시 표준 형식) */
export function syncSubjectFromClassName(className: string): SubjectOption | null {
  const parsed = parseStandardClassName(className)
  if (!parsed) return null
  return classTrackToSubject(parsed.track)
}

/** Today Report 과목 표시 모드 (수학만 / 영어만 / 둘 다) */
export type StudentSubjectMode = 'math' | 'english' | 'both'

function getStudentSubjectModeFromClassName(className: string): StudentSubjectMode {
  const trimmed = className.trim()
  if (!trimmed) return 'both'

  const parsed = parseStandardClassName(trimmed)
  if (parsed) {
    if (
      parsed.track === '영수' ||
      parsed.track === '영수A' ||
      parsed.track === '영수B'
    ) {
      return 'both'
    }
    if (
      parsed.track === '수학' ||
      parsed.track === '수학A' ||
      parsed.track === '수학B'
    ) {
      return 'math'
    }
    if (parsed.track === '영어') return 'english'
  }

  const normalized = trimmed.replace(/\s+/g, '')
  if (normalized.includes('영수')) return 'both'
  if (normalized.includes('수학')) return 'math'
  if (normalized.includes('영어')) return 'english'

  return 'both'
}

/**
 * 학생 반/과정·과목 필드로 Today Report 표시 과목 모드 판별.
 * subjects[0]이 있으면 우선, 없으면 className 파싱(영수 → 수학A/B → 레거시 '반' 접미 포함).
 */
export function getStudentSubjectMode(
  className: string,
  subjects?: readonly string[],
): StudentSubjectMode {
  const subjectHint = subjects?.[0]?.trim()
  if (subjectHint === '영어·수학') return 'both'
  if (subjectHint === '수학') return 'math'
  if (subjectHint === '영어') return 'english'

  return getStudentSubjectModeFromClassName(className)
}

export function getVisibleTextbookSubjects(
  className: string,
  subjects?: readonly string[],
): TextbookSubject[] {
  const mode = getStudentSubjectMode(className, subjects)
  if (mode === 'math') return ['수학']
  if (mode === 'english') return ['영어']
  return [...TEXTBOOK_SUBJECTS]
}

/** 월간 학습진단 REPORT 표시 과목 (수강 기준, 수학 → 영어 순) */
export function getStudentDiagnosisSubjects(
  className: string,
  subjects?: readonly string[],
): TextbookSubject[] {
  return getVisibleTextbookSubjects(className, subjects)
}

export function getVisibleDailyTestSubjects(
  className: string,
  subjects?: readonly string[],
): SubjectOption[] {
  const mode = getStudentSubjectMode(className, subjects)
  if (mode === 'math') return ['수학']
  if (mode === 'english') return ['영어']
  return [...SUBJECTS]
}

/** 학년 select: 활성 학년 + 기존(비활성) 학년 1개 */
export function getGradeSelectOptions(currentGrade?: string): string[] {
  if (currentGrade && !isActiveGrade(currentGrade)) {
    return [...GRADES, currentGrade]
  }
  return [...GRADES]
}

/** Today Report·일괄입력용 — 표준 과정만 유지 (다른 학년·비표준 값은 초기화) */
export function resolveClassNameOnGradeChange(
  grade: string,
  className: string,
): string {
  const trimmed = className.trim()
  if (!trimmed || !grade) return ''
  if (isStandardClassNameForGrade(grade, trimmed)) return trimmed
  return ''
}

/** 학생 등록/수정 폼용 — 같은 학년의 비표준 레거시(기존) 값 유지 */
export function resolveClassNameOnFormGradeChange(
  grade: string,
  className: string,
): string {
  const trimmed = className.trim()
  if (!trimmed || !grade) return ''
  if (isStandardClassNameForGrade(grade, trimmed)) return trimmed
  if (isDeprecatedStandardClassName(trimmed)) return ''
  const parsedGrade = parseGradeFromClassName(trimmed)
  if (parsedGrade && parsedGrade !== grade) return ''
  return trimmed
}

/** 필터용 반/과정: 표준 + 해당 학년의 기존 비표준 값 */
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

function inferGo1MathClass(normalized: string): string | null {
  if (/b반|수학\s*b|mathb/i.test(normalized)) {
    return '고1 수학B'
  }
  if (/a반|수학\s*a|matha|\s+a\s*반/i.test(normalized)) {
    return '고1 수학A'
  }
  return null
}

/**
 * 기존 반/과정 → 표준 형식 자동 매핑 (명확할 때만)
 * 고1 수학 A/B 구분 불가·영수반 등 애매한 값은 원본 유지
 */
export function mapLegacyClassName(
  className: string,
  grade: StoredGrade,
  subject: SubjectOption,
): string {
  const trimmed = className.trim()
  if (!trimmed) {
    if (!isActiveGrade(grade)) return ''
    return ''
  }

  if (isActiveGrade(grade) && isStandardClassNameForGrade(grade, trimmed)) {
    return trimmed
  }

  if (parseStandardClassName(trimmed)) return trimmed
  if (!isActiveGrade(grade)) return trimmed

  const normalized = trimmed.toLowerCase()

  if (grade === '고1') {
    const go1Math = inferGo1MathClass(normalized)
    if (go1Math) return go1Math
    if (normalized.includes('영어') || normalized.includes('english')) {
      return '고1 영어'
    }
    if (
      normalized.includes('수학') ||
      normalized.includes('math') ||
      normalized.includes('수학반')
    ) {
      return trimmed
    }
  }

  if (
    normalized.includes('영수') ||
    normalized.includes('영어·수학') ||
    normalized.includes('영어/수학') ||
    normalized.includes('종합')
  ) {
    return trimmed
  }

  if (normalized.includes('영어') || normalized.includes('english') || normalized.includes('영어반')) {
    return `${grade} 영어`
  }

  if (normalized.includes('수학') || normalized.includes('math') || normalized.includes('수학반')) {
    return `${grade} 수학`
  }

  if (!normalized) {
    const track = subjectToClassTrack(subject)
    if (track === '영수') return trimmed
    if (grade === '고1' && track === '수학') return trimmed
    const built = buildStandardClassName(grade, track)
    if (isStandardClassNameForGrade(grade, built)) return built
  }

  return trimmed
}

export function isDeprecatedStandardClassName(className: string): boolean {
  const trimmed = className.trim()
  const parsed = parseStandardClassName(trimmed)
  if (!parsed) return false
  return !isStandardClassNameForGrade(parsed.grade, trimmed)
}

/** Today Report·일괄입력 선택용 — CLASS_OPTIONS_BY_GRADE만 (DB/레거시 병합 금지) */
export function getClassPickerOptions(grade: string): string[] {
  if (!isActiveGrade(grade)) return []
  return [...CLASS_OPTIONS_BY_GRADE[grade]]
}

/** 학생 등록/수정 폼용 — 현재 레거시 값을 (기존)으로 추가 */
export function getClassFormSelectOptions(
  grade: string,
  currentClassName?: string,
): string[] {
  const standard = getClassOptionsForGrade(grade)
  const current = currentClassName?.trim()
  if (current && !standard.includes(current)) {
    return [...standard, current]
  }
  return standard
}

/** @deprecated getClassFormSelectOptions 또는 getClassPickerOptions 사용 */
export function getClassSelectOptions(
  grade: string,
  currentClassName?: string,
): string[] {
  return getClassFormSelectOptions(grade, currentClassName)
}

/** 학년·반/과정 조합 저장 가능 여부 */
export function validateGradeClassCombination(grade: string, className: string): boolean {
  const trimmed = className.trim()
  if (!grade || !trimmed) return false

  const allowed = getClassFormSelectOptions(grade, trimmed)
  if (!allowed.includes(trimmed)) return false

  const parsedGrade = parseGradeFromClassName(trimmed)
  if (parsedGrade && parsedGrade !== grade) return false

  if (isActiveGrade(grade) && isStandardClassNameForGrade(grade, trimmed)) {
    return true
  }

  // 비표준(레거시) 값: 같은 학년에만 허용
  return !parsedGrade || parsedGrade === grade
}

/** 학부모·강사 UI용: "중3 · 중3 수학" */
export function formatStudentGradeClassLine(student: {
  grade: string
  className: string
}): string {
  const grade = student.grade.trim()
  const className = student.className.trim()
  if (grade && className) return `${grade} · ${className}`
  return grade || className
}

/** 자동 매핑 제안 (DB 변경 없음, UI 안내용) */
export const LEGACY_CLASS_MAPPING_HINTS: ReadonlyArray<{
  pattern: string
  suggestion: string
  note?: string
}> = [
  { pattern: '중3 수학반', suggestion: '중3 수학' },
  { pattern: '중3 영어반', suggestion: '중3 영어' },
  { pattern: '고2 수학반', suggestion: '고2 수학' },
  { pattern: '고2 영어반', suggestion: '고2 영어' },
  {
    pattern: '고1 수학반 / 고1 수학',
    suggestion: '고1 수학A 또는 고1 수학B',
    note: 'A/B 구분 불가 시 자동 변환하지 않음',
  },
  {
    pattern: '영수반 / 종합반',
    suggestion: '수동 선택 필요',
    note: '자동 변환하지 않음',
  },
]

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
