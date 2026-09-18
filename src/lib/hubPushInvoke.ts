import { getSupabase } from './supabase'

export type HubPushInvokeBody = {
  event:
    | 'student_question_created'
    | 'student_inbox_created'
    | 'assignment_saved'
    | 'inbox_replied'
    | 'question_answered'
    | 'notice_saved'
    | 'weekly_summary_scan'
  accessKey?: string
  entityId?: string
  previous?: Record<string, unknown>
}

export async function invokeHubPush(body: HubPushInvokeBody): Promise<void> {
  const { error } = await getSupabase().functions.invoke('send-hub-push-notification', {
    body,
  })
  if (error) {
    console.warn('[HubPush] invoke failed', error.message)
  }
}

export function notifyHubPush(body: HubPushInvokeBody): void {
  void invokeHubPush(body).catch(() => {})
}
