import type { HomeworkStatus } from '../../types/records'
import { TeacherMobileHomeworkStatusButtons } from './TeacherMobileHomeworkStatusButtons'

type TeacherMobileHomeworkStatusPickerProps = {
  value: HomeworkStatus | ''
  onChange: (status: HomeworkStatus) => void
  error?: string
  compact?: boolean
}

export function TeacherMobileHomeworkStatusPicker({
  value,
  onChange,
  error,
  compact = false,
}: TeacherMobileHomeworkStatusPickerProps) {
  return (
    <fieldset>
      <TeacherMobileHomeworkStatusButtons
        value={value}
        onChange={onChange}
        label="수행 상태 *"
        error={error}
        compact={compact}
      />
    </fieldset>
  )
}
