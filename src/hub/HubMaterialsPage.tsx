import { useRef, useState } from 'react'
import { ConnectedAdmissionStrategyViewer } from '../components/admissionStrategy/ConnectedAdmissionStrategyViewer'
import { HUB_LEARNING_MATERIALS_BUCKET } from './types'
import { downloadHubObjectBlob } from './hubStorageClient'
import { loadHubMaterialPreview } from './hubMaterialPreview'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { useHubContentRefresh } from './useHubContentRefresh'
import type { HubMaterial } from './types'

function canPreview(kind: HubMaterial['kind']): boolean {
  return kind === 'pdf' || kind === 'image'
}

export function HubMaterialsPage() {
  const { accessKey, materials, reload } = useHub()
  useHubContentRefresh(reload)
  const [preview, setPreview] = useState<HubMaterial | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const previewUrlsRef = useRef<string[]>([])

  const revokePreviewUrls = () => {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url)
    previewUrlsRef.current = []
  }

  const objectUrlFromBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    previewUrlsRef.current.push(url)
    return url
  }

  const readFile = async (path: string) =>
    downloadHubObjectBlob({
      accessKey,
      bucket: HUB_LEARNING_MATERIALS_BUCKET,
      path,
    })

  const resolvePageUrl = async (assetPath: string) => {
    if (assetPath.startsWith('blob:')) return assetPath
    const blob = await readFile(assetPath)
    return objectUrlFromBlob(blob)
  }

  const downloadSource = async (material: HubMaterial) => {
    if (!material.sourceFilePath) return
    const blob = await readFile(material.sourceFilePath)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = material.originalFileName || 'download'
    link.rel = 'noopener'
    link.click()
    URL.revokeObjectURL(url)
  }

  const openPreview = async (material: HubMaterial) => {
    setError('')
    setBusy(true)
    setPreview(null)
    revokePreviewUrls()
    try {
      const result = await loadHubMaterialPreview(material, {
        readFile,
        renderPdf: async (file) => {
          const { renderPdfFileToPages } = await import('../lib/admissionStrategy/pdfToPageImages')
          return renderPdfFileToPages(file)
        },
        objectUrl: objectUrlFromBlob,
      })
      if (!result.ok) {
        revokePreviewUrls()
        setError(result.error || '미리보기를 불러오지 못했습니다.')
        return
      }
      setPreview({ ...material, pages: result.pages })
    } catch (err) {
      revokePreviewUrls()
      setError(err instanceof Error ? err.message : '미리보기를 불러오지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="문제 자료실" />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {busy ? <p className="mb-3 text-sm text-slate-500">미리보기를 불러오는 중…</p> : null}
      {materials.length === 0 ? (
        <HubEmpty message="아직 공개된 문제 자료가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li key={material.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => void openPreview(material)}
              >
                <p className="font-bold text-[#163A70]">{material.title}</p>
                {material.description ? (
                  <p className="mt-1 text-sm text-slate-600">{material.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">{material.kind.toUpperCase()}</p>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                {canPreview(material.kind) ? (
                  <button
                    type="button"
                    className="rounded-full bg-[#163A70] px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => void openPreview(material)}
                  >
                    미리보기
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  onClick={() => {
                    void downloadSource(material).catch((err) => {
                      setError(err instanceof Error ? err.message : '다운로드에 실패했습니다.')
                    })
                  }}
                >
                  다운로드
                </button>
                {canPreview(material.kind) ? (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() => void openPreview(material)}
                  >
                    출력
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConnectedAdmissionStrategyViewer
        open={Boolean(preview)}
        title={preview?.title ?? ''}
        pages={preview?.pages ?? []}
        onClose={() => {
          setPreview(null)
          revokePreviewUrls()
        }}
        resolvePageUrl={resolvePageUrl}
      />
    </div>
  )
}
