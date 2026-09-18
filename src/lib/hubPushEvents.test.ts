/**
 * 실행: npx tsx src/lib/hubPushEvents.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  assignmentPushKind,
  isFirstNoticePublish,
  isFirstStudentQuestionAnswer,
  isFirstTeacherReply,
  payloadContainsSensitiveStudentContent,
  studentInboxReplyCopy,
  studentNotificationUrl,
  studentPushCopy,
  teacherInboxEventKey,
  teacherPushCopy,
  teacherQuestionEventKey,
} from './hubPushEvents.ts'

const assignment = {
  id: 'a1',
  published: true,
  grade: '중1',
  className: 'A반',
  subject: '수학',
  textbookName: '개념원리',
  content: '1단원',
  dueDate: '2026-09-19',
  studentId: null,
}

assert.equal(assignmentPushKind(null, assignment), 'published')
assert.equal(assignmentPushKind({ ...assignment, published: false }, assignment), 'published')
assert.equal(assignmentPushKind(assignment, assignment), null)
assert.equal(
  assignmentPushKind(assignment, { ...assignment, content: '1단원 수정' }),
  'changed',
)
assert.equal(assignmentPushKind(assignment, { ...assignment, published: false }), null)

assert.equal(isFirstTeacherReply('', '금요일까지 준비하겠습니다.'), true)
assert.equal(isFirstTeacherReply('기존 답변', '답변 수정'), false)
assert.equal(isFirstTeacherReply('  ', '답변'), true)
assert.equal(isFirstTeacherReply('답변', ''), false)

assert.equal(
  isFirstStudentQuestionAnswer(
    { id: 'q1', source: 'student', answer: '', answerImageCount: 0 },
    { id: 'q1', source: 'student', answer: '풀이', answerImageCount: 0 },
  ),
  true,
)
assert.equal(
  isFirstStudentQuestionAnswer(
    { id: 'q1', source: 'student', answer: '풀이', answerImageCount: 0 },
    { id: 'q1', source: 'student', answer: '풀이 수정', answerImageCount: 0 },
  ),
  false,
)
assert.equal(
  isFirstStudentQuestionAnswer(
    { id: 'q1', source: 'parent', answer: '', answerImageCount: 0 },
    { id: 'q1', source: 'parent', answer: '답변', answerImageCount: 0 },
  ),
  false,
)

assert.equal(isFirstNoticePublish(null, { id: 'n1', published: true }), true)
assert.equal(isFirstNoticePublish({ id: 'n1', published: false }, { id: 'n1', published: true }), true)
assert.equal(isFirstNoticePublish({ id: 'n1', published: true }, { id: 'n1', published: true }), false)
assert.equal(isFirstNoticePublish(null, { id: 'n1', published: false }), false)

assert.equal(studentPushCopy('assignment_published').body, '오늘의 과제가 등록되었습니다.')
assert.equal(studentPushCopy('assignment_changed').body, '오늘의 과제가 변경되었습니다.')
assert.equal(studentInboxReplyCopy('suggestion').body, '건의사항에 답변이 등록되었습니다.')
assert.equal(studentInboxReplyCopy('material_request').path, 'requests')
assert.equal(teacherPushCopy('student_question').url, '/teacher/mobile/questions')
assert.equal(teacherPushCopy('material_request').url, '/teacher/mobile/student-hub')
assert.equal(teacherPushCopy('suggestion').url, '/teacher/mobile/student-hub')
assert.equal(studentNotificationUrl('abc', 'weekly'), '/hub/abc/weekly')
assert.equal(teacherQuestionEventKey('q1'), 'teacher:question:q1:created')
assert.equal(teacherInboxEventKey('i1'), 'teacher:inbox:i1:created')

for (const copy of [
  studentPushCopy('question_answered'),
  studentInboxReplyCopy('suggestion'),
  teacherPushCopy('student_question'),
]) {
  assert.equal(payloadContainsSensitiveStudentContent(copy.body), false)
  assert.doesNotMatch(copy.body, /이차함수|상담 내용|질문 본문/)
}

const parentClient = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentPushRpc.ts', 'utf8')
const todayReport = readFileSync('src/lib/todayReportCompletion.ts', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const sql = readFileSync('supabase/hub-web-push-v1-migration.sql', 'utf8')

assert.match(parentClient, /const PARENT_SW_SCOPE = '\/care\/'/)
assert.match(parentRpc, /upsert_parent_push_subscription/)
assert.match(parentRpc, /deactivate_parent_push_subscription/)
assert.doesNotMatch(parentRpc, /student_push_subscriptions/)
assert.match(todayReport, /send-parent-report-notification/)
assert.match(careSw, /self\.addEventListener\('push'/)
assert.match(hubSw, /self\.addEventListener\('push'/)
assert.match(hubSw, /self\.addEventListener\('notificationclick'/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.student_push_subscriptions/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.teacher_push_subscriptions/)
assert.doesNotMatch(sql, /ALTER TABLE public\.parent_push_subscriptions/)
assert.doesNotMatch(sql, /UPDATE public\.parent_push_subscriptions/)
assert.doesNotMatch(sql, /DROP TABLE/)
assert.doesNotMatch(sql, /TRUNCATE/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.upsert_student_push_subscription/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.upsert_teacher_push_subscription/)
assert.match(sql, /REVOKE ALL ON TABLE public\.student_push_subscriptions FROM anon/)
assert.match(sql, /REVOKE ALL ON TABLE public\.teacher_push_subscriptions FROM anon/)
assert.match(sql, /auth\.uid\(\) IS NULL/)
assert.match(sql, /list_hub_push_assignment_recipients/)
assert.match(sql, /list_hub_push_notice_recipients/)
assert.match(sql, /_notice_visible_to_student/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.upsert_parent_push_subscription/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.match(sql, /NOTIFY pgrst, 'reload schema'/)

console.log('hubPushEvents tests passed')
