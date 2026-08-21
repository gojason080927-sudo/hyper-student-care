import { LogIn, LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { btnSecondary } from '../utils/labels'

type HeaderProps = {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleSignIn = () => {
    navigate('/login', {
      state: { from: `${location.pathname}${location.search}` },
    })
  }

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
        </div>

        <div className="flex items-center gap-3">
          {session && user?.email ? (
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
          ) : null}
          {session ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={`${btnSecondary} inline-flex items-center gap-2`}
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className={`${btnSecondary} inline-flex items-center gap-2`}
            >
              <LogIn className="h-4 w-4" />
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
