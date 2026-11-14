import { useParentStudent } from '../../contexts/ParentStudentContext'
import { ParentCategoryGrid } from '../../components/parent/ParentCategoryGrid'
import { ParentPwaInstallHint } from '../../components/parent/ParentPwaInstallHint'
import { ParentPushOptIn } from '../../components/parent/ParentPushOptIn'
import { ParentStudentInfoCard } from '../../components/parent/ParentStudentComponents'

export function ParentStudentHomePage() {
  const student = useParentStudent()

  return (
    <div className="parent-page parent-home pb-2">
      <ParentStudentInfoCard student={student} compact />
      <ParentPwaInstallHint />
      <ParentPushOptIn accessKey={student.studentAccessKey} />
      <section aria-label="학습 기록 메뉴" className="mt-3 sm:mt-4">
        <ParentCategoryGrid />
      </section>
    </div>
  )
}
