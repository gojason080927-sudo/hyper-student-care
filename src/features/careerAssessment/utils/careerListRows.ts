import type { Student } from '../../../types/student'
import type { TeacherCareerSession } from '../api/careerAssessmentApi'

export const CAREER_GUEST_GRADES = [
  '초5',
  '초6',
  '중1',
  '중2',
  '중3',
  '고1',
  '고2',
  '고3',
  '기타',
] as const

export type CareerPersonKind = 'student' | 'guest'
export type CareerKindFilter = '' | 'student' | 'guest'

export type CareerListRow = {
  key: string
  kind: CareerPersonKind
  id: string
  name: string
  school: string
  grade: string
  className: string
  studentStatus: string
  linkedStudentId: string | null
  linkedStudentName: string | null
  session?: TeacherCareerSession
}

export type CareerListFilters = {
  search: string
  school: string
  grade: string
  className: string
  status: string
  kind: CareerKindFilter
}

export function buildCareerListRows(input: {
  students: Student[]
  sessions: TeacherCareerSession[]
}): CareerListRow[] {
  const sessionByStudent = new Map<string, TeacherCareerSession>()
  const guestRows: CareerListRow[] = []

  for (const session of input.sessions) {
    if (session.guestId) {
      guestRows.push({
        key: `guest:${session.guestId}`,
        kind: 'guest',
        id: session.guestId,
        name: session.guestName ?? '상담생',
        school: session.guestSchool ?? '',
        grade: session.guestGrade ?? '',
        className: '상담생',
        studentStatus: '',
        linkedStudentId: session.linkedStudentId,
        linkedStudentName: null,
        session,
      })
      continue
    }
    if (!session.studentId) continue
    const current = sessionByStudent.get(session.studentId)
    if (!current || session.createdAt > current.createdAt) {
      sessionByStudent.set(session.studentId, session)
    }
  }

  const studentRows = input.students.map((student) => ({
    key: `student:${student.id}`,
    kind: 'student' as const,
    id: student.id,
    name: student.name,
    school: student.school,
    grade: student.grade,
    className: student.className,
    studentStatus: student.status,
    linkedStudentId: null,
    linkedStudentName: null,
    session: sessionByStudent.get(student.id),
  }))

  const linkedNames = new Map(input.students.map((student) => [student.id, student.name]))
  for (const row of guestRows) {
    if (row.linkedStudentId) {
      row.linkedStudentName = linkedNames.get(row.linkedStudentId) ?? '연결됨'
    }
  }

  return [...studentRows, ...guestRows]
}

export function filterCareerListRows(rows: CareerListRow[], filters: CareerListFilters): CareerListRow[] {
  const query = filters.search.trim().toLowerCase()
  return rows.filter((row) => {
    if (filters.kind === 'student' && row.kind !== 'student') return false
    if (filters.kind === 'guest' && row.kind !== 'guest') return false
    if (query) {
      const hay = `${row.name} ${row.school}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    if (filters.school && row.school !== filters.school) return false
    if (filters.grade && row.grade !== filters.grade) return false
    if (filters.className && row.kind === 'student' && row.className !== filters.className) return false
    if (filters.status && row.kind === 'student' && row.studentStatus !== filters.status) return false
    return true
  })
}
