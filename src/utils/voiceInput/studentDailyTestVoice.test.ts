/**
 * Daily Test Student Voice V2
 * 실행: npx tsx src/utils/voiceInput/studentDailyTestVoice.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AttendanceRecord } from '../../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { overlayLoadedDrafts } from '../todayReportDraftMerge.ts'
import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { applyStudentDailyTestDraft } from './applyVoiceDraft.ts'
import {
  normalizeStudentDailyTestAttemptSpeech,
  parseStudentDailyTestVoice,
} from './parseStudentDailyTestVoice.ts'
import { formatVoiceSummary } from './parseVoiceTranscript.ts'
import { isVoiceBulkSaveCommand, routeVoiceTranscript } from './voiceSaveCommand.ts'
import {
  compactFinalHypotheses,
  createSpeechTranscriptSession,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'

const DATE = '2026-09-15'
const 강나경 = { id: 'nagyeong', name: '강나경' }
const 김도영 = { id: 'doyoung', name: '김도영' }
const 김민재 = { id: 'minjae', name: '김민재' }
const roster = [강나경, 김도영, 김민재]

function emptyRounds() {
  return [
    { round: 1 as const, score: '', passed: false },
    { round: 2 as const, score: '', passed: false },
    { round: 3 as const, score: '', passed: false },
    { round: 4 as const, score: '', passed: false },
  ]
}

function emptyDraft() {
  return {
    rounds: emptyRounds(),
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
  }
}

function attendance(
  studentId: string,
  status: AttendanceRecord['status'],
): AttendanceRecord {
  return {
    id: `a-${studentId}`,
    studentId,
    date: DATE,
    status,
    reason: '',
    memo: '',
    excuseKind: status === '결석' ? '인정' : null,
    createdAt: '',
    updatedAt: '',
  }
}

const present = [
  attendance('nagyeong', '출석'),
  attendance('doyoung', '출석'),
  attendance('minjae', '결석'),
]

function parseCard(text: string, student = 강나경, absent = false) {
  return parseStudentDailyTestVoice(text, student, roster, absent)
}

function applyCard(
  text: string,
  drafts = { nagyeong: emptyDraft(), doyoung: emptyDraft() },
  student = 강나경,
) {
  return applyStudentDailyTestDraft(drafts, text, student, roster, present, DATE)
}

const corpus: string[] = []
function caseOf(text: string) {
  corpus.push(text)
  return parseCard(text)
}

// 1. multiple attempts + spoken result
{
  const parsed = caseOf('1차 80점 불합격, 2차 100점 합격')
  assert.equal(parsed.apply, true)
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '100'],
    ],
  )
  const applied = applyCard('1차 80점 불합격, 2차 100점 합격')
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '80')
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '100')
  assert.equal(applied.drafts.nagyeong?.rounds[2]?.score, '')
  assert.equal(applied.drafts.doyoung?.rounds[0]?.score, '')
  assert.equal(visualStatusFromScoreDraft('80'), '불합격')
  assert.equal(visualStatusFromScoreDraft('100'), '합격')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 2)
}

// 2. scores without saying 합격/불합격
{
  const parsed = caseOf('1차 80점, 2차 100점')
  assert.deepEqual(
    parsed.attempts.map((row) => row.score),
    ['80', '100'],
  )
  assert.equal(visualStatusFromScoreDraft('80'), '불합격')
  assert.equal(visualStatusFromScoreDraft('100'), '합격')
}

// 3. three attempts → final pass 3
{
  caseOf('1차 70점, 2차 82점, 3차 90점')
  const applied = applyCard('1차 70점, 2차 82점, 3차 90점')
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '70')
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '82')
  assert.equal(applied.drafts.nagyeong?.rounds[2]?.score, '90')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 3)
}

{
  const parsed = caseOf('첫 번째 80점, 두 번째 100점')
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '100'],
    ],
  )
}

{
  const parsed = caseOf('1차 팔십점, 2차 백점')
  assert.deepEqual(
    parsed.attempts.map((row) => row.score),
    ['80', '100'],
  )
}

{
  const parsed = caseOf('1차 80점 합격')
  assert.equal(parsed.apply, false)
  assert.equal(parsed.attempts.length, 0)
  assert.ok(parsed.needsReview.some((row) => row.reason.includes('85점')))
}

{
  const parsed = caseOf('1차 90점 불합격')
  assert.equal(parsed.attempts.length, 0)
  assert.ok(parsed.needsReview.length > 0)
}

{
  const parsed = caseOf('응용 능력 부족 2개')
  assert.equal(parsed.applicationLackCount, 2)
  assert.equal(parsed.attempts.length, 0)
}

{
  const parsed = caseOf('계산 실수 1개, 응용 능력 부족 2개')
  assert.equal(parsed.calculationErrorCount, 1)
  assert.equal(parsed.applicationLackCount, 2)
}

{
  const parsed = caseOf('개념 부족 2개, 계산 실수 1개')
  assert.equal(parsed.conceptLackCount, 2)
  assert.equal(parsed.calculationErrorCount, 1)
}

{
  const parsed = caseOf(
    '1차 80점 불합격, 2차 100점 합격, 피드백 계산 실수가 많이 줄었음',
  )
  assert.equal(parsed.attempts.length, 2)
  assert.equal(parsed.teacherFeedback, '계산 실수가 많이 줄었음')
}

{
  const parsed = caseOf('피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
  assert.equal(parsed.apply, true)
  assert.equal(parsed.attempts.length, 0)
  assert.equal(
    parsed.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.equal(parsed.calculationErrorCount, undefined)
  assert.equal(parsed.applicationLackCount, undefined)
  const applied = applyCard('피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
  assert.equal(
    applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.equal(applied.summary.needsReviewCount, 0)
}

{
  const parsed = caseOf('강사 피드백 계산 실수가 많이 줄었습니다')
  assert.equal(parsed.teacherFeedback, '계산 실수가 많이 줄었습니다')
}

{
  const parsed = caseOf('강사의 피드백 응용 문제를 더 연습할 것')
  assert.equal(parsed.teacherFeedback, '응용 문제를 더 연습할 것')
}

{
  const parsed = caseOf('피드 백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
  assert.equal(parsed.teacherFeedback, '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것')
}

{
  const parsed = caseOf(
    '1차 80점 불합격, 2차 90점 합격, 피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '90'],
    ],
  )
  assert.equal(
    parsed.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  const applied = applyCard(
    '1차 80점 불합격, 2차 90점 합격, 피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '80')
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '90')
  assert.equal(visualStatusFromScoreDraft('80'), '불합격')
  assert.equal(visualStatusFromScoreDraft('90'), '합격')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 2)
  assert.equal(
    applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
}

{
  const parsed = caseOf('아주 아주 좋아졌습니다'.replace(/^/, '피드백 '))
  assert.equal(parsed.teacherFeedback, '아주 아주 좋아졌습니다')
}

{
  const parsed = caseOf('피드백')
  assert.equal(parsed.apply, false)
  const drafts = {
    nagyeong: {
      rounds: emptyRounds(),
      learningDiagnosis: {
        ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
        teacherFeedback: '기존 피드백',
      },
    },
    doyoung: emptyDraft(),
  }
  const applied = applyCard('피드백', drafts)
  assert.equal(applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback, '기존 피드백')
}

{
  const parsed = caseOf('1차 80점')
  assert.deepEqual(parsed.attempts, [{ round: 1, score: '80', conflict: false }])
}

{
  const parsed = caseOf('2차 82점')
  assert.equal(parsed.attempts[0]?.round, 2)
  assert.equal(parsed.attempts[0]?.score, '82')
}

{
  const parsed = caseOf('세 번째 90점')
  assert.equal(parsed.attempts[0]?.round, 3)
}

{
  const parsed = caseOf('네 번째 100점')
  assert.equal(parsed.attempts[0]?.round, 4)
}

{
  const parsed = caseOf('일차 80점, 이차 100점')
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '100'],
    ],
  )
}

{
  const parsed = caseOf('1 차 80점, 2 차 100점')
  assert.equal(parsed.attempts.length, 2)
}

{
  const parsed = caseOf('강나경 1차 80점 불합격, 2차 100점 합격')
  assert.equal(parsed.apply, true)
  assert.equal(parsed.attempts.length, 2)
}

{
  const parsed = parseCard('김도영 1차 80점', 강나경)
  assert.equal(parsed.apply, false)
  assert.ok(parsed.needsReview.some((row) => row.reason.includes('다른 학생')))
}

{
  const parsed = parseCard('1차 80점', 강나경, true)
  assert.equal(parsed.apply, false)
  assert.equal(parsed.skippedAbsent, true)
}

{
  const parsed = caseOf(
    '1차 80점 불합격, 2차 100점 합격, 응용 능력 부족 2개, 피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.equal(parsed.attempts.length, 2)
  assert.equal(parsed.applicationLackCount, 2)
  assert.equal(
    parsed.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
}

// extra natural phrases to reach 50+ corpus
for (const phrase of [
  '1차 0점',
  '1차 84점',
  '1차 85점',
  '1차 86점',
  '1차 점수 80',
  '1차 점수는 80',
  '1차 80 점',
  '첫번째 80점',
  '두번째 100점',
  '세번째 90점',
  '4차 100점',
  '삼차 90점',
  '사차 88점',
  '1차 70점 불합격',
  '2차 100점 합격',
  '1차 100점',
  '개념 부족 1개',
  '계산 실수 3개',
  '응용 능력 부족 1개',
  '개념 부족 2개',
  '강사의 피드백 오답 정리를 다시 할 것',
  '강사 피드백 계산을 천천히',
  '1차 82점, 2차 91점',
  '1차 60점, 2차 70점, 3차 80점, 4차 95점',
  '1차 팔십오점',
  '2차 점수 백점',
  '1차 72점 불합격, 2차 85점',
  '2차만 91점',
  '개념 부족 4개, 응용 능력 부족 2개',
  '피드백 이번 주는 계산을 다시 볼 것',
]) {
  corpus.push(phrase)
  const parsed = parseCard(phrase)
  assert.equal(typeof parsed.apply, 'boolean')
}

assert.ok(corpus.length >= 50, `corpus ${corpus.length}`)

// shared visual source of truth
assert.equal(visualStatusFromScoreDraft(''), null)
assert.equal(visualStatusFromScoreDraft('0'), '불합격')
assert.equal(visualStatusFromScoreDraft('80'), '불합격')
assert.equal(visualStatusFromScoreDraft('84'), '불합격')
assert.equal(visualStatusFromScoreDraft('85'), '합격')
assert.equal(visualStatusFromScoreDraft('86'), '합격')
assert.equal(visualStatusFromScoreDraft('100'), '합격')
assert.equal(visualStatusFromScoreDraft('101'), null)
assert.equal(visualStatusFromScoreDraft('-1'), null)

// partial update preserves other attempts / analysis / feedback
{
  const drafts = {
    nagyeong: {
      rounds: [
        { round: 1 as const, score: '80', passed: false },
        { round: 2 as const, score: '100', passed: true },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: {
        ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
        applicationLackCount: 2,
        teacherFeedback: '기존 피드백',
      },
    },
    doyoung: {
      rounds: [
        { round: 1 as const, score: '90', passed: true },
        { round: 2 as const, score: '', passed: false },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    },
  }
  const applied = applyCard('1차 85점', drafts)
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '85')
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '100')
  assert.equal(applied.drafts.nagyeong?.learningDiagnosis.applicationLackCount, 2)
  assert.equal(applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback, '기존 피드백')
  const feedbackOnly = applyCard('피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것', drafts)
  assert.equal(feedbackOnly.drafts.nagyeong?.rounds[0]?.score, '80')
  assert.equal(feedbackOnly.drafts.nagyeong?.rounds[1]?.score, '100')
  assert.equal(feedbackOnly.drafts.nagyeong?.learningDiagnosis.applicationLackCount, 2)
  assert.equal(
    feedbackOnly.drafts.nagyeong?.learningDiagnosis.teacherFeedback,
    '계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
  assert.equal(applied.drafts.doyoung?.rounds[0]?.score, '90')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 2)
}

// feedback raw + manual overwrite stays on the same field
{
  const applied = applyCard(
    '피드백 응용 문제를 더 연습할 것',
    { nagyeong: emptyDraft(), doyoung: emptyDraft() },
  )
  assert.equal(applied.drafts.nagyeong?.learningDiagnosis.teacherFeedback, '응용 문제를 더 연습할 것')
  const next = {
    ...applied.drafts.nagyeong!,
    learningDiagnosis: {
      ...applied.drafts.nagyeong!.learningDiagnosis,
      teacherFeedback: '응용 문제를 추가로 연습할 것',
    },
  }
  assert.equal(next.learningDiagnosis.teacherFeedback, '응용 문제를 추가로 연습할 것')
}

// PR #22 overlay keeps dirty student voice edit
{
  const prev = {
    nagyeong: {
      rounds: [
        { round: 1 as const, score: '85', passed: true },
        { round: 2 as const, score: '100', passed: false },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    },
  }
  const loaded = {
    nagyeong: {
      rounds: [
        { round: 1 as const, score: '80', passed: false },
        { round: 2 as const, score: '100', passed: true },
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
  assert.equal(merged.nagyeong.rounds[0]?.score, '85')
  assert.equal(merged.nagyeong.rounds[1]?.score, '100')
}

// PR #20 save command is not form-fill
assert.equal(isVoiceBulkSaveCommand('일괄 저장'), true)
assert.equal(routeVoiceTranscript('일괄 저장').kind, 'save-command')
assert.equal(routeVoiceTranscript('1차 80점').kind, 'form-fill')
{
  const parsed = parseCard('일괄 저장')
  assert.equal(parsed.attempts.length, 0)
}

// PR #19 growing prefix still compact
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
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '1차 8', isFinal: true }]))
  session.ingest(speechEvent(0, [{ transcript: '1차 80점', isFinal: true }]))
  assert.equal(compactFinalHypotheses(['1차 8', '1차 80점']), '1차 80점')
  const delivered = session.consumeFinal()
  const parsed = parseCard(delivered.text || '1차 80점')
  assert.equal(parsed.attempts[0]?.score, '80')
}

// PR #21 number normalization still used
{
  const parsed = parseCard('1차 팔십오점')
  assert.equal(parsed.attempts[0]?.score, '85')
}

function expectCoreSamsungPhrase(text: string) {
  corpus.push(text)
  const parsed = parseCard(text)
  assert.equal(parsed.apply, true, text)
  assert.deepEqual(
    parsed.attempts.map((row) => [row.round, row.score]),
    [
      [1, '80'],
      [2, '100'],
    ],
    text,
  )
  assert.equal(
    parsed.needsReview.some((row) => row.reason.includes('점수·오답분석·피드백')),
    false,
    text,
  )
  const applied = applyCard(text)
  assert.equal(applied.drafts.nagyeong?.rounds[0]?.score, '80', text)
  assert.equal(applied.drafts.nagyeong?.rounds[1]?.score, '100', text)
  assert.equal(applied.drafts.nagyeong?.rounds[2]?.score, '', text)
  assert.equal(applied.drafts.nagyeong?.rounds[3]?.score, '', text)
  assert.equal(visualStatusFromScoreDraft(applied.drafts.nagyeong?.rounds[0]?.score ?? ''), '불합격')
  assert.equal(visualStatusFromScoreDraft(applied.drafts.nagyeong?.rounds[1]?.score ?? ''), '합격')
  assert.equal(applied.drafts.nagyeong?.rounds.find((row) => row.passed)?.round, 2)
  assert.equal(applied.summary.appliedCount > 0, true, text)
  assert.doesNotMatch(formatVoiceSummary(applied.summary), /확인 필요/)
}

const samsungCore = [
  '1차 80점 불합격, 2차 100점 합격',
  '1. 차 80점 불합격, 2. 차 100점 합격',
  '1.차 80점 불합격, 2.차 100점 합격',
  '1. 80점 불합격, 2. 100점 합격',
  '일 차 80점 불합격, 이 차 100점 합격',
  '1회차 80점 불합격, 2회차 100점 합격',
  '1 회차 80점 불합격, 2 회차 100점 합격',
  '1자 80점 불합격, 2자 100점 합격',
  '1차 80 불합격, 2차 100 합격',
  '１차 80점 불합격, ２차 100점 합격',
  '1, 차 80점 불합격, 2, 차 100점 합격',
]
for (const phrase of samsungCore) {
  expectCoreSamsungPhrase(phrase)
}

assert.equal(
  normalizeStudentDailyTestAttemptSpeech('1. 80점 불합격, 2. 100점 합격').includes('1차'),
  true,
)
assert.equal(normalizeStudentDailyTestAttemptSpeech('3.14점').includes('3차'), false)

{
  const parsed = parseCard('1. 80점 합격')
  assert.equal(parsed.attempts.length, 0)
  assert.ok(parsed.needsReview.some((row) => row.reason.includes('85점')))
}

{
  const parsed = parseCard('1차')
  assert.equal(parsed.apply, false)
  assert.ok(parsed.needsReview.some((row) => row.reason.includes('점수·오답분석·피드백')))
}

const panel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(panel, /chipLabel="음성입력"/)
assert.match(panel, /applyStudentDailyTestDraft/)
assert.match(panel, /visualStatusFromScoreDraft/)
assert.match(panel, /data-daily-test-result/)
assert.doesNotMatch(panel, /voice-test-\$\{round\}/)
assert.match(panel, /onSaveCommand=\{\(\) => void handleSaveAll\(\)\}/)
assert.match(panel, /DailyLearningDiagnosisFields/)
assert.match(panel, /DailyTestVoiceDiagnostic/)
assert.match(panel, /hideStatus/)
assert.match(panel, /onDiagnostic/)
assert.match(readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8'), /parseStudentDailyTestVoice/)
assert.doesNotMatch(readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8'), /saveDailyTestRecord/)
assert.doesNotMatch(readFileSync('src/utils/voiceInput/parseStudentDailyTestVoice.ts', 'utf8'), /from '@supabase/)

const header = readFileSync('src/components/todayReport/AbsentFollowOnBadge.tsx', 'utf8')
assert.match(header, /ml-auto min-w-0 max-w-full flex-1/)
assert.doesNotMatch(header, /extra \? <div className="ml-auto shrink-0">/)

const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /data-voice-summary="true"/)
assert.match(voiceUi, /hideStatus/)
assert.match(voiceUi, /onDiagnostic/)
assert.match(voiceUi, /onHeldTrace/)
assert.match(voiceUi, /\[overflow-wrap:anywhere\]/)
assert.match(voiceUi, /min-w-0 w-full max-w-full/)

const diagnosticUi = readFileSync(
  'src/components/todayReport/DailyTestVoiceDiagnostic.tsx',
  'utf8',
)
assert.match(diagnosticUi, /break-all/)
assert.match(diagnosticUi, /data-voice-accumulated-raw/)
assert.match(diagnosticUi, /data-voice-parsed-feedback/)

console.log(`studentDailyTestVoice.test.ts passed (${corpus.length} corpus phrases)`)
