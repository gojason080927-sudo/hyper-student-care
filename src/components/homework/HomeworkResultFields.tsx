import type { ReactNode } from 'react'
import { CalendarCheck, ClipboardList, type LucideIcon } from 'lucide-react'
import {
  HOMEWORK_PAST_LABEL_CLASS,
  HOMEWORK_PAST_VALUE_CLASS,
  HOMEWORK_TODAY_LABEL_CLASS,
  TODAY_REPORT_CONTENT_EMPHASIS_CLASS,
} from '../../utils/homeworkCardTypography'

export const HOMEWORK_RESULT_DIVIDER_CLASS =
  'my-3 border-t border-dashed border-[#E2E8F0]'

const ICON_WRAP =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-[42px] sm:w-[42px]'

type HomeworkResultRowProps = {
  tone: 'past' | 'today'
  label: string
  /** read-only 값. children이 있으면 children 우선 */
  value?: string
  children?: ReactNode
  labelClassName?: string
  valueClassName?: string
}

function toneStyles(tone: 'past' | 'today'): {
  wrap: string
  Icon: LucideIcon
  iconClass: string
  defaultLabelClass: string
  defaultValueClass: string
} {
  if (tone === 'past') {
    return {
      wrap: `${ICON_WRAP} bg-[#ECFDF5]`,
      Icon: CalendarCheck,
      iconClass: 'h-5 w-5 text-[#16A34A]',
      defaultLabelClass: HOMEWORK_PAST_LABEL_CLASS,
      defaultValueClass: HOMEWORK_PAST_VALUE_CLASS,
    }
  }
  return {
    wrap: `${ICON_WRAP} bg-[#FEF2F2]`,
    Icon: ClipboardList,
    iconClass: 'h-5 w-5 text-[#DC2626]',
    defaultLabelClass: HOMEWORK_TODAY_LABEL_CLASS,
    defaultValueClass: TODAY_REPORT_CONTENT_EMPHASIS_CLASS,
  }
}

/** 지난/오늘 과제 공통 행 — 원형 아이콘 + 라벨/값(또는 편집 children) */
export function HomeworkResultRow({
  tone,
  label,
  value,
  children,
  labelClassName,
  valueClassName,
}: HomeworkResultRowProps) {
  const styles = toneStyles(tone)
  const Icon = styles.Icon

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className={styles.wrap} aria-hidden>
        <Icon className={styles.iconClass} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={labelClassName ?? styles.defaultLabelClass}>{label}</p>
        {children ??
          (value != null ? (
            <p className={`whitespace-pre-wrap ${valueClassName ?? styles.defaultValueClass}`}>
              {value}
            </p>
          ) : null)}
      </div>
    </div>
  )
}

export function HomeworkResultDivider() {
  return <div className={HOMEWORK_RESULT_DIVIDER_CLASS} role="separator" />
}

type HomeworkResultDisplayProps = {
  pastValue: string
  todayValue: string
  pastLabel?: string
  todayLabel?: string
}

/** 학부모/학생 read-only 숙제 결과 본문 */
export function HomeworkResultDisplay({
  pastValue,
  todayValue,
  pastLabel = '지난 과제',
  todayLabel = '오늘 과제',
}: HomeworkResultDisplayProps) {
  return (
    <div>
      <HomeworkResultRow tone="past" label={pastLabel} value={pastValue} />
      <HomeworkResultDivider />
      <HomeworkResultRow tone="today" label={todayLabel} value={todayValue} />
    </div>
  )
}

type HomeworkResultEditorProps = {
  pastLabel?: string
  todayLabel?: string
  pastControls: ReactNode
  todayControls: ReactNode
}

/** 강사 편집용 — 아이콘·구분선 골격 + 상태 버튼/입력 children */
export function HomeworkResultEditor({
  pastLabel = '지난 과제',
  todayLabel = '오늘 과제',
  pastControls,
  todayControls,
}: HomeworkResultEditorProps) {
  return (
    <div>
      <HomeworkResultRow tone="past" label={pastLabel}>
        {pastControls}
      </HomeworkResultRow>
      <HomeworkResultDivider />
      <HomeworkResultRow tone="today" label={todayLabel}>
        {todayControls}
      </HomeworkResultRow>
    </div>
  )
}
