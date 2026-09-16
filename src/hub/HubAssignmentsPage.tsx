import { formatKoreanDate } from '../utils/date'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

export function HubAssignmentsPage() {
  const { assignments } = useHub()
  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="오늘의 과제" />
      {assignments.length === 0 ? (
        <HubEmpty message="게시된 과제가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {assignments.map((item) => (
            <li key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#28c7b7]">
                {item.subject}
                {item.textbookName ? ` · ${item.textbookName}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.content}</p>
              {item.dueDate ? (
                <p className="mt-2 text-xs text-slate-500">마감 {formatKoreanDate(item.dueDate)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
