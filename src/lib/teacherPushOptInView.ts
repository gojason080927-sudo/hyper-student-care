export const TEACHER_PUSH_LOGIN_HINT = '강사 로그인 후 이 기기에서 알림을 받을 수 있습니다.'
export const TEACHER_PUSH_CHECKING_HINT = '알림 상태 확인 중…'
export const TEACHER_PUSH_VAPID_HINT = '알림 설정이 아직 준비되지 않았습니다.'
export const TEACHER_PUSH_UNSUPPORTED_HINT = '이 브라우저에서는 푸시 알림을 지원하지 않습니다.'
export const TEACHER_PUSH_IOS_HINT =
  '아이폰·아이패드에서는 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다.'
export const TEACHER_PUSH_DENIED_HINT =
  '알림이 차단되어 있습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.'

export type TeacherPushOptInView = {
  statusLabel: string
  hint: string
  canRequest: boolean
}

export type TeacherPushOptInInput = {
  authLoading: boolean
  hasSession: boolean
  vapidReady: boolean
  capabilitySupported: boolean
  capabilityReason?: 'ios-install-required' | 'unsupported' | 'ready'
  permission: NotificationPermission | 'unsupported' | null
  phase: 'checking' | 'ensuring' | 'ready' | 'error'
  errorMessage?: string
}

export function resolveTeacherPushOptInView(input: TeacherPushOptInInput): TeacherPushOptInView {
  if (input.authLoading) {
    return { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_CHECKING_HINT, canRequest: false }
  }

  if (!input.hasSession) {
    return { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_LOGIN_HINT, canRequest: false }
  }

  if (input.phase === 'checking' || input.phase === 'ensuring') {
    return { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_CHECKING_HINT, canRequest: false }
  }

  if (!input.vapidReady) {
    return { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_VAPID_HINT, canRequest: false }
  }

  if (!input.capabilitySupported) {
    return {
      statusLabel: '알림 꺼짐',
      hint:
        input.capabilityReason === 'ios-install-required'
          ? TEACHER_PUSH_IOS_HINT
          : TEACHER_PUSH_UNSUPPORTED_HINT,
      canRequest: false,
    }
  }

  if (input.permission === 'denied') {
    return { statusLabel: '알림 꺼짐', hint: TEACHER_PUSH_DENIED_HINT, canRequest: false }
  }

  if (input.phase === 'error') {
    return {
      statusLabel: '알림 꺼짐',
      hint: input.errorMessage || '알림 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      canRequest: true,
    }
  }

  if (input.permission === 'granted') {
    return { statusLabel: '알림 켜짐', hint: '', canRequest: false }
  }

  return { statusLabel: '알림 꺼짐', hint: '', canRequest: true }
}

export function teacherPushLoginHintAllowed(hasSession: boolean, authLoading: boolean): boolean {
  return !authLoading && !hasSession
}
