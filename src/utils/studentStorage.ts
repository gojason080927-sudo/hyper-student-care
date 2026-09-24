import type { Student, StudentFormData } from '../types/student'
import { createId } from './id'
import {
  generateUniqueStudentAccessKey,
  hasStudentAccessKey,
  STUDENT_ACCESS_KEY_MAX_RETRIES,
} from './studentAccessKey'
import { classDaysForSave } from './subjectClassDays'

function subjectToSubjects(subject: string): string[] {
  return [subject]
}

function createStudentFromForm(data: StudentFormData): Student {
  const now = new Date().toISOString()
  return {
    id: createId(),
    name: data.name.trim(),
    school: data.school.trim(),
    grade: data.grade,
    studentPhone: data.studentPhone.trim(),
    parentPhone: data.parentPhone.trim(),
    className: data.className.trim(),
    subjects: subjectToSubjects(data.subject),
    teacher: data.teacher.trim(),
    enrollmentDate: data.enrollmentDate,
    status: data.status,
    memo: data.memo.trim(),
    ...savedClassDays(data),
    studentAccessKey: generateUniqueStudentAccessKey([]),
    accessKeyActive: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function findStudentByAccessKeyRaw(
  students: Student[],
  accessKey: string,
): Student | undefined {
  if (!accessKey) return undefined
  const normalized = accessKey.trim()
  return students.find((student) => student.studentAccessKey.trim() === normalized)
}

/** 활성 링크인 학생만 (학부모 데이터 스코핑용) */
export function getStudentByAccessKey(
  students: Student[],
  accessKey: string,
): Student | undefined {
  const student = findStudentByAccessKeyRaw(students, accessKey)
  if (!student || student.accessKeyActive === false) return undefined
  return student
}

export function formDataToStudentUpdate(
  existing: Student,
  data: StudentFormData,
): Student {
  return {
    ...existing,
    name: data.name.trim(),
    school: data.school.trim(),
    grade: data.grade,
    studentPhone: data.studentPhone.trim(),
    parentPhone: data.parentPhone.trim(),
    className: data.className.trim(),
    subjects: subjectToSubjects(data.subject),
    teacher: data.teacher.trim(),
    enrollmentDate: data.enrollmentDate,
    status: data.status,
    memo: data.memo.trim(),
    ...savedClassDays(data),
    updatedAt: new Date().toISOString(),
  }
}

function savedClassDays(data: StudentFormData) {
  const saved = classDaysForSave(
    data.subject,
    data.mathClassDays ?? null,
    data.englishClassDays ?? null,
  )
  if (saved.overlap.length > 0) {
    throw new Error('같은 요일에 수학과 영어를 함께 지정할 수 없습니다.')
  }
  return {
    mathClassDays: saved.mathClassDays,
    englishClassDays: saved.englishClassDays,
  }
}

export function ensureUniqueStudentAccessKey(
  students: Student[],
  excludeId: string,
): string {
  const used = students
    .filter((student) => student.id !== excludeId && hasStudentAccessKey(student.studentAccessKey))
    .map((s) => s.studentAccessKey)
  return generateUniqueStudentAccessKey(used, STUDENT_ACCESS_KEY_MAX_RETRIES)
}

export function isStudentAccessKeyValid(key: unknown): boolean {
  return hasStudentAccessKey(key)
}

export { createStudentFromForm, hasStudentAccessKey }
