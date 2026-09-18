import { ParentStudentProvider } from '../../contexts/ParentStudentContext'
import { ParentStudentHomePage } from '../parent/ParentStudentHomePage'
import type { Student } from '../../types/student'
import '../../styles/parentMobileTheme.css'

const previewStudent: Student = {
  id: 'preview-student',
  name: '김하이퍼',
  studentAccessKey: 'preview-key',
  accessKeyActive: true,
  school: '하이퍼중학교',
  grade: '중2',
  studentPhone: '',
  parentPhone: '',
  className: '중2-수학A',
  subjects: ['수학', '영어'],
  teacher: '박강사',
  enrollmentDate: '2026-03-02',
  status: '재원',
  memo: '',
  createdAt: '',
  updatedAt: '',
}

/** 개발 전용: 학부모 HOME을 Student/Teacher Hub 골격으로 확인 */
export function ParentHomeLayoutPreviewPage() {
  return (
    <ParentStudentProvider student={previewStudent}>
      <div className="parent-mobile-app flex min-h-svh overflow-x-hidden">
        <main className="flex min-h-0 flex-1 flex-col">
          <ParentStudentHomePage />
        </main>
      </div>
    </ParentStudentProvider>
  )
}
