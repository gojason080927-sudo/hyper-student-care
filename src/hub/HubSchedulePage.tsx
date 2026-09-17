import { ClassScheduleGridList } from '../components/classSchedule/ClassScheduleGridDisplay'
import { HubEmpty, HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'

export function HubSchedulePage() {
  const { classScheduleGrids } = useHub()
  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <HubPageHeader title="시간표 안내" />
      {classScheduleGrids.length === 0 ? (
        <HubEmpty message="등록된 수업 시간표가 없습니다." />
      ) : (
        <ClassScheduleGridList grids={classScheduleGrids} />
      )}
    </div>
  )
}
