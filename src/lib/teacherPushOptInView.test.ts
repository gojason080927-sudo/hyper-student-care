/**
 * 실행: npx tsx src/lib/teacherPushOptInView.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  TEACHER_PUSH_CHECKING_HINT,
  TEACHER_PUSH_DENIED_HINT,
  TEACHER_PUSH_IOS_HINT,
  TEACHER_PUSH_LOGIN_HINT,
  TEACHER_PUSH_UNSUPPORTED_HINT,
  TEACHER_PUSH_VAPID_HINT,
  resolveTeacherPushOptInView,
  teacherPushLoginHintAllowed,
} from './teacherPushOptInView.ts'

const optIn = readFileSync('src/components/teacherMobile/TeacherPushOptIn.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const teacherPush = readFileSync('src/lib/teacherPushClient.ts', 'utf8')

const base = {
  vapidReady: true,
  capabilitySupported: true,
  permission: 'default' as const,
}

assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: true,
    hasSession: false,
    phase: 'checking',
  }).hint,
  TEACHER_PUSH_CHECKING_HINT,
)
assert.equal(teacherPushLoginHintAllowed(false, true), false)

assert.deepEqual(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: false,
    phase: 'ready',
  }),
  { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_LOGIN_HINT, canRequest: false },
)
assert.equal(teacherPushLoginHintAllowed(false, false), true)

const afterSession = resolveTeacherPushOptInView({
  ...base,
  authLoading: false,
  hasSession: true,
  phase: 'checking',
})
assert.equal(afterSession.hint, TEACHER_PUSH_CHECKING_HINT)
assert.notEqual(afterSession.hint, TEACHER_PUSH_LOGIN_HINT)
assert.equal(teacherPushLoginHintAllowed(true, false), false)
assert.equal(teacherPushLoginHintAllowed(true, true), false)

assert.deepEqual(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    permission: 'default',
    phase: 'ready',
  }),
  { statusLabel: '알림 꺼짐', hint: '', canRequest: true },
)

assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    permission: 'granted',
    phase: 'ensuring',
  }).hint,
  TEACHER_PUSH_CHECKING_HINT,
)

assert.deepEqual(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    permission: 'granted',
    phase: 'ready',
  }),
  { statusLabel: '알림 켜짐', hint: '', canRequest: false },
)

const ensureFailed = resolveTeacherPushOptInView({
  ...base,
  authLoading: false,
  hasSession: true,
  permission: 'granted',
  phase: 'error',
  errorMessage: '알림 등록 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
})
assert.equal(ensureFailed.statusLabel, '알림 꺼짐')
assert.equal(ensureFailed.canRequest, true)
assert.match(ensureFailed.hint, /알림 등록 시간이 초과/)

assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    permission: 'denied',
    phase: 'ready',
  }).hint,
  TEACHER_PUSH_DENIED_HINT,
)

assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    vapidReady: false,
    phase: 'ready',
  }).hint,
  TEACHER_PUSH_VAPID_HINT,
)
assert.notEqual(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    vapidReady: false,
    phase: 'ready',
  }).hint,
  TEACHER_PUSH_LOGIN_HINT,
)

assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    capabilitySupported: false,
    capabilityReason: 'unsupported',
    phase: 'ready',
  }).hint,
  TEACHER_PUSH_UNSUPPORTED_HINT,
)
assert.equal(
  resolveTeacherPushOptInView({
    ...base,
    authLoading: false,
    hasSession: true,
    capabilitySupported: false,
    capabilityReason: 'ios-install-required',
    phase: 'ready',
  }).hint,
  TEACHER_PUSH_IOS_HINT,
)

assert.match(optIn, /const \{ session, isLoading \} = useAuth\(\)/)
assert.match(optIn, /\[session, isLoading\]/)
assert.match(optIn, /resolveTeacherPushOptInView/)
assert.doesNotMatch(optIn, /getSession\(/)
assert.match(teacherPush, /waitForActiveServiceWorker/)
assert.doesNotMatch(teacherPush, /navigator\.serviceWorker\.ready/)
assert.match(teacherPush, /withTimeout\(\s*navigator\.serviceWorker\.getRegistration/)
assert.match(app, /Route element=\{<AppLayout \/>\}/)

console.log('teacherPushOptInView tests passed')
