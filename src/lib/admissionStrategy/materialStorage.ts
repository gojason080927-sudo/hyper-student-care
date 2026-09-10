import { getSupabase } from '../supabase'
import {
  ADMISSION_STRATEGY_STORAGE_BUCKET,
  type AdmissionStrategyMaterialPage,
} from '../../types/admissionStrategyMaterial'
import type { RenderedMaterialPage } from './pdfToPageImages'
import {
  contentTypeForKind,
  extensionForKind,
  pageObjectPath,
  sourceObjectPath,
  type DetectedUploadKind,
} from './storagePaths'

function isMissingStoragePrefixError(message: string): boolean {
  return /not found|not exist|invalidkey|no such file|the resource was not found/i.test(message)
}

async function listFolder(prefix: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET)
    .list(prefix, { limit: 1000 })
  if (error) {
    if (isMissingStoragePrefixError(error.message || '')) return []
    throw new Error(error.message || '저장된 파일을 확인하지 못했습니다.')
  }
  return (data ?? [])
    .map((entry) => entry.name)
    .filter((name) => Boolean(name) && name !== '.emptyFolderPlaceholder')
}

export async function listMaterialStoragePaths(materialId: string): Promise<string[]> {
  const root = await listFolder(materialId)
  const nestedPrefixes = root.filter((name) => !name.includes('.'))
  const files: string[] = root
    .filter((name) => name.includes('.'))
    .map((name) => `${materialId}/${name}`)

  for (const folder of nestedPrefixes) {
    const prefix = `${materialId}/${folder}`
    const names = await listFolder(prefix)
    for (const name of names) files.push(`${prefix}/${name}`)
  }
  return files
}

export async function removeStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await getSupabase()
    .storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET)
    .remove(paths)
  if (error) throw new Error(error.message || '자료 파일을 삭제하지 못했습니다.')
}

export async function deleteMaterialStorage(materialId: string): Promise<void> {
  const paths = await listMaterialStoragePaths(materialId)
  await removeStoragePaths(paths)
}

export async function uploadSourceFile(params: {
  materialId: string
  fileId: string
  file: File
  kind: DetectedUploadKind
}): Promise<string> {
  const path = sourceObjectPath(params.materialId, params.fileId, extensionForKind(params.kind))
  const { error } = await getSupabase()
    .storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET)
    .upload(path, params.file, {
      upsert: true,
      contentType: params.file.type || contentTypeForKind(params.kind),
    })
  if (error) throw new Error(error.message || '원본 파일 업로드에 실패했습니다.')
  return path
}

export async function uploadRenderedPages(params: {
  materialId: string
  fileId: string
  pages: RenderedMaterialPage[]
}): Promise<Omit<AdmissionStrategyMaterialPage, 'id' | 'createdAt'>[]> {
  const uploaded: Omit<AdmissionStrategyMaterialPage, 'id' | 'createdAt'>[] = []
  for (const page of params.pages) {
    const path = pageObjectPath(params.materialId, params.fileId, page.pageNumber, page.extension)
    const { error } = await getSupabase()
      .storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET)
      .upload(path, page.blob, {
        upsert: true,
        contentType: page.contentType,
      })
    if (error) throw new Error(error.message || `${page.pageNumber}페이지 업로드에 실패했습니다.`)
    uploaded.push({
      materialId: params.materialId,
      pageNumber: page.pageNumber,
      assetPath: path,
      width: page.width,
      height: page.height,
    })
  }
  return uploaded
}

export async function downloadSourceFile(path: string): Promise<File> {
  const { data, error } = await getSupabase().storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET).download(path)
  if (error || !data) {
    throw new Error(error?.message || '원본 PDF를 불러오지 못했습니다.')
  }
  const fileName = path.split('/').pop() || 'source.pdf'
  return new File([data], fileName, { type: data.type || 'application/pdf' })
}

export function createMaterialPageSignedUrl(assetPath: string, expiresIn = 60 * 30): Promise<string> {
  return getSupabase()
    .storage.from(ADMISSION_STRATEGY_STORAGE_BUCKET)
    .createSignedUrl(assetPath, expiresIn)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        throw new Error('자료 페이지를 불러오지 못했습니다.')
      }
      return data.signedUrl
    })
}
