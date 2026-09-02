export type ParentPushCapability =
  | { supported: false; reason: 'unsupported' }
  | { supported: false; reason: 'ios-install-required' }
  | { supported: true; reason: 'ready' }

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function hasWebPushApis(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getParentPushCapability(): ParentPushCapability {
  if (!hasWebPushApis()) {
    if (isIosDevice() && !isStandaloneDisplay()) {
      return { supported: false, reason: 'ios-install-required' }
    }
    return { supported: false, reason: 'unsupported' }
  }
  if (isIosDevice() && !isStandaloneDisplay()) {
    return { supported: false, reason: 'ios-install-required' }
  }
  return { supported: true, reason: 'ready' }
}

export function getVapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? ''
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function buildParentReportNotificationBody(studentName: string): string {
  const name = studentName.trim()
  return name
    ? `${name} 학생의 오늘 학습보고가 등록되었습니다.`
    : '학생의 오늘 학습보고가 등록되었습니다.'
}

export function shouldSendCompletionPush(alreadyCompleted: boolean): boolean {
  return !alreadyCompleted
}
