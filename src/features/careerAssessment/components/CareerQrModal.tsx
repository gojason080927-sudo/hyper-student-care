import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { getCareerTestUrl } from '../api/careerAssessmentApi'
import { copyCareerLink } from '../utils/copyCareerLink'

type CareerQrModalProps = {
  open: boolean
  token: string
  studentName: string
  onClose: () => void
}

export function CareerQrModal({ open, token, studentName, onClose }: CareerQrModalProps) {
  const url = token ? getCareerTestUrl(token) : ''
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    void import('qrcode').then((QRCode) =>
      QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' }).then((value: string) => {
        if (!cancelled) setDataUrl(value)
      }),
    )
    return () => {
      cancelled = true
    }
  }, [open, url])

  const copy = async () => {
    const ok = await copyCareerLink(url)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal open={open} title={`${studentName} 검사 링크`} onClose={onClose}>
      <div className="space-y-4 text-center">
        {dataUrl ? (
          <img src={dataUrl} alt="진로검사 QR" className="mx-auto h-52 w-52 rounded-xl border border-slate-200" />
        ) : (
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
            QR 생성 중
          </div>
        )}
        <p className="break-all text-xs text-slate-500">{url}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="min-h-11 w-full rounded-xl bg-navy-900 text-sm font-semibold text-white"
        >
          {copied ? '복사됨' : '링크 복사'}
        </button>
      </div>
    </Modal>
  )
}
