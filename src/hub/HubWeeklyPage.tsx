import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { WeeklySummaryDetail } from '../pages/parent/ParentStudentWeeklySummaryPage'
import { latestWeeklySummary } from '../utils/studentCare/weeklySummaryDisplay'
import { weeklySummaryPeriodLabel } from '../utils/studentCare'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

export function HubWeeklyPage() {
  const { student, weeklyLearningSummaries } = useHub()
  const [selectedId, setSelectedId] = useState('')

  const summaries = useMemo(
    () =>
      [...weeklyLearningSummaries].sort(
        (a, b) => b.weekStart.localeCompare(a.weekStart) || b.createdAt.localeCompare(a.createdAt),
      ),
    [weeklyLearningSummaries],
  )
  const latest = latestWeeklySummary(summaries, student.id)
  const active = summaries.find((item) => item.id === selectedId) ?? latest ?? null

  useEffect(() => {
    void getSupabase().rpc('ensure_weekly_learning_summaries')
  }, [])

  useEffect(() => {
    if (!selectedId && latest) setSelectedId(latest.id)
  }, [latest, selectedId])

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="주간 SUMMARY" />
      {!active ? (
        <HubEmpty message="아직 생성된 주간 학습 SUMMARY가 없습니다." />
      ) : (
        <div className="space-y-3">
          {summaries.length > 1 ? (
            <select
              value={active.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {summaries.map((summary) => (
                <option key={summary.id} value={summary.id}>
                  {weeklySummaryPeriodLabel(summary)}
                </option>
              ))}
            </select>
          ) : null}
          <WeeklySummaryDetail summary={active} />
        </div>
      )}
    </div>
  )
}
