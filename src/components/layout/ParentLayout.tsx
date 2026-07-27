import { Outlet } from 'react-router-dom'
import { BrandMark } from '../brand/BrandMark'

/**
 * 학부모·학생용 레이아웃 (읽기 전용)
 * - 관리자 사이드바·편집 버튼·강사용 링크 미포함
 * TODO: 외부 배포 전 강사용 관리자 경로(/teacher/*)에 실제 인증을 추가할 것.
 */
export function ParentLayout() {
  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <BrandMark variant="compact" />
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
