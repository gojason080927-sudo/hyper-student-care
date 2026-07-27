import { TextbookProgress } from '../../components/ui/TextbookProgress'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'

export function ParentStudentProgressPage() {
  const { progressRecords } = useParentStudentRecords()

  return (
    <div className="space-y-6">
      <PageHeader title="진도 과정" description="교재 진행 상황과 학습 진도를 확인합니다." />

      {progressRecords.length === 0 ? (
        <EmptyState title="진도 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {progressRecords.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-navy-900">
                {record.subject} · {record.textbookName}
              </p>
              <p className="mt-1 text-sm text-slate-600">{record.currentProgress}</p>
              <div className="mt-3">
                <TextbookProgress value={record.progressRate} className="max-w-xs" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {record.currentPage} / {record.totalPage} 페이지
              </p>
              <p className="mt-2 text-xs text-slate-500">
                최근 학습일: {formatKoreanDate(record.lastStudyDate)}
              </p>
              {record.teacherMemo && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {record.teacherMemo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
