import { Modal } from '../../../components/ui/Modal'

type CareerConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CareerConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: CareerConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
