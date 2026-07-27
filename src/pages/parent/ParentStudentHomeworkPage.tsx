import { HomeworkContentDisplay } from '../../components/homework/HomeworkContentDisplay'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import { getHomeworkContent } from '../../utils/homework'
import { getHomeworkColor } from '../../utils/labels'

export function ParentStudentHomeworkPage() {
  const { homework } = useParentStudentRecords()

  return (
    <div className="space-y-6">
      <PageHeader title="숙제관리" description="숙제 수행 상태를 확인합니다." />

      {homework.length === 0 ? (
        <EmptyState title="숙제 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {homework.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">{formatKoreanDate(record.date)}</p>
                <StatusBadge label={record.status} colorClass={getHomeworkColor(record.status)} />
              </div>
              <div className="mt-2">
                <HomeworkContentDisplay content={getHomeworkContent(record)} />
              </div>
              {record.teacherMemo && (
                <p className="mt-2 text-sm text-slate-500">메모: {record.teacherMemo}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
