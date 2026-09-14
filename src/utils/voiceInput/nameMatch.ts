import type { VoiceReviewItem, VoiceStudentRef } from './types'

export function normalizeSpokenText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[,，]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePersonName(value: string): string {
  return value.replace(/\s+/g, '').trim()
}

export function studentsWithUniqueNames(students: VoiceStudentRef[]): {
  unique: VoiceStudentRef[]
  duplicateNames: string[]
} {
  const counts = new Map<string, number>()
  for (const student of students) {
    const key = normalizePersonName(student.name)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const unique: VoiceStudentRef[] = []
  const duplicateNames: string[] = []
  for (const [name, count] of counts) {
    if (count > 1) duplicateNames.push(name)
  }
  for (const student of students) {
    const key = normalizePersonName(student.name)
    if (!key) continue
    if ((counts.get(key) ?? 0) === 1) unique.push(student)
  }
  return { unique, duplicateNames }
}

export function duplicateNameReviews(
  transcript: string,
  duplicateNames: string[],
): VoiceReviewItem[] {
  const text = normalizePersonName(transcript)
  const items: VoiceReviewItem[] = []
  for (const name of duplicateNames) {
    if (text.includes(normalizePersonName(name))) {
      items.push({
        label: name,
        reason: '같은 이름이 여러 명이라 확인 필요',
      })
    }
  }
  return items
}

/** Longest unique roster names first. No fuzzy / partial guessing. */
export function markStudentTokens(
  transcript: string,
  students: VoiceStudentRef[],
): {
  tokenized: string
  unmatchedNames: string[]
  duplicateReviews: VoiceReviewItem[]
} {
  const normalized = normalizeSpokenText(transcript)
  const { unique, duplicateNames } = studentsWithUniqueNames(students)
  const duplicateReviews = duplicateNameReviews(normalized, duplicateNames)

  const sorted = [...unique].sort(
    (a, b) => normalizePersonName(b.name).length - normalizePersonName(a.name).length,
  )

  let tokenized = normalized
  for (const student of sorted) {
    const name = normalizePersonName(student.name)
    if (name.length < 2) continue
    const pattern = name
      .split('')
      .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*')
    const re = new RegExp(pattern, 'g')
    tokenized = tokenized.replace(re, ` «SID:${student.id}» `)
  }

  tokenized = tokenized.replace(/\s+/g, ' ').trim()
  return { tokenized, unmatchedNames: [], duplicateReviews }
}

export function sidToken(studentId: string): string {
  return `«SID:${studentId}»`
}

export const SID_RE = /«SID:([^»]+)»/g
