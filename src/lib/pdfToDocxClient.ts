import { getSupabase } from './supabase'

const BUCKET = 'pdf-to-docx'
const API_PATH = '/api/pdf-to-docx'
export const MAX_PDF_BYTES = 100 * 1024 * 1024 // 100MB — matches the storage bucket + Adobe limit

export type PdfToDocxResult = {
  ok: true
  docxPath: string
  signedUrl: string
  fileName: string
}

export type PdfToDocxFailure = {
  ok: false
  message: string
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, '')
  const safe = base.replace(/[^\w가-힣.\- ]+/g, '_').trim() || 'document'
  return `${safe}.pdf`
}

async function getAccessToken(): Promise<string | null> {
  const auth = getSupabase().auth
  const { data } = await auth.getSession()
  if (data.session?.access_token) return data.session.access_token
  try {
    const { data: refreshed } = await auth.refreshSession()
    return refreshed.session?.access_token ?? null
  } catch {
    return null
  }
}

/**
 * Uploads a PDF to the pdf-to-docx storage bucket, asks the server to
 * convert it via Adobe PDF Services, and returns a signed download URL
 * for the resulting DOCX (valid ~10 minutes).
 */
export async function convertPdfToDocx(
  file: File,
  onStage?: (stage: 'uploading' | 'converting') => void,
): Promise<PdfToDocxResult | PdfToDocxFailure> {
  if (!file || file.type !== 'application/pdf') {
    return { ok: false, message: 'PDF 파일만 업로드할 수 있습니다.' }
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, message: '파일이 너무 큽니다 (최대 100MB).' }
  }

  const token = await getAccessToken()
  if (!token) return { ok: false, message: '로그인이 필요합니다.' }

  const storagePath = `${crypto.randomUUID()}/${sanitizeFileName(file.name)}`

  onStage?.('uploading')
  const { error: uploadError } = await getSupabase()
    .storage.from(BUCKET)
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: false })
  if (uploadError) {
    return { ok: false, message: uploadError.message || '업로드에 실패했습니다.' }
  }

  onStage?.('converting')
  let response: Response
  try {
    response = await fetch(API_PATH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storagePath }),
    })
  } catch {
    return { ok: false, message: '서버에 연결하지 못했습니다.' }
  }

  let body: { docxPath?: string; signedUrl?: string; message?: string } = {}
  try {
    body = await response.json()
  } catch {
    // fall through to status-based error below
  }

  if (!response.ok || !body.signedUrl || !body.docxPath) {
    return { ok: false, message: body.message || '변환에 실패했습니다.' }
  }

  return {
    ok: true,
    docxPath: body.docxPath,
    signedUrl: body.signedUrl,
    fileName: sanitizeFileName(file.name).replace(/\.pdf$/i, '.docx'),
  }
}
