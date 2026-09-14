import type { HomeworkRecord, HomeworkStatus } from '../types/records'

const PARTIAL_STATUSES = new Set([
  '부분 완료',
  '부분완료',
  '일부완료',
  '일부 완료',
])

const INCOMPLETE_STATUSES = new Set([
  '미완료',
  '미 완료',
  '미제출',
  'incomplete',
  'not_completed',
  'notCompleted',
  'not completed',
])

export type HomeworkStatusCategory = 'complete' | 'partial' | 'incomplete' | 'none'

/** DB/UI 저장값을 집계용 카테고리로 분류 (빈 값·완료는 집계 제외) */
export function classifyHomeworkStatus(status: unknown): HomeworkStatusCategory {
  const s = String(status ?? '').trim()
  if (!s) return 'none'
  if (s === '완료') return 'complete'
  if (PARTIAL_STATUSES.has(s)) return 'partial'
  if (INCOMPLETE_STATUSES.has(s)) return 'incomplete'
  return 'none'
}

/** legacy status → current status */
export function normalizeHomeworkStatus(status: unknown): HomeworkStatus {
  const category = classifyHomeworkStatus(status)
  if (category === 'complete') return '완료'
  if (category === 'partial') return '부분 완료'
  if (category === 'incomplete') return '미완료'
  return '미완료'
}

export function isHomeworkInputStatus(status: unknown): status is HomeworkStatus {
  return status === '완료' || status === '부분 완료'
}

/**
 * 신규 저장: 완료 / 부분 완료만 허용.
 * 기존 row가 미완료이면 그 값만 보존한다. 빈 값·미선택을 미완료로 바꾸지 않는다.
 */
export function resolveHomeworkStatusForSave(
  next: unknown,
  existing?: unknown,
): HomeworkStatus | '' {
  const nextSelected = resolveSelectedHomeworkStatus(next)
  const existingSelected = resolveSelectedHomeworkStatus(existing)
  if (!nextSelected) {
    if (existingSelected === '미완료') return '미완료'
    return isHomeworkInputStatus(existingSelected) ? existingSelected : ''
  }
  if (isHomeworkInputStatus(nextSelected)) return nextSelected
  if (nextSelected === '미완료' && existingSelected === '미완료') return '미완료'
  return isHomeworkInputStatus(existingSelected)
    ? existingSelected
    : existingSelected === '미완료'
      ? '미완료'
      : ''
}

export function matchesHomeworkStatus(
  recordStatus: unknown,
  filterStatus: string,
): boolean {
  if (!filterStatus) return true
  return normalizeHomeworkStatus(recordStatus) === normalizeHomeworkStatus(filterStatus)
}

/** title + description → unified display content */
export function getHomeworkContent(record: Pick<HomeworkRecord, 'title' | 'description'>): string {
  const title = record.title?.trim() ?? ''
  const description = record.description?.trim() ?? ''
  if (title && description) {
    if (description.startsWith(title)) return description
    return `${title}\n${description}`
  }
  return title || description
}

export function homeworkRecordToSavePayload(
  data: {
    id?: string
    studentId: string
    date: string
    content: string
    status: HomeworkStatus | string
    teacherMemo: string
    existingStatus?: HomeworkStatus | string
  },
): Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } {
  const status = resolveHomeworkStatusForSave(data.status, data.existingStatus)
  if (status === '') {
    throw new Error('숙제 수행은 완료 또는 부분 완료만 저장할 수 있습니다.')
  }
  return {
    id: data.id,
    studentId: data.studentId,
    date: data.date,
    title: '',
    description: data.content.trim(),
    status,
    teacherMemo: data.teacherMemo.trim(),
  }
}

export function normalizeHomeworkRecord(record: HomeworkRecord): HomeworkRecord {
  const content = getHomeworkContent(record)
  const status = normalizeHomeworkStatus(record.status)
  if (
    record.title === '' &&
    record.description === content &&
    record.status === status
  ) {
    return record
  }
  return {
    ...record,
    title: '',
    description: content,
    status,
  }
}

/** DB에 쓰는 값. 빈 값·미지를 미완료로 바꾸지 않는다. */
export function persistStoredHomeworkStatus(status: unknown): HomeworkStatus | '' {
  return resolveSelectedHomeworkStatus(status) ?? ''
}

export function isHomeworkStatusSelected(status: unknown): boolean {
  const category = classifyHomeworkStatus(status)
  return (
    category === 'complete' ||
    category === 'partial' ||
    category === 'incomplete'
  )
}

/** Resolve UI selected status; empty input must not appear as 미완료 */
export function resolveSelectedHomeworkStatus(
  status: unknown,
): HomeworkStatus | null {
  if (!String(status ?? '').trim()) return null
  const category = classifyHomeworkStatus(status)
  if (category === 'none') return null
  return normalizeHomeworkStatus(status)
}
