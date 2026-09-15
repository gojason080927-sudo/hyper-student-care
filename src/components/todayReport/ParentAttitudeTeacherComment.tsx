import {
  parentAttitudeTeacherCommentDisplay,
} from '../../utils/parentAttitudeTeacherComment'

export function ParentAttitudeTeacherComment({
  note,
}: {
  note: string | null | undefined
}) {
  const display = parentAttitudeTeacherCommentDisplay(note)
  if (!display.visible) return null

  return (
    <div
      className="rounded-xl bg-slate-50 px-3 py-2.5"
      data-parent-attitude-teacher-comment=""
    >
      <p className="text-xs font-semibold text-slate-600">{display.label}</p>
      <p className="mt-1 min-w-0 whitespace-pre-wrap break-keep text-sm leading-6 text-slate-700">
        {display.text}
      </p>
    </div>
  )
}
