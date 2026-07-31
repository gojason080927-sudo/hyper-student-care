import type { DailyTestRecord, TestSessionResult, TestSessionStatus } from '../types/records'
import { calcPercentage } from './calc'

export const DAILY_TEST_PASS_RATE = 85
export const DAILY_TEST_FULL_SCORE = 100
export const DAILY_TEST_PASS_SCORE = 85

export const TEST_SESSION_NUMBERS = [1, 2, 3, 4] as const

export type SelectedPassRound = 1 | 2 | 3 | 4 | null

export function createDefaultSessionResults(): TestSessionResult[] {
  return TEST_SESSION_NUMBERS.map((session) => ({
    session,
    status: '미응시',
  }))
}

export function getStatusFromPercentage(percentage: number): Exclude<TestSessionStatus, '미응시'> {
  return percentage >= DAILY_TEST_PASS_RATE ? '합격' : '불합격'
}

export function getSessionPercentage(session: TestSessionResult): number | null {
  if (session.status === '미응시') return null
  if (session.score === undefined || session.totalScore === undefined) return null
  return calcPercentage(session.score, session.totalScore)
}

function normalizeSessionNumber(value: unknown): 1 | 2 | 3 | 4 {
  const session = Number(value)
  if (session === 2) return 2
  if (session === 3) return 3
  if (session === 4) return 4
  return 1
}

export function normalizeSessionResult(raw: TestSessionResult): TestSessionResult {
  const session = normalizeSessionNumber(raw.session)
  const status = raw.status ?? '미응시'
  if (status === '미응시') {
    return { session, status: '미응시' }
  }

  const normalized: TestSessionResult = { session, status }
  if (raw.score !== undefined && raw.score !== null && !Number.isNaN(Number(raw.score))) {
    normalized.score = Number(raw.score)
    normalized.totalScore = Number(raw.totalScore ?? DAILY_TEST_FULL_SCORE)
    normalized.incorrectCount = Number(raw.incorrectCount ?? 0)
  }
  return normalized
}

export function enforceSinglePassSession(sessionResults: TestSessionResult[]): TestSessionResult[] {
  const normalized = TEST_SESSION_NUMBERS.map(
    (session) =>
      normalizeSessionResult(
        sessionResults.find((item) => normalizeSessionNumber(item.session) === session) ?? {
          session,
          status: '미응시',
        },
      ),
  )

  const passSessions = normalized
    .filter((session) => session.status === '합격')
    .map((session) => session.session)

  if (passSessions.length <= 1) {
    return normalized
  }

  // legacy: 복수 합격 → 가장 높은 차시(최종 선택)만 유지
  const finalPass = Math.max(...passSessions) as 1 | 2 | 3 | 4
  return selectFinalPassSession(normalized, finalPass)
}

/** 최종 합격 차시 하나만 선택 (이전 차시는 불합격, 이후 차시는 미응시) */
export function selectFinalPassSession(
  sessions: TestSessionResult[],
  passSession: 1 | 2 | 3 | 4,
): TestSessionResult[] {
  return TEST_SESSION_NUMBERS.map((sessionNum) => {
    const existing = sessions.find((item) => normalizeSessionNumber(item.session) === sessionNum)
    const base = existing
      ? normalizeSessionResult(existing)
      : { session: sessionNum, status: '미응시' as const }

    if (sessionNum < passSession) {
      if (base.status === '미응시' && base.score === undefined) {
        return { session: sessionNum, status: '불합격' as const }
      }
      return {
        ...base,
        session: sessionNum,
        status: '불합격' as const,
      }
    }

    if (sessionNum === passSession) {
      return {
        ...base,
        session: sessionNum,
        status: '합격' as const,
      }
    }

    return clearSessionResult({ ...base, session: sessionNum })
  })
}

export function getFinalPassSession(sessionResults: TestSessionResult[]): SelectedPassRound {
  const enforced = enforceSinglePassSession(sessionResults)
  for (const session of TEST_SESSION_NUMBERS) {
    const result = enforced.find((item) => item.session === session)
    if (result?.status === '합격') return session
  }
  return null
}

/** UI·집계 공통 — 최종 합격 차시 단일 값 */
export function getSelectedPassRound(sessionResults: TestSessionResult[]): SelectedPassRound {
  return getFinalPassSession(sessionResults)
}

/** 합격 차시 단일 선택 (동일 차시 재클릭 시 유지, 항상 단일 합격으로 정규화) */
export function setPassSessionSelection(
  sessions: TestSessionResult[],
  passSession: 1 | 2 | 3 | 4,
): TestSessionResult[] {
  return selectFinalPassSession(enforceSinglePassSession(sessions), passSession)
}

export function setSessionStatusInForm(
  sessions: TestSessionResult[],
  sessionNum: 1 | 2 | 3 | 4,
  status: TestSessionStatus,
): TestSessionResult[] {
  if (status === '합격') {
    return setPassSessionSelection(sessions, sessionNum)
  }

  const current = sessions.find((item) => normalizeSessionNumber(item.session) === sessionNum)
  const base = current
    ? normalizeSessionResult(current)
    : { session: sessionNum, status: '미응시' as const }

  if (status === '미응시') {
    return enforceSinglePassSession(
      updateSessionInForm(sessions, sessionNum, clearSessionResult(base)),
    )
  }

  return enforceSinglePassSession(
    updateSessionInForm(sessions, sessionNum, updateSessionStatusOnly(base, status)),
  )
}

/** 폼 onChange 시 session_results를 단일 합격 규칙에 맞게 정규화 */
export function normalizeSessionResultsForForm(
  sessions: TestSessionResult[],
): TestSessionResult[] {
  return enforceSinglePassSession(sessions.map(normalizeSessionResult))
}

export function migrateSessionResults(
  record: Pick<
    DailyTestRecord,
    'score' | 'totalScore' | 'percentage' | 'incorrectCount' | 'sessionResults'
  >,
): TestSessionResult[] {
  if (Array.isArray(record.sessionResults) && record.sessionResults.length > 0) {
    const bySession = new Map<number, TestSessionResult>()
    for (const item of record.sessionResults) {
      const normalized = normalizeSessionResult(item)
      bySession.set(normalized.session, normalized)
    }
    return enforceSinglePassSession(
      TEST_SESSION_NUMBERS.map(
        (session) => bySession.get(session) ?? { session, status: '미응시' },
      ),
    )
  }

  const sessions = createDefaultSessionResults()
  const totalScore = Number(record.totalScore ?? 20)
  const score = Number(record.score ?? 0)
  const percentage = Number(record.percentage ?? calcPercentage(score, totalScore))

  sessions[0] = {
    session: 1,
    status: getStatusFromPercentage(percentage),
    score,
    totalScore,
    incorrectCount: Number(record.incorrectCount ?? 0),
  }
  return enforceSinglePassSession(sessions)
}

export function normalizeDailyTestRecord(record: DailyTestRecord): DailyTestRecord {
  const sessionResults = migrateSessionResults(record)
  const legacy = syncLegacyFieldsFromSessions(sessionResults)
  return {
    ...record,
    ...legacy,
    sessionResults,
  }
}

export function syncLegacyFieldsFromSessions(
  sessionResults: TestSessionResult[],
): Pick<DailyTestRecord, 'score' | 'totalScore' | 'percentage' | 'incorrectCount'> {
  const firstWithScore = sessionResults.find(
    (s) => s.status !== '미응시' && s.score !== undefined,
  )
  const firstAttempted =
    firstWithScore ?? sessionResults.find((s) => s.status !== '미응시') ?? sessionResults[0]
  const score = firstWithScore?.score ?? firstAttempted?.score ?? 0
  const totalScore = firstAttempted?.totalScore ?? DAILY_TEST_FULL_SCORE
  return {
    score,
    totalScore,
    percentage: calcPercentage(score, totalScore),
    incorrectCount: firstAttempted?.incorrectCount ?? 0,
  }
}

export function getFinalPassLabel(sessionResults: TestSessionResult[]): string {
  const passSession = getFinalPassSession(sessionResults)
  return passSession ? `${passSession}차시 합격` : '아직 합격하지 않음'
}

export function getStatusMismatchWarning(session: TestSessionResult): string | null {
  if (session.status === '미응시') return null
  const scoreOnFullScale = getSessionScoreOnFullScale(session)
  if (scoreOnFullScale === '') return null
  const autoStatus = scoreOnFullScale >= DAILY_TEST_PASS_SCORE ? '합격' : '불합격'
  if (session.status !== autoStatus) {
    return `${session.session}차시: ${scoreOnFullScale}점 기준 ${autoStatus}이지만 ${session.status}으로 선택되어 있습니다.`
  }
  return null
}

export type DailyTestFormSessionState = TestSessionResult

export type DailyTestFormData = {
  id?: string
  studentId: string
  date: string
  testName: string
  subject: string
  memo: string
  sessionResults: DailyTestFormSessionState[]
}

export function dailyTestRecordToForm(record: DailyTestRecord): DailyTestFormData {
  const sessionResults = normalizeSessionResultsForForm(migrateSessionResults(record))
  return {
    id: record.id,
    studentId: record.studentId,
    date: record.date,
    testName: record.testName,
    subject: record.subject,
    memo: record.memo,
    sessionResults,
  }
}

export function dailyTestFormToSavePayload(
  form: DailyTestFormData,
): Omit<DailyTestRecord, 'id' | 'createdAt' | 'updatedAt' | 'percentage'> & { id?: string } {
  const normalized = form.sessionResults.map(normalizeSessionResult)
  const passRound = getFinalPassSession(normalized)
  const sessionResults = passRound
    ? selectFinalPassSession(normalized, passRound)
    : enforceSinglePassSession(normalized)
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

export function emptyDailyTestForm(): DailyTestFormData {
  return {
    studentId: '',
    date: new Date().toISOString().slice(0, 10),
    testName: '',
    subject: '수학',
    memo: '',
    sessionResults: createDefaultSessionResults(),
  }
}

export function updateSessionInForm(
  sessions: TestSessionResult[],
  session: 1 | 2 | 3 | 4,
  patch: Partial<TestSessionResult>,
): TestSessionResult[] {
  return sessions.map((item) => {
    if (normalizeSessionNumber(item.session) !== session) return item
    const merged: TestSessionResult = { ...item, ...patch, session }
    if ('score' in patch && patch.score === undefined) {
      delete merged.score
      delete merged.totalScore
      delete merged.incorrectCount
    }
    return merged
  })
}

export function getSessionScoreOnFullScale(session: TestSessionResult): number | '' {
  if (session.score === undefined) return ''
  const total = session.totalScore ?? DAILY_TEST_FULL_SCORE
  if (total === DAILY_TEST_FULL_SCORE) return session.score
  return Math.round(calcPercentage(session.score, total))
}

export function updateSessionScoreOnly(
  session: TestSessionResult,
  score: number,
): TestSessionResult {
  const nextStatus =
    session.status === '미응시' ? ('불합격' as const) : session.status
  return {
    ...session,
    status: nextStatus,
    score,
    totalScore: DAILY_TEST_FULL_SCORE,
    incorrectCount: session.incorrectCount ?? 0,
  }
}

/** 점수만 비우고 합격/불합격 상태는 유지 */
export function clearSessionScore(session: TestSessionResult): TestSessionResult {
  return {
    session: session.session,
    status: session.status,
    score: undefined,
    totalScore: undefined,
    incorrectCount: undefined,
  }
}

/** 저장 시에만 호출 — 입력 draft 문자열을 숫자로 변환 */
export function parseScoreDraftToNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  if (!/^\d+$/.test(trimmed)) return undefined
  const normalized = trimmed.replace(/^0+(?=\d)/, '') || '0'
  const score = Number(normalized)
  if (!Number.isFinite(score) || score < 0 || score > DAILY_TEST_FULL_SCORE) {
    return undefined
  }
  return score
}

export function applyScoreDraftsToSessions(
  sessions: TestSessionResult[],
  drafts: Partial<Record<1 | 2 | 3 | 4, string>>,
): TestSessionResult[] {
  const normalized = normalizeSessionResultsForForm(sessions)
  const next = normalized.map((session) => {
    const draft = drafts[session.session]
    if (draft === undefined) return session
    const score = parseScoreDraftToNumber(draft)
    if (score === undefined) {
      return clearSessionScore(session)
    }
    return updateSessionScoreOnly(session, score)
  })
  return normalizeSessionResultsForForm(next)
}

export function updateSessionStatusOnly(
  session: TestSessionResult,
  status: Exclude<TestSessionStatus, '미응시'>,
): TestSessionResult {
  return {
    ...session,
    status,
  }
}

export function clearSessionResult(session: TestSessionResult): TestSessionResult {
  return {
    session: session.session,
    status: '미응시',
  }
}

export function hasDailyTestDisplayData(record?: DailyTestRecord): boolean {
  if (!record) return false
  return migrateSessionResults(record).some((session) => session.status !== '미응시')
}

export function applyScoreToSession(
  session: TestSessionResult,
  score: number,
  totalScore: number,
): TestSessionResult {
  const percentage = calcPercentage(score, totalScore)
  return {
    ...session,
    score,
    totalScore,
    status: getStatusFromPercentage(percentage),
  }
}
