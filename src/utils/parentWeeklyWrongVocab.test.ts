/**
 * 실행: npx tsx src/utils/parentWeeklyWrongVocab.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import {
  listParentWeeklyWrongVocabWeeks,
  pickDefaultParentWeeklyWrongVocabWeek,
  pickLatestParentWeeklyVocab,
  summarizeParentWeeklyMathRecovery,
} from './parentWeeklyWrongVocab.ts'

function mathRecord(date: string, studentId = 's1'): DailyTestRecord {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    testName: '일일테스트',
    subject: '수학',
    score: 80,
    totalScore: 100,
    percentage: 80,
    incorrectCount: 2,
    memo: '',
    sessionResults: [],
    learningDiagnosis: EMPTY_DAILY_LEARNING_DIAGNOSIS,
    createdAt: '',
    updatedAt: '',
  }
}

const lastWeek = mathRecord('2026-09-16')
assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [lastWeek],
    today: '2026-09-21',
  }),
  '2026-09-14',
)

assert.deepEqual(
  listParentWeeklyWrongVocabWeeks({
    studentId: 's1',
    dailyTests: [lastWeek],
    weeklySummaries: [],
    today: '2026-09-21',
  }),
  ['2026-09-21', '2026-09-14'],
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [mathRecord('2026-09-20')],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [{ ...lastWeek, studentId: 'other' }],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

const page = readFileSync('src/pages/parent/ParentStudentWeeklyWrongVocabPage.tsx', 'utf8')
assert.match(page, /pickDefaultParentWeeklyWrongVocabWeek/)
assert.match(page, /weekTouched/)
assert.match(page, /ParentWeeklyWrongVocabReport/)
assert.match(page, /이번 주 수학 오답 회수와 영어 누적 단어 학습을 확인합니다/)
assert.doesNotMatch(page, /setWeekStart\(weeks\[0\]\)/)
assert.doesNotMatch(page, /DailyTestWeeklyFlowCard/)
assert.doesNotMatch(page, /일일테스트 주간 흐름/)

const report = readFileSync('src/components/parent/ParentWeeklyWrongVocabReport.tsx', 'utf8')
assert.match(report, /buildDailyTestWeeklyFlow/)
assert.match(report, /summarizeParentWeeklyMathRecovery/)
assert.match(report, /수학 오답 추적/)
assert.match(report, /오답 원인/)
assert.match(report, /영어 단어 누적/)
assert.match(report, /이번 주 수학 일일테스트 기록이 없습니다/)
assert.match(report, /이번 주 영어 누적 단어 TEST 기록이 없습니다/)
assert.doesNotMatch(report, /DAILY TEST/)
assert.doesNotMatch(report, /FlowChart/)
assert.doesNotMatch(report, /일일테스트 주간 흐름/)

assert.deepEqual(
  summarizeParentWeeklyMathRecovery([
    {
      discoveredWrong: 3,
      recoveredWrong: 3,
      unrecoveredWrong: 0,
      retakeQuestionCount: 5,
      recoveryRate: 100,
    },
    {
      discoveredWrong: 1,
      recoveredWrong: 0,
      unrecoveredWrong: 1,
      retakeQuestionCount: 0,
      recoveryRate: 0,
    },
  ]),
  {
    discoveredWrong: 4,
    recoveredWrong: 3,
    unrecoveredWrong: 1,
    retakeQuestionCount: 5,
    recoveryRate: 75,
  },
)
assert.equal(summarizeParentWeeklyMathRecovery([]), null)
assert.equal(
  pickLatestParentWeeklyVocab([
    { date: '2026-09-07', totalWords: 200, wrongWords: 2, label: 'a' },
    { date: '2026-09-09', totalWords: 300, wrongWords: 6, label: 'b' },
  ])?.totalWords,
  300,
)

const summary = readFileSync('src/pages/parent/ParentStudentWeeklySummaryPage.tsx', 'utf8')
assert.doesNotMatch(summary, /pickDefaultParentWeeklyWrongVocabWeek/)
assert.doesNotMatch(summary, /ParentWeeklyWrongVocabReport/)
assert.match(summary, /DailyTestWeeklyFlowCard/)

console.log('parentWeeklyWrongVocab OK')
