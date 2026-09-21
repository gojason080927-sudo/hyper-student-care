import { useEffect, useMemo, useState } from 'react'
import { DailyTestWeeklyFlowCard } from '../../components/studentCare/DailyTestWeeklyFlowCard'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useData } from '../../hooks/useData'
import {
  listParentWeeklyWrongVocabWeeks,
  weeklyWrongVocabPeriodLabel,
} from '../../utils/parentWeeklyWrongVocab'

export function ParentStudentWeeklyWrongVocabPage() {
  const student = useParentStudent()
  const { dailyTests, weeklyLearningSummaries } = useData()
  const weeks = useMemo(
    () =>
      listParentWeeklyWrongVocabWeeks({
        studentId: student.id,
        dailyTests,
        weeklySummaries: weeklyLearningSummaries,
      }),
    [dailyTests, student.id, weeklyLearningSummaries],
  )
  const [weekStart, setWeekStart] = useState(weeks[0] ?? '')

  useEffect(() => {
    if (!weekStart && weeks[0]) setWeekStart(weeks[0])
    if (weekStart && weeks.length > 0 && !weeks.includes(weekStart)) {
      setWeekStart(weeks[0])
    }
  }, [weekStart, weeks])

  const activeWeek = weekStart || weeks[0]
  const grade =
    weeklyLearningSummaries.find(
      (summary) => summary.studentId === student.id && summary.weekStart === activeWeek,
    )?.scores.dailyTest.grade ?? null

  return (
    <div className="parent-page space-y-4 pb-6">
      <ParentPageHeader
        title="주간 수학 오답 · 영어 단어 누적 현황"
        description="이미 집계된 일일테스트 오답·단어·고등 오답 회수를 한 화면에서 확인합니다."
      />

      {weeks.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">조회 주간</span>
          <select
            value={activeWeek}
            onChange={(event) => setWeekStart(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
          >
            {weeks.map((week) => (
              <option key={week} value={week}>
                {weeklyWrongVocabPeriodLabel(week)}
              </option>
            ))}
          </select>
        </label>
      ) : activeWeek ? (
        <p className="text-sm text-slate-600">{weeklyWrongVocabPeriodLabel(activeWeek)}</p>
      ) : null}

      {activeWeek ? (
        <DailyTestWeeklyFlowCard
          studentId={student.id}
          weekStart={activeWeek}
          dailyTests={dailyTests}
          grade={grade}
        />
      ) : (
        <ParentEmptyState message="확인할 주간 일일테스트 기록이 없습니다." />
      )}
    </div>
  )
}
