import type { DifficultyBreakdown, MonthlyEvaluationRecord } from '../types/records'

export const TEACHER_COMMENT_MAX_LENGTH = 1000

export const EMPTY_DIFFICULTY_BREAKDOWN: DifficultyBreakdown = {
  highest: 0,
  high: 0,
  middle: 0,
  basic: 0,
}

export function normalizeDifficultyBreakdown(
  raw?: Partial<DifficultyBreakdown> | null,
): DifficultyBreakdown {
  if (!raw) return { ...EMPTY_DIFFICULTY_BREAKDOWN }
  return {
    highest: Math.max(0, Math.floor(Number(raw.highest ?? 0))),
    high: Math.max(0, Math.floor(Number(raw.high ?? 0))),
    middle: Math.max(0, Math.floor(Number(raw.middle ?? 0))),
    basic: Math.max(0, Math.floor(Number(raw.basic ?? 0))),
  }
}

export function getDifficultyTotal(breakdown: DifficultyBreakdown): number {
  return breakdown.highest + breakdown.high + breakdown.middle + breakdown.basic
}

export function normalizeMonthlyEvaluationRecord(
  record: MonthlyEvaluationRecord,
): MonthlyEvaluationRecord {
  return {
    ...record,
    difficultyBreakdown: normalizeDifficultyBreakdown(record.difficultyBreakdown),
    teacherComment: trimComment(record.teacherComment),
    strengths: trimComment(record.strengths),
    improvements: trimComment(record.improvements),
  }
}

export function trimComment(value: string): string {
  return value.trim()
}

export type MonthlyEvaluationFormData = {
  id?: string
  studentId: string
  evaluationDate: string
  year: number
  month: number
  subject: string
  score: number
  totalScore: number
  difficultyBreakdown: DifficultyBreakdown
  teacherComment: string
  strengths: string
  improvements: string
}

export function emptyMonthlyEvaluationForm(): MonthlyEvaluationFormData {
  const now = new Date()
  return {
    studentId: '',
    evaluationDate: now.toISOString().slice(0, 10),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    subject: '수학',
    score: 0,
    totalScore: 100,
    difficultyBreakdown: { ...EMPTY_DIFFICULTY_BREAKDOWN },
    teacherComment: '',
    strengths: '',
    improvements: '',
  }
}

export function monthlyEvaluationRecordToForm(
  record: MonthlyEvaluationRecord,
): MonthlyEvaluationFormData {
  const normalized = normalizeMonthlyEvaluationRecord(record)
  return {
    id: normalized.id,
    studentId: normalized.studentId,
    evaluationDate: normalized.evaluationDate,
    year: normalized.year,
    month: normalized.month,
    subject: normalized.subject,
    score: normalized.score,
    totalScore: normalized.totalScore,
    difficultyBreakdown: normalized.difficultyBreakdown,
    teacherComment: normalized.teacherComment,
    strengths: normalized.strengths,
    improvements: normalized.improvements,
  }
}

export function monthlyEvaluationFormToSavePayload(
  form: MonthlyEvaluationFormData,
): Omit<MonthlyEvaluationRecord, 'id' | 'createdAt' | 'updatedAt' | 'percentage'> & {
  id?: string
} {
  return {
    id: form.id,
    studentId: form.studentId,
    evaluationDate: form.evaluationDate,
    year: form.year,
    month: form.month,
    subject: form.subject,
    score: form.score,
    totalScore: form.totalScore,
    difficultyBreakdown: normalizeDifficultyBreakdown(form.difficultyBreakdown),
    teacherComment: trimComment(form.teacherComment),
    strengths: trimComment(form.strengths),
    improvements: trimComment(form.improvements),
  }
}

export function sortMonthlyEvaluationsAsc(
  records: MonthlyEvaluationRecord[],
): MonthlyEvaluationRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime(),
  )
}

export function sortMonthlyEvaluationsDesc(
  records: MonthlyEvaluationRecord[],
): MonthlyEvaluationRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime(),
  )
}

export function getQuestionCountMismatchMessage(
  breakdown: DifficultyBreakdown,
  totalScore: number,
): string | null {
  const total = getDifficultyTotal(breakdown)
  if (total === 0) return null
  if (total !== totalScore) {
    return `난이도별 문항 수 합계(${total}문제)와 만점(${totalScore}점)이 다릅니다.`
  }
  return null
}

export const Y_AXIS_PERCENT_TICKS = Array.from({ length: 21 }, (_, index) => index * 5)

export type FixedMonthChartPoint = {
  month: number
  monthLabel: string
  percentage: number | null
  score: number | null
  totalScore: number | null
  evaluationDate: string | null
  subject: string | null
  hasRecord: boolean
}

export function getRecordYearMonth(record: MonthlyEvaluationRecord): {
  year: number
  month: number
} {
  if (record.year && record.month) {
    return { year: record.year, month: record.month }
  }
  const date = new Date(record.evaluationDate)
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }
}

export function getAvailableChartYears(records: MonthlyEvaluationRecord[]): number[] {
  const years = new Set(records.map((record) => getRecordYearMonth(record).year))
  return Array.from(years).sort((a, b) => b - a)
}

export function getDefaultChartYear(records: MonthlyEvaluationRecord[]): number {
  if (records.length === 0) return new Date().getFullYear()
  const latest = sortMonthlyEvaluationsDesc(records)[0]
  if (!latest) return new Date().getFullYear()
  return getRecordYearMonth(latest).year
}

export function buildFixedMonthlyChartData(
  records: MonthlyEvaluationRecord[],
  selectedYear: number,
  subject?: string,
): FixedMonthChartPoint[] {
  const filtered = records.filter((record) => !subject || record.subject === subject)

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const record = filtered.find((item) => {
      const { year, month: recordMonth } = getRecordYearMonth(item)
      return year === selectedYear && recordMonth === month
    })

    return {
      month,
      monthLabel: `${month}월`,
      percentage: record ? record.percentage : null,
      score: record?.score ?? null,
      totalScore: record?.totalScore ?? null,
      evaluationDate: record?.evaluationDate ?? null,
      subject: record?.subject ?? null,
      hasRecord: !!record,
    }
  })
}
