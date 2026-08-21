import { ParentMonthlyEvaluationView } from '../../components/monthly/ParentMonthlyEvaluationView'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { useMarkParentCategoryReadOnView } from '../../hooks/useMarkParentCategoryReadOnView'

export function ParentStudentMonthlyEvaluationPage() {
  const { student, monthlyEvaluations } = useParentStudentRecords()
  useMarkParentCategoryReadOnView('monthly-evaluation')

  return (
    <ParentMonthlyEvaluationView
      student={student}
      studentRecords={monthlyEvaluations}
      latest={monthlyEvaluations[0] ?? null}
    />
  )
}
