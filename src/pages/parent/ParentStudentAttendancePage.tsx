import { StatusBadge } from '../../components/ui/StatusBadge'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import { getAttendanceColor } from '../../utils/labels'

export function ParentStudentAttendancePage() {
  const { attendance } = useParentStudentRecords()

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="출결" description="출석·지각·결석·조퇴 기록을 확인합니다." />

      {attendance.length === 0 ? (
        <ParentEmptyState />
      ) : (
        <div className="parent-record-list space-y-3">
          {attendance.map((record) => (
            <ParentRecordCard
              key={record.id}
              date={formatKoreanDate(record.date)}
              status={
                <StatusBadge
                  label={record.status}
                  colorClass={getAttendanceColor(record.status)}
                />
              }
            >
              {record.reason && (
                <p>
                  <span className="font-medium text-slate-600">사유</span>
                  <span className="ml-1.5 break-anywhere text-slate-700">{record.reason}</span>
                </p>
              )}
              {record.memo && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
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
