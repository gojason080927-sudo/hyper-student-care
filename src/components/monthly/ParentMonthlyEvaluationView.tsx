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
import { getScoreColor, inputClass } from '../../utils/labels'

export type ParentMonthlyEvaluationViewProps = {
  student: Student
  studentRecords: MonthlyEvaluationRecord[]
  latest: MonthlyEvaluationRecord | null
}

/** 학부모·학생용 월말평가 읽기 전용 화면 */
export function ParentMonthlyEvaluationView({
  student,
  studentRecords,
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

  const yearRecords = useMemo(
    () =>
      studentRecords
        .filter((r) => r.year === selectedYear)
        .sort((a, b) => a.month - b.month),
    [selectedYear, studentRecords],
  )

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader
        title="월말 평가"
        description={`${student.name} 학생의 월별 평가 결과를 확인합니다.`}
      />

      {studentRecords.length === 0 ? (
        <ParentEmptyState message="아직 등록된 월말평가가 없습니다." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
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

          <MonthlyEvaluationChart
            records={studentRecords}
            variant="fixedMonths"
            selectedYear={selectedYear}
            title="월별 성적 추이"
            subtitle="1월부터 12월까지의 평가 결과입니다."
            mobileFit
          />

          {yearRecords.length > 0 && (
            <section className="space-y-3" aria-label="월별 평가 상세">
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
            </section>
          )}
        </>
      )}
    </div>
  )
}
