export const SERVICE_WORKER_ACTIVATE_TIMEOUT_MS = 15_000
export const PUSH_SUBSCRIBE_TIMEOUT_MS = 20_000
export const PUSH_RPC_TIMEOUT_MS = 15_000
export const HUB_PUSH_INVOKE_TIMEOUT_MS = 20_000

export const TEACHER_PUSH_TIMEOUT_MESSAGE =
  '알림 등록 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  schedule: typeof setTimeout = setTimeout,
  cancel: typeof clearTimeout = clearTimeout,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = schedule(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) cancel(timer)
  })
}

/** Document-scoped navigator.serviceWorker.ready 를 쓰지 않는다. 페이지가 SW scope 밖이면 ready는 영구 pending 된다. */
export async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs = SERVICE_WORKER_ACTIVATE_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration
  const pending = registration.installing ?? registration.waiting
  if (!pending) {
    throw new Error('알림 서비스를 등록하지 못했습니다.')
  }
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const onChange = () => {
        if (registration.active || pending.state === 'activated') {
          pending.removeEventListener('statechange', onChange)
          resolve()
          return
        }
        if (pending.state === 'redundant') {
          pending.removeEventListener('statechange', onChange)
          reject(new Error('알림 서비스를 등록하지 못했습니다.'))
        }
      }
      pending.addEventListener('statechange', onChange)
      onChange()
    }),
    timeoutMs,
    TEACHER_PUSH_TIMEOUT_MESSAGE,
  )
  if (!registration.active && pending.state !== 'activated') {
    throw new Error('알림 서비스를 등록하지 못했습니다.')
  }
  return registration
}
