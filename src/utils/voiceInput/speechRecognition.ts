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
}): LiveSpeechSession | null {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = 'ko-KR'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  let stopped = false
  let ended = false
  const transcriptSession = createSpeechTranscriptSession()

  recognition.onresult = (event) => {
    const { display } = transcriptSession.ingest(event)
    handlers.onInterim?.(display)
  }

  recognition.onerror = (event) => {
    const code = String(event.error ?? 'unknown')
    if (code === 'aborted' && stopped) return
    handlers.onError(speechErrorMessage(code), code)
  }

  recognition.onend = () => {
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
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          handlers.onEnd()
        }
      }
    },
  }
}
