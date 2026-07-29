import type { ClassBulkStudentDraft } from '../types/classBulk'
import type {
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentTextbookSlot,
  TodayAssignmentRecord,
} from '../types/records'
import { findClassNote } from './classNote'
import { getHomeworkContent } from './homework'
import { findTodayAssignment } from './todayAssignment'
import { findProgressBySubject } from './progressRecord'
import {
  createDefaultSessionResults,
  dailyTestRecordToForm,
  type DailyTestFormData,
} from './dailyTest'

export type StudentDayRecords = {
  attendance?: AttendanceRecord
  homework?: HomeworkRecord
  todayAssignment?: TodayAssignmentRecord
  homeworkTextbookEntries?: HomeworkTextbookEntry[]
  studentTextbookSlots?: StudentTextbookSlot[]
  classNote?: ClassNoteRecord
  dailyTest?: DailyTestRecord
  progressMath?: ProgressRecord
  progressEnglish?: ProgressRecord
  dayProgress?: ProgressRecord[]
}

export type TodayReportLookupContext = {
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  todayAssignments: TodayAssignmentRecord[]
  homeworkTextbookEntries?: HomeworkTextbookEntry[]
  studentTextbookSlots?: StudentTextbookSlot[]
  classNotes: ClassNoteRecord[]
  dailyTests: DailyTestRecord[]
  progressRecords: ProgressRecord[]
}

export function formatTodayProgressContent(record?: ProgressRecord): string {
  if (!record) return ''
  const progress = record.currentProgress?.trim() ?? ''
  const textbook = record.textbookName?.trim() ?? ''
  if (progress && textbook && !progress.includes(textbook)) {
    return `${textbook}\n${progress}`
  }
  return progress || textbook
}

export function resolveHomeworkFields(
  homeworkRecord?: HomeworkRecord,
  assignmentRecord?: TodayAssignmentRecord,
): { previous: string; today: string } {
  const previous = homeworkRecord ? getHomeworkContent(homeworkRecord).trim() : ''

  if (!assignmentRecord) {
    return { previous, today: '' }
  }

  const assignment1 = assignmentRecord.assignment1.trim()
  const assignment2 = assignmentRecord.assignment2.trim()

  if (previous) {
    return { previous, today: assignment2 || assignment1 }
  }

  if (assignment1 && assignment2) {
    return { previous: '', today: `${assignment1}\n${assignment2}` }
  }

  return { previous: '', today: assignment1 || assignment2 }
}

export function findStudentDayRecords(
  studentId: string,
  date: string,
  ctx: TodayReportLookupContext,
): StudentDayRecords {
  const dayProgress = ctx.progressRecords.filter(
    (record) => record.studentId === studentId && record.lastStudyDate === date,
  )

  return {
    attendance: ctx.attendance.find(
      (record) => record.studentId === studentId && record.date === date,
    ),
    homework: ctx.homework.find(
      (record) => record.studentId === studentId && record.date === date,
    ),
    todayAssignment: findTodayAssignment(ctx.todayAssignments, studentId, date),
    homeworkTextbookEntries: ctx.homeworkTextbookEntries?.filter(
      (record) => record.studentId === studentId && record.date === date,
    ),
    studentTextbookSlots: ctx.studentTextbookSlots?.filter(
      (record) => record.studentId === studentId,
    ),
    classNote: findClassNote(ctx.classNotes, studentId, date),
    dailyTest: ctx.dailyTests.find(
      (record) => record.studentId === studentId && record.date === date,
    ),
    progressMath: findProgressBySubject(dayProgress, '수학'),
    progressEnglish: findProgressBySubject(dayProgress, '영어'),
    dayProgress,
  }
}

export function getLatestUpdatedAt(records: StudentDayRecords): string | undefined {
  const timestamps = [
    records.attendance?.updatedAt,
    records.homework?.updatedAt,
    records.todayAssignment?.updatedAt,
    records.classNote?.updatedAt,
    records.dailyTest?.updatedAt,
    records.progressMath?.updatedAt,
    records.progressEnglish?.updatedAt,
  ].filter(Boolean) as string[]

  if (timestamps.length === 0) return undefined
  return timestamps.sort((a, b) => b.localeCompare(a))[0]
}

export function buildDailyTestDraft(
  record: DailyTestRecord | undefined,
  _studentId: string,
  _date: string,
): Pick<DailyTestFormData, 'testName' | 'subject' | 'memo' | 'sessionResults'> {
  if (record) {
    const form = dailyTestRecordToForm(record)
    return {
      testName: form.testName,
      subject: form.subject,
      memo: form.memo,
      sessionResults: form.sessionResults,
    }
  }
  return {
    testName: '일일테스트',
    subject: '수학',
    memo: '',
    sessionResults: createDefaultSessionResults(),
  }
}

export function buildClassBulkStudentDraft(
  studentId: string,
  records: StudentDayRecords,
): ClassBulkStudentDraft {
  const homeworkFields = resolveHomeworkFields(records.homework, records.todayAssignment)
  const dailyTest = buildDailyTestDraft(records.dailyTest, studentId, '')

  return {
    studentId,
    attendanceStatus: records.attendance?.status ?? '',
    attendanceReason: records.attendance?.reason ?? '',
    mathProgress: formatTodayProgressContent(records.progressMath),
    englishProgress: formatTodayProgressContent(records.progressEnglish),
    progressTeacherMemo:
      records.progressMath?.teacherMemo?.trim() ||
      records.progressEnglish?.teacherMemo?.trim() ||
      '',
    homeworkStatus: records.homework?.status ?? '',
    previousAssignment: homeworkFields.previous,
    todayAssignment: homeworkFields.today,
    classNote: records.classNote?.note ?? '',
    dailyTestName: dailyTest.testName,
    dailyTestSubject: dailyTest.subject,
    dailyTestMemo: dailyTest.memo,
    sessionResults: dailyTest.sessionResults,
    recordIds: {
      attendance: records.attendance?.id,
      homework: records.homework?.id,
      todayAssignment: records.todayAssignment?.id,
      classNote: records.classNote?.id,
      dailyTest: records.dailyTest?.id,
      mathProgress: records.progressMath?.id,
      englishProgress: records.progressEnglish?.id,
    },
    lastUpdatedAt: getLatestUpdatedAt(records),
  }
}
