import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchHubClassAssignmentsInRange } from './hubDayAssignments'
import {
  addDaysYmd,
  dayOfMonth,
  formatSelectedDateLabel,
  kstTodayYmd,
  weekDates,
  weekdayLabel,
} from './hubWeekDates'
import { useHub } from './HubContext'

/** 상단 카드 안의 이번 주 한 줄 달력(월~일). 날짜를 누르면 그 날짜의 「오늘의 과제」가 열린다. */
export function HubWeekCalendar() {
  const { accessKey, student } = useHub()
  const navigate = useNavigate()
  const today = useMemo(() => kstTodayYmd(), [])
  const [selected, setSelected] = useState(today)
  const [marked, setMarked] = useState<Set<string>>(new Set())

  const dates = useMemo(() => weekDates(selected), [selected])
  const from = dates[0]
  const to = dates[6]

  useEffect(() => {
    let cancelled = false
    fetchHubClassAssignmentsInRange(student.grade, student.className, from, to)
      .then((rows) => {
        if (!cancelled) setMarked(new Set(rows.map((r) => r.reportDate)))
      })
      .catch((error) => {
        console.error('[HubWeekCalendar] 한 주 과제 조회 실패', error)
        if (!cancelled) setMarked(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [student.grade, student.className, from, to])

  const openDate = (ymd: string) => {
    setSelected(ymd)
    navigate(`/hub/${accessKey}/assignments?date=${ymd}`)
  }

  return (
    <div className="hub-week" aria-label="이번 주 달력">
      <div className="hub-week-head">
        <button type="button" className="hub-week-arrow" aria-label="지난주" onClick={() => setSelected(addDaysYmd(selected, -7))}>
          <ChevronLeft strokeWidth={2.4} />
        </button>
        <p className="hub-week-label">{formatSelectedDateLabel(selected)}</p>
        <button type="button" className="hub-week-arrow" aria-label="다음 주" onClick={() => setSelected(addDaysYmd(selected, 7))}>
          <ChevronRight strokeWidth={2.4} />
        </button>
      </div>
      <div className="hub-week-grid" role="group">
        {dates.map((ymd) => {
          const isToday = ymd === today
          const isSelected = ymd === selected
          return (
            <button
              key={ymd}
              type="button"
              className={`hub-week-day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
              aria-label={`${formatSelectedDateLabel(ymd)}${marked.has(ymd) ? ', 과제 있음' : ''}`}
              aria-pressed={isSelected}
              onClick={() => openDate(ymd)}
            >
              <span className="hub-week-dow">{weekdayLabel(ymd)}</span>
              <span className="hub-week-num">{dayOfMonth(ymd)}</span>
              <span className={`hub-week-dot${marked.has(ymd) ? ' is-on' : ''}`} aria-hidden />
            </button>
          )
        })}
      </div>
    </div>
  )
}
