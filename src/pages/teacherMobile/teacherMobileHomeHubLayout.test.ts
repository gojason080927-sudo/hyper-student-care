/**
 * 실행: npx tsx src/pages/teacherMobile/teacherMobileHomeHubLayout.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const home = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
const more = readFileSync('src/pages/teacherMobile/TeacherMobileMorePage.tsx', 'utf8')
const nav = readFileSync('src/components/teacherMobile/TeacherMobileBottomNav.tsx', 'utf8')
const layout = readFileSync('src/components/teacherMobile/TeacherMobileLayout.tsx', 'utf8')
const teacherTheme = readFileSync('src/styles/teacherMobileTheme.css', 'utf8')
const parentTheme = readFileSync('src/styles/parentMobileTheme.css', 'utf8')
const hubCss = readFileSync('src/hub/hub.css', 'utf8')
const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')
const parentHome = readFileSync('src/pages/parent/ParentStudentHomePage.tsx', 'utf8')
const parentGrid = readFileSync('src/components/parent/ParentCategoryGrid.tsx', 'utf8')
const hubHome = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const sw = readFileSync('public/hub/sw.js', 'utf8')
const teacherPush = readFileSync('src/components/teacherMobile/TeacherPushOptIn.tsx', 'utf8')

const tileBlock = home.slice(home.indexOf('const tiles'), home.indexOf('export function'))
const tileOrder = [...tileBlock.matchAll(/title: '([^']+)'/g)].map((match) => match[1])
assert.deepEqual(tileOrder, [
  '학생 학습자료',
  '학생 Hub 배포',
  '학생관리',
  '학습공지',
  '질문관리',
  '보강계획',
  '월간 학습진단',
  '월말평가',
  '입시전략',
])

assert.match(home, /to: '\/teacher\/mobile\/student-hub'/)
assert.match(home, /to: '\/teacher\/mobile\/student-hub-share'/)
assert.match(home, /to: '\/teacher\/mobile\/students'/)
assert.match(home, /to: '\/teacher\/mobile\/notices'/)
assert.match(home, /to: '\/teacher\/mobile\/questions'/)
assert.match(home, /to: '\/teacher\/mobile\/makeup'/)
assert.match(home, /to: '\/teacher\/mobile\/monthly-learning-reports'/)
assert.match(home, /to: '\/teacher\/mobile\/evaluation'/)
assert.match(home, /to: '\/teacher\/mobile\/admission-strategy'/)
assert.match(home, /to="\/teacher\/mobile\/today-report"/)

assert.match(home, /className="hub-hero"/)
assert.match(home, /hub-menu-grid grid grid-cols-3/)
assert.match(home, /className="hub-tile"/)
assert.match(home, /className="hub-feature-card"/)
assert.match(home, /HYPER ACADEMY/)
assert.match(home, /HUB_ACADEMY_LOGO_WEBP/)
assert.match(home, /강사 허브/)
assert.match(home, /Today Report 입력/)
assert.match(home, /출결 · 숙제 · 교재준비/)
assert.match(home, /진도 · 일일테스트 · 수업태도/)
assert.match(home, /aria-label="로그아웃"/)
assert.doesNotMatch(home, /tm-featured-card/)
assert.doesNotMatch(home, /grid-cols-2/)
assert.doesNotMatch(home, /HyperFeaturedCardWave/)

assert.match(more, /label: '신입생 평가 및 성향 진단'/)
assert.match(more, /label: '진로·학과 적성검사'/)
assert.match(more, /label: '학습진행 상황 \(교재 진도\)'/)
assert.match(more, /PC 강사용 화면/)
assert.match(more, /TeacherPushOptIn/)
assert.match(more, /label: '보강계획'/)
assert.match(more, /label: '질문하기'/)

assert.match(nav, /to: '\/teacher\/mobile'/)
assert.match(nav, /to: '\/teacher\/mobile\/today-report'/)
assert.match(nav, /to: '\/teacher\/mobile\/students'/)
assert.match(nav, /to: '\/teacher\/mobile\/evaluation'/)
assert.match(nav, /to: '\/teacher\/mobile\/more'/)
assert.match(layout, /isTeacherMobileHomePath/)
assert.match(layout, /pathname === '\/teacher\/mobile'/)
assert.match(layout, /pathname === '\/teacher\/mobile\/'/)
assert.match(layout, /isHome \? null : <TeacherMobileBottomNav/)
assert.match(layout, /pb-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/)
assert.match(teacherTheme, /\.teacher-mobile-app \.teacher-hub-home \.hub-tile/)
assert.match(teacherTheme, /min-height: 7\.55rem/)
assert.match(parentTheme, /\.parent-mobile-app \.parent-hub-home \.hub-tile/)
assert.match(hubCss, /min-height: 6\.4rem/)
assert.doesNotMatch(teacherTheme, /\.parent-hub-home \.hub-tile/)
assert.match(parentHome, /parent-hub-home/)

assert.match(dashboard, /title: '질문하기'/)
assert.match(dashboard, /to: '\/teacher\/today-report-bulk'/)
assert.doesNotMatch(dashboard, /질문관리/)
assert.doesNotMatch(dashboard, /hub-hero/)

assert.match(parentHome, /ParentCategoryGrid/)
assert.match(parentHome, /hub-hero/)
assert.match(parentGrid, /hub-feature-card/)
assert.match(parentGrid, /hub-tile/)
assert.doesNotMatch(parentGrid, /pm-featured-card/)

assert.match(hubHome, /학습 허브/)
assert.match(hubHome, /My Study Plan/)
assert.match(hubHome, /주간 SUMMARY/)
assert.match(hubHome, /질문방/)
assert.doesNotMatch(hubHome, /질문관리/)
assert.doesNotMatch(hubHome, /Today Report 입력/)

assert.match(app, /TeacherMobilePageShell title="질문하기"/)
assert.match(app, /path="makeup"/)
assert.match(sw, /url: '\/hub\/'/)
assert.match(teacherPush, /export function TeacherPushOptIn/)

console.log('teacherMobileHomeHubLayout.test.ts passed')
