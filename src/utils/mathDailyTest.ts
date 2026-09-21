import type { DailyLearningDiagnosisData, DailyTestRecord, TestSessionResult } from '../types/records'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  normalizeDailyLearningDiagnosis,
} from './learningDiagnosis'
import {
  highRecoveryWeeklyFacts,
  isMiddleSchoolGrade,
  usesHighRecoveryMathDailyTest,
} from './mathHighRecovery'

export const MATH_DAILY_TEST_FORMAT_FIXED_WRONG = 'fixed-wrong-v1' as const

export type MathDailyTestFormat = typeof MATH_DAILY_TEST_FORMAT_FIXED_WRONG

export const MATH_FIXED_WRONG_PASS_SCORE = 80

export const MATH_FIXED_WRONG_SESSIONS = [1, 2, 3, 4] as const

export type MathFixedWrongSession = (typeof MATH_FIXED_WRONG_SESSIONS)[number]

export type MathFixedWrongDrafts = Record<MathFixedWrongSession, string>

export function isMathSubject(subject: string | null | undefined): boolean {
  return (subject ?? '').includes('수학')
}

export function mathSessionQuestionCount(session: MathFixedWrongSession): 10 | 5 {
  return session === 1 ? 10 : 5
}

export function emptyMathFixedWrongDrafts(): MathFixedWrongDrafts {
  return { 1: '', 2: '', 3: '', 4: '' }
}

export function parseMathWrongCountDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  if (!/^\d{1,2}$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

export function mathFixedWrongScore(totalQuestions: number, incorrectCount: number): number {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return 0
  const wrong = Math.max(0, Math.floor(incorrectCount))
  return Math.round(((totalQuestions - wrong) / totalQuestions) * 100)
}

export function mathFixedWrongStatus(
  score: number,
): Exclude<TestSessionResult['status'], '미응시'> {
  return score >= MATH_FIXED_WRONG_PASS_SCORE ? '합격' : '불합격'
}

export function isValidMathWrongCount(session: MathFixedWrongSession, count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= mathSessionQuestionCount(session)
}

export function validateMathWrongCountDraft(
  session: MathFixedWrongSession,
  raw: string,
): string | null {
  const parsed = parseMathWrongCountDraft(raw)
  if (parsed == null) {
    return raw.trim() === '' ? null : `${session}차시 오답 개수를 확인해 주세요.`
  }
  if (!isValidMathWrongCount(session, parsed)) {
    return `${session}차시 오답은 0~${mathSessionQuestionCount(session)}개만 입력할 수 있습니다.`
  }
  return null
}

export function validateMathFixedWrongDrafts(drafts: MathFixedWrongDrafts): string | null {
  let previous: ReturnType<typeof sessionPreviewFromDraft> | null = null
  for (const session of MATH_FIXED_WRONG_SESSIONS) {
    const raw = drafts[session] ?? ''
    const fieldError = validateMathWrongCountDraft(session, raw)
    if (fieldError) return fieldError
    const parsed = parseMathWrongCountDraft(raw)
    if (parsed == null) {
      previous = null
      continue
    }
    if (session > 1) {
      if (!previous || previous.status !== '불합격') {
        return `${session}차시는 이전 차시가 불합격일 때만 입력할 수 있습니다.`
      }
    }
    previous = sessionPreviewFromDraft(session, raw)
  }
  return null
}

export function isLegacyMathDailyTestRecord(record: DailyTestRecord): boolean {
  if (!isMathSubject(record.subject)) return false
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  if (
    diagnosis.mathDailyTestFormat === MATH_DAILY_TEST_FORMAT_FIXED_WRONG ||
    diagnosis.mathDailyTestFormat === 'high-recovery-v1'
  ) {
    return false
  }
  const sessions = Array.isArray(record.sessionResults) ? record.sessionResults : []
  if (sessions.some((session) => session.status && session.status !== '미응시')) {
    return true
  }
  return Number(record.score) > 0 || Number(record.percentage) > 0
}

export function usesFixedWrongMathDailyTest(record: DailyTestRecord): boolean {
  if (!isMathSubject(record.subject)) return false
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  return diagnosis.mathDailyTestFormat === MATH_DAILY_TEST_FORMAT_FIXED_WRONG
}

export function shouldUseFixedWrongMathInput(
  subject: string,
  record?: DailyTestRecord | null,
  grade?: string | null,
): boolean {
  if (!isMathSubject(subject)) return false
  if (record) {
    if (usesHighRecoveryMathDailyTest(record)) return false
    const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
    if (diagnosis.mathDailyTestFormat === MATH_DAILY_TEST_FORMAT_FIXED_WRONG) return true
    return !isLegacyMathDailyTestRecord(record) && isMiddleSchoolGrade(grade)
  }
  return isMiddleSchoolGrade(grade)
}

export function applyFixedWrongFormatToDiagnosis(
  diagnosis: DailyLearningDiagnosisData | null | undefined,
): DailyLearningDiagnosisData {
  return {
    ...normalizeDailyLearningDiagnosis(diagnosis ?? EMPTY_DAILY_LEARNING_DIAGNOSIS),
    mathDailyTestFormat: MATH_DAILY_TEST_FORMAT_FIXED_WRONG,
    mathHighFirstWrongCount: null,
    mathHighEndSession: null,
    mathHighSession3Questions: null,
    mathHighSession4Questions: null,
  }
}

export function sessionPreviewFromDraft(
  session: MathFixedWrongSession,
  raw: string,
): { score: number; status: Exclude<TestSessionResult['status'], '미응시'> } | null {
  const parsed = parseMathWrongCountDraft(raw)
  if (parsed == null || !isValidMathWrongCount(session, parsed)) return null
  const score = mathFixedWrongScore(mathSessionQuestionCount(session), parsed)
  return { score, status: mathFixedWrongStatus(score) }
}

export function maxEnabledFixedWrongSession(drafts: MathFixedWrongDrafts): MathFixedWrongSession {
  const first = sessionPreviewFromDraft(1, drafts[1] ?? '')
  if (!first || first.status === '합격') return 1
  const second = sessionPreviewFromDraft(2, drafts[2] ?? '')
  if (!second || second.status === '합격') return 2
  const third = sessionPreviewFromDraft(3, drafts[3] ?? '')
  if (!third || third.status === '합격') return 3
  return 4
}

export function buildFixedWrongSessionResults(drafts: MathFixedWrongDrafts): TestSessionResult[] {
  const results: TestSessionResult[] = []
  let stopped = false
  for (const session of MATH_FIXED_WRONG_SESSIONS) {
    if (stopped) {
      results.push({ session, status: '미응시' })
      continue
    }
    const parsed = parseMathWrongCountDraft(drafts[session] ?? '')
    if (parsed == null || !isValidMathWrongCount(session, parsed)) {
      results.push({ session, status: '미응시' })
      stopped = true
      continue
    }
    const score = mathFixedWrongScore(mathSessionQuestionCount(session), parsed)
    const status = mathFixedWrongStatus(score)
    results.push({
      session,
      status,
      score,
      totalScore: 100,
      incorrectCount: parsed,
    })
    if (status === '합격' || session === 4) stopped = true
  }
  return results
}

export function mathWrongDraftsFromSessions(
  sessions: TestSessionResult[] | null | undefined,
): MathFixedWrongDrafts {
  const drafts = emptyMathFixedWrongDrafts()
  for (const session of sessions ?? []) {
    if (session.session < 1 || session.session > 4) continue
    if (session.status === '미응시') continue
    if (session.incorrectCount == null || !Number.isFinite(session.incorrectCount)) continue
    drafts[session.session as MathFixedWrongSession] = String(session.incorrectCount)
  }
  return drafts
}

export function hasFixedWrongDraftContent(drafts: MathFixedWrongDrafts): boolean {
  return MATH_FIXED_WRONG_SESSIONS.some((session) => (drafts[session] ?? '').trim() !== '')
}

/** daily_tests에서 파생하는 중·고등 오답 회수. 원본 입력은 추가하지 않는다. */
export type MathWeeklyRecoveryFacts = {
  discoveredWrong: number
  recoveredWrong: number
  unrecoveredWrong: number
  retakeQuestionCount: number
  /** 발견 오답이 0이면 해당 없음 */
  recoveryRate: number | null
}

export function formatMathWeeklyRecoveryFactLine(facts: MathWeeklyRecoveryFacts): string {
  const rateLabel = facts.recoveryRate == null ? '해당 없음' : `${facts.recoveryRate}%`
  const parts = [
    `발견 오답 ${facts.discoveredWrong}개`,
    `추적 ${facts.retakeQuestionCount}문제`,
    `회수 완료 ${facts.recoveredWrong}개`,
  ]
  if (facts.unrecoveredWrong > 0) {
    parts.push(`미회수 ${facts.unrecoveredWrong}개`)
  }
  parts.push(`회수율 ${rateLabel}`)
  return parts.join(' · ')
}

export function mathWeeklyRecoveryFacts(
  record: DailyTestRecord,
): MathWeeklyRecoveryFacts | null {
  if (usesHighRecoveryMathDailyTest(record)) {
    return highRecoveryWeeklyFacts(record)
  }
  if (!usesFixedWrongMathDailyTest(record)) return null
  const sessions = Array.isArray(record.sessionResults) ? record.sessionResults : []
  const first = sessions.find((item) => item.session === 1)
  if (!first || first.status === '미응시' || first.incorrectCount == null) return null
  const discoveredWrong = first.incorrectCount
  const firstPassed = first.status === '합격'
  const laterPassed = sessions.some((item) => item.session > 1 && item.status === '합격')
  const recoveredWrong = firstPassed || laterPassed ? discoveredWrong : 0
  const retakeQuestionCount = firstPassed
    ? 0
    : sessions.filter((item) => item.session > 1 && item.status !== '미응시').length *
      mathSessionQuestionCount(2)
  return {
    discoveredWrong,
    recoveredWrong,
    unrecoveredWrong: discoveredWrong - recoveredWrong,
    retakeQuestionCount,
    recoveryRate: discoveredWrong === 0 ? null : (recoveredWrong / discoveredWrong) * 100,
  }
}
