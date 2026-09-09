import { createClient } from 'npm:@supabase/supabase-js@2'
import { scoreCareerAssessment } from './_lib/scoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action =
  | 'create_or_get'
  | 'create_or_get_bulk'
  | 'create_guest'
  | 'link_guest'
  | 'delete_guest'
  | 'delete_session'
  | 'list'
  | 'load'
  | 'save_answers'
  | 'submit'

const GUEST_GRADES = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '기타'] as const

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createSecureToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const ASSESSMENT_V1 = 'HYPER_CAREER_V1'
const ASSESSMENT_V2 = 'HYPER_CAREER_V2'

type QuestionRow = {
  id: string
  question_number: number
  text: string
  domain: string
  scoring_code: string
  display_order: number
  display_order_v2?: number | null
  introduced_in?: string | null
  is_active: boolean
}

function sessionVersion(session: { assessment_version?: string | null }): string {
  return session.assessment_version === ASSESSMENT_V2 ? ASSESSMENT_V2 : ASSESSMENT_V1
}

function sessionExpectedCount(session: {
  assessment_version?: string | null
  expected_question_count?: number | null
}): number {
  const count = Number(session.expected_question_count ?? 0)
  if (count === 88 || count === 140) return count
  return sessionVersion(session) === ASSESSMENT_V2 ? 140 : 88
}

function questionsForSession(all: QuestionRow[], session: { assessment_version?: string | null }): QuestionRow[] {
  if (sessionVersion(session) === ASSESSMENT_V2) return all
  return all.filter((row) => row.question_number <= 88)
}

function publicQuestion(row: QuestionRow, version: string) {
  return {
    id: row.id,
    questionNumber: row.question_number,
    text: row.text,
    displayOrder:
      version === ASSESSMENT_V2 ? (row.display_order_v2 ?? row.display_order) : row.display_order,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500)
  }

  let body: {
    action?: Action
    token?: string
    student_id?: string
    student_ids?: string[]
    guest_id?: string
    session_id?: string
    name?: string
    school?: string
    grade?: string
    memo?: string
    consultation_date?: string
    answers?: Array<{ questionId: string; answer: number }>
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400)
  }

  const action = body.action
  const admin = createClient(supabaseUrl, serviceKey)
  const authHeader = req.headers.get('Authorization') ?? ''

  const requireTeacher = async () => {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error,
    } = await userClient.auth.getUser()
    if (error || !user) return null
    return user
  }

  const loadQuestions = async () => {
    const { data, error } = await admin
      .from('career_assessment_questions')
      .select('id, question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active')
      .eq('is_active', true)
      .order('question_number')
    if (error || !data) throw new Error(error?.message ?? 'questions_load_failed')
    return data as QuestionRow[]
  }

  if (action === 'create_or_get' || action === 'create_or_get_bulk') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)

    const studentIds =
      action === 'create_or_get_bulk'
        ? [...new Set((body.student_ids ?? []).map((id) => id.trim()).filter(Boolean))]
        : [body.student_id?.trim() ?? ''].filter(Boolean)

    if (studentIds.length === 0) return jsonResponse({ error: 'missing_student' }, 400)

    const sessions = []
    for (const studentId of studentIds) {
      const { data: existing } = await admin
        .from('career_assessment_sessions')
        .select('*')
        .eq('student_id', studentId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        sessions.push(existing)
        continue
      }

      const token = createSecureToken()
      const tokenHash = await sha256Hex(token)
      const { data: created, error } = await admin
        .from('career_assessment_sessions')
        .insert({
          student_id: studentId,
          access_token: token,
          token_hash: tokenHash,
          status: 'not_started',
          assessment_version: ASSESSMENT_V2,
          expected_question_count: 140,
        })
        .select('*')
        .single()
      if (error || !created) {
        return jsonResponse({ error: error?.message ?? 'session_create_failed' }, 500)
      }
      sessions.push(created)
    }

    return jsonResponse({ sessions })
  }

  if (action === 'create_guest') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)

    const name = body.name?.trim() ?? ''
    const school = body.school?.trim() ?? ''
    const grade = body.grade?.trim() ?? ''
    const memo = body.memo?.trim() || null
    const consultationDate = body.consultation_date?.trim() || new Date().toISOString().slice(0, 10)
    if (!name || !school || !grade) return jsonResponse({ error: 'missing_guest_fields' }, 400)
    if (!GUEST_GRADES.includes(grade as (typeof GUEST_GRADES)[number])) {
      return jsonResponse({ error: 'invalid_grade' }, 400)
    }

    const { data: guest, error: guestError } = await admin
      .from('career_assessment_guests')
      .insert({
        name,
        school,
        grade,
        memo,
        consultation_date: consultationDate,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (guestError || !guest) {
      return jsonResponse({ error: guestError?.message ?? 'guest_create_failed' }, 500)
    }

    const token = createSecureToken()
    const tokenHash = await sha256Hex(token)
    const { data: session, error: sessionError } = await admin
      .from('career_assessment_sessions')
      .insert({
        student_id: null,
        guest_id: guest.id,
        access_token: token,
        token_hash: tokenHash,
        status: 'not_started',
        assessment_version: ASSESSMENT_V2,
        expected_question_count: 140,
      })
      .select('*')
      .single()
    if (sessionError || !session) {
      return jsonResponse({ error: sessionError?.message ?? 'session_create_failed' }, 500)
    }

    return jsonResponse({ guest, session })
  }

  if (action === 'link_guest') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)
    const guestId = body.guest_id?.trim() ?? ''
    const studentId = body.student_id?.trim() ?? ''
    if (!guestId || !studentId) return jsonResponse({ error: 'missing_link' }, 400)

    const { data: student } = await admin.from('students').select('id').eq('id', studentId).maybeSingle()
    if (!student) return jsonResponse({ error: 'student_not_found' }, 404)

    const { data: guest, error } = await admin
      .from('career_assessment_guests')
      .update({ linked_student_id: studentId, updated_at: new Date().toISOString() })
      .eq('id', guestId)
      .select('*')
      .maybeSingle()
    if (error || !guest) return jsonResponse({ error: error?.message ?? 'guest_link_failed' }, 500)
    return jsonResponse({ guest })
  }

  if (action === 'delete_guest') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)
    const guestId = body.guest_id?.trim() ?? ''
    if (!guestId) return jsonResponse({ error: 'missing_guest' }, 400)

    const { data: guest } = await admin
      .from('career_assessment_guests')
      .select('id')
      .eq('id', guestId)
      .maybeSingle()
    if (!guest) return jsonResponse({ error: 'guest_not_found' }, 404)

    const { error } = await admin.from('career_assessment_guests').delete().eq('id', guestId)
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ deleted: true, guest_id: guestId })
  }

  if (action === 'delete_session') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)
    const sessionId = body.session_id?.trim() ?? ''
    if (!sessionId) return jsonResponse({ error: 'missing_session' }, 400)

    const { data: session } = await admin
      .from('career_assessment_sessions')
      .select('id, student_id, guest_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return jsonResponse({ error: 'session_not_found' }, 404)

    const studentId = typeof session.student_id === 'string' ? session.student_id : null
    const guestId = typeof session.guest_id === 'string' ? session.guest_id : null

    const { data: noticeLinks } = await admin
      .from('career_assessment_result_notices')
      .select('notice_id')
      .eq('session_id', sessionId)

    const { error } = await admin.from('career_assessment_sessions').delete().eq('id', sessionId)
    if (error) return jsonResponse({ error: error.message }, 500)

    const noticeIds = [...new Set((noticeLinks ?? []).map((row) => String(row.notice_id)).filter(Boolean))]
    if (noticeIds.length > 0) {
      await admin.from('notices').delete().in('id', noticeIds)
    }

    let guestCleaned = false
    if (guestId) {
      const { count } = await admin
        .from('career_assessment_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('guest_id', guestId)
      if ((count ?? 0) === 0) {
        const { error: guestError } = await admin.from('career_assessment_guests').delete().eq('id', guestId)
        if (guestError) return jsonResponse({ error: guestError.message }, 500)
        guestCleaned = true
      }
    }

    if (studentId) {
      const { data: student } = await admin.from('students').select('id').eq('id', studentId).maybeSingle()
      if (!student) return jsonResponse({ error: 'student_missing_after_delete' }, 500)
    }

    return jsonResponse({
      deleted: true,
      session_id: sessionId,
      student_preserved: Boolean(studentId),
      guest_cleaned: guestCleaned,
    })
  }

  if (action === 'list') {
    const user = await requireTeacher()
    if (!user) return jsonResponse({ error: 'not_authenticated' }, 401)

    const { data, error } = await admin.rpc('get_career_assessment_session_summaries')
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ sessions: data ?? [] })
  }

  if (action === 'load' || action === 'save_answers' || action === 'submit') {
    const token = body.token?.trim() ?? ''
    if (!token) return jsonResponse({ error: 'missing_token' }, 400)
    const tokenHash = await sha256Hex(token)

    const { data: session, error: sessionError } = await admin
      .from('career_assessment_sessions')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    if (sessionError || !session) {
      return jsonResponse({ error: 'invalid_token' }, 404)
    }

    let subject: { name: string; school: string; grade: string } | null = null
    if (session.student_id) {
      const { data: student } = await admin
        .from('students')
        .select('id, name, school, grade')
        .eq('id', session.student_id)
        .maybeSingle()
      if (student) subject = { name: student.name, school: student.school, grade: student.grade }
    } else if (session.guest_id) {
      const { data: guest } = await admin
        .from('career_assessment_guests')
        .select('id, name, school, grade')
        .eq('id', session.guest_id)
        .maybeSingle()
      if (guest) subject = { name: guest.name, school: guest.school, grade: guest.grade }
    }
    if (!subject) return jsonResponse({ error: 'subject_not_found' }, 404)

    const allQuestions = await loadQuestions()
    const version = sessionVersion(session)
    const expectedQuestionCount = sessionExpectedCount(session)
    const questions = questionsForSession(allQuestions, session)

    if (action === 'load') {
      const { data: responses } = await admin
        .from('career_assessment_responses')
        .select('question_id, answer')
        .eq('session_id', session.id)

      return jsonResponse({
        session: {
          id: session.id,
          status: session.status,
          completedAt: session.completed_at,
          assessmentVersion: version,
          expectedQuestionCount,
        },
        student: subject,
        questions: questions.map((row) => publicQuestion(row, version)),
        answers: responses ?? [],
        answeredCount: responses?.length ?? 0,
      })
    }

    if (session.status === 'completed') {
      return jsonResponse({ error: 'already_completed', status: 'completed' }, 409)
    }

    if (action === 'save_answers') {
      const answers = body.answers ?? []
      const questionById = new Map(questions.map((q) => [q.id, q]))
      const rows = []
      for (const item of answers) {
        const question = questionById.get(item.questionId)
        if (!question) return jsonResponse({ error: 'invalid_question' }, 400)
        if (!Number.isInteger(item.answer) || item.answer < 1 || item.answer > 5) {
          return jsonResponse({ error: 'invalid_answer' }, 400)
        }
        rows.push({
          session_id: session.id,
          question_id: item.questionId,
          answer: item.answer,
          updated_at: new Date().toISOString(),
        })
      }

      if (rows.length > 0) {
        const { error } = await admin
          .from('career_assessment_responses')
          .upsert(rows, { onConflict: 'session_id,question_id' })
        if (error) return jsonResponse({ error: error.message }, 500)
      }

      if (session.status === 'not_started') {
        await admin
          .from('career_assessment_sessions')
          .update({
            status: 'in_progress',
            started_at: session.started_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id)
          .eq('status', 'not_started')
      }

      const { count } = await admin
        .from('career_assessment_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)

      return jsonResponse({
        saved: true,
        answeredCount: count ?? rows.length,
        status: 'in_progress',
      })
    }

    const { data: responseRows, error: responseError } = await admin
      .from('career_assessment_responses')
      .select('question_id, answer')
      .eq('session_id', session.id)
    if (responseError) return jsonResponse({ error: responseError.message }, 500)
    if ((responseRows?.length ?? 0) < expectedQuestionCount) {
      const answeredIds = new Set((responseRows ?? []).map((row) => row.question_id))
      const missing = questions
        .filter((q) => !answeredIds.has(q.id))
        .map((q) => q.question_number)
      return jsonResponse({ error: 'incomplete_answers', missing }, 400)
    }

    const { data: profiles, error: profileError } = await admin
      .from('career_major_profiles')
      .select('*')
      .eq('is_active', true)
    const { data: dictionary, error: dictError } = await admin
      .from('career_major_dictionary')
      .select('*')
      .eq('is_active', true)
    const { data: bands } = await admin
      .from('career_fit_bands')
      .select('*')
      .order('sort_order')

    if (profileError || dictError || !profiles || !dictionary) {
      return jsonResponse({ error: 'profile_load_failed' }, 500)
    }

    const answerMap: Record<number, number> = {}
    const questionById = new Map(questions.map((q) => [q.id, q]))
    for (const row of responseRows ?? []) {
      const question = questionById.get(row.question_id)
      if (!question) continue
      answerMap[question.question_number] = row.answer
    }

    let scored
    try {
      scored = scoreCareerAssessment({
        answers: answerMap,
        questions: questions.map((q) => ({
          questionNumber: q.question_number,
          text: q.text,
          domain: q.domain,
          scoringCode: q.scoring_code,
          displayOrder: q.display_order,
        })),
        profiles: profiles.map((p) => ({
          id: p.id,
          name: p.name,
          riasecTarget: p.riasec_target,
          strengthKeys: p.strength_keys,
          valueKeys: p.value_keys,
          behaviorKeys: p.behavior_keys,
          problemSolvingKeys: p.problem_solving_keys,
        })),
        dictionary: dictionary.map((d) => ({
          id: d.id,
          majorName: d.major_name,
          majorGroupPrimary: d.major_group_primary,
          majorGroupSecondary: d.major_group_secondary,
          primaryWeight: Number(d.primary_weight),
          secondaryWeight: Number(d.secondary_weight),
          isActive: d.is_active,
        })),
        bands: (bands ?? []).map((b) => ({
          minScore: Number(b.min_score),
          maxScore: Number(b.max_score),
          label: b.label,
          excludeFromPriority: b.exclude_from_priority,
        })),
      })
    } catch (error) {
      return jsonResponse(
        { error: 'scoring_failed', detail: error instanceof Error ? error.message : 'unknown' },
        500,
      )
    }

    const { data: completed, error: completeError } = await admin.rpc(
      'complete_career_assessment',
      {
        p_session_id: session.id,
        p_result: scored,
      },
    )
    if (completeError) {
      return jsonResponse({ error: completeError.message }, 500)
    }

    return jsonResponse({
      status: completed?.status ?? 'completed',
      resultId: completed?.result?.id ?? null,
    })
  }

  return jsonResponse({ error: 'unknown_action' }, 400)
})
