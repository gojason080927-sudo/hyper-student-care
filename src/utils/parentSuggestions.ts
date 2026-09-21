export const PARENT_SUGGESTION_CATEGORY = '건의사항' as const
export const PARENT_SUGGESTION_AUTHOR_SUFFIX = '학부모님' as const
export const PARENT_SUGGESTION_SAVE_SUCCESS = '건의사항이 등록되었습니다.'
export const PARENT_SUGGESTION_SAVE_FAILURE = '건의사항 등록에 실패했습니다.'
export const PARENT_QUESTION_SAVE_SUCCESS = '질문이 저장되었습니다.'
export const PARENT_QUESTION_SAVE_FAILURE = '질문 저장에 실패했습니다.'

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

/** 학부모 건의사항 작성자. Source of Truth = care bundle / students 목록의 학생 이름. */
export function formatParentSuggestionAuthor(studentName: string | null | undefined): string {
  const name = studentName?.trim() ?? ''
  if (!name || name === '-') return PARENT_SUGGESTION_AUTHOR_SUFFIX
  return `${name} ${PARENT_SUGGESTION_AUTHOR_SUFFIX}`
}

export function questionKindBadge(record: { category: string; source?: 'parent' | 'student' }): string {
  if (isParentSuggestionRecord(record)) return '학부모 건의'
  return parentSuggestionAuthorLabel(record.source)
}

export function parentRecordSaveCopy(category: string): { success: string; failure: string } {
  if (isParentSuggestionCategory(category)) {
    return { success: PARENT_SUGGESTION_SAVE_SUCCESS, failure: PARENT_SUGGESTION_SAVE_FAILURE }
  }
  return { success: PARENT_QUESTION_SAVE_SUCCESS, failure: PARENT_QUESTION_SAVE_FAILURE }
}

export type ParentQuestionPersistOutcome =
  | { persist: 'busy' }
  | { persist: 'failed' }
  | { persist: 'ok'; reload: 'ok' | 'failed' }

/** 저장 결과와 목록 refresh 결과를 분리한다. reload 실패는 저장 실패 토스트를 만들지 않는다. */
export function toastsForParentQuestionSubmit(
  category: string,
  outcome: ParentQuestionPersistOutcome,
): string[] {
  if (outcome.persist === 'busy') return []
  const copy = parentRecordSaveCopy(category)
  if (outcome.persist === 'failed') return [copy.failure]
  return [copy.success]
}

export function mergePersistedQuestion<T extends { id: string }>(prev: T[], record: T): T[] {
  if (prev.some((item) => item.id === record.id)) return prev
  return [...prev, record]
}
