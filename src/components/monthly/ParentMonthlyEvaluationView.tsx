import { useEffect, useMemo, useState } from 'react'
import { DifficultyBreakdownBadges } from './DifficultyBreakdownBadges'
import { MonthlyEvaluationChart } from '../ui/MonthlyEvaluationChart'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../parent/ParentStudentComponents'
import { MathMonthlyReport } from '../mathMonthly/MathMonthlyReport'
import { SchoolExamParentTab } from '../schoolExam/SchoolExamParentTab'
import { ParentUnreadDot } from '../parent/ParentUnreadDot'
import { fetchParentMathReports } from '../../lib/db/mathMonthlyRepo'
import { fetchParentSchoolReports } from '../../lib/db/schoolExamRepo'
import { hasUnreadSchoolExam, markSchoolExamSeen } from '../../utils/schoolExamUnread'
import type { SchoolReportData } from '../../utils/schoolExamReport'
import type { MathMonthlyReportData } from '../../utils/mathMonthlyReport'
import type { MonthlyEvaluationRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import {
  getAvailableChartYears,
  getDefaultChartYear,
} from '../../utils/monthlyEvaluation'
import { getSeoulYearMonth } from '../../utils/monthlyLearningProgress'
import { getScoreColor, inputClass } from '../../utils/labels'

export type ParentMonthlyEvaluationViewProps = {
  student: Student
  studentRecords: MonthlyEvaluationRecord[]
  latest: MonthlyEvaluationRecord | null
}

/** 학부모·학생·강사 열람용 — 월말평가 결과 (학습 기록은 월간 학습진단 REPORT로 이동) */
export function ParentMonthlyEvaluationView({
  student,
  studentRecords,
}: ParentMonthlyEvaluationViewProps) {
  const availableYears = useMemo(
    () => getAvailableChartYears(studentRecords),
    [studentRecords],
  )

  const defaultYearMonth = getSeoulYearMonth()
  const [selectedYear, setSelectedYear] = useState(() => {
    const defaultYear = getDefaultChartYear(studentRecords)
    return defaultYear || defaultYearMonth.year
  })

  const yearOptions = useMemo(() => {
    const years = new Set<number>(availableYears)
    years.add(defaultYearMonth.year)
    years.add(selectedYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [availableYears, defaultYearMonth.year, selectedYear])

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  // 새 방식(수학 월말평가 보고서)이 발송된 달은 새 보고서로 보여 주고, 나머지 기록은 기존 방식 그대로 둔다.
  const [mathReports, setMathReports] = useState<MathMonthlyReportData[]>([])
  const accessKey = student.studentAccessKey
  useEffect(() => {
    if (!accessKey) return
    let cancelled = false
    void fetchParentMathReports(accessKey).then((rows) => {
      if (!cancelled) setMathReports(rows)
    })
    return () => {
      cancelled = true
    }
  }, [accessKey])

  // 학교 시험 개인 분석 리포트 (발송된 것이 있을 때만 "학교 시험" 탭을 보여 준다)
  const [tab, setTab] = useState<'monthly' | 'school'>('monthly')
  const [schoolReports, setSchoolReports] = useState<SchoolReportData[]>([])
  const [schoolSeenTick, setSchoolSeenTick] = useState(0)
  useEffect(() => {
    if (!accessKey) return
    let cancelled = false
    void fetchParentSchoolReports(accessKey).then((rows) => {
      if (!cancelled) setSchoolReports(rows)
    })
    return () => {
      cancelled = true
    }
  }, [accessKey])
  const schoolSentAts = useMemo(() => schoolReports.map((r) => r.result.sentAt), [schoolReports])
  const schoolUnread = useMemo(
    () => schoolSeenTick >= 0 && hasUnreadSchoolExam(student.id, schoolSentAts),
    [schoolSeenTick, schoolSentAts, student.id],
  )
  const openTab = (next: 'monthly' | 'school') => {
    setTab(next)
    if (next === 'school') {
      markSchoolExamSeen(student.id, schoolSentAts)
      setSchoolSeenTick((n) => n + 1)
    }
  }
  const activeTab = schoolReports.length > 0 ? tab : 'monthly'

  const mathReportMonths = useMemo(
    () => new Set(mathReports.map((r) => r.exam.year * 12 + r.exam.month)),
    [mathReports],
  )

  const yearRecords = useMemo(
    () =>
      studentRecords
        .filter((r) => r.year === selectedYear)
        .filter((r) => !(r.subject === '수학' && mathReportMonths.has(r.year * 12 + r.month)))
        .sort((a, b) => a.month - b.month),
    [mathReportMonths, selectedYear, studentRecords],
  )

  // 성적 추이는 과목별로 따로 그린다 (영어·수학이 한 선으로 섞이지 않게)
  const chartSubjects = useMemo(() => {
    const names = Array.from(new Set(studentRecords.map((r) => r.subject).filter(Boolean)))
    // 새 수학 보고서가 있으면 보고서 안의 성적 추이를 쓰므로 예전 수학 그래프는 숨긴다
    const shown = mathReports.length > 0 ? names.filter((name) => name !== '수학') : names
    return shown.length > 0 || mathReports.length > 0 ? shown : ['']
  }, [mathReports.length, studentRecords])

  return (
    <div className="parent-page space-y-8 pb-6">
      <ParentPageHeader
        title="월말평가 결과"
        description={`${student.name} 학생의 월말평가 결과를 확인합니다. 월간 학습 기록은 월간 학습진단 REPORT에서 확인할 수 있습니다.`}
      />

      {schoolReports.length > 0 && (
        <div className="flex gap-2" role="tablist" aria-label="월말평가 종류">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'monthly'}
            onClick={() => openTab('monthly')}
            className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-bold ${activeTab === 'monthly' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
          >
            월말평가
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'school'}
            onClick={() => openTab('school')}
            className={`relative min-h-11 flex-1 rounded-xl border px-4 text-sm font-bold ${activeTab === 'school' ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
          >
            학교 시험
            {schoolUnread && activeTab !== 'school' && <ParentUnreadDot className="right-3 top-2" />}
          </button>
        </div>
      )}

      {activeTab === 'school' && (
        <SchoolExamParentTab student={student} reports={schoolReports} />
      )}

      {activeTab === 'monthly' && (<>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label htmlFor="progress-year" className="text-sm font-medium text-slate-700">
          연도
        </label>
        <select
          id="progress-year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={`${inputClass()} w-auto min-w-[120px]`}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      <section className="space-y-4" aria-label="월말평가 결과">
        <h2 className="text-lg font-bold text-navy-900">월말평가 결과</h2>

        {mathReports.length > 0 && (
          <MathMonthlyReport student={student} reports={mathReports} evaluations={studentRecords} />
        )}

        {studentRecords.length === 0 ? (
          <ParentEmptyState message="아직 등록된 월말평가가 없습니다." />
        ) : (
          <>
            {chartSubjects.map((subject) => (
              <MonthlyEvaluationChart
                key={subject || 'all'}
                records={studentRecords}
                subject={subject || undefined}
                variant="fixedMonths"
                selectedYear={selectedYear}
                title={subject ? `${subject} 월별 성적 추이` : '월별 성적 추이'}
                subtitle="1월부터 12월까지의 평가 결과입니다."
                mobileFit
              />
            ))}

            {yearRecords.length > 0 && (
              <div className="space-y-3" aria-label="월별 평가 상세">
                <h3 className="text-sm font-semibold text-slate-700">{selectedYear}년 월별 기록</h3>
                {yearRecords.map((record) => (
                  <ParentRecordCard
                    key={record.id}
                    title={record.subject}
                    date={`${record.month}월 · ${formatKoreanDate(record.evaluationDate)}`}
                  >
                    <p className={`text-lg font-bold ${getScoreColor(record.percentage)}`}>
                      {record.score}/{record.totalScore}점 ({record.percentage}%)
                    </p>
                    <DifficultyBreakdownBadges breakdown={record.difficultyBreakdown} />
                    {record.teacherComment && (
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="text-xs font-medium text-slate-500">교사 총평</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {record.teacherComment}
                        </p>
                      </div>
                    )}
                  </ParentRecordCard>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      </>)}
    </div>
  )
}
