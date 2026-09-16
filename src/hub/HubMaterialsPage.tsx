import { useState } from 'react'
import { ConnectedAdmissionStrategyViewer } from '../components/admissionStrategy/ConnectedAdmissionStrategyViewer'
import { getSupabase } from '../lib/supabase'
import { HUB_LEARNING_MATERIALS_BUCKET } from './types'
import { downloadHubObjectUrl } from './hubStorageClient'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import type { HubMaterial } from './types'

function canPreview(kind: HubMaterial['kind']): boolean {
  return kind === 'pdf' || kind === 'image'
}

export function HubMaterialsPage() {
  const { accessKey, materials } = useHub()
  const [preview, setPreview] = useState<HubMaterial | null>(null)
  const [error, setError] = useState('')

  const resolvePageUrl = async (assetPath: string) => {
    const { data, error: signError } = await getSupabase()
      .storage.from(HUB_LEARNING_MATERIALS_BUCKET)
      .createSignedUrl(assetPath, 60 * 30)
    if (signError || !data?.signedUrl) {
      return downloadHubObjectUrl({
        accessKey,
        bucket: HUB_LEARNING_MATERIALS_BUCKET,
        path: assetPath,
      })
    }
    return data.signedUrl
  }

  const downloadSource = async (material: HubMaterial) => {
    if (!material.sourceFilePath) return
    try {
      const url = await downloadHubObjectUrl({
        accessKey,
        bucket: HUB_LEARNING_MATERIALS_BUCKET,
        path: material.sourceFilePath,
      })
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드에 실패했습니다.')
    }
  }

  const printMaterial = async (material: HubMaterial) => {
    if (material.pages.length === 0) {
      await downloadSource(material)
      return
    }
    setPreview(material)
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="문제 자료실" />
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {materials.length === 0 ? (
        <HubEmpty message="아직 공개된 문제 자료가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li key={material.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-bold text-[#163A70]">{material.title}</p>
              {material.description ? (
                <p className="mt-1 text-sm text-slate-600">{material.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">{material.kind.toUpperCase()}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {canPreview(material.kind) && material.pages.length > 0 ? (
                  <button
                    type="button"
                    className="rounded-full bg-[#163A70] px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => setPreview(material)}
                  >
                    미리보기
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  onClick={() => void downloadSource(material)}
                >
                  다운로드
                </button>
                {canPreview(material.kind) ? (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    onClick={() => void printMaterial(material)}
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
        onClose={() => setPreview(null)}
        resolvePageUrl={resolvePageUrl}
      />
    </div>
  )
}
