import { getSupabase, isSupabaseConfigured } from '../supabase'
import type {
  EntranceExamAnswerItem,
  EntranceExamAreaScore,
  EntranceExamAttempt,
  EntranceExamAttemptInput,
  EntranceExamAttemptRow,
  EntranceExamDifficulty,
  EntranceExamEvaluationSession,
  EntranceExamEvaluationSessionInput,
  EntranceExamEvaluationSessionRow,
  EntranceExamGrade,
  EntranceExamLearningSurvey,
  EntranceExamLearningSurveyInput,
  EntranceExamLearningSurveyRow,
  EntranceExamPaper,
  EntranceExamPaperInput,
  EntranceExamPaperRow,
  EntranceExamQuestion,
  EntranceExamQuestionInput,
  EntranceExamQuestionRow,
  EntranceExamSubject,
} from '../../features/entranceExam/types'

const LOCAL_KEY = 'hyper_entrance_exam_questions'
const LOCAL_PAPERS_KEY = 'hyper_entrance_exam_papers'
const LOCAL_ATTEMPTS_KEY = 'hyper_entrance_exam_attempts'
const LOCAL_SURVEYS_KEY = 'hyper_entrance_exam_learning_surveys'
const LOCAL_SESSIONS_KEY = 'hyper_entrance_exam_evaluation_sessions'

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `eeq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function asSubject(value: string): EntranceExamSubject {
  return value === '영어' ? '영어' : '수학'
}

function asGrade(value: string): EntranceExamGrade {
  if (value === '중2' || value === '중3' || value === '고1') return value
  return '중1'
}

function asDifficulty(value: string): EntranceExamDifficulty {
  if (value === '하' || value === '상') return value
  return '중'
}

function normalizeChoices(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map((item) => String(item ?? '')) : []
  const next = [...list]
  while (next.length < 5) next.push('')
  return next.slice(0, 5)
}

function normalizeAreas(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => String(item ?? '').trim()).filter(Boolean)
}

export function entranceExamQuestionFromRow(row: EntranceExamQuestionRow): EntranceExamQuestion {
  return {
    id: row.id,
    subject: asSubject(row.subject),
    targetGrade: asGrade(row.target_grade),
    questionType: 'multiple_choice',
    stem: row.stem ?? '',
    choices: normalizeChoices(row.choices),
    correctChoice: Math.min(5, Math.max(1, Number(row.correct_choice) || 1)),
    explanation: row.explanation ?? '',
    difficulty: asDifficulty(row.difficulty),
    evaluationAreas: normalizeAreas(row.evaluation_areas),
    unitName: row.unit_name ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRowPayload(input: EntranceExamQuestionInput) {
  return {
    subject: input.subject,
    target_grade: input.targetGrade,
    question_type: 'multiple_choice' as const,
    stem: input.stem.trim(),
    choices: normalizeChoices(input.choices),
    correct_choice: Math.min(5, Math.max(1, Number(input.correctChoice) || 1)),
    explanation: input.explanation.trim(),
    difficulty: input.difficulty,
    evaluation_areas: normalizeAreas(input.evaluationAreas),
    unit_name: input.unitName.trim(),
  }
}

function readLocal(): EntranceExamQuestion[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EntranceExamQuestion[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => ({
      ...item,
      subject: asSubject(item.subject),
      targetGrade: asGrade(item.targetGrade),
      questionType: 'multiple_choice' as const,
      choices: normalizeChoices(item.choices),
      correctChoice: Math.min(5, Math.max(1, Number(item.correctChoice) || 1)),
      evaluationAreas: normalizeAreas(item.evaluationAreas),
      unitName: item.unitName ?? '',
      explanation: item.explanation ?? '',
      stem: item.stem ?? '',
      difficulty: asDifficulty(item.difficulty),
    }))
  } catch {
    return []
  }
}

function writeLocal(list: EntranceExamQuestion[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export async function fetchEntranceExamQuestions(): Promise<EntranceExamQuestion[]> {
  if (!isSupabaseConfigured()) {
    return readLocal().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_questions')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    // Supabase 설정 시 localStorage로 숨기지 않음 — 실제 DB/RLS 상태를 그대로 노출
    throw new Error(error.message)
  }

  const rows = (data ?? []) as EntranceExamQuestionRow[]
  const mapped = rows.map(entranceExamQuestionFromRow)
  writeLocal(mapped)
  return mapped
}

export async function upsertEntranceExamQuestion(
  input: EntranceExamQuestionInput,
): Promise<{ success: true; record: EntranceExamQuestion } | { success: false; error: string }> {
  const payload = toRowPayload(input)
  const stamp = nowIso()

  if (!isSupabaseConfigured()) {
    const list = readLocal()
    const id = input.id?.trim() || createId()
    const existing = list.find((item) => item.id === id)
    const record: EntranceExamQuestion = {
      id,
      subject: payload.subject,
      targetGrade: payload.target_grade,
      questionType: 'multiple_choice',
      stem: payload.stem,
      choices: payload.choices,
      correctChoice: payload.correct_choice,
      explanation: payload.explanation,
      difficulty: payload.difficulty,
      evaluationAreas: payload.evaluation_areas,
      unitName: payload.unit_name,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    }
    const next = existing
      ? list.map((item) => (item.id === id ? record : item))
      : [record, ...list]
    writeLocal(next)
    return { success: true, record }
  }

  try {
    if (input.id?.trim()) {
      const { data, error } = await getSupabase()
        .from('entrance_exam_questions')
        .update({ ...payload, updated_at: stamp })
        .eq('id', input.id.trim())
        .select('*')
        .single()
      if (error) throw error
      const record = entranceExamQuestionFromRow(data as EntranceExamQuestionRow)
      const list = readLocal()
      const next = list.some((item) => item.id === record.id)
        ? list.map((item) => (item.id === record.id ? record : item))
        : [record, ...list]
      writeLocal(next)
      return { success: true, record }
    }

    const { data, error } = await getSupabase()
      .from('entrance_exam_questions')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    const record = entranceExamQuestionFromRow(data as EntranceExamQuestionRow)
    writeLocal([record, ...readLocal().filter((item) => item.id !== record.id)])
    return { success: true, record }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : String(error)
    // Supabase 설정 시 실패를 localStorage 성공으로 위장하지 않음
    return { success: false, error: message }
  }
}

export async function deleteEntranceExamQuestion(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isSupabaseConfigured()) {
    writeLocal(readLocal().filter((item) => item.id !== id))
    return { success: true }
  }

  const { error } = await getSupabase().from('entrance_exam_questions').delete().eq('id', id)
  if (error) {
    return { success: false, error: error.message }
  }
  writeLocal(readLocal().filter((item) => item.id !== id))
  return { success: true }
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function normalizeAnswers(raw: unknown): EntranceExamAnswerItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const row = item as Partial<EntranceExamAnswerItem> & {
      question_id?: string
      student_choice?: number | null
      correct_choice?: number
      is_correct?: boolean
    }
    const studentChoice =
      typeof row.studentChoice === 'number'
        ? row.studentChoice
        : typeof row.student_choice === 'number'
          ? row.student_choice
          : null
    return {
      questionId: String(row.questionId ?? row.question_id ?? ''),
      number: Number(row.number) || index + 1,
      studentChoice:
        studentChoice != null && studentChoice >= 1 && studentChoice <= 5 ? studentChoice : null,
      correctChoice: Math.min(5, Math.max(1, Number(row.correctChoice ?? row.correct_choice) || 1)),
      isCorrect: Boolean(row.isCorrect ?? row.is_correct),
    }
  })
}

function normalizeAreaScores(raw: unknown): EntranceExamAreaScore[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Partial<EntranceExamAreaScore> & {
      correct_count?: number
      total_count?: number
    }
    const totalCount = Number(row.totalCount ?? row.total_count) || 0
    const correctCount = Number(row.correctCount ?? row.correct_count) || 0
    const scoreRaw: unknown = row.score
    const score =
      scoreRaw == null || (typeof scoreRaw === 'string' && scoreRaw.trim() === '')
        ? null
        : Math.round(Number(scoreRaw) * 10) / 10
    const status =
      row.status === 'needs_time' || row.status === 'unavailable' || row.status === 'accuracy'
        ? row.status
        : totalCount === 0
          ? 'unavailable'
          : 'accuracy'
    return {
      area: String(row.area ?? ''),
      correctCount,
      totalCount,
      score: status === 'accuracy' ? score : null,
      status,
    }
  })
}

export function entranceExamPaperFromRow(row: EntranceExamPaperRow): EntranceExamPaper {
  const questionIds = normalizeIdList(row.question_ids)
  return {
    id: row.id,
    title: row.title ?? '',
    subject: asSubject(row.subject),
    targetGrade: row.target_grade ?? '',
    questionIds,
    questionCount: Number(row.question_count) || questionIds.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocalPapers(): EntranceExamPaper[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAPERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EntranceExamPaper[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => ({
      ...item,
      subject: asSubject(item.subject),
      questionIds: normalizeIdList(item.questionIds),
      questionCount: Number(item.questionCount) || normalizeIdList(item.questionIds).length,
    }))
  } catch {
    return []
  }
}

function writeLocalPapers(list: EntranceExamPaper[]) {
  localStorage.setItem(LOCAL_PAPERS_KEY, JSON.stringify(list))
}

export async function fetchEntranceExamPapers(): Promise<EntranceExamPaper[]> {
  if (!isSupabaseConfigured()) {
    return readLocalPapers().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_papers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as EntranceExamPaperRow[]
  const mapped = rows.map(entranceExamPaperFromRow)
  writeLocalPapers(mapped)
  return mapped
}

export async function upsertEntranceExamPaper(
  input: EntranceExamPaperInput,
): Promise<{ success: true; record: EntranceExamPaper } | { success: false; error: string }> {
  const questionIds = normalizeIdList(input.questionIds)
  const payload = {
    title: input.title.trim() || `${input.targetGrade} ${input.subject} 입학테스트`,
    subject: input.subject,
    target_grade: input.targetGrade.trim(),
    question_ids: questionIds,
    question_count: questionIds.length,
  }
  const stamp = nowIso()

  if (!isSupabaseConfigured()) {
    const list = readLocalPapers()
    const id = input.id?.trim() || createId()
    const existing = list.find((item) => item.id === id)
    const record: EntranceExamPaper = {
      id,
      title: payload.title,
      subject: payload.subject,
      targetGrade: payload.target_grade,
      questionIds,
      questionCount: questionIds.length,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    }
    const next = existing
      ? list.map((item) => (item.id === id ? record : item))
      : [record, ...list]
    writeLocalPapers(next)
    return { success: true, record }
  }

  try {
    if (input.id?.trim()) {
      const { data, error } = await getSupabase()
        .from('entrance_exam_papers')
        .update({ ...payload, updated_at: stamp })
        .eq('id', input.id.trim())
        .select('*')
        .single()
      if (error) throw error
      const record = entranceExamPaperFromRow(data as EntranceExamPaperRow)
      const papers = readLocalPapers()
      writeLocalPapers(
        papers.some((item) => item.id === record.id)
          ? papers.map((item) => (item.id === record.id ? record : item))
          : [record, ...papers],
      )
      return { success: true, record }
    }

    const { data, error } = await getSupabase()
      .from('entrance_exam_papers')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    const record = entranceExamPaperFromRow(data as EntranceExamPaperRow)
    const papers = readLocalPapers()
    writeLocalPapers([record, ...papers.filter((item) => item.id !== record.id)])
    return { success: true, record }
  } catch (error) {
    return { success: false, error: formatDbError(error) }
  }
}

function formatDbError(error: unknown): string {
  if (error instanceof Error && error.message && error.message !== '[object Object]') {
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    const row = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    if (typeof row.message === 'string' && row.message.trim()) return row.message
    try {
      return JSON.stringify(error)
    } catch {
      /* ignore */
    }
  }
  return String(error)
}

export function entranceExamAttemptFromRow(row: EntranceExamAttemptRow): EntranceExamAttempt {
  return {
    id: row.id,
    paperId: row.paper_id,
    paperTitle: row.paper_title ?? '',
    subject: asSubject(row.subject),
    school: row.school ?? '',
    studentName: row.student_name ?? '',
    grade: row.grade ?? '',
    examDate: row.exam_date ?? '',
    linkedStudentId: row.linked_student_id,
    answers: normalizeAnswers(row.answers),
    correctCount: Number(row.correct_count) || 0,
    totalCount: Number(row.total_count) || 0,
    totalScore: Math.round(Number(row.total_score) * 10) / 10 || 0,
    areaScores: normalizeAreaScores(row.area_scores),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocalAttempts(): EntranceExamAttempt[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EntranceExamAttempt[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeLocalAttempts(list: EntranceExamAttempt[]) {
  localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(list))
}

export async function fetchEntranceExamAttempts(): Promise<EntranceExamAttempt[]> {
  if (!isSupabaseConfigured()) {
    return readLocalAttempts().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_attempts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as EntranceExamAttemptRow[]
  const mapped = rows.map(entranceExamAttemptFromRow)
  writeLocalAttempts(mapped)
  return mapped
}

export async function upsertEntranceExamAttempt(
  input: EntranceExamAttemptInput,
): Promise<{ success: true; record: EntranceExamAttempt } | { success: false; error: string }> {
  const payload = {
    paper_id: input.paperId,
    paper_title: input.paperTitle.trim(),
    subject: input.subject,
    school: input.school.trim(),
    student_name: input.studentName.trim(),
    grade: input.grade.trim(),
    exam_date: input.examDate.trim() || null,
    linked_student_id: input.linkedStudentId?.trim() || null,
    answers: input.answers,
    correct_count: input.correctCount,
    total_count: input.totalCount,
    total_score: input.totalScore,
    area_scores: input.areaScores,
  }
  const stamp = nowIso()

  if (!isSupabaseConfigured()) {
    const list = readLocalAttempts()
    const id = input.id?.trim() || createId()
    const existing = list.find((item) => item.id === id)
    const record: EntranceExamAttempt = {
      id,
      paperId: payload.paper_id,
      paperTitle: payload.paper_title,
      subject: payload.subject,
      school: payload.school,
      studentName: payload.student_name,
      grade: payload.grade,
      examDate: input.examDate.trim(),
      linkedStudentId: payload.linked_student_id,
      answers: input.answers,
      correctCount: input.correctCount,
      totalCount: input.totalCount,
      totalScore: input.totalScore,
      areaScores: input.areaScores,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    }
    const next = existing
      ? list.map((item) => (item.id === id ? record : item))
      : [record, ...list]
    writeLocalAttempts(next)
    return { success: true, record }
  }

  try {
    if (input.id?.trim()) {
      const { data, error } = await getSupabase()
        .from('entrance_exam_attempts')
        .update({ ...payload, updated_at: stamp })
        .eq('id', input.id.trim())
        .select('*')
        .single()
      if (error) throw error
      const record = entranceExamAttemptFromRow(data as EntranceExamAttemptRow)
      writeLocalAttempts(
        readLocalAttempts().some((item) => item.id === record.id)
          ? readLocalAttempts().map((item) => (item.id === record.id ? record : item))
          : [record, ...readLocalAttempts()],
      )
      return { success: true, record }
    }

    const { data, error } = await getSupabase()
      .from('entrance_exam_attempts')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    const record = entranceExamAttemptFromRow(data as EntranceExamAttemptRow)
    writeLocalAttempts([record, ...readLocalAttempts().filter((item) => item.id !== record.id)])
    return { success: true, record }
  } catch (error) {
    return { success: false, error: formatDbError(error) }
  }
}

function roundScore1(value: unknown): number {
  return Math.round(Number(value) * 10) / 10 || 0
}

function normalizeSurveyResponses(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 1 && n <= 5) next[String(key)] = Math.round(n)
  }
  return next
}

export function entranceExamLearningSurveyFromRow(
  row: EntranceExamLearningSurveyRow,
): EntranceExamLearningSurvey {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    responses: normalizeSurveyResponses(row.responses),
    motivationScore: roundScore1(row.motivation_score),
    selfDirectedScore: roundScore1(row.self_directed_score),
    concentrationScore: roundScore1(row.concentration_score),
    planningScore: roundScore1(row.planning_score),
    persistenceScore: roundScore1(row.persistence_score),
    confidenceScore: roundScore1(row.confidence_score),
    overallScore: roundScore1(row.overall_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocalSurveys(): EntranceExamLearningSurvey[] {
  try {
    const raw = localStorage.getItem(LOCAL_SURVEYS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EntranceExamLearningSurvey[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeLocalSurveys(list: EntranceExamLearningSurvey[]) {
  localStorage.setItem(LOCAL_SURVEYS_KEY, JSON.stringify(list))
}

export async function fetchEntranceExamLearningSurveys(): Promise<EntranceExamLearningSurvey[]> {
  if (!isSupabaseConfigured()) {
    return readLocalSurveys().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_learning_surveys')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as EntranceExamLearningSurveyRow[]
  const mapped = rows.map(entranceExamLearningSurveyFromRow)
  writeLocalSurveys(mapped)
  return mapped
}

export async function fetchEntranceExamLearningSurveyByAttemptId(
  attemptId: string,
): Promise<EntranceExamLearningSurvey | null> {
  if (!attemptId.trim()) return null

  if (!isSupabaseConfigured()) {
    return readLocalSurveys().find((item) => item.attemptId === attemptId) ?? null
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_learning_surveys')
    .select('*')
    .eq('attempt_id', attemptId.trim())
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return entranceExamLearningSurveyFromRow(data as EntranceExamLearningSurveyRow)
}

/**
 * attempt_id당 1건: 있으면 UPDATE, 없으면 INSERT.
 * (UNIQUE(attempt_id) — 중복 설문 생성 방지)
 */
export async function upsertEntranceExamLearningSurvey(
  input: EntranceExamLearningSurveyInput,
): Promise<
  { success: true; record: EntranceExamLearningSurvey } | { success: false; error: string }
> {
  const attemptId = input.attemptId.trim()
  if (!attemptId) return { success: false, error: '응시 결과가 선택되지 않았습니다.' }

  const payload = {
    attempt_id: attemptId,
    responses: normalizeSurveyResponses(input.responses),
    motivation_score: input.motivationScore,
    self_directed_score: input.selfDirectedScore,
    concentration_score: input.concentrationScore,
    planning_score: input.planningScore,
    persistence_score: input.persistenceScore,
    confidence_score: input.confidenceScore,
    overall_score: input.overallScore,
  }
  const stamp = nowIso()

  if (!isSupabaseConfigured()) {
    const list = readLocalSurveys()
    const existing = list.find((item) => item.attemptId === attemptId)
    const record: EntranceExamLearningSurvey = {
      id: existing?.id ?? createId(),
      attemptId,
      responses: payload.responses,
      motivationScore: input.motivationScore,
      selfDirectedScore: input.selfDirectedScore,
      concentrationScore: input.concentrationScore,
      planningScore: input.planningScore,
      persistenceScore: input.persistenceScore,
      confidenceScore: input.confidenceScore,
      overallScore: input.overallScore,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    }
    writeLocalSurveys(
      existing
        ? list.map((item) => (item.attemptId === attemptId ? record : item))
        : [record, ...list],
    )
    return { success: true, record }
  }

  try {
    const existing = await fetchEntranceExamLearningSurveyByAttemptId(attemptId)
    if (existing) {
      const { data, error } = await getSupabase()
        .from('entrance_exam_learning_surveys')
        .update({ ...payload, updated_at: stamp })
        .eq('attempt_id', attemptId)
        .select('*')
        .single()
      if (error) throw error
      const record = entranceExamLearningSurveyFromRow(data as EntranceExamLearningSurveyRow)
      const surveys = readLocalSurveys()
      writeLocalSurveys(
        surveys.some((item) => item.attemptId === attemptId)
          ? surveys.map((item) => (item.attemptId === attemptId ? record : item))
          : [record, ...surveys],
      )
      return { success: true, record }
    }

    const { data, error } = await getSupabase()
      .from('entrance_exam_learning_surveys')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    const record = entranceExamLearningSurveyFromRow(data as EntranceExamLearningSurveyRow)
    writeLocalSurveys([
      record,
      ...readLocalSurveys().filter((item) => item.attemptId !== attemptId),
    ])
    return { success: true, record }
  } catch (error) {
    return { success: false, error: formatDbError(error) }
  }
}

export async function fetchEntranceExamLearningSurveyById(
  surveyId: string,
): Promise<EntranceExamLearningSurvey | null> {
  if (!surveyId.trim()) return null

  if (!isSupabaseConfigured()) {
    return readLocalSurveys().find((item) => item.id === surveyId.trim()) ?? null
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_learning_surveys')
    .select('*')
    .eq('id', surveyId.trim())
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return entranceExamLearningSurveyFromRow(data as EntranceExamLearningSurveyRow)
}

export function entranceExamEvaluationSessionFromRow(
  row: EntranceExamEvaluationSessionRow,
): EntranceExamEvaluationSession {
  return {
    id: row.id,
    studentName: row.student_name ?? '',
    school: row.school ?? '',
    grade: row.grade ?? '',
    evaluationDate: row.evaluation_date ?? '',
    mathAttemptId: row.math_attempt_id,
    englishAttemptId: row.english_attempt_id,
    learningSurveyId: row.learning_survey_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocalSessions(): EntranceExamEvaluationSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EntranceExamEvaluationSession[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeLocalSessions(list: EntranceExamEvaluationSession[]) {
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(list))
}

export async function fetchEntranceExamEvaluationSessions(): Promise<
  EntranceExamEvaluationSession[]
> {
  if (!isSupabaseConfigured()) {
    return readLocalSessions().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_evaluation_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[entrance_exam_evaluation_sessions] SELECT failed', error)
    // 테이블 미적용 등 — 목록만 빈 배열로 처리 (개발 로그는 위에서 확인)
    const message = error.message || ''
    if (
      message.includes('does not exist') ||
      message.includes('schema cache') ||
      error.code === '42P01' ||
      error.code === 'PGRST205'
    ) {
      return []
    }
    throw new Error(error.message)
  }
  const rows = (data ?? []) as EntranceExamEvaluationSessionRow[]
  const mapped = rows.map(entranceExamEvaluationSessionFromRow)
  writeLocalSessions(mapped)
  return mapped
}

export async function fetchEntranceExamEvaluationSessionById(
  sessionId: string,
): Promise<EntranceExamEvaluationSession | null> {
  if (!sessionId.trim()) return null

  if (!isSupabaseConfigured()) {
    return readLocalSessions().find((item) => item.id === sessionId.trim()) ?? null
  }

  const { data, error } = await getSupabase()
    .from('entrance_exam_evaluation_sessions')
    .select('*')
    .eq('id', sessionId.trim())
    .maybeSingle()

  if (error) {
    console.error('[entrance_exam_evaluation_sessions] SELECT by id failed', error)
    throw new Error(error.message)
  }
  if (!data) return null
  return entranceExamEvaluationSessionFromRow(data as EntranceExamEvaluationSessionRow)
}

function sameEvaluationSessionMeta(
  a: {
    studentName: string
    school: string
    grade: string
    evaluationDate: string
  },
  b: {
    studentName: string
    school: string
    grade: string
    evaluationDate: string
  },
): boolean {
  const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase()
  return (
    norm(a.studentName) === norm(b.studentName) &&
    norm(a.school) === norm(b.school) &&
    norm(a.grade) === norm(b.grade) &&
    (a.evaluationDate || '').slice(0, 10) === (b.evaluationDate || '').slice(0, 10)
  )
}

export async function upsertEntranceExamEvaluationSession(
  input: EntranceExamEvaluationSessionInput,
): Promise<
  | { success: true; record: EntranceExamEvaluationSession }
  | { success: false; error: string }
> {
  const payload = {
    student_name: input.studentName.trim(),
    school: input.school.trim(),
    grade: input.grade.trim(),
    evaluation_date: input.evaluationDate.trim() || null,
    math_attempt_id: input.mathAttemptId?.trim() || null,
    english_attempt_id: input.englishAttemptId?.trim() || null,
    learning_survey_id: input.learningSurveyId?.trim() || null,
  }
  const stamp = nowIso()

  if (!payload.math_attempt_id && !payload.english_attempt_id && !payload.learning_survey_id) {
    return {
      success: false,
      error: '수학·영어·학습성향 결과 중 하나 이상을 선택해야 합니다.',
    }
  }

  if (!isSupabaseConfigured()) {
    const list = readLocalSessions()
    const metaMatch = list.find((item) =>
      sameEvaluationSessionMeta(item, {
        studentName: payload.student_name,
        school: payload.school,
        grade: payload.grade,
        evaluationDate: input.evaluationDate.trim(),
      }),
    )
    const id = input.id?.trim() || metaMatch?.id || createId()
    const existing = list.find((item) => item.id === id)
    const record: EntranceExamEvaluationSession = {
      id,
      studentName: payload.student_name,
      school: payload.school,
      grade: payload.grade,
      evaluationDate: input.evaluationDate.trim(),
      mathAttemptId: payload.math_attempt_id,
      englishAttemptId: payload.english_attempt_id,
      learningSurveyId: payload.learning_survey_id,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    }
    writeLocalSessions(
      existing
        ? list.map((item) => (item.id === id ? record : item))
        : [record, ...list.filter((item) => item.id !== id)],
    )
    return { success: true, record }
  }

  try {
    let targetId = input.id?.trim() || ''
    if (!targetId) {
      const existingList = await fetchEntranceExamEvaluationSessions()
      const metaMatch = existingList.find((item) =>
        sameEvaluationSessionMeta(item, {
          studentName: payload.student_name,
          school: payload.school,
          grade: payload.grade,
          evaluationDate: input.evaluationDate.trim(),
        }),
      )
      targetId = metaMatch?.id ?? ''
    }

    if (targetId) {
      const { data, error } = await getSupabase()
        .from('entrance_exam_evaluation_sessions')
        .update({ ...payload, updated_at: stamp })
        .eq('id', targetId)
        .select('*')
        .single()
      if (error) {
        console.error('[entrance_exam_evaluation_sessions] UPDATE failed', error)
        throw error
      }
      const record = entranceExamEvaluationSessionFromRow(data as EntranceExamEvaluationSessionRow)
      const sessions = readLocalSessions()
      writeLocalSessions(
        sessions.some((item) => item.id === record.id)
          ? sessions.map((item) => (item.id === record.id ? record : item))
          : [record, ...sessions],
      )
      return { success: true, record }
    }

    const { data, error } = await getSupabase()
      .from('entrance_exam_evaluation_sessions')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      console.error('[entrance_exam_evaluation_sessions] INSERT failed', error)
      throw error
    }
    const record = entranceExamEvaluationSessionFromRow(data as EntranceExamEvaluationSessionRow)
    writeLocalSessions([
      record,
      ...readLocalSessions().filter((item) => item.id !== record.id),
    ])
    return { success: true, record }
  } catch (error) {
    console.error('[entrance_exam_evaluation_sessions] upsert failed', error)
    return { success: false, error: formatDbError(error) }
  }
}

/**
 * attempt 저장 후 같은 학생·학교·학년·평가일 evaluation session에 자동 연결.
 * 세션 테이블이 없거나 실패해도 attempt 저장 자체는 이미 성공한 상태이므로 조용히 무시한다.
 */
export async function linkAttemptToEvaluationSession(
  attempt: EntranceExamAttempt,
): Promise<EntranceExamEvaluationSession | null> {
  try {
    const evaluationDate =
      (attempt.examDate || '').trim().slice(0, 10) || attempt.createdAt.slice(0, 10)
    const sessions = await fetchEntranceExamEvaluationSessions().catch((err) => {
      console.error('[entrance_exam_evaluation_sessions] linkAttempt list failed', err)
      return [] as EntranceExamEvaluationSession[]
    })
    const nameKey = [
      attempt.studentName.trim().replace(/\s+/g, ' ').toLowerCase(),
      attempt.school.trim().replace(/\s+/g, ' ').toLowerCase(),
      attempt.grade.trim().replace(/\s+/g, ' ').toLowerCase(),
      evaluationDate,
    ].join('|')

    const existing =
      sessions.find((session) => {
        if (attempt.subject === '수학' && session.mathAttemptId === attempt.id) return true
        if (attempt.subject === '영어' && session.englishAttemptId === attempt.id) return true
        const sessionKey = [
          session.studentName.trim().replace(/\s+/g, ' ').toLowerCase(),
          session.school.trim().replace(/\s+/g, ' ').toLowerCase(),
          session.grade.trim().replace(/\s+/g, ' ').toLowerCase(),
          (session.evaluationDate || '').slice(0, 10),
        ].join('|')
        return sessionKey === nameKey
      }) ?? null

    const result = await upsertEntranceExamEvaluationSession({
      id: existing?.id,
      studentName: attempt.studentName,
      school: attempt.school,
      grade: attempt.grade,
      evaluationDate,
      mathAttemptId:
        attempt.subject === '수학' ? attempt.id : existing?.mathAttemptId ?? null,
      englishAttemptId:
        attempt.subject === '영어' ? attempt.id : existing?.englishAttemptId ?? null,
      learningSurveyId: existing?.learningSurveyId ?? null,
    })
    if (!result.success) {
      console.error('[entrance_exam_evaluation_sessions] linkAttempt upsert failed', result.error)
      return null
    }
    return result.record
  } catch (error) {
    console.error('[entrance_exam_evaluation_sessions] linkAttempt failed', error)
    return null
  }
}

/**
 * 학습성향 저장 후 해당 attempt와 같은 evaluation session에 survey를 연결.
 */
export async function linkSurveyToEvaluationSession(params: {
  survey: EntranceExamLearningSurvey
  attempt: EntranceExamAttempt
}): Promise<EntranceExamEvaluationSession | null> {
  try {
    const { survey, attempt } = params
    const evaluationDate =
      (attempt.examDate || '').trim().slice(0, 10) || attempt.createdAt.slice(0, 10)
    const sessions = await fetchEntranceExamEvaluationSessions().catch((err) => {
      console.error('[entrance_exam_evaluation_sessions] linkSurvey list failed', err)
      return [] as EntranceExamEvaluationSession[]
    })
    const nameKey = [
      attempt.studentName.trim().replace(/\s+/g, ' ').toLowerCase(),
      attempt.school.trim().replace(/\s+/g, ' ').toLowerCase(),
      attempt.grade.trim().replace(/\s+/g, ' ').toLowerCase(),
      evaluationDate,
    ].join('|')

    const existing =
      sessions.find((session) => {
        if (session.learningSurveyId === survey.id) return true
        if (session.mathAttemptId === attempt.id || session.englishAttemptId === attempt.id) {
          return true
        }
        const sessionKey = [
          session.studentName.trim().replace(/\s+/g, ' ').toLowerCase(),
          session.school.trim().replace(/\s+/g, ' ').toLowerCase(),
          session.grade.trim().replace(/\s+/g, ' ').toLowerCase(),
          (session.evaluationDate || '').slice(0, 10),
        ].join('|')
        return sessionKey === nameKey
      }) ?? null

    const result = await upsertEntranceExamEvaluationSession({
      id: existing?.id,
      studentName: attempt.studentName,
      school: attempt.school,
      grade: attempt.grade,
      evaluationDate,
      mathAttemptId:
        attempt.subject === '수학' ? attempt.id : existing?.mathAttemptId ?? null,
      englishAttemptId:
        attempt.subject === '영어' ? attempt.id : existing?.englishAttemptId ?? null,
      learningSurveyId: survey.id,
    })
    if (!result.success) {
      console.error('[entrance_exam_evaluation_sessions] linkSurvey upsert failed', result.error)
      return null
    }
    return result.record
  } catch (error) {
    console.error('[entrance_exam_evaluation_sessions] linkSurvey failed', error)
    return null
  }
}
