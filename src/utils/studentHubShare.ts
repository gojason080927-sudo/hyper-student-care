import type { Student } from '../types/student'
import { hasStudentAccessKey } from './studentAccessKey'
import { tryGetStudentHubUrl } from './studentCareUrl'
import { parseStandardClassName } from './studentGradeClass'

export function initialHubShareSelection(searchParams: {
  get(name: string): string | null
}): { grade: string; className: string } {
  const className = (searchParams.get('class') ?? '').trim()
  const gradeParam = (searchParams.get('grade') ?? '').trim()
  if (gradeParam && className) return { grade: gradeParam, className }
  const parsed = parseStandardClassName(className)
  if (parsed) return { grade: parsed.grade, className }
  return { grade: gradeParam, className }
}

export function studentsForHubShare(
  students: Student[],
  grade: string,
  className: string,
): Student[] {
  const nextGrade = grade.trim()
  const nextClass = className.trim()
  if (!nextGrade || !nextClass) return []
  return students
    .filter(
      (student) =>
        student.status === '재원' &&
        student.grade === nextGrade &&
        student.className.trim() === nextClass,
    )
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
}

export function hubShareRowsForStudents(
  students: Student[],
): Array<{ student: Student; hubUrl: string }> {
  return students.flatMap((student) => {
    if (!hasStudentAccessKey(student.studentAccessKey)) return []
    const hubUrl = tryGetStudentHubUrl(student.studentAccessKey)
    return hubUrl ? [{ student, hubUrl }] : []
  })
}
