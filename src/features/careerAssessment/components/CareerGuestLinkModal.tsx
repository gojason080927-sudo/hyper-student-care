import { useMemo, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import type { Student } from '../../../types/student'

type CareerGuestLinkModalProps = {
  open: boolean
  guestName: string
  students: Student[]
  busy: boolean
  onClose: () => void
  onLink: (studentId: string) => Promise<void>
}

export function CareerGuestLinkModal({
  open,
  guestName,
  students,
  busy,
  onClose,
  onLink,
}: CareerGuestLinkModalProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState('')
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students
      .filter((student) => {
        if (!q) return true
        return `${student.name} ${student.school} ${student.grade}`.toLowerCase().includes(q)
      })
      .slice(0, 30)
  }, [search, students])

  return (
    <Modal open={open} title={`${guestName} → 재원생으로 연결`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">이름만 자동 연결하지 않습니다. 강사가 학생을 직접 선택하세요.</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 학교 검색"
          className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
        />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {matches.map((student) => (
            <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
              <input
                type="radio"
                name="link-student"
                checked={picked === student.id}
                onChange={() => setPicked(student.id)}
              />
              <span className="text-sm">
                {student.name} · {student.school} · {student.grade}
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={!picked || busy}
          onClick={() => void onLink(picked)}
          className="min-h-11 w-full rounded-xl bg-navy-900 text-sm font-semibold text-white disabled:opacity-50"
        >
          선택한 재원생과 연결
        </button>
      </div>
    </Modal>
  )
}
