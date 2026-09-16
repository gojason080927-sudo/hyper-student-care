/**
 * iPhone recorded-STT transport. Does not claim physical iPhone success.
 * 실행: npx tsx src/utils/voiceInput/recordedStt.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import voiceTranscribeHandler, {
  envFromProcess,
  handleVoiceTranscribe,
  incomingToRequest,
  readBearerToken,
} from '../../../api/voice-transcribe.ts'
import {
  pickRecorderMimeType,
  detectAudioRecordingSupport,
  startAudioRecorder,
} from './audioRecorder.ts'
import { transcribeRecordedAudio } from './recordedSttClient.ts'
import {
  STT_FAIL_MESSAGE,
  detectVoiceTransport,
  filenameForMimeType,
  mapTranscribeHttpError,
  parseTranscribeJson,
  pickRecorderMimeType as pickMime,
} from './sttProtocol.ts'

const 류정현 = { id: 'ryujeonghyeon', name: '류정현' }
const roster = [
  { id: 'nagyeong', name: '강나경' },
  { id: 'doyoung', name: '김도영' },
  류정현,
]
const DATE = '2026-09-16'

function emptyDraft() {
  return {
    rounds: [
      { round: 1 as const, score: '', passed: false },
      { round: 2 as const, score: '', passed: false },
      { round: 3 as const, score: '', passed: false },
      { round: 4 as const, score: '', passed: false },
    ],
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
  }
}

function applyGolden(transcript: string) {
  return applyStudentDailyTestDraft(
    { ryujeonghyeon: emptyDraft() },
    transcript,
    류정현,
    roster,
    [],
    DATE,
  )
}

assert.equal(detectVoiceTransport('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'recorded-stt')
assert.equal(detectVoiceTransport('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'recorded-stt')
assert.equal(
  detectVoiceTransport('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', {
    platform: 'MacIntel',
    maxTouchPoints: 5,
  }),
  'recorded-stt',
)
assert.equal(
  detectVoiceTransport(
    'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  ),
  'webkit-speech',
)
assert.equal(
  detectVoiceTransport('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'),
  'webkit-speech',
)

assert.equal(
  pickMime((type) => type === 'audio/mp4'),
  'audio/mp4',
)
assert.equal(
  pickRecorderMimeType((type) => type.includes('webm')),
  'audio/webm;codecs=opus',
)
assert.equal(pickMime(() => false), '')
assert.equal(filenameForMimeType('audio/mp4;codecs=mp4a.40.2'), 'voice.m4a')
assert.equal(filenameForMimeType('audio/webm;codecs=opus'), 'voice.webm')
assert.equal(detectAudioRecordingSupport({ mediaDevices: true, MediaRecorder: true }), true)
assert.equal(detectAudioRecordingSupport({ mediaDevices: false, MediaRecorder: true }), false)

class FakeMediaRecorder {
  static isTypeSupported(type: string) {
    return type === 'audio/mp4'
  }
  mimeType = 'audio/mp4'
  state = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  start() {
    this.state = 'recording'
  }
  requestData() {
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/mp4' }) })
  }
  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

{
  const tracksStopped: string[] = []
  const recorder = await startAudioRecorder({
    getUserMedia: async () =>
      ({
        getTracks: () => [
          {
            stop: () => {
              tracksStopped.push('audio')
            },
          },
        ],
      }) as unknown as MediaStream,
    MediaRecorderCtor: FakeMediaRecorder as unknown as typeof MediaRecorder,
    isTypeSupported: (type) => type === 'audio/mp4',
  })
  assert.equal(recorder.mimeType, 'audio/mp4')
  const blob = await recorder.stop()
  assert.ok(blob.size > 0)
  assert.equal(tracksStopped.length > 0, true)
}

{
  const denied = new Error('denied')
  denied.name = 'NotAllowedError'
  await assert.rejects(
    () =>
      startAudioRecorder({
        getUserMedia: async () => {
          throw denied
        },
        MediaRecorderCtor: FakeMediaRecorder as unknown as typeof MediaRecorder,
      }),
    (err: unknown) => err instanceof Error && err.name === 'NotAllowedError',
  )
}

{
  class EmptyRecorder extends FakeMediaRecorder {
    requestData() {
      /* no chunks */
    }
  }
  const recorder = await startAudioRecorder({
    getUserMedia: async () =>
      ({
        getTracks: () => [{ stop: () => undefined }],
      }) as unknown as MediaStream,
    MediaRecorderCtor: EmptyRecorder as unknown as typeof MediaRecorder,
    isTypeSupported: (type) => type === 'audio/mp4',
    stopFlushMs: 0,
  })
  const blob = await recorder.stop()
  assert.equal(blob.size, 0)
}

{
  class LateDataRecorder extends FakeMediaRecorder {
    requestData() {
      /* iOS often delivers the blob after stop, not via requestData */
    }
    stop() {
      this.state = 'inactive'
      this.onstop?.()
      setTimeout(() => {
        this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/mp4' }) })
      }, 20)
    }
  }
  const recorder = await startAudioRecorder({
    getUserMedia: async () =>
      ({
        getTracks: () => [{ stop: () => undefined }],
      }) as unknown as MediaStream,
    MediaRecorderCtor: LateDataRecorder as unknown as typeof MediaRecorder,
    isTypeSupported: (type) => type === 'audio/mp4',
    stopFlushMs: 80,
  })
  const blob = await recorder.stop()
  assert.ok(blob.size > 0)
}

assert.equal(mapTranscribeHttpError(401), STT_FAIL_MESSAGE)
assert.equal(mapTranscribeHttpError(500), STT_FAIL_MESSAGE)
assert.deepEqual(parseTranscribeJson({ transcript: '  1차 30점  ' }), {
  ok: true,
  transcript: '1차 30점',
})
assert.equal(parseTranscribeJson({}).ok, false)
assert.equal(parseTranscribeJson({ transcript: '   ' }).ok, false)

const GOLDEN_A = '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음'
const parsedA = parseStudentDailyTestVoice(GOLDEN_A, 류정현, roster, false)
const appliedA = applyGolden(GOLDEN_A)
assert.equal(parsedA.attempts.find((row) => row.round === 1)?.score, '30')
assert.equal(parsedA.attempts.find((row) => row.round === 2)?.score, '50')
assert.equal(parsedA.attempts.find((row) => row.round === 3)?.score, '100')
assert.equal(appliedA.drafts.ryujeonghyeon?.rounds[0]?.score, '30')
assert.equal(appliedA.drafts.ryujeonghyeon?.rounds[1]?.score, '50')
assert.equal(appliedA.drafts.ryujeonghyeon?.rounds[2]?.score, '100')
assert.equal(appliedA.drafts.ryujeonghyeon?.rounds[3]?.score, '')
assert.equal(visualStatusFromScoreDraft('30'), '불합격')
assert.equal(visualStatusFromScoreDraft('50'), '불합격')
assert.equal(visualStatusFromScoreDraft('100'), '합격')
assert.equal(parsedA.teacherFeedback, '나날이 속도가 빨라지고 정확도가 높아지고 있음')
assert.equal(
  appliedA.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback,
  '나날이 속도가 빨라지고 정확도가 높아지고 있음',
)
assert.doesNotMatch(parsedA.teacherFeedback ?? '', /1차|2차|3차|30점|50점|100점/)

const GOLDEN_B = '1차 22점 2차 53점 3차 100점 나날이 발전하고 있음'
const parsedB = parseStudentDailyTestVoice(GOLDEN_B, 류정현, roster, false)
assert.equal(visualStatusFromScoreDraft('22'), '불합격')
assert.equal(visualStatusFromScoreDraft('53'), '불합격')
assert.equal(visualStatusFromScoreDraft('100'), '합격')
assert.equal(parsedB.teacherFeedback, '나날이 발전하고 있음')
assert.equal(applyGolden(GOLDEN_B).drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, '나날이 발전하고 있음')

const GOLDEN_C = '1차 70점 불합격 개념 부족 2개 계산 실수 1개 피드백 계산 과정은 좋아지고 있다'
const parsedC = parseStudentDailyTestVoice(GOLDEN_C, 류정현, roster, false)
const appliedC = applyGolden(GOLDEN_C)
assert.equal(parsedC.attempts.find((row) => row.round === 1)?.score, '70')
assert.equal(visualStatusFromScoreDraft('70'), '불합격')
assert.equal(parsedC.conceptLackCount, 2)
assert.equal(parsedC.calculationErrorCount, 1)
assert.equal(parsedC.applicationLackCount, undefined)
assert.equal(appliedC.drafts.ryujeonghyeon?.learningDiagnosis.applicationLackCount, 0)
assert.equal(parsedC.teacherFeedback, '계산 과정은 좋아지고 있다')

const GOLDEN_D = '1차 50점 불합격 2차 90점 합격 2차 함수에 대한 이해가 늦는 거 같다'
const parsedD = parseStudentDailyTestVoice(GOLDEN_D, 류정현, roster, false)
assert.equal(parsedD.attempts.find((row) => row.round === 1)?.score, '50')
assert.equal(parsedD.attempts.find((row) => row.round === 2)?.score, '90')
assert.equal(visualStatusFromScoreDraft('50'), '불합격')
assert.equal(visualStatusFromScoreDraft('90'), '합격')
assert.equal(parsedD.teacherFeedback, '2차 함수에 대한 이해가 늦는 거 같다')
assert.equal(
  applyGolden(GOLDEN_D).drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback,
  '2차 함수에 대한 이해가 늦는 거 같다',
)

assert.equal(formatVoiceSummary({ appliedCount: 4, excludedAbsentCount: 0, needsReviewCount: 0 }), '음성 내용 반영 완료')
assert.doesNotMatch(formatVoiceSummary({ appliedCount: 75, excludedAbsentCount: 0, needsReviewCount: 0 }), /건 반영/)

const seeded = {
  ryujeonghyeon: {
    ...emptyDraft(),
    rounds: [
      { round: 1 as const, score: '80', passed: false },
      { round: 2 as const, score: '', passed: false },
      { round: 3 as const, score: '', passed: false },
      { round: 4 as const, score: '', passed: false },
    ],
    learningDiagnosis: {
      ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
      teacherFeedback: '기존 피드백',
      conceptLackCount: 3,
    },
  },
}
const before = structuredClone(seeded)
const sttFail = await transcribeRecordedAudio({
  blob: new Blob(),
  mimeType: 'audio/mp4',
  getAccessToken: async () => 'token',
  fetchImpl: async () => {
    throw new Error('network')
  },
})
assert.equal(sttFail.ok, false)
assert.deepEqual(seeded, before)

const timeout = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    verifyUser: async () => true,
    fetchImpl: async () => {
      throw new Error('timeout')
    },
  },
)
assert.equal(timeout.status, 504)

const unauthorized = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => false,
  },
)
assert.equal(unauthorized.status, 401)

await assert.rejects(
  () =>
    handleVoiceTranscribe(
      { method: 'POST', headers: { authorization: 'Bearer test' } } as unknown as Request,
      {
        openaiApiKey: 'sk-test',
        openaiModel: 'gpt-4o-transcribe',
        supabaseUrl: '',
        supabaseAnonKey: '',
        verifyUser: async () => false,
      },
    ),
  (err: unknown) => {
    assert.match(String(err), /is not a function/)
    return true
  },
)

{
  const nodeReq = await incomingToRequest({
    method: 'POST',
    url: '/api/voice-transcribe',
    headers: {
      host: 'hyper-student-care.vercel.app',
      authorization: 'Bearer teacher-jwt',
      'content-type': 'application/json',
    },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }))
    },
  } as never)
  assert.equal(readBearerToken(nodeReq), 'teacher-jwt')
  const adapted = await handleVoiceTranscribe(nodeReq, {
    openaiApiKey: '',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    verifyUser: async (token) => token === 'teacher-jwt',
  })
  assert.equal(adapted.status, 503)
}

{
  class MockRes {
    statusCode = 0
    headers: Record<string, string> = {}
    chunks: Uint8Array[] = []
    writeHead(status: number, headers: Record<string, string>) {
      this.statusCode = status
      this.headers = headers
    }
    end(buf?: Uint8Array) {
      if (buf) this.chunks.push(buf)
    }
    text() {
      return Buffer.concat(this.chunks.map((part) => Buffer.from(part))).toString('utf8')
    }
  }
  const res = new MockRes()
  const req = {
    method: 'POST',
    url: '/api/voice-transcribe',
    headers: {
      host: 'hyper-student-care.vercel.app',
      authorization: 'Bearer teacher-jwt',
      'content-type': 'application/json',
    },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }))
    },
  }
  await voiceTranscribeHandler(req as never, res as never)
  assert.equal(res.statusCode, 401)
  assert.match(res.text(), /unauthorized/)
}

const unconfigured = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer teacher-jwt', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
)
assert.equal(unconfigured.status, 401)
assert.deepEqual(await unconfigured.json(), { error: 'unauthorized' })

{
  let verifyUrl = ''
  const afterVerify = await handleVoiceTranscribe(
    new Request('https://example.test/api/voice-transcribe', {
      method: 'POST',
      headers: { Authorization: 'Bearer teacher-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
    }),
    {
      openaiApiKey: '',
      openaiModel: 'gpt-4o-transcribe',
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon',
      fetchImpl: async (url, init) => {
        verifyUrl = String(url)
        const headers = init?.headers as { Authorization?: string; apikey?: string }
        assert.equal(headers.Authorization, 'Bearer teacher-jwt')
        assert.equal(headers.apikey, 'anon')
        return new Response(JSON.stringify({ id: 'teacher-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  )
  assert.match(verifyUrl, /\/auth\/v1\/user$/)
  assert.equal(afterVerify.status, 503)
}

const emptyUp = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
    fetchImpl: async () =>
      new Response(JSON.stringify({ text: '   ' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
)
assert.equal(emptyUp.status, 422)

const malformed = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
    fetchImpl: async () =>
      new Response('not-json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
  },
)
assert.equal(malformed.status, 502)

const fourxx = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: 'bad' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
)
assert.equal(fourxx.status, 502)

const fivexx = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: 'down' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
)
assert.equal(fivexx.status, 502)

const ok = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: 'sk-test',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
    fetchImpl: async (_url, init) => {
      assert.ok(String(init?.headers && (init.headers as { Authorization?: string }).Authorization).startsWith('Bearer sk-'))
      return new Response(JSON.stringify({ text: GOLDEN_A }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  },
)
assert.equal(ok.status, 200)
assert.deepEqual(await ok.json(), { transcript: GOLDEN_A })

const noKey = await handleVoiceTranscribe(
  new Request('https://example.test/api/voice-transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: 'audio/mp4', audioBase64: btoa('abcd') }),
  }),
  {
    openaiApiKey: '',
    openaiModel: 'gpt-4o-transcribe',
    supabaseUrl: '',
    supabaseAnonKey: '',
    verifyUser: async () => true,
  },
)
assert.equal(noKey.status, 503)

{
  const keys = [
    'OPENAI_API_KEY',
    'OPENAI_TRANSCRIBE_MODEL',
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
  ] as const
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  process.env.OPENAI_API_KEY = 'test-key'
  delete process.env.OPENAI_TRANSCRIBE_MODEL
  delete process.env.SUPABASE_URL
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  delete process.env.SUPABASE_ANON_KEY
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  try {
    const live = envFromProcess()
    assert.equal(live.openaiApiKey, 'test-key')
    assert.equal(live.openaiModel, 'gpt-4o-transcribe')
    assert.equal(live.supabaseUrl, 'https://example.supabase.co')
    assert.equal(live.supabaseAnonKey, 'anon')
  } finally {
    for (const key of keys) {
      const value = previous[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const clientOk = await transcribeRecordedAudio({
  blob: new Blob(['abcd'], { type: 'audio/mp4' }),
  mimeType: 'audio/mp4',
  getAccessToken: async () => 'teacher-token',
  fetchImpl: async (url, init) => {
    assert.equal(String(url), '/api/voice-transcribe')
    assert.match(String((init?.headers as { Authorization?: string }).Authorization), /Bearer teacher-token/)
    return new Response(JSON.stringify({ transcript: GOLDEN_A }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
assert.deepEqual(clientOk, { ok: true, transcript: GOLDEN_A })

const clientNet = await transcribeRecordedAudio({
  blob: new Blob(['abcd'], { type: 'audio/mp4' }),
  mimeType: 'audio/mp4',
  getAccessToken: async () => 'teacher-token',
  fetchImpl: async () => {
    throw new Error('offline')
  },
})
assert.equal(clientNet.ok, false)

for (const status of [401, 422, 502, 504, 503]) {
  const failed = await transcribeRecordedAudio({
    blob: new Blob(['abcd'], { type: 'audio/mp4' }),
    mimeType: 'audio/mp4',
    getAccessToken: async () => 'teacher-token',
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: 'fail' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  })
  assert.equal(failed.ok, false, `status ${status}`)
  assert.deepEqual(seeded, before)
}

const ui = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(ui, /holdUntilExplicitStop: true/)
assert.match(ui, /startKoreanSpeechRecognition/)
assert.match(ui, /recorded-stt/)
assert.match(ui, /transcribeRecordedAudio/)
assert.match(ui, /음성 변환 중/)
assert.match(ui, /data-voice-listening-hint/)
assert.match(ui, /data-voice-phase/)
assert.doesNotMatch(ui, /holdUntilExplicitStop: false/)
assert.doesNotMatch(ui, /OPENAI_API_KEY|sk-/)
assert.match(ui, /transport === 'webkit-speech' && interim/)
assert.match(ui, /if \(transport === 'recorded-stt'\)/)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /mergeUtteranceHypotheses/)
assert.match(speech, /holdUntilExplicitStop/)

const endpoint = readFileSync('api/voice-transcribe.ts', 'utf8')
assert.match(endpoint, /api\.openai\.com\/v1\/audio\/transcriptions/)
assert.match(endpoint, /runtime: 'nodejs'/)
assert.match(endpoint, /incomingToRequest/)
assert.match(endpoint, /missing_bearer/)
assert.match(endpoint, /unconfigured/)
assert.match(endpoint, /auth\/v1\/user/)
assert.match(endpoint, /process\.env\.OPENAI_API_KEY/)
assert.match(endpoint, /process\.env\.VITE_SUPABASE_URL/)
assert.doesNotMatch(endpoint, /globalThis\.process/)
assert.doesNotMatch(endpoint, /runtime: 'edge'/)
assert.doesNotMatch(endpoint, /VITE_OPENAI/)
assert.doesNotMatch(endpoint, /from '@supabase/)
assert.doesNotMatch(endpoint, /parseStudentDailyTestVoice/)
assert.doesNotMatch(endpoint, /saveDailyTestRecord/)
assert.doesNotMatch(endpoint, /sk-[a-zA-Z0-9]/)

const clientSrc = readFileSync('src/utils/voiceInput/recordedSttClient.ts', 'utf8')
assert.match(clientSrc, /refreshSession/)
assert.match(clientSrc, /getSession/)
assert.match(clientSrc, /Authorization: `Bearer \$\{token\}`/)
assert.doesNotMatch(clientSrc, /OPENAI_API_KEY|sk-/)

const recorderSrc = readFileSync('src/utils/voiceInput/audioRecorder.ts', 'utf8')
assert.match(recorderSrc, /stopFlushMs/)
assert.match(recorderSrc, /recorder\.state === 'inactive' && chunks\.length > 0/)

const vercel = readFileSync('vercel.json', 'utf8')
assert.match(vercel, /"source": "\/\(\.\*\)"/)
assert.doesNotMatch(vercel, /\(\?!api\/\)/)

console.log('recordedStt.test.ts passed')
