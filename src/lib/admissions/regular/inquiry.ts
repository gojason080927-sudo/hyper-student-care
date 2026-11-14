import { InquiryRule, type InquiryRequiredType, type RegularAdmissionMasterRow, type StudentMetrics } from './types'

export type InquiryValueKind = 'percentile' | 'standardScore'

export function studentInquiryValue(
  metrics: StudentMetrics,
  rule: InquiryRule,
  kind: InquiryValueKind = 'percentile',
): number | null {
  if (kind === 'standardScore') {
    if (rule === InquiryRule.BEST_1 || rule === InquiryRule.ONE) {
      return metrics.inquiryBestStandardScore
    }
    if (rule === InquiryRule.SUM_2) {
      if (
        metrics.inquiry1StandardScore == null ||
        metrics.inquiry2StandardScore == null
      ) {
        return null
      }
      return metrics.inquiry1StandardScore + metrics.inquiry2StandardScore
    }
    return metrics.inquiryAverageStandardScore
  }

  if (rule === InquiryRule.BEST_1 || rule === InquiryRule.ONE) {
    if (rule === InquiryRule.ONE) {
      return metrics.inquiryBestPercentile
    }
    return metrics.inquiryBestPercentile
  }
  if (rule === InquiryRule.SUM_2) {
    if (metrics.inquiry1Percentile == null || metrics.inquiry2Percentile == null) {
      return null
    }
    return metrics.inquiry1Percentile + metrics.inquiry2Percentile
  }
  return metrics.inquiryAveragePercentile
}

/**
 * 탐구 70% 공식값. 평균만 공개된 경우 탐구1/탐구2를 임의 분리하지 않는다.
 */
export function officialInquiryCutoff(
  row: RegularAdmissionMasterRow,
): number | null {
  const rule = row.inquiryRule
  if (rule === InquiryRule.AVERAGE_2) {
    if (row.inquiryAverage70 != null) return row.inquiryAverage70
    if (row.inquiry1_70 != null && row.inquiry2_70 != null) {
      return (row.inquiry1_70 + row.inquiry2_70) / 2
    }
    return null
  }
  if (rule === InquiryRule.SUM_2) {
    if (row.inquiry1_70 != null && row.inquiry2_70 != null) {
      return row.inquiry1_70 + row.inquiry2_70
    }
    if (row.inquiryAverage70 != null) return row.inquiryAverage70 * 2
    return null
  }
  if (rule === InquiryRule.BEST_1 || rule === InquiryRule.ONE) {
    if (row.inquiry1_70 != null && row.inquiry2_70 != null) {
      return Math.max(row.inquiry1_70, row.inquiry2_70)
    }
    if (row.inquiry1_70 != null) return row.inquiry1_70
    if (row.inquiry2_70 != null) return row.inquiry2_70
    if (row.inquiryAverage70 != null && rule === InquiryRule.ONE) {
      return row.inquiryAverage70
    }
    return null
  }
  return row.inquiryAverage70
}

export function inquiryTypeOk(
  metrics: StudentMetrics,
  required: InquiryRequiredType,
): boolean {
  if (required === 'ANY') return true
  const types = [metrics.inquiry1Type, metrics.inquiry2Type]
  if (required === 'SCIENCE') {
    return types.includes('과학탐구')
  }
  if (required === 'SOCIAL') {
    return types.includes('사회탐구')
  }
  return true
}

export function applyInquiryBonus(
  value: number,
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): number {
  const rule = row.inquiryBonusRule
  if (rule == null) return value
  if (rule.requiredType === '과학탐구' && metrics.scienceInquiryCount < 2) {
    return value
  }
  if (rule.requiredType === '사회탐구') {
    const bothSocial =
      metrics.inquiry1Type === '사회탐구' && metrics.inquiry2Type === '사회탐구'
    if (!bothSocial) return value
  }
  if (rule.mode === 'multiply') return value * rule.value
  return value + rule.value
}
