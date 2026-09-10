import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteAdmissionStrategyMaterial,
  fetchAdmissionStrategyMaterials,
  needsPageConversion,
  updateAdmissionStrategyMaterialOrders,
  updateAdmissionStrategyMaterialStatus,
  upsertAdmissionStrategyMaterial,
} from '../lib/db/admissionStrategyMaterial'
import type { AdmissionStrategyMaterial, AdmissionStrategyMaterialStatus } from '../types/admissionStrategyMaterial'
import { canPublishMaterial, swappedDisplayOrders } from '../lib/db/admissionStrategyMaterialModel'
import { reprocessAdmissionStrategyMaterialFromSource } from '../lib/admissionStrategy/materialUploadFlow'
import { teacherFacingError } from '../lib/admissionStrategy/storagePaths'
import { useData } from './useData'

export function useTeacherAdmissionStrategyMaterials() {
  const { showToast } = useData()
  const [materials, setMaterials] = useState<AdmissionStrategyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const attemptedReprocessRef = useRef(new Set<string>())

  const reload = useCallback(async () => {
    const next = await fetchAdmissionStrategyMaterials()
    setMaterials(next)
    return next
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchAdmissionStrategyMaterials()
      .then((next) => {
        if (!cancelled) setMaterials(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          showToast(teacherFacingError(error, '입시전략 자료 목록을 불러오지 못했습니다.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showToast])

  const reprocessMaterial = useCallback(
    async (material: AdmissionStrategyMaterial, quiet = false) => {
      setConvertingId(material.id)
      try {
        const next = await reprocessAdmissionStrategyMaterialFromSource({ material })
        await reload()
        if (!quiet) showToast(`페이지 변환이 끝났습니다. ${next.pageCount ?? 0}쪽`)
        return next
      } catch (error: unknown) {
        await reload()
        if (!quiet) showToast(teacherFacingError(error, '페이지 변환에 실패했습니다.'))
        throw error
      } finally {
        setConvertingId(null)
      }
    },
    [reload, showToast],
  )

  useEffect(() => {
    if (loading) return
    const stuck = materials.filter(
      (item) => needsPageConversion(item) && !attemptedReprocessRef.current.has(item.id),
    )
    if (stuck.length === 0) return
    let cancelled = false
    void (async () => {
      for (const material of stuck) {
        if (cancelled) return
        attemptedReprocessRef.current.add(material.id)
        try {
          await reprocessMaterial(material, true)
        } catch {
          // 카드에 conversion_error를 남기고 다음 자료로 진행한다.
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loading, materials, reprocessMaterial])

  const saveMaterial = useCallback(
    async (record: AdmissionStrategyMaterial, toastMessage = '입시전략 자료가 저장되었습니다.') => {
      await upsertAdmissionStrategyMaterial(record)
      await reload()
      showToast(toastMessage)
    },
    [reload, showToast],
  )

  const setStatus = useCallback(
    async (material: AdmissionStrategyMaterial, status: AdmissionStrategyMaterialStatus) => {
      if (status === 'PUBLISHED' && !canPublishMaterial(material)) {
        throw new Error('페이지 변환이 끝난 자료만 게시할 수 있습니다. PDF를 업로드해 주세요.')
      }
      const publishedAt =
        status === 'PUBLISHED' ? (material.publishedAt ?? new Date().toISOString()) : material.publishedAt
      await updateAdmissionStrategyMaterialStatus(material.id, status, publishedAt)
      await reload()
      showToast(status === 'PUBLISHED' ? '학부모 앱에 게시되었습니다.' : status === 'HIDDEN' ? '학부모 앱에서 숨겼습니다.' : '초안으로 변경했습니다.')
    },
    [reload, showToast],
  )

  const moveMaterial = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const updates = swappedDisplayOrders(materials, id, direction)
      if (!updates) return
      await updateAdmissionStrategyMaterialOrders(updates)
      await reload()
    },
    [materials, reload],
  )

  const removeMaterial = useCallback(
    async (id: string) => {
      await deleteAdmissionStrategyMaterial(id)
      await reload()
      showToast('입시전략 자료가 삭제되었습니다.')
    },
    [reload, showToast],
  )

  return {
    materials,
    loading,
    convertingId,
    reload,
    saveMaterial,
    setStatus,
    moveMaterial,
    removeMaterial,
    reprocessMaterial,
  }
}
