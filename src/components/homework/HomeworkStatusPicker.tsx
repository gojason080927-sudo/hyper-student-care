import type { HomeworkStatus } from '../../types/records'
import { HomeworkStatusButtons } from './HomeworkStatusButtons'

type HomeworkStatusPickerProps = {
  value: HomeworkStatus | ''
  onChange: (status: HomeworkStatus) => void
  error?: string
  compact?: boolean
  label?: string
  labelClassName?: string
  /** true면 외부 HomeworkResultRow 라벨만 사용 */
  hideLabel?: boolean
}

export function HomeworkStatusPicker({
  value,
  onChange,
  error,
  compact = false,
  label = '지난 과제 *',
  labelClassName,
  hideLabel = false,
}: HomeworkStatusPickerProps) {
  return (
    <fieldset>
      <HomeworkStatusButtons
        value={value}
        onChange={onChange}
        label={hideLabel ? undefined : label}
        labelClassName={labelClassName}
        error={error}
        compact={compact}
      />
    </fieldset>
  )
}
