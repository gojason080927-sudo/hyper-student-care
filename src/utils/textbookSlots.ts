import type {
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentTextbookSlot,
  TextbookCategory,
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
  category: TextbookCategory,
  subject: string,
  slotNumber: number,
): string {
  return `${studentId}:${category}:${subject}:${normalizeSlotNumber(slotNumber)}`
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
  category: TextbookCategory,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): StudentTextbookSlot | undefined {
  return slots.find(
    (slot) =>
      slot.studentId === studentId &&
      slot.category === category &&
      slot.subject === subject &&
      slot.slotNumber === slotNumber,
  )
}

export function getTextbookName(
  slots: StudentTextbookSlot[],
  studentId: string,
  category: TextbookCategory,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): string {
  return (
    findTextbookSlot(slots, studentId, category, subject, slotNumber)?.textbookName.trim() ??
    ''
  )
}

export function filterTextbookSlotsByCategory(
  slots: StudentTextbookSlot[],
  category: TextbookCategory,
): StudentTextbookSlot[] {
  return slots.filter((slot) => slot.category === category)
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

function buildHomeworkSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
): HomeworkTextbookDisplay[] {
  const prevDate = getPreviousSeoulDateString(date)
  const homeworkSlots = filterTextbookSlotsByCategory(slots, 'homework')

  return TEXTBOOK_SUBJECTS.flatMap((subject) =>
    TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => {
      const entry = findHomeworkTextbookEntry(entries, studentId, date, subject, slotNumber)
      const prevEntry = findHomeworkTextbookEntry(
        entries,
        studentId,
        prevDate,
        subject,
        slotNumber,
      )
      return {
        subject,
        slotNumber,
        textbookName: getTextbookName(homeworkSlots, studentId, 'homework', subject, slotNumber),
        previousAssignment: resolvePreviousAssignment(entry, prevEntry),
        todayAssignment: resolveTodayAssignment(entry),
        status: entry?.status ?? '',
        entryId: entry?.id,
      }
    }),
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
  const hasNamedSlots = filterTextbookSlotsByCategory(slots, 'homework').some(
    (slot) => slot.studentId === studentId && slot.textbookName.trim(),
  )

  if (!hasNewEntries && !hasNamedSlots && (legacyHomework || legacyAssignment)) {
    const previous = legacyHomework ? getHomeworkContent(legacyHomework).trim() : ''
    const today = legacyAssignment
      ? legacyAssignment.assignment2.trim() || legacyAssignment.assignment1.trim()
      : ''
    const legacyName =
      getTextbookName(slots, studentId, 'homework', '수학', 1) ||
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

  return buildHomeworkSlotDisplays(studentId, date, slots, entries).filter(hasHomeworkSlotContent)
}

export function buildHomeworkTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
): HomeworkTextbookDisplay[] {
  return buildHomeworkSlotDisplays(studentId, date, slots, entries)
}

function buildProgressSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
): ProgressTextbookDisplay[] {
  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )
  const progressSlots = filterTextbookSlotsByCategory(slots, 'progress')

  return TEXTBOOK_SUBJECTS.flatMap((subject) => {
    let subjectMemo = ''
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const record = dayRecords.find(
        (item) =>
          item.subject === subject && normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      if (!subjectMemo && record?.teacherMemo.trim()) {
        subjectMemo = record.teacherMemo.trim()
      }
    }

    return TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => {
      const record = dayRecords.find(
        (item) =>
          item.subject === subject && normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      const slotName = getTextbookName(progressSlots, studentId, 'progress', subject, slotNumber)
      return {
        subject,
        slotNumber,
        textbookName: slotName || record?.textbookName.trim() || '',
        currentProgress: record?.currentProgress.trim() ?? '',
        currentPage: record?.currentPage ?? 0,
        totalPage: record?.totalPage ?? 0,
        progressRate: record?.progressRate ?? 0,
        teacherMemo: subjectMemo,
        recordId: record?.id,
      }
    })
  })
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
  const progressSlots = filterTextbookSlotsByCategory(slots, 'progress')

  if (!hasSlottedRecords && dayRecords.length > 0 && progressSlots.length === 0) {
    return dayRecords
      .map((record) => {
        const slotNumber = normalizeSlotNumber(record.slotNumber ?? 1)
        const display: ProgressTextbookDisplay = {
          subject: record.subject as TextbookSubject,
          slotNumber,
          textbookName: record.textbookName.trim(),
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

  return buildProgressSlotDisplays(studentId, date, slots, progressRecords).filter(
    hasProgressSlotContent,
  )
}

export function buildProgressTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
): ProgressTextbookDisplay[] {
  return buildProgressSlotDisplays(studentId, date, slots, progressRecords)
}

export function buildHomeworkNameDrafts(
  studentId: string,
  slots: StudentTextbookSlot[],
): Record<string, string> {
  const homeworkSlots = filterTextbookSlotsByCategory(slots, 'homework')
  return Object.fromEntries(
    TEXTBOOK_SUBJECTS.flatMap((subject) =>
      TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => [
        `${subject}-${slotNumber}`,
        getTextbookName(homeworkSlots, studentId, 'homework', subject, slotNumber),
      ]),
    ),
  )
}

export function buildProgressNameDrafts(
  studentId: string,
  slots: StudentTextbookSlot[],
): Record<string, string> {
  const progressSlots = filterTextbookSlotsByCategory(slots, 'progress')
  return Object.fromEntries(
    TEXTBOOK_SUBJECTS.flatMap((subject) =>
      TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => [
        `${subject}-${slotNumber}`,
        getTextbookName(progressSlots, studentId, 'progress', subject, slotNumber),
      ]),
    ),
  )
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
