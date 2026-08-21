/** 월간 학습진단 — 오답 원인 / 일일진단 보조 데이터 정규화 */

export const MATH_WRONG_CAUSES = ['개념 부족', '계산 실수', '문제 이해 부족'] as const

export type MathWrongCause = (typeof MATH_WRONG_CAUSES)[number]

export type WrongAnswerItem = {
  id: string
  label: string
  cause: MathWrongCause
}

export type EnglishVocabResult = '합격' | '불합격'

export type DailyLearningDiagnosis = {
  /** 레거시 문항별 오답 — UI 미사용, 기존 JSON·월간집계 호환 */
  wrongAnswerItems: WrongAnswerItem[]
  /** 수학 오류율 산출용 총 문항 수 (레거시·파생) */
  questionTotal: number
  /** 오답 분석: 개념 부족 문항 수 */
  conceptLackCount: number
  /** 오답 분석: 계산 실수 문항 수 */
  calculationErrorCount: number
  /** 오답 분석: 응용 능력 부족 문항 수 */
  applicationLackCount: number
  /** 강사 피드백 */
  teacherFeedback: string
  fridayRetestTotal: number | null
  fridayRetestWrong: number | null
  englishVocabResult: EnglishVocabResult | null
  englishGrammarWrongCount: number | null
  englishReadingWrongCount: number | null
}

export const EMPTY_DAILY_LEARNING_DIAGNOSIS: DailyLearningDiagnosis = {
  wrongAnswerItems: [],
  questionTotal: 0,
  conceptLackCount: 0,
  calculationErrorCount: 0,
  applicationLackCount: 0,
  teacherFeedback: '',
  fridayRetestTotal: null,
  fridayRetestWrong: null,
  englishVocabResult: null,
  englishGrammarWrongCount: null,
  englishReadingWrongCount: null,
}

export function isMathWrongCause(value: unknown): value is MathWrongCause {
  return (
    value === '개념 부족' || value === '계산 실수' || value === '문제 이해 부족'
  )
}

export function createWrongAnswerItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `wa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeWrongAnswerItems(raw: unknown): WrongAnswerItem[] {
  if (!Array.isArray(raw)) return []
  const items: WrongAnswerItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (!isMathWrongCause(row.cause)) continue
    const label = String(row.label ?? '').trim()
    items.push({
      id: String(row.id ?? createWrongAnswerItemId()),
      label,
      cause: row.cause,
    })
  }
  return items
}

function toNullableNonNegInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function toNonNegInt(value: unknown): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

/** 오답 분석 3항목 합계 */
export function sumWrongAnalysisCounts(diagnosis: DailyLearningDiagnosis): number {
  return (
    diagnosis.conceptLackCount +
    diagnosis.calculationErrorCount +
    diagnosis.applicationLackCount
  )
}

/** 원인별 오답 수 — 신규 count 우선, 없으면 레거시 문항 배열 */
export function getDailyWrongCountForCause(
  diagnosis: DailyLearningDiagnosis,
  cause: MathWrongCause,
): number {
  const d = normalizeDailyLearningDiagnosis(diagnosis)
  const analysisSum = sumWrongAnalysisCounts(d)
  if (analysisSum > 0) {
    if (cause === '개념 부족') return d.conceptLackCount
    if (cause === '계산 실수') return d.calculationErrorCount
    // 월간 집계의 '문제 이해 부족' ← UI '응용 능력 부족'
    if (cause === '문제 이해 부족') return d.applicationLackCount
    return 0
  }
  return d.wrongAnswerItems.filter((item) => item.cause === cause).length
}

export function getDailyQuestionTotal(diagnosis: DailyLearningDiagnosis): number {
  const d = normalizeDailyLearningDiagnosis(diagnosis)
  if (d.questionTotal > 0) return d.questionTotal
  const fromCounts = sumWrongAnalysisCounts(d)
  if (fromCounts > 0) return fromCounts
  return 0
}

export function normalizeDailyLearningDiagnosis(raw: unknown): DailyLearningDiagnosis {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_DAILY_LEARNING_DIAGNOSIS }
  }
  const row = raw as Record<string, unknown>
  const vocab = row.englishVocabResult
  const conceptLackCount = toNonNegInt(row.conceptLackCount)
  const calculationErrorCount = toNonNegInt(row.calculationErrorCount)
  const applicationLackCount = toNonNegInt(row.applicationLackCount)
  let questionTotal = toNonNegInt(row.questionTotal)
  if (questionTotal <= 0) {
    const sum = conceptLackCount + calculationErrorCount + applicationLackCount
    if (sum > 0) questionTotal = sum
  }
  return {
    wrongAnswerItems: normalizeWrongAnswerItems(row.wrongAnswerItems),
    questionTotal,
    conceptLackCount,
    calculationErrorCount,
    applicationLackCount,
    teacherFeedback: String(row.teacherFeedback ?? '').trim(),
    fridayRetestTotal: toNullableNonNegInt(row.fridayRetestTotal),
    fridayRetestWrong: toNullableNonNegInt(row.fridayRetestWrong),
    englishVocabResult: vocab === '합격' || vocab === '불합격' ? vocab : null,
    englishGrammarWrongCount: toNullableNonNegInt(row.englishGrammarWrongCount),
    englishReadingWrongCount: toNullableNonNegInt(row.englishReadingWrongCount),
  }
}

export function dailyLearningDiagnosisToJson(
  diagnosis: DailyLearningDiagnosis,
): DailyLearningDiagnosis {
  return normalizeDailyLearningDiagnosis(diagnosis)
}

export function hasDailyLearningDiagnosisContent(
  diagnosis: DailyLearningDiagnosis,
): boolean {
  const d = normalizeDailyLearningDiagnosis(diagnosis)
  if (d.wrongAnswerItems.length > 0) return true
  if (d.questionTotal > 0) return true
  if (sumWrongAnalysisCounts(d) > 0) return true
  if (d.teacherFeedback.trim()) return true
  if (d.fridayRetestTotal !== null || d.fridayRetestWrong !== null) return true
  if (d.englishVocabResult !== null) return true
  if (d.englishGrammarWrongCount !== null) return true
  if (d.englishReadingWrongCount !== null) return true
  return false
}

export function hasParentWrongAnalysisContent(diagnosis: DailyLearningDiagnosis): boolean {
  const d = normalizeDailyLearningDiagnosis(diagnosis)
  return sumWrongAnalysisCounts(d) > 0 || d.wrongAnswerItems.length > 0
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function clampScoreInt(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}
