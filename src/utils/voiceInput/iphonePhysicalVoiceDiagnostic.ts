/**
 * Temporary teacher-only physical iPhone voice diagnostic.
 * No DB write, no audio, no server log, no parent exposure.
 * Does not change WebKit merge/apply when unused.
 */
import type { DailyLearningDiagnosisData } from '../../types/records.ts'
import type { AttendanceRecord } from '../../types/records.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import {
  parseStudentDailyTestVoice,
  type StudentDailyTestParseResult,
} from './parseStudentDailyTestVoice.ts'
import type { SpeechForensicEvent } from './speechForensic.ts'
import type { HeldSpeechTrace, RawSpeechRecognitionCapture } from './speechRecognition.ts'
import type { VoiceTranscriptRoute } from './voiceSaveCommand.ts'
import type { VoiceApplySummary, VoiceStudentRef } from './types.ts'

export const UI_APPLIED_COUNT_SOURCE =
  'ClassDailyTestBulkPanel voiceConfirmations → formatVoiceSummary(summary.appliedCount)'

export const UI_APPLIED_COUNT_MEANING =
  'parser field-patch count = attempts.length + error-analysis fields (0–3) + (teacherFeedback ? 1 : 0). Not Web Speech onresult count, not route/parser/apply call count, not transcript fragments.'

export type IphonePhysicalVoicePathCounters = {
  recognitionEventCount: number
  interimCallbackCount: number
  finalCallbackCount: number
  routeCallCount: number
  parserCallCount: number
  draftApplyCount: number
  reactStatePatchCount: number
}

export type IphonePhysicalOnResultLog = {
  eventSequenceNumber: number
  timestampDeltaMs: number
  sessionId: number
  recognitionGeneration: number
  resultIndex: number
  resultsLength: number
  results: Array<{ index: number; isFinal: boolean; rawTranscript: string }>
  generationReady: boolean
  heldApplied: boolean
  currentInterimHypothesis: string
  currentFinalHypothesis: string
  liveTranscriptShown: string
  stableTranscript: string
  mutableTranscript: string
}

export type PhysicalVoiceSessionCapture = {
  rawTranscript: string
  routed: VoiceTranscriptRoute
  heldTrace: HeldSpeechTrace | null
  forensicEvents: SpeechForensicEvent[]
  rawRecognitionEvents: IphonePhysicalOnResultLog[]
  liveTranscriptShown: string
  counters: IphonePhysicalVoicePathCounters
  endReason: string
  dryRun: boolean
}

export type IphonePhysicalVoiceDiagnosticReport = {
  sessionId: number
  recognitionGeneration: number
  eventSequenceNumber: number
  dryRun: boolean
  counters: IphonePhysicalVoicePathCounters
  liveTranscriptShown: string
  stableTranscript: string
  mutableTranscript: string
  explicitStopTranscript: string
  parserInput: string
  parsedAttempts: string
  parsedErrorCounts: string
  parsedFeedback: string
  needsReview: string
  computedAppliedCountIfApplied: number
  uiStatusWouldShow: string
  copyText: string
}

export function emptyPhysicalVoicePathCounters(): IphonePhysicalVoicePathCounters {
  return {
    recognitionEventCount: 0,
    interimCallbackCount: 0,
    finalCallbackCount: 0,
    routeCallCount: 0,
    parserCallCount: 0,
    draftApplyCount: 0,
    reactStatePatchCount: 0,
  }
}

export function computedDailyTestAppliedCount(parsed: StudentDailyTestParseResult): number {
  if (!parsed.apply) return 0
  return (
    parsed.attempts.length +
    (parsed.conceptLackCount !== undefined ? 1 : 0) +
    (parsed.calculationErrorCount !== undefined ? 1 : 0) +
    (parsed.applicationLackCount !== undefined ? 1 : 0) +
    (parsed.teacherFeedback ? 1 : 0)
  )
}

export function attachHypothesesToRawEvent(
  raw: RawSpeechRecognitionCapture,
  held: HeldSpeechTrace | null,
  liveTranscriptShown: string,
): IphonePhysicalOnResultLog {
  return {
    eventSequenceNumber: raw.eventSequenceNumber,
    timestampDeltaMs: raw.timestampDeltaMs,
    sessionId: raw.sessionId,
    recognitionGeneration: raw.recognitionGeneration,
    resultIndex: raw.resultIndex,
    resultsLength: raw.resultsLength,
    results: raw.results.map((slot) => ({ ...slot })),
    generationReady: raw.generationReady,
    heldApplied: raw.heldApplied,
    currentInterimHypothesis: held?.interim ?? liveTranscriptShown,
    currentFinalHypothesis: held?.committed ?? '',
    liveTranscriptShown,
    stableTranscript: held?.accumulated ?? '',
    mutableTranscript: held?.committed ?? '',
  }
}

function formatAttempts(parsed: StudentDailyTestParseResult | null): string {
  if (!parsed?.attempts.length) return '(none)'
  return parsed.attempts
    .map((attempt) => `${attempt.round}차=${attempt.score}`)
    .join(', ')
}

function formatErrorCounts(parsed: StudentDailyTestParseResult | null): string {
  if (!parsed) return '(none)'
  return [
    `conceptLackCount=${parsed.conceptLackCount ?? '(unset)'}`,
    `calculationErrorCount=${parsed.calculationErrorCount ?? '(unset)'}`,
    `applicationLackCount=${parsed.applicationLackCount ?? '(unset)'}`,
  ].join(' · ')
}

function formatNeedsReview(parsed: StudentDailyTestParseResult | null, summary: VoiceApplySummary | null): string {
  const items = parsed?.needsReview?.length ? parsed.needsReview : summary?.needsReview ?? []
  if (!items.length) return '(none)'
  return items.map((item) => `${item.label}: ${item.reason}`).join(' | ')
}

function formatRawEvent(event: IphonePhysicalOnResultLog): string {
  const slots = event.results
    .map(
      (slot) =>
        `    [${slot.index}] isFinal=${slot.isFinal} raw=${JSON.stringify(slot.rawTranscript)}`,
    )
    .join('\n')
  return [
    `#${event.eventSequenceNumber} dt=${event.timestampDeltaMs}ms session=${event.sessionId} gen=${event.recognitionGeneration} generationReady=${event.generationReady} heldApplied=${event.heldApplied}`,
    `  resultIndex=${event.resultIndex} results.length=${event.resultsLength}`,
    slots || '    (no results)',
    `  currentInterimHypothesis=${JSON.stringify(event.currentInterimHypothesis)}`,
    `  currentFinalHypothesis=${JSON.stringify(event.currentFinalHypothesis)}`,
    `  liveTranscriptShown=${JSON.stringify(event.liveTranscriptShown)}`,
    `  stableTranscript=${JSON.stringify(event.stableTranscript)}`,
    `  mutableTranscript=${JSON.stringify(event.mutableTranscript)}`,
  ].join('\n')
}

export function formatIphonePhysicalVoiceDiagnosticText(report: {
  sessionId: number
  recognitionGeneration: number
  eventSequenceNumber: number
  dryRun: boolean
  counters: IphonePhysicalVoicePathCounters
  liveTranscriptShown: string
  stableTranscript: string
  mutableTranscript: string
  explicitStopTranscript: string
  parserInput: string
  parsedAttempts: string
  parsedErrorCounts: string
  parsedFeedback: string
  needsReview: string
  computedAppliedCountIfApplied: number
  uiStatusWouldShow: string
  rawEvents: IphonePhysicalOnResultLog[]
  forensicEvents: SpeechForensicEvent[]
}): string {
  const c = report.counters
  return [
    '=== HYPER iPhone physical voice diagnostic ===',
    'NO audio. NO DB write. NO server log. Teacher copy-paste only.',
    `dryRun=${report.dryRun ? 'YES (parse preview only; drafts/save skipped)' : 'NO'}`,
    `sessionId=${report.sessionId}`,
    `recognitionGeneration=${report.recognitionGeneration}`,
    `eventSequenceNumber=${report.eventSequenceNumber}`,
    '',
    '--- COUNTERS (do not collapse into 건 반영) ---',
    `recognitionEventCount=${c.recognitionEventCount}`,
    `interimCallbackCount=${c.interimCallbackCount}`,
    `finalCallbackCount=${c.finalCallbackCount}`,
    `routeCallCount=${c.routeCallCount}`,
    `parserCallCount=${c.parserCallCount}`,
    `draftApplyCount=${c.draftApplyCount}`,
    `reactStatePatchCount=${c.reactStatePatchCount}`,
    '',
    '--- UI "음성 입력 완료 · N건 반영" ---',
    `source=${UI_APPLIED_COUNT_SOURCE}`,
    `meaning=${UI_APPLIED_COUNT_MEANING}`,
    `computedAppliedCountIfApplied=${report.computedAppliedCountIfApplied}`,
    `uiStatusWouldShow=${report.uiStatusWouldShow}`,
    `draftApplyCount=${c.draftApplyCount}`,
    '',
    '--- TRANSCRIPTS ---',
    `liveTranscriptShown=${JSON.stringify(report.liveTranscriptShown)}`,
    `stableTranscript=${JSON.stringify(report.stableTranscript)}`,
    `mutableTranscript=${JSON.stringify(report.mutableTranscript)}`,
    `explicitStopTranscript=${JSON.stringify(report.explicitStopTranscript)}`,
    '',
    '--- FINAL SESSION / PARSER ---',
    `FINAL SESSION TRANSCRIPT=${JSON.stringify(report.explicitStopTranscript)}`,
    `PARSER INPUT=${JSON.stringify(report.parserInput)}`,
    `PARSED ATTEMPTS=${report.parsedAttempts}`,
    `PARSED ERROR COUNTS=${report.parsedErrorCounts}`,
    `PARSED FEEDBACK=${JSON.stringify(report.parsedFeedback)}`,
    `needsReview=${report.needsReview}`,
    '',
    '--- FINAL RAW EVENT SNAPSHOT ---',
    report.rawEvents.length
      ? formatRawEvent(report.rawEvents[report.rawEvents.length - 1]!)
      : '(no onresult events)',
    '',
    '--- ALL ONRESULT EVENTS ---',
    report.rawEvents.length ? report.rawEvents.map(formatRawEvent).join('\n') : '(none)',
    '',
    '--- FORENSIC ENGINE LOG ---',
    report.forensicEvents.length
      ? report.forensicEvents
          .map(
            (event) =>
              `#${event.order} dt=${event.timestampMs}ms ${event.kind} gen=${event.recognitionGenerationId} note=${event.note ?? ''} live=${JSON.stringify(event.liveTranscript ?? '')}`,
          )
          .join('\n')
      : '(none)',
  ].join('\n')
}

export function finalizePhysicalDailyTestVoicePath<T extends {
  rounds: Array<{ round: 1 | 2 | 3 | 4; score: string; passed: boolean }>
  learningDiagnosis: DailyLearningDiagnosisData
}>(args: {
  capture: PhysicalVoiceSessionCapture
  drafts: Record<string, T>
  cardStudent: VoiceStudentRef
  students: VoiceStudentRef[]
  attendance: AttendanceRecord[]
  date: string
  absent: boolean
}): {
  drafts: Record<string, T>
  parseResult: StudentDailyTestParseResult | null
  summary: VoiceApplySummary | null
  report: IphonePhysicalVoiceDiagnosticReport
} {
  const { capture } = args
  const counters = { ...capture.counters }
  const routed = capture.routed
  if (counters.routeCallCount === 0) counters.routeCallCount += 1
  const parserInput = routed.kind === 'form-fill' ? routed.transcript : ''
  let parseResult: StudentDailyTestParseResult | null = null
  let drafts = args.drafts
  let summary: VoiceApplySummary | null = null

  if (parserInput) {
    counters.parserCallCount += 1
    parseResult = parseStudentDailyTestVoice(
      parserInput,
      args.cardStudent,
      args.students,
      args.absent,
    )
  }

  const computedAppliedCountIfApplied = parseResult ? computedDailyTestAppliedCount(parseResult) : 0

  if (!capture.dryRun && parserInput) {
    counters.draftApplyCount += 1
    const applied = applyStudentDailyTestDraft(
      drafts,
      parserInput,
      args.cardStudent,
      args.students,
      args.attendance,
      args.date,
    )
    drafts = applied.drafts
    summary = applied.summary
    counters.reactStatePatchCount += 1
  }

  const lastRaw = capture.rawRecognitionEvents[capture.rawRecognitionEvents.length - 1]
  const sessionId = lastRaw?.sessionId ?? capture.heldTrace?.listenCycleId ?? 0
  const recognitionGeneration =
    lastRaw?.recognitionGeneration ?? capture.heldTrace?.recognitionGeneration ?? 0
  const eventSequenceNumber =
    lastRaw?.eventSequenceNumber ?? capture.rawRecognitionEvents.length
  const stableTranscript = capture.heldTrace?.accumulated ?? ''
  const mutableTranscript = capture.heldTrace?.committed ?? capture.rawTranscript
  const explicitStopTranscript = capture.rawTranscript
  const parsedFeedback = parseResult?.teacherFeedback?.trim() || '(none)'
  const uiStatusWouldShow = summary
    ? formatVoiceSummary(summary)
    : computedAppliedCountIfApplied > 0
      ? formatVoiceSummary({
          appliedCount: computedAppliedCountIfApplied,
          excludedAbsentCount: 0,
          needsReviewCount: parseResult?.needsReview.length ?? 0,
        })
      : '음성 입력 완료'

  const copyText = formatIphonePhysicalVoiceDiagnosticText({
    sessionId,
    recognitionGeneration,
    eventSequenceNumber,
    dryRun: capture.dryRun,
    counters,
    liveTranscriptShown: capture.liveTranscriptShown,
    stableTranscript,
    mutableTranscript,
    explicitStopTranscript,
    parserInput,
    parsedAttempts: formatAttempts(parseResult),
    parsedErrorCounts: formatErrorCounts(parseResult),
    parsedFeedback,
    needsReview: formatNeedsReview(parseResult, summary),
    computedAppliedCountIfApplied,
    uiStatusWouldShow: capture.dryRun
      ? `음성 진단 완료 · 초안 미반영 (if applied would show: ${uiStatusWouldShow})`
      : uiStatusWouldShow,
    rawEvents: capture.rawRecognitionEvents,
    forensicEvents: capture.forensicEvents,
  })

  return {
    drafts,
    parseResult,
    summary,
    report: {
      sessionId,
      recognitionGeneration,
      eventSequenceNumber,
      dryRun: capture.dryRun,
      counters,
      liveTranscriptShown: capture.liveTranscriptShown,
      stableTranscript,
      mutableTranscript,
      explicitStopTranscript,
      parserInput,
      parsedAttempts: formatAttempts(parseResult),
      parsedErrorCounts: formatErrorCounts(parseResult),
      parsedFeedback,
      needsReview: formatNeedsReview(parseResult, summary),
      computedAppliedCountIfApplied,
      uiStatusWouldShow: capture.dryRun
        ? `음성 진단 완료 · 초안 미반영 (if applied would show: ${uiStatusWouldShow})`
        : uiStatusWouldShow,
      copyText,
    },
  }
}

export function previewIphonePhysicalVoiceDiagnosticReport(): IphonePhysicalVoiceDiagnosticReport {
  const counters = emptyPhysicalVoicePathCounters()
  counters.recognitionEventCount = 75
  counters.interimCallbackCount = 75
  counters.finalCallbackCount = 1
  counters.routeCallCount = 1
  counters.parserCallCount = 1
  counters.draftApplyCount = 0
  counters.reactStatePatchCount = 0
  const copyText = formatIphonePhysicalVoiceDiagnosticText({
    sessionId: 1,
    recognitionGeneration: 1,
    eventSequenceNumber: 75,
    dryRun: true,
    counters,
    liveTranscriptShown:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    stableTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    mutableTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    explicitStopTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    parserInput:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    parsedAttempts: '1차=30, 2차=50, 3차=100',
    parsedErrorCounts:
      'conceptLackCount=(unset) · calculationErrorCount=(unset) · applicationLackCount=(unset)',
    parsedFeedback: '나날이 속도가 빨라지고 정확도가 높아지고 있음',
    needsReview: '(none)',
    computedAppliedCountIfApplied: 4,
    uiStatusWouldShow: '음성 진단 완료 · 초안 미반영 (if applied would show: 음성 입력 완료 · 4건 반영)',
    rawEvents: [],
    forensicEvents: [],
  })
  return {
    sessionId: 1,
    recognitionGeneration: 1,
    eventSequenceNumber: 75,
    dryRun: true,
    counters,
    liveTranscriptShown:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    stableTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    mutableTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    explicitStopTranscript:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    parserInput:
      '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음',
    parsedAttempts: '1차=30, 2차=50, 3차=100',
    parsedErrorCounts:
      'conceptLackCount=(unset) · calculationErrorCount=(unset) · applicationLackCount=(unset)',
    parsedFeedback: '나날이 속도가 빨라지고 정확도가 높아지고 있음',
    needsReview: '(none)',
    computedAppliedCountIfApplied: 4,
    uiStatusWouldShow: '음성 진단 완료 · 초안 미반영 (if applied would show: 음성 입력 완료 · 4건 반영)',
    copyText,
  }
}

export async function copyTextToClipboard(text: string): Promise<'clipboard' | 'selected' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'clipboard'
    }
  } catch {
    /* iPhone may reject clipboard without a secure user gesture; fall through. */
  }
  return 'failed'
}
