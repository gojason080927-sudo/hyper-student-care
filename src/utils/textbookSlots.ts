import type {
  ClassTodayReportCommon,
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
  TodayAssignmentRecord,
} from '../types/records'
import { getHomeworkContent } from './homework'
import { calcProgressRate } from './calc'
import {
  findClassTodayReportCommon,
  resolveCommonCurrentProgress,
  resolveCommonCurrentPage,
  resolveCommonTotalPage,
  resolveCommonPreviousAssignment,
  resolveCommonTodayAssignment,
} from './classTodayReportCommon'
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
  /** 순수 진도명 (교재명·퍼센트 제외) */
  progressContent: string
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

export function normalizeTextbookSubject(value: unknown): TextbookSubject | null {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === '수학' || raw === 'math') return '수학'
  if (raw === '영어' || raw === 'english') return '영어'
  return null
}

function subjectsMatch(stored: unknown, expected: TextbookSubject): boolean {
  return normalizeTextbookSubject(stored) === expected
}

/** 교재명·페이지값·퍼센트가 섞인 currentProgress에서 순수 진도명만 추출 */
export function resolveProgressContentLabel(
  rawProgress: string,
  textbookName: string,
  currentPage: number,
  totalPage: number,
): string {
  let content = rawProgress.trim()
  if (!content) return ''

  content = content.replace(/[,，]\s*\d{1,3}\s*%?\s*$/, '').trim()

  const textbook = textbookName.trim()
  if (textbook && content.startsWith(textbook)) {
    content = content.slice(textbook.length).replace(/^[\s,，·\-/]+/, '').trim()
  }

  if (/^\d+$/.test(content)) {
    const n = Number(content)
    if (n === currentPage || n === totalPage) return ''
    if (String(n).length >= 5) return ''
  }

  return content
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
  const matches = slots.filter(
    (slot) =>
      slot.studentId === studentId &&
      subjectsMatch(slot.subject, subject) &&
      normalizeSlotNumber(slot.slotNumber) === slotNumber,
  )
  return matches.find((slot) => slot.textbookName.trim()) ?? matches[0]
}

export function getTextbookName(
  slots: StudentTextbookSlot[],
  studentId: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): string {
  return findTextbookSlot(slots, studentId, subject, slotNumber)?.textbookName.trim() ?? ''
}

/** homework/progress category 중복 행이 있을 때 (student, subject, slot)당 1건만 유지 */
export function dedupeStudentTextbookSlots(
  slots: StudentTextbookSlot[],
): StudentTextbookSlot[] {
  const byKey = new Map<string, StudentTextbookSlot>()
  for (const slot of slots) {
    const key = slotKey(slot.studentId, slot.subject, slot.slotNumber)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, slot)
      continue
    }
    const slotHasName = Boolean(slot.textbookName.trim())
    const existingHasName = Boolean(existing.textbookName.trim())
    const preferred =
      slotHasName && !existingHasName
        ? slot
        : !slotHasName && existingHasName
          ? existing
          : slot.updatedAt >= existing.updatedAt
            ? slot
            : existing
    byKey.set(key, preferred)
  }
  return Array.from(byKey.values())
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
      subjectsMatch(entry.subject, subject) &&
      normalizeSlotNumber(entry.slotNumber) === slotNumber,
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
      item.progressContent.trim() ||
      item.currentProgress.trim() ||
      item.currentPage > 0 ||
      item.totalPage > 0 ||
      item.teacherMemo.trim(),
  )
}

export type TextbookDisplayClassContext = {
  grade: string
  className: string
  commonRecords: ClassTodayReportCommon[]
}

function buildHomeworkSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
  classContext?: TextbookDisplayClassContext,
): HomeworkTextbookDisplay[] {
  const prevDate = getPreviousSeoulDateString(date)

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
      const common = classContext
        ? findClassTodayReportCommon(
            classContext.commonRecords,
            classContext.grade,
            classContext.className,
            date,
            subject,
            slotNumber,
          )
        : undefined
      const prevCommon = classContext
        ? findClassTodayReportCommon(
            classContext.commonRecords,
            classContext.grade,
            classContext.className,
            prevDate,
            subject,
            slotNumber,
          )
        : undefined

      return {
        subject,
        slotNumber,
        textbookName: getTextbookName(slots, studentId, subject, slotNumber),
        previousAssignment: resolveCommonPreviousAssignment(
          common,
          entry,
          prevCommon,
          prevEntry,
        ),
        todayAssignment: resolveCommonTodayAssignment(common, entry),
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
  classContext?: TextbookDisplayClassContext,
): HomeworkTextbookDisplay[] {
  const hasNewEntries = entries.some(
    (entry) => entry.studentId === studentId && entry.date === date,
  )
  const hasNamedSlots = slots.some(
    (slot) => slot.studentId === studentId && slot.textbookName.trim(),
  )
  const hasAnySlotEntries = entries.some((entry) => entry.studentId === studentId)

  if (!hasNewEntries && !hasNamedSlots && !hasAnySlotEntries && (legacyHomework || legacyAssignment)) {
    const previous = legacyHomework ? getHomeworkContent(legacyHomework).trim() : ''
    const today = legacyAssignment
      ? legacyAssignment.assignment2.trim() || legacyAssignment.assignment1.trim()
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

  return buildHomeworkSlotDisplays(studentId, date, slots, entries, classContext).filter(
    hasHomeworkSlotContent,
  )
}

export function buildHomeworkTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
  classContext?: TextbookDisplayClassContext,
): HomeworkTextbookDisplay[] {
  return buildHomeworkSlotDisplays(studentId, date, slots, entries, classContext)
}

function buildProgressSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
  classContext?: TextbookDisplayClassContext,
): ProgressTextbookDisplay[] {
  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )

  return TEXTBOOK_SUBJECTS.flatMap((subject) => {
    let subjectMemo = ''
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const record = dayRecords.find(
        (item) =>
          subjectsMatch(item.subject, subject) &&
          normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      if (!subjectMemo && record?.teacherMemo.trim()) {
        subjectMemo = record.teacherMemo.trim()
      }
    }

    return TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => {
      const record = dayRecords.find(
        (item) =>
          subjectsMatch(item.subject, subject) &&
          normalizeSlotNumber(item.slotNumber ?? 1) === slotNumber,
      )
      const slotName = getTextbookName(slots, studentId, subject, slotNumber)
      const common = classContext
        ? findClassTodayReportCommon(
            classContext.commonRecords,
            classContext.grade,
            classContext.className,
            date,
            subject,
            slotNumber,
          )
        : undefined
      const textbookName = slotName || record?.textbookName.trim() || ''
      const currentProgress = resolveCommonCurrentProgress(common, record)
      const currentPage = resolveCommonCurrentPage(common, record)
      const totalPage = resolveCommonTotalPage(common, record)
      return {
        subject,
        slotNumber,
        textbookName,
        progressContent: resolveProgressContentLabel(
          currentProgress,
          textbookName,
          currentPage,
          totalPage,
        ),
        currentProgress,
        currentPage,
        totalPage,
        progressRate: calcProgressRate(currentPage, totalPage || 1),
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
  classContext?: TextbookDisplayClassContext,
): ProgressTextbookDisplay[] {
  const dayRecords = progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )
  const hasSlottedRecords = dayRecords.some((record) => (record.slotNumber ?? 1) > 1)
  const hasNamedSlots = slots.some(
    (slot) => slot.studentId === studentId && slot.textbookName.trim(),
  )

  if (!hasSlottedRecords && dayRecords.length > 0 && !hasNamedSlots) {
    return dayRecords
      .map((record) => {
        const slotNumber = normalizeSlotNumber(record.slotNumber ?? 1)
        const subject = normalizeTextbookSubject(record.subject) ?? (record.subject as TextbookSubject)
        const textbookName = record.textbookName.trim()
        const currentProgress = record.currentProgress.trim()
        const display: ProgressTextbookDisplay = {
          subject,
          slotNumber,
          textbookName,
          progressContent: resolveProgressContentLabel(
            currentProgress,
            textbookName,
            record.currentPage,
            record.totalPage,
          ),
          currentProgress,
          currentPage: record.currentPage,
          totalPage: record.totalPage,
          progressRate: calcProgressRate(record.currentPage, record.totalPage || 1),
          teacherMemo: record.teacherMemo.trim(),
          recordId: record.id,
        }
        return hasProgressSlotContent(display) ? display : null
      })
      .filter(Boolean) as ProgressTextbookDisplay[]
  }

  return buildProgressSlotDisplays(studentId, date, slots, progressRecords, classContext).filter(
    hasProgressSlotContent,
  )
}

export function buildProgressTextbookDisplaysForEdit(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
  classContext?: TextbookDisplayClassContext,
): ProgressTextbookDisplay[] {
  return buildProgressSlotDisplays(studentId, date, slots, progressRecords, classContext)
}

export function buildTextbookNameDrafts(
  studentId: string,
  slots: StudentTextbookSlot[],
): Record<string, string> {
  return Object.fromEntries(
    TEXTBOOK_SUBJECTS.flatMap((subject) =>
      TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => [
        `${subject}-${slotNumber}`,
        getTextbookName(slots, studentId, subject, slotNumber),
      ]),
    ),
  )
}

/** @deprecated buildTextbookNameDrafts 와 동일 */
export const buildHomeworkNameDrafts = buildTextbookNameDrafts

/** @deprecated buildTextbookNameDrafts 와 동일 */
export const buildProgressNameDrafts = buildTextbookNameDrafts

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
