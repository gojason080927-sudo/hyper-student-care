import { useEffect, useState } from 'react'
import { fetchParentAdmissionStrategyMaterials } from '../lib/db/admissionStrategyMaterial'
import type { ParentAdmissionStrategyMaterial } from '../types/admissionStrategyMaterial'
import { useParentStudent } from '../contexts/ParentStudentContext'

export function useParentAdmissionStrategyMaterials() {
  const student = useParentStudent()
  const [materials, setMaterials] = useState<ParentAdmissionStrategyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchParentAdmissionStrategyMaterials(student.studentAccessKey)
      .then((next) => {
        if (cancelled) return
        setMaterials(next ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setMaterials([])
        setError('입시전략 자료를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student.studentAccessKey])

  return { materials, loading, error }
}
