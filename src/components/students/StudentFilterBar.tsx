import { useMemo } from 'react'
import type { Student } from '../../types/student'
import type { StudentListFilters } from '../../types/student'
import { GRADES, STUDENT_STATUSES, SUBJECTS } from '../../utils/labels'
import { getUniqueSchools } from '../../utils/filters'
import {
  collectLegacyClassNamesForGrade,
  getClassFilterOptions,
  getGradeSelectOptions,
  resolveClassNameOnGradeChange,
} from '../../utils/studentGradeClass'

type StudentFilterBarProps = {
  students: Student[]
  filters: StudentListFilters
  totalCount: number
  enrolledCount: number
  onChange: (filters: StudentListFilters) => void
}

export function StudentFilterBar({
  students,
  filters,
  totalCount,
  enrolledCount,
  onChange,
}: StudentFilterBarProps) {
  const schools = getUniqueSchools(students)
  const gradeOptions = useMemo(
    () => getGradeSelectOptions(filters.grade),
    [filters.grade],
  )
  const classOptions = useMemo(() => {
    if (!filters.grade) return []
    const legacy = collectLegacyClassNamesForGrade(students, filters.grade)
    return getClassFilterOptions(filters.grade, legacy)
  }, [filters.grade, students])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label htmlFor="student-search" className="mb-1.5 block text-sm font-medium text-slate-600">
            이름 또는 학교 검색
          </label>
          <input
            id="student-search"
            type="search"
            placeholder="학생 이름 또는 학교명"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="student-school" className="mb-1.5 block text-sm font-medium text-slate-600">학교</label>
          <select id="student-school" value={filters.school} onChange={(e) => onChange({ ...filters, school: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">전체</option>
            {schools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="student-grade" className="mb-1.5 block text-sm font-medium text-slate-600">학년</label>
          <select
            id="student-grade"
            value={filters.grade}
            onChange={(e) =>
              onChange({
                ...filters,
                grade: e.target.value,
                className: resolveClassNameOnGradeChange(e.target.value, filters.className),
              })
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
                {!GRADES.includes(g as (typeof GRADES)[number]) ? ' (기존)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="student-class" className="mb-1.5 block text-sm font-medium text-slate-600">반/과정</label>
          <select
            id="student-class"
            value={filters.className}
            onChange={(e) => onChange({ ...filters, className: e.target.value })}
            disabled={!filters.grade}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{filters.grade ? '전체' : '학년을 먼저 선택'}</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="student-status" className="mb-1.5 block text-sm font-medium text-slate-600">상태</label>
          <select id="student-status" value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">전체</option>
            {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="student-subject" className="mb-1.5 block text-sm font-medium text-slate-600">과목</label>
          <select id="student-subject" value={filters.subject} onChange={(e) => onChange({ ...filters, subject: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">전체</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <span className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          전체 학생 <strong className="ml-1.5 text-base text-navy-900">{totalCount}</strong>명
        </span>
        <span className="inline-flex items-center rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
          재원 학생 <strong className="ml-1.5 text-base text-blue-900">{enrolledCount}</strong>명
        </span>
      </div>
    </div>
  )
}
