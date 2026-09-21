export const PARENT_SUGGESTION_CATEGORY = '건의사항' as const

export function isParentSuggestionCategory(category: string | null | undefined): boolean {
  return category === PARENT_SUGGESTION_CATEGORY
}

export function isParentSuggestionRecord(record: { category: string }): boolean {
  return isParentSuggestionCategory(record.category)
}

export function filterParentQuestions<T extends { category: string }>(records: T[]): T[] {
  return records.filter((record) => !isParentSuggestionRecord(record))
}

export function filterParentSuggestions<T extends { category: string }>(records: T[]): T[] {
  return records.filter((record) => isParentSuggestionRecord(record))
}

export type TeacherQuestionKindFilter = 'all' | 'question' | 'suggestion'

export function filterQuestionsByKind<T extends { category: string }>(
  records: T[],
  kind: TeacherQuestionKindFilter,
): T[] {
  if (kind === 'suggestion') return filterParentSuggestions(records)
  if (kind === 'question') return filterParentQuestions(records)
  return records
}

export function parentSuggestionAuthorLabel(source: 'parent' | 'student' | undefined): string {
  if (source === 'student') return '학생 Hub'
  return '학부모'
}

export function questionKindBadge(record: { category: string; source?: 'parent' | 'student' }): string {
  if (isParentSuggestionRecord(record)) return '학부모 건의'
  return parentSuggestionAuthorLabel(record.source)
}
