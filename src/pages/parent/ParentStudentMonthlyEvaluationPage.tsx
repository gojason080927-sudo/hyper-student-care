import { ParentMonthlyEvaluationView } from '../../components/monthly/ParentMonthlyEvaluationView'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'

export function ParentStudentMonthlyEvaluationPage() {
  const { student, monthlyEvaluations } = useParentStudentRecords()

  return (
    <ParentMonthlyEvaluationView
      student={student}
      studentRecords={monthlyEvaluations}
      latest={monthlyEvaluations[0] ?? null}
    />
  )
}
