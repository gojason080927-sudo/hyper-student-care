import { useParentStudent } from '../../contexts/ParentStudentContext'
import { ParentCategoryGrid } from '../../components/parent/ParentCategoryGrid'
import { ParentStudentInfoCard } from '../../components/parent/ParentStudentComponents'

export function ParentStudentHomePage() {
  const student = useParentStudent()

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentStudentInfoCard student={student} />

      <section aria-label="학습 기록 메뉴">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">
          확인할 항목을 선택해 주세요
        </h2>
        <ParentCategoryGrid />
      </section>
    </div>
  )
}
