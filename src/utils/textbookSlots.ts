import type {
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
  TodayAssignmentRecord,
} from '../types/records'
import { getHomeworkContent } from './homework'
import { getPreviousSeoulDateString } from './seoulDate'
import { TEXTBOOK_SLOT_NUMBERS, TEXTBOOK_SUBJECTS } from '../types/records'

export type HomeworkTextbookDisplay = {
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  textbookName: string
  previousAssignment: string
  todayAssignment: string
  status: HomeworkTextbookEntry['status']
  entryId?: string
}

export type ProgressTextbookDisplay = {
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  textbookName: string
  currentProgress: string
  currentPage: number
  totalPage: number
  progressRate: number
  teacherMemo: string
  recordId?: string
}

export function normalizeSlotNumber(value: unknown): TextbookSlotNumber {
  const n = Number(value)
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
}

export function slotKey(
  studentId: string,
  subject: string,
  slotNumber: number,
): string {
  return `${studentId}:${subject}:${normalizeSlotNumber(slotNumber)}`
}

export function entryKey(
  studentId: string,
  date: string,
  subject: string,
  slotNumber: number,
): string {
  return `${studentId}:${date}:${subject}:${normalizeSlotNumber(slotNumber)}`
}

export function findTextbookSlot(
  slots: StudentTextbookSlot[],
  studentId: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): StudentTextbookSlot | undefined {
  return slots.find(
    (slot) =>
      slot.studentId === studentId &&
      slot.subject === subject &&
      slot.slotNumber === slotNumber,
  )
}

export function getTextbookName(
  slots: StudentTextbookSlot[],
  studentId: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): string {
  return findTextbookSlot(slots, studentId, subject, slotNumber)?.textbookName.trim() ?? ''
}

export function findHomeworkTextbookEntry(
  entries: HomeworkTextbookEntry[],
  studentId: string,
  date: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): HomeworkTextbookEntry | undefined {
  return entries.find(
    (entry) =>
      entry.studentId === studentId &&
      entry.date === date &&
      entry.subject === subject &&
      entry.slotNumber === slotNumber,
  )
}

export function resolvePreviousAssignment(
  entry: HomeworkTextbookEntry | undefined,
  prevDayEntry: HomeworkTextbookEntry | undefined,
): string {
  const saved = entry?.previousAssignment?.trim() ?? ''
  if (saved) return saved
  return prevDayEntry?.todayAssignment?.trim() ?? ''
}

export function resolveTodayAssignment(entry: HomeworkTextbookEntry | undefined): string {
  return entry?.todayAssignment?.trim() ?? ''
}

export function hasHomeworkSlotContent(item: HomeworkTextbookDisplay): boolean {
  return Boolean(
    item.textbookName.trim() ||
      item.previousAssignment.trim() ||
      item.todayAssignment.trim() ||
      item.status,
  )
}

export function hasProgressSlotContent(item: ProgressTextbookDisplay): boolean {
  return Boolean(
    item.textbookName.trim() ||
      item.currentProgress.trim() ||
      item.currentPage > 0 ||
      item.totalPage > 1 ||
      item.teacherMemo.trim(),
  )
}

export function buildHomeworkTextbookDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
  legacyHomework?: HomeworkRecord,
  legacyAssignment?: TodayAssignmentRecord,
): HomeworkTextbookDisplay[] {
  const hasNewEntries = entries.some(
    (entry) => entry.studentId === studentId && entry.date === date,
  )

  if (!hasNewEntries && (legacyHomework || legacyAssignment)) {
    const previous = legacyHomework ? getHomeworkContent(legacyHomework).trim() : ''
    const today = legacyAssignment
      ? (legacyAssignment.assignment2.trim() || legacyAssignment.assignment1.trim())
      : ''
    const legacyName =
      getTextbookName(slots, studentId, '수학', 1) ||
      legacyHomework?.title?.trim() ||
      ''

    if (previous || today || legacyHomework?.status) {
      return [
        {
          subject: '수학',
          slotNumber: 1,
          textbookName: legacyName,
          previousAssignment: previous,
          todayAssignment: today,
          status: legacyHomework?.status ?? '',
          entryId: undefined,
        },
      ]
    }
    return []
  }

  const prevDate = getPreviousSeoulDateString(date)
  const result: HomeworkTextbookDisplay[] = []

  for (const subject of TEXTBOOK_SUBJECTS) {
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const entry = findHomeworkTextbookEntry(entries, studentId, date, subject, slotNumber)
      const prevEntry = findHomeworkTextbookEntry(
        entries,
        studentId,
        prevDate,
        subject,
        slotNumber,
      )
      const display: HomeworkTextbookDisplay = {
        subject,
        slotNumber,
        textbookName: getTextbookName(slots, studentId, subject, slotNumber),
        previousAssignment: resolvePreviousAssignment(entry, prevEntry),
        todayAssignment: resolveTodayAssignment(entry),
        status: entry?.status ?? '',
        entryId: entry?.id,
      }
      if (hasHomeworkSlotContent(display)) {
        result.push(display)
      }
    }
  }

  return result
}

export function buildHomeworkTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
): HomeworkTextbookDisplay[] {
  const prevDate = getPreviousSeoulDateString(date)
  const result: HomeworkTextbookDisplay[] = []

  for (const subject of TEXTBOOK_SUBJECTS) {
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const entry = findHomeworkTextbookEntry(entries, studentId, date, subject, slotNumber)
      const prevEntry = findHomeworkTextbookEntry(
        entries,
        studentId,
        prevDate,
        subject,
        slotNumber,
      )
      result.push({
        subject,
        slotNumber,
        textbookName: getTextbookName(slots, studentId, subject, slotNumber),
        previousAssignment: resolvePreviousAssignment(entry, prevEntry),
        todayAssignment: resolveTodayAssignment(entry),
        status: entry?.status ?? '',
        entryId: entry?.id,
      })
    }
  }

  return result
}

export function buildProgressTextbookDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
): ProgressTextbookDisplay[] {
  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )

  const hasSlottedRecords = dayRecords.some((record) => (record.slotNumber ?? 1) > 1)

  if (!hasSlottedRecords && dayRecords.length > 0) {
    return dayRecords
      .map((record) => {
        const slotNumber = normalizeSlotNumber(record.slotNumber ?? 1)
        const display: ProgressTextbookDisplay = {
          subject: record.subject as TextbookSubject,
          slotNumber,
          textbookName:
            getTextbookName(slots, studentId, record.subject as TextbookSubject, slotNumber) ||
            record.textbookName.trim(),
          currentProgress: record.currentProgress.trim(),
          currentPage: record.currentPage,
          totalPage: record.totalPage,
          progressRate: record.progressRate,
          teacherMemo: record.teacherMemo.trim(),
          recordId: record.id,
        }
        return hasProgressSlotContent(display) ? display : null
      })
      .filter(Boolean) as ProgressTextbookDisplay[]
  }

  const result: ProgressTextbookDisplay[] = []

  for (const subject of TEXTBOOK_SUBJECTS) {
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const record = dayRecords.find(
        (item) =>
          item.subject === subject && normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      const display: ProgressTextbookDisplay = {
        subject,
        slotNumber,
        textbookName: getTextbookName(slots, studentId, subject, slotNumber),
        currentProgress: record?.currentProgress.trim() ?? '',
        currentPage: record?.currentPage ?? 0,
        totalPage: record?.totalPage ?? 0,
        progressRate: record?.progressRate ?? 0,
        teacherMemo: record?.teacherMemo.trim() ?? '',
        recordId: record?.id,
      }
      if (hasProgressSlotContent(display)) {
        result.push(display)
      }
    }
  }

  return result
}

export function buildProgressTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
): ProgressTextbookDisplay[] {
  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )
  const result: ProgressTextbookDisplay[] = []

  for (const subject of TEXTBOOK_SUBJECTS) {
    let subjectMemo = ''
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const record = dayRecords.find(
        (item) =>
          item.subject === subject && normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      if (!subjectMemo && record?.teacherMemo.trim()) {
        subjectMemo = record.teacherMemo.trim()
      }
      result.push({
        subject,
        slotNumber,
        textbookName: getTextbookName(slots, studentId, subject, slotNumber),
        currentProgress: record?.currentProgress.trim() ?? '',
        currentPage: record?.currentPage ?? 0,
        totalPage: record?.totalPage ?? 0,
        progressRate: record?.progressRate ?? 0,
        teacherMemo: subjectMemo,
        recordId: record?.id,
      })
    }
  }

  return result
}

export function groupHomeworkBySubject(
  items: HomeworkTextbookDisplay[],
): Record<TextbookSubject, HomeworkTextbookDisplay[]> {
  return {
    수학: items.filter((item) => item.subject === '수학'),
    영어: items.filter((item) => item.subject === '영어'),
  }
}

export function groupProgressBySubject(
  items: ProgressTextbookDisplay[],
): Record<TextbookSubject, ProgressTextbookDisplay[]> {
  return {
    수학: items.filter((item) => item.subject === '수학'),
    영어: items.filter((item) => item.subject === '영어'),
  }
}
