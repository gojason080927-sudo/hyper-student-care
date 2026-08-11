import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import { getSeoulYearMonth } from '../utils/monthlyLearningProgress'
import { getStudentDiagnosisSubjects } from '../utils/studentGradeClass'
import { inputClass } from '../utils/labels'

type MonthlyLearningReportSelectPageProps = {
  detailBasePath?: string
}

export function MonthlyLearningReportSelectPage({
  detailBasePath = '/monthly-learning-reports',
}: MonthlyLearningReportSelectPageProps) {
  const { students } = useData()
  const current = getSeoulYearMonth()
  const [year, setYear] = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return students
      .filter((student) => student.status === '재원')
      .filter((student) => {
        if (!q) return true
        return (
          student.name.includes(q) ||
          student.className.includes(q) ||
          student.school.includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [query, students])

  return (
    <div className="space-y-5">
      <PageHeader
        title="월간 학습진단 REPORT"
        description="Today Report·일일테스트·과제·출결·오답BANK 데이터를 자동 누적한 현재 예상점수를 확인합니다."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">연도</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || current.year)}
            className={`${inputClass()} w-28`}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">월</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={`${inputClass()} w-24`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[180px] flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-600">학생 검색</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClass()}
            placeholder="이름·반·학교"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {filtered.map((student) => {
            const subjects = getStudentDiagnosisSubjects(student.className, student.subjects)
            const subjectLabel = subjects.join(' · ')
            return (
              <li key={student.id}>
                <Link
                  to={`${detailBasePath}/${student.id}?year=${year}&month=${month}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-navy-900">{student.name}</p>
                    <p className="text-sm text-slate-500">
                      {student.grade} · {student.className || '반 미지정'} ·{' '}
                      {student.teacher || '담당 미지정'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[#0F766E]">{subjectLabel} REPORT</span>
                </Link>
              </li>
            )
          })}
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">해당하는 학생이 없습니다.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
