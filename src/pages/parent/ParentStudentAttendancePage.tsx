import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import { getAttendanceColor } from '../../utils/labels'

export function ParentStudentAttendancePage() {
  const { attendance } = useParentStudentRecords()

  return (
    <div className="space-y-6">
      <PageHeader title="출결" description="출석·지각·결석·조퇴 기록을 확인합니다." />

      {attendance.length === 0 ? (
        <EmptyState title="출결 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {attendance.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">{formatKoreanDate(record.date)}</p>
                <StatusBadge label={record.status} colorClass={getAttendanceColor(record.status)} />
              </div>
              {record.reason && (
                <p className="mt-2 text-sm text-slate-600">사유: {record.reason}</p>
              )}
              {record.memo && <p className="mt-1 text-sm text-slate-500">{record.memo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
