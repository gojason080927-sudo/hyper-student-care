import type { Student, StudentListFilters } from '../types/student'

export function formatSubjects(subjects: string[]): string {
  return subjects.join(', ')
}

export function studentMatchesSubject(
  student: Student,
  subjectFilter: string,
): boolean {
  if (!subjectFilter) return true
  if (student.subjects.includes(subjectFilter)) return true
  if (subjectFilter === '영어' && student.subjects.includes('영어·수학')) {
    return true
  }
  if (subjectFilter === '수학' && student.subjects.includes('영어·수학')) {
    return true
  }
  return false
}

export function filterStudents(
  students: Student[],
  filters: StudentListFilters,
): Student[] {
  const query = filters.search.trim().toLowerCase()

  return students.filter((student) => {
    if (query) {
      const matchesName = student.name.toLowerCase().includes(query)
      const matchesSchool = student.school.toLowerCase().includes(query)
      if (!matchesName && !matchesSchool) return false
    }
    if (filters.school && student.school !== filters.school) return false
    if (filters.grade && student.grade !== filters.grade) return false
    if (filters.className && student.className !== filters.className) return false
    if (filters.status && student.status !== filters.status) return false
    if (!studentMatchesSubject(student, filters.subject)) return false
    return true
  })
}

export type LegacyStudentFilters = {
  search: string
  school: string
  grade: string
  className: string
  subject: string
}

export function filterStudentsLegacy(
  students: Student[],
  filters: LegacyStudentFilters,
): Student[] {
  return students.filter((student) => {
    if (filters.search && !student.name.includes(filters.search)) return false
    if (filters.school && student.school !== filters.school) return false
    if (filters.grade && student.grade !== filters.grade) return false
    if (filters.className && student.className !== filters.className) return false
    if (!studentMatchesSubject(student, filters.subject)) return false
    return true
  })
}

export function getUniqueSchools(students: Student[]): string[] {
  return [...new Set(students.map((s) => s.school))].sort()
}

export function getUniqueClassNames(students: Student[]): string[] {
  return [...new Set(students.map((s) => s.className).filter(Boolean))].sort()
}

export function sortByDateDesc<T extends { date?: string; evaluationDate?: string; createdAt: string }>(
  records: T[],
): T[] {
  return [...records].sort((a, b) => {
    const dateA = a.date ?? a.evaluationDate ?? a.createdAt
    const dateB = b.date ?? b.evaluationDate ?? b.createdAt
    return dateB.localeCompare(dateA)
  })
}
