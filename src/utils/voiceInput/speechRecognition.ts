export type BrowserSpeechSupport = 'supported' | 'unsupported'

export type SpeechRecognitionErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'network'
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'unknown'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type SpeechRecognitionResultEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

function normalizeTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function compactTranscriptKey(text: string): string {
  return text.replace(/\s+/g, '')
}

/**
 * Android Chrome often marks growing prefixes of the same utterance as isFinal.
 * Replace a prefix hypothesis with the longer text; keep distinct phrases.
 * Do not strip repeated words inside a single result.
 */
export function mergeFinalHypotheses(committed: string[], nextRaw: string): string[] {
  const next = normalizeTranscript(nextRaw)
  if (!next) return committed
  if (committed.length === 0) return [next]

  const last = committed[committed.length - 1]
  if (!last) return [...committed.slice(0, -1), next]

  const lastKey = compactTranscriptKey(last)
  const nextKey = compactTranscriptKey(next)
  if (nextKey === lastKey) return committed
  if (nextKey.startsWith(lastKey)) return [...committed.slice(0, -1), next]
  if (lastKey.startsWith(nextKey)) return committed
  return [...committed, next]
}

export function compactFinalHypotheses(pieces: Array<string | undefined>): string {
  let committed: string[] = []
  for (const piece of pieces) {
    if (!piece) continue
    committed = mergeFinalHypotheses(committed, piece)
  }
  return committed.join(' ').replace(/\s+/g, ' ').trim()
}

export const HELD_SPEECH_MAX_RESTARTS = 40

export type HeldSpeechState = {
  userStopped: boolean
  unmounted: boolean
  fatalError: boolean
  restartCount: number
  accumulated: string
  currentCommitted: string
  applied: boolean
}

export function createHeldSpeechState(): HeldSpeechState {
  return {
    userStopped: false,
    unmounted: false,
    fatalError: false,
    restartCount: 0,
    accumulated: '',
    currentCommitted: '',
    applied: false,
  }
}

export function isFatalHeldSpeechError(code: string): boolean {
  return (
    code === 'not-allowed' ||
    code === 'service-not-allowed' ||
    code === 'audio-capture' ||
    code === 'language-not-supported' ||
    code === 'bad-grammar'
  )
}

export function accumulateHeldFragments(prev: string, next: string): string {
  return compactFinalHypotheses([prev, next])
}

export function shouldRestartHeldSpeech(state: HeldSpeechState, maxRestarts = HELD_SPEECH_MAX_RESTARTS): boolean {
  return (
    !state.userStopped &&
    !state.unmounted &&
    !state.fatalError &&
    state.restartCount < maxRestarts
  )
}

export type HeldSpeechEvent =
  | { type: 'committed'; text: string }
  | { type: 'browser-end' }
  | { type: 'user-stop' }
  | { type: 'unmount' }
  | { type: 'error'; code: string }

export function reduceHeldSpeech(
  state: HeldSpeechState,
  event: HeldSpeechEvent,
  maxRestarts = HELD_SPEECH_MAX_RESTARTS,
): {
  state: HeldSpeechState
  restart: boolean
  apply: string | null
  showError: boolean
} {
  if (event.type === 'committed') {
    return {
      state: { ...state, currentCommitted: event.text },
      restart: false,
      apply: null,
      showError: false,
    }
  }
  if (event.type === 'user-stop') {
    return {
      state: { ...state, userStopped: true },
      restart: false,
      apply: null,
      showError: false,
    }
  }
  if (event.type === 'unmount') {
    return {
      state: { ...state, unmounted: true, userStopped: true },
      restart: false,
      apply: null,
      showError: false,
    }
  }
  if (event.type === 'error') {
    if (isFatalHeldSpeechError(event.code)) {
      return {
        state: { ...state, fatalError: true },
        restart: false,
        apply: null,
        showError: true,
      }
    }
    return { state, restart: false, apply: null, showError: false }
  }

  const accumulated = accumulateHeldFragments(state.accumulated, state.currentCommitted)
  const merged: HeldSpeechState = { ...state, accumulated, currentCommitted: '' }
  if (merged.unmounted) {
    return { state: merged, restart: false, apply: null, showError: false }
  }
  if (merged.userStopped) {
    if (merged.applied) {
      return { state: merged, restart: false, apply: null, showError: false }
    }
    return {
      state: { ...merged, applied: true },
      restart: false,
      apply: accumulated,
      showError: false,
    }
  }
  if (merged.fatalError) {
    return { state: merged, restart: false, apply: null, showError: false }
  }
  if (!shouldRestartHeldSpeech(merged, maxRestarts)) {
    if (!merged.applied && accumulated) {
      return {
        state: { ...merged, applied: true },
        restart: false,
        apply: accumulated,
        showError: false,
      }
    }
    return { state: merged, restart: false, apply: null, showError: false }
  }
  return {
    state: { ...merged, restartCount: merged.restartCount + 1 },
    restart: true,
    apply: null,
    showError: false,
  }
}

export function createSpeechTranscriptSession() {
  const finalsByIndex: string[] = []
  let consumed = false

  return {
    ingest(event: SpeechRecognitionResultEventLike): { display: string } {
      let interim = ''
      const start = Math.max(0, event.resultIndex ?? 0)
      for (let i = start; i < event.results.length; i += 1) {
        const piece = event.results[i]
        const text = normalizeTranscript(piece[0]?.transcript ?? '')
        if (!text) continue
        if (piece.isFinal) finalsByIndex[i] = text
        else interim += text
      }
      const committed = compactFinalHypotheses(finalsByIndex)
      const display = [committed, normalizeTranscript(interim)].filter(Boolean).join(' ')
      return { display: normalizeTranscript(display) }
    },

    peekCommitted(): string {
      return compactFinalHypotheses(finalsByIndex)
    },

    consumeFinal(): { text: string; delivered: boolean } {
      const text = compactFinalHypotheses(finalsByIndex)
      if (consumed) return { text, delivered: false }
      consumed = true
      return { text, delivered: true }
    },
  }
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function detectBrowserSpeechSupport(): BrowserSpeechSupport {
  return getSpeechRecognitionCtor() ? 'supported' : 'unsupported'
}

export function speechErrorMessage(code: string | undefined): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '마이크 권한이 필요합니다.'
  }
  if (code === 'audio-capture') {
    return '마이크를 찾을 수 없습니다.'
  }
  if (code === 'network') {
    return '음성 인식 네트워크 오류입니다.'
  }
  if (code === 'no-speech') {
    return '음성이 인식되지 않았습니다.'
  }
  if (code === 'language-not-supported') {
    return '한국어 음성 인식을 지원하지 않습니다.'
  }
  if (code === 'aborted') {
    return '음성 입력이 취소되었습니다.'
  }
  return '음성 인식에 실패했습니다.'
}

export type LiveSpeechSession = {
  stop: () => void
}

/**
 * Browser Web Speech API only. No audio recording, no remote STT provider, no secrets.
 * Callers must treat unsupported / error as a fallback-to-text path.
 */
export function startKoreanSpeechRecognition(handlers: {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onError: (message: string, code: string) => void
  onEnd: () => void
  holdUntilExplicitStop?: boolean
}): LiveSpeechSession | null {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = 'ko-KR'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  const hold = Boolean(handlers.holdUntilExplicitStop)
  let stopped = false
  let ended = false
  let transcriptSession = createSpeechTranscriptSession()
  let held = createHeldSpeechState()

  const displayHeld = (interim = '') => {
    const committed = accumulateHeldFragments(held.accumulated, held.currentCommitted)
    handlers.onInterim?.(normalizeTranscript([committed, interim].filter(Boolean).join(' ')))
  }

  recognition.onresult = (event) => {
    const { display } = transcriptSession.ingest(event)
    if (!hold) {
      handlers.onInterim?.(display)
      return
    }
    const committed = transcriptSession.peekCommitted()
    held = reduceHeldSpeech(held, { type: 'committed', text: committed }).state
    const interim = normalizeTranscript(display.slice(committed.length))
    displayHeld(interim)
  }

  recognition.onerror = (event) => {
    const code = String(event.error ?? 'unknown')
    if (hold) {
      const next = reduceHeldSpeech(held, { type: 'error', code })
      held = next.state
      if (code === 'aborted' && stopped) return
      if (next.showError) handlers.onError(speechErrorMessage(code), code)
      return
    }
    if (code === 'aborted' && stopped) return
    handlers.onError(speechErrorMessage(code), code)
  }

  recognition.onend = () => {
    if (hold) {
      held = reduceHeldSpeech(held, {
        type: 'committed',
        text: transcriptSession.peekCommitted(),
      }).state
      const next = reduceHeldSpeech(held, { type: 'browser-end' })
      held = next.state
      if (next.apply != null) handlers.onFinal?.(next.apply)
      if (next.restart && !stopped) {
        transcriptSession = createSpeechTranscriptSession()
        try {
          recognition.start()
        } catch {
          handlers.onError('음성 인식을 시작할 수 없습니다.', 'unknown')
          handlers.onEnd()
        }
        return
      }
      handlers.onEnd()
      return
    }
    if (ended) return
    ended = true
    const { text, delivered } = transcriptSession.consumeFinal()
    if (delivered && text) handlers.onFinal?.(text)
    handlers.onEnd()
  }

  try {
    recognition.start()
  } catch {
    handlers.onError('음성 인식을 시작할 수 없습니다.', 'unknown')
    return null
  }

  return {
    stop: () => {
      stopped = true
      if (hold) {
        held = reduceHeldSpeech(held, { type: 'user-stop' }).state
      }
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          if (hold) {
            const next = reduceHeldSpeech(held, { type: 'browser-end' })
            held = next.state
            if (next.apply != null) handlers.onFinal?.(next.apply)
          }
          handlers.onEnd()
        }
      }
    },
  }
}
