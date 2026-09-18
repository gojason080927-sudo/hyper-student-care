import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PushEvent =
  | 'student_question_created'
  | 'student_inbox_created'
  | 'assignment_saved'
  | 'inbox_replied'
  | 'question_answered'
  | 'notice_saved'
  | 'weekly_summary_scan'

type RequestBody = {
  event?: PushEvent
  access_key?: string
  accessKey?: string
  entity_id?: string
  entityId?: string
  previous?: Record<string, unknown>
}

type SubscriptionRow = {
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

function firstEnv(names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim()
    if (value) return value
  }
  return ''
}

function configureWebPush(): { ok: true } | { ok: false; error: string } {
  const publicKey = firstEnv(['VAPID_PUBLIC_KEY', 'VITE_VAPID_PUBLIC_KEY'])
  const privateKey = firstEnv(['VAPID_PRIVATE_KEY', 'VAPID_PRIVATE', 'WEB_PUSH_VAPID_PRIVATE_KEY'])
  const subject = firstEnv(['VAPID_SUBJECT']) || 'mailto:admin@localhost'
  if (!publicKey || !privateKey) {
    return { ok: false, error: 'vapid_not_configured' }
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return { ok: true }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBool(value: unknown): boolean {
  return value === true
}

function hubAssignmentSubjectLabel(subject: unknown, slotNumber: unknown): string {
  const name = asString(subject)
  const slot = Number(slotNumber)
  if (name === '수학' && slot === 1) return '수학 · 개념교재'
  if (name === '수학' && slot === 2) return '수학 · 유형교재'
  if (name === '수학' && slot === 3) return '수학 · 부교재'
  if (name === '영어' && slot === 1) return '영어 · 문법교재'
  if (name === '영어' && slot === 2) return '영어 · 독해 교재'
  if (name === '영어' && slot === 3) return '영어 · 단어장'
  return name
}

async function claimDelivery(supabase: SupabaseClient, eventKey: string): Promise<boolean> {
  const { error } = await supabase.from('hub_push_deliveries').insert({ event_key: eventKey })
  if (!error) return true
  if (/duplicate|unique/i.test(error.message)) return false
  console.warn('[HubPush] claim failed', error.message)
  return false
}

async function deactivateStudentEndpoint(supabase: SupabaseClient, endpoint: string): Promise<void> {
  await supabase
    .from('student_push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('endpoint', endpoint)
}

async function deactivateTeacherEndpoint(supabase: SupabaseClient, endpoint: string): Promise<void> {
  await supabase
    .from('teacher_push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('endpoint', endpoint)
}

async function sendToSubscriptions(
  supabase: SupabaseClient,
  audience: 'student' | 'teacher',
  subscriptions: SubscriptionRow[],
  payload: { title: string; body: string; url: string },
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  const body = JSON.stringify(payload)
  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
      )
      sent += 1
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode ?? 0)
      if (status === 404 || status === 410) {
        if (audience === 'student') await deactivateStudentEndpoint(supabase, row.endpoint)
        else await deactivateTeacherEndpoint(supabase, row.endpoint)
      }
      failed += 1
    }
  }
  return { sent, failed }
}

async function loadStudentSubscriptions(
  supabase: SupabaseClient,
  studentIds: string[],
): Promise<SubscriptionRow[]> {
  if (studentIds.length === 0) return []
  const { data, error } = await supabase
    .from('student_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('student_id', studentIds)
    .eq('is_active', true)
  if (error) {
    console.warn('[HubPush] student subscriptions', error.message)
    return []
  }
  return (data ?? []) as SubscriptionRow[]
}

async function loadTeacherSubscriptions(supabase: SupabaseClient): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from('teacher_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('is_active', true)
  if (error) {
    console.warn('[HubPush] teacher subscriptions', error.message)
    return []
  }
  return (data ?? []) as SubscriptionRow[]
}

async function studentAccessKey(supabase: SupabaseClient, studentId: string): Promise<string> {
  const { data } = await supabase
    .from('students')
    .select('student_access_key')
    .eq('id', studentId)
    .maybeSingle()
  return asString(data?.student_access_key)
}

async function resolveAccessKeyStudentId(
  supabase: SupabaseClient,
  accessKey: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_student_hub_identity', {
    p_access_key: accessKey,
  })
  if (error || !data || typeof data !== 'object') return null
  const id = asString((data as { id?: unknown }).id)
  return id || null
}

async function handleStudentQuestionCreated(
  supabase: SupabaseClient,
  accessKey: string,
  entityId: string,
): Promise<Record<string, unknown>> {
  const studentId = await resolveAccessKeyStudentId(supabase, accessKey)
  if (!studentId) return { status: 'invalid_access_key' }
  const { data } = await supabase
    .from('questions')
    .select('id, student_id, source')
    .eq('id', entityId)
    .maybeSingle()
  if (!data || asString(data.student_id) !== studentId || asString(data.source) !== 'student') {
    return { status: 'ignored' }
  }
  if (!(await claimDelivery(supabase, `teacher:question:${entityId}:created`))) {
    return { status: 'duplicate' }
  }
  const subscriptions = await loadTeacherSubscriptions(supabase)
  if (subscriptions.length === 0) return { status: 'no_subscribers' }
  const result = await sendToSubscriptions(supabase, 'teacher', subscriptions, {
    title: 'HYPER Teacher',
    body: '새로운 학생 질문이 등록되었습니다.',
    url: '/teacher/mobile/questions',
  })
  return { status: result.sent > 0 ? 'sent' : 'push_failed', ...result }
}

async function handleStudentInboxCreated(
  supabase: SupabaseClient,
  accessKey: string,
  entityId: string,
): Promise<Record<string, unknown>> {
  const studentId = await resolveAccessKeyStudentId(supabase, accessKey)
  if (!studentId) return { status: 'invalid_access_key' }
  const { data } = await supabase
    .from('student_hub_inbox')
    .select('id, student_id, kind')
    .eq('id', entityId)
    .maybeSingle()
  if (!data || asString(data.student_id) !== studentId) return { status: 'ignored' }
  const kind = asString(data.kind)
  if (kind !== 'material_request' && kind !== 'suggestion') return { status: 'ignored' }
  if (!(await claimDelivery(supabase, `teacher:inbox:${entityId}:created`))) {
    return { status: 'duplicate' }
  }
  const subscriptions = await loadTeacherSubscriptions(supabase)
  if (subscriptions.length === 0) return { status: 'no_subscribers' }
  const result = await sendToSubscriptions(supabase, 'teacher', subscriptions, {
    title: 'HYPER Teacher',
    body:
      kind === 'material_request'
        ? '새로운 자료 요청이 등록되었습니다.'
        : '새로운 학생 건의사항이 등록되었습니다.',
    url: '/teacher/mobile/student-hub',
  })
  return { status: result.sent > 0 ? 'sent' : 'push_failed', ...result }
}

async function loadAssignmentPushSource(
  supabase: SupabaseClient,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from('class_hub_assignments').select('*').eq('id', entityId).maybeSingle()
  if (data && data.published === true) return data as Record<string, unknown>

  const { data: common } = await supabase
    .from('class_today_report_common')
    .select('id, grade, class_name, subject, slot_number, textbook_name, today_assignment, report_date')
    .eq('id', entityId)
    .maybeSingle()
  const content = asString(common?.today_assignment).trim()
  if (!common || !content) return null
  return {
    grade: common.grade,
    class_name: common.class_name,
    subject: hubAssignmentSubjectLabel(common.subject, common.slot_number),
    textbook_name: common.textbook_name,
    content,
    due_date: common.report_date,
    student_id: null,
    published: true,
  }
}

async function handleAssignmentSaved(
  supabase: SupabaseClient,
  entityId: string,
  previous: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const data = await loadAssignmentPushSource(supabase, entityId)
  if (!data || data.published !== true) return { status: 'ignored' }

  const nextFingerprint = [
    asString(data.grade).trim(),
    asString(data.class_name).trim(),
    asString(data.subject).trim(),
    asString(data.textbook_name).trim(),
    asString(data.content).trim(),
    asString(data.due_date),
    asString(data.student_id),
  ].join('\u001f')
  const prevPublished = asBool(previous?.published)
  const prevFingerprint = asString(previous?.fingerprint)
  const kind = !previous || !prevPublished ? 'published' : prevFingerprint !== nextFingerprint ? 'changed' : null
  if (!kind) return { status: 'skipped' }

  const eventKey =
    kind === 'published'
      ? `student:assignment:${entityId}:published`
      : `student:assignment:${entityId}:changed:${nextFingerprint}`
  if (!(await claimDelivery(supabase, eventKey))) return { status: 'duplicate' }

  const { data: students } = await supabase.rpc('list_hub_push_assignment_recipients', {
    p_assignment_id: entityId,
  })
  const recipients = ((students ?? []) as { student_id?: string; access_key?: string }[]).filter(
    (row) => asString(row.student_id) && asString(row.access_key),
  )
  const subscriptions = await loadStudentSubscriptions(
    supabase,
    recipients.map((row) => asString(row.student_id)),
  )
  if (subscriptions.length === 0) return { status: 'no_subscribers' }

  let sent = 0
  let failed = 0
  for (const student of recipients) {
    const scoped = await loadStudentSubscriptions(supabase, [asString(student.student_id)])
    const result = await sendToSubscriptions(supabase, 'student', scoped, {
      title: 'HYPER Student Hub',
      body: kind === 'published' ? '오늘의 과제가 등록되었습니다.' : '오늘의 과제가 변경되었습니다.',
      url: `/hub/${encodeURIComponent(asString(student.access_key))}/assignments`,
    })
    sent += result.sent
    failed += result.failed
  }
  return { status: sent > 0 ? 'sent' : subscriptions.length > 0 ? 'push_failed' : 'no_subscribers', sent, failed }
}

async function handleInboxReplied(
  supabase: SupabaseClient,
  entityId: string,
  previous: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('student_hub_inbox')
    .select('id, student_id, kind, teacher_reply')
    .eq('id', entityId)
    .maybeSingle()
  if (!data) return { status: 'ignored' }
  const previousReply = asString(previous?.teacherReply)
  const nextReply = asString(data.teacher_reply)
  if (previousReply.trim() !== '' || nextReply.trim() === '') return { status: 'skipped' }
  if (!(await claimDelivery(supabase, `student:inbox:${entityId}:first_reply`))) {
    return { status: 'duplicate' }
  }
  const accessKey = await studentAccessKey(supabase, asString(data.student_id))
  const subscriptions = await loadStudentSubscriptions(supabase, [asString(data.student_id)])
  if (subscriptions.length === 0) return { status: 'no_subscribers' }
  const kind = asString(data.kind)
  const result = await sendToSubscriptions(supabase, 'student', subscriptions, {
    title: 'HYPER Student Hub',
    body:
      kind === 'suggestion'
        ? '건의사항에 답변이 등록되었습니다.'
        : '요청한 자료에 선생님 답변이 도착했습니다.',
    url: `/hub/${encodeURIComponent(accessKey)}/${kind === 'suggestion' ? 'suggestions' : 'requests'}`,
  })
  return { status: result.sent > 0 ? 'sent' : 'push_failed', ...result }
}

async function handleQuestionAnswered(
  supabase: SupabaseClient,
  entityId: string,
  previous: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('questions')
    .select('id, student_id, source, answer, answer_images')
    .eq('id', entityId)
    .maybeSingle()
  if (!data || asString(data.source) !== 'student') return { status: 'ignored' }
  const prevAnswer = asString(previous?.answer)
  const prevImages = Number(previous?.answerImageCount ?? 0)
  const nextAnswer = asString(data.answer)
  const nextImages = Array.isArray(data.answer_images) ? data.answer_images.length : 0
  const hadAnswer = Boolean(prevAnswer.trim() || prevImages > 0)
  const hasAnswer = Boolean(nextAnswer.trim() || nextImages > 0)
  if (hadAnswer || !hasAnswer) return { status: 'skipped' }
  if (!(await claimDelivery(supabase, `student:question:${entityId}:first_answer`))) {
    return { status: 'duplicate' }
  }
  const accessKey = await studentAccessKey(supabase, asString(data.student_id))
  const subscriptions = await loadStudentSubscriptions(supabase, [asString(data.student_id)])
  if (subscriptions.length === 0) return { status: 'no_subscribers' }
  const result = await sendToSubscriptions(supabase, 'student', subscriptions, {
    title: 'HYPER Student Hub',
    body: '질문에 선생님 답변이 도착했습니다.',
    url: `/hub/${encodeURIComponent(accessKey)}/questions`,
  })
  return { status: result.sent > 0 ? 'sent' : 'push_failed', ...result }
}

async function handleNoticeSaved(
  supabase: SupabaseClient,
  entityId: string,
  previous: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const { data } = await supabase.from('notices').select('*').eq('id', entityId).maybeSingle()
  if (!data || data.is_published !== true) return { status: 'ignored' }
  if (asBool(previous?.published)) return { status: 'skipped' }
  if (!(await claimDelivery(supabase, `student:notice:${entityId}:published`))) {
    return { status: 'duplicate' }
  }

  const { data: students } = await supabase.rpc('list_hub_push_notice_recipients', {
    p_notice_id: entityId,
  })
  const visible = ((students ?? []) as { student_id?: string; access_key?: string }[])
    .map((row) => ({ id: asString(row.student_id), key: asString(row.access_key) }))
    .filter((row) => row.id && row.key)

  let sent = 0
  let failed = 0
  for (const student of visible) {
    const scoped = await loadStudentSubscriptions(supabase, [student.id])
    const result = await sendToSubscriptions(supabase, 'student', scoped, {
      title: 'HYPER Student Hub',
      body: '새 공지사항이 등록되었습니다.',
      url: `/hub/${encodeURIComponent(student.key)}/notices`,
    })
    sent += result.sent
    failed += result.failed
  }
  return { status: sent > 0 ? 'sent' : subscriptionsOrNone(visible.length, sent), sent, failed }
}

function subscriptionsOrNone(visibleCount: number, sent: number): string {
  if (visibleCount === 0) return 'no_recipients'
  return sent > 0 ? 'sent' : 'no_subscribers'
}

async function handleWeeklySummaryScan(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('weekly_learning_summaries')
    .select('id, student_id, week_start')
    .order('created_at', { ascending: false })
    .limit(200)
  let sent = 0
  let failed = 0
  let claimed = 0
  for (const row of data ?? []) {
    const eventKey = `student:weekly:${asString(row.student_id)}:${asString(row.week_start)}`
    if (!(await claimDelivery(supabase, eventKey))) continue
    claimed += 1
    const accessKey = await studentAccessKey(supabase, asString(row.student_id))
    const subscriptions = await loadStudentSubscriptions(supabase, [asString(row.student_id)])
    const result = await sendToSubscriptions(supabase, 'student', subscriptions, {
      title: 'HYPER Student Hub',
      body: '이번 주 학습 SUMMARY가 도착했습니다.',
      url: `/hub/${encodeURIComponent(accessKey)}/weekly`,
    })
    sent += result.sent
    failed += result.failed
  }
  return { status: claimed === 0 ? 'skipped' : sent > 0 ? 'sent' : 'no_subscribers', sent, failed, claimed }
}

async function authorizeTeacher(request: Request, serviceKey: string): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  if (token === serviceKey) return true
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey
  if (!url) return false
  const authClient = createClient(url, anon)
  const { data } = await authClient.auth.getUser(token)
  return Boolean(data.user)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    return jsonResponse({ status: 'error', error: 'service_role env missing' }, 500)
  }

  const vapid = configureWebPush()
  if (!vapid.ok) {
    return jsonResponse({ status: 'not_configured' })
  }

  let body: RequestBody = {}
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return jsonResponse({ status: 'error', error: 'invalid_json' }, 400)
  }

  const event = body.event
  const accessKey = (body.accessKey || body.access_key || '').trim()
  const entityId = (body.entityId || body.entity_id || '').trim()
  const supabase = createClient(url, serviceKey)

  try {
    if (event === 'weekly_summary_scan') {
      return jsonResponse(await handleWeeklySummaryScan(supabase))
    }
    if (event === 'student_question_created' && accessKey && entityId) {
      return jsonResponse(await handleStudentQuestionCreated(supabase, accessKey, entityId))
    }
    if (event === 'student_inbox_created' && accessKey && entityId) {
      return jsonResponse(await handleStudentInboxCreated(supabase, accessKey, entityId))
    }

    const teacherOk = await authorizeTeacher(request, serviceKey)
    if (!teacherOk) {
      return jsonResponse({ status: 'unauthorized' }, 401)
    }
    if (event === 'assignment_saved' && entityId) {
      return jsonResponse(await handleAssignmentSaved(supabase, entityId, body.previous))
    }
    if (event === 'inbox_replied' && entityId) {
      return jsonResponse(await handleInboxReplied(supabase, entityId, body.previous))
    }
    if (event === 'question_answered' && entityId) {
      return jsonResponse(await handleQuestionAnswered(supabase, entityId, body.previous))
    }
    if (event === 'notice_saved' && entityId) {
      return jsonResponse(await handleNoticeSaved(supabase, entityId, body.previous))
    }
    return jsonResponse({ status: 'ignored' })
  } catch (error) {
    console.warn('[HubPush] handler failed', error instanceof Error ? error.message : error)
    return jsonResponse({ status: 'push_failed' })
  }
})
