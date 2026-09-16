import { useEffect, useMemo, useState } from 'react'
import type { HubQuestionAttachment } from '../../hub/types'
import { formatByteSize, videoNeedsDownloadFallback } from '../../hub/hubFilePolicy'
import { ImageLightbox } from './ImageLightbox'

type QuestionStorageAttachmentsProps = {
  attachments: HubQuestionAttachment[]
  resolveUrl: (path: string) => Promise<string>
  compact?: boolean
}

export function QuestionStorageAttachments({
  attachments,
  resolveUrl,
  compact = false,
}: QuestionStorageAttachmentsProps) {
  const ready = useMemo(
    () => attachments.filter((item) => item.ready !== false),
    [attachments],
  )
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [videoFallback, setVideoFallback] = useState<Record<string, boolean>>({})

  const paths = useMemo(() => ready.map((item) => item.storagePath).join('\n'), [ready])

  useEffect(() => {
    let cancelled = false
    const list = paths ? paths.split('\n').filter(Boolean) : []
    void Promise.all(
      list.map(async (path) => {
        try {
          const url = await resolveUrl(path)
          if (!cancelled) setUrls((prev) => (prev[path] === url ? prev : { ...prev, [path]: url }))
        } catch {
          if (!cancelled) setFailed((prev) => ({ ...prev, [path]: true }))
        }
      }),
    )
    return () => {
      cancelled = true
    }
  }, [paths, resolveUrl])

  if (ready.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">학생 Hub 첨부</p>
      <ul className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1'} gap-2`}>
        {ready.map((item) => {
          const url = urls[item.storagePath]
          const loadFailed = failed[item.storagePath]
          const ext = (item.originalName.split('.').pop() ?? '').toUpperCase()
          if (item.kind === 'image') {
            return (
              <li key={item.id} className="min-w-0">
                {url ? (
                  <button
                    type="button"
                    className="block overflow-hidden rounded-xl border border-slate-200"
                    onClick={() => setLightbox({ src: url, alt: item.originalName || '첨부 이미지' })}
                  >
                    <img
                      src={url}
                      alt={item.originalName || '첨부 이미지'}
                      className={`w-full object-cover ${compact ? 'h-24' : 'max-h-64'}`}
                    />
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">{loadFailed ? '이미지를 열 수 없습니다.' : '이미지 불러오는 중…'}</p>
                )}
              </li>
            )
          }
          if (item.kind === 'video') {
            const fallback =
              videoFallback[item.id] || videoNeedsDownloadFallback(item.mime, item.originalName)
            return (
              <li key={item.id} className="min-w-0 space-y-1">
                {url && !videoFallback[item.id] ? (
                  <video
                    controls
                    playsInline
                    className="w-full rounded-xl bg-black"
                    src={url}
                    onError={() => setVideoFallback((prev) => ({ ...prev, [item.id]: true }))}
                  />
                ) : null}
                {fallback && url ? (
                  <a
                    className="inline-flex text-xs font-semibold text-navy-700 underline"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.originalName || '영상'} 다운로드
                  </a>
                ) : null}
              </li>
            )
          }
          return (
            <li
              key={item.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{item.originalName || '첨부 파일'}</p>
                <p className="text-[11px] text-slate-500">
                  {item.kind === 'pdf' ? 'PDF' : ext || item.mime || 'FILE'} · {formatByteSize(item.byteSize)}
                </p>
              </div>
              {url ? (
                <a
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.kind === 'pdf' ? '열기' : '다운로드'}
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">{loadFailed ? '열 수 없음' : '준비 중'}</span>
              )}
            </li>
          )
        })}
      </ul>
      <ImageLightbox
        open={Boolean(lightbox)}
        src={lightbox?.src ?? ''}
        alt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}
