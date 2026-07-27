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
  'notCompleted',
])

/** legacy status → current status */
export function normalizeHomeworkStatus(status: unknown): HomeworkStatus {
  const s = String(status ?? '').trim()
  if (s === '완료') return '완료'
  if (PARTIAL_STATUSES.has(s)) return '부분 완료'
  if (INCOMPLETE_STATUSES.has(s)) return '미완료'
  return '미완료'
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
  },
): Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } {
  return {
    id: data.id,
    studentId: data.studentId,
    date: data.date,
    title: '',
    description: data.content.trim(),
    status: normalizeHomeworkStatus(data.status),
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
