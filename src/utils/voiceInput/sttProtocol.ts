export type VoiceTransportKind = 'webkit-speech' | 'recorded-stt'

export function detectVoiceTransport(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  extras: { platform?: string; maxTouchPoints?: number } = {},
): VoiceTransportKind {
  const platform =
    extras.platform ?? (typeof navigator === 'undefined' ? '' : navigator.platform)
  const maxTouchPoints =
    extras.maxTouchPoints ??
    (typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints)
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'recorded-stt'
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'recorded-stt'
  return 'webkit-speech'
}

export const RECORDER_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/aac',
  'audio/mpeg',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/wav',
] as const

export function pickRecorderMimeType(isTypeSupported: (type: string) => boolean): string {
  for (const type of RECORDER_MIME_CANDIDATES) {
    if (isTypeSupported(type)) return type
  }
  return ''
}

export function filenameForMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim() ?? ''
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/aac') return 'voice.m4a'
  if (base === 'audio/mpeg') return 'voice.mp3'
  if (base === 'audio/wav' || base === 'audio/wave') return 'voice.wav'
  if (base.includes('webm')) return 'voice.webm'
  return 'voice.bin'
}

export const STT_FAIL_MESSAGE =
  '음성 변환에 실패했습니다. 다시 시도하거나 텍스트 입력을 이용해 주세요.'

export const STT_EMPTY_MESSAGE = '인식된 내용이 없습니다. 텍스트로 입력할 수 있습니다.'

export const MAX_AUDIO_BYTES = 3_500_000

export const VOICE_TRANSCRIBE_PATH = '/api/voice-transcribe'

export type SttClientSuccess = { ok: true; transcript: string }
export type SttClientFailure = { ok: false; message: string; status?: number }
export type SttClientResult = SttClientSuccess | SttClientFailure

export function mapTranscribeHttpError(status: number): string {
  if (status === 401 || status === 403) return STT_FAIL_MESSAGE
  if (status === 413) return STT_FAIL_MESSAGE
  if (status === 422) return STT_EMPTY_MESSAGE
  return STT_FAIL_MESSAGE
}

export function parseTranscribeJson(payload: unknown): SttClientResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }
  const record = payload as { transcript?: unknown; error?: unknown }
  if (typeof record.transcript === 'string') {
    const transcript = record.transcript.replace(/\s+/g, ' ').trim()
    if (!transcript) return { ok: false, message: STT_EMPTY_MESSAGE }
    return { ok: true, transcript }
  }
  return { ok: false, message: STT_FAIL_MESSAGE }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function decodeBase64Audio(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}
