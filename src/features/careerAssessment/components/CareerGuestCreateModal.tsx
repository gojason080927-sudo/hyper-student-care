import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { CAREER_GUEST_GRADES } from '../utils/careerListRows'

type CareerGuestCreateModalProps = {
  open: boolean
  busy: boolean
  onClose: () => void
  onSubmit: (input: {
    name: string
    school: string
    grade: string
    memo: string
    consultationDate: string
  }) => Promise<void>
}

export function CareerGuestCreateModal({ open, busy, onClose, onSubmit }: CareerGuestCreateModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('고1')
  const [memo, setMemo] = useState('')
  const [consultationDate, setConsultationDate] = useState(today)

  const submit = async () => {
    if (!name.trim() || !school.trim() || !grade) return
    await onSubmit({
      name: name.trim(),
      school: school.trim(),
      grade,
      memo: memo.trim(),
      consultationDate,
    })
    setName('')
    setSchool('')
    setMemo('')
    setConsultationDate(today)
  }

  return (
    <Modal open={open} title="상담생 검사 만들기" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">학교</span>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">학년</span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
          >
            {CAREER_GUEST_GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">상담일</span>
          <input
            type="date"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">상담 메모 (선택)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={busy || !name.trim() || !school.trim()}
          onClick={() => void submit()}
          className="min-h-11 w-full rounded-xl bg-navy-900 text-sm font-semibold text-white disabled:opacity-50"
        >
          검사 만들기
        </button>
      </div>
    </Modal>
  )
}
