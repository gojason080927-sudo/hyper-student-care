import { SEED_STUDENTS } from '../data/seedStudents'
import { STORAGE_KEYS } from '../storage/keys'
import { loadFromStorage, saveToStorage } from '../storage/storage'
import type { Student, StudentFormData } from '../types/student'
import { createId } from './id'
import {
  generateStudentAccessKey,
  isValidStudentAccessKey,
} from './studentAccessKey'

function subjectToSubjects(subject: string): string[] {
  return [subject]
}

function normalizeLegacyStudent(raw: Record<string, unknown>): Student | null {
  if (!raw.id || !raw.name || !raw.school || !raw.grade) return null

  const now = new Date().toISOString()
  const legacySubject = (raw.subject as string) || '수학'
  const subjects = Array.isArray(raw.subjects)
    ? (raw.subjects as string[])
    : subjectToSubjects(legacySubject)

  return {
    id: String(raw.id),
    name: String(raw.name),
    school: String(raw.school),
    grade: raw.grade as Student['grade'],
    studentPhone: String(raw.studentPhone ?? raw.phone ?? ''),
    parentPhone: String(raw.parentPhone ?? ''),
    className: String(raw.className ?? ''),
    subjects,
    teacher: String(raw.teacher ?? ''),
    enrollmentDate: String(raw.enrollmentDate ?? now.slice(0, 10)),
    status: (raw.status as Student['status']) ?? '재원',
    memo: String(raw.memo ?? ''),
    studentAccessKey: isValidStudentAccessKey(raw.studentAccessKey)
      ? String(raw.studentAccessKey)
      : generateStudentAccessKey(),
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? now),
  }
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
    studentAccessKey: generateStudentAccessKey(),
    createdAt: now,
    updatedAt: now,
  }
}

export function loadStudents(): Student[] {
  const raw = loadFromStorage<unknown[]>(STORAGE_KEYS.students, [])
  if (!Array.isArray(raw) || raw.length === 0) {
    const seeded = SEED_STUDENTS.map(createStudentFromForm)
    saveToStorage(STORAGE_KEYS.students, seeded)
    return seeded
  }

  const normalized = raw
    .map((item) => normalizeLegacyStudent(item as Record<string, unknown>))
    .filter((item): item is Student => item !== null)

  if (normalized.length === 0) {
    const seeded = SEED_STUDENTS.map(createStudentFromForm)
    saveToStorage(STORAGE_KEYS.students, seeded)
    return seeded
  }

  const withKeys = ensureUniqueStudentAccessKeys(normalized)
  if (withKeys !== normalized) {
    saveToStorage(STORAGE_KEYS.students, withKeys)
  }

  return withKeys
}

function ensureUniqueStudentAccessKeys(students: Student[]): Student[] {
  const used = new Set<string>()
  let changed = false

  const next = students.map((student) => {
    let key = isValidStudentAccessKey(student.studentAccessKey)
      ? student.studentAccessKey
      : generateStudentAccessKey()

    if (!isValidStudentAccessKey(student.studentAccessKey)) {
      changed = true
    }

    while (used.has(key)) {
      key = generateStudentAccessKey()
      changed = true
    }
    used.add(key)

    if (key === student.studentAccessKey) {
      return student
    }

    changed = true
    return { ...student, studentAccessKey: key }
  })

  return changed ? next : students
}

export function getStudentByAccessKey(
  students: Student[],
  accessKey: string,
): Student | undefined {
  if (!accessKey) return undefined
  return students.find((student) => student.studentAccessKey === accessKey)
}

export function saveStudents(students: Student[]): void {
  saveToStorage(STORAGE_KEYS.students, students)
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
    updatedAt: new Date().toISOString(),
  }
}

export { createStudentFromForm }
