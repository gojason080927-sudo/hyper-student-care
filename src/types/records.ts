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

/** 일일테스트 학습진단 보조 데이터 (daily_tests.learning_diagnosis) */
export type DailyLearningDiagnosisData = {
  wrongAnswerItems: WrongAnswerItem[]
  questionTotal: number
  fridayRetestTotal: number | null
  fridayRetestWrong: number | null
  englishVocabResult: '합격' | '불합격' | null
  englishGrammarWrongCount: number | null
  englishReadingWrongCount: number | null
}

export type MathWrongCause = '개념 부족' | '계산 실수' | '문제 이해 부족'

export type WrongAnswerItem = {
  id: string
  label: string
  cause: MathWrongCause
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
  /** 월간 학습진단용 보조 데이터 (없으면 빈 기본값) */
  learningDiagnosis: DailyLearningDiagnosisData
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
  /** 수학 월말평가 문항별 오답 원인 */
  wrongAnswerItems: WrongAnswerItem[]
  /** 오류율 산출용 총 문항 수 (0이면 difficulty_breakdown 합계 fallback) */
  questionTotal: number
  createdAt: string
  updatedAt: string
}

export type MonthlyLearningReportStatus = 'draft' | 'published'

/** null = 해당 월 산출 원본 데이터 없음 (평가 전 / 데이터 없음) */
export type MonthlyLearningReportScores = {
  /** 학습 역량: 진단점수 / 학습 관리: 직접 감점 점수 */
  metric1: number | null
  metric2: number | null
  metric3: number | null
  homeworkHabit: number | null
  wrongAnswerManagement: number | null
  learningSincerity: number | null
  /** 학습 역량 원점수 (snapshot 보관용). 관리 지표는 null */
  rawMetric1: number | null
  rawMetric2: number | null
  rawMetric3: number | null
}

export type MonthlyLearningRecordsSnapshot = {
  lateCount: number
  absentCount: number
  partialHomeworkCount: number
  incompleteHomeworkCount: number
  testPass2Count: number
  testPass3Count: number
  testPass4Count: number
  /** 금요일 오답 재시험 응시 문제 수 (없으면 null = 재시험 기록 없음) */
  fridayRetestTotalCount: number | null
  /** 금요일 오답 재시험에서 다시 틀린 문제 수 */
  fridayRetestWrongCount: number | null
}

/** 월간 학습진단 REPORT 확정 snapshot */
export type MonthlyLearningReportRecord = {
  id: string
  studentId: string
  year: number
  month: number
  subject: '수학' | '영어'
  status: MonthlyLearningReportStatus
  publishedAt: string | null
  scores: MonthlyLearningReportScores
  learningRecords: MonthlyLearningRecordsSnapshot
  strengths: string
  improvements: string
  teacherOverallComment: string
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

/** 반(grade + className) · 날짜 · 과목 · 슬롯별 공통 진도·과제 */
export type ClassTodayReportCommon = {
  id: string
  grade: string
  className: string
  reportDate: string
  subject: TextbookSubject
  slotNumber: TextbookSlotNumber
  currentProgress: string
  currentPage: number
  totalPage: number
  previousAssignment: string
  todayAssignment: string
  createdAt: string
  updatedAt: string
}
