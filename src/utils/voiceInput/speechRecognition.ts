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

type SpeechRecognitionResultEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
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
  const finals: string[] = []

  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i]
      const text = piece[0]?.transcript ?? ''
      if (piece.isFinal) finals.push(text.trim())
      else interim += text
    }
    handlers.onInterim?.(
      [...finals, interim].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    )
  }

  recognition.onerror = (event) => {
    const code = String(event.error ?? 'unknown')
    if (code === 'aborted' && stopped) return
    handlers.onError(speechErrorMessage(code), code)
  }

  recognition.onend = () => {
    const text = finals.join(' ').replace(/\s+/g, ' ').trim()
    if (text) handlers.onFinal?.(text)
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
