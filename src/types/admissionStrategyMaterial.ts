export const ADMISSION_STRATEGY_MATERIAL_STATUSES = ['DRAFT', 'PUBLISHED', 'HIDDEN'] as const
export const ADMISSION_STRATEGY_MATERIAL_TYPES = ['pdf', 'pptx'] as const
export const ADMISSION_STRATEGY_CONVERSION_STATUSES = [
  'pending',
  'converting',
  'ready',
  'failed',
  'needs_pdf',
] as const

export type AdmissionStrategyMaterialStatus =
  (typeof ADMISSION_STRATEGY_MATERIAL_STATUSES)[number]
export type AdmissionStrategyMaterialType = (typeof ADMISSION_STRATEGY_MATERIAL_TYPES)[number]
export type AdmissionStrategyConversionStatus =
  (typeof ADMISSION_STRATEGY_CONVERSION_STATUSES)[number]

export type AdmissionStrategyMaterialPage = {
  id: string
  materialId: string
  pageNumber: number
  assetPath: string
  width: number | null
  height: number | null
  createdAt: string
}

export type AdmissionStrategyMaterial = {
  id: string
  title: string
  description: string
  materialType: AdmissionStrategyMaterialType
  sourceFilePath: string | null
  originalFileName: string
  status: AdmissionStrategyMaterialStatus
  conversionStatus: AdmissionStrategyConversionStatus
  conversionError: string
  displayOrder: number
  pageCount: number | null
  publishedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  pages: AdmissionStrategyMaterialPage[]
}

export type ParentAdmissionStrategyMaterialPage = {
  pageNumber: number
  assetPath: string
  width: number | null
  height: number | null
}

export type ParentAdmissionStrategyMaterial = {
  id: string
  title: string
  description: string
  pageCount: number
  displayOrder: number
  publishedAt: string | null
  pages: ParentAdmissionStrategyMaterialPage[]
}

export const ADMISSION_STRATEGY_STORAGE_BUCKET = 'admission-strategy'
export const ADMISSION_STRATEGY_MAX_UPLOAD_BYTES = 40 * 1024 * 1024
export const ADMISSION_STRATEGY_MAX_PAGES = 80
