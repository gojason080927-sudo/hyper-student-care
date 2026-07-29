import type {
  AttendanceStatus,
  HomeworkStatus,
  TestSessionResult,
} from '../types/records'

export type ClassBulkStudentDraft = {
  studentId: string
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
