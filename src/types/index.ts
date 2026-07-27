export type {
  AttendanceRecord,
  AttendanceStatus,
  AssignmentCompletionRecord,
  AssignmentStatus,
  DailyTestRecord,
  TestSessionResult,
  TestSessionStatus,
  HomeworkRecord,
  HomeworkStatus,
  MakeupPlanRecord,
  MakeupPlanStatus,
  MakeupMethod,
  MonthlyEvaluationRecord,
  DifficultyBreakdown,
  QuestionCategory,
  QuestionImageAttachment,
  QuestionRecord,
  QuestionStatus,
  ProgressRecord,
  ContentPost,
  ContentPostCategory,
} from './records'

export type {
  Grade,
  Student,
  StudentFormData,
  StudentListFilters,
  StudentStatus,
  SubjectOption,
} from './student'

/** @deprecated 다른 페이지 필터용 */
export type StudentFilters = {
  search: string
  school: string
  grade: string
  className: string
  subject: string
}

export type DateFilters = StudentFilters & {
  date: string
}

/** @deprecated 이전 일일테스트 형식 호환 */
export type PassRound = 1 | 2 | 3 | 4 | 5 | null
