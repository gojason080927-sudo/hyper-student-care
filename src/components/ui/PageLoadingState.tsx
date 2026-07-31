type PageLoadingStateProps = {
  message?: string
}

export function PageLoadingState({
  message = '데이터를 불러오는 중…',
}: PageLoadingStateProps) {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
