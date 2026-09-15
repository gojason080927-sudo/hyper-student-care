/**
 * iPhone long-listen: WebKit generations are transport, not utterances.
 * Physical failure fixtures + 1000-sequence stress.
 * Does not claim physical iPhone validation.
 * 실행: npx tsx src/utils/voiceInput/iosCrossGenerationReplay.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import {
  accumulateHeldFragments,
  compactFinalHypotheses,
  createSpeechTranscriptSession,
  reconcileLogicalTranscript,
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import { dispatchVoiceSessionFinal, routeVoiceTranscript } from './voiceSaveCommand.ts'

const GOLDEN = '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음'
const FEEDBACK = '나날이 속도가 빨라지고 정확도가 높아지고 있음'
const SCORES = '1차 30점 2차 50점 3차 100점'
const GROWING = [
  '1차 30점',
  '1차 30점 2차 50점',
  '1차 30점 2차 50점 3차 100점',
  '1차 30점 2차 50점 3차 100점 나날이',
  '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고',
  GOLDEN,
] as const

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

function countSpan(text: string, span: string): number {
  if (!span) return 0
  let count = 0
  let from = 0
  while (from <= text.length) {
    const at = text.indexOf(span, from)
    if (at < 0) break
    count += 1
    from = at + span.length
  }
  return count
}

function assertOnce(text: string, span: string, label: string) {
  const n = countSpan(text.replace(/\s+/g, ' '), span)
  assert.equal(n, 1, `${label}: "${span}" count=${n} in ${JSON.stringify(text)}`)
}

function expectGoldenParse(text: string, label = text) {
  const routed = routeVoiceTranscript(text)
  assert.equal(routed.kind, 'form-fill', label)
  const parsed = parseStudentDailyTestVoice(
    routed.kind === 'form-fill' ? routed.transcript : '',
    류정현,
    roster,
    false,
  )
  assert.equal(parsed.attempts.find((row) => row.round === 1)?.score, '30', label)
  assert.equal(parsed.attempts.find((row) => row.round === 2)?.score, '50', label)
  assert.equal(parsed.attempts.find((row) => row.round === 3)?.score, '100', label)
  assert.equal(parsed.attempts.find((row) => row.round === 4)?.score, undefined, label)
  assert.equal(visualStatusFromScoreDraft('30'), '불합격')
  assert.equal(visualStatusFromScoreDraft('50'), '불합격')
  assert.equal(visualStatusFromScoreDraft('100'), '합격')
  assert.equal(parsed.teacherFeedback, FEEDBACK, label)
  assert.equal(parsed.needsReview.length, 0, `${label} needsReview=${JSON.stringify(parsed.needsReview)}`)
  assert.doesNotMatch(parsed.teacherFeedback ?? '', /1차|2차|3차|30점|50점|100점/)
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
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[0]?.score, '30')
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[1]?.score, '50')
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[2]?.score, '100')
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[3]?.score, '')
  assert.equal(applied.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, FEEDBACK)
  assertOnce(text, '1차 30점', label)
  assertOnce(text, '2차 50점', label)
  assertOnce(text, '3차 100점', label)
  assertOnce(text, FEEDBACK, label)
  return parsed
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
  running = false

  start() {
    this.startCount += 1
    this.running = true
    this.onstart?.()
  }

  stop() {
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

function holdSession() {
  const queued: Array<{ fn: () => void; ms: number }> = []
  let rec: FakeSpeechRecognition | null = null
  const finals: string[] = []
  const interims: string[] = []
  let ended = 0
  const FakeCtor = class extends FakeSpeechRecognition {
    constructor() {
      super()
      rec = this
    }
  }
  const session = startKoreanSpeechRecognition(
    {
      holdUntilExplicitStop: true,
      onInterim: (text) => {
        interims.push(text)
      },
      onFinal: (text) => {
        finals.push(text)
      },
      onError: () => {},
      onEnd: () => {
        ended += 1
      },
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
    interims,
    ended: () => ended,
    queued,
    flush() {
      const next = queued.shift()
      next?.fn()
    },
  }
}

function play(
  steps: Array<{ kind: 'result'; event: SpeechRecognitionResultEventLike } | { kind: 'end' }>,
) {
  const run = holdSession()
  assert.ok(run.session)
  for (const step of steps) {
    if (step.kind === 'end') run.rec()?.emitEnd()
    else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  assert.equal(run.finals.length, 1, JSON.stringify(run.finals))
  expectGoldenParse(run.finals[0] ?? '', JSON.stringify(steps))
  for (const live of run.interims) {
    assert.ok(countSpan(live, '1차 30점') <= 1, `live dup 1차 ${JSON.stringify(live)}`)
    assert.ok(countSpan(live, '2차 50점') <= 1, `live dup 2차 ${JSON.stringify(live)}`)
    assert.ok(countSpan(live, '3차 100점') <= 1, `live dup 3차 ${JSON.stringify(live)}`)
    assert.ok(
      countSpan(live.replace(/\s+/g, ''), FEEDBACK.replace(/\s+/g, '')) <= 1,
      `live dup feedback ${JSON.stringify(live)}`,
    )
  }
  return run
}

// Policy unit tests
assert.equal(reconcileLogicalTranscript('1차 30점', '1차 30점 2차 50점'), '1차 30점 2차 50점')
assert.equal(reconcileLogicalTranscript(SCORES, SCORES), SCORES)
assert.equal(reconcileLogicalTranscript(SCORES, '1차 30점'), SCORES)
assert.equal(
  reconcileLogicalTranscript(SCORES, `${SCORES} 나날이`),
  `${SCORES} 나날이`,
)
assert.equal(
  reconcileLogicalTranscript(`${SCORES} 나날이 속도가 빨라지고`, GOLDEN),
  GOLDEN,
)
assert.equal(
  reconcileLogicalTranscript(
    '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고',
    '나날이 속도가 빨라지고 정확도가 높아지고 있음',
  ),
  GOLDEN,
)
assert.equal(
  reconcileLogicalTranscript(GOLDEN, '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고'),
  GOLDEN,
)
assert.equal(
  reconcileLogicalTranscript(SCORES, '2차 50점'),
  SCORES,
)
assert.equal(
  reconcileLogicalTranscript('정확도가 높아 높아지고 있다', '정확도가 높아 높아지고 있다'),
  '정확도가 높아 높아지고 있다',
)
assert.equal(
  reconcileLogicalTranscript('', '매우 매우 집중을 잘했다'),
  '매우 매우 집중을 잘했다',
)
assert.equal(
  reconcileLogicalTranscript('1차는 30점이고', '2차도 30점이다'),
  '1차는 30점이고 2차도 30점이다',
)
assert.equal(
  reconcileLogicalTranscript('1차 80점 불합격 2차 90점 합격', '피드백 계산 실수가 많이 줄었고'),
  '1차 80점 불합격 2차 90점 합격 피드백 계산 실수가 많이 줄었고',
)
assert.equal(
  reconcileLogicalTranscript('2차 함수에 대한', '이해가 늦는 거 같다'),
  '2차 함수에 대한 이해가 늦는 거 같다',
)

{
  let logical = ''
  for (const piece of GROWING) logical = reconcileLogicalTranscript(logical, piece)
  logical = reconcileLogicalTranscript(logical, '1차 30점')
  logical = reconcileLogicalTranscript(logical, GOLDEN)
  logical = reconcileLogicalTranscript(logical, GOLDEN)
  assert.equal(logical, GOLDEN)
}

assert.equal(
  accumulateHeldFragments(
    '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고',
    '나날이 속도가 빨라지고 정확도가 높아지고 있음',
  ),
  GOLDEN,
)

// FIXTURE 1 — growing full-prefix replay in the same generation
{
  const session = createSpeechTranscriptSession()
  for (const piece of GROWING) {
    session.ingest(speechEvent(0, [{ transcript: piece, isFinal: false }]))
  }
  session.ingest(speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), GOLDEN)
}

// FIXTURE 2 — resultIndex reset to 0 after separate finals (stale higher slots)
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 30점', isFinal: true }]))
  session.ingest(
    speechEvent(1, [
      { transcript: '1차 30점', isFinal: true },
      { transcript: '2차 50점', isFinal: true },
    ]),
  )
  session.ingest(
    speechEvent(2, [
      { transcript: '1차 30점', isFinal: true },
      { transcript: '2차 50점', isFinal: true },
      { transcript: '3차 100점', isFinal: true },
    ]),
  )
  session.ingest(speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), GOLDEN)
  assertOnce(session.peekHoldTranscript(), '1차 30점', 'fixture2')
  assertOnce(session.peekHoldTranscript(), '2차 50점', 'fixture2')
  assertOnce(session.peekHoldTranscript(), '3차 100점', 'fixture2')
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(
    speechEvent(0, [
      { transcript: '1차 30점', isFinal: true },
      { transcript: '2차 50점', isFinal: true },
      { transcript: '3차 100점', isFinal: true },
    ]),
  )
  session.ingest(speechEvent(0, [{ transcript: `${SCORES} 나날이 속도가 빨라지고`, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), `${SCORES} 나날이 속도가 빨라지고`)
  assertOnce(session.peekHoldTranscript(), '2차 50점', 'fixture2-shrink')
}

// FIXTURE 3 — short prefix → long prefix → shorter final (keep longer semantic)
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 30점', isFinal: false }]))
  session.ingest(speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]))
  session.ingest(speechEvent(0, [{ transcript: SCORES, isFinal: true }]))
  assert.equal(session.peekHoldTranscript(), GOLDEN)
}

// FIXTURE 4 — scores repeated across 3+ recognition generations
play([
  { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
  { kind: 'end' },
  { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
  { kind: 'end' },
  { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
])

// FIXTURE 5 — scores then progressively growing Korean feedback, including suffix-only restart
play([
  { kind: 'result', event: speechEvent(0, [{ transcript: '1차 30점', isFinal: false }]) },
  { kind: 'result', event: speechEvent(0, [{ transcript: '1차 30점 2차 50점', isFinal: false }]) },
  { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
  { kind: 'end' },
  {
    kind: 'result',
    event: speechEvent(0, [{ transcript: `${SCORES} 나날이 속도가 빨라지고`, isFinal: false }]),
  },
  { kind: 'end' },
  {
    kind: 'result',
    event: speechEvent(0, [
      { transcript: '나날이 속도가 빨라지고 정확도가 높아지고 있음', isFinal: true },
    ]),
  },
])

// FIXTURE 6 — feedback tail correction
play([
  {
    kind: 'result',
    event: speechEvent(0, [
      { transcript: `${SCORES} 나날이 속도가 빨라지고 정확도가 높아지고`, isFinal: true },
    ]),
  },
  { kind: 'end' },
  { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
])

// FIXTURE 7 — interim longest, final shorter prefix
play([
  { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
  { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
])

// FIXTURE 8 — explicit stop immediately after restart/onend
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]))
  run.rec()?.emitEnd()
  assert.equal(run.finals.length, 0)
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  expectGoldenParse(run.finals[0] ?? '', 'fixture8')
}

// Physical CASE A reconstruction: separate finals then idx0 full replay, then restart replay, then growing feedback
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '1차 30점', isFinal: true }]))
  run.rec()?.emitResult(
    speechEvent(1, [
      { transcript: '1차 30점', isFinal: true },
      { transcript: '2차 50점', isFinal: true },
    ]),
  )
  run.rec()?.emitResult(
    speechEvent(2, [
      { transcript: '1차 30점', isFinal: true },
      { transcript: '2차 50점', isFinal: true },
      { transcript: '3차 100점', isFinal: true },
    ]),
  )
  run.rec()?.emitResult(speechEvent(0, [{ transcript: SCORES, isFinal: true }]))
  run.rec()?.emitEnd()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: SCORES, isFinal: false }]))
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]))
  run.rec()?.emitEnd()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]))
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  expectGoldenParse(run.finals[0] ?? '', 'physical-A')
  assert.ok(run.interims.length > 0)
  assert.equal(run.interims.at(-1), GOLDEN)
}

// Physical CASE B: live replay then stop after a restart with only prefix in the new generation
{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]))
  run.rec()?.emitEnd()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: SCORES, isFinal: false }]))
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]))
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  expectGoldenParse(run.finals[0] ?? '', 'physical-B')
}

// Save command: replayed generation must not save twice
{
  let saves = 0
  const session = {
    consumed: false,
    consumeFinal() {
      if (this.consumed) return { text: '일괄 저장', delivered: false }
      this.consumed = true
      return { text: '일괄 저장', delivered: true }
    },
  }
  dispatchVoiceSessionFinal(session, {
    onSaveCommand: () => {
      saves += 1
    },
    onApply: () => {
      throw new Error('save must not apply')
    },
  })
  dispatchVoiceSessionFinal(session, {
    onSaveCommand: () => {
      saves += 1
    },
    onApply: () => {
      throw new Error('save must not apply')
    },
  })
  assert.equal(saves, 1)
  assert.equal(routeVoiceTranscript('저장').kind, 'form-fill')
  assert.equal(routeVoiceTranscript('완료').kind, 'form-fill')
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

function stressSequence(kind: number, rng: () => number): Step[] {
  const grow = GROWING[Math.floor(rng() * GROWING.length)] ?? SCORES
  switch (kind % 16) {
    case 0:
      return GROWING.map((transcript) => ({
        kind: 'result' as const,
        event: speechEvent(0, [{ transcript, isFinal: false }]),
      }))
    case 1:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
      ]
    case 2:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: '1차 30점', isFinal: true }]) },
        {
          kind: 'result',
          event: speechEvent(1, [
            { transcript: '1차 30점', isFinal: true },
            { transcript: '2차 50점', isFinal: true },
          ]),
        },
        {
          kind: 'result',
          event: speechEvent(2, [
            { transcript: '1차 30점', isFinal: true },
            { transcript: '2차 50점', isFinal: true },
            { transcript: '3차 100점', isFinal: true },
          ]),
        },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
      ]
    case 3:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
      ]
    case 4:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: grow, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
      ]
    case 5:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
        { kind: 'end' },
        {
          kind: 'result',
          event: speechEvent(0, [{ transcript: '나날이 속도가 빨라지고 정확도가 높아지고 있음', isFinal: true }]),
        },
      ]
    case 6:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
      ]
    case 7:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: `${SCORES} 나날이 속도가 빨라지고`, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
      ]
    case 8:
      return [{ kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) }]
    case 9:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
        { kind: 'end' },
        { kind: 'end' },
      ]
    case 10: {
      const gens = 2 + Math.floor(rng() * 5)
      const steps: Step[] = []
      for (let i = 0; i < gens; i += 1) {
        steps.push({
          kind: 'result',
          event: speechEvent(0, [{ transcript: i === gens - 1 ? GOLDEN : SCORES, isFinal: i % 2 === 0 }]),
        })
        if (i < gens - 1) steps.push({ kind: 'end' })
      }
      return steps
    }
    case 11:
      return [
        {
          kind: 'result',
          event: speechEvent(0, [
            { transcript: '1차 30점', isFinal: true },
            { transcript: '2차 50점', isFinal: true },
            { transcript: '3차 100점', isFinal: true },
          ]),
        },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
      ]
    case 12:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: '1차 30점', isFinal: false }]) },
      ]
    case 13:
      return GROWING.flatMap((transcript, index) => {
        const steps: Step[] = [
          { kind: 'result', event: speechEvent(0, [{ transcript, isFinal: index % 2 === 0 }]) },
        ]
        if (index % 3 === 2) steps.push({ kind: 'end' })
        return steps
      })
    case 14:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: true }]) },
        { kind: 'result', event: speechEvent(0, [{ transcript: FEEDBACK, isFinal: false }]) },
      ]
    default:
      return [
        { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: SCORES, isFinal: true }]) },
        { kind: 'end' },
        { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN, isFinal: false }]) },
      ]
  }
}

let stressApply = 0
for (let i = 0; i < 1000; i += 1) {
  const rng = mulberry32(i * 1337 + 11)
  const steps = stressSequence(Math.floor(rng() * 16), rng)
  if (rng() > 0.6) steps.push({ kind: 'end' })
  const run = holdSession()
  for (const step of steps) {
    if (step.kind === 'end') run.rec()?.emitEnd()
    else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  assert.equal(run.finals.length, 1, `stress ${i} ${JSON.stringify(run.finals)}`)
  expectGoldenParse(run.finals[0] ?? '', `stress ${i}`)
  stressApply += 1
}
assert.equal(stressApply, 1000)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /reconcileLogicalTranscript/)
assert.match(speech, /holdUntilExplicitStop/)
assert.match(speech, /createSpeechTranscriptSession/)

const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /holdUntilExplicitStop: true/)
assert.match(voiceUi, /듣는 중:/)
assert.match(voiceUi, /data-live-transcript/)
assert.doesNotMatch(voiceUi, /holdUntilExplicitStop: false/)

console.log('iosCrossGenerationReplay.test.ts passed (1000 stress runs)')
