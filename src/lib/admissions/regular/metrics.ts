import type {
  RegularAdmissionStudentInput,
  StudentMetrics,
} from './types'

function numOrNull(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return v
}

function averageOf(values: Array<number | null>): number | null {
  if (values.some((v) => v == null)) return null
  const nums = values as number[]
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function maxOf(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return Math.max(...nums)
}

function topAverage(values: Array<number | null>, count: number): number | null {
  const nums = values.filter((v): v is number => v != null).sort((a, b) => b - a)
  if (nums.length < count) return null
  const top = nums.slice(0, count)
  return top.reduce((a, b) => a + b, 0) / top.length
}

export function buildStudentMetrics(
  input: RegularAdmissionStudentInput,
): StudentMetrics {
  const koreanPercentile = numOrNull(input.koreanPercentile)
  const koreanStandardScore = numOrNull(input.koreanStandardScore)
  const mathPercentile = numOrNull(input.mathPercentile)
  const mathStandardScore = numOrNull(input.mathStandardScore)
  const inquiry1Percentile = numOrNull(input.inquiry1Percentile)
  const inquiry1StandardScore = numOrNull(input.inquiry1StandardScore)
  const inquiry2Percentile = numOrNull(input.inquiry2Percentile)
  const inquiry2StandardScore = numOrNull(input.inquiry2StandardScore)

  const inquiryAveragePercentile = averageOf([
    inquiry1Percentile,
    inquiry2Percentile,
  ])
  const inquiryBestPercentile = maxOf([inquiry1Percentile, inquiry2Percentile])
  const inquiryAverageStandardScore = averageOf([
    inquiry1StandardScore,
    inquiry2StandardScore,
  ])
  const inquiryBestStandardScore = maxOf([
    inquiry1StandardScore,
    inquiry2StandardScore,
  ])

  const koreanMathInquiryAverage = averageOf([
    koreanPercentile,
    mathPercentile,
    inquiryAveragePercentile,
  ])
  const koreanMathInquiryBest1Average = averageOf([
    koreanPercentile,
    mathPercentile,
    inquiryBestPercentile,
  ])
  const fourDomainPercentileAverage = averageOf([
    koreanPercentile,
    mathPercentile,
    inquiry1Percentile,
    inquiry2Percentile,
  ])

  const domainPercentiles = [
    koreanPercentile,
    mathPercentile,
    inquiryAveragePercentile,
  ]
  const best2Percentile = topAverage(domainPercentiles, 2)
  const best3Percentile = topAverage(
    [koreanPercentile, mathPercentile, inquiry1Percentile, inquiry2Percentile],
    3,
  )

  let scienceInquiryCount = 0
  if (input.inquiry1Type === '과학탐구') scienceInquiryCount += 1
  if (input.inquiry2Type === '과학탐구') scienceInquiryCount += 1

  return {
    koreanPercentile,
    koreanStandardScore,
    mathPercentile,
    mathStandardScore,
    mathSelection: input.mathSelection,
    englishGrade: numOrNull(input.englishGrade),
    inquiry1Percentile,
    inquiry1StandardScore,
    inquiry1Type: input.inquiry1Type,
    inquiry1Name: input.inquiry1Name,
    inquiry2Percentile,
    inquiry2StandardScore,
    inquiry2Type: input.inquiry2Type,
    inquiry2Name: input.inquiry2Name,
    historyGrade: numOrNull(input.historyGrade),
    inquiryAveragePercentile,
    inquiryBestPercentile,
    inquiryAverageStandardScore,
    inquiryBestStandardScore,
    koreanMathInquiryAverage,
    koreanMathInquiryBest1Average,
    fourDomainPercentileAverage,
    best2Percentile,
    best3Percentile,
    scienceInquiryCount,
  }
}

export function hasAnyScore(metrics: StudentMetrics): boolean {
  return (
    metrics.koreanPercentile != null ||
    metrics.koreanStandardScore != null ||
    metrics.mathPercentile != null ||
    metrics.mathStandardScore != null ||
    metrics.englishGrade != null ||
    metrics.inquiry1Percentile != null ||
    metrics.inquiry1StandardScore != null ||
    metrics.inquiry2Percentile != null ||
    metrics.inquiry2StandardScore != null
  )
}
