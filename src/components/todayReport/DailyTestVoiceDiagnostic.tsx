import type { DailyTestVoiceDiagnosticSnapshot } from '../../utils/voiceInput/dailyTestVoiceDiagnostic'

const wrapClass =
  'w-full min-w-0 max-w-full whitespace-pre-wrap break-all text-[11px] leading-4 [overflow-wrap:anywhere]'

/**
 * Daily-test student-mic only. Renders as a full-width sibling of the
 * name/mic row so confirmation cannot sit inside the header flex item
 * that shares width with the student name (that was the overflow root).
 */
export function DailyTestVoiceDiagnostic({
  snapshot,
}: {
  snapshot: DailyTestVoiceDiagnosticSnapshot
}) {
  const parseLine =
    snapshot.kind === 'save-command'
      ? '저장 명령 · 적용된 차시 0개'
      : `적용 ${snapshot.appliedCount} · 확인 필요 ${snapshot.needsReviewCount}`

  return (
    <div
      data-daily-test-voice-diagnostic="true"
      className="mt-1 w-full min-w-0 max-w-full space-y-1"
    >
      {snapshot.summaryText ? (
        <p data-voice-summary="true" className={`${wrapClass} text-slate-600`}>
          {snapshot.summaryText}
        </p>
      ) : null}
      <div className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <p className="font-semibold text-[11px] text-slate-600">음성 진단</p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">원본 인식</p>
        <p data-voice-raw-transcript="true" className={`${wrapClass} text-slate-800`}>
          {snapshot.rawTranscript || '—'}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">파서 입력</p>
        <p data-voice-parser-input="true" className={`${wrapClass} text-slate-800`}>
          {snapshot.parserInput || (snapshot.kind === 'save-command' ? '(점수 입력 아님)' : '—')}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">파싱 결과</p>
        <p data-voice-parse-result="true" className={`${wrapClass} text-slate-700`}>
          {parseLine}
          {snapshot.needsReviewReason ? `\n확인 필요: ${snapshot.needsReviewReason}` : ''}
        </p>
      </div>
    </div>
  )
}
