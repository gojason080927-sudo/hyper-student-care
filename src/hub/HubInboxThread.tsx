import { useState, type FormEvent } from 'react'
import { HUB_IMAGE_MAX_BYTES, HUB_MAX_ATTACHMENTS, type HubInboxItem } from './types'
import { classifyHubUpload } from './hubFilePolicy'
import {
  rpcDeleteHubInbox,
  rpcFinalizeInboxAttachment,
  rpcPrepareInboxAttachment,
  rpcSubmitHubInbox,
  rpcUpdateHubInbox,
} from './hubRpc'
import {
  downloadHubObjectUrl,
  questionAttachmentBucket,
  uploadHubObject,
} from './hubStorageClient'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

export function HubInboxThread({
  kind,
  title,
  placeholder,
  submitLabel,
  emptyMessage,
  namedNotice,
  allowImages = false,
}: {
  kind: 'material_request' | 'suggestion'
  title: string
  placeholder: string
  submitLabel: string
  emptyMessage: string
  namedNotice?: string
  allowImages?: boolean
}) {
  const { accessKey, inbox, student, reload } = useHub()
  const items = inbox.filter((item) => item.kind === kind)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      const created = await rpcSubmitHubInbox({
        accessKey,
        kind,
        title: kind === 'suggestion' ? '건의' : '자료 요청',
        content,
      })
      if (!created) throw new Error('저장에 실패했습니다.')
      if (allowImages) {
        for (const file of files.slice(0, HUB_MAX_ATTACHMENTS)) {
          const decision = classifyHubUpload(file)
          if (!decision.ok) throw new Error(decision.error)
          if (decision.kind !== 'image') throw new Error('이미지만 첨부할 수 있습니다.')
          if (file.size > HUB_IMAGE_MAX_BYTES) throw new Error('이미지는 5MB 이하만 가능합니다.')
          const prepared = await rpcPrepareInboxAttachment({
            accessKey,
            inboxId: created.id,
            mime: decision.mime,
            byteSize: file.size,
            originalName: file.name,
            ext: decision.ext,
          })
          await uploadHubObject({
            accessKey,
            bucket: prepared.bucket || questionAttachmentBucket(),
            path: prepared.storagePath,
            file,
            contentType: decision.mime,
          })
          await rpcFinalizeInboxAttachment(accessKey, prepared.id)
        }
      }
      setContent('')
      setFiles([])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (item: HubInboxItem) => {
    if (!editContent.trim()) {
      setError('내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await rpcUpdateHubInbox(accessKey, item.id, editContent)
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async (item: HubInboxItem) => {
    if (!window.confirm('이 글을 철회할까요?')) return
    setBusy(true)
    setError('')
    try {
      await rpcDeleteHubInbox(accessKey, item.id)
      if (editingId === item.id) setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '철회에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title={title} />
      {namedNotice ? <p className="mb-3 text-xs leading-5 text-slate-500">{namedNotice}</p> : null}
      {namedNotice ? null : student.name && kind === 'suggestion' ? (
        <p className="mb-3 text-xs text-slate-500">
          기명 접수입니다. 작성자 {student.name} 학생이 학원에 전달됩니다. 다른 학생은 볼 수 없습니다.
        </p>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className="mb-5 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder}
          rows={kind === 'suggestion' ? 5 : 4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        {allowImages ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700">
              사진 선택
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []).slice(0, HUB_MAX_ATTACHMENTS))
                  event.currentTarget.value = ''
                }}
              />
            </label>
            <label className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700">
              사진 촬영
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []).slice(0, HUB_MAX_ATTACHMENTS))
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        ) : null}
        {files.length > 0 ? (
          <p className="text-[11px] text-slate-500">{files.map((file) => file.name).join(', ')}</p>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#163A70] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? '저장 중…' : submitLabel}
        </button>
      </form>
      {items.length === 0 ? (
        <HubEmpty message={emptyMessage} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-400">{item.status}</p>
              {editingId === item.id ? (
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.content}</p>
              )}
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
                <div className="mt-3 rounded-xl bg-[#f6f3fb] p-3 text-sm text-slate-700">
                  <p className="text-xs font-bold text-[#5b348a]">강사 답변</p>
                  <p className="mt-1 whitespace-pre-wrap">{item.teacherReply}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {editingId === item.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-10 rounded-xl bg-[#163A70] px-3 text-xs font-bold text-white disabled:opacity-60"
                      onClick={() => void saveEdit(item)}
                    >
                      수정 저장
                    </button>
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600"
                      onClick={() => setEditingId(null)}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    onClick={() => {
                      setEditingId(item.id)
                      setEditContent(item.content)
                      setError('')
                    }}
                  >
                    수정
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-10 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  onClick={() => void withdraw(item)}
                >
                  철회
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
