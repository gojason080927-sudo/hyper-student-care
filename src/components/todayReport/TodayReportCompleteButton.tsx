import { useEffect, useState } from 'react'
import { useData } from '../../hooks/useData'
import {
  completeTodayReportAndNotify,
  fetchTodayReportCompletion,
} from '../../lib/todayReportCompletion'

type Props = {
  studentId: string
  studentName: string
  reportDate: string
  compact?: boolean
}

export function TodayReportCompleteButton({
  studentId,
  studentName,
  reportDate,
  compact = false,
}: Props) {
  const { showToast } = useData()
  const [completed, setCompleted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchTodayReportCompletion(studentId, reportDate).then((state) => {
      if (!cancelled) setCompleted(state.completed)
    })
    return () => {
      cancelled = true
    }
  }, [reportDate, studentId])

  const handleComplete = async () => {
    if (completed || busy) return
    setBusy(true)
    const result = await completeTodayReportAndNotify({ studentId, reportDate })
    setBusy(false)

    if (result.status === 'already_completed') {
      setCompleted(true)
      return
    }
    if (result.status === 'error') {
      showToast(result.message)
      return
    }

    setCompleted(true)
    if (result.push === 'failed') {
      showToast('입력 내용은 저장되었지만 알림 발송에 실패했습니다.')
      return
    }
    if (result.push === 'no_subscribers') {
      showToast(`${studentName} 학생 입력이 완료되었습니다. 등록된 학부모 알림이 없습니다.`)
      return
    }
    showToast(`${studentName} 학생 입력이 완료되었습니다.`)
  }

  return (
    <button
      type="button"
      data-today-report-complete="true"
      data-student-id={studentId}
      data-report-date={reportDate}
      disabled={completed || busy}
      onClick={() => void handleComplete()}
      className={
        compact
          ? 'min-h-9 rounded-lg border border-[rgba(22,58,112,0.14)] bg-[#163A70] px-3 text-xs font-semibold text-white disabled:bg-slate-300'
          : 'mt-3 min-h-11 w-full rounded-xl bg-[#163A70] text-sm font-semibold text-white hover:bg-[#122f5c] disabled:bg-slate-300'
      }
    >
      {completed ? '완료됨' : busy ? '처리 중…' : '입력 완료'}
    </button>
  )
}
