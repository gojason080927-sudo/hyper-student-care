import { getSupabase } from './supabase'

/** AI 요청 본문 — 학생 이름·반 이름·ID·연락처는 넣지 않는다 */
export type MathAiCommentRequest = {
  kind: 'comment'
  exam: { title: string; grade: string }
  score: number
  totalPoints: number
  itemCount: number
  wrongItems: { no: number; difficulty: string; unit: string; type: string; cause: string; note: string }[]
  correctByDifficulty: { difficulty: string; correct: number; total: number }[]
}

export type MathAiProblemRequest = {
  kind: 'problem'
  exam: { title: string; grade: string }
  no: number
  difficulty: string
  unit: string
  cause: string
  imageBase64: string
}

export type MathAiResult<T> = { ok: true; value: T } | { ok: false; message: string }

const FAIL = 'AI 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'
const BAD = 'AI 초안 형식이 올바르지 않습니다. 다시 시도해 주세요.'

async function invoke(body: MathAiCommentRequest | MathAiProblemRequest): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await getSupabase().functions.invoke('math-monthly-ai', { body })
    if (error) {
      console.warn('[MathMonthlyAi] invoke failed', error.message)
      return null
    }
    return (data ?? {}) as Record<string, unknown>
  } catch (error) {
    console.warn('[MathMonthlyAi] invoke failed', error instanceof Error ? error.message : error)
    return null
  }
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export async function generateMathComment(
  body: MathAiCommentRequest,
): Promise<MathAiResult<{ strengths: string; improvements: string; comment: string }>> {
  const data = await invoke(body)
  if (!data) return { ok: false, message: FAIL }
  const value = { strengths: text(data.strengths), improvements: text(data.improvements), comment: text(data.comment) }
  if (!value.strengths || !value.improvements || !value.comment) return { ok: false, message: BAD }
  return { ok: true, value }
}

export async function analyzeMathProblem(body: MathAiProblemRequest): Promise<MathAiResult<{ type: string; note: string }>> {
  const data = await invoke(body)
  if (!data) return { ok: false, message: FAIL }
  const value = { type: text(data.type), note: text(data.note) }
  if (!value.type || !value.note) return { ok: false, message: BAD }
  return { ok: true, value }
}
