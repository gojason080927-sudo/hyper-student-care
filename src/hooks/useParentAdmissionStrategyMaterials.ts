import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchParentAdmissionStrategyMaterials } from '../lib/db/admissionStrategyMaterial'
import type { ParentAdmissionStrategyMaterial } from '../types/admissionStrategyMaterial'
import { useParentStudent } from '../contexts/ParentStudentContext'
import { useParentResumeReload } from './useParentResumeReload'

export function useParentAdmissionStrategyMaterials() {
  const student = useParentStudent()
  const [materials, setMaterials] = useState<ParentAdmissionStrategyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const accessKey = student.studentAccessKey
  const requestIdRef = useRef(0)

  const load = useCallback(
    (isInitial: boolean) => {
      const requestId = ++requestIdRef.current
      void fetchParentAdmissionStrategyMaterials(accessKey)
        .then((next) => {
          if (requestId !== requestIdRef.current) return
          setMaterials(next ?? [])
          setError(null)
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return
          if (isInitial) {
            setMaterials([])
            setError('입시전략 자료를 불러오지 못했습니다.')
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false)
        })
    },
    [accessKey],
  )

  useEffect(() => {
    setLoading(true)
    load(true)
  }, [load])

  useParentResumeReload(() => load(false))

  return { materials, loading, error }
}
