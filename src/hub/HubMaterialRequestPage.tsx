import { useState, type FormEvent } from 'react'
import { HUB_IMAGE_MAX_BYTES, HUB_MAX_ATTACHMENTS } from './types'
import { classifyHubUpload } from './hubFilePolicy'
import {
  rpcFinalizeInboxAttachment,
  rpcPrepareInboxAttachment,
  rpcSubmitHubInbox,
} from './hubRpc'
import { questionAttachmentBucket, uploadHubObject } from './hubStorageClient'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { HubInboxItemCard } from './HubInboxItemCard'

export function HubMaterialRequestPage() {
  const { accessKey, inbox, reload } = useHub()
  const items = inbox.filter((item) => item.kind === 'material_request')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('요청 내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      const created = await rpcSubmitHubInbox({
        accessKey,
        kind: 'material_request',
        title: '자료 요청',
        content,
      })
      if (!created) throw new Error('저장에 실패했습니다.')
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
      setContent('')
      setFiles([])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="자료 요청실" />
      <form onSubmit={(event) => void submit(event)} className="mb-5 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="예: 이차함수 최고난도 문제 더 주세요."
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
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
        {files.length > 0 ? (
          <p className="text-[11px] text-slate-500">{files.map((file) => file.name).join(', ')}</p>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#163A70] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? '저장 중…' : '요청 보내기'}
        </button>
      </form>
      {items.length === 0 ? (
        <HubEmpty message="보낸 자료 요청이 없습니다." />
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
