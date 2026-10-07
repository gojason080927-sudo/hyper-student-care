/**
 * 수학 월말평가 결과 보고서 — 타입 · 계산 · 규칙 기반 추천 (AI 미사용)
 * 모든 문항은 맞힘/틀림으로만 처리한다 (부분 점수 없음).
 */
import type { MonthlyEvaluationRecord } from '../types/records'

export type MathDifficulty = 'basic' | 'middle' | 'high' | 'highest'
export const MATH_DIFFICULTIES: MathDifficulty[] = ['basic', 'middle', 'high', 'highest']
export const MATH_DIFFICULTY_LABEL: Record<MathDifficulty, string> = {
  basic: '기본',
  middle: '중',
  high: '상',
  highest: '최상',
}

export type MathCause = 'calc' | 'concept' | 'reading' | 'time'
export const MATH_CAUSES: MathCause[] = ['calc', 'concept', 'reading', 'time']
export const MATH_CAUSE_LABEL: Record<MathCause, string> = {
  calc: '계산 실수',
  concept: '개념 이해 부족',
  reading: '문제 해석',
  time: '시간 부족',
}
export const MATH_CAUSE_COLOR: Record<MathCause, string> = {
  calc: '#5B348A',
  concept: '#B794E0',
  reading: '#E0A43A',
  time: '#A79FB3',
}

export type MathExamItem = { no: number; points: number; difficulty: MathDifficulty }
export type MathExamUnit = { name: string; from: number; to: number }
export type MathWrongItem = { no: number; cause: MathCause | ''; unit?: string; type?: string; note?: string }
export type MathPlanLine = { content: string; goal: string }

export const MATH_PLAN_MAX_LINES = 5

export type MathMonthlyExam = {
  id: string
  grade: string
  className: string
  examDate: string
  year: number
  month: number
  title: string
  teacherName: string
  questionCount: number
  items: MathExamItem[]
  units: MathExamUnit[]
}

export type MathMonthlyResult = {
  score: number
  wrongItems: MathWrongItem[]
  strengths: string
  improvements: string
  teacherComment: string
  nextPlan: MathPlanLine[]
}

/** 서버(RPC)가 계산해서 보내는 반 평균 집계. 응시자 3명 미만이면 null. */
export type MathClassAvg = {
  n: number
  avgScore: number
  totalScore: number
  unitRates: { name: string; rate: number | null }[]
  difficultyRates: { difficulty: MathDifficulty; rate: number | null }[]
}

export type MathMonthlyReportData = {
  exam: MathMonthlyExam
  result: MathMonthlyResult
  classAvg: MathClassAvg | null
}

export const MATH_CLASS_AVG_MIN_N = 3
export const STRENGTH_GAP = 5
export const STRENGTH_RATE = 80
export const WEAK_RATE = 60

// ─── 시험 설정 ───────────────────────────────────────────────

export function buildDefaultItems(count: number, points: number): MathExamItem[] {
  return Array.from({ length: count }, (_, i) => ({ no: i + 1, points, difficulty: 'middle' as MathDifficulty }))
}

export function resizeItems(items: MathExamItem[], count: number, defaultPoints: number): MathExamItem[] {
  if (count <= items.length) return items.slice(0, count)
  return [
    ...items,
    ...Array.from({ length: count - items.length }, (_, i) => ({
      no: items.length + i + 1,
      points: defaultPoints,
      difficulty: 'middle' as MathDifficulty,
    })),
  ]
}

export function totalPoints(items: MathExamItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.points, 0))
}

export function calcScore(items: MathExamItem[], wrongNos: number[]): number {
  const wrong = new Set(wrongNos)
  return Math.round(items.reduce((sum, item) => (wrong.has(item.no) ? sum : sum + item.points), 0))
}

export function validateExamSetup(input: {
  className: string
  examDate: string
  title: string
  items: MathExamItem[]
  units: MathExamUnit[]
}): string[] {
  const errors: string[] = []
  if (!input.className) errors.push('반을 선택해 주세요.')
  if (!input.examDate) errors.push('평가일을 입력해 주세요.')
  if (!input.title.trim()) errors.push('시험명을 입력해 주세요.')
  if (input.items.length < 1) errors.push('문항 수를 입력해 주세요.')
  if (input.items.some((item) => !(item.points > 0))) errors.push('모든 문항에 배점(1 이상)을 입력해 주세요.')
  const max = input.items.length
  const covered = new Set<number>()
  for (const unit of input.units) {
    if (!unit.name.trim()) {
      errors.push('단원 이름을 입력해 주세요.')
      continue
    }
    if (unit.from < 1 || unit.to > max || unit.from > unit.to) {
      errors.push(`단원 "${unit.name}"의 문항 구간이 올바르지 않습니다.`)
      continue
    }
    for (let n = unit.from; n <= unit.to; n += 1) {
      if (covered.has(n)) {
        errors.push(`${n}번 문항이 여러 단원에 겹칩니다.`)
        break
      }
      covered.add(n)
    }
  }
  if (input.units.length === 0) errors.push('단원 구간을 1개 이상 입력해 주세요.')
  else if (covered.size !== max && errors.length === 0) errors.push('모든 문항이 단원 구간에 포함되어야 합니다.')
  return errors
}

// ─── 학생 결과 통계 ─────────────────────────────────────────

export type UnitStat = {
  name: string
  from: number
  to: number
  correct: number
  total: number
  rate: number
}

export function unitStats(exam: Pick<MathMonthlyExam, 'items' | 'units'>, wrongNos: number[]): UnitStat[] {
  const wrong = new Set(wrongNos)
  return exam.units.map((unit) => {
    const inRange = exam.items.filter((item) => item.no >= unit.from && item.no <= unit.to)
    const correct = inRange.filter((item) => !wrong.has(item.no)).length
    const total = inRange.length
    return { ...unit, correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 }
  })
}

export type DifficultyStat = { difficulty: MathDifficulty; correct: number; total: number; rate: number }

export function difficultyStats(exam: Pick<MathMonthlyExam, 'items'>, wrongNos: number[]): DifficultyStat[] {
  const wrong = new Set(wrongNos)
  return MATH_DIFFICULTIES.map((difficulty) => {
    const inGroup = exam.items.filter((item) => item.difficulty === difficulty)
    const correct = inGroup.filter((item) => !wrong.has(item.no)).length
    const total = inGroup.length
    return { difficulty, correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 }
  }).filter((stat) => stat.total > 0)
}

export function causeCounts(wrongItems: MathWrongItem[]): Record<MathCause, number> {
  const counts: Record<MathCause, number> = { calc: 0, concept: 0, reading: 0, time: 0 }
  for (const item of wrongItems) {
    if (item.cause) counts[item.cause] += 1
  }
  return counts
}

export type Diagnosis = 'strength' | 'normal' | 'weak'
export const DIAGNOSIS_LABEL: Record<Diagnosis, string> = { strength: '강점', normal: '보통', weak: '보강' }

/** 반 평균이 있으면 반 평균 대비 ±5%p, 없으면(응시 3명 미만) 정답률 80% 이상/60% 미만 */
export function diagnose(rate: number, classRate: number | null | undefined): Diagnosis {
  if (classRate !== null && classRate !== undefined) {
    const gap = rate - classRate
    if (gap >= STRENGTH_GAP) return 'strength'
    if (gap <= -STRENGTH_GAP) return 'weak'
    return 'normal'
  }
  if (rate >= STRENGTH_RATE) return 'strength'
  if (rate < WEAK_RATE) return 'weak'
  return 'normal'
}

export type OverallGrade = { label: string; stars: number }

export function overallGrade(percentage: number): OverallGrade {
  if (percentage >= 90) return { label: '매우 우수', stars: 5 }
  if (percentage >= 80) return { label: '우수', stars: 4 }
  if (percentage >= 70) return { label: '양호', stars: 3 }
  return { label: '노력 필요', stars: 2 }
}

export function percentOf(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 1000) / 10 : 0
}

// ─── 규칙 기반 추천 (강사가 고칠 수 있는 초안) ─────────────────

export function recommendPlan(
  exam: Pick<MathMonthlyExam, 'items' | 'units'>,
  wrongItems: MathWrongItem[],
): MathPlanLine[] {
  const wrongNos = wrongItems.map((w) => w.no)
  const lines: MathPlanLine[] = []

  const weakUnits = unitStats(exam, wrongNos)
    .filter((u) => u.total > 0 && u.rate < 100)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 2)
  for (const unit of weakUnits) {
    const target = Math.min(100, Math.max(80, Math.ceil((unit.rate + 20) / 10) * 10))
    lines.push({
      content: `${unit.name} 단원 개념 재정리 + 틀린 유형 다시 풀기 (주 2회)`,
      goal: `단원 정답률 ${target}%`,
    })
  }

  const weakDifficulty = difficultyStats(exam, wrongNos)
    .filter((d) => (d.difficulty === 'high' || d.difficulty === 'highest') && d.rate < 70)
    .sort((a, b) => a.rate - b.rate)[0]
  if (weakDifficulty) {
    lines.push({
      content: `${MATH_DIFFICULTY_LABEL[weakDifficulty.difficulty]} 난이도 문항 주 3문제, 풀이 과정 점검`,
      goal: `${MATH_DIFFICULTY_LABEL[weakDifficulty.difficulty]} 문항 ${Math.min(100, weakDifficulty.rate + 20)}%`,
    })
  }

  const counts = causeCounts(wrongItems)
  const topCause = MATH_CAUSES.filter((c) => counts[c] > 0).sort((a, b) => counts[b] - counts[a])[0]
  if (topCause === 'calc') {
    lines.push({ content: '풀이를 끝까지 쓰고 검산하는 습관 들이기', goal: '계산 실수 절반 줄이기' })
  } else if (topCause === 'concept') {
    lines.push({ content: '교재 개념 정리 노트 작성 후 확인 테스트', goal: '확인 테스트 통과' })
  } else if (topCause === 'reading') {
    lines.push({ content: '문제 조건에 밑줄 치고 구하는 것 표시하며 읽기', goal: '해석 오답 0문항' })
  } else if (topCause === 'time') {
    lines.push({ content: '시간 배분 연습: 모르는 문항은 표시 후 넘어가기', goal: '끝까지 풀이 완료' })
  }

  if (wrongItems.length > 0) {
    lines.push({ content: '오답 노트 매주 제출 → 재시험', goal: '재시험 통과 90%' })
  }
  return lines.slice(0, MATH_PLAN_MAX_LINES)
}

export function recommendComments(
  exam: Pick<MathMonthlyExam, 'items' | 'units'>,
  wrongItems: MathWrongItem[],
): { strengths: string; improvements: string } {
  const wrongNos = wrongItems.map((w) => w.no)
  const units = unitStats(exam, wrongNos).filter((u) => u.total > 0)
  const counts = causeCounts(wrongItems)
  const topCause = MATH_CAUSES.filter((c) => counts[c] > 0).sort((a, b) => counts[b] - counts[a])[0]
  const insight = unitInsight(units.map((u) => ({ ...u, diagnosis: diagnose(u.rate, null) })))

  // 강점·보강은 보고서 표의 진단과 같은 기준(반 평균이 없는 초안 단계이므로 정답률 80% 이상 / 60% 미만)
  let strengths = ''
  if (insight.strength) {
    strengths = `${insight.strength.name} 단원에서 ${insight.strength.total}문항 중 ${insight.strength.correct}문항을 맞혔습니다(정답률 ${insight.strength.rate}%).`
  } else if (insight.highest) {
    strengths = `가장 높은 단원: ${insight.highest.name} ${insight.highest.rate}%`
  }
  let improvements = ''
  if (insight.weak) {
    improvements = `${insight.weak.name} 단원의 정답률이 ${insight.weak.rate}%로 보강이 필요합니다.`
    if (topCause) improvements += ` 오답 원인은 ${MATH_CAUSE_LABEL[topCause]}이 가장 많았습니다.`
  } else if (insight.lowest) {
    improvements = `가장 낮은 단원: ${insight.lowest.name} ${insight.lowest.rate}%`
  }
  return { strengths, improvements }
}

// ─── 결과 → 보고서 모델 ─────────────────────────────────────

export type MathReportView = {
  total: number
  score: number
  percentage: number
  correctCount: number
  grade: OverallGrade
  units: (UnitStat & { classRate: number | null; diff: number | null; diagnosis: Diagnosis })[]
  difficulties: (DifficultyStat & { classRate: number | null })[]
  causes: Record<MathCause, number>
  wrongNos: Set<number>
  classAvg: MathClassAvg | null
}

export function buildReportView(data: MathMonthlyReportData): MathReportView {
  const { exam, result, classAvg } = data
  const total = totalPoints(exam.items)
  const wrongNos = result.wrongItems.map((w) => w.no)
  const score = calcScore(exam.items, wrongNos)
  const percentage = percentOf(score, total)

  const units = unitStats(exam, wrongNos).map((u) => {
    const classRate = classAvg?.unitRates.find((r) => r.name === u.name)?.rate ?? null
    return {
      ...u,
      classRate,
      diff: classRate === null ? null : Math.round(u.rate - classRate),
      diagnosis: diagnose(u.rate, classRate),
    }
  })
  const difficulties = difficultyStats(exam, wrongNos).map((d) => ({
    ...d,
    classRate: classAvg?.difficultyRates.find((r) => r.difficulty === d.difficulty)?.rate ?? null,
  }))

  return {
    total,
    score,
    percentage,
    correctCount: exam.items.length - wrongNos.length,
    grade: overallGrade(percentage),
    units,
    difficulties,
    causes: causeCounts(result.wrongItems),
    wrongNos: new Set(wrongNos),
    classAvg,
  }
}

// ─── 성적 추이 / 월별 기록 (monthly_evaluations 수학 기록 + 반 평균) ───

export type MathTrendPoint = {
  year: number
  month: number
  label: string
  percentage: number
  score: number
  totalScore: number
  classPercentage: number | null
}

/** selected 월까지 최근 6개월(기록이 있는 달만). 수학 기록만 사용한다. */
export function buildMathTrend(
  evaluations: MonthlyEvaluationRecord[],
  reports: MathMonthlyReportData[],
  selected: { year: number; month: number },
): MathTrendPoint[] {
  const key = (y: number, m: number) => y * 12 + m
  const selectedKey = key(selected.year, selected.month)
  const avgByMonth = new Map<number, number>()
  for (const report of reports) {
    if (report.classAvg && report.classAvg.totalScore > 0) {
      avgByMonth.set(
        key(report.exam.year, report.exam.month),
        percentOf(report.classAvg.avgScore, report.classAvg.totalScore),
      )
    }
  }
  return evaluations
    .filter((e) => e.subject === '수학' && key(e.year, e.month) <= selectedKey && key(e.year, e.month) > selectedKey - 6)
    .sort((a, b) => key(a.year, a.month) - key(b.year, b.month))
    .map((e) => ({
      year: e.year,
      month: e.month,
      label: `${e.month}월`,
      percentage: e.percentage,
      score: e.score,
      totalScore: e.totalScore,
      classPercentage: avgByMonth.get(key(e.year, e.month)) ?? null,
    }))
}

export function previousMonthPoint(trend: MathTrendPoint[], selected: { year: number; month: number }) {
  const prev = selected.month === 1 ? { year: selected.year - 1, month: 12 } : { year: selected.year, month: selected.month - 1 }
  return trend.find((p) => p.year === prev.year && p.month === prev.month) ?? null
}

type DiagnosedUnit = { name: string; rate: number; diagnosis: Diagnosis }

/** 표의 진단과 같은 값으로 강점·보강 단원을 고른다. 없으면 가장 높은/낮은 단원을 따로 돌려준다. */
export function unitInsight<T extends DiagnosedUnit>(units: T[]) {
  const byRateDesc = [...units].sort((a, b) => b.rate - a.rate)
  const strength = byRateDesc.find((u) => u.diagnosis === 'strength') ?? null
  const weak = [...byRateDesc].reverse().find((u) => u.diagnosis === 'weak') ?? null
  return {
    strength,
    weak,
    highest: byRateDesc[0] ?? null,
    lowest: byRateDesc[byRateDesc.length - 1] ?? null,
  }
}

export function buildSummaryText(view: MathReportView, trend: MathTrendPoint[], examMonth: number): string {
  const parts: string[] = []
  const first = trend[0]
  const current = trend[trend.length - 1]
  if (first && current && trend.length >= 2) {
    const gap = Math.round(current.percentage - first.percentage)
    if (gap > 0) parts.push(`${first.month}월보다 ${gap}점 올랐습니다.`)
    else if (gap < 0) parts.push(`${first.month}월보다 ${Math.abs(gap)}점 내려갔습니다.`)
  }
  if (view.classAvg) {
    const diff = view.score - view.classAvg.avgScore
    parts.push(diff >= 0 ? '반 평균 이상입니다.' : '반 평균보다 낮습니다.')
  }
  const { weak, lowest } = unitInsight(view.units)
  if (weak) parts.push(`${weak.name} 보강이 다음 목표입니다.`)
  else if (lowest) parts.push(`가장 낮은 단원은 ${lowest.name}(${lowest.rate}%)입니다.`)
  else if (parts.length === 0) parts.push(`${examMonth}월 평가를 안정적으로 마쳤습니다.`)
  return parts.join(' ')
}

// ─── DB 행 변환 ─────────────────────────────────────────────

type Json = Record<string, unknown>

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || fallback)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : [])

export function examFromRow(row: Json): MathMonthlyExam {
  return {
    id: str(row.id),
    grade: str(row.grade),
    className: str(row.class_name),
    examDate: str(row.exam_date),
    year: num(row.year),
    month: num(row.month),
    title: str(row.title),
    teacherName: str(row.teacher_name),
    questionCount: num(row.question_count),
    items: arr(row.items).map((i) => ({
      no: num(i.no),
      points: num(i.points),
      difficulty: (MATH_DIFFICULTIES.includes(i.difficulty as MathDifficulty) ? i.difficulty : 'middle') as MathDifficulty,
    })),
    units: arr(row.units).map((u) => ({ name: str(u.name), from: num(u.from), to: num(u.to) })),
  }
}

export function resultFromRow(row: Json): MathMonthlyResult {
  return {
    score: num(row.score),
    wrongItems: arr(row.wrong_items).map((w) => ({
      no: num(w.no),
      cause: (MATH_CAUSES.includes(w.cause as MathCause) ? w.cause : '') as MathCause | '',
      unit: str(w.unit),
      type: str(w.type),
      note: str(w.note),
    })),
    strengths: str(row.strengths),
    improvements: str(row.improvements),
    teacherComment: str(row.teacher_comment),
    nextPlan: arr(row.next_plan).map((p) => ({ content: str(p.content), goal: str(p.goal) })),
  }
}

export function classAvgFromRow(row: unknown): MathClassAvg | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Json
  const n = num(r.n)
  if (n < MATH_CLASS_AVG_MIN_N) return null
  return {
    n,
    avgScore: num(r.avg_score),
    totalScore: num(r.total_score),
    unitRates: arr(r.unit_rates).map((u) => ({
      name: str(u.name),
      rate: u.rate === null || u.rate === undefined ? null : num(u.rate),
    })),
    difficultyRates: arr(r.difficulty_rates).map((d) => ({
      difficulty: d.difficulty as MathDifficulty,
      rate: d.rate === null || d.rate === undefined ? null : num(d.rate),
    })),
  }
}

export function reportsFromRpc(payload: unknown): MathMonthlyReportData[] {
  if (!Array.isArray(payload)) return []
  return (payload as Json[]).map((row) => ({
    exam: examFromRow((row.exam ?? {}) as Json),
    result: resultFromRow((row.result ?? {}) as Json),
    classAvg: classAvgFromRow(row.class_avg),
  }))
}

/** "1~5 다항식의 연산" 같은 줄 여러 개 → 단원 구간 목록. 형식이 맞지 않는 줄은 bad 에 모은다. */
export function parseUnitLines(text: string): { units: MathExamUnit[]; bad: string[] } {
  const units: MathExamUnit[] = []
  const bad: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = /^(\d{1,3})\s*(?:번)?\s*(?:[~\-–—]|부터)\s*(\d{1,3})\s*(?:번)?\s*[\s:,.)\]]*(.+)$/.exec(line)
    if (!m || !m[3].trim()) {
      bad.push(line)
      continue
    }
    units.push({ name: m[3].trim(), from: Number(m[1]), to: Number(m[2]) })
  }
  return { units, bad }
}
