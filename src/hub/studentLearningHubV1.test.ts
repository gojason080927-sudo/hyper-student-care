/**
 * 실행: npx tsx src/hub/studentLearningHubV1.test.ts
 *
 * Student Learning Hub V1 — SQL 안전성 · 라우트 · URL · YouTube 파서 정적 검증.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { parseTimestampLines, parseYoutubeVideoId, youtubeEmbedUrl } from './youtube.ts'
import { STUDENT_QUESTION_CATEGORIES } from './types.ts'

const sql = readFileSync('supabase/student-learning-hub-v1-migration.sql', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const voice = readFileSync('api/voice-transcribe.ts', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
const parentRecords = readFileSync('src/hooks/useParentStudentRecords.ts', 'utf8')
const questionsPage = readFileSync('src/pages/QuestionsPage.tsx', 'utf8')
const hubQuestions = readFileSync('src/hub/HubQuestionsPage.tsx', 'utf8')
const home = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const vercel = readFileSync('vercel.json', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const urls = readFileSync('src/utils/studentCareUrl.ts', 'utf8')

assert.doesNotMatch(sql, /TRUNCATE TABLE/i)
assert.doesNotMatch(sql, /DROP TABLE/i)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(sql, /INSERT INTO storage\.buckets[\s\S]{0,80}admission-strategy/)
assert.doesNotMatch(sql, /bucket_id = 'admission-strategy'/)
assert.doesNotMatch(sql, /FROM public\.class_today_report_common/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,180}FOR INSERT\s+TO anon/)
assert.doesNotMatch(hubStorage, /voice-transcribe/)
assert.equal(voice.includes('handleHubStorage'), false)

assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.class_hub_assignments/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.hub_learning_materials/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.hub_learning_material_pages/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.hub_videos/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.question_attachments/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.student_hub_inbox/)
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.hub_inbox_attachments/)
assert.match(sql, /ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'parent'/)
assert.match(sql, /hub-learning-materials/)
assert.match(sql, /hub-question-attachments/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_student_hub_identity\(text\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_student_hub_bundle\(text\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.submit_student_question/)
assert.match(sql, /p_kind NOT IN \('material_request', 'suggestion'\)/)
assert.match(sql, /video\/mp4/)
assert.match(sql, /video\/quicktime/)
assert.match(sql, /video\/webm/)
assert.match(sql, /p_byte_size > 41943040/)
assert.match(sql, /p_duration_ms, 0\) > 60000/)
assert.match(sql, /v_count >= 5/)
assert.match(sql, /v_video_count >= 1/)
assert.match(sql, /REVOKE ALL ON TABLE public\.%I FROM anon/)
assert.match(sql, /'class_hub_assignments'/)
assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/)
assert.match(sql, /'name', v_student\.name/)
assert.match(sql, /'school', v_student\.school/)
assert.match(sql, /'grade', v_student\.grade/)
assert.match(sql, /'class_name', v_student\.class_name/)
assert.doesNotMatch(sql, /get_student_hub_identity[\s\S]{0,800}phone/)
assert.doesNotMatch(sql, /get_student_hub_identity[\s\S]{0,800}memo/)
assert.match(sql, /q\.source = 'student'/)
assert.match(sql, /AND a\.student_id IS NULL/)
assert.match(sql, /public\._notice_visible_to_student/)
assert.match(sql, /public\._schedule_grid_visible_to_student/)
assert.match(sql, /timestamps/)

assert.match(app, /path="\/hub\/:studentAccessKey"/)
assert.match(app, /path="teacher\/student-hub"/)
assert.doesNotMatch(app, /for=student/)
assert.doesNotMatch(app, /CarePwaLaunchPage/)
assert.match(home, /주간 SUMMARY/)
assert.match(home, /오늘의 과제/)
assert.match(home, /문제 자료실/)
assert.match(home, /영상 자료실/)
assert.match(home, /질문방/)
assert.match(home, /자료 요청실/)
assert.match(home, /시간표 안내/)
assert.match(home, /공지사항/)
assert.match(home, /건의사항/)
assert.match(home, /grid-cols-3/)
assert.match(hubQuestions, /STUDENT_QUESTION_CATEGORIES/)
assert.equal(STUDENT_QUESTION_CATEGORIES.includes('상담요청' as never), false)
assert.match(parentRpc, /record\.source !== 'student'/)
assert.match(parentRecords, /record\.source !== 'student'/)
assert.match(questionsPage, /sourceFilter/)
assert.match(urls, /HUB_PATH_PREFIX = '\/hub\/'/)
assert.match(vercel, /\/hub\/manifest.webmanifest/)
assert.match(vercel, /\/hub\/sw\.js/)
assert.match(indexHtml, /isHub/)
assert.match(hubStorage, /hub-question-attachments/)
assert.match(hubStorage, /hub-learning-materials/)
assert.match(hubStorage, /authorize_hub_storage_path/)

assert.equal(parseYoutubeVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk')
assert.equal(parseYoutubeVideoId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk')
assert.equal(parseYoutubeVideoId('not-a-url'), null)
assert.equal(youtubeEmbedUrl('abcdefghijk'), 'https://www.youtube-nocookie.com/embed/abcdefghijk')
assert.equal(
  youtubeEmbedUrl('abcdefghijk', 90),
  'https://www.youtube-nocookie.com/embed/abcdefghijk?start=90',
)
assert.deepEqual(parseTimestampLines('1:30 이차함수\n0:05 도입'), [
  { label: '이차함수', seconds: 90 },
  { label: '도입', seconds: 5 },
])

console.log('studentLearningHubV1.test.ts passed')
