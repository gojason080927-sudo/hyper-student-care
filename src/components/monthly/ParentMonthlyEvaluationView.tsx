import { useEffect, useMemo, useState } from 'react'
import { DifficultyBreakdownBadges } from './DifficultyBreakdownBadges'
import { MonthlyEvaluationChart } from '../ui/MonthlyEvaluationChart'
import type { MonthlyEvaluationRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import {
  getAvailableChartYears,
  getDefaultChartYear,
} from '../../utils/monthlyEvaluation'
import { getScoreColor, inputClass } from '../../utils/labels'

export type ParentMonthlyEvaluationViewProps = {
  student: Student
  studentRecords: MonthlyEvaluationRecord[]
  latest: MonthlyEvaluationRecord | null
}

/** 학부모·학생용 월말평가 읽기 전용 화면 (수정·삭제 콜백 없음) */
export function ParentMonthlyEvaluationView({
  student,
  studentRecords,
  latest,
}: ParentMonthlyEvaluationViewProps) {
  const availableYears = useMemo(
    () => getAvailableChartYears(studentRecords),
    [studentRecords],
  )

  const [selectedYear, setSelectedYear] = useState(() => getDefaultChartYear(studentRecords))

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">
          {student.name} 학생 월말평가
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {student.school} · {student.grade}
        </p>

        {latest ? (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-600">
              {formatKoreanDate(latest.evaluationDate)} · {latest.subject}
            </p>
            <p className={`text-2xl font-bold ${getScoreColor(latest.percentage)}`}>
              {latest.score}/{latest.totalScore}점 ({latest.percentage}%)
            </p>
            <DifficultyBreakdownBadges breakdown={latest.difficultyBreakdown} />
            {latest.teacherComment && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">시험 총평</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {latest.teacherComment}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
            아직 등록된 월말평가가 없습니다.
          </p>
        )}
      </header>

      {studentRecords.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="chart-year" className="text-sm font-medium text-slate-700">
            연도
          </label>
          <select
            id="chart-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`${inputClass()} w-auto min-w-[120px]`}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
        </div>
      )}

      <MonthlyEvaluationChart
        records={studentRecords}
        variant="fixedMonths"
        selectedYear={selectedYear}
      />
    </div>
  )
}
