import {
  upsertAttendance,
  upsertClassNote,
  upsertDailyTest,
  upsertHomework,
  upsertProgress,
  upsertTodayAssignment,
} from '../lib/db/repository'
import type { ClassBulkStudentDraft } from '../types/classBulk'
import type {
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  ProgressRecord,
  TodayAssignmentRecord,
} from '../types/records'
import { calcProgressRate, calcPercentage } from './calc'
import {
  dailyTestFormToSavePayload,
  normalizeDailyTestRecord,
  type DailyTestFormData,
} from './dailyTest'
import { homeworkRecordToSavePayload } from './homework'
import { createId } from './id'
import { createTimestamps, touchRecord } from './recordStorage'
import type { StudentDayRecords } from './todayReportLookup'

function hasActiveDailyTest(sessions: ClassBulkStudentDraft['sessionResults']): boolean {
  return sessions.some((session) => session.status !== '미응시')
}

function buildProgressRecord(
  draft: ClassBulkStudentDraft,
  subject: '수학' | '영어',
  content: string,
  existing: ProgressRecord | undefined,
  date: string,
): ProgressRecord {
  const ts = createTimestamps()
  const base = {
    id: (subject === '수학' ? draft.recordIds.mathProgress : draft.recordIds.englishProgress) ??
      existing?.id ??
      createId(),
    studentId: draft.studentId,
    subject,
    textbookName: existing?.textbookName ?? '',
    currentProgress: content.trim(),
    currentPage: existing?.currentPage ?? 0,
    totalPage: existing?.totalPage ?? 100,
    progressRate: calcProgressRate(existing?.currentPage ?? 0, existing?.totalPage ?? 100),
    lastStudyDate: date,
    teacherMemo: draft.progressTeacherMemo.trim(),
    createdAt: existing?.createdAt ?? ts.createdAt,
    updatedAt: ts.updatedAt,
  }
  return touchRecord(base)
}

export async function saveClassBulkStudentDraft(
  draft: ClassBulkStudentDraft,
  date: string,
  existing: StudentDayRecords,
): Promise<void> {
  const errors: string[] = []

  if (draft.attendanceStatus) {
    try {
      const ts = createTimestamps()
      const record: AttendanceRecord = touchRecord({
        ...(existing.attendance ?? {
          id: draft.recordIds.attendance ?? createId(),
          createdAt: ts.createdAt,
        }),
        id: draft.recordIds.attendance ?? existing.attendance?.id ?? createId(),
        studentId: draft.studentId,
        date,
        status: draft.attendanceStatus,
        reason: draft.attendanceReason.trim(),
        memo: existing.attendance?.memo ?? '',
        updatedAt: ts.updatedAt,
      })
      await upsertAttendance(record)
    } catch {
      errors.push('출결')
    }
  }

  if (draft.mathProgress.trim()) {
    try {
      const record = buildProgressRecord(
        draft,
        '수학',
        draft.mathProgress,
        existing.progressMath,
        date,
      )
      await upsertProgress(record)
    } catch {
      errors.push('수학 진도')
    }
  }

  if (draft.englishProgress.trim()) {
    try {
      const record = buildProgressRecord(
        draft,
        '영어',
        draft.englishProgress,
        existing.progressEnglish,
        date,
      )
      await upsertProgress(record)
    } catch {
      errors.push('영어 진도')
    }
  }

  const shouldSaveHomework =
    draft.homeworkStatus ||
    draft.previousAssignment.trim() ||
    draft.todayAssignment.trim()

  if (shouldSaveHomework) {
    if (draft.homeworkStatus) {
      try {
        const ts = createTimestamps()
        const payload = homeworkRecordToSavePayload({
          id: draft.recordIds.homework ?? existing.homework?.id,
          studentId: draft.studentId,
          date,
          content: draft.previousAssignment,
          status: draft.homeworkStatus,
          teacherMemo: existing.homework?.teacherMemo ?? '',
        })
        const record: HomeworkRecord = touchRecord({
          ...(existing.homework ?? { id: payload.id ?? createId(), ...ts }),
          ...payload,
          id: payload.id ?? existing.homework?.id ?? createId(),
        })
        await upsertHomework(record)
      } catch {
        errors.push('과제 수행 결과')
      }
    }

    if (draft.todayAssignment.trim()) {
      try {
        const ts = createTimestamps()
        const record: TodayAssignmentRecord = {
          id: draft.recordIds.todayAssignment ?? existing.todayAssignment?.id ?? createId(),
          studentId: draft.studentId,
          date,
          assignment1: '',
          assignment2: draft.todayAssignment.trim(),
          createdAt: existing.todayAssignment?.createdAt ?? ts.createdAt,
          updatedAt: ts.updatedAt,
        }
        await upsertTodayAssignment(record)
      } catch {
        errors.push('오늘 과제')
      }
    }
  }

  if (draft.classNote.trim()) {
    try {
      const ts = createTimestamps()
      const record: ClassNoteRecord = {
        id: draft.recordIds.classNote ?? existing.classNote?.id ?? createId(),
        studentId: draft.studentId,
        date,
        hasClassNote: true,
        note: draft.classNote.trim(),
        createdAt: existing.classNote?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      await upsertClassNote(record)
    } catch {
      errors.push('특이사항')
    }
  }

  if (hasActiveDailyTest(draft.sessionResults)) {
    try {
      const form: DailyTestFormData = {
        id: draft.recordIds.dailyTest ?? existing.dailyTest?.id,
        studentId: draft.studentId,
        date,
        testName: draft.dailyTestName.trim() || '일일테스트',
        subject: draft.dailyTestSubject || '수학',
        memo: draft.dailyTestMemo,
        sessionResults: draft.sessionResults,
      }
      const payload = dailyTestFormToSavePayload(form)
      const ts = createTimestamps()
      const draftRecord: DailyTestRecord = {
        id: payload.id ?? existing.dailyTest?.id ?? createId(),
        studentId: draft.studentId,
        date,
        testName: payload.testName,
        subject: payload.subject,
        memo: payload.memo,
        score: payload.score,
        totalScore: payload.totalScore,
        percentage: calcPercentage(payload.score ?? 0, payload.totalScore ?? 100),
        incorrectCount: payload.incorrectCount,
        sessionResults: payload.sessionResults ?? [],
        createdAt: existing.dailyTest?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const record = touchRecord(normalizeDailyTestRecord(draftRecord))
      await upsertDailyTest(record)
    } catch {
      errors.push('일일테스트')
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
}

export function draftHasSaveableData(draft: ClassBulkStudentDraft): boolean {
  return Boolean(
    draft.attendanceStatus ||
      draft.mathProgress.trim() ||
      draft.englishProgress.trim() ||
      draft.homeworkStatus ||
      draft.previousAssignment.trim() ||
      draft.todayAssignment.trim() ||
      draft.classNote.trim() ||
      hasActiveDailyTest(draft.sessionResults),
  )
}
