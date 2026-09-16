import {
  DEFAULT_RECONCILE_PROTECTIONS,
  mergeUtteranceHypotheses,
  normalizeHypothesisText,
  type ReconcileProtections,
} from './utteranceHypothesisMerge.ts'
import {
  createSpeechForensicRecorder,
  isSpeechForensicEnabled,
  nextSpeechLogicalSessionId,
  type SpeechForensicRecorder,
} from './speechForensic.ts'

export type { ReconcileProtections } from './utteranceHypothesisMerge.ts'
export {
  DEFAULT_RECONCILE_PROTECTIONS,
  mergeUtteranceHypotheses,
  withoutProtection,
} from './utteranceHypothesisMerge.ts'
export { createSpeechForensicRecorder, isSpeechForensicEnabled } from './speechForensic.ts'

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

/** Observational raw Web Speech onresult snapshot. Does not affect merge/apply. */
export type RawSpeechRecognitionCapture = {
  sessionId: number
  recognitionGeneration: number
  eventSequenceNumber: number
  timestampDeltaMs: number
  resultIndex: number
  resultsLength: number
  results: Array<{ index: number; isFinal: boolean; rawTranscript: string }>
  generationReady: boolean
  heldApplied: boolean
}

export function captureSpeechRecognitionResults(
  event: SpeechRecognitionResultEventLike,
): Array<{ index: number; isFinal: boolean; rawTranscript: string }> {
  const resultsLength = event.results.length
  const results: Array<{ index: number; isFinal: boolean; rawTranscript: string }> = []
  for (let i = 0; i < resultsLength; i += 1) {
    const piece = event.results[i]
    results.push({
      index: i,
      isFinal: Boolean(piece?.isFinal),
      rawTranscript: String(piece?.[0]?.transcript ?? ''),
    })
  }
  return results
}

function normalizeTranscript(text: string): string {
  return normalizeHypothesisText(text)
}

/**
 * WebKit recognition generations are transport boundaries, not utterances.
 * Stable committed prefix + mutable current hypothesis.
 * Compact space-stripping is not a semantic equality test.
 */
export function reconcileLogicalTranscript(
  existingRaw: string,
  incomingRaw: string,
  protections: ReconcileProtections = DEFAULT_RECONCILE_PROTECTIONS,
): string {
  return mergeUtteranceHypotheses(existingRaw, incomingRaw, protections)
}

/**
 * Same Web Speech resultIndex is a replacement slot, not a new utterance.
 * Growing/shrinking prefixes keep the longer text (PR #31).
 * Sibling tokenizations replace the mutable hypothesis; they do not append.
 */
export function reconcileSameIndexHypothesis(prevRaw: string | undefined, nextRaw: string): string {
  return reconcileLogicalTranscript(prevRaw ?? '', nextRaw)
}

/**
 * Android Chrome often marks growing prefixes of the same utterance as isFinal.
 * Replace a prefix hypothesis with the longer text; keep distinct phrases.
 * Do not strip repeated words inside a single result.
 */
export function mergeFinalHypotheses(committed: string[], nextRaw: string): string[] {
  const next = normalizeTranscript(nextRaw)
  if (!next) return committed
  const logical = reconcileLogicalTranscript(committed.join(' '), next)
  return logical ? [logical] : committed
}

export function compactFinalHypotheses(
  pieces: Array<string | undefined>,
  protections: ReconcileProtections = DEFAULT_RECONCILE_PROTECTIONS,
): string {
  let logical = ''
  for (const piece of pieces) {
    if (!piece) continue
    logical = reconcileLogicalTranscript(logical, piece, protections)
  }
  return logical
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

export function accumulateHeldFragments(
  prev: string,
  next: string,
  protections: ReconcileProtections = DEFAULT_RECONCILE_PROTECTIONS,
): string {
  return reconcileLogicalTranscript(prev, next, protections)
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

export type SpeechTranscriptSessionOptions = {
  protections?: ReconcileProtections
  forensic?: SpeechForensicRecorder
  logicalSessionId?: number
  generationId?: number
}

export function createSpeechTranscriptSession(options: SpeechTranscriptSessionOptions = {}) {
  const protections = options.protections ?? DEFAULT_RECONCILE_PROTECTIONS
  const forensic = options.forensic
  const logicalSessionId = options.logicalSessionId ?? 0
  const generationId = options.generationId ?? 0
  const finalsByIndex: string[] = []
  const interimsByIndex: string[] = []
  let consumed = false
  let mutableHypothesis = ''

  const snapshotFromSlots = () => {
    const count = Math.max(finalsByIndex.length, interimsByIndex.length)
    const slots: string[] = []
    for (let i = 0; i < count; i += 1) {
      const text = normalizeTranscript(finalsByIndex[i] || interimsByIndex[i] || '')
      if (text) slots.push(text)
    }
    if (slots.length <= 1) return slots[0] ?? ''
    const best = slots.reduce((winner, slot) =>
      hypothesisQualitySafe(slot) >= hypothesisQualitySafe(winner) ? slot : winner,
    )
    const overlapping = slots.every(
      (slot) => best.startsWith(slot) || slot.startsWith(best) || best.includes(slot) || slot.includes(best),
    )
    if (overlapping) return best
    return compactFinalHypotheses(slots, protections)
  }

  const snapshotFromEngine = () => snapshotFromSlots()

  return {
    ingest(
      event: SpeechRecognitionResultEventLike,
      meta: { generationId?: number } = {},
    ): { display: string } {
      if (
        protections.staleGenerationGuard &&
        meta.generationId != null &&
        meta.generationId !== generationId
      ) {
        forensic?.record({
          kind: 'result',
          logicalSessionId,
          recognitionGenerationId: generationId,
          note: `ignored stale generation ${meta.generationId}`,
          liveTranscript: mutableHypothesis,
          generationLogical: mutableHypothesis,
        })
        return { display: normalizeTranscript(mutableHypothesis) }
      }

      const finalsBefore = [...finalsByIndex]
      const interimsBefore = [...interimsByIndex]
      const resultCount = event.results.length
      if (protections.slotTruncation && finalsByIndex.length > resultCount) {
        finalsByIndex.length = resultCount
      }
      if (protections.slotTruncation && interimsByIndex.length > resultCount) {
        interimsByIndex.length = resultCount
      }
      const start = Math.max(0, event.resultIndex ?? 0)
      for (let i = start; i < resultCount; i += 1) {
        const piece = event.results[i]
        const text = normalizeTranscript(piece[0]?.transcript ?? '')
        if (!text) continue
        if (piece.isFinal) {
          finalsByIndex[i] = reconcileSameIndexHypothesis(finalsByIndex[i], text)
          interimsByIndex[i] = ''
        } else {
          interimsByIndex[i] = text
        }
      }
      const fromEngine = snapshotFromEngine()
      mutableHypothesis = reconcileLogicalTranscript(mutableHypothesis, fromEngine, protections)
      const display = normalizeTranscript(mutableHypothesis)
      forensic?.record({
        kind: 'result',
        logicalSessionId,
        recognitionGenerationId: generationId,
        resultIndex: event.resultIndex ?? 0,
        resultsLength: resultCount,
        slots: Array.from({ length: resultCount }, (_, index) => ({
          index,
          isFinal: Boolean(event.results[index]?.isFinal),
          rawTranscript: event.results[index]?.[0]?.transcript ?? '',
        })),
        finalsByIndexBefore: finalsBefore,
        finalsByIndexAfter: [...finalsByIndex],
        interimsByIndexBefore: interimsBefore,
        interimsByIndexAfter: [...interimsByIndex],
        generationLogical: mutableHypothesis,
        committedLogical: compactFinalHypotheses(finalsByIndex, protections),
        liveTranscript: display,
      })
      return { display }
    },

    peekCommitted(): string {
      return compactFinalHypotheses(finalsByIndex, protections)
    },

    peekHoldTranscript(): string {
      return mutableHypothesis || snapshotFromEngine()
    },

    consumeFinal(): { text: string; delivered: boolean } {
      const text = mutableHypothesis || compactFinalHypotheses(finalsByIndex, protections)
      if (consumed) return { text, delivered: false }
      consumed = true
      return { text, delivered: true }
    },
  }
}

function hypothesisQualitySafe(text: string): number {
  const rounds = new Set(
    [...text.matchAll(/([1-4]\s*차)\s*\d{1,3}/g)].map((match) => match[1]),
  )
  return rounds.size * 1000 + text.length
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
  protections?: ReconcileProtections
  forensic?: SpeechForensicRecorder
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
    /** Observational only. Must not be used to change merge/apply. */
    onRawRecognitionEvent?: (event: RawSpeechRecognitionCapture) => void
    onError: (message: string, code: string) => void
    onEnd: () => void
    holdUntilExplicitStop?: boolean
    protections?: ReconcileProtections
    forensic?: SpeechForensicRecorder
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
  const protections = handlers.protections ?? deps.protections ?? DEFAULT_RECONCILE_PROTECTIONS
  const forensic =
    handlers.forensic ??
    deps.forensic ??
    (isSpeechForensicEnabled() ? createSpeechForensicRecorder() : undefined)
  const logicalSessionId = nextSpeechLogicalSessionId()
  const listenCycleId = nextListenCycleId++
  let recognitionGeneration = 0
  let generationReady = true
  let eventSeq = 0
  let rawEventSeq = 0
  const physicalStartedAt = Date.now()
  const lifecycle: string[] = []
  let stopped = false
  let ended = false
  let engineActive = false
  let hadSuccessfulStart = false
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  let transcriptSession = createSpeechTranscriptSession({
    protections,
    forensic,
    logicalSessionId,
    generationId: recognitionGeneration,
  })
  let held = createHeldSpeechState()

  const beginGeneration = (reason: string) => {
    recognitionGeneration += 1
    generationReady = protections.staleGenerationGuard ? false : true
    transcriptSession = createSpeechTranscriptSession({
      protections,
      forensic,
      logicalSessionId,
      generationId: recognitionGeneration,
    })
    recordLifecycle(reason)
    forensic?.record({
      kind: 'restart-success',
      logicalSessionId,
      recognitionGenerationId: recognitionGeneration,
      committedLogical: held.accumulated,
      liveTranscript: held.accumulated,
      note: reason,
    })
  }

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

  const displayHeld = (generationText = '') => {
    const logical = reconcileLogicalTranscript(
      held.accumulated,
      generationText || held.currentCommitted,
      protections,
    )
    forensic?.record({
      kind: 'result',
      logicalSessionId,
      recognitionGenerationId: recognitionGeneration,
      liveTranscript: logical,
      committedLogical: held.accumulated,
      generationLogical: generationText || held.currentCommitted,
      note: 'live-display',
    })
    handlers.onInterim?.(logical)
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
    forensic?.record({
      kind: 'restart-request',
      logicalSessionId,
      recognitionGenerationId: recognitionGeneration,
      committedLogical: held.accumulated,
      liveTranscript: held.accumulated,
    })
    const begin = tryStartEngine(false)
    if (begin === 'started') {
      beginGeneration('restart ok')
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
          beginGeneration('restart ok delayed')
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
        forensic?.record({
          kind: 'restart-failure',
          logicalSessionId,
          recognitionGenerationId: recognitionGeneration,
          note: 'restart fail delayed',
        })
        held = reduceHeldSpeech(held, { type: 'restart-blocked' }).state
        if (stopAfterRestart) finishStoppedSession()
      }, HELD_SPEECH_RESTART_RETRY_MS)
      return
    }
    recordLifecycle('restart fail')
    forensic?.record({
      kind: 'restart-failure',
      logicalSessionId,
      recognitionGenerationId: recognitionGeneration,
      note: 'restart fail',
    })
    held = reduceHeldSpeech(held, { type: 'restart-blocked' }).state
    if (stopAfterRestart) finishStoppedSession()
  }

  recognition.onstart = () => {
    engineActive = true
    hadSuccessfulStart = true
    generationReady = true
  }

  const emitRawRecognitionEvent = (event: SpeechRecognitionResultEventLike) => {
    if (!handlers.onRawRecognitionEvent) return
    rawEventSeq += 1
    handlers.onRawRecognitionEvent({
      sessionId: logicalSessionId,
      recognitionGeneration,
      eventSequenceNumber: rawEventSeq,
      timestampDeltaMs: Date.now() - physicalStartedAt,
      resultIndex: event.resultIndex ?? 0,
      resultsLength: event.results.length,
      results: captureSpeechRecognitionResults(event),
      generationReady,
      heldApplied: held.applied,
    })
  }

  recognition.onresult = (event) => {
    emitRawRecognitionEvent(event)
    if (held.applied) return
    if (protections.staleGenerationGuard && !generationReady) {
      const lateText = normalizeTranscript(event.results[event.resultIndex ?? 0]?.[0]?.transcript ?? '')
      held = {
        ...held,
        accumulated: accumulateHeldFragments(held.accumulated, lateText, protections),
      }
      forensic?.record({
        kind: 'result',
        logicalSessionId,
        recognitionGenerationId: recognitionGeneration,
        note: 'stale-or-pre-onstart absorbed into stable',
        liveTranscript: held.accumulated,
        committedLogical: held.accumulated,
      })
      displayHeld(held.accumulated)
      return
    }
    const { display } = transcriptSession.ingest(event, { generationId: recognitionGeneration })
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
    displayHeld(committed || display)
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
      forensic?.record({
        kind: 'onend',
        logicalSessionId,
        recognitionGenerationId: recognitionGeneration,
        committedLogical: transcriptSession.peekHoldTranscript(),
        generationLogical: transcriptSession.peekHoldTranscript(),
        liveTranscript: accumulateHeldFragments(
          held.accumulated,
          transcriptSession.peekHoldTranscript(),
          protections,
        ),
      })
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
        forensic?.record({
          kind: 'explicit-stop',
          logicalSessionId,
          recognitionGenerationId: recognitionGeneration,
          committedLogical: held.accumulated,
          generationLogical: transcriptSession.peekHoldTranscript(),
          liveTranscript: accumulateHeldFragments(
            held.accumulated,
            transcriptSession.peekHoldTranscript(),
            protections,
          ),
        })
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
