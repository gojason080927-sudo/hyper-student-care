import { Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { Student } from '../../types/student'
import { handleShareStudentCareToKakao, KakaoShareButton } from './KakaoShareButton'
import { useData } from '../../hooks/useData'
import { getStudentCareUrl } from '../../utils/studentCareUrl'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type StudentAccessLinkPanelProps = {
  student: Student
}

export function StudentAccessLinkPanel({ student }: StudentAccessLinkPanelProps) {
  const { copyStudentCareLink, regenerateStudentAccessKey, showToast } = useData()
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const careUrl = getStudentCareUrl(student.studentAccessKey)

  const handleKakaoShare = async (target: Student) => {
    await handleShareStudentCareToKakao(target, {
      onError: (message) => showToast(message),
    })
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
      <h3 className="text-base font-bold text-navy-900">학부모·학생 개인 링크</h3>
      <p className="mt-1 text-sm text-slate-600">
        카카오톡 단톡방 상단에 고정할 학생 전용 링크입니다. 해당 학생의 기록만 열람할 수 있습니다.
      </p>
      <p className="mt-3 break-all rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
        {careUrl}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyStudentCareLink(student.id)}
          className={`${btnPrimary} inline-flex items-center gap-2`}
        >
          <Copy className="h-4 w-4" />
          개인 링크 복사
        </button>
        <KakaoShareButton student={student} onShare={handleKakaoShare} />
        <button
          type="button"
          onClick={() => setRegenerateOpen(true)}
          className={`${btnSecondary} inline-flex items-center gap-2`}
        >
          <RefreshCw className="h-4 w-4" />
          개인 링크 재발급
        </button>
      </div>

      <ConfirmDialog
        open={regenerateOpen}
        title="개인 링크 재발급"
        message="개인 링크를 재발급하면 기존 단톡방 링크는 더 이상 사용할 수 없습니다. 새 링크를 카카오톡 단톡방에 다시 등록해야 합니다."
        onCancel={() => setRegenerateOpen(false)}
        onConfirm={() => {
          regenerateStudentAccessKey(student.id)
          setRegenerateOpen(false)
        }}
      />
    </div>
  )
}
