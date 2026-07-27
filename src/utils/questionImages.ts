import type { QuestionImageAttachment } from '../types/records'
import { createId } from './id'

export const QUESTION_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const QUESTION_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const
export const QUESTION_IMAGE_MAX_COUNT = 5
export const QUESTION_IMAGE_MAX_SIZE = 5 * 1024 * 1024
export const QUESTION_IMAGE_MAX_DIMENSION = 1600
export const QUESTION_IMAGE_JPEG_QUALITY = 0.8
export const QUESTION_IMAGE_LIST_THUMBNAIL_LIMIT = 3

export function formatImageFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function normalizeQuestionImage(raw: Record<string, unknown>): QuestionImageAttachment | null {
  if (!raw.id || !raw.dataUrl || typeof raw.dataUrl !== 'string') return null
  if (!String(raw.dataUrl).startsWith('data:image/')) return null
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    type: String(raw.type ?? 'image/jpeg'),
    size: Number(raw.size ?? 0),
    dataUrl: String(raw.dataUrl),
    uploadedAt: String(raw.uploadedAt ?? new Date().toISOString()),
  }
}

export function normalizeQuestionImages(raw: unknown): QuestionImageAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normalizeQuestionImage(item as Record<string, unknown>))
    .filter((item): item is QuestionImageAttachment => item !== null)
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('READ_FAILED'))
    }
    reader.onerror = () => reject(new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('LOAD_FAILED'))
    }
    img.src = url
  })
}

function scaleDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function estimateDataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.round((base64.length * 3) / 4)
}

async function compressImageFile(
  file: File,
): Promise<{ dataUrl: string; type: string; size: number }> {
  if (file.type === 'image/gif') {
    const dataUrl = await readFileAsDataURL(file)
    const size = estimateDataUrlSize(dataUrl)
    if (size > QUESTION_IMAGE_MAX_SIZE) {
      throw new Error('TOO_LARGE')
    }
    return { dataUrl, type: file.type, size }
  }

  const img = await loadImageFromFile(file)
  const { width, height } = scaleDimensions(
    img.width,
    img.height,
    QUESTION_IMAGE_MAX_DIMENSION,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS_FAILED')

  ctx.drawImage(img, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', QUESTION_IMAGE_JPEG_QUALITY)
  const size = estimateDataUrlSize(dataUrl)

  if (size > QUESTION_IMAGE_MAX_SIZE) {
    throw new Error('TOO_LARGE')
  }

  return { dataUrl, type: 'image/jpeg', size }
}

function validateImageFile(file: File): string | null {
  if (!QUESTION_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof QUESTION_IMAGE_ALLOWED_TYPES)[number])) {
    return '이미지 파일만 첨부할 수 있습니다.'
  }
  if (file.size > QUESTION_IMAGE_MAX_SIZE) {
    return '사진 한 장은 5MB 이하만 가능합니다.'
  }
  return null
}

export async function processQuestionImageFiles(
  files: FileList | File[],
  existingCount: number,
): Promise<{ attachments: QuestionImageAttachment[]; errors: string[] }> {
  const fileArray = Array.from(files)
  const errors: string[] = []
  const attachments: QuestionImageAttachment[] = []

  if (existingCount + fileArray.length > QUESTION_IMAGE_MAX_COUNT) {
    return {
      attachments: [],
      errors: ['사진은 최대 5장까지 첨부할 수 있습니다.'],
    }
  }

  for (const file of fileArray) {
    const validationError = validateImageFile(file)
    if (validationError) {
      errors.push(validationError)
      continue
    }

    try {
      const processed = await compressImageFile(file)
      attachments.push({
        id: createId(),
        name: file.name,
        type: processed.type,
        size: processed.size,
        dataUrl: processed.dataUrl,
        uploadedAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'TOO_LARGE') {
        errors.push('이미지 용량이 너무 큽니다. 더 작은 사진을 선택해 주세요.')
      } else {
        errors.push('사진을 불러오는 중 오류가 발생했습니다.')
      }
    }
  }

  return { attachments, errors }
}

export function removeQuestionImage(
  images: QuestionImageAttachment[],
  id: string,
): QuestionImageAttachment[] {
  return images.filter((image) => image.id !== id)
}
