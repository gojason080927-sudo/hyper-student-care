import type {
  ClassTodayReportCommon,
  DailyTestRecord,
  StudentTextbookSlot,
  WeeklyLearningSummaryRecord,
} from '../types/records'
import type { MathWeeklyRecoveryFacts, MathWrongTrackingStatus } from './mathDailyTest'
import { weekDatesMondayToFriday } from './studentCare/dailyTestWeeklyFlow'
import { getMondayOfWeek, getFridayOfWeek, formatPeriodLabel } from './studentCare/week'
import { getSeoulDateString } from './seoulDate'
import {
  resolveDisplayTextbookName,
  type TextbookDisplayClassContext,
} from './textbookSlots'

export const ENGLISH_VOCAB_TEXTBOOK_SUBJECT = '영어' as const
export const ENGLISH_VOCAB_TEXTBOOK_SLOT = 3 as const

export function listParentWeeklyWrongVocabWeeks(params: {
  studentId: string
  dailyTests: DailyTestRecord[]
  weeklySummaries: WeeklyLearningSummaryRecord[]
  today?: string
}): string[] {
  const weeks = new Set<string>()
  weeks.add(getMondayOfWeek(params.today ?? getSeoulDateString()))
  for (const record of params.dailyTests) {
    if (record.studentId === params.studentId && record.date) {
      weeks.add(getMondayOfWeek(record.date))
    }
  }
  for (const summary of params.weeklySummaries) {
    if (summary.studentId === params.studentId && summary.weekStart) {
      weeks.add(summary.weekStart)
    }
  }
  return [...weeks].sort((a, b) => b.localeCompare(a))
}

/** 최초 진입: 월~금 집계 대상 daily_tests가 있는 가장 최근 주. 없으면 이번 주. */
export function pickDefaultParentWeeklyWrongVocabWeek(params: {
  studentId: string
  dailyTests: DailyTestRecord[]
  today?: string
}): string {
  const currentWeek = getMondayOfWeek(params.today ?? getSeoulDateString())
  let latest: string | null = null
  for (const record of params.dailyTests) {
    if (record.studentId !== params.studentId || !record.date) continue
    const monday = getMondayOfWeek(record.date)
    if (!weekDatesMondayToFriday(monday).includes(record.date)) continue
    if (!latest || monday.localeCompare(latest) > 0) latest = monday
  }
  return latest ?? currentWeek
}

export function weeklyWrongVocabPeriodLabel(weekStart: string): string {
  return formatPeriodLabel(weekStart, getFridayOfWeek(weekStart))
}

export function summarizeParentWeeklyMathRecovery(
  facts: MathWeeklyRecoveryFacts[],
): MathWeeklyRecoveryFacts | null {
  if (facts.length === 0) return null
  const discoveredWrong = facts.reduce((sum, item) => sum + item.discoveredWrong, 0)
  const recoveredWrong = facts.reduce((sum, item) => sum + item.recoveredWrong, 0)
  const unrecoveredWrong = facts.reduce((sum, item) => sum + item.unrecoveredWrong, 0)
  const retakeQuestionCount = facts.reduce((sum, item) => sum + item.retakeQuestionCount, 0)
  return {
    discoveredWrong,
    recoveredWrong,
    unrecoveredWrong,
    retakeQuestionCount,
    recoveryRate: discoveredWrong === 0 ? null : (recoveredWrong / discoveredWrong) * 100,
    trackingStatus: facts.some((item) => item.trackingStatus === 'IN_PROGRESS')
      ? 'IN_PROGRESS'
      : 'COMPLETE',
  }
}

export function formatParentMathWrongTrackingStatus(
  status: MathWrongTrackingStatus,
): string {
  return status === 'COMPLETE' ? '1차 오답 추적 완료' : '오답 추적 진행 중'
}

export function pickLatestParentWeeklyVocab(
  results: Array<{ date: string; totalWords: number; wrongWords: number; label: string }>,
): { date: string; totalWords: number; wrongWords: number; label: string } | null {
  if (results.length === 0) return null
  return [...results].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function parentWeeklyVocabMemorizedWords(
  totalWords: number,
  wrongWords: number,
): number {
  if (!Number.isFinite(totalWords) || !Number.isFinite(wrongWords)) return 0
  return Math.max(0, Math.floor(totalWords) - Math.floor(wrongWords))
}

export function parentWeeklyVocabSuccessRate(
  totalWords: number,
  memorizedWords: number,
): number | null {
  if (!Number.isFinite(totalWords) || totalWords <= 0) return null
  if (!Number.isFinite(memorizedWords)) return null
  return (memorizedWords / totalWords) * 100
}

export function formatParentWeeklyVocabSuccessRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return '해당 없음'
  return `${Math.round(rate)}%`
}

export function buildParentWeeklyVocabClassContext(params: {
  grade: string
  className: string
  commonRecords: ClassTodayReportCommon[]
  classSlots?: StudentTextbookSlot[]
}): TextbookDisplayClassContext | undefined {
  const grade = params.grade.trim()
  const className = params.className.trim()
  if (!grade || !className) return undefined
  return {
    grade,
    className,
    commonRecords: params.commonRecords,
    classSlots: params.classSlots,
  }
}

export function resolveParentWeeklyVocabBookName(params: {
  studentId: string
  date: string
  studentTextbookSlots: StudentTextbookSlot[]
  classContext?: TextbookDisplayClassContext
}): string {
  return resolveDisplayTextbookName(
    params.classContext,
    params.studentId,
    params.date,
    ENGLISH_VOCAB_TEXTBOOK_SUBJECT,
    ENGLISH_VOCAB_TEXTBOOK_SLOT,
    params.studentTextbookSlots,
  )
}
