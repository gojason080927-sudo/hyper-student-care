import { HUB_PUSH_INVOKE_TIMEOUT_MS, TEACHER_PUSH_TIMEOUT_MESSAGE, withTimeout } from './serviceWorkerActivation'
import { getSupabase } from './supabase'

export type HubPushInvokeBody = {
  event:
    | 'student_question_created'
    | 'student_inbox_created'
    | 'assignment_saved'
    | 'inbox_replied'
    | 'question_answered'
    | 'notice_saved'
    | 'material_saved'
    | 'video_saved'
    | 'weekly_summary_scan'
    | 'makeup_plan_saved'
  accessKey?: string
  entityId?: string
  studentIds?: string[]
  previous?: Record<string, unknown>
}

export type HubPushInvokeResult = {
  ok: boolean
  status?: string
}

export const HUB_MATERIAL_PUSH_FAILURE = '자료는 게시되었지만 알림 발송에 실패했습니다.'

const DELIVERY_OK = new Set([
  'sent',
  'skipped',
  'duplicate',
  'no_subscribers',
  'no_recipients',
  'ignored',
])

const DELIVERY_FAIL = new Set(['unauthorized', 'error', 'push_failed', 'not_configured'])

export function isHubPushDeliveryOk(result: HubPushInvokeResult): boolean {
  if (!result.ok) return false
  if (!result.status) return true
  if (DELIVERY_FAIL.has(result.status)) return false
  return DELIVERY_OK.has(result.status) || result.status.length > 0
}

export async function invokeHubPush(body: HubPushInvokeBody): Promise<HubPushInvokeResult> {
  try {
    const { data, error } = await withTimeout(
      getSupabase().functions.invoke('send-hub-push-notification', { body }),
      HUB_PUSH_INVOKE_TIMEOUT_MS,
      TEACHER_PUSH_TIMEOUT_MESSAGE,
    )
    if (error) {
      console.warn('[HubPush] invoke failed', error.message)
      return { ok: false, status: 'push_failed' }
    }
    const status =
      data && typeof data === 'object' && 'status' in data ? String((data as { status?: unknown }).status ?? '') : ''
    if (DELIVERY_FAIL.has(status)) {
      console.warn('[HubPush] invoke status', status)
      return { ok: false, status }
    }
    return { ok: true, status: status || 'sent' }
  } catch (error) {
    console.warn('[HubPush] invoke failed', error instanceof Error ? error.message : error)
    return { ok: false, status: 'push_failed' }
  }
}

export function notifyHubPush(body: HubPushInvokeBody): void {
  void invokeHubPush(body)
}
