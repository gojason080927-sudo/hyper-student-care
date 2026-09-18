import { useEffect, useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import type { Student } from '../../types/student'
import { copyTextToClipboard } from '../../utils/copyToClipboard'
import { buildStudentHubShareMessage } from '../../utils/studentCareUrl'
import { btnSecondary } from '../../utils/labels'

type StudentHubQrCardProps = {
  student: Student
  hubUrl: string
  onToast: (message: string) => void
}

export function StudentHubQrCard({ student, hubUrl, onToast }: StudentHubQrCardProps) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    setDataUrl('')
    void import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(hubUrl, { width: 280, margin: 1, errorCorrectionLevel: 'M' }),
      )
      .then((value: string) => {
        if (!cancelled) setDataUrl(value)
      })
      .catch(() => {
        if (!cancelled) setDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [hubUrl])

  const copyLink = async () => {
    const copied = await copyTextToClipboard(hubUrl)
    onToast(copied.ok ? `${student.name} Hub 링크를 복사했습니다.` : hubUrl)
  }

  const shareLink = async () => {
    const text = buildStudentHubShareMessage(student.name, hubUrl)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${student.name} Student Hub`,
          text,
          url: hubUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    const copied = await copyTextToClipboard(text)
    onToast(copied.ok ? `${student.name} Hub 문구를 복사했습니다.` : hubUrl)
  }

  return (
    <article className="hub-qr-card rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <h3 className="break-keep text-lg font-bold text-navy-900">{student.name}</h3>
      {student.accessKeyActive === false ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">링크 차단됨</p>
      ) : null}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`${student.name} 학생 Hub QR`}
          className="mx-auto mt-3 h-40 w-40 rounded-xl border border-slate-200 bg-white"
        />
      ) : (
        <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
          QR 생성 중
        </div>
      )}
      <div className="no-print mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" className={`${btnSecondary} min-h-10 px-3 py-2 text-xs`} onClick={() => void copyLink()}>
          <span className="inline-flex items-center gap-1">
            <Copy className="h-3.5 w-3.5" />
            링크 복사
          </span>
        </button>
        <button type="button" className={`${btnSecondary} min-h-10 px-3 py-2 text-xs`} onClick={() => void shareLink()}>
          <span className="inline-flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" />
            보내기
          </span>
        </button>
      </div>
    </article>
  )
}
