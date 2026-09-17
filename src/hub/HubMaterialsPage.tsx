import { useState } from 'react'
import { HUB_LEARNING_MATERIALS_BUCKET } from './types'
import { downloadHubObjectBlob, downloadHubObjectUrl } from './hubStorageClient'
import {
  canOpenHubMaterial,
  createBrowserHubMaterialFileIo,
  downloadHubMaterialFile,
  openHubMaterialInSystemViewer,
} from './hubMaterialFileAccess'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import { useHubContentRefresh } from './useHubContentRefresh'
import type { HubMaterial } from './types'

export function HubMaterialsPage() {
  const { accessKey, materials, reload } = useHub()
  useHubContentRefresh(reload)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'open' | 'download' | null>(null)

  const fileIo = {
    ...createBrowserHubMaterialFileIo(),
    signUrl: (path: string) =>
      downloadHubObjectUrl({
        accessKey,
        bucket: HUB_LEARNING_MATERIALS_BUCKET,
        path,
      }),
    readFile: (path: string) =>
      downloadHubObjectBlob({
        accessKey,
        bucket: HUB_LEARNING_MATERIALS_BUCKET,
        path,
      }),
    assignLocation: (url: string) => {
      window.location.assign(url)
    },
  }

  const openMaterial = async (material: HubMaterial) => {
    setError('')
    setBusy('open')
    try {
      await openHubMaterialInSystemViewer(material, fileIo)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 열지 못했습니다.')
    } finally {
      setBusy(null)
    }
  }

  const downloadMaterial = async (material: HubMaterial) => {
    setError('')
    setBusy('download')
    try {
      await downloadHubMaterialFile(material, fileIo)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드에 실패했습니다.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="문제 자료실" />
      <p className="mb-3 text-xs leading-5 text-slate-500">
        열기 후 인쇄할 수 있습니다. 기기에 따라 다운로드가 공유 화면으로 열릴 수 있습니다.
      </p>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {busy === 'open' ? <p className="mb-3 text-sm text-slate-500">파일을 여는 중…</p> : null}
      {busy === 'download' ? <p className="mb-3 text-sm text-slate-500">다운로드 준비 중…</p> : null}
      {materials.length === 0 ? (
        <HubEmpty message="아직 공개된 문제 자료가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => {
            const openable = canOpenHubMaterial(material.kind) && Boolean(material.sourceFilePath)
            const downloadable = Boolean(material.sourceFilePath)
            return (
              <li key={material.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-bold text-[#163A70]">{material.title}</p>
                {material.description ? (
                  <p className="mt-1 text-sm text-slate-600">{material.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-400">{material.kind.toUpperCase()}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {openable ? (
                    <button
                      type="button"
                      className="rounded-full bg-[#163A70] px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => void openMaterial(material)}
                    >
                      열기
                    </button>
                  ) : null}
                  {downloadable ? (
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                      onClick={() => void downloadMaterial(material)}
                    >
                      다운로드
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
