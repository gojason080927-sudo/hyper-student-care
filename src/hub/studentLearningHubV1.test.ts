/**
 * 실행: npx tsx src/hub/studentLearningHubV1.test.ts
 *
 * Student Learning Hub V1 — SQL 안전성 · 라우트 · URL · YouTube 파서 정적 검증.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { parseTimestampLines, parseYoutubeVideoId, youtubeEmbedUrl } from './youtube.ts'
import { STUDENT_QUESTION_CATEGORIES } from './types.ts'
import { classifyHubUpload, isHubFileAllowed } from './hubFilePolicy.ts'
import { canStudentSignHubMaterialPath, hubAudienceSelectionError, isHubAudienceVisible } from './hubAudience.ts'

const sql = readFileSync('supabase/student-learning-hub-v1-migration.sql', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const voice = readFileSync('api/voice-transcribe.ts', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
const parentRecords = readFileSync('src/hooks/useParentStudentRecords.ts', 'utf8')
const questionsPage = readFileSync('src/pages/QuestionsPage.tsx', 'utf8')
const mobileQuestions = readFileSync('src/pages/teacherMobile/TeacherMobileQuestionsPage.tsx', 'utf8')
const recordCard = readFileSync('src/components/question/QuestionRecordCard.tsx', 'utf8')
const hubQuestions = readFileSync('src/hub/HubQuestionsPage.tsx', 'utf8')
const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubVideos = readFileSync('src/hub/HubVideosPage.tsx', 'utf8')
const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const hubRefresh = readFileSync('src/hub/useHubContentRefresh.ts', 'utf8')
const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
const teacherSidebar = readFileSync('src/components/Sidebar.tsx', 'utf8')
const teacherDashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const teacherMobileHome = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
const teacherMobileMore = readFileSync('src/pages/teacherMobile/TeacherMobileMorePage.tsx', 'utf8')
const teacherMobileNav = readFileSync('src/components/teacherMobile/TeacherMobileBottomNav.tsx', 'utf8')
const mappers = readFileSync('src/lib/db/mappers.ts', 'utf8')
const home = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const vercel = readFileSync('vercel.json', 'utf8')
const indexHtml = readFileSync('index.html', 'utf8')
const urls = readFileSync('src/utils/studentCareUrl.ts', 'utf8')
const hubMiddleware = readFileSync('middleware.ts', 'utf8')

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
assert.match(app, /path="teacher\/student-hub-share"/)
assert.match(app, /path="student-hub"/)
assert.match(app, /path="student-hub-share"/)
assert.match(app, /TeacherMobilePageShell title="학생 학습자료"/)
assert.match(teacherSidebar, /label: '학생 학습자료'/)
assert.match(teacherSidebar, /path: '\/teacher\/student-hub'/)
assert.match(teacherSidebar, /path: '\/teacher\/student-hub-share'/)
assert.match(teacherDashboard, /title: '학생 학습자료'/)
assert.match(teacherDashboard, /title: '학생 Hub 배포'/)
assert.match(teacherDashboard, /학생 앱의 문제 자료·영상 자료/)
assert.match(teacherMobileHome, /title: '학생 학습자료'/)
assert.match(teacherMobileHome, /to: '\/teacher\/mobile\/student-hub'/)
assert.match(teacherMobileHome, /to: '\/teacher\/mobile\/student-hub-share'/)
assert.match(teacherMobileMore, /label: '학생 학습자료'/)
assert.match(teacherMobileMore, /label: '학생 Hub 배포'/)
assert.match(
  teacherMobileMore,
  /const links = \[\s*\{ to: '\/teacher\/mobile\/student-hub', label: '학생 학습자료'/,
)
assert.doesNotMatch(teacherMobileNav, /student-hub/)
assert.match(teacherCms, /title="학생 학습자료"/)
assert.match(teacherCms, /label: '문제 자료'/)
assert.match(teacherCms, /label: '영상 자료'/)
assert.match(teacherCms, /useState<Tab>\('materials'\)/)
assert.match(teacherCms, /label: '문제 자료'/)
assert.match(teacherCms, /반 공통 오늘 과제/)
assert.doesNotMatch(teacherCms, /반 과제 게시/)
assert.doesNotMatch(teacherCms, /teacherSaveAssignment/)
assert.doesNotMatch(teacherCms, /teacherFetchAssignments/)
assert.doesNotMatch(teacherCms, /id: 'assignments'/)
assert.doesNotMatch(teacherCms, /학생 앱 연결은 다음 단계에서/)
assert.match(teacherRepo, /teacherSaveAssignment/)
assert.match(teacherRepo, /\.from\('class_hub_assignments'\)/)
assert.match(teacherRepo, /teacherUploadMaterial/)
assert.match(teacherRepo, /teacherSaveVideo/)
assert.doesNotMatch(app, /for=student/)
assert.doesNotMatch(app, /CarePwaLaunchPage/)
assert.match(teacherCms, /min-h-11 rounded-full/)
assert.match(teacherCms, /flex flex-wrap gap-2/)
assert.match(teacherCms, /option value="all"/)
assert.match(teacherCms, /option value="grade"/)
assert.match(teacherCms, /option value="class"/)
assert.match(teacherCms, /option value="student"/)
assert.match(teacherCms, /HUB_MATERIAL_ACCEPT/)
assert.match(teacherCms, /parseYoutubeVideoId/)
assert.match(home, /HubInstallGuide/)
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
assert.match(home, /My Study Plan/)
assert.match(home, /나만의 학습 계획 관리/)
assert.match(home, /hub-hero/)
assert.match(home, /HUB_ACADEMY_LOGO_WEBP/)
assert.match(app, /path="study-plan"/)
assert.match(hubQuestions, /STUDENT_QUESTION_CATEGORIES/)
assert.equal(STUDENT_QUESTION_CATEGORIES.includes('상담요청' as never), false)
assert.match(parentRpc, /record\.source !== 'student'/)
assert.match(parentRecords, /record\.source !== 'student'/)
assert.match(questionsPage, /sourceFilter/)
assert.match(urls, /HUB_PATH_PREFIX = '\/hub\/'/)
assert.match(vercel, /\/hub\/manifest.webmanifest/)
assert.match(vercel, /\/hub\/sw\.js/)
assert.match(indexHtml, /isHub/)
assert.match(hubMiddleware, /patchIndexHtmlForHub/)
assert.match(hubMiddleware, /\/hub\/manifest.webmanifest\?v=20-installable/)
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

assert.match(sql, /DROP POLICY IF EXISTS hub_learning_materials_student_published_pages/)
assert.doesNotMatch(sql, /CREATE POLICY hub_learning_materials_student_published_pages/)
assert.match(sql, /CREATE OR REPLACE FUNCTION public\._hub_file_allowed/)
assert.match(sql, /REVOKE ALL ON FUNCTION public\._hub_file_allowed/)
assert.match(sql, /application\/octet-stream/)
assert.match(sql, /application\/msword/)
assert.match(sql, /application\/vnd\.ms-powerpoint/)
assert.match(sql, /IF NOT public\._hub_file_allowed\(p_kind, p_mime, v_ext\)/)
assert.match(sql, /public\._hub_audience_visible/)
assert.match(sql, /m\.source_file_path = p_path/)
assert.match(sql, /p\.asset_path = p_path/)
assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\._hub_file_allowed/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,180}FOR INSERT\s+TO anon/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,220}FOR SELECT\s+TO anon/)
assert.doesNotMatch(hubMaterials, /createSignedUrl/)
assert.match(hubMaterials, /downloadHubObjectBlob/)
assert.match(hubMaterials, /downloadHubObjectUrl/)
assert.match(hubMaterials, /openHubMaterialInSystemViewer/)
assert.match(hubMaterials, /downloadHubMaterialFile/)
assert.doesNotMatch(hubMaterials, /window\.open/)
assert.doesNotMatch(hubMaterials, /window\.print/)
assert.doesNotMatch(hubMaterials, /target=_blank/)
assert.doesNotMatch(hubMaterials, /renderPdfFileToPages/)
assert.match(hubRefresh, /export function useHubContentRefresh/)
assert.match(hubRefresh, /visibilitychange/)
assert.match(hubRefresh, /pageshow/)
assert.doesNotMatch(hubRefresh, /location\.pathname/)
assert.match(hubMaterials, /useHubContentRefresh\(reload\)/)
assert.match(hubVideos, /useHubContentRefresh\(reload\)/)
assert.match(hubLayout, /}, \[accessKey\]\)/)
assert.match(hubLayout, /\[accessKey, location\.pathname\]/)
assert.doesNotMatch(hubLayout, /\[mode, location\.pathname\]/)
assert.match(hubLayout, /hubRouteReloadNeeded/)
assert.match(hubLayout, /setBundle\(undefined\)/)
assert.doesNotMatch(hubLayout, /useHubContentRefresh/)
assert.match(hubStorage, /payload\.action === 'file'/)
assert.match(hubStorage, /arrayBuffer/)
assert.match(teacherCms, /hubAudienceSelectionError/)
assert.match(teacherCms, /자료 업로드에 실패했습니다/)
assert.match(teacherCms, /catch \(err\)/)
assert.match(sql, /IF p_audience_type = 'class'/)
assert.match(sql, /IF v_target = v_trimmed THEN/)
assert.match(questionsPage, /teacherFetchQuestionAttachments/)
assert.match(questionsPage, /QuestionRecordCard/)
assert.match(mobileQuestions, /QuestionStorageAttachments/)
assert.match(recordCard, /QuestionStorageAttachments/)
assert.match(teacherCms, /수정 저장/)
assert.match(teacherCms, /teacherUpdateMaterialMetadata/)
assert.match(teacherCms, /파일 교체는 새 자료/)
assert.match(teacherRepo, /teacherUpdateMaterialMetadata/)
assert.match(teacherRepo, /teacherFetchQuestionAttachments/)
assert.match(hubQuestions, /classifyHubUpload/)

const questionToRowSrc = mappers.slice(
  mappers.indexOf('export function questionToRow'),
  mappers.indexOf('export function questionFromRow'),
)
assert.match(questionToRowSrc, /export function questionToRow/)
assert.doesNotMatch(questionToRowSrc, /\bsource\b/)
assert.match(mappers, /source: row\.source === 'student' \? 'student' : 'parent'/)

const studentA = { id: 'stu-a', grade: '중1', className: '1반' }
const studentB = { id: 'stu-b', grade: '중1', className: '2반' }
const gradeOnly = { audienceType: 'grade' as const, targetGrade: '중1', targetClassName: null, targetStudentId: null }
const classA = { audienceType: 'class' as const, targetGrade: '중1', targetClassName: '1반', targetStudentId: null }
const classB = { audienceType: 'class' as const, targetGrade: '중1', targetClassName: '2반', targetStudentId: null }
const oneStudent = { audienceType: 'student' as const, targetGrade: '중1', targetClassName: '1반', targetStudentId: 'stu-a' }
assert.equal(isHubAudienceVisible({ audienceType: 'all', targetGrade: null, targetClassName: null, targetStudentId: null }, studentA), true)
assert.equal(isHubAudienceVisible({ audienceType: 'all', targetGrade: null, targetClassName: null, targetStudentId: null }, studentB), true)
assert.equal(isHubAudienceVisible(gradeOnly, studentA), true)
assert.equal(isHubAudienceVisible({ ...gradeOnly, targetGrade: '중2' }, studentA), false)
assert.equal(isHubAudienceVisible(classA, studentA), true)
assert.equal(isHubAudienceVisible(classA, studentB), false)
assert.equal(isHubAudienceVisible(classB, studentA), false)
assert.equal(isHubAudienceVisible(oneStudent, studentA), true)
assert.equal(isHubAudienceVisible(oneStudent, studentB), false)
assert.equal(
  isHubAudienceVisible(
    { audienceType: 'class', targetGrade: '', targetClassName: '고1 수학B', targetStudentId: null },
    { id: 'stu-c', grade: '고1', className: '고1 수학B' },
  ),
  false,
  'TS class audience requires grade; empty grade must not look visible client-side',
)
assert.equal(
  isHubAudienceVisible(
    { audienceType: 'grade', targetGrade: null, targetClassName: null, targetStudentId: null },
    { id: 'stu-c', grade: '고1', className: '고1 수학B' },
  ),
  false,
)
assert.equal(hubAudienceSelectionError({ audienceType: 'all', targetGrade: '', targetClassName: '', targetStudentId: '' }), null)
assert.equal(
  hubAudienceSelectionError({ audienceType: 'grade', targetGrade: '고1', targetClassName: '', targetStudentId: '' }),
  null,
)
assert.equal(
  hubAudienceSelectionError({ audienceType: 'grade', targetGrade: '', targetClassName: '', targetStudentId: '' }),
  '학년을 선택해 주세요.',
)
assert.equal(
  hubAudienceSelectionError({ audienceType: 'class', targetGrade: '고1', targetClassName: '', targetStudentId: '' }),
  '반을 선택해 주세요.',
)
assert.equal(
  hubAudienceSelectionError({
    audienceType: 'class',
    targetGrade: '고1',
    targetClassName: '고1 수학B',
    targetStudentId: '',
  }),
  null,
)
assert.equal(
  hubAudienceSelectionError({ audienceType: 'student', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: '' }),
  '학생을 선택해 주세요.',
)

const classBMaterial = {
  status: 'PUBLISHED' as const,
  sourceFilePath: 'mat-b/source/file.pdf',
  pages: [{ pageNumber: 1, assetPath: 'mat-b/pages/001.jpg', width: 100, height: 100 }],
  ...classB,
}
assert.equal(
  canStudentSignHubMaterialPath({ material: classBMaterial, student: studentA, path: 'mat-b/pages/001.jpg' }),
  false,
  'preview page must not bypass class audience',
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classBMaterial, student: studentA, path: 'mat-b/source/file.pdf' }),
  false,
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classBMaterial, student: studentB, path: 'mat-b/pages/001.jpg' }),
  true,
)
assert.equal(
  canStudentSignHubMaterialPath({
    material: { ...classBMaterial, status: 'DRAFT' },
    student: studentB,
    path: 'mat-b/pages/001.jpg',
  }),
  false,
)
assert.equal(
  canStudentSignHubMaterialPath({
    material: {
      status: 'PUBLISHED',
      sourceFilePath: 'mat-all/source.pdf',
      pages: [{ pageNumber: 1, assetPath: 'mat-all/pages/001.jpg', width: null, height: null }],
      audienceType: 'all',
      targetGrade: null,
      targetClassName: null,
      targetStudentId: null,
    },
    student: studentA,
    path: 'mat-all/pages/001.jpg',
  }),
  true,
)
assert.equal(
  canStudentSignHubMaterialPath({
    material: {
      status: 'PUBLISHED',
      sourceFilePath: 'mat-stu/source.pdf',
      pages: [{ pageNumber: 1, assetPath: 'mat-stu/pages/001.jpg', width: null, height: null }],
      ...oneStudent,
    },
    student: studentB,
    path: 'mat-stu/pages/001.jpg',
  }),
  false,
)

function okFile(name: string, type = '') {
  const decision = classifyHubUpload({ name, type })
  assert.equal(decision.ok, true, `${name} / ${type || '(empty)'} should be allowed`)
  return decision
}
function rejectFile(name: string, type = '') {
  const decision = classifyHubUpload({ name, type })
  assert.equal(decision.ok, false, `${name} / ${type || '(empty)'} should be rejected`)
}

okFile('note.hwp', '')
okFile('note.hwp', 'application/octet-stream')
okFile('note.hwpx', '')
okFile('report.doc', '')
okFile('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
okFile('slides.ppt', '')
okFile('slides.pptx', '')
okFile('sheet.xlsx', 'application/octet-stream')
okFile('file.pdf', '')
okFile('pic.jpg', '')
okFile('pic.jpeg', 'image/jpeg')
okFile('pic.png', '')
okFile('pic.webp', '')
okFile('clip.mp4', 'video/mp4')
okFile('clip.mov', '')
okFile('clip.mov', 'video/quicktime')
okFile('clip.webm', 'video/webm')
okFile('photo.PNG', '')
okFile('scan.PDF', 'application/pdf')

rejectFile('setup.exe', '')
rejectFile('app.apk', 'application/vnd.android.package-archive')
rejectFile('run.bat', '')
rejectFile('run.cmd', '')
rejectFile('hack.sh', '')
rejectFile('payload.js', 'application/javascript')
rejectFile('payload.js', 'text/javascript')
rejectFile('note.docx', 'application/pdf')
rejectFile('photo.jpg', 'application/pdf')
rejectFile('file.pdf', 'image/jpeg')
rejectFile('virus.exe', 'application/octet-stream')
rejectFile('noext', '')
assert.equal(isHubFileAllowed('file', 'application/octet-stream', 'docx'), true)
assert.equal(isHubFileAllowed('file', 'application/pdf', 'docx'), false)
assert.equal(isHubFileAllowed('image', '', 'png'), true)
assert.equal(isHubFileAllowed('video', '', 'mov'), true)

assert.match(sql, /SET search_path = public/)
assert.match(sql, /v_student_id := public\._parent_active_student_id\(p_access_key\)/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_student_hub_identity\(text\) TO anon/)
assert.match(hubStorage, /authorize_hub_storage_path/)
assert.match(hubStorage, /createSignedUrl/)
assert.match(hubStorage, /hub-question-attachments/)
assert.match(sql, /public = false/)

console.log('studentLearningHubV1.test.ts passed')
