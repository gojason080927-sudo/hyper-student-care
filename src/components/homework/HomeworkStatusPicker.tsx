import type { HomeworkStatus } from '../../types/records'
import { HomeworkStatusButtons } from './HomeworkStatusButtons'

type HomeworkStatusPickerProps = {
  value: HomeworkStatus | ''
  onChange: (status: HomeworkStatus) => void
  error?: string
  compact?: boolean
}

export function HomeworkStatusPicker({ value, onChange, error, compact = false }: HomeworkStatusPickerProps) {
  return (
    <fieldset>
      <HomeworkStatusButtons
        value={value}
        onChange={onChange}
        label="수행 상태 *"
        error={error}
        compact={compact}
      />
    </fieldset>
  )
}
