import { getSupabase, isSupabaseConfigured } from '../../lib/supabase.ts'
import {
  MAX_AUDIO_BYTES,
  STT_FAIL_MESSAGE,
  VOICE_TRANSCRIBE_PATH,
  blobToBase64,
  mapTranscribeHttpError,
  normalizeTranscriptionAudioMeta,
  parseTranscribeJson,
  type SttClientResult,
} from './sttProtocol.ts'

export async function transcribeRecordedAudio(args: {
  blob: Blob
  mimeType: string
  fetchImpl?: typeof fetch
  getAccessToken?: () => Promise<string | null>
}): Promise<SttClientResult> {
  if (!args.blob || args.blob.size <= 0) {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }
  if (args.blob.size > MAX_AUDIO_BYTES) {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }

  const fetchImpl = args.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined)
  if (!fetchImpl) return { ok: false, message: STT_FAIL_MESSAGE }

  let token: string | null = null
  try {
    token = args.getAccessToken
      ? await args.getAccessToken()
      : await defaultAccessToken()
  } catch {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }
  if (!token) return { ok: false, message: STT_FAIL_MESSAGE }

  let audioBase64 = ''
  try {
    audioBase64 = await blobToBase64(args.blob)
  } catch {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }

  const audioMeta = normalizeTranscriptionAudioMeta(args.mimeType || args.blob.type)
  let response: Response
  try {
    response = await fetchImpl(VOICE_TRANSCRIBE_PATH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mimeType: audioMeta.mimeType,
        filename: audioMeta.filename,
        audioBase64,
      }),
    })
  } catch {
    return { ok: false, message: STT_FAIL_MESSAGE }
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    return { ok: false, message: STT_FAIL_MESSAGE, status: response.status }
  }

  if (!response.ok) {
    return { ok: false, message: mapTranscribeHttpError(response.status), status: response.status }
  }
  return parseTranscribeJson(payload)
}

async function defaultAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const auth = getSupabase().auth
  const { data: userData } = await auth.getUser()
  if (userData.user) {
    const { data } = await auth.getSession()
    return data.session?.access_token ?? null
  }
  // iOS Home Screen web apps suspend JS in the background (WWDC23 / WebKit),
  // so autoRefresh may not run. Refresh once; still require a user before sending.
  try {
    const { data: refreshed } = await auth.refreshSession()
    if (refreshed.session?.user && refreshed.session.access_token) {
      return refreshed.session.access_token
    }
  } catch {
    return null
  }
  return null
}
