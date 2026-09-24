import type { TextbookSubject } from '../../types/records'

type TodayReportSubjectNavProps = {
  subjects: TextbookSubject[]
  activeSubject: TextbookSubject | null
  onSubject: (subject: TextbookSubject) => void
  todayActive: boolean
  onToday: () => void
  pastActive: boolean
  onPast: () => void
  pastDates: string[]
  onPickDate: (date: string) => void
  selectedDate: string
}

function subjectClass(subject: TextbookSubject, active: boolean): string {
  if (!active) return 'text-sm font-medium text-slate-400'
  return subject === '수학'
    ? 'rounded-lg bg-[#eef4fc] px-2 text-2xl font-extrabold leading-tight text-[#163A70]'
    : 'rounded-lg bg-[#eefbf8] px-2 text-2xl font-extrabold leading-tight text-[#0f766e]'
}

export function TodayReportSubjectNav({
  subjects,
  activeSubject,
  onSubject,
  todayActive,
  onToday,
  pastActive,
  onPast,
  pastDates,
  onPickDate,
  selectedDate,
}: TodayReportSubjectNavProps) {
  if (subjects.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500">TODAY REPORT</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
        {subjects.map((subject) => {
          const active = subjects.length === 1 || activeSubject === subject
          if (subjects.length === 1) {
            return (
              <p key={subject} className={subjectClass(subject, true)}>
                {subject}
              </p>
            )
          }
          return (
            <button
              key={subject}
              type="button"
              onClick={() => onSubject(subject)}
              className={subjectClass(subject, active)}
            >
              {subject}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className={
            todayActive
              ? 'text-sm font-semibold text-navy-900'
              : 'text-sm font-medium text-slate-500'
          }
        >
          오늘 수업
        </button>
        <button
          type="button"
          onClick={onPast}
          className={
            pastActive
              ? 'text-xs font-semibold text-slate-600'
              : 'text-xs font-medium text-slate-400'
          }
        >
          이전 수업
        </button>
      </div>
      {pastActive ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pastDates.length === 0 ? (
            <p className="text-xs text-slate-400">저장된 이전 수업 날짜가 없습니다.</p>
          ) : (
            pastDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => onPickDate(date)}
                className={`min-h-9 rounded-lg border px-2.5 text-xs font-semibold ${
                  date === selectedDate
                    ? 'border-slate-300 bg-slate-100 text-navy-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {date.slice(5)}
              </button>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}
