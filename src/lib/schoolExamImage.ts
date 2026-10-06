/** 문항 캡처 압축 — 폭 800px 이하, JPEG 품질 70 → base64 (data: 접두어 없음) */
export const CAPTURE_MAX_WIDTH = 800
export const CAPTURE_JPEG_QUALITY = 0.7

export type CompressedCapture = { data: string; width: number; height: number }

export async function compressCapture(file: Blob): Promise<CompressedCapture> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, CAPTURE_MAX_WIDTH / bitmap.width)
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
  const url = canvas.toDataURL('image/jpeg', CAPTURE_JPEG_QUALITY)
  return { data: url.slice(url.indexOf(',') + 1), width, height }
}
