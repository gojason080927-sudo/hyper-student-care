/**
 * 실행: npx tsx src/hub/hubInboxWrite.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HUB_INBOX_REPLY_SAVE_FAILURE,
  HUB_INBOX_REPLY_SAVE_SUCCESS,
  hubInboxReplyUpdatePayload,
  hubInboxStatusUpdatePayload,
  mergePatchedHubInboxItem,
  requireHubInboxUpdatedRow,
  toastsForHubInboxReplyPersist,
} from './hubInboxWrite.ts'

const repliedAt = '2026-09-21T12:00:00.000Z'

// CASE 1: 올바른 row id와 answer payload
const replyPayload = hubInboxReplyUpdatePayload('  네 안산시와 협의해 보겠습니다  ', repliedAt)
assert.deepEqual(replyPayload, {
  teacher_reply: '네 안산시와 협의해 보겠습니다',
  teacher_replied_at: repliedAt,
})
assert.equal('status' in replyPayload, false)
assert.equal('content' in replyPayload, false)

assert.deepEqual(hubInboxReplyUpdatePayload('   ', repliedAt), {
  teacher_reply: '',
  teacher_replied_at: null,
})

const saved = requireHubInboxUpdatedRow(
  { id: 'inbox-1', teacher_reply: '네 안산시와 협의해 보겠습니다' },
  'inbox-1',
  HUB_INBOX_REPLY_SAVE_FAILURE,
)
assert.equal(saved.teacher_reply, '네 안산시와 협의해 보겠습니다')

assert.throws(
  () => requireHubInboxUpdatedRow(null, 'inbox-1', HUB_INBOX_REPLY_SAVE_FAILURE),
  /답변 저장에 실패했습니다/,
)
assert.throws(
  () => requireHubInboxUpdatedRow({ id: 'other' }, 'inbox-1', HUB_INBOX_REPLY_SAVE_FAILURE),
  /답변 저장에 실패했습니다/,
)

// CASE 2 / 4: persist 결과에 따라 토스트가 갈린다
assert.deepEqual(toastsForHubInboxReplyPersist({ persist: 'ok', reload: 'ok' }), [
  HUB_INBOX_REPLY_SAVE_SUCCESS,
])
assert.deepEqual(toastsForHubInboxReplyPersist({ persist: 'failed' }), [
  HUB_INBOX_REPLY_SAVE_FAILURE,
])

// CASE 3: 저장 성공 후 reload 실패는 저장 실패로 표시하지 않는다
assert.deepEqual(toastsForHubInboxReplyPersist({ persist: 'ok', reload: 'failed' }), [
  HUB_INBOX_REPLY_SAVE_SUCCESS,
])
assert.equal(
  toastsForHubInboxReplyPersist({ persist: 'ok', reload: 'failed' }).includes(
    HUB_INBOX_REPLY_SAVE_FAILURE,
  ),
  false,
)

// CASE 7 / 8: status payload는 답변을 건드리지 않고, 답변 payload는 status를 건드리지 않는다
assert.deepEqual(hubInboxStatusUpdatePayload('처리중'), { status: '처리중' })
assert.equal('teacher_reply' in hubInboxStatusUpdatePayload('완료'), false)
const afterStatus = mergePatchedHubInboxItem(
  [{ id: 'inbox-1', teacherReply: '네 안산시와 협의해 보겠습니다', status: '접수' }],
  'inbox-1',
  { status: '완료', teacherReply: '네 안산시와 협의해 보겠습니다' },
)
assert.equal(afterStatus[0]?.status, '완료')
assert.equal(afterStatus[0]?.teacherReply, '네 안산시와 협의해 보겠습니다')
const afterReply = mergePatchedHubInboxItem(afterStatus, 'inbox-1', {
  teacherReply: '일정 확인 후 다시 안내드리겠습니다.',
})
assert.equal(afterReply[0]?.status, '완료')
assert.equal(afterReply[0]?.teacherReply, '일정 확인 후 다시 안내드리겠습니다.')

const page = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
assert.match(page, /HUB_INBOX_REPLY_SAVE_SUCCESS/)
assert.match(page, /onItemPatched/)
assert.match(page, /await onChanged\(\)\.catch\(\(\) => undefined\)/)
assert.match(page, /저장 중…/)
assert.match(page, /showToast\(err instanceof Error \? err\.message : HUB_INBOX_REPLY_SAVE_FAILURE\)/)
assert.doesNotMatch(
  page,
  /await teacherSaveInboxReply\([\s\S]*?await onChanged\(\)\n\s*\} finally/,
)

const repo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
assert.match(repo, /hubInboxReplyUpdatePayload/)
assert.match(repo, /hubInboxStatusUpdatePayload/)
assert.match(repo, /requireHubInboxUpdatedRow/)
assert.match(repo, /\.select\('id, teacher_reply, teacher_replied_at, status'\)/)
assert.match(repo, /\.select\('id, status, teacher_reply'\)/)
assert.match(repo, /\.maybeSingle\(\)/)

const studentCard = readFileSync('src/hub/HubInboxItemCard.tsx', 'utf8')
assert.match(studentCard, /item\.teacherReply/)
assert.match(studentCard, /교사 답변/)

console.log('hubInboxWrite.test.ts passed')
