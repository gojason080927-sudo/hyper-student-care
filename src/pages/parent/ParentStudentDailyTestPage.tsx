import { DailyTestSessionGrid } from '../../components/dailytest/DailyTestSessionGrid'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import { getScoreColor } from '../../utils/labels'
import { StatusBadge } from '../../components/ui/StatusBadge'

export function ParentStudentDailyTestPage() {
  const { dailyTests } = useParentStudentRecords()

  return (
    <div className="space-y-6">
      <PageHeader title="일일테스트" description="일일평가 점수와 결과를 확인합니다." />

      {dailyTests.length === 0 ? (
        <EmptyState title="일일테스트 기록이 없습니다." />
      ) : (
        <div className="space-y-4">
          {dailyTests.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">{formatKoreanDate(record.date)}</p>
                <span className="text-sm text-slate-500">{record.subject}</span>
                <StatusBadge
                  label={`${record.percentage}%`}
                  colorClass={getScoreColor(record.percentage)}
                />
              </div>
              <div className="mt-4">
                <DailyTestSessionGrid record={record} compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
