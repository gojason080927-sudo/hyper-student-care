import { Pencil, Trash2 } from 'lucide-react'

type RecordActionsProps = {
  onEdit: () => void
  onDelete: () => void
}

export function RecordActions({ onEdit, onDelete }: RecordActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        수정
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        삭제
      </button>
    </div>
  )
}
