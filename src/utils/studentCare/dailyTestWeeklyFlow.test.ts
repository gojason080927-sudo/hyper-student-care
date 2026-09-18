/**
 * 실행: node --experimental-strip-types src/utils/studentCare/dailyTestWeeklyFlow.test.ts
 */
import assert from 'node:assert/strict'
import type { DailyTestRecord, TestSessionResult } from '../../types/records.ts'
import { buildDailyTestWeeklyFlow, pickDailyTestForDate } from './dailyTestWeeklyFlow.ts'
import { ATTENDANCE_WEEKLY_MAX, DAILY_TEST_WEEKLY_MAX, HOMEWORK_WEEKLY_MAX, MATERIAL_WEEKLY_MAX, ATTITUDE_WEEKLY_MAX, WEEKLY_SUMMARY_TOTAL_MAX } from './constants.ts'

function test(
  date: string,
  sessions: TestSessionResult[],
  patch: Partial<DailyTestRecord> = {},
): DailyTestRecord {
  return {
    id: patch.id ?? `t-${date}`,
    studentId: 'stu-1',
    date,
    testName: '일일테스트',
    subject: patch.subject ?? '수학',
    score: 0,
    totalScore: 100,
    percentage: 0,
    incorrectCount: 0,
    memo: '',
    sessionResults: sessions,
    learningDiagnosis: {
      wrongAnswerItems: [],
      questionTotal: 0,
      conceptLackCount: 0,
      calculationErrorCount: 0,
      applicationLackCount: 0,
      teacherFeedback: '',
      fridayRetestTotal: null,
      fridayRetestWrong: null,
      englishVocabResult: null,
      englishGrammarWrongCount: null,
      englishReadingWrongCount: null,
      englishListeningScore: null,
      englishListeningResult: null,
    },
    createdAt: patch.createdAt ?? '2026-09-01T00:00:00.000Z',
    updatedAt: patch.updatedAt ?? '2026-09-01T00:00:00.000Z',
  }
}

function session(
  n: 1 | 2 | 3 | 4,
  status: TestSessionResult['status'],
  score?: number,
): TestSessionResult {
  if (status === '미응시') return { session: n, status }
  return { session: n, status, score, totalScore: 100, incorrectCount: 0 }
}

// Friday pass on 2nd session — later sessions stay unattempted, no zero scores
const fridayPass = buildDailyTestWeeklyFlow(
  [
    test('2026-09-11', [
      session(1, '불합격', 78),
      session(2, '합격', 85),
      session(3, '미응시'),
      session(4, '미응시'),
    ]),
  ],
  'stu-1',
  '2026-09-07',
)
const friday = fridayPass.days.find((day) => day.weekday === 'fri')
assert.equal(friday?.points[0]?.kind, 'score')
assert.equal(friday?.points[0]?.score, 78)
assert.equal(friday?.points[0]?.label, '1차시 78')
assert.equal(friday?.points[1]?.kind, 'pass')
assert.equal(friday?.points[1]?.score, 85)
assert.equal(friday?.points[1]?.label, '2차시 합격')
assert.equal(friday?.points[2]?.kind, 'unattempted')
assert.equal(friday?.points[2]?.score, null)
assert.equal(friday?.points[3]?.kind, 'unattempted')
assert.equal(friday?.points[3]?.score, null)

// Monday pass on 1st session
const mondayPass = buildDailyTestWeeklyFlow(
  [test('2026-09-07', [session(1, '합격', 90)])],
  'stu-1',
  '2026-09-07',
)
const monday = mondayPass.days.find((day) => day.weekday === 'mon')
assert.equal(monday?.points[0]?.kind, 'pass')
assert.equal(monday?.points[0]?.label, '1차시 합격')
assert.equal(monday?.points.slice(1).every((point) => point.kind === 'unattempted'), true)

// Wednesday pass on 3rd session
const wednesdayPass = buildDailyTestWeeklyFlow(
  [
    test('2026-09-09', [
      session(1, '불합격', 70),
      session(2, '불합격', 80),
      session(3, '합격', 88),
    ]),
  ],
  'stu-1',
  '2026-09-07',
)
const wednesday = wednesdayPass.days.find((day) => day.weekday === 'wed')
assert.deepEqual(
  wednesday?.points.map((point) => point.kind),
  ['score', 'score', 'pass', 'unattempted'],
)
assert.equal(wednesday?.points[2]?.label, '3차시 합격')

// Stats use only actual attempted scores — no invented zeros
assert.equal(fridayPass.stats.highest, 85)
assert.equal(fridayPass.stats.lowest, 78)
assert.equal(fridayPass.stats.average, 81.5)

// Empty week: no invented numbers
const empty = buildDailyTestWeeklyFlow([], 'stu-1', '2026-09-07')
assert.equal(empty.stats.highest, null)
assert.equal(empty.stats.lowest, null)
assert.equal(empty.stats.average, null)
assert.equal(empty.points.every((point) => point.kind === 'unattempted'), true)

// Other student's tests must not appear
const other = buildDailyTestWeeklyFlow(
  [test('2026-09-07', [session(1, '합격', 99)], { id: 'other' })].map((item) => ({
    ...item,
    studentId: 'stu-2',
  })),
  'stu-1',
  '2026-09-07',
)
assert.equal(other.scored.length, 0)

// Multiple records on one day: pick the one with more attempted sessions
const picked = pickDailyTestForDate(
  [
    test('2026-09-11', [session(1, '불합격', 60)], {
      id: 'eng',
      subject: '영어',
      updatedAt: '2026-09-11T12:00:00.000Z',
    }),
    test('2026-09-11', [session(1, '불합격', 70), session(2, '합격', 90)], {
      id: 'math',
      subject: '수학',
      updatedAt: '2026-09-11T10:00:00.000Z',
    }),
  ],
  'stu-1',
  '2026-09-11',
)
assert.equal(picked?.id, 'math')

// Tuesday/Thursday tests are not placed on the Mon/Wed/Fri curve
const midweek = buildDailyTestWeeklyFlow(
  [test('2026-09-08', [session(1, '합격', 99)])],
  'stu-1',
  '2026-09-07',
)
assert.equal(midweek.scored.length, 0)

// Weekly SUMMARY 100점 산식 상수는 이 기능과 분리되어 유지
assert.equal(ATTENDANCE_WEEKLY_MAX, 20)
assert.equal(MATERIAL_WEEKLY_MAX, 10)
assert.equal(HOMEWORK_WEEKLY_MAX, 25)
assert.equal(DAILY_TEST_WEEKLY_MAX, 30)
assert.equal(ATTITUDE_WEEKLY_MAX, 15)
assert.equal(WEEKLY_SUMMARY_TOTAL_MAX, 100)

console.log('dailyTestWeeklyFlow.test.ts passed')
