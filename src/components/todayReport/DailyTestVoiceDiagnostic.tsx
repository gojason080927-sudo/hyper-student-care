import type { DailyTestVoiceDiagnosticSnapshot } from '../../utils/voiceInput/dailyTestVoiceDiagnostic'

const wrapClass =
  'w-full min-w-0 max-w-full whitespace-pre-wrap break-all text-[11px] leading-4 [overflow-wrap:anywhere]'

/**
 * Daily-test student-mic only. Full-width sibling under the name/mic row —
 * never inside the header flex item that shares width with the student name.
 */
export function DailyTestVoiceDiagnostic({
  snapshot,
}: {
  snapshot: DailyTestVoiceDiagnosticSnapshot
}) {
  return (
    <div
      data-daily-test-voice-diagnostic="true"
      className="mt-1 w-full min-w-0 max-w-full"
    >
      <div className="w-full min-w-0 max-w-full overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <p className="font-semibold text-[11px] text-slate-600">음성 진단</p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">누적 원본</p>
        <p data-voice-accumulated-raw="true" className={`${wrapClass} text-slate-800`}>
          {snapshot.accumulatedRaw || '—'}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">파서 입력</p>
        <p data-voice-parser-input="true" className={`${wrapClass} text-slate-800`}>
          {snapshot.parserInput || (snapshot.kind === 'save-command' ? '(점수 입력 아님)' : '—')}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">파싱된 피드백</p>
        <p data-voice-parsed-feedback="true" className={`${wrapClass} text-slate-800`}>
          {snapshot.parsedFeedback}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">적용 결과</p>
        <p data-voice-apply-result="true" className={`${wrapClass} text-slate-700`}>
          {snapshot.applyResultText}
        </p>
        <p className="mt-1 font-medium text-[10px] text-slate-500">종료 방식</p>
        <p data-voice-end-reason="true" className={`${wrapClass} text-slate-700`}>
          {snapshot.endReason}
        </p>
        {snapshot.lifecycleLog ? (
          <details className="mt-1 min-w-0 max-w-full">
            <summary className="cursor-pointer text-[10px] font-medium text-slate-500">
              음성 이벤트
              {snapshot.listenCycleId != null ? ` · cycle ${snapshot.listenCycleId}` : ''}
              {snapshot.recognitionGeneration != null
                ? ` · gen ${snapshot.recognitionGeneration}`
                : ''}
              {snapshot.voiceApplyCount != null ? ` · apply ${snapshot.voiceApplyCount}` : ''}
            </summary>
            <p data-voice-lifecycle="true" className={`${wrapClass} mt-1 text-slate-700`}>
              {snapshot.lifecycleLog}
            </p>
          </details>
        ) : null}
      </div>
    </div>
  )
}
