import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ADMISSION_STRATEGY_MAX_PAGES } from '../../types/admissionStrategyMaterial.ts'

GlobalWorkerOptions.workerSrc = pdfWorker

export type RenderedMaterialPage = {
  pageNumber: number
  blob: Blob
  width: number
  height: number
  extension: 'webp' | 'jpeg'
  contentType: string
}

export type PdfRenderProgress = {
  current: number
  total: number
}

const TARGET_WIDTH = 1400

function preferredImageType(): { contentType: string; extension: 'webp' | 'jpeg' } {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const dataUrl = canvas.toDataURL('image/webp', 0.8)
    if (dataUrl.startsWith('data:image/webp')) {
      return { contentType: 'image/webp', extension: 'webp' }
    }
  } catch {
    // Safari 구버전 등
  }
  return { contentType: 'image/jpeg', extension: 'jpeg' }
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('페이지 이미지를 만들지 못했습니다.'))
          return
        }
        resolve(blob)
      },
      contentType,
      quality,
    )
  })
}

async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  imageType: { contentType: string; extension: 'webp' | 'jpeg' },
): Promise<RenderedMaterialPage> {
  const page = await pdf.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = base.width > 0 ? TARGET_WIDTH / base.width : 1.5
  const viewport = page.getViewport({ scale: Math.min(Math.max(scale, 1), 2.4) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('페이지를 그릴 수 없습니다.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
  const blob = await canvasToBlob(canvas, imageType.contentType, imageType.extension === 'webp' ? 0.82 : 0.86)
  canvas.width = 0
  canvas.height = 0
  return {
    pageNumber,
    blob,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    extension: imageType.extension,
    contentType: imageType.contentType,
  }
}

export async function renderPdfFileToPages(
  file: File,
  onProgress?: (progress: PdfRenderProgress) => void,
): Promise<RenderedMaterialPage[]> {
  const data = await file.arrayBuffer()
  const loadingTask = getDocument({ data, disableRange: true, disableStream: true })
  const pdf = await loadingTask.promise
  try {
    const total = pdf.numPages
    if (total < 1) throw new Error('PDF에 페이지가 없습니다.')
    if (total > ADMISSION_STRATEGY_MAX_PAGES) {
      throw new Error(`페이지 수가 너무 많습니다. ${ADMISSION_STRATEGY_MAX_PAGES}페이지 이하 PDF를 올려 주세요.`)
    }
    const imageType = preferredImageType()
    const pages: RenderedMaterialPage[] = []
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      onProgress?.({ current: pageNumber, total })
      pages.push(await renderPdfPage(pdf, pageNumber, imageType))
    }
    return pages
  } finally {
    await pdf.cleanup()
    await loadingTask.destroy()
  }
}
