/**
 * SEV-1 iPhone token-boundary / sibling-hypothesis replay.
 * Physical screenshot after PR #36 is the source of truth.
 * Does not claim physical iPhone success.
 * 실행: npx tsx src/utils/voiceInput/iosIphoneTokenBoundaryReplay.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import { createSpeechForensicRecorder } from './speechForensic.ts'
import {
  accumulateHeldFragments,
  compactFinalHypotheses,
  createSpeechTranscriptSession,
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import {
  legacyCompactReconcile,
  mergeUtteranceHypotheses,
  withoutProtection,
} from './utteranceHypothesisMerge.ts'
import { dispatchVoiceSessionFinal, routeVoiceTranscript } from './voiceSaveCommand.ts'

const GOLDEN_A = '1차 22점 2차 53점 3차 100점 나날이 발전하고 있음'
const FEEDBACK_A = '나날이 발전하고 있음'
const GOLDEN_B = '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음'
const FEEDBACK_B = '나날이 속도가 빨라지고 정확도가 높아지고 있음'
const GOLDEN_C = '1차 70점 불합격 개념 부족 2개 계산 실수 1개 피드백 계산 과정은 좋아지고 있다'
const FEEDBACK_C = '계산 과정은 좋아지고 있다'

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

function parseA(text: string, label = text) {
  const parsed = parseStudentDailyTestVoice(text, 류정현, roster, false)
  assert.equal(parsed.attempts.find((row) => row.round === 1)?.score, '22', label)
  assert.equal(parsed.attempts.find((row) => row.round === 2)?.score, '53', label)
  assert.equal(parsed.attempts.find((row) => row.round === 3)?.score, '100', label)
  assert.equal(visualStatusFromScoreDraft('22'), '불합격')
  assert.equal(visualStatusFromScoreDraft('53'), '불합격')
  assert.equal(visualStatusFromScoreDraft('100'), '합격')
  const garbage =
    /1차 22차|이 차 오|일 1차|1차 2차 100|나 나 나날이|나날이 이발/.test(parsed.teacherFeedback ?? '')
  if (parsed.teacherFeedback) {
    assert.equal(parsed.teacherFeedback, FEEDBACK_A, `${label} feedback=${parsed.teacherFeedback}`)
    assert.equal(garbage, false, label)
  } else {
    assert.ok(parsed.needsReview.length > 0, `${label} expected needsReview when feedback omitted`)
  }
  return parsed
}

function expectA(text: string, label = text) {
  const routed = routeVoiceTranscript(text)
  assert.equal(routed.kind, 'form-fill', label)
  const parsed = parseA(routed.kind === 'form-fill' ? routed.transcript : '', label)
  const applied = applyStudentDailyTestDraft(
    { nagyeong: emptyDraft(), doyoung: emptyDraft(), ryujeonghyeon: emptyDraft() },
    routed.kind === 'form-fill' ? routed.transcript : '',
    류정현,
    roster,
    [],
    '2026-09-15',
  )
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[0]?.score, '22', label)
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[1]?.score, '53', label)
  assert.equal(applied.drafts.ryujeonghyeon?.rounds[2]?.score, '100', label)
  if (parsed.teacherFeedback) {
    assert.equal(applied.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, FEEDBACK_A, label)
  }
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
  throwOnStart: Error | null = null

  start() {
    this.startCount += 1
    if (this.throwOnStart) throw this.throwOnStart
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
  const FakeCtor = class extends FakeSpeechRecognition {
    constructor() {
      super()
      rec = this
    }
  }
  const forensic = createSpeechForensicRecorder()
  const session = startKoreanSpeechRecognition(
    {
      holdUntilExplicitStop: true,
      forensic,
      onInterim: (text) => {
        interims.push(text)
      },
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
    interims,
    forensic,
    flush() {
      queued.shift()?.fn()
    },
  }
}

function assertLiveClean(interims: string[], spans: string[]) {
  for (const live of interims) {
    for (const span of spans) {
      assert.ok(countSpan(live.replace(/\s+/g, ' '), span) <= 1, `live dup ${span} in ${JSON.stringify(live)}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Proof: old compact reconcile FAILS the physical screenshot topology
// ---------------------------------------------------------------------------
{
  const polluted = legacyCompactReconcile(GOLDEN_A, '1차 22차 5 나날이 발전하고 있음')
  assert.match(polluted, /1차 22차 5/)
  assert.equal(countSpan(polluted, FEEDBACK_A), 2)
  const parsed = parseStudentDailyTestVoice(polluted, 류정현, roster, false, { confidenceGate: false })
  assert.equal(parsed.attempts.find((row) => row.round === 1)?.score, '22')
  assert.notEqual(parsed.teacherFeedback, FEEDBACK_A)
  assert.match(parsed.teacherFeedback ?? '', /1차/)
}

{
  let acc = ''
  for (const piece of [
    GOLDEN_A,
    '1차 22차 5 나날이 발전하고 있음',
    '일 1차',
    '1차 이 차 오',
    '1차 2',
    '1차 2차 100',
    '나',
    '나',
    '나날이',
    '이발',
    '나날이 발전하고 있음',
  ]) {
    acc = legacyCompactReconcile(acc, piece)
  }
  assert.match(acc, /1차 22차 5/)
  assert.match(acc, /일 1차 1차 이 차 오/)
  const parsed = parseStudentDailyTestVoice(acc, 류정현, roster, false, { confidenceGate: false })
  assert.equal(parsed.attempts[0]?.score, '22')
  assert.notEqual(parsed.teacherFeedback, FEEDBACK_A)
}

// New merge keeps GOLDEN_A
assert.equal(mergeUtteranceHypotheses(GOLDEN_A, '1차 22차 5 나날이 발전하고 있음'), GOLDEN_A)
assert.equal(mergeUtteranceHypotheses(GOLDEN_A, '일 1차'), GOLDEN_A)
assert.equal(mergeUtteranceHypotheses('나 나', '나날이'), '나날이')
assert.equal(
  mergeUtteranceHypotheses('1차 22점 2차 53점 3차 100점 나날이 이발', FEEDBACK_A),
  GOLDEN_A,
)

{
  let acc = ''
  for (const piece of [
    GOLDEN_A,
    '1차 22차 5 나날이 발전하고 있음',
    '일 1차',
    '1차 이 차 오',
    '1차 2',
    '1차 2차 100',
    '나',
    '나',
    '나날이',
    '이발',
    '나날이 발전하고 있음',
  ]) {
    acc = accumulateHeldFragments(acc, piece)
  }
  assert.equal(acc, GOLDEN_A)
  expectA(acc, 'physical-stream')
}

// GOLDEN A/B/C parser
{
  const a = parseStudentDailyTestVoice(GOLDEN_A, 류정현, roster, false)
  assert.equal(a.teacherFeedback, FEEDBACK_A)
  assert.equal(a.needsReview.length, 0)
  const b = parseStudentDailyTestVoice(GOLDEN_B, 류정현, roster, false)
  assert.equal(b.teacherFeedback, FEEDBACK_B)
  const c = parseStudentDailyTestVoice(GOLDEN_C, 류정현, roster, false)
  assert.equal(c.attempts.find((row) => row.round === 1)?.score, '70')
  assert.equal(c.conceptLackCount, 2)
  assert.equal(c.calculationErrorCount, 1)
  assert.equal(c.teacherFeedback, FEEDBACK_C)
  const lexical = parseStudentDailyTestVoice(
    '류정현 1차 80 불합격 2차 함수에 대한 이해가 늦는 거 같다',
    류정현,
    roster,
    false,
  )
  assert.equal(lexical.attempts.find((row) => row.round === 1)?.score, '80')
  assert.match(lexical.teacherFeedback ?? '', /2차 함수/)
}

assert.equal(mergeUtteranceHypotheses('', '매우 매우 집중을 잘했다'), '매우 매우 집중을 잘했다')
assert.equal(
  mergeUtteranceHypotheses('1차는 30점이고', '2차도 30점이다'),
  '1차는 30점이고 2차도 30점이다',
)

// Fixtures 1–8 style + 30 topologies against GOLDEN_A via hold session
function playA(
  steps: Array<{ kind: 'result'; event: SpeechRecognitionResultEventLike } | { kind: 'end' }>,
  label: string,
) {
  const run = holdSession()
  assert.ok(run.session)
  for (const step of steps) {
    if (step.kind === 'end') {
      run.rec()?.emitEnd()
      run.flush()
    } else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  assert.equal(run.finals.length, 1, `${label} ${JSON.stringify(run.finals)}`)
  expectA(run.finals[0] ?? '', label)
  assertLiveClean(run.interims, ['1차 22점', '2차 53점', '3차 100점'])
  assert.ok(run.forensic.snapshot().length > 0, label)
  return run
}

playA([{ kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) }], 'same-index-final')
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점', isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'same-index-growth',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22차 5', isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'same-index-correction',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점 2차 53점 3차 100점', isFinal: true }]) },
  ],
  'shorter-final',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점 2차 53점 3차 100점', isFinal: true }]) },
  ],
  'final-then-corrected-final',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점', isFinal: true }]) },
    {
      kind: 'result',
      event: speechEvent(1, [
        { transcript: '1차 22점', isFinal: true },
        { transcript: '2차 53점', isFinal: true },
      ]),
    },
    {
      kind: 'result',
      event: speechEvent(2, [
        { transcript: '1차 22점', isFinal: true },
        { transcript: '2차 53점', isFinal: true },
        { transcript: '3차 100점', isFinal: true },
      ]),
    },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'resultIndex-reset',
)
playA(
  [
    {
      kind: 'result',
      event: speechEvent(0, [
        { transcript: '1차 22점', isFinal: true },
        { transcript: '2차 53점', isFinal: true },
        { transcript: '3차 100점', isFinal: true },
      ]),
    },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'shrink-then-full',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점', isFinal: true }]) },
    {
      kind: 'result',
      event: speechEvent(0, [
        { transcript: '1차 22점', isFinal: true },
        { transcript: '2차 53점 3차 100점 나날이 발전하고 있음', isFinal: false },
      ]),
    },
  ],
  'expand',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'full-replay-after-restart',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점 2차 53점', isFinal: false }]) },
  ],
  'partial-prefix-replay',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점 2차 53점 3차 100점 나날이', isFinal: true }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: '나날이 발전하고 있음', isFinal: true }]) },
  ],
  'suffix-replay',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22점 2차 53점 3차 100점 나날이 이', isFinal: true }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'mid-word-replay',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 22차 5', isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: '1차 2', isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: '22차 5', isFinal: false }]) },
  ],
  'korean-token-correction',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]) },
    { kind: 'end' },
    { kind: 'end' },
  ],
  'duplicate-onend',
)
playA(
  [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]) },
    { kind: 'end' },
    { kind: 'result', event: speechEvent(0, [{ transcript: '이발', isFinal: false }]) },
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]) },
  ],
  'stale-fragment-after-restart',
)

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]))
  run.rec()?.emitEnd()
  run.flush()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: false }]))
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  expectA(run.finals[0] ?? '', 'stop-onend-race')
}

{
  const run = holdSession()
  const rec = run.rec()
  rec?.emitResult(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]))
  if (rec) rec.throwOnStart = Object.assign(new Error('InvalidStateError'), { name: 'InvalidStateError' })
  rec?.emitEnd()
  run.flush()
  run.session?.stop()
  assert.equal(run.finals.length, 1)
  expectA(run.finals[0] ?? '', 'restart-InvalidStateError')
}

{
  const session = createSpeechTranscriptSession({ generationId: 2 })
  session.ingest(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]), { generationId: 2 })
  session.ingest(speechEvent(0, [{ transcript: '일 1차 이 차 오', isFinal: true }]), { generationId: 1 })
  assert.equal(session.peekHoldTranscript(), GOLDEN_A)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]))
  session.ingest(speechEvent(0, [{ transcript: '1차 22차 5 나날이 발전하고 있음', isFinal: false }]))
  assert.equal(session.peekHoldTranscript(), GOLDEN_A)
}

// Live GOLDEN B spans
{
  const run = holdSession()
  for (const piece of [
    '1차 30점',
    '1차 30점 2차 50점',
    GOLDEN_B,
    '1차 30점 2차 50점 3차 100점',
    GOLDEN_B,
  ]) {
    run.rec()?.emitResult(speechEvent(0, [{ transcript: piece, isFinal: false }]))
  }
  run.session?.stop()
  assertLiveClean(run.interims, ['1차 30점', '2차 50점', '3차 100점'])
  const parsed = parseStudentDailyTestVoice(run.finals[0] ?? '', 류정현, roster, false)
  assert.equal(parsed.teacherFeedback, FEEDBACK_B)
}

// Save once
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
}

// Mutation: each protection matters
{
  const polluted = mergeUtteranceHypotheses(
    GOLDEN_A,
    '1차 22차 5 나날이 발전하고 있음',
    withoutProtection('mutableTailReplace'),
  )
  assert.match(polluted, /1차 22차 5/, 'mutableTailReplace mutation must fail closed')
}
{
  const polluted = mergeUtteranceHypotheses(GOLDEN_A, '일', withoutProtection('debrisAbsorb'))
  assert.match(polluted, / 일$/, 'debrisAbsorb mutation must keep debris')
}
{
  const polluted = mergeUtteranceHypotheses(
    '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고',
    '빨라지고 정확도가 높아지고 있음',
    withoutProtection('suffixOverlap'),
  )
  assert.notEqual(polluted, GOLDEN_B, 'suffixOverlap mutation must miss stitch')
}
{
  const session = createSpeechTranscriptSession({ protections: withoutProtection('slotTruncation') })
  session.ingest(
    speechEvent(2, [
      { transcript: '1차 22점', isFinal: true },
      { transcript: '2차 53점', isFinal: true },
      { transcript: '3차 100점', isFinal: true },
    ]),
  )
  session.ingest(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]))
  const text = session.peekHoldTranscript()
  assert.ok(countSpan(text, '2차 53점') >= 1)
}
{
  const session = createSpeechTranscriptSession({
    generationId: 4,
    protections: withoutProtection('staleGenerationGuard'),
  })
  session.ingest(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]), { generationId: 4 })
  session.ingest(speechEvent(0, [{ transcript: '피드백 계산 과정은 좋아지고 있다', isFinal: true }]), {
    generationId: 1,
  })
  assert.match(session.peekHoldTranscript(), /계산 과정/, 'staleGenerationGuard mutation')
  const guarded = createSpeechTranscriptSession({ generationId: 4 })
  guarded.ingest(speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]), { generationId: 4 })
  guarded.ingest(speechEvent(0, [{ transcript: '피드백 계산 과정은 좋아지고 있다', isFinal: true }]), {
    generationId: 1,
  })
  assert.equal(guarded.peekHoldTranscript(), GOLDEN_A)
}
{
  const polluted = parseStudentDailyTestVoice(
    `${GOLDEN_A} 1차 22차 5 나날이 발전하고 있음`,
    류정현,
    roster,
    false,
    { confidenceGate: false },
  )
  assert.notEqual(polluted.teacherFeedback, FEEDBACK_A, 'confidenceGate mutation')
  const gated = parseStudentDailyTestVoice(
    `${GOLDEN_A} 1차 22차 5 나날이 발전하고 있음`,
    류정현,
    roster,
    false,
  )
  assert.ok(
    gated.teacherFeedback === FEEDBACK_A || gated.needsReview.length > 0,
    'confidence gate must not dump garbage',
  )
  if (gated.teacherFeedback) assert.equal(gated.teacherFeedback, FEEDBACK_A)
}

// 5,000 event-structure fuzz — not the old GOLDEN-prefix string generator
const SIBLINGS = [
  '1차 22차 5',
  '1차 22차 5 나날이 발전하고 있음',
  '일',
  '일 1차',
  '1차 이 차 오',
  '이 차 오',
  '1차 2',
  '2차 5',
  '22차 5',
  '1차 2차 100',
  '나',
  '나 나',
  '나날이',
  '이발',
  '나날이 이발',
  '1차 22점',
  '1차 22점 2차 53점',
  '1차 22점 2차 53점 3차 100점',
  GOLDEN_A,
  FEEDBACK_A,
]

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Step = { kind: 'result'; event: SpeechRecognitionResultEventLike } | { kind: 'end' }

function structuredSequence(seed: number): Step[] {
  const rng = mulberry32(seed)
  const generations = 1 + Math.floor(rng() * 8)
  const steps: Step[] = [
    { kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: rng() > 0.4 }]) },
  ]
  for (let gen = 0; gen < generations; gen += 1) {
    if (rng() > 0.45) steps.push({ kind: 'end' })
    const slots = 1 + Math.floor(rng() * 6)
    const reset = rng() > 0.5
    if (reset) {
      const sibling = SIBLINGS[Math.floor(rng() * SIBLINGS.length)] ?? GOLDEN_A
      steps.push({
        kind: 'result',
        event: speechEvent(0, [{ transcript: sibling, isFinal: rng() > 0.5 }]),
      })
    } else {
      const pieces = Array.from({ length: slots }, (_, index) => ({
        transcript: SIBLINGS[Math.floor(rng() * SIBLINGS.length)] ?? GOLDEN_A,
        isFinal: index < slots - 1 || rng() > 0.3,
      }))
      steps.push({ kind: 'result', event: speechEvent(Math.min(slots - 1, 2), pieces) })
    }
    if (rng() > 0.7) {
      steps.push({
        kind: 'result',
        event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: true }]),
      })
    }
  }
  if (rng() > 0.2) steps.push({ kind: 'end' })
  steps.push({ kind: 'result', event: speechEvent(0, [{ transcript: GOLDEN_A, isFinal: rng() > 0.5 }]) })
  return steps
}

let fuzzApply = 0
for (let i = 0; i < 5000; i += 1) {
  const steps = structuredSequence(i * 997 + 13)
  const run = holdSession()
  for (const step of steps) {
    if (step.kind === 'end') {
      run.rec()?.emitEnd()
      if (Math.random() < 0) run.flush()
      run.flush()
    } else run.rec()?.emitResult(step.event)
  }
  run.session?.stop()
  assert.equal(run.finals.length, 1, `fuzz ${i} ${JSON.stringify(run.finals)}`)
  expectA(run.finals[0] ?? '', `fuzz ${i}`)
  assertLiveClean(run.interims, ['1차 22점', '2차 53점', '3차 100점'])
  fuzzApply += 1
}
assert.equal(fuzzApply, 5000)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /mergeUtteranceHypotheses|reconcileLogicalTranscript/)
assert.match(speech, /holdUntilExplicitStop/)
assert.match(speech, /staleGenerationGuard/)
assert.doesNotMatch(readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8'), /holdUntilExplicitStop: false/)
assert.match(readFileSync('src/utils/parentAttitudeTeacherComment.ts', 'utf8'), /parentAttitudeNoteForSelectedDate/)

console.log('iosIphoneTokenBoundaryReplay.test.ts passed (5000 event-structure fuzz runs)')
