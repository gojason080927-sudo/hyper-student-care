import type { ClassTodayReportCommon } from '../types/records'

export function isSameClassCommonKey(
  a: Pick<
    ClassTodayReportCommon,
    'grade' | 'className' | 'reportDate' | 'subject' | 'slotNumber'
  >,
  b: Pick<
    ClassTodayReportCommon,
    'grade' | 'className' | 'reportDate' | 'subject' | 'slotNumber'
  >,
): boolean {
  return (
    a.grade === b.grade &&
    a.className === b.className &&
    a.reportDate === b.reportDate &&
    a.subject === b.subject &&
    a.slotNumber === b.slotNumber
  )
}

export function mergeClassTodayReportCommonRecords(
  current: ClassTodayReportCommon[],
  incoming: ClassTodayReportCommon[],
): ClassTodayReportCommon[] {
  if (incoming.length === 0) return current
  let next = [...current]
  for (const record of incoming) {
    next = next.filter((item) => !isSameClassCommonKey(item, record))
    next.push(record)
  }
  return next
}
