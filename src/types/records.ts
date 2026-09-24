export type AttendanceStatus = '출석' | '지각' | '결석' | '조퇴'

/** 지각/결석 하위분류. 출석·조퇴·레거시 행은 null */
export type AttendanceExcuseKind = '인정' | '무단'

export type AttendanceRecord = {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  reason: string
  memo: string
  /** 신규 입력만 설정. 레거시 지각/결석은 null로 보존 */
  excuseKind?: AttendanceExcuseKind | null
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

export type NoticeAudienceType = 'all' | 'grade' | 'class' | 'student'

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
  audienceType?: NoticeAudienceType
  targetGrade?: string
  targetClassName?: string
  targetStudentId?: string
  publishStartDate?: string
  publishEndDate?: string
  isImportant?: boolean
  careerAssessmentResultId?: string
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
  /** 레거시: 문항별 오답 (UI 미사용, 기존 데이터·월간집계 호환용 유지) */
  wrongAnswerItems: WrongAnswerItem[]
  questionTotal: number
  /** 오답 분석 — 개념 부족 문항 수 */
  conceptLackCount: number
  /** 오답 분석 — 계산 실수 문항 수 */
  calculationErrorCount: number
  /** 오답 분석 — 응용 능력 부족 문항 수 */
  applicationLackCount: number
  /** 오답 분석 — 문제 이해 부족 문항 수 */
  comprehensionLackCount: number
  /** 강사 피드백 */
  teacherFeedback: string
  fridayRetestTotal: number | null
  fridayRetestWrong: number | null
  englishVocabResult: '합격' | '불합격' | null
  englishGrammarWrongCount: number | null
  englishReadingWrongCount: number | null
  /** 영어 듣기 평가 점수 (0~100, 미입력 null) — learning_diagnosis JSONB */
  englishListeningScore: number | null
  /** 영어 듣기 평가 결과 */
  englishListeningResult: '합격' | '불합격' | null
  /** 영어 누적 단어 TEST. 'cumulative'이면 1~4차시 점수 대신 단어 수/오답 수 사용 */
  englishVocabTestFormat: 'cumulative' | null
  /** 표시/기록용 전체 누적 시험 단어 수. SUMMARY 감점에 사용하지 않음 */
  englishVocabTotalWords: number | null
  /** 틀린 단어 절대 개수. Weekly SUMMARY 감점에만 사용 */
  englishVocabWrongWords: number | null
  /** 문법 서술형 TEST. 미입력 null. Weekly 영어 지수에만 반영 */
  englishGrammarWrittenResult: '합격' | '부분 합격' | '불합격' | null
  /** 영어 작문. 미입력 null. Weekly 영어 지수에만 반영 */
  englishCompositionGrade: 'A' | 'B' | 'C' | null
  /** 수학 일일테스트 형식. 중등 오답입력 / 고등 최소입력 */
  mathDailyTestFormat: 'fixed-wrong-v1' | 'high-recovery-v1' | null
  /** 고등 최소입력 raw. 1차 오답 수 */
  mathHighFirstWrongCount: number | null
  /** 고등 최소입력 raw. 종료 차시 1~4 */
  mathHighEndSession: 1 | 2 | 3 | 4 | null
  /** 고등 최소입력 raw. 종료 3차 이상일 때만 3차 실제 문제 수 */
  mathHighSession3Questions: number | null
  /** 고등 최소입력 raw. 종료 4차일 때만 4차 실제 문제 수 */
  mathHighSession4Questions: number | null
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
  | '건의사항'

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
  source?: 'parent' | 'student'
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

export type MaterialPrepStatus = '지참' | '부분 지참'

export const CLASS_ATTITUDE_ISSUES = [
  '집중 저하',
  '졸음',
  '잡담',
  '수업방해',
  '태도 불량',
] as const

export type ClassAttitudeIssue = (typeof CLASS_ATTITUDE_ISSUES)[number]

/** 학생·날짜 단위 교재 준비·수업태도 (강사 사실값) */
export type StudentDailyCareRecord = {
  id: string
  studentId: string
  date: string
  /** null = 미입력. 부분 지참으로 간주하지 않음 */
  materialPrep: MaterialPrepStatus | null
  attitudeIssues: ClassAttitudeIssue[]
  attitudeNote: string
  createdAt: string
  updatedAt: string
}

export type WeeklySummaryGrade = '우수' | '양호' | '보통' | '미흡'

export type LearningRiskLevel = '우수' | '주의' | '위험'

export type WeeklySummaryAreaKey =
  | 'attendance'
  | 'material'
  | 'homework'
  | 'dailyTest'
  | 'attitude'

export type WeeklySummaryAreaSnapshot = {
  score: number | null
  max: number
  index: number | null
  grade: WeeklySummaryGrade | null
  facts: Record<string, number | string | boolean | null>
}

export type WeeklySummaryScoresSnapshot = Record<
  WeeklySummaryAreaKey,
  WeeklySummaryAreaSnapshot
>

/** 주간 학습 SUMMARY durable snapshot */
export type WeeklyLearningSummaryRecord = {
  id: string
  studentId: string
  weekStart: string
  periodStart: string
  periodEnd: string
  asOf: string
  totalScore: number | null
  grade: WeeklySummaryGrade | null
  scores: WeeklySummaryScoresSnapshot
  goodText: string
  checkText: string
  teacherComment: string
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
  textbookName: string
  currentProgress: string
  currentPage: number
  totalPage: number
  previousAssignment: string
  todayAssignment: string
  createdAt: string
  updatedAt: string
}

export type ScheduleTemplateType = 'mon-sun' | 'mon-wed-fri-sat' | 'tue-thu-sat'

export type ClassScheduleGrid = {
  id: string
  grade: string
  className: string
  templateType: ScheduleTemplateType
  timeLabels: string[]
  cells: Record<string, string>
  isActive: boolean
  createdAt: string
  updatedAt: string
}
