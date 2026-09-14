import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../../hooks/useData'
import type { MaterialPrepStatus, StudentDailyCareRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary } from '../../utils/labels'
import {
  isStudentAbsentOnDate,
  missingRequiredMaterialPrep,
} from '../../utils/todayReportAbsence'
import { markChangedDraftKeys, overlayLoadedDrafts } from '../../utils/todayReportDraftMerge'
import { MaterialPrepPicker } from '../studentCare/MaterialPrepPicker'
import { applyMaterialDrafts } from '../../utils/voiceInput/applyVoiceDraft'
import { AbsentFollowOnHint, StudentFollowOnRowHeader } from './AbsentFollowOnBadge'
import { SectionVoiceInput } from './SectionVoiceInput'

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
  const { attendance, studentDailyCare, saveStudentDailyCareRecordAsync, showToast } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, StudentDailyCareRecord | undefined>>({})
  const dirtyMaterialKeysRef = useRef(new Set<string>())

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
    dirtyMaterialKeysRef.current.clear()
  }, [date, studentIdsKey])

  useEffect(() => {
    setDrafts((prev) => {
      const loaded: Record<string, StudentDailyCareRecord | undefined> = {}
      for (const student of students) {
        loaded[student.id] = dayCareByStudent.get(student.id)
      }
      return overlayLoadedDrafts(
        prev,
        loaded,
        dirtyMaterialKeysRef.current,
        (local, server) => {
          if (!local) return server
          return {
            ...local,
            id: server?.id?.trim() || local.id,
            attitudeIssues: server?.attitudeIssues ?? local.attitudeIssues,
            attitudeNote: server?.attitudeNote ?? local.attitudeNote,
          }
        },
      )
    })
  }, [date, dayCareByStudent, studentIdsKey, students])

  const handleSaveAll = async () => {
    if (saving) return
    const missing = missingRequiredMaterialPrep(students, attendance, date, drafts)
    if (missing.length > 0) {
      showToast(`교재 준비 미선택: ${missing.map((s) => s.name).join(', ')}`)
      return
    }
    const targets = students.filter(
      (student) =>
        !isStudentAbsentOnDate(attendance, student.id, date) && drafts[student.id]?.materialPrep,
    )
    if (targets.length === 0) {
      showToast('결석 학생은 교재 준비 입력 대상이 아닙니다.')
      return
    }
    setSaving(true)
    const failures: string[] = []
    const saved: string[] = []
    try {
      for (const student of targets) {
        const current = drafts[student.id]
        if (!current?.materialPrep) {
          failures.push(student.name)
          continue
        }
        try {
          const result = await saveStudentDailyCareRecordAsync(
            {
              id: current.id,
              studentId: student.id,
              date,
              materialPrep: current.materialPrep,
            },
            { silent: true },
          )
          if (result.success) saved.push(student.name)
          else failures.push(student.name)
        } catch (error) {
          console.error('[class-material-prep] save threw', {
            studentId: student.id,
            name: student.name,
            date,
            error,
          })
          failures.push(student.name)
        }
      }
      if (failures.length > 0 && saved.length === 0) {
        showToast('교재 준비 저장에 실패했습니다.')
        return
      }
      if (failures.length > 0) {
        showToast(`교재 준비 일부 저장 실패: ${failures.join(', ')} / 성공: ${saved.join(', ')}`)
        return
      }
      for (const student of targets) {
        dirtyMaterialKeysRef.current.delete(student.id)
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium text-slate-500">
          {formatKoreanDate(date)} / {className} · {students.length}명
        </p>
        <SectionVoiceInput
          label="교재 준비 음성 입력"
          chipLabel="교재"
          compact={compact}
          disabled={saving}
          onApply={(transcript) => {
            const applied = applyMaterialDrafts(
              drafts,
              transcript,
              students,
              attendance,
              date,
              (student, prev, status) => ({
                id: prev?.id ?? '',
                studentId: student.id,
                date,
                materialPrep: status,
                attitudeIssues: prev?.attitudeIssues ?? [],
                attitudeNote: prev?.attitudeNote ?? '',
                createdAt: prev?.createdAt ?? '',
                updatedAt: prev?.updatedAt ?? '',
              }),
            )
            markChangedDraftKeys(drafts, applied.drafts, dirtyMaterialKeysRef.current)
            setDrafts(applied.drafts)
            return applied.summary
          }}
          onSaveCommand={() => void handleSaveAll()}
        />
      </div>
      <div className={compact ? 'divide-y divide-[rgba(22,58,112,0.06)]' : 'divide-y divide-slate-100'}>
        {students.map((student) => {
          const current = drafts[student.id]
          const excluded = isStudentAbsentOnDate(attendance, student.id, date)
          return (
            <div
              key={student.id}
              className={compact ? 'px-1 py-2' : 'px-2 py-2.5'}
              data-absent-excluded={excluded ? 'true' : 'false'}
            >
              <StudentFollowOnRowHeader name={student.name} excluded={excluded} compact={compact} />
              {excluded ? (
                <AbsentFollowOnHint compact={compact} />
              ) : (
                <MaterialPrepPicker
                  value={current?.materialPrep ?? null}
                  compact={compact}
                  disabled={saving}
                  onChange={(value: MaterialPrepStatus) => {
                    dirtyMaterialKeysRef.current.add(student.id)
                    setDrafts((prev) => {
                      const currentDraft = prev[student.id]
                      return {
                        ...prev,
                        [student.id]: {
                          id: currentDraft?.id ?? '',
                          studentId: student.id,
                          date,
                          materialPrep: value,
                          attitudeIssues: currentDraft?.attitudeIssues ?? [],
                          attitudeNote: currentDraft?.attitudeNote ?? '',
                          createdAt: currentDraft?.createdAt ?? '',
                          updatedAt: currentDraft?.updatedAt ?? '',
                        },
                      }
                    })
                  }}
                />
              )}
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
