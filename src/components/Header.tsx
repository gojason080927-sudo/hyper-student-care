import { Menu, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from './brand/BrandMark'

type HeaderProps = {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="메뉴 열기"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <BrandMark variant="header" />
          </div>
        </div>

        <Link
          to="/teacher/monthly-evaluation"
          className="relative z-10 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:border-navy-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          강사용 관리
        </Link>
      </div>
    </header>
  )
}
