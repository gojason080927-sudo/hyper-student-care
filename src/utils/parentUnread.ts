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
import { filterScheduleGridsForStudent } from './classScheduleAccess'
import { getMathSharedLinkedClassNames } from './mathSharedGroup'

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
  const schedules = filterScheduleGridsForStudent(input.classScheduleGrids, input.student)
  return maxUpdatedAt([...notices, ...schedules])
}

function computeQuestionsUpdatedAt(input: ParentUnreadInput): string | null {
  const studentId = input.student.id
  const answered = input.questions.filter(
    (q) => q.studentId === studentId && q.status === '답변완료' && q.answer.trim().length > 0,
  )
  return maxUpdatedAt(answered)
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
