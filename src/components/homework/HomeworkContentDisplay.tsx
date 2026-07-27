import { useMemo, useState } from 'react'

type HomeworkContentDisplayProps = {
  content: string
  className?: string
}

const PREVIEW_MAX = 120

export function HomeworkContentDisplay({ content, className = '' }: HomeworkContentDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const trimmed = content.trim()

  const needsToggle = useMemo(() => {
    if (!trimmed) return false
    const lineCount = trimmed.split('\n').length
    return lineCount > 3 || trimmed.length > PREVIEW_MAX
  }, [trimmed])

  if (!trimmed) {
    return <p className={`text-sm text-slate-400 ${className}`}>숙제 내용 없음</p>
  }

  return (
    <div className={className}>
      <p
        className={`whitespace-pre-wrap text-sm text-slate-700 ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        {trimmed}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {expanded ? '접기' : '내용 보기'}
        </button>
      )}
    </div>
  )
}
