import { HomeworkContentDisplay } from '../../components/homework/HomeworkContentDisplay'
import { StatusBadge } from '../../components/ui/StatusBadge'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'
import { getHomeworkContent } from '../../utils/homework'
import { getHomeworkColor } from '../../utils/labels'

export function ParentStudentHomeworkPage() {
  const { homework } = useParentStudentRecords()

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="숙제" description="숙제 수행 상태를 확인합니다." />

      {homework.length === 0 ? (
        <ParentEmptyState />
      ) : (
        <div className="parent-record-list space-y-3">
          {homework.map((record) => (
            <ParentRecordCard
              key={record.id}
              date={formatKoreanDate(record.date)}
              status={
                <StatusBadge label={record.status} colorClass={getHomeworkColor(record.status)} />
              }
            >
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">숙제 내용</p>
                <HomeworkContentDisplay content={getHomeworkContent(record)} />
              </div>
              {record.teacherMemo && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-medium text-slate-500">교사 메모</span>
                  {record.teacherMemo}
                </p>
              )}
            </ParentRecordCard>
          ))}
        </div>
      )}
    </div>
  )
}
