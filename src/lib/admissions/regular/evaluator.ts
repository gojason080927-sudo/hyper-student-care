import { classifyByCalculationType } from './classifier'
import { comparisonBasisLabel, confidenceLevel, dataQuality } from './confidence'
import { convertEnglishGrade, canConvertEnglish } from './english'
import { buildExplanation } from './explanation'
import {
  officialInquiryCutoff,
  inquiryTypeOk,
  studentInquiryValue,
} from './inquiry'
import type {
  DomainKey,
  RegularAdmissionMasterRow,
  RegularEvaluation,
  StudentMetrics,
  SubjectDiffs,
} from './types'
import {
  applyMathBonus,
  canReproduceUniversityFormula,
  mathSelectionOk,
  standardScoreWeighted,
  universityFormulaScore,
  weightedPercentileParts,
  equalWeightSubjectParts,
} from './universityFormula'

function hasSubjectWeights(row: RegularAdmissionMasterRow): boolean {
  return (
    (row.koreanWeight ?? 0) > 0 ||
    (row.mathWeight ?? 0) > 0 ||
    (row.inquiryWeight ?? 0) > 0 ||
    (row.englishWeight ?? 0) > 0
  )
}

function emptyDiffs(): SubjectDiffs {
  return {
    koreanDiff: null,
    mathDiff: null,
    inquiry1Diff: null,
    inquiry2Diff: null,
    inquiryDiff: null,
    englishDiff: null,
  }
}

function skip(
  row: RegularAdmissionMasterRow,
  reason: string,
  extra?: Partial<RegularEvaluation>,
): RegularEvaluation {
  const base: RegularEvaluation = {
    row,
    skipped: true,
    skipReason: reason,
    eligibilityOk: extra?.eligibilityOk ?? true,
    eligibilityNote: extra?.eligibilityNote ?? null,
    studentValue: null,
    cutoffValue: null,
    supportGap: null,
    normalizedSupportScore: null,
    subjectDiffs: emptyDiffs(),
    comparisonBasis: comparisonBasisLabel(
      row.resultType,
      row.calculationType,
      hasSubjectWeights(row),
    ),
    studentValueLabel: '학생 계산값',
    cutoffValueLabel: '전년도 70%',
    usedDomains: [],
    englishUsed: false,
    confidenceLevel: confidenceLevel(row),
    dataQuality: dataQuality(row),
    explanation: extra?.eligibilityNote ?? reason,
    band: null,
    scienceTechReference: extra?.scienceTechReference ?? false,
  }
  return { ...base, ...extra, row, skipped: extra?.skipped ?? true }
}

function subjectDiffs(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): SubjectDiffs {
  const diffs = emptyDiffs()
  if (metrics.koreanPercentile != null && row.korean70 != null) {
    diffs.koreanDiff = metrics.koreanPercentile - row.korean70
  }
  if (metrics.mathPercentile != null && row.math70 != null) {
    diffs.mathDiff = metrics.mathPercentile - row.math70
  }
  if (metrics.inquiry1Percentile != null && row.inquiry1_70 != null) {
    diffs.inquiry1Diff = metrics.inquiry1Percentile - row.inquiry1_70
  }
  if (metrics.inquiry2Percentile != null && row.inquiry2_70 != null) {
    diffs.inquiry2Diff = metrics.inquiry2Percentile - row.inquiry2_70
  }
  const inqS = studentInquiryValue(metrics, row.inquiryRule)
  const inqC = officialInquiryCutoff(row)
  if (inqS != null && inqC != null) diffs.inquiryDiff = inqS - inqC
  if (canConvertEnglish(row) && metrics.englishGrade != null && row.english70Grade != null) {
    const s = convertEnglishGrade(row, metrics.englishGrade)
    const c = convertEnglishGrade(row, row.english70Grade)
    if (s != null && c != null) diffs.englishDiff = s - c
  }
  return diffs
}

function domainScore(
  key: DomainKey,
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): number | null {
  if (key === 'korean') return metrics.koreanPercentile
  if (key === 'math') {
    if (metrics.mathPercentile == null) return null
    return applyMathBonus(metrics.mathPercentile, metrics.mathSelection, row)
  }
  if (key === 'inquiry') return studentInquiryValue(metrics, row.inquiryRule)
  if (key === 'english') return convertEnglishGrade(row, metrics.englishGrade)
  return null
}

function cutoffDomainScore(
  key: DomainKey,
  row: RegularAdmissionMasterRow,
): number | null {
  if (key === 'korean') return row.korean70
  if (key === 'math') return row.math70
  if (key === 'inquiry') return officialInquiryCutoff(row)
  if (key === 'english') return convertEnglishGrade(row, row.english70Grade)
  return null
}

function usableDomains(row: RegularAdmissionMasterRow): DomainKey[] {
  return row.recognizedDomains.filter((d) => {
    if (d === 'english') return canConvertEnglish(row)
    return true
  })
}

function bestNAverage(
  keys: DomainKey[],
  n: number,
  scoreOf: (k: DomainKey) => number | null,
): { value: number; used: DomainKey[] } | null {
  const scored = keys
    .map((k) => {
      const v = scoreOf(k)
      return v == null ? null : { k, v }
    })
    .filter((x): x is { k: DomainKey; v: number } => x != null)
    .sort((a, b) => b.v - a.v)
  if (scored.length < n) return null
  const top = scored.slice(0, n)
  return {
    value: top.reduce((s, x) => s + x.v, 0) / n,
    used: top.map((x) => x.k),
  }
}

function studentAverageByRule(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): number | null {
  switch (row.averagePercentileRule) {
    case 'KOREAN_MATH_INQUIRY':
      return metrics.koreanMathInquiryAverage
    case 'KOREAN_MATH_INQUIRY_BEST1':
      return metrics.koreanMathInquiryBest1Average
    case 'FOUR_DOMAIN':
      return metrics.fourDomainPercentileAverage
    case 'BEST_2':
      return metrics.best2Percentile
    case 'BEST_3':
      return metrics.best3Percentile
    default:
      return metrics.koreanMathInquiryAverage
  }
}

function normalizeGap(
  student: number,
  cutoff: number,
  row: RegularAdmissionMasterRow,
): number {
  if (
    (row.resultType === 'UNIVERSITY_CONVERTED_70' ||
      row.calculationType === 'UNIVERSITY_FORMULA' ||
      row.calculationType === 'STANDARD_SCORE_WEIGHTED') &&
    row.universityConvertedMax != null &&
    row.universityConvertedMax > 0
  ) {
    return ((student - cutoff) / row.universityConvertedMax) * 100
  }
  return student - cutoff
}

function finish(
  row: RegularAdmissionMasterRow,
  metrics: StudentMetrics,
  studentValue: number,
  cutoffValue: number,
  usedDomains: string[],
  englishUsed: boolean,
  labels: { student: string; cutoff: string },
): RegularEvaluation {
  const supportGap = normalizeGap(studentValue, cutoffValue, row)
  const band = classifyByCalculationType(row.calculationType, supportGap)
  const partial: Omit<RegularEvaluation, 'explanation'> = {
    row,
    skipped: false,
    skipReason: null,
    eligibilityOk: true,
    eligibilityNote: null,
    studentValue,
    cutoffValue,
    supportGap,
    normalizedSupportScore: supportGap,
    subjectDiffs: subjectDiffs(metrics, row),
    comparisonBasis: comparisonBasisLabel(
      row.resultType,
      row.calculationType,
      hasSubjectWeights(row),
    ),
    studentValueLabel: labels.student,
    cutoffValueLabel: labels.cutoff,
    usedDomains,
    englishUsed,
    confidenceLevel: confidenceLevel(row),
    dataQuality: dataQuality(row),
    band,
    scienceTechReference: false,
  }
  return { ...partial, explanation: buildExplanation(partial) }
}

export function evaluateRegularAdmissionRow(
  row: RegularAdmissionMasterRow,
  metrics: StudentMetrics,
): RegularEvaluation {
  if (row.isScienceTech || row.calculationType === 'SCIENCE_TECH_SPECIAL') {
    if (
      row.resultType === 'NO_NUMERIC_RESULT' ||
      (row.universityConverted70 == null &&
        row.averagePercentile70 == null &&
        row.korean70 == null)
    ) {
      return skip(row, '과기특성화대 공식 숫자 합격선 없음', {
        scienceTechReference: true,
        eligibilityOk: true,
      })
    }
  }

  if (row.resultType === 'NO_NUMERIC_RESULT' || row.calculationType === 'UNSUPPORTED') {
    return skip(row, '공식 숫자 입결 또는 계산방식 없음')
  }

  if (!mathSelectionOk(metrics, row)) {
    return skip(row, '지원조건 불충족', {
      eligibilityOk: false,
      eligibilityNote: '수학 선택과목이 이 모집단위 필수 조건에 맞지 않습니다.',
    })
  }

  if (!inquiryTypeOk(metrics, row.inquiryRequiredType)) {
    const need =
      row.inquiryRequiredType === 'SCIENCE' ? '과학탐구' : '사회탐구'
    return skip(row, '지원조건 불충족', {
      eligibilityOk: false,
      eligibilityNote: `이 모집단위는 ${need} 선택이 필요합니다.`,
    })
  }

  const type = row.calculationType

  if (type === 'SIMPLE_AVERAGE') {
    if (averageDomainsMismatch(row)) {
      return skip(row, '대학 반영영역과 학생 평균 계산영역이 달라 평균백분위를 사용하지 않음')
    }
    const cutoff = row.averagePercentile70
    const student = studentAverageByRule(metrics, row)
    if (cutoff == null || student == null) {
      return skip(row, '평균백분위 비교에 필요한 공식값 또는 학생 성적 부족')
    }
    return finish(row, metrics, student, cutoff, ['국어', '수학', '탐구'], false, {
      student: '학생 평균백분위',
      cutoff: '전년도 공식 평균백분위 70%',
    })
  }

  if (type === 'WEIGHTED_PERCENTILE' || type === 'SUBJECT_COMPARISON') {
    const hasWeights =
      (row.koreanWeight ?? 0) > 0 ||
      (row.mathWeight ?? 0) > 0 ||
      (row.inquiryWeight ?? 0) > 0 ||
      (row.englishWeight ?? 0) > 0
    const parts = hasWeights
      ? weightedPercentileParts(metrics, row)
      : equalWeightSubjectParts(metrics, row)
    if (parts == null) {
      return skip(row, '과목별 70% 또는 학생 성적·반영비율 부족')
    }
    return finish(
      row,
      metrics,
      parts.student,
      parts.cutoff,
      parts.used,
      parts.used.includes('영어'),
      {
        student: '학생 환산',
        cutoff: '전년도 70%',
      },
    )
  }

  if (type === 'BEST_2' || type === 'BEST_3') {
    const n = type === 'BEST_2' ? 2 : 3
    const domains = usableDomains(row)
    let cutoff: number | null = null
    let studentBest: { value: number; used: DomainKey[] } | null = null
    if (row.resultType === 'AVERAGE_PERCENTILE_70' && row.averagePercentile70 != null) {
      cutoff = row.averagePercentile70
      studentBest = bestNAverage(domains, n, (k) => domainScore(k, metrics, row))
    } else {
      const published = domains.filter((k) => cutoffDomainScore(k, row) != null)
      const nCompare = Math.min(n, published.length)
      if (nCompare < 1) {
        return skip(row, `상위 ${n}개 영역 전년도 70% 공식값 부족`)
      }
      studentBest = bestNAverage(published, nCompare, (k) =>
        domainScore(k, metrics, row),
      )
      const cutoffBest = bestNAverage(published, nCompare, (k) =>
        cutoffDomainScore(k, row),
      )
      cutoff = cutoffBest?.value ?? null
    }
    if (studentBest == null) {
      return skip(row, `상위 ${n}개 영역 계산에 필요한 학생 성적 부족`)
    }
    if (cutoff == null) {
      return skip(row, `상위 ${n}개 영역 전년도 70% 공식값 부족`)
    }
    return finish(
      row,
      metrics,
      studentBest.value,
      cutoff,
      studentBest.used.map(domainLabel),
      studentBest.used.includes('english'),
      {
        student: `학생 상위 ${n}개 영역`,
        cutoff: '전년도 70%',
      },
    )
  }

  if (type === 'BEST_2_PLUS_INQUIRY_1') {
    const kme: DomainKey[] = ['korean', 'math', 'english'].filter((d) => {
      if (d === 'english') return canConvertEnglish(row)
      return true
    }) as DomainKey[]
    const best2 = bestNAverage(kme, 2, (k) => domainScore(k, metrics, row))
    const inq = domainScore('inquiry', metrics, row)
    if (best2 == null || inq == null) {
      return skip(row, '상위 2개 영역 + 탐구 1과목 계산에 필요한 성적 부족')
    }
    const student = (best2.value * 2 + inq) / 3
    let cutoff: number | null = null
    if (row.averagePercentile70 != null && row.resultType === 'AVERAGE_PERCENTILE_70') {
      cutoff = row.averagePercentile70
    } else {
      const cut2 = bestNAverage(kme, 2, (k) => cutoffDomainScore(k, row))
      const cutInq = cutoffDomainScore('inquiry', row)
      if (cut2 != null && cutInq != null) cutoff = (cut2.value * 2 + cutInq) / 3
    }
    if (cutoff == null) {
      return skip(row, '상위 2개 영역 + 탐구 전년도 70% 공식값 부족')
    }
    return finish(
      row,
      metrics,
      student,
      cutoff,
      [...best2.used.map(domainLabel), '탐구'],
      best2.used.includes('english'),
      { student: '학생 상위 2영역+탐구', cutoff: '전년도 70%' },
    )
  }

  if (type === 'BEST_3_PLUS_INQUIRY') {
    const kme: DomainKey[] = ['korean', 'math', 'english'].filter((d) => {
      if (d === 'english') return canConvertEnglish(row)
      return true
    }) as DomainKey[]
    const best3 = bestNAverage(kme, Math.min(3, kme.length), (k) =>
      domainScore(k, metrics, row),
    )
    const inq = domainScore('inquiry', metrics, row)
    if (best3 == null || inq == null) {
      return skip(row, '상위 3개 영역 + 탐구 계산에 필요한 성적 부족')
    }
    const student = (best3.value * best3.used.length + inq) / (best3.used.length + 1)
    let cutoff: number | null = row.averagePercentile70
    if (cutoff == null) {
      const cut3 = bestNAverage(kme, Math.min(3, kme.length), (k) =>
        cutoffDomainScore(k, row),
      )
      const cutInq = cutoffDomainScore('inquiry', row)
      if (cut3 != null && cutInq != null) {
        cutoff = (cut3.value * cut3.used.length + cutInq) / (cut3.used.length + 1)
      }
    }
    if (cutoff == null) {
      return skip(row, '상위 3개 영역 + 탐구 전년도 70% 공식값 부족')
    }
    return finish(
      row,
      metrics,
      student,
      cutoff,
      [...best3.used.map(domainLabel), '탐구'],
      best3.used.includes('english'),
      { student: '학생 상위 3영역+탐구', cutoff: '전년도 70%' },
    )
  }

  if (type === 'INQUIRY_BEST_1') {
    const student = metrics.inquiryBestPercentile
    const cutoff = officialInquiryCutoff({ ...row, inquiryRule: 'BEST_1' })
    if (student == null || cutoff == null) {
      return skip(row, '탐구 상위 1과목 비교값 부족')
    }
    return finish(row, metrics, student, cutoff, ['탐구'], false, {
      student: '학생 탐구 상위 1과목',
      cutoff: '전년도 탐구 70%',
    })
  }

  if (type === 'INQUIRY_AVERAGE_2') {
    const student = metrics.inquiryAveragePercentile
    const cutoff = officialInquiryCutoff({ ...row, inquiryRule: 'AVERAGE_2' })
    if (student == null || cutoff == null) {
      return skip(row, '탐구 2과목 평균 비교값 부족')
    }
    return finish(row, metrics, student, cutoff, ['탐구'], false, {
      student: '학생 탐구 2과목 평균',
      cutoff: '전년도 탐구 평균 70%',
    })
  }

  if (type === 'STANDARD_SCORE_WEIGHTED' || type === 'UNIVERSITY_FORMULA') {
    if (row.universityConverted70 == null) {
      return skip(row, '대학 환산점수 70% 공식값 없음')
    }
    if (!canReproduceUniversityFormula(row)) {
      return skip(row, '대학환산점수 직접 비교 불가')
    }
    const computed =
      type === 'UNIVERSITY_FORMULA'
        ? universityFormulaScore(metrics, row)
        : standardScoreWeighted(metrics, row)
    if (computed == null) {
      return skip(row, '대학 환산 계산에 필요한 표준점수 또는 환산표 부족')
    }
    return finish(
      row,
      metrics,
      computed.student,
      row.universityConverted70,
      computed.used,
      computed.used.includes('영어'),
      { student: '학생 환산', cutoff: '전년도 대학환산 70%' },
    )
  }

  return skip(row, '지원하지 않는 계산방식')
}

function domainLabel(k: DomainKey): string {
  if (k === 'korean') return '국어'
  if (k === 'math') return '수학'
  if (k === 'english') return '영어'
  return '탐구'
}

function averageDomainsMismatch(row: RegularAdmissionMasterRow): boolean {
  if ((row.englishWeight ?? 0) > 0) return true
  const specified = [
    row.koreanWeight,
    row.mathWeight,
    row.inquiryWeight,
  ].filter((w): w is number => w != null)
  if (specified.length === 0) return false
  const usedKorean = (row.koreanWeight ?? 0) > 0
  const usedMath = (row.mathWeight ?? 0) > 0
  const usedInquiry = (row.inquiryWeight ?? 0) > 0
  const rule = row.averagePercentileRule
  if (rule === 'KOREAN_MATH_INQUIRY' || rule === 'UNSPECIFIED') {
    return !(usedKorean && usedMath && usedInquiry)
  }
  if (rule === 'FOUR_DOMAIN') return true
  return false
}
