export type EntranceExamSubject = '수학' | '영어'
export type EntranceExamGrade = '중1' | '중2' | '중3' | '고1'
export type EntranceExamDifficulty = '하' | '중' | '상'
export type EntranceExamQuestionType = 'multiple_choice'

export type EntranceExamQuestion = {
  id: string
  subject: EntranceExamSubject
  targetGrade: EntranceExamGrade
  questionType: EntranceExamQuestionType
  stem: string
  choices: string[]
  correctChoice: number
  explanation: string
  difficulty: EntranceExamDifficulty
  evaluationAreas: string[]
  unitName: string
  createdAt: string
  updatedAt: string
}

export type EntranceExamQuestionInput = {
  id?: string
  subject: EntranceExamSubject
  targetGrade: EntranceExamGrade
  stem: string
  choices: string[]
  correctChoice: number
  explanation: string
  difficulty: EntranceExamDifficulty
  evaluationAreas: string[]
  unitName: string
}

export type EntranceExamQuestionRow = {
  id: string
  subject: string
  target_grade: string
  question_type: string
  stem: string
  choices: unknown
  correct_choice: number
  explanation: string
  difficulty: string
  evaluation_areas: string[] | null
  unit_name: string
  created_at: string
  updated_at: string
}

/** 저장된 시험지 (출력 순서 = questionIds 순서) */
export type EntranceExamPaper = {
  id: string
  title: string
  subject: EntranceExamSubject
  targetGrade: string
  questionIds: string[]
  questionCount: number
  createdAt: string
  updatedAt: string
}

export type EntranceExamPaperInput = {
  id?: string
  title: string
  subject: EntranceExamSubject
  targetGrade: string
  questionIds: string[]
}

export type EntranceExamPaperRow = {
  id: string
  title: string
  subject: string
  target_grade: string
  question_ids: string[] | null
  question_count: number
  created_at: string
  updated_at: string
}

export type EntranceExamAnswerItem = {
  questionId: string
  number: number
  studentChoice: number | null
  correctChoice: number
  isCorrect: boolean
}

export type EntranceExamAreaScore = {
  area: string
  correctCount: number
  totalCount: number
  /** totalCount=0 또는 시간 기반 영역이면 null */
  score: number | null
  /** accuracy: 정답률 산출 / unavailable: 문항 없음 / needs_time: 독해 속도 등 */
  status: 'accuracy' | 'unavailable' | 'needs_time'
}

export type EntranceExamAttempt = {
  id: string
  paperId: string
  paperTitle: string
  subject: EntranceExamSubject
  school: string
  studentName: string
  grade: string
  examDate: string
  linkedStudentId: string | null
  answers: EntranceExamAnswerItem[]
  correctCount: number
  totalCount: number
  totalScore: number
  areaScores: EntranceExamAreaScore[]
  createdAt: string
  updatedAt: string
}

export type EntranceExamAttemptInput = {
  id?: string
  paperId: string
  paperTitle: string
  subject: EntranceExamSubject
  school: string
  studentName: string
  grade: string
  examDate: string
  linkedStudentId?: string | null
  answers: EntranceExamAnswerItem[]
  correctCount: number
  totalCount: number
  totalScore: number
  areaScores: EntranceExamAreaScore[]
}

export type EntranceExamAttemptRow = {
  id: string
  paper_id: string
  paper_title: string
  subject: string
  school: string
  student_name: string
  grade: string
  exam_date: string | null
  linked_student_id: string | null
  answers: unknown
  correct_count: number
  total_count: number
  total_score: number | string
  area_scores: unknown
  created_at: string
  updated_at: string
}

/** 학습성향 설문 (attempt_id당 1건) — REPORT 연동용 */
export type EntranceExamLearningSurvey = {
  id: string
  attemptId: string
  responses: Record<string, number>
  motivationScore: number
  selfDirectedScore: number
  concentrationScore: number
  planningScore: number
  persistenceScore: number
  confidenceScore: number
  overallScore: number
  createdAt: string
  updatedAt: string
}

export type EntranceExamLearningSurveyInput = {
  attemptId: string
  responses: Record<string, number>
  motivationScore: number
  selfDirectedScore: number
  concentrationScore: number
  planningScore: number
  persistenceScore: number
  confidenceScore: number
  overallScore: number
}

export type EntranceExamLearningSurveyRow = {
  id: string
  attempt_id: string
  responses: unknown
  motivation_score: number | string
  self_directed_score: number | string
  concentration_score: number | string
  planning_score: number | string
  persistence_score: number | string
  confidence_score: number | string
  overall_score: number | string
  created_at: string
  updated_at: string
}

/** 통합 종합진단용 평가 세션 — 기존 attempt/survey 참조만 */
export type EntranceExamEvaluationSession = {
  id: string
  studentName: string
  school: string
  grade: string
  evaluationDate: string
  mathAttemptId: string | null
  englishAttemptId: string | null
  learningSurveyId: string | null
  createdAt: string
  updatedAt: string
}

export type EntranceExamEvaluationSessionInput = {
  id?: string
  studentName: string
  school: string
  grade: string
  evaluationDate: string
  mathAttemptId?: string | null
  englishAttemptId?: string | null
  learningSurveyId?: string | null
}

export type EntranceExamEvaluationSessionRow = {
  id: string
  student_name: string
  school: string
  grade: string
  evaluation_date: string | null
  math_attempt_id: string | null
  english_attempt_id: string | null
  learning_survey_id: string | null
  created_at: string
  updated_at: string
}
