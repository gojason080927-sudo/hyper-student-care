/**
 * 실행: npx tsx src/utils/studentCare/weeklyDailyTest.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../../types/records.ts'
import { ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE } from '../englishVocabTest.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import {
  applyHighRecoveryToDiagnosis,
  highRecoveryFirstScore,
  MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY,
} from '../mathHighRecovery.ts'
import { computeLearningRisk, scoreLessonRisk } from './risk.ts'
import { dailyTestDayScore, dailyTestRecordScore, scaleIndex, weeklyTestIndex } from './scoring.ts'
import { buildWeeklyLearningSummary } from './weeklySummary.ts'
import {
  weeklyDailyTestDayFact,
  weeklyDailyTestRecordFact,
  weeklyTestIndexFromFacts,
} from './weeklyDailyTest.ts'

function diagnosis(patch: Partial<typeof EMPTY_DAILY_LEARNING_DIAGNOSIS> = {}) {
  return { ...EMPTY_DAILY_LEARNING_DIAGNOSIS, ...patch }
}

function highRecord(
  date: string,
  firstWrong: number,
  endSession: 1 | 2 | 3 | 4,
  session3Questions: number | null = null,
  session4Questions: number | null = null,
): DailyTestRecord {
  return {
    id: `high-${date}-${firstWrong}-${endSession}`,
    studentId: 'stu-1',
    date,
    testName: '일일',
    subject: '수학',
    score: 0,
    totalScore: 100,
    percentage: 0,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: applyHighRecoveryToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS, {
      firstWrong,
      endSession,
      session3Questions,
      session4Questions,
    }),
    createdAt: '',
    updatedAt: '',
  }
}

function scoredMath(date: string, score: number): DailyTestRecord {
  return {
    id: `scored-${date}-${score}`,
    studentId: 'stu-1',
    date,
    testName: '일일',
    subject: '수학',
    score,
    totalScore: 100,
    percentage: score,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: score >= 85 ? '합격' : '불합격', score, totalScore: 100 },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: diagnosis(),
    createdAt: '',
    updatedAt: '',
  }
}

function legacyEnglish(date: string, score: number): DailyTestRecord {
  return {
    ...scoredMath(date, score),
    id: `legacy-en-${date}`,
    subject: '영어',
    testName: '어휘 시험',
  }
}

function cumulativeEnglish(date: string, wrongWords: number): DailyTestRecord {
  return {
    id: `cumul-${date}`,
    studentId: 'stu-1',
    date,
    testName: '누적 단어 TEST',
    subject: '영어',
    score: 0,
    totalScore: 100,
    percentage: 0,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: diagnosis({
      englishVocabTestFormat: ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE,
      englishVocabTotalWords: 300,
      englishVocabWrongWords: wrongWords,
    }),
    createdAt: '',
    updatedAt: '',
  }
}

function attendance(date: string) {
  return {
    id: `a-${date}`,
    studentId: 'stu-1',
    date,
    status: '출석' as const,
    reason: '',
    memo: '',
    excuseKind: null,
    createdAt: '',
    updatedAt: '',
  }
}

function care(date: string) {
  return {
    id: `c-${date}`,
    studentId: 'stu-1',
    date,
    materialPrep: '지참' as const,
    attitudeIssues: [] as const,
    attitudeNote: '',
    createdAt: '',
    updatedAt: '',
  }
}

function homework(date: string) {
  return {
    id: `h-${date}`,
    studentId: 'stu-1',
    date,
    subject: '수학' as const,
    slotNumber: 1 as const,
    previousAssignment: 'p',
    todayAssignment: 't',
    status: '완료' as const,
    createdAt: '',
    updatedAt: '',
  }
}

const weekDates = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11']

function weekSummary(dailyTests: DailyTestRecord[]) {
  return buildWeeklyLearningSummary({
    studentId: 'stu-1',
    weekStart: '2026-09-07',
    asOfIso: '2026-09-12T08:00:00.000+09:00',
    asOfDate: '2026-09-12',
    attendance: weekDates.map(attendance),
    homework: [],
    homeworkTextbookEntries: weekDates.map(homework),
    dailyTests,
    dailyCare: weekDates.map(care),
  })
}

/** SQL `_weekly_daily_test_day_facts` + 후보 C 주간지수와 같은 산식. */
function sqlTwinDayFact(records: DailyTestRecord[]) {
  return weeklyDailyTestDayFact(records)
}

function sqlTwinWeeklyIndex(dayFacts: Array<{ score: number; passed: boolean }>) {
  if (dayFacts.length === 0) return null
  const vAvg = dayFacts.reduce((sum, fact) => sum + fact.score, 0) / dayFacts.length
  const vPass = dayFacts.filter((fact) => fact.passed).length
  return vAvg * 0.7 + (vPass / dayFacts.length) * 100 * 0.3
}

for (const w1 of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
  const first = (10 - w1) * 10
  const expected = first * 0.7 + 30
  const record = highRecord('2026-09-07', w1, w1 === 0 ? 1 : 2)
  assert.equal(highRecoveryFirstScore(record), first)
  assert.equal(dailyTestRecordScore(record), null)
  assert.equal(dailyTestDayScore([record]), null)
  const fact = weeklyDailyTestRecordFact(record)
  assert.deepEqual(fact, { score: first, passed: true })
  const summary = weekSummary([record])
  assert.equal(summary.scores.dailyTest.index, expected)
  assert.equal(summary.scores.dailyTest.facts.passCount, 1)
  assert.equal(summary.scores.dailyTest.facts.attemptCount, 1)
  const sqlIndex = sqlTwinWeeklyIndex([sqlTwinDayFact([record])!])
  assert.equal(sqlIndex, expected)
}

const end2 = highRecord('2026-09-07', 4, 2)
const end3 = highRecord('2026-09-07', 4, 3, 6)
const end4 = highRecord('2026-09-07', 4, 4, 6, 5)
assert.equal(weekSummary([end2]).scores.dailyTest.index, 72)
assert.equal(weekSummary([end3]).scores.dailyTest.index, 72)
assert.equal(weekSummary([end4]).scores.dailyTest.index, 72)
assert.equal(highRecoveryFirstScore(end2), highRecoveryFirstScore(end3))
assert.equal(highRecoveryFirstScore(end3), highRecoveryFirstScore(end4))

const threeDay = weekSummary([
  highRecord('2026-09-07', 1, 2),
  highRecord('2026-09-09', 4, 3, 6),
  highRecord('2026-09-11', 0, 1),
])
assert.equal(threeDay.scores.dailyTest.facts.averageScore, 83.33)
assert.equal(threeDay.scores.dailyTest.facts.passCount, 3)
assert.equal(threeDay.scores.dailyTest.facts.attemptCount, 3)
assert.equal(threeDay.scores.dailyTest.index, 88.33)
assert.equal(threeDay.scores.dailyTest.score, 26.5)
assert.equal(
  sqlTwinWeeklyIndex([
    sqlTwinDayFact([highRecord('2026-09-07', 1, 2)])!,
    sqlTwinDayFact([highRecord('2026-09-09', 4, 3, 6)])!,
    sqlTwinDayFact([highRecord('2026-09-11', 0, 1)])!,
  ]),
  weeklyTestIndexFromFacts([
    weeklyDailyTestDayFact([highRecord('2026-09-07', 1, 2)])!,
    weeklyDailyTestDayFact([highRecord('2026-09-09', 4, 3, 6)])!,
    weeklyDailyTestDayFact([highRecord('2026-09-11', 0, 1)])!,
  ]),
)

const mixedLegacyMath = weeklyDailyTestDayFact([
  highRecord('2026-09-07', 4, 2),
  scoredMath('2026-09-07', 90),
])
assert.equal(mixedLegacyMath?.score, 75)
assert.equal(mixedLegacyMath?.passed, true)
assert.equal(dailyTestRecordScore(highRecord('2026-09-07', 4, 2)), null)

const mixedLegacyFail = weeklyDailyTestDayFact([
  highRecord('2026-09-07', 4, 2),
  scoredMath('2026-09-07', 80),
])
assert.equal(mixedLegacyFail?.score, 70)
assert.equal(mixedLegacyFail?.passed, false)

const mixedLegacyEnglish = weeklyDailyTestDayFact([
  highRecord('2026-09-07', 1, 2),
  legacyEnglish('2026-09-07', 92),
])
assert.equal(mixedLegacyEnglish?.score, 91)
assert.equal(mixedLegacyEnglish?.passed, true)

const mixedCumulative = weeklyDailyTestDayFact([
  highRecord('2026-09-07', 4, 2),
  cumulativeEnglish('2026-09-07', 7),
])
assert.deepEqual(mixedCumulative, { score: 60, passed: true })

const mixedWeek = weekSummary([
  highRecord('2026-09-07', 1, 2),
  scoredMath('2026-09-09', 78),
  cumulativeEnglish('2026-09-11', 6),
])
assert.equal(mixedWeek.scores.dailyTest.facts.attemptCount, 2)
assert.equal(mixedWeek.scores.dailyTest.facts.passCount, 1)
assert.equal(mixedWeek.scores.dailyTest.facts.vocabWeeklyDeduction, 1)
assert.equal(mixedWeek.scores.dailyTest.index, 73.8)

const scoredOnly = weeklyDailyTestDayFact([scoredMath('2026-09-07', 92), scoredMath('2026-09-07', 78)])
assert.equal(scoredOnly?.score, 85)
assert.equal(scoredOnly?.passed, true)
assert.equal(weeklyTestIndex([85]), weeklyTestIndexFromFacts([scoredOnly!]))

const emptyRisk = {
  studentId: 'stu-1',
  attendance: [attendance('2026-09-07')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
}
const withHighRisk = {
  ...emptyRisk,
  dailyTests: [highRecord('2026-09-07', 6, 3, 9)],
}
assert.equal(scoreLessonRisk(emptyRisk, '2026-09-07').points, scoreLessonRisk(withHighRisk, '2026-09-07').points)
assert.equal(computeLearningRisk(emptyRisk).score, computeLearningRisk(withHighRisk).score)
assert.equal(computeLearningRisk(withHighRisk).level, '우수')

assert.equal(MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY, 'high-recovery-v1')

const riskSrc = readFileSync('src/utils/studentCare/risk.ts', 'utf8')
assert.doesNotMatch(riskSrc, /high-recovery-v1/)
assert.doesNotMatch(riskSrc, /highRecoveryFirstScore/)
assert.doesNotMatch(riskSrc, /weeklyDailyTestDayFact/)
assert.match(readFileSync('src/utils/studentCare/scoring.ts', 'utf8'), /usesHighRecoveryMathDailyTest/)
assert.match(readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8'), /weeklyDailyTestDayFact/)
assert.doesNotMatch(readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8'), /weeklyTestIndex\(/)

const mig = readFileSync('supabase/high-recovery-weekly-c-migration.sql', 'utf8')
assert.doesNotMatch(mig, /TRUNCATE TABLE/i)
assert.doesNotMatch(mig, /DROP TABLE/i)
assert.match(mig, /_high_recovery_weekly_first_score/)
assert.match(mig, /_weekly_daily_test_day_facts/)
assert.match(mig, /v_test_day_passed/)
assert.match(mig, /v_scored_avg >= 85/)
assert.match(mig, /passed := v_score >= 85/)
assert.match(mig, /_english_vocab_weekly_deduction/)
assert.match(mig, /v_grade_score := greatest\(0, v_grade_score - v_vocab_deduction\)/)
assert.doesNotMatch(mig, /_daily_test_attempt_score\(t\) >= 85/)
assert.match(
  readFileSync('supabase/weekly-student-care-migration.sql', 'utf8'),
  /ON CONFLICT \(student_id, week_start\) DO NOTHING/,
)

const card = readFileSync('src/components/studentCare/DailyTestWeeklyFlowCard.tsx', 'utf8')
assert.match(card, /highRecoveryResults/)
assert.match(card, /고등 오답 회수/)
assert.doesNotMatch(readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8'), /weeklyDailyTestDayFact/)

console.log('weeklyDailyTest OK')
