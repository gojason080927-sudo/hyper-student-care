import { ParentProgressCard } from '../../components/parent/ParentProgressCard'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'

export function ParentStudentProgressPage() {
  const { progressRecords } = useParentStudentRecords()

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader
        title="진도 과정"
        description="교재 진행률과 학습 현황을 한눈에 확인합니다."
      />

      {progressRecords.length === 0 ? (
        <ParentEmptyState />
      ) : (
        <div className="parent-record-list space-y-4">
          {progressRecords.map((record) => (
            <ParentProgressCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  )
}
