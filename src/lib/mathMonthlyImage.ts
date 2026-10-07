/** 틀린 문제 사진 압축 — 긴 변 900px 이하, JPEG 품질 0.78 → base64 (data: 접두어 없음) */
export const MATH_IMAGE_MAX_SIDE = 900
export const MATH_IMAGE_JPEG_QUALITY = 0.78
export const MATH_IMAGE_MAX_PER_STUDENT = 30

export type CompressedMathImage = { data: string; width: number; height: number }

export async function compressMathImage(file: Blob): Promise<CompressedMathImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MATH_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지를 처리할 수 없는 브라우저입니다.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const url = canvas.toDataURL('image/jpeg', MATH_IMAGE_JPEG_QUALITY)
  return { data: url.slice(url.indexOf(',') + 1), width, height }
}

/** 시험지 한 쪽 전체를 보관·AI 전송용으로 줄인다 — 긴 변 1800px 이하, JPEG 0.8 */
export async function downscaleForLocate(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지를 처리할 수 없는 브라우저입니다.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const url = canvas.toDataURL('image/jpeg', 0.8)
  return url.slice(url.indexOf(',') + 1)
}

/** 원본 사진에서 0~1 비율 영역을 잘라(가장자리 여유 포함) 압축한다 */
export async function cropMathImage(file: Blob, box: { x: number; y: number; w: number; h: number }): Promise<CompressedMathImage> {
  const bitmap = await createImageBitmap(file)
  const pad = 0.012
  const x0 = Math.max(0, box.x - pad)
  const y0 = Math.max(0, box.y - pad)
  const x1 = Math.min(1, box.x + box.w + pad)
  const y1 = Math.min(1, box.y + box.h + pad)
  const sx = Math.round(x0 * bitmap.width)
  const sy = Math.round(y0 * bitmap.height)
  const sw = Math.max(1, Math.round((x1 - x0) * bitmap.width))
  const sh = Math.max(1, Math.round((y1 - y0) * bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지를 처리할 수 없는 브라우저입니다.')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 자르지 못했습니다.'))), 'image/jpeg', 0.9),
  )
  return compressMathImage(blob)
}

export function base64ToBlob(b64: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}
