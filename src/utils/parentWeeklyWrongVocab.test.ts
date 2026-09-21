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
assert.doesNotMatch(page, /setWeekStart\(weeks\[0\]\)/)

const summary = readFileSync('src/pages/parent/ParentStudentWeeklySummaryPage.tsx', 'utf8')
assert.doesNotMatch(summary, /pickDefaultParentWeeklyWrongVocabWeek/)
assert.doesNotMatch(summary, /이번 주 기록 없음/)

console.log('parentWeeklyWrongVocab OK')
