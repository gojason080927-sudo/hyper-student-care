import { useState } from 'react'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { useHubContentRefresh } from './useHubContentRefresh'
import { youtubeEmbedUrl } from './youtube'

export function HubVideosPage() {
  const { videos, reload } = useHub()
  useHubContentRefresh(reload)
  const [starts, setStarts] = useState<Record<string, number>>({})

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="영상 자료실" />
      <p className="mb-3 text-xs text-slate-500">
        YouTube 일부공개(unlisted) 링크입니다. 링크를 아는 사람은 볼 수 있습니다.
      </p>
      {videos.length === 0 ? (
        <HubEmpty message="게시된 영상이 없습니다." />
      ) : (
        <ul className="space-y-4">
          {videos.map((video) => (
            <li key={video.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="aspect-video bg-black">
                <iframe
                  title={video.title}
                  src={youtubeEmbedUrl(video.videoId, starts[video.id] ?? 0)}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <p className="font-bold text-[#163A70]">{video.title}</p>
                {video.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{video.description}</p>
                ) : null}
                {video.timestamps.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {video.timestamps.map((stamp) => (
                      <button
                        key={`${stamp.seconds}-${stamp.label}`}
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                        onClick={() => setStarts((current) => ({ ...current, [video.id]: stamp.seconds }))}
                      >
                        {stamp.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
