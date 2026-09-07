/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerListRows.test.ts
 */
import assert from 'node:assert/strict'
import { buildCareerListRows, filterCareerListRows } from './careerListRows.ts'
import type { TeacherCareerSession } from '../api/careerAssessmentApi.ts'

const student = {
  id: 's1',
  name: '김민수',
  studentAccessKey: 'k',
  accessKeyActive: true,
  school: '양지고',
  grade: '고1' as const,
  studentPhone: '',
  parentPhone: '',
  className: '고1 수학A',
  subjects: ['수학'],
  teacher: '',
  enrollmentDate: '2026-01-01',
  status: '재원' as const,
  memo: '',
  createdAt: '',
  updatedAt: '',
}

const guestSession: TeacherCareerSession = {
  id: 'gs1',
  studentId: null,
  guestId: 'g1',
  guestName: '상담생 테스트',
  guestSchool: 'HYPER TEST',
  guestGrade: '고1',
  linkedStudentId: null,
  accessToken: 'tok',
  status: 'completed',
  answeredCount: 88,
  latestResultId: 'r1',
  completedAt: '2026-09-06',
  createdAt: '2026-09-06',
}

const rows = buildCareerListRows({ students: [student], sessions: [guestSession] })
assert.equal(rows.length, 2)
assert.equal(rows.some((row) => row.kind === 'guest' && row.name === '상담생 테스트'), true)

const guestsOnly = filterCareerListRows(rows, {
  search: '상담생',
  school: '',
  grade: '',
  className: '',
  status: '재원',
  kind: 'guest',
})
assert.equal(guestsOnly.length, 1)

const enrolledDefault = filterCareerListRows(rows, {
  search: '',
  school: '',
  grade: '',
  className: '',
  status: '재원',
  kind: '',
})
assert.equal(enrolledDefault.length, 2)

const studentSession: TeacherCareerSession = {
  id: 'ss1',
  studentId: 's1',
  guestId: null,
  guestName: null,
  guestSchool: null,
  guestGrade: null,
  linkedStudentId: null,
  accessToken: 'stok',
  status: 'in_progress',
  answeredCount: 10,
  latestResultId: null,
  completedAt: null,
  createdAt: '2026-09-07',
}
const withSession = buildCareerListRows({ students: [student], sessions: [studentSession] })
assert.equal(withSession.find((row) => row.kind === 'student')?.session?.id, 'ss1')
const afterDelete = buildCareerListRows({ students: [student], sessions: [] })
assert.equal(afterDelete.find((row) => row.kind === 'student')?.id, 's1')
assert.equal(afterDelete.find((row) => row.kind === 'student')?.session, undefined)
assert.equal(afterDelete.some((row) => row.kind === 'guest'), false)

console.log('careerListRows tests OK')
