/**
 * DEV/TEST-only speech forensic recorder.
 * No audio. No persistence. Not wired into Production UI.
 */

export type SpeechForensicResultSlot = {
  index: number
  isFinal: boolean
  rawTranscript: string
}

export type SpeechForensicEvent = {
  order: number
  timestampMs: number
  kind:
    | 'result'
    | 'onend'
    | 'restart-request'
    | 'restart-success'
    | 'restart-failure'
    | 'explicit-stop'
    | 'route'
    | 'parse'
    | 'apply'
  logicalSessionId: number
  recognitionGenerationId: number
  resultIndex?: number
  resultsLength?: number
  slots?: SpeechForensicResultSlot[]
  finalsByIndexBefore?: string[]
  finalsByIndexAfter?: string[]
  interimsByIndexBefore?: string[]
  interimsByIndexAfter?: string[]
  generationLogical?: string
  committedLogical?: string
  liveTranscript?: string
  finalTranscript?: string
  routerSection?: string
  parserInput?: string
  parserStructuredSpans?: string[]
  parserResidualSpans?: string[]
  feedbackCandidate?: string
  finalFeedback?: string
  draftPatch?: unknown
  note?: string
}

export type SpeechForensicRecorder = {
  enabled: true
  record: (event: Omit<SpeechForensicEvent, 'order' | 'timestampMs'>) => void
  snapshot: () => SpeechForensicEvent[]
}

let nextLogicalSessionId = 1

export function nextSpeechLogicalSessionId(): number {
  nextLogicalSessionId += 1
  return nextLogicalSessionId
}

export function createSpeechForensicRecorder(options?: {
  now?: () => number
}): SpeechForensicRecorder {
  const events: SpeechForensicEvent[] = []
  const now = options?.now ?? (() => Date.now())
  const startedAt = now()
  return {
    enabled: true,
    record(event) {
      events.push({
        ...event,
        order: events.length + 1,
        timestampMs: now() - startedAt,
      })
    },
    snapshot() {
      return events.map((event) => ({ ...event, slots: event.slots?.map((slot) => ({ ...slot })) }))
    },
  }
}

export function isSpeechForensicEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean((window as Window & { __HSC_SPEECH_FORENSIC__?: boolean }).__HSC_SPEECH_FORENSIC__)
  } catch {
    return false
  }
}
