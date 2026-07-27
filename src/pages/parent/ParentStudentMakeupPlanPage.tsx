import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import {
  getMakeupMethodColor,
  getMakeupPlanStatusColor,
  getMakeupSubjectColor,
} from '../../utils/labels'

export function ParentStudentMakeupPlanPage() {
  const { makeupPlans } = useParentStudentRecords()

  return (
    <div className="space-y-6">
      <PageHeader title="보강계획" description="보강 예정일과 진행 방식을 확인합니다." />

      {makeupPlans.length === 0 ? (
        <EmptyState title="보강계획이 없습니다." />
      ) : (
        <div className="space-y-3">
          {makeupPlans.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">
                  {formatKoreanDate(record.scheduledDate)} {record.scheduledTime}
                </p>
                <StatusBadge label={record.status} colorClass={getMakeupPlanStatusColor(record.status)} />
                <StatusBadge label={record.subject} colorClass={getMakeupSubjectColor()} />
                {record.method && (
                  <StatusBadge label={record.method} colorClass={getMakeupMethodColor(record.method)} />
                )}
              </div>
              {record.reason && <p className="mt-2 text-sm text-slate-600">{record.reason}</p>}
              {record.memo && <p className="mt-1 text-sm text-slate-500">{record.memo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
