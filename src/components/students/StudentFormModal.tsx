import { useMemo, useState } from 'react'
import type { Student, StudentFormData, SubjectOption } from '../../types/student'
import { STUDENT_STATUSES, SUBJECTS } from '../../utils/labels'
import {
  getClassFormSelectOptions,
  getGradeSelectOptions,
  isActiveGrade,
  isStandardClassNameForGrade,
  mapLegacyClassName,
  resolveClassNameOnFormGradeChange,
  syncSubjectFromClassName,
  validateGradeClassCombination,
} from '../../utils/studentGradeClass'
import { useData } from '../../hooks/useData'
import { Modal } from '../ui/Modal'
import {
  CLASS_DAYS,
  classDaysAfterSubjectChange,
  classDaysOverlap,
  toggleClassDay,
  type ClassDay,
} from '../../utils/subjectClassDays'

type StudentFormModalProps = {
  open: boolean
  student?: Student
  onClose: () => void
  onSubmit: (data: StudentFormData) => void
}

const emptyForm: StudentFormData = {
  name: '',
  school: '',
  grade: '고1',
  studentPhone: '',
  parentPhone: '',
  subject: '수학',
  className: '',
  teacher: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  status: '재원',
  memo: '',
  mathClassDays: null,
  englishClassDays: null,
}

function studentToForm(student: Student): StudentFormData {
  const subject = (student.subjects[0] as SubjectOption | undefined) ?? '수학'
  const grade = student.grade
  const className = mapLegacyClassName(student.className, grade, subject)

  return {
    name: student.name,
    school: student.school,
    grade,
    studentPhone: student.studentPhone,
    parentPhone: student.parentPhone,
    subject,
    className,
    teacher: student.teacher,
    enrollmentDate: student.enrollmentDate,
    status: student.status,
    memo: student.memo,
    mathClassDays: student.mathClassDays ?? null,
    englishClassDays: student.englishClassDays ?? null,
  }
}

export function StudentFormModal({
  open,
  student,
  onClose,
  onSubmit,
}: StudentFormModalProps) {
  if (!open) return null

  return (
    <StudentFormModalContent
      key={student?.id ?? 'new'}
      student={student}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function StudentFormModalContent({
  student,
  onClose,
  onSubmit,
}: Omit<StudentFormModalProps, 'open'>) {
  const { isSaving } = useData()
  const [form, setForm] = useState<StudentFormData>(() =>
    student
      ? studentToForm(student)
      : { ...emptyForm, enrollmentDate: new Date().toISOString().slice(0, 10) },
  )
  const [errors, setErrors] = useState<
    Partial<Record<keyof StudentFormData, string>>
  >({})

  const gradeOptions = useMemo(
    () => getGradeSelectOptions(form.grade),
    [form.grade],
  )
  const classOptions = useMemo(
    () => getClassFormSelectOptions(form.grade, form.className),
    [form.className, form.grade],
  )

  const validate = () => {
    const next: Partial<Record<keyof StudentFormData, string>> = {}
    if (!form.name.trim()) next.name = '학생 이름을 입력해 주세요.'
    if (!form.school.trim()) next.school = '학교를 입력해 주세요.'
    if (!form.grade) next.grade = '학년을 선택해 주세요.'
    if (!form.subject) next.subject = '수강 과목을 선택해 주세요.'
    const overlap = classDaysOverlap(form.mathClassDays ?? null, form.englishClassDays ?? null)
    if (form.subject === '영어·수학' && overlap.length > 0) {
      next.mathClassDays = '같은 요일에 수학과 영어를 함께 지정할 수 없습니다.'
    }
    if (!form.className.trim()) {
      next.className = '반/과정을 선택해 주세요.'
    } else if (!validateGradeClassCombination(form.grade, form.className)) {
      next.className = '학년과 맞지 않는 반/과정입니다. 다시 선택해 주세요.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
    onClose()
  }

  const handleGradeChange = (grade: StudentFormData['grade']) => {
    setForm((prev) => ({
      ...prev,
      grade,
      className: resolveClassNameOnFormGradeChange(grade, prev.className),
    }))
  }

  const handleClassChange = (className: string) => {
    const syncedSubject = syncSubjectFromClassName(className)
    setForm((prev) => {
      const subject = syncedSubject ?? prev.subject
      return {
        ...prev,
        className,
        subject,
        ...classDaysAfterSubjectChange(subject, {
          mathClassDays: prev.mathClassDays ?? null,
          englishClassDays: prev.englishClassDays ?? null,
        }),
      }
    })
  }

  const handleSubjectChange = (subject: SubjectOption) => {
    setForm((prev) => ({
      ...prev,
      subject,
      ...classDaysAfterSubjectChange(subject, {
        mathClassDays: prev.mathClassDays ?? null,
        englishClassDays: prev.englishClassDays ?? null,
      }),
    }))
  }

  const handleToggleDay = (row: '수학' | '영어', day: ClassDay) => {
    setForm((prev) => ({
      ...prev,
      ...toggleClassDay(prev.subject, row, day, {
        mathClassDays: prev.mathClassDays ?? null,
        englishClassDays: prev.englishClassDays ?? null,
      }),
    }))
  }

  return (
    <Modal
      open
      title={student ? '학생 정보 수정' : '학생 등록'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="학생 이름" required error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="학생 이름"
              className={`${inputClass(errors.name)} min-h-11 text-base sm:text-sm`}
            />
          </Field>
          <Field label="학교" required error={errors.school}>
            <input
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              placeholder="학교명"
              className={inputClass(errors.school)}
            />
          </Field>
          <Field label="학년" required error={errors.grade}>
            <select
              value={form.grade}
              onChange={(e) =>
                handleGradeChange(e.target.value as StudentFormData['grade'])
              }
              className={inputClass(errors.grade)}
            >
              {!isActiveGrade(form.grade) && form.grade ? (
                <option value={form.grade}>{form.grade} (기존)</option>
              ) : null}
              {gradeOptions.filter((grade) => isActiveGrade(grade)).map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </Field>
          <Field label="반/과정" required error={errors.className}>
            <select
              value={form.className}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={!isActiveGrade(form.grade)}
              className={inputClass(errors.className)}
            >
              <option value="">
                {isActiveGrade(form.grade) ? '반/과정 선택' : '활성 학년을 선택해 주세요'}
              </option>
              {classOptions.map((option) => {
                const isLegacy =
                  form.className === option &&
                  !isStandardClassNameForGrade(form.grade, option)
                return (
                  <option key={option} value={option}>
                    {option}
                    {isLegacy ? ' (기존)' : ''}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="수강 과목" required error={errors.subject}>
            <select
              value={form.subject}
              onChange={(e) => handleSubjectChange(e.target.value as SubjectOption)}
              className={inputClass(errors.subject)}
            >
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </Field>
          {form.subject !== '영어' ? (
            <ClassDayField
              label="수학 수업요일"
              tone="math"
              selected={form.mathClassDays ?? []}
              error={errors.mathClassDays}
              onToggle={(day) => handleToggleDay('수학', day)}
            />
          ) : null}
          {form.subject !== '수학' ? (
            <ClassDayField
              label="영어 수업요일"
              tone="english"
              selected={form.englishClassDays ?? []}
              error={errors.englishClassDays}
              onToggle={(day) => handleToggleDay('영어', day)}
            />
          ) : null}
          <Field label="학생 연락처">
            <input
              value={form.studentPhone}
              onChange={(e) =>
                setForm({ ...form, studentPhone: e.target.value })
              }
              placeholder="010-0000-0000"
              className={inputClass()}
            />
          </Field>
          <Field label="학부모 연락처">
            <input
              value={form.parentPhone}
              onChange={(e) =>
                setForm({ ...form, parentPhone: e.target.value })
              }
              placeholder="010-0000-0000"
              className={inputClass()}
            />
          </Field>
          <Field label="담당 강사">
            <input
              value={form.teacher}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              placeholder="담당 강사명"
              className={inputClass()}
            />
          </Field>
          <Field label="등록일">
            <input
              type="date"
              value={form.enrollmentDate}
              onChange={(e) =>
                setForm({ ...form, enrollmentDate: e.target.value })
              }
              className={inputClass()}
            />
          </Field>
          <Field label="재원 상태">
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as StudentFormData['status'],
                })
              }
              className={inputClass()}
            >
              {STUDENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="메모">
          <textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            placeholder="특이사항, 학습 메모 등"
            rows={3}
            className={inputClass()}
          />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? '저장 중...' : student ? '수정 완료' : '학생 등록'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ClassDayField({
  label,
  tone,
  selected,
  error,
  onToggle,
}: {
  label: string
  tone: 'math' | 'english'
  selected: string[]
  error?: string
  onToggle: (day: ClassDay) => void
}) {
  const activeClass =
    tone === 'math'
      ? 'border-[#163A70] bg-[#eef4fc] text-[#163A70]'
      : 'border-[#0f766e] bg-[#eefbf8] text-[#0f766e]'
  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-nowrap gap-1">
        {CLASS_DAYS.map((day) => {
          const active = selected.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(day)}
              className={`min-h-9 flex-1 rounded-lg border px-1.5 py-1 text-xs font-semibold transition sm:text-sm ${
                active ? activeClass : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-1 text-sm text-rose-500">{error}</p> : null}
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  )
}

function inputClass(error?: string) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
    error
      ? 'border-rose-300 focus:border-rose-500'
      : 'border-slate-200 focus:border-blue-500'
  }`
}
