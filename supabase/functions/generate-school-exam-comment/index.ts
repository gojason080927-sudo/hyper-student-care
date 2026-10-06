import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** src/utils/schoolExamReport.ts 의 SCHOOL_PLAN_MAX_LINES 와 같은 값 */
const SCHOOL_PLAN_MAX_LINES = 8
const DEFAULT_MODEL = 'claude-sonnet-5-5'
const MAX_TOKENS = 800
const TIMEOUT_MS = 30_000

const SYSTEM_PROMPT = `당신은 학원 수학 선생님입니다. 학교 시험 결과를 바탕으로 학부모에게 보낼 "선생님 총평"과 "다음 시험 대비 계획" 초안을 씁니다.

[문체]
- 정중한 합쇼체로 씁니다("~입니다", "~하겠습니다").

[총평]
- 3~4문장.
- 점수와 강점 한 가지, 틀린 문제의 공통 원인(단원·유형을 구체적으로), 다음 시험까지의 방향을 담습니다.

[대비 계획]
- 3~4줄, 각 줄은 한 문장입니다.
- 단원·유형·횟수가 드러나는 구체적인 행동으로 씁니다.
- 줄 앞에 번호나 기호를 붙이지 않습니다.

[지켜야 할 것]
- 입력으로 받은 데이터에 없는 사실은 쓰지 않습니다. 숙제 태도, 성격, 수업 중 모습 등을 지어내지 않습니다.
- 비난·단정·과장을 하지 않고, 학생을 깎아내리지 않습니다.
- 틀린 문제가 없거나 점수가 매우 높으면 칭찬과 심화 방향 중심으로 씁니다.

[출력 형식]
- 다른 설명 없이 아래 JSON 하나만 출력합니다.
{"comment": "총평 문장들", "plan": ["계획 1", "계획 2", "계획 3"]}`

type WrongItemInput = {
  no?: unknown
  difficulty?: unknown
  unit?: unknown
  type?: unknown
  cause?: unknown
  note?: unknown
}

type DifficultyInput = { difficulty?: unknown; correct?: unknown; total?: unknown }

type RequestBody = {
  exam?: { title?: unknown; subject?: unknown; grade?: unknown; range?: unknown }
  score?: unknown
  totalPoints?: unknown
  itemCount?: unknown
  wrongItems?: unknown
  correctByDifficulty?: unknown
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function authorizeTeacher(request: Request): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon) return false
  const authClient = createClient(url, anon)
  const { data } = await authClient.auth.getUser(token)
  return Boolean(data.user)
}

/** 허용한 필드만 골라 프롬프트용 데이터를 만든다 (학생 이름·학교·ID 등은 넣지 않는다) */
function buildInput(body: RequestBody) {
  const exam = body.exam ?? {}
  const wrongItems = Array.isArray(body.wrongItems)
    ? (body.wrongItems as WrongItemInput[]).map((w) => ({
        no: asNumber(w?.no),
        difficulty: asString(w?.difficulty),
        unit: asString(w?.unit),
        type: asString(w?.type),
        cause: asString(w?.cause),
        note: asString(w?.note),
      }))
    : []
  const correctByDifficulty = Array.isArray(body.correctByDifficulty)
    ? (body.correctByDifficulty as DifficultyInput[]).map((d) => ({
        difficulty: asString(d?.difficulty),
        correct: asNumber(d?.correct),
        total: asNumber(d?.total),
      }))
    : undefined
  return {
    exam: {
      title: asString(exam.title),
      subject: asString(exam.subject),
      grade: asString(exam.grade),
      range: asString(exam.range),
    },
    score: asNumber(body.score),
    totalPoints: asNumber(body.totalPoints),
    itemCount: asNumber(body.itemCount),
    wrongItems,
    ...(correctByDifficulty ? { correctByDifficulty } : {}),
  }
}

function parseDraft(text: string): { comment: string; plan: string[] } | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { comment?: unknown; plan?: unknown }
    const comment = asString(parsed.comment)
    if (!comment || !Array.isArray(parsed.plan)) return null
    const plan = parsed.plan.map(asString).filter(Boolean).slice(0, SCHOOL_PLAN_MAX_LINES)
    if (plan.length === 0) return null
    return { comment, plan }
  } catch {
    return null
  }
}

async function callAnthropic(apiKey: string, model: string, userContent: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })
    if (!response.ok) {
      throw new Error(`anthropic_http_${response.status}`)
    }
    const data = (await response.json()) as { content?: { type?: string; text?: string }[] }
    return (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const teacherOk = await authorizeTeacher(request)
  if (!teacherOk) {
    return jsonResponse({ status: 'unauthorized' }, 401)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim()
  if (!apiKey) {
    return jsonResponse({ status: 'not_configured' }, 500)
  }
  const model = Deno.env.get('SCHOOL_EXAM_COMMENT_MODEL')?.trim() || DEFAULT_MODEL

  let body: RequestBody = {}
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return jsonResponse({ status: 'error', error: 'invalid_json' }, 400)
  }

  const userContent = `다음은 학생 1명의 학교 시험 결과 데이터입니다. 이 데이터만 근거로 총평과 대비 계획을 JSON으로 써 주세요.\n\n${JSON.stringify(buildInput(body), null, 2)}`

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await callAnthropic(apiKey, model, userContent)
      const draft = parseDraft(text)
      if (draft) return jsonResponse({ comment: draft.comment, plan: draft.plan })
    }
    return jsonResponse({ status: 'error', error: 'invalid_model_output' }, 502)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.warn('[SchoolExamComment] generate failed', error instanceof Error && error.name === 'AbortError' ? 'timeout' : message)
    return jsonResponse({ status: 'error', error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'generate_failed' }, 502)
  }
})
