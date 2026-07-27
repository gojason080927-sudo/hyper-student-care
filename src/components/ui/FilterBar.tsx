import type { StudentFilters } from '../../types'
import { GRADES, SUBJECTS } from '../../utils/labels'
import { getUniqueClassNames, getUniqueSchools } from '../../utils/filters'
import type { Student } from '../../types/student'

type FilterBarProps = {
  students: Student[]
  filters: StudentFilters
  onChange: (filters: StudentFilters) => void
  showDate?: boolean
  date?: string
  onDateChange?: (date: string) => void
}

export function FilterBar({
  students,
  filters,
  onChange,
  showDate,
  date,
  onDateChange,
}: FilterBarProps) {
  const schools = getUniqueSchools(students)
  const classNames = getUniqueClassNames(students)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {showDate && (
          <div>
            <label htmlFor="filter-date" className="mb-1.5 block text-sm font-medium text-slate-600">
              날짜
            </label>
            <input
              id="filter-date"
              type="date"
              value={date}
              onChange={(e) => onDateChange?.(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
        )}
        <div>
          <label htmlFor="filter-search" className="mb-1.5 block text-sm font-medium text-slate-600">
            이름 검색
          </label>
          <input
            id="filter-search"
            type="search"
            placeholder="학생 이름"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="filter-school" className="mb-1.5 block text-sm font-medium text-slate-600">
            학교
          </label>
          <select
            id="filter-school"
            value={filters.school}
            onChange={(e) => onChange({ ...filters, school: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {schools.map((school) => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-grade" className="mb-1.5 block text-sm font-medium text-slate-600">
            학년
          </label>
          <select
            id="filter-grade"
            value={filters.grade}
            onChange={(e) => onChange({ ...filters, grade: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-class" className="mb-1.5 block text-sm font-medium text-slate-600">
            반/과정
          </label>
          <select
            id="filter-class"
            value={filters.className}
            onChange={(e) => onChange({ ...filters, className: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {classNames.map((cn) => (
              <option key={cn} value={cn}>{cn}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-subject" className="mb-1.5 block text-sm font-medium text-slate-600">
            과목
          </label>
          <select
            id="filter-subject"
            value={filters.subject}
            onChange={(e) => onChange({ ...filters, subject: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
