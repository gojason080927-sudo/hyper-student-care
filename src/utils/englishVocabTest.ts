import type { DailyLearningDiagnosisData, DailyTestRecord } from '../types/records'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  normalizeDailyLearningDiagnosis,
} from './learningDiagnosis'

export const ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE = 'cumulative' as const

export type EnglishVocabTestFormat = typeof ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE

export function isEnglishSubject(subject: string | null | undefined): boolean {
  return (subject ?? '').includes('영어')
}

export function englishVocabWeeklyDeduction(wrongWords: number): number {
  if (!Number.isFinite(wrongWords) || wrongWords < 0) return 0
  const count = Math.floor(wrongWords)
  if (count <= 5) return 0
  if (count <= 10) return 1
  if (count <= 15) return 2
  if (count <= 20) return 3
  return 4
}

export function parseVocabWordCountDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  if (!/^\d{1,5}$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

export function validateCumulativeVocabInput(
  totalRaw: string,
  wrongRaw: string,
): string | null {
  const totalWords = parseVocabWordCountDraft(totalRaw)
  const wrongWords = parseVocabWordCountDraft(wrongRaw)
  if (totalWords == null || wrongWords == null) {
    return '전체 단어 수와 틀린 단어 수를 입력해 주세요.'
  }
  if (totalWords <= 0) {
    return '전체 단어 수는 1 이상이어야 합니다.'
  }
  if (wrongWords > totalWords) {
    return '틀린 단어 수는 전체 단어 수보다 클 수 없습니다.'
  }
  return null
}

export function hasCumulativeVocabDraftContent(totalRaw: string, wrongRaw: string): boolean {
  return totalRaw.trim() !== '' || wrongRaw.trim() !== ''
}

export function formatCumulativeVocabResult(totalWords: number, wrongWords: number): string {
  return `${totalWords}단어 중 ${wrongWords}개 틀림`
}

export function isLegacyEnglishVocabRecord(record: DailyTestRecord): boolean {
  if (!isEnglishSubject(record.subject)) return false
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  if (diagnosis.englishVocabTestFormat === ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE) {
    return false
  }
  const sessions = Array.isArray(record.sessionResults) ? record.sessionResults : []
  if (sessions.some((session) => session.status && session.status !== '미응시')) {
    return true
  }
  return Number(record.score) > 0 || Number(record.percentage) > 0
}

export function usesCumulativeEnglishVocabTest(record: DailyTestRecord): boolean {
  if (!isEnglishSubject(record.subject)) return false
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  return (
    diagnosis.englishVocabTestFormat === ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE &&
    diagnosis.englishVocabWrongWords != null &&
    diagnosis.englishVocabTotalWords != null &&
    diagnosis.englishVocabTotalWords > 0
  )
}

export function shouldUseCumulativeEnglishVocabInput(
  subject: string,
  record?: DailyTestRecord | null,
): boolean {
  if (!isEnglishSubject(subject)) return false
  if (!record) return true
  return !isLegacyEnglishVocabRecord(record)
}

export function applyCumulativeVocabToDiagnosis(
  diagnosis: DailyLearningDiagnosisData | null | undefined,
  totalWords: number,
  wrongWords: number,
): DailyLearningDiagnosisData {
  return {
    ...normalizeDailyLearningDiagnosis(diagnosis ?? EMPTY_DAILY_LEARNING_DIAGNOSIS),
    englishVocabTestFormat: ENGLISH_VOCAB_TEST_FORMAT_CUMULATIVE,
    englishVocabTotalWords: totalWords,
    englishVocabWrongWords: wrongWords,
  }
}

export function sumEnglishVocabWeeklyDeduction(records: DailyTestRecord[]): number {
  let total = 0
  for (const record of records) {
    if (!usesCumulativeEnglishVocabTest(record)) continue
    const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
    if (diagnosis.englishVocabWrongWords == null) continue
    total += englishVocabWeeklyDeduction(diagnosis.englishVocabWrongWords)
  }
  return total
}
