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
  onstart: (() => void) | null
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
  return text
    .replace(/\s+/g, ' ')
    .replace(/(불합격|합격)(?=[1-4])/g, '$1 ')
    .replace(/([1-4]\s*차)(?=\d)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactTranscriptKey(text: string): string {
  return text.replace(/\s+/g, '')
}

function isHypothesisAbsorbed(committed: string, fragment: string): boolean {
  const next = normalizeTranscript(fragment)
  if (!next) return true
  const committedKey = compactTranscriptKey(committed)
  const fragmentKey = compactTranscriptKey(next)
  if (!fragmentKey) return true
  if (compactFinalHypotheses([committed, next]) === committed) return true
  return fragmentKey.length >= 4 && committedKey.includes(fragmentKey)
}

function commonCompactPrefixLength(prev: string, next: string): number {
  const prevKey = compactTranscriptKey(prev)
  const nextKey = compactTranscriptKey(next)
  let i = 0
  while (i < prevKey.length && i < nextKey.length && prevKey[i] === nextKey[i]) i += 1
  return i
}

/**
 * Same Web Speech resultIndex is a replacement slot, not a new utterance.
 * Growing/shrinking prefixes keep the longer text (PR #31).
 * Divergent hypotheses that still share a substantial prefix are corrections:
 * take the newest. Non-overlapping text is treated as iOS index reuse and concatenated.
 */
export function reconcileSameIndexHypothesis(prevRaw: string | undefined, nextRaw: string): string {
  const prev = normalizeTranscript(prevRaw ?? '')
  const next = normalizeTranscript(nextRaw)
  if (!next) return prev
  if (!prev) return next
  const prevKey = compactTranscriptKey(prev)
  const nextKey = compactTranscriptKey(next)
  if (nextKey === prevKey) return prev
  if (nextKey.startsWith(prevKey)) return next
  if (prevKey.startsWith(nextKey)) return prev
  if (nextKey.length >= 2 && prevKey.endsWith(nextKey)) return prev
  if (prevKey.length >= 2 && nextKey.endsWith(prevKey) && nextKey.length > prevKey.length) {
    return next
  }
  const shared = commonCompactPrefixLength(prev, next)
  const shorter = Math.min(prevKey.length, nextKey.length)
  if (shared >= 4 && shared >= Math.ceil(shorter / 2)) return next
  return compactFinalHypotheses([prev, next])
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
  if (nextKey.length >= 2 && lastKey.endsWith(nextKey)) return committed
  if (lastKey.length >= 2 && nextKey.endsWith(lastKey) && nextKey.length > lastKey.length) {
    return [...committed.slice(0, -1), next]
  }
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
/** Retry delay only after start() throws InvalidStateError. Samsung immediate restart is tried first. */
export const HELD_SPEECH_RESTART_RETRY_MS = 200

export type HeldSpeechState = {
  userStopped: boolean
  unmounted: boolean
  fatalError: boolean
  restartDisabled: boolean
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
    restartDisabled: false,
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
    !state.restartDisabled &&
    state.restartCount < maxRestarts
  )
}

export type HeldSpeechEvent =
  | { type: 'committed'; text: string }
  | { type: 'browser-end' }
  | { type: 'user-stop' }
  | { type: 'unmount' }
  | { type: 'error'; code: string }
  | { type: 'restart-blocked' }

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
  if (event.type === 'restart-blocked') {
    return {
      state: { ...state, restartDisabled: true },
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
  if (merged.restartDisabled && !merged.userStopped) {
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
  let lastInterim = ''
  let consumed = false

  return {
    ingest(event: SpeechRecognitionResultEventLike): { display: string } {
      let interim = ''
      const start = Math.max(0, event.resultIndex ?? 0)
      for (let i = start; i < event.results.length; i += 1) {
        const piece = event.results[i]
        const text = normalizeTranscript(piece[0]?.transcript ?? '')
        if (!text) continue
        if (piece.isFinal) {
          // Same resultIndex is a replacement slot. Reconcile; do not blindly overwrite
          // a longer final with a later prefix (PR #31) or concatenate a word correction.
          finalsByIndex[i] = reconcileSameIndexHypothesis(finalsByIndex[i], text)
        } else interim += text
      }
      const eventInterim = normalizeTranscript(interim)
      const committed = compactFinalHypotheses(finalsByIndex)
      if (eventInterim) {
        lastInterim = lastInterim
          ? reconcileSameIndexHypothesis(lastInterim, eventInterim)
          : eventInterim
      }
      if (lastInterim && isHypothesisAbsorbed(committed, lastInterim)) lastInterim = ''
      const display = lastInterim
        ? compactFinalHypotheses([committed, lastInterim])
        : committed
      return { display: normalizeTranscript(display) }
    },

    peekCommitted(): string {
      return compactFinalHypotheses(finalsByIndex)
    },

    /** WebKit/iOS often ends a session with interim-only results (isFinal never set). */
    peekHoldTranscript(): string {
      const committed = compactFinalHypotheses(finalsByIndex)
      if (!lastInterim || isHypothesisAbsorbed(committed, lastInterim)) return committed
      return compactFinalHypotheses([committed, lastInterim])
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

/** Observational held-speech snapshot. Does not change restart/apply timing. */
export type HeldSpeechTrace = {
  accumulated: string
  restartCount: number
  userStopped: boolean
  restartDisabled?: boolean
  listenCycleId?: number
  recognitionGeneration?: number
  eventSeq?: number
  resultIndex?: number
  lastRaw?: string
  lastIsFinal?: boolean
  interim?: string
  committed?: string
  lifecycle?: string[]
}

export type SpeechRecognitionEngineDeps = {
  getCtor?: () => SpeechRecognitionCtor | null
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  cancelSchedule?: (id: ReturnType<typeof setTimeout>) => void
}

function errorName(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string') {
    return (err as { name: string }).name
  }
  return ''
}

let nextListenCycleId = 1

function emitHeldApply(
  handlers: {
    onFinal?: (text: string) => void
    onHeldTrace?: (trace: HeldSpeechTrace) => void
  },
  state: HeldSpeechState,
  text: string,
  extra: Partial<HeldSpeechTrace> = {},
) {
  handlers.onHeldTrace?.({
    accumulated: text,
    restartCount: state.restartCount,
    userStopped: state.userStopped,
    restartDisabled: state.restartDisabled,
    committed: text,
    ...extra,
  })
  handlers.onFinal?.(text)
}

/**
 * Browser Web Speech API only. No audio recording, no remote STT provider, no secrets.
 * Callers must treat unsupported / error as a fallback-to-text path.
 *
 * Hold mode (daily-test): Android Chrome auto-end still restarts immediately on the
 * same instance (Samsung path). If start() throws InvalidStateError / NotAllowedError
 * after a live session — typical WebKit/iOS restart restriction — auto-restart is
 * disabled for this session and accumulated text is applied on explicit stop only.
 */
export function startKoreanSpeechRecognition(
  handlers: {
    onInterim?: (text: string) => void
    onFinal?: (text: string) => void
    onHeldTrace?: (trace: HeldSpeechTrace) => void
    onError: (message: string, code: string) => void
    onEnd: () => void
    holdUntilExplicitStop?: boolean
  },
  deps: SpeechRecognitionEngineDeps = {},
): LiveSpeechSession | null {
  const Ctor = (deps.getCtor ?? getSpeechRecognitionCtor)()
  if (!Ctor) return null

  const schedule = deps.schedule ?? ((fn, ms) => setTimeout(fn, ms))
  const cancelSchedule = deps.cancelSchedule ?? ((id) => clearTimeout(id))

  const recognition = new Ctor()
  recognition.lang = 'ko-KR'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  const hold = Boolean(handlers.holdUntilExplicitStop)
  const listenCycleId = nextListenCycleId++
  let recognitionGeneration = 0
  let eventSeq = 0
  const lifecycle: string[] = []
  let stopped = false
  let ended = false
  let engineActive = false
  let hadSuccessfulStart = false
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  let transcriptSession = createSpeechTranscriptSession()
  let held = createHeldSpeechState()

  const recordLifecycle = (line: string) => {
    eventSeq += 1
    lifecycle.push(`#${eventSeq} g${recognitionGeneration} ${line}`)
    if (lifecycle.length > 20) lifecycle.shift()
  }

  const traceExtra = (more: Partial<HeldSpeechTrace> = {}): Partial<HeldSpeechTrace> => ({
    listenCycleId,
    recognitionGeneration,
    eventSeq,
    lifecycle: [...lifecycle],
    committed: transcriptSession.peekHoldTranscript(),
    ...more,
  })

  const clearRestartTimer = () => {
    if (restartTimer != null) {
      cancelSchedule(restartTimer)
      restartTimer = null
    }
  }

  const displayHeld = (interim = '') => {
    const committed = accumulateHeldFragments(held.accumulated, held.currentCommitted)
    handlers.onInterim?.(normalizeTranscript([committed, interim].filter(Boolean).join(' ')))
  }

  const foldCurrentSession = () => {
    held = reduceHeldSpeech(held, {
      type: 'committed',
      text: transcriptSession.peekHoldTranscript(),
    }).state
    const accumulated = accumulateHeldFragments(held.accumulated, held.currentCommitted)
    held = { ...held, accumulated, currentCommitted: '' }
  }

  const finalizeHoldApply = () => {
    if (held.applied) return
    foldCurrentSession()
    const next = reduceHeldSpeech(held, { type: 'browser-end' })
    held = next.state
    if (next.apply != null) {
      recordLifecycle(`apply ${next.apply}`)
      emitHeldApply(handlers, next.state, next.apply, traceExtra({ accumulated: next.apply }))
    }
  }

  const tryStartEngine = (retry: boolean): 'started' | 'retry' | 'blocked' => {
    try {
      recognition.start()
      hadSuccessfulStart = true
      engineActive = true
      return 'started'
    } catch (err) {
      const name = errorName(err)
      if (name === 'InvalidStateError' && !retry) return 'retry'
      return 'blocked'
    }
  }

  let stopAfterRestart = false

  const finishStoppedSession = () => {
    finalizeHoldApply()
    handlers.onEnd()
  }

  const scheduleRestart = () => {
    if (held.applied || held.restartDisabled) return
    if (stopped && !stopAfterRestart) return
    recordLifecycle('restart attempt')
    const begin = tryStartEngine(false)
    if (begin === 'started') {
      foldCurrentSession()
      recognitionGeneration += 1
      transcriptSession = createSpeechTranscriptSession()
      recordLifecycle('restart ok')
      if (stopAfterRestart) {
        try {
          recognition.stop()
        } catch {
          finishStoppedSession()
        }
      }
      return
    }
    if (begin === 'retry') {
      clearRestartTimer()
      restartTimer = schedule(() => {
        restartTimer = null
        if (held.applied || held.restartDisabled) return
        if (stopped && !stopAfterRestart) return
        const second = tryStartEngine(true)
        if (second === 'started') {
          foldCurrentSession()
          recognitionGeneration += 1
          transcriptSession = createSpeechTranscriptSession()
          recordLifecycle('restart ok delayed')
          if (stopAfterRestart) {
            try {
              recognition.stop()
            } catch {
              finishStoppedSession()
            }
          }
          return
        }
        recordLifecycle('restart fail delayed')
        held = reduceHeldSpeech(held, { type: 'restart-blocked' }).state
        if (stopAfterRestart) finishStoppedSession()
      }, HELD_SPEECH_RESTART_RETRY_MS)
      return
    }
    recordLifecycle('restart fail')
    held = reduceHeldSpeech(held, { type: 'restart-blocked' }).state
    if (stopAfterRestart) finishStoppedSession()
  }

  recognition.onstart = () => {
    engineActive = true
    hadSuccessfulStart = true
  }

  recognition.onresult = (event) => {
    if (held.applied) return
    const { display } = transcriptSession.ingest(event)
    const first = event.results[event.resultIndex ?? 0]
    recordLifecycle(
      `result idx=${event.resultIndex ?? 0} final=${Boolean(first?.isFinal)} raw=${display}`,
    )
    if (!hold) {
      handlers.onInterim?.(display)
      return
    }
    const committed = transcriptSession.peekHoldTranscript()
    held = reduceHeldSpeech(held, { type: 'committed', text: committed }).state
    handlers.onHeldTrace?.({
      accumulated: accumulateHeldFragments(held.accumulated, held.currentCommitted),
      restartCount: held.restartCount,
      userStopped: held.userStopped,
      restartDisabled: held.restartDisabled,
      ...traceExtra({
        resultIndex: event.resultIndex ?? 0,
        lastRaw: display,
        lastIsFinal: Boolean(first?.isFinal),
        interim: display,
        committed,
      }),
    })
    const interim = normalizeTranscript(display.slice(committed.length))
    displayHeld(interim)
  }

  recognition.onerror = (event) => {
    const code = String(event.error ?? 'unknown')
    if (hold) {
      if (code === 'aborted' && stopped) return
      if (
        hadSuccessfulStart &&
        held.restartCount > 0 &&
        (code === 'not-allowed' || code === 'service-not-allowed') &&
        !stopped
      ) {
        held = reduceHeldSpeech(held, { type: 'restart-blocked' }).state
        return
      }
      const next = reduceHeldSpeech(held, { type: 'error', code })
      held = next.state
      if (next.showError) handlers.onError(speechErrorMessage(code), code)
      return
    }
    if (code === 'aborted' && stopped) return
    handlers.onError(speechErrorMessage(code), code)
  }

  recognition.onend = () => {
    engineActive = false
    if (hold) {
      if (held.applied) {
        handlers.onEnd()
        return
      }
      recordLifecycle('onend')
      held = reduceHeldSpeech(held, {
        type: 'committed',
        text: transcriptSession.peekHoldTranscript(),
      }).state
      const next = reduceHeldSpeech(held, { type: 'browser-end' })
      held = next.state
      if (next.apply != null) {
        recordLifecycle(`apply ${next.apply}`)
        emitHeldApply(handlers, next.state, next.apply, traceExtra({ accumulated: next.apply }))
      }
      if (next.restart && !stopped) {
        scheduleRestart()
        return
      }
      if (!stopped && held.restartDisabled && !held.applied) return
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
    hadSuccessfulStart = true
    engineActive = true
    recordLifecycle('start')
  } catch {
    handlers.onError('음성 인식을 시작할 수 없습니다.', 'unknown')
    return null
  }

  return {
    stop: () => {
      stopped = true
      if (hold) {
        recordLifecycle('user-stop')
        held = reduceHeldSpeech(held, { type: 'user-stop' }).state
      }
      if (hold && restartTimer != null) {
        stopAfterRestart = true
        return
      }
      clearRestartTimer()
      if (hold && !engineActive) {
        finishStoppedSession()
        return
      }
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          if (hold) finalizeHoldApply()
          handlers.onEnd()
        }
      }
    },
  }
}
