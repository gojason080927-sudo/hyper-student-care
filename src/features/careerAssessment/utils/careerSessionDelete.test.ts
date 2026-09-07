/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerSessionDelete.test.ts
 */
import assert from 'node:assert/strict'
import {
  CAREER_ENDED_LINK_MESSAGE,
  careerSessionDeleteCopy,
  isCareerLinkEndedError,
  listRowHasDeletableSession,
} from './careerSessionDelete.ts'

const inProgress = careerSessionDeleteCopy({
  name: '강나경',
  status: 'in_progress',
  answeredCount: 10,
})
assert.equal(inProgress.confirmLabel, '검사 삭제')
assert.match(inProgress.message, /강나경 학생의 진행 중인 진로적성검사/)
assert.match(inProgress.message, /10개의 응답/)
assert.match(inProgress.message, /학생 정보와 다른 학습 데이터는 삭제되지 않습니다/)
assert.doesNotMatch(inProgress.message, /students/)

const completed = careerSessionDeleteCopy({
  name: '진로검사 테스트학생',
  status: 'completed',
  answeredCount: 88,
  latestResultId: 'r1',
})
assert.match(completed.message, /완료된 진로적성검사와 검사 결과/)
assert.match(completed.message, /진로검사 테스트학생/)

const notStarted = careerSessionDeleteCopy({ name: '홍길동', status: 'not_started', answeredCount: 0 })
assert.match(notStarted.message, /아직 시작하지 않은 검사 링크/)

assert.equal(isCareerLinkEndedError({ error: 'invalid_token' }), true)
assert.equal(isCareerLinkEndedError(Object.assign(new Error('invalid_token'), { error: 'invalid_token' })), true)
assert.equal(isCareerLinkEndedError({ error: 'not_authenticated' }), false)
assert.equal(listRowHasDeletableSession({ id: 's1' }), true)
assert.equal(listRowHasDeletableSession(undefined), false)
assert.match(CAREER_ENDED_LINK_MESSAGE, /유효하지 않거나 종료된 검사 링크/)

console.log('careerSessionDelete tests OK')
