/**
 * 실행: npx tsx src/lib/parentPushSupport.test.ts
 */
import assert from 'node:assert/strict'
import {
  buildParentReportNotificationBody,
  shouldSendCompletionPush,
  urlBase64ToUint8Array,
} from './parentPushSupport'

assert.equal(
  buildParentReportNotificationBody('이세현'),
  '이세현 학생의 오늘 학습보고가 등록되었습니다.',
)
assert.equal(
  buildParentReportNotificationBody('  '),
  '학생의 오늘 학습보고가 등록되었습니다.',
)

assert.equal(shouldSendCompletionPush(false), true)
assert.equal(shouldSendCompletionPush(true), false)

const bytes = urlBase64ToUint8Array('AQID')
assert.deepEqual([...bytes], [1, 2, 3])

console.log('parentPushSupport OK')
