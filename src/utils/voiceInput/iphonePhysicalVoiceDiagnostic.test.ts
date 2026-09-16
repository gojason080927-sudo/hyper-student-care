/**
 * Physical-iPhone diagnostic counters + dry-run path.
 * Does not claim a WebKit heuristic fix.
 * 실행: npx tsx src/utils/voiceInput/iphonePhysicalVoiceDiagnostic.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import {
  attachHypothesesToRawEvent,
  computedDailyTestAppliedCount,
  emptyPhysicalVoicePathCounters,
  finalizePhysicalDailyTestVoicePath,
  formatIphonePhysicalVoiceDiagnosticText,
  previewIphonePhysicalVoiceDiagnosticReport,
  UI_APPLIED_COUNT_MEANING,
  UI_APPLIED_COUNT_SOURCE,
  type IphonePhysicalOnResultLog,
  type PhysicalVoiceSessionCapture,
} from './iphonePhysicalVoiceDiagnostic.ts'
import { createSpeechForensicRecorder } from './speechForensic.ts'
import {
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import { routeVoiceTranscript } from './voiceSaveCommand.ts'

const GOLDEN_B = '1차 30점 2차 50점 3차 100점 나날이 속도가 빨라지고 정확도가 높아지고 있음'
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
}

function seventyFiveHypotheses(): string[] {
  const texts: string[] = []
  for (let i = 1; i <= 75; i += 1) {
    const n = Math.max(1, Math.floor((GOLDEN_B.length * i) / 75))
    texts.push(GOLDEN_B.slice(0, n))
  }
  texts[texts.length - 1] = GOLDEN_B
  return texts
}

function runHeldCapture(options: { dryRunFinalize?: boolean } = {}) {
  let rec: FakeSpeechRecognition | null = null
  const FakeCtor = class extends FakeSpeechRecognition {
    constructor() {
      super()
      rec = this
    }
  }
  const counters = emptyPhysicalVoicePathCounters()
  const rawEvents: IphonePhysicalOnResultLog[] = []
  const forensic = createSpeechForensicRecorder()
  let live = ''
  let held: PhysicalVoiceSessionCapture['heldTrace'] = null
  const finals: string[] = []
  let appliedThisSession = false
  let capture: PhysicalVoiceSessionCapture | null = null

  const session = startKoreanSpeechRecognition(
    {
      holdUntilExplicitStop: true,
      forensic,
      onRawRecognitionEvent: (raw) => {
        counters.recognitionEventCount += 1
        rawEvents.push(attachHypothesesToRawEvent(raw, held, live))
      },
      onInterim: (text) => {
        counters.interimCallbackCount += 1
        live = text
        const last = rawEvents[rawEvents.length - 1]
        if (last) last.liveTranscriptShown = text
      },
      onHeldTrace: (trace) => {
        held = trace
        const last = rawEvents[rawEvents.length - 1]
        if (!last) return
        last.currentInterimHypothesis = trace.interim ?? live
        last.currentFinalHypothesis = trace.committed ?? ''
        last.stableTranscript = trace.accumulated ?? ''
        last.mutableTranscript = trace.committed ?? ''
      },
      onFinal: (text) => {
        counters.finalCallbackCount += 1
        if (appliedThisSession) return
        appliedThisSession = true
        counters.routeCallCount += 1
        const routed = routeVoiceTranscript(text)
        capture = {
          rawTranscript: text,
          routed,
          heldTrace: held,
          forensicEvents: forensic.snapshot(),
          rawRecognitionEvents: rawEvents.map((event) => ({
            ...event,
            results: event.results.map((slot) => ({ ...slot })),
          })),
          liveTranscriptShown: live,
          counters: { ...counters },
          endReason: '사용자 종료',
          dryRun: options.dryRunFinalize !== false,
        }
        finals.push(text)
      },
      onError: () => undefined,
      onEnd: () => undefined,
    },
    {
      getCtor: () => FakeCtor,
      schedule: (fn) => {
        fn()
        return 0
      },
      cancelSchedule: () => undefined,
    },
  )

  return {
    rec: () => rec,
    session,
    counters,
    finals,
    getCapture: () => capture,
  }
}

assert.equal(
  formatVoiceSummary({ appliedCount: 75, excludedAbsentCount: 0, needsReviewCount: 0 }),
  '음성 입력 완료 · 75건 반영',
)
assert.match(UI_APPLIED_COUNT_SOURCE, /formatVoiceSummary/)
assert.match(UI_APPLIED_COUNT_MEANING, /attempts.length/)

const goldenParsed = parseStudentDailyTestVoice(GOLDEN_B, 류정현, roster, false)
assert.equal(goldenParsed.attempts.length, 3)
assert.equal(goldenParsed.teacherFeedback, '나날이 속도가 빨라지고 정확도가 높아지고 있음')
assert.equal(computedDailyTestAppliedCount(goldenParsed), 4)
assert.notEqual(computedDailyTestAppliedCount(goldenParsed), 75)

const dryRun = runHeldCapture({ dryRunFinalize: true })
const dryRec = dryRun.rec()
assert.ok(dryRec)
const hypotheses = seventyFiveHypotheses()
assert.equal(hypotheses.length, 75)
for (let i = 0; i < hypotheses.length; i += 1) {
  dryRec.emitResult(
    speechEvent(0, [{ transcript: hypotheses[i]!, isFinal: i === hypotheses.length - 1 }]),
  )
}
assert.equal(dryRun.finals.length, 0)
dryRun.session?.stop()
assert.equal(dryRun.counters.recognitionEventCount, 75)
assert.equal(dryRun.counters.interimCallbackCount, 75)
assert.equal(dryRun.counters.finalCallbackCount, 1)
assert.equal(dryRun.finals.length, 1)
const dryCapture = dryRun.getCapture()
assert.ok(dryCapture)
assert.equal(dryCapture.rawRecognitionEvents.length, 75)
assert.equal(dryCapture.rawRecognitionEvents[0]?.results[0]?.isFinal, false)
assert.equal(dryCapture.counters.routeCallCount, 1)

const dryFinalized = finalizePhysicalDailyTestVoicePath({
  capture: dryCapture,
  drafts: { ryujeonghyeon: emptyDraft() },
  cardStudent: 류정현,
  students: roster,
  attendance: [],
  date: '2026-09-16',
  absent: false,
})
assert.equal(dryFinalized.report.counters.recognitionEventCount, 75)
assert.equal(dryFinalized.report.counters.interimCallbackCount, 75)
assert.equal(dryFinalized.report.counters.finalCallbackCount, 1)
assert.equal(dryFinalized.report.counters.routeCallCount, 1)
assert.equal(dryFinalized.report.counters.parserCallCount, 1)
assert.equal(dryFinalized.report.counters.draftApplyCount, 0)
assert.equal(dryFinalized.report.counters.reactStatePatchCount, 0)
assert.equal(dryFinalized.drafts.ryujeonghyeon?.rounds[0]?.score, '')
assert.equal(dryFinalized.drafts.ryujeonghyeon?.learningDiagnosis.teacherFeedback, '')
assert.match(dryFinalized.report.copyText, /recognitionEventCount=75/)
assert.match(dryFinalized.report.copyText, /routeCallCount=1/)
assert.match(dryFinalized.report.copyText, /parserCallCount=1/)
assert.match(dryFinalized.report.copyText, /draftApplyCount=0/)
assert.match(dryFinalized.report.copyText, /dryRun=YES/)
assert.match(dryFinalized.report.uiStatusWouldShow, /초안 미반영/)
assert.equal(dryFinalized.report.parsedAttempts, '1차=30, 2차=50, 3차=100')

const applyRun = runHeldCapture({ dryRunFinalize: false })
const applyRec = applyRun.rec()
assert.ok(applyRec)
for (const text of hypotheses) {
  applyRec.emitResult(speechEvent(0, [{ transcript: text, isFinal: false }]))
}
applyRun.session?.stop()
const applyCapture = applyRun.getCapture()
assert.ok(applyCapture)
applyCapture.dryRun = false
const applied = finalizePhysicalDailyTestVoicePath({
  capture: applyCapture,
  drafts: { ryujeonghyeon: emptyDraft() },
  cardStudent: 류정현,
  students: roster,
  attendance: [],
  date: '2026-09-16',
  absent: false,
})
assert.equal(applied.report.counters.recognitionEventCount, 75)
assert.equal(applied.report.counters.finalCallbackCount, 1)
assert.equal(applied.report.counters.routeCallCount, 1)
assert.equal(applied.report.counters.parserCallCount, 1)
assert.equal(applied.report.counters.draftApplyCount, 1)
assert.equal(applied.report.counters.reactStatePatchCount, 1)
assert.equal(applied.drafts.ryujeonghyeon?.rounds[0]?.score, '30')
assert.equal(applied.drafts.ryujeonghyeon?.rounds[1]?.score, '50')
assert.equal(applied.drafts.ryujeonghyeon?.rounds[2]?.score, '100')

const copy = formatIphonePhysicalVoiceDiagnosticText({
  sessionId: 9,
  recognitionGeneration: 2,
  eventSequenceNumber: 75,
  dryRun: true,
  counters: dryFinalized.report.counters,
  liveTranscriptShown: GOLDEN_B,
  stableTranscript: GOLDEN_B,
  mutableTranscript: GOLDEN_B,
  explicitStopTranscript: GOLDEN_B,
  parserInput: GOLDEN_B,
  parsedAttempts: '1차=30, 2차=50, 3차=100',
  parsedErrorCounts: 'conceptLackCount=(unset)',
  parsedFeedback: '나날이 속도가 빨라지고 정확도가 높아지고 있음',
  needsReview: '(none)',
  computedAppliedCountIfApplied: 4,
  uiStatusWouldShow: '음성 진단 완료 · 초안 미반영',
  rawEvents: dryCapture.rawRecognitionEvents,
  forensicEvents: dryCapture.forensicEvents,
})
assert.match(copy, /ALL ONRESULT EVENTS/)
assert.match(copy, /resultIndex=/)
assert.match(copy, /results.length=/)
assert.match(copy, /isFinal=/)
assert.match(copy, /PARSER INPUT/)
assert.match(copy, /PARSED FEEDBACK/)
assert.doesNotMatch(copy, /service.role|SERVICE_ROLE|JWT/i)

const preview = previewIphonePhysicalVoiceDiagnosticReport()
assert.match(preview.copyText, /recognitionEventCount=75/)
assert.match(preview.copyText, /draftApplyCount=0/)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /onRawRecognitionEvent/)
assert.match(speech, /emitRawRecognitionEvent\(event\)/)
assert.match(speech, /peekHoldTranscript\(\): string \{\n      return mutableHypothesis/)
assert.match(speech, /interimsByIndex\[i\] = text/)
assert.match(speech, /mergeUtteranceHypotheses/)
assert.doesNotMatch(speech, /holdUntilExplicitStop: false/)

const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /appliedThisSessionRef/)
assert.match(voiceUi, /physicalDiagnostic/)
assert.match(voiceUi, /dryRunRef/)
assert.match(voiceUi, /holdUntilExplicitStop: true/)
assert.match(voiceUi, /onRawRecognitionEvent/)
assert.doesNotMatch(voiceUi, /holdUntilExplicitStop: explicitStop/)

const panel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(panel, /IphonePhysicalVoiceDiagnosticPanel/)
assert.match(panel, /IphonePhysicalVoiceDiagnosticToggle/)
assert.match(panel, /physicalDiagnostic=\{physicalDiagnosticEnabled\}/)
assert.match(panel, /dryRun=\{physicalDiagnosticEnabled\}/)
assert.match(panel, /finalizePhysicalDailyTestVoicePath/)
assert.match(panel, /applyStudentDailyTestDraft/)
assert.match(panel, /import.meta.env.DEV/)
assert.doesNotMatch(panel, /from '@supabase/)

const diagnosticUi = readFileSync(
  'src/components/todayReport/IphonePhysicalVoiceDiagnosticPanel.tsx',
  'utf8',
)
assert.match(diagnosticUi, /진단 내용 복사/)
assert.match(diagnosticUi, /음성 진단/)
assert.match(diagnosticUi, /data-iphone-voice-diagnostic-copy/)
assert.match(diagnosticUi, /data-iphone-voice-diagnostic-text/)
assert.match(diagnosticUi, /break-all/)
assert.doesNotMatch(diagnosticUi, /fetch\(|supabase|navigator\.mediaDevices/i)

const applySrc = readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8')
assert.match(applySrc, /parsed.attempts.length/)
assert.doesNotMatch(applySrc, /saveDailyTestRecord/)

const parser = readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8')
assert.match(parser, /teacherFeedback = confidenceGate/)
assert.match(parser, /uniqueProseFeedback\(residual/)

const previewPage = readFileSync('src/pages/dev/TeacherTodayReportLayoutPreviewPage.tsx', 'utf8')
assert.match(previewPage, /IphonePhysicalVoiceDiagnosticPanel/)
assert.match(previewPage, /physicalDiagnostic/)

console.log('iphonePhysicalVoiceDiagnostic.test.ts passed')
