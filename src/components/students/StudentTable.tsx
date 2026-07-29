import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { Student } from '../../types/student'
import { formatSubjects } from '../../utils/filters'
import { getStudentStatusColor } from '../../utils/labels'
import { StatusBadge } from '../ui/StatusBadge'

type StudentTableProps = {
  students: Student[]
  onView: (student: Student) => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
}

const thClass = 'student-table-cell px-5 py-4'
const tdClass = 'student-table-cell px-5 py-4'

export function StudentTable({ students, onView, onEdit, onDelete }: StudentTableProps) {
  return (
    <>
      <div className="table-scroll hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[960px] text-left text-[15px] text-slate-700">
          <colgroup>
            <col style={{ minWidth: 140 }} />
            <col style={{ minWidth: 120 }} />
            <col style={{ minWidth: 72 }} />
            <col style={{ minWidth: 96 }} />
            <col style={{ minWidth: 120 }} />
            <col style={{ minWidth: 96 }} />
            <col style={{ minWidth: 80 }} />
            <col style={{ minWidth: 200 }} />
          </colgroup>
          <thead className="bg-navy-50 text-sm font-semibold text-navy-700">
            <tr>
              <th className={`${thClass} min-w-[140px]`}>이름</th>
              <th className={`${thClass} min-w-[120px]`}>학교</th>
              <th className={`${thClass} min-w-[72px]`}>학년</th>
              <th className={`${thClass} min-w-[96px]`}>반/과정</th>
              <th className={`${thClass} min-w-[120px]`}>과목</th>
              <th className={`${thClass} min-w-[96px]`}>담당강사</th>
              <th className={`${thClass} min-w-[80px]`}>상태</th>
              <th className="px-5 py-4 text-right min-w-[200px]">관리</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const subjectsText = formatSubjects(student.subjects)
              const classNameText = student.className || '-'
              const teacherText = student.teacher || '-'

              return (
                <tr key={student.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className={`${tdClass} min-w-[140px] max-w-[200px]`}>
                    <button
                      type="button"
                      onClick={() => onView(student)}
                      title={student.name}
                      className="student-table-cell block max-w-full text-base font-bold text-blue-700 hover:underline"
                    >
                      {student.name}
                    </button>
                  </td>
                  <td className={`${tdClass} min-w-[120px] max-w-[220px] font-medium text-slate-800`} title={student.school}>
                    {student.school}
                  </td>
                  <td className={`${tdClass} min-w-[72px] font-medium text-slate-800`} title={student.grade}>
                    {student.grade}
                  </td>
                  <td className={`${tdClass} min-w-[96px] max-w-[160px]`} title={classNameText}>
                    {classNameText}
                  </td>
                  <td className={`${tdClass} min-w-[120px] max-w-[200px]`} title={subjectsText}>
                    {subjectsText}
                  </td>
                  <td className={`${tdClass} min-w-[96px] max-w-[140px] font-medium text-slate-800`} title={teacherText}>
                    {teacherText}
                  </td>
                  <td className={`${tdClass} min-w-[80px]`}>
                    <StatusBadge
                      label={student.status}
                      colorClass={getStudentStatusColor(student.status)}
                    />
                  </td>
                  <td className="px-5 py-4 min-w-[200px]">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ActionBtn
                        label="상세보기"
                        onClick={() => onView(student)}
                        icon={<Eye className="h-4 w-4 shrink-0" />}
                      />
                      <ActionBtn
                        label="수정"
                        onClick={() => onEdit(student)}
                        icon={<Pencil className="h-4 w-4 shrink-0" />}
                      />
                      <ActionBtn
                        label="삭제"
                        onClick={() => onDelete(student)}
                        icon={<Trash2 className="h-4 w-4 shrink-0 text-rose-600" />}
                        danger
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 md:hidden">
        {students.map((student) => (
          <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => onView(student)}
              className="text-lg font-bold text-navy-900"
            >
              {student.name}
            </button>
            <p className="mt-2 text-[15px] font-medium text-slate-700">
              {student.school} · {student.grade} · {student.className || '-'}
            </p>
            <p className="mt-1.5 text-[15px] text-slate-600">
              {formatSubjects(student.subjects)} · {student.teacher || '-'}
            </p>
            <div className="mt-3">
              <StatusBadge
                label={student.status}
                colorClass={getStudentStatusColor(student.status)}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <ActionBtn
                label="상세"
                onClick={() => onView(student)}
                icon={<Eye className="h-4 w-4" />}
                full
              />
              <ActionBtn
                label="수정"
                onClick={() => onEdit(student)}
                icon={<Pencil className="h-4 w-4" />}
                full
              />
              <ActionBtn
                label="삭제"
                onClick={() => onDelete(student)}
                icon={<Trash2 className="h-4 w-4 text-rose-600" />}
                danger
                full
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ActionBtn({
  label,
  onClick,
  icon,
  danger,
  full,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
  danger?: boolean
  full?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`student-table-action-btn inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium leading-none ${full ? 'flex-1' : ''} ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
    >
      {icon}
      {label}
    </button>
  )
}
