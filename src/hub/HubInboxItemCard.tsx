import { useState, type FormEvent } from 'react'
import type { HubInboxItem } from './types'
import { rpcDeleteHubInbox, rpcUpdateHubInbox } from './hubRpc'
import {
  downloadHubObjectUrl,
  questionAttachmentBucket,
} from './hubStorageClient'

export function HubInboxItemCard({
  item,
  accessKey,
  onChanged,
}: {
  item: HubInboxItem
  accessKey: string
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(item.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      await rpcUpdateHubInbox({ accessKey, id: item.id, content })
      setEditing(false)
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('이 글을 철회할까요? 삭제되면 교사 화면에서도 사라집니다.')) return
    setBusy(true)
    setError('')
    try {
      await rpcDeleteHubInbox(accessKey, item.id)
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-400">{item.status}</p>
      {editing ? (
        <form onSubmit={(event) => void save(event)} className="mt-2 space-y-2">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-10 flex-1 rounded-xl bg-[#163A70] text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? '저장 중…' : '수정 저장'}
            </button>
            <button
              type="button"
              className="min-h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600"
              onClick={() => {
                setEditing(false)
                setContent(item.content)
                setError('')
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.content}</p>
          {item.attachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              className="mt-2 block text-xs font-semibold text-[#163A70] underline"
              onClick={async () => {
                const url = await downloadHubObjectUrl({
                  accessKey,
                  bucket: questionAttachmentBucket(),
                  path: attachment.storagePath,
                })
                window.open(url, '_blank', 'noopener')
              }}
            >
              {attachment.originalName || '이미지'}
            </button>
          ))}
          {item.teacherReply.trim() ? (
            <div className="mt-3 rounded-xl bg-[#f3eef8] px-3 py-2.5">
              <p className="text-[11px] font-bold text-[#5b348a]">교사 답변</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {item.teacherReply}
              </p>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="min-h-10 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 disabled:opacity-60"
              onClick={() => {
                setContent(item.content)
                setEditing(true)
              }}
            >
              수정
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-10 flex-1 rounded-xl bg-rose-50 text-sm font-semibold text-rose-700 disabled:opacity-60"
              onClick={() => void remove()}
            >
              철회
            </button>
          </div>
        </>
      )}
    </li>
  )
}
