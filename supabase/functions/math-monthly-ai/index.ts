import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'claude-sonnet-5-5'
const MAX_TOKENS = 2000
const TIMEOUT_MS = 40_000
/** 이미지 1장 최대 크기 (base64 를 풀었을 때 바이트) */
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024
const MAX_WRONG_ITEMS = 100

const PROBLEM_PROMPT = `당신은 학원 수학 선생님입니다. 학생이 틀린 문제 사진 1장을 보고, 문제 유형과 강사 분석 한 줄 초안을 씁니다.

[문제 유형]
- 짧은 명사구 하나로 씁니다(예: "이차함수의 최대·최소", "등차수열의 합").

[단원]
- 단원 이름은 판단하지 않습니다. unit은 항상 빈 문자열로 둡니다.

[강사 분석]
- 한 문장(최대 두 문장), 정중한 합쇼체입니다.
- 학생이 막힌 지점과 문제의 핵심 아이디어를 담습니다.
- 사진 속 풀이 흔적과 선생님의 채점 표시를 근거로 삼습니다. 읽을 수 없으면 추측하지 말고 이 유형의 일반적인 설명만 씁니다.

[지켜야 할 것]
- 사진에 학생 이름이 보여도 결과에 쓰지 않습니다.
- 입력에 없는 사실(태도·성격·수업 모습)은 지어내지 않습니다. 비난·단정·과장을 하지 않습니다.

[출력 형식]
- 다른 설명 없이 아래 JSON 하나만 출력합니다.
{"type": "문제 유형", "note": "강사 분석 한 줄", "unit": ""}`

const LOCATE_PROMPT = `당신은 시험지 사진에서 문제 위치를 찾는 도우미입니다. 시험지 한 쪽 사진과 찾아야 할 문제 번호 목록이 주어집니다.

[할 일]
- 목록에 있는 번호의 문제가 이 사진에 있으면, 그 문제 하나를 통째로 감싸는 직사각형 영역을 찾습니다.
- 영역에는 문제 번호, 지문, 그림·그래프, 보기(선지), 배점 표시가 모두 들어가야 합니다. 이웃한 다른 문제는 들어가지 않게 합니다.
- 학생의 풀이 흔적과 채점 표시는 그 문제 영역 안에 있으면 그대로 포함합니다.
- 시험지가 두 단으로 되어 있으면 해당 단 안에서만 영역을 잡습니다.
- 사진에 없는 번호, 확실하지 않은 번호는 찾지 않은 것으로 처리합니다. 추측하지 않습니다.

[좌표]
- x, y는 영역의 왼쪽 위 모서리, w, h는 영역의 가로·세로 크기이며, 모두 사진 전체 크기를 1로 본 0~1 사이 소수입니다(소수 셋째 자리까지).

[회전]
- 사진이 뒤집히거나 옆으로 누워 있어서 그 문제의 글자가 똑바로 읽히지 않으면, 글자를 똑바로 세우기 위해 시계 방향으로 돌려야 하는 각도(0, 90, 180, 270)를 rotate에 적습니다. 똑바로면 0입니다.
- 이때 x, y, w, h는 돌리기 전의 사진(받은 그대로의 사진) 기준입니다.

[출력 형식]
- 다른 설명 없이 아래 JSON 하나만 출력합니다.
{"boxes": [{"no": 3, "x": 0.06, "y": 0.12, "w": 0.42, "h": 0.30, "rotate": 0}], "notFound": [7]}`

const COMMENT_PROMPT = `당신은 학원 수학 선생님입니다. 수학 월말평가 결과를 바탕으로 학부모에게 보낼 "선생님 의견" 초안을 씁니다.

[문체]
- 정중한 합쇼체로 씁니다("~입니다", "~하겠습니다").

[항목]
- strengths(잘한 점): 1~2문장. 맞힌 난이도·단원을 근거로 씁니다.
- improvements(보완할 점): 1~2문장. 틀린 문제의 공통 원인·단원을 구체적으로 씁니다.
- comment(총평): 3문장 이내. 점수와 앞으로의 방향을 담습니다.

[지켜야 할 것]
- 입력으로 받은 데이터에 없는 사실은 쓰지 않습니다. 숙제 태도, 성격, 수업 중 모습 등을 지어내지 않습니다.
- 비난·단정·과장을 하지 않고, 학생을 깎아내리지 않습니다.
- 틀린 문제가 없거나 점수가 매우 높으면 칭찬과 심화 방향 중심으로 씁니다.

[출력 형식]
- 다른 설명 없이 아래 JSON 하나만 출력합니다.
{"strengths": "...", "improvements": "...", "comment": "..."}`

type Json = Record<string, unknown>

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

/** base64 문자열을 풀었을 때의 바이트 수 */
function base64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

type Content = string | { type: string; [key: string]: unknown }[]

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userContent: Content,
): Promise<{ text: string; stopReason: string | null }> {
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
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    })
    if (!response.ok) {
      throw new Error(`anthropic_http_${response.status}`)
    }
    const data = (await response.json()) as {
      content?: { type?: string; text?: string }[]
      stop_reason?: string | null
    }
    const text = (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
    return { text, stopReason: data.stop_reason ?? null }
  } finally {
    clearTimeout(timer)
  }
}

function parseJson(text: string): Json | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as Json
  } catch {
    return null
  }
}

function parseProblem(text: string): Json | null {
  const parsed = parseJson(text)
  if (!parsed) return null
  const type = asString(parsed.type)
  const note = asString(parsed.note)
  const unit = asString(parsed.unit)
  return type && note ? { type, note, unit } : null
}

function parseLocate(text: string): Json | null {
  const parsed = parseJson(text)
  if (!parsed || !Array.isArray(parsed.boxes)) return null
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const boxes: Json[] = []
  for (const raw of parsed.boxes as Json[]) {
    const no = asNumber(raw?.no)
    const x = asNumber(raw?.x)
    const y = asNumber(raw?.y)
    const w = asNumber(raw?.w)
    const h = asNumber(raw?.h)
    if (no === null || x === null || y === null || w === null || h === null) continue
    const bx = clamp(x)
    const by = clamp(y)
    const bw = Math.min(clamp(w), 1 - bx)
    const bh = Math.min(clamp(h), 1 - by)
    if (bw < 0.05 || bh < 0.03) continue
    const rot = asNumber(raw?.rotate)
    const rotate = rot === 90 || rot === 180 || rot === 270 ? rot : 0
    boxes.push({ no, x: bx, y: by, w: bw, h: bh, rotate })
  }
  const notFound = Array.isArray(parsed.notFound) ? (parsed.notFound as unknown[]).filter((n) => typeof n === 'number') : []
  return { boxes, notFound }
}

function parseComment(text: string): Json | null {
  const parsed = parseJson(text)
  if (!parsed) return null
  const strengths = asString(parsed.strengths)
  const improvements = asString(parsed.improvements)
  const comment = asString(parsed.comment)
  return strengths && improvements && comment ? { strengths, improvements, comment } : null
}

/** 허용한 필드만 골라 프롬프트용 데이터를 만든다 (학생 이름·반 이름·ID 등은 넣지 않는다) */
function buildCommentInput(body: Json) {
  const exam = (body.exam ?? {}) as Json
  const wrongItems = Array.isArray(body.wrongItems)
    ? (body.wrongItems as Json[]).slice(0, MAX_WRONG_ITEMS).map((w) => ({
        no: asNumber(w?.no),
        difficulty: asString(w?.difficulty),
        unit: asString(w?.unit),
        type: asString(w?.type),
        cause: asString(w?.cause),
        note: asString(w?.note),
      }))
    : []
  const correctByDifficulty = Array.isArray(body.correctByDifficulty)
    ? (body.correctByDifficulty as Json[]).slice(0, 8).map((d) => ({
        difficulty: asString(d?.difficulty),
        correct: asNumber(d?.correct),
        total: asNumber(d?.total),
      }))
    : []
  return {
    exam: { title: asString(exam.title), grade: asString(exam.grade) },
    score: asNumber(body.score),
    totalPoints: asNumber(body.totalPoints),
    itemCount: asNumber(body.itemCount),
    wrongItems,
    correctByDifficulty,
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
  const model = Deno.env.get('MATH_MONTHLY_AI_MODEL')?.trim() || DEFAULT_MODEL

  let body: Json = {}
  try {
    body = (await request.json()) as Json
  } catch {
    return jsonResponse({ status: 'error', error: 'invalid_json' }, 400)
  }

  const kind = body.kind
  let system: string
  let userContent: Content
  let parse: (text: string) => Json | null

  if (kind === 'problem') {
    const image = asString(body.imageBase64).replace(/^data:image\/\w+;base64,/, '')
    if (!image) return jsonResponse({ status: 'error', error: 'image_required' }, 400)
    if (base64Bytes(image) > MAX_IMAGE_BYTES) return jsonResponse({ status: 'error', error: 'image_too_large' }, 413)
    const exam = (body.exam ?? {}) as Json
    const info = {
      exam: { title: asString(exam.title), grade: asString(exam.grade) },
      no: asNumber(body.no),
      difficulty: asString(body.difficulty),
      unit: asString(body.unit),
      cause: asString(body.cause),
    }
    system = PROBLEM_PROMPT
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
      { type: 'text', text: `위 사진은 학생이 틀린 문제입니다. 아래 정보를 참고해 문제 유형과 강사 분석 한 줄을 JSON으로 써 주세요.\n\n${JSON.stringify(info, null, 2)}` },
    ]
    parse = parseProblem
  } else if (kind === 'locate') {
    const image = asString(body.imageBase64).replace(/^data:image\/\w+;base64,/, '')
    if (!image) return jsonResponse({ status: 'error', error: 'image_required' }, 400)
    if (base64Bytes(image) > MAX_IMAGE_BYTES) return jsonResponse({ status: 'error', error: 'image_too_large' }, 413)
    const nos = Array.isArray(body.nos)
      ? (body.nos as unknown[]).filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 200).slice(0, MAX_WRONG_ITEMS)
      : []
    if (nos.length === 0) return jsonResponse({ status: 'error', error: 'nos_required' }, 400)
    system = LOCATE_PROMPT
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
      { type: 'text', text: `위 사진은 시험지 한 쪽입니다. 찾아야 할 문제 번호: ${nos.join(', ')}\n각 번호의 문제 영역을 JSON으로 알려 주세요.` },
    ]
    parse = parseLocate
  } else if (kind === 'comment') {
    system = COMMENT_PROMPT
    userContent = `다음은 학생 1명의 수학 월말평가 결과 데이터입니다. 이 데이터만 근거로 잘한 점·보완할 점·총평을 JSON으로 써 주세요.\n\n${JSON.stringify(buildCommentInput(body), null, 2)}`
    parse = parseComment
  } else {
    return jsonResponse({ status: 'error', error: 'invalid_kind' }, 400)
  }

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text, stopReason } = await callAnthropic(apiKey, model, system, userContent)
      const result = parse(text)
      if (result) return jsonResponse(result)
      console.warn('[MathMonthlyAi] parse failed', {
        kind,
        attempt: attempt + 1,
        stop_reason: stopReason,
        length: text.length,
        head: text.slice(0, 200),
      })
    }
    return jsonResponse({ status: 'error', error: 'invalid_model_output' }, 502)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.warn('[MathMonthlyAi] generate failed', timedOut ? 'timeout' : error instanceof Error ? error.message : 'unknown')
    return jsonResponse({ status: 'error', error: timedOut ? 'timeout' : 'generate_failed' }, 502)
  }
})
