import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { StudentKakaoShareAction } from '../students/StudentKakaoShareAction'
import { TodayReportView } from '../todayReport/TodayReportView'
import type { Student } from '../../types/student'
import {
  getTodayReportCompletionColor,
  getTodayReportCompletionLabel,
  getTodayReportCompletionStatus,
} from '../../utils/todayReportCompletionStatus'
import { findStudentDayRecords, type TodayReportLookupContext } from '../../utils/todayReportLookup'

type TodayReportStudentAccordionProps = {
  student: Student
  date: string
  expanded: boolean
  onToggle: () => void
  lookupContext: TodayReportLookupContext
}

export function TodayReportStudentAccordion({
  student,
  date,
  expanded,
  onToggle,
  lookupContext,
}: TodayReportStudentAccordionProps) {
  const records = useMemo(
    () => findStudentDayRecords(student.id, date, lookupContext),
    [date, lookupContext, student.id],
  )
  const completionStatus = getTodayReportCompletionStatus(records)
  const completionLabel = getTodayReportCompletionLabel(completionStatus)
  const completionColor = getTodayReportCompletionColor(completionStatus)

  return (
    <article
      id={`today-report-student-${student.id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50/80 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-navy-900">{student.name}</h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${completionColor}`}
            >
              {completionLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {student.school} · {student.grade} · {student.className || '-'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            담당강사: {student.teacher || '-'}
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
          <TodayReportView
            key={`${student.id}-${date}`}
            student={student}
            readOnly={false}
            initialDate={date}
            hideHeader
            classNoteExtraActions={<StudentKakaoShareAction student={student} />}
          />
        </div>
      )}
    </article>
  )
}
