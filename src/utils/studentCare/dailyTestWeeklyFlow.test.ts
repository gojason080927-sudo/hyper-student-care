/**
 * 실행: npx tsx src/utils/studentCare/dailyTestWeeklyFlow.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord, TestSessionResult } from '../../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { applyHighRecoveryToDiagnosis } from '../mathHighRecovery.ts'
import { applyFixedWrongFormatToDiagnosis } from '../mathDailyTest.ts'
import {
  buildDailyTestWeeklyFlow,
  buildWeeklyFlowDaySessions,
  buildWeeklyWrongAnalysis,
  highRecoveryWeeklyFlowSessions,
} from './dailyTestWeeklyFlow.ts'
import { ATTENDANCE_WEEKLY_MAX, DAILY_TEST_WEEKLY_MAX, WEEKLY_SUMMARY_TOTAL_MAX } from './constants.ts'

function session(
  n: 1 | 2 | 3 | 4,
  status: TestSessionResult['status'],
  score?: number,
): TestSessionResult {
  return score == null ? { session: n, status } : { session: n, status, score, totalScore: 100 }
}

function testRecord(
  date: string,
  subject: string,
  sessionResults: TestSessionResult[],
  updatedAt = '2026-09-12T00:00:00.000Z',
  diagnosis: Partial<typeof EMPTY_DAILY_LEARNING_DIAGNOSIS> = {},
): DailyTestRecord {
  return {
    id: `${date}-${subject}-${updatedAt}`,
    studentId: 'stu-1',
    date,
    testName: '일일테스트',
    subject,
    score: sessionResults.find((item) => item.score != null)?.score ?? 0,
    totalScore: 100,
    percentage: sessionResults.find((item) => item.score != null)?.score ?? 0,
    incorrectCount: 0,
    memo: '',
    sessionResults,
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS, ...diagnosis },
    createdAt: updatedAt,
    updatedAt,
  }
}

const fridayPass2 = testRecord('2026-09-11', '수학', [
  session(1, '불합격', 78),
  session(2, '합격', 85),
  session(3, '미응시'),
  session(4, '미응시'),
])

const mondayPass1 = testRecord('2026-09-07', '수학', [
  session(1, '합격', 92),
  session(2, '미응시'),
  session(3, '미응시'),
  session(4, '미응시'),
])

const wednesdayPass3 = testRecord('2026-09-09', '수학', [
  session(1, '불합격', 70),
  session(2, '불합격', 80),
  session(3, '합격', 88),
  session(4, '미응시'),
])

const fridaySessions = buildWeeklyFlowDaySessions(fridayPass2)
assert.equal(fridaySessions[0]?.kind, 'score')
assert.equal(fridaySessions[0]?.score, 78)
assert.equal(fridaySessions[0]?.passed, false)
assert.equal(fridaySessions[1]?.kind, 'score')
assert.equal(fridaySessions[1]?.score, 85)
assert.equal(fridaySessions[1]?.passed, true)
assert.equal(fridaySessions[2]?.kind, 'absent')
assert.equal(fridaySessions[2]?.score, null)
assert.equal(fridaySessions[3]?.kind, 'absent')
assert.equal(fridaySessions[3]?.score, null)

const mondaySessions = buildWeeklyFlowDaySessions(mondayPass1)
assert.equal(mondaySessions[0]?.passed, true)
assert.equal(mondaySessions[0]?.score, 92)
assert.deepEqual(
  mondaySessions.slice(1).map((item) => item.kind),
  ['absent', 'absent', 'absent'],
)

const wednesdaySessions = buildWeeklyFlowDaySessions(wednesdayPass3)
assert.deepEqual(
  wednesdaySessions.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 70, false],
    ['score', 80, false],
    ['score', 88, true],
    ['absent', null, false],
  ],
)

const emptyDay = buildWeeklyFlowDaySessions(null)
assert.equal(emptyDay.every((item) => item.kind === 'absent' && item.score == null), true)

const flow = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [mondayPass1, wednesdayPass3, fridayPass2],
})
assert.equal(flow.weekStart, '2026-09-07')
assert.equal(flow.periodEnd, '2026-09-11')
assert.deepEqual(flow.subjects, ['수학'])
assert.equal(flow.selectedSubject, '수학')
assert.equal(flow.max, 92)
assert.equal(flow.min, 70)
assert.equal(flow.avg, 82.2)
assert.equal(flow.attemptedScores.includes(0), false)

const otherStudent = buildDailyTestWeeklyFlow({
  studentId: 'stu-2',
  weekStart: '2026-09-07',
  dailyTests: [mondayPass1],
})
assert.equal(otherStudent.selectedSubject, null)
assert.equal(otherStudent.attemptedScores.length, 0)
assert.equal(otherStudent.days.every((day) => day.sessions.every((item) => item.kind === 'absent')), true)

const englishFriday = testRecord('2026-09-11', '영어', [
  session(1, '합격', 95),
  session(2, '미응시'),
  session(3, '미응시'),
  session(4, '미응시'),
])
const multi = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [fridayPass2, englishFriday],
})
assert.deepEqual(multi.subjects, ['수학', '영어'])
assert.equal(multi.selectedSubject, '수학')
const englishOnly = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [fridayPass2, englishFriday],
  subject: '영어',
})
assert.equal(englishOnly.selectedSubject, '영어')
assert.equal(englishOnly.max, 95)
assert.equal(englishOnly.min, 95)
assert.equal(englishOnly.days[2]?.sessions[0]?.score, 95)
assert.equal(englishOnly.days[2]?.sessions[1]?.kind, 'absent')
assert.deepEqual(englishOnly.cumulativeResults, [])

const cumulativeEnglish = testRecord(
  '2026-09-09',
  '영어',
  [session(1, '미응시'), session(2, '미응시'), session(3, '미응시'), session(4, '미응시')],
  '2026-09-12T00:00:00.000Z',
  {
    englishVocabTestFormat: 'cumulative',
    englishVocabTotalWords: 300,
    englishVocabWrongWords: 6,
  },
)
const cumulativeFlow = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [cumulativeEnglish],
  subject: '영어',
})
assert.equal(cumulativeFlow.cumulativeResults[0]?.label, '300단어 중 6개 틀림')
assert.deepEqual(cumulativeFlow.highRecoveryResults, [])
assert.equal(cumulativeFlow.max, null)
assert.equal(
  cumulativeFlow.days.every((day) => day.sessions.every((item) => item.kind === 'absent')),
  true,
)

function highRecord(
  date: string,
  firstWrong: number,
  endSession: 1 | 2 | 3 | 4,
  session3Questions: number | null = null,
  session4Questions: number | null = null,
): DailyTestRecord {
  return testRecord(
    date,
    '수학',
    [session(1, '미응시'), session(2, '미응시'), session(3, '미응시'), session(4, '미응시')],
    `${date}T00:00:00.000Z`,
    applyHighRecoveryToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS, {
      firstWrong,
      endSession,
      session3Questions,
      session4Questions,
    }),
  )
}

const highEnd2 = highRecord('2026-09-07', 4, 2)
const highEnd3 = highRecord('2026-09-09', 4, 3, 6)
const highEnd4 = highRecord('2026-09-11', 4, 4, 6, 5)

assert.deepEqual(
  highRecoveryWeeklyFlowSessions(highEnd2)?.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 100, true],
    ['absent', null, false],
    ['absent', null, false],
  ],
)
assert.deepEqual(
  highRecoveryWeeklyFlowSessions(highEnd3)?.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 50, false],
    ['score', 100, true],
    ['absent', null, false],
  ],
)
assert.deepEqual(
  highRecoveryWeeklyFlowSessions(highEnd4)?.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 50, false],
    ['score', 83, false],
    ['score', 100, true],
  ],
)
assert.equal(highEnd2.sessionResults.every((item) => item.status === '미응시'), true)
assert.equal(highEnd4.sessionResults.every((item) => item.status === '미응시'), true)

const highFlow = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [highEnd2, highEnd3, highEnd4],
  subject: '수학',
})
assert.equal(
  highFlow.highRecoveryResults[2]?.label,
  '발견 오답 4개 · 추적 15문제 · 회수 완료 4개 · 회수율 100%',
)
assert.equal(highFlow.recoveryResults.length, 3)
assert.equal(highFlow.recoveryResults[0]?.facts.discoveredWrong, 4)
assert.equal(highFlow.recoveryResults[0]?.facts.retakeQuestionCount, 4)
assert.equal(highFlow.recoveryResults[1]?.facts.retakeQuestionCount, 10)
assert.equal(highFlow.recoveryResults[2]?.facts.retakeQuestionCount, 15)
assert.equal(highFlow.recoveryResults.every((item) => item.facts.unrecoveredWrong === 0), true)
assert.equal(highFlow.recoveryResults.every((item) => item.facts.recoveryRate === 100), true)
assert.deepEqual(
  highFlow.days[0]?.sessions.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 100, true],
    ['absent', null, false],
    ['absent', null, false],
  ],
)
assert.deepEqual(
  highFlow.days[1]?.sessions.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 50, false],
    ['score', 100, true],
    ['absent', null, false],
  ],
)
assert.deepEqual(
  highFlow.days[2]?.sessions.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 60, false],
    ['score', 50, false],
    ['score', 83, false],
    ['score', 100, true],
  ],
)
assert.equal(highFlow.max, 100)
assert.equal(highFlow.min, 50)

const middleRecovered = testRecord(
  '2026-09-07',
  '수학',
  [
    { session: 1, status: '불합격', score: 70, totalScore: 100, incorrectCount: 3 },
    { session: 2, status: '합격', score: 80, totalScore: 100, incorrectCount: 1 },
    session(3, '미응시'),
    session(4, '미응시'),
  ],
  '2026-09-07T00:00:00.000Z',
  applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
)
const middleOpen = testRecord(
  '2026-09-09',
  '수학',
  [
    { session: 1, status: '불합격', score: 70, totalScore: 100, incorrectCount: 3 },
    session(2, '미응시'),
    session(3, '미응시'),
    session(4, '미응시'),
  ],
  '2026-09-09T00:00:00.000Z',
  applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
)
const middleFlow = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [middleRecovered, middleOpen],
  subject: '수학',
})
assert.deepEqual(
  middleFlow.days[0]?.sessions.map((item) => [item.kind, item.score, item.passed]),
  [
    ['score', 70, false],
    ['score', 80, true],
    ['absent', null, false],
    ['absent', null, false],
  ],
)
assert.equal(middleFlow.recoveryResults[0]?.facts.discoveredWrong, 3)
assert.equal(middleFlow.recoveryResults[0]?.facts.retakeQuestionCount, 5)
assert.equal(middleFlow.recoveryResults[0]?.facts.recoveredWrong, 3)
assert.equal(middleFlow.recoveryResults[0]?.facts.unrecoveredWrong, 0)
assert.equal(middleFlow.recoveryResults[0]?.facts.recoveryRate, 100)
assert.equal(middleFlow.recoveryResults[1]?.facts.recoveredWrong, 0)
assert.equal(middleFlow.recoveryResults[1]?.facts.unrecoveredWrong, 3)
assert.equal(middleFlow.recoveryResults[1]?.facts.recoveryRate, 0)
assert.match(middleFlow.recoveryResults[1]?.label ?? '', /미회수 3개/)
assert.equal(middleFlow.wrongTypeTotal, 0)

const newer = testRecord(
  '2026-09-11',
  '수학',
  [session(1, '합격', 99), session(2, '미응시'), session(3, '미응시'), session(4, '미응시')],
  '2026-09-12T12:00:00.000Z',
)
const pickedLatest = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [fridayPass2, newer],
})
assert.equal(pickedLatest.days[2]?.sessions[0]?.score, 99)
assert.equal(pickedLatest.days[2]?.sessions[1]?.kind, 'absent')

const tuesdayIgnored = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [testRecord('2026-09-08', '수학', [session(1, '합격', 40)])],
})
assert.equal(tuesdayIgnored.attemptedScores.length, 0)

const noZeroForMissingScore = buildWeeklyFlowDaySessions(
  testRecord('2026-09-11', '수학', [
    session(1, '불합격'),
    session(2, '합격', 90),
    session(3, '미응시'),
    session(4, '미응시'),
  ]),
)
assert.equal(noZeroForMissingScore[0]?.kind, 'absent')
assert.equal(noZeroForMissingScore[0]?.score, null)
assert.equal(noZeroForMissingScore[1]?.score, 90)

const mondayWrong = testRecord('2026-09-07', '수학', [session(1, '합격', 90)], '2026-09-07T00:00:00.000Z', {
  calculationErrorCount: 2,
  conceptLackCount: 1,
})
const wednesdayWrong = testRecord('2026-09-09', '수학', [session(1, '합격', 80)], '2026-09-09T00:00:00.000Z', {
  calculationErrorCount: 1,
  applicationLackCount: 2,
})
const fridayWrong = testRecord('2026-09-11', '수학', [session(1, '합격', 88)], '2026-09-11T00:00:00.000Z', {
  comprehensionLackCount: 1,
})
const tuesdayWrong = testRecord('2026-09-08', '수학', [session(1, '합격', 70)], '2026-09-08T00:00:00.000Z', {
  conceptLackCount: 4,
})
const weeklyWrong = buildWeeklyWrongAnalysis({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [mondayWrong, wednesdayWrong, fridayWrong, tuesdayWrong],
})
assert.equal(weeklyWrong.calculationError, 3)
assert.equal(weeklyWrong.conceptLack, 5)
assert.equal(weeklyWrong.applicationLack, 2)
assert.equal(weeklyWrong.comprehensionLack, 1)

const stale = testRecord('2026-09-07', '수학', [session(1, '합격', 50)], '2026-09-07T00:00:00.000Z', {
  calculationErrorCount: 9,
})
const latest = testRecord('2026-09-07', '수학', [session(1, '합격', 50)], '2026-09-07T12:00:00.000Z', {
  calculationErrorCount: 1,
})
const latestWins = buildWeeklyWrongAnalysis({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [stale, latest],
})
assert.equal(latestWins.calculationError, 1)

const legacyItems = testRecord('2026-09-07', '수학', [session(1, '합격', 70)], '2026-09-07T00:00:00.000Z', {
  wrongAnswerItems: [
    { id: 'a', label: '1', cause: '문제 이해 부족' },
    { id: 'b', label: '2', cause: '계산 실수' },
  ],
})
const legacyCounts = buildWeeklyWrongAnalysis({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [legacyItems],
})
assert.equal(legacyCounts.applicationLack, 1)
assert.equal(legacyCounts.calculationError, 1)
assert.equal(legacyCounts.comprehensionLack, 0)

const otherStudentIgnored = buildWeeklyWrongAnalysis({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [{ ...mondayWrong, studentId: 'stu-2' }],
})
assert.equal(otherStudentIgnored.calculationError, 0)
assert.equal(otherStudentIgnored.conceptLack, 0)

const flowWithWrong = buildDailyTestWeeklyFlow({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  dailyTests: [mondayWrong, wednesdayWrong, fridayWrong],
})
assert.equal(flowWithWrong.wrongTypeTotal, 7)
assert.equal(flowWithWrong.max, 90)
assert.equal(flowWithWrong.min, 80)

const scoring = readFileSync('src/utils/studentCare/constants.ts', 'utf8')
assert.match(scoring, /ATTENDANCE_WEEKLY_MAX = 20/)
assert.match(scoring, /MATERIAL_WEEKLY_MAX = 10/)
assert.match(scoring, /HOMEWORK_WEEKLY_MAX = 25/)
assert.match(scoring, /DAILY_TEST_WEEKLY_MAX = 30/)
assert.match(scoring, /ATTITUDE_WEEKLY_MAX = 15/)
assert.match(scoring, /WEEKLY_SUMMARY_TOTAL_MAX = 100/)
assert.equal(ATTENDANCE_WEEKLY_MAX + 10 + 25 + DAILY_TEST_WEEKLY_MAX + 15, WEEKLY_SUMMARY_TOTAL_MAX)

const sql = readFileSync('supabase/student-hub-followup-v1-migration.sql', 'utf8')
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\._build_weekly_learning_summary/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sql, /^\s*TRUNCATE/im)
assert.doesNotMatch(sql, /^\s*DROP TABLE/im)

const card = readFileSync('src/components/studentCare/DailyTestWeeklyFlowCard.tsx', 'utf8')
const parentWeekly = readFileSync('src/pages/parent/ParentStudentWeeklySummaryPage.tsx', 'utf8')
assert.match(card, /recoveryResults/)
assert.match(card, /오답 회수/)
assert.doesNotMatch(card, /고등 오답 회수/)
assert.match(card, /주간 오답 현황/)
assert.match(card, /주간 최고/)
assert.match(card, /주간 최저/)
assert.match(card, /주간 평균/)
assert.match(card, /WEEKLY_GRADE_CLASS/)
assert.match(card, /const height = 128/)
assert.match(card, /const padB = 23/)
assert.match(card, /\[50, 100\]/)
assert.match(card, /scoreToPlotY/)
assert.doesNotMatch(card, /\[0, 50, 100\]/)
assert.doesNotMatch(card, /tick > 0/)
assert.doesNotMatch(card, /border-t/)
assert.doesNotMatch(card, /fill="#cbd5e1"/)
assert.doesNotMatch(card, /월요일/)
assert.doesNotMatch(card, /수요일/)
assert.doesNotMatch(card, /금요일/)
assert.match(
  parentWeekly,
  /const AREA_ORDER: WeeklySummaryAreaKey\[] = \[\s*'attendance',\s*'material',\s*'homework',\s*'attitude',\s*\]/,
)
assert.doesNotMatch(parentWeekly, /AREA_ORDER: WeeklySummaryAreaKey\[] = \[[^\]]*dailyTest/)
assert.match(parentWeekly, /DailyTestWeeklyFlowCard/)
assert.match(parentWeekly, /grade=\{summary\.scores\.dailyTest\.grade\}/)
assert.match(readFileSync('src/hub/HubWeeklyPage.tsx', 'utf8'), /WeeklySummaryDetail/)

const weeklySummary = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
assert.doesNotMatch(weeklySummary, /comprehensionLackCount/)
assert.doesNotMatch(weeklySummary, /주간 오답 현황/)
assert.doesNotMatch(
  readFileSync('supabase/weekly-student-care-migration.sql', 'utf8'),
  /comprehensionLackCount/,
)

const fields = readFileSync('src/components/diagnosis/DailyLearningDiagnosisFields.tsx', 'utf8')
assert.match(fields, /문제 이해 부족/)
assert.match(fields, /응용 능력 부족/)
assert.match(fields, /comprehensionLackCount/)

console.log('dailyTestWeeklyFlow.test.ts passed')
