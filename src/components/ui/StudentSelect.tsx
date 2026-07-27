import type { Student } from '../../types/student'
import { inputClass } from '../../utils/labels'

type StudentSelectProps = {
  students: Student[]
  value: string
  onChange: (studentId: string) => void
  error?: string
  id?: string
  label?: string
  required?: boolean
}

export function StudentSelect({
  students,
  value,
  onChange,
  error,
  id = 'student-select',
  label = '학생',
  required,
}: StudentSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(error)}
      >
        <option value="">학생 선택</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.school} · {s.grade})
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  )
}
