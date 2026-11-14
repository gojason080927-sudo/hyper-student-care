import type { AdmissionSupportBand, UniversityAdmissionRecord, UniversityFieldTrack } from '../types'

export type RegionFilter = '전체' | '서울' | '경기/인천' | '수도권' | '지방'
export type FieldTrackFilter = '전체' | UniversityFieldTrack
export type BandFilter = '전체' | AdmissionSupportBand
export type AdmissionYearFilter = 'latest' | number

export type UniversityResultFilters = {
  region: RegionFilter
  fieldTrack: FieldTrackFilter
  universityNameQuery: string
  admissionTypeQuery: string
  admissionYear: AdmissionYearFilter
  band: BandFilter
}

export const DEFAULT_UNIVERSITY_FILTERS: UniversityResultFilters = {
  region: '전체',
  fieldTrack: '전체',
  universityNameQuery: '',
  admissionTypeQuery: '',
  admissionYear: 'latest',
  band: '전체',
}

export const REGION_FILTER_OPTIONS: RegionFilter[] = [
  '전체',
  '서울',
  '경기/인천',
  '수도권',
  '지방',
]

export const FIELD_TRACK_FILTER_OPTIONS: FieldTrackFilter[] = [
  '전체',
  '인문',
  '자연',
  '공학',
  '상경',
  '교육',
  '보건',
  '기타',
]

export const BAND_FILTER_OPTIONS: Array<{ value: BandFilter; label: string }> = [
  { value: '전체', label: '전체 판정' },
  { value: 'ambitious', label: '상향 지원' },
  { value: 'target', label: '적정 지원' },
  { value: 'safe', label: '안정 지원' },
]

function matchesRegion(
  record: UniversityAdmissionRecord,
  region: RegionFilter,
): boolean {
  if (region === '전체') return true
  const r = record.region ?? ''
  if (region === '수도권') {
    return r === '서울' || r === '경기/인천' || r === '수도권'
  }
  return r === region
}

function matchesFieldTrack(
  record: UniversityAdmissionRecord,
  fieldTrack: FieldTrackFilter,
): boolean {
  if (fieldTrack === '전체') return true
  return (record.fieldTrack ?? '기타') === fieldTrack
}

function matchesUniversityName(
  record: UniversityAdmissionRecord,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    record.universityName.toLowerCase().includes(q) ||
    record.departmentName.toLowerCase().includes(q)
  )
}

function matchesAdmissionType(
  record: UniversityAdmissionRecord,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return record.admissionType.toLowerCase().includes(q)
}

function matchesAdmissionYear(
  record: UniversityAdmissionRecord,
  year: AdmissionYearFilter,
  latestYear: number | null,
): boolean {
  if (year === 'latest') {
    if (latestYear === null) return true
    // listAnalyzable already picks latest per key; year filter on display
    // uses record.admissionYear when not 'latest'
    return true
  }
  return record.admissionYear === year
}

export function filterUniversityRecords(
  records: UniversityAdmissionRecord[],
  filters: UniversityResultFilters,
  options?: { latestYear?: number | null },
): UniversityAdmissionRecord[] {
  const latestYear = options?.latestYear ?? null
  return records.filter(
    (r) =>
      matchesRegion(r, filters.region) &&
      matchesFieldTrack(r, filters.fieldTrack) &&
      matchesUniversityName(r, filters.universityNameQuery) &&
      matchesAdmissionType(r, filters.admissionTypeQuery) &&
      matchesAdmissionYear(r, filters.admissionYear, latestYear),
  )
}
