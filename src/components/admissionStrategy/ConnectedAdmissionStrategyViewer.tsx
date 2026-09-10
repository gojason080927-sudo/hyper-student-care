import { useCallback, useMemo, useRef, useState } from 'react'
import { AdmissionStrategyMaterialViewer, type AdmissionStrategyViewerPage } from './AdmissionStrategyMaterialViewer'
import { createMaterialPageSignedUrl } from '../../lib/admissionStrategy/materialStorage'
import type { ParentAdmissionStrategyMaterialPage } from '../../types/admissionStrategyMaterial'

type PageSource = Pick<ParentAdmissionStrategyMaterialPage, 'pageNumber' | 'assetPath' | 'width' | 'height'>

type ConnectedAdmissionStrategyViewerProps = {
  open: boolean
  title: string
  pages: PageSource[]
  errorMessage?: string | null
  onClose: () => void
}

export function ConnectedAdmissionStrategyViewer({
  open,
  title,
  pages,
  errorMessage,
  onClose,
}: ConnectedAdmissionStrategyViewerProps) {
  const cacheRef = useRef(new Map<string, string>())
  const [resolved, setResolved] = useState<Record<number, { src: string | null; loading: boolean; error: boolean }>>(
    {},
  )

  const loadPages = useCallback(async (pageNumbers: number[]) => {
    await Promise.all(
      pageNumbers.map(async (pageNumber) => {
        const page = pages.find((item) => item.pageNumber === pageNumber)
        if (!page) return
        if (cacheRef.current.has(page.assetPath)) {
          const src = cacheRef.current.get(page.assetPath) ?? null
          setResolved((current) => ({ ...current, [pageNumber]: { src, loading: false, error: !src } }))
          return
        }
        setResolved((current) => ({
          ...current,
          [pageNumber]: current[pageNumber] ?? { src: null, loading: true, error: false },
        }))
        try {
          const src = await createMaterialPageSignedUrl(page.assetPath)
          cacheRef.current.set(page.assetPath, src)
          setResolved((current) => ({ ...current, [pageNumber]: { src, loading: false, error: false } }))
        } catch {
          setResolved((current) => ({ ...current, [pageNumber]: { src: null, loading: false, error: true } }))
        }
      }),
    )
  }, [pages])

  const viewerPages: AdmissionStrategyViewerPage[] = useMemo(
    () =>
      pages.map((page) => {
        const state = resolved[page.pageNumber]
        return {
          pageNumber: page.pageNumber,
          src: state?.src ?? null,
          width: page.width,
          height: page.height,
          loading: state?.loading ?? true,
          error: state?.error ?? false,
        }
      }),
    [pages, resolved],
  )

  if (!open) return null

  return (
    <AdmissionStrategyMaterialViewer
      open={open}
      title={title}
      pages={viewerPages}
      errorMessage={errorMessage}
      onClose={onClose}
      onNeedPages={(pageNumbers) => {
        void loadPages(pageNumbers)
      }}
    />
  )
}
