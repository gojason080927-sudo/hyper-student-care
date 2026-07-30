import { useEffect, useRef } from 'react'

const PARENT_POLL_INTERVAL_MS = 30_000

type UseParentTodayReportAutoRefreshOptions = {
  enabled: boolean
  studentId: string
  selectedDate: string
  onRefresh: (studentId: string, date: string) => Promise<void>
}

/** 학부모 Today Report: 탭 복귀·포커스·주기적 재조회로 강사 저장 내용 반영 */
export function useParentTodayReportAutoRefresh({
  enabled,
  studentId,
  selectedDate,
  onRefresh,
}: UseParentTodayReportAutoRefreshOptions) {
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled || !studentId || !selectedDate) return

    let cancelled = false

    const runRefresh = () => {
      if (cancelled || document.visibilityState !== 'visible') return
      void refreshRef.current(studentId, selectedDate)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh()
      }
    }

    const onWindowFocus = () => {
      runRefresh()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)

    const intervalId = window.setInterval(runRefresh, PARENT_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
      window.clearInterval(intervalId)
    }
  }, [enabled, selectedDate, studentId])
}
