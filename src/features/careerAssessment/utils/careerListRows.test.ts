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

console.log('careerListRows tests OK')
