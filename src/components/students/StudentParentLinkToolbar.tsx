import { Copy, ExternalLink, Link2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { Student } from '../../types/student'
import { useData } from '../../hooks/useData'
import { getStudentLinkStatusLabel } from '../../utils/studentLinkStatus'
import { hasStudentAccessKey } from '../../utils/studentStorage'
import { btnSecondary } from '../../utils/labels'
import { getStudentHubUrl } from '../../utils/studentCareUrl'
import { copyTextToClipboard } from '../../utils/copyToClipboard'
import { handleShareStudentCareToKakao, KakaoShareButton } from './KakaoShareButton'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type StudentParentLinkToolbarProps = {
  student: Student
}

function LinkActionBtn({
  label,
  onClick,
  icon,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function StudentParentLinkToolbar({ student }: StudentParentLinkToolbarProps) {
  const {
    copyStudentCareLink,
    generateStudentAccessKeyForStudent,
    openStudentCareInNewTab,
    regenerateStudentAccessKey,
    setStudentAccessKeyActive,
    showToast,
  } = useData()
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const hasKey = hasStudentAccessKey(student.studentAccessKey)
  const linkStatus = getStudentLinkStatusLabel(student)

  const handleKakaoShare = async (target: Student) => {
    await handleShareStudentCareToKakao(target, {
      onSuccess: () => showToast('카카오톡 공유 창을 열었습니다.'),
      onError: (message) => showToast(message),
    })
  }

  return (
    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 px-2 py-2">
      <p className="text-[11px] font-medium text-slate-600">
        학부모 링크:{' '}
        <span className={`font-semibold ${linkStatus.className}`}>{linkStatus.text}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {hasKey ? (
          <>
            <LinkActionBtn
              label="링크 복사"
              onClick={() => void copyStudentCareLink(student.id)}
              icon={<Copy className="h-3.5 w-3.5 shrink-0" />}
            />
            <LinkActionBtn
              label="새 탭"
              onClick={() => openStudentCareInNewTab(student.id)}
              icon={<ExternalLink className="h-3.5 w-3.5 shrink-0" />}
            />
            <LinkActionBtn
              label="재발급"
              onClick={() => setRegenerateOpen(true)}
              icon={<RefreshCw className="h-3.5 w-3.5 shrink-0" />}
            />
            <LinkActionBtn
              label="학생 Hub"
              onClick={async () => {
                try {
                  const url = getStudentHubUrl(student.studentAccessKey)
                  const copied = await copyTextToClipboard(url)
                  showToast(copied.ok ? '학생 Hub 링크를 복사했습니다.' : url)
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Hub 링크를 만들지 못했습니다.')
                }
              }}
              icon={<Link2 className="h-3.5 w-3.5 shrink-0" />}
            />
            <LinkActionBtn
              label={student.accessKeyActive === false ? '링크 활성' : '링크 차단'}
              onClick={() => setStudentAccessKeyActive(student.id, student.accessKeyActive === false)}
              icon={<Link2 className="h-3.5 w-3.5 shrink-0" />}
            />
            <KakaoShareButton
              student={student}
              onShare={handleKakaoShare}
              compact
              className="min-h-8 gap-1 px-2 py-1 text-[11px]"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => void generateStudentAccessKeyForStudent(student.id)}
            className={`${btnSecondary} inline-flex min-h-8 items-center gap-1 px-2 py-1 text-[11px]`}
          >
            <Link2 className="h-3.5 w-3.5" />
            링크 생성
          </button>
        )}
      </div>

      <ConfirmDialog
        open={regenerateOpen}
        title="링크 재발급"
        message="링크를 재발급하면 기존 카카오톡 링크는 더 이상 사용할 수 없습니다. 새 링크를 다시 전달해야 합니다. 재발급하시겠습니까?"
        onCancel={() => setRegenerateOpen(false)}
        onConfirm={() => {
          void regenerateStudentAccessKey(student.id)
          setRegenerateOpen(false)
        }}
      />
    </div>
  )
}
