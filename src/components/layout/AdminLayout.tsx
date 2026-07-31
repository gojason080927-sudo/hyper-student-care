import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

/** 강사용 관리자 레이아웃 (TeacherLayout — ParentLayout과 분리) */
export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useBodyScrollLock(sidebarOpen)

  return (
    <div className="flex min-h-svh overflow-x-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
