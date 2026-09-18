import {
  getParentPushCapability,
  getVapidPublicKey,
  urlBase64ToUint8Array,
} from './parentPushSupport'
import {
  rpcDeactivateStudentPushSubscription,
  rpcGetStudentPushSubscriptionStatus,
  rpcUpsertStudentPushSubscription,
} from './db/hubPushRpc'

const STUDENT_SW_URL = '/hub/sw.js'
const STUDENT_SW_SCOPE = '/hub/'
const inFlightSyncByAccessKey = new Map<string, Promise<void>>()

export async function registerStudentServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration(STUDENT_SW_SCOPE)
  if (existing?.active?.scriptURL.includes('/hub/sw.js')) {
    return existing
  }
  return navigator.serviceWorker.register(STUDENT_SW_URL, { scope: STUDENT_SW_SCOPE })
}

function subscriptionKeys(subscription: PushSubscription): { p256dh: string; auth: string } {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh ?? ''
  const auth = json.keys?.auth ?? ''
  if (!p256dh || !auth) {
    throw new Error('푸시 구독 키가 없습니다.')
  }
  return { p256dh, auth }
}

function toUint8Array(buffer: ArrayBuffer | null): Uint8Array | null {
  return buffer ? new Uint8Array(buffer) : null
}

function sameBytes(left: Uint8Array | null, right: Uint8Array): boolean {
  if (!left || left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
  vapidKey: string,
): Promise<PushSubscription> {
  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/push service not available/i.test(message)) {
      throw new Error('이 환경에서는 푸시 서비스를 사용할 수 없습니다. 휴대폰 브라우저에서 다시 시도해 주세요.')
    }
    throw error instanceof Error ? error : new Error('알림 등록에 실패했습니다.')
  }
}

async function syncStudentPushSubscription(
  accessKey: string,
  options: { allowPermissionPrompt: boolean },
): Promise<void> {
  const capability = getParentPushCapability()
  if (!capability.supported) {
    throw new Error(
      capability.reason === 'ios-install-required'
        ? '아이폰에서는 홈 화면에 추가한 뒤에 알림을 받을 수 있습니다.'
        : '이 브라우저에서는 푸시 알림을 지원하지 않습니다.',
    )
  }
  const vapid = getVapidPublicKey()
  if (!vapid) {
    throw new Error('알림 설정이 아직 준비되지 않았습니다.')
  }

  let permission = Notification.permission
  if (permission === 'default' && options.allowPermissionPrompt) {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? '알림이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.'
        : '알림 권한이 허용되지 않았습니다.',
    )
  }

  await registerStudentServiceWorker()
  await navigator.serviceWorker.ready
  const registration = await navigator.serviceWorker.getRegistration(STUDENT_SW_SCOPE)
  if (!registration) {
    throw new Error('알림 서비스를 등록하지 못했습니다.')
  }

  const expectedKey = urlBase64ToUint8Array(vapid)
  const existing = await registration.pushManager.getSubscription()
  let subscription = existing

  if (existing) {
    const existingKey = toUint8Array(existing.options.applicationServerKey)
    if (!sameBytes(existingKey, expectedKey)) {
      const oldEndpoint = existing.endpoint
      const unsubscribed = await existing.unsubscribe()
      if (!unsubscribed) {
        throw new Error('기존 알림 구독을 해제하지 못했습니다.')
      }
      subscription = await createSubscription(registration, vapid)
      if (oldEndpoint !== subscription.endpoint) {
        await rpcDeactivateStudentPushSubscription({ accessKey, endpoint: oldEndpoint })
      }
    }
  }

  if (!subscription) {
    subscription = await createSubscription(registration, vapid)
  }

  const keys = subscriptionKeys(subscription)
  await rpcUpsertStudentPushSubscription({
    accessKey,
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  })
}

export async function subscribeStudentPush(accessKey: string): Promise<void> {
  await syncStudentPushSubscription(accessKey, { allowPermissionPrompt: true })
}

export async function ensureStudentPushSubscription(accessKey: string): Promise<void> {
  const existing = inFlightSyncByAccessKey.get(accessKey)
  if (existing) return existing

  const promise = syncStudentPushSubscription(accessKey, { allowPermissionPrompt: false }).finally(
    () => {
      inFlightSyncByAccessKey.delete(accessKey)
    },
  )
  inFlightSyncByAccessKey.set(accessKey, promise)
  return promise
}

export async function getStudentPushUiState(accessKey: string): Promise<{
  capability: ReturnType<typeof getParentPushCapability>
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
}> {
  const capability = getParentPushCapability()
  if (!capability.supported || typeof Notification === 'undefined') {
    return { capability, permission: 'unsupported', subscribed: false }
  }

  let subscribed = false
  try {
    const registration = await navigator.serviceWorker.getRegistration(STUDENT_SW_SCOPE)
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) {
      subscribed = await rpcGetStudentPushSubscriptionStatus(accessKey, subscription.endpoint)
    }
  } catch {
    subscribed = false
  }

  return {
    capability,
    permission: Notification.permission,
    subscribed,
  }
}
