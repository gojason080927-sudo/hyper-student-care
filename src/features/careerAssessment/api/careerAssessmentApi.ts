import { getSupabase } from '../../../lib/supabase'
import type { CareerAssessmentScores, CareerSessionStatus } from '../types'

export type PublicCareerQuestion = {
  id: string
  questionNumber: number
  text: string
  displayOrder: number
}

export type PublicCareerLoad = {
  session: {
    id: string
    status: CareerSessionStatus
    completedAt: string | null
  }
  student: {
    name: string
    school: string
    grade: string
  }
  questions: PublicCareerQuestion[]
  answers: Array<{ question_id: string; answer: number }>
  answeredCount: number
}

type SessionRow = {
  id: string
  student_id: string
  access_token: string
  status: CareerSessionStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  career_assessment_responses?: Array<{ count: number }> | { count: number }[]
  career_assessment_results?: Array<{ id: string; created_at: string }> | { id: string; created_at: string }[]
}

async function invokeCareer(body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke('career-assessment', { body })
  if (error) {
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string; missing?: number[] }
        throw Object.assign(new Error(payload.error ?? error.message), payload)
      } catch (inner) {
        if (inner instanceof Error && inner.message !== error.message) throw inner
      }
    }
    throw error
  }
  return data as Record<string, unknown>
}

export function getCareerTestUrl(token: string): string {
  const origin =
    (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') ||
    window.location.origin
  return `${origin}/career-test/${token}`
}

export async function createOrGetCareerSessions(studentIds: string[]): Promise<SessionRow[]> {
  const unique = [...new Set(studentIds.filter(Boolean))]
  const data = await invokeCareer({
    action: unique.length === 1 ? 'create_or_get' : 'create_or_get_bulk',
    student_id: unique[0],
    student_ids: unique,
  })
  return (data.sessions as SessionRow[]) ?? []
}

export async function loadCareerTest(token: string): Promise<PublicCareerLoad> {
  const data = await invokeCareer({ action: 'load', token })
  return data as unknown as PublicCareerLoad
}

export async function saveCareerAnswers(
  token: string,
  answers: Array<{ questionId: string; answer: number }>,
): Promise<{ answeredCount: number }> {
  const data = await invokeCareer({ action: 'save_answers', token, answers })
  return { answeredCount: Number(data.answeredCount ?? answers.length) }
}

export async function submitCareerTest(token: string): Promise<{ status: string; resultId: string | null }> {
  const data = await invokeCareer({ action: 'submit', token })
  return {
    status: String(data.status ?? 'completed'),
    resultId: typeof data.resultId === 'string' ? data.resultId : null,
  }
}

export type TeacherCareerSession = {
  id: string
  studentId: string
  accessToken: string
  status: CareerSessionStatus
  answeredCount: number
  latestResultId: string | null
  completedAt: string | null
  createdAt: string
}

function asArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export async function fetchTeacherCareerSessions(): Promise<TeacherCareerSession[]> {
  const { data, error } = await getSupabase()
    .from('career_assessment_sessions')
    .select(
      'id, student_id, access_token, status, started_at, completed_at, created_at, updated_at, career_assessment_responses(count), career_assessment_results(id, created_at)',
    )
    .order('created_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as SessionRow[]).map((row) => {
    const responses = asArray(row.career_assessment_responses)
    const results = asArray(row.career_assessment_results).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
    return {
      id: row.id,
      studentId: row.student_id,
      accessToken: row.access_token,
      status: row.status,
      answeredCount: Number(responses[0]?.count ?? 0),
      latestResultId: results[0]?.id ?? null,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }
  })
}

export type CareerResultRecord = {
  id: string
  sessionId: string
  studentId: string
  createdAt: string
  resultVersion: string
  scores: CareerAssessmentScores
}

export async function fetchCareerResultById(resultId: string): Promise<CareerResultRecord | null> {
  const { data, error } = await getSupabase()
    .from('career_assessment_results')
    .select('*')
    .eq('id', resultId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapResultRow(data)
}

export async function fetchCareerResultsForStudent(studentId: string): Promise<CareerResultRecord[]> {
  const { data, error } = await getSupabase()
    .from('career_assessment_results')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapResultRow(row))
}

export async function fetchParentCareerResult(
  accessKey: string,
  resultId: string,
): Promise<{ result: CareerResultRecord; student: { name: string; school: string; grade: string } } | null> {
  const { data, error } = await getSupabase().rpc('get_parent_career_assessment_result', {
    p_access_key: accessKey,
    p_result_id: resultId,
  })
  if (error) throw error
  if (!data || typeof data !== 'object') return null
  const payload = data as {
    result?: Record<string, unknown>
    student?: { name?: string; school?: string; grade?: string }
  }
  if (!payload.result) return null
  return {
    result: mapResultRow(payload.result),
    student: {
      name: payload.student?.name ?? '',
      school: payload.student?.school ?? '',
      grade: payload.student?.grade ?? '',
    },
  }
}

function mapResultRow(row: Record<string, unknown>): CareerResultRecord {
  const payload = (row.result_payload as CareerAssessmentScores | undefined) ?? {
    resultVersion: String(row.result_version ?? 'HYPER_CAREER_V1'),
    riasecScores: row.riasec_scores,
    riasecTop2: (row.result_payload as CareerAssessmentScores | undefined)?.riasecTop2 ?? ['I', 'S'],
    riasecCodeLabel: (row.result_payload as CareerAssessmentScores | undefined)?.riasecCodeLabel ?? '',
    strengthScores: row.strength_scores,
    valueScores: row.value_scores,
    behaviorScores: row.behavior_scores,
    problemSolvingScores: row.problem_solving_scores,
    careerEfficacy: Number(row.career_efficacy),
    careerReadiness: Number(row.career_readiness),
    majorGroupScores: row.major_group_scores,
    detailedMajorScores: row.detailed_major_scores,
    dnaExplanation: (row.result_payload as CareerAssessmentScores | undefined)?.dnaExplanation ?? '',
    overallExplanation: (row.result_payload as CareerAssessmentScores | undefined)?.overallExplanation ?? '',
  } as CareerAssessmentScores

  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    studentId: String(row.student_id),
    createdAt: String(row.created_at),
    resultVersion: String(row.result_version ?? payload.resultVersion),
    scores: payload,
  }
}
