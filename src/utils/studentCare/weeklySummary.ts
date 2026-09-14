import type {
  AttendanceRecord,
  ClassAttitudeIssue,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
  WeeklyLearningSummaryRecord,
  WeeklySummaryAreaSnapshot,
  WeeklySummaryGrade,
  WeeklySummaryScoresSnapshot,
} from '../../types/records.ts'
import { createId } from '../id.ts'
import {
  ATTENDANCE_WEEKLY_MAX,
  ATTITUDE_WEEKLY_MAX,
  DAILY_TEST_WEEKLY_MAX,
  HOMEWORK_WEEKLY_MAX,
  MATERIAL_WEEKLY_MAX,
  WEEKLY_SUMMARY_TOTAL_MAX,
  roundScore,
  weeklyGradeFromScore,
} from './constants.ts'
import { collectEvaluableLessonDates, type StudentCareLessonInput } from './lessons.ts'
import {
  attendanceIndex,
  attendanceMeaning,
  attitudeLessonIndex,
  averageIndex,
  dailyTestDayScore,
  dailyTestPassed,
  homeworkDayCategory,
  homeworkDayIndex,
  materialPrepIndex,
  scaleIndex,
  weeklyTestIndex,
} from './scoring.ts'
import { formatPeriodLabel, getFridayOfWeek, getMondayOfWeek, listDatesInclusive } from './week.ts'

export type WeeklySummaryBuildInput = StudentCareLessonInput & {
  weekStart: string
  asOfIso: string
  asOfDate: string
  existingId?: string
  createdAt?: string
}

function areaFromIndex(
  index: number | null,
  max: number,
  facts: WeeklySummaryAreaSnapshot['facts'],
): WeeklySummaryAreaSnapshot {
  const score = scaleIndex(index, max)
  return {
    score,
    max,
    index: index == null ? null : roundScore(index),
    grade: weeklyGradeFromScore(index),
    facts,
  }
}

function homeworkStatusesForDate(input: StudentCareLessonInput, date: string) {
  const slots = input.homeworkTextbookEntries.filter(
    (entry) => entry.studentId === input.studentId && entry.date === date,
  )
  if (slots.length > 0) return slots.map((entry) => entry.status)
  return input.homework
    .filter((record) => record.studentId === input.studentId && record.date === date)
    .map((record) => record.status)
}

export function buildWeeklyLearningSummary(
  input: WeeklySummaryBuildInput,
): WeeklyLearningSummaryRecord {
  const weekStart = getMondayOfWeek(input.weekStart)
  const friday = getFridayOfWeek(weekStart)
  const periodCap = input.asOfDate < friday ? input.asOfDate : friday
  const candidateDates = listDatesInclusive(weekStart, periodCap).filter(
    (date) => date <= input.asOfDate,
  )
  const lessonDates = collectEvaluableLessonDates(input, input.asOfDate).filter((date) =>
    candidateDates.includes(date),
  )

  const attendanceFacts = {
    present: 0,
    excusedLate: 0,
    unexcusedLate: 0,
    excusedAbsent: 0,
    unexcusedAbsent: 0,
    earlyLeave: 0,
    legacyLate: 0,
    legacyAbsent: 0,
  }
  const attendanceIndexes: number[] = []
  for (const date of lessonDates) {
    const record = input.attendance.find(
      (item) => item.studentId === input.studentId && item.date === date,
    )
    if (!record) continue
    const index = attendanceIndex(record)
    if (index == null) continue
    attendanceIndexes.push(index)
    const meaning = attendanceMeaning(record.status, record.excuseKind)
    if (meaning === '출석') attendanceFacts.present += 1
    else if (meaning === '인정 지각') attendanceFacts.excusedLate += 1
    else if (meaning === '무단 지각') attendanceFacts.unexcusedLate += 1
    else if (meaning === '인정 결석') attendanceFacts.excusedAbsent += 1
    else if (meaning === '무단 결석') attendanceFacts.unexcusedAbsent += 1
    else if (meaning === '조퇴') attendanceFacts.earlyLeave += 1
    else if (meaning === '지각') attendanceFacts.legacyLate += 1
    else if (meaning === '결석') attendanceFacts.legacyAbsent += 1
  }

  const materialFacts = { brought: 0, partial: 0 }
  const materialIndexes: number[] = []
  for (const date of lessonDates) {
    const care = input.dailyCare.find(
      (item) => item.studentId === input.studentId && item.date === date,
    )
    const index = materialPrepIndex(care?.materialPrep)
    if (index == null) continue
    materialIndexes.push(index)
    if (care?.materialPrep === '지참') materialFacts.brought += 1
    if (care?.materialPrep === '부분 지참') materialFacts.partial += 1
  }

  const homeworkFacts = { complete: 0, partial: 0, incomplete: 0 }
  const homeworkIndexes: number[] = []
  for (const date of lessonDates) {
    const statuses = homeworkStatusesForDate(input, date)
    const index = homeworkDayIndex(statuses)
    if (index == null) continue
    homeworkIndexes.push(index)
    const category = homeworkDayCategory(statuses)
    if (category === 'complete') homeworkFacts.complete += 1
    if (category === 'partial') homeworkFacts.partial += 1
    if (category === 'incomplete') homeworkFacts.incomplete += 1
  }

  const testScores: number[] = []
  let testPassCount = 0
  for (const date of lessonDates) {
    const tests = input.dailyTests.filter(
      (item) => item.studentId === input.studentId && item.date === date,
    )
    const score = dailyTestDayScore(tests)
    if (score == null) continue
    testScores.push(score)
    if (dailyTestPassed(score)) testPassCount += 1
  }
  const testAverage =
    testScores.length === 0
      ? null
      : roundScore(testScores.reduce((sum, score) => sum + score, 0) / testScores.length)
  const testIndex = weeklyTestIndex(testScores)

  const attitudeIssueCounts: Record<ClassAttitudeIssue, number> = {
    '집중 저하': 0,
    졸음: 0,
    잡담: 0,
    수업방해: 0,
    '태도 불량': 0,
  }
  const attitudeIndexes: number[] = []
  const attitudeNotes: string[] = []
  for (const date of lessonDates) {
    const care = input.dailyCare.find(
      (item) => item.studentId === input.studentId && item.date === date,
    )
    const issues = care?.attitudeIssues ?? []
    attitudeIndexes.push(attitudeLessonIndex(issues))
    for (const issue of issues) attitudeIssueCounts[issue] += 1
    const note = care?.attitudeNote.trim()
    if (note) attitudeNotes.push(note)
  }

  const classNotes = (input.classNotes ?? [])
    .filter(
      (record) =>
        record.studentId === input.studentId &&
        lessonDates.includes(record.date) &&
        record.hasClassNote &&
        record.note.trim(),
    )
    .map((record) => record.note.trim())

  const attendance = areaFromIndex(
    averageIndex(attendanceIndexes),
    ATTENDANCE_WEEKLY_MAX,
    {
      presentCount: attendanceFacts.present,
      unexcusedLateCount: attendanceFacts.unexcusedLate,
      unexcusedAbsentCount: attendanceFacts.unexcusedAbsent,
      excusedLateCount: attendanceFacts.excusedLate,
      excusedAbsentCount: attendanceFacts.excusedAbsent,
      lessonCount: attendanceIndexes.length,
    },
  )
  const material = areaFromIndex(averageIndex(materialIndexes), MATERIAL_WEEKLY_MAX, {
    broughtCount: materialFacts.brought,
    partialCount: materialFacts.partial,
    lessonCount: materialIndexes.length,
  })
  const homework = areaFromIndex(averageIndex(homeworkIndexes), HOMEWORK_WEEKLY_MAX, {
    completeCount: homeworkFacts.complete,
    partialCount: homeworkFacts.partial,
    incompleteCount: homeworkFacts.incomplete,
    lessonCount: homeworkIndexes.length,
  })
  const dailyTest = areaFromIndex(testIndex, DAILY_TEST_WEEKLY_MAX, {
    averageScore: testAverage,
    passCount: testPassCount,
    attemptCount: testScores.length,
  })
  const issueTotal = Object.values(attitudeIssueCounts).reduce((sum, count) => sum + count, 0)
  const attitude = areaFromIndex(averageIndex(attitudeIndexes), ATTITUDE_WEEKLY_MAX, {
    issueCount: issueTotal,
    ...attitudeIssueCounts,
    lessonCount: attitudeIndexes.length,
  })

  const scores: WeeklySummaryScoresSnapshot = {
    attendance,
    material,
    homework,
    dailyTest,
    attitude,
  }

  const scored = [attendance, material, homework, dailyTest, attitude].filter(
    (area) => area.score != null,
  )
  const computedTotal =
    scored.length === 0
      ? null
      : roundScore(scored.reduce((sum, area) => sum + (area.score ?? 0), 0))
  const availableMax = scored.reduce((sum, area) => sum + area.max, 0)
  const gradeScore =
    computedTotal == null || availableMax <= 0
      ? null
      : availableMax === WEEKLY_SUMMARY_TOTAL_MAX
        ? computedTotal
        : rescalePartialTotal(computedTotal, availableMax)
  const grade = weeklyGradeFromScore(gradeScore)

  const periodStart = lessonDates[0] ?? weekStart
  const periodEnd = lessonDates[lessonDates.length - 1] ?? friday
  const nowIso = input.asOfIso

  return {
    id: input.existingId ?? createId(),
    studentId: input.studentId,
    weekStart,
    periodStart,
    periodEnd,
    asOf: nowIso,
    totalScore: computedTotal,
    grade,
    scores,
    goodText: buildGoodText({
      attendanceFacts,
      materialFacts,
      homeworkFacts,
      testAverage,
      testPassCount,
      testAttempts: testScores.length,
      issueTotal,
    }),
    checkText: buildCheckText({
      attendanceFacts,
      materialFacts,
      homeworkFacts,
      testAverage,
      testPassCount,
      testAttempts: testScores.length,
      attitudeIssueCounts,
      issueTotal,
    }),
    teacherComment: buildTeacherComment([...attitudeNotes, ...classNotes]),
    createdAt: input.createdAt ?? nowIso,
    updatedAt: nowIso,
  }
}

function rescalePartialTotal(earned: number, available: number): number | null {
  if (available <= 0) return null
  return roundScore((earned / available) * WEEKLY_SUMMARY_TOTAL_MAX)
}

function buildGoodText(input: {
  attendanceFacts: { present: number; excusedLate: number; excusedAbsent: number }
  materialFacts: { brought: number }
  homeworkFacts: { complete: number }
  testAverage: number | null
  testPassCount: number
  testAttempts: number
  issueTotal: number
}): string {
  const parts: string[] = []
  if (input.attendanceFacts.present > 0) {
    parts.push(`출석 ${input.attendanceFacts.present}회`)
  }
  if (input.materialFacts.brought > 0) {
    parts.push(`교재 지참 ${input.materialFacts.brought}회`)
  }
  if (input.homeworkFacts.complete > 0) {
    parts.push(`숙제 완료 ${input.homeworkFacts.complete}회`)
  }
  if (input.testPassCount > 0) {
    parts.push(`일일테스트 합격 ${input.testPassCount}/${input.testAttempts}회`)
  }
  if (input.issueTotal === 0 && input.testAttempts + input.homeworkFacts.complete + input.attendanceFacts.present > 0) {
    parts.push('수업태도 문제 기록 없음')
  }
  return parts.length > 0 ? parts.join(', ') : '이번 주 기록된 학습 사실이 아직 충분하지 않습니다.'
}

function buildCheckText(input: {
  attendanceFacts: { unexcusedLate: number; unexcusedAbsent: number }
  materialFacts: { partial: number }
  homeworkFacts: { partial: number; incomplete: number }
  testAverage: number | null
  testPassCount: number
  testAttempts: number
  attitudeIssueCounts: Record<ClassAttitudeIssue, number>
  issueTotal: number
}): string {
  const parts: string[] = []
  if (input.attendanceFacts.unexcusedLate > 0) {
    parts.push(`무단지각 ${input.attendanceFacts.unexcusedLate}회`)
  }
  if (input.attendanceFacts.unexcusedAbsent > 0) {
    parts.push(`무단결석 ${input.attendanceFacts.unexcusedAbsent}회`)
  }
  if (input.materialFacts.partial > 0) {
    parts.push(`교재 부분지참 ${input.materialFacts.partial}회`)
  }
  if (input.homeworkFacts.partial > 0) {
    parts.push(`숙제 부분완료 ${input.homeworkFacts.partial}회`)
  }
  if (input.homeworkFacts.incomplete > 0) {
    parts.push(`숙제 미완료 ${input.homeworkFacts.incomplete}회`)
  }
  if (input.testAttempts > 0 && input.testPassCount < input.testAttempts) {
    parts.push(`일일테스트 합격 ${input.testPassCount}/${input.testAttempts}회`)
  }
  for (const [issue, count] of Object.entries(input.attitudeIssueCounts) as Array<
    [ClassAttitudeIssue, number]
  >) {
    if (count > 0) parts.push(`${issue} ${count}회`)
  }
  return parts.length > 0 ? parts.join(', ') : '이번 주 따로 확인할 기록은 없습니다.'
}

function buildTeacherComment(notes: string[]): string {
  const unique = [...new Set(notes.map((note) => note.trim()).filter(Boolean))]
  if (unique.length === 0) return '이번 주 저장된 강사 메모는 없습니다.'
  return unique.join(' / ')
}

export function weeklySummaryPeriodLabel(summary: Pick<WeeklyLearningSummaryRecord, 'periodStart' | 'periodEnd'>): string {
  return formatPeriodLabel(summary.periodStart, summary.periodEnd)
}

export type {
  AttendanceRecord,
  ClassNoteRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
  WeeklySummaryGrade,
}
