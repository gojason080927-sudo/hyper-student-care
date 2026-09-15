import { useEffect, useMemo, useRef, useState } from 'react'
import { StudentKakaoShareAction } from '../students/StudentKakaoShareAction'
import { ClassAttitudePicker } from '../studentCare/ClassAttitudePicker'
import { AbsentFollowOnHint, StudentFollowOnRowHeader } from './AbsentFollowOnBadge'
import { useData } from '../../hooks/useData'
import type { ClassAttitudeIssue, StudentDailyCareRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary } from '../../utils/labels'
import {
  isStudentAbsentOnDate,
  selectAttitudeBulkSaveTargets,
  type AttitudeBulkDraft,
} from '../../utils/todayReportAbsence'
import { markChangedDraftKeys, overlayLoadedDrafts } from '../../utils/todayReportDraftMerge'
import { applyAttitudeDrafts, applyStudentAttitudeDraft } from '../../utils/voiceInput/applyVoiceDraft'
import { SectionVoiceInput } from './SectionVoiceInput'

type ClassAttitudeBulkPanelProps = {
  date: string
  className: string
  students: Student[]
  compact?: boolean
}

function draftFromRecord(record: StudentDailyCareRecord | undefined): AttitudeBulkDraft {
  return {
    issues: record?.attitudeIssues ?? [],
    note: record?.attitudeNote ?? '',
  }
}

export function ClassAttitudeBulkPanel({
  date,
  className,
  students,
  compact = false,
}: ClassAttitudeBulkPanelProps) {
  const { attendance, studentDailyCare, saveStudentDailyCareRecordAsync, showToast } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, AttitudeBulkDraft>>({})
  const dirtyAttitudeKeysRef = useRef(new Set<string>())

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
    dirtyAttitudeKeysRef.current.clear()
  }, [date, studentIdsKey])

  useEffect(() => {
    setDrafts((prev) => {
      const loaded: Record<string, AttitudeBulkDraft> = {}
      for (const student of students) {
        loaded[student.id] = draftFromRecord(dayCareByStudent.get(student.id))
      }
      return overlayLoadedDrafts(prev, loaded, dirtyAttitudeKeysRef.current)
    })
  }, [date, dayCareByStudent, studentIdsKey, students])

  const setDraft = (studentId: string, patch: Partial<AttitudeBulkDraft>) => {
    dirtyAttitudeKeysRef.current.add(studentId)
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        issues: prev[studentId]?.issues ?? [],
        note: prev[studentId]?.note ?? '',
        ...patch,
      },
    }))
  }

  const handleSaveAll = async () => {
    if (saving) return
    const targets = selectAttitudeBulkSaveTargets(students, attendance, date, drafts)
    if (targets.length === 0) {
      showToast('결석 학생은 수업태도 입력 대상이 아닙니다.')
      return
    }

    setSaving(true)
    const failures: string[] = []
    const saved: string[] = []
    try {
      for (const { student, attitudeIssues, attitudeNote } of targets) {
        const existing = dayCareByStudent.get(student.id)
        try {
          const result = await saveStudentDailyCareRecordAsync(
            {
              id: existing?.id,
              studentId: student.id,
              date,
              attitudeIssues,
              attitudeNote,
            },
            { silent: true },
          )
          if (result.success) saved.push(student.name)
          else failures.push(student.name)
        } catch (error) {
          console.error('[class-attitude] save threw', {
            studentId: student.id,
            name: student.name,
            date,
            error,
          })
          failures.push(student.name)
        }
      }

      if (failures.length > 0 && saved.length === 0) {
        showToast('수업태도 저장에 실패했습니다.')
        return
      }
      if (failures.length > 0) {
        showToast(
          `수업태도 일부 저장 실패: ${failures.join(', ')} / 성공: ${saved.join(', ')}`,
        )
        return
      }
      for (const { student } of targets) {
        dirtyAttitudeKeysRef.current.delete(student.id)
      }
      showToast('수업태도가 저장되었습니다.')
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
          label="수업태도 음성 입력"
          chipLabel="태도"
          compact={compact}
          disabled={saving}
          onApply={(transcript) => {
            const applied = applyAttitudeDrafts(drafts, transcript, students, attendance, date)
            markChangedDraftKeys(drafts, applied.drafts, dirtyAttitudeKeysRef.current)
            setDrafts(applied.drafts)
            return applied.summary
          }}
          onSaveCommand={() => void handleSaveAll()}
        />
      </div>
      <div
        className={
          compact
            ? 'divide-y divide-[rgba(22,58,112,0.06)]'
            : 'divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white'
        }
      >
        {students.map((student) => {
          const excluded = isStudentAbsentOnDate(attendance, student.id, date)
          const current = drafts[student.id] ?? { issues: [] as ClassAttitudeIssue[], note: '' }
          return (
            <div
              key={student.id}
              className={compact ? 'px-1 py-2' : 'px-3 py-2.5'}
              data-absent-excluded={excluded ? 'true' : 'false'}
            >
              <StudentFollowOnRowHeader
                name={student.name}
                excluded={excluded}
                compact={compact}
                extra={
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                    <StudentKakaoShareAction student={student} compact />
                  </div>
                }
              />
              {excluded ? (
                <AbsentFollowOnHint compact={compact} />
              ) : (
                <div className="min-w-0 space-y-1.5">
                  <ClassAttitudePicker
                    issues={current.issues}
                    note={current.note}
                    hideNote
                    onIssuesChange={(issues) => setDraft(student.id, { issues })}
                    onNoteChange={(note) => setDraft(student.id, { note })}
                    compact={compact}
                    disabled={saving}
                  />
                  <div data-attitude-comment="true" className="min-w-0">
                    <div className="mb-0.5 flex min-w-0 items-center justify-between gap-1">
                      <label className="block text-xs font-semibold text-slate-600">강사의 의견</label>
                      <SectionVoiceInput
                        label={`${student.name} 강사의 의견 음성 입력`}
                        chipLabel="의견"
                        compact={compact}
                        disabled={saving}
                        explicitStop
                        hideStatus
                        onApply={(transcript) => {
                          const applied = applyStudentAttitudeDraft(
                            drafts,
                            transcript,
                            student,
                            students,
                            attendance,
                            date,
                          )
                          markChangedDraftKeys(drafts, applied.drafts, dirtyAttitudeKeysRef.current)
                          setDrafts(applied.drafts)
                          return applied.summary
                        }}
                        onSaveCommand={() => void handleSaveAll()}
                      />
                    </div>
                    <textarea
                      value={current.note}
                      disabled={saving}
                      onChange={(e) => setDraft(student.id, { note: e.target.value.slice(0, 500) })}
                      rows={compact ? 2 : 3}
                      placeholder="오늘 수업에서 확인한 의견을 입력"
                      className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void handleSaveAll()}
        disabled={saving}
        className={compact ? 'tm-btn-primary w-full min-h-11' : `${btnPrimary} w-full min-h-11`}
      >
        {saving ? '저장 중…' : '수업태도 일괄 저장'}
      </button>
    </div>
  )
}
