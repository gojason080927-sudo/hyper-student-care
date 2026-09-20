import type {
  AttendanceStatus,
  DailyLearningDiagnosisData,
  HomeworkStatus,
  TestSessionResult,
} from '../types/records'

export type ClassBulkStudentDraft = {
  studentId: string
  studentGrade?: string
  attendanceStatus: AttendanceStatus | ''
  attendanceReason: string
  mathProgress: string
  englishProgress: string
  progressTeacherMemo: string
  homeworkStatus: HomeworkStatus | ''
  previousAssignment: string
  todayAssignment: string
  classNote: string
  dailyTestName: string
  dailyTestSubject: string
  dailyTestMemo: string
  sessionResults: TestSessionResult[]
  learningDiagnosis: DailyLearningDiagnosisData
  mathWrongCounts: Record<1 | 2 | 3 | 4, string>
  highFirstWrong: string
  highEndSession: '' | 1 | 2 | 3 | 4
  highSession3Questions: string
  highSession4Questions: string
  recordIds: {
    attendance?: string
    homework?: string
    todayAssignment?: string
    classNote?: string
    dailyTest?: string
    mathProgress?: string
    englishProgress?: string
  }
  lastUpdatedAt?: string
}

export type ClassBulkCommonDraft = {
  mathProgress: string
  englishProgress: string
  todayAssignment: string
  teacherMemo: string
}

export type ClassBulkSaveResult = {
  studentId: string
  studentName: string
  success: boolean
  error?: string
}
