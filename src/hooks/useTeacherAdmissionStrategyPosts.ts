import { useCallback, useEffect, useState } from 'react'
import {
  deleteAdmissionStrategyPost,
  fetchAdmissionStrategyPosts,
  upsertAdmissionStrategyPost,
} from '../lib/db/admissionStrategy'
import type { AdmissionStrategyPost } from '../types/admissionStrategy'
import { useData } from './useData'

export function useTeacherAdmissionStrategyPosts() {
  const { showToast } = useData()
  const [posts, setPosts] = useState<AdmissionStrategyPost[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await fetchAdmissionStrategyPosts()
    setPosts(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchAdmissionStrategyPosts()
      .then((next) => {
        if (!cancelled) setPosts(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '입시전략 목록을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showToast])

  const savePost = useCallback(
    async (record: AdmissionStrategyPost) => {
      await upsertAdmissionStrategyPost(record)
      await reload()
      showToast('입시전략이 저장되었습니다.')
    },
    [reload, showToast],
  )

  const removePost = useCallback(
    async (id: string) => {
      await deleteAdmissionStrategyPost(id)
      await reload()
      showToast('입시전략이 삭제되었습니다.')
    },
    [reload, showToast],
  )

  return { posts, loading, savePost, removePost }
}
