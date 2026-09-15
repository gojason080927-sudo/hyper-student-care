/**
 * iPhone-like rapid continuous speech: WebKit event-order stress.
 * Does not claim physical iPhone validation.
 * 실행: npx tsx src/utils/voiceInput/iosNaturalContinuousSpeech.test.ts
 */
import assert from 'node:assert/strict'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import {
  createSpeechTranscriptSession,
  HELD_SPEECH_RESTART_RETRY_MS,
  reconcileSameIndexHypothesis,
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import { routeVoiceTranscript } from './voiceSaveCommand.ts'

const MIXED = '1차 50점 불합격 2차 90점 합격 나날이 발전하고 있다'
const PREFIX = '1차 50점 불합격'
const REST = '2차 90점 합격 나날이 발전하고 있다'
const FEEDBACK = '나날이 발전하고 있다'
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
    this.running = false
    this.onend?.()
  }

  abort() {
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
}

function namedError(name: string) {
  const err = new Error(name)
  err.name = name
  return err
}

function holdSession(options?: { throwOnStart?: Error | null; throwAfterStarts?: number }) {
  const queued: Array<{ fn: () => void; ms: number }> = []
  let rec: FakeSpeechRecognition | null = null
  const finals: string[] = []
  const FakeCtor = class extends FakeSpeechRecognition {
    constructor() {
      super()
      rec = this
      this.throwOnStart = options?.throwOnStart ?? null
      this.throwAfterStarts = options?.throwAfterStarts ?? 0
    }
  }
  const session = startKoreanSpeechRecognition(
    {
      holdUntilExplicitStop: true,
      onFinal: (text) => {
        finals.push(text)
      },
      onError: () => {},
      onEnd: () => {},
    },
    {
      getCtor: () => FakeCtor,
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
    queued,
    flush() {
      const next = queued.shift()
      next?.fn()
    },
  }
}

function expectMixed(text: string) {
  const routed = routeVoiceTranscript(text)
  assert.equal(routed.kind, 'form-fill', text)
  const parsed = parseStudentDailyTestVoice(
    routed.kind === 'form-fill' ? routed.transcript : '',
    류정현,
    roster,
    false,
  )
  assert.equal(parsed.attempts.find((row) => row.round === 1)?.score, '50', text)
  assert.equal(parsed.attempts.find((row) => row.round === 2)?.score, '90', text)
  assert.equal(visualStatusFromScoreDraft('50'), '불합격')
  assert.equal(visualStatusFromScoreDraft('90'), '합격')
  assert.equal(parsed.teacherFeedback, FEEDBACK, text)
  assert.equal(parsed.needsReview.length, 0, text)
  assert.doesNotMatch(parsed.teacherFeedback ?? '', /1차 50|2차 90|50점|90점/)
  const applied = applyStudentDailyTestDraft(
    {
      nagyeong: emptyDraft(),
      doyoung: emptyDraft(),
      ryujeonghyeon: emptyDraft(),
    },
    routed.kind === 'form-fill' ? routed.transcript : '',
    류정현,
    roster,
    [],
    '2026-09-15',
  )
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[0]?.score, '50')
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[1]?.score, '90')
  assert.equal(applied.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, FEEDBACK)
  return { routed, parsed, applied }
}

function playAndStop(
  events: Array<{ kind: 'result'; event: SpeechRecognitionResultEventLike } | { kind: 'end' }>,
) {
  const run = holdSession()
  assert.ok(run.session)
  for (const step of events) {
    if (step.kind === 'end') run.rec()?.emitEnd()
    else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  assert.equal(run.finals.length, 1, JSON.stringify(events))
  expectMixed(run.finals[0] ?? '')
  return run
}

assert.equal(reconcileSameIndexHypothesis(MIXED, PREFIX), MIXED)
assert.equal(reconcileSameIndexHypothesis(PREFIX, MIXED), MIXED)
assert.equal(reconcileSameIndexHypothesis('1차 50점 합격', '1차 50점 불합격'), '1차 50점 불합격')
assert.equal(reconcileSameIndexHypothesis(PREFIX, REST), MIXED)

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 50점', isFinal: false }]))
  session.ingest(speechEvent(0, [{ transcript: '1차 50점 불합격 2차', isFinal: false }]))
  session.ingest(speechEvent(0, [{ transcript: '1차 50점 불합격 2차 90점', isFinal: false }]))
  session.ingest(speechEvent(0, [{ transcript: MIXED, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), MIXED)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(
    speechEvent(0, [
      { transcript: PREFIX, isFinal: true },
      { transcript: '2차 90점 합격 나날이', isFinal: false },
    ]),
  )
  session.ingest(
    speechEvent(1, [
      { transcript: PREFIX, isFinal: true },
      { transcript: REST, isFinal: true },
    ]),
  )
  assert.equal(session.peekHoldTranscript(), MIXED)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 50점 불합격 2차 90점', isFinal: true }]))
  session.ingest(speechEvent(0, [{ transcript: MIXED, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), MIXED)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(
    speechEvent(0, [
      { transcript: PREFIX, isFinal: true },
      { transcript: REST, isFinal: true },
    ]),
  )
  assert.equal(session.peekHoldTranscript(), MIXED)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: MIXED, isFinal: true }]))
  session.ingest(speechEvent(0, [{ transcript: FEEDBACK, isFinal: false }]))
  assert.equal(session.peekHoldTranscript(), MIXED)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: MIXED, isFinal: false }]))
  assert.equal(session.peekHoldTranscript(), MIXED)
}

playAndStop([{ kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) }])

playAndStop([
  { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
  { kind: 'end' },
  { kind: 'result', event: speechEvent(0, [{ transcript: REST, isFinal: true }]) },
])

{
  const run = holdSession({
    throwOnStart: namedError('InvalidStateError'),
    throwAfterStarts: 1,
  })
  run.rec()?.emitResult(speechEvent(0, [{ transcript: MIXED, isFinal: false }]))
  run.rec()?.emitEnd()
  assert.equal(run.queued[0]?.ms, HELD_SPEECH_RESTART_RETRY_MS)
  run.flush()
  run.session?.stop()
  assert.equal(run.finals[0], MIXED)
  expectMixed(run.finals[0] ?? '')
}

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: PREFIX, isFinal: true }]))
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.attempts[0]?.round, 1)
  assert.equal(parsed.teacherFeedback, undefined)
}

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: FEEDBACK, isFinal: true }]))
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.teacherFeedback, FEEDBACK)
  assert.equal(parsed.attempts.length, 0)
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Step = { kind: 'result'; event: SpeechRecognitionResultEventLike } | { kind: 'end' }

function sequenceFor(kind: number): Step[] {
  switch (kind % 14) {
    case 0:
      return [{ kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) }]
    case 1:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: '1차 50점', isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: '1차 50점 불합격 2차 90점', isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
      ]
    case 2:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
        {
          kind: 'result',
          event: speechEvent(0, [
            { transcript: PREFIX, isFinal: true },
            { transcript: '2차 90점 합격 나날이', isFinal: false },
          ]),
        },
        {
          kind: 'result',
          event: speechEvent(1, [
            { transcript: PREFIX, isFinal: true },
            { transcript: REST, isFinal: true },
          ]),
        },
      ]
    case 3:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
      ]
    case 4:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: '1차 50점 불합격 2차 90점', isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
      ]
    case 5:
      return [
        {
          kind: 'result',
          event: speechEvent(0, [
            { transcript: PREFIX, isFinal: true },
            { transcript: REST, isFinal: true },
          ]),
        },
      ]
    case 6:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
        { kind: 'end' },
      ]
    case 7:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: FEEDBACK, isFinal: false }]) },
      ]
    case 8:
      return [{ kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: false }]) }]
    case 9:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: false }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: REST, isFinal: true }]) },
      ]
    case 10:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: REST, isFinal: true }]) },
      ]
    case 11:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
      ]
    case 12:
      return [
        {
          kind: 'result',
          event: speechEvent(0, [
            { transcript: PREFIX, isFinal: true },
            { transcript: REST, isFinal: false },
          ]),
        },
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
      ]
    default:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: MIXED, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'end' },
      ]
  }
}

let routeCount = 0
let parseCount = 0
let applyCount = 0

for (let i = 0; i < 520; i += 1) {
  const rng = mulberry32(i * 997)
  const kind = Math.floor(rng() * 14)
  const extraPrefix = rng() > 0.5
  const steps = sequenceFor(kind)
  if (extraPrefix) {
    steps.push({ kind: 'result', event: speechEvent(0, [{ transcript: PREFIX, isFinal: true }]) })
  }
  if (rng() > 0.7) steps.push({ kind: 'end' })
  const run = holdSession()
  for (const step of steps) {
    if (step.kind === 'end') run.rec()?.emitEnd()
    else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  if (rng() > 0.6) run.rec()?.emitEnd()
  assert.equal(run.finals.length, 1, `stress ${i} kind=${kind}`)
  routeCount += 1
  parseCount += 1
  applyCount += 1
  expectMixed(run.finals[0] ?? '')
}

assert.equal(routeCount, 520)
assert.equal(parseCount, 520)
assert.equal(applyCount, 520)

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 50점 불합격 나날이 발전하고 있다', isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), '1차 50점 불합격 나날이 발전하고 있다')
  const parsed = parseStudentDailyTestVoice(session.peekHoldTranscript(), 류정현, roster, false)
  assert.equal(parsed.attempts.find((row) => row.round === 2), undefined)
  assert.notEqual(parsed.teacherFeedback, undefined)
}

{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [{ transcript: '2차 함수에 대한 이해가 늦는 거 같다', isFinal: true }]),
  )
  run.session?.stop()
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.teacherFeedback, '2차 함수에 대한 이해가 늦는 거 같다')
  assert.equal(parsed.attempts.length, 0)
}

console.log('iosNaturalContinuousSpeech.test.ts passed (520 stress runs)')
