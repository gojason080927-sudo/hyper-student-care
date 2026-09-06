import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useParentStudent } from '../../../contexts/ParentStudentContext'
import {
  fetchParentCareerResult,
  type CareerResultRecord,
} from '../api/careerAssessmentApi'
import { CareerResultReport } from '../components/CareerResultReport'

export function ParentCareerResultPage() {
  const { resultId = '' } = useParams()
  const student = useParentStudent()
  const [record, setRecord] = useState<CareerResultRecord | null>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    void fetchParentCareerResult(student.studentAccessKey, resultId)
      .then((data) => {
        if (!data) {
          setBlocked(true)
          return
        }
        setRecord(data.result)
      })
      .catch(() => setBlocked(true))
  }, [resultId, student.studentAccessKey])

  if (blocked) {
    return (
      <div className="parent-page rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-slate-700">이 검사 결과를 볼 수 없습니다.</p>
        <Link to={`/care/${student.studentAccessKey}/notices-makeup`} className="mt-4 inline-block text-sm text-navy-700">
          ← 공지사항으로
        </Link>
      </div>
    )
  }

  if (!record) {
    return <p className="parent-page text-sm text-slate-500">결과를 불러오는 중입니다.</p>
  }

  return (
    <div className="parent-page space-y-4 pb-8">
      <Link to={`/care/${student.studentAccessKey}/notices-makeup`} className="text-sm font-semibold text-navy-800">
        ← 공지사항
      </Link>
      <CareerResultReport
        student={{ name: student.name, school: student.school, grade: student.grade }}
        testedAt={record.createdAt}
        scores={record.scores}
      />
    </div>
  )
}
