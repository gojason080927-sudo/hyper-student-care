/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'

// Vite /api on Vercel Node.js calls (req, res) with IncomingMessage.
// Production (PR #40) crashed: request.headers.get is not a function.
// Production (PR #41 Edge) accepted POSTs but rejected teacher JWTs as
// unauthorized because Edge did not expose VITE_SUPABASE_* to verifyUser.
// Node runtime reads process.env at invocation; this adapter converts
// IncomingMessage → Web Request so the shared handler can use headers.get.
export const config = { runtime: 'nodejs' }

const MAX_AUDIO_BYTES = 3_500_000
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

export function envFromProcess(
  env?: Record<string, string | undefined>,
): TranscribeEnv {
  if (env) {
    return {
      openaiApiKey: env.OPENAI_API_KEY?.trim() ?? '',
      openaiModel: env.OPENAI_TRANSCRIBE_MODEL?.trim() || 'gpt-4o-transcribe',
      supabaseUrl: (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim() ?? '',
      supabaseAnonKey: (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
    }
  }
  return {
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
    openaiModel: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || 'gpt-4o-transcribe',
    supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim() ?? '',
    supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function recorderContainerMime(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? ''
}

/** Match OpenAI transcription file types: mp3, mp4, mpeg, mpga, m4a, wav, webm. */
export function normalizeTranscriptionAudioMeta(mimeType: string): {
  mimeType: string
  filename: string
} {
  const base = recorderContainerMime(mimeType)
  if (
    base === 'audio/mp4' ||
    base === 'audio/m4a' ||
    base === 'audio/x-m4a' ||
    base === 'audio/aac' ||
    base === 'video/mp4'
  ) {
    return { mimeType: 'audio/mp4', filename: 'voice.m4a' }
  }
  if (base === 'audio/mpeg' || base === 'audio/mp3') {
    return { mimeType: 'audio/mpeg', filename: 'voice.mp3' }
  }
  if (base === 'audio/wav' || base === 'audio/wave' || base === 'audio/x-wav') {
    return { mimeType: 'audio/wav', filename: 'voice.wav' }
  }
  if (base.includes('webm')) {
    return { mimeType: 'audio/webm', filename: 'voice.webm' }
  }
  return { mimeType: base || 'application/octet-stream', filename: 'voice.bin' }
}

function filenameForMimeType(mimeType: string): string {
  return normalizeTranscriptionAudioMeta(mimeType).filename
}

function decodeBase64Audio(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function parseBearerToken(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const matched = value.match(/^Bearer\s+(\S+)/i)
  return matched?.[1]?.trim() ?? ''
}

export function readBearerToken(request: Request): string {
  return parseBearerToken(request.headers.get('authorization') ?? request.headers.get('Authorization') ?? '')
}

export function readIncomingBearer(
  headers: IncomingMessage['headers'] | Headers | undefined,
): string {
  if (!headers) return ''
  if (typeof (headers as Headers).get === 'function') {
    return parseBearerToken((headers as Headers).get('authorization') ?? '')
  }
  const record = headers as Record<string, string | string[] | undefined>
  return parseBearerToken(headerValue(record.authorization) ?? headerValue(record.Authorization) ?? '')
}

const SKIP_INCOMING_HEADERS = new Set(['host', 'connection', 'content-length'])

export function copyIncomingHeaders(
  headers: IncomingMessage['headers'] | Headers | undefined,
): Headers {
  const out = new Headers()
  if (!headers) return out
  if (typeof (headers as Headers).forEach === 'function' && typeof (headers as Headers).get === 'function') {
    ;(headers as Headers).forEach((value, key) => {
      if (!SKIP_INCOMING_HEADERS.has(key.toLowerCase())) out.append(key, value)
    })
    return out
  }
  for (const [key, value] of Object.entries(headers as Record<string, string | string[] | undefined>)) {
    if (value === undefined) continue
    if (SKIP_INCOMING_HEADERS.has(key.toLowerCase())) continue
    out.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  return out
}

export function isWebRequest(value: unknown): value is Request {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'headers' in value &&
      typeof (value as Request).headers?.get === 'function' &&
      typeof (value as Request).arrayBuffer === 'function',
  )
}

function incomingHeader(
  headers: IncomingMessage['headers'] | Headers | undefined,
  name: string,
): string {
  if (!headers) return ''
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? ''
  }
  const record = headers as Record<string, string | string[] | undefined>
  return headerValue(record[name]) ?? headerValue(record[name.toLowerCase()]) ?? ''
}

function headerValue(value: string | string[] | undefined): string | null {
  if (value === undefined) return null
  return Array.isArray(value) ? value.join(', ') : value
}

export async function incomingToRequest(input: Request | IncomingMessage): Promise<Request> {
  if (isWebRequest(input)) return input
  const nodeReq = input as IncomingMessage & { body?: unknown }
  const proto = incomingHeader(nodeReq.headers, 'x-forwarded-proto') || 'https'
  const host = incomingHeader(nodeReq.headers, 'host') || 'localhost'
  const url = `${proto}://${host}${nodeReq.url || '/api/voice-transcribe'}`
  const headers = copyIncomingHeaders(nodeReq.headers)
  const method = (nodeReq.method || 'GET').toUpperCase()
  let body: BodyInit | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (typeof nodeReq.body === 'string' && nodeReq.body.length > 0) {
      body = nodeReq.body
    } else if (nodeReq.body && typeof nodeReq.body === 'object' && !ArrayBuffer.isView(nodeReq.body)) {
      body = JSON.stringify(nodeReq.body)
      if (!headers.has('content-type')) headers.set('content-type', 'application/json')
    } else {
      const chunks: Uint8Array[] = []
      for await (const chunk of nodeReq as AsyncIterable<Uint8Array | string>) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk))
      }
      const total = chunks.reduce((sum, part) => sum + part.byteLength, 0)
      if (total > 0) {
        const bytes = new Uint8Array(total)
        let offset = 0
        for (const part of chunks) {
          bytes.set(part, offset)
          offset += part.byteLength
        }
        body = bytes
      }
    }
  }
  return new Request(url, { method, headers, body })
}

async function writeNodeResponse(response: Response, res: ServerResponse) {
  const bytes = new Uint8Array(await response.arrayBuffer())
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  res.writeHead(response.status, headers)
  res.end(bytes)
}

async function defaultVerifyUser(
  token: string,
  env: TranscribeEnv,
  fetchImpl: typeof fetch,
): Promise<'ok' | 'unconfigured' | 'verify_failed'> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return 'unconfigured'
  try {
    const response = await fetchImpl(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.supabaseAnonKey,
      },
    })
    if (!response.ok) return 'verify_failed'
    const body = (await response.json()) as { id?: unknown }
    return typeof body.id === 'string' && body.id.length > 0 ? 'ok' : 'verify_failed'
  } catch {
    return 'verify_failed'
  }
}

function logFail(error: string, extra: Record<string, unknown> = {}) {
  console.error('voice-transcribe', { error, ...extra })
}

export async function handleVoiceTranscribe(
  request: Request,
  env: TranscribeEnv,
  incomingBearer = '',
): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = parseBearerToken(incomingBearer) || incomingBearer.trim() || readBearerToken(request)
  if (!token) {
    logFail('missing_bearer')
    return json({ error: 'unauthorized' }, 401)
  }

  const fetchImpl = env.fetchImpl ?? fetch
  if (env.verifyUser) {
    const allowed = await env.verifyUser(token)
    if (!allowed) {
      logFail('verify_failed')
      return json({ error: 'unauthorized' }, 401)
    }
  } else {
    const verified = await defaultVerifyUser(token, env, fetchImpl)
    if (verified !== 'ok') {
      logFail(verified)
      return json({ error: 'unauthorized' }, 401)
    }
  }

  if (!env.openaiApiKey) {
    logFail('stt_unavailable')
    return json({ error: 'stt_unavailable' }, 503)
  }

  let payload: {
    mimeType?: unknown
    filename?: unknown
    audioBase64?: unknown
  }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    logFail('malformed')
    return json({ error: 'malformed' }, 400)
  }

  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : ''
  const audioBase64 = typeof payload.audioBase64 === 'string' ? payload.audioBase64 : ''
  if (!audioBase64) {
    logFail('empty')
    return json({ error: 'empty' }, 422)
  }

  let bytes: Uint8Array
  try {
    bytes = decodeBase64Audio(audioBase64)
  } catch {
    logFail('malformed')
    return json({ error: 'malformed' }, 400)
  }
  if (!bytes.byteLength) {
    logFail('empty')
    return json({ error: 'empty' }, 422)
  }
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    logFail('too_large', { bytes: bytes.byteLength })
    return json({ error: 'too_large' }, 413)
  }

  const requestedName =
    typeof payload.filename === 'string' && payload.filename.trim()
      ? payload.filename.trim()
      : filenameForMimeType(mimeType)
  const normalized = normalizeTranscriptionAudioMeta(mimeType || requestedName)
  const filename = /\.(m4a|mp4|mp3|mpeg|mpga|wav|webm)$/i.test(requestedName)
    ? requestedName
    : normalized.filename
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength))
  copy.set(bytes)
  const audioBlob =
    typeof File === 'function'
      ? new File([copy], filename, { type: normalized.mimeType })
      : new Blob([copy], { type: normalized.mimeType })

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
      logFail('upstream_fallback', {
        status: upstream.status,
        mimeType: normalized.mimeType,
        filename,
        bytes: bytes.byteLength,
      })
      upstream = await postTranscription('whisper-1')
    }
  } catch {
    logFail('upstream_timeout', {
      mimeType: normalized.mimeType,
      filename,
      bytes: bytes.byteLength,
    })
    return json({ error: 'upstream_timeout' }, 504)
  }

  let upstreamJson: unknown = null
  try {
    upstreamJson = await upstream.json()
  } catch {
    logFail('malformed_upstream', {
      status: upstream.status,
      mimeType: normalized.mimeType,
      filename,
      bytes: bytes.byteLength,
    })
    return json({ error: 'malformed_upstream' }, 502)
  }

  if (!upstream.ok) {
    const status = upstream.status >= 500 ? 502 : upstream.status === 401 ? 503 : 502
    logFail('upstream_error', {
      status: upstream.status,
      mimeType: normalized.mimeType,
      filename,
      bytes: bytes.byteLength,
    })
    return json({ error: 'upstream_error' }, status)
  }

  const text =
    upstreamJson &&
    typeof upstreamJson === 'object' &&
    typeof (upstreamJson as { text?: unknown }).text === 'string'
      ? String((upstreamJson as { text: string }).text).replace(/\s+/g, ' ').trim()
      : ''
  if (!text) {
    logFail('empty_transcript', {
      mimeType: normalized.mimeType,
      filename,
      bytes: bytes.byteLength,
    })
    return json({ error: 'empty' }, 422)
  }
  return json({ transcript: text })
}

export default async function handler(
  req: Request | IncomingMessage,
  res?: ServerResponse,
): Promise<Response | void> {
  const incomingBearer = isWebRequest(req) ? readBearerToken(req) : readIncomingBearer(req.headers)
  const request = await incomingToRequest(req)
  const response = await handleVoiceTranscribe(request, envFromProcess(), incomingBearer)
  if (res && typeof res.writeHead === 'function') {
    await writeNodeResponse(response, res)
    return
  }
  return response
}
