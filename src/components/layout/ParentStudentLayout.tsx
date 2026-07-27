import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { ParentStudentProvider } from '../../contexts/ParentStudentContext'
import { useData } from '../../hooks/useData'
import { ParentStudentSidebar } from '../parent/ParentStudentSidebar'

function InvalidStudentAccessPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-navy-900">접근할 수 없는 학생 링크입니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          학원에 정확한 링크를 요청해 주세요.
        </p>
      </div>
    </div>
  )
}

/**
 * TODO: 외부 정식 배포 전 서버 데이터베이스와 접근 권한 검증을 적용할 것.
 * 클라이언트 localStorage만으로는 완전한 개인정보 보호가 불가능하다.
 */
export function ParentStudentLayout() {
  const { studentAccessKey = '' } = useParams()
  const { getStudentByAccessKey } = useData()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const student = getStudentByAccessKey(studentAccessKey)

  if (!student) {
    return <InvalidStudentAccessPage />
  }

  return (
    <ParentStudentProvider student={student}>
      <div className="flex min-h-svh bg-slate-50">
        <ParentStudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <button
                type="button"
                aria-label="메뉴 열기"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-base font-bold text-navy-900">{student.name}</p>
                <p className="text-xs text-slate-500">Hyper Student Care</p>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ParentStudentProvider>
  )
}
