/**
 * 실행: npx tsx src/hub/studentHubFollowup.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/student-hub-followup-v1-migration.sql', 'utf8')
const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
const hubRpc = readFileSync('src/hub/hubRpc.ts', 'utf8')
const materialPage = readFileSync('src/hub/HubMaterialRequestPage.tsx', 'utf8')
const suggestionPage = readFileSync('src/hub/HubSuggestionsPage.tsx', 'utf8')
const parentWeekly = readFileSync('src/pages/parent/ParentStudentWeeklySummaryPage.tsx', 'utf8')
const hubWeekly = readFileSync('src/hub/HubWeeklyPage.tsx', 'utf8')
const scoring = readFileSync('src/utils/studentCare/constants.ts', 'utf8')
const weeklySummary = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
const weeklySql = readFileSync('supabase/weekly-student-care-migration.sql', 'utf8')

assert.doesNotMatch(sql, /^\s*TRUNCATE/im)
assert.doesNotMatch(sql, /^\s*DROP TABLE/im)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\._build_weekly_learning_summary/)
assert.match(sql, /ADD COLUMN IF NOT EXISTS teacher_reply/)
assert.match(sql, /update_student_hub_inbox/)
assert.match(sql, /delete_student_hub_inbox/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.update_student_hub_inbox\(text, uuid, text\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.delete_student_hub_inbox\(text, uuid\) TO anon/)
assert.match(sql, /a\.student_id IS NULL OR a\.student_id = v_student_id/)
assert.match(sql, /FROM public\.daily_tests d/)
assert.match(sql, /d\.student_id = v_student_id/)
assert.match(sql, /'teacher_reply', i\.teacher_reply/)

assert.match(teacherCms, /label: '오늘의 과제'/)
assert.match(teacherCms, /teacherFetchAssignments/)
assert.match(teacherCms, /teacherSaveAssignment/)
assert.match(teacherCms, /teacherSaveInboxReply/)
assert.match(teacherCms, /교사 답변/)
assert.doesNotMatch(teacherCms, /학생 앱 연결은 다음 단계에서/)
assert.match(teacherRepo, /teacherSaveInboxReply/)
assert.match(teacherRepo, /teacher_reply/)

assert.match(hubRpc, /rpcUpdateHubInbox/)
assert.match(hubRpc, /rpcDeleteHubInbox/)
assert.match(hubRpc, /daily_tests/)
assert.match(materialPage, /HubInboxItemCard/)
assert.match(suggestionPage, /HubInboxItemCard/)
assert.match(readFileSync('src/hub/HubInboxItemCard.tsx', 'utf8'), /rpcUpdateHubInbox/)
assert.match(readFileSync('src/hub/HubInboxItemCard.tsx', 'utf8'), /rpcDeleteHubInbox/)
assert.match(readFileSync('src/hub/HubInboxItemCard.tsx', 'utf8'), /교사 답변/)

assert.match(parentWeekly, /DailyTestWeeklyFlowCard/)
assert.match(hubWeekly, /WeeklySummaryDetail/)
assert.doesNotMatch(hubWeekly, /DailyTestWeeklyFlowCard/)
assert.match(hubWeekly, /dailyTests=\{dailyTests\}/)
assert.match(parentWeekly, /dailyTests=\{dailyTests\}/)
assert.match(parentWeekly, /studentId=\{student\.id\}/)
assert.match(hubWeekly, /studentId=\{student\.id\}/)
assert.match(parentWeekly, /grade=\{summary\.scores\.dailyTest\.grade\}/)
assert.match(
  parentWeekly,
  /const AREA_ORDER: WeeklySummaryAreaKey\[] = \[\s*'attendance',\s*'material',\s*'homework',\s*'attitude',\s*\]/,
)
assert.doesNotMatch(parentWeekly, /AREA_ORDER: WeeklySummaryAreaKey\[] = \[[^\]]*dailyTest/)

assert.match(scoring, /ATTENDANCE_WEEKLY_MAX = 20/)
assert.match(scoring, /MATERIAL_WEEKLY_MAX = 10/)
assert.match(scoring, /HOMEWORK_WEEKLY_MAX = 25/)
assert.match(scoring, /DAILY_TEST_WEEKLY_MAX = 30/)
assert.match(scoring, /ATTITUDE_WEEKLY_MAX = 15/)
assert.match(scoring, /WEEKLY_SUMMARY_TOTAL_MAX = 100/)
assert.doesNotMatch(weeklySummary, /DailyTestWeeklyFlow/)
assert.doesNotMatch(weeklySql, /student-hub-followup/)

console.log('studentHubFollowup.test.ts passed')
