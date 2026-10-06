import { useEffect, useMemo, useState } from 'react'
import { ParentWeeklyWrongVocabReport } from './ParentWeeklyWrongVocabReport'
import { ParentEmptyState } from './ParentStudentComponents'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useData } from '../../hooks/useData'
import {
  listParentWeeklyWrongVocabWeeks,
  pickDefaultParentWeeklyWrongVocabWeek,
  weeklyWrongVocabPeriodLabel,
} from '../../utils/parentWeeklyWrongVocab'

/** 주간 SUMMARY 화면 아래에 합쳐진 주간 수학 오답 · 영어 단어 누적 현황 */
export function ParentWeeklyWrongVocabSection() {
  const student = useParentStudent()
  const {
    dailyTests,
    weeklyLearningSummaries,
    studentTextbookSlots,
    classTodayReportCommon,
  } = useData()
  const weeks = useMemo(
    () =>
      listParentWeeklyWrongVocabWeeks({
        studentId: student.id,
        dailyTests,
        weeklySummaries: weeklyLearningSummaries,
      }),
    [dailyTests, student.id, weeklyLearningSummaries],
  )
  const defaultWeek = useMemo(
    () =>
      pickDefaultParentWeeklyWrongVocabWeek({
        studentId: student.id,
        dailyTests,
      }),
    [dailyTests, student.id],
  )
  const [weekStart, setWeekStart] = useState('')
  const [weekTouched, setWeekTouched] = useState(false)

  useEffect(() => {
    if (weekTouched) {
      if (weekStart && weeks.length > 0 && !weeks.includes(weekStart)) {
        setWeekStart(defaultWeek)
        setWeekTouched(false)
      }
      return
    }
    setWeekStart(defaultWeek)
  }, [defaultWeek, weekStart, weekTouched, weeks])

  const activeWeek = weekStart || defaultWeek

  return (
    <section className="space-y-4 border-t border-slate-200 pt-6" aria-label="주간 수학 오답 · 영어 단어 누적 현황">
      <div>
        <h2 className="text-base font-bold text-navy-900">주간 수학 오답 · 영어 단어 누적 현황</h2>
        <p className="mt-1 text-sm text-slate-600">이번 주 수학 오답 추적과 영어 누적 단어 학습을 확인합니다.</p>
      </div>

      {weeks.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">조회 주간</span>
          <select
            value={activeWeek}
            onChange={(event) => {
              setWeekTouched(true)
              setWeekStart(event.target.value)
            }}
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
        <ParentWeeklyWrongVocabReport
          studentId={student.id}
          weekStart={activeWeek}
          dailyTests={dailyTests}
          studentTextbookSlots={studentTextbookSlots}
          classTodayReportCommon={classTodayReportCommon}
          grade={student.grade}
          className={student.className}
        />
      ) : (
        <ParentEmptyState message="확인할 주간 일일테스트 기록이 없습니다." />
      )}
    </section>
  )
}
