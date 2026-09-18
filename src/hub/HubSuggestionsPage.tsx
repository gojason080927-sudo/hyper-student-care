import { useState, type FormEvent } from 'react'
import { rpcSubmitHubInbox } from './hubRpc'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { HubInboxItemCard } from './HubInboxItemCard'

export function HubSuggestionsPage() {
  const { accessKey, inbox, student, reload } = useHub()
  const items = inbox.filter((item) => item.kind === 'suggestion')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      await rpcSubmitHubInbox({
        accessKey,
        kind: 'suggestion',
        title: '건의',
        content,
      })
      setContent('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="건의사항" />
      <p className="mb-3 text-xs text-slate-500">
        기명 접수입니다. 작성자 {student.name} 학생이 학원에 전달됩니다. 다른 학생은 볼 수 없습니다.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mb-5 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="바라는 점, 불편사항, 개선·시정 요청"
          rows={5}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#163A70] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? '저장 중…' : '건의 보내기'}
        </button>
      </form>
      {items.length === 0 ? (
        <HubEmpty message="보낸 건의가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <HubInboxItemCard key={item.id} item={item} accessKey={accessKey} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  )
}
