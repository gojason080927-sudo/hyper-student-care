import type { ClassScheduleGrid, ScheduleTemplateType } from '../types/records'

export const SCHEDULE_TEMPLATE_ORDER: ScheduleTemplateType[] = [
  'mon-sun',
  'mon-wed-fri-sat',
  'tue-thu-sat',
]

export const SCHEDULE_TEMPLATES: Record<
  ScheduleTemplateType,
  { label: string; days: readonly string[] }
> = {
  'mon-sun': { label: '월화수목금토', days: ['월', '화', '수', '목', '금', '토'] },
  'mon-wed-fri-sat': { label: '월수금토', days: ['월', '수', '금', '토'] },
  'tue-thu-sat': { label: '화목토', days: ['화', '목', '토'] },
}

/** 신규 시간표 기본 행 수 */
export const DEFAULT_GRID_ROW_COUNT = 4

/** 신규 Grid 기본 시간 (강사가 바로 수정 가능) */
export const DEFAULT_TIME_RANGES = [
  '14:00 ~ 16:00',
  '16:00 ~ 18:00',
  '18:00 ~ 20:00',
  '20:00 ~ 22:00',
] as const

export function cellKey(rowIndex: number, day: string): string {
  return `${rowIndex}:${day}`
}

/** "14:00 ~ 16:00" 또는 레거시 "18:00" 파싱 */
export function parseTimeLabel(label: string): { start: string; end: string } {
  const trimmed = label.trim()
  const rangeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})$/)
  if (rangeMatch) {
    return { start: normalizeTimeInput(rangeMatch[1]), end: normalizeTimeInput(rangeMatch[2]) }
  }
  const singleMatch = trimmed.match(/^(\d{1,2}:\d{2})$/)
  if (singleMatch) {
    return { start: normalizeTimeInput(singleMatch[1]), end: '' }
  }
  return { start: '', end: '' }
}

/** type="time" 값을 HH:mm로 정규화 */
export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return trimmed
  const hour = match[1].padStart(2, '0')
  return `${hour}:${match[2]}`
}

/** 시작·종료 시간 → time_labels 저장 형식 */
export function formatTimeLabel(start: string, end: string): string {
  const s = normalizeTimeInput(start)
  const e = normalizeTimeInput(end)
  if (s && e) return `${s} ~ ${e}`
  if (s) return s
  return ''
}

export function createEmptyGridDraft(rowCount = DEFAULT_GRID_ROW_COUNT): {
  timeLabels: string[]
  cells: Record<string, string>
} {
  const timeLabels = Array.from({ length: rowCount }, (_, index) => DEFAULT_TIME_RANGES[index] ?? '')
  const cells: Record<string, string> = {}
  return { timeLabels, cells }
}

export function createEmptyTemplateDrafts(): Record<
  ScheduleTemplateType,
  { timeLabels: string[]; cells: Record<string, string> }
> {
  return {
    'mon-sun': createEmptyGridDraft(),
    'mon-wed-fri-sat': createEmptyGridDraft(),
    'tue-thu-sat': createEmptyGridDraft(),
  }
}

export function rowHasContent(
  rowIndex: number,
  timeLabels: string[],
  cells: Record<string, string>,
  templateType: ScheduleTemplateType,
): boolean {
  if ((timeLabels[rowIndex] ?? '').trim()) return true
  const days = SCHEDULE_TEMPLATES[templateType].days
  return days.some((day) => (cells[cellKey(rowIndex, day)] ?? '').trim() !== '')
}

/** 뒤쪽 빈 행 제거 — time_labels·cells 길이 동기화 */
export function trimEmptyTrailingRows(
  timeLabels: string[],
  cells: Record<string, string>,
  templateType: ScheduleTemplateType,
): { timeLabels: string[]; cells: Record<string, string> } {
  const labels = [...timeLabels]
  while (labels.length > 0) {
    const rowIndex = labels.length - 1
    if (rowHasContent(rowIndex, labels, cells, templateType)) break
    labels.pop()
  }
  if (labels.length === 0) {
    labels.push('')
  }
  return {
    timeLabels: labels,
    cells: normalizeGridCells(labels, cells, templateType),
  }
}

export function gridToTemplateDraft(grid: ClassScheduleGrid): {
  timeLabels: string[]
  cells: Record<string, string>
} {
  const trimmed = trimEmptyTrailingRows(grid.timeLabels, grid.cells, grid.templateType)
  return {
    timeLabels: [...trimmed.timeLabels],
    cells: { ...trimmed.cells },
  }
}

export function normalizeGridCells(
  timeLabels: string[],
  cells: Record<string, string>,
  templateType: ScheduleTemplateType,
): Record<string, string> {
  const days = SCHEDULE_TEMPLATES[templateType].days
  const normalized: Record<string, string> = {}
  for (let rowIndex = 0; rowIndex < timeLabels.length; rowIndex += 1) {
    for (const day of days) {
      const key = cellKey(rowIndex, day)
      normalized[key] = cells[key] ?? ''
    }
  }
  return normalized
}

/** 행 삭제 후 인덱스 재정렬 */
export function removeGridRow(
  timeLabels: string[],
  cells: Record<string, string>,
  rowIndex: number,
  templateType: ScheduleTemplateType,
): { timeLabels: string[]; cells: Record<string, string> } {
  if (timeLabels.length <= 1) {
    return { timeLabels: [''], cells: normalizeGridCells([''], {}, templateType) }
  }

  const newLabels = timeLabels.filter((_, index) => index !== rowIndex)
  const days = SCHEDULE_TEMPLATES[templateType].days
  const newCells: Record<string, string> = {}

  let newIndex = 0
  for (let oldIndex = 0; oldIndex < timeLabels.length; oldIndex += 1) {
    if (oldIndex === rowIndex) continue
    for (const day of days) {
      newCells[cellKey(newIndex, day)] = cells[cellKey(oldIndex, day)] ?? ''
    }
    newIndex += 1
  }

  return {
    timeLabels: newLabels,
    cells: newCells,
  }
}

export function buildGridRecord(input: {
  id?: string
  grade: string
  className: string
  templateType: ScheduleTemplateType
  timeLabels: string[]
  cells: Record<string, string>
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}): Omit<ClassScheduleGrid, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
} {
  const trimmedLabels = input.timeLabels.map((label) => label.trim())
  const { timeLabels, cells } = trimEmptyTrailingRows(
    trimmedLabels,
    input.cells,
    input.templateType,
  )

  return {
    id: input.id,
    grade: input.grade.trim(),
    className: input.className.trim(),
    templateType: input.templateType,
    timeLabels,
    cells,
    isActive: input.isActive ?? true,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}
