import type { DailyLearningDiagnosisData, HomeworkStatus } from '../../types/records'
import { isStudentAbsentOnDate } from '../todayReportAbsence'
import type { AttendanceRecord } from '../../types/records'
import { updateBulkScoreDraft } from '../teacherMobileDailyTest'
import {
  formatVoiceSummary,
  parseAttendanceVoice,
  parseAttitudeVoice,
  parseDailyTestVoice,
  parseHomeworkVoice,
  parseMaterialVoice,
  parseSectionTextVoice,
} from './parseVoiceTranscript'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice'
import type {
  AttendanceVoiceAssignment,
  AttitudeVoiceAssignment,
  DailyTestVoiceAssignment,
  MaterialVoiceAssignment,
  VoiceApplySummary,
  VoiceReviewItem,
  VoiceStudentRef,
} from './types'

function toSummary(
  appliedCount: number,
  skippedAbsentIds: string[],
  needsReview: VoiceReviewItem[],
): VoiceApplySummary {
  const uniqueAbsent = [...new Set(skippedAbsentIds)]
  return {
    appliedCount,
    excludedAbsentCount: uniqueAbsent.length,
    needsReviewCount: needsReview.length,
    needsReview,
  }
}

export function applyAttendanceDrafts<T extends {
  status: string
  excuseKind: AttendanceVoiceAssignment['excuseKind']
  reason: string
}>(
  drafts: Record<string, T>,
  transcript: string,
  students: VoiceStudentRef[],
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const parsed = parseAttendanceVoice(transcript, students)
  const next = { ...drafts }
  for (const row of parsed.assignments) {
    const current = next[row.studentId]
    if (!current) continue
    next[row.studentId] = {
      ...current,
      status: row.status,
      excuseKind: row.status === '출석' || row.status === '조퇴' ? null : row.excuseKind,
      reason: row.status === '출석' ? '' : current.reason,
    }
  }
  return {
    drafts: next,
    summary: toSummary(parsed.assignments.length, parsed.skippedAbsentIds, parsed.needsReview),
  }
}

export function homeworkDraftKey(
  studentId: string,
  subject: string,
  slotNumber: number,
): string {
  return `${studentId}:${subject}:${slotNumber}`
}

export function applyHomeworkDrafts<T extends { status: HomeworkStatus | '' }>(
  drafts: Record<string, T>,
  transcript: string,
  students: VoiceStudentRef[],
  attendance: AttendanceRecord[],
  date: string,
  subject: string,
  slotNumber: number,
): { drafts: Record<string, T>; summary: VoiceApplySummary; dirtyKeys: string[] } {
  const absentIds = new Set(
    students.filter((student) => isStudentAbsentOnDate(attendance, student.id, date)).map((s) => s.id),
  )
  const parsed = parseHomeworkVoice(transcript, students, absentIds)
  const next = { ...drafts }
  const dirtyKeys: string[] = []
  for (const row of parsed.assignments) {
    const key = homeworkDraftKey(row.studentId, subject, slotNumber)
    const current = next[key]
    if (!current) continue
    next[key] = { ...current, status: row.status }
    dirtyKeys.push(key)
  }
  return {
    drafts: next,
    dirtyKeys,
    summary: toSummary(parsed.assignments.length, parsed.skippedAbsentIds, parsed.needsReview),
  }
}

export function applyMaterialDrafts<T extends { materialPrep?: MaterialVoiceAssignment['status'] | null }>(
  drafts: Record<string, T | undefined>,
  transcript: string,
  students: VoiceStudentRef[],
  attendance: AttendanceRecord[],
  date: string,
  makeDraft: (
    student: VoiceStudentRef,
    prev: T | undefined,
    status: MaterialVoiceAssignment['status'],
  ) => T,
): { drafts: Record<string, T | undefined>; summary: VoiceApplySummary } {
  const absentIds = new Set(
    students.filter((student) => isStudentAbsentOnDate(attendance, student.id, date)).map((s) => s.id),
  )
  const parsed = parseMaterialVoice(transcript, students, absentIds)
  const next = { ...drafts }
  for (const row of parsed.assignments) {
    const student = students.find((item) => item.id === row.studentId)
    if (!student) continue
    next[row.studentId] = makeDraft(student, next[row.studentId], row.status)
  }
  return {
    drafts: next,
    summary: toSummary(parsed.assignments.length, parsed.skippedAbsentIds, parsed.needsReview),
  }
}

export function applyAttitudeDrafts<T extends { issues: AttitudeVoiceAssignment['issues']; note: string }>(
  drafts: Record<string, T>,
  transcript: string,
  students: VoiceStudentRef[],
  attendance: AttendanceRecord[],
  date: string,
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const absentIds = new Set(
    students.filter((student) => isStudentAbsentOnDate(attendance, student.id, date)).map((s) => s.id),
  )
  const parsed = parseAttitudeVoice(transcript, students, absentIds)
  const next = { ...drafts }
  for (const row of parsed.assignments) {
    const current = next[row.studentId]
    if (!current) continue
    next[row.studentId] = {
      ...current,
      issues: row.issues,
      note: row.issues.length > 0 ? row.note : '',
    }
  }
  return {
    drafts: next,
    summary: toSummary(parsed.assignments.length, parsed.skippedAbsentIds, parsed.needsReview),
  }
}

export function slotDraftKey(subject: string, slotNumber: number): string {
  return `${subject}:${slotNumber}`
}

export function applyProgressSlotDraft<T extends { currentProgress: string }>(
  drafts: Record<string, T>,
  transcript: string,
  subject: string,
  slotNumber: number,
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const parsed = parseSectionTextVoice(transcript)
  const key = slotDraftKey(subject, slotNumber)
  const next = { ...drafts }
  if (parsed.text && next[key]) {
    next[key] = { ...next[key], currentProgress: parsed.text }
  }
  return {
    drafts: next,
    summary: toSummary(parsed.text && drafts[key] ? 1 : 0, [], parsed.needsReview),
  }
}

export function applyTodayAssignmentSlotDraft<T extends { todayAssignment: string }>(
  drafts: Record<string, T>,
  transcript: string,
  subject: string,
  slotNumber: number,
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const parsed = parseSectionTextVoice(transcript)
  const key = slotDraftKey(subject, slotNumber)
  const next = { ...drafts }
  if (parsed.text && next[key]) {
    next[key] = { ...next[key], todayAssignment: parsed.text }
  }
  return {
    drafts: next,
    summary: toSummary(parsed.text && drafts[key] ? 1 : 0, [], parsed.needsReview),
  }
}

export function applyDailyTestDrafts<T extends {
  rounds: Array<{ round: 1 | 2 | 3 | 4; score: string; passed: boolean }>
  learningDiagnosis: DailyLearningDiagnosisData
}>(
  drafts: Record<string, T>,
  transcript: string,
  students: VoiceStudentRef[],
  attendance: AttendanceRecord[],
  date: string,
  round: 1 | 2 | 3 | 4,
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const absentIds = new Set(
    students.filter((student) => isStudentAbsentOnDate(attendance, student.id, date)).map((s) => s.id),
  )
  const parsed = parseDailyTestVoice(transcript, students, absentIds, round)
  const next = { ...drafts }
  for (const row of parsed.assignments) {
    const current = next[row.studentId]
    if (!current) continue
    next[row.studentId] = patchDailyTestDraft(current, row)
  }
  return {
    drafts: next,
    summary: toSummary(parsed.assignments.length, parsed.skippedAbsentIds, parsed.needsReview),
  }
}

function patchDailyTestDraft<T extends {
  rounds: Array<{ round: 1 | 2 | 3 | 4; score: string; passed: boolean }>
  learningDiagnosis: DailyLearningDiagnosisData
}>(current: T, row: DailyTestVoiceAssignment): T {
  const rounds = current.rounds.map((item) =>
    item.round === row.round && row.score !== ''
      ? { ...item, score: row.score }
      : item,
  )
  const diagnosis = { ...current.learningDiagnosis }
  if (row.conceptLackDelta) {
    diagnosis.conceptLackCount = (diagnosis.conceptLackCount || 0) + row.conceptLackDelta
  }
  if (row.calculationErrorDelta) {
    diagnosis.calculationErrorCount =
      (diagnosis.calculationErrorCount || 0) + row.calculationErrorDelta
  }
  if (row.applicationLackDelta) {
    diagnosis.applicationLackCount =
      (diagnosis.applicationLackCount || 0) + row.applicationLackDelta
  }
  if (row.teacherFeedback) {
    diagnosis.teacherFeedback = row.teacherFeedback
  }
  return { ...current, rounds, learningDiagnosis: diagnosis }
}

export function applyStudentDailyTestDraft<T extends {
  rounds: Array<{ round: 1 | 2 | 3 | 4; score: string; passed: boolean }>
  learningDiagnosis: DailyLearningDiagnosisData
}>(
  drafts: Record<string, T>,
  transcript: string,
  cardStudent: VoiceStudentRef,
  students: VoiceStudentRef[],
  attendance: AttendanceRecord[],
  date: string,
): { drafts: Record<string, T>; summary: VoiceApplySummary } {
  const absent = isStudentAbsentOnDate(attendance, cardStudent.id, date)
  const parsed = parseStudentDailyTestVoice(transcript, cardStudent, students, absent)
  const next = { ...drafts }
  if (!parsed.apply) {
    return {
      drafts: next,
      summary: toSummary(0, parsed.skippedAbsent ? [cardStudent.id] : [], parsed.needsReview),
    }
  }
  const current = next[cardStudent.id]
  if (!current) {
    return {
      drafts: next,
      summary: toSummary(0, [], parsed.needsReview),
    }
  }
  next[cardStudent.id] = patchStudentDailyTestDraft(current, parsed)
  const appliedCount =
    parsed.attempts.length +
    (parsed.conceptLackCount !== undefined ? 1 : 0) +
    (parsed.calculationErrorCount !== undefined ? 1 : 0) +
    (parsed.applicationLackCount !== undefined ? 1 : 0) +
    (parsed.teacherFeedback ? 1 : 0)
  return {
    drafts: next,
    summary: toSummary(appliedCount, [], parsed.needsReview),
  }
}

function patchStudentDailyTestDraft<T extends {
  rounds: Array<{ round: 1 | 2 | 3 | 4; score: string; passed: boolean }>
  learningDiagnosis: DailyLearningDiagnosisData
}>(
  current: T,
  parsed: {
    attempts: Array<{ round: 1 | 2 | 3 | 4; score: string }>
    conceptLackCount?: number
    calculationErrorCount?: number
    applicationLackCount?: number
    teacherFeedback?: string
  },
): T {
  let rounds = current.rounds
  for (const attempt of parsed.attempts) {
    rounds = updateBulkScoreDraft(rounds, attempt.round, attempt.score)
  }
  const diagnosis = { ...current.learningDiagnosis }
  if (parsed.conceptLackCount !== undefined) {
    diagnosis.conceptLackCount = parsed.conceptLackCount
  }
  if (parsed.calculationErrorCount !== undefined) {
    diagnosis.calculationErrorCount = parsed.calculationErrorCount
  }
  if (parsed.applicationLackCount !== undefined) {
    diagnosis.applicationLackCount = parsed.applicationLackCount
  }
  if (parsed.teacherFeedback) {
    diagnosis.teacherFeedback = parsed.teacherFeedback
  }
  return { ...current, rounds, learningDiagnosis: diagnosis }
}

export { formatVoiceSummary }
