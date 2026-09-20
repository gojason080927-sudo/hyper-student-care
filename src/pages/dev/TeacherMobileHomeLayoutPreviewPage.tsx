import { TeacherMobileDashboardPage } from '../teacherMobile/TeacherMobileDashboardPage'
import '../../styles/teacherMobileTheme.css'

/** 개발 전용: 강사 모바일 HOME을 Student Hub 골격으로 확인 */
export function TeacherMobileHomeLayoutPreviewPage() {
  return (
    <div className="teacher-mobile-app flex min-h-svh flex-col overflow-x-hidden">
      <main className="flex min-h-0 flex-1 flex-col">
        <TeacherMobileDashboardPage />
      </main>
    </div>
  )
}
