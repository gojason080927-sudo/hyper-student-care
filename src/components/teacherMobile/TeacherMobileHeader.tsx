import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { TEACHER_MOBILE_LOGIN_PATH } from '../../lib/teacherLoginReturn'

export function TeacherMobileHeader({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children?: ReactNode
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.email?.split('@')[0] ?? '강사'

  const handleSignOut = async () => {
    await signOut()
    navigate(TEACHER_MOBILE_LOGIN_PATH, { replace: true })
  }

  return (
    <header
      className="sticky top-0 z-30 border-b border-[rgba(22,58,112,0.06)] bg-white/92 backdrop-blur-md"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-2">
        <div className="min-w-0 flex-1">
          <p className="tm-header-kicker">HYPER TEACHER</p>
          <h1 className="tm-header-title truncate">{title ?? '강사용 학생관리 앱'}</h1>
          {(subtitle ?? displayName) && (
            <p className="tm-header-sub mt-0.5 truncate">{subtitle ?? displayName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="tm-icon-btn"
          aria-label="로그아웃"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
      {children}
    </header>
  )
}
