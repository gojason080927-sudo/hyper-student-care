/**
 * Daily-test voice accumulated-transcript diagnostic (after PR #26 held speech)
 * 실행: npx tsx src/utils/voiceInput/dailyTestVoiceDiagnostic.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import {
  buildDailyTestVoiceDiagnostic,
  buildDailyTestVoiceDiagnosticFromRaw,
  formatHeldSpeechEndReason,
  formatParsedFeedback,
  parserInputFromRouted,
  setStudentVoiceDiagnostic,
} from './dailyTestVoiceDiagnostic.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import { routeVoiceTranscript } from './voiceSaveCommand.ts'
import {
  compactFinalHypotheses,
  createHeldSpeechState,
  createSpeechTranscriptSession,
  reduceHeldSpeech,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { overlayLoadedDrafts } from '../todayReportDraftMerge.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'

const 강나경 = { id: 'nagyeong', name: '강나경' }
const 김도영 = { id: 'doyoung', name: '김도영' }
const roster = [강나경, 김도영]
const DATE = '2026-09-15'

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
  alternatives: Array<{ transcript: string; isFinal?: boolean }>,
): SpeechRecognitionResultEventLike {
  return {
    resultIndex,
    results: {
      length: resultIndex + 1,
      item: (index: number) => ({
        isFinal: Boolean(alternatives[0]?.isFinal),
        length: 1,
        item: () => alternatives[0] ?? { transcript: '', isFinal: false },
        0: alternatives[0] ?? { transcript: '', isFinal: false },
      }),
      0: {
        isFinal: Boolean(alternatives[0]?.isFinal),
        length: 1,
        item: () => alternatives[0] ?? { transcript: '', isFinal: false },
        0: alternatives[0] ?? { transcript: '', isFinal: false },
      },
    },
  }
}

function heldApply(events: Parameters<typeof reduceHeldSpeech>[1][]) {
  let state = createHeldSpeechState()
  let apply: string | null = null
  for (const event of events) {
    const next = reduceHeldSpeech(state, event)
    state = next.state
    if (next.apply != null) apply = next.apply
  }
  return { state, apply }
}

const failText = '점수만있고차시없는문장'
const parsedFail = parseStudentDailyTestVoice(failText, 강나경, roster, false)
assert.equal(parsedFail.apply, false)
assert.equal(parsedFail.teacherFeedback, undefined)

const appliedFail = applyStudentDailyTestDraft(
  { nagyeong: emptyDraft(), doyoung: emptyDraft() },
  failText,
  강나경,
  roster,
  [],
  DATE,
)
assert.equal(appliedFail.summary.appliedCount, 0)
assert.ok(appliedFail.summary.needsReviewCount >= 1)

// 1 — held accumulated transcript is diagnostic raw (not last fragment)
const held = heldApply([
  { type: 'committed', text: '1차 80점 불합격 2차 95점 합격' },
  { type: 'browser-end' },
  { type: 'committed', text: '피드백 계산 실수가 많이 줄었고' },
  { type: 'browser-end' },
  { type: 'committed', text: '응용 문제를 더 연습할 것' },
  { type: 'user-stop' },
  { type: 'browser-end' },
])
assert.equal(
  held.apply,
  '1차 80점 불합격 2차 95점 합격 피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
)
assert.notEqual(held.apply, '응용 문제를 더 연습할 것')
const heldParsed = parseStudentDailyTestVoice(held.apply ?? '', 강나경, roster, false)
const heldDiag = buildDailyTestVoiceDiagnosticFromRaw(held.apply ?? '', appliedFail.summary, {
  parseResult: heldParsed,
  endReason: formatHeldSpeechEndReason({
    source: 'speech',
    userStopped: held.state.userStopped,
    restartCount: held.state.restartCount,
  }),
})
assert.equal(heldDiag.accumulatedRaw, held.apply)
assert.match(heldDiag.accumulatedRaw, /1차 80점/)
assert.match(heldDiag.accumulatedRaw, /피드백 계산 실수가/)
assert.doesNotMatch(heldDiag.accumulatedRaw, /^응용 문제를 더 연습할 것$/)

// 2 — parser input is routeVoiceTranscript form-fill transcript
const routedHeld = routeVoiceTranscript(held.apply ?? '')
assert.equal(routedHeld.kind, 'form-fill')
assert.equal(heldDiag.parserInput, parserInputFromRouted(routedHeld))
assert.equal(heldDiag.parserInput, held.apply)

// 3 — parsed feedback shown
assert.equal(heldDiag.parsedFeedback, '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
assert.equal(formatParsedFeedback(heldParsed), heldDiag.parsedFeedback)

// 4 — parsed feedback undefined → 없음
const failDiag = buildDailyTestVoiceDiagnostic({
  accumulatedRaw: failText,
  routed: routeVoiceTranscript(failText),
  summary: appliedFail.summary,
  parseResult: parsedFail,
  endReason: formatHeldSpeechEndReason({ source: 'speech', userStopped: true }),
})
assert.equal(failDiag.parsedFeedback, '없음')
assert.equal(formatParsedFeedback(parsedFail), '없음')

// 5 — apply=false still keeps accumulated raw
assert.equal(failDiag.accumulatedRaw, failText)
assert.equal(failDiag.parserInput, failText)
assert.equal(failDiag.feedbackApplyCount, 0)
assert.match(failDiag.applyResultText, /피드백 적용: 0/)
assert.match(failDiag.applyResultText, /확인 필요: 1/)
assert.ok(failDiag.needsReviewCount >= 1)

// 6 — user stop status
assert.equal(
  formatHeldSpeechEndReason({ source: 'speech', userStopped: true, restartCount: 0 }),
  '사용자 종료',
)
const userStop = heldApply([
  { type: 'committed', text: '피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것' },
  { type: 'user-stop' },
  { type: 'browser-end' },
])
assert.equal(userStop.state.userStopped, true)
assert.equal(userStop.state.restartCount, 0)
assert.equal(
  formatHeldSpeechEndReason({
    source: 'speech',
    userStopped: userStop.state.userStopped,
    restartCount: userStop.state.restartCount,
  }),
  '사용자 종료',
)

// 7 — restart then accumulated raw kept + end reason
assert.equal(held.state.restartCount > 0, true)
assert.equal(held.state.userStopped, true)
assert.equal(
  formatHeldSpeechEndReason({
    source: 'speech',
    userStopped: held.state.userStopped,
    restartCount: held.state.restartCount,
  }),
  '브라우저 자동 종료 → 재시작 → 사용자 종료',
)
assert.equal(heldDiag.endReason, '브라우저 자동 종료 → 재시작 → 사용자 종료')

// 8 — new session diagnostic replaces previous
const nextDiag = buildDailyTestVoiceDiagnosticFromRaw('1차 80점', appliedFail.summary)
let stored = setStudentVoiceDiagnostic({}, 'nagyeong', failDiag)
stored = setStudentVoiceDiagnostic(stored, 'nagyeong', nextDiag)
assert.equal(stored.nagyeong?.accumulatedRaw, '1차 80점')
assert.notEqual(stored.nagyeong?.accumulatedRaw, failText)

// 9 — score voice regression 1차 80 FAIL / 2차 95 PASS
{
  const text = '1차 80점 불합격, 2차 95점 합격'
  const parsed = parseStudentDailyTestVoice(text, 강나경, roster, false)
  assert.equal(parsed.apply, true)
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '95'],
    ],
  )
  const applied = applyStudentDailyTestDraft(
    { nagyeong: emptyDraft() },
    text,
    강나경,
    roster,
    [],
    DATE,
  )
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '80')
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '95')
  assert.equal(visualStatusFromScoreDraft('80'), '불합격')
  assert.equal(visualStatusFromScoreDraft('95'), '합격')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 2)
  const diag = buildDailyTestVoiceDiagnosticFromRaw(text, applied.summary, { parseResult: parsed })
  assert.equal(diag.attemptApplyCount, 2)
  assert.equal(diag.feedbackApplyCount, 0)
  assert.match(diag.applyResultText, /차시 적용: 2/)
}

// 10 — feedback voice regression
{
  const text = '피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것'
  const parsed = parseStudentDailyTestVoice(text, 강나경, roster, false)
  assert.equal(parsed.apply, true)
  assert.equal(parsed.teacherFeedback, '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
  const applied = applyStudentDailyTestDraft(
    { nagyeong: emptyDraft() },
    text,
    강나경,
    roster,
    [],
    DATE,
  )
  assert.equal(
    applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  const diag = buildDailyTestVoiceDiagnosticFromRaw(text, applied.summary, { parseResult: parsed })
  assert.equal(diag.parsedFeedback, '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
  assert.equal(diag.feedbackApplyCount, 1)
  assert.match(diag.applyResultText, /피드백 적용: 1/)
  assert.match(diag.applyResultText, /확인 필요: 0/)
}

// 11 — PR #19 prefix merge, consumeFinal once
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 8', isFinal: true }]))
  session.ingest(speechEvent(0, [{ transcript: '1차 80점 불합격, 2차 100점 합격', isFinal: true }]))
  assert.equal(
    compactFinalHypotheses(['1차 8', '1차 80점 불합격, 2차 100점 합격']),
    '1차 80점 불합격, 2차 100점 합격',
  )
  const delivered = session.consumeFinal()
  assert.equal(delivered.delivered, true)
  const again = session.consumeFinal()
  assert.equal(again.delivered, false)
  const diagOnce = buildDailyTestVoiceDiagnosticFromRaw(delivered.text, appliedFail.summary)
  assert.equal(diagOnce.accumulatedRaw, delivered.text)
  assert.doesNotMatch(diagOnce.accumulatedRaw, /1차 8 1차 80/)
}

// 12 — PR #26 held speech regression: browser-end restarts, apply once on user-stop
{
  const firstEnd = heldApply([
    { type: 'committed', text: '1차 80점' },
    { type: 'browser-end' },
  ])
  assert.equal(firstEnd.apply, null)
  assert.equal(firstEnd.state.accumulated, '1차 80점')
  const stopped = heldApply([
    { type: 'committed', text: '1차 80점' },
    { type: 'browser-end' },
    { type: 'committed', text: '불합격, 2차 95점 합격' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(stopped.apply, '1차 80점 불합격, 2차 95점 합격')
  const after = reduceHeldSpeech(stopped.state, { type: 'browser-end' })
  assert.equal(after.apply, null)
}

// 13 — save command is not form-fill
{
  const saveDiag = buildDailyTestVoiceDiagnosticFromRaw('일괄 저장', null)
  assert.equal(saveDiag.kind, 'save-command')
  assert.equal(saveDiag.parserInput, '')
  assert.equal(saveDiag.parsedFeedback, '없음')
  assert.equal(saveDiag.appliedCount, 0)
  assert.equal(routeVoiceTranscript('일괄 저장').kind, 'save-command')
  const afterSave = applyStudentDailyTestDraft(
    { nagyeong: emptyDraft() },
    '일괄 저장',
    강나경,
    roster,
    [],
    DATE,
  )
  assert.equal(afterSave.drafts.nagyeong?.rounds[0]?.score, '')
}

// 14 — absence: diagnostic not mounted on excluded cards
{
  const panel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
  assert.match(panel, /!excluded && voiceDiagnostics/)
  assert.match(panel, /import.meta.env.DEV/)
  assert.match(panel, /hideStatus/)
  assert.match(panel, /DailyTestVoiceDiagnostic/)
  assert.match(panel, /onDiagnostic/)
  assert.match(panel, /explicitStop/)
  assert.match(panel, /saveDailyTestRecordAsync/)
  assert.match(panel, /parseStudentDailyTestVoice/)
  const attendancePanel = readFileSync(
    'src/components/todayReport/ClassAttendanceBulkPanel.tsx',
    'utf8',
  )
  assert.doesNotMatch(attendancePanel, /DailyTestVoiceDiagnostic/)
  assert.doesNotMatch(attendancePanel, /hideStatus/)
  assert.doesNotMatch(
    readFileSync('src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx', 'utf8'),
    /DailyTestVoiceDiagnostic/,
  )
  assert.doesNotMatch(
    readFileSync('src/components/todayReport/ClassMaterialPrepBulkPanel.tsx', 'utf8'),
    /DailyTestVoiceDiagnostic/,
  )
  assert.doesNotMatch(
    readFileSync('src/components/todayReport/ClassAttitudeBulkPanel.tsx', 'utf8'),
    /DailyTestVoiceDiagnostic/,
  )
}

// 15 — resave identity: overlay keeps dirty voice edit
{
  const prev = {
    nagyeong: {
      rounds: [
        { round: 1 as const, score: '80', passed: false },
        { round: 2 as const, score: '95', passed: true },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: {
        ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
        teacherFeedback: '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
      },
    },
  }
  const loaded = {
    nagyeong: {
      rounds: [
        { round: 1 as const, score: '70', passed: false },
        { round: 2 as const, score: '90', passed: true },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    },
  }
  const merged = overlayLoadedDrafts(prev, loaded, new Set(['nagyeong']), (local, server) => ({
    ...local,
    recordId: (server as { recordId?: string } | undefined)?.recordId,
  }))
  assert.equal(merged.nagyeong.rounds[0]?.score, '80')
  assert.equal(merged.nagyeong.rounds[1]?.score, '95')
  assert.equal(
    merged.nagyeong.learningDiagnosis.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
}

// isolation
{
  const isolated = setStudentVoiceDiagnostic(
    setStudentVoiceDiagnostic({}, 'nagyeong', failDiag),
    'doyoung',
    nextDiag,
  )
  assert.equal(isolated.nagyeong?.accumulatedRaw, failText)
  assert.equal(isolated.doyoung?.accumulatedRaw, '1차 80점')
}

const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /submitFallback/)
assert.match(voiceUi, /applyTranscript\(fallbackText/)
assert.match(voiceUi, /onDiagnosticRef/)
assert.match(voiceUi, /onHeldTrace/)
assert.match(voiceUi, /hideStatus/)
assert.match(voiceUi, /holdUntilExplicitStop/)

const diagnosticUi = readFileSync(
  'src/components/todayReport/DailyTestVoiceDiagnostic.tsx',
  'utf8',
)
assert.match(diagnosticUi, /data-daily-test-voice-diagnostic/)
assert.match(diagnosticUi, /data-voice-accumulated-raw/)
assert.match(diagnosticUi, /data-voice-parser-input/)
assert.match(diagnosticUi, /data-voice-parsed-feedback/)
assert.match(diagnosticUi, /data-voice-apply-result/)
assert.match(diagnosticUi, /data-voice-end-reason/)
assert.match(diagnosticUi, /data-voice-lifecycle/)
assert.match(diagnosticUi, /누적 원본/)
assert.match(diagnosticUi, /파서 입력/)
assert.match(diagnosticUi, /파싱된 피드백/)
assert.match(diagnosticUi, /적용 결과/)
assert.match(diagnosticUi, /종료 방식/)
assert.match(diagnosticUi, /w-full min-w-0 max-w-full/)
assert.match(diagnosticUi, /break-all/)
assert.doesNotMatch(diagnosticUi, /whitespace-nowrap/)

const panel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(panel, /StudentFollowOnRowHeader/)
assert.match(panel, /DailyTestVoiceDiagnostic snapshot/)
assert.match(panel, /IphonePhysicalVoiceDiagnosticPanel/)
assert.match(panel, /IphonePhysicalVoiceDiagnosticToggle/)
assert.doesNotMatch(panel, /JWT|access_key|service.role|SERVICE_ROLE/i)

assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/dailyTestVoiceDiagnostic.ts', 'utf8'),
  /from '@supabase/,
)

const parser = readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8')
assert.match(parser, /피\\s\*드\\s\*백/)
assert.match(parser, /structuredNorm = normalizeStudentDailyTestAttemptSpeech\(structured\)/)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /holdUntilExplicitStop/)
assert.match(speech, /reconcileSameIndexHypothesis/)
assert.match(speech, /listenCycleId/)
assert.match(speech, /recognitionGeneration/)
assert.match(speech, /accumulateHeldFragments/)
assert.match(speech, /HELD_SPEECH_MAX_RESTARTS/)

console.log('dailyTestVoiceDiagnostic.test.ts passed')
