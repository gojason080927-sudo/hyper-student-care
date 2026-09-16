import { Mic, Square, LoaderCircle } from 'lucide-react'
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
import {
  detectAudioRecordingSupport,
  startAudioRecorder,
  type AudioRecorderSession,
} from '../../utils/voiceInput/audioRecorder'
import { transcribeRecordedAudio } from '../../utils/voiceInput/recordedSttClient'
import {
  STT_EMPTY_MESSAGE,
  STT_FAIL_MESSAGE,
  detectVoiceTransport,
  type VoiceTransportKind,
} from '../../utils/voiceInput/sttProtocol'

export type VoiceSessionDiagnosticPayload = {
  rawTranscript: string
  routed: VoiceTranscriptRoute
  summary: VoiceApplySummary | null
  endReason: string
  heldTrace: HeldSpeechTrace | null
}

type VoicePhase = 'idle' | 'recording' | 'transcribing'

type SectionVoiceInputProps = {
  label: string
  chipLabel?: string
  compact?: boolean
  disabled?: boolean
  onApply: (transcript: string) => VoiceApplySummary
  /** Existing section bulk-save handler. Voice never writes to DB itself. */
  onSaveCommand?: () => void
  /**
   * Today Report long-listen (daily-test reference). Always on: browser onend
   * restarts when possible; only the 종료 tap finalizes/applies.
   */
  explicitStop?: boolean
  /** Hide inline confirmation; parent (daily-test) renders diagnostic full-width. */
  hideStatus?: boolean
  onDiagnostic?: (payload: VoiceSessionDiagnosticPayload) => void
  /** Tests/preview only. Production uses detectVoiceTransport(). */
  forceVoiceTransport?: VoiceTransportKind
}

/**
 * Section-aware mic. Form-fill stays on the current draft.
 * “일괄 저장” calls this section’s existing save handler only — no direct DB write.
 * Android/desktop: daily-test holdUntilExplicitStop Web Speech session.
 * iPhone: recorded audio → server STT → one transcript → same parsers.
 */
export function SectionVoiceInput({
  label,
  chipLabel,
  compact = false,
  disabled = false,
  onApply,
  onSaveCommand,
  explicitStop = true,
  hideStatus = false,
  onDiagnostic,
  forceVoiceTransport,
}: SectionVoiceInputProps) {
  const reactId = useId()
  const fallbackId = `${reactId}-fallback`
  const [webkitSupport] = useState(detectBrowserSpeechSupport)
  const [recordSupport] = useState(detectAudioRecordingSupport)
  const [transport] = useState<VoiceTransportKind>(
    () => forceVoiceTransport ?? detectVoiceTransport(),
  )
  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<VoiceApplySummary | null>(null)
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [fallbackText, setFallbackText] = useState('')
  const sessionRef = useRef<LiveSpeechSession | null>(null)
  const recorderRef = useRef<AudioRecorderSession | null>(null)
  const appliedThisSessionRef = useRef(false)
  const heldTraceRef = useRef<HeldSpeechTrace | null>(null)
  const onSaveCommandRef = useRef(onSaveCommand)
  const onDiagnosticRef = useRef(onDiagnostic)
  const disabledRef = useRef(disabled)
  onSaveCommandRef.current = onSaveCommand
  onDiagnosticRef.current = onDiagnostic
  disabledRef.current = disabled

  const listening = phase === 'recording'
  const transcribing = phase === 'transcribing'
  const micAvailable = transport === 'recorded-stt' ? recordSupport : webkitSupport === 'supported'

  useEffect(() => {
    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
      recorderRef.current?.cancel()
      recorderRef.current = null
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
      setError(STT_EMPTY_MESSAGE)
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

  const failClosed = (message: string) => {
    setError(message)
    setFallbackOpen(true)
    setPhase('idle')
    setInterim('')
    sessionRef.current = null
    recorderRef.current = null
  }

  const stopListening = () => {
    if (transport === 'recorded-stt') {
      const recorder = recorderRef.current
      recorderRef.current = null
      if (!recorder) {
        setPhase('idle')
        return
      }
      setPhase('transcribing')
      void recorder
        .stop()
        .then(async (blob) => {
          if (appliedThisSessionRef.current) return
          appliedThisSessionRef.current = true
          if (!blob || blob.size <= 0) {
            failClosed(STT_FAIL_MESSAGE)
            return
          }
          const result = await transcribeRecordedAudio({
            blob,
            mimeType: blob.type || recorder.mimeType,
          })
          if (!result.ok) {
            failClosed(result.message)
            return
          }
          applyTranscript(result.transcript, 'speech')
          setPhase('idle')
        })
        .catch(() => {
          failClosed(STT_FAIL_MESSAGE)
        })
      return
    }
    sessionRef.current?.stop()
    sessionRef.current = null
    setPhase('idle')
  }

  const startListening = () => {
    if (disabled || phase !== 'idle') return
    setError('')
    setSummary(null)
    setInterim('')
    appliedThisSessionRef.current = false
    heldTraceRef.current = null

    if (transport === 'recorded-stt') {
      void startAudioRecorder()
        .then((recorder) => {
          recorderRef.current = recorder
          setPhase('recording')
        })
        .catch((err: unknown) => {
          const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            failClosed('마이크 권한이 필요합니다.')
            return
          }
          failClosed(STT_FAIL_MESSAGE)
        })
      return
    }

    const session = startKoreanSpeechRecognition({
      holdUntilExplicitStop: true,
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
        setPhase('idle')
        sessionRef.current = null
      },
      onEnd: () => {
        setPhase('idle')
        sessionRef.current = null
      },
    })
    if (!session) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.')
      setFallbackOpen(true)
      return
    }
    sessionRef.current = session
    setPhase('recording')
  }

  const submitFallback = () => {
    applyTranscript(fallbackText, 'typed')
  }

  const btn = compact
    ? 'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold'
    : 'inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold'

  const busy = listening || transcribing

  return (
    <div
      className="min-w-0 w-full max-w-full"
      data-voice-input="true"
      data-voice-transport={transport}
      data-voice-phase={phase}
    >
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
        {micAvailable ? (
          <button
            type="button"
            aria-label={
              transcribing ? `${label} 변환 중` : listening ? `${label} 중지` : label
            }
            data-hold-until-stop="true"
            data-voice-listening={listening ? 'true' : 'false'}
            data-explicit-stop={explicitStop ? 'true' : 'false'}
            disabled={disabled || transcribing}
            onClick={() => {
              if (transcribing) return
              if (listening) stopListening()
              else startListening()
            }}
            className={`${btn} ${
              listening || transcribing
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {transcribing ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : listening ? (
              <Square className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {transcribing ? (
              <span className="shrink-0">변환 중</span>
            ) : listening ? (
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
          disabled={disabled || transcribing}
          onClick={() => setFallbackOpen((open) => !open)}
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50`}
          aria-expanded={fallbackOpen}
          aria-controls={fallbackId}
        >
          텍스트
        </button>
      </div>
      {listening ? (
        <p
          data-voice-listening-hint=""
          className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-rose-800 [overflow-wrap:anywhere]"
        >
          🔴 듣는 중 · 다 말한 뒤 종료를 누르세요
        </p>
      ) : null}
      {transcribing ? (
        <p
          data-voice-transcribing="true"
          className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-rose-800 [overflow-wrap:anywhere]"
        >
          음성 변환 중...
        </p>
      ) : null}
      {listening && transport === 'webkit-speech' && interim ? (
        <p
          data-live-transcript=""
          className="mt-1 max-h-24 w-full min-w-0 max-w-full overflow-y-auto whitespace-pre-wrap break-keep text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]"
        >
          듣는 중: {interim}
        </p>
      ) : null}
      {error ? (
        <p
          data-voice-error="true"
          className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-amber-800 [overflow-wrap:anywhere]"
        >
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
            disabled={disabled || busy}
            rows={2}
            placeholder="인식 문장을 붙여넣고 반영"
            className="min-h-[2.5rem] w-full max-w-full resize-y rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
          />
          <button
            type="button"
            disabled={disabled || busy}
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
