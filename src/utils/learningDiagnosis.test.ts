/**
 * 일일테스트 학습진단 정규화 — 강사 피드백 공백 보존
 * npx tsx src/utils/learningDiagnosis.test.ts
 */
import assert from 'node:assert/strict'
import {
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
} from './learningDiagnosis'
import { dailyTestFormToSavePayload, emptyDailyTestForm } from './dailyTest'

const sentence = '오늘 계산 실수가 조금 있었지만 개념 이해는 좋았습니다.'

const kept = normalizeDailyLearningDiagnosis({
  teacherFeedback: sentence,
})
assert.equal(kept.teacherFeedback, sentence)

const midEdit = normalizeDailyLearningDiagnosis({
  teacherFeedback: '오늘  계산 실수',
})
assert.equal(midEdit.teacherFeedback, '오늘  계산 실수')

const trailing = normalizeDailyLearningDiagnosis({
  teacherFeedback: '오늘 ',
})
assert.equal(trailing.teacherFeedback, '오늘 ')

const leadingAndTrailing = normalizeDailyLearningDiagnosis({
  teacherFeedback: ' 오늘 숙제 ',
})
assert.equal(leadingAndTrailing.teacherFeedback, ' 오늘 숙제 ')

const deleted = normalizeDailyLearningDiagnosis({
  teacherFeedback: '오늘 계산',
})
assert.equal(deleted.teacherFeedback, '오늘 계산')

assert.equal(hasDailyLearningDiagnosisContent(kept), true)
assert.equal(
  hasDailyLearningDiagnosisContent({ teacherFeedback: '   ' }),
  false,
)

const form = emptyDailyTestForm()
form.learningDiagnosis = {
  ...form.learningDiagnosis,
  teacherFeedback: sentence,
}
const payload = dailyTestFormToSavePayload(form)
assert.equal(payload.learningDiagnosis.teacherFeedback, sentence)

console.log('learningDiagnosis teacherFeedback space tests passed.')
