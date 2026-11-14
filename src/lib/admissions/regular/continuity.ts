import type { RegularRecommendationResult } from './types'
import { REGULAR_ADMISSION_THRESHOLDS } from './thresholds'

function percentileCuts(matches: RegularRecommendationResult['reach']): number[] {
  return matches
    .map((m) => m.evaluation.cutoffValue)
    .filter((v): v is number => v != null && Number.isFinite(v) && v <= 100 && v >= 0)
}

export function recommendationContinuityGaps(result: RegularRecommendationResult): {
  reachToAmbitious: number | null
  ambitiousToTarget: number | null
} {
  const reach = percentileCuts(result.reach)
  const ambitious = percentileCuts(result.ambitious)
  const target = percentileCuts(result.target)
  const reachToAmbitious =
    reach.length > 0 && ambitious.length > 0
      ? Math.min(...reach) - Math.max(...ambitious)
      : null
  const ambitiousToTarget =
    ambitious.length > 0 && target.length > 0
      ? Math.min(...ambitious) - Math.max(...target)
      : null
  return { reachToAmbitious, ambitiousToTarget }
}

/** 세 구간 70%컷 사이에 3점 초과 공백이 있으면 false. 한쪽 구간이 비면 해당 비교는 건너뛴다. */
export function recommendationContinuityOk(result: RegularRecommendationResult): boolean {
  const max = REGULAR_ADMISSION_THRESHOLDS.continuityMaxCutGap
  const gaps = recommendationContinuityGaps(result)
  if (gaps.reachToAmbitious != null && gaps.reachToAmbitious > max) return false
  if (gaps.ambitiousToTarget != null && gaps.ambitiousToTarget > max) return false
  return true
}
