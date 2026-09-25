/**
 * 실행: npx tsx src/pages/teacher/teacherTextbookStudio.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8')
const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const page = readFileSync('src/pages/teacher/TeacherTextbookStudioPage.tsx', 'utf8')
const mobileHome = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
const mobileMore = readFileSync('src/pages/teacherMobile/TeacherMobileMorePage.tsx', 'utf8')
const mobileNav = readFileSync('src/components/teacherMobile/TeacherMobileBottomNav.tsx', 'utf8')
const parentNav = readFileSync('src/components/parent/parentNavItems.ts', 'utf8')
const studio = readFileSync('textbooks/hyper-english/studio.html', 'utf8')

assert.match(sidebar, /path: '\/teacher\/textbook-studio'/)
assert.match(sidebar, /label: '교재 제작'/)
assert.match(dashboard, /to: '\/teacher\/textbook-studio'/)
assert.match(dashboard, /title: '교재 제작'/)
assert.match(app, /path="teacher\/textbook-studio"/)
assert.match(app, /TeacherTextbookStudioPage/)
assert.match(page, /\/textbook-studio\/studio\.html/)
assert.match(studio, /type="file"/)
assert.match(studio, /PDF로 인쇄/)
assert.match(studio, /id="preview"/)
assert.doesNotMatch(mobileHome, /textbook-studio/)
assert.doesNotMatch(mobileMore, /textbook-studio/)
assert.doesNotMatch(mobileNav, /textbook-studio/)
assert.doesNotMatch(parentNav, /textbook-studio/)
assert.doesNotMatch(app, /path="textbook-studio"/)

console.log('teacher textbook studio menu ok')
