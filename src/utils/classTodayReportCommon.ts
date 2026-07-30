import type {
  ClassTodayReportCommon,
  HomeworkTextbookEntry,
  HomeworkStatus,
  ProgressRecord,
  TextbookSlotNumber,
  TextbookSubject,
} from '../types/records'
import type { Student } from '../types/student'
import { calcProgressRate } from './calc'
import { parseStandardClassName } from './studentGradeClass'

function classCommonSubjectsMatch(stored: unknown, expected: TextbookSubject): boolean {
  const raw = String(stored ?? '').trim().toLowerCase()
  if (expected === '수학') return raw === '수학' || raw === 'math'
  if (expected === '영어') return raw === '영어' || raw === 'english'
  return false
}

function classCommonSlotNumber(value: unknown): TextbookSlotNumber {
  const n = Number(value)
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
}

export type ClassTodayReportSyncContext = {
  grade: string
  className: string
  peerStudentIds: string[]
}

export function parseProgressPageValue(value: unknown): number {
  if (value === '' || value === null || value === undefined) return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed)
}

export function normalizeProgressPages(currentPage: number, totalPage: number): {
  currentPage: number
  totalPage: number
} {
  const current = parseProgressPageValue(currentPage)
  const total = parseProgressPageValue(totalPage)
  return {
    currentPage: current,
    totalPage: total > 0 ? total : 0,
  }
}

export function classTrackIncludesSubject(
  className: string,
  subject: TextbookSubject,
): boolean {
  const parsed = parseStandardClassName(className)
  if (!parsed) return true
  if (parsed.track === '영수') return true
  if (parsed.track === '수학') return subject === '수학'
  if (parsed.track === '영어') return subject === '영어'
  return true
}

export function findClassTodayReportCommon(
  records: ClassTodayReportCommon[],
  grade: string,
  className: string,
  reportDate: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): ClassTodayReportCommon | undefined {
  const trimmedClass = className.trim()
  if (!grade.trim() || !trimmedClass) return undefined
  return records.find(
    (record) =>
      record.grade === grade &&
      record.className === trimmedClass &&
      record.reportDate === reportDate &&
      classCommonSubjectsMatch(record.subject, subject) &&
      classCommonSlotNumber(record.slotNumber) === slotNumber,
  )
}

export function getClassPeerStudentIds(
  students: Student[],
  anchor: Student,
  subject: TextbookSubject,
): string[] {
  if (!anchor.grade.trim() || !anchor.className.trim()) {
    return [anchor.id]
  }
  if (!classTrackIncludesSubject(anchor.className, subject)) {
    return [anchor.id]
  }
  return students
    .filter(
      (student) =>
        student.status === '재원' &&
        student.grade === anchor.grade &&
        student.className === anchor.className,
    )
    .map((student) => student.id)
}

export function resolveCommonPreviousAssignment(
  common: ClassTodayReportCommon | undefined,
  studentEntry: HomeworkTextbookEntry | undefined,
  prevDayCommon: ClassTodayReportCommon | undefined,
  prevDayStudentEntry: HomeworkTextbookEntry | undefined,
): string {
  const fromCommon = common?.previousAssignment.trim()
  if (fromCommon) return fromCommon

  const fromStudent = studentEntry?.previousAssignment?.trim()
  if (fromStudent) return fromStudent

  const fromPrevCommon = prevDayCommon?.todayAssignment?.trim()
  if (fromPrevCommon) return fromPrevCommon

  return prevDayStudentEntry?.todayAssignment?.trim() ?? ''
}

export function resolveCommonTodayAssignment(
  common: ClassTodayReportCommon | undefined,
  studentEntry: HomeworkTextbookEntry | undefined,
): string {
  const fromCommon = common?.todayAssignment.trim()
  if (fromCommon) return fromCommon
  return studentEntry?.todayAssignment?.trim() ?? ''
}

export function resolveCommonCurrentProgress(
  common: ClassTodayReportCommon | undefined,
  studentRecord: ProgressRecord | undefined,
): string {
  const fromCommon = common?.currentProgress.trim()
  if (fromCommon) return fromCommon
  return studentRecord?.currentProgress.trim() ?? ''
}

export function resolveCommonCurrentPage(
  common: ClassTodayReportCommon | undefined,
  studentRecord: ProgressRecord | undefined,
): number {
  if (common && (common.currentPage > 0 || common.totalPage > 0)) {
    return common.currentPage
  }
  return studentRecord?.currentPage ?? 0
}

export function resolveCommonTotalPage(
  common: ClassTodayReportCommon | undefined,
  studentRecord: ProgressRecord | undefined,
): number {
  if (common && (common.currentPage > 0 || common.totalPage > 0)) {
    return common.totalPage
  }
  return studentRecord?.totalPage ?? 0
}

export function buildClassCommonRecord(params: {
  id?: string
  grade: string
  className: string
  reportDate: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  currentProgress?: string
  currentPage?: number
  totalPage?: number
  previousAssignment?: string
  todayAssignment?: string
  existing?: ClassTodayReportCommon
  timestamps: { createdAt: string; updatedAt: string }
  createId: () => string
}): ClassTodayReportCommon {
  const {
    grade,
    className,
    reportDate,
    subject,
    slotNumber,
    existing,
    timestamps,
    createId,
  } = params
  const pages = normalizeProgressPages(
    params.currentPage ?? existing?.currentPage ?? 0,
    params.totalPage ?? existing?.totalPage ?? 0,
  )

  return {
    id: params.id ?? existing?.id ?? createId(),
    grade,
    className: className.trim(),
    reportDate,
    subject,
    slotNumber,
    currentProgress: params.currentProgress?.trim() ?? existing?.currentProgress ?? '',
    currentPage: pages.currentPage,
    totalPage: pages.totalPage,
    previousAssignment:
      params.previousAssignment?.trim() ?? existing?.previousAssignment ?? '',
    todayAssignment: params.todayAssignment?.trim() ?? existing?.todayAssignment ?? '',
    createdAt: existing?.createdAt ?? timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  }
}

export function buildSyncedHomeworkEntryForPeer(params: {
  peerStudentId: string
  anchorStudentId: string
  date: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  previousAssignment: string
  todayAssignment: string
  anchorStatus: HomeworkStatus | ''
  existingEntries: HomeworkTextbookEntry[]
  timestamps: { createdAt: string; updatedAt: string }
  createId: () => string
}): HomeworkTextbookEntry {
  const existing = params.existingEntries.find(
    (entry) =>
      entry.studentId === params.peerStudentId &&
      entry.date === params.date &&
      entry.subject === params.subject &&
      entry.slotNumber === params.slotNumber,
  )
  const isAnchor = params.peerStudentId === params.anchorStudentId

  return {
    id: existing?.id ?? params.createId(),
    studentId: params.peerStudentId,
    date: params.date,
    subject: params.subject,
    slotNumber: params.slotNumber,
    previousAssignment: params.previousAssignment.trim(),
    todayAssignment: params.todayAssignment.trim(),
    status: isAnchor ? params.anchorStatus : existing?.status ?? '',
    createdAt: existing?.createdAt ?? params.timestamps.createdAt,
    updatedAt: params.timestamps.updatedAt,
  }
}

export function buildSyncedProgressRecordForPeer(params: {
  peerStudentId: string
  anchorStudentId: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  date: string
  syncedContent: {
    currentProgress: string
    currentPage: number
    totalPage: number
  }
  anchorTeacherMemo: string
  existingRecords: ProgressRecord[]
  timestamps: { createdAt: string; updatedAt: string }
  createId: () => string
}): ProgressRecord | null {
  const existing = params.existingRecords.find(
    (record) =>
      record.studentId === params.peerStudentId &&
      record.subject === params.subject &&
      (record.slotNumber ?? 1) === params.slotNumber &&
      record.lastStudyDate === params.date,
  )
  const isAnchor = params.peerStudentId === params.anchorStudentId
  const pages = normalizeProgressPages(
    params.syncedContent.currentPage,
    params.syncedContent.totalPage,
  )
  const currentProgress = params.syncedContent.currentProgress.trim()
  const teacherMemo = isAnchor
    ? params.anchorTeacherMemo.trim()
    : existing?.teacherMemo.trim() ?? ''

  const hasContent =
    currentProgress ||
    pages.currentPage > 0 ||
    pages.totalPage > 0 ||
    teacherMemo

  if (!hasContent && !existing) {
    return null
  }

  const totalPage = pages.totalPage > 0 ? pages.totalPage : existing?.totalPage || 1

  return {
    id: existing?.id ?? params.createId(),
    studentId: params.peerStudentId,
    subject: params.subject,
    slotNumber: params.slotNumber,
    textbookName: existing?.textbookName ?? '',
    currentProgress: currentProgress || existing?.currentProgress.trim() || '',
    currentPage: pages.currentPage > 0 ? pages.currentPage : existing?.currentPage ?? 0,
    totalPage,
    progressRate: calcProgressRate(
      pages.currentPage > 0 ? pages.currentPage : existing?.currentPage ?? 0,
      totalPage,
    ),
    lastStudyDate: params.date,
    teacherMemo,
    createdAt: existing?.createdAt ?? params.timestamps.createdAt,
    updatedAt: params.timestamps.updatedAt,
  }
}

if (import.meta.env.DEV) {
  ;(globalThis as { __classTodayReportCommonDebug?: boolean }).__classTodayReportCommonDebug =
    true
}
