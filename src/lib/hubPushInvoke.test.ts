/**
 * 실행: npx tsx src/lib/hubPushInvoke.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { HUB_MATERIAL_PUSH_FAILURE, isHubPushDeliveryOk } from './hubPushInvoke.ts'

const invokeSrc = readFileSync('src/lib/hubPushInvoke.ts', 'utf8')
const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')

assert.match(invokeSrc, /HUB_PUSH_INVOKE_TIMEOUT_MS/)
assert.match(invokeSrc, /withTimeout/)
assert.match(teacherCms, /invokeHubPush\(\{ event: 'material_saved'/)
assert.match(teacherCms, /HUB_MATERIAL_PUSH_FAILURE/)
assert.match(teacherCms, /isHubPushDeliveryOk/)
assert.match(teacherCms, /hubMaterialBatchPushEntityId/)
assert.equal((teacherCms.match(/event: 'material_saved'/g) ?? []).length, 3)

assert.equal(isHubPushDeliveryOk({ ok: true, status: 'sent' }), true)
assert.equal(isHubPushDeliveryOk({ ok: true, status: 'no_subscribers' }), true)
assert.equal(isHubPushDeliveryOk({ ok: true, status: 'no_recipients' }), true)
assert.equal(isHubPushDeliveryOk({ ok: true, status: 'duplicate' }), true)
assert.equal(isHubPushDeliveryOk({ ok: true, status: 'skipped' }), true)
assert.equal(isHubPushDeliveryOk({ ok: false, status: 'push_failed' }), false)
assert.equal(isHubPushDeliveryOk({ ok: false, status: 'not_configured' }), false)
assert.equal(isHubPushDeliveryOk({ ok: false, status: 'unauthorized' }), false)
assert.equal(HUB_MATERIAL_PUSH_FAILURE, '자료는 게시되었지만 알림 발송에 실패했습니다.')

console.log('hubPushInvoke tests passed')
