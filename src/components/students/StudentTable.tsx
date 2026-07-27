import { Copy, Eye, Pencil, Trash2 } from 'lucide-react'
import type { Student } from '../../types/student'
import { formatSubjects } from '../../utils/filters'
import { getStudentStatusColor } from '../../utils/labels'
import { StatusBadge } from '../ui/StatusBadge'
import { KakaoShareButton } from './KakaoShareButton'

type StudentTableProps = {
  students: Student[]
  onView: (student: Student) => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
  onCopyLink: (student: Student) => void
  onKakaoShare: (student: Student) => void
}

export function StudentTable({
  students,
  onView,
  onEdit,
  onDelete,
  onCopyLink,
  onKakaoShare,
}: StudentTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-navy-50 text-xs font-semibold uppercase tracking-wide text-navy-700">
            <tr>
              <th className="px-4 py-3.5">이름</th>
              <th className="px-4 py-3.5">학교</th>
              <th className="px-4 py-3.5">학년</th>
              <th className="px-4 py-3.5">반/과정</th>
              <th className="px-4 py-3.5">과목</th>
              <th className="px-4 py-3.5">담당강사</th>
              <th className="px-4 py-3.5">상태</th>
              <th className="px-4 py-3.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3.5">
                  <button type="button" onClick={() => onView(student)} className="font-semibold text-blue-700 hover:underline">{student.name}</button>
                </td>
                <td className="px-4 py-3.5">{student.school}</td>
                <td className="px-4 py-3.5">{student.grade}</td>
                <td className="px-4 py-3.5">{student.className || '-'}</td>
                <td className="px-4 py-3.5">{formatSubjects(student.subjects)}</td>
                <td className="px-4 py-3.5">{student.teacher || '-'}</td>
                <td className="px-4 py-3.5"><StatusBadge label={student.status} colorClass={getStudentStatusColor(student.status)} /></td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-2">
                    <ActionBtn label="링크 복사" onClick={() => onCopyLink(student)} icon={<Copy className="h-4 w-4" />} />
                    <KakaoShareButton student={student} onShare={onKakaoShare} />
                    <ActionBtn label="상세보기" onClick={() => onView(student)} icon={<Eye className="h-4 w-4" />} />
                    <ActionBtn label="수정" onClick={() => onEdit(student)} icon={<Pencil className="h-4 w-4" />} />
                    <ActionBtn label="삭제" onClick={() => onDelete(student)} icon={<Trash2 className="h-4 w-4 text-rose-600" />} danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {students.map((student) => (
          <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button type="button" onClick={() => onView(student)} className="text-lg font-bold text-navy-900">{student.name}</button>
            <p className="mt-1 text-sm text-slate-500">{student.school} · {student.grade} · {student.className || '-'}</p>
            <p className="mt-1 text-sm text-slate-600">{formatSubjects(student.subjects)} · {student.teacher || '-'}</p>
            <div className="mt-2"><StatusBadge label={student.status} colorClass={getStudentStatusColor(student.status)} /></div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <ActionBtn label="링크" onClick={() => onCopyLink(student)} icon={<Copy className="h-4 w-4" />} full />
              <KakaoShareButton student={student} onShare={onKakaoShare} compact />
              <ActionBtn label="상세" onClick={() => onView(student)} icon={<Eye className="h-4 w-4" />} full />
              <ActionBtn label="수정" onClick={() => onEdit(student)} icon={<Pencil className="h-4 w-4" />} full />
              <ActionBtn label="삭제" onClick={() => onDelete(student)} icon={<Trash2 className="h-4 w-4 text-rose-600" />} danger full />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ActionBtn({ label, onClick, icon, danger, full }: { label: string; onClick: () => void; icon: React.ReactNode; danger?: boolean; full?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${full ? 'flex-1 justify-center' : ''} ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
      {icon}{label}
    </button>
  )
}
