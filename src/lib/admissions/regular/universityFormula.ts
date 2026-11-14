import type { MathSelection, RegularAdmissionMasterRow, StudentMetrics } from './types'
import { canConvertEnglish, convertEnglishGrade } from './english'
import { applyInquiryBonus, studentInquiryValue } from './inquiry'

export function mathSelectionOk(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): boolean {
  const req = row.mathRequiredSelection
  if (req === 'NONE') return true
  const sel = metrics.mathSelection
  if (!sel) return false
  if (req === 'CALCULUS_OR_GEOMETRY') return sel === '미적분' || sel === '기하'
  if (req === 'CALCULUS') return sel === '미적분'
  if (req === 'GEOMETRY') return sel === '기하'
  return true
}

export function applyMathBonus(
  mathValue: number,
  selection: MathSelection | '',
  row: RegularAdmissionMasterRow,
): number {
  const rule = row.mathBonusRule
  if (rule == null || !selection) return mathValue
  if (!rule.selections.includes(selection)) return mathValue
  if (rule.mode === 'multiply') return mathValue * rule.value
  return mathValue + rule.value
}

export type WeightedParts = {
  student: number
  cutoff: number
  weightSum: number
  used: string[]
}

/**
 * 반영비율이 있는 과목만 가중. 영어는 공식 환산표가 있을 때만 포함.
 * 공식 70%가 없는 과목은 임의 생성하지 않고 해당 과목을 제외한다.
 */
export function weightedPercentileParts(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): WeightedParts | null {
  let studentSum = 0
  let cutoffSum = 0
  let weightSum = 0
  const used: string[] = []

  const add = (
    label: string,
    student: number | null,
    cutoff: number | null,
    weight: number | null,
  ) => {
    if (weight == null || weight <= 0) return true
    if (student == null || cutoff == null) return false
    studentSum += student * weight
    cutoffSum += cutoff * weight
    weightSum += weight
    used.push(label)
    return true
  }

  if (row.koreanWeight != null && row.koreanWeight > 0) {
    if (!add('국어', metrics.koreanPercentile, row.korean70, row.koreanWeight)) {
      return null
    }
  }
  if (row.mathWeight != null && row.mathWeight > 0) {
    const mathStudent =
      metrics.mathPercentile == null
        ? null
        : applyMathBonus(metrics.mathPercentile, metrics.mathSelection, row)
    if (!add('수학', mathStudent, row.math70, row.mathWeight)) return null
  }
  if (row.inquiryWeight != null && row.inquiryWeight > 0) {
    const inqStudent = studentInquiryValue(metrics, row.inquiryRule, 'percentile')
    const inqCutoff =
      row.inquiryAverage70 != null
        ? row.inquiryAverage70
        : row.inquiryRule === 'BEST_1' || row.inquiryRule === 'ONE'
          ? row.inquiry1_70 != null && row.inquiry2_70 != null
            ? Math.max(row.inquiry1_70, row.inquiry2_70)
            : (row.inquiry1_70 ?? row.inquiry2_70)
          : row.inquiry1_70 != null && row.inquiry2_70 != null
            ? (row.inquiry1_70 + row.inquiry2_70) / 2
            : null
    const bonused =
      inqStudent == null ? null : applyInquiryBonus(inqStudent, metrics, row)
    if (!add('탐구', bonused, inqCutoff, row.inquiryWeight)) return null
  }
  if (row.englishWeight != null && row.englishWeight > 0) {
    const studentEng = convertEnglishGrade(row, metrics.englishGrade)
    const cutoffEng = convertEnglishGrade(row, row.english70Grade)
    if (studentEng != null && cutoffEng != null) {
      studentSum += studentEng * row.englishWeight
      cutoffSum += cutoffEng * row.englishWeight
      weightSum += row.englishWeight
      used.push('영어')
    }
  }

  if (weightSum <= 0) return null
  return {
    student: studentSum / weightSum,
    cutoff: cutoffSum / weightSum,
    weightSum,
    used,
  }
}

/** 반영비율이 없을 때 공식 70%가 있는 과목만 동일 비중으로 비교. 없는 과목 70%는 만들지 않는다. */
export function equalWeightSubjectParts(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): WeightedParts | null {
  return weightedPercentileParts(
    metrics,
    {
      ...row,
      koreanWeight: row.korean70 != null ? 1 : null,
      mathWeight: row.math70 != null ? 1 : null,
      inquiryWeight:
        row.inquiryAverage70 != null ||
        row.inquiry1_70 != null ||
        row.inquiry2_70 != null
          ? 1
          : null,
      englishWeight: null,
    },
  )
}

export function standardScoreWeighted(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): { student: number; used: string[] } | null {
  let sum = 0
  let weightSum = 0
  const used: string[] = []

  const add = (label: string, value: number | null, weight: number | null) => {
    if (weight == null || weight <= 0) return true
    if (value == null) return false
    sum += value * weight
    weightSum += weight
    used.push(label)
    return true
  }

  if (!add('국어', metrics.koreanStandardScore, row.koreanWeight)) return null
  const mathSs =
    metrics.mathStandardScore == null
      ? null
      : applyMathBonus(metrics.mathStandardScore, metrics.mathSelection, row)
  if (!add('수학', mathSs, row.mathWeight)) return null
  const inq = studentInquiryValue(metrics, row.inquiryRule, 'standardScore')
  const inqB = inq == null ? null : applyInquiryBonus(inq, metrics, row)
  if (!add('탐구', inqB, row.inquiryWeight)) return null
  if (row.englishWeight != null && row.englishWeight > 0) {
    const eng = convertEnglishGrade(row, metrics.englishGrade)
    if (eng != null) {
      sum += eng * row.englishWeight
      weightSum += row.englishWeight
      used.push('영어')
    }
  }
  if (weightSum <= 0) return null
  return { student: sum / weightSum, used }
}

export function universityFormulaScore(
  metrics: StudentMetrics,
  row: RegularAdmissionMasterRow,
): { student: number; used: string[] } | null {
  return standardScoreWeighted(metrics, row)
}

/** 공식 환산공식을 코드로 완전히 재현할 수 있을 때만 true. */
export function canReproduceUniversityFormula(row: RegularAdmissionMasterRow): boolean {
  const hasWeights =
    (row.koreanWeight ?? 0) > 0 ||
    (row.mathWeight ?? 0) > 0 ||
    (row.inquiryWeight ?? 0) > 0 ||
    (row.englishWeight ?? 0) > 0
  if (!hasWeights) return false
  if ((row.englishWeight ?? 0) > 0 && !canConvertEnglish(row)) return false
  return true
}
