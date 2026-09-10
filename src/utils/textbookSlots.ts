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
import { calcProgressRate } from './calc'
import {
  findClassCommonTextbookName,
  findClassTodayReportCommonForSubject,
  resolveCommonCurrentProgress,
  resolveCommonCurrentPage,
  resolveCommonTotalPage,
  resolveCommonTodayAssignment,
} from './classTodayReportCommon'
import { TEXTBOOK_SLOT_NUMBERS, TEXTBOOK_SUBJECTS } from '../types/records'
import {
  findClassTodayReportCommonForDisplay,
  findClassTodayReportCommonForProgressDisplay,
  findHomeworkPerformanceEntryForDisplay,
  findHomeworkTextbookEntryForDisplay,
  findProgressRecordForDisplay,
  resolveParentPreviousAssignmentDisplay,
  resolveParentTodayAssignmentText,
} from './todayReportDisplayFallback'
import { resolveSelectedHomeworkStatus } from './homework'

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
  }

  return content
}

/** 학부모 현재 진도: current_progress 원본 기준, 페이지값과 동일한 숫자만 제외 */
export function resolveParentProgressContent(
  rawProgress: string,
  textbookName: string,
  currentPage: number,
  totalPage: number,
): string {
  let content = rawProgress.trim()
  if (!content) return ''

  content = content.replace(/[,，]\s*\d{1,3}\s*%?\s*$/, '').trim()
  if (!content) return ''

  const textbook = textbookName.trim()
  if (textbook && content.startsWith(textbook)) {
    content = content.slice(textbook.length).replace(/^[\s,，·\-/]+/, '').trim()
  }

  if (/^\d+$/.test(content)) {
    const n = Number(content)
    if (n === currentPage || n === totalPage) return ''
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
  if (matches.length === 0) return undefined
  const named = matches.filter((slot) => slot.textbookName.trim())
  const pool = named.length > 0 ? named : matches
  return pool.reduce((best, slot) =>
    slot.updatedAt >= best.updatedAt ? slot : best,
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

/** @deprecated 지난 과제 내용 UI 제거 — 항상 빈 문자열 */
export function resolvePreviousAssignment(
  _entry?: HomeworkTextbookEntry | undefined,
  _prevDayEntry?: HomeworkTextbookEntry | undefined,
): string {
  return ''
}

export function resolveTodayAssignment(entry: HomeworkTextbookEntry | undefined): string {
  return entry?.todayAssignment?.trim() ?? ''
}

export function hasHomeworkSlotContent(item: HomeworkTextbookDisplay): boolean {
  return Boolean(
    item.textbookName.trim() ||
      item.todayAssignment.trim() ||
      item.previousAssignment.trim() ||
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
  subjects?: readonly string[]
  commonRecords: ClassTodayReportCommon[]
  /** 반·연동반 peer legacy 교재명 fallback 조회용 */
  classSlots?: StudentTextbookSlot[]
  getTextbookPeerStudentIds?: (subject: TextbookSubject) => string[]
}

export function findClassPeerTextbookName(
  slots: StudentTextbookSlot[],
  peerStudentIds: string[],
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): string {
  for (const peerId of peerStudentIds) {
    const name = getTextbookName(slots, peerId, subject, slotNumber)
    if (name) return name
  }
  return ''
}

function resolveDisplayTextbookName(
  classContext: TextbookDisplayClassContext | undefined,
  studentId: string,
  _date: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
  slots: StudentTextbookSlot[],
): string {
  const lookupSlots = classContext?.classSlots ?? slots
  const ownName = getTextbookName(lookupSlots, studentId, subject, slotNumber)
  if (ownName) return ownName

  if (classContext?.getTextbookPeerStudentIds) {
    const peerName = findClassPeerTextbookName(
      lookupSlots,
      classContext.getTextbookPeerStudentIds(subject),
      subject,
      slotNumber,
    )
    if (peerName) return peerName
  }

  // student_textbook_slots가 비어 있을 때만 반 공통 교재명을 사용한다.
  // 슬롯에 값이 있으면 그 값이 canonical이며 class_today_report_common보다 우선한다.
  if (classContext) {
    const commonName = findClassCommonTextbookName(
      classContext.commonRecords,
      classContext.grade,
      classContext.className,
      subject,
      slotNumber,
    )
    if (commonName) return commonName
  }

  return ''
}

type HomeworkSlotDisplayMode = 'edit' | 'parent' | 'parent-historical' | 'default'

export type ParentTextbookDisplayOptions = {
  /** Past-date history: exact stored rows only, no recent-value carry. */
  historical?: boolean
}

function hasHistoricalHomeworkContent(item: HomeworkTextbookDisplay): boolean {
  return Boolean(
    item.todayAssignment.trim() || item.previousAssignment.trim() || item.status,
  )
}

function hasHistoricalProgressContent(item: ProgressTextbookDisplay): boolean {
  return Boolean(
    item.progressContent.trim() ||
      item.currentProgress.trim() ||
      item.currentPage > 0 ||
      item.totalPage > 0 ||
      item.teacherMemo.trim(),
  )
}

/**
 * edit/default: status는 해당 날짜 실제 행만 (월간 집계·강사 신규 입력용).
 * parent: 강사 새 저장 전까지 가장 최근 숙제 수행 결과(상태·지난 과제)를 표시 유지.
 *         오늘 행에 status가 비어 있어도(과제만 저장된 shell) 이전 수행 상태를 가리지 않음.
 * parent-historical: 선택 날짜에 실제 저장된 값만. 다른 날짜를 끌어오지 않음.
 */
function buildHomeworkSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
  classContext?: TextbookDisplayClassContext,
  mode: HomeworkSlotDisplayMode = 'default',
): HomeworkTextbookDisplay[] {
  const carryPerformance = mode === 'parent'
  const historical = mode === 'parent-historical'

  return TEXTBOOK_SUBJECTS.flatMap((subject) =>
    TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => {
      const exactEntry = findHomeworkTextbookEntry(
        entries,
        studentId,
        date,
        subject,
        slotNumber,
      )
      const { entry: contentEntry } = historical
        ? { entry: exactEntry }
        : findHomeworkTextbookEntryForDisplay(
            entries,
            studentId,
            date,
            subject,
            slotNumber,
          )
      const performance = carryPerformance
        ? findHomeworkPerformanceEntryForDisplay(
            entries,
            studentId,
            date,
            subject,
            slotNumber,
          )
        : null

      const exactCommon = classContext
        ? findClassTodayReportCommonForSubject(
            classContext.commonRecords,
            classContext.grade,
            classContext.className,
            date,
            subject,
            slotNumber,
          )
        : undefined
      let common = exactCommon
      if (!common && classContext && !historical) {
        common = findClassTodayReportCommonForDisplay(
          classContext.commonRecords,
          classContext.grade,
          classContext.className,
          date,
          subject,
          slotNumber,
        ).record
      }

      const exactSameDate =
        contentEntry && contentEntry.date === date ? contentEntry : undefined

      const status = carryPerformance
        ? (resolveSelectedHomeworkStatus(performance?.entry?.status) ?? '')
        : (resolveSelectedHomeworkStatus(exactSameDate?.status) ?? '')

      return {
        subject,
        slotNumber,
        textbookName: resolveDisplayTextbookName(
          classContext,
          studentId,
          date,
          subject,
          slotNumber,
          slots,
        ),
        previousAssignment: historical
          ? exactEntry?.previousAssignment.trim() ||
            exactCommon?.previousAssignment.trim() ||
            ''
          : carryPerformance
            ? resolveParentPreviousAssignmentDisplay(
                performance?.entry,
                Boolean(performance?.isFallback),
              )
            : '',
        todayAssignment: historical
          ? exactCommon?.todayAssignment.trim() ||
            exactEntry?.todayAssignment.trim() ||
            ''
          : carryPerformance
            ? resolveParentTodayAssignmentText({
                entries,
                commonRecords: classContext?.commonRecords ?? [],
                grade: classContext?.grade ?? '',
                className: classContext?.className ?? '',
                studentId,
                date,
                subject,
                slotNumber,
              })
            : resolveCommonTodayAssignment(common, contentEntry),
        status,
        entryId: exactSameDate?.id,
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
    const today = legacyAssignment
      ? legacyAssignment.assignment2.trim() || legacyAssignment.assignment1.trim()
      : ''
    const legacyName =
      getTextbookName(slots, studentId, '수학', 1) ||
      legacyHomework?.title?.trim() ||
      ''

    if (today || legacyHomework?.status) {
      return [
        {
          subject: '수학',
          slotNumber: 1,
          textbookName: legacyName,
          previousAssignment: '',
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

/** 학부모 readOnly: 레거시 단일 슬롯 fallback 없이 6슬롯 전체 map + 최근 수행결과 유지 */
export function buildParentHomeworkTextbookDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  entries: HomeworkTextbookEntry[],
  classContext?: TextbookDisplayClassContext,
  options?: ParentTextbookDisplayOptions,
): HomeworkTextbookDisplay[] {
  const historical = Boolean(options?.historical)
  return buildHomeworkSlotDisplays(
    studentId,
    date,
    slots,
    entries,
    classContext,
    historical ? 'parent-historical' : 'parent',
  ).filter(historical ? hasHistoricalHomeworkContent : hasHomeworkSlotContent)
}

function findExactProgressRecord(
  records: ProgressRecord[],
  studentId: string,
  date: string,
  subject: string,
  slotNumber: TextbookSlotNumber,
): ProgressRecord | undefined {
  return records.find(
    (record) =>
      record.studentId === studentId &&
      record.lastStudyDate === date &&
      record.subject === subject &&
      (record.slotNumber ?? 1) === slotNumber,
  )
}

function buildProgressSlotDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
  classContext?: TextbookDisplayClassContext,
  historical = false,
): ProgressTextbookDisplay[] {
  return TEXTBOOK_SUBJECTS.flatMap((subject) => {
    let subjectMemo = ''
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      if (historical) {
        const exact = findExactProgressRecord(
          progressRecords,
          studentId,
          date,
          subject,
          slotNumber,
        )
        if (!subjectMemo && exact?.teacherMemo.trim()) {
          subjectMemo = exact.teacherMemo.trim()
        }
        continue
      }
      const { record, isFallback } = findProgressRecordForDisplay(
        progressRecords,
        studentId,
        date,
        subject,
        slotNumber,
      )
      if (!isFallback && !subjectMemo && record?.teacherMemo.trim()) {
        subjectMemo = record.teacherMemo.trim()
      }
    }

    return TEXTBOOK_SLOT_NUMBERS.map((slotNumber) => {
      const exact = findExactProgressRecord(
        progressRecords,
        studentId,
        date,
        subject,
        slotNumber,
      )
      const lookup = historical
        ? { record: exact, isFallback: false }
        : findProgressRecordForDisplay(
            progressRecords,
            studentId,
            date,
            subject,
            slotNumber,
          )
      const { record, isFallback } = lookup
      const slotName = resolveDisplayTextbookName(
        classContext,
        studentId,
        date,
        subject,
        slotNumber,
        slots,
      )
      const exactCommon = classContext
        ? findClassTodayReportCommonForSubject(
            classContext.commonRecords,
            classContext.grade,
            classContext.className,
            date,
            subject,
            slotNumber,
          )
        : undefined
      const common = historical
        ? exactCommon
        : classContext
          ? findClassTodayReportCommonForProgressDisplay(
              classContext.commonRecords,
              classContext.grade,
              classContext.className,
              date,
              subject,
              slotNumber,
            ).record
          : undefined
      const textbookName = slotName
      const currentProgress = historical
        ? exact
          ? exact.currentProgress.trim()
          : exactCommon?.currentProgress.trim() || ''
        : record && !isFallback
          ? record.currentProgress.trim()
          : resolveCommonCurrentProgress(common, record)
      const currentPage = historical
        ? exact
          ? exact.currentPage
          : exactCommon?.currentPage ?? 0
        : record && !isFallback
          ? record.currentPage
          : resolveCommonCurrentPage(common, record)
      const totalPage = historical
        ? exact
          ? exact.totalPage
          : exactCommon?.totalPage ?? 0
        : record && !isFallback
          ? record.totalPage
          : resolveCommonTotalPage(common, record)
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
        // Never reuse a prior-date id — save must create a new row for `date`.
        recordId: isFallback ? undefined : record?.id,
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

/** 학부모 readOnly: 슬롯별 current_progress를 그대로 표시 (과도한 필터링 없음) */
export function buildParentProgressTextbookDisplays(
  studentId: string,
  date: string,
  slots: StudentTextbookSlot[],
  progressRecords: ProgressRecord[],
  classContext?: TextbookDisplayClassContext,
  options?: ParentTextbookDisplayOptions,
): ProgressTextbookDisplay[] {
  const historical = Boolean(options?.historical)
  return buildProgressSlotDisplays(
    studentId,
    date,
    slots,
    progressRecords,
    classContext,
    historical,
  )
    .map((item) => ({
      ...item,
      progressContent: resolveParentProgressContent(
        item.currentProgress,
        item.textbookName,
        item.currentPage,
        item.totalPage,
      ),
    }))
    .filter(historical ? hasHistoricalProgressContent : hasProgressSlotContent)
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

export function buildTextbookNameDraftsFromDisplays(
  displays: Array<Pick<HomeworkTextbookDisplay, 'subject' | 'slotNumber' | 'textbookName'>>,
): Record<string, string> {
  return Object.fromEntries(
    displays.map((item) => [
      `${item.subject}-${item.slotNumber}`,
      item.textbookName.trim(),
    ]),
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
