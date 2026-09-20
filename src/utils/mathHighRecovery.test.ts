/**
 * 실행: npx tsx src/utils/mathHighRecovery.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../types/records.ts'
import { dailyTestFormToSavePayload, dailyTestRecordToForm, type DailyTestFormData } from './dailyTest.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import { applyFixedWrongFormatToDiagnosis, mathWeeklyRecoveryFacts } from './mathDailyTest.ts'
import {
  MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY,
  applyHighRecoveryToDiagnosis,
  highDraftsFromDiagnosis,
  highRecoveryWeeklyFacts,
  parseHighRecoveryDrafts,
  shouldUseHighRecoveryMathInput,
  usesHighRecoveryMathDailyTest,
  validateHighRecoveryDrafts,
} from './mathHighRecovery.ts'
import { dailyTestRecordScore } from './studentCare/scoring.ts'
import { DAILY_TEST_PASS_SCORE } from './studentCare/constants.ts'

assert.equal(DAILY_TEST_PASS_SCORE, 85)
assert.equal(validateHighRecoveryDrafts({ firstWrong: '0', endSession: 1, session3Questions: '', session4Questions: '' }), null)
assert.ok(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 1, session3Questions: '', session4Questions: '' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '0', endSession: 2, session3Questions: '', session4Questions: '' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '11', endSession: 2, session3Questions: '', session4Questions: '' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 3, session3Questions: '7', session4Questions: '' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 3, session3Questions: '15', session4Questions: '' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 4, session3Questions: '6', session4Questions: '6' }))
assert.ok(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 4, session3Questions: '6', session4Questions: '35' }))
assert.equal(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 2, session3Questions: '', session4Questions: '' }), null)
assert.equal(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 3, session3Questions: '6', session4Questions: '' }), null)
assert.equal(validateHighRecoveryDrafts({ firstWrong: '4', endSession: 4, session3Questions: '6', session4Questions: '5' }), null)

function mathRecord(patch: Partial<DailyTestRecord> = {}): DailyTestRecord {
  return {
    id: 'math-h-1',
    studentId: 'stu-1',
    date: '2026-09-21',
    testName: '일일테스트',
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
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    createdAt: '',
    updatedAt: '',
    ...patch,
  }
}

function highForm(patch: Partial<DailyTestFormData> = {}): DailyTestFormData {
  return {
    studentId: 'stu-1',
    date: '2026-09-21',
    testName: '일일테스트',
    subject: '수학',
    memo: '',
    sessionResults: [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    studentGrade: '고1',
    highFirstWrong: '',
    highEndSession: '',
    highSession3Questions: '',
    highSession4Questions: '',
    ...patch,
  }
}

const zeroSaved = dailyTestFormToSavePayload(highForm({ highFirstWrong: '0', highEndSession: 1 }))
assert.equal(zeroSaved.learningDiagnosis.mathDailyTestFormat, MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY)
assert.equal(zeroSaved.learningDiagnosis.mathHighFirstWrongCount, 0)
assert.equal(zeroSaved.learningDiagnosis.mathHighEndSession, 1)
assert.equal(zeroSaved.learningDiagnosis.mathHighSession3Questions, null)
assert.equal(zeroSaved.sessionResults.every((session) => session.status === '미응시'), true)
assert.deepEqual(mathWeeklyRecoveryFacts(mathRecord({ learningDiagnosis: zeroSaved.learningDiagnosis })), {
  discoveredWrong: 0,
  recoveredWrong: 0,
  unrecoveredWrong: 0,
  retakeQuestionCount: 0,
  recoveryRate: null,
})

assert.equal(
  parseHighRecoveryDrafts({ firstWrong: '4', endSession: 1, session3Questions: '', session4Questions: '' }),
  null,
)

const second = dailyTestFormToSavePayload(highForm({ highFirstWrong: '4', highEndSession: 2 }))
assert.equal(second.learningDiagnosis.mathHighFirstWrongCount, 4)
assert.equal(second.learningDiagnosis.mathHighEndSession, 2)
assert.deepEqual(highRecoveryWeeklyFacts(mathRecord({ learningDiagnosis: second.learningDiagnosis })), {
  discoveredWrong: 4,
  recoveredWrong: 4,
  unrecoveredWrong: 0,
  retakeQuestionCount: 4,
  recoveryRate: 100,
})

const third = dailyTestFormToSavePayload(
  highForm({ highFirstWrong: '4', highEndSession: 3, highSession3Questions: '6' }),
)
assert.equal(third.learningDiagnosis.mathHighSession3Questions, 6)
assert.equal(third.learningDiagnosis.mathHighSession4Questions, null)
const thirdFacts = highRecoveryWeeklyFacts(mathRecord({ learningDiagnosis: third.learningDiagnosis }))
assert.equal(thirdFacts?.retakeQuestionCount, 10)
assert.equal(thirdFacts?.recoveredWrong, 4)
assert.equal(parseHighRecoveryDrafts({ firstWrong: '4', endSession: 3, session3Questions: '6', session4Questions: '' })?.firstWrong, 4)
assert.equal(
  parseHighRecoveryDrafts({ firstWrong: '4', endSession: 3, session3Questions: '6', session4Questions: '' }) &&
    6 / 3,
  2,
)

const fourth = dailyTestFormToSavePayload(
  highForm({
    highFirstWrong: '4',
    highEndSession: 4,
    highSession3Questions: '6',
    highSession4Questions: '5',
  }),
)
const fourthFacts = highRecoveryWeeklyFacts(mathRecord({ learningDiagnosis: fourth.learningDiagnosis }))
assert.equal(fourth.learningDiagnosis.mathHighSession4Questions, 5)
assert.equal(fourthFacts?.retakeQuestionCount, 15)
assert.equal(fourthFacts?.recoveredWrong, 4)
assert.equal(5 / 5, 1)

const restored = dailyTestRecordToForm(
  mathRecord({
    learningDiagnosis: fourth.learningDiagnosis,
    sessionResults: fourth.sessionResults,
  }),
)
assert.equal(restored.highFirstWrong, '4')
assert.equal(restored.highEndSession, 4)
assert.equal(restored.highSession3Questions, '6')
assert.equal(restored.highSession4Questions, '5')
assert.deepEqual(highDraftsFromDiagnosis(fourth.learningDiagnosis), {
  firstWrong: '4',
  endSession: 4,
  session3Questions: '6',
  session4Questions: '5',
})

const middleRecord = mathRecord({
  learningDiagnosis: applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
  sessionResults: [
    { session: 1, status: '합격', score: 90, totalScore: 100, incorrectCount: 1 },
    { session: 2, status: '미응시' },
    { session: 3, status: '미응시' },
    { session: 4, status: '미응시' },
  ],
  score: 90,
  percentage: 90,
})
assert.equal(usesHighRecoveryMathDailyTest(middleRecord), false)
assert.equal(shouldUseHighRecoveryMathInput('수학', middleRecord, '고1'), false)
assert.equal(shouldUseHighRecoveryMathInput('수학', undefined, '고2'), true)
assert.equal(shouldUseHighRecoveryMathInput('수학', undefined, '중3'), false)
assert.equal(shouldUseHighRecoveryMathInput('수학', undefined, '초6'), false)

const highRecord = mathRecord({ learningDiagnosis: fourth.learningDiagnosis })
assert.equal(usesHighRecoveryMathDailyTest(highRecord), true)
assert.equal(dailyTestRecordScore(highRecord), null)
assert.equal(shouldUseHighRecoveryMathInput('수학', highRecord, '중1'), true)

assert.doesNotMatch(readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8'), /high-recovery-v1/)
assert.doesNotMatch(readFileSync('src/utils/studentCare/risk.ts', 'utf8'), /high-recovery-v1/)
assert.match(readFileSync('src/utils/studentCare/scoring.ts', 'utf8'), /usesHighRecoveryMathDailyTest/)
assert.match(readFileSync('src/utils/studentCare/lessons.ts', 'utf8'), /usesHighRecoveryMathDailyTest/)
assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8'),
  /high-recovery-v1/,
)

console.log('mathHighRecovery OK')
