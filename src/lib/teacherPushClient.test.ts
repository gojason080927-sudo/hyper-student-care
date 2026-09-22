/**
 * 실행: npx tsx src/lib/teacherPushClient.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { teacherPushUserMessage } from './teacherPushClient.ts'
import { TEACHER_PUSH_TIMEOUT_MESSAGE } from './serviceWorkerActivation.ts'

const client = readFileSync('src/lib/teacherPushClient.ts', 'utf8')
const optIn = readFileSync('src/components/teacherMobile/TeacherPushOptIn.tsx', 'utf8')

assert.doesNotMatch(client, /navigator\.serviceWorker\.ready/)
assert.match(client, /waitForActiveServiceWorker\(registered\)/)
assert.match(client, /existingKey/)
assert.match(client, /sameBytes\(existingKey, expectedKey\)/)
assert.match(client, /inFlightSync = null/)
assert.match(optIn, /setBusy\(false\)/)
assert.match(optIn, /setCanRequest\(true\)/)

assert.equal(teacherPushUserMessage(new Error(TEACHER_PUSH_TIMEOUT_MESSAGE)), TEACHER_PUSH_TIMEOUT_MESSAGE)
assert.equal(
  teacherPushUserMessage(new Error('알림이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.')),
  '알림이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.',
)
assert.equal(teacherPushUserMessage(new Error('fetch failed')), '알림 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')
assert.equal(teacherPushUserMessage(new TypeError('Failed to fetch')), '알림 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.')

console.log('teacherPushClient tests passed')
