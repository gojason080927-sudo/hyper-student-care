const LOGIN_RETURN_KEY = 'hyper_teacher_login_return'

export function saveTeacherLoginReturn(path: string): void {
  if (!path.startsWith('/teacher/mobile')) return
  sessionStorage.setItem(LOGIN_RETURN_KEY, path)
}

export function getTeacherLoginReturn(): string | null {
  const stored = sessionStorage.getItem(LOGIN_RETURN_KEY)
  if (stored?.startsWith('/teacher/mobile')) return stored
  return null
}

export function clearTeacherLoginReturn(): void {
  sessionStorage.removeItem(LOGIN_RETURN_KEY)
}

export function resolveTeacherLoginReturn(
  stateFrom: string | undefined,
  queryReturnTo: string | null,
): string {
  return (
    stateFrom?.trim() ||
    queryReturnTo?.trim() ||
    getTeacherLoginReturn() ||
    '/'
  )
}

export const TEACHER_MOBILE_LOGIN_PATH = '/teacher/mobile/login'

export function isTeacherMobileLoginPath(pathname: string): boolean {
  return pathname === TEACHER_MOBILE_LOGIN_PATH
}

export function isTeacherMobileLoginContext(returnTo: string): boolean {
  return returnTo.startsWith('/teacher/mobile')
}
