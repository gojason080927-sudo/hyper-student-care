/**
 * 실행: npx tsx src/lib/hubFromTodayReport.test.ts
 *
 * Today Report 반 공통 과제 → Student Hub 표시 매핑 · 반 격리 · CMS 중복 입력 제거.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ClassTodayReportCommon } from '../types/records.ts'
import {
  hubAssignmentFromTodayReportCommon,
  hubAssignmentSubjectLabel,
  syncHubAssignmentsFromTodayReport,
  todayReportAssignmentVisibleToStudent,
} from './hubFromTodayReport.ts'

const useData = readFileSync('src/hooks/useData.tsx', 'utf8')
const sql = readFileSync('supabase/hub-today-report-assignments-v1-migration.sql', 'utf8')
const followupSql = readFileSync('supabase/student-hub-followup-v1-migration.sql', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
const scoring = readFileSync('src/utils/studentCare/constants.ts', 'utf8')
const weeklySummary = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
const assignmentPanel = readFileSync(
  'src/components/todayReport/ClassCommonTodayAssignmentPanel.tsx',
  'utf8',
)
const hubAssignments = readFileSync('src/hub/HubAssignmentsPage.tsx', 'utf8')
const edge = readFileSync('supabase/functions/send-hub-push-notification/index.ts', 'utf8')

assert.equal(hubAssignmentSubjectLabel('수학', 1), '수학 · 개념교재')
assert.equal(hubAssignmentSubjectLabel('수학', 2), '수학 · 유형교재')
assert.equal(hubAssignmentSubjectLabel('영어', 1), '영어 · 문법교재')
assert.equal(hubAssignmentSubjectLabel('영어', 3), '영어 · 단어장')

function common(
  patch: Partial<ClassTodayReportCommon> = {},
): ClassTodayReportCommon {
  return {
    id: '11111111-1111-4111-8111-111111111111',
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

const mapped = hubAssignmentFromTodayReportCommon(common(), '2026-09-18T03:00:00.000Z')
assert.ok(mapped)
assert.equal(mapped.id, '11111111-1111-4111-8111-111111111111')
assert.equal(mapped.grade, '중1')
assert.equal(mapped.className, '중1 수학')
assert.equal(mapped.subject, '수학 · 개념교재')
assert.equal(mapped.textbookName, '개념원리')
assert.equal(mapped.content, '77-80쪽')
assert.equal(mapped.dueDate, '2026-09-18')
assert.equal(mapped.studentId, null)
assert.equal(mapped.published, true)

assert.equal(
  hubAssignmentFromTodayReportCommon(common({ todayAssignment: '  ' }), 'now'),
  null,
)
assert.equal(hubAssignmentFromTodayReportCommon(common({ className: '' }), 'now'), null)

const saved: Array<{ id: string; content: string; className: string }> = []
const notified: string[] = []
await syncHubAssignmentsFromTodayReport(
  [
    common(),
    common({ todayAssignment: '', className: '중1 영어' }),
    common({
      id: '22222222-2222-4222-8222-222222222222',
      className: '중1 수학',
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
assert.equal(saved[0]?.id, '11111111-1111-4111-8111-111111111111')
assert.equal(saved[1]?.id, '22222222-2222-4222-8222-222222222222')
assert.deepEqual(notified, saved.map((item) => item.id))

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
assert.equal(notifyCalls, 1, 'Hub upsert가 실패해도 Today Report는 이미 저장됐으므로 Push는 시도한다')

assert.equal(
  todayReportAssignmentVisibleToStudent({
    studentGrade: '중1',
    studentClassName: '중1 수학',
    recordGrade: '중1',
    recordClassName: '중1 수학',
    todayAssignment: '77-80쪽',
    reportDate: '2026-09-18',
    today: '2026-09-18',
  }),
  true,
)
assert.equal(
  todayReportAssignmentVisibleToStudent({
    studentGrade: '중1',
    studentClassName: '중1 영어',
    recordGrade: '중1',
    recordClassName: '중1 수학',
    todayAssignment: '77-80쪽',
    reportDate: '2026-09-18',
    today: '2026-09-18',
  }),
  false,
  '다른 반 학생에게 과제가 보이면 안 된다',
)
assert.equal(
  todayReportAssignmentVisibleToStudent({
    studentGrade: '중2',
    studentClassName: '중1 수학',
    recordGrade: '중1',
    recordClassName: '중1 수학',
    todayAssignment: '77-80쪽',
    reportDate: '2026-09-18',
    today: '2026-09-18',
  }),
  false,
  '다른 학년 학생에게 과제가 보이면 안 된다',
)
assert.equal(
  todayReportAssignmentVisibleToStudent({
    studentGrade: '중1',
    studentClassName: '중1 수학',
    recordGrade: '중1',
    recordClassName: '중1 수학',
    todayAssignment: '77-80쪽',
    reportDate: '2026-09-17',
    today: '2026-09-18',
  }),
  false,
  '오늘이 아닌 Today Report 날짜는 학생 오늘의 과제에 넣지 않는다',
)

assert.match(useData, /syncHubAssignmentsFromTodayReport/)
assert.match(useData, /upsertHubAssignmentRow/)
assert.match(useData, /saveHomeworkSubjectWithClassSync/)
assert.match(assignmentPanel, /saveHomeworkSubjectWithClassSync/)
assert.match(useData, /event: 'assignment_saved'/)
assert.match(useData, /assignmentFingerprint/)
assert.doesNotMatch(useData, /send-hub-push-notification/)
assert.doesNotMatch(readFileSync('src/lib/hubFromTodayReport.ts', 'utf8'), /uuidV5|SHA-1|subtle\.digest/)
assert.match(sql, /FROM public\.class_today_report_common c/)
assert.match(sql, /trim\(c\.class_name\) = v_class_name/)
assert.match(sql, /trim\(c\.grade\) = trim\(v_grade\)/)
assert.match(sql, /Asia\/Seoul/)
assert.match(sql, /DISTINCT ON \(src\.id\)/)
assert.match(sql, /FROM public\.class_hub_assignments a/)
assert.match(sql, /NOT EXISTS/)
assert.match(sql, /c\.id = a\.id/)
assert.match(sql, /UNION/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\._build_weekly_learning_summary/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.list_hub_push_notice_recipients/)
assert.doesNotMatch(sql, /^\s*TRUNCATE/im)
assert.doesNotMatch(sql, /^\s*DROP TABLE/im)
assert.doesNotMatch(followupSql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(parentRpc, /class_hub_assignments/)
assert.match(scoring, /WEEKLY_SUMMARY_TOTAL_MAX = 100/)
assert.doesNotMatch(weeklySummary, /class_hub_assignments/)
assert.match(teacherCms, /반 공통 오늘 과제/)
assert.doesNotMatch(teacherCms, /반 과제 게시/)
assert.doesNotMatch(teacherCms, /teacherSaveAssignment/)
assert.doesNotMatch(teacherCms, /teacherFetchAssignments/)
assert.doesNotMatch(teacherCms, /id: 'assignments'/)
assert.doesNotMatch(teacherCms, /이 화면에서 반별로 따로 등록합니다/)
assert.doesNotMatch(hubAssignments, /weekStart/)
assert.match(edge, /class_today_report_common/)
assert.match(edge, /오늘의 과제가 등록되었습니다/)
assert.match(edge, /student:assignment/)
assert.match(edge, /hubAssignmentSubjectLabel/)
assert.doesNotMatch(edge, /send-parent-report-notification/)

console.log('hubFromTodayReport.test.ts passed')
