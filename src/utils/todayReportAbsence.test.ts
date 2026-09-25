/**
 * 실행: node --experimental-strip-types src/utils/todayReportAbsence.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AttendanceRecord } from '../types/records.ts'
import { computeLearningRisk } from './studentCare/risk.ts'
import { isUnexcusedAbsent } from './studentCare/scoring.ts'
import {
  ABSENT_FOLLOW_ON_LABEL,
  isAbsentAttendanceStatus,
  isFollowOnInputRequired,
  isStudentAbsentOnDate,
  missingRequiredMaterialPrep,
  partitionFollowOnStudents,
  selectAttitudeBulkSaveTargets,
} from './todayReportAbsence.ts'

const DATE = '2026-09-14'

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

const 김도영 = { id: 'doyoung', name: '김도영' }
const 김민재 = { id: 'minjae', name: '김민재' }
const 김성민 = { id: 'seongmin', name: '김성민' }
const 류정현 = { id: 'ryu', name: '류정현' }
const students = [김도영, 김민재, 김성민, 류정현]

assert.equal(isAbsentAttendanceStatus('결석'), true)
assert.equal(isAbsentAttendanceStatus('출석'), false)
assert.equal(isAbsentAttendanceStatus('지각'), false)
assert.equal(isAbsentAttendanceStatus('조퇴'), false)
assert.equal(isAbsentAttendanceStatus(''), false)

const savedAbsent = [attendance('minjae', '결석', '무단'), attendance('doyoung', '출석')]
assert.equal(isStudentAbsentOnDate(savedAbsent, 'minjae', DATE), true)
assert.equal(isFollowOnInputRequired(savedAbsent, 'minjae', DATE), false)
assert.equal(isFollowOnInputRequired(savedAbsent, 'doyoung', DATE), true)

// CASE A — 교재 준비: 결석 학생 미선택이어도 일괄저장 검증 통과
const materialDrafts = {
  doyoung: { materialPrep: '지참' as const },
  seongmin: { materialPrep: '지참' as const },
}
const caseAAttendance = [
  attendance('doyoung', '출석'),
  attendance('minjae', '결석', '무단'),
  attendance('seongmin', '출석'),
]
assert.deepEqual(
  missingRequiredMaterialPrep(
    [김도영, 김민재, 김성민],
    caseAAttendance,
    DATE,
    materialDrafts,
  ).map((s) => s.name),
  [],
)
assert.deepEqual(
  missingRequiredMaterialPrep(
    [김도영, 김민재, 김성민],
    caseAAttendance,
    DATE,
    { doyoung: { materialPrep: '지참' } },
  ).map((s) => s.name),
  ['김성민'],
)

// CASE B — 숙제: 결석 학생은 필수 대상에서 제외
const caseB = partitionFollowOnStudents([김도영, 김민재, 김성민], caseAAttendance, DATE)
assert.deepEqual(caseB.excluded.map((s) => s.name), ['김민재'])
assert.deepEqual(caseB.required.map((s) => s.name), ['김도영', '김성민'])

// CASE C — 일일테스트: 결석 학생은 필수 대상이 아님 (동일 partition)
assert.equal(isFollowOnInputRequired(caseAAttendance, 'minjae', DATE), false)

// CASE D — 수업태도 일괄 저장: 결석 제외, 가짜 우수 payload 없음
const attitudeTargets = selectAttitudeBulkSaveTargets(
  students,
  [
    attendance('doyoung', '출석'),
    attendance('minjae', '결석', '인정'),
    attendance('seongmin', '출석'),
    attendance('ryu', '지각', '인정'),
  ],
  DATE,
  {
    doyoung: { issues: [], note: '' },
    minjae: { issues: ['졸음'], note: '결석인데 선택됨 — 저장하면 안 됨' },
    seongmin: { issues: ['졸음', '집중 저하'], note: '수업 중 확인' },
    ryu: { issues: [], note: '' },
  },
)
assert.deepEqual(
  attitudeTargets.map((t) => t.student.name),
  ['김도영', '김성민', '류정현'],
)
assert.deepEqual(
  attitudeTargets.find((t) => t.student.id === 'doyoung'),
  { student: 김도영, attitudeIssues: [], attitudeNote: '' },
)
assert.deepEqual(
  attitudeTargets.find((t) => t.student.id === 'seongmin'),
  {
    student: 김성민,
    attitudeIssues: ['졸음', '집중 저하'],
    attitudeNote: '수업 중 확인',
  },
)
assert.deepEqual(
  attitudeTargets.find((t) => t.student.id === 'ryu'),
  { student: 류정현, attitudeIssues: [], attitudeNote: '' },
)
assert.equal(
  attitudeTargets.some((t) => t.student.id === 'minjae'),
  false,
)

const noteOnlyTargets = selectAttitudeBulkSaveTargets(
  [김도영, 김민재],
  [attendance('doyoung', '출석'), attendance('minjae', '결석', '인정')],
  DATE,
  {
    doyoung: { issues: [], note: '오늘 집중력이 좋았다' },
    minjae: { issues: ['졸음'], note: '결석 의견은 저장하면 안 됨' },
  },
)
assert.deepEqual(noteOnlyTargets, [
  { student: 김도영, attitudeIssues: [], attitudeNote: '오늘 집중력이 좋았다' },
])

// CASE E — 결석 → 출석 수정 후 다시 후속 입력 대상
const afterPresent = [attendance('minjae', '출석')]
assert.equal(isFollowOnInputRequired(afterPresent, 'minjae', DATE), true)
assert.deepEqual(
  missingRequiredMaterialPrep([김민재], afterPresent, DATE, {}).map((s) => s.name),
  ['김민재'],
)

const backToAbsent = [attendance('minjae', '결석', '무단')]
assert.equal(isFollowOnInputRequired(backToAbsent, 'minjae', DATE), false)
assert.deepEqual(missingRequiredMaterialPrep([김민재], backToAbsent, DATE, {}), [])

// CASE F — 무단결석: 후속 입력 제외, 즉시 위험 유지
const unexcused = attendance('minjae', '결석', '무단')
assert.equal(isStudentAbsentOnDate([unexcused], 'minjae', DATE), true)
assert.equal(isUnexcusedAbsent(unexcused), true)
const unexcusedRisk = computeLearningRisk({
  studentId: 'minjae',
  attendance: [unexcused],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
  progressRecords: [],
  classNotes: [],
})
assert.equal(unexcusedRisk.unexcusedAbsent, true)
assert.equal(unexcusedRisk.level, '위험')

const excused = attendance('minjae', '결석', '인정')
assert.equal(isStudentAbsentOnDate([excused], 'minjae', DATE), true)
assert.equal(isUnexcusedAbsent(excused), false)

assert.equal(ABSENT_FOLLOW_ON_LABEL, '결석 · 입력 제외')
assert.match(
  readFileSync('src/components/todayReport/AbsentFollowOnBadge.tsx', 'utf8'),
  /ABSENT_FOLLOW_ON_LABEL/,
)

const diagnosisFields = readFileSync('src/components/diagnosis/DailyLearningDiagnosisFields.tsx', 'utf8')
assert.doesNotMatch(diagnosisFields, /격주간 오답 재시험/)
assert.doesNotMatch(diagnosisFields, /재시험 오답 수/)
assert.match(diagnosisFields, /강사의 피드백/)
assert.match(diagnosisFields, /오답 분석/)

const parentDiagnosis = readFileSync('src/components/dailytest/ParentDailyTestDiagnosisBlock.tsx', 'utf8')
assert.doesNotMatch(parentDiagnosis, /격주간 오답 재시험/)
assert.doesNotMatch(parentDiagnosis, /재시험 오답 수/)
assert.match(parentDiagnosis, /오답 분석/)
assert.match(parentDiagnosis, /강사 피드백/)

const attitudePanel = readFileSync('src/components/todayReport/ClassAttitudeBulkPanel.tsx', 'utf8')
assert.match(attitudePanel, /수업태도 일괄 저장/)
assert.match(attitudePanel, /StudentFollowOnRowHeader/)
assert.match(attitudePanel, /selectAttitudeBulkSaveTargets/)
assert.match(attitudePanel, /StudentKakaoShareAction/)
assert.match(attitudePanel, /applyStudentAttitudeDraft/)
assert.match(attitudePanel, /강사의 의견/)
assert.match(attitudePanel, /data-attitude-comment/)
assert.doesNotMatch(attitudePanel, /from '@supabase/)

const materialPanel = readFileSync('src/components/todayReport/ClassMaterialPrepBulkPanel.tsx', 'utf8')
assert.match(materialPanel, /missingRequiredMaterialPrep/)
assert.match(materialPanel, /StudentFollowOnRowHeader/)

const homeworkPanel = readFileSync('src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx', 'utf8')
assert.match(homeworkPanel, /isFollowOnInputRequired/)
assert.match(homeworkPanel, /StudentFollowOnRowHeader/)

const dailyPanel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(dailyPanel, /isFollowOnInputRequired/)
assert.match(dailyPanel, /StudentFollowOnRowHeader/)

const kakaoLib = readFileSync('src/lib/kakao.ts', 'utf8')
assert.match(kakaoLib, /shareStudentCareToKakao/)
assert.match(kakaoLib, /Kakao!\.Share\.sendDefault/)
assert.match(kakaoLib, /getStudentCareUrl/)

console.log('todayReportAbsence OK')
