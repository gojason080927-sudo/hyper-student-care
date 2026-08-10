import { Plus, Trash2 } from 'lucide-react'
import type { WrongAnswerItem } from '../../types/records'
import {
  MATH_WRONG_CAUSES,
  createWrongAnswerItemId,
  type MathWrongCause,
} from '../../utils/learningDiagnosis'
import { btnSecondary, inputClass } from '../../utils/labels'

type WrongAnswerCauseEditorProps = {
  items: WrongAnswerItem[]
  onChange: (items: WrongAnswerItem[]) => void
  questionTotal: number
  onQuestionTotalChange: (value: number) => void
  compact?: boolean
}

export function WrongAnswerCauseEditor({
  items,
  onChange,
  questionTotal,
  onQuestionTotalChange,
  compact = false,
}: WrongAnswerCauseEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      {
        id: createWrongAnswerItemId(),
        label: String(items.length + 1),
        cause: '개념 부족',
      },
    ])
  }

  const updateItem = (id: string, patch: Partial<WrongAnswerItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className={`space-y-2 ${compact ? 'text-sm' : ''}`.trim()}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-600">총 문항 수</span>
          <input
            type="number"
            min={0}
            value={questionTotal || ''}
            onChange={(e) => onQuestionTotalChange(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass()}
            placeholder="예: 20"
          />
        </label>
        <button type="button" onClick={addItem} className={btnSecondary}>
          <Plus className="mr-1 inline h-4 w-4" aria-hidden />
          오답 문항 추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">
          오답이 있으면 문항마다 원인(개념 부족 / 계산 실수 / 문제 이해 부족)을 선택해 주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2"
            >
              <input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                className={`${inputClass()} w-20`}
                placeholder="문항"
                aria-label="문항 번호"
              />
              <select
                value={item.cause}
                onChange={(e) =>
                  updateItem(item.id, { cause: e.target.value as MathWrongCause })
                }
                className={`${inputClass()} min-w-[140px] flex-1`}
                aria-label="오답 원인"
              >
                {MATH_WRONG_CAUSES.map((cause) => (
                  <option key={cause} value={cause}>
                    {cause}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                aria-label="오답 문항 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
