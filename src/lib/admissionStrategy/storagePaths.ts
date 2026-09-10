import {
  ADMISSION_STRATEGY_MAX_UPLOAD_BYTES,
  ADMISSION_STRATEGY_STORAGE_BUCKET,
} from '../../types/admissionStrategyMaterial.ts'

export { ADMISSION_STRATEGY_STORAGE_BUCKET }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function padPageNumber(pageNumber: number): string {
  return String(pageNumber).padStart(3, '0')
}

export function sourceObjectPath(materialId: string, fileId: string, extension: string): string {
  return `${materialId}/source/${fileId}.${extension}`
}

export function pageObjectPath(
  materialId: string,
  fileId: string,
  pageNumber: number,
  extension: string,
): string {
  return `${materialId}/pages/${fileId}-${padPageNumber(pageNumber)}.${extension}`
}

export function materialIdFromStoragePath(path: string): string | null {
  const id = path.split('/')[0] ?? ''
  return UUID_RE.test(id) ? id : null
}

export function isPageAssetPath(path: string): boolean {
  const parts = path.split('/')
  return parts.length >= 3 && parts[1] === 'pages'
}

export function isSourceAssetPath(path: string): boolean {
  const parts = path.split('/')
  return parts.length >= 3 && parts[1] === 'source'
}

export type DetectedUploadKind = 'pdf' | 'pptx' | null

export function detectUploadKind(file: { name: string; type: string }): DetectedUploadKind {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf'
  if (
    name.endsWith('.pptx') ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx'
  }
  return null
}

export function validateUploadFile(file: File): string | null {
  if (file.size <= 0) return '빈 파일은 업로드할 수 없습니다.'
  if (file.size > ADMISSION_STRATEGY_MAX_UPLOAD_BYTES) {
    return '파일 크기는 40MB 이하여야 합니다.'
  }
  if (!detectUploadKind(file)) {
    return 'PDF 또는 PPTX 파일만 업로드할 수 있습니다.'
  }
  return null
}

export function extensionForKind(kind: DetectedUploadKind): string {
  return kind === 'pptx' ? 'pptx' : 'pdf'
}

export function contentTypeForKind(kind: DetectedUploadKind): string {
  if (kind === 'pptx') {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  return 'application/pdf'
}

export function teacherFacingError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    const message = error.message.trim()
    if (/row-level security|permission denied|not allowed/i.test(message)) {
      return '권한이 없습니다. 강사 로그인 상태를 확인해 주세요.'
    }
    if (/network|failed to fetch|timeout/i.test(message)) {
      return '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (/mime|file type|invalid/i.test(message)) {
      return '지원하지 않는 파일 형식입니다. PDF 또는 PPTX를 선택해 주세요.'
    }
    if (message.length <= 180 && !/ at |stack|TypeError/i.test(message)) {
      return message
    }
  }
  return fallback
}
