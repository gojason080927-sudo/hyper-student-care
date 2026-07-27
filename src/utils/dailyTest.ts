import type { DailyTestRecord, TestSessionResult, TestSessionStatus } from '../types/records'
import { calcPercentage } from './calc'

export const DAILY_TEST_PASS_RATE = 80

export const TEST_SESSION_NUMBERS = [1, 2, 3, 4] as const

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

export function normalizeSessionResult(raw: TestSessionResult): TestSessionResult {
  const status = raw.status ?? '미응시'
  if (status === '미응시') {
    return { session: raw.session, status: '미응시' }
  }
  return {
    session: raw.session,
    status,
    score: Number(raw.score ?? 0),
    totalScore: Number(raw.totalScore ?? 20),
    incorrectCount: Number(raw.incorrectCount ?? 0),
  }
}

export function migrateSessionResults(
  record: Pick<
    DailyTestRecord,
    'score' | 'totalScore' | 'percentage' | 'incorrectCount' | 'sessionResults'
  >,
): TestSessionResult[] {
  if (Array.isArray(record.sessionResults) && record.sessionResults.length > 0) {
    const bySession = new Map(
      record.sessionResults.map((item) => [item.session, normalizeSessionResult(item)]),
    )
    return TEST_SESSION_NUMBERS.map(
      (session) => bySession.get(session) ?? { session, status: '미응시' },
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
  return sessions
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
  const firstAttempted =
    sessionResults.find((s) => s.status !== '미응시') ?? sessionResults[0]
  const score = firstAttempted?.score ?? 0
  const totalScore = firstAttempted?.totalScore ?? 20
  return {
    score,
    totalScore,
    percentage: calcPercentage(score, totalScore),
    incorrectCount: firstAttempted?.incorrectCount ?? 0,
  }
}

export function getFinalPassSession(sessionResults: TestSessionResult[]): number | null {
  for (const session of TEST_SESSION_NUMBERS) {
    const result = sessionResults.find((s) => s.session === session)
    if (result?.status === '합격') return session
  }
  return null
}

export function getFinalPassLabel(sessionResults: TestSessionResult[]): string {
  const passSession = getFinalPassSession(sessionResults)
  return passSession ? `${passSession}차시 합격` : '아직 합격하지 않음'
}

export function getStatusMismatchWarning(session: TestSessionResult): string | null {
  if (session.status === '미응시') return null
  const pct = getSessionPercentage(session)
  if (pct === null) return null
  const autoStatus = getStatusFromPercentage(pct)
  if (session.status !== autoStatus) {
    return `${session.session}차시: ${pct}% 기준 ${autoStatus}이지만 ${session.status}으로 선택되어 있습니다.`
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
  const sessionResults = migrateSessionResults(record)
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
  const sessionResults = form.sessionResults.map(normalizeSessionResult)
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
  return sessions.map((item) => (item.session === session ? { ...item, ...patch, session } : item))
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
