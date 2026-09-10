import type {
  AdmissionStrategyConversionStatus,
  AdmissionStrategyMaterial,
  AdmissionStrategyMaterialPage,
  AdmissionStrategyMaterialStatus,
  AdmissionStrategyMaterialType,
  ParentAdmissionStrategyMaterial,
  ParentAdmissionStrategyMaterialPage,
} from '../../types/admissionStrategyMaterial.ts'
import {
  ADMISSION_STRATEGY_CONVERSION_STATUSES,
  ADMISSION_STRATEGY_MATERIAL_STATUSES,
  ADMISSION_STRATEGY_MATERIAL_TYPES,
} from '../../types/admissionStrategyMaterial.ts'
import type { AdmissionStrategyTrack } from '../../types/admissionStrategy.ts'
import { ADMISSION_STRATEGY_TRACKS } from '../../types/admissionStrategy.ts'

export type AdmissionStrategyMaterialRow = {
  id: string
  track: string | null
  title: string
  description: string | null
  material_type: string
  source_file_path: string | null
  original_file_name: string | null
  status: string
  conversion_status: string
  conversion_error: string | null
  display_order: number
  page_count: number | null
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AdmissionStrategyMaterialPageRow = {
  id: string
  material_id: string
  page_number: number
  asset_path: string
  width: number | null
  height: number | null
  created_at: string
}

function isStatus(value: string): value is AdmissionStrategyMaterialStatus {
  return (ADMISSION_STRATEGY_MATERIAL_STATUSES as readonly string[]).includes(value)
}

function isType(value: string): value is AdmissionStrategyMaterialType {
  return (ADMISSION_STRATEGY_MATERIAL_TYPES as readonly string[]).includes(value)
}

function isConversion(value: string): value is AdmissionStrategyConversionStatus {
  return (ADMISSION_STRATEGY_CONVERSION_STATUSES as readonly string[]).includes(value)
}

function parseMaterialTrack(value: unknown): AdmissionStrategyTrack | null {
  return typeof value === 'string' &&
    (ADMISSION_STRATEGY_TRACKS as readonly string[]).includes(value)
    ? (value as AdmissionStrategyTrack)
    : null
}

export function admissionStrategyMaterialPageFromRow(
  row: AdmissionStrategyMaterialPageRow,
): AdmissionStrategyMaterialPage {
  return {
    id: row.id,
    materialId: row.material_id,
    pageNumber: row.page_number,
    assetPath: row.asset_path,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  }
}

export function admissionStrategyMaterialFromRow(
  row: AdmissionStrategyMaterialRow,
  pages: AdmissionStrategyMaterialPageRow[] = [],
): AdmissionStrategyMaterial {
  return {
    id: row.id,
    track: parseMaterialTrack(row.track),
    title: row.title,
    description: row.description ?? '',
    materialType: isType(row.material_type) ? row.material_type : 'pdf',
    sourceFilePath: row.source_file_path,
    originalFileName: row.original_file_name ?? '',
    status: isStatus(row.status) ? row.status : 'DRAFT',
    conversionStatus: isConversion(row.conversion_status) ? row.conversion_status : 'pending',
    conversionError: row.conversion_error ?? '',
    displayOrder: row.display_order,
    pageCount: row.page_count,
    publishedAt: row.published_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pages: pages
      .filter((page) => page.material_id === row.id)
      .sort((a, b) => a.page_number - b.page_number)
      .map(admissionStrategyMaterialPageFromRow),
  }
}

export function admissionStrategyMaterialToRow(
  record: AdmissionStrategyMaterial,
): AdmissionStrategyMaterialRow {
  return {
    id: record.id,
    track: record.track,
    title: record.title,
    description: record.description || null,
    material_type: record.materialType,
    source_file_path: record.sourceFilePath,
    original_file_name: record.originalFileName || null,
    status: record.status,
    conversion_status: record.conversionStatus,
    conversion_error: record.conversionError || null,
    display_order: record.displayOrder,
    page_count: record.pageCount,
    published_at: record.publishedAt,
    created_by: record.createdBy,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function isParentVisibleMaterial(record: {
  status: AdmissionStrategyMaterialStatus
  conversionStatus: AdmissionStrategyConversionStatus
  pageCount: number | null
}): boolean {
  return (
    record.status === 'PUBLISHED' &&
    record.conversionStatus === 'ready' &&
    (record.pageCount ?? 0) > 0
  )
}

export function canPublishMaterial(record: {
  conversionStatus: AdmissionStrategyConversionStatus
  pageCount: number | null
}): boolean {
  return record.conversionStatus === 'ready' && (record.pageCount ?? 0) > 0
}

export function hasUnreadAdmissionStrategyMaterials(
  materials: { isUnread?: boolean }[],
): boolean {
  return materials.some((item) => item.isUnread === true)
}

export function hasMaterialTrack(
  record: { track?: AdmissionStrategyTrack | null },
): record is { track: AdmissionStrategyTrack } {
  return record.track === '고입' || record.track === '대입'
}

export function needsPageConversion(record: {
  materialType: AdmissionStrategyMaterialType
  sourceFilePath: string | null
  conversionStatus: AdmissionStrategyConversionStatus
  pageCount: number | null
}): boolean {
  if (record.materialType !== 'pdf' || !record.sourceFilePath) return false
  if (record.conversionStatus === 'ready' && (record.pageCount ?? 0) > 0) return false
  return (
    record.conversionStatus === 'pending' ||
    record.conversionStatus === 'converting' ||
    record.conversionStatus === 'failed'
  )
}

export function sortMaterialsByDisplayOrder<T extends { displayOrder: number; createdAt: string }>(
  materials: T[],
): T[] {
  return [...materials].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function swappedDisplayOrders<T extends { id: string; displayOrder: number }>(
  materials: T[],
  id: string,
  direction: 'up' | 'down',
): { id: string; displayOrder: number }[] | null {
  const sorted = [...materials]
  const index = sorted.findIndex((item) => item.id === id)
  if (index < 0) return null
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  const current = sorted[index]
  const other = sorted[swapIndex]
  if (!current || !other) return null
  return [
    { id: current.id, displayOrder: other.displayOrder },
    { id: other.id, displayOrder: current.displayOrder },
  ]
}

export function parseParentAdmissionStrategyMaterialPages(
  value: unknown,
): ParentAdmissionStrategyMaterialPage[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const pageNumber = Number(row.page_number ?? row.pageNumber)
    const assetPath =
      typeof row.asset_path === 'string'
        ? row.asset_path
        : typeof row.assetPath === 'string'
          ? row.assetPath
          : ''
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || !assetPath) return []
    const widthRaw = row.width
    const heightRaw = row.height
    return [
      {
        pageNumber,
        assetPath,
        width: typeof widthRaw === 'number' ? widthRaw : null,
        height: typeof heightRaw === 'number' ? heightRaw : null,
      },
    ]
  })
}

export function parseParentAdmissionStrategyMaterials(
  value: unknown,
): ParentAdmissionStrategyMaterial[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = parseParentAdmissionStrategyMaterial(item)
    return parsed ? [parsed] : []
  })
}

export function parseParentAdmissionStrategyMaterial(
  value: unknown,
): ParentAdmissionStrategyMaterial | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  const title = typeof row.title === 'string' ? row.title : ''
  const track = parseMaterialTrack(row.track)
  if (!id || !title || !track) return null
  const pages = parseParentAdmissionStrategyMaterialPages(row.pages)
  const pageCountRaw = Number(row.page_count ?? row.pageCount ?? pages.length)
  const unreadRaw = row.is_unread ?? row.isUnread
  return {
    id,
    track,
    title,
    description: typeof row.description === 'string' ? row.description : '',
    pageCount: Number.isFinite(pageCountRaw) ? pageCountRaw : pages.length,
    displayOrder: Number(row.display_order ?? row.displayOrder ?? 0) || 0,
    publishedAt:
      typeof row.published_at === 'string'
        ? row.published_at
        : typeof row.publishedAt === 'string'
          ? row.publishedAt
          : null,
    isUnread: unreadRaw === true,
    pages,
  }
}

export function nextDisplayOrder(materials: { displayOrder: number }[]): number {
  if (materials.length === 0) return 1
  return Math.max(...materials.map((item) => item.displayOrder)) + 1
}

export function materialStatusLabel(status: AdmissionStrategyMaterialStatus): string {
  if (status === 'PUBLISHED') return '게시'
  if (status === 'HIDDEN') return '숨김'
  return '초안'
}

export function conversionStatusLabel(status: AdmissionStrategyConversionStatus): string {
  if (status === 'ready') return '변환 완료'
  if (status === 'converting') return '변환 중'
  if (status === 'failed') return '변환 실패'
  if (status === 'needs_pdf') return 'PDF 필요'
  return '대기'
}
