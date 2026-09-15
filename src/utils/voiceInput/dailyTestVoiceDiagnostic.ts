import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import type { StudentDailyTestParseResult } from './parseStudentDailyTestVoice.ts'
import type { VoiceApplySummary } from './types.ts'
import { routeVoiceTranscript, type VoiceTranscriptRoute } from './voiceSaveCommand.ts'

export type DailyTestVoiceDiagnosticKind = 'form-fill' | 'save-command' | 'none'

export type DailyTestVoiceEndSource = 'speech' | 'typed'

export type DailyTestVoiceDiagnosticSnapshot = {
  /** Held-speech accumulated raw transcript (not the last fragment). */
  accumulatedRaw: string
  parserInput: string
  /** parseStudentDailyTestVoice.teacherFeedback, or 없음 */
  parsedFeedback: string
  applyResultText: string
  endReason: string
  kind: DailyTestVoiceDiagnosticKind
  attemptApplyCount: number
  wrongCauseApplyCount: number
  feedbackApplyCount: number
  appliedCount: number
  needsReviewCount: number
  needsReviewReason: string
  summaryText: string
}

function emptySummary(): VoiceApplySummary {
  return {
    appliedCount: 0,
    excludedAbsentCount: 0,
    needsReviewCount: 0,
    needsReview: [],
  }
}

/** Exact string parseStudentDailyTestVoice receives after routing. */
export function parserInputFromRouted(routed: VoiceTranscriptRoute): string {
  return routed.kind === 'form-fill' ? routed.transcript : ''
}

export function formatHeldSpeechEndReason(args: {
  source?: DailyTestVoiceEndSource
  userStopped?: boolean
  restartCount?: number
}): string {
  if (args.source === 'typed') return '텍스트 입력'
  const restartCount = args.restartCount ?? 0
  const userStopped = Boolean(args.userStopped)
  if (userStopped && restartCount > 0) return '브라우저 자동 종료 → 재시작 → 사용자 종료'
  if (userStopped) return '사용자 종료'
  if (restartCount > 0) return '브라우저 자동 종료 → 재시작'
  return '브라우저 자동 종료'
}

export function formatParsedFeedback(parseResult: StudentDailyTestParseResult | null | undefined): string {
  const text = parseResult?.teacherFeedback?.trim()
  return text ? text : '없음'
}

export function formatDailyTestVoiceApplyResult(
  parseResult: StudentDailyTestParseResult | null | undefined,
  summary: VoiceApplySummary | null,
): { text: string; attemptApplyCount: number; wrongCauseApplyCount: number; feedbackApplyCount: number } {
  const attemptApplyCount = parseResult?.attempts.length ?? 0
  const wrongCauseApplyCount =
    (parseResult?.conceptLackCount !== undefined ? 1 : 0) +
    (parseResult?.calculationErrorCount !== undefined ? 1 : 0) +
    (parseResult?.applicationLackCount !== undefined ? 1 : 0)
  const feedbackApplyCount = parseResult?.teacherFeedback ? 1 : 0
  const needsReviewCount = parseResult?.needsReview.length ?? summary?.needsReviewCount ?? 0
  return {
    attemptApplyCount,
    wrongCauseApplyCount,
    feedbackApplyCount,
    text: `차시 적용: ${attemptApplyCount} · 오답분석 적용: ${wrongCauseApplyCount} · 피드백 적용: ${feedbackApplyCount} · 확인 필요: ${needsReviewCount}`,
  }
}

export function buildDailyTestVoiceDiagnostic(args: {
  accumulatedRaw: string
  routed: VoiceTranscriptRoute
  summary: VoiceApplySummary | null
  parseResult?: StudentDailyTestParseResult | null
  endReason: string
}): DailyTestVoiceDiagnosticSnapshot {
  const { accumulatedRaw, routed, summary, parseResult, endReason } = args
  if (routed.kind === 'save-command') {
    return {
      accumulatedRaw,
      parserInput: '',
      parsedFeedback: '없음',
      applyResultText: '저장 명령 · 차시 점수 입력 아님',
      endReason,
      kind: 'save-command',
      attemptApplyCount: 0,
      wrongCauseApplyCount: 0,
      feedbackApplyCount: 0,
      appliedCount: 0,
      needsReviewCount: 0,
      needsReviewReason: '',
      summaryText: '저장 명령 · 차시 점수 입력 아님',
    }
  }
  if (routed.kind === 'none') {
    return {
      accumulatedRaw,
      parserInput: '',
      parsedFeedback: '없음',
      applyResultText: '인식된 내용이 없습니다',
      endReason,
      kind: 'none',
      attemptApplyCount: 0,
      wrongCauseApplyCount: 0,
      feedbackApplyCount: 0,
      appliedCount: 0,
      needsReviewCount: 0,
      needsReviewReason: '인식된 내용이 없습니다',
      summaryText: '인식된 내용이 없습니다',
    }
  }
  const next = summary ?? emptySummary()
  const reason = next.needsReview[0]
    ? `${next.needsReview[0].label} ${next.needsReview[0].reason}`.trim()
    : ''
  const apply = formatDailyTestVoiceApplyResult(parseResult, next)
  return {
    accumulatedRaw,
    parserInput: parserInputFromRouted(routed),
    parsedFeedback: formatParsedFeedback(parseResult),
    applyResultText: apply.text,
    endReason,
    kind: 'form-fill',
    attemptApplyCount: apply.attemptApplyCount,
    wrongCauseApplyCount: apply.wrongCauseApplyCount,
    feedbackApplyCount: apply.feedbackApplyCount,
    appliedCount: next.appliedCount,
    needsReviewCount: next.needsReviewCount,
    needsReviewReason: reason,
    summaryText: reason ? `${formatVoiceSummary(next)} — ${reason}` : formatVoiceSummary(next),
  }
}

export function buildDailyTestVoiceDiagnosticFromRaw(
  accumulatedRaw: string,
  summary: VoiceApplySummary | null,
  extras?: {
    parseResult?: StudentDailyTestParseResult | null
    endReason?: string
  },
): DailyTestVoiceDiagnosticSnapshot {
  return buildDailyTestVoiceDiagnostic({
    accumulatedRaw,
    routed: routeVoiceTranscript(accumulatedRaw),
    summary,
    parseResult: extras?.parseResult,
    endReason: extras?.endReason ?? formatHeldSpeechEndReason({ source: 'speech', userStopped: true }),
  })
}

export function setStudentVoiceDiagnostic(
  prev: Record<string, DailyTestVoiceDiagnosticSnapshot>,
  studentId: string,
  snapshot: DailyTestVoiceDiagnosticSnapshot,
): Record<string, DailyTestVoiceDiagnosticSnapshot> {
  return { ...prev, [studentId]: snapshot }
}
