/**
 * Voice V1.2 natural-language corpus.
 * 실행: npx tsx src/utils/voiceInput/voiceNaturalLanguage.corpus.test.ts
 */
import assert from 'node:assert/strict'
import {
  applyProgressSlotDraft,
  applyTodayAssignmentSlotDraft,
} from './applyVoiceDraft.ts'
import {
  parseAttendanceVoice,
  parseAttitudeVoice,
  parseDailyTestVoice,
  parseHomeworkVoice,
  parseMaterialVoice,
  parseSectionTextVoice,
} from './parseVoiceTranscript.ts'
import { createSpeechTranscriptSession } from './speechRecognition.ts'
import { isVoiceBulkSaveCommand, routeVoiceTranscript } from './voiceSaveCommand.ts'
import type { ClassAttitudeIssue, HomeworkStatus } from '../../types/records.ts'

const 강나경 = { id: 'nagyeong', name: '강나경' }
const 김민재 = { id: 'minjae', name: '김민재' }
const 이도현 = { id: 'dohyun', name: '이도현' }
const 김성민 = { id: 'seongmin', name: '김성민' }
const 김도영 = { id: 'doyoung', name: '김도영' }
const 류정현 = { id: 'ryu', name: '류정현' }
const 이민재 = { id: 'iminjae', name: '이민재' }
const roster = [강나경, 김민재, 이도현, 김성민, 김도영, 류정현]
const rosterWithSimilar = [...roster, 이민재]
const absentMinjae = new Set(['minjae'])
const noneAbsent = new Set<string>()

let attendanceCases = 0
let homeworkCases = 0
let materialCases = 0
let progressCases = 0
let dailyCases = 0
let attitudeCases = 0

function hw(transcript: string, absent = noneAbsent) {
  return parseHomeworkVoice(transcript, roster, absent)
}

function att(transcript: string) {
  return parseAttendanceVoice(transcript, roster)
}

function mat(transcript: string, absent = noneAbsent) {
  return parseMaterialVoice(transcript, roster, absent)
}

function attitude(transcript: string, absent = noneAbsent) {
  return parseAttitudeVoice(transcript, roster, absent)
}

function test(transcript: string, round: 1 | 2 | 3 | 4 | null = 2) {
  return parseDailyTestVoice(transcript, roster, noneAbsent, round)
}

function statusById<T extends { studentId: string }>(
  rows: T[],
): Map<string, T> {
  return new Map(rows.map((row) => [row.studentId, row]))
}

function expectHw(
  transcript: string,
  expected: Record<string, HomeworkStatus>,
  options: { review?: boolean; absent?: Set<string>; missing?: string[] } = {},
) {
  homeworkCases += 1
  const parsed = hw(transcript, options.absent ?? noneAbsent)
  const byId = statusById(parsed.assignments)
  for (const [id, status] of Object.entries(expected)) {
    assert.equal(byId.get(id)?.status, status, `${transcript} → ${id}`)
  }
  for (const id of options.missing ?? []) {
    assert.equal(byId.get(id), undefined, `${transcript} should not assign ${id}`)
  }
  if (options.review) assert.ok(parsed.needsReview.length > 0, `${transcript} review`)
}

function expectAtt(
  transcript: string,
  expected: Record<string, { status: string; excuse?: string | null }>,
  options: { review?: boolean } = {},
) {
  attendanceCases += 1
  const parsed = att(transcript)
  const byId = statusById(parsed.assignments)
  for (const [id, row] of Object.entries(expected)) {
    assert.equal(byId.get(id)?.status, row.status, `${transcript} → ${id} status`)
    if (row.excuse !== undefined) {
      assert.equal(byId.get(id)?.excuseKind ?? null, row.excuse, `${transcript} → ${id} excuse`)
    }
  }
  if (options.review) assert.ok(parsed.needsReview.length > 0, `${transcript} review`)
}

function expectMat(
  transcript: string,
  expected: Record<string, string>,
  options: { review?: boolean; absent?: Set<string> } = {},
) {
  materialCases += 1
  const parsed = mat(transcript, options.absent ?? noneAbsent)
  const byId = statusById(parsed.assignments)
  for (const [id, status] of Object.entries(expected)) {
    assert.equal(byId.get(id)?.status, status, `${transcript} → ${id}`)
  }
  if (options.review) assert.ok(parsed.needsReview.length > 0, `${transcript} review`)
}

function expectAttitude(
  transcript: string,
  expected: Record<string, ClassAttitudeIssue[]>,
  options: { review?: boolean } = {},
) {
  attitudeCases += 1
  const parsed = attitude(transcript)
  const byId = statusById(parsed.assignments)
  for (const [id, issues] of Object.entries(expected)) {
    assert.deepEqual(
      [...(byId.get(id)?.issues ?? [])].sort(),
      [...issues].sort(),
      `${transcript} → ${id}`,
    )
  }
  if (options.review) assert.ok(parsed.needsReview.length > 0, `${transcript} review`)
}

function expectDaily(
  transcript: string,
  expected: Record<string, { score?: string; calc?: number; concept?: number; app?: number }>,
  round: 1 | 2 | 3 | 4 = 2,
) {
  dailyCases += 1
  const parsed = test(transcript, round)
  const byId = statusById(parsed.assignments)
  for (const [id, row] of Object.entries(expected)) {
    const got = byId.get(id)
    assert.ok(got, `${transcript} missing ${id}`)
    assert.equal(got.round, round)
    if (row.score !== undefined) assert.equal(got.score, row.score, `${transcript} score`)
    if (row.calc !== undefined) assert.equal(got.calculationErrorDelta, row.calc)
    if (row.concept !== undefined) assert.equal(got.conceptLackDelta, row.concept)
    if (row.app !== undefined) assert.equal(got.applicationLackDelta, row.app)
  }
}

// ---------------------------------------------------------------------------
// 출결 20+
// ---------------------------------------------------------------------------
expectAtt('전원 출석', {
  nagyeong: { status: '출석' },
  minjae: { status: '출석' },
  dohyun: { status: '출석' },
})
expectAtt('모두 정상 출석', {
  nagyeong: { status: '출석' },
  seongmin: { status: '출석' },
})
expectAtt('전부 등원했어', {
  nagyeong: { status: '출석' },
  ryu: { status: '출석' },
})
expectAtt('다른 애들은 다 왔어', {
  nagyeong: { status: '출석' },
  doyoung: { status: '출석' },
})
expectAtt('강나경은 지각', { nagyeong: { status: '지각' } }, { review: true })
expectAtt('강나경이가 늦게 왔어', { nagyeong: { status: '지각' } }, { review: true })
expectAtt('강나경 지각했어', { nagyeong: { status: '지각' } }, { review: true })
expectAtt('김민재 안 왔어', { minjae: { status: '결석' } }, { review: true })
expectAtt('김민재 오늘 결석', { minjae: { status: '결석' } }, { review: true })
expectAtt('김민재 수업 안 왔어', { minjae: { status: '결석' } }, { review: true })
expectAtt('김민재 인정 결석', { minjae: { status: '결석', excuse: '인정' } })
expectAtt('김민재 무단결석', { minjae: { status: '결석', excuse: '무단' } })
expectAtt('김민재 무단 처리 결석', { minjae: { status: '결석', excuse: '무단' } })
expectAtt('김민재 병결', { minjae: { status: '결석' } }, { review: true })
expectAtt('강나경 지각, 김민재 무단 결석, 나머지 출석', {
  nagyeong: { status: '지각' },
  minjae: { status: '결석', excuse: '무단' },
  dohyun: { status: '출석' },
  seongmin: { status: '출석' },
}, { review: true })
expectAtt('강나경은 늦었고 김민재는 결석, 다른 애들은 다 왔어', {
  nagyeong: { status: '지각' },
  minjae: { status: '결석' },
  dohyun: { status: '출석' },
}, { review: true })
expectAtt('김민재만 결석이고 나머지는 정상 출석', {
  minjae: { status: '결석' },
  nagyeong: { status: '출석' },
}, { review: true })
expectAtt('김민재 무단 결석, 이도현 지각, 나머지 전원 출석', {
  minjae: { status: '결석', excuse: '무단' },
  dohyun: { status: '지각' },
  nagyeong: { status: '출석' },
}, { review: true })
expectAtt('강나경이랑 이도현은 출석', {
  nagyeong: { status: '출석' },
  dohyun: { status: '출석' },
})
expectAtt('자 그다음 전원 출석', {
  nagyeong: { status: '출석' },
  minjae: { status: '출석' },
})
expectAtt('홍길동 결석, 인정', {}, { review: true })
attendanceCases += 0

// ---------------------------------------------------------------------------
// 숙제 20+  including A–D
// ---------------------------------------------------------------------------
const othersComplete: Record<string, HomeworkStatus> = {
  nagyeong: '부분 완료',
  minjae: '완료',
  dohyun: '완료',
  seongmin: '완료',
  doyoung: '완료',
  ryu: '완료',
}

expectHw('강나경만 부분 완료, 나머지 모두 완료', othersComplete)
expectHw('강나경 부분 완료, 나머지는 다 완료', othersComplete) // A
expectHw('강나경은 부분 완료, 나머지는 다 완료', othersComplete)
expectHw('강나경 빼고 다 완료, 강나경은 부분 완료', othersComplete) // B
expectHw('강나경 제외하고 전원 완료, 강나경은 부분 완료', othersComplete)
expectHw('강나경만 덜 했고 나머지는 다 했어', othersComplete)
expectHw('강나경만 일부 했고 다른 애들은 다 했어', othersComplete)
expectHw('강나경 빼고 숙제 다 했어, 강나경은 부분 완료', othersComplete)
expectHw('전원 완료인데 강나경만 부분 완료', othersComplete) // C
expectHw('모두 완료, 강나경만 부분 완료', othersComplete)
expectHw('강나경이랑 김민재만 부분 완료, 나머지는 다 완료', {
  nagyeong: '부분 완료',
  minjae: '부분 완료',
  dohyun: '완료',
  seongmin: '완료',
}) // D
expectHw('강나경하고 김민재는 부분 완료, 나머지는 완료', {
  nagyeong: '부분 완료',
  minjae: '부분 완료',
  dohyun: '완료',
})
expectHw('강나경, 김민재 부분 완료, 나머지 완료', {
  nagyeong: '부분 완료',
  minjae: '부분 완료',
  ryu: '완료',
})
expectHw('강나경이랑 김민재랑 이도현은 완료', {
  nagyeong: '완료',
  minjae: '완료',
  dohyun: '완료',
}, { missing: ['seongmin'] })
expectHw('강나경 숙제는 부분완료', { nagyeong: '부분 완료' })
expectHw('강나경은 다 했어', { nagyeong: '완료' })
expectHw('강나경 100프로', { nagyeong: '완료' })
expectHw('강나경 백 프로', { nagyeong: '완료' })
expectHw('강나경 거의 다 했어', { nagyeong: '부분 완료' })
expectHw('강나경 숙제 애매해', {}, { review: true, missing: ['nagyeong'] }) // O
expectHw('민재 별로야', {}, { review: true, missing: ['minjae'] })
expectHw('전원 완료', {
  nagyeong: '완료',
  dohyun: '완료',
}, { absent: absentMinjae, missing: ['minjae'] })
expectHw('강나경 부분완료, 김민재도', {
  nagyeong: '부분 완료',
  minjae: '부분 완료',
})
expectHw('강나경 부분완료, 강나경 완료', { nagyeong: '완료' })
expectHw('홍길동만 부분완료, 나머지 완료', {
  minjae: '완료',
  nagyeong: '완료',
}, { review: true })

// ---------------------------------------------------------------------------
// 교재 15+
// ---------------------------------------------------------------------------
expectMat('전원 지참', { nagyeong: '지참', dohyun: '지참' })
expectMat('모두 교재 가져왔어', { nagyeong: '지참', seongmin: '지참' })
expectMat('강나경 책 가져왔어', { nagyeong: '지참' })
expectMat('강나경 준비했어', { nagyeong: '지참' })
expectMat('강나경 책 있음', { nagyeong: '지참' })
expectMat('강나경 일부만 가져왔어', { nagyeong: '부분 지참' })
expectMat('강나경 하나 빠졌어', { nagyeong: '부분 지참' })
expectMat('강나경 덜 가져왔어', { nagyeong: '부분 지참' })
expectMat('강나경 안 가져왔어', { nagyeong: '부분 지참' }, { review: true })
expectMat('강나경 깜빡했어', { nagyeong: '부분 지참' }, { review: true })
expectMat('강나경 교재 없음', { nagyeong: '부분 지참' }, { review: true })
expectMat('강나경만 미지참, 나머지 지참', {
  nagyeong: '부분 지참',
  minjae: '지참',
}, { review: true })
expectMat('성민 책 좀 부족', {}, { review: true })
expectMat('전원 지참', { nagyeong: '지참' }, { absent: absentMinjae })
assert.equal(mat('전원 지참', absentMinjae).assignments.some((row) => row.studentId === 'minjae'), false)
materialCases += 1
expectMat('강나경이랑 이도현은 지참', { nagyeong: '지참', dohyun: '지참' })

// ---------------------------------------------------------------------------
// 진도 / 오늘 과제 20+
// ---------------------------------------------------------------------------
function progressFill(transcript: string, slot: 1 | 2 | 3, subject: '수학' | '영어' = '수학') {
  progressCases += 1
  const drafts = {
    '수학:1': { currentProgress: '개념기존' },
    '수학:2': { currentProgress: '유형기존' },
    '영어:1': { currentProgress: '문법기존' },
    '영어:2': { currentProgress: '독해기존' },
    '영어:3': { currentProgress: '단어기존' },
  }
  const applied = applyProgressSlotDraft(drafts, transcript, subject, slot)
  return applied.drafts
}

function assignmentFill(transcript: string, slot: 1 | 2 | 3, subject: '수학' | '영어' = '수학') {
  progressCases += 1
  const drafts = {
    '수학:1': { todayAssignment: '개념과제기존' },
    '수학:2': { todayAssignment: '유형과제기존' },
    '영어:1': { todayAssignment: '문법과제기존' },
    '영어:2': { todayAssignment: '독해과제기존' },
    '영어:3': { todayAssignment: '단어과제기존' },
  }
  return applyTodayAssignmentSlotDraft(drafts, transcript, subject, slot).drafts
}

for (const phrase of [
  '72에서 76페이지',
  '72페이지부터 76페이지',
  '72페이지에서 76페이지까지',
  '76페이지까지',
  '오늘 76까지 했어',
  '76페이지까지 진행',
  '72부터 76까지',
]) {
  const drafts = progressFill(phrase, 1)
  assert.equal(drafts['수학:1']?.currentProgress, phrase)
  assert.equal(drafts['수학:2']?.currentProgress, '유형기존')
}

for (const phrase of [
  '120번에서 135번',
  '120번부터 135번까지',
  '135번까지',
  '문제 120에서 135',
  '120번부터 135번 풀었어',
]) {
  const drafts = progressFill(phrase, 2)
  assert.equal(drafts['수학:2']?.currentProgress, phrase)
  assert.equal(drafts['수학:1']?.currentProgress, '개념기존')
}

assert.equal(progressFill('관계대명사', 1, '영어')['영어:1']?.currentProgress, '관계대명사')
assert.equal(progressFill('관계대명사까지', 1, '영어')['영어:2']?.currentProgress, '독해기존')
assert.equal(progressFill('8강 3번부터 6번까지', 2, '영어')['영어:2']?.currentProgress, '8강 3번부터 6번까지')
assert.equal(progressFill('12과', 3, '영어')['영어:3']?.currentProgress, '12과')
assert.equal(progressFill('12과 단어', 3, '영어')['영어:1']?.currentProgress, '문법기존')

const asg = assignmentFill('77페이지에서 80페이지', 1)
assert.equal(asg['수학:1']?.todayAssignment, '77페이지에서 80페이지')
assert.equal(asg['수학:2']?.todayAssignment, '유형과제기존')
assert.equal(assignmentFill('관계대명사 문제', 1, '영어')['영어:1']?.todayAssignment, '관계대명사 문제')
assert.equal(assignmentFill('8강 7번부터 10번', 2, '영어')['영어:2']?.todayAssignment, '8강 7번부터 10번')
assert.equal(assignmentFill('13과 암기', 3, '영어')['영어:3']?.todayAssignment, '13과 암기')
assert.equal(parseSectionTextVoice('문제지 문제지').text, '문제지 문제지') // Q

// ---------------------------------------------------------------------------
// 일일테스트 20+
// ---------------------------------------------------------------------------
expectDaily('강나경 92점', { nagyeong: { score: '92' } })
expectDaily('강나경 92', { nagyeong: { score: '92' } })
expectDaily('강나경 점수 92', { nagyeong: { score: '92' } })
expectDaily('강나경 92점이야', { nagyeong: { score: '92' } })
expectDaily('강나경 92점 받았어', { nagyeong: { score: '92' } })
expectDaily('강나경 팔십오점', { nagyeong: { score: '85' } })
expectDaily('강나경 점수 팔십오 점', { nagyeong: { score: '85' } })
expectDaily('강나경 점수는 85', { nagyeong: { score: '85' } })
expectDaily('강나경 85 나왔어', { nagyeong: { score: '85' } })
expectDaily('강나경 78점 계산 실수', { nagyeong: { score: '78', calc: 1 } }) // K
expectDaily('강나경 78점이고 계산 실수', { nagyeong: { score: '78', calc: 1 } })
expectDaily('강나경 점수 78, 계산 실수', { nagyeong: { score: '78', calc: 1 } })
expectDaily('강나경 78점 계산에서 틀렸어', { nagyeong: { score: '78', calc: 1 } })
expectDaily('강나경 72점 개념 부족', { nagyeong: { score: '72', concept: 1 } })
expectDaily('김민재 65점 개념 부족하고 응용도 부족', {
  minjae: { score: '65', concept: 1, app: 1 },
}) // L
expectDaily('강나경 구십이점', { nagyeong: { score: '92' } })
expectDaily('강나경 연산 실수', { nagyeong: { calc: 1 } })
{
  dailyCases += 1
  const parsed = test('강나경 92점', 1)
  assert.equal(parsed.assignments[0]?.round, 1)
  const round2 = test('강나경 92점', 2)
  assert.equal(round2.assignments[0]?.round, 2)
}
{
  dailyCases += 1
  const parsed = parseDailyTestVoice('강나경 92점', roster, absentMinjae, 2)
  assert.ok(parsed.assignments.some((row) => row.studentId === 'nagyeong'))
  assert.equal(parseDailyTestVoice('김민재 80점', roster, absentMinjae, 2).assignments.length, 0)
}
{
  dailyCases += 1
  const parsed = test('강나경 140점')
  assert.ok(parsed.needsReview.length > 0)
  assert.equal(parsed.assignments.length, 0)
}

// ---------------------------------------------------------------------------
// 수업태도 20+
// ---------------------------------------------------------------------------
expectAttitude('전원 우수', { nagyeong: [], minjae: [], dohyun: [] })
expectAttitude('모두 문제 없음', { nagyeong: [], seongmin: [] })
expectAttitude('나머지는 이상 없음', { nagyeong: [] })
expectAttitude('강나경 졸음, 김민재 집중 저하, 나머지 우수', {
  nagyeong: ['졸음'],
  minjae: ['집중 저하'],
  dohyun: [],
  seongmin: [],
}) // F
expectAttitude('강나경 졸았고 김민재는 산만했어, 나머지는 문제없어', {
  nagyeong: ['졸음'],
  minjae: ['집중 저하'],
  dohyun: [],
})
expectAttitude('강나경 졸음하고 잡담', { nagyeong: ['졸음', '잡담'] }) // G
expectAttitude('강나경 졸음 집중 저하', { nagyeong: ['졸음', '집중 저하'] })
expectAttitude('강나경 졸았고 집중도 안 좋았어', { nagyeong: ['졸음', '집중 저하'] })
expectAttitude('강나경 집중 저하, 잡담, 태도 불량', {
  nagyeong: ['집중 저하', '잡담', '태도 불량'],
})
expectAttitude('강나경 떠들었어', { nagyeong: ['잡담'] })
expectAttitude('강나경 수업 방해', { nagyeong: ['수업방해'] })
expectAttitude('강나경 태도가 안 좋아', { nagyeong: ['태도 불량'] })
expectAttitude('강나경 집중 잘했어', { nagyeong: [] })
{
  attitudeCases += 1
  const parsed = attitude('강나경 안 졸았어') // H
  const issues = parsed.assignments.find((row) => row.studentId === 'nagyeong')?.issues ?? []
  assert.ok(!issues.includes('졸음'), '안 졸았어 must not create 졸음')
}
{
  attitudeCases += 1
  const parsed = attitude('강나경 잡담 안 했어') // I
  const issues = parsed.assignments.find((row) => row.studentId === 'nagyeong')?.issues ?? []
  assert.ok(!issues.includes('잡담'), '잡담 안 했어 must not create 잡담')
}
expectAttitude('강나경 집중 안 했어', { nagyeong: ['집중 저하'] }) // J
expectAttitude('강나경 집중 못했어', { nagyeong: ['집중 저하'] })
expectAttitude('강나경 졸음, 김민재도 졸았어', { nagyeong: ['졸음'], minjae: ['졸음'] })
expectAttitude('강나경 학생 졸음', { nagyeong: ['졸음'] })
{
  attitudeCases += 1
  const parsed = parseAttitudeVoice('오늘 좀 그랬어', roster, noneAbsent)
  assert.equal(parsed.assignments.length, 0)
}

// similar names: 민재 must not fuzzy-match
{
  homeworkCases += 1
  const parsed = parseHomeworkVoice('민재 완료', rosterWithSimilar, noneAbsent)
  assert.equal(parsed.assignments.length, 0)
}
{
  homeworkCases += 1
  const parsed = parseHomeworkVoice('김민재 완료', rosterWithSimilar, noneAbsent)
  assert.equal(parsed.assignments.find((row) => row.studentId === 'minjae')?.status, '완료')
  assert.equal(parsed.assignments.find((row) => row.studentId === 'iminjae'), undefined)
}

// 둘만 mismatch → review
{
  homeworkCases += 1
  const parsed = hw('강나경만 부분완료, 나머지는 완료')
  assert.equal(parsed.assignments.find((row) => row.studentId === 'nagyeong')?.status, '부분 완료')
}
{
  homeworkCases += 1
  const parsed = hw('강나경이랑 김민재 둘만 부분완료, 나머지 완료')
  assert.equal(parsed.assignments.find((row) => row.studentId === 'nagyeong')?.status, '부분 완료')
  assert.equal(parsed.assignments.find((row) => row.studentId === 'minjae')?.status, '부분 완료')
}
{
  homeworkCases += 1
  const parsed = hw('강나경 둘만 부분완료, 나머지 완료')
  assert.ok(parsed.needsReview.some((item) => item.reason.includes('인원')))
}

// PR #19 growing prefix
{
  const session = createSpeechTranscriptSession()
  session.ingest({
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: '문제지' } }],
  })
  session.ingest({
    resultIndex: 0,
    results: [
      { isFinal: true, 0: { transcript: '문제지' } },
      { isFinal: true, 0: { transcript: '문제지 43페이지까지' } },
    ],
  })
  assert.equal(session.consumeFinal().text, '문제지 43페이지까지')
}

// PR #20 save command
assert.equal(isVoiceBulkSaveCommand('일괄 저장'), true) // S
assert.equal(isVoiceBulkSaveCommand('일괄저장'), true)
assert.equal(routeVoiceTranscript('저장해줘').kind, 'form-fill') // T
assert.equal(isVoiceBulkSaveCommand('저장'), false)
assert.equal(isVoiceBulkSaveCommand('완료'), false)
assert.equal(isVoiceBulkSaveCommand('오케이'), false)

const total =
  attendanceCases + homeworkCases + materialCases + progressCases + dailyCases + attitudeCases
assert.ok(total >= 100, `corpus too small: ${total}`)
assert.ok(attendanceCases >= 20, `attendance ${attendanceCases}`)
assert.ok(homeworkCases >= 20, `homework ${homeworkCases}`)
assert.ok(materialCases >= 15, `material ${materialCases}`)
assert.ok(progressCases >= 20, `progress ${progressCases}`)
assert.ok(dailyCases >= 20, `daily ${dailyCases}`)
assert.ok(attitudeCases >= 20, `attitude ${attitudeCases}`)

console.log(
  `voiceNaturalLanguage.corpus.test.ts passed (${total} cases: att ${attendanceCases} hw ${homeworkCases} mat ${materialCases} prog ${progressCases} daily ${dailyCases} attit ${attitudeCases})`,
)
