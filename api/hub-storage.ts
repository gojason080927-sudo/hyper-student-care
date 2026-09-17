/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' }

type HubStorageEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
}

function envFromProcess(): HubStorageEnv {
  return {
    supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim() ?? '',
    supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
    supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)?.trim() ?? '',
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function incomingToWebRequest(req: IncomingMessage, body: Buffer): Request {
  const host = req.headers.host ?? 'localhost'
  const url = `https://${host}${req.url ?? '/api/hub-storage'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '))
    else if (value) headers.set(key, value)
  }
  return new Request(url, {
    method: req.method ?? 'POST',
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : new Uint8Array(body),
  })
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function handleHubStorage(request: Request, env = envFromProcess()): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return json({ error: 'not_configured', message: 'Supabase 환경변수가 없습니다.' }, 503)
  }
  if (!env.supabaseServiceRoleKey) {
    return json(
      {
        error: 'hub_upload_not_configured',
        message: '학생 파일 업로드용 서버 키가 아직 없습니다. SQL 적용 후 시크릿을 추가해 주세요.',
      },
      503,
    )
  }

  let payload: {
    action?: string
    accessKey?: string
    bucket?: string
    path?: string
  }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const action =
    payload.action === 'upload'
      ? 'upload'
      : payload.action === 'download'
        ? 'download'
        : payload.action === 'file'
          ? 'file'
          : ''
  const accessKey = payload.accessKey?.trim() ?? ''
  const bucket = payload.bucket?.trim() ?? ''
  const path = payload.path?.trim() ?? ''
  if (!action || !accessKey || !bucket || !path) {
    return json({ error: 'invalid_request' }, 400)
  }
  if (bucket !== 'hub-question-attachments' && bucket !== 'hub-learning-materials') {
    return json({ error: 'invalid_bucket' }, 400)
  }
  if (path.includes('..') || path.startsWith('/')) {
    return json({ error: 'invalid_path' }, 400)
  }

  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: allowed, error: authError } = await anon.rpc('authorize_hub_storage_path', {
    p_access_key: accessKey,
    p_bucket: bucket,
    p_path: path,
    p_mode: action === 'upload' ? 'upload' : 'download',
  })
  if (authError || allowed !== true) {
    return json({ error: 'forbidden', message: '이 파일에 접근할 수 없습니다.' }, 403)
  }

  const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (action === 'upload') {
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data?.signedUrl) {
      return json({ error: 'sign_failed', message: error?.message || '업로드 URL을 만들지 못했습니다.' }, 500)
    }
    return json({ signedUrl: data.signedUrl, token: data.token, path })
  }

  if (action === 'file') {
    const { data, error } = await admin.storage.from(bucket).download(path)
    if (error || !data) {
      return json({ error: 'download_failed', message: error?.message || '파일을 불러오지 못했습니다.' }, 500)
    }
    const contentType = data.type || contentTypeFromPath(path)
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="${(path.split('/').pop() || 'file').replace(/["\r\n]/g, '')}"`,
      },
    })
  }

  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 30)
  if (error || !data?.signedUrl) {
    return json({ error: 'sign_failed', message: error?.message || '다운로드 URL을 만들지 못했습니다.' }, 500)
  }
  return json({ signedUrl: data.signedUrl, path })
}

function contentTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'application/octet-stream'
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req)
  const response = await handleHubStorage(incomingToWebRequest(req, body))
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}
