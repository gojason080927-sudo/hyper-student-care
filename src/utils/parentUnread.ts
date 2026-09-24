import type {
  ClassNoteRecord,
  ClassScheduleGrid,
  ClassTodayReportCommon,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
  TodayAssignmentRecord,
} from '../types/records'
import type { AttendanceRecord } from '../types/records'
import type { Student } from '../types/student'
import { filterNoticesForStudent } from './noticeAudience'
import { getMathSharedLinkedClassNames } from './mathSharedGroup'
import { isParentSuggestionRecord } from './parentSuggestions'

export type ParentUnreadCategory =
  | 'today-report'
  | 'monthly-evaluation'
  | 'makeup-plans'
  | 'learning-notices'
  | 'questions'

export const PARENT_UNREAD_CATEGORIES: ParentUnreadCategory[] = [
  'today-report',
  'monthly-evaluation',
  'makeup-plans',
  'learning-notices',
  'questions',
]

export type ParentCategoryReads = Partial<Record<ParentUnreadCategory, string>>

export type ParentUnreadState = Record<ParentUnreadCategory, boolean>

const EMPTY_UNREAD: ParentUnreadState = {
  'today-report': false,
  'monthly-evaluation': false,
  'makeup-plans': false,
  'learning-notices': false,
  questions: false,
}

function maxUpdatedAt(items: { updatedAt: string }[]): string | null {
  if (items.length === 0) return null
  return items.reduce(
    (max, item) => (item.updatedAt > max ? item.updatedAt : max),
    items[0].updatedAt,
  )
}

function isCategoryUnread(contentUpdatedAt: string | null, lastReadAt: string | undefined): boolean {
  if (!contentUpdatedAt) return false
  if (!lastReadAt) return true
  return new Date(contentUpdatedAt).getTime() > new Date(lastReadAt).getTime()
}

function filterClassTodayReportCommonForStudent(
  records: ClassTodayReportCommon[],
  student: Pick<Student, 'grade' | 'className'>,
): ClassTodayReportCommon[] {
  const grade = student.grade.trim()
  const className = student.className.trim()
  const linked = getMathSharedLinkedClassNames(grade, className)
  const allowedClasses = new Set(linked.length > 1 ? linked : [className])
  return records.filter(
    (record) => record.grade === grade && allowedClasses.has(record.className.trim()),
  )
}

export type ParentUnreadInput = {
  student: Student
  categoryReads: ParentCategoryReads
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  dailyTests: DailyTestRecord[]
  classNotes: ClassNoteRecord[]
  todayAssignments: TodayAssignmentRecord[]
  classTodayReportCommon: ClassTodayReportCommon[]
  progressRecords: ProgressRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  classScheduleGrids: ClassScheduleGrid[]
  questions: QuestionRecord[]
}

function computeTodayReportUpdatedAt(input: ParentUnreadInput): string | null {
  const studentId = input.student.id
  const classCommon = filterClassTodayReportCommonForStudent(
    input.classTodayReportCommon,
    input.student,
  )

  return maxUpdatedAt([
    ...input.attendance.filter((r) => r.studentId === studentId),
    ...input.homework.filter((r) => r.studentId === studentId),
    ...input.homeworkTextbookEntries.filter((r) => r.studentId === studentId),
    ...input.dailyTests.filter((r) => r.studentId === studentId),
    ...input.classNotes.filter((r) => r.studentId === studentId),
    ...input.todayAssignments.filter((r) => r.studentId === studentId),
    ...input.progressRecords.filter((r) => r.studentId === studentId),
    ...classCommon,
  ])
}

function computeMonthlyEvaluationUpdatedAt(input: ParentUnreadInput): string | null {
  const studentId = input.student.id
  return maxUpdatedAt([
    ...input.progressRecords.filter((r) => r.studentId === studentId),
    ...input.monthlyEvaluations.filter((r) => r.studentId === studentId),
  ])
}

function computeMakeupPlansUpdatedAt(input: ParentUnreadInput): string | null {
  const studentId = input.student.id
  return maxUpdatedAt(input.makeupPlans.filter((r) => r.studentId === studentId))
}

function computeLearningNoticesUpdatedAt(input: ParentUnreadInput): string | null {
  const notices = filterNoticesForStudent(input.contentPosts, input.student)
  return maxUpdatedAt(notices)
}

function computeQuestionsUpdatedAt(input: ParentUnreadInput): string | null {
  const studentId = input.student.id
  const answered = input.questions.filter(
    (q) =>
      q.studentId === studentId &&
      !isParentSuggestionRecord(q) &&
      q.status === '답변완료' &&
      q.answer.trim().length > 0,
  )
  return maxUpdatedAt(answered)
}

export function computeParentSuggestionUpdatedAt(
  questions: QuestionRecord[],
  studentId: string,
): string | null {
  const answered = questions.filter(
    (q) =>
      q.studentId === studentId &&
      isParentSuggestionRecord(q) &&
      q.status === '답변완료' &&
      q.answer.trim().length > 0,
  )
  return maxUpdatedAt(answered)
}

export function hasUnreadParentSuggestions(
  questions: QuestionRecord[],
  studentId: string,
  lastReadAt: string | undefined,
): boolean {
  return isCategoryUnread(computeParentSuggestionUpdatedAt(questions, studentId), lastReadAt)
}

export function parentSuggestionReadStorageKey(accessKey: string): string {
  return `hyper-parent-suggestion-read:${accessKey.trim()}`
}

export function readParentSuggestionLastRead(accessKey: string): string | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    return localStorage.getItem(parentSuggestionReadStorageKey(accessKey)) || undefined
  } catch {
    return undefined
  }
}

export function writeParentSuggestionLastRead(accessKey: string): string {
  const stamp = new Date().toISOString()
  if (typeof localStorage === 'undefined') return stamp
  try {
    localStorage.setItem(parentSuggestionReadStorageKey(accessKey), stamp)
  } catch {
    /* ignore quota / private mode */
  }
  return stamp
}

export function computeParentUnreadState(input: ParentUnreadInput): ParentUnreadState {
  const { categoryReads } = input

  const contentUpdated: Record<ParentUnreadCategory, string | null> = {
    'today-report': computeTodayReportUpdatedAt(input),
    'monthly-evaluation': computeMonthlyEvaluationUpdatedAt(input),
    'makeup-plans': computeMakeupPlansUpdatedAt(input),
    'learning-notices': computeLearningNoticesUpdatedAt(input),
    questions: computeQuestionsUpdatedAt(input),
  }

  return PARENT_UNREAD_CATEGORIES.reduce((state, category) => {
    state[category] = isCategoryUnread(
      contentUpdated[category],
      categoryReads[category],
    )
    return state
  }, { ...EMPTY_UNREAD })
}

export function hasAnyParentUnread(unread: ParentUnreadState): boolean {
  return PARENT_UNREAD_CATEGORIES.some((category) => unread[category])
}

export function hasUnreadNoticesOrMakeup(unread: ParentUnreadState): boolean {
  return unread['learning-notices'] || unread['makeup-plans']
}

export function coerceParentReadTimestamp(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && !Number.isNaN(Date.parse(trimmed))) return trimmed
    return null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

export function laterParentReadTimestamp(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const aTime = a ? new Date(a).getTime() : Number.NaN
  const bTime = b ? new Date(b).getTime() : Number.NaN
  const aOk = Number.isFinite(aTime)
  const bOk = Number.isFinite(bTime)
  if (!aOk && !bOk) return null
  if (!aOk) return b ?? null
  if (!bOk) return a ?? null
  return aTime >= bTime ? (a as string) : (b as string)
}

export function parentCategoryContentUpdatedAt(
  input: ParentUnreadInput,
  category: ParentUnreadCategory,
): string | null {
  switch (category) {
    case 'today-report':
      return computeTodayReportUpdatedAt(input)
    case 'monthly-evaluation':
      return computeMonthlyEvaluationUpdatedAt(input)
    case 'makeup-plans':
      return computeMakeupPlansUpdatedAt(input)
    case 'learning-notices':
      return computeLearningNoticesUpdatedAt(input)
    case 'questions':
      return computeQuestionsUpdatedAt(input)
  }
}

/** 화면에 있던 내용의 updatedAt보다 읽음 시각이 앞서면 배지가 꺼지지 않는다. */
export function parentCategoryReadFloor(
  nowIso: string,
  contentUpdatedAt: string | null,
  seenThrough?: string | null,
): string {
  return (
    laterParentReadTimestamp(
      laterParentReadTimestamp(nowIso, contentUpdatedAt),
      seenThrough,
    ) ?? nowIso
  )
}

export function applyParentCategoryRead(
  prev: ParentCategoryReads,
  category: ParentUnreadCategory,
  rpcValue: unknown,
  fallbackIso: string,
): ParentCategoryReads {
  const next = coerceParentReadTimestamp(rpcValue) ?? fallbackIso
  return {
    ...prev,
    [category]: laterParentReadTimestamp(prev[category], next) ?? next,
  }
}

export function mergeParentCategoryReads(
  base: ParentCategoryReads,
  incoming: ParentCategoryReads,
): ParentCategoryReads {
  const merged: ParentCategoryReads = { ...base }
  for (const category of PARENT_UNREAD_CATEGORIES) {
    const next = laterParentReadTimestamp(base[category], incoming[category])
    if (next) merged[category] = next
  }
  return merged
}

export function parentCategoryReadStorageKey(accessKey: string): string {
  return `hyper-parent-category-reads:${accessKey.trim()}`
}

export function readStoredParentCategoryReads(accessKey: string): ParentCategoryReads {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(parentCategoryReadStorageKey(accessKey))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const reads: ParentCategoryReads = {}
    for (const category of PARENT_UNREAD_CATEGORIES) {
      const stamp = coerceParentReadTimestamp((parsed as Record<string, unknown>)[category])
      if (stamp) reads[category] = stamp
    }
    return reads
  } catch {
    return {}
  }
}

export function writeStoredParentCategoryRead(
  accessKey: string,
  category: ParentUnreadCategory,
  stamp: string,
): void {
  if (typeof localStorage === 'undefined') return
  try {
    const prev = readStoredParentCategoryReads(accessKey)
    const next = laterParentReadTimestamp(prev[category], stamp) ?? stamp
    localStorage.setItem(
      parentCategoryReadStorageKey(accessKey),
      JSON.stringify({ ...prev, [category]: next }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function shouldAcceptParentCategoryReadsFetch(
  loadId: number,
  latestLoadId: number,
): boolean {
  return loadId === latestLoadId
}
