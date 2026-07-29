import { MessageCircle, Share2 } from 'lucide-react'
import { shareStudentCareToKakao } from '../../lib/kakao'
import type { Student } from '../../types/student'

type ShareHandlers = {
  onSuccess?: (message?: string) => void
  onError: (message: string) => void
}

export async function handleShareStudentCareToKakao(
  student: Student,
  { onSuccess, onError }: ShareHandlers,
): Promise<void> {
  const result = await shareStudentCareToKakao(student)
  if (result.ok) {
    onSuccess?.(result.message)
    return
  }
  const fullMessage = result.hint ? `${result.message} ${result.hint}` : result.message
  onError(fullMessage)
}

export function KakaoShareButton({
  student,
  onShare,
  compact = false,
  className = '',
}: {
  student: Student
  onShare: (student: Student) => void
  compact?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label="카카오톡 공유"
      onClick={() => onShare(student)}
      className={`student-table-action-btn inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium leading-none text-slate-700 hover:bg-slate-50 ${compact ? 'justify-center' : ''} ${className}`}
    >
      {compact ? <MessageCircle className="h-3.5 w-3.5 shrink-0" /> : <Share2 className="h-4 w-4" />}
      {compact ? '카카오' : '카카오톡 공유'}
    </button>
  )
}
