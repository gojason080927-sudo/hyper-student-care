/**
 * 실행: npx tsx src/utils/mathDailyTest.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import {
  MATH_DAILY_TEST_FORMAT_FIXED_WRONG,
  MATH_FIXED_WRONG_PASS_SCORE,
  applyFixedWrongFormatToDiagnosis,
  buildFixedWrongSessionResults,
  hasFixedWrongDraftContent,
  isLegacyMathDailyTestRecord,
  mathFixedWrongScore,
  mathFixedWrongStatus,
  mathSessionQuestionCount,
  mathWeeklyRecoveryFacts,
  mathWrongDraftsFromSessions,
  maxEnabledFixedWrongSession,
  parseMathWrongCountDraft,
  shouldUseFixedWrongMathInput,
  usesFixedWrongMathDailyTest,
  validateMathFixedWrongDrafts,
  validateMathWrongCountDraft,
} from './mathDailyTest.ts'
import { dailyTestFormToSavePayload, dailyTestRecordToForm, type DailyTestFormData } from './dailyTest.ts'
import { DAILY_TEST_PASS_SCORE } from './studentCare/constants.ts'
import {
  bulkDailyTestToSavePayload,
  createEmptyMobileDailyTestRounds,
  hasBulkDailyTestContent,
  sessionsToBulkDailyTestRounds,
} from './teacherMobileDailyTest.ts'

assert.equal(MATH_FIXED_WRONG_PASS_SCORE, 80)
assert.equal(DAILY_TEST_PASS_SCORE, 85)
assert.equal(mathSessionQuestionCount(1), 10)
assert.equal(mathSessionQuestionCount(2), 5)
assert.equal(mathSessionQuestionCount(3), 5)
assert.equal(mathSessionQuestionCount(4), 5)

for (const [wrong, score, status] of [
  [0, 100, '합격'],
  [1, 90, '합격'],
  [2, 80, '합격'],
  [3, 70, '불합격'],
  [10, 0, '불합격'],
] as const) {
  assert.equal(mathFixedWrongScore(10, wrong), score, `1차 ${wrong}오답`)
  assert.equal(mathFixedWrongStatus(score), status)
}

for (const [wrong, score, status] of [
  [0, 100, '합격'],
  [1, 80, '합격'],
  [2, 60, '불합격'],
  [5, 0, '불합격'],
] as const) {
  assert.equal(mathFixedWrongScore(5, wrong), score, `재시험 ${wrong}오답`)
  assert.equal(mathFixedWrongStatus(score), status)
}

assert.equal(parseMathWrongCountDraft(''), null)
assert.equal(parseMathWrongCountDraft('0'), 0)
assert.equal(parseMathWrongCountDraft('00'), 0)
assert.equal(parseMathWrongCountDraft('3'), 3)
assert.equal(parseMathWrongCountDraft('1.5'), null)
assert.equal(parseMathWrongCountDraft('-1'), null)
assert.ok(validateMathWrongCountDraft(1, '11'))
assert.ok(validateMathWrongCountDraft(2, '6'))
assert.equal(validateMathWrongCountDraft(1, '0'), null)
assert.equal(validateMathWrongCountDraft(2, '5'), null)

const firstPass = buildFixedWrongSessionResults({ 1: '1', 2: '2', 3: '0', 4: '0' })
assert.equal(firstPass[0]?.status, '합격')
assert.equal(firstPass[0]?.score, 90)
assert.equal(firstPass[0]?.incorrectCount, 1)
assert.equal(firstPass[0]?.totalScore, 100)
assert.equal(firstPass[1]?.status, '미응시')
assert.equal(firstPass[2]?.status, '미응시')
assert.equal(firstPass[3]?.status, '미응시')
assert.equal(maxEnabledFixedWrongSession({ 1: '1', 2: '', 3: '', 4: '' }), 1)

const needSecond = buildFixedWrongSessionResults({ 1: '3', 2: '', 3: '', 4: '' })
assert.equal(needSecond[0]?.status, '불합격')
assert.equal(needSecond[0]?.score, 70)
assert.equal(needSecond[1]?.status, '미응시')
assert.equal(maxEnabledFixedWrongSession({ 1: '3', 2: '', 3: '', 4: '' }), 2)

const secondPass = buildFixedWrongSessionResults({ 1: '3', 2: '1', 3: '2', 4: '0' })
assert.equal(secondPass[0]?.status, '불합격')
assert.equal(secondPass[1]?.status, '합격')
assert.equal(secondPass[1]?.score, 80)
assert.equal(secondPass[1]?.incorrectCount, 1)
assert.equal(secondPass[2]?.status, '미응시')
assert.equal(secondPass[3]?.status, '미응시')

const thirdEnabled = buildFixedWrongSessionResults({ 1: '3', 2: '2', 3: '0', 4: '1' })
assert.equal(thirdEnabled[1]?.status, '불합격')
assert.equal(thirdEnabled[2]?.status, '합격')
assert.equal(thirdEnabled[3]?.status, '미응시')
assert.equal(maxEnabledFixedWrongSession({ 1: '3', 2: '2', 3: '', 4: '' }), 3)

const restored = mathWrongDraftsFromSessions(secondPass)
assert.deepEqual(restored, { 1: '3', 2: '1', 3: '', 4: '' })
assert.equal(hasFixedWrongDraftContent({ 1: '', 2: '', 3: '', 4: '' }), false)
assert.equal(hasFixedWrongDraftContent({ 1: '0', 2: '', 3: '', 4: '' }), true)
assert.ok(validateMathFixedWrongDrafts({ 1: '', 2: '1', 3: '', 4: '' }))

function mathRecord(patch: Partial<DailyTestRecord> = {}): DailyTestRecord {
  return {
    id: 'math-1',
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

const legacyMath = mathRecord({
  score: 90,
  percentage: 90,
  sessionResults: [
    { session: 1, status: '합격', score: 90, totalScore: 100 },
    { session: 2, status: '미응시' },
    { session: 3, status: '미응시' },
    { session: 4, status: '미응시' },
  ],
})
assert.equal(isLegacyMathDailyTestRecord(legacyMath), true)
assert.equal(shouldUseFixedWrongMathInput('수학', legacyMath), false)
assert.equal(shouldUseFixedWrongMathInput('수학'), false)
assert.equal(shouldUseFixedWrongMathInput('수학', undefined, '중2'), true)
assert.equal(shouldUseFixedWrongMathInput('수학', undefined, '고1'), false)
assert.equal(shouldUseFixedWrongMathInput('수학', undefined, '초5'), false)
assert.equal(shouldUseFixedWrongMathInput('영어'), false)

const v1Math = mathRecord({
  learningDiagnosis: applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
  sessionResults: firstPass,
  score: 90,
  percentage: 90,
  incorrectCount: 1,
})
assert.equal(usesFixedWrongMathDailyTest(v1Math), true)
assert.equal(isLegacyMathDailyTestRecord(v1Math), false)
assert.equal(shouldUseFixedWrongMathInput('수학', v1Math), true)
assert.equal(shouldUseFixedWrongMathInput('수학', v1Math, '고1'), true)

const firstPassFacts = mathWeeklyRecoveryFacts(v1Math)
assert.deepEqual(firstPassFacts, {
  discoveredWrong: 1,
  recoveredWrong: 1,
  unrecoveredWrong: 0,
  retakeQuestionCount: 0,
  recoveryRate: 100,
})

const failedOpen = mathRecord({
  learningDiagnosis: applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
  sessionResults: needSecond,
})
assert.deepEqual(mathWeeklyRecoveryFacts(failedOpen), {
  discoveredWrong: 3,
  recoveredWrong: 0,
  unrecoveredWrong: 3,
  retakeQuestionCount: 0,
  recoveryRate: 0,
})

const recovered = mathRecord({
  learningDiagnosis: applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
  sessionResults: secondPass,
})
assert.deepEqual(mathWeeklyRecoveryFacts(recovered), {
  discoveredWrong: 3,
  recoveredWrong: 3,
  unrecoveredWrong: 0,
  retakeQuestionCount: 5,
  recoveryRate: 100,
})

assert.equal(mathWeeklyRecoveryFacts(legacyMath), null)

const form: DailyTestFormData = {
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '일일테스트',
  subject: '수학',
  memo: '',
  sessionResults: firstPass,
  learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
  studentGrade: '중2',
  mathWrongCounts: { 1: '2', 2: '1', 3: '', 4: '' },
}
const saved = dailyTestFormToSavePayload(form)
assert.equal(saved.learningDiagnosis.mathDailyTestFormat, MATH_DAILY_TEST_FORMAT_FIXED_WRONG)
assert.equal(saved.sessionResults[0]?.incorrectCount, 2)
assert.equal(saved.sessionResults[0]?.score, 80)
assert.equal(saved.sessionResults[0]?.status, '합격')
assert.equal(saved.sessionResults[1]?.status, '미응시')
assert.equal(saved.sessionResults[0]?.totalScore, 100)

const legacyForm: DailyTestFormData = {
  id: 'legacy-1',
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '일일테스트',
  subject: '수학',
  memo: '',
  sessionResults: legacyMath.sessionResults,
  learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
}
const legacySaved = dailyTestFormToSavePayload(legacyForm)
assert.equal(legacySaved.learningDiagnosis.mathDailyTestFormat, null)
assert.equal(legacySaved.sessionResults[0]?.score, 90)
assert.equal(legacySaved.sessionResults[0]?.status, '합격')

const englishForm: DailyTestFormData = {
  id: 'en-1',
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '어휘 시험',
  subject: '영어',
  memo: '',
  sessionResults: [
    { session: 1, status: '합격', score: 90, totalScore: 100 },
    { session: 2, status: '미응시' },
    { session: 3, status: '미응시' },
    { session: 4, status: '미응시' },
  ],
  learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
}
const englishSaved = dailyTestFormToSavePayload(englishForm)
assert.equal(englishSaved.learningDiagnosis.mathDailyTestFormat, null)
assert.equal(englishSaved.learningDiagnosis.englishVocabTestFormat, null)
assert.equal(englishSaved.sessionResults[0]?.score, 90)

const rounds = sessionsToBulkDailyTestRounds(secondPass)
assert.equal(rounds[0]?.wrongCount, '3')
assert.equal(rounds[1]?.wrongCount, '1')
assert.equal(hasBulkDailyTestContent(rounds), true)
assert.equal(hasBulkDailyTestContent(createEmptyMobileDailyTestRounds()), false)

const bulkSaved = bulkDailyTestToSavePayload({
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '일일테스트',
  subject: '수학',
  rounds: [
    { round: 1, score: '', passed: false, wrongCount: '3' },
    { round: 2, score: '', passed: false, wrongCount: '1' },
    { round: 3, score: '', passed: false, wrongCount: '' },
    { round: 4, score: '', passed: false, wrongCount: '' },
  ],
})
assert.equal(bulkSaved.learningDiagnosis.mathDailyTestFormat, MATH_DAILY_TEST_FORMAT_FIXED_WRONG)
assert.equal(bulkSaved.sessionResults[0]?.incorrectCount, 3)
assert.equal(bulkSaved.sessionResults[1]?.incorrectCount, 1)
assert.equal(bulkSaved.sessionResults[1]?.status, '합격')
assert.equal(bulkSaved.sessionResults[2]?.status, '미응시')

const reentered = dailyTestRecordToForm({
  ...mathRecord({
    learningDiagnosis: saved.learningDiagnosis,
    sessionResults: saved.sessionResults,
    score: saved.score,
    totalScore: saved.totalScore,
    incorrectCount: saved.incorrectCount,
  }),
})
assert.deepEqual(reentered.mathWrongCounts, { 1: '2', 2: '', 3: '', 4: '' })

const legacyBulk = bulkDailyTestToSavePayload({
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '일일테스트',
  subject: '수학',
  rounds: [
    { round: 1, score: '90', passed: true },
    { round: 2, score: '', passed: false },
    { round: 3, score: '', passed: false },
    { round: 4, score: '', passed: false },
  ],
})
assert.equal(legacyBulk.learningDiagnosis.mathDailyTestFormat, null)
assert.equal(legacyBulk.sessionResults[0]?.score, 90)
assert.equal(legacyBulk.sessionResults[0]?.status, '합격')

const englishBulk = bulkDailyTestToSavePayload({
  studentId: 'stu-1',
  date: '2026-09-21',
  testName: '어휘 시험',
  subject: '영어',
  rounds: [
    { round: 1, score: '84', passed: false },
    { round: 2, score: '', passed: false },
    { round: 3, score: '', passed: false },
    { round: 4, score: '', passed: false },
  ],
})
assert.equal(englishBulk.learningDiagnosis.mathDailyTestFormat, null)
assert.equal(englishBulk.sessionResults[0]?.score, 84)
assert.equal(englishBulk.sessionResults[0]?.status, '불합격')

const weekly = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
const risk = readFileSync('src/utils/studentCare/risk.ts', 'utf8')
const constants = readFileSync('src/utils/studentCare/constants.ts', 'utf8')
assert.doesNotMatch(weekly, /fixed-wrong-v1|MATH_FIXED_WRONG_PASS_SCORE/)
assert.doesNotMatch(risk, /fixed-wrong-v1|MATH_FIXED_WRONG_PASS_SCORE/)
assert.match(constants, /export const DAILY_TEST_PASS_SCORE = 85/)
assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8'),
  /fixed-wrong-v1/,
)
assert.match(readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8'), /MathFixedWrongSessionFields/)
assert.match(readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8'), /MathFixedWrongSessionFields/)
assert.match(readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8'), /HighRecoveryFields/)
assert.match(readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8'), /HighRecoveryFields/)
assert.doesNotMatch(readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8'), /conceptLackCount \+ .*incorrectCount/)

console.log('mathDailyTest OK')
