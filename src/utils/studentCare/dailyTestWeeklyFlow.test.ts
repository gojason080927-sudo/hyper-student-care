/**
 * 실행: npx tsx src/utils/studentCare/dailyTestWeeklyFlow.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord, TestSessionResult } from '../../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import {
  buildDailyTestWeeklyFlow,
  buildWeeklyFlowDaySessions,
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
): DailyTestRecord {
  return {
    id: `${date}-${subject}`,
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
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
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

console.log('dailyTestWeeklyFlow.test.ts passed')
