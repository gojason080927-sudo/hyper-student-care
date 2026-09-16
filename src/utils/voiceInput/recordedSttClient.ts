import { getSupabase, isSupabaseConfigured } from '../../lib/supabase.ts'
import {
  MAX_AUDIO_BYTES,
  STT_FAIL_MESSAGE,
  VOICE_TRANSCRIBE_PATH,
  blobToBase64,
  filenameForMimeType,
  mapTranscribeHttpError,
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

  let response: Response
  try {
    response = await fetchImpl(VOICE_TRANSCRIBE_PATH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mimeType: args.mimeType || args.blob.type || 'application/octet-stream',
        filename: filenameForMimeType(args.mimeType || args.blob.type),
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
  if (!userData.user) return null
  const { data } = await auth.getSession()
  return data.session?.access_token ?? null
}
