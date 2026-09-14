/**
 * 실행: npx tsx src/utils/studentCare/scoringAlignment.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ATTENDANCE_INDEX,
  ATTITUDE_BASE_INDEX,
  ATTITUDE_INDEX_FLOOR,
  ATTITUDE_ISSUE_PENALTY,
  DAILY_TEST_AVG_WEIGHT,
  DAILY_TEST_PASS_RATE_WEIGHT,
  DAILY_TEST_PASS_SCORE,
  HOMEWORK_INDEX,
  MATERIAL_INDEX,
} from './constants.ts'
import { computeLearningRisk } from './risk.ts'
import {
  attendanceIndex,
  attitudeLessonIndex,
  homeworkDayIndex,
  materialPrepIndex,
  weeklyTestIndex,
} from './scoring.ts'

assert.equal(ATTENDANCE_INDEX.present, 100)
assert.equal(ATTENDANCE_INDEX.excusedLate, 100)
assert.equal(ATTENDANCE_INDEX.excusedAbsent, 100)
assert.equal(ATTENDANCE_INDEX.unexcusedLate, 70)
assert.equal(ATTENDANCE_INDEX.unexcusedAbsent, 0)
assert.equal(MATERIAL_INDEX.brought, 100)
assert.equal(MATERIAL_INDEX.partial, 50)
assert.equal(HOMEWORK_INDEX.complete, 100)
assert.equal(HOMEWORK_INDEX.partial, 50)
assert.equal(HOMEWORK_INDEX.incomplete, 0)
assert.equal(DAILY_TEST_PASS_SCORE, 85)
assert.equal(DAILY_TEST_AVG_WEIGHT, 0.7)
assert.equal(DAILY_TEST_PASS_RATE_WEIGHT, 0.3)
assert.equal(ATTITUDE_BASE_INDEX, 100)
assert.equal(ATTITUDE_ISSUE_PENALTY, 20)
assert.equal(ATTITUDE_INDEX_FLOOR, 60)

assert.equal(attendanceIndex({ status: '출석', excuseKind: null }), 100)
assert.equal(attendanceIndex({ status: '지각', excuseKind: '인정' }), 100)
assert.equal(attendanceIndex({ status: '결석', excuseKind: '인정' }), 100)
assert.equal(attendanceIndex({ status: '지각', excuseKind: '무단' }), 70)
assert.equal(attendanceIndex({ status: '결석', excuseKind: '무단' }), 0)
assert.equal(materialPrepIndex('지참'), 100)
assert.equal(materialPrepIndex('부분 지참'), 50)
assert.equal(homeworkDayIndex(['완료']), 100)
assert.equal(homeworkDayIndex(['부분 완료']), 50)
assert.equal(homeworkDayIndex(['미완료']), 0)
assert.equal(attitudeLessonIndex([]), 100)
assert.equal(attitudeLessonIndex(['졸음']), 80)
assert.equal(attitudeLessonIndex(['졸음', '잡담', '수업방해']), 60)
assert.equal(weeklyTestIndex([90, 80]), 85 * 0.7 + 50 * 0.3)

const excusedLateRisk = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [
    {
      id: 'a1',
      studentId: 'stu-1',
      date: '2026-09-07',
      status: '지각',
      reason: '',
      memo: '',
      excuseKind: '인정',
      createdAt: '',
      updatedAt: '',
    },
  ],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
  progressRecords: [],
  classNotes: [],
})
assert.equal(excusedLateRisk.level, '우수')
assert.equal(excusedLateRisk.score, 0)

const sql = readFileSync('supabase/weekly-student-care-migration.sql', 'utf8')
assert.match(sql, /WHEN p_status = '지각' AND p_excuse = '무단' THEN 70/)
assert.match(sql, /WHEN p_status = '결석' AND p_excuse = '무단' THEN 0/)
assert.match(sql, /WHEN p_status IN \('지각', '결석'\) THEN 100/)
assert.match(sql, /v_care\.material_prep = '지참' THEN[\s\S]*array_append\(v_mat_vals, 100\)/)
assert.match(sql, /v_care\.material_prep = '부분 지참' THEN[\s\S]*array_append\(v_mat_vals, 50\)/)
assert.match(sql, /v_hw_cat = 'complete' THEN[\s\S]*array_append\(v_hw_vals, 100\)/)
assert.match(sql, /v_hw_cat = 'partial' THEN[\s\S]*array_append\(v_hw_vals, 50\)/)
assert.match(sql, /v_hw_cat = 'incomplete' THEN[\s\S]*array_append\(v_hw_vals, 0\)/)
assert.match(sql, /v_test_score >= 85/)
assert.match(sql, /\(v_avg \* 0\.7\) \+ \(\(v_test_pass::numeric \/ array_length\(v_test_vals, 1\)\) \* 100 \* 0\.3\)/)
assert.match(sql, /greatest\(60, 100 - coalesce\(array_length\(v_care\.attitude_issues, 1\), 0\) \* 20\)/)
assert.match(sql, /v_att_vals_idx := array_append\(v_att_vals_idx, 100\)/)
assert.doesNotMatch(sql, /TRUNCATE TABLE/i)
assert.doesNotMatch(sql, /DELETE FROM public\.(attendance|homework|daily_tests|monthly_learning_reports)/)
assert.doesNotMatch(sql, /FOR INSERT TO anon WITH CHECK \(true\)/)
assert.doesNotMatch(sql, /FOR UPDATE TO anon USING \(true\) WITH CHECK \(true\)/)
assert.doesNotMatch(sql, /FOR DELETE TO anon USING \(true\)/)
assert.doesNotMatch(
  sql,
  /GRANT EXECUTE ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) TO anon/,
)
assert.match(sql, /REVOKE ALL ON TABLE public.student_daily_care FROM anon/)
assert.match(sql, /REVOKE ALL ON TABLE public.weekly_learning_summaries FROM anon/)
assert.match(sql, /REVOKE ALL ON TABLE public.weekly_summary_reads FROM anon/)

const app = readFileSync('src/App.tsx', 'utf8')
for (const route of [
  'monthly-learning-report',
  'monthly-evaluation',
  'notices-makeup',
  'admission-strategy',
  'questions',
  'today-report',
  'weekly-learning-summary',
]) {
  assert.match(app, new RegExp(`path="${route}"`))
}

assert.equal(readFileSync('src/components/dailytest/WrongAnswerBankBlock.tsx', 'utf8').includes('export function WrongAnswerBankBlock'), true)

const todayReportView = readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8')
assert.match(todayReportView, /computeLearningRisk/)
assert.match(todayReportView, /LearningStatusBadge/)
assert.match(todayReportView, /readOnly \? dayClassNote/)
assert.doesNotMatch(todayReportView, /showSection\('classNote'\) && !readOnly/)

const teacherUiFiles = [
  'src/components/todayReport/TodayReportStudentAccordion.tsx',
  'src/pages/AttendancePage.tsx',
  'src/pages/teacherMobile/TeacherMobileTodayReportPage.tsx',
  'src/components/todayReport/ClassAttendanceBulkPanel.tsx',
  'src/components/todayReport/ClassMaterialPrepBulkPanel.tsx',
]
for (const file of teacherUiFiles) {
  const source = readFileSync(file, 'utf8')
  assert.doesNotMatch(source, /LearningStatusBadge/)
  assert.doesNotMatch(source, /computeLearningRisk/)
}

const teacherMobileToday = readFileSync('src/pages/teacherMobile/TeacherMobileTodayReportPage.tsx', 'utf8')
assert.match(teacherMobileToday, /id: 'classTodayHomework'[\s\S]*id: 'materialPrep'[\s\S]*id: 'progress'/)
assert.match(teacherMobileToday, /mobileSection="attitude"/)
assert.doesNotMatch(teacherMobileToday, /강사 피드백/)
assert.doesNotMatch(teacherMobileToday, /classNote/)

const teacherHome = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
assert.match(teacherHome, /출결 · 숙제 · 교재준비/)
assert.match(teacherHome, /진도 · 일일테스트 · 수업태도/)
assert.doesNotMatch(teacherHome, /특이사항/)

const attitudePicker = readFileSync('src/components/studentCare/ClassAttitudePicker.tsx', 'utf8')
assert.match(attitudePicker, /data-attitude-state="excellent"/)
assert.match(attitudePicker, /수업 중 확인한 내용을 간단히 입력/)
assert.match(attitudePicker, /CLASS_ATTITUDE_ISSUE_LIST/)

const parentPreview = readFileSync('src/pages/dev/ParentMobileLayoutPreviewPage.tsx', 'utf8')
assert.match(parentPreview, /statusBadge=\{<LearningStatusBadge/)
assert.doesNotMatch(parentPreview, /강사 피드백/)

console.log('scoringAlignment OK')
