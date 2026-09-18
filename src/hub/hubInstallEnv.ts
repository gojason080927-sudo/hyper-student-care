export type HubInstallGuideKind =
  | 'hidden'
  | 'in-app'
  | 'android-install'
  | 'android-menu'
  | 'ios-safari'
  | 'ios-safari-needed'

const IN_APP_UA =
  /KAKAOTALK|Instagram|FBAN|FBAV|FBIOS|Line\/|NAVER\(|Snapchat|Twitter|Weibo|; wv\)|WebView/i

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_UA.test(userAgent)
}

export function isIosUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent)
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

export function isIosSafariBrowser(userAgent: string): boolean {
  if (!isIosUserAgent(userAgent) || isInAppBrowser(userAgent)) return false
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)) return false
  return /Safari/i.test(userAgent)
}

export function resolveHubInstallGuide(input: {
  userAgent: string
  standalone: boolean
  canInstall: boolean
}): HubInstallGuideKind {
  if (input.standalone) return 'hidden'
  if (isInAppBrowser(input.userAgent)) return 'in-app'
  if (input.canInstall && !isIosUserAgent(input.userAgent)) return 'android-install'
  if (isIosSafariBrowser(input.userAgent)) return 'ios-safari'
  if (isIosUserAgent(input.userAgent)) return 'ios-safari-needed'
  if (isAndroidUserAgent(input.userAgent)) return 'android-menu'
  return 'hidden'
}
