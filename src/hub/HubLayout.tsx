import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { isSupabaseConfigured, normalizeRouteAccessKey } from '../lib/supabase'
import { HubProvider } from './HubContext'
import { HubPwaRegistrar } from './HubPwaRegistrar'
import { rpcGetStudentHubBundle, rpcGetStudentHubIdentity, type StudentHubBundle } from './hubRpc'
import { hubRouteReloadNeeded } from './hubRouteRefresh'
import '../styles/hyperDesignTokens.css'
import './hub.css'

function HubMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="student-hub-app flex min-h-svh items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="hub-page-header-title break-keep text-xl font-bold">{title}</h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-[#6B7280]">{body}</p>
      </div>
    </div>
  )
}

export function HubLayout() {
  const { studentAccessKey = '' } = useParams()
  const location = useLocation()
  const accessKey = useMemo(() => normalizeRouteAccessKey(studentAccessKey), [studentAccessKey])
  const [bundle, setBundle] = useState<StudentHubBundle | null | undefined>(undefined)
  const [mode, setMode] = useState<'loading' | 'config' | 'invalid' | 'inactive' | 'ready'>('loading')
  const loadGenRef = useRef(0)
  const prevPathRef = useRef<string | null>(null)

  const applyBundle = (gen: number, next: StudentHubBundle | null) => {
    if (gen !== loadGenRef.current) return
    if (!next) {
      setMode('invalid')
      setBundle(null)
      return
    }
    if (!next.student.accessKeyActive || next.inactive) {
      setMode('inactive')
      setBundle(next)
      return
    }
    setBundle(next)
    setMode('ready')
  }

  const reload = async () => {
    const gen = ++loadGenRef.current
    setMode('loading')
    setBundle(undefined)
    const next = await rpcGetStudentHubBundle(accessKey)
    applyBundle(gen, next)
  }

  useEffect(() => {
    prevPathRef.current = null
  }, [accessKey])

  useEffect(() => {
    const previous = prevPathRef.current
    prevPathRef.current = location.pathname
    if (!hubRouteReloadNeeded(previous, location.pathname)) return
    const gen = ++loadGenRef.current
    setMode('loading')
    setBundle(undefined)
    let cancelled = false
    void (async () => {
      const next = await rpcGetStudentHubBundle(accessKey)
      if (cancelled) return
      applyBundle(gen, next)
    })()
    return () => {
      cancelled = true
    }
  }, [accessKey, location.pathname])

  useEffect(() => {
    let cancelled = false
    const gen = ++loadGenRef.current
    setMode('loading')
    setBundle(undefined)
    void (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled && gen === loadGenRef.current) setMode('config')
        return
      }
      const identity = await rpcGetStudentHubIdentity(accessKey)
      if (cancelled || gen !== loadGenRef.current) return
      if (!identity) {
        setMode('invalid')
        return
      }
      if (!identity.accessKeyActive) {
        setMode('inactive')
        return
      }
      const next = await rpcGetStudentHubBundle(accessKey)
      if (cancelled || gen !== loadGenRef.current) return
      applyBundle(gen, next)
    })()
    return () => {
      cancelled = true
    }
  }, [accessKey])

  if (mode === 'config') {
    return <HubMessage title="서비스 연결 설정이 필요합니다." body="배포 환경의 Supabase 설정을 확인해 주세요." />
  }
  if (mode === 'invalid') {
    return <HubMessage title="유효하지 않거나 만료된 학생 링크입니다." body="학원에 정확한 학생 Hub 링크를 요청해 주세요." />
  }
  if (mode === 'inactive') {
    return <HubMessage title="현재 사용할 수 없는 학생 링크입니다." body="학원에 문의해 주세요." />
  }
  if (mode === 'loading' || !bundle) {
    return (
      <div className="student-hub-app flex min-h-svh items-center justify-center text-sm text-slate-500">
        불러오는 중…
      </div>
    )
  }

  return (
    <HubProvider accessKey={accessKey} bundle={bundle} reload={reload}>
      <HubPwaRegistrar accessKey={accessKey} />
      <div className="student-hub-app min-h-svh">
        <Outlet />
      </div>
    </HubProvider>
  )
}
