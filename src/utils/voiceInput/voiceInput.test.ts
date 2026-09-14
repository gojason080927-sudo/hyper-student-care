/**
 * 실행: npx tsx src/utils/voiceInput/voiceInput.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AttendanceRecord, ClassTodayReportCommon } from '../../types/records.ts'
import { buildClassCommonRecord, normalizeProgressPages } from '../classTodayReportCommon.ts'
import { mergeClassTodayReportCommonRecords } from '../mergeClassTodayReportCommon.ts'
import { isStudentAbsentOnDate } from '../todayReportAbsence.ts'
import {
  applyAttendanceDrafts,
  applyAttitudeDrafts,
  applyDailyTestDrafts,
  applyHomeworkDrafts,
  applyMaterialDrafts,
  applyProgressSlotDraft,
  applyTodayAssignmentSlotDraft,
  homeworkDraftKey,
  slotDraftKey,
} from './applyVoiceDraft.ts'
import {
  parseAttendanceVoice,
  parseAttitudeVoice,
  parseDailyTestVoice,
  parseHomeworkVoice,
  parseMaterialVoice,
  parseSectionTextVoice,
} from './parseVoiceTranscript.ts'
import {
  compactFinalHypotheses,
  createSpeechTranscriptSession,
  detectBrowserSpeechSupport,
  mergeFinalHypotheses,
  speechErrorMessage,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'
import {
  dispatchVoiceSessionFinal,
  isVoiceBulkSaveCommand,
  routeVoiceTranscript,
} from './voiceSaveCommand.ts'

const DATE = '2026-09-14'
const 김도영 = { id: 'doyoung', name: '김도영' }
const 김민재 = { id: 'minjae', name: '김민재' }
const 김성민 = { id: 'seongmin', name: '김성민' }
const 류정현 = { id: 'ryu', name: '류정현' }
const students = [김도영, 김민재, 김성민, 류정현]

function attendance(
  studentId: string,
  status: AttendanceRecord['status'],
  excuseKind: AttendanceRecord['excuseKind'] = null,
): AttendanceRecord {
  return {
    id: `a-${studentId}`,
    studentId,
    date: DATE,
    status,
    reason: '',
    memo: '',
    excuseKind,
    createdAt: '',
    updatedAt: '',
  }
}

const presentExceptMinjae = [
  attendance('doyoung', '출석'),
  attendance('minjae', '결석', '인정'),
  attendance('seongmin', '출석'),
  attendance('ryu', '출석'),
]
const absentIds = new Set(
  students.filter((s) => isStudentAbsentOnDate(presentExceptMinjae, s.id, DATE)).map((s) => s.id),
)
assert.deepEqual([...absentIds], ['minjae'])

// A. 전원 + 예외 출결
const attendanceParsed = parseAttendanceVoice(
  '김민재 제외 전원 출석. 김민재 결석, 인정.',
  students,
)
assert.equal(
  attendanceParsed.assignments.find((row) => row.studentId === 'doyoung')?.status,
  '출석',
)
assert.equal(
  attendanceParsed.assignments.find((row) => row.studentId === 'minjae')?.status,
  '결석',
)
assert.equal(
  attendanceParsed.assignments.find((row) => row.studentId === 'minjae')?.excuseKind,
  '인정',
)
assert.equal(
  attendanceParsed.assignments.find((row) => row.studentId === 'seongmin')?.status,
  '출석',
)

const sick = parseAttendanceVoice('김민재 병결', students)
assert.equal(sick.assignments[0]?.status, '결석')
assert.equal(sick.assignments[0]?.excuseKind, null)
assert.ok(sick.needsReview.some((item) => item.reason.includes('인정/무단')))

const unknownName = parseAttendanceVoice('홍길동 결석, 인정', students)
assert.equal(unknownName.assignments.length, 0)
assert.ok(unknownName.needsReview.some((item) => item.label === '홍길동'))

// B. 숙제 예외 우선 + 결석 제외
const homeworkParsed = parseHomeworkVoice(
  '숙제 전원 완료. 김성민만 부분완료.',
  students,
  absentIds,
)
assert.equal(homeworkParsed.assignments.find((row) => row.studentId === 'doyoung')?.status, '완료')
assert.equal(
  homeworkParsed.assignments.find((row) => row.studentId === 'seongmin')?.status,
  '부분 완료',
)
assert.equal(homeworkParsed.assignments.find((row) => row.studentId === 'minjae'), undefined)
assert.ok(homeworkParsed.skippedAbsentIds.includes('minjae'))

const incompleteHw = parseHomeworkVoice('전원 미완료', students, new Set())
assert.equal(incompleteHw.assignments.length, 0)
assert.ok(incompleteHw.needsReview.length > 0)

// C. 교재 + 결석 제외
const materialParsed = parseMaterialVoice(
  '교재 전원 지참. 류정현만 미지참.',
  students,
  absentIds,
)
assert.equal(materialParsed.assignments.find((row) => row.studentId === 'doyoung')?.status, '지참')
assert.equal(
  materialParsed.assignments.find((row) => row.studentId === 'ryu')?.status,
  '부분 지참',
)
assert.equal(materialParsed.assignments.find((row) => row.studentId === 'minjae'), undefined)
assert.ok(materialParsed.skippedAbsentIds.includes('minjae'))
assert.ok(materialParsed.needsReview.some((item) => item.label === '류정현'))

// D. 수학 개념/유형 진도·과제 — 해당 슬롯만
const progressDrafts = {
  '수학:1': { currentProgress: '개념 기존', currentPage: '', totalPage: '', textbookName: '' },
  '수학:2': { currentProgress: '유형 기존', currentPage: '', totalPage: '', textbookName: '' },
}
const conceptFill = applyProgressSlotDraft(
  progressDrafts,
  '72페이지에서 76페이지',
  '수학',
  1,
)
assert.equal(conceptFill.drafts['수학:1']?.currentProgress, '72페이지에서 76페이지')
assert.equal(conceptFill.drafts['수학:2']?.currentProgress, '유형 기존')

const typeFill = applyProgressSlotDraft(
  conceptFill.drafts,
  '120번에서 135번',
  '수학',
  2,
)
assert.equal(typeFill.drafts['수학:1']?.currentProgress, '72페이지에서 76페이지')
assert.equal(typeFill.drafts['수학:2']?.currentProgress, '120번에서 135번')

const mathAssign = {
  '수학:1': { todayAssignment: '개념과제기존', textbookName: '' },
  '수학:2': { todayAssignment: '유형과제기존', textbookName: '' },
}
const conceptHw = applyTodayAssignmentSlotDraft(mathAssign, '77페이지에서 80페이지', '수학', 1)
assert.equal(conceptHw.drafts['수학:1']?.todayAssignment, '77페이지에서 80페이지')
assert.equal(conceptHw.drafts['수학:2']?.todayAssignment, '유형과제기존')

// E. 영어 문법/독해/단어
const engProgress = {
  '영어:1': { currentProgress: '문법기존' },
  '영어:2': { currentProgress: '독해기존' },
  '영어:3': { currentProgress: '단어기존' },
}
const grammar = applyProgressSlotDraft(engProgress, '관계대명사', '영어', 1)
const reading = applyProgressSlotDraft(grammar.drafts, '8강 3번부터 6번', '영어', 2)
const vocab = applyProgressSlotDraft(reading.drafts, '12과', '영어', 3)
assert.equal(vocab.drafts['영어:1']?.currentProgress, '관계대명사')
assert.equal(vocab.drafts['영어:2']?.currentProgress, '8강 3번부터 6번')
assert.equal(vocab.drafts['영어:3']?.currentProgress, '12과')

const engAssign = {
  '영어:1': { todayAssignment: '' },
  '영어:2': { todayAssignment: '' },
  '영어:3': { todayAssignment: '' },
}
const gHw = applyTodayAssignmentSlotDraft(engAssign, '관계대명사 문제', '영어', 1)
const rHw = applyTodayAssignmentSlotDraft(gHw.drafts, '8강 7번부터 10번', '영어', 2)
const vHw = applyTodayAssignmentSlotDraft(rHw.drafts, '13과 암기', '영어', 3)
assert.equal(vHw.drafts['영어:1']?.todayAssignment, '관계대명사 문제')
assert.equal(vHw.drafts['영어:2']?.todayAssignment, '8강 7번부터 10번')
assert.equal(vHw.drafts['영어:3']?.todayAssignment, '13과 암기')

// F. 학생별 테스트 점수 + 오답 원인 (2차 context)
const emptyDiagnosis = {
  wrongAnswerItems: [],
  questionTotal: 0,
  conceptLackCount: 0,
  calculationErrorCount: 0,
  applicationLackCount: 0,
  teacherFeedback: '',
  fridayRetestTotal: null,
  fridayRetestWrong: null,
  englishVocabResult: null,
  englishGrammarWrongCount: null,
  englishReadingWrongCount: null,
  englishListeningScore: null,
  englishListeningResult: null,
}
const testDrafts = {
  doyoung: {
    rounds: [
      { round: 1 as const, score: '', passed: false },
      { round: 2 as const, score: '', passed: false },
      { round: 3 as const, score: '', passed: false },
      { round: 4 as const, score: '', passed: false },
    ],
    learningDiagnosis: { ...emptyDiagnosis },
  },
  seongmin: {
    rounds: [
      { round: 1 as const, score: '', passed: false },
      { round: 2 as const, score: '', passed: false },
      { round: 3 as const, score: '', passed: false },
      { round: 4 as const, score: '', passed: false },
    ],
    learningDiagnosis: { ...emptyDiagnosis },
  },
  minjae: {
    rounds: [
      { round: 1 as const, score: '', passed: false },
      { round: 2 as const, score: '', passed: false },
      { round: 3 as const, score: '', passed: false },
      { round: 4 as const, score: '', passed: false },
    ],
    learningDiagnosis: { ...emptyDiagnosis },
  },
}
const dailyFilled = applyDailyTestDrafts(
  testDrafts,
  '김도영 92점. 김성민 78점 계산 실수. 류정현 88점.',
  students,
  presentExceptMinjae,
  DATE,
  2,
)
assert.equal(dailyFilled.drafts.doyoung?.rounds.find((r) => r.round === 2)?.score, '92')
assert.equal(dailyFilled.drafts.doyoung?.rounds.find((r) => r.round === 1)?.score, '')
assert.equal(dailyFilled.drafts.doyoung?.rounds.find((r) => r.round === 2)?.passed, false)
assert.equal(dailyFilled.drafts.seongmin?.rounds.find((r) => r.round === 2)?.score, '78')
assert.equal(dailyFilled.drafts.seongmin?.learningDiagnosis.calculationErrorCount, 1)
assert.equal(dailyFilled.drafts.minjae?.rounds.find((r) => r.round === 2)?.score, '')
assert.ok(!dailyFilled.drafts.doyoung?.rounds.some((r) => r.passed))

const noRound = parseDailyTestVoice('김도영 92점', students, new Set(), null)
assert.equal(noRound.assignments.length, 0)
assert.ok(noRound.needsReview.some((item) => item.reason.includes('차시')))

// G. 수업태도 전체 + 예외 + note
const attitude = parseAttitudeVoice(
  '전원 우수. 김성민만 졸음과 집중 저하. 메모 어제 잠을 못 잤다고 함.',
  students,
  absentIds,
)
assert.deepEqual(attitude.assignments.find((row) => row.studentId === 'doyoung')?.issues, [])
assert.deepEqual(attitude.assignments.find((row) => row.studentId === 'seongmin')?.issues.sort(), [
  '집중 저하',
  '졸음',
].sort())
assert.match(
  attitude.assignments.find((row) => row.studentId === 'seongmin')?.note ?? '',
  /잠을 못 잤/,
)
assert.equal(attitude.assignments.find((row) => row.studentId === 'minjae'), undefined)
assert.ok(attitude.skippedAbsentIds.includes('minjae'))

// H. 결석 학생에게 fake downstream data 없음
assert.equal(
  homeworkParsed.assignments.some((row) => row.studentId === 'minjae'),
  false,
)
assert.equal(
  materialParsed.assignments.some((row) => row.studentId === 'minjae'),
  false,
)
assert.equal(
  attitude.assignments.some((row) => row.studentId === 'minjae'),
  false,
)
assert.equal(dailyFilled.drafts.minjae?.rounds.find((r) => r.round === 2)?.score, '')

// I. 음성 form-fill 모듈은 DB write API를 호출하지 않음
for (const file of [
  'src/utils/voiceInput/parseVoiceTranscript.ts',
  'src/utils/voiceInput/applyVoiceDraft.ts',
  'src/utils/voiceInput/speechRecognition.ts',
  'src/utils/voiceInput/voiceSaveCommand.ts',
  'src/utils/voiceInput/voiceLexicon.ts',
  'src/components/todayReport/SectionVoiceInput.tsx',
]) {
  const source = readFileSync(file, 'utf8')
  assert.doesNotMatch(source, /saveAttendanceRecord/)
  assert.doesNotMatch(source, /saveHomework/)
  assert.doesNotMatch(source, /saveProgress/)
  assert.doesNotMatch(source, /saveDailyTest/)
  assert.doesNotMatch(source, /saveStudentDailyCare/)
  assert.doesNotMatch(source, /upsertClassTodayReportCommon/)
  assert.doesNotMatch(source, /from '@supabase/)
  assert.doesNotMatch(source, /createClient/)
}

// J / sequential save preservation — class_today_report_common is keyed by subject+slot
function commonRecord(
  subject: ClassTodayReportCommon['subject'],
  slotNumber: ClassTodayReportCommon['slotNumber'],
  currentProgress: string,
  todayAssignment: string,
): ClassTodayReportCommon {
  return buildClassCommonRecord({
    grade: '고1',
    className: '고1 수학A',
    reportDate: DATE,
    subject,
    slotNumber,
    currentProgress,
    todayAssignment,
    timestamps: { createdAt: '1', updatedAt: '1' },
    createId: () => `${subject}-${slotNumber}`,
  })
}

const afterConcept = mergeClassTodayReportCommonRecords(
  [],
  [commonRecord('수학', 1, '개념 72-76', '개념 77-80')],
)
const afterType = mergeClassTodayReportCommonRecords(afterConcept, [
  commonRecord('수학', 2, '유형 120-135', '유형 136-150'),
])
assert.equal(afterType.find((row) => row.slotNumber === 1)?.currentProgress, '개념 72-76')
assert.equal(afterType.find((row) => row.slotNumber === 1)?.todayAssignment, '개념 77-80')
assert.equal(afterType.find((row) => row.slotNumber === 2)?.currentProgress, '유형 120-135')

const afterTypeFirst = mergeClassTodayReportCommonRecords(
  [],
  [commonRecord('수학', 2, '유형 먼저', '유형 과제')],
)
const afterConceptLater = mergeClassTodayReportCommonRecords(afterTypeFirst, [
  commonRecord('수학', 1, '개념 나중', '개념 과제'),
])
assert.equal(afterConceptLater.find((row) => row.slotNumber === 2)?.currentProgress, '유형 먼저')
assert.equal(afterConceptLater.find((row) => row.slotNumber === 1)?.currentProgress, '개념 나중')

let englishSaved = mergeClassTodayReportCommonRecords([], [
  commonRecord('영어', 1, '문법 진도', '문법 과제'),
])
englishSaved = mergeClassTodayReportCommonRecords(englishSaved, [
  commonRecord('영어', 2, '독해 진도', '독해 과제'),
])
englishSaved = mergeClassTodayReportCommonRecords(englishSaved, [
  commonRecord('영어', 3, '단어 진도', '단어 과제'),
])
assert.equal(englishSaved.find((row) => row.slotNumber === 1)?.todayAssignment, '문법 과제')
assert.equal(englishSaved.find((row) => row.slotNumber === 2)?.currentProgress, '독해 진도')
assert.equal(englishSaved.find((row) => row.slotNumber === 3)?.todayAssignment, '단어 과제')

const existingConcept = commonRecord('수학', 1, '개념 유지', '개념 과제 유지')
const typeSaveMergesExisting = buildClassCommonRecord({
  grade: existingConcept.grade,
  className: existingConcept.className,
  reportDate: existingConcept.reportDate,
  subject: '수학',
  slotNumber: 2,
  currentProgress: '유형만 저장',
  existing: undefined,
  timestamps: { createdAt: '2', updatedAt: '2' },
  createId: () => 'type-only',
})
assert.equal(typeSaveMergesExisting.slotNumber, 2)
assert.notEqual(typeSaveMergesExisting.currentProgress, existingConcept.currentProgress)

const homeworkOnSameSlotKeepsProgress = buildClassCommonRecord({
  grade: existingConcept.grade,
  className: existingConcept.className,
  reportDate: existingConcept.reportDate,
  subject: existingConcept.subject,
  slotNumber: existingConcept.slotNumber,
  todayAssignment: '새 과제',
  existing: existingConcept,
  timestamps: { createdAt: '3', updatedAt: '3' },
  createId: () => 'should-not-use',
})
assert.equal(homeworkOnSameSlotKeepsProgress.currentProgress, '개념 유지')
assert.equal(homeworkOnSameSlotKeepsProgress.todayAssignment, '새 과제')
assert.equal(homeworkOnSameSlotKeepsProgress.id, existingConcept.id)

// empty slot filter used by progress save — empty concept must not be synced
const slots = [
  { currentProgress: '', currentPage: 0, totalPage: 0 },
  { currentProgress: '유형만', currentPage: 0, totalPage: 0 },
]
const slotsToSync = slots.filter(
  (slot) => slot.currentProgress.trim() || slot.currentPage > 0 || slot.totalPage > 0,
)
assert.equal(slotsToSync.length, 1)
assert.equal(slotsToSync[0]?.currentProgress, '유형만')
assert.deepEqual(normalizeProgressPages(0, 0), { currentPage: 0, totalPage: 0 })

// K. STT 미지원이어도 파서/폼채움은 동작 (브라우저 전제 없음)
assert.equal(detectBrowserSpeechSupport(), 'unsupported')
const textOnly = parseSectionTextVoice('72페이지에서 76페이지')
assert.equal(textOnly.text, '72페이지에서 76페이지')

const hwDrafts: Record<string, { status: '' | '완료' | '부분 완료' | '미완료' }> = {
  [homeworkDraftKey('doyoung', '수학', 1)]: { status: '' },
  [homeworkDraftKey('minjae', '수학', 1)]: { status: '' },
  [homeworkDraftKey('seongmin', '수학', 1)]: { status: '' },
  [homeworkDraftKey('doyoung', '수학', 2)]: { status: '' },
}
const hwApplied = applyHomeworkDrafts(
  hwDrafts,
  '전원 완료. 김성민만 부분완료.',
  students,
  presentExceptMinjae,
  DATE,
  '수학',
  1,
)
assert.equal(hwApplied.drafts[homeworkDraftKey('doyoung', '수학', 1)]?.status, '완료')
assert.equal(hwApplied.drafts[homeworkDraftKey('seongmin', '수학', 1)]?.status, '부분 완료')
assert.equal(hwApplied.drafts[homeworkDraftKey('minjae', '수학', 1)]?.status, '')
assert.equal(hwApplied.drafts[homeworkDraftKey('doyoung', '수학', 2)]?.status, '')

const attDrafts = {
  doyoung: { status: '' as const, excuseKind: null, reason: '', memo: '' },
  minjae: { status: '' as const, excuseKind: null, reason: '', memo: '' },
  seongmin: { status: '' as const, excuseKind: null, reason: '', memo: '' },
  ryu: { status: '' as const, excuseKind: null, reason: '', memo: '' },
}
const attApplied = applyAttendanceDrafts(
  attDrafts,
  '김민재 제외 전원 출석. 김민재 결석, 인정.',
  students,
)
assert.equal(attApplied.drafts.minjae.status, '결석')
assert.equal(attApplied.drafts.minjae.excuseKind, '인정')
assert.equal(attApplied.drafts.doyoung.status, '출석')

const materialApplied = applyMaterialDrafts(
  {
    doyoung: { materialPrep: null },
    minjae: { materialPrep: null },
    seongmin: { materialPrep: null },
    ryu: { materialPrep: null },
  },
  '전원 지참. 류정현만 미지참.',
  students,
  presentExceptMinjae,
  DATE,
  (_student, prev, status) => ({ ...(prev ?? { materialPrep: null }), materialPrep: status }),
)
assert.equal(materialApplied.drafts.doyoung?.materialPrep, '지참')
assert.equal(materialApplied.drafts.minjae?.materialPrep, null)
assert.equal(materialApplied.drafts.ryu?.materialPrep, '부분 지참')

const attitudeDrafts = {
  doyoung: { issues: [], note: '' },
  minjae: { issues: [], note: '' },
  seongmin: { issues: [], note: '' },
  ryu: { issues: [], note: '' },
}
const attitudeApplied = applyAttitudeDrafts(
  attitudeDrafts,
  '전원 우수. 김성민만 졸음과 집중 저하. 메모 어제 잠을 못 잤다고 함.',
  students,
  presentExceptMinjae,
  DATE,
)
assert.deepEqual(attitudeApplied.drafts.doyoung.issues, [])
assert.ok(attitudeApplied.drafts.seongmin.issues.includes('졸음'))
assert.deepEqual(attitudeApplied.drafts.minjae.issues, [])

assert.equal(slotDraftKey('수학', 1), '수학:1')

assert.equal(
  readFileSync('src/utils/studentCare/constants.ts', 'utf8').includes('ATTENDANCE_WEEKLY_MAX = 20'),
  true,
)
assert.equal(
  readFileSync('src/utils/studentCare/constants.ts', 'utf8').includes('HOMEWORK_WEEKLY_MAX = 25'),
  true,
)
assert.doesNotMatch(
  readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8'),
  /MediaRecorder/,
)

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

function applySessionOnce<T>(
  session: ReturnType<typeof createSpeechTranscriptSession>,
  apply: (text: string) => T,
): { applied: boolean; value: T | undefined } {
  const { text, delivered } = session.consumeFinal()
  if (!delivered || !text) return { applied: false, value: undefined }
  return { applied: true, value: apply(text) }
}

// L. VOICE DEDUP — CASE A: interim prefixes must not land in the form
{
  const session = createSpeechTranscriptSession()
  const first = session.ingest(speechEvent(0, [{ transcript: '문제지', isFinal: false }]))
  assert.equal(first.display, '문제지')
  assert.equal(session.peekCommitted(), '')
  const second = session.ingest(speechEvent(0, [{ transcript: '문제지 43', isFinal: false }]))
  assert.equal(second.display, '문제지 43')
  assert.equal(session.peekCommitted(), '')
  session.ingest(speechEvent(0, [{ transcript: '문제지 43페이지까지', isFinal: true }]))
  const assignmentDrafts = {
    '수학:1': { todayAssignment: '', textbookName: '' },
    '수학:2': { todayAssignment: '유형 유지', textbookName: '' },
  }
  const filled = applySessionOnce(session, (text) =>
    applyTodayAssignmentSlotDraft(assignmentDrafts, text, '수학', 1),
  )
  assert.equal(filled.applied, true)
  assert.equal(filled.value?.drafts['수학:1']?.todayAssignment, '문제지 43페이지까지')
  assert.notEqual(filled.value?.drafts['수학:1']?.todayAssignment, '문제지 문제지 문제지 43페이지까지')
  assert.equal(filled.value?.drafts['수학:2']?.todayAssignment, '유형 유지')
}

// CASE A — Android: growing isFinal copies / repeated "문제지" finals
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '문제지', isFinal: true }]))
  session.ingest(
    speechEvent(0, [
      { transcript: '문제지', isFinal: true },
      { transcript: '문제지', isFinal: true },
      { transcript: '문제지', isFinal: true },
      { transcript: '문제지', isFinal: true },
      { transcript: '문제지', isFinal: true },
      { transcript: '문제지 43페이지까지', isFinal: true },
    ]),
  )
  const { text, delivered } = session.consumeFinal()
  assert.equal(delivered, true)
  assert.equal(text, '문제지 43페이지까지')
  const assignmentDrafts = {
    '수학:1': { todayAssignment: '', textbookName: '' },
  }
  const filled = applyTodayAssignmentSlotDraft(assignmentDrafts, text, '수학', 1)
  assert.equal(filled.drafts['수학:1']?.todayAssignment, '문제지 43페이지까지')
}

{
  const sameIndex = createSpeechTranscriptSession()
  sameIndex.ingest(speechEvent(0, [{ transcript: '문제지', isFinal: true }]))
  sameIndex.ingest(speechEvent(0, [{ transcript: '문제지 43', isFinal: true }]))
  sameIndex.ingest(speechEvent(0, [{ transcript: '문제지 43페이지까지', isFinal: true }]))
  assert.equal(sameIndex.consumeFinal().text, '문제지 43페이지까지')
}

// CASE B — "2차" interim/final growing into "2차 함수"
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '2차', isFinal: false }]))
  assert.equal(session.peekCommitted(), '')
  session.ingest(speechEvent(0, [{ transcript: '2차 함수', isFinal: true }]))
  const progressDrafts = {
    '수학:1': { currentProgress: '' },
    '수학:2': { currentProgress: '유형 기존' },
  }
  const filled = applySessionOnce(session, (text) =>
    applyProgressSlotDraft(progressDrafts, text, '수학', 1),
  )
  assert.equal(filled.value?.drafts['수학:1']?.currentProgress, '2차 함수')
  assert.notEqual(filled.value?.drafts['수학:1']?.currentProgress, '2차 2차 함수')
  assert.equal(filled.value?.drafts['수학:2']?.currentProgress, '유형 기존')
}

{
  const android = createSpeechTranscriptSession()
  android.ingest(speechEvent(0, [{ transcript: '2차', isFinal: true }]))
  android.ingest(speechEvent(1, [
    { transcript: '2차', isFinal: true },
    { transcript: '2차 함수', isFinal: true },
  ]))
  assert.equal(android.consumeFinal().text, '2차 함수')
}

// CASE C — duplicate final callback in the same session applies once
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '김도영 92점 계산 실수', isFinal: true }]))
  let applyCount = 0
  let drafts = {
    doyoung: {
      rounds: [
        { round: 1 as const, score: '', passed: false },
        { round: 2 as const, score: '', passed: false },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: { ...emptyDiagnosis },
    },
  }
  const apply = () => {
    const result = applySessionOnce(session, (text) => {
      applyCount += 1
      return applyDailyTestDrafts(
        drafts,
        text,
        students,
        presentExceptMinjae,
        DATE,
        2,
      )
    })
    if (result.value) drafts = result.value.drafts
    return result.applied
  }
  assert.equal(apply(), true)
  assert.equal(apply(), false)
  assert.equal(applyCount, 1)
  assert.equal(drafts.doyoung.rounds.find((row) => row.round === 2)?.score, '92')
  assert.equal(drafts.doyoung.learningDiagnosis.calculationErrorCount, 1)
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '관계대명사 문제', isFinal: true }]))
  const first = session.consumeFinal()
  const second = session.consumeFinal()
  assert.equal(first.delivered, true)
  assert.equal(second.delivered, false)
  assert.equal(first.text, '관계대명사 문제')
}

// CASE D — a new voice session must still apply
{
  const firstSession = createSpeechTranscriptSession()
  firstSession.ingest(speechEvent(0, [{ transcript: '문제지 43페이지까지', isFinal: true }]))
  let drafts = {
    '수학:1': { todayAssignment: '', textbookName: '' },
  }
  const first = applySessionOnce(firstSession, (text) =>
    applyTodayAssignmentSlotDraft(drafts, text, '수학', 1),
  )
  drafts = first.value!.drafts
  const secondSession = createSpeechTranscriptSession()
  secondSession.ingest(speechEvent(0, [{ transcript: '77페이지에서 80페이지', isFinal: true }]))
  const second = applySessionOnce(secondSession, (text) =>
    applyTodayAssignmentSlotDraft(drafts, text, '수학', 1),
  )
  assert.equal(first.applied, true)
  assert.equal(second.applied, true)
  assert.equal(second.value?.drafts['수학:1']?.todayAssignment, '77페이지에서 80페이지')
}

// CASE E — math concept voice must not change math type slot
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '2차 함수', isFinal: true }]))
  const drafts = {
    '수학:1': { currentProgress: '개념 기존' },
    '수학:2': { currentProgress: '유형 기존' },
  }
  const filled = applySessionOnce(session, (text) =>
    applyProgressSlotDraft(drafts, text, '수학', 1),
  )
  assert.equal(filled.value?.drafts['수학:1']?.currentProgress, '2차 함수')
  assert.equal(filled.value?.drafts['수학:2']?.currentProgress, '유형 기존')
}

{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '관계대명사', isFinal: true }]))
  const drafts = {
    '영어:1': { currentProgress: '문법기존' },
    '영어:2': { currentProgress: '독해기존' },
    '영어:3': { currentProgress: '단어기존' },
  }
  const filled = applySessionOnce(session, (text) =>
    applyProgressSlotDraft(drafts, text, '영어', 1),
  )
  assert.equal(filled.value?.drafts['영어:1']?.currentProgress, '관계대명사')
  assert.equal(filled.value?.drafts['영어:2']?.currentProgress, '독해기존')
  assert.equal(filled.value?.drafts['영어:3']?.currentProgress, '단어기존')
}

// Distinct phrases in one session stay distinct (not prefix-stripped)
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '김도영 출석', isFinal: true }]))
  session.ingest(
    speechEvent(1, [
      { transcript: '김도영 출석', isFinal: true },
      { transcript: '김성민 결석', isFinal: true },
    ]),
  )
  assert.equal(session.consumeFinal().text, '김도영 출석 김성민 결석')
}

// A single final result that already repeats a word is left unchanged
assert.equal(
  compactFinalHypotheses(['정말 정말 중요']),
  '정말 정말 중요',
)
assert.deepEqual(mergeFinalHypotheses(['문제지'], '문제지 43페이지까지'), [
  '문제지 43페이지까지',
])

// CASE F — unsupported / error still leaves manual parsers usable
assert.equal(detectBrowserSpeechSupport(), 'unsupported')
assert.equal(speechErrorMessage('not-allowed'), '마이크 권한이 필요합니다.')
const manualStillWorks = parseSectionTextVoice('72페이지에서 76페이지')
assert.equal(manualStillWorks.text, '72페이지에서 76페이지')
const permissionDeniedDrafts = {
  '수학:1': { todayAssignment: '수기 유지', textbookName: '' },
}
assert.equal(permissionDeniedDrafts['수학:1']?.todayAssignment, '수기 유지')
const fallbackFill = applyTodayAssignmentSlotDraft(
  permissionDeniedDrafts,
  '텍스트로 입력한 과제',
  '수학',
  1,
)
assert.equal(fallbackFill.drafts['수학:1']?.todayAssignment, '텍스트로 입력한 과제')

assert.match(
  readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8'),
  /appliedThisSessionRef/,
)
assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8'),
  /finals\.push/,
)

function emptySaveCounts() {
  return {
    attendance: 0,
    homework: 0,
    material: 0,
    progress: 0,
    assignment: 0,
    dailyTest: 0,
    attitude: 0,
  }
}

// M. VOICE SAVE COMMAND V1.1
assert.equal(isVoiceBulkSaveCommand('일괄 저장'), true)
assert.equal(isVoiceBulkSaveCommand('일괄저장'), true)
assert.equal(isVoiceBulkSaveCommand('  일괄   저장  '), true)
assert.equal(isVoiceBulkSaveCommand('저장'), false)
assert.equal(isVoiceBulkSaveCommand('완료'), false)
assert.equal(isVoiceBulkSaveCommand('저장해줘'), false)
assert.equal(isVoiceBulkSaveCommand('확인'), false)
assert.equal(isVoiceBulkSaveCommand('오케이'), false)
assert.equal(isVoiceBulkSaveCommand('문제지 43페이지까지'), false)
assert.equal(routeVoiceTranscript('일괄저장').kind, 'save-command')
assert.equal(routeVoiceTranscript('저장').kind, 'form-fill')

const 강나경 = { id: 'nagyeong', name: '강나경' }
const saveCommandStudents = [강나경, ...students]
const saveCommandAttendance = [...presentExceptMinjae, attendance('nagyeong', '출석')]

// CASE A — homework fill then a new session “일괄 저장”
{
  const fillSession = createSpeechTranscriptSession()
  fillSession.ingest(
    speechEvent(0, [{ transcript: '강나경만 부분완료. 나머지 모두 완료', isFinal: true }]),
  )
  const hwDrafts: Record<string, { status: '' | '완료' | '부분 완료' | '미완료' }> = {
    [homeworkDraftKey('nagyeong', '수학', 1)]: { status: '' },
    [homeworkDraftKey('doyoung', '수학', 1)]: { status: '' },
    [homeworkDraftKey('seongmin', '수학', 1)]: { status: '' },
    [homeworkDraftKey('ryu', '수학', 1)]: { status: '' },
    [homeworkDraftKey('minjae', '수학', 1)]: { status: '' },
    [homeworkDraftKey('nagyeong', '수학', 2)]: { status: '' },
    [homeworkDraftKey('doyoung', '수학', 2)]: { status: '완료' },
  }
  const counts = emptySaveCounts()
  const filled = dispatchVoiceSessionFinal(fillSession, {
    onApply: (text) => {
      const applied = applyHomeworkDrafts(
        hwDrafts,
        text,
        saveCommandStudents,
        saveCommandAttendance,
        DATE,
        '수학',
        1,
      )
      Object.assign(hwDrafts, applied.drafts)
    },
    onSaveCommand: () => {
      counts.homework += 1
    },
  })
  assert.equal(filled.kind, 'form-fill')
  assert.equal(hwDrafts[homeworkDraftKey('nagyeong', '수학', 1)]?.status, '부분 완료')
  assert.equal(hwDrafts[homeworkDraftKey('doyoung', '수학', 1)]?.status, '완료')
  assert.equal(hwDrafts[homeworkDraftKey('minjae', '수학', 1)]?.status, '')
  assert.equal(hwDrafts[homeworkDraftKey('doyoung', '수학', 2)]?.status, '완료')
  assert.equal(counts.homework, 0)

  const saveSession = createSpeechTranscriptSession()
  saveSession.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  const saved = dispatchVoiceSessionFinal(saveSession, {
    onApply: (text) => {
      const applied = applyHomeworkDrafts(
        hwDrafts,
        text,
        saveCommandStudents,
        saveCommandAttendance,
        DATE,
        '수학',
        1,
      )
      Object.assign(hwDrafts, applied.drafts)
    },
    onSaveCommand: () => {
      counts.homework += 1
    },
  })
  assert.equal(saved.kind, 'save-command')
  assert.equal(counts.homework, 1)
  assert.equal(counts.attendance, 0)
  assert.equal(counts.material, 0)
  assert.equal(counts.progress, 0)
  assert.equal(counts.assignment, 0)
  assert.equal(counts.dailyTest, 0)
  assert.equal(counts.attitude, 0)
  assert.equal(hwDrafts[homeworkDraftKey('nagyeong', '수학', 1)]?.status, '부분 완료')
  assert.notEqual(hwDrafts[homeworkDraftKey('nagyeong', '수학', 1)]?.status, '일괄 저장')
}

// CASE B — duplicate final “일괄 저장” in one session → save 1
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  session.ingest(
    speechEvent(0, [
      { transcript: '일괄 저장', isFinal: true },
      { transcript: '일괄 저장', isFinal: true },
    ]),
  )
  let saveCount = 0
  let applyCount = 0
  const first = dispatchVoiceSessionFinal(session, {
    onApply: () => {
      applyCount += 1
    },
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  const second = dispatchVoiceSessionFinal(session, {
    onApply: () => {
      applyCount += 1
    },
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(first.kind, 'save-command')
  assert.equal(second.kind, 'none')
  assert.equal(saveCount, 1)
  assert.equal(applyCount, 0)
}

// CASE C — after save completes, a new session can save again
{
  let saveCount = 0
  const first = createSpeechTranscriptSession()
  first.ingest(speechEvent(0, [{ transcript: '일괄저장', isFinal: true }]))
  dispatchVoiceSessionFinal(first, {
    onApply: () => {},
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  const second = createSpeechTranscriptSession()
  second.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  dispatchVoiceSessionFinal(second, {
    onApply: () => {},
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(saveCount, 2)
}

// CASE D / E — ordinary text is form-fill; command string never enters the field
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '문제지 43페이지까지', isFinal: true }]))
  let saveCount = 0
  const drafts = {
    '수학:1': { todayAssignment: '', textbookName: '' },
  }
  const routed = dispatchVoiceSessionFinal(session, {
    onApply: (text) => {
      const applied = applyTodayAssignmentSlotDraft(drafts, text, '수학', 1)
      drafts['수학:1'] = applied.drafts['수학:1']!
    },
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(routed.kind, 'form-fill')
  assert.equal(drafts['수학:1']?.todayAssignment, '문제지 43페이지까지')
  assert.equal(saveCount, 0)

  const commandSession = createSpeechTranscriptSession()
  commandSession.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  const before = drafts['수학:1']?.todayAssignment
  dispatchVoiceSessionFinal(commandSession, {
    onApply: (text) => {
      const applied = applyTodayAssignmentSlotDraft(drafts, text, '수학', 1)
      drafts['수학:1'] = applied.drafts['수학:1']!
    },
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(drafts['수학:1']?.todayAssignment, before)
  assert.equal(saveCount, 1)
}

// CASE F — similar phrases are not save commands
for (const phrase of ['저장', '완료', '저장해줘', '끝', '확인', '오케이']) {
  assert.equal(isVoiceBulkSaveCommand(phrase), false)
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: phrase, isFinal: true }]))
  let saveCount = 0
  let applied = ''
  dispatchVoiceSessionFinal(session, {
    onApply: (text) => {
      applied = text
    },
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(saveCount, 0)
  assert.equal(applied, phrase)
}

// CASE G — homework save command does not fire other section saves
{
  const counts = emptySaveCounts()
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  dispatchVoiceSessionFinal(session, {
    onApply: () => {},
    onSaveCommand: () => {
      counts.homework += 1
    },
  })
  assert.deepEqual(counts, { ...emptySaveCounts(), homework: 1 })
}

// CASE H — math concept fill/save does not change type slot
{
  const drafts = {
    '수학:1': { currentProgress: '개념 기존' },
    '수학:2': { currentProgress: '유형 기존' },
  }
  const fill = createSpeechTranscriptSession()
  fill.ingest(speechEvent(0, [{ transcript: '2차 함수', isFinal: true }]))
  dispatchVoiceSessionFinal(fill, {
    onApply: (text) => {
      const applied = applyProgressSlotDraft(drafts, text, '수학', 1)
      Object.assign(drafts, applied.drafts)
    },
    onSaveCommand: () => {},
  })
  const save = createSpeechTranscriptSession()
  save.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  let progressSaves = 0
  dispatchVoiceSessionFinal(save, {
    onApply: (text) => {
      const applied = applyProgressSlotDraft(drafts, text, '수학', 1)
      Object.assign(drafts, applied.drafts)
    },
    onSaveCommand: () => {
      progressSaves += 1
    },
  })
  assert.equal(progressSaves, 1)
  assert.equal(drafts['수학:1']?.currentProgress, '2차 함수')
  assert.equal(drafts['수학:2']?.currentProgress, '유형 기존')
}

{
  const drafts = {
    '수학:1': { currentProgress: '개념 유지' },
    '수학:2': { currentProgress: '유형 기존' },
  }
  const fill = createSpeechTranscriptSession()
  fill.ingest(speechEvent(0, [{ transcript: '120번에서 135번', isFinal: true }]))
  dispatchVoiceSessionFinal(fill, {
    onApply: (text) => {
      const applied = applyProgressSlotDraft(drafts, text, '수학', 2)
      Object.assign(drafts, applied.drafts)
    },
    onSaveCommand: () => {},
  })
  assert.equal(drafts['수학:1']?.currentProgress, '개념 유지')
  assert.equal(drafts['수학:2']?.currentProgress, '120번에서 135번')
}

// CASE I — English grammar → reading → vocab previous slots stay
{
  const drafts = {
    '영어:1': { todayAssignment: '문법기존' },
    '영어:2': { todayAssignment: '독해기존' },
    '영어:3': { todayAssignment: '단어기존' },
  }
  const grammar = createSpeechTranscriptSession()
  grammar.ingest(speechEvent(0, [{ transcript: '관계대명사 문제', isFinal: true }]))
  dispatchVoiceSessionFinal(grammar, {
    onApply: (text) => {
      Object.assign(drafts, applyTodayAssignmentSlotDraft(drafts, text, '영어', 1).drafts)
    },
    onSaveCommand: () => {},
  })
  const reading = createSpeechTranscriptSession()
  reading.ingest(speechEvent(0, [{ transcript: '8강 7번부터 10번', isFinal: true }]))
  dispatchVoiceSessionFinal(reading, {
    onApply: (text) => {
      Object.assign(drafts, applyTodayAssignmentSlotDraft(drafts, text, '영어', 2).drafts)
    },
    onSaveCommand: () => {},
  })
  const vocab = createSpeechTranscriptSession()
  vocab.ingest(speechEvent(0, [{ transcript: '13과 암기', isFinal: true }]))
  dispatchVoiceSessionFinal(vocab, {
    onApply: (text) => {
      Object.assign(drafts, applyTodayAssignmentSlotDraft(drafts, text, '영어', 3).drafts)
    },
    onSaveCommand: () => {},
  })
  const save = createSpeechTranscriptSession()
  save.ingest(speechEvent(0, [{ transcript: '일괄저장', isFinal: true }]))
  let assignmentSaves = 0
  dispatchVoiceSessionFinal(save, {
    onApply: (text) => {
      Object.assign(drafts, applyTodayAssignmentSlotDraft(drafts, text, '영어', 3).drafts)
    },
    onSaveCommand: () => {
      assignmentSaves += 1
    },
  })
  assert.equal(assignmentSaves, 1)
  assert.equal(drafts['영어:1']?.todayAssignment, '관계대명사 문제')
  assert.equal(drafts['영어:2']?.todayAssignment, '8강 7번부터 10번')
  assert.equal(drafts['영어:3']?.todayAssignment, '13과 암기')
}

// CASE J — absent student still excluded from homework fill; save command is not a parser
{
  const hwDrafts: Record<string, { status: '' | '완료' | '부분 완료' | '미완료' }> = {
    [homeworkDraftKey('doyoung', '수학', 1)]: { status: '' },
    [homeworkDraftKey('minjae', '수학', 1)]: { status: '' },
  }
  const fill = createSpeechTranscriptSession()
  fill.ingest(speechEvent(0, [{ transcript: '전원 완료', isFinal: true }]))
  dispatchVoiceSessionFinal(fill, {
    onApply: (text) => {
      Object.assign(
        hwDrafts,
        applyHomeworkDrafts(hwDrafts, text, students, presentExceptMinjae, DATE, '수학', 1).drafts,
      )
    },
    onSaveCommand: () => {},
  })
  assert.equal(hwDrafts[homeworkDraftKey('doyoung', '수학', 1)]?.status, '완료')
  assert.equal(hwDrafts[homeworkDraftKey('minjae', '수학', 1)]?.status, '')
  const save = createSpeechTranscriptSession()
  save.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  dispatchVoiceSessionFinal(save, {
    onApply: (text) => {
      Object.assign(
        hwDrafts,
        applyHomeworkDrafts(hwDrafts, text, students, presentExceptMinjae, DATE, '수학', 1).drafts,
      )
    },
    onSaveCommand: () => {},
  })
  assert.equal(hwDrafts[homeworkDraftKey('minjae', '수학', 1)]?.status, '')
}

// CASE K — saving=true does not re-enter save
{
  const session = createSpeechTranscriptSession()
  session.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  let saveCount = 0
  dispatchVoiceSessionFinal(session, {
    saving: true,
    onApply: () => {},
    onSaveCommand: () => {
      saveCount += 1
    },
  })
  assert.equal(saveCount, 0)
}

// Daily-test round fill stays on the mic round; save command does not invent a round
{
  const drafts = {
    doyoung: {
      rounds: [
        { round: 1 as const, score: '', passed: false },
        { round: 2 as const, score: '', passed: false },
        { round: 3 as const, score: '', passed: false },
        { round: 4 as const, score: '', passed: false },
      ],
      learningDiagnosis: { ...emptyDiagnosis },
    },
  }
  const fill = createSpeechTranscriptSession()
  fill.ingest(speechEvent(0, [{ transcript: '김도영 92점', isFinal: true }]))
  dispatchVoiceSessionFinal(fill, {
    onApply: (text) => {
      Object.assign(
        drafts,
        applyDailyTestDrafts(drafts, text, students, presentExceptMinjae, DATE, 2).drafts,
      )
    },
    onSaveCommand: () => {},
  })
  assert.equal(drafts.doyoung.rounds.find((row) => row.round === 2)?.score, '92')
  assert.equal(drafts.doyoung.rounds.find((row) => row.round === 1)?.score, '')
  const save = createSpeechTranscriptSession()
  save.ingest(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  dispatchVoiceSessionFinal(save, {
    onApply: (text) => {
      Object.assign(
        drafts,
        applyDailyTestDrafts(drafts, text, students, presentExceptMinjae, DATE, 3).drafts,
      )
    },
    onSaveCommand: () => {},
  })
  assert.equal(drafts.doyoung.rounds.find((row) => row.round === 3)?.score, '')
}

// CASE L — STT unavailable still leaves manual save/input path
assert.equal(detectBrowserSpeechSupport(), 'unsupported')
assert.match(
  readFileSync('src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx', 'utf8'),
  /숙제 수행 결과 전체 저장/,
)
assert.match(
  readFileSync('src/components/todayReport/ClassAttendanceBulkPanel.tsx', 'utf8'),
  /전체 출결 저장/,
)
assert.match(
  readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8'),
  /텍스트/,
)

for (const [file, handler] of [
  ['src/components/todayReport/ClassAttendanceBulkPanel.tsx', 'handleSaveAll'],
  ['src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx', 'handleSaveAll'],
  ['src/components/todayReport/ClassMaterialPrepBulkPanel.tsx', 'handleSaveAll'],
  ['src/components/todayReport/ClassAttitudeBulkPanel.tsx', 'handleSaveAll'],
  ['src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'handleSaveAll'],
  ['src/components/todayReport/ClassCommonProgressPanel.tsx', 'handleSave'],
  ['src/components/todayReport/ClassCommonTodayAssignmentPanel.tsx', 'handleSave'],
] as const) {
  const source = readFileSync(file, 'utf8')
  assert.match(source, /onSaveCommand=\{\(\) => void handleSave/)
  assert.match(source, new RegExp(`if \\(saving`))
  assert.ok(source.includes(`onSaveCommand={() => void ${handler}()}`))
  assert.ok(source.includes(`onClick={() => void ${handler}()}`))
}

assert.match(
  readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8'),
  /routeVoiceTranscript/,
)
assert.doesNotMatch(
  readFileSync('src/utils/voiceInput/voiceSaveCommand.ts', 'utf8'),
  /from '@supabase/,
)

console.log('voiceInput.test.ts passed')
