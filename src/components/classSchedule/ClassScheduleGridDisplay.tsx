import type { ClassScheduleGrid } from '../../types/records'
import { SCHEDULE_TEMPLATES } from '../../utils/scheduleGrid'
import { ScheduleGridTable } from './ScheduleGridTable'
import '../../styles/scheduleGrid.css'

type ClassScheduleGridDisplayProps = {
  grid: ClassScheduleGrid
}

export function ClassScheduleGridDisplay({ grid }: ClassScheduleGridDisplayProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm pm-card">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">내 수업 시간표</p>
        <h3 className="mt-1 text-lg font-bold text-navy-900">{grid.className}</h3>
        <p className="text-xs text-slate-500">{SCHEDULE_TEMPLATES[grid.templateType].label}</p>
      </div>
      <ScheduleGridTable
        templateType={grid.templateType}
        timeLabels={grid.timeLabels}
        cells={grid.cells}
        readOnly
      />
    </div>
  )
}

type ClassScheduleGridListProps = {
  grids: ClassScheduleGrid[]
}

export function ClassScheduleGridList({ grids }: ClassScheduleGridListProps) {
  if (grids.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 pm-card">
        등록된 수업 시간표가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {grids.map((grid) => (
        <ClassScheduleGridDisplay key={grid.id} grid={grid} />
      ))}
    </div>
  )
}
