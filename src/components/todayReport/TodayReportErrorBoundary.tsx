import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type TodayReportErrorBoundaryProps = {
  homePath: string
  children: ReactNode
}

type TodayReportErrorBoundaryState = {
  hasError: boolean
}

export class TodayReportErrorBoundary extends Component<
  TodayReportErrorBoundaryProps,
  TodayReportErrorBoundaryState
> {
  state: TodayReportErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): TodayReportErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Today Report]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h2 className="text-lg font-bold text-navy-900">
            Today Report를 불러오는 중 문제가 발생했습니다.
          </h2>
          <p className="mt-2 text-sm text-slate-600">잠시 후 다시 시도해 주세요.</p>
          <Link
            to={this.props.homePath}
            className="mt-4 inline-flex rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      )
    }

    return this.props.children
  }
}
