/**
 * 실행: npx tsx src/lib/teacherContentLibrary.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  emptyTeacherContentLibraryDraft,
  filterTeacherContentLibraryItems,
  normalizeTeacherContentLibraryUrl,
  parseTeacherContentLibraryTags,
  resolveTeacherContentLibraryKind,
  teacherContentLibraryDraftError,
  teacherContentLibraryFileError,
  teacherContentLibraryItemFromRow,
} from './teacherContentLibrary.ts'
import type { TeacherContentLibraryItem } from '../types/teacherContentLibrary.ts'

const sql = readFileSync('supabase/teacher-content-library-migration.sql', 'utf8')
const sqlBody = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')
const app = readFileSync('src/App.tsx', 'utf8')
const page = readFileSync('src/pages/teacher/TeacherContentLibraryPage.tsx', 'utf8')
const repo = readFileSync('src/lib/teacherContentLibrary.ts', 'utf8')
const teacherHome = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
const teacherMore = readFileSync('src/pages/teacherMobile/TeacherMobileMorePage.tsx', 'utf8')
const teacherNav = readFileSync('src/components/teacherMobile/TeacherMobileBottomNav.tsx', 'utf8')
const teacherSidebar = readFileSync('src/components/Sidebar.tsx', 'utf8')
const teacherDashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const parentHome = readFileSync('src/pages/parent/ParentStudentHomePage.tsx', 'utf8')
const parentGrid = readFileSync('src/components/parent/ParentCategoryGrid.tsx', 'utf8')
const parentNav = readFileSync('src/components/parent/parentNavItems.ts', 'utf8')
const hubHome = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
const hubRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
const envExample = readFileSync('.env.example', 'utf8')

assert.match(sqlBody, /CREATE TABLE IF NOT EXISTS public\.teacher_content_library_items/)
assert.match(sqlBody, /teacher-content-library/)
assert.match(sqlBody, /public = false/)
assert.match(sqlBody, /REVOKE ALL ON TABLE public\.teacher_content_library_items FROM anon/)
assert.match(sqlBody, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.teacher_content_library_items TO authenticated/)
assert.match(sqlBody, /TO authenticated/)
assert.match(sqlBody, /teacher_content_library_storage_teacher_all/)
assert.match(sqlBody, /bucket_id = 'teacher-content-library'/)
assert.doesNotMatch(sqlBody, /GRANT[\s\S]{0,80}TO anon/)
assert.doesNotMatch(sqlBody, /FOR SELECT\s+TO anon/)
assert.doesNotMatch(sqlBody, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(sqlBody, /CREATE OR REPLACE FUNCTION public\.get_student_hub_bundle/)
assert.doesNotMatch(sqlBody, /INSERT INTO storage\.buckets[\s\S]{0,80}admission-strategy/)
assert.doesNotMatch(sqlBody, /bucket_id = 'hub-learning-materials'/)
assert.doesNotMatch(sqlBody, /DROP TABLE/)
assert.doesNotMatch(sqlBody, /TRUNCATE/)

assert.match(app, /path="content-library"/)
assert.match(app, /path="content-library\/:itemId"/)
assert.match(app, /path="teacher\/content-library"/)
assert.match(app, /TeacherMobilePageShell title="영상·콘텐츠 자료 보관함"/)
assert.match(app, /element=\{<ProtectedRoute \/>\}[\s\S]*path="\/teacher\/mobile"[\s\S]*path="content-library"/)
assert.match(app, /element=\{<ProtectedRoute \/>\}[\s\S]*path="teacher\/content-library"/)
assert.doesNotMatch(app, /path="\/care[\s\S]{0,400}content-library/)
assert.doesNotMatch(app, /path="\/hub[\s\S]{0,400}content-library/)

assert.match(teacherHome, /to: '\/teacher\/mobile\/content-library'/)
assert.match(teacherMore, /label: '영상·콘텐츠 자료 보관함'/)
assert.match(teacherSidebar, /path: '\/teacher\/content-library'/)
assert.match(teacherDashboard, /title: '영상·콘텐츠 자료 보관함'/)
assert.doesNotMatch(teacherNav, /content-library/)
assert.doesNotMatch(parentHome, /content-library/)
assert.doesNotMatch(parentGrid, /content-library/)
assert.doesNotMatch(parentNav, /content-library/)
assert.doesNotMatch(hubHome, /content-library/)
assert.doesNotMatch(parentRpc, /teacher_content_library/)
assert.doesNotMatch(hubRepo, /teacher_content_library/)
assert.doesNotMatch(page, /VITE_SUPABASE_SERVICE_ROLE/)
assert.doesNotMatch(repo, /VITE_SUPABASE_SERVICE_ROLE/)
assert.doesNotMatch(envExample, /VITE_SUPABASE_SERVICE_ROLE/)
assert.match(repo, /createSignedUrl/)
assert.match(repo, /\.from\(TEACHER_CONTENT_LIBRARY_BUCKET\)/)
assert.match(repo, /\.from\(TEACHER_CONTENT_LIBRARY_TABLE\)/)
assert.doesNotMatch(repo, /getPublicUrl/)
assert.doesNotMatch(page, /downloadInstagram|yt-dlp|tiktok/i)
assert.match(page, /원본 URL/)
assert.match(page, /콘텐츠 메모/)
assert.match(page, /원본 열기/)
assert.match(page, /첨부파일 열기/)
assert.match(page, /제목, 메모, 태그, URL 검색/)

assert.equal(normalizeTeacherContentLibraryUrl('https://youtu.be/abc'), 'https://youtu.be/abc')
assert.equal(normalizeTeacherContentLibraryUrl('javascript:alert(1)'), null)
assert.deepEqual(parseTeacherContentLibraryTags('공부법, #TodayReport, 공부법'), ['공부법', 'TodayReport'])
assert.equal(resolveTeacherContentLibraryKind({ sourceUrl: 'https://a.com', filePath: null }), 'link')
assert.equal(resolveTeacherContentLibraryKind({ sourceUrl: null, filePath: 'id/source/a.mp4' }), 'file')
assert.equal(
  resolveTeacherContentLibraryKind({ sourceUrl: 'https://a.com', filePath: 'id/source/a.mp4' }),
  'mixed',
)

const draft = {
  ...emptyTeacherContentLibraryDraft(),
  title: '공부 습관 릴스',
  sourceUrl: 'https://www.instagram.com/reel/example/',
  category: '공부법' as const,
  memo: 'Today Report와 연결해서 블로그 작성',
}
assert.equal(teacherContentLibraryDraftError(draft, null, null), null)
assert.equal(
  teacherContentLibraryDraftError({ ...draft, title: '' }, null, null),
  '제목을 입력하세요.',
)
assert.equal(
  teacherContentLibraryDraftError({ ...draft, sourceUrl: 'ftp://example.com' }, null, null),
  '원본 URL은 http 또는 https 주소여야 합니다.',
)
assert.equal(
  teacherContentLibraryDraftError({ ...draft, sourceUrl: '' }, null, null),
  '원본 URL 또는 첨부파일 중 하나는 필요합니다.',
)

const tooBig = { name: 'clip.mp4', type: 'video/mp4', size: 52_428_801 } as File
const okFile = { name: 'note.pdf', type: 'application/pdf', size: 1024 } as File
assert.match(teacherContentLibraryFileError(tooBig) ?? '', /50MB/)
assert.equal(teacherContentLibraryFileError(okFile), null)

const items: TeacherContentLibraryItem[] = [
  teacherContentLibraryItemFromRow({
    id: 'a',
    title: '고3 수시 일정',
    source_url: 'https://example.com/a',
    content_kind: 'link',
    category: '입시정보',
    tags: ['수시'],
    memo: '블로그 초안',
    status: '미사용',
    file_path: null,
    file_name: null,
    file_mime: null,
    file_size: null,
    created_by_email: 'teacher@example.com',
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  }),
  teacherContentLibraryItemFromRow({
    id: 'b',
    title: '학부모 상담 멘트',
    source_url: null,
    content_kind: 'file',
    category: '학부모공감',
    tags: ['상담'],
    memo: '',
    status: '사용완료',
    file_path: 'b/source/note.pdf',
    file_name: 'note.pdf',
    file_mime: 'application/pdf',
    file_size: 1024,
    created_by_email: 'teacher@example.com',
    created_at: '2026-09-24T02:00:00.000Z',
    updated_at: '2026-09-24T02:00:00.000Z',
  }),
]

assert.equal(filterTeacherContentLibraryItems(items, { query: '수시', category: 'all', status: 'all' }).map((item) => item.id).join(), 'a')
assert.equal(filterTeacherContentLibraryItems(items, { query: '', category: '학부모공감', status: 'all' }).map((item) => item.id).join(), 'b')
assert.equal(filterTeacherContentLibraryItems(items, { query: '', category: 'all', status: '미사용' }).map((item) => item.id).join(), 'a')
assert.equal(filterTeacherContentLibraryItems(items, { query: '없는검색어', category: 'all', status: 'all' }).length, 0)

const afterRead = filterTeacherContentLibraryItems(items, { query: '', category: 'all', status: 'all' })
assert.equal(afterRead.length, 2)

console.log('teacherContentLibrary tests passed')
