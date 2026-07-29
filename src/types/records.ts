export type AttendanceStatus = '출석' | '지각' | '결석' | '조퇴'

export type AttendanceRecord = {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  reason: string
  memo: string
  createdAt: string
  updatedAt: string
}

export type HomeworkStatus = '완료' | '부분 완료' | '미완료'

export type HomeworkRecord = {
  id: string
  studentId: string
  date: string
  title: string
  description: string
  status: HomeworkStatus
  teacherMemo: string
  createdAt: string
  updatedAt: string
}

export type MakeupMethod = '학원 보강' | '영상 대체'

export type MakeupPlanStatus = '예정' | '완료' | '취소'

export type ContentPostCategory = '학습정보' | '공지사항'

export type ContentPost = {
  id: string
  category: ContentPostCategory
  title: string
  content: string
  summary: string
  sourceName: string
  originalArticleTitle: string
  authorName: string
  isPinned: boolean
  isPublished: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export type MakeupPlanRecord = {
  id: string
  studentId: string
  scheduledDate: string
  scheduledTime: string
  method: MakeupMethod
  subject: string
  reason: string
  memo: string
  status: MakeupPlanStatus
  createdAt: string
  updatedAt: string
}

export type AssignmentStatus = '완료' | '보충필요'

export type AssignmentCompletionRecord = {
  id: string
  studentId: string
  date: string
  assignmentName: string
  totalCount: number
  completedCount: number
  completionRate: number
  status: AssignmentStatus
  memo: string
  createdAt: string
  updatedAt: string
}

export type TestSessionStatus = '미응시' | '불합격' | '합격'

export type TestSessionResult = {
  session: 1 | 2 | 3 | 4
  status: TestSessionStatus
  score?: number
  totalScore?: number
  incorrectCount?: number
}

export type DailyTestRecord = {
  id: string
  studentId: string
  date: string
  testName: string
  subject: string
  score: number
  totalScore: number
  percentage: number
  incorrectCount: number
  memo: string
  sessionResults: TestSessionResult[]
  createdAt: string
  updatedAt: string
}

export type DifficultyBreakdown = {
  highest: number
  high: number
  middle: number
  basic: number
}

export type MonthlyEvaluationRecord = {
  id: string
  studentId: string
  evaluationDate: string
  year: number
  month: number
  subject: string
  score: number
  totalScore: number
  percentage: number
  difficultyBreakdown: DifficultyBreakdown
  teacherComment: string
  strengths: string
  improvements: string
  createdAt: string
  updatedAt: string
}

export type QuestionCategory =
  | '수업질문'
  | '숙제질문'
  | '시험질문'
  | '상담요청'
  | '기타'

export type QuestionStatus = '답변대기' | '답변완료'

export type QuestionImageAttachment = {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
}

export type QuestionRecord = {
  id: string
  studentId: string
  date: string
  category: QuestionCategory
  title: string
  content: string
  answer: string
  questionImages: QuestionImageAttachment[]
  answerImages: QuestionImageAttachment[]
  status: QuestionStatus
  createdAt: string
  updatedAt: string
}

export type ProgressRecord = {
  id: string
  studentId: string
  subject: string
  slotNumber: number
  textbookName: string
  currentProgress: string
  currentPage: number
  totalPage: number
  progressRate: number
  lastStudyDate: string
  teacherMemo: string
  createdAt: string
  updatedAt: string
}

export type TextbookSubject = '수학' | '영어'

export type TextbookSlotNumber = 1 | 2 | 3

export const TEXTBOOK_SUBJECTS: TextbookSubject[] = ['수학', '영어']

export const TEXTBOOK_SLOT_NUMBERS: TextbookSlotNumber[] = [1, 2, 3]

export type StudentTextbookSlot = {
  id: string
  studentId: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  textbookName: string
  createdAt: string
  updatedAt: string
}

export type HomeworkTextbookEntry = {
  id: string
  studentId: string
  date: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  previousAssignment: string
  todayAssignment: string
  status: HomeworkStatus | ''
  createdAt: string
  updatedAt: string
}

export type TodayAssignmentRecord = {
  id: string
  studentId: string
  date: string
  assignment1: string
  assignment2: string
  createdAt: string
  updatedAt: string
}

export type ClassNoteRecord = {
  id: string
  studentId: string
  date: string
  hasClassNote: boolean
  note: string
  createdAt: string
  updatedAt: string
}
