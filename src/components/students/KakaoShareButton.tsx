import { MessageCircle, Share2 } from 'lucide-react'
import { shareStudentCareToKakao } from '../../lib/kakao'
import type { Student } from '../../types/student'

type ShareHandlers = {
  onSuccess?: () => void
  onError: (message: string) => void
}

export async function handleShareStudentCareToKakao(
  student: Student,
  { onSuccess, onError }: ShareHandlers,
): Promise<void> {
  const result = await shareStudentCareToKakao(student)
  if (result.ok) {
    onSuccess?.()
    return
  }
  const fullMessage = result.hint ? `${result.message} ${result.hint}` : result.message
  onError(fullMessage)
}

export function KakaoShareButton({
  student,
  onShare,
  compact = false,
}: {
  student: Student
  onShare: (student: Student) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      aria-label="카카오톡 공유"
      onClick={() => onShare(student)}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 ${compact ? 'flex-1 justify-center' : ''}`}
    >
      {compact ? <MessageCircle className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      카카오톡 공유
    </button>
  )
}
