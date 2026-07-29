import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StudentFormModal } from '../components/students/StudentFormModal'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useData } from '../hooks/useData'
import type { Student } from '../types/student'
import { formatSubjects } from '../utils/filters'
import { formatKoreanDate } from '../utils/date'
import { btnPrimary, btnSecondary, getStudentStatusColor } from '../utils/labels'

function buildTodayReportBulkPath(student: Student): string {
  const params = new URLSearchParams()
  if (student.className.trim()) {
    params.set('class', student.className.trim())
  }
  params.set('student', student.id)
  const query = params.toString()
  return query ? `/teacher/today-report-bulk?${query}` : '/teacher/today-report-bulk'
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-50 px-4 py-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-base font-semibold text-navy-900">
        {value || '-'}
      </dd>
    </div>
  )
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const data = useData()
  const [editOpen, setEditOpen] = useState(false)

  const student = id ? data.getStudentById(id) : undefined

  if (data.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        학생 정보를 불러오는 중…
      </div>
    )
  }

  if (!student) {
    return (
      <EmptyState
        title="학생을 찾을 수 없습니다."
        description="목록으로 돌아가 다시 선택해 주세요."
      />
    )
  }

  const todayReportBulkPath = buildTodayReportBulkPath(student)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy-900">{student.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {student.school} · {student.grade} · {student.className || '-'} ·{' '}
              {formatSubjects(student.subjects)}
            </p>
            <p className="mt-1 text-sm text-slate-500">담당: {student.teacher || '-'}</p>
            <div className="mt-3">
              <StatusBadge
                label={student.status}
                colorClass={getStudentStatusColor(student.status)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={`${btnPrimary} inline-flex items-center gap-2`}
            >
              <Pencil className="h-4 w-4" />
              학생 정보 수정
            </button>
            <Link to="/students" className={`${btnSecondary} inline-flex items-center gap-2`}>
              <ArrowLeft className="h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3.5 sm:px-5">
        <p className="text-sm leading-relaxed text-amber-950">
          수업 기록과 학부모 링크는 Today Report 반별 통합입력에서 관리합니다.
        </p>
        <div className="mt-3">
          <Link
            to={todayReportBulkPath}
            className={`${btnPrimary} inline-flex min-h-11 items-center gap-2`}
          >
            Today Report 반별 통합입력으로 이동
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!student.className.trim() && (
            <p className="mt-2 text-xs text-amber-800">
              반/과정이 등록되지 않았습니다. Today Report 반별 통합입력에서 직접 반을 선택해 주세요.
            </p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-navy-900">기본 정보</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="이름" value={student.name} />
          <InfoField label="학교" value={student.school} />
          <InfoField label="학년" value={student.grade} />
          <InfoField label="반/과정" value={student.className} />
          <InfoField label="수강 과목" value={formatSubjects(student.subjects)} />
          <InfoField label="담당강사" value={student.teacher} />
          <InfoField label="재원 상태" value={student.status} />
          <InfoField label="학생 연락처" value={student.studentPhone} />
          <InfoField label="등록일" value={formatKoreanDate(student.enrollmentDate)} />
          <InfoField label="메모" value={student.memo} />
        </dl>
      </section>

      <StudentFormModal
        open={editOpen}
        student={student}
        onClose={() => setEditOpen(false)}
        onSubmit={(formData) => data.updateStudent(student.id, formData)}
      />
    </div>
  )
}
