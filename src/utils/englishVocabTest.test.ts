/**
 * 실행: npx tsx src/utils/englishVocabTest.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../types/records.ts'
import {
  ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE,
  englishVocabWeeklyDeduction,
  formatCumulativeVocabResult,
  isLegacyEnglishVocabRecord,
  parseVocabWordCountDraft,
  shouldUseCumulativeEnglishVocabInput,
  sumEnglishVocabWeeklyDeduction,
  usesCumulativeEnglishVocabTest,
  validateCumulativeVocabInput,
} from './englishVocabTest.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import {
  computeLearningRisk,
  computePriorDayLearningEvaluation,
  scoreLessonRisk,
} from './studentCare/risk.ts'
import { dailyTestDayScore, dailyTestRecordScore } from './studentCare/scoring.ts'
import { buildWeeklyLearningSummary } from './studentCare/weeklySummary.ts'

function diagnosis(
  patch: Partial<typeof EMPTY_DAILY_LEARNING_DIAGNOSIS> = {},
): typeof EMPTY_DAILY_LEARNING_DIAGNOSIS {
  return { ...EMPTY_DAILY_LEARNING_DIAGNOSIS, ...patch }
}

function mathTest(date: string, score: number): DailyTestRecord {
  return {
    id: `math-${date}`,
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

function cumulativeEnglish(
  date: string,
  totalWords: number,
  wrongWords: number,
  extra?: Partial<DailyTestRecord>,
): DailyTestRecord {
  return {
    id: `en-${date}-${totalWords}-${wrongWords}`,
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
      englishVocabTotalWords: totalWords,
      englishVocabWrongWords: wrongWords,
    }),
    createdAt: '',
    updatedAt: '',
    ...extra,
  }
}

function legacyEnglish(date: string, score: number): DailyTestRecord {
  return {
    id: `legacy-en-${date}`,
    studentId: 'stu-1',
    date,
    testName: '어휘 시험',
    subject: '영어',
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
    attitudeIssues: [],
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

function perfectWeek(dailyTests: DailyTestRecord[]) {
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

for (const [wrong, expected] of [
  [0, 0],
  [5, 0],
  [6, 1],
  [10, 1],
  [11, 2],
  [15, 2],
  [16, 3],
  [20, 3],
  [21, 4],
] as const) {
  assert.equal(englishVocabWeeklyDeduction(wrong), expected, `wrong ${wrong}`)
}

assert.equal(englishVocabWeeklyDeduction(6), 1)
assert.equal(
  sumEnglishVocabWeeklyDeduction([
    cumulativeEnglish('2026-09-07', 300, 6),
    cumulativeEnglish('2026-09-09', 900, 6),
  ]),
  2,
)
assert.equal(
  sumEnglishVocabWeeklyDeduction([
    cumulativeEnglish('2026-09-07', 300, 13),
    cumulativeEnglish('2026-09-09', 900, 13),
  ]),
  4,
)
assert.equal(formatCumulativeVocabResult(300, 6), '300단어 중 6개 틀림')
assert.equal(parseVocabWordCountDraft('300'), 300)
assert.equal(parseVocabWordCountDraft('-1'), null)
assert.equal(parseVocabWordCountDraft('1.5'), null)
assert.ok(validateCumulativeVocabInput('0', '0'))
assert.ok(validateCumulativeVocabInput('10', '11'))
assert.equal(validateCumulativeVocabInput('300', '6'), null)

const leftoverScore = cumulativeEnglish('2026-09-07', 300, 6, {
  score: 40,
  percentage: 40,
  sessionResults: [
    { session: 1, status: '불합격', score: 40, totalScore: 100 },
    { session: 2, status: '미응시' },
    { session: 3, status: '미응시' },
    { session: 4, status: '미응시' },
  ],
})
assert.equal(dailyTestRecordScore(leftoverScore), null)
assert.equal(dailyTestDayScore([leftoverScore, mathTest('2026-09-07', 100)]), 100)

const weekA = perfectWeek([
  mathTest('2026-09-07', 100),
  mathTest('2026-09-09', 100),
  cumulativeEnglish('2026-09-08', 300, 4),
  cumulativeEnglish('2026-09-10', 300, 5),
])
assert.equal(weekA.totalScore, 100)
assert.equal(weekA.grade, '우수')

const weekB = perfectWeek([
  mathTest('2026-09-07', 100),
  mathTest('2026-09-09', 100),
  cumulativeEnglish('2026-09-08', 300, 7),
  cumulativeEnglish('2026-09-10', 900, 8),
])
assert.equal(weekB.totalScore, 98)
assert.equal(weekB.grade, '우수')
assert.equal(weekB.scores.dailyTest.facts.vocabWeeklyDeduction, 2)

const weekC = perfectWeek([
  mathTest('2026-09-07', 100),
  mathTest('2026-09-09', 100),
  cumulativeEnglish('2026-09-08', 300, 9),
  cumulativeEnglish('2026-09-10', 300, 10),
])
assert.equal(weekC.totalScore, 98)

const weekD = perfectWeek([
  mathTest('2026-09-07', 100),
  mathTest('2026-09-09', 100),
  cumulativeEnglish('2026-09-08', 300, 7),
  cumulativeEnglish('2026-09-10', 300, 13),
])
assert.equal(weekD.totalScore, 97)

const weekE = perfectWeek([
  mathTest('2026-09-07', 100),
  mathTest('2026-09-09', 100),
  cumulativeEnglish('2026-09-08', 300, 12),
  cumulativeEnglish('2026-09-10', 900, 14),
])
assert.equal(weekE.totalScore, 96)

assert.equal(
  perfectWeek([
    mathTest('2026-09-07', 100),
    cumulativeEnglish('2026-09-08', 300, 6),
  ]).totalScore,
  perfectWeek([
    mathTest('2026-09-07', 100),
    cumulativeEnglish('2026-09-08', 900, 6),
  ]).totalScore,
)

const mathOnly = perfectWeek([mathTest('2026-09-07', 92), mathTest('2026-09-09', 86)])
const mathOnlyBaseline = buildWeeklyLearningSummary({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  asOfIso: '2026-09-12T08:00:00.000+09:00',
  asOfDate: '2026-09-12',
  attendance: weekDates.map(attendance),
  homework: [],
  homeworkTextbookEntries: weekDates.map(homework),
  dailyTests: [mathTest('2026-09-07', 92), mathTest('2026-09-09', 86)],
  dailyCare: weekDates.map(care),
})
assert.equal(mathOnly.totalScore, mathOnlyBaseline.totalScore)
assert.equal(mathOnly.scores.dailyTest.facts.passCount, 2)

assert.equal(isLegacyEnglishVocabRecord(legacyEnglish('2026-09-07', 90)), true)
assert.equal(shouldUseCumulativeEnglishVocabInput('영어', legacyEnglish('2026-09-07', 90)), false)
assert.equal(usesCumulativeEnglishVocabTest(legacyEnglish('2026-09-07', 90)), false)
assert.equal(shouldUseCumulativeEnglishVocabInput('영어'), true)
assert.equal(shouldUseCumulativeEnglishVocabInput('수학'), false)

const riskInput = {
  studentId: 'stu-1',
  attendance: [attendance('2026-09-07'), attendance('2026-09-09'), attendance('2026-09-11')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [
    cumulativeEnglish('2026-09-07', 300, 12),
    cumulativeEnglish('2026-09-09', 300, 14),
    cumulativeEnglish('2026-09-11', 300, 21),
  ],
  dailyCare: [],
}
assert.equal(scoreLessonRisk(riskInput, '2026-09-07').points, 0)
assert.equal(computeLearningRisk(riskInput).level, '우수')
assert.equal(computeLearningRisk(riskInput).score, 0)
assert.equal(computePriorDayLearningEvaluation(riskInput, '2026-09-07').grade, '우수')

const teacher = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(teacher, /CumulativeVocabTestFields/)
assert.match(teacher, /누적 단어 TEST|vocabTotalWords/)
assert.doesNotMatch(teacher, /scoreLessonRisk/)

const parentToday = readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8')
assert.match(parentToday, /usesCumulativeEnglishVocabTest/)
assert.match(parentToday, /CumulativeVocabTestResult/)

const parentHistory = readFileSync('src/pages/parent/ParentStudentDailyTestPage.tsx', 'utf8')
assert.match(parentHistory, /usesCumulativeEnglishVocabTest/)
assert.match(parentHistory, /CumulativeVocabTestResult/)

const hubCard = readFileSync('src/components/studentCare/DailyTestWeeklyFlowCard.tsx', 'utf8')
assert.match(hubCard, /weekCumulativeResults/)
assert.match(hubCard, /누적 단어 TEST/)

const risk = readFileSync('src/utils/studentCare/risk.ts', 'utf8')
assert.doesNotMatch(risk, /englishVocabWeeklyDeduction/)
assert.doesNotMatch(risk, /vocabWeeklyDeduction/)

const sql = readFileSync('supabase/weekly-student-care-migration.sql', 'utf8')
const mig = readFileSync('supabase/english-vocab-cumulative-weekly-migration.sql', 'utf8')
const highMig = readFileSync('supabase/high-recovery-weekly-c-migration.sql', 'utf8')
assert.doesNotMatch(mig, /TRUNCATE TABLE/i)
assert.doesNotMatch(mig, /DROP TABLE/i)
assert.match(mig, /_english_vocab_weekly_deduction/)
assert.match(sql, /_english_vocab_weekly_deduction/)
assert.match(sql, /englishVocabTestFormat/)
assert.match(sql, /v_grade_score := greatest\(0, v_grade_score - v_vocab_deduction\)/)
assert.match(sql, /ON CONFLICT \(student_id, week_start\) DO NOTHING/)
assert.match(highMig, /_english_vocab_weekly_deduction/)
assert.match(highMig, /v_grade_score := greatest\(0, v_grade_score - v_vocab_deduction\)/)

const weekly = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
assert.match(weekly, /sumEnglishVocabWeeklyDeduction/)
assert.match(weekly, /vocabWeeklyDeduction/)

console.log('englishVocabTest OK')
