import type {
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  ProgressRecord,
  StudentDailyCareRecord,
} from '../../types/records.ts'
import { usesCumulativeEnglishVocabTest } from '../englishVocabTest.ts'
import { classifyHomeworkStatus } from '../homework.ts'
import { dailyTestRecordScore } from './scoring.ts'

export type StudentCareLessonInput = {
  studentId: string
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  dailyTests: DailyTestRecord[]
  dailyCare: StudentDailyCareRecord[]
  progressRecords?: ProgressRecord[]
  classNotes?: ClassNoteRecord[]
}

function hasHomeworkStatus(input: StudentCareLessonInput, date: string): boolean {
  const slots = input.homeworkTextbookEntries.filter(
    (entry) => entry.studentId === input.studentId && entry.date === date,
  )
  if (slots.some((entry) => classifyHomeworkStatus(entry.status) !== 'none')) return true
  return input.homework.some(
    (record) =>
      record.studentId === input.studentId &&
      record.date === date &&
      classifyHomeworkStatus(record.status) !== 'none',
  )
}

export function isEvaluableLessonDate(
  input: StudentCareLessonInput,
  date: string,
): boolean {
  const studentId = input.studentId
  if (input.attendance.some((record) => record.studentId === studentId && record.date === date)) {
    return true
  }
  if (hasHomeworkStatus(input, date)) return true
  if (
    input.dailyTests.some(
      (record) =>
        record.studentId === studentId &&
        record.date === date &&
        (dailyTestRecordScore(record) != null || usesCumulativeEnglishVocabTest(record)),
    )
  ) {
    return true
  }
  const care = input.dailyCare.find(
    (record) => record.studentId === studentId && record.date === date,
  )
  if (care && (care.materialPrep != null || care.attitudeIssues.length > 0 || care.attitudeNote.trim())) {
    return true
  }
  if (
    input.progressRecords?.some(
      (record) => record.studentId === studentId && record.lastStudyDate === date,
    )
  ) {
    return true
  }
  if (input.classNotes?.some((record) => record.studentId === studentId && record.date === date)) {
    return true
  }
  return false
}

/** Oldest → newest dates that actually have stored lesson data, excluding future dates. */
export function collectEvaluableLessonDates(
  input: StudentCareLessonInput,
  asOfDate?: string,
): string[] {
  const dates = new Set<string>()
  const add = (date: string | undefined) => {
    if (!date) return
    if (asOfDate && date > asOfDate) return
    dates.add(date)
  }

  for (const record of input.attendance) {
    if (record.studentId === input.studentId) add(record.date)
  }
  for (const record of input.homework) {
    if (record.studentId === input.studentId) add(record.date)
  }
  for (const record of input.homeworkTextbookEntries) {
    if (record.studentId === input.studentId) add(record.date)
  }
  for (const record of input.dailyTests) {
    if (record.studentId === input.studentId) add(record.date)
  }
  for (const record of input.dailyCare) {
    if (record.studentId === input.studentId) add(record.date)
  }
  for (const record of input.progressRecords ?? []) {
    if (record.studentId === input.studentId) add(record.lastStudyDate)
  }
  for (const record of input.classNotes ?? []) {
    if (record.studentId === input.studentId) add(record.date)
  }

  return [...dates]
    .filter((date) => isEvaluableLessonDate(input, date))
    .sort((a, b) => a.localeCompare(b))
}
