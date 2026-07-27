import type { MakeupPlanRecord } from '../types/records'

export function sortMakeupPlans(records: MakeupPlanRecord[]): MakeupPlanRecord[] {
  return [...records].sort((a, b) => {
    const dateCmp = b.scheduledDate.localeCompare(a.scheduledDate)
    if (dateCmp !== 0) return dateCmp
    return b.scheduledTime.localeCompare(a.scheduledTime)
  })
}
