import { StatusBadge } from '../../components/ui/StatusBadge'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { useMarkParentCategoryReadOnView } from '../../hooks/useMarkParentCategoryReadOnView'
import { formatKoreanDate } from '../../utils/date'
import {
  getMakeupMethodColor,
  getMakeupPlanStatusColor,
  getMakeupSubjectColor,
} from '../../utils/labels'

export function ParentStudentMakeupPlanPage() {
  const { makeupPlans } = useParentStudentRecords()
  useMarkParentCategoryReadOnView('makeup-plans')

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="보강계획" description="보강 예정일과 진행 방식을 확인합니다." />

      {makeupPlans.length === 0 ? (
        <ParentEmptyState />
      ) : (
        <div className="parent-record-list space-y-3">
          {makeupPlans.map((record) => (
            <ParentRecordCard
              key={record.id}
              date={`${formatKoreanDate(record.scheduledDate)} ${record.scheduledTime}`}
              title={record.subject}
              status={
                <>
                  <StatusBadge
                    label={record.status}
                    colorClass={getMakeupPlanStatusColor(record.status)}
                  />
                  {record.method && (
                    <StatusBadge
                      label={record.method}
                      colorClass={getMakeupMethodColor(record.method)}
                    />
                  )}
                </>
              }
            >
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">과목</dt>
                  <dd className="mt-0.5">
                    <StatusBadge label={record.subject} colorClass={getMakeupSubjectColor()} />
                  </dd>
                </div>
                {record.reason && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">사유</dt>
                    <dd className="mt-0.5 break-anywhere text-slate-700">{record.reason}</dd>
                  </div>
                )}
              </dl>
              {record.memo && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-medium text-slate-500">메모</span>
                  {record.memo}
                </p>
              )}
            </ParentRecordCard>
          ))}
        </div>
      )}
    </div>
  )
}
