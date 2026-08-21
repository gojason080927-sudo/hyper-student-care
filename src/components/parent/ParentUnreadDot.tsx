type ParentUnreadDotProps = {
  className?: string
  /** 카드/탭 등 컨텍스트에 맞는 위치 조정용 */
  size?: 'sm' | 'md'
}

export function ParentUnreadDot({ className = '', size = 'sm' }: ParentUnreadDotProps) {
  const sizeClass = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'
  return (
    <span
      className={`pointer-events-none absolute rounded-full bg-[#FF6B6B] ring-2 ring-white ${sizeClass} ${className}`}
      aria-hidden
    />
  )
}
