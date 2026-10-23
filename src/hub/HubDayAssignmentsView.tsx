import { useEffect, useState } from 'react'
import { fetchHubClassAssignmentsInRange, type HubDayAssignment } from './hubDayAssignments'
import { formatSelectedDateLabel } from './hubWeekDates'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

/** 「오늘의 과제」를 날짜(?date=YYYY-MM-DD)로 열었을 때: 그날 입력된 반 공통 오늘 과제를 보여 준다. */
export function HubDayAssignmentsView({ date }: { date: string }) {
  const { student } = useHub()
  const [state, setState] = useState<{ date: string; rows: HubDayAssignment[] | null; failed: boolean }>({
    date,
    rows: null,
    failed: false,
  })

  useEffect(() => {
    let cancelled = false
    fetchHubClassAssignmentsInRange(student.grade, student.className, date, date)
      .then((rows) => {
        if (!cancelled) setState({ date, rows, failed: false })
      })
      .catch((error) => {
        console.error('[HubDayAssignmentsView] 과제 조회 실패', error)
        if (!cancelled) setState({ date, rows: [], failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [student.grade, student.className, date])

  const loading = state.date !== date || state.rows === null
  const rows = loading ? [] : (state.rows ?? [])

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="오늘의 과제" />
      <p className="mb-3 text-sm font-bold text-slate-700">{formatSelectedDateLabel(date)}</p>
      {loading ? (
        <HubEmpty message="불러오는 중입니다." />
      ) : state.failed ? (
        <HubEmpty message="과제를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />
      ) : rows.length === 0 ? (
        <HubEmpty message="이 날짜에 입력된 과제가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {rows.map((item) => (
            <li key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#28c7b7]">
                {item.subjectLabel}
                {item.textbookName ? ` · ${item.textbookName}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
