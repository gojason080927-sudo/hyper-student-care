import type { SubjectOption } from '../types/student'

/** 학원 시간표와 같은 범위. 일요일은 포함하지 않는다. */
export const CLASS_DAYS = ['월', '화', '수', '목', '금', '토'] as const

export type ClassDay = (typeof CLASS_DAYS)[number]

export type SubjectClassDays = {
  mathClassDays: string[] | null
  englishClassDays: string[] | null
}

const DAY_ORDER = new Map<string, number>(CLASS_DAYS.map((day, index) => [day, index]))

export function normalizeClassDays(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const unique = new Set<string>()
  for (const item of value) {
    const day = String(item ?? '').trim()
    if (!DAY_ORDER.has(day)) continue
    unique.add(day)
  }
  if (unique.size === 0) return null
  return [...unique].sort((a, b) => (DAY_ORDER.get(a) ?? 0) - (DAY_ORDER.get(b) ?? 0))
}

export function classDaysOverlap(math: string[] | null, english: string[] | null): string[] {
  if (!math || !english) return []
  const englishSet = new Set(english)
  return math.filter((day) => englishSet.has(day))
}

/** 수강하지 않는 과목은 NULL. 빈 선택은 NULL. 교집합이 있으면 저장하지 않는다. */
export function classDaysForSave(
  subject: SubjectOption,
  math: string[] | null,
  english: string[] | null,
): SubjectClassDays & { overlap: string[] } {
  const nextMath = subject === '영어' ? null : normalizeClassDays(math)
  const nextEnglish = subject === '수학' ? null : normalizeClassDays(english)
  return {
    mathClassDays: nextMath,
    englishClassDays: nextEnglish,
    overlap: classDaysOverlap(nextMath, nextEnglish),
  }
}

/** 과목이 바뀌면 숨은 과목 요일은 버린다. 보이는 과목의 기존 선택은 유지한다. */
export function classDaysAfterSubjectChange(
  subject: SubjectOption,
  current: SubjectClassDays,
): SubjectClassDays {
  const saved = classDaysForSave(subject, current.mathClassDays, current.englishClassDays)
  return {
    mathClassDays: saved.mathClassDays,
    englishClassDays: saved.englishClassDays,
  }
}

/**
 * 같은 요일은 한 과목에만 남긴다.
 * 새로 켠 과목이 그 요일을 갖고, 다른 과목에서는 즉시 해제한다.
 */
export function toggleClassDay(
  enrolled: SubjectOption,
  row: '수학' | '영어',
  day: ClassDay,
  current: SubjectClassDays,
): SubjectClassDays {
  const key = row === '영어' ? 'englishClassDays' : 'mathClassDays'
  const otherKey = key === 'mathClassDays' ? 'englishClassDays' : 'mathClassDays'
  const selected = new Set(current[key] ?? [])
  if (selected.has(day)) selected.delete(day)
  else selected.add(day)
  const other = (current[otherKey] ?? []).filter((item) => item !== day)
  return classDaysAfterSubjectChange(enrolled, {
    mathClassDays: key === 'mathClassDays' ? [...selected] : other,
    englishClassDays: key === 'englishClassDays' ? [...selected] : other,
  })
}
