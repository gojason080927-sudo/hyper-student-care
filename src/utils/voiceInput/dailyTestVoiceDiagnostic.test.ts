/**
 * Daily-test voice real-transcript diagnostic (Samsung)
 * 실행: npx tsx src/utils/voiceInput/dailyTestVoiceDiagnostic.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import {
  buildDailyTestVoiceDiagnostic,
  buildDailyTestVoiceDiagnosticFromRaw,
  parserInputFromRouted,
  setStudentVoiceDiagnostic,
} from './dailyTestVoiceDiagnostic.ts'
import { parseStudentDailyTestVoice } from './parseStudentDailyTestVoice.ts'
import { routeVoiceTranscript } from './voiceSaveCommand.ts'
import {
  compactFinalHypotheses,
  createSpeechTranscriptSession,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
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

const failText = '점수만있고차시없는문장'
const parsedFail = parseStudentDailyTestVoice(failText, 강나경, roster, false)
assert.equal(parsedFail.apply, false)

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

// A/B/C — raw + parser input kept when apply=false
const routedFail = routeVoiceTranscript(failText)
const diagFail = buildDailyTestVoiceDiagnostic({
  rawTranscript: failText,
  routed: routedFail,
  summary: appliedFail.summary,
})
assert.equal(diagFail.rawTranscript, failText)
assert.equal(diagFail.parserInput, parserInputFromRouted(routedFail))
assert.equal(diagFail.parserInput, failText)
assert.equal(diagFail.appliedCount, 0)
assert.ok(diagFail.needsReviewReason.includes('점수·오답분석·피드백'))
assert.match(diagFail.summaryText, /확인 필요/)

// D — new session replaces diagnostic
const nextDiag = buildDailyTestVoiceDiagnosticFromRaw('1차 80점', appliedFail.summary)
let stored = setStudentVoiceDiagnostic({}, 'nagyeong', diagFail)
stored = setStudentVoiceDiagnostic(stored, 'nagyeong', nextDiag)
assert.equal(stored.nagyeong?.rawTranscript, '1차 80점')
assert.notEqual(stored.nagyeong?.rawTranscript, failText)

// E — PR #19 growing prefix: consumeFinal once, no duplicate raw
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
assert.equal(diagOnce.rawTranscript, delivered.text)
assert.doesNotMatch(diagOnce.rawTranscript, /1차 8 1차 80/)

// F — save command is not form-fill diagnostic
const saveDiag = buildDailyTestVoiceDiagnosticFromRaw('일괄 저장', null)
assert.equal(saveDiag.kind, 'save-command')
assert.equal(saveDiag.parserInput, '')
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

// G — student isolation
const isolated = setStudentVoiceDiagnostic(
  setStudentVoiceDiagnostic({}, 'nagyeong', diagFail),
  'doyoung',
  nextDiag,
)
assert.equal(isolated.nagyeong?.rawTranscript, failText)
assert.equal(isolated.doyoung?.rawTranscript, '1차 80점')

// H — absence: panel does not mount diagnostic on excluded cards
const panel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(panel, /!excluded && voiceDiagnostics/)
assert.match(panel, /hideStatus/)
assert.match(panel, /DailyTestVoiceDiagnostic/)
assert.match(panel, /onDiagnostic/)
assert.match(panel, /saveDailyTestRecordAsync/)

const attendancePanel = readFileSync(
  'src/components/todayReport/ClassAttendanceBulkPanel.tsx',
  'utf8',
)
assert.doesNotMatch(attendancePanel, /DailyTestVoiceDiagnostic/)
assert.doesNotMatch(attendancePanel, /hideStatus/)

const homeworkPanel = readFileSync(
  'src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx',
  'utf8',
)
assert.doesNotMatch(homeworkPanel, /DailyTestVoiceDiagnostic/)

const materialPanel = readFileSync(
  'src/components/todayReport/ClassMaterialPrepBulkPanel.tsx',
  'utf8',
)
assert.doesNotMatch(materialPanel, /DailyTestVoiceDiagnostic/)

const attitudePanel = readFileSync(
  'src/components/todayReport/ClassAttitudeBulkPanel.tsx',
  'utf8',
)
assert.doesNotMatch(attitudePanel, /DailyTestVoiceDiagnostic/)

// I — typed fallback uses the same applyTranscript path
const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /submitFallback/)
assert.match(voiceUi, /applyTranscript\(fallbackText\)/)
assert.match(voiceUi, /onDiagnosticRef/)
assert.match(voiceUi, /hideStatus/)

const typed = buildDailyTestVoiceDiagnosticFromRaw(
  '1차 80점 불합격, 2차 100점 합격',
  applyStudentDailyTestDraft(
    { nagyeong: emptyDraft() },
    '1차 80점 불합격, 2차 100점 합격',
    강나경,
    roster,
    [],
    DATE,
  ).summary,
)
assert.equal(typed.rawTranscript, '1차 80점 불합격, 2차 100점 합격')
assert.equal(typed.parserInput, '1차 80점 불합격, 2차 100점 합격')

// J — confirmation + diagnostic are full-width siblings, not header extra
const diagnosticUi = readFileSync(
  'src/components/todayReport/DailyTestVoiceDiagnostic.tsx',
  'utf8',
)
assert.match(diagnosticUi, /data-daily-test-voice-diagnostic/)
assert.match(diagnosticUi, /data-voice-raw-transcript/)
assert.match(diagnosticUi, /data-voice-parser-input/)
assert.match(diagnosticUi, /data-voice-summary/)
assert.match(diagnosticUi, /w-full min-w-0 max-w-full/)
assert.match(diagnosticUi, /break-all/)
assert.doesNotMatch(diagnosticUi, /whitespace-nowrap/)
assert.match(panel, /StudentFollowOnRowHeader/)
assert.match(panel, /DailyTestVoiceDiagnostic snapshot/)

assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/dailyTestVoiceDiagnostic.ts', 'utf8'),
  /from '@supabase/,
)

console.log('dailyTestVoiceDiagnostic.test.ts passed')
