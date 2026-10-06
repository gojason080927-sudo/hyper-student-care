import { SCHOOL_PLAN_MAX_LINES } from '../utils/schoolExamReport'
import { getSupabase } from './supabase'

/** AI 초안 요청 본문 — 학생 이름·연락처·학교명·ID 는 넣지 않는다 */
export type SchoolExamAiCommentRequest = {
  exam: { title: string; subject: string; grade: string; range: string }
  score: number
  totalPoints: number
  itemCount: number
  wrongItems: { no: number; difficulty: string; unit: string; type: string; cause: string; note: string }[]
  correctByDifficulty?: { difficulty: string; correct: number; total: number }[]
}

export type SchoolExamAiCommentResult =
  | { ok: true; comment: string; plan: string[] }
  | { ok: false; message: string }

export async function generateSchoolExamAiComment(body: SchoolExamAiCommentRequest): Promise<SchoolExamAiCommentResult> {
  try {
    const { data, error } = await getSupabase().functions.invoke('generate-school-exam-comment', { body })
    if (error) {
      console.warn('[SchoolExamComment] invoke failed', error.message)
      return { ok: false, message: 'AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }
    }
    const payload = data as { comment?: unknown; plan?: unknown } | null
    const comment = typeof payload?.comment === 'string' ? payload.comment.trim() : ''
    const plan = Array.isArray(payload?.plan)
      ? payload.plan.filter((l): l is string => typeof l === 'string' && l.trim() !== '').map((l) => l.trim())
      : []
    if (!comment || plan.length === 0) {
      return { ok: false, message: 'AI 초안 형식이 올바르지 않습니다. 다시 시도해 주세요.' }
    }
    return { ok: true, comment, plan: plan.slice(0, SCHOOL_PLAN_MAX_LINES) }
  } catch (error) {
    console.warn('[SchoolExamComment] invoke failed', error instanceof Error ? error.message : error)
    return { ok: false, message: 'AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }
}
