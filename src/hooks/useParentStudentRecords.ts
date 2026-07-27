import { useMemo } from 'react'
import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
} from '../types/records'
import type { Student } from '../types/student'
import { useParentStudent } from '../contexts/ParentStudentContext'
import { useData } from './useData'
import { sortByDateDesc } from '../utils/filters'
import { sortMakeupPlans } from '../utils/makeupPlan'
import {
  normalizeMonthlyEvaluationRecord,
  sortMonthlyEvaluationsDesc,
} from '../utils/monthlyEvaluation'

export type ParentStudentRecords = {
  student: Student
  attendance: AttendanceRecord[]
  progressRecords: ProgressRecord[]
  homework: HomeworkRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  makeupPlans: MakeupPlanRecord[]
  questions: QuestionRecord[]
}

/** 학부모·학생용 — currentStudent.id로만 필터링된 기록 (다른 학생 데이터 미포함) */
export function useParentStudentRecords(): ParentStudentRecords {
  const student = useParentStudent()
  const {
    attendance,
    progressRecords,
    homework,
    dailyTests,
    monthlyEvaluations,
    makeupPlans,
    questions,
  } = useData()

  return useMemo(() => {
    const studentId = student.id
    return {
      student,
      attendance: sortByDateDesc(attendance.filter((record) => record.studentId === studentId)),
      progressRecords: progressRecords.filter((record) => record.studentId === studentId),
      homework: sortByDateDesc(homework.filter((record) => record.studentId === studentId)),
      dailyTests: sortByDateDesc(dailyTests.filter((record) => record.studentId === studentId)),
      monthlyEvaluations: sortMonthlyEvaluationsDesc(
        monthlyEvaluations
          .filter((record) => record.studentId === studentId)
          .map(normalizeMonthlyEvaluationRecord),
      ),
      makeupPlans: sortMakeupPlans(makeupPlans.filter((record) => record.studentId === studentId)),
      questions: sortByDateDesc(questions.filter((record) => record.studentId === studentId)),
    }
  }, [
    attendance,
    dailyTests,
    homework,
    makeupPlans,
    monthlyEvaluations,
    progressRecords,
    questions,
    student,
  ])
}
