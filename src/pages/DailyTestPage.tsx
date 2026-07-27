import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DailyTestForm, validateDailyTestForm } from '../components/dailytest/DailyTestForm'
import { DailyTestSessionGrid } from '../components/dailytest/DailyTestSessionGrid'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordActions } from '../components/ui/RecordActions'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { DailyTestRecord } from '../types/records'
import {
  dailyTestFormToSavePayload,
  dailyTestRecordToForm,
  emptyDailyTestForm,
  getFinalPassSession,
  migrateSessionResults,
  type DailyTestFormData,
} from '../utils/dailyTest'
import { sortByDateDesc } from '../utils/filters'
import { formatKoreanDate, getTodayString } from '../utils/date'
import { SUBJECTS, btnPrimary, inputClass } from '../utils/labels'

type SortKey = 'date' | 'score' | 'name' | 'passSession'

export function DailyTestPage() {
  const { students, dailyTests, saveDailyTestRecord, deleteDailyTestRecord } = useData()
  const [dateFilter, setDateFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DailyTestFormData>(emptyDailyTestForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<DailyTestRecord | null>(null)

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  const filtered = useMemo(() => {
    let list = [...dailyTests]
    if (dateFilter) list = list.filter((d) => d.date === dateFilter)
    if (studentFilter) list = list.filter((d) => d.studentId === studentFilter)
    if (subjectFilter) list = list.filter((d) => d.subject === subjectFilter)

    if (sortBy === 'date') {
      list = sortByDateDesc(list)
    } else if (sortBy === 'score') {
      list.sort((a, b) => b.percentage - a.percentage)
    } else if (sortBy === 'name') {
      list.sort((a, b) => getStudentName(a.studentId).localeCompare(getStudentName(b.studentId), 'ko'))
    } else if (sortBy === 'passSession') {
      list.sort((a, b) => {
        const pa = getFinalPassSession(migrateSessionResults(a))
        const pb = getFinalPassSession(migrateSessionResults(b))
        if (pa === null && pb === null) return 0
        if (pa === null) return 1
        if (pb === null) return -1
        return pa - pb
      })
    }
    return list
  }, [dailyTests, dateFilter, sortBy, studentFilter, subjectFilter, students])

  const openAdd = () => {
    setForm({ ...emptyDailyTestForm(), date: getTodayString() })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: DailyTestRecord) => {
    setForm(dailyTestRecordToForm(record))
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateDailyTestForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    saveDailyTestRecord(dailyTestFormToSavePayload(form))
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="일일테스트"
        description="차시별 합격 여부를 기록하고 학부모에게 전달합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            기록 추가
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">날짜</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="lg:col-span-2">
            <StudentSelect
              students={students}
              value={studentFilter}
              onChange={setStudentFilter}
              label="학생"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">과목</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">정렬</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className={inputClass()}
            >
              <option value="date">최신순</option>
              <option value="name">학생 이름순</option>
              <option value="passSession">최종 합격 차시순</option>
              <option value="score">점수순</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="일일테스트 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-base font-bold text-navy-900">{getStudentName(record.studentId)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatKoreanDate(record.date)} · {record.testName} · {record.subject}
                    </p>
                    {record.memo && <p className="mt-1 text-sm text-slate-600">{record.memo}</p>}
                  </div>
                  <DailyTestSessionGrid record={record} />
                </div>
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteTarget(record)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? '일일테스트 수정' : '일일테스트 추가'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <DailyTestForm
          form={form}
          students={students}
          errors={errors}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="일일테스트 삭제"
        message="이 기록을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteDailyTestRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
