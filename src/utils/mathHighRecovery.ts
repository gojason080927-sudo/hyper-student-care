import type { DailyLearningDiagnosisData, DailyTestRecord } from '../types/records'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  normalizeDailyLearningDiagnosis,
} from './learningDiagnosis'

export const MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY = 'high-recovery-v1' as const

export type HighRecoveryEndSession = 1 | 2 | 3 | 4

export type HighRecoveryDrafts = {
  firstWrong: string
  endSession: '' | HighRecoveryEndSession
  session3Questions: string
  session4Questions: string
}

export type HighRecoveryParsed = {
  firstWrong: number
  endSession: HighRecoveryEndSession
  session3Questions: number | null
  session4Questions: number | null
}

export function isHighSchoolGrade(grade: string | null | undefined): boolean {
  return grade === '고1' || grade === '고2' || grade === '고3'
}

export function isMiddleSchoolGrade(grade: string | null | undefined): boolean {
  return grade === '중1' || grade === '중2' || grade === '중3'
}

export function emptyHighRecoveryDrafts(): HighRecoveryDrafts {
  return {
    firstWrong: '',
    endSession: '',
    session3Questions: '',
    session4Questions: '',
  }
}

export function parseHighCountDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  if (!/^\d{1,3}$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

export function parseHighEndSession(
  raw: '' | HighRecoveryEndSession | number | string | null | undefined,
): HighRecoveryEndSession | null {
  const value = Number(raw)
  if (value === 1 || value === 2 || value === 3 || value === 4) return value
  return null
}

export function highSession2Questions(firstWrong: number): number {
  return firstWrong
}

export function highSession2WrongFromQ3(session3Questions: number): number {
  return session3Questions / 3
}

export function highSession3WrongFromQ4(session4Questions: number): number {
  return session4Questions / 5
}

export function highRetakeQuestionCount(
  firstWrong: number,
  endSession: HighRecoveryEndSession,
  session3Questions: number | null,
  session4Questions: number | null,
): number {
  if (endSession === 1) return 0
  if (endSession === 2) return firstWrong
  if (endSession === 3) return firstWrong + (session3Questions ?? 0)
  return firstWrong + (session3Questions ?? 0) + (session4Questions ?? 0)
}

export function validateHighRecoveryDrafts(drafts: HighRecoveryDrafts): string | null {
  const firstWrong = parseHighCountDraft(drafts.firstWrong)
  if (firstWrong == null) {
    return drafts.firstWrong.trim() === '' ? '1차 오답 수를 입력해 주세요.' : '1차 오답 수를 확인해 주세요.'
  }
  if (!Number.isInteger(firstWrong) || firstWrong < 0 || firstWrong > 10) {
    return '1차 오답은 0~10개만 입력할 수 있습니다.'
  }

  const endSession = parseHighEndSession(drafts.endSession)
  if (endSession == null) {
    return '종료 차시를 선택해 주세요.'
  }
  if (firstWrong === 0 && endSession !== 1) {
    return '1차 오답이 0이면 1차에서 종료해야 합니다.'
  }
  if (firstWrong > 0 && endSession === 1) {
    return '1차 오답이 있으면 2~4차 중 종료 차시를 선택해 주세요.'
  }

  if (endSession <= 2) {
    return null
  }

  const q3 = parseHighCountDraft(drafts.session3Questions)
  if (q3 == null) {
    return '3차 실제 문제 수를 입력해 주세요.'
  }
  if (q3 % 3 !== 0) {
    return '3차 문제 수는 3의 배수여야 합니다.'
  }
  if (q3 < 3 || q3 > 3 * firstWrong) {
    return `3차 문제 수는 3~${3 * firstWrong}개만 입력할 수 있습니다.`
  }
  const w2 = highSession2WrongFromQ3(q3)
  if (w2 > firstWrong) {
    return '2차 오답은 2차 문제 수(1차 오답)를 넘을 수 없습니다.'
  }

  if (endSession === 3) return null

  const q4 = parseHighCountDraft(drafts.session4Questions)
  if (q4 == null) {
    return '4차 실제 문제 수를 입력해 주세요.'
  }
  if (q4 % 5 !== 0) {
    return '4차 문제 수는 5의 배수여야 합니다.'
  }
  if (q4 < 5 || q4 > 5 * q3) {
    return `4차 문제 수는 5~${5 * q3}개만 입력할 수 있습니다.`
  }
  const w3 = highSession3WrongFromQ4(q4)
  if (w3 > q3) {
    return '3차 오답은 3차 문제 수를 넘을 수 없습니다.'
  }
  return null
}

export function parseHighRecoveryDrafts(drafts: HighRecoveryDrafts): HighRecoveryParsed | null {
  if (validateHighRecoveryDrafts(drafts)) return null
  const firstWrong = parseHighCountDraft(drafts.firstWrong)
  const endSession = parseHighEndSession(drafts.endSession)
  if (firstWrong == null || endSession == null) return null
  return {
    firstWrong,
    endSession,
    session3Questions: endSession >= 3 ? parseHighCountDraft(drafts.session3Questions) : null,
    session4Questions: endSession === 4 ? parseHighCountDraft(drafts.session4Questions) : null,
  }
}

export function applyHighRecoveryToDiagnosis(
  diagnosis: DailyLearningDiagnosisData | null | undefined,
  parsed: HighRecoveryParsed,
): DailyLearningDiagnosisData {
  return {
    ...normalizeDailyLearningDiagnosis(diagnosis ?? EMPTY_DAILY_LEARNING_DIAGNOSIS),
    mathDailyTestFormat: MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY,
    mathHighFirstWrongCount: parsed.firstWrong,
    mathHighEndSession: parsed.endSession,
    mathHighSession3Questions: parsed.endSession >= 3 ? parsed.session3Questions : null,
    mathHighSession4Questions: parsed.endSession === 4 ? parsed.session4Questions : null,
  }
}

export function highParsedFromDiagnosis(
  diagnosis: DailyLearningDiagnosisData | null | undefined,
): HighRecoveryParsed | null {
  const drafts = highDraftsFromDiagnosis(diagnosis)
  return parseHighRecoveryDrafts(drafts)
}

export function highDraftsFromDiagnosis(
  diagnosis: DailyLearningDiagnosisData | null | undefined,
): HighRecoveryDrafts {
  const row = normalizeDailyLearningDiagnosis(diagnosis ?? EMPTY_DAILY_LEARNING_DIAGNOSIS)
  return {
    firstWrong: row.mathHighFirstWrongCount == null ? '' : String(row.mathHighFirstWrongCount),
    endSession: row.mathHighEndSession ?? '',
    session3Questions: row.mathHighSession3Questions == null ? '' : String(row.mathHighSession3Questions),
    session4Questions: row.mathHighSession4Questions == null ? '' : String(row.mathHighSession4Questions),
  }
}

export function usesHighRecoveryMathDailyTest(record: DailyTestRecord): boolean {
  if (!(record.subject ?? '').includes('수학')) return false
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  return (
    diagnosis.mathDailyTestFormat === MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY &&
    diagnosis.mathHighFirstWrongCount != null &&
    diagnosis.mathHighEndSession != null
  )
}

export function shouldUseHighRecoveryMathInput(
  subject: string,
  record?: DailyTestRecord | null,
  grade?: string | null,
): boolean {
  if (!(subject ?? '').includes('수학')) return false
  if (record) {
    const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
    if (diagnosis.mathDailyTestFormat === MATH_DAILY_TEST_FORMAT_HIGH_RECOVERY) return true
    if (diagnosis.mathDailyTestFormat === 'fixed-wrong-v1') return false
    const sessions = Array.isArray(record.sessionResults) ? record.sessionResults : []
    if (sessions.some((session) => session.status && session.status !== '미응시')) return false
    if (Number(record.score) > 0 || Number(record.percentage) > 0) return false
  }
  return isHighSchoolGrade(grade)
}

/** Weekly SUMMARY 전용. 1차 10문제 정답률. risk/일반 점수 경로에서는 사용하지 않는다. */
export function highRecoveryFirstScore(record: DailyTestRecord): number | null {
  if (!usesHighRecoveryMathDailyTest(record)) return null
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  const firstWrong = diagnosis.mathHighFirstWrongCount
  if (firstWrong == null || firstWrong < 0 || firstWrong > 10) return null
  return (10 - firstWrong) * 10
}

export function highRecoveryWeeklyFacts(record: DailyTestRecord): {
  discoveredWrong: number
  recoveredWrong: number
  unrecoveredWrong: number
  retakeQuestionCount: number
  recoveryRate: number | null
} | null {
  if (!usesHighRecoveryMathDailyTest(record)) return null
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  const firstWrong = diagnosis.mathHighFirstWrongCount
  const endSession = diagnosis.mathHighEndSession
  if (firstWrong == null || endSession == null) return null
  const q3 = endSession >= 3 ? diagnosis.mathHighSession3Questions : null
  const q4 = endSession === 4 ? diagnosis.mathHighSession4Questions : null
  const discoveredWrong = firstWrong
  return {
    discoveredWrong,
    recoveredWrong: discoveredWrong,
    unrecoveredWrong: 0,
    retakeQuestionCount: highRetakeQuestionCount(firstWrong, endSession, q3, q4),
    recoveryRate: discoveredWrong === 0 ? null : 100,
  }
}

export function hasHighRecoveryDraftContent(drafts: HighRecoveryDrafts): boolean {
  return (
    drafts.firstWrong.trim() !== '' ||
    drafts.endSession !== '' ||
    drafts.session3Questions.trim() !== '' ||
    drafts.session4Questions.trim() !== ''
  )
}

export function formatHighRecoveryResult(parsed: HighRecoveryParsed): string {
  const parts = [`1차 오답 ${parsed.firstWrong}개`, `${parsed.endSession}차 종료`]
  if (parsed.endSession >= 3 && parsed.session3Questions != null) {
    parts.push(`3차 ${parsed.session3Questions}문제`)
  }
  if (parsed.endSession === 4 && parsed.session4Questions != null) {
    parts.push(`4차 ${parsed.session4Questions}문제`)
  }
  return parts.join(' · ')
}

export function formatHighRecoveryWeeklyFactLine(record: DailyTestRecord): string | null {
  const facts = highRecoveryWeeklyFacts(record)
  if (!facts) return null
  const rateLabel = facts.recoveryRate == null ? '해당 없음' : `${facts.recoveryRate}%`
  return `발견 오답 ${facts.discoveredWrong}개 · 추적 ${facts.retakeQuestionCount}문제 · 회수 완료 ${facts.recoveredWrong}개 · 회수율 ${rateLabel}`
}
