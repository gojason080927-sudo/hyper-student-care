import type { DailyTestRecord } from '../../types/records.ts'
import { highRecoveryFirstScore } from '../mathHighRecovery.ts'
import {
  DAILY_TEST_AVG_WEIGHT,
  DAILY_TEST_PASS_RATE_WEIGHT,
  DAILY_TEST_PASS_SCORE,
} from './constants.ts'
import { dailyTestRecordScore } from './scoring.ts'

/** Weekly SUMMARY 전용 일자 평가. risk의 dailyTestRecordScore와 분리한다. */
export type WeeklyDailyTestFact = {
  score: number
  passed: boolean
}

export function weeklyDailyTestRecordFact(
  record: DailyTestRecord,
): WeeklyDailyTestFact | null {
  const firstScore = highRecoveryFirstScore(record)
  if (firstScore != null) {
    return { score: firstScore, passed: true }
  }
  const score = dailyTestRecordScore(record)
  if (score == null) return null
  return { score, passed: score >= DAILY_TEST_PASS_SCORE }
}

/**
 * 그날 평가 평균 + 완료/합격.
 * high-recovery만: 완료=정상 저장. 점수형만: 평균 ≥ 85.
 * 혼합: 점수 평균은 전부, 합격은 (고등 완료) AND (점수형 평균 ≥ 85).
 */
export function weeklyDailyTestDayFact(
  records: DailyTestRecord[],
): WeeklyDailyTestFact | null {
  const highScores: number[] = []
  const scoredScores: number[] = []
  for (const record of records) {
    const firstScore = highRecoveryFirstScore(record)
    if (firstScore != null) {
      highScores.push(firstScore)
      continue
    }
    const score = dailyTestRecordScore(record)
    if (score != null) scoredScores.push(score)
  }
  if (highScores.length === 0 && scoredScores.length === 0) return null

  const combined = [...highScores, ...scoredScores]
  const score = combined.reduce((sum, value) => sum + value, 0) / combined.length

  if (highScores.length > 0 && scoredScores.length > 0) {
    const scoredAverage =
      scoredScores.reduce((sum, value) => sum + value, 0) / scoredScores.length
    return { score, passed: scoredAverage >= DAILY_TEST_PASS_SCORE }
  }
  if (highScores.length > 0) return { score, passed: true }
  return { score, passed: score >= DAILY_TEST_PASS_SCORE }
}

/** 후보 C: 일자 점수 평균 × 0.7 + 일자 완료/합격 비율 × 30. 이중 70/30 없음. */
export function weeklyTestIndexFromFacts(facts: WeeklyDailyTestFact[]): number | null {
  if (facts.length === 0) return null
  const average = facts.reduce((sum, fact) => sum + fact.score, 0) / facts.length
  const passRate = facts.filter((fact) => fact.passed).length / facts.length
  return average * DAILY_TEST_AVG_WEIGHT + passRate * 100 * DAILY_TEST_PASS_RATE_WEIGHT
}
