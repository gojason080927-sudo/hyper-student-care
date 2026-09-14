import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import type { MaterialPrepStatus, StudentDailyCareRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary } from '../../utils/labels'
import { MaterialPrepPicker } from '../studentCare/MaterialPrepPicker'

type ClassMaterialPrepBulkPanelProps = {
  date: string
  className: string
  students: Student[]
  compact?: boolean
}

export function ClassMaterialPrepBulkPanel({
  date,
  className,
  students,
  compact = false,
}: ClassMaterialPrepBulkPanelProps) {
  const {
    studentDailyCare,
    saveStudentDailyCareRecord,
    showToast,
  } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, StudentDailyCareRecord | undefined>>({})

  const dayCareByStudent = useMemo(() => {
    const map = new Map<string, StudentDailyCareRecord>()
    for (const record of studentDailyCare) {
      if (record.date !== date) continue
      map.set(record.studentId, record)
    }
    return map
  }, [date, studentDailyCare])

  const studentIdsKey = students.map((student) => student.id).join('|')

  useEffect(() => {
    const next: Record<string, StudentDailyCareRecord | undefined> = {}
    for (const student of students) {
      next[student.id] = dayCareByStudent.get(student.id)
    }
    setDrafts(next)
  }, [date, dayCareByStudent, studentIdsKey, students])

  const handleSaveAll = async () => {
    if (saving) return
    const missing = students.filter((student) => !drafts[student.id]?.materialPrep)
    if (missing.length > 0) {
      showToast(`교재 준비 미선택: ${missing.map((s) => s.name).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      for (const student of students) {
        const current = drafts[student.id]
        if (!current?.materialPrep) continue
        saveStudentDailyCareRecord({
          id: current.id,
          studentId: student.id,
          date,
          materialPrep: current.materialPrep,
          attitudeIssues: current.attitudeIssues ?? [],
          attitudeNote: current.attitudeNote ?? '',
        })
      }
      showToast('교재 준비가 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (students.length === 0) {
    return <p className="px-1 py-3 text-center text-sm text-slate-500">표시할 학생이 없습니다.</p>
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs font-medium text-slate-500">
        {formatKoreanDate(date)} / {className} · {students.length}명
      </p>
      <div className={compact ? 'divide-y divide-[rgba(22,58,112,0.06)]' : 'divide-y divide-slate-100'}>
        {students.map((student) => {
          const current = drafts[student.id]
          return (
            <div key={student.id} className={compact ? 'px-1 py-2' : 'px-2 py-2.5'}>
              <div className="mb-1.5 flex items-center gap-2">
                <p className={compact ? 'text-sm font-bold text-[#163A70]' : 'text-sm font-bold text-navy-900'}>
                  {student.name}
                </p>
              </div>
              <MaterialPrepPicker
                value={current?.materialPrep ?? null}
                compact={compact}
                disabled={saving}
                onChange={(value: MaterialPrepStatus) => {
                  setDrafts((prev) => ({
                    ...prev,
                    [student.id]: {
                      id: current?.id ?? '',
                      studentId: student.id,
                      date,
                      materialPrep: value,
                      attitudeIssues: current?.attitudeIssues ?? [],
                      attitudeNote: current?.attitudeNote ?? '',
                      createdAt: current?.createdAt ?? '',
                      updatedAt: current?.updatedAt ?? '',
                    },
                  }))
                }}
              />
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void handleSaveAll()}
        disabled={saving}
        className={compact ? 'tm-btn-primary w-full min-h-11' : `${btnPrimary} w-full`}
      >
        {saving ? '저장 중…' : '전체 교재 준비 저장'}
      </button>
    </div>
  )
}
