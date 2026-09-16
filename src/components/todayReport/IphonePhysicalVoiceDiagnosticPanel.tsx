import { useRef, useState } from 'react'
import type { IphonePhysicalVoiceDiagnosticReport } from '../../utils/voiceInput/iphonePhysicalVoiceDiagnostic'
import { copyTextToClipboard } from '../../utils/voiceInput/iphonePhysicalVoiceDiagnostic'

const wrapClass =
  'w-full min-w-0 max-w-full whitespace-pre-wrap break-all text-[11px] leading-4 [overflow-wrap:anywhere]'

export function IphonePhysicalVoiceDiagnosticToggle({
  enabled,
  onToggle,
  compact = false,
}: {
  enabled: boolean
  onToggle: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      data-iphone-voice-diagnostic-toggle="true"
      aria-pressed={enabled}
      onClick={onToggle}
      className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-2.5 text-[11px] font-semibold ${
        enabled
          ? 'border-amber-400 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-white text-slate-600'
      } ${compact ? 'min-h-8 px-2' : ''}`}
    >
      음성 진단
    </button>
  )
}

export function IphonePhysicalVoiceDiagnosticPanel({
  report,
  idleHint = false,
}: {
  report?: IphonePhysicalVoiceDiagnosticReport | null
  idleHint?: boolean
}) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [copyState, setCopyState] = useState('')

  const text = report?.copyText ?? ''

  const handleCopy = async () => {
    if (!text) return
    const result = await copyTextToClipboard(text)
    if (result === 'clipboard') {
      setCopyState('복사됨. 붙여넣어 보내 주세요.')
      return
    }
    const node = textRef.current
    if (node) {
      node.focus()
      node.select()
      try {
        const ok = document.execCommand('copy')
        setCopyState(ok ? '복사됨. 붙여넣어 보내 주세요.' : '아래 글을 길게 눌러 복사해 주세요.')
        return
      } catch {
        setCopyState('아래 글을 길게 눌러 복사해 주세요.')
        return
      }
    }
    setCopyState('아래 글을 길게 눌러 복사해 주세요.')
  }

  return (
    <div
      data-iphone-voice-diagnostic="true"
      className="mt-1 w-full min-w-0 max-w-full"
    >
      <div className="w-full min-w-0 max-w-full overflow-x-hidden rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-1.5">
        <p className="font-semibold text-[11px] text-amber-900">음성 진단 (초안 미반영)</p>
        <p className={`${wrapClass} mt-0.5 text-amber-900/80`}>
          {idleHint && !report
            ? '켠 뒤 마이크 → 말한 뒤 종료 → 진단 내용 복사. 점수 초안과 저장은 하지 않습니다.'
            : '실제 iPhone 인식 이벤트입니다. DevTools가 필요 없습니다.'}
        </p>
        {report ? (
          <>
            <p className={`${wrapClass} mt-1 font-medium text-slate-700`}>
              recognition={report.counters.recognitionEventCount} · interim=
              {report.counters.interimCallbackCount} · final=
              {report.counters.finalCallbackCount} · route=
              {report.counters.routeCallCount} · parser=
              {report.counters.parserCallCount} · apply=
              {report.counters.draftApplyCount} · reactPatch=
              {report.counters.reactStatePatchCount}
            </p>
            <button
              type="button"
              data-iphone-voice-diagnostic-copy="true"
              onClick={() => void handleCopy()}
              className="mt-1.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-400 bg-white px-2.5 text-[11px] font-semibold text-amber-900"
            >
              진단 내용 복사
            </button>
            {copyState ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-800">{copyState}</p>
            ) : null}
            <textarea
              ref={textRef}
              data-iphone-voice-diagnostic-text="true"
              readOnly
              value={text}
              rows={12}
              className="mt-1.5 min-h-[9rem] w-full max-w-full resize-y rounded-lg border border-amber-200 bg-white px-2 py-1.5 font-mono text-[10px] leading-4 text-slate-800"
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
