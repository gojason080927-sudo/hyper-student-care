import type { ProgressTextbookDisplay } from './textbookSlots'
import type { ClassTodayReportCommon, ProgressRecord } from '../types/records'
import { normalizeSlotNumber, normalizeTextbookSubject } from './textbookSlots'
import type { TextbookDisplayClassContext } from './textbookSlots'

export function logParentProgressDebug(
  studentId: string,
  date: string,
  progressRecords: ProgressRecord[],
  classContext: TextbookDisplayClassContext | undefined,
  displays: ProgressTextbookDisplay[],
): void {
  if (!import.meta.env.DEV) return

  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )

  console.log('[ParentProgress] raw progress records', {
    studentId,
    reportDate: date,
    count: dayRecords.length,
    records: dayRecords.map((record) => ({
      student_id: record.studentId,
      report_date: record.lastStudyDate,
      subject: record.subject,
      normalizedSubject: normalizeTextbookSubject(record.subject),
      slot_number: record.slotNumber,
      normalizedSlot: normalizeSlotNumber(record.slotNumber ?? 1),
      textbook_name: record.textbookName,
      current_progress: record.currentProgress,
      current_page: record.currentPage,
      total_page: record.totalPage,
    })),
  })

  const commonForDate =
    classContext?.commonRecords.filter(
      (record) =>
        record.grade === classContext.grade &&
        record.className === classContext.className.trim() &&
        record.reportDate === date,
    ) ?? []

  console.log('[ParentProgress] class_today_report_common', {
    reportDate: date,
    count: commonForDate.length,
    records: commonForDate.map((record: ClassTodayReportCommon) => ({
      subject: record.subject,
      normalizedSubject: normalizeTextbookSubject(record.subject),
      slot_number: record.slotNumber,
      normalizedSlot: normalizeSlotNumber(record.slotNumber),
      current_progress: record.currentProgress,
      current_page: record.currentPage,
      total_page: record.totalPage,
    })),
  })

  console.log('[ParentProgress] mapped displays', {
    count: displays.length,
    records: displays.map((item) => ({
      subject: item.subject,
      slot_number: item.slotNumber,
      textbook_name: item.textbookName,
      current_progress: item.currentProgress,
      progress_content: item.progressContent,
      current_page: item.currentPage,
      total_page: item.totalPage,
    })),
  })
}
