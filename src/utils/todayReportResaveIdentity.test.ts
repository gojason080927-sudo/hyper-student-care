/**
 * 실행: npx tsx src/utils/todayReportResaveIdentity.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { overlayLoadedDrafts } from './todayReportDraftMerge.ts'
import {
  findByIdOrNaturalKey,
  mergeDailyCareWrite,
  normalizeRecordId,
  resolvePersistedRecordId,
} from './todayReportResaveIdentity.ts'
import { applyHomeworkDrafts, homeworkDraftKey } from './voiceInput/applyVoiceDraft.ts'
import type { AttendanceRecord } from '../types/records.ts'

const DATE = '2026-09-14'
const 강나경 = { id: 'nagyeong', name: '강나경' }
const 김도영 = { id: 'doyoung', name: '김도영' }
const students = [강나경, 김도영]
const attendance: AttendanceRecord[] = [
  {
    id: 'a-nagyeong',
    studentId: 'nagyeong',
    date: DATE,
    status: '출석',
    reason: '',
    memo: '',
    excuseKind: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'a-doyoung',
    studentId: 'doyoung',
    date: DATE,
    status: '출석',
    reason: '',
    memo: '',
    excuseKind: null,
    createdAt: '',
    updatedAt: '',
  },
]

assert.equal(normalizeRecordId(''), undefined)
assert.equal(normalizeRecordId('   '), undefined)
assert.equal(normalizeRecordId(undefined), undefined)
assert.equal(normalizeRecordId('row-1'), 'row-1')

const rows = [
  { id: 'att-1', studentId: 'nagyeong', date: DATE },
  { id: 'att-2', studentId: 'doyoung', date: DATE },
]

const byNatural = findByIdOrNaturalKey(rows, '', (row) => row.studentId === 'nagyeong' && row.date === DATE)
assert.equal(byNatural?.id, 'att-1')

const missingIdStillFinds = findByIdOrNaturalKey(
  rows,
  undefined,
  (row) => row.studentId === 'doyoung' && row.date === DATE,
)
assert.equal(missingIdStillFinds?.id, 'att-2')

let created = 0
assert.equal(resolvePersistedRecordId('', 'att-1', () => `new-${++created}`), 'att-1')
assert.equal(resolvePersistedRecordId(undefined, 'att-1', () => `new-${++created}`), 'att-1')
assert.equal(resolvePersistedRecordId('fresh', undefined, () => `new-${++created}`), 'fresh')
assert.equal(resolvePersistedRecordId('', undefined, () => `new-${++created}`), 'new-1')
assert.equal(created, 1)

const existingCare = {
  materialPrep: '지참' as const,
  attitudeIssues: ['잡담'] as const,
  attitudeNote: '수업 중 잡담',
}

const materialOnly = mergeDailyCareWrite({ materialPrep: '부분 지참' }, existingCare)
assert.equal(materialOnly.materialPrep, '부분 지참')
assert.deepEqual(materialOnly.attitudeIssues, ['잡담'])
assert.equal(materialOnly.attitudeNote, '수업 중 잡담')

const attitudeOnly = mergeDailyCareWrite(
  { attitudeIssues: [], attitudeNote: '' },
  existingCare,
)
assert.equal(attitudeOnly.materialPrep, '지참')
assert.deepEqual(attitudeOnly.attitudeIssues, [])
assert.equal(attitudeOnly.attitudeNote, '')

const explicitWipe = mergeDailyCareWrite(
  { materialPrep: '부분 지참', attitudeIssues: [], attitudeNote: '' },
  existingCare,
)
assert.equal(explicitWipe.materialPrep, '부분 지참')
assert.deepEqual(explicitWipe.attitudeIssues, [])

// Same-day homework: 강나경 부분완료 저장 → 음성 “강나경 완료” → reload must keep 완료
const nagyeongKey = homeworkDraftKey('nagyeong', '수학', 1)
const doyoungKey = homeworkDraftKey('doyoung', '수학', 1)
const savedDrafts = {
  [nagyeongKey]: { status: '부분 완료' as const, entryId: 'hw-nagyeong' },
  [doyoungKey]: { status: '완료' as const, entryId: 'hw-doyoung' },
}
const edited = applyHomeworkDrafts(
  savedDrafts,
  '강나경 완료',
  students,
  attendance,
  DATE,
  '수학',
  1,
)
assert.equal(edited.drafts[nagyeongKey]?.status, '완료')
assert.equal(edited.drafts[doyoungKey]?.status, '완료')
assert.equal(edited.drafts[nagyeongKey]?.entryId, 'hw-nagyeong')
assert.equal(edited.drafts[doyoungKey]?.entryId, 'hw-doyoung')
assert.deepEqual(edited.dirtyKeys, [nagyeongKey])

const reloadedFromServer = {
  [nagyeongKey]: { status: '부분 완료' as const, entryId: 'hw-nagyeong' },
  [doyoungKey]: { status: '완료' as const, entryId: 'hw-doyoung' },
}
const afterReload = overlayLoadedDrafts(
  edited.drafts,
  reloadedFromServer,
  new Set(edited.dirtyKeys),
  (local, loaded) => ({
    ...(loaded ?? local),
    status: local.status,
  }),
)
assert.equal(afterReload[nagyeongKey]?.status, '완료')
assert.equal(afterReload[doyoungKey]?.status, '완료')
assert.equal(afterReload[nagyeongKey]?.entryId, 'hw-nagyeong')

const attendanceDirty = overlayLoadedDrafts(
  { nagyeong: { status: '출석', recordId: 'old' } },
  { nagyeong: { status: '결석', recordId: 'att-1' }, doyoung: { status: '출석', recordId: 'att-2' } },
  new Set(['nagyeong']),
  (local, loaded) => ({
    ...local,
    recordId: loaded?.recordId ?? local.recordId,
  }),
)
assert.equal(attendanceDirty.nagyeong.status, '출석')
assert.equal(attendanceDirty.nagyeong.recordId, 'att-1')
assert.equal(attendanceDirty.doyoung.status, '출석')

for (const file of [
  'src/components/todayReport/ClassAttendanceBulkPanel.tsx',
  'src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx',
  'src/components/todayReport/ClassMaterialPrepBulkPanel.tsx',
  'src/components/todayReport/ClassAttitudeBulkPanel.tsx',
  'src/components/todayReport/ClassDailyTestBulkPanel.tsx',
  'src/components/todayReport/ClassCommonProgressPanel.tsx',
  'src/components/todayReport/ClassCommonTodayAssignmentPanel.tsx',
]) {
  const source = readFileSync(file, 'utf8')
  assert.match(source, /disabled=\{saving\}/)
  assert.doesNotMatch(source, /disabled=\{saving \|\| .*saved/)
  assert.match(source, /onSaveCommand=\{\(\) => void handleSave/)
}

const homeworkSource = readFileSync(
  'src/components/todayReport/ClassHomeworkStatusBulkPanel.tsx',
  'utf8',
)
assert.match(homeworkSource, /dirtyStatusKeysRef/)
assert.match(homeworkSource, /saveHomeworkTextbookEntryAsync/)

const materialSource = readFileSync(
  'src/components/todayReport/ClassMaterialPrepBulkPanel.tsx',
  'utf8',
)
const materialSaveAt = materialSource.lastIndexOf('saveStudentDailyCareRecordAsync(')
assert.ok(materialSaveAt >= 0)
const materialSave = materialSource.slice(materialSaveAt, materialSaveAt + 320)
assert.match(materialSave, /materialPrep: current\.materialPrep/)
assert.doesNotMatch(materialSave, /attitudeIssues/)
assert.doesNotMatch(materialSave, /attitudeNote/)

const attitudeSource = readFileSync(
  'src/components/todayReport/ClassAttitudeBulkPanel.tsx',
  'utf8',
)
assert.match(attitudeSource, /attitudeIssues,/)
assert.doesNotMatch(attitudeSource, /materialPrep:/)

const voiceApply = readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8')
assert.doesNotMatch(voiceApply, /saveStudentDailyCare/)
assert.doesNotMatch(voiceApply, /upsertAttendance/)

console.log('todayReportResaveIdentity.test.ts passed')
