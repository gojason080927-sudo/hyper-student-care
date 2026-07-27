import { Link } from 'react-router-dom'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatSubjects } from '../../utils/filters'

const quickLinks = [
  { segment: 'attendance', label: '출결' },
  { segment: 'progress', label: '진도 과정' },
  { segment: 'homework', label: '숙제관리' },
  { segment: 'daily-tests', label: '일일테스트' },
  { segment: 'monthly-evaluation', label: '월말평가' },
  { segment: 'makeup-plans', label: '보강계획' },
  { segment: 'learning-notices', label: '학습정보 & 공지사항' },
  { segment: 'questions', label: '질문하기' },
] as const

export function ParentStudentHomePage() {
  const student = useParentStudent()
  const basePath = `/care/${student.studentAccessKey}`

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.name} 학습 기록`}
        description="아래 메뉴에서 학습 기록을 확인할 수 있습니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">학교</dt>
            <dd className="mt-1 text-base font-semibold text-navy-900">{student.school}</dd>
          </div>
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">학년 · 반</dt>
            <dd className="mt-1 text-base font-semibold text-navy-900">
              {student.grade} · {student.className || '-'}
            </dd>
          </div>
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">과목</dt>
            <dd className="mt-1 text-base font-semibold text-navy-900">
              {formatSubjects(student.subjects)}
            </dd>
          </div>
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">담당 강사</dt>
            <dd className="mt-1 text-base font-semibold text-navy-900">
              {student.teacher || '-'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {quickLinks.map(({ segment, label }) => (
          <Link
            key={segment}
            to={`${basePath}/${segment}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm font-semibold text-navy-900 shadow-sm transition hover:border-navy-300 hover:bg-slate-50"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
