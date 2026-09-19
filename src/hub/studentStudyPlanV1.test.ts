/**
 * 실행: npx tsx src/hub/studentStudyPlanV1.test.ts
 *
 * My Study Plan V1 — SQL 안전성 · access_key identity · A/B isolation · HOME 카드 · 라우트.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  canMutateStudyPlan,
  emptyDateMessage,
  formatClock,
  formatPlanTimeRange,
  startOfWeekMonday,
  studyPlanErrorMessage,
  weekdayKo,
  weekDatesFromMonday,
} from './studyPlan.ts'

const sql = readFileSync('supabase/student-study-plans-v1-migration.sql', 'utf8')
const hubSql = readFileSync('supabase/student-learning-hub-v1-migration.sql', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const home = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const rpc = readFileSync('src/hub/hubRpc.ts', 'utf8')
const page = readFileSync('src/hub/HubStudyPlanPage.tsx', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const voice = readFileSync('api/voice-transcribe.ts', 'utf8')
const voiceDir = readFileSync('src/utils/voiceInput/recordedStt.test.ts', 'utf8')
const pkg = readFileSync('package.json', 'utf8')

assert.doesNotMatch(sql, /TRUNCATE TABLE/i)
assert.doesNotMatch(sql, /DROP TABLE/i)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_student_hub_bundle/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_student_hub_identity/)
assert.doesNotMatch(sql, /\bp_student_id\b/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,180}FOR INSERT\s+TO anon/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,220}FOR SELECT\s+TO anon/)
assert.doesNotMatch(sql, /GRANT SELECT[\s\S]{0,80}student_study_plans TO authenticated/)
assert.doesNotMatch(sql, /GRANT SELECT[\s\S]{0,80}student_study_plans TO anon/)

assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.student_study_plans/)
assert.match(sql, /REFERENCES public\.students \(id\) ON DELETE CASCADE/)
assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
assert.match(sql, /REVOKE ALL ON TABLE public\.student_study_plans FROM PUBLIC/)
assert.match(sql, /REVOKE ALL ON TABLE public\.student_study_plans FROM anon/)
assert.match(sql, /REVOKE ALL ON TABLE public\.student_study_plans FROM authenticated/)
assert.match(sql, /GRANT ALL ON TABLE public\.student_study_plans TO service_role/)
assert.match(sql, /SET search_path = public/)
assert.match(sql, /v_student_id := public\._parent_active_student_id\(p_access_key\)/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.list_student_study_plans\(text, date, date\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.upsert_student_study_plan\(text, uuid, date, text, text, time, time\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.set_student_study_plan_completed\(text, uuid, boolean\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.delete_student_study_plan\(text, uuid\) TO anon/)
assert.match(sql, /REVOKE ALL ON FUNCTION public\.list_student_study_plans\(text, date, date\) FROM PUBLIC/)
assert.match(sql, /WHERE p\.student_id = v_student_id/)
assert.match(sql, /WHERE p\.id = p_id\s+AND p\.student_id = v_student_id/)
assert.match(sql, /DELETE FROM public\.student_study_plans p\s+WHERE p\.id = p_id\s+AND p\.student_id = v_student_id/)
assert.match(sql, /RAISE EXCEPTION 'invalid or inactive access key'/)
assert.match(sql, /RAISE EXCEPTION 'plan_not_found'/)
assert.match(sql, /IF p_end_time <= p_start_time/)
assert.match(sql, /v_count >= 10/)
assert.match(sql, /v_count >= 15/)

assert.equal(sql.includes('_parent_active_student_id'), true)
assert.equal((sql.match(/_parent_active_student_id/g) || []).length >= 4, true)

assert.doesNotMatch(hubSql, /student_study_plans/)
assert.match(app, /path="study-plan"/)
assert.match(home, /주간 SUMMARY/)
assert.match(home, /오늘의 과제/)
assert.match(home, /문제 자료실/)
assert.match(home, /영상 자료실/)
assert.match(home, /질문방/)
assert.match(home, /자료 요청실/)
assert.match(home, /시간표 안내/)
assert.match(home, /공지사항/)
assert.match(home, /건의사항/)
assert.match(home, /My Study Plan/)
assert.match(home, /나만의 학습 계획 관리/)
assert.match(home, /hub-feature-card/)
assert.match(home, /grid-cols-3/)
assert.match(home, /hub-hero/)
assert.match(home, /HUB_ACADEMY_LOGO_WEBP/)
assert.doesNotMatch(home, /to: 'study-plan'/)

const menuOrder = [
  '주간 SUMMARY',
  '오늘의 과제',
  '문제 자료실',
  '영상 자료실',
  '질문방',
  '자료 요청실',
  '시간표 안내',
  '공지사항',
  '건의사항',
]
const labels = [...home.matchAll(/label: '([^']+)'/g)].map((match) => match[1])
assert.deepEqual(labels, menuOrder)

assert.match(rpc, /list_student_study_plans/)
assert.match(rpc, /upsert_student_study_plan/)
assert.match(rpc, /set_student_study_plan_completed/)
assert.match(rpc, /delete_student_study_plan/)
assert.match(rpc, /p_access_key: accessKey.trim\(\)/)
assert.doesNotMatch(rpc, /p_student_id/)
assert.doesNotMatch(page, /student_id/)
assert.match(page, /rpcListStudentStudyPlans\(accessKey/)
assert.match(page, /rpcUpsertStudentStudyPlan/)
assert.match(page, /계획 추가/)
assert.match(page, /emptyDateMessage/)

assert.equal(existsSync('public/hub/hyper-academy-logo-source-v1.png'), true)
assert.equal(existsSync('public/hyper-academy-logo-source-v11.jpg'), true)
assert.equal(existsSync('public/hub/hyper-academy-logo-v11.webp'), true)
assert.equal(existsSync('public/hub/hyper-academy-logo-v11.png'), true)
assert.match(readFileSync('src/hub/types.ts', 'utf8'), /hyper-academy-logo-v11\.webp/)
assert.match(readFileSync('src/hub/studyPlan.ts', 'utf8'), /오늘 등록된 학습 계획이 없습니다/)

assert.match(readFileSync('src/hub/hub.css', 'utf8'), /\.hub-check\.is-on svg/)
assert.doesNotMatch(readFileSync('src/pages/dev/HubStudyPlanLayoutPreviewPage.tsx', 'utf8'), /MemoryRouter/)
assert.equal(voice.includes('student_study_plans'), false)
assert.equal(hubStorage.includes('student_study_plans'), false)
assert.equal(voiceDir.includes('HubStudyPlanPage'), false)

assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'B', planId: 'p1', requestedPlanId: 'p1' }), false)
assert.equal(canMutateStudyPlan({ actorStudentId: 'B', planOwnerStudentId: 'A', planId: 'p1', requestedPlanId: 'p1' }), false)
assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'A', planId: 'p1', requestedPlanId: 'p2' }), false)
assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'A', planId: 'p1', requestedPlanId: 'p1' }), true)

assert.equal(startOfWeekMonday('2026-09-17'), '2026-09-14')
assert.deepEqual(weekDatesFromMonday('2026-09-14'), [
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
])
assert.equal(weekdayKo('2026-09-17'), '목')
assert.equal(formatClock('19:00:00'), '19:00')
assert.equal(formatPlanTimeRange('19:00:00', '20:30:00'), '19:00 – 20:30')
assert.equal(emptyDateMessage('2026-09-17', '2026-09-17'), '오늘 등록된 학습 계획이 없습니다.')
assert.equal(emptyDateMessage('2026-09-18', '2026-09-17'), '선택한 날에 등록된 학습 계획이 없습니다.')
assert.match(studyPlanErrorMessage({ message: 'Could not find the function public.list_student_study_plans' }), /아직 서버에 적용되지 않았습니다/)
assert.equal(studyPlanErrorMessage({ message: 'plan_not_found' }), '계획을 찾을 수 없습니다.')
assert.equal(studyPlanErrorMessage({ message: 'invalid or inactive access key' }), '유효하지 않거나 만료된 학생 링크입니다.')

console.log('studentStudyPlanV1.test.ts passed')
