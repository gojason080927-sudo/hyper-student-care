import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PushRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isGoneStatus(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) {
    return jsonResponse({ error: 'not_authenticated' }, 401)
  }

  let body: { student_id?: string; report_date?: string }
  try {
    body = (await req.json()) as { student_id?: string; report_date?: string }
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400)
  }

  const studentId = body.student_id?.trim() ?? ''
  const reportDate = body.report_date?.trim() ?? ''
  if (!studentId || !reportDate) {
    return jsonResponse({ error: 'missing_fields' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: completion } = await admin
    .from('today_report_completion_events')
    .select('notification_sent_at')
    .eq('student_id', studentId)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (completion?.notification_sent_at) {
    return jsonResponse({ status: 'already_sent' })
  }

  const { data: student } = await admin
    .from('students')
    .select('name, student_access_key')
    .eq('id', studentId)
    .maybeSingle()

  if (!student) {
    return jsonResponse({ status: 'push_failed', reason: 'student_not_found' })
  }

  const { data: subscriptions } = await admin
    .from('parent_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('student_id', studentId)
    .eq('is_active', true)

  const rows = (subscriptions ?? []) as PushRow[]
  const unique = new Map<string, PushRow>()
  for (const row of rows) {
    if (!unique.has(row.endpoint)) unique.set(row.endpoint, row)
  }

  if (unique.size === 0) {
    return jsonResponse({ status: 'no_subscribers' })
  }

  if (!vapidPublic || !vapidPrivate) {
    return jsonResponse({ status: 'push_failed', reason: 'vapid_missing' })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const studentName = typeof student.name === 'string' && student.name.trim() ? student.name.trim() : '학생'
  const accessKey =
    typeof student.student_access_key === 'string' ? student.student_access_key.trim() : ''
  const url = accessKey ? `/care/${accessKey}/today-report` : '/care/'
  const payload = JSON.stringify({
    title: 'HYPER Student Care',
    body: `${studentName} 학생의 오늘 학습보고가 등록되었습니다.`,
    url,
  })

  let sent = 0
  for (const row of unique.values()) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
      )
      sent += 1
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 0
      if (isGoneStatus(statusCode)) {
        await admin
          .from('parent_push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', row.id)
      }
    }
  }

  if (sent > 0) {
    await admin
      .from('today_report_completion_events')
      .update({
        notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .eq('report_date', reportDate)
      .is('notification_sent_at', null)
    return jsonResponse({ status: 'sent', sent })
  }

  return jsonResponse({ status: 'push_failed' })
})
