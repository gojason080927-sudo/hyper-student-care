import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { StudentKakaoShareAction } from '../students/StudentKakaoShareAction'
import { TodayReportView } from '../todayReport/TodayReportView'
import type { Student } from '../../types/student'
import type { ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
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
  classSync?: ClassTodayReportSyncContext
  /** 반 전체 출결 패널 사용 시 학생별 출결 섹션 숨김 */
  omitAttendance?: boolean
  /** 반 전체 숙제 수행/오늘 과제/진도 패널 사용 시 학생별 해당 섹션 숨김 */
  omitHomeworkAndProgress?: boolean
  /** 반 전체 일일테스트 패널 사용 시 학생별 일일테스트 섹션 숨김 */
  omitDailyTest?: boolean
}

export function TodayReportStudentAccordion({
  student,
  date,
  expanded,
  onToggle,
  lookupContext,
  classSync,
  omitAttendance = false,
  omitHomeworkAndProgress = false,
  omitDailyTest = false,
}: TodayReportStudentAccordionProps) {
  const records = useMemo(
    () => findStudentDayRecords(student.id, date, lookupContext),
    [date, lookupContext, student.id],
  )
  const completionStatus = getTodayReportCompletionStatus(records, student.id, date)
  const completionLabel = getTodayReportCompletionLabel(completionStatus)
  const completionColor = getTodayReportCompletionColor(completionStatus)

  return (
    <article
      id={`today-report-student-${student.id}`}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80 sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-bold text-navy-900">{student.name}</h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${completionColor}`}
            >
              {completionLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            {student.school} · {student.grade} · {student.className || '-'} ·{' '}
            {student.teacher || '-'}
          </p>
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 sm:px-4">
          <TodayReportView
            key={`${student.id}-${date}`}
            student={student}
            readOnly={false}
            initialDate={date}
            hideHeader
            compactTeacherInput
            classSync={classSync}
            omitSections={
              omitAttendance || omitHomeworkAndProgress || omitDailyTest
                ? [
                    ...(omitAttendance ? (['attendance'] as const) : []),
                    ...(omitHomeworkAndProgress
                      ? (['homework', 'progress'] as const)
                      : []),
                    ...(omitDailyTest ? (['dailyTest'] as const) : []),
                  ]
                : undefined
            }
            classNoteExtraActions={<StudentKakaoShareAction student={student} compact />}
          />
        </div>
      )}
    </article>
  )
}
