/**
 * 대학 입결 repository — Production 분석은 공식 데이터만.
 * TEST DATA는 개발 플래그가 켜진 경우에만 노출 (기본 끔).
 */
import type { UniversityAdmissionRecord } from '../types'
import { importAdmissionRecordsFromJsonArray } from '../utils/admissionDataImporter'
import { dedupeUniversityRecords } from '../utils/admissionRecordValidator'
import officialBundle from './official/officialAdmissionResults.json'

/**
 * 개발 전용 TEST DATA — Production 분석에 섞이지 않음.
 * import.meta.env.DEV && VITE_ADMISSION_INCLUDE_TEST_DATA === 'true' 일 때만 병합.
 */
export const TEST_UNIVERSITY_ADMISSION_RECORDS: UniversityAdmissionRecord[] = []

const imported = importAdmissionRecordsFromJsonArray(
  (officialBundle as { records: unknown[] }).records ?? [],
)

if (imported.rejected.length > 0 && import.meta.env.DEV) {
  console.warn(
    '[admissionAnalysis] rejected official records:',
    imported.rejected.slice(0, 5),
  )
}

export const OFFICIAL_UNIVERSITY_ADMISSION_RECORDS: UniversityAdmissionRecord[] =
  imported.accepted

function includeTestData(): boolean {
  try {
    return (
      Boolean(import.meta.env.DEV) &&
      String(import.meta.env.VITE_ADMISSION_INCLUDE_TEST_DATA ?? '') === 'true'
    )
  } catch {
    return false
  }
}

/** Production 상담 분석용 — 공식·검증 통과 레코드만 */
export function listUniversityAdmissionData(): UniversityAdmissionRecord[] {
  const official = listOfficialUniversityAdmissionData()
  if (!includeTestData()) return official
  return dedupeUniversityRecords([
    ...official,
    ...TEST_UNIVERSITY_ADMISSION_RECORDS,
  ])
}

export function listOfficialUniversityAdmissionData(): UniversityAdmissionRecord[] {
  return OFFICIAL_UNIVERSITY_ADMISSION_RECORDS.filter(
    (r) =>
      r.officialData === true &&
      Boolean(r.sourceName) &&
      (r.dataType ?? 'actual_admission_result') === 'actual_admission_result',
  )
}

/** 자동 판정용: grade형 · 실제 입결 · (기본) 최신 학년도 */
export function listAnalyzableAdmissionRecords(options?: {
  admissionYear?: number | 'latest'
}): UniversityAdmissionRecord[] {
  const base = listOfficialUniversityAdmissionData().filter(
    (r) =>
      (r.scoreType ?? 'grade') === 'grade' &&
      r.admissionCategory === '학생부교과' &&
      r.gradeSystem === '9-grade',
  )

  const yearOpt = options?.admissionYear ?? 'latest'
  if (yearOpt === 'latest') {
    if (base.length === 0) return []
    const latest = Math.max(...base.map((r) => r.admissionYear))
    // 대학·모집단위별로 최신 연도만? 아니면 전체에서 최신 연도 일괄?
    // 요구: 기본적으로 가장 최신의 유효한 실제 입시결과.
    // 연도가 섞여 있으면(2025 다수 + 2026 소수) 최신 연도 레코드만 우선하되,
    // 최신 연도에 없는 모집단위는 직전 연도를 남기지 않고 — 사용자가 연도 선택으로 확장.
    // 단순 구현: 데이터셋 내 최대 학년도 레코드만 기본 사용.
    // 단 2026이 2건뿐이면 분석이 빈약해짐.
    // 더 나은 접근: 각 (대학,학과,전형) 조합의 최신 연도 1건.
    const byKey = new Map<string, UniversityAdmissionRecord>()
    for (const r of base) {
      const key = `${r.universityName}|${r.departmentName}|${r.admissionType}`
      const prev = byKey.get(key)
      if (!prev || r.admissionYear > prev.admissionYear) byKey.set(key, r)
    }
    void latest
    return [...byKey.values()]
  }

  return base.filter((r) => r.admissionYear === yearOpt)
}

export function getAvailableAdmissionYears(): number[] {
  const years = new Set(
    listOfficialUniversityAdmissionData().map((r) => r.admissionYear),
  )
  return [...years].sort((a, b) => b - a)
}
