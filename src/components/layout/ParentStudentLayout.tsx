import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { resolveStudentByAccessKey } from '../../lib/dataLoader'
import { isSupabaseConfigured, normalizeRouteAccessKey } from '../../lib/supabase'
import { ParentStudentProvider } from '../../contexts/ParentStudentContext'
import { ParentUnreadProvider } from '../../contexts/ParentUnreadContext'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useData } from '../../hooks/useData'
import type { Student } from '../../types/student'
import { ParentPwaRegistrar } from '../parent/ParentPwaRegistrar'
import { ParentStudentBottomNav } from '../parent/ParentStudentBottomNav'
import { ParentStudentSidebar } from '../parent/ParentStudentSidebar'
import '../../styles/teacherMobileTheme.css'
import '../../styles/parentMobileTheme.css'

function InvalidStudentAccessPage() {
  return (
    <div className="parent-mobile-app flex min-h-svh items-center justify-center px-4">
      <div className="pm-error-card p-8 text-center">
        <h1 className="text-xl font-bold text-[#163A70]">유효하지 않거나 만료된 학생 링크입니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
          학원에 정확한 링크를 요청해 주세요.
        </p>
      </div>
    </div>
  )
}

function InactiveStudentAccessPage() {
  return (
    <div className="parent-mobile-app flex min-h-svh items-center justify-center px-4">
      <div className="pm-error-card p-8 text-center">
        <h1 className="text-xl font-bold text-[#163A70]">
          현재 사용할 수 없는 학생 링크입니다. 학원에 문의해 주세요.
        </h1>
      </div>
    </div>
  )
}

function SupabaseConfigErrorPage() {
  return (
    <div className="parent-mobile-app flex min-h-svh items-center justify-center px-4">
      <div className="pm-error-card p-8 text-center">
        <h1 className="text-xl font-bold text-[#163A70]">서비스 연결 설정이 필요합니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
          Supabase 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)를 배포 환경에 설정한 뒤
          다시 시도해 주세요.
        </p>
      </div>
    </div>
  )
}

function isStudentLinkActive(student: Student): boolean {
  return student.accessKeyActive !== false
}

type ParentStudentLayoutInnerProps = {
  studentAccessKey: string
}

function ParentStudentLayoutInner({ studentAccessKey }: ParentStudentLayoutInnerProps) {
  const { isLoading, loadParentCareData } = useData()
  const [resolvedStudent, setResolvedStudent] = useState<Student | null | undefined>(undefined)
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const [resolveError, setResolveError] = useState<'config' | 'invalid' | null>(null)
  const loadedAccessKeyRef = useRef<string | null>(null)
  const careLoadIdRef = useRef(0)

  const normalizedAccessKey = useMemo(
    () => normalizeRouteAccessKey(studentAccessKey),
    [studentAccessKey],
  )

  useEffect(() => {
    if (isLoading || !normalizedAccessKey) return

    let cancelled = false
    setResolvedStudent(undefined)
    setRecordsLoaded(false)
    setResolveError(null)
    loadedAccessKeyRef.current = null
    careLoadIdRef.current += 1

    void (async () => {
      if (!isSupabaseConfigured()) {
        console.error('[ParentAccess] step 2 blocked: Supabase env vars missing')
        if (!cancelled) {
          setResolveError('config')
          setResolvedStudent(null)
        }
        return
      }

      const student = await resolveStudentByAccessKey(normalizedAccessKey)
      if (cancelled) return

      if (!student) {
        console.error('[ParentAccess] step 2: student not found via RPC')
        setResolveError('invalid')
        setResolvedStudent(null)
        return
      }

      console.log('[ParentAccess] step 2: student resolved via RPC', student.id)
      setResolvedStudent(student)
    })()

    return () => {
      cancelled = true
    }
  }, [isLoading, normalizedAccessKey])

  useEffect(() => {
    if (!resolvedStudent || !isStudentLinkActive(resolvedStudent)) {
      return
    }

    const key = resolvedStudent.studentAccessKey.trim()
    const careLoadId = ++careLoadIdRef.current
    setRecordsLoaded(false)

    void loadParentCareData(key)
      .then(() => {
        if (careLoadIdRef.current !== careLoadId) return
        console.log('[ParentAccess] step 3: student records loaded successfully')
        loadedAccessKeyRef.current = key
        setRecordsLoaded(true)
      })
      .catch((error) => {
        if (careLoadIdRef.current !== careLoadId) return
        console.error('[ParentAccess] step 3: student records load failed', error)
        loadedAccessKeyRef.current = null
        setRecordsLoaded(false)
      })
  }, [loadParentCareData, resolvedStudent])

  if (isLoading || resolvedStudent === undefined) {
    return (
      <div
        className="parent-mobile-app flex min-h-svh items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-[#6B7280]">학생 정보를 불러오는 중…</p>
      </div>
    )
  }

  if (resolveError === 'config') {
    return <SupabaseConfigErrorPage />
  }

  if (!resolvedStudent) {
    return <InvalidStudentAccessPage />
  }

  if (!isStudentLinkActive(resolvedStudent)) {
    return <InactiveStudentAccessPage />
  }

  if (!recordsLoaded) {
    return (
      <div
        className="parent-mobile-app flex min-h-svh items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-[#6B7280]">학습 기록을 불러오는 중…</p>
      </div>
    )
  }

  return (
    <ParentStudentProvider student={resolvedStudent}>
      <ParentUnreadProvider>
        <ParentStudentLayoutChrome student={resolvedStudent} />
      </ParentUnreadProvider>
    </ParentStudentProvider>
  )
}

function ParentStudentLayoutChrome({ student }: { student: Student }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useBodyScrollLock(sidebarOpen)

  return (
    <div className="parent-mobile-app flex min-h-svh overflow-x-hidden">
      <ParentPwaRegistrar studentAccessKey={student.studentAccessKey} />
      <ParentStudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className="parent-main parent-main--with-bottom-nav flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-8"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="mx-auto max-w-3xl lg:max-w-4xl">
            <Outlet key={student.id} />
          </div>
        </main>
        <ParentStudentBottomNav onOpenMore={() => setSidebarOpen(true)} />
      </div>
    </div>
  )
}

export function ParentStudentLayout() {
  const { studentAccessKey = '' } = useParams()
  const normalizedKey = normalizeRouteAccessKey(studentAccessKey)
  return (
    <ParentStudentLayoutInner key={normalizedKey} studentAccessKey={normalizedKey} />
  )
}
