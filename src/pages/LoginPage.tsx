import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/brand/BrandMark'
import {
  RememberLoginCheckbox,
} from '../components/teacherMobile/PwaInstallPrompt'
import { TeacherPwaRegistrar } from '../components/teacherMobile/TeacherPwaRegistrar'
import { useAuth } from '../contexts/AuthContext'
import { getRememberLogin } from '../lib/teacherAuthStorage'
import {
  isTeacherMobileLoginContext,
  isTeacherMobileLoginPath,
  resolveTeacherLoginReturn,
  saveTeacherLoginReturn,
} from '../lib/teacherLoginReturn'
import '../styles/teacherMobileTheme.css'
import { btnPrimary } from '../utils/labels'

type LocationState = {
  from?: string
}

export function LoginPage() {
  const { session, isLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const redirectTo = useMemo(() => {
    const resolved = resolveTeacherLoginReturn(
      (location.state as LocationState | null)?.from,
      searchParams.get('returnTo'),
    )
    if (isTeacherMobileLoginPath(location.pathname)) {
      return isTeacherMobileLoginContext(resolved) ? resolved : '/teacher/mobile'
    }
    return resolved
  }, [location.pathname, location.state, searchParams])

  const isMobileTeacherLogin =
    isTeacherMobileLoginPath(location.pathname) || isTeacherMobileLoginContext(redirectTo)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberLogin, setRememberLoginState] = useState(() => getRememberLogin())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sessionCheckMessage = isMobileTeacherLogin
    ? '로그인 상태를 확인하고 있습니다.'
    : '로그인 상태를 확인하는 중…'

  useEffect(() => {
    if (isMobileTeacherLogin) {
      saveTeacherLoginReturn(redirectTo)
    }
  }, [isMobileTeacherLogin, redirectTo])

  useEffect(() => {
    if (!isLoading && session) {
      navigate(redirectTo, { replace: true })
    }
  }, [isLoading, navigate, redirectTo, session])

  if (isLoading) {
    return (
      <>
        {isMobileTeacherLogin ? <TeacherPwaRegistrar /> : null}
        <div
          className={
            isMobileTeacherLogin
              ? 'teacher-mobile-login flex min-h-svh items-center justify-center'
              : 'flex min-h-svh items-center justify-center bg-slate-50'
          }
        >
          <p className="text-sm text-slate-500">{sessionCheckMessage}</p>
        </div>
      </>
    )
  }

  if (session) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await signIn(email, password, {
      rememberMe: isMobileTeacherLogin ? rememberLogin : true,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    navigate(redirectTo, { replace: true })
  }

  return (
    <>
      {isMobileTeacherLogin ? <TeacherPwaRegistrar /> : null}
      <div
        className={
          isMobileTeacherLogin
            ? 'teacher-mobile-login flex min-h-svh items-center justify-center px-4'
            : 'flex min-h-svh items-center justify-center bg-slate-50 px-4'
        }
      >
        <div
          className={
            isMobileTeacherLogin
              ? 'tm-login-card w-full max-w-md p-8'
              : 'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'
          }
        >
          <div className="mb-6 flex justify-center">
            {isMobileTeacherLogin ? (
              <div className="text-center">
                <p className="tm-login-kicker">HYPER TEACHER</p>
                <p className="tm-login-title mt-1 text-lg font-bold">강사용 학생관리 앱</p>
              </div>
            ) : (
              <BrandMark variant="header" />
            )}
          </div>
          <h1
            className={`text-center text-xl font-bold ${isMobileTeacherLogin ? 'tm-login-title' : 'text-navy-900'}`}
          >
            {isMobileTeacherLogin ? '강사 로그인' : '강사용 로그인'}
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            학원 공용 계정으로 로그인 해주세요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                이메일
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                비밀번호
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
              />
            </div>

            {isMobileTeacherLogin ? (
              <RememberLoginCheckbox
                checked={rememberLogin}
                onChange={setRememberLoginState}
              />
            ) : null}

            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className={
                isMobileTeacherLogin
                  ? 'tm-btn-primary w-full py-2.5 disabled:opacity-60'
                  : `${btnPrimary} w-full py-2.5 disabled:opacity-60`
              }
            >
              {submitting ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
