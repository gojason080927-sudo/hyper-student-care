import { SPECIAL_ADMISSION_TYPE_KEYWORDS } from '../config/admissionThresholds'
import type {
  V124CsatStatus,
  V124RecommendationMatch,
  V124RecommendationRecord,
  V124RecommendationResult,
  V124SupportBand,
} from '../types/v124Recommendation'
import { classifyV124RegionGroup, v124RegionRank } from './v124Region'

/**
 * 교과 70%컷(C) vs 학생 9등급(S). 등급은 낮을수록 유리.
 * 상향: S-0.20 ≤ C ≤ S-0.11
 * 소신: S-0.10 ≤ C ≤ S-0.01
 * 적정: S ≤ C ≤ S+0.15
 * 초상향 및 구간 밖은 추천에서 제외. 구간은 겹치지 않음.
 */
export const V124_BAND_OFFSET = {
  reachMin: 0.2,
  reachMax: 0.11,
  ambitiousMin: 0.1,
  ambitiousMax: 0.01,
  targetMaxInclusive: 0.15,
  maxPerBand: 30,
  maxPerUniversity: 3,
  spreadBuckets: 3,
} as const

export function cutoffToHundredths(cutoff70: number): number {
  return Math.round(cutoff70 * 100)
}

export function classifyV124Band(
  studentGrade9: number,
  cutoff70: number,
): V124SupportBand | null {
  const s = Math.round(studentGrade9 * 100)
  const c = cutoffToHundredths(cutoff70)
  if (c >= s - 20 && c <= s - 11) return 'reach'
  if (c >= s - 10 && c <= s - 1) return 'ambitious'
  if (c >= s && c <= s + 15) return 'target'
  return null
}

export function v124BandCutoffWindow(
  studentGrade9: number,
  band: V124SupportBand,
): { minC: number; maxC: number } {
  const s = Math.round(studentGrade9 * 100)
  if (band === 'reach') return { minC: s - 20, maxC: s - 11 }
  if (band === 'ambitious') return { minC: s - 10, maxC: s - 1 }
  return { minC: s, maxC: s + 15 }
}

/** 예: 1.80~1.89 → 1.80~1.82 / 1.83~1.85 / 1.86~1.89 */
export function splitCutoffWindow(
  minC: number,
  maxC: number,
  bucketCount = V124_BAND_OFFSET.spreadBuckets,
): Array<{ minC: number; maxC: number }> {
  const span = maxC - minC + 1
  if (span <= 0) return []
  const n = Math.min(bucketCount, span)
  const base = Math.floor(span / n)
  const rem = span % n
  const buckets: Array<{ minC: number; maxC: number }> = []
  let start = minC
  for (let i = 0; i < n; i += 1) {
    const size = base + (i === n - 1 ? rem : 0)
    buckets.push({ minC: start, maxC: start + size - 1 })
    start += size
  }
  return buckets
}

export function v124BandLabel(band: V124SupportBand): string {
  switch (band) {
    case 'reach':
      return '상향'
    case 'ambitious':
      return '소신'
    case 'target':
      return '적정'
  }
}

export function formatV124CsatStatus(status: V124CsatStatus): string {
  switch (status) {
    case 'applied':
      return '수능최저 있음'
    case 'not_applied':
      return '수능최저 없음'
    case 'partial':
      return '수능최저 부분 적용'
    case 'unverified':
      return '수능최저 미확인'
  }
}

export function formatV124Cutoff70(cut: number | null, prefix: string): string {
  if (cut == null) return `${prefix} 공식 미공개`
  return `${prefix} ${cut.toFixed(2)}`
}

export function formatV124CompetitionRate(
  rate: number | null,
  kind: '학종' | '교과',
): string {
  if (rate == null) return '경쟁률 -'
  return `${kind} 경쟁률 ${rate}:1`
}

function isSpecialAdmissionType(admissionType: string): boolean {
  const t = admissionType.toLowerCase()
  return SPECIAL_ADMISSION_TYPE_KEYWORDS.some((k) =>
    t.includes(k.toLowerCase()),
  )
}

function sortRecommendationMatches(
  a: V124RecommendationMatch,
  b: V124RecommendationMatch,
): number {
  const ra = v124RegionRank(
    classifyV124RegionGroup(a.record.campus, a.record.universityName),
  )
  const rb = v124RegionRank(
    classifyV124RegionGroup(b.record.campus, b.record.universityName),
  )
  if (ra !== rb) return ra - rb
  if (a.record.curriculumCutoff70 !== b.record.curriculumCutoff70) {
    return a.record.curriculumCutoff70 - b.record.curriculumCutoff70
  }
  const uni = a.record.universityName.localeCompare(
    b.record.universityName,
    'ko',
  )
  if (uni !== 0) return uni
  return a.record.departmentName.localeCompare(b.record.departmentName, 'ko')
}

function tryTakeMatch(
  selected: V124RecommendationMatch[],
  selectedIds: Set<string>,
  uniCount: Map<string, number>,
  match: V124RecommendationMatch,
  uniCap: number,
  maxCount: number,
): boolean {
  if (selected.length >= maxCount) return false
  if (selectedIds.has(match.record.id)) return false
  const used = uniCount.get(match.record.universityName) ?? 0
  if (used >= uniCap) return false
  selected.push(match)
  selectedIds.add(match.record.id)
  uniCount.set(match.record.universityName, used + 1)
  return true
}

/**
 * 컷 오름차순 앞에서 자르지 않고, 등급 창을 소구간으로 나눠 균등 선정.
 * 소구간 안에서는 지역/대학 우선순위. 동일 대학은 가능하면 3개까지.
 * 후보가 모자라면 대학 제한만 완화하고, 등급 범위는 넓히지 않는다.
 */
export function selectSpreadBandMatches(
  matches: V124RecommendationMatch[],
  studentGrade9: number,
  band: V124SupportBand,
): V124RecommendationMatch[] {
  const maxCount = V124_BAND_OFFSET.maxPerBand
  const uniCap = V124_BAND_OFFSET.maxPerUniversity
  const { minC, maxC } = v124BandCutoffWindow(studentGrade9, band)
  const buckets = splitCutoffWindow(minC, maxC)
  const groups = buckets.map((bucket) =>
    matches
      .filter((m) => {
        const c = cutoffToHundredths(m.record.curriculumCutoff70)
        return c >= bucket.minC && c <= bucket.maxC
      })
      .sort(sortRecommendationMatches),
  )

  const selected: V124RecommendationMatch[] = []
  const selectedIds = new Set<string>()
  const uniCount = new Map<string, number>()
  const cursors = groups.map(() => 0)

  let progressed = true
  while (selected.length < maxCount && progressed) {
    progressed = false
    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i]
      while (cursors[i] < group.length) {
        const next = group[cursors[i]]
        cursors[i] += 1
        if (tryTakeMatch(selected, selectedIds, uniCount, next, uniCap, maxCount)) {
          progressed = true
          break
        }
      }
      if (selected.length >= maxCount) break
    }
  }

  const leftovers = matches
    .filter((m) => !selectedIds.has(m.record.id))
    .sort(sortRecommendationMatches)
  for (const match of leftovers) {
    if (selected.length >= maxCount) break
    tryTakeMatch(selected, selectedIds, uniCount, match, uniCap, maxCount)
  }
  for (const match of leftovers) {
    if (selected.length >= maxCount) break
    tryTakeMatch(selected, selectedIds, uniCount, match, Number.POSITIVE_INFINITY, maxCount)
  }

  return selected.sort(sortRecommendationMatches)
}

export function recommendV124Universities(input: {
  studentGrade9: number | null
  records: V124RecommendationRecord[]
  includeSpecialAdmissions?: boolean
}): V124RecommendationResult {
  if (input.studentGrade9 === null) {
    return {
      ready: false,
      message: '9등급제 환산 평균이 계산된 뒤 대학 추천을 이용할 수 있습니다.',
      studentGrade9: null,
      reach: [],
      ambitious: [],
      target: [],
    }
  }

  const records = input.records
  const includeSpecial = input.includeSpecialAdmissions ?? false
  const reach: V124RecommendationMatch[] = []
  const ambitious: V124RecommendationMatch[] = []
  const target: V124RecommendationMatch[] = []

  for (const record of records) {
    if (!includeSpecial && isSpecialAdmissionType(record.admissionType)) {
      continue
    }
    const band = classifyV124Band(
      input.studentGrade9,
      record.curriculumCutoff70,
    )
    if (!band) continue
    const match: V124RecommendationMatch = {
      record,
      studentGrade9: input.studentGrade9,
      band,
    }
    if (band === 'reach') reach.push(match)
    else if (band === 'ambitious') ambitious.push(match)
    else target.push(match)
  }

  return {
    ready: true,
    message: '',
    studentGrade9: input.studentGrade9,
    reach: selectSpreadBandMatches(reach, input.studentGrade9, 'reach'),
    ambitious: selectSpreadBandMatches(
      ambitious,
      input.studentGrade9,
      'ambitious',
    ),
    target: selectSpreadBandMatches(target, input.studentGrade9, 'target'),
  }
}

export function formatCounselingPrintDate(date = new Date()): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}
