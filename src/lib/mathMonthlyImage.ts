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
