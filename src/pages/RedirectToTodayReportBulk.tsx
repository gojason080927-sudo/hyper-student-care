import { Navigate, useSearchParams } from 'react-router-dom'

/** 기존 Today Report / 반별 통합 입력 URL → 통합 화면으로 리디렉션 */
export function RedirectToTodayReportBulk() {
  const [searchParams] = useSearchParams()
  const query = searchParams.toString()
  return (
    <Navigate
      to={query ? `/teacher/today-report-bulk?${query}` : '/teacher/today-report-bulk'}
      replace
    />
  )
}
