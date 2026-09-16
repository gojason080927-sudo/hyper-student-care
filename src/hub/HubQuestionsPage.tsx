import { useState, type FormEvent } from 'react'
import { getTodayString } from '../utils/date'
import {
  HUB_FILE_MAX_BYTES,
  HUB_IMAGE_MAX_BYTES,
  HUB_IMAGE_MIMES,
  HUB_MAX_ATTACHMENTS,
  HUB_VIDEO_MAX_BYTES,
  HUB_VIDEO_MAX_DURATION_MS,
  HUB_VIDEO_MIMES,
  STUDENT_QUESTION_CATEGORIES,
  type HubAttachmentKind,
} from './types'
import {
  rpcFinalizeQuestionAttachment,
  rpcPrepareQuestionAttachment,
  rpcSubmitStudentQuestion,
} from './hubRpc'
import {
  extensionFromName,
  questionAttachmentBucket,
  readVideoDurationMs,
  uploadHubObject,
  downloadHubObjectUrl,
} from './hubStorageClient'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

function classifyFile(file: File): HubAttachmentKind {
  const name = file.name.toLowerCase()
  const type = file.type
  if (HUB_IMAGE_MIMES.includes(type as (typeof HUB_IMAGE_MIMES)[number]) || type.startsWith('image/')) {
    return 'image'
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (
    HUB_VIDEO_MIMES.includes(type as (typeof HUB_VIDEO_MIMES)[number]) ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.webm')
  ) {
    return 'video'
  }
  return 'file'
}

function mimeForUpload(file: File, kind: HubAttachmentKind): string {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  if (kind === 'video') {
    if (name.endsWith('.mov')) return 'video/quicktime'
    if (name.endsWith('.webm')) return 'video/webm'
    return 'video/mp4'
  }
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'image') return 'image/jpeg'
  return 'application/octet-stream'
}

function mergeFiles(current: File[], next: File[]): File[] {
  const merged = [...current]
  for (const file of next) {
    if (!merged.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
      merged.push(file)
    }
  }
  return merged.slice(0, HUB_MAX_ATTACHMENTS)
}

export function HubQuestionsPage() {
  const { accessKey, questions, reload } = useHub()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<(typeof STUDENT_QUESTION_CATEGORIES)[number]>('수업질문')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    if (files.length > HUB_MAX_ATTACHMENTS) {
      setError('첨부는 최대 5개입니다.')
      return
    }
    const videos = files.filter((file) => classifyFile(file) === 'video')
    if (videos.length > 1) {
      setError('짧은 영상은 질문당 1개만 첨부할 수 있습니다.')
      return
    }
    setBusy(true)
    try {
      const created = await rpcSubmitStudentQuestion({
        accessKey,
        date: getTodayString(),
        category,
        title,
        content,
      })
      if (!created) throw new Error('질문 저장에 실패했습니다.')
      for (const file of files) {
        const kind = classifyFile(file)
        if (kind === 'image' && file.size > HUB_IMAGE_MAX_BYTES) throw new Error('이미지는 5MB 이하만 가능합니다.')
        if ((kind === 'pdf' || kind === 'file') && file.size > HUB_FILE_MAX_BYTES) {
          throw new Error('파일은 10MB 이하만 가능합니다.')
        }
        let durationMs: number | null = null
        if (kind === 'video') {
          if (file.size > HUB_VIDEO_MAX_BYTES) throw new Error('영상은 40MB 이하만 가능합니다.')
          durationMs = await readVideoDurationMs(file)
          if (durationMs > HUB_VIDEO_MAX_DURATION_MS) throw new Error('영상은 60초 이하만 가능합니다.')
        }
        const prepared = await rpcPrepareQuestionAttachment({
          accessKey,
          questionId: created.id,
          kind,
          mime: mimeForUpload(file, kind),
          byteSize: file.size,
          originalName: file.name,
          durationMs,
          ext: extensionFromName(file.name, kind === 'video' ? 'mp4' : 'bin'),
        })
        await uploadHubObject({
          accessKey,
          bucket: prepared.bucket || questionAttachmentBucket(),
          path: prepared.storagePath,
          file,
          contentType: file.type,
        })
        await rpcFinalizeQuestionAttachment(accessKey, prepared.id)
      }
      setTitle('')
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
      <HubPageHeader title="질문방" />
      <form onSubmit={(event) => void submit(event)} className="mb-5 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as (typeof STUDENT_QUESTION_CATEGORIES)[number])}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          {STUDENT_QUESTION_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="질문 내용"
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700">
            파일 선택
            <input
              type="file"
              multiple
              className="sr-only"
              accept="image/*,application/pdf,.hwp,.hwpx,.docx,.pptx,video/mp4,video/quicktime,video/webm,.mov"
              onChange={(event) => {
                setFiles((current) => mergeFiles(current, Array.from(event.target.files ?? [])))
                event.currentTarget.value = ''
              }}
            />
          </label>
          <label className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700">
            사진/영상 촬영
            <input
              type="file"
              className="sr-only"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              capture="environment"
              onChange={(event) => {
                setFiles((current) => mergeFiles(current, Array.from(event.target.files ?? [])))
                event.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        {files.length > 0 ? (
          <p className="text-[11px] text-slate-500">{files.map((file) => file.name).join(', ')}</p>
        ) : null}
        <p className="text-[11px] text-slate-500">
          이미지·PDF·파일·짧은 영상(60초/40MB, 1개). 다른 학생에게는 보이지 않습니다.
        </p>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#163A70] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? '저장 중…' : '질문 등록'}
        </button>
      </form>
      {questions.length === 0 ? (
        <HubEmpty message="아직 등록한 질문이 없습니다." />
      ) : (
        <ul className="space-y-3">
          {questions.map((item) => (
            <li key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-400">
                {item.category} · {item.status}
              </p>
              <p className="mt-1 font-bold text-[#163A70]">{item.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.content}</p>
              <AttachmentList accessKey={accessKey} attachments={item.attachments} />
              {item.answer.trim() ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="text-xs font-bold text-[#28c7b7]">강사 답변</p>
                  <p className="mt-1 whitespace-pre-wrap">{item.answer}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AttachmentList({
  accessKey,
  attachments,
}: {
  accessKey: string
  attachments: { id: string; kind: string; storagePath: string; originalName: string; mime: string; ready: boolean }[]
}) {
  if (attachments.length === 0) return null
  return (
    <ul className="mt-2 space-y-2">
      {attachments.map((item) => (
        <li key={item.id}>
          {item.kind === 'video' && item.ready ? (
            <video
              controls
              playsInline
              className="w-full rounded-xl bg-black"
              src=""
              onPlay={async (event) => {
                const video = event.currentTarget
                if (video.src) return
                try {
                  video.src = await downloadHubObjectUrl({
                    accessKey,
                    bucket: questionAttachmentBucket(),
                    path: item.storagePath,
                  })
                  void video.play()
                } catch {
                  /* download fallback below */
                }
              }}
            />
          ) : null}
          <button
            type="button"
            className="text-xs font-semibold text-[#163A70] underline"
            onClick={async () => {
              const url = await downloadHubObjectUrl({
                accessKey,
                bucket: questionAttachmentBucket(),
                path: item.storagePath,
              })
              window.open(url, '_blank', 'noopener')
            }}
          >
            {item.originalName || '첨부 다운로드'}
          </button>
        </li>
      ))}
    </ul>
  )
}
