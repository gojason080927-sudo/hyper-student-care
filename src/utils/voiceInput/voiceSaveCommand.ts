/**
 * V1.1 official save command. Exact match after whitespace normalize only.
 * Do not treat 저장 / 완료 / 저장해줘 as save.
 */
export function isVoiceBulkSaveCommand(raw: string): boolean {
  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  return normalized === '일괄 저장' || normalized.replace(/\s+/g, '') === '일괄저장'
}

export type VoiceTranscriptRoute =
  | { kind: 'none' }
  | { kind: 'save-command' }
  | { kind: 'form-fill'; transcript: string }

export function routeVoiceTranscript(raw: string): VoiceTranscriptRoute {
  const transcript = raw.replace(/\s+/g, ' ').trim()
  if (!transcript) return { kind: 'none' }
  if (isVoiceBulkSaveCommand(transcript)) return { kind: 'save-command' }
  return { kind: 'form-fill', transcript }
}

type SpeechSession = {
  consumeFinal: () => { text: string; delivered: boolean }
}

/**
 * One delivered final per session. Save command never reaches form parsers.
 * If the section is already saving, the existing handler is not re-entered.
 */
export function dispatchVoiceSessionFinal(
  session: SpeechSession,
  handlers: {
    onSaveCommand?: () => void
    onApply: (transcript: string) => void
    saving?: boolean
  },
): VoiceTranscriptRoute {
  const { text, delivered } = session.consumeFinal()
  if (!delivered || !text) return { kind: 'none' }
  const route = routeVoiceTranscript(text)
  if (route.kind === 'save-command') {
    if (!handlers.saving) handlers.onSaveCommand?.()
    return route
  }
  if (route.kind === 'form-fill') handlers.onApply(route.transcript)
  return route
}
