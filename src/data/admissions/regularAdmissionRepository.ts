/**
 * 정시 MASTER repository.
 * Production 추천은 HYPER_정시_APP_PRODUCTION_v1.json 만 사용한다.
 * seed/mock (`regularAdmissionMaster.ts`) 는 엔진 단위테스트용으로 유지한다.
 */
import type { RegularAdmissionMasterRow } from '../../lib/admissions/regular/types'
import {
  PRODUCTION_REGULAR_ADMISSION_COUNT,
  dedupeRegularAdmissionRows,
  mapProductionRecordToMasterRow,
  type RegularAdmissionProductionRecord,
} from './regularAdmissionProductionAdapter'

let cached: RegularAdmissionMasterRow[] | null = null

export async function loadRegularAdmissionMaster(): Promise<
  RegularAdmissionMasterRow[]
> {
  if (cached) return cached
  const mod = await import('./HYPER_정시_APP_PRODUCTION_v1.json')
  const data = (mod as { default?: RegularAdmissionProductionRecord[] } & {
    length?: number
  }).default ?? mod
  const raw = data as RegularAdmissionProductionRecord[]
  if (!Array.isArray(raw)) {
    throw new Error('정시 PRODUCTION JSON이 배열이 아닙니다.')
  }
  if (raw.length !== PRODUCTION_REGULAR_ADMISSION_COUNT) {
    throw new Error(
      `정시 PRODUCTION JSON 레코드 수 불일치: expected ${PRODUCTION_REGULAR_ADMISSION_COUNT}, got ${raw.length}`,
    )
  }
  cached = dedupeRegularAdmissionRows(raw.map(mapProductionRecordToMasterRow))
  return cached
}

export function resetRegularAdmissionMasterCache(): void {
  cached = null
}
