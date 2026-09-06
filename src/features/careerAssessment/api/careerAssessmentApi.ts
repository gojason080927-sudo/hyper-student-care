import { studentFromRow, type StudentRow } from '../../../lib/db/mappers'
import { getSupabase } from '../../../lib/supabase'
import type { Student } from '../../../types/student'
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
  student_id?: string | null
  guest_id?: string | null
  access_token: string
  status: CareerSessionStatus
  started_at?: string | null
  completed_at: string | null
  created_at: string
  updated_at?: string
  answered_count?: number
  latest_result_id?: string | null
  guest_name?: string | null
  guest_school?: string | null
  guest_grade?: string | null
  consultation_date?: string | null
  guest_memo?: string | null
  linked_student_id?: string | null
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
  studentId: string | null
  guestId: string | null
  guestName: string | null
  guestSchool: string | null
  guestGrade: string | null
  linkedStudentId: string | null
  accessToken: string
  status: CareerSessionStatus
  answeredCount: number
  latestResultId: string | null
  completedAt: string | null
  createdAt: string
}

export type CareerGuestRecord = {
  id: string
  name: string
  school: string
  grade: string
  consultationDate: string | null
  memo: string | null
  linkedStudentId: string | null
}

export async function fetchCareerStudentsByIds(ids: string[]): Promise<Student[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return []
  const { data, error } = await getSupabase().from('students').select('*').in('id', unique)
  if (error) throw error
  return ((data ?? []) as StudentRow[]).map(studentFromRow)
}

export async function fetchTeacherCareerSessions(): Promise<TeacherCareerSession[]> {
  const data = await invokeCareer({ action: 'list' })
  const rows = (Array.isArray(data.sessions) ? data.sessions : []) as SessionRow[]
  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id ?? null,
    guestId: row.guest_id ?? null,
    guestName: row.guest_name ?? null,
    guestSchool: row.guest_school ?? null,
    guestGrade: row.guest_grade ?? null,
    linkedStudentId: row.linked_student_id ?? null,
    accessToken: row.access_token,
    status: row.status,
    answeredCount: Number(row.answered_count ?? 0),
    latestResultId: row.latest_result_id ?? null,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }))
}

export async function createCareerGuest(input: {
  name: string
  school: string
  grade: string
  memo?: string
  consultationDate?: string
}): Promise<{ guest: CareerGuestRecord; session: TeacherCareerSession }> {
  const data = await invokeCareer({
    action: 'create_guest',
    name: input.name,
    school: input.school,
    grade: input.grade,
    memo: input.memo,
    consultation_date: input.consultationDate,
  })
  const guest = data.guest as { id: string; name: string; school: string; grade: string; consultation_date?: string | null; memo?: string | null; linked_student_id?: string | null }
  const session = data.session as SessionRow
  return {
    guest: {
      id: guest.id,
      name: guest.name,
      school: guest.school,
      grade: guest.grade,
      consultationDate: guest.consultation_date ?? null,
      memo: guest.memo ?? null,
      linkedStudentId: guest.linked_student_id ?? null,
    },
    session: {
      id: session.id,
      studentId: null,
      guestId: guest.id,
      guestName: guest.name,
      guestSchool: guest.school,
      guestGrade: guest.grade,
      linkedStudentId: null,
      accessToken: session.access_token,
      status: session.status,
      answeredCount: 0,
      latestResultId: null,
      completedAt: session.completed_at,
      createdAt: session.created_at,
    },
  }
}

export async function linkCareerGuest(guestId: string, studentId: string): Promise<void> {
  await invokeCareer({ action: 'link_guest', guest_id: guestId, student_id: studentId })
}

export async function deleteCareerGuest(guestId: string): Promise<void> {
  await invokeCareer({ action: 'delete_guest', guest_id: guestId })
}

export type CareerResultRecord = {
  id: string
  sessionId: string
  studentId: string | null
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

export async function fetchCareerResultsForGuest(guestId: string): Promise<CareerResultRecord[]> {
  const { data, error } = await getSupabase()
    .from('career_assessment_results')
    .select('*')
    .eq('guest_id', guestId)
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
    studentId: row.student_id ? String(row.student_id) : null,
    createdAt: String(row.created_at),
    resultVersion: String(row.result_version ?? payload.resultVersion),
    scores: payload,
  }
}
