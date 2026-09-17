import {
  HUB_LEARNING_MATERIALS_BUCKET,
  HUB_QUESTION_ATTACHMENTS_BUCKET,
} from './types'

type SignResponse = {
  signedUrl: string
  token?: string
  path: string
}

async function hubStorageRequest(body: Record<string, unknown>): Promise<SignResponse> {
  const res = await fetch('/api/hub-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    message?: string
    signedUrl?: string
    token?: string
    path?: string
  }
  if (!res.ok || !payload.signedUrl) {
    throw new Error(payload.message || payload.error || '저장소 서명을 만들지 못했습니다.')
  }
  return {
    signedUrl: payload.signedUrl,
    token: payload.token,
    path: payload.path || String(body.path ?? ''),
  }
}

export async function uploadHubObject(params: {
  accessKey: string
  bucket: string
  path: string
  file: Blob
  contentType: string
}): Promise<void> {
  const signed = await hubStorageRequest({
    action: 'upload',
    accessKey: params.accessKey,
    bucket: params.bucket,
    path: params.path,
  })
  const put = await fetch(signed.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': params.contentType,
      ...(signed.token ? { 'x-upsert': 'true' } : {}),
    },
    body: params.file,
  })
  if (!put.ok) {
    throw new Error('파일 업로드에 실패했습니다.')
  }
}

export async function downloadHubObjectUrl(params: {
  accessKey: string
  bucket: string
  path: string
}): Promise<string> {
  const signed = await hubStorageRequest({
    action: 'download',
    accessKey: params.accessKey,
    bucket: params.bucket,
    path: params.path,
  })
  return signed.signedUrl
}

export async function downloadHubObjectBlob(params: {
  accessKey: string
  bucket: string
  path: string
}): Promise<Blob> {
  const res = await fetch('/api/hub-storage', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'file',
      accessKey: params.accessKey,
      bucket: params.bucket,
      path: params.path,
    }),
  })
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
    throw new Error(payload.message || payload.error || '파일을 불러오지 못했습니다.')
  }
  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    throw new Error('미리보기 파일을 불러오지 못했습니다.')
  }
  return res.blob()
}

export function questionAttachmentBucket(): string {
  return HUB_QUESTION_ATTACHMENTS_BUCKET
}

export function learningMaterialBucket(): string {
  return HUB_LEARNING_MATERIALS_BUCKET
}

export function readVideoDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      URL.revokeObjectURL(url)
      resolve(Math.round(duration * 1000))
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('영상을 읽지 못했습니다.'))
    }
    video.src = url
  })
}

export function extensionFromName(name: string, fallback = 'bin'): string {
  const base = name.split('?')[0] ?? name
  const ext = base.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : fallback
}
