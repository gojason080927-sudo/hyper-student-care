import type { Student } from '../../types/student'
import { useData } from '../../hooks/useData'
import { getStudentLinkStatus } from '../../utils/studentLinkStatus'
import { handleShareStudentCareToKakao, KakaoShareButton } from './KakaoShareButton'

type StudentKakaoShareActionProps = {
  student: Student
}

export function StudentKakaoShareAction({ student }: StudentKakaoShareActionProps) {
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
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400"
        >
          카카오톡 공유
        </button>
        <p className="text-xs text-rose-600">활성화된 학부모 링크가 없습니다.</p>
      </div>
    )
  }

  return <KakaoShareButton student={student} onShare={handleKakaoShare} />
}
