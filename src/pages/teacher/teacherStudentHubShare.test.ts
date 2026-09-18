/**
 * 실행: npx tsx src/pages/teacher/teacherStudentHubShare.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { Student } from '../../types/student.ts'
import { buildClassHubShareList, buildStudentHubShareMessage } from '../../utils/studentCareUrl.ts'
import {
  hubShareRowsForStudents,
  initialHubShareSelection,
  studentsForHubShare,
} from '../../utils/studentHubShare.ts'

const KEY_A = 'hubkeyAAAA1234567890abcd'
const KEY_B = 'hubkeyBBBB1234567890abcd'

function student(patch: Partial<Student>): Student {
  return {
    id: 's1',
    name: '김민준',
    studentAccessKey: KEY_A,
    accessKeyActive: true,
    school: '테스트중',
    grade: '중1',
    studentPhone: '',
    parentPhone: '',
    className: '중1 수학',
    subjects: ['수학'],
    teacher: '',
    enrollmentDate: '2026-03-01',
    status: '재원',
    memo: '',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...patch,
  }
}

const hubA = `https://hyper.example/hub/${KEY_A}`
const hubB = `https://hyper.example/hub/${KEY_B}`

const message = buildStudentHubShareMessage('김민준', hubA)
assert.match(message, /김민준/)
assert.match(message, /\/hub\//)
assert.doesNotMatch(message, /\/care\//)
assert.doesNotMatch(message, /access key|접근 키/)

const list = buildClassHubShareList([
  { name: '김민준', hubUrl: hubA },
  { name: '이서연', hubUrl: hubB },
])
assert.match(list, /김민준/)
assert.match(list, /이서연/)
assert.match(list, /\/hub\/hubkeyAAAA/)
assert.match(list, /\/hub\/hubkeyBBBB/)
assert.notEqual(hubA, hubB)

const roster = [
  student({ id: '1', name: '이서연', studentAccessKey: KEY_B }),
  student({ id: '2', name: '김민준', studentAccessKey: KEY_A }),
  student({ id: '3', name: '다른반', className: '중1 영어', studentAccessKey: KEY_A }),
  student({ id: '4', name: '중2학생', grade: '중2', studentAccessKey: KEY_A }),
  student({ id: '5', name: '휴원생', status: '휴원', studentAccessKey: KEY_A }),
]
const mathClass = studentsForHubShare(roster, '중1', '중1 수학')
assert.deepEqual(
  mathClass.map((item) => item.name),
  ['김민준', '이서연'],
)
assert.equal(studentsForHubShare(roster, '중1', '중1 영어')[0]?.name, '다른반')
assert.equal(studentsForHubShare(roster, '중1', '중1 수학A').length, 0)

const noKey = student({ id: '6', name: '키없음', studentAccessKey: '' })
assert.equal(hubShareRowsForStudents([noKey]).length, 0)
assert.deepEqual(
  initialHubShareSelection(new URLSearchParams('class=중1%20수학')),
  { grade: '중1', className: '중1 수학' },
)
assert.deepEqual(
  initialHubShareSelection(new URLSearchParams('grade=고2&class=고2%20영어')),
  { grade: '고2', className: '고2 영어' },
)

const urlHelper = readFileSync('src/utils/studentCareUrl.ts', 'utf8')
assert.match(urlHelper, /HUB_PATH_PREFIX = '\/hub\/'/)
assert.match(urlHelper, /CARE_PATH_PREFIX = '\/care\/'/)
assert.match(urlHelper, /export function getStudentHubUrl/)
assert.doesNotMatch(urlHelper, /getStudentHubUrl[\s\S]{0,400}CARE_PATH_PREFIX/)

const page = readFileSync('src/pages/teacher/TeacherStudentHubSharePage.tsx', 'utf8')
const card = readFileSync('src/components/students/StudentHubQrCard.tsx', 'utf8')
const shareUtil = readFileSync('src/utils/studentHubShare.ts', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8')
const panel = readFileSync('src/components/students/StudentAccessLinkPanel.tsx', 'utf8')
const parentPush = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const careShare = readFileSync('src/utils/shareStudentCareLink.ts', 'utf8')

assert.match(page, /학생 Hub 배포/)
assert.match(page, /window\.print/)
assert.match(page, /단체방에 붙여넣지 말고/)
assert.match(card, /qrcode/)
assert.match(card, /alt=\{`\$\{student\.name\} 학생 Hub QR`\}/)
assert.doesNotMatch(card, /studentAccessKey/)
assert.doesNotMatch(page, /regenerateStudentAccessKey/)
assert.doesNotMatch(page, /\/care\//)
assert.match(shareUtil, /student\.className\.trim\(\) === nextClass/)
const detail = readFileSync('src/pages/StudentDetailPage.tsx', 'utf8')
assert.match(detail, /StudentHubQrCard/)
assert.match(detail, /student-hub-share/)
assert.match(app, /path="teacher\/student-hub-share"/)
assert.match(app, /path="student-hub-share"/)
assert.match(sidebar, /path: '\/teacher\/student-hub-share'/)
assert.match(sidebar, /location\.pathname === path \|\| location\.pathname\.startsWith\(`\$\{path\}\/`\)/)
assert.doesNotMatch(sidebar, /location\.pathname\.startsWith\(path\)/)
assert.match(panel, /학생 Hub 복사/)
assert.doesNotMatch(panel, /학생 Hub: \{hubUrl/)
assert.match(parentPush, /PARENT_SW_SCOPE = '\/care\/'/)
assert.match(careShare, /buildStudentCareShareMessage/)

console.log('teacherStudentHubShare.test.ts passed')
