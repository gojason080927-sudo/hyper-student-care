/**
 * 실행: npx tsx src/lib/hubFromTodayReport.test.ts
 *
 * Today Report 반 공통 과제 → Student Hub class_hub_assignments 매핑.
 * Parent RPC · weekly 산식 · Hub SQL 읽기 경로 · Push는 변경하지 않는다.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ClassTodayReportCommon } from '../types/records.ts'
import {
  HUB_FROM_TODAY_REPORT_NAMESPACE,
  hubAssignmentFromTodayReportCommon,
  hubAssignmentIdFromTodayReport,
  hubAssignmentSubjectLabel,
  hubFromTodayReportName,
  syncHubAssignmentsFromTodayReport,
  uuidV5,
} from './hubFromTodayReport.ts'

const useData = readFileSync('src/hooks/useData.tsx', 'utf8')
const hubSql = readFileSync('supabase/student-learning-hub-v1-migration.sql', 'utf8')
const followupSql = readFileSync('supabase/student-hub-followup-v1-migration.sql', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
const scoring = readFileSync('src/utils/studentCare/constants.ts', 'utf8')
const weeklySummary = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
const assignmentPanel = readFileSync(
  'src/components/todayReport/ClassCommonTodayAssignmentPanel.tsx',
  'utf8',
)

assert.equal(
  await uuidV5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com'),
  '2ed6657d-e927-568b-95e1-2665a8aea6a2',
)

const key = {
  reportDate: '2026-09-18',
  grade: '중1',
  className: '중1 수학',
  subject: '수학',
  slotNumber: 1,
}

assert.equal(
  hubFromTodayReportName(key),
  'hub-from-today-report-v1|2026-09-18|중1|중1 수학|수학|1',
)

const id = await hubAssignmentIdFromTodayReport(key)
assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
assert.equal(id, await uuidV5(HUB_FROM_TODAY_REPORT_NAMESPACE, hubFromTodayReportName(key)))
assert.equal(id, await hubAssignmentIdFromTodayReport({ ...key, grade: ' 중1 ' }))
assert.notEqual(
  id,
  await hubAssignmentIdFromTodayReport({ ...key, slotNumber: 2 }),
)
assert.notEqual(
  id,
  await hubAssignmentIdFromTodayReport({ ...key, className: '중1 영어' }),
)

assert.equal(hubAssignmentSubjectLabel('수학', 1), '수학 · 개념교재')
assert.equal(hubAssignmentSubjectLabel('수학', 2), '수학 · 유형교재')
assert.equal(hubAssignmentSubjectLabel('영어', 1), '영어 · 문법교재')
assert.equal(hubAssignmentSubjectLabel('영어', 3), '영어 · 단어장')

function common(
  patch: Partial<ClassTodayReportCommon> = {},
): ClassTodayReportCommon {
  return {
    id: 'common-1',
    grade: '중1',
    className: '중1 수학',
    reportDate: '2026-09-18',
    subject: '수학',
    slotNumber: 1,
    textbookName: '개념원리',
    currentProgress: '',
    currentPage: 0,
    totalPage: 0,
    previousAssignment: '',
    todayAssignment: '77-80쪽',
    createdAt: '2026-09-18T01:00:00.000Z',
    updatedAt: '2026-09-18T02:00:00.000Z',
    ...patch,
  }
}

const mapped = hubAssignmentFromTodayReportCommon(
  common(),
  '2026-09-18T03:00:00.000Z',
  '11111111-1111-5111-8111-111111111111',
)
assert.ok(mapped)
assert.equal(mapped.grade, '중1')
assert.equal(mapped.className, '중1 수학')
assert.equal(mapped.subject, '수학 · 개념교재')
assert.equal(mapped.textbookName, '개념원리')
assert.equal(mapped.content, '77-80쪽')
assert.equal(mapped.dueDate, '2026-09-18')
assert.equal(mapped.studentId, null)
assert.equal(mapped.published, true)
assert.equal(mapped.publishedAt, '2026-09-18T03:00:00.000Z')

assert.equal(
  hubAssignmentFromTodayReportCommon(common({ todayAssignment: '  ' }), 'now', 'id'),
  null,
)
assert.equal(
  hubAssignmentFromTodayReportCommon(common({ className: '' }), 'now', 'id'),
  null,
)

const saved: Array<{ id: string; content: string; className: string }> = []
const notified: string[] = []
await syncHubAssignmentsFromTodayReport(
  [
    common(),
    common({ todayAssignment: '', className: '중1 영수A' }),
    common({
      className: '중1 영수A',
      slotNumber: 2,
      todayAssignment: '유형 12-15',
      textbookName: '',
    }),
  ],
  async (record) => {
    saved.push({ id: record.id, content: record.content, className: record.className })
  },
  (record) => {
    notified.push(record.id)
  },
)
assert.equal(saved.length, 2)
assert.equal(saved[0]?.content, '77-80쪽')
assert.equal(saved[0]?.id, id)
assert.deepEqual(notified, saved.map((item) => item.id))
assert.equal(saved[1]?.content, '유형 12-15')
assert.equal(
  saved[1]?.id,
  await hubAssignmentIdFromTodayReport({
    reportDate: '2026-09-18',
    grade: '중1',
    className: '중1 영수A',
    subject: '수학',
    slotNumber: 2,
  }),
)

let calls = 0
let notifyCalls = 0
await syncHubAssignmentsFromTodayReport(
  [common()],
  async () => {
    calls += 1
    throw new Error('hub upsert failed')
  },
  () => {
    notifyCalls += 1
  },
)
assert.equal(calls, 1)
assert.equal(notifyCalls, 0)

assert.match(useData, /syncHubAssignmentsFromTodayReport/)
assert.match(useData, /saveHomeworkSubjectWithClassSync/)
assert.match(assignmentPanel, /saveHomeworkSubjectWithClassSync/)
assert.match(useData, /event: 'assignment_saved'/)
assert.match(useData, /teacherSaveAssignment/)
assert.doesNotMatch(hubSql, /FROM public\.class_today_report_common/)
assert.doesNotMatch(followupSql, /FROM public\.class_today_report_common/)
assert.doesNotMatch(followupSql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(parentRpc, /class_hub_assignments/)
assert.match(scoring, /WEEKLY_SUMMARY_TOTAL_MAX = 100/)
assert.doesNotMatch(weeklySummary, /class_hub_assignments/)
assert.match(teacherCms, /teacherSaveAssignment/)
assert.doesNotMatch(useData, /send-hub-push-notification/)
assert.doesNotMatch(readFileSync('src/lib/hubFromTodayReport.ts', 'utf8'), /notifyHubPush/)

console.log('hubFromTodayReport.test.ts passed')
