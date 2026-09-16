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
}

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
  const stream = await getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  })

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
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => {
      stopTracks(stream)
      reject(new Error('recording_error'))
    }
    recorder.onstop = () => {
      stopTracks(stream)
      resolve(new Blob(chunks, { type: mimeType }))
    }
  })

  try {
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
        try {
          if (recorder.state === 'recording' && typeof recorder.requestData === 'function') {
            recorder.requestData()
          }
        } catch {
          /* iOS may not implement requestData */
        }
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
