import { formatKoreanDate } from '../utils/date'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { useState } from 'react'

export function HubNoticesPage() {
  const { notices } = useHub()
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = notices.find((item) => item.id === openId) ?? null

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="공지사항" />
      {notices.length === 0 ? (
        <HubEmpty message="확인할 공지가 없습니다." />
      ) : selected ? (
        <div className="space-y-3">
          <button
            type="button"
            className="text-sm font-semibold text-[#163A70]"
            onClick={() => setOpenId(null)}
          >
            ← 목록
          </button>
          <h2 className="text-lg font-bold text-[#163A70]">{selected.title}</h2>
          <p className="text-xs text-slate-500">{formatKoreanDate(selected.publishedAt)}</p>
          <article className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">
            {selected.content}
          </article>
        </div>
      ) : (
        <ul className="space-y-3">
          {notices.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="w-full rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <p className="font-bold text-[#163A70]">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{formatKoreanDate(item.publishedAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
