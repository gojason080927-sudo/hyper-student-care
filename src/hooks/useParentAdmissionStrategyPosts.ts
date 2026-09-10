import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchParentAdmissionStrategyPosts } from '../lib/db/admissionStrategy'
import type { ParentAdmissionStrategyPost } from '../types/admissionStrategy'
import { useParentStudent } from '../contexts/ParentStudentContext'
import { useParentResumeReload } from './useParentResumeReload'

export function useParentAdmissionStrategyPosts() {
  const student = useParentStudent()
  const [posts, setPosts] = useState<ParentAdmissionStrategyPost[]>([])
  const [loading, setLoading] = useState(true)
  const accessKey = student.studentAccessKey
  const requestIdRef = useRef(0)

  const load = useCallback(
    (isInitial: boolean) => {
      const requestId = ++requestIdRef.current
      if (isInitial) setLoading(true)
      void fetchParentAdmissionStrategyPosts(accessKey)
        .then((next) => {
          if (requestId !== requestIdRef.current) return
          setPosts(next ?? [])
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return
          if (isInitial) setPosts([])
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false)
        })
    },
    [accessKey],
  )

  useEffect(() => {
    load(true)
  }, [load])

  useParentResumeReload(() => load(false))

  return { posts, loading }
}
