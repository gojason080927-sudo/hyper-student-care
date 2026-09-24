import type { DailyTestRecord } from '../types/records'
import { normalizeDailyLearningDiagnosis } from './learningDiagnosis'
import { isEnglishSubject } from './englishVocabTest'

/** 기존 영어 Weekly 지수 80%. 문법/작문은 각 10%. 미입력은 빼고 재정규화한다. */
export const ENGLISH_WEEKLY_EXISTING_WEIGHT = 0.8
export const ENGLISH_WEEKLY_GRAMMAR_WEIGHT = 0.1
export const ENGLISH_WEEKLY_COMPOSITION_WEIGHT = 0.1

export const GRAMMAR_WRITTEN_RESULTS = ['합격', '부분 합격', '불합격'] as const
export type GrammarWrittenResult = (typeof GRAMMAR_WRITTEN_RESULTS)[number]

export const COMPOSITION_GRADES = ['A', 'B', 'C'] as const
export type CompositionGrade = (typeof COMPOSITION_GRADES)[number]

const GRAMMAR_SCORE: Record<GrammarWrittenResult, number> = {
  합격: 100,
  '부분 합격': 85,
  불합격: 70,
}

const COMPOSITION_SCORE: Record<CompositionGrade, number> = {
  A: 100,
  B: 85,
  C: 70,
}

export function grammarWrittenScore(result: GrammarWrittenResult): number {
  return GRAMMAR_SCORE[result]
}

export function compositionScore(grade: CompositionGrade): number {
  return COMPOSITION_SCORE[grade]
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * 기존 영어 지수 E와 주간 문법/작문 평균을 섞는다.
 * 없는 항목은 0점이 아니라 가중치에서 빠진다.
 * E만 있으면 E 그대로다.
 */
export function blendEnglishWeeklyIndex(
  existingIndex: number | null,
  grammarScores: readonly number[],
  compositionScores: readonly number[],
): number | null {
  const grammar = average([...grammarScores])
  const composition = average([...compositionScores])
  const parts: { value: number; weight: number }[] = []
  if (existingIndex != null) {
    parts.push({ value: existingIndex, weight: ENGLISH_WEEKLY_EXISTING_WEIGHT })
  }
  if (grammar != null) parts.push({ value: grammar, weight: ENGLISH_WEEKLY_GRAMMAR_WEIGHT })
  if (composition != null) {
    parts.push({ value: composition, weight: ENGLISH_WEEKLY_COMPOSITION_WEIGHT })
  }
  if (parts.length === 0) return null
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0)
  const weighted = parts.reduce((sum, part) => sum + part.value * part.weight, 0)
  return weighted / weightSum
}

export function englishWrittenScoresForWeek(records: readonly DailyTestRecord[]): {
  grammar: number[]
  composition: number[]
} {
  const grammar: number[] = []
  const composition: number[] = []
  for (const record of records) {
    if (!isEnglishSubject(record.subject)) continue
    const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
    if (diagnosis.englishGrammarWrittenResult) {
      grammar.push(grammarWrittenScore(diagnosis.englishGrammarWrittenResult))
    }
    if (diagnosis.englishCompositionGrade) {
      composition.push(compositionScore(diagnosis.englishCompositionGrade))
    }
  }
  return { grammar, composition }
}
