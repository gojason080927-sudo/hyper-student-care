/**
 * 강사 Today Report 「강사의 피드백」 문장 내부 공백 보존
 * 실행: npx tsx src/utils/learningDiagnosis.teacherFeedbackSpaces.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { DailyTestRecord } from '../types/records.ts'
import { dailyTestFromRow, dailyTestToRow } from '../lib/db/mappers.ts'
import {
  dailyTestFormToSavePayload,
  dailyTestRecordToForm,
  type DailyTestFormData,
} from './dailyTest.ts'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
  type DailyLearningDiagnosis,
} from './learningDiagnosis.ts'
import { applyFixedWrongFormatToDiagnosis } from './mathDailyTest.ts'
import { MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY } from './mathHighRecovery.ts'
import { applyStudentDailyTestDraft } from './voiceInput/applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './voiceInput/parseStudentDailyTestVoice.ts'

const SENTENCE = '계산 과정이 길어서 혼자 풀기 어려웠습니다.'
const SCREENSHOT =
  '9번 - 난이도 최상으로 계산도 상당하여 혼자 풀어내기 힘들었을 것으로 예상'
const MULTILINE = '첫째 문장입니다.\n둘째 문장입니다.\n\n세 번째 문장입니다.'

/** DailyLearningDiagnosisFields.patch — onChange마다 normalize */
function patch(
  diagnosis: DailyLearningDiagnosis,
  partial: Partial<DailyLearningDiagnosis>,
): DailyLearningDiagnosis {
  return normalizeDailyLearningDiagnosis({ ...diagnosis, ...partial })
}

function typeIntoFeedback(text: string): DailyLearningDiagnosis {
  let diagnosis = { ...EMPTY_DAILY_LEARNING_DIAGNOSIS }
  for (const ch of text) {
    diagnosis = patch(diagnosis, { teacherFeedback: diagnosis.teacherFeedback + ch })
  }
  return diagnosis
}

function highForm(patchFields: Partial<DailyTestFormData> = {}): DailyTestFormData {
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
    highFirstWrong: '4',
    highEndSession: 2,
    highSession3Questions: '',
    highSession4Questions: '',
    ...patchFields,
  }
}

function middleForm(patchFields: Partial<DailyTestFormData> = {}): DailyTestFormData {
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
    studentGrade: '중2',
    mathWrongCounts: { 1: '2', 2: '1', 3: '', 4: '' },
    ...patchFields,
  }
}

function englishForm(patchFields: Partial<DailyTestFormData> = {}): DailyTestFormData {
  return {
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
    ...patchFields,
  }
}

function asRecord(
  payload: ReturnType<typeof dailyTestFormToSavePayload>,
): DailyTestRecord {
  return {
    id: payload.id ?? 'dt-1',
    studentId: payload.studentId,
    date: payload.date,
    testName: payload.testName,
    subject: payload.subject,
    memo: payload.memo,
    score: payload.score ?? 0,
    totalScore: payload.totalScore ?? 100,
    percentage: payload.percentage ?? 0,
    incorrectCount: payload.incorrectCount ?? 0,
    sessionResults: payload.sessionResults,
    learningDiagnosis: payload.learningDiagnosis,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  }
}

{
  const src = readFileSync(new URL('./learningDiagnosis.ts', import.meta.url), 'utf8')
  assert.match(src, /teacherFeedback:\s*String\(row\.teacherFeedback \?\? ''\)/)
  assert.doesNotMatch(
    src,
    /teacherFeedback:\s*String\(row\.teacherFeedback \?\? ''\)\.trim\(\)/,
  )
}

// CASE 1 — 직접 입력 중 Space가 live state에 남는다
{
  const typed = typeIntoFeedback(SENTENCE)
  assert.equal(typed.teacherFeedback, SENTENCE)
  const afterSpace = typeIntoFeedback('계산 ')
  assert.equal(afterSpace.teacherFeedback, '계산 ')
}

// CASE 2 — 저장 payload 내부 공백 유지 (고등 high-recovery)
{
  const diagnosis = typeIntoFeedback(SENTENCE)
  const payload = dailyTestFormToSavePayload(
    highForm({
      learningDiagnosis: {
        ...diagnosis,
        conceptLackCount: 1,
        calculationErrorCount: 2,
      },
    }),
  )
  assert.equal(payload.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(payload.learningDiagnosis.mathDailyTestFormat, MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY)
}

// CASE 3 — 저장 후 row roundtrip / form reload 내부 공백 유지
{
  const payload = dailyTestFormToSavePayload(
    highForm({ learningDiagnosis: typeIntoFeedback(SENTENCE) }),
  )
  const row = dailyTestToRow(asRecord(payload))
  assert.equal(row.learning_diagnosis.teacherFeedback, SENTENCE)
  const reloaded = dailyTestFromRow(row)
  assert.equal(reloaded.learningDiagnosis.teacherFeedback, SENTENCE)
  const form = dailyTestRecordToForm(reloaded)
  assert.equal(form.learningDiagnosis.teacherFeedback, SENTENCE)
}

// CASE 4 — 화면 예시 문장
{
  const typed = typeIntoFeedback(SCREENSHOT)
  assert.equal(typed.teacherFeedback, SCREENSHOT)
  const payload = dailyTestFormToSavePayload(highForm({ learningDiagnosis: typed }))
  assert.equal(payload.learningDiagnosis.teacherFeedback, SCREENSHOT)
}

// CASE 5 — 여러 문장 / 줄바꿈
{
  const typed = typeIntoFeedback(MULTILINE)
  assert.equal(typed.teacherFeedback, MULTILINE)
  const payload = dailyTestFormToSavePayload(highForm({ learningDiagnosis: typed }))
  const reloaded = dailyTestFromRow(dailyTestToRow(asRecord(payload)))
  assert.equal(reloaded.learningDiagnosis.teacherFeedback, MULTILINE)
}

// CASE 6 — 중등/고등 해당 feedback
{
  const high = dailyTestFormToSavePayload(
    highForm({ learningDiagnosis: typeIntoFeedback(SENTENCE) }),
  )
  const middle = dailyTestFormToSavePayload(
    middleForm({ learningDiagnosis: typeIntoFeedback(SENTENCE) }),
  )
  const english = dailyTestFormToSavePayload(
    englishForm({ learningDiagnosis: typeIntoFeedback(SENTENCE) }),
  )
  assert.equal(high.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(middle.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(english.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(middle.learningDiagnosis.mathDailyTestFormat, 'fixed-wrong-v1')
  assert.equal(english.learningDiagnosis.mathDailyTestFormat, null)
}

// CASE 7 — 음성입력 결과 공백 보존 (기존 STT 경로를 바꾸지 않음)
{
  const 강나경 = { id: 'nagyeong', name: '강나경' }
  const parsed = parseStudentDailyTestVoice(
    '피드백 계산 과정이 길어서 혼자 풀기 어려웠습니다.',
    강나경,
    [강나경],
    false,
  )
  assert.equal(parsed.teacherFeedback, SENTENCE)
  const applied = applyStudentDailyTestDraft(
    { nagyeong: { rounds: [], learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS } } },
    '피드백 계산 과정이 길어서 혼자 풀기 어려웠습니다.',
    강나경,
    [강나경],
    [],
    '2026-09-21',
  )
  const fromVoice = applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback
  assert.equal(fromVoice, SENTENCE)
  const saved = dailyTestFormToSavePayload(
    highForm({
      learningDiagnosis: normalizeDailyLearningDiagnosis({
        ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
        teacherFeedback: fromVoice,
      }),
    }),
  )
  assert.equal(saved.learningDiagnosis.teacherFeedback, SENTENCE)
}

// CASE 8 — Today Report 저장 시 다른 daily test / 오답 분석 값은 그대로
{
  const diagnosis = patch(typeIntoFeedback(SENTENCE), {
    conceptLackCount: 1,
    calculationErrorCount: 3,
    applicationLackCount: 2,
    comprehensionLackCount: 4,
  })
  const high = dailyTestFormToSavePayload(
    highForm({
      highFirstWrong: '4',
      highEndSession: 2,
      learningDiagnosis: diagnosis,
    }),
  )
  assert.equal(high.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(high.learningDiagnosis.conceptLackCount, 1)
  assert.equal(high.learningDiagnosis.calculationErrorCount, 3)
  assert.equal(high.learningDiagnosis.applicationLackCount, 2)
  assert.equal(high.learningDiagnosis.comprehensionLackCount, 4)
  assert.equal(high.learningDiagnosis.mathHighFirstWrongCount, 4)
  assert.equal(high.learningDiagnosis.mathHighEndSession, 2)
  assert.equal(high.sessionResults.every((session) => session.status === '미응시'), true)

  const middle = dailyTestFormToSavePayload(
    middleForm({ learningDiagnosis: diagnosis }),
  )
  assert.equal(middle.learningDiagnosis.teacherFeedback, SENTENCE)
  assert.equal(middle.learningDiagnosis.conceptLackCount, 1)
  assert.equal(middle.learningDiagnosis.calculationErrorCount, 3)
  assert.equal(middle.sessionResults[0]?.incorrectCount, 2)
  assert.equal(middle.sessionResults[0]?.status, '합격')
  assert.equal(middle.sessionResults[1]?.status, '미응시')
}

{
  const formatted = applyFixedWrongFormatToDiagnosis(typeIntoFeedback(SENTENCE))
  assert.equal(formatted.teacherFeedback, SENTENCE)
  assert.equal(formatted.mathDailyTestFormat, 'fixed-wrong-v1')
}

{
  assert.equal(hasDailyLearningDiagnosisContent(typeIntoFeedback('   ')), false)
  assert.equal(hasDailyLearningDiagnosisContent(typeIntoFeedback(SENTENCE)), true)
}

console.log('learningDiagnosis.teacherFeedbackSpaces.test.ts: ok')
