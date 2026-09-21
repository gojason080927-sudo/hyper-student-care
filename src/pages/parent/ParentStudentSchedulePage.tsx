import { useMemo } from 'react'
import { ClassScheduleGridList } from '../../components/classSchedule/ClassScheduleGridDisplay'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useData } from '../../hooks/useData'
import { filterScheduleGridsForStudent, sortScheduleGrids } from '../../utils/classScheduleAccess'

export function ParentStudentSchedulePage() {
  const student = useParentStudent()
  const { classScheduleGrids } = useData()
  const grids = useMemo(
    () => sortScheduleGrids(filterScheduleGridsForStudent(classScheduleGrids, student)),
    [classScheduleGrids, student],
  )

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="시간표" description="내 수업 시간표를 확인합니다." />
      {grids.length === 0 ? (
        <ParentEmptyState message="등록된 수업 시간표가 없습니다." />
      ) : (
        <ClassScheduleGridList grids={grids} />
      )}
    </div>
  )
}
