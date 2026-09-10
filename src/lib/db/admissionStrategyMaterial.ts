import { getSupabase } from '../supabase'
import type {
  AdmissionStrategyMaterial,
  AdmissionStrategyMaterialStatus,
  ParentAdmissionStrategyMaterial,
} from '../../types/admissionStrategyMaterial'
import {
  admissionStrategyMaterialFromRow,
  admissionStrategyMaterialToRow,
  parseParentAdmissionStrategyMaterial,
  parseParentAdmissionStrategyMaterials,
  type AdmissionStrategyMaterialPageRow,
  type AdmissionStrategyMaterialRow,
} from './admissionStrategyMaterialModel'
import { deleteMaterialStorage } from '../admissionStrategy/materialStorage'
import { createId } from '../../utils/id'
import { fetchParentAnonRpc } from './parentAnonRpc'

export {
  admissionStrategyMaterialFromRow,
  admissionStrategyMaterialToRow,
  canPublishMaterial,
  conversionStatusLabel,
  hasMaterialTrack,
  isParentVisibleMaterial,
  materialStatusLabel,
  needsPageConversion,
  nextDisplayOrder,
  parseParentAdmissionStrategyMaterial,
  parseParentAdmissionStrategyMaterials,
  sortMaterialsByDisplayOrder,
  swappedDisplayOrders,
} from './admissionStrategyMaterialModel'
export type { AdmissionStrategyMaterialRow } from './admissionStrategyMaterialModel'

async function fetchPagesForMaterials(
  materialIds: string[],
): Promise<AdmissionStrategyMaterialPageRow[]> {
  if (materialIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from('admission_strategy_material_pages')
    .select('*')
    .in('material_id', materialIds)
    .order('page_number', { ascending: true })
  if (error) throw new Error(error.message || '자료 페이지를 불러오지 못했습니다.')
  return (data as AdmissionStrategyMaterialPageRow[] | null) ?? []
}

export async function fetchAdmissionStrategyMaterials(): Promise<AdmissionStrategyMaterial[]> {
  const { data, error } = await getSupabase()
    .from('admission_strategy_materials')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message || '입시전략 자료 목록을 불러오지 못했습니다.')
  const rows = (data as AdmissionStrategyMaterialRow[] | null) ?? []
  const pages = await fetchPagesForMaterials(rows.map((row) => row.id))
  return rows.map((row) => admissionStrategyMaterialFromRow(row, pages))
}

export async function upsertAdmissionStrategyMaterial(
  record: AdmissionStrategyMaterial,
): Promise<void> {
  const { error } = await getSupabase()
    .from('admission_strategy_materials')
    .upsert(admissionStrategyMaterialToRow(record), { onConflict: 'id' })
  if (error) throw new Error(error.message || '입시전략 자료 저장에 실패했습니다.')
}

export async function updateAdmissionStrategyMaterialStatus(
  id: string,
  status: AdmissionStrategyMaterialStatus,
  publishedAt: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('admission_strategy_materials')
    .update({
      status,
      published_at: publishedAt,
    })
    .eq('id', id)
  if (error) throw new Error(error.message || '자료 상태를 변경하지 못했습니다.')
}

export async function updateAdmissionStrategyMaterialOrders(
  updates: { id: string; displayOrder: number }[],
): Promise<void> {
  for (const update of updates) {
    const { error } = await getSupabase()
      .from('admission_strategy_materials')
      .update({ display_order: update.displayOrder })
      .eq('id', update.id)
    if (error) throw new Error(error.message || '자료 순서를 변경하지 못했습니다.')
  }
}

export async function replaceAdmissionStrategyMaterialPages(
  materialId: string,
  pages: Omit<AdmissionStrategyMaterial['pages'][number], 'id' | 'createdAt' | 'materialId'>[],
): Promise<void> {
  const { error: deleteError } = await getSupabase()
    .from('admission_strategy_material_pages')
    .delete()
    .eq('material_id', materialId)
  if (deleteError) throw new Error(deleteError.message || '기존 페이지를 정리하지 못했습니다.')

  if (pages.length === 0) return
  const rows = pages.map((page) => ({
    id: createId(),
    material_id: materialId,
    page_number: page.pageNumber,
    asset_path: page.assetPath,
    width: page.width,
    height: page.height,
  }))
  const { error } = await getSupabase().from('admission_strategy_material_pages').insert(rows)
  if (error) throw new Error(error.message || '자료 페이지 저장에 실패했습니다.')
}

export async function deleteAdmissionStrategyMaterial(id: string): Promise<void> {
  try {
    await deleteMaterialStorage(id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '자료 파일을 삭제하지 못해 자료를 지우지 않았습니다.'
    throw new Error(message, { cause: error })
  }
  const { error } = await getSupabase().from('admission_strategy_materials').delete().eq('id', id)
  if (error) throw new Error(error.message || '입시전략 자료 삭제에 실패했습니다.')
}

export async function markParentAdmissionStrategyMaterialViewed(
  accessKey: string,
  materialId: string,
): Promise<string | null> {
  try {
    const data = await fetchParentAnonRpc('mark_parent_admission_strategy_material_viewed', {
      p_access_key: accessKey,
      p_material_id: materialId,
    })
    return typeof data === 'string' ? data : null
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '자료 확인 상태를 저장하지 못했습니다.')
  }
}

export async function fetchParentAdmissionStrategyMaterials(
  accessKey: string,
): Promise<ParentAdmissionStrategyMaterial[] | null> {
  try {
    const data = await fetchParentAnonRpc('get_parent_admission_strategy_materials', {
      p_access_key: accessKey,
    })
    if (data == null) return null
    return parseParentAdmissionStrategyMaterials(data)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : '입시전략 자료를 불러오지 못했습니다.',
    )
  }
}

export async function fetchParentAdmissionStrategyMaterial(
  accessKey: string,
  materialId: string,
): Promise<ParentAdmissionStrategyMaterial | null> {
  try {
    const data = await fetchParentAnonRpc('get_parent_admission_strategy_material', {
      p_access_key: accessKey,
      p_material_id: materialId,
    })
    if (data == null) return null
    return parseParentAdmissionStrategyMaterial(data)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : '입시전략 자료를 불러오지 못했습니다.',
    )
  }
}
