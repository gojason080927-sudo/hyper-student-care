/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFJob,
  ExportPDFParams,
  ExportPDFTargetFormat,
  ExportPDFResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
} from '@adobe/pdfservices-node-sdk'

// Vite /api on Vercel Node.js calls (req, res) with IncomingMessage.
// Mirrors api/voice-transcribe.ts and api/hub-storage.ts: convert to a Web
// Request so the shared handler can use headers.get / request.json().
export const config = { runtime: 'nodejs', maxDuration: 300 }

const BUCKET = 'pdf-to-docx'
// Adobe: "All other Operations" (Export PDF included) bill 1 Document
// Transaction per up to 50 pages. A 150–180p book costs ~3–4
// transactions, not a failure — see conversation notes.
const MAX_INPUT_BYTES = 100 * 1024 * 1024 // matches storage bucket + Adobe doc size limit

type PdfToDocxEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  pdfServicesClientId: string
  pdfServicesClientSecret: string
}

function envFromProcess(): PdfToDocxEnv {
  return {
    supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim() ?? '',
    supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
    supabaseServiceRoleKey:
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)?.trim() ?? '',
    pdfServicesClientId: process.env.PDF_SERVICES_CLIENT_ID?.trim() ?? '',
    pdfServicesClientSecret: process.env.PDF_SERVICES_CLIENT_SECRET?.trim() ?? '',
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function parseBearerToken(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  const matched = value.match(/^Bearer\s+(\S+)/i)
  return matched?.[1]?.trim() ?? ''
}

function isWebRequest(value: unknown): value is Request {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'headers' in value &&
      typeof (value as Request).headers?.get === 'function' &&
      typeof (value as Request).arrayBuffer === 'function',
  )
}

function readIncomingBearer(headers: IncomingMessage['headers'] | Headers | undefined): string {
  if (!headers) return ''
  if (typeof (headers as Headers).get === 'function') {
    return parseBearerToken((headers as Headers).get('authorization') ?? '')
  }
  const record = headers as Record<string, string | string[] | undefined>
  const raw = record.authorization ?? record.Authorization
  return parseBearerToken(Array.isArray(raw) ? raw.join(', ') : raw ?? '')
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function incomingToRequest(input: Request | IncomingMessage): Promise<Request> {
  if (isWebRequest(input)) return input
  const req = input as IncomingMessage
  const host = req.headers.host ?? 'localhost'
  const url = `https://${host}${req.url ?? '/api/pdf-to-docx'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '))
    else if (value) headers.set(key, value)
  }
  const body = await readBody(req)
  return new Request(url, {
    method: req.method ?? 'POST',
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : new Uint8Array(body),
  })
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

async function verifyTeacher(token: string, env: PdfToDocxEnv): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return false
  try {
    const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env.supabaseAnonKey },
    })
    if (!response.ok) return false
    const body = (await response.json()) as { id?: unknown }
    return typeof body.id === 'string' && body.id.length > 0
  } catch {
    return false
  }
}

function logFail(error: string, extra: Record<string, unknown> = {}) {
  console.error('pdf-to-docx', { error, ...extra })
}

function docxPathFor(storagePath: string): string {
  return /\.pdf$/i.test(storagePath) ? storagePath.replace(/\.pdf$/i, '.docx') : `${storagePath}.docx`
}

/** Reads an Adobe PDFServices content stream fully into a Buffer. */
async function streamAssetToBuffer(streamAsset: { readStream: NodeJS.ReadableStream }): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of streamAsset.readStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  return Buffer.concat(chunks)
}

export async function handlePdfToDocx(request: Request, env = envFromProcess()): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = readIncomingBearer(request.headers) || parseBearerToken(request.headers.get('authorization') ?? '')
  if (!token) {
    logFail('missing_bearer')
    return json({ error: 'unauthorized' }, 401)
  }
  if (!(await verifyTeacher(token, env))) {
    logFail('verify_failed')
    return json({ error: 'unauthorized' }, 401)
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return json({ error: 'not_configured', message: 'Supabase 환경변수가 없습니다.' }, 503)
  }
  if (!env.supabaseServiceRoleKey) {
    return json(
      { error: 'not_configured', message: 'PDF 변환용 서버 키(SUPABASE_SERVICE_ROLE_KEY)가 없습니다.' },
      503,
    )
  }
  if (!env.pdfServicesClientId || !env.pdfServicesClientSecret) {
    return json(
      {
        error: 'adobe_not_configured',
        message: 'PDF_SERVICES_CLIENT_ID / PDF_SERVICES_CLIENT_SECRET 환경변수가 없습니다.',
      },
      503,
    )
  }

  let payload: { storagePath?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const storagePath = typeof payload.storagePath === 'string' ? payload.storagePath.trim() : ''
  if (!storagePath || !storagePath.toLowerCase().endsWith('.pdf')) {
    return json({ error: 'invalid_storage_path' }, 400)
  }

  const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Download the already-uploaded PDF from storage.
  const { data: sourceBlob, error: downloadError } = await admin.storage.from(BUCKET).download(storagePath)
  if (downloadError || !sourceBlob) {
    logFail('download_failed', { storagePath, message: downloadError?.message })
    return json({ error: 'source_not_found', message: '원본 PDF를 찾을 수 없습니다.' }, 404)
  }
  const sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer())
  if (sourceBuffer.byteLength > MAX_INPUT_BYTES) {
    logFail('too_large', { bytes: sourceBuffer.byteLength })
    return json({ error: 'too_large' }, 413)
  }

  // 2) Run the Adobe PDF Services "Export PDF → DOCX" job.
  let docxBuffer: Buffer
  try {
    const credentials = new ServicePrincipalCredentials({
      clientId: env.pdfServicesClientId,
      clientSecret: env.pdfServicesClientSecret,
    })
    const pdfServices = new PDFServices({ credentials })

    const inputAsset = await pdfServices.upload({
      readStream: Readable.from(sourceBuffer),
      mimeType: MimeType.PDF,
    })
    const params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.DOCX })
    const job = new ExportPDFJob({ inputAsset, params })

    const pollingURL = await pdfServices.submit({ job })
    const response = await pdfServices.getJobResult({ pollingURL, resultType: ExportPDFResult })
    const resultAsset = response.result?.asset
    if (!resultAsset) throw new Error('adobe_no_result_asset')

    const streamAsset = await pdfServices.getContent({ asset: resultAsset })
    docxBuffer = await streamAssetToBuffer(streamAsset)
  } catch (err) {
    const isKnown = err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError
    logFail('adobe_conversion_failed', {
      storagePath,
      message: err instanceof Error ? err.message : String(err),
      known: isKnown,
    })
    return json(
      {
        error: 'adobe_conversion_failed',
        message: '변환에 실패했습니다. 잠시 후 다시 시도하거나, 스캔본(이미지) PDF인지 확인해 주세요.',
      },
      502,
    )
  }

  // 3) Upload the DOCX back into the same bucket, next to the source PDF.
  const outPath = docxPathFor(storagePath)
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(outPath, docxBuffer, {
    upsert: true,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  if (uploadError) {
    logFail('result_upload_failed', { outPath, message: uploadError.message })
    return json({ error: 'result_upload_failed' }, 502)
  }

  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(outPath, 60 * 10)
  if (signedUrlError || !signedUrlData?.signedUrl) {
    logFail('signed_url_failed', { outPath, message: signedUrlError?.message })
    return json({ error: 'signed_url_failed' }, 502)
  }

  return json({ docxPath: outPath, signedUrl: signedUrlData.signedUrl })
}

export default async function handler(
  req: Request | IncomingMessage,
  res?: ServerResponse,
): Promise<Response | void> {
  const request = await incomingToRequest(req)
  const response = await handlePdfToDocx(request, envFromProcess())
  if (res && typeof res.writeHead === 'function') {
    await writeNodeResponse(response, res)
    return
  }
  return response
}
