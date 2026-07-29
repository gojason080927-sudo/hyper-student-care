import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { StudentSelect } from '../components/ui/StudentSelect'
import { TodayReportView } from '../components/todayReport/TodayReportView'
import { useData } from '../hooks/useData'

export function TeacherTodayReportPage() {
  const { students, isLoading } = useData()
  const activeStudents = students.filter((student) => student.status === '재원')
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    if (activeStudents.length === 0) {
      setStudentId('')
      return
    }
    setStudentId((current) =>
      activeStudents.some((student) => student.id === current)
        ? current
        : activeStudents[0].id,
    )
  }, [activeStudents])

  const student = activeStudents.find((item) => item.id === studentId)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        학생 목록을 불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today Report"
        description="학생별 오늘의 출결, 진도, 과제, 테스트를 통합 관리합니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <StudentSelect
          students={activeStudents}
          value={studentId}
          onChange={setStudentId}
          required
        />
      </div>

      {student ? (
        <TodayReportView key={student.id} student={student} readOnly={false} dateMode="picker" />
      ) : (
        <p className="text-sm text-slate-500">표시할 재원 학생이 없습니다.</p>
      )}
    </div>
  )
}
