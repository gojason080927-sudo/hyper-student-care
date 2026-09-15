import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import type { VoiceApplySummary } from './types.ts'
import { routeVoiceTranscript, type VoiceTranscriptRoute } from './voiceSaveCommand.ts'

export type DailyTestVoiceDiagnosticKind = 'form-fill' | 'save-command' | 'none'

export type DailyTestVoiceDiagnosticSnapshot = {
  rawTranscript: string
  parserInput: string
  kind: DailyTestVoiceDiagnosticKind
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

export function buildDailyTestVoiceDiagnostic(args: {
  rawTranscript: string
  routed: VoiceTranscriptRoute
  summary: VoiceApplySummary | null
}): DailyTestVoiceDiagnosticSnapshot {
  const { rawTranscript, routed, summary } = args
  if (routed.kind === 'save-command') {
    return {
      rawTranscript,
      parserInput: '',
      kind: 'save-command',
      appliedCount: 0,
      needsReviewCount: 0,
      needsReviewReason: '',
      summaryText: '저장 명령 · 차시 점수 입력 아님',
    }
  }
  if (routed.kind === 'none') {
    return {
      rawTranscript,
      parserInput: '',
      kind: 'none',
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
  const summaryCore = formatVoiceSummary(next)
  return {
    rawTranscript,
    parserInput: parserInputFromRouted(routed),
    kind: 'form-fill',
    appliedCount: next.appliedCount,
    needsReviewCount: next.needsReviewCount,
    needsReviewReason: reason,
    summaryText: reason ? `${summaryCore} — ${reason}` : summaryCore,
  }
}

export function buildDailyTestVoiceDiagnosticFromRaw(
  rawTranscript: string,
  summary: VoiceApplySummary | null,
): DailyTestVoiceDiagnosticSnapshot {
  return buildDailyTestVoiceDiagnostic({
    rawTranscript,
    routed: routeVoiceTranscript(rawTranscript),
    summary,
  })
}

export function setStudentVoiceDiagnostic(
  prev: Record<string, DailyTestVoiceDiagnosticSnapshot>,
  studentId: string,
  snapshot: DailyTestVoiceDiagnosticSnapshot,
): Record<string, DailyTestVoiceDiagnosticSnapshot> {
  return { ...prev, [studentId]: snapshot }
}
