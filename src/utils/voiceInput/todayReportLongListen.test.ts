/**
 * Today Report long-listen: every section shares daily-test holdUntilExplicitStop.
 * Does not claim physical-device success.
 * 실행: npx tsx src/utils/voiceInput/todayReportLongListen.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AttendanceRecord } from '../../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../learningDiagnosis.ts'
import { isVoiceBulkSaveCommand, routeVoiceTranscript } from './voiceSaveCommand.ts'
import {
  applyAttendanceDrafts,
  applyAttitudeDrafts,
  applyHomeworkDrafts,
  applyMaterialDrafts,
  applyProgressSlotDraft,
  applyStudentAttitudeDraft,
  applyStudentDailyTestDraft,
  applyTodayAssignmentSlotDraft,
  homeworkDraftKey,
} from './applyVoiceDraft.ts'
import {
  HELD_SPEECH_RESTART_RETRY_MS,
  startKoreanSpeechRecognition,
  type SpeechRecognitionResultEventLike,
} from './speechRecognition.ts'

const DATE = '2026-09-15'
const 김도영 = { id: 'doyoung', name: '김도영' }
const 김민재 = { id: 'minjae', name: '김민재' }
const 김성민 = { id: 'seongmin', name: '김성민' }
const 류정현 = { id: 'ryu', name: '류정현' }
const roster = [김도영, 김민재, 김성민, 류정현]

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

const present = [
  attendance('doyoung', '출석'),
  attendance('minjae', '출석'),
  attendance('seongmin', '출석'),
  attendance('ryu', '출석'),
]

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

function namedError(name: string) {
  const err = new Error(name)
  err.name = name
  return err
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

  emitError(code: string) {
    this.onerror?.({ error: code })
  }
}

function holdSession(options?: { throwOnStart?: Error | null; throwAfterStarts?: number }) {
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
    errors,
    ended: () => ended,
    queued,
    flush() {
      const next = queued.shift()
      next?.fn()
    },
  }
}

const PANELS = [
  'src/components/todayReport/ClassAttendanceBulkPanel.tsx',
  'src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx',
  'src/components/todayReport/ClassMaterialPrepBulkPanel.tsx',
  'src/components/todayReport/ClassCommonProgressPanel.tsx',
  'src/components/todayReport/ClassCommonTodayAssignmentPanel.tsx',
  'src/components/todayReport/ClassAttitudeBulkPanel.tsx',
  'src/components/todayReport/ClassDailyTestBulkPanel.tsx',
] as const

const ui = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(ui, /explicitStop = true/)
assert.match(ui, /holdUntilExplicitStop: true/)
assert.doesNotMatch(ui, /holdUntilExplicitStop: explicitStop/)
assert.match(ui, /data-hold-until-stop/)
assert.doesNotMatch(ui, /from '@supabase/)
assert.doesNotMatch(readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8'), /Whisper|OpenAI|Azure|CLOVA/)

for (const file of PANELS) {
  const source = readFileSync(file, 'utf8')
  assert.match(source, /SectionVoiceInput/)
  assert.match(source, /explicitStop/)
  assert.doesNotMatch(source, /from '@supabase/)
}

type SectionCase = {
  name: string
  full: string
  prefix: string
  rest: string
  apply: (text: string) => void
}

function emptyDailyDraft() {
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

const sections: SectionCase[] = [
  {
    name: 'attendance',
    full: '김민재 제외 전원 출석. 김민재 결석, 인정.',
    prefix: '김민재 제외 전원 출석.',
    rest: '김민재 결석, 인정.',
    apply: (text) => {
      const drafts = {
        doyoung: { status: '', excuseKind: null as const, reason: '' },
        minjae: { status: '', excuseKind: null as const, reason: '' },
        seongmin: { status: '', excuseKind: null as const, reason: '' },
        ryu: { status: '', excuseKind: null as const, reason: '' },
      }
      const applied = applyAttendanceDrafts(drafts, text, roster)
      assert.equal(applied.drafts.doyoung?.status, '출석')
      assert.equal(applied.drafts.seongmin?.status, '출석')
      if (text.includes('결석')) {
        assert.equal(applied.drafts.minjae?.status, '결석')
        assert.equal(applied.drafts.minjae?.excuseKind, '인정')
      }
    },
  },
  {
    name: 'homework',
    full: '숙제 전원 완료. 김성민만 부분완료.',
    prefix: '숙제 전원 완료.',
    rest: '김성민만 부분완료.',
    apply: (text) => {
      const keyD = homeworkDraftKey('doyoung', '수학', 1)
      const keyS = homeworkDraftKey('seongmin', '수학', 1)
      const keyM = homeworkDraftKey('minjae', '수학', 1)
      const applied = applyHomeworkDrafts(
        {
          [keyD]: { status: '' as const },
          [keyS]: { status: '' as const },
          [keyM]: { status: '' as const },
        },
        text,
        roster,
        present,
        DATE,
        '수학',
        1,
      )
      assert.equal(applied.drafts[keyD]?.status, '완료')
      if (text.includes('부분')) {
        assert.equal(applied.drafts[keyS]?.status, '부분 완료')
      }
      assert.equal(applied.drafts[keyM]?.status, '완료')
    },
  },
  {
    name: 'material',
    full: '교재 전원 지참. 류정현만 미지참.',
    prefix: '교재 전원 지참.',
    rest: '류정현만 미지참.',
    apply: (text) => {
      const applied = applyMaterialDrafts(
        {
          doyoung: { materialPrep: null },
          minjae: { materialPrep: null },
          seongmin: { materialPrep: null },
          ryu: { materialPrep: null },
        },
        text,
        roster,
        present,
        DATE,
        (_student, prev, status) => ({ ...(prev ?? { materialPrep: null }), materialPrep: status }),
      )
      assert.equal(applied.drafts.doyoung?.materialPrep, '지참')
      if (text.includes('미지참')) {
        assert.equal(applied.drafts.ryu?.materialPrep, '부분 지참')
      }
    },
  },
  {
    name: 'progress',
    full: '현재 진도 이차함수 최대최소 현재 페이지 35 전체 페이지 180',
    prefix: '현재 진도 이차함수 최대최소',
    rest: '현재 페이지 35 전체 페이지 180',
    apply: (text) => {
      const drafts = {
        '수학:1': { currentProgress: '개념 기존', currentPage: '10', totalPage: '100' },
        '수학:2': { currentProgress: '유형 기존', currentPage: '20', totalPage: '200' },
      }
      const applied = applyProgressSlotDraft(drafts, text, '수학', 1)
      if (text.includes('이차함수 최대최소')) {
        assert.match(applied.drafts['수학:1']?.currentProgress ?? '', /이차함수 최대최소/)
      }
      if (text.includes('35')) {
        assert.equal(applied.drafts['수학:1']?.currentPage, '35')
        assert.equal(applied.drafts['수학:1']?.totalPage, '180')
      }
      assert.equal(applied.drafts['수학:2']?.currentProgress, '유형 기존')
      assert.equal(applied.drafts['수학:2']?.currentPage, '20')
    },
  },
  {
    name: 'assignment',
    full: '77페이지에서 80페이지',
    prefix: '77페이지에서',
    rest: '80페이지',
    apply: (text) => {
      const drafts = {
        '수학:1': { todayAssignment: '개념과제기존' },
        '수학:2': { todayAssignment: '유형과제기존' },
      }
      const applied = applyTodayAssignmentSlotDraft(drafts, text, '수학', 1)
      assert.equal(applied.drafts['수학:1']?.todayAssignment, text)
      assert.equal(applied.drafts['수학:2']?.todayAssignment, '유형과제기존')
    },
  },
  {
    name: 'attitude',
    full: '집중 저하 강사의 의견 오늘 후반부 집중력이 조금 떨어졌지만 질문에는 적극적으로 대답했다',
    prefix: '집중 저하 강사의 의견',
    rest: '오늘 후반부 집중력이 조금 떨어졌지만 질문에는 적극적으로 대답했다',
    apply: (text) => {
      const drafts = {
        doyoung: { issues: [] as Array<'집중 저하'>, note: '기존' },
        ryu: { issues: [] as Array<'집중 저하'>, note: '기존' },
      }
      const applied = applyStudentAttitudeDraft(drafts, text, 김도영, roster, present, DATE)
      if (text.includes('집중 저하')) {
        assert.deepEqual(applied.drafts.doyoung?.issues, ['집중 저하'])
      }
      if (text.includes('후반부')) {
        assert.equal(
          applied.drafts.doyoung?.note,
          '오늘 후반부 집중력이 조금 떨어졌지만 질문에는 적극적으로 대답했다',
        )
      }
      assert.equal(applied.drafts.ryu?.note, '기존')
    },
  },
  {
    name: 'daily-test',
    full: '1차 70점 불합격 개념 부족 2개 계산 실수 1개 피드백 계산 과정은 좋아지고 있다',
    prefix: '1차 70점 불합격 개념 부족 2개',
    rest: '계산 실수 1개 피드백 계산 과정은 좋아지고 있다',
    apply: (text) => {
      const drafts = {
        doyoung: emptyDailyDraft(),
        ryu: emptyDailyDraft(),
      }
      const applied = applyStudentDailyTestDraft(drafts, text, 김도영, roster, present, DATE)
      if (applied.drafts.doyoung?.rounds[0]?.score) {
        assert.equal(applied.drafts.doyoung.rounds[0].score, '70')
      }
      assert.equal(applied.drafts.ryu?.rounds[0]?.score, '')
    },
  },
]

function runPattern(section: SectionCase, pattern: number) {
  const retry = pattern === 7
  const run = holdSession(
    retry
      ? { throwOnStart: namedError('InvalidStateError'), throwAfterStarts: 1 }
      : undefined,
  )
  const rec = run.rec()
  assert.ok(rec)
  assert.equal(rec.continuous, true)
  assert.equal(rec.interimResults, true)

  if (pattern === 0) {
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: true }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 1) {
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: false }]))
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: false }]))
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: true }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 2) {
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: true }]))
    rec.emitEnd()
    rec.emitResult(speechEvent(0, [{ transcript: section.rest, isFinal: true }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 3) {
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: true }]))
    rec.emitEnd()
    rec.emitResult(speechEvent(0, [{ transcript: section.rest, isFinal: true }]))
    rec.emitEnd()
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 4) {
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: false }]))
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: true }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 5) {
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: true }]))
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: false }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  } else if (pattern === 6) {
    rec.emitResult(speechEvent(0, [{ transcript: section.full, isFinal: true }]))
    run.session?.stop()
    rec.emitEnd()
  } else {
    rec.emitResult(speechEvent(0, [{ transcript: section.prefix, isFinal: false }]))
    rec.emitEnd()
    assert.equal(run.queued[0]?.ms, HELD_SPEECH_RESTART_RETRY_MS)
    run.flush()
    rec.emitResult(speechEvent(0, [{ transcript: section.rest, isFinal: true }]))
    assert.equal(run.finals.length, 0)
    run.session?.stop()
  }

  assert.equal(run.finals.length, 1, `${section.name} pattern ${pattern} apply count`)
  const text = run.finals[0] ?? ''
  assert.match(text, new RegExp(section.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  section.apply(text)
  assert.equal(isVoiceBulkSaveCommand(text), false)
  assert.equal(routeVoiceTranscript(text).kind, 'form-fill')
  rec.emitEnd()
  assert.equal(run.finals.length, 1)
}

let sequences = 0
for (let round = 0; round < 50; round += 1) {
  for (const section of sections) {
    runPattern(section, round % 8)
    sequences += 1
  }
}
assert.ok(sequences >= 300, `stress too small: ${sequences}`)

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '일괄 저장', isFinal: true }]))
  assert.equal(run.finals.length, 0)
  run.session?.stop()
  assert.equal(run.finals[0], '일괄 저장')
  assert.equal(isVoiceBulkSaveCommand(run.finals[0] ?? ''), true)
  assert.equal(isVoiceBulkSaveCommand('저장'), false)
  assert.equal(isVoiceBulkSaveCommand('완료'), false)
}

{
  const run = holdSession()
  run.rec()?.emitResult(speechEvent(0, [{ transcript: '문제지 문제지', isFinal: true }]))
  run.session?.stop()
  assert.equal(run.finals[0], '문제지 문제지')
}

{
  const run = holdSession()
  run.rec()?.emitError('not-allowed')
  assert.ok(run.errors.some((row) => row.code === 'not-allowed'))
  assert.equal(run.finals.length, 0)
}

{
  const drafts = {
    doyoung: { issues: [] as Array<'졸음'>, note: '' },
    ryu: { issues: [] as Array<'졸음'>, note: '도영만' },
  }
  const applied = applyAttitudeDrafts(
    drafts,
    '전원 우수',
    roster,
    present,
    DATE,
  )
  assert.deepEqual(applied.drafts.doyoung?.issues, [])
}

{
  const run = holdSession()
  run.rec()?.emitResult(
    speechEvent(0, [
      {
        transcript:
          '1차 70점 불합격 개념 부족 2개 계산 실수 1개 피드백 계산 과정은 좋아지고 있다',
        isFinal: true,
      },
    ]),
  )
  assert.equal(run.finals.length, 0)
  run.session?.stop()
  const drafts = { doyoung: emptyDailyDraft(), ryu: emptyDailyDraft() }
  const applied = applyStudentDailyTestDraft(
    drafts,
    run.finals[0] ?? '',
    김도영,
    roster,
    present,
    DATE,
  )
  assert.equal(applied.drafts.doyoung?.rounds[0]?.score, '70')
  assert.equal(applied.drafts.doyoung?.learningDiagnosis.conceptLackCount, 2)
  assert.equal(applied.drafts.doyoung?.learningDiagnosis.calculationErrorCount, 1)
  assert.equal(
    applied.drafts.doyoung?.learningDiagnosis.teacherFeedback,
    '계산 과정은 좋아지고 있다',
  )
}

console.log(`todayReportLongListen.test.ts passed (${sequences} sequences)`)
