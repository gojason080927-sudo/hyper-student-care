import { useEffect, useMemo, useState } from 'react'
import { DifficultyBreakdownBadges } from './DifficultyBreakdownBadges'
import { MonthlyEvaluationChart } from '../ui/MonthlyEvaluationChart'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../parent/ParentStudentComponents'
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

  const yearRecords = useMemo(
    () =>
      studentRecords
        .filter((r) => r.year === selectedYear)
        .sort((a, b) => a.month - b.month),
    [selectedYear, studentRecords],
  )

  return (
    <div className="parent-page space-y-8 pb-6">
      <ParentPageHeader
        title="월말평가 결과"
        description={`${student.name} 학생의 월말평가 결과를 확인합니다. 월간 학습 기록은 월간 학습진단 REPORT에서 확인할 수 있습니다.`}
      />

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

        {studentRecords.length === 0 ? (
          <ParentEmptyState message="아직 등록된 월말평가가 없습니다." />
        ) : (
          <>
            <MonthlyEvaluationChart
              records={studentRecords}
              variant="fixedMonths"
              selectedYear={selectedYear}
              title="월별 성적 추이"
              subtitle="1월부터 12월까지의 평가 결과입니다."
              mobileFit
            />

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
    </div>
  )
}
