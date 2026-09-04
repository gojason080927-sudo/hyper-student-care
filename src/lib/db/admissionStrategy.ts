import { getSupabase } from '../supabase'
import type { AdmissionStrategyPost, ParentAdmissionStrategyPost } from '../../types/admissionStrategy'
import {
  admissionStrategyFromRow,
  admissionStrategyToRow,
  parseParentAdmissionStrategyPosts,
  type AdmissionStrategyRow,
} from './admissionStrategyModel'

export {
  admissionStrategyFromRow,
  admissionStrategyToRow,
  filterAdmissionStrategyByTrack,
  filterPublishedAdmissionStrategyPosts,
  parseParentAdmissionStrategyPosts,
} from './admissionStrategyModel'
export type { AdmissionStrategyRow } from './admissionStrategyModel'

export async function fetchAdmissionStrategyPosts(): Promise<AdmissionStrategyPost[]> {
  const { data, error } = await getSupabase()
    .from('admission_strategy_posts')
    .select('*')
    .order('published_at', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message || '입시전략 목록을 불러오지 못했습니다.')
  return (data as AdmissionStrategyRow[] | null)?.map(admissionStrategyFromRow) ?? []
}

export async function upsertAdmissionStrategyPost(record: AdmissionStrategyPost): Promise<void> {
  const { error } = await getSupabase()
    .from('admission_strategy_posts')
    .upsert(admissionStrategyToRow(record), { onConflict: 'id' })
  if (error) throw new Error(error.message || '입시전략 저장에 실패했습니다.')
}

export async function deleteAdmissionStrategyPost(id: string): Promise<void> {
  const { error } = await getSupabase().from('admission_strategy_posts').delete().eq('id', id)
  if (error) throw new Error(error.message || '입시전략 삭제에 실패했습니다.')
}

export async function fetchParentAdmissionStrategyPosts(
  accessKey: string,
): Promise<ParentAdmissionStrategyPost[] | null> {
  const { data, error } = await getSupabase().rpc('get_parent_admission_strategy_posts', {
    p_access_key: accessKey,
  })
  if (error) throw new Error(error.message || '입시전략을 불러오지 못했습니다.')
  if (data == null) return null
  return parseParentAdmissionStrategyPosts(data)
}
