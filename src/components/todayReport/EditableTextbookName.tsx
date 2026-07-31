import { useEffect, useState } from 'react'
import { KoreanTextInput } from '../ui/KoreanTextField'
import { inputClass } from '../../utils/labels'

type EditableTextbookNameProps = {
  value: string
  onSave: (name: string) => void
  onDraftChange?: (name: string) => void
  compact?: boolean
  label?: string
}

export function EditableTextbookName({
  value,
  onSave,
  onDraftChange,
  compact = false,
  label = '교재명',
}: EditableTextbookNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  const handleSave = () => {
    onSave(draft.trim())
    setEditing(false)
  }

  return (
    <div className={compact ? 'mb-1' : 'mb-1.5'}>
      <div className="flex items-center justify-between gap-1">
        <span
          className={`font-semibold text-navy-800 ${compact ? 'text-[11px]' : 'text-xs'}`}
        >
          {label}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-navy-800"
          >
            수정
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-0.5 flex items-center gap-1">
          <KoreanTextInput
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              onDraftChange?.(e.target.value)
            }}
            placeholder="교재명 입력"
            className={`${inputClass()} min-h-9 flex-1 py-1.5 text-sm`}
          />
          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 rounded-lg bg-navy-800 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-navy-900"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value)
              setEditing(false)
            }}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      ) : (
        <p
          className={`mt-0.5 truncate font-medium text-slate-700 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {value.trim() || '교재명 미입력'}
        </p>
      )}
    </div>
  )
}
