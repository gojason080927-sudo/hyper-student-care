import { evaluateRegularAdmissionRow } from './evaluator'
import {
  isExcludedFromProductionRecommendation,
  recommendationUniqueKey,
  regionSortRank,
} from './exclusions'
import {
  classifyRecommendationField,
  isMedicalSpecialGroup,
} from './fieldClassify'
import { hasAnyScore } from './metrics'
import { REGULAR_ADMISSION_THRESHOLDS } from './thresholds'
import type {
  DataQuality,
  RegularAdmissionFilters,
  RegularAdmissionMasterRow,
  RegularEvaluation,
  RegularRecommendationMatch,
  RegularRecommendationResult,
  StudentMetrics,
  SupportBand,
} from './types'

const BANDS: SupportBand[] = ['reach', 'ambitious', 'target']

type ExpandStage = 1 | 2 | 3

function dataQualityRank(level: DataQuality): number {
  if (level === 'HIGH') return 0
  if (level === 'MEDIUM') return 1
  return 2
}

function gapOf(m: RegularRecommendationMatch): number {
  return m.evaluation.supportGap ?? 0
}

function sortByProximity(
  a: RegularRecommendationMatch,
  b: RegularRecommendationMatch,
): number {
  const gapAbs = Math.abs(gapOf(a)) - Math.abs(gapOf(b))
  if (gapAbs !== 0) return gapAbs

  const quality =
    dataQualityRank(a.evaluation.dataQuality) - dataQualityRank(b.evaluation.dataQuality)
  if (quality !== 0) return quality

  const ra = regionSortRank(
    a.evaluation.row.region,
    a.evaluation.row.university,
    a.evaluation.row.campus,
  )
  const rb = regionSortRank(
    b.evaluation.row.region,
    b.evaluation.row.university,
    b.evaluation.row.campus,
  )
  if (ra !== rb) return ra - rb

  const uni = a.evaluation.row.university.localeCompare(b.evaluation.row.university, 'ko')
  if (uni !== 0) return uni
  return a.evaluation.row.department.localeCompare(b.evaluation.row.department, 'ko')
}

function inReachWindow(gap: number, stage: ExpandStage): boolean {
  const w = REGULAR_ADMISSION_THRESHOLDS.reach
  if (stage === 1) return gap >= w.primary.min && gap < w.primary.maxExclusive
  if (stage === 2) return gap >= w.expand.min && gap < w.expand.maxExclusive
  return gap >= w.max.min && gap < w.max.maxExclusive
}

function inAmbitiousWindow(gap: number, stage: ExpandStage): boolean {
  const w = REGULAR_ADMISSION_THRESHOLDS.ambitious
  if (stage === 1) return gap >= w.primary.min && gap <= w.primary.max
  if (stage === 2) return gap >= w.expand.min && gap <= w.expand.max
  return gap >= w.max.min && gap <= w.max.max
}

function inTargetWindow(gap: number, stage: ExpandStage): boolean {
  const w = REGULAR_ADMISSION_THRESHOLDS.target
  if (stage === 1) return gap > w.primary.minExclusive && gap <= w.primary.max
  if (stage === 2) return gap > w.expand.minExclusive && gap <= w.expand.max
  return gap >= w.max.min && gap <= w.max.max
}

function inBandWindow(band: SupportBand, gap: number, stage: ExpandStage): boolean {
  if (band === 'reach') return inReachWindow(gap, stage)
  if (band === 'ambitious') return inAmbitiousWindow(gap, stage)
  return inTargetWindow(gap, stage)
}

function passesFilters(
  row: RegularAdmissionMasterRow,
  filters: RegularAdmissionFilters | undefined,
): boolean {
  if (!filters) return true
  if (filters.region !== '전체' && row.region !== filters.region) return false
  if (filters.admissionGroup !== '전체' && row.admissionGroup !== filters.admissionGroup) {
    return false
  }
  if (filters.fieldTrack !== '전체' && row.fieldTrack !== filters.fieldTrack) return false
  return true
}

function selectWithDiversity(
  pool: RegularRecommendationMatch[],
): RegularRecommendationMatch[] {
  const sorted = [...pool].sort(sortByProximity)
  const t = REGULAR_ADMISSION_THRESHOLDS

  const tryPick = (uniLimit: number, seedDistinctFields: boolean) => {
    const picked: RegularRecommendationMatch[] = []
    const pickedKeys = new Set<string>()
    const uniCount = new Map<string, number>()
    const fieldCount = new Map<string, number>()
    let medical = 0

    const tryAdd = (m: RegularRecommendationMatch): boolean => {
      const row = m.evaluation.row
      const key = recommendationUniqueKey(row)
      if (pickedKeys.has(key)) return false
      if ((uniCount.get(row.university) ?? 0) >= uniLimit) return false
      const medicalFlag = isMedicalSpecialGroup(row)
      if (medicalFlag && medical >= t.medicalSpecialLimit) return false
      picked.push(m)
      pickedKeys.add(key)
      uniCount.set(row.university, (uniCount.get(row.university) ?? 0) + 1)
      if (medicalFlag) medical += 1
      const field = classifyRecommendationField(row)
      fieldCount.set(field, (fieldCount.get(field) ?? 0) + 1)
      return true
    }

    if (seedDistinctFields) {
      const seenField = new Set<string>()
      for (const m of sorted) {
        const field = classifyRecommendationField(m.evaluation.row)
        if (seenField.has(field)) continue
        if (tryAdd(m)) seenField.add(field)
        if (seenField.size >= t.minDistinctFields) break
      }
    }

    for (const m of sorted) {
      if (picked.length >= t.maxPerBand) break
      tryAdd(m)
    }
    return picked
  }

  let picked = tryPick(t.sameUniversityLimit, true)
  if (picked.length < t.minPerBand) {
    picked = tryPick(t.sameUniversityLimit, false)
  }
  if (picked.length < t.minPerBand) {
    picked = tryPick(t.sameUniversityLimitRelaxed, false)
  }
  return picked.sort(sortByProximity).slice(0, t.maxPerBand)
}

function poolFor(
  available: RegularRecommendationMatch[],
  band: SupportBand,
  stage: ExpandStage,
  used: Set<string>,
): RegularRecommendationMatch[] {
  return available.filter((m) => {
    const key = recommendationUniqueKey(m.evaluation.row)
    if (used.has(key)) return false
    return inBandWindow(band, gapOf(m), stage)
  })
}

function markUsed(picked: RegularRecommendationMatch[], used: Set<string>): void {
  for (const m of picked) {
    used.add(recommendationUniqueKey(m.evaluation.row))
  }
}

function tagged(picked: RegularRecommendationMatch[], band: SupportBand): RegularRecommendationMatch[] {
  return picked.map((m) => ({
    evaluation: { ...m.evaluation, band },
    band,
  }))
}

export function recommendRegularAdmission(input: {
  metrics: StudentMetrics
  records: RegularAdmissionMasterRow[]
  filters?: RegularAdmissionFilters
}): RegularRecommendationResult {
  const { metrics, records, filters } = input

  if (!hasAnyScore(metrics)) {
    return {
      ready: false,
      message: '수능 또는 모의고사 성적을 입력하면 정시 분석이 시작됩니다.',
      metrics,
      reach: [],
      ambitious: [],
      target: [],
      scienceTechReference: [],
      excludedUnmet: 0,
      skippedCount: 0,
    }
  }

  const scienceTechReference: RegularEvaluation[] = []
  const candidates: RegularRecommendationMatch[] = []
  let excludedUnmet = 0
  let skippedCount = 0
  const seenKeys = new Set<string>()

  for (const row of records) {
    if (isExcludedFromProductionRecommendation(row)) {
      skippedCount += 1
      continue
    }
    const uniqueKey = recommendationUniqueKey(row)
    if (seenKeys.has(uniqueKey)) {
      skippedCount += 1
      continue
    }
    if (!passesFilters(row, filters)) continue

    const evaluation = evaluateRegularAdmissionRow(row, metrics)

    if (evaluation.scienceTechReference) {
      scienceTechReference.push(evaluation)
      continue
    }
    if (!evaluation.eligibilityOk) {
      excludedUnmet += 1
      continue
    }
    if (evaluation.skipped || evaluation.supportGap == null) {
      skippedCount += 1
      continue
    }
    if (evaluation.confidenceLevel === 'D') {
      skippedCount += 1
      continue
    }

    seenKeys.add(uniqueKey)
    candidates.push({
      evaluation,
      band: evaluation.band ?? 'ambitious',
    })
  }

  const used = new Set<string>()
  const byBand: Record<SupportBand, RegularRecommendationMatch[]> = {
    reach: [],
    ambitious: [],
    target: [],
  }

  for (const band of ['ambitious', 'reach', 'target'] as SupportBand[]) {
    let picked: RegularRecommendationMatch[] = []
    for (const stage of [1, 2, 3] as ExpandStage[]) {
      picked = selectWithDiversity(poolFor(candidates, band, stage, used))
      if (picked.length >= REGULAR_ADMISSION_THRESHOLDS.minPerBand) break
    }
    markUsed(picked, used)
    byBand[band] = tagged(picked, band)
  }

  return {
    ready: true,
    message: '',
    metrics,
    reach: byBand.reach,
    ambitious: byBand.ambitious,
    target: byBand.target,
    scienceTechReference,
    excludedUnmet,
    skippedCount,
  }
}

export { BANDS as REGULAR_SUPPORT_BANDS }
