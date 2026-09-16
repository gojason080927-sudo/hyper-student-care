import { pickRecorderMimeType } from './sttProtocol.ts'

export { pickRecorderMimeType }

export type AudioRecorderSession = {
  mimeType: string
  stop: () => Promise<Blob>
  cancel: () => void
}

type RecorderDeps = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  MediaRecorderCtor?: typeof MediaRecorder
  isTypeSupported?: (type: string) => boolean
  /** iOS can deliver dataavailable after the stop event. */
  stopFlushMs?: number
}

const DEFAULT_STOP_FLUSH_MS = 300

export function detectAudioRecordingSupport(
  flags?: { mediaDevices?: boolean; MediaRecorder?: boolean },
): boolean {
  if (flags) return Boolean(flags.mediaDevices && flags.MediaRecorder)
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

function stopTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      /* already ended */
    }
  })
}

export async function startAudioRecorder(deps: RecorderDeps = {}): Promise<AudioRecorderSession> {
  const getUserMedia =
    deps.getUserMedia ??
    (typeof navigator !== 'undefined'
      ? (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints)
      : undefined)
  const MediaRecorderCtor =
    deps.MediaRecorderCtor ?? (typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined)
  if (!getUserMedia || !MediaRecorderCtor) {
    const err = new Error('unsupported')
    err.name = 'NotSupportedError'
    throw err
  }

  const isTypeSupported =
    deps.isTypeSupported ??
    ((type: string) =>
      typeof MediaRecorderCtor.isTypeSupported === 'function'
        ? MediaRecorderCtor.isTypeSupported(type)
        : false)

  const negotiated = pickRecorderMimeType(isTypeSupported)
  // WebKit MediaRecorder sample uses `{ audio: true }`. Extra constraints can
  // throw OverconstrainedError on some iPhone versions; fall back to the
  // Apple-documented unconstrained microphone request.
  let stream: MediaStream
  try {
    stream = await getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    })
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'NotFoundError') {
      throw err
    }
    stream = await getUserMedia({ audio: true })
  }

  let recorder: MediaRecorder
  try {
    recorder = negotiated
      ? new MediaRecorderCtor(stream, { mimeType: negotiated })
      : new MediaRecorderCtor(stream)
  } catch (err) {
    stopTracks(stream)
    throw err
  }

  const mimeType = recorder.mimeType || negotiated || 'application/octet-stream'
  const chunks: Blob[] = []
  const flushMs = deps.stopFlushMs ?? DEFAULT_STOP_FLUSH_MS

  const done = new Promise<Blob>((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      stopTracks(stream)
      resolve(new Blob(chunks, { type: mimeType }))
    }

    recorder.onerror = () => {
      if (settled) return
      settled = true
      stopTracks(stream)
      reject(new Error('recording_error'))
    }
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
      if (recorder.state === 'inactive' && chunks.length > 0) finish()
    }
    recorder.onstop = () => {
      if (chunks.length > 0) {
        finish()
        return
      }
      setTimeout(finish, flushMs)
    }
  })

  try {
    // W3C MediaStream Recording simplest case: start() with no timeslice so
    // stop() yields one complete Blob. WebKit's sample uses start(1000) for
    // preview chunks; sliced fragments are not required to be individually
    // playable, and Safari 18.4 fMP4 slices can fail OpenAI.
    recorder.start()
  } catch (err) {
    stopTracks(stream)
    throw err
  }

  let finished = false
  return {
    mimeType,
    stop: async () => {
      if (!finished) {
        finished = true
        if (recorder.state !== 'inactive') recorder.stop()
      }
      return done
    },
    cancel: () => {
      finished = true
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* ignore */
      }
      stopTracks(stream)
    },
  }
}
