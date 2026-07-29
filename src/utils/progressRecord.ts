import type { ProgressRecord } from '../types/records'
import { normalizeSlotNumber } from './textbookSlots'

/** 같은 학생·같은 과목·같은 슬롯의 진도 레코드가 하나인지 판별 */
export function isSameProgressSubject(
  a: Pick<ProgressRecord, 'studentId' | 'subject' | 'slotNumber'>,
  b: Pick<ProgressRecord, 'studentId' | 'subject' | 'slotNumber'>,
): boolean {
  return (
    a.studentId === b.studentId &&
    a.subject === b.subject &&
    normalizeSlotNumber(a.slotNumber ?? 1) === normalizeSlotNumber(b.slotNumber ?? 1)
  )
}

export function findProgressRecordIndex(
  records: ProgressRecord[],
  record: Pick<ProgressRecord, 'id' | 'studentId' | 'subject' | 'slotNumber'>,
): number {
  const byId = records.findIndex((item) => item.id === record.id)
  if (byId >= 0) return byId
  return records.findIndex((item) => isSameProgressSubject(item, record))
}

export function findProgressBySubject(
  records: ProgressRecord[],
  subject: string,
  slotNumber = 1,
): ProgressRecord | undefined {
  return records.find(
    (record) =>
      record.subject === subject &&
      normalizeSlotNumber(record.slotNumber ?? 1) === normalizeSlotNumber(slotNumber),
  )
}

export function findProgressBySubjectAndSlot(
  records: ProgressRecord[],
  subject: string,
  slotNumber: number,
): ProgressRecord | undefined {
  return findProgressBySubject(records, subject, slotNumber)
}
