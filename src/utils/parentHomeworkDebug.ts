import type { HomeworkTextbookDisplay } from './textbookSlots'
import type { HomeworkTextbookEntry, StudentTextbookSlot } from '../types/records'
import { normalizeSlotNumber, normalizeTextbookSubject } from './textbookSlots'

export function logParentHomeworkDebug(
  studentId: string,
  date: string,
  entries: HomeworkTextbookEntry[],
  slots: StudentTextbookSlot[],
  displays: HomeworkTextbookDisplay[],
): void {
  if (!import.meta.env.DEV) return

  const dayEntries = entries.filter(
    (entry) => entry.studentId === studentId && entry.date === date,
  )

  console.log('[ParentHomework] raw entries', {
    studentId,
    reportDate: date,
    count: dayEntries.length,
    records: dayEntries.map((entry) => ({
      student_id: entry.studentId,
      report_date: entry.date,
      subject: entry.subject,
      normalizedSubject: normalizeTextbookSubject(entry.subject),
      slot_number: entry.slotNumber,
      normalizedSlot: normalizeSlotNumber(entry.slotNumber),
      previous_assignment: entry.previousAssignment,
      today_assignment: entry.todayAssignment,
      homework_status: entry.status,
    })),
  })

  console.log('[ParentHomework] textbook slots', {
    count: slots.filter((s) => s.studentId === studentId).length,
    records: slots
      .filter((s) => s.studentId === studentId)
      .map((slot) => ({
        subject: slot.subject,
        normalizedSubject: normalizeTextbookSubject(slot.subject),
        slot_number: slot.slotNumber,
        textbook_name: slot.textbookName,
      })),
  })

  console.log('[ParentHomework] mapped displays', {
    count: displays.length,
    math: displays.filter((d) => d.subject === '수학').map((d) => d.slotNumber),
    english: displays.filter((d) => d.subject === '영어').map((d) => d.slotNumber),
    records: displays.map((item) => ({
      subject: item.subject,
      slot_number: item.slotNumber,
      textbook_name: item.textbookName,
      previous_assignment: item.previousAssignment,
      today_assignment: item.todayAssignment,
      homework_status: item.status,
    })),
  })
}
