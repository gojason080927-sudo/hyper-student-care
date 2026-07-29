import { useParentStudent } from '../../contexts/ParentStudentContext'
import { ParentCategoryGrid } from '../../components/parent/ParentCategoryGrid'
import { ParentStudentInfoCard } from '../../components/parent/ParentStudentComponents'

export function ParentStudentHomePage() {
  const student = useParentStudent()

  return (
    <div className="parent-page parent-home pb-4">
      <ParentStudentInfoCard student={student} compact />
      <section aria-label="학습 기록 메뉴" className="mt-3 sm:mt-4">
        <ParentCategoryGrid />
      </section>
    </div>
  )
}
