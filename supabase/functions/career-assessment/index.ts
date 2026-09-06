import { createClient } from 'npm:@supabase/supabase-js@2'
import { scoreCareerAssessment } from './_lib/scoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action =
  | 'create_or_get'
  | 'create_or_get_bulk'
  | 'load'
  | 'save_answers'
  | 'submit'

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

function publicQuestion(row: {
  id: string
  question_number: number
  text: string
  display_order: number
}) {
  return {
    id: row.id,
    questionNumber: row.question_number,
    text: row.text,
    displayOrder: row.display_order,
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
      .select('id, question_number, text, domain, scoring_code, display_order, is_active')
      .eq('is_active', true)
      .order('question_number')
    if (error || !data) throw new Error(error?.message ?? 'questions_load_failed')
    return data
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

    const { data: student } = await admin
      .from('students')
      .select('id, name, school, grade')
      .eq('id', session.student_id)
      .maybeSingle()
    if (!student) return jsonResponse({ error: 'student_not_found' }, 404)

    const questions = await loadQuestions()

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
        },
        student: {
          name: student.name,
          school: student.school,
          grade: student.grade,
        },
        questions: questions.map(publicQuestion),
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
    if ((responseRows?.length ?? 0) < 88) {
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
