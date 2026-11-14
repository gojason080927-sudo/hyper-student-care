import { REGULAR_ADMISSION_THRESHOLDS } from './thresholds'
import type { CalculationType, SupportBand } from './types'

export function classifyByUnifiedGap(gap: number): SupportBand | null {
  const t = REGULAR_ADMISSION_THRESHOLDS
  if (gap >= t.reach.primary.min && gap < t.reach.primary.maxExclusive) return 'reach'
  if (gap >= t.ambitious.primary.min && gap <= t.ambitious.primary.max) return 'ambitious'
  if (gap > t.target.primary.minExclusive && gap <= t.target.primary.max) return 'target'
  return null
}

export function classifyAveragePercentile(gap: number): SupportBand | null {
  return classifyByUnifiedGap(gap)
}

export function classifySubjectPercentile(gap: number): SupportBand | null {
  return classifyByUnifiedGap(gap)
}

export function classifyUniversityConvertedScore(gap: number): SupportBand | null {
  return classifyByUnifiedGap(gap)
}

export function classifyBestDomainScore(gap: number): SupportBand | null {
  return classifyByUnifiedGap(gap)
}

export function classifyByCalculationType(
  _calculationType: CalculationType,
  gap: number,
): SupportBand | null {
  return classifyByUnifiedGap(gap)
}

export function bandLabel(band: SupportBand): string {
  switch (band) {
    case 'reach':
      return '상향'
    case 'ambitious':
      return '소신'
    case 'target':
      return '적정'
  }
}

export function bandCenter(band: SupportBand): number {
  const t = REGULAR_ADMISSION_THRESHOLDS
  if (band === 'reach') {
    return (t.reach.primary.min + t.reach.primary.maxExclusive) / 2
  }
  if (band === 'ambitious') {
    return (t.ambitious.primary.min + t.ambitious.primary.max) / 2
  }
  return (t.target.primary.minExclusive + t.target.primary.max) / 2
}
