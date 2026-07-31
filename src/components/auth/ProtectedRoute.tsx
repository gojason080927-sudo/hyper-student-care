import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { saveTeacherLoginReturn, TEACHER_MOBILE_LOGIN_PATH } from '../../lib/teacherLoginReturn'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()
  const isMobileTeacher = location.pathname.startsWith('/teacher/mobile')
  const returnTo = `${location.pathname}${location.search}`

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          {isMobileTeacher
            ? '로그인 상태를 확인하고 있습니다.'
            : '로그인 상태를 확인하는 중…'}
        </p>
      </div>
    )
  }

  if (!session) {
    if (isMobileTeacher) {
      saveTeacherLoginReturn(returnTo)
    }

    const loginPath = isMobileTeacher
      ? `${TEACHER_MOBILE_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`
      : '/login'

    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: returnTo }}
      />
    )
  }

  return <Outlet />
}
