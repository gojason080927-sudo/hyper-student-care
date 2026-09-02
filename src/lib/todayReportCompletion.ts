import { getSupabase } from './supabase'
import { shouldSendCompletionPush } from './parentPushSupport'

export type TodayReportCompletionState = {
  completed: boolean
  completedAt: string | null
  notificationSentAt: string | null
}

export type CompleteTodayReportResult =
  | { status: 'completed'; push: 'sent' | 'no_subscribers' | 'failed' | 'skipped' }
  | { status: 'already_completed'; push: 'skipped' }
  | { status: 'error'; message: string }

export async function fetchTodayReportCompletion(
  studentId: string,
  reportDate: string,
): Promise<TodayReportCompletionState> {
  const { data, error } = await getSupabase().rpc('get_today_report_completion', {
    p_student_id: studentId,
    p_report_date: reportDate,
  })

  if (error || !data || typeof data !== 'object') {
    return { completed: false, completedAt: null, notificationSentAt: null }
  }

  const row = data as { completed_at?: unknown; notification_sent_at?: unknown }
  return {
    completed: Boolean(row.completed_at),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    notificationSentAt:
      typeof row.notification_sent_at === 'string' ? row.notification_sent_at : null,
  }
}

export async function markTodayReportCompleted(
  studentId: string,
  reportDate: string,
): Promise<{ alreadyCompleted: boolean }> {
  const { data, error } = await getSupabase().rpc('mark_today_report_completed', {
    p_student_id: studentId,
    p_report_date: reportDate,
  })
  if (error) throw error
  const row = data as { already_completed?: boolean } | null
  return { alreadyCompleted: Boolean(row?.already_completed) }
}

export async function completeTodayReportAndNotify(params: {
  studentId: string
  reportDate: string
}): Promise<CompleteTodayReportResult> {
  try {
    const { data: sessionData } = await getSupabase().auth.getSession()
    if (!sessionData.session) {
      return { status: 'error', message: '강사 로그인이 필요합니다' }
    }

    const { alreadyCompleted } = await markTodayReportCompleted(
      params.studentId,
      params.reportDate,
    )
    if (!shouldSendCompletionPush(alreadyCompleted)) {
      return { status: 'already_completed', push: 'skipped' }
    }

    const { data, error } = await getSupabase().functions.invoke(
      'send-parent-report-notification',
      {
        body: {
          student_id: params.studentId,
          report_date: params.reportDate,
        },
      },
    )

    if (error) {
      return { status: 'completed', push: 'failed' }
    }

    const payload = data as { status?: string } | null
    if (payload?.status === 'no_subscribers') {
      return { status: 'completed', push: 'no_subscribers' }
    }
    if (payload?.status === 'already_sent' || payload?.status === 'sent') {
      return { status: 'completed', push: 'sent' }
    }
    if (payload?.status === 'push_failed') {
      return { status: 'completed', push: 'failed' }
    }
    return { status: 'completed', push: 'sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : '완료 처리에 실패했습니다.'
    return { status: 'error', message }
  }
}
