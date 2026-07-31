import type { TestSessionResult } from '../types/records'
import {
  DAILY_TEST_FULL_SCORE,
  getSelectedPassRound,
  getSessionScoreOnFullScale,
  normalizeSessionResultsForForm,
  parseScoreDraftToNumber,
  syncLegacyFieldsFromSessions,
  type DailyTestFormData,
} from './dailyTest'

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
    ...legacy,
  }
}
