import { createId } from '../../utils/id'
import type { AdmissionStrategyMaterial } from '../../types/admissionStrategyMaterial'
import {
  replaceAdmissionStrategyMaterialPages,
  upsertAdmissionStrategyMaterial,
} from '../db/admissionStrategyMaterial'
import {
  listMaterialStoragePaths,
  removeStoragePaths,
  uploadRenderedPages,
  uploadSourceFile,
} from './materialStorage'
import { detectUploadKind, validateUploadFile } from './storagePaths'

export type MaterialUploadProgress = {
  message: string
  current?: number
  total?: number
}

export async function processAdmissionStrategyUpload(params: {
  material: AdmissionStrategyMaterial
  file: File
  onProgress?: (progress: MaterialUploadProgress) => void
}): Promise<AdmissionStrategyMaterial> {
  const { material, file, onProgress } = params
  const fileError = validateUploadFile(file)
  if (fileError) throw new Error(fileError)
  const kind = detectUploadKind(file)
  if (!kind) throw new Error('PDF 또는 PPTX 파일만 업로드할 수 있습니다.')

  const fileId = createId()
  let next: AdmissionStrategyMaterial = {
    ...material,
    materialType: kind,
    originalFileName: file.name,
    conversionStatus: kind === 'pdf' ? 'converting' : 'needs_pdf',
    conversionError: '',
  }

  onProgress?.({ message: '원본 파일을 올리는 중...' })
  try {
    const previousPaths = await listMaterialStoragePaths(material.id)
    await upsertAdmissionStrategyMaterial(next)
    const sourceFilePath = await uploadSourceFile({
      materialId: material.id,
      fileId,
      file,
      kind,
    })
    next = { ...next, sourceFilePath }

    if (kind === 'pptx') {
      await replaceAdmissionStrategyMaterialPages(material.id, [])
      next = {
        ...next,
        conversionStatus: 'needs_pdf',
        conversionError: 'PPTX는 원본만 보관됩니다. 학부모 열람을 위해 PDF를 업로드해 주세요.',
        pageCount: 0,
        pages: [],
        status: next.status === 'PUBLISHED' ? 'DRAFT' : next.status,
      }
      await upsertAdmissionStrategyMaterial(next)
      const keep = new Set([sourceFilePath])
      await removeStoragePaths(previousPaths.filter((path) => !keep.has(path)))
      return next
    }

    onProgress?.({ message: 'PDF 페이지를 변환하는 중...' })
    const { renderPdfFileToPages } = await import('./pdfToPageImages')
    const rendered = await renderPdfFileToPages(file, (progress) => {
      onProgress?.({
        message: `PDF 변환 중 (${progress.current} / ${progress.total})`,
        current: progress.current,
        total: progress.total,
      })
    })
    onProgress?.({ message: '페이지 이미지를 올리는 중...' })
    const uploaded = await uploadRenderedPages({
      materialId: material.id,
      fileId,
      pages: rendered,
    })
    await replaceAdmissionStrategyMaterialPages(
      material.id,
      uploaded.map((page) => ({
        pageNumber: page.pageNumber,
        assetPath: page.assetPath,
        width: page.width,
        height: page.height,
      })),
    )
    next = {
      ...next,
      conversionStatus: 'ready',
      conversionError: '',
      pageCount: uploaded.length,
      pages: uploaded.map((page) => ({
        id: createId(),
        materialId: material.id,
        pageNumber: page.pageNumber,
        assetPath: page.assetPath,
        width: page.width,
        height: page.height,
        createdAt: new Date().toISOString(),
      })),
    }
    await upsertAdmissionStrategyMaterial(next)
    const keep = new Set([sourceFilePath, ...uploaded.map((page) => page.assetPath)])
    await removeStoragePaths(previousPaths.filter((path) => !keep.has(path)))
    return next
  } catch (error) {
    const failed: AdmissionStrategyMaterial = {
      ...next,
      conversionStatus: 'failed',
      conversionError:
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : '파일 변환에 실패했습니다. PDF를 다시 업로드해 주세요.',
    }
    try {
      await upsertAdmissionStrategyMaterial(failed)
    } catch {
      // 변환 실패 상태를 남기지 못해도 원 오류를 우선한다.
    }
    throw error
  }
}
