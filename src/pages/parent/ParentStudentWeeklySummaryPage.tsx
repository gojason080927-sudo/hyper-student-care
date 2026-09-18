import { useEffect, useMemo, useState } from 'react'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { useData } from '../../hooks/useData'
import {
  WEEKLY_AREA_LABELS,
  WEEKLY_GRADE_CLASS,
  latestWeeklySummary,
  weeklyAreaFactLines,
} from '../../utils/studentCare/weeklySummaryDisplay'
import { weeklySummaryPeriodLabel } from '../../utils/studentCare'
import type { DailyTestRecord, WeeklyLearningSummaryRecord, WeeklySummaryAreaKey } from '../../types/records'
import { DailyTestWeeklyFlowCard } from '../../components/studentCare/DailyTestWeeklyFlowCard'

const AREA_ORDER: WeeklySummaryAreaKey[] = [
  'attendance',
  'material',
  'homework',
  'attitude',
]

export function ParentStudentWeeklySummaryPage() {
  const student = useParentStudent()
  const {
    weeklyLearningSummaries,
    dailyTests,
    ensureWeeklyLearningSummaries,
    markWeeklySummaryRead,
  } = useData()
  const [selectedId, setSelectedId] = useState('')

  const summaries = useMemo(
    () =>
      weeklyLearningSummaries
        .filter((summary) => summary.studentId === student.id)
        .sort(
          (a, b) =>
            b.weekStart.localeCompare(a.weekStart) || b.createdAt.localeCompare(a.createdAt),
        ),
    [student.id, weeklyLearningSummaries],
  )

  const latest = latestWeeklySummary(summaries, student.id)
  const active = summaries.find((summary) => summary.id === selectedId) ?? latest ?? null

  useEffect(() => {
    void (async () => {
      await ensureWeeklyLearningSummaries()
      await markWeeklySummaryRead(student.studentAccessKey)
    })()
  }, [ensureWeeklyLearningSummaries, markWeeklySummaryRead, student.studentAccessKey])

  useEffect(() => {
    if (!selectedId && latest) setSelectedId(latest.id)
  }, [latest, selectedId])

  if (!active) {
    return (
      <div className="parent-page space-y-6 pb-6">
        <ParentPageHeader
          title="주간 학습 SUMMARY"
          description="이번 주 학습관리 한눈에 보기"
        />
        <ParentEmptyState message="아직 생성된 주간 학습 SUMMARY가 없습니다." />
        <p className="text-center text-sm text-slate-500">
          매주 토요일 오전 8시(한국시간)에 해당 주 완료된 수업 기록으로 자동 생성됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="parent-page space-y-4 pb-6">
      <ParentPageHeader
        title="주간 학습 SUMMARY"
        description={weeklySummaryPeriodLabel(active)}
      />

      {summaries.length > 1 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">조회 주간</span>
          <select
            value={active.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
          >
            {summaries.map((summary) => (
              <option key={summary.id} value={summary.id}>
                {weeklySummaryPeriodLabel(summary)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <WeeklySummaryDetail
        summary={active}
        dailyTests={dailyTests}
        studentId={student.id}
      />
    </div>
  )
}

export function WeeklySummaryDetail({
  summary,
  dailyTests,
  studentId,
}: {
  summary: WeeklyLearningSummaryRecord
  dailyTests: DailyTestRecord[]
  studentId: string
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          주간 학습 SUMMARY
        </p>
        <p className="mt-1 text-sm text-slate-600">{weeklySummaryPeriodLabel(summary)}</p>
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500">종합 학습상태</p>
          {summary.grade ? (
            <span
              className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-sm font-semibold ${WEEKLY_GRADE_CLASS[summary.grade]}`}
            >
              {summary.grade}
            </span>
          ) : (
            <p className="mt-1 text-sm text-slate-500">평가 가능한 기록이 부족합니다.</p>
          )}
        </div>
      </section>

      {AREA_ORDER.map((key) => {
        const area = summary.scores[key]
        const lines = weeklyAreaFactLines(key, area)
        return (
          <section
            key={key}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-navy-900">{WEEKLY_AREA_LABELS[key]}</h3>
              {area.grade ? (
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${WEEKLY_GRADE_CLASS[area.grade]}`}
                >
                  {area.grade}
                </span>
              ) : (
                <span className="text-xs text-slate-400">기록 없음</span>
              )}
            </div>
            <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )
      })}

      <DailyTestWeeklyFlowCard
        studentId={studentId}
        weekStart={summary.weekStart}
        dailyTests={dailyTests}
        grade={summary.scores.dailyTest.grade}
      />

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <h3 className="text-sm font-bold text-navy-900">이번 주 GOOD</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{summary.goodText}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <h3 className="text-sm font-bold text-navy-900">다음 주 CHECK</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{summary.checkText}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <h3 className="text-sm font-bold text-navy-900">강사 한마디</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {summary.teacherComment}
        </p>
      </section>
    </div>
  )
}
