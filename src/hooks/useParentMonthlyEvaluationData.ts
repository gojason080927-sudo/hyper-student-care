import { useMemo } from 'react'
import type { MonthlyEvaluationRecord } from '../types/records'
import type { Student } from '../types/student'
import { useData } from './useData'
import {
  normalizeMonthlyEvaluationRecord,
  sortMonthlyEvaluationsDesc,
} from '../utils/monthlyEvaluation'

export type ParentMonthlyEvaluationData = {
  student: Student | undefined
  studentRecords: MonthlyEvaluationRecord[]
  latest: MonthlyEvaluationRecord | null
}

/** 학부모·학생용 읽기 전용 데이터 훅 (저장·삭제 함수 미포함) */
export function useParentMonthlyEvaluationData(
  studentId: string,
): ParentMonthlyEvaluationData {
  const { getStudentById, monthlyEvaluations } = useData()
  const student = getStudentById(studentId)

  const studentRecords = useMemo((): MonthlyEvaluationRecord[] => {
    if (!studentId) return []
    return sortMonthlyEvaluationsDesc(
      monthlyEvaluations
        .filter((record) => record.studentId === studentId)
        .map(normalizeMonthlyEvaluationRecord),
    )
  }, [monthlyEvaluations, studentId])

  return {
    student,
    studentRecords,
    latest: studentRecords[0] ?? null,
  }
}
