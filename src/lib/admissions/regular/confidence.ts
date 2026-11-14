import type {
  CalculationType,
  ConfidenceLevel,
  DataQuality,
  RegularAdmissionMasterRow,
  ResultType,
} from './types'

export function comparisonBasisLabel(
  resultType: ResultType,
  calculationType: CalculationType,
  hasSubjectWeights = false,
): string {
  if (calculationType === 'BEST_3') return '상위 3개 영역 백분위'
  if (calculationType === 'BEST_2') return '상위 2개 영역 백분위'
  if (calculationType === 'BEST_2_PLUS_INQUIRY_1') {
    return '상위 2개 영역 + 탐구 1과목'
  }
  if (calculationType === 'BEST_3_PLUS_INQUIRY') {
    return '상위 3개 영역 + 탐구'
  }
  if (calculationType === 'INQUIRY_BEST_1') return '탐구 상위 1과목'
  if (calculationType === 'INQUIRY_AVERAGE_2') return '탐구 2과목 평균'
  switch (resultType) {
    case 'SUBJECT_PERCENTILE_70':
    case 'PARTIAL_SUBJECT_70':
      return hasSubjectWeights
        ? '과목별 70% + 대학 반영비율'
        : '과목별 70%'
    case 'AVERAGE_PERCENTILE_70':
      return '공식 평균백분위'
    case 'INQUIRY_AVERAGE_70':
      return '탐구 평균 70%'
    case 'UNIVERSITY_CONVERTED_70':
      return '대학 자체 환산점수'
    default:
      return '공식 입결 비교'
  }
}

export function confidenceLevel(row: RegularAdmissionMasterRow): ConfidenceLevel {
  if (
    row.sourceConfidenceLevel === 'A' ||
    row.sourceConfidenceLevel === 'B' ||
    row.sourceConfidenceLevel === 'C' ||
    row.sourceConfidenceLevel === 'D'
  ) {
    return row.sourceConfidenceLevel
  }
  if (row.resultType === 'NO_NUMERIC_RESULT') return 'D'
  if (row.calculationType === 'UNSUPPORTED') return 'D'
  if (row.calculationType === 'SCIENCE_TECH_SPECIAL') {
    if (row.universityConverted70 == null && row.averagePercentile70 == null) {
      return 'D'
    }
  }

  const hasSubjectCuts =
    row.korean70 != null || row.math70 != null || row.inquiryAverage70 != null
  const hasWeights =
    (row.koreanWeight ?? 0) > 0 ||
    (row.mathWeight ?? 0) > 0 ||
    (row.inquiryWeight ?? 0) > 0
  const hasAverage = row.averagePercentile70 != null
  const hasConverted = row.universityConverted70 != null
  const englishOk =
    (row.englishWeight ?? 0) <= 0 ||
    (row.englishCalculationType !== 'NONE' && row.englishConversionTable != null)

  if (row.resultType === 'SUBJECT_PERCENTILE_70' && hasSubjectCuts && hasWeights) {
    return englishOk ? 'A' : 'C'
  }
  if (row.resultType === 'AVERAGE_PERCENTILE_70' && hasAverage) {
    return row.averagePercentileRule !== 'UNSPECIFIED' ? 'B' : 'C'
  }
  if (row.resultType === 'UNIVERSITY_CONVERTED_70' && hasConverted) {
    return hasWeights ? 'B' : 'C'
  }
  if (row.resultType === 'INQUIRY_AVERAGE_70' && row.inquiryAverage70 != null) {
    return 'B'
  }
  if (row.resultType === 'PARTIAL_SUBJECT_70' && hasSubjectCuts) {
    return 'C'
  }
  if (hasAverage || hasConverted || hasSubjectCuts) return 'C'
  return 'D'
}

/** HIGH / MEDIUM / LIMITED — LIMITED를 HIGH와 동일하게 취급하지 않는다. */
export function dataQuality(row: RegularAdmissionMasterRow): DataQuality {
  const hasKoreanMath =
    row.korean70 != null && row.math70 != null
  const hasInquiry =
    row.inquiryAverage70 != null ||
    row.inquiry1_70 != null ||
    row.inquiry2_70 != null
  if (
    (row.resultType === 'SUBJECT_PERCENTILE_70' ||
      row.calculationType === 'WEIGHTED_PERCENTILE' ||
      row.calculationType === 'SUBJECT_COMPARISON') &&
    hasKoreanMath &&
    hasInquiry
  ) {
    return 'HIGH'
  }
  if (row.resultType === 'AVERAGE_PERCENTILE_70' && row.averagePercentile70 != null) {
    return 'MEDIUM'
  }
  if (row.resultType === 'INQUIRY_AVERAGE_70' && row.inquiryAverage70 != null) {
    return 'MEDIUM'
  }
  if (row.averagePercentile70 != null && hasKoreanMath) return 'MEDIUM'
  if (hasKoreanMath && hasInquiry) return 'HIGH'
  if (row.averagePercentile70 != null) return 'MEDIUM'
  return 'LIMITED'
}
