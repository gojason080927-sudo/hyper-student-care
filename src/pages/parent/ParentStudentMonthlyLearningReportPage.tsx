import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MonthlyLearningReportDocument } from '../../components/diagnosis/MonthlyLearningReportDocument'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { useData } from '../../hooks/useData'
import { getSeoulYearMonth } from '../../utils/monthlyLearningProgress'
import { inputClass } from '../../utils/labels'
import type { DiagnosisSubject } from '../../utils/monthlyLearningDiagnosis'

export function ParentStudentMonthlyLearningReportPage() {
  const { studentAccessKey = '' } = useParams()
  const { students, monthlyLearningReports, dailyTests, monthlyEvaluations } = useData()
  const student = students.find((item) => item.studentAccessKey === studentAccessKey)
  const current = getSeoulYearMonth()

  const published = useMemo(
    () =>
      monthlyLearningReports
        .filter((report) => report.status === 'published')
        .filter((report) => (student ? report.studentId === student.id : false))
        .sort((a, b) => b.year - a.year || b.month - a.month || a.subject.localeCompare(b.subject)),
    [monthlyLearningReports, student],
  )

  const [selectedKey, setSelectedKey] = useState('')
  const activeKey =
    selectedKey ||
    (published[0] ? `${published[0].year}-${published[0].month}-${published[0].subject}` : '')

  const active = published.find(
    (report) => `${report.year}-${report.month}-${report.subject}` === activeKey,
  )

  if (!student) {
    return <ParentEmptyState message="학생 정보를 불러올 수 없습니다." />
  }

  if (published.length === 0) {
    return (
      <div className="parent-page space-y-6 pb-6">
        <ParentPageHeader
          title="월간 학습진단 REPORT"
          description="강사가 확정·공개한 월간 REPORT만 확인할 수 있습니다."
        />
        <ParentEmptyState message="아직 공개된 월간 학습진단 REPORT가 없습니다." />
        <p className="text-center text-sm text-slate-500">
          월중 예상점수는 학부모 앱에 표시되지 않습니다.
        </p>
      </div>
    )
  }

  const subject = (active?.subject ?? '수학') as DiagnosisSubject

  return (
    <div className="mlr-print-root parent-page space-y-5 pb-6">
      <div className="mlr-no-print space-y-4">
        <ParentPageHeader
          title="월간 학습진단 REPORT"
          description="확정·공개된 월간 진단 결과를 확인합니다."
        />
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600">조회 월 / 과목</span>
            <select
              value={activeKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className={inputClass()}
            >
              {published.map((report) => (
                <option
                  key={report.id}
                  value={`${report.year}-${report.month}-${report.subject}`}
                >
                  {report.year}년 {report.month}월 · {report.subject}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#163A70] to-[#28C7B7] px-4 py-2.5 text-sm font-semibold text-white"
          >
            인쇄 / PDF 저장
          </button>
        </div>
      </div>

      {active ? (
        <MonthlyLearningReportDocument
          student={student}
          subject={subject}
          year={active.year}
          month={active.month}
          scores={active.scores}
          learningRecords={active.learningRecords}
          strengths={active.strengths}
          improvements={active.improvements}
          teacherOverallComment={active.teacherOverallComment}
          statusLabel={`${active.year}년 ${active.month}월 확정 REPORT`}
          dailyTests={dailyTests}
          monthlyEvaluations={monthlyEvaluations}
        />
      ) : null}

      <p className="mlr-no-print text-center text-xs text-slate-500">
        현재 월({current.year}.{current.month}) 실시간 예상점수는 공개되지 않습니다.
      </p>
      <div className="mlr-no-print text-center">
        <Link
          to={`/care/${studentAccessKey}/monthly-evaluation`}
          className="text-sm font-medium text-[#163A70]"
        >
          월말평가 결과 보기
        </Link>
      </div>
    </div>
  )
}
