/**
 * 실행: npx tsx src/lib/serviceWorkerActivation.test.ts
 */
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'

import {
  TEACHER_PUSH_TIMEOUT_MESSAGE,
  waitForActiveServiceWorker,
  withTimeout,
} from './serviceWorkerActivation.ts'

const teacherPush = readFileSync('src/lib/teacherPushClient.ts', 'utf8')
const optIn = readFileSync('src/components/teacherMobile/TeacherPushOptIn.tsx', 'utf8')

assert.doesNotMatch(teacherPush, /navigator\.serviceWorker\.ready/)
assert.match(teacherPush, /waitForActiveServiceWorker/)
assert.match(teacherPush, /withTimeout/)
assert.match(teacherPush, /TEACHER_PUSH_TIMEOUT_MESSAGE/)
assert.match(optIn, /teacherPushUserMessage/)
assert.match(optIn, /setCanRequest\(true\)/)
assert.match(optIn, /busy \? '등록 중…' : '알림 받기'/)

await assert.rejects(
  withTimeout(new Promise(() => {}), 5, TEACHER_PUSH_TIMEOUT_MESSAGE),
  (error: unknown) => error instanceof Error && error.message === TEACHER_PUSH_TIMEOUT_MESSAGE,
)

const resolved = await withTimeout(Promise.resolve('ok'), 50, TEACHER_PUSH_TIMEOUT_MESSAGE)
assert.equal(resolved, 'ok')

class FakeWorker extends EventEmitter {
  state: ServiceWorkerState
  constructor(state: ServiceWorkerState) {
    super()
    this.state = state
  }
  addEventListener(type: string, listener: () => void) {
    this.on(type, listener)
  }
  removeEventListener(type: string, listener: () => void) {
    this.off(type, listener)
  }
  activate() {
    this.state = 'activated'
    this.emit('statechange')
  }
}

const alreadyActive = {
  active: { scriptURL: 'https://example.test/teacher/sw.js' },
  installing: null,
  waiting: null,
} as unknown as ServiceWorkerRegistration
assert.equal(await waitForActiveServiceWorker(alreadyActive, 20), alreadyActive)

const installing = new FakeWorker('installing')
const pendingReg = {
  active: null as { scriptURL: string } | null,
  installing,
  waiting: null,
} as unknown as ServiceWorkerRegistration
const pending = waitForActiveServiceWorker(pendingReg, 50)
queueMicrotask(() => {
  pendingReg.active = { scriptURL: 'https://example.test/teacher/sw.js' }
  installing.activate()
})
assert.equal(await pending, pendingReg)

const hanging = {
  active: null,
  installing: new FakeWorker('installing'),
  waiting: null,
} as unknown as ServiceWorkerRegistration
await assert.rejects(
  waitForActiveServiceWorker(hanging, 8),
  (error: unknown) => error instanceof Error && error.message === TEACHER_PUSH_TIMEOUT_MESSAGE,
)

console.log('serviceWorkerActivation tests passed')
