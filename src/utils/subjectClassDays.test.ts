/**
 * 실행: npx tsx src/utils/subjectClassDays.test.ts
 */
import assert from 'node:assert/strict'
import { studentFromRow, studentToRow } from '../lib/db/mappers.ts'
import type { Student, StudentFormData } from '../types/student.ts'
import {
  classDaysAfterSubjectChange,
  classDaysForSave,
  toggleClassDay,
} from './subjectClassDays.ts'
import { createStudentFromForm, formDataToStudentUpdate } from './studentStorage.ts'

const baseForm: StudentFormData = {
  name: '김민준',
  school: '안산고등학교',
  grade: '고2',
  studentPhone: '',
  parentPhone: '',
  subject: '영어·수학',
  className: '고2 영수',
  teacher: '',
  enrollmentDate: '2026-03-01',
  status: '재원',
  memo: '',
  mathClassDays: ['화', '목'],
  englishClassDays: ['월', '수'],
}

const legacyStudent: Student = {
  id: 'student-1',
  name: '기존학생',
  studentAccessKey: 'access-key-1',
  accessKeyActive: true,
  school: '학교',
  grade: '고2',
  studentPhone: '',
  parentPhone: '',
  className: '고2 영수',
  subjects: ['영어·수학'],
  teacher: '',
  enrollmentDate: '2025-03-01',
  status: '재원',
  memo: '',
  createdAt: '2025-03-01T00:00:00.000Z',
  updatedAt: '2025-03-01T00:00:00.000Z',
}

const legacyRow = studentToRow({
  ...legacyStudent,
  mathClassDays: null,
  englishClassDays: null,
})
assert.equal(legacyRow.math_class_days, null)
assert.equal(legacyRow.english_class_days, null)
assert.equal(legacyRow.subjects[0], '영어·수학')
assert.equal(legacyRow.class_name, '고2 영수')
assert.equal(legacyRow.student_access_key, 'access-key-1')

const fromNull = studentFromRow({
  ...legacyRow,
  math_class_days: null,
  english_class_days: null,
})
assert.equal(fromNull.mathClassDays, null)
assert.equal(fromNull.englishClassDays, null)
assert.deepEqual(fromNull.subjects, ['영어·수학'])

const untouched = formDataToStudentUpdate(fromNull, {
  ...baseForm,
  subject: '영어·수학',
  mathClassDays: null,
  englishClassDays: null,
})
assert.equal(untouched.mathClassDays, null)
assert.equal(untouched.englishClassDays, null)
assert.equal(untouched.studentAccessKey, 'access-key-1')
assert.equal(untouched.grade, '고2')
assert.equal(untouched.className, '고2 영수')
assert.deepEqual(untouched.subjects, ['영어·수학'])

const mathOnly = createStudentFromForm({
  ...baseForm,
  subject: '수학',
  mathClassDays: ['금', '월', '수'],
  englishClassDays: ['화'],
})
assert.deepEqual(mathOnly.mathClassDays, ['월', '수', '금'])
assert.equal(mathOnly.englishClassDays, null)
assert.deepEqual(mathOnly.subjects, ['수학'])

const englishOnly = createStudentFromForm({
  ...baseForm,
  subject: '영어',
  mathClassDays: ['월'],
  englishClassDays: ['토', '화', '목'],
})
assert.equal(englishOnly.mathClassDays, null)
assert.deepEqual(englishOnly.englishClassDays, ['화', '목', '토'])
assert.deepEqual(englishOnly.subjects, ['영어'])

const both = createStudentFromForm(baseForm)
assert.deepEqual(both.mathClassDays, ['화', '목'])
assert.deepEqual(both.englishClassDays, ['월', '수'])
assert.deepEqual(both.subjects, ['영어·수학'])

const saturday = createStudentFromForm({
  ...baseForm,
  subject: '수학',
  mathClassDays: ['토'],
  englishClassDays: null,
})
assert.deepEqual(saturday.mathClassDays, ['토'])

assert.throws(
  () =>
    createStudentFromForm({
      ...baseForm,
      mathClassDays: ['수'],
      englishClassDays: ['수', '금'],
    }),
  /같은 요일/,
)

const toMath = classDaysAfterSubjectChange('수학', {
  mathClassDays: ['화', '목'],
  englishClassDays: ['월', '수'],
})
assert.deepEqual(toMath.mathClassDays, ['화', '목'])
assert.equal(toMath.englishClassDays, null)

const toEnglish = classDaysAfterSubjectChange('영어', {
  mathClassDays: ['화', '목'],
  englishClassDays: ['월', '수'],
})
assert.equal(toEnglish.mathClassDays, null)
assert.deepEqual(toEnglish.englishClassDays, ['월', '수'])

const toBoth = classDaysAfterSubjectChange('영어·수학', {
  mathClassDays: ['월', '수', '금'],
  englishClassDays: null,
})
assert.deepEqual(toBoth.mathClassDays, ['월', '수', '금'])
assert.equal(toBoth.englishClassDays, null)

let days = toggleClassDay('영어·수학', '수학', '수', {
  mathClassDays: ['월', '수', '금'],
  englishClassDays: ['화', '목'],
})
assert.deepEqual(days.englishClassDays, ['화', '목'])
days = toggleClassDay('영어·수학', '영어', '수', days)
assert.deepEqual(days.mathClassDays, ['월', '금'])
assert.deepEqual(days.englishClassDays, ['화', '수', '목'])
assert.deepEqual(
  classDaysForSave('영어·수학', days.mathClassDays, days.englishClassDays).overlap,
  [],
)

const savedBoth = studentToRow(both)
assert.deepEqual(savedBoth.math_class_days, ['화', '목'])
assert.deepEqual(savedBoth.english_class_days, ['월', '수'])
assert.deepEqual(savedBoth.subjects, ['영어·수학'])
assert.equal(savedBoth.grade, '고2')

console.log('subjectClassDays.test.ts passed')
