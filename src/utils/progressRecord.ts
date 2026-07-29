import type { ProgressRecord } from '../types/records'

/** 같은 학생·같은 과목의 진도 레코드가 하나인지 판별 */
export function isSameProgressSubject(
  a: Pick<ProgressRecord, 'studentId' | 'subject'>,
  b: Pick<ProgressRecord, 'studentId' | 'subject'>,
): boolean {
  return a.studentId === b.studentId && a.subject === b.subject
}

export function findProgressRecordIndex(
  records: ProgressRecord[],
  record: Pick<ProgressRecord, 'id' | 'studentId' | 'subject'>,
): number {
  const byId = records.findIndex((item) => item.id === record.id)
  if (byId >= 0) return byId
  return records.findIndex((item) => isSameProgressSubject(item, record))
}

export function findProgressBySubject(
  records: ProgressRecord[],
  subject: string,
): ProgressRecord | undefined {
  return records.find((record) => record.subject === subject)
}
