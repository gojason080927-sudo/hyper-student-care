import { Mic, Square } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  detectBrowserSpeechSupport,
  startKoreanSpeechRecognition,
  type HeldSpeechTrace,
  type LiveSpeechSession,
} from '../../utils/voiceInput/speechRecognition'
import { formatVoiceSummary } from '../../utils/voiceInput/parseVoiceTranscript'
import {
  routeVoiceTranscript,
  type VoiceTranscriptRoute,
} from '../../utils/voiceInput/voiceSaveCommand'
import type { VoiceApplySummary } from '../../utils/voiceInput/types'
import { formatHeldSpeechEndReason } from '../../utils/voiceInput/dailyTestVoiceDiagnostic'

export type VoiceSessionDiagnosticPayload = {
  rawTranscript: string
  routed: VoiceTranscriptRoute
  summary: VoiceApplySummary | null
  endReason: string
  heldTrace: HeldSpeechTrace | null
}

type SectionVoiceInputProps = {
  label: string
  chipLabel?: string
  compact?: boolean
  disabled?: boolean
  onApply: (transcript: string) => VoiceApplySummary
  /** Existing section bulk-save handler. Voice never writes to DB itself. */
  onSaveCommand?: () => void
  /** Daily-test student mic: user taps again to stop; browser onend does not apply. */
  explicitStop?: boolean
  /** Hide inline confirmation; parent (daily-test) renders diagnostic full-width. */
  hideStatus?: boolean
  onDiagnostic?: (payload: VoiceSessionDiagnosticPayload) => void
}

/**
 * Section-aware mic. Form-fill stays on the current draft.
 * “일괄 저장” calls this section’s existing save handler only — no direct DB write.
 */
export function SectionVoiceInput({
  label,
  chipLabel,
  compact = false,
  disabled = false,
  onApply,
  onSaveCommand,
  explicitStop = false,
  hideStatus = false,
  onDiagnostic,
}: SectionVoiceInputProps) {
  const reactId = useId()
  const fallbackId = `${reactId}-fallback`
  const [support] = useState(detectBrowserSpeechSupport)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<VoiceApplySummary | null>(null)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [fallbackText, setFallbackText] = useState('')
  const sessionRef = useRef<LiveSpeechSession | null>(null)
  const appliedThisSessionRef = useRef(false)
  const heldTraceRef = useRef<HeldSpeechTrace | null>(null)
  const onSaveCommandRef = useRef(onSaveCommand)
  const onDiagnosticRef = useRef(onDiagnostic)
  const disabledRef = useRef(disabled)
  onSaveCommandRef.current = onSaveCommand
  onDiagnosticRef.current = onDiagnostic
  disabledRef.current = disabled

  useEffect(() => {
    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  const emitDiagnostic = (
    raw: string,
    routed: VoiceTranscriptRoute,
    summaryValue: VoiceApplySummary | null,
    source: 'speech' | 'typed',
  ) => {
    const held = source === 'speech' ? heldTraceRef.current : null
    onDiagnosticRef.current?.({
      rawTranscript: raw,
      routed,
      summary: summaryValue,
      heldTrace: held,
      endReason: formatHeldSpeechEndReason({
        source,
        userStopped: held?.userStopped ?? source === 'speech',
        restartCount: held?.restartCount ?? 0,
      }),
    })
  }

  const applyTranscript = (raw: string, source: 'speech' | 'typed' = 'speech') => {
    const routed = routeVoiceTranscript(raw)
    if (routed.kind === 'none') {
      emitDiagnostic(raw, routed, null, source)
      setError('인식된 내용이 없습니다. 텍스트로 입력할 수 있습니다.')
      setFallbackOpen(true)
      return
    }
    if (routed.kind === 'save-command') {
      emitDiagnostic(raw, routed, null, source)
      setSummary(null)
      setError('')
      setFallbackText('')
      setFallbackOpen(false)
      if (disabledRef.current) return
      onSaveCommandRef.current?.()
      return
    }
    const next = onApply(routed.transcript)
    emitDiagnostic(raw, routed, next, source)
    setSummary(next)
    setError('')
    setFallbackText('')
    setFallbackOpen(false)
  }

  const stopListening = () => {
    sessionRef.current?.stop()
    sessionRef.current = null
    setListening(false)
  }

  const startListening = () => {
    if (disabled || listening) return
    setError('')
    setSummary(null)
    setInterim('')
    appliedThisSessionRef.current = false
    heldTraceRef.current = null
    const session = startKoreanSpeechRecognition({
      holdUntilExplicitStop: explicitStop,
      onInterim: setInterim,
      onHeldTrace: (trace) => {
        heldTraceRef.current = trace
      },
      onFinal: (text) => {
        if (appliedThisSessionRef.current) return
        appliedThisSessionRef.current = true
        applyTranscript(text, 'speech')
      },
      onError: (message) => {
        setError(message)
        setFallbackOpen(true)
        setListening(false)
        sessionRef.current = null
      },
      onEnd: () => {
        setListening(false)
        sessionRef.current = null
      },
    })
    if (!session) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.')
      setFallbackOpen(true)
      return
    }
    sessionRef.current = session
    setListening(true)
  }

  const submitFallback = () => {
    applyTranscript(fallbackText, 'typed')
  }

  const btn = compact
    ? 'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold'
    : 'inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold'

  return (
    <div className="min-w-0 w-full max-w-full" data-voice-input="true">
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
        {support === 'supported' ? (
          <button
            type="button"
            aria-label={listening ? `${label} 중지` : label}
            disabled={disabled}
            onClick={() => {
              if (listening) stopListening()
              else startListening()
            }}
            className={`${btn} ${
              listening
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {listening ? (
              <Square className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {listening && explicitStop ? (
              <span className="shrink-0">듣는 중 · 종료</span>
            ) : chipLabel ? (
              <span className="max-w-[5.5rem] truncate">{chipLabel}</span>
            ) : null}
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-500">음성 미지원</span>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setFallbackOpen((open) => !open)}
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50`}
          aria-expanded={fallbackOpen}
          aria-controls={fallbackId}
        >
          텍스트
        </button>
      </div>
      {listening && explicitStop ? (
        <p className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-rose-800 [overflow-wrap:anywhere]">
          🔴 듣는 중 · 다 말한 뒤 종료를 누르세요
        </p>
      ) : null}
      {listening && interim ? (
        <p className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">
          듣는 중: {interim}
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-amber-800 [overflow-wrap:anywhere]">
          {error}
        </p>
      ) : null}
      {summary && !hideStatus ? (
        <p
          data-voice-summary="true"
          className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-slate-600 [overflow-wrap:anywhere]"
        >
          {formatVoiceSummary(summary)}
          {summary.needsReview[0]
            ? ` — ${summary.needsReview[0].label} ${summary.needsReview[0].reason}`
            : ''}
        </p>
      ) : null}
      {fallbackOpen ? (
        <div id={fallbackId} className="mt-1.5 min-w-0 space-y-1">
          <textarea
            value={fallbackText}
            onChange={(event) => setFallbackText(event.target.value)}
            disabled={disabled}
            rows={2}
            placeholder="인식 문장을 붙여넣고 반영"
            className="min-h-[2.5rem] w-full max-w-full resize-y rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={submitFallback}
            className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700"
          >
            텍스트 반영
          </button>
        </div>
      ) : null}
    </div>
  )
}
