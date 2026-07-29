import type { Student } from '../../types/student'
import { useData } from '../../hooks/useData'
import { getStudentLinkStatus } from '../../utils/studentLinkStatus'
import { handleShareStudentCareToKakao, KakaoShareButton } from './KakaoShareButton'

type StudentKakaoShareActionProps = {
  student: Student
  compact?: boolean
}

export function StudentKakaoShareAction({ student, compact = false }: StudentKakaoShareActionProps) {
  const { showToast } = useData()
  const hasActiveLink = getStudentLinkStatus(student) === 'active'

  const handleKakaoShare = async (target: Student) => {
    await handleShareStudentCareToKakao(target, {
      onSuccess: () => showToast('카카오톡 공유 창을 열었습니다.'),
      onError: (message) => showToast(message),
    })
  }

  if (!hasActiveLink) {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          disabled
          className={`inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-400 ${
            compact ? 'min-h-9 px-3 py-1.5 text-sm' : 'min-h-11 px-4 py-2.5 text-sm'
          }`}
        >
          카카오톡 공유
        </button>
        <p className="text-[11px] text-rose-600">활성화된 학부모 링크가 없습니다.</p>
      </div>
    )
  }

  return (
    <KakaoShareButton
      student={student}
      onShare={handleKakaoShare}
      compact={compact}
      className={compact ? 'min-h-9 px-3 py-1.5 text-sm' : undefined}
    />
  )
}
