import { useEffect, useState } from 'react'
import { fetchParentAdmissionStrategyPosts } from '../lib/db/admissionStrategy'
import type { ParentAdmissionStrategyPost } from '../types/admissionStrategy'
import { useParentStudent } from '../contexts/ParentStudentContext'

export function useParentAdmissionStrategyPosts() {
  const student = useParentStudent()
  const [posts, setPosts] = useState<ParentAdmissionStrategyPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchParentAdmissionStrategyPosts(student.studentAccessKey)
      .then((next) => {
        if (cancelled) return
        setPosts(next ?? [])
      })
      .catch(() => {
        if (!cancelled) setPosts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student.studentAccessKey])

  return { posts, loading }
}
