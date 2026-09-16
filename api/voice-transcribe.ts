import { createClient } from '@supabase/supabase-js'
import {
  MAX_AUDIO_BYTES,
  decodeBase64Audio,
  filenameForMimeType,
} from '../src/utils/voiceInput/sttProtocol.ts'

export const config = { runtime: 'edge' }

const STT_CLASSROOM_PROMPT =
  '한국어 학원 받아쓰기. 차시는 1차 2차 3차 4차로 적고 점수는 0부터 100까지 숫자로 적는다.'

export type TranscribeEnv = {
  openaiApiKey: string
  openaiModel: string
  supabaseUrl: string
  supabaseAnonKey: string
  fetchImpl?: typeof fetch
  verifyUser?: (token: string) => Promise<boolean>
}

function readRuntimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return runtime.process?.env ?? {}
}

export function envFromProcess(
  env: Record<string, string | undefined> = readRuntimeEnv(),
): TranscribeEnv {
  return {
    openaiApiKey: env.OPENAI_API_KEY?.trim() ?? '',
    openaiModel: env.OPENAI_TRANSCRIBE_MODEL?.trim() || 'gpt-4o-transcribe',
    supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim() ?? '',
    supabaseAnonKey: (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function defaultVerifyUser(token: string, env: TranscribeEnv): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return false
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)
  return Boolean(!error && data.user?.id)
}

export async function handleVoiceTranscribe(
  request: Request,
  env: TranscribeEnv,
): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return json({ error: 'unauthorized' }, 401)

  const verify = env.verifyUser ?? ((value: string) => defaultVerifyUser(value, env))
  const allowed = await verify(token)
  if (!allowed) return json({ error: 'unauthorized' }, 401)

  if (!env.openaiApiKey) return json({ error: 'stt_unavailable' }, 503)

  let payload: {
    mimeType?: unknown
    filename?: unknown
    audioBase64?: unknown
  }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return json({ error: 'malformed' }, 400)
  }

  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : ''
  const audioBase64 = typeof payload.audioBase64 === 'string' ? payload.audioBase64 : ''
  if (!audioBase64) return json({ error: 'empty' }, 422)

  let bytes: Uint8Array
  try {
    bytes = decodeBase64Audio(audioBase64)
  } catch {
    return json({ error: 'malformed' }, 400)
  }
  if (!bytes.byteLength) return json({ error: 'empty' }, 422)
  if (bytes.byteLength > MAX_AUDIO_BYTES) return json({ error: 'too_large' }, 413)

  const filename =
    typeof payload.filename === 'string' && payload.filename.trim()
      ? payload.filename.trim()
      : filenameForMimeType(mimeType)
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength))
  copy.set(bytes)
  const audioBlob = new Blob([copy], {
    type: mimeType || 'application/octet-stream',
  })

  const fetchImpl = env.fetchImpl ?? fetch
  const postTranscription = (model: string) => {
    const form = new FormData()
    form.append('file', audioBlob, filename)
    form.append('model', model)
    form.append('language', 'ko')
    form.append('prompt', STT_CLASSROOM_PROMPT)
    return fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.openaiApiKey}` },
      body: form,
      signal: AbortSignal.timeout(25000),
    })
  }

  let upstream: Response
  try {
    upstream = await postTranscription(env.openaiModel)
    if (
      !upstream.ok &&
      env.openaiModel !== 'whisper-1' &&
      (upstream.status === 400 || upstream.status === 404)
    ) {
      upstream = await postTranscription('whisper-1')
    }
  } catch {
    return json({ error: 'upstream_timeout' }, 504)
  }

  let upstreamJson: unknown = null
  try {
    upstreamJson = await upstream.json()
  } catch {
    return json({ error: 'malformed_upstream' }, 502)
  }

  if (!upstream.ok) {
    const status = upstream.status >= 500 ? 502 : upstream.status === 401 ? 503 : 502
    return json({ error: 'upstream_error' }, status)
  }

  const text =
    upstreamJson &&
    typeof upstreamJson === 'object' &&
    typeof (upstreamJson as { text?: unknown }).text === 'string'
      ? String((upstreamJson as { text: string }).text).replace(/\s+/g, ' ').trim()
      : ''
  if (!text) return json({ error: 'empty' }, 422)
  return json({ transcript: text })
}

export default async function handler(request: Request): Promise<Response> {
  return handleVoiceTranscribe(request, envFromProcess())
}
