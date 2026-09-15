/**
 * iOS-like Web Speech session sequences for daily-test hold mode.
 * Does not claim physical iPhone validation.
 * 실행: npx tsx src/utils/voiceInput/iosHeldSpeechSession.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import {
  createSpeechTranscriptSession,
  HELD_SPEECH_RESTART_RETRY_MS,
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'

const 류정현 = { id: 'ryujeonghyeon', name: '류정현' }
const roster = [
  { id: 'nagyeong', name: '강나경' },
  { id: 'doyoung', name: '김도영' },
  류정현,
]

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

function namedError(name: string) {
  const err = new Error(name)
  err.name = name
  return err
}

function speechEvent(
  resultIndex: number,
  pieces: Array<{ transcript: string; isFinal: boolean }>,
): SpeechRecognitionResultEventLike {
  return {
    resultIndex,
    results: pieces.map((piece) => ({
      isFinal: piece.isFinal,
      0: { transcript: piece.transcript },
    })),
  }
}

class FakeSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onstart: (() => void) | null = null
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null = null
  onerror: ((event: { error?: string }) => void) | null = null
  onend: (() => void) | null = null
  startCount = 0
  stopCount = 0
  running = false
  throwOnStart: Error | null = null
  throwAfterStarts = 0
  stopThrows = false
  abortThrows = false

  start() {
    this.startCount += 1
    if (this.throwOnStart && this.startCount > this.throwAfterStarts) {
      throw this.throwOnStart
    }
    this.running = true
    this.onstart?.()
  }

  stop() {
    this.stopCount += 1
    if (this.stopThrows) throw namedError('InvalidStateError')
    this.running = false
    this.onend?.()
  }

  abort() {
    if (this.abortThrows) throw namedError('InvalidStateError')
    this.running = false
    this.onend?.()
  }

  emitResult(event: SpeechRecognitionResultEventLike) {
    this.onresult?.(event)
  }

  emitEnd() {
    this.running = false
    this.onend?.()
  }

  emitError(code: string) {
    this.onerror?.({ error: code })
  }
}

function holdSession(options?: {
  throwOnStart?: Error | null
  throwAfterStarts?: number
  stopThrows?: boolean
  abortThrows?: boolean
  getCtor?: () => (new () => FakeSpeechRecognition) | null
}) {
  const queued: Array<{ fn: () => void; ms: number }> = []
  let rec: FakeSpeechRecognition | null = null
  const finals: string[] = []
  const errors: Array<{ message: string; code: string }> = []
  let ended = 0
  const FakeCtor = class extends FakeSpeechRecognition {
    constructor() {
      super()
      rec = this
      this.throwOnStart = options?.throwOnStart ?? null
      this.throwAfterStarts = options?.throwAfterStarts ?? 0
      this.stopThrows = Boolean(options?.stopThrows)
      this.abortThrows = Boolean(options?.abortThrows)
    }
  }
  const session = startKoreanSpeechRecognition(
    {
      holdUntilExplicitStop: true,
      onFinal: (text) => {
        finals.push(text)
      },
      onError: (message, code) => {
        errors.push({ message, code })
      },
      onEnd: () => {
        ended += 1
      },
    },
    {
      getCtor: options?.getCtor
        ? (options.getCtor as () => (new () => FakeSpeechRecognition) | null)
        : () => FakeCtor,
      schedule: (fn, ms) => {
        queued.push({ fn, ms })
        return queued.length as unknown as ReturnType<typeof setTimeout>
      },
      cancelSchedule: () => {
        queued.length = 0
      },
    },
  )
  return {
    session,
    rec: () => rec,
    finals,
    errors,
    ended: () => ended,
    queued,
    flush() {
      const next = queued.shift()
      next?.fn()
    },
  }
}

// CASE A — start → final → user stop → apply once
{
  const run = holdSession()
  assert.ok(run.session)
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]),
  )
  run.session?.stop()
  assert.deepEqual(run.finals, ['함수에 대한 이해가 늦는 거 같다'])
  assert.equal(run.ended(), 1)
  run.rec()?.emitEnd()
  assert.deepEqual(run.finals, ['함수에 대한 이해가 늦는 거 같다'])
}

// CASE B — short final, browser onend, restart, second fragment, user stop, combined once
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '2차 함수에 대한', isFinal: true }]))
  run.rec()?.emitEnd()
  assert.equal(run.finals.length, 0)
  assert.equal(run.rec()?.startCount, 2)
  assert.equal(run.queued.length, 0)
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '이해가 늦는 거 같다', isFinal: true }]))
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  assert.equal(run.finals[0], '2차 함수에 대한 이해가 늦는 거 같다')
}

// CASE C — iOS-like onend after silence with interim-only result
{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '2차 함수에 대한 이해가 늦는 거 같다', isFinal: false }]),
  )
  run.rec()?.emitEnd()
  assert.equal(run.finals.length, 0)
  run.session?.stop()
  assert.equal(run.finals[0], '2차 함수에 대한 이해가 늦는 거 같다')
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '2차 함수에 대한', isFinal: false }]))
  assert.equal(session.peekCommitted(), '')
  assert.equal(session.peekHoldTranscript(), '2차 함수에 대한')
}

// CASE D — restart throws InvalidStateError, retry still throws, wait for user stop
{
  const run = holdSession({
    throwOnStart: namedError('InvalidStateError'),
    throwAfterStarts: 1,
  })
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '2차 함수에 대한', isFinal: true }]))
  run.rec()?.emitEnd()
  assert.equal(run.errors.length, 0)
  assert.equal(run.finals.length, 0)
  assert.equal(run.queued[0]?.ms, HELD_SPEECH_RESTART_RETRY_MS)
  run.flush()
  assert.equal(run.errors.length, 0)
  assert.equal(run.ended(), 0)
  run.session?.stop()
  assert.deepEqual(run.finals, ['2차 함수에 대한'])
  assert.equal(run.ended(), 1)
}

// CASE E — restart blocked by permission-like error after a live session
{
  const run = holdSession({
    throwOnStart: namedError('NotAllowedError'),
    throwAfterStarts: 1,
  })
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]))
  run.rec()?.emitEnd()
  assert.equal(run.queued.length, 0)
  assert.equal(run.errors.length, 0)
  run.session?.stop()
  assert.equal(run.finals[0], '함수에 대한 이해가 늦는 거 같다')
}

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]))
  run.rec()?.emitEnd()
  run.rec()?.emitError('not-allowed')
  assert.equal(run.errors.length, 0)
  run.session?.stop()
  assert.equal(run.finals[0], '함수에 대한 이해가 늦는 거 같다')
}

// CASE F — duplicate onend
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]))
  run.session?.stop()
  run.rec()?.emitEnd()
  assert.deepEqual(run.finals, ['함수에 대한 이해가 늦는 거 같다'])
}

// CASE G — late onresult after stop/apply
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]))
  run.session?.stop()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '이건 늦게 온 결과', isFinal: true }]))
  assert.deepEqual(run.finals, ['함수에 대한 이해가 늦는 거 같다'])
}

// CASE H — late onend after stop
{
  const run = holdSession({ stopThrows: true, abortThrows: true })
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]))
  run.rec()?.running && (run.rec()!.running = false)
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  run.rec()?.emitEnd()
  assert.deepEqual(run.finals, ['함수에 대한 이해가 늦는 거 같다'])
}

// CASE I — multiple fragments preserve order
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '2차 함수에 대한', isFinal: true }]))
  run.rec()?.emitEnd()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '이해가 늦는', isFinal: true }]))
  run.rec()?.emitEnd()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '거 같다', isFinal: true }]))
  run.session?.stop()
  assert.equal(run.finals[0], '2차 함수에 대한 이해가 늦는 거 같다')
}

// CASE J — growing prefix does not duplicate
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '2차 함수에', isFinal: true }]))
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '2차 함수에 대한 이해가 늦는 거 같다', isFinal: true }]),
  )
  run.session?.stop()
  assert.equal(run.finals[0], '2차 함수에 대한 이해가 늦는 거 같다')
}

// CASE K — legitimate repeated Korean words preserved
{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '계산 계산 실수가 많이 줄었다', isFinal: true }]),
  )
  run.session?.stop()
  assert.equal(run.finals[0], '계산 계산 실수가 많이 줄었다')
}

// CASE L — feedback-only transcript through parse/apply
{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '함수에 대한 이해가 늦는 거 같다', isFinal: true }]),
  )
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.teacherFeedback, '함수에 대한 이해가 늦는 거 같다')
  assert.equal(parsed.attempts.length, 0)
  assert.equal(parsed.needsReview.length, 0)
}

// CASE M — Samsung source-of-truth sentence
{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '2차 함수에 대한 이해가 늦는 거 같다', isFinal: true }]),
  )
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.teacherFeedback, '2차 함수에 대한 이해가 늦는 거 같다')
  assert.equal(parsed.attempts.length, 0)
  assert.doesNotMatch(parsed.teacherFeedback ?? '', /유정현|류정현/)
}

// CASE N — score + feedback
{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [
      {
        transcript: '1차 80 불합격 2차 95 합격 함수에 대한 이해가 늦는 거 같다',
        isFinal: true,
      },
    ]),
  )
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '95'],
    ],
  )
  assert.equal(visualStatusFromScoreDraft('80'), '불합격')
  assert.equal(visualStatusFromScoreDraft('95'), '합격')
  assert.equal(parsed.teacherFeedback, '함수에 대한 이해가 늦는 거 같다')
}

// CASE O — score-only preserves existing feedback
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '1차 80 불합격 2차 95 합격', isFinal: true }]))
  run.session?.stop()
  const applied = applyStudentDailyTestDraft(
    {
      nagyeong: emptyDraft(),
      doyoung: emptyDraft(),
      ryujeonghyeon: {
        ...emptyDraft(),
        learningDiagnosis: {
          ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
          teacherFeedback: '기존 피드백',
        },
      },
    },
    run.finals[0] ?? '',
    류정현,
    roster,
    [],
    '2026-09-15',
  )
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[0]?.score, '80')
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[1]?.score, '95')
  assert.equal(applied.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, '기존 피드백')
}

// CASE P — unsupported SpeechRecognition → session null, text fallback remains in UI
{
  const run = holdSession({ getCtor: () => null })
  assert.equal(run.session, null)
  const ui = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
  assert.match(ui, /submitFallback/)
  assert.match(ui, /텍스트 반영/)
  assert.match(ui, /이 브라우저는 음성 인식을 지원하지 않습니다/)
  assert.doesNotMatch(ui, /MediaRecorder/)
  assert.doesNotMatch(readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8'), /Whisper|OpenAI|Azure|CLOVA/)
}

assert.match(
  readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8'),
  /SAMSUNG_RYU_FEEDBACK_ONLY_TRANSCRIPT/,
)

console.log('iosHeldSpeechSession.test.ts passed')
