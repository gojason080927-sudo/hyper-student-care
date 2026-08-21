import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import {
  deleteEntranceExamQuestion,
  fetchEntranceExamQuestions,
  upsertEntranceExamQuestion,
} from '../../../lib/db/entranceExamRepository'
import type { EntranceExamQuestion, EntranceExamQuestionInput } from '../types'

export function useEntranceExamQuestions() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [questions, setQuestions] = useState<EntranceExamQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const requireSession = useCallback(() => {
    if (session) return true
    navigate('/login', {
      replace: true,
      state: { from: `${location.pathname}${location.search}` },
    })
    return false
  }, [location.pathname, location.search, navigate, session])

  const reload = useCallback(async () => {
    if (!session) {
      setQuestions([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchEntranceExamQuestions()
      setQuestions(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : '문제은행을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveQuestion = useCallback(
    async (input: EntranceExamQuestionInput) => {
      if (!requireSession()) return false
      const result = await upsertEntranceExamQuestion(input)
      if (!result.success) {
        showToast(result.error || '저장에 실패했습니다.')
        return false
      }
      setQuestions((prev) => {
        const others = prev.filter((item) => item.id !== result.record.id)
        return [result.record, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      })
      showToast(input.id ? '문제를 수정했습니다.' : '문제를 등록했습니다.')
      return true
    },
    [requireSession, showToast],
  )

  const removeQuestion = useCallback(
    async (id: string) => {
      if (!requireSession()) return false
      const result = await deleteEntranceExamQuestion(id)
      if (!result.success) {
        showToast(result.error || '삭제에 실패했습니다.')
        return false
      }
      setQuestions((prev) => prev.filter((item) => item.id !== id))
      showToast('문제를 삭제했습니다.')
      return true
    },
    [requireSession, showToast],
  )

  return {
    questions,
    loading,
    error,
    toast,
    reload,
    saveQuestion,
    removeQuestion,
  }
}
