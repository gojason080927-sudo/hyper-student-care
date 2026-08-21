import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import type { ScheduleTemplateType } from '../../types/records'
import {
  SCHEDULE_TEMPLATES,
  cellKey,
  formatTimeLabel,
  parseTimeLabel,
} from '../../utils/scheduleGrid'

type ScheduleGridTableProps = {
  templateType: ScheduleTemplateType
  timeLabels: string[]
  cells: Record<string, string>
  readOnly?: boolean
  onTimeLabelChange?: (rowIndex: number, value: string) => void
  onCellChange?: (rowIndex: number, day: string, value: string) => void
  onDeleteRow?: (rowIndex: number) => void
}

function openTimePicker(input: HTMLInputElement) {
  try {
    // Helps mobile/desktop when the compact clock glyph is hard to tap
    input.showPicker?.()
  } catch {
    // showPicker can throw if not triggered by user gesture or unsupported
  }
}

function TimeRangeEditor({
  timeLabel,
  rowIndex,
  onTimeLabelChange,
}: {
  timeLabel: string
  rowIndex: number
  onTimeLabelChange?: (rowIndex: number, value: string) => void
}) {
  const { start, end } = parseTimeLabel(timeLabel)

  const update = (nextStart: string, nextEnd: string) => {
    onTimeLabelChange?.(rowIndex, formatTimeLabel(nextStart, nextEnd))
  }

  return (
    <div className="schedule-grid-time-range">
      <input
        type="time"
        value={start}
        onChange={(e) => update(e.target.value, end)}
        onFocus={(e) => openTimePicker(e.currentTarget)}
        onClick={(e) => openTimePicker(e.currentTarget)}
        className="schedule-grid-time-input schedule-grid-time-input--start"
        aria-label={`${rowIndex + 1}행 시작 시간`}
      />
      <span className="schedule-grid-time-separator" aria-hidden="true">
        ~
      </span>
      <input
        type="time"
        value={end}
        onChange={(e) => update(start, e.target.value)}
        onFocus={(e) => openTimePicker(e.currentTarget)}
        onClick={(e) => openTimePicker(e.currentTarget)}
        className="schedule-grid-time-input schedule-grid-time-input--end"
        aria-label={`${rowIndex + 1}행 종료 시간`}
      />
    </div>
  )
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  'aria-label'?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      className={className}
      rows={1}
      placeholder={placeholder}
      spellCheck={false}
      aria-label={ariaLabel}
    />
  )
}

export function ScheduleGridTable({
  templateType,
  timeLabels,
  cells,
  readOnly = false,
  onTimeLabelChange,
  onCellChange,
  onDeleteRow,
}: ScheduleGridTableProps) {
  const { days } = SCHEDULE_TEMPLATES[templateType]
  const showActions = !readOnly && onDeleteRow

  return (
    <div className="schedule-grid-wrap overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="schedule-grid-table w-full min-w-[320px] border-collapse">
        <thead>
          <tr>
            <th className="schedule-grid-corner" scope="col">
              <span className="schedule-grid-corner-time">시간</span>
              <span className="schedule-grid-corner-day">요일</span>
            </th>
            {days.map((day) => (
              <th key={day} className="schedule-grid-header" scope="col">
                {day}
              </th>
            ))}
            {showActions && (
              <th className="schedule-grid-actions-header" scope="col" aria-label="행 삭제">
                {'\u00a0'}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {timeLabels.map((timeLabel, rowIndex) => (
            <tr key={rowIndex}>
              <td className="schedule-grid-time-col">
                {readOnly ? (
                  <span className="schedule-grid-read-text">{timeLabel || '\u00a0'}</span>
                ) : (
                  <TimeRangeEditor
                    timeLabel={timeLabel}
                    rowIndex={rowIndex}
                    onTimeLabelChange={onTimeLabelChange}
                  />
                )}
              </td>
              {days.map((day) => {
                const value = cells[cellKey(rowIndex, day)] ?? ''
                return (
                  <td key={day} className="schedule-grid-cell">
                    {readOnly ? (
                      <div className="schedule-grid-read-text">
                        {value || '\u00a0'}
                      </div>
                    ) : (
                      <AutoResizeTextarea
                        value={value}
                        onChange={(next) => onCellChange?.(rowIndex, day, next)}
                        className="schedule-grid-cell-input"
                        placeholder="내용 입력"
                        aria-label={`${timeLabel || `${rowIndex + 1}행`} ${day}요일`}
                      />
                    )}
                  </td>
                )
              })}
              {showActions && (
                <td className="schedule-grid-actions-col">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(rowIndex)}
                    className="schedule-grid-delete-btn"
                    aria-label={`${rowIndex + 1}행 삭제`}
                    title="행 삭제"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
