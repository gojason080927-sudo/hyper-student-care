import type { HomeworkStatus } from '../../types/records'
import { TeacherMobileHomeworkStatusButtons } from './TeacherMobileHomeworkStatusButtons'

type TeacherMobileHomeworkStatusPickerProps = {
  value: HomeworkStatus | ''
  onChange: (status: HomeworkStatus) => void
  error?: string
  compact?: boolean
  label?: string
  labelClassName?: string
  hideLabel?: boolean
}

export function TeacherMobileHomeworkStatusPicker({
  value,
  onChange,
  error,
  compact = false,
  label = '지난 과제 *',
  labelClassName,
  hideLabel = false,
}: TeacherMobileHomeworkStatusPickerProps) {
  return (
    <fieldset>
      <TeacherMobileHomeworkStatusButtons
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
