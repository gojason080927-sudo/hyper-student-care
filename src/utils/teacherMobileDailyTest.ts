import type { TestSessionResult, TestSessionStatus } from '../types/records'
import {
  DAILY_TEST_FULL_SCORE,
  getSelectedPassRound,
  getSessionScoreOnFullScale,
  getStatusFromPercentage,
  normalizeSessionResultsForForm,
  parseScoreDraftToNumber,
  selectFinalPassSession,
  syncLegacyFieldsFromSessions,
  type DailyTestFormData,
} from './dailyTest'
import { calcPercentage } from './calc'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis'

export type MobileDailyTestRound = {
  round: 1 | 2 | 3 | 4
  score: string
  passed: boolean
}

const MOBILE_ROUNDS = [1, 2, 3, 4] as const

export function createEmptyMobileDailyTestRounds(): MobileDailyTestRound[] {
  return MOBILE_ROUNDS.map((round) => ({ round, score: '', passed: false }))
}

/** 저장된 session_results → 모바일 입력 상태 (합격 차수만 점수 유지) */
export function sessionsToMobileDailyTestRounds(
  sessions: TestSessionResult[],
): MobileDailyTestRound[] {
  const normalized = normalizeSessionResultsForForm(sessions)
  const passRound = getSelectedPassRound(normalized)

  return MOBILE_ROUNDS.map((round) => {
    if (passRound !== round) {
      return { round, score: '', passed: false }
    }
    const session = normalized.find((item) => item.session === round)
    const scoreValue = session ? getSessionScoreOnFullScale(session) : ''
    return {
      round,
      score: scoreValue === '' ? '' : String(scoreValue),
      passed: true,
    }
  })
}

/** 입력 중 점수 문자열 검증 — 거부만 하고 상태는 string 유지 */
export function isValidMobileScoreDraft(raw: string): boolean {
  if (raw === '') return true
  if (!/^\d{1,3}$/.test(raw)) return false
  const numeric = Number(raw)
  return numeric >= 0 && numeric <= DAILY_TEST_FULL_SCORE
}

/** 합격 차수 변경 — 이전 합격 차수 포함 다른 차수는 모두 초기화 */
export function selectMobilePassRound(
  rounds: MobileDailyTestRound[],
  selectedRound: 1 | 2 | 3 | 4,
): MobileDailyTestRound[] {
  const selectedScore = rounds.find((round) => round.round === selectedRound)?.score ?? ''
  return MOBILE_ROUNDS.map((round) => {
    if (round === selectedRound) {
      return { round, score: selectedScore, passed: true }
    }
    return { round, score: '', passed: false }
  })
}

export function updateMobileScoreDraft(
  rounds: MobileDailyTestRound[],
  round: 1 | 2 | 3 | 4,
  score: string,
): MobileDailyTestRound[] {
  return rounds.map((item) => (item.round === round ? { ...item, score } : item))
}

/** 저장 시에만 number 변환 — 합격 차수만 session_results에 반영 */
export function mobileRoundsToSessionResults(
  rounds: MobileDailyTestRound[],
): TestSessionResult[] {
  const passRound = rounds.find((round) => round.passed)

  return MOBILE_ROUNDS.map((round) => {
    if (passRound?.round !== round) {
      return { session: round, status: '미응시' as const }
    }

    const score = parseScoreDraftToNumber(passRound.score)
    if (score === undefined) {
      return { session: round, status: '합격' as const }
    }

    return {
      session: round,
      status: '합격' as const,
      score,
      totalScore: DAILY_TEST_FULL_SCORE,
      incorrectCount: 0,
    }
  })
}

export function mobileDailyTestFormToSavePayload(
  form: DailyTestFormData,
  rounds: MobileDailyTestRound[],
): Omit<
  import('../types/records').DailyTestRecord,
  'id' | 'createdAt' | 'updatedAt' | 'percentage'
> & { id?: string } {
  const sessionResults = mobileRoundsToSessionResults(rounds)
  const legacy = syncLegacyFieldsFromSessions(sessionResults)
  return {
    id: form.id,
    studentId: form.studentId,
    date: form.date,
    testName: form.testName,
    subject: form.subject,
    memo: form.memo,
    sessionResults,
    learningDiagnosis: form.learningDiagnosis ?? { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    ...legacy,
  }
}

/** 반 전체 일괄 입력 — 모든 차시 점수를 유지한 채 로드 */
export function sessionsToBulkDailyTestRounds(
  sessions: TestSessionResult[],
): MobileDailyTestRound[] {
  const normalized = normalizeSessionResultsForForm(sessions)
  const passRound = getSelectedPassRound(normalized)

  return MOBILE_ROUNDS.map((round) => {
    const session = normalized.find((item) => item.session === round)
    const scoreValue = session ? getSessionScoreOnFullScale(session) : ''
    return {
      round,
      score: scoreValue === '' ? '' : String(scoreValue),
      passed: passRound === round,
    }
  })
}

/** 합격 차시만 변경 — 다른 차시 점수는 유지 */
export function selectBulkPassRound(
  rounds: MobileDailyTestRound[],
  selectedRound: 1 | 2 | 3 | 4,
): MobileDailyTestRound[] {
  return rounds.map((item) => ({
    ...item,
    passed: item.round === selectedRound,
  }))
}

/**
 * Score draft → on-screen 합격/불합격. Empty/invalid is neutral.
 * Reuses the existing 85-point source of truth (percentage on 100).
 */
export function visualStatusFromScoreDraft(
  score: string,
): Exclude<TestSessionStatus, '미응시'> | null {
  const numeric = parseScoreDraftToNumber(score)
  if (numeric === undefined) return null
  return getStatusFromPercentage(calcPercentage(numeric, DAILY_TEST_FULL_SCORE))
}

/** 점수가 있는 차시 중 가장 높은 합격 차시만 최종 합격으로 둔다. */
export function syncBulkPassFromScores(
  rounds: MobileDailyTestRound[],
): MobileDailyTestRound[] {
  const passing = rounds
    .filter((item) => visualStatusFromScoreDraft(item.score) === '합격')
    .map((item) => item.round)
  if (passing.length === 0) {
    return rounds.map((item) => ({ ...item, passed: false }))
  }
  const finalPass = Math.max(...passing) as 1 | 2 | 3 | 4
  return selectBulkPassRound(rounds, finalPass)
}

/**
 * 점수 draft 변경.
 * 기존 85점 기준으로 최종 합격 차시를 다시 고른다.
 */
export function updateBulkScoreDraft(
  rounds: MobileDailyTestRound[],
  round: 1 | 2 | 3 | 4,
  score: string,
): MobileDailyTestRound[] {
  const next = rounds.map((item) =>
    item.round === round ? { ...item, score } : item,
  )
  return syncBulkPassFromScores(next)
}

/** 반 전체 저장용 — 전 차시 점수 유지 + 최종 합격 차시 1개 */
export function bulkRoundsToSessionResults(
  rounds: MobileDailyTestRound[],
): TestSessionResult[] {
  const withScores: TestSessionResult[] = MOBILE_ROUNDS.map((round) => {
    const draft = rounds.find((item) => item.round === round)
    const score = parseScoreDraftToNumber(draft?.score ?? '')
    if (score === undefined) {
      return { session: round, status: '미응시' as const }
    }
    return {
      session: round,
      status: '불합격' as const,
      score,
      totalScore: DAILY_TEST_FULL_SCORE,
      incorrectCount: 0,
    }
  })

  const passRound = rounds.find((item) => item.passed)?.round
  if (passRound) {
    return selectFinalPassSession(withScores, passRound)
  }
  return withScores
}

export function bulkDailyTestToSavePayload(input: {
  id?: string
  studentId: string
  date: string
  testName: string
  subject: string
  memo?: string
  rounds: MobileDailyTestRound[]
  learningDiagnosis?: import('../types/records').DailyTestRecord['learningDiagnosis']
}): Omit<
  import('../types/records').DailyTestRecord,
  'id' | 'createdAt' | 'updatedAt' | 'percentage'
> & { id?: string } {
  const sessionResults = bulkRoundsToSessionResults(input.rounds)
  const legacy = syncLegacyFieldsFromSessions(sessionResults)
  return {
    id: input.id,
    studentId: input.studentId,
    date: input.date,
    testName: input.testName.trim() || '일일테스트',
    subject: input.subject.trim() || '수학',
    memo: input.memo?.trim() ?? '',
    sessionResults,
    learningDiagnosis: input.learningDiagnosis ?? { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    ...legacy,
  }
}

export function hasBulkDailyTestContent(
  rounds: MobileDailyTestRound[],
  wrongAnswerBank = '',
  hasDiagnosis = false,
): boolean {
  return (
    rounds.some((round) => round.score.trim() !== '' || round.passed) ||
    wrongAnswerBank.trim() !== '' ||
    hasDiagnosis
  )
}

export function defaultDailyTestNameForDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  if (!month || !day) return '일일테스트'
  return `${month}월 ${day}일 일일테스트`
}
