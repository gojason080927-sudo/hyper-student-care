type PwaUpdatePromptProps = {
  needRefresh: boolean
  onUpdate: () => void
  onDismiss: () => void
}

export function PwaUpdatePrompt({ needRefresh, onUpdate, onDismiss }: PwaUpdatePromptProps) {
  if (!needRefresh) return null

  return (
    <div
      className="fixed inset-x-4 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-md"
      role="alert"
    >
      <p className="text-sm font-semibold text-amber-900">새 버전이 있습니다.</p>
      <p className="mt-0.5 text-xs text-amber-800">
        업데이트 후 최신 기능을 사용할 수 있습니다. 작성 중인 입력은 저장 후 진행해 주세요.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onUpdate}
          className="min-h-10 flex-1 rounded-lg bg-navy-800 text-sm font-semibold text-white"
        >
          업데이트
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-10 rounded-lg border border-amber-300 px-3 text-sm text-amber-900"
        >
          나중에
        </button>
      </div>
    </div>
  )
}
